/* Tests de la logique du test de faisabilité : les exemples écrits en haut de calcul.js. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { charger, proche } = require('./aide-tests.js');
const C = charger('faisabilite/calcul.js');
const R = 6371008.8;

test('Surface au sol : carré de 0,0001° à 45° de latitude ≈ 87,4 m²', function () {
  const carre = [[0, 45], [0.0001, 45], [0.0001, 45.0001], [0, 45.0001], [0, 45]];
  assert.ok(proche(C.surfaceSolM2(carre, R), 87.43, 0.01));
});

test('Surface au sol : rectangle de 20 m × 12 m ≈ 240 m², sens de parcours indifférent', function () {
  // 20 m en longitude et 12 m en latitude, à 43,6° de latitude
  const dLat = 12 / R * 180 / Math.PI;
  const dLon = 20 / R * 180 / Math.PI / Math.cos(43.6 * Math.PI / 180);
  const rect = [[1.44, 43.6], [1.44 + dLon, 43.6], [1.44 + dLon, 43.6 + dLat], [1.44, 43.6 + dLat]];
  assert.ok(proche(C.surfaceSolM2(rect, R), 240, 0.5));
  assert.ok(proche(C.surfaceSolM2(rect.slice().reverse(), R), 240, 0.5));
});

test('Niveaux et surface de plancher : 240 m², 9,5 m, étage 3 m → 3 niveaux, 720 m²', function () {
  const e = C.estimerSurface(240, 9.5, NaN, 3);
  assert.equal(e.niveaux, 3);
  assert.equal(e.surfacePlancher, 720);
  assert.equal(e.origineNiveaux, 'hauteur');
});

test('Niveaux : le nombre d’étages BD TOPO passe avant la hauteur', function () {
  const e = C.estimerSurface(240, 9.5, 4, 3);
  assert.equal(e.niveaux, 4);
  assert.equal(e.origineNiveaux, 'bdtopo');
  assert.equal(C.niveauxDepuisHauteur(1, 3), 1);
  assert.equal(C.niveauxDepuisHauteur(0, 3), null);
  assert.equal(C.estimerSurface(240, NaN, NaN, 3).surfacePlancher, null);
});

test('Point dans un contour, contour remis en longitude / latitude', function () {
  const carre = [[1, 43], [1.001, 43], [1.001, 43.001], [1, 43.001]];
  assert.equal(C.pointDansPolygone([1.0005, 43.0005], carre), true);
  assert.equal(C.pointDansPolygone([1.002, 43.0005], carre), false);
  assert.deepEqual(C.remettreLonLat([43.2, 1.4], 43.2), [1.4, 43.2]);
  assert.deepEqual(C.remettreLonLat([1.4, 43.2], 43.2), [1.4, 43.2]);
});

test('Choix du bâtiment : celui sous le point, sinon le plus proche', function () {
  const poly = function (lon, lat) {
    return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[[lon, lat], [lon + 0.0002, lat], [lon + 0.0002, lat + 0.0002], [lon, lat + 0.0002], [lon, lat]]] } };
  };
  const loin = poly(1.4410, 43.6), dessous = poly(1.4400, 43.6);
  const choix = C.choisirBatiment([loin, dessous], 1.4401, 43.6001, R);
  assert.equal(choix.entite, dessous);
  assert.equal(choix.dedans, true);
  const proche2 = C.choisirBatiment([loin], 1.4401, 43.6001, R);
  assert.equal(proche2.dedans, false);
  assert.ok(proche2.distance > 50 && proche2.distance < 150);
  assert.equal(C.choisirBatiment([], 1, 43, R), null);
});

test('Rectangle de recherche et tuile de carte', function () {
  const b = C.bboxAutour(1.44, 43.6, 40, R);
  assert.ok(b[0] < 1.44 && b[2] > 1.44 && b[1] < 43.6 && b[3] > 43.6);
  assert.ok(proche((b[3] - b[1]) / 2 * Math.PI / 180 * R, 40, 0.001));
  // Tuile qui contient Paris (Notre-Dame) au zoom 10 : x = 518, y = 352 (schéma XYZ standard)
  assert.deepEqual(C.lonLatVersTuile(2.3499, 48.853, 10), { x: 518, y: 352, z: 10 });
});

test('Coordonnées collées', function () {
  assert.deepEqual(C.lireCoordonnees('43,6045 ; 1,4433'), { lat: 43.6045, lon: 1.4433 });
  assert.deepEqual(C.lireCoordonnees('43.6045, 1.4433'), { lat: 43.6045, lon: 1.4433 });
  assert.equal(C.lireCoordonnees('1 place du Capitole 31000 Toulouse'), null);
  assert.equal(C.lireCoordonnees('120 ; 1'), null);
});

test('Verdicts ✅ / 🟠 / ❌', function () {
  assert.equal(C.verdict({ repond: false }, 3000).symbole, '❌');
  assert.equal(C.verdict({ repond: true, utile: false, dureeMs: 100 }, 3000).symbole, '🟠');
  assert.equal(C.verdict({ repond: true, utile: true, dureeMs: 5000 }, 3000).symbole, '🟠');
  assert.equal(C.verdict({ repond: true, utile: true, dureeMs: 800 }, 3000).symbole, '✅');
});

test('Champs utiles : garde les champs non vides qui correspondent', function () {
  const p = { hauteur: 9.5, usage_1: 'Résidentiel', vide: '', objet: {}, nombre_d_etages: null, cleabs: 'X' };
  assert.deepEqual(C.champsUtiles(p, [/hauteur/, /usage/, /etage/]), [['hauteur', 9.5], ['usage_1', 'Résidentiel']]);
  assert.deepEqual(C.champsUtiles(null, [/a/]), []);
});

test('Adresses des services : seule l’adresse ou le point part', function () {
  assert.equal(C.URLS.geocodage('1 place du Capitole'), 'https://data.geopf.fr/geocodage/search?limit=1&q=1%20place%20du%20Capitole');
  const wfs = C.URLS.batimentsBdTopo([1, 43, 2, 44]);
  assert.match(wfs, /BBOX=43,1,44,2,urn:ogc:def:crs:EPSG::4326$/);
  Object.keys(C.URLS).forEach(function (k) { assert.equal(typeof C.URLS[k], 'function', k); });
});
