import { db } from "@/db";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/auth";
import { ensureSeed } from "@/lib/seed";
import { getAdminData, getTenantData } from "@/lib/server";

export const dynamic = "force-dynamic";

export async function GET() {
  await ensureSeed();
  const session = await getSession();
  if (!session) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });

  if (session.role === "admin") {
    const box = await db.select().from(tenants).where(eq(tenants.isSandbox, true)).limit(1);
    const [admin, data] = await Promise.all([
      getAdminData(),
      box[0] ? getTenantData(box[0].id) : Promise.resolve(null),
    ]);
    return Response.json({ ok: true, role: "admin", admin, data });
  }

  const data = await getTenantData(session.tenantId!);
  if (!data) return Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
  return Response.json({ ok: true, role: "tenant", data });
}