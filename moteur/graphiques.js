/* ==========================================================
   GRAPHIQUES — AUDIT FLASH
   Dessins (HTML et SVG) à partir de résultats déjà calculés par
   moteur/calcul.js. AUCUN calcul thermique ici : seulement des
   mises à l'échelle pour dessiner (largeurs en %, angles).
   Couleurs : variables CSS (claires et sombres) de commun/style.css.
   ========================================================== */
(function (global) {
  'use strict';

  const F = global.FLASH;
  const G = {};
  const esc = function (t) { return F.echapper(t); };

  // Couleur de chaque usage et de chaque paroi (variables CSS).
  G.COULEURS = {
    chauffage: 'var(--u-chauffage)', ecs: 'var(--u-ecs)', froid: 'var(--u-froid)',
    eclairage: 'var(--u-eclairage)', auxiliaires: 'var(--u-aux)', autres: 'var(--u-autres)',
    murs: 'var(--d-murs)', vitrages: 'var(--d-vitrages)', toiture: 'var(--d-toiture)',
    plancher: 'var(--d-plancher)', ponts: 'var(--d-ponts)', air: 'var(--d-air)'
  };

  /* ---------- Anneau (répartition) ----------
     parts : [{ id, nom, valeur, texte }] ; centre : { valeur, unite, sous } */
  G.anneau = function (parts, centre) {
    const total = parts.reduce(function (s, p) { return s + Math.max(0, p.valeur); }, 0);
    const r = 70, c = 2 * Math.PI * r;
    let decalage = 0;
    const arcs = parts.filter(function (p) { return p.valeur > 0; }).map(function (p) {
      const longueur = total > 0 ? p.valeur / total * c : 0;
      const trait = Math.max(0, longueur - (parts.length > 1 ? 2 : 0));
      const arc = '<circle class="arc" cx="100" cy="100" r="' + r + '" fill="none" stroke="' + (G.COULEURS[p.id] || 'var(--encre-3)') +
        '" stroke-width="26" stroke-dasharray="' + trait.toFixed(2) + ' ' + (c - trait).toFixed(2) +
        '" stroke-dashoffset="' + (-decalage).toFixed(2) + '" transform="rotate(-90 100 100)"><title>' + esc(p.nom) + '</title></circle>';
      decalage += longueur;
      return arc;
    }).join('');
    const legende = parts.filter(function (p) { return p.valeur > 0; }).map(function (p) {
      const part = total > 0 ? p.valeur / total * 100 : 0;
      return '<li><span class="puce-couleur" style="background:' + (G.COULEURS[p.id] || 'var(--encre-3)') + '"></span>' +
        '<span class="leg-nom">' + esc(p.nom) + '</span><span class="leg-val">' + esc(p.texte) + '</span>' +
        '<span class="leg-part">' + F.nombre(part) + ' %</span></li>';
    }).join('');
    return '<div class="graphe-anneau"><svg viewBox="0 0 200 200" role="img" aria-label="Répartition">' +
      '<circle cx="100" cy="100" r="' + r + '" fill="none" stroke="var(--surface-2)" stroke-width="26"/>' + arcs +
      '<text x="100" y="96" text-anchor="middle" class="anneau-valeur">' + esc(centre.valeur) + '</text>' +
      '<text x="100" y="116" text-anchor="middle" class="anneau-unite">' + esc(centre.unite) + '</text>' +
      (centre.sous ? '<text x="100" y="133" text-anchor="middle" class="anneau-sous">' + esc(centre.sous) + '</text>' : '') +
      '</svg><ul class="legende">' + legende + '</ul></div>';
  };

  /* ---------- Barres horizontales ----------
     items : [{ id, nom, valeur, texte, icone }] */
  G.barres = function (items) {
    const max = items.reduce(function (m, i) { return Math.max(m, i.valeur); }, 0);
    return '<div class="graphe-barres">' + items.map(function (i) {
      const l = max > 0 ? i.valeur / max * 100 : 0;
      return '<div class="barre-ligne"><span class="barre-nom">' +
        (i.icone ? '<svg class="ico"><use href="#i-' + i.icone + '"/></svg>' : '') + esc(i.nom) + '</span>' +
        '<span class="barre-piste"><span class="barre-rempli" style="width:' + l.toFixed(1) + '%;background:' + (G.COULEURS[i.id] || 'var(--accent)') + '"></span></span>' +
        '<span class="barre-val">' + esc(i.texte) + '</span></div>';
    }).join('') + '</div>';
  };

  /* ---------- Tornade (ce qui pèse dans la fourchette) ----------
     items : [{ nom, delta, texte, origine }] (delta en kWh, déjà calculé) */
  G.tornade = function (items) {
    const max = items.reduce(function (m, i) { return Math.max(m, i.delta); }, 0);
    return '<div class="graphe-tornade">' + items.map(function (i) {
      const l = max > 0 ? i.delta / max * 50 : 0;
      return '<div class="tornade-ligne"><span class="tornade-nom">' + esc(i.nom) +
        (i.origine ? ' <span class="mini-origine o-' + esc(i.origine) + '">' + esc(G.nomOrigine(i.origine)) + '</span>' : '') + '</span>' +
        '<span class="tornade-piste"><span class="tornade-gauche" style="width:' + l.toFixed(1) + '%"></span>' +
        '<span class="tornade-droite" style="width:' + l.toFixed(1) + '%"></span></span>' +
        '<span class="tornade-val">± ' + esc(i.texte) + '</span></div>';
    }).join('') + '</div>';
  };

  G.nomOrigine = function (o) {
    return { saisie: 'saisi', carte: 'carte', bdnb: 'BDNB', dpe: 'DPE', deduite: 'déduit' }[o] || o;
  };

  /* ---------- Cascade (bouquet, action après action) ----------
     depart, arrivee : consommations ; etapes : [{ nom, icone, avant, apres }] ; format : nombre → texte */
  G.cascade = function (depart, etapes, arrivee, format) {
    const max = depart;
    const pct = function (v) { return max > 0 ? Math.max(0, v) / max * 100 : 0; };
    const ligne = function (classe, nom, icone, debut, fin, texte) {
      return '<div class="cascade-ligne ' + classe + '"><span class="cascade-nom">' +
        (icone ? '<svg class="ico"><use href="#i-' + icone + '"/></svg>' : '') + esc(nom) + '</span>' +
        '<span class="cascade-piste"><span class="cascade-barre" style="left:' + pct(debut).toFixed(1) + '%;width:' +
        Math.max(0.6, pct(fin) - pct(debut)).toFixed(1) + '%"></span></span><span class="cascade-val">' + esc(texte) + '</span></div>';
    };
    return '<div class="graphe-cascade">' +
      ligne('depart', 'Aujourd’hui', 'immeuble', 0, depart, format(depart)) +
      etapes.map(function (e) {
        return ligne('etape', e.nom, e.icone, e.apres, e.avant, '− ' + format(e.avant - e.apres));
      }).join('') +
      ligne('arrivee', 'Après travaux', 'check', 0, arrivee, format(arrivee)) + '</div>';
  };

  /* ---------- Étiquette énergie (logement, indicative) ----------
     seuils : [70, 110, 180, 250, 330, 420] ; avant, apres : { classe, valeur } */
  G.etiquette = function (seuils, avant, apres) {
    const lettres = ['A', 'B', 'C', 'D', 'E', 'F', 'G'];
    const bornes = lettres.map(function (l, i) {
      if (i === 0) return '≤ ' + seuils[0];
      if (i === 6) return '> ' + seuils[5];
      return (seuils[i - 1] + 1) + ' à ' + seuils[i];
    });
    return '<div class="etiquette-dpe" role="img" aria-label="Étiquette énergie indicative ' + esc(avant.classe) + '">' +
      lettres.map(function (l, i) {
        const marques = [];
        if (avant && avant.classe === l) marques.push('<span class="dpe-marque avant">' + esc(avant.texte) + '</span>');
        if (apres && apres.classe === l) marques.push('<span class="dpe-marque apres">' + esc(apres.texte) + '</span>');
        return '<div class="dpe-ligne' + (marques.length ? ' active' : '') + '"><span class="dpe-barre dpe-' + l.toLowerCase() +
          '" style="width:' + (34 + i * 9) + '%"><b>' + l + '</b><small>' + bornes[i] + '</small></span>' + marques.join('') + '</div>';
      }).join('') + '</div>';
  };

  /* ---------- Temps de retour comparé à la durée de vie ----------
     ✅ jusqu'à ½ durée de vie, 🟠 jusqu'à la durée de vie, ❌ au-delà. */
  G.retour = function (tra, duree, seuil) {
    const echelle = duree * 1.5;
    const pos = tra === null ? 100 : Math.min(100, tra / echelle * 100);
    const s1 = seuil * duree / echelle * 100, s2 = duree / echelle * 100;
    return '<div class="jauge-retour" title="Temps de retour actualisé comparé à la durée de vie">' +
      '<span class="zone vert" style="width:' + s1.toFixed(1) + '%"></span>' +
      '<span class="zone orange" style="width:' + (s2 - s1).toFixed(1) + '%"></span>' +
      '<span class="zone rouge" style="width:' + (100 - s2).toFixed(1) + '%"></span>' +
      '<span class="curseur" style="left:' + pos.toFixed(1) + '%"></span>' +
      '<span class="repere" style="left:' + s2.toFixed(1) + '%">' + F.nombre(duree) + ' ans</span></div>';
  };

  /* ---------- Courbe de trésorerie actualisée ----------
     points : cumul année par année (le premier = − coût) */
  G.tresorerie = function (points) {
    if (!points || points.length < 2) return '';
    const l = 240, h = 64, marge = 4;
    const min = Math.min.apply(null, points), max = Math.max.apply(null, points.concat([0]));
    const y = function (v) { return marge + (max - v) / ((max - min) || 1) * (h - 2 * marge); };
    const x = function (i) { return i / (points.length - 1) * l; };
    const trace = points.map(function (v, i) { return (i ? 'L' : 'M') + x(i).toFixed(1) + ' ' + y(v).toFixed(1); }).join(' ');
    const aire = trace + ' L' + l + ' ' + y(0).toFixed(1) + ' L0 ' + y(0).toFixed(1) + ' Z';
    return '<svg class="tresorerie" viewBox="0 0 ' + l + ' ' + h + '" preserveAspectRatio="none" role="img" aria-label="Trésorerie actualisée">' +
      '<path d="' + aire + '" class="tres-aire"/><line x1="0" x2="' + l + '" y1="' + y(0).toFixed(1) + '" y2="' + y(0).toFixed(1) + '" class="tres-zero"/>' +
      '<path d="' + trace + '" class="tres-ligne"/></svg>';
  };

  /* ---------- Nuage « calcul ou factures » (cas de référence) ----------
     points : [{ x: factures, y: calcul, nom, famille, dedans }] ; seuil : bande ± (ex. 0,15) ;
     format : nombre → texte. Échelle logarithmique si les bâtiments sont de tailles très différentes. */
  G.nuage = function (points, seuil, format) {
    if (!points.length) return '';
    const l = 520, h = 330, m = { g: 72, d: 14, h: 12, b: 42 };
    const valeurs = points.reduce(function (t, p) { return t.concat([p.x, p.y]); }, []);
    let min = Math.min.apply(null, valeurs) * 0.8, max = Math.max.apply(null, valeurs) * 1.15;
    const log = max / min > 20;
    if (!log) min = 0;
    const t = function (v) { return log ? (Math.log10(v) - Math.log10(min)) / (Math.log10(max) - Math.log10(min)) : (v - min) / (max - min); };
    const x = function (v) { return m.g + t(v) * (l - m.g - m.d); };
    const y = function (v) { return h - m.b - t(v) * (h - m.h - m.b); };
    // Graduations : puissances de 10 (log) ou 4 pas réguliers
    let graduations = [];
    if (log) {
      for (let p = Math.ceil(Math.log10(min)); p <= Math.floor(Math.log10(max)); p++) graduations.push(Math.pow(10, p));
    } else {
      const pas = Math.pow(10, Math.floor(Math.log10(max / 4)));
      const n = Math.ceil(max / 4 / pas) * pas;
      for (let v = n; v < max; v += n) graduations.push(v);
    }
    // Bande ± seuil autour de la diagonale, fermée dans les coins du graphique
    const bas = log ? min : max * 1e-6;
    const bande = [[bas, bas * (1 + seuil)], [max / (1 + seuil), max], [max, max], [max, max * (1 - seuil)], [bas / (1 - seuil), bas], [bas, bas]]
      .map(function (c) { return x(Math.min(max, Math.max(min, c[0]))).toFixed(1) + ',' + y(Math.min(max, Math.max(min, c[1]))).toFixed(1); }).join(' ');
    return '<div class="graphe-nuage"><svg viewBox="0 0 ' + l + ' ' + h + '" role="img" aria-label="Calcul comparé aux factures">' +
      '<polygon points="' + bande + '" class="nuage-bande"/>' +
      graduations.map(function (v) {
        return '<line x1="' + x(v).toFixed(1) + '" x2="' + x(v).toFixed(1) + '" y1="' + m.h + '" y2="' + (h - m.b) + '" class="nuage-grille"/>' +
          '<line y1="' + y(v).toFixed(1) + '" y2="' + y(v).toFixed(1) + '" x1="' + m.g + '" x2="' + (l - m.d) + '" class="nuage-grille"/>' +
          '<text x="' + x(v).toFixed(1) + '" y="' + (h - m.b + 16) + '" text-anchor="middle" class="nuage-texte">' + esc(format(v)) + '</text>' +
          '<text x="' + (m.g - 6) + '" y="' + (y(v) + 4).toFixed(1) + '" text-anchor="end" class="nuage-texte">' + esc(format(v)) + '</text>';
      }).join('') +
      '<line x1="' + x(min).toFixed(1) + '" y1="' + y(min).toFixed(1) + '" x2="' + x(max).toFixed(1) + '" y2="' + y(max).toFixed(1) + '" class="nuage-diagonale"/>' +
      '<text x="' + (l - m.d) + '" y="' + (h - 6) + '" text-anchor="end" class="nuage-axe">Factures →</text>' +
      '<text x="14" y="' + (h - m.b) + '" class="nuage-axe" transform="rotate(-90 14 ' + (h - m.b) + ')" text-anchor="start">Calcul →</text>' +
      points.map(function (p) {
        return '<circle cx="' + x(p.x).toFixed(1) + '" cy="' + y(p.y).toFixed(1) + '" r="7" class="nuage-point f-' + esc(p.famille) + (p.dedans ? '' : ' dehors') + '">' +
          '<title>' + esc(p.nom) + ' : calcul ' + esc(format(p.y)) + ', factures ' + esc(format(p.x)) + '</title></circle>';
      }).join('') + '</svg>' +
      '<div class="nuage-legende"><span><i class="f-logement"></i>Logement</span><span><i class="f-tertiaire"></i>Tertiaire</span>' +
      '<span><i class="dehors"></i>Hors de la fourchette</span></div></div>';
  };

  /* ---------- Jauge de fiabilité ---------- */
  G.fiabilite = function (niveau) {
    const n = { faible: 1, moyenne: 2, bonne: 3 }[niveau] || 0;
    return '<span class="jauge-fiab f-' + esc(niveau) + '" title="Fiabilité ' + esc(niveau) + '">' +
      [1, 2, 3].map(function (i) { return '<i class="' + (i <= n ? 'plein' : '') + '"></i>'; }).join('') + '</span>';
  };

  global.GraphiquesFlash = G;
  if (typeof module !== 'undefined' && module.exports) module.exports = G;
})(typeof window !== 'undefined' ? window : globalThis);
