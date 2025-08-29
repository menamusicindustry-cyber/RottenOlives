import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { releaseId, stars, comment, name } = body || {};

    // DEBUG: see exactly what the page sent
    console.log("RATE body:", body);

    const nStars = Number(stars);
    if (!releaseId || !Number.isFinite(nStars) || nStars < 1 || nStars > 10) {
      return Response.json({ error: "Invalid input" }, { status: 400 });
    }

    const displayName =
      typeof name === "string" && name.trim()
        ? name.trim().slice(0, 40)
        : "Guest";

    // Create a one-off user carrying the chosen display name
    const guestEmail = `${crypto.randomUUID()}@guest.local`;
    const user = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email: guestEmail,
        name: displayName, // <— THIS is what will show
      },
      select: { id: true, name: true, email: true },
    });

    const rating = await prisma.audienceRating.create({
      data: {
        id: crypto.randomUUID(),
        releaseId,
        userId: user.id,
        stars: nStars,
        comment: comment ?? null,
      },
      include: { user: true },
    });

    // Update aggregate score
    const agg = await prisma.audienceRating.aggregate({
      where: { releaseId },
      _avg: { stars: true },
      _count: { _all: true },
    });

    await prisma.releaseScore.upsert({
      where: { releaseId },
      update: {
        audienceScore: agg._avg.stars || 0,
        audienceCount: agg._count._all,
        lastCalculated: new Date(),
      },
      create: {
        releaseId,
        audienceScore: agg._avg.stars || 0,
        audienceCount: agg._count._all,
        lastCalculated: new Date(),
      },
    });

    return Response.json({ ok: true, rating, user });
  } catch (e: any) {
    return Response.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
