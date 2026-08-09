import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const statut = new URL(request.url).searchParams.get("statut");
  return NextResponse.json(
    await prisma.candidature.findMany({
      where: statut ? { statut } : {},
      orderBy: { updatedAt: "desc" },
      include: { entreprise: true }
    })
  );
}
