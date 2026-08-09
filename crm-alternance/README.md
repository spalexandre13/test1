# CRM Alternance — Alexandre

Application **locale** pour piloter une campagne de candidatures spontanées en
alternance (BUT R&T, rentrée 2026) : trouver les bonnes entreprises, récupérer
leurs contacts, générer un mail et un CV adaptés, envoyer via Gmail et suivre
le pipeline.

## Sommaire

- [Installation](#installation)
- [Déployer sur Vercel](#déployer-sur-vercel)
- [Configuration du .env](#configuration-du-env)
- [⚠️ Accès réseau requis](#-accès-réseau-requis)
- [Utilisation](#utilisation)
- [Comment marche la recherche](#comment-marche-la-recherche)
- [Comment sont trouvés les emails](#comment-sont-trouvés-les-emails)
- [Tests](#tests)
- [Dépannage](#dépannage)

## Installation

```bash
cd crm-alternance
cp .env.example .env        # puis remplis les valeurs (voir plus bas)
npm install
npm run db:local            # crée prisma/dev.db (SQLite)
npm run db:seed             # insère le modèle de mail par défaut
npm run dev                 # http://localhost:3000
```


## Déployer sur Vercel

L'application tourne sur Vercel, mais **pas avec la configuration locale** : le
disque y est éphémère (SQLite impossible) et les fonctions sont limitées en
taille (Chromium complet impossible). Le code gère déjà les deux cas :

| | En local | Sur Vercel |
|---|---|---|
| Base | SQLite (`npm run db:local`) | PostgreSQL (`DATABASE_URL`) |
| Chromium | `puppeteer` (devDependency) | `@sparticuz/chromium` |
| Accès | libre | **mot de passe obligatoire** |

### 1. Créer une base PostgreSQL

N'importe quel fournisseur convient. Le plus simple : dans ton projet Vercel,
onglet **Storage → Create Database → Neon** (gratuit). Vercel renseigne alors
`DATABASE_URL` tout seul. Sinon, crée-la sur [neon.tech](https://neon.tech) ou
[supabase.com](https://supabase.com) et copie l'URL de connexion.

### 2. Importer le dépôt

Sur [vercel.com/new](https://vercel.com/new), importe `spalexandre13/BouzuSec`,
puis **règle le Root Directory sur `crm-alternance`** (l'application n'est pas à
la racine du dépôt).

### 3. Renseigner les variables d'environnement

Dans **Settings → Environment Variables** :

| Variable | Valeur |
|---|---|
| `DATABASE_URL` | l'URL PostgreSQL de l'étape 1 |
| `APP_PASSWORD` | **un mot de passe que tu choisis** — voir ci-dessous |
| `GMAIL_USER` | ton adresse Gmail |
| `GMAIL_PASS` | ton mot de passe d'application (16 caractères) |
| `GROQ_API_KEY` | ta clé Groq |
| `AI_PROVIDER` | `groq` (Ollama tourne en local, pas sur Vercel) |
| `SENDER_NAME`, `SENDER_EMAIL`, `PORTFOLIO_URL` | ton identité |

### 4. Déployer, puis initialiser les données

Le build lance `prisma db push` automatiquement (voir `vercel.json`), donc les
tables sont créées au premier déploiement. Pour insérer le modèle de mail :

```bash
DATABASE_URL="<ton-url-postgres>" npm run db:seed
```

### ⚠️ Pourquoi le mot de passe est obligatoire

Une URL Vercel est **publique**. Sans protection, n'importe qui la trouvant
pourrait envoyer des mails depuis ton compte Gmail et vider ton quota Groq.

L'application refuse donc de démarrer en public tant que `APP_PASSWORD` n'est
pas défini : elle répond `503` avec un message explicite, plutôt que de
s'exposer. Une fois la variable posée, le navigateur demande le mot de passe
(authentification HTTP standard, l'identifiant n'a pas d'importance) et le
retient — sur téléphone, tu ne le saisis qu'une fois.

Pages **et** routes API sont protégées.

### Ce qui change une fois déployé

- **Ollama ne fonctionne plus** (il tourne sur ta machine) : utilise Groq.
- La génération du CV PDF est plus lente au premier appel (démarrage à froid).
- Les fonctions sont plafonnées à 60 s (limite du plan Hobby).

## Configuration du `.env`

| Variable | Requis | Rôle |
|---|---|---|
| `DATABASE_URL` | oui | `file:./dev.db` en local, URL PostgreSQL sur Vercel |
| `APP_PASSWORD` | en public | Mot de passe d'accès — **obligatoire sur Vercel** |
| `SENDER_NAME`, `SENDER_EMAIL` | oui | Identité affichée dans le mail et le CV |
| `PORTFOLIO_URL` | oui | Lien portfolio du CV |
| `GMAIL_USER` | oui | Ton adresse Gmail |
| `GMAIL_PASS` | oui | **Mot de passe d'application** (16 caractères) — pas ton mot de passe Gmail |
| `AI_PROVIDER` | oui | `groq` (défaut) ou `ollama` |
| `GROQ_API_KEY` | si groq | https://console.groq.com/keys |
| `OLLAMA_URL` / `OLLAMA_MODEL` | si ollama | Serveur local |
| `LBA_API_KEY` | non | Augmente les quotas La Bonne Alternance |
| `PUPPETEER_EXECUTABLE_PATH` | non | Si tu as déjà un Chromium installé |

**Mot de passe d'application Gmail** : active la validation en 2 étapes sur ton
compte Google, puis génère-le sur https://myaccount.google.com/apppasswords.

## ⚠️ Accès réseau requis

L'application appelle **quatre** services externes. Sur un réseau filtré
(entreprise, école, VPN), ils doivent être joignables :

| Hôte | Sert à |
|---|---|
| `recherche-entreprises.api.gouv.fr` | Trouver les entreprises par code NAF |
| `api-adresse.data.gouv.fr` | Géocoder la ville |
| `labonnealternance.apprentissage.beta.gouv.fr` | Repérer celles qui recrutent en alternance |
| `api.groq.com` | Génération IA (sauf si tu utilises Ollama en local) |

Le site de chaque entreprise est aussi contacté pour en extraire les contacts.

**Vérifie tout d'un coup :**

```bash
npm run validate:live
# ou en testant aussi l'extraction de contacts sur un site précis :
npm run validate:live -- "Sophia Antipolis" https://exemple.fr
```

La page **Diagnostic** (`/sante`) fait le même contrôle depuis l'interface.

## Utilisation

1. **Sourcing** (`/sourcing`) — saisis une ville et un rayon. Les entreprises
   sortent **classées par pertinence** avec leur catégorie (cyber / réseau /
   cloud / télécom / IT) et les signaux qui ont fait monter le score.
2. **Trouver les contacts** — bouton par entreprise : lit le site (accueil,
   contact, recrutement, mentions légales) et remplit **email RH**, **email
   entreprise** et **téléphone**. Si le site n'est pas connu, colle-le dans le
   champ prévu.
3. **Générer la candidature** — résume l'activité, rédige le mail au ton
   « Alexandre » et adapte le titre + les 4 compétences du CV.
4. **Validation** (`/validation`) — relis, modifie, vérifie l'aperçu du CV PDF,
   puis **Approuver et envoyer avec Gmail**. Le RH est en destinataire, l'adresse
   générique passe en copie. Une relance est programmée à J+10.
5. **Pipeline** (`/`) — suivi par statut, avec les relances échues remontées
   automatiquement en « À relancer ».

## Comment marche la recherche

Deux sources sont interrogées **en parallèle**, puis fusionnées et dédoublonnées
par SIRET :

- **Annuaire des entreprises** (`recherche-entreprises.api.gouv.fr`) — source
  principale, filtrée sur 13 codes NAF pertinents (conseil informatique,
  infogérance, télécoms, systèmes de sécurité, installation réseau…).
- **La Bonne Alternance** — complément, apporte le signal « recrute en
  alternance » et parfois un email de contact.

Chaque entreprise reçoit un **score de pertinence sur 100** :

| Signal | Poids |
|---|---|
| Code NAF (ex. `6203Z` infogérance) | 8 à 35 |
| Mots-clés métier (cyber, SOC, Cisco, VPN, fibre, infogérance…) | 6 à 25 |
| Propose de l'alternance | +15 |
| Contact direct disponible | +10 |
| Proximité (dégressif jusqu'à 50 km) | 0 à +10 |

Les entreprises hors domaine (score 0) sont **écartées**. Les signaux retenus
sont affichés dans l'interface pour que tu voies *pourquoi* une entreprise
remonte.

Si une source échoue, l'autre est quand même renvoyée et l'échec est affiché
explicitement — jamais de liste vide silencieuse.

## Comment sont trouvés les emails

`src/lib/enrichment/` lit jusqu'à 4 pages du site (accueil + contact /
recrutement / mentions légales) et en extrait les contacts :

- Liens `mailto:` et `tel:`, emails en clair, et formes obfusquées
  (`rh [at] societe [dot] fr`).
- **Classification** : `recrutement@`, `rh@`, `alternance@`, `jobs@` → **RH** ;
  `contact@`, `info@` → **entreprise** ; `prénom.nom@` → autre.
- **Filtres anti-bruit** : `noreply@`, adresses d'exemple, trackers
  (`sentry.io`, `wixpress.com`), noms de fichiers (`logo@2x.png`), local-parts
  purement numériques.
- **Priorité au domaine de l'entreprise** : un `contact@agence-web.com` présent
  dans le pied de page ne remplacera jamais un `contact@sondomaine.fr`.
- Les téléphones sont normalisés en `+33 X XX XX XX XX`; les numéros surtaxés
  (08…) et les suites de chiffres type SIRET sont écartés.

Toutes les pistes trouvées sont conservées dans `contactsJson` — le champ
retenu n'est que la meilleure.

## Tests

```bash
npm test          # 45 tests (logique pure, sans réseau)
npm run typecheck # TypeScript strict
npm run build     # build de production
```

Ce que couvrent les tests : classification RH/entreprise, filtres anti-bruit,
priorité de domaine, normalisation des téléphones, scoring de pertinence et
bornes de mots, normalisation des réponses d'API (formes multiples), fusion
multi-source, échappement HTML du CV, refus des compétences inventées, garde-fou
anti-formules-IA, messages d'erreur SMTP.

## Dépannage

| Symptôme | Cause / solution |
|---|---|
| Recherche vide + bandeau orange | Une API publique est injoignable. Lance `npm run validate:live`, regarde `/sante`. |
| `Host not in allowlist` | Ton réseau bloque l'API. Autorise les hôtes listés plus haut. |
| `Invalid login` à l'envoi | `GMAIL_PASS` doit être un **mot de passe d'application**, pas ton mot de passe Gmail. |
| `Impossible de joindre smtp.gmail.com` | Pare-feu/antivirus bloque le port 465. |
| `GROQ_API_KEY manquante` | Renseigne la clé, ou passe `AI_PROVIDER=ollama`. |
| Erreur Puppeteer / Chromium | `npx puppeteer browsers install chrome`, ou renseigne `PUPPETEER_EXECUTABLE_PATH`. |
| `Environment variable not found: DATABASE_URL` | Le `.env` n'existe pas : `cp .env.example .env`. |
| Aucun contact trouvé | Le site n'expose peut-être rien d'exploitable. Colle une URL plus précise (page contact) et relance. |

## Architecture

```
crm-alternance/
├── prisma/schema.prisma        # ModeleEmail / Entreprise / Candidature
├── scripts/
│   ├── validate-live.ts        # vérifie les APIs externes (à lancer chez toi)
│   ├── test-pdf.ts             # génère un CV PDF de test
│   └── apercu-cv.ts            # aperçu PNG du CV
├── src/lib/
│   ├── domaine.ts              # scoring NAF + mots-clés
│   ├── recherche.ts            # fusion multi-source + classement
│   ├── ton.ts                  # garde-fou anti-formules-IA
│   ├── generation.ts           # résumé → email → CV (avec régénération)
│   ├── prompts.ts              # les 3 prompts système
│   ├── cv-data.ts              # base de compétences réelles
│   ├── cv.ts                   # HTML → PDF (Puppeteer)
│   ├── mailer.ts               # Gmail + traduction des erreurs SMTP
│   ├── sources/                # annuaire, LBA, géocodage
│   └── enrichment/             # scraper + extraction de contacts
├── src/app/                    # pages + routes API
└── tests/                      # 45 tests
```
