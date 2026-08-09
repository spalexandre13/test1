import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const COLONNES = [
  { code: "A_VALIDER", label: "À valider", pill: "pill pill-amber" },
  { code: "ENVOYEE", label: "Envoyée", pill: "pill pill-blue" },
  { code: "RELANCE_A_FAIRE", label: "À relancer", pill: "pill pill-amber" },
  { code: "REPONSE_POSITIVE", label: "Réponse positive", pill: "pill pill-green" },
  { code: "REPONSE_NEGATIVE", label: "Réponse négative", pill: "pill pill-red" }
] as const;

function fmt(d?: Date | null) {
  return d ? new Date(d).toLocaleDateString("fr-FR") : "—";
}

export default async function PipelinePage() {
  const candidatures = await prisma.candidature.findMany({
    orderBy: { updatedAt: "desc" },
    include: { entreprise: true }
  });

  const maintenant = Date.now();
  const groupes = new Map<string, typeof candidatures>();
  for (const c of COLONNES) groupes.set(c.code, []);

  for (const c of candidatures) {
    // Une relance echue bascule visuellement en "a relancer".
    const statut =
      c.statut === "ENVOYEE" &&
      c.dateRelancePrevue &&
      new Date(c.dateRelancePrevue).getTime() <= maintenant
        ? "RELANCE_A_FAIRE"
        : c.statut;
    if (!groupes.has(statut)) groupes.set(statut, []);
    groupes.get(statut)!.push(c);
  }

  const aValider = groupes.get("A_VALIDER")?.length ?? 0;

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Pipeline</h1>
          <p className="text-sm text-slate-500">
            {candidatures.length} candidature(s) · {aValider} en attente de validation
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/sourcing" className="btn btn-primary">Trouver des entreprises</Link>
          <Link href="/validation" className="btn btn-ghost">File de validation</Link>
        </div>
      </section>

      {candidatures.length === 0 && (
        <div className="card p-6 text-sm text-slate-500">
          Aucune candidature pour l&apos;instant. Commence par{" "}
          <Link href="/sourcing" className="text-blue-600 hover:underline">le sourcing</Link>.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {COLONNES.map((col) => {
          const items = groupes.get(col.code) ?? [];
          return (
            <div key={col.code} className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-medium">{col.label}</h2>
                <span className={col.pill}>{items.length}</span>
              </div>
              <ul className="space-y-2">
                {items.length === 0 && <li className="text-xs text-slate-400 italic">Aucune</li>}
                {items.map((c) => (
                  <li key={c.id} className="border border-slate-100 rounded-lg p-3 bg-slate-50">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium text-sm">{c.entreprise.nom}</div>
                      <Link href={`/validation?id=${c.id}`} className="text-xs text-blue-600 hover:underline shrink-0">
                        Ouvrir
                      </Link>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{c.destinataire || "pas de destinataire"}</div>
                    <div className="text-xs text-slate-500 mt-1 flex flex-wrap gap-x-3">
                      <span>Envoi : {fmt(c.dateEnvoi)}</span>
                      <span>Relance : {fmt(c.dateRelancePrevue)}</span>
                    </div>
                    {c.erreurEnvoi && (
                      <div className="text-xs text-red-600 mt-1">Échec : {c.erreurEnvoi}</div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
