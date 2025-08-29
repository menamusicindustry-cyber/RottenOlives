import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { password } = await req.json().catch(() => ({ password: "" }));
  const ok = !!process.env.ADMIN_PASSWORD && password === process.env.ADMIN_PASSWORD;
  if (!ok) return NextResponse.json({ ok: false, error: "Invalid password" }, { status: 401 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set("admin", "1", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
  return res;
}
