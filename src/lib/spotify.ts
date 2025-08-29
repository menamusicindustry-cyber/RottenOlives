// src/lib/spotify.ts
let _accessToken: string | null = null;
let _expiresAt = 0;

/** Your existing client-credentials token fetcher */
export async function fetchToken() {
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
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Spotify token error ${res.status}: ${body}`);
  }

  const json = await res.json();
  _accessToken = json.access_token;
  _expiresAt = Date.now() + (json.expires_in - 30) * 1000; // 30s safety
  return _accessToken!;
}

/** Get a valid app token, reusing cached one if not expired */
export async function getAppToken() {
  if (_accessToken && Date.now() < _expiresAt) return _accessToken;
  return fetchToken();
}

/** Normalize playlist input: URL / URI / ID → ID */
export function extractPlaylistId(input: string) {
  const s = String(input).trim();
  if (s.startsWith("https://open.spotify.com/playlist/")) {
    return s.split("/playlist/")[1].split("?")[0];
  }
  if (s.startsWith("spotify:playlist:")) return s.split(":").pop()!;
  return s; // assume already an ID
}

/** Small helper to hit Spotify with the bearer */
export async function spotifyGet<T = any>(url: string, token: string): Promise<T> {
  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (r.status === 429) {
    const retry = Number(r.headers.get("Retry-After") ?? "1") * 1000;
    await new Promise((res) => setTimeout(res, retry));
    return spotifyGet<T>(url, token);
  }
  if (!r.ok) throw new Error(`Spotify ${r.status}: ${await r.text()}`);
  return r.json();
}
