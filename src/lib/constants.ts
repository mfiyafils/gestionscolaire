import type { Level, PlanCode, SubscriberStatus } from "@/db/schema";

/** Compte Administrateur Principal (Direction Générale) — reconnu de façon permanente et prioritaire. */
export const ADMIN_EMAIL = "etsmfiyafils@gmail.com";

export const APP_NAME = "Scolaria";
export const APP_BRAND = "MFIYA & Fils";
export const APP_CITY = "Douala, Cameroun";
export const APP_PHONE = "699 14 84 64";
export const APP_TAGLINE = "Plateforme scolaire · Cameroun";

/** Numéros de paiement de l'abonnement (affichés sur la page d'accueil, comme sur le site d'origine). */
export const PAYMENT_NUMBERS = [
  { label: "Orange Money", number: "699148464" },
  { label: "MTN Mobile Money", number: "650351567" },
];
export const PAYMENT_HOLDER = "MFIYA Clementine Linda";

/** Numéro WhatsApp officiel de l'administrateur (réception des références et captures de paiement). */
export const ADMIN_WHATSAPP = "237699148464";

/** Grille tarifaire officielle — prix par structure, multiplié par le nombre de structures cochées. */
export const PLANS: Array<{ code: PlanCode; label: string; short: string; months: number; price: number }> = [
  { code: "mensuel", label: "1 mois", short: "Mensuel", months: 1, price: 10000 },
  { code: "trimestriel", label: "3 mois (Trimestriel)", short: "Trimestriel", months: 3, price: 22000 },
  { code: "annuel", label: "1 an (Annuel)", short: "Annuel", months: 12, price: 145000 },
];

export function isPlanCode(value: unknown): value is PlanCode {
  return value === "mensuel" || value === "trimestriel" || value === "annuel";
}

export function getPlan(code: string | null | undefined) {
  return PLANS.find((p) => p.code === code) ?? null;
}

export function subscriptionTotal(planCode: string | null | undefined, structures: number): number {
  const plan = getPlan(planCode);
  return plan ? plan.price * Math.max(1, structures) : 0;
}

/** URL publique de l'application (utilisée dans les liens de reçus envoyés par WhatsApp). */
export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://gestionscolaire-three.vercel.app").replace(
  /\/+$/,
  "",
);

export const DEFAULT_COUNTRY_CODE = "237";

export const LEVELS: Level[] = ["maternel", "primaire", "secondaire"];

export function isLevel(value: unknown): value is Level {
  return value === "maternel" || value === "primaire" || value === "secondaire";
}

export const LEVEL_INFO: Record<
  Level,
  {
    label: string;
    english: string;
    short: string;
    emoji: string;
    description: string;
    hex: string;
    accent: string;
    soft: string;
    text: string;
    ring: string;
    badge: string;
  }
> = {
  maternel: {
    label: "Maternelle",
    english: "Nursery",
    short: "M",
    emoji: "🧸",
    description: "Petite Section et Grande Section — immersion bilingue.",
    hex: "#E9A23B",
    accent: "bg-amber-500",
    soft: "bg-amber-50",
    text: "text-amber-800",
    ring: "ring-amber-200",
    badge: "bg-amber-100 text-amber-800",
  },
  primaire: {
    label: "Primaire",
    english: "Primary",
    short: "P",
    emoji: "📘",
    description: "De la SIL au CM2 (Class 1 à Class 6).",
    hex: "#2E9E6B",
    accent: "bg-emerald-600",
    soft: "bg-emerald-50",
    text: "text-emerald-700",
    ring: "ring-emerald-200",
    badge: "bg-emerald-100 text-emerald-800",
  },
  secondaire: {
    label: "Secondaire",
    english: "Secondary",
    short: "S",
    emoji: "🎓",
    description: "De la 6ème à la Terminale (Form 1 à Upper Sixth) — général et technique.",
    hex: "#2E5FE8",
    accent: "bg-sky-600",
    soft: "bg-sky-50",
    text: "text-sky-700",
    ring: "ring-sky-200",
    badge: "bg-sky-100 text-sky-700",
  },
};

/** Classes créées automatiquement pour chaque bloc activé dans la formule d'une école (système camerounais bilingue). */
export const DEFAULT_CLASSES: Record<Level, string[]> = {
  maternel: ["Petite Section · Class 1", "Grande Section · Class 2"],
  primaire: ["SIL / CL1", "CP / CL2", "CE1 / CL3", "CE2 / CL4", "CM1 / CL5", "CM2 / CL6"],
  secondaire: [
    "6ème · Form 1",
    "5ème · Form 2",
    "4ème · Form 3",
    "3ème · Form 4",
    "2nde · Form 5",
    "1ère · Lower Sixth",
    "Terminale · Upper Sixth",
  ],
};

export const STATUS_INFO: Record<SubscriberStatus, { label: string; badge: string; dot: string }> = {
  en_attente: { label: "En attente", badge: "bg-sky-100 text-sky-700", dot: "bg-sky-500" },
  actif: { label: "Actif", badge: "bg-emerald-100 text-emerald-800", dot: "bg-emerald-600" },
  suspendu: { label: "Suspendu", badge: "bg-amber-100 text-amber-800", dot: "bg-amber-500" },
  retire: { label: "Retiré", badge: "bg-slate-200 text-slate-600", dot: "bg-slate-400" },
};

export const MOTIFS = [
  "Frais d'inscription",
  "1ère tranche de scolarité",
  "2ème tranche de scolarité",
  "3ème tranche de scolarité",
  "Frais d'examen",
  "Tenue / Uniforme",
  "Transport",
  "Cantine",
  "APEE",
  "Autre",
];

export const PAYMENT_METHODS = ["Espèces", "Orange Money", "MTN Mobile Money", "Virement bancaire", "Chèque"];

export const CURRENCIES = [
  { code: "XAF", label: "Franc CFA (FCFA)", symbol: "FCFA", words: "francs CFA", cents: "centimes" },
  { code: "EUR", label: "Euro (€)", symbol: "€", words: "euros", cents: "centimes" },
  { code: "USD", label: "Dollar américain ($)", symbol: "$", words: "dollars américains", cents: "cents" },
] as const;

export type SchoolFormula = { hasMaternel: boolean; hasPrimaire: boolean; hasSecondaire: boolean };

export function schoolLevels(school: SchoolFormula): Level[] {
  return LEVELS.filter((level) => hasLevel(school, level));
}

export function hasLevel(school: SchoolFormula, level: Level): boolean {
  if (level === "maternel") return school.hasMaternel;
  if (level === "primaire") return school.hasPrimaire;
  return school.hasSecondaire;
}

export function formulaLabel(school: SchoolFormula): string {
  const levels = schoolLevels(school);
  if (levels.length === 0) return "Aucune structure active";
  if (levels.length === 3) return "Structure complète (Maternelle + Primaire + Secondaire)";
  return levels.map((l) => LEVEL_INFO[l].label).join(" + ");
}
