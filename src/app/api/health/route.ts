import { db, getDatabaseInfo, initDb } from "@/db";
import { sql } from "drizzle-orm";
import { ensureSeed } from "@/lib/seed";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    await initDb();
    await db.execute(sql`select 1`);
    // Idempotent demo seeding (no-op once data exists)
    await ensureSeed();
    const info = await getDatabaseInfo();
    return Response.json(
      { ok: true, db: info.mode, configured: info.configured, timestamp: new Date().toISOString() },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err) {
    return Response.json(
      { ok: false, error: (err as Error).message ?? "database unavailable" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
