<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BouzuSec - Diagnostic Cybersécurité</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>

    <header>
        <div class="logo">🛡️ BouzuSec</div>
        <nav>
            <ul>
                <li><a href="#fonctionnalites">Fonctionnalités</a></li>
                <li><a href="#comment-ca-marche">Comment ça marche ?</a></li>
                <li><a href="#docs">Docs</a></li>
            </ul>
        </nav>
    </header>

    <section class="hero">
        <div class="hero-content">
            <div class="scan-module">
                <h1>BouzuSec <span>Scanner</span></h1>
                <h2>L'énergie vitale de votre site en un clin d'œil.</h2>
                <p>Des cyberattaques silencieuses peuvent vider les ressources de votre entreprise. Lancez un diagnostic visuel et compréhensible pour protéger votre avenir digital.</p>

                <form id="scanForm" action="traitement.php" method="POST">
                    <div class="radio-group">
                        <label><input type="radio" name="mode" value="simple" checked> Mode Simple</label>
                        <label><input type="radio" name="mode" value="avance"> Mode Avancé</label>
                    </div>
                    <div class="form-group">
                        <input type="text" name="cible" placeholder="Ex: tesla.com ou localhost:8080" required>
                        <button type="submit">Diagnostiquer</button>
                    </div>
                </form>

                <div class="status-placeholder">
                    <?php
                    if (isset($_GET['scan']) && $_GET['scan'] == 'termine') {
                        $cible_affichee = htmlspecialchars($_GET['cible']);
                        $pdf_simple  = 'rapport_simple.pdf';
                        $pdf_avance  = 'rapport_avance.pdf';

                        if (file_exists($pdf_simple) || file_exists($pdf_avance)) {
                            echo "<div class='result-box'>";
                            echo "<h3 style='margin-top:0;color:#2c3e50;'>✅ Diagnostic terminé !</h3>";
                            echo "<p>L'audit en boîte noire de <strong>" . $cible_affichee . "</strong> a été généré avec succès.</p>";
                            echo "<div class='download-buttons'>";

                            if (file_exists($pdf_simple)) {
                                echo "<a href='rapport_simple.pdf' download='BouzuSec_Simple_" . $cible_affichee . ".pdf' class='btn-download btn-simple'>📄 Rapport Simple</a>";
                            }
                            if (file_exists($pdf_avance)) {
                                echo "<a href='rapport_avance.pdf' download='BouzuSec_Avance_" . $cible_affichee . ".pdf' class='btn-download btn-avance'>🔍 Rapport Avancé</a>";
                            }

                            echo "</div></div>";
                        } else {
                            echo "<div class='error-box'>";
                            echo "<strong>Anomalie détectée :</strong> Le rapport n'a pas pu être généré. Cela peut arriver si la cible bloque nos outils ou si le serveur manque de droits d'écriture.";
                            echo "</div>";
                        }
                    } else {
                        echo "<em style='color:#7f8c8d;'>Cible : En attente d'analyse...</em>";
                    }
                    ?>
                </div>
            </div>
        </div>

        <div class="hero-bg"></div>
    </section>

    <section id="fonctionnalites" class="content-section">
        <h2>Fonctionnalités de l'Audit</h2>
        <div class="grid-3">
            <div class="card">
                <h3>Audit à 360°</h3>
                <p>Analyse complète de votre écosystème : du nom de domaine jusqu'à l'hébergement serveur, en passant par le code de vos pages web.</p>
            </div>
            <div class="card">
                <h3>Deux rapports PDF</h3>
                <p>Rapport Simple pour un résumé exécutif clair, Rapport Avancé pour une investigation complète avec plan d'action détaillé.</p>
            </div>
            <div class="card">
                <h3>Éthique White Hat</h3>
                <p>Diagnostic 100% bienveillant et sécurisé. Nos outils n'altèrent pas vos données et garantissent la continuité de vos services.</p>
            </div>
        </div>
    </section>

    <section id="comment-ca-marche" class="content-section">
        <h2>Comment ça marche ?</h2>
        <div class="grid-3">
            <div class="card">
                <h3>1. Entrez l'URL</h3>
                <p>Renseignez le domaine ou l'adresse IP de votre site cible et choisissez le mode d'analyse adapté.</p>
            </div>
            <div class="card">
                <h3>2. Scan automatisé</h3>
                <p>Notre orchestrateur lance en parallèle Whois, WhatWeb, Nmap, Nikto et GoBuster pour une analyse complète.</p>
            </div>
            <div class="card">
                <h3>3. Téléchargez vos PDFs</h3>
                <p>Obtenez deux rapports PDF : un résumé exécutif simple et un rapport technique avancé avec plan d'action.</p>
            </div>
        </div>
    </section>

    <footer>
        <p>Projet SAÉ 401 - Cybersécurité | BouzuSec Scanner</p>
    </footer>

    <!-- Overlay de chargement -->
    <div id="cyber-loader">
        <div class="loader-content">
            <h2 id="loader-title">ANALYSE DE SÉCURITÉ EN COURS...</h2>
            <div class="big-progress-track">
                <div id="big-progress-fill"></div>
            </div>
            <div class="loader-stats">
                <span id="loader-percent">0%</span>
            </div>
            <p id="loader-message">Initialisation des protocoles de reconnaissance...</p>
        </div>
    </div>

    <script>
        const form = document.getElementById('scanForm');

        form.addEventListener('submit', function(e) {
            e.preventDefault();
            document.getElementById('cyber-loader').style.display = 'flex';

            const messageElement  = document.getElementById('loader-message');
            const fillElement     = document.getElementById('big-progress-fill');
            const percentElement  = document.getElementById('loader-percent');

            const formData = new FormData(form);
            const cible = formData.get('cible');

            // Lancement en arrière-plan (PHP retourne immédiatement)
            fetch('traitement.php', { method: 'POST', body: formData });

            // Polling du fichier JSON écrit par Python en temps réel
            const pollInterval = setInterval(() => {
                fetch('statut_audit.json?t=' + new Date().getTime())
                    .then(r => r.json())
                    .then(data => {
                        if (data.pourcentage !== undefined) {
                            fillElement.style.width = data.pourcentage + '%';
                            percentElement.innerText = data.pourcentage + '%';
                        }
                        if (data.message) messageElement.innerText = data.message;

                        // Quand Python a fini (100%), on redirige vers la page de résultat
                        if (data.pourcentage >= 100) {
                            clearInterval(pollInterval);
                            setTimeout(() => {
                                window.location.href = 'index.php?scan=termine&cible=' + encodeURIComponent(cible);
                            }, 1500);
                        }
                    })
                    .catch(() => {});
            }, 1000);
        });
    </script>
</body>
</html>
