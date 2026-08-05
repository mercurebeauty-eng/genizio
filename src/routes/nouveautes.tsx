import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Sparkle } from "lucide-react";

export const Route = createFileRoute("/nouveautes")({
  component: NouveautesPage,
});

const ENTRIES = [
  {
    title: "Ma Guilde",
    description:
      "Une nouvelle page communautaire : progrès réels des familles qui ont choisi de partager, entièrement optionnelle.",
  },
  {
    title: "Badges",
    description:
      "10 badges à débloquer, un par domaine de talent, avec un écran de célébration à l'obtention.",
  },
  {
    title: "Niveau supérieur",
    description: "Une animation dédiée apparaît maintenant à chaque montée de niveau de l'enfant.",
  },
  {
    title: "Naya comprend mieux les centres d'intérêt",
    description:
      "Plutôt que de s'en tenir au sujet déclaré à la lettre (« football »), Naya s'appuie sur la façon dont l'enfant aime apprendre (démonter, négocier, bouger pour réfléchir...) pour construire des défis plus variés.",
  },
  {
    title: "Défis plus fiables",
    description:
      "Correction d'un bug qui coupait parfois la génération de plusieurs défis à la fois, et réduction des répétitions.",
  },
  {
    title: "Cohérence visuelle",
    description:
      "Finalisation du nouveau design sur l'ensemble du parcours — habillage plus doux, cohérent d'un écran à l'autre.",
  },
];

function NouveautesPage() {
  return (
    <div className="min-h-dvh bg-surface px-6 py-12 text-ink">
      <div className="mx-auto max-w-2xl">
        <Link
          to="/profiles"
          className="mb-8 inline-flex items-center gap-2 text-sm font-bold text-ink/60 hover:text-brand"
        >
          <ArrowLeft className="size-4" /> Retour
        </Link>

        <div className="mb-8 flex items-center gap-3">
          <div
            className="grid size-11 shrink-0 place-items-center rounded-2xl text-white shadow-md"
            style={{ background: "linear-gradient(120deg, var(--brand), var(--brand-glow))" }}
          >
            <Sparkle className="size-5" />
          </div>
          <div>
            <h1 className="font-display text-balance text-2xl font-extrabold">Quoi de neuf</h1>
            <p className="text-sm text-ink/60">Les derniers ajouts et améliorations de Génizio.</p>
          </div>
        </div>

        <div className="space-y-4">
          {ENTRIES.map((entry) => (
            <div
              key={entry.title}
              className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm"
            >
              <h2 className="font-display text-balance text-base font-bold text-ink mb-1">
                {entry.title}
              </h2>
              <p className="text-sm leading-relaxed text-ink/70">{entry.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
