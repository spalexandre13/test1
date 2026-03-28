# module enumeration gobuster avec codes d etat http
# import subprocess pour lancer des commandes linux depuis python
# import re c est pour les expressions regulieres on s en sert pour extraire les codes d etat
import subprocess
import re

# le mega dictionnaire de 16 dossiers ultra critiques
# on a mis les pires trucs qu on peut trouver sur un serveur pour faire flipper le client
ANALYSE_METIER = {
    "fichier_env": {
        "mots_cles": [".env", "config.env", "docker-compose.env"],
        "titre": "Fichiers d'environnement et secrets",
        "explication": "Le Saint Graal des pirates. Ce fichier contient les mots de passe de votre base de données et souvent vos clés d'API (Stripe, AWS). S'il est lu, votre entreprise est compromise à 100%."
    },
    "code_git": {
        "mots_cles": [".git", ".svn"],
        "titre": "Historique et code source (Git)",
        "explication": "Tout le code source de votre site est exposé. Un attaquant peut le télécharger pour y chercher des failles sur mesure ou des mots de passe oubliés par vos développeurs dans le code."
    },
    "sauvegardes_bdd": {
        "mots_cles": ["backup", "dump.sql", "db.sql", "database.sql"],
        "titre": "Aspirations de bases de données",
        "explication": "Une copie complète de votre base de données a été oubliée sur le serveur. Elle contient potentiellement les données personnelles de tous vos clients."
    },
    "fichiers_vieux": {
        "mots_cles": [".old", ".bak", "wp-config.php.bak", "config.old"],
        "titre": "Fichiers de configuration de secours",
        "explication": "Les développeurs font souvent des copies de secours et oublient de les sécuriser. Ces fichiers trahissent les accès internes de votre serveur."
    },
    "panneau_admin": {
        "mots_cles": ["admin", "administrator", "wp-admin", "manager"],
        "titre": "Portes d'administration",
        "explication": "La porte d'entrée de votre bureau de direction est visible. Si elle n'a pas de double authentification, les pirates vont tenter de forcer la serrure jour et nuit."
    },
    "cles_ssh": {
        "mots_cles": [".ssh", "id_rsa", "authorized_keys"],
        "titre": "Clés de chiffrement de l'infrastructure",
        "explication": "Les clés d'accès physique à vos serveurs sont exposées. C'est la pire faille d'infrastructure possible."
    },
    "gestionnaire_bdd": {
        "mots_cles": ["phpmyadmin", "pma", "dbadmin"],
        "titre": "Interface de gestion de base de données",
        "explication": "Un panneau de contrôle graphique relié directement à vos données est accessible sur Internet. C'est une cible prioritaire pour les groupes criminels."
    },
    "repertoires_cloud": {
        "mots_cles": [".aws", ".azure", ".gcp"],
        "titre": "Identifiants d'hébergement Cloud",
        "explication": "Les clés permettant de contrôler votre compte hébergeur sont exposées. Un attaquant pourrait effacer vos serveurs ou les utiliser pour miner de la cryptomonnaie à vos frais."
    },
    "conteneurs_docker": {
        "mots_cles": ["docker-compose.yml", "dockerfile"],
        "titre": "Architecture des conteneurs",
        "explication": "L'architecture exacte de vos serveurs virtuels est lisible. Cela facilite grandement la planification d'une attaque ciblée."
    },
    "journaux_logs": {
        "mots_cles": ["logs", "error_log", "access.log", "debug.log"],
        "titre": "Journaux d'activité du serveur",
        "explication": "Vos fichiers de diagnostic sont publics. Ils révèlent souvent les adresses IP de vos clients ou des erreurs internes bavardes qui aident les pirates."
    },
    "documentation_api": {
        "mots_cles": ["swagger", "api-docs", "v1", "v2", "graphql"],
        "titre": "Manuels d'utilisation de vos API",
        "explication": "La documentation technique de vos flux de données est ouverte. C'est un mode d'emploi parfait pour expliquer aux pirates comment interagir avec vos systèmes."
    },
    "dossiers_upload": {
        "mots_cles": ["uploads", "images", "media", "assets"],
        "titre": "Dossiers de téléchargement permissifs",
        "explication": "Ces répertoires servent à stocker les images, mais si un attaquant peut y envoyer un fichier exécutable, il prendra le contrôle du site."
    },
    "fichiers_projet_ide": {
        "mots_cles": [".idea", ".vscode", ".project"],
        "titre": "Fichiers de logiciels de développement",
        "explication": "Des fichiers générés par les logiciels de vos développeurs sont en ligne. Ils exposent la structure interne de votre code de manière involontaire."
    },
    "supervision_apache": {
        "mots_cles": ["server-status", "server-info"],
        "titre": "Ecrans de surveillance du serveur",
        "explication": "Les métriques de votre serveur sont publiques. On peut y voir les requêtes des autres utilisateurs en temps réel."
    },
    "cartographie_bots": {
        "mots_cles": ["robots.txt", "sitemap.xml"],
        "titre": "Cartographie d'indexation",
        "explication": "Ce fichier demande gentiment aux moteurs de recherche de ne pas visiter certaines pages, ce qui donne ironiquement aux pirates la liste de vos dossiers secrets."
    },
    "mots_de_passe": {
        "mots_cles": ["passwd", "shadow", "htpasswd", "users"],
        "titre": "Fichiers de mots de passe hachés",
        "explication": "Des fichiers contenant les empreintes de mots de passe sont exposés. Avec des ordinateurs puissants, ces mots de passe peuvent être cassés."
    }
}

# petite fonction pour nettoyer l url 
def nettoyer_url(cible_url):
    temp_url = cible_url.replace("https://", "").replace("http://", "")
    if "/:" in temp_url:
        temp_url = temp_url.replace("/:", ":")
    url = f"http://{temp_url}"
    if not url.endswith("/"):
        url += "/"
    return url

# la fonction qui interprete les codes d etat http en francais pour le boss
# c est ca qui donne toute l intelligence a notre script
def traduire_code_http(code):
    if code == "200":
        return "Accès direct autorisé et fichier lisible (Code 200). C'est un danger immédiat."
    elif code == "403":
        return "L'accès est verrouillé mais le dossier existe bien (Code 403). Cela donne des indices précieux à un attaquant."
    elif code in ["301", "302"]:
        return "Le serveur cache cet accès et redirige les visiteurs (Code 301/302). Souvent utilisé pour masquer un portail de connexion."
    elif code == "500":
        return "Le dossier provoque une erreur interne (Code 500). Cela indique une faille ou une mauvaise configuration grave."
    else:
        return f"Le serveur a répondu de manière inattendue (Code {code})."

# la grosse fonction principale qui fait tourner gobuster
def faire_gobuster(cible_url, mode_scan):
    url = nettoyer_url(cible_url)
    
    # on adapte les mots cles selon le mode
    if mode_scan == "simple":
        dico = "/usr/share/wordlists/dirb/common.txt" 
        threads = "20" 
        timeout_delai = 60 
    else:
        dico = "/usr/share/wordlists/dirb/big.txt" 
        threads = "50" 
        timeout_delai = 180 
    
    try:
        # on lance la commande sans afficher les erreurs dans le terminal
        commande = ["/usr/bin/gobuster", "dir", "-u", url, "-w", dico, "-t", threads, "-q", "-z", "--no-error"]
        res = subprocess.run(commande, capture_output=True, text=True, timeout=timeout_delai)
        
        if res.returncode != 0 and not res.stdout:
            return "L'inspection des zones cachées a été bloquée par vos systèmes de défense."
        
        # nettoyer les codes ANSI de la sortie (gobuster envoie des \x1b[2K etc.)
        sortie_propre = re.sub(r'\x1b\[[0-9;]*[a-zA-Z]', '', res.stdout)
        lignes = sortie_propre.split('\n')

        # dictionnaire pour stocker le nom du dossier et son code http { "/admin": "403" }
        chemins_trouves = {}

        # on boucle sur chaque ligne repondue par gobuster
        for ligne in lignes:
            if "Status:" in ligne:
                # on extrait le nom du dossier et on nettoie les caracteres parasites
                dossier = ligne.split()[0].strip().lower().replace("/", "")
                dossier = re.sub(r'[^\w.\-]', '', dossier)  # garder que lettres, chiffres, points, tirets
                
                # on utilise une regex (expression reguliere) pour extraire les chiffres apres Status:
                match_code = re.search(r'Status:\s*(\d{3})', ligne)
                code_http = match_code.group(1) if match_code else "Inconnu"
                
                chemins_trouves[dossier] = code_http
        
        if not chemins_trouves:
            return "Nous avons cherché à nous introduire dans l'arrière-boutique de votre site. Aucun document confidentiel n'a été trouvé. C'est un excellent point pour la confidentialité de vos opérations."

        # la logique de croisement on liste les menaces detectees
        # on va stocker une liste d explications completes
        alertes_generees = [] 
        
        for chemin, code_http in chemins_trouves.items():
            for categorie, data in ANALYSE_METIER.items():
                for mot_cle in data["mots_cles"]:
                    # on compare avec startswith ou eq pour eviter les faux positifs si un mot ressemble
                    if mot_cle in chemin:
                        etat_francais = traduire_code_http(code_http)
                        texte_alerte = f"Concernant l'élément critique identifié comme '{data['titre']}' (/{chemin}) :\n{data['explication']}\nÉtat technique : {etat_francais}"
                        
                        # on verifie qu on a pas deja ajoute cette alerte pour pas spammer le pdf
                        if texte_alerte not in alertes_generees:
                            alertes_generees.append(texte_alerte)

        texte_final = "Imaginez que votre infrastructure numérique est un grand bâtiment d'entreprise. Si les visiteurs ne voient que la vitrine d'accueil, nos outils de cartographie ont sondé les murs pour localiser les portes dérobées, les coffres cachés et les zones de stockage oubliées.\n\n"
        
        if alertes_generees:
            texte_final += "L'audit a mis en évidence l'existence de plusieurs zones exposées qui représentent un risque concret pour votre activité :\n\n"
            
            for alerte in alertes_generees:
                texte_final += f"{alerte}\n\n"
                
            texte_final += "Recommandation stratégique : Nous conseillons vivement à votre direction technique de verrouiller l'architecture de ces dossiers. Les accès internes doivent être filtrés et les documents techniques ne doivent jamais être accessibles depuis l'espace public."
            
        else:
            texte_final += "L'outil a identifié plusieurs répertoires techniques standards. Bien que détectables de l'extérieur, ils ne semblent pas exposer directement le cœur de votre métier ou des données confidentielles."
            
        return texte_final

    except subprocess.TimeoutExpired:
        # si c est trop long c est que le pare feu bloque
        return "L'analyse a pris trop de temps et a été interrompue. Cela arrive souvent lorsque le serveur d'entreprise est protégé contre les scans intensifs (WAF)."
    except Exception as e:
        return f"Un incident technique inattendu a empêché la finalisation de ce test."
