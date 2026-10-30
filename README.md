# Audit flash

Pré-diagnostic énergétique en 5 minutes : un bâtiment sur la carte en 3D, quelques questions, la consommation
en fourchette et les travaux qui valent le coup (✅ à faire / 🟠 à discuter / ❌ pas rentable).

> Pré-diagnostic : ordre de grandeur, pas un audit réglementaire.

- Site : https://emilemonteil46600-arch.github.io/Audit-/
- HTML, CSS et JavaScript purs, sans installation. Chaque chiffre affiche son origine et sa source (onglet Données).
- Seule l'adresse du bâtiment part vers des services publics (IGN, BAN, BDNB, ADEME, Panoramax).
- Le calcul marche sans réseau (bouton « Exemple » ou saisie sans carte).
- Onglet **Validation** : compare le moteur à des bâtiments dont tu connais les factures (biais, fourchette).

## Vérifier

```
node --test              # tests de calcul, de données et du site
node tests/navigateur.js # vérification dans Chromium (Playwright, à lancer à la main)
```
