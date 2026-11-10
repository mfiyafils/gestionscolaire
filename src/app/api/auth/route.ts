import { db } from "@/db";
import { classes, tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
import {
  createSession,
  destroySession,
  hashPassword,
  isPlatformAdminEmail,
  isPrincipalAdminEmail,
  verifyAdmin,
  verifyPassword,
} from "@/lib/auth";
import { ensureSeed, guaranteePrincipalAdmin } from "@/lib/seed";
import { BLOCKS, STRUCTURE, parseStructures, serializeStructures } from "@/lib/core";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const str = (v: unknown, max = 160) => String(v ?? "").trim().slice(0, max);

export async function POST(req: Request) {
  await ensureSeed();
  const body = await req.json().catch(() => ({}));
  const action = body.action as string;

  if (action === "logout") {
    await destroySession();
    return Response.json({ ok: true });
  }

  /* ── Création de compte : devient automatiquement Administrateur / Direction ── */
  if (action === "register") {
    const name = str(body.name, 120);
    const email = str(body.email, 160).toLowerCase();
    const password = String(body.password ?? "");
    const phone = str(body.phone, 30);
    const structures = parseStructures(
      Array.isArray(body.structures) ? (body.structures as string[]) : undefined
    );

    if (name.length < 2) return Response.json({ ok: false, error: "invalidName" }, { status: 400 });
    if (!EMAIL_RE.test(email)) return Response.json({ ok: false, error: "invalidEmail" }, { status: 400 });
    if (password.length < 6) return Response.json({ ok: false, error: "weakPassword" }, { status: 400 });

    // The reserved principal administrator address can never be registered as a school.
    if (await isPlatformAdminEmail(email)) {
      return Response.json({ ok: false, error: "reservedEmail" }, { status: 409 });
    }

    const existing = await db
      .select({ id: tenants.id })
      .from(tenants)
      .where(eq(tenants.email, email))
      .limit(1);
    if (existing[0]) {
      return Response.json({ ok: false, error: "emailTaken" }, { status: 409 });
    }

    const csv = serializeStructures(structures);
    const [created] = await db
      .insert(tenants)
      .values({
        name,
        email,
        phone,
        passwordHash: hashPassword(password),
        status: "active",
        plan: "monthly",
        structure: structures.length === BLOCKS.length ? "all" : structures[0],
        structures: csv,
        createdByAdmin: false,
        // 30-day activation window so the school space is usable right away
        subscriptionEndsAt: new Date(Date.now() + 30 * 86400000),
      })
      .returning();

    // Standard classes are provisioned immediately for the selected structures.
    for (const block of structures) {
      const tuition = block === "nursery" ? 20000 : block === "primary" ? 25000 : 35000;
      for (const level of STRUCTURE[block].levels) {
        await db
          .insert(classes)
          .values({ tenantId: created.id, block, levelCode: level.code, variant: "general", tuition })
          .onConflictDoNothing();
      }
    }

    await createSession("tenant", created.id);
    return Response.json({
      ok: true,
      role: "tenant",
      accountRole: "director",
      tenant: { id: created.id, name: created.name, email: created.email, structures },
    });
  }

  /* ── Connexion ── */
  if (action === "login") {
    // Belt & suspenders: even if the database was just reset, the hardcoded
    // principal administrator row is re-created before any authentication.
    await guaranteePrincipalAdmin();

    const email = str(body.email).toLowerCase();
    const password = String(body.password ?? "");

    // Principal administrator: e-mail sign-in, password optional.
    if (email && isPrincipalAdminEmail(email)) {
      if (!verifyAdmin(email, password)) {
        return Response.json({ ok: false, error: "invalid" }, { status: 401 });
      }
      await createSession("admin", null);
      return Response.json({ ok: true, role: "admin" });
    }

    if (!email || !password) return Response.json({ ok: false, error: "invalid" }, { status: 400 });
    if (await isPlatformAdminEmail(email)) {
      // Additional platform administrators (seeded rows) keep password protection.
      return Response.json({ ok: false, error: "invalid" }, { status: 401 });
    }

    const rows = await db.select().from(tenants).where(eq(tenants.email, email)).limit(1);
    const t = rows[0];
    if (t && !t.isSandbox && t.status === "active" && verifyPassword(password, t.passwordHash)) {
      await createSession("tenant", t.id);
      return Response.json({ ok: true, role: "tenant", accountRole: "director" });
    }
    return Response.json({ ok: false, error: "invalid" }, { status: 401 });
  }

  return Response.json({ ok: false, error: "unknown" }, { status: 400 });
}
