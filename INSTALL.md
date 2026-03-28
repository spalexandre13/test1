# BouzuSec Scanner — Manuel d'installation

## Sommaire
1. [Pré-requis](#pré-requis)
2. [Installation rapide (Docker)](#installation-rapide-docker)
3. [Installation manuelle (VM Kali)](#installation-manuelle-vm-kali)
4. [Partager le projet](#partager-le-projet)
5. [Utilisation du site de test](#utilisation-du-site-de-test)
6. [Système de scoring](#système-de-scoring)
7. [Architecture du projet](#architecture-du-projet)
8. [Dépannage](#dépannage)

---

## Pré-requis

### Pour Docker (recommandé)
- Docker Desktop installé ([docker.com](https://www.docker.com/products/docker-desktop/))
- Docker Compose (inclus avec Docker Desktop)
- 4 Go de RAM minimum
- Connexion Internet (pour le build initial)

### Pour VM Kali (alternatif)
- VM Kali Linux 2024+ avec accès réseau
- Droits root (sudo)

---

## Installation rapide (Docker)

### 1. Cloner le projet

```bash
git clone https://github.com/spalexandre13/BouzuSec.git
cd BouzuSec
```

### 2. Lancer les conteneurs

```bash
docker compose up -d --build
```

Le premier build prend 5-10 minutes (téléchargement des outils de scan : Nmap, Nikto, GoBuster, WhatWeb).

### 3. Accéder aux interfaces

| Service | URL | Description |
|---------|-----|-------------|
| BouzuSec Scanner | http://localhost:9090 | Interface de l'outil d'audit |
| Site de test vulnérable | http://localhost:8888 | Cible de test avec failles intentionnelles |

### 4. Lancer un scan de test

1. Ouvrir http://localhost:9090
2. Entrer `site-test` dans le champ URL (c'est le nom DNS interne Docker)
3. Choisir **Mode Avancé**
4. Cliquer sur **Diagnostiquer**
5. Attendre la fin du scan (~2-3 minutes)
6. Télécharger les 2 rapports PDF (Simple + Avancé)

### 5. Arrêter les conteneurs

```bash
docker compose down
```

---

## Installation manuelle (VM Kali)

### 1. Installer les dépendances système

```bash
sudo apt update
sudo apt install -y apache2 libapache2-mod-php php python3 python3-pip python3-venv \
    nmap gobuster whatweb whois git perl libnet-ssleay-perl curl
```

> **Note** : Nikto n'est pas disponible dans les repos Debian/Kali récents. Il faut l'installer manuellement :

```bash
cd /opt
sudo git clone https://github.com/sullo/nikto.git
sudo ln -s /opt/nikto/program/nikto.pl /usr/local/bin/nikto
sudo chmod +x /opt/nikto/program/nikto.pl
```

Les wordlists pour GoBuster :

```bash
sudo mkdir -p /usr/share/wordlists/dirb
sudo curl -sL https://raw.githubusercontent.com/v0re/dirb/master/wordlists/common.txt \
    -o /usr/share/wordlists/dirb/common.txt
sudo curl -sL https://raw.githubusercontent.com/v0re/dirb/master/wordlists/big.txt \
    -o /usr/share/wordlists/dirb/big.txt
```

### 2. Cloner le projet

```bash
cd /var/www/html
sudo rm index.html
sudo git clone https://github.com/spalexandre13/BouzuSec.git .
```

### 3. Installer les dépendances Python

```bash
sudo pip3 install -r requirements.txt --break-system-packages
```

### 4. Permissions

```bash
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html
```

### 5. Redémarrer Apache

```bash
sudo systemctl restart apache2
```

### 6. Accéder au scanner

Ouvrir http://localhost dans le navigateur de la VM.

---

## Partager le projet

### Méthode 1 — Via GitHub (recommandé)

La personne a juste besoin d'exécuter 3 commandes :

```bash
git clone https://github.com/spalexandre13/BouzuSec.git
cd BouzuSec
docker compose up -d --build
```

Pré-requis : Docker Desktop installé.

### Méthode 2 — Par clé USB ou transfert de fichiers

1. Compresser le dossier du projet en `.zip`
2. Envoyer le fichier (clé USB, WeTransfer, etc.)
3. Le destinataire décompresse puis lance :

```bash
cd BouzuSec
docker compose up -d --build
```

---

## Utilisation du site de test

Le site de test (`site-vulnerable`) contient des failles **intentionnelles** pour valider le fonctionnement de chaque outil du scanner.

> **ATTENTION** : Ce conteneur ne doit JAMAIS être exposé sur Internet. Il est concu uniquement pour des tests en local.

### Failles présentes

| Faille | Outil qui la détecte | Catégorie de scoring |
|--------|---------------------|----------------------|
| Version Apache/PHP exposée (ServerTokens Full) | WhatWeb | OSINT |
| ServerSignature activé | Nikto | Config |
| Pas de X-Frame-Options (clickjacking) | Nikto | Config |
| Pas de X-Content-Type-Options (mime-sniffing) | Nikto | Config |
| Pas de HSTS | Nikto | Config |
| Server-status exposé publiquement | Nikto | Config |
| Directory listing activé (+Indexes) | Nikto | Config |
| Dossier .git exposé | GoBuster | Enum |
| Fichier .env exposé (secrets, clés API) | GoBuster | Enum |
| Panneau /admin accessible sans auth | GoBuster | Enum |
| Backup SQL exposé (/backup/dump.sql) | GoBuster | Enum |
| Dossier /uploads permissif | GoBuster | Enum |
| robots.txt révèle les chemins cachés | GoBuster | Enum |
| phpinfo() accessible | Nikto / GoBuster | Config / Enum |
| Formulaire login sans CSRF | Nikto | Config |
| Commentaires HTML avec credentials | Manuel | - |

### Score attendu pour le site de test

Le site de test devrait obtenir un score d'environ **40-45%** (Risque Modéré à Élevé). Le radar montre des faiblesses marquées sur les axes Enumération et Configuration.

### Comparaison des scans

| Cible | Score attendu | Niveau ANSSI |
|-------|---------------|--------------|
| tesla.com | ~55% | Risque Modéré |
| asmonaco.com | ~55% | Risque Modéré |
| site-test (Docker) | ~40-45% | Risque Modéré / Élevé |

> **Note** : Meme les sites professionnels comme tesla.com ou asmonaco.com n'obtiennent pas 90-100% car le scanner détecte des éléments courants (headers manquants, technologies visibles) qui sont normaux mais techniquement des surfaces d'attaque. Un score de 55% pour un site pro est un bon résultat dans notre barème.

---

## Système de scoring

### Méthodologie

Le scoring s'inspire de la **méthodologie ANSSI du maillon faible** avec une formule hybride :

- **50%** du score est basé sur le **pire axe de risque** (maillon faible)
- **50%** est basé sur la **moyenne des 5 axes**

### Les 5 axes du radar

| Axe | Outil | Ce qu'il mesure |
|-----|-------|-----------------|
| OSINT | Whois + WhatWeb | Informations publiques exposées (versions, technologies) |
| Réseau | Nmap | Ports ouverts et services accessibles |
| Enumération | GoBuster | Fichiers et dossiers cachés exposés |
| Configuration | Nikto | Mauvaises configurations du serveur web |
| Applicatif | Nikto | Failles applicatives (XSS, SQLi, CSRF) |

### Calcul du score

Chaque axe est noté de 0 (aucun risque) à 10 (risque maximum). La formule finale :

```
risque_global = (pire_risque * 0.5) + (moyenne_5_axes * 0.5)
score_sante = 100 - (risque_global * 9)
```

### Echelle de risque ANSSI

| Score | Niveau | Couleur |
|-------|--------|---------|
| 0-30% | Risque Critique | Rouge |
| 30-55% | Risque Elevé | Orange |
| 55-73% | Risque Modéré | Jaune |
| 73-100% | Risque Faible | Vert |

---

## Architecture du projet

```
├── README.md                       # Page d'accueil GitHub
├── INSTALL.md                      # Ce fichier (manuel complet)
├── docker-compose.yml              # Orchestration des 2 conteneurs
├── .gitignore
│
├── scanner/                        # Application BouzuSec Scanner
│   ├── Dockerfile                  # Image Debian + Apache + PHP + Python + outils
│   ├── apache.conf                 # Config Apache du scanner
│   ├── requirements.txt            # Dépendances Python (fpdf, matplotlib)
│   ├── index.php                   # Interface web (formulaire de scan)
│   ├── traitement.php              # Backend PHP (lance orchestrateur.py)
│   ├── orchestrateur.py            # Chef d'orchestre Python (5 phases de scan)
│   ├── style.css                   # Style de l'interface
│   ├── client.png                  # Logo client pour les rapports
│   ├── outils/                     # Modules de scan
│   │   ├── osint.py                # Whois + WhatWeb (empreinte numérique)
│   │   ├── scanner.py              # Nmap (cartographie réseau)
│   │   ├── enumeration.py          # GoBuster (fichiers/dossiers cachés)
│   │   ├── vuln_scan.py            # Nikto (8 catégories de vulnérabilités)
│   │   └── scoring.py              # Calcul du score ANSSI (maillon faible)
│   └── rapport/                    # Générateur de rapports
│       └── generateur_pdf.py       # 2 PDFs : Simple (décisionnel) + Avancé (technique)
│
└── site-test/                      # Site vulnérable de test
    ├── Dockerfile                  # Image PHP/Apache avec failles intentionnelles
    ├── apache-vulnerable.conf      # Config Apache vulnérable (ServerTokens Full, +Indexes)
    ├── index.php                   # Page d'accueil avec version serveur exposée
    ├── phpinfo.php                 # phpinfo() exposé
    ├── login.php                   # Formulaire sans protection CSRF
    ├── .env                        # Faux secrets exposés (DB_PASSWORD, AWS keys)
    ├── git-exposed/                # Simule un .git/ exposé (renommé pour compatibilité Git)
    ├── admin/                      # Panneau admin sans authentification
    ├── backup/dump.sql             # Sauvegarde BDD avec table utilisateurs
    ├── uploads/                    # Dossier upload ouvert
    └── robots.txt                  # Révèle les chemins sensibles
```

### Réseau Docker

Les deux conteneurs communiquent via un réseau bridge interne (`bouzusec-net`). Le scanner peut atteindre le site de test via le nom DNS `site-test`.

```
┌─────────────────────────────────────────┐
│           Réseau bouzusec-net           │
│                                         │
│  ┌──────────────┐   ┌────────────────┐  │
│  │   bouzusec   │──>│   site-test    │  │
│  │  (scanner)   │   │ (vulnérable)   │  │
│  │  port 9090   │   │  port 8888     │  │
│  └──────────────┘   └────────────────┘  │
└─────────────────────────────────────────┘
```

---

## Dépannage

### Le scan ne démarre pas
```bash
# Vérifier que les conteneurs tournent
docker compose ps

# Voir les logs du scanner
docker compose logs bouzusec

# Voir les logs du site de test
docker compose logs site-test
```

### Le site de test ne répond pas
```bash
# Vérifier que le conteneur est bien démarré
docker compose logs site-test

# Si le conteneur redémarre en boucle, reconstruire
docker compose down
docker compose up -d --build
```

### Erreur de port déjà utilisé
Si le port 9090 ou 8888 est déjà pris, modifier les ports dans `docker-compose.yml` :
```yaml
ports:
  - "AUTRE_PORT:80"
```

### Rebuild après modification du code
```bash
docker compose down
docker compose up -d --build
```

### GoBuster affiche des caractères bizarres dans les chemins
Ce problème a été corrigé. GoBuster envoie des codes ANSI (`\x1b[2K`) qui sont maintenant nettoyés automatiquement par `enumeration.py` avant l'analyse.
