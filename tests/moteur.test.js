/* Tests du moteur de calcul : l'exemple refait à la main en haut de moteur/calcul.js. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { charger, proche } = require('./aide-tests.js');
const H = charger('donnees/hypotheses.js');
const M = charger('moteur/calcul.js');

// Maison de plain-pied de 1970 à Toulouse, 10 m × 10 m, 3 m de haut, chaudière gaz ancienne.
function entreesExemple(plus) {
  return Object.assign({
    surfaceSol: { valeur: 100, origine: 'carte' },
    niveaux: { valeur: 1, origine: 'carte' },
    perimetre: { valeur: 40, origine: 'carte' },
    perimetreExpose: { valeur: 40, origine: 'carte' },
    hauteur: { valeur: 3, origine: 'carte' },
    departement: { valeur: '31', origine: 'carte' },
    usage: { valeur: 'logement-individuel', origine: 'saisie' },
    annee: { valeur: 1970, origine: 'saisie' },
    chauffage: { valeur: 'gaz-ancienne', origine: 'saisie' }
  }, plus || {});
}
const D = function () { return M.creerDonnees(H); };

test('Zones climatiques et périodes', function () {
  assert.equal(M.zoneDepuisDepartement('31', H.ZONES), 'H2c');
  assert.equal(M.zoneDepuisDepartement('2a', H.ZONES), 'H3');
  assert.equal(M.zoneDepuisDepartement('971', H.ZONES), null);
  assert.equal(M.periodeDepuisAnnee(1970, H.PERIODES), '1948-1974');
  assert.equal(M.periodeDepuisAnnee(1948, H.PERIODES), '1948-1974');
  assert.equal(M.periodeDepuisAnnee(1947, H.PERIODES), 'av1948');
  assert.equal(M.periodeDepuisAnnee(2024, H.PERIODES), 'ap2021');
  assert.equal(M.periodeDepuisAnnee('', H.PERIODES), null);
});

test('Ce qui manque est signalé (surface, département)', function () {
  const r = M.diagnostiquer({ usage: { valeur: 'bureaux', origine: 'saisie' } }, {}, H);
  assert.deepEqual(r.manque, ['surface', 'departement']);
});

test('Plancher sur terre-plein (NF EN ISO 13370) : 100 m², P = 40 m, U paroi 2,0 → 0,605', function () {
  assert.ok(proche(M.uTerrePlein(100, 40, 2.0, D()), 0.6048, 0.0005));
});

test('Exemple : déperditions 508,6 W/K et origines des valeurs', function () {
  const r = M.diagnostiquer(entreesExemple(), {}, H);
  const h = r.modele.deperditions;
  assert.ok(proche(r.modele.geometrie.surfaceChauffee, 80, 1e-9));
  assert.ok(proche(h.murs, 163.2, 1e-9));
  assert.ok(proche(h.vitrages, 52.2, 1e-9));
  assert.ok(proche(h.toiture, 100, 1e-9));
  assert.ok(proche(h.plancher, 100, 1e-9));
  assert.ok(proche(h.ponts, 32, 1e-9));
  assert.ok(proche(h.air, 61.2, 1e-9));
  assert.ok(proche(h.total, 508.6, 1e-9));
  assert.equal(r.origines.murs.origine, 'deduite');
  assert.equal(r.origines.chauffage.origine, 'saisie');
  assert.equal(r.origines.surface.origine, 'carte');
  assert.equal(r.params.plancherType, 'vide-sanitaire');
  assert.equal(r.params.toitureType, 'combles');
});

test('Exemple : consommations, facture, étiquette F, puissance 12,2 kW', function () {
  const r = M.diagnostiquer(entreesExemple(), {}, H).modele;
  const u = Object.fromEntries(r.usages.map(function (x) { return [x.id, x]; }));
  assert.ok(proche(r.besoinChauffage, 21422.232, 1e-6));
  assert.ok(proche(u.chauffage.ef, 29753.1, 1e-6));
  assert.ok(proche(u.ecs.besoin, 1464.337952, 1e-6));
  assert.ok(proche(u.ecs.ef, 1464.337952 / 0.612, 1e-6));
  assert.equal(u.ecs.energie, 'gaz');
  assert.ok(proche(u.eclairage.ef + u.auxiliaires.ef + u.autres.ef + u.froid.ef, 2800, 1e-9));
  assert.ok(proche(r.total.cout, 4541.0, 0.5));
  assert.ok(proche(r.ratios.ep5, 411.32, 0.01));
  assert.ok(proche(r.ratios.co25, 91.55, 0.01));
  assert.deepEqual(r.etiquette, { energie: 'F', climat: 'F', classe: 'F' });
  assert.ok(proche(r.puissance, 12.2064, 1e-9));
});

test('Fourchette : contributions triées, plus serrée quand on répond', function () {
  const vague = M.diagnostiquer(entreesExemple(), {}, H);
  const precis = M.diagnostiquer(entreesExemple({
    murs: { valeur: 'non-isole', origine: 'saisie' }, toiture: { valeur: 'combles-isoles-ancien', origine: 'saisie' },
    vitrage: { valeur: 'double-ancien', origine: 'saisie' }, plancher: { valeur: 'vide-sanitaire', origine: 'saisie' },
    ventilation: { valeur: 'naturelle', origine: 'saisie' }, surfacePlancher: { valeur: 100, origine: 'saisie' }
  }), {}, H);
  const c = vague.incertitude.contributions;
  for (let i = 1; i < c.length; i++) assert.ok(c[i - 1].delta >= c[i].delta);
  assert.ok(vague.rel > precis.rel, vague.rel + ' > ' + precis.rel);
  assert.ok(['bonne', 'moyenne', 'faible'].includes(vague.fiabilite));
});

test('Calage sur factures : k par énergie, fourchette resserrée', function () {
  const r = M.diagnostiquer(entreesExemple(), { gaz: 30000, electricite: 3000 }, H);
  assert.ok(r.calage.actif);
  assert.ok(proche(r.calage.coefs.gaz, 30000 / (32145.809 * 1.11), 1e-4));
  assert.ok(proche(r.resultat.total.cout, 30000 * 0.11 + 3000 * 0.22, 0.01));
  assert.ok(r.rel <= 0.1 + 1e-9);
  const autre = M.diagnostiquer(entreesExemple(), { fioul: 20000 }, H);
  assert.deepEqual(autre.calage.sansModele, ['fioul']);
  assert.equal(autre.calage.actif, false);
});

test('Temps de retour : brut, actualisé, VAN', function () {
  assert.equal(M.tempsRetourBrut(1000, 100), 10);
  assert.equal(M.tempsRetourBrut(1000, 0), null);
  assert.ok(proche(M.tempsRetourActualise(1000, 100, 0, 0, 60), 10, 1e-9));
  // i = a : chaque année rapporte 100 / 1,04 → 1000 × 1,04 / 100 = 10,4 ans
  assert.ok(proche(M.tempsRetourActualise(1000, 100, 0.04, 0.04, 60), 10.4, 1e-9));
  assert.equal(M.tempsRetourActualise(1000, 10, 0, 0.04, 60), null);
  assert.ok(proche(M.van(1000, 100, 0, 0, 30), 2000, 1e-9));
  assert.equal(M.verdict(5, 30, 0.5), 'afaire');
  assert.equal(M.verdict(20, 30, 0.5), 'discuter');
  assert.equal(M.verdict(40, 30, 0.5), 'non');
  assert.equal(M.verdict(null, 30, 0.5), 'non');
});

test('Combles : ≈ 614 €/an d’économie, coût TTC 2 901 – 5 222 €, ✅ à faire', function () {
  const r = M.diagnostiquer(entreesExemple(), {}, H);
  const a = r.actions.find(function (x) { return x.id === 'combles'; });
  assert.ok(proche(a.gainEf, 3622.32 / 0.72, 1e-6));
  assert.ok(proche(a.economie, 3622.32 / 0.72 * 1.11 * 0.11, 1e-6));
  assert.ok(proche(a.cout.bas, 100 * 25 * 1.1 * 1.055, 1e-6));
  assert.ok(proche(a.cout.haut, 100 * 45 * 1.1 * 1.055, 1e-6));
  assert.equal(a.verdict, 'afaire');
});

test('« Le vitrage non, déjà du double vitrage » ; fenêtres anciennes : pas rentable', function () {
  const recent = M.diagnostiquer(entreesExemple({ vitrage: { valeur: 'double-recent', origine: 'saisie' } }), {}, H);
  const m = recent.actions.find(function (x) { return x.id === 'menuiseries'; });
  assert.equal(m.etat.etat, 'deja');
  assert.match(m.etat.raison, /double vitrage/);
  const ancien = M.diagnostiquer(entreesExemple(), {}, H).actions.find(function (x) { return x.id === 'menuiseries'; });
  assert.equal(ancien.verdict, 'non');
});

test('Bouquet : gains non additifs, PAC plus petite après isolation', function () {
  const r = M.diagnostiquer(entreesExemple(), {}, H);
  const complet = r.bouquets.find(function (b) { return b.id === 'complet'; });
  assert.ok(complet.ids.length >= 4);
  const somme = complet.ids.reduce(function (s, id) { return s + r.actions.find(function (a) { return a.id === id; }).economie; }, 0);
  assert.ok(complet.economie < somme, 'bouquet ' + complet.economie + ' < somme ' + somme);
  const pacSeule = r.actions.find(function (a) { return a.id === 'pac-air-eau'; });
  const pacBouquet = complet.etapes.find(function (e) { return e.id === 'pac-air-eau'; });
  if (pacBouquet) assert.ok(pacBouquet.cout.quantite.valeur < pacSeule.cout.quantite.valeur);
  // Étapes dans l'ordre : enveloppe avant systèmes
  const ordre = complet.etapes.map(function (e) { return M.ACTIONS.find(function (a) { return a.id === e.id; }).famille; });
  const rangs = ordre.map(function (f) { return M.ORDRE_FAMILLES.indexOf(f); });
  for (let i = 1; i < rangs.length; i++) assert.ok(rangs[i] > rangs[i - 1]);
});

test('Tertiaire : bureaux 1980 à Paris, ratios cohérents, actions tertiaires', function () {
  const r = M.diagnostiquer({
    surfaceSol: { valeur: 1000, origine: 'carte' }, niveaux: { valeur: 3, origine: 'carte' },
    perimetre: { valeur: 130, origine: 'carte' }, perimetreExpose: { valeur: 130, origine: 'carte' },
    hauteur: { valeur: 9, origine: 'carte' }, departement: { valeur: '75', origine: 'carte' },
    usage: { valeur: 'bureaux', origine: 'saisie' }, annee: { valeur: 1980, origine: 'saisie' }
  }, {}, H);
  assert.equal(r.resultat.etiquette, null);
  assert.ok(r.resultat.ratios.ef > 100 && r.resultat.ratios.ef < 300, 'EF/m² = ' + r.resultat.ratios.ef);
  const ids = r.actions.filter(function (a) { return a.etat.etat === 'ok'; }).map(function (a) { return a.id; });
  assert.ok(ids.includes('led') && ids.includes('double-flux') && !ids.includes('hygro'));
});

test('Chaque action a un coût, une durée de vie et des valeurs connues', function () {
  const d = D();
  M.ACTIONS.forEach(function (a) {
    const cle = typeof a.cout === 'function' ? a.cout({ famille: 'logement' }) : a.cout;
    assert.equal(typeof d.v(cle + '.bas'), 'number', a.id);
    assert.ok(d.v(cle + '.haut') >= d.v(cle + '.bas'), a.id);
    assert.ok(d.v(a.duree) > 0, a.id);
    assert.ok(M.ORDRE_FAMILLES.includes(a.famille), a.id);
  });
});

test('Tes modifications de l’onglet Données sont prises en compte', function () {
  const base = M.diagnostiquer(entreesExemple(), {}, H);
  const modifie = M.diagnostiquer(entreesExemple(), {}, H, { 'energie.gaz.prix': 0.2 });
  assert.ok(modifie.resultat.total.cout > base.resultat.total.cout);
  assert.ok(!modifie.exemples.some(function (v) { return v.id === 'energie.gaz.prix'; }));
  assert.ok(base.exemples.some(function (v) { return v.id === 'energie.gaz.prix'; }));
});

test('Valeurs qui pèsent le plus : prix du gaz ≈ 0,86 sur la facture, DJU ≈ 0,85 sur la consommation', function () {
  const liste = M.influences(entreesExemple(), {}, H, {});
  const gaz = liste.find(function (x) { return x.id === 'energie.gaz.prix'; });
  // + 10 % sur le prix du gaz : + 10 % sur 3 925 € de gaz, sur une facture de 4 541 €
  assert.ok(proche(gaz.facture, 3925.003 / 4541.003, 0.001));
  assert.equal(gaz.conso, 0);
  const dju = liste.find(function (x) { return x.id === 'climat.H2c.dju'; });
  // + 10 % de DJU : + 10 % sur le chauffage (29 753 kWh) sur 34 946 kWh au total
  assert.ok(proche(dju.conso, 29753.1 / 34945.809, 0.001));
  for (let i = 1; i < liste.length; i++) assert.ok(liste[i - 1].poids >= liste[i].poids);
  assert.ok(liste.slice(0, 10).some(function (x) { return x.id === 'chauffage.gaz-ancienne.rendement'; }));
});

test('Une valeur validée par toi ne compte plus comme « exemple »', function () {
  const avant = M.diagnostiquer(entreesExemple(), {}, H, {});
  const apres = M.diagnostiquer(entreesExemple(), {}, H, {}, { validees: { 'energie.gaz.prix': '2026-10-30' } });
  assert.equal(apres.exemples.length, avant.exemples.length - 1);
  assert.ok(!apres.exemples.some(function (v) { return v.id === 'energie.gaz.prix'; }));
  assert.ok(!M.influences(entreesExemple(), {}, H, {}, { validees: { 'energie.gaz.prix': '2026-10-30' } })
    .some(function (x) { return x.id === 'energie.gaz.prix'; }));
});

test('Correction climatique : factures d’une année à + 20 % de DJU → k plus bas', function () {
  const normal = M.diagnostiquer(entreesExemple(), { gaz: 30000 }, H, {}, { djuFactures: 1950 });
  const sans = M.diagnostiquer(entreesExemple(), { gaz: 30000 }, H, {});
  assert.ok(proche(normal.calage.coefs.gaz, sans.calage.coefs.gaz, 1e-12));
  const froid = M.diagnostiquer(entreesExemple(), { gaz: 30000 }, H, {}, { djuFactures: 2340 });
  assert.ok(proche(froid.calage.coefs.gaz, 30000 / ((29753.1 * 1.2 + 2392.709) * 1.11), 1e-6));
  // Le résultat affiché reste l'année normale : la consommation de gaz calée est plus basse
  assert.ok(froid.resultat.parEnergie.gaz.ef < sans.resultat.parEnergie.gaz.ef);
  assert.equal(froid.calage.djuFactures, 2340);
});

test('Cas de référence : écart, fourchette, biais', function () {
  const exact = M.evaluerCas({ entrees: entreesExemple(), factures: { gaz: 32145.809 * 1.11, electricite: 2800 } }, H, {});
  assert.ok(proche(exact.ecart, 0, 1e-6));
  assert.equal(exact.dedans, true);
  const bas = M.evaluerCas({ entrees: entreesExemple(), factures: { gaz: 20000 } }, H, {});
  assert.ok(proche(bas.ecart, (32145.809 * 1.11 - 20000) / 20000, 1e-6));
  assert.equal(bas.dedans, false);
  const autre = M.evaluerCas({ entrees: entreesExemple(), factures: { fioul: 20000 } }, H, {});
  assert.deepEqual(autre.manquantes, ['fioul']);
  assert.deepEqual(M.evaluerCas({ entrees: entreesExemple(), factures: {} }, H, {}).manque, ['factures']);
  const st = M.statistiquesCas([exact, bas]);
  assert.equal(st.n, 2);
  assert.ok(proche(st.biais, bas.ecart / 2, 1e-6));
  assert.equal(st.partDedans, 0.5);
  assert.deepEqual(M.statistiquesCas([]), { n: 0 });
});

test('Bâtiments types : chacun se calcule, la maison est l’exemple de la Méthode', function () {
  H.BATIMENTS_TYPES.forEach(function (b) {
    const r = M.diagnostiquer(b.entrees, {}, H, {});
    assert.deepEqual(r.manque, [], b.nom);
    assert.ok(r.resultat.ratios.ef > 50 && r.resultat.ratios.ef < 700, b.nom + ' : ' + r.resultat.ratios.ef);
  });
  const maison = M.diagnostiquer(H.BATIMENTS_TYPES[0].entrees, {}, H, {});
  assert.ok(proche(maison.modele.deperditions.total, 508.6, 1e-9));
  const classement = M.influencesSurCas(H.BATIMENTS_TYPES, H, {});
  assert.ok(classement.length > 50);
  assert.ok(classement[0].cas);
});
