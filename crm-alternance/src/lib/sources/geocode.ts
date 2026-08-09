// Geocodage via l'API Adresse (data.gouv.fr), publique et sans cle.
// Surchargeable pour les tests locaux (voir scripts/faux-services.mjs).
const BASE = process.env.API_ADRESSE_URL ?? "https://api-adresse.data.gouv.fr";

export type Coordonnees = { lat: number; lon: number; ville: string; codePostal?: string };

type ReponseGeo = {
  features?: Array<{
    geometry?: { coordinates?: [number, number] };
    properties?: Record<string, any>;
  }>;
};

export function normaliserGeocodage(data: ReponseGeo): Coordonnees | null {
  const f = data?.features?.[0];
  const coords = f?.geometry?.coordinates;
  if (!coords || coords.length < 2) return null;
  const [lon, lat] = coords;
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  return {
    lat,
    lon,
    ville: String(f?.properties?.city ?? f?.properties?.label ?? ""),
    codePostal: f?.properties?.postcode ? String(f.properties.postcode) : undefined
  };
}

export async function geocoder(requete: string, signal?: AbortSignal): Promise<Coordonnees | null> {
  const res = await fetch(
    `${BASE}/search/?q=${encodeURIComponent(requete)}&limit=1`,
    { cache: "no-store", signal }
  );
  if (!res.ok) throw new Error(`API Adresse ${res.status}`);
  return normaliserGeocodage((await res.json()) as ReponseGeo);
}
