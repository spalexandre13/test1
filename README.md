# BouzuSec Scanner

Outil d'audit de cybersecurite en boite noire qui genere des rapports PDF vulgarises pour des decideurs non-techniques.

## Fonctionnement

BouzuSec lance 5 outils de scan en parallele sur une cible, puis genere deux rapports PDF :

| Outil | Role |
|-------|------|
| **Whois** | Empreinte numerique du domaine |
| **WhatWeb** | Detection des technologies et versions |
| **Nmap** | Cartographie des ports ouverts |
| **GoBuster** | Recherche de fichiers et dossiers caches |
| **Nikto** | Analyse des vulnerabilites web |

Les resultats sont scores selon la **methodologie ANSSI du maillon faible** et presentes sous forme de jauge d'energie + radar 5 axes.

## Demarrage rapide

```bash
git clone https://github.com/spalexandre13/BouzuSec.git
cd BouzuSec
docker compose up -d --build
```

- Scanner : http://localhost:9090
- Site de test vulnerable : http://localhost:8888

Pour tester, entrer `site-test` comme cible dans le scanner.

## Structure du projet

```
├── docker-compose.yml       # Orchestration des 2 conteneurs
├── scanner/                 # Application BouzuSec
│   ├── Dockerfile
│   ├── index.php            # Interface web
│   ├── traitement.php       # Backend PHP
│   ├── orchestrateur.py     # Chef d'orchestre (5 phases)
│   ├── outils/              # Modules de scan (5 outils)
│   ├── rapport/             # Generateur de PDF
│   └── ...
├── site-test/               # Site vulnerable (failles intentionnelles)
│   ├── Dockerfile
│   └── ...
└── INSTALL.md               # Manuel d'installation complet
```

## Documentation

Voir **[INSTALL.md](INSTALL.md)** pour :
- Installation Docker et VM Kali
- Comment partager le projet
- Details du systeme de scoring
- Guide de depannage

## Stack technique

- **Frontend** : PHP 8 + Apache
- **Backend** : Python 3 (orchestrateur + scoring + PDF)
- **Outils** : Nmap, Nikto, GoBuster, WhatWeb, Whois
- **Conteneurisation** : Docker + Docker Compose
- **Rapports** : FPDF + Matplotlib (radar)

---

Projet SAE 401 - Cybersecurite
