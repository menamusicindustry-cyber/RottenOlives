import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { releaseId, stars, comment, name } = await req.json();

    const nStars = Number(stars);
    if (!releaseId || !Number.isFinite(nStars) || nStars < 1 || nStars > 10) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }

    // Clean up the optional display name
    const displayName =
      typeof name === "string"
        ? name.trim().slice(0, 40) // max 40 chars
        : null;

    // Create a throwaway guest user (unique email) and store the chosen name
    const guestEmail = `${crypto.randomUUID()}@guest.local`;
    const user = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email: guestEmail,
        name: displayName || "Guest",
      },
      select: { id: true },
    });

    // Store rating
    await prisma.audienceRating.create({
      data: {
        id: crypto.randomUUID(),
        releaseId,
        userId: user.id,
        stars: nStars,
        comment: comment ?? null,
      },
    });

    // Recalculate score
    const agg = await prisma.audienceRating.aggregate({
      where: { releaseId },
      _avg: { stars: true },
      _count: { _all: true },
    });

    await prisma.releaseScore.upsert({
      where: { releaseId },
      update: {
        audienceScore: (agg._avg.stars || 0) * 10,
        audienceCount: agg._count._all,
        lastCalculated: new Date(),
      },
      create: {
        releaseId,
        audienceScore: (agg._avg.stars || 0) * 10,
        audienceCount: agg._count._all,
        lastCalculated: new Date(),
      },
    });

    return Response.json({ ok: true });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
