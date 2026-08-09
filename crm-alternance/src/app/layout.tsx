import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "CRM Alternance - Alexandre",
  description: "Pilotage local des candidatures spontanées d'alternance."
};

const LIENS = [
  { href: "/", label: "Pipeline" },
  { href: "/sourcing", label: "Sourcing" },
  { href: "/validation", label: "Validation" },
  { href: "/modeles", label: "Modèles" },
  { href: "/sante", label: "Diagnostic" }
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3">
            <Link href="/" className="font-semibold">CRM Alternance</Link>
            <nav className="flex gap-4 text-sm text-slate-600">
              {LIENS.map((l) => (
                <Link key={l.href} className="hover:text-slate-900" href={l.href}>
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-6 py-6">{children}</main>
      </body>
    </html>
  );
}
