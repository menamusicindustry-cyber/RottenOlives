// src/app/api/spotify/import/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { spotifyFetch } from "@/src/lib/spotify";

type SpotifyArtist = {
  id: string;
  name: string;
};

type SpotifyAlbum = {
  id: string;
  name: string;
  album_type: "album" | "single" | "compilation";
  release_date: string; // yyyy-mm-dd or yyyy
  images?: { url: string; width: number; height: number }[];
  label?: string;
};

type SpotifyTrack = {
  id: string | null;
  name: string;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
};

type PlaylistItem = {
  track: SpotifyTrack | null;
};

type SpotifyPlaylistTracksResponse = {
  items: PlaylistItem[];
  next: string | null;
};

const normalizeTitle = (s: string) => s.replace(/\s+/g, " ").trim();

const toReleaseType = (albumType: SpotifyAlbum["album_type"] | undefined) => {
  switch (albumType) {
    case "single":
      return "SINGLE";
    case "album":
      return "ALBUM";
    case "compilation":
      return "COMPILATION";
    default:
      return "UNKNOWN";
  }
};

// Spotify date can be YYYY-MM-DD, YYYY-MM, or YYYY
const parseReleaseDate = (s?: string): Date | null => {
  if (!s) return null;
  // ensure a full date
  if (/^\d{4}$/.test(s)) return new Date(`${s}-01-01T00:00:00Z`);
  if (/^\d{4}-\d{2}$/.test(s)) return new Date(`${s}-01T00:00:00Z`);
  // Assume yyyy-mm-dd
  const d = new Date(`${s}T00:00:00Z`);
  return isNaN(d.getTime()) ? null : d;
};

// Require admin cookie "admin=1"
const ensureAdmin = (req: NextRequest) => {
  const cookieHeader = req.headers.get("cookie") || "";
  return /(?:^|;\s*)admin=1(?:;|$)/.test(cookieHeader);
};

export async function POST(req: NextRequest) {
  try {
    if (!ensureAdmin(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const playlistId: string | undefined = body?.playlistId;
    const isMena: boolean = Boolean(body?.isMena);

    if (!playlistId) {
      return NextResponse.json({ error: "playlistId is required" }, { status: 400 });
    }

    // Fetch all playlist tracks (handle pagination)
    const tracks: SpotifyTrack[] = [];
    let url = `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistId)}/tracks?limit=50`;
    while (url) {
      const page = (await spotifyFetch(url)) as SpotifyPlaylistTracksResponse;
      for (const item of page.items ?? []) {
        if (item?.track && item.track.id) {
          tracks.push(item.track);
        }
      }
      url = page.next;
    }

    // De-dupe by track.id
    const uniq = new Map<string, SpotifyTrack>();
    for (const t of tracks) {
      if (t.id && !uniq.has(t.id)) uniq.set(t.id, t);
    }
    const uniqueTracks = [...uniq.values()];

    // Process in batches to keep memory/calls reasonable
    const results: Array<{ trackId: string; releaseId: string }> = [];

    for (const track of uniqueTracks) {
      const spotifyTrackId = track.id!;
      const title = normalizeTitle(track.name);
      const primaryArtist = track.artists?.[0];
      if (!primaryArtist) continue;

      // Upsert Artist by Spotify artist id
      const artistId = primaryArtist.id;
      await prisma.artist.upsert({
        where: { id: artistId },
        update: { name: primaryArtist.name },
        create: {
          id: artistId,
          name: primaryArtist.name,
        },
      });

      const coverUrl = track.album?.images?.[0]?.url ?? null;
      const label = track.album?.label ?? null;
      const releaseDate = parseReleaseDate(track.album?.release_date);
      const type = toReleaseType(track.album?.album_type);

      // Prefer upsert by spotifyTrackId (unique), fallback to composite if missing
      let release = await prisma.release.upsert({
        where: { spotifyTrackId }, // requires @unique on spotifyTrackId
        update: {
          title,
          artistId,
          coverUrl: coverUrl ?? undefined,
          label: label ?? undefined,
          releaseDate: releaseDate ?? undefined,
          type,
          isMena,
        },
        create: {
          artistId,
          title,
          coverUrl: coverUrl ?? undefined,
          label: label ?? undefined,
          releaseDate: releaseDate ?? undefined,
          type,
          isMena,
          spotifyTrackId,
        },
      }).catch(async (err) => {
        // Fallback: upsert by composite unique (artistId+title)
        // (This path is used if spotifyTrackId is somehow null or uniqueness violated)
        return prisma.release.upsert({
          where: { artistId_title: { artistId, title } },
          update: {
            coverUrl: coverUrl ?? undefined,
            label: label ?? undefined,
            releaseDate: releaseDate ?? undefined,
            type,
            isMena,
            // try to set spotifyTrackId if not already present
            spotifyTrackId,
          },
          create: {
            artistId,
            title,
            coverUrl: coverUrl ?? undefined,
            label: label ?? undefined,
            releaseDate: releaseDate ?? undefined,
            type,
            isMena,
            spotifyTrackId,
          },
        });
      });

      // Ensure ReleaseScore exists
      await prisma.releaseScore.upsert({
        where: { releaseId: release.id },
        update: {}, // nothing to update here
        create: { releaseId: release.id },
      });

      // OPTIONAL: if you have genre names to attach (e.g., from elsewhere)
      // const genreNames: string[] = []; // supply if available
      // if (genreNames.length) {
      //   // Upsert genres and connect
      //   const genres = await Promise.all(
      //     genreNames.map((name) =>
      //       prisma.genre.upsert({
      //         where: { name },
      //         update: {},
      //         create: { name },
      //       })
      //     )
      //   );
      //   await prisma.releaseGenre.createMany({
      //     data: genres.map((g) => ({ releaseId: release.id, genreId: g.id })),
      //     skipDuplicates: true,
      //   });
      // }

      results.push({ trackId: spotifyTrackId, releaseId: release.id });
    }

    return NextResponse.json(
      {
        imported: results.length,
        releases: results,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("Import error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
