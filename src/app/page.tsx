import { prisma } from "@/lib/prisma";

// Also mark this page dynamic (belt & suspenders)
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home({ searchParams }: { searchParams: { region?: string }}) {
  const region = searchParams?.region;
  const releases = await prisma.release.findMany({
    where: region === "mena" ? { isMena: true } : undefined,
    include: { artist: true, scores: true },
    take: 24,
    orderBy: [{ releaseDate: "desc" }, { title: "asc" }],
  });

  return (
    <div className="section">
      <h1>New Releases {region === "mena" ? "(MENA)" : ""}</h1>
      <div className="grid">
        {releases.map((r) => (
          <a key={r.id} href={`/releases/${r.id}`} className="card col">
            <div className="tile">
              <div className="cover" />
              <div style={{ flex: 1 }}>
                <div className="title">{r.title}</div>
                <div className="meta">{r.artist.name}</div>
                <div style={{ marginTop: 8, display: "flex", gap: 12, alignItems: "center" }}>
                  <div className="dial">
                    <svg viewBox="0 0 36 36" className="dial__svg">
                      <path
                        d="M18 2 a 16 16 0 1 1 0 32 a 16 16 0 1 1 0 -32"
                        fill="none" strokeWidth="3" stroke="currentColor" opacity=".2"
                      />
                      <path
                        d="M18 2 a 16 16 0 1 1 0 32 a 16 16 0 1 1 0 -32"
                        fill="none" strokeWidth="3" strokeLinecap="round" stroke="currentColor"
                        strokeDasharray={`${Math.max(0, Math.min(100, r.scores?.audienceScore ?? 0))}, 100`}
                      />
                    </svg>
                    <div className="dial__value">
                      {Math.round(r.scores?.audienceScore ?? 0)}
                    </div>
                  </div>
                  <span className="meta">Audience score</span>
                </div>
              </div>
            </div>
          </a>
        ))}
        {releases.length === 0 && (
          <div className="card col">
            <div className="meta">No releases yet. Add some in Supabase or via seed.</div>
          </div>
        )}
      </div>
    </div>
  );
}
