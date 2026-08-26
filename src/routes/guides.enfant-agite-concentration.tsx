import { createFileRoute } from "@tanstack/react-router";
import { GuideLayout, MedicalDisclaimer } from "@/components/guides/GuideLayout";
import {
  pageMeta,
  jsonLdScript,
  faqPageJsonLd,
  breadcrumbJsonLd,
  absoluteUrl,
  SITE_URL,
} from "@/lib/seo";

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
      title: "Enfant agité ou inattentif : l'aider à se concentrer",
      description:
        "Votre enfant ne tient pas en place ou peine à se concentrer ? Découvrez 5 méthodes concrètes pour adapter les devoirs et canaliser son énergie sans crier.",
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
          ]),
        ),
        jsonLdScript({
          "@context": "https://schema.org",
          "@type": "Article",
          headline:
            "Mon enfant est agité ou inattentif : comment l'aider à se concentrer à la maison et à l'école",
          description:
            "Guide parental approfondi pour aider un enfant agité ou incapable de se concentrer : méthodes concrètes de devoirs, sommeil, mouvement et repérage TDAH.",
          inLanguage: "fr-FR",
          mainEntityOfPage: absoluteUrl(PATH),
          image: absoluteUrl("/guides/og-agite.jpg"),
          publisher: { "@id": `${SITE_URL}/#organization` },
          author: { "@type": "Organization", name: "Génizio" },
          datePublished: "2026-07-27",
          dateModified: "2026-08-26",
          about: [
            { "@type": "Thing", name: "Attention de l'enfant" },
            { "@type": "Thing", name: "Concentration scolaire" },
            { "@type": "Thing", name: "Enfant agité" },
            { "@type": "Thing", name: "TDAH" },
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
      title="Mon enfant est agité ou inattentif : comment l'aider à se concentrer à la maison et à l'école"
      intro="« Il ne tient pas en place », « Il est incapable de se concentrer plus de 2 minutes » : ce constat est l'un des plus fréquents chez les parents. Dans la majorité des cas, l'enfant n'a pas un déficit d'attention, mais un besoin de mouvement pour réfléchir. Voici comment comprendre son fonctionnement, adapter les devoirs et restaurer le calme sans cris."
      updated="26 août 2026"
      readingTime="8 min"
      path={PATH}
      related={[
        {
          label: "Haut potentiel : les vrais signes",
          to: "/guides/potentiel-haut-potentiel-enfant",
        },
        {
          label: "24 activités éducatives sans écran",
          to: "/guides/activites-educatives-enfant",
        },
        {
          label: "Les 9 formes d'intelligence",
          to: "/guides/intelligences-multiples-gardner",
        },
        { label: "Gestion de la colère (5 outils)", to: "/guides/gestion-colere-emotions-enfant" },
        { label: "Autisme & TDAH : forces réelles", to: "/guides/autisme-tdah-apprentissage-forces-reelles" },
      ]}
    >
      <img
        src="/guides/og-agite.jpg"
        alt="Enfant africain canalisant son énergie dans une construction de blocs à la maison"
        width="1200"
        height="630"
        loading="lazy"
        decoding="async"
        className="my-6 aspect-video w-full rounded-3xl border border-ink/10 object-cover shadow-lg"
      />
      <MedicalDisclaimer>
        Ce guide est un contenu éducatif destiné aux parents. Il ne constitue pas un avis médical et
        ne permet pas de dépister un trouble. Si l'agitation ou les difficultés d'attention de votre
        enfant gênent son quotidien, sa scolarité ou ses relations, parlez-en à un médecin, un
        pédiatre ou un neuropsychologue : eux seuls peuvent évaluer et diagnostiquer.
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
        l'enfant. Selon les principes de la{" "}
        <a href="/guides/intelligences-multiples-gardner">théorie des 9 formes d'intelligence</a>, beaucoup d'enfants apprennent avec leur corps (intelligence corporelle-kinesthésique).
      </p>

      <h3>Trois formats qui changent tout</h3>
      <ul>
        <li>
          <strong>Le corps et le mouvement :</strong> Certains enfants ont un besoin vital de manipuler pour fixer leur pensée. Leur imposer une immobilité totale coupe leurs circuits d'attention. Découvrez nos{" "}
          <a href="/guides/activites-manuelles-enfant">18 activités manuelles faciles à la maison</a>.
        </li>
        <li>
          <strong>Le résultat visible :</strong> Une consigne abstraite (« révise ta leçon ») ne produit rien de tangible. Proposez plutôt l'une de nos{" "}
          <a href="/guides/activites-educatives-enfant">24 activités éducatives sans écran</a> pour donner un but immédiat à son énergie.
        </li>
        <li>
          <strong>La marge de décision :</strong> Un enfant qui choisit son ordre de travail tient deux fois plus longtemps qu'un enfant qui subit un protocole rigide.
        </li>
      </ul>

      <h2>La question utile : est-ce partout, ou seulement ici ?</h2>
      <p>
        C'est le point de bascule entre « mon enfant fonctionne autrement » et « mon enfant a
        peut-être besoin d'un accompagnement spécialisé ». Un professionnel de santé s'intéressera précisément
        à cette distinction :
      </p>
      <ul>
        <li>
          Les difficultés apparaissent-elles <strong>à la maison ET à l'école ET</strong> en
          activité libre, ou seulement dans un cadre scolaire précis ?
        </li>
        <li>
          Durent-elles depuis plus de <strong>six mois</strong>, ou sont-elles apparues après un événement précis (déménagement, surconsommation d'
          <a href="/guides/ecrans-addiction-alternatives-enfant">écrans et réseaux sociaux</a>, conflit familial) ?
        </li>
        <li>
          Y a-t-il un <strong>retentissement réel</strong> sur ses apprentissages (découvrez comment{" "}
          <a href="/guides/decrochage-scolaire-confiance-enfant">redonner confiance à un enfant en difficulté scolaire</a>) ?
        </li>
        <li>
          Existe-t-il au moins <strong>une activité</strong> sur laquelle il reste absorbé spontanément ?
        </li>
      </ul>
      <p>
        Pour mieux comprendre les profils neuroatypiques, lisez notre dossier sur l'
        <a href="/guides/autisme-tdah-apprentissage-forces-reelles">Autisme & TDAH : valoriser leurs forces d'apprentissage</a> ainsi que notre enquête sur les{" "}
        <a href="/guides/potentiel-haut-potentiel-enfant">signes du haut potentiel intellectuel (HPI)</a>.
      </p>

      <h2>Observer sans étiqueter : une méthode simple</h2>
      <p>
        La mémoire parentale retient souvent les moments de crise plutôt que la moyenne. Pour avoir une vision objective :
      </p>
      <ol>
        <li>
          <strong>Notez la durée réelle :</strong> Pendant deux semaines, notez combien de minutes l'enfant est resté engagé sur chaque type d'activité.
        </li>
        <li>
          <strong>Notez le contexte :</strong> Est-ce avant ou après les repas ? Après 1 heure passée devant un écran ?
        </li>
        <li>
          <strong>Cherchez les exceptions :</strong> Les moments où il a tenu longtemps révèlent ses véritables leviers d'attention.
        </li>
      </ol>

      <h2>Ce qui aide, indépendamment de tout diagnostic</h2>
      <ul>
        <li>
          <strong>Découper en blocs :</strong> Une tâche de 30 minutes devient 3 séquences de 10 minutes avec une respiration entre chaque.
        </li>
        <li>
          <strong>Réguler les émotions :</strong> L'agitation cache souvent une grande frustration inexprimée : appliquez nos{" "}
          <a href="/guides/gestion-colere-emotions-enfant">5 outils pour apaiser la colère de l'enfant</a>.
        </li>
        <li>
          <strong>Pratiquer la discipline positive :</strong> Remplacez les punitions stériles par des conséquences logiques en suivant notre guide sur la{" "}
          <a href="/guides/discipline-positive-sans-punition">discipline positive sans crier</a>.
        </li>
      </ul>

      <div className="my-8 rounded-2xl bg-amber-50 p-6 border border-amber-200">
        <h3 className="font-bold text-amber-950 text-base mb-2">
          ⚡ Le Défi 10 Min à tester ce soir : 'La Mission Chronomètre Inversé'
        </h3>
        <p className="text-sm text-amber-900 leading-relaxed mb-3">
          Au lieu de lui ordonner de « rester sage », lancez-lui ce défi :{" "}
          <strong>Construire la plus haute tour en livres et rouleaux de carton en exactement 7 minutes.</strong>
        </p>
        <p className="text-sm text-amber-900 leading-relaxed">
          Il doit manipuler, ajuster l'équilibre et anticiper la chute. À la fin, prenez la photo de sa tour pour son passeport de réussites. Vous observerez une concentration totale, car son corps et son esprit sont mobilisés ensemble.
        </p>
      </div>

      <h2>Les devoirs avec un enfant qui bouge : 5 règles d'or</h2>
      <p>
        Le moment des devoirs cristallise les tensions. Voici comment transformer ce moment en réussite :
      </p>
      <ul>
        <li>
          <strong>1. La pause motrice préalable :</strong> 15 minutes de vélo, de course ou de danse avant d'ouvrir les cahiers pour décharger le trop-plein d'énergie.
        </li>
        <li>
          <strong>2. La position debout acceptée :</strong> Laissez votre enfant réciter sa leçon ou résoudre ses exercices debout, en marchant ou en manipulant une balle anti-stress.
        </li>
        <li>
          <strong>3. Le devoir à voix haute :</strong> Transformer la lecture silencieuse en mini-exposé dynamique.
        </li>
        <li>
          <strong>4. Une seule consigne à la fois :</strong> Évitez les listes à rallonge qui saturent sa mémoire de travail.
        </li>
        <li>
          <strong>5. Les encouragements précis :</strong> Félicitez l'effort fourni et la stratégie utilisée (retrouvez nos conseils pour{" "}
          <a href="/guides/reussite-scolaire-aider-enfant">aider son enfant à réussir à l'école</a>).
        </li>
      </ul>

      <h2>Ce que fait Génizio au quotidien</h2>
      <p>
        Génizio ne pose aucun diagnostic médical. L'application propose des défis d'action adaptés aux 9 formes d'intelligence : réparer, inventer, classer, observer. En photographiant ses réalisations, vous conservez la preuve vivante de ses capacités de persévérance et de créativité.
      </p>

      <h2>Questions fréquentes (FAQ)</h2>
      {FAQ.map((item) => (
        <div key={item.question} className="my-5 border-b border-ink/10 pb-4">
          <h3 className="text-lg font-bold text-ink">{item.question}</h3>
          <p className="mt-2 text-ink/80">{item.answer}</p>
        </div>
      ))}
    </GuideLayout>
  );
}
