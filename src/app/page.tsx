import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type HomeProps = {
  searchParams?: { q?: string };
};

export default async function HomePage({ searchParams }: HomeProps) {
  const qRaw = (searchParams?.q ?? "").toString().trim();
  const q = qRaw.slice(0, 80); // basic guard

  if (q) {
    // SEARCH MODE: find matching artists + releases
    const [artists, releases] = await Promise.all([
      prisma.artist.findMany({
        where: { name: { contains: q, mode: "insensitive" } },
        orderBy: { name: "asc" },
        take: 25,
      }),
      prisma.release.findMany({
        where: { title: { contains: q, mode: "insensitive" } },
        include: { artist: true, scores: true },
        orderBy: [{ releaseDate: "desc" }],
        take: 50,
      }),
    ]);

    return (
      <div className="section container">
        <div className="card">
          <h1 style={{ margin: 0 }}>Search results</h1>
          <div className="meta">Query: “{q}”</div>
        </div>

        {/* Artists */}
        <section>
          <h2>Artists</h2>
          {artists.length === 0 ? (
            <div className="card"><div className="meta">No artists found.</div></div>
          ) : (
            <div className="grid">
              {artists.map((a) => (
                <Link key={a.id} href={`/artists/${a.id}`} className="card col">
                  <h3 className="title">{a.name}</h3>
                  <div className="meta">View artist & releases →</div>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Releases */}
        <section>
          <h2>Releases</h2>
          {releases.length === 0 ? (
            <div className="card"><div className="meta">No releases found.</div></div>
          ) : (
            <div className="grid">
              {releases.map((r) => (
                <Link key={r.id} href={`/releases/${r.id}`} className="card col" aria-label={`${r.title} by ${r.artist?.name || "Unknown"}`}>
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
        </section>
      </div>
    );
  }

  // DEFAULT MODE: latest releases
  const releases = await prisma.release.findMany({
    include: { artist: true, scores: true },
    orderBy: [{ releaseDate: "desc" }],
    take: 48,
  });

  return (
    <div className="section container">
      <h1>Rotten Olives — Latest Releases</h1>

      {releases.length === 0 && (
        <div className="card">
          <div className="meta">No releases yet. Add some in your DB to see them here.</div>
        </div>
      )}

      <div className="grid">
        {releases.map((r) => (
          <Link key={r.id} href={`/releases/${r.id}`} className="card col" aria-label={`${r.title} by ${r.artist?.name || "Unknown"}`}>
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
