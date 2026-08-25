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

const PATH = "/guides/gestion-colere-emotions-enfant";

const FAQ = [
  {
    question: "Pourquoi mon enfant se met-il si facilement en colère ?",
    answer:
      "Parce que le cerveau qui régule les émotions est le dernier à mûrir chez l'enfant : il se développe jusque vers 20-25 ans. Avant cela, une frustration déclenche une réaction émotionnelle immédiate, sans le filtre qui permet à un adulte de prendre du recul. Ajoutez à cela la fatigue, la faim ou un changement de rythme, et la colère devient vite une soupape. Ce n'est pas un caprice ni une mauvaise volonté : c'est un cerveau en construction qui a besoin d'être accompagné, pas puni, pour apprendre à se réguler.",
  },
  {
    question: "Comment réagir quand mon enfant fait une crise de colère ?",
    answer:
      "Quatre réflexes aident : rester calme (votre calme est contagieux, votre colère aussi) ; accueillir l'émotion sans la juger (« tu es très en colère parce que... ») — nommer l'émotion aide le cerveau à la traiter ; ne pas céder sur la limite qui a déclenché la crise, sinon la crise devient un moyen d'obtenir ; et offrir un exutoire physique (courir, taper dans un coussin, déchirer un papier) plutôt que de demander de se taire. Une fois la crise passée, on reparle de ce qui s'est passé, brièvement, sans sermon.",
  },
  {
    question: "Que dire pendant une crise de colère ? Et que ne jamais dire ?",
    answer:
      "Ce qui aide, à dire à voix basse, phrases courtes : « je suis là », « tu es en colère, c'est normal », « je ne te laisserai pas te faire mal », « on va trouver une solution ensemble ». Ce qui aggrave, à éviter absolument : « arrête de pleurer », « tu es ridicule », « tu fais exprès », « si tu continues, tu vas voir », et toute menace ou moquerie. La règle simple : on accueille le ressenti, on tient la limite, et on garde un ton calme même si l'enfant crie. Ce que vous dites compte moins que le calme avec lequel vous le dites.",
  },
  {
    question: "Faut-il punir un enfant pour sa colère ?",
    answer:
      "Punir la colère elle-même est contre-productif : elle est une émotion, pas un comportement, et l'enfant n'en est pas plus responsable que de sa faim. On peut en revanche poser des limites sur les comportements qui accompagnent la colère (frapper, casser, insulter) avec des conséquences claires. La distinction est importante : accueillir la colère (« je vois que tu es en colère ») n'est pas tolérer les actes (« tu as le droit d'être en colère, pas de frapper »). Un enfant qui peut exprimer sa colère sans être jugé apprend à la traverser ; un enfant puni pour l'avoir ressentie apprend seulement à la cacher.",
  },
  {
    question: "Les écrans rendent-ils mon enfant plus colérique ?",
    answer:
      "Le lien est indirect mais réel. Un enfant qui passe beaucoup de temps devant un écran fait moins d'activités physiques, dort parfois moins, et subit des transitions brutales quand on éteint — trois ingrédients classiques des crises. Sans diaboliser l'écran, deux réflexes réduisent les crises liées aux écrans : prévenir avant d'éteindre (« encore 5 minutes, ensuite on éteint ensemble ») et remplacer le temps d'écran retiré par une activité concrète plutôt que par du vide. Beaucoup de parents constatent une baisse nette des crises après quelques semaines de réduction progressive du temps d'écran.",
  },
  {
    question: "La colère de mon enfant est-elle normale ou faut-il consulter ?",
    answer:
      "La colère fréquente est normale chez l'enfant, surtout entre 2 et 6 ans. Elle mérite une évaluation professionnelle quand elle devient excessive en durée (des crises de plus de 30 minutes à répétition), en intensité (danger pour lui-même ou les autres, destruction), ou en fréquence (plusieurs crises par jour à un âge où l'enfant sait parler). Des signes associés — troubles du sommeil, repli, refus scolaire, idées noires — justifient aussi de consulter. Un pédiatre, un psychologue ou un pédopsychiatre peut évaluer la situation ; ce n'est pas un échec parental, c'est une prise en charge précoce.",
  },
  {
    question: "Génizio peut-il aider un enfant qui se met souvent en colère ?",
    answer:
      "Indirectement, oui : une grande partie des crises vient d'un excès d'énergie ou d'ennui mal canalisé. Génizio propose des défis concrets adaptés à l'âge et aux centres d'intérêt de l'enfant — construire, mesurer, cuisiner, organiser — qui donnent un débouché physique et créatif à cette énergie, et une reconnaissance basée sur ce qu'il a réellement accompli. Génizio ne pose aucun diagnostic et ne remplace pas un professionnel : c'est un outil éducatif qui crée des occasions de réussite et d'apaisement à la maison.",
  },
];

export const Route = createFileRoute("/guides/gestion-colere-emotions-enfant")({
  head: () => {
    const meta = pageMeta({
      title: "Gestion de la colère de l'enfant : 5 outils pour l'apaiser",
      description:
        "Crise de colère, frustration et caprices : découvrez pourquoi l'enfant explose, les phrases qui apaisent et 5 outils concrets pour calmer la tempête sans crier.",
      path: PATH,
      image: "/guides/og-colere.jpg",
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
            { name: "Gestion de la colère enfant", path: PATH },
          ]),
        ),
        jsonLdScript({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: "Gestion de la colère chez l'enfant : 5 outils concrets pour apaiser les crises",
          description:
            "Guide parental pour gérer la colère et les crises émotionnelles des enfants : neurosciences de la frustration, phrases clés et 5 outils pratiques d'apaisement.",
          inLanguage: "fr-FR",
          mainEntityOfPage: absoluteUrl(PATH),
          image: absoluteUrl("/guides/og-colere.jpg"),
          publisher: { "@id": `${SITE_URL}/#organization` },
          author: { "@type": "Organization", name: "Génizio" },
          datePublished: "2026-08-10",
          dateModified: "2026-08-25",
          about: [
            { "@type": "Thing", name: "Gestion de la colère de l'enfant" },
            { "@type": "Thing", name: "Régulation des émotions" },
            { "@type": "Thing", name: "Discipline positive" },
            { "@type": "Thing", name: "Psychologie de l'enfant" },
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
      eyebrow="Émotions & bien-être"
      title="Gestion de la colère de l'enfant : 5 outils pour l'apaiser"
      intro="Une crise de colère à 18 h dans la cuisine, et c'est toute la maison qui tangue. Avant de chercher à « faire taire » cette colère, il faut comprendre ce qu'elle est : une émotion réelle, pas une attaque contre vous. Voici comment la traverser sans céder, sans crier, et en apprenant quelque chose à l'enfant."
      updated="25 août 2026"
      readingTime="8 min"
      path={PATH}
      related={[
        { label: "Mon enfant ne tient pas en place", to: "/guides/enfant-agite-concentration" },
        {
          label: "Se faire obéir sans crier ni frapper",
          to: "/guides/discipline-positive-sans-punition",
        },
        {
          label: "Enfant qui perd confiance : l'aider",
          to: "/guides/decrochage-scolaire-confiance-enfant",
        },
        {
          label: "Activités éducatives (6-12 ans)",
          to: "/guides/activites-educatives-enfant",
        },
      ]}
    >
      <img
        src="/guides/og-colere.jpg"
        alt="Parent accompagnant calmement un enfant en colère à la maison"
        width="1200"
        height="630"
        loading="lazy"
        decoding="async"
        className="my-6 aspect-video w-full rounded-3xl border border-ink/10 object-cover shadow-lg"
      />
      <MedicalDisclaimer>
        Ce guide est un contenu éducatif destiné aux parents. Il ne constitue pas un avis médical et
        ne permet pas d'évaluer un trouble du comportement. Si les colères de votre enfant sont très
        fréquentes, très intenses, durent longtemps ou s'accompagnent de signes de souffrance,
        parlez-en à un pédiatre, un psychologue ou un pédopsychiatre.
      </MedicalDisclaimer>

      <h2>La colère n'est pas un caprice : ce que disent les neurosciences</h2>
      <p>
        Le cortex préfrontal — la zone du cerveau responsable de la régulation émotionnelle, du recul et de la tolérance à la frustration — est la <strong>dernière structure cérébrale à arriver à maturité</strong> (vers 20-25 ans). Chez un enfant de 4, 7 ou même 10 ans, une frustration déclenche une vague neurobiologique brute, sans le filtre qu'un adulte a mis des années à consolider.
      </p>
      <p>
        Ajoutez la fatigue de la journée d'école, la faim, un changement imprévu ou le besoin d'attention, et la colère devient une soupape de décompression. Changer de regard sur cette émotion transforme votre réaction : la question n'est plus « comment faire taire ce cri ? » mais « de quel besoin non satisfait cette colère est-elle le signal ? ». Chez les enfants très énergiques, la colère est souvent liée à un besoin de mouvement non comblé : découvrez comment{" "}
        <a href="/guides/enfant-agite-concentration">canaliser l'agitation et l'énergie débordante de l'enfant</a>.
      </p>
      <p>
        Chez les enfants hypersensibles — qui ressentent chaque stimulus décuplé — la crise est souvent la pointe émergée d'une surcharge sensorielle ou relationnelle : il faut alors moins la réprimer que lui apprendre à reconnaître les signaux avant-coureurs.
      </p>

      <h2>Les trois erreurs parentales les plus fréquentes</h2>
      <ul>
        <li>
          <strong>Punir l'émotion elle-même.</strong> Punir la colère apprend à l'enfant à la dissimuler par peur, pas à la réguler. On pose un cadre strict sur les actes (frapper, casser, insulter), mais on accueille toujours le ressenti. Pour aller plus loin, consultez notre méthode de{" "}
          <a href="/guides/discipline-positive-sans-punition">discipline positive sans crier ni punir</a>.
        </li>
        <li>
          <strong>Céder pour acheter la paix.</strong> Si la tempête permet d'obtenir le paquet de gâteaux ou le temps d'écran refusé, le cerveau de l'enfant enregistre que la crise est une stratégie gagnante — et elle reviendra avec plus d'intensité.
        </li>
        <li>
          <strong>Entrer dans l'escalade et crier en retour.</strong> Deux systèmes nerveux en panique ne s'apaisent jamais mutuellement. Votre calme physique est le régulateur principal de la pièce.
        </li>
      </ul>

      <h2>5 outils concrets pour apaiser une crise à la maison</h2>
      <ol>
        <li>
          <strong>Nommer l'émotion à voix basse.</strong> « Tu es très en colère parce que nous devons éteindre la console. » Le simple fait de poser des mots précis active l'hémisphère gauche et commence à court-circuiter l'amygdale cérébrale.
        </li>
        <li>
          <strong>Accueillir sans céder sur le cadre.</strong> On valide pleinement ce que ressent l'enfant (« je comprends que tu sois déçu ») tout en maintenant la règle avec fermeté et douceur (« et le temps d'écran est terminé »). Voir nos solutions pour{" "}
          <a href="/guides/ecrans-addiction-alternatives-enfant">désamorcer les crises liées aux écrans</a>.
        </li>
        <li>
          <strong>Offrir un exutoire physique immédiat.</strong> Courir sur place, taper dans un gros coussin, déchirer un papier journal ou pétrir de la pâte : le corps a besoin de décharger l'adrénaline avant que la parole rationnelle ne redevienne accessible.
        </li>
        <li>
          <strong>Installer un coin de retour au calme (sans punition).</strong> Un espace douillet choisi ensemble (coussins, livres préférés, bocal sensoriel), où l'enfant peut aller s'apaiser à son rythme sans que ce soit vécu comme une mise à l'écart punitive.
        </li>
        <li>
          <strong>Le débriefing à froid (5 minutes).</strong> Une fois le calme revenu (1 à 2 heures plus tard), reparlez de l'événement sans reproche : « Qu'est-ce qui t'a mis en colère ? Qu'est-ce qu'on pourrait faire la prochaine fois pour que ça se passe mieux ? ».
        </li>
      </ol>

      <h2>Que dire pendant la crise : tableau des phrases clés</h2>
      <p>
        Pendant une tempête émotionnelle, les longs discours sont inaudibles. Privilégiez des phrases très courtes, dites d'une voix posée et basse :
      </p>
      <div className="my-6 overflow-x-auto rounded-2xl border border-ink/10">
        <table className="w-full min-w-[500px] text-sm print:min-w-0">
          <thead>
            <tr className="bg-brand/8 text-left text-xs font-black uppercase tracking-widest text-brand">
              <th className="px-4 py-3">Phrases qui apaisent (à voix basse)</th>
              <th className="px-4 py-3">Phrases qui enflamment (à éviter)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10">
            <tr>
              <td className="px-4 py-3">« Je suis là avec toi. »</td>
              <td className="px-4 py-3">« Arrête ton cinéma immédiatement ! »</td>
            </tr>
            <tr>
              <td className="px-4 py-3">« Tu as le droit d'être en colère, c'est normal. »</td>
              <td className="px-4 py-3">« Tu es ridicule de pleurer pour ça. »</td>
            </tr>
            <tr>
              <td className="px-4 py-3">« Je ne te laisserai pas taper ou te faire mal. »</td>
              <td className="px-4 py-3">« Tu fais exprès de me pourrir la soirée. »</td>
            </tr>
            <tr>
              <td className="px-4 py-3">« On respire ensemble, on trouvera une solution. »</td>
              <td className="px-4 py-3">« Si tu continues, tu vas être privé de tout ! »</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>Prévenir les colères grâce aux défis concrets et aux talents réels</h2>
      <p>
        La majorité des crises de fin de journée s'évitent en amont par deux leviers : des transitions anticipées et un exutoire constructif à l'énergie de l'enfant. Un enfant qui a pu, au cours de son après-midi, bâtir, expérimenter, cuisiner ou relever des défis réels arrive le soir avec un réservoir de confiance plein et beaucoup moins de tension à évacuer.
      </p>
      <p>
        C'est tout l'objet des défis proposés par Génizio : stimuler les{" "}
        <a href="/guides/intelligences-multiples-gardner">intelligences multiples de l'enfant</a> (relationnelle, manuelle, logique) à travers des activités quotidiennes valorisantes, plutôt que de le laisser s'épuiser dans la passivité. Vous pouvez aussi réaliser notre{" "}
        <a href="/guides/test-de-personnalite-enfant-talents">test de personnalité et de découverte des talents réels</a> pour mieux comprendre le tempérament de votre enfant.
      </p>

      <h2>Quand la colère nécessite un accompagnement professionnel</h2>
      <p>
        La colère fait partie intégrante du développement normal de l'enfant. Toutefois, une consultation auprès d'un pédiatre, d'un psychologue pour enfants ou d'un pédopsychiatre est recommandée si les crises durent régulièrement plus de 30 minutes, mettent en danger l'enfant ou son entourage, ou s'accompagnent d'un repli scolaire ou de troubles du sommeil importants.
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
