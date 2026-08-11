/**
 * Validation des dependances externes, a lancer SUR TA MACHINE :
 *   npm run validate:live
 *
 * Verifie une par une les APIs que l'application utilise et affiche
 * exactement ce qui repond, ce qui echoue, et un echantillon de donnees.
 */
import { chargerEnv } from "../src/lib/charger-env";

chargerEnv();

import { geocoder } from "../src/lib/sources/geocode";
import { chercherAnnuaire } from "../src/lib/sources/annuaire";
import { chercherLba } from "../src/lib/sources/lba";
import { rechercher } from "../src/lib/recherche";
import { libelleEffectif } from "../src/lib/domaine";
import { recupererPagesContact } from "../src/lib/enrichment/scraper";
import { agregerContacts } from "../src/lib/enrichment/contacts";
import { verifierSmtp } from "../src/lib/mailer";

const VILLE = process.argv[2] ?? "Sophia Antipolis";

function titre(t: string) {
  console.log(`\n${"=".repeat(60)}\n${t}\n${"=".repeat(60)}`);
}
function ok(m: string) { console.log(`  [OK]  ${m}`); }
function ko(m: string) { console.log(`  [KO]  ${m}`); }

async function etape<T>(nom: string, fn: () => Promise<T>): Promise<T | null> {
  try {
    const r = await fn();
    ok(nom);
    return r;
  } catch (e) {
    ko(`${nom} -> ${e instanceof Error ? e.message : e}`);
    return null;
  }
}

async function main() {
  titre(`1. Geocodage de "${VILLE}"`);
  const centre = await etape("api-adresse.data.gouv.fr", () => geocoder(VILLE));
  if (centre) console.log(`        lat=${centre.lat} lon=${centre.lon} cp=${centre.codePostal}`);

  titre("2. Annuaire des entreprises (source principale)");
  const annuaire = await etape("recherche-entreprises.api.gouv.fr", () =>
    chercherAnnuaire({ codePostal: centre?.codePostal, perPage: 5 })
  );
  if (annuaire) {
    console.log(`        ${annuaire.length} resultat(s)`);
    for (const e of annuaire.slice(0, 5)) {
      console.log(`        - ${e.nom} | NAF ${e.naf ?? "?"} | ${e.ville ?? "?"}`);
    }
    if (annuaire.length === 0) {
      ko("L'API repond mais ne renvoie rien : verifie les codes NAF / le code postal.");
    }
  }

  titre("3. La Bonne Alternance (source complementaire)");
  if (centre) {
    const lba = await etape("labonnealternance.apprentissage.beta.gouv.fr", () =>
      chercherLba({ lat: centre.lat, lon: centre.lon, rayonKm: 30 })
    );
    if (lba) {
      console.log(`        ${lba.length} resultat(s)`);
      for (const e of lba.slice(0, 5)) {
        console.log(`        - ${e.nom} | mail: ${e.emailContact ?? "-"} | site: ${e.siteWeb ?? "-"}`);
      }
      if (lba.length === 0) {
        console.log("        (0 resultat n'est pas forcement une erreur : depend du ROME/rayon)");
      }
    }
  } else {
    ko("Ignore : le geocodage a echoue.");
  }

  titre("4. Recherche complete (fusion + scoring)");
  const rapport = await etape("rechercher()", () => rechercher({ ville: VILLE, limite: 10 }));
  if (rapport) {
    for (const e of rapport.sourcesEnEchec) ko(`source en echec : ${e.source} -> ${e.raison}`);
    console.log(`        ${rapport.resultats.length} entreprise(s) classee(s) :`);
    for (const r of rapport.resultats.slice(0, 10)) {
      const taille = libelleEffectif(r.effectif) ?? "taille inconnue";
      const dist = typeof r.distanceKm === "number" ? `${Math.round(r.distanceKm)} km` : "-";
      console.log(
        `        ${String(r.pertinence.score).padStart(3)} | ${r.pertinence.categorie.padEnd(10)} | ` +
          `${dist.padStart(6)} | ${(r.ville ?? "?").padEnd(18)} | ${taille.padEnd(22)} | ${r.nom}`
      );
    }
  }

  titre("5. Extraction de contacts sur un site reel");
  const siteTest = process.argv[3];
  if (siteTest) {
    const pages = await etape(`scraping de ${siteTest}`, () => recupererPagesContact(siteTest));
    if (pages && pages.length) {
      console.log(`        pages lues : ${pages.map((p) => p.url).join(", ")}`);
      const c = agregerContacts(pages, new URL(pages[0].url).hostname);
      console.log(`        RH         : ${c.emailRh ?? "-"}`);
      console.log(`        Entreprise : ${c.emailEntreprise ?? "-"}`);
      console.log(`        Telephone  : ${c.telephone ?? "-"}`);
      console.log(`        Tous mails : ${c.tousEmails.map((e) => e.email).join(", ") || "-"}`);
    }
  } else {
    console.log("  (ignore) Fournis une URL en 2e argument :");
    console.log("           npm run validate:live -- \"Sophia Antipolis\" https://exemple.fr");
  }

  titre("6. Gmail SMTP");
  const smtp = await verifierSmtp();
  (smtp.ok ? ok : ko)(smtp.message);

  titre("Termine");
}

main().catch((e) => {
  console.error("Echec inattendu :", e);
  process.exit(1);
});
