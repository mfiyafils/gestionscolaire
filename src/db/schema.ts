import {
  pgTable,
  uuid,
  text,
  integer,
  boolean,
  timestamp,
  date,
  doublePrecision,
  unique,
} from "drizzle-orm/pg-core";

/* ── Tenants (écoles abonnées) ─────────────────────────────── */
export const tenants = pgTable("tenants", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull().default(""),
  passwordHash: text("password_hash").notNull(),
  status: text("status").notNull().default("active"), // active | suspended | revoked
  plan: text("plan").notNull().default("monthly"), // monthly | quarterly | annual
  structure: text("structure").notNull().default("all"), // legacy summary: all | nursery | primary | secondary
  structures: text("structures").notNull().default("nursery,primary,secondary"), // comma-separated paid structures
  createdByAdmin: boolean("created_by_admin").notNull().default(false),
  isSandbox: boolean("is_sandbox").notNull().default(false),
  seenVersion: text("seen_version").notNull().default(""),
  subscriptionEndsAt: timestamp("subscription_ends_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sessions = pgTable("sessions", {
  token: text("token").primaryKey(),
  role: text("role").notNull(), // tenant | admin
  tenantId: uuid("tenant_id").references(() => tenants.id, { onDelete: "cascade" }),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ── Structure pédagogique ─────────────────────────────────── */
export const classes = pgTable(
  "classes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    block: text("block").notNull(), // nursery | primary | secondary
    levelCode: text("level_code").notNull(),
    variant: text("variant").notNull().default("general"), // general | technical | bilingual
    tuition: integer("tuition").notNull().default(25000),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("classes_tenant_level_variant").on(t.tenantId, t.levelCode, t.variant)]
);

export const students = pgTable(
  "students",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    classId: uuid("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
    matricule: text("matricule").notNull(),
    lastName: text("last_name").notNull(),
    firstName: text("first_name").notNull(),
    sex: text("sex").notNull(), // M | F
    birthDate: date("birth_date").notNull(),
    birthPlace: text("birth_place").notNull().default(""),
    fatherName: text("father_name").notNull().default(""),
    motherName: text("mother_name").notNull().default(""),
    whatsapp: text("whatsapp").notNull().default(""),
    enrolledAt: date("enrolled_at").notNull(),
    tuitionTotal: integer("tuition_total").notNull().default(25000),
    paid1: integer("paid1").notNull().default(0),
    paid2: integer("paid2").notNull().default(0),
    archived: boolean("archived").notNull().default(false),
    archiveReason: text("archive_reason").notNull().default(""),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("students_tenant_matricule").on(t.tenantId, t.matricule)]
);

export const staff = pgTable("staff", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  fullName: text("full_name").notNull(),
  role: text("role").notNull().default("teacher"), // director | teacher | bursar | secretary | supervisor
  block: text("block").notNull().default("primary"), // nursery | primary | secondary | all
  classId: uuid("class_id").references(() => classes.id, { onDelete: "set null" }),
  phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""),
  salary: integer("salary").notNull().default(0),
  status: text("status").notNull().default("active"), // active | on_leave
  hiredAt: date("hired_at").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const waLogs = pgTable("wa_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  studentId: uuid("student_id"),
  recipientName: text("recipient_name").notNull(),
  phone: text("phone").notNull(),
  kind: text("kind").notNull().default("custom"), // enroll | reminder | bulletin | custom
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    receiptNo: text("receipt_no").notNull(),
    amount: integer("amount").notNull(),
    tranche: integer("tranche").notNull().default(1),
    method: text("method").notNull().default("cash"), // cash | orange | momo
    paidAt: date("paid_at").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("payments_tenant_receipt").on(t.tenantId, t.receiptNo)]
);

export const subjects = pgTable("subjects", {
  id: uuid("id").defaultRandom().primaryKey(),
  tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
  classId: uuid("class_id").notNull().references(() => classes.id, { onDelete: "cascade" }),
  nameFr: text("name_fr").notNull(),
  nameEn: text("name_en").notNull(),
  coefficient: integer("coefficient").notNull().default(1),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const grades = pgTable(
  "grades",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    tenantId: uuid("tenant_id").notNull().references(() => tenants.id, { onDelete: "cascade" }),
    studentId: uuid("student_id").notNull().references(() => students.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id").notNull().references(() => subjects.id, { onDelete: "cascade" }),
    term: integer("term").notNull().default(1),
    value: doublePrecision("value").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("grades_student_subject_term").on(t.studentId, t.subjectId, t.term)]
);

/* ── Plateforme (Super Admin) ──────────────────────────────── */
export const updates = pgTable("updates", {
  id: uuid("id").defaultRandom().primaryKey(),
  version: text("version").notNull(),
  titleFr: text("title_fr").notNull(),
  titleEn: text("title_en").notNull(),
  notesFr: text("notes_fr").notNull().default(""),
  notesEn: text("notes_en").notNull().default(""),
  status: text("status").notNull().default("deployed"), // draft | deployed
  deployedAt: timestamp("deployed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const subRequests = pgTable("sub_requests", {
  id: uuid("id").defaultRandom().primaryKey(),
  schoolName: text("school_name").notNull(),
  phone: text("phone").notNull(),
  email: text("email").notNull(),
  plan: text("plan").notNull().default("monthly"),
  structure: text("structure").notNull().default("all"),
  paymentMethod: text("payment_method").notNull().default("orange"), // orange | momo
  paymentRef: text("payment_ref").notNull().default(""),
  status: text("status").notNull().default("pending"), // pending | approved | rejected
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});