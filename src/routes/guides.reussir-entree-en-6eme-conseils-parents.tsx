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
  GraduationCap,
  Calendar,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  BookOpen,
  Users,
} from "lucide-react";
import { Link } from "@tanstack/react-router";

const PATH = "/guides/reussir-entree-en-6eme-conseils-parents";

const FAQ = [
  {
    question: "Faut-il acheter un smartphone dès l'entrée en 6ème ?",
    answer:
      "Non. Le smartphone n'est pas requis pour la scolarité. Si les trajets l'exigent, un téléphone basique d'appel suffit largement pour garder le contact sans l'addiction aux réseaux sociaux.",
  },
  {
    question: "Combien de temps par jour un élève de 6ème doit-il consacrer à ses devoirs ?",
    answer:
      "Comptez 45 minutes en moyenne. Au-delà d'une heure de travail effectif le soir, la fatigue cognitive bloque la mémorisation et crée un rejet de l'école. Si les leçons s'éternisent chaque jour, le problème vient souvent de l'organisation : fractionnez les révisions en blocs de 20 minutes séparés par une courte pause active.",
  },
  {
    question: "Comment réagir si mon enfant panique à l'idée de se perdre dans les couloirs ?",
    answer:
      "Rassurez-le. Les surveillants et les professeurs se montrent très attentifs avec les sixièmes en septembre. Glissez un plan annoté du collège dans son carnet pour apaiser ses doutes.",
  },
  {
    question: "Mon enfant ne connaît personne au collège : comment l'aider à se faire des copains ?",
    answer:
      "Rappelez-lui que presque tous les nouveaux sixièmes arrivent avec la même appréhension. Proposez-lui de s'inscrire dès la deuxième semaine à un club du midi (association sportive, chorale, club d'échecs ou de sciences). Les affinités se créent beaucoup plus vite autour d'un jeu ou d'un projet partagé que sous le regard intimidant de la grande cour.",
  },
  {
    question: "Le cartable pèse une tonne : comment alléger la charge concrètement ?",
    answer:
      "Pesez son sac : il ne doit pas excéder 10 % du poids corporel de l'enfant. Remplacer les gros classeurs par deux pochettes légères et des protège-documents souples fait gagner plus d'un kilo. Faites le tri chaque soir à heure fixe pour ne laisser que le matériel du lendemain, et vérifiez avec l'établissement si l'attribution d'un casier ou le prêt d'un second jeu de manuels à la maison est possible.",
  },
  {
    question: "Que faire si mon enfant a peur des plus grands ou du harcèlement ?",
    answer:
      "Écoutez ses inquiétudes sans minimiser ses émotions. Expliquez clairement le fonctionnement de l'équipe de vie scolaire : les surveillants, la CPE et les délégués d'élèves veillent en permanence. Donnez-lui une consigne claire et rassurante : si un mot ou un geste le blesse à répétition, il ne doit jamais garder le secret et doit s'adresser sans attendre au professeur principal ou à la vie scolaire.",
  },
  {
    question: "Comment réagir face à une baisse de moyenne au premier trimestre ?",
    answer:
      "Cette baisse est habituelle et reflète la découverte du rythme de travail du collège. Ne dramatisez pas le chiffre. Regardez plutôt ensemble la consigne de chaque devoir : l'erreur vient-elle d'une leçon apprise superficiellement ou d'un énoncé lu trop vite ? Aidez-le à tester une révision active en vous expliquant le cours avec ses propres mots.",
  },
];

export const Route = createFileRoute("/guides/reussir-entree-en-6eme-conseils-parents")({
  head: () => {
    const meta = pageMeta({
      title: "Entrée en 6ème : guide pour une rentrée sereine | Génizio",
      description:
        "Emploi du temps, cartable, devoirs et autonomie : découvrez nos conseils concrets pour aider votre enfant à réussir son entrée en 6ème sans stress.",
      path: PATH,
      image: "/guides/og-entree-6eme.jpg",
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
            { name: "Réussir l'entrée en 6ème", path: PATH },
          ]),
        ),
        jsonLdScript(
          articleJsonLd({
            headline:
              "Réussir l'entrée en 6ème : le guide pratique des parents pour une rentrée au collège sereine",
            description:
              "Emploi du temps, cartable, devoirs et autonomie : découvrez nos conseils concrets pour aider votre enfant à réussir son entrée en 6ème sans stress.",
            path: PATH,
            image: "/guides/og-entree-6eme.jpg",
            datePublished: "2026-08-31",
            dateModified: "2026-09-04",
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
      eyebrow="Collège & Autonomie"
      title="Réussir l'entrée en 6ème : le guide pratique des parents pour une rentrée au collège sereine"
      intro="Passer du cocon de l'école primaire aux couloirs du collège marque une étape majeure. Multiplicité des professeurs, cartable lourd, emploi du temps en alternance : le changement bouscule toute la famille. Voici la méthode éprouvée pour installer les bons repères dès la première semaine, sans angoisse ni épuisement."
      updated="31 août 2026"
      readingTime="8 min"
      path={PATH}
      related={[
        {
          label: "Aider son enfant à réussir à l'école",
          to: "/guides/reussite-scolaire-aider-enfant",
        },
        {
          label: "Développer l'autonomie à la maison",
          to: "/guides/autonomie-responsabilite-maison",
        },
        {
          label: "Prendre la parole avec assurance",
          to: "/guides/timidite-confiance-prise-de-parole",
        },
        {
          label: "Défi créatif face aux marques",
          to: "/guides/sac-a-dos-marques-challenge-creativite-enfant",
        },
        {
          label: "Gérer son premier argent de poche",
          to: "/guides/comment-gerer-argent-de-poche-enfant",
        },
      ]}
    >
      <img
        src="/guides/og-entree-6eme.jpg"
        alt="Élève souriant préparant son cartable et son emploi du temps pour la rentrée en sixième"
        width="1200"
        height="630"
        loading="lazy"
        decoding="async"
        className="my-6 aspect-video w-full rounded-3xl border border-ink/10 object-cover shadow-lg"
      />

      <h2>1. Le grand saut CM2 – 6ème : comprendre ce qui change vraiment</h2>
      <p>
        En primaire, l'élève évoluait auprès d'un maître unique. Au collège, le cadre s'élargit brutalement avec près de dix professeurs aux exigences divergentes, des sonneries qui dictent chaque heure et des couloirs où se croisent des centaines d'inconnus.
      </p>
      <p>
        L'adaptation prend du temps.
      </p>

      <div className="my-6 overflow-x-auto">
        <table className="w-full min-w-[540px] border-collapse rounded-2xl border border-ink/10 bg-white text-left text-sm shadow-sm">
          <thead className="border-b border-ink/10 bg-surface text-ink">
            <tr>
              <th className="p-4 font-bold">Domaine</th>
              <th className="p-4 font-bold">À l'école primaire (CM2)</th>
              <th className="p-4 font-bold">Au collège (6ème)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/10 text-ink/80">
            <tr>
              <td className="p-4 font-semibold text-ink">Enseignants</td>
              <td className="p-4">1 enseignant principal (parfois 2).</td>
              <td className="p-4">8 à 10 professeurs avec des attentes distinctes.</td>
            </tr>
            <tr>
              <td className="p-4 font-semibold text-ink">Espace de classe</td>
              <td className="p-4">Une classe fixe toute la journée.</td>
              <td className="p-4">Changement de salle à chaque heure selon les matières.</td>
            </tr>
            <tr>
              <td className="p-4 font-semibold text-ink">Emploi du temps</td>
              <td className="p-4">Horaires stables chaque jour.</td>
              <td className="p-4">Heures creuses, semaines paires/impaires (A/B).</td>
            </tr>
            <tr>
              <td className="p-4 font-semibold text-ink">Devoirs à la maison</td>
              <td className="p-4">Donnés du jour pour le lendemain.</td>
              <td className="p-4">Planifiés d'une semaine sur l'autre (anticipation exigée).</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2>2. Dompter l'emploi du temps et le cartable : la méthode zéro oubli</h2>
      <p>
        Peur d'oublier un cahier ? Le sac se remplit de tous les manuels et pèse rapidement dix kilos.
      </p>
      <p>
        Soulagez son dos grâce à cette organisation visuelle en trois gestes :
      </p>

      <div className="my-6 grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-ink/10 bg-surface/60 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-bold text-ink">
            <BookOpen className="h-5 w-5 text-brand" />
            1. Le code couleur
          </div>
          <p className="text-sm leading-relaxed text-ink/80">
            Associez par exemple une pochette bleue au français et un protège-livre vert aux mathématiques, de sorte que l'enfant repère ses affaires en un clin d'œil sans ouvrir son cartable.
          </p>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-surface/60 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-bold text-ink">
            <Calendar className="h-5 w-5 text-brand" />
            2. Le planning Semaine A / B
          </div>
          <p className="text-sm leading-relaxed text-ink/80">
            Affichez son emploi du temps en très grand format au-dessus de sa table de travail, en surlignant d'un coup de feutre fluo les cours qui alternent selon les quinzaines.
          </p>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-surface/60 p-5 shadow-sm">
          <div className="mb-2 flex items-center gap-2 font-bold text-ink">
            <CheckCircle2 className="h-5 w-5 text-brand" />
            3. Le sac bouclé la veille
          </div>
          <p className="text-sm leading-relaxed text-ink/80">
            Le cartable se prépare toujours avant le dîner, ce qui évite les paniques matinales où l'on découvre à sept heures et demie qu'il manque la blouse de sciences.
          </p>
        </div>
      </div>

      <h2>3. Devoirs du soir : installer le réflexe de l'anticipation</h2>
      <p>
        Attendre la veille pour réviser un contrôle d'histoire conduit droit aux larmes du dimanche soir.
      </p>
      <p>
        Découpez le travail en trois blocs clairs :
      </p>
      <ul>
        <li><strong>L'urgence du lendemain :</strong> relire les cours du jour et faire les exercices courts demandés pour le cours suivant.</li>
        <li><strong>L'avance sur trois jours :</strong> lire quelques pages ou faire un exercice dont l'échéance tombe plus tard dans la semaine.</li>
        <li><strong>Le projet du week-end :</strong> répartir les révisions lourdes sur deux séances de 25 minutes plutôt qu'un marathon de deux heures (retrouvez nos repères dans notre guide sur{" "}
        <a href="/guides/reussite-scolaire-aider-enfant">la réussite scolaire sans stress</a>).</li>
      </ul>

      <h2>4. Vie sociale et confiance : trouver sa place parmi les grands</h2>
      <p>
        Le collège rassemble des élèves de 10 à 15 ans. Côtoyer des troisièmes dans la cour intimide parfois.
      </p>
      <p>
        Deux réflexes aident à fortifier son assurance :
      </p>

      <div className="my-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5">
          <div className="mb-2 flex items-center gap-2 font-bold text-ink">
            <Users className="h-5 w-5 text-brand" />
            Écouter sans dramatiser
          </div>
          <p className="text-sm leading-relaxed text-ink/80">
            Le soir, demandez-lui avec qui il a discuté à la cantine ou ce qui l'a fait sourire, plutôt que de l'assaillir immédiatement de questions sur ses notes. Les amitiés solides prennent du temps.
          </p>
        </div>

        <div className="rounded-2xl border border-ink/10 bg-surface/50 p-5">
          <div className="mb-2 flex items-center gap-2 font-bold text-ink">
            <GraduationCap className="h-5 w-5 text-brand" />
            Valoriser ses passions
          </div>
          <p className="text-sm leading-relaxed text-ink/80">
            Encouragez-le à s'inscrire à l'Association Sportive ou à un club d'échecs du collège : c'est le moyen le plus direct pour nouer des liens autour d'un intérêt partagé.
          </p>
        </div>
      </div>
      <p>
        Si votre enfant hésite à s'exprimer, explorez notre dossier pour{" "}
        <a href="/guides/timidite-confiance-prise-de-parole">développer l'aisance à l'oral</a>.
      </p>

      <h2>5. Les premières notes : garder le cap sans paniquer</h2>
      <p>
        Fin octobre tombent les premiers contrôles. Une baisse d'un point sur la moyenne générale est fréquente au premier trimestre. Rien d'alarmant.
      </p>
      <p>
        Trois règles simples pour réagir :
      </p>
      <ol className="my-6 space-y-3">
        <li>
          <strong>Distinguer la méthode de la capacité :</strong> Une mauvaise note en sixième sanctionne un manque d'organisation, jamais un manque d'intelligence.
        </li>
        <li>
          <strong>Corriger sans s'énerver :</strong> Analysez ensemble les erreurs selon les principes de{" "}
          <a href="/guides/discipline-positive-sans-punition">discipline positive sans punition</a>.
        </li>
        <li>
          <strong>Fixer un repère de progrès :</strong> Sur le contrôle suivant, ciblez un point précis comme le soin ou la relecture.
        </li>
      </ol>

      <div className="my-8 rounded-3xl border border-brand/20 bg-brand/5 p-6 sm:p-8">
        <div className="flex items-center gap-3">
          <Sparkles className="h-6 w-6 text-brand" />
          <h3 className="text-xl font-bold text-ink">
            Défi 10 minutes à la maison : Le jeu de piste de l'emploi du temps
          </h3>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-ink/80">
          Prenez son planning de la semaine. Lancez trois défis chrono : <em>« Trouve la salle de SVT du mardi »</em>, <em>« Quel cahier faut-il jeudi matin ? »</em>, <em>« Quel cours alterne en semaine B ? »</em>. Un jeu rapide pour ancrer ses repères d'autonomie.
        </p>
        <div className="mt-6 flex flex-wrap gap-4">
          <Button asChild size="lg" className="rounded-full">
            <Link to="/auth">
              Découvrir les défis Génizio
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-full">
            <Link to="/guides/autonomie-responsabilite-maison">
              Voir nos repères d'autonomie
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
