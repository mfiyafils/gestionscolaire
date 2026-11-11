"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { subscribers, type Level, type SubscriberStatus } from "@/db/schema";
import { requireAdmin } from "@/lib/auth";
import { DEFAULT_COUNTRY_CODE, formulaLabel, getPlan, isLevel, schoolLevels } from "@/lib/constants";
import { ensureDefaultClasses, generateUniqueSchoolCode, getSchoolById } from "@/lib/data";
import { hashPassword } from "@/lib/password";
import { formatDate, makeSchoolCode, normalizeEmail, optional, str } from "@/lib/utils";

function bust() {
  revalidatePath("/admin", "layout");
  revalidatePath("/ecoles", "layout");
}

function flash(path: string, kind: "ok" | "erreur", message: string): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${kind}=${encodeURIComponent(message)}`;
}

function parseSubscriberForm(formData: FormData) {
  const levels = formData.getAll("levels").map(String).filter(isLevel) as Level[];
  return {
    name: str(formData, "name"),
    email: normalizeEmail(str(formData, "email")),
    phone: optional(formData, "phone"),
    address: optional(formData, "address"),
    directorName: optional(formData, "directorName"),
    countryCode: str(formData, "countryCode").replace(/\D/g, "") || DEFAULT_COUNTRY_CODE,
    subscriptionEnd: optional(formData, "subscriptionEnd"),
    notes: optional(formData, "notes"),
    code: str(formData, "code").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8),
    password: String(formData.get("password") ?? ""),
    levels,
    hasMaternel: levels.includes("maternel"),
    hasPrimaire: levels.includes("primaire"),
    hasSecondaire: levels.includes("secondaire"),
  };
}

export async function createSubscriber(formData: FormData): Promise<void> {
  await requireAdmin();
  const data = parseSubscriberForm(formData);
  const back = "/admin/abonnes?nouveau=1";
  if (!data.name || !data.email) redirect(flash(back, "erreur", "Le nom de l'école et l'e-mail sont obligatoires."));
  if (!/^\S+@\S+\.\S+$/.test(data.email)) redirect(flash(back, "erreur", "Adresse e-mail invalide."));
  if (data.levels.length === 0) {
    redirect(flash(back, "erreur", "Sélectionnez au moins une structure (Maternelle, Primaire ou Secondaire)."));
  }
  const [duplicate] = await db
    .select({ id: subscribers.id })
    .from(subscribers)
    .where(eq(subscribers.email, data.email))
    .limit(1);
  if (duplicate) redirect(flash(back, "erreur", "Un abonné utilise déjà cette adresse e-mail."));
  if (data.password && data.password.length < 6) {
    redirect(flash(back, "erreur", "Le mot de passe doit contenir au moins 6 caractères (ou laissez le champ vide)."));
  }

  const code = await generateUniqueSchoolCode(data.code || makeSchoolCode(data.name));
  const [created] = await db
    .insert(subscribers)
    .values({
      name: data.name,
      code,
      email: data.email,
      phone: data.phone,
      address: data.address,
      directorName: data.directorName,
      countryCode: data.countryCode,
      hasMaternel: data.hasMaternel,
      hasPrimaire: data.hasPrimaire,
      hasSecondaire: data.hasSecondaire,
      subscriptionEnd: data.subscriptionEnd,
      notes: data.notes,
      status: "actif",
      passwordHash: data.password ? hashPassword(data.password) : null,
      subscriptionStart: new Date().toISOString().slice(0, 10),
      validatedAt: new Date(),
    })
    .returning({ id: subscribers.id });
  await ensureDefaultClasses(created.id, data.levels);
  bust();
  redirect(
    flash(
      `/admin/abonnes/${created.id}`,
      "ok",
      `L'école « ${data.name} » a été ajoutée (code ${code}). Elle peut se connecter avec ${data.email}.`,
    ),
  );
}

export async function updateSubscriber(id: number, formData: FormData): Promise<void> {
  await requireAdmin();
  const data = parseSubscriberForm(formData);
  const back = `/admin/abonnes/${id}`;
  if (!data.name || !data.email) redirect(flash(back, "erreur", "Le nom de l'école et l'e-mail sont obligatoires."));
  if (!/^\S+@\S+\.\S+$/.test(data.email)) redirect(flash(back, "erreur", "Adresse e-mail invalide."));
  const [duplicate] = await db
    .select({ id: subscribers.id })
    .from(subscribers)
    .where(and(eq(subscribers.email, data.email), ne(subscribers.id, id)))
    .limit(1);
  if (duplicate) redirect(flash(back, "erreur", "Un autre abonné utilise déjà cette adresse e-mail."));
  if (data.password && data.password.length < 6) {
    redirect(flash(back, "erreur", "Le nouveau mot de passe doit contenir au moins 6 caractères (ou laissez le champ vide)."));
  }

  const [current] = await db.select({ code: subscribers.code }).from(subscribers).where(eq(subscribers.id, id)).limit(1);
  if (!current) redirect(flash("/admin/abonnes", "erreur", "Abonné introuvable."));
  const code = data.code && data.code !== current.code ? await generateUniqueSchoolCode(data.code, id) : current.code;

  await db
    .update(subscribers)
    .set({
      name: data.name,
      code,
      email: data.email,
      phone: data.phone,
      address: data.address,
      directorName: data.directorName,
      countryCode: data.countryCode,
      hasMaternel: data.hasMaternel,
      hasPrimaire: data.hasPrimaire,
      hasSecondaire: data.hasSecondaire,
      subscriptionEnd: data.subscriptionEnd,
      notes: data.notes,
      ...(data.password ? { passwordHash: hashPassword(data.password) } : {}),
      updatedAt: new Date(),
    })
    .where(eq(subscribers.id, id));
  await ensureDefaultClasses(id, data.levels);
  bust();
  redirect(flash(back, "ok", "Les informations de l'abonné ont été mises à jour."));
}

const STATUS_MESSAGES: Record<SubscriberStatus, string> = {
  en_attente: "La demande a été replacée en attente de validation.",
  actif: "L'abonné a été réadmis : son accès est de nouveau actif.",
  suspendu: "L'abonné a été suspendu : son accès à la plateforme est bloqué.",
  retire: "L'abonné a été retiré. Ses données sont conservées et il peut être réadmis à tout moment.",
};

export async function setSubscriberStatus(id: number, status: SubscriberStatus, formData: FormData): Promise<void> {
  await requireAdmin();
  const redirectTo = str(formData, "redirectTo") || "/admin/abonnes";
  await db.update(subscribers).set({ status, updatedAt: new Date() }).where(eq(subscribers.id, id));
  bust();
  redirect(flash(redirectTo, "ok", STATUS_MESSAGES[status]));
}

/** Suppression définitive (uniquement pour un abonné déjà retiré). */
export async function deleteSubscriber(id: number, _formData: FormData): Promise<void> {
  await requireAdmin();
  const [row] = await db.select({ status: subscribers.status, name: subscribers.name }).from(subscribers).where(eq(subscribers.id, id)).limit(1);
  if (!row) redirect(flash("/admin/abonnes", "erreur", "Abonné introuvable."));
  if (row.status !== "retire") {
    redirect(flash(`/admin/abonnes/${id}`, "erreur", "Retirez d'abord l'abonné avant une suppression définitive."));
  }
  await db.delete(subscribers).where(eq(subscribers.id, id));
  bust();
  redirect(flash("/admin/abonnes", "ok", `L'école « ${row.name} » et toutes ses données ont été supprimées définitivement.`));
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

/** Valider / Admettre : active immédiatement le compte et débloque les structures payées. */
export async function approveSubscriptionRequest(id: number, formData: FormData): Promise<void> {
  await requireAdmin();
  const redirectTo = str(formData, "redirectTo") || "/admin";
  const school = await getSchoolById(id);
  if (!school) notFound();
  const months = school.planMonths ?? getPlan(school.plan)?.months ?? 12;
  const start = new Date();
  const end = addMonths(start, months);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  await db
    .update(subscribers)
    .set({
      status: "actif",
      subscriptionStart: iso(start),
      subscriptionEnd: iso(end),
      validatedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(subscribers.id, id));
  await ensureDefaultClasses(id, schoolLevels(school));
  bust();
  redirect(
    flash(
      redirectTo,
      "ok",
      `Abonnement de « ${school.name} » activé (${formulaLabel(school)}) jusqu'au ${formatDate(iso(end))}. L'école peut se connecter immédiatement avec ${school.email}.`,
    ),
  );
}

/** Refuser une demande en attente (la ligne est supprimée : l'e-mail redevient disponible). */
export async function rejectSubscriptionRequest(id: number, formData: FormData): Promise<void> {
  await requireAdmin();
  const redirectTo = str(formData, "redirectTo") || "/admin";
  const [row] = await db
    .select({ status: subscribers.status, name: subscribers.name })
    .from(subscribers)
    .where(eq(subscribers.id, id))
    .limit(1);
  if (!row) notFound();
  if (row.status !== "en_attente") redirect(flash(redirectTo, "erreur", "Seule une demande en attente peut être refusée."));
  await db.delete(subscribers).where(eq(subscribers.id, id));
  bust();
  redirect(flash(redirectTo, "ok", `La demande de « ${row.name} » a été refusée et supprimée.`));
}
