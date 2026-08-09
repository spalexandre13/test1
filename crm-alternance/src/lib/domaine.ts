// Scoring de pertinence d'une entreprise pour un profil BUT R&T (reseau / cyber / systemes).
// Fonctions PURES -> testables sans reseau.

export type SignalPertinence = { libelle: string; points: number };

export type ScorePertinence = {
  score: number; // 0-100
  categorie: "cyber" | "reseau" | "cloud" | "it-global" | "telecom" | "hors-domaine";
  signaux: SignalPertinence[];
};

// Codes NAF/APE reellement pertinents, avec leur poids.
// Source : nomenclature INSEE NAF rev.2.
export const NAF_PERTINENTS: Record<string, { points: number; libelle: string; cat: ScorePertinence["categorie"] }> = {
  "6110Z": { points: 30, libelle: "Telecommunications filaires", cat: "telecom" },
  "6120Z": { points: 30, libelle: "Telecommunications sans fil", cat: "telecom" },
  "6130Z": { points: 25, libelle: "Telecommunications par satellite", cat: "telecom" },
  "6190Z": { points: 28, libelle: "Autres activites de telecommunication", cat: "telecom" },
  "6201Z": { points: 18, libelle: "Programmation informatique", cat: "it-global" },
  "6202A": { points: 32, libelle: "Conseil en systemes et logiciels informatiques", cat: "it-global" },
  "6202B": { points: 30, libelle: "Tierce maintenance de systemes", cat: "it-global" },
  "6203Z": { points: 35, libelle: "Gestion d'installations informatiques (infogerance)", cat: "it-global" },
  "6209Z": { points: 30, libelle: "Autres activites informatiques", cat: "it-global" },
  "6311Z": { points: 28, libelle: "Traitement de donnees, hebergement", cat: "cloud" },
  "6312Z": { points: 15, libelle: "Portails Internet", cat: "cloud" },
  "2630Z": { points: 25, libelle: "Fabrication d'equipements de communication", cat: "telecom" },
  "2620Z": { points: 18, libelle: "Fabrication d'ordinateurs et equipements peripheriques", cat: "it-global" },
  "4321A": { points: 22, libelle: "Travaux d'installation electrique / reseaux", cat: "reseau" },
  "8020Z": { points: 30, libelle: "Activites liees aux systemes de securite", cat: "cyber" },
  "7112B": { points: 15, libelle: "Ingenierie, etudes techniques", cat: "it-global" },
  "9511Z": { points: 12, libelle: "Reparation d'ordinateurs et equipements", cat: "it-global" },
  "4652Z": { points: 12, libelle: "Commerce de gros de composants electroniques", cat: "telecom" },
  "4741Z": { points: 8, libelle: "Commerce de detail d'ordinateurs", cat: "it-global" }
};

type MotCle = { mots: string[]; points: number; cat: ScorePertinence["categorie"]; libelle: string };

// Les mots sont compares sur du texte normalise (sans accents, minuscule).
const MOTS_CLES: MotCle[] = [
  { mots: ["cybersecurite", "cyber securite", "cyber"], points: 25, cat: "cyber", libelle: "Cybersecurite" },
  { mots: ["pentest", "audit de securite", "test d'intrusion", "intrusion", "offensive"], points: 22, cat: "cyber", libelle: "Securite offensive" },
  { mots: ["soc", "siem", "edr", "xdr", "supervision securite"], points: 22, cat: "cyber", libelle: "SOC / detection" },
  { mots: ["firewall", "pare-feu", "fortinet", "palo alto", "stormshield", "checkpoint"], points: 20, cat: "cyber", libelle: "Securite reseau" },
  { mots: ["rssi", "ssi", "anssi", "iso 27001", "nis2", "rgpd"], points: 15, cat: "cyber", libelle: "Gouvernance SSI" },

  { mots: ["reseau", "reseaux", "networking"], points: 22, cat: "reseau", libelle: "Reseaux" },
  { mots: ["cisco", "juniper", "aruba", "hp networking", "mikrotik"], points: 20, cat: "reseau", libelle: "Constructeur reseau" },
  { mots: ["lan", "wan", "sd-wan", "sdwan", "vpn", "mpls", "bgp", "routage"], points: 20, cat: "reseau", libelle: "Technologies reseau" },
  { mots: ["fibre", "ftth", "cablage", "courant faible", "wifi"], points: 18, cat: "reseau", libelle: "Infrastructure physique" },

  { mots: ["infogerance", "infogere", "managed services", "msp"], points: 22, cat: "it-global", libelle: "Infogerance" },
  { mots: ["cloud", "aws", "azure", "gcp", "openstack", "kubernetes"], points: 18, cat: "cloud", libelle: "Cloud" },
  { mots: ["datacenter", "data center", "hebergement", "colocation"], points: 18, cat: "cloud", libelle: "Datacenter / hebergement" },
  { mots: ["virtualisation", "vmware", "proxmox", "hyper-v"], points: 16, cat: "cloud", libelle: "Virtualisation" },

  { mots: ["systeme", "systemes", "sysadmin", "administration systeme", "windows server", "active directory", "linux"], points: 16, cat: "it-global", libelle: "Administration systeme" },
  { mots: ["telecom", "telecoms", "telephonie", "voip", "toip", "operateur"], points: 20, cat: "telecom", libelle: "Telecoms" },
  { mots: ["iot", "lora", "lorawan", "m2m", "objets connectes"], points: 16, cat: "telecom", libelle: "IoT / LPWAN" },
  { mots: ["integrateur", "integration", "infrastructure", "informatique", "it"], points: 12, cat: "it-global", libelle: "Integration IT" },
  { mots: ["esn", "ssii"], points: 14, cat: "it-global", libelle: "ESN" },
  { mots: ["support", "helpdesk", "assistance"], points: 6, cat: "it-global", libelle: "Support" }
];

export function normaliser(texte: string): string {
  return texte
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export type EntreeScoring = {
  nom: string;
  naf?: string;
  description?: string;
  proposeAlternance?: boolean;
  aContact?: boolean;
  distanceKm?: number;
};

export function scorerEntreprise(e: EntreeScoring): ScorePertinence {
  const signaux: SignalPertinence[] = [];
  const votes: Record<string, number> = {};
  let brut = 0;

  // 1) Code NAF (signal le plus fiable).
  if (e.naf) {
    const code = e.naf.replace(/[.\s]/g, "").toUpperCase();
    const hit = NAF_PERTINENTS[code];
    if (hit) {
      brut += hit.points;
      votes[hit.cat] = (votes[hit.cat] ?? 0) + hit.points;
      signaux.push({ libelle: `NAF ${code} - ${hit.libelle}`, points: hit.points });
    }
  }

  // 2) Mots-cles dans le nom + description.
  const texte = normaliser(`${e.nom} ${e.description ?? ""}`);
  for (const mc of MOTS_CLES) {
    const trouve = mc.mots.find((m) => {
      const mn = normaliser(m);
      // Bornes de mots pour eviter "it" dans "digital" ou "soc" dans "societe".
      return new RegExp(`(^|[^a-z0-9])${mn.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}([^a-z0-9]|$)`).test(texte);
    });
    if (trouve) {
      brut += mc.points;
      votes[mc.cat] = (votes[mc.cat] ?? 0) + mc.points;
      signaux.push({ libelle: mc.libelle, points: mc.points });
    }
  }

  // 3) Bonus operationnels.
  if (e.proposeAlternance) {
    brut += 15;
    signaux.push({ libelle: "Propose de l'alternance", points: 15 });
  }
  if (e.aContact) {
    brut += 10;
    signaux.push({ libelle: "Contact direct disponible", points: 10 });
  }
  if (typeof e.distanceKm === "number") {
    // Proximite : jusqu'a +10 pour du tres proche, 0 au-dela de 50 km.
    const pts = Math.max(0, Math.round(10 - e.distanceKm / 5));
    if (pts > 0) {
      brut += pts;
      signaux.push({ libelle: `Proche (${Math.round(e.distanceKm)} km)`, points: pts });
    }
  }

  const categorie =
    brut === 0
      ? "hors-domaine"
      : ((Object.entries(votes).sort((a, b) => b[1] - a[1])[0]?.[0] ??
          "it-global") as ScorePertinence["categorie"]);

  return {
    score: Math.max(0, Math.min(100, brut)),
    categorie,
    signaux: signaux.sort((a, b) => b.points - a.points)
  };
}

// Distance a vol d'oiseau (Haversine), en km.
export function distanceKm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number }
): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLon = ((b.lon - a.lon) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(la1) * Math.cos(la2);
  return 2 * R * Math.asin(Math.sqrt(h));
}
