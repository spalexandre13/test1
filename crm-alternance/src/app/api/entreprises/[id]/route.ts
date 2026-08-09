import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Ctx = { params: { id: string } };

export async function GET(_r: Request, { params }: Ctx) {
  const e = await prisma.entreprise.findUnique({
    where: { id: params.id },
    include: { candidatures: true }
  });
  if (!e) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(e);
}

export async function PATCH(request: Request, { params }: Ctx) {
  const body = await request.json();
  const champs = [
    "nom", "siteWeb", "emailRh", "emailEntreprise", "telephone",
    "descriptionCourte", "ville", "codePostal", "notes"
  ] as const;
  const data: Record<string, unknown> = {};
  for (const c of champs) if (c in body) data[c] = body[c];
  return NextResponse.json(await prisma.entreprise.update({ where: { id: params.id }, data }));
}

export async function DELETE(_r: Request, { params }: Ctx) {
  await prisma.entreprise.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
