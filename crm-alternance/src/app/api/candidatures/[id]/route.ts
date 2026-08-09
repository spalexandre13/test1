import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Ctx = { params: { id: string } };

export async function GET(_r: Request, { params }: Ctx) {
  const c = await prisma.candidature.findUnique({
    where: { id: params.id },
    include: { entreprise: true }
  });
  if (!c) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(c);
}

export async function PATCH(request: Request, { params }: Ctx) {
  const body = await request.json();
  const data: Record<string, unknown> = {};
  for (const k of [
    "statut", "destinataire", "cc", "objet", "corpsEmail",
    "titreCv", "notes"
  ] as const) {
    if (k in body) data[k] = body[k];
  }
  if (Array.isArray(body.top4Competences)) {
    data.top4Competences = JSON.stringify(body.top4Competences);
  }
  for (const k of ["dateRelancePrevue", "dateReponse"] as const) {
    if (k in body) data[k] = body[k] ? new Date(body[k]) : null;
  }
  return NextResponse.json(await prisma.candidature.update({ where: { id: params.id }, data }));
}

export async function DELETE(_r: Request, { params }: Ctx) {
  await prisma.candidature.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
