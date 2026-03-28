# module de scan des defauts de configuration
import subprocess

# dictionnaire vulgarise a l extreme avec des analogies de la vie courante
ANALYSE_FAILLES = {
    "x_frame_options": {
        "mots_cles": ["x-frame-options", "clickjacking", "framing"],
        "titre": "Vulnérabilité de détournement de clics",
        "abbreviation": "clickjacking",
        "explication": "Imaginez qu'un escroc place une vitre transparente par-dessus le terminal de paiement de votre magasin : vos clients pensent taper leur code pour vous payer, mais c'est l'escroc qui encaisse. Sur Internet, cette faille permet à un pirate de superposer votre site web sur le sien de manière invisible pour forcer vos utilisateurs à effectuer des actions dangereuses."
    },
    "x_content_type": {
        "mots_cles": ["x-content-type-options", "nosniff", "mime"],
        "titre": "Tromperie sur le format des fichiers",
        "abbreviation": "mime-sniffing",
        "explication": "Nous avons relevé une faille concernant le traitement des fichiers sur votre serveur. Actuellement, si un attaquant envoie un virus informatique déguisé en simple image, votre serveur essaiera d'en deviner le contenu, l'ouvrira, et déclenchera l'infection."
    },
    "server_status": {
        "mots_cles": ["server-status", "server status", "apache status"],
        "titre": "Exposition des écrans de surveillance",
        "abbreviation": "fuite d'informations",
        "explication": "Une négligence critique a été détectée : les écrans de contrôle internes de votre serveur sont visibles depuis l'extérieur. Un pirate peut s'y connecter pour voir en direct qui visite votre site et comment votre machine fonctionne."
    },
    "outdated_software": {
        "mots_cles": ["outdated", "vulnerable", "obsolete", "out of date"],
        "titre": "Utilisation de verrous logiciels périmés",
        "abbreviation": "obsolescence",
        "explication": "L'audit a révélé que les fondations logicielles de votre site sont obsolètes. Les pirates informatiques utilisent des robots pour chercher ces vieilles serrures vulnérables sur Internet en permanence."
    },
    "strict_transport": {
        "mots_cles": ["strict-transport-security", "hsts"],
        "titre": "Absence de verrouillage HTTPS obligatoire",
        "abbreviation": "HSTS manquant",
        "explication": "Votre serveur n'oblige pas les navigateurs à utiliser la version chiffrée (HTTPS) de votre site. Un pirate sur un réseau Wi-Fi public peut intercepter les échanges non chiffrés de vos utilisateurs."
    },
    "cookie_security": {
        "mots_cles": ["cookie", "httponly", "secure flag"],
        "titre": "Cookies mal protégés",
        "abbreviation": "cookie non sécurisé",
        "explication": "Les identifiants de session de vos utilisateurs sont transmis sans les protections modernes. Un pirate peut voler ces cookies pour se connecter à la place de vos clients."
    },
    "directory_listing": {
        "mots_cles": ["directory indexing", "directory listing", "mod_negotiation"],
        "titre": "Listage des dossiers du serveur",
        "abbreviation": "indexation de répertoire",
        "explication": "Votre serveur affiche la liste complète des fichiers dans certains dossiers, comme un sommaire ouvert. Un pirate peut y parcourir tous vos documents sans restriction."
    },
    "cors_policy": {
        "mots_cles": ["access-control-allow", "cors"],
        "titre": "Politique de partage inter-domaines permissive",
        "abbreviation": "CORS trop ouvert",
        "explication": "Votre serveur autorise d'autres sites web à interroger vos données. Si cette politique est trop permissive, un site malveillant pourrait voler les informations de vos utilisateurs connectés."
    }
}

def faire_nikto(cible_url, mode_scan):
    # on garde juste le nom de domaine
    domaine = cible_url.replace("https://", "").replace("http://", "").split("/")[0]

    try:
        # adaptation de la frappe selon l orchestrateur
        if mode_scan == "simple":
            commande = ["nikto", "-h", domaine, "-Tuning", "123", "-maxtime", "45s", "-ask", "no"]
        elif mode_scan == "furtif":
            commande = ["nikto", "-h", domaine, "-Pause", "2", "-maxtime", "3m", "-ask", "no"]
        elif "sql" in mode_scan or "phpmyadmin" in mode_scan:
            commande = ["nikto", "-h", domaine, "-Tuning", "9", "-maxtime", "3m", "-ask", "no"]
        else:
            commande = ["nikto", "-h", domaine, "-maxtime", "3m", "-ask", "no"]

        res = subprocess.run(commande, capture_output=True, text=True, timeout=200)
        lignes = res.stdout.split('\n')

        # compter les lignes brutes de decouverte nikto (chaque + est une decouverte)
        lignes_brutes = [l for l in lignes if l.strip().startswith("+")]
        nb_decouvertes_brutes = len(lignes_brutes)

        failles_trouvees = set()
        for ligne in lignes:
            ligne_minuscule = ligne.lower()
            for cle, donnees in ANALYSE_FAILLES.items():
                for mot_cle in donnees["mots_cles"]:
                    if mot_cle in ligne_minuscule:
                        failles_trouvees.add(cle)

        if not failles_trouvees:
            if mode_scan == "simple":
                texte = "Le diagnostic rapide de surface n'a détecté aucune mauvaise configuration évidente sur vos serveurs."
            else:
                texte = "Nous avons lancé des attaques approfondies sur vos fondations. Aucune faille de configuration majeure n'a été détectée dans le temps imparti."
            texte += f"\n\n[STATS_NIKTO] Découvertes brutes : {nb_decouvertes_brutes} | Catégories : 0"
            return texte

        nb_categories = len(failles_trouvees)

        # MODE SIMPLE : le produit d appel marketing (pas de solution donnee)
        if mode_scan == "simple":
            texte_final = "Notre diagnostic rapide a repéré plusieurs faiblesses dans les fondations et la configuration de votre site :\n\n"
            for faille in failles_trouvees:
                texte_final += f"Titre : {ANALYSE_FAILLES[faille]['titre']} ({ANALYSE_FAILLES[faille]['abbreviation']})\n\n"

            texte_final += "Ce diagnostic flash vous offre un simple aperçu visuel. Pour comprendre l'impact réel sur votre entreprise et obtenir nos recommandations techniques pour corriger ces failles, une investigation en Mode Avancé est indispensable."

        # MODE AVANCÉ : l audit complet payant
        else:
            texte_final = "L'analyse approfondie de votre architecture a mis en lumière plusieurs vulnérabilités actives. Voici les enjeux concrets pour votre sécurité :\n\n"
            for faille in failles_trouvees:
                texte_final += f"Titre : {ANALYSE_FAILLES[faille]['titre']} ({ANALYSE_FAILLES[faille]['abbreviation']})\nExplication : {ANALYSE_FAILLES[faille]['explication']}\n\n"

            texte_final += "Recommandation stratégique : Ces éléments sont des brèches ouvertes. Transmettez immédiatement ce rapport à votre direction technique pour appliquer les correctifs de sécurité modernes."

        # on ajoute les stats brutes a la fin (invisible dans le pdf mais utilise par le scoring)
        texte_final += f"\n\n[STATS_NIKTO] Découvertes brutes : {nb_decouvertes_brutes} | Catégories : {nb_categories}"
        return texte_final

    except subprocess.TimeoutExpired:
        return "L'analyse a pris trop de temps et a été bloquée par vos systèmes de protection.\n\n[STATS_NIKTO] Découvertes brutes : 0 | Catégories : 0"
    except Exception as e:
        return "Une anomalie technique a perturbé le diagnostic.\n\n[STATS_NIKTO] Découvertes brutes : 0 | Catégories : 0"
