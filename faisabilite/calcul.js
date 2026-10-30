/* ==========================================================
   TEST DE FAISABILITÉ — LOGIQUE (fonctions pures, sans réseau)
   ----------------------------------------------------------
   1) Surface au sol d'un contour de bâtiment donné en longitude / latitude.
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

   4) Verdict d'un service : ❌ s'il ne répond pas à une page web,
      🟠 s'il répond mais lentement ou sans donnée utile ici, ✅ sinon.
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

  // Surface au sol (m²) d'un contour [[lon, lat], …]. Voir la formule en haut du fichier.
  function surfaceSolM2(anneau, rayonTerre) {
    const s = sommetsOuverts(anneau);
    if (s.length < 3) return 0;
    const c = centre(s);
    const cosPhi0 = Math.cos(enRadians(c[1]));
    const xy = s.map(function (p) {
      return [rayonTerre * enRadians(p[0] - c[0]) * cosPhi0, rayonTerre * enRadians(p[1] - c[1])];
    });
    let somme = 0;
    for (let i = 0; i < xy.length; i++) {
      const a = xy[i], b = xy[(i + 1) % xy.length];
      somme += a[0] * b[1] - b[0] * a[1];
    }
    return Math.abs(somme) / 2;
  }

  // Distance (m) entre deux points proches, même dépliage local que pour la surface.
  function distanceM(a, b, rayonTerre) {
    const cosPhi0 = Math.cos(enRadians((a[1] + b[1]) / 2));
    const dx = rayonTerre * enRadians(b[0] - a[0]) * cosPhi0;
    const dy = rayonTerre * enRadians(b[1] - a[1]);
    return Math.sqrt(dx * dx + dy * dy);
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

  // Lit des coordonnées collées : « 43,6045 ; 1,4433 » ou « 43.6045, 1.4433 » (latitude puis longitude).
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

  // Renvoie les niveaux retenus, leur origine (pour l'afficher) et la surface de plancher.
  function estimerSurface(surfaceSol, hauteur, etages, hauteurEtage) {
    // origine : 'bdtopo' (nombre d'étages donné), 'hauteur' (déduit de la hauteur) ou 'inconnue'
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

  /* ---------- 4. Trier ce qu'un service renvoie ---------- */

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

  /* ---------- 5. Adresses des services (seule l'adresse ou le point part) ---------- */

  const enc = encodeURIComponent;

  const URLS = {
    geocodage: function (adresse) {
      return 'https://data.geopf.fr/geocodage/search?limit=1&q=' + enc(adresse);
    },
    geocodageAncien: function (adresse) {
      return 'https://api-adresse.data.gouv.fr/search/?limit=1&q=' + enc(adresse);
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
    // WFS 2.0 : avec « urn:ogc:def:crs:EPSG::4326 », l'ordre officiel du rectangle est latitude, longitude.
    batimentsBdTopo: function (b) {
      return 'https://data.geopf.fr/wfs/ows?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=BDTOPO_V3:batiment' +
        '&OUTPUTFORMAT=application/json&COUNT=30&SRSNAME=urn:ogc:def:crs:EPSG::4326' +
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
      return 'https://data.ademe.fr/data-fair/api/v1/datasets/' + enc(jeu) + '/lines?size=5&bbox=' + b.join(',');
    },
    // Autre façon de filtrer autour d'un point (si le rectangle n'est pas accepté) : lon,lat,distance en m.
    ademeLignesDistance: function (jeu, lon, lat, rayonM) {
      return 'https://data.ademe.fr/data-fair/api/v1/datasets/' + enc(jeu) + '/lines?size=5&geo_distance=' +
        [lon, lat, rayonM].join(',');
    },
    panoramax: function (b) {
      return 'https://api.panoramax.xyz/api/search?limit=4&bbox=' + b.join(',');
    }
  };

  const FaisabiliteCalcul = {
    enRadians, sommetsOuverts, centre, surfaceSolM2, distanceM, pointDansPolygone, bboxAutour, lonLatVersTuile,
    remettreLonLat, contourExterieur, choisirBatiment, lireCoordonnees, niveauxDepuisHauteur, estimerSurface, champsUtiles, verdict, URLS
  };

  global.FaisabiliteCalcul = FaisabiliteCalcul;
  if (typeof module !== 'undefined' && module.exports) module.exports = FaisabiliteCalcul;
})(typeof window !== 'undefined' ? window : globalThis);
