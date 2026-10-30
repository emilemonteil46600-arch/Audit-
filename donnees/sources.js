/* ==========================================================
   Audit flash — valeurs utilisées par les calculs
   Règle : aucun chiffre sans source. Chaque valeur a une source,
   une date et un statut « exemple » (à confirmer) ou « valide ».
   Tant qu'une valeur utilisée est en « exemple », la page le dit.
   ========================================================== */
(function (global) {
  'use strict';

  const VALEURS = {
    hauteurEtage: {
      valeur: 3, unite: 'm',
      libelle: "Hauteur d'un étage (pour passer de la hauteur du bâtiment au nombre de niveaux)",
      source: "Hypothèse de départ du projet (H), à comparer au nombre d'étages de la BD TOPO quand il existe",
      date: '2026-10-30', statut: 'exemple'
    },
    rayonTerre: {
      valeur: 6371008.8, unite: 'm',
      libelle: 'Rayon moyen de la Terre (pour calculer une surface à partir de longitudes / latitudes)',
      source: 'Rayon moyen R1 de l’ellipsoïde GRS 80 (Moritz, « Geodetic Reference System 1980 », Journal of Geodesy, 2000)',
      date: '2026-10-30', statut: 'valide'
    },
    rayonRecherche: {
      valeur: 40, unite: 'm',
      libelle: 'Rayon de recherche autour du point cliqué (bâtiments, DPE, photos)',
      source: "Convention de l'outil (H) : assez grand pour attraper le bâtiment, assez petit pour ne pas charger tout le quartier",
      date: '2026-10-30', statut: 'exemple'
    },
    seuilLent: {
      valeur: 3000, unite: 'ms',
      libelle: 'Au-delà de ce temps de réponse, un service est noté 🟠 « lent »',
      source: "Convention de l'outil (H) : le pré-diagnostic doit tenir en 5 minutes",
      date: '2026-10-30', statut: 'exemple'
    },
    delaiMax: {
      valeur: 15000, unite: 'ms',
      libelle: "Temps d'attente maximal d'un service avant d'abandonner",
      source: "Convention de l'outil (H)",
      date: '2026-10-30', statut: 'exemple'
    }
  };

  global.VALEURS_FLASH = VALEURS;
  if (typeof module !== 'undefined' && module.exports) module.exports = VALEURS;
})(typeof window !== 'undefined' ? window : globalThis);
