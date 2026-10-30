# Audit flash

Pré-diagnostic énergétique en 5 minutes : un bâtiment sur la carte, quelques questions, un ordre de grandeur
de la consommation et des actions qui valent le coup.

> Pré-diagnostic : ordre de grandeur, pas un audit réglementaire.

- Site : https://emilemonteil46600-arch.github.io/Audit-/ (une fois GitHub Pages activé)
- HTML, CSS et JavaScript purs, sans installation. Chaque chiffre affiche sa source.
- Seule l'adresse du bâtiment part vers des services publics (IGN, BAN, BDNB, ADEME, Panoramax).

## Vérifier

```
node --test              # tests de calcul, de données et du site
node tests/navigateur.js # vérification dans Chromium (Playwright, à lancer à la main)
```
