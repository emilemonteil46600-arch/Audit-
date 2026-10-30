/* ==========================================================
   MOTEUR DE CALCUL — AUDIT FLASH (fonctions pures, sans réseau)
   ----------------------------------------------------------
   Chaque chiffre vient de donnees/hypotheses.js (avec sa source
   et son statut) ou de tes réponses. Rien n'est caché.

   1. Géométrie
      S chauffée = S plancher × (surface chauffée / surface brute)
      V          = S chauffée × hauteur sous plafond
      A façades  = périmètre exposé × hauteur du bâtiment   (un mur mitoyen ne perd presque rien)
      A vitrages = A façades × part vitrée        A murs = A façades − A vitrages
      A toiture  = A plancher bas = S au sol
      L ponts thermiques = périmètre exposé × (niveaux + 1)   (une liaison plancher / façade par niveau + la toiture)

   2. Déperditions H (W/K)
      H paroi = U × A          H ponts = ψ × L          H air = 0,34 × n × V
      n = ventilation × (1 − récupération) + infiltrations      (en volumes par heure)
      Plancher sur terre-plein (NF EN ISO 13370) :
        B' = A / (0,5 × P exposé)        dt = w + λ × (Rsi + Rf + Rse)
        U = 2λ / (π B' + dt) × ln(π B' / dt + 1)   si dt < B'   ;   sinon U = λ / (0,457 B' + dt)
      Plancher sur vide sanitaire ou sous-sol : U effectif = U paroi × b

   3. Besoin de chauffage (kWh/an) = H × DJU × 24 / 1000 × intermittence × régulation
      Puissance au jour le plus froid (kW) = H × (T intérieure − T de base) / 1000

   4. Consommation (énergie finale) = besoin / rendement   (pour une PAC, le « rendement » est son COP)
      ECS logement = occupants × 56 L/j × 1,163 Wh/(L·K) × (40 − 12) K × 365 / 1000
      ECS tertiaire, éclairage, auxiliaires, autres usages = ratio (kWh/m²) × S chauffée
      Froid = besoin de froid (kWh/m²) × S climatisée / SEER

   5. Énergie primaire = EF × coefficient ; CO₂ = EF × facteur ; coût = EF × (PCS/PCI) × prix
      (le gaz est facturé en kWh PCS : 1 kWh PCI = 1,11 kWh sur la facture)

   6. Étiquette DPE indicative (logement) : la pire des classes « énergie » (EP des 5 usages) et « climat »

   7. Fourchette : chaque paramètre incertain est poussé à ± son incertitude (une valeur saisie est plus
      sûre qu'une valeur déduite de l'année). Il fait varier la consommation de Δᵢ = |C(haut) − C(bas)| / 2.
      Les erreurs étant indépendantes, on les cumule en quadrature :   δ = √(Σ Δᵢ²)

   8. Calage sur factures : k = facture / calcul, énergie par énergie. Chaque usage garde son k même si
      une action change son énergie : k corrige le besoin réel (occupation, consigne), pas la chaudière.

   9. Rentabilité (économie de l'année 1 = E, hausse du prix de l'énergie i, actualisation a)
        TRB = coût / E
        TRA = plus petite durée n telle que Σ (t = 1 → n) E × (1 + i)^(t−1) / (1 + a)^t ≥ coût
        VAN = Σ (t = 1 → durée de vie) E × (1 + i)^(t−1) / (1 + a)^t − coût
      ✅ à faire si TRA ≤ ½ durée de vie ; 🟠 à discuter si TRA ≤ durée de vie ; ❌ sinon.
      Les gains ne s'additionnent pas : un bouquet est calculé dans l'ordre, chaque action
      partant du bâtiment déjà amélioré (et la PAC est dimensionnée APRÈS l'isolation).

  10. Correction climatique des factures : si l'année des factures a eu DJU(année) au lieu de DJU(normale),
      on calcule le bâtiment avec DJU(année) pour obtenir k, puis on applique k à l'année normale.
        k = facture / calcul(DJU de l'année)
      Une année froide n'est donc plus prise pour un bâtiment qui consomme trop.

  11. Les valeurs qui pèsent le plus : chaque valeur d'exemple est poussée de + 10 % ; on mesure
        élasticité = | résultat(valeur × 1,1) / résultat(valeur) − 1 | / 0,1
      sur la consommation, sur la facture et sur les temps de retour des actions ✅ / 🟠, et on compte
      les verdicts qui changent.
      Poids = la plus forte des trois élasticités + 1 par verdict qui change. On valide d'abord les plus lourdes.

  12. Cas de référence (valider le moteur) : pour un bâtiment dont on connaît les factures,
        écart = (calcul sans calage − factures) / factures      (> 0 : le moteur surestime)
      biais = moyenne des écarts ; « dans la fourchette » si | calcul − factures | ≤ δ.

   Exemple refait à la main : maison de plain-pied de 1970 à Toulouse (zone H2c, DJU 1 950),
   10 m × 10 m au sol, 3 m de haut, chaudière gaz ancienne ; tout le reste « je ne sais pas ».
     S chauffée = 100 × 0,80 = 80 m² ; V = 80 × 2,5 = 200 m³
     A façades = 40 × 3 = 120 m² → vitrages 120 × 0,15 = 18 m², murs 102 m² ; ponts : 40 × 2 = 80 m
     H = 1,6 × 102 + 2,9 × 18 + 1,0 × 100 + 2,0 × 0,5 × 100 + 0,4 × 80 + 0,34 × 0,9 × 200
       = 163,2 + 52,2 + 100 + 100 + 32 + 61,2 = 508,6 W/K
     Besoin = 508,6 × 1 950 × 24 / 1000 × 0,9 = 21 422 kWh → / 0,72 = 29 753 kWh de gaz (PCI)
     ECS = 2,2 pers. × 56 × 1,163 × 28 × 365 / 1000 = 1 464 kWh → / (0,72 × 0,85) = 2 393 kWh de gaz
     Électricité = (éclairage 3 + pompes 2 + autres 30) × 80 = 2 800 kWh
     Facture ≈ (29 753 + 2 393) × 1,11 × 0,11 + 2 800 × 0,22 ≈ 3 925 + 616 = 4 541 €/an
     EP (5 usages) = (32 146 + 400 × 1,9) / 80 ≈ 411 kWhEP/m² → F ; CO₂ ≈ 92 kg/m² → F
     Puissance = 508,6 × (19 − (−5)) / 1000 ≈ 12,2 kW
     Isolation des combles (U 1,0 → 0,14) : ΔH = 86 W/K → − 5 031 kWh de gaz → ≈ 614 €/an
     Poids du prix du gaz sur la facture : + 10 % → + 392 € sur 4 541 € → élasticité 3 925 / 4 541 ≈ 0,86
     Factures d'une année à 2 340 DJU (+ 20 %) : k gaz = facture / ((29 753 × 1,2 + 2 393) × 1,11)
   ========================================================== */
(function (global) {
  'use strict';

  /* ---------- 0. Les données (avec tes modifications) ---------- */

  // H = HYPOTHESES_FLASH ; modifs = { id: valeur } que tu as changées dans l'onglet Données ;
  // validees = { id: date } : les valeurs d'exemple que tu as vérifiées et gardées telles quelles.
  function creerDonnees(H, modifs, validees) {
    const index = {};
    H.VALEURS.forEach(function (x) { index[x.id] = x; });
    const perso = modifs || {};
    const utilisees = new Set();
    function v(id) {
      const e = index[id];
      if (!e) throw new Error('Valeur inconnue : ' + id);
      utilisees.add(id);
      return estModifiee(perso, id) ? perso[id] : e.valeur;
    }
    return { H: H, index: index, modifs: perso, validees: validees || {}, utilisees: utilisees, v: v };
  }

  function estModifiee(modifs, id) {
    return typeof modifs[id] === 'number' && isFinite(modifs[id]);
  }

  // Les valeurs d'exemple réellement utilisées par le calcul (ni remplacées, ni validées par toi).
  function valeursExemple(D) {
    return Array.from(D.utilisees).filter(function (id) {
      return D.index[id].statut !== 'valide' && !estModifiee(D.modifs, id) && !D.validees[id];
    }).map(function (id) { return D.index[id]; });
  }

  function cloner(objet) {
    return JSON.parse(JSON.stringify(objet));
  }

  /* ---------- 1. Petites déductions ---------- */

  function periodeDepuisAnnee(annee, periodes) {
    const a = Number(annee);
    if (!(a > 1000)) return null;
    const p = periodes.find(function (x) { return a <= x.fin; });
    return p ? p.id : null;
  }

  function rangPeriode(id, periodes) {
    return periodes.findIndex(function (p) { return p.id === id; });
  }

  function zoneDepuisDepartement(departement, zones) {
    const d = String(departement || '').toUpperCase();
    return Object.keys(zones).find(function (z) { return zones[z].indexOf(d) >= 0; }) || null;
  }

  // Énergie lue dans une base (BDNB, DPE) → système de chauffage le plus probable pour l'époque.
  function chauffageDepuisEnergie(energie, rang) {
    return {
      gaz: rang <= 5 ? 'gaz-ancienne' : 'gaz-condensation',
      electricite: 'electrique',
      fioul: 'fioul',
      propane: 'propane',
      'bois-buches': 'bois',
      'bois-granules': 'granules',
      'reseau-chaleur': 'reseau'
    }[energie] || null;
  }

  /* ---------- 2. Compléter les réponses ----------
     entrees = { cle: { valeur, origine } } avec origine 'saisie', 'carte', 'bdnb' ou 'dpe'.
     Ce qui manque est déduit de l'année et de l'usage (origine 'deduite').
     Renvoie les paramètres chiffrés du calcul et l'origine de chacun. */
  function completer(entrees, D) {
    const H = D.H;
    const lire = function (cle) {
      const x = entrees ? entrees[cle] : null;
      return x && x.valeur !== null && x.valeur !== undefined && x.valeur !== '' ? x : null;
    };
    const origines = {};
    const noter = function (cle, origine, choix, detail) {
      origines[cle] = { origine: origine, choix: choix === undefined ? null : choix, detail: detail || '' };
    };
    const choixDe = function (liste, id) { return H.CHOIX[liste].find(function (c) { return c.id === id; }); };
    const manque = [];

    /* Surface et forme */
    const eNiv = lire('niveaux'), eSol = lire('surfaceSol'), eSP = lire('surfacePlancher');
    const niveaux = eNiv ? Math.max(1, Math.round(Number(eNiv.valeur))) : 1;
    noter('niveaux', eNiv ? eNiv.origine : 'deduite', null, eNiv ? '' : 'un seul niveau supposé');
    let surfacePlancher = null;
    if (eSP) { surfacePlancher = Number(eSP.valeur); noter('surface', eSP.origine); }
    else if (eSol) { surfacePlancher = Number(eSol.valeur) * niveaux; noter('surface', eSol.origine, null, 'surface au sol × niveaux'); }
    if (!(surfacePlancher > 0)) manque.push('surface');

    const eDep = lire('departement');
    const zone = eDep ? zoneDepuisDepartement(eDep.valeur, H.ZONES) : null;
    if (!zone) manque.push('departement');
    else noter('climat', eDep.origine, zone, 'zone ' + zone);
    if (manque.length) return { manque: manque, origines: origines };

    const surfaceSol = eSol ? Number(eSol.valeur) : surfacePlancher / niveaux;
    const ePer = lire('perimetre');
    const perimetre = ePer ? Number(ePer.valeur) : D.v('geo.formeSansCarte') * 4 * Math.sqrt(surfaceSol);
    const eExp = lire('perimetreExpose'), eMit = lire('mitoyennete');
    let perimetreExpose = perimetre;
    if (eExp) perimetreExpose = Number(eExp.valeur);
    else if (eMit && eMit.valeur !== 'aucune') perimetreExpose = perimetre * (1 - D.v('geo.mitoyen.' + eMit.valeur));
    noter('forme', ePer ? ePer.origine : 'deduite', null, ePer ? 'contour de la carte' : 'bâtiment supposé presque carré');
    const eHaut = lire('hauteur');
    const hauteur = eHaut ? Number(eHaut.valeur) : niveaux * D.v('geo.hauteurEtage');

    /* Usage et époque */
    const eUsage = lire('usage');
    const usage = eUsage ? eUsage.valeur : (surfacePlancher <= 250 ? 'logement-individuel' : 'logement-collectif');
    noter('usage', eUsage ? eUsage.origine : 'deduite', usage, eUsage ? '' : 'usage supposé : à préciser');
    const famille = H.USAGES.find(function (u) { return u.id === usage; }).famille;
    const logement = famille === 'logement';

    const eAnnee = lire('annee');
    const periodeLue = eAnnee ? periodeDepuisAnnee(eAnnee.valeur, H.PERIODES) : null;
    const periode = periodeLue || '1948-1974';
    noter('periode', periodeLue ? eAnnee.origine : 'deduite', periode, periodeLue ? '' : 'année inconnue : 1948 – 1974 supposé');
    const rang = rangPeriode(periode, H.PERIODES);
    const nomPeriode = H.PERIODES[rang].nom;

    /* Murs (et type d'isolation → ponts thermiques) */
    const eMurs = lire('murs');
    let uMur, isolation;
    if (eMurs) {
      uMur = D.v('u.mur.' + eMurs.valeur);
      isolation = { 'non-isole': 'non-isole', 'isole-ancien': 'iti', 'isole-recent': 'iti', ite: 'ite' }[eMurs.valeur];
      noter('murs', eMurs.origine, eMurs.valeur);
    } else {
      uMur = D.v('u.mur.defaut.' + periode);
      isolation = rang <= 1 ? 'non-isole' : rang <= 7 ? 'iti' : 'recent';
      noter('murs', 'deduite', null, 'état probable pour ' + nomPeriode);
    }
    const psi = D.v('psi.' + isolation);

    /* Toiture */
    const eToit = lire('toiture'), eTypeToit = lire('toitureType');
    let uToit, toitureType;
    if (eToit) {
      uToit = D.v('u.toit.' + eToit.valeur);
      toitureType = choixDe('toiture', eToit.valeur).type;
      noter('toiture', eToit.origine, eToit.valeur);
    } else {
      uToit = D.v('u.toit.defaut.' + periode);
      toitureType = eTypeToit ? eTypeToit.valeur : (usage === 'logement-individuel' || rang === 0 ? 'combles' : 'terrasse');
      noter('toiture', 'deduite', null, 'état probable pour ' + nomPeriode + (eTypeToit ? ', ' + toitureType + ' (matériau de la carte)' : ', ' + toitureType + ' supposée'));
    }

    /* Plancher bas */
    const ePl = lire('plancher');
    const typeDeduit = usage === 'logement-individuel' ? (rang === 0 ? 'terre-plein' : 'vide-sanitaire') :
      usage === 'logement-collectif' ? 'sous-sol' : 'terre-plein';
    let uPlancher, plancherType;
    if (ePl && ePl.valeur === 'isole') {
      uPlancher = D.v('u.plancher.isole'); plancherType = typeDeduit;
      noter('plancher', ePl.origine, 'isole', 'type supposé : ' + typeDeduit);
    } else if (ePl) {
      uPlancher = D.v('u.plancher.defaut.' + periode); plancherType = ePl.valeur;
      noter('plancher', ePl.origine, ePl.valeur, 'isolation probable pour ' + nomPeriode);
    } else {
      uPlancher = D.v('u.plancher.defaut.' + periode); plancherType = typeDeduit;
      noter('plancher', 'deduite', typeDeduit, 'type supposé, état probable pour ' + nomPeriode);
    }

    /* Vitrages */
    const eVit = lire('vitrage');
    const vitrage = eVit ? eVit.valeur : (rang <= 6 ? 'double-ancien' : 'double-recent');
    noter('vitrage', eVit ? eVit.origine : 'deduite', vitrage, eVit ? '' : 'état probable pour ' + nomPeriode);

    /* Ventilation et infiltrations */
    const eVent = lire('ventilation');
    const ventilation = eVent ? eVent.valeur :
      rang <= 1 ? 'naturelle' : rang <= 5 ? 'vmc-auto' : logement ? 'vmc-hygro' : rang <= 7 ? 'vmc-auto' : 'double-flux';
    noter('ventilation', eVent ? eVent.origine : 'deduite', ventilation, eVent ? '' : 'probable pour ' + nomPeriode);

    /* Chauffage */
    const eCh = lire('chauffage'), eEnergie = lire('energieChauffage');
    let chauffage;
    if (eCh) { chauffage = eCh.valeur; noter('chauffage', eCh.origine, chauffage); }
    else if (eEnergie && chauffageDepuisEnergie(eEnergie.valeur, rang)) {
      chauffage = chauffageDepuisEnergie(eEnergie.valeur, rang);
      noter('chauffage', eEnergie.origine, chauffage, 'énergie lue (' + eEnergie.origine.toUpperCase() + '), système supposé');
    } else {
      chauffage = rang <= 5 ? 'gaz-ancienne' : rang <= 7 ? 'gaz-condensation' : 'pac-air-eau';
      noter('chauffage', 'deduite', chauffage, 'système le plus courant pour ' + nomPeriode);
    }
    const ch = choixDe('chauffage', chauffage);

    const eReg = lire('regulation');
    const regulation = eReg ? eReg.valeur : 'basique';
    noter('regulation', eReg ? eReg.origine : 'deduite', regulation, eReg ? '' : 'thermostat supposé');

    /* Eau chaude */
    const eEcs = lire('ecs');
    const ecs = eEcs ? eEcs.valeur : (logement && ch.hydraulique && chauffage !== 'pac-air-air' ? 'avec-chauffage' : 'ballon-electrique');
    noter('ecs', eEcs ? eEcs.origine : 'deduite', ecs, eEcs ? '' : 'production la plus probable');

    /* Climatisation */
    const eClim = lire('climatisation');
    const climatisation = eClim ? eClim.valeur : (chauffage === 'pac-air-air' ? 'partielle' : 'aucune');
    noter('climatisation', eClim ? eClim.origine : 'deduite', climatisation, eClim ? '' : 'supposée');

    /* Occupation (logement) */
    const surfaceUtile = D.v('usage.' + usage + '.surfaceUtile');
    let logements = null, occupants = null;
    if (logement) {
      const eOcc = lire('occupants'), eLog = lire('logements');
      logements = eLog ? Math.max(1, Math.round(Number(eLog.valeur))) :
        usage === 'logement-individuel' ? 1 : Math.max(1, Math.round(surfacePlancher * surfaceUtile / D.v('logement.surfaceMoyenne')));
      occupants = eOcc ? Number(eOcc.valeur) : logements * D.v('logement.personnes');
      noter('occupants', eOcc ? eOcc.origine : 'deduite', null,
        eOcc ? '' : logements + ' logement(s) ' + (eLog ? '(' + eLog.origine + ')' : 'supposé(s)') + ' × personnes par logement');
    } else {
      noter('occupants', 'deduite', null, 'ratio par m² pour cet usage');
    }

    const params = {
      usage: usage, famille: famille, periode: periode, zone: zone,
      surfacePlancher: surfacePlancher, surfaceSol: surfaceSol, niveaux: niveaux, hauteur: hauteur,
      perimetre: perimetre, perimetreExpose: perimetreExpose,
      surfaceUtile: surfaceUtile, hsp: D.v('usage.' + usage + '.hsp'), tauxVitrage: D.v('usage.' + usage + '.tauxVitrage'),
      uMur: uMur, isolationMurs: isolation, psi: psi,
      uToit: uToit, toitureType: toitureType,
      uPlancher: uPlancher, plancherType: plancherType,
      vitrage: vitrage, uw: D.v('uw.' + vitrage),
      ventilation: ventilation, nVent: D.v('ventilation.' + ventilation + '.n'),
      recuperation: ventilation === 'double-flux' ? D.v('ventilation.double-flux.recuperation') : 0,
      nInf: D.v('infiltration.' + periode) + D.v('infiltration.vitrage.' + vitrage),
      facteurAir: 1,
      dju: D.v('climat.' + zone + '.dju'), tbase: D.v('climat.' + zone + '.tbase'), ti: D.v('climat.ti'),
      chauffage: chauffage, energieChauffage: ch.energie, hydraulique: ch.hydraulique,
      rendementChauffage: D.v('chauffage.' + chauffage + '.rendement'),
      regulation: regulation, facteurRegulation: D.v('regulation.' + regulation + '.facteur'),
      intermittence: D.v('usage.' + usage + '.intermittence'),
      ecs: ecs, occupants: occupants, logements: logements, facteurEcs: 1,
      ecsRatio: logement ? 0 : D.v('usage.' + usage + '.ecs'),
      partClim: D.v('clim.' + climatisation + '.part'), climatisation: climatisation,
      besoinFroid: D.v('froid.' + zone.slice(0, 2)), seer: D.v('froid.seer'),
      eclairage: D.v('usage.' + usage + '.eclairage'), autres: D.v('usage.' + usage + '.autres'),
      auxVentilation: D.v('aux.' + ventilation), auxHydraulique: D.v('aux.hydraulique'),
      facteurComportement: 1
    };
    return { params: params, origines: origines, manque: [] };
  }

  /* ---------- 3. Le calcul ---------- */

  // Plancher sur terre-plein : NF EN ISO 13370 (voir la formule en haut du fichier).
  function uTerrePlein(aire, perimetreExpose, uParoi, D) {
    const lambda = D.v('sol.lambda'), w = D.v('sol.epaisseurMur'), rsi = D.v('sol.rsi'), rse = D.v('sol.rse');
    const rf = Math.max(0, 1 / uParoi - rsi - rse);
    const b = aire / (0.5 * Math.max(perimetreExpose, 1e-6));
    const dt = w + lambda * (rsi + rf + rse);
    if (dt < b) return 2 * lambda / (Math.PI * b + dt) * Math.log(Math.PI * b / dt + 1);
    return lambda / (0.457 * b + dt);
  }

  function uPlancherEffectif(p, D) {
    if (p.plancherType === 'terre-plein') return uTerrePlein(p.surfaceSol, p.perimetreExpose, p.uPlancher, D);
    return p.uPlancher * D.v('b.' + p.plancherType);
  }

  function geometrie(p) {
    const surfaceChauffee = p.surfacePlancher * p.surfaceUtile;
    const facades = p.perimetreExpose * p.hauteur;
    const vitrages = facades * p.tauxVitrage;
    return {
      surfaceChauffee: surfaceChauffee,
      partMitoyenne: p.perimetre > 0 ? 1 - p.perimetreExpose / p.perimetre : 0,
      volume: surfaceChauffee * p.hsp,
      facades: facades,
      vitrages: vitrages,
      murs: facades - vitrages,
      toiture: p.surfaceSol,
      plancher: p.surfaceSol,
      lPonts: p.perimetreExpose * (p.niveaux + 1)
    };
  }

  function deperditions(p, g, D) {
    const nAir = (p.nVent * (1 - p.recuperation) + p.nInf) * p.facteurAir;
    const h = {
      murs: p.uMur * g.murs,
      vitrages: p.uw * g.vitrages,
      toiture: p.uToit * g.toiture,
      plancher: uPlancherEffectif(p, D) * g.plancher,
      ponts: p.psi * g.lPonts,
      air: D.v('air.rhoC') * nAir * g.volume
    };
    h.total = h.murs + h.vitrages + h.toiture + h.plancher + h.ponts + h.air;
    h.nAir = nAir;
    return h;
  }

  function besoinChauffage(hTotal, p) {
    return hTotal * p.dju * 24 / 1000 * p.intermittence * p.facteurRegulation * p.facteurComportement;
  }

  function besoinEcs(p, g, D) {
    if (p.famille === 'logement') {
      return p.occupants * D.v('ecs.litres') * D.v('eau.c') * (D.v('ecs.tChaude') - D.v('ecs.tFroide')) * 365 / 1000 * p.facteurEcs;
    }
    return p.ecsRatio * g.surfaceChauffee * p.facteurEcs;
  }

  // Production d'eau chaude : énergie et rendement (« avec le chauffage » suit le générateur de chauffage).
  function systemeEcs(p, D) {
    if (p.ecs === 'avec-chauffage') {
      return { energie: p.energieChauffage, rendement: p.rendementChauffage * D.v('ecs.avec-chauffage.facteur') };
    }
    const c = D.H.CHOIX.ecs.find(function (x) { return x.id === p.ecs; });
    return { energie: c.energie, rendement: D.v('ecs.' + p.ecs + '.rendement') };
  }

  // Coûts, énergie primaire et CO₂ d'une liste d'usages { id, energie, ef }.
  function bilan(usages, surfaceChauffee, famille, D) {
    const parEnergie = {};
    const total = { ef: 0, ep: 0, co2: 0, cout: 0, ep5: 0, co25: 0 };
    const lignes = usages.map(function (u) {
      const ep = u.ef * D.v('energie.' + u.energie + '.ep');
      const co2 = u.ef * D.v(u.energie === 'electricite' ? 'energie.electricite.co2.' + u.id : 'energie.' + u.energie + '.co2');
      const pcsPci = u.energie === 'gaz' ? D.v('energie.gaz.pcsPci') : 1;
      const facture = u.ef * pcsPci;
      const cout = facture * D.v('energie.' + u.energie + '.prix');
      const e = parEnergie[u.energie] || (parEnergie[u.energie] = { ef: 0, facture: 0, cout: 0, ep: 0, co2: 0 });
      e.ef += u.ef; e.facture += facture; e.cout += cout; e.ep += ep; e.co2 += co2;
      total.ef += u.ef; total.ep += ep; total.co2 += co2; total.cout += cout;
      if (u.id !== 'autres') { total.ep5 += ep; total.co25 += co2; }
      return Object.assign({}, u, { ep: ep, co2: co2, facture: facture, cout: cout });
    });
    const s = surfaceChauffee;
    const ratios = { ef: total.ef / s, ep5: total.ep5 / s, co25: total.co25 / s };
    return {
      usages: lignes, parEnergie: parEnergie, total: total, ratios: ratios,
      etiquette: famille === 'logement' ? etiquetteDpe(ratios.ep5, ratios.co25, D) : null
    };
  }

  function classe(valeur, prefixe, D) {
    const lettres = ['A', 'B', 'C', 'D', 'E', 'F'];
    for (let i = 0; i < lettres.length; i++) if (valeur <= D.v(prefixe + lettres[i])) return lettres[i];
    return 'G';
  }

  function etiquetteDpe(ep, co2, D) {
    const energie = classe(ep, 'dpe.ep.', D), climat = classe(co2, 'dpe.ges.', D);
    return { energie: energie, climat: climat, classe: energie > climat ? energie : climat };
  }

  // Le calcul complet pour des paramètres chiffrés.
  function calculer(p, D) {
    const g = geometrie(p);
    const h = deperditions(p, g, D);
    const besoin = besoinChauffage(h.total, p);
    const ecs = systemeEcs(p, D);
    const bEcs = besoinEcs(p, g, D);
    const usages = [
      { id: 'chauffage', energie: p.energieChauffage, besoin: besoin, ef: besoin / p.rendementChauffage },
      { id: 'ecs', energie: ecs.energie, besoin: bEcs, ef: bEcs / ecs.rendement },
      { id: 'froid', energie: 'electricite', ef: p.partClim * g.surfaceChauffee * p.besoinFroid / p.seer },
      { id: 'eclairage', energie: 'electricite', ef: p.eclairage * g.surfaceChauffee },
      { id: 'auxiliaires', energie: 'electricite', ef: (p.auxVentilation + (p.hydraulique ? p.auxHydraulique : 0)) * g.surfaceChauffee },
      { id: 'autres', energie: 'electricite', ef: p.autres * g.surfaceChauffee }
    ];
    const b = bilan(usages, g.surfaceChauffee, p.famille, D);
    return Object.assign(b, {
      geometrie: g,
      deperditions: h,
      besoinChauffage: besoin,
      hParM2: h.total / g.surfaceChauffee,
      puissance: h.total * (p.ti - p.tbase) / 1000
    });
  }

  /* ---------- 4. La fourchette ---------- */

  // Seule une réponse saisie par toi est « sûre » ; une énergie lue dans la BDNB laisse le système supposé.
  function cleIncert(prefixe, origine) {
    return prefixe + (origine === 'saisie' ? 'saisie' : 'deduite');
  }

  // Chaque facteur : les paramètres qu'il fait bouger, son incertitude selon l'origine,
  // et ce qu'il faut regarder en visite pour la réduire.
  const FACTEURS = [
    { cle: 'surface', nom: 'Surface chauffée', champs: ['surfacePlancher'],
      incert: function (o) { return 'incert.surface.' + (o === 'saisie' ? 'saisie' : o === 'carte' ? 'carte' : 'deduite'); },
      visite: 'Mesurer ou demander les plans (surface chauffée réelle, niveaux, sous-sol).' },
    { cle: 'murs', nom: 'Isolation des murs', champs: ['uMur'], incert: function (o) { return cleIncert('incert.paroi.', o); },
      visite: 'Épaisseur des murs, doublage (taper, regarder une prise électrique), isolant visible.' },
    { cle: 'toiture', nom: 'Isolation de la toiture', champs: ['uToit'], incert: function (o) { return cleIncert('incert.paroi.', o); },
      visite: 'Monter dans les combles : épaisseur et état de l’isolant ; terrasse : année de l’étanchéité.' },
    { cle: 'vitrage', nom: 'Fenêtres', champs: ['uw'], incert: function (o) { return cleIncert('incert.vitrage.', o); },
      visite: 'Type de vitrage (date sur l’intercalaire), menuiseries, état des joints.' },
    { cle: 'plancher', nom: 'Plancher bas', champs: ['uPlancher'], incert: function (o) { return cleIncert('incert.paroi.', o); },
      visite: 'Sous-sol ou vide sanitaire : isolant en sous-face ?' },
    { cle: 'ventilation', nom: 'Renouvellement d’air', champs: ['facteurAir'], incert: function (o) { return cleIncert('incert.air.', o); },
      visite: 'Bouches et caisson de VMC, entrées d’air, fuites autour des menuiseries.' },
    { cle: 'chauffage', nom: 'Rendement du chauffage', champs: ['rendementChauffage'], incert: function (o) { return cleIncert('incert.rendement.', o); },
      visite: 'Plaque signalétique du générateur : année, puissance, condensation.' },
    { cle: 'climat', nom: 'Climat (DJU)', champs: ['dju'], incert: function () { return 'incert.climat'; },
      visite: 'Prendre les DJU de la station météo la plus proche (et l’altitude).' },
    { cle: 'tauxVitrage', nom: 'Surface vitrée', champs: ['tauxVitrage'], incert: function () { return 'incert.tauxVitrage'; },
      visite: 'Compter les fenêtres façade par façade.' },
    { cle: 'occupants', nom: 'Eau chaude (occupants)', champs: ['facteurEcs'], incert: function (o) { return cleIncert('incert.ecs.', o); },
      visite: 'Nombre d’occupants, production et stockage d’eau chaude.' },
    { cle: 'ratios', nom: 'Éclairage et équipements', champs: ['eclairage', 'autres', 'auxVentilation', 'besoinFroid'],
      incert: function () { return 'incert.ratios'; },
      visite: 'Type d’éclairage, équipements, serveurs, climatisation.' },
    { cle: 'comportement', nom: 'Occupation et consigne', champs: ['facteurComportement'], incert: function () { return 'incert.comportement'; },
      visite: 'Demander les factures des 3 dernières années : elles calent tout le modèle.' }
  ];

  function niveauFiabilite(rel, D) {
    return rel <= D.v('fiab.bonne') ? 'bonne' : rel <= D.v('fiab.moyenne') ? 'moyenne' : 'faible';
  }

  function incertitude(p, origines, D) {
    const base = calculer(p, D).total.ef;
    const contributions = FACTEURS.map(function (f) {
      const o = (origines[f.cle] || {}).origine;
      const u = D.v(f.incert(o));
      const bas = cloner(p), haut = cloner(p);
      f.champs.forEach(function (c) { bas[c] = p[c] * (1 - u); haut[c] = p[c] * (1 + u); });
      const delta = Math.abs(calculer(haut, D).total.ef - calculer(bas, D).total.ef) / 2;
      return { cle: f.cle, nom: f.nom, incertitude: u, origine: o || 'deduite', delta: delta, visite: f.visite };
    }).sort(function (a, b) { return b.delta - a.delta; });
    const delta = Math.sqrt(contributions.reduce(function (s, c) { return s + c.delta * c.delta; }, 0));
    const rel = base > 0 ? delta / base : 0;
    return { base: base, delta: delta, rel: rel, fiabilite: niveauFiabilite(rel, D), contributions: contributions };
  }

  /* ---------- 5. Calage sur les factures ---------- */

  // factures = { energie: kWh lus sur les factures } → { energie: k } (seulement les énergies calculées).
  function coefficientsCalage(resultat, factures) {
    const coefs = {};
    Object.keys(factures || {}).forEach(function (e) {
      const f = Number(factures[e]);
      const modele = resultat.parEnergie[e];
      if (f > 0 && modele && modele.facture > 0) coefs[e] = f / modele.facture;
    });
    return coefs;
  }

  // Factures d'une énergie que le modèle n'utilise pas : souvent un chauffage mal renseigné.
  function facturesSansModele(resultat, factures) {
    return Object.keys(factures || {}).filter(function (e) { return Number(factures[e]) > 0 && !resultat.parEnergie[e]; });
  }

  // Chaque usage garde le k de son énergie à l'état initial (1 si non calé).
  function calageParUsage(resultat, coefs) {
    const k = {};
    resultat.usages.forEach(function (u) { k[u.id] = coefs[u.energie] || 1; });
    return k;
  }

  function appliquerCalage(resultat, kUsages, famille, D) {
    if (!kUsages) return resultat;
    const usages = resultat.usages.map(function (u) {
      return { id: u.id, energie: u.energie, besoin: u.besoin, ef: u.ef * (kUsages[u.id] || 1) };
    });
    return Object.assign({}, resultat, bilan(usages, resultat.geometrie.surfaceChauffee, famille, D));
  }

  /* ---------- 6. Rentabilité ---------- */

  function fluxActualise(economie, t, inflation, actualisation) {
    return economie * Math.pow(1 + inflation, t - 1) / Math.pow(1 + actualisation, t);
  }

  function tempsRetourBrut(cout, economie) {
    return economie > 0 ? cout / economie : null;
  }

  // Interpolation linéaire dans l'année où le cumul dépasse le coût. null = jamais (dans l'horizon).
  function tempsRetourActualise(cout, economie, inflation, actualisation, horizon) {
    if (!(economie > 0)) return null;
    let cumul = 0;
    for (let t = 1; t <= horizon; t++) {
      const flux = fluxActualise(economie, t, inflation, actualisation);
      if (cumul + flux >= cout) return t - 1 + (cout - cumul) / flux;
      cumul += flux;
    }
    return null;
  }

  function van(cout, economie, inflation, actualisation, duree) {
    let cumul = 0;
    for (let t = 1; t <= duree; t++) cumul += fluxActualise(economie, t, inflation, actualisation);
    return cumul - cout;
  }

  // Cumul actualisé année par année (pour la courbe de trésorerie), en partant de − coût.
  function tresorerie(cout, economie, inflation, actualisation, duree) {
    const points = [-cout];
    for (let t = 1; t <= duree; t++) points.push(points[t - 1] + fluxActualise(economie, t, inflation, actualisation));
    return points;
  }

  function verdict(tra, duree, seuil) {
    if (tra === null) return 'non';
    if (tra <= seuil * duree) return 'afaire';
    if (tra <= duree) return 'discuter';
    return 'non';
  }

  /* ---------- 7. Les actions possibles ----------
     etat(p) : { etat: 'ok' | 'deja' | 'sansObjet', raison }
     appliquer(p) : les paramètres après travaux ; quantite(p, r) : ce qu'on chiffre. */

  const ok = { etat: 'ok', raison: '' };
  const deja = function (raison) { return { etat: 'deja', raison: raison }; };
  const sansObjet = function (raison) { return { etat: 'sansObjet', raison: raison }; };
  const avec = function (p, modifs) { return Object.assign(cloner(p), modifs); };

  const ACTIONS = [
    { id: 'combles', famille: 'toiture', nom: 'Isoler les combles', icone: 'toit', cout: 'cout.combles', duree: 'duree.combles',
      etat: function (p) {
        if (p.toitureType !== 'combles') return sansObjet('Toiture-terrasse');
        return p.uToit > 0.3 ? ok : deja('Combles déjà bien isolés : pas utile d’en rajouter');
      },
      appliquer: function (p, D) { return avec(p, { uToit: D.v('action.combles.u') }); },
      quantite: function (p, r) { return { valeur: r.geometrie.toiture, unite: 'm²' }; },
      note: 'Soufflage de laine minérale ou de ouate : travaux rapides, souvent la première action.' },
    { id: 'terrasse', famille: 'toiture', nom: 'Isoler la toiture-terrasse', icone: 'toit', cout: 'cout.terrasse', duree: 'duree.terrasse',
      etat: function (p) {
        if (p.toitureType !== 'terrasse') return sansObjet('Toiture en combles');
        return p.uToit > 0.35 ? ok : deja('Terrasse déjà isolée');
      },
      appliquer: function (p, D) { return avec(p, { uToit: D.v('action.terrasse.u') }); },
      quantite: function (p, r) { return { valeur: r.geometrie.toiture, unite: 'm²' }; },
      note: 'Le plus rentable au moment de refaire l’étanchéité : le surcoût de l’isolant est alors faible.' },
    { id: 'ite', famille: 'murs', nom: 'Isoler les murs par l’extérieur', icone: 'mur', cout: 'cout.ite', duree: 'duree.ite',
      etat: function (p) { return p.uMur > 0.45 ? ok : deja('Murs déjà isolés'); },
      appliquer: function (p, D) { return avec(p, { uMur: D.v('action.ite.u'), psi: D.v('psi.ite'), isolationMurs: 'ite' }); },
      quantite: function (p, r) { return { valeur: r.geometrie.murs, unite: 'm² de mur' }; },
      note: 'Traite aussi les ponts thermiques des planchers. Attention aux façades protégées (ABF).' },
    { id: 'iti', famille: 'murs', nom: 'Isoler les murs par l’intérieur', icone: 'mur', cout: 'cout.iti', duree: 'duree.iti',
      etat: function (p) { return p.uMur > 0.45 ? ok : deja('Murs déjà isolés'); },
      appliquer: function (p, D) { return avec(p, { uMur: D.v('action.iti.u'), psi: D.v('psi.iti'), isolationMurs: 'iti' }); },
      quantite: function (p, r) { return { valeur: r.geometrie.murs, unite: 'm² de mur' }; },
      note: 'Moins cher, mais les ponts thermiques des planchers restent et on perd un peu de surface.' },
    { id: 'plancher', famille: 'plancher', nom: 'Isoler le plancher bas', icone: 'plancher', cout: 'cout.plancher', duree: 'duree.plancher',
      etat: function (p) {
        if (p.plancherType === 'terre-plein') return sansObjet('Plancher sur terre-plein : isolation lourde, seulement en rénovation complète');
        return p.uPlancher > 0.5 ? ok : deja('Plancher déjà isolé');
      },
      appliquer: function (p, D) { return avec(p, { uPlancher: D.v('action.plancher.u') }); },
      quantite: function (p, r) { return { valeur: r.geometrie.plancher, unite: 'm²' }; },
      note: 'Panneaux ou flocage en sous-face, par le sous-sol ou le vide sanitaire (s’il est accessible).' },
    { id: 'menuiseries', famille: 'menuiseries', nom: 'Changer les fenêtres', icone: 'fenetre', cout: 'cout.menuiseries', duree: 'duree.menuiseries',
      etat: function (p) {
        if (p.vitrage === 'triple') return deja('Déjà du triple vitrage');
        return p.uw > 2 ? ok : deja('Déjà du double vitrage récent : les changer ne serait pas rentable');
      },
      appliquer: function (p, D) {
        return avec(p, { uw: D.v('action.menuiseries.uw'), vitrage: 'double-recent',
          nInf: p.nInf - D.v('infiltration.vitrage.' + p.vitrage) });
      },
      quantite: function (p, r) { return { valeur: r.geometrie.vitrages, unite: 'm² de baie' }; },
      note: 'Gain de confort important (paroi froide, courants d’air) ; prévoir les entrées d’air de la ventilation.' },
    { id: 'hygro', famille: 'ventilation', nom: 'VMC hygroréglable', icone: 'ventilation', cout: 'cout.hygro', duree: 'duree.ventilation',
      etat: function (p) {
        if (p.famille !== 'logement') return sansObjet('Tertiaire : voir le double flux');
        return p.ventilation === 'naturelle' || p.ventilation === 'vmc-auto' ? ok : deja('Ventilation déjà performante');
      },
      appliquer: function (p, D) {
        return avec(p, { ventilation: 'vmc-hygro', nVent: D.v('ventilation.vmc-hygro.n'), recuperation: 0, auxVentilation: D.v('aux.vmc-hygro') });
      },
      quantite: function (p, r) { return { valeur: r.geometrie.surfaceChauffee, unite: 'm²' }; },
      note: 'Le débit suit l’humidité : moins d’air chauffé pour rien, et un air sain après isolation.' },
    { id: 'double-flux', famille: 'ventilation', nom: 'Ventilation double flux', icone: 'ventilation', cout: 'cout.df', duree: 'duree.ventilation',
      etat: function (p) {
        if (p.famille === 'logement') return sansObjet('Logement : voir la VMC hygroréglable');
        return p.ventilation === 'double-flux' ? deja('Déjà en double flux') : ok;
      },
      appliquer: function (p, D) {
        return avec(p, { ventilation: 'double-flux', nVent: D.v('ventilation.double-flux.n'),
          recuperation: D.v('ventilation.double-flux.recuperation'), auxVentilation: D.v('aux.double-flux') });
      },
      quantite: function (p, r) { return { valeur: r.geometrie.surfaceChauffee, unite: 'm²' }; },
      note: 'Récupère la chaleur de l’air extrait ; demande de la place pour les gaines et un bâtiment étanche.' },
    { id: 'regulation', famille: 'regulation', nom: 'Programmer et réguler', icone: 'thermostat', duree: 'duree.regulation',
      cout: function (p) { return p.famille === 'logement' ? 'cout.robinets' : 'cout.gtb'; },
      etat: function (p) { return p.regulation === 'performante' ? deja('Régulation déjà performante') : ok; },
      appliquer: function (p, D) { return avec(p, { regulation: 'performante', facteurRegulation: D.v('regulation.performante.facteur') }); },
      quantite: function (p, r, D) {
        if (p.famille === 'logement') return { valeur: Math.ceil(r.geometrie.surfaceChauffee / D.v('action.robinets.m2')), unite: 'robinets' };
        return { valeur: r.geometrie.surfaceChauffee, unite: 'm²' };
      },
      note: 'Robinets thermostatiques, programmation, réduits de nuit : peu cher, souvent très rentable.' },
    { id: 'pac-air-eau', famille: 'chauffage', nom: 'Pompe à chaleur air/eau', icone: 'pac', cout: 'cout.pac', duree: 'duree.pac',
      etat: function (p) {
        if (p.chauffage === 'pac-air-eau' || p.chauffage === 'pac-air-air') return deja('Déjà une pompe à chaleur');
        if (!p.hydraulique) return sansObjet('Pas de radiateurs à eau : voir la PAC air/air');
        if (p.energieChauffage === 'bois-buches' || p.energieChauffage === 'bois-granules' || p.energieChauffage === 'reseau-chaleur') {
          return sansObjet('Déjà une énergie renouvelable ou un réseau de chaleur');
        }
        return ok;
      },
      appliquer: function (p, D) {
        return avec(p, { chauffage: 'pac-air-eau', energieChauffage: 'electricite', hydraulique: true,
          rendementChauffage: D.v('chauffage.pac-air-eau.rendement') });
      },
      quantite: function (p, r, D) { return { valeur: r.puissance * D.v('action.pac.surpuissance'), unite: 'kW' }; },
      note: 'Dimensionnée sur les déperditions APRÈS isolation (dans un bouquet) : isoler d’abord = PAC plus petite.' },
    { id: 'condensation', famille: 'chauffage', nom: 'Chaudière à condensation', icone: 'flamme', cout: 'cout.condensation', duree: 'duree.condensation',
      etat: function (p) {
        if (p.chauffage === 'gaz-condensation') return deja('Déjà une chaudière à condensation');
        if (p.chauffage === 'fioul') return sansObjet('Chaudière fioul neuve interdite depuis juillet 2022 : changer d’énergie');
        return p.chauffage === 'gaz-ancienne' || p.chauffage === 'propane' ? ok : sansObjet('Pas de chaudière gaz');
      },
      appliquer: function (p, D) {
        return avec(p, { chauffage: p.chauffage === 'propane' ? 'propane' : 'gaz-condensation',
          rendementChauffage: D.v('chauffage.gaz-condensation.rendement') });
      },
      quantite: function (p, r, D) { return { valeur: r.puissance * D.v('action.pac.surpuissance'), unite: 'kW' }; },
      note: 'Même énergie, meilleur rendement ; vérifier que les radiateurs permettent une eau plus basse.' },
    { id: 'pac-air-air', famille: 'chauffage', nom: 'PAC air/air (clim réversible)', icone: 'pac', cout: 'cout.pacAirAir', duree: 'duree.pac',
      etat: function (p) {
        if (p.chauffage === 'pac-air-air') return deja('Déjà une PAC air/air');
        return p.chauffage === 'electrique' ? ok : sansObjet('Réservée aux bâtiments chauffés par radiateurs électriques');
      },
      appliquer: function (p, D) {
        return avec(p, { chauffage: 'pac-air-air', energieChauffage: 'electricite', hydraulique: false,
          rendementChauffage: D.v('chauffage.pac-air-air.rendement'), partClim: Math.max(p.partClim, D.v('clim.partielle.part')) });
      },
      quantite: function (p, r, D) { return { valeur: r.puissance * D.v('action.pac.surpuissance'), unite: 'kW' }; },
      note: 'Elle climatise aussi : la consommation d’été est comptée (climatisation partielle).' },
    { id: 'ecs-thermo', famille: 'ecs', nom: 'Ballon thermodynamique', icone: 'goutte', cout: 'cout.ecsThermo', duree: 'duree.ecs',
      etat: function (p) {
        if (p.ecs === 'thermodynamique') return deja('Déjà un ballon thermodynamique');
        return p.ecs === 'ballon-electrique' ? ok : sansObjet('Eau chaude produite autrement qu’au ballon électrique');
      },
      appliquer: function (p) { return avec(p, { ecs: 'thermodynamique' }); },
      quantite: function (p, r, D) {
        if (p.famille === 'logement') return { valeur: p.logements, unite: 'ballon(s)' };
        return { valeur: Math.max(1, Math.ceil(r.geometrie.surfaceChauffee / D.v('action.ecs.m2'))), unite: 'ballon(s)' };
      },
      note: 'Une petite PAC sur le ballon : environ 2,5 fois moins d’électricité pour l’eau chaude.' },
    { id: 'led', famille: 'eclairage', nom: 'Passer l’éclairage en LED', icone: 'ampoule', cout: 'cout.led', duree: 'duree.led',
      etat: function (p) { return p.famille === 'logement' ? sansObjet('Logement : à la charge des occupants') : ok; },
      appliquer: function (p, D) { return avec(p, { eclairage: p.eclairage * (1 - D.v('action.led.gain')) }); },
      quantite: function (p, r) { return { valeur: r.geometrie.surfaceChauffee, unite: 'm²' }; },
      note: 'Avec détection de présence et gradation. Sans objet si l’éclairage est déjà en LED.' }
  ];

  // Ordre de calcul d'un bouquet : l'enveloppe d'abord, puis la ventilation, la régulation et les systèmes.
  const ORDRE_FAMILLES = ['toiture', 'murs', 'plancher', 'menuiseries', 'ventilation', 'regulation', 'chauffage', 'ecs', 'eclairage'];

  function cleCout(def, p) {
    return typeof def.cout === 'function' ? def.cout(p) : def.cout;
  }

  // Coût TTC (bas, haut) : quantité × ratio HT × (1 + frais) × (1 + TVA).
  function chiffrer(def, p, r, D) {
    const q = def.quantite(p, r, D);
    const cle = cleCout(def, p);
    const tva = D.v(p.famille === 'logement' ? 'eco.tva.logement' : 'eco.tva.tertiaire');
    const coef = (1 + D.v('eco.frais')) * (1 + tva);
    const bas = q.valeur * D.v(cle + '.bas') * coef, haut = q.valeur * D.v(cle + '.haut') * coef;
    return { quantite: q, bas: bas, haut: haut, moyen: (bas + haut) / 2, tva: tva };
  }

  // Une action seule, sur le bâtiment de départ (calé sur les factures si tu en as donné).
  function evaluerAction(def, p, base, kUsages, rel, D) {
    const etat = def.etat(p, D);
    if (etat.etat !== 'ok') return { id: def.id, def: def, etat: etat };
    const apres = calculer(def.appliquer(p, D), D);
    const avantCal = appliquerCalage(base, kUsages, p.famille, D), apresCal = appliquerCalage(apres, kUsages, p.famille, D);
    const economie = avantCal.total.cout - apresCal.total.cout;
    const cout = chiffrer(def, p, base, D);
    const i = D.v('eco.inflation'), a = D.v('eco.actualisation'), duree = D.v(def.duree);
    const tra = tempsRetourActualise(cout.moyen, economie, i, a, D.v('eco.horizon'));
    const ecoBas = economie * (1 - rel), ecoHaut = economie * (1 + rel);
    return {
      id: def.id, def: def, etat: etat,
      gainEf: avantCal.total.ef - apresCal.total.ef,
      gainPart: (avantCal.total.ef - apresCal.total.ef) / avantCal.total.ef,
      gainCo2: avantCal.total.co2 - apresCal.total.co2,
      gainEp5: avantCal.total.ep5 - apresCal.total.ep5,
      economie: economie, economieBas: ecoBas, economieHaut: ecoHaut,
      cout: cout, duree: duree,
      trb: tempsRetourBrut(cout.moyen, economie),
      trbBas: ecoHaut > 0 ? cout.bas / ecoHaut : null,
      trbHaut: ecoBas > 0 ? cout.haut / ecoBas : null,
      tra: tra,
      van: van(cout.moyen, economie, i, a, duree),
      tresorerie: tresorerie(cout.moyen, economie, i, a, duree),
      verdict: verdict(tra, duree, D.v('eco.seuil.afaire'))
    };
  }

  // Dans chaque famille (ex. murs : ITE ou ITI), on retient la variante à la meilleure VAN.
  function choisirParFamille(evaluations) {
    const choix = {};
    evaluations.filter(function (e) { return e.etat.etat === 'ok'; }).forEach(function (e) {
      const f = e.def.famille;
      if (!choix[f] || e.van > choix[f].van) choix[f] = e;
    });
    return choix;
  }

  // Un bouquet, action après action, dans l'ordre : les gains ne s'additionnent pas.
  function evaluerBouquet(ids, p0, base, kUsages, rel, D) {
    let p = p0, r = base;
    const baseCal = appliquerCalage(base, kUsages, p0.famille, D);
    const etapes = [];
    ORDRE_FAMILLES.forEach(function (famille) {
      ACTIONS.filter(function (d) { return d.famille === famille && ids.indexOf(d.id) >= 0; }).forEach(function (def) {
        if (def.etat(p, D).etat !== 'ok') return;
        const cout = chiffrer(def, p, r, D);
        const p2 = def.appliquer(p, D), r2 = calculer(p2, D);
        const avant = appliquerCalage(r, kUsages, p0.famille, D), apres = appliquerCalage(r2, kUsages, p0.famille, D);
        etapes.push({ id: def.id, nom: def.nom, icone: def.icone, cout: cout, efAvant: avant.total.ef, efApres: apres.total.ef,
          economie: avant.total.cout - apres.total.cout });
        p = p2; r = r2;
      });
    });
    const finCal = appliquerCalage(r, kUsages, p0.famille, D);
    const cout = etapes.reduce(function (s, e) { return { bas: s.bas + e.cout.bas, haut: s.haut + e.cout.haut }; }, { bas: 0, haut: 0 });
    cout.moyen = (cout.bas + cout.haut) / 2;
    const economie = baseCal.total.cout - finCal.total.cout;
    const i = D.v('eco.inflation'), a = D.v('eco.actualisation');
    return {
      etapes: etapes, ids: etapes.map(function (e) { return e.id; }),
      avant: baseCal, apres: finCal, params: p,
      gainPart: (baseCal.total.ef - finCal.total.ef) / baseCal.total.ef,
      economie: economie, economieBas: economie * (1 - rel), economieHaut: economie * (1 + rel),
      cout: cout,
      trb: tempsRetourBrut(cout.moyen, economie),
      tra: tempsRetourActualise(cout.moyen, economie, i, a, D.v('eco.horizon')),
      gainCo2: baseCal.total.co2 - finCal.total.co2,
      puissanceApres: r.puissance
    };
  }

  /* ---------- 8. Tout le pré-diagnostic ---------- */

  // entrees : réponses + carte ; factures : { energie: kWh } ; modifs : tes valeurs de l'onglet Données ;
  // options : { validees: { id: date }, djuFactures: DJU de l'année des factures (facultatif) }.
  function diagnostiquer(entrees, factures, H, modifs, options) {
    const o = options || {};
    const D = creerDonnees(H, modifs, o.validees);
    const c = completer(entrees, D);
    if (c.manque.length) return { manque: c.manque, origines: c.origines };
    const p = c.params;
    const modele = calculer(p, D);
    const inc = incertitude(p, c.origines, D);

    // Calage : on compare les factures au bâtiment calculé avec le climat de LEUR année (point 10).
    const djuFactures = Number(o.djuFactures) > 0 ? Number(o.djuFactures) : null;
    const modeleFactures = djuFactures ? calculer(Object.assign({}, p, { dju: djuFactures }), D) : modele;
    const coefs = coefficientsCalage(modeleFactures, factures);
    const cale = Object.keys(coefs).length > 0;
    const kUsages = cale ? calageParUsage(modele, coefs) : null;
    const resultat = appliquerCalage(modele, kUsages, p.famille, D);

    // Fourchette : énergie calée → incertitude des factures ; sinon celle du modèle.
    let delta = inc.delta;
    if (cale) {
      const uf = D.v('incert.facture');
      delta = Math.sqrt(Object.keys(resultat.parEnergie).reduce(function (s, e) {
        const ue = coefs[e] ? uf : inc.rel;
        return s + Math.pow(resultat.parEnergie[e].ef * ue, 2);
      }, 0));
    }
    const rel = resultat.total.ef > 0 ? delta / resultat.total.ef : 0;

    const evaluations = ACTIONS.map(function (def) { return evaluerAction(def, p, modele, kUsages, rel, D); });
    const choix = choisirParFamille(evaluations);
    const familles = ORDRE_FAMILLES.filter(function (f) { return choix[f]; });
    const selection = function (verdicts) {
      return familles.filter(function (f) { return verdicts.indexOf(choix[f].verdict) >= 0; }).map(function (f) { return choix[f].id; });
    };
    const bouquets = [
      { id: 'rentables', nom: 'Ce qui vaut le coup', ids: selection(['afaire']) },
      { id: 'conseille', nom: 'Rentable + à discuter', ids: selection(['afaire', 'discuter']) },
      { id: 'complet', nom: 'Rénovation complète', ids: familles.map(function (f) { return choix[f].id; }) }
    ].filter(function (b) { return b.ids.length; }).map(function (b) {
      return Object.assign(b, evaluerBouquet(b.ids, p, modele, kUsages, rel, D));
    }).filter(function (b, i, t) {
      return !t.slice(0, i).some(function (x) { return x.ids.join() === b.ids.join(); });
    });

    return {
      manque: [],
      params: p, origines: c.origines,
      modele: modele, resultat: resultat,
      incertitude: inc, delta: delta, rel: rel, deltaCout: resultat.total.cout * rel,
      fiabilite: niveauFiabilite(rel, D),
      calage: { actif: cale, coefs: coefs, sansModele: facturesSansModele(modele, factures), djuFactures: djuFactures, djuNormal: p.dju,
        ecartClimat: djuFactures ? djuFactures / p.dju - 1 : 0, modeleFactures: modeleFactures },
      actions: evaluations, choix: choix, bouquets: bouquets,
      exemples: valeursExemple(D)
    };
  }

  /* ---------- 9. Les valeurs qui pèsent le plus (point 11 en haut du fichier) ---------- */

  function elasticite(apres, avant, pas) {
    return avant ? Math.abs(apres / avant - 1) / pas : 0;
  }

  function influences(entrees, factures, H, modifs, options, pas) {
    const ecart = pas || 0.1;
    const base = diagnostiquer(entrees, factures, H, modifs, options);
    if (base.manque.length) return [];
    return base.exemples.map(function (x) {
      const v = modifs && estModifiee(modifs, x.id) ? modifs[x.id] : x.valeur;
      if (!v) return null; // une valeur nulle ne se pousse pas de 10 %
      const m = Object.assign({}, modifs);
      m[x.id] = v * (1 + ecart);
      const r = diagnostiquer(entrees, factures, H, m, options);
      // Temps de retour : seulement les actions ✅ ou 🟠 (celles qui comptent pour décider).
      let retour = 0, verdicts = 0;
      base.actions.forEach(function (a) {
        if (a.etat.etat !== 'ok') return;
        const b = r.actions.find(function (y) { return y.id === a.id; });
        if (!b || b.etat.etat !== 'ok' || b.verdict !== a.verdict) verdicts++;
        if (b && a.tra && b.tra && a.verdict !== 'non') retour = Math.max(retour, elasticite(b.tra, a.tra, ecart));
      });
      const conso = elasticite(r.resultat.total.ef, base.resultat.total.ef, ecart);
      const facture = elasticite(r.resultat.total.cout, base.resultat.total.cout, ecart);
      return { id: x.id, entree: x, valeur: v, conso: conso, facture: facture, retour: retour, verdicts: verdicts,
        poids: Math.max(conso, facture, retour) + verdicts };
    }).filter(Boolean).sort(function (a, b) { return b.poids - a.poids; });
  }

  // Le même classement sur plusieurs bâtiments types : on garde, pour chaque valeur, son poids le plus fort.
  function influencesSurCas(liste, H, modifs, options) {
    const parId = {};
    liste.forEach(function (cas) {
      influences(cas.entrees, cas.factures || {}, H, modifs, options).forEach(function (x) {
        if (!parId[x.id] || x.poids > parId[x.id].poids) parId[x.id] = Object.assign({}, x, { cas: cas.nom });
      });
    });
    return Object.keys(parId).map(function (id) { return parId[id]; }).sort(function (a, b) { return b.poids - a.poids; });
  }

  /* ---------- 10. Les cas de référence (point 12 en haut du fichier) ----------
     cas = { entrees, factures, djuFactures } : un bâtiment dont tu connais les factures.
     On compare le calcul SANS calage aux factures (sinon on se comparerait à soi-même).
     La fourchette utilisée est celle de la consommation totale (H : appliquée aux énergies facturées). */
  function evaluerCas(cas, H, modifs, options) {
    const D = creerDonnees(H, modifs, options && options.validees);
    const c = completer(cas.entrees, D);
    if (c.manque.length) return { manque: c.manque };
    const djuAnnee = Number(cas.djuFactures) > 0 ? Number(cas.djuFactures) : null;
    const modele = calculer(djuAnnee ? Object.assign({}, c.params, { dju: djuAnnee }) : c.params, D);
    const inc = incertitude(c.params, c.origines, D);
    let calcul = 0, factures = 0;
    const manquantes = [];
    Object.keys(cas.factures || {}).filter(function (e) { return Number(cas.factures[e]) > 0; }).forEach(function (e) {
      factures += Number(cas.factures[e]);
      if (modele.parEnergie[e]) calcul += modele.parEnergie[e].facture;
      else manquantes.push(e);
    });
    if (!(factures > 0)) return { manque: ['factures'] };
    return {
      manque: [], usage: c.params.usage, famille: c.params.famille, periode: c.params.periode, zone: c.params.zone,
      calcul: calcul, factures: factures, ecart: (calcul - factures) / factures, rel: inc.rel,
      dedans: Math.abs(calcul - factures) <= inc.rel * calcul, manquantes: manquantes
    };
  }

  function statistiquesCas(evaluations) {
    const ok = (evaluations || []).filter(function (e) { return e && !e.manque.length; });
    const n = ok.length;
    if (!n) return { n: 0 };
    const moyenne = function (t) { return t.reduce(function (s, x) { return s + x; }, 0) / n; };
    return {
      n: n,
      biais: moyenne(ok.map(function (e) { return e.ecart; })),
      ecartMoyen: moyenne(ok.map(function (e) { return Math.abs(e.ecart); })),
      partDedans: ok.filter(function (e) { return e.dedans; }).length / n
    };
  }

  const MoteurCalcul = {
    creerDonnees, valeursExemple, periodeDepuisAnnee, rangPeriode, zoneDepuisDepartement, chauffageDepuisEnergie,
    completer, uTerrePlein, uPlancherEffectif, geometrie, deperditions, besoinChauffage, besoinEcs, systemeEcs,
    bilan, etiquetteDpe, calculer, FACTEURS, incertitude, niveauFiabilite,
    coefficientsCalage, facturesSansModele, calageParUsage, appliquerCalage,
    fluxActualise, tempsRetourBrut, tempsRetourActualise, van, tresorerie, verdict,
    ACTIONS, ORDRE_FAMILLES, chiffrer, evaluerAction, choisirParFamille, evaluerBouquet, diagnostiquer,
    elasticite, influences, influencesSurCas, evaluerCas, statistiquesCas
  };

  global.MoteurCalcul = MoteurCalcul;
  if (typeof module !== 'undefined' && module.exports) module.exports = MoteurCalcul;
})(typeof window !== 'undefined' ? window : globalThis);
