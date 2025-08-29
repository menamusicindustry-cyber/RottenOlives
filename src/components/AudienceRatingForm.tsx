"use client";

import { useState } from "react";
import StarRating from "@/components/StarRating";

type Props = {
  releaseId: string;
  onSubmitted?: () => void; // optional: e.g., to refresh data
};

export default function AudienceRatingForm({ releaseId, onSubmitted }: Props) {
  const [stars, setStars] = useState<number>(0);
  const [name, setName] = useState<string>("");
  const [comment, setComment] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setOkMsg(null);

    try {
      const res = await fetch("/api/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ releaseId, stars, comment, name }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Failed to submit rating");

      setOkMsg("Thanks for rating!");
      setStars(0);
      setComment("");
      // optional refresh of the page/section
      if (onSubmitted) onSubmitted();
      else window.location.reload();
    } catch (err: any) {
      setErrorMsg(String(err?.message || err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card col" style={{ gap: 12 }}>
      <div className="text-sm font-medium">Your Rating</div>
      <StarRating value={stars} onChange={setStars} max={10} />

      <label className="text-sm font-medium">Your Name (optional)</label>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        className="border rounded px-3 py-2"
      />

      <label className="text-sm font-medium">Comment (optional)</label>
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="What did you think?"
        className="border rounded px-3 py-2"
        rows={3}
      />

      {errorMsg && <div className="text-red-600 text-sm">{errorMsg}</div>}
      {okMsg && <div className="text-green-700 text-sm">{okMsg}</div>}

      <button
        type="submit"
        disabled={loading || stars < 1 || stars > 10}
        className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
      >
        {loading ? "Submitting…" : "Submit Rating"}
      </button>

      <div className="meta text-xs opacity-70">
        Tip: You can rate from 1 to 10 stars. Your API already validates this range.
      </div>
    </form>
  );
}
