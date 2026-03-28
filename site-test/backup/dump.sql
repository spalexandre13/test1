-- Sauvegarde de la base de donnees - FAILLE VOLONTAIRE
-- Ce fichier ne devrait JAMAIS etre accessible depuis le web

CREATE DATABASE IF NOT EXISTS entreprise_fictive;
USE entreprise_fictive;

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50),
    password_hash VARCHAR(255),
    email VARCHAR(100),
    role VARCHAR(20)
);

INSERT INTO users VALUES
(1, 'admin', '$2y$10$fakehashadmin', 'admin@entreprise-fictive.local', 'admin'),
(2, 'jean.dupont', '$2y$10$fakehashuser1', 'j.dupont@entreprise-fictive.local', 'user'),
(3, 'marie.martin', '$2y$10$fakehashuser2', 'm.martin@entreprise-fictive.local', 'user');

CREATE TABLE clients (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nom VARCHAR(100),
    email VARCHAR(100),
    telephone VARCHAR(20),
    adresse TEXT
);

INSERT INTO clients VALUES
(1, 'Societe ABC', 'contact@abc.fr', '01 11 22 33 44', '12 rue de Paris'),
(2, 'Startup XYZ', 'hello@xyz.io', '06 55 44 33 22', '5 avenue des Champs');
