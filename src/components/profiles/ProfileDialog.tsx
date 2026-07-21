import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { INTERESTS_BY_TALENT, AVATAR_COLORS, emptyProfileDraft, type ChildProfile, type ProfileDraft } from "./shared";

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
          xp: initial.xp ?? 0,
          streak: initial.streak ?? 0,
          last_activity_date: initial.last_activity_date ?? null,
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
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink/60 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-ink/10 bg-white p-8 shadow-xl"
      >
        <div className="mb-6 flex items-center gap-4">
          <div
            className={`grid size-14 place-items-center rounded-full font-display text-balance text-xl font-bold text-white ${selectedColor}`}
          >
            {draft.name.charAt(0).toUpperCase() || "?"}
          </div>
          <h2 className="font-display text-balance text-2xl font-extrabold">
            {initial ? "Modifier le profil" : "Nouveau profil"}
          </h2>
        </div>

        <div className="space-y-5">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink/60">
              Prénom
            </label>
            <input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value.slice(0, 40) })}
              className="w-full rounded-xl border border-ink/10 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand shadow-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink/60">
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
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink/60">
                Ville
              </label>
              <input
                value={draft.city ?? ""}
                onChange={(e) => setDraft({ ...draft, city: e.target.value.slice(0, 60) })}
                placeholder="Abidjan"
                className="w-full rounded-xl border border-ink/10 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand shadow-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink/60">
                Pays
              </label>
              <input
                value={draft.country ?? ""}
                onChange={(e) => setDraft({ ...draft, country: e.target.value.slice(0, 60) })}
                placeholder="Côte d'Ivoire"
                className="w-full rounded-xl border border-ink/10 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand shadow-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-ink/60">
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
                    draft.avatar_color === c.key ? "border-2 border-ink shadow-sm" : "opacity-70 border-2 border-transparent"
                  }`}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink/60">
              Centres d'intérêt
            </label>
            <p className="mb-3 text-[11px] text-ink/60 leading-relaxed">
              Organisés par type de talent — ça aide Naya à proposer des défis mieux ciblés dès le départ.
            </p>
            <div className="space-y-4">
              {Object.entries(INTERESTS_BY_TALENT).map(([key, group]) => (
                <div key={key}>
                  <p className="mb-1.5 text-[10px] font-extrabold uppercase tracking-widest text-brand">
                    {group.label}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {group.tags.map((i) => {
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
              ))}
            </div>
          </div>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </div>

        <div className="mt-8 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="press-white rounded-2xl border border-ink/10 bg-white px-5 py-2.5 text-sm font-bold"
          >
            Annuler
          </button>
          <button
            onClick={save}
            disabled={busy}
            className="press-brand rounded-2xl bg-brand px-6 py-2.5 text-sm font-bold text-white disabled:opacity-60"
          >
            {busy ? "…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
