// src/app/api/spotify/debug/route.ts
import { spotifyFetch } from "@/lib/spotify";
export const runtime = "nodejs";

export async function GET() {
  try {
    // 1) Your ID + market param
    const yours = "3cEYpjA9oz9GiPac4AsH4n";
    const a = await spotifyFetch(`/v1/playlists/${yours}?market=US`);

    // 2) Known-good ID: Today's Top Hits
    const known = "3cEYpjA9oz9GiPac4AsH4n";
    const b = await spotifyFetch(`/v1/playlists/${known}?market=US`);

    return Response.json({
      ok: true,
      yourPlaylist: { id: a?.id, name: a?.name, total: a?.tracks?.total },
      knownPlaylist: { id: b?.id, name: b?.name, total: b?.tracks?.total },
    });
  } catch (err: any) {
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
