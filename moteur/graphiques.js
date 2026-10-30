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

  /* ---------- Jauge de fiabilité ---------- */
  G.fiabilite = function (niveau) {
    const n = { faible: 1, moyenne: 2, bonne: 3 }[niveau] || 0;
    return '<span class="jauge-fiab f-' + esc(niveau) + '" title="Fiabilité ' + esc(niveau) + '">' +
      [1, 2, 3].map(function (i) { return '<i class="' + (i <= n ? 'plein' : '') + '"></i>'; }).join('') + '</span>';
  };

  global.GraphiquesFlash = G;
  if (typeof module !== 'undefined' && module.exports) module.exports = G;
})(typeof window !== 'undefined' ? window : globalThis);
