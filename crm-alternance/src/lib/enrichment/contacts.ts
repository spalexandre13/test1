// Extraction et classification des contacts (emails + telephones) depuis du HTML.
// Toutes les fonctions de ce fichier sont PURES -> testables sans reseau.

export type TypeEmail = "rh" | "entreprise" | "autre";

export type EmailTrouve = {
  email: string;
  type: TypeEmail;
  score: number; // plus haut = plus pertinent pour une candidature
  source: string; // page d'ou il vient
};

export type ContactsExtraits = {
  emailRh?: string;
  emailEntreprise?: string;
  telephone?: string;
  tousEmails: EmailTrouve[];
  tousTelephones: string[];
};

// --- Emails ---------------------------------------------------------------

// Parties locales typiquement RH (ordre = priorite decroissante).
const LOCAL_RH = [
  "recrutement", "recrutements", "recrute", "candidature", "candidatures",
  "alternance", "apprentissage", "stage", "stages",
  "rh", "drh", "rrh", "grh", "hr",
  "emploi", "emplois", "job", "jobs", "carriere", "carrieres", "career", "careers",
  "talent", "talents", "recruiting", "recruitment"
];

// Parties locales "entreprise generique".
const LOCAL_ENTREPRISE = [
  "contact", "info", "infos", "information", "accueil", "hello", "bonjour",
  "societe", "direction", "secretariat", "administration", "admin",
  "commercial", "commerce", "support", "sav", "service"
];

// Adresses a rejeter systematiquement.
const LOCAL_BLOQUE = [
  "noreply", "no-reply", "nepasrepondre", "ne-pas-repondre", "donotreply",
  "postmaster", "mailer-daemon", "abuse", "bounce", "bounces",
  "example", "test", "votre-email", "votreemail", "email", "nom", "prenom"
];

// Domaines de faux positifs (trackers, CDN, exemples, hebergeurs).
const DOMAINE_BLOQUE = [
  "example.com", "example.org", "domain.com", "email.com", "site.com",
  "sentry.io", "sentry-next.wixpress.com", "wixpress.com", "wix.com",
  "godaddy.com", "squarespace.com", "shopify.com",
  "w3.org", "schema.org", "google.com", "googlemail.com",
  "facebook.com", "twitter.com", "linkedin.com",
  "adobe.com", "apple.com", "microsoft.com"
];

// Extensions de fichiers -> signe qu'on a capture un nom d'image/asset.
const EXT_FICHIER = /\.(png|jpe?g|gif|svg|webp|css|js|woff2?|ttf|eot|ico|pdf|mp4)$/i;

const RE_EMAIL = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

export function emailValide(email: string): boolean {
  const e = email.trim().toLowerCase();
  if (e.length > 254 || e.length < 6) return false;
  if (!/^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i.test(e)) return false;

  const [local, domaine] = e.split("@");
  if (!local || !domaine) return false;
  if (local.length > 64) return false;
  if (EXT_FICHIER.test(e)) return false;
  // Un local-part purement numerique long est presque toujours du bruit (ex: hash).
  if (/^\d{6,}$/.test(local)) return false;
  if (DOMAINE_BLOQUE.some((d) => domaine === d || domaine.endsWith("." + d))) return false;
  // On normalise le local-part pour comparer aux mots bloques.
  const localNorm = local.replace(/[._-]/g, "");
  if (LOCAL_BLOQUE.some((b) => localNorm === b.replace(/[._-]/g, ""))) return false;
  return true;
}

export function classifierEmail(email: string): { type: TypeEmail; score: number } {
  const local = email.toLowerCase().split("@")[0] ?? "";
  // On decoupe le local-part en jetons pour eviter que "information" matche "info".
  const jetons = local.split(/[._\-+0-9]+/).filter(Boolean);

  const idxRh = LOCAL_RH.findIndex((m) => jetons.includes(m));
  if (idxRh !== -1) {
    // Priorite decroissante selon la position dans LOCAL_RH.
    return { type: "rh", score: 100 - idxRh };
  }
  const idxEnt = LOCAL_ENTREPRISE.findIndex((m) => jetons.includes(m));
  if (idxEnt !== -1) {
    return { type: "entreprise", score: 60 - idxEnt };
  }
  // prenom.nom@ -> contact nominatif, utile mais moins cible.
  if (/^[a-z]+\.[a-z]+$/.test(local)) return { type: "autre", score: 30 };
  return { type: "autre", score: 10 };
}

export function extraireEmails(html: string, source = ""): EmailTrouve[] {
  const trouves = new Map<string, EmailTrouve>();

  // 1) Liens mailto: (les plus fiables).
  const reMailto = /mailto:([^"'?>\s]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = reMailto.exec(html)) !== null) {
    const brut = decodeURIComponent(m[1]).trim().toLowerCase();
    if (!emailValide(brut)) continue;
    const { type, score } = classifierEmail(brut);
    trouves.set(brut, { email: brut, type, score: score + 15, source }); // bonus mailto
  }

  // 2) Emails en clair dans le texte.
  const texte = html.replace(/<[^>]+>/g, " ");
  const bruts = texte.match(RE_EMAIL) ?? [];
  for (const b of bruts) {
    const e = b.trim().toLowerCase().replace(/[.,;:]$/, "");
    if (!emailValide(e)) continue;
    if (trouves.has(e)) continue;
    const { type, score } = classifierEmail(e);
    trouves.set(e, { email: e, type, score, source });
  }

  // 3) Emails obfusques : "contact [at] societe [dot] fr".
  const reObf = /([a-z0-9._%+-]+)\s*(?:\[at\]|\(at\)|\s+at\s+)\s*([a-z0-9.-]+)\s*(?:\[dot\]|\(dot\)|\s+dot\s+)\s*([a-z]{2,})/gi;
  while ((m = reObf.exec(texte)) !== null) {
    const e = `${m[1]}@${m[2]}.${m[3]}`.toLowerCase();
    if (!emailValide(e) || trouves.has(e)) continue;
    const { type, score } = classifierEmail(e);
    trouves.set(e, { email: e, type, score, source });
  }

  return [...trouves.values()].sort((a, b) => b.score - a.score);
}

// --- Telephones -----------------------------------------------------------

// Formats FR : 01 23 45 67 89 / 01.23.45.67.89 / +33 1 23 45 67 89 / 0033...
const RE_TEL = /(?:\+33|0033|0)\s?[1-9](?:[\s.\-]?\d{2}){4}(?!\d)/g;

export function normaliserTelephone(brut: string): string | null {
  const chiffres = brut.replace(/[^\d+]/g, "").replace(/^\+?0033/, "+33").replace(/^0033/, "+33");
  let national: string;
  if (chiffres.startsWith("+33")) {
    national = chiffres.slice(3);
  } else if (chiffres.startsWith("0")) {
    national = chiffres.slice(1);
  } else {
    return null;
  }
  if (!/^[1-9]\d{8}$/.test(national)) return null;
  // Numeros surtaxes / speciaux peu utiles pour une candidature.
  if (/^8[0-9]/.test(national)) return null;
  const p = national;
  return `+33 ${p[0]} ${p.slice(1, 3)} ${p.slice(3, 5)} ${p.slice(5, 7)} ${p.slice(7, 9)}`;
}

export function extraireTelephones(html: string): string[] {
  const out = new Set<string>();

  // 1) Liens tel: prioritaires.
  const reTel = /tel:([+0-9.\-\s()]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = reTel.exec(html)) !== null) {
    const n = normaliserTelephone(m[1]);
    if (n) out.add(n);
  }

  // 2) Texte brut.
  const texte = html.replace(/<[^>]+>/g, " ");
  const bruts = texte.match(RE_TEL) ?? [];
  for (const b of bruts) {
    const n = normaliserTelephone(b);
    if (n) out.add(n);
  }
  return [...out];
}


// Retire le "www." et met en minuscules pour comparer deux domaines.
export function domaineRacine(hote: string): string {
  return hote.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0].replace(/^www\./, "");
}

// true si l'email appartient au domaine de l'entreprise (ou a un sous-domaine).
export function memeDomaine(email: string, domaine: string): boolean {
  const d = domaineRacine(domaine);
  if (!d) return false;
  const dom = email.toLowerCase().split("@")[1] ?? "";
  return dom === d || dom.endsWith("." + d);
}

// --- Agregation -----------------------------------------------------------

export function agregerContacts(
  pages: Array<{ url: string; html: string }>,
  domainePrefere?: string
): ContactsExtraits {
  const tousEmails: EmailTrouve[] = [];
  const telSet = new Set<string>();

  for (const p of pages) {
    // Une page /recrutement ou /contact merite un bonus de confiance.
    const bonus = /recrut|carrier|carriere|job|emploi|rejoign|talent/i.test(p.url)
      ? 20
      : /contact|mentions|legal|about|propos/i.test(p.url)
        ? 10
        : 0;
    for (const e of extraireEmails(p.html, p.url)) {
      // Un email au domaine de l'entreprise prime largement sur celui d'un
      // prestataire (agence web, hebergeur) cite dans le pied de page.
      const bonusDomaine = domainePrefere && memeDomaine(e.email, domainePrefere) ? 50 : 0;
      tousEmails.push({ ...e, score: e.score + bonus + bonusDomaine });
    }
    for (const t of extraireTelephones(p.html)) telSet.add(t);
  }

  // Dedoublonnage en gardant le meilleur score par email.
  const parEmail = new Map<string, EmailTrouve>();
  for (const e of tousEmails) {
    const prev = parEmail.get(e.email);
    if (!prev || e.score > prev.score) parEmail.set(e.email, e);
  }
  const uniques = [...parEmail.values()].sort((a, b) => b.score - a.score);

  const emailRh = uniques.find((e) => e.type === "rh")?.email;
  const emailEntreprise =
    uniques.find((e) => e.type === "entreprise")?.email ??
    uniques.find((e) => e.email !== emailRh)?.email;

  return {
    emailRh,
    emailEntreprise,
    telephone: [...telSet][0],
    tousEmails: uniques,
    tousTelephones: [...telSet]
  };
}
