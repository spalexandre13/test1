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
  // 8020Z couvre les alarmes et la videosurveillance : c'est de la securite
  // PHYSIQUE. La classer en cyber faisait remonter Verisura et Securitas en
  // tete d'une recherche cybersecurite.
  "8020Z": { points: 8, libelle: "Systemes de securite (alarme, videosurveillance)", cat: "it-global" },
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

// Eliminatoires : un point de vente d'operateur porte le meme code NAF qu'un
// exploitant de reseau et son nom contient souvent « reseau » ou « telecom »,
// ce qui suffirait a le faire remonter. Aucune boutique ne propose de poste
// technique : on l'ecarte sans discuter plutot que de la penaliser.
const MOTS_ELIMINATOIRES = [
  "store", "boutique", "magasin", "club", "clubs",
  "interim", "travail temporaire", "placement"
];

// Penalisants : le doute reste permis (un grossiste en composants peut
// proposer de la technique), on retire des points sans exclure.
const MOTS_PENALISANTS: Array<{ mots: string[]; points: number; libelle: string }> = [
  { mots: ["distribution", "commerce", "vente"], points: -20, libelle: "Activite commerciale" },
  { mots: ["immobilier", "assurance", "banque"], points: -25, libelle: "Hors informatique" }
];

// Tranches d'effectif INSEE. Une candidature spontanee aboutit bien plus
// souvent dans une PME structuree que dans un groupe de plusieurs milliers.
const BONUS_EFFECTIF: Record<string, { points: number; libelle: string }> = {
  "00": { points: -8, libelle: "Aucun salarie" },
  "01": { points: -5, libelle: "1 a 2 salaries" },
  "02": { points: 0, libelle: "3 a 5 salaries" },
  "03": { points: 4, libelle: "6 a 9 salaries" },
  "11": { points: 10, libelle: "10 a 19 salaries" },
  "12": { points: 12, libelle: "20 a 49 salaries" },
  "21": { points: 12, libelle: "50 a 99 salaries" },
  "22": { points: 10, libelle: "100 a 199 salaries" },
  "31": { points: 8, libelle: "200 a 249 salaries" },
  "32": { points: 6, libelle: "250 a 499 salaries" },
  "41": { points: 2, libelle: "500 a 999 salaries" },
  "42": { points: 0, libelle: "1000 a 1999 salaries" },
  "51": { points: -5, libelle: "2000 a 4999 salaries" },
  "52": { points: -8, libelle: "5000 a 9999 salaries" },
  "53": { points: -10, libelle: "10 000 salaries et plus" }
};

/** Libelle lisible d'une tranche d'effectif INSEE. */
export function libelleEffectif(code?: string): string | undefined {
  if (!code) return undefined;
  return BONUS_EFFECTIF[code]?.libelle;
}

export type EntreeScoring = {
  nom: string;
  naf?: string;
  description?: string;
  proposeAlternance?: boolean;
  aContact?: boolean;
  distanceKm?: number;
  /** Code de tranche d'effectif INSEE (ex. "12" pour 20 a 49 salaries). */
  effectif?: string;
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

  const contient = (mot: string) =>
    new RegExp(`(^|[^a-z0-9])${normaliser(mot)}([^a-z0-9]|$)`).test(texte);

  if (MOTS_ELIMINATOIRES.some(contient)) {
    return { score: 0, categorie: "hors-domaine", signaux: [] };
  }

  for (const d of MOTS_PENALISANTS) {
    if (d.mots.some(contient)) {
      brut += d.points;
      signaux.push({ libelle: d.libelle, points: d.points });
    }
  }

  if (brut <= 0) {
    return { score: 0, categorie: "hors-domaine", signaux: [] };
  }

  // Les bonus qui suivent ne qualifient PAS le metier : sans le moindre signal
  // NAF ou mot-cle, l'entreprise est hors-domaine et ne doit pas remonter
  // (sinon une boulangerie proche apparaitrait dans une recherche reseau).
  if (brut === 0) {
    return { score: 0, categorie: "hors-domaine", signaux: [] };
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
  if (e.effectif) {
    const tranche = BONUS_EFFECTIF[e.effectif];
    if (tranche && tranche.points !== 0) {
      brut += tranche.points;
      signaux.push({ libelle: tranche.libelle, points: tranche.points });
    }
  }

  if (typeof e.distanceKm === "number") {
    // Proximite : jusqu'a +10 pour du tres proche, 0 au-dela de 50 km.
    const pts = Math.max(0, Math.round(10 - e.distanceKm / 5));
    if (pts > 0) {
      brut += pts;
      signaux.push({ libelle: `Proche (${Math.round(e.distanceKm)} km)`, points: pts });
    }
  }

  const categorie = (Object.entries(votes).sort((a, b) => b[1] - a[1])[0]?.[0] ??
    "it-global") as ScorePertinence["categorie"];

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
