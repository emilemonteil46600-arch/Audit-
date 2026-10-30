/* ==========================================================
   Audit flash — HYPOTHÈSES DU MOTEUR DE CALCUL
   ----------------------------------------------------------
   Règle : aucun chiffre sans source. Chaque valeur a un identifiant,
   un libellé, une unité, une source, une date et un statut :
     « exemple » = ordre de grandeur à confirmer (avertissement affiché),
     « valide »  = valeur physique ou réglementaire sûre.
   Tu peux modifier chaque valeur dans l'onglet Données : ta valeur est
   gardée dans ton navigateur (clé flash.donnees.v1), jamais ici.

   ⚠ Le 30/10/2026, Claude n'avait pas accès aux textes officiels
   (réseau fermé) : les valeurs « 3CL », « DPE » et les ratios sont
   repris de mémoire, d'où le statut « exemple ». À vérifier.
   ========================================================== */
(function (global) {
  'use strict';

  const DATE = '2026-10-30';

  const SOURCES = {
    tcl: "Esprit des valeurs par défaut de la méthode 3CL-DPE (arrêté du 31 mars 2021 modifié). Repris de mémoire, à vérifier dans l'annexe (H)",
    dpe: 'Arrêté du 31 mars 2021 relatif au DPE (logement), modifié. Repris de mémoire, à vérifier (H)',
    physique: 'Physique : ρ·c de l’air ≈ 1,2 kg/m³ × 1 005 J/(kg·K) / 3 600 ; c de l’eau = 4 186 J/(kg·K) / 3 600',
    iso13370: 'NF EN ISO 13370 (transmission par le sol) et NF EN ISO 6946 (Rsi, Rse)',
    meteo: "Ordre de grandeur des DJU base 18 °C (normales 1991-2020) d'une ville représentative de la zone. À remplacer par la station du projet (H)",
    tbase: 'Ordre de grandeur de l’annexe nationale de NF EN 12831 pour une altitude < 200 m. À vérifier selon le département et l’altitude (H)',
    ratios: "Ordre de grandeur courant (H), à sourcer (CEREN, OID, ADEME) puis à remplacer par tes retours d'audits",
    outil: "Convention de l'outil (H), modifiable",
    insee: 'INSEE, recensement : environ 2,2 personnes par ménage en France (ordre de grandeur, à vérifier)',
    bao: 'Repris de la boîte à outils thermique (donnees/, version 1a601bb du 30/10/2026) : exemple indicatif, à remplacer',
    code: "Code de l'énergie, art. R241-26 : 19 °C en moyenne au maximum pour le chauffage",
    cgi: 'Code général des impôts, art. 278-0 bis A : TVA à 5,5 % pour la rénovation énergétique des logements de plus de 2 ans',
    ep2026: "Coefficient d'énergie primaire de l'électricité : 1,9 depuis le 1er janvier 2026 (auparavant 2,3). À vérifier (H)"
  };

  const VALEURS = [];
  // Ajoute un groupe de valeurs : lignes = [[id, libellé, valeur, unité], …]
  function groupe(nom, source, statut, lignes) {
    lignes.forEach(function (l) {
      VALEURS.push({ id: l[0], groupe: nom, libelle: l[1], valeur: l[2], unite: l[3], source: source, date: DATE, statut: statut });
    });
  }

  /* ---------- Listes (pas des chiffres : les noms des choix) ---------- */

  const PERIODES = [
    { id: 'av1948', nom: 'avant 1948', fin: 1947 },
    { id: '1948-1974', nom: '1948 – 1974', fin: 1974 },
    { id: '1975-1977', nom: '1975 – 1977', fin: 1977 },
    { id: '1978-1982', nom: '1978 – 1982', fin: 1982 },
    { id: '1983-1988', nom: '1983 – 1988', fin: 1988 },
    { id: '1989-2000', nom: '1989 – 2000', fin: 2000 },
    { id: '2001-2005', nom: '2001 – 2005', fin: 2005 },
    { id: '2006-2012', nom: '2006 – 2012', fin: 2012 },
    { id: '2013-2021', nom: '2013 – 2021', fin: 2021 },
    { id: 'ap2021', nom: 'après 2021', fin: Infinity }
  ];

  const USAGES = [
    { id: 'logement-individuel', nom: 'Maison', famille: 'logement', icone: 'maison' },
    { id: 'logement-collectif', nom: 'Logements collectifs', famille: 'logement', icone: 'immeuble' },
    { id: 'bureaux', nom: 'Bureaux', famille: 'tertiaire', icone: 'bureau' },
    { id: 'enseignement', nom: 'Enseignement', famille: 'tertiaire', icone: 'ecole' },
    { id: 'commerce', nom: 'Commerce', famille: 'tertiaire', icone: 'commerce' },
    { id: 'sante', nom: 'Santé, EHPAD', famille: 'tertiaire', icone: 'sante' },
    { id: 'sport', nom: 'Sport', famille: 'tertiaire', icone: 'sport' },
    { id: 'culture', nom: 'Mairie, salle, culture', famille: 'tertiaire', icone: 'salle' }
  ];

  const ENERGIES = [
    { id: 'electricite', nom: 'Électricité' },
    { id: 'gaz', nom: 'Gaz naturel' },
    { id: 'fioul', nom: 'Fioul' },
    { id: 'propane', nom: 'Propane' },
    { id: 'bois-buches', nom: 'Bois (bûches)' },
    { id: 'bois-granules', nom: 'Bois (granulés)' },
    { id: 'reseau-chaleur', nom: 'Réseau de chaleur' }
  ];

  // Les choix des questions. « aide » : ce qu'on regarde sur place pour répondre.
  const CHOIX = {
    murs: [
      { id: 'non-isole', nom: 'Non isolés', aide: 'Mur plein, pas de doublage' },
      { id: 'isole-ancien', nom: 'Isolés, ancien', aide: 'Doublage 4 à 8 cm, avant 2000' },
      { id: 'isole-recent', nom: 'Isolés récents', aide: 'Doublage ≥ 10 cm' },
      { id: 'ite', nom: 'Isolés par l’extérieur', aide: 'Enduit ou bardage sur isolant' }
    ],
    toiture: [
      { id: 'combles-non-isoles', nom: 'Combles non isolés', type: 'combles' },
      { id: 'combles-isoles-ancien', nom: 'Combles, isolation ancienne', type: 'combles', aide: '≈ 10 cm' },
      { id: 'combles-isoles-recent', nom: 'Combles bien isolés', type: 'combles', aide: '≥ 25 cm' },
      { id: 'terrasse-non-isolee', nom: 'Terrasse non isolée', type: 'terrasse' },
      { id: 'terrasse-isolee', nom: 'Terrasse isolée', type: 'terrasse' }
    ],
    plancher: [
      { id: 'terre-plein', nom: 'Sur terre-plein' },
      { id: 'vide-sanitaire', nom: 'Sur vide sanitaire' },
      { id: 'sous-sol', nom: 'Sur sous-sol non chauffé' },
      { id: 'isole', nom: 'Déjà isolé' }
    ],
    vitrage: [
      { id: 'simple', nom: 'Simple vitrage' },
      { id: 'double-ancien', nom: 'Double ancien', aide: 'Avant 2000, lame d’air fine' },
      { id: 'double-recent', nom: 'Double récent', aide: '4/16/4 argon' },
      { id: 'triple', nom: 'Triple vitrage' }
    ],
    chauffage: [
      { id: 'gaz-ancienne', nom: 'Chaudière gaz ancienne', energie: 'gaz', hydraulique: true },
      { id: 'gaz-condensation', nom: 'Chaudière gaz condensation', energie: 'gaz', hydraulique: true },
      { id: 'fioul', nom: 'Chaudière fioul', energie: 'fioul', hydraulique: true },
      { id: 'propane', nom: 'Chaudière propane', energie: 'propane', hydraulique: true },
      { id: 'electrique', nom: 'Radiateurs électriques', energie: 'electricite', hydraulique: false },
      { id: 'pac-air-eau', nom: 'PAC air/eau', energie: 'electricite', hydraulique: true },
      { id: 'pac-air-air', nom: 'PAC air/air, clim réversible', energie: 'electricite', hydraulique: false },
      { id: 'bois', nom: 'Bois (bûches)', energie: 'bois-buches', hydraulique: true },
      { id: 'granules', nom: 'Chaudière granulés', energie: 'bois-granules', hydraulique: true },
      { id: 'reseau', nom: 'Réseau de chaleur', energie: 'reseau-chaleur', hydraulique: true }
    ],
    ecs: [
      { id: 'avec-chauffage', nom: 'Avec le chauffage' },
      { id: 'ballon-electrique', nom: 'Ballon électrique', energie: 'electricite' },
      { id: 'thermodynamique', nom: 'Ballon thermodynamique', energie: 'electricite' },
      { id: 'gaz-instantane', nom: 'Chauffe-eau gaz', energie: 'gaz' }
    ],
    ventilation: [
      { id: 'naturelle', nom: 'Naturelle', aide: 'Grilles, conduits, fenêtres' },
      { id: 'vmc-auto', nom: 'VMC autoréglable' },
      { id: 'vmc-hygro', nom: 'VMC hygroréglable' },
      { id: 'double-flux', nom: 'Double flux' }
    ],
    regulation: [
      { id: 'aucune', nom: 'Aucune', aide: 'Pas de thermostat ni de programmation' },
      { id: 'basique', nom: 'Thermostat', aide: 'Thermostat d’ambiance' },
      { id: 'performante', nom: 'Programmation par zone', aide: 'Robinets thermostatiques, GTB' }
    ],
    climatisation: [
      { id: 'aucune', nom: 'Aucune' },
      { id: 'partielle', nom: 'Partielle' },
      { id: 'totale', nom: 'Tout le bâtiment' }
    ]
  };

  /* ---------- Zones climatiques par département (métropole) ----------
     Liste des zones H1a à H3 (RT 2012 / méthode DPE), reprise de mémoire : à vérifier (H). */
  const ZONES = {
    H1a: ['02', '14', '27', '28', '59', '60', '61', '62', '75', '76', '77', '78', '80', '91', '92', '93', '94', '95'],
    H1b: ['08', '10', '21', '25', '39', '45', '51', '52', '54', '55', '57', '58', '67', '68', '70', '71', '88', '89', '90'],
    H1c: ['01', '03', '05', '15', '19', '23', '38', '42', '43', '63', '69', '73', '74', '87'],
    H2a: ['22', '29', '35', '50', '56'],
    H2b: ['16', '17', '18', '36', '37', '41', '44', '49', '53', '72', '79', '85', '86'],
    H2c: ['09', '12', '24', '31', '32', '33', '40', '46', '47', '64', '65', '81', '82'],
    H2d: ['04', '07', '26', '48', '84'],
    H3: ['06', '11', '13', '2A', '2B', '30', '34', '66', '83']
  };
  const ZONES_SOURCE = 'Zones climatiques H1a à H3 par département (RT 2012, méthode DPE) — liste reprise de mémoire, à vérifier (H)';

  /* ---------- Les valeurs chiffrées ---------- */

  groupe('Climat', SOURCES.meteo, 'exemple', [
    ['climat.H1a.dju', 'DJU base 18 °C — zone H1a (ex. Paris)', 2450, 'K·j'],
    ['climat.H1b.dju', 'DJU base 18 °C — zone H1b (ex. Nancy, Strasbourg)', 2850, 'K·j'],
    ['climat.H1c.dju', 'DJU base 18 °C — zone H1c (ex. Lyon, Clermont)', 2650, 'K·j'],
    ['climat.H2a.dju', 'DJU base 18 °C — zone H2a (ex. Rennes, Brest)', 2250, 'K·j'],
    ['climat.H2b.dju', 'DJU base 18 °C — zone H2b (ex. Nantes, Tours)', 2200, 'K·j'],
    ['climat.H2c.dju', 'DJU base 18 °C — zone H2c (ex. Toulouse, Bordeaux)', 1950, 'K·j'],
    ['climat.H2d.dju', 'DJU base 18 °C — zone H2d (ex. Avignon)', 2050, 'K·j'],
    ['climat.H3.dju', 'DJU base 18 °C — zone H3 (ex. Marseille, Montpellier)', 1450, 'K·j']
  ]);
  groupe('Climat', SOURCES.tbase, 'exemple', [
    ['climat.H1a.tbase', 'Température de base — H1a', -7, '°C'],
    ['climat.H1b.tbase', 'Température de base — H1b', -12, '°C'],
    ['climat.H1c.tbase', 'Température de base — H1c', -10, '°C'],
    ['climat.H2a.tbase', 'Température de base — H2a', -4, '°C'],
    ['climat.H2b.tbase', 'Température de base — H2b', -5, '°C'],
    ['climat.H2c.tbase', 'Température de base — H2c', -5, '°C'],
    ['climat.H2d.tbase', 'Température de base — H2d', -6, '°C'],
    ['climat.H3.tbase', 'Température de base — H3', -3, '°C']
  ]);
  groupe('Climat', SOURCES.code, 'valide', [
    ['climat.ti', 'Température intérieure de chauffage', 19, '°C']
  ]);
  groupe('Climat', SOURCES.ratios, 'exemple', [
    ['froid.H1', 'Besoin de froid par m² climatisé — zones H1', 15, 'kWh/m²·an'],
    ['froid.H2', 'Besoin de froid par m² climatisé — zones H2', 20, 'kWh/m²·an'],
    ['froid.H3', 'Besoin de froid par m² climatisé — zone H3', 30, 'kWh/m²·an'],
    ['froid.seer', 'Efficacité saisonnière de la climatisation (SEER)', 3, '–']
  ]);

  groupe('Géométrie', SOURCES.outil, 'exemple', [
    ['geo.hauteurEtage', "Hauteur d'un étage (hauteur du bâtiment → niveaux)", 3, 'm'],
    ['geo.formeSansCarte', 'Sans carte : périmètre = facteur × 4 × √(surface au sol)', 1.1, '–'],
    ['geo.mitoyen.un', 'Sans carte : part de périmètre mitoyen, un côté', 0.25, '–'],
    ['geo.mitoyen.deux', 'Sans carte : part de périmètre mitoyen, deux côtés', 0.5, '–']
  ]);

  // Par usage : surface chauffée / surface brute, hauteur sous plafond, part vitrée des façades,
  // intermittence (chauffage réduit la nuit, le week-end, les vacances) et ratios d'usages.
  const U = [
    // id, surface utile, hsp, vitrage, intermittence, éclairage, autres usages, ECS tertiaire
    ['logement-individuel', 0.80, 2.5, 0.15, 0.90, 3, 30, null],
    ['logement-collectif', 0.80, 2.5, 0.18, 0.90, 3, 30, null],
    ['bureaux', 0.85, 2.8, 0.35, 0.80, 18, 35, 3],
    ['enseignement', 0.85, 3.0, 0.30, 0.75, 12, 8, 4],
    ['commerce', 0.85, 3.5, 0.25, 0.90, 35, 50, 3],
    ['sante', 0.85, 2.8, 0.25, 1.00, 25, 45, 25],
    ['sport', 0.90, 6.0, 0.15, 0.85, 12, 8, 20],
    ['culture', 0.85, 3.5, 0.20, 0.80, 12, 10, 2]
  ];
  U.forEach(function (u) {
    const nom = USAGES.find(function (x) { return x.id === u[0]; }).nom;
    groupe('Usages — ' + nom, SOURCES.ratios, 'exemple', [
      ['usage.' + u[0] + '.surfaceUtile', 'Surface chauffée / surface de plancher brute', u[1], '–'],
      ['usage.' + u[0] + '.hsp', 'Hauteur sous plafond moyenne', u[2], 'm'],
      ['usage.' + u[0] + '.tauxVitrage', 'Part vitrée des façades', u[3], '–'],
      ['usage.' + u[0] + '.intermittence', 'Facteur d’intermittence du chauffage', u[4], '–'],
      ['usage.' + u[0] + '.eclairage', 'Éclairage', u[5], 'kWh/m²·an'],
      ['usage.' + u[0] + '.autres', 'Autres usages (bureautique, électroménager, process)', u[6], 'kWh/m²·an']
    ].concat(u[7] === null ? [] : [['usage.' + u[0] + '.ecs', 'Besoin d’eau chaude sanitaire', u[7], 'kWh/m²·an']]));
  });

  groupe('Logement', SOURCES.insee, 'exemple', [
    ['logement.personnes', 'Personnes par logement', 2.2, 'pers.']
  ]);
  groupe('Logement', SOURCES.ratios, 'exemple', [
    ['logement.surfaceMoyenne', 'Surface chauffée moyenne d’un logement collectif (si nombre inconnu)', 65, 'm²']
  ]);
  groupe('Eau chaude', SOURCES.tcl, 'exemple', [
    ['ecs.litres', 'Eau chaude à 40 °C par personne et par jour', 56, 'L/j'],
    ['ecs.tChaude', 'Température de l’eau chaude utilisée', 40, '°C'],
    ['ecs.tFroide', 'Température de l’eau froide', 12, '°C']
  ]);
  groupe('Eau chaude', SOURCES.physique, 'valide', [
    ['eau.c', 'Chaleur massique de l’eau', 1.163, 'Wh/(L·K)']
  ]);

  // « Si inconnu » = état le plus probable AUJOURD'HUI pour cette époque (une partie du parc ancien
  // a déjà été isolée ou a changé ses fenêtres depuis), pas l'état d'origine (H).
  groupe('Murs', SOURCES.tcl, 'exemple', [
    ['u.mur.non-isole', 'U mur non isolé', 1.8, 'W/(m²·K)'],
    ['u.mur.isole-ancien', 'U mur isolé ancien (4 à 8 cm)', 0.7, 'W/(m²·K)'],
    ['u.mur.isole-recent', 'U mur isolé récent (≥ 10 cm)', 0.35, 'W/(m²·K)'],
    ['u.mur.ite', 'U mur isolé par l’extérieur', 0.25, 'W/(m²·K)'],
    ['u.mur.defaut.av1948', 'U mur si inconnu — avant 1948', 1.7, 'W/(m²·K)'],
    ['u.mur.defaut.1948-1974', 'U mur si inconnu — 1948-1974', 1.6, 'W/(m²·K)'],
    ['u.mur.defaut.1975-1977', 'U mur si inconnu — 1975-1977', 1.0, 'W/(m²·K)'],
    ['u.mur.defaut.1978-1982', 'U mur si inconnu — 1978-1982', 0.8, 'W/(m²·K)'],
    ['u.mur.defaut.1983-1988', 'U mur si inconnu — 1983-1988', 0.7, 'W/(m²·K)'],
    ['u.mur.defaut.1989-2000', 'U mur si inconnu — 1989-2000', 0.5, 'W/(m²·K)'],
    ['u.mur.defaut.2001-2005', 'U mur si inconnu — 2001-2005', 0.4, 'W/(m²·K)'],
    ['u.mur.defaut.2006-2012', 'U mur si inconnu — 2006-2012', 0.36, 'W/(m²·K)'],
    ['u.mur.defaut.2013-2021', 'U mur si inconnu — 2013-2021', 0.25, 'W/(m²·K)'],
    ['u.mur.defaut.ap2021', 'U mur si inconnu — après 2021', 0.2, 'W/(m²·K)']
  ]);
  groupe('Ponts thermiques', 'Esprit des valeurs de la boîte à outils (ponts thermiques, version 1a601bb) et des règles Th-Bât : ordres de grandeur (H)', 'exemple', [
    ['psi.non-isole', 'ψ liaison plancher / mur non isolé', 0.4, 'W/(m·K)'],
    ['psi.iti', 'ψ liaison plancher / mur isolé par l’intérieur', 0.85, 'W/(m·K)'],
    ['psi.ite', 'ψ liaison plancher / mur isolé par l’extérieur', 0.1, 'W/(m·K)'],
    ['psi.recent', 'ψ bâtiment récent (rupteurs) si inconnu', 0.5, 'W/(m·K)']
  ]);
  groupe('Toiture', SOURCES.tcl, 'exemple', [
    ['u.toit.combles-non-isoles', 'U combles non isolés', 2.0, 'W/(m²·K)'],
    ['u.toit.combles-isoles-ancien', 'U combles isolation ancienne (≈ 10 cm)', 0.4, 'W/(m²·K)'],
    ['u.toit.combles-isoles-recent', 'U combles bien isolés (≥ 25 cm)', 0.17, 'W/(m²·K)'],
    ['u.toit.terrasse-non-isolee', 'U toiture-terrasse non isolée', 2.2, 'W/(m²·K)'],
    ['u.toit.terrasse-isolee', 'U toiture-terrasse isolée', 0.4, 'W/(m²·K)'],
    ['u.toit.defaut.av1948', 'U toiture si inconnue — avant 1948', 1.0, 'W/(m²·K)'],
    ['u.toit.defaut.1948-1974', 'U toiture si inconnue — 1948-1974', 1.0, 'W/(m²·K)'],
    ['u.toit.defaut.1975-1977', 'U toiture si inconnue — 1975-1977', 0.6, 'W/(m²·K)'],
    ['u.toit.defaut.1978-1982', 'U toiture si inconnue — 1978-1982', 0.5, 'W/(m²·K)'],
    ['u.toit.defaut.1983-1988', 'U toiture si inconnue — 1983-1988', 0.4, 'W/(m²·K)'],
    ['u.toit.defaut.1989-2000', 'U toiture si inconnue — 1989-2000', 0.3, 'W/(m²·K)'],
    ['u.toit.defaut.2001-2005', 'U toiture si inconnue — 2001-2005', 0.25, 'W/(m²·K)'],
    ['u.toit.defaut.2006-2012', 'U toiture si inconnue — 2006-2012', 0.2, 'W/(m²·K)'],
    ['u.toit.defaut.2013-2021', 'U toiture si inconnue — 2013-2021', 0.15, 'W/(m²·K)'],
    ['u.toit.defaut.ap2021', 'U toiture si inconnue — après 2021', 0.13, 'W/(m²·K)']
  ]);
  groupe('Plancher bas', SOURCES.tcl, 'exemple', [
    ['u.plancher.isole', 'U plancher bas déjà isolé (paroi seule)', 0.35, 'W/(m²·K)'],
    ['u.plancher.defaut.av1948', 'U plancher bas si inconnu — avant 1948', 1.8, 'W/(m²·K)'],
    ['u.plancher.defaut.1948-1974', 'U plancher bas si inconnu — 1948-1974', 2.0, 'W/(m²·K)'],
    ['u.plancher.defaut.1975-1977', 'U plancher bas si inconnu — 1975-1977', 1.0, 'W/(m²·K)'],
    ['u.plancher.defaut.1978-1982', 'U plancher bas si inconnu — 1978-1982', 0.9, 'W/(m²·K)'],
    ['u.plancher.defaut.1983-1988', 'U plancher bas si inconnu — 1983-1988', 0.8, 'W/(m²·K)'],
    ['u.plancher.defaut.1989-2000', 'U plancher bas si inconnu — 1989-2000', 0.6, 'W/(m²·K)'],
    ['u.plancher.defaut.2001-2005', 'U plancher bas si inconnu — 2001-2005', 0.45, 'W/(m²·K)'],
    ['u.plancher.defaut.2006-2012', 'U plancher bas si inconnu — 2006-2012', 0.4, 'W/(m²·K)'],
    ['u.plancher.defaut.2013-2021', 'U plancher bas si inconnu — 2013-2021', 0.25, 'W/(m²·K)'],
    ['u.plancher.defaut.ap2021', 'U plancher bas si inconnu — après 2021', 0.2, 'W/(m²·K)'],
    ['b.vide-sanitaire', 'Coefficient b : plancher sur vide sanitaire', 0.5, '–'],
    ['b.sous-sol', 'Coefficient b : plancher sur sous-sol non chauffé', 0.6, '–']
  ]);
  groupe('Plancher bas', SOURCES.iso13370, 'exemple', [
    ['sol.lambda', 'Conductivité du sol (valeur par défaut si sol inconnu)', 2.0, 'W/(m·K)'],
    ['sol.epaisseurMur', 'Épaisseur des murs périphériques (w)', 0.3, 'm'],
    ['sol.rsi', 'Résistance superficielle intérieure, flux descendant (Rsi)', 0.17, 'm²·K/W'],
    ['sol.rse', 'Résistance superficielle extérieure (Rse)', 0.04, 'm²·K/W']
  ]);
  groupe('Vitrages', SOURCES.tcl, 'exemple', [
    ['uw.simple', 'Uw fenêtre simple vitrage', 4.8, 'W/(m²·K)'],
    ['uw.double-ancien', 'Uw fenêtre double vitrage ancien', 2.9, 'W/(m²·K)'],
    ['uw.double-recent', 'Uw fenêtre double vitrage récent', 1.6, 'W/(m²·K)'],
    ['uw.triple', 'Uw fenêtre triple vitrage', 1.0, 'W/(m²·K)']
  ]);

  groupe('Renouvellement d’air', SOURCES.physique, 'valide', [
    ['air.rhoC', 'Capacité thermique volumique de l’air (ρ·c)', 0.34, 'Wh/(m³·K)']
  ]);
  groupe('Renouvellement d’air', SOURCES.tcl, 'exemple', [
    ['ventilation.naturelle.n', 'Débit de ventilation — naturelle', 0.45, 'vol/h'],
    ['ventilation.vmc-auto.n', 'Débit de ventilation — VMC autoréglable', 0.5, 'vol/h'],
    ['ventilation.vmc-hygro.n', 'Débit de ventilation — VMC hygroréglable', 0.3, 'vol/h'],
    ['ventilation.double-flux.n', 'Débit de ventilation — double flux', 0.5, 'vol/h'],
    ['ventilation.double-flux.recuperation', 'Efficacité de récupération du double flux', 0.7, '–'],
    ['infiltration.av1948', 'Infiltrations — avant 1948', 0.4, 'vol/h'],
    ['infiltration.1948-1974', 'Infiltrations — 1948-1974', 0.4, 'vol/h'],
    ['infiltration.1975-1977', 'Infiltrations — 1975-1977', 0.25, 'vol/h'],
    ['infiltration.1978-1982', 'Infiltrations — 1978-1982', 0.25, 'vol/h'],
    ['infiltration.1983-1988', 'Infiltrations — 1983-1988', 0.25, 'vol/h'],
    ['infiltration.1989-2000', 'Infiltrations — 1989-2000', 0.25, 'vol/h'],
    ['infiltration.2001-2005', 'Infiltrations — 2001-2005', 0.15, 'vol/h'],
    ['infiltration.2006-2012', 'Infiltrations — 2006-2012', 0.15, 'vol/h'],
    ['infiltration.2013-2021', 'Infiltrations — 2013-2021', 0.08, 'vol/h'],
    ['infiltration.ap2021', 'Infiltrations — après 2021', 0.08, 'vol/h'],
    ['infiltration.vitrage.simple', 'Infiltrations en plus — menuiseries simple vitrage', 0.1, 'vol/h'],
    ['infiltration.vitrage.double-ancien', 'Infiltrations en plus — menuiseries anciennes', 0.05, 'vol/h'],
    ['infiltration.vitrage.double-recent', 'Infiltrations en plus — menuiseries récentes', 0, 'vol/h'],
    ['infiltration.vitrage.triple', 'Infiltrations en plus — triple vitrage', 0, 'vol/h']
  ]);

  groupe('Chauffage', SOURCES.tcl, 'exemple', [
    ['chauffage.gaz-ancienne.rendement', 'Rendement global — chaudière gaz ancienne', 0.72, '–'],
    ['chauffage.gaz-condensation.rendement', 'Rendement global — chaudière gaz à condensation', 0.9, '–'],
    ['chauffage.fioul.rendement', 'Rendement global — chaudière fioul', 0.72, '–'],
    ['chauffage.propane.rendement', 'Rendement global — chaudière propane', 0.78, '–'],
    ['chauffage.electrique.rendement', 'Rendement global — radiateurs électriques', 0.92, '–'],
    ['chauffage.pac-air-eau.rendement', 'Coefficient de performance saisonnier — PAC air/eau', 2.8, '–'],
    ['chauffage.pac-air-air.rendement', 'Coefficient de performance saisonnier — PAC air/air', 3.0, '–'],
    ['chauffage.bois.rendement', 'Rendement global — bois bûches', 0.65, '–'],
    ['chauffage.granules.rendement', 'Rendement global — chaudière granulés', 0.8, '–'],
    ['chauffage.reseau.rendement', 'Rendement global — réseau de chaleur (sous-station)', 0.92, '–'],
    ['regulation.aucune.facteur', 'Effet de la régulation — aucune', 1.1, '–'],
    ['regulation.basique.facteur', 'Effet de la régulation — thermostat', 1.0, '–'],
    ['regulation.performante.facteur', 'Effet de la régulation — programmation par zone', 0.92, '–']
  ]);
  groupe('Eau chaude', SOURCES.tcl, 'exemple', [
    ['ecs.avec-chauffage.facteur', 'ECS par le chauffage : rendement = rendement chauffage × facteur (stockage, bouclage)', 0.85, '–'],
    ['ecs.ballon-electrique.rendement', 'Rendement — ballon électrique', 0.85, '–'],
    ['ecs.thermodynamique.rendement', 'Coefficient de performance — ballon thermodynamique', 2.5, '–'],
    ['ecs.gaz-instantane.rendement', 'Rendement — chauffe-eau gaz', 0.75, '–']
  ]);
  groupe('Auxiliaires', SOURCES.ratios, 'exemple', [
    ['aux.naturelle', 'Auxiliaires de ventilation — naturelle', 0, 'kWh/m²·an'],
    ['aux.vmc-auto', 'Auxiliaires de ventilation — VMC autoréglable', 3, 'kWh/m²·an'],
    ['aux.vmc-hygro', 'Auxiliaires de ventilation — VMC hygroréglable', 2, 'kWh/m²·an'],
    ['aux.double-flux', 'Auxiliaires de ventilation — double flux', 5, 'kWh/m²·an'],
    ['aux.hydraulique', 'Pompes de chauffage (réseau d’eau)', 2, 'kWh/m²·an']
  ]);
  groupe('Climatisation', SOURCES.outil, 'exemple', [
    ['clim.aucune.part', 'Part de surface climatisée — aucune', 0, '–'],
    ['clim.partielle.part', 'Part de surface climatisée — partielle', 0.5, '–'],
    ['clim.totale.part', 'Part de surface climatisée — tout le bâtiment', 1, '–']
  ]);

  groupe('Énergies', SOURCES.bao, 'exemple', [
    ['energie.electricite.prix', 'Prix de l’électricité (TTC, par kWh)', 0.22, '€/kWh'],
    ['energie.gaz.prix', 'Prix du gaz naturel (TTC, par kWh PCS de la facture)', 0.11, '€/kWh'],
    ['energie.fioul.prix', 'Prix du fioul (TTC, par kWh)', 0.12, '€/kWh'],
    ['energie.propane.prix', 'Prix du propane (TTC, par kWh)', 0.18, '€/kWh'],
    ['energie.bois-granules.prix', 'Prix des granulés (TTC, par kWh)', 0.08, '€/kWh'],
    ['energie.reseau-chaleur.prix', 'Prix du réseau de chaleur (TTC, par kWh)', 0.1, '€/kWh']
  ]);
  groupe('Énergies', SOURCES.ratios, 'exemple', [
    ['energie.bois-buches.prix', 'Prix du bois bûches (TTC, par kWh)', 0.07, '€/kWh']
  ]);
  groupe('Énergies', SOURCES.ep2026, 'exemple', [
    ['energie.electricite.ep', 'Coefficient d’énergie primaire — électricité', 1.9, '–']
  ]);
  groupe('Énergies', SOURCES.dpe, 'exemple', [
    ['energie.gaz.ep', 'Coefficient d’énergie primaire — gaz', 1, '–'],
    ['energie.fioul.ep', 'Coefficient d’énergie primaire — fioul', 1, '–'],
    ['energie.propane.ep', 'Coefficient d’énergie primaire — propane', 1, '–'],
    ['energie.bois-buches.ep', 'Coefficient d’énergie primaire — bois bûches', 1, '–'],
    ['energie.bois-granules.ep', 'Coefficient d’énergie primaire — granulés', 1, '–'],
    ['energie.reseau-chaleur.ep', 'Coefficient d’énergie primaire — réseau de chaleur', 1, '–'],
    ['energie.gaz.co2', 'Émissions — gaz naturel', 0.227, 'kgCO₂/kWh'],
    ['energie.fioul.co2', 'Émissions — fioul', 0.324, 'kgCO₂/kWh'],
    ['energie.propane.co2', 'Émissions — propane', 0.272, 'kgCO₂/kWh'],
    ['energie.bois-buches.co2', 'Émissions — bois bûches', 0.03, 'kgCO₂/kWh'],
    ['energie.bois-granules.co2', 'Émissions — granulés', 0.03, 'kgCO₂/kWh'],
    ['energie.reseau-chaleur.co2', 'Émissions — réseau de chaleur (dépend du réseau)', 0.15, 'kgCO₂/kWh'],
    ['energie.electricite.co2.chauffage', 'Émissions — électricité, chauffage', 0.079, 'kgCO₂/kWh'],
    ['energie.electricite.co2.ecs', 'Émissions — électricité, eau chaude', 0.065, 'kgCO₂/kWh'],
    ['energie.electricite.co2.froid', 'Émissions — électricité, climatisation', 0.064, 'kgCO₂/kWh'],
    ['energie.electricite.co2.eclairage', 'Émissions — électricité, éclairage', 0.069, 'kgCO₂/kWh'],
    ['energie.electricite.co2.auxiliaires', 'Émissions — électricité, auxiliaires', 0.064, 'kgCO₂/kWh'],
    ['energie.electricite.co2.autres', 'Émissions — électricité, autres usages', 0.064, 'kgCO₂/kWh']
  ]);
  groupe('Énergies', 'Rapport PCS / PCI du gaz naturel : 1,11 (valeur usuelle des fournisseurs et du DPE), à vérifier (H)', 'exemple', [
    ['energie.gaz.pcsPci', 'Gaz : kWh de la facture (PCS) par kWh PCI', 1.11, '–']
  ]);

  groupe('Étiquette DPE (logement)', SOURCES.dpe, 'exemple', [
    ['dpe.ep.A', 'Seuil énergie A', 70, 'kWhEP/m²·an'],
    ['dpe.ep.B', 'Seuil énergie B', 110, 'kWhEP/m²·an'],
    ['dpe.ep.C', 'Seuil énergie C', 180, 'kWhEP/m²·an'],
    ['dpe.ep.D', 'Seuil énergie D', 250, 'kWhEP/m²·an'],
    ['dpe.ep.E', 'Seuil énergie E', 330, 'kWhEP/m²·an'],
    ['dpe.ep.F', 'Seuil énergie F', 420, 'kWhEP/m²·an'],
    ['dpe.ges.A', 'Seuil climat A', 6, 'kgCO₂/m²·an'],
    ['dpe.ges.B', 'Seuil climat B', 11, 'kgCO₂/m²·an'],
    ['dpe.ges.C', 'Seuil climat C', 30, 'kgCO₂/m²·an'],
    ['dpe.ges.D', 'Seuil climat D', 50, 'kgCO₂/m²·an'],
    ['dpe.ges.E', 'Seuil climat E', 70, 'kgCO₂/m²·an'],
    ['dpe.ges.F', 'Seuil climat F', 100, 'kgCO₂/m²·an']
  ]);

  groupe('Économie', SOURCES.outil, 'exemple', [
    ['eco.inflation', 'Hausse annuelle du prix de l’énergie', 0.03, '/an'],
    ['eco.actualisation', 'Taux d’actualisation', 0.04, '/an'],
    ['eco.frais', 'Frais en plus des travaux (maîtrise d’œuvre, aléas)', 0.1, '–'],
    ['eco.tva.tertiaire', 'TVA des travaux — tertiaire', 0.2, '–'],
    ['eco.seuil.afaire', 'Verdict ✅ si temps de retour actualisé ≤ seuil × durée de vie', 0.5, '–'],
    ['eco.horizon', 'Horizon maximal du temps de retour actualisé', 60, 'ans']
  ]);
  groupe('Économie', SOURCES.cgi, 'exemple', [
    ['eco.tva.logement', 'TVA des travaux — logement', 0.055, '–']
  ]);

  groupe('Fiabilité', SOURCES.outil, 'exemple', [
    ['fiab.bonne', 'Fiabilité « bonne » si la demi-fourchette est sous', 0.15, '–'],
    ['fiab.moyenne', 'Fiabilité « moyenne » si la demi-fourchette est sous', 0.3, '–'],
    ['incert.facture', 'Incertitude d’une consommation calée sur factures (climat de l’année, occupation)', 0.1, '–'],
    ['incert.surface.saisie', 'Incertitude surface — saisie', 0.05, '–'],
    ['incert.surface.carte', 'Incertitude surface — lue sur la carte', 0.15, '–'],
    ['incert.surface.deduite', 'Incertitude surface — déduite', 0.3, '–'],
    ['incert.paroi.saisie', 'Incertitude U d’une paroi — choix saisi', 0.2, '–'],
    ['incert.paroi.deduite', 'Incertitude U d’une paroi — déduite de l’année', 0.4, '–'],
    ['incert.vitrage.saisie', 'Incertitude Uw — choix saisi', 0.12, '–'],
    ['incert.vitrage.deduite', 'Incertitude Uw — déduit de l’année', 0.35, '–'],
    ['incert.tauxVitrage', 'Incertitude part vitrée des façades', 0.3, '–'],
    ['incert.air.saisie', 'Incertitude renouvellement d’air — ventilation saisie', 0.3, '–'],
    ['incert.air.deduite', 'Incertitude renouvellement d’air — déduite', 0.45, '–'],
    ['incert.climat', 'Incertitude DJU (zone au lieu de la station, altitude)', 0.1, '–'],
    ['incert.rendement.saisie', 'Incertitude rendement — système saisi', 0.1, '–'],
    ['incert.rendement.deduite', 'Incertitude rendement — système déduit', 0.25, '–'],
    ['incert.ecs.saisie', 'Incertitude eau chaude — occupants saisis', 0.2, '–'],
    ['incert.ecs.deduite', 'Incertitude eau chaude — occupants déduits', 0.35, '–'],
    ['incert.ratios', 'Incertitude éclairage, auxiliaires, autres usages, froid', 0.4, '–'],
    ['incert.comportement', 'Incertitude occupation et consigne (sans factures)', 0.15, '–']
  ]);

  // Coûts : ratios € HT fourniture + pose, en rénovation (janvier 2025), repris de la boîte à outils.
  groupe('Coûts des travaux (€ HT)', SOURCES.bao, 'exemple', [
    ['cout.combles.bas', 'Isolation combles perdus (soufflage) — bas', 25, '€/m²'],
    ['cout.combles.haut', 'Isolation combles perdus (soufflage) — haut', 45, '€/m²'],
    ['cout.terrasse.bas', 'Isolation toiture-terrasse + étanchéité — bas', 130, '€/m²'],
    ['cout.terrasse.haut', 'Isolation toiture-terrasse + étanchéité — haut', 230, '€/m²'],
    ['cout.ite.bas', 'ITE sous enduit — bas', 120, '€/m² de mur'],
    ['cout.ite.haut', 'ITE sous enduit — haut', 190, '€/m² de mur'],
    ['cout.iti.bas', 'ITI doublage isolant + plaque — bas', 45, '€/m² de mur'],
    ['cout.iti.haut', 'ITI doublage isolant + plaque — haut', 85, '€/m² de mur'],
    ['cout.plancher.bas', 'Isolation sous plancher — bas', 35, '€/m²'],
    ['cout.plancher.haut', 'Isolation sous plancher — haut', 70, '€/m²'],
    ['cout.menuiseries.bas', 'Menuiseries PVC double vitrage — bas', 450, '€/m² de baie'],
    ['cout.menuiseries.haut', 'Menuiseries PVC double vitrage — haut', 800, '€/m² de baie'],
    ['cout.pac.bas', 'PAC air/eau — bas', 700, '€/kW'],
    ['cout.pac.haut', 'PAC air/eau — haut', 1300, '€/kW'],
    ['cout.condensation.bas', 'Chaudière gaz à condensation — bas', 120, '€/kW'],
    ['cout.condensation.haut', 'Chaudière gaz à condensation — haut', 300, '€/kW'],
    ['cout.ecsThermo.bas', 'Ballon ECS thermodynamique — bas', 2500, '€/u'],
    ['cout.ecsThermo.haut', 'Ballon ECS thermodynamique — haut', 4500, '€/u'],
    ['cout.robinets.bas', 'Robinets thermostatiques — bas', 80, '€/u'],
    ['cout.robinets.haut', 'Robinets thermostatiques — haut', 150, '€/u'],
    ['cout.gtb.bas', 'GTB / régulation centralisée — bas', 10, '€/m²'],
    ['cout.gtb.haut', 'GTB / régulation centralisée — haut', 30, '€/m²'],
    ['cout.hygro.bas', 'VMC simple flux hygroréglable — bas', 10, '€/m²'],
    ['cout.hygro.haut', 'VMC simple flux hygroréglable — haut', 25, '€/m²'],
    ['cout.df.bas', 'VMC double flux — bas', 45, '€/m²'],
    ['cout.df.haut', 'VMC double flux — haut', 95, '€/m²'],
    ['cout.led.bas', 'Éclairage LED — bas', 20, '€/m²'],
    ['cout.led.haut', 'Éclairage LED — haut', 45, '€/m²']
  ]);
  groupe('Coûts des travaux (€ HT)', SOURCES.ratios, 'exemple', [
    ['cout.pacAirAir.bas', 'PAC air/air (multisplit) — bas', 500, '€/kW'],
    ['cout.pacAirAir.haut', 'PAC air/air (multisplit) — haut', 900, '€/kW']
  ]);

  // Performance après travaux et durée de vie de chaque action.
  groupe('Actions', SOURCES.ratios, 'exemple', [
    ['action.combles.u', 'U après isolation des combles (≈ 30 cm soufflés, R ≈ 7)', 0.14, 'W/(m²·K)'],
    ['action.terrasse.u', 'U après isolation de la terrasse (R ≈ 4,5)', 0.22, 'W/(m²·K)'],
    ['action.ite.u', 'U mur après ITE (R ≈ 4)', 0.24, 'W/(m²·K)'],
    ['action.iti.u', 'U mur après ITI (R ≈ 3,2)', 0.3, 'W/(m²·K)'],
    ['action.plancher.u', 'U plancher après isolation (R ≈ 3)', 0.27, 'W/(m²·K)'],
    ['action.menuiseries.uw', 'Uw des nouvelles menuiseries', 1.3, 'W/(m²·K)'],
    ['action.led.gain', 'Baisse de l’éclairage avec LED et détection', 0.55, '–'],
    ['action.pac.surpuissance', 'PAC : puissance = déperditions × ce facteur (relance)', 1.1, '–'],
    ['action.robinets.m2', 'Un radiateur (robinet) pour … m²', 12, 'm²'],
    ['action.ecs.m2', 'Tertiaire : un ballon thermodynamique pour … m²', 1000, 'm²'],
    ['duree.combles', 'Durée de vie — isolation des combles', 30, 'ans'],
    ['duree.terrasse', 'Durée de vie — isolation de la terrasse', 30, 'ans'],
    ['duree.ite', 'Durée de vie — ITE', 35, 'ans'],
    ['duree.iti', 'Durée de vie — ITI', 35, 'ans'],
    ['duree.plancher', 'Durée de vie — isolation du plancher', 35, 'ans'],
    ['duree.menuiseries', 'Durée de vie — menuiseries', 30, 'ans'],
    ['duree.ventilation', 'Durée de vie — VMC', 20, 'ans'],
    ['duree.regulation', 'Durée de vie — régulation', 15, 'ans'],
    ['duree.pac', 'Durée de vie — PAC', 17, 'ans'],
    ['duree.condensation', 'Durée de vie — chaudière', 20, 'ans'],
    ['duree.ecs', 'Durée de vie — ballon thermodynamique', 15, 'ans'],
    ['duree.led', 'Durée de vie — LED', 15, 'ans']
  ]);

  const HYPOTHESES = {
    SOURCES: SOURCES, VALEURS: VALEURS, PERIODES: PERIODES, USAGES: USAGES, ENERGIES: ENERGIES,
    CHOIX: CHOIX, ZONES: ZONES, ZONES_SOURCE: ZONES_SOURCE
  };
  global.HYPOTHESES_FLASH = HYPOTHESES;
  if (typeof module !== 'undefined' && module.exports) module.exports = HYPOTHESES;
})(typeof window !== 'undefined' ? window : globalThis);
