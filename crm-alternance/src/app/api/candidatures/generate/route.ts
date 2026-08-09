import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { genererResume, genererEmail, genererAdaptationCv } from "@/lib/generation";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Genere resume + email + adaptation CV pour une entreprise donnee.
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const entrepriseId: string | undefined = body.entrepriseId;
  if (!entrepriseId) {
    return NextResponse.json({ error: "entrepriseId requis" }, { status: 400 });
  }

  const entreprise = await prisma.entreprise.findUnique({ where: { id: entrepriseId } });
  if (!entreprise) return NextResponse.json({ error: "Entreprise introuvable" }, { status: 404 });

  try {
    let resume = entreprise.descriptionCourte ?? "";
    if (!resume || body.forcerResume) {
      resume = await genererResume(
        [entreprise.descriptionBrute, entreprise.nafLibelle, entreprise.nom]
          .filter(Boolean)
          .join(" - ")
      );
      await prisma.entreprise.update({
        where: { id: entrepriseId },
        data: { descriptionCourte: resume }
      });
    }

    const [email, cv] = await Promise.all([
      genererEmail(entreprise.nom, resume),
      genererAdaptationCv(resume)
    ]);

    // Priorite au contact RH ; l'adresse generique passe en copie.
    const destinataire = body.destinataire ?? entreprise.emailRh ?? entreprise.emailEntreprise ?? "";
    const cc =
      entreprise.emailRh && entreprise.emailEntreprise && entreprise.emailRh !== entreprise.emailEntreprise
        ? entreprise.emailEntreprise
        : null;

    const candidature = await prisma.candidature.create({
      data: {
        entrepriseId: entreprise.id,
        statut: "A_VALIDER",
        destinataire,
        cc,
        objet: email.objet,
        corpsEmail: email.corps,
        titreCv: cv.titre_cv,
        top4Competences: JSON.stringify(cv.top_4_competences)
      }
    });

    return NextResponse.json({ candidature, resume, analyseTon: email.analyse, cvAdaptation: cv });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur de génération IA" },
      { status: 500 }
    );
  }
}
