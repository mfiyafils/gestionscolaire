import { cache } from "react";
import { and, asc, count, desc, eq, getTableColumns, ilike, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { classes, payments, students, subscribers, type Level, type SubscriberStatus } from "@/db/schema";
import { DEFAULT_CLASSES } from "@/lib/constants";

/* ---------------- Écoles abonnées ---------------- */

export const getSchoolById = cache(async (id: number) => {
  if (!Number.isInteger(id) || id <= 0) return null;
  const [row] = await db.select().from(subscribers).where(eq(subscribers.id, id)).limit(1);
  return row ?? null;
});

export async function getSchoolByEmail(email: string) {
  const [row] = await db.select().from(subscribers).where(eq(subscribers.email, email)).limit(1);
  return row ?? null;
}

export async function getSchoolByRequestToken(token: string) {
  if (!token || token.length > 64) return null;
  const [row] = await db.select().from(subscribers).where(eq(subscribers.requestToken, token)).limit(1);
  return row ?? null;
}

/** Code d'établissement unique (préfixe interne). */
export async function generateUniqueSchoolCode(base: string, excludeId?: number): Promise<string> {
  const root = base || "ECO";
  let code = root;
  let i = 2;
  while (i < 1000) {
    const [existing] = await db
      .select({ id: subscribers.id })
      .from(subscribers)
      .where(excludeId ? and(eq(subscribers.code, code), ne(subscribers.id, excludeId)) : eq(subscribers.code, code))
      .limit(1);
    if (!existing) return code;
    code = `${root}${i++}`;
  }
  return `${root}${Date.now().toString(36).toUpperCase()}`;
}

export type SubscriberRow = Awaited<ReturnType<typeof listSubscribers>>[number];

export async function listSubscribers(status?: SubscriberStatus) {
  return db
    .select({
      ...getTableColumns(subscribers),
      studentCount: sql<number>`(select count(*) from ${students} where ${students.schoolId} = ${subscribers.id})`.mapWith(
        Number,
      ),
    })
    .from(subscribers)
    .where(status ? eq(subscribers.status, status) : undefined)
    .orderBy(desc(subscribers.createdAt));
}

export async function getAdminStats() {
  const [subs] = await db
    .select({
      total: count(),
      actifs: sql<number>`count(*) filter (where ${subscribers.status} = 'actif')`.mapWith(Number),
      suspendus: sql<number>`count(*) filter (where ${subscribers.status} = 'suspendu')`.mapWith(Number),
      retires: sql<number>`count(*) filter (where ${subscribers.status} = 'retire')`.mapWith(Number),
      enAttente: sql<number>`count(*) filter (where ${subscribers.status} = 'en_attente')`.mapWith(Number),
    })
    .from(subscribers);
  const [stu] = await db.select({ total: count() }).from(students);
  const perLevel = await db.select({ level: students.level, n: count() }).from(students).groupBy(students.level);
  const pays = await db
    .select({
      currency: payments.currency,
      total: sql<number>`coalesce(sum(${payments.amount}), 0)`.mapWith(Number),
      n: count(),
    })
    .from(payments)
    .groupBy(payments.currency);
  const byLevel: Record<Level, number> = { maternel: 0, primaire: 0, secondaire: 0 };
  for (const r of perLevel) byLevel[r.level] = r.n;
  return { subs, studentsTotal: stu.total, byLevel, pays };
}

export async function getSchoolStats(schoolId: number) {
  const perLevel = await db
    .select({ level: students.level, n: count() })
    .from(students)
    .where(eq(students.schoolId, schoolId))
    .groupBy(students.level);
  const [cls] = await db.select({ n: count() }).from(classes).where(eq(classes.schoolId, schoolId));
  const pays = await db
    .select({
      currency: payments.currency,
      total: sql<number>`coalesce(sum(${payments.amount}), 0)`.mapWith(Number),
      n: count(),
    })
    .from(payments)
    .where(eq(payments.schoolId, schoolId))
    .groupBy(payments.currency);
  const byLevel: Record<Level, number> = { maternel: 0, primaire: 0, secondaire: 0 };
  for (const r of perLevel) byLevel[r.level] = r.n;
  return { byLevel, total: perLevel.reduce((acc, r) => acc + r.n, 0), classes: cls.n, pays };
}

/* ---------------- Classes ---------------- */

export type ClassRow = Awaited<ReturnType<typeof listClasses>>[number];

export async function listClasses(schoolId: number, level?: Level) {
  return db
    .select({
      ...getTableColumns(classes),
      studentCount: sql<number>`(select count(*) from ${students} where ${students.classId} = ${classes.id})`.mapWith(
        Number,
      ),
    })
    .from(classes)
    .where(and(eq(classes.schoolId, schoolId), level ? eq(classes.level, level) : undefined))
    .orderBy(asc(classes.level), asc(classes.sortOrder), asc(classes.name));
}

export async function getClass(schoolId: number, classId: number) {
  if (!Number.isInteger(classId) || classId <= 0) return null;
  const [row] = await db
    .select()
    .from(classes)
    .where(and(eq(classes.id, classId), eq(classes.schoolId, schoolId)))
    .limit(1);
  return row ?? null;
}

/** Crée les classes standard d'un bloc lorsqu'il est activé pour la première fois (idempotent). */
export async function ensureDefaultClasses(schoolId: number, levels: Level[]) {
  for (const level of levels) {
    const [existing] = await db
      .select({ n: count() })
      .from(classes)
      .where(and(eq(classes.schoolId, schoolId), eq(classes.level, level)));
    if (existing.n > 0) continue;
    await db
      .insert(classes)
      .values(DEFAULT_CLASSES[level].map((name, index) => ({ schoolId, level, name, sortOrder: index + 1 })));
  }
}

/* ---------------- Élèves ---------------- */

export type StudentRow = Awaited<ReturnType<typeof listStudents>>[number];

export async function listStudents(filter: {
  schoolId?: number;
  level?: Level;
  classId?: number;
  q?: string;
  order?: "numero" | "nom" | "recent";
  limit?: number;
}) {
  const conditions = [];
  if (filter.schoolId) conditions.push(eq(students.schoolId, filter.schoolId));
  if (filter.level) conditions.push(eq(students.level, filter.level));
  if (filter.classId) conditions.push(eq(students.classId, filter.classId));
  if (filter.q) {
    const like = `%${filter.q}%`;
    conditions.push(
      or(
        ilike(students.lastName, like),
        ilike(students.firstName, like),
        ilike(students.middleName, like),
        ilike(students.officialNumber, like),
        ilike(students.parentName, like),
        ilike(students.parentPhone, like),
      ),
    );
  }
  const order =
    filter.order === "nom"
      ? [asc(students.lastName), asc(students.firstName)]
      : filter.order === "recent"
        ? [desc(students.createdAt)]
        : [asc(students.schoolId), asc(students.officialSeq)];

  return db
    .select({
      ...getTableColumns(students),
      className: classes.name,
      schoolName: subscribers.name,
      schoolCode: subscribers.code,
      schoolCountryCode: subscribers.countryCode,
    })
    .from(students)
    .leftJoin(classes, eq(students.classId, classes.id))
    .innerJoin(subscribers, eq(students.schoolId, subscribers.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(...order)
    .limit(filter.limit ?? 2000);
}

export async function getStudent(schoolId: number, studentId: number) {
  if (!Number.isInteger(studentId) || studentId <= 0) return null;
  const [row] = await db
    .select({ ...getTableColumns(students), className: classes.name })
    .from(students)
    .leftJoin(classes, eq(students.classId, classes.id))
    .where(and(eq(students.id, studentId), eq(students.schoolId, schoolId)))
    .limit(1);
  return row ?? null;
}

/* ---------------- Paiements ---------------- */

export type PaymentRow = Awaited<ReturnType<typeof listPayments>>[number];

export async function listPayments(filter: { schoolId?: number; studentId?: number; limit?: number }) {
  return db
    .select({
      ...getTableColumns(payments),
      studentLastName: students.lastName,
      studentMiddleName: students.middleName,
      studentFirstName: students.firstName,
      officialNumber: students.officialNumber,
      parentName: students.parentName,
      parentPhone: students.parentPhone,
      level: students.level,
      className: classes.name,
      schoolName: subscribers.name,
      schoolCountryCode: subscribers.countryCode,
    })
    .from(payments)
    .innerJoin(students, eq(payments.studentId, students.id))
    .leftJoin(classes, eq(students.classId, classes.id))
    .innerJoin(subscribers, eq(payments.schoolId, subscribers.id))
    .where(
      and(
        filter.schoolId ? eq(payments.schoolId, filter.schoolId) : undefined,
        filter.studentId ? eq(payments.studentId, filter.studentId) : undefined,
      ),
    )
    .orderBy(desc(payments.createdAt))
    .limit(filter.limit ?? 500);
}

export async function getPaymentFull(where: { id?: number; token?: string; schoolId?: number }) {
  if (where.id !== undefined && (!Number.isInteger(where.id) || where.id <= 0)) return null;
  const [row] = await db
    .select({ payment: payments, student: students, className: classes.name, school: subscribers })
    .from(payments)
    .innerJoin(students, eq(payments.studentId, students.id))
    .leftJoin(classes, eq(students.classId, classes.id))
    .innerJoin(subscribers, eq(payments.schoolId, subscribers.id))
    .where(
      and(
        where.id ? eq(payments.id, where.id) : undefined,
        where.token ? eq(payments.token, where.token) : undefined,
        where.schoolId ? eq(payments.schoolId, where.schoolId) : undefined,
      ),
    )
    .limit(1);
  return row ?? null;
}
