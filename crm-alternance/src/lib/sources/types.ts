// Format pivot : toutes les sources sont normalisees vers ce type.
export type EntrepriseBrute = {
  cle: string;              // identifiant de dedoublonnage (siret > siren > nom+cp)
  nom: string;
  siret?: string;
  siren?: string;
  naf?: string;             // code APE normalise, ex "6202A"
  nafLibelle?: string;
  adresse?: string;
  ville?: string;
  codePostal?: string;
  lat?: number;
  lon?: number;
  siteWeb?: string;
  emailContact?: string;
  telephone?: string;
  effectif?: string;
  proposeAlternance?: boolean;
  source: "annuaire" | "lba" | "manuel";
};

export function normaliserNaf(naf?: string | null): string | undefined {
  if (!naf) return undefined;
  const c = naf.replace(/[.\s]/g, "").toUpperCase();
  return /^\d{4}[A-Z]$/.test(c) ? c : undefined;
}

// L'API "recherche-entreprises" attend le format pointe : 62.02A, pas 6202A.
export function nafPourApi(code: string): string {
  const c = code.replace(/[.\s]/g, "").toUpperCase();
  return /^\d{4}[A-Z]$/.test(c) ? `${c.slice(0, 2)}.${c.slice(2)}` : c;
}

export function cleDedoublonnage(e: {
  siret?: string;
  siren?: string;
  nom: string;
  codePostal?: string;
}): string {
  if (e.siret) return `siret:${e.siret}`;
  if (e.siren) return `siren:${e.siren}`;
  return `nom:${e.nom.toLowerCase().replace(/\s+/g, " ").trim()}|${e.codePostal ?? ""}`;
}
