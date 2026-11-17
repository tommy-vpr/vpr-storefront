import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { defineConfig, env } from "prisma/config";

// Next.js loads .env.local automatically at runtime, but the Prisma CLI does
// not — it needs this explicit load or migrations run against undefined.
dotenv.config({ path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".env.local"), quiet: true });

// Fail loud rather than silently migrating nothing.
// `prisma generate` (postinstall) needs no database; only migrations do.
if (!process.env.DIRECT_URL && !process.argv.includes("generate")) {
  throw new Error(
    "DIRECT_URL is not set. Prisma migrations need a direct Postgres " +
      "connection (port 5432 on Supabase, NOT the 6543 pooler). " +
      "Check .env.local.",
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    // DIRECT_URL: DDL and pgBouncer transaction mode don't mix.
    url: process.env.DIRECT_URL ? env("DIRECT_URL") : "postgresql://localhost:5432/unused",
  },
});
