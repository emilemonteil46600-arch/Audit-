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

const H = charger('donnees/hypotheses.js');

test('Hypothèses du moteur : identifiant unique, chiffre, unité, source, date, statut', function () {
  const ids = new Set();
  H.VALEURS.forEach(function (v) {
    assert.ok(!ids.has(v.id), v.id + ' en double');
    ids.add(v.id);
    assert.equal(typeof v.valeur, 'number', v.id);
    assert.ok(isFinite(v.valeur), v.id);
    assert.ok(v.libelle && v.unite && v.source && v.groupe, v.id + ' : libellé, unité, source ou groupe manquant');
    assert.match(v.date, /^\d{4}-\d{2}-\d{2}$/, v.id);
    assert.ok(['exemple', 'valide'].includes(v.statut), v.id);
  });
  assert.ok(H.VALEURS.length > 250);
});

test('Zones climatiques : les 96 départements de métropole, chacun une seule fois', function () {
  const deps = Object.keys(H.ZONES).reduce(function (t, z) { return t.concat(H.ZONES[z]); }, []);
  assert.equal(deps.length, 96);
  assert.equal(new Set(deps).size, 96);
  ['01', '2A', '2B', '46', '75', '95'].forEach(function (d) { assert.ok(deps.includes(d), d); });
});

test('Chaque choix des questions a ses valeurs chiffrées', function () {
  const ids = new Set(H.VALEURS.map(function (v) { return v.id; }));
  const doit = function (id) { assert.ok(ids.has(id), 'valeur manquante : ' + id); };
  H.CHOIX.murs.forEach(function (c) { doit('u.mur.' + c.id); });
  H.CHOIX.toiture.forEach(function (c) { doit('u.toit.' + c.id); });
  H.CHOIX.vitrage.forEach(function (c) { doit('uw.' + c.id); doit('infiltration.vitrage.' + c.id); });
  H.CHOIX.chauffage.forEach(function (c) { doit('chauffage.' + c.id + '.rendement'); });
  H.CHOIX.ventilation.forEach(function (c) { doit('ventilation.' + c.id + '.n'); doit('aux.' + c.id); });
  H.CHOIX.regulation.forEach(function (c) { doit('regulation.' + c.id + '.facteur'); });
  H.CHOIX.climatisation.forEach(function (c) { doit('clim.' + c.id + '.part'); });
  H.PERIODES.forEach(function (p) { ['u.mur.defaut.', 'u.toit.defaut.', 'u.plancher.defaut.', 'infiltration.'].forEach(function (x) { doit(x + p.id); }); });
  H.USAGES.forEach(function (u) { ['surfaceUtile', 'hsp', 'tauxVitrage', 'intermittence', 'eclairage', 'autres'].forEach(function (x) { doit('usage.' + u.id + '.' + x); }); });
  H.ENERGIES.forEach(function (e) { doit('energie.' + e.id + '.prix'); doit('energie.' + e.id + '.ep'); });
  Object.keys(H.ZONES).forEach(function (z) { doit('climat.' + z + '.dju'); doit('climat.' + z + '.tbase'); });
});
