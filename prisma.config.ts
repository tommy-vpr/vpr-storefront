import path from "node:path";
import dotenv from "dotenv";
import { defineConfig, env } from "prisma/config";

// Next.js loads .env.local automatically at runtime, but the Prisma CLI does
// not — it needs this explicit load or migrations run against undefined.
dotenv.config({ path: path.resolve(__dirname, ".env.local"), quiet: true });

// Fail loud rather than silently migrating nothing.
if (!process.env.DIRECT_URL) {
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
    url: env("DIRECT_URL"),
  },
});
