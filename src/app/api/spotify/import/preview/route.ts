import { spotifyFetch } from "@/lib/spotify";

export const runtime = "nodejs";

function normalize(item: any) {
  const t = item.track ?? item; // playlist API nests under .track
  if (!t || t.is_local) return null;

  const album = t.album;
  const artists = t.artists ?? [];
  const primaryArtist = artists[0];

  return {
    spotifyTrackId: t.id,
    title: t.name,
    artistSpotifyId: primaryArtist?.id || null,
    artistName: primaryArtist?.name || "Unknown Artist",
    albumId: album?.id || null,
    albumType: album?.album_type || null, // "single" | "album" | "compilation"
    releaseDate: album?.release_date || null,
    coverUrl: album?.images?.[0]?.url || null,
    previewUrl: t.preview_url || null,
  };
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const playlistId = searchParams.get("playlistId");
  if (!playlistId) return Response.json({ error: "Missing playlistId" }, { status: 400 });

  // Pull playlist items (first 100)
  const pl = await spotifyFetch(`/v1/playlists/${playlistId}`);
  const items = (pl?.tracks?.items ?? []).map(normalize).filter(Boolean);

  return Response.json({
    ok: true,
    playlist: { id: pl?.id, name: pl?.name, total: pl?.tracks?.total ?? items.length },
    items,
  });
}
