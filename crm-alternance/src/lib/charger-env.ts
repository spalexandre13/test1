// Les scripts lances hors de Next (seed, validate:live, apercu-cv) ne
// beneficient pas du chargement automatique du .env par Next.js.
// Ce module le charge une fois, sans dependance externe.
import { existsSync } from "node:fs";
import { resolve } from "node:path";

let dejaCharge = false;

export function chargerEnv(chemin = ".env"): void {
  if (dejaCharge) return;
  dejaCharge = true;
  const p = resolve(process.cwd(), chemin);
  if (!existsSync(p)) {
    console.warn(`[env] ${p} introuvable — les variables doivent venir du shell.`);
    return;
  }
  // process.loadEnvFile existe depuis Node 20.12 / 22.
  const loader = (process as unknown as { loadEnvFile?: (p: string) => void }).loadEnvFile;
  if (typeof loader === "function") {
    loader.call(process, p);
    return;
  }
  console.warn("[env] process.loadEnvFile indisponible : mets a jour Node (>= 20.12).");
}
