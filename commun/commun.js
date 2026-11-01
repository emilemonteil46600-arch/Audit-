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

  /* ---------- Énergies, euros, durées (affichage seulement) ---------- */

  // kWh → la bonne unité : 800 kWh, 34,9 MWh, 470 MWh, 1,2 GWh.
  function uniteEnergie(v) {
    const a = Math.abs(v);
    if (a >= 1e6) return { div: 1e6, unite: 'GWh', dec: 1 };
    if (a >= 1e4) return { div: 1e3, unite: 'MWh', dec: a >= 1e5 ? 0 : 1 };
    return { div: 1, unite: 'kWh', dec: 0 };
  }
  FLASH.energie = function (v) {
    if (v === null || v === undefined || !isFinite(v)) return '–';
    const u = uniteEnergie(v);
    return FLASH.nombre(u.div === 1 ? FLASH.significatif(v, 2) : v / u.div, u.div === 1 ? 0 : u.dec) + ' ' + u.unite;
  };
  FLASH.fourchette = function (v, delta, format) {
    return format(Math.max(0, v - delta)) + ' – ' + format(v + delta);
  };
  // Les deux bornes dans la même unité, à 2 chiffres significatifs : « 27 – 43 MWh ».
  FLASH.fourchetteEnergie = function (v, delta) {
    const u = uniteEnergie(v);
    const f = function (x) { const a = FLASH.significatif(x / u.div, 2); return FLASH.nombre(a, u.dec && a < 10 ? 1 : 0); };
    return f(Math.max(0, v - delta)) + ' – ' + f(v + delta) + ' ' + u.unite;
  };
  FLASH.euros = function (v, chiffres) {
    if (v === null || v === undefined || !isFinite(v)) return '–';
    return FLASH.nombre(Math.abs(v) >= 100 ? FLASH.significatif(v, chiffres || 3) : Math.round(v)) + ' €';
  };
  FLASH.plageEuros = function (bas, haut) {
    return FLASH.nombre(FLASH.significatif(bas, 2)) + ' – ' + FLASH.nombre(FLASH.significatif(haut, 2)) + ' €';
  };
  FLASH.ans = function (v) {
    if (v === null || v === undefined || !isFinite(v)) return 'jamais';
    if (v < 1) return '< 1 an';
    return FLASH.nombre(v, v < 10 ? 1 : 0) + ' an' + (v >= 2 ? 's' : '');
  };
  FLASH.plageAns = function (bas, haut) {
    if (bas === null || haut === null || bas === undefined || haut === undefined) return 'jamais';
    const b = Math.max(1, Math.round(bas)), h = Math.max(1, Math.round(haut));
    return b === h ? b + ' an' + (b > 1 ? 's' : '') : b + ' – ' + h + ' ans';
  };
  FLASH.pct = function (v) { return FLASH.nombre(v * 100) + ' %'; };

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
