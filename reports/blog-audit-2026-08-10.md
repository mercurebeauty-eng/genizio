# Blog Audit — Génizio (actualisé après corrections)

**Date d'audit :** 2026-08-10 — **Mise à jour :** 2026-08-10 (post-corrections)
**Source :** routes `src/routes/guides.*.tsx` (**17 articles** + index)
**Domaine :** https://www.genizio.com

---

## Tableau de bord

| Métrique                                     | Avant    | Après                |
| -------------------------------------------- | -------- | -------------------- |
| Articles                                     | 13       | **17**               |
| Score moyen                                  | 87,7/100 | **~89/100**          |
| Articles 90+                                 | 6        | **8**                |
| Articles 70–89                               | 7        | 9                    |
| Articles < 70                                | 0        | 0                    |
| Articles sans liens sortants (impasses)      | 5        | **0**                |
| Bugs de rendu (`**` littéraux)               | 1        | **0**                |
| Fautes (« kinezthésique »)                   | 3        | **0**                |
| Titres > 60 caractères                       | 5        | **0**                |
| Ancres incohérentes « 30/24 activités »      | 5        | **0**                |
| Liens internes cassés                        | 0        | 0                    |
| Contenus obsolètes                           | 0        | 0                    |
| Pages indexables avec titre court            | 2        | **0**                |
| Pages d'appli bloquées robots (sans noindex) | 3        | **0** (noindex posé) |
| Page indexable à faible contenu (/a-propos)  | 1        | **0** (enrichie)     |

---

## Corrections appliquées (dans ce dépôt, prêtes à déployer)

### 1. Urgences qualité

- ❌→✅ Bug d'affichage : astérisques markdown `**` remplacés par `<strong>` dans `fratrie-rivalite-cooperation.tsx`
- ❌→✅ Faute « kinezthésique » → « kinesthésique » (autonomie, enfant-agite, fratrie)
- ❌→✅ Ancres « 30 activités » → « 24 activités » (index + 5 liens internes) — cohérence du mot-clé

### 2. SEO on-page (5 titres > 60 caractères → tous ≤ 60)

| Article     | Ancien titre (long.) | Nouveau titre                                                      |
| ----------- | -------------------- | ------------------------------------------------------------------ |
| fratrie     | 77                   | « Rivalité frères et sœurs : les transformer en coopération » (57) |
| orientation | 75                   | « Faire découvrir les métiers à son enfant dès 10 ans » (51)       |
| autonomie   | 70                   | « Rendre son enfant autonome sans crier (6-12 ans) » (48)          |
| ecrans      | 67                   | « Réduire les écrans sans crise : 3 alternatives (6-12 ans) » (57) |
| timidité    | 61                   | « Enfant timide : 4 activités pour libérer la parole (6-12) » (57) |

### 3. Maillage interne (impasses supprimées)

- Blocs « À lire ensuite » ajoutés aux 5 articles en impasse (ecrans, timidité, autonomie, orientation, fratrie) → 2-4 liens sortants chacun
- Liens croisés clusters : decrochage ↔ timidité (confiance) ; potentiel ↔ afrique (potentiel)
- 4 articles existants relient désormais vers les nouveaux (enfant-agite → colère ; decrochage → réussite ; activites/ecrans → manuelles)

### 4. Re-ciblage du mot-clé `defis-pour-adolescents`

- Requête artificielle « quels défis proposer à un adolescent » → **« Motiver un adolescent »**
- Titre, H1, meta description, schéma Article et ancres internes (6 liens) alignés sur « Motiver un adolescent : 12 défis qui marchent (12-16 ans) »

### 5. Nouveaux articles (gaps à volume comblés)

| Article                                                | URL                                       | Mot-clé ciblé                   |
| ------------------------------------------------------ | ----------------------------------------- | ------------------------------- |
| Activités manuelles pour enfants : 15 idées (4-12 ans) | /guides/activites-manuelles-enfant        | « activités manuelles enfants » |
| Discipline positive : éduquer sans crier ni punir      | /guides/discipline-positive-sans-punition | « discipline positive »         |
| Gérer la colère de son enfant : 5 outils               | /guides/gestion-colere-emotions-enfant    | « colère enfant / émotions »    |
| Aider son enfant à réussir à l'école sans pression     | /guides/reussite-scolaire-aider-enfant    | « réussite scolaire enfant »    |

Intégration complète : index `/guides`, sitemap.xml (24 URLs), llms.txt (17 guides), images OG de marque générées (1376×768), schémas Article + FAQPage + Breadcrumb, 3-4 FAQ autonomes chacun.

### 6. Alertes Ubersuggest traitées

- **3 pages bloquées** (nouveautes, laboratory, boutique) : retirées du `Disallow` robots.txt → `<meta name="robots" content="noindex, follow">` posé sur chacune (bonne pratique : le crawler voit la directive au lieu d'une page « bloquée » ; les espaces sensibles — admin, profiles, auth — restent bloqués au niveau robots)
- **3 pages faible contenu** : `/a-propos` enrichie (mission, méthode, limites, périmètre — ~2× plus de texte) ; nouveautes/laboratory déclarées noindex (non-indexables)
- **2 titres trop courts** : « À propos — Génizio » (19) → « À propos de Génizio — révéler les talents de votre enfant » (57) ; « Mentions légales — Génizio » (25) → « Mentions légales — Génizio, Abidjan (Côte d'Ivoire) » (48)
- **4 titres trop longs** : les 4 guides concernés sont raccourcis (cf. §2) — visible sur le live après déploiement

### 7. « 4 URLs mal formatées » (Ubersuggest)

Les 4 URLs pointées sont les slugs guides à 4 tirets : `potentiel-haut-potentiel-enfant`, `decrochage-scolaire-confiance-enfant`, `education-enfants-afrique-francophone`, `orientation-scolaire-metiers-avenir`.

**Recommandation : ne pas les renommer.** Ce sont des URLs propres (minuscules, tirets, descriptives), déjà publiées et référencées dans sitemap/llms.txt. Ubersuggest applique un seuil strict (4+ tirets = « mal formatée »), mais la longueur d'URL n'est pas un facteur de classement, et renommer sans redirection serveur 301 (aucune infrastructure de redirect dans ce projet TanStack Start) ferait perdre plus qu'il n'y gagne. Le coût/benefice penche clairement vers le statu quo.

---

## Scores par article (après corrections)

| Article                                           | Total  | Contenu /30 | SEO /25 | E-E-A-T /15 | Technique /15 | Citation IA /15 |
| ------------------------------------------------- | ------ | ----------- | ------- | ----------- | ------------- | --------------- |
| intelligences-multiples-gardner                   | 96     | 28          | 25      | 14          | 14            | 15              |
| decrochage-scolaire-confiance-enfant              | **95** | 28          | 25      | 14          | 14            | 14              |
| potentiel-haut-potentiel-enfant                   | 92     | 28          | 23      | 13          | 14            | 14              |
| activites-educatives-enfant                       | 92     | 28          | 24      | 12          | 14            | 14              |
| enfant-agite-concentration                        | 91     | 27          | 23      | 13          | 14            | 14              |
| ia-apprentissage-enfant                           | 90     | 27          | 22      | 13          | 14            | 14              |
| **reussite-scolaire-aider-enfant** _(nouveau)_    | 90     | 27          | 22      | 13          | 14            | 14              |
| **activites-manuelles-enfant** _(nouveau)_        | 89     | 27          | 22      | 12          | 14            | 14              |
| **discipline-positive-sans-punition** _(nouveau)_ | 89     | 27          | 22      | 12          | 14            | 14              |
| **gestion-colere-emotions-enfant** _(nouveau)_    | 89     | 26          | 22      | 13          | 14            | 14              |
| defis-pour-adolescents (re-ciblé)                 | 88     | 27          | 23      | 11          | 14            | 13              |
| education-enfants-afrique-francophone             | 88     | 27          | 22      | 12          | 14            | 13              |
| timidite-confiance-prise-de-parole                | **88** | 26          | 24      | 12          | 13            | 13              |
| autonomie-responsabilite-maison                   | **88** | 26          | 24      | 12          | 13            | 13              |
| ecrans-addiction-alternatives-enfant              | **85** | 24          | 23      | 12          | 13            | 13              |
| fratrie-rivalite-cooperation                      | **85** | 24          | 24      | 11          | 13            | 13              |
| orientation-scolaire-metiers-avenir               | **84** | 24          | 23      | 11          | 13            | 13              |

---

## File d'action restante

| #   | Priorité       | Action                                                                                          | Statut                   |
| --- | -------------- | ----------------------------------------------------------------------------------------------- | ------------------------ |
| 1   | —              | Déployer les corrections (titres, articles, robots, noindex)                                    | ⏳ à déployer            |
| 2   | 🟡 Moyen       | Renseigner `dateModified` + champ `about` sur les 5 articles utilisant `articleJsonLd`          | à faire                  |
| 3   | 🟢 Stratégique | Confirmer les volumes de mots-clés dans GSC une fois indexé (estimations qualitatives ici)      | à faire après indexation |
| 4   | 🟢 Stratégique | Remplacer les images OG générées par des photos éditoriales (cohérence avec la série existante) | optionnel                |
| 5   | ℹ️ Information | URLs à 4 tirets : conservées (pas de redirect serveur dispo) — voir §7                          | décision prise           |

---

## Santé technique (après corrections)

| Élément        | Statut                                                                                                                  |
| -------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Sitemap        | ✅ 24 URLs, XML valide, les 17 guides présents                                                                          |
| robots.txt     | ✅ Vitrine ouverte ; app pages en noindex méta ; espaces sensibles toujours bloqués                                     |
| llms.txt       | ✅ 17 guides listés (avant : 7)                                                                                         |
| Schémas        | ✅ Article + FAQPage + Breadcrumb sur les 17 guides ; Organisation/WebSite sur tout le site                             |
| Images OG      | ✅ 17 images présentes (13 photos + 4 générées, 1376×768)                                                               |
| TypeScript     | ✅ 0 erreur sur les fichiers édités (2 erreurs pré-existantes dans `profiles.$profileId.portfolio.tsx`, hors périmètre) |
| Liens internes | ✅ 0 cassé — le graphe relie les 17 guides entre eux                                                                    |

---

## Notes

- `SKIPPED: credentials unavailable` — pas d'accès GSC/GA4 : les volumes de mots-clés restent des estimations qualitatives.
- L'analyseur canonique `scripts/analyze_blog.py` n'existe pas dans ce dépôt ; scores issus d'une revue manuelle sur la grille du skill blog-audit.
