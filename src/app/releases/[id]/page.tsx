import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function ReleasePage({ params }: { params: { id: string }}) {
  const id = params.id;
  let release:
    | (Awaited<ReturnType<typeof prisma.release.findUnique>> & {
        artist: { name: string };
        scores: { audienceScore: number | null; audienceCount: number } | null;
        audience: { id: string; stars: number; comment: string | null; user: { name: string | null; email: string } }[];
      })
    | null = null;

  let errorMsg: string | null = null;

  // SAFELY call Prisma; never throw so the page can't white-screen
  try {
    release = await prisma.release.findUnique({
      where: { id },
      include: {
        artist: true,
        scores: true,
        audience: {
          include: { user: true },
          orderBy: { createdAt: "desc" },
        },
      },
    });
  } catch (e: any) {
    errorMsg = e?.message || "Unknown database error";
  }

  return (
    <div className="section" style={{ display: "grid", gap: "var(--gap-4)" }}>
      {/* Error card (visible, not a crash) */}
      {errorMsg && (
        <div className="card">
          <h3 style={{ marginTop: 0 }}>We hit a snag</h3>
          <div className="meta">
            Error while loading release <code>{id}</code>: {errorMsg}
          </div>
          <div className="meta" style={{ marginTop: 6 }}>
            Tip: In Vercel → Settings → Env Vars, make sure
            {" "}
            <code>DATABASE_URL</code> uses the **pooler** host with
            {" "}
            <code>:6543</code> and <code>?pgbouncer=true&sslmode=require</code>.
          </div>
        </div>
      )}

      {/* Not found state */}
      {!errorMsg && !release && (
        <div className="card">
          <div className="meta">Release not found for id: <code>{id}</code></div>
        </div>
      )}

      {/* Main header */}
      {release && (
        <div className="card" style={{ display: "flex", gap: "var(--gap-3)", alignItems: "center" }}>
          <div className="cover" style={{ width: 96, height: 96 }} />
          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0 }}>{release.title}</h1>
            <div className="meta">{release.artist?.name}</div>
            <div className="meta" style={{ marginTop: 10 }}>
              Audience score: {Math.round(release.scores?.audienceScore ?? 0)} · Count: {release.scores?.audienceCount ?? 0}
            </div>
          </div>
        </div>
      )}

      {/* Write a review form */}
      {release && (
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
                body: JSON.stringify({ releaseId: id, stars, comment }),
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
            <input name="stars" type="number" min={1} max={10} defaultValue={8} className="input" required />
            <input name="comment" type="text" placeholder="Say something helpful…" className="input--wide" />
            <button className="btn btn--primary" type="submit">Post</button>
          </form>
          <div className="help">Please avoid posting lyrics or long copyrighted text.</div>
        </section>
      )}

      {/* Audience list */}
      {release && (
        <section>
          <h2>Audience Ratings</h2>
          <div className="grid">
            {(!release.audience || release.audience.length === 0) && (
              <div className="card col"><div className="meta">No audience ratings yet.</div></div>
            )}
            {release.audience?.map((a) => (
              <div key={a.id} className="card col">
                <div className="meta">{a.user?.name || a.user?.email || "Guest"}</div>
                <div style={{ marginTop: 6 }}>⭐ {a.stars} / 10</div>
                {a.comment && <div className="meta" style={{ marginTop: 6 }}>{a.comment}</div>}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
