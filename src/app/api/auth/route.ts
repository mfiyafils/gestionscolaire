import { db } from "@/db";
import { tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createSession, destroySession, verifyAdmin, verifyPassword } from "@/lib/auth";
import { ensureSeed } from "@/lib/seed";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    await ensureSeed();
    const body = await req.json().catch(() => ({}));
    const action = body.action as string;

    if (action === "logout") {
      await destroySession();
      return Response.json({ ok: true });
    }

    if (action === "login") {
      const email = String(body.email ?? "").trim().toLowerCase();
      const password = String(body.password ?? "");
      if (!email || !password) return Response.json({ ok: false, error: "invalid" }, { status: 400 });

      if (verifyAdmin(email, password)) {
        await createSession("admin", null);
        return Response.json({ ok: true, role: "admin" });
      }
      const rows = await db.select().from(tenants).where(eq(tenants.email, email)).limit(1);
      const t = rows[0];
      if (t && !t.isSandbox && t.status === "active" && verifyPassword(password, t.passwordHash)) {
        await createSession("tenant", t.id);
        return Response.json({ ok: true, role: "tenant" });
      }
      return Response.json({ ok: false, error: "invalid" }, { status: 401 });
    }

    return Response.json({ ok: false, error: "unknown" }, { status: 400 });
  } catch (err) {
    console.error("auth error", err);
    return Response.json({ ok: false, error: "server" }, { status: 500 });
  }
}