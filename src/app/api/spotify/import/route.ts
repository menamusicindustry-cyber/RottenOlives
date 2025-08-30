// src/app/api/spotify/import/route.ts
import { prisma } from "@/lib/prisma";
import { spotifyFetch } from "@/lib/spotify";
import { ReleaseType } from "@prisma/client";

export const runtime = "nodejs";

/** Map Spotify album_type -> your Prisma enum */
function toReleaseType(albumType?: string | null): ReleaseType {
  const t = (albumType || "").toLowerCase();
  if (t === "album") return ReleaseType.ALBUM;
  if (t === "ep") return ReleaseType.EP;
  // treat "single" and unknowns as SINGLE
  return ReleaseType.SINGLE;
}

// Strongly-typed normalized track item
type Normalized = {
  spotifyTrackId: string;
  title: string;
  artistSpotifyId: string | null;
  artistName: string;
  albumType: string | null;
  releaseDate: string | null;
  coverUrl: string | null;
  label: string | null;
};

function normalize(item: any): Normalized | null {
  const t = item?.track ?? item;
  if (!t || t.is_local) return null;

  const album = t.album;
  const primaryArtist = (t.artists ?? [])[0];

  return {
    spotifyTrackId: String(t.id),
    title: String(t.name ?? "").trim(),
    artistSpotifyId: (primaryArtist?.id as string) ?? null,
    artistName: String(primaryArtist?.name ?? "Unknown Artist").trim(),
    albumType: (album?.album_type as string | undefined) ?? "single",
    releaseDate: (album?.release_date as string | undefined) ?? null,
    coverUrl: (album?.images?.[0]?.url as string | undefined) ?? null,
    label: (album?.label as string | undefined) ?? null,
  };
}

/** Prefer Spotify artist id for stability; otherwise reuse by name */
async function getOrCreateArtist(artistSpotifyId: string | null, artistName: string) {
  if (artistSpotifyId) {
    const byId = await prisma.artist.findUnique({ where: { id: artistSpotifyId } });
    if (byId) {
      if (artistName && byId.name !== artistName) {
        return prisma.artist.update({ where: { id: byId.id }, data: { name: artistName } });
      }
      return byId;
    }
    const byName = await prisma.artist.findFirst({ where: { name: artistName } });
    if (byName) return byName;
    return prisma.artist.create({ data: { id: artistSpotifyId, name: artistName, country: null } });
  }

  const byName = await prisma.artist.findFirst({ where: { name: artistName } });
  if (byName) return byName;
  return prisma.artist.create({ data: { name: artistName, country: null } });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { playlistId, isMena = false, dryRun = false } = body || {};
    if (!playlistId) {
      return Response.json({ ok: false, error: "Missing playlistId" }, { status: 400 });
    }

    // Fetch playlist (with tracks)
    const pl = await spotifyFetch(`/v1/playlists/${playlistId}?market=US`);
    const items = (pl?.tracks?.items ?? [])
      .map(normalize)
      // >>> the line that fixes the build error <<<
      .filter((x: Normalized | null): x is Normalized => x !== null);

    if (dryRun) {
      return Response.json({ ok: true, previewCount: items.length, items });
    }

    const results: Array<{ releaseId: string; title: string; artist: string }> = [];

    for (const it of items) {
      // Key ONLY by spotifyTrackId
      if (!it.spotifyTrackId) continue;

      // 1) Ensure Artist exists
      const artist = await getOrCreateArtist(it.artistSpotifyId, it.artistName);

      // 2) Prepare release data
      const data = {
        artistId: artist.id,
        title: it.title,
        type: toReleaseType(it.albumType),
        releaseDate: it.releaseDate ? new Date(it.releaseDate) : null,
        label: it.label ?? null,
        coverUrl: it.coverUrl ?? null,
        isMena: Boolean(isMena),
        spotifyTrackId: it.spotifyTrackId,
      };

      // 3) Upsert strictly by spotifyTrackId
      const release = await prisma.release.upsert({
        where: { spotifyTrackId: it.spotifyTrackId },
        update: {
          title: data.title,
          artistId: data.artistId,
          type: data.type,
          releaseDate: data.releaseDate ?? undefined,
          label: data.label ?? undefined,
          coverUrl: data.coverUrl ?? undefined,
          isMena: data.isMena,
        },
        create: {
          artistId: data.artistId,
          title: data.title,
          type: data.type,
          releaseDate: data.releaseDate,
          label: data.label,
          coverUrl: data.coverUrl,
          isMena: data.isMena,
          spotifyTrackId: data.spotifyTrackId,
        },
        select: { id: true, title: true },
      });

      // 4) Ensure a ReleaseScore row exists
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
