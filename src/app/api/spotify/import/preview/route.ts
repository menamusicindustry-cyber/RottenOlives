// src/app/api/spotify/import/preview/route.ts
import { NextRequest, NextResponse } from "next/server";
import { spotifyFetch } from "@/lib/spotify";

export const runtime = "nodejs";

/** Require admin cookie "admin=1" (same gate as your import route) */
function ensureAdmin(req: NextRequest) {
  const cookieHeader = req.headers.get("cookie") || "";
  return /(?:^|;\s*)admin=1(?:;|$)/.test(cookieHeader);
}

/** Spotify API response types (subset) */
type SpotifyArtist = {
  id: string;
  name: string;
};

type SpotifyAlbum = {
  id: string;
  name: string;
  album_type?: "album" | "single" | "compilation";
  release_date?: string; // yyyy, yyyy-mm, or yyyy-mm-dd
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

/** Preview item we return to the client */
type PreviewItem = {
  spotifyTrackId: string;
  title: string;
  artistId: string;
  artistName: string;
  coverUrl: string | null;
  label: string | null;
  releaseDate: string | null; // ISO string
  type: "SINGLE" | "ALBUM" | "COMPILATION" | "UNKNOWN";
};

/** Helpers */
const normalizeTitle = (s: string) => s.replace(/\s+/g, " ").trim();

const toReleaseType = (
  albumType: SpotifyAlbum["album_type"] | undefined
): PreviewItem["type"] => {
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

// Spotify date can be YYYY, YYYY-MM, or YYYY-MM-DD. Return ISO or null.
const parseReleaseDateToIso = (s?: string): string | null => {
  if (!s) return null;
  if (/^\d{4}$/.test(s)) return new Date(`${s}-01-01T00:00:00Z`).toISOString();
  if (/^\d{4}-\d{2}$/.test(s))
    return new Date(`${s}-01T00:00:00Z`).toISOString();
  const d = new Date(`${s}T00:00:00Z`);
  return isNaN(d.getTime()) ? null : d.toISOString();
};

/** GET /api/spotify/import/preview?playlistId=...&market=US */
export async function GET(req: NextRequest) {
  try {
    if (!ensureAdmin(req)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const playlistId = searchParams.get("playlistId");
    const market = searchParams.get("market") || undefined; // optional

    if (!playlistId) {
      return NextResponse.json(
        { error: "playlistId is required" },
        { status: 400 }
      );
    }

    // ---- Fetch all playlist tracks (handles pagination) ----
    const collected: SpotifyTrack[] = [];
    let url: string | null = `https://api.spotify.com/v1/playlists/${encodeURIComponent(
  playlistId
)}/tracks?limit=50${market ? `&market=${encodeURIComponent(market)}` : ""}`;


    while (url) {
      const page = (await spotifyFetch(url)) as SpotifyPlaylistTracksResponse;
      for (const item of page.items ?? []) {
        if (item?.track) collected.push(item.track);
      }
      url = page.next;
    }

    // ---- Normalize (some entries can be null or have null id) ----
    const normalizedAll: (PreviewItem | null)[] = collected.map((t) => {
      if (!t?.id) return null;
      const title = normalizeTitle(t.name);
      const primaryArtist = t.artists?.[0];
      if (!primaryArtist?.id) return null;

      const album = t.album;
      const coverUrl = album?.images?.[0]?.url ?? null;
      const label = album?.label ?? null;
      const releaseDateIso = parseReleaseDateToIso(album?.release_date);
      const type = toReleaseType(album?.album_type);

      return {
        spotifyTrackId: t.id,
        title,
        artistId: primaryArtist.id,
        artistName: primaryArtist.name,
        coverUrl,
        label,
        releaseDate: releaseDateIso,
        type,
      };
    });

    // ---- Type-guard to drop nulls, then de-dupe by spotifyTrackId ----
    const isNotNull = (
      it: PreviewItem | null
    ): it is PreviewItem => it !== null;

    const seen = new Set<string>();
    const items = normalizedAll
      .filter(isNotNull)
      .filter((it) => {
        if (!it.spotifyTrackId) return false;
        if (seen.has(it.spotifyTrackId)) return false;
        seen.add(it.spotifyTrackId);
        return true;
      });

    return NextResponse.json({
      playlistId,
      market: market ?? null,
      count: items.length,
      items,
    });
  } catch (err: any) {
    console.error("Preview error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Unknown error" },
      { status: 500 }
    );
  }
}
