let _accessToken: string | null = null;
let _expiresAt = 0;

async function fetchToken() {
  const id = process.env.SPOTIFY_CLIENT_ID!;
  const secret = process.env.SPOTIFY_CLIENT_SECRET!;
  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(id + ":" + secret).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
  });
  if (!res.ok) throw new Error("Spotify token error: " + (await res.text()));
  const j = await res.json();
  _accessToken = j.access_token;
  _expiresAt = Date.now() + (j.expires_in - 300) * 1000; // refresh 5m early
  return _accessToken!;
}

export async function getSpotifyToken() {
  if (_accessToken && Date.now() < _expiresAt) return _accessToken;
  return fetchToken();
}
