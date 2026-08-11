// Orchestrateur de recherche : annuaire + LBA -> fusion -> scoring -> tri.
import { chercherAnnuaire, NAF_CIBLES, departementDepuisCodePostal } from "./sources/annuaire";
import { chercherLba } from "./sources/lba";
import { geocoder, type Coordonnees } from "./sources/geocode";
import type { EntrepriseBrute } from "./sources/types";
import { scorerEntreprise, distanceKm, type ScorePertinence } from "./domaine";

export type ResultatRecherche = EntrepriseBrute & {
  pertinence: ScorePertinence;
  distanceKm?: number;
};

// Fusionne deux fiches de la meme entreprise en gardant l'info la plus riche.
export function fusionner(a: EntrepriseBrute, b: EntrepriseBrute): EntrepriseBrute {
  return {
    ...a,
    ...Object.fromEntries(Object.entries(b).filter(([, v]) => v !== undefined && v !== "")),
    // Un seul "true" suffit pour marquer l'alternance.
    proposeAlternance: a.proposeAlternance || b.proposeAlternance,
    // On conserve la source la plus informative pour l'affichage.
    source: a.source === "lba" || b.source === "lba" ? "lba" : a.source
  } as EntrepriseBrute;
}

export function fusionnerListes(listes: EntrepriseBrute[][]): EntrepriseBrute[] {
  const parCle = new Map<string, EntrepriseBrute>();
  for (const liste of listes) {
    for (const e of liste) {
      const existant = parCle.get(e.cle);
      parCle.set(e.cle, existant ? fusionner(existant, e) : e);
    }
  }
  return [...parCle.values()];
}

export function classer(
  entreprises: EntrepriseBrute[],
  centre?: Coordonnees
): ResultatRecherche[] {
  return entreprises
    .map((e) => {
      const d =
        centre && e.lat !== undefined && e.lon !== undefined
          ? distanceKm({ lat: centre.lat, lon: centre.lon }, { lat: e.lat, lon: e.lon })
          : undefined;
      const pertinence = scorerEntreprise({
        nom: e.nom,
        naf: e.naf,
        description: e.nafLibelle,
        proposeAlternance: e.proposeAlternance,
        aContact: Boolean(e.emailContact || e.telephone),
        distanceKm: d,
        effectif: e.effectif
      });
      return { ...e, pertinence, distanceKm: d };
    })
    .filter((e) => e.pertinence.score > 0)
    .sort((a, b) => b.pertinence.score - a.pertinence.score);
}

export type OptionsRecherche = {
  ville: string;
  rayonKm?: number;
  naf?: string[];
  limite?: number;
};

export type RapportRecherche = {
  centre: Coordonnees | null;
  resultats: ResultatRecherche[];
  sourcesEnEchec: Array<{ source: string; raison: string }>;
  /** Localisation douteuse : la recherche porterait au mauvais endroit. */
  avertissement?: string;
};

export async function rechercher(opts: OptionsRecherche): Promise<RapportRecherche> {
  const sourcesEnEchec: Array<{ source: string; raison: string }> = [];

  let centre: Coordonnees | null = null;
  try {
    centre = await geocoder(opts.ville);
  } catch (e) {
    sourcesEnEchec.push({
      source: "api-adresse",
      raison: e instanceof Error ? e.message : "erreur inconnue"
    });
  }

  // Les deux sources sont interrogees en parallele ; l'echec de l'une ne doit
  // pas vider le resultat de l'autre.
  const [annuaire, lba] = await Promise.allSettled([
    // Un seul code postal est trop restrictif : on ratisse le departement et
    // c'est le score de proximite qui remet les plus proches en tete.
    chercherAnnuaire({
      departement: departementDepuisCodePostal(centre?.codePostal),
      codePostal: departementDepuisCodePostal(centre?.codePostal) ? undefined : centre?.codePostal,
      naf: opts.naf ?? NAF_CIBLES,
      perPage: 25,
      pages: 6
    }),
    // L'API publique de La Bonne Alternance ne repond plus sans cle : on ne
    // l'interroge que si LBA_API_KEY est renseigne, pour ne pas afficher un
    // echec a chaque recherche alors que la source est facultative.
    centre && process.env.LBA_API_KEY
      ? chercherLba({ lat: centre.lat, lon: centre.lon, rayonKm: opts.rayonKm ?? 30 })
      : Promise.resolve([])
  ]);

  const listes: EntrepriseBrute[][] = [];
  if (annuaire.status === "fulfilled") listes.push(annuaire.value);
  else sourcesEnEchec.push({ source: "annuaire-entreprises", raison: String(annuaire.reason) });

  if (lba.status === "fulfilled") listes.push(lba.value);
  else sourcesEnEchec.push({ source: "la-bonne-alternance", raison: String(lba.reason) });

  // Sans coordonnees, La Bonne Alternance n'a pas pu etre interrogee du tout :
  // il faut le dire plutot que de laisser croire a une absence de resultats.
  if (!centre) {
    sourcesEnEchec.push({
      source: "la-bonne-alternance",
      raison: "Ignorée : le géocodage de la ville a échoué, aucune coordonnée disponible."
    });
    sourcesEnEchec.push({
      source: "périmètre",
      raison: "Sans géocodage, la recherche annuaire n'est pas limitée à ta ville."
    });
  }

  const resultats = classer(fusionnerListes(listes), centre ?? undefined).slice(
    0,
    opts.limite ?? 40
  );

  return { centre, resultats, sourcesEnEchec, avertissement: centre?.avertissement };
}
