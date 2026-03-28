<?php
if ($_SERVER["REQUEST_METHOD"] == "POST") {

    $cible = htmlspecialchars($_POST['cible']);
    $mode  = htmlspecialchars($_POST['mode']);

    // On réinitialise le fichier de statut avant de lancer le scan
    file_put_contents("statut_audit.json", json_encode([
        "pourcentage" => 0,
        "message" => "Initialisation des protocoles de reconnaissance..."
    ]));

    // Lancement de l'orchestrateur Python EN ARRIÈRE-PLAN
    // Le "nohup ... > /dev/null 2>&1 &" permet de ne pas bloquer PHP
    $commande = "nohup python3 orchestrateur.py "
        . escapeshellarg($cible) . " "
        . escapeshellarg($mode)
        . " > /dev/null 2>&1 &";
    shell_exec($commande);

    // On renvoie immédiatement un JSON au JavaScript
    header("Content-Type: application/json");
    echo json_encode(["status" => "started"]);
    exit();

} else {
    header("Location: index.php");
    exit();
}
?>
