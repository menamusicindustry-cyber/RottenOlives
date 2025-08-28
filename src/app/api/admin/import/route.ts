import { NextResponse } from "next/server";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const ADMIN_KEY = process.env.ADMIN_KEY || "";
  const key = req.headers.get("x-admin-key") || "";
  if (!ADMIN_KEY || key !== ADMIN_KEY) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  const { playlistId, isMena } = await req.json().catch(() => ({}));
  if (!playlistId) return NextResponse.json({ ok: false, error: "playlistId required" }, { status: 400 });

  // call internal Spotify import
  const base = new URL(req.url);
  base.pathname = "/api/spotify/import";
  base.search = "";
  const res = await fetch(base, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ playlistId, isMena }),
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  return NextResponse.json(json, { status: res.status });
}
