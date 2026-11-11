# Scolaria — Gestion scolaire bilingue · MFIYA & Fils

Application Next.js (App Router) + PostgreSQL (Drizzle ORM) pour la Direction Générale et ses écoles abonnées
(Maternelle · Primaire · Secondaire), avec le design d'origine Scolaria (polices Outfit / Fraunces, palette « tableau noir »).

## Fonctionnalités

- **Administrateur Principal** : l'e-mail de la Direction Générale est reconnu de manière permanente et prioritaire,
  sans jamais être affiché sur l'interface publique. Un champ discret « Accès Direction Générale » ouvre instantanément
  le tableau de bord, sans mot de passe.
- **Espace abonné** (`/inscription`) : création de compte (nom, e-mail, mot de passe, WhatsApp), cases à cocher
  Maternelle / Primaire / Secondaire, durée (1 mois 10 000 FCFA · 3 mois 22 000 FCFA · 1 an 145 000 FCFA, multipliés par
  le nombre de structures), total dynamique, instructions Orange Money / MTN et bouton **« Envoyer la référence et la
  capture de paiement par WhatsApp »** vers le numéro officiel de l'administrateur (+237 699 14 84 64).
- **Validation** : le tableau de bord de direction affiche la file des « Demandes d'abonnement en attente » ; le bouton
  **« Valider / Admettre »** active immédiatement le compte et débloque les structures payées (les autres restent
  visibles mais verrouillées).
- **Gestion des abonnés** : ajouter, suspendre, réadmettre, retirer (données conservées) et, pour un abonné retiré,
  supprimer définitivement. Les classes standard de chaque bloc sont créées automatiquement.
- **Plateforme école** : accès direct aux modules de la formule payée ; les modules non souscrits restent visibles mais
  grisés / verrouillés. Chaque élève est intégré dans la liste de sa classe et de son bloc.
- **Numéros officiels** : attribués automatiquement à l'enregistrement (`CODE-ANNÉE-0001`). Le registre des numéros
  officiels et la liste générale des élèves partagent la même source : toute modification est répercutée instantanément.
- **Paiements & reçus A6** : chaque paiement génère un reçu imprimable au format A6, accessible par un lien public
  (`/recu/<jeton>`) qui est joint au message WhatsApp envoyé au parent.

## Variables d'environnement

| Variable              | Rôle                                                                                   |
| --------------------- | -------------------------------------------------------------------------------------- |
| `DATABASE_URL`        | Connexion PostgreSQL (Vercel Postgres, Neon, Supabase, Render…). SSL activé automatiquement. |
| `SESSION_SECRET`      | Secret de signature des sessions (recommandé en production).                           |
| `NEXT_PUBLIC_APP_URL` | URL publique utilisée dans les liens de reçus (`https://gestionscolaire-three.vercel.app` par défaut). |
| `COOKIE_SECURE`       | `true` pour forcer les cookies *Secure* hors Vercel (ex. Render derrière HTTPS).        |

## Déploiement Vercel / Render

1. Créer une base PostgreSQL et renseigner `DATABASE_URL` (+ `SESSION_SECRET`, `NEXT_PUBLIC_APP_URL`).
2. Déployer : le schéma est initialisé automatiquement au premier démarrage (tables préfixées `scolaria_*`, `CREATE TABLE IF NOT EXISTS`,
   aucune donnée n'est jamais supprimée ni altérée par cette étape).
3. Se connecter avec l'e-mail de la Direction Générale, puis ajouter les écoles abonnées.

En local : `npx drizzle-kit push` applique le schéma, `npm run dev` lance l'application.
