import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { parseClientIp, ipVersion, subnetOf, hashIp, hashSubnet } from '@/lib/ip';

export async function POST(req: NextRequest) {
  const { releaseId, stars, comment } = await req.json();
  if (!releaseId || !Number.isInteger(stars) || stars < 1 || stars > 10) {
    return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
  }

  // Demo: replace with NextAuth user session later
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@local' },
    update: {},
    create: { email: 'demo@local', name: 'Demo User' }
  });

  const xff = req.headers.get('x-forwarded-for');
  const ip = parseClientIp(xff) || (req as any).ip || '0.0.0.0';
  const ver = ipVersion(ip) ?? 4;
  const subnet = subnetOf(ip) ?? (ver === 4 ? '0.0.0.0/24' : '::/64');
  const ipHash = hashIp(ip);
  const subnetHash = hashSubnet(subnet);

  const existingIp = await prisma.audienceRating.findFirst({ where: { releaseId, ipHash } });
  if (existingIp) {
    return NextResponse.json({ error: 'A rating from your network already exists for this release.' }, { status: 409 });
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const subnetCount = await prisma.audienceRating.count({ where: { subnetHash, createdAt: { gte: since } } });
  if (subnetCount >= 3) {
    return NextResponse.json({ error: 'We see many ratings from your network today. Try again later.' }, { status: 429 });
  }

  const rating = await prisma.audienceRating.upsert({
    where: { releaseId_userId: { releaseId, userId: demoUser.id } },
    update: { stars, comment, ipHash, subnetHash, ipVersion: ver },
    create: { releaseId, userId: demoUser.id, stars, comment, ipHash, subnetHash, ipVersion: ver }
  });

  const agg = await prisma.audienceRating.aggregate({ where: { releaseId }, _avg: { stars: true }, _count: { _all: true } });
  const R = (agg._avg.stars || 0) * 10, n = agg._count._all, C = 68, m = 50;
  const bayes = (m*C + n*R) / (m + n);

  await prisma.releaseScore.upsert({
    where: { releaseId },
    update: { audienceScore: bayes, audienceCount: n, lastCalculated: new Date() },
    create: { releaseId, audienceScore: bayes, audienceCount: n }
  });

  return NextResponse.json({ ok: true, rating });
}
