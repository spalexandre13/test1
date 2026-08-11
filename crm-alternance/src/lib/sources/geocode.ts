// Geocodage via l'API Adresse (data.gouv.fr), publique et sans cle.
// Surchargeable pour les tests locaux (voir scripts/faux-services.mjs).
const BASE = process.env.API_ADRESSE_URL ?? "https://api-adresse.data.gouv.fr";

export type Coordonnees = {
  lat: number;
  lon: number;
  ville: string;
  codePostal?: string;
  /** Confiance renvoyee par l'API, entre 0 et 1. */
  score: number;
  /** Libelle complet retenu, pour que l'utilisateur puisse verifier. */
  libelle: string;
  /** Rempli quand le resultat est douteux : la recherche portera au mauvais endroit. */
  avertissement?: string;
};

type ReponseGeo = {
  features?: Array<{
    geometry?: { coordinates?: [number, number] };
    properties?: Record<string, any>;
  }>;
};

const SEUIL_CONFIANCE = 0.5;

export function normaliserGeocodage(data: ReponseGeo, requete = ""): Coordonnees | null {
  const f = data?.features?.[0];
  const coords = f?.geometry?.coordinates;
  if (!coords || coords.length < 2) return null;
  const [lon, lat] = coords;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  const props = f?.properties ?? {};
  const ville = String(props.city ?? props.name ?? props.label ?? "");
  const score = Number(props.score ?? 0);
  const libelle = String(props.label ?? ville);

  // Un score faible signifie que l'API a rapproche la requete d'un lieu sans
  // rapport : sans alerte, on chercherait des entreprises a l'autre bout du
  // pays (« Sophia Antipolis » a deja ete rapproche d'une commune du Calvados).
  const avertissement =
    score < SEUIL_CONFIANCE
      ? `Localisation incertaine : « ${requete || ville} » a été interprété comme « ${libelle} »` +
        `${props.postcode ? ` (${props.postcode})` : ""}. Saisis plutôt un code postal ou le nom exact de la commune.`
      : undefined;

  return {
    lat,
    lon,
    ville,
    codePostal: props.postcode ? String(props.postcode) : undefined,
    score,
    libelle,
    avertissement
  };
}

async function interroger(params: URLSearchParams, signal?: AbortSignal): Promise<ReponseGeo> {
  const res = await fetch(`${BASE}/search/?${params.toString()}`, { cache: "no-store", signal });
  if (!res.ok) throw new Error(`API Adresse ${res.status}`);
  return (await res.json()) as ReponseGeo;
}

export async function geocoder(requete: string, signal?: AbortSignal): Promise<Coordonnees | null> {
  const q = requete.trim();
  if (!q) return null;

  // Un code postal donne un resultat exact : on l'exploite en priorite.
  const estCodePostal = /^\d{5}$/.test(q);
  const tentatives: URLSearchParams[] = estCodePostal
    ? [new URLSearchParams({ q, type: "municipality", limit: "1" })]
    : [
        // On vise d'abord une commune : « Sophia Antipolis » est un lieu-dit,
        // pas une commune, et une recherche libre part facilement ailleurs.
        new URLSearchParams({ q, type: "municipality", limit: "1" }),
        new URLSearchParams({ q, limit: "1" })
      ];

  let meilleur: Coordonnees | null = null;
  for (const params of tentatives) {
    const resultat = normaliserGeocodage(await interroger(params, signal), q);
    if (!resultat) continue;
    if (!meilleur || resultat.score > meilleur.score) meilleur = resultat;
    if (meilleur.score >= SEUIL_CONFIANCE) break;
  }
  return meilleur;
}
