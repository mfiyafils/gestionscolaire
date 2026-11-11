import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ADMIN_EMAIL } from "@/lib/constants";
import { getSchoolById } from "@/lib/data";
import { normalizeEmail } from "@/lib/utils";

export type Session =
  | { role: "admin"; email: string }
  | { role: "school"; email: string; schoolId: number };

const COOKIE_NAME = "gs_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 jours

function secret(): string {
  return process.env.SESSION_SECRET || `gestionscolaire::${ADMIN_EMAIL}::v1`;
}

function sign(payload: string): string {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function isAdminEmail(email: string): boolean {
  return normalizeEmail(email) === ADMIN_EMAIL;
}

export function encodeSession(session: Session): string {
  const payload = Buffer.from(JSON.stringify({ ...session, iat: Date.now() })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function decodeSession(value: string | undefined): Session | null {
  if (!value) return null;
  const idx = value.lastIndexOf(".");
  if (idx <= 0) return null;
  const payload = value.slice(0, idx);
  const signature = value.slice(idx + 1);
  const expected = sign(payload);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<string, unknown>;
    if (data.role === "admin" && typeof data.email === "string") {
      // L'accès administrateur est réservé de manière permanente à l'e-mail de la Direction Générale.
      if (!isAdminEmail(data.email)) return null;
      return { role: "admin", email: ADMIN_EMAIL };
    }
    if (data.role === "school" && typeof data.schoolId === "number") {
      return { role: "school", email: String(data.email ?? ""), schoolId: data.schoolId };
    }
    return null;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  return decodeSession(store.get(COOKIE_NAME)?.value);
}

export async function setSession(session: Session): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, encodeSession(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.VERCEL === "1" || process.env.COOKIE_SECURE === "true",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function requireAdmin(): Promise<Extract<Session, { role: "admin" }>> {
  const session = await getSession();
  if (!session) redirect("/?erreur=connexion");
  if (session.role !== "admin") redirect(`/ecoles/${session.schoolId}`);
  return session;
}

/** Autorise l'administrateur principal (toutes les écoles) ou l'école elle-même. */
export async function requireSchoolAccess(schoolId: number): Promise<Session> {
  const session = await getSession();
  if (!session) redirect("/?erreur=connexion");
  if (session.role === "admin") return session;
  if (session.schoolId !== schoolId) redirect(`/ecoles/${session.schoolId}`);
  return session;
}

/**
 * Vérification d'accès au niveau de chaque page école (les layouts ne sont pas
 * ré-exécutés lors des navigations client). Charge l'école ou renvoie 404.
 */
export async function requireSchoolPage(schoolId: number) {
  if (!Number.isInteger(schoolId) || schoolId <= 0) notFound();
  const session = await requireSchoolAccess(schoolId);
  const school = await getSchoolById(schoolId);
  if (!school) notFound();
  if (session.role !== "admin" && school.status !== "actif") {
    redirect(`/?erreur=${encodeURIComponent("Votre abonnement n'est pas actif (en attente de validation, suspendu ou retiré). Contactez la Direction Générale.")}`);
  }
  return { session, school };
}
