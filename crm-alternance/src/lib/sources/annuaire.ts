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
  total_pages?: number;
};

export type PageAnnuaire = {
  entreprises: EntrepriseBrute[];
  totalDisponible: number;
};

export function normaliserResultatsAnnuaire(data: ReponseAnnuaire): EntrepriseBrute[] {
  const rows = Array.isArray(data?.results) ? data.results : [];
  const out: EntrepriseBrute[] = [];

  for (const r of rows) {
    const siege = (r.siege ?? {}) as Record<string, any>;
    // Le filtre code_postal / departement porte sur les ETABLISSEMENTS, pas sur
    // le siege. Sans cette preference, un groupe national dont une agence est
    // a cote de chez soi s'affiche avec l'adresse de son siege a Paris, et la
    // distance calculee est fausse de plusieurs centaines de kilometres.
    const etablissements = Array.isArray(r.matching_etablissements)
      ? (r.matching_etablissements as Array<Record<string, any>>)
      : [];
    const local = etablissements[0] ?? siege;

    const nom = r.nom_complet ?? r.nom_raison_sociale ?? siege.nom_complet ?? "";
    if (!nom) continue;

    const codePostal = local.code_postal ? String(local.code_postal) : undefined;
    const siret = local.siret ? String(local.siret) : siege.siret ? String(siege.siret) : undefined;
    const siren = r.siren ? String(r.siren) : undefined;

    const lat = Number(local.latitude ?? siege.latitude);
    const lon = Number(local.longitude ?? siege.longitude);

    out.push({
      cle: cleDedoublonnage({ siret, siren, nom, codePostal }),
      nom: String(nom),
      siret,
      siren,
      naf: normaliserNaf(r.activite_principale ?? siege.activite_principale),
      nafLibelle: r.libelle_activite_principale ?? siege.libelle_activite_principale,
      adresse: local.adresse ? String(local.adresse) : undefined,
      ville: local.libelle_commune ? String(local.libelle_commune) : undefined,
      codePostal,
      lat: Number.isFinite(lat) ? lat : undefined,
      lon: Number.isFinite(lon) ? lon : undefined,
      effectif: r.tranche_effectif_salarie ? String(r.tranche_effectif_salarie) : undefined,
      source: "annuaire"
    });
  }
  return out;
}

// Le departement se deduit du code postal (Corse mise a part, traitee a part).
export function departementDepuisCodePostal(cp?: string): string | undefined {
  if (!cp || !/^\d{5}$/.test(cp)) return undefined;
  if (cp.startsWith("20")) return undefined; // 2A / 2B : ambigu, on s'abstient
  return cp.startsWith("97") || cp.startsWith("98") ? cp.slice(0, 3) : cp.slice(0, 2);
}

function construireParams(opts: {
  codePostal?: string;
  departement?: string;
  naf?: string[];
  perPage?: number;
  page?: number;
}): URLSearchParams {
  const params = new URLSearchParams();
  // L'API accepte une liste de codes NAF separes par des virgules.
  params.set("activite_principale", (opts.naf ?? NAF_CIBLES).map(nafPourApi).join(","));
  if (opts.codePostal) params.set("code_postal", opts.codePostal);
  if (opts.departement) params.set("departement", opts.departement);
  params.set("per_page", String(Math.min(opts.perPage ?? 25, 25)));
  params.set("page", String(opts.page ?? 1));
  params.set("etat_administratif", "A"); // uniquement les entreprises actives
  // Indispensable : sans cela l'API ne renvoie pas les etablissements qui ont
  // reellement satisfait le filtre geographique.
  params.set("limite_matching_etablissements", "1");

  return params;
}

async function chercherPage(
  opts: { codePostal?: string; departement?: string; naf?: string[]; perPage?: number; page?: number },
  signal?: AbortSignal
): Promise<{ entreprises: EntrepriseBrute[]; total: number }> {
  const res = await fetch(`${BASE}?${construireParams(opts).toString()}`, {
    headers: { accept: "application/json" },
    cache: "no-store",
    signal
  });
  if (!res.ok) {
    throw new Error(`Annuaire entreprises ${res.status} : ${await res.text()}`);
  }
  const data = (await res.json()) as ReponseAnnuaire;
  return {
    entreprises: normaliserResultatsAnnuaire(data),
    total: Number(data.total_results ?? 0)
  };
}

export async function chercherAnnuaire(opts: {
  codePostal?: string;
  departement?: string;
  naf?: string[];
  perPage?: number;
  page?: number;
  /** Nombre de pages a parcourir. L'API classe les grosses structures en tete :
   *  sans plusieurs pages, aucune PME n'apparait jamais dans l'echantillon. */
  pages?: number;
  signal?: AbortSignal;
}): Promise<EntrepriseBrute[]> {
  const nbPages = Math.max(1, Math.min(opts.pages ?? 1, 10));
  const premiere = await chercherPage({ ...opts, page: opts.page ?? 1 }, opts.signal);
  if (nbPages === 1 || premiere.entreprises.length === 0) return premiere.entreprises;

  const perPage = Math.min(opts.perPage ?? 25, 25);
  const pagesRestantes = Math.min(nbPages, Math.ceil(premiere.total / perPage)) - 1;
  if (pagesRestantes <= 0) return premiere.entreprises;

  const suivantes = await Promise.allSettled(
    Array.from({ length: pagesRestantes }, (_, i) =>
      chercherPage({ ...opts, page: (opts.page ?? 1) + i + 1 }, opts.signal)
    )
  );

  const tout = [...premiere.entreprises];
  for (const r of suivantes) {
    if (r.status === "fulfilled") tout.push(...r.value.entreprises);
  }
  // Une meme entreprise peut apparaitre sur deux pages : on dedoublonne ici.
  const parCle = new Map(tout.map((e) => [e.cle, e]));
  return [...parCle.values()];
}
