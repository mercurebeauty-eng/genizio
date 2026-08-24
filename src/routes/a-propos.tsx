import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, MessageCircle, Sparkles, Brain, Compass, Target } from "lucide-react";
import { pageMeta, jsonLdScript, breadcrumbJsonLd } from "@/lib/seo";

export const Route = createFileRoute("/a-propos")({
  head: () => {
    const meta = pageMeta({
      title: "À propos de Génizio — Le manifeste pour l'éducation à l'ère de l'IA",
      description:
        "Découvrez la vision de Génizio : renverser le paradigme pédagogique, préparer les enfants aux mutations de l'IA par l'action réelle et révéler le potentiel de la jeunesse africaine.",
      path: "/a-propos",
    });
    return {
      ...meta,
      scripts: [
        jsonLdScript(
          breadcrumbJsonLd([
            { name: "Accueil", path: "/" },
            { name: "À propos", path: "/a-propos" },
          ]),
        ),
      ],
    };
  },
  component: AProposPage,
});

function AProposPage() {
  return (
    <div className="min-h-dvh bg-surface text-ink antialiased">
      <header className="border-b border-ink/10 bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <Link
            to="/"
            className="flex items-center gap-2 font-display text-xl font-extrabold tracking-tight text-brand"
          >
            <img
              src="/favicon-96x96.png"
              alt="Logo Génizio"
              width="28"
              height="28"
              className="h-7 w-7"
            />
            GÉNIZIO
          </Link>
          <Link
            to="/auth"
            className="press-brand rounded-full bg-brand px-5 py-2.5 text-xs font-bold text-white"
          >
            Créer un compte
          </Link>
        </div>
      </header>

      <article className="mx-auto max-w-3xl px-6 py-12 md:py-20">
        <nav
          aria-label="Fil d'Ariane"
          className="mb-8 flex items-center gap-1.5 text-xs font-bold text-ink/50"
        >
          <Link to="/" className="hover:text-brand">
            Accueil
          </Link>
          <span aria-hidden>/</span>
          <span className="text-ink/70">À propos</span>
        </nav>

        <p className="mb-3 text-xs font-black uppercase tracking-widest text-brand">
          Manifeste Pédagogique
        </p>
        <h1 className="font-display text-balance text-3xl font-extrabold leading-[1.1] md:text-5xl">
          Préparer les enfants à un monde que nous ne connaissons pas encore.
        </h1>

        <div className="prose-genizio mt-10 space-y-8">
          <div className="rounded-3xl border border-brand/20 bg-brand/5 p-6 md:p-8">
            <p className="text-base font-semibold leading-relaxed text-ink/90 italic">
              « Pendant des siècles, nous avons surtout cherché à savoir ce qu'un enfant avait
              retenu. Le défi éducatif de l'ère de l'intelligence artificielle est de comprendre ce
              qu'il est capable de faire lorsque personne ne lui donne la réponse. »
            </p>
          </div>

          <h2>1. Le constat : L'urgence d'une nouvelle éducation face à l'IA</h2>
          <p>
            Le monde professionnel connaît la mutation la plus rapide de son histoire. Chaque
            semaine, de nouveaux modèles d'intelligence artificielle automatisent des tâches qui
            exigeaient hier des années d'études : rédiger, synthétiser, traduire, coder une
            application, analyser des masses de données ou générer des visuels.
          </p>
          <p>
            Pourtant, le système éducatif traditionnel continue de former les enfants selon les
            règles du siècle passé : mémoriser une leçon, appliquer une procédure standardisée et
            restituer des réponses connues lors d'un examen théorique. Des milliers d'élèves sortent
            avec des diplômes identiques pour des métiers en cours de disparition, risquant de se
            retrouver sans repères sur le marché mondial.
          </p>
          <p>
            <strong>La valeur humaine s'est déplacée.</strong> Ce qui devient rare et décisif, ce
            n'est plus d'être une banque de données vivante : c'est de savoir observer le monde
            réel, identifier les vrais problèmes, prendre des initiatives, faire preuve d'esprit
            critique, collaborer et savoir concevoir des solutions avec l'IA.
          </p>

          <h2>2. Notre rupture : Partir de la pratique pour donner soif de théorie</h2>
          <p>
            L'ancien paradigme consiste à assommer l'élève de théories abstraites en espérant qu'il
            trouve un jour l'occasion de les appliquer. Génizio inverse totalement la logique :
          </p>
          <ul className="space-y-2 list-disc pl-5 font-medium text-ink/80">
            <li>
              <strong>L'action d'abord :</strong> L'enfant commence par affronter un défi concret
              ancré dans le réel (concevoir un système d'irrigation avec des bouteilles recyclées,
              calculer le prix de revient d'une boisson et la vendre, fabriquer un pont miniature
              sans colle).
            </li>
            <li>
              <strong>La friction du réel :</strong> En manipulant et en se heurtant aux contraintes
              physiques, matérielles ou économiques, l'enfant commet des erreurs, teste des
              hypothèses et affine sa réflexion.
            </li>
            <li>
              <strong>La théorie utile :</strong> C'est parce qu'il veut faire fonctionner son
              projet qu'il ressent le besoin naturel et viscéral d'aller chercher la formule
              mathématique, le principe physique ou la structure linguistique. La théorie cesse
              d'être une corvée imposée : elle devient son outil de puissance.
            </li>
          </ul>

          <h2>3. La revanche des intelligences non conventionnelles</h2>
          <p>
            Le système scolaire classique a historiquement récompensé une frange étroite des profils
            : ceux dotés d'une forte mémoire académique et d'une aisance logico-linguistique
            formelle. Tous les autres — les profils manuels, spatiaux, commerciaux, relationnels ou
            créatifs — ont souvent été marginalisés ou qualifiés de « moyens ».
          </p>
          <p>
            Aujourd'hui, l'IA exécute la théorie formelle à coût nul. Par un renversement
            historique, ce sont précisément les qualités autrefois délaissées qui deviennent les
            atouts maîtres : l'ingéniosité pratique, le sens de la négociation, l'intelligence
            spatiale, l'artisanat et l'audace entrepreneuriale.
          </p>
          <p>
            En nous fondant sur les <strong>9 intelligences de Howard Gardner</strong>, nous
            refusons de réduire un enfant à son rang dans une classe. Nous cartographions son
            potentiel complet pour que chaque profil trouve sa voie d'excellence.
          </p>

          <h2>4. Complémentarité avec l'école & Hybridation avec l'IA (Naya)</h2>
          <p>
            Génizio ne s'oppose pas à l'école. L'école transmet le socle fondamental des
            connaissances. Génizio explore ce que l'enfant peut en faire.
          </p>
          <p>
            Dans cet environnement, <strong>Naya</strong>, notre IA pédagogique bienveillante, ne
            donne jamais de réponses toutes faites. Elle agit comme un entraîneur intellectuel :
            elle pose des questions socratiques, invite à trouver les failles d'un raisonnement,
            encourage après un échec et guide l'enfant pour qu'il devienne un <em>architecte</em>{" "}
            qui pilote la machine, et non un exécutant passif.
          </p>

          <h2>5. La méthode de la preuve par l'action</h2>
          <p>
            Génizio bannit les questionnaires d'évaluation remplis par des tiers. La méthode repose
            sur la preuve tangible :
          </p>
          <ol className="space-y-2 list-decimal pl-5 font-medium text-ink/80">
            <li>L'enfant réalise son défi dans son environnement familial ou son quartier.</li>
            <li>Le parent valide et photographie la réalisation concrète.</li>
            <li>
              L'IA et nos outils pédagogiques analysent la démarche et mettent à jour la
              cartographie dynamique des compétences au fil des semaines.
            </li>
          </ol>

          <h2>6. Le Fondateur & l'Ambition Panafricaine</h2>
          <p>
            Génizio a été pensé et fondé par <strong>Cheick Mohamed TRAORE</strong> à Abidjan, en
            Côte d'Ivoire, avec une conviction chevillée au corps : l'Afrique détient la jeunesse la
            plus dynamique au monde, mais son capital humain est encore bridé par des formats
            d'orientation dépassés.
          </p>
          <p>
            Notre mission est d'équiper les familles africaines et de la diaspora des instruments
            les plus exigeants et les plus innovants pour que leurs enfants ne soient pas seulement
            consommateurs des technologies de demain, mais les bâtisseurs, inventeurs et leaders de
            leur époque.
          </p>

          <h2>7. Ce que Génizio n'est pas</h2>
          <p>
            Génizio ne pose aucun diagnostic médical ou neuropsychologique, ne calcule pas de
            quotient intellectuel et ne remplace ni les enseignants, ni les médecins, ni les
            psychologues. Il ne classe pas les enfants les uns contre les autres. C'est une
            infrastructure d'observation formative, d'entraînement pratique et de renforcement de
            l'estime de soi.
          </p>
        </div>

        <div className="mt-12 flex flex-col gap-4 sm:flex-row sm:items-center">
          <a
            href="https://wa.me/33606433148?text=Bonjour%2C%20j%27ai%20une%20question%20sur%20G%C3%A9nizio."
            target="_blank"
            rel="noopener noreferrer"
            className="press-brand inline-flex items-center justify-center gap-2 rounded-2xl bg-[#25D366] px-6 py-3.5 text-sm font-bold text-white shadow-md"
          >
            <MessageCircle className="size-4" aria-hidden />
            Échanger sur WhatsApp avec l'équipe
          </a>
        </div>

        <aside className="mt-16 rounded-3xl border border-ink/10 bg-white p-8 shadow-sm">
          <h2 className="font-display text-xl font-extrabold text-ink">
            Passez de la réflexion à l'action
          </h2>
          <p className="mt-2 text-sm font-medium leading-relaxed text-ink/70">
            Offrez à votre enfant un premier défi adapté à ses forces naturelles et observez sa
            manière de résoudre des situations réelles. Le premier profil enfant est gratuit pour
            toujours.
          </p>
          <Link
            to="/auth"
            className="press-brand mt-5 inline-flex items-center gap-2 rounded-2xl bg-brand px-6 py-3 text-sm font-bold text-white"
          >
            Créer le profil gratuit de mon enfant
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </aside>
      </article>

      <footer className="border-t border-ink/10 bg-white/30 px-6 py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-xs font-bold text-ink/50 md:flex-row">
          <span>© {new Date().getFullYear()} Génizio — Abidjan, Côte d'Ivoire</span>
          <div className="flex flex-wrap justify-center gap-5 uppercase tracking-wider">
            <Link to="/guides" className="hover:text-brand">
              Guides
            </Link>
            <Link to="/tarifs" className="hover:text-brand">
              Tarifs
            </Link>
            <Link to="/remboursements" className="hover:text-brand">
              Remboursements
            </Link>
            <Link to="/privacy" className="hover:text-brand">
              Confidentialité
            </Link>
            <Link to="/terms" className="hover:text-brand">
              CGU
            </Link>
            <Link to="/mentions-legales" className="hover:text-brand">
              Mentions légales
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
