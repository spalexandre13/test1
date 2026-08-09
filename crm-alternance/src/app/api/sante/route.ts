import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { assurerDonneesInitiales } from "@/lib/init";
import { verifierSmtp } from "@/lib/mailer";
import { fournisseurActuel } from "@/lib/ai";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Page de diagnostic : dit precisement ce qui est configure et ce qui repond.
export async function GET() {
  await assurerDonneesInitiales();
  const checks: Array<{ nom: string; ok: boolean; detail: string }> = [];

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.push({ nom: "Base SQLite", ok: true, detail: "Connexion OK" });
  } catch (e) {
    checks.push({
      nom: "Base SQLite",
      ok: false,
      detail: `${e instanceof Error ? e.message : e}. Lance "npx prisma db push".`
    });
  }

  // Le SMTP et les APIs sont testes en parallele : en serie, un hote injoignable
  // ferait attendre tous les suivants.
  const smtpPromesse = verifierSmtp().catch((e) => ({ ok: false, message: String(e) }));

  const fournisseur = fournisseurActuel();
  const cleIa = fournisseur === "groq" ? Boolean(process.env.GROQ_API_KEY) : true;
  checks.push({
    nom: `IA (${fournisseur})`,
    ok: cleIa,
    detail: cleIa
      ? `Configuré sur ${fournisseur}`
      : "GROQ_API_KEY absente de .env (ou bascule AI_PROVIDER=ollama)"
  });

  const apis = [
    ["API Adresse", "https://api-adresse.data.gouv.fr/search/?q=nice&limit=1"],
    ["Annuaire entreprises", "https://recherche-entreprises.api.gouv.fr/search?q=test&per_page=1"],
    ["La Bonne Alternance", "https://labonnealternance.apprentissage.beta.gouv.fr/api/healthcheck"]
  ] as const;

  const [smtp, ...resultatsApis] = await Promise.all([
    smtpPromesse,
    ...apis.map(async ([nom, url]) => {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      try {
        const r = await fetch(url, { signal: ctrl.signal, cache: "no-store" });
        return { nom, ok: r.ok, detail: `HTTP ${r.status}` };
      } catch (e) {
        return {
          nom,
          ok: false,
          detail: `Injoignable : ${e instanceof Error ? e.message : e}`
        };
      } finally {
        clearTimeout(t);
      }
    })
  ]);

  checks.push({ nom: "Gmail SMTP", ok: smtp.ok, detail: smtp.message });
  checks.push(...resultatsApis);

  return NextResponse.json({ ok: checks.every((c) => c.ok), checks });
}
