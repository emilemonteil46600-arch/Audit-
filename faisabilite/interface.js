/* ==========================================================
   TEST DE FAISABILITÉ — AFFICHAGE ET APPELS RÉSEAU
   AUCUN calcul ici : surfaces, niveaux, verdicts et adresses
   des services viennent de calcul.js.
   Ce qui part vers les services publics : l'adresse tapée ou
   un point (longitude, latitude). Jamais le nom d'un client.
   ========================================================== */
(function () {
  'use strict';

  const C = window.CarteCalcul;
  const V = window.VALEURS_FLASH;
  const SERVICES = window.SERVICES_FLASH;
  const F = window.FLASH;
  const R = V.rayonTerre.valeur;
  const MAPLIBRE = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl';

  const $ = function (s) { return document.querySelector(s); };
  const resultats = {};   // id du service → { verdict, detail, dureeMs }
  let point = null;       // { lon, lat, label, idBan }
  let carte = null;

  /* ---------- Appel d'un service, avec diagnostic CORS ----------
     Si la lecture échoue, on réessaie en mode « no-cors » : si cette fois le
     service répond, c'est qu'il marche mais interdit aux pages web de lire
     ses réponses (CORS) → inutilisable directement depuis le site. */
  async function appeler(url, type) {
    const debut = performance.now();
    const arret = new AbortController();
    const minuterie = setTimeout(function () { arret.abort(); }, V.delaiMax.valeur);
    try {
      const rep = await fetch(url, { signal: arret.signal });
      const dureeMs = performance.now() - debut;
      if (!rep.ok) return { repond: false, dureeMs: dureeMs, erreur: 'erreur HTTP ' + rep.status };
      const donnees = type === 'blob' ? await rep.blob() : await rep.json();
      return { repond: true, dureeMs: performance.now() - debut, donnees: donnees };
    } catch (e) {
      const dureeMs = performance.now() - debut;
      if (e.name === 'AbortError') return { repond: false, dureeMs: dureeMs, erreur: 'pas de réponse en ' + V.delaiMax.valeur / 1000 + ' s' };
      try {
        await fetch(url, { mode: 'no-cors' });
        return { repond: false, dureeMs: dureeMs, erreur: 'le service répond, mais interdit aux pages web de lire sa réponse (CORS)' };
      } catch (e2) {
        return { repond: false, dureeMs: dureeMs, erreur: 'ne répond pas (réseau, panne ou adresse du service fausse)' };
      }
    } finally {
      clearTimeout(minuterie);
    }
  }

  /* ---------- Tableau des résultats ---------- */
  function noter(id, appel, utile, detail) {
    const v = C.verdict({ repond: appel.repond, utile: utile, dureeMs: appel.dureeMs }, V.seuilLent.valeur);
    resultats[id] = { verdict: v, detail: appel.repond ? detail : appel.erreur, dureeMs: appel.dureeMs };
    afficherTableau();
  }

  function enCours(id) {
    resultats[id] = { verdict: { symbole: '⏳', classe: '', texte: 'en cours' }, detail: 'test en cours…', dureeMs: null };
    afficherTableau();
  }

  function afficherTableau() {
    const lignes = SERVICES.map(function (s) {
      const r = resultats[s.id];
      if (!r) return '';
      const temps = r.dureeMs === null ? '' : F.nombre(r.dureeMs / 1000, 1) + ' s';
      return '<tr class="' + r.verdict.classe + '">' +
        '<td class="verdict" title="' + F.echapper(r.verdict.texte) + '">' + r.verdict.symbole + '</td>' +
        '<td>' + F.echapper(s.nom) + '<div class="detail">' + F.echapper(s.role) + '</div></td>' +
        '<td data-label="Résultat ici">' + r.detail + '</td>' +
        '<td data-label="Temps" class="num">' + temps + '</td>' +
        '<td data-label="Conditions" class="detail">' + F.echapper(s.conditions) +
        ' <a href="' + s.doc + '" target="_blank" rel="noopener">doc</a></td></tr>';
    }).join('');
    $('#corps-services').innerHTML = lignes;
    $('#bloc-services').hidden = false;
  }

  // Texte à coller dans la conversation avec Claude.
  function texteResultat() {
    const entete = 'Test de faisabilité Audit flash — ' + new Date().toLocaleString('fr-FR') +
      '\nPoint testé : ' + (point ? point.label + ' (' + point.lat.toFixed(5) + ', ' + point.lon.toFixed(5) + ')' : '—') +
      '\nNavigateur : ' + navigator.userAgent + '\n';
    const corps = SERVICES.filter(function (s) { return resultats[s.id]; }).map(function (s) {
      const r = resultats[s.id];
      const div = document.createElement('div');
      div.innerHTML = r.detail;
      return r.verdict.symbole + ' ' + s.nom + ' — ' + div.textContent.replace(/\s+/g, ' ').trim() +
        (r.dureeMs === null ? '' : ' — ' + F.nombre(r.dureeMs / 1000, 1) + ' s');
    }).join('\n');
    return entete + corps + '\n' + ($('#surface').textContent ? '\nSurface : ' + $('#surface').textContent.replace(/\s+/g, ' ').trim() : '');
  }

  function listeChamps(paires, max) {
    if (!paires.length) return '<span class="muet">aucun champ utile reconnu</span>';
    return paires.slice(0, max).map(function (p) {
      return '<code>' + F.echapper(p[0]) + '</code> = ' + F.echapper(p[1]);
    }).join(' · ') + (paires.length > max ? ' · … (' + paires.length + ' champs)' : '');
  }

  /* ---------- 1. Adresse → point ---------- */
  async function trouverPoint(adresse) {
    const saisi = C.lireCoordonnees(adresse);
    if (saisi) {
      resultats.geocodage = { verdict: { symbole: '➖', classe: '', texte: 'non testé' }, detail: 'coordonnées collées : géocodage non testé', dureeMs: null };
      return { lon: saisi.lon, lat: saisi.lat, label: 'coordonnées saisies', idBan: null };
    }
    let trouve = null;
    for (const essai of [['geocodage', C.URLS.geocodage], ['geocodageAncien', C.URLS.geocodageAncien]]) {
      enCours(essai[0]);
      const a = await appeler(essai[1](adresse));
      const f = a.repond && a.donnees.features && a.donnees.features[0];
      noter(essai[0], a, !!f, f ? '« ' + F.echapper(f.properties.label) + ' » (score ' + F.nombre(f.properties.score, 2) + ')' : 'aucune adresse trouvée');
      if (f && !trouve) {
        trouve = { lon: f.geometry.coordinates[0], lat: f.geometry.coordinates[1], label: f.properties.label, idBan: f.properties.id };
      }
    }
    return trouve;
  }

  /* ---------- 2. Fonds de carte et bibliothèque ---------- */
  async function testerTuile(id, url) {
    enCours(id);
    const a = await appeler(url, 'blob');
    const image = a.repond && /^image\//.test(a.donnees.type);
    noter(id, a, image, image ? 'tuile reçue (' + F.nombre(a.donnees.size / 1024) + ' ko)' : 'réponse reçue mais ce n’est pas une image');
  }

  async function testerOpenFreeMap() {
    enCours('openfreemap');
    const a = await appeler(C.URLS.styleOpenFreeMap());
    const couches = a.repond ? (a.donnees.layers || []) : [];
    const bati3d = couches.some(function (c) { return c.type === 'fill-extrusion'; });
    noter('openfreemap', a, couches.length > 0, couches.length + ' couches' + (bati3d ? ', dont des bâtiments en 3D' : ', pas de 3D trouvée'));
  }

  function chargerMapLibre() {
    enCours('maplibre');
    const debut = performance.now();
    return new Promise(function (fin) {
      if (window.maplibregl) return fin(true);
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = MAPLIBRE + '.css';
      document.head.appendChild(css);
      const js = document.createElement('script');
      js.src = MAPLIBRE + '.js';
      js.onload = function () {
        noter('maplibre', { repond: true, dureeMs: performance.now() - debut }, !!window.maplibregl, 'version ' + F.echapper(window.maplibregl.getVersion ? window.maplibregl.getVersion() : '?') + ' chargée');
        fin(true);
      };
      js.onerror = function () {
        noter('maplibre', { repond: false, dureeMs: performance.now() - debut, erreur: 'impossible de charger la bibliothèque depuis unpkg' });
        fin(false);
      };
      document.head.appendChild(js);
    });
  }

  /* ---------- 3. Le bâtiment au point ---------- */
  async function testerBdTopo() {
    enCours('bdtopo');
    const bbox = C.bboxAutour(point.lon, point.lat, V.rayonRecherche.valeur, R);
    const a = await appeler(C.URLS.batimentsBdTopo(bbox));
    const entites = a.repond ? (a.donnees.features || []) : [];
    const choix = C.choisirBatiment(entites, point.lon, point.lat, R);
    if (!choix) {
      noter('bdtopo', a, false, entites.length + ' bâtiment(s) à moins de ' + V.rayonRecherche.valeur + ' m : clique sur un bâtiment de la carte');
      afficherSurface(null);
      return null;
    }
    const p = choix.entite.properties || {};
    const champs = C.champsUtiles(p, [/hauteur/, /etage/, /usage/, /nature/, /date/, /materiau/, /logement/]);
    noter('bdtopo', a, true, entites.length + ' bâtiment(s) trouvé(s) ; retenu : ' +
      (choix.dedans ? 'celui sous le point' : 'le plus proche (' + F.nombre(choix.distance) + ' m)') + '<br>' + listeChamps(champs, 10));
    const estimation = C.estimerSurface(C.surfaceSolM2(choix.contour, R), Number(p.hauteur), Number(p.nombre_d_etages), V.hauteurEtage.valeur);
    afficherSurface(estimation, Number(p.hauteur));
    return { contour: choix.contour, hauteur: Number(p.hauteur) || 0 };
  }

  async function testerBdnb() {
    enCours('bdnb');
    const bbox = C.bboxAutour(point.lon, point.lat, V.rayonRecherche.valeur, R);
    const essais = [];
    let a = await appeler(C.URLS.bdnbRectangle(bbox));
    let repond = a.repond, dureeMs = a.dureeMs;
    let groupes = a.repond && Array.isArray(a.donnees) ? a.donnees : [];
    essais.push('par rectangle : ' + (a.repond ? groupes.length + ' résultat(s)' : a.erreur));
    if (!groupes.length && point.idBan) {
      // Autre chemin : adresse BAN → identifiant du groupe de bâtiments → fiche complète.
      const lien = await appeler(C.URLS.bdnbAdresse(point.idBan));
      repond = repond || lien.repond;
      dureeMs += lien.dureeMs;
      const id = lien.repond && Array.isArray(lien.donnees) && lien.donnees[0] && lien.donnees[0].batiment_groupe_id;
      essais.push('par l’adresse BAN : ' + (lien.repond ? (id ? 'groupe ' + F.echapper(id) : 'aucun lien adresse → bâtiment') : lien.erreur));
      if (id) {
        a = await appeler(C.URLS.bdnbGroupe(id));
        dureeMs += a.dureeMs;
        groupes = a.repond && Array.isArray(a.donnees) ? a.donnees : [];
      }
    }
    const g = groupes[0];
    const champs = C.champsUtiles(g, [/annee/, /usage/, /mat_/, /niveau/, /hauteur/, /dpe/, /energie/, /chauff/, /ecs/, /surface/, /conso/, /classe/]);
    noter('bdnb', { repond: repond, dureeMs: dureeMs, erreur: essais.join(' ; ') }, !!g,
      (g ? Object.keys(g).length + ' champs<br>' + listeChamps(champs, 12) : 'aucun bâtiment BDNB trouvé ici') +
      '<br><span class="muet">' + essais.join(' ; ') + '</span>');
  }

  async function testerDpe(id, recherche, jeuxPossibles) {
    enCours(id);
    // On demande d'abord à l'ADEME la liste de ses jeux de données « DPE » (les identifiants peuvent changer).
    const liste = await appeler(C.URLS.ademeJeux(recherche));
    const trouves = liste.repond ? (liste.donnees.results || []).map(function (d) { return d.id; }) : [];
    const jeux = jeuxPossibles.concat(trouves.filter(function (j) { return jeuxPossibles.indexOf(j) < 0 && /dpe/i.test(j); }).slice(0, 2));
    const bbox = C.bboxAutour(point.lon, point.lat, V.rayonRecherche.valeur * 3, R);
    let dernier = liste;
    for (const jeu of jeux) {
      for (const url of [C.URLS.ademeLignes(jeu, bbox), C.URLS.ademeLignesDistance(jeu, point.lon, point.lat, V.rayonRecherche.valeur * 3)]) {
        const a = await appeler(url);
        dernier = a;
        if (!a.repond) continue;
        const lignes = a.donnees.results || [];
        const champs = C.champsUtiles(lignes[0], [/etiquette/, /classe/, /conso/, /annee/, /surface/, /type_batiment/, /energie/, /date_etablissement/, /periode/]);
        noter(id, a, lignes.length > 0, 'jeu <code>' + F.echapper(jeu) + '</code> : ' + F.nombre(a.donnees.total || lignes.length) +
          ' DPE à moins de ~' + V.rayonRecherche.valeur * 3 + ' m' + (lignes.length ? '<br>' + listeChamps(champs, 8) : '') +
          (trouves.length ? '<br><span class="muet">jeux ADEME trouvés : ' + F.echapper(trouves.join(', ')) + '</span>' : ''));
        return;
      }
    }
    dernier.erreur = (dernier.erreur || 'aucune réponse') + ' (jeux essayés : ' + jeux.join(', ') + ')';
    noter(id, dernier, false, 'aucun jeu de données DPE n’a accepté la recherche autour du point (jeux essayés : ' + F.echapper(jeux.join(', ')) + ')');
  }

  async function testerPanoramax() {
    enCours('panoramax');
    const a = await appeler(C.URLS.panoramax(C.bboxAutour(point.lon, point.lat, V.rayonRecherche.valeur * 2, R)));
    const photos = a.repond ? (a.donnees.features || []) : [];
    const vignettes = photos.map(function (p) {
      const v = p.assets && (p.assets.thumb || p.assets.sd);
      return v ? '<img src="' + F.echapper(v.href) + '" alt="Photo de rue Panoramax" loading="lazy">' : '';
    }).join('');
    const dates = photos.map(function (p) { return (p.properties && p.properties.datetime || '').slice(0, 10); }).filter(Boolean);
    noter('panoramax', a, photos.length > 0, photos.length + ' photo(s) à moins de ~' + V.rayonRecherche.valeur * 2 + ' m' +
      (dates.length ? ' (prises le ' + F.echapper(dates.join(', ')) + ')' : ''));
    $('#photos').innerHTML = vignettes || '<span class="muet">pas de photo de rue ici</span>';
  }

  /* ---------- Surface ---------- */
  function afficherSurface(e, hauteur) {
    const bloc = $('#surface');
    if (!e) { bloc.innerHTML = '<p class="muet">Pas de bâtiment retenu : clique sur un bâtiment de la carte.</p>'; return; }
    const origine = {
      bdtopo: "nombre d'étages BD TOPO",
      hauteur: 'déduit de la hauteur : ' + F.nombre(hauteur, 1) + ' m / ' + F.nombre(V.hauteurEtage.valeur, 1) + ' m par étage (H)',
      inconnue: 'ni étages ni hauteur connus'
    }[e.origineNiveaux];
    bloc.innerHTML =
      '<div class="resultat-ligne"><span>Surface au sol (contour BD TOPO)</span><span>' + F.nombre(e.surfaceSol) + ' m²</span></div>' +
      '<div class="resultat-ligne"><span>Hauteur (BD TOPO)</span><span>' + (hauteur > 0 ? F.nombre(hauteur, 1) + ' m' : '–') + '</span></div>' +
      '<div class="resultat-ligne"><span>Niveaux <span class="muet">(' + origine + ')</span></span><span>' + (e.niveaux || '–') + '</span></div>' +
      '<div class="resultat-total"><span>Surface de plancher ≈</span><span>' + (e.surfacePlancher ? F.nombre(F.arrondi(e.surfacePlancher, 10)) + ' m²' : '–') + '</span></div>' +
      '<p class="aide">Surface brute (murs compris), arrondie à 10 m² pour l’affichage. Formule : surface au sol × niveaux.</p>';
  }

  /* ---------- Carte ---------- */
  function afficherCarte(batiment) {
    if (!window.maplibregl) { $('#cadre-carte').innerHTML = '<p class="muet" style="padding:16px">Carte indisponible : MapLibre n’a pas pu être chargé.</p>'; return; }
    const ign = resultats.planIgn && resultats.planIgn.verdict.classe !== 'ko';
    const t = { z: '{z}', x: '{x}', y: '{y}' };
    if (!carte) {
      carte = new maplibregl.Map({
        container: 'cadre-carte',
        center: [point.lon, point.lat],
        zoom: 18,
        pitch: 50,
        style: {
          version: 8,
          sources: {
            fond: { type: 'raster', tileSize: 256, maxzoom: 19, tiles: [ign ? C.URLS.tuilePlanIgn(t) : C.URLS.tuileOsm(t)],
              attribution: ign ? '© IGN' : '© contributeurs OpenStreetMap' },
            ortho: { type: 'raster', tileSize: 256, maxzoom: 19, tiles: [C.URLS.tuileOrthoIgn(t)], attribution: '© IGN' }
          },
          layers: [
            { id: 'fond', type: 'raster', source: 'fond' },
            { id: 'ortho', type: 'raster', source: 'ortho', layout: { visibility: 'none' } }
          ]
        }
      });
      carte.addControl(new maplibregl.NavigationControl());
      carte.on('click', function (ev) { relancerBatiment(ev.lngLat.lng, ev.lngLat.lat); });
      carte.on('load', function () { dessinerBatiment(batiment); });
    } else {
      carte.easeTo({ center: [point.lon, point.lat] });
      dessinerBatiment(batiment);
    }
  }

  function dessinerBatiment(batiment) {
    const donnees = {
      type: 'FeatureCollection',
      features: batiment ? [{ type: 'Feature', properties: { hauteur: batiment.hauteur }, geometry: { type: 'Polygon', coordinates: [batiment.contour] } }] : []
    };
    const pt = { type: 'FeatureCollection', features: [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: [point.lon, point.lat] } }] };
    if (carte.getSource('batiment')) {
      carte.getSource('batiment').setData(donnees);
      carte.getSource('point').setData(pt);
      return;
    }
    carte.addSource('batiment', { type: 'geojson', data: donnees });
    carte.addSource('point', { type: 'geojson', data: pt });
    carte.addLayer({ id: 'batiment-3d', type: 'fill-extrusion', source: 'batiment',
      paint: { 'fill-extrusion-color': '#c4501b', 'fill-extrusion-opacity': 0.65, 'fill-extrusion-height': ['get', 'hauteur'] } });
    carte.addLayer({ id: 'point', type: 'circle', source: 'point',
      paint: { 'circle-radius': 6, 'circle-color': '#2b6a8e', 'circle-stroke-width': 2, 'circle-stroke-color': '#ffffff' } });
  }

  /* ---------- Enchaînement ---------- */
  async function testsBatiment() {
    const [batiment] = await Promise.all([
      testerBdTopo(), testerBdnb(),
      testerDpe('dpeLogement', 'dpe logements', ['dpe03existant']),
      testerDpe('dpeTertiaire', 'dpe tertiaire', ['dpe01tertiaire']),
      testerPanoramax()
    ]);
    return batiment;
  }

  async function lancer() {
    const bouton = $('#lancer');
    bouton.disabled = true;
    Object.keys(resultats).forEach(function (k) { delete resultats[k]; });
    $('#message').textContent = '';
    try {
      point = await trouverPoint($('#adresse').value.trim());
      if (!point) {
        $('#message').textContent = 'Adresse introuvable. Essaie une autre adresse, ou colle des coordonnées « latitude ; longitude ».';
        return;
      }
      $('#point').textContent = point.label + ' — ' + point.lat.toFixed(5) + ' ; ' + point.lon.toFixed(5);
      const tuile = C.lonLatVersTuile(point.lon, point.lat, 17);
      const [, , , , , batiment] = await Promise.all([
        testerTuile('planIgn', C.URLS.tuilePlanIgn(tuile)),
        testerTuile('orthoIgn', C.URLS.tuileOrthoIgn(tuile)),
        testerTuile('osm', C.URLS.tuileOsm(tuile)),
        testerOpenFreeMap(),
        chargerMapLibre(),
        testsBatiment()
      ]);
      $('#bloc-carte').hidden = false;
      afficherCarte(batiment);
    } finally {
      bouton.disabled = false;
    }
  }

  async function relancerBatiment(lon, lat) {
    point = { lon: lon, lat: lat, label: 'point cliqué sur la carte', idBan: null };
    $('#point').textContent = point.label + ' — ' + lat.toFixed(5) + ' ; ' + lon.toFixed(5);
    dessinerBatiment(null);
    dessinerBatiment(await testsBatiment());
  }

  document.addEventListener('DOMContentLoaded', function () {
    const exemple = Object.keys(V).filter(function (k) { return V[k].statut === 'exemple'; }).map(function (k) { return V[k].libelle + ' : ' + F.nombre(V[k].valeur) + ' ' + V[k].unite; });
    $('#valeurs-exemple').innerHTML = exemple.map(function (t) { return '<li>' + F.echapper(t) + '</li>'; }).join('');
    $('#formulaire').addEventListener('submit', function (ev) { ev.preventDefault(); lancer(); });
    $('#copier').addEventListener('click', function () {
      navigator.clipboard.writeText(texteResultat()).then(function () { F.toast('Résultat copié : colle-le dans la conversation avec Claude'); },
        function () { F.toast('Copie impossible : sélectionne le tableau à la main'); });
    });
    $('#vue-ortho').addEventListener('click', function () {
      if (!carte) return;
      const visible = carte.getLayoutProperty('ortho', 'visibility') === 'visible';
      carte.setLayoutProperty('ortho', 'visibility', visible ? 'none' : 'visible');
      this.textContent = visible ? 'Voir la photo aérienne' : 'Voir le plan';
    });
  });
})();
