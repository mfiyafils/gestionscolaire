import type { SVGProps } from "react";

/**
 * Icônes du thème — module pur (sans directive "use client") pour être
 * utilisable depuis les composants serveur ET les composants clients.
 */
const ICONS: Record<string, string> = {
  book: "M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z M20 17v6M6.5 2H20v15",
  users: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M19 8v6 M22 11h-6",
  list: "M4 6h16 M4 12h16 M4 18h7 M15 18l2 2 4-4",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  money: "M12 1v22 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6",
  printer: "M6 9V2h12v7 M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2 M6 14h12v8H6z",
  refresh: "M23 4v6h-6 M1 20v-6h6 M3.51 9a9 9 0 0 1 14.85-3.36L23 10 M20.49 15a9 9 0 0 1-14.85 3.36L1 14",
  globe: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M2 12h20 M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z",
  info: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M12 16v-4 M12 8h.01",
  alert: "M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01",
  error: "M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z M15 9l-6 6 M9 9l6 6",
  check: "M20 6 9 17l-5-5",
  x: "M18 6 6 18 M6 6l12 12",
  plus: "M12 5v14 M5 12h14",
  star: "m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z",
  pencil: "M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z",
  lock: "M5 11h14v10H5z M8 11V7a4 4 0 0 1 8 0v4",
  trash: "M3 6h18 M8 6V4h8v2 M19 6l-1 14H6L5 6",
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3",
};

export function Icon({
  name = "book",
  size = 18,
  className,
  ...rest
}: { name?: string; size?: number; className?: string } & Omit<SVGProps<SVGSVGElement>, "name">) {
  const path = ICONS[name] ?? ICONS.book;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
      {...rest}
    >
      {path.split(" M").map((d, index) => (
        <path key={index} d={index === 0 ? d : `M${d}`} />
      ))}
    </svg>
  );
}

/** Marque de l'application (livre ouvert sur fond vert tableau). */
export function Logo({ size = 36, light = false, className }: { size?: number; light?: boolean; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden className={className}>
      <rect width="64" height="64" rx="14" fill={light ? "#e9a23b" : "#173f2f"} />
      <path d="M32 14 8 26l24 12 20-10v12h4V26L32 14z" fill={light ? "#173f2f" : "#e9a23b"} />
      <path d="M18 36v10c0 4 6 8 14 8s14-4 14-8V36l-14 7-14-7z" fill={light ? "#173f2f" : "#fbf8ef"} />
    </svg>
  );
}

/** Pictogramme WhatsApp (rempli). */
export function WaIcon({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.95 1.17-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.47.13-.62.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.06 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.76-.72 2.01-1.42.25-.7.25-1.29.17-1.42-.07-.12-.27-.2-.57-.35z M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.86 9.86 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.15h-.01a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.25-8.24a8.2 8.2 0 0 1 8.24 8.25c0 4.54-3.7 8.23-8.24 8.23z" />
    </svg>
  );
}

/** Détecte si une valeur d'icône est un nom technique (ex. "book") plutôt qu'un emoji. */
export function isIconName(value: string | undefined | null): boolean {
  return !!value && /^[a-z0-9-]+$/.test(value);
}
