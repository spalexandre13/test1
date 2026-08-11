"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Signal = { libelle: string; points: number };
type Resultat = {
  cle: string;
  nom: string;
  siret?: string;
  siren?: string;
  naf?: string;
  nafLibelle?: string;
  adresse?: string;
  ville?: string;
  codePostal?: string;
  latitude?: number;
  longitude?: number;
  lat?: number;
  lon?: number;
  siteWeb?: string;
  emailContact?: string;
  telephone?: string;
  proposeAlternance?: boolean;
  effectif?: string;
  source: string;
  distanceKm?: number;
  pertinence: { score: number; categorie: string; signaux: Signal[] };
};

type Contacts = { emailRh?: string; emailEntreprise?: string; telephone?: string };

// Tranches d'effectif INSEE, pour afficher la taille plutot qu'un code.
const LIBELLE_EFFECTIF: Record<string, string> = {
  "00": "0 salarié", "01": "1-2 salariés", "02": "3-5 salariés", "03": "6-9 salariés",
  "11": "10-19 salariés", "12": "20-49 salariés", "21": "50-99 salariés",
  "22": "100-199 salariés", "31": "200-249 salariés", "32": "250-499 salariés",
  "41": "500-999 salariés", "42": "1000-1999 salariés", "51": "2000-4999 salariés",
  "52": "5000-9999 salariés", "53": "10000+ salariés"
};

const COULEUR_CAT: Record<string, string> = {
  cyber: "pill pill-red",
  reseau: "pill pill-blue",
  cloud: "pill pill-green",
  telecom: "pill pill-amber",
  "it-global": "pill pill-slate"
};

export default function SourcingPage() {
  const router = useRouter();
  const [ville, setVille] = useState("Sophia Antipolis");
  const [rayon, setRayon] = useState(30);
  const [resultats, setResultats] = useState<Resultat[]>([]);
  const [echecs, setEchecs] = useState<Array<{ source: string; raison: string }>>([]);
  const [avertissement, setAvertissement] = useState<string | null>(null);
  const [centre, setCentre] = useState<{ libelle: string; codePostal?: string } | null>(null);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  // Etat par entreprise : id en base, contacts trouves, occupation.
  const [enBase, setEnBase] = useState<Record<string, string>>({});
  const [contacts, setContacts] = useState<Record<string, Contacts>>({});
  const [sites, setSites] = useState<Record<string, string>>({});
  const [occupe, setOccupe] = useState<string | null>(null);
  const [candidatures, setCandidatures] = useState<Record<string, string>>({});

  async function rechercher() {
    setChargement(true);
    setErreur(null);
    setEchecs([]);
    try {
      const r = await fetch(`/api/entreprises/search?ville=${encodeURIComponent(ville)}&rayon=${rayon}`);
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? `HTTP ${r.status}`);
      setResultats(data.resultats ?? []);
      setEchecs(data.sourcesEnEchec ?? []);
      setAvertissement(data.avertissement ?? null);
      setCentre(data.centre ? { libelle: data.centre.libelle, codePostal: data.centre.codePostal } : null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setChargement(false);
    }
  }

  async function enregistrer(r: Resultat): Promise<string> {
    if (enBase[r.cle]) return enBase[r.cle];
    const res = await fetch("/api/entreprises", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        nom: r.nom,
        siret: r.siret,
        siren: r.siren,
        naf: r.naf,
        nafLibelle: r.nafLibelle,
        adresse: r.adresse,
        ville: r.ville,
        codePostal: r.codePostal,
        latitude: r.lat,
        longitude: r.lon,
        siteWeb: sites[r.cle] ?? r.siteWeb,
        emailEntreprise: r.emailContact,
        telephone: r.telephone,
        descriptionBrute: [r.nafLibelle, r.adresse].filter(Boolean).join(" - "),
        scorePertinence: r.pertinence.score,
        categorie: r.pertinence.categorie,
        signauxJson: JSON.stringify(r.pertinence.signaux),
        proposeAlternance: Boolean(r.proposeAlternance),
        source: r.source
      })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.formErrors?.join(", ") ?? "Erreur d'enregistrement");
    setEnBase((p) => ({ ...p, [r.cle]: data.id }));
    return data.id as string;
  }

  async function trouverContacts(r: Resultat) {
    setOccupe(r.cle);
    setErreur(null);
    try {
      const id = await enregistrer(r);
      const site = sites[r.cle] ?? r.siteWeb;
      if (!site) throw new Error("Renseigne d'abord l'adresse du site web ci-dessous.");
      const res = await fetch(`/api/entreprises/${id}/enrichir`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ siteWeb: site })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Enrichissement impossible");
      setContacts((p) => ({ ...p, [r.cle]: data.contacts }));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur");
    } finally {
      setOccupe(null);
    }
  }

  async function genererCandidature(r: Resultat) {
    setOccupe(r.cle);
    setErreur(null);
    try {
      const id = await enregistrer(r);
      const res = await fetch("/api/candidatures/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entrepriseId: id })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erreur de génération");
      setCandidatures((p) => ({ ...p, [r.cle]: data.candidature.id }));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur");
    } finally {
      setOccupe(null);
    }
  }

  return (
    <div className="space-y-5">
      <section>
        <h1 className="text-2xl font-semibold">Sourcing d&apos;entreprises</h1>
        <p className="text-sm text-slate-500">
          Annuaire des entreprises (codes NAF réseaux / télécoms / cyber) croisé avec La Bonne
          Alternance. Les résultats sont classés par pertinence pour ton profil.
        </p>
      </section>

      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <label className="text-sm">
          <div className="text-slate-600 mb-1">Ville</div>
          <input className="champ w-64" value={ville} onChange={(e) => setVille(e.target.value)} />
        </label>
        <label className="text-sm">
          <div className="text-slate-600 mb-1">Rayon (km)</div>
          <input
            type="number" min={5} max={100} className="champ w-24"
            value={rayon} onChange={(e) => setRayon(Number(e.target.value))}
          />
        </label>
        <button className="btn btn-primary" onClick={rechercher} disabled={chargement}>
          {chargement ? "Recherche…" : "Rechercher"}
        </button>
        {resultats.length > 0 && (
          <span className="text-sm text-slate-500">{resultats.length} entreprise(s) pertinente(s)</span>
        )}
      </div>

      {erreur && <div className="card p-3 bg-red-50 border-red-200 text-red-700 text-sm">{erreur}</div>}

      {centre && !avertissement && (
        <div className="text-sm text-slate-500">
          Recherche autour de <b>{centre.libelle}</b>
          {centre.codePostal ? ` (${centre.codePostal})` : ""}.
        </div>
      )}

      {avertissement && (
        <div className="card p-3 bg-amber-50 border-amber-200 text-amber-800 text-sm">
          <b>Vérifie la localisation.</b> {avertissement}
        </div>
      )}

      {echecs.length > 0 && (
        <div className="card p-3 bg-amber-50 border-amber-200 text-amber-800 text-sm">
          <div className="font-medium">Certaines sources n&apos;ont pas répondu :</div>
          <ul className="list-disc list-inside">
            {echecs.map((e, i) => (
              <li key={i}><b>{e.source}</b> — {e.raison}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-3">
        {!chargement && resultats.length === 0 && (
          <div className="card p-6 text-sm text-slate-500">
            Lance une recherche pour afficher les entreprises du domaine.
          </div>
        )}

        {resultats.map((r) => {
          const c = contacts[r.cle];
          const candId = candidatures[r.cle];
          const estOccupe = occupe === r.cle;
          return (
            <div key={r.cle} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-semibold">{r.nom}</h2>
                    <span className={COULEUR_CAT[r.pertinence.categorie] ?? "pill pill-slate"}>
                      {r.pertinence.categorie}
                    </span>
                    <span className="pill pill-slate">score {r.pertinence.score}</span>
                    {r.proposeAlternance && <span className="pill pill-green">alternance</span>}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {[r.codePostal, r.ville].filter(Boolean).join(" ")}
                    {typeof r.distanceKm === "number" && ` · ${Math.round(r.distanceKm)} km`}
                    {r.naf && ` · NAF ${r.naf}`}
                    {r.effectif && ` · ${LIBELLE_EFFECTIF[r.effectif] ?? r.effectif}`}
                    {r.nafLibelle && ` · ${r.nafLibelle}`}
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {r.pertinence.signaux.slice(0, 5).map((s, i) => (
                      <span key={i} className="pill pill-slate" title={`+${s.points}`}>
                        {s.libelle}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-2 shrink-0">
                  <button
                    className="btn btn-ghost"
                    disabled={estOccupe}
                    onClick={() => trouverContacts(r)}
                  >
                    {estOccupe ? "…" : "Trouver les contacts"}
                  </button>
                  {candId ? (
                    <button className="btn btn-ghost" onClick={() => router.push(`/validation?id=${candId}`)}>
                      Voir la candidature
                    </button>
                  ) : (
                    <button className="btn btn-primary" disabled={estOccupe} onClick={() => genererCandidature(r)}>
                      {estOccupe ? "Génération…" : "Générer la candidature"}
                    </button>
                  )}
                </div>
              </div>

              <div className="mt-3 border-t border-slate-100 pt-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <label className="block">
                  <span className="text-slate-600 text-xs">Site web (pour chercher les contacts)</span>
                  <input
                    className="champ mt-1"
                    placeholder="exemple.fr"
                    value={sites[r.cle] ?? r.siteWeb ?? ""}
                    onChange={(e) => setSites((p) => ({ ...p, [r.cle]: e.target.value }))}
                  />
                </label>
                <div className="text-sm">
                  <div className="text-slate-600 text-xs mb-1">Contacts trouvés</div>
                  <ul className="space-y-0.5">
                    <li>
                      <span className="text-slate-500">RH :</span>{" "}
                      {c?.emailRh ? (
                        <a className="text-blue-600 hover:underline" href={`mailto:${c.emailRh}`}>{c.emailRh}</a>
                      ) : <span className="text-slate-400">—</span>}
                    </li>
                    <li>
                      <span className="text-slate-500">Entreprise :</span>{" "}
                      {c?.emailEntreprise ?? r.emailContact ? (
                        <a className="text-blue-600 hover:underline" href={`mailto:${c?.emailEntreprise ?? r.emailContact}`}>
                          {c?.emailEntreprise ?? r.emailContact}
                        </a>
                      ) : <span className="text-slate-400">—</span>}
                    </li>
                    <li>
                      <span className="text-slate-500">Téléphone :</span>{" "}
                      {c?.telephone ?? r.telephone ?? <span className="text-slate-400">—</span>}
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
