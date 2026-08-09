import { test } from "node:test";
import assert from "node:assert/strict";
import { scorerEntreprise, normaliser, distanceKm } from "../src/lib/domaine";

test("normaliser retire accents et casse", () => {
  assert.equal(normaliser("Sécurité Réseaux"), "securite reseaux");
  assert.equal(normaliser("  Télécom   SUD  "), "telecom sud");
});

test("une entreprise cyber score haut et sort en categorie cyber", () => {
  const r = scorerEntreprise({
    nom: "NetSecure",
    naf: "6202A",
    description: "Integrateur cybersecurite, SOC et pentest pour PME"
  });
  assert.ok(r.score >= 70, `score trop bas: ${r.score}`);
  assert.equal(r.categorie, "cyber");
  assert.ok(r.signaux.length >= 3);
});

test("un operateur telecom est classe telecom", () => {
  const r = scorerEntreprise({
    nom: "Fibre Azur",
    naf: "6110Z",
    description: "Operateur fibre optique et telephonie d'entreprise"
  });
  assert.equal(r.categorie, "telecom");
  assert.ok(r.score >= 50, `score: ${r.score}`);
});

test("une boulangerie est hors-domaine avec un score nul", () => {
  const r = scorerEntreprise({
    nom: "Boulangerie du Coin",
    naf: "1071C",
    description: "Fabrication de pain et patisserie fraiche"
  });
  assert.equal(r.score, 0);
  assert.equal(r.categorie, "hors-domaine");
});

test("les bornes de mots evitent les faux positifs", () => {
  // "societe" ne doit pas declencher le mot-cle "soc" (SOC securite).
  const r1 = scorerEntreprise({ nom: "Societe Generale du Batiment", description: "Maconnerie" });
  assert.equal(r1.score, 0, `faux positif: ${JSON.stringify(r1.signaux)}`);

  // "digital" ne doit pas declencher le mot-cle "it".
  const r2 = scorerEntreprise({ nom: "Digital Marketing Studio", description: "Publicite" });
  assert.equal(r2.score, 0, `faux positif: ${JSON.stringify(r2.signaux)}`);
});

test("une entreprise cyber devance une entreprise de support generique", () => {
  const cyber = scorerEntreprise({
    nom: "CyberDefense Sud",
    naf: "8020Z",
    description: "SOC, SIEM, audit de securite et reponse a incident"
  });
  const support = scorerEntreprise({
    nom: "Info Depannage",
    naf: "9511Z",
    description: "Support et helpdesk pour particuliers"
  });
  assert.ok(cyber.score > support.score, `${cyber.score} doit depasser ${support.score}`);
});

test("les bonus alternance / contact / proximite s'appliquent", () => {
  const base = { nom: "Reseau Plus", naf: "6203Z", description: "Infogerance reseau" };
  const nu = scorerEntreprise(base);
  const enrichi = scorerEntreprise({
    ...base,
    proposeAlternance: true,
    aContact: true,
    distanceKm: 5
  });
  assert.ok(enrichi.score > nu.score);
  assert.ok(enrichi.signaux.some((s) => /alternance/i.test(s.libelle)));
  assert.ok(enrichi.signaux.some((s) => /Contact/i.test(s.libelle)));
  assert.ok(enrichi.signaux.some((s) => /Proche/i.test(s.libelle)));
});

test("la proximite ne donne aucun point au-dela de 50 km", () => {
  const base = { nom: "X", naf: "6203Z" };
  const proche = scorerEntreprise({ ...base, distanceKm: 2 });
  const loin = scorerEntreprise({ ...base, distanceKm: 80 });
  assert.ok(proche.score > loin.score);
  assert.ok(!loin.signaux.some((s) => /Proche/i.test(s.libelle)));
});

test("le score est borne a 100", () => {
  const r = scorerEntreprise({
    nom: "Cyber Reseau Telecom Cloud Securite",
    naf: "6203Z",
    description:
      "cybersecurite pentest SOC firewall reseau cisco vpn fibre infogerance cloud datacenter virtualisation systeme telecom iot integrateur esn",
    proposeAlternance: true,
    aContact: true,
    distanceKm: 1
  });
  assert.equal(r.score, 100);
});

test("distanceKm est coherente (Nice - Sophia Antipolis ~ 20 km)", () => {
  const d = distanceKm({ lat: 43.7102, lon: 7.262 }, { lat: 43.6167, lon: 7.0667 });
  assert.ok(d > 12 && d < 25, `distance inattendue: ${d}`);
});

import { verifierTonHumain, analyserEmail, compterMots } from "../src/lib/ton";

test("verifierTonHumain attrape les formules bannies", () => {
  const mauvais = `Bonjour,
J'espere que ce mail vous trouve en bonne sante. En tant que passionne de reseaux,
je suis convaincu que mon profil correspond. Votre synergie m'attire.`;
  const v = verifierTonHumain(mauvais);
  assert.ok(v.length >= 4, `attendu >=4 violations, recu ${v.length}`);
  assert.ok(v.some((x) => /synergie/i.test(x.regle)));
});

test("verifierTonHumain laisse passer un mail naturel", () => {
  const bon = `Bonjour,
Vous intervenez sur l'infogerance reseau des PME de la region, et c'est
exactement le terrain qui m'interesse. Je suis en 3e annee de BUT Reseaux &
Telecommunications a Sophia Antipolis et je cherche une alternance en reseau
et cybersecurite pour la rentree 2026, en rythme une semaine sur deux.
Votre polyvalence entre reseau et systeme est l'environnement ideal pour
monter en competences. Mon CV est joint et mon portfolio est en lien.
Disponible pour en discuter quand vous voulez.
Bien cordialement,
Alexandre`;
  assert.deepEqual(verifierTonHumain(bon), []);
  const a = analyserEmail(bon);
  assert.equal(a.ok, true);
  assert.deepEqual(a.avertissements, [], `avertissements inattendus: ${a.avertissements.join(" | ")}`);
});

test("analyserEmail signale longueur et exces de puces", () => {
  const court = analyserEmail("Bonjour, je cherche une alternance. Merci.");
  assert.ok(court.avertissements.some((x) => /court/i.test(x)));

  const puces = analyserEmail(
    "Bonjour,\n- point un\n- point deux\n- point trois\n- point quatre\n" +
      "texte ".repeat(80)
  );
  assert.ok(puces.avertissements.some((x) => /puces/i.test(x)));
});

test("compterMots ignore les espaces multiples", () => {
  assert.equal(compterMots("  un   deux \n trois "), 3);
});
