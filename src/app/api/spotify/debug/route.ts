// src/app/api/spotify/debug/route.ts
import { spotifyFetch } from "@/lib/spotify";
export const runtime = "nodejs";

export async function GET() {
  try {
    // 1) Your ID + market param
    const yours = "37i9dQZEVXbLn7RQmT5Xv2";
    const a = await spotifyFetch(`/v1/playlists/${yours}?market=US`);

    // 2) Known-good ID: Today's Top Hits
    const known = "37i9dQZF1DXcBWIGoYBM5M";
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
