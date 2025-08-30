import { prisma } from "@/lib/prisma";
import { spotifyFetch } from "@/lib/spotify";
import { ReleaseType } from "@prisma/client"; // <-- import the enum
export const runtime = "nodejs";

/** Map Spotify album_type -> your Prisma enum members. 
 *  Adjust these to match exactly what's in prisma/schema.prisma.
 *  Common cases:
 *    enum ReleaseType { SINGLE ALBUM COMPILATION }   // UPPERCASE
 *    or enum ReleaseType { single album compilation } // lowercase
 */
function toReleaseType(albumType?: string | null): ReleaseType {
  const t = (albumType || "").toLowerCase();

  // If your enum is UPPERCASE (most common):
  if ((ReleaseType as any).SINGLE && (ReleaseType as any).ALBUM) {
    if (t === "single") return (ReleaseType as any).SINGLE;
    if (t === "album") return (ReleaseType as any).ALBUM;
    if (t === "compilation" && (ReleaseType as any).COMPILATION)
      return (ReleaseType as any).COMPILATION;
    // fallback
    return (ReleaseType as any).SINGLE;
  }

  // If your enum is lowercase members:
  // @ts-ignore – allow dynamic enum member access
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

  // Last resort: assume "single"
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
  try {
    const body = await req.json().catch(() => ({}));
    const { playlistId, dryRun = false } = body || {};
    if (!playlistId) return Response.json({ ok: false, error: "Missing playlistId" }, { status: 400 });

    const pl = await spotifyFetch(`/v1/playlists/${playlistId}?market=US`);
    const items = (pl?.tracks?.items ?? []).map(normalize).filter(Boolean) as ReturnType<typeof normalize>[];

    if (dryRun) return Response.json({ ok: true, previewCount: items.length, items });

    const results: any[] = [];
    for (const it of items) {
      // 1) Upsert Artist
      const artist = await prisma.artist.upsert({
        where: { id: it!.artistSpotifyId || it!.artistName },
        update: { name: it!.artistName },
        create: {
          id: it!.artistSpotifyId || crypto.randomUUID(),
          name: it!.artistName,
          country: null,
        },
      });

      // 2) Create/Update Release with proper enum
      const existing = await prisma.release.findFirst({
        where: { spotifyTrackId: it!.spotifyTrackId },
        select: { id: true },
      });

      const data = {
        artistId: artist.id,
        title: it!.title,
        type: toReleaseType(it!.albumType), // <-- enum, not string
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
