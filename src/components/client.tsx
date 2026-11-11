"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { pendingText?: string };

export function SubmitButton({ children, pendingText, className, ...rest }: ButtonProps) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className} {...rest}>
      {pending ? (pendingText ?? "Patientez…") : children}
    </button>
  );
}

export function ConfirmButton({
  message,
  children,
  className,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { message: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className={className}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
      {...rest}
    >
      {pending ? "Patientez…" : children}
    </button>
  );
}

export function PrintButton({ className, children }: { className?: string; children?: ReactNode }) {
  return (
    <button type="button" onClick={() => window.print()} className={className ?? "btn-secondary"}>
      {children ?? "🖨️ Imprimer / Enregistrer en PDF"}
    </button>
  );
}

export function CopyButton({ text, className, label }: { text: string; className?: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className={className ?? "btn-secondary"}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          window.prompt("Copiez le lien :", text);
        }
      }}
    >
      {copied ? "✅ Lien copié" : (label ?? "🔗 Copier le lien")}
    </button>
  );
}

export function NavLink({
  href,
  exact,
  locked,
  baseClass,
  activeClass,
  children,
}: {
  href: string;
  exact?: boolean;
  locked?: boolean;
  baseClass: string;
  activeClass: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      aria-disabled={locked || undefined}
      title={locked ? "Module non inclus dans votre formule" : undefined}
      className={[baseClass, active ? activeClass : "", locked ? "opacity-50 grayscale" : ""].filter(Boolean).join(" ")}
    >
      {children}
    </Link>
  );
}
