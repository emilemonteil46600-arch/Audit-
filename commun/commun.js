/* ==========================================================
   Audit flash — fonctions partagées par toutes les pages
   (objet global FLASH) : stockage navigateur, nombres au
   format français, petits utilitaires d'affichage.
   ========================================================== */
(function (global) {
  'use strict';

  const FLASH = {};

  FLASH.AVERTISSEMENT = 'Pré-diagnostic : ordre de grandeur, pas un audit réglementaire.';

  /* ---------- Stockage du navigateur ----------
     Les deux sites d'Émile (boîte à outils et Audit flash) sont sur la même
     adresse github.io : ils partagent probablement le même localStorage (H).
     Donc TOUTES les clés de l'Audit flash commencent par « flash. »,
     et on n'écrit JAMAIS une clé « bao.* » (celles de la boîte à outils). */
  FLASH.PREFIXE = 'flash.';

  // « projet.v1 » → « flash.projet.v1 ». Refuse un nom vide ou une clé de la boîte à outils.
  FLASH.cle = function (nom) {
    const n = String(nom || '');
    if (!n || n.startsWith('bao.') || n.startsWith(FLASH.PREFIXE)) {
      throw new Error('Nom de clé refusé : « ' + n + ' » (donner le nom sans préfixe, jamais une clé bao.*)');
    }
    return FLASH.PREFIXE + n;
  };

  function stockage() {
    try { return global.localStorage || null; } catch (e) { return null; }
  }

  FLASH.lire = function (nom, defaut) {
    try {
      const brut = stockage().getItem(FLASH.cle(nom));
      return brut === null ? defaut : JSON.parse(brut);
    } catch (e) {
      return defaut;
    }
  };

  FLASH.ecrire = function (nom, valeur) {
    const cle = FLASH.cle(nom); // lève une erreur si le nom est interdit : on ne l'avale pas
    try {
      stockage().setItem(cle, JSON.stringify(valeur));
      return true;
    } catch (e) {
      return false;
    }
  };

  /* ---------- Nombres (format français) ----------
     On arrondit l'AFFICHAGE, jamais le calcul. */
  FLASH.nombre = function (valeur, decimales) {
    if (valeur === null || valeur === undefined || !isFinite(valeur)) return '–';
    const d = decimales === undefined ? 0 : decimales;
    return new Intl.NumberFormat('fr-FR', { minimumFractionDigits: d, maximumFractionDigits: d }).format(valeur);
  };

  // Arrondi d'affichage au « pas » près (ex. 10 → 723 devient 720). Jamais utilisé dans un calcul.
  FLASH.arrondi = function (valeur, pas) {
    return Math.round(valeur / pas) * pas;
  };

  // Arrondi d'affichage à n chiffres significatifs (ex. 2 → 34 946 devient 35 000). Jamais dans un calcul.
  FLASH.significatif = function (valeur, chiffres) {
    if (!valeur || !isFinite(valeur)) return valeur;
    const pas = Math.pow(10, Math.floor(Math.log10(Math.abs(valeur))) - (chiffres || 2) + 1);
    return Math.round(valeur / pas) * pas;
  };

  FLASH.telecharger = function (nomFichier, contenu, type) {
    const url = URL.createObjectURL(new Blob([contenu], { type: type || 'application/octet-stream' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = nomFichier;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  };

  // Nom de fichier sûr, sans accents ni signes (repris de la boîte à outils).
  FLASH.nomFichier = function (texte, defaut) {
    const propre = String(texte || '')
      .replace(/œ/g, 'oe').replace(/Œ/g, 'OE').replace(/æ/g, 'ae').replace(/Æ/g, 'AE')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^A-Za-z0-9 _-]+/g, ' ')
      .trim().replace(/\s+/g, '-');
    return propre || defaut;
  };

  // Copie un contenu mis en forme (pour Word) et sa version texte (repris de la boîte à outils).
  FLASH.copierHtml = async function (html, texte) {
    try {
      if (global.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
        await navigator.clipboard.write([new ClipboardItem({
          'text/html': new Blob([html], { type: 'text/html' }),
          'text/plain': new Blob([texte], { type: 'text/plain' })
        })]);
        return true;
      }
    } catch (e) { /* méthode de secours ci-dessous */ }
    try {
      const zone = document.createElement('div');
      zone.innerHTML = html;
      zone.style.position = 'fixed';
      zone.style.left = '-9999px';
      document.body.appendChild(zone);
      const plage = document.createRange();
      plage.selectNodeContents(zone);
      const sel = global.getSelection();
      sel.removeAllRanges();
      sel.addRange(plage);
      const ok = document.execCommand('copy');
      sel.removeAllRanges();
      zone.remove();
      return ok;
    } catch (e) {
      return false;
    }
  };

  // Lit un nombre tapé (« 1 250,5 ») ou à l'anglaise (« 1250.5 »).
  FLASH.lireNombre = function (texte) {
    if (typeof texte === 'number') return texte;
    if (texte === null || texte === undefined) return NaN;
    const propre = String(texte).replace(/[\s\u00a0\u202f]/g, '').replace(',', '.');
    return propre === '' ? NaN : Number(propre);
  };

  /* ---------- Affichage ---------- */
  FLASH.echapper = function (texte) {
    return String(texte === null || texte === undefined ? '' : texte)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  FLASH.toast = function (message) {
    if (typeof document === 'undefined') return;
    let t = document.querySelector('.toast');
    if (!t) {
      t = document.createElement('div');
      t.className = 'toast';
      t.setAttribute('role', 'status');
      document.body.appendChild(t);
    }
    t.textContent = message;
    t.classList.add('visible');
    clearTimeout(FLASH._toast);
    FLASH._toast = setTimeout(function () { t.classList.remove('visible'); }, 2600);
  };

  global.FLASH = FLASH;
  if (typeof module !== 'undefined' && module.exports) module.exports = FLASH;
})(typeof window !== 'undefined' ? window : globalThis);
