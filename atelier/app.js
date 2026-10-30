/* PocketMuse : l'interface du mode guidé.
   Les textes sont dans data.js, la logique des étapes dans moteur.js. Ici : affichage, boutons, sauvegarde. */

(() => {
  const CLE = "pocketmuse-session-atelier";
  const $ = (id) => document.getElementById(id);
  const vide = () => ({ chemin: [], notes: [], brouillon: [] });

  let etat = { courant: null, pile: [], exercices: {} };
  let modeNote = false;
  let rapideCourant = null;
  let minuteur = null;
  const MOUVEMENT_REDUIT = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Sauvegarde (tout reste dans le navigateur) ---------- */

  function charger() {
    try {
      const s = JSON.parse(localStorage.getItem(CLE));
      if (s && typeof s === "object" && s.exercices) etat = { ...etat, ...s };
    } catch (erreur) { /* première visite, ou stockage indisponible */ }
    // Une sauvegarde abîmée ne doit jamais empêcher l'ouverture.
    for (const [id, d] of Object.entries(etat.exercices)) {
      try {
        if (!EXERCICES[id]) throw new Error("exercice inconnu");
        d.notes = d.notes || []; d.brouillon = d.brouillon || [];
        Moteur.rejouer(EXERCICES[id], d.chemin);
      } catch (erreur) { delete etat.exercices[id]; }
    }
    if (!EXERCICES[etat.courant]) etat.courant = null;
    etat.pile = (etat.pile || []).filter((id) => EXERCICES[id]);
  }

  function sauver() {
    try { localStorage.setItem(CLE, JSON.stringify(etat)); } catch (erreur) { /* tant pis */ }
  }

  const donnees = (id) => (etat.exercices[id] ||= vide());

  function situation() {
    const ex = EXERCICES[etat.courant];
    const d = donnees(etat.courant);
    return { ex, d, ...Moteur.rejouer(ex, d.chemin) };
  }

  const dit = (modele, ctx) => Moteur.texte(modele, ctx || { reponses: {} }).texte;

  /* ---------- Actions ---------- */

  function choisirExercice(id) {
    etat.courant = id;
    modeNote = false;
    donnees(id);
    rendre(true, true);
  }

  function repondre(valeur, passe = false) {
    const { d, courant, ex } = situation();
    if (!courant || courant.startsWith("→")) return;
    d.chemin.push({ etape: courant, reponse: valeur, passe });
    d.brouillon = [];
    modeNote = false;
    const suite = Moteur.rejouer(ex, d.chemin).courant;
    if (suite && suite.startsWith("→") && EXERCICES[suite.slice(1)]) {
      etat.pile.push(etat.courant);
      etat.courant = suite.slice(1);
      donnees(etat.courant);
    }
    rendre(true, true);
  }

  function ajouterNote(texte) {
    const d = donnees(etat.courant);
    d.notes.push({ pos: d.chemin.length, texte });
    rendre(true);
  }

  function retour() {
    const d = donnees(etat.courant);
    if (d.brouillon.length) { d.brouillon.pop(); }
    else if (d.chemin.length) { d.chemin.pop(); }
    else if (etat.pile.length) {
      etat.courant = etat.pile.pop();
      donnees(etat.courant).chemin.pop();
    } else return;
    const e = donnees(etat.courant);
    e.notes.forEach((n) => { n.pos = Math.min(n.pos, e.chemin.length); });
    rendre(true);
  }

  function passer() {
    const { ex, courant, reponses } = situation();
    const e = Moteur.etape(ex, courant, reponses);
    if (!e || e.type === "recap") return;
    repondre(e.type === "liste" ? [] : "", true);
  }

  function recommencer() {
    if (!window.confirm("Recommencer cet exercice ? Les réponses et les notes de cet exercice seront effacées.")) return;
    etat.exercices[etat.courant] = vide();
    etat.pile = [];
    rendre(true);
  }

  function toutEffacer() {
    if (!window.confirm("Tout effacer ? Toutes les sessions enregistrées dans ce navigateur seront supprimées.")) return;
    try { localStorage.removeItem(CLE); } catch (erreur) { /* rien */ }
    etat = { courant: null, pile: [], exercices: {} };
    modeNote = false;
    rendre(true);
  }

  /* ---------- Export du récapitulatif ---------- */

  function recapActuel() {
    const { ex, d, reponses } = situation();
    return Moteur.recap(ex, reponses, d.notes);
  }

  async function copier() {
    const texte = Moteur.enMarkdown(recapActuel());
    let ok = false;
    try { await navigator.clipboard.writeText(texte); ok = true; } catch (erreur) {
      try {
        const t = document.createElement("textarea");
        t.value = texte; t.style.position = "fixed"; t.style.opacity = "0";
        document.body.append(t); t.select(); ok = document.execCommand("copy"); t.remove();
      } catch (e2) { /* rien */ }
    }
    annoncer(ok ? "Récapitulatif copié dans le presse-papiers." : "Copie impossible : utilisez le téléchargement.");
  }

  function telecharger() {
    const blob = new Blob([Moteur.enMarkdown(recapActuel())], { type: "text/markdown;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `pocketmuse-atelier-${etat.courant}.md`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    annoncer("Récapitulatif téléchargé.");
  }

  /* ---------- Affichage ---------- */

  function annoncer(texte) { $("annonce").textContent = ""; setTimeout(() => { $("annonce").textContent = texte; }, 30); }

  function bulle(classe, etiquette, texte) {
    const li = document.createElement("li");
    li.className = classe;
    const e = document.createElement("span"); e.className = "etiquette"; e.textContent = etiquette;
    const v = document.createElement("span"); v.className = "valeur"; v.textContent = texte;
    li.append(e, v);
    return li;
  }

  const texteReponse = (c) =>
    c.passe ? "(passé)" : Array.isArray(c.reponse) ? c.reponse.map((x) => "• " + x).join("\n") : c.reponse;

  function bouton(label, action, classe = "petit") {
    const b = document.createElement("button");
    b.type = "button"; b.className = classe; b.textContent = label;
    b.addEventListener("click", action);
    return b;
  }

  // Trois points qui pulsent à la place de la bulle de l'atelier, le temps d'une courte pause.
  function bulleAttente() {
    const li = document.createElement("li");
    li.className = "atelier attente";
    const e = document.createElement("span"); e.className = "etiquette"; e.textContent = "Atelier";
    const p = document.createElement("span"); p.className = "points"; p.setAttribute("aria-hidden", "true");
    for (let i = 0; i < 3; i++) { const pt = document.createElement("span"); pt.className = "point"; p.append(pt); }
    li.append(e, p);
    return li;
  }

  function rendre(focus, simuler = false) {
    clearTimeout(minuteur);
    const liste = $("conversation"), rapides = $("rapides"), champ = $("message");
    const boutons = [];
    let type = "accueil", dernierAtelier = ACCUEIL, progression = "Choisir un exercice", derniere = null;
    liste.textContent = ""; rapides.textContent = "";

    if (!etat.courant) {
      liste.append(bulle("atelier", "Atelier", dit(ACCUEIL)));
      for (const [id, ex] of Object.entries(EXERCICES)) {
        const en = donnees(id).chemin.length ? " (en cours)" : "";
        boutons.push(bouton(`${ex.titre}${en}`, () => { etat.pile = []; choisirExercice(id); }));
      }
      dernierAtelier = dit(ACCUEIL);
    } else {
      const { ex, d, reponses, courant } = situation();
      liste.append(bulle("atelier", "Atelier", dit(ex.intro)));
      const parPos = (p) => d.notes.filter((n) => n.pos === p).forEach((n) => liste.append(bulle("note", "Note", n.texte)));

      d.chemin.forEach((c, p) => {
        const avant = Moteur.rejouer(ex, d.chemin.slice(0, p)).reponses;
        const e = Moteur.etape(ex, c.etape, avant);
        liste.append(bulle("atelier", "Atelier", dit(e.question, Moteur.contexte(e, avant))));
        parPos(p);
        liste.append(bulle("vous", "Vous", texteReponse(c)));
      });

      const n = d.chemin.length;
      const e = courant && !courant.startsWith("→") ? Moteur.etape(ex, courant, reponses) : null;

      if (!e) {
        const cible = courant && EXERCICES[courant.slice(1)];
        dernierAtelier = cible ? dit(`Cap sur l'exercice « ${cible.titre} ».`) : dit("Cet exercice est terminé.");
        liste.append(derniere = bulle("atelier", "Atelier", dernierAtelier));
        parPos(n);
        type = "fin";
        progression = ex.titre;
        if (cible) boutons.push(bouton("Aller à cet exercice", () => { etat.pile.push(etat.courant); choisirExercice(courant.slice(1)); }));
      } else if (e.type === "recap") {
        const r = Moteur.recap(ex, reponses, d.notes);
        dernierAtelier = dit("Voici le récapitulatif, construit uniquement avec les réponses données.");
        liste.append(derniere = bulle("atelier recap", "Atelier", `${dernierAtelier}\n\n${Moteur.enTexte({ ...r, notes: [] })}`));
        parPos(n);
        type = "recap";
        progression = `${ex.titre} · récapitulatif`;
        boutons.push(bouton("Copier le récapitulatif", copier), bouton("Télécharger (.md)", telecharger));
      } else {
        type = e.type;
        dernierAtelier = dit(e.question, Moteur.contexte(e, reponses));
        liste.append(derniere = bulle("atelier", "Atelier", dernierAtelier));
        if (type === "liste" && d.brouillon.length) {
          liste.append(bulle("vous", "Vous", d.brouillon.map((x) => "• " + x).join("\n")));
        }
        parPos(n);
        progression = `${ex.titre} · étape ${n + 1}/${Math.max(n + 1, Moteur.total(ex, d.chemin))}`;
        if (type === "choix" || type === "confirmation") {
          for (const o of Moteur.options(e)) boutons.push(bouton(o.label, () => repondre(o.label)));
        }
        if (type === "liste" && d.brouillon.length >= (e.min || 1)) {
          boutons.push(bouton("Terminer la liste", () => repondre([...d.brouillon])));
        }
      }
    }

    // L'atelier « écrit » : on montre les points, on bloque la saisie, puis on affiche vraiment la réponse.
    if (simuler && derniere) {
      derniere.replaceWith(bulleAttente());
      ["message", "envoyer", "mode-note", "retour", "passer", "changer", "recommencer", "effacer"].forEach((id) => { $(id).disabled = true; });
      $("progression").textContent = progression;
      liste.scrollTop = liste.scrollHeight;
      sauver();
      const delai = MOUVEMENT_REDUIT ? 0 : Math.min(1100, 500 + dernierAtelier.length * 4);
      minuteur = setTimeout(() => rendre(focus), delai);
      return;
    }

    boutons.forEach((b) => rapides.append(b));
    rapideCourant = boutons[0] || null;

    // Réglage de la saisie selon l'étape
    const reponseLibre = ["texte", "liste", "boucle"].includes(type);
    const noteSeule = !reponseLibre;
    const enNote = noteSeule || modeNote;
    champ.disabled = type === "accueil";
    $("mode-note").disabled = type === "accueil" || noteSeule;
    $("mode-note").setAttribute("aria-pressed", String(modeNote && !noteSeule));
    $("envoyer").disabled = type === "accueil";
    $("envoyer").textContent = enNote ? "Noter" : type === "liste" ? "Ajouter" : "Envoyer";
    champ.placeholder = type === "accueil" ? "Choisissez un exercice ci-dessus"
      : enNote ? "Note libre : enregistrée, sans changer d'étape"
      : type === "liste" ? "Un élément à la fois, puis « Ajouter »"
      : "Votre réponse…";
    champ.value = ""; ajuster();

    // Navigation
    const d2 = etat.courant ? donnees(etat.courant) : null;
    $("retour").disabled = !etat.courant || !(d2.brouillon.length || d2.chemin.length || etat.pile.length);
    $("passer").disabled = !reponseLibre && type !== "choix" && type !== "confirmation";
    $("changer").disabled = !etat.courant;
    $("recommencer").disabled = !etat.courant;
    $("effacer").disabled = false;
    $("progression").textContent = progression;

    sauver();
    liste.scrollTop = liste.scrollHeight;
    annoncer(dernierAtelier);
    if (focus) (champ.disabled || (noteSeule && rapideCourant) ? rapideCourant || $("changer") : champ).focus();
  }

  function ajuster() {
    const c = $("message");
    c.style.height = "auto";
    c.style.height = Math.min(c.scrollHeight + 2, 160) + "px";
  }

  /* ---------- Branchements ---------- */

  function envoyer(evenement) {
    evenement.preventDefault();
    const champ = $("message");
    const valeur = champ.value.trim();
    if (!valeur || !etat.courant) return;
    const { ex, d, courant, reponses } = situation();
    const e = courant && !courant.startsWith("→") ? Moteur.etape(ex, courant, reponses) : null;
    const libre = e && ["texte", "liste"].includes(e.type);
    if (!libre || modeNote) { ajouterNote(valeur); return; }
    if (e.type === "liste") { d.brouillon.push(valeur); rendre(true); return; }
    repondre(valeur);
  }

  function demarrer() {
    charger();
    $("saisie").addEventListener("submit", envoyer);
    $("message").addEventListener("input", ajuster);
    $("message").addEventListener("keydown", (ev) => {
      if (ev.key === "Enter" && !ev.shiftKey && !ev.isComposing) { ev.preventDefault(); $("saisie").requestSubmit(); }
    });
    $("mode-note").addEventListener("click", () => { modeNote = !modeNote; rendre(true); });
    $("retour").addEventListener("click", retour);
    $("passer").addEventListener("click", passer);
    $("changer").addEventListener("click", () => { etat.courant = null; etat.pile = []; modeNote = false; rendre(true); });
    $("recommencer").addEventListener("click", recommencer);
    $("effacer").addEventListener("click", toutEffacer);

    const theme = $("bascule-theme");
    const majTheme = () => { theme.textContent = document.documentElement.dataset.theme === "dark" ? "Thème clair" : "Thème sombre"; };
    theme.addEventListener("click", () => {
      const suivant = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = suivant;
      try { localStorage.setItem("theme", suivant); } catch (erreur) { /* rien */ }
      majTheme();
    });
    majTheme();
    rendre(false);
  }

  demarrer();
})();
