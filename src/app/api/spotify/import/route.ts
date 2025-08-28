import { prisma } from "@/lib/prisma";
import { getSpotifyToken } from "@/lib/spotify";

export const runtime = "nodejs";

type SpotifyArtist = { id: string; name: string };
type SpotifyImage = { url: string; width: number; height: number };
type SpotifyAlbum = { release_date?: string; album_type?: string; images?: SpotifyImage[] };
type SpotifyTrack = {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
};

async function fetchPlaylistTracks(playlistId: string): Promise<SpotifyTrack[]> {
  const token = await getSpotifyToken();
  const out: SpotifyTrack[] = [];
  let url = `https://api.spotify.com/v1/playlists/${encodeURIComponent(
    playlistId
  )}/tracks?limit=100&fields=items(track(id,name,album(release_date,album_type,images),artists(id,name))),next`;

  while (url) {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Spotify fetch error: ${res.status} ${await res.text()}`);
    const json = await res.json();
    const items = (json.items || []) as any[];
    for (const it of items) if (it?.track?.id) out.push(it.track as SpotifyTrack);
    url = json.next || "";
  }
  return out;
}

export async function POST(req: Request) {
  try {
    const { playlistId, isMena } = await req.json();
    if (!playlistId) return Response.json({ ok: false, error: "playlistId required" }, { status: 400 });

    const tracks = await fetchPlaylistTracks(playlistId);

    let inserted = 0;
    let updated = 0;
    const problems: string[] = [];

    for (const t of tracks) {
      try {
        const title = t.name?.trim();
        const spotifyTrackId = t.id;
        if (!title || !spotifyTrackId) continue;

        const artistName = t.artists?.[0]?.name?.trim();
        if (!artistName) continue;

        // 1) Upsert artist by name (unique)
        const artist = await prisma.artist.upsert({
          where: { name: artistName },
          update: {},
          create: { id: crypto.randomUUID(), name: artistName },
        });

        // 2) Upsert release by spotifyTrackId (UNIQUE)  <-- THIS prevents duplicates
        const coverUrl = t.album?.images?.[0]?.url || null;
        const rd = t.album?.release_date ? new Date(t.album.release_date) : null;
        const albumType = (t.album?.album_type || "single").toUpperCase(); // ALBUM | SINGLE | COMPILATION
        const type = ["ALBUM", "EP", "SINGLE"].includes(albumType) ? (albumType as any) : "SINGLE";

        const r = await prisma.release.upsert({
          where: { spotifyTrackId }, // requires UNIQUE index/field
          update: {
            // update metadata if changed
            coverUrl: coverUrl ?? undefined,
            releaseDate: rd as any,
            type,
            isMena: Boolean(isMena),
            artistId: artist.id,
            title, // keep title fresh
          },
          create: {
            id: crypto.randomUUID(),
            artistId: artist.id,
            title,
            type,
            releaseDate: rd as any,
            label: null,
            coverUrl,
            isMena: Boolean(isMena),
            spotifyTrackId, // <-- set the unique key
          },
        });

        if (r.createdAt === r.updatedAt) inserted++; else updated++;
      } catch (e: any) {
        problems.push(`${t.name} – ${e?.message || e}`);
      }
    }

    return Response.json({ ok: true, playlistId, inserted, updated, problems });
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}

// Convenience GET for browser testing:
// /api/spotify/import?playlistId=...&isMena=true
export async function GET(req: Request) {
  const url = new URL(req.url);
  const playlistId = url.searchParams.get("playlistId");
  const isMena = url.searchParams.get("isMena") === "true";
  if (!playlistId) return Response.json({ ok: false, error: "playlistId required" }, { status: 400 });
  return POST(new Request(req.url, { method: "POST", body: JSON.stringify({ playlistId, isMena }) }));
}
