import subprocess
import re

def faire_whois(domaine):
    try:
        domaine_clean = domaine.split(":")[0]
        res = subprocess.run(["whois", domaine_clean], capture_output=True, text=True, timeout=10)
        lignes = res.stdout.split('\n')
        registrar = "non communiqué"; creation = "non communiquée"; emails = []
        for ligne in lignes:
            l = ligne.lower()
            if "registrar:" in l and registrar == "non communiqué": registrar = ligne.split(":")[1].strip()
            elif "creation date:" in l and creation == "non communiquée": creation = ligne.split(":")[1].strip()
            elif "contact email:" in l and "@" in ligne:
                e = ligne.split(":")[1].strip()
                if e not in emails: emails.append(e)

        texte = f"L'analyse des registres de propriété indique que votre domaine est géré par l'entité {registrar}. "
        if creation != "non communiquée": texte += f"Ce nom de domaine est actif depuis le {creation[:10]}. "
        
        if emails:
            texte += f"\n\nRisque détecté : Des adresses e-mail de contact privées sont exposées ({', '.join(emails)}). "
            texte += "Un attaquant peut utiliser ces données pour concevoir des campagnes de Phishing ciblées."
        else:
            texte += "\n\nBonne pratique : Vos données de contact sont protégées par un service d'anonymisation."
        return texte
    except Exception: return "Échec de la récupération des données administratives."

def faire_whatweb(domaine):
    try:
        # On force WhatWeb à être un peu plus bavard
        res = subprocess.run(["whatweb", "-a", "3", domaine], capture_output=True, text=True, timeout=15)
        sortie = res.stdout
        tech_details = []
        
        # Détection améliorée (plus souple que les regex strictes)
        if "Apache" in sortie:
            version = re.search(r"Apache/([\d\.]+)", sortie)
            tech_details.append(f"Serveur Web Apache" + (f" (Version {version.group(1)})" if version else ""))
        if "PHP" in sortie:
            version = re.search(r"PHP/([\d\.]+)", sortie)
            tech_details.append(f"Langage PHP" + (f" (Version {version.group(1)})" if version else ""))
        if "Debian" in sortie:
            tech_details.append("Système d'exploitation Debian Linux")

        texte_final = "L'empreinte technologique est la signature logicielle de votre site. "
        
        if tech_details:
            texte_final += "Nous avons identifié les composants suivants : " + ", ".join(tech_details) + ". "
            texte_final += "\n\nAnalyse du risque : Exposer ces versions permet à un pirate de rechercher des failles publiques spécifiques (CVE). "
            texte_final += "Il est vivement conseillé de masquer ces signatures techniques dans les fichiers de configuration du serveur."
        else:
            texte_final += "Votre serveur cache efficacement ses technologies, ce qui est une excellente pratique de sécurité."
        
        return texte_final
    except Exception: return "L'analyse technologique a été interrompue."
