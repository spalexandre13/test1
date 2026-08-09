import { test } from "node:test";
import assert from "node:assert/strict";
import { construireHtmlCv } from "../src/lib/cv";
import { validerCompetences, separerObjetCorps } from "../src/lib/generation";
import { TOUTES_COMPETENCES } from "../src/lib/cv-data";

test("construireHtmlCv place le titre adapte et les 4 competences en tete", () => {
  const html = construireHtmlCv({
    titre_cv: "Alternant Administrateur Systèmes & Réseaux",
    top_4_competences: [
      "Administration Linux (Debian, Ubuntu)",
      "Docker & Docker Compose",
      "Hyperviseurs (Proxmox, VMware)",
      "Switching avancé (VLAN, STP, LACP, HSRP)"
    ]
  });
  assert.ok(html.includes("Alternant Administrateur Systèmes &amp; Réseaux"));
  assert.ok(html.includes("Docker &amp; Docker Compose"));
  // Le bloc "top" doit apparaitre avant la rubrique complete.
  assert.ok(html.indexOf('class="top"') < html.indexOf("Compétences techniques"));
});

test("construireHtmlCv echappe le HTML injecte", () => {
  const html = construireHtmlCv({
    titre_cv: '<script>alert("x")</script>',
    top_4_competences: ["<img onerror=1>"]
  });
  assert.ok(!html.includes("<script>alert"), "le script doit etre echappe");
  assert.ok(html.includes("&lt;script&gt;"));
});

test("validerCompetences rejette toute competence inventee", () => {
  const out = validerCompetences([
    "Administration Linux (Debian, Ubuntu)",
    "Kubernetes en production",      // INVENTE
    "Certification CISSP",           // INVENTE
    "Docker & Docker Compose"
  ]);
  assert.equal(out.length, 4);
  for (const c of out) {
    assert.ok(
      TOUTES_COMPETENCES.includes(c),
      `"${c}" ne fait pas partie de la base de competences`
    );
  }
  assert.ok(!out.some((c) => /CISSP|Kubernetes/i.test(c)));
});

test("validerCompetences complete jusqu'a 4 si l'IA en donne moins", () => {
  const out = validerCompetences(["Bash"]);
  assert.equal(out.length, 4);
  assert.ok(out.includes("Bash"));
  assert.equal(new Set(out).size, 4, "pas de doublon");
});

test("validerCompetences survit a une entree absurde", () => {
  for (const entree of [null, undefined, "texte", 42, {}]) {
    const out = validerCompetences(entree);
    assert.equal(out.length, 4);
    assert.ok(out.every((c) => TOUTES_COMPETENCES.includes(c)));
  }
});

test("separerObjetCorps gere les variantes de sortie du modele", () => {
  const a = separerObjetCorps("Candidature alternance\n\nBonjour,\nLe corps.");
  assert.equal(a.objet, "Candidature alternance");
  assert.equal(a.corps, "Bonjour,\nLe corps.");

  const b = separerObjetCorps("**Objet :** Alternance réseau\n\nBonjour,");
  assert.equal(b.objet, "Alternance réseau", "prefixe 'Objet :' et gras retires");

  const c = separerObjetCorps("\n\n   \nObjet: Test\nCorps");
  assert.equal(c.objet, "Test");

  const d = separerObjetCorps("", "NetSecure");
  assert.ok(d.objet.includes("NetSecure"), "objet de secours avec le nom d'entreprise");
});
