"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { payments, students } from "@/db/schema";
import { requireSchoolAccess } from "@/lib/auth";
import { CURRENCIES, MOTIFS, PAYMENT_METHODS } from "@/lib/constants";
import { getSchoolById } from "@/lib/data";
import { formatReceiptNumber, optional, str, todayISO } from "@/lib/utils";

function bust() {
  revalidatePath("/admin", "layout");
  revalidatePath("/ecoles", "layout");
}

function flash(path: string, kind: "ok" | "erreur", message: string): string {
  const sep = path.includes("?") ? "&" : "?";
  return `${path}${sep}${kind}=${encodeURIComponent(message)}`;
}

export async function createPayment(schoolId: number, formData: FormData): Promise<void> {
  await requireSchoolAccess(schoolId);
  const school = await getSchoolById(schoolId);
  if (!school) notFound();
  const redirectTo = str(formData, "redirectTo");
  const back = redirectTo || `/ecoles/${schoolId}/paiements`;

  const studentId = Number(str(formData, "studentId")) || 0;
  const amount = Number(str(formData, "amount").replace(",", "."));
  const currencyRaw = str(formData, "currency");
  const currency = CURRENCIES.some((c) => c.code === currencyRaw) ? currencyRaw : "XAF";
  const motifRaw = str(formData, "motif");
  const motifAutre = str(formData, "motifAutre");
  const motif = motifRaw === "Autre" && motifAutre ? motifAutre : motifRaw;
  const methodRaw = str(formData, "method");
  const method = PAYMENT_METHODS.includes(methodRaw) ? methodRaw : PAYMENT_METHODS[0];
  const paidAt = /^\d{4}-\d{2}-\d{2}$/.test(str(formData, "paidAt")) ? str(formData, "paidAt") : todayISO();

  if (!studentId) redirect(flash(back, "erreur", "Veuillez sélectionner l'élève concerné."));
  if (!Number.isFinite(amount) || amount <= 0) redirect(flash(back, "erreur", "Le montant doit être supérieur à zéro."));
  if (!motif || (!MOTIFS.includes(motif) && motifRaw !== "Autre")) {
    redirect(flash(back, "erreur", "Veuillez indiquer le motif du paiement."));
  }

  const [student] = await db
    .select({ id: students.id, parentName: students.parentName })
    .from(students)
    .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId)))
    .limit(1);
  if (!student) redirect(flash(back, "erreur", "Élève introuvable dans cet établissement."));

  const year = new Date().getFullYear();
  const created = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(${1_000_000 + schoolId}::bigint)`);
    const [m] = await tx
      .select({ max: sql<number>`coalesce(max(${payments.receiptSeq}), 0)`.mapWith(Number) })
      .from(payments)
      .where(eq(payments.schoolId, schoolId));
    const seq = m.max + 1;
    const [row] = await tx
      .insert(payments)
      .values({
        schoolId,
        studentId,
        receiptSeq: seq,
        receiptNumber: formatReceiptNumber(school.code, year, seq),
        token: randomBytes(9).toString("base64url"),
        amount: amount.toFixed(2),
        currency,
        motif,
        period: optional(formData, "period"),
        payerName: optional(formData, "payerName") ?? student.parentName,
        method,
        paidAt,
        note: optional(formData, "note"),
      })
      .returning({ id: payments.id, receiptNumber: payments.receiptNumber });
    return row;
  });
  bust();
  redirect(
    flash(
      `/ecoles/${schoolId}/paiements/${created.id}`,
      "ok",
      `Paiement enregistré. Reçu N° ${created.receiptNumber} prêt à être imprimé (A6) ou envoyé par WhatsApp.`,
    ),
  );
}

export async function deletePayment(schoolId: number, paymentId: number, formData: FormData): Promise<void> {
  await requireSchoolAccess(schoolId);
  const redirectTo = str(formData, "redirectTo") || `/ecoles/${schoolId}/paiements`;
  await db.delete(payments).where(and(eq(payments.id, paymentId), eq(payments.schoolId, schoolId)));
  bust();
  redirect(flash(redirectTo, "ok", "Le paiement et son reçu ont été annulés."));
}
