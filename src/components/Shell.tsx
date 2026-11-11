import Link from "next/link";
import type { ReactNode } from "react";
import { logout } from "@/actions/auth";
import { NavLink } from "@/components/client";
import { APP_BRAND, APP_NAME } from "@/lib/constants";

export type NavItem = { href: string; label: string; icon: string; exact?: boolean; locked?: boolean };
export type NavSection = { title?: string; items: NavItem[] };

export function Shell({
  theme,
  title,
  subtitle,
  sections,
  roleLabel,
  userLabel,
  back,
  children,
}: {
  theme: "admin" | "school";
  title: string;
  subtitle?: ReactNode;
  sections: NavSection[];
  roleLabel: string;
  userLabel: string;
  back?: { href: string; label: string };
  children: ReactNode;
}) {
  const activeClass = "bg-amber text-board-2 shadow hover:bg-amber hover:text-board-2";

  return (
    <div className="min-h-screen md:flex">
      <aside className="chalkboard no-print text-cream md:fixed md:inset-y-0 md:flex md:w-72 md:flex-col md:border-r md:border-amber/20">
        <div className="border-b border-white/10 px-6 py-5">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber text-board-2 shadow">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="h-5 w-5">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V2H6.5A2.5 2.5 0 0 0 4 4.5v15z" />
              </svg>
            </span>
            <span>
              <span className="block font-display text-lg font-black leading-none text-cream">{APP_NAME}</span>
              <span className="block text-[9px] font-bold uppercase tracking-[0.2em] text-amber">{APP_BRAND}</span>
            </span>
          </Link>
          <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.25em] text-amber/90">
            {theme === "admin" ? "Direction Générale" : "Espace École"}
          </p>
          <h1 className="mt-1 font-display text-lg font-bold leading-tight text-cream">{title}</h1>
          {subtitle && <div className="mt-1 text-xs text-cream/65">{subtitle}</div>}
        </div>

        <nav className="flex gap-3 overflow-x-auto px-3 py-4 md:flex-1 md:flex-col md:gap-5 md:overflow-y-auto">
          {sections.map((section, index) => (
            <div key={index} className="min-w-max md:min-w-0">
              {section.title && (
                <p className="hidden px-3 pb-2 text-[10px] font-extrabold uppercase tracking-[0.18em] text-cream/40 md:block">
                  {section.title}
                </p>
              )}
              <ul className="flex gap-1 md:flex-col">
                {section.items.map((item) => (
                  <li key={item.href}>
                    <NavLink
                      href={item.href}
                      exact={item.exact}
                      locked={item.locked}
                      baseClass="flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-cream/80 transition hover:bg-white/10 hover:text-cream"
                      activeClass={activeClass}
                    >
                      <span className="text-base leading-none">{item.icon}</span>
                      <span className="whitespace-nowrap md:flex-1">{item.label}</span>
                      {item.locked && <span className="text-xs">🔒</span>}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 px-6 py-4 text-sm">
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-cream/40">{roleLabel}</p>
          <p className="truncate font-semibold text-cream" title={userLabel}>
            {userLabel}
          </p>
          {back && (
            <Link href={back.href} className="mt-2 block text-xs font-bold text-amber hover:text-white">
              {back.label}
            </Link>
          )}
          <form action={logout} className="mt-3">
            <button
              type="submit"
              className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-extrabold uppercase tracking-wide text-cream transition hover:bg-amber hover:text-board-2"
            >
              Déconnexion
            </button>
          </form>
        </div>
      </aside>

      <main className="print-full flex-1 md:pl-72">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
