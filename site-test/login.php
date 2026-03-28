<!DOCTYPE html>
<html>
<head><title>Connexion - Entreprise Fictive</title></head>
<body>
<h2>Espace client</h2>
<!-- Faille volontaire : formulaire sans CSRF token, sans HTTPS -->
<form method="POST" action="login.php">
    <label>Identifiant :</label><br>
    <input type="text" name="username"><br><br>
    <label>Mot de passe :</label><br>
    <input type="password" name="password"><br><br>
    <button type="submit">Se connecter</button>
</form>

<?php
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    // Faille volontaire : pas de protection contre les injections
    $user = $_POST['username'];
    $pass = $_POST['password'];
    echo "<p>Tentative de connexion pour : " . $user . "</p>";
}
?>
</body>
</html>
