import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { spotifyFetch } from "@/lib/spotify";
import { ReleaseType } from "@prisma/client";

export const runtime = "nodejs";

function requireAdmin() {
  if (cookies().get("admin")?.value !== "1") {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), { status: 401 });
  }
  return null;
}

function toReleaseType(albumType?: string | null): ReleaseType {
  const t = (albumType || "").toLowerCase();
  // Support both UPPERCASE and lowercase enums by probing members
  if ((ReleaseType as any).SINGLE && (ReleaseType as any).ALBUM) {
    if (t === "single") return (ReleaseType as any).SINGLE;
    if (t === "album") return (ReleaseType as any).ALBUM;
    if (t === "compilation" && (ReleaseType as any).COMPILATION) return (ReleaseType as any).COMPILATION;
    return (ReleaseType as any).SINGLE;
  }
  // @ts-ignore (if your enum is lowercase)
  if (ReleaseType.single && ReleaseType.album) {
    // @ts-ignore
    if (t === "single") return ReleaseType.single;
    // @ts-ignore
    if (t === "album") return ReleaseType.album;
    // @ts-ignore
    if (t === "compilation" && ReleaseType.compilation) return ReleaseType.compilation;
    // @ts-ignore
    return ReleaseType.single;
  }
  return (Object.values(ReleaseType) as any)[0];
}

function normalize(item: any) {
  const t = item.track ?? item;
  if (!t || t.is_local) return null;
  const album = t.album;
  const artists = t.artists ?? [];
  const primaryArtist = artists[0];

  return {
    spotifyTrackId: t.id as string,
    title: t.name as string,
    artistSpotifyId: primaryArtist?.id as string | undefined,
    artistName: (primaryArtist?.name as string) || "Unknown Artist",
    albumType: (album?.album_type as string | undefined) || "single",
    releaseDate: (album?.release_date as string | undefined) || null,
    coverUrl: (album?.images?.[0]?.url as string | undefined) || null,
  };
}

export async function POST(req: Request) {
  const guard = requireAdmin();
  if (guard) return guard;

  try {
    const body = await req.json().catch(() => ({}));
    const { playlistId, dryRun = false } = body || {};
    if (!playlistId) return Response.json({ ok: false, error: "Missing playlistId" }, { status: 400 });

    const pl = await spotifyFetch(`/v1/playlists/${playlistId}?market=US`);
    const itemsAll = (pl?.tracks?.items ?? []).map(normalize).filter(Boolean) as ReturnType<typeof normalize>[];

    // de-dup within a single import batch by spotifyTrackId
    const seen = new Set<string>();
    const items = itemsAll.filter((it) => {
      if (!it.spotifyTrackId) return false;
      if (seen.has(it.spotifyTrackId)) return false;
      seen.add(it.spotifyTrackId);
      return true;
    });

    if (dryRun) return Response.json({ ok: true, previewCount: items.length, items });

    const results: any[] = [];
    for (const it of items) {
      // Upsert Artist (id is text in your schema → use Spotify artistId if present)
      const artist = await prisma.artist.upsert({
        where: { id: it!.artistSpotifyId || it!.artistName },
        update: { name: it!.artistName },
        create: {
          id: it!.artistSpotifyId || crypto.randomUUID(),
          name: it!.artistName,
          country: null,
        },
      });

      const data = {
        artistId: artist.id,
        title: it!.title,
        type: toReleaseType(it!.albumType),
        releaseDate: it!.releaseDate ? new Date(it!.releaseDate) : null,
        coverUrl: it!.coverUrl,
        isMena: false,
        spotifyTrackId: it!.spotifyTrackId,
        label: null,
      };

      // Upsert by unique spotifyTrackId
      const release = await prisma.release.upsert({
        where: { spotifyTrackId: it!.spotifyTrackId },
        update: data,
        create: { id: crypto.randomUUID(), ...data },
      });

      await prisma.releaseScore.upsert({
        where: { releaseId: release.id },
        update: { lastCalculated: new Date() },
        create: { releaseId: release.id, audienceScore: null, audienceCount: 0, lastCalculated: new Date() },
      });

      results.push({ releaseId: release.id, title: release.title, artist: artist.name });
    }

    return Response.json({ ok: true, imported: results.length, items: results });
  } catch (err: any) {
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
