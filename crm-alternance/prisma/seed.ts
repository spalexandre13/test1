import { chargerEnv } from "../src/lib/charger-env";

chargerEnv();

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.modeleEmail.upsert({
    where: { nom: "candidature-spontanee" },
    update: {},
    create: {
      nom: "candidature-spontanee",
      estDefaut: true,
      objet: "Candidature alternance Réseaux & Cybersécurité - rentrée 2026",
      contenu: [
        "Bonjour,",
        "",
        "{{RESUME_ENTREPRISE}} — c'est exactement le terrain qui m'intéresse.",
        "",
        "Je suis en 3e année de BUT Réseaux & Télécommunications à Sophia Antipolis et je",
        "cherche une alternance en réseau / cybersécurité pour la rentrée 2026, en rythme",
        "une semaine en entreprise / une semaine à l'école.",
        "",
        "Votre polyvalence entre réseau et système est l'environnement idéal pour monter",
        "en compétences.",
        "",
        "Mon CV est en pièce jointe et mon portfolio est ici :",
        "https://spalexandre13.github.io/Portfolio/",
        "Disponible pour un échange quand vous voulez.",
        "",
        "Bien cordialement,",
        "Alexandre"
      ].join("\n")
    }
  });
  console.log('Seed OK : modèle "candidature-spontanee" en base.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
