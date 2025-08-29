import { spotifyFetch } from "@/lib/spotify";

export const runtime = "nodejs";

export async function GET() {
  try {
    // Known public playlist (Top 50 Global)
    const id = "37i9dQZEVXbLn7RQmT5Xv2";
    const data = await spotifyFetch(`/v1/playlists/${id}`);
    return Response.json({ ok: true, name: data.name, tracks: data.tracks?.total });
  } catch (err) {
    // Return the real error so we can see status/message
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
