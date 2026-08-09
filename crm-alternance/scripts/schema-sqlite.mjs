// Derive un schema SQLite depuis le schema PostgreSQL (source de verite).
// Permet de garder un dev local sans serveur de base, tout en deployant
// sur Vercel avec Postgres. Aucun risque de derive : un seul fichier edite.
import { readFileSync, writeFileSync } from "node:fs";

const SOURCE = "prisma/schema.prisma";
const CIBLE = "prisma/schema.sqlite.prisma";

const src = readFileSync(SOURCE, "utf8");
if (!src.includes('provider = "postgresql"')) {
  console.error(`${SOURCE} ne declare pas postgresql : rien a deriver.`);
  process.exit(1);
}

const out = `// FICHIER GENERE — ne pas editer.
// Source : ${SOURCE} (script: scripts/schema-sqlite.mjs)
${src.replace('provider = "postgresql"', 'provider = "sqlite"')}`;

writeFileSync(CIBLE, out);
console.log(`${CIBLE} genere depuis ${SOURCE}.`);
