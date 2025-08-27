import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home({ searchParams }: { searchParams: { region?: string }}) {
  const region = searchParams?.region;
  let releases: any[] = [];
  let errorMsg: string | null = null;

  try {
    releases = await prisma.release.findMany({
      where: region === "mena" ? { isMena: true } : undefined,
      include: { artist: true, scores: true },
      take: 24,
      orderBy: [{ releaseDate: "desc" }, { title: "asc" }],
    });
  } catch (e: any) {
    errorMsg = e?.message || "Could not load releases.";
  }

  return (
    <div className="section">
      <h1>New Releases {region === "mena" ? "(MENA)" : ""}</h1>
      {errorMsg && <div className="card col">Error: {errorMsg}</div>}
      <div className="grid">
        {releases.map((r) => (
          <a key={r.id} href={`/releases/${r.id}`} className="card col">
            <div className="tile">
              <div className="cover" />
              <div style={{ flex: 1 }}>
                <div className="title">{r.title}</div>
                <div className="meta">{r.artist.name}</div>
              </div>
            </div>
          </a>
        ))}
        {!errorMsg && releases.length === 0 && (
          <div className="card col"><div className="meta">No releases yet.</div></div>
        )}
      </div>
    </div>
  );
}
