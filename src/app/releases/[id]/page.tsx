// src/app/releases/[id]/page.tsx
import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

type PageProps = { params: { id: string } };

function fmtDate(d?: Date | null) {
  if (!d) return "";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(d);
}

export default async function ReleasePage({ params }: PageProps) {
  const release = await prisma.release.findUnique({
    where: { id: params.id },
    include: {
      artist: true,
      scores: true,
      // ⬇️ Pull individual ratings via the relation on Release
      ratings: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          value: true,       // 1..10
          comment: true,
          createdAt: true,   // for timestamp
          name: true,        // adjust if your field differs (e.g., userName)
        },
      },
    },
  });

  if (!release) {
    return (
      <div className="section container">
        <div className="card"><h1>Release not found</h1></div>
      </div>
    );
  }

  // Optional: convert aggregate /100 to /10 stars for a quick summary
  const avg10 =
    release.scores?.audienceScore != null
      ? Math.round(release.scores.audienceScore / 10)
      : null;

  return (
    <div className="section container">
      <div className="card">
        <div className="song-cover" style={{ maxWidth: 360 }}>
          {release.coverUrl ? (
            <img src={release.coverUrl} alt={`${release.title} cover`} />
          ) : (
            <span>No Cover</span>
          )}
        </div>

        <h1 style={{ marginTop: 16 }}>{release.title}</h1>
        <div className="meta" style={{ marginBottom: 12 }}>
          {release.artist?.name || "Unknown Artist"}
        </div>

        {avg10 != null && (
          <div className="card" style={{ marginTop: 16 }}>
            <div className="title" style={{ marginBottom: 8 }}>Audience Score</div>
            <div className="stars" aria-label={`Audience score ${avg10} out of 10`}>
              <Stars10 value={avg10} />
              <span className="meta" style={{ marginLeft: 8 }}>
                ({avg10} / 10) · {release.scores?.audienceCount ?? 0} ratings
              </span>
            </div>
          </div>
        )}

        {/* Rating submit form */}
        <form action="/api/ratings" method="post" className="rating-form" style={{ marginTop: 16 }}>
          <input type="hidden" name="releaseId" value={release.id} />
          <div style={{ display: "grid", gap: 8, maxWidth: 420 }}>
            <label className="meta">
              Your name
              <input name="name" className="input" placeholder="e.g., Ali" />
            </label>

            <label className="meta">
              Your rating (1–10)
              <input
                name="value"
                type="number"
                min={1}
                max={10}
                step={1}
                required
                className="input"
                placeholder="9"
              />
            </label>

            <label className="meta">
              Comment (optional)
              <textarea name="comment" className="input" rows={3} placeholder="What did you think?" />
            </label>

            {/* Oval (pill) button — CSS in globals.css */}
            <button type="submit" className="btn btn--pill">Submit rating</button>
          </div>
        </form>
      </div>

      {/* Audience Ratings */}
      <section className="section" style={{ marginTop: 16 }}>
        <h2>Audience Ratings</h2>

        {release.ratings.length === 0 ? (
          <div className="card"><div className="meta">No audience ratings yet.</div></div>
        ) : (
          <div className="grid">
            {release.ratings.map((rt) => (
              <div key={rt.id} className="card rating-card" aria-label={`Rating by ${rt.name || "Anonymous"}`}>
                <div className="title">{rt.name || "Anonymous"}</div>

                {/* Stars row */}
                <div className="stars">
                  <Stars10 value={rt.value} />
                  <span className="meta" style={{ marginLeft: 8 }}>({rt.value} / 10)</span>
                </div>

                {/* Timestamp directly under the stars */}
                <div className="rating-time">
                  Added{" "}
                  <time dateTime={rt.createdAt.toISOString()}>
                    {fmtDate(rt.createdAt)}
                  </time>
                </div>

                {rt.comment && (
                  <div className="meta" style={{ marginTop: 8 }}>{rt.comment}</div>
                )}
              </div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <Link href="/">← Back to latest</Link>
        </div>
      </section>
    </div>
  );
}

function Stars10({ value }: { value: number }) {
  const filled = Math.max(0, Math.min(10, Math.round(value)));
  return (
    <div style={{ display: "inline-flex", gap: 2 }} aria-hidden="true">
      {Array.from({ length: 10 }).map((_, i) => (
        <span key={i}>{i < filled ? "★" : "☆"}</span>
      ))}
    </div>
  );
}
