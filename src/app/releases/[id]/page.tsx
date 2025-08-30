"use client";

import { useEffect, useMemo, useState } from "react";
import AudienceRatingForm from "@/components/AudienceRatingForm";
import StarRating from "@/components/StarRating";

function fmtDateISO(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  }).format(d);
}

type AudienceItem = {
  id: string;
  stars: number; // 1..10
  comment: string | null;
  createdAt: string;
  user: { name: string | null; email: string };
};

type ReleaseData = {
  id: string;
  title: string;
  artist: { name: string };
  coverUrl?: string | null;
  audience?: AudienceItem[];
  audienceScore?: number | null; // expected 1..10 if your API sets it, else we compute below
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

  // Client-side average if backend didn't send audienceScore
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
        <div className="card col"><div className="meta">Loading…</div></div>
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
      {/* -------- Hero: image left, info right on desktop -------- */}
      <section className="card release-hero">
        <div className="release-hero__media">
          <div className="song-cover">
            {release.coverUrl ? (
              <img src={release.coverUrl} alt={`${release.title} cover`} />
            ) : (
              <span>No Cover</span>
            )}
          </div>
        </div>

        <div className="release-hero__info">
          <h1 className="release-title">{release.title}</h1>
          <div className="meta artist-name">{release.artist?.name || "Unknown Artist"}</div>

          <div
            className="stars"
            aria-label={`Audience score ${avg10} out of 10`}
            style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}
          >
            <StarRating value={avg10} onChange={() => {}} readOnly max={10} size={22} color="#10b981" />
            <span className="meta">
              ({Math.round(avg10)} / 10) · {count} rating{count === 1 ? "" : "s"}
            </span>
          </div>
        </div>
      </section>

      {/* -------- Rating form (submit button will be oval via CSS) -------- */}
      <AudienceRatingForm releaseId={release.id} onSubmitted={load} />

      {/* -------- Audience list -------- */}
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
                  <StarRating value={a.stars} onChange={() => {}} readOnly max={10} size={18} color="#10b981" />
                  <span className="meta">({a.stars} / 10)</span>
                </div>

                <div className="rating-time">
                  Added{" "}
                  <time dateTime={a.createdAt}>{fmtDateISO(a.createdAt)}</time>
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
