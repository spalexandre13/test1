import { NextResponse } from "next/server";
import { rechercher } from "@/lib/recherche";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const ville = url.searchParams.get("ville")?.trim() || "Sophia Antipolis";
  const rayonKm = Number(url.searchParams.get("rayon") ?? "30");
  const limite = Number(url.searchParams.get("limite") ?? "40");

  try {
    const rapport = await rechercher({ ville, rayonKm, limite });
    // Une source en echec n'est pas une erreur fatale : on renvoie ce qu'on a,
    // en signalant explicitement ce qui n'a pas repondu.
    return NextResponse.json(rapport);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur de recherche" },
      { status: 502 }
    );
  }
}
