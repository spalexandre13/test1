# Générateur de rapports PDF BouzuSec — Simple & Avancé
from fpdf import FPDF
import time
import os
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt


# ─────────────────────────────────────────────────────────────────────────────
# Classe de base commune aux deux rapports
# ─────────────────────────────────────────────────────────────────────────────
class RapportBouzuSec(FPDF):
    def header(self):
        self.set_font("Arial", "B", 9)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, "CABINET BOUZUSEC   AUDIT DE SÉCURITÉ STRATÉGIQUE", border=0, ln=True, align="R")
        self.line(10, 18, 200, 18)
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font("Arial", "I", 8)
        self.set_text_color(150, 150, 150)
        self.cell(0, 10, f"Document strictement confidentiel et réservé à la direction   Page {self.page_no()}", border=0, align="C")


# ─────────────────────────────────────────────────────────────────────────────
# Helpers partagés
# ─────────────────────────────────────────────────────────────────────────────
def _sec(texte):
    """Nettoie le texte pour l'encodage latin-1 utilisé par FPDF."""
    texte = str(texte)
    for src, dst in [("'", "'"), ("'", "'"), ("–", "-"), ("—", "-"), ("•", "-")]:
        texte = texte.replace(src, dst)
    return texte.encode("latin-1", "replace").decode("latin-1")


def _section(pdf, titre, contenu):
    pdf.set_fill_color(245, 245, 245)
    pdf.set_text_color(44, 62, 80)
    pdf.set_font("Arial", "B", 12)
    pdf.cell(0, 10, _sec(titre), border=0, ln=True, fill=True)
    pdf.ln(2)
    pdf.set_text_color(30, 30, 30)
    pdf.set_font("Arial", "", 10)
    pdf.multi_cell(0, 6, _sec(contenu))
    pdf.ln(7)


def _definition(pdf, terme, definition):
    pdf.set_font("Arial", "B", 11)
    pdf.set_text_color(230, 126, 34)
    pdf.cell(0, 6, _sec(terme), ln=True)
    pdf.set_font("Arial", "", 10)
    pdf.set_text_color(50, 50, 50)
    pdf.multi_cell(0, 6, _sec(definition))
    pdf.ln(4)


def _batterie(pdf, x, y, barres_actives, couleur):
    pdf.set_fill_color(40, 40, 40)
    pdf.rect(x, y, 60, 25, "F")
    pdf.rect(x + 60, y + 7, 4, 11, "F")
    pdf.set_fill_color(255, 255, 255)
    pdf.rect(x + 2, y + 2, 56, 21, "F")
    for i in range(4):
        if i < barres_actives:
            pdf.set_fill_color(*couleur)
        else:
            pdf.set_fill_color(230, 230, 230)
        pdf.rect(x + 3 + i * 14, y + 3, 12.5, 19, "F")


def _radar(scores, nom_fichier="radar_tmp.png"):
    labels = np.array(["Données Publiques", "Portes (Réseau)", "Dossiers Cachés", "Configuration", "Code Applicatif"])
    angles = np.linspace(0, 2 * np.pi, len(labels), endpoint=False)
    s = np.concatenate((scores, [scores[0]]))
    a = np.concatenate((angles, [angles[0]]))
    fig, ax = plt.subplots(figsize=(5.5, 5.5), subplot_kw=dict(polar=True))
    ax.fill(a, s, color="#e67e22", alpha=0.4)
    ax.plot(a, s, color="#d35400", linewidth=2)
    ax.set_yticklabels([])
    ax.set_xticks(angles)
    ax.set_xticklabels(labels, fontsize=10, fontweight="bold", color="#2c3e50")
    ax.set_ylim(0, 10)
    plt.savefig(nom_fichier, transparent=True, bbox_inches="tight")
    plt.close()


def _page_couverture(pdf, domaine, mode_scan, barres, energie, note, niveau_texte, couleur_rgb, scores_radar, label_mode):
    """Page 1 commune aux deux rapports : dashboard executive."""
    pdf.add_page()
    pdf.set_font("Arial", "B", 22)
    pdf.set_text_color(230, 126, 34)
    pdf.cell(0, 15, _sec(f"RAPPORT {label_mode}"), ln=True, align="C")

    pdf.set_font("Arial", "B", 12)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 8, _sec(f"Cible de l'audit : {domaine}"), ln=True, align="C")
    pdf.cell(0, 8, _sec(f"Date : {time.strftime('%d/%m/%Y')} | Mode : {mode_scan.capitalize()}"), ln=True, align="C")
    pdf.ln(8)

    pdf.set_fill_color(250, 250, 250)
    pdf.rect(10, 55, 190, 70, "F")

    pdf.set_y(60)
    pdf.set_font("Arial", "B", 16)
    pdf.set_text_color(44, 62, 80)
    pdf.cell(0, 10, _sec("SYNTHÈSE DU NIVEAU DE RISQUE"), ln=True, align="C")

    _batterie(pdf, 75, 75, barres, couleur_rgb)

    pdf.set_y(105)
    pdf.set_font("Arial", "B", 18)
    pdf.set_text_color(*couleur_rgb)
    pdf.cell(0, 8, _sec(f"Niveau d'énergie vitale : {energie} %"), ln=True, align="C")

    pdf.set_font("Arial", "B", 12)
    pdf.set_text_color(80, 80, 80)
    pdf.cell(0, 6, _sec(f"Évaluation ANSSI : {niveau_texte} (Note : {note}/10)"), ln=True, align="C")

    _radar(scores_radar, "radar_tmp.png")

    pdf.set_y(140)
    pdf.set_font("Arial", "B", 14)
    pdf.set_text_color(44, 62, 80)
    pdf.cell(0, 10, _sec("CARTOGRAPHIE DES VECTEURS DE RISQUE"), ln=True, align="C")
    pdf.image("radar_tmp.png", x=45, y=150, w=120)

    if os.path.exists("radar_tmp.png"):
        os.remove("radar_tmp.png")


# ─────────────────────────────────────────────────────────────────────────────
# RAPPORT SIMPLE  (2-3 pages, résumé exécutif)
# ─────────────────────────────────────────────────────────────────────────────
def creer_pdf_simple(domaine, mode_scan, data_whois, data_whatweb, data_nmap,
                     data_gobuster, data_nikto, barres, energie, note,
                     niveau_texte, couleur_rgb, scores_radar):

    pdf = RapportBouzuSec()

    # --- Page 1 : Dashboard ---
    _page_couverture(pdf, domaine, mode_scan, barres, energie, note,
                     niveau_texte, couleur_rgb, scores_radar, "EXÉCUTIF — VERSION SIMPLE")

    # --- Page 2 : Résumé vulgarisé ---
    pdf.add_page()
    pdf.set_font("Arial", "B", 16)
    pdf.set_text_color(230, 126, 34)
    pdf.cell(0, 10, _sec("RÉSUMÉ EXÉCUTIF"), ln=True)
    pdf.ln(4)

    intro = (
        "Ce rapport de synthèse a été conçu pour la direction générale. "
        "Il présente les grandes lignes de la santé numérique de votre infrastructure "
        "sans jargon technique, accompagnées de trois recommandations prioritaires."
    )
    pdf.set_font("Arial", "I", 11)
    pdf.set_text_color(50, 50, 50)
    pdf.multi_cell(0, 6, _sec(intro))
    pdf.ln(8)

    # Résumé des 5 axes en une phrase par axe
    noms_axes = [
        ("Données Publiques (OSINT)",   scores_radar[0]),
        ("Portes Réseau (Nmap)",        scores_radar[1]),
        ("Dossiers Cachés (GoBuster)",  scores_radar[2]),
        ("Configuration Serveur",       scores_radar[3]),
        ("Code Applicatif (Nikto)",     scores_radar[4]),
    ]

    pdf.set_font("Arial", "B", 13)
    pdf.set_text_color(44, 62, 80)
    pdf.cell(0, 8, _sec("Vue d'ensemble par axe d'analyse :"), ln=True)
    pdf.ln(2)

    for nom, score in noms_axes:
        if score >= 9:
            etat, r, g, b = "CRITIQUE", 229, 57, 53
        elif score >= 7:
            etat, r, g, b = "ÉLEVÉ", 230, 126, 34
        elif score >= 4:
            etat, r, g, b = "MODÉRÉ", 230, 180, 34
        else:
            etat, r, g, b = "FAIBLE", 39, 174, 96

        pdf.set_font("Arial", "B", 11)
        pdf.set_text_color(r, g, b)
        pdf.cell(50, 7, _sec(f"[{etat}]"), border=0)
        pdf.set_text_color(44, 62, 80)
        pdf.cell(0, 7, _sec(nom), ln=True)

    pdf.ln(10)

    # 3 recommandations prioritaires
    pdf.set_font("Arial", "B", 13)
    pdf.set_text_color(44, 62, 80)
    pdf.cell(0, 8, _sec("3 Recommandations prioritaires :"), ln=True)
    pdf.ln(3)

    noms_actions = [
        "Masquer l'identité du serveur (OSINT)",
        "Verrouiller les ports d'accès (Pare-feu)",
        "Sécuriser les dossiers cachés et sauvegardes",
        "Mettre à jour les logiciels du serveur",
        "Corriger le code du site web (Injections/XSS)",
    ]
    priorites = sorted(zip(scores_radar, noms_actions), reverse=True)[:3]

    for i, (score, action) in enumerate(priorites, 1):
        pdf.set_font("Arial", "B", 11)
        pdf.set_text_color(230, 126, 34)
        pdf.cell(0, 7, _sec(f"Recommandation {i} : {action}"), ln=True)
        pdf.set_font("Arial", "", 10)
        pdf.set_text_color(50, 50, 50)
        if score >= 7:
            conseil = "Action urgente — intervenir sous 24 à 48 heures."
        elif score >= 4:
            conseil = "Action prioritaire — planifier sous 7 jours."
        else:
            conseil = "Amélioration recommandée lors de la prochaine maintenance."
        pdf.multi_cell(0, 6, _sec(conseil))
        pdf.ln(3)

    # Invitation au rapport avancé
    pdf.ln(6)
    pdf.set_fill_color(255, 246, 235)
    pdf.set_draw_color(230, 126, 34)
    pdf.set_font("Arial", "B", 11)
    pdf.set_text_color(44, 62, 80)
    pdf.multi_cell(0, 7, _sec(
        "Pour obtenir l'analyse technique complète, le plan d'action détaillé étape par étape "
        "et le lexique cybersécurité, consultez le Rapport Avancé fourni avec cet audit."
    ), border=1)

    # Sauvegarde
    pdf.output("rapport_simple.pdf")
    print("rapport_simple.pdf généré.")


# ─────────────────────────────────────────────────────────────────────────────
# RAPPORT AVANCÉ  (6 pages, technique complet)
# ─────────────────────────────────────────────────────────────────────────────
def creer_pdf_avance(domaine, mode_scan, data_whois, data_whatweb, data_nmap,
                     data_gobuster, data_nikto, barres, energie, note,
                     niveau_texte, couleur_rgb, scores_radar):

    pdf = RapportBouzuSec()

    # --- Page 1 : Dashboard ---
    _page_couverture(pdf, domaine, mode_scan, barres, energie, note,
                     niveau_texte, couleur_rgb, scores_radar, "D'AUDIT AVANCÉ — VERSION COMPLÈTE")

    # --- Pages 2/3 : Résultats détaillés ---
    pdf.add_page()
    intro = (
        "Ce document s'adresse à la direction générale et aux équipes techniques. "
        "Il présente un bilan complet de la santé numérique de votre infrastructure vue de l'extérieur, "
        "avec l'ensemble des résultats bruts, le contexte de chaque vulnérabilité et un plan d'action priorisé."
    )
    pdf.set_font("Arial", "I", 11)
    pdf.set_text_color(50, 50, 50)
    pdf.multi_cell(0, 6, _sec(intro))
    pdf.ln(10)

    _section(pdf, "I. RECONNAISSANCE ET IDENTITÉ",
             "Analyse des données publiques et de la carte d'identité de votre serveur.\n\n"
             + data_whois + "\n\n" + data_whatweb)
    _section(pdf, "II. EXAMEN DES PORTES D'ACCÈS", data_nmap)

    pdf.add_page()
    _section(pdf, "III. CARTOGRAPHIE DES ZONES CACHÉES", data_gobuster)
    _section(pdf, "IV. DIAGNOSTIC DES VULNÉRABILITÉS APPLICATIVES", data_nikto)

    # --- Page 4 : Plan d'action ---
    pdf.add_page()
    pdf.set_font("Arial", "B", 16)
    pdf.set_text_color(230, 126, 34)
    pdf.cell(0, 10, _sec("V. PLAN D'ACTION STRATÉGIQUE (FEUILLE DE ROUTE)"), ln=True)
    pdf.ln(5)

    if mode_scan == "simple":
        texte_roadmap = (
            "Vous consultez le rapport avancé généré à partir d'une analyse en Mode Simple.\n\n"
            "Pour une feuille de route complète avec hiérarchisation précise des urgences, "
            "relancez l'audit en Mode Avancé afin d'activer les modules Nikto complet et GoBuster."
        )
        pdf.set_font("Arial", "", 11)
        pdf.set_text_color(50, 50, 50)
        pdf.multi_cell(0, 6, _sec(texte_roadmap))
    else:
        pdf.set_font("Arial", "", 11)
        pdf.set_text_color(50, 50, 50)
        pdf.multi_cell(0, 6, _sec(
            "Sur la base des vulnérabilités identifiées, voici la feuille de route priorisée "
            "que votre direction informatique doit suivre :\n"
        ))
        pdf.ln(5)

        noms_axes = [
            "Masquer l'identité du serveur (OSINT)",
            "Verrouiller les ports d'accès (Pare-feu)",
            "Sécuriser les dossiers cachés et sauvegardes",
            "Mettre à jour les logiciels du serveur",
            "Corriger le code du site web (Injections/XSS)",
        ]
        priorites = sorted(zip(scores_radar, noms_axes), reverse=True)

        etape = 1
        for score, action in priorites:
            if score >= 7:
                niveau = "URGENCE ABSOLUE (Correction sous 24h)"
                pdf.set_text_color(229, 57, 53)
            elif score >= 4:
                niveau = "PRIORITÉ MODÉRÉE (Correction sous 7 jours)"
                pdf.set_text_color(230, 126, 34)
            elif score >= 1:
                niveau = "AMÉLIORATION RECOMMANDÉE (Maintenance régulière)"
                pdf.set_text_color(39, 174, 96)
            else:
                continue
            pdf.set_font("Arial", "B", 11)
            pdf.cell(0, 6, _sec(f"Étape {etape} : {action}"), ln=True)
            pdf.set_font("Arial", "I", 10)
            pdf.cell(0, 6, _sec(f"-> {niveau}"), ln=True)
            pdf.ln(3)
            etape += 1

        if etape == 1:
            pdf.set_text_color(39, 174, 96)
            pdf.cell(0, 6, _sec("Félicitations, aucune action urgente n'est requise. Maintenez cette rigueur."), ln=True)

    # --- Page 5 : Méthodologie ANSSI ---
    pdf.add_page()
    pdf.set_font("Arial", "B", 16)
    pdf.set_text_color(44, 62, 80)
    pdf.cell(0, 10, _sec("VI. MÉTHODOLOGIE DE L'ÉVALUATION (RÉFÉRENTIEL ANSSI)"), ln=True)
    pdf.ln(5)

    texte_anssi = (
        "Le score global de cet audit a été calculé selon la méthode officielle de l'Agence Nationale "
        "de la Sécurité des Systèmes d'Information (ANSSI).\n\n"
        "En cybersécurité, on ne fait pas de moyenne. La sécurité d'un système est égale à la solidité "
        "de son maillon le plus faible. Notre outil classe la pire vulnérabilité trouvée en croisant "
        "deux facteurs :\n\n"
        "1. La gravité de l'impact métier (de Mineur à Critique).\n"
        "2. La facilité d'exploitation par le pirate (de Très difficile à Facile).\n\n"
        "C'est la matrice ci-dessous qui définit le niveau d'énergie vitale de votre batterie."
    )
    pdf.set_font("Arial", "", 11)
    pdf.set_text_color(50, 50, 50)
    pdf.multi_cell(0, 6, _sec(texte_anssi))
    pdf.ln(5)

    _section(pdf, "Limites du diagnostic",
             "Cet audit (DAST) analyse la surface sans posséder votre contexte métier interne. "
             "Il ne remplace pas l'ingénierie humaine pour les failles logiques de conception (Insecure Design).")

    # --- Page 6 : Lexique ---
    pdf.add_page()
    pdf.set_font("Arial", "B", 16)
    pdf.set_text_color(44, 62, 80)
    pdf.cell(0, 10, _sec("VII. LEXIQUE CYBER POUR LA DIRECTION"), ln=True)
    pdf.ln(5)

    _definition(pdf, "Port / Porte d'accès numérique",
                "Un canal de communication sur votre serveur. Comme un bâtiment a une porte d'entrée "
                "et une porte de service, un serveur a des ports. Le port 80 est la porte publique, "
                "le port 22 est la porte blindée de maintenance.")
    _definition(pdf, "Vulnérabilité Applicative (XSS / SQLi)",
                "Un défaut de fabrication dans le code de votre site web qui permet à un pirate de tromper "
                "le système, par exemple pour lire votre base de données à la place du serveur.")
    _definition(pdf, "WAF (Web Application Firewall)",
                "Un vigile numérique placé devant votre site web. Il analyse les visiteurs et bloque ceux "
                "qui ont un comportement suspect ou qui tentent d'injecter des virus.")
    _definition(pdf, "OSINT (Open Source Intelligence)",
                "L'art de recueillir des informations publiques sur une entreprise (carte d'identité du serveur, "
                "technologies utilisées) sans même avoir besoin de l'attaquer.")
    _definition(pdf, "DAST (Dynamic Application Security Testing)",
                "L'outil que nous avons utilisé. C'est un robot qui interagit avec votre site web de l'extérieur "
                "en imitant le comportement d'un vrai pirate informatique.")

    # Sauvegarde
    pdf.output("rapport_avance.pdf")
    print("rapport_avance.pdf généré.")
