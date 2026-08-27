# Google Search Essentials & Directives Fondamentales (Google Search Central)

Ce document synthétise l'ensemble des règles fondamentales publiées sur [Google Search Central](https://developers.google.com/search/docs?hl=fr) applicables aux guides et contenus de **Génizio**.

---

## 1. Les 3 Exigences Techniques Google Search

Pour être indexé et positionné par Google, un contenu doit obligatoirement satisfaire 3 conditions techniques :

1. **Googlebot Crawlability (Explorabilité)** :
   - L'URL doit renvoyer un code HTTP `200 OK`.
   - Le fichier `robots.txt` (`/robots.txt`) ne doit bloquer ni le HTML ni les ressources associées (images, CSS critique).
   - L'URL doit être inscrite dans `public/sitemap.xml` avec balise `<loc>` absolue.
2. **Rendu Indexable (Server-Side Rendering)** :
   - Googlebot dispose d'un temps limité pour rendre le JavaScript (Web Rendering Service).
   - Tout le contenu informationnel clé (titre H1, sous-titres H2, corps d'article, liens internes `<a href="...">` et scripts `<script type="application/ld+json">`) doit être présent dans le HTML initial délivré par le serveur.
3. **Canonicalisation Anti-Cannibalisation** :
   - Une seule version canonique officielle par page (`<link rel="canonical" href="https://www.genizio.com/guides/<slug>" />`).
   - Évite la dispersion de popularité entre `genizio.vercel.app`, `genizio.com` et `www.genizio.com`.

---

## 2. Le Système "Helpful Content" & les Critères E-E-A-T (2026)

Google évalue la qualité globale d'un site à travers le prisme **E-E-A-T** (Experience, Expertise, Authoritativeness, Trustworthiness) :

### A. Experience (Expérience Vécue)
- Le contenu démontre une confrontation réelle au terrain : retours d'observation d'enfants à la maison, situations familiales concrètes, témoignages vérifiables.
- Pas de réécriture superficielle de synthèses Wikipédia.

### B. Expertise (Compétence & Savoir)
- Référence explicite aux théories neuro-pédagogiques solides (cadre des 9 intelligences de Howard Gardner, psychologie cognitive du développement).
- Signature systématique par un auteur identifiable : `Cheick Mohamed TRAORE`, Concepteur pédagogique et fondateur.

### C. Authoritativeness (Autorité & Notoriété)
- Graphe d'entité interconnecté dans Schema.org reliant l'organisation `Génizio` (`https://www.genizio.com/#organization`) et l'auteur à ses domaines de compétence (`knowsAbout`).
- Citations et liens naturels par la communauté et les réseaux de parents (WhatsApp, associations, éducateurs).

### D. Trustworthiness (Confiance & Sécurité)
- Transparence sur le modèle économique (pas de pay-to-win, sécurité des données des mineurs).
- Exactitude factuelle, pas de promesses magiques ou anxiogènes.
- Mentions légales, politique de confidentialité, coordonnées de contact claires (`contactPoint` WhatsApp).

---

## 3. Notion d'Information Gain (Gain d'Information Incrémental)

Google valorise les pages qui apportent une **valeur ajoutée unique** par rapport aux 10 premiers résultats de recherche existants :
- **Ne pas répéter ce que tout le monde dit** : Si tous les sites expliquent la théorie de Gardner avec des définitions abstraites, Génizio apporte immédiatement :
  1. La traduction en **signes observables au quotidien** sans écran.
  2. Le **re-framing** déculpabilisant (l'agitation = énergie motrice à canaliser).
  3. Le **défi 10 minutes à la maison** adapté au contexte des familles d'Afrique francophone et de la diaspora.

---

## 4. Règles Anti-Spam de Google Search

Tout contenu Génizio doit strictement proscrire :
- ❌ **Le bourrage de mots-clés (Keyword Stuffing)** : Répétition artificielle d'expressions exactes.
- ❌ **Le contenu généré sans valeur humaine (Thin Content)** : Textes générés par IA non relus, verbeux et sans substance concrète.
- ❌ **Les données structurées trompeuses** : Baliser du contenu non visible par l'utilisateur ou utiliser un schéma non approprié (ex: `QAPage` au lieu d'`Article`).
- ❌ **Les titres pièges à clics (Clickbait)** : Disparité entre la promesse du titre et le contenu réel.
