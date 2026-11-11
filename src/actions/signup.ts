"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureSchema } from "@/db/ensure";
import { subscribers, type Level } from "@/db/schema";
import { isAdminEmail } from "@/lib/auth";
import { DEFAULT_COUNTRY_CODE, PAYMENT_NUMBERS, getPlan, isLevel, isPlanCode } from "@/lib/constants";
import { generateUniqueSchoolCode, getSchoolByEmail } from "@/lib/data";
import { hashPassword } from "@/lib/password";
import { makeSchoolCode, normalizeEmail, normalizePhone, optional, str } from "@/lib/utils";

export type SignupState = { error?: string };

/** Création de compte abonné : la demande est placée « en attente » jusqu'à validation par la Direction Générale. */
export async function createSubscriptionRequest(_prev: SignupState, formData: FormData): Promise<SignupState> {
  await ensureSchema();
  const name = str(formData, "name");
  const email = normalizeEmail(str(formData, "email"));
  const password = String(formData.get("password") ?? "");
  const whatsapp = str(formData, "whatsapp");
  const levels = formData.getAll("levels").map(String).filter(isLevel) as Level[];
  const planCode = str(formData, "plan");
  const paymentMethodRaw = str(formData, "paymentMethod");

  if (!name) return { error: "Indiquez le nom de votre établissement." };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: "Adresse e-mail invalide." };
  if (isAdminEmail(email)) return { error: "Cette adresse est réservée à la Direction Générale." };
  if (password.length < 6) return { error: "Le mot de passe doit contenir au moins 6 caractères." };
  if (!normalizePhone(whatsapp, DEFAULT_COUNTRY_CODE)) return { error: "Indiquez votre numéro WhatsApp." };
  if (levels.length === 0) return { error: "Cochez au moins une structure (Maternelle, Primaire ou Secondaire)." };
  if (!isPlanCode(planCode)) return { error: "Choisissez la durée de votre abonnement." };
  const plan = getPlan(planCode)!;
  const paymentMethod = PAYMENT_NUMBERS.some((p) => p.label === paymentMethodRaw) ? paymentMethodRaw : PAYMENT_NUMBERS[0].label;

  const existing = await getSchoolByEmail(email);
  if (existing) {
    return {
      error:
        existing.status === "en_attente"
          ? "Une demande est déjà en attente pour cet e-mail. Contactez la Direction Générale par WhatsApp pour l'activation."
          : "Un compte existe déjà avec cet e-mail. Connectez-vous depuis la page d'accueil.",
    };
  }

  const code = await generateUniqueSchoolCode(makeSchoolCode(name));
  const token = randomBytes(12).toString("base64url");
  await db.insert(subscribers).values({
    name,
    code,
    email,
    phone: whatsapp,
    address: optional(formData, "address"),
    directorName: optional(formData, "directorName"),
    countryCode: DEFAULT_COUNTRY_CODE,
    hasMaternel: levels.includes("maternel"),
    hasPrimaire: levels.includes("primaire"),
    hasSecondaire: levels.includes("secondaire"),
    status: "en_attente",
    passwordHash: hashPassword(password),
    plan: plan.code,
    planMonths: plan.months,
    amountDue: plan.price * levels.length,
    paymentMethod,
    paymentReference: optional(formData, "paymentReference"),
    requestToken: token,
  });
  revalidatePath("/admin", "layout");
  redirect(`/inscription/${token}`);
}

/** L'abonné complète ou corrige sa référence de paiement depuis sa page de suivi. */
export async function updateRequestReference(token: string, formData: FormData): Promise<void> {
  const paymentMethodRaw = str(formData, "paymentMethod");
  const paymentMethod = PAYMENT_NUMBERS.some((p) => p.label === paymentMethodRaw) ? paymentMethodRaw : null;
  await db
    .update(subscribers)
    .set({
      paymentReference: optional(formData, "paymentReference"),
      ...(paymentMethod ? { paymentMethod } : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(subscribers.requestToken, token), eq(subscribers.status, "en_attente")));
  revalidatePath("/admin", "layout");
  redirect(`/inscription/${token}?ok=1`);
}
