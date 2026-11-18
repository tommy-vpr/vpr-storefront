import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import {ManagedPool} from "./database-pool";

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
 * connections. Production also reuses the client within each warm server instance.
 */

const globalForPrisma = globalThis as unknown as {
  storefrontPrisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = new ManagedPool({
    connectionString,
    application_name: 'vpr-prisma',
    max: 2,
    min: 0,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
    // Local Docker Postgres has no TLS; Supabase does. Enabling SSL only when
    // the URL isn't localhost keeps one config working for both.
    ssl: connectionString.includes("localhost")
      ? undefined
      : { rejectUnauthorized: false },
  });

  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

export const prisma = globalForPrisma.storefrontPrisma ?? createPrismaClient();

globalForPrisma.storefrontPrisma = prisma;
