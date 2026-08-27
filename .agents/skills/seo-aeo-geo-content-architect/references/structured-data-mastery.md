# Maîtrise des Données Structurées Google (Schema.org)

Ce document détaille l'implémentation rigoureuse des données structurées conforme aux spécifications officielles de [Google Search Central](https://developers.google.com/search/docs/appearance/structured-data/intro-structured-data).

---

## 1. Schéma Article & BlogPosting (Obligatoire sur les Guides)

Source officielle : [Google Article Structured Data](https://developers.google.com/search/docs/appearance/structured-data/article?hl=fr)

Les guides de Génizio sont des articles de fond (dossiers parentaux, guides éducatifs). Ils relèvent du type `Article` ou de son sous-type `BlogPosting`.

### Propriétés Requises & Recommandées par Google :

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Titre explicite de l'article (max 110 caractères selon les consignes Google)",
  "description": "Résumé informatif du guide (120 à 160 caractères)",
  "image": [
    "https://www.genizio.com/guides/og-guide-16x9.jpg"
  ],
  "datePublished": "2026-08-27T08:00:00+00:00",
  "dateModified": "2026-08-27T09:30:00+00:00",
  "mainEntityOfPage": {
    "@type": "WebPage",
    "@id": "https://www.genizio.com/guides/mon-guide-enfant"
  },
  "inLanguage": "fr-FR",
  "author": {
    "@type": "Person",
    "name": "Cheick Mohamed TRAORE",
    "jobTitle": "Directeur Pédagogique & Fondateur",
    "url": "https://www.genizio.com/a-propos"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Génizio",
    "url": "https://www.genizio.com",
    "logo": {
      "@type": "ImageObject",
      "url": "https://www.genizio.com/web-app-manifest-512x512.png"
    }
  }
}
```

### Règles Cruciales Google pour les Images d'Articles :
- **Largeur minimale** : 1 200 pixels (indispensable pour l'affichage en grand format dans Google Discover et les carrousels Top Stories).
- **Nombre total de pixels** : Au moins 800 000 pixels.
- **Ratios d'aspect** : Fournir idéalement des formats standards 16:9, 4:3 ou 1:1.
- **Accessibilité** : L'URL de l'image doit être publique, crawlable et indexable par Googlebot-Image.

---

## 2. QAPage vs FAQPage : Règle Fondamentale de Séparation

Source officielle : [Google QAPage Guidelines](https://developers.google.com/search/docs/appearance/structured-data/qapage?hl=fr) & [Google FAQPage Guidelines](https://developers.google.com/search/docs/appearance/structured-data/faqpage?hl=fr)

| Critère | `QAPage` (Interdit sur les Guides) | `FAQPage` (Recommandé sur les Guides) |
|---|---|---|
| **Nature de la page** | Page de forum / Q&A communautaire (ex: Stack Overflow, Quora). | Page éditoriale contenant une liste de questions/réponses écrites par l'auteur. |
| **Nombre de questions** | **Une seule question principale** par page. | **Plusieurs questions** (3 à 10) traitant du sujet du guide. |
| **Auteur des réponses** | Réponses multiples soumises par des **utilisateurs externes**. | Réponses officielles fournies par **l'équipe éditoriale Génizio**. |
| **Règle Google formelle** | ⚠️ *"N'utilisez pas QAPage pour les articles de blog ou les FAQ rédigés par l'éditeur."* | ✅ Recommandé pour structurer les réponses aux "People Also Ask" (AEO/GEO). |

---

## 3. Schéma FAQPage (Pour le Bloc FAQ en bas d'article)

Le balisage `FAQPage` permet aux moteurs de réponse (AEO) et aux assistants d'IA (Perplexity, SearchGPT, Claude, Gemini) d'extraire directement chaque binôme Question/Réponse autonome :

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "inLanguage": "fr-FR",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "Comment repérer les 9 intelligences chez son enfant sans test payant ?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "L'observation directe des activités spontanées de l'enfant pendant 2 à 3 semaines est la méthode la plus fiable. S'il démonte des objets (kinesthésique), dessine des plans (spatial) ou invente des histoires (linguistique), ses dominantes apparaissent clairement."
      }
    }
  ]
}
```

---

## 4. Schéma HowTo (Pour les Défis 10 Minutes à la Maison)

Lorsqu'un guide propose un tutoriel ou défi pratique pas-à-pas, le balisage `HowTo` valorise chaque étape :

```json
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "Défi 10 min : Le Marché des Objets pour développer l'intelligence logico-mathématique",
  "description": "Un atelier pratique simple à faire avec des emballages et de la monnaie à la maison.",
  "inLanguage": "fr-FR",
  "step": [
    {
      "@type": "HowToStep",
      "position": 1,
      "name": "Installation de l'étal",
      "text": "Sélectionnez 5 objets du salon et attribuez-leur un prix symbolique en étiquettes."
    },
    {
      "@type": "HowToStep",
      "position": 2,
      "name": "Calcul du rendu de monnaie",
      "text": "Donnez un budget fictif à l'enfant et demandez-lui de calculer le montant total et la monnaie à rendre."
    }
  ]
}
```

---

## 5. Schéma BreadcrumbList (Fil d'Ariane Sémantique)

Permet à Google d'afficher une navigation hiérarchique claire dans les résultats de recherche :

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    {
      "@type": "ListItem",
      "position": 1,
      "name": "Accueil",
      "item": "https://www.genizio.com/"
    },
    {
      "@type": "ListItem",
      "position": 2,
      "name": "Guides",
      "item": "https://www.genizio.com/guides"
    },
    {
      "@type": "ListItem",
      "position": 3,
      "name": "Intelligences multiples de Gardner",
      "item": "https://www.genizio.com/guides/intelligences-multiples-gardner"
    }
  ]
}
```
