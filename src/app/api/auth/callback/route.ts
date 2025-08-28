import { NextResponse } from "next/server";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (!code) return NextResponse.json({ ok: false, error: "Missing code" }, { status: 400 });

  const id = process.env.SPOTIFY_CLIENT_ID!;
  const secret = process.env.SPOTIFY_CLIENT_SECRET!;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI!;

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: "Basic " + Buffer.from(`${id}:${secret}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
    cache: "no-store",
  });

  const json = await res.json();
  if (!res.ok) return NextResponse.json({ ok: false, error: json }, { status: 500 });

  // Copy this value and put it in Vercel as SPOTIFY_REFRESH_TOKEN
  return NextResponse.json({
    ok: true,
    note: "Copy refresh_token into SPOTIFY_REFRESH_TOKEN (then redeploy)",
    refresh_token: json.refresh_token,
    access_token_preview: (json.access_token || "").slice(0, 10) + "...",
    expires_in: json.expires_in,
    scope: json.scope,
  });
}
