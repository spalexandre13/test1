<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Entreprise Fictive - Site de Test</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; background: #f5f5f5; }
        .header { background: #2c3e50; color: white; padding: 20px; text-align: center; }
        .content { max-width: 800px; margin: 30px auto; padding: 20px; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { margin: 0; }
        h2 { color: #2c3e50; }
        .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 20px 0; }
        a { color: #3498db; }
        .footer { text-align: center; padding: 20px; color: #7f8c8d; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Entreprise Fictive S.A.</h1>
        <p>Site web de demonstration - Projet BouzuSec</p>
    </div>

    <div class="content">
        <div class="warning">
            <strong>Ce site est VOLONTAIREMENT vulnerable.</strong><br>
            Il sert exclusivement a tester l'outil d'audit BouzuSec Scanner.
            Ne jamais l'exposer sur Internet.
        </div>

        <h2>Bienvenue</h2>
        <p>Ceci est le site web de l'Entreprise Fictive S.A., leader imaginaire dans le domaine du conseil.</p>
        <p>Nous proposons des services de qualite a nos clients depuis 2005.</p>

        <h2>Nos services</h2>
        <ul>
            <li>Conseil en strategie digitale</li>
            <li>Developpement web sur mesure</li>
            <li>Hebergement et maintenance</li>
        </ul>

        <h2>Contact</h2>
        <p>Email : contact@entreprise-fictive.local</p>
        <p>Tel : 01 23 45 67 89</p>

        <!-- Commentaire HTML avec info sensible (faille volontaire) -->
        <!-- TODO: supprimer avant mise en prod - admin:password123 -->
        <!-- Version: PHP <?php echo phpversion(); ?> -->
    </div>

    <div class="footer">
        <p>Serveur : <?php echo $_SERVER['SERVER_SOFTWARE']; ?></p>
        <p>&copy; 2024 Entreprise Fictive S.A. - Tous droits reserves</p>
    </div>
</body>
</html>
