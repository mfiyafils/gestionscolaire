/* Domain constants + pure helpers shared client/server */

export type Locale = "fr" | "en";
export type Block = "nursery" | "primary" | "secondary";

export interface Level {
  code: string;
  fr: string;
  en: string;
}

export const STRUCTURE: Record<Block, { fr: string; en: string; levels: Level[] }> = {
  nursery: {
    fr: "Maternelle",
    en: "Nursery",
    levels: [
      { code: "PS", fr: "Petite Section", en: "Class 1" },
      { code: "GS", fr: "Grande Section", en: "Class 2" },
    ],
  },
  primary: {
    fr: "Primaire",
    en: "Primary",
    levels: [
      { code: "SIL", fr: "SIL / CL1", en: "SIL / CL1" },
      { code: "CP", fr: "CP / CL2", en: "CP / CL2" },
      { code: "CE1", fr: "CE1 / CL3", en: "CE1 / CL3" },
      { code: "CE2", fr: "CE2 / CL4", en: "CE2 / CL4" },
      { code: "CM1", fr: "CM1 / CL5", en: "CM1 / CL5" },
      { code: "CM2", fr: "CM2 / CL6", en: "CM2 / CL6" },
    ],
  },
  secondary: {
    fr: "Secondaire",
    en: "Secondary",
    levels: [
      { code: "6E", fr: "6ème", en: "Form 1" },
      { code: "5E", fr: "5ème", en: "Form 2" },
      { code: "4E", fr: "4ème", en: "Form 3" },
      { code: "3E", fr: "3ème", en: "Form 4" },
      { code: "2NDE", fr: "2nde", en: "Form 5" },
      { code: "1ERE", fr: "1ère", en: "Lower Sixth" },
      { code: "TLE", fr: "Terminale", en: "Upper Sixth" },
    ],
  },
};

export const BLOCKS: Block[] = ["nursery", "primary", "secondary"];

export const VARIANTS = [
  { id: "general", fr: "Général", en: "General" },
  { id: "technical", fr: "Technique / Commercial", en: "Technical / Commercial" },
  { id: "bilingual", fr: "Immersion bilingue", en: "Bilingual immersion" },
] as const;

export function levelOf(block: string, code: string): Level | undefined {
  return STRUCTURE[block as Block]?.levels.find((l) => l.code === code);
}

export function classLabel(
  cls: { block: string; levelCode: string; variant: string },
  locale: Locale
): string {
  const lv = levelOf(cls.block, cls.levelCode);
  const base = lv ? (locale === "fr" ? lv.fr : `${lv.en} (${lv.fr})`) : cls.levelCode;
  const short = locale === "fr" ? lv?.fr ?? cls.levelCode : lv?.en ?? cls.levelCode;
  void base;
  if (cls.variant === "technical") return `${short} Tech.`;
  if (cls.variant === "bilingual") return `${short} Bil.`;
  return short;
}

export const SUBJECT_CATALOG: { fr: string; en: string; coef: number }[] = [
  { fr: "Français", en: "French", coef: 3 },
  { fr: "Anglais", en: "English", coef: 3 },
  { fr: "Mathématiques", en: "Mathematics", coef: 3 },
  { fr: "Éveil / Découverte", en: "Discovery / Awareness", coef: 1 },
  { fr: "Sciences (SVT)", en: "Biology (Life Sciences)", coef: 2 },
  { fr: "Physique", en: "Physics", coef: 2 },
  { fr: "Chimie", en: "Chemistry", coef: 2 },
  { fr: "Histoire", en: "History", coef: 2 },
  { fr: "Géographie", en: "Geography", coef: 2 },
  { fr: "Informatique", en: "Computer Science", coef: 1 },
  { fr: "Éducation civique (ECM)", en: "Civics & Moral Education", coef: 1 },
  { fr: "Philosophie", en: "Philosophy", coef: 2 },
  { fr: "Comptabilité", en: "Accounting", coef: 3 },
  { fr: "Économie", en: "Economics", coef: 2 },
  { fr: "Éducation physique (EPS)", en: "Physical Education (PE)", coef: 1 },
  { fr: "Dessin / Arts", en: "Drawing / Arts", coef: 1 },
  { fr: "Musique", en: "Music", coef: 1 },
  { fr: "Lecture / Écriture", en: "Reading / Writing", coef: 2 },
];

export const PLANS = [
  { id: "monthly", fr: "1 mois (Mensuel)", en: "1 month (Monthly)", shortFr: "Mensuel", shortEn: "Monthly", price: 10000, months: 1 },
  { id: "quarterly", fr: "3 mois (Trimestriel)", en: "3 months (Quarterly)", shortFr: "Trimestriel", shortEn: "Quarterly", price: 22000, months: 3 },
  { id: "annual", fr: "1 an (Annuel)", en: "1 year (Annual)", shortFr: "Annuel", shortEn: "Annual", price: 45000, months: 12 },
] as const;

export type PlanId = (typeof PLANS)[number]["id"];

export const SUB_STRUCTURES = [
  { id: "all", fr: "Complexe complet (Maternelle + Primaire + Secondaire)", en: "Complete complex (Nursery + Primary + Secondary)", multiplier: 3 },
  { id: "nursery", fr: "Structure unique — Maternelle seule", en: "Single structure — Nursery only", multiplier: 1 },
  { id: "primary", fr: "Structure unique — Primaire seul", en: "Single structure — Primary only", multiplier: 1 },
  { id: "secondary", fr: "Structure unique — Secondaire seul", en: "Single structure — Secondary only", multiplier: 1 },
] as const;

export type SubStructureId = (typeof SUB_STRUCTURES)[number]["id"];

/** Parse comma-separated structures ("nursery,primary") or legacy "all"/"primary" into ordered Block[]. */
export function parseStructures(raw: string | string[] | null | undefined): Block[] {
  if (Array.isArray(raw)) {
    const valid = BLOCKS.filter((b) => raw.includes(b));
    return valid.length ? valid : ["primary"];
  }
  const s = String(raw ?? "").trim().toLowerCase();
  if (!s || s === "all") return [...BLOCKS];
  const parts = s.split(",").map((x) => x.trim()).filter((x): x is Block => BLOCKS.includes(x as Block));
  if (parts.length > 0) return BLOCKS.filter((b) => parts.includes(b));
  return [...BLOCKS];
}

export function serializeStructures(list: string[]): string {
  const valid = BLOCKS.filter((b) => list.includes(b));
  return valid.length ? valid.join(",") : "primary";
}

export function structureMultiplier(structure: string | string[]): number {
  const list = parseStructures(structure);
  return Math.max(1, list.length);
}

export function subscriptionPrice(planId: string, structure: string | string[]): number {
  const base = PLANS.find((p) => p.id === planId)?.price ?? PLANS[0].price;
  return base * structureMultiplier(structure);
}

export function structureLabel(structure: string | string[], locale: Locale): string {
  const list = parseStructures(structure);
  if (list.length === BLOCKS.length) {
    return locale === "fr"
      ? "Structure complète (3 structures)"
      : "Complete structure (3 structures)";
  }
  const names = list.map((b) => (locale === "fr" ? STRUCTURE[b].fr : STRUCTURE[b].en));
  return names.join(" + ");
}

export function allowedBlocks(structure: string | string[]): Block[] {
  return parseStructures(structure);
}

export const PLATFORM = {
  brand: "Scolaria",
  company: "MFIYA & Fils",
  whatsapp: "237699148464",
  whatsappDisplay: "699 14 84 64",
  orangeMoney: "699148464",
  mobileMoney: "650351567",
  payee: "MFIYA Clementine Linda",
};

/* ── Formatting ────────────────────────────────────────────── */
export function money(n: number): string {
  return `${Math.round(n).toLocaleString("fr-FR").replace(/\u202f/g, " ")} FCFA`;
}
export function num(n: number): string {
  return Math.round(n).toLocaleString("fr-FR").replace(/\u202f/g, " ");
}
export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function fmtDate(iso: string | Date | null | undefined, locale: Locale): string {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso.length === 10 ? iso + "T12:00:00" : iso) : iso;
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(locale === "fr" ? "fr-FR" : "en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
export function ageFrom(birthISO: string): number {
  if (!birthISO) return 0;
  const b = new Date(birthISO + "T12:00:00");
  const now = new Date();
  let a = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) a--;
  return Math.max(0, a);
}
export function schoolYear(): string {
  const y = new Date().getFullYear();
  const m = new Date().getMonth();
  const start = m >= 8 ? y : y - 1;
  return `${start}-${start + 1}`;
}
export function normPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("237")) return digits;
  if (digits.length === 9) return "237" + digits;
  return digits;
}
export function waLink(phone: string, message: string): string {
  return `https://wa.me/${normPhone(phone)}?text=${encodeURIComponent(message)}`;
}

/* ── Academic computations ─────────────────────────────────── */
export interface GradeRow {
  studentId: string;
  subjectId: string;
  term: number;
  value: number;
}
export interface SubjectRow {
  id: string;
  classId: string;
  coefficient: number;
}

export function computeResults(
  studentIds: string[],
  classSubjects: SubjectRow[],
  allGrades: GradeRow[],
  term: number
): Map<string, { total: number; coefSum: number; avg: number | null; rank: number }> {
  const map = new Map<string, { total: number; coefSum: number; avg: number | null; rank: number }>();
  const gmap = new Map<string, number>();
  for (const g of allGrades) if (g.term === term) gmap.set(g.studentId + "|" + g.subjectId, g.value);
  for (const sid of studentIds) {
    let total = 0;
    let coefSum = 0;
    for (const s of classSubjects) {
      const v = gmap.get(sid + "|" + s.id);
      if (v !== undefined) {
        total += v * s.coefficient;
        coefSum += s.coefficient;
      }
    }
    map.set(sid, { total, coefSum, avg: coefSum > 0 ? total / coefSum : null, rank: 0 });
  }
  const ranked = [...map.entries()]
    .filter(([, r]) => r.avg !== null)
    .sort((a, b) => (b[1].avg ?? 0) - (a[1].avg ?? 0));
  ranked.forEach(([sid], i) => {
    const r = map.get(sid)!;
    r.rank = i + 1;
  });
  return map;
}

export function mention(avg: number | null, locale: Locale): string {
  if (avg === null) return "—";
  const fr =
    avg >= 16 ? "Excellent" : avg >= 14 ? "Très bien" : avg >= 12 ? "Bien" : avg >= 10 ? "Assez bien" : avg >= 8 ? "Passable" : "Insuffisant";
  const en =
    avg >= 16 ? "Excellent" : avg >= 14 ? "Very good" : avg >= 12 ? "Good" : avg >= 10 ? "Fairly good" : avg >= 8 ? "Passable" : "Insufficient";
  return locale === "fr" ? fr : en;
}

export function ordinal(n: number, locale: Locale): string {
  if (locale === "fr") return n === 1 ? "1er" : `${n}ème`;
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/* Chart palette — 8 separable hues drawn from the brand */
export const CHART = {
  green: "#2E9E6B",
  amber: "#E9A23B",
  coral: "#E4572E",
  blue: "#2E5FE8",
  magenta: "#C4327E",
  teal: "#1F8A70",
  violet: "#7A5FD0",
  olive: "#7E9A2E",
};
export const SEX_COLORS = { M: "#2E5FE8", F: "#C4327E" };
export const BLOCK_COLORS: Record<Block, string> = {
  nursery: "#E9A23B",
  primary: "#2E9E6B",
  secondary: "#2E5FE8",
};