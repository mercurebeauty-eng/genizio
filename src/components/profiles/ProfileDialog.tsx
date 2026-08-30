import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  INTERESTS_BY_TALENT,
  AVATAR_COLORS,
  emptyProfileDraft,
  type ChildProfile,
  type ProfileDraft,
} from "./shared";
import { toast } from "sonner";
import { useFamilyCoverage } from "@/hooks/use-family-coverage";
import { getGeoHint } from "@/lib/geo.functions";
import { seedTalentsFromInterests } from "@/lib/talent-seed";
import {
  ABILITY_AXES,
  ASPIRATION_SUGGESTIONS,
  LIFE_CONTEXT_OPTIONS,
  SCHOOL_LEVELS,
  SCHOOL_RELATIONS,
  shouldAskAspirations,
  type AbilityValue,
} from "@/lib/profile-context";
import { TIME_PRESSURE_LABELS, type TimePressure } from "@/lib/time-limit";
import { generateSuggestedUsername, sanitizeUsername } from "@/lib/child-username";
import { checkUsernameAvailabilityFn } from "@/lib/child-username.functions";

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
  // Limite de CRÉATION (V4, Vague A) : calculée côté serveur depuis family_coverages
  // (getFamilySubscriptionStatus → creationLimit, miroir du trigger V10 — migration
  // 20260814200000). Pré-check local seulement : le trigger check_child_profile_quota
  // fait foi côté base.
  const { creationLimit: quota } = useFamilyCoverage();

  const [draft, setDraft] = useState<ProfileDraft>(
    initial
      ? {
          username: initial.username ?? "", name: initial.name,
          age: initial.age,
          birthdate: initial.birthdate ?? null,
          interests: initial.interests,
          city: initial.city ?? "",
          country: initial.country ?? "",
          avatar_color: initial.avatar_color,
          xp: initial.xp ?? 0,
          streak: initial.streak ?? 0,
          last_activity_date: initial.last_activity_date ?? null,
          school_level: initial.school_level ?? null,
          languages: initial.languages ?? [],
          ability_profile: initial.ability_profile ?? {},
          school_relation: initial.school_relation ?? null,
          life_context: initial.life_context ?? [],
          aspirations: initial.aspirations ?? [],
          time_pressure: initial.time_pressure ?? "standard",
          is_active: initial.is_active ?? true,
        }
      : emptyProfileDraft(),
  );

  // Bornes d'âge produit : 5 à 21 ans (contrainte serveur child_profiles_age_check,
  // migration 20260829130000). La date de naissance doit produire un âge dans cette
  // fenêtre — sinon le trigger sync_child_age_from_birthdate recalcule un âge que la
  // base refuse, avec un message opaque.
  const today = new Date();
  const maxBirthdate = new Date(today.getFullYear() - 5, today.getMonth(), today.getDate())
    .toISOString()
    .slice(0, 10);
  const minBirthdate = new Date(today.getFullYear() - 21, today.getMonth(), today.getDate())
    .toISOString()
    .slice(0, 10);
  const ageFromBirthdate = (birthdate: string | null): number | null => {
    if (!birthdate) return null;
    const b = new Date(birthdate);
    if (Number.isNaN(b.getTime())) return null;
    let age = today.getFullYear() - b.getFullYear();
    const m = today.getMonth() - b.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < b.getDate())) age -= 1;
    return age;
  };
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const checkUsername = useServerFn(checkUsernameAvailabilityFn);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "unavailable">("idle");
  const [usernameTouched, setUsernameTouched] = useState(false);

  useEffect(() => {
    if (!draft.username) {
      setUsernameStatus("idle");
      return;
    }
    const timer = setTimeout(async () => {
      setUsernameStatus("checking");
      const isAvailable = await checkUsername(draft.username);
      // Allow if it matches initial username exactly
      if (initial?.username && draft.username === initial.username) {
        setUsernameStatus("available");
      } else {
        setUsernameStatus(isAvailable ? "available" : "unavailable");
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [draft.username, checkUsername, initial?.username]);

  const [selectedTalentKeys, setSelectedTalentKeys] = useState<string[]>(() => {
    const activeKeys: string[] = [];
    for (const [key, group] of Object.entries(INTERESTS_BY_TALENT)) {
      if (group.tags.some((tag) => draft.interests.includes(tag))) {
        activeKeys.push(key);
      }
    }
    return activeKeys;
  });

  const [step, setStep] = useState<"universes" | "tags">(
    initial && initial.interests.length > 0 ? "tags" : "universes",
  );

  // Parcours d'onboarding « Qui est cet enfant ? » (2026-08-12, analyse §6-7, §10) :
  // Qui → Comment il est → À quel enfant ? → (conditionnelle) Ce qu'il veut devenir.
  const [wizardStep, setWizardStep] = useState(0);
  const [aspirationInput, setAspirationInput] = useState("");

  // Étape 4 conditionnelle : on demande les aspirations pour les profils vulnérables
  // (parcours rue, précarité, famille éloignée, conflit avec l'école — analyse §10),
  // ou si des aspirations existent déjà (on ne cache jamais des données).
  const askAspirations = shouldAskAspirations({
    life_context: draft.life_context,
    school_relation: draft.school_relation,
    existingAspirations: draft.aspirations,
  });
  const wizardSteps = askAspirations ? 4 : 3;

  const languagesText = draft.languages.join(", ");
  const setLanguagesText = (text: string) =>
    setDraft((d) => ({
      ...d,
      languages: text
        .split(",")
        .map((l) => l.trim())
        .filter(Boolean)
        .slice(0, 6),
    }));

  const setAbility = (axis: string, value: AbilityValue) =>
    setDraft((d) => ({ ...d, ability_profile: { ...d.ability_profile, [axis]: value } }));

  const addAspiration = (label: string) => {
    const clean = label.trim().slice(0, 60);
    if (!clean) return;
    setDraft((d) =>
      d.aspirations.some((a) => a.label.toLowerCase() === clean.toLowerCase())
        ? d
        : {
            ...d,
            aspirations: [
              ...d.aspirations,
              { label: clean, type: "metier" as const, source: "enfant" as const },
            ],
          },
    );
    setAspirationInput("");
  };

  // Pré-remplissage Ville/Pays par IP (2026-07-29, demande utilisateur) : uniquement à la
  // création d'un profil, jamais sur un profil existant, et jamais si le parent a déjà
  // commencé à taper — juste une suggestion de départ, toujours modifiable/effaçable.
  const geoHintFn = useServerFn(getGeoHint);
  useEffect(() => {
    if (initial) return;
    geoHintFn()
      .then((hint) => {
        setDraft((d) => ({
          ...d,
          city: d.city ? d.city : (hint.city ?? d.city),
          country: d.country ? d.country : (hint.country ?? d.country),
        }));
      })
      .catch(() => {});
  }, []);

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
    if (!draft.username.trim() || draft.username.length < 3) {
      setError("L'identifiant est invalide (minimum 3 caractères)");
      return;
    }
    if (usernameStatus === "unavailable") {
      setError("L'identifiant choisi n'est pas disponible");
      return;
    }
    // Date de naissance = source unique de l'âge (2026-08-13) : le sélecteur d'âge a
    // été supprimé de l'onboarding — sans date, l'âge n'a plus de source fiable.
    if (!draft.birthdate) {
      const msg = "La date de naissance est obligatoire (l'âge en est dérivé).";
      setError(msg);
      toast.error(msg);
      return;
    }
    const birthdateAge = ageFromBirthdate(draft.birthdate);
    if (birthdateAge !== null && (birthdateAge < 5 || birthdateAge > 21)) {
      const msg = `L'âge doit être compris entre 5 et 21 ans (cette date de naissance donne ${birthdateAge} ans).`;
      setError(msg);
      toast.error(msg);
      return;
    }
    setBusy(true);
    try {
      let savedId: string | null = initial?.id ?? null;
      const payload = {
        user_id: userId,
        username: draft.username.trim(), name: draft.name.trim().slice(0, 40),
        // Âge dérivé de la date de naissance (2026-08-13) : plus aucun sélecteur d'âge
        // dans l'onboarding — la date est la source unique (le trigger serveur
        // sync_child_age_from_birthdate aligne la base quoi qu'il arrive).
        age: ageFromBirthdate(draft.birthdate) ?? draft.age,
        birthdate: draft.birthdate || null,
        interests: draft.interests,
        city: draft.city?.trim() || null,
        country: draft.country?.trim() || null,
        avatar_color: draft.avatar_color,
        // Profil multidimensionnel (2026-08-12) : tout est optionnel et déclaré par
        // le parent ; vocabulaire borné par les CHECKs en base (school_level,
        // school_relation) — le dialogue ne propose que des préréglages.
        school_level: draft.school_level || null,
        languages: draft.languages,
        ability_profile: draft.ability_profile,
        school_relation: draft.school_relation || null,
        life_context: draft.life_context,
        aspirations: draft.aspirations,
        time_pressure: draft.time_pressure,
        // Guilde provisoire (refonte 2026-08-09) : à la CRÉATION uniquement, les intérêts
        // déclarés dérivent une baseline de talents (1-4 pts → "signal_precoce", sous les
        // seuils 40/70) — l'enfant a une guilde dès le premier jour. Sur l'édition, on ne
        // touche jamais aux talents gagnés par les défis (undefined = clé ignorée).
        talents: initial ? undefined : seedTalentsFromInterests(draft.interests),
      };
      if (initial) {
        const { error } = await supabase
          .from("child_profiles")
          .update(payload)
          .eq("id", initial.id);
        if (error) {
          setError(error.message);
          toast.error(error.message);
          return;
        }
      } else {
        const { count } = await supabase
          .from("child_profiles")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId);

        if ((count ?? 0) >= quota) {
          const limitMsg = `Vous avez atteint la couverture de ${quota} profils enfants maximum par compte parent.`;
          setError(limitMsg);
          toast.error(limitMsg);
          return;
        }

        const { data: created, error } = await supabase
          .from("child_profiles")
          .insert(payload)
          .select("id")
          .single();
        if (error) {
          setError(error.message);
          toast.error(error.message);
          return;
        }
        if (created) {
          savedId = created.id;
          await supabase.from("consent_events").insert({
            user_id: userId,
            child_id: created.id,
            event_type: "child_profile_created",
            description: `Profil créé pour ${payload.name}`,
          });
        }
      }
      // Consentement « Contexte & aptitudes » (2026-08-12) : dès qu'une donnée du
      // profil multidimensionnel est déclarée (ou modifiée), on le trace — le parent
      // reste maître des données sensibles de son enfant.
      const contextDeclared =
        draft.school_level ||
        draft.languages.length > 0 ||
        Object.values(draft.ability_profile).some((v) => v !== "neutre") ||
        draft.school_relation ||
        draft.life_context.length > 0 ||
        draft.aspirations.length > 0;
      if (contextDeclared && savedId) {
        await supabase.from("consent_events").insert({
          user_id: userId,
          child_id: savedId,
          event_type: "context_declared",
          description:
            "Contexte, aptitudes et aspirations déclarés par le parent (section optionnelle du profil).",
        });
      }
      onSaved();
    } catch (err: any) {
      const msg = err?.message ?? "Erreur lors de l'enregistrement du profil";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  };

  const selectedColor = useMemo(
    () => AVATAR_COLORS.find((c) => c.key === draft.avatar_color)?.cls ?? "bg-brand",
    [draft.avatar_color],
  );

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink/60 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-ink/10 bg-white p-5 sm:p-8 shadow-xl"
      >
        <div className="mb-6 flex items-center gap-4 min-w-0">
          <div
            className={`grid size-14 shrink-0 place-items-center rounded-full font-display text-balance text-xl font-bold text-white ${selectedColor}`}
          >
            {draft.name.charAt(0).toUpperCase() || "?"}
          </div>
          <h2 className="font-display text-balance text-2xl font-extrabold truncate min-w-0">
            {initial ? "Modifier le profil" : "Nouveau profil"}
          </h2>
        </div>

        <div className="space-y-5">
          {/* Parcours d'onboarding en étapes (2026-08-12, analyse §6-7, §10) */}
          <div className="flex items-center justify-between gap-1 rounded-xl bg-ink/5 p-1 text-xs font-bold overflow-x-auto no-scrollbar">
            {["Qui", "Comment il est", "À quel enfant ?", "Ce qu'il veut devenir"]
              .slice(0, wizardSteps)
              .map((label, i) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setWizardStep(i)}
                  className={`flex-1 min-w-0 truncate rounded-lg py-1.5 px-1 sm:px-2 transition-all text-center ${
                    wizardStep === i ? "bg-white text-ink shadow-sm font-black" : "text-ink/60 hover:text-ink"
                  }`}
                >
                  <span className="truncate block">{i + 1}. {label}</span>
                </button>
              ))}
          </div>

          {wizardStep === 0 && (
            <div className="space-y-5">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink/60">
                  Prénom
                </label>
                <input
                  value={draft.name}
                  onChange={(e) => {
                    const newName = e.target.value.slice(0, 40);
                    setDraft((d) => {
                      if (!initial && !usernameTouched) {
                        return { ...d, name: newName, username: generateSuggestedUsername(newName) };
                      }
                      return { ...d, name: newName };
                    });
                  }}
                  className="w-full rounded-xl border border-ink/10 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand shadow-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink/60">
                  Identifiant unique (@handle)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink/40 font-bold">@</span>
                  <input
                    value={draft.username}
                    onChange={(e) => {
                      setUsernameTouched(true);
                      setDraft({ ...draft, username: sanitizeUsername(e.target.value) });
                    }}
                    className={`w-full rounded-xl border px-4 py-3 pl-9 text-sm outline-none focus:ring-2 focus:ring-brand shadow-sm transition-colors ${
                      usernameStatus === "unavailable" ? "border-red-500 bg-red-50" : "border-ink/10"
                    }`}
                    placeholder="pseudo_123"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    {usernameStatus === "checking" && <span className="text-xs text-ink/50">Vérification...</span>}
                    {usernameStatus === "available" && <span className="text-xs font-bold text-green-600">Disponible</span>}
                    {usernameStatus === "unavailable" && <span className="text-xs font-bold text-red-600">Indisponible</span>}
                  </div>
                </div>
                <p className="mt-1.5 text-[11px] text-ink/50 leading-snug">
                  Un pseudo public pour identifier cet enfant dans les projets de groupe (lettres, chiffres, tiret du bas uniquement).
                </p>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink/60">
                  Date de naissance *
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="date"
                    value={draft.birthdate ?? ""}
                    min={minBirthdate}
                    max={maxBirthdate}
                    onChange={(e) => setDraft({ ...draft, birthdate: e.target.value || null })}
                    className="rounded-xl border border-ink/10 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-brand shadow-sm"
                  />
                  <p className="text-[11px] text-ink/50 leading-snug">
                    L'âge se calcule automatiquement et se met à jour chaque année (5 à 21 ans).
                  </p>
                </div>
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
                        draft.avatar_color === c.key
                          ? "border-2 border-ink shadow-sm"
                          : "opacity-70 border-2 border-transparent"
                      }`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {wizardStep === 1 && (
            <div className="space-y-5">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-ink/60">
                  Leviers & Moteurs d'engagement
                </label>
                <p className="mb-3 text-[11px] text-ink/60 leading-relaxed">
                  Sélectionnez d'abord les univers dominants de votre enfant, puis affinez ses
                  postures d'apprentissage.
                </p>

                {/* Navigation par étapes */}
                <div className="mb-4 flex items-center justify-between rounded-xl bg-ink/5 p-1 text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => setStep("universes")}
                    className={`flex-1 rounded-lg py-1.5 transition-all ${
                      step === "universes"
                        ? "bg-white text-ink shadow-sm"
                        : "text-ink/60 hover:text-ink"
                    }`}
                  >
                    1. Univers ({selectedTalentKeys.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep("tags")}
                    className={`flex-1 rounded-lg py-1.5 transition-all ${
                      step === "tags" ? "bg-white text-ink shadow-sm" : "text-ink/60 hover:text-ink"
                    }`}
                  >
                    2. Comportements ({draft.interests.length})
                  </button>
                </div>

                {step === "universes" ? (
                  <div className="space-y-3">
                    <p className="text-[11px] font-medium text-ink/70">
                      Choisissez les univers dans lesquels votre enfant s'épanouit le plus :
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(INTERESTS_BY_TALENT).map(([key, group]) => {
                        const selected = selectedTalentKeys.includes(key);
                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              if (selected) {
                                setSelectedTalentKeys((prev) => prev.filter((k) => k !== key));
                                // Purge tags from deselected universe
                                setDraft((d) => ({
                                  ...d,
                                  interests: d.interests.filter((tag) => !group.tags.includes(tag)),
                                }));
                              } else {
                                setSelectedTalentKeys((prev) => [...prev, key]);
                              }
                            }}
                            className={
                              "flex flex-col items-start rounded-2xl p-3 text-left border-2 transition-all " +
                              (selected
                                ? "bg-brand/10 border-brand text-brand"
                                : "bg-white border-ink/10 text-ink/70 hover:border-ink/30")
                            }
                          >
                            <span className="text-xs font-extrabold">{group.label}</span>
                            <span className="mt-1 text-[10px] opacity-75">
                              {group.tags.length} postures
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    {selectedTalentKeys.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setStep("tags")}
                        className="mt-3 w-full rounded-xl bg-ink p-2.5 text-center text-xs font-bold text-white transition-all hover:bg-ink/90"
                      >
                        Suivant : Affiner les comportements ({selectedTalentKeys.length} univers) →
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedTalentKeys.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-ink/20 p-4 text-center">
                        <p className="text-xs text-ink/60">
                          Aucun univers sélectionné à l'étape 1.
                        </p>
                        <button
                          type="button"
                          onClick={() => setStep("universes")}
                          className="mt-2 text-xs font-bold text-brand hover:underline"
                        >
                          ← Sélectionner des univers
                        </button>
                      </div>
                    ) : (
                      Object.entries(INTERESTS_BY_TALENT)
                        .filter(([key]) => selectedTalentKeys.includes(key))
                        .map(([key, group]) => (
                          <div
                            key={key}
                            className="rounded-2xl border border-ink/10 p-3 bg-surface/50"
                          >
                            <p className="mb-2 text-[10px] font-extrabold uppercase tracking-widest text-brand">
                              {group.label}
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {group.tags.map((i) => {
                                const on = draft.interests.includes(i);
                                return (
                                  <button
                                    key={i}
                                    type="button"
                                    onClick={() => toggle(i)}
                                    className={
                                      "rounded-full px-3 py-1 text-xs font-bold border-2 transition-all " +
                                      (on
                                        ? "bg-brand border-ink text-white"
                                        : "bg-white border-ink/20 text-ink/70 hover:border-ink")
                                    }
                                  >
                                    {i}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {wizardStep === 2 && (
            <div className="space-y-5">
              {/* Étape « À quel enfant avons-nous affaire ? » (2026-08-12, analyse §6-7) */}
              <div>
                <p className="mb-1 text-xs font-black uppercase tracking-widest text-ink/70">
                  À quel enfant avons-nous affaire ?
                </p>
                <p className="text-[11px] text-ink/60 leading-relaxed">
                  Contexte de parcours, handicaps, points forts & difficultés, niveau scolaire,
                  langues. Tout est facultatif, modifiable à tout moment, et reste privé — ces
                  informations servent uniquement à personnaliser les activités.
                </p>
                <div className="mt-3 space-y-4 rounded-2xl border border-ink/10 bg-white p-4 shadow-sm">
                  {/* Niveau scolaire */}
                  <div>
                    <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-ink/60">
                      Niveau scolaire
                    </label>
                    <select
                      value={draft.school_level ?? ""}
                      onChange={(e) => setDraft({ ...draft, school_level: e.target.value || null })}
                      className="w-full rounded-xl border border-ink/10 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand"
                    >
                      <option value="">Non renseigné</option>
                      {Object.entries(SCHOOL_LEVELS).map(([k, label]) => (
                        <option key={k} value={k}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Langues */}
                  <div>
                    <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-ink/60">
                      Langues parlées à la maison
                    </label>
                    <input
                      value={languagesText}
                      onChange={(e) => setLanguagesText(e.target.value)}
                      placeholder="ex. français, wolof, dioula"
                      className="w-full rounded-xl border border-ink/10 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>

                  {/* Facilités / difficultés par axe */}
                  <div>
                    <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-ink/60">
                      Points forts & difficultés
                    </p>
                    <p className="mb-2 text-[11px] text-ink/50">
                      Touchez un axe pour le classer — une difficulté est un axe d'entraînement,
                      jamais une étiquette.
                    </p>
                    <div className="space-y-3">
                      <div>
                        <p className="mb-1.5 text-[11px] font-bold text-emerald-700">✓ Facilités</p>
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(ABILITY_AXES).map(([k, label]) => {
                            const on = draft.ability_profile[k] === "facile";
                            return (
                              <button
                                key={k}
                                type="button"
                                onClick={() => setAbility(k, on ? "neutre" : "facile")}
                                className={
                                  "rounded-full px-3 py-1 text-[11px] font-bold border-2 transition-all " +
                                  (on
                                    ? "bg-emerald-100 border-emerald-500 text-emerald-800"
                                    : "bg-white border-ink/15 text-ink/60 hover:border-ink/40")
                                }
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div>
                        <p className="mb-1.5 text-[11px] font-bold text-amber-700">
                          ● Difficultés à stimuler
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(ABILITY_AXES).map(([k, label]) => {
                            const on = draft.ability_profile[k] === "difficulte";
                            return (
                              <button
                                key={k}
                                type="button"
                                onClick={() => setAbility(k, on ? "neutre" : "difficulte")}
                                className={
                                  "rounded-full px-3 py-1 text-[11px] font-bold border-2 transition-all " +
                                  (on
                                    ? "bg-amber-100 border-amber-500 text-amber-800"
                                    : "bg-white border-ink/15 text-ink/60 hover:border-ink/40")
                                }
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Rapport à l'école */}
                  <div>
                    <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-ink/60">
                      Rapport à l'école
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(SCHOOL_RELATIONS).map(([k, label]) => {
                        const on = draft.school_relation === k;
                        return (
                          <button
                            key={k}
                            type="button"
                            onClick={() => setDraft({ ...draft, school_relation: on ? null : k })}
                            className={
                              "rounded-full px-3 py-1 text-[11px] font-bold border-2 transition-all " +
                              (on
                                ? "bg-brand text-white border-ink"
                                : "bg-white border-ink/15 text-ink/60 hover:border-ink/40")
                            }
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Contexte de parcours (préréglages uniquement) */}
                  <div>
                    <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-ink/60">
                      Contexte de parcours
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {Object.entries(LIFE_CONTEXT_OPTIONS).map(([k, label]) => {
                        const on = draft.life_context.includes(k);
                        return (
                          <button
                            key={k}
                            type="button"
                            onClick={() =>
                              setDraft((d) => ({
                                ...d,
                                life_context: on
                                  ? d.life_context.filter((x) => x !== k)
                                  : [...d.life_context, k],
                              }))
                            }
                            className={
                              "rounded-full px-3 py-1 text-[11px] font-bold border-2 transition-all " +
                              (on
                                ? "bg-ink text-white border-ink"
                                : "bg-white border-ink/15 text-ink/60 hover:border-ink/40")
                            }
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Pression temporelle */}
                  <div>
                    <label className="mb-1 block text-[10px] font-black uppercase tracking-widest text-ink/60">
                      Gestion du temps
                    </label>
                    <div className="flex gap-1.5">
                      {(Object.keys(TIME_PRESSURE_LABELS) as TimePressure[]).map((tp) => {
                        const on = draft.time_pressure === tp;
                        return (
                          <button
                            key={tp}
                            type="button"
                            onClick={() => setDraft({ ...draft, time_pressure: tp })}
                            className={
                              "flex-1 rounded-xl border px-2 py-2 text-[11px] font-bold transition-all " +
                              (on
                                ? "border-brand bg-brand/10 text-brand"
                                : "border-ink/10 bg-white text-ink/60 hover:border-ink/30")
                            }
                          >
                            {TIME_PRESSURE_LABELS[tp]}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-1.5 text-[10px] text-ink/50">
                      Temps standard : chrono doux. Temps généreux : ×1,5. Sans chronomètre : aucune
                      contrainte temporelle.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {askAspirations && wizardStep === 3 && (
            <div className="space-y-4">
              <div>
                <p className="mb-1 text-xs font-black uppercase tracking-widest text-ink/70">
                  Ce qu'il veut devenir
                </p>
                <p className="mb-2 text-[11px] text-ink/60 leading-relaxed">
                  Ce que <strong>votre enfant dit</strong> vouloir faire — ses propres mots, même
                  s'ils vous surprennent. Pour ces enfants, la déclaration est une boussole : Naya
                  l'explorera par l'expérience, sans jamais en faire un verdict.
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {ASPIRATION_SUGGESTIONS.map((s) => {
                    const on = draft.aspirations.some((a) => a.label === s);
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() =>
                          on
                            ? setDraft((d) => ({
                                ...d,
                                aspirations: d.aspirations.filter((a) => a.label !== s),
                              }))
                            : addAspiration(s)
                        }
                        className={
                          "rounded-full px-3 py-1 text-[11px] font-bold border-2 transition-all " +
                          (on
                            ? "bg-sky-100 border-sky-500 text-sky-800"
                            : "bg-white border-ink/15 text-ink/60 hover:border-ink/40")
                        }
                      >
                        {s}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    value={aspirationInput}
                    onChange={(e) => setAspirationInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addAspiration(aspirationInput);
                      }
                    }}
                    placeholder="Autre métier ou envie…"
                    className="flex-1 rounded-xl border border-ink/10 px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-brand"
                  />
                  <button
                    type="button"
                    onClick={() => addAspiration(aspirationInput)}
                    className="rounded-xl bg-ink px-3 py-2 text-xs font-bold text-white hover:bg-ink/90"
                  >
                    +
                  </button>
                </div>
                {draft.aspirations.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {draft.aspirations.map((a) => (
                      <span
                        key={a.label}
                        className="inline-flex max-w-full items-center gap-1 rounded-full bg-sky-50 border border-sky-200 px-2.5 py-1 text-[11px] font-bold text-sky-800"
                      >
                        <span className="truncate min-w-0">{a.label}</span>
                        <button
                          type="button"
                          onClick={() =>
                            setDraft((d) => ({
                              ...d,
                              aspirations: d.aspirations.filter((x) => x.label !== a.label),
                            }))
                          }
                          className="shrink-0 text-sky-600 hover:text-sky-900"
                          aria-label={`Retirer ${a.label}`}
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="press-white rounded-2xl border border-ink/10 bg-white px-4 sm:px-5 py-2.5 text-sm font-bold cursor-pointer"
          >
            Annuler
          </button>
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {wizardStep > 0 && (
              <button
                type="button"
                onClick={() => setWizardStep((s) => s - 1)}
                className="press-white rounded-2xl border border-ink/10 bg-white px-4 sm:px-5 py-2.5 text-sm font-bold cursor-pointer"
              >
                ← Précédent
              </button>
            )}
            {wizardStep < wizardSteps - 1 ? (
              <button
                type="button"
                onClick={() => setWizardStep((s) => s + 1)}
                className="press-brand rounded-2xl bg-brand px-5 sm:px-6 py-2.5 text-sm font-bold text-white cursor-pointer"
              >
                Suivant →
              </button>
            ) : (
              <button
                onClick={save}
                disabled={busy}
                className="press-brand rounded-2xl bg-brand px-5 sm:px-6 py-2.5 text-sm font-bold text-white disabled:opacity-60 cursor-pointer"
              >
                {busy ? "…" : "Enregistrer"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
