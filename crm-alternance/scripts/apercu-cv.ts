// Apercu PNG du CV : npx tsx scripts/apercu-cv.ts sortie.png
import { chargerEnv } from "../src/lib/charger-env";

chargerEnv();

import { lancerNavigateur } from "../src/lib/navigateur";
import { construireHtmlCv } from "../src/lib/cv";

async function main() {
  const nav = await lancerNavigateur();
  const page = await nav.newPage();
  await page.setViewport({ width: 794, height: 1123 });
  await page.setContent(
    construireHtmlCv({
      titre_cv: "Alternant Réseaux & Télécoms - Cybersécurité",
      top_4_competences: [
        "Firewalling (Cisco ASA, pfSense, iptables)",
        "Switching avancé (VLAN, STP, LACP, HSRP)",
        "Administration Linux (Debian, Ubuntu)",
        "Python (scripting, Scapy, sockets)"
      ]
    }),
    { waitUntil: "domcontentloaded" }
  );
  await page.screenshot({ path: (process.argv[2] ?? "cv.png") as `${string}.png`, fullPage: true });
  await nav.close();
  console.log("apercu genere");
}
main().catch((e) => { console.error("ECHEC :", e.message); process.exit(1); });
