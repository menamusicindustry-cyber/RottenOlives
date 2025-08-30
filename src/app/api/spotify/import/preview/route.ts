import { cookies } from "next/headers";
import { spotifyFetch } from "@/lib/spotify";

export const runtime = "nodejs";

function requireAdmin() {
@@ -12,6 +13,7 @@ function requireAdmin() {
function normalize(item: any) {
  const t = item.track ?? item;
  if (!t || t.is_local) return null;

  const album = t.album;
  const artists = t.artists ?? [];
  const primaryArtist = artists[0];
@@ -21,7 +23,7 @@ function normalize(item: any) {
    title: t.name,
    artistSpotifyId: primaryArtist?.id || null,
    artistName: primaryArtist?.name || "Unknown Artist",
    albumType: album?.album_type || null,
    releaseDate: album?.release_date || null,
    coverUrl: album?.images?.[0]?.url || null,
    previewUrl: t.preview_url || null,
@@ -42,14 +44,25 @@ export async function GET(req: Request) {
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
