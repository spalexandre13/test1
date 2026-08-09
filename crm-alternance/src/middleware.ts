import { NextResponse, type NextRequest } from "next/server";

// Protection par mot de passe (HTTP Basic).
//
// Une instance publique donne acces a l'envoi de mails depuis TON compte Gmail
// et a ton quota Groq. Sur un hebergement public, l'application refuse donc de
// servir quoi que ce soit tant que APP_PASSWORD n'est pas defini.
// En local (npm run dev), la protection est optionnelle.

const REALM = 'Basic realm="CRM Alternance", charset="UTF-8"';

function demanderIdentifiants(message: string) {
  return new NextResponse(message, {
    status: 401,
    headers: { "WWW-Authenticate": REALM, "content-type": "text/plain; charset=utf-8" }
  });
}

// Comparaison a duree constante : evite de divulguer le mot de passe
// caractere par caractere via le temps de reponse.
function egalConstant(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export function middleware(request: NextRequest) {
  const motDePasse = process.env.APP_PASSWORD;
  const estPublic = Boolean(process.env.VERCEL);

  if (!motDePasse) {
    if (estPublic) {
      return new NextResponse(
        "Configuration incomplete : definis la variable d'environnement APP_PASSWORD " +
          "dans les reglages du projet Vercel, puis redeploie.\n\n" +
          "Sans mot de passe, n'importe qui pourrait envoyer des mails depuis ton compte Gmail.",
        { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } }
      );
    }
    return NextResponse.next(); // dev local : pas de protection imposee
  }

  const entete = request.headers.get("authorization");
  if (!entete?.startsWith("Basic ")) return demanderIdentifiants("Authentification requise.");

  let fourni = "";
  try {
    const decode = atob(entete.slice(6));
    fourni = decode.slice(decode.indexOf(":") + 1);
  } catch {
    return demanderIdentifiants("En-tete d'authentification invalide.");
  }

  if (!egalConstant(fourni, motDePasse)) {
    return demanderIdentifiants("Mot de passe incorrect.");
  }
  return NextResponse.next();
}

export const config = {
  // On protege tout sauf les assets statiques de Next.
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
