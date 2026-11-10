import { randomBytes, scryptSync, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import { db } from "@/db";
import { sessions, tenants } from "@/db/schema";
import { eq } from "drizzle-orm";
export const SESSION_COOKIE = "scolaria_session";
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || "etsmfiyafils@gmail.com").trim().toLowerCase();
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin2026";
const WEEK = 7 * 24 * 3600;
const ADMIN_TTL = 2 * 3600; // 2 hours max for admin sessions

export function hashPassword(pw: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pw, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(pw: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const candidate = scryptSync(pw, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export function verifyAdmin(email: string, pw: string): boolean {
  if (email.trim().toLowerCase() !== ADMIN_EMAIL) return false;
  const a = Buffer.from(pw);
  const b = Buffer.from(ADMIN_PASSWORD);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function genPassword(): string {
  return "SCL-" + randomBytes(3).toString("hex").toUpperCase();
}

export async function createSession(role: "tenant" | "admin", tenantId: string | null) {
  const token = randomBytes(32).toString("hex");
  const ttl = role === "admin" ? ADMIN_TTL : WEEK;
  await db.insert(sessions).values({
    token,
    role,
    tenantId,
    expiresAt: new Date(Date.now() + ttl * 1000),
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    // Admin gets a browser-session cookie (no persistent maxAge) so closing the browser always clears it
    ...(role === "admin" ? {} : { maxAge: WEEK }),
    secure: process.env.NODE_ENV === "production",
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(sessions).where(eq(sessions.token, token));
  jar.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export interface Session {
  role: "tenant" | "admin";
  tenantId: string | null;
  tenant?: typeof tenants.$inferSelect;
}

export async function getSession(): Promise<Session | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select()
    .from(sessions)
    .leftJoin(tenants, eq(sessions.tenantId, tenants.id))
    .where(eq(sessions.token, token))
    .limit(1);
  const row = rows[0];
  if (!row) return null;
  if (row.sessions.expiresAt.getTime() < Date.now()) {
    await db.delete(sessions).where(eq(sessions.token, token));
    return null;
  }
  if (row.sessions.role === "admin") return { role: "admin", tenantId: null };
  const t = row.tenants;
  if (!t || t.status !== "active") return null;
  return { role: "tenant", tenantId: t.id, tenant: t };
}

/** Tenant scope for data operations. Admin is confined to the sandbox — never a real tenant. */
export async function tenantScope(): Promise<{ tenantId: string; role: "tenant" | "admin" } | null> {
  const s = await getSession();
  if (!s) return null;
  if (s.role === "tenant" && s.tenantId) return { tenantId: s.tenantId, role: "tenant" };
  if (s.role === "admin") {
    const box = await db.select().from(tenants).where(eq(tenants.isSandbox, true)).limit(1);
    if (box[0]) return { tenantId: box[0].id, role: "admin" };
  }
  return null;
}