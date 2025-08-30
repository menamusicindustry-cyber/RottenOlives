// app/api/spotify/import/route.ts
import { prisma } from "@/lib/prisma";
import { spotifyFetch } from "@/lib/spotify";
import { ReleaseType } from "@prisma/client";
export const runtime = "nodejs";

/** Map Spotify album_type -> your Prisma enum */
function toReleaseType(albumType?: string | null): ReleaseType {
  const t = (albumType || "").toLowerCase();
  if (t === "album") return ReleaseType.ALBUM;
  if (t === "ep") return ReleaseType.EP;
  return ReleaseType.SINGLE; // default
}

function normalize(item: any) {
  const t = item.track ?? item;
  if (!t || t.is_local) return null;

  const album = t.album;
  const artists = t.artists ?? [];
  const primaryArtist = artists[0];

  return {
    spotifyTrackId: t.id as string,
    title: (t.name as string)?.trim(),
    artistSpotifyId: (primaryArtist?.id as string) || null,
    artistName: ((primaryArtist?.name as string) || "Unknown Artist").trim(),
    albumType: (album?.album_type as string | undefined) || "single",
    releaseDate: (album?.release_date as string | undefined) || null,
    coverUrl: (album?.images?.[0]?.url as string | undefined) || null,
    label: (album?.label as string | undefined) || null,
  };
}

/** Find or create an Artist without needing a unique name in the schema */
async function getOrCreateArtist(artistSpotifyId: string | null, artistName: string) {
  // 1) Prefer Spotify artist id if present (use it as our Artist.id going forward)
  if (artistSpotifyId) {
    const byId = await prisma.artist.findUnique({ where: { id: artistSpotifyId } });
    if (byId) {
      // keep name fresh
      if (artistName && byId.name !== artistName) {
        return prisma.artist.update({ where: { id: byId.id }, data: { name: artistName } });
      }
      return byId;
    }
    // 2) If not found by id, try by name to avoid duping an existing cuid record
    const byName = await prisma.artist.findFirst({ where: { name: artistName } });
    if (byName) return byName;

    // 3) Create using Spotify id as our primary key (simple & stable)
    return prisma.artist.create({
      data: { id: artistSpotifyId, name: artistName, country: null },
    });
  }

  // No Spotify artist id? Best effort: reuse by name, else create new cuid
  const byName = await prisma.artist.findFirst({ where: { name: artistName } });
  if (byName) return byName;

  return prisma.artist.create({ data: { name: artistName, country: null } });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { playlistId, dryRun = false, isMena = false } = body || {};
    if (!playlistId) {
      return Response.json({ ok: false, error: "Missing playlistId" }, { status: 400 });
    }

    // Fetch playlist (includes tracks)
    const pl = await spotifyFetch(`/v1/playlists/${playlistId}?market=US`);
    const items = (pl?.tracks?.items ?? [])
      .map(normalize)
      .filter(Boolean) as ReturnType<typeof normalize>[];

    if (dryRun) {
      return Response.json({ ok: true, previewCount: items.length, items });
    }

    const results: Array<{ releaseId: string; title: string; artist: string }> = [];

    for (const it of items) {
      // Ensure we have a Spotify track id; we key ONLY by this
      if (!it.spotifyTrackId) continue;

      // 1) Artist
      const artist = await getOrCreateArtist(it.artistSpotifyId, it.artistName);

      // 2) Prepare release data
      const data = {
        artistId: artist.id,
        title: it.title,
        type: toReleaseType(it.albumType), // enum
        releaseDate: it.releaseDate ? new Date(it.releaseDate) : null,
        label: it.label ?? null,
        coverUrl: it.coverUrl ?? null,
        isMena: Boolean(isMena),
        spotifyTrackId: it.spotifyTrackId, // UNIQUE key we upsert on
      };

      // 3) Upsert strictly by spotifyTrackId (the only uniqueness we care about)
      const release = await prisma.release.upsert({
        where: { spotifyTrackId: it.spotifyTrackId },
        update: {
          // refresh metadata on re-import
          title: data.title,
          artistId: data.artistId,
          type: data.type,
          releaseDate: data.releaseDate ?? undefined,
          label: data.label ?? undefined,
          coverUrl: data.coverUrl ?? undefined,
          isMena: data.isMena,
        },
        create: {
          // id will be cuid() by default (per schema)
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
