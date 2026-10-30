// Vérifie que chaque exercice est cohérent, puis rejoue des exercices de bout en bout.
// Usage : node test.js
const { EXERCICES } = require("./data.js");
const Moteur = require("./moteur.js");

const erreurs = [];
const err = (ex, msg) => erreurs.push(`[${ex}] ${msg}`);
const vide = (s) => typeof s !== "string" || !s.trim();
const refsDe = (s) => [...s.matchAll(/\{([^}]+)\}/g)].map((m) => m[1]);
const ids = (ex) => ex.etapes.map((e) => e.id);

function voisins(ex, e) {
  if (e.type === "recap") return [];
  if (e.type === "choix" || e.type === "confirmation") {
    return Moteur.options(e).map((o) => (o.vers ? "→" + o.vers : o.suivant ?? e.suivant)).filter((x) => x != null);
  }
  return e.suivant != null ? [e.suivant] : [];
}

for (const [id, ex] of Object.entries(EXERCICES)) {
  for (const k of ["titre", "resume", "intro"]) if (vide(ex[k])) err(id, `texte vide : ${k}`);
  const tous = ids(ex);
  if (new Set(tous).size !== tous.length) err(id, "ids en double");
  if (tous.some((x) => x.includes(":"))) err(id, "id contenant « : »");

  const sousIds = new Set();
  for (const e of ex.etapes) {
    if (e.type === "boucle") {
      const l = Moteur.trouver(ex, e.sur);
      if (!l || l.type !== "liste") err(id, `boucle ${e.id} : « sur » doit désigner une étape de type liste`);
      if (!e.etapes?.length) err(id, `boucle ${e.id} sans sous-étapes`);
      (e.etapes || []).forEach((s) => {
        sousIds.add(s.id);
        if (vide(s.id) || vide(s.question)) err(id, `sous-étape vide dans ${e.id}`);
        for (const r of refsDe(s.question)) if (!["element", "n", "total"].includes(r) && !r.startsWith("reponses.")) err(id, `${s.id} : référence inconnue {${r}}`);
      });
    } else if (e.type !== "recap" && vide(e.question)) err(id, `question vide : ${e.id}`);
    if (!["texte", "choix", "confirmation", "liste", "boucle", "recap"].includes(e.type)) err(id, `type inconnu : ${e.type} (${e.id})`);
    for (const o of Moteur.options(e)) if (vide(o.label)) err(id, `option vide dans ${e.id}`);
    for (const s of [e.question, ...(e.etapes || []).map((x) => x.question)]) {
      if (typeof s === "string" && /\b(votre|vos|vôtres?)\b/i.test(s)) err(id, `possessif à éviter (tutoiement) : ${e.id}`);
    }
  }

  const recapEtape = Moteur.trouver(ex, "recap");
  if (!ex.sansRecap && !recapEtape) err(id, "pas d'étape recap");
  if (recapEtape) {
    if (vide(recapEtape.titre) || !recapEtape.lignes?.length) err(id, "recap sans titre ou sans lignes");
    const ok = new Set([...tous, ...sousIds]);
    const verifier = (modele) => {
      if (vide(modele)) err(id, "ligne de recap vide");
      for (const r of refsDe(modele)) {
        if (r === "element") continue;
        if (!r.startsWith("reponses.") || !ok.has(r.slice(9))) err(id, `recap : référence invalide {${r}}`);
      }
    };
    for (const l of recapEtape.lignes) {
      if (typeof l === "string") verifier(l);
      else { if (Moteur.trouver(ex, l.boucle)?.type !== "boucle") err(id, `recap : boucle inconnue ${l.boucle}`); verifier(l.entete); l.lignes.forEach(verifier); }
    }
  }

  // Atteignabilité
  const vus = new Set([tous[0]]), file = [tous[0]];
  while (file.length) {
    const cur = file.pop();
    if (cur.startsWith("→")) { if (!EXERCICES[cur.slice(1)]) err(id, `exercice cible inconnu : ${cur}`); continue; }
    const e = Moteur.trouver(ex, cur);
    if (!e) { err(id, `suivant inexistant : « ${cur} »`); continue; }
    for (const n of voisins(ex, e)) if (!vus.has(n)) { vus.add(n); file.push(n); }
  }
  for (const t of tous) if (!vus.has(t)) err(id, `étape inatteignable : ${t}`);

  // Chemins : pas de boucle infinie, pas d'impasse, références posées avant d'être utilisées
  const parcourir = (cur, repondues, pile) => {
    if (cur.startsWith("→") || !Moteur.trouver(ex, cur)) return;
    if (pile.includes(cur)) { err(id, `boucle infinie : ${[...pile, cur].join(" → ")}`); return; }
    const e = Moteur.trouver(ex, cur);
    const modeles = e.type === "boucle" ? e.etapes.map((s) => s.question) : e.question ? [e.question] : [];
    if (e.type === "boucle" && !repondues.has(e.sur)) err(id, `boucle ${e.id} : la liste « ${e.sur} » n'est pas encore posée`);
    for (const m of modeles) for (const r of refsDe(m)) {
      if (r.startsWith("reponses.") && !repondues.has(r.slice(9))) err(id, `${e.id} : {${r}} pas encore posée sur ce chemin`);
    }
    const suite = voisins(ex, e);
    if (!suite.length && e.type !== "recap") err(id, `impasse : ${e.id} n'a pas de suivant`);
    const r2 = new Set(repondues).add(e.id);
    suite.forEach((n) => parcourir(n, r2, [...pile, cur]));
  };
  parcourir(tous[0], new Set(), []);
}

// Simulation : toutes les branches, avec des réponses automatiques
const ECHANTILLON = "réponse de test";
function simuler(idEx, chemin = [], branche = "") {
  const ex = EXERCICES[idEx];
  const { reponses, courant } = Moteur.rejouer(ex, chemin);
  if (chemin.length > 200) { err(idEx, `simulation trop longue (${branche})`); return 0; }
  if (courant == null || courant.startsWith("→")) return 1;
  const e = Moteur.etape(ex, courant, reponses);
  if (e.type === "recap") {
    const r = Moteur.recap(ex, reponses, [], false);
    if (!r.lignes.length) err(idEx, `recap vide (${branche})`);
    for (const l of r.lignes) if (l.texte.includes("{") || l.texte.includes("(non précisé)")) err(idEx, `recap mal formé : ${l.texte}`);
    // Les réponses doivent figurer telles quelles dans le recap
    const brut = Moteur.enTexte(r);
    for (const c of chemin) {
      const st = Moteur.trouver(ex, c.etape);
      if (!st || st.type === "choix" || st.type === "confirmation") continue;
      for (const v of [].concat(c.reponse)) if (v && !brut.includes(v)) err(idEx, `réponse absente du recap : ${c.etape}`);
    }
    return 1;
  }
  if (e.type === "choix" || e.type === "confirmation") {
    return Moteur.options(e).reduce((n, o) => n + simuler(idEx, [...chemin, { etape: courant, reponse: o.label }], branche + ">" + o.label), 0);
  }
  const rep = e.type === "liste" ? ["Fil A", "Fil B"] : ECHANTILLON + " " + courant.replace(/:/g, "-");
  return simuler(idEx, [...chemin, { etape: courant, reponse: rep }], branche);
}
for (const id of Object.keys(EXERCICES)) {
  const n = simuler(id);
  console.log(`  ${erreurs.some((x) => x.startsWith(`[${id}]`)) ? "✗" : "✓"} ${id.padEnd(11)} ${Object.keys(EXERCICES[id].etapes).length} étapes, ${n} chemin(s) simulé(s)`);
}

// Tutoiement : jamais de résidu de modèle, et les réponses de l'utilisateur ne sont jamais modifiées
{
  const ex = EXERCICES.personnage;
  const r = { perso: "Vous avez raison, Marie" };
  const t = Moteur.texte(ex.etapes[1].question, { reponses: r }, true).texte;
  if (!t.includes("«\u00a0Vous avez raison, Marie\u00a0»")) err("tutoiement", "la réponse de l'utilisateur a été modifiée");
  if (/\{|\}/.test(t)) err("tutoiement", "résidu de modèle");
}

// ── Rejeu de bout en bout ─────────────────────────────────────────────
function rejouerScenario(idEx, reponsesParId, tutoie) {
  const ex = EXERCICES[idEx];
  const chemin = [], bruts = { ...reponsesParId };
  for (let garde = 0; garde < 200; garde++) {
    const { reponses, courant } = Moteur.rejouer(ex, chemin);
    const e = Moteur.etape(ex, courant, reponses);
    if (e.type === "recap") {
      console.log(`\n── ${ex.titre} (${tutoie ? "tutoiement" : "vouvoiement"}) ──`);
      chemin.forEach((c, i) => {
        const prec = Moteur.rejouer(ex, chemin.slice(0, i)).reponses;
        const ee = Moteur.etape(ex, c.etape, prec);
        const q = Moteur.texte(ee.question, Moteur.contexte(ee, prec), tutoie).texte;
        console.log(`  [${i + 1}/${Moteur.total(ex, chemin.slice(0, i))}] Muse : ${q}\n        Vous : ${[].concat(c.reponse).join(" | ") || "(passé)"}`);
      });
      console.log("\n" + Moteur.enMarkdown(Moteur.recap(ex, reponses, [{ texte: "Penser à relire le chapitre 2." }], tutoie)));
      return;
    }
    const cle = e.id.includes(":") ? e.id.split(":")[2] + "#" + e.id.split(":")[1] : e.id;
    const v = bruts[cle] ?? bruts[e.id.split(":").pop()] ?? (e.type === "liste" ? [] : "");
    chemin.push({ etape: e.id, reponse: v, passe: v === "" });
  }
  err(idEx, "rejeu : trop d'étapes");
}

rejouerScenario("personnage", {
  perso: "Élodie",
  veut: "récupérer la maison de sa grand-mère",
  pourquoi: "c'est le seul endroit où elle se souvient d'avoir été heureuse",
  obstacle: "son frère veut vendre",
  cout: "elle devra emprunter à quelqu'un qu'elle évite",
  cache: "elle a déjà signé une promesse de vente",
  change: "elle n'a plus besoin de la maison",
  exemple: "",                                  // passé
  action: "écrire la scène du notaire en 10 lignes",
  dixmin: "Oui",
}, false);

rejouerScenario("fils", {
  fils: ["La vente de la maison", "L'enquête du frère", "Le journal retrouvé"],
  debut: "à l'ouverture", "debut#1": "au chapitre 3", "debut#2": "au chapitre 5",
  etat: "bloqué au chapitre 8", "etat#1": "abandonné", "etat#2": "pas encore lu",
  fin: "signature", "fin#1": "", "fin#2": "révélé",
  liens: "le journal", "liens#1": "la vente", "liens#2": "l'enquête",
  conflit: "", "conflit#1": "le frère sait trop tôt", "conflit#2": "",
  global: "l'enquête du frère, car elle n'a pas de fin",
  action: "relire les chapitres 3 à 5 et noter les dates",
  dixmin: "Non", action2: "relire le chapitre 3",
}, true);

for (const e of erreurs) console.error("✗ " + e);
console.log(erreurs.length ? `\n${erreurs.length} problème(s).` : "\nTout est cohérent.");
process.exit(erreurs.length ? 1 : 0);
