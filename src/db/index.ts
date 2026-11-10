import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";
import { BOOTSTRAP_SQL } from "./bootstrap";

export type Database = NodePgDatabase<Record<string, never>>;

export type DbMode = "postgres" | "embedded";

const globalForDb = globalThis as typeof globalThis & {
  __scolariaDb?: Database;
  __scolariaDbInit?: Promise<Database>;
  __scolariaDbMode?: DbMode;
  __scolariaDbError?: string;
};

/**
 * Resolves a database connection.
 * - If DATABASE_URL is provided → PostgreSQL (Render / Neon / Supabase / local).
 * - Otherwise → embedded PGlite (persistent local folder, in-memory fallback),
 *   so a missing environment variable can never break the build or the boot.
 */
async function createDatabase(): Promise<Database> {
  const url = (process.env.DATABASE_URL ?? "").trim();

  if (url) {
    const { drizzle } = await import("drizzle-orm/node-postgres");
    const { Pool } = await import("pg");
    const pool = new Pool({
      connectionString: url,
      ssl: /render\.com|neon\.tech|supabase|amazonaws|azure/i.test(url) ? { rejectUnauthorized: false } : undefined,
      max: Number(process.env.PGPOOL_MAX ?? 5),
      connectionTimeoutMillis: 15000,
    });
    const instance = drizzle(pool) as unknown as Database;
    await bootstrap(instance);
    globalForDb.__scolariaDbMode = "postgres";
    return instance;
  }

  // ── Embedded fallback (no DATABASE_URL) ──────────────────────────
  const { PGlite } = await import("@electric-sql/pglite");
  const { drizzle } = await import("drizzle-orm/pglite");

  const { mkdir } = await import("node:fs/promises");
  const { dirname, resolve } = await import("node:path");
  const dataDir = resolve(process.cwd(), (process.env.PGLITE_DATA_DIR ?? ".data/pglite").trim() || ".data/pglite");

  let client: InstanceType<typeof PGlite>;
  try {
    // PGlite doesn't create nested parents itself → do it before opening.
    await mkdir(dirname(dataDir), { recursive: true });
    await mkdir(dataDir, { recursive: true });
    client = new PGlite(dataDir);
    await client.waitReady;
  } catch (err) {
    console.warn("[db] embedded storage unavailable, using memory mode:", (err as Error).message?.slice(0, 140));
    client = new PGlite("memory://");
    await client.waitReady;
  }

  const instance = drizzle(client) as unknown as Database;
  await bootstrap(instance);
  globalForDb.__scolariaDbMode = "embedded";
  return instance;
}

async function bootstrap(instance: Database) {
  for (const statement of BOOTSTRAP_SQL) {
    try {
      await instance.execute(sql.raw(statement));
    } catch (err) {
      // Table/column already exists or a legacy constraint name differs: never block boot.
      console.warn("[db] bootstrap statement skipped:", (err as Error).message?.slice(0, 160));
    }
  }
}

/** Must be awaited once before any query (handled by ensureSeed / API routes). */
export async function initDb(): Promise<Database> {
  if (globalForDb.__scolariaDb) return globalForDb.__scolariaDb;
  if (!globalForDb.__scolariaDbInit) {
    globalForDb.__scolariaDbInit = createDatabase()
      .then((db) => {
        globalForDb.__scolariaDb = db;
        return db;
      })
      .catch((err) => {
        globalForDb.__scolariaDbError = (err as Error).message;
        globalForDb.__scolariaDbInit = undefined;
        throw err;
      });
  }
  return globalForDb.__scolariaDbInit;
}

export function getDbMode(): DbMode | "unknown" {
  return globalForDb.__scolariaDbMode ?? "unknown";
}

export async function getDatabaseInfo() {
  const mode = globalForDb.__scolariaDbMode ?? ((process.env.DATABASE_URL ?? "").trim() ? "postgres" : "embedded");
  return {
    mode,
    configured: Boolean((process.env.DATABASE_URL ?? "").trim()),
    error: globalForDb.__scolariaDbError ?? null,
  };
}

/**
 * Lazy proxy so importing this module never throws (build-safe) while every
 * query still reaches the resolved driver once initDb() has completed.
 */
export const db = new Proxy({} as Database, {
  get(_target, prop) {
    const instance = globalForDb.__scolariaDb;
    if (!instance) {
      throw new Error("Database not initialised yet — await ensureSeed()/initDb() first.");
    }
    const value = (instance as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(instance) : value;
  },
});

/** Kept for backwards compatibility with scripts performing raw SQL. */
export const pool = {
  query: async (text: string) => {
    const instance = await initDb();
    return instance.execute(sql.raw(text));
  },
};
