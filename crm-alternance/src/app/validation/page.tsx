"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type Entreprise = {
  id: string;
  nom: string;
  ville?: string | null;
  siteWeb?: string | null;
  emailRh?: string | null;
  emailEntreprise?: string | null;
  telephone?: string | null;
  descriptionCourte?: string | null;
};

type Candidature = {
  id: string;
  statut: string;
  destinataire: string | null;
  cc: string | null;
  objet: string | null;
  corpsEmail: string | null;
  titreCv: string | null;
  top4Competences: string | null;
  erreurEnvoi: string | null;
  entreprise: Entreprise;
};

function ValidationContenu() {
  const params = useSearchParams();
  const [items, setItems] = useState<Candidature[]>([]);
  const [selectionId, setSelectionId] = useState<string | null>(params.get("id"));
  const [chargement, setChargement] = useState(true);
  const [sauvegarde, setSauvegarde] = useState(false);
  const [envoi, setEnvoi] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const selection = useMemo(
    () => items.find((i) => i.id === selectionId) ?? null,
    [items, selectionId]
  );

  const charger = useCallback(async (garderId?: string | null) => {
    setChargement(true);
    try {
      const r = await fetch("/api/candidatures?statut=A_VALIDER");
      const data = (await r.json()) as Candidature[];
      setItems(data);
      setSelectionId((actuel) => {
        const cible = garderId ?? actuel;
        if (cible && data.some((d) => d.id === cible)) return cible;
        return data[0]?.id ?? null;
      });
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible");
    } finally {
      setChargement(false);
    }
  }, []);

  useEffect(() => {
    charger();
  }, [charger]);

  function modifier(patch: Partial<Candidature>) {
    if (!selection) return;
    setItems((prev) => prev.map((p) => (p.id === selection.id ? { ...p, ...patch } : p)));
  }

  async function sauvegarder() {
    if (!selection) return;
    setSauvegarde(true);
    setErreur(null);
    setMessage(null);
    try {
      const r = await fetch(`/api/candidatures/${selection.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          destinataire: selection.destinataire ?? "",
          cc: selection.cc ?? "",
          objet: selection.objet ?? "",
          corpsEmail: selection.corpsEmail ?? "",
          titreCv: selection.titreCv ?? ""
        })
      });
      if (!r.ok) throw new Error((await r.json()).error ?? `HTTP ${r.status}`);
      setMessage("Modifications enregistrées.");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSauvegarde(false);
    }
  }

  async function envoyer() {
    if (!selection) return;
    setEnvoi(true);
    setErreur(null);
    setMessage(null);
    try {
      // On sauvegarde avant d'envoyer pour ne jamais expedier une version perimee.
      await fetch(`/api/candidatures/${selection.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          destinataire: selection.destinataire ?? "",
          cc: selection.cc ?? "",
          objet: selection.objet ?? "",
          corpsEmail: selection.corpsEmail ?? "",
          titreCv: selection.titreCv ?? ""
        })
      });
      const r = await fetch(`/api/candidatures/${selection.id}/send`, { method: "POST" });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Erreur d'envoi");
      setMessage("Envoyé. Une relance est programmée dans 10 jours.");
      await charger(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur");
    } finally {
      setEnvoi(false);
    }
  }

  async function regenerer() {
    if (!selection) return;
    setSauvegarde(true);
    setErreur(null);
    try {
      const r = await fetch("/api/candidatures/generate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entrepriseId: selection.entreprise.id, forcerResume: true })
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? "Erreur");
      await charger(data.candidature.id);
      setMessage("Nouvelle version générée.");
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSauvegarde(false);
    }
  }

  const top4 = useMemo(() => {
    try {
      return selection?.top4Competences ? (JSON.parse(selection.top4Competences) as string[]) : [];
    } catch {
      return [];
    }
  }, [selection]);

  const nbMots = (selection?.corpsEmail ?? "").trim().split(/\s+/).filter(Boolean).length;

  return (
    <div className="grid grid-cols-12 gap-4">
      <aside className="col-span-12 md:col-span-4 xl:col-span-3">
        <div className="card p-3">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-medium">À valider</h2>
            <span className="pill pill-amber">{items.length}</span>
          </div>
          <ul className="divide-y divide-slate-100">
            {chargement && <li className="p-2 text-xs text-slate-400">Chargement…</li>}
            {!chargement && items.length === 0 && (
              <li className="p-2 text-xs text-slate-400 italic">
                Rien à valider. Passe par le sourcing.
              </li>
            )}
            {items.map((c) => (
              <li key={c.id}>
                <button
                  className={`w-full text-left p-2 rounded ${c.id === selectionId ? "bg-blue-50" : "hover:bg-slate-50"}`}
                  onClick={() => setSelectionId(c.id)}
                >
                  <div className="text-sm font-medium">{c.entreprise.nom}</div>
                  <div className="text-xs text-slate-500 truncate">{c.objet ?? "(sans objet)"}</div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <section className="col-span-12 md:col-span-8 xl:col-span-9 space-y-3">
        {message && <div className="card p-3 bg-emerald-50 border-emerald-200 text-emerald-800 text-sm">{message}</div>}
        {erreur && <div className="card p-3 bg-red-50 border-red-200 text-red-700 text-sm">{erreur}</div>}

        {!selection && !chargement && (
          <div className="card p-6 text-sm text-slate-500">Sélectionne une candidature à gauche.</div>
        )}

        {selection && (
          <>
            <div className="card p-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold">{selection.entreprise.nom}</h1>
                <div className="text-xs text-slate-500">
                  {selection.entreprise.ville ?? "—"} ·{" "}
                  {selection.entreprise.descriptionCourte ?? "résumé non généré"}
                </div>
                <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-3">
                  {selection.entreprise.emailRh && <span>RH : {selection.entreprise.emailRh}</span>}
                  {selection.entreprise.emailEntreprise && <span>Contact : {selection.entreprise.emailEntreprise}</span>}
                  {selection.entreprise.telephone && <span>Tél : {selection.entreprise.telephone}</span>}
                </div>
              </div>
              <div className="flex gap-2">
                <button className="btn btn-ghost" onClick={regenerer} disabled={sauvegarde}>
                  Regénérer
                </button>
                <a className="btn btn-ghost" target="_blank" rel="noreferrer" href={`/api/candidatures/${selection.id}/cv`}>
                  Aperçu CV PDF
                </a>
              </div>
            </div>

            {selection.erreurEnvoi && (
              <div className="card p-3 bg-red-50 border-red-200 text-red-700 text-sm">
                Dernier envoi en échec : {selection.erreurEnvoi}
              </div>
            )}

            <div className="card p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="block text-sm">
                  <span className="text-slate-600">Destinataire</span>
                  <input className="champ mt-1" value={selection.destinataire ?? ""}
                    onChange={(e) => modifier({ destinataire: e.target.value })} />
                </label>
                <label className="block text-sm">
                  <span className="text-slate-600">Copie (Cc)</span>
                  <input className="champ mt-1" value={selection.cc ?? ""}
                    onChange={(e) => modifier({ cc: e.target.value })} />
                </label>
              </div>

              <label className="block text-sm">
                <span className="text-slate-600">Objet</span>
                <input className="champ mt-1" value={selection.objet ?? ""}
                  onChange={(e) => modifier({ objet: e.target.value })} />
              </label>

              <label className="block text-sm">
                <span className="text-slate-600">
                  Corps de l&apos;email{" "}
                  <span className={nbMots > 190 || nbMots < 70 ? "text-amber-600" : "text-slate-400"}>
                    ({nbMots} mots — vise 100-150)
                  </span>
                </span>
                <textarea className="champ mt-1 font-mono" rows={14} value={selection.corpsEmail ?? ""}
                  onChange={(e) => modifier({ corpsEmail: e.target.value })} />
              </label>

              <div className="border-t border-slate-100 pt-3">
                <label className="block text-sm">
                  <span className="text-slate-600">Titre du CV adapté</span>
                  <input className="champ mt-1" value={selection.titreCv ?? ""}
                    onChange={(e) => modifier({ titreCv: e.target.value })} />
                </label>
                <div className="text-xs text-slate-500 mt-2">Compétences mises en avant :</div>
                <ul className="mt-1 list-disc list-inside text-sm text-slate-700">
                  {top4.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                <button className="btn btn-ghost" disabled={sauvegarde} onClick={sauvegarder}>
                  {sauvegarde ? "Enregistrement…" : "Enregistrer"}
                </button>
                <button className="btn btn-primary" disabled={envoi || !selection.destinataire} onClick={envoyer}>
                  {envoi ? "Envoi…" : "Approuver et envoyer avec Gmail"}
                </button>
              </div>
            </div>
          </>
        )}
      </section>
    </div>
  );
}

export default function ValidationPage() {
  return (
    <Suspense fallback={<div className="card p-6 text-sm text-slate-500">Chargement…</div>}>
      <ValidationContenu />
    </Suspense>
  );
}
