"use client";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="section card">
      <h3 style={{ marginTop: 0 }}>Something went wrong</h3>
      <div className="meta">{error?.message || "Unknown error"} {error?.digest ? `(digest: ${error.digest})` : ""}</div>
      <button className="btn" style={{ marginTop: 12 }} onClick={() => reset()}>
        Try again
      </button>
    </div>
  );
}
