/* ==========================================================
   CARTE — LOGIQUE (fonctions pures, sans réseau)
   Géométrie des bâtiments, lecture des réponses des services
   publics, adresses des services. Utilisé par l'outil et par
   la page de test de faisabilité.
   ----------------------------------------------------------
   1) Surface au sol d'un contour donné en longitude / latitude.
      On « déplie » localement la Terre en plan autour du bâtiment
      (à l'échelle d'un bâtiment, l'erreur est négligeable) :

        x = R × (λ − λ0) × cos φ0        y = R × (φ − φ0)        (angles en radians)

      puis formule du lacet (aire d'un polygone à partir de ses sommets) :

        A = | Σ (xᵢ × yᵢ₊₁ − xᵢ₊₁ × yᵢ) | / 2

      Exemple : carré de 0,0001° × 0,0001° à 45° de latitude, R = 6 371 008,8 m
        côté nord-sud = 6 371 008,8 × 0,0001 × π / 180          ≈ 11,12 m
        côté est-ouest = 11,12 × cos 45°                         ≈ 7,86 m
        A ≈ 11,12 × 7,86                                         ≈ 87,4 m²

   2) Nombre de niveaux : le nombre d'étages de la BD TOPO s'il existe (H : on
      suppose qu'il compte le rez-de-chaussée, à vérifier), sinon

        niveaux = arrondi(hauteur / hauteur d'un étage), au moins 1

   3) Surface de plancher approximative (brute, murs compris) :

        S plancher ≈ S au sol × niveaux

      Exemple : 20 m × 12 m = 240 m² au sol, hauteur 9,5 m, étage 3 m (H)
        niveaux = arrondi(9,5 / 3) = arrondi(3,17) = 3   →   240 × 3 = 720 m²

   4) Mitoyenneté : un côté du contour est mitoyen si au moins 2 de ses 3 points
      (au quart, au milieu, aux trois quarts) sont à moins de « tolérance » (1 m, H)
      d'un bâtiment voisin. Périmètre exposé = périmètre − côtés mitoyens.
      Exemple : deux maisons de 10 m × 10 m collées → 10 m mitoyens sur 40, 30 m exposés.

   5) Verdict d'un service (test de faisabilité) : ❌ s'il ne répond pas à une
      page web, 🟠 s'il répond mais lentement ou sans donnée utile ici, ✅ sinon.
   ========================================================== */
(function (global) {
  'use strict';

  /* ---------- 1. Géométrie ---------- */

  function enRadians(degres) {
    return degres * Math.PI / 180;
  }

  // Enlève le dernier sommet s'il répète le premier (contour « fermé » en GeoJSON).
  function sommetsOuverts(anneau) {
    const n = anneau.length;
    if (n > 1 && anneau[0][0] === anneau[n - 1][0] && anneau[0][1] === anneau[n - 1][1]) return anneau.slice(0, n - 1);
    return anneau.slice();
  }

  // Centre approximatif : moyenne des sommets (suffisant pour placer une étiquette ou mesurer une distance).
  function centre(anneau) {
    const s = sommetsOuverts(anneau);
    let lon = 0, lat = 0;
    s.forEach(function (p) { lon += p[0]; lat += p[1]; });
    return [lon / s.length, lat / s.length];
  }

  // Passe de [lon, lat] à des mètres [x, y] autour d'un point d'origine (dépliage local).
  function versMetres(point, origine, rayonTerre) {
    return [
      rayonTerre * enRadians(point[0] - origine[0]) * Math.cos(enRadians(origine[1])),
      rayonTerre * enRadians(point[1] - origine[1])
    ];
  }

  // Surface au sol (m²) d'un contour [[lon, lat], …]. Voir la formule en haut du fichier.
  function surfaceSolM2(anneau, rayonTerre) {
    const s = sommetsOuverts(anneau);
    if (s.length < 3) return 0;
    const c = centre(s);
    const xy = s.map(function (p) { return versMetres(p, c, rayonTerre); });
    let somme = 0;
    for (let i = 0; i < xy.length; i++) {
      const a = xy[i], b = xy[(i + 1) % xy.length];
      somme += a[0] * b[1] - b[0] * a[1];
    }
    return Math.abs(somme) / 2;
  }

  // Distance (m) entre deux points proches, même dépliage local que pour la surface.
  function distanceM(a, b, rayonTerre) {
    const m = versMetres(b, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], rayonTerre);
    const n = versMetres(a, [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], rayonTerre);
    return Math.hypot(m[0] - n[0], m[1] - n[1]);
  }

  function perimetreM(anneau, rayonTerre) {
    const s = sommetsOuverts(anneau);
    let total = 0;
    for (let i = 0; i < s.length; i++) total += distanceM(s[i], s[(i + 1) % s.length], rayonTerre);
    return total;
  }

  // Distance (m) d'un point à un segment, tout en mètres locaux.
  function distancePointSegment(p, a, b) {
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const l2 = dx * dx + dy * dy;
    const t = l2 > 0 ? Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / l2)) : 0;
    return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dy));
  }

  // Côtés mitoyens et périmètre exposé (voir le point 4 en haut du fichier).
  function mitoyennete(anneau, voisins, rayonTerre, tolerance) {
    const s = sommetsOuverts(anneau);
    const origine = centre(s);
    const m = function (p) { return versMetres(p, origine, rayonTerre); };
    const aretesVoisines = [];
    (voisins || []).forEach(function (v) {
      const vs = sommetsOuverts(v).map(m);
      for (let i = 0; i < vs.length; i++) aretesVoisines.push([vs[i], vs[(i + 1) % vs.length]]);
    });
    let perimetre = 0, mitoyen = 0;
    const cotes = s.map(function (p, i) {
      const a = m(p), b = m(s[(i + 1) % s.length]);
      const longueur = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const proches = [0.25, 0.5, 0.75].filter(function (t) {
        const q = [a[0] + t * (b[0] - a[0]), a[1] + t * (b[1] - a[1])];
        return aretesVoisines.some(function (ar) { return distancePointSegment(q, ar[0], ar[1]) <= tolerance; });
      }).length;
      const estMitoyen = proches >= 2;
      perimetre += longueur;
      if (estMitoyen) mitoyen += longueur;
      return { debut: p, fin: s[(i + 1) % s.length], longueur: longueur, mitoyen: estMitoyen };
    });
    return { perimetre: perimetre, mitoyen: mitoyen, expose: perimetre - mitoyen, part: perimetre > 0 ? mitoyen / perimetre : 0, cotes: cotes };
  }

  // Emprise d'un contour : [[ouest, sud], [est, nord]] (pour cadrer la carte sur le bâtiment).
  function emprise(anneau) {
    const lons = anneau.map(function (p) { return p[0]; }), lats = anneau.map(function (p) { return p[1]; });
    return [[Math.min.apply(null, lons), Math.min.apply(null, lats)], [Math.max.apply(null, lons), Math.max.apply(null, lats)]];
  }

  // Le point est-il dans le contour ? (on compte combien de bords une demi-droite traverse)
  function pointDansPolygone(point, anneau) {
    const s = sommetsOuverts(anneau);
    let dedans = false;
    for (let i = 0, j = s.length - 1; i < s.length; j = i++) {
      const xi = s[i][0], yi = s[i][1], xj = s[j][0], yj = s[j][1];
      const traverse = (yi > point[1]) !== (yj > point[1]) &&
        point[0] < (xj - xi) * (point[1] - yi) / (yj - yi) + xi;
      if (traverse) dedans = !dedans;
    }
    return dedans;
  }

  // Rectangle [ouest, sud, est, nord] (degrés) autour d'un point, à « rayon » mètres.
  function bboxAutour(lon, lat, rayonM, rayonTerre) {
    const dLat = rayonM / rayonTerre * 180 / Math.PI;
    const dLon = dLat / Math.cos(enRadians(lat));
    return [lon - dLon, lat - dLat, lon + dLon, lat + dLat];
  }

  // Numéro de la tuile de carte (schéma « XYZ » standard) qui contient le point.
  function lonLatVersTuile(lon, lat, z) {
    const n = Math.pow(2, z);
    const x = Math.floor((lon + 180) / 360 * n);
    const latR = enRadians(lat);
    const y = Math.floor((1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2 * n);
    return { x: x, y: y, z: z };
  }

  /* ---------- 2. Lire les contours renvoyés par les services ----------
     Certains services renvoient (latitude, longitude) au lieu de (longitude, latitude).
     On remet dans l'ordre en comparant à la latitude du point cherché. */
  function remettreLonLat(coord, latReference) {
    const p = [coord[0], coord[1]];
    return Math.abs(p[0] - latReference) < Math.abs(p[1] - latReference) ? [p[1], p[0]] : p;
  }

  // Contour extérieur du (premier) polygone d'une géométrie GeoJSON, en [lon, lat] 2D.
  function contourExterieur(geometrie, latReference) {
    if (!geometrie) return null;
    let anneau = null;
    if (geometrie.type === 'Polygon') anneau = geometrie.coordinates[0];
    else if (geometrie.type === 'MultiPolygon') anneau = geometrie.coordinates[0] && geometrie.coordinates[0][0];
    if (!anneau || anneau.length < 3) return null;
    return anneau.map(function (c) { return remettreLonLat(c, latReference); });
  }

  // Parmi des bâtiments GeoJSON, celui qui contient le point ; sinon le plus proche.
  function choisirBatiment(entites, lon, lat, rayonTerre) {
    let meilleur = null;
    (entites || []).forEach(function (f) {
      const anneau = contourExterieur(f.geometry, lat);
      if (!anneau) return;
      const dedans = pointDansPolygone([lon, lat], anneau);
      const distance = dedans ? 0 : distanceM([lon, lat], centre(anneau), rayonTerre);
      if (!meilleur || distance < meilleur.distance) meilleur = { entite: f, contour: anneau, distance: distance, dedans: dedans };
    });
    return meilleur;
  }

  // Coordonnées collées : « 43,6045 ; 1,4433 » ou « 43.6045, 1.4433 » (latitude puis longitude).
  function lireCoordonnees(texte) {
    const t = String(texte || '').trim();
    let morceaux;
    if (t.includes(';')) morceaux = t.split(';');
    else if (/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(t)) morceaux = t.split(',');
    else morceaux = t.split(/\s+/);
    if (morceaux.length !== 2) return null;
    const nombres = morceaux.map(function (m) { return Number(m.trim().replace(',', '.')); });
    if (!nombres.every(isFinite) || Math.abs(nombres[0]) > 90 || Math.abs(nombres[1]) > 180) return null;
    return { lat: nombres[0], lon: nombres[1] };
  }

  /* ---------- 3. Surface de plancher approximative ---------- */

  function niveauxDepuisHauteur(hauteur, hauteurEtage) {
    if (!(hauteur > 0) || !(hauteurEtage > 0)) return null;
    return Math.max(1, Math.round(hauteur / hauteurEtage));
  }

  // origine : 'bdtopo' (nombre d'étages donné), 'hauteur' (déduit de la hauteur) ou 'inconnue'
  function estimerSurface(surfaceSol, hauteur, etages, hauteurEtage) {
    let niveaux = null, origine = 'inconnue';
    if (etages > 0) { niveaux = Math.round(etages); origine = 'bdtopo'; }
    else {
      niveaux = niveauxDepuisHauteur(hauteur, hauteurEtage);
      if (niveaux) origine = 'hauteur';
    }
    return {
      surfaceSol: surfaceSol,
      niveaux: niveaux,
      origineNiveaux: origine,
      surfacePlancher: niveaux ? surfaceSol * niveaux : null
    };
  }

  /* ---------- 4. Lire ce que renvoient les services ---------- */

  // Premier champ non vide parmi plusieurs noms possibles (les noms exacts varient selon les versions : H).
  function premier(objet, cles) {
    if (!objet) return null;
    for (let i = 0; i < cles.length; i++) {
      const v = objet[cles[i]];
      if (v !== null && v !== undefined && v !== '') return { cle: cles[i], valeur: v };
    }
    return null;
  }

  function anneeDepuis(valeur) {
    const m = String(valeur === null || valeur === undefined ? '' : valeur).match(/(1[6-9]\d\d|20\d\d)/);
    return m ? Number(m[1]) : null;
  }

  // Codes des matériaux (fichiers fonciers, repris par la BD TOPO) : un chiffre par matériau (H, à vérifier).
  const MATERIAUX_MURS = { 1: 'pierre', 2: 'meulière', 3: 'béton', 4: 'briques', 5: 'aggloméré', 6: 'bois', 9: 'autres' };
  const MATERIAUX_TOIT = { 1: 'tuiles', 2: 'ardoises', 3: 'zinc ou aluminium', 4: 'béton', 9: 'autres' };

  function decoderMateriaux(code, table) {
    return String(code || '').split('').map(Number).filter(function (n) { return table[n]; })
      .map(function (n) { return table[n]; }).filter(function (m, i, t) { return t.indexOf(m) === i; });
  }

  // Toiture en béton seul → terrasse ; tuiles, ardoises, zinc → combles ; sinon inconnu.
  function typeToitureDepuisMateriaux(materiaux) {
    if (!materiaux.length) return null;
    if (materiaux.length === 1 && materiaux[0] === 'béton') return 'terrasse';
    return materiaux.some(function (m) { return m === 'tuiles' || m === 'ardoises' || m === 'zinc ou aluminium'; }) ? 'combles' : null;
  }

  // Usage de la BD TOPO → usage de l'Audit flash (à confirmer par toi).
  function usageDepuisBdTopo(usage, logements, surfacePlancher) {
    const u = String(usage || '').toLowerCase();
    if (u.indexOf('sidentiel') >= 0) {
      if (logements > 1) return 'logement-collectif';
      if (logements === 1) return 'logement-individuel';
      return surfacePlancher > 250 ? 'logement-collectif' : 'logement-individuel';
    }
    if (u.indexOf('commercial') >= 0) return 'bureaux';
    if (u.indexOf('sportif') >= 0) return 'sport';
    if (u.indexOf('religieux') >= 0) return 'culture';
    return null;
  }

  function lireBatimentBdTopo(p) {
    const props = p || {};
    const murs = decoderMateriaux(props.materiaux_des_murs, MATERIAUX_MURS);
    const toit = decoderMateriaux(props.materiaux_de_la_toiture, MATERIAUX_TOIT);
    return {
      id: props.cleabs || null,
      hauteur: Number(props.hauteur) > 0 ? Number(props.hauteur) : null,
      etages: Number(props.nombre_d_etages) > 0 ? Number(props.nombre_d_etages) : null,
      logements: Number(props.nombre_de_logements) > 0 ? Number(props.nombre_de_logements) : null,
      usage: props.usage_1 || null,
      annee: anneeDepuis(props.date_d_apparition),
      murs: murs,
      toiture: toit,
      toitureType: typeToitureDepuisMateriaux(toit)
    };
  }

  // Texte d'énergie (BDNB, DPE) → identifiant de l'Audit flash.
  function energieDepuisTexte(texte) {
    const t = String(texte || '').toLowerCase();
    if (!t) return null;
    if (/propane|gpl|butane/.test(t)) return 'propane';
    if (/granul/.test(t)) return 'bois-granules';
    if (/r[ée]seau|urbain/.test(t)) return 'reseau-chaleur';
    if (/gaz/.test(t)) return 'gaz';
    if (/[ée]lectri/.test(t)) return 'electricite';
    if (/fioul|fuel/.test(t)) return 'fioul';
    if (/bois|b[ûu]che/.test(t)) return 'bois-buches';
    return null;
  }

  function lireBdnb(groupe) {
    const champ = function (cles) { const x = premier(groupe, cles); return x ? x.valeur : null; };
    const energie = premier(groupe, ['type_energie_chauffage', 'dpe_mix_arrete_type_energie_chauffage', 'type_energie_chauffage_principal']);
    return {
      id: champ(['batiment_groupe_id']),
      annee: anneeDepuis(champ(['annee_construction', 'ffo_bat_annee_construction', 'annee_construction_dpe'])),
      usage: champ(['usage_niveau_1_txt', 'usage_principal_bdnb_open', 'ffo_bat_usage_niveau_1_txt']),
      energieChauffage: energie ? energieDepuisTexte(energie.valeur) : null,
      energieTexte: energie ? energie.valeur : null,
      murs: champ(['mat_mur_txt', 'ffo_bat_mat_mur_txt']),
      toiture: champ(['mat_toit_txt', 'ffo_bat_mat_toit_txt']),
      logements: Number(champ(['nb_log', 'ffo_bat_nb_log'])) || null,
      niveaux: Number(champ(['nb_niveau', 'ffo_bat_nb_niveau'])) || null,
      etiquette: champ(['classe_bilan_dpe', 'dpe_representatif_logement_classe_bilan_dpe', 'etiquette_dpe'])
    };
  }

  // Une ligne de DPE de l'ADEME → l'essentiel. _geopoint vaut « latitude,longitude » (H).
  function lireDpe(ligne, lon, lat, rayonTerre) {
    const champ = function (cles) { const x = premier(ligne, cles); return x ? x.valeur : null; };
    let distance = null;
    const geo = champ(['_geopoint']);
    if (geo && lon !== undefined) {
      const ll = String(geo).split(',').map(Number);
      if (ll.length === 2 && ll.every(isFinite)) distance = distanceM([lon, lat], [ll[1], ll[0]], rayonTerre);
    }
    const energie = champ(['type_energie_principale_chauffage', 'type_energie_n1', 'type_energie_chauffage']);
    return {
      etiquette: champ(['etiquette_dpe', 'classe_consommation_energie', 'classe_bilan_dpe']),
      ges: champ(['etiquette_ges', 'classe_estimation_ges']),
      consoM2: Number(champ(['conso_5_usages_par_m2_ep', 'conso_5_usages_m2_ep', 'consommation_energie'])) || null,
      annee: anneeDepuis(champ(['annee_construction', 'periode_construction'])),
      surface: Number(champ(['surface_habitable_logement', 'surface_habitable_immeuble', 'surface_utile', 'surface_habitable'])) || null,
      date: String(champ(['date_etablissement_dpe', 'date_reception_dpe', 'date_etablissement']) || '').slice(0, 10) || null,
      energieChauffage: energieDepuisTexte(energie),
      energieTexte: energie,
      adresse: champ(['adresse_ban', 'adresse_brut', 'adresse']),
      type: champ(['type_batiment']),
      distance: distance
    };
  }

  // Code postal → département (Corse : 2A sous 20200, 2B au-dessus ; outre-mer : 3 chiffres).
  function departementDepuisCodePostal(cp) {
    const c = String(cp || '').trim();
    if (!/^\d{5}$/.test(c)) return null;
    if (c.slice(0, 2) === '20') return Number(c) < 20200 ? '2A' : '2B';
    if (c.slice(0, 2) === '97') return c.slice(0, 3);
    return c.slice(0, 2);
  }

  // Résultat du géocodage (BAN, au format GeoJSON) → adresse utile.
  function lireAdresse(f) {
    if (!f || !f.geometry) return null;
    const p = f.properties || {};
    return {
      label: p.label || '', lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1],
      codePostal: p.postcode || null, commune: p.city || null, idBan: p.id || null, score: p.score,
      departement: departementDepuisCodePostal(p.postcode)
    };
  }

  // Photos Panoramax (format STAC) → vignettes. On ne garde que des adresses https (sécurité).
  function lirePhotos(entites) {
    const sure = function (u) { return /^https:\/\//.test(u || '') ? u : null; };
    return (entites || []).map(function (f) {
      const a = f.assets || {};
      const vignette = sure((a.thumb || a.sd || {}).href);
      const p = f.properties || {};
      return vignette ? {
        vignette: vignette, image: sure((a.sd || a.hd || a.thumb).href) || vignette,
        date: String(p.datetime || '').slice(0, 10), licence: p.license || null,
        lien: (f.links || []).map(function (l) { return sure(l.href); }).find(function (h) { return /panoramax/.test(h || ''); }) || null
      } : null;
    }).filter(Boolean);
  }

  /* ---------- 5. Trier ce qu'un service renvoie (test de faisabilité) ---------- */

  // Garde les champs non vides dont le nom correspond à un des motifs (année, usage, matériaux…).
  function champsUtiles(objet, motifs) {
    if (!objet || typeof objet !== 'object') return [];
    return Object.keys(objet).filter(function (cle) {
      const v = objet[cle];
      if (v === null || v === undefined || v === '' || typeof v === 'object') return false;
      return motifs.some(function (m) { return m.test(cle); });
    }).map(function (cle) { return [cle, objet[cle]]; });
  }

  // Verdict technique d'un test. resultat = { repond, utile, dureeMs }.
  function verdict(resultat, seuilLentMs) {
    if (!resultat || !resultat.repond) return { symbole: '❌', classe: 'ko', texte: 'inutilisable depuis une page web' };
    if (!resultat.utile) return { symbole: '🟠', classe: 'moyen', texte: 'répond, mais rien d’utile ici' };
    if (resultat.dureeMs > seuilLentMs) return { symbole: '🟠', classe: 'moyen', texte: 'répond, mais lentement' };
    return { symbole: '✅', classe: 'ok', texte: 'utilisable' };
  }

  /* ---------- 6. Adresses des services (seule l'adresse ou le point part) ---------- */

  const enc = encodeURIComponent;

  const URLS = {
    geocodage: function (adresse) {
      return 'https://data.geopf.fr/geocodage/search?limit=1&q=' + enc(adresse);
    },
    geocodageAncien: function (adresse) {
      return 'https://api-adresse.data.gouv.fr/search/?limit=1&q=' + enc(adresse);
    },
    suggestions: function (texte) {
      return 'https://data.geopf.fr/geocodage/search?limit=6&autocomplete=1&q=' + enc(texte);
    },
    suggestionsAncien: function (texte) {
      return 'https://api-adresse.data.gouv.fr/search/?limit=6&autocomplete=1&q=' + enc(texte);
    },
    inverse: function (lon, lat) {
      return 'https://data.geopf.fr/geocodage/reverse?limit=1&lon=' + lon + '&lat=' + lat;
    },
    inverseAncien: function (lon, lat) {
      return 'https://api-adresse.data.gouv.fr/reverse/?limit=1&lon=' + lon + '&lat=' + lat;
    },
    tuileOrthoIgn: function (t) {
      return 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=ORTHOIMAGERY.ORTHOPHOTOS' +
        '&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/jpeg&TILEMATRIX=' + t.z + '&TILEROW=' + t.y + '&TILECOL=' + t.x;
    },
    tuilePlanIgn: function (t) {
      return 'https://data.geopf.fr/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=GEOGRAPHICALGRIDSYSTEMS.PLANIGNV2' +
        '&STYLE=normal&TILEMATRIXSET=PM&FORMAT=image/png&TILEMATRIX=' + t.z + '&TILEROW=' + t.y + '&TILECOL=' + t.x;
    },
    tuileOsm: function (t) {
      return 'https://tile.openstreetmap.org/' + t.z + '/' + t.x + '/' + t.y + '.png';
    },
    styleOpenFreeMap: function () {
      return 'https://tiles.openfreemap.org/styles/liberty';
    },
    tuilesOpenFreeMap: function () {
      return 'https://tiles.openfreemap.org/planet';
    },
    // WFS 2.0 : avec « urn:ogc:def:crs:EPSG::4326 », l'ordre officiel du rectangle est latitude, longitude.
    batimentsBdTopo: function (b, nombre) {
      return 'https://data.geopf.fr/wfs/ows?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=BDTOPO_V3:batiment' +
        '&OUTPUTFORMAT=application/json&COUNT=' + (nombre || 30) + '&SRSNAME=urn:ogc:def:crs:EPSG::4326' +
        '&BBOX=' + [b[1], b[0], b[3], b[2]].join(',') + ',urn:ogc:def:crs:EPSG::4326';
    },
    bdnbRectangle: function (b) {
      return 'https://api.bdnb.io/v1/bdnb/donnees/batiment_groupe_complet/bbox?xmin=' + b[0] + '&ymin=' + b[1] +
        '&xmax=' + b[2] + '&ymax=' + b[3] + '&limit=5';
    },
    bdnbGroupe: function (idGroupe) {
      return 'https://api.bdnb.io/v1/bdnb/donnees/batiment_groupe_complet?limit=1&batiment_groupe_id=eq.' + enc(idGroupe);
    },
    bdnbAdresse: function (idBan) {
      return 'https://api.bdnb.io/v1/bdnb/donnees/rel_batiment_groupe_adresse?limit=5&cle_interop_adr=eq.' + enc(idBan);
    },
    ademeJeux: function (recherche) {
      return 'https://data.ademe.fr/data-fair/api/v1/datasets?size=20&select=id,title&q=' + enc(recherche);
    },
    ademeLignes: function (jeu, b) {
      return 'https://data.ademe.fr/data-fair/api/v1/datasets/' + enc(jeu) + '/lines?size=8&bbox=' + b.join(',');
    },
    // Autre façon de filtrer autour d'un point (si le rectangle n'est pas accepté) : lon,lat,distance en m.
    ademeLignesDistance: function (jeu, lon, lat, rayonM) {
      return 'https://data.ademe.fr/data-fair/api/v1/datasets/' + enc(jeu) + '/lines?size=8&geo_distance=' +
        [lon, lat, rayonM].join(',');
    },
    panoramax: function (b) {
      return 'https://api.panoramax.xyz/api/search?limit=6&bbox=' + b.join(',');
    }
  };

  const CarteCalcul = {
    enRadians, sommetsOuverts, centre, emprise, versMetres, surfaceSolM2, distanceM, perimetreM, distancePointSegment, mitoyennete,
    pointDansPolygone, bboxAutour, lonLatVersTuile, remettreLonLat, contourExterieur, choisirBatiment, lireCoordonnees,
    niveauxDepuisHauteur, estimerSurface, premier, anneeDepuis, decoderMateriaux, typeToitureDepuisMateriaux,
    usageDepuisBdTopo, lireBatimentBdTopo, energieDepuisTexte, lireBdnb, lireDpe, departementDepuisCodePostal,
    lireAdresse, lirePhotos, champsUtiles, verdict, URLS, MATERIAUX_MURS, MATERIAUX_TOIT
  };

  global.CarteCalcul = CarteCalcul;
  if (typeof module !== 'undefined' && module.exports) module.exports = CarteCalcul;
})(typeof window !== 'undefined' ? window : globalThis);
