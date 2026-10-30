/* ==========================================================
   CARTE — AFFICHAGE (MapLibre) ET APPELS AUX SERVICES PUBLICS
   AUCUN calcul ici : géométrie, mitoyenneté et lecture des
   réponses sont dans carte/calcul.js.
   Ce qui part vers les services : l'adresse tapée ou un point
   (longitude, latitude). Jamais le nom d'un client.
   ========================================================== */
(function () {
  'use strict';

  const C = window.CarteCalcul, V = window.VALEURS_FLASH, F = window.FLASH;
  const R = V.rayonTerre.valeur;
  const MAPLIBRE = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl';
  const $ = function (s) { return document.querySelector(s); };

  let carte = null, rappels = {}, fond = 'plan', en3d = true;
  let batiments = {};        // id → { id, contour, lu, h }
  let selection = null;      // bâtiment choisi
  let pret = false, aFaireQuandPret = [];
  let tuilesPlanRecues = false, erreursPlan = 0;
  const sources = {};

  /* ---------- Appels réseau (avec délai maximal) ---------- */
  async function appeler(url) {
    const arret = new AbortController();
    const minuterie = setTimeout(function () { arret.abort(); }, V.delaiMax.valeur);
    try {
      const rep = await fetch(url, { signal: arret.signal });
      if (!rep.ok) return { ok: false, erreur: 'erreur ' + rep.status };
      return { ok: true, donnees: await rep.json() };
    } catch (e) {
      return { ok: false, erreur: e.name === 'AbortError' ? 'pas de réponse' : 'service injoignable' };
    } finally {
      clearTimeout(minuterie);
    }
  }

  // État de chaque source de données, affiché sous la carte.
  function noter(id, etat, texte) {
    sources[id] = { etat: etat, texte: texte };
    if (rappels.surSources) rappels.surSources(Object.assign({}, sources));
  }

  /* ---------- Chargement de la bibliothèque (depuis unpkg, version fixée) ---------- */
  function chargerBibliotheque() {
    return new Promise(function (fin) {
      if (window.maplibregl) return fin(true);
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = MAPLIBRE + '.css';
      document.head.appendChild(css);
      const js = document.createElement('script');
      js.src = MAPLIBRE + '.js';
      js.onload = function () { fin(!!window.maplibregl); };
      js.onerror = function () { fin(false); };
      document.head.appendChild(js);
    });
  }

  function couleur(nom) {
    return getComputedStyle(document.documentElement).getPropertyValue(nom).trim();
  }

  function vide() { return { type: 'FeatureCollection', features: [] }; }

  function style() {
    const t = { z: '{z}', x: '{x}', y: '{y}' };
    const raster = function (url, attribution) {
      return { type: 'raster', tiles: [url], tileSize: 256, maxzoom: 19, attribution: attribution };
    };
    return {
      version: 8,
      sources: {
        plan: raster(C.URLS.tuilePlanIgn(t), '© IGN – Géoplateforme'),
        ortho: raster(C.URLS.tuileOrthoIgn(t), '© IGN – Géoplateforme'),
        osm: raster(C.URLS.tuileOsm(t), '© contributeurs OpenStreetMap'),
        batiments: { type: 'geojson', data: vide(), attribution: 'Bâtiments © IGN BD TOPO' },
        selection: { type: 'geojson', data: vide() },
        mitoyen: { type: 'geojson', data: vide() },
        point: { type: 'geojson', data: vide() }
      },
      layers: [
        { id: 'fond-plan', type: 'raster', source: 'plan', paint: peintureFond() },
        { id: 'fond-ortho', type: 'raster', source: 'ortho', layout: { visibility: 'none' } },
        { id: 'fond-osm', type: 'raster', source: 'osm', layout: { visibility: 'none' }, paint: peintureFond() },
        { id: 'batiments-3d', type: 'fill-extrusion', source: 'batiments', paint: peintureBatiments() },
        { id: 'selection-3d', type: 'fill-extrusion', source: 'selection', paint: peintureSelection() },
        { id: 'selection-sol', type: 'line', source: 'selection', paint: { 'line-color': couleur('--accent'), 'line-width': 3 } },
        { id: 'mitoyen', type: 'line', source: 'mitoyen', paint: { 'line-color': couleur('--alerte'), 'line-width': 5, 'line-dasharray': [1.2, 0.8] } },
        { id: 'point', type: 'circle', source: 'point',
          paint: { 'circle-radius': 6, 'circle-color': couleur('--froid'), 'circle-stroke-width': 2.5, 'circle-stroke-color': '#ffffff' } }
      ]
    };
  }

  // Les voisins en gris (plus foncé quand ils sont hauts), le bâtiment choisi en orange.
  function peintureBatiments() {
    return {
      'fill-extrusion-color': ['interpolate', ['linear'], ['get', 'h'], 0, couleur('--carte-bati'), 30, couleur('--carte-bati-haut')],
      'fill-extrusion-height': ['get', 'h'],
      'fill-extrusion-opacity': 0.88,
      'fill-extrusion-vertical-gradient': true
    };
  }
  // En thème sombre, on assombrit un peu le plan et OpenStreetMap pour ne pas éblouir.
  function peintureFond() {
    const sombre = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return sombre ? { 'raster-brightness-max': 0.72, 'raster-saturation': -0.35, 'raster-contrast': 0.05 } :
      { 'raster-brightness-max': 1, 'raster-saturation': 0, 'raster-contrast': 0 };
  }
  function peintureSelection() {
    return {
      'fill-extrusion-color': couleur('--accent'),
      'fill-extrusion-height': ['get', 'h'],
      'fill-extrusion-opacity': 0.95,
      'fill-extrusion-vertical-gradient': true
    };
  }

  function majCouleurs() {
    if (!pret) return;
    const p = peintureBatiments(), s = peintureSelection();
    carte.setPaintProperty('batiments-3d', 'fill-extrusion-color', p['fill-extrusion-color']);
    carte.setPaintProperty('selection-3d', 'fill-extrusion-color', s['fill-extrusion-color']);
    carte.setPaintProperty('selection-sol', 'line-color', couleur('--accent'));
    carte.setPaintProperty('mitoyen', 'line-color', couleur('--alerte'));
    const f = peintureFond();
    ['fond-plan', 'fond-osm'].forEach(function (id) {
      Object.keys(f).forEach(function (k) { carte.setPaintProperty(id, k, f[k]); });
    });
  }

  function quandPret(fonction) {
    if (pret) fonction(); else aFaireQuandPret.push(fonction);
  }

  /* ---------- Création de la carte ---------- */
  function creerCarte() {
    try {
      carte = new maplibregl.Map({
        container: 'carte', style: style(), center: [2.4, 46.6], zoom: 5, pitch: 0, maxPitch: 70,
        attributionControl: { compact: true }, dragRotate: true
      });
    } catch (e) {
      indisponible('ton navigateur ne peut pas afficher la carte 3D (WebGL)');
      return;
    }
    carte.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
    carte.addControl(new maplibregl.ScaleControl({ unit: 'metric' }), 'bottom-left');
    carte.on('load', function () {
      pret = true;
      carte.setLight({ anchor: 'viewport', color: '#ffffff', intensity: 0.35, position: [1.4, 210, 35] });
      const m = $('#carte-message');
      if (m) m.remove();
      aFaireQuandPret.forEach(function (f) { f(); });
      aFaireQuandPret = [];
    });
    carte.on('sourcedata', function (e) {
      if (e.sourceId === 'plan' && e.tile && !tuilesPlanRecues) { tuilesPlanRecues = true; noter('fond', 'ok', 'Plan IGN'); }
    });
    carte.on('error', function (e) {
      if (e && e.sourceId === 'plan' && fond === 'plan' && !tuilesPlanRecues && ++erreursPlan >= 4) {
        changerFond('osm');
        noter('fond', 'ko', 'Plan IGN indisponible : fond OpenStreetMap');
      }
    });
    carte.on('click', function (e) {
      const f = carte.queryRenderedFeatures(e.point, { layers: ['batiments-3d', 'selection-3d'] })[0];
      if (f && batiments[f.properties.id]) choisir(batiments[f.properties.id], null);
      else chargerEtChoisir(e.lngLat.lng, e.lngLat.lat, null);
    });
    carte.on('mousemove', 'batiments-3d', function () { carte.getCanvas().style.cursor = 'pointer'; });
    carte.on('mouseleave', 'batiments-3d', function () { carte.getCanvas().style.cursor = ''; });
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', majCouleurs);
    }
  }

  function indisponible(raison) {
    const m = $('#carte-message');
    if (m) m.innerHTML = '<svg class="ico"><use href="#i-alerte"/></svg> Carte indisponible : ' + F.echapper(raison) +
      '.<br>Tu peux saisir le bâtiment sans carte (onglet Bâtiment).';
    noter('fond', 'ko', 'Carte indisponible');
    if (rappels.surIndisponible) rappels.surIndisponible(raison);
  }

  /* ---------- Bâtiments ---------- */
  function polygone(b, h) {
    return { type: 'Feature', properties: { id: b.id, h: h }, geometry: { type: 'Polygon', coordinates: [b.contour] } };
  }

  function majBatiments() {
    quandPret(function () {
      carte.getSource('batiments').setData({
        type: 'FeatureCollection',
        features: Object.keys(batiments).map(function (id) { return polygone(batiments[id], batiments[id].h); })
      });
      carte.setFilter('batiments-3d', selection ? ['!=', ['get', 'id'], selection.id] : null);
    });
  }

  // Hauteur pour le DESSIN seulement (pas pour le calcul) : la BD TOPO, sinon 2 étages (H).
  function hauteurDessin(lu) {
    if (lu.hauteur) return lu.hauteur;
    return (lu.etages || 2) * V.hauteurEtage.valeur;
  }

  async function chargerAutour(lon, lat) {
    noter('bdtopo', 'attente', 'Bâtiments IGN…');
    const a = await appeler(C.URLS.batimentsBdTopo(C.bboxAutour(lon, lat, V.rayonVoisins.valeur, R), 800));
    if (!a.ok) { noter('bdtopo', 'ko', 'BD TOPO : ' + a.erreur); return []; }
    const liste = (a.donnees.features || []).map(function (f) {
      const contour = C.contourExterieur(f.geometry, lat);
      if (!contour) return null;
      const lu = C.lireBatimentBdTopo(f.properties);
      const id = lu.id || ('b' + contour[0][0].toFixed(6) + '_' + contour[0][1].toFixed(6));
      return { id: id, contour: contour, lu: lu, h: hauteurDessin(lu) };
    }).filter(Boolean);
    liste.forEach(function (b) { batiments[b.id] = b; });
    majBatiments();
    noter('bdtopo', liste.length ? 'ok' : 'vide', liste.length + ' bâtiments IGN');
    return liste;
  }

  // Le bâtiment sous le point, sinon le plus proche à moins du rayon de recherche.
  function sousLePoint(liste, lon, lat) {
    let meilleur = null;
    liste.forEach(function (b) {
      const d = C.pointDansPolygone([lon, lat], b.contour) ? 0 : C.distanceM([lon, lat], C.centre(b.contour), R);
      if (!meilleur || d < meilleur.d) meilleur = { b: b, d: d };
    });
    return meilleur && meilleur.d <= V.rayonRecherche.valeur ? meilleur.b : null;
  }

  async function chargerEtChoisir(lon, lat, adresse) {
    marquerPoint(lon, lat);
    const liste = await chargerAutour(lon, lat);
    const b = sousLePoint(liste, lon, lat);
    if (b) choisir(b, adresse);
    else if (rappels.surMessage) rappels.surMessage('Pas de bâtiment IGN à cet endroit : clique sur un bâtiment de la carte.');
  }

  function marquerPoint(lon, lat) {
    quandPret(function () {
      carte.getSource('point').setData({ type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [lon, lat] } }] });
    });
  }

  function dessinerSelection(b, cotes) {
    quandPret(function () {
      carte.getSource('selection').setData({ type: 'FeatureCollection', features: [polygone(b, b.h)] });
      carte.getSource('mitoyen').setData({
        type: 'FeatureCollection',
        features: (cotes || []).filter(function (c) { return c.mitoyen; }).map(function (c) {
          return { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [c.debut, c.fin] } };
        })
      });
      carte.setFilter('batiments-3d', ['!=', ['get', 'id'], b.id]);
    });
  }

  function voler(lon, lat) {
    quandPret(function () {
      carte.flyTo({ center: [lon, lat], zoom: 18, pitch: en3d ? 55 : 0, bearing: en3d ? -20 : 0, speed: 1.4, essential: true });
    });
  }

  // Cadre la carte sur le bâtiment (un peu plus large en 3D pour voir les voisins).
  function cadrer(contour) {
    quandPret(function () {
      const camera = carte.cameraForBounds(C.emprise(contour), { padding: 60, bearing: en3d ? -20 : 0 });
      const centre = C.centre(contour);
      carte.flyTo({
        center: camera ? camera.center : centre, zoom: camera ? Math.min(camera.zoom - (en3d ? 0.5 : 0), 19.5) : 18,
        pitch: en3d ? 55 : 0, bearing: en3d ? -20 : 0, speed: 1.4, essential: true
      });
    });
  }

  function choisir(b, adresse) {
    selection = b;
    const centre = C.centre(b.contour);
    const voisins = Object.keys(batiments).map(function (id) { return batiments[id]; }).filter(function (x) {
      return x.id !== b.id && C.distanceM(C.centre(x.contour), centre, R) < 120;
    }).map(function (x) { return x.contour; });
    const mit = C.mitoyennete(b.contour, voisins, R, V.toleranceMitoyen.valeur);
    const surfaceSol = C.surfaceSolM2(b.contour, R);
    const est = C.estimerSurface(surfaceSol, b.lu.hauteur, b.lu.etages, V.hauteurEtage.valeur);
    dessinerSelection(b, mit.cotes);
    cadrer(b.contour);
    rappels.surBatiment({
      id: b.id, lon: centre[0], lat: centre[1], contour: b.contour, hauteurDessin: b.h, cotes: mit.cotes,
      surfaceSol: surfaceSol, perimetre: mit.perimetre, perimetreExpose: mit.expose, partMitoyenne: mit.part,
      hauteur: b.lu.hauteur, niveaux: est.niveaux, origineNiveaux: est.origineNiveaux, surfacePlancher: est.surfacePlancher,
      bdtopo: b.lu, adresse: adresse
    });
    if (!adresse) adresseDuPoint(centre[0], centre[1]).then(function (a) { if (a && selection === b && rappels.surAdresse) rappels.surAdresse(a); });
    complements(centre[0], centre[1], adresse, b);
  }

  /* ---------- Compléments : BDNB, DPE, photos ---------- */
  function complements(lon, lat, adresse, b) {
    const encore = function () { return selection === b; };
    noter('bdnb', 'attente', 'BDNB…');
    chercherBdnb(lon, lat, adresse).then(function (groupe) {
      if (!encore()) return;
      noter('bdnb', groupe ? 'ok' : 'vide', groupe ? 'BDNB' : 'BDNB : rien ici');
      rappels.surComplements({ bdnb: groupe ? C.lireBdnb(groupe) : null });
    });
    noter('dpe', 'attente', 'DPE ADEME…');
    chercherDpe(lon, lat).then(function (dpe) {
      if (!encore()) return;
      noter('dpe', dpe.erreur ? 'ko' : dpe.liste.length ? 'ok' : 'vide', dpe.erreur ? 'DPE : ' + dpe.erreur : dpe.liste.length + ' DPE autour');
      rappels.surComplements({ dpe: dpe.liste });
    });
    noter('photos', 'attente', 'Photos de rue…');
    appeler(C.URLS.panoramax(C.bboxAutour(lon, lat, 60, R))).then(function (a) {
      if (!encore()) return;
      const photos = a.ok ? C.lirePhotos(a.donnees.features) : [];
      noter('photos', a.ok ? (photos.length ? 'ok' : 'vide') : 'ko', a.ok ? photos.length + ' photo(s) Panoramax' : 'Panoramax : ' + a.erreur);
      rappels.surComplements({ photos: photos });
    });
  }

  async function chercherBdnb(lon, lat, adresse) {
    const a = await appeler(C.URLS.bdnbRectangle(C.bboxAutour(lon, lat, 15, R)));
    if (a.ok && Array.isArray(a.donnees) && a.donnees.length) return a.donnees[0];
    if (adresse && adresse.idBan) {
      const lien = await appeler(C.URLS.bdnbAdresse(adresse.idBan));
      const id = lien.ok && Array.isArray(lien.donnees) && lien.donnees[0] && lien.donnees[0].batiment_groupe_id;
      if (id) {
        const g = await appeler(C.URLS.bdnbGroupe(id));
        if (g.ok && Array.isArray(g.donnees) && g.donnees[0]) return g.donnees[0];
      }
    }
    return null;
  }

  // DPE logement et tertiaire autour du point (rectangle, sinon distance), du plus proche au plus loin.
  async function chercherDpe(lon, lat) {
    const rayon = 60;
    const bbox = C.bboxAutour(lon, lat, rayon, R);
    const jeux = [['dpe03existant', 'logement'], ['dpe01tertiaire', 'tertiaire']];
    let erreur = null;
    const listes = await Promise.all(jeux.map(async function (j) {
      let a = await appeler(C.URLS.ademeLignes(j[0], bbox));
      if (!a.ok) a = await appeler(C.URLS.ademeLignesDistance(j[0], lon, lat, rayon));
      if (!a.ok) { erreur = a.erreur; return []; }
      return (a.donnees.results || []).map(function (l) { return Object.assign(C.lireDpe(l, lon, lat, R), { jeu: j[1] }); });
    }));
    const liste = listes[0].concat(listes[1]).sort(function (x, y) { return (x.distance || 999) - (y.distance || 999); });
    return { liste: liste.slice(0, 8), erreur: liste.length ? null : erreur };
  }

  async function adresseDuPoint(lon, lat) {
    let a = await appeler(C.URLS.inverse(lon, lat));
    if (!a.ok) a = await appeler(C.URLS.inverseAncien(lon, lat));
    return a.ok ? C.lireAdresse((a.donnees.features || [])[0]) : null;
  }

  /* ---------- Recherche d'adresse ---------- */
  let suggestions = [], minuterieSaisie = null, actif = -1;

  async function suggerer(texte) {
    let a = await appeler(C.URLS.suggestions(texte));
    if (!a.ok) a = await appeler(C.URLS.suggestionsAncien(texte));
    noter('adresse', a.ok ? 'ok' : 'ko', a.ok ? 'Adresses BAN' : 'Adresses : ' + a.erreur);
    return a.ok ? (a.donnees.features || []).map(C.lireAdresse).filter(Boolean) : [];
  }

  function afficherSuggestions() {
    const ul = $('#suggestions'), champ = $('#recherche');
    ul.innerHTML = suggestions.map(function (s, i) {
      return '<li role="option" id="sugg-' + i + '" data-i="' + i + '" aria-selected="' + (i === actif) + '">' +
        '<svg class="ico"><use href="#i-maison"/></svg><span>' + F.echapper(s.label) + '</span></li>';
    }).join('');
    ul.hidden = !suggestions.length;
    champ.setAttribute('aria-expanded', String(!!suggestions.length));
  }

  function aller(adresse) {
    suggestions = [];
    afficherSuggestions();
    $('#recherche').value = adresse.label;
    if (rappels.surAdresse) rappels.surAdresse(adresse);
    if (!carte) return;
    voler(adresse.lon, adresse.lat);
    chargerEtChoisir(adresse.lon, adresse.lat, adresse);
  }

  function brancherRecherche() {
    const champ = $('#recherche'), ul = $('#suggestions');
    champ.addEventListener('input', function () {
      clearTimeout(minuterieSaisie);
      const t = champ.value.trim();
      if (t.length < 4 || C.lireCoordonnees(t)) { suggestions = []; afficherSuggestions(); return; }
      minuterieSaisie = setTimeout(async function () {
        suggestions = await suggerer(t);
        actif = -1;
        if (champ.value.trim() === t) afficherSuggestions();
      }, 280);
    });
    champ.addEventListener('keydown', async function (e) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        if (!suggestions.length) return;
        e.preventDefault();
        actif = (actif + (e.key === 'ArrowDown' ? 1 : -1) + suggestions.length) % suggestions.length;
        afficherSuggestions();
      } else if (e.key === 'Escape') {
        suggestions = []; afficherSuggestions();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const coord = C.lireCoordonnees(champ.value);
        if (coord) { if (carte) { voler(coord.lon, coord.lat); chargerEtChoisir(coord.lon, coord.lat, null); } return; }
        if (!suggestions.length && champ.value.trim().length >= 4) suggestions = await suggerer(champ.value.trim());
        if (suggestions.length) aller(suggestions[Math.max(0, actif)]);
      }
    });
    ul.addEventListener('mousedown', function (e) {
      const li = e.target.closest('li');
      if (li) { e.preventDefault(); aller(suggestions[Number(li.dataset.i)]); }
    });
    champ.addEventListener('blur', function () { setTimeout(function () { suggestions = []; afficherSuggestions(); }, 150); });
  }

  /* ---------- Boutons de la carte ---------- */
  function changerFond(nouveau) {
    fond = nouveau;
    document.querySelectorAll('#fonds button').forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.fond === fond)); });
    quandPret(function () {
      ['plan', 'ortho', 'osm'].forEach(function (f) { carte.setLayoutProperty('fond-' + f, 'visibility', f === fond ? 'visible' : 'none'); });
    });
  }

  function brancherBoutons() {
    document.querySelectorAll('#fonds button').forEach(function (b) {
      b.addEventListener('click', function () { changerFond(b.dataset.fond); });
    });
    $('#vue-3d').addEventListener('click', function () {
      en3d = !en3d;
      this.setAttribute('aria-pressed', String(en3d));
      this.querySelector('span').textContent = en3d ? '3D' : '2D';
      quandPret(function () { carte.easeTo({ pitch: en3d ? 55 : 0, bearing: en3d ? -20 : 0, duration: 700 }); });
    });
    $('#recentrer').addEventListener('click', function () {
      if (selection) cadrer(selection.contour);
    });
  }

  /* ---------- Ce que voit le reste de l'outil ---------- */
  window.CarteFlash = {
    // options : surBatiment, surComplements, surAdresse, surSources, surMessage, surIndisponible
    demarrer: function (options) {
      rappels = options || {};
      brancherRecherche();
      brancherBoutons();
      chargerBibliotheque().then(function (ok) {
        if (!ok) { indisponible('la bibliothèque de carte n’a pas pu être chargée (hors ligne ?)'); return; }
        creerCarte();
      });
    },
    // Réaffiche un bâtiment gardé dans le navigateur (sans relancer le calcul).
    afficherSauvegarde: function (b) {
      if (!b || !b.contour) return;
      selection = { id: b.id || 'sauve', contour: b.contour, h: b.hauteurDessin || 2 * V.hauteurEtage.valeur, lu: {} };
      dessinerSelection(selection, b.cotes);
      marquerPoint(b.lon, b.lat);
      cadrer(b.contour);
      quandPret(function () { chargerAutour(b.lon, b.lat); });
    },
    effacer: function () {
      selection = null;
      quandPret(function () {
        ['selection', 'mitoyen', 'point'].forEach(function (s) { carte.getSource(s).setData(vide()); });
        carte.setFilter('batiments-3d', null);
      });
    }
  };
})();
