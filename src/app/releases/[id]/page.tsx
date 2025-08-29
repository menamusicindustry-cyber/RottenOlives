"use client";

import { useEffect, useState } from "react";
import AudienceRatingForm from "@/components/AudienceRatingForm";
import StarRating from "@/components/StarRating"; // for read-only display below

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
  coverUrl?: string | null;
  // add any other fields you already had…
  audience?: AudienceItem[];
  audienceScore?: number | null;
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
      // If your app already has a release API route, keep using it here.
      // Adjust the URL if needed (e.g., `/api/release?id=${params.id}`)
      const res = await fetch(`/api/release?id=${params.id}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to load release");
      setRelease(json.release || json); // depending on your API shape
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

  if (loading) {
    return <div className="section"><div className="meta">Loading…</div></div>;
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
      <header className="card col" style={{ alignItems: "center", gap: 16 }}>
        {release.coverUrl && (
          <img
            src={release.coverUrl}
            alt={release.title}
            width={140}
            height={140}
            style={{ borderRadius: 12, objectFit: "cover" }}
          />
        )}
        <div style={{ display: "grid", gap: 6 }}>
          <h2 style={{ margin: 0 }}>{release.title}</h2>
          <div className="meta">by {release.artist?.name}</div>
          <div className="meta">
            Audience score: {Math.round((release.audienceScore ?? 0))} / 100 •{" "}
            {release.audienceCount ?? 0} ratings
          </div>
        </div>
      </header>

      {/* ⭐ NEW: star-based rating form */}
      <AudienceRatingForm releaseId={release.id} onSubmitted={load} />

      <section className="card col">
        <h3 style={{ marginTop: 0 }}>Audience Ratings</h3>
        <div className="grid" style={{ gap: 12 }}>
          {!release.audience?.length ? (
            <div className="card col"><div className="meta">No audience ratings yet.</div></div>
          ) : (
            release.audience.map((a) => (
              <div key={a.id} className="card col">
                <div className="meta">{a.user?.name || a.user?.email || "Guest"}</div>
                <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
                  {/* Read-only stars to visualize the value */}
                  <StarRating value={a.stars} onChange={() => {}} readOnly max={10} size={18} />
                  <span className="meta">({a.stars} / 10)</span>
                </div>
                {a.comment && <div className="meta" style={{ marginTop: 6 }}>{a.comment}</div>}
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
