import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function HomePage() {
  // Fetch latest releases with artist & score
  const releases = await prisma.release.findMany({
    include: { artist: true, scores: true },
    orderBy: [{ releaseDate: "desc" }], // if some are null, they'll appear last
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
            {/* Cover image (square) with graceful fallback */}
            <div className="song-cover">
              {r.coverUrl ? (
                <img src={r.coverUrl} alt={`${r.title} cover`} />
              ) : (
                <span>No Cover</span>
              )}
            </div>

            {/* Title + artist */}
            <h3 className="title">{r.title}</h3>
            <div className="meta">{r.artist?.name || "Unknown Artist"}</div>

            {/* Score (if any) */}
            <div className="meta">
              Audience score: {Math.round(r.scores?.audienceScore ?? 0)} ·{" "}
              {r.scores?.audienceCount ?? 0} ratings
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
