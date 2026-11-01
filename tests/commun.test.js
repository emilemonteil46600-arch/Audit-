/* Tests des fonctions communes (stockage préfixé, nombres français). */
const test = require('node:test');
const assert = require('node:assert/strict');
const { charger } = require('./aide-tests.js');
const FLASH = charger('commun/commun.js');

test('Stockage : toutes les clés commencent par « flash. »', function () {
  localStorage.clear();
  assert.equal(FLASH.ecrire('essai.v1', { a: 1 }), true);
  assert.deepEqual(localStorage.cles(), ['flash.essai.v1']);
  assert.deepEqual(FLASH.lire('essai.v1', null), { a: 1 });
  assert.equal(FLASH.lire('absent.v1', 'défaut'), 'défaut');
});

test('Stockage : une clé « bao.* » de la boîte à outils est refusée', function () {
  localStorage.clear();
  assert.throws(function () { FLASH.ecrire('bao.batiment.v1', {}); });
  assert.throws(function () { FLASH.ecrire('', {}); });
  assert.throws(function () { FLASH.ecrire('flash.double', {}); });
  assert.deepEqual(localStorage.cles(), []);
});

test('Nombres au format français', function () {
  assert.equal(FLASH.nombre(1234.5, 1).replace(/\s/g, ' '), '1 234,5');
  assert.equal(FLASH.nombre(NaN), '–');
  assert.equal(FLASH.lireNombre('1 250,5'), 1250.5);
  assert.equal(FLASH.lireNombre('1250.5'), 1250.5);
  assert.equal(FLASH.arrondi(723, 10), 720);
});

test('Échappement HTML', function () {
  assert.equal(FLASH.echapper('<b>"a" & \'b\'</b>'), '&lt;b&gt;&quot;a&quot; &amp; &#39;b&#39;&lt;/b&gt;');
});

test('Mise en forme des énergies, euros et durées', function () {
  const n = function (t) { return t.replace(/[\u00a0\u202f]/g, ' '); };
  assert.equal(n(FLASH.energie(34945.8)), '34,9 MWh');
  assert.equal(n(FLASH.energie(470000)), '470 MWh');
  assert.equal(n(FLASH.energie(812)), '810 kWh');
  assert.equal(n(FLASH.energie(1234567)), '1,2 GWh');
  assert.equal(n(FLASH.fourchetteEnergie(34945.8, 8000)), '27 – 43 MWh');
  assert.equal(n(FLASH.euros(4541)), '4 540 €');
  assert.equal(n(FLASH.plageEuros(2901.25, 5222.25)), '2 900 – 5 200 €');
  assert.equal(FLASH.ans(6.6), '6,6 ans');
  assert.equal(FLASH.ans(null), 'jamais');
  assert.equal(FLASH.plageAns(5.2, 9.4), '5 – 9 ans');
  assert.equal(FLASH.pct(0.243), '24 %');
});
