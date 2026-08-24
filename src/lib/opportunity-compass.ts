// "Boussole d'Opportunités" — V3 du chantier "orientation fine" (2026-07-22, cf.
// genizio-decisions #40). Séparée volontairement du Profil d'Aptitudes (la carte des talents,
// les sous-formes agrégées : le signal mesuré, propriété durable de Génizio) : ceci est une
// COUCHE D'INTERPRÉTATION — "selon notre compréhension actuelle du monde, voici où ce profil
// pourrait s'exprimer" — datée, non permanente, à réviser. Ne jamais présenter ce contenu comme
// une prédiction fiable ou une orientation définitive : les données de l'app (défis à domicile,
// sans vidéo ni capteurs) ne permettent structurellement pas de trancher entre disciplines
// précises avec certitude (cf. discussion produit du 2026-07-22 — comparer à aiScout, qui lui
// s'appuie sur de la vision par ordinateur sur des tests physiques standardisés).
//
// Gating : affichée uniquement à partir de 12 ans (décision utilisateur explicite, 2026-07-22)
// — avant cet âge, seul le Profil d'Aptitudes est montré, pour ne pas rétrécir prématurément le
// champ des possibles d'un jeune enfant.
//
// Révision prévue : même cadence que le référentiel académique (semestrielle, décision #39).
//
// Étendue aux 9 domaines le 2026-07-22 (même jour que trait_subform) — chaque liste de pistes
// est une construction raisonnable de l'agent, pas une recherche sourcée (à la différence du
// référentiel académique #39) : à traiter comme un premier jet révisable.
//
// Compétences numériques ajoutées le 2026-07-29 (demande utilisateur) : programmation, outils
// d'IA et bureautique avancée manquaient alors qu'elles comptent surtout pour la tranche 12-16
// ans (préparation aux études/à l'emploi, pas découverte de talent inné par le jeu — d'où leur
// place ici plutôt que dans trait_subform/TALENT_SUBFORMS).

export const OPPORTUNITY_COMPASS_VERSION = "Vision 2026";
export const OPPORTUNITY_COMPASS_DISCLAIMER =
  "À réviser chaque semestre — ne remplace pas un vrai bilan professionnel (sportif, académique ou professionnel).";
export const OPPORTUNITY_COMPASS_MIN_AGE = 12;

export const TALENT_SUBFORM_OPPORTUNITIES: Record<string, string[]> = {
  // corporelle
  endurance: ["Athlétisme (fond/demi-fond)", "Football", "Natation", "Cyclisme"],
  explosivite: ["Basketball", "Athlétisme (sprint/saut)", "Volleyball", "Sports de combat"],
  coordination_fine: [
    "Tennis de table",
    "Escrime",
    "Arts martiaux techniques",
    "Métiers manuels de précision",
  ],
  coordination_collective: ["Handball", "Football", "Basketball", "Rugby"],
  precision: ["Tir à l'arc", "Golf", "Pétanque", "Gymnastique"],

  // spatial
  orientation: [
    "Navigation/cartographie",
    "Architecture",
    "Guide d'exploration",
    "Pilotage (aviation, marine)",
  ],
  visualisation_3d: ["Architecture", "Design produit", "Chirurgie", "Design de jeux vidéo (3D)"],
  representation_graphique: [
    "Design graphique",
    "Illustration",
    "Cartographie",
    "Dessin technique (ingénierie)",
  ],
  organisation_espace: [
    "Architecture d'intérieur",
    "Logistique/entreposage",
    "Urbanisme",
    "Scénographie/muséographie",
  ],

  // sociale
  leadership: [
    "Management d'équipe",
    "Vie associative/politique",
    "Coaching sportif",
    "Entrepreneuriat collectif",
  ],
  mediation: ["Médiation/résolution de conflits", "Droit", "Ressources humaines", "Diplomatie"],
  collaboration: [
    "Travail en mode projet",
    "Sport collectif",
    "Organisation d'événements",
    "Coopératives",
  ],
  ecoute_empathique: [
    "Psychologie/accompagnement",
    "Enseignement",
    "Travail social",
    "Soins infirmiers",
  ],

  // entrepreneuriale
  negociation: [
    "Commerce/vente",
    "Achats & négociation fournisseurs",
    "Droit des affaires",
    "Diplomatie",
  ],
  prise_de_risque: [
    "Création d'entreprise",
    "Investissement",
    "Recherche & innovation",
    "Sports à risque encadrés",
  ],
  sens_du_client: ["Marketing", "Vente/commerce", "Design de service", "Hôtellerie-restauration"],
  gestion_ressources: [
    "Gestion de projet",
    "Bureautique avancée (tableurs, outils numériques)",
    "Finance/comptabilité",
    "Logistique",
    "Gestion d'exploitation agricole",
  ],

  // creative
  invention_visuelle: [
    "Arts plastiques",
    "Design graphique/mode",
    "Architecture",
    "Illustration/animation",
  ],
  narration: [
    "Écriture/scénario",
    "Cinéma/audiovisuel",
    "Narrative design (jeux vidéo)",
    "Édition jeunesse",
  ],
  improvisation: [
    "Théâtre/comédie",
    "Musique (jazz, composition live)",
    "Publicité créative",
    "Stand-up",
  ],
  detournement: [
    "Design industriel",
    "Artisanat durable (upcycling)",
    "Publicité créative",
    "Arts visuels contemporains",
  ],

  // artisanale
  dexterite_fine: ["Bijouterie/horlogerie", "Couture/broderie", "Chirurgie", "Ébénisterie fine"],
  assemblage: ["Menuiserie/charpente", "Mécanique", "Construction/BTP", "Électronique"],
  reparation: [
    "Mécanique auto/moto",
    "Électroménager",
    "Dépannage informatique",
    "Restauration de mobilier",
  ],
  finition_esthetique: [
    "Ébénisterie",
    "Décoration d'intérieur",
    "Pâtisserie/art culinaire",
    "Carrosserie",
  ],

  // emotionnelle
  autoregulation: [
    "Sport individuel de haut niveau",
    "Métiers à forte pression (secours, pilotage)",
    "Arbitrage sportif",
    "Encadrement bien-être",
  ],
  expression: [
    "Écriture personnelle",
    "Théâtre",
    "Chant/musique expressive",
    "Accompagnement psychologique",
  ],
  empathie: ["Psychologie/thérapie", "Médecine/soins infirmiers", "Travail social", "Enseignement"],
  resilience: [
    "Sport de haut niveau",
    "Entrepreneuriat",
    "Recherche scientifique",
    "Métiers d'urgence",
  ],

  // logico_mathematique
  raisonnement_abstrait: [
    "Mathématiques/recherche",
    "Philosophie",
    "Informatique théorique",
    "Droit (raisonnement juridique)",
  ],
  calcul: [
    "Comptabilité/finance",
    "Ingénierie",
    "Statistiques/data science",
    "Sciences de laboratoire",
  ],
  resolution_problemes: [
    "Programmation informatique",
    "Développement web/mobile",
    "Automatisation & outils d'IA",
    "Ingénierie",
    "Médecine (diagnostic)",
    "Jeux stratégiques (échecs)",
  ],
  reconnaissance_motifs: [
    "Data science/IA",
    "Composition musicale",
    "Cryptographie/sécurité informatique",
    "Sciences (biologie, astronomie)",
  ],

  // linguistique
  expression_ecrite: [
    "Journalisme/écriture",
    "Édition",
    "Rédaction juridique",
    "Communication/marketing",
  ],
  expression_orale: [
    "Enseignement",
    "Théâtre/audiovisuel",
    "Prise de parole publique",
    "Guide/animation",
  ],
  argumentation: [
    "Droit (avocat)",
    "Débat/diplomatie",
    "Vente/négociation",
    "Journalisme d'opinion",
  ],
  memorisation_lexicale: [
    "Traduction/interprétariat",
    "Enseignement des langues",
    "Droit",
    "Littérature/poésie",
  ],
};
