import type { Browser } from "puppeteer-core";
import { lancerNavigateur } from "./navigateur";
import { CV_DATA } from "./cv-data";

export type AdaptationCv = { titre_cv: string; top_4_competences: string[] };

function esc(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function construireHtmlCv(a: AdaptationCv): string {
  const { identite, formation, experiences, langues, certifications, rubriques } = CV_DATA;
  const top = (a.top_4_competences ?? []).slice(0, 4);

  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><title>CV ${esc(identite.prenom)}</title>
<style>
  *{box-sizing:border-box}
  body{font-family:Helvetica,Arial,sans-serif;color:#111827;margin:0;padding:30px 38px;font-size:10.5pt}
  header{border-bottom:2px solid #0f172a;padding-bottom:10px;margin-bottom:14px}
  h1{font-size:21pt;margin:0}
  h2{font-size:12pt;margin:16px 0 7px;color:#1e3a8a;border-bottom:1px solid #cbd5e1;padding-bottom:3px}
  h3{font-size:10.5pt;margin:5px 0 3px}
  .titre{color:#1e3a8a;font-weight:600;font-size:12.5pt;margin-top:4px}
  .ident{color:#475569;font-size:9.5pt;margin-top:5px}
  .ident a{color:#1e3a8a;text-decoration:none}
  ul{margin:3px 0 7px 17px;padding:0}
  li{margin:2px 0;line-height:1.32}
  .top{background:#eff6ff;border:1px solid #bfdbfe;padding:9px 13px;border-radius:6px}
  .top li{font-weight:600}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}
  .bloc{margin-bottom:7px}
  .bt{display:flex;justify-content:space-between;font-weight:600}
  .bs{color:#475569;font-size:9.5pt}
  .bd{font-size:9.5pt;margin-top:2px}
</style></head><body>
<header>
  <h1>${esc(identite.prenom)} ${esc(identite.nom)}</h1>
  <div class="titre">${esc(a.titre_cv)}</div>
  <div class="ident">${esc(identite.ville)}${identite.email ? ` &middot; <a href="mailto:${esc(identite.email)}">${esc(identite.email)}</a>` : ""} &middot; <a href="${esc(identite.portfolio)}">Portfolio</a> &middot; <a href="${esc(identite.github)}">GitHub</a></div>
</header>

<section class="top">
  <h3 style="margin-top:0">Compétences clés pour ce poste</h3>
  <ul>${top.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>
</section>

<h2>Formation</h2>
${formation.map((f) => `<div class="bloc"><div class="bt"><span>${esc(f.intitule)}</span><span>${esc(f.annees)}</span></div><div class="bs">${esc(f.etablissement)}</div></div>`).join("")}

<h2>Projets &amp; expériences</h2>
${experiences.map((e) => `<div class="bloc"><div class="bt"><span>${esc(e.intitule)}</span><span>${esc(e.periode)}</span></div><div class="bd">${esc(e.description)}</div></div>`).join("")}

<h2>Compétences techniques</h2>
<div class="grid">${rubriques.map((r) => `<section><h3>${esc(r.titre)}</h3><ul>${r.items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul></section>`).join("")}</div>

<h2>Langues &amp; certifications</h2>
<ul>${langues.map((l) => `<li>${esc(l.langue)} - ${esc(l.niveau)}</li>`).join("")}${certifications.map((c) => `<li>${esc(c)}</li>`).join("")}</ul>
</body></html>`;
}

export async function genererPdf(a: AdaptationCv): Promise<Buffer> {
  let navigateur: Browser | null = null;
  try {
    navigateur = await lancerNavigateur();
    const page = await navigateur.newPage();
    await page.setContent(construireHtmlCv(a), { waitUntil: "domcontentloaded" });
    const pdf = await page.pdf({
      format: "A4",
      margin: { top: "10mm", right: "9mm", bottom: "10mm", left: "9mm" },
      printBackground: true
    });
    return Buffer.from(pdf);
  } catch (e) {
    const m = e instanceof Error ? e.message : String(e);
    throw new Error(
      `Génération du CV PDF impossible : ${m}. Si Chromium manque en local, lance "npx puppeteer browsers install chrome" ou renseigne PUPPETEER_EXECUTABLE_PATH.`
    );
  } finally {
    await navigateur?.close();
  }
}
