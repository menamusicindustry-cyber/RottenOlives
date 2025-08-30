import { cookies } from "next/headers";
import { spotifyFetch } from "@/lib/spotify";
export const runtime = "nodejs";

function requireAdmin() {
  if (cookies().get("admin")?.value !== "1") {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), { status: 401 });
  }
  return null;
}

function normalize(item: any) {
  const t = item.track ?? item;
  if (!t || t.is_local) return null;
  const album = t.album;
  const artists = t.artists ?? [];
  const primaryArtist = artists[0];

  return {
    spotifyTrackId: t.id,
    title: t.name,
    artistSpotifyId: primaryArtist?.id || null,
    artistName: primaryArtist?.name || "Unknown Artist",
    albumType: album?.album_type || null,
    releaseDate: album?.release_date || null,
    coverUrl: album?.images?.[0]?.url || null,
    previewUrl: t.preview_url || null,
  };
}

export async function GET(req: Request) {
  const guard = requireAdmin();
  if (guard) return guard;

  try {
    const { searchParams } = new URL(req.url);
    const playlistId = searchParams.get("playlistId");
    const market = searchParams.get("market") || "US";
    if (!playlistId) return Response.json({ ok: false, error: "Missing playlistId" }, { status: 400 });

    const first = await spotifyFetch(`/v1/playlists/${playlistId}?market=${market}`);
    let items = [...(first?.tracks?.items ?? [])];
    let next = first?.tracks?.next as string | null;

    while (next) {
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
