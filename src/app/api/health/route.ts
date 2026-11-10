import { db } from "@/db";
import { sql } from "drizzle-orm";
import { ensureSeed } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.execute(sql`select 1`);
    // Idempotent demo seeding (no-op once tenants exist or before schema push)
    await ensureSeed();
    return Response.json({ ok: true, db: true });
  } catch {
    // Never hard-fail the healthcheck: the app itself serves, DB just not wired.
    return Response.json({ ok: true, db: false, mode: "fallback" });
  }
}