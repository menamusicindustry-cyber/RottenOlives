"use client";

import { useEffect, useState } from "react";

type AudienceItem = {
  id: string;
  stars: number;
  comment: string | null;
  user: { name: string | null; email: string };
};

type ReleaseData = {
  id: string;
  title: string;
  artist: { name: string };
  scores?: { audienceScore: number | null; audienceCount: number } | null;
  audience: AudienceItem[];
};

export default function ReleasePage({ params }: { params: { id: string }}) {
  const id = params.id;
  const [data, setData] = useState<{ ok: boolean; release?: ReleaseData; error?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [stars, setStars] = useState(8);
  const [comment, setComment] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/release?id=${encodeURIComponent(id)}`, { cache: "no-store" });
        const json = await res.json();
        if (active) setData(json);
      } catch (e: any) {
        if (active) setData({ ok: false, error: e?.message || "Network error" });
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [id]);

  if (loading) {
    return <div className="section card"><div className="meta">Loading…</div></div>;
  }

  if (!data?.ok || !data.release) {
    return (
      <div className="section card">
        <h3 style={{ marginTop: 0 }}>We hit a snag</h3>
        <div className="meta">Error: {data?.error || "Unknown error"}</div>
        <div className="meta" style={{ marginTop: 6 }}>
          Tip: open <code>/api/release?id={id}</code> directly to see the raw error JSON.
        </div>
      </div>
    );
  }

  const release = data.release;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch("/api/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ releaseId: release.id, stars, comment }),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(j.error || "Could not submit review.");
      // re-fetch the page data to reflect the new rating
      const fresh = await fetch(`/api/release?id=${encodeURIComponent(id)}`, { cache: "no-store" });
      const json = await fresh.json();
      setData(json);
      setComment("");
    } catch (err: any) {
      alert(err?.message || "Could not submit review.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="section" style={{ display: "grid", gap: "var(--gap-4)" }}>
      {/* Header / hero */}
      <div className="card" style={{ display: "flex", gap: "var(--gap-3)", alignItems: "center" }}>
        <div className="cover" style={{ width: 96, height: 96 }} />
        <div style={{ flex: 1 }}>
          <h1 style={{ margin: 0 }}>{release.title}</h1>
          <div className="meta">{release.artist?.name}</div>
          <div style={{ marginTop: 10 }} className="meta">
            Audience score: {Math.round(release.scores?.audienceScore ?? 0)} · Count: {release.scores?.audienceCount ?? 0}
          </div>
        </div>
      </div>

      {/* Write a review */}
      <section className="card">
        <h3>Write a review</h3>
        <form className="form-row" onSubmit={onSubmit}>
          <label className="meta">Stars</label>
          <input
            name="stars"
            type="number"
            min={1}
            max={10}
            value={stars}
            onChange={(e) => setStars(Number(e.target.value))}
            className="input"
            required
          />
          <input
            name="comment"
            type="text"
            placeholder="Say something helpful…"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="input--wide"
          />
          <button className="btn btn--primary" type="submit" disabled={submitting}>
            {submitting ? "Posting…" : "Post"}
          </button>
        </form>
        <div className="help">Please avoid posting lyrics or long copyrighted text.</div>
      </section>

      {/* Audience list */}
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
    </div>
  );
}
