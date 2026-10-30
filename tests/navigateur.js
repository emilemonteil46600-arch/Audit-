/* ==========================================================
   Vérification dans un vrai navigateur (Chromium, via Playwright).
   Ce n'est PAS lancé par « node --test » ni sur GitHub : il faut
   Playwright installé sur la machine. Lancer : node tests/navigateur.js
   Option : MAPLIBRE_LOCAL=/chemin/vers/maplibre-gl/dist pour servir la
   bibliothèque de carte depuis le disque (sinon elle vient d'unpkg).

   Les services publics sont SIMULÉS (adresse, BD TOPO, BDNB, DPE,
   photos) : on teste l'affichage et l'enchaînement, pas les services.
   Vérifie : aucune erreur console, pas de défilement horizontal à
   390 px (clair et sombre), le parcours complet (adresse → bâtiment →
   questions → factures → bouquet → fiche Word), et le mode sans réseau.
   ========================================================== */
const path = require('path');
const fs = require('fs');
const os = require('os');
const { chromium } = require('playwright');

const RACINE = path.join(__dirname, '..');
const url = function (page) { return 'file://' + path.join(RACINE, page); };
const SORTIE = process.env.CAPTURES || os.tmpdir();
const LOCAL = process.env.MAPLIBRE_LOCAL;
const problemes = [];
const ok = function (condition, message) {
  if (condition) console.log('  ✓ ' + message);
  else { console.log('  ✗ ' + message); problemes.push(message); }
};

/* ---------- Un petit quartier simulé autour de (1,4433 ; 43,6045) ---------- */
const R = 6371008.8, LON = 1.4433, LAT = 43.6045;
const mLat = 1 / R * 180 / Math.PI, mLon = mLat / Math.cos(LAT * Math.PI / 180);
function rectangle(x, y, l, h) { // en mètres autour du point
  const p = function (a, b) { return [LON + a * mLon, LAT + b * mLat]; };
  return [p(x, y), p(x + l, y), p(x + l, y + h), p(x, y + h), p(x, y)];
}
const QUARTIER = [
  { id: 'BAT_CIBLE', anneau: rectangle(-10, -6, 20, 12), hauteur: 9.5, etages: null, usage: 'Résidentiel', logements: 6, date: '1972-01-01', murs: '34', toit: '40' },
  { id: 'BAT_MITOYEN', anneau: rectangle(10, -6, 14, 12), hauteur: 12, etages: 4, usage: 'Résidentiel', logements: 8, date: '1965-01-01', murs: '10', toit: '10' }
];
for (let i = 0; i < 8; i++) {
  QUARTIER.push({ id: 'BAT_' + i, anneau: rectangle(-60 + (i % 4) * 32, i < 4 ? 30 : -50, 18, 14), hauteur: 6 + i * 2, etages: null, usage: 'Résidentiel', logements: 1, date: null, murs: '', toit: '' });
}
const WFS = {
  type: 'FeatureCollection',
  features: QUARTIER.map(function (b) {
    return { type: 'Feature', properties: { cleabs: b.id, hauteur: b.hauteur, nombre_d_etages: b.etages, usage_1: b.usage, nombre_de_logements: b.logements,
      date_d_apparition: b.date, materiaux_des_murs: b.murs, materiaux_de_la_toiture: b.toit },
      // Coordonnées en (latitude, longitude) comme un WFS 2.0 strict : l'outil doit les remettre dans l'ordre
      geometry: { type: 'MultiPolygon', coordinates: [[b.anneau.map(function (c) { return [c[1], c[0], 150]; })]] } };
  })
};
const ADRESSE = { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [LON, LAT] },
  properties: { label: '1 place du Capitole 31000 Toulouse', postcode: '31000', city: 'Toulouse', id: '31555_1234_00001', score: 0.97 } }] };

// Tuile PNG unie de 256 × 256 (une couleur par fond), fabriquée ici pour ne dépendre de rien.
const zlib = require('zlib');
function crc32(buf) {
  let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c;
  }
  return (crc ^ 0xffffffff) >>> 0;
}
function morceau(type, donnees) {
  const l = Buffer.alloc(4); l.writeUInt32BE(donnees.length);
  const td = Buffer.concat([Buffer.from(type), donnees]);
  const c = Buffer.alloc(4); c.writeUInt32BE(crc32(td));
  return Buffer.concat([l, td, c]);
}
function tuile(r, v, b) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(256, 0); ihdr.writeUInt32BE(256, 4); ihdr[8] = 8; ihdr[9] = 2;
  const ligne = Buffer.alloc(1 + 256 * 3);
  for (let x = 0; x < 256; x++) { ligne[1 + x * 3] = r; ligne[2 + x * 3] = v; ligne[3 + x * 3] = b; }
  const brut = Buffer.concat(Array.from({ length: 256 }, function () { return ligne; }));
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), morceau('IHDR', ihdr), morceau('IDAT', zlib.deflateSync(brut)), morceau('IEND', Buffer.alloc(0))]);
}
const TUILES = { plan: tuile(238, 234, 226), ortho: tuile(96, 112, 88), osm: tuile(242, 239, 233) };

function simuler(route) {
  const u = route.request().url();
  const json = function (d) { return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(d) }); };
  if (u.indexOf('unpkg.com/maplibre-gl@') >= 0) {
    if (!LOCAL) return route.continue();
    const fichier = path.join(LOCAL, u.split('/').pop());
    return route.fulfill({ status: 200, contentType: u.endsWith('.css') ? 'text/css' : 'application/javascript', body: fs.readFileSync(fichier) });
  }
  if (u.includes('/geocodage/search') || u.includes('/geocodage/reverse')) return json(ADRESSE);
  if (u.includes('api-adresse.data.gouv.fr')) return route.abort();
  if (u.includes('/wmts') || u.includes('tile.openstreetmap.org') || u.includes('panoramax.test/')) {
    const t = u.includes('ORTHO') || u.includes('panoramax') ? TUILES.ortho : u.includes('openstreetmap') ? TUILES.osm : TUILES.plan;
    return route.fulfill({ status: 200, contentType: 'image/png', headers: { 'access-control-allow-origin': '*' }, body: t });
  }
  if (u.includes('/wfs')) return json(WFS);
  if (u.includes('api.bdnb.io')) return json([{ batiment_groupe_id: 'bdnb-bg-test', annee_construction: 1972, type_energie_chauffage: 'Gaz naturel', mat_mur_txt: 'Béton' }]);
  if (u.includes('/lines?')) {
    return json({ total: 2, results: [
      { etiquette_dpe: 'E', conso_5_usages_par_m2_ep: 290, annee_construction: 1972, date_etablissement_dpe: '2024-03-12', _geopoint: (LAT + 0.00005) + ',' + (LON + 0.00005), type_energie_principale_chauffage: 'Gaz naturel', adresse_ban: '1 place du Capitole 31000 Toulouse' },
      { etiquette_dpe: 'C', conso_5_usages_par_m2_ep: 150, date_etablissement_dpe: '2023-06-01', _geopoint: (LAT + 0.0004) + ',' + LON }] });
  }
  if (u.includes('panoramax.xyz')) {
    return json({ features: [{ assets: { thumb: { href: 'https://panoramax.test/t1.png' }, sd: { href: 'https://panoramax.test/s1.png' } }, properties: { datetime: '2024-05-01T10:00:00Z' } }] });
  }
  return route.abort();
}

async function nouvellePage(navigateur, options, routeur) {
  const contexte = await navigateur.newContext(Object.assign({ acceptDownloads: true }, options));
  const page = await contexte.newPage();
  page.on('pageerror', function (e) { problemes.push('Erreur JavaScript : ' + e.message); });
  page.on('console', function (m) {
    // Les ressources volontairement bloquées (réseau coupé, ancienne API) ne sont pas des bugs.
    if (m.type() === 'error' && !/Failed to load resource|ERR_|net::|AJAXError|Failed to fetch/.test(m.text())) problemes.push('Console : ' + m.text());
  });
  page.on('dialog', function (d) { d.accept(); });
  await page.route(/^https:\/\//, routeur || simuler);
  return page;
}

const deborde = function (page) {
  return page.evaluate(function () { return document.documentElement.scrollWidth > window.innerWidth + 1; });
};

(async function () {
  const navigateur = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

  console.log('Parcours complet (services simulés) :');
  const page = await nouvellePage(navigateur, { viewport: { width: 1440, height: 950 } });
  await page.goto(url('index.html'));
  ok(await page.isVisible('.accueil'), 'accueil affiché avant de choisir un bâtiment');
  await page.waitForSelector('.maplibregl-canvas', { timeout: 20000 }).catch(function () {});
  ok(await page.isVisible('.maplibregl-canvas'), 'carte MapLibre affichée');
  await page.fill('#recherche', '1 place du Capitole');
  await page.waitForSelector('#suggestions li', { timeout: 5000 });
  ok(true, 'suggestions d’adresses');
  await page.keyboard.press('Enter');
  await page.waitForSelector('.kpis', { timeout: 15000 });
  await page.waitForFunction(function () { return document.querySelector('#b-vignettes') && /BDNB|bdnb/i.test(document.querySelector('#b-vignettes').textContent); }, null, { timeout: 15000 }).catch(function () {});
  const vignettes = await page.textContent('#b-vignettes');
  ok(/240 m²/.test(vignettes), 'surface au sol lue sur le contour : 240 m² (' + (vignettes.match(/Surface au sol\s*([\d\s ]+m²)/) || [])[1] + ')');
  ok(/Murs mitoyens\s*19 %/.test(vignettes.replace(/\s+/g, ' ')), 'mitoyenneté détectée : 12 m collés au voisin sur 64 m de périmètre = 19 %');
  ok(/1948 – 1974/.test(vignettes), 'époque lue (BDNB 1972)');
  ok(/Gaz naturel/.test(vignettes), 'énergie de chauffage lue dans la BDNB');
  ok(await page.isVisible('#b-dpe .liste-dpe'), 'DPE autour du bâtiment affichés');
  ok((await page.textContent('#sources')).includes('BD TOPO'), 'état des sources affiché');
  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(SORTIE, 'outil-carte.png') });

  await page.click('[data-panneau="questions"]');
  await page.click('.tuile[data-cle="vitrage"][data-valeur="double-recent"]');
  const deja = await page.textContent('.deja');
  ok(/double vitrage récent/.test(deja), '« le vitrage non, déjà du double vitrage » après la réponse');
  await page.click('[data-panneau="factures"]');
  await page.fill('[data-facture="gaz"]', '60000');
  await page.press('[data-facture="gaz"]', 'Tab');
  await page.waitForSelector('.res-tete .badge.valide', { timeout: 5000 });
  ok(true, 'calage sur factures actif');
  await page.fill('[data-dju]', '2300');
  await page.press('[data-dju]', 'Tab');
  ok(/année à 2\s300 DJU/.test(await page.textContent('#f-bilan')), 'correction climatique des factures (2 300 DJU)');
  await page.fill('[data-nom-cas]', 'Immeuble test');
  await page.click('[data-action="garder-cas"]');
  ok(/gardé/.test(await page.textContent('.toast')), 'bâtiment gardé comme cas de référence');
  const bouquet = await page.$('[data-bouquet="complet"]');
  if (bouquet) { await bouquet.click(); ok(await page.isVisible('.graphe-cascade'), 'cascade du bouquet affichée'); }
  const [telechargement] = await Promise.all([page.waitForEvent('download'), page.click('[data-action="telecharger-fiche"]')]);
  const fiche = fs.readFileSync(await telechargement.path(), 'utf8');
  ok(/\.doc$/.test(telechargement.suggestedFilename()) && /Pré-diagnostic énergétique/.test(fiche) && /Préconisations/.test(fiche), 'fiche Word téléchargée (' + telechargement.suggestedFilename() + ')');
  await page.screenshot({ path: path.join(SORTIE, 'outil-resultats.png'), fullPage: true });

  await page.click('[data-vue="donnees"]');
  await page.waitForSelector('.liste-priorites li', { timeout: 10000 });
  const premiere = await page.textContent('.liste-priorites li');
  ok(/Si elle est fausse de 10 %/.test(premiere), 'valeurs à vérifier en priorité classées pour ce bâtiment');
  await page.click('.liste-priorites li [data-valider]');
  await page.waitForFunction(function () { return /Déjà validées par toi : 1/.test(document.querySelector('#priorites').textContent); }, null, { timeout: 10000 });
  ok(true, 'une valeur validée par toi');
  await page.fill('#filtre-donnees', 'gaz naturel');
  const champ = await page.$('[data-donnee="energie.gaz.prix"]');
  await champ.fill('0,15');
  await champ.press('Tab');
  ok((await page.textContent('#donnees')).includes('modifiée'), 'valeur modifiée dans l’onglet Données');
  await page.screenshot({ path: path.join(SORTIE, 'outil-donnees.png') });
  await page.click('[data-vue="methode"]');
  ok(await page.isVisible('#vue-methode .etapes-methode'), 'onglet Méthode');
  ok(await page.isHidden('#vue-diagnostic') && await page.isHidden('#vue-donnees'), 'les autres vues sont bien masquées');

  // Un deuxième cas (l'exemple + ses factures), puis l'onglet Validation
  await page.click('[data-vue="diagnostic"]');
  await page.click('#exemple');
  await page.click('[data-panneau="factures"]');
  await page.fill('[data-facture="gaz"]', '30000');
  await page.press('[data-facture="gaz"]', 'Tab');
  await page.fill('[data-nom-cas]', 'Maison exemple');
  await page.click('[data-action="garder-cas"]');
  await page.click('[data-vue="validation"]');
  const validation = await page.textContent('#validation');
  ok(/Immeuble test/.test(validation) && /Maison exemple/.test(validation), 'deux cas de référence listés');
  ok(/Biais moyen/.test(validation) && await page.isVisible('.graphe-nuage svg'), 'statistiques et nuage calcul / factures');
  const [exportCas] = await Promise.all([page.waitForEvent('download'), page.click('[data-action="exporter-cas"]')]);
  const contenu = JSON.parse(fs.readFileSync(await exportCas.path(), 'utf8'));
  ok(contenu.format === 'audit-flash-cas' && contenu.cas.length === 2, 'export des cas de référence (JSON)');
  ok(await page.isHidden('#vue-diagnostic'), 'Validation : le diagnostic est masqué');
  await page.screenshot({ path: path.join(SORTIE, 'outil-validation.png'), fullPage: true });
  await page.click('[data-ouvrir-cas]');
  ok(!(await page.isHidden('#vue-diagnostic')) && /Cas de référence/.test(await page.textContent('#b-adresse')), 'un cas se rouvre dans le diagnostic');
  await page.close();

  console.log('Sans réseau (tout bloqué) :');
  const horsLigne = await nouvellePage(navigateur, { viewport: { width: 1280, height: 900 } }, function (route) { return route.abort(); });
  await horsLigne.goto(url('index.html'));
  await horsLigne.waitForFunction(function () { return /indisponible/.test(document.querySelector('#carte').textContent); }, null, { timeout: 10000 }).catch(function () {});
  ok(/indisponible/.test(await horsLigne.textContent('#carte')), 'message « carte indisponible »');
  await horsLigne.click('#exemple');
  const resume = await horsLigne.textContent('#resume');
  ok(/3[45],\d MWh/.test(resume) && /F/.test(resume), 'exemple calculé sans réseau : ' + resume.replace(/\s+/g, ' ').trim().slice(0, 70));
  await horsLigne.close();

  console.log('Mobile 390 px :');
  for (const theme of ['light', 'dark']) {
    for (const p of ['index.html', 'faisabilite/index.html']) {
      const pg = await nouvellePage(navigateur, { viewport: { width: 390, height: 844 }, colorScheme: theme, isMobile: true, hasTouch: true });
      await pg.goto(url(p));
      if (p === 'index.html') {
        await pg.click('#exemple');
        await pg.waitForSelector('.kpis');
        for (const vue of ['donnees', 'methode', 'validation']) {
          await pg.click('[data-vue="' + vue + '"]');
          ok(!(await deborde(pg)), p + ' › ' + vue + ' (' + theme + ') : pas de défilement horizontal');
        }
        await pg.click('[data-vue="diagnostic"]');
        await pg.click('[data-panneau="questions"]');
      }
      ok(!(await deborde(pg)), p + ' (' + theme + ') : pas de défilement horizontal à 390 px');
      if (p === 'index.html') await pg.screenshot({ path: path.join(SORTIE, 'outil-mobile-' + theme + '.png'), fullPage: true });
      await pg.close();
    }
  }

  console.log('Sombre, grand écran :');
  const sombre = await nouvellePage(navigateur, { viewport: { width: 1440, height: 950 }, colorScheme: 'dark' });
  await sombre.goto(url('index.html'));
  await sombre.waitForSelector('.maplibregl-canvas', { timeout: 20000 }).catch(function () {});
  await sombre.fill('#recherche', '1 place du Capitole');
  await sombre.waitForSelector('#suggestions li', { timeout: 5000 });
  await sombre.keyboard.press('Enter');
  await sombre.waitForSelector('.kpis', { timeout: 15000 });
  await sombre.waitForTimeout(2500);
  await sombre.screenshot({ path: path.join(SORTIE, 'outil-sombre.png') });
  await sombre.close();

  await navigateur.close();
  if (problemes.length) { console.log('\n' + problemes.length + ' problème(s) :\n- ' + problemes.join('\n- ')); process.exit(1); }
  console.log('\nTout est bon. Captures dans ' + SORTIE);
})();
