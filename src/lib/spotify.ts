// Helper to mint access tokens from your SPOTIFY_REFRESH_TOKEN
// and call the Spotify Web API easily.

let cached: { token: string; expiresAt: number } | null = null;

export async function getSpotifyToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  if (cached && cached.expiresAt - 30 > now) return cached.token;

  const id = process.env.SPOTIFY_CLIENT_ID!;
  const secret = process.env.SPOTIFY_CLIENT_SECRET!;
  const refresh = process.env.SPOTIFY_REFRESH_TOKEN!;
  if (!id || !secret || !refresh) throw new Error("Missing Spotify env vars");

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
  if (!res.ok) throw new Error(`Spotify refresh failed: ${res.status} ${JSON.stringify(json)}`);

  const token = json.access_token as string;
  const expiresIn = (json.expires_in as number) ?? 3600;
  cached = { token, expiresAt: now + expiresIn };
  return token;
}

export async function spotifyFetch(pathOrUrl: string): Promise<any> {
  const token = await getSpotifyToken();

  const url = pathOrUrl.startsWith("http")
    ? pathOrUrl
    : `https://api.spotify.com${pathOrUrl.startsWith("/v1") ? "" : "/v1"}${
        pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`
      }`;

  const r = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`Spotify fetch error: ${r.status} ${JSON.stringify(data)}`);
  return data;
}
