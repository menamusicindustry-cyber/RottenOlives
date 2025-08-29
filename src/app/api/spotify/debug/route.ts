import { spotifyFetch } from "@/lib/spotify";
export const runtime = "nodejs";

export async function GET() {
  try {
    // Known public playlist (Top 50 Global)
    const id = "37i9dQZEVXbLn7RQmT5Xv2";
    const data = await spotifyFetch(`/v1/playlists/${id}`);
    return Response.json({ ok: true, name: data.name, total: data.tracks?.total });
  } catch (err: any) {
    // Return the real server error so we can see it (instead of a blank 500 page)
    return Response.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
