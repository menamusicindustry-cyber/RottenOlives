import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type HomeProps = { searchParams?: { q?: string } };

export default async function HomePage({ searchParams }: HomeProps) {
  const q = (searchParams?.q ?? "").toString().trim().slice(0, 80);

  if (q) {
    const releases = await prisma.release.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { artist: { name: { contains: q, mode: "insensitive" } } },
        ],
      },
      include: { artist: true, scores: true },
      orderBy: [{ releaseDate: "desc" }],
      take: 60,
    });

    return (
      <div className="section container">
        <div className="card">
          <h1 style={{ margin: 0 }}>Search results</h1>
          <div className="meta">Query: “{q}” — {releases.length} release(s)</div>
        </div>

        {releases.length === 0 ? (
          <div className="card"><div className="meta">No releases found.</div></div>
        ) : (
          <div className="grid grid--mobile-3">
            {releases.map((r) => (
              <Link
                key={r.id}
                href={`/releases/${r.id}`}
                className="card col"
                aria-label={`${r.title} by ${r.artist?.name || "Unknown"}`}
              >
                <div className="song-cover">
                  {r.coverUrl ? <img src={r.coverUrl} alt={`${r.title} cover`} /> : <span>No Cover</span>}
                </div>
                <h3 className="title">{r.title}</h3>
                <div className="meta">{r.artist?.name || "Unknown Artist"}</div>
                <div className="meta">
                  Audience score: {Math.round(r.scores?.audienceScore ?? 0)} · {r.scores?.audienceCount ?? 0} ratings
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  // Default (no q): latest releases
  const releases = await prisma.release.findMany({
    include: { artist: true, scores: true },
    orderBy: [{ releaseDate: "desc" }],
    take: 48,
  });

  return (
    <div className="section container">
      <h1>Rotten Olives — Latest Releases</h1>
      {releases.length === 0 && (
        <div className="card"><div className="meta">No releases yet.</div></div>
      )}
      <div className="grid grid--mobile-3">
        {releases.map((r) => (
          <Link
            key={r.id}
            href={`/releases/${r.id}`}
            className="card col"
            aria-label={`${r.title} by ${r.artist?.name || "Unknown"}`}
          >
            <div className="song-cover">
              {r.coverUrl ? <img src={r.coverUrl} alt={`${r.title} cover`} /> : <span>No Cover</span>}
            </div>
            <h3 className="title">{r.title}</h3>
            <div className="meta">{r.artist?.name || "Unknown Artist"}</div>
            <div className="meta">
              Audience score: {Math.round(r.scores?.audienceScore ?? 0)} · {r.scores?.audienceCount ?? 0} ratings
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
