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
