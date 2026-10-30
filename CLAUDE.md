# CLAUDE.md — Audit flash

Ce fichier est lu automatiquement par Claude au début de chaque session sur ce dépôt.
Il remplace le contexte des conversations d'origine (30/10/2026) : tout ce qu'il faut savoir est ici.

## Qui est Émile, comment travailler avec lui

- Apprenti ingénieur thermicien en bureau d'études (audits énergétiques de bâtiments tertiaires, publics
  et logements, STD Pléiades).
- Il dicte souvent à la voix : messages avec fautes et mots coupés, à interpréter **sans le faire remarquer**.
- Réponses en **français**, tutoiement, directes, sans jargon, visuelles (tableaux, listes courtes), pas de pavés.
- Hypothèses marquées **(H)**, jamais cachées. Toutes les questions regroupées en **un seul message**,
  avec des options (et une recommandée).
- Il veut comprendre le **pourquoi** des calculs : pas de boîte noire, chaque chiffre doit pouvoir s'expliquer.
- Il aime qu'on avance : « choisis à ta guise et enquille » = décider avec des choix raisonnables, les signaler.

## Le projet

**Audit flash** : un pré-diagnostic énergétique en 5 minutes. On clique sur un bâtiment sur une carte (3D), on répond
à ce qu'on sait, et en quelques secondes on sait à peu près combien il consomme, ce qui vaut le coup et ce qui
ne vaut pas le coup (« la toiture oui, le vitrage non, déjà du double vitrage »).

- Dépôt : `emilemonteil46600-arch/Audit-` (public, nécessaire pour GitHub Pages gratuit).
- Site : https://emilemonteil46600-arch.github.io/Audit-/ (GitHub Pages activé par Émile le 30/10/2026, branche `main`).
- Site **séparé** de la boîte à outils thermique (`emilemonteil46600-arch/boite-a-outils-thermique`,
  https://emilemonteil46600-arch.github.io/boite-a-outils-thermique/), pour garder chaque site simple.

### Choix d'Émile

- Bâtiments : **tertiaire, public et logement**.
- Usages : **répondre vite à un client ou à un devis**, et **préparer une visite**.
- Utilisateurs : Émile, quelqu'un qui l'aide, peut-être un client → à terme un **mode « client »** simplifié.
- Sans réseau : pas tranché → **en ligne d'abord**, avec une saisie sans carte qui calcule hors ligne.
- **IA d'analyse des photos : pas pour l'instant.** Google Maps / Street View : **écarté**
  (clé payante, conditions qui interdisent d'extraire les images).
- Le 30/10/2026, Émile a demandé « une vraie interface, carte connectée, bâtiments en 3D, logo, design attractif,
  vrai moteur de calcul, très visuel (vignettes, graphiques), niveau ingénieur expérimenté » : c'est la V1 actuelle.

### Décisions du 30/10/2026 (Émile : « choisis tout à ta guise »)

| Question | Décision |
|---|---|
| Partage des calculs avec la boîte à outils | **Copier** ici ce qui est utile en notant la version d'origine (hash). Fait : style (`1a601bb`), prix des énergies et ratios de coûts d'exemple (`1a601bb`), mêmes identifiants d'énergie (`gaz`, `electricite`, `bois-granules`…). |
| Lien entre les deux sites | Plus tard, un bouton **« Approfondir »** qui passe le bâtiment à la boîte à outils. À faire **seulement** quand Émile l'aura validé (pour l'instant : un simple lien en pied de page). |
| Nom du dépôt « Audit- » | **Gardé** (Claude ne peut pas renommer). Liens internes relatifs : un renommage ne casse rien, mais l'adresse du site change (Pages ne redirige pas). Mettre à jour ce fichier et le README après un renommage. |

## Règles techniques (reprises de la boîte à outils)

- HTML, CSS et JavaScript **purs**. Pas de framework, pas de npm, pas d'étape de compilation.
  Exception acceptée : **MapLibre GL JS 4.7.1** chargé depuis unpkg avec une **version exacte**
  (test `tests/site.test.js`). La carte a besoin d'Internet ; **le calcul marche sans réseau**
  (bouton Exemple ou saisie sans carte, y compris en file://) : les données sont des `.js` qui remplissent
  une variable globale, pas des `.json` chargés par fetch.
- Structure :
  ```
  index.html                  l'outil : carte 3D + panneau (Bâtiment / Questions / Factures) + résultats ;
                              vues Diagnostic · Méthode · Données · Validation ; icônes SVG (symboles #i-…) et logo
  commun/style.css            style clair/sombre (variables CSS), repris de la boîte à outils + styles de l'outil
  commun/commun.js            objet FLASH : stockage préfixé « flash. », nombres FR, arrondis d'affichage,
                              téléchargement, copie pour Word, toast
  donnees/hypotheses.js       HYPOTHESES_FLASH : ~300 valeurs du moteur (U, rendements, ratios, prix, DJU, coûts,
                              durées de vie, incertitudes…) avec source / date / statut ; listes des choix ; zones par département ;
                              BATIMENTS_TYPES (3 bâtiments FICTIFS : exemple, classement des valeurs sans bâtiment choisi)
  donnees/sources.js          VALEURS_FLASH : constantes de la carte (hauteur d'étage, rayons, tolérance mitoyenneté…)
  donnees/services.js         SERVICES_FLASH : services publics du test de faisabilité, doc, conditions (H)
  carte/calcul.js             fonctions pures : surface, périmètre, mitoyenneté, emprise, lecture BD TOPO / BDNB / DPE /
                              BAN / Panoramax, adresses des services (seule l'adresse ou un point part)
  carte/interface.js          carte MapLibre (fonds Plan IGN / photo IGN / OSM, bâtiments 3D, clic, recherche
                              d'adresse) + appels aux services, AUCUN calcul → window.CarteFlash
  moteur/calcul.js            le moteur (fonctions pures) : compléter les réponses, déperditions, consommations,
                              EP / CO₂ / €, étiquette, fourchette, calage (+ correction climatique), actions, bouquets, rentabilité
                              → MoteurCalcul.diagnostiquer ; influences (valeurs qui pèsent le plus) ; evaluerCas / statistiquesCas
  moteur/graphiques.js        dessins HTML/SVG (anneau, barres, tornade, cascade, étiquette, jauge, trésorerie, nuage), AUCUN calcul
  moteur/interface.js         questions en tuiles, vignettes, résultats, fiche Word, onglets Données (priorités, « je valide »)
                              et Validation (cas de référence, export / import JSON), état, AUCUN calcul
  faisabilite/                page de test des services publics depuis le navigateur (utilise carte/calcul.js)
  tests/*.test.js             tests Node (node --test)
  tests/navigateur.js         vérification Chromium (Playwright), lancée à la main, services SIMULÉS
  .github/workflows/          lance node --test à chaque PR et à chaque mise à jour de main
  ```
- Logique de calcul dans des fichiers `calcul.js` : fonctions pures, courtes, noms et commentaires en français,
  **formule écrite en commentaire** en haut du fichier avec un exemple refait à la main, export `module.exports`
  pour les tests Node. Affichage dans `interface.js` / `graphiques.js`, **aucun calcul** (seulement des mises en forme).
- **Aucun chiffre sans source** : chaque valeur a une source, une date et un statut `exemple` / `valide` ;
  l'outil affiche combien de valeurs d'exemple sont utilisées. Fourchettes plutôt que fausse précision
  (on arrondit l'**affichage**, jamais le calcul : `FLASH.nombre`, `FLASH.significatif`, `FLASH.arrondi`).
- Une valeur inconnue appelée par le moteur (`D.v('…')`) **lève une erreur** : les tests attrapent les fautes de frappe.
- Tout en **français** : interface (tutoiement), commentaires, messages de commit. Nombres au format français.
- Mobile : aucune barre de défilement horizontale à **390 px**. Thème clair et sombre (la carte aussi).

## Le moteur en bref (détail dans `moteur/calcul.js` et l'onglet Méthode)

1. **Compléter** : chaque réponse a une origine `saisie` > `bdnb` / `dpe` / `carte` > `deduite`. Ce qui manque est
   déduit de la période (10 périodes 3CL) et de l'usage (8 usages). « Si inconnu » = **état le plus probable
   aujourd'hui** pour l'époque (une partie du parc a été isolée / a changé ses fenêtres), pas l'état d'origine (H).
2. **Déperditions** U × A + ψ × L + 0,34 × n × V ; façades = périmètre **exposé** (mitoyenneté lue sur la carte) × hauteur ;
   terre-plein selon NF EN ISO 13370 ; vide sanitaire / sous-sol avec un coefficient b.
3. **Consommations** : degrés-jours (DJU base 18 de la zone) × intermittence × régulation / rendement (ou COP) ;
   ECS 56 L/j/pers. à 40 °C en logement, ratios en tertiaire ; éclairage, auxiliaires, autres usages, froid.
4. **EP, CO₂, €** (gaz : kWh PCS = 1,11 × PCI) ; étiquette indicative logement (double seuil).
5. **Fourchette** : sensibilité de 12 facteurs, cumul en quadrature δ = √(Σ Δᵢ²) ; fiabilité bonne ≤ 15 %, moyenne ≤ 30 %.
   Le graphique « ce qui pèse dans la fourchette » donne la liste « pour préparer la visite ».
6. **Calage** : k = facture / calcul par énergie ; chaque usage garde son k même si une action change son énergie.
   **Correction climatique** (facultative) : avec les DJU de l'année des factures, k = facture / calcul(DJU de l'année),
   puis le résultat est affiché pour une année normale.
7. **Actions** (14, en 9 familles) : chacune a un état `ok` / `deja` (« déjà du double vitrage récent ») / `sansObjet`,
   un coût TTC (ratios × quantités × (1 + frais) × (1 + TVA 5,5 % logement ou 20 %)), TRB, TRA, VAN, verdict
   ✅ TRA ≤ ½ durée de vie / 🟠 ≤ durée de vie / ❌. Dans une famille (ex. ITE / ITI), la meilleure VAN est retenue.
8. **Bouquets** (ce qui vaut le coup / rentable + à discuter / rénovation complète), calculés **dans l'ordre**
   (enveloppe → ventilation → régulation → chauffage → ECS → éclairage) ; la PAC est dimensionnée après l'isolation.
9. **Valeurs qui pèsent le plus** (`influences`) : chaque valeur d'exemple poussée de + 10 % → élasticités sur la
   consommation, la facture et les temps de retour des actions ✅ / 🟠, + 1 par verdict qui change. Onglet Données :
   « À vérifier en priorité » (pour le bâtiment, sinon sur les 3 bâtiments types) avec « Je valide ».
10. **Validation** (`evaluerCas`) : un cas de référence = un bâtiment + ses factures ; on compare le calcul **sans calage**
   aux factures → écart, biais moyen, écart moyen, part des factures dans la fourchette, nuage calcul / factures.

## Confidentialité — IMPORTANT

- Le dépôt est **public**. Jamais de vrais prix, de données clients ni de noms de dossiers de l'employeur d'Émile.
- Seule l'**adresse** (ou un point) part vers des services publics, **jamais le nom du client**.
- **Stockage navigateur** : les deux sites sont sur la même origine `emilemonteil46600-arch.github.io`, donc ils
  **partagent le même localStorage**. Toutes les clés de ce site passent par `FLASH.cle()` et commencent par
  **`flash.`** : `flash.etat.v1` (bâtiment, réponses, factures, DJU des factures), `flash.donnees.v1` (valeurs modifiées
  dans Données), `flash.validees.v1` (valeurs d'exemple validées par Émile : { id: date }), `flash.cas.v1` (cas de
  référence : réponses + factures, **sans adresse** ; nom libre, à donner sans nom de client).
  Ne **jamais** écrire une clé `bao.*` (refusé par `FLASH.cle`, vérifié par les tests), sauf plus tard via le bouton
  « Approfondir » explicitement validé par Émile. **Ne pas renommer ces clés sans migration.**

## Mise en ligne

- Travail sur une branche, commit, push, PR ; **fusion seulement quand Émile l'a validé** et que les vérifications
  passent. Pages publie `main` (racine) 1 à 2 minutes après chaque fusion.

## Vérifications avant de publier

1. `node --test` à la racine (49 tests) : syntaxe, scripts des pages, bandeau pré-diagnostic, versions de CDN fixées,
   pas de clé `bao.*`, stockage préfixé, valeurs sourcées (et chaque choix a ses valeurs), 96 départements,
   et les exemples :
   - carte : carré de 0,0001° à 45° → **87,4 m²** ; 240 m² × 3 niveaux (9,5 m / 3 m) = **720 m²** ;
     deux maisons 10 × 10 collées → **10 m mitoyens, 30 m exposés** ;
   - moteur, maison de plain-pied de 1970 à Toulouse (10 × 10 m, 3 m, chaudière gaz ancienne, reste déduit) :
     H = **508,6 W/K**, besoin **21 422 kWh**, gaz **29 753 + 2 393 kWh**, élec **2 800 kWh**, facture **≈ 4 541 €/an**,
     **F / F** (411 kWhEP/m², 92 kgCO₂/m²), puissance **12,2 kW** ; combles : **≈ 614 €/an**, coût 2 901 – 5 222 € TTC, ✅ ;
     fenêtres anciennes ❌ ; « déjà du double vitrage récent » → déjà fait ; bouquet non additif, PAC plus petite après isolation ;
     calage gaz 30 000 / élec 3 000 kWh → 3 960 €/an, fourchette ≤ 10 % ;
     poids du prix du gaz sur la facture ≈ **0,86** (3 925 / 4 541), des DJU sur la consommation ≈ **0,85** (29 753 / 34 946) ;
     factures d'une année à 2 340 DJU : k gaz = 30 000 / ((29 753 × 1,2 + 2 393) × 1,11) ;
     cas de référence exact → écart 0 et « dedans » ; factures gaz 20 000 → écart + 78 %, « dehors ».
2. `node tests/navigateur.js` (Playwright ; `MAPLIBRE_LOCAL=…/maplibre-gl/dist` si unpkg est inaccessible) :
   parcours complet avec services simulés (adresse → bâtiment 3D → mitoyenneté 19 % → BDNB → question vitrage →
   factures → DJU de l'année → garder comme cas → bouquet → fiche Word → Données (priorités, « Je valide », modification)
   → Méthode → 2e cas → Validation (stats, nuage, export JSON, rouvrir un cas)), vues bien masquées, mode sans réseau,
   390 px clair/sombre (Diagnostic, Données, Méthode, Validation).
3. Si un exemple de calcul change, mettre à jour **en même temps** le commentaire du `calcul.js`, l'onglet Méthode
   (index.html), le test et ce fichier.

## État au 30/10/2026

| Partie | État |
|---|---|
| Test de faisabilité (`faisabilite/`) | Fait. **Émile ne l'a pas encore lancé** : les adresses BDNB et le filtre géographique ADEME restent des hypothèses (H). |
| Carte | **V1** : recherche d'adresse (BAN Géoplateforme, secours api-adresse), Plan IGN / photo IGN / OSM, bâtiments BD TOPO en 3D dans un rayon de 150 m, clic = choix, mitoyenneté tracée, cadrage auto, BDNB + DPE + Panoramax en complément, état des sources sous la carte. |
| Moteur | **V1** complet (voir plus haut), 300 valeurs d'exemple sourcées « de mémoire » (réseau fermé pour Claude) : **à vérifier** (3CL, DPE, DJU, coefficients). |
| Interface | **V1** : résumé collant, vignettes avec origine, questions en tuiles (« supposé » en pointillés), factures + k + DJU de l'année, 6 indicateurs, 4 graphiques, préconisations ✅/🟠/❌ avec jauge et trésorerie, bouquets + cascade + étiquette avant/après, liste de visite, fiche Word (téléchargement .doc + copie), onglets Méthode, Données et Validation. |
| Fiabiliser (30/10/2026, suite) | **Fait** : classement des valeurs qui pèsent le plus + « Je valide » ; banc de validation (cas de référence, biais, nuage, export / import) ; correction climatique des factures. Le haut du classement pour la maison type : rendement de la chaudière actuelle, effet de la régulation, rendement condensation, prix et PCS/PCI du gaz, U des murs par défaut. **Émile n'a pas encore pu fusionner (pas d'accès à GitHub ce jour-là)** : tout est sur la PR #2. |
| À faire ensuite (au choix d'Émile) | 1) fusionner la PR #2, lancer le test de faisabilité et l'outil sur de vraies adresses ; 2) saisir 3 à 5 cas de référence (anciens audits, sans nom) et valider le haut de « À vérifier en priorité » ; 3) bouton « Approfondir » vers la boîte à outils ; 4) mode client simplifié ; 5) photovoltaïque, aides (CEE, MaPrimeRénov'), DJU par station ; 6) passer à MapLibre 6 (6.16.0 publiée le 25/10/2026, guide de migration à lire). |
