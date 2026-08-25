---
name: seo-engineering-loop
description: >-
  Boucle d'ingénierie SEO fermée en 5 étapes inspirée de la méthode Reddit (168K clics) : Triage GSC anti-cannibalisation (CREATE/IMPROVE/REJECT), Audit sémantique et technique, Porte bloquante pré-déploiement, Vérification live post-déploiement en production, et Boucle de rétroaction GSC/Git (KEEP/ITERATE/REVERT).
---

# SEO Engineering Closed-Loop Skill (Méthode 168K Clics)

Ce skill formalise la méthodologie d'**ingénierie SEO en boucle fermée**. L'objectif n'est jamais de générer du contenu à l'aveugle, mais d'appliquer un cycle d'ingénierie contrôlé basé sur les données réelles de Google Search Console (GSC) et des vérifications strictes avant et après déploiement.

---

## Les 5 Piliers du Workflow

```
[1. GSC Pre-Flight Triage] 
       │ (CREATE / IMPROVE / REJECT)
       ▼
[2. Architecture & Rédaction SEO/AEO/GEO]
       │ (Structure H1-H3, JSON-LD, E-E-A-T)
       ▼
[3. Porte Bloquante Pré-Déploiement]
       │ (10 vérifications automatiques locales)
       ▼
[4. Vérification Live Post-Déploiement]
       │ (Audit du HTML rendu en production)
       ▼
[5. Boucle de Rétroaction GSC & Git]
         (KEEP / ITERATE / REVERT)
```

---

## 1. GSC Pre-Flight Triage (Avant d'écrire du code)

Avant de créer ou modifier une page, vérifier systématiquement :
1. Quelle URL se positionne déjà sur cette intention ?
2. Le mot-clé apporte-t-il une intention de recherche véritablement neuve ?
3. Risque-t-on de cannibaliser une page existante qui performe ?

### Commande de Triage Automatique :
```bash
python scripts/seo/gsc_triage.py "<mot-cle-ou-sujet>" [--angle "<angle-specifique>"]
```

### Grille de Décision :
* `REJECT` (Chevauchement > 75%) : **Arrêt immédiat.** Ne pas créer de page. L'intention est déjà servie.
* `IMPROVE EXISTING` (Chevauchement 40% - 75%) : **Mise à jour prioritaire.** Ajouter une section H2 ou enrichir la FAQ dans la route existante identifiée.
* `CREATE` (Chevauchement < 40%) : **Création autorisée.** Nouvelle route dans `src/routes/guides.<slug>.tsx` avec maillage réciproque obligatoire vers les pages connexes.

---

## 2. Architecture & Rédaction SEO / AEO / GEO

Lors de la rédaction ou mise à jour :

### A. Exigences Techniques
* **TanStack Router Route** : `src/routes/guides.<slug>.tsx`
* **Title** : 45 à 60 caractères, percutant, sans superlatif creux.
* **Meta Description** : 120 à 160 caractères avec proposition de valeur claire.
* **H1 Unique** : Formulé avec l'intention principale.
* **Sections H2** : Formulées sous forme de questions ou de problématiques réelles des parents.
* **Schemas JSON-LD obligatoires** :
  - `Article` / `BlogPosting` (avec `datePublished`, `dateModified`, `author`)
  - `FAQPage` (3 à 5 questions/réponses People Also Ask)
  - `BreadcrumbList` (Accueil > Guides > [Titre])
* **Maillage Interne** : Minimum 2 à 4 liens contextuels vers d'autres guides ou parcours clés (`/guides/...`, `/test-de-personnalite-enfant-talents`, `/tarifs`).

### B. Positionnement Pédagogique (Génizio)
* **Culpabilité → Fierté (Re-framing)** : Réinterpréter les comportements défis via les 9 intelligences de Gardner.
* **Actionnabilité immédiate (10 min)** : Au moins 1 à 3 exercices pratiques à faire à la maison.
* **Intégrité pédagogique** : Pas de promesse irréaliste, ton bienveillant d'égal à égal.

---

## 3. Porte Bloquante Pré-Déploiement (Pre-Flight Gate)

Avant tout commit Git ou mise en ligne, la porte de qualité doit être exécutée. **Tout échec bloque le déploiement.**

### Commandes de Validation :
```bash
# Vérifier un fichier spécifique
python scripts/seo/preflight_gate.py src/routes/guides.<mon-guide>.tsx

# Vérifier tous les fichiers prêts pour le commit (staged)
python scripts/seo/preflight_gate.py --staged

# Vérifier l'ensemble des guides
python scripts/seo/preflight_gate.py --all
```

### Critères Validés par le Gate :
1. ✅ Présence & longueur optimale du Title (30-65 car.)
2. ✅ Présence & longueur optimale de la Description (110-165 car.)
3. ✅ Constante `PATH` valide (`/guides/<slug>`)
4. ✅ Titre principal H1 unique et présent
5. ✅ Hiérarchie H2/H3 cohérente (min 2 H2)
6. ✅ Schemas JSON-LD `Article`, `FAQPage`, `BreadcrumbList`
7. ✅ Présence obligatoire dans `public/sitemap.xml`
8. ✅ Maillage interne présent (≥ 2 liens)
9. ✅ Barre de partage social / WhatsApp
10. ✅ Densité textuelle suffisante (≥ 600-800 mots)

---

## 4. Vérification Live Post-Déploiement (Production Real-HTML)

Ne jamais se fier uniquement au code source local : **Google explore le HTML réellement rendu en production**.

### Commande de Vérification Live :
```bash
python scripts/seo/live_verify.py "https://www.genizio.com/guides/<slug>"
```

### Points d'Inspection en Production :
* **Réponse HTTP 200 OK** (temps de réponse < 2s).
* **Rendu HTML effectif** (Title, Meta Description, Balise Canonique absolue).
* **Directives Robots** : Absence de `noindex` accidentel.
* **Extraction des Données Structurées** : Les scripts JSON-LD doivent être injectés et lisibles par les crawlers dans le DOM initial.

---

## 5. Boucle de Rétroaction GSC & Git (Continuous Feedback Loop)

Après indexation et recueil de données dans Google Search Console, analyser régulièrement les performances pour statuer :

### Commande de Feedback :
```bash
python scripts/seo/feedback_loop.py "/guides/<slug>"
```

### Grille d'Arbitrage :
* `KEEP` : La page est dans le Top 5 ou en croissance continue. **Ne pas toucher à la structure clé.**
* `ITERATE` :
  - **Position 4-10 avec CTR faible (< 3%)** → Réécrire le titre et la meta description pour maximiser le taux de clic.
  - **Position > 15 avec de nombreuses impressions** → Enrichir la profondeur du guide (FAQ PAA, exemples, nouveaux H2).
* `REVERT` : Chute brutale de trafic survenue après un commit récent identifié dans l'historique Git (`git log --patch`).

---

## Configuration & Accès Google Search Console

Pour activer l'interrogation automatique de GSC :
1. Afficher le guide de configuration :
   ```bash
   python scripts/seo/setup_gsc_auth.py --guide
   ```
2. Enregistrer votre clé Service Account :
   ```bash
   python scripts/seo/setup_gsc_auth.py --register "chemin/vers/service_account.json"
   ```
3. Vérifier le statut :
   ```bash
   python scripts/seo/setup_gsc_auth.py --check
   ```
