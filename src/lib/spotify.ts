// src/lib/spotify.ts
// Uses your SPOTIFY_REFRESH_TOKEN to mint short-lived user access tokens.
// Provides a helper `spotifyFetch` for calling Spotify Web API endpoints.

let cached: { token: string; expiresAt: number } | null = null;

/** Get a valid access token using the refresh token (cached until near expiry). */
export async function getSpotifyToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.expiresAt - 30 > now) return cached.token;

  const id = process.env.SPOTIFY_CLIENT_ID!;
  const secret = process.env.SPOTIFY_CLIENT_SECRET!;
  const refresh = process.env.SPOTIFY_REFRESH_TOKEN!;

  if (!id || !secret || !refresh) {
    throw new Error(
      "Missing SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, or SPOTIFY_REFRESH_TOKEN"
    );
  }

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
@@ -33,37 +26,28 @@ export async function getSpotifyToken(): Promise<string> {
  });

  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`Spotify refresh failed: ${res.status} ${JSON.stringify(json)}`);
  }

  const token = json.access_token as string;
  const expiresIn = (json.expires_in as number) ?? 3600;
  cached = { token, expiresAt: now + expiresIn };
  return token;
}

/**
 * Convenience helper for Spotify Web API calls.
 * Accepts either a full URL or a path like `/v1/playlists/{id}`.
 */
export async function spotifyFetch(pathOrUrl: string): Promise<any> {
  const token = await getSpotifyToken();

  const url = pathOrUrl.startsWith("http")
    ? pathOrUrl
    : `https://api.spotify.com${
        pathOrUrl.startsWith("/v1") ? "" : "/v1"
      }${pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`}`;

  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    throw new Error(`Spotify fetch error: ${r.status} ${JSON.stringify(data)}`);
  }
  return data;
}
