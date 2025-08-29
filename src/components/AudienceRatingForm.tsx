"use client";

import { useState } from "react";
import StarRating from "@/components/StarRating";

type Props = {
  releaseId: string;
  onSubmitted?: () => void; // optional: refresh callback
};

export default function AudienceRatingForm({ releaseId, onSubmitted }: Props) {
  const [stars, setStars] = useState<number>(0);
  const [name, setName] = useState<string>("");
  const [comment, setComment] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (stars < 1 || stars > 10) {
      setMsg({ type: "err", text: "Please pick 1–10 stars." });
      return;
    }
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ releaseId, stars, comment, name }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to submit rating");

      setMsg({ type: "ok", text: "Thanks for rating!" });
      setComment("");
      setStars(0);
      if (onSubmitted) onSubmitted();
    } catch (err: any) {
      setMsg({ type: "err", text: String(err?.message || err) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card col" style={{ gap: 14, padding: 16, background: "transparent" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h3 style={{ margin: 0 }}>Rate this release</h3>
        <div className="meta">1–10 stars</div>
      </div>

      <StarRating value={stars} onChange={setStars} max={10} size={34} color="#10b981" />

      <div className="grid" style={{ gap: 10 }}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name (optional)"
          className="border rounded px-3 py-2"
        />
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Write a short comment (optional)"
          className="border rounded px-3 py-2"
          rows={3}
        />
      </div>

      {msg && (
        <div
          className={`text-sm rounded px-3 py-2 ${
            msg.type === "ok" ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"
          }`}
        >
          {msg.text}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || stars < 1 || stars > 10}
        className="px-4 py-2 rounded text-white disabled:opacity-50"
        style={{ backgroundColor: "#10b981" }}
      >
        {loading ? "Submitting…" : "Submit rating"}
      </button>
    </form>
  );
}
