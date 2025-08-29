// src/lib/spotify.ts
// Uses refresh_token to mint user access tokens for Spotify Web API calls.
let cached: { token: string; expiresAt: number } | null = null;

export async function getSpotifyToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.expiresAt - 30 > now) return cached.token;

  const id = process.env.SPOTIFY_CLIENT_ID!;
  const secret = process.env.SPOTIFY_CLIENT_SECRET!;
  const refresh = process.env.SPOTIFY_REFRESH_TOKEN!; // <- set in Vercel

  if (!id || !secret || !refresh) {
    throw new Error("Missing SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, or SPOTIFY_REFRESH_TOKEN");
  }

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refresh,
    }),
    cache: "no-store",
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Spotify refresh failed: ${res.status} ${JSON.stringify(json)}`);
  }

  const accessToken = json.access_token as string;
  const expiresIn = (json.expires_in as number) ?? 3600;

  cached = { token: accessToken, expiresAt: now + expiresIn };
  return accessToken;
}

/** Convenience helper for calling Spotify Web API with auth */
export async function spotifyFetch(path: string) {
  const token = await getSpotifyToken();
  const url = path.startsWith("http")
    ? path
    : `https://api.spotify.com${path.startsWith("/v1") ? "" : "/v1"}${path.startsWith("/") ? path : `/${path}`}`;

  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Spotify fetch error: ${r.status} ${JSON.stringify(data)}`);
  return data;
}
