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

  // Lit un nombre tapé à la française (« 1 250,5 ») ou à l'anglaise (« 1250.5 »).
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
