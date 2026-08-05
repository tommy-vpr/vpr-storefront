import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

/**
 * Prisma client singleton for the storefront-local database.
 *
 * Prisma 7 no longer reads the connection string from schema.prisma — the
 * client takes a driver adapter instead. DATABASE_URL is the pooled
 * connection (port 6543 on Supabase); migrations use DIRECT_URL via
 * prisma.config.ts.
 *
 * The globalThis guard exists because Next.js dev mode hot-reloads modules on
 * every edit; without it each reload opens a new pool until Postgres refuses
 * connections. In production the module evaluates once and the guard is inert.
 */

const globalForPrisma = globalThis as unknown as {
  storefrontPrisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = new pg.Pool({
    connectionString,
    // Local Docker Postgres has no TLS; Supabase does. Enabling SSL only when
    // the URL isn't localhost keeps one config working for both.
    ssl: connectionString.includes("localhost")
      ? undefined
      : { rejectUnauthorized: false },
  });

  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

export const prisma = globalForPrisma.storefrontPrisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.storefrontPrisma = prisma;
}
