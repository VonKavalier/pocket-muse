/* PocketMuse : les exercices du mode guidé.

   Le moteur (moteur.js) ne contient aucun texte : tout ce que dit la muse est ici.

   ── SCHÉMA ──────────────────────────────────────────────────────────────
   EXERCICES = {
     identifiant: {
       titre:    "Titre affiché dans la liste et dans l'export",
       resume:   "Une phrase pour le menu",
       intro:    "Ce que la muse dit en ouvrant l'exercice",
       sansRecap: true,            // optionnel : exercice d'aiguillage, sans récapitulatif
       etapes:   [ étape, étape, … ],   // la première est le point d'entrée
     }
   }

   Une étape a toujours { id, type } et, sauf "recap", une { question }.
   L'id est unique dans l'exercice et sans « : ». Types :

   "texte"         réponse libre.                         suivant: "id"
   "choix"         boutons.   options: [{ label, suivant?, vers? }]
                   suivant (de l'option, sinon de l'étape) = étape suivante ;
                   vers: "identifiant" = envoyer vers un autre exercice.
   "confirmation"  un choix Oui / Non par défaut (options peut le remplacer).
   "liste"         l'utilisateur ajoute des éléments un à un.   min?: 1   suivant
   "boucle"        sur: "id d'une liste"  etapes: [{ id, question }]  suivant
                   pose les sous-questions pour chaque élément de la liste.
   "recap"         dernière étape, id "recap" obligatoire :
                   titre: "…", lignes: [ "Libellé : {reponses.id}", …,
                     { boucle: "id de la boucle", entete: "Fil : {element}",
                       lignes: [ "Début : {reponses.debut}" ] } ]
                   Une ligne dont une réponse manque (étape passée) est omise.

   Références dans les textes :
     {reponses.id}  réponse d'une étape précédente, insérée TELLE QUELLE entre « »
                    (une liste donne « a », « b »). Aucune conjugaison, aucun je → vous.
     {element} {n} {total}   dans une boucle : l'élément courant, son rang, le nombre d'éléments.

   ── AJOUTER UN EXERCICE ─────────────────────────────────────────────────
   1. Ajoutez une entrée dans EXERCICES avec titre, resume, intro et des étapes.
   2. Terminez par ...ACTION_FINALE puis une étape { id: "recap", type: "recap", … }.
      La dernière étape avant ACTION_FINALE doit avoir suivant: "action".
   3. Ajoutez, si vous voulez, une option dans l'exercice "diagnostic" (vers: "votre_id").
   4. Lancez : node test.js  (étapes atteignables, références valides, pas de boucle infinie).
   La muse ne propose jamais de contenu : elle pose des questions.
*/

const ACCUEIL =
  "Bonjour. Je vous propose de courts exercices, une question à la fois. " +
  "Par où voulez-vous commencer ?";

// Fin commune à tous les exercices : la prochaine action, formulée par l'utilisateur.
const ACTION_FINALE = [
  { id: "action", type: "texte", suivant: "dixmin",
    question: "Quelle serait la prochaine action, à faire en moins de 10 minutes ? Formulez-la vous-même." },
  { id: "dixmin", type: "confirmation",
    question: "Cette action tient-elle vraiment en moins de 10 minutes ?",
    options: [{ label: "Oui", suivant: "recap" }, { label: "Non", suivant: "action2" }] },
  { id: "action2", type: "texte", suivant: "recap",
    question: "Quelle partie de cette action tient en moins de 10 minutes ?" },
];

const EXERCICES = {

  diagnostic: {
    titre: "Diagnostic du blocage",
    resume: "Je ne sais pas par où commencer",
    intro: "Une seule question pour choisir l'exercice adapté.",
    sansRecap: true,
    etapes: [
      { id: "coince", type: "choix", question: "Qu'est-ce qui coince en ce moment ?",
        options: [
          { label: "Un personnage", vers: "personnage" },
          { label: "Une intrigue", vers: "intrigue" },
          { label: "Une scène", vers: "scene" },
          { label: "La fin", vers: "fin" },
          { label: "La cohérence d'ensemble", vers: "fils" },
          { label: "L'envie d'écrire", vers: "envie" },
          { label: "Autre chose", vers: "pointer" },
        ] },
    ],
  },

  personnage: {
    titre: "Motivation d'un personnage",
    resume: "Ce qu'il veut, ce que ça lui coûte, ce qu'il cache",
    intro: "Nous allons préciser ce qui fait agir un personnage, en six questions.",
    etapes: [
      { id: "perso", type: "texte", suivant: "veut",
        question: "De quel personnage parlons-nous ? Un nom ou un surnom suffit." },
      { id: "veut", type: "texte", suivant: "pourquoi",
        question: "Pour {reponses.perso} : que veut ce personnage, concrètement ?" },
      { id: "pourquoi", type: "texte", suivant: "obstacle",
        question: "Pourquoi est-ce important pour {reponses.perso} ? Qu'est-ce que {reponses.veut} lui apporterait ?" },
      { id: "obstacle", type: "texte", suivant: "cout",
        question: "Qu'est-ce qui s'oppose à {reponses.veut} ?" },
      { id: "cout", type: "texte", suivant: "cache",
        question: "Que lui en coûte-t-il d'essayer ?" },
      { id: "cache", type: "texte", suivant: "change",
        question: "Qu'est-ce que {reponses.perso} cache, aux autres ou à soi-même ?" },
      { id: "change", type: "texte", suivant: "exemple",
        question: "À la fin de l'histoire, qu'est-ce qui a changé pour {reponses.perso} ?" },
      { id: "exemple", type: "texte", suivant: "action",
        question: "Dans le texte, où voit-on déjà {reponses.veut} ? Citez un passage, ou dites qu'il n'y en a pas." },
      ...ACTION_FINALE,
      { id: "recap", type: "recap", titre: "Fiche de motivation",
        lignes: [
          "Personnage : {reponses.perso}",
          "Veut : {reponses.veut}",
          "Pourquoi : {reponses.pourquoi}",
          "Ce qui s'y oppose : {reponses.obstacle}",
          "Ce que cela coûte : {reponses.cout}",
          "Ce qui est caché : {reponses.cache}",
          "Ce qui change à la fin : {reponses.change}",
          "Passage du texte : {reponses.exemple}",
          "Prochaine action : {reponses.action}",
          "Version en moins de 10 minutes : {reponses.action2}",
        ] },
    ],
  },

  intrigue: {
    titre: "Test d'une intrigue",
    resume: "Et si on la retirait ?",
    intro: "Nous allons retirer l'intrigue en pensée, pour voir ce qui reste.",
    etapes: [
      { id: "nom", type: "texte", suivant: "apporte",
        question: "De quelle intrigue parlons-nous ? Donnez-lui un nom court." },
      { id: "apporte", type: "texte", suivant: "disparait",
        question: "Imaginons qu'on retire {reponses.nom}. Qu'est-ce qu'elle apporte à l'histoire ?" },
      { id: "disparait", type: "texte", suivant: "depend",
        question: "Qu'est-ce qui disparaîtrait avec elle ?" },
      { id: "depend", type: "texte", suivant: "autrement",
        question: "Qu'est-ce qui, dans le reste de l'histoire, dépend de {reponses.nom} ?" },
      { id: "autrement", type: "choix",
        question: "{reponses.nom} pourrait-elle exister autrement, sous une autre forme ou ailleurs ?",
        options: [
          { label: "Oui", suivant: "comment" },
          { label: "Non", suivant: "decision" },
          { label: "Je ne sais pas", suivant: "decision" },
        ] },
      { id: "comment", type: "texte", suivant: "decision",
        question: "Sous quelle forme, selon vous ?" },
      { id: "decision", type: "choix", question: "Que décidez-vous pour {reponses.nom} ?",
        options: [
          { label: "Garder", suivant: "raison" },
          { label: "Transformer", suivant: "transfo" },
          { label: "Abandonner", suivant: "raison" },
        ] },
      { id: "transfo", type: "texte", suivant: "raison",
        question: "Qu'est-ce qui devrait changer dans {reponses.nom} ?" },
      { id: "raison", type: "texte", suivant: "action",
        question: "Quelle est la raison principale de ce choix ?" },
      ...ACTION_FINALE,
      { id: "recap", type: "recap", titre: "Test d'intrigue",
        lignes: [
          "Intrigue : {reponses.nom}",
          "Ce qu'elle apporte : {reponses.apporte}",
          "Ce qui disparaîtrait avec elle : {reponses.disparait}",
          "Ce qui en dépend : {reponses.depend}",
          "Peut exister autrement : {reponses.autrement}",
          "Sous quelle forme : {reponses.comment}",
          "Décision : {reponses.decision}",
          "À transformer : {reponses.transfo}",
          "Raison : {reponses.raison}",
          "Prochaine action : {reponses.action}",
          "Version en moins de 10 minutes : {reponses.action2}",
        ] },
    ],
  },

  fils: {
    titre: "Inventaire des fils narratifs",
    resume: "Pour la peur de l'incohérence",
    intro: "Nous allons lister les fils de l'histoire, puis les passer en revue un par un.",
    etapes: [
      { id: "fils", type: "liste", min: 1, suivant: "detail",
        question: "Listez les intrigues de l'histoire, une par une. Un nom court suffit pour chacune." },
      { id: "detail", type: "boucle", sur: "fils", suivant: "global",
        etapes: [
          { id: "debut", question: "{n}/{total} · Pour {element} : comment cela commence-t-il ?" },
          { id: "etat", question: "{n}/{total} · Pour {element} : où en est-on maintenant ?" },
          { id: "fin", question: "{n}/{total} · Pour {element} : comment cela doit-il se terminer ?" },
          { id: "liens", question: "{n}/{total} · Pour {element} : avec quels autres fils cela se croise-t-il ?" },
          { id: "conflit", question: "{n}/{total} · Pour {element} : voyez-vous une contradiction ou un trou ? Lequel ?" },
        ] },
      { id: "global", type: "texte", suivant: "action",
        question: "En regardant l'ensemble, quel fil vous inquiète le plus ? Pourquoi ?" },
      ...ACTION_FINALE,
      { id: "recap", type: "recap", titre: "Inventaire des fils narratifs",
        lignes: [
          { boucle: "detail", entete: "Fil : {element}",
            lignes: [
              "Début : {reponses.debut}",
              "État actuel : {reponses.etat}",
              "Fin prévue : {reponses.fin}",
              "Liens avec les autres : {reponses.liens}",
              "Conflit repéré : {reponses.conflit}",
            ] },
          "Fil le plus inquiétant : {reponses.global}",
          "Prochaine action : {reponses.action}",
          "Version en moins de 10 minutes : {reponses.action2}",
        ] },
    ],
  },

  scene: {
    titre: "Analyse d'une scène",
    resume: "Enjeu, désirs, changement",
    intro: "Nous allons regarder une scène sous cinq angles.",
    etapes: [
      { id: "nom", type: "texte", suivant: "enjeu",
        question: "De quelle scène s'agit-il ? Un nom court, ou sa place dans l'histoire." },
      { id: "enjeu", type: "texte", suivant: "veulent",
        question: "Dans {reponses.nom} : quel est l'enjeu ?" },
      { id: "veulent", type: "texte", suivant: "debut",
        question: "Qui veut quoi, dans cette scène ?" },
      { id: "debut", type: "texte", suivant: "findescene",
        question: "Au début de la scène, quelle est la situation ?" },
      { id: "findescene", type: "texte", suivant: "retenir",
        question: "À la fin de la scène, qu'est-ce qui a changé ?" },
      { id: "retenir", type: "texte", suivant: "action",
        question: "Que doit retenir le lecteur de cette scène ?" },
      ...ACTION_FINALE,
      { id: "recap", type: "recap", titre: "Analyse de scène",
        lignes: [
          "Scène : {reponses.nom}",
          "Enjeu : {reponses.enjeu}",
          "Qui veut quoi : {reponses.veulent}",
          "Situation au début : {reponses.debut}",
          "Ce qui a changé à la fin : {reponses.findescene}",
          "Ce que le lecteur doit retenir : {reponses.retenir}",
          "Prochaine action : {reponses.action}",
          "Version en moins de 10 minutes : {reponses.action2}",
        ] },
    ],
  },

  fin: {
    titre: "Préparer la fin",
    resume: "La question, ce qui est perdu et gagné, la dernière image",
    intro: "Nous allons cerner ce que la fin doit accomplir.",
    etapes: [
      { id: "perso", type: "texte", suivant: "question",
        question: "Quel personnage porte la fin de l'histoire ? Un nom suffit." },
      { id: "question", type: "texte", suivant: "perd",
        question: "Quelle question l'histoire pose-t-elle depuis le début ?" },
      { id: "perd", type: "texte", suivant: "gagne",
        question: "À la fin, que perd {reponses.perso} ?" },
      { id: "gagne", type: "texte", suivant: "image",
        question: "À la fin, que gagne {reponses.perso} ?" },
      { id: "image", type: "texte", suivant: "action",
        question: "Quelle est la dernière image que vous voulez laisser au lecteur ?" },
      ...ACTION_FINALE,
      { id: "recap", type: "recap", titre: "Préparation de la fin",
        lignes: [
          "Personnage : {reponses.perso}",
          "Question posée par l'histoire : {reponses.question}",
          "Ce qui est perdu : {reponses.perd}",
          "Ce qui est gagné : {reponses.gagne}",
          "Dernière image voulue : {reponses.image}",
          "Prochaine action : {reponses.action}",
          "Version en moins de 10 minutes : {reponses.action2}",
        ] },
    ],
  },

  envie: {
    titre: "Retrouver l'envie d'écrire",
    resume: "Quand l'écriture ne tente plus",
    intro: "Nous allons regarder ce qui a changé entre un bon moment d'écriture et aujourd'hui.",
    etapes: [
      { id: "derniere", type: "texte", suivant: "facile",
        question: "Quand avez-vous écrit avec plaisir pour la dernière fois ? Racontez ce moment." },
      { id: "facile", type: "texte", suivant: "differe",
        question: "Qu'est-ce qui rendait l'écriture facile ce jour-là ?" },
      { id: "differe", type: "texte", suivant: "arrete",
        question: "Qu'est-ce qui est différent aujourd'hui ?" },
      { id: "arrete", type: "texte", suivant: "minimum",
        question: "Au moment de vous asseoir pour écrire, qu'est-ce qui vous arrête ?" },
      { id: "minimum", type: "texte", suivant: "action",
        question: "Quelle quantité de travail vous semble faisable aujourd'hui, sans effort ?" },
      ...ACTION_FINALE,
      { id: "recap", type: "recap", titre: "Retrouver l'envie",
        lignes: [
          "Dernier bon moment : {reponses.derniere}",
          "Ce qui rendait cela facile : {reponses.facile}",
          "Ce qui est différent aujourd'hui : {reponses.differe}",
          "Ce qui arrête : {reponses.arrete}",
          "Quantité faisable : {reponses.minimum}",
          "Prochaine action : {reponses.action}",
          "Version en moins de 10 minutes : {reponses.action2}",
        ] },
    ],
  },

  pointer: {
    titre: "Cerner le blocage",
    resume: "Quand rien d'autre ne correspond",
    intro: "Nous allons situer le blocage avant de chercher à le résoudre.",
    etapes: [
      { id: "certain", type: "texte", suivant: "dernier",
        question: "Quelle est la dernière chose dont vous êtes certain, dans l'histoire ?" },
      { id: "dernier", type: "texte", suivant: "arret",
        question: "Quel est le dernier passage que vous avez écrit ?" },
      { id: "arret", type: "texte", suivant: "evite",
        question: "À quel moment avez-vous cessé d'avancer ? Que s'était-il passé juste avant ?" },
      { id: "evite", type: "texte", suivant: "pese",
        question: "Y a-t-il quelque chose que vous évitez d'écrire ? Quoi ?" },
      { id: "pese", type: "texte", suivant: "action",
        question: "Dans tout ce que vous venez de dire, quel détail pèse le plus ?" },
      ...ACTION_FINALE,
      { id: "recap", type: "recap", titre: "Le blocage, situé",
        lignes: [
          "Dernière certitude : {reponses.certain}",
          "Dernier passage écrit : {reponses.dernier}",
          "Moment de l'arrêt : {reponses.arret}",
          "Ce qui est évité : {reponses.evite}",
          "Ce qui pèse le plus : {reponses.pese}",
          "Prochaine action : {reponses.action}",
          "Version en moins de 10 minutes : {reponses.action2}",
        ] },
    ],
  },
};

if (typeof module !== "undefined") module.exports = { EXERCICES, ACCUEIL };
