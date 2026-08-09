import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const Schema = z.object({
  nom: z.string().min(1),
  siret: z.string().optional(),
  siren: z.string().optional(),
  naf: z.string().optional(),
  nafLibelle: z.string().optional(),
  adresse: z.string().optional(),
  ville: z.string().optional(),
  codePostal: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  siteWeb: z.string().optional(),
  emailRh: z.string().optional(),
  emailEntreprise: z.string().optional(),
  telephone: z.string().optional(),
  descriptionBrute: z.string().optional(),
  scorePertinence: z.number().optional(),
  categorie: z.string().optional(),
  signauxJson: z.string().optional(),
  proposeAlternance: z.boolean().optional(),
  source: z.string().optional()
});

export async function GET() {
  return NextResponse.json(
    await prisma.entreprise.findMany({
      orderBy: [{ scorePertinence: "desc" }, { createdAt: "desc" }],
      include: { _count: { select: { candidatures: true } } }
    })
  );
}

export async function POST(request: Request) {
  const parsed = Schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const data = parsed.data;

  // Le SIRET est l'identifiant naturel : on evite les doublons.
  if (data.siret) {
    const existant = await prisma.entreprise.findUnique({ where: { siret: data.siret } });
    if (existant) {
      const maj = await prisma.entreprise.update({
        where: { id: existant.id },
        data: {
          emailRh: data.emailRh ?? existant.emailRh,
          emailEntreprise: data.emailEntreprise ?? existant.emailEntreprise,
          telephone: data.telephone ?? existant.telephone,
          siteWeb: data.siteWeb ?? existant.siteWeb,
          scorePertinence: data.scorePertinence ?? existant.scorePertinence
        }
      });
      return NextResponse.json(maj);
    }
  }
  return NextResponse.json(await prisma.entreprise.create({ data }), { status: 201 });
}
