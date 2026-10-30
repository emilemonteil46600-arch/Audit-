/* ==========================================================
   Vérification dans un vrai navigateur (Chromium, via Playwright).
   Ce n'est PAS lancé par « node --test » ni sur GitHub : il faut
   Playwright installé sur la machine. Lancer : node tests/navigateur.js

   Vérifie : aucune erreur dans la console, pas de défilement horizontal
   à 390 px (clair et sombre), et le déroulé du test de faisabilité avec
   des réponses SIMULÉES (pour tester l'affichage, pas les services :
   le vrai test se fait en ouvrant la page en ligne).
   ========================================================== */
const path = require('path');
const { chromium } = require('playwright');

const RACINE = path.join(__dirname, '..');
const url = function (page) { return 'file://' + path.join(RACINE, page); };
const problemes = [];
const ok = function (condition, message) {
  if (condition) console.log('  ✓ ' + message);
  else { console.log('  ✗ ' + message); problemes.push(message); }
};

// Réponses simulées des services (un bâtiment de 20 m × 12 m, 9,5 m de haut).
const R = 6371008.8, LON = 1.4433, LAT = 43.6045;
const dLat = 12 / R * 180 / Math.PI, dLon = 20 / R * 180 / Math.PI / Math.cos(LAT * Math.PI / 180);
const anneau = [[LON - dLon / 2, LAT - dLat / 2], [LON + dLon / 2, LAT - dLat / 2], [LON + dLon / 2, LAT + dLat / 2], [LON - dLon / 2, LAT + dLat / 2], [LON - dLon / 2, LAT - dLat / 2]];
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');
function simuler(route) {
  const u = route.request().url();
  const json = function (d) { return route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(d) }); };
  if (u.includes('/geocodage/search')) return json({ features: [{ geometry: { coordinates: [LON, LAT] }, properties: { label: 'Adresse simulée', score: 0.97, id: '31555_0000_00001' } }] });
  if (u.includes('api-adresse.data.gouv.fr')) return route.abort();
  if (u.includes('/wmts') || u.includes('tile.openstreetmap.org')) return route.fulfill({ status: 200, contentType: 'image/png', headers: { 'access-control-allow-origin': '*' }, body: PNG });
  if (u.includes('openfreemap')) return json({ layers: [{ type: 'fill' }, { type: 'fill-extrusion' }] });
  // Lignes de coordonnées en (latitude, longitude) pour vérifier qu'on les remet dans l'ordre
  if (u.includes('/wfs')) return json({ features: [{ properties: { hauteur: 9.5, nombre_d_etages: null, usage_1: 'Résidentiel' }, geometry: { type: 'MultiPolygon', coordinates: [[anneau.map(function (p) { return [p[1], p[0]]; })]] } }] });
  if (u.includes('api.bdnb.io')) return json([{ batiment_groupe_id: 'bdnb-bg-test', annee_construction: 1975, usage_niveau_1_txt: 'Résidentiel collectif' }]);
  if (u.includes('/datasets?')) return json({ results: [{ id: 'dpe03existant' }, { id: 'dpe01tertiaire' }] });
  if (u.includes('/lines?')) return json({ total: 3, results: [{ etiquette_dpe: 'D', conso_5_usages_par_m2_ep: 210 }] });
  if (u.includes('panoramax')) return json({ features: [] });
  return route.abort();
}

async function nouvellePage(navigateur, options) {
  const contexte = await navigateur.newContext(options);
  const page = await contexte.newPage();
  page.on('pageerror', function (e) { problemes.push('Erreur JavaScript : ' + e.message); });
  page.on('console', function (m) {
    // Les ressources volontairement bloquées (bibliothèque de carte, ancienne API) ne sont pas des bugs.
    if (m.type() === 'error' && !/Failed to load resource|ERR_FAILED|net::/.test(m.text())) problemes.push('Console : ' + m.text());
  });
  await page.route(/^https:\/\//, simuler);
  return page;
}

(async function () {
  const navigateur = await chromium.launch();
  for (const theme of ['light', 'dark']) {
    for (const p of ['index.html', 'faisabilite/index.html']) {
      const page = await nouvellePage(navigateur, { viewport: { width: 390, height: 800 }, colorScheme: theme });
      await page.goto(url(p));
      const deborde = await page.evaluate(function () { return document.documentElement.scrollWidth > window.innerWidth; });
      ok(!deborde, p + ' (' + theme + ') : pas de défilement horizontal à 390 px');
      await page.close();
    }
  }

  console.log('Test de faisabilité avec réponses simulées :');
  const page = await nouvellePage(navigateur, { viewport: { width: 390, height: 900 } });
  await page.goto(url('faisabilite/index.html'));
  await page.click('#lancer');
  await page.waitForFunction(function () { return !document.querySelector('#lancer').disabled; }, null, { timeout: 30000 });
  const texte = await page.textContent('#corps-services');
  ok((texte.match(/✅/g) || []).length >= 8, 'au moins 8 services ✅ (' + (texte.match(/✅/g) || []).length + ')');
  ok(/❌/.test(texte), 'l’ancienne API adresse, bloquée, est notée ❌');
  ok(/720 m²/.test(await page.textContent('#surface')), 'surface de plancher simulée = 720 m² (240 m² × 3 niveaux)');
  const deborde = await page.evaluate(function () { return document.documentElement.scrollWidth > window.innerWidth; });
  ok(!deborde, 'résultats : pas de défilement horizontal à 390 px');
  await page.screenshot({ path: path.join(require('os').tmpdir(), 'faisabilite-simulee.png'), fullPage: true });

  await navigateur.close();
  if (problemes.length) { console.log('\n' + problemes.length + ' problème(s) :\n- ' + problemes.join('\n- ')); process.exit(1); }
  console.log('\nTout est bon.');
})();
