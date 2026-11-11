import {
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export type Level = "maternel" | "primaire" | "secondaire";
export type SubscriberStatus = "en_attente" | "actif" | "suspendu" | "retire";
export type PlanCode = "mensuel" | "trimestriel" | "annuel";
export type Gender = "M" | "F";
export type StudentStatus = "actif" | "inactif";

/**
 * Écoles abonnées (Maternelle / Primaire / Secondaire).
 * L'administrateur principal n'est pas stocké ici : il est reconnu par son e-mail.
 */
export const subscribers = pgTable(
  "scolaria_subscribers",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    code: text("code").notNull(),
    email: text("email").notNull(),
    phone: text("phone"),
    address: text("address"),
    directorName: text("director_name"),
    countryCode: text("country_code").notNull().default("237"),
    hasMaternel: boolean("has_maternel").notNull().default(false),
    hasPrimaire: boolean("has_primaire").notNull().default(false),
    hasSecondaire: boolean("has_secondaire").notNull().default(false),
    status: text("status").$type<SubscriberStatus>().notNull().default("actif"),
    subscriptionEnd: text("subscription_end"),
    notes: text("notes"),
    // Espace abonné : création de compte, formule, paiement mobile (colonnes additives)
    passwordHash: text("password_hash"),
    plan: text("plan").$type<PlanCode>(),
    planMonths: integer("plan_months"),
    amountDue: integer("amount_due"),
    paymentMethod: text("payment_method"),
    paymentReference: text("payment_reference"),
    requestToken: text("request_token"),
    subscriptionStart: text("subscription_start"),
    validatedAt: timestamp("validated_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("subscribers_email_idx").on(t.email),
    uniqueIndex("subscribers_code_idx").on(t.code),
    uniqueIndex("subscribers_request_token_idx").on(t.requestToken),
  ],
);

export const classes = pgTable(
  "scolaria_classes",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => subscribers.id, { onDelete: "cascade" }),
    level: text("level").$type<Level>().notNull(),
    name: text("name").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("classes_school_idx").on(t.schoolId)],
);

/**
 * Élèves. Le numéro officiel est attribué automatiquement à l'enregistrement
 * (séquence par établissement) : la "Liste des numéros officiels" est donc
 * toujours synchronisée avec la liste des élèves.
 */
export const students = pgTable(
  "scolaria_students",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => subscribers.id, { onDelete: "cascade" }),
    classId: integer("class_id").references(() => classes.id, { onDelete: "set null" }),
    level: text("level").$type<Level>().notNull(),
    officialSeq: integer("official_seq").notNull(),
    officialNumber: text("official_number").notNull(),
    lastName: text("last_name").notNull(),
    middleName: text("middle_name"),
    firstName: text("first_name").notNull(),
    gender: text("gender").$type<Gender>().notNull().default("M"),
    birthDate: text("birth_date"),
    birthPlace: text("birth_place"),
    parentName: text("parent_name"),
    parentPhone: text("parent_phone"),
    address: text("address"),
    status: text("status").$type<StudentStatus>().notNull().default("actif"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("students_official_number_idx").on(t.schoolId, t.officialNumber),
    uniqueIndex("students_school_seq_idx").on(t.schoolId, t.officialSeq),
    index("students_class_idx").on(t.classId),
    index("students_school_idx").on(t.schoolId),
  ],
);

export const payments = pgTable(
  "scolaria_payments",
  {
    id: serial("id").primaryKey(),
    schoolId: integer("school_id")
      .notNull()
      .references(() => subscribers.id, { onDelete: "cascade" }),
    studentId: integer("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    receiptSeq: integer("receipt_seq").notNull(),
    receiptNumber: text("receipt_number").notNull(),
    token: text("token").notNull(),
    amount: numeric("amount", { precision: 14, scale: 2 }).notNull(),
    currency: text("currency").notNull().default("XAF"),
    motif: text("motif").notNull(),
    period: text("period"),
    payerName: text("payer_name"),
    method: text("method").notNull().default("Espèces"),
    paidAt: text("paid_at").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("payments_token_idx").on(t.token),
    uniqueIndex("payments_school_receipt_idx").on(t.schoolId, t.receiptSeq),
    index("payments_student_idx").on(t.studentId),
  ],
);

export type Subscriber = typeof subscribers.$inferSelect;
export type SchoolClass = typeof classes.$inferSelect;
export type Student = typeof students.$inferSelect;
export type Payment = typeof payments.$inferSelect;
