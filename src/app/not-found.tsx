import Link from "next/link";
import { APP_NAME } from "@/lib/constants";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 px-4">
      <div className="card max-w-md text-center">
        <div className="text-5xl">🔍</div>
        <h1 className="mt-4 font-display text-xl font-bold text-board">Page introuvable</h1>
        <p className="mt-2 text-sm text-slate-600">
          Ce lien n&apos;existe pas ou n&apos;est plus disponible (élève, reçu ou école supprimé).
        </p>
        <Link href="/" className="btn-primary mt-6">
          ← Retour à l&apos;accueil {APP_NAME}
        </Link>
      </div>
    </main>
  );
}
