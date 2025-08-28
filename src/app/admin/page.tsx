"use client";
import { useState } from "react";

export default function AdminPage() {
  const [playlistId, setPlaylistId] = useState("");
  const [isMena, setIsMena] = useState(true);
  const [adminKey, setAdminKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [resp, setResp] = useState<any>(null);
  const [err, setErr] = useState<string | null>(null);

  async function runImport(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setErr(null); setResp(null);
    try {
      const res = await fetch("/api/admin/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-key": adminKey,
        },
        body: JSON.stringify({ playlistId, isMena }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Import failed");
      setResp(json);
    } catch (e: any) {
      setErr(e?.message || "Import failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="section container" style={{ display: "grid", gap: 16 }}>
      <div className="card">
        <h1 style={{ margin: 0 }}>Admin: Import Releases</h1>
        <div className="meta">Paste a Spotify <b>playlist ID</b> and click Run.</div>
      </div>

      <form className="card form-row" onSubmit={runImport}>
        <label className="meta">Admin Key</label>
        <input type="password" className="input" placeholder="Paste ADMIN_KEY" value={adminKey} onChange={(e) => setAdminKey(e.target.value)} required />

        <label className="meta">Spotify Playlist ID</label>
        <input type="text" className="input" placeholder="e.g., 37i9dQZEVXb..." value={playlistId} onChange={(e) => setPlaylistId(e.target.value.trim())} required />

        <label className="meta">
          <input type="checkbox" checked={isMena} onChange={(e) => setIsMena(e.target.checked)} /> mark as MENA
        </label>

        <button className="btn btn--primary" type="submit" disabled={loading}>
          {loading ? "Running…" : "Run Import"}
        </button>
      </form>

      {err && <div className="card" style={{ borderColor: "rgba(255,0,0,.3)" }}><div className="meta">Error: {err}</div></div>}
      {resp && <pre className="card" style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(resp, null, 2)}</pre>}
    </div>
  );
}
