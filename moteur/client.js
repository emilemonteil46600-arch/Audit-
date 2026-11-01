/* ==========================================================
   VUE CLIENT — AUDIT FLASH
   Une page simple à montrer (tablette) ou à imprimer en PDF pour
   un client, et le même contenu en texte pour un mail.
   Vouvoiement : c'est un document pour le client (H, choix de
   l'outil), alors que l'interface d'Émile est au tutoiement.
   AUCUN calcul : tout vient de MoteurCalcul.diagnostiquer ; ici on
   choisit les mots et on met en forme.
   ========================================================== */
(function (global) {
  'use strict';

  const F = global.FLASH, G = global.GraphiquesFlash, H = global.HYPOTHESES_FLASH;
  const esc = function (t) { return F.echapper(t); };
  const VC = {};

  // Pourquoi chaque action, en mots simples (pas de chiffre ici : ils viennent du calcul).
  const POURQUOI = {
    combles: 'La chaleur monte : un plafond de combles mal isolé laisse filer une bonne part du chauffage. Des travaux rapides, souvent le geste le plus rentable.',
    terrasse: 'Un toit plat mal isolé perd beaucoup de chaleur. Le meilleur moment pour l’isoler : quand l’étanchéité doit être refaite.',
    ite: 'Isoler les murs par l’extérieur supprime l’effet « mur froid » et traite les jonctions avec les planchers, sans perdre de surface habitable.',
    iti: 'Isoler les murs par l’intérieur coûte moins cher, mais réduit un peu la surface et laisse quelques points faibles aux jonctions.',
    plancher: 'Un plancher froid au-dessus d’un sous-sol ou d’un vide sanitaire s’isole par en dessous, sans toucher aux pièces.',
    menuiseries: 'Des fenêtres neuves améliorent surtout le confort (courants d’air, sensation de froid) ; le gain sur la facture reste souvent limité.',
    hygro: 'Une ventilation qui s’adapte à l’humidité renouvelle l’air sans chauffer l’extérieur pour rien. Elle devient indispensable après isolation.',
    'double-flux': 'La ventilation double flux récupère la chaleur de l’air qui sort pour réchauffer l’air neuf qui entre.',
    regulation: 'Programmer et réguler le chauffage (thermostat, robinets thermostatiques) évite de chauffer quand ce n’est pas utile. Peu cher, vite remboursé.',
    'pac-air-eau': 'Une pompe à chaleur produit plusieurs fois plus de chaleur qu’elle ne consomme d’électricité. Elle se dimensionne après l’isolation : plus petite, donc moins chère.',
    condensation: 'Une chaudière à condensation récupère la chaleur des fumées : même énergie, moins de consommation.',
    'pac-air-air': 'Une pompe à chaleur air/air remplace des radiateurs électriques et consomme bien moins. Elle peut aussi rafraîchir l’été.',
    'ecs-thermo': 'Un ballon thermodynamique chauffe l’eau avec une petite pompe à chaleur : beaucoup moins d’électricité pour l’eau chaude.',
    led: 'L’éclairage LED avec détection de présence consomme beaucoup moins et dure longtemps.'
  };

  // Par où part la chaleur, en mots simples.
  const PAROIS = {
    murs: 'les murs', vitrages: 'les fenêtres', toiture: 'la toiture', plancher: 'le plancher bas',
    ponts: 'les jonctions entre murs et planchers', air: 'le renouvellement d’air (ventilation, fuites)'
  };
  const USAGES = {
    chauffage: 'Le chauffage', ecs: 'L’eau chaude', froid: 'La climatisation', eclairage: 'L’éclairage',
    auxiliaires: 'Les pompes et ventilateurs', autres: 'Les autres usages (appareils, bureautique)'
  };
  // Ce qu'on vérifiera en visite, en mots simples (clés des facteurs d'incertitude du moteur).
  const A_VERIFIER = {
    surface: 'la surface chauffée', murs: 'l’isolation des murs', toiture: 'l’isolation de la toiture', vitrage: 'les fenêtres',
    plancher: 'le plancher bas', ventilation: 'la ventilation', chauffage: 'la chaudière ou la pompe à chaleur',
    tauxVitrage: 'la surface vitrée', occupants: 'la production d’eau chaude', ratios: 'l’éclairage et les équipements'
  };

  function ico(nom) { return '<svg class="ico" aria-hidden="true"><use href="#i-' + nom + '"/></svg>'; }
  function nom(liste, id) { return ((liste || []).find(function (x) { return x.id === id; }) || {}).nom || id; }

  // Les actions retenues (une par famille), ✅ puis 🟠, les plus grosses économies d'abord.
  function retenues(r, verdict) {
    return r.actions.filter(function (a) { return a.etat.etat === 'ok' && r.choix[a.def.famille] === a && a.verdict === verdict; })
      .sort(function (a, b) { return b.economie - a.economie; });
  }

  function pasLaPeine(r) {
    const deja = r.actions.filter(function (a) { return a.etat.etat === 'deja'; }).map(function (a) {
      return { nom: a.def.nom, raison: a.etat.raison };
    });
    const non = retenues(r, 'non').map(function (a) {
      return { nom: a.def.nom, raison: a.economie > 0 ? 'ne se rembourse pas sur sa durée de vie (' + a.duree + ' ans)' : 'pas d’économie sur la facture' };
    });
    return deja.concat(non);
  }

  function bouquetChoisi(r, id) {
    return r.bouquets.find(function (b) { return b.id === id; }) || r.bouquets.find(function (b) { return b.id === 'conseille'; }) || r.bouquets[0] || null;
  }

  // Les deux parois qui perdent le plus, et l'usage qui consomme le plus.
  function principales(r) {
    const parois = Object.keys(r.modele.deperditions.parts).sort(function (a, b) {
      return r.modele.deperditions.parts[b] - r.modele.deperditions.parts[a];
    });
    const usages = Object.keys(r.resultat.parts).sort(function (a, b) { return r.resultat.parts[b] - r.resultat.parts[a]; });
    return { parois: parois.slice(0, 2), usage: usages[0] };
  }

  function aVerifier(r) {
    return r.incertitude.contributions.filter(function (c) { return c.origine !== 'saisie' && A_VERIFIER[c.cle]; })
      .slice(0, 3).map(function (c) { return A_VERIFIER[c.cle]; });
  }

  function aides(r) {
    return r.params.famille === 'logement' ?
      'MaPrimeRénov’, certificats d’économies d’énergie (CEE), éco-prêt à taux zéro' :
      'certificats d’économies d’énergie (CEE) ; et si le bâtiment fait plus de 1 000 m² de tertiaire, le décret tertiaire (décret n° 2019-771) fixe des objectifs de baisse';
  }

  function liste(mots) {
    return mots.length <= 1 ? mots.join('') : mots.slice(0, -1).join(', ') + ' et ' + mots[mots.length - 1];
  }

  /* ---------- La page ----------
     contexte = { adresse, date, preparePar, bouquet } */
  VC.html = function (r, contexte) {
    const c = contexte || {};
    const p = r.params, t = r.resultat.total, et = r.resultat.etiquette;
    const princ = principales(r);
    const afaire = retenues(r, 'afaire'), discuter = retenues(r, 'discuter');
    const non = pasLaPeine(r);
    const b = bouquetChoisi(r, c.bouquet);

    const carteAction = function (a, etude) {
      return '<div class="client-action ' + (etude ? 'c-etude' : 'c-oui') + '"><span class="client-action-ico">' + ico(a.def.icone) + '</span><div>' +
        '<h3>' + esc(a.def.nom) + ' <span class="client-badge">' + (etude ? '🟠 À étudier' : '✅ Rentable') + '</span></h3>' +
        '<p>' + esc(POURQUOI[a.id] || a.def.note || '') + '</p>' +
        '<ul class="client-action-chiffres"><li><b>≈ ' + F.euros(a.economie, 2) + '</b> d’économies par an</li>' +
        '<li><b>' + F.plageEuros(a.cout.bas, a.cout.haut) + '</b> TTC, hors aides</li>' +
        '<li>Remboursé en <b>' + F.plageAns(a.trbBas, a.trbHaut) + '</b></li></ul></div></div>';
    };

    return '<article class="client-page">' +
      '<header class="client-tete"><svg class="client-logo" width="44" height="44" viewBox="0 0 32 32" aria-hidden="true">' +
      '<rect width="32" height="32" rx="8" fill="url(#degrade-logo)"/><path d="M6 15.5 16 7l10 8.5V26H6z" fill="none" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/>' +
      '<path d="M17.5 12.5 13 19h3.5l-1 5 4.5-6.5h-3.5z" fill="#fff"/></svg>' +
      '<div class="client-titre"><span class="client-surtitre">Pré-diagnostic énergétique</span><h1>' + esc(c.adresse || 'Votre bâtiment') + '</h1>' +
      '<span>' + esc(nom(H.USAGES, p.usage)) + ' · ' + esc(nom(H.PERIODES, p.periode)) + ' · ≈ ' + F.nombre(F.significatif(p.surfacePlancher, 2)) + ' m² de plancher</span></div>' +
      '<div class="client-date">' + esc(c.date || '') + (c.preparePar ? '<br>Préparé par ' + esc(c.preparePar) : '') + '</div></header>' +
      '<p class="client-avert">' + ico('alerte') + ' Un ordre de grandeur pour décider vite, pas un audit réglementaire : une visite permettra de confirmer ces chiffres.</p>' +

      '<section class="client-chiffres">' +
      '<div class="client-chiffre principal"><span>Votre consommation</span><b>' + esc(F.fourchetteEnergie(t.ef, r.delta)) + '</b><small>par an, toutes énergies</small></div>' +
      '<div class="client-chiffre"><span>Votre facture d’énergie</span><b>≈ ' + esc(F.euros(t.cout, 2)) + '</b><small>par an, hors abonnement</small></div>' +
      (et ? '<div class="client-chiffre"><span>Étiquette indicative</span><b><i class="client-lettre dpe-' + et.classe.toLowerCase() + '">' + et.classe + '</i></b><small>pas un DPE officiel</small></div>' :
        '<div class="client-chiffre"><span>Par mètre carré</span><b>≈ ' + F.nombre(F.significatif(r.resultat.ratios.ef, 2)) + ' kWh</b><small>par m² chauffé et par an</small></div>') +
      '<div class="client-chiffre"><span>Précision</span><b>± ' + esc(F.pct(r.rel)) + '</b><small>' + (r.calage.actif ? 'calée sur vos factures' : 'à affiner avec vos factures') + '</small></div>' +
      '</section>' +

      '<section class="client-section client-energie"><div><h2>Où part l’énergie</h2>' +
      '<p>' + esc(USAGES[princ.usage]) + ' représente <b>' + esc(F.pct(r.resultat.parts[princ.usage])) + '</b> de la consommation.</p>' +
      '<p>La chaleur s’échappe surtout par <b>' + esc(PAROIS[princ.parois[0]]) + '</b> (' + esc(F.pct(r.modele.deperditions.parts[princ.parois[0]])) + ') et par <b>' +
      esc(PAROIS[princ.parois[1]]) + '</b> (' + esc(F.pct(r.modele.deperditions.parts[princ.parois[1]])) + ').</p></div>' +
      G.anneau(r.resultat.usages.map(function (u) {
        return { id: u.id, nom: USAGES[u.id], valeur: u.ef, texte: F.euros(u.cout, 2) + ' par an' };
      }), { valeur: F.energie(t.ef).split(' ')[0], unite: F.energie(t.ef).split(' ')[1] + ' /an', sous: F.euros(t.cout, 2) }) + '</section>' +

      '<section class="client-section"><h2>Ce que nous recommandons</h2>' +
      (afaire.length || discuter.length ? afaire.map(function (a) { return carteAction(a, false); }).join('') + discuter.map(function (a) { return carteAction(a, true); }).join('') :
        '<p>Aucun travail nettement rentable avec les hypothèses actuelles : la visite permettra d’affiner.</p>') + '</section>' +

      (non.length ? '<section class="client-section"><h2>Ce qui ne vaut pas le coup ici</h2><ul class="client-non">' +
        non.map(function (x) { return '<li>' + ico('alerte') + '<span><b>' + esc(x.nom) + '</b> : ' + esc(x.raison) + '.</span></li>'; }).join('') + '</ul></section>' : '') +

      (b && b.etapes.length > 1 ? '<section class="client-section"><h2>Le programme conseillé</h2>' +
        '<p>En enchaînant ces travaux (' + esc(liste(b.etapes.map(function (e) { return e.nom.toLowerCase(); }))) + ') : environ <b>− ' + F.pct(b.gainPart) + '</b> d’énergie, ' +
        '<b>≈ ' + esc(F.euros(b.economie, 2)) + ' d’économies par an</b>, pour <b>' + esc(F.plageEuros(b.cout.bas, b.cout.haut)) + '</b> TTC hors aides.' +
        (et ? ' Étiquette indicative : <b>' + b.avant.etiquette.classe + ' → ' + b.apres.etiquette.classe + '</b>.' : '') + '</p>' +
        G.cascade(b.avant.total.ef, b.etapes.map(function (e) { return { nom: e.nom, icone: e.icone, avant: e.efAvant, apres: e.efApres }; }), b.apres.total.ef, F.energie) +
        '<p class="client-note">Chaque étape part du bâtiment déjà amélioré : les gains ne s’additionnent pas, ils se suivent.</p></section>' : '') +

      '<section class="client-section"><h2>Prochaines étapes</h2><ol class="client-etapes">' +
      '<li><b>Une visite</b> pour vérifier ' + esc(liste(aVerifier(r)) || 'les points clés') + '.</li>' +
      (r.calage.actif ? '<li><b>Vos factures</b> ont servi à caler l’estimation : merci.</li>' :
        '<li><b>Vos factures</b> des trois dernières années, pour caler l’estimation.</li>') +
      '<li><b>Les aides</b> : ' + esc(aides(r)) + '. Les montants dépendent de votre situation.</li>' +
      '<li><b>Des devis</b> pour les travaux retenus.</li></ol></section>' +

      '<footer class="client-pied">Estimation réalisée avec Audit flash : déperditions paroi par paroi, méthode des degrés-jours, rendements des équipements. ' +
      'Prix de l’énergie et coûts de travaux : valeurs moyennes indicatives, hors aides, à confirmer par des devis. Détail des hypothèses sur demande.</footer>' +
      '</article>';
  };

  /* ---------- Le même contenu en texte, pour un mail ---------- */
  VC.texteMail = function (r, contexte) {
    const c = contexte || {};
    const t = r.resultat.total, et = r.resultat.etiquette;
    const afaire = retenues(r, 'afaire'), discuter = retenues(r, 'discuter');
    const b = bouquetChoisi(r, c.bouquet);
    const ligneAction = function (a) {
      return '• ' + a.def.nom + ' : ≈ ' + F.euros(a.economie, 2) + ' d’économies par an, pour ' + F.plageEuros(a.cout.bas, a.cout.haut) +
        ' TTC (hors aides), remboursé en ' + F.plageAns(a.trbBas, a.trbHaut) + '.';
    };
    const lignes = [
      'Bonjour,',
      '',
      'Voici un premier ordre de grandeur pour ' + (c.adresse ? 'le bâtiment situé ' + c.adresse : 'votre bâtiment') + '.',
      '',
      '• Consommation estimée : ' + F.fourchetteEnergie(t.ef, r.delta) + ' par an, soit environ ' + F.euros(t.cout, 2) + ' par an (hors abonnement).'
    ];
    if (et) lignes.push('• Étiquette énergie indicative : ' + et.classe + ' (ce n’est pas un DPE officiel).');
    lignes.push('');
    if (afaire.length) { lignes.push('Ce qui vaut le coup :'); afaire.forEach(function (a) { lignes.push(ligneAction(a)); }); lignes.push(''); }
    if (discuter.length) { lignes.push('À étudier :'); discuter.forEach(function (a) { lignes.push(ligneAction(a)); }); lignes.push(''); }
    const non = pasLaPeine(r);
    if (non.length) {
      lignes.push('Ce qui ne vaut pas le coup ici :');
      non.forEach(function (x) { lignes.push('• ' + x.nom + ' : ' + x.raison + '.'); });
      lignes.push('');
    }
    if (b && b.etapes.length > 1) {
      lignes.push('En enchaînant ces travaux (' + liste(b.etapes.map(function (e) { return e.nom.toLowerCase(); })) + ') : environ − ' + F.pct(b.gainPart) + ' d’énergie et ≈ ' + F.euros(b.economie, 2) +
        ' d’économies par an, pour ' + F.plageEuros(b.cout.bas, b.cout.haut) + ' TTC hors aides.');
      lignes.push('');
    }
    lignes.push('Il s’agit d’un pré-diagnostic (ordre de grandeur), pas d’un audit réglementaire : une visite permettra de confirmer ces chiffres' +
      (r.calage.actif ? '.' : ', et vos factures des trois dernières années de les caler.'));
    lignes.push('Aides possibles : ' + aides(r) + '.');
    lignes.push('');
    lignes.push('Bien cordialement,');
    if (c.preparePar) lignes.push(c.preparePar);
    return lignes.join('\n');
  };

  global.VueClient = VC;
  if (typeof module !== 'undefined' && module.exports) module.exports = VC;
})(typeof window !== 'undefined' ? window : globalThis);
