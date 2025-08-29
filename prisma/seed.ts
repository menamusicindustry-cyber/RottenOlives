import { PrismaClient, ReleaseType } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const genreNames = ["Arabic Pop", "Shaabi", "Khaleeji", "Rap", "Indie", "Electronic"];

  // If Genre.name isn't unique in schema, this still works:
  for (const name of genreNames) {
    const exists = await prisma.genre.findFirst({ where: { name } });
    if (!exists) await prisma.genre.create({ data: { name } });
  }

  // Grab an ALBUM enum value regardless of casing in your schema
  const ALBUM =
    // @ts-ignore
    (ReleaseType as any).ALBUM ?? (ReleaseType as any).album ?? Object.values(ReleaseType)[0];

  const artist = await prisma.artist.create({
    data: { id: crypto.randomUUID(), name: "Ahmar-احمر", country: "EG" },
  });

  const release = await prisma.release.create({
    data: {
      id: crypto.randomUUID(),
      artistId: artist.id,
      title: "Vol. 1 وقت المذكرة",
      type: ALBUM as ReleaseType,
      isMena: true,
      releaseDate: null,
      label: null,
      coverUrl: null,
      spotifyTrackId: null, // keep null if not a Spotify import
    },
  });

  await prisma.releaseScore.create({
    data: { releaseId: release.id, audienceScore: 75, audienceCount: 200 },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
