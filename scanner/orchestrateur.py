import sys
import json
import concurrent.futures
from outils.osint import faire_whois, faire_whatweb
from outils.scanner import faire_nmap
from outils.enumeration import faire_gobuster
from outils.vuln_scan import faire_nikto
from outils.scoring import calculer_score_global
from rapport.generateur_pdf import creer_pdf_simple, creer_pdf_avance


def maj_statut(pourcentage, message):
    try:
        with open("statut_audit.json", "w", encoding="utf-8") as f:
            json.dump({"pourcentage": pourcentage, "message": message}, f, ensure_ascii=False)
    except Exception:
        pass


maj_statut(5, "Démarrage de l'audit...")

if len(sys.argv) < 3:
    print("erreur : arguments manquants (python3 orchestrateur.py <cible> <mode>)")
    maj_statut(0, "Erreur : paramètres manquants.")
    sys.exit(1)

cible_url  = sys.argv[1]
mode_scan  = sys.argv[2]

domaine_complet = cible_url.replace("https://", "").replace("http://", "").split("/")[0]
domaine_nmap    = domaine_complet.split(":")[0]

# ─── PHASE 1 : RECONNAISSANCE ────────────────────────────────────────────────
print("phase 1 : reconnaissance multithreadée en cours...")
maj_statut(10, "Reconnaissance passive et balayage des portes (OSINT & Nmap)...")

with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
    tache_whois   = executor.submit(faire_whois,   domaine_nmap)
    tache_whatweb = executor.submit(faire_whatweb, domaine_complet)
    tache_nmap    = executor.submit(faire_nmap,    domaine_nmap, mode_scan)

    resultat_whois   = tache_whois.result()
    resultat_whatweb = tache_whatweb.result()
    resultat_nmap    = tache_nmap.result()

technos = str(resultat_whatweb).lower()
ports   = str(resultat_nmap).lower()

presence_web = (
    "http" in technos or "apache" in technos or "nginx" in technos
    or "cloudflare" in technos or len(technos) > 15
)

resultat_gobuster   = "Analyse ignorée : aucun serveur web détecté."
resultat_nikto      = "Analyse ignorée : aucun serveur web détecté."
alertes_tactiques   = ""

# ─── PHASE 2 : SCAN ──────────────────────────────────────────────────────────
print("phase 2 : analyse tactique et attaques parallèles...")
maj_statut(40, "Analyse du périmètre terminée. Préparation des offensives...")

if mode_scan == "simple":
    maj_statut(50, "Lancement du diagnostic rapide (Analyse de surface)...")
    if presence_web:
        resultat_gobuster = (
            "La cartographie des zones secrètes n'est pas incluse dans ce bilan de surface. "
            "Pour fouiller l'arrière-boutique de votre site web, veuillez requérir un audit "
            "complet en Mode Avancé."
        )
        resultat_nikto = faire_nikto(cible_url, "simple")

elif mode_scan == "avance":
    maj_statut(50, "Analyse tactique et lancement du tir groupé (Nikto, Gobuster)...")

    if not presence_web and "22" in ports:
        alertes_tactiques += "Alerte tactique : serveur pur sans site web détecté. Tests web annulés.\n\n"
    if "21" in ports:
        alertes_tactiques += "Alerte tactique : porte FTP 21 ouverte. Risque de fuite de documents.\n\n"
    if "445" in ports:
        alertes_tactiques += "Alerte tactique : partage SMB 445 exposé. Risque ransomware.\n\n"

    if presence_web:
        args_nikto      = "avance"
        lancer_gobuster = True

        if "cloudflare" in technos or "waf" in technos or "sucuri" in technos:
            alertes_tactiques += "Alerte tactique : pare-feu (WAF) détecté. Attaques passées en mode furtif.\n\n"
            args_nikto      = "furtif"
            lancer_gobuster = False
            resultat_gobuster = "Recherche de dossiers annulée pour éviter le blocage par le pare-feu."
        elif "phpmyadmin" in technos and "3306" in ports:
            alertes_tactiques += "Alerte tactique : phpMyAdmin + base de données ouverte détectés.\n\n"
            args_nikto = "avance_phpmyadmin"
        elif "wordpress" in technos and "3306" in ports:
            args_nikto = "avance_wp_sql"

        print("-> tir groupé : lancement simultané des modules offensifs...")
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            taches = {}
            taches["nikto"] = executor.submit(faire_nikto, cible_url, args_nikto)
            if lancer_gobuster:
                taches["gobuster"] = executor.submit(faire_gobuster, cible_url, "avance")

            resultat_nikto = taches["nikto"].result()
            if lancer_gobuster:
                resultat_gobuster = taches["gobuster"].result()
                if ".git" in str(resultat_gobuster).lower() or "source" in str(resultat_gobuster).lower():
                    alertes_tactiques += "Alerte tactique : dossier de code source (.git) exposé.\n\n"

maj_statut(80, "Attaques terminées. Consolidation des résultats...")

if alertes_tactiques:
    resultat_nmap += "\nL'intelligence BouzuSec a isolé les scénarios tactiques suivants :\n\n" + alertes_tactiques

diagnostic_complet = resultat_nikto

# ─── PHASE 3 : SCORING ───────────────────────────────────────────────────────
print("phase 3 : calcul du score de sécurité...")
maj_statut(90, "Calcul du score ANSSI et génération des rapports PDF...")

texte_osint = resultat_whois + " " + resultat_whatweb
barres, energie, note, niveau_texte, couleur_rgb, scores_radar = calculer_score_global(
    texte_osint, resultat_nmap, resultat_gobuster, diagnostic_complet
)

# On nettoie les stats brutes de Nikto avant de les envoyer au PDF (elles servaient au scoring)
import re
diagnostic_complet_pdf = re.sub(r'\n*\[STATS_NIKTO\].*$', '', diagnostic_complet, flags=re.DOTALL)

# Sauvegarde du JSON complet pour debug / historique
donnees_json = {
    "cible": domaine_complet,
    "mode":  mode_scan,
    "score": {
        "energie_pourcentage": energie,
        "note_sur_10":         note,
        "niveau_anssi":        niveau_texte,
        "details_radar": {
            "osint":          scores_radar[0],
            "reseau":         scores_radar[1],
            "fichiers_caches":scores_radar[2],
            "configuration":  scores_radar[3],
            "applicatif":     scores_radar[4]
        }
    },
    "resultats_bruts": {
        "whois":       resultat_whois,
        "whatweb":     resultat_whatweb,
        "nmap":        resultat_nmap,
        "gobuster":    resultat_gobuster,
        "nikto":       diagnostic_complet
    }
}
with open("resultat_audit.json", "w", encoding="utf-8") as f:
    json.dump(donnees_json, f, ensure_ascii=False, indent=4)

# ─── PHASE 4 : GÉNÉRATION DES DEUX PDFs ──────────────────────────────────────
print("phase 4 : génération du rapport SIMPLE...")
creer_pdf_simple(
    domaine_complet, mode_scan,
    resultat_whois, resultat_whatweb, resultat_nmap,
    resultat_gobuster, diagnostic_complet_pdf,
    barres, energie, note, niveau_texte, couleur_rgb, scores_radar
)

print("phase 5 : génération du rapport AVANCÉ...")
creer_pdf_avance(
    domaine_complet, mode_scan,
    resultat_whois, resultat_whatweb, resultat_nmap,
    resultat_gobuster, diagnostic_complet_pdf,
    barres, energie, note, niveau_texte, couleur_rgb, scores_radar
)

maj_statut(100, "Audit terminé ! Les deux rapports PDF sont prêts.")
print("terminé ! rapports simple + avancé générés avec succès.")
