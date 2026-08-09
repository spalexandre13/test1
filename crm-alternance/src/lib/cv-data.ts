// Source unique de verite du CV d'Alexandre.
// L'IA ne peut modifier QUE le titre et l'ordre des 4 competences mises en avant.

export const CV_DATA = {
  identite: {
    prenom: "Alexandre",
    nom: "",
    email: process.env.SENDER_EMAIL ?? "",
    ville: "Sophia Antipolis",
    portfolio: process.env.PORTFOLIO_URL ?? "https://spalexandre13.github.io/Portfolio/",
    github: "https://github.com/spalexandre13"
  },
  formation: [
    {
      annees: "2023 - 2026",
      intitule: "BUT Réseaux & Télécommunications",
      etablissement: "IUT Nice Côte d'Azur - Sophia Antipolis"
    }
  ],
  experiences: [
    {
      periode: "SAÉ 401",
      intitule: "BouzuSec - Scanner de vulnérabilités en boîte noire",
      description:
        "Orchestration de 5 outils (Nmap, Nikto, GoBuster, WhatWeb, Whois) et génération de rapports PDF vulgarisés, scoring selon la méthodologie ANSSI du maillon faible."
    }
  ],
  langues: [
    { langue: "Français", niveau: "Langue maternelle" },
    { langue: "Anglais", niveau: "Avancé (C1)" }
  ],
  certifications: ["CCNA 1"],
  rubriques: [
    {
      titre: "Réseaux & Infra Cisco",
      items: [
        "Switching avancé (VLAN, STP, LACP, HSRP)",
        "Routage dynamique (OSPF, EIGRP, BGP)",
        "Services réseau (DHCP, DNS, NAT)",
        "Double-stack IPv4/IPv6",
        "VPN site-à-site (IPSec, OpenVPN)",
        "Analyse de trames (Wireshark, TCPdump)",
        "GNS3, Cisco Packet Tracer"
      ]
    },
    {
      titre: "Systèmes & Virtualisation",
      items: [
        "Administration Linux (Debian, Ubuntu)",
        "Windows Server & Active Directory (GPO, DNS, DHCP)",
        "Hyperviseurs (Proxmox, VMware)",
        "Déploiement Web (Apache, Nginx, MariaDB)",
        "Docker & Docker Compose"
      ]
    },
    {
      titre: "Sécurité Offensive & Défensive",
      items: [
        "Firewalling (Cisco ASA, pfSense, iptables)",
        "Pentest & recon (Kali, Nmap, Metasploit, Burp Suite)",
        "Exploitation & élévation de privilèges",
        "Hardening OS & chiffrement (TLS, PKI)",
        "Analyse de malwares & rétro-ingénierie"
      ]
    },
    {
      titre: "Télécoms & IoT",
      items: [
        "LoRaWAN & réseaux LPWAN",
        "Modulations numériques (QAM, OFDM)",
        "Raspberry Pi & Arduino (capteurs, caméra)",
        "Supports physiques (fibre, coaxial, cuivre)"
      ]
    },
    {
      titre: "Code & Automatisation",
      items: [
        "Python (scripting, Scapy, sockets)",
        "Bash",
        "Java",
        "Web (HTML, CSS, JS, PHP)",
        "BDD (MySQL, MariaDB, SQLite)",
        "Git/GitHub"
      ]
    }
  ]
} as const;

// Liste plate utilisee pour verifier que l'IA n'invente aucune competence.
export const TOUTES_COMPETENCES: string[] = CV_DATA.rubriques.flatMap((r) => [...r.items]);

export function titreParDefaut(): string {
  return "Alternant Réseaux & Télécommunications - Cybersécurité";
}
