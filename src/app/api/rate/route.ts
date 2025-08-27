import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { releaseId, stars, comment } = await req.json();
    if (!releaseId || !stars) return Response.json({ error: "Missing fields" }, { status: 400 });

    await prisma.audienceRating.create({
      data: {
        id: crypto.randomUUID(),
        releaseId,
        userId: "anon", // replace with auth later
        stars,
        comment,
      },
    });

    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
