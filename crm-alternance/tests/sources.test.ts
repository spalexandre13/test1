import { test } from "node:test";
import assert from "node:assert/strict";
import { normaliserResultatsAnnuaire } from "../src/lib/sources/annuaire";
import { normaliserResultatsLba } from "../src/lib/sources/lba";
import { normaliserGeocodage } from "../src/lib/sources/geocode";
import { normaliserNaf, cleDedoublonnage } from "../src/lib/sources/types";
import { fusionner, fusionnerListes, classer } from "../src/lib/recherche";
import { liensInteressants, normaliserUrlSite } from "../src/lib/enrichment/scraper";

test("normaliserNaf accepte les formats pointes et rejette le bruit", () => {
  assert.equal(normaliserNaf("62.02A"), "6202A");
  assert.equal(normaliserNaf("6202a"), "6202A");
  assert.equal(normaliserNaf("62 02 A"), "6202A");
  assert.equal(normaliserNaf("abc"), undefined);
  assert.equal(normaliserNaf(null), undefined);
  assert.equal(normaliserNaf(undefined), undefined);
});

test("cleDedoublonnage privilegie le siret puis le siren", () => {
  assert.equal(cleDedoublonnage({ siret: "123", siren: "456", nom: "X" }), "siret:123");
  assert.equal(cleDedoublonnage({ siren: "456", nom: "X" }), "siren:456");
  assert.equal(cleDedoublonnage({ nom: "  Net  Secure ", codePostal: "06560" }), "nom:net secure|06560");
});

test("normaliserResultatsAnnuaire lit la forme documentee de l'API", () => {
  const fixture = {
    total_results: 2,
    results: [
      {
        siren: "812345678",
        nom_complet: "NETSECURE SAS",
        activite_principale: "62.02A",
        libelle_activite_principale: "Conseil en systemes et logiciels informatiques",
        tranche_effectif_salarie: "12",
        siege: {
          siret: "81234567800012",
          adresse: "10 RUE DES LUCIOLES 06560 VALBONNE",
          code_postal: "06560",
          libelle_commune: "VALBONNE",
          latitude: "43.6234",
          longitude: "7.0489"
        }
      },
      { siren: "999", siege: {} } // entree sans nom -> doit etre ignoree
    ]
  };
  const out = normaliserResultatsAnnuaire(fixture);
  assert.equal(out.length, 1, "l'entree sans nom doit etre filtree");
  const e = out[0];
  assert.equal(e.nom, "NETSECURE SAS");
  assert.equal(e.siret, "81234567800012");
  assert.equal(e.naf, "6202A");
  assert.equal(e.ville, "VALBONNE");
  assert.equal(e.codePostal, "06560");
  assert.equal(e.lat, 43.6234, "latitude convertie en nombre");
  assert.equal(e.source, "annuaire");
});

test("normaliserResultatsAnnuaire survit a une reponse vide ou malformee", () => {
  assert.deepEqual(normaliserResultatsAnnuaire({}), []);
  assert.deepEqual(normaliserResultatsAnnuaire({ results: [] }), []);
  assert.deepEqual(normaliserResultatsAnnuaire({ results: null as any }), []);
});

test("normaliserResultatsLba accepte les deux formes de reponse", () => {
  // Forme A : tableau direct.
  const formeA = {
    lbaCompanies: [
      {
        company: { name: "Fibre Azur", siret: "11122233300011", naf_label: "Telecoms filaires", url: "https://fibre-azur.fr" },
        place: { city: "NICE", zipCode: "06000", latitude: 43.7, longitude: 7.26 },
        contact: { email: "rh@fibre-azur.fr", phone: "0493112233" }
      }
    ]
  };
  // Forme B : objet { results: [...] }.
  const formeB = { lbaCompanies: { results: formeA.lbaCompanies } };

  for (const [nom, f] of [["A", formeA], ["B", formeB]] as const) {
    const out = normaliserResultatsLba(f as any);
    assert.equal(out.length, 1, `forme ${nom}`);
    assert.equal(out[0].nom, "Fibre Azur");
    assert.equal(out[0].emailContact, "rh@fibre-azur.fr");
    assert.equal(out[0].proposeAlternance, true);
    assert.equal(out[0].siren, "111222333", "siren derive du siret");
  }
});

test("normaliserGeocodage extrait lat/lon dans le bon ordre", () => {
  const fixture = {
    features: [
      {
        geometry: { coordinates: [7.0489, 43.6234] as [number, number] },
        properties: { city: "Valbonne", postcode: "06560" }
      }
    ]
  };
  const c = normaliserGeocodage(fixture);
  assert.ok(c);
  // L'API renvoie [lon, lat] : l'inversion est une erreur classique.
  assert.equal(c!.lat, 43.6234);
  assert.equal(c!.lon, 7.0489);
  assert.equal(c!.codePostal, "06560");

  assert.equal(normaliserGeocodage({}), null);
  assert.equal(normaliserGeocodage({ features: [] }), null);
});

test("fusionner complete les champs manquants sans ecraser par du vide", () => {
  const a = { cle: "siret:1", nom: "X", siret: "1", siteWeb: "https://x.fr", source: "annuaire" as const };
  const b = { cle: "siret:1", nom: "X", siret: "1", siteWeb: "", emailContact: "rh@x.fr", proposeAlternance: true, source: "lba" as const };
  const f = fusionner(a, b);
  assert.equal(f.siteWeb, "https://x.fr", "un champ vide ne doit pas ecraser une valeur");
  assert.equal(f.emailContact, "rh@x.fr");
  assert.equal(f.proposeAlternance, true);
  assert.equal(f.source, "lba");
});

test("fusionnerListes dedoublonne la meme entreprise vue par deux sources", () => {
  const annuaire = [{ cle: "siret:1", nom: "NetSecure", siret: "1", naf: "6202A", source: "annuaire" as const }];
  const lba = [{ cle: "siret:1", nom: "NetSecure", siret: "1", emailContact: "rh@ns.fr", proposeAlternance: true, source: "lba" as const }];
  const out = fusionnerListes([annuaire, lba]);
  assert.equal(out.length, 1);
  assert.equal(out[0].naf, "6202A");
  assert.equal(out[0].emailContact, "rh@ns.fr");
});

test("classer trie par pertinence et ecarte le hors-domaine", () => {
  const centre = { lat: 43.62, lon: 7.05, ville: "Valbonne" };
  const out = classer(
    [
      { cle: "a", nom: "Boulangerie Martin", naf: "1071C", source: "annuaire" },
      { cle: "b", nom: "CyberDefense", naf: "8020Z", nafLibelle: "cybersecurite SOC", lat: 43.62, lon: 7.05, source: "annuaire" },
      { cle: "c", nom: "Info Depannage", naf: "9511Z", source: "annuaire" }
    ],
    centre
  );
  assert.equal(out.length, 2, "la boulangerie doit disparaitre");
  assert.equal(out[0].nom, "CyberDefense", "le plus pertinent en tete");
  assert.ok(typeof out[0].distanceKm === "number");
});

test("normaliserUrlSite nettoie et rejette les URLs invalides", () => {
  assert.equal(normaliserUrlSite("netsecure.fr"), "https://netsecure.fr");
  assert.equal(normaliserUrlSite("https://netsecure.fr/contact?x=1"), "https://netsecure.fr");
  assert.equal(normaliserUrlSite("localhost"), null);
  assert.equal(normaliserUrlSite(""), null);
  assert.equal(normaliserUrlSite("javascript:alert(1)"), null);
});

test("liensInteressants ne garde que les liens internes pertinents", () => {
  const html = `
    <a href="/recrutement">Recrutement</a>
    <a href="/contact">Contact</a>
    <a href="https://facebook.com/contact">FB</a>
    <a href="/produits">Produits</a>
    <a href="mailto:x@y.fr">mail</a>
  `;
  const liens = liensInteressants(html, "https://netsecure.fr");
  assert.ok(liens.includes("https://netsecure.fr/recrutement"));
  assert.ok(liens.includes("https://netsecure.fr/contact"));
  assert.ok(!liens.some((l) => l.includes("facebook")), "lien externe exclu");
  assert.ok(!liens.some((l) => l.includes("produits")), "lien non pertinent exclu");
});

import { messageErreurSmtp } from "../src/lib/mailer";

test("messageErreurSmtp traduit les pannes SMTP en conseil actionnable", () => {
  const mauvaisMdp = messageErreurSmtp(new Error("Invalid login: 535-5.7.8 Username and Password not accepted"));
  assert.match(mauvaisMdp, /mot de passe d'application/i);

  const reseau = messageErreurSmtp(new Error("Connection timeout"));
  assert.match(reseau, /smtp\.gmail\.com/i);
  assert.match(reseau, /pare-feu|GMAIL_USER/i);

  const quota = messageErreurSmtp(new Error("Daily user sending quota exceeded"));
  assert.match(quota, /[Qq]uota/);

  // Une erreur inconnue doit etre transmise telle quelle, pas avalee.
  assert.equal(messageErreurSmtp(new Error("boom inattendu")), "boom inattendu");
});
