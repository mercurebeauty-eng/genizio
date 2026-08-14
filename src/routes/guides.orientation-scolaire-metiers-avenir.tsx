import { createFileRoute } from "@tanstack/react-router";
import { GuideLayout } from "@/components/guides/GuideLayout";
import { pageMeta, jsonLdScript, faqPageJsonLd, breadcrumbJsonLd, articleJsonLd } from "@/lib/seo";

const PATH = "/guides/orientation-scolaire-metiers-avenir";

const FAQ = [
  {
    question: "N'est-il pas trop tôt pour parler d'orientation scolaire à un enfant de 10 à 12 ans ?",
    answer:
      "Il ne s'agit pas de lui faire choisir une carrière définitive, mais d'éveiller sa curiosité pour la diversité des métiers du monde réel : artisanat, commerce, agriculture, santé, numérique, enseignement. Plus un enfant découvre tôt la variété des métiers et des filières possibles, plus il donne du sens à ses apprentissages scolaires actuels — « à quoi ça sert » devient une question concrète, pas une menace.",
  },
  {
    question: "Quelles filières peut choisir mon enfant après le collège ?",
    answer:
      "Tout dépend du pays et du système scolaire, mais le principe est le même : les filières professionnelles (CAP, BTS, formations techniques, apprentissage) mènent à des métiers réels et demandés — plomberie, électricité, couture, mécanique, cuisine, agriculture, informatique — souvent plus vite que les filières générales, et avec de vraies perspectives. Un enfant qui aime travailler avec ses mains n'a pas « raté » l'école : il a simplement besoin d'une filière qui valorise son intelligence pratique. L'important est de visiter, d'interroger des professionnels et de regarder ce qui existe vraiment près de chez vous avant de décider.",
  },
  {
    question: "Comment l'IA et l'apprentissage par projet aident-ils à déceler les métiers du futur ?",
    answer:
      "Les métiers de demain exigeront la résolution de problèmes complexes, la créativité et la pensée critique — des capacités que les examens purement théoriques mesurent mal. En observant les compétences mobilisées lors de défis réels (construire, vendre, organiser, réparer), on identifie les appétences naturelles qui feront la différence, bien avant que les notes n'en disent quoi que ce soit.",
  },
  {
    question: "Que faire si mon enfant ne s'intéresse qu'à un seul sujet (ex. le football ou la musique) ?",
    answer:
      "Utilisez ce sujet comme point de départ ! Autour du football gravitent des métiers de statistiques, de journalisme, de kinésithérapie, de gestion d'événements et d'architecture de stade. Autour de la musique : l'ingénierie du son, la production, l'événementiel, l'enseignement. Raccordez toujours la passion de l'enfant à l'éventail des métiers et des compétences qui l'entourent — la passion n'est pas une impasse, c'est une porte d'entrée.",
  },
];

export const Route = createFileRoute("/guides/orientation-scolaire-metiers-avenir")({
  head: () => {
    const meta = pageMeta({
      title: "Aider son enfant à choisir son métier dès 10 ans",
      description:
        "3 enquêtes à faire à la maison pour aider son enfant à découvrir les métiers : interview de professionnels, mini-projet, filières professionnelles (CAP, BTS).",
      path: PATH,
      image: "/guides/og-orientation.jpg",
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
            { name: "Orientation & Métiers", path: PATH },
          ])
        ),
        jsonLdScript(
          articleJsonLd({
            headline: "Aider son enfant à choisir son métier : 3 enquêtes à faire à la maison",
            description:
              "Méthode concrète pour aider son enfant à découvrir les métiers et les filières possibles, sans imposer ses propres rêves.",
            path: PATH,
            image: "/guides/og-orientation.jpg",
            datePublished: "2026-08-08",
            dateModified: "2026-08-14",
          })
        ),
      ],
    };
  },
  component: Guide,
});

function Guide() {
  return (
    <GuideLayout
      eyebrow="Orientation & Métiers"
      title="Aider son enfant à choisir son métier : 3 enquêtes à faire à la maison"
      intro="L'orientation scolaire ne se décide pas en un jour, en troisième, face à une fiche à cocher. Elle se construit en découvrant, dès l'enfance, la diversité des métiers qui existent vraiment autour de soi : l'artisan, la commerçante, l'agriculteur, l'informaticien, le couturier. Voici 3 enquêtes simples à mener à la maison pour aider votre enfant à y voir clair — sans imposer vos propres rêves."
      updated="14 août 2026"
      readingTime="7 min"
      related={[
        { label: "Motiver un adolescent (12-16 ans)", to: "/guides/defis-pour-adolescents" },
        { label: "Les intelligences multiples de Gardner", to: "/guides/intelligences-multiples-gardner" },
        { label: "L'IA pour aider son enfant à apprendre", to: "/guides/ia-apprentissage-enfant" },
      ]}
    >
      <img
        src="/guides/og-orientation.jpg"
        alt="Jeune élève découvrant un projet scientifique et technologique avec son père"
        className="my-6 aspect-video w-full rounded-3xl border border-ink/10 object-cover shadow-lg"
      />

      <h2>Pourquoi les notes scolaires seules ne suffisent plus à prédire la réussite</h2>
      <p>
        L'école traditionnelle mesure principalement l'intelligence <strong>linguistique</strong> et{" "}
        <strong>logico-mathématique</strong> abstraite. Pourtant, les métiers qui embauchent
        valorisent tout autant l'intelligence <strong>interpersonnelle</strong> (vendre, négocier,
        diriger), <strong>spatiale</strong> (construire, concevoir, réparer) et{" "}
        <strong>pratique</strong> (travailler de ses mains). Un enfant qui n'est pas « bon en classe »
        peut exceller dans un métier manuel ou commercial — à condition qu'on l'aide à découvrir que
        ce métier existe et qu'il a de la valeur.
      </p>
      <p>
        Observer votre enfant en situation d'action concrète — au marché, dans la cour, en cuisine —
        vous donne des indices précieux sur ce qu'il fait naturellement et bien. C'est de là que part
        l'orientation, pas des classements.
      </p>

      <h2>3 enquêtes d'orientation ludiques à mener à la maison</h2>

      <div className="my-6 rounded-2xl bg-brand-50 p-5 border border-brand/20">
        <h3 className="font-bold text-brand text-base mb-2">1. L'interview d'un professionnel du quartier</h3>
        <p className="text-sm text-ink/80 leading-relaxed">
          Proposez à votre enfant de préparer 5 questions et d'interviewer un artisan, un commerçant, un agriculteur ou un technicien de votre entourage : « qu'est-ce que tu fais dans une journée ? », « qu'est-ce que tu aimes le plus ? », « comment as-tu appris ? ». En décortiquant le quotidien réel d'un métier, l'enfant dépasse les stéréotypes et projette concrètement ses propres capacités.
        </p>
      </div>

      <div className="my-6 rounded-2xl bg-amber-50 p-5 border border-amber-200">
        <h3 className="font-bold text-amber-950 text-base mb-2">2. Le défi du 'Mini-Projet'</h3>
        <p className="text-sm text-amber-900 leading-relaxed">
          Invitez votre enfant à concevoir une petite activité concrète : vendre des pâtisseries au quartier, réparer des objets, organiser un atelier pour les plus jeunes. Il découvrira s'il préfère gérer les chiffres, concevoir le produit, ou convaincre les clients — trois familles de métiers très différentes.
        </p>
      </div>

      <div className="my-6 rounded-2xl bg-emerald-50 p-5 border border-emerald-200">
        <h3 className="font-bold text-emerald-950 text-base mb-2">3. La carte des métiers de la famille et du quartier</h3>
        <p className="text-sm text-emerald-900 leading-relaxed">
          Sur une grande feuille, faites la liste de tous les métiers qui touchent votre famille : ceux des parents, des tantes, des oncles, des voisins, du quartier. Pour chacun, notez ce qu'il faut savoir faire (calculer, parler, construire, soigner, vendre). L'enfant voit que le monde du travail est vaste, concret, et rempli de personnes qu'il connaît — la meilleure antidote aux métiers « imaginaires » des écrans.
        </p>
      </div>

      <h2>Les filières réelles à connaître avant la fin du collège</h2>
      <p>
        Beaucoup de parents ne connaissent que la voie générale. Pourtant, les filières
        professionnelles offrent des débouchés réels, souvent plus rapides et plus demandés :
      </p>
      <ul>
        <li><strong>Les métiers manuels et l'artisanat :</strong> électricité, plomberie, mécanique, couture, coiffure, menuiserie, maçonnerie — souvent accessibles par CAP ou apprentissage, avec une demande forte et un métier qui s'apprend vite.</li>
        <li><strong>Les filières techniques (BTS et équivalents) :</strong> commerce, comptabilité, informatique, agriculture, hôtellerie — deux ans après le bac, un vrai métier et un salaire.</li>
        <li><strong>L'agriculture et l'agroalimentaire :</strong> production, transformation, vente — des filières en pleine croissance dans toute l'Afrique de l'Ouest.</li>
        <li><strong>Le numérique :</strong> développement, maintenance, réseaux — des formations de plus en plus accessibles, parfois courtes et pratiques.</li>
      </ul>
      <p>
        L'important n'est pas de trancher tôt, mais de <strong>visiter et d'interroger avant de
        décider</strong> : les journées portes ouvertes, les discussions avec les professionnels et
        les stages d'observation valent tous les discours théoriques.
      </p>

      <h2>Comment accompagner sans imposer ses propres rêves</h2>
      <ul>
        <li><strong>Valoriser le processus, pas seulement le métier final :</strong> <em>"Tu as un vrai sens du détail et de la négociation"</em> plutôt que <em>"Tu seras avocat"</em>.</li>
        <li><strong>Ne pas dévaloriser les métiers manuels :</strong> un bon plombier ou un bon couturier nourrit sa famille et gagne sa vie — dire le contraire, même en plaisantant, ferme des portes.</li>
        <li><strong>Élargir, ne pas restreindre :</strong> votre enfant dit « je veux faire la même chose que toi » ? Montrez-lui dix métiers autour de ce qu'il aime, pas un seul chemin.</li>
        <li><strong>Encourager l'audace :</strong> Laisser l'enfant expérimenter plusieurs projets et échouer sans jugement dramatique. L'orientation se corrige, se redresse, se réinvente — ce n'est pas une sentence.</li>
      </ul>

      <h2>Foire aux questions sur l'orientation précoce</h2>
      <div className="mt-8 space-y-6 border-t border-ink/10 pt-6">
        {FAQ.map((item, idx) => (
          <div key={idx} className="space-y-2">
            <h3 className="text-base font-bold text-ink">{item.question}</h3>
            <p className="text-sm leading-relaxed text-ink/75">{item.answer}</p>
          </div>
        ))}
      </div>
    </GuideLayout>
  );
}
