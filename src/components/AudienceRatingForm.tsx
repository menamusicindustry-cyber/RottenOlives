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
      className="card col"
      style={{ gap: 14, padding: 16, background: "transparent" }}
    >
      <h3 style={{ margin: 0 }}>Rate this release</h3>

      <StarRating value={stars} onChange={setStars} max={10} size={36} />

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
        className="px-5 py-2 rounded-full disabled:opacity-50"
        style={{
          backgroundColor: "#10b981",
          alignSelf: "flex-start",
        }}
      >
        <span style={{ color: "white", fontWeight: 700 }}>
          {loading ? "Submitting…" : "Submit"}
        </span>
      </button>
    </form>
  );
}
