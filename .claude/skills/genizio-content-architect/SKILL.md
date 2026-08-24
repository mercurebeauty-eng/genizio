---
name: genizio-content-architect
description: >-
  Architecte de contenu SEO, AEO et GEO pour Génizio. Permet de générer ou d'enrichir des guides pédagogiques et articles à fort engagement parental (psychologie comportementale, intelligences multiples, zéro culpabilisation) tout en évitant strictement les doublons avec le contenu existant.
---

# Génizio Content Architect (SEO / AEO / GEO & Psychologie Parentale)

Ce skill définit la méthode officielle pour rédiger, structurer et générer du contenu hautement performant pour le blog et la section des guides de **Génizio**.

## 1. Protocole Anti-Doublons (Audit Préalable Obligatoire)

Avant TOUTE génération de nouveau contenu :

1. **Inspection des routes existantes** : Scanner la liste des fichiers dans `src/routes/guides.*.tsx` et `public/sitemap.xml`.
2. **Vérification du sujet** : S'assurer que le sujet proposé ne traite pas d'un angle déjà couvert à plus de 40 %.
3. **Différenciation de l'angle** : Si le sujet s'approche d'un article existant, trouver une inclinaison spécifique (ex. par tranche d'âge, par forme d'intelligence ou par situation de crise quotidienne).

---

## 2. Piliers Psychologiques & Ton Éditorial

Le public cible est composé de parents en **Afrique francophone** et dans la **Diaspora**.

- **Règle n°1 : Le Re-framing (Culpabilité → Fierté)**  
  Un comportement dit "problématique" chez l'enfant (ex: agitation, contestation, timidité, obsession par les jeux) doit TOUJOURS être ré-interprété à la lumière des 9 intelligences de Howard Gardner.
  - _Exemple :_ L'agitation devient de l'intelligence kinezthésique ; la contestation devient de l'intelligence verbale-logique.
- **Règle n°2 : L'Identité Parentale Inspirante**  
  Le parent lit pour se rassurer et renforcer son sentiment de compétence. Le ton est chaleureux, bienveillant, d'égal à égal, sans jargon pédant ni leçons de morale.
- **Règle n°3 : L'Actionnabilité Immédiate (10 minutes)**  
  Chaque article doit proposer au moins 1 à 3 mini-défis simples à réaliser le soir même à la maison avec du matériel du quotidien (bouteilles, feuilles, monnaie, conversation).
- **Règle n°4 : Zéro Pay-To-Win & Intégrité Pédagogique**  
  Aucune réussite ne s'achète. L'application Génizio valorise uniquement l'action réelle de l'enfant.

---

## 3. Exigences Techniques (SEO / AEO / GEO)

- **SEO (Google/Bing)** :
  - `<h1>` unique et accrocheur.
  - Balises `<h2>` formulées sous forme de questions ou requêtes de longue traîne réelles.
  - Densité d'information élevée, mots-clés naturels intégrés dans le corps de texte.
- **AEO (Moteurs de Réponse / Extraits Optimisés)** :
  - Présence obligatoire d'un bloc `FAQ` avec des réponses autonomes (3 à 5 phrases par réponse).
  - Listes numérotées ou à puces (`HowTo` / listes d'activités).
- **GEO (Génératif / Assistants IA : ChatGPT, Copilot, Perplexity, Gemini)** :
  - Métadonnées Schema.org complètes via `jsonLdScript` : `Article`, `FAQPage`, `BreadcrumbList`.
  - Dates au format ISO 8601 (`datePublished`, `dateModified`).
  - Entité éditrice toujours liée à `ORGANIZATION_JSONLD`.

---

## 4. Boutons de Partage Social & Virabilité WhatsApp

Chaque article utilise la coquille `GuideLayout` qui intègre `SocialShareBar` :

- **WhatsApp** est l'axe prioritaire de partage pour la transmission dans les groupes de parents et de familles.
- Titre optimisé pour le partage : dynamique, intriguant et positif.

---

## 5. Structure Type d'un Article / Guide Génizio

```tsx
import { createFileRoute } from "@tanstack/react-router";
import { GuideLayout } from "@/components/guides/GuideLayout";
import { pageMeta, jsonLdScript, faqPageJsonLd, breadcrumbJsonLd, articleJsonLd } from "@/lib/seo";

const PATH = "/guides/votre-slug-court";

const FAQ = [
  { question: "Question fréquente 1 ?", answer: "Réponse claire et autonome..." },
  { question: "Question fréquente 2 ?", answer: "Réponse..." },
];

export const Route = createFileRoute(PATH)({
  head: () => {
    const meta = pageMeta({
      title: "Titre SEO Accrocheur (max 60 car)",
      description: "Description engageante...",
      path: PATH,
      type: "article",
    });
    return {
      ...meta,
      scripts: [
        jsonLdScript(faqPageJsonLd(FAQ)),
        jsonLdScript(breadcrumbJsonLd([...])),
        jsonLdScript(articleJsonLd({
          headline: "...",
          description: "...",
          path: PATH,
          datePublished: "2026-08-08",
        })),
      ],
    };
  },
  component: Guide,
});

function Guide() {
  return (
    <GuideLayout
      eyebrow="Catégorie"
      title="Titre Principal"
      intro="Introduction empathique qui reformule le problème en opportunité..."
      updated="8 août 2026"
      readingTime="5 min"
    >
      {/* Corps de texte avec classes prose-genizio */}
    </GuideLayout>
  );
}
```
