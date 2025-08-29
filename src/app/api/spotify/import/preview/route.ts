// src/app/api/spotify/import/preview/route.ts
import { spotifyFetch } from "@/lib/spotify";
export const runtime = "nodejs";

function normalize(item: any) {
  const t = item.track ?? item;
  if (!t || t.is_local) return null;
  const album = t.album;
  const primary = (t.artists ?? [])[0];
  return {
    spotifyTrackId: t.id,
    title: t.name,
    artistSpotifyId: primary?.id || null,
    artistName: primary?.name || "Unknown Artist",
    albumType: album?.album_type || null,
    releaseDate: album?.release_date || null,
    coverUrl: album?.images?.[0]?.url || null,
    previewUrl: t.preview_url || null,
  };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const playlistId = searchParams.get("playlistId");
    const market = searchParams.get("market") || "US";
    if (!playlistId) return Response.json({ ok: false, error: "Missing playlistId" }, { status: 400 });

    const first = await spotifyFetch(`/v1/playlists/${playlistId}?market=${market}`);
    let items = [...(first?.tracks?.items ?? [])];
    let next = first?.tracks?.next as string | null;

    while (next) {
      // next is a full URL; append market if missing
      const url = next.includes("market=") ? next : `${next}${next.includes("?") ? "&" : "?"}market=${market}`;
      const page = await spotifyFetch(url);
      items.push(...(page?.items ?? []));
      next = page?.next ?? null;
    }

    const normalized = items.map(normalize).filter(Boolean);
    return Response.json({
      ok: true,
      playlist: { id: first?.id, name: first?.name, total: first?.tracks?.total ?? normalized.length },
      items: normalized,
    });
  } catch (err: any) {
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
