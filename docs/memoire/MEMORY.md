# 📚 Mémoire Génizio

> Avant de croire le Status Overview ci-dessous, compare sa date à `git log -1` dans le repo.
> S'il y a un commit plus récent que le 2026-07-16, re-vérifie l'état avant d'agir.

## Fichiers de Mémoire
- [Vision](genizio_vision.md) — manifeste produit complet, problème/mission/domaines/rôle de l'IA, non-négociables
- [Décisions](genizio_decisions.md) — chaque choix avec POURQUOI + alternatives rejetées
- [État du Code](genizio_etat_code.md) — snapshot vérifié : stack, mergé vs planifié, changements non commités
- [Backlog](genizio_backlog.md) — tout ce qui est différé, avec pourquoi

## 📊 Status Overview
**Last Updated:** 2026-07-17 | vérifié contre `main` @ `561152e` + modifications non commitées de ce jour
- ✅ Mergé/réel (commit `561152e`) : Dashboard parent, Laboratoire, Mur de célébration, Flux de validation IA, `.env` retiré du suivi git.
- ✅ Corrigé en production (2026-07-16, hors git) : faille RLS sur `child_profiles` qui exposait tous les profils enfants à tous les comptes — voir [[genizio-decisions]] #10. Migration correspondante ajoutée au repo.
- 🟡 En cours, non commité (session du 2026-07-16) : renommage marque Génizio, favicon complet, typographie Fredoka, auth Google-only, séparation marque Génizio / mentor Naya + avatar animé implémenté — voir [[genizio-etat-code]] pour le détail des fichiers touchés.
- 🔵 Conçu mais PAS commencé : Financement/Concours sponsorisés, refonte UI globale (discussion en pause, tentative d'import de wireframe Claude Design bloquée — voir [[genizio-backlog]]).
- 📄 Vision étendue le 2026-07-16 (hors code) : brainstorm utilisateur détaillant l'écosystème complet (Guildes, Kits, Camps, Labs, Centers, Fondation) + spec d'un « Génizio Admin OS » interne + idée de support WhatsApp-first. Intégré à [[genizio-vision]] et [[genizio-backlog]].
- ✅ Session du 2026-07-16 (suite) : une session parallèle de l'utilisateur avait ajouté un mur public "Cerveau Collectif" (posts + tags IA), un flux Naya complet (chat/quest/mentor invite déjà construits mais bruts) et une refonte neo-brutaliste partielle — **le dashboard `/profiles` ne compilait plus du tout** (JSX cassé + `RadarChart` non importé + faux pourcentages). Corrigé, puis neo-brutalisme généralisé à tout l'app (Portfolio/Mentors/Réglages/manage/landing/auth/vue mentor publique), avatar Naya détouré (fond transparent, avant c'était un PNG opaque avec damier peint en dur) + clignement des yeux ajouté en CSS.
- ✅ Boutique de kits Phases 0-3 (2026-07-16/17) : catalogue produits, file de matériaux détectés, badges "Kit disponible" + bloc de commande actionnable sur tous les points chauds du parcours parent (dashboard, cartes de défi fermées/ouvertes, post-génération Labo), page `/boutique` dédiée (kit → génération de défi), table `orders` + suivi admin, `WhatsAppFAB` global. Voir [[genizio-decisions]] #12-14, #17-19, [[genizio-backlog]] pour Phase 4 (paiement in-app) restante.
- ⚠️ Bugs trouvés et corrigés en marge (pas demandés, découverts en testant/auditant) : double-insertion de défi fantôme à chaque prévisualisation Labo, listes d'enfants mélangeant les familles (policy RLS publique trop large), `types.ts` jamais régénéré après la migration `supervisors`. Voir [[genizio-decisions]] #13, #19. Le 2026-07-17, fermeture de la dette ownership : faille RLS `child_mentors` (n'importe quel compte pouvait s'auto-inviter mentor d'un enfant arbitraire) corrigée en prod + ownership explicite ajouté aux 4 routes `/profiles/$profileId/*` + `WhatsAppFAB` contextualisé — voir [[genizio-decisions]] #20. Tout committé (`67575f0`).
- ✅ Audit d'intégrité fonctionnelle complet (2026-07-17, `/functional-integrity-architect`) : Mur Public entièrement fictif supprimé (vrai état vide), 5 `window.confirm()` bannis (nouveau `ConfirmDialogHost`), code mort Lovable retiré, 2 vrais échecs de contraste WCAG AA corrigés à la source (`--leaf` + `WhatsAppFAB`, vérifiés via résolution OKLCH réelle, pas du texte-matching), 2 éléments sans indicateur de focus clavier corrigés, pages `/terms` `/privacy` `/mentions-legales` créées avec du contenu réel (entrepreneur individuel Cheick Mohamed TRAORE, marchés Sénégal/Côte d'Ivoire/France) + footer/auth reliés + badge "Consentement" mensonger remplacé par un vrai comptage. Voir [[genizio-decisions]] #21 pour le détail complet, [[genizio-backlog]] pour 2 items signalés mais non corrigés (likes/commentaires du Mur Public non fonctionnels). Committé (`5d1ad77`, `396a0a2`, `f4b47e7`). Aucune dette de ce type restante en mémoire à ce jour.

## 💡 Key Principles (Ne PAS Oublier)
1. L'enfant au centre, mais le parent aux commandes (Validation Parentale).
2. Gamification intelligente (Pas de MVP bâclé, de la belle UI/UX premium).
3. **Naya** (pas "l'IA" générique) observe et parle aux enfants — jamais un professeur qui note. **Génizio** est la marque/plateforme, distincte de Naya (cf. [[genizio-decisions]] #9, [[genizio-vision]]).
4. La marque s'écrit **Génizio** avec accent (jeu de mots avec "génie") dans tout texte affiché ; les identifiants techniques (ids DOM, noms de fichiers) restent sans accent.
5. L'utilisateur est exigeant sur le rendu visuel — évite le générique "AI-generated feel" ; quand un asset de marque réel (logo, police) est disponible, demande-le plutôt que d'improviser une approximation.
6. **Vérifie `.gitignore` avant toute opération git impliquant des secrets** — `.env` a été commité et poussé sur GitHub pendant des semaines avant d'être remarqué (cf. [[genizio-decisions]] #10, [[genizio-backlog]]). Réflexe à avoir : `git ls-files | grep -x ".env"` en début de session si des clés API sont en jeu.
7. **Ne jamais faire confiance à une policy RLS sans lire `pg_policies` directement** — le code des migrations dans le repo peut diverger de l'état réel en base (migrations non appliquées, policies modifiées manuellement). Vérifier via requête SQL directe avant d'affirmer qu'une table est protégée.

## 🧭 Boussole Workflow
| Situation | Skill/outil à invoquer |
|---|---|
| "Faut-il construire cette feature ?" | product-intelligence-architect |
| "Refonte d'interface" | vercel-product-design / ui-ux-pro-max |
| "Ça ne marche pas / bug" | functional-integrity-architect |
| "Modifier du code existant sans casser" | evolution-first-engineer |
| "Où en est-on ? / reprise de session" | relire ce fichier + `git status` + `git log -1` avant toute affirmation |

## 📝 Notes Générales
**User Preferences :** Exige une UI/UX premium ("je veux pas de mvp, un site developper"), aime la gamification et l'itération. Pose des questions de clarification (via AskUserQuestion) plutôt que de deviner sur les décisions de marque/branding ambiguës — l'utilisateur valide ce type de choix explicitement.
**Project Context :** TanStack Start, React, Tailwind, Supabase, **API Anthropic directe** (Claude Sonnet 5 vision / Claude Haiku 4.5 texte — pas Gemini/Lovable, corrigé le 2026-07-16, cf. [[genizio-decisions]] #3). Machine de dev sans `bun` installé — utiliser `npm` pour les installs.
