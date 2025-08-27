import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ReleasePage({ params }: { params: { id: string }}) {
  const release = await prisma.release.findUnique({
    where: { id: params.id },
    include: {
      artist: true,
      scores: true,
      audience: { include: { user: true }, orderBy: { createdAt: "desc" } },
    },
  });

  if (!release) {
    return <div className="section card"><div className="meta">Not found.</div></div>;
  }

  return (
    <div className="section" style={{ display: "grid", gap: "var(--gap-4)" }}>
      {/* Header / hero */}
      <div className="card" style={{ display: "flex", gap: "var(--gap-3)", alignItems: "center" }}>
        <div className="cover" style={{ width: 96, height: 96 }} />
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0 }}>{release.title}</h1>
          <div className="meta">{release.artist.name}</div>
          <div style={{ marginTop: 10 }} className="meta">
            Audience score: {Math.round(release.scores?.audienceScore ?? 0)} · Count: {release.scores?.audienceCount ?? 0}
          </div>
        </div>
      </div>

      {/* Write a review (THIS is the form you were missing) */}
      <section className="card">
        <h3>Write a review</h3>
        <form
          className="form-row"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = e.currentTarget as HTMLFormElement;
            const stars = Number((form.querySelector('[name=stars]') as HTMLInputElement).value);
            const comment = (form.querySelector('[name=comment]') as HTMLInputElement).value;

            const res = await fetch("/api/rate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ releaseId: release.id, stars, comment }),
            });

            if (res.ok) {
              location.reload();
            } else {
              const j = await res.json().catch(() => ({} as any));
              alert(j.error || "Could not submit review.");
            }
          }}
        >
          <label className="meta">Stars</label>
          <input
            name="stars"
            type="number"
            min={1}
            max={10}
            defaultValue={8}
            className="input"
            required
          />
          <input
            name="comment"
            type="text"
            placeholder="Say something helpful…"
            className="input--wide"
          />
          <button className="btn btn--primary" type="submit">Post</button>
        </form>
        <div className="help">Please avoid posting lyrics or long copyrighted text.</div>
      </section>

      {/* Existing audience ratings */}
      <section>
        <h2>Audience Ratings</h2>
        <div className="grid">
          {release.audience.length === 0 && (
            <div className="card col"><div className="meta">No audience ratings yet.</div></div>
          )}
          {release.audience.map((a) => (
            <div key={a.id} className="card col">
              <div className="meta">{a.user.name ?? a.user.email ?? "Guest"}</div>
              <div style={{ marginTop: 6 }}>⭐ {a.stars} / 10</div>
              {a.comment && <div className="meta" style={{ marginTop: 6 }}>{a.comment}</div>}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
