import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, MessageCircle } from "lucide-react";
import { pageMeta, jsonLdScript, breadcrumbJsonLd } from "@/lib/seo";

export const Route = createFileRoute("/a-propos")({
  head: () => {
    const meta = pageMeta({
      title: "À propos de Génizio — comprendre et développer votre enfant",
      description:
        "Génizio aide chaque enfant à construire son propre chemin de développement, du Sénégal à la Côte d'Ivoire : défis concrets à la maison, 9 intelligences de Howard Gardner, compétences et réalisations documentées.",
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
            <img src="/favicon-96x96.png" alt="Logo Génizio" className="h-7 w-7" />
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

        <p className="mb-3 text-xs font-black uppercase tracking-widest text-brand">À propos</p>
        <h1 className="font-display text-balance text-3xl font-extrabold leading-[1.1] md:text-5xl">
          Pourquoi Génizio existe
        </h1>

        <div className="prose-genizio mt-8">
          <h2>Notre mission</h2>
          <p>
            Génizio aide chaque enfant à construire son propre chemin de développement — à travers
            des défis concrets à réaliser à la maison, fondés sur les 9 intelligences de Howard
            Gardner — et donne aux parents les moyens de transformer les capacités de leur enfant
            en compétences, en confiance et en réalisations. L'idée de départ : le programme
            scolaire ne mesure qu'une petite partie de ce dont un enfant est capable. Génizio
            cherche le reste, et lui donne un chemin.
          </p>
          <p>
            Beaucoup d'enfants — surtout en Afrique francophone et dans la diaspora — grandissent
            avec des capacités réelles que personne ne regarde : l'habileté manuelle, le sens de la
            négociation, l'esprit d'entreprise, la capacité à fédérer un groupe. L'école valorise
            presque exclusivement le langage et la logique. Génizio donne aux autres formes
            d'intelligence un cadre pour se développer — et aux parents, un moyen de les voir et
            de les accompagner.
          </p>
          <p>
            En une phrase : à l'école, votre enfant apprend ce que le système lui enseigne. Avec
            Génizio, vous découvrez ce dont il a besoin pour devenir lui-même.
          </p>

          <h2>Notre méthode : observer ce que l'enfant fait, pas ce qu'il déclare</h2>
          <p>
            La méthode tient en trois gestes simples. L'application propose à l'enfant un défi
            concret adapté à son âge et à ses centres d'intérêt : fabriquer, mesurer, cuisiner,
            vendre, organiser, réparer. Le parent photographie le résultat, preuve à l'appui. Et la
            carte des talents de l'enfant se construit à partir de ces réalisations réelles, jamais
            d'un questionnaire rempli par un adulte.
          </p>
          <p>
            C'est une approche du développement par la preuve plutôt que par l'intuition : ce que
            l'enfant choisit, ce qu'il persévère à terminer, ce vers quoi il revient spontanément en
            dit plus long que n'importe quel test.
          </p>

          <h2>Ce que Génizio n'est pas</h2>
          <p>
            Génizio ne pose aucun diagnostic, ne mesure aucun QI et ne remplace ni un psychologue,
            ni un enseignant, ni un médecin. Il n'est pas non plus un cours particulier déguisé ni
            un outil de classement des enfants entre eux. C'est un outil d'observation et de mise en
            confiance : il crée des occasions de réussir et documente ce qui est réussi.
          </p>

          <h2>Le fondateur</h2>
          <p>
            Génizio est fondé par <strong>Cheick Mohamed TRAORE</strong>. Les détails juridiques de
            la structure porteuse sont précisés dans les{" "}
            <Link to="/mentions-legales" className="text-brand underline">
              mentions légales
            </Link>
            .
          </p>

          <h2>Où nous intervenons</h2>
          <p>
            Génizio s'adresse aux familles d'Afrique francophone et de la diaspora, principalement
            en Côte d'Ivoire, au Sénégal et en France. Chaque défi est conçu pour se réaliser avec
            du matériel déjà présent à la maison — jamais avec un achat obligatoire — et
            l'accompagnement passe par WhatsApp, l'outil que les familles de la zone utilisent déjà
            au quotidien.
          </p>

          <h2>Nous contacter</h2>
          <p>
            La voie la plus rapide est WhatsApp. L'adresse email de l'éditeur est aussi disponible
            sur la page{" "}
            <Link to="/mentions-legales" className="text-brand underline">
              mentions légales
            </Link>
            .
          </p>
        </div>

        <a
          href="https://wa.me/33606433148?text=Bonjour%2C%20j%27ai%20une%20question%20sur%20G%C3%A9nizio."
          target="_blank"
          rel="noopener noreferrer"
          className="press-brand mt-2 inline-flex items-center gap-2 rounded-2xl bg-[#25D366] px-6 py-3 text-sm font-bold text-white"
        >
          <MessageCircle className="size-4" aria-hidden />
          Écrire sur WhatsApp
        </a>

        <aside className="mt-16 rounded-3xl border border-ink/10 bg-white p-8 shadow-sm">
          <h2 className="font-display text-xl font-extrabold">
            Passer de la lecture à la pratique
          </h2>
          <p className="mt-2 text-sm font-medium leading-relaxed text-ink/70">
            Génizio propose à votre enfant des défis concrets adaptés à son âge et à ses centres
            d'intérêt, et construit la carte de ses talents à partir de ce qu'il réalise vraiment —
            un premier défi sur mesure arrive dès la création du profil. Le premier profil enfant
            est offert pour toujours ; l'abonnement famille démarre à 5 000 F/mois (puis 15 000 F).
            Pour un accompagnement plus poussé, un mentor formé suit votre enfant en séances
            hebdomadaires (12 séances × 5 000 F/mois/enfant).
          </p>
          <Link
            to="/auth"
            className="press-brand mt-5 inline-flex items-center gap-2 rounded-2xl bg-brand px-6 py-3 text-sm font-bold text-white"
          >
            Créer le profil de mon enfant
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
