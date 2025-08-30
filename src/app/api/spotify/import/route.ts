import { prisma } from "@/lib/prisma";
import { spotifyFetch } from "@/lib/spotify";
import { ReleaseType } from "@prisma/client"; // <-- import the enum

export const runtime = "nodejs";

/** Map Spotify album_type -> your Prisma enum members. 
 *  Adjust these to match exactly what's in prisma/schema.prisma.
 *  Common cases:
 *    enum ReleaseType { SINGLE ALBUM COMPILATION }   // UPPERCASE
 *    or enum ReleaseType { single album compilation } // lowercase
 */

function toReleaseType(albumType?: string | null): ReleaseType {
  const t = (albumType || "").toLowerCase();

  // If your enum is UPPERCASE (most common):
  if ((ReleaseType as any).SINGLE && (ReleaseType as any).ALBUM) {
    if (t === "single") return (ReleaseType as any).SINGLE;
    if (t === "album") return (ReleaseType as any).ALBUM;
    if (t === "compilation" && (ReleaseType as any).COMPILATION)
      return (ReleaseType as any).COMPILATION;
    // fallback
    return (ReleaseType as any).SINGLE;
  }

  // If your enum is lowercase members:
  // @ts-ignore – allow dynamic enum member access
  if (ReleaseType.single && ReleaseType.album) {
    // @ts-ignore
    if (t === "single") return ReleaseType.single;
@@ -34,8 +32,6 @@ function toReleaseType(albumType?: string | null): ReleaseType {
    // @ts-ignore
    return ReleaseType.single;
  }

  // Last resort: assume "single"
  return (Object.values(ReleaseType) as any)[0];
}

@@ -58,19 +54,31 @@ function normalize(item: any) {
}

export async function POST(req: Request) {



  try {
    const body = await req.json().catch(() => ({}));
    const { playlistId, dryRun = false } = body || {};
    if (!playlistId) return Response.json({ ok: false, error: "Missing playlistId" }, { status: 400 });

    const pl = await spotifyFetch(`/v1/playlists/${playlistId}?market=US`);
    const items = (pl?.tracks?.items ?? []).map(normalize).filter(Boolean) as ReturnType<typeof normalize>[];










    if (dryRun) return Response.json({ ok: true, previewCount: items.length, items });

    const results: any[] = [];
    for (const it of items) {
      // 1) Upsert Artist
      const artist = await prisma.artist.upsert({
        where: { id: it!.artistSpotifyId || it!.artistName },
        update: { name: it!.artistName },
@@ -81,26 +89,23 @@ export async function POST(req: Request) {
        },
      });

      // 2) Create/Update Release with proper enum
      const existing = await prisma.release.findFirst({
        where: { spotifyTrackId: it!.spotifyTrackId },
        select: { id: true },
      });

      const data = {
        artistId: artist.id,
        title: it!.title,
        type: toReleaseType(it!.albumType), // <-- enum, not string
        releaseDate: it!.releaseDate ? new Date(it!.releaseDate) : null,
        coverUrl: it!.coverUrl,
        isMena: false,
        spotifyTrackId: it!.spotifyTrackId,
        label: null,
      };

      const release = existing
        ? await prisma.release.update({ where: { id: existing.id }, data })
        : await prisma.release.create({ data: { id: crypto.randomUUID(), ...data } });




      await prisma.releaseScore.upsert({
        where: { releaseId: release.id },
