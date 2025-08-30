import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return Response.json({ ok: false, error: "Missing id" }, { status: 400 });



    const release = await prisma.release.findUnique({
      where: { id },
      include: {
        artist: true,
        scores: true,
        audience: { include: { user: true }, orderBy: { createdAt: "desc" } },








      },
    });
    if (!release) return Response.json({ ok: false, error: "Not found" }, { status: 404 });

    return Response.json({ ok: true, release });













  } catch (err: any) {
    return Response.json(
      { ok: false, error: err?.message || "Server error", name: err?.name, code: err?.code },

      { status: 500 }
    );
  }
}
