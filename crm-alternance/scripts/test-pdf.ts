// Verification manuelle de la generation PDF : npx tsx scripts/test-pdf.ts
import { chargerEnv } from "../src/lib/charger-env";

chargerEnv();

import { writeFileSync } from "node:fs";
import { genererPdf } from "../src/lib/cv";

async function main() {
  const buf = await genererPdf({
    titre_cv: "Alternant Réseaux & Télécoms - Cybersécurité",
    top_4_competences: [
      "Firewalling (Cisco ASA, pfSense, iptables)",
      "Switching avancé (VLAN, STP, LACP, HSRP)",
      "Administration Linux (Debian, Ubuntu)",
      "Python (scripting, Scapy, sockets)"
    ]
  });
  const out = process.argv[2] ?? "/tmp/cv-test.pdf";
  writeFileSync(out, buf);
  console.log(`PDF genere : ${out} (${buf.length} octets, entete "${buf.subarray(0, 5).toString()}")`);
}

main().catch((e) => {
  console.error("ECHEC :", e.message);
  process.exit(1);
});
