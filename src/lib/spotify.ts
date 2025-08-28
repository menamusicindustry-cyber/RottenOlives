// src/lib/spotify.ts
let _accessToken: string | null = null;
let _expiresAt = 0;

/**
 * Fetches a client-credentials access token from Spotify.
 * Requires env vars: SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET
 */
async function fetchToken() {
  const id = process.env.SPOTIFY_CLIENT_ID!;
  const secret = process.env.SPOTIFY_CLIENT_SECRET!;
  if (!id || !secret) {
    throw new Error("Missing SPOTIFY_CLIENT_ID or SPOTIFY_CLIENT_SECRET");
  }

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(id + ":" + secret).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
    // don't cache tokens in edge/CDN
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Spotify token error: ${res.status} ${text}`);
  }

  const j = await res.json();
  _accessToken = j.access_token as string;
  // refresh 5 minutes early
  _expiresAt = Date.now() + Math.max(0, (j.expires_in as number) - 300) * 1000;
  return _accessToken!;
}

/** Returns a cached token if valid; else fetches a new one. */
export async function getSpotifyToken() {
  if (_accessToken && Date.now() < _expiresAt) return _accessToken;
  return fetchToken();
}
