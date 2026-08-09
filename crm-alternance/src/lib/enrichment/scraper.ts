// Recuperation des pages d'un site d'entreprise pour en extraire les contacts.
// Volontairement prudent : timeouts courts, taille bornee, peu de pages.

const CHEMINS_CANDIDATS = [
  "/contact", "/contacts", "/nous-contacter", "/contactez-nous",
  "/recrutement", "/recrutements", "/carrieres", "/carriere",
  "/nous-rejoindre", "/rejoignez-nous", "/emploi", "/jobs",
  "/mentions-legales", "/a-propos"
];

const TAILLE_MAX = 1_500_000; // 1.5 Mo
const TIMEOUT_MS = 8000;

export type PageRecuperee = { url: string; html: string };

export function normaliserUrlSite(brut: string): string | null {
  if (!brut) return null;
  let u = brut.trim();
  if (!/^https?:\/\//i.test(u)) u = `https://${u}`;
  try {
    const parsed = new URL(u);
    if (!/^https?:$/.test(parsed.protocol)) return null;
    if (!parsed.hostname.includes(".")) return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

async function recupererPage(url: string): Promise<PageRecuperee | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "user-agent": "Mozilla/5.0 (compatible; CRM-Alternance-local/1.0)",
        accept: "text/html,application/xhtml+xml"
      },
      cache: "no-store"
    });
    if (!res.ok) return null;
    const type = res.headers.get("content-type") ?? "";
    if (!type.includes("html")) return null;
    const html = (await res.text()).slice(0, TAILLE_MAX);
    return { url, html };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

// Extrait des liens internes qui ressemblent a une page contact/recrutement.
export function liensInteressants(html: string, origine: string): string[] {
  const out = new Set<string>();
  const re = /href\s*=\s*["']([^"']+)["']/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const href = m[1];
    if (/^(mailto:|tel:|javascript:|#)/i.test(href)) continue;
    if (!/contact|recrut|carrier|carriere|emploi|job|rejoign|mentions|propos/i.test(href)) continue;
    try {
      const abs = new URL(href, origine);
      if (abs.origin !== new URL(origine).origin) continue;
      abs.hash = "";
      out.add(abs.toString());
    } catch {
      /* lien malforme : ignore */
    }
  }
  return [...out].slice(0, 5);
}

export async function recupererPagesContact(
  siteWeb: string,
  maxPages = 4
): Promise<PageRecuperee[]> {
  const origine = normaliserUrlSite(siteWeb);
  if (!origine) return [];

  const pages: PageRecuperee[] = [];
  const accueil = await recupererPage(origine);
  if (accueil) pages.push(accueil);

  // 1) Liens decouverts sur l'accueil, 2) chemins devinés en secours.
  const candidats = [
    ...(accueil ? liensInteressants(accueil.html, origine) : []),
    ...CHEMINS_CANDIDATS.map((c) => `${origine}${c}`)
  ];

  const vus = new Set(pages.map((p) => p.url));
  for (const url of candidats) {
    if (pages.length >= maxPages) break;
    if (vus.has(url)) continue;
    vus.add(url);
    const p = await recupererPage(url);
    if (p) pages.push(p);
  }
  return pages;
}
