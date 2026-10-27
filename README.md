# PocketMuse

L'outil vous souffle quelques consignes, vous écrivez un tout petit texte. Sans enjeu, juste pour le plaisir et la satisfaction de terminer quelque chose.

## Pour quoi faire ?

J'avais besoin d'un outil pour me remettre à écrire, juste pour le plaisir d'utiliser mon imagination.
J'ai toujours eu du mal à terminer des longs textes, et je me suis rendu compte que quelques contraintes ainsi qu'un objectif atteignable c'est tout ce dont j'avais besoin.
D'autant que c'est toujours satisfaisant de terminer quelque chose.

## Comment ça marche

1. Vous choisissez une longueur (un drabble de 100 mots, ou plus) et un temps.
2. L'outil tire trois à cinq éléments. Ce sont des invitations, pas des règles : vous pouvez les changer, les retirer, en ajouter, ou les détourner.
3. Vous écrivez, avec un compteur de mots et un minuteur. Dépasser le temps n'est pas une faute.
4. Vous terminez, vous relisez, et vous gardez le texte (ou pas) en le téléchargeant.

Tout se passe dans votre navigateur. Aucun texte n'est envoyé ni enregistré : seuls le thème (clair ou sombre) et les derniers éléments tirés sont mémorisés, pour éviter les répétitions.

## Utiliser

Ouvrez `index.html` dans un navigateur : il n'y a rien à installer, et ça fonctionne hors ligne.

## Personnaliser

Toutes les tables de tirage sont dans `data.js`. Ajoutez, retirez ou remplacez des lignes selon vos besoins ou vos envies.

```js
lieu: {
  etiquette: "Lieu",
  table: [
    "Une laverie automatique à trois heures du matin",
    "Votre propre idée ici",
  ],
},
```

## Fichiers

| Fichier | Rôle |
| --- | --- |
| `index.html` | les trois écrans : paramètres, écriture, résultat |
| `style.css` | l'apparence, en noir et blanc, avec un mode sombre |
| `app.js` | la logique : tirage, compteur, minuteur, export |
| `data.js` | les tables de tirage |

## Licence

[MIT](LICENSE)
