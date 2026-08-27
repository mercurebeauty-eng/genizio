---
name: seo-aeo-geo-content-architect
description: >-
  Architecte de contenu d'élite combinant SEO Google (Search Essentials, E-E-A-T, Structured Data), AEO (Answer Engines / PAA), GEO (Citations LLM : Perplexity, SearchGPT, Gemini) et la pédagogie bienveillante de Génizio (Gardner, reframing, défis 10 min, Afrique francophone & Diaspora).
---

# SEO / AEO / GEO Content Architect — Le Standard d'Élite Génizio

Ce skill constitue la référence absolue pour concevoir, rédiger, structurer et auditer les guides, dossiers et articles de **Génizio**. Il fusionne l'intégralité des directives officielles de **Google Search Central** (Search Essentials, E-E-A-T, Helpful Content System, Structured Data), les impératifs d'extraction des **moteurs de réponse (AEO)** et **moteurs génératifs (GEO)**, avec l'ADN pédagogique et psychologique unique de Génizio.

---

## 1. Fondations Techniques & Directives Officielles Google (Search Central)

Tout contenu produit doit respecter rigoureusement les prérequis techniques et qualitatifs édictés par Google Search Central :

### A. Rendu, Crawlability & Indexation
1. **Rendu SSR / Server-Rendered HTML** : Le contenu textuel, les balises `<head>`, la hiérarchie H1-H3 et les scripts JSON-LD doivent être injectés dans le DOM HTML initial (crawlers IA et Googlebot n'attendent pas l'exécution asynchrone complexe).
2. **URL Canonique Absolue & Propre** : Chaque article déclare sa balise `<link rel="canonical" href="https://www.genizio.com/guides/<slug>" />`.
3. **Hiérarchie Sémantique Stricte** :
   - Un unique `<h1>` décrivant l'intention principale.
   - Des `<h2>` formulés sous forme d'interrogations ou d'intentions réelles formulées par les parents.
   - Des balises sémantiques HTML5 : `<article>`, `<header>`, `<nav aria-label="Fil d'Ariane">`, `<section>`, `<footer>`.

### B. E-E-A-T (Expérience, Expertise, Autorité, Confiance)
* **Expérience & Expertise** : Signature obligatoire de l'auteur (`Cheick Mohamed TRAORE`, Directeur Pédagogique) avec lien vers `/a-propos` et encart bio E-E-A-T visuel.
* **Information Gain** : Chaque guide doit apporter une valeur incrémentale introuvable ailleurs (mise en situation réelle à la maison, ancrage culturel Afrique francophone / Diaspora, cadre des 9 intelligences de Gardner).
* **Fraîcheur & Précision** : Dates de publication (`datePublished`) et de révision (`dateModified`) explicites au format ISO 8601.

---

## 2. Matrice des Données Structurées (Schema.org / Google Search)

Google distingue formellement les types de schémas. Tout abus ou mauvais choix disqualifie la page :

| Type de Schéma | Éligibilité Google & Usage | Règles Officielles Google |
|---|---|---|
| `Article` / `BlogPosting` | **OBLIGATOIRE sur tous les guides** | Requis : `headline` (max 110 car.), `image` (haute résolution min 1200px, 16:9/4:3/1:1), `datePublished`, `dateModified`, `author` (`Person` avec URL), `publisher` (`Organization` avec logo). |
| `FAQPage` | **OBLIGATOIRE pour le bloc FAQ final** | Requis : liste de questions/réponses officielles fournies par l'éditeur. Utilisé pour AEO, PAA et parsing LLM. |
| `HowTo` | **RECOMMANDÉ pour les Défis Pratiques** | À intégrer lorsque le guide détaille un protocole ou défi concret en 3 à 5 étapes numérotées. |
| `BreadcrumbList` | **OBLIGATOIRE sur toutes les pages** | Hiérarchie : `Accueil > Guides > [Titre de la Catégorie / Guide]`. |
| `QAPage` | ⚠️ **INTERDIT SUR LES GUIDES** | Réservé **exclusivement** aux pages communautaires (1 question d'un internaute + réponses soumises par la communauté). L'utiliser sur un article éditorial est sanctionné par Google. |

---

## 3. Le Triptyque SEO / AEO / GEO

```
                  ┌────────────────────────────────────────┐
                  │          GÉNIZIO CONTENT HUB           │
                  └───────────────────┬────────────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        ▼                             ▼                             ▼
   [ 1. SEO GOOGLE ]            [ 2. AEO MOTEURS ]           [ 3. GEO MOTEURS IA ]
   - Intention de recherche     - Extraits optimisés         - Citations ChatGPT,
   - Balise Title (45-60 car)   - Blocs FAQ autonomes          Claude, Perplexity
   - Meta Desc (120-160 car)    - Réponses "Answer-First"    - Données factuelles
   - Schema Article             - Listes numérotées Step     - Définitions claires
```

### A. SEO (Search Engine Optimization)
- **Title** : 45 à 60 caractères. Axé sur le bénéfice parental sans piège à clics.
- **Meta Description** : 120 à 160 caractères avec verbe d'action et promesse tangible.
- **Maillage Interne** : Minimum 2 à 4 liens contextuels vers d'autres guides, le test de personnalité (`/test-de-personnalite-enfant-talents`), les tarifs ou l'inscription.

### B. AEO (Answer Engine Optimization)
- **Principe "Answer-First"** : Répondre directement à la question dès les 2 premières phrases du paragraphe avant de développer l'explication.
- **FAQ Autonome** : 3 à 6 questions "People Also Ask" dont chaque réponse fait 40 à 70 mots et se comprend parfaitement hors contexte.

### C. GEO (Generative Engine Optimization)
- **Densité d'Information & Citabilité** : Définitions claires, données vérifiables, concepts distincts (les 9 intelligences, le quotient d'actionnabilité, la méthode des petits pas).
- **Entités nommées Schema.org** : Propriétés `about` et `mentions` enrichies d'entités reconnues (Howard Gardner, psychologie cognitive, apprentissage par projet).

---

## 4. L'ADN Pédagogique Génizio (Psychologie & Zéro Culpabilisation)

Le contenu s'adresse aux parents en **Afrique francophone** (Côte d'Ivoire, Sénégal, Cameroun, etc.) et dans la **Diaspora**.

1. **Le Re-framing Systématique (Culpabilité → Fierté)** :
   - Tout comportement perçu comme "dérangeant" (agitation, insolence, distraction, obsession pour le dessin ou les jeux) est réinterprété comme l'expression brute d'une des 9 intelligences d'Howard Gardner.
2. **L'Actionnabilité Immédiate (Défi 10 Minutes)** :
   - Chaque guide doit contenir un exercice pratique réalisable immédiatement à la maison sans matériel coûteux (objets du quotidien, pièces de monnaie, emballages, discussion guidée).
3. **Le Ton Bienveillant & Émancipateur** :
   - Écrire d'égal à égal avec le parent, valoriser son rôle naturel d'éducateur, bannir le jargon culpabilisant ou théorique stérile.
4. **Intégrité de la Donnée Pédagogique** :
   - Ne jamais réduire le potentiel de l'enfant à une étiquette figée ou un score unique.

---

## 5. Modèle de Code d'un Guide Conforme (TypeScript / TanStack Router)

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { GuideLayout } from "@/components/guides/GuideLayout";
import {
  pageMeta,
  jsonLdScript,
  faqPageJsonLd,
  breadcrumbJsonLd,
  articleJsonLd,
} from "@/lib/seo";

const PATH = "/guides/exemple-sujet-enfant";

const FAQ = [
  {
    question: "Comment repérer ce talent chez mon enfant au quotidien ?",
    answer: "Observez ses initiatives spontanées pendant ses moments de jeu libre. S'il organise, démonte ou invente des histoires, il exprime directement sa forme d'intelligence dominante.",
  },
];

export const Route = createFileRoute(PATH)({
  head: () => {
    const meta = pageMeta({
      title: "Titre SEO Concis et Percutant (45-60 car.)",
      description: "Description engageante avec proposition de valeur claire (120-160 car.).",
      path: PATH,
      image: "/guides/og-exemple.jpg",
      type: "article",
    });

    return {
      ...meta,
      scripts: [
        jsonLdScript(faqPageJsonLd(FAQ)),
        jsonLdScript(
          breadcrumbJsonLd([
            { name: "Accueil", path: "/" },
            { name: "Guides", path: "/guides" },
            { name: "Nom du Guide", path: PATH },
          ]),
        ),
        jsonLdScript(
          articleJsonLd({
            headline: "Titre complet de l'article pour Google (max 110 car.)",
            description: "Description détaillée de l'article...",
            path: PATH,
            datePublished: "2026-08-27",
            dateModified: "2026-08-27",
            image: "/guides/og-exemple.jpg",
          }),
        ),
      ],
    };
  },
  component: Guide,
});

function Guide() {
  return (
    <GuideLayout
      eyebrow="Talents & Intelligences"
      title="Titre H1 du Guide"
      intro="Introduction empathique opérant le re-framing positif dès les premières lignes..."
      updated="27 août 2026"
      readingTime="6 min"
      path={PATH}
      related={[
        { label: "Les 9 formes d'intelligence", to: "/guides/intelligences-multiples-gardner" },
      ]}
    >
      <img
        src="/guides/og-exemple.jpg"
        alt="Description contextuelle riche de l'image (1200x630)"
        width="1200"
        height="630"
        loading="lazy"
        decoding="async"
        className="my-6 aspect-video w-full rounded-3xl border border-ink/10 object-cover shadow-lg"
      />

      <h2>Interrogation Parentale Clé (H2)</h2>
      <p>Réponse directe dès les premières phrases (Answer-First)...</p>

      {/* Défi 10 min */}
      <div className="my-8 rounded-2xl border border-brand/20 bg-brand/5 p-6">
        <h3 className="text-xl font-bold text-brand">⚡ Le Défi 10 minutes à la maison</h3>
        <p className="mt-2 text-sm text-ink/80">Description claire des étapes...</p>
      </div>
    </GuideLayout>
  );
}
```

---

## 6. Références Détaillées Disponibles

Pour approfondir chaque volet, consulter les fichiers de référence du skill :
- `references/google-search-essentials.md` : Guide exhaustif des exigences Google Search Central, E-E-A-T et Helpful Content.
- `references/structured-data-mastery.md` : Guide complet Schema.org (Article vs QAPage vs FAQPage vs HowTo).
- `references/aeo-geo-citability-playbook.md` : Stratégies de citation pour IA générative (ChatGPT, Perplexity, Gemini).
- `references/genizio-pedagogy-dna.md` : Psychologie parentale, Gardner et adaptation culturelle Afrique / Diaspora.
