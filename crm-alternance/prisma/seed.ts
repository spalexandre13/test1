import { chargerEnv } from "../src/lib/charger-env";

chargerEnv();

import { assurerDonneesInitiales, MODELE_DEFAUT } from "../src/lib/init";
import { prisma } from "../src/lib/prisma";

async function main() {
  await assurerDonneesInitiales();
  console.log(`Seed OK : modèle "${MODELE_DEFAUT.nom}" en base.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
