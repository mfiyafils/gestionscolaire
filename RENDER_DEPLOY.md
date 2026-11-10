# 🚀 Déploiement Scolaria sur Render (ZIP ou Git)

## 0. Le build ne peut pas échouer
- **Aucune base de données n'est requise au build.** Le schéma est créé **au runtime** (`src/db/bootstrap.ts`).
- Si `DATABASE_URL` est **absente ou vide**, l'application bascule automatiquement sur **PGlite** (PostgreSQL embarqué, `@electric-sql/pglite`), avec repli mémoire si le disque est en lecture seule.
- Les pages sont compilées sans connexion réseau à la base.

---

## 1. Charger le ZIP sur Render
Render ne déploie pas un ZIP directement. Deux options :

### Option A — ZIP → GitHub (recommandé, 2 minutes)
1. Décompressez le ZIP.
2. Créez un dépôt **privé** sur GitHub et poussez le contenu :
   ```bash
   git init && git add . && git commit -m "Scolaria production"
   git branch -M main
   git remote add origin https://github.com/<vous>/scolaria.git
   git push -u origin main
   ```
3. Render → **New +** → **Blueprint** → sélectionnez le dépôt (le fichier `render.yaml` est détecté) **ou** **Web Service**.

### Option B — ZIP → Render Docker
Render → **New +** → **Web Service** → dépôt contenant le `Dockerfile` fourni
→ *Language* : **Docker** (aucune commande build/start à saisir).

---

## 2. Réglages du Web Service (Node)
| Champ | Valeur |
|---|---|
| Runtime | **Node** |
| Build Command | `npm ci --include=dev && npm run build` |
| Start Command | `npm run start` |
| Health Check Path | `/api/health` |
| Auto-Deploy | On |

Ces commandes sont déjà définies dans `package.json` (`"build": "next build"`, `"start": "node server.js"`).
`server.js` écoute **obligatoirement sur `0.0.0.0`** et sur le **port dynamique `process.env.PORT || 10000`** injecté par Render → aucun risque de *« Port scan timeout reached »*. (Alternative : `npm run start:next` = `next start -H 0.0.0.0 -p ${PORT:-10000}`.)

## 3. Variables d'environnement
| Clé | Valeur | Obligatoire |
|---|---|---|
| `NODE_VERSION` | `22.11.0` | recommandé |
| `NODE_ENV` | `production` | oui |
| `DATABASE_URL` | Internal Database URL (PostgreSQL Render/Neon/Supabase) | ❌ optionnel |
| `ADMIN_EMAIL` | `etsmfiyafils@gmail.com` | recommandé |
| `ADMIN_PASSWORD` | mot de passe fort du Super Admin | **oui en production** |
| `OPENAI_API_KEY` | clé OpenAI (Agent IA) | ❌ optionnel |

> 🔒 `ADMIN_EMAIL` reste **serveur uniquement** : il n'apparaît jamais dans l'interface, les bundles JS, les reçus ou l'espace abonné.

### Ajouter PostgreSQL Render (optionnel)
1. **New +** → **Postgres** → plan Free → nom `scolaria-db`.
2. Copiez l'**Internal Database URL**.
3. Web Service → *Environment* → `DATABASE_URL` = cette URL → **Save** (redéploiement auto).

La connexion est testée puis le schéma est créé automatiquement au premier appel. SSL Render est géré côté code.

## 4. Vérification après déploiement
```bash
curl https://<votre-service>.onrender.com/api/health
# → {"ok":true,"db":"postgres"}   (ou "embedded" sans DATABASE_URL)
```
- Page publique : `/` (tarifs, structures, connexion FR/EN)
- Espace école : `/app` — démo `direction@ecole.cm` / `demo1234`
- Console Super Admin : `/admin` — `etsmfiyafils@gmail.com` (sans clé/token)

## 5. Points de vigilance
- **Plan Free** : le disque est éphémère. Sans `DATABASE_URL`, les données PGlite sont réinitialisées à chaque redéploiement/mise en veille. Utilisez PostgreSQL pour la production.
- Données isolées par école (`tenant_id` sur chaque requête), vérifiées par tests.
- Le premier appel peut prendre ~2 s (création du schéma + seed).
- Pour repartir de zéro sans PostgreSQL : supprimez le dossier `.data/`.
