// Garde-fou "anti-IA" : detecte les formules bannies dans un email genere.
// Fonctions PURES -> testables sans reseau.

export type ViolationTon = { extrait: string; regle: string };

const FORMULES_INTERDITES: Array<{ re: RegExp; regle: string }> = [
  { re: /j'esp[eè]re que ce (courriel|mail|message) vous trouve/i, regle: "Formule d'ouverture artificielle" },
  { re: /en tant que passionn[ée]/i, regle: "Cliche « en tant que passionné »" },
  { re: /je suis convaincu(e)? que mon profil/i, regle: "Cliche « je suis convaincu que mon profil »" },
  { re: /je me permets de vous contacter/i, regle: "Formule ampoulee « je me permets »" },
  { re: /\bsynergie/i, regle: "Jargon « synergie »" },
  { re: /\bcatalyseur/i, regle: "Jargon « catalyseur »" },
  { re: /paysage num[ée]rique/i, regle: "Jargon « paysage numerique »" },
  { re: /fort de mon exp[ée]rience/i, regle: "Cliche « fort de mon experience »" },
  { re: /n'h[ée]sitez pas [aà] me contacter pour (toute )?(information|renseignement)/i, regle: "Cloture generique" },
  { re: /dans un monde en constante [ée]volution/i, regle: "Ouverture generique" },
  { re: /votre entreprise leader/i, regle: "Flatterie generique" }
];

export function verifierTonHumain(texte: string): ViolationTon[] {
  const violations: ViolationTon[] = [];
  for (const f of FORMULES_INTERDITES) {
    const m = texte.match(f.re);
    if (m) violations.push({ extrait: m[0], regle: f.regle });
  }
  return violations;
}

// Un mail de candidature doit rester court : 100-150 mots vises.
export function compterMots(texte: string): number {
  return texte.trim().split(/\s+/).filter(Boolean).length;
}

export type AnalyseTon = {
  ok: boolean;
  violations: ViolationTon[];
  nbMots: number;
  avertissements: string[];
};

export function analyserEmail(corps: string): AnalyseTon {
  const violations = verifierTonHumain(corps);
  const nbMots = compterMots(corps);
  const avertissements: string[] = [];

  if (nbMots > 190) avertissements.push(`Trop long (${nbMots} mots, vise 100-150).`);
  if (nbMots < 70) avertissements.push(`Trop court (${nbMots} mots, vise 100-150).`);
  // Une avalanche de puces fait "genere par IA".
  const puces = (corps.match(/^\s*[-*•]\s+/gm) ?? []).length;
  if (puces > 3) avertissements.push(`${puces} puces : trop de listes pour un mail humain.`);

  return { ok: violations.length === 0, violations, nbMots, avertissements };
}
