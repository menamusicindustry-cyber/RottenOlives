import { prisma } from '@/lib/prisma';
import Image from 'next/image';
import ScoreDial from '@/components/ScoreDial';

export default async function Home({ searchParams }: { searchParams: { region?: string }}) {
  const region = searchParams?.region;
  const releases = await prisma.release.findMany({
    where: region === 'mena' ? { isMena: true } : undefined,
    include: { artist: true, scores: true },
    take: 20,
    orderBy: { releaseDate: 'desc' }
  });

  return (
    <div className="grid gap-4">
      <h1 className="text-2xl font-semibold">New Releases {region === 'mena' ? '(MENA)' : ''}</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {releases.map(r => (
          <a key={r.id} href={`/releases/${r.id}`} className="bg-white border rounded-xl p-3 hover:shadow">
            <div className="flex gap-3">
              <div className="w-20 h-20 bg-neutral-200 rounded-md overflow-hidden">
                {r.coverUrl && <Image src={r.coverUrl} alt={r.title} width={80} height={80}/>}
              </div>
              <div className="flex-1">
                <div className="font-semibold">{r.title}</div>
                <div className="text-sm opacity-70">{r.artist.name}</div>
                <div className="mt-2 flex gap-4">
                  <ScoreDial label="Audience" value={r.scores?.audienceScore ?? undefined} />
                </div>
              </div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
}
