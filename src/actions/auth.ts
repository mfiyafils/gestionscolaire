"use server";

import { redirect } from "next/navigation";
import { ensureSchema } from "@/db/ensure";
import { clearSession, isAdminEmail, setSession } from "@/lib/auth";
import { ADMIN_EMAIL } from "@/lib/constants";
import { getSchoolByEmail } from "@/lib/data";
import { verifyPassword } from "@/lib/password";
import { normalizeEmail } from "@/lib/utils";

export type LoginState = { error?: string; pendingToken?: string };

/** Connexion Directe Admin : l'e-mail de la Direction Générale est reconnu sans mot de passe. */
export async function adminLogin(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  if (!email) return { error: "Veuillez saisir votre adresse e-mail." };
  if (!isAdminEmail(email)) {
    return { error: "Cette adresse n'est pas reconnue comme Administrateur Principal (Direction Générale)." };
  }
  await setSession({ role: "admin", email: ADMIN_EMAIL });
  redirect("/admin");
}

/**
 * Connexion d'une école abonnée : e-mail + mot de passe (si l'école en a défini un à la création
 * de son compte). Les écoles ajoutées par la Direction sans mot de passe se connectent par e-mail.
 */
export async function schoolLogin(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = normalizeEmail(String(formData.get("email") ?? ""));
  const password = String(formData.get("password") ?? "");
  if (!email) return { error: "Veuillez saisir l'adresse e-mail de votre école." };

  if (isAdminEmail(email)) {
    await setSession({ role: "admin", email: ADMIN_EMAIL });
    redirect("/admin");
  }

  await ensureSchema();
  const school = await getSchoolByEmail(email);
  if (!school) {
    return { error: "Aucun compte trouvé pour cet e-mail. Créez votre compte abonné ou contactez la Direction Générale." };
  }
  if (school.status === "en_attente") {
    return {
      error: `La demande d'abonnement de « ${school.name} » est en attente de validation par la Direction Générale. Envoyez votre référence de paiement par WhatsApp pour accélérer l'activation.`,
      pendingToken: school.requestToken ?? undefined,
    };
  }
  if (school.status === "suspendu") {
    return {
      error: `L'abonnement de « ${school.name} » est suspendu. Contactez la Direction Générale pour votre réadmission.`,
    };
  }
  if (school.status === "retire") {
    return { error: `L'abonnement de « ${school.name} » a été retiré. Contactez la Direction Générale.` };
  }
  if (school.passwordHash) {
    if (!password) return { error: "Veuillez saisir le mot de passe défini lors de la création de votre compte." };
    if (!verifyPassword(password, school.passwordHash)) return { error: "Mot de passe incorrect." };
  }
  await setSession({ role: "school", email, schoolId: school.id });
  redirect(`/ecoles/${school.id}`);
}

export async function logout(): Promise<void> {
  await clearSession();
  redirect("/");
}
