/* Règle « aucun chiffre sans source » : chaque valeur a une source, une date et un statut. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { charger } = require('./aide-tests.js');
const VALEURS = charger('donnees/sources.js');
const SERVICES = charger('donnees/services.js');

test('Chaque valeur a valeur, unité, source, date et statut exemple / valide', function () {
  Object.keys(VALEURS).forEach(function (k) {
    const v = VALEURS[k];
    assert.equal(typeof v.valeur, 'number', k);
    assert.ok(v.unite && v.source && v.libelle, k + ' : unité, libellé ou source manquant');
    assert.match(v.date, /^\d{4}-\d{2}-\d{2}$/, k + ' : date');
    assert.ok(['exemple', 'valide'].includes(v.statut), k + ' : statut');
  });
});

test('Chaque service testé a un nom, un rôle, une doc et des conditions marquées', function () {
  const ids = new Set();
  SERVICES.forEach(function (s) {
    assert.ok(s.id && s.nom && s.role && s.conditions, s.id);
    assert.match(s.doc, /^https:\/\//, s.id + ' : doc');
    assert.ok(!ids.has(s.id), s.id + ' en double');
    ids.add(s.id);
  });
});
