---
name: genizio-backlog
description: Fonctionnalités futures et chantiers différés — purgé et aligné avec les décisions récentes
metadata:
  type: project
  status: living-document
  last_updated: 2026-08-24
---

# 📋 Backlog Génizio (Épuré & Aligné)

> Ce backlog ne contient que des chantiers **non démarrés** ou **différés**. Tout ce qui a été livré a été migré dans `genizio_decisions.md` et `MEMORY.md`.

---

## 1. 💳 Commerce & Monétisation

- **Boutique de Kits — Phase 4 (Paiement Mobile Money in-app)** :
  - *État actuel* : Les phases 0 à 3 sont en production (catalogue, suggestions contextuelles IA, suivi admin `orders`, redirection WhatsApp).
  - *Reste à faire* : Intégration d'une passerelle de paiement direct (Paystack Mobile Money / Wave) pour automatiser le paiement des kits physiques sans passer par WhatsApp lorsque le volume le justifiera.
- **Cadeau Boutique Mentor (Palier Or 60 pts — décision #79 différé)** :
  - *État actuel* : Le palier de confiance et le bonus financier (+10 % de payout) sont opérationnels.
  - *Reste à faire* : Automatiser l'envoi d'un bon d'achat ou d'un kit boutique via la table `orders` lors de l'atteinte des 60 points.

---

## 2. 🤝 Partenariats, Échelle & B2B (ONG / Écoles)

- **Gestion des codes d'activation Mentor à l'échelle (décision #80 différé)** :
  - *État actuel* : L'activation par code unitaire et la vérification atomique sont en place.
  - *Reste à faire* : Outil d'export en masse (CSV) pour les cohortes ONG, dates d'expiration paramétrables et révocation de certification ciblée.
- **Extension des Rôles Institutionnels** :
  - *État actuel* : Rôles actifs = Parent, Enfant, Mentor (remplaçant parent), Admin, ONG/Campagnes.
  - *Reste à faire* : Définir si des rôles spécifiques *École / Enseignant* ou *Fondation* doivent être ajoutés ou s'ils utilisent les flux Mentor / Campagnes existants.

---

## 3. 📱 Expérience Mobile & Technique

- **Application Mobile Native (Capacitor / Stores)** :
  - *État actuel* : PWA moderne avec Service Worker (Web Push VAPID, synchronisation hors-ligne, compression locale des photos HEIC).
  - *Reste à faire* : Packaging natif iOS/Android si besoin d'un accès encore plus direct à l'appareil photo ou d'une présence sur les stores.
- **Rotation de sécurité `ANTHROPIC_API_KEY`** :
  - *Reste à faire* : Renouveler la clé d'API sur Anthropic Console par précaution d'hygiène de sécurité (suite à un commit initial retiré du suivi git).
