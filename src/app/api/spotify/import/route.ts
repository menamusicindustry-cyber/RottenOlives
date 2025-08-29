import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { spotifyFetch } from "@/lib/spotify";
export const runtime = "nodejs";

function requireAdmin() {
  if (cookies().get("admin")?.value !== "1") {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), { status: 401 });
  }
  return null;
}

const RELEASE_TYPE_MAP = { single: "single", album: "album", compilation: "album" } as const;
function toReleaseType(albumType?: string | null) {
  const key = (albumType || "").toLowerCase() as keyof typeof RELEASE_TYPE_MAP;
  return RELEASE_TYPE_MAP[key] || "single";
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
    const items = (pl?.tracks?.items ?? []).map(normalize).filter(Boolean) as ReturnType<typeof normalize>[];

    if (dryRun) return Response.json({ ok: true, previewCount: items.length, items });

    const results: any[] = [];
    for (const it of items) {
      // Artist
      const artist = await prisma.artist.upsert({
        where: { id: it!.artistSpotifyId || it!.artistName },
        update: { name: it!.artistName },
        create: {
          id: it!.artistSpotifyId || crypto.randomUUID(),
          name: it!.artistName,
          country: null,
        },
      });

      // Release
      const existing = await prisma.release.findFirst({
        where: { spotifyTrackId: it!.spotifyTrackId },
        select: { id: true },
      });

      const data = {
        artistId: artist.id,
        title: it!.title,
        type: toReleaseType(it!.albumType) as any,
        releaseDate: it!.releaseDate ? new Date(it!.releaseDate) : null,
        coverUrl: it!.coverUrl,
        isMena: false,
        spotifyTrackId: it!.spotifyTrackId,
        label: null,
      };

      const release = existing
        ? await prisma.release.update({ where: { id: existing.id }, data })
        : await prisma.release.create({ data: { id: crypto.randomUUID(), ...data } });

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
