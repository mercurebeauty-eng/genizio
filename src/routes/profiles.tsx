import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";

export const Route = createFileRoute("/profiles")({
  component: ProfilesPage,
});

const ALL_INTERESTS = [
  "Nature",
  "Machines",
  "Dessin",
  "Espace",
  "Sport",
  "Musique",
  "Cuisine",
  "Animaux",
  "Construction",
  "Langues",
] as const;

const AVATAR_COLORS = [
  { key: "brand", cls: "bg-brand" },
  { key: "leaf", cls: "bg-leaf" },
  { key: "sky", cls: "bg-sky" },
  { key: "ink", cls: "bg-ink" },
] as const;

type ChildProfile = {
  id: string;
  user_id: string;
  name: string;
  age: number;
  interests: string[];
  city: string | null;
  country: string | null;
  avatar_color: string;
  favorite_challenges: string[];
  completed_challenges: string[];
};

type Draft = Omit<ChildProfile, "id" | "user_id" | "favorite_challenges" | "completed_challenges">;

const emptyDraft = (): Draft => ({
  name: "",
  age: 10,
  interests: [],
  city: "",
  country: "",
  avatar_color: "brand",
});

function ProfilesPage() {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<ChildProfile[]>([]);
  const [fetching, setFetching] = useState(true);
  const [editing, setEditing] = useState<ChildProfile | "new" | null>(null);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [session, loading, navigate]);

  const refetch = async () => {
    if (!session) return;
    setFetching(true);
    const { data } = await supabase
      .from("child_profiles")
      .select("*")
      .order("created_at", { ascending: false });
    setProfiles((data ?? []) as ChildProfile[]);
    setFetching(false);
  };

  useEffect(() => {
    if (session) void refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const remove = async (id: string) => {
    if (!confirm("Supprimer ce profil ?")) return;
    await supabase.from("child_profiles").delete().eq("id", id);
    void refetch();
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  if (loading || !session) {
    return (
      <div className="grid min-h-screen place-items-center bg-surface text-ink/50">
        Chargement…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface text-ink">
      <nav className="border-b border-ink/5 bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="font-display text-2xl font-extrabold text-brand">
            NAYA
          </Link>
          <div className="flex items-center gap-4 text-sm">
            <span className="hidden text-ink/60 md:inline">{session.user.email}</span>
            <button onClick={signOut} className="rounded-full border border-ink/10 px-4 py-2 font-semibold hover:bg-white">
              Se déconnecter
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="font-display text-4xl font-extrabold md:text-5xl">Mes profils enfants</h1>
            <p className="mt-2 text-ink/60">
              Sauvegardez le questionnaire de chaque enfant pour retrouver ses défis en un clic.
            </p>
          </div>
          <button
            onClick={() => setEditing("new")}
            className="rounded-2xl bg-brand px-6 py-3 text-sm font-bold text-white shadow-brand hover:bg-brand-dark"
          >
            + Nouveau profil
          </button>
        </div>

        {fetching ? (
          <p className="text-ink/40">Chargement…</p>
        ) : profiles.length === 0 ? (
          <div className="rounded-3xl border-2 border-dashed border-ink/10 bg-white/40 p-12 text-center">
            <p className="text-ink/60">Aucun profil pour l'instant. Créez le premier.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {profiles.map((p) => (
              <ProfileCard key={p.id} profile={p} onEdit={() => setEditing(p)} onDelete={() => remove(p.id)} />
            ))}
          </div>
        )}
      </main>

      {editing && (
        <ProfileDialog
          initial={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void refetch();
          }}
          userId={session.user.id}
        />
      )}
    </div>
  );
}

function ProfileCard({
  profile,
  onEdit,
  onDelete,
}: {
  profile: ChildProfile;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const color = AVATAR_COLORS.find((c) => c.key === profile.avatar_color)?.cls ?? "bg-brand";
  return (
    <div className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-ink/5">
      <div className="mb-4 flex items-center gap-4">
        <div className={`grid size-14 place-items-center rounded-full font-display text-xl font-bold text-white ${color}`}>
          {profile.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h3 className="font-display text-xl font-bold">{profile.name}</h3>
          <p className="text-xs text-ink/50">
            {profile.age} ans
            {profile.city ? ` · ${profile.city}` : ""}
            {profile.country ? `, ${profile.country}` : ""}
          </p>
        </div>
      </div>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {profile.interests.slice(0, 6).map((i) => (
          <span key={i} className="rounded-full bg-brand/10 px-2.5 py-0.5 text-[11px] font-medium text-brand">
            {i}
          </span>
        ))}
        {profile.interests.length === 0 && (
          <span className="text-xs text-ink/40">Aucun centre d'intérêt</span>
        )}
      </div>
      <div className="mb-4 flex gap-4 text-xs text-ink/50">
        <span>★ {profile.favorite_challenges.length} favoris</span>
        <span>✓ {profile.completed_challenges.length} complétés</span>
      </div>
      <Link
        to="/profiles/$profileId/challenges"
        params={{ profileId: profile.id }}
        className="mb-2 block w-full rounded-xl bg-brand px-3 py-2 text-center text-xs font-bold text-white shadow-brand hover:bg-brand-dark"
      >
        ✨ Défis personnalisés →
      </Link>
      <div className="flex gap-2">
        <button
          onClick={onEdit}
          className="flex-1 rounded-xl border-2 border-ink/5 px-3 py-2 text-xs font-bold hover:bg-stone-50"
        >
          Modifier
        </button>
        <button
          onClick={onDelete}
          className="rounded-xl border-2 border-red-100 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50"
        >
          Supprimer
        </button>
      </div>
    </div>
  );
}

function ProfileDialog({
  initial,
  userId,
  onClose,
  onSaved,
}: {
  initial: ChildProfile | null;
  userId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(
    initial
      ? {
          name: initial.name,
          age: initial.age,
          interests: initial.interests,
          city: initial.city ?? "",
          country: initial.country ?? "",
          avatar_color: initial.avatar_color,
        }
      : emptyDraft(),
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggle = (i: string) =>
    setDraft((d) => ({
      ...d,
      interests: d.interests.includes(i) ? d.interests.filter((x) => x !== i) : [...d.interests, i],
    }));

  const save = async () => {
    setError(null);
    if (!draft.name.trim()) {
      setError("Le prénom est obligatoire");
      return;
    }
    setBusy(true);
    const payload = {
      user_id: userId,
      name: draft.name.trim().slice(0, 40),
      age: draft.age,
      interests: draft.interests,
      city: draft.city?.trim() || null,
      country: draft.country?.trim() || null,
      avatar_color: draft.avatar_color,
    };
    const { error } = initial
      ? await supabase.from("child_profiles").update(payload).eq("id", initial.id)
      : await supabase.from("child_profiles").insert(payload);
    setBusy(false);
    if (error) {
      setError(error.message);
      return;
    }
    onSaved();
  };

  const selectedColor = useMemo(
    () => AVATAR_COLORS.find((c) => c.key === draft.avatar_color)?.cls ?? "bg-brand",
    [draft.avatar_color],
  );

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-8 shadow-soft"
      >
        <div className="mb-6 flex items-center gap-4">
          <div
            className={`grid size-14 place-items-center rounded-full font-display text-xl font-bold text-white ${selectedColor}`}
          >
            {draft.name.charAt(0).toUpperCase() || "?"}
          </div>
          <h2 className="font-display text-2xl font-extrabold">
            {initial ? "Modifier le profil" : "Nouveau profil"}
          </h2>
        </div>

        <div className="space-y-5">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink/50">
              Prénom
            </label>
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value.slice(0, 40) })}
              className="w-full rounded-xl border border-ink/10 px-4 py-3 text-sm outline-none focus:border-brand"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink/50">
              Âge : {draft.age} ans
            </label>
            <input
              type="range"
              min={5}
              max={16}
              value={draft.age}
              onChange={(e) => setDraft({ ...draft, age: Number(e.target.value) })}
              className="w-full accent-brand"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink/50">
                Ville
              </label>
              <input
                value={draft.city ?? ""}
                onChange={(e) => setDraft({ ...draft, city: e.target.value.slice(0, 60) })}
                placeholder="Dakar"
                className="w-full rounded-xl border border-ink/10 px-4 py-3 text-sm outline-none focus:border-brand"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink/50">
                Pays
              </label>
              <input
                value={draft.country ?? ""}
                onChange={(e) => setDraft({ ...draft, country: e.target.value.slice(0, 60) })}
                placeholder="Sénégal"
                className="w-full rounded-xl border border-ink/10 px-4 py-3 text-sm outline-none focus:border-brand"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-ink/50">
              Couleur d'avatar
            </label>
            <div className="flex gap-3">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => setDraft({ ...draft, avatar_color: c.key })}
                  aria-label={c.key}
                  className={`size-10 rounded-full ${c.cls} transition-all ${
                    draft.avatar_color === c.key ? "ring-2 ring-ink ring-offset-2" : "opacity-70"
                  }`}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-ink/50">
              Centres d'intérêt
            </label>
            <div className="flex flex-wrap gap-2">
              {ALL_INTERESTS.map((i) => {
                const on = draft.interests.includes(i);
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => toggle(i)}
                    className={
                      "rounded-full px-3 py-1 text-xs font-medium transition-all " +
                      (on ? "bg-brand text-white" : "bg-ink/5 text-ink/70 hover:bg-ink/10")
                    }
                  >
                    {i}
                  </button>
                );
              })}
            </div>
          </div>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-2xl border-2 border-ink/10 px-5 py-2.5 text-sm font-bold hover:bg-stone-50"
          >
            Annuler
          </button>
          <button
            onClick={save}
            disabled={busy}
            className="rounded-2xl bg-brand px-6 py-2.5 text-sm font-bold text-white hover:bg-brand-dark disabled:opacity-60"
          >
            {busy ? "…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
