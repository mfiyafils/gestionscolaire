import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Scolaria — Gestion scolaire bilingue",
    short_name: "Scolaria",
    description: "Gestion scolaire multi-établissements bilingue (FR/EN) — MFIYA & Fils",
    start_url: "/",
    display: "standalone",
    background_color: "#f2ecdd",
    theme_color: "#173f2f",
    icons: [
      {
        src: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' rx='14' fill='%23173f2f'/%3E%3Cpath d='M32 14 8 26l24 12 20-10v12h4V26L32 14z' fill='%23e9a23b'/%3E%3Cpath d='M18 36v10c0 4 6 8 14 8s14-4 14-8V36l-14 7-14-7z' fill='%23fbf8ef'/%3E%3C/svg%3E",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
