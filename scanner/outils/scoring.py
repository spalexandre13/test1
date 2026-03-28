# module de calcul objectif des risques (methode du maillon faible anssi)
# scoring cumulatif calibre : les failles mineures pesent peu, les critiques pesent lourd
import re


def evaluer_osint(texte):
    """Évalue les risques OSINT (Whois + WhatWeb)."""
    t = texte.lower()
    risque = 0

    # --- Whois ---
    # Email d'abuse exposé (normal pour les grosses boites, risque faible)
    if "risque détecté" in t and ("e-mail" in t or "mail" in t):
        risque += 2
    if "phishing" in t:
        risque += 1

    # Whois anonymisé = bonne pratique (bonus)
    if "anonymisation" in t or "bonne pratique" in t:
        risque = max(0, risque - 1)

    # --- WhatWeb ---
    # Technologies exposées avec version = grave
    if "version" in t and ("apache" in t or "php" in t or "nginx" in t):
        risque += 4
    # Technologies détectées sans version = moyen
    elif "apache" in t or "php" in t or "nginx" in t:
        risque += 2

    # CMS connus = surface d'attaque élargie
    if "wordpress" in t or "wp-" in t:
        risque += 3
    if "phpmyadmin" in t:
        risque += 5
    if "debian" in t or "ubuntu" in t or "centos" in t:
        risque += 1

    # Technologies bien cachées = excellent (bonus)
    if "cache efficacement" in t:
        risque = max(0, risque - 2)

    # Analyse interrompue = incertitude
    if "interrompue" in t:
        risque = max(risque, 2)

    return min(risque, 10)


def evaluer_reseau(texte):
    """Évalue les risques réseau (Nmap)."""
    t = texte.lower()
    risque = 0

    # Aucun port ouvert = parfait
    if "hermétique" in t or "aucun point d'entrée" in t:
        return 0

    # Nombre de portes ouvertes
    match_nb_portes = re.search(r"(\d+)\s*portes?\s*de\s*communication", t)
    if match_nb_portes:
        nb = int(match_nb_portes.group(1))
        if nb > 10:
            risque += 5
        elif nb > 5:
            risque += 3
        elif nb > 2:
            risque += 2
        else:
            risque += 1

    # Ports critiques (vraies menaces)
    if "transfert de documents" in t or "ftp" in t:
        risque += 4
    if "partage d'entreprise" in t or "smb" in t or "445" in t:
        risque += 5
    if "chambre forte" in t or "mysql" in t or "3306" in t:
        risque += 5
    if "maintenance technique" in t or "ssh" in t:
        risque += 1

    # Alertes tactiques
    nb_alertes = t.count("alerte tactique")
    risque += nb_alertes * 2

    # Bloqué par défense
    if "bloqué" in t or "ralenti" in t:
        risque = max(risque, 2)

    return min(risque, 10)


def evaluer_enum(texte):
    """Évalue les risques fichiers cachés (GoBuster)."""
    t = texte.lower()
    risque = 0

    # Rien trouvé = parfait
    if "aucun document confidentiel" in t:
        return 0

    # GoBuster n'a pas tourné
    if "ignorée" in t or "annulée" in t or "incluse" in t:
        return 1

    # Fuites critiques (CVSS 9+)
    if "saint graal" in t or "fichiers d'environnement" in t:
        risque += 5
    if "code source" in t and "git" in t:
        risque += 5
    if "aspirations de bases" in t or "dump" in t:
        risque += 5
    if "clés de chiffrement" in t:
        risque += 5
    if "mots de passe hachés" in t:
        risque += 4

    # Panneaux d'admin (CVSS 6-7)
    if "portes d'administration" in t:
        risque += 3
    if "interface de gestion" in t or "phpmyadmin" in t:
        risque += 4

    # Dossiers sensibles (CVSS 4-5)
    if "téléchargement permissifs" in t:
        risque += 2
    if "journaux d'activité" in t:
        risque += 2
    if "fichiers de configuration de secours" in t:
        risque += 3
    if "identifiants d'hébergement" in t:
        risque += 4

    # Codes HTTP dangereux
    nb_200 = t.count("code 200")
    nb_500 = t.count("code 500")
    risque += nb_200 * 2
    risque += nb_500 * 1

    # Dossiers standards sans danger
    if "répertoires techniques standards" in t:
        risque = max(risque, 1)

    # Nombre d'alertes
    nb_elements = t.count("concernant l'élément critique")
    if nb_elements >= 5:
        risque += 2
    elif nb_elements >= 3:
        risque += 1

    if "bloquée" in t or "interrompue" in t:
        risque = max(risque, 2)

    return min(risque, 10)


def evaluer_config(texte):
    """Évalue les risques de configuration (Nikto)."""
    t = texte.lower()
    risque = 0

    # Aucune faille = parfait
    if "aucune" in t and ("mauvaise configuration" in t or "faille" in t):
        return 0

    # --- Failles GRAVES (CVSS 7+) ---
    if "verrous logiciels périmés" in t or "obsolète" in t:
        risque += 4
    if "écrans de surveillance" in t or "server-status" in t:
        risque += 3
    if "listage des dossiers" in t or "indexation de répertoire" in t:
        risque += 3

    # --- Failles MINEURES (CVSS 3-4) --- clickjacking et mime sont TRES courants
    if "détournement de clics" in t or "clickjacking" in t:
        risque += 1
    if "format des fichiers" in t or "mime-sniffing" in t:
        risque += 1
    if "verrouillage https" in t or "hsts" in t:
        risque += 1
    if "cookies mal protégés" in t or "cookie non sécurisé" in t:
        risque += 1
    if "partage inter-domaines" in t or "cors" in t:
        risque += 1

    # Stats brutes de Nikto (volume = gravité)
    match_brut = re.search(r"\[STATS_NIKTO\] Découvertes brutes : (\d+)", texte)
    match_cat = re.search(r"Catégories : (\d+)", texte)
    if match_brut:
        nb_brut = int(match_brut.group(1))
        if nb_brut > 20:
            risque += 3
        elif nb_brut > 10:
            risque += 2
        elif nb_brut > 5:
            risque += 1
    if match_cat:
        nb_cat = int(match_cat.group(1))
        if nb_cat >= 6:
            risque += 2
        elif nb_cat >= 4:
            risque += 1

    if "trop de temps" in t or "bloquée" in t:
        risque = max(risque, 2)

    return min(risque, 10)


def evaluer_app(texte):
    """Évalue les risques applicatifs."""
    t = texte.lower()
    risque = 0

    # --- Failles CRITIQUES (CVSS 9+) ---
    if "injection" in t and "sql" in t:
        risque += 5
    elif "injection" in t:
        risque += 4
    if "xss" in t or "cross-site scripting" in t:
        risque += 4
    if "csrf" in t:
        risque += 4
    if "traversal" in t or "traversée" in t:
        risque += 4
    if "remote code" in t or "exécution" in t:
        risque += 5

    # --- Impact INDIRECT des failles de config (poids faible) ---
    if "virus informatique déguisé" in t:
        risque += 1
    if "superposer votre site" in t:
        risque += 1

    # Stats brutes Nikto (beaucoup de découvertes = plus de surface)
    match_brut = re.search(r"\[STATS_NIKTO\] Découvertes brutes : (\d+)", texte)
    if match_brut:
        nb = int(match_brut.group(1))
        if nb > 20:
            risque += 2
        elif nb > 10:
            risque += 1

    # Aucune faille
    if "aucune" in t and ("détecté" in t or "configuration" in t):
        risque = 0

    return min(risque, 10)


# la fonction principale appelee par l orchestrateur
def calculer_score_global(texte_osint, texte_nmap, texte_gobuster, texte_diag):
    # 1. on calcule les 5 scores pour le graphique radar
    score_osint = evaluer_osint(texte_osint)
    score_reseau = evaluer_reseau(texte_nmap)
    score_enum = evaluer_enum(texte_gobuster)
    score_config = evaluer_config(texte_diag)
    score_app = evaluer_app(texte_diag)

    scores_radar = [score_osint, score_reseau, score_enum, score_config, score_app]

    # 2. methode anssi amelioree :
    # le pire risque pese 50%, la moyenne des 5 axes pese 50%
    pire_risque = max(scores_radar)
    moyenne = sum(scores_radar) / len(scores_radar)

    risque_global = (pire_risque * 0.5) + (moyenne * 0.5)

    # 3. energie de sante (echelle 0-100%)
    # on utilise un multiplicateur de 9 (pas 10) pour ne pas etre trop punitif
    energie_sante = round(100 - (risque_global * 9))
    energie_sante = max(5, min(100, energie_sante))

    note_sur_10 = round(energie_sante / 10, 1)

    # 4. matrice de couleur anssi
    if risque_global >= 7.5:
        barres = 1
        niveau_texte = "RISQUE CRITIQUE"
        couleur = (229, 57, 53)
    elif risque_global >= 5:
        barres = 2
        niveau_texte = "RISQUE ÉLEVÉ"
        couleur = (230, 126, 34)
    elif risque_global >= 3:
        barres = 3
        niveau_texte = "RISQUE MODÉRÉ"
        couleur = (253, 216, 53)
    elif risque_global >= 1:
        barres = 4
        niveau_texte = "RISQUE FAIBLE"
        couleur = (39, 174, 96)
    else:
        barres = 4
        niveau_texte = "RISQUE TRÈS FAIBLE"
        couleur = (39, 174, 96)

    # debug
    print(f"  [SCORING] OSINT={score_osint} RESEAU={score_reseau} ENUM={score_enum} CONFIG={score_config} APP={score_app}")
    print(f"  [SCORING] Pire={pire_risque} Moyenne={moyenne:.1f} Global={risque_global:.1f} Energie={energie_sante}%")

    return barres, energie_sante, note_sur_10, niveau_texte, couleur, scores_radar
