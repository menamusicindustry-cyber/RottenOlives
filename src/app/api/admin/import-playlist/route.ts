// app/api/admin/import-playlist/route.ts
import { NextResponse } from "next/server";
import { extractPlaylistId } from "@/src/lib/spotify";
import { importPlaylistToReleases } from "@/src/lib/importPlaylist";

export async function POST(req: Request) {
  try {
    const { password, playlistInput } = await req.json();

    if (password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (!playlistInput) {
      return NextResponse.json({ error: "Missing playlistInput" }, { status: 400 });
    }

    const playlistId = extractPlaylistId(playlistInput);
    const { imported, albumCount } = await importPlaylistToReleases(playlistId);

    return NextResponse.json({ playlistId, albumCount, imported });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
