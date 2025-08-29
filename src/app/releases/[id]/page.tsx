"use client";

import { useEffect, useMemo, useState } from "react";
import AudienceRatingForm from "@/components/AudienceRatingForm";
import StarRating from "@/components/StarRating";

type AudienceItem = {
  id: string;
  stars: number; // 1..10
  comment: string | null;
  user: { name: string | null; email: string };
};

type ReleaseData = {
  id: string;
  title: string;
  artist: { name: string };
  coverUrl?: string | null;
  audience?: AudienceItem[];
  audienceScore?: number | null; // should be 1..10 (see backend tweak below)
  audienceCount?: number | null;
};

export default function ReleasePage({ params }: { params: { id: string } }) {
  const [release, setRelease] = useState<ReleaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function load() {
    try {
      setLoading(true);
      setErrorMsg(null);
      const res = await fetch(`/api/release?id=${params.id}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load release");
      setRelease(json.release || json);
    } catch (e: any) {
      setErrorMsg(String(e?.message || e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  // Fallback client-side average if backend aggregate hasn't populated yet
  const clientAvg = useMemo(() => {
    if (!release?.audience?.length) return null;
    const sum = release.audience.reduce((acc, a) => acc + (a.stars || 0), 0);
    return sum / release.audience.length; // 1..10
  }, [release?.audience]);

  const avg10 =
    (release?.audienceScore && isFinite(release.audienceScore) ? release.audienceScore : null) ??
    clientAvg ??
    0;

  const count = release?.audienceCount ?? release?.audience?.length ?? 0;

  if (loading) {
    return (
      <div className="section">
        <div className="meta">Loading…</div>
      </div>
    );
  }
  if (errorMsg || !release) {
    return (
      <div className="section card">
        <h3 style={{ marginTop: 0 }}>Something went wrong</h3>
        <div className="meta">{errorMsg || "Unknown error"}</div>
      </div>
    );
  }

  return (
    <div className="section" style={{ display: "grid", gap: 16 }}>
      {/* Header with larger cover */}
      <header
        className="card"
        style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 16, alignItems: "center" }}
      >
        {release.coverUrl && (
          <img
            src={release.coverUrl}
            alt={release.title}
            width={280}
            height={280}
            style={{ borderRadius: 14, objectFit: "cover" }}
          />
        )}
        <div className="col" style={{ gap: 8 }}>
          <h2 style={{ margin: 0 }}>{release.title}</h2>
          <div className="meta">by {release.artist?.name}</div>
          <div className="meta">
            Audience score: {avg10 ? avg10.toFixed(1) : "—"} / 10 • {count} rating{count === 1 ? "" : "s"}
          </div>
          {/* Visualize average with read-only stars */}
          {!!avg10 && (
            <div style={{ marginTop: 6 }}>
              <StarRating value={Math.round(avg10)} onChange={() => {}} readOnly max={10} size={22} color="#10b981" />
            </div>
          )}
        </div>
      </header>

      {/* Star-based rating form */}
      <AudienceRatingForm releaseId={release.id} onSubmitted={load} />

      {/* Audience list */}
      <section className="card col">
        <h3 style={{ marginTop: 0 }}>Audience Ratings</h3>
        <div className="grid" style={{ gap: 12 }}>
          {!release.audience?.length ? (
            <div className="card col">
              <div className="meta">No audience ratings yet.</div>
            </div>
          ) : (
            release.audience.map((a) => (
              <div key={a.id} className="card col" style={{ gap: 6 }}>
                <div className="meta">{a.user?.name || a.user?.email || "Guest"}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {/* Same green, transparent style for posted ratings */}
                  <StarRating value={a.stars} onChange={() => {}} readOnly max={10} size={18} color="#10b981" />
                  <span className="meta">({a.stars} / 10)</span>
                </div>
                {a.comment && <div className="meta">{a.comment}</div>}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
