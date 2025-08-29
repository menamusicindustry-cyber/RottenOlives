// app/admin/page.tsx  (keep your styling, just the handler)
"use client";
import { useState } from "react";

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [playlistInput, setPlaylistInput] = useState("");
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function onImport(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const res = await fetch("/api/admin/import-playlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, playlistInput }),
    });

    const data = await res.json();
    setResult({ ok: res.ok, ...data });
    setLoading(false);
  }

  return (
    <main className="max-w-xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Import Releases from Spotify Playlist</h1>
      <form onSubmit={onImport} className="space-y-3">
        <input
          type="password"
          placeholder="Admin password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded p-2"
        />
        <input
          placeholder="Playlist URL / URI / ID"
          value={playlistInput}
          onChange={(e) => setPlaylistInput(e.target.value)}
          className="w-full border rounded p-2"
        />
        <button
          disabled={loading}
          className="px-4 py-2 rounded bg-black text-white disabled:opacity-50"
        >
          {loading ? "Importing…" : "Import"}
        </button>
      </form>

      {result && (
        <pre className="bg-gray-100 p-3 rounded text-sm overflow-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </main>
  );
}
