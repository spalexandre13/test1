// Initialisation des donnees de reference.
//
// Sur un hebergement sans terminal (Vercel + telephone), impossible de lancer
// `npm run db:seed`. On insere donc le modele par defaut a la premiere requete.
// L'operation est idempotente et n'est tentee qu'une fois par instance.
import { prisma } from "./prisma";

let dejaFait = false;

export const MODELE_DEFAUT = {
  nom: "candidature-spontanee",
  objet: "Candidature alternance Réseaux & Cybersécurité - rentrée 2026",
  contenu: [
    "Bonjour,",
    "",
    "{{RESUME_ENTREPRISE}} — c'est exactement le terrain qui m'intéresse.",
    "",
    "Je suis en 3e année de BUT Réseaux & Télécommunications à Sophia Antipolis et je",
    "cherche une alternance en réseau / cybersécurité pour la rentrée 2026, en rythme",
    "une semaine en entreprise / une semaine à l'école.",
    "",
    "Votre polyvalence entre réseau et système est l'environnement idéal pour monter",
    "en compétences.",
    "",
    "Mon CV est en pièce jointe et mon portfolio est ici :",
    "https://spalexandre13.github.io/Portfolio/",
    "Disponible pour un échange quand vous voulez.",
    "",
    "Bien cordialement,",
    "Alexandre"
  ].join("\n")
};

export async function assurerDonneesInitiales(): Promise<void> {
  if (dejaFait) return;
  dejaFait = true;
  try {
    await prisma.modeleEmail.upsert({
      where: { nom: MODELE_DEFAUT.nom },
      update: {},
      create: { ...MODELE_DEFAUT, estDefaut: true }
    });
  } catch (e) {
    // Ne jamais faire echouer une requete a cause du seed : on reessaiera.
    dejaFait = false;
    console.warn("[init] seed impossible :", e instanceof Error ? e.message : e);
  }
}
