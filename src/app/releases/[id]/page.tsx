import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ReleasePage({ params }: { params: { id: string }}) {
  let release: any = null;
  let errorMsg: string | null = null;

  try {
    release = await prisma.release.findUnique({
      where: { id: params.id },
      include: {
        artist: true,
        scores: true,
        audience: { include: { user: true }, orderBy: { createdAt: "desc" }, take: 30 },
      },
    });
  } catch (e: any) {
    errorMsg = e?.message || "Could not load release.";
  }

  if (errorMsg) return <div className="section card">Error: {errorMsg}</div>;
  if (!release) return <div className="section card">Not found.</div>;

  return (
    <div className="section">
      <h1>{release.title}</h1>
      <div className="meta">{release.artist.name}</div>

      <h2>Audience Ratings</h2>
      {release.audience.length === 0 ? (
        <div className="card">No ratings yet.</div>
      ) : (
        release.audience.map((a: any) => (
          <div key={a.id} className="card">
            <div>{a.user.name ?? a.user.email}</div>
            <div>⭐ {a.stars} / 10</div>
            {a.comment && <div className="meta">{a.comment}</div>}
          </div>
        ))
      )}
    </div>
  );
}
