// Orchestration IA : contexte -> email -> adaptation CV.
// La separation objet/corps et la validation du CV sont des fonctions pures.
import { chat } from "./ai";
import { PROMPT_CONTEXTE, PROMPT_EMAIL, PROMPT_CV, remplir } from "./prompts";
import { analyserEmail, type AnalyseTon } from "./ton";
import { TOUTES_COMPETENCES, titreParDefaut } from "./cv-data";

export type EmailGenere = { objet: string; corps: string; analyse: AnalyseTon; tentatives: number };
export type AdaptationCv = { titre_cv: string; top_4_competences: string[] };

// La 1re ligne non vide est l'objet, le reste le corps.
export function separerObjetCorps(brut: string, nomEntreprise = ""): { objet: string; corps: string } {
  const lignes = brut.replace(/\r/g, "").split("\n");
  let objet = "";
  let i = 0;
  while (i < lignes.length) {
    const t = lignes[i].trim();
    i++;
    if (!t) continue;
    objet = t
      .replace(/^\**\s*objet\s*\**\s*:\s*/i, "")
      .replace(/^["'`]|["'`]$/g, "")
      .replace(/^\*\*|\*\*$/g, "")
      .trim();
    break;
  }
  const corps = lignes.slice(i).join("\n").replace(/^\n+/, "").trimEnd();
  return {
    objet: objet || `Candidature alternance R&T / Cyber${nomEntreprise ? ` - ${nomEntreprise}` : ""}`,
    corps
  };
}

// Garantit qu'aucune competence inventee ne passe : tout doit exister dans la base.
export function validerCompetences(brutes: unknown): string[] {
  const liste = Array.isArray(brutes) ? brutes.map(String) : [];
  const retenues: string[] = [];
  for (const c of liste) {
    const exacte = TOUTES_COMPETENCES.find(
      (ref) => ref.toLowerCase().trim() === c.toLowerCase().trim()
    );
    if (exacte && !retenues.includes(exacte)) {
      retenues.push(exacte);
      continue;
    }
    // Tolerance : correspondance par inclusion (l'IA reformule parfois legerement).
    const proche = TOUTES_COMPETENCES.find((ref) => {
      const a = ref.toLowerCase();
      const b = c.toLowerCase().trim();
      return b.length > 6 && (a.includes(b) || b.includes(a.split(" (")[0]));
    });
    if (proche && !retenues.includes(proche)) retenues.push(proche);
  }
  // Complete jusqu'a 4 avec des valeurs sures si l'IA en a fourni trop peu.
  const secours = [
    "Switching avancé (VLAN, STP, LACP, HSRP)",
    "Administration Linux (Debian, Ubuntu)",
    "Firewalling (Cisco ASA, pfSense, iptables)",
    "Routage dynamique (OSPF, EIGRP, BGP)"
  ];
  for (const s of secours) {
    if (retenues.length >= 4) break;
    if (!retenues.includes(s)) retenues.push(s);
  }
  return retenues.slice(0, 4);
}

export async function genererResume(description: string): Promise<string> {
  const d = (description ?? "").trim();
  if (d.length < 5) return "Entreprise du secteur informatique / réseaux.";
  const user = remplir(PROMPT_CONTEXTE, { DESCRIPTION_API_ENTREPRISE: d });
  const out = await chat({ system: PROMPT_CONTEXTE, user, temperature: 0.2 });
  const phrase = out.split(/\n+/).map((s) => s.trim()).find(Boolean) ?? out.trim();
  return phrase.replace(/^["'`]|["'`]$/g, "");
}

export async function genererEmail(
  nomEntreprise: string,
  resumeEntreprise: string,
  maxTentatives = 2
): Promise<EmailGenere> {
  const user = remplir(PROMPT_EMAIL, {
    NOM_ENTREPRISE: nomEntreprise,
    RESUME_ENTREPRISE: resumeEntreprise
  });

  let meilleur: EmailGenere | null = null;

  for (let tentative = 1; tentative <= maxTentatives; tentative++) {
    // A la 2e passe, on rappelle explicitement les formules a bannir.
    const correctif =
      tentative === 1 || !meilleur
        ? user
        : `${user}\n\n[CORRECTION]\nTa version precedente contenait des formules interdites : ${meilleur.analyse.violations
            .map((v) => `"${v.extrait}"`)
            .join(", ")}. Reecris le mail sans aucune de ces formules, en restant naturel et concis.`;

    const brut = await chat({ system: PROMPT_EMAIL, user: correctif, temperature: 0.55 });
    const { objet, corps } = separerObjetCorps(brut, nomEntreprise);
    const analyse = analyserEmail(corps);
    const candidat: EmailGenere = { objet, corps, analyse, tentatives: tentative };

    if (analyse.ok) return candidat;
    meilleur = candidat;
  }
  return meilleur!;
}

export async function genererAdaptationCv(resumeEntreprise: string): Promise<AdaptationCv> {
  const user = remplir(PROMPT_CV, { RESUME_ENTREPRISE: resumeEntreprise });
  try {
    const brut = await chat({ system: PROMPT_CV, user, jsonMode: true, temperature: 0.2 });
    const parsed = JSON.parse(brut) as Partial<AdaptationCv>;
    return {
      titre_cv: String(parsed.titre_cv ?? "").trim() || titreParDefaut(),
      top_4_competences: validerCompetences(parsed.top_4_competences)
    };
  } catch {
    // L'IA a renvoye du non-JSON ou a echoue : on retombe sur un CV sur.
    return { titre_cv: titreParDefaut(), top_4_competences: validerCompetences([]) };
  }
}
