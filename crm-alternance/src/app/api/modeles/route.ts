import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  return NextResponse.json(await prisma.modeleEmail.findMany({ orderBy: { createdAt: "desc" } }));
}

export async function POST(request: Request) {
  const body = await request.json();
  if (!body.nom?.trim() || !body.objet?.trim() || !body.contenu?.trim()) {
    return NextResponse.json({ error: "nom, objet et contenu sont requis" }, { status: 400 });
  }
  const m = await prisma.modeleEmail.upsert({
    where: { nom: body.nom },
    update: { objet: body.objet, contenu: body.contenu, estDefaut: Boolean(body.estDefaut) },
    create: {
      nom: body.nom,
      objet: body.objet,
      contenu: body.contenu,
      estDefaut: Boolean(body.estDefaut)
    }
  });
  return NextResponse.json(m, { status: 201 });
}
