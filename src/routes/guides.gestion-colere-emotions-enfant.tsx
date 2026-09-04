import { createFileRoute } from "@tanstack/react-router";
import { GuideLayout, MedicalDisclaimer } from "@/components/guides/GuideLayout";
import {
  pageMeta,
  jsonLdScript,
  faqPageJsonLd,
  breadcrumbJsonLd,
  articleJsonLd,
  howToJsonLd,
} from "@/lib/seo";

const PATH = "/guides/gestion-colere-emotions-enfant";

const FAQ = [
  {
    question: "Pourquoi mon enfant se met-il si facilement en colère ?",
    answer:
      "Parce que le cortex préfrontal, qui régule les émotions, termine sa maturation vers 20 ans. Face à une frustration, un enfant subit une décharge neurobiologique brute sans filtre d'adulte. Ce n'est pas un caprice : son cerveau apprend encore à gérer la tempête.",
  },
  {
    question: "Comment réagir quand mon enfant fait une crise de colère ?",
    answer:
      "Trois priorités : garder son calme physique, nommer l'émotion à voix basse (« tu es furieux parce que... ») et tenir fermement la limite sans négocier sous le coup du cri.",
  },
  {
    question: "Comment calmer un enfant qui tape sous le coup de la colère ?",
    answer:
      "La règle absolue est la sécurité. Bloquez fermement les coups sans agressivité en disant : « Je ne te laisse pas me taper, ça fait mal. » Orientez ensuite son énergie vers un coussin ou proposez-lui de sauter sur place pour décharger la tension corporelle.",
  },
  {
    question: "Que dire pendant une crise de colère ? Et que ne jamais dire ?",
    answer:
      "À dire doucement : « Je suis là avec toi », « Tu as le droit d'être en colère », « On trouvera une solution ensemble ». À bannir : « Arrête ton cinéma », « Tu es ridicule », ou les menaces de punition démesurée qui ne font que nourrir la panique.",
  },
  {
    question: "Quelles sont les causes cachées d'une colère soudaine chez l'enfant ?",
    answer:
      "Derrière l'explosion se cache souvent un besoin physiologique (faim, fatigue, manque de sommeil) ou une surcharge sensorielle (trop de bruit, de lumière, d'interactions). Vérifiez toujours ces éléments basiques avant de chercher une explication psychologique complexe.",
  },
  {
    question: "Faut-il punir un enfant pour sa colère ?",
    answer:
      "Non. La colère est un signal émotionnel, pas un délit. En revanche, on sanctionne clairement les actes destructeurs : frapper, casser ou insulter.",
  },
  {
    question: "Est-ce grave si je perds patience et crie sur mon enfant ?",
    answer:
      "Tout parent perd patience à l'occasion. Le point central reste la réparation. Une fois le calme revenu, dites simplement : « Je suis désolé d'avoir crié tout à l'heure, j'étais fatigué et j'ai mal géré ma propre colère. » Vous lui montrez ainsi que tout le monde peut se tromper et s'excuser.",
  },
  {
    question: "Les écrans rendent-ils mon enfant plus colérique ?",
    answer:
      "Indirectement oui : ils réduisent l'activité motrice, perturbent le sommeil et créent des ruptures brutales à l'extinction. Prévenez toujours cinq minutes avant de couper et proposez une activité concrète de relais.",
  },
  {
    question: "La colère de mon enfant est-elle normale ou faut-il consulter ?",
    answer:
      "Consultez si les crises durent plus de 30 minutes, deviennent quotidiennes après 6 ans ou s'accompagnent de violence physique et de repli sur soi.",
  },
  {
    question: "Génizio peut-il aider un enfant qui se met souvent en colère ?",
    answer:
      "Oui, en lui offrant un canal constructif. Les défis manuels et scientifiques de Génizio permettent de transformer le trop-plein d'énergie en fierté d'accomplissement concret.",
  },
];

export const Route = createFileRoute("/guides/gestion-colere-emotions-enfant")({
  head: () => {
    const meta = pageMeta({
      title: "Gestion de la colère de l'enfant : 5 outils pour l'apaiser",
      description:
        "Votre enfant fait des crises de colère ? 5 outils pratiques et bienveillants pour désamorcer les tensions et l'aider à réguler ses émotions sans crier.",
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
            { name: "Gestion de la colère de l'enfant", path: PATH },
          ]),
        ),
        jsonLdScript(
          howToJsonLd({
            name: "Protocole 10 min : La méthode du Thermomètre Émotionnel et Respiration Carrée",
            description:
              "Une méthode en 3 étapes pour aider l'enfant à nommer l'intensité de sa frustration et faire redescendre la tension physiologique.",
            steps: [
              {
                name: "L'échelle du thermomètre (1 min)",
                text: "Demandez à l'enfant d'évaluer sa colère sur une échelle visuelle de 1 (agacement) à 5 (explosion) sans porter de jugement.",
              },
              {
                name: "La respiration carrée (3 min)",
                text: "Guidez 4 cycles de respiration : inspirez 4 secondes, bloquez 4 secondes, expirez 4 secondes, bloquez 4 secondes pour apaiser l'amygdale cérébrale.",
              },
              {
                name: "Le sas d'expression verbale (6 min)",
                text: "Formulez le besoin réel sous-jacent : « Tu es en colère parce que tu voulais finir ton jeu. Que pouvons-nous faire ensemble maintenant ? »",
              },
            ],
          }),
        ),
        jsonLdScript(
          articleJsonLd({
            headline:
              "Gestion de la colère chez l'enfant : 5 outils concrets pour apaiser les crises",
            description:
              "Guide parental pour gérer la colère et les crises émotionnelles des enfants : neurosciences de la frustration, phrases clés et 5 outils pratiques d'apaisement.",
            path: PATH,
            image: "/guides/og-colere.jpg",
            datePublished: "2026-08-10",
            dateModified: "2026-08-27",
          }),
        ),
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
      updated="27 août 2026"
      readingTime="8 min"
      path={PATH}
      related={[
        { label: "Mon enfant ne tient pas en place", to: "/guides/enfant-agite-concentration" },
        {
          label: "Se faire obéir sans crier ni frapper",
          to: "/guides/discipline-positive-sans-punition",
        },
        { label: "Fratrie et disputes : coopérer", to: "/guides/fratrie-rivalite-cooperation" },
        {
          label: "Enfant qui perd confiance : l'aider",
          to: "/guides/decrochage-scolaire-confiance-enfant",
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
        Le cortex préfrontal est la dernière structure cérébrale à mûrir. Vers 20-25 ans seulement. C'est long. Chez un enfant de 4 ou 8 ans, la frustration déclenche une onde neurobiologique brute sans filtre inhibiteur.
      </p>
      <p>
        Ajoutez la fatigue d'une journée de classe, la faim ou un imprévu : la colère explose comme une soupape. Inutile de chercher à faire taire le cri. Cherchez plutôt le besoin non comblé. Chez les profils énergiques, le manque de mouvement physique est souvent l'étincelle (voir comment{" "}
        <a href="/guides/enfant-agite-concentration">canaliser l'agitation et l'énergie motrice de l'enfant</a>).
      </p>
      <p>
        Chez les enfants hypersensibles, la crise signale une surcharge sensorielle. Inutile de sévir. Il faut apprendre à repérer les signaux avant l'explosion.
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
