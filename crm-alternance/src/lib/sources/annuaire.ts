// API "Recherche d'entreprises" (annuaire-entreprises.data.gouv.fr).
// Publique, sans cle. Meilleure source pour cibler par code NAF + localisation.
// Doc : https://recherche-entreprises.api.gouv.fr/docs
import { type EntrepriseBrute, normaliserNaf, cleDedoublonnage, nafPourApi } from "./types";

// Surchargeable pour les tests locaux.
const BASE = `${process.env.ANNUAIRE_URL ?? "https://recherche-entreprises.api.gouv.fr"}/search`;

// Codes NAF cibles pour un profil reseaux / telecoms / cyber.
export const NAF_CIBLES = [
  "6202A", "6203Z", "6209Z", "6202B", "6201Z",
  "6110Z", "6120Z", "6190Z",
  "6311Z", "8020Z", "4321A", "2630Z", "7112B"
];

// La reponse de l'API est volontairement typee "large" : on ne veut pas casser
// si un champ optionnel disparait.
type ReponseAnnuaire = {
  results?: Array<Record<string, any>>;
  total_results?: number;
};

export function normaliserResultatsAnnuaire(data: ReponseAnnuaire): EntrepriseBrute[] {
  const rows = Array.isArray(data?.results) ? data.results : [];
  const out: EntrepriseBrute[] = [];

  for (const r of rows) {
    const siege = (r.siege ?? {}) as Record<string, any>;
    const nom =
      r.nom_complet ?? r.nom_raison_sociale ?? siege.nom_complet ?? "";
    if (!nom) continue;

    const codePostal = siege.code_postal ? String(siege.code_postal) : undefined;
    const siret = siege.siret ? String(siege.siret) : undefined;
    const siren = r.siren ? String(r.siren) : undefined;

    const lat = Number(siege.latitude);
    const lon = Number(siege.longitude);

    out.push({
      cle: cleDedoublonnage({ siret, siren, nom, codePostal }),
      nom: String(nom),
      siret,
      siren,
      naf: normaliserNaf(r.activite_principale ?? siege.activite_principale),
      nafLibelle: r.libelle_activite_principale ?? siege.libelle_activite_principale,
      adresse: siege.adresse ? String(siege.adresse) : undefined,
      ville: siege.libelle_commune ? String(siege.libelle_commune) : undefined,
      codePostal,
      lat: Number.isFinite(lat) ? lat : undefined,
      lon: Number.isFinite(lon) ? lon : undefined,
      effectif: r.tranche_effectif_salarie ? String(r.tranche_effectif_salarie) : undefined,
      source: "annuaire"
    });
  }
  return out;
}

export async function chercherAnnuaire(opts: {
  codePostal?: string;
  departement?: string;
  naf?: string[];
  perPage?: number;
  page?: number;
  signal?: AbortSignal;
}): Promise<EntrepriseBrute[]> {
  const params = new URLSearchParams();
  // L'API accepte une liste de codes NAF separes par des virgules.
  params.set("activite_principale", (opts.naf ?? NAF_CIBLES).map(nafPourApi).join(","));
  if (opts.codePostal) params.set("code_postal", opts.codePostal);
  if (opts.departement) params.set("departement", opts.departement);
  params.set("per_page", String(Math.min(opts.perPage ?? 25, 25)));
  params.set("page", String(opts.page ?? 1));
  params.set("etat_administratif", "A"); // uniquement les entreprises actives

  const res = await fetch(`${BASE}?${params.toString()}`, {
    headers: { accept: "application/json" },
    cache: "no-store",
    signal: opts.signal
  });
  if (!res.ok) {
    throw new Error(`Annuaire entreprises ${res.status} : ${await res.text()}`);
  }
  return normaliserResultatsAnnuaire((await res.json()) as ReponseAnnuaire);
}
