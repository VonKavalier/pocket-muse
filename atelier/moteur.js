/* PocketMuse : le moteur du mode guidé. Aucun texte de l'atelier ici (tout est dans data.js), aucun DOM.
   Il sait toujours où il en est : la position courante est rejouée à partir du chemin
   [{ etape, reponse, passe }] déjà parcouru. Retour = retirer la dernière entrée. */

const Moteur = (() => {
  const OUI_NON = [{ label: "Oui" }, { label: "Non" }];

  const guill = (s) => `«\u00a0${s}\u00a0»`;

  // Valeur affichable d'une réponse, telle quelle (entre guillemets), ou null si absente.
  function afficher(v) {
    if (Array.isArray(v)) return v.length ? v.map(guill).join(", ") : null;
    if (typeof v === "string" && v.trim()) return guill(v.trim());
    return null;
  }

  const lien = (vid) => { const p = vid.split(":"); return p.length === 3 ? { boucle: p[0], i: Number(p[1]), sous: p[2] } : null; };
  const trouver = (ex, id) => ex.etapes.find((e) => e.id === id) || null;
  const options = (e) => e.options || (e.type === "confirmation" ? OUI_NON : []);

  function etape(ex, vid, reponses) {
    const l = lien(vid);
    if (!l) return trouver(ex, vid);
    const b = trouver(ex, l.boucle);
    const s = b.etapes.find((x) => x.id === l.sous);
    const items = reponses[b.sur] || [];
    return { id: vid, type: "texte", question: s.question, element: items[l.i], n: l.i + 1, total: items.length };
  }

  // Une boucle vide est sautée ; une boucle non vide commence par sa première sous-question.
  function entrer(ex, id, reponses) {
    if (id == null || id.startsWith("→")) return id == null ? null : id;
    const e = trouver(ex, id);
    if (e && e.type === "boucle") {
      const items = reponses[e.sur] || [];
      return items.length ? `${id}:0:${e.etapes[0].id}` : entrer(ex, e.suivant, reponses);
    }
    return id;
  }

  // Étape suivante, une fois la réponse enregistrée dans `reponses`. "→id" = autre exercice.
  function suivant(ex, vid, valeur, reponses) {
    const l = lien(vid);
    if (l) {
      const b = trouver(ex, l.boucle);
      const k = b.etapes.findIndex((x) => x.id === l.sous);
      if (k + 1 < b.etapes.length) return `${b.id}:${l.i}:${b.etapes[k + 1].id}`;
      if (l.i + 1 < (reponses[b.sur] || []).length) return `${b.id}:${l.i + 1}:${b.etapes[0].id}`;
      return entrer(ex, b.suivant, reponses);
    }
    const e = trouver(ex, vid);
    if (e.type === "choix" || e.type === "confirmation") {
      const liste = options(e);
      const o = liste.find((x) => x.label === valeur) || liste[0];
      if (o.vers) return `→${o.vers}`;
      return entrer(ex, o.suivant ?? e.suivant ?? null, reponses);
    }
    return entrer(ex, e.suivant ?? null, reponses);
  }

  function depart(ex) { return ex.etapes[0].id; }

  function rejouer(ex, chemin) {
    const reponses = {};
    let courant = depart(ex);
    for (const entree of chemin) {
      reponses[entree.etape] = entree.reponse;
      courant = suivant(ex, entree.etape, entree.reponse, reponses);
    }
    return { reponses, courant };
  }

  function valeurRef(nom, ctx) {
    if (nom === "element") return afficher(ctx.element);
    if (nom === "n") return ctx.n == null ? null : String(ctx.n);
    if (nom === "total") return ctx.total == null ? null : String(ctx.total);
    if (nom.startsWith("reponses.")) return afficher((ctx.reponses || {})[nom.slice(9)]);
    return null;
  }

  function texte(modele, ctx = {}) {
    const refs = [];
    let m = modele.replace(/\{([^}]+)\}/g, (_, nom) => { refs.push(nom); return `{R${refs.length - 1}}`; });
    const manquants = [];
    const t = m.replace(/\{R(\d+)\}/g, (_, i) => {
      const v = valeurRef(refs[Number(i)], ctx);
      if (v == null) { manquants.push(refs[Number(i)]); return "(non précisé)"; }
      return v;
    });
    return { texte: t, manquants };
  }

  function contexte(e, reponses) {
    return { reponses, element: e.element, n: e.n, total: e.total };
  }

  // Estimation du nombre total d'étapes sur le chemin « par défaut », pour « étape 3/6 ».
  function total(ex, chemin) {
    const { reponses, courant } = rejouer(ex, chemin);
    const r = { ...reponses };
    let cur = courant, n = 0;
    for (let garde = 0; cur && !cur.startsWith("→") && garde < 300; garde++) {
      const e = etape(ex, cur, r);
      if (e.type === "recap") break;
      n++;
      if (e.type === "liste" && !(Array.isArray(r[cur]) && r[cur].length)) r[cur] = ["·"];
      cur = suivant(ex, cur, "", r);
    }
    return chemin.length + n;
  }

  function recap(ex, reponses, notes = []) {
    const e = trouver(ex, "recap");
    const lignes = [];
    const ajouter = (niveau, modele, ctx) => {
      const r = texte(modele, ctx);
      if (!r.manquants.length) lignes.push({ niveau, texte: r.texte });
    };
    for (const l of e.lignes) {
      if (typeof l === "string") { ajouter(0, l, { reponses }); continue; }
      const b = trouver(ex, l.boucle);
      (reponses[b.sur] || []).forEach((element, i) => {
        const locales = { ...reponses };
        b.etapes.forEach((s) => { locales[s.id] = reponses[`${b.id}:${i}:${s.id}`]; });
        const ctx = { reponses: locales, element, n: i + 1, total: reponses[b.sur].length };
        ajouter(0, l.entete, ctx);
        l.lignes.forEach((x) => ajouter(1, x, ctx));
      });
    }
    return { titre: e.titre, lignes, notes: notes.map((n) => n.texte) };
  }

  const enTexte = (r) =>
    [r.titre, "", ...r.lignes.map((l) => (l.niveau ? "    – " : "• ") + l.texte),
     ...(r.notes.length ? ["", "Notes :", ...r.notes.map((n) => "• " + n)] : [])].join("\n");

  const enMarkdown = (r) =>
    [`# ${r.titre}`, "", ...r.lignes.map((l) => (l.niveau ? "  - " : "- ") + l.texte),
     ...(r.notes.length ? ["", "## Notes", "", ...r.notes.map((n) => "- " + n.replace(/\n/g, "\n  "))] : []), ""].join("\n");

  return { afficher, etape, entrer, suivant, depart, rejouer, texte, contexte, total, recap, enTexte, enMarkdown, trouver, options, lien };
})();

if (typeof module !== "undefined") module.exports = Moteur;
