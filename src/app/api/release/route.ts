// src/app/api/release/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const release = await prisma.release.findUnique({
      where: { id },
      include: {
        artist: true,
        // Correct relation names from Prisma schema:
        score: true, // was "scores"
        ratings: {
          include: { user: true },
          orderBy: { createdAt: "desc" as const },
        },
        // optional: surface genres directly
        genres: {
          include: { genre: true },
        },
      },
    });

    if (!release) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Reshape to preserve previous API response keys:
    const { ratings, score, genres, ...rest } = release;
    return NextResponse.json({
      ...rest,
      artist: release.artist,
      // keep the old keys expected by the frontend
      audience: ratings,
      scores: score,
      genres: genres?.map((g) => g.genre) ?? [],
    });
  } catch (err: any) {
    console.error("GET /api/release error:", err);
    return NextResponse.json(
      { error: err?.message ?? "Server error" },
      { status: 500 }
    );
  }
}
