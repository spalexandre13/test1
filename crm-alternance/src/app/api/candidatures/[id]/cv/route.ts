import { prisma } from "@/lib/prisma";
import { genererPdf } from "@/lib/cv";
import { titreParDefaut } from "@/lib/cv-data";

type Ctx = { params: { id: string } };
export const maxDuration = 60;

export async function GET(_r: Request, { params }: Ctx) {
  const c = await prisma.candidature.findUnique({ where: { id: params.id } });
  if (!c) return new Response("Introuvable", { status: 404 });

  let top4: string[] = [];
  try {
    top4 = c.top4Competences ? (JSON.parse(c.top4Competences) as string[]) : [];
  } catch {
    top4 = [];
  }

  try {
    const pdf = await genererPdf({ titre_cv: c.titreCv ?? titreParDefaut(), top_4_competences: top4 });
    return new Response(new Uint8Array(pdf), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": 'inline; filename="CV-Alexandre.pdf"'
      }
    });
  } catch (e) {
    return new Response(e instanceof Error ? e.message : "Erreur PDF", { status: 500 });
  }
}
