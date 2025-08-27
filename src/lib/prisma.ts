import { PrismaClient } from "@prisma/client";

const globalForPrisma = global as unknown as { prisma?: PrismaClient };

function makeClient() {
  return new PrismaClient({
    log: ["error", "warn"],
  });
}

export const prisma = globalForPrisma.prisma ?? makeClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

// optional lazy connect w/ retries
let _connecting: Promise<void> | null = null;
async function connectWithRetry(retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      await prisma.$connect();
      return;
    } catch (e) {
      await new Promise(res => setTimeout(res, 300 * (i + 1)));
    }
  }
}
if (!_connecting) _connecting = connectWithRetry();
