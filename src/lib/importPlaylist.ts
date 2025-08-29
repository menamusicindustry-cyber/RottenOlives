// src/lib/importPlaylist.ts
import { getAppToken, spotifyGet } from "./spotify";
import { supabaseServer } from "./supabaseServer";

export async function fetchAllPlaylistTracks(playlistId: string) {
  const token = await getAppToken();
  let url = `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=100`;
  const items: any[] = [];
  while (url) {
    const data = await spotifyGet<any>(url, token);
    items.push(...(data.items ?? []));
    url = data.next;
  }
  // keep only real tracks
  return items.filter((it) => it?.track?.type === "track");
}

export function uniqueAlbumIdsFromTracks(trackItems: any[]) {
  const ids = new Set<string>();
  for (const it of trackItems) {
    const alb = it?.track?.album;
    if (alb?.id) ids.add(alb.id);
  }
  return Array.from(ids);
}

export async function fetchAlbumsByIds(ids: string[]) {
  const token = await getAppToken();
  const all: any[] = [];
  for (let i = 0; i < ids.length; i += 20) {
    const batch = ids.slice(i, i + 20);
    const d = await spotifyGet<any>(
      `https://api.spotify.com/v1/albums?ids=${batch.join(",")}`,
      token
    );
    all.push(...(d.albums ?? []));
  }
  return all;
}

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
    images: a.images ?? null,
    external_urls: a.external_urls ?? null,
    markets: a.available_markets ?? null,
    raw: a,
    updated_at: new Date().toISOString(),
  }));

  const { error } = await supabaseServer
    .from("releases")
    .upsert(rows, { onConflict: "id" });

  if (error) throw error;

  // optional: release↔artists table if you have it
  const relArtistRows = albums.flatMap((al) =>
    (al.artists ?? []).map((ar: any) => ({
      release_id: al.id,
      artist_id: ar.id,
    }))
  );
  if (relArtistRows.length) {
    await supabaseServer.from("release_artists").upsert(relArtistRows, {
      onConflict: "release_id,artist_id",
    });
  }

  return rows.length;
}

export async function importPlaylistToReleases(playlistId: string) {
  const tracks = await fetchAllPlaylistTracks(playlistId);
  const albumIds = uniqueAlbumIdsFromTracks(tracks);
  if (!albumIds.length) return { imported: 0, albumCount: 0 };

  const albums = await fetchAlbumsByIds(albumIds);
  const imported = await upsertReleases(albums);

  // optional log table if you created it
  await supabaseServer.from("playlist_imports").insert({
    playlist_id: playlistId,
    imported_releases: imported,
    finished_at: new Date().toISOString(),
  });

  return { imported, albumCount: albumIds.length };
}
