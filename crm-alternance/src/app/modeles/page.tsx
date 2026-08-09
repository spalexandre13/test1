"use client";

import { useEffect, useState } from "react";

type Modele = { id: string; nom: string; objet: string; contenu: string; estDefaut: boolean };

export default function ModelesPage() {
  const [modeles, setModeles] = useState<Modele[]>([]);
  const [form, setForm] = useState({ nom: "", objet: "", contenu: "", estDefaut: false });
  const [erreur, setErreur] = useState<string | null>(null);
  const [sauvegarde, setSauvegarde] = useState(false);

  async function charger() {
    try {
      const r = await fetch("/api/modeles");
      setModeles(await r.json());
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Chargement impossible");
    }
  }

  useEffect(() => {
    charger();
  }, []);

  async function enregistrer() {
    setSauvegarde(true);
    setErreur(null);
    try {
      const r = await fetch("/api/modeles", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(form)
      });
      if (!r.ok) throw new Error((await r.json()).error ?? `HTTP ${r.status}`);
      setForm({ nom: "", objet: "", contenu: "", estDefaut: false });
      await charger();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Erreur");
    } finally {
      setSauvegarde(false);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Modèles d&apos;email</h1>
        <p className="text-sm text-slate-500">
          Base éditoriale de référence. La rédaction finale reste pilotée par les prompts système.
        </p>
      </div>

      <div className="card p-4 space-y-3">
        {erreur && <div className="text-sm text-red-700">{erreur}</div>}
        <input className="champ" placeholder="Nom du modèle (ex : candidature-spontanee)"
          value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
        <input className="champ" placeholder="Objet"
          value={form.objet} onChange={(e) => setForm({ ...form, objet: e.target.value })} />
        <textarea className="champ font-mono" rows={10}
          placeholder="Contenu — variables disponibles : {{NOM_ENTREPRISE}}, {{RESUME_ENTREPRISE}}"
          value={form.contenu} onChange={(e) => setForm({ ...form, contenu: e.target.value })} />
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.estDefaut}
            onChange={(e) => setForm({ ...form, estDefaut: e.target.checked })} />
          Modèle par défaut
        </label>
        <button className="btn btn-primary" onClick={enregistrer} disabled={sauvegarde}>
          {sauvegarde ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>

      <div className="space-y-3">
        {modeles.map((m) => (
          <div key={m.id} className="card p-4">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className="font-medium">{m.nom}</span>
                {m.estDefaut && <span className="pill pill-blue ml-2">défaut</span>}
              </div>
              <div className="text-xs text-slate-500">{m.objet}</div>
            </div>
            <pre className="mt-2 text-xs whitespace-pre-wrap text-slate-700">{m.contenu}</pre>
          </div>
        ))}
      </div>
    </div>
  );
}
