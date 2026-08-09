"use client";

import { useEffect, useState } from "react";

type Check = { nom: string; ok: boolean; detail: string };

export default function SantePage() {
  const [checks, setChecks] = useState<Check[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  async function lancer() {
    setChargement(true);
    setErreur(null);
    try {
      const r = await fetch("/api/sante");
      const data = await r.json();
      setChecks(data.checks ?? []);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : "Diagnostic impossible");
    } finally {
      setChargement(false);
    }
  }

  useEffect(() => {
    lancer();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Diagnostic</h1>
          <p className="text-sm text-slate-500">
            Vérifie la base, Gmail, l&apos;IA et les APIs publiques utilisées par la recherche.
          </p>
        </div>
        <button className="btn btn-ghost" onClick={lancer} disabled={chargement}>
          {chargement ? "Test…" : "Relancer"}
        </button>
      </div>

      {erreur && <div className="card p-3 bg-red-50 border-red-200 text-red-700 text-sm">{erreur}</div>}

      <div className="card divide-y divide-slate-100">
        {checks.map((c) => (
          <div key={c.nom} className="p-4 flex items-start gap-3">
            <span className={c.ok ? "pill pill-green" : "pill pill-red"}>{c.ok ? "OK" : "KO"}</span>
            <div className="min-w-0">
              <div className="font-medium text-sm">{c.nom}</div>
              <div className="text-xs text-slate-600 break-words">{c.detail}</div>
            </div>
          </div>
        ))}
        {!chargement && checks.length === 0 && (
          <div className="p-4 text-sm text-slate-500">Aucun résultat.</div>
        )}
      </div>
    </div>
  );
}
