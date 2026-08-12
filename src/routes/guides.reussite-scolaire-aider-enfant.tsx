import { createFileRoute } from "@tanstack/react-router";
import { GuideLayout } from "@/components/guides/GuideLayout";
import { pageMeta, jsonLdScript, faqPageJsonLd, breadcrumbJsonLd, absoluteUrl, SITE_URL } from "@/lib/seo";

const PATH = "/guides/reussite-scolaire-aider-enfant";

const FAQ = [
  {
    question: "Comment aider mon enfant à réussir à l'école ?",
    answer:
      "Les leviers les plus efficaces se jouent à la maison, et ils sont plus simples qu'on ne le croit : des routines stables (sommeil, repas, temps de devoir à heure fixe) qui sécurisent l'enfant ; un espace de travail calme et prêt ; des devoirs faits en autonomie croissante plutôt que corrigés à sa place ; des félicitations précises sur l'effort et le progrès plutôt que sur l'intelligence ; et des occasions de réussir dans d'autres domaines que l'école (construire, cuisiner, organiser) qui entretiennent la confiance. Ces habitudes aident tous les enfants, quelles que soient leurs notes actuelles.",
  },
  {
    question: "Mon enfant a de mauvaises notes : que faire ?",
    answer:
      "D'abord, ne pas dramatiser : une mauvaise note est une information, pas un verdict. Ensuite, chercher le « pourquoi » avant le « comment » : la difficulté est-elle passagère (fatigue, stress, conflit à l'école) ou durable ? Porte-t-elle sur une matière ou sur toutes ? L'enfant a-t-il compris la consigne, ou a-t-il eu un blocage ? Il est utile de parler avec l'enseignant, qui voit l'enfant dans un autre contexte. Enfin, reconstruire par des petites réussites concrètes : un objectif court, atteignable, validé, plutôt qu'un grand programme de rattrapage qui décourage.",
  },
  {
    question: "Qu'est-ce qui prédit le mieux la réussite scolaire ?",
    answer:
      "Ni le QI ni l'avance précoce. Les facteurs qui ressortent le plus des recherches sont la confiance en sa capacité d'apprendre, la régularité des habitudes de travail, la capacité à tolérer l'erreur et à persévérer, et la stabilité de l'environnement familial. Un enfant qui croit que l'effort change les résultats — plutôt que « je suis nul de naissance » — persévère davantage et progresse davantage. C'est une bonne nouvelle pour les parents : ces facteurs se cultivent à la maison, indépendamment du niveau scolaire de départ.",
  },
  {
    question: "Faut-il récompenser les bonnes notes ?",
    answer:
      "Récompenser chaque bonne note avec de l'argent ou des cadeaux est contre-productif à long terme : l'enfant apprend à travailler pour la récompense et perd le plaisir d'apprendre. Ce qui fonctionne mieux, c'est de valoriser le processus : la régularité, l'effort, la méthode, le progrès entre deux contrôles. Célébrer la démarche (avoir révisé trois soirs de suite, avoir osé demander de l'aide) construit la motivation intrinsèque, celle qui tient sur la durée. La fierté d'avoir bien fait, reconnue par le parent, vaut plus que n'importe quelle récompense matérielle.",
  },
  {
    question: "Génizio peut-il aider mon enfant à réussir à l'école ?",
    answer:
      "Indirectement, oui, de deux façons. D'abord en entretenant la confiance en soi par des réussites concrètes hors de l'école : les défis de Génizio (construire, mesurer, cuisiner, vendre, organiser) donnent à l'enfant des preuves visibles qu'il est capable d'aller au bout des choses, ce qui rejaillit sur son rapport à l'apprentissage en classe. Ensuite en documentant ses réalisations dans un portfolio qui le valorise autrement que par les notes. Génizio ne remplace pas l'école ni le soutien scolaire : il construit ce qui rend l'école possible — la confiance.",
  },
];

export const Route = createFileRoute("/guides/reussite-scolaire-aider-enfant")({
  head: () => {
    const meta = pageMeta({
      title: "Aider son enfant à réussir à l'école sans pression",
      description:
        "Ce qui prédit vraiment la réussite scolaire d'un enfant, comment réagir aux mauvaises notes et quels leviers installer à la maison.",
      path: PATH,
      image: "/guides/og-reussite.jpg",
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
            { name: "Réussite scolaire", path: PATH },
          ])
        ),
        jsonLdScript({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "Aider son enfant à réussir à l'école sans pression",
          inLanguage: "fr-FR",
          mainEntityOfPage: absoluteUrl(PATH),
          image: absoluteUrl("/guides/og-reussite.jpg"),
          publisher: { "@id": `${SITE_URL}/#organization` },
          author: { "@type": "Organization", name: "Génizio" },
          datePublished: "2026-08-10",
          dateModified: "2026-08-10",
          about: [
            { "@type": "Thing", name: "Réussite scolaire" },
            { "@type": "Thing", name: "Motivation de l'enfant" },
            { "@type": "Thing", name: "Confiance en soi de l'enfant" },
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
      eyebrow="Réussite & motivation"
      title="Aider son enfant à réussir à l'école sans pression"
      intro="« Il est intelligent mais il ne travaille pas assez. » Cette phrase cache presque toujours une autre réalité : ce qui manque à l'enfant n'est ni l'intelligence ni la paresse, mais un ensemble de conditions — confiance, routines, motivation — que les parents peuvent installer à la maison. Voici lesquelles, et dans quel ordre."
      updated="10 août 2026"
      readingTime="8 min"
      related={[
        { label: "Décrochage scolaire : la confiance avant l'école", to: "/guides/decrochage-scolaire-confiance-enfant" },
        { label: "Motiver un adolescent : 12 défis qui marchent", to: "/guides/defis-pour-adolescents" },
        { label: "24 activités éducatives (6-12 ans)", to: "/guides/activites-educatives-enfant" },
      ]}
    >
      <img
        src="/guides/og-reussite.jpg"
        alt="Enfant concentré sur son cahier accompagné de ses parents à la maison"
        className="my-6 aspect-video w-full rounded-3xl border border-ink/10 object-cover shadow-lg"
      />
      <h2>Ce qui prédit vraiment la réussite scolaire</h2>
      <p>
        On croit souvent que la réussite scolaire dépend de l'intelligence mesurée par les notes
        elles-mêmes — une boucle qui ne dit rien de la cause. Les recherches sur l'apprentissage
        dessinent un autre tableau : les facteurs qui distinguent les élèves qui progressent sont la{" "}
        <strong>confiance en sa capacité d'apprendre</strong>, la <strong>régularité</strong> des
        habitudes de travail, la capacité à <strong>tolérer l'erreur</strong> et à persévérer, et la{" "}
        <strong>stabilité</strong> de l'environnement familial.
      </p>
      <p>
        Un enfant qui croit que l'effort change les résultats — plutôt que « je suis comme ça » —
        travaille davantage et progresse davantage. C'est une excellente nouvelle : ces facteurs ne
        sont ni innés ni scolaires. Ils se cultivent à la maison.
      </p>

      <h2>Les six leviers à installer à la maison</h2>
      <ol>
        <li>
          <strong>Des routines stables.</strong> Heures de sommeil et de repas régulières, et un
          créneau de devoirs fixe. La régularité sécurise ; le cerveau de l'enfant apprend mieux dans
          un environnement prévisible.
        </li>
        <li>
          <strong>Un espace de travail prêt.</strong> Pas besoin d'une pièce dédiée : une table
          débarrassée, la trousse prête, le téléphone éteint. L'effort doit aller à la tâche, pas à
          l'installation.
        </li>
        <li>
          <strong>Des devoirs en autonomie croissante.</strong> On aide à comprendre la consigne,
          pas à faire à sa place. Un enfant qui corrige ses propres erreurs développe sa méthode ;
          un enfant dont on corrige tout attend la correction.
        </li>
        <li>
          <strong>Des félicitations sur l'effort, pas sur l'intelligence.</strong> « Tu as tenu bon
          jusqu'au bout » construit plus que « tu es intelligent », qui enseigne à éviter les
          difficultés pour ne pas décevoir.
        </li>
        <li>
          <strong>Une relation à l'école qui reste positive.</strong> Ne pas parler de l'école comme
          d'une menace (« tu verras quand tu seras au collège »), mais comme d'un lieu où l'on
          apprend, y compris de ses erreurs.
        </li>
        <li>
          <strong>Des réussites en dehors de l'école.</strong> Un enfant qui construit, cuisine,
          organise ou vend quelque chose de concret accumule des preuves qu'il est capable. Ces
          preuves nourrissent la confiance qui rend les devoirs possibles.
        </li>
      </ol>

      <h2>Réagir aux mauvaises notes sans drame</h2>
      <p>
        La première réaction compte plus que tout le reste. Une mauvaise note n'est ni un verdict
        sur l'enfant ni une attaque contre vous. Voici une séquence qui marche :
      </p>
      <ul>
        <li>
          <strong>Ne pas dramatiser.</strong> « Ce contrôle ne reflète pas ce que tu sais faire » est
          une phrase qui débloque ; « tu ne travailles jamais » verrouille.
        </li>
        <li>
          <strong>Chercher la cause, pas le coupable.</strong> Fatigue passagère ? Consigne non
          comprise ? Difficulté durable ? Conflit avec un camarade ou un enseignant ? La note est une
          information à interpréter, pas à juger.
        </li>
        <li>
          <strong>Parler avec l'enseignant.</strong> L'école voit l'enfant dans un autre contexte.
          Une conversation change souvent le diagnostic.
        </li>
        <li>
          <strong>Reconstruire par petites victoires.</strong> Un objectif court et atteignable,
          validé une fois, vaut mieux qu'un grand programme de rattrapage qui décourage.
        </li>
      </ul>

      <h2>Le piège de la récompense</h2>
      <p>
        « Si tu as une bonne note, je t'achète... » fonctionne à court terme et casse à long terme :
        l'enfant apprend à travailler pour la récompense, et quand la récompense s'arrête,
        l'effort s'arrête aussi. À la place, on valorise le <strong>processus</strong> : avoir
        révisé trois soirs de suite, avoir demandé de l'aide, avoir progressé entre deux contrôles.
        La fierté reconnue d'un progrès réel est la récompense la plus durable — et elle est
        gratuite.
      </p>

      <h2>Ce que Génizio apporte à la réussite scolaire</h2>
      <p>
        Génizio n'apprend pas les leçons à la place de l'école. Il construit ce qui rend l'école
        possible : la confiance. Les défis concrets qu'il propose à l'enfant — construire, mesurer,
        cuisiner, vendre, organiser — produisent des réussites visibles, photographiées et
        documentées dans un portfolio. L'enfant accumule des preuves de ce qu'il est capable de
        mener à bien, ce qui transforme son rapport à l'effort en classe.
      </p>
      <p>
        C'est aussi un outil d'observation pour le parent : ce que l'enfant choisit, termine et
        persévère à faire en dit long sur ses forces réelles — bien au-delà de ce qu'un bulletin
        scolaire mesure.
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
