// ────────────────────────────────────────────────────────────
// GÉNIZIO — Source unique de vérité SEO / AEO / GEO
//
// SEO  : référencement classique (Google, Bing)
// AEO  : Answer Engine Optimization — être la réponse citée dans les encarts
//        de réponse directe et les résumés IA de Google/Bing
// GEO  : Generative Engine Optimization — être cité par ChatGPT, Claude,
//        Perplexity, Gemini quand un parent leur pose la question
//
// Les trois reposent sur la même base : du contenu factuel structuré en
// JSON-LD, dans le HTML rendu côté serveur (les crawlers d'IA n'exécutent
// pas le JavaScript de la même façon qu'un navigateur).
// ────────────────────────────────────────────────────────────

// Domaine canonique — www.genizio.com, DNS propagé et validé sur Vercel le 2026-07-29
// (genizio.com sans www redirige en 308 vers www.genizio.com).
//
// Surchargeable par VITE_SITE_URL au moment du build, si besoin ponctuel (preview, test).
// Reste à faire : poser une redirection depuis genizio.vercel.app vers ce domaine, sinon
// les deux adresses coexistent dans l'index et se cannibalisent.
export const SITE_URL =
  (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, "") ||
  "https://www.genizio.com";

export const SITE_NAME = "Génizio";
export const SITE_NAME_LONG = "Génizio — Révélez le potentiel unique de votre enfant";
export const SITE_DESCRIPTION =
  "Génizio révèle les talents naturels de votre enfant à travers des défis concrets à réaliser à la maison, fondés sur les 9 intelligences de Howard Gardner. Conçu pour les familles d'Afrique francophone.";

// Image affichée quand un lien Génizio est partagé (WhatsApp, Facebook, LinkedIn, X).
// Auto-hébergée : l'ancienne pointait vers un espace de stockage tiers hérité de
// l'échafaudage du projet.
//
// Limite connue : c'est la photo carrée du site (1200×1200), que les réseaux recadrent au
// centre en 1200×630. Le rendu est correct mais pas optimal — une vraie carte de partage
// dessinée au format 1200×630, avec le logotype et une accroche, convertirait mieux. À
// remplacer ici même dès qu'elle existe, sans autre changement de code.
export const OG_IMAGE_PATH = "/og-image.jpg";

export const FOUNDER_NAME = "Cheick Mohamed TRAORE";

/** Construit une URL absolue à partir d'un chemin interne. */
export function absoluteUrl(path: string): string {
  if (!path.startsWith("/")) return `${SITE_URL}/${path}`;
  return `${SITE_URL}${path}`;
}

/**
 * Balises <head> communes à toute page publique : titre, description, canonique,
 * Open Graph et Twitter. Sans canonique, plusieurs URL menant au même contenu
 * (avec/sans slash, paramètres de campagne) se cannibalisent dans l'index.
 */
export function pageMeta(opts: {
  title: string;
  description: string;
  path: string;
  image?: string;
  type?: "website" | "article";
}) {
  const url = absoluteUrl(opts.path);
  const image = absoluteUrl(opts.image ?? OG_IMAGE_PATH);
  return {
    meta: [
      { title: opts.title },
      { name: "description", content: opts.description },
      { name: "robots", content: "index, follow" },
      { property: "og:title", content: opts.title },
      { property: "og:description", content: opts.description },
      { property: "og:url", content: url },
      { property: "og:type", content: opts.type ?? "website" },
      { property: "og:image", content: image },
      { name: "twitter:title", content: opts.title },
      { name: "twitter:description", content: opts.description },
      { name: "twitter:image", content: image },
    ],
    links: [{ rel: "canonical", href: url }],
  };
}

/** Emballe un objet JSON-LD pour l'API `scripts` de TanStack Router. */
export function jsonLdScript(data: unknown) {
  return { type: "application/ld+json", children: JSON.stringify(data) };
}

// ── Entité éditrice ──
// Réutilisée comme `publisher` par les autres schémas : les moteurs de réponse
// attribuent plus volontiers une citation à une entité identifiable qu'à un
// site anonyme.
export const ORGANIZATION_JSONLD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${SITE_URL}/#organization`,
  name: SITE_NAME,
  url: SITE_URL,
  logo: absoluteUrl("/web-app-manifest-512x512.png"),
  description: SITE_DESCRIPTION,
  founder: { "@type": "Person", name: FOUNDER_NAME },
  areaServed: [
    { "@type": "Country", name: "Côte d'Ivoire" },
    { "@type": "Country", name: "Sénégal" },
    { "@type": "Country", name: "France" },
  ],
  // Contact vérifiable (WhatsApp business) — renforce la confiance des moteurs de
  // réponse. Un `sameAs` vers de vrais profils sociaux sera ajouté quand ils
  // existeront (aucun profil public constaté dans le repo au 2026-08-05).
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    url: `https://wa.me/${(import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined) ?? "33606433148"}`,
    availableLanguage: ["French"],
  },
  knowsAbout: [
    "Intelligences multiples",
    "Théorie de Howard Gardner",
    "Développement de l'enfant",
    "Apprentissage par projet",
    "Activités éducatives pour enfants",
    "Détection des talents chez l'enfant",
  ],
};

export const WEBSITE_JSONLD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  url: SITE_URL,
  name: SITE_NAME,
  description: SITE_DESCRIPTION,
  inLanguage: "fr-FR",
  publisher: { "@id": `${SITE_URL}/#organization` },
};

export const SOFTWARE_APP_JSONLD = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: SITE_NAME,
  applicationCategory: "EducationalApplication",
  operatingSystem: "Web, Android, iOS",
  inLanguage: "fr-FR",
  description: SITE_DESCRIPTION,
  publisher: { "@id": `${SITE_URL}/#organization` },
  audience: {
    "@type": "PeopleAudience",
    audienceType: "Parents d'enfants de 5 à 16 ans",
    suggestedMinAge: 5,
    suggestedMaxAge: 16,
  },
  featureList: [
    "Défis d'apprentissage personnalisés générés pour chaque enfant",
    "Cartographie des 9 intelligences multiples",
    "Portfolio de réalisations validées par preuve photo",
    "Suivi parental et accompagnement par des mentors",
  ],
};

/**
 * Construit un FAQPage. C'est le format que les moteurs de réponse et les LLM
 * consomment le plus directement : une question explicite, une réponse
 * autonome et factuelle. Chaque réponse doit se suffire à elle-même,
 * puisqu'elle peut être citée hors de son contexte.
 */
export function faqPageJsonLd(questions: { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    inLanguage: "fr-FR",
    mainEntity: questions.map((q) => ({
      "@type": "Question",
      name: q.question,
      acceptedAnswer: { "@type": "Answer", text: q.answer },
    })),
  };
}

/** Fil d'Ariane structuré — aide les moteurs à comprendre la hiérarchie du site. */
export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

/** Schéma d'Article pour les guides et articles de blog (SEO/AEO). */
export function articleJsonLd(opts: {
  headline: string;
  description: string;
  path: string;
  datePublished: string;
  dateModified?: string;
  image?: string;
  authorName?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: opts.headline,
    description: opts.description,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": absoluteUrl(opts.path),
    },
    image: absoluteUrl(opts.image ?? OG_IMAGE_PATH),
    datePublished: opts.datePublished,
    dateModified: opts.dateModified ?? opts.datePublished,
    author: {
      "@type": "Organization",
      name: opts.authorName ?? SITE_NAME,
      url: SITE_URL,
    },
    publisher: {
      "@id": `${SITE_URL}/#organization`,
    },
    inLanguage: "fr-FR",
  };
}


/**
 * Un avis de parent publié sur la landing. `reviewBody` doit être un vrai
 * retour client (jamais inventé) : c'est le format que Google et les LLM
 * reprennent le plus facilement, et une citation fabriquée est un risque de
 * crédibilité réel face à un partenaire qui vérifie (cf. le commentaire du
 * hero de la landing, qui a déjà retiré une preuve sociale inventée).
 */
export type ParentReview = {
  /** Prénom du parent (ou pseudonyme). Ne jamais publier un nom complet. */
  author: string;
  /** Ville / pays d'origine — renforce la crédibilité locale. */
  authorLocation: string;
  /** Note de 1 à 5. */
  rating: number;
  /** Court titre de l'avis (ex. « Un vrai changement pour mon fils »). */
  headline: string;
  /** Corps de l'avis, 1 à 3 phrases autonomes. */
  reviewBody: string;
  /** Nature de l'émetteur : 'parent' (propriétaire du profil enfant) ou 'mentor'
   *  (assigné à l'enfant). Affichée sur la carte pour la crédibilité. */
  senderType?: "parent" | "mentor";
  /** Nombre d'enfants inscrits par ce parent au moment du témoignage (métadonnée
   *  factuelle affichée sur la carte — ce détail concret donne de la valeur). */
  childrenCount?: number;
  /** Défis complétés de l'enfant au moment du témoignage (idem). */
  challengesCompleted?: number;
};

/**
 * Construit le schéma `Review` + `aggregateRating` sur la `SoftwareApplication`
 * Génizio. Injecté en JSON-LD dans le `<head>` de la landing : c'est ce qui rend
 * les avis citables par les moteurs de réponse (AEO) et les assistants IA (GEO).
 */
export function reviewsJsonLd(reviews: ParentReview[]) {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "@id": `${SITE_URL}/#software-reviews`,
    name: SITE_NAME,
    applicationCategory: "EducationalApplication",
    inLanguage: "fr-FR",
    publisher: { "@id": `${SITE_URL}/#organization` },
    aggregateRating: {
      "@type": "AggregateRating",
      ratingValue: (() => {
        if (reviews.length === 0) return "0";
        const avg = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        return avg.toFixed(1);
      })(),
      bestRating: 5,
      worstRating: 1,
      reviewCount: reviews.length,
    },
    review: reviews.map((r) => ({
      "@type": "Review",
      reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
      author: {
        "@type": "Person",
        name: r.author,
        address: { "@type": "PostalAddress", addressLocality: r.authorLocation },
      },
      headline: r.headline,
      reviewBody: r.reviewBody,
    })),
  };
}

/**
 * HowTo — les moteurs de réponse et les LLM extraient plus facilement une
 * procédure explicite (positions numérotées) qu'un paragraphe narratif.
 * Utilisé sur la landing pour la méthode en trois actes, dont les étapes sont
 * réellement visibles dans la section « Trois actes. Zéro questionnaire. ».
 * Les étapes doivent rester synchronisées avec le contenu affiché.
 */
export function howToJsonLd(opts: {
  name: string;
  description: string;
  steps: { name: string; text: string }[];
}) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: opts.name,
    description: opts.description,
    inLanguage: "fr-FR",
    step: opts.steps.map((s, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  };
}
