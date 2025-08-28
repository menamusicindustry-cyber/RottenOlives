import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (!code) return NextResponse.json({ ok: false, error: "Missing code" }, { status: 400 });

  const clientId = process.env.SPOTIFY_CLIENT_ID!;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET!;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI!;

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
  });

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${clientId}:${clientSecret}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const json = await res.json();
  if (!res.ok) {
    return NextResponse.json({ ok: false, error: json }, { status: 500 });
  }

  // IMPORTANT: This shows your refresh_token ONCE so you can copy it to Vercel env
  // After you save it as SPOTIFY_REFRESH_TOKEN, you won't need to log in again.
  return NextResponse.json({
    ok: true,
    note: "Copy refresh_token and paste it into Vercel as SPOTIFY_REFRESH_TOKEN",
    refresh_token: json.refresh_token,
    access_token_preview: (json.access_token || "").slice(0, 12) + "...",
    expires_in: json.expires_in,
    scope: json.scope,
    token_type: json.token_type,
  });
}
