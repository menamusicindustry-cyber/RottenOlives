// lib/spotify.ts
export async function getAppToken() {
  const id = process.env.SPOTIFY_CLIENT_ID!;
  const secret = process.env.SPOTIFY_CLIENT_SECRET!;
  if (!id || !secret) throw new Error("Missing Spotify env vars");

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(id + ":" + secret).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "client_credentials" }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Token error ${res.status}: ${await res.text()}`);
  const { access_token } = await res.json();
  return access_token as string;
}

export function extractPlaylistId(input: string) {
  if (!input) throw new Error("No playlist input");
  if (input.startsWith("https://open.spotify.com/playlist/")) {
    const id = input.split("/playlist/")[1].split("?")[0];
    return id;
  }
  if (input.startsWith("spotify:playlist:")) {
    return input.split(":").pop()!;
  }
  return input; // assume already an ID
}
