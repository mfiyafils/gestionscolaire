import { drizzle } from "drizzle-orm/node-postgres";
import { Pool, types as pgTypes } from "pg";

/**
 * Deployment-resilient PostgreSQL connection (Render / Vercel / VPS / local).
 *
 * - A `pg.Pool` never validates the connection string at construction time —
 * it only connects on the first query. All of our routes are `force-dynamic`,
 * so no query runs while Render/Next builds the app. The build can therefore
 * never fail because `DATABASE_URL` is missing (secure placeholder fallback).
 * - At runtime without `DATABASE_URL`, queries fail cleanly and are caught by
 * the routes (e.g. `/api/health` answers `{ ok: false }` instead of crashing).
 * - Set `DATABASE_URL` (Render PostgreSQL / Neon / Supabase / local Postgres)
 * to activate full persistence. Optional `DATABASE_SSL=disable` for local ones.
 */

pgTypes.setTypeParser(20, "text", (v) => (v === null ? null : Number(v))); // bigint → number

const databaseUrl = process.env.DATABASE_URL;

const isLocal = (url: string) =>
  url.includes("127.0.0.1") || url.includes("localhost") || url.includes("sslmode=disable");

const sslDisabled =
  process.env.DATABASE_SSL === "disable" || process.env.DATABASE_SSL === "false" || process.env.PGSSLMODE === "disable";

const connectionString = databaseUrl ?? "postgresql://postgres:postgres@127.0.0.1:5432/scolaria_placeholder";

const globalForDb = globalThis as typeof globalThis & {
  __scolariaPool?: Pool;
};

export const pool =
  globalForDb.__scolariaPool ??
  new Pool({
    connectionString,
    max: 5,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 8000,
    ssl: isLocal(connectionString) || sslDisabled ? undefined : { rejectUnauthorized: false },
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__scolariaPool = pool;
}

export const db = drizzle(pool);

export const dbConfigured = Boolean(databaseUrl);
