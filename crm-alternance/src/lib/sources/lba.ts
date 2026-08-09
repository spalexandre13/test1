// API "La Bonne Alternance". Utilisee comme source COMPLEMENTAIRE : elle
// apporte le signal "cette entreprise recrute en alternance" et parfois un
// email de contact, la ou l'annuaire n'a aucune donnee de contact.
//
// Le format de reponse a change entre les versions de l'API ; la normalisation
// ci-dessous accepte plusieurs formes pour ne pas casser silencieusement.
import { type EntrepriseBrute, normaliserNaf, cleDedoublonnage } from "./types";

export const ROME_RT = ["M1810", "M1802", "M1801", "M1805", "I1401", "M1803"];

type ReponseLba = {
  lbaCompanies?: { results?: Array<Record<string, any>> } | Array<Record<string, any>>;
  matchas?: { results?: Array<Record<string, any>> } | Array<Record<string, any>>;
  results?: Array<Record<string, any>>;
};

function versTableau(x: unknown): Array<Record<string, any>> {
  if (Array.isArray(x)) return x as Array<Record<string, any>>;
  if (x && typeof x === "object" && Array.isArray((x as any).results)) {
    return (x as any).results;
  }
  return [];
}

export function normaliserResultatsLba(data: ReponseLba): EntrepriseBrute[] {
  const rows = [
    ...versTableau(data?.lbaCompanies),
    ...versTableau(data?.matchas),
    ...versTableau(data?.results)
  ];

  const out: EntrepriseBrute[] = [];
  for (const raw of rows) {
    const company = (raw.company ?? {}) as Record<string, any>;
    const place = (raw.place ?? {}) as Record<string, any>;
    const contact = (raw.contact ?? {}) as Record<string, any>;

    const nom = company.name ?? raw.name ?? raw.title;
    if (!nom) continue;

    const siret = company.siret ? String(company.siret) : undefined;
    const codePostal = place.zipCode ? String(place.zipCode) : undefined;
    const lat = Number(place.latitude ?? place.lat);
    const lon = Number(place.longitude ?? place.lng ?? place.lon);

    out.push({
      cle: cleDedoublonnage({ siret, nom: String(nom), codePostal }),
      nom: String(nom),
      siret,
      siren: siret ? siret.slice(0, 9) : undefined,
      naf: normaliserNaf(company.naf_code ?? company.naf),
      nafLibelle: company.naf_label ? String(company.naf_label) : undefined,
      adresse: place.fullAddress ? String(place.fullAddress) : undefined,
      ville: place.city ? String(place.city) : undefined,
      codePostal,
      lat: Number.isFinite(lat) ? lat : undefined,
      lon: Number.isFinite(lon) ? lon : undefined,
      siteWeb: company.url ? String(company.url) : undefined,
      emailContact: contact.email ? String(contact.email) : undefined,
      telephone: contact.phone ? String(contact.phone) : undefined,
      effectif: company.size ? String(company.size) : undefined,
      proposeAlternance: true, // c'est tout l'interet de cette source
      source: "lba"
    });
  }
  return out;
}

export async function chercherLba(opts: {
  lat: number;
  lon: number;
  rayonKm?: number;
  romes?: string[];
  signal?: AbortSignal;
}): Promise<EntrepriseBrute[]> {
  const params = new URLSearchParams({
    romes: (opts.romes ?? ROME_RT).join(","),
    latitude: String(opts.lat),
    longitude: String(opts.lon),
    radius: String(opts.rayonKm ?? 30),
    caller: "crm-alternance-local"
  });

  const headers: Record<string, string> = { accept: "application/json" };
  if (process.env.LBA_API_KEY) headers.authorization = `Bearer ${process.env.LBA_API_KEY}`;

  const res = await fetch(
    `https://labonnealternance.apprentissage.beta.gouv.fr/api/v1/jobs/company?${params}`,
    { headers, cache: "no-store", signal: opts.signal }
  );
  if (!res.ok) throw new Error(`La Bonne Alternance ${res.status} : ${await res.text()}`);
  return normaliserResultatsLba((await res.json()) as ReponseLba);
}
