const TAILLE_HISTORIQUE = 60;

const etat = {
  ecran: "accueil",
  proposition: [],
  ingredient: "",
  mots: 150,
  minutes: 15,
  debut: 0,
  fin: 0,
  minuteur: null,
};

const $ = (id) => document.getElementById(id);


/* Stockage local */

function lire(cle) {
  try {
    return localStorage.getItem(cle);
  } catch (erreur) {
    return null;
  }
}

function ecrire(cle, valeur) {
  try {
    localStorage.setItem(cle, valeur);
  } catch (erreur) {
    return;
  }
}

function chargerHistorique() {
  try {
    return JSON.parse(lire("historique")) || [];
  } catch (erreur) {
    return [];
  }
}

function enregistrerHistorique() {
  const valeurs = etat.proposition.map((element) => element.valeur);
  const historique = [...chargerHistorique(), ...valeurs];
  ecrire("historique", JSON.stringify(historique.slice(-TAILLE_HISTORIQUE)));
}


/* Thème */

function appliquerTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $("bascule-theme").textContent = theme === "dark" ? "Mode clair" : "Mode sombre";
  ecrire("theme", theme);
}

function basculerTheme() {
  const actuel = document.documentElement.dataset.theme;
  appliquerTheme(actuel === "dark" ? "light" : "dark");
}


/* Tirage */

function tirerAuHasard(liste) {
  return liste[Math.floor(Math.random() * liste.length)];
}

function echantillon(liste, nombre) {
  const copie = [...liste];
  const resultat = [];

  while (resultat.length < nombre) {
    const index = Math.floor(Math.random() * copie.length);
    resultat.push(copie.splice(index, 1)[0]);
  }

  return resultat;
}

function tirerValeur(cle, exclus) {
  const table = AXES[cle].table;
  const frais = table.filter((valeur) => !exclus.includes(valeur));
  return tirerAuHasard(frais.length ? frais : table);
}

function trierProposition(proposition) {
  const ordre = Object.keys(AXES);
  proposition.sort((a, b) => ordre.indexOf(a.cle) - ordre.indexOf(b.cle));
}

function valeursAEviter() {
  const actuelles = etat.proposition.map((element) => element.valeur);
  return [...chargerHistorique(), ...actuelles];
}

function tirerProposition() {
  const entree = tirerAuHasard(PORTES_D_ENTREE);
  const autres = Object.keys(AXES).filter((cle) => {
    const memePointDeVue = entree === "amorce" && cle === "pdv";
    return cle !== entree && !memePointDeVue;
  });

  const nombre = 2 + Math.floor(Math.random() * 3);
  const cles = [entree, ...echantillon(autres, nombre)];
  const historique = chargerHistorique();
  const proposition = cles.map((cle) => ({ cle, valeur: tirerValeur(cle, historique) }));

  trierProposition(proposition);
  return proposition;
}

function nouveauTirage() {
  etat.proposition = tirerProposition();
  afficherProposition();
}

function renouvelerElement(index) {
  const element = etat.proposition[index];
  element.valeur = tirerValeur(element.cle, valeursAEviter());
  afficherProposition();
}

function supprimerElement(index) {
  if (etat.proposition.length === 1) {
    return;
  }

  etat.proposition.splice(index, 1);
  afficherProposition();
}

function ajouterElement() {
  const presentes = etat.proposition.map((element) => element.cle);
  const restantes = Object.keys(AXES).filter((cle) => !presentes.includes(cle));

  if (restantes.length === 0) {
    return;
  }

  const cle = tirerAuHasard(restantes);
  etat.proposition.push({ cle, valeur: tirerValeur(cle, valeursAEviter()) });
  trierProposition(etat.proposition);
  afficherProposition();
}


/* Affichage des éléments */

function creerElement(balise, texte = "", classe = "") {
  const element = document.createElement(balise);
  element.textContent = texte;
  element.className = classe;
  return element;
}

function creerBouton(texte, action) {
  const bouton = creerElement("button", texte);
  bouton.type = "button";
  bouton.addEventListener("click", action);
  return bouton;
}

function creerLigne(etiquette, valeur) {
  const ligne = creerElement("li");
  ligne.append(
    creerElement("span", etiquette, "etiquette"),
    creerElement("span", valeur, "valeur"),
  );
  return ligne;
}

function creerLigneProposition(element, index) {
  const ligne = creerLigne(AXES[element.cle].etiquette, element.valeur);
  const actions = creerElement("span", "", "actions");

  actions.append(
    creerBouton("Changer", () => renouvelerElement(index)),
    creerBouton("Retirer", () => supprimerElement(index)),
  );
  ligne.append(actions);
  return ligne;
}

function afficherProposition() {
  const lignes = etat.proposition.map(creerLigneProposition);
  $("proposition").replaceChildren(...lignes);
}

function listerElements() {
  const elements = etat.proposition.map((element) => ({
    etiquette: AXES[element.cle].etiquette,
    valeur: element.valeur,
  }));

  if (etat.ingredient) {
    elements.push({ etiquette: "Votre ingrédient", valeur: etat.ingredient });
  }

  return elements;
}

function afficherElements(idListe) {
  const lignes = listerElements().map((element) => creerLigne(element.etiquette, element.valeur));
  $(idListe).replaceChildren(...lignes);
}


/* Écrans */

function afficherEcran(nom) {
  etat.ecran = nom;

  document.querySelectorAll(".ecran").forEach((ecran) => {
    ecran.hidden = ecran.id !== nom;
  });

  window.scrollTo(0, 0);
  focaliserEcran(nom);
}

function focaliserEcran(nom) {
  const cible = document.querySelector(`#${nom} .defaut, #${nom} input`);

  if (cible) {
    cible.focus();
  }
}

function naviguer(bouton) {
  const choix = bouton.closest("[data-cle]");

  if (choix) {
    etat[choix.dataset.cle] = Number(bouton.dataset.valeur);
  }

  afficherEcran(bouton.dataset.vers);
}

function gererTouches(evenement) {
  if (evenement.key === "Enter" && evenement.target.id === "ingredient") {
    $("continuer").click();
  }

  const boutons = document.querySelectorAll(`#${etat.ecran} [data-valeur]`);
  const choisi = boutons[Number(evenement.key) - 1];

  if (choisi) {
    choisi.click();
  }
}

function commencer() {
  etat.ingredient = $("ingredient").value.trim();
  enregistrerHistorique();
  $("minuteur").hidden = etat.minutes === 0;

  $("titre").value = "";
  $("texte").value = "";
  afficherElements("rappel");
  mettreAJourCompteur();

  etat.debut = Date.now();
  demarrerMinuteur();
  afficherEcran("ecriture");
  $("texte").focus();
}

function reprendre() {
  etat.debut += Date.now() - etat.fin;
  demarrerMinuteur();
  afficherEcran("ecriture");
  $("texte").focus();
}

function recommencer() {
  $("ingredient").value = "";
  nouveauTirage();
  afficherEcran("accueil");
}

function home() {
  if (!window.confirm("Quitter le tirage ?")) return;
  window.location.href = '../';
}

/* Compteur et minuteur */

function compterMots(texte) {
  return texte.split(/\s+/).filter(Boolean).length;
}

function mettreAJourCompteur() {
  const nombre = compterMots($("texte").value);
  $("compteur").textContent = `${nombre} / ${etat.mots} mots`;
}

function formaterDuree(secondes) {
  const signe = secondes < 0 ? "+" : "";
  const absolu = Math.abs(secondes);
  const minutes = Math.floor(absolu / 60);
  const reste = String(absolu % 60).padStart(2, "0");
  return `${signe}${minutes}:${reste}`;
}

function secondesEcoulees(jusqua = Date.now()) {
  return Math.floor((jusqua - etat.debut) / 1000);
}

function mettreAJourMinuteur() {
  const restant = etat.minutes * 60 - secondesEcoulees();
  $("minuteur").textContent = formaterDuree(restant);
  $("minuteur").classList.toggle("depasse", restant < 0);
}

function demarrerMinuteur() {
  arreterMinuteur();
  mettreAJourMinuteur();
  etat.minuteur = setInterval(mettreAJourMinuteur, 1000);
}

function arreterMinuteur() {
  clearInterval(etat.minuteur);
}


/* Résultat */

function pluriel(nombre, mot) {
  return `${nombre} ${mot}${nombre > 1 ? "s" : ""}`;
}

function jugerEcart(nombre) {
  const ecart = nombre - etat.mots;

  if (Math.abs(ecart) <= etat.mots * 0.15) {
    return "pile dans la cible";
  }

  return ecart > 0
    ? `${pluriel(ecart, "mot")} de trop`
    : `${pluriel(-ecart, "mot")} à gagner`;
}

function construireBilan(nombre) {
  if (nombre === 0) {
    return "Page blanche pour cette fois. Ça arrive.";
  }

  const duree = formaterDuree(secondesEcoulees(etat.fin));
  return `${pluriel(nombre, "mot")} (${jugerEcart(nombre)}). Durée : ${duree}.`;
}

function terminer() {
  arreterMinuteur();
  etat.fin = Date.now();

  const titre = $("titre").value.trim() || "Sans titre";
  const texte = $("texte").value.trim();

  $("resultat-titre").textContent = titre;
  $("resultat-texte").textContent = texte;
  $("resultat-bilan").textContent = construireBilan(compterMots(texte));
  afficherElements("resultat-elements");
  afficherEcran("resultat");
}


/* Export */

function deuxChiffres(nombre) {
  return String(nombre).padStart(2, "0");
}

function horodatage() {
  const d = new Date();
  const jour = `${d.getFullYear()}-${deuxChiffres(d.getMonth() + 1)}-${deuxChiffres(d.getDate())}`;
  const heure = `${deuxChiffres(d.getHours())}${deuxChiffres(d.getMinutes())}`;
  return `${jour}_${heure}`;
}

function construireDocument() {
  const titre = $("resultat-titre").textContent;
  const texte = $("resultat-texte").textContent;
  const elements = listerElements().map((e) => `• ${e.etiquette} : ${e.valeur}`);

  return [
    titre,
    "",
    texte,
    "",
    "----------------------------------------",
    `Longueur visée : environ ${etat.mots} mots`,
    `Temps conseillé : ${etat.minutes} minutes`,
    "Éléments proposés :",
    ...elements,
    "",
  ].join("\n");
}

function telecharger() {
  const blob = new Blob([construireDocument()], { type: "text/plain;charset=utf-8" });
  const lien = document.createElement("a");

  lien.href = URL.createObjectURL(blob);
  lien.download = `pocketmuse_${horodatage()}.txt`;
  lien.click();
  URL.revokeObjectURL(lien.href);
}

async function copier() {
  const bouton = $("copier");

  try {
    await navigator.clipboard.writeText(construireDocument());
    bouton.textContent = "Copié";
  } catch (erreur) {
    bouton.textContent = "Copie impossible";
  }

  setTimeout(() => { bouton.textContent = "Copier le texte"; }, 2000);
}


/* Démarrage */

function protegerLeTexte(evenement) {
  if (["ecriture", "resultat"].includes(etat.ecran) && $("texte").value.trim()) {
    evenement.preventDefault();
  }
}

function brancherEvenements() {
  $("bascule-theme").addEventListener("click", basculerTheme);
  $("ajouter").addEventListener("click", ajouterElement);
  $("nouveau-tirage").addEventListener("click", nouveauTirage);
  $("commencer").addEventListener("click", commencer);
  $("texte").addEventListener("input", mettreAJourCompteur);
  $("terminer").addEventListener("click", terminer);
  $("reprendre").addEventListener("click", reprendre);
  $("telecharger").addEventListener("click", telecharger);
  $("copier").addEventListener("click", copier);
  $("recommencer").addEventListener("click", recommencer);
  $("home").addEventListener("click", home);
  window.addEventListener("beforeunload", protegerLeTexte);

  document.addEventListener("keydown", gererTouches);

  document.querySelectorAll("[data-vers]").forEach((bouton) => {
    bouton.addEventListener("click", () => naviguer(bouton));
  });
}

function demarrer() {
  appliquerTheme(document.documentElement.dataset.theme);
  brancherEvenements();
  nouveauTirage();
  focaliserEcran("accueil");
}

demarrer();
