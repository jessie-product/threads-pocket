import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig, Pool } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  neonPool?: Pool;
};

const pool =
  globalForPrisma.neonPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

const adapter = new PrismaNeon(pool);

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.neonPool = pool;
}

