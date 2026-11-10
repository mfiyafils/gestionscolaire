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
  const body = await req.json().catch(() => ({}));
  const action = String(body.action ?? "");

  if (action === "logout") {
    try {
      await ensureSeed();
    } catch {
      /* tenant row cleanup is best-effort */
    }
    await destroySession();
    return Response.json({ ok: true });
  }

  /* ── Connexion ── */
  if (action === "login") {
    const email = str(body.email).toLowerCase();
    const password = String(body.password ?? "");

    /* ── 1) Principal administrator : INSTANT synchronous in-memory bypass ──
       Verified against the hardcoded in-memory registry FIRST (zero storage
       access), the admin account is (re)created on the fly in the local
       storage, then an in-memory session is issued — no waiting, no timeout.
       Works even on a cold Render instance or a fully reset local database. */
    if (email && isPrincipalAdminEmail(email)) {
      if (!verifyAdmin(email, password)) {
        return Response.json({ ok: false, error: "invalid" }, { status: 401 });
      }
      // Re-create the hardcoded admin account on the fly if storage was reset.
      // Fire-and-forget: never delays the response.
      void guaranteePrincipalAdmin();
      await createSession("admin", null); // memory-only, ~0 ms
      return Response.json({ ok: true, role: "admin" });
    }

    /* ── 2) School accounts : normal seeded path ─────────────────── */
    await ensureSeed();
    // Re-assert the hardcoded principal administrator row on a fresh DB.
    await guaranteePrincipalAdmin();

    if (!email || !password) return Response.json({ ok: false, error: "invalid" }, { status: 400 });
    if (await isPlatformAdminEmail(email)) {
      // Additional seeded platform administrators keep password protection.
      return Response.json({ ok: false, error: "invalid" }, { status: 401 });
    }

    const rows = await db.select().from(tenants).where(eq(tenants.email, email)).limit(1);
    const t = rows[0];
    if (t && !t.isSandbox && t.status === "active" && verifyPassword(password, t.passwordHash)) {
      await createSession("tenant", t.id);
      return Response.json({
        ok: true,
        role: "tenant",
        accountRole: "director",
        // Purchased structures — used by the client to redirect straight to
        // the subscriber's teaching subsystem.
        structures: parseStructures(t.structures || t.structure),
      });
    }
    return Response.json({ ok: false, error: "invalid" }, { status: 401 });
  }

  /* ── Création de compte : devient automatiquement Administrateur / Direction ── */
  if (action === "register") {
    await ensureSeed();
    await guaranteePrincipalAdmin();

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
      structures,
      tenant: { id: created.id, name: created.name, email: created.email, structures },
    });
  }

  return Response.json({ ok: false, error: "unknown" }, { status: 400 });
}
