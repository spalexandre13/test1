import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { envoyer } from "@/lib/mailer";
import { genererPdf } from "@/lib/cv";
import { titreParDefaut } from "@/lib/cv-data";

type Ctx = { params: { id: string } };
export const maxDuration = 60;

const RE_EMAIL = /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/i;

export async function POST(_r: Request, { params }: Ctx) {
  const c = await prisma.candidature.findUnique({
    where: { id: params.id },
    include: { entreprise: true }
  });
  if (!c) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  if (!c.destinataire || !RE_EMAIL.test(c.destinataire)) {
    return NextResponse.json(
      { error: `Destinataire invalide : "${c.destinataire ?? ""}"` },
      { status: 400 }
    );
  }
  if (!c.objet?.trim() || !c.corpsEmail?.trim()) {
    return NextResponse.json({ error: "Objet ou corps de l'email vide." }, { status: 400 });
  }
  if (c.statut === "ENVOYEE") {
    return NextResponse.json(
      { error: "Cette candidature a déjà été envoyée." },
      { status: 409 }
    );
  }

  let top4: string[] = [];
  try {
    top4 = c.top4Competences ? (JSON.parse(c.top4Competences) as string[]) : [];
  } catch {
    top4 = [];
  }

  try {
    const pdf = await genererPdf({ titre_cv: c.titreCv ?? titreParDefaut(), top_4_competences: top4 });
    const slug = c.entreprise.nom.replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

    await envoyer({
      to: c.destinataire,
      cc: c.cc ?? undefined,
      subject: c.objet,
      text: c.corpsEmail,
      attachments: [{ filename: `CV-Alexandre-${slug || "candidature"}.pdf`, content: pdf }]
    });

    const dateEnvoi = new Date();
    const relance = new Date(dateEnvoi);
    relance.setDate(relance.getDate() + 10);

    const maj = await prisma.candidature.update({
      where: { id: c.id },
      data: { statut: "ENVOYEE", dateEnvoi, dateRelancePrevue: relance, erreurEnvoi: null }
    });
    return NextResponse.json({ ok: true, candidature: maj });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur d'envoi";
    // On trace l'echec sans changer le statut : la candidature reste a valider.
    await prisma.candidature.update({
      where: { id: c.id },
      data: { erreurEnvoi: message }
    });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
