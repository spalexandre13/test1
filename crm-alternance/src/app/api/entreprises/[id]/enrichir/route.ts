import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { recupererPagesContact, normaliserUrlSite } from "@/lib/enrichment/scraper";
import { agregerContacts } from "@/lib/enrichment/contacts";

type Ctx = { params: { id: string } };
export const maxDuration = 60;

// Va chercher sur le site de l'entreprise : email RH, email generique, telephone.
export async function POST(request: Request, { params }: Ctx) {
  const entreprise = await prisma.entreprise.findUnique({ where: { id: params.id } });
  if (!entreprise) return NextResponse.json({ error: "Introuvable" }, { status: 404 });

  const body = await request.json().catch(() => ({}));
  const site = normaliserUrlSite(body.siteWeb ?? entreprise.siteWeb ?? "");
  if (!site) {
    return NextResponse.json(
      { error: "Aucun site web connu pour cette entreprise. Renseigne-le d'abord." },
      { status: 400 }
    );
  }

  try {
    const pages = await recupererPagesContact(site);
    if (pages.length === 0) {
      return NextResponse.json(
        { error: `Site injoignable ou sans page exploitable : ${site}` },
        { status: 502 }
      );
    }

    const domaine = new URL(site).hostname;
    const contacts = agregerContacts(pages, domaine);

    const maj = await prisma.entreprise.update({
      where: { id: entreprise.id },
      data: {
        siteWeb: site,
        // On ne remplace une valeur existante que si on a trouve mieux.
        emailRh: contacts.emailRh ?? entreprise.emailRh,
        emailEntreprise: contacts.emailEntreprise ?? entreprise.emailEntreprise,
        telephone: contacts.telephone ?? entreprise.telephone,
        contactsJson: JSON.stringify(contacts),
        contactsMajLe: new Date()
      }
    });

    return NextResponse.json({
      entreprise: maj,
      contacts,
      pagesVisitees: pages.map((p) => p.url)
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erreur d'enrichissement" },
      { status: 500 }
    );
  }
}
