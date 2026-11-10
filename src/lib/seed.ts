import { db } from "@/db";
import { tenants, classes, students, payments, subjects, grades, staff, waLogs, updates, subRequests, platformAdmins } from "@/db/schema";
import { hashPassword, PRINCIPAL_ADMIN_EMAIL } from "@/lib/auth";
import { STRUCTURE, BLOCKS, SUBJECT_CATALOG } from "@/lib/core";
import { count, eq } from "drizzle-orm";
import { initDb } from "@/db";

const g = globalThis as typeof globalThis & {
  __scolariaSeeded?: boolean;
  __scolariaSeedPromise?: Promise<void>;
};

function mulberry32(a: number) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86400000);
}
function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Cold-start guard used by every API route:
 * 1. resolves the database (PostgreSQL or embedded fallback),
 * 2. creates the schema if needed (idempotent, runtime only → build-safe),
 * 3. seeds deterministic demo data the very first time.
 */
export async function ensureSeed(): Promise<void> {
  if (g.__scolariaSeeded) return;
  if (!g.__scolariaSeedPromise) {
    g.__scolariaSeedPromise = (async () => {
      await initDb();
      // The principal platform administrator is always recognised by default,
      // both on PostgreSQL and on the embedded fallback database.
      await ensurePrincipalAdmin();
      const [{ value }] = await db.select({ value: count() }).from(tenants);
      if (value === 0) await seed();
      g.__scolariaSeeded = true;
    })().catch((err) => {
      g.__scolariaSeedPromise = undefined;
      console.error("[seed] initialisation skipped:", (err as Error).message);
    });
  }
  await g.__scolariaSeedPromise;
}

/** Seeds the private platform administrator row (idempotent, works on every database). */
async function ensurePrincipalAdmin() {
  try {
    await db
      .insert(platformAdmins)
      .values({ email: PRINCIPAL_ADMIN_EMAIL, label: "Administrateur principal", isPrincipal: true })
      .onConflictDoNothing({ target: platformAdmins.email });
  } catch (err) {
    console.warn("[seed] platform admin row skipped:", (err as Error).message?.slice(0, 140));
  }
}

async function seed() {
  const rnd = mulberry32(20260214);
  const pick = <T,>(arr: T[]) => arr[Math.floor(rnd() * arr.length)];

  const [demo] = await db.insert(tenants).values({
    name: "Collège Bilingue La Réussite",
    email: "direction@ecole.cm",
    phone: "677123456",
    passwordHash: hashPassword("demo1234"),
    status: "active",
    plan: "annual",
    structure: "all",
    structures: "nursery,primary,secondary",
    createdByAdmin: true,
    seenVersion: "2.3.1",
    subscriptionEndsAt: new Date(Date.now() + 300 * 86400000),
  }).returning();

  const [sandbox] = await db.insert(tenants).values({
    name: "Bac à sable — Simulation MFIYA",
    email: "sandbox@scolaria.internal",
    phone: "",
    passwordHash: hashPassword("sandbox-unreachable-" + Date.now()),
    status: "active",
    plan: "annual",
    structure: "all",
    structures: "nursery,primary,secondary",
    createdByAdmin: true,
    isSandbox: true,
    subscriptionEndsAt: new Date(Date.now() + 3650 * 86400000),
  }).returning();

  await db.insert(tenants).values({
    name: "Little Stars Nursery & Primary",
    email: "info@littlestars.cm",
    phone: "699887766",
    passwordHash: hashPassword("stars1234"),
    status: "suspended",
    plan: "quarterly",
    structure: "primary",
    structures: "nursery,primary",
    createdByAdmin: true,
    subscriptionEndsAt: new Date(Date.now() - 5 * 86400000),
  });

  for (const b of BLOCKS) {
    for (const lv of STRUCTURE[b].levels) {
      await db.insert(classes).values({ tenantId: sandbox.id, block: b, levelCode: lv.code, variant: "general", tuition: 25000 });
    }
  }

  const demoClasses = [
    { block: "nursery", levelCode: "PS", variant: "general", tuition: 20000 },
    { block: "nursery", levelCode: "GS", variant: "bilingual", tuition: 25000 },
    { block: "primary", levelCode: "CP", variant: "general", tuition: 25000 },
    { block: "primary", levelCode: "CM2", variant: "bilingual", tuition: 30000 },
    { block: "secondary", levelCode: "6E", variant: "general", tuition: 35000 },
    { block: "secondary", levelCode: "2NDE", variant: "technical", tuition: 45000 },
  ];
  const classIds: Record<string, string> = {};
  for (const c of demoClasses) {
    const [row] = await db.insert(classes).values({ tenantId: demo.id, ...c }).returning();
    classIds[c.levelCode] = row.id;
  }

  const LAST = ["Ngono", "Mbarga", "Fotso", "Nguema", "Tabi", "Ekani", "Ndongo", "Abena", "Kamdem", "Eyenga", "Tchoumi", "Manga", "Bello", "Njoya", "Essomba", "Fouda", "Atangana", "Moukoko", "Sali", "Ondoa", "Biya", "Nkoulou", "Djoumessi", "Awah", "Che", "Tamfu", "Mbei", "Achu"];
  const BOYS = ["Junior", "Emmanuel", "Brice", "Yann", "Kevin", "Armand", "Cédric", "Boris", "Steve", "Franck", "Rodrigue", "Ibrahim", "Patrick", "Didier"];
  const GIRLS = ["Grâce", "Mireille", "Ange", "Prisca", "Sandra", "Larissa", "Clarisse", "Rachelle", "Nadège", "Ornella", "Bénédicte", "Aïcha", "Merveille", "Estelle"];
  const PLACES = ["Douala", "Yaoundé", "Bafoussam", "Garoua", "Buea", "Bamenda", "Kribi", "Limbé"];

  const plan: { level: string; count: number; birthYear: number }[] = [
    { level: "PS", count: 4, birthYear: 2022 },
    { level: "GS", count: 3, birthYear: 2021 },
    { level: "CP", count: 5, birthYear: 2019 },
    { level: "CM2", count: 4, birthYear: 2015 },
    { level: "6E", count: 6, birthYear: 2014 },
    { level: "2NDE", count: 4, birthYear: 2010 },
  ];

  let seq = 0;
  let receiptSeq = 0;
  const studentRows: { id: string; classLevel: string; tuition: number; paid1: number; paid2: number }[] = [];
  const usedNames = new Set<string>();

  for (const p of plan) {
    const cls = demoClasses.find((c) => c.levelCode === p.level)!;
    for (let i = 0; i < p.count; i++) {
      seq++;
      const sex = rnd() > 0.48 ? "F" : "M";
      let last = pick(LAST);
      let first = sex === "F" ? pick(GIRLS) : pick(BOYS);
      while (usedNames.has(last + first)) { last = pick(LAST); first = sex === "F" ? pick(GIRLS) : pick(BOYS); }
      usedNames.add(last + first);
      const enrolledDaysAgo = Math.floor(rnd() * 28) + 1;
      const total = cls.tuition;
      const r = rnd();
      const paid1 = r < 0.18 ? 0 : r < 0.55 ? Math.round(total / 4 / 500) * 500 : Math.round(total / 2 / 500) * 500;
      const paid2 = paid1 >= total / 2 && rnd() > 0.55 ? Math.round((total - paid1) * (rnd() > 0.5 ? 1 : 0.5) / 500) * 500 : 0;
      const [stu] = await db.insert(students).values({
        tenantId: demo.id,
        classId: classIds[p.level],
        matricule: `MAT-2026-${String(seq).padStart(3, "0")}`,
        lastName: last,
        firstName: first,
        sex,
        birthDate: `${p.birthYear}-${String(1 + Math.floor(rnd() * 12)).padStart(2, "0")}-${String(1 + Math.floor(rnd() * 27)).padStart(2, "0")}`,
        birthPlace: pick(PLACES),
        fatherName: `${pick(BOYS)} ${last}`,
        motherName: `${pick(GIRLS)} ${pick(LAST)}`,
        whatsapp: `6${pick(["77", "99", "55", "70", "90", "50"])}${String(100000 + Math.floor(rnd() * 899999))}`,
        enrolledAt: iso(daysAgo(enrolledDaysAgo)),
        tuitionTotal: total,
        paid1,
        paid2,
        createdAt: daysAgo(enrolledDaysAgo),
      }).returning();
      studentRows.push({ id: stu.id, classLevel: p.level, tuition: total, paid1, paid2 });
      const methods = ["cash", "orange", "momo"];
      if (paid1 > 0) {
        receiptSeq++;
        await db.insert(payments).values({
          tenantId: demo.id, studentId: stu.id, receiptNo: `REC-2026-${String(receiptSeq).padStart(3, "0")}`,
          amount: paid1, tranche: 1, method: pick(methods),
          paidAt: iso(daysAgo(enrolledDaysAgo)), createdAt: daysAgo(enrolledDaysAgo),
        });
      }
      if (paid2 > 0) {
        receiptSeq++;
        const d = Math.max(0, enrolledDaysAgo - Math.floor(rnd() * enrolledDaysAgo));
        await db.insert(payments).values({
          tenantId: demo.id, studentId: stu.id, receiptNo: `REC-2026-${String(receiptSeq).padStart(3, "0")}`,
          amount: paid2, tranche: 2, method: pick(methods), paidAt: iso(daysAgo(d)), createdAt: daysAgo(d),
        });
      }
    }
  }

  const sheetDefs: Record<string, { fr: string; coef?: number }[]> = {
    CP: [{ fr: "Français" }, { fr: "Anglais" }, { fr: "Mathématiques" }, { fr: "Éveil / Découverte" }],
    "6E": [{ fr: "Français" }, { fr: "Anglais" }, { fr: "Mathématiques" }, { fr: "Sciences (SVT)" }, { fr: "Histoire" }, { fr: "Éducation civique (ECM)" }],
  };
  for (const [level, defs] of Object.entries(sheetDefs)) {
    let pos = 0;
    for (const d of defs) {
      pos++;
      const cat = SUBJECT_CATALOG.find((s) => s.fr === d.fr)!;
      const [sub] = await db.insert(subjects).values({
        tenantId: demo.id, classId: classIds[level], nameFr: cat.fr, nameEn: cat.en, coefficient: d.coef ?? cat.coef, position: pos,
      }).returning();
      for (const stu of studentRows.filter((s) => s.classLevel === level)) {
        const v = Math.round((5 + rnd() * 14) * 4) / 4;
        await db.insert(grades).values({ tenantId: demo.id, studentId: stu.id, subjectId: sub.id, term: 1, value: Math.min(20, v) });
      }
    }
  }

  const now = new Date();
  await db.insert(updates).values([
    {
      version: "2.3.1", titleFr: "Correctifs de stabilité", titleEn: "Stability fixes",
      notesFr: "Amélioration de la synchronisation et des exports Word.", notesEn: "Improved sync and Word exports.",
      status: "deployed", deployedAt: new Date(now.getTime() - 20 * 86400000), createdAt: new Date(now.getTime() - 21 * 86400000),
    },
    {
      version: "2.4.0", titleFr: "Reçus A6 ×4 & relances WhatsApp", titleEn: "A6 ×4 receipts & WhatsApp reminders",
      notesFr: "Impression de 4 reçus A6 par page A4, relance d'impayés en un clic, nouveau tableau de bord financier.",
      notesEn: "Print 4 A6 receipts per A4 page, one-click unpaid reminders, new financial dashboard.",
      status: "deployed", deployedAt: new Date(now.getTime() - 2 * 86400000), createdAt: new Date(now.getTime() - 3 * 86400000),
    },
  ]);

  await db.insert(staff).values([
    { tenantId: demo.id, fullName: "M. ATANGANA Henri", role: "director", block: "all", phone: "677123456", email: "direction@ecole.cm", salary: 185000, status: "active", hiredAt: iso(daysAgo(400)) },
    { tenantId: demo.id, fullName: "Mme NKODO Pauline", role: "teacher", block: "primary", classId: classIds["CP"], phone: "699441122", email: "pauline@ecole.cm", salary: 95000, status: "active", hiredAt: iso(daysAgo(280)) },
    { tenantId: demo.id, fullName: "M. FOKOU Thierry", role: "teacher", block: "secondary", classId: classIds["6E"], phone: "675334455", email: "fokou@ecole.cm", salary: 115000, status: "active", hiredAt: iso(daysAgo(240)) },
    { tenantId: demo.id, fullName: "Mme EBOULE Mireille", role: "bursar", block: "all", phone: "691887700", email: "caisse@ecole.cm", salary: 110000, status: "active", hiredAt: iso(daysAgo(310)) },
  ]);

  await db.insert(waLogs).values({
    tenantId: demo.id,
    studentId: studentRows[0]?.id ?? null,
    recipientName: "Parent — Élève MAT-2026-001",
    phone: "677889900",
    kind: "enroll",
    message: "Confirmation d'inscription envoyée avec reçu joint.",
    createdAt: daysAgo(2),
  });

  await db.insert(students).values({
    tenantId: demo.id,
    classId: classIds["CM2"],
    matricule: "MAT-2025-099",
    lastName: "MBANG",
    firstName: "Samuel",
    sex: "M",
    birthDate: "2014-05-14",
    birthPlace: "Yaoundé",
    fatherName: "MBANG Thomas",
    motherName: "ESSOMBA Claire",
    whatsapp: "677223344",
    enrolledAt: iso(daysAgo(340)),
    tuitionTotal: 30000,
    paid1: 15000,
    paid2: 15000,
    archived: true,
    archiveReason: "Admis en 6ème (Promo précédente)",
    archivedAt: daysAgo(15),
    createdAt: daysAgo(340),
  });

  await db.insert(subRequests).values([
    { schoolName: "GS Les Papillons", phone: "678445566", email: "contact@papillons.cm", plan: "annual", structure: "nursery,primary,secondary", paymentMethod: "orange", paymentRef: "OM260410.1422.B891", status: "pending", createdAt: daysAgo(1) },
    { schoolName: "Bilingual Academy of Buea", phone: "670112233", email: "admin@babuea.cm", plan: "quarterly", structure: "nursery,primary", paymentMethod: "momo", paymentRef: "MM260409.0915.C442", status: "pending", createdAt: daysAgo(3) },
  ]);

  void eq;
}
