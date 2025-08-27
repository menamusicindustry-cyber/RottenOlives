import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const { releaseId, stars, comment } = await req.json();

    const nStars = Number(stars);
    if (!releaseId || !Number.isFinite(nStars) || nStars < 1 || nStars > 10) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }

    // Create a throwaway guest user so we satisfy the userId FK.
    // We generate a random email to satisfy the unique(email) constraint.
    const guestEmail = `${crypto.randomUUID()}@guest.local`;
    const user = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email: guestEmail,
        name: "Guest",
      },
      select: { id: true },
    });

    // Store the rating (no IP / no auth restrictions)
    const rating = await prisma.audienceRating.create({
      data: {
        id: crypto.randomUUID(),
        releaseId,
        userId: user.id,
        stars: nStars,
        comment: comment ?? null,
        // leave ipHash/subnetHash/ipVersion NULL
      },
    });

    // Recalculate audience average (0–100) and count
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

    return Response.json({ ok: true, rating });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
