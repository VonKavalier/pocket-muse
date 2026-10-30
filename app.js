const $ = (id) => document.getElementById(id);

function ecrire(cle, valeur) {
  try {
    localStorage.setItem(cle, valeur);
  } catch (erreur) {
    return;
  }
}

function appliquerTheme(theme) {
  document.documentElement.dataset.theme = theme;
  $("bascule-theme").textContent = theme === "dark" ? "Mode clair" : "Mode sombre";
  ecrire("theme", theme);
}

function basculerTheme() {
  const actuel = document.documentElement.dataset.theme;
  appliquerTheme(actuel === "dark" ? "light" : "dark");
}

function demarrer() {
  appliquerTheme(document.documentElement.dataset.theme);
  $("bascule-theme").addEventListener("click", basculerTheme);
}

demarrer();
