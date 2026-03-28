# ──────────────────────────────────────────────────────────────
# BouzuSec Scanner — Image Docker
# Base Debian + Apache + PHP + Python3 + Outils de cybersécurité
# ──────────────────────────────────────────────────────────────
FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

# 1. Paquets système + Apache + PHP + Python + outils dispo dans les repos
RUN apt-get update && apt-get install -y \
    apache2 \
    libapache2-mod-php \
    php \
    python3 \
    python3-pip \
    python3-venv \
    nmap \
    gobuster \
    whatweb \
    whois \
    curl \
    git \
    perl \
    libnet-ssleay-perl \
    && rm -rf /var/lib/apt/lists/*

# 2. Installer Nikto manuellement (pas dans les repos Debian)
RUN cd /opt && git clone https://github.com/sullo/nikto.git \
    && ln -s /opt/nikto/program/nikto.pl /usr/local/bin/nikto \
    && chmod +x /opt/nikto/program/nikto.pl

# 3. Wordlists pour GoBuster
RUN mkdir -p /usr/share/wordlists/dirb \
    && curl -sL https://raw.githubusercontent.com/v0re/dirb/master/wordlists/common.txt \
       -o /usr/share/wordlists/dirb/common.txt \
    && curl -sL https://raw.githubusercontent.com/v0re/dirb/master/wordlists/big.txt \
       -o /usr/share/wordlists/dirb/big.txt

# 4. Dépendances Python (dans un venv)
COPY requirements.txt /tmp/requirements.txt
RUN python3 -m venv /opt/bouzusec-venv \
    && /opt/bouzusec-venv/bin/pip install --no-cache-dir -r /tmp/requirements.txt

# 5. Configuration Apache
RUN a2enmod rewrite
COPY apache.conf /etc/apache2/sites-available/000-default.conf

# 6. Copier le code source BouzuSec
COPY index.php /var/www/html/
COPY traitement.php /var/www/html/
COPY orchestrateur.py /var/www/html/
COPY style.css /var/www/html/
COPY outils/ /var/www/html/outils/
COPY rapport/ /var/www/html/rapport/
COPY client.png /var/www/html/

# 7. Adapter traitement.php pour utiliser le venv Python
RUN sed -i 's|python3 orchestrateur.py|/opt/bouzusec-venv/bin/python3 orchestrateur.py|g' /var/www/html/traitement.php

# 8. Permissions (Apache doit pouvoir écrire les PDFs et JSON)
RUN chown -R www-data:www-data /var/www/html \
    && chmod -R 755 /var/www/html

# 9. Supprimer la page par défaut
RUN rm -f /var/www/html/index.html

EXPOSE 80

CMD ["apachectl", "-D", "FOREGROUND"]
