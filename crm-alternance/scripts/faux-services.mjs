// Serveurs locaux imitant les services externes, pour eprouver la chaine
// complete sans dependre du reseau. Usage : node scripts/faux-services.mjs
import { createServer } from "node:http";
import { createServer as createTcp } from "node:net";

// --- API Adresse (4101) ---
createServer((req, res) => {
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({
    features: [{
      geometry: { coordinates: [7.0489, 43.6234] },
      properties: { city: "Valbonne", postcode: "06560", label: "Sophia Antipolis" }
    }]
  }));
}).listen(4101, () => console.log("API Adresse      -> 4101"));

// --- Annuaire des entreprises (4102) ---
const ENTREPRISES = [
  ["NETSECURE AZUR", "6202A", "Conseil en systèmes et logiciels informatiques", "81234567800012", "VALBONNE", "06560", 43.6234, 7.0489],
  ["FIBRE AZUR TELECOM", "6110Z", "Télécommunications filaires", "11122233300011", "NICE", "06000", 43.7102, 7.2620],
  ["SOPHIA INFOGERANCE", "6203Z", "Gestion d'installations informatiques", "44455566600022", "BIOT", "06410", 43.6280, 7.0950],
  ["AZUR CLOUD DATACENTER", "6311Z", "Traitement de données, hébergement", "77788899900033", "MOUGINS", "06250", 43.6000, 7.0000],
  ["BOULANGERIE DU COIN", "1071C", "Fabrication de pain et pâtisserie", "99900011100044", "ANTIBES", "06600", 43.5800, 7.1200]
];
createServer((req, res) => {
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({
    total_results: ENTREPRISES.length,
    results: ENTREPRISES.map(([nom, naf, lib, siret, ville, cp, lat, lon]) => ({
      siren: siret.slice(0, 9),
      nom_complet: nom,
      activite_principale: naf,
      libelle_activite_principale: lib,
      tranche_effectif_salarie: "12",
      siege: { siret, adresse: `1 rue de la Tech ${cp} ${ville}`, code_postal: cp, libelle_commune: ville, latitude: lat, longitude: lon }
    }))
  }));
}).listen(4102, () => console.log("Annuaire         -> 4102"));

// --- La Bonne Alternance (4103) ---
createServer((req, res) => {
  res.writeHead(200, { "content-type": "application/json" });
  res.end(JSON.stringify({
    lbaCompanies: {
      results: [{
        company: { name: "NETSECURE AZUR", siret: "81234567800012", naf_label: "Conseil en systèmes et logiciels informatiques", url: "http://127.0.0.1:4999" },
        place: { city: "VALBONNE", zipCode: "06560", latitude: 43.6234, longitude: 7.0489 },
        contact: { email: "contact@netsecure-azur.fr" }
      }]
    }
  }));
}).listen(4103, () => console.log("Bonne Alternance -> 4103"));

// --- Faux Groq, compatible OpenAI (4104) ---
const EMAIL = `Candidature alternance Réseaux & Cybersécurité - rentrée 2026
Bonjour,

Vous intégrez des architectures réseau et de la cybersécurité pour les PME de la Côte d'Azur, et c'est exactement le terrain sur lequel je veux me former.

Je suis en 3e année de BUT Réseaux & Télécommunications à Sophia Antipolis et je cherche une alternance en réseau et cybersécurité pour la rentrée 2026, en rythme une semaine en entreprise et une semaine à l'école.

Votre polyvalence entre le réseau et la partie sécurité m'attire : c'est l'environnement où je monterai en compétences le plus vite. J'ai déjà monté un scanner de vulnérabilités qui orchestre Nmap, Nikto et GoBuster.

Mon CV est en pièce jointe et mon portfolio est ici : https://spalexandre13.github.io/Portfolio/
Je reste disponible pour un échange.

Bien cordialement,
Alexandre`;

const CV = JSON.stringify({
  titre_cv: "Alternant Réseaux & Télécoms - Spécialisation Cybersécurité",
  top_4_competences: [
    "Firewalling (Cisco ASA, pfSense, iptables)",
    "Pentest & recon (Kali, Nmap, Metasploit, Burp Suite)",
    "Switching avancé (VLAN, STP, LACP, HSRP)",
    "Administration Linux (Debian, Ubuntu)"
  ]
});

createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    let contenu = "Intégrateur réseau et cybersécurité pour les PME de la Côte d'Azur.";
    if (/json_object/.test(body)) contenu = CV;
    else if (/Rédiger le corps d'un email/.test(body)) contenu = EMAIL;
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({
      id: "faux", object: "chat.completion", model: "faux",
      choices: [{ index: 0, message: { role: "assistant", content: contenu }, finish_reason: "stop" }]
    }));
  });
}).listen(4104, () => console.log("Groq (simule)    -> 4104"));

// --- SMTP minimal qui capture le message (1025) ---
createTcp((sock) => {
  let donnees = false, message = "";
  sock.write("220 localhost SMTP\r\n");
  sock.on("data", (buf) => {
    const txt = buf.toString();
    if (donnees) {
      message += txt;
      if (/\r\n\.\r\n/.test(message)) {
        donnees = false;
        const objet = (message.match(/^Subject: (.*)$/m) ?? [])[1] ?? "?";
        const to = (message.match(/^To: (.*)$/m) ?? [])[1] ?? "?";
        const cc = (message.match(/^Cc: (.*)$/m) ?? [])[1] ?? "-";
        const pj = (message.match(/filename="?([^"\r\n]+)"?/) ?? [])[1] ?? "-";
        console.log(`MAIL RECU | to=${to} | cc=${cc} | objet=${objet} | pj=${pj} | ${message.length} octets`);
        sock.write("250 OK\r\n");
      }
      return;
    }
    for (const ligne of txt.split("\r\n").filter(Boolean)) {
      if (/^EHLO|^HELO/i.test(ligne)) sock.write("250-localhost\r\n250 AUTH PLAIN LOGIN\r\n");
      else if (/^AUTH/i.test(ligne)) sock.write("235 OK\r\n");
      else if (/^MAIL FROM|^RCPT TO/i.test(ligne)) sock.write("250 OK\r\n");
      else if (/^DATA/i.test(ligne)) { donnees = true; sock.write("354 Go\r\n"); }
      else if (/^QUIT/i.test(ligne)) { sock.write("221 Bye\r\n"); sock.end(); }
      else sock.write("250 OK\r\n");
    }
  });
  sock.on("error", () => {});
}).listen(1025, () => console.log("SMTP (capture)   -> 1025"));

console.log("Faux services prets.");
