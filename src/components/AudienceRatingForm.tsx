"use client";

import { useState } from "react";
import StarRating from "@/components/StarRating";

type Props = {
  releaseId: string;
  onSubmitted?: () => void;
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
    <form
      onSubmit={onSubmit}
      className="card col rating-form"
      style={{ gap: 14, padding: 16, background: "transparent" }}
    >
      <h3 style={{ margin: 0 }}>Rate this release</h3>

      <StarRating value={stars} onChange={setStars} max={10} size={36} />

      {/* Use your site input styles instead of Tailwind placeholders */}
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name (optional)"
        className="input"
      />
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="Write a short comment (optional)"
        className="input"
        rows={3}
      />

      {msg && (
        <div
          className="card"
          style={{
            padding: "8px 12px",
            background: msg.type === "ok" ? "rgba(16,185,129,.15)" : "rgba(239,68,68,.12)",
            borderColor: "transparent",
          }}
        >
          <div
            className="meta"
            style={{ color: msg.type === "ok" ? "#8ef0c5" : "#ffb3b3" }}
          >
            {msg.text}
          </div>
        </div>
      )}

      {/* Oval submit button using your global .btn + .btn--pill */}
      <button
        type="submit"
        disabled={loading || stars < 1 || stars > 10}
        className="btn btn--pill disabled:opacity-50"
        style={{
          backgroundColor: "#10b981", // green
          alignSelf: "flex-start",
          color: "white",
          fontWeight: 700,
        }}
      >
        {loading ? "Submitting…" : "Submit"}
      </button>
    </form>
  );
}
