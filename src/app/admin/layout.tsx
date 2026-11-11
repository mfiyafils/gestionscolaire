import type { ReactNode } from "react";
import { Shell } from "@/components/Shell";
import { requireAdmin } from "@/lib/auth";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await requireAdmin();
  return (
    <Shell
      theme="admin"
      title="Direction Générale"
      subtitle="Tableau de bord de l'Administrateur Principal"
      roleLabel="Administrateur Principal"
      userLabel={session.email}
      sections={[
        {
          items: [
            { href: "/admin", label: "Tableau de bord", icon: "📊", exact: true },
            { href: "/admin/abonnes", label: "Abonnés (écoles)", icon: "🏫" },
            { href: "/admin/eleves", label: "Tous les élèves", icon: "🧑‍🎓" },
            { href: "/admin/numeros-officiels", label: "Numéros officiels", icon: "🔢" },
            { href: "/admin/paiements", label: "Paiements & reçus", icon: "🧾" },
          ],
        },
      ]}
    >
      {children}
    </Shell>
  );
}
