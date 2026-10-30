/* ==========================================================
   Audit flash — services publics testés
   Pour chacun : à quoi il sert, où lire sa documentation,
   et ce qu'on croit savoir de ses conditions d'utilisation.
   ⚠ Les conditions sont des HYPOTHÈSES (H) tant qu'Émile ne les a
   pas relues sur la page officielle (statut « a-verifier »).
   Le 30/10/2026, les pages de documentation n'étaient pas lisibles
   depuis l'environnement de Claude (réseau fermé) : à relire.
   ========================================================== */
(function (global) {
  'use strict';

  const SERVICES = [
    {
      id: 'geocodage', nom: 'Adresse → point (BAN, Géoplateforme IGN)',
      role: "Trouver le point d'une adresse. C'est la porte d'entrée de tout le reste.",
      doc: 'https://geoservices.ign.fr/documentation/services/services-geoplateforme/geocodage',
      conditions: "(H) Sans clé. Limite de requêtes par seconde et par adresse IP. Licence ouverte Etalab 2.0.",
      statut: 'a-verifier'
    },
    {
      id: 'geocodageAncien', nom: 'Adresse → point (ancienne API adresse.data.gouv.fr)',
      role: 'Solution de secours si la Géoplateforme ne répond pas.',
      doc: 'https://adresse.data.gouv.fr/outils/api-doc/adresse',
      conditions: "(H) Annoncée comme remplacée par la Géoplateforme : ne pas construire dessus.",
      statut: 'a-verifier'
    },
    {
      id: 'planIgn', nom: 'Fond de carte Plan IGN',
      role: 'Fond de carte français, sans publicité.',
      doc: 'https://geoservices.ign.fr/services-geoplateforme-diffusion',
      conditions: '(H) Sans clé. Licence ouverte Etalab 2.0, mention « © IGN » à afficher.',
      statut: 'a-verifier'
    },
    {
      id: 'orthoIgn', nom: 'Photo aérienne IGN',
      role: 'Voir la toiture, la cour, les bâtiments voisins.',
      doc: 'https://geoservices.ign.fr/services-geoplateforme-diffusion',
      conditions: '(H) Sans clé. Licence ouverte Etalab 2.0, mention « © IGN » à afficher.',
      statut: 'a-verifier'
    },
    {
      id: 'osm', nom: 'Fond de carte OpenStreetMap',
      role: 'Fond de secours.',
      doc: 'https://operations.osmfoundation.org/policies/tiles/',
      conditions: "(H) Toléré pour un petit usage, mention « © contributeurs OpenStreetMap » obligatoire, pas d'usage intensif.",
      statut: 'a-verifier'
    },
    {
      id: 'openfreemap', nom: 'Carte vectorielle OpenFreeMap',
      role: 'Autre fond gratuit, avec des bâtiments déjà prêts pour la 3D.',
      doc: 'https://openfreemap.org/',
      conditions: '(H) Gratuit, sans clé, sans limite annoncée. Mention OpenStreetMap obligatoire.',
      statut: 'a-verifier'
    },
    {
      id: 'maplibre', nom: 'Bibliothèque de carte MapLibre GL JS',
      role: 'Afficher la carte, le contour et le bâtiment en 3D (chargée depuis unpkg, version fixée).',
      doc: 'https://maplibre.org/maplibre-gl-js/docs/',
      conditions: 'Logiciel libre (licence BSD-3). Version 4.7.1 fixée ; la dernière est la 6.16.0 (25/10/2026), passage à étudier.',
      statut: 'a-verifier'
    },
    {
      id: 'bdtopo', nom: 'Contours + hauteur des bâtiments (IGN BD TOPO)',
      role: 'Surface au sol, hauteur, nombre d’étages, usage, matériaux.',
      doc: 'https://geoservices.ign.fr/bdtopo',
      conditions: '(H) Sans clé. Licence ouverte Etalab 2.0. Limite de requêtes par seconde.',
      statut: 'a-verifier'
    },
    {
      id: 'bdnb', nom: 'BDNB du CSTB (fiche du bâtiment)',
      role: 'Année, usage, matériaux, énergie de chauffage, DPE rattaché.',
      doc: 'https://bdnb.io/services/services_api/',
      conditions: "(H) Accès « open » sans clé avec un nombre de requêtes limité ; certaines données réservées aux offres payantes. Licence à relire.",
      statut: 'a-verifier'
    },
    {
      id: 'dpeLogement', nom: 'DPE logements (ADEME)',
      role: 'Étiquette, consommation et descriptif des DPE réalisés autour du point.',
      doc: 'https://data.ademe.fr/datasets/dpe03existant',
      conditions: '(H) Sans clé. Licence ouverte Etalab 2.0. Limite de requêtes à relire.',
      statut: 'a-verifier'
    },
    {
      id: 'dpeTertiaire', nom: 'DPE tertiaire (ADEME)',
      role: 'Pareil pour les bureaux, commerces, bâtiments publics.',
      doc: 'https://data.ademe.fr/datasets?q=dpe%20tertiaire',
      conditions: '(H) Sans clé. Licence ouverte Etalab 2.0.',
      statut: 'a-verifier'
    },
    {
      id: 'panoramax', nom: 'Photos de rue Panoramax',
      role: 'Voir la façade avant la visite (alternative libre à Street View).',
      doc: 'https://panoramax.fr/',
      conditions: "(H) Photos le plus souvent sous licence libre (CC-BY-SA), auteur à citer. Couverture inégale selon les villes.",
      statut: 'a-verifier'
    }
  ];

  global.SERVICES_FLASH = SERVICES;
  if (typeof module !== 'undefined' && module.exports) module.exports = SERVICES;
})(typeof window !== 'undefined' ? window : globalThis);
