import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import {
  generateChallenges,
  updateChallenge,
  deleteChallenge,
} from "@/lib/challenges.functions";

export const Route = createFileRoute("/profiles/$profileId/challenges")({
  component: ChallengesPage,
});

type Challenge = {
  id: string;
  child_id: string;
  domain: string;
  title: string;
  description: string;
  duration: string;
  steps: string[];
  materials: string[];
  status: "todo" | "in_progress" | "completed";
  progress: number;
  notes: string | null;
  completed_at: string | null;
};

type Child = {
  id: string;
  name: string;
  age: number;
  interests: string[];
  avatar_color: string;
  city: string | null;
  country: string | null;
};

const COLORS: Record<string, string> = {
  brand: "bg-brand",
  leaf: "bg-leaf",
  sky: "bg-sky",
  ink: "bg-ink",
};

const STATUS_LABEL: Record<Challenge["status"], string> = {
  todo: "À faire",
  in_progress: "En cours",
  completed: "Terminé",
};

const STATUS_STYLE: Record<Challenge["status"], string> = {
  todo: "bg-ink/10 text-ink",
  in_progress: "bg-sky/15 text-sky",
  completed: "bg-leaf/15 text-leaf",
};

function ChallengesPage() {
  const { profileId } = Route.useParams();
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const [child, setChild] = useState<Child | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [fetching, setFetching] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const generate = useServerFn(generateChallenges);
  const update = useServerFn(updateChallenge);
  const del = useServerFn(deleteChallenge);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [session, loading, navigate]);

  const refetch = async () => {
    setFetching(true);
    const [c, ch] = await Promise.all([
      supabase.from("child_profiles").select("*").eq("id", profileId).maybeSingle(),
      supabase
        .from("challenges")
        .select("*")
        .eq("child_id", profileId)
        .order("created_at", { ascending: false }),
    ]);
    setChild((c.data as Child) ?? null);
    setChallenges((ch.data ?? []) as Challenge[]);
    setFetching(false);
  };

  useEffect(() => {
    if (session) void refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, profileId]);

  const handleGenerate = async () => {
    setError(null);
    setGenerating(true);
    try {
      await generate({ data: { childId: profileId, count: 4 } });
      await refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur");
    } finally {
      setGenerating(false);
    }
  };

  const setStatus = async (id: string, status: Challenge["status"]) => {
    setChallenges((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              status,
              progress: status === "completed" ? 100 : status === "todo" ? 0 : c.progress,
            }
          : c,
      ),
    );
    await update({ data: { id, status } });
  };

  const setProgress = async (id: string, progress: number) => {
    setChallenges((prev) => prev.map((c) => (c.id === id ? { ...c, progress } : c)));
    await update({ data: { id, progress } });
  };

  const saveNotes = async (id: string, notes: string) => {
    await update({ data: { id, notes } });
    setChallenges((prev) => prev.map((c) => (c.id === id ? { ...c, notes } : c)));
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer ce défi ?")) return;
    await del({ data: { id } });
    setChallenges((prev) => prev.filter((c) => c.id !== id));
  };

  if (loading || !session || fetching) {
    return (
      <div className="grid min-h-screen place-items-center bg-surface text-ink/50">
        Chargement…
      </div>
    );
  }

  if (!child) {
    return (
      <div className="grid min-h-screen place-items-center bg-surface">
        <div className="text-center">
          <p className="mb-4 text-ink/60">Profil introuvable.</p>
          <Link to="/profiles" className="rounded-full bg-brand px-5 py-2 text-sm font-bold text-white">
            Retour
          </Link>
        </div>
      </div>
    );
  }

  const done = challenges.filter((c) => c.status === "completed").length;
  const inProgress = challenges.filter((c) => c.status === "in_progress").length;
  const totalProgress =
    challenges.length > 0
      ? Math.round(challenges.reduce((a, c) => a + c.progress, 0) / challenges.length)
      : 0;

  return (
    <div className="min-h-screen bg-surface text-ink">
      <nav className="border-b border-ink/5 bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="font-display text-2xl font-extrabold text-brand">
            NAYA
          </Link>
          <Link
            to="/profiles"
            className="rounded-full border border-ink/10 px-4 py-2 text-sm font-semibold hover:bg-white"
          >
            ← Mes profils
          </Link>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-6 py-12">
        {/* Header */}
        <div className="mb-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-5">
            <div
              className={`grid size-16 place-items-center rounded-full font-display text-2xl font-bold text-white ${COLORS[child.avatar_color] ?? "bg-brand"}`}
            >
              {child.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-brand">
                Parcours de défis
              </p>
              <h1 className="font-display text-4xl font-extrabold">{child.name}</h1>
              <p className="mt-1 text-sm text-ink/50">
                {child.age} ans
                {child.interests.length > 0 && ` · ${child.interests.slice(0, 3).join(", ")}`}
              </p>
            </div>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="rounded-2xl bg-brand px-6 py-3 text-sm font-bold text-white shadow-brand hover:bg-brand-dark disabled:opacity-60"
          >
            {generating ? "L'IA compose…" : "✨ Générer des défis"}
          </button>
        </div>

        {/* Stats */}
        <div className="mb-10 grid gap-4 md:grid-cols-4">
          <StatCard label="Défis totaux" value={challenges.length} />
          <StatCard label="En cours" value={inProgress} tone="sky" />
          <StatCard label="Terminés" value={done} tone="leaf" />
          <StatCard label="Progression moy." value={`${totalProgress}%`} tone="brand" />
        </div>

        {error && (
          <p className="mb-6 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        {/* Challenges */}
        {challenges.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-ink/10 bg-white/40 p-16 text-center">
            <p className="mb-2 text-lg font-semibold">Aucun défi pour l'instant</p>
            <p className="mb-6 text-ink/60">
              Lance la génération IA pour créer une première série de défis sur mesure pour {child.name}.
            </p>
            <button
              onClick={handleGenerate}
              disabled={generating}
              className="rounded-2xl bg-brand px-6 py-3 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-60"
            >
              {generating ? "…" : "✨ Générer les premiers défis"}
            </button>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {challenges.map((c) => (
              <ChallengeCard
                key={c.id}
                c={c}
                open={openId === c.id}
                onToggle={() => setOpenId((v) => (v === c.id ? null : c.id))}
                onStatus={(s) => setStatus(c.id, s)}
                onProgress={(p) => setProgress(c.id, p)}
                onNotes={(n) => saveNotes(c.id, n)}
                onDelete={() => remove(c.id)}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "ink",
}: {
  label: string;
  value: number | string;
  tone?: "ink" | "brand" | "leaf" | "sky";
}) {
  const toneCls: Record<string, string> = {
    ink: "text-ink",
    brand: "text-brand",
    leaf: "text-leaf",
    sky: "text-sky",
  };
  return (
    <div className="rounded-2xl bg-white p-5 shadow-soft ring-1 ring-ink/5">
      <p className="text-xs font-semibold uppercase tracking-wider text-ink/50">{label}</p>
      <p className={`mt-2 font-display text-3xl font-extrabold ${toneCls[tone]}`}>{value}</p>
    </div>
  );
}

function ChallengeCard({
  c,
  open,
  onToggle,
  onStatus,
  onProgress,
  onNotes,
  onDelete,
}: {
  c: Challenge;
  open: boolean;
  onToggle: () => void;
  onStatus: (s: Challenge["status"]) => void;
  onProgress: (p: number) => void;
  onNotes: (n: string) => void;
  onDelete: () => void;
}) {
  const [notesDraft, setNotesDraft] = useState(c.notes ?? "");
  const [savedFlash, setSavedFlash] = useState(false);

  return (
    <div className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-ink/5">
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded-md bg-brand/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-brand">
          {c.domain}
        </span>
        <span
          className={`rounded-full px-3 py-1 text-[11px] font-bold ${STATUS_STYLE[c.status]}`}
        >
          {STATUS_LABEL[c.status]}
        </span>
      </div>

      <h3 className="mb-2 font-display text-xl font-bold">{c.title}</h3>
      <p className="mb-4 text-sm text-ink/60">{c.description}</p>

      <div className="mb-4">
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-semibold text-ink/60">Progression</span>
          <span className="font-bold text-ink">{c.progress}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={5}
          value={c.progress}
          onChange={(e) => onProgress(Number(e.target.value))}
          className="w-full accent-brand"
        />
      </div>

      <div className="mb-4 flex items-center gap-2 text-xs text-ink/40">
        <span>⏱ {c.duration}</span>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(["todo", "in_progress", "completed"] as const).map((s) => (
          <button
            key={s}
            onClick={() => onStatus(s)}
            className={
              "rounded-full px-3 py-1 text-[11px] font-bold transition-all " +
              (c.status === s
                ? "bg-ink text-white"
                : "bg-ink/5 text-ink/60 hover:bg-ink/10")
            }
          >
            {STATUS_LABEL[s]}
          </button>
        ))}
      </div>

      <button
        onClick={onToggle}
        className="w-full rounded-xl border-2 border-ink/5 px-3 py-2 text-xs font-bold hover:bg-stone-50"
      >
        {open ? "Masquer les détails" : "Voir étapes, matériel & notes"}
      </button>

      {open && (
        <div className="mt-5 space-y-5 border-t border-ink/5 pt-5">
          {c.steps.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink/50">
                Étapes
              </p>
              <ol className="space-y-1.5 text-sm text-ink/80">
                {c.steps.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="font-bold text-brand">{i + 1}.</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
          {c.materials.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink/50">
                Matériel
              </p>
              <div className="flex flex-wrap gap-1.5">
                {c.materials.map((m, i) => (
                  <span key={i} className="rounded-full bg-leaf/10 px-2.5 py-1 text-xs text-leaf">
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-ink/50">
              Notes de progression
            </p>
            <textarea
              value={notesDraft}
              onChange={(e) => setNotesDraft(e.target.value.slice(0, 2000))}
              rows={3}
              placeholder="Ce qui a bien marché, ce qui reste à faire…"
              className="w-full rounded-xl border border-ink/10 px-3 py-2 text-sm outline-none focus:border-brand"
            />
            <div className="mt-2 flex items-center justify-between">
              <button
                onClick={async () => {
                  await onNotes(notesDraft);
                  setSavedFlash(true);
                  setTimeout(() => setSavedFlash(false), 1500);
                }}
                className="rounded-lg bg-ink px-3 py-1.5 text-xs font-bold text-white hover:bg-brand"
              >
                Enregistrer
              </button>
              {savedFlash && <span className="text-xs text-leaf">✓ Enregistré</span>}
            </div>
          </div>
          <button
            onClick={onDelete}
            className="w-full rounded-xl border-2 border-red-100 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
          >
            Supprimer ce défi
          </button>
        </div>
      )}
    </div>
  );
}
