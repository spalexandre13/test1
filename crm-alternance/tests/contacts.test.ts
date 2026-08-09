import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emailValide,
  classifierEmail,
  extraireEmails,
  extraireTelephones,
  normaliserTelephone,
  agregerContacts
} from "../src/lib/enrichment/contacts";

test("emailValide rejette le bruit courant", () => {
  assert.equal(emailValide("contact@societe.fr"), true);
  assert.equal(emailValide("rh@integrateur-reseau.com"), true);

  assert.equal(emailValide("logo@2x.png"), false, "asset image");
  assert.equal(emailValide("noreply@societe.fr"), false, "noreply");
  assert.equal(emailValide("no-reply@societe.fr"), false, "no-reply avec tiret");
  assert.equal(emailValide("truc@sentry.io"), false, "tracker");
  assert.equal(emailValide("a@b"), false, "pas de TLD");
  assert.equal(emailValide("nom@example.com"), false, "domaine d'exemple");
  assert.equal(emailValide("1234567890@societe.fr"), false, "local numerique");
});

test("classifierEmail distingue RH / entreprise / autre", () => {
  assert.equal(classifierEmail("recrutement@x.fr").type, "rh");
  assert.equal(classifierEmail("rh@x.fr").type, "rh");
  assert.equal(classifierEmail("alternance@x.fr").type, "rh");
  assert.equal(classifierEmail("jobs@x.fr").type, "rh");

  assert.equal(classifierEmail("contact@x.fr").type, "entreprise");
  assert.equal(classifierEmail("info@x.fr").type, "entreprise");

  assert.equal(classifierEmail("jean.dupont@x.fr").type, "autre");

  // Un email RH doit primer sur un email generique.
  assert.ok(
    classifierEmail("recrutement@x.fr").score > classifierEmail("contact@x.fr").score
  );
});

test("classifierEmail ne confond pas 'societe' avec 'soc' ni 'digital' avec 'it'", () => {
  // Ces local-parts ne doivent PAS etre classes RH.
  assert.notEqual(classifierEmail("societe@x.fr").type, "rh");
  assert.notEqual(classifierEmail("digital@x.fr").type, "rh");
  // "information" ne doit pas matcher via le jeton "info" par prefixe accidentel.
  assert.equal(classifierEmail("information@x.fr").type, "entreprise");
});

test("extraireEmails lit mailto, texte brut et formes obfusquees", () => {
  const html = `
    <a href="mailto:recrutement@netsecure.fr">Nous rejoindre</a>
    <p>Ecrivez a contact@netsecure.fr</p>
    <p>ou rh [at] netsecure [dot] fr</p>
    <img src="banner@2x.png">
  `;
  const res = extraireEmails(html, "https://netsecure.fr/contact");
  const emails = res.map((r) => r.email);

  assert.ok(emails.includes("recrutement@netsecure.fr"));
  assert.ok(emails.includes("contact@netsecure.fr"));
  assert.ok(emails.includes("rh@netsecure.fr"), "email obfusque");
  assert.ok(!emails.some((e) => e.includes("2x.png")), "asset filtre");

  // Le mailto RH doit sortir en tete.
  assert.equal(res[0].email, "recrutement@netsecure.fr");
});

test("normaliserTelephone gere les formats FR", () => {
  assert.equal(normaliserTelephone("04 93 12 34 56"), "+33 4 93 12 34 56");
  assert.equal(normaliserTelephone("04.93.12.34.56"), "+33 4 93 12 34 56");
  assert.equal(normaliserTelephone("+33 4 93 12 34 56"), "+33 4 93 12 34 56");
  assert.equal(normaliserTelephone("0033493123456"), "+33 4 93 12 34 56");
  assert.equal(normaliserTelephone("04-93-12-34-56"), "+33 4 93 12 34 56");

  assert.equal(normaliserTelephone("12345"), null, "trop court");
  assert.equal(normaliserTelephone("00 00 00 00 00"), null, "invalide");
  assert.equal(normaliserTelephone("08 92 70 12 34"), null, "surtaxe rejete");
});

test("extraireTelephones ignore les suites de chiffres non telephoniques", () => {
  const html = `
    <a href="tel:+33493123456">Appeler</a>
    <p>Tel : 04 93 98 76 54</p>
    <p>SIRET 81234567800012</p>
  `;
  const tels = extraireTelephones(html);
  assert.ok(tels.includes("+33 4 93 12 34 56"));
  assert.ok(tels.includes("+33 4 93 98 76 54"));
  assert.equal(tels.length, 2, `SIRET ne doit pas etre capture, recu: ${tels.join(",")}`);
});

test("agregerContacts privilegie la page recrutement et remplit les 3 champs", () => {
  const res = agregerContacts([
    { url: "https://x.fr/", html: `<a href="mailto:contact@x.fr">c</a> 04 93 11 22 33` },
    { url: "https://x.fr/recrutement", html: `<a href="mailto:rh@x.fr">rh</a>` }
  ]);

  assert.equal(res.emailRh, "rh@x.fr");
  assert.equal(res.emailEntreprise, "contact@x.fr");
  assert.equal(res.telephone, "+33 4 93 11 22 33");
});

test("agregerContacts ne renvoie pas le meme email en RH et en entreprise", () => {
  const res = agregerContacts([
    { url: "https://y.fr/contact", html: `<a href="mailto:recrutement@y.fr">rh</a>` }
  ]);
  assert.equal(res.emailRh, "recrutement@y.fr");
  assert.notEqual(res.emailEntreprise, res.emailRh);
});

test("agregerContacts privilegie le domaine de l'entreprise sur celui de l'agence web", () => {
  // Piege reel : le site contient l'email de l'agence qui l'a realise.
  const res = agregerContacts(
    [
      {
        url: "https://netsecure.fr/contact",
        html: `
          <a href="mailto:contact@agence-web-creative.com">Site realise par</a>
          <a href="mailto:contact@netsecure.fr">Nous ecrire</a>
        `
      }
    ],
    "netsecure.fr"
  );
  assert.equal(res.emailEntreprise, "contact@netsecure.fr");
});

test("agregerContacts gere un sous-domaine www et la casse", () => {
  const res = agregerContacts(
    [{ url: "https://www.NetSecure.fr/", html: `<a href="mailto:RH@NetSecure.FR">RH</a>` }],
    "www.netsecure.fr"
  );
  assert.equal(res.emailRh, "rh@netsecure.fr", "email normalise en minuscules");
});

test("extraireEmails gere JSON-LD, espaces insecables et adresses taguees", () => {
  const html = `
    <script type="application/ld+json">
      {"@type":"Organization","email":"recrutement+alternance@infra-cloud.fr"}
    </script>
    <p>Tel&nbsp;: 04 93 11 22 33</p>
  `;
  const emails = extraireEmails(html).map((e) => e.email);
  assert.ok(
    emails.includes("recrutement+alternance@infra-cloud.fr"),
    `attendu l'email tague, recu: ${emails.join(",")}`
  );

  const tels = extraireTelephones(html);
  assert.ok(
    tels.includes("+33 4 93 11 22 33"),
    `espace insecable mal gere, recu: ${tels.join(",")}`
  );
});

test("extraireTelephones ne capture pas une date ni un prix", () => {
  const html = `<p>Depuis 2015. Tarif 04 euros. Appelez le 04 93 44 55 66</p>`;
  const tels = extraireTelephones(html);
  assert.deepEqual(tels, ["+33 4 93 44 55 66"]);
});

test("agregerContacts renvoie des champs vides plutot que du bruit", () => {
  const res = agregerContacts([{ url: "https://vide.fr/", html: `<p>Aucun contact ici</p>` }]);
  assert.equal(res.emailRh, undefined);
  assert.equal(res.emailEntreprise, undefined);
  assert.equal(res.telephone, undefined);
  assert.deepEqual(res.tousEmails, []);
});
