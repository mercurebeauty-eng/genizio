# Référentiel académique par domaine × âge — v2, sourcé par recherche web

> ✅ **Câblé le 2026-07-20 (décision #38)** — le contenu ci-dessous (condensé) est injecté dans
> les prompts de génération de défis (`ACADEMIC_REFERENTIAL_INSTRUCTION`,
> `src/lib/challenges.functions.ts`) et sert de base au nouveau déclencheur Phase 3
> (`ensureHypothesesForChild`, écart de 4 défis consécutifs). La colonne **Source / confiance**
> ci-dessous reste la référence pour juger la fiabilité de chaque repère — un repère marqué
> "estimation raisonnée non vérifiée" peut donc influencer une vraie investigation Phase 3 ou le
> calibrage d'un défi ; à garder en tête pour une future passe de vérification plus complète.

## 0. Pourquoi ce document (cf. décision #37)

Remplace les notes scolaires comme signal de calibrage — une note n'a pas de référentiel
stable (l'enfant change de classe/école/pays d'une année à l'autre, le système ne connaît
aucun programme). Ici, Génizio définit son **propre** référentiel, indépendant de l'école
réelle de l'enfant, délibérément calé sur des standards internationaux exigeants plutôt que
sur la moyenne locale — l'objectif énoncé est de "relever le niveau des enfants des zones
africaines", pas de refléter ce qu'une école particulière couvre effectivement.

**Extension du 2026-07-20 (décision #39)** : à la demande explicite de l'utilisateur ("faut que
ça prenne en compte tout"), la portée a été étendue de 3 à 8 des 9 intelligences Gardner —
mathématiques/logique, langage, sciences (§1-3), corporelle, sociale, émotionnelle,
entrepreneuriale, artisanale, spatiale (§4-9). Chaque nouveau domaine a une source réelle
identifiée, mais avec des niveaux de confiance très inégaux (organismes officiels type
Common Core/NGSS/SHAPE America pour certains, littérature de recherche ou organismes privés
pour d'autres — toujours précisé colonne par colonne). **Créative (§10) est la seule exclusion
volontaire** : la recherche montre un développement non linéaire (creux normaux à certains
âges) incompatible avec le mécanisme "plus bas que l'attendu = en retard" de ce document —
pas un trou de données, un refus assumé de fabriquer un mécanisme trompeur.

**Conversion âge → niveau scolaire** utilisée ci-dessous (convention américaine — Kindergarten
à 5 ans, Grade 1 à 6 ans, etc.) : c'est un choix de modélisation, pas un fait universel — l'âge
d'entrée à l'école varie réellement d'un pays à l'autre (souvent 6 ans plutôt que 5 hors
USA/Canada). À garder en tête si ce référentiel sert un jour à comparer des enfants de systèmes
scolaires différents.

**Correction importante trouvée en sourçant** : l'exemple donné à l'origine de ce chantier —
*"un enfant de 5 ans devrait connaître sa table de multiplication par 5"* — est en fait plus
précoce que ce qu'aucun des trois référentiels vérifiés ci-dessous n'exige réellement. Le repère
le plus exigeant trouvé (Singapour, Chine) place l'introduction formelle de la multiplication à
**7 ans (Grade 2)**, avec mémorisation complète des tables à un chiffre vers **8 ans (Grade 3)**.
Je le signale explicitement plutôt que de forcer les chiffres pour coller à l'exemple d'origine.

## 1. Mathématiques / Logique

| Âge | Repère attendu | Source / confiance |
|---|---|---|
| 4 ans | Compte et reconnaît les nombres jusqu'à ~10-20, notions de quantité ("plus/moins") sur des objets visibles. | Non sourcé — avant l'entrée dans les référentiels formels (Common Core démarre à 5 ans/Kindergarten). Développemental général, à vérifier. |
| 5 ans (Kindergarten) | Connaît les noms des nombres et la suite numérique, compte jusqu'à 100 par 1 et par 10, écrit les nombres de 0 à 20. | **Sourcé** — Common Core Mathematics, Kindergarten (thecorestandards.org). |
| 6 ans (Grade 1) | Addition/soustraction dans les nombres jusqu'à 20, résolution de petits problèmes concrets à une étape. | Estimation raisonnée (structure générale Grade 1), non vérifiée précisément cette passe. |
| 7 ans (Grade 2) | Approfondit la numération en base 10, fluidité addition/soustraction, unités de mesure standard, figures géométriques (les 4 axes officiels du niveau). Tables de multiplication 2, 3, 4, 5 et 10 mémorisées (Singapour). En Chine, la multiplication est introduite formellement à cet âge (Grade 2, 1er semestre). | **Sourcé** — Common Core Grade 2 (4 focus areas cités), Singapore Math scope and sequence, curriculum chinois (Nord Anglia Education). |
| 8 ans (Grade 3) | Fluidité de multiplication/division dans les nombres jusqu'à 100 ; **toutes les tables à un chiffre (2 à 9) mémorisées "from memory"**. Fractions introduites comme quantité (1/b, a/b), dénominateurs 2, 3, 4, 6, 8. Tables 6, 7, 8, 9 mémorisées côté Singapour à ce niveau. | **Sourcé** — Common Core 3.OA.C.7 et 3.NF.A.1 (citations exactes), Singapore Math scope and sequence. |
| 9 ans (Grade 4) | Multiplication à plusieurs chiffres, division avec reste, fractions équivalentes simples. | Estimation raisonnée (progression logique post-Grade 3), non vérifiée précisément cette passe. |
| 10 ans (Grade 5) | Maîtrise des faits de multiplication/division, opérations sur les nombres décimaux, multiplication/division à 2 chiffres. | **Sourcé partiellement** — Singapore Math Grade 5 ("know multiplication and division facts", travail avancé sur les décimaux). |
| 11 ans (Grade 6) | Utilise des variables pour représenter des nombres, résout des équations à une inconnue de la forme x+p=q et px=q, comprend des inégalités simples (x>c, x<c) représentées sur une droite. | **Sourcé** — Common Core 6.EE.B (standards cités précisément). |
| 12 ans (Grade 7) | Résout "avec fluidité" des équations de la forme px+q=r et p(x+q)=r, résout et représente des inégalités de la forme px+q>r. | **Sourcé** — Common Core 7.EE (standards cités précisément). |
| 13 ans (Grade 8) | Nombres non rationnels, exposants entiers et racines, relations entre proportionnalité/droites/équations linéaires, résolution de systèmes de 2 équations linéaires, notion de fonction. | **Sourcé** — Common Core Grade 8 (résumé officiel du niveau). |
| 14 ans (Grade 9, début lycée) | Théorème de Pythagore, statistiques descriptives simples (moyenne, médiane), algèbre plus avancée. | Estimation raisonnée (transition vers le lycée), non vérifiée précisément cette passe. |

## 2. Langage (lecture / écriture / expression)

| Âge | Repère attendu | Source / confiance |
|---|---|---|
| 4 ans | Reconnaît son prénom écrit, connaît une partie de l'alphabet, raconte une histoire simple à l'oral en respectant l'ordre des événements. | Non sourcé — avant Kindergarten (5 ans) dans le référentiel Common Core. Développemental général, à vérifier. |
| 5 ans (Kindergarten) | Isole et prononce les sons (phonèmes) initial/médian/final d'un mot de 3 sons de type consonne-voyelle-consonne, débute le décodage par assemblage de sons. | **Sourcé** — Common Core Reading Foundational Skills, Kindergarten (citation quasi exacte). |
| 6 ans (Grade 1) | "Lit avec une précision et une fluidité suffisantes pour soutenir la compréhension" : lit un texte de son niveau avec intention, à voix haute avec précision/rythme/expression, se corrige seul en s'appuyant sur le contexte. | **Sourcé** — Common Core RF.1.4 (citation quasi exacte). |
| 7 ans (Grade 2) | Même structure de standard qu'à 6 ans sur un texte de niveau plus élevé ; poursuit le travail sur les voyelles courtes/longues pour décoder des mots. | **Sourcé** — Common Core RF.2.4 (standard structurellement identique à Grade 1, appliqué à un texte plus avancé). |
| 8-10 ans (Grade 3-5) | Utilise les relations lettres-sons pour décoder et comprendre des mots de plusieurs syllabes, lecture de textes de niveau croissant. Résume un texte, utilise des connecteurs logiques simples (parce que, ensuite, donc). | **Sourcé partiellement** — la partie décodage vient de Common Core RF (progression Grade 3-5, formulation générale) ; la partie "résumé/connecteurs" reste une estimation raisonnée non vérifiée précisément cette passe. |
| 11-14 ans | Rédige des textes structurés en plusieurs paragraphes avec une progression claire, argumente avec plusieurs arguments organisés, analyse un texte court (intention de l'auteur, point de vue, fiabilité d'une source). | Non vérifié précisément cette passe — cohérent avec la progression générale connue des Writing Standards Common Core, mais les standards W.6 à W.9 n'ont pas été recherchés individuellement ici. À confirmer avant usage. |

## 3. Sciences / Découverte du monde

> Restructuré par **bande d'âge plutôt que par année précise**, contrairement aux deux domaines
> ci-dessus — le référentiel le mieux documenté trouvé (NGSS américain) est lui-même organisé
> par bandes (K-2, 3-5, 6-8), pas année par année. Forcer une fausse précision annuelle ici
> aurait été moins honnête que de suivre la vraie structure de la source.
>
> **Correction trouvée en sourçant** : le premier jet plaçait le "cycle de l'eau" à 7 ans et la
> "photosynthèse" à 12 ans. NGSS place en réalité la version complète et vocabulairement précise
> des deux (évaporation/condensation/précipitation nommées, mécanisme de la photosynthèse) dans
> la bande **6-8 (11-14 ans)**, pas avant — une version simplifiée et intuitive reste
> raisonnable à évoquer plus tôt en conversation libre, mais ne correspond pas au standard
> formel à cet âge.

| Bande d'âge | Repère attendu | Source / confiance |
|---|---|---|
| 5-7 ans (K-2) | Propriétés de base des matériaux (ex : ce qui flotte/coule), besoins de base des êtres vivants et de leur environnement, premières notions de conception de solutions simples (ingénierie). | **Sourcé** — NGSS, bande K-2 (nextgenscience.org). |
| 8-10 ans (3-5) | Matière et énergie : propriétés et changements d'état. Systèmes du corps humain. Histoire de la Terre et formation des reliefs. À 10 ans (Grade 5) spécifiquement : modélise le mouvement de la matière entre plantes, animaux, décomposeurs et environnement. | **Sourcé** — NGSS bande 3-5 (général) + standard 5-LS2-1 (Grade 5, cité précisément). |
| 11-14 ans (6-8) | Cycle de l'eau complet avec vocabulaire exact — évaporation, condensation, précipitation, transpiration (MS-ESS2-4). Rôle de la photosynthèse dans le cycle de la matière et de l'énergie (MS-LS1-6). États de la matière et énergie thermique (MS-PS1-4). Plus largement : écosystèmes, diversité du vivant, énergie et forces. | **Sourcé** — NGSS Middle School, 3 standards cités précisément (MS-ESS2-4, MS-LS1-6, MS-PS1-4) + bande générale 6-8. |

## 4. Corporelle (motricité)

> Deux sources combinées : le CDC ne publie officiellement des repères moteurs détaillés que
> jusqu'à 5 ans (au-delà, pas de checklist officielle grand public trouvée) ; SHAPE America
> (organisme officiel des standards d'éducation physique aux USA, équivalent Common Core pour
> le sport) prend le relais K-12 mais en termes plus généraux par cycle plutôt qu'année par
> année précise.

| Âge / bande | Repère attendu | Source / confiance |
|---|---|---|
| 3-5 ans | Motricité globale en développement rapide (courir, sauter, grimper avec plus de contrôle) — repères précis disponibles par âge sur le site du CDC. | **Sourcé** — CDC "Learn the Signs. Act Early." (checklists officielles par âge jusqu'à 5 ans). |
| 6-10 ans (élémentaire) | Compétence dans une variété d'habiletés motrices et de combinaisons de mouvements (lancer, attraper, dribbler...), utilise des concepts de mouvement de base (danse, gymnastique, jeux à effectif réduit), identifie des notions de base de la condition physique. | **Sourcé** — SHAPE America, "Grade-Level Outcomes for K-12 Physical Education", niveau élémentaire (K-5). |
| 11-14 ans (collège) | Applique stratégies, principes et tactiques liés au mouvement et à la performance dans des situations de jeu plus complexes ; maintient un niveau d'activité physique favorable à la santé de façon plus autonome. | **Sourcé partiellement** — SHAPE America, structure générale du niveau collège ; contenu détaillé non extrait ligne par ligne cette passe. |

## 5. Sociale (compétences relationnelles)

> Basé sur CASEL (Collaborative for Academic, Social, and Emotional Learning), référence
> reconnue aux USA, reprise par de nombreux États avec des bandes d'âge cohérentes (K-2, 3-5,
> 6-8, 9-12 — même structure que les sciences). Deux des 5 compétences CASEL relèvent
> directement du social ; les 3 autres sont rangées en Émotionnelle (§6) ci-dessous.

| Bande d'âge | Repère attendu | Source / confiance |
|---|---|---|
| 5-7 ans (K-2) | Premières compétences relationnelles de base (partage, tour de rôle, reconnaître les émotions d'autrui de façon simple) et de conscience sociale élémentaire. | **Sourcé partiellement** — structure de bande CASEL confirmée (plusieurs États : Minnesota, Kansas, North Dakota) ; contenu détaillé K-2 estimé à partir de la définition générale de la compétence, pas extrait ligne par ligne. |
| 8-10 ans (3-5) | Conscience sociale (comprendre les perspectives d'autrui, faire preuve d'empathie) et compétences relationnelles (communiquer clairement, coopérer, résoudre des conflits simples) plus établies. | **Sourcé partiellement** — même source, bande 3-5. |
| 11-14 ans (6-8) | Compétences relationnelles plus complexes : négociation, résistance à la pression sociale négative, travail d'équipe dans des groupes plus larges ou moins familiers. | **Sourcé partiellement** — même source, bande 6-8. |

## 6. Émotionnelle (conscience et gestion de soi)

> Les 3 autres compétences CASEL : conscience de soi, gestion de soi, prise de décision
> responsable. Même niveau de sourçage que le domaine Sociale ci-dessus (structure de bande
> confirmée, contenu détaillé par bande estimé).

| Bande d'âge | Repère attendu | Source / confiance |
|---|---|---|
| 5-7 ans (K-2) | Reconnaît et nomme ses émotions de base, débute l'autorégulation simple (attendre son tour, se calmer avec l'aide d'un adulte). | **Sourcé partiellement** — structure CASEL confirmée, contenu K-2 estimé. |
| 8-10 ans (3-5) | Reconnaît l'influence de ses émotions sur son comportement, développe une autorégulation plus autonome, fixe des petits objectifs personnels. | **Sourcé partiellement** — structure CASEL confirmée, contenu 3-5 estimé. |
| 11-14 ans (6-8) | Gestion du stress plus complexe, prise de décision responsable tenant compte de plusieurs facteurs (conséquences, bien-être d'autrui), identité personnelle en construction. | **Sourcé partiellement** — structure CASEL confirmée, contenu 6-8 estimé. |

## 7. Entrepreneuriale

> Basé sur le NFEC (National Financial Educators Council) — organisme privé à but non lucratif
> spécialisé en littératie financière, pas un organisme public comme Common Core/NGSS/SHAPE ;
> à traiter avec un cran de prudence de plus. Bandes d'âge PK-2 / 3-5 / 6-8 confirmées, contenu
> détaillé par bande non extrait ligne par ligne cette passe.

| Bande d'âge | Repère attendu | Source / confiance |
|---|---|---|
| 5-7 ans (PK-2) | Premières notions d'argent (compter, épargner dans une tirelire, différence entre besoin et envie). | **Sourcé partiellement** — bande confirmée (NFEC), contenu estimé à partir des 5 thèmes généraux (psychologie financière/budget, épargne, carrière, crédit, gestion du risque). |
| 8-10 ans (3-5) | Notion de budget simple, premières idées de "gagner de l'argent" par un petit service ou une petite vente, comprend qu'un choix a un coût. | **Sourcé partiellement** — même source, bande 3-5. |
| 11-14 ans (6-8) | Comprend des notions de base d'un petit projet entrepreneurial (coût, prix, marge), planifie un petit budget sur plusieurs semaines. | **Sourcé partiellement** — même source, bande 6-8. |

## 8. Artisanale (habileté manuelle)

> Littérature de motricité fine/dextérité manuelle — développementale, pas un standard
> curriculaire officiel, mais avec des repères annuels précis trouvés (plus précis que la
> plupart des autres domaines ajoutés cette passe).

| Âge | Repère attendu | Source / confiance |
|---|---|---|
| 6-7 ans | Écriture plus fluide et contrôlée, maniement des ciseaux/colle pour des tâches détaillées, intérêt croissant pour les activités manuelles. | **Sourcé** — littérature développementale sur la motricité fine (physio-pedia.com et sources concordantes). |
| 8-9 ans | Motricité fine plus raffinée et efficace, capable de tâches demandant une concentration prolongée et des mouvements précis. | **Sourcé** — même littérature. |
| 10-14 ans | Motricité fine proche de l'adulte, capable de projets complexes en plusieurs séances, recherche un résultat "professionnel", travaille seul sur un projet pendant des heures. | **Sourcé** — même littérature, description explicitement donnée pour 10 ans, extrapolée sans changement majeur jusqu'à 14. |

## 9. Spatiale

> Littérature de psychologie du développement (recherche académique publiée), pas un organisme
> de standards — mais avec des repères d'âge précis et concordants entre plusieurs études.

| Âge | Repère attendu | Source / confiance |
|---|---|---|
| 3 ans | Construit un vocabulaire spatial (dessus/dessous, à côté, dedans/dehors). | **Sourcé** — littérature développementale (earlymaths.org et sources concordantes). |
| 4-9 ans | Perçoit et représente des objets sous différents points de vue, intègre la notion de perspective — développement progressif sur toute la période. | **Sourcé** — même littérature. |
| 5 ans | Majorité des enfants réussissent au-dessus du hasard une tâche de "pliage mental" (imaginer un objet après pliage). | **Sourcé** — étude citée (NRICH, développement de la pensée spatiale et géométrique 5-18 ans). |
| 7-8 ans | La performance en pliage mental continue de s'améliorer, plafonne généralement vers cet âge. | **Sourcé** — même étude. |

## 10. Créative — délibérément EXCLUE du mécanisme de détection

> ⚠️ Ce n'est pas un trou de données comme pour les autres domaines — c'est une exclusion
> **volontaire**, même après avoir trouvé de vraies sources.

La recherche (travaux de Torrance et suites) montre que la créativité suit un développement
**non linéaire** chez l'enfant : des "creuux" documentés et normaux vers 5, 9, 13 et 17 ans,
souvent expliqués par l'émergence d'un raisonnement plus logique/conventionnel (transition
piagétienne concret → formel) qui interrompt temporairement la pensée associative libre. Ce
n'est pas un retard, c'est un phénomène développemental attendu.

Le mécanisme de détection de ce document (§11 ci-dessous) compare un niveau observé à un niveau
attendu et suppose implicitement que "plus haut que l'attendu = en avance, plus bas = en
retard" — une hypothèse qui devient fausse et potentiellement trompeuse pour un domaine où
"plus bas à certains âges" est normal et sain. Câbler la créativité dans ce mécanisme risquerait
de déclencher une fausse alerte "en retard" sur un enfant de 9 ans qui traverse simplement le
creux de développement attendu à cet âge. **Décision : ne pas étiqueter les défis créatifs avec
`academic_domain`/`academic_level_age`, laisser ce talent mesuré uniquement comme aujourd'hui**
(défis validés, Jumeau Pédagogique) — cf. décision #39.

## 11. Comment ceci remplace le déclencheur retiré — ✅ construit (décision #38, 2026-07-20)

Au lieu d'un Z-score sur une note auto-déclarée : chaque défi généré dans un des 3 domaines
ci-dessus est étiqueté par l'IA (`academic_domain`, `academic_level_age`) avec l'âge auquel son
contenu correspond réellement. `ensureHypothesesForChild` regarde les 4 derniers défis complétés
d'un même domaine — si les 4 sont constamment ≥1 an en dessous OU au-dessus de l'âge réel de
l'enfant, ça amorce un cycle d'hypothèses (`hypothesis_cycles`, colonne `trigger_domain`), dans
les deux sens (en retard → causes existantes ; en avance → nouvelle cause `READY_FOR_MORE`).
Vérifié en production sur un cas réel, les deux sens. Détail complet : décision #38.

## Sources consultées

- [Common Core State Standards for Mathematics](https://learning.ccsso.org/wp-content/uploads/2022/11/ADA-Compliant-Math-Standards.pdf)
- [Mathematics Standards | Common Core State Standards Initiative](https://www.thecorestandards.org/Math/)
- [Grade 3 » Operations & Algebraic Thinking » 7 (3.OA.C.7)](https://www.thecorestandards.org/Math/Content/3/OA/C/7/)
- [Grade 3 » Number & Operations—Fractions (3.NF)](https://www.thecorestandards.org/Math/Content/3/NF/)
- [Grade 6 » Expressions & Equations](https://www.thecorestandards.org/Math/Content/6/EE/)
- [Grade 7 » Expressions & Equations](https://www.thecorestandards.org/Math/Content/7/EE/)
- [English Language Arts Standards » Reading: Foundational Skills, Introduction K-5](https://www.thecorestandards.org/ELA-Literacy/RF/introduction/)
- [Reading Foundational Skills » Kindergarten](https://www.thecorestandards.org/ELA-Literacy/RF/K/)
- [Reading Foundational Skills » Grade 1](https://www.thecorestandards.org/ELA-Literacy/RF/1/)
- [Reading Foundational Skills » Grade 2](https://www.thecorestandards.org/ELA-Literacy/RF/2/)
- [Topic Arrangements of the NGSS](https://www.nextgenscience.org/overview-topics)
- [MS-ESS2-4 Earth's Systems](https://www.nextgenscience.org/pe/ms-ess2-4-earths-systems)
- [MS-LS1-6 Photosynthesis / Matter Cycling](https://thewonderofscience.com/msls16)
- [The Chinese Curriculum | Nord Anglia Education](https://www.nordangliaeducation.com/academic-excellence/curricula-guide/chinese-curriculum)
- [Singapore Math — Scopes & Sequences](https://www.singaporemath.com/pages/scopes-sequences)
- [CDC — Milestone Checklists by Age](https://www.cdc.gov/act-early/resources/milestones-checklist-by-age.html)
- [SHAPE America — National Standards & Grade-Level Outcomes for K-12 Physical Education](https://www.peteacheredu.org/national-physical-education-standards/)
- [CASEL — Frameworks, Competencies, Standards, and Guidelines](https://casel.org/state-resource-center/frameworks-competencies-standards-and-guidelines/)
- [CASEL's SEL Framework](https://casel.org/casel-sel-framework-11-2020/)
- [Minnesota SEL Competencies (implémentation CASEL par bande)](https://casel.s3.us-east-2.amazonaws.com/Minnesota-SEL-Competencies-.pdf)
- [NFEC — Financial Literacy Standards](https://www.financialeducatorscouncil.org/financial-literacy-standards/)
- [Development of Fine Motor Skills in Children — Physiopedia](https://www.physio-pedia.com/The_Development_of_Fine_Motor_Skills_in_Children)
- [The Development of Spatial and Geometric Thinking: 5 to 18 — NRICH](https://nrich.maths.org/2483)
- [Spatial Reasoning — Early Childhood Math Group](https://earlymaths.org/spatial-reasoning/)
- [Creativity slumps and bumps: neurobehavioral basis of creativity development in middle childhood — PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC6559841/)
