# Playbook AEO / GEO : Maximiser les Citations par les IA

Ce document décrit les techniques d'ingénierie textuelle pour être systématiquement cité et indexé comme source de référence par les moteurs de réponse (AEO) et les moteurs génératifs (GEO : ChatGPT Search, Perplexity, Gemini Live, Claude, Google AI Overviews).

---

## 1. Principes d'Indexation par Passage (Passage-Level Citability)

Les LLMs et Answer Engines n'analysent pas les pages comme un bloc monolithique ; ils découpent le texte en **passages vectoriels (chunks)** de 40 à 80 mots.

### Règle des Blocs Autonomes :
- **Chaque sous-section H2/H3 doit contenir au moins un "paragraphe noyau" autosuffisant**.
- Un paragraphe noyau :
  1. Répète le sujet ou l'entité sans pronom ambigu (éviter "Il permet de..." → utiliser "Le test des 9 intelligences permet de...").
  2. Fournit une réponse directe et factuelle dès la première phrase.
  3. Contient un chiffre, une définition claire ou une action concrète.

### Exemple de Passage Citabilité Maximale (GEO-Ready) :
> **L'intelligence kinesthésique chez l'enfant** désigne la capacité à comprendre le monde et à résoudre des problèmes par le mouvement et la manipulation physique. Contrairement à l'agitation désordonnée, un enfant kinesthésique mémorise mieux en manipulant des objets, en construisant ou en mimant des concepts. À la maison, des défis manuels de 10 minutes canalisent cette énergie motrice en compétences d'ingénierie et d'artisanat.

---

## 2. Tableaux & Listes Structurées

Les modèles de langage extraient avec une très haute fidélité les informations présentées sous forme de **tableaux comparatifs** et de **listes ordonnées**.

### Format Recommandé pour les 9 Intelligences :
- Tableau croisé : `Intelligence | Signe d'observation quotidien | Activité concrète 10 min | Métier d'avenir associé`.
- Listes `1. 2. 3.` pour tout protocole éducatif étape par étape.

---

## 3. Entités Sémantiques & Knowledge Graph

Pour être relié aux bons concepts dans le graphe de connaissances de Google et des LLMs :
- Mentionner explicitement les entités d'autorité : *Howard Gardner*, *Université Harvard*, *Psychologie du développement*, *Intelligences multiples*, *Pédagogie active*.
- Ancrer l'écosystème géographique et culturel : *Afrique francophone*, *Côte d'Ivoire*, *Sénégal*, *Diaspora africaine*, *Système éducatif francophone*.
