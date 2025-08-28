import { prisma } from "@/lib/prisma";
import { getSpotifyToken } from "@/lib/spotify";

export const runtime = "nodejs";

type SpotifyArtist = { id: string; name: string };
type SpotifyImage = { url: string; width: number; height: number };
type SpotifyAlbum = { release_date?: string; album_type?: string; images?: SpotifyImage[] };
type SpotifyTrack = { id: string; name: string; artists: SpotifyArtist[]; album: SpotifyAlbum };

async function fetchPlaylistTracks(playlistId: string): Promise<SpotifyTrack[]> {
  const token = await getSpotifyToken();
  const out: SpotifyTrack[] = [];
  let url = `https://api.spotify.com/v1/playlists/${encodeURIComponent(
    playlistId
  )}/tracks?limit=100&fields=items(track(id,name,album(release_date,album_type,images),artists(id,name))),next`;

  while (url) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" });
    if (!res.ok) throw new Error(`Spotify fetch error: ${res.status} ${await res.text()}`);
    const j = await res.json();
    for (const it of j.items || []) if (it?.track?.id) out.push(it.track);
    url = j.next || "";
  }
  return out;
}

export async function POST(req: Request) {
  try {
    const { playlistId, isMena } = await req.json();
    if (!playlistId) return Response.json({ ok: false, error: "playlistId required" }, { status: 400 });

    const tracks = await fetchPlaylistTracks(playlistId);
    let inserted = 0, updated = 0;
    const problems: string[] = [];

    for (const t of tracks) {
      try {
        const title = t.name?.trim();
        const spotifyTrackId = t.id;
        const artistName = t.artists?.[0]?.name?.trim();
        if (!title || !spotifyTrackId || !artistName) continue;

        // 1) upsert artist by name
        const artist = await prisma.artist.upsert({
          where: { name: artistName },
          update: {},
          create: { id: crypto.randomUUID(), name: artistName },
        });

        // 2) upsert release by spotifyTrackId (UNIQUE → no duplicates)
        const coverUrl = t.album?.images?.[0]?.url || null;
        const rd = t.album?.release_date ? new Date(t.album.release_date) : null;
        const albumType = (t.album?.album_type || "single").toUpperCase();
        const type = (["ALBUM", "EP", "SINGLE"].includes(albumType) ? albumType : "SINGLE") as any;

        const r = await prisma.release.upsert({
          where: { spotifyTrackId },
          update: {
            artistId: artist.id,
            title,
            type,
            releaseDate: rd as any,
            coverUrl: coverUrl ?? undefined,
            isMena: Boolean(isMena),
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
            spotifyTrackId,
          },
        });

        // simple inserted/updated heuristic
        // @ts-ignore
        if ((r as any).createdAt && (r as any).createdAt === (r as any).updatedAt) inserted++; else updated++;
      } catch (e: any) {
        problems.push(`${t.name} – ${e?.message || e}`);
      }
    }

    return Response.json({ ok: true, playlistId, inserted, updated, problems });
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}

// Convenience GET so you can test in the browser:
// /api/spotify/import?playlistId=...&isMena=true
export async function GET(req: Request) {
  const url = new URL(req.url);
  const playlistId = url.searchParams.get("playlistId");
  const isMena = url.searchParams.get("isMena") === "true";
  if (!playlistId) return Response.json({ ok: false, error: "playlistId required" }, { status: 400 });
  return POST(new Request(req.url, { method: "POST", body: JSON.stringify({ playlistId, isMena }) }));
}
