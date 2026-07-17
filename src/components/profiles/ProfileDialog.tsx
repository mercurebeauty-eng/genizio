import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ALL_INTERESTS, AVATAR_COLORS, emptyProfileDraft, type ChildProfile, type ProfileDraft } from "./shared";

export function ProfileDialog({
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
  const [draft, setDraft] = useState<ProfileDraft>(
    initial
      ? {
          name: initial.name,
          age: initial.age,
          interests: initial.interests,
          city: initial.city ?? "",
          country: initial.country ?? "",
          avatar_color: initial.avatar_color,
        }
      : emptyProfileDraft(),
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
    if (initial) {
      const { error } = await supabase.from("child_profiles").update(payload).eq("id", initial.id);
      setBusy(false);
      if (error) {
        setError(error.message);
        return;
      }
    } else {
      const { data: created, error } = await supabase.from("child_profiles").insert(payload).select("id").single();
      setBusy(false);
      if (error) {
        setError(error.message);
        return;
      }
      if (created) {
        await supabase.from("consent_events").insert({
          user_id: userId,
          child_id: created.id,
          event_type: "child_profile_created",
          description: `Profil créé pour ${payload.name}`,
        });
      }
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
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border-[3px] border-ink bg-white p-8 shadow-brutal"
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
              className="w-full rounded-xl border-[3px] border-ink px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand shadow-brutal-sm"
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
                className="w-full rounded-xl border-[3px] border-ink px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand shadow-brutal-sm"
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
                className="w-full rounded-xl border-[3px] border-ink px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand shadow-brutal-sm"
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
                    draft.avatar_color === c.key ? "border-[3px] border-ink shadow-brutal-sm" : "opacity-70 border-2 border-transparent"
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
                      "rounded-full px-3 py-1 text-xs font-bold border-2 transition-all " +
                      (on ? "bg-brand border-ink text-white" : "bg-white border-ink/20 text-ink/70 hover:border-ink")
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
            className="rounded-2xl border-[3px] border-ink bg-white px-5 py-2.5 text-sm font-bold shadow-brutal-sm hover:-translate-y-0.5 active:translate-y-0 transition-all"
          >
            Annuler
          </button>
          <button
            onClick={save}
            disabled={busy}
            className="rounded-2xl border-[3px] border-ink bg-brand px-6 py-2.5 text-sm font-bold text-white shadow-brutal hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all disabled:opacity-60"
          >
            {busy ? "…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
