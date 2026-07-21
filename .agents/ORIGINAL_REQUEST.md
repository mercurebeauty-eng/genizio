# Original User Request

## 2026-07-21T09:23:18Z

# Teamwork Project Prompt — Draft

> Status: Ready for launch — awaiting user approval
> Goal: Craft prompt → get user approval → delegate to teamwork_preview

Vérifier et mettre à jour les prompts système de Naya (l'IA génératrice de défis) pour garantir qu'elle exploite les nouveaux "moteurs comportementaux" (le champ `interests` du profil) afin de personnaliser au maximum la narration et les mécaniques des défis.

Working directory: C:\Users\USER\Documents\GENIZIO\
Integrity mode: demo

## Requirements

### R1. Audit de l'Injection de Données
S'assurer que la fonction générant l'appel à l'IA (vraisemblablement dans `src/lib/challenges.functions.ts` ou dans une Supabase Edge Function) injecte explicitement le tableau `childProfile.interests` dans le contexte du prompt envoyé au modèle.

### R2. Réécriture du Prompt de Naya
Réécrire le prompt système de Naya pour y inclure une directive forte sur l'utilisation des "centres d'intérêts" : elle ne doit pas les traiter comme de simples hobbies, mais comme des **moteurs comportementaux profonds** (ex: si l'enfant "démonte pour comprendre", le défi doit impliquer de la déconstruction et de l'analyse logique).

### R3. Contrainte Technique
Ne modifier QUE les strings de prompts et l'injection de contexte. Ne pas modifier l'architecture de la base de données, l'interface utilisateur, ni la logique métier de l'application en dehors de la génération de défi.

## Acceptance Criteria

### Vérification du Code
- [ ] Le code d'appel à l'IA concatène ou inclut clairement les `interests` dans la charge utile (payload).
- [ ] Le texte du prompt système a été mis à jour avec des instructions spécifiques sur la psychologie comportementale de l'enfant.

### Intégrité du Projet
- [ ] `npx tsc --noEmit` passe sans aucune erreur.
- [ ] Aucune table Supabase ou composant React n'a été altéré.

---
*Next: when approved → delegate via invoke_subagent (see Delegation Protocol)*
