// lib/importPlaylist.ts
type SpotifyImage = { url: string; height: number; width: number };

export async function fetchAllPlaylistTracks(token: string, playlistId: string) {
  let url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`;
  const items: any[] = [];
  while (url) {
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (r.status === 429) {
      const retry = Number(r.headers.get("Retry-After") ?? "1") * 1000;
      await new Promise((res) => setTimeout(res, retry));
      continue;
    }
    if (!r.ok) throw new Error(`Tracks error ${r.status}: ${await r.text()}`);
    const data = await r.json();
    items.push(...(data.items ?? []));
    url = data.next;
  }
  return items;
}

export function uniqueAlbumIdsFromTracks(trackItems: any[]) {
  const ids = new Set<string>();
  for (const it of trackItems) {
    const t = it.track;
    if (!t || t.type !== "track") continue;      // skip episodes/local/missing
    const alb = t.album;
    if (alb?.id) ids.add(alb.id);
  }
  return Array.from(ids);
}

export async function fetchAlbumsByIds(token: string, ids: string[]) {
  const batches: string[][] = [];
  for (let i = 0; i < ids.length; i += 20) batches.push(ids.slice(i, i + 20));

  const albums: any[] = [];
  for (const batch of batches) {
    const r = await fetch(
      `https://api.spotify.com/v1/albums?ids=${batch.join(",")}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
    );
    if (r.status === 429) {
      const retry = Number(r.headers.get("Retry-After") ?? "1") * 1000;
      await new Promise((res) => setTimeout(res, retry));
      // retry once
      const r2 = await fetch(
        `https://api.spotify.com/v1/albums?ids=${batch.join(",")}`,
        { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" }
      );
      if (!r2.ok) throw new Error(`Albums error ${r2.status}: ${await r2.text()}`);
      const d2 = await r2.json();
      albums.push(...(d2.albums ?? []));
      continue;
    }
    if (!r.ok) throw new Error(`Albums error ${r.status}: ${await r.text()}`);
    const d = await r.json();
    albums.push(...(d.albums ?? []));
  }
  return albums;
}

// ——— Supabase upserts ———
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // use service role on server only
);

export async function upsertReleases(albums: any[]) {
  if (!albums.length) return 0;

  const rows = albums.map((a) => ({
    id: a.id,
    name: a.name,
    album_type: a.album_type,
    release_date: a.release_date,
    release_date_precision: a.release_date_precision,
    label: a.label ?? null,
    total_tracks: a.total_tracks ?? null,
    popularity: a.popularity ?? null,
    images: a.images as SpotifyImage[] | null,
    external_urls: a.external_urls ?? null,
    markets: a.available_markets ?? null,
    raw: a, // keep full source for debugging
  }));

  const { error } = await supabase
    .from("releases")
    .upsert(rows, { onConflict: "id" });
  if (error) throw error;

  // OPTIONAL: upsert artists + release_artists
  // Extract unique artists
  const artistMap = new Map<string, any>();
  for (const a of albums) {
    for (const ar of a.artists ?? []) {
      if (!artistMap.has(ar.id)) artistMap.set(ar.id, ar);
    }
  }
  if (artistMap.size) {
    const artistRows = Array.from(artistMap.values()).map((ar) => ({
      id: ar.id,
      name: ar.name,
      genres: null,           // you can fetch /v1/artists/{id} later for genres/popularity
      popularity: null,
      images: null,
      external_urls: ar.external_urls ?? null,
      raw: ar,
    }));
    const { error: aerr } = await supabase
      .from("artists")
      .upsert(artistRows, { onConflict: "id" });
    if (aerr) throw aerr;

    const relArtistRows = albums.flatMap((al) =>
      (al.artists ?? []).map((ar: any) => ({
        release_id: al.id,
        artist_id: ar.id,
      }))
    );
    if (relArtistRows.length) {
      const { error: raerr } = await supabase
        .from("release_artists")
        .upsert(relArtistRows, { onConflict: "release_id,artist_id" });
      if (raerr) throw raerr;
    }
  }

  return rows.length;
}
