import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required");
}

// Bases locales (sandbox, docker) : pas de SSL. Bases hébergées (Vercel Postgres,
// Neon, Supabase, Render...) : SSL activé automatiquement.
const isLocal = /localhost|127\.0\.0\.1|@db:|@postgres:/i.test(databaseUrl);
const sslDisabled = /sslmode=disable/i.test(databaseUrl) || process.env.DATABASE_SSL === "false";

const globalForDb = globalThis as typeof globalThis & {
  __gestionScolairePool?: Pool;
};

export const pool =
  globalForDb.__gestionScolairePool ??
  new Pool({
    connectionString: databaseUrl,
    ...(isLocal || sslDisabled ? {} : { ssl: { rejectUnauthorized: false } }),
    max: Number(process.env.PG_POOL_MAX ?? (process.env.VERCEL ? 3 : 10)),
  });

// Réutilisation du pool entre les rechargements (dev) et les invocations serverless.
globalForDb.__gestionScolairePool = pool;

export const db = drizzle(pool, { schema });
