import { createFileRoute } from "@tanstack/react-router";
import { GuideLayout } from "@/components/guides/GuideLayout";
import { Button } from "@/components/ui/button";
import {
  pageMeta,
  jsonLdScript,
  faqPageJsonLd,
  breadcrumbJsonLd,
  articleJsonLd,
} from "@/lib/seo";
import {
  Coins,
  PiggyBank,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  HeartHandshake,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

const PATH = "/guides/comment-gerer-argent-de-poche-enfant";

const FAQ = [
  {
    question: "Faut-il contrôler systématiquement chaque achat de son enfant ?",
    answer:
      "Non. Le contrôle permanent étouffe l'autonomie. Laissez-le choisir librement, quitte à acheter un gadget cassé en deux heures : cette petite déception concrète enseigne la prudence bien plus vite que vingt sermons.",
  },
  {
    question: "Que faire si l'enfant refuse d'économiser et liquide tout d'un coup ?",
    answer:
      "Rendez l'effort visible. Dans un bocal transparent, les pièces empilées matérialisent le progrès vers un but précis, comme un livre ou une sortie au parc. Évitez les discours vagues sur l'avenir : un enfant de huit ans vit dans l'immédiat. Vous pouvez aussi proposer un bonus d'abondement : pour chaque somme gardée intacte pendant un mois complet, vous ajoutez 10 % au pot.",
  },
  {
    question: "Comment gérer le passage au Mobile Money ou à la carte à l'adolescence ?",
    answer:
      "Dès 13-14 ans, ouvrez un sous-compte ou un portefeuille mobile dédié avec notifications partagées. Faites le point ensemble une fois par mois pour éplucher le relevé sans jugement moral.",
  },
];

export const Route = createFileRoute("/guides/comment-gerer-argent-de-poche-enfant")({
  head: () => {
    const meta = pageMeta({
      title: "Argent de poche enfant : guide pour bien le gérer | Génizio",
      description:
        "Découvrez à quel âge commencer, combien donner et comment apprendre à votre enfant à gérer son argent avec la méthode des 3 pots. Guide pratique.",
      path: PATH,
      image: "/guides/og-argent-poche.jpg",
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
            { name: "Argent de poche & Éducation financière", path: PATH },
          ]),
        ),
        jsonLdScript(
          articleJsonLd({
            headline:
              "Comment aider son enfant à gérer son argent de poche (guide par âge et méthode pratique)",
            description:
              "Découvrez à quel âge commencer, combien donner et comment apprendre à votre enfant à gérer son argent avec la méthode des 3 pots. Guide pratique.",
            path: PATH,
            image: "/guides/og-argent-poche.jpg",
            datePublished: "2026-08-31",
            dateModified: "2026-08-31",
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
      eyebrow="Éducation financière & Autonomie"
      title="Comment aider son enfant à gérer son argent de poche (guide par âge et méthode pratique)"
      intro="Donner de l'argent de poche soulève souvent le doute. À quel âge débuter ? Combien verser sans déséquilibrer le budget ? Que répondre lorsqu'un enfant liquide tout dès le premier jour ? L'argent de poche n'a rien d'un salaire ni d'une arme de chantage : il sert d'atelier d'essai pour apprendre à choisir, patienter et mesurer la valeur du travail."
      updated="31 août 2026"
      readingTime="7 min"
      path={PATH}
      related={[
        {
          label: "Développer l'autonomie à la maison",
          to: "/guides/autonomie-responsabilite-maison",
        },
        {
          label: "Défi créatif face aux marques",
          to: "/guides/sac-a-dos-marques-challenge-creativite-enfant",
        },
        {
          label: "12 défis stimulants pour ados",
          to: "/guides/defis-pour-adolescents",
        },
        {
          label: "Discipline positive sans punition",
          to: "/guides/discipline-positive-sans-punition",
        },
        {
          label: "Les 9 formes d'intelligence",
          to: "/guides/intelligences-multiples-gardner",
        },
      ]}
    >
      <img
        src="/guides/og-argent-poche.jpg"
        alt="Enfant souriant apprenant à gérer son argent de poche avec des tirelires transparentes à la maison"
        width="1200"
        height="630"
        loading="lazy"
        decoding="async"
        className="my-6 aspect-video w-full rounded-3xl border border-ink/10 object-cover shadow-lg"
      />

      <h2>1. Un outil d'apprentissage, pas un salaire</h2>
      <p>
        L'argent reste tabou dans bien des foyers. On craint d'éveiller la cupidité ou de monnayer des gestes élémentaires. Erreur de diagnostic. L'argent de poche vise un but précis : <strong>rendre les choix visibles</strong>.
      </p>
      <p>
        Tant que les billets dorment dans le portefeuille des parents, tout paraît gratuit et infini. Dès que l'enfant manipule sa propre somme, le monde change. Chaque dépense impose un renoncement : <em>« Acheter ces autocollants aujourd'hui, c'est reporter le ballon de samedi prochain »</em>.
      </p>
      <p>
        Cette pratique quotidienne mobilise deux facultés fondamentales :
      </p>
      <ul>
        <li><strong>L'intelligence logico-mathématique :</strong> dénombrer les pièces, calculer le rendu et comparer deux prix.</li>
        <li><strong>L'intelligence intrapersonnelle :</strong> dompter l'impulsion d'achat, nommer ses priorités et savourer l'effort différé (explorez notre synthèse sur{" "}
        <a href="/guides/intelligences-multiples-gardner">les 9 formes d'intelligence de Gardner</a>).</li>
      </ul>

      <h2>2. À quel âge débuter et quels montants fixer ?</h2>
      <p>
        Oubliez les barèmes rigides. Le montant idéal dépend des habitudes du foyer, pas d'une règle théorique. Voici un cadre repère éprouvé :
      </p>

      <div className="my-6 overflow-x-auto">
        <table className="w-full min-w-[540px] border-collapse rounded-2xl border border-ink/10 bg-white text-left text-sm shadow-sm">
          <thead className="border-b border-ink/10 bg-surface text-ink">
            <tr>
              <th className="p-4 font-bold">Âge</th>
              <th className="p-4 font-bold">Fréquence</th>
              <th className="p-4 font-bold">Repères indicatifs</th>
              <th className="p-4 font-bold">Apprentissage visé</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10 text-ink/80">
            <tr>
              <td className="p-4 font-semibold text-ink">6 – 8 ans (CP/CE1)</td>
              <td className="p-4">Chaque semaine à jour fixe</td>
              <td className="p-4">500 à 1 000 FCFA / 1 à 2 €</td>
              <td className="p-4">Manipuler la monnaie physique et apprivoiser le temps court.</td>
            </tr>
            <tr>
              <td className="p-4 font-semibold text-ink">9 – 11 ans (CM1/CM2)</td>
              <td className="p-4">Tous les 15 jours</td>
              <td className="p-4">2 000 à 3 000 FCFA / 3 à 5 €</td>
              <td className="p-4">Anticiper sur deux semaines et piloter un premier petit projet.</td>
            </tr>
            <tr>
              <td className="p-4 font-semibold text-ink">12 – 14 ans (Collège)</td>
              <td className="p-4">Mensuel</td>
              <td className="p-4">5 000 à 10 000 FCFA / 10 à 20 €</td>
              <td className="p-4">Prendre en charge ses sorties entre amis et ses envies personnelles.</td>
            </tr>
            <tr>
              <td className="p-4 font-semibold text-ink">15 – 17 ans (Lycée)</td>
              <td className="p-4">Mensuel (Mobile / Compte)</td>
              <td className="p-4">10 000 à 25 000 FCFA / 20 à 40 €</td>
              <td className="p-4">Gérer son forfait, ses vêtements d'agrément et son épargne.</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h3>6 à 8 ans : manipuler les pièces et ancrer le rythme</h3>
      <p>
        À cet âge, le mois ressemble à une éternité. Donnez une somme modeste chaque dimanche matin. Privilégiez des pièces sonnantes et trébuchantes que l'enfant peut empiler, trier et ranger dans une boîte.
      </p>

      <h3>9 à 11 ans : premier budget autonome sans intrusion</h3>
      <p>
        Posez le pacte de non-ingérence. L'argent versé couvre les petits plaisirs convenus. Les repas, les soins et les manuels restent sous la responsabilité des parents.
      </p>

      <h3>12 à 16 ans : le virage du numérique</h3>
      <p>
        Au collège et au lycée, le rythme mensuel prépare directement à la vie adulte. Les solutions mobiles (Wave, Orange Money, cartes de paiement pour ados) évitent les pertes d'espèces, mais exigent un apprentissage : regarder son solde avant d'agir (consultez nos{" "}
        <a href="/guides/defis-pour-adolescents">12 défis stimulants pour adolescents</a>).
      </p>

      <h2>3. La méthode des 3 pots : organiser sans brider</h2>
      <p>
        Laisser toute la somme dans une unique poche conduit droit à la frustration. Adoptez la technique des **trois tirelires** :
      </p>

      <div className="my-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-ink/10 bg-surface/60 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-bold text-ink">
            <Coins className="h-5 w-5 text-brand" />
            Pot 1 : Plaisir libre (50%)
          </div>
          <p className="text-sm leading-relaxed text-ink/80">
            Une totale liberté d'usage. Qu'il achète une friandise ou une figurine, aucune justification n'est exigée.
          </p>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-surface/60 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-bold text-ink">
            <PiggyBank className="h-5 w-5 text-brand" />
            Pot 2 : Projet & Épargne (40%)
          </div>
          <p className="text-sm leading-relaxed text-ink/80">
            Réservé aux achats plus ambitieux. L'enfant découvre le plaisir de patienter pour s'offrir un objet durable (voir nos conseils sur{" "}
            <a href="/guides/sac-a-dos-marques-challenge-creativite-enfant">le co-financement face aux marques</a>).
          </p>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-surface/60 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-bold text-ink">
            <HeartHandshake className="h-5 w-5 text-brand" />
            Pot 3 : Partage & Cadeaux (10%)
          </div>
          <p className="text-sm leading-relaxed text-ink/80">
            Préparer l'anniversaire d'un proche ou participer à un projet solidaire. La générosité s'exerce dès le plus jeune âge.
          </p>
        </div>
      </div>

      <h2>4. Corvées et bonnes notes : faut-il payer ?</h2>
      <p>
        Monnayer les devoirs ou la participation aux tâches ménagères détruit l'esprit d'équipe familial. La maison n'est pas un marché d'entreprises.
      </p>

      <div className="my-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-5">
          <div className="mb-2 flex items-center gap-2 font-bold text-red-700">
            <AlertCircle className="h-5 w-5 shrink-0" />
            Ce qui relève du devoir familial (gratuit)
          </div>
          <ul className="space-y-2 text-sm text-ink/80">
            <li>• Débarrasser son couvert, ranger son lit, plier son linge.</li>
            <li>• Faire ses leçons et réviser pour ses contrôles.</li>
            <li>• Veiller sur son jeune frère ou sa sœur quelques minutes.</li>
          </ul>
        </div>

        <div className="rounded-2xl border border-brand/20 bg-brand/5 p-5">
          <div className="mb-2 flex items-center gap-2 font-bold text-brand">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            Ce qui mérite une rétribution ponctuelle
          </div>
          <ul className="space-y-2 text-sm text-ink/80">
            <li>• Les chantiers d'envergure (désherbage complet du jardin, nettoyage du garage).</li>
            <li>• Les créations artisanales vendues lors d'un vide-grenier ou d'un rassemblement familial.</li>
            <li>• Réparer un meuble ou customiser un équipement utile.</li>
          </ul>
        </div>
      </div>
      <p>
        Pour installer ces routines sans épuiser son autorité, découvrez notre démarche d'
        <a href="/guides/autonomie-responsabilite-maison">autonomie et de responsabilité à la maison</a>.
      </p>

      <h2>5. Tout dépensé le premier jour : que faire ?</h2>
      <p>
        Le cas classique : l'argent arrive samedi matin, et dès l'après-midi, la tirelire est vide. Trois jours plus tard surgit la demande d'avance.
      </p>
      <p>
        Votre réaction scellera la leçon :
      </p>
      <ol className="my-6 space-y-3">
        <li>
          <strong>1. Refuser toute avance financière :</strong> Renflouer le compte revient à enseigner que l'argent se régénère par magie. Maintenez fermement le cadre fixé.
        </li>
        <li>
          <strong>2. Écarter les remarques sarcastiques :</strong> Bannissez les reproches du type <em>« Tu jettes tout par les fenêtres »</em>. Privilégiez un dialogue apaisé selon les repères de{" "}
          <a href="/guides/discipline-positive-sans-punition">discipline positive sans punition</a>.
        </li>
        <li>
          <strong>3. Débriefer calmement :</strong> Dites simplement : <em>« Ton budget est épuisé jusqu'à la fin du mois. Réfléchissons ensemble à la façon de mieux étaler tes dépenses la prochaine fois »</em>.
        </li>
      </ol>

      <div className="my-8 rounded-3xl border border-brand/20 bg-brand/5 p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <Sparkles className="h-6 w-6 text-brand" />
          <h3 className="text-xl font-bold text-ink">
            Défi 10 minutes : fabriquer les tirelires d'aventurier
          </h3>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-ink/80">
          Rassemblez trois bocaux en verre ou trois boîtes à chaussures. Invitez l'enfant à les décorer et à coller trois étiquettes : <strong>Plaisir immédiat</strong>, <strong>Grand projet</strong>, <strong>Partage</strong>. Fixez son premier objectif d'achat et glissez la première pièce.
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <Button asChild size="lg" className="rounded-full">
            <Link to="/auth">
              Lancer des défis d'action avec Génizio
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full">
            <Link to="/guides/activites-manuelles-enfant">
              Explorer nos activités créatives
            </Link>
          </Button>
        </div>
      </div>

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

export default Route;
