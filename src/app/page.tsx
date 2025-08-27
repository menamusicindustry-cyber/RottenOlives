import { prisma } from "@/lib/prisma";

export default async function ReleasePage({ params }: { params: { id: string }}) {
  const release = await prisma.release.findUnique({
    where: { id: params.id },
    include: {
      artist: true,
      scores: true,
      audience: { include: { user: true }, orderBy: { createdAt: "desc" }, take: 30 },
    },
  });
  if (!release) return <div className="section card">Not found.</div>;

  return (
    <div className="section" style={{ display: "grid", gap: "var(--gap-4)" }}>
      {/* Hero */}
      <div className="card" style={{ display: "flex", gap: "var(--gap-3)", alignItems: "center" }}>
        <div className="cover" style={{ width: 96, height: 96 }} />
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0 }}>{release.title}</h1>
          <div className="meta">{release.artist.name}</div>
          <div style={{ marginTop: 10, display: "flex", gap: 12, alignItems: "center" }}>
            <div className="dial">
              <svg viewBox="0 0 36 36" className="dial__svg">
                <path
                  d="M18 2 a 16 16 0 1 1 0 32 a 16 16 0 1 1 0 -32"
                  fill="none" strokeWidth="3" stroke="currentColor" opacity=".2"
                />
                <path
                  d="M18 2 a 16 16 0 1 1 0 32 a 16 16 0 1 1 0 -32"
                  fill="none" strokeWidth="3" strokeLinecap="round" stroke="currentColor"
                  strokeDasharray={`${Math.max(0, Math.min(100, release.scores?.audienceScore ?? 0))}, 100`}
                />
              </svg>
              <div className="dial__value">{Math.round(release.scores?.audienceScore ?? 0)}</div>
            </div>
            <span className="meta">Audience score</span>
          </div>
        </div>
      </div>

      {/* Audience list */}
      <section>
        <h2>Audience Ratings</h2>
        <div className="grid">
          {release.audience.map((a) => (
            <div key={a.id} className="card col">
              <div className="meta">{a.user.name ?? a.user.email}</div>
              <div style={{ marginTop: 6 }}>⭐ {a.stars} / 10</div>
              {a.comment && <div className="meta" style={{ marginTop: 6 }}>{a.comment}</div>}
            </div>
          ))}
          {release.audience.length === 0 && (
            <div className="card col"><div className="meta">No audience ratings yet.</div></div>
          )}
        </div>
      </section>

      {/* Form */}
      <section className="card">
        <h3>Write a review</h3>
        <AudienceForm releaseId={release.id} />
        <div className="help">
          No lyrics or long copyrighted passages. Short quotes only with attribution.
        </div>
      </section>
    </div>
  );
}

function AudienceForm({ releaseId }: { releaseId: string }) {
  return (
    <form
      className="form-row"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget as HTMLFormElement;
        const stars = Number((form.querySelector('[name=stars]') as HTMLInputElement).value);
        const comment = (form.querySelector('[name=comment]') as HTMLInputElement).value;
        const res = await fetch("/api/rate", {
          method: "POST",
          body: JSON.stringify({ releaseId, stars, comment }),
        });
        if (res.ok) location.reload();
        else {
          const j = await res.json().catch(() => ({}));
          alert(j.error || "Could not submit review.");
        }
      }}
    >
      <label className="meta">Stars</label>
      <input name="stars" type="number" min={1} max={10} defaultValue={8} className="input" />
      <input name="comment" type="text" placeholder="Say something helpful..." className="input--wide" />
      <button className="btn btn--primary" type="submit">Post</button>
    </form>
  );
}
