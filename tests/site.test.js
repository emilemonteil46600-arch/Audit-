/* Tests du site : syntaxe de chaque fichier JavaScript, chaque page ne charge
   que des fichiers qui existent, bandeau « pré-diagnostic » partout.
   Lancer : node --test (depuis la racine du dépôt) */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { RACINE } = require('./aide-tests.js');

// Tous les fichiers du site (hors .git et tests), récursivement.
function fichiers(dossier, extension) {
  let liste = [];
  fs.readdirSync(dossier, { withFileTypes: true }).forEach(function (e) {
    if (e.name.startsWith('.') || e.name === 'tests' || e.name === 'node_modules') return;
    const chemin = path.join(dossier, e.name);
    if (e.isDirectory()) liste = liste.concat(fichiers(chemin, extension));
    else if (e.name.endsWith(extension)) liste.push(chemin);
  });
  return liste;
}

test('Syntaxe JavaScript (node --check) de chaque fichier du site', function () {
  const js = fichiers(RACINE, '.js');
  assert.ok(js.length >= 5);
  js.forEach(function (f) { execFileSync(process.execPath, ['--check', f]); });
});

test('Chaque page ne charge que des scripts et feuilles de style qui existent', function () {
  fichiers(RACINE, '.html').forEach(function (page) {
    const html = fs.readFileSync(page, 'utf8');
    const liens = Array.from(html.matchAll(/(?:src|href)="([^"#:]+\.(?:js|css|html))"/g)).map(function (m) { return m[1]; });
    liens.forEach(function (lien) {
      const cible = path.join(path.dirname(page), lien);
      assert.ok(fs.existsSync(cible), path.relative(RACINE, page) + ' → ' + lien + ' introuvable');
    });
  });
});

test('Chaque page affiche « pré-diagnostic, pas un audit réglementaire »', function () {
  fichiers(RACINE, '.html').forEach(function (page) {
    const html = fs.readFileSync(page, 'utf8');
    assert.ok(html.includes('pas un audit réglementaire'), path.relative(RACINE, page) + ' : bandeau manquant');
  });
});

test('Bibliothèques externes : uniquement avec une version exacte', function () {
  fichiers(RACINE, '.js').concat(fichiers(RACINE, '.html')).forEach(function (f) {
    const texte = fs.readFileSync(f, 'utf8');
    Array.from(texte.matchAll(/https:\/\/(?:unpkg\.com|cdn\.jsdelivr\.net\/npm)\/([^/'"\s]+)/g)).forEach(function (m) {
      assert.match(m[1], /@\d+\.\d+\.\d+$/, path.relative(RACINE, f) + ' : version non fixée pour ' + m[1]);
    });
  });
});

test('Aucune clé « bao.* » de la boîte à outils écrite par ce site', function () {
  fichiers(RACINE, '.js').forEach(function (f) {
    const texte = fs.readFileSync(f, 'utf8');
    assert.ok(!/setItem\(\s*['"]bao\./.test(texte), path.relative(RACINE, f) + ' écrit une clé bao.*');
  });
});
