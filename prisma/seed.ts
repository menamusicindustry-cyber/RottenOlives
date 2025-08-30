import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const genres = ['Arabic Pop','Shaabi','Khaleeji','Rap','Indie','Electronic'];
  await Promise.all(genres.map(name => prisma.genre.upsert({ where:{name}, update:{}, create:{name} })));
  const artist = await prisma.artist.create({ data:{ name:'Ahmar-احمر', country:'EG' } });
  const release = await prisma.release.create({ data:{ title:'Vol. 1 وقت المذكرة', type:'ALBUM', artistId:artist.id, isMena:true } });
  await prisma.releaseScore.create({ data:{ releaseId: release.id, audienceScore:75, audienceCount:200 } });
  const user = await prisma.user.create({ data:{ email:'demo@local', name:'Demo User' } });
  await prisma.audienceRating.create({ data:{ releaseId: release.id, userId: user.id, stars:8, comment:'On repeat since morning.' } });
  console.log('Seeded.');
