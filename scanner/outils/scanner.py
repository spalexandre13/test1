# module de sondage du perimetre avec nmap
import subprocess
import re

# dictionnaire ultra vulgarise pour expliquer les portes d acces au client
ANALYSE_PORTS = {
    "21": "Porte de transfert de documents (ftp) : Souvent utilisée pour échanger des fichiers, cette porte mal verrouillée permet le vol de données internes.",
    "22": "Porte de maintenance technique (ssh) : Accès réservé aux administrateurs. C'est la cible favorite des pirates qui tentent de deviner vos mots de passe.",
    "80": "Porte publique standard (http) : Utilisée pour afficher votre site web de manière non sécurisée.",
    "443": "Porte publique chiffrée (https) : Utilisée pour la navigation web sécurisée de vos clients.",
    "445": "Porte de partage d'entreprise (smb) : Accès au réseau local. Son exposition sur Internet est une urgence absolue (risque critique de rançongiciel).",
    "3306": "Porte de la chambre forte (mysql) : Accès direct à vos bases de données. Ne doit strictement jamais être visible de l'extérieur."
}

def faire_nmap(domaine, mode_scan):
    try:
        # scan rapide 100 ports vs scan complet 65535 ports
        if mode_scan == "simple":
            commande = ["nmap", "-T4", "--top-ports", "100", domaine]
        else:
            commande = ["nmap", "-T4", "-p-", domaine]
            
        res = subprocess.run(commande, capture_output=True, text=True, timeout=300)
        
        ports_ouverts = []
        lignes = res.stdout.split("\n")
        for ligne in lignes:
            if "open" in ligne:
                # on extrait le numero avec une expression reguliere simple
                match = re.search(r'^(\d+)/', ligne)
                if match:
                    ports_ouverts.append(match.group(1))

        if not ports_ouverts:
            return "La façade numérique de votre entreprise semble hermétique de l'extérieur. Aucun point d'entrée public n'a été détecté."

        # MODE SIMPLE : on compte juste les portes pour intriguer le client
        if mode_scan == "simple":
            texte_final = f"Le sondage rapide de votre façade numérique a révélé que {len(ports_ouverts)} portes de communication (ports) sont actuellement grandes ouvertes sur Internet.\n\n"
            texte_final += "Dans ce rapport de synthèse, nous ne pouvons pas déterminer si ces accès sont légitimes ou s'ils représentent un danger mortel pour vos serveurs. Le Mode Avancé vous permettra d'identifier la fonction exacte de chaque porte et de verrouiller les failles d'infrastructure."
            return texte_final
            
        # MODE AVANCÉ : on explique a quoi sert chaque porte
        else:
            texte_final = "L'inspection exhaustive de votre infrastructure a permis d'identifier les points d'entrée suivants, ouverts sur l'espace public :\n\n"
            
            for port in ports_ouverts:
                if port in ANALYSE_PORTS:
                    texte_final += f"- {ANALYSE_PORTS[port]}\n"
                else:
                    texte_final += f"- Porte {port} : Service logiciel spécifique détecté.\n"
                    
            texte_final += "\nRecommandation stratégique : La règle d'or de la cybersécurité exige de fermer toute porte qui n'est pas strictement nécessaire à l'affichage de votre site web. Un pare-feu robuste doit être configuré."
            return texte_final

    except subprocess.TimeoutExpired:
        return "Le balayage de vos portes a été ralenti ou bloqué par un mécanisme de défense."
    except Exception as e:
        return "Une interférence a empêché l'outil de terminer sa cartographie."
