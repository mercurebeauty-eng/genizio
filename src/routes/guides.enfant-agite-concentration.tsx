import { createFileRoute } from "@tanstack/react-router";
import { GuideLayout, MedicalDisclaimer } from "@/components/guides/GuideLayout";
import { pageMeta, jsonLdScript, faqPageJsonLd, breadcrumbJsonLd, absoluteUrl, SITE_URL } from "@/lib/seo";

const PATH = "/guides/enfant-agite-concentration";

const FAQ = [
  {
    question: "Mon enfant ne tient pas en place, est-ce un TDAH ?",
    answer:
      "L'agitation seule ne suffit pas à parler de trouble du déficit de l'attention avec ou sans hyperactivité. Beaucoup d'enfants bougent énormément et apprennent d'ailleurs mieux en manipulant qu'en restant assis. Ce qui distingue un fonctionnement particulier d'un trouble, c'est la persistance des difficultés dans plusieurs contextes différents (maison, école, activités), sur plus de six mois, avec un retentissement réel sur les apprentissages ou les relations. Seul un professionnel de santé — médecin, pédiatre, neuropsychologue ou pédopsychiatre — peut poser ce diagnostic. Aucune application, y compris Génizio, ne peut le faire.",
  },
  {
    question: "Comment savoir si mon enfant a un trouble de l'attention ou s'il s'ennuie ?",
    answer:
      "L'indice le plus utile est la comparaison entre les contextes. Un enfant qui ne tient pas cinq minutes sur un exercice écrit mais reste absorbé quarante minutes sur une construction, un dessin ou un jeu de rôle montre qu'il est capable d'attention soutenue : c'est le format de la tâche qui pose problème, pas la capacité elle-même. À l'inverse, une difficulté à rester concentré même sur les activités qu'il aime, associée à une grande impulsivité, mérite un avis professionnel. Noter par écrit ce que l'enfant fait pendant quelques semaines rend cette différence beaucoup plus visible qu'une impression générale.",
  },
  {
    question: "Comment aider un enfant à se concentrer à la maison ?",
    answer:
      "Quatre habitudes ont fait leurs preuves auprès des familles : découper les tâches en étapes courtes et visibles pour que l'enfant sache où il en est ; autoriser le mouvement pendant l'activité plutôt que le réprimer (beaucoup d'enfants réfléchissent mieux debout ou en manipulant) ; proposer des activités qui produisent un résultat concret et visible, car la récompense tangible soutient l'effort mieux qu'une consigne abstraite ; et fixer un seul objectif à la fois plutôt qu'une liste. Ces habitudes aident tous les enfants, qu'il y ait un trouble diagnostiqué ou non.",
  },
  {
    question: "Le sommeil, le sucre et le sport influencent-ils l'agitation de mon enfant ?",
    answer:
      "Oui, énormément, et c'est souvent le premier levier à vérifier avant de s'inquiéter. Un enfant qui dort moins que son besoin (10 à 13 heures entre 3 et 6 ans, 9 à 12 heures entre 6 et 12 ans) est plus agité, plus impulsif et moins concentré le lendemain — la fatigue ressemble à de l'hyperactivité. Une alimentation trop sucrée (sodas, bonbons, jus industriels) provoque des montées et des chutes d'énergie qui amplifient l'agitation. Et un enfant qui n'a pas dépensé son énergie physique dans la journée la dépensera en classe : une heure de jeu libre ou de sport avant les devoirs fait souvent des merveilles. Ces trois leviers — sommeil, sucre, mouvement — sont à ajuster avant toute autre démarche.",
  },
  {
    question: "À quel âge s'inquiéter de l'agitation d'un enfant ?",
    answer:
      "Avant 5 ou 6 ans, une forte agitation motrice fait partie du développement normal et n'est pas en soi un signal d'alerte. C'est plutôt à partir de l'entrée dans les apprentissages formels, quand rester assis et suivre une consigne longue devient une attente quotidienne, que les difficultés deviennent visibles et mesurables. Le critère reste le même à tout âge : la gêne réelle et durable dans plusieurs environnements, pas l'énergie de l'enfant.",
  },
  {
    question: "Génizio peut-il détecter un TDAH chez mon enfant ?",
    answer:
      "Non, et ce n'est pas son objet. Génizio est un outil éducatif qui propose des défis concrets et cartographie les talents d'un enfant à partir de ce qu'il réalise, selon les 9 intelligences de Howard Gardner. Il n'effectue aucun dépistage, ne pose aucun diagnostic et ne remplace aucun avis médical. En revanche, l'historique des défis réalisés — ce que l'enfant termine, ce qu'il abandonne, sur quoi il reste longtemps — constitue une observation écrite et datée qui peut être utile à partager avec un professionnel de santé si vous le consultez.",
  },
];

export const Route = createFileRoute("/guides/enfant-agite-concentration")({
  head: () => {
    const meta = pageMeta({
      title: "Enfant agité ou hyperactif : l'aider à se concentrer",
      description:
        "Agitation, hyperactivité, concentration : comment observer votre enfant, l'aider à faire ses devoirs, et savoir quand consulter pour un TDAH.",
      path: PATH,
      image: "/guides/og-agite.jpg",
      type: "article",
    });
    return {
      ...meta,
      scripts: [
        jsonLdScript(faqPageJsonLd(FAQ)),
        jsonLdScript(
          breadcrumbJsonLd([
            { name: "Accueil", path: "/" },
            { name: "Guides", path: "/guides" },
            { name: "Enfant agité et concentration", path: PATH },
          ])
        ),
        jsonLdScript({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "Mon enfant est agité ou hyperactif : comment l'aider à se concentrer à la maison et à l'école",
          inLanguage: "fr-FR",
          mainEntityOfPage: absoluteUrl(PATH),
          image: absoluteUrl("/guides/og-agite.jpg"),
          publisher: { "@id": `${SITE_URL}/#organization` },
          author: { "@type": "Organization", name: "Génizio" },
          datePublished: "2026-07-27",
          dateModified: "2026-08-14",
          about: [
            { "@type": "Thing", name: "Attention de l'enfant" },
            { "@type": "Thing", name: "Concentration" },
            { "@type": "Thing", name: "Développement de l'enfant" },
          ],
        }),
      ],
    };
  },
  component: Guide,
});

function Guide() {
  return (
    <GuideLayout
      eyebrow="Attention & concentration"
      title="Mon enfant est agité ou hyperactif : comment l'aider à se concentrer à la maison et à l'école"
      intro="« Il ne se concentre sur rien. » C'est l'une des phrases que les parents nous disent le plus souvent. Dans une grande partie des cas, l'enfant se concentre très bien — mais pas sur ce qu'on lui demande, ni de la façon dont on l'attend. Voici comment faire la différence, et comment adapter les devoirs à un enfant qui bouge."
      updated="14 août 2026"
      readingTime="7 min"
      related={[
        { label: "Haut potentiel : les vrais signes", to: "/guides/potentiel-haut-potentiel-enfant" },
        { label: "24 activités éducatives sans écran (6-12 ans)", to: "/guides/activites-educatives-enfant" },
        { label: "Les 9 formes d'intelligence de l'enfant", to: "/guides/intelligences-multiples-gardner" },
        { label: "Gérer la colère de son enfant", to: "/guides/gestion-colere-emotions-enfant" },
      ]}
    >
      <img
        src="/guides/og-agite.jpg"
        alt="Enfant africain canalisant son énergie dans une construction de blocs à la maison"
        className="my-6 aspect-video w-full rounded-3xl border border-ink/10 object-cover shadow-lg"
      />
      <MedicalDisclaimer>
        Ce guide est un contenu éducatif destiné aux parents. Il ne constitue pas un avis médical
        et ne permet pas de dépister un trouble. Si l'agitation ou les difficultés d'attention de
        votre enfant gênent son quotidien, sa scolarité ou ses relations, parlez-en à un médecin,
        un pédiatre ou un neuropsychologue : eux seuls peuvent évaluer et diagnostiquer.
      </MedicalDisclaimer>

      <h2>L'attention n'est pas une quantité fixe</h2>
      <p>
        On parle souvent de la concentration comme d'un réservoir : un enfant en aurait beaucoup ou
        peu. L'observation quotidienne raconte autre chose. Le même enfant qui abandonne un exercice
        de calcul au bout de trois minutes peut rester quarante minutes sur une cabane, un dessin ou
        un montage Lego, sans lever la tête.
      </p>
      <p>
        Ce n'est pas de la mauvaise volonté, et ce n'est pas non plus nécessairement un trouble.
        L'attention se déclenche différemment selon <strong>le format de la tâche</strong> : ce
        qu'elle demande au corps, ce qu'elle produit de visible, et le degré de contrôle laissé à
        l'enfant.
      </p>

      <h3>Trois formats qui changent tout</h3>
      <ul>
        <li>
          <strong>Le corps.</strong> Certains enfants ont besoin de manipuler pour penser. Leur
          demander de rester immobile revient à leur retirer leur principal outil de réflexion.
        </li>
        <li>
          <strong>Le résultat visible.</strong> Une consigne abstraite (« révise ta leçon ») ne
          produit rien de tangible. Une activité qui aboutit à un objet, une photo, un score, donne
          un but concret à l'effort.
        </li>
        <li>
          <strong>La marge de décision.</strong> Un enfant qui choisit sa méthode tient
          généralement plus longtemps qu'un enfant qui exécute une procédure imposée.
        </li>
      </ul>

      <h2>La question utile : est-ce partout, ou seulement ici ?</h2>
      <p>
        C'est le point de bascule entre « mon enfant fonctionne autrement » et « mon enfant a peut-être
        besoin d'un accompagnement ». Un professionnel de santé s'intéressera précisément à cette
        question, et arriver avec des observations concrètes fait gagner un temps considérable.
      </p>
      <p>Regardez, sur plusieurs semaines :</p>
      <ul>
        <li>Les difficultés apparaissent-elles <strong>à la maison et à l'école et</strong> en activité libre, ou seulement dans un cadre ?</li>
        <li>Durent-elles depuis plus de <strong>six mois</strong>, ou sont-elles apparues récemment (déménagement, naissance, conflit, changement d'école) ?</li>
        <li>Y a-t-il un <strong>retentissement réel</strong> — l'enfant souffre, décroche, se met en danger, perd ses amis — ou est-ce surtout inconfortable pour l'entourage ?</li>
        <li>Existe-t-il au moins <strong>une activité</strong> sur laquelle il tient longtemps, spontanément ?</li>
      </ul>
      <p>
        Une agitation présente partout, durable, avec un vrai retentissement et sans aucune plage
        d'attention soutenue justifie un avis professionnel. À l'inverse, une agitation qui
        s'effondre dès que l'enfant fait quelque chose qui l'intéresse est une information sur le
        format des tâches, pas sur l'enfant.
      </p>

      <h2>Observer sans étiqueter : une méthode simple</h2>
      <p>
        La mémoire des parents est un mauvais instrument de mesure — elle retient les épisodes
        marquants, pas la moyenne. Une trace écrite, même sommaire, change la conversation, avec
        l'école comme avec un soignant.
      </p>
      <ol>
        <li>
          <strong>Notez la durée réelle.</strong> Pendant deux à trois semaines, notez pour chaque
          activité combien de temps l'enfant est resté engagé. Trois lignes par jour suffisent.
        </li>
        <li>
          <strong>Notez le contexte.</strong> Seul ou accompagné ? Avant ou après l'école ? Avec ou
          sans écran juste avant ? Ces variables ressortent vite.
        </li>
        <li>
          <strong>Cherchez les exceptions.</strong> Les moments où il a tenu longtemps sont les plus
          instructifs : qu'avaient-ils en commun ?
        </li>
        <li>
          <strong>Ne concluez pas seul.</strong> Ces notes servent à décrire, pas à diagnostiquer.
          Apportez-les à un professionnel si l'inquiétude persiste.
        </li>
      </ol>

      <h2>Ce qui aide, indépendamment de tout diagnostic</h2>
      <p>
        Les habitudes ci-dessous améliorent l'engagement de la plupart des enfants, qu'un trouble soit
        présent ou non. Elles ne remplacent pas une prise en charge quand elle est nécessaire.
      </p>
      <ul>
        <li><strong>Découper.</strong> Une tâche de trente minutes devient trois tâches de dix, avec un point d'arrivée visible à chaque fois.</li>
        <li><strong>Autoriser le mouvement.</strong> Debout, en marchant, en manipulant : le résultat compte plus que la posture.</li>
        <li><strong>Viser le concret.</strong> Une activité qui produit un objet ou une photo donne une raison de finir.</li>
        <li><strong>Un objectif à la fois.</strong> Les listes découragent ; une seule mission tenue jusqu'au bout construit la confiance.</li>
        <li><strong>Valoriser le fini, pas le parfait.</strong> Ce qui se consolide, c'est l'expérience d'avoir terminé quelque chose.</li>
      </ul>

      <div className="my-8 rounded-2xl bg-amber-50 p-6 border border-amber-200">
        <h3 className="font-bold text-amber-950 text-base mb-2">⚡ Le Défi 10 Min à tester ce soir : 'La Mission Chronomètre Inversé'</h3>
        <p className="text-sm text-amber-900 leading-relaxed mb-3">
          Au lieu de demander à votre enfant de "se concentrer sagement", proposez-lui ce défi kinesthésique : <strong>Construire la plus haute tour en livres et rouleaux de papier en exactement 7 minutes.</strong>
        </p>
        <p className="text-sm text-amber-900 leading-relaxed">
          Il doit manipuler, ajuster l'équilibre et anticiper l'effondrement. À la fin des 7 minutes, prenez la photo de sa tour pour son cahier des réussites. Vous constaterez une attention à 100 % parce que son corps et son cerveau étaient engagés ensemble.
        </p>
      </div>


      <h2>Les devoirs avec un enfant qui bouge</h2>
      <p>
        Le moment des devoirs est le plus dur pour un enfant agité : on lui demande précisément ce
        qu'il ne sait pas faire — rester assis et concentré longtemps. La solution n'est pas de
        forcer la posture, mais d'adapter le format :
      </p>
      <ul>
        <li><strong>Le format chronomètre :</strong> 10 minutes de travail, 3 minutes de pause active (sauter, marcher, s'étirer), puis 10 minutes. Trois blocs courts valent mieux qu'une heure d'affilée — et l'enfant voit le temps passer, ce qui rend l'effort tenable.</li>
        <li><strong>La position debout autorisée :</strong> beaucoup d'enfants réfléchissent mieux debout, en marchant ou en manipulant un objet. Laissez-le faire ses exercices en bougeant, tant que le travail avance.</li>
        <li><strong>Le devoir « à voix haute » :</strong> au lieu de lire et d'écrire en silence, l'enfant explique à voix haute ce qu'il vient de lire. La parole engage le corps autrement et aide la concentration.</li>
        <li><strong>Dépenser avant de travailler :</strong> 15 minutes de jeu libre ou de sport avant les devoirs vident l'excès d'énergie — un enfant qui a bougé se concentre mieux qu'un enfant qu'on a forcé à rester immobile.</li>
        <li><strong>Une seule consigne à la fois :</strong> « sors ton cahier » puis « ouvre-le à la page 12 » puis « lis l'exercice 1 » — plutôt qu'une liste de quatre tâches qui décourage d'avance.</li>
      </ul>
      <p>
        Ces adaptations aident tous les enfants, qu'il y ait un diagnostic ou non — et elles
        transforment le moment des devoirs en expérience de réussite plutôt qu'en champ de bataille.
      </p>

      <h2>Où Génizio intervient — et où il n'intervient pas</h2>
      <p>
        Génizio propose à votre enfant des défis concrets adaptés à son âge et à ses centres
        d'intérêt : fabriquer, cuisiner, mesurer, raconter, vendre. Chaque défi terminé est
        photographié par le parent, ce qui produit au fil des semaines une trace datée de ce que
        l'enfant a réellement fait, et une carte de ses talents selon les 9 intelligences de
        Howard Gardner.
      </p>
      <p>
        Cette trace est utile pour repérer ses formats d'engagement — et elle peut se partager avec
        un professionnel. Mais <strong>Génizio ne dépiste rien et ne diagnostique rien</strong>. Un
        outil éducatif ne remplace ni un bilan, ni un soignant.
      </p>

      <h2>Questions fréquentes</h2>
      {FAQ.map((item) => (
        <div key={item.question}>
          <h3>{item.question}</h3>
          <p>{item.answer}</p>
        </div>
      ))}
    </GuideLayout>
  );
}
