import { APP_NAME, APP_URL, CURRENCIES, DEFAULT_COUNTRY_CODE, LEVEL_INFO, getPlan, schoolLevels } from "@/lib/constants";

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export function optional(formData: FormData, key: string): string | null {
  const value = str(formData, key);
  return value ? value : null;
}

export function capitalizeWords(value: string): string {
  return value
    .toLowerCase()
    .split(/(\s|-)/)
    .map((part) => (part.length ? part.charAt(0).toUpperCase() + part.slice(1) : part))
    .join("");
}

export function removeAccents(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export function pad(n: number, length = 4): string {
  return String(n).padStart(length, "0");
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1, 2)}-${pad(d.getDate(), 2)}`;
}

export function parseDateOnly(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

export function formatDate(iso: string | Date | null | undefined, style: "long" | "short" = "long"): string {
  if (!iso) return "—";
  const date = iso instanceof Date ? iso : parseDateOnly(iso);
  if (!date) return "—";
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: style === "long" ? "long" : "2-digit",
    year: "numeric",
  });
}

export function formatDateTime(date: Date | null | undefined): string {
  if (!date) return "—";
  return date.toLocaleString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function currencyInfo(code: string) {
  return CURRENCIES.find((c) => c.code === code) ?? CURRENCIES[0];
}

export function formatNumber(amount: string | number): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  return new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })
    .format(Number.isFinite(n) ? n : 0)
    .replace(new RegExp("[" + String.fromCharCode(0x202f, 0xa0) + "]", "g"), " ");
}

export function formatMoney(amount: string | number, currency: string): string {
  return `${formatNumber(amount)} ${currencyInfo(currency).symbol}`;
}

export function fullName(s: { lastName: string; middleName?: string | null; firstName: string }): string {
  return [s.lastName, s.middleName, s.firstName].filter(Boolean).join(" ");
}

/** Normalise un numéro de téléphone au format international (sans +) pour wa.me */
export function normalizePhone(raw: string | null | undefined, countryCode: string = DEFAULT_COUNTRY_CODE): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  const digits = trimmed.replace(/\D/g, "");
  if (!digits) return null;
  if (trimmed.startsWith("+")) return digits;
  if (digits.startsWith("00")) return digits.slice(2);
  if (digits.startsWith("0")) return countryCode + digits.slice(1);
  if (digits.length <= 9) return countryCode + digits;
  return digits;
}

export function whatsappUrl(phone: string | null, message: string): string {
  const text = encodeURIComponent(message);
  return phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
}

export function receiptUrl(token: string): string {
  return `${APP_URL}/recu/${token}`;
}

export function buildReceiptMessage(p: {
  schoolName: string;
  parentName?: string | null;
  studentName: string;
  officialNumber: string;
  className?: string | null;
  motif: string;
  period?: string | null;
  amount: string | number;
  currency: string;
  receiptNumber: string;
  paidAt: string;
  token: string;
}): string {
  const lines: Array<string | null> = [
    `Bonjour ${p.parentName || "cher parent"},`,
    "",
    `L'école *${p.schoolName}* accuse réception de votre paiement.`,
    `• Élève : ${p.studentName}`,
    `• N° officiel : ${p.officialNumber}`,
    p.className ? `• Classe : ${p.className}` : null,
    `• Motif : ${p.motif}${p.period ? ` (${p.period})` : ""}`,
    `• Montant : ${formatMoney(p.amount, p.currency)}`,
    `• Reçu N° ${p.receiptNumber} du ${formatDate(p.paidAt)}`,
    "",
    "📄 Votre reçu officiel (format A6, imprimable) :",
    receiptUrl(p.token),
    "",
    "Merci pour votre confiance.",
  ];
  return lines.filter((l): l is string => l !== null).join("\n");
}

const STOP_WORDS = new Set([
  "de", "du", "des", "la", "le", "les", "l", "d", "et", "ecole", "complexe", "scolaire", "institut",
  "groupe", "ets", "college", "lycee", "centre", "saint", "sainte", "st", "ste", "the", "of",
]);

/** Génère un code court d'établissement (ex. "Complexe Scolaire M'Fiya Fils" → "MF"). */
export function makeSchoolCode(name: string): string {
  const words = removeAccents(name)
    .toUpperCase()
    .replace(/[^A-Z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const significant = words.filter((w) => !STOP_WORDS.has(w.toLowerCase()));
  const base = significant.length ? significant : words;
  if (base.length === 0) return "ECO";
  let code = base.length >= 2 ? base.slice(0, 4).map((w) => w[0]).join("") : base[0].slice(0, 3);
  if (code.length < 2) code = base[0].slice(0, 3);
  return code.slice(0, 4) || "ECO";
}

/** Matricule / numéro officiel au format d'origine : MAT-2026-001 (séquence propre à chaque établissement). */
export function formatOfficialNumber(_code: string, year: number, seq: number): string {
  return `MAT-${year}-${pad(seq, 3)}`;
}

/** Numéro de reçu : REC-2026-001 (séquence propre à chaque établissement). */
export function formatReceiptNumber(_code: string, year: number, seq: number): string {
  return `REC-${year}-${pad(seq, 3)}`;
}

/* ---------- Montant en lettres (français) ---------- */
const UNITS = [
  "zéro", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf", "dix", "onze", "douze",
  "treize", "quatorze", "quinze", "seize", "dix-sept", "dix-huit", "dix-neuf",
];
const TENS = ["", "dix", "vingt", "trente", "quarante", "cinquante", "soixante", "soixante", "quatre-vingt", "quatre-vingt"];

function below100(n: number): string {
  if (n < 20) return UNITS[n];
  const t = Math.floor(n / 10);
  const u = n % 10;
  if (t === 7 || t === 9) {
    const rest = n - (t - 1) * 10;
    const sep = t === 7 && rest === 11 ? " et " : "-";
    return TENS[t - 1] + sep + UNITS[rest];
  }
  if (u === 0) return TENS[t] + (t === 8 ? "s" : "");
  if (u === 1 && t !== 8) return TENS[t] + " et un";
  return TENS[t] + "-" + UNITS[u];
}

function below1000(n: number): string {
  if (n < 100) return below100(n);
  const h = Math.floor(n / 100);
  const r = n % 100;
  const head = h === 1 ? "cent" : `${UNITS[h]} cent${r === 0 ? "s" : ""}`;
  return r === 0 ? head : `${head} ${below100(r)}`;
}

export function numberToFrenchWords(value: number): string {
  let n = Math.floor(Math.abs(value));
  if (n === 0) return "zéro";
  const parts: string[] = [];
  const scales: Array<[number, string, string]> = [
    [1_000_000_000, "milliard", "milliards"],
    [1_000_000, "million", "millions"],
    [1_000, "mille", "mille"],
  ];
  for (const [scale, singular, plural] of scales) {
    const q = Math.floor(n / scale);
    if (q > 0) {
      if (scale === 1_000) parts.push(q === 1 ? "mille" : `${below1000(q)} mille`);
      else parts.push(`${below1000(q)} ${q > 1 ? plural : singular}`);
      n %= scale;
    }
  }
  if (n > 0) parts.push(below1000(n));
  return parts.join(" ");
}

export function amountInWords(amount: string | number, currency: string): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  const info = currencyInfo(currency);
  const whole = Math.floor(Number.isFinite(n) ? n : 0);
  const cents = Math.round((n - whole) * 100);
  let text = `${numberToFrenchWords(whole)} ${info.words}`;
  if (cents > 0) text += ` et ${numberToFrenchWords(cents)} ${info.cents}`;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Message WhatsApp récapitulatif envoyé par l'abonné à l'administrateur (référence + capture de paiement). */
export function buildSubscriptionMessage(school: {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  hasMaternel: boolean;
  hasPrimaire: boolean;
  hasSecondaire: boolean;
  plan: string | null;
  amountDue: number | null;
  paymentMethod: string | null;
  paymentReference: string | null;
  requestToken: string | null;
}): string {
  const plan = getPlan(school.plan);
  const levels = schoolLevels(school).map((l) => LEVEL_INFO[l].label);
  const lines: Array<string | null> = [
    `Bonjour, je souhaite activer mon abonnement ${APP_NAME}.`,
    "",
    `• Établissement : ${school.name}`,
    `• E-mail : ${school.email}`,
    school.phone ? `• WhatsApp : ${school.phone}` : null,
    `• Structures : ${levels.join(" + ") || "—"}`,
    plan ? `• Durée : ${plan.label}` : null,
    school.amountDue !== null
      ? `• Montant total : ${formatNumber(school.amountDue)} FCFA${plan ? ` (${formatNumber(plan.price)} × ${levels.length})` : ""}`
      : null,
    school.paymentMethod ? `• Moyen de paiement : ${school.paymentMethod}` : null,
    `• Référence du paiement : ${school.paymentReference || "(à compléter)"}`,
    `• Demande n° ${school.id}${school.requestToken ? ` — ${APP_URL}/inscription/${school.requestToken}` : ""}`,
    "",
    "Je joins la capture d'écran de la transaction. Merci de valider mon accès.",
  ];
  return lines.filter((l): l is string => l !== null).join("\n");
}
