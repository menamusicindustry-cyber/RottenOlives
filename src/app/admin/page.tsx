"use client";

import { useState } from "react";

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
  const [playlistId, setPlaylistId] = useState("");
  const [market, setMarket] = useState("US");
  const [loading, setLoading] = useState<"preview" | "import" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ name?: string; total?: number; items: PreviewItem[] } | null>(null);
  const [importResult, setImportResult] = useState<{ imported: number; items: { releaseId: string; title: string; artist: string }[] } | null>(null);

  async function doPreview() {
    setLoading("preview");
    setError(null);
    setImportResult(null);
    try {
      const url = `/api/spotify/import/preview?playlistId=${encodeURIComponent(playlistId)}${market ? `&market=${market}` : ""}`;
      const r = await fetch(url, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok || j.ok === false) throw new Error(j?.error || "Preview failed");
      setPreview({ name: j.playlist?.name, total: j.playlist?.total, items: j.items || [] });
    } catch (e: any) {
      setError(String(e?.message || e));
      setPreview(null);
    } finally {
      setLoading(null);
    }
  }

  async function doImport() {
    setLoading("import");
    setError(null);
    setImportResult(null);
    try {
      const r = await fetch("/api/spotify/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playlistId, dryRun: false }),
      });
      const j = await r.json();
      if (!r.ok || j.ok === false) throw new Error(j?.error || "Import failed");
      setImportResult({ imported: j.imported || 0, items: j.items || [] });
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="section" style={{ display: "grid", gap: 16 }}>
      <header className="card col" style={{ gap: 8 }}>
        <h2 style={{ margin: 0 }}>Admin – Spotify Import</h2>
        <div className="meta">Paste a Spotify <strong>playlist ID</strong> and preview or import releases.</div>
      </header>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          doPreview();
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

        {error && (
          <div className="text-sm rounded px-3 py-2 bg-red-50 text-red-700">{error}</div>
        )}

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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

      {preview && (
        <section className="card col" style={{ gap: 12 }}>
          <h3 style={{ margin: 0 }}>
            Preview: {preview.name || "Playlist"}{" "}
            <span className="meta">({preview.total ?? preview.items.length} items)</span>
          </h3>

          {!preview.items.length ? (
            <div className="meta">No items found.</div>
          ) : (
            <div className="grid" style={{ gap: 8 }}>
              {preview.items.map((it) => (
                <div key={it.spotifyTrackId} className="card" style={{ display: "grid", gridTemplateColumns: "56px 1fr", gap: 12, alignItems: "center" }}>
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
          )}
        </section>
      )}

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
