import { db } from "@/db";
import { updates } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { ensureSeed } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeed();
  const [latest] = await db
    .select()
    .from(updates)
    .where(eq(updates.status, "deployed"))
    .orderBy(desc(updates.deployedAt))
    .limit(1);

  return Response.json(
    {
      ok: true,
      latest: latest ?? null,
      syncedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
      },
    }
  );
}

/** Release endpoint — strictly Super Admin session only (no admin access key/token). */
export async function POST(req: Request) {
  await ensureSeed();
  const session = await getSession();

  if (session?.role !== "admin") {
    return Response.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const version = String(body.version ?? "").trim().slice(0, 20);
  const titleFr = String(body.titleFr ?? body.title ?? "").trim().slice(0, 200);
  const titleEn = String(body.titleEn ?? titleFr).trim().slice(0, 200);
  const notesFr = String(body.notesFr ?? body.notes ?? "").trim().slice(0, 2000);
  const notesEn = String(body.notesEn ?? notesFr).trim().slice(0, 2000);
  const status = body.status === "draft" ? "draft" : "deployed";

  if (!version || !titleFr) {
    return Response.json({ ok: false, error: "version and titleFr required" }, { status: 400 });
  }

  const [created] = await db
    .insert(updates)
    .values({
      version,
      titleFr,
      titleEn,
      notesFr,
      notesEn,
      status,
      deployedAt: status === "deployed" ? new Date() : null,
    })
    .returning();

  return Response.json({ ok: true, update: created });
}
