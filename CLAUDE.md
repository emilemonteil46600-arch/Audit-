# CLAUDE.md — Audit flash

Ce fichier est lu automatiquement par Claude au début de chaque session sur ce dépôt.
Il remplace le contexte de la conversation d'origine (30/10/2026) : tout ce qu'il faut savoir est ici.

## Qui est Émile, comment travailler avec lui

- Apprenti ingénieur thermicien en bureau d'études (audits énergétiques de bâtiments tertiaires, publics
  et logements, STD Pléiades).
- Il dicte souvent à la voix : messages avec fautes et mots coupés, à interpréter **sans le faire remarquer**.
- Réponses en **français**, tutoiement, directes, sans jargon, visuelles (tableaux, listes courtes), pas de pavés.
- Hypothèses marquées **(H)**, jamais cachées. Toutes les questions regroupées en **un seul message**,
  avec des options (et une recommandée).
- Il veut comprendre le **pourquoi** des calculs : pas de boîte noire, chaque chiffre doit pouvoir s'expliquer.

## Le projet

**Audit flash** : un pré-diagnostic énergétique en 5 minutes. On clique sur un bâtiment sur une carte, on répond
à 6 à 10 questions, et en quelques secondes on sait à peu près combien il consomme, ce qui vaut le coup et ce qui
ne vaut pas le coup (« la toiture oui, le vitrage non, déjà du double vitrage »).

- Dépôt : `emilemonteil46600-arch/Audit-` (public, nécessaire pour GitHub Pages gratuit).
- Site (une fois GitHub Pages activé) : https://emilemonteil46600-arch.github.io/Audit-/
- Site **séparé** de la boîte à outils thermique (`emilemonteil46600-arch/boite-a-outils-thermique`,
  https://emilemonteil46600-arch.github.io/boite-a-outils-thermique/), pour garder chaque site simple.

### Choix d'Émile

- Bâtiments : **tertiaire, public et logement**.
- Usages : **répondre vite à un client ou à un devis**, et **préparer une visite**.
- Utilisateurs : Émile, quelqu'un qui l'aide, peut-être un client → à terme un **mode « client »** simplifié.
- Sans réseau : pas tranché → **en ligne d'abord**, avec un mode « saisie sans carte » pour le calcul.
- **IA d'analyse des photos : pas pour l'instant.** Google Maps / Street View : **écarté**
  (clé payante, conditions qui interdisent d'extraire les images).

### Ce que l'outil devra faire (à terme)

- **Carte** : adresse ou clic → contour du bâtiment, surface approximative (surface au sol × niveaux,
  hauteur / ~3 m (H)), bâtiment en 3D si possible. Pistes : MapLibre GL JS depuis un CDN avec version fixée,
  fond IGN Géoplateforme ou OpenStreetMap, hauteurs IGN BD TOPO ou BDNB, photo aérienne IGN, photos de rue Panoramax.
- **Pré-remplissage** : Base Adresse Nationale, BDNB du CSTB (année, usage, matériaux, énergie), DPE de l'ADEME.
- **Questions rapides** : type de mur, de vitrage, de chauffage, de rafraîchissement, d'ECS, nombre d'occupants…
- **Calcul même s'il manque des paramètres** : chaque valeur manquante est déduite de l'année et de l'usage
  (logement : valeurs par défaut de la méthode DPE 3CL ; tertiaire : ratios par usage à sourcer). Chaque valeur
  affiche son **origine** (saisie / carte-BDNB / déduite de l'année). Plus il manque d'infos, plus la fourchette
  s'élargit, avec un **indicateur de fiabilité**.
- **Avec ou sans factures** : sans factures, une estimation en fourchette ; avec factures, le modèle est **calé**
  dessus (coefficient facture / calcul) et les gains sont calculés sur le modèle calé.
- **Préconisations** : gain de chaque action et de chaque bouquet (gains non additifs : calcul dans l'ordre), coût,
  temps de retour **brut et actualisé** (inflation de l'énergie + taux d'actualisation (H), modifiables),
  comparaison à la durée de vie → ✅ à faire / 🟠 à discuter / ❌ pas rentable.
- **Sortie** : fiche d'une page pour Word, et un bouton « Approfondir » vers la boîte à outils.
- Toujours afficher **« pré-diagnostic, ordre de grandeur, pas un audit réglementaire »** (bandeau en haut de
  chaque page, vérifié par `tests/site.test.js`).

### Ordre décidé

1. **La carte** : test de faisabilité des données publiques depuis une page web (**fait, à lancer par Émile**),
   puis carte 2D + clic + surface + pré-remplissage.
2. Le moteur de calcul.
3. La 3D et les photos.
4. Le mode client.

### Décisions du 30/10/2026 (Émile : « choisis tout à ta guise »)

| Question | Décision |
|---|---|
| Partage des calculs avec la boîte à outils | **Copier** ici les quelques fichiers utiles (W/K → kWh → €, prix des énergies, ratios) en notant leur version d'origine (hash du commit). Déjà fait pour le style : `commun/style.css` vient de la version `1a601bb`. |
| Lien entre les deux sites | Plus tard, un bouton **« Approfondir »** qui passe le bâtiment à la boîte à outils. À faire **seulement** quand Émile l'aura validé. |
| Nom du dépôt « Audit- » | **Gardé pour l'instant** (Claude ne peut pas renommer). Émile peut le renommer (ex. `audit-flash`) quand il veut : tous les liens internes sont relatifs, rien ne casse, mais l'adresse du site change (GitHub Pages ne redirige pas l'ancienne). Mettre à jour ce fichier et le README après un renommage. |

## Règles techniques (reprises de la boîte à outils)

- HTML, CSS et JavaScript **purs**. Pas de framework, pas de npm, pas d'étape de compilation.
  Exception acceptée : la bibliothèque de carte chargée depuis un CDN avec une **version exacte**
  (test `tests/site.test.js`). La carte a besoin d'Internet ; la **partie calcul doit rester utilisable sans réseau**
  (y compris en ouvrant le fichier directement, file://) : les données sont des fichiers `.js` qui remplissent une
  variable globale, pas des `.json` chargés par fetch.
- Structure :
  ```
  index.html                  accueil
  commun/style.css            style (couleurs clair/sombre via prefers-color-scheme), repris de la boîte à outils
  commun/commun.js            objet global FLASH : stockage préfixé « flash. », nombres FR, échappement, toast
  donnees/sources.js          VALEURS_FLASH : chaque valeur avec source, date, statut exemple / valide
  donnees/services.js         SERVICES_FLASH : services publics testés, doc, conditions (H)
  faisabilite/index.html      page du test de faisabilité
  faisabilite/calcul.js       fonctions pures (surface, niveaux, verdict, adresses des services)
  faisabilite/interface.js    appels réseau et affichage, AUCUN calcul
  tests/*.test.js             tests Node (node --test)
  tests/navigateur.js         vérification Chromium (Playwright), lancée à la main, réponses simulées
  .github/workflows/          lance node --test à chaque PR et à chaque mise à jour de main
  ```
- Logique de calcul dans des fichiers `calcul.js` : fonctions pures, courtes, noms et commentaires en français,
  **formule écrite en commentaire** en haut du fichier avec un exemple refait à la main, export `module.exports`
  pour les tests Node. Affichage dans `interface.js`, **aucun calcul**.
- **Aucun chiffre sans source** : chaque valeur a une source, une date et un statut `exemple` / `valide` ;
  avertissement tant qu'une valeur utilisée est en exemple. Fourchettes plutôt que fausse précision
  (on arrondit l'**affichage**, jamais le calcul : `FLASH.arrondi`, `FLASH.nombre`).
- Tout en **français** : interface (tutoiement), commentaires, messages de commit. Nombres au format français.
- Mobile : aucune barre de défilement horizontale à **390 px**. Thème clair et sombre.

## Confidentialité — IMPORTANT

- Le dépôt est **public**. Jamais de vrais prix, de données clients ni de noms de dossiers de l'employeur d'Émile.
- Seule l'**adresse** (ou un point) part vers des services publics, **jamais le nom du client**.
- **Stockage navigateur** : les deux sites sont sur la même origine `emilemonteil46600-arch.github.io`, donc ils
  **partagent le même localStorage** (le stockage dépend de l'adresse du site, pas du dossier). Toutes les clés de
  ce site passent par `FLASH.cle()` et commencent par **`flash.`** ; ne **jamais** écrire une clé `bao.*`
  de la boîte à outils (refusé par `FLASH.cle`, vérifié par les tests), sauf plus tard via le bouton
  « Approfondir » explicitement validé par Émile.

## Mise en ligne

- Travail sur une branche, commit, push, PR ; **fusion seulement quand Émile l'a validé** et que les vérifications
  passent.
- GitHub Pages est à activer **par Émile** : Settings › Pages › Source « Deploy from a branch » › branche `main`,
  dossier `/ (root)` › Save. Le site arrive 1 à 2 minutes après, puis à chaque fusion sur `main`.

## Vérifications avant de publier

1. `node --test` à la racine : syntaxe, scripts des pages existants, bandeau pré-diagnostic, versions de CDN fixées,
   pas de clé `bao.*`, stockage préfixé, valeurs sourcées, exemples de `faisabilite/calcul.js` :
   - carré de 0,0001° à 45° de latitude → **87,4 m²** ;
   - 20 m × 12 m = 240 m², hauteur 9,5 m, étage 3 m (H) → **3 niveaux, 720 m²** ;
   - le nombre d'étages BD TOPO passe avant la hauteur.
2. `node tests/navigateur.js` : pas d'erreur console, pas de défilement horizontal à 390 px (clair et sombre),
   déroulé du test de faisabilité avec des réponses **simulées** (ça teste l'affichage, pas les services).
3. Si un exemple de calcul change, mettre à jour **en même temps** le commentaire de `calcul.js`, le test et ce fichier.

## Test de faisabilité — état au 30/10/2026

- La page `faisabilite/` interroge depuis le navigateur : géocodage BAN (Géoplateforme + ancienne API), tuiles
  Plan IGN et photo aérienne IGN (WMTS), tuile OpenStreetMap, style OpenFreeMap, MapLibre 4.7.1 (unpkg),
  bâtiments BD TOPO (WFS, avec hauteur), BDNB (rectangle, puis adresse BAN → groupe de bâtiments),
  DPE ADEME logement et tertiaire (liste des jeux « dpe » puis recherche autour du point), photos Panoramax.
  Elle affiche ✅ / 🟠 / ❌, la surface approximative, le bâtiment en 3D sur la carte, et un bouton
  « Copier le résultat pour Claude ».
- Si une lecture échoue, elle réessaie en mode `no-cors` pour distinguer « bloqué par CORS » de « ne répond pas ».
- **Rien n'a pu être vérifié depuis l'environnement de Claude** : le réseau de la session bloquait tous ces services
  et leurs pages de documentation. Les adresses des services (surtout BDNB et le filtre géographique de l'ADEME)
  et les conditions d'utilisation de `donnees/services.js` sont donc des **hypothèses (H)** jusqu'au premier
  lancement par Émile. **Prochaine étape** : Émile lance la page en ligne, colle le résultat, on corrige
  les adresses qui ne marchent pas, puis on construit la vraie carte.
- MapLibre : version **4.7.1** fixée (connue, stable). La dernière publiée est la 6.16.0 (25/10/2026, vue sur
  les versions GitHub de MapLibre) ; passage à la 6 à étudier (guide de migration) avant la vraie carte.
