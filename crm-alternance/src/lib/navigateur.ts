// Lancement de Chromium selon l'environnement.
//
// - Sur Vercel / AWS Lambda : @sparticuz/chromium fournit un binaire compatible
//   avec les fonctions serverless (le Chromium complet de `puppeteer` depasse
//   la limite de taille des fonctions).
// - En local : on utilise le Chrome telecharge par `puppeteer` (devDependency)
//   ou celui pointe par PUPPETEER_EXECUTABLE_PATH.
import type { Browser } from "puppeteer-core";

export function estServerless(): boolean {
  return Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
}

async function cheminChromeLocal(): Promise<string> {
  if (process.env.PUPPETEER_EXECUTABLE_PATH) return process.env.PUPPETEER_EXECUTABLE_PATH;
  try {
    // Import indirect : evite que le tracing de Next embarque `puppeteer`
    // (devDependency) dans le bundle deploye.
    const nomModule = "puppeteer";
    const mod = (await import(/* webpackIgnore: true */ nomModule)) as {
      default?: { executablePath?: () => string };
      executablePath?: () => string;
    };
    const chemin = (mod.default?.executablePath ?? mod.executablePath)?.();
    if (chemin) return chemin;
  } catch {
    /* puppeteer absent : on tombe sur le message d'erreur ci-dessous */
  }
  throw new Error(
    "Aucun Chromium trouvé en local. Lance `npx puppeteer browsers install chrome` " +
      "ou renseigne PUPPETEER_EXECUTABLE_PATH dans .env."
  );
}

export async function lancerNavigateur(): Promise<Browser> {
  const puppeteer = (await import("puppeteer-core")).default;

  if (estServerless()) {
    const chromium = (await import("@sparticuz/chromium")).default;
    return puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath: await chromium.executablePath(),
      headless: true
    });
  }

  return puppeteer.launch({
    headless: true,
    executablePath: await cheminChromeLocal(),
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
  });
}
