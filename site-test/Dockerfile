# ──────────────────────────────────────────────────────────────
# Site de Test Vulnérable — Pour tester BouzuSec Scanner
# Contient des failles INTENTIONNELLES pour l'audit
# NE JAMAIS EXPOSER CE CONTENEUR SUR INTERNET
# ──────────────────────────────────────────────────────────────
FROM php:8.1-apache

# Activer les modules Apache (vérifier qu'ils existent avant)
RUN a2enmod rewrite || true \
    && a2enmod headers || true \
    && a2enmod status || true \
    && a2enmod autoindex || true

# Configuration Apache vulnérable
COPY apache-vulnerable.conf /etc/apache2/sites-available/000-default.conf

# Copier le site vulnérable
COPY index.php /var/www/html/
COPY phpinfo.php /var/www/html/
COPY login.php /var/www/html/
COPY admin/ /var/www/html/admin/
COPY uploads/ /var/www/html/uploads/
COPY backup/ /var/www/html/backup/
COPY .env /var/www/html/.env
COPY robots.txt /var/www/html/robots.txt

# Recréer le dossier .git
COPY git-exposed/ /var/www/html/.git/

# Supprimer la page par défaut
RUN rm -f /var/www/html/index.html

# Permissions ouvertes
RUN chmod -R 777 /var/www/html

EXPOSE 80

CMD ["apache2-foreground"]
