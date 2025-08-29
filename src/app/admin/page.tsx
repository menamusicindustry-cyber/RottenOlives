"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type PreviewItem = {
  spotifyTrackId: string;
  title: string;
  artistSpotifyId: string | null;
  artistName: string;
  albumType: string | null;
  releaseDate: string | null;
  coverUrl: string | null;
  previewUrl: string | null;
};

export default function AdminPage() {
  // Prefill with Spotify’s public test playlist (works for most tokens)
  const [playlistId, setPlaylistId] = useState("3cEYpjA9oz9GiPac4AsH4n");
  const [market, setMarket] = useState("US");
  const [loading, setLoading] = useState<"debug" | "preview" | "import" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ name?: string; total?: number; items: PreviewItem[] } | null>(null);
  const [importResult, setImportResult] = useState<{ imported: number; items: { releaseId: string; title: string; artist: string }[] } | null>(null);

  // Simple in-page log
  const [logs, setLogs] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  function log(line: string) {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${line}`]);
  }
  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  const origin = useMemo(() => (typeof window !== "undefined" ? window.location.origin : ""), []);

  async function doDebug() {
    if (!origin) return;
    setLoading("debug");
    setError(null);
    setImportResult(null);
    setPreview(null);
    try {
      const url = `${origin}/api/spotify/debug`;
      log(`GET ${url}`);
      const r = await fetch(url, { cache: "no-store" });
      const j = await r.json();
      log(`debug → ${r.status} ${JSON.stringify(j)}`);
      if (!r.ok || j.ok === false) throw new Error(j?.error || "Debug failed");
      alert(`Debug OK:\n${JSON.stringify(j, null, 2)}`);
    } catch (e: any) {
      const msg = String(e?.message || e);
      setError(msg);
      log(`debug ERROR → ${msg}`);
    } finally {
      setLoading(null);
    }
  }

  async function doPreview() {
    if (!origin) return;
    setLoading("preview");
    setError(null);
    setImportResult(null);
    try {
      const url = `${origin}/api/spotify/import/preview?playlistId=${encodeURIComponent(
        playlistId
      )}${market ? `&market=${encodeURIComponent(market)}` : ""}`;
      log(`GET ${url}`);
      const r = await fetch(url, { cache: "no-store" });
      const j = await r.json();
      log(`preview → ${r.status} ${JSON.stringify(j).slice(0, 500)}${JSON.stringify(j).length > 500 ? "…" : ""}`);
      if (!r.ok || j.ok === false) throw new Error(j?.error || "Preview failed");
      setPreview({ name: j.playlist?.name, total: j.playlist?.total, items: j.items || [] });
    } catch (e: any) {
      const msg = String(e?.message || e);
      setError(msg);
      setPreview(null);
      log(`preview ERROR → ${msg}`);
    } finally {
      setLoading(null);
    }
  }

  async function doImport() {
    if (!origin) return;
    setLoading("import");
    setError(null);
    setImportResult(null);
    try {
      const url = `${origin}/api/spotify/import`;
      log(`POST ${url} body={"playlistId":"${playlistId}","dryRun":false}`);
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistId, dryRun: false }),
      });
      const j = await r.json();
      log(`import → ${r.status} ${JSON.stringify(j).slice(0, 500)}${JSON.stringify(j).length > 500 ? "…" : ""}`);
      if (!r.ok || j.ok === false) throw new Error(j?.error || "Import failed");
      setImportResult({ imported: j.imported || 0, items: j.items || [] });
    } catch (e: any) {
      const msg = String(e?.message || e);
      setError(msg);
      log(`import ERROR → ${msg}`);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="section" style={{ display: "grid", gap: 16 }}>
      <header className="card col" style={{ gap: 8 }}>
        <h2 style={{ margin: 0 }}>Admin – Spotify Import</h2>
        <div className="meta">Enter a Spotify <strong>playlist ID</strong>, preview items, then import.</div>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void doPreview();
        }}
        className="card col"
        style={{ gap: 12, padding: 16 }}
      >
        <label className="text-sm font-medium">Playlist ID</label>
        <input
          value={playlistId}
          onChange={(e) => setPlaylistId(e.target.value.trim())}
          placeholder="e.g. 3cEYpjA9oz9GiPac4AsH4n"
          className="border rounded px-3 py-2"
        />

        <label className="text-sm font-medium">Market (optional)</label>
        <input
          value={market}
          onChange={(e) => setMarket(e.target.value.trim())}
          placeholder="US"
          className="border rounded px-3 py-2"
        />

        {error && <div className="text-sm rounded px-3 py-2 bg-red-50 text-red-700">{error}</div>}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={doDebug}
            disabled={!!loading}
            className="px-4 py-2 rounded-full text-white disabled:opacity-50"
            style={{ backgroundColor: "#374151" }}
          >
            {loading === "debug" ? "Testing…" : "Test Debug"}
          </button>

          <button
            type="submit"
            disabled={!playlistId || !!loading}
            className="px-4 py-2 rounded-full text-white disabled:opacity-50"
            style={{ backgroundColor: "#111827" }}
          >
            {loading === "preview" ? "Previewing…" : "Preview"}
          </button>

          <button
            type="button"
            onClick={doImport}
            disabled={!playlistId || !!loading}
            className="px-4 py-2 rounded-full text-white disabled:opacity-50"
            style={{ backgroundColor: "#10b981" }}
          >
            {loading === "import" ? "Importing…" : "Import"}
          </button>
        </div>
      </form>

      <section className="card" style={{ padding: 0 }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(280px, 1fr) 2fr", gap: 0 }}>
          {/* Preview panel */}
          <div className="col" style={{ gap: 12, padding: 16, borderRight: "1px solid #eee" }}>
            <h3 style={{ margin: 0 }}>Preview</h3>
            {preview ? (
              <>
                <div className="meta" style={{ marginBottom: 6 }}>
                  {preview.name || "Playlist"} • {preview.total ?? preview.items.length} item(s)
                </div>
                <div className="grid" style={{ gap: 8 }}>
                  {preview.items.map((it) => (
                    <div
                      key={it.spotifyTrackId}
                      className="card"
                      style={{ display: "grid", gridTemplateColumns: "56px 1fr", gap: 12, alignItems: "center" }}
                    >
                      {it.coverUrl ? (
                        <img
                          src={it.coverUrl}
                          alt={it.title}
                          width={56}
                          height={56}
                          style={{ borderRadius: 8, objectFit: "cover" }}
                        />
                      ) : (
                        <div style={{ width: 56, height: 56, borderRadius: 8, background: "#f3f4f6" }} />
                      )}
                      <div className="col" style={{ gap: 2 }}>
                        <div style={{ fontWeight: 600 }}>{it.title}</div>
                        <div className="meta">
                          {it.artistName} • {it.albumType || "single"}
                          {it.releaseDate ? ` • ${it.releaseDate}` : ""}
                        </div>
                        <div className="meta" style={{ wordBreak: "break-all" }}>
                          track: {it.spotifyTrackId}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="meta">No preview yet.</div>
            )}
          </div>

          {/* Logs panel */}
          <div className="col" style={{ gap: 8, padding: 16 }}>
            <h3 style={{ margin: 0 }}>Logs</h3>
            <div
              ref={logRef}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: 8,
                height: 240,
                overflow: "auto",
                fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                fontSize: 12,
                padding: 8,
                background: "#fafafa",
                whiteSpace: "pre-wrap",
              }}
            >
              {logs.length ? logs.join("\n") : "No logs yet. Actions and responses will appear here."}
            </div>
          </div>
        </div>
      </section>

      {importResult && (
        <section className="card col" style={{ gap: 8 }}>
          <h3 style={{ margin: 0 }}>Import result</h3>
          <div className="meta">Imported: {importResult.imported}</div>
          <div className="grid" style={{ gap: 6 }}>
            {importResult.items.map((x) => (
              <div key={x.releaseId} className="meta">
                <strong>{x.title}</strong> — {x.artist} <span className="opacity-60">({x.releaseId})</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
