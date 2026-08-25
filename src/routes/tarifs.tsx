import { createFileRoute, Link } from "@tanstack/react-router";
import { pageMeta, jsonLdScript, breadcrumbJsonLd } from "@/lib/seo";
import {
  STANDARD_PRICE_XOF,
  STANDARD_PRICE_EUR,
  PASSPORT_PRICE_XOF,
  PASSPORT_PRICE_EUR,
  DIAGNOSTIC_PRICE_XOF,
  DIAGNOSTIC_PRICE_EUR,
  SESSION_PRICE_XOF,
  PACK_SESSIONS,
  PACK_PRICE_XOF,
  formatXof,
} from "@/lib/pricing";
import { ArrowRight, BadgeCheck, CreditCard, HeartHandshake, Smartphone } from "lucide-react";

export const Route = createFileRoute("/tarifs")({
  head: () => {
    const meta = pageMeta({
      title: "Tarifs & Services — Génizio",
      description:
        "Les tarifs de Génizio en FCFA : 1 profil enfant gratuit pour toujours, diagnostic première rencontre à 50 000 F, accompagnement 12 séances (15 000 F/séance), certificats d'excellence et kits pédagogiques.",
      path: "/tarifs",
    });
    return {
      ...meta,
      scripts: [
        jsonLdScript(
          breadcrumbJsonLd([
            { name: "Accueil", path: "/" },
            { name: "Tarifs", path: "/tarifs" },
          ]),
        ),
      ],
    };
  },
  component: TarifsPage,
});

// Équivalent EUR indicatif au format français (« ≈ 53,50 € »), à la parité de la saison
const eurHint = (amount: number) =>
  `≈ ${amount.toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;

// Les trois grandes offres en cartes : le gratuit, le compte supplémentaire autonome, l'accompagnement mentor.
const PLANS: {
  name: string;
  badge: string;
  price: string;
  priceSub: string;
  points: string[];
  cta: { to: "/auth" | "/parrainage"; label: string };
  highlight?: boolean;
}[] = [
  {
    name: "Démarrage gratuit",
    badge: "Sans carte bancaire",
    price: "0 F",
    priceSub: "pour toujours, pour le 1er profil",
    points: [
      "1 profil enfant complet offert",
      "Premier défi sur mesure dès la création du profil",
      "Carte des 9 intelligences au fil des réalisations",
      "Validation parentale à chaque étape",
    ],
    cta: { to: "/auth", label: "Créer un compte gratuit" },
  },
  {
    name: "Compte sans suivi",
    badge: "Parents Autonomes",
    price: `${formatXof(STANDARD_PRICE_XOF)}/mois`,
    priceSub: `par enfant supplémentaire (${eurHint(STANDARD_PRICE_EUR)})`,
    points: [
      "Pour les parents qui suivent eux-mêmes leur enfant",
      "Accès complet aux défis Naya personnalisés",
      "Portfolio de compétences et carte des talents",
      "Sans engagement, annulable à tout moment",
    ],
    cta: { to: "/auth", label: "Activer un compte" },
    highlight: true,
  },
  {
    name: "Accompagnement Dédié",
    badge: "Service Premium",
    price: `${formatXof(PACK_PRICE_XOF)}/mois`,
    priceSub: `par enfant (${PACK_SESSIONS} séances × ${formatXof(SESSION_PRICE_XOF)})`,
    points: [
      "12 séances par mois (3 séances / semaine)",
      "Suivi personnalisé par un mentor formé",
      "Diagnostic et bilan initial inclus",
      "Comptes rendus réguliers pour les parents",
    ],
    cta: { to: "/auth", label: "Rejoindre l'accompagnement" },
  },
];

// Les produits et services payants, au-delà du profil gratuit — chaque prix est lu
// directement depuis src/lib/pricing.ts (source unique de l'affichage).
const PRODUCTS: { name: string; price: string; desc: string; href?: "/boutique" | "/parrainage" }[] = [
  {
    name: "Diagnostic première rencontre (Nouveau)",
    price: `${formatXof(DIAGNOSTIC_PRICE_XOF)} (${eurHint(DIAGNOSTIC_PRICE_EUR)})`,
    desc: "Séance initiale approfondie avec un expert pour établir le premier profil psychopédagogique de l'enfant, identifier ses intelligences dominantes et orienter son parcours.",
  },
  {
    name: "Comptes supplémentaires sans suivi",
    price: `${formatXof(STANDARD_PRICE_XOF)}/mois/enfant (${eurHint(STANDARD_PRICE_EUR)})`,
    desc: "Accès complet autonome pour chaque enfant supplémentaire (au-delà du 1er profil gratuit), pour les parents qui pilotent eux-mêmes les défis et le portfolio.",
  },
  {
    name: "Certificats & Passeport d'Excellence",
    price: `${formatXof(PASSPORT_PRICE_XOF)} (${eurHint(PASSPORT_PRICE_EUR)})`,
    desc: "Rapport officiel de compétences imprimable, synthèse certifiée de la carte des talents et de toutes les réalisations concrètes de l'enfant. Paiement unique.",
  },
  {
    name: "Pack Accompagnement Mensuel",
    price: `${PACK_SESSIONS} séances × ${formatXof(SESSION_PRICE_XOF)} = ${formatXof(PACK_PRICE_XOF)}/mois/enfant`,
    desc: "Suivi intensif hebdomadaire par un mentor dédié et formé : préparation, séances en direct, comptes rendus d'évolution et liaison continue avec l'IA Naya.",
  },
  {
    name: "Kits pédagogiques physiques",
    price: "Prix par kit",
    desc: "Kits matériels réels pour réaliser des projets concrets : bricolage, sciences, robotique, expériences et travaux manuels.",
    href: "/boutique",
  },
  {
    name: "Parrainage",
    price: `${formatXof(STANDARD_PRICE_XOF)}/mois (${eurHint(STANDARD_PRICE_EUR)})`,
    desc: "Offrez un accès Génizio à un enfant de votre choix au pays, avec suivi de sa progression et portfolio d'impact à distance.",
    href: "/parrainage",
  },
];

function TarifsPage() {
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

      <article className="mx-auto max-w-5xl px-6 py-12 md:py-20">
        <nav
          aria-label="Fil d'Ariane"
          className="mb-8 flex items-center gap-1.5 text-xs font-bold text-ink/50"
        >
          <Link to="/" className="hover:text-brand">
            Accueil
          </Link>
          <span aria-hidden>/</span>
          <span className="text-ink/70">Tarifs</span>
        </nav>

        <p className="mb-3 text-xs font-black uppercase tracking-widest text-brand">Tarifs</p>
        <h1 className="font-display text-balance text-3xl font-extrabold leading-[1.1] md:text-5xl">
          Commencez gratuitement, gardez la main.
        </h1>
        <p className="mt-5 max-w-2xl text-sm font-semibold leading-relaxed text-ink/70">
          Le premier profil enfant est offert pour toujours, sans carte bancaire. Quand vous êtes
          prêts, l'abonnement famille s'active en ligne, en toute transparence, par carte bancaire
          ou Mobile Money.
        </p>

        {/* Les trois grandes offres */}
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={
                "relative flex flex-col rounded-3xl border p-7 transition-all hover:-translate-y-1 " +
                (plan.highlight
                  ? "border-2 border-brand bg-white shadow-xl shadow-brand/10"
                  : "border border-ink/10 bg-white shadow-sm hover:shadow-lg")
              }
            >
              {plan.highlight && (
                <span className="absolute -top-3 left-6 rounded-full bg-brand px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white">
                  {plan.badge}
                </span>
              )}
              {!plan.highlight && (
                <span className="mb-4 w-fit rounded-full border border-ink/10 bg-surface px-3 py-1 text-[10px] font-black uppercase tracking-widest text-ink/60">
                  {plan.badge}
                </span>
              )}
              <h2 className="font-display text-balance text-xl font-extrabold text-ink">
                {plan.name}
              </h2>
              <p className="mt-3 font-display text-balance text-3xl font-black text-ink">
                {plan.price}
              </p>
              <p className="mt-1 text-xs font-semibold leading-relaxed text-ink/60">
                {plan.priceSub}
              </p>
              <ul className="mt-6 space-y-2.5 text-xs font-bold text-ink/80">
                {plan.points.map((point) => (
                  <li key={point} className="flex items-start gap-2">
                    <BadgeCheck className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
              <Link
                to={plan.cta.to}
                className="press-brand mt-7 inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-3 text-xs font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
              >
                {plan.cta.label}
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          ))}
        </div>

        {/* Produits et services payants */}
        <h2 className="mt-16 mb-2 font-display text-balance text-2xl font-extrabold text-ink md:text-3xl">
          Produits et services
        </h2>
        <p className="mb-8 max-w-2xl text-sm font-semibold leading-relaxed text-ink/70">
          Au-delà du premier profil gratuit, voici tout ce qui peut être activé depuis le compte
          parent — chaque montant est affiché avant paiement, jamais d'engagement caché.
        </p>
        <div className="overflow-hidden rounded-3xl border border-ink/10 bg-white shadow-sm">
          <ul className="divide-y divide-ink/10">
            {PRODUCTS.map((product) => (
              <li
                key={product.name}
                className="flex flex-col gap-2 p-6 sm:flex-row sm:items-start sm:justify-between sm:gap-8"
              >
                <div>
                  <h3 className="font-display text-balance text-base font-extrabold text-ink">
                    {product.name}
                  </h3>
                  <p className="mt-1 text-xs font-semibold leading-relaxed text-ink/70">
                    {product.desc}
                  </p>
                </div>
                <div className="shrink-0 text-left sm:text-right">
                  <p className="text-sm font-black text-brand">{product.price}</p>
                  {product.href && (
                    <Link
                      to={product.href}
                      className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-brand underline hover:text-ink"
                    >
                      Voir la boutique
                      <ArrowRight className="size-3" aria-hidden />
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Paiement et garanties */}
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm">
            <span className="mb-3 grid size-10 place-items-center rounded-2xl bg-brand/10 text-brand">
              <CreditCard className="size-5" aria-hidden />
            </span>
            <h3 className="font-display text-balance text-base font-extrabold text-ink">
              Paiement sécurisé Paystack
            </h3>
            <p className="mt-1.5 text-xs font-semibold leading-relaxed text-ink/70">
              Transactions chiffrées, confirmation en temps réel, reçu par email. Carte bancaire
              (Visa, Mastercard) et Mobile Money (Wave, Orange Money, MTN).
            </p>
          </div>
          <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm">
            <span className="mb-3 grid size-10 place-items-center rounded-2xl bg-brand/10 text-brand">
              <Smartphone className="size-5" aria-hidden />
            </span>
            <h3 className="font-display text-balance text-base font-extrabold text-ink">
              Mobile Money accepté
            </h3>
            <p className="mt-1.5 text-xs font-semibold leading-relaxed text-ink/70">
              Réglez depuis un téléphone avec Wave, Orange Money ou MTN Mobile Money — sans compte
              bancaire nécessaire.
            </p>
          </div>
          <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm">
            <span className="mb-3 grid size-10 place-items-center rounded-2xl bg-brand/10 text-brand">
              <HeartHandshake className="size-5" aria-hidden />
            </span>
            <h3 className="font-display text-balance text-base font-extrabold text-ink">
              Remboursements & annulation
            </h3>
            <p className="mt-1.5 text-xs font-semibold leading-relaxed text-ink/70">
              Abonnement annulable à tout moment. Rétractation de 14 jours et remboursements prévus
              pour tous les achats.
            </p>
            <Link
              to="/remboursements"
              className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-brand underline hover:text-ink"
            >
              Voir la politique complète
              <ArrowRight className="size-3" aria-hidden />
            </Link>
          </div>
        </div>

        {/* Note de bas de page */}
        <p className="mt-8 text-xs font-semibold leading-relaxed text-ink/50">
          Tous les prix sont en FCFA (XOF), TVA incluse le cas échéant. Équivalents en euros à la
          parité saison (10 000 F ≈ 15 €), à titre indicatif : 35 000 F ≈ 53,50 €, 50 000 F ≈ 75 €,
          75 000 F ≈ 115 €, 180 000 F ≈ 270 €. Les frais éventuels de transfert Mobile Money restent à la
          charge de l'acheteur. Le premier profil enfant reste gratuit pour toujours, sans carte
          bancaire demandée.
        </p>

        <div className="mt-12 rounded-3xl bg-ink p-8 text-center text-white shadow-xl md:p-10">
          <h2 className="font-display text-balance text-2xl font-extrabold leading-tight md:text-3xl">
            Créez le profil de votre enfant, gratuitement.
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm font-semibold leading-relaxed text-white/80">
            Le premier défi sur mesure arrive dès la création du profil. Aucune carte bancaire.
          </p>
          <Link
            to="/auth"
            className="press-brand mt-6 inline-flex items-center gap-2 rounded-2xl bg-brand px-8 py-3.5 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-glow focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
          >
            Créer mon accès parent gratuit
            <ArrowRight className="size-4" aria-hidden />
          </Link>
        </div>
      </article>

      <footer className="border-t border-ink/10 bg-white/30 px-6 py-10">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 text-xs font-bold text-ink/50 md:flex-row">
          <span>© {new Date().getFullYear()} Génizio — Abidjan, Côte d'Ivoire</span>
          <div className="flex flex-wrap justify-center gap-5 uppercase tracking-wider">
            <Link to="/tarifs" className="hover:text-brand">
              Tarifs
            </Link>
            <Link to="/remboursements" className="hover:text-brand">
              Remboursements
            </Link>
            <Link to="/guides" className="hover:text-brand">
              Guides
            </Link>
            <Link to="/a-propos" className="hover:text-brand">
              À propos
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
