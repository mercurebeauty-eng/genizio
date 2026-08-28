# Règles Globales (Projet Génizio)

Ces règles définissent le comportement attendu pour toutes les IAs travaillant sur le projet Génizio.

### Règle : Intégrité de la Donnée Pédagogique

- **Principe** : La personnalisation du Jumeau Pédagogique (Naya) prime sur le minimalisme de l'interface.
- **Interdit** : Ne jamais proposer de supprimer, tronquer ou hyper-simplifier la collecte de données psychologiques (Talents, Intelligences Multiples, Centres d'intérêt) au nom de la "réduction de friction".
- **Solution** : Si un formulaire est trop lourd, résoudre le problème par l'UX (Progressive Disclosure, gamification de l'onboarding, interface conversationnelle) mais conserver le même niveau d'exigence dans la donnée collectée.

### Règle : Symétrie d'Accès Pédagogique (Mentor / Parent)

- **Principe** : Lorsqu'un mentor est assigné à un enfant (en tant que Superviseur), il dispose d'un accès administrateur pédagogique de bout en bout pour pallier l'indisponibilité du parent.
- **Interdit** : Ne jamais brider, masquer ou restreindre les interfaces de gestion, de création d'escouades ou de défis au mentor sous prétexte qu'il n'est pas le parent.
- **Solution** : Dans le code UI, s'assurer que les rôles Mentor peuvent interagir avec les mêmes leviers pédagogiques que les Parents (ex: pas de masquage !mentorMode sur les espaces génératifs).

### Règle : Continuité Individuel ↔ Collectif

- **Principe** : Les espaces personnels (défis individuels) et collectifs (projets de guilde, fablabs) ne sont pas des silos isolés.
- **Mise en pratique** : Le collectif sert d'environnement expérimental pour éprouver les hypothèses diagnostiques individuelles (par ex: valider en autonomie un pic non consolidé détecté en groupe). Inversement, les dynamiques de groupe s'appuient sur les observations de l'individu (taille optimale du groupe, tolérance à l'ambiguïté) pour maximiser l'engagement.