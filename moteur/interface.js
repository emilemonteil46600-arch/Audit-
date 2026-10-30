/* ==========================================================
   AUDIT FLASH — INTERFACE (questions, résultats, fiche, données)
   AUCUN calcul ici : tout vient de moteur/calcul.js (diagnostiquer).
   Ici on lit les réponses, on garde l'état dans ton navigateur
   (clés flash.etat.v1 et flash.donnees.v1) et on affiche.
   ========================================================== */
(function () {
  'use strict';

  const H = window.HYPOTHESES_FLASH, M = window.MoteurCalcul, C = window.CarteCalcul;
  const F = window.FLASH, G = window.GraphiquesFlash, V = window.VALEURS_FLASH;
  const $ = function (s, el) { return (el || document).querySelector(s); };
  const $$ = function (s, el) { return Array.from((el || document).querySelectorAll(s)); };
  const esc = F.echapper, nb = F.nombre;

  /* ---------- L'état, gardé dans ton navigateur ----------
     saisies : tes réponses (prioritaires) ; carte : ce qui vient de la carte, de la BDNB, des DPE. */
  function etatVide() {
    return { version: 1, saisies: {}, carte: {}, factures: {}, batiment: null, complements: {}, bouquet: null };
  }
  let etat = Object.assign(etatVide(), F.lire('etat.v1', null) || {});
  let modifs = F.lire('donnees.v1', {}) || {};
  let r = null;

  function sauver() { F.ecrire('etat.v1', etat); }
  function entrees() { return Object.assign({}, etat.carte, etat.saisies); }

  function saisir(cle, valeur) {
    if (valeur === null || valeur === undefined || valeur === '' || (typeof valeur === 'number' && !isFinite(valeur))) delete etat.saisies[cle];
    else etat.saisies[cle] = { valeur: valeur, origine: 'saisie' };
    recalculer();
  }

  function recalculer() {
    try {
      r = M.diagnostiquer(entrees(), etat.factures, H, modifs);
    } catch (e) {
      r = { manque: [], erreur: e.message };
    }
    afficherResume();
    afficherBatiment();
    majQuestions();
    majFactures();
    afficherResultats();
    sauver();
  }

  /* ---------- Mise en forme (on arrondit l'affichage, jamais le calcul) ---------- */
  const sig = function (v, n) { return F.significatif(v, n || 2); };

  function uniteEnergie(v) {
    const a = Math.abs(v);
    if (a >= 1e6) return { div: 1e6, unite: 'GWh', dec: 1 };
    if (a >= 1e4) return { div: 1e3, unite: 'MWh', dec: a >= 1e5 ? 0 : 1 };
    return { div: 1, unite: 'kWh', dec: 0 };
  }
  function energie(v) {
    if (v === null || !isFinite(v)) return '–';
    const u = uniteEnergie(v);
    return nb(u.div === 1 ? sig(v, 2) : v / u.div, u.div === 1 ? 0 : u.dec) + ' ' + u.unite;
  }
  function fourchette(v, delta, format) {
    return format(Math.max(0, v - delta)) + ' – ' + format(v + delta);
  }
  function fourchetteEnergie(v, delta) {
    const u = uniteEnergie(v);
    const f = function (x) { return nb(sig(x / u.div, 2), u.dec && sig(x / u.div, 2) < 10 ? 1 : 0); };
    return f(Math.max(0, v - delta)) + ' – ' + f(v + delta) + ' ' + u.unite;
  }
  function euros(v, n) {
    if (v === null || !isFinite(v)) return '–';
    return nb(Math.abs(v) >= 100 ? sig(v, n || 3) : Math.round(v)) + ' €';
  }
  function ans(v) {
    if (v === null || v === undefined || !isFinite(v)) return 'jamais';
    if (v < 1) return '< 1 an';
    return nb(v, v < 10 ? 1 : 0) + ' an' + (v >= 2 ? 's' : '');
  }
  function plageAns(bas, haut) {
    if (bas === null || haut === null) return 'jamais';
    const b = Math.max(1, Math.round(bas)), h = Math.max(1, Math.round(haut));
    return b === h ? b + ' an' + (b > 1 ? 's' : '') : b + ' – ' + h + ' ans';
  }
  function pct(v) { return nb(v * 100) + ' %'; }
  function plageEuros(bas, haut) { return nb(sig(bas, 2)) + ' – ' + nb(sig(haut, 2)) + ' €'; }

  const NOMS_USAGES = { chauffage: 'Chauffage', ecs: 'Eau chaude', froid: 'Climatisation', eclairage: 'Éclairage', auxiliaires: 'Auxiliaires', autres: 'Autres usages' };
  const ICONES_USAGES = { chauffage: 'flamme', ecs: 'goutte', froid: 'flocon', eclairage: 'ampoule', auxiliaires: 'ventilation', autres: 'prise' };
  const NOMS_PAROIS = { murs: 'Murs', vitrages: 'Fenêtres', toiture: 'Toiture', plancher: 'Plancher bas', ponts: 'Ponts thermiques', air: 'Renouvellement d’air' };
  const ICONES_PAROIS = { murs: 'mur', vitrages: 'fenetre', toiture: 'toit', plancher: 'plancher', ponts: 'calque', air: 'ventilation' };
  const VERDICTS = {
    afaire: { texte: 'À faire', symbole: '✅' }, discuter: { texte: 'À discuter', symbole: '🟠' }, non: { texte: 'Pas rentable', symbole: '❌' }
  };
  const RANG_VERDICT = { afaire: 0, discuter: 1, non: 2 };
  const NOMS_SOURCES = { adresse: 'Adresses', fond: 'Fond IGN', bdtopo: 'BD TOPO', bdnb: 'BDNB', dpe: 'DPE ADEME', photos: 'Photos' };

  function nomEnergie(id) { return (H.ENERGIES.find(function (e) { return e.id === id; }) || {}).nom || id; }
  function nomUsageBat(id) { return (H.USAGES.find(function (u) { return u.id === id; }) || {}).nom || id; }
  function nomChoix(liste, id) { return (H.CHOIX[liste].find(function (c) { return c.id === id; }) || {}).nom || id; }
  function nomPeriode(id) { return (H.PERIODES.find(function (p) { return p.id === id; }) || {}).nom || id; }
  function ico(nom, classe) { return '<svg class="ico' + (classe ? ' ' + classe : '') + '" aria-hidden="true"><use href="#i-' + nom + '"/></svg>'; }
  function badgeOrigine(o) { return o ? '<span class="origine o-' + esc(o) + '">' + esc(G.nomOrigine(o)) + '</span>' : ''; }

  /* ---------- Résumé en haut du panneau ---------- */
  function texteManque(manque) {
    return manque.map(function (m) {
      return { surface: 'la surface (clique sur un bâtiment ou saisis-la)', departement: 'le département (adresse ou code postal)' }[m] || m;
    }).join(' et ');
  }

  function afficherResume() {
    const el = $('#resume');
    if (!r || r.erreur) { el.innerHTML = '<p class="alerte attention">Calcul impossible : ' + esc(r && r.erreur) + '</p>'; return; }
    if (r.manque.length) {
      el.innerHTML = '<div class="resume-vide">' + ico('eclair') + '<div><b>Choisis un bâtiment</b><span>Il manque ' + esc(texteManque(r.manque)) + '.</span></div></div>';
      return;
    }
    const t = r.resultat.total, et = r.resultat.etiquette;
    el.innerHTML = '<div class="resume-plein">' +
      '<div class="resume-chiffre"><small>Consommation estimée</small><b>' + energie(t.ef) + '<span> /an</span></b>' +
      '<span class="resume-fourchette">' + fourchetteEnergie(t.ef, r.delta) + ' · ≈ ' + euros(t.cout) + ' /an</span></div>' +
      (et ? '<div class="resume-etiquette dpe-' + et.classe.toLowerCase() + '" title="Étiquette indicative (pas un DPE)">' + et.classe + '</div>' : '') +
      '<div class="resume-fiab">' + G.fiabilite(r.fiabilite) + '<span>Fiabilité ' + esc(r.fiabilite) + '</span><small>± ' + pct(r.rel) +
      (r.calage.actif ? ' · calé sur factures' : '') + '</small></div></div>';
  }

  /* ---------- Onglet Bâtiment ---------- */
  function construireBatiment() {
    $('#p-batiment').innerHTML =
      '<div id="b-adresse" class="adresse-batiment"></div>' +
      '<div id="b-vignettes" class="vignettes"></div>' +
      '<details id="b-saisie" class="bloc-saisie"><summary>' + ico('plan') + 'Corriger ou saisir sans carte</summary>' +
      '<div class="champs-2">' +
      '<label class="champ">Surface de plancher (m²)<input type="text" inputmode="decimal" data-saisie="surfacePlancher" autocomplete="off"></label>' +
      '<label class="champ">Niveaux<input type="number" min="1" step="1" data-saisie="niveaux"></label>' +
      '<label class="champ">Code postal<input type="text" inputmode="numeric" maxlength="5" data-saisie="codePostal" autocomplete="off"></label>' +
      '<div class="champ"><span class="etiquette-champ">Murs mitoyens</span><div class="segments petit" data-segment="mitoyennete">' +
      [['aucune', 'Aucun'], ['un', 'Un côté'], ['deux', 'Deux côtés']].map(function (m) {
        return '<button type="button" data-valeur="' + m[0] + '" aria-pressed="false">' + m[1] + '</button>';
      }).join('') + '</div></div></div>' +
      '<p class="aide">Ce que tu saisis ici passe avant la carte. Vide un champ pour revenir à la valeur de la carte.</p></details>' +
      '<div id="b-dpe"></div><div id="b-photos"></div>';
  }

  function vignette(icone, nom, valeur, origine, detail) {
    return '<div class="vignette">' + ico(icone, 'vignette-ico') + '<div class="vignette-texte"><span class="vignette-nom">' + esc(nom) + '</span>' +
      '<b>' + valeur + '</b>' + (detail ? '<small>' + esc(detail) + '</small>' : '') + '</div>' + badgeOrigine(origine) + '</div>';
  }

  function afficherBatiment() {
    const b = etat.batiment || {}, e = entrees(), comp = etat.complements || {};
    const adresse = b.adresse && b.adresse.label;
    $('#b-adresse').innerHTML = adresse ?
      ico('maison') + '<div><b>' + esc(adresse) + '</b>' + (b.contour ? '<span>Pas le bon bâtiment ? Clique sur le bon, sur la carte.</span>' : '') + '</div>' :
      ico('loupe') + '<div><b>Aucun bâtiment choisi</b><span>Cherche une adresse au-dessus de la carte, clique sur un bâtiment, ou saisis-le sans carte.</span></div>';

    let v = '';
    if (r && r.params) {
      const p = r.params, o = r.origines, g = r.modele.geometrie;
      const ori = function (cle) { return e[cle] ? e[cle].origine : 'deduite'; };
      v += vignette('cube', 'Surface au sol', nb(sig(p.surfaceSol, 3)) + ' m²', e.surfaceSol ? ori('surfaceSol') : 'deduite');
      v += vignette('immeuble', 'Niveaux', nb(p.niveaux), o.niveaux.origine,
        b.origineNiveaux === 'bdtopo' ? 'nombre d’étages BD TOPO' : b.origineNiveaux === 'hauteur' && !etat.saisies.niveaux ? 'hauteur ÷ ' + nb(V.hauteurEtage.valeur) + ' m (H)' : o.niveaux.detail);
      v += vignette('plan', 'Surface de plancher', nb(sig(p.surfacePlancher, 3)) + ' m²', o.surface.origine, '≈ ' + nb(sig(g.surfaceChauffee, 2)) + ' m² chauffés');
      v += vignette('toit', 'Hauteur', nb(p.hauteur, 1) + ' m', e.hauteur ? ori('hauteur') : 'deduite', e.hauteur ? '' : 'niveaux × ' + nb(V.hauteurEtage.valeur) + ' m');
      v += vignette('mur', 'Murs mitoyens', pct(g.partMitoyenne), e.perimetreExpose ? ori('perimetreExpose') : (e.mitoyennete ? 'saisie' : 'deduite'),
        nb(sig(p.perimetreExpose, 3)) + ' m de façade exposée');
      v += vignette('sablier', 'Époque', esc(nomPeriode(p.periode)), o.periode.origine, e.annee ? 'construit en ' + e.annee.valeur : o.periode.detail);
      v += vignette('flocon', 'Climat', 'zone ' + esc(p.zone), o.climat.origine, 'DJU ' + nb(p.dju) + ' · T base ' + nb(p.tbase) + ' °C');
      v += vignette('bureau', 'Usage', esc(nomUsageBat(p.usage)), o.usage.origine, o.usage.detail);
    }
    const lu = b.bdtopo || {}, bd = comp.bdnb;
    if (lu.murs && lu.murs.length) v += vignette('mur', 'Matériaux des murs', esc(lu.murs.join(', ')), 'carte', 'fichiers fonciers (H)');
    if (lu.toiture && lu.toiture.length) v += vignette('toit', 'Toiture', esc(lu.toiture.join(', ')), 'carte', lu.toitureType ? 'donc ' + lu.toitureType + ' (H)' : '');
    if (lu.logements) v += vignette('maison', 'Logements', nb(lu.logements), 'carte');
    if (bd && bd.energieTexte) v += vignette('flamme', 'Énergie de chauffage', esc(bd.energieTexte), 'bdnb');
    if (bd && bd.murs) v += vignette('mur', 'Murs (BDNB)', esc(bd.murs), 'bdnb');
    $('#b-vignettes').innerHTML = v;

    // Champs « sans carte » : on ne touche pas au champ en cours de saisie.
    const p = r && r.params;
    const remplir = function (cle, valeurCarte) {
      const champ = $('[data-saisie="' + cle + '"]');
      if (!champ || champ === document.activeElement) return;
      champ.value = etat.saisies[cle] ? String(etat.saisies[cle].valeur).replace('.', ',') : '';
      champ.placeholder = valeurCarte ? String(valeurCarte) : '';
    };
    remplir('surfacePlancher', p ? nb(sig(p.surfacePlancher, 3)) + ' (carte)' : '');
    remplir('niveaux', p ? p.niveaux : '');
    remplir('codePostal', b.adresse && b.adresse.codePostal ? b.adresse.codePostal : '');
    const mit = etat.saisies.mitoyennete ? etat.saisies.mitoyennete.valeur : null;
    $$('[data-segment="mitoyennete"] button').forEach(function (bt) { bt.setAttribute('aria-pressed', String(bt.dataset.valeur === mit)); });

    afficherDpe(comp.dpe);
    afficherPhotos(comp.photos);
  }

  function afficherDpe(liste) {
    const el = $('#b-dpe');
    if (!liste || !liste.length) { el.innerHTML = ''; return; }
    el.innerHTML = '<h3 class="titre-section">' + ico('facture') + 'DPE autour du bâtiment</h3><ul class="liste-dpe">' +
      liste.slice(0, 5).map(function (d) {
        const lettre = d.etiquette && /^[A-G]$/.test(d.etiquette) ? d.etiquette : '?';
        return '<li><span class="mini-dpe dpe-' + lettre.toLowerCase() + '">' + esc(lettre) + '</span><div><b>' +
          (d.consoM2 ? nb(d.consoM2) + ' kWhEP/m²' : 'DPE ' + esc(d.jeu)) + '</b><span>' +
          [d.jeu, d.annee ? 'construit ' + d.annee : '', d.date ? 'DPE du ' + d.date : '', d.distance !== null ? 'à ' + nb(d.distance) + ' m' : '']
            .filter(Boolean).map(esc).join(' · ') + '</span>' + (d.adresse ? '<small>' + esc(d.adresse) + '</small>' : '') + '</div></li>';
      }).join('') + '</ul><p class="aide">Un DPE à moins de ' + nb(V.rayonDpe.valeur) + ' m pré-remplit l’année et l’énergie s’il manque l’info (H).</p>';
  }

  function afficherPhotos(photos) {
    const el = $('#b-photos');
    if (!photos || !photos.length) { el.innerHTML = ''; return; }
    el.innerHTML = '<h3 class="titre-section">' + ico('photo') + 'Photos de rue (Panoramax)</h3><div class="photos">' +
      photos.map(function (ph) {
        return '<a href="' + esc(ph.lien || ph.image) + '" target="_blank" rel="noopener"><img src="' + esc(ph.vignette) +
          '" alt="Photo de rue Panoramax" loading="lazy"><span>' + esc(ph.date || '') + '</span></a>';
      }).join('') + '</div><p class="aide">Photos libres de Panoramax : cite l’auteur si tu les réutilises.</p>';
  }

  /* ---------- Onglet Questions ---------- */
  const QUESTIONS = [
    { groupe: 'Le bâtiment', cle: 'usage', titre: 'Usage', icone: 'immeuble', choix: H.USAGES, origine: 'usage' },
    { groupe: 'Le bâtiment', cle: 'annee', titre: 'Année de construction', icone: 'sablier', type: 'annee', origine: 'periode' },
    { groupe: 'L’enveloppe', cle: 'murs', titre: 'Murs', icone: 'mur', choix: H.CHOIX.murs },
    { groupe: 'L’enveloppe', cle: 'toiture', titre: 'Toiture', icone: 'toit', choix: H.CHOIX.toiture },
    { groupe: 'L’enveloppe', cle: 'plancher', titre: 'Plancher bas', icone: 'plancher', choix: H.CHOIX.plancher },
    { groupe: 'L’enveloppe', cle: 'vitrage', titre: 'Fenêtres', icone: 'fenetre', choix: H.CHOIX.vitrage },
    { groupe: 'Les équipements', cle: 'chauffage', titre: 'Chauffage', icone: 'flamme', choix: H.CHOIX.chauffage },
    { groupe: 'Les équipements', cle: 'ecs', titre: 'Eau chaude', icone: 'goutte', choix: H.CHOIX.ecs },
    { groupe: 'Les équipements', cle: 'ventilation', titre: 'Ventilation', icone: 'ventilation', choix: H.CHOIX.ventilation },
    { groupe: 'Les équipements', cle: 'regulation', titre: 'Régulation', icone: 'thermostat', choix: H.CHOIX.regulation },
    { groupe: 'Les équipements', cle: 'climatisation', titre: 'Climatisation', icone: 'flocon', choix: H.CHOIX.climatisation },
    { groupe: 'L’occupation', cle: 'occupants', titre: 'Occupants (logement)', icone: 'maison', type: 'nombre', origine: 'occupants' }
  ];

  const ICONES_CHOIX = {
    chauffage: { 'gaz-ancienne': 'flamme', 'gaz-condensation': 'flamme', fioul: 'flamme', propane: 'flamme', electrique: 'prise',
      'pac-air-eau': 'pac', 'pac-air-air': 'pac', bois: 'feuille', granules: 'feuille', reseau: 'calque' },
    ecs: { 'avec-chauffage': 'flamme', 'ballon-electrique': 'prise', thermodynamique: 'pac', 'gaz-instantane': 'goutte' }
  };

  function construireQuestions() {
    let html = '<p class="aide intro-questions">Réponds à ce que tu sais. Le reste est <b>déduit</b> de l’année et de l’usage, et la fourchette s’élargit.</p>';
    let groupe = '';
    QUESTIONS.forEach(function (q) {
      if (q.groupe !== groupe) { groupe = q.groupe; html += '<h3 class="groupe-questions">' + esc(groupe) + '</h3>'; }
      html += '<div class="question" data-question="' + q.cle + '"><div class="q-tete">' + ico(q.icone, 'q-ico') + '<b>' + esc(q.titre) + '</b>' +
        '<button type="button" class="nsp" data-cle="' + q.cle + '" data-nsp="1">Je ne sais pas</button></div>' +
        '<div class="q-origine" data-origine="' + q.cle + '"></div>';
      if (q.type === 'annee') {
        html += '<input type="number" class="champ-annee" min="1600" max="2100" step="1" data-saisie="annee" aria-label="Année de construction">';
      } else if (q.type === 'nombre') {
        html += '<input type="number" class="champ-annee" min="0" step="1" data-saisie="occupants" aria-label="Nombre d’occupants">';
      } else {
        html += '<div class="tuiles">' + q.choix.map(function (c) {
          const icone = c.icone || (ICONES_CHOIX[q.cle] && ICONES_CHOIX[q.cle][c.id]) || q.icone;
          return '<button type="button" class="tuile" data-cle="' + q.cle + '" data-valeur="' + esc(c.id) + '" aria-pressed="false">' +
            ico(icone) + '<span class="t-nom">' + esc(c.nom) + '</span>' + (c.aide ? '<span class="t-aide">' + esc(c.aide) + '</span>' : '') +
            '<span class="t-suppose">supposé</span></button>';
        }).join('') + '</div>';
      }
      html += '</div>';
    });
    $('#p-questions').innerHTML = html;
  }

  // Ce que vaut le paramètre dans le calcul (pour comprendre la réponse).
  function valeurParam(cle) {
    const p = r.params, m = r.modele;
    switch (cle) {
      case 'murs': return 'U ≈ ' + nb(p.uMur, 2) + ' W/(m²·K)';
      case 'toiture': return 'U ≈ ' + nb(p.uToit, 2) + ' W/(m²·K)';
      case 'plancher': return 'U ≈ ' + nb(p.uPlancher, 2) + ' W/(m²·K) (paroi)';
      case 'vitrage': return 'Uw ≈ ' + nb(p.uw, 1) + ' W/(m²·K)';
      case 'chauffage': return (p.rendementChauffage > 1.2 ? 'COP ' : 'rendement ') + nb(p.rendementChauffage, 2);
      case 'ventilation': return 'n ≈ ' + nb(m.deperditions.nAir, 2) + ' vol/h, infiltrations comprises';
      case 'regulation': return 'effet ' + (p.facteurRegulation >= 1 ? '+ ' : '− ') + nb(Math.abs(p.facteurRegulation - 1) * 100) + ' % sur le chauffage';
      case 'occupants': return p.occupants ? nb(p.occupants, 1) + ' personne(s)' : 'ratio par m² (tertiaire)';
      case 'annee': return nomPeriode(p.periode);
      default: return '';
    }
  }

  function majQuestions() {
    const pret = r && r.params;
    let repondues = 0;
    QUESTIONS.forEach(function (q) {
      const bloc = $('[data-question="' + q.cle + '"]');
      const o = pret ? r.origines[q.origine || q.cle] : null;
      const saisie = etat.saisies[q.cle];
      if (saisie) repondues++;
      bloc.classList.toggle('repondue', !!saisie);
      bloc.hidden = q.cle === 'occupants' && pret && r.params.famille !== 'logement';
      $$('.tuile', bloc).forEach(function (t) {
        const choisi = !!saisie && String(saisie.valeur) === t.dataset.valeur;
        const suppose = !saisie && o && o.choix === t.dataset.valeur;
        t.setAttribute('aria-pressed', String(choisi));
        t.classList.toggle('supposee', !!suppose);
      });
      const champ = $('input[data-saisie]', bloc);
      if (champ && champ !== document.activeElement) {
        champ.value = saisie ? saisie.valeur : '';
        const carte = etat.carte[q.cle];
        champ.placeholder = carte ? carte.valeur + ' (' + G.nomOrigine(carte.origine) + ')' : (q.cle === 'annee' ? 'ex. 1972' : pret && r.params.occupants ? nb(r.params.occupants, 1) + ' (déduit)' : '');
      }
      const ligne = $('[data-origine="' + q.cle + '"]');
      ligne.innerHTML = o ? badgeOrigine(o.origine) + ' ' + esc(o.detail || (o.origine === 'saisie' ? 'ta réponse' : '')) +
        (pret && valeurParam(q.cle) ? ' <span class="q-valeur">' + esc(valeurParam(q.cle)) + '</span>' : '') : '';
    });
    $('#compte-questions').textContent = repondues + '/' + QUESTIONS.length;
  }

  /* ---------- Onglet Factures ---------- */
  const AIDES_FACTURES = {
    gaz: 'kWh de ta facture (PCS)', fioul: '1 litre ≈ 10 kWh', propane: '1 kg ≈ 12,8 kWh (H)', 'bois-granules': '1 tonne ≈ 4 600 kWh (H)',
    'bois-buches': '1 stère ≈ 1 500 à 2 000 kWh (H)', electricite: 'kWh de ta facture (tous usages)', 'reseau-chaleur': 'kWh livrés'
  };

  function construireFactures() {
    $('#p-factures').innerHTML =
      '<p class="aide intro-questions">Avec les factures, le modèle est <b>calé</b> : k = facture / calcul, énergie par énergie. Les gains sont ensuite calculés sur le modèle calé. Mets la moyenne de 2 ou 3 ans.</p>' +
      H.ENERGIES.map(function (en) {
        return '<div class="facture" data-energie="' + en.id + '"><label class="champ"><span class="etiquette-champ">' + esc(en.nom) + ' <small>(kWh/an)</small></span>' +
          '<input type="text" inputmode="decimal" data-facture="' + en.id + '" autocomplete="off"></label>' +
          '<div class="facture-info"><small>' + esc(AIDES_FACTURES[en.id] || '') + '</small><span data-calcul="' + en.id + '"></span></div></div>';
      }).join('') +
      '<button type="button" class="bouton discret" data-action="toutes-energies">Afficher toutes les énergies</button>' +
      '<div id="f-bilan"></div>';
  }

  let toutesEnergies = false;
  function majFactures() {
    const modele = r && r.modele;
    H.ENERGIES.forEach(function (en) {
      const bloc = $('[data-energie="' + en.id + '"]');
      const utilisee = modele && modele.parEnergie[en.id];
      const valeur = etat.factures[en.id];
      bloc.hidden = !(toutesEnergies || utilisee || valeur);
      const champ = $('input', bloc);
      if (champ !== document.activeElement) champ.value = valeur ? nb(valeur) : '';
      const k = r && r.calage && r.calage.coefs[en.id];
      $('[data-calcul="' + en.id + '"]', bloc).innerHTML = (utilisee ? 'calcul : ' + energie(utilisee.facture) : 'pas utilisée par le calcul') +
        (k ? ' · <b class="k ' + (k < 0.7 || k > 1.3 ? 'k-ecart' : 'k-ok') + '">k = ' + nb(k, 2) + '</b>' : '');
    });
    const bilan = $('#f-bilan');
    if (!r || !r.calage) { bilan.innerHTML = ''; return; }
    const ecarts = Object.keys(r.calage.coefs).filter(function (e) { const k = r.calage.coefs[e]; return k < 0.7 || k > 1.3; });
    bilan.innerHTML = (r.calage.actif ? '<p class="alerte ok">' + ico('check') + ' Modèle calé sur tes factures : la fourchette passe à ± ' + pct(r.rel) + '.</p>' : '') +
      ecarts.map(function (e) {
        const k = r.calage.coefs[e];
        return '<p class="alerte attention">' + esc(nomEnergie(e)) + ' : k = ' + nb(k, 2) + '. ' + (k < 1 ?
          'Le bâtiment consomme moins que prévu : occupation partielle, consigne basse, isolation meilleure que supposée, ou surface surestimée ?' :
          'Le bâtiment consomme plus que prévu : consigne élevée, horaires étendus, équipements énergivores, ou surface sous-estimée ?') + '</p>';
      }).join('') +
      r.calage.sansModele.map(function (e) {
        return '<p class="alerte attention">Facture de ' + esc(nomEnergie(e)) + ', mais le calcul n’utilise pas cette énergie : vérifie le chauffage et l’eau chaude.</p>';
      }).join('');
  }

  /* ---------- Résultats ---------- */
  function accueil() {
    return '<section class="accueil bloc">' +
      '<div class="accueil-texte"><span class="surtitre">' + ico('eclair') + 'Pré-diagnostic en 5 minutes</span>' +
      '<h2>Combien consomme ce bâtiment, et qu’est-ce qui vaut le coup ?</h2>' +
      '<ol class="etapes-accueil">' +
      '<li><b>Choisis le bâtiment</b><span>Adresse ou clic sur la carte : contour, hauteur et surface arrivent tout seuls.</span></li>' +
      '<li><b>Réponds à ce que tu sais</b><span>Murs, fenêtres, chauffage… Le reste est déduit de l’époque.</span></li>' +
      '<li><b>Lis le résultat</b><span>Consommation en fourchette, travaux ✅ / 🟠 / ❌, temps de retour, fiche Word.</span></li></ol>' +
      '<div class="barre-boutons"><button type="button" class="bouton principal" data-action="exemple">' + ico('maison') + 'Voir l’exemple</button>' +
      '<button type="button" class="bouton" data-action="sans-carte">' + ico('plan') + 'Saisir sans carte</button></div></div>' +
      '<div class="accueil-illus" aria-hidden="true">' + illustration() + '</div></section>';
  }

  function illustration() {
    return '<svg viewBox="0 0 220 170"><defs><linearGradient id="ill-a" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--accent)"/><stop offset="1" stop-color="var(--accent-fonce)"/></linearGradient></defs>' +
      '<rect x="0" y="150" width="220" height="2" rx="1" fill="var(--bord-fort)"/>' +
      '<path d="M30 150V78l40-30 40 30v72z" fill="var(--surface-2)" stroke="var(--bord-fort)" stroke-width="2"/>' +
      '<path d="M110 150V96l16-12 16 12v54z" fill="var(--surface-2)" stroke="var(--bord-fort)" stroke-width="2"/>' +
      '<path d="M52 150v-36h36v36" fill="none" stroke="var(--bord-fort)" stroke-width="2"/>' +
      '<path d="M70 66 62 84h8l-3 14 12-20h-8l4-12z" fill="url(#ill-a)"/>' +
      '<g><rect x="160" y="110" width="12" height="40" rx="3" fill="var(--dpe-d)"/><rect x="176" y="92" width="12" height="58" rx="3" fill="var(--dpe-f)"/>' +
      '<rect x="192" y="124" width="12" height="26" rx="3" fill="var(--dpe-b)"/></g></svg>';
  }

  function tuileKpi(icone, titre, valeur, sous, note, classe) {
    return '<div class="kpi ' + (classe || '') + '">' + '<span class="kpi-ico">' + ico(icone) + '</span>' +
      '<div><span class="kpi-titre">' + esc(titre) + '</span><b class="kpi-valeur">' + valeur + '</b>' +
      (sous ? '<span class="kpi-sous">' + sous + '</span>' : '') + (note ? '<small>' + note + '</small>' : '') + '</div></div>';
  }

  function kpis() {
    const t = r.resultat.total, ra = r.resultat.ratios, g = r.modele.geometrie, et = r.resultat.etiquette, h = r.modele.deperditions;
    return '<div class="kpis">' +
      tuileKpi('eclair', 'Consommation', energie(t.ef) + '<span> /an</span>', fourchetteEnergie(t.ef, r.delta), nb(sig(ra.ef, 2)) + ' kWh/m² chauffé · énergie finale', 'kpi-principal') +
      tuileKpi('euro', 'Facture d’énergie', euros(t.cout) + '<span> /an</span>', fourchette(t.cout, r.deltaCout, function (x) { return euros(x, 2); }), 'prix d’exemple, hors abonnement') +
      (et ? tuileKpi('feuille', 'Étiquette indicative', '<span class="kpi-lettre dpe-' + et.classe.toLowerCase() + '">' + et.classe + '</span>',
        nb(sig(ra.ep5, 2)) + ' kWhEP/m² · ' + nb(sig(ra.co25, 2)) + ' kgCO₂/m²', 'énergie ' + et.energie + ' · climat ' + et.climat + ' — pas un DPE') :
        tuileKpi('feuille', 'Énergie primaire', nb(sig(ra.ep5, 2)) + '<span> kWhEP/m²</span>', '5 usages réglementaires', nb(sig(ra.co25, 2)) + ' kgCO₂/m²')) +
      tuileKpi('feuille', 'Émissions', nb(t.co2 / 1000, t.co2 < 1e4 ? 1 : 0) + '<span> t CO₂/an</span>', nb(sig(ra.co25, 2)) + ' kg/m² (5 usages)', '') +
      tuileKpi('flamme', 'Puissance de chauffage', nb(r.modele.puissance, 1) + '<span> kW</span>', 'à ' + nb(r.params.tbase) + ' °C dehors', 'déperditions × (19 − T base)') +
      tuileKpi('calque', 'Déperditions', nb(sig(h.total, 3)) + '<span> W/K</span>', nb(r.modele.hParM2, 2) + ' W/K par m² chauffé', '') +
      '</div>';
  }

  function graphes() {
    const usages = r.resultat.usages.map(function (u) {
      return { id: u.id, nom: NOMS_USAGES[u.id], valeur: u.ef, texte: energie(u.ef) + ' · ' + euros(u.cout, 2) };
    });
    const h = r.modele.deperditions;
    const parois = ['murs', 'vitrages', 'toiture', 'plancher', 'ponts', 'air'].map(function (k) {
      return { id: k, nom: NOMS_PAROIS[k], icone: ICONES_PAROIS[k], valeur: h[k], texte: nb(sig(h[k], 2)) + ' W/K · ' + pct(h[k] / h.total) };
    }).sort(function (a, b) { return b.valeur - a.valeur; });
    const et = r.resultat.etiquette;
    const seuils = ['A', 'B', 'C', 'D', 'E', 'F'].map(function (l) { return M.creerDonnees(H, modifs).v('dpe.ep.' + l); });
    const troisieme = et ?
      '<h3>Étiquette énergie indicative</h3><p class="aide">Énergie primaire, 5 usages, par m² chauffé. Ce n’est pas un DPE.</p>' +
      G.etiquette(seuils, { classe: et.energie, texte: nb(sig(r.resultat.ratios.ep5, 2)) }, null) +
      '<p class="aide">Climat : classe ' + et.climat + ' (' + nb(sig(r.resultat.ratios.co25, 2)) + ' kgCO₂/m²). Classe finale, la moins bonne des deux : <b>' + et.classe + '</b>.</p>' :
      '<h3>Par énergie</h3><p class="aide">Consommation et coût par énergie.</p>' +
      G.barres(Object.keys(r.resultat.parEnergie).map(function (e) {
        const x = r.resultat.parEnergie[e];
        return { id: e === 'electricite' ? 'eclairage' : 'chauffage', nom: nomEnergie(e), valeur: x.ef, texte: energie(x.ef) + ' · ' + euros(x.cout, 2) };
      }));
    const contributions = r.incertitude.contributions.slice(0, 6).map(function (c) {
      return { nom: c.nom, delta: c.delta, texte: energie(c.delta), origine: c.origine };
    });
    return '<div class="grille-graphes">' +
      '<section class="bloc graphe"><h3>Où va l’énergie</h3><p class="aide">Énergie finale par usage, avec son coût.</p>' +
      G.anneau(usages, { valeur: energie(r.resultat.total.ef).split(' ')[0], unite: energie(r.resultat.total.ef).split(' ')[1] + ' /an', sous: euros(r.resultat.total.cout) }) + '</section>' +
      '<section class="bloc graphe"><h3>Où part la chaleur</h3><p class="aide">Déperditions en W/K : par où le bâtiment perd sa chaleur.</p>' + G.barres(parois) + '</section>' +
      '<section class="bloc graphe">' + troisieme + '</section>' +
      '<section class="bloc graphe"><h3>' + (r.calage.actif ? 'Avant calage : ce qui pesait' : 'Ce qui pèse dans la fourchette') + '</h3>' +
      '<p class="aide">Écart de consommation (±) dû à chaque paramètre incertain. Vérifie d’abord le haut de la liste.</p>' +
      G.tornade(contributions) + '</section></div>';
  }

  function detailCalcul(a) {
    const q = a.cout.quantite;
    const cle = typeof a.def.cout === 'function' ? a.def.cout(r.params) : a.def.cout;
    const d = M.creerDonnees(H, modifs);
    return 'Quantité : ' + nb(sig(q.valeur, 3)) + ' ' + q.unite + '\n' +
      'Coût : ' + nb(sig(q.valeur, 3)) + ' × ' + nb(d.v(cle + '.bas')) + ' à ' + nb(d.v(cle + '.haut')) + ' € HT × (1 + ' + pct(d.v('eco.frais')) + ' frais) × (1 + ' +
      nb(a.cout.tva * 100, 1) + ' % TVA) = ' + euros(a.cout.bas) + ' à ' + euros(a.cout.haut) + ' TTC\n' +
      'Économie : ' + energie(a.gainEf) + '/an d’énergie finale → ' + euros(a.economie) + '/an (année 1)\n' +
      'Retour brut = ' + euros(a.cout.moyen) + ' / ' + euros(a.economie) + ' = ' + ans(a.trb) + '\n' +
      'Retour actualisé (prix de l’énergie + ' + pct(d.v('eco.inflation')) + '/an, actualisation ' + pct(d.v('eco.actualisation')) + ') = ' + ans(a.tra) + '\n' +
      'VAN sur ' + a.duree + ' ans = ' + euros(a.van);
  }

  function carteAction(a, variante) {
    const v = VERDICTS[a.verdict];
    const seuil = M.creerDonnees(H, modifs).v('eco.seuil.afaire');
    return '<article class="action v-' + a.verdict + (variante ? ' variante' : '') + '">' +
      '<div class="action-tete"><span class="action-icone">' + ico(a.def.icone) + '</span><div class="action-titre">' +
      '<span class="verdict-badge">' + v.symbole + ' ' + v.texte + '</span><h3>' + esc(a.def.nom) + '</h3>' +
      '<span class="action-sous">' + nb(sig(a.cout.quantite.valeur, 3)) + ' ' + esc(a.cout.quantite.unite) + ' · durée de vie ' + a.duree + ' ans</span></div></div>' +
      '<div class="action-gain"><div><b>− ' + nb(a.gainPart * 100, Math.abs(a.gainPart) < 0.1 ? 1 : 0) + ' %</b><small>d’énergie</small></div>' +
      (a.economie >= 0 ? '<div><b>' + euros(a.economie, 2) + '</b><small>par an</small></div>' :
        '<div class="negatif"><b>+ ' + euros(-a.economie, 2) + '</b><small>de plus par an</small></div>') +
      '<div><b>' + nb(a.gainCo2 / 1000, 1) + ' t</b><small>CO₂ évité /an</small></div></div>' +
      '<dl class="action-chiffres"><div><dt>Coût TTC</dt><dd>' + plageEuros(a.cout.bas, a.cout.haut) + '</dd></div>' +
      '<div><dt>Retour brut</dt><dd>' + plageAns(a.trbBas, a.trbHaut) + '</dd></div>' +
      '<div><dt>Retour actualisé</dt><dd>' + ans(a.tra) + '</dd></div></dl>' +
      G.retour(a.tra, a.duree, seuil) +
      '<p class="action-note">' + esc(a.def.note || '') + '</p>' +
      (variante ? '<p class="mini">Variante : le bouquet retient l’autre solution de cette famille (meilleure VAN).</p>' : '') +
      '<details class="action-detail"><summary>Détail du calcul</summary><div class="formule">' + esc(detailCalcul(a)) + '</div>' +
      '<div class="tres-legende">Trésorerie actualisée sur la durée de vie</div>' + G.tresorerie(a.tresorerie) + '</details></article>';
  }

  function preconisations() {
    const possibles = r.actions.filter(function (a) { return a.etat.etat === 'ok'; });
    const retenues = possibles.filter(function (a) { return r.choix[a.def.famille] === a; }).sort(function (x, y) {
      return RANG_VERDICT[x.verdict] - RANG_VERDICT[y.verdict] || y.economie - x.economie;
    });
    const variantes = possibles.filter(function (a) { return r.choix[a.def.famille] !== a; });
    const deja = r.actions.filter(function (a) { return a.etat.etat === 'deja'; });
    const sansObjet = r.actions.filter(function (a) { return a.etat.etat === 'sansObjet'; });
    const compte = function (v) { return retenues.filter(function (a) { return a.verdict === v; }).length; };
    return '<section class="bloc section-actions"><div class="section-tete"><h2>' + ico('check') + 'Ce qui vaut le coup</h2>' +
      '<div class="compteurs"><span class="c-afaire">✅ ' + compte('afaire') + ' à faire</span><span class="c-discuter">🟠 ' + compte('discuter') +
      ' à discuter</span><span class="c-non">❌ ' + compte('non') + ' pas rentable</span></div></div>' +
      '<p class="aide">Chaque action seule, sur le bâtiment actuel' + (r.calage.actif ? ' calé sur tes factures' : '') +
      '. Coûts TTC hors aides, prix de l’énergie d’exemple. La jauge compare le temps de retour actualisé à la durée de vie.</p>' +
      '<div class="actions">' + retenues.map(function (a) { return carteAction(a, false); }).join('') + '</div>' +
      (variantes.length ? '<details class="plus"><summary>Variantes étudiées (' + variantes.length + ')</summary><div class="actions">' +
        variantes.map(function (a) { return carteAction(a, true); }).join('') + '</div></details>' : '') +
      (deja.length ? '<div class="deja"><h3>' + ico('check') + 'Déjà fait : inutile</h3><ul>' + deja.map(function (a) {
        return '<li>' + ico(a.def.icone) + '<b>' + esc(a.def.nom) + '</b><span>' + esc(a.etat.raison) + '</span></li>';
      }).join('') + '</ul></div>' : '') +
      (sansObjet.length ? '<details class="plus"><summary>Non concerné (' + sansObjet.length + ')</summary><ul class="liste-sans-objet">' +
        sansObjet.map(function (a) { return '<li><b>' + esc(a.def.nom) + '</b> : ' + esc(a.etat.raison) + '</li>'; }).join('') + '</ul></details>' : '') +
      '</section>';
  }

  function bouquets() {
    if (!r.bouquets.length) return '';
    const choisi = r.bouquets.find(function (b) { return b.id === etat.bouquet; }) ||
      r.bouquets.find(function (b) { return b.id === 'conseille'; }) || r.bouquets[0];
    const logement = r.params.famille === 'logement';
    const d = M.creerDonnees(H, modifs);
    const seuils = ['A', 'B', 'C', 'D', 'E', 'F'].map(function (l) { return d.v('dpe.ep.' + l); });
    const cartes = r.bouquets.map(function (b) {
      return '<button type="button" class="bouquet' + (b === choisi ? ' actif' : '') + '" data-bouquet="' + b.id + '" aria-pressed="' + (b === choisi) + '">' +
        '<span class="bouquet-nom">' + esc(b.nom) + '</span>' +
        '<span class="bouquet-icones">' + b.etapes.map(function (e) { return ico(e.icone); }).join('') + '</span>' +
        '<span class="bouquet-gain">− ' + nb(b.gainPart * 100) + ' %</span>' +
        '<span class="bouquet-ligne">' + euros(b.economie, 2) + ' /an · ' + plageEuros(b.cout.bas, b.cout.haut) + ' TTC</span>' +
        '<span class="bouquet-ligne">Retour ' + ans(b.trb) + ' brut · ' + ans(b.tra) + ' actualisé</span>' +
        (logement ? '<span class="bouquet-etiquettes"><i class="mini-dpe dpe-' + b.avant.etiquette.classe.toLowerCase() + '">' + b.avant.etiquette.classe + '</i>' +
          ico('fleche') + '<i class="mini-dpe dpe-' + b.apres.etiquette.classe.toLowerCase() + '">' + b.apres.etiquette.classe + '</i></span>' : '') +
        '</button>';
    }).join('');
    const etapes = choisi.etapes.map(function (e) { return { nom: e.nom, icone: e.icone, avant: e.efAvant, apres: e.efApres }; });
    const pacBouquet = choisi.etapes.find(function (e) { return e.id === 'pac-air-eau' || e.id === 'pac-air-air'; });
    const pacSeule = pacBouquet && r.actions.find(function (a) { return a.id === pacBouquet.id; });
    const detail = '<div class="bouquet-detail"><div class="bloc-cascade"><h3>' + esc(choisi.nom) + ' : action après action</h3>' +
      G.cascade(choisi.avant.total.ef, etapes, choisi.apres.total.ef, energie) +
      '<p class="aide">Chaque action part du bâtiment déjà amélioré par les précédentes : c’est pour ça que les gains ne s’additionnent pas.' +
      (pacBouquet && pacSeule ? ' La pompe à chaleur est dimensionnée après l’isolation : ' +
        nb(pacBouquet.cout.quantite.valeur, 1) + ' kW au lieu de ' + nb(pacSeule.cout.quantite.valeur, 1) + ' kW.' : '') +
      '</p></div>' +
      (logement ? '<div class="bloc-etiquette"><h3>Étiquette énergie indicative</h3>' + G.etiquette(seuils,
        { classe: choisi.avant.etiquette.energie, texte: 'avant ' + nb(sig(choisi.avant.ratios.ep5, 2)) },
        { classe: choisi.apres.etiquette.energie, texte: 'après ' + nb(sig(choisi.apres.ratios.ep5, 2)) }) +
        '<p class="aide">Classe finale (la moins bonne entre énergie et climat) : <b>' + choisi.avant.etiquette.classe + ' → ' + choisi.apres.etiquette.classe +
        '</b>. Ce n’est pas un DPE.</p></div>' :
        '<div class="bloc-etiquette"><h3>Après travaux</h3><div class="avant-apres"><div><small>Avant</small><b>' + nb(sig(choisi.avant.ratios.ef, 2)) +
        '</b><span>kWh/m²</span></div>' + ico('fleche') + '<div><small>Après</small><b>' + nb(sig(choisi.apres.ratios.ef, 2)) + '</b><span>kWh/m²</span></div></div>' +
        '<p class="aide">Décret tertiaire : objectif − 40 % en 2030 par rapport à une année de référence (à vérifier sur OPERAT).</p></div>') +
      '</div>';
    return '<section class="bloc section-bouquets"><div class="section-tete"><h2>' + ico('calque') + 'Bouquets de travaux</h2></div>' +
      '<p class="aide">Calculés dans l’ordre : l’enveloppe d’abord, puis la ventilation et les systèmes. Coûts TTC hors aides.</p>' +
      '<div class="bouquets">' + cartes + '</div>' + detail + '</section>';
  }

  function visite() {
    const items = r.incertitude.contributions.filter(function (c) { return c.origine !== 'saisie'; }).slice(0, 5);
    return '<section class="bloc section-visite"><div class="section-tete"><h2>' + ico('loupe') + 'Pour préparer la visite</h2></div>' +
      '<ol class="visite">' + items.map(function (c) {
        return '<li><div><b>' + esc(c.nom) + '</b> ' + badgeOrigine(c.origine) + '<span class="visite-texte">' + esc(c.visite) + '</span></div><em>± ' + energie(c.delta) + '</em></li>';
      }).join('') + '</ol>' +
      '<p class="aide">À demander dans tous les cas : factures des 3 dernières années, travaux déjà faits (avec dates), horaires d’occupation, plans.</p></section>';
  }

  function avertissements() {
    const n = r.exemples.length;
    return '<section class="bloc section-fin">' +
      '<p class="alerte attention">' + ico('alerte') + ' <b>' + n + ' valeurs d’exemple</b> sont utilisées (prix, ratios, valeurs par défaut) : vérifie-les dans ' +
      '<button type="button" class="lien" data-vue-lien="donnees">l’onglet Données</button>. Pré-diagnostic : ordre de grandeur, pas un audit réglementaire.</p>' +
      '<div class="barre-boutons"><button type="button" class="bouton principal" data-action="telecharger-fiche">' + ico('telecharger') + 'Télécharger la fiche Word</button>' +
      '<button type="button" class="bouton" data-action="copier-fiche">' + ico('copie') + 'Copier la fiche pour Word</button></div></section>';
  }

  function afficherResultats() {
    const el = $('#resultats');
    if (!r || r.erreur) { el.innerHTML = '<p class="alerte attention">Calcul impossible : ' + esc(r && r.erreur) + '</p>'; return; }
    if (r.manque.length) { el.innerHTML = accueil(); return; }
    el.innerHTML = '<div class="res-tete"><h2>Résultat</h2><span class="badge ' + (r.calage.actif ? 'valide' : 'info') + '">' +
      (r.calage.actif ? 'Calé sur tes factures' : 'Sans factures : estimation') + '</span>' +
      '<span class="res-fiab">' + G.fiabilite(r.fiabilite) + ' Fiabilité ' + esc(r.fiabilite) + ' (± ' + pct(r.rel) + ')</span></div>' +
      kpis() + graphes() + preconisations() + bouquets() + visite() + avertissements();
  }

  /* ---------- Fiche d'une page pour Word ---------- */
  function ficheHtml() {
    const p = r.params, t = r.resultat.total, et = r.resultat.etiquette, o = r.origines;
    const b = etat.batiment || {};
    const date = new Date().toLocaleDateString('fr-FR');
    const ligne = function (cellules, entete) {
      return '<tr>' + cellules.map(function (c, i) {
        const tag = entete ? 'th' : 'td';
        return '<' + tag + (i > 0 && !entete ? ' class="num"' : '') + '>' + esc(c) + '</' + tag + '>';
      }).join('') + '</tr>';
    };
    const ori = function (cle) { return o[cle] ? ' (' + G.nomOrigine(o[cle].origine) + ')' : ''; };
    const choisi = r.bouquets.find(function (x) { return x.id === etat.bouquet; }) || r.bouquets.find(function (x) { return x.id === 'conseille'; }) || r.bouquets[0];
    const retenues = r.actions.filter(function (a) { return a.etat.etat === 'ok' && r.choix[a.def.famille] === a; })
      .sort(function (x, y) { return RANG_VERDICT[x.verdict] - RANG_VERDICT[y.verdict] || y.economie - x.economie; });
    const deja = r.actions.filter(function (a) { return a.etat.etat === 'deja'; });
    return '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8">' +
      '<title>Pré-diagnostic Audit flash</title><style>@page{size:21cm 29.7cm;margin:1.4cm}body{font-family:Calibri,Arial,sans-serif;font-size:9.5pt;color:#1e232d}' +
      'h1{font-size:15pt;color:#b8401a;margin:0 0 2pt}h2{font-size:11pt;color:#b8401a;margin:9pt 0 3pt;border-bottom:1px solid #e3c2b0}' +
      'table{border-collapse:collapse;width:100%}td,th{border:1px solid #c9c4ba;padding:2pt 5pt;vertical-align:top}th{background:#f6e6dc;text-align:left}' +
      '.num{text-align:right}.avert{color:#8a5300;font-size:8.5pt}.petit{font-size:8pt;color:#596071}</style></head><body>' +
      '<h1>Pré-diagnostic énergétique</h1><p><b>' + esc(b.adresse && b.adresse.label ? b.adresse.label : 'Bâtiment') + '</b> · ' + date + ' · Audit flash</p>' +
      '<p class="avert">Pré-diagnostic : ordre de grandeur, pas un audit réglementaire. Fiabilité ' + esc(r.fiabilite) + ' (± ' + pct(r.rel) + ')' +
      (r.calage.actif ? ', modèle calé sur les factures.' : ', sans factures.') + '</p>' +
      '<h2>Le bâtiment</h2><table>' +
      ligne(['Usage', nomUsageBat(p.usage) + ori('usage')]) +
      ligne(['Époque', nomPeriode(p.periode) + ori('periode')]) +
      ligne(['Surface', nb(sig(p.surfacePlancher, 3)) + ' m² de plancher, ≈ ' + nb(sig(r.modele.geometrie.surfaceChauffee, 2)) + ' m² chauffés, ' + p.niveaux + ' niveau(x)' + ori('surface')]) +
      ligne(['Climat', 'zone ' + p.zone + ', DJU ' + nb(p.dju)]) +
      ligne(['Murs / toiture', 'U ≈ ' + nb(p.uMur, 2) + ori('murs') + ' / U ≈ ' + nb(p.uToit, 2) + ori('toiture')]) +
      ligne(['Fenêtres / plancher', nomChoix('vitrage', p.vitrage) + ori('vitrage') + ' / ' + nomChoix('plancher', p.plancherType) + ori('plancher')]) +
      ligne(['Chauffage / eau chaude', nomChoix('chauffage', p.chauffage) + ori('chauffage') + ' / ' + nomChoix('ecs', p.ecs) + ori('ecs')]) +
      ligne(['Ventilation', nomChoix('ventilation', p.ventilation) + ori('ventilation')]) + '</table>' +
      '<h2>Consommation estimée</h2><table>' + ligne(['Usage', 'Énergie', 'kWh/an', '€/an'], true) +
      r.resultat.usages.filter(function (u) { return u.ef > 0; }).map(function (u) {
        return ligne([NOMS_USAGES[u.id], nomEnergie(u.energie), nb(sig(u.ef, 2)), nb(sig(u.cout, 2))]);
      }).join('') +
      ligne(['Total (fourchette ' + fourchetteEnergie(t.ef, r.delta) + ')', '', nb(sig(t.ef, 2)), nb(sig(t.cout, 2))]) + '</table>' +
      '<p>' + (et ? 'Étiquette indicative : <b>' + et.classe + '</b> (' + nb(sig(r.resultat.ratios.ep5, 2)) + ' kWhEP/m², ' + nb(sig(r.resultat.ratios.co25, 2)) + ' kgCO₂/m²). ' : '') +
      'Puissance de chauffage ≈ ' + nb(r.modele.puissance, 1) + ' kW. CO₂ ≈ ' + nb(t.co2 / 1000, 1) + ' t/an.</p>' +
      '<h2>Préconisations</h2><table>' + ligne(['Action', 'Verdict', 'Gain', '€/an', 'Coût TTC', 'Retour brut', 'Retour actualisé', 'Durée de vie'], true) +
      retenues.map(function (a) {
        return ligne([a.def.nom, VERDICTS[a.verdict].texte, '− ' + nb(a.gainPart * 100) + ' %', nb(sig(a.economie, 2)),
          nb(sig(a.cout.bas, 2)) + ' – ' + nb(sig(a.cout.haut, 2)), plageAns(a.trbBas, a.trbHaut), ans(a.tra), a.duree + ' ans']);
      }).join('') + '</table>' +
      (deja.length ? '<p class="petit">Déjà fait : ' + deja.map(function (a) { return esc(a.def.nom) + ' (' + esc(a.etat.raison) + ')'; }).join(' ; ') + '.</p>' : '') +
      (choisi ? '<h2>Bouquet « ' + esc(choisi.nom) + ' »</h2><p>' + choisi.etapes.map(function (e) { return esc(e.nom); }).join(' → ') +
        ' : − ' + nb(choisi.gainPart * 100) + ' % d’énergie, ≈ ' + euros(choisi.economie, 2) + '/an, coût ≈ ' + euros(choisi.cout.moyen, 2) + ' TTC, retour ' +
        ans(choisi.trb) + ' brut / ' + ans(choisi.tra) + ' actualisé' + (et ? ', étiquette ' + choisi.avant.etiquette.classe + ' → ' + choisi.apres.etiquette.classe : '') + '.</p>' : '') +
      '<h2>À vérifier en visite</h2><p>' + r.incertitude.contributions.filter(function (c) { return c.origine !== 'saisie'; }).slice(0, 4)
        .map(function (c) { return '<b>' + esc(c.nom) + '</b> : ' + esc(c.visite); }).join('<br>') + '</p>' +
      '<p class="petit">Hypothèses : ' + r.exemples.length + ' valeurs d’exemple (prix de l’énergie, coûts, valeurs par défaut de l’époque) à confirmer. Coûts hors aides. ' +
      'Données : IGN BD TOPO, BAN, BDNB (CSTB), ADEME. Méthode : degrés-jours, U × A, rendements, temps de retour actualisé.</p></body></html>';
  }

  function texteFiche() {
    const z = document.createElement('div');
    z.innerHTML = ficheHtml().replace(/<style[\s\S]*?<\/style>/, '');
    return z.innerText || z.textContent;
  }

  function nomFiche() {
    const b = etat.batiment || {};
    const lieu = b.adresse && (b.adresse.commune || b.adresse.label) || 'batiment';
    const d = new Date();
    return 'Audit-flash_' + F.nomFichier(lieu, 'batiment') + '_' + d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + '.doc';
  }

  function telechargerFiche() {
    if (!r || r.manque.length || r.erreur) { F.toast('Choisis d’abord un bâtiment.'); return; }
    F.telecharger(nomFiche(), '﻿' + ficheHtml(), 'application/msword');
    F.toast('Fiche téléchargée : ouvre-la avec Word.');
  }

  function copierFiche() {
    if (!r || r.manque.length || r.erreur) { F.toast('Choisis d’abord un bâtiment.'); return; }
    F.copierHtml(ficheHtml(), texteFiche()).then(function (ok) {
      F.toast(ok ? 'Fiche copiée : colle-la dans Word (Ctrl+V).' : 'Copie impossible : utilise le téléchargement.');
    });
  }

  /* ---------- Onglet Données ---------- */
  function afficherDonnees() {
    const filtre = ($('#filtre-donnees').value || '').toLowerCase();
    const groupes = {};
    H.VALEURS.forEach(function (x) {
      if (filtre && (x.libelle + ' ' + x.groupe + ' ' + x.id).toLowerCase().indexOf(filtre) < 0) return;
      (groupes[x.groupe] = groupes[x.groupe] || []).push(x);
    });
    const ligne = function (x) {
      const modifiee = typeof modifs[x.id] === 'number';
      const valeur = modifiee ? modifs[x.id] : x.valeur;
      return '<tr' + (modifiee ? ' class="modifiee"' : '') + '><td data-label="Valeur">' + esc(x.libelle) + '</td>' +
        '<td class="num" data-label="Chiffre"><input type="text" inputmode="decimal" data-donnee="' + esc(x.id) + '" value="' + esc(String(valeur).replace('.', ',')) +
        '" aria-label="' + esc(x.libelle) + '"></td><td data-label="Unité">' + esc(x.unite) + '</td>' +
        '<td data-label="Statut"><span class="badge ' + (modifiee ? 'info' : x.statut === 'valide' ? 'valide' : 'exemple') + '">' +
        (modifiee ? 'modifiée' : x.statut === 'valide' ? 'validée' : 'exemple') + '</span></td>' +
        '<td class="source" data-label="Source">' + esc(x.source) + (modifiee ? ' <small>(origine : ' + esc(String(x.valeur).replace('.', ',')) + ')</small>' : '') + '</td></tr>';
    };
    const carte = Object.keys(V).map(function (k) { return V[k]; }).filter(function (x) {
      return !filtre || (x.libelle + ' carte').toLowerCase().indexOf(filtre) >= 0;
    });
    $('#donnees').innerHTML = Object.keys(groupes).map(function (g) {
      return '<section class="bloc groupe-donnees"><h2>' + esc(g) + '</h2><div class="defilement"><table class="table-donnees"><thead><tr><th>Valeur</th>' +
        '<th class="num">Chiffre</th><th>Unité</th><th>Statut</th><th>Source</th></tr></thead><tbody>' + groupes[g].map(ligne).join('') + '</tbody></table></div></section>';
    }).join('') +
      (carte.length ? '<section class="bloc groupe-donnees"><h2>Carte (lecture seule)</h2><div class="defilement"><table class="table-donnees"><tbody>' +
        carte.map(function (x) {
          return '<tr><td data-label="Valeur">' + esc(x.libelle) + '</td><td class="num" data-label="Chiffre">' + nb(x.valeur, x.valeur % 1 ? 1 : 0) + '</td><td data-label="Unité">' +
            esc(x.unite) + '</td><td data-label="Statut"><span class="badge ' + (x.statut === 'valide' ? 'valide' : 'exemple') + '">' + (x.statut === 'valide' ? 'validée' : 'exemple') +
            '</span></td><td class="source" data-label="Source">' + esc(x.source) + '</td></tr>';
        }).join('') + '</tbody></table></div></section>' : '') +
      '<details class="bloc groupe-donnees"><summary><b>Zones climatiques par département</b></summary><p class="aide">' + esc(H.ZONES_SOURCE) + '</p><ul class="zones">' +
      Object.keys(H.ZONES).map(function (z) { return '<li><b>' + z + '</b> : ' + H.ZONES[z].join(', ') + '</li>'; }).join('') + '</ul></details>';
  }

  /* ---------- Exemple, nouveau ---------- */
  function chargerExemple() {
    const s = function (v) { return { valeur: v, origine: 'saisie' }; };
    etat = etatVide();
    etat.saisies = {
      usage: s('logement-individuel'), annee: s(1970), chauffage: s('gaz-ancienne'),
      surfaceSol: s(100), niveaux: s(1), perimetre: s(40), perimetreExpose: s(40), hauteur: s(3), departement: s('31'), codePostal: s('31000')
    };
    etat.batiment = { adresse: { label: 'Exemple : maison de plain-pied de 1970, Toulouse (sans carte)', commune: 'Exemple Toulouse', codePostal: '31000' } };
    window.CarteFlash.effacer();
    $('#recherche').value = '';
    recalculer();
    F.toast('Exemple chargé : maison de 1970 à Toulouse, comme dans l’onglet Méthode.');
  }

  function nouveau() {
    if (Object.keys(etat.saisies).length && !window.confirm('Tout effacer et recommencer ?')) return;
    etat = etatVide();
    window.CarteFlash.effacer();
    $('#recherche').value = '';
    recalculer();
  }

  /* ---------- Ce qui arrive de la carte ---------- */
  function surBatiment(b) {
    const c = {};
    const mettre = function (cle, valeur, origine) {
      if (valeur === null || valeur === undefined || valeur === '' || (typeof valeur === 'number' && !isFinite(valeur))) return;
      c[cle] = { valeur: valeur, origine: origine || 'carte' };
    };
    const lu = b.bdtopo || {};
    mettre('surfaceSol', b.surfaceSol);
    mettre('perimetre', b.perimetre);
    mettre('perimetreExpose', b.perimetreExpose);
    mettre('hauteur', b.hauteur);
    mettre('niveaux', b.niveaux);
    mettre('logements', lu.logements);
    mettre('toitureType', lu.toitureType);
    mettre('annee', lu.annee);
    mettre('usage', C.usageDepuisBdTopo(lu.usage, lu.logements, b.surfacePlancher));
    if (b.adresse) mettre('departement', b.adresse.departement);
    else if (etat.carte.departement) c.departement = etat.carte.departement; // en attendant l'adresse du point (H : même secteur)
    const garde = Object.keys(etat.saisies).length > 0;
    etat.carte = c;
    etat.complements = {};
    etat.batiment = {
      id: b.id, lon: b.lon, lat: b.lat, contour: b.contour, cotes: b.cotes, hauteurDessin: b.hauteurDessin,
      partMitoyenne: b.partMitoyenne, origineNiveaux: b.origineNiveaux, bdtopo: lu,
      adresse: b.adresse || (etat.batiment && etat.batiment.adresse) || null
    };
    recalculer();
    if (garde) F.toast('Bâtiment choisi. Tes réponses sont gardées (« Nouveau » pour tout effacer).');
  }

  function surAdresse(a) {
    if (!a) return;
    etat.batiment = Object.assign({}, etat.batiment || {}, { adresse: a });
    if (a.departement) etat.carte.departement = { valeur: a.departement, origine: 'carte' };
    recalculer();
  }

  function surComplements(partie) {
    etat.complements = Object.assign({}, etat.complements, partie);
    const bd = partie.bdnb;
    if (bd) {
      if (bd.annee) etat.carte.annee = { valeur: bd.annee, origine: 'bdnb' };
      if (bd.energieChauffage) etat.carte.energieChauffage = { valeur: bd.energieChauffage, origine: 'bdnb' };
      if (bd.logements && !etat.carte.logements) etat.carte.logements = { valeur: bd.logements, origine: 'bdnb' };
    }
    if (partie.dpe) {
      const proche = partie.dpe.find(function (d) { return d.distance !== null && d.distance <= V.rayonDpe.valeur; });
      if (proche) {
        if (!etat.carte.energieChauffage && proche.energieChauffage) etat.carte.energieChauffage = { valeur: proche.energieChauffage, origine: 'dpe' };
        if (!etat.carte.annee && proche.annee) etat.carte.annee = { valeur: proche.annee, origine: 'dpe' };
      }
    }
    recalculer();
  }

  function surSources(s) {
    $('#sources').innerHTML = Object.keys(s).map(function (id) {
      return '<span class="source s-' + s[id].etat + '" title="' + esc(s[id].texte) + '"><i></i>' + esc(NOMS_SOURCES[id] || id) + '</span>';
    }).join('');
  }

  function surIndisponible() {
    ouvrirPanneau('batiment');
    $('#b-saisie').open = true;
  }

  /* ---------- Navigation ---------- */
  function ouvrirVue(vue) {
    $$('.vues [data-vue]').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.vue === vue)); });
    $('#vue-diagnostic').hidden = vue !== 'diagnostic';
    $('#vue-methode').hidden = vue !== 'methode';
    $('#vue-donnees').hidden = vue !== 'donnees';
    if (vue === 'donnees') afficherDonnees();
    window.scrollTo(0, 0);
  }

  function ouvrirPanneau(nom) {
    $$('.onglets-panneau [data-panneau]').forEach(function (b) { b.setAttribute('aria-selected', String(b.dataset.panneau === nom)); });
    ['batiment', 'questions', 'factures'].forEach(function (n) { $('#p-' + n).hidden = n !== nom; });
  }

  function brancher() {
    $$('.vues [data-vue]').forEach(function (b) { b.addEventListener('click', function () { ouvrirVue(b.dataset.vue); }); });
    $$('.onglets-panneau [data-panneau]').forEach(function (b) { b.addEventListener('click', function () { ouvrirPanneau(b.dataset.panneau); }); });
    $('#exemple').addEventListener('click', chargerExemple);
    $('#nouveau').addEventListener('click', nouveau);
    $('#fiche').addEventListener('click', telechargerFiche);

    // Questions : tuiles, « je ne sais pas », année, occupants
    $('#p-questions').addEventListener('click', function (e) {
      const t = e.target.closest('.tuile, .nsp');
      if (!t) return;
      if (t.dataset.nsp) saisir(t.dataset.cle, null);
      else saisir(t.dataset.cle, t.getAttribute('aria-pressed') === 'true' ? null : t.dataset.valeur);
    });
    // Saisies numériques (questions, bâtiment sans carte)
    document.addEventListener('change', function (e) {
      const champ = e.target;
      if (champ.dataset.saisie) {
        const cle = champ.dataset.saisie, brut = champ.value.trim();
        if (cle === 'codePostal') {
          const dep = C.departementDepuisCodePostal(brut);
          if (brut && !dep) { F.toast('Code postal à 5 chiffres, s’il te plaît.'); return; }
          if (brut) { etat.saisies.departement = { valeur: dep, origine: 'saisie' }; }
          else delete etat.saisies.departement;
          saisir('codePostal', brut || null);
          return;
        }
        const n = F.lireNombre(brut);
        saisir(cle, brut === '' ? null : (n > 0 || (cle === 'occupants' && n >= 0) ? n : null));
      } else if (champ.dataset.facture) {
        const n = F.lireNombre(champ.value);
        if (n > 0) etat.factures[champ.dataset.facture] = n; else delete etat.factures[champ.dataset.facture];
        recalculer();
      } else if (champ.dataset.donnee) {
        const id = champ.dataset.donnee, n = F.lireNombre(champ.value);
        const origine = H.VALEURS.find(function (x) { return x.id === id; }).valeur;
        if (!isFinite(n) || n === origine) delete modifs[id]; else modifs[id] = n;
        F.ecrire('donnees.v1', modifs);
        recalculer();
        afficherDonnees();
      }
    });
    $('#p-batiment').addEventListener('click', function (e) {
      const b = e.target.closest('[data-segment] button');
      if (!b) return;
      const actuel = etat.saisies.mitoyennete && etat.saisies.mitoyennete.valeur;
      saisir('mitoyennete', actuel === b.dataset.valeur ? null : b.dataset.valeur);
    });
    // Boutons des résultats et des factures
    document.addEventListener('click', function (e) {
      const a = e.target.closest('[data-action], [data-bouquet], [data-vue-lien]');
      if (!a) return;
      if (a.dataset.vueLien) { ouvrirVue(a.dataset.vueLien); return; }
      if (a.dataset.bouquet) { etat.bouquet = a.dataset.bouquet; afficherResultats(); sauver(); return; }
      const action = a.dataset.action;
      if (action === 'exemple') chargerExemple();
      else if (action === 'sans-carte') { ouvrirPanneau('batiment'); $('#b-saisie').open = true; $('[data-saisie="surfacePlancher"]').focus(); }
      else if (action === 'telecharger-fiche') telechargerFiche();
      else if (action === 'copier-fiche') copierFiche();
      else if (action === 'toutes-energies') { toutesEnergies = !toutesEnergies; a.textContent = toutesEnergies ? 'Masquer les énergies inutilisées' : 'Afficher toutes les énergies'; majFactures(); }
    });
    $('#filtre-donnees').addEventListener('input', afficherDonnees);
    $('#reinitialiser-donnees').addEventListener('click', function () {
      if (Object.keys(modifs).length && !window.confirm('Remettre toutes les valeurs d’origine ?')) return;
      modifs = {};
      F.ecrire('donnees.v1', modifs);
      recalculer();
      afficherDonnees();
    });
  }

  function init() {
    construireBatiment();
    construireQuestions();
    construireFactures();
    brancher();
    recalculer();
    window.CarteFlash.demarrer({
      surBatiment: surBatiment, surAdresse: surAdresse, surComplements: surComplements, surSources: surSources,
      surMessage: F.toast, surIndisponible: surIndisponible
    });
    if (etat.batiment && etat.batiment.contour) window.CarteFlash.afficherSauvegarde(etat.batiment);
    if (etat.batiment && etat.batiment.adresse && etat.batiment.contour) $('#recherche').value = etat.batiment.adresse.label || '';
  }

  document.addEventListener('DOMContentLoaded', init);
})();
