import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { Phone, Check, Loader2, Trophy, Lock } from "lucide-react";
import { AppTabBar } from "@/components/AppTabBar";
import { AppHeader } from "@/components/AppHeader";
import { ProfileDialog } from "@/components/profiles/ProfileDialog";
import { AVATAR_COLORS, type ChildProfile } from "@/components/profiles/shared";
import { getActiveChallenge, type ChallengeLike } from "@/lib/active-challenge";
import { getPortfolioPulse } from "@/lib/talent-buckets";
import { getChildGuild } from "@/lib/guilds";
import { InviteMentorDialog } from "@/components/mentors/InviteMentorDialog";
import { TalentRadarChart } from "@/components/TalentRadarChart";
import { NayaAvatar } from "@/components/NayaAvatar";
import { KitSuggestion } from "@/components/challenges/KitSuggestion";
import { DifficultyBadge } from "@/components/challenges/DifficultyBadge";
import { MarkdownContent } from "@/components/ui/markdown-content";

const COUNTRIES = [
  { code: "+225", flag: "🇨🇮", name: "Côte d'Ivoire", limit: 10 },
  { code: "+221", flag: "🇸🇳", name: "Sénégal", limit: 9 },
  { code: "+237", flag: "🇨🇲", name: "Cameroun", limit: 9 },
  { code: "+223", flag: "🇲🇱", name: "Mali", limit: 8 },
  { code: "+224", flag: "🇬🇳", name: "Guinée", limit: 9 },
  { code: "+226", flag: "🇧🇫", name: "Burkina Faso", limit: 8 },
  { code: "+228", flag: "🇹🇬", name: "Togo", limit: 8 },
  { code: "+229", flag: "🇧🇯", name: "Bénin", limit: 8 },
  { code: "+242", flag: "🇨🇬", name: "Congo", limit: 9 },
  { code: "+243", flag: "🇨🇩", name: "RDC", limit: 9 },
  { code: "+212", flag: "🇲🇦", name: "Maroc", limit: 9 },
  { code: "+33", flag: "🇫🇷", name: "France", limit: 9 },
];

export const Route = createFileRoute("/profiles/")({
  component: DashboardPage,
});

type Challenge = {
  id: string;
  status: "todo" | "in_progress" | "completed";
  created_at: string;
  updated_at: string;
  domain: string;
  title: string;
  description: string;
  duration: string;
  materials?: string[] | null;
  material_tags?: string[] | null;
  steps?: string[] | null;
  proof_image_url?: string | null;
  difficulty?: string | null;
};

function DashboardPage() {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<ChildProfile[]>([]);
  const [fetching, setFetching] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [fetchingChallenges, setFetchingChallenges] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [activeProducts, setActiveProducts] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("products")
      .select("id, material_tags")
      .eq("is_active", true)
      .then(({ data }) => {
        if (data) setActiveProducts(data);
      });
  }, []);

  const hasKit = (materialTags?: string[] | null) => {
    if (!materialTags || materialTags.length === 0) return false;
    return activeProducts.some((product) =>
      product.material_tags?.some((t: string) => materialTags.includes(t))
    );
  };

  // Phone Onboarding States
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [savingPhone, setSavingPhone] = useState(false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  useEffect(() => {
    if (session && !session.user.user_metadata?.phone) {
      setShowPhoneModal(true);
    }
  }, [session]);

  useEffect(() => {
    if (showPhoneModal && session?.user?.user_metadata?.phone) {
      const savedPhone = session.user.user_metadata.phone;
      const foundCountry = COUNTRIES.find((c) => savedPhone.startsWith(c.code));
      if (foundCountry) {
        setSelectedCountry(foundCountry);
        setPhoneNumber(savedPhone.replace(foundCountry.code, ""));
      }
    }
  }, [showPhoneModal, session]);

  const handleSavePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneNumber.length < selectedCountry.limit - 2) {
      setPhoneError(`Le numéro doit contenir au moins ${selectedCountry.limit - 2} chiffres.`);
      return;
    }
    setSavingPhone(true);
    setPhoneError(null);
    try {
      const fullPhone = `${selectedCountry.code}${phoneNumber}`;
      const { error } = await supabase.auth.updateUser({ data: { phone: fullPhone } });
      if (error) throw error;
      setShowPhoneModal(false);
    } catch (err) {
      setPhoneError(err instanceof Error ? err.message : "Erreur d'enregistrement.");
    } finally {
      setSavingPhone(false);
    }
  };

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [session, loading, navigate]);

  const refetch = async () => {
    if (!session) return;
    setFetching(true);
    const { data } = await supabase
      .from("child_profiles")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });
    const list = (data ?? []) as ChildProfile[];
    setProfiles(list);
    setSelectedId((prev) => prev ?? list[0]?.id ?? null);
    setFetching(false);
  };

  useEffect(() => {
    if (session) void refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    if (!selectedId) {
      setChallenges([]);
      return;
    }
    setFetchingChallenges(true);
    supabase
      .from("challenges")
      .select("id, status, created_at, updated_at, domain, title, description, duration, materials, material_tags, steps, proof_image_url, difficulty")
      .eq("child_id", selectedId)
      .then(({ data }) => {
        setChallenges((data ?? []) as Challenge[]);
        setFetchingChallenges(false);
      });
  }, [selectedId]);

  const selected = profiles.find((p) => p.id === selectedId) ?? null;
  const activeChallenge = useMemo(() => getActiveChallenge(challenges), [challenges]);
  const pulse = useMemo(() => getPortfolioPulse(selected?.talents), [selected]);

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
    <div className="min-h-screen bg-surface pb-24 text-ink md:pb-6">
      <AppHeader />

      <main className="mx-auto max-w-6xl px-6 py-10 md:flex md:gap-8">
        {selected && <AppTabBar profileId={selected.id} />}

        <div className="min-w-0 flex-1">
          <div className="mb-6">
            <div className="mb-3 flex items-end gap-3" style={{ paddingTop: "3.5rem", marginTop: "-3.5rem" }}>
              <NayaAvatar size="sm" thoughts={[`Bonjour ! Prêt à explorer avec ${selected?.name ?? "votre enfant"} ?`]} />
              <p className="text-sm text-ink/50 mb-0.5">Bonjour !</p>
            </div>
            <h1 className="font-display text-3xl font-extrabold md:text-4xl">
              {selected ? `Voici où en est ${selected.name} cette semaine.` : "Mes profils enfants"}
            </h1>
          </div>

          {/* Badge Guilde de l'enfant sélectionné */}
          {selected && (() => {
            const guild = getChildGuild(selected.talents);
            return (
              <div className="mb-8 flex items-center gap-3">
                <div className={`inline-flex items-center gap-2 rounded-2xl border-[3px] border-ink px-4 py-2.5 shadow-brutal-sm font-bold text-sm ${guild.bgColor} ${guild.color}`}>
                  <span className="text-xl">{guild.emoji}</span>
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-widest opacity-60">Guilde de {selected.name}</p>
                    <p className="font-display text-base font-black leading-tight">{guild.name}</p>
                  </div>
                </div>
                <p className="hidden text-sm text-ink/60 font-medium italic sm:block">« {guild.tagline} »</p>
              </div>
            );
          })()}

          {fetching ? (
            <p className="text-ink/40">Chargement…</p>
          ) : profiles.length === 0 ? (
            <div className="rounded-3xl border-[3px] border-dashed border-ink bg-white/40 p-12 text-center shadow-brutal-sm">
              <p className="mb-4 text-ink/60">Aucun profil pour l'instant. Créez le premier.</p>
              <button
                onClick={() => setCreating(true)}
                className="rounded-2xl border-[3px] border-ink bg-brand px-6 py-3 text-sm font-bold text-white shadow-brutal hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all"
              >
                + Nouveau profil
              </button>
            </div>
          ) : (
            <>
              <div className="mb-10">
                <div className="flex flex-wrap items-center gap-4">
                  {profiles.map((p) => {
                    const isActive = p.id === selectedId;
                    return (
                      <button
                        key={p.id}
                        onClick={() => setSelectedId(p.id)}
                        className={`group flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 transition-all px-6 py-2.5 rounded-full border-2 border-ink shadow-brutal-sm font-bold text-sm ${
                          isActive
                            ? "bg-brand text-white"
                            : "bg-sky text-ink hover:bg-sky/80"
                        }`}
                      >
                        {p.name}
                        {isActive && <span className="flex size-4 items-center justify-center rounded-full border border-white text-[10px]">✓</span>}
                      </button>
                    );
                  })}
                  {(() => {
                    const FREE_SLOTS = 2;
                    const extraSlots = (session?.user?.app_metadata?.extra_profile_slots as number) ?? 0;
                    const quota = FREE_SLOTS + extraSlots;
                    const atQuota = profiles.length >= quota;
                    return (
                      <button
                        onClick={() => atQuota ? setShowUpgradeModal(true) : setCreating(true)}
                        title={atQuota ? `Quota atteint (${quota} profils). Débloquer un slot supplémentaire.` : "Ajouter un enfant"}
                        className={`flex size-11 items-center justify-center rounded-full border-2 border-ink shadow-brutal-sm text-xl font-bold transition-all ${
                          atQuota
                            ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                            : "bg-white text-ink hover:bg-surface"
                        }`}
                      >
                        {atQuota ? <Lock className="size-4" /> : "+"}
                      </button>
                    );
                  })()}
                </div>
              </div>

              <div className="grid gap-8 md:grid-cols-2">
                <div className="flex flex-col">
                  <h2 className="mb-4 text-2xl font-display font-medium text-ink flex justify-between items-center">
                    Cette semaine
                    <div className="flex items-center gap-2">
                      {activeChallenge && (
                        <span className="rounded-full bg-brand px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white border-2 border-ink shadow-brutal-sm">
                          {activeChallenge.domain}
                        </span>
                      )}
                      {activeChallenge && <DifficultyBadge difficulty={activeChallenge.difficulty} />}
                      {activeChallenge && hasKit(activeChallenge.material_tags) && (
                        <span className="rounded-full bg-sky px-3 py-1 text-[10px] font-black uppercase tracking-widest text-ink border-2 border-ink shadow-brutal-sm">
                          📦 Kit disponible
                        </span>
                      )}
                    </div>
                  </h2>
                  <div className="rounded-3xl bg-white p-6 shadow-brutal border-[3px] border-ink flex flex-col min-h-[300px]">
                    {fetchingChallenges ? (
                      <div className="flex flex-1 items-center justify-center py-10">
                        <Loader2 className="size-6 animate-spin text-brand" />
                      </div>
                    ) : activeChallenge ? (
                      <div className="flex-1 flex flex-col justify-between">
                        <div>
                          <div className="flex gap-4 mb-4">
                            <div className="size-16 shrink-0 rounded-2xl bg-brand flex items-center justify-center border-2 border-ink shadow-brutal-sm text-white">
                              <Trophy className="size-8" />
                            </div>
                            <div>
                              <h3 className="font-display text-xl font-bold text-ink leading-tight mb-2">
                                {activeChallenge.title}
                              </h3>
                              <div className="text-sm text-ink/80 leading-relaxed font-medium">
                                <MarkdownContent content={activeChallenge.description} />
                              </div>
                            </div>
                          </div>

                          {activeChallenge.materials && activeChallenge.materials.length > 0 && (
                            <div className="mb-2 flex flex-wrap gap-2">
                              {activeChallenge.materials.slice(0, 4).map((m, i) => (
                                <span key={i} className="inline-flex items-center gap-1 rounded-full border-2 border-ink bg-surface px-2.5 py-1 text-[11px] font-bold text-ink">
                                  📦 {m}
                                </span>
                              ))}
                            </div>
                          )}

                          <div className="mb-2">
                            <KitSuggestion
                              childId={selected!.id}
                              challengeId={activeChallenge.id}
                              materialTags={activeChallenge.material_tags}
                              challengeTitle={activeChallenge.title}
                              childName={selected?.name ?? ""}
                            />
                          </div>

                          <hr className="border-t border-dashed border-ink/30 my-5" />
                        </div>

                        <div className="mt-auto flex flex-col gap-3">
                          <Link
                            to="/profiles/$profileId/challenges"
                            params={{ profileId: selected!.id }}
                            className="w-full text-center rounded-xl bg-brand-dark px-6 py-4 text-base font-bold text-white shadow-brutal border-[3px] border-ink hover:-translate-y-0.5 active:translate-y-1 transition-all cursor-pointer"
                          >
                            Commencer le défi
                          </Link>
                          <Link
                            to="/profiles/$profileId/quest"
                            params={{ profileId: selected!.id }}
                            className="w-full text-center rounded-xl bg-sky px-6 py-3 text-sm font-bold text-ink shadow-brutal-sm border-[3px] border-ink hover:-translate-y-0.5 active:translate-y-1 transition-all cursor-pointer"
                          >
                            Mode Enfant (Quête) 🎮
                          </Link>
                        </div>
                      </div>
                    ) : (
                      <div className="flex-1 flex flex-col justify-center items-center py-4 text-center">
                        <span className="inline-block text-4xl mb-4">🌟</span>
                        <p className="text-sm text-ink/80 font-bold mb-6">
                          Aucun défi en cours pour {selected?.name}.
                        </p>
                        <Link
                          to="/profiles/$profileId/challenges"
                          params={{ profileId: selected!.id }}
                          className="w-full text-center rounded-xl bg-brand px-6 py-4 text-base font-bold text-white shadow-brutal border-[3px] border-ink hover:-translate-y-0.5 active:translate-y-1 transition-all cursor-pointer"
                        >
                          Générer un défi
                        </Link>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex flex-col">
                  <h2 className="mb-4 text-2xl font-display font-medium text-ink">
                    Pouls du portfolio
                  </h2>
                  <div className="rounded-3xl bg-white p-6 shadow-brutal border-[3px] border-ink flex flex-col justify-between min-h-[300px]">
                    <div>
                      <div className="h-44 w-full flex items-center justify-center my-2">
                        <TalentRadarChart talents={selected!.talents || {}} name={selected!.name} className="h-full w-full" age={selected!.age} />
                      </div>
                      <ul className="space-y-2 mt-4">
                        {pulse.slice(0, 3).map((entry) => (
                          <li key={entry.key} className="rounded-xl border-2 border-ink bg-surface px-3 py-1.5 text-xs font-bold text-ink/80">
                            {entry.phrase}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <Link
                      to="/profiles/$profileId/portfolio"
                      params={{ profileId: selected!.id }}
                      className="mt-4 inline-block text-sm font-bold text-brand hover:text-brand-dark"
                    >
                      Voir le portfolio complet →
                    </Link>
                  </div>
                </div>
              </div>

              <div className="mt-8 grid gap-6 md:grid-cols-2">
                <Link
                  to="/profiles/$profileId/challenges"
                  params={{ profileId: selected!.id }}
                  className="rounded-3xl bg-sky border-[3px] border-ink shadow-brutal p-8 flex flex-col items-center justify-center gap-4 text-ink font-bold hover:bg-sky/80 transition-all hover:-translate-y-1 active:translate-y-0"
                >
                  <div className="size-16 rounded-full bg-brand text-white border-[3px] border-ink shadow-brutal-sm flex items-center justify-center">
                    <Trophy className="size-8" />
                  </div>
                  <span className="text-lg">Voir les missions</span>
                </Link>

                <InviteMentorDialog
                  childId={selected!.id}
                  childName={selected!.name}
                  customTrigger={
                    <button className="rounded-3xl bg-sky border-[3px] border-ink shadow-brutal p-8 flex flex-col items-center justify-center gap-4 text-ink font-bold hover:bg-sky/80 transition-all hover:-translate-y-1 active:translate-y-0 cursor-pointer w-full text-center">
                      <div className="size-16 rounded-full bg-surface text-ink border-[3px] border-ink shadow-brutal-sm flex items-center justify-center">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" x2="19" y1="8" y2="14"/><line x1="22" x2="16" y1="11" y2="11"/></svg>
                      </div>
                      <span className="text-lg">Inviter un mentor</span>
                    </button>
                  }
                />
              </div>

            </>
          )}
        </div>
      </main>

      {creating && (
        <ProfileDialog
          initial={null}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            void refetch();
          }}
          userId={session.user.id}
        />
      )}

      {showPhoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-3xl border-[3px] border-ink bg-white p-6 shadow-brutal animate-in zoom-in-95 duration-200 md:p-8">
            <div className="text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border-2 border-ink bg-brand/10 text-brand">
                <Phone className="size-6" />
              </div>
              <h2 className="mt-4 font-display text-2xl font-extrabold leading-tight">
                {session?.user?.user_metadata?.phone ? "Mon Compte" : "Une dernière étape !"}
              </h2>
              <p className="mt-2 text-sm text-ink/60">
                {session?.user?.user_metadata?.phone
                  ? "Modifiez votre numéro de téléphone ci-dessous."
                  : "Ajoutez votre numéro de téléphone pour recevoir des alertes de défis et suivre l'évolution de vos enfants."}
              </p>
            </div>

            <form onSubmit={handleSavePhone} className="mt-6 space-y-4">
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-ink/50">
                  Numéro de téléphone
                </label>
                <div className="flex gap-2">
                  <select
                    value={selectedCountry.code}
                    onChange={(e) => {
                      const found = COUNTRIES.find((c) => c.code === e.target.value);
                      if (found) {
                        setSelectedCountry(found);
                        setPhoneNumber("");
                      }
                    }}
                    className="rounded-xl border-[3px] border-ink bg-white px-3 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-brand cursor-pointer shadow-brutal-sm"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.code}
                      </option>
                    ))}
                  </select>

                  <div className="relative flex-1">
                    <input
                      type="tel"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={selectedCountry.limit}
                      value={phoneNumber}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        setPhoneNumber(val);
                      }}
                      placeholder={`ex: 0123456789`}
                      className="w-full rounded-xl border-[3px] border-ink px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-brand placeholder:font-normal placeholder:text-ink/30 shadow-brutal-sm"
                      required
                    />
                  </div>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] font-medium text-ink/40">
                  <span>Pays : {selectedCountry.name}</span>
                  <span>{phoneNumber.length} / {selectedCountry.limit} chiffres</span>
                </div>
              </div>

              {phoneError && (
                <p className="rounded-lg bg-red-50 p-3 text-xs font-semibold text-red-700">
                  {phoneError}
                </p>
              )}

              <div className="mt-6 flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={savingPhone || !phoneNumber}
                  className="flex w-full items-center justify-center gap-2 rounded-2xl border-[3px] border-ink bg-brand py-3.5 text-sm font-bold text-white shadow-brutal hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all disabled:opacity-50 cursor-pointer"
                >
                  {savingPhone ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Enregistrement...</span>
                    </>
                  ) : (
                    <>
                      <Check className="size-4" />
                      <span>Enregistrer et continuer</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPhoneModal(false)}
                  className="w-full py-2.5 text-center text-xs font-bold text-ink/40 hover:text-ink transition-all cursor-pointer"
                >
                  {session?.user?.user_metadata?.phone ? "Fermer" : "Passer pour l'instant"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Upgrade Modal — Profil supplémentaire ────────────────────── */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/70 p-4 backdrop-blur-sm" onClick={() => setShowUpgradeModal(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl border-[3px] border-ink bg-white p-8 shadow-brutal"
          >
            {/* Header */}
            <div className="mb-6 flex items-start gap-4">
              <div className="grid size-14 shrink-0 place-items-center rounded-2xl border-[3px] border-ink bg-amber-100 text-3xl shadow-brutal-sm">
                🔒
              </div>
              <div>
                <h2 className="font-display text-2xl font-extrabold text-ink leading-tight">
                  Quota gratuit atteint
                </h2>
                <p className="mt-1 text-sm text-ink/60 font-medium">
                  Vous avez déjà {profiles.length} profils enregistrés.
                </p>
              </div>
            </div>

            {/* Pricing */}
            <div className="mb-6 rounded-2xl border-[3px] border-ink bg-surface p-5 shadow-brutal-sm">
              <p className="text-xs font-black uppercase tracking-widest text-ink/40 mb-1">Profil supplémentaire</p>
              <p className="font-display text-3xl font-black text-ink">
                5 000 <span className="text-lg text-ink/60">FCFA</span>
              </p>
              <p className="mt-2 text-xs text-ink/60 leading-relaxed">
                Chaque nouveau slot est débloqué manuellement après confirmation du paiement via WhatsApp. Votre accès est permanent.
              </p>
            </div>

            {/* Steps */}
            <ol className="mb-6 space-y-2 text-sm font-medium text-ink/80">
              {[
                "Envoyez le message WhatsApp ci-dessous",
                "Effectuez le virement de 5 000 FCFA",
                "L'administrateur active votre slot dans les 24h",
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-brand text-[10px] font-black text-white">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>

            {/* WhatsApp CTA */}
            <a
              href={`https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER || "33606433148"}?text=${encodeURIComponent(
                `Bonjour, je souhaite débloquer un profil supplémentaire sur Génizio.\nCompte : ${session?.user?.email}\nMontant : 5 000 FCFA`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2.5 rounded-2xl border-[3px] border-ink bg-[#25D366] py-3.5 font-bold text-sm text-white shadow-brutal hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all"
            >
              <Phone className="size-4 fill-white" />
              Contacter l'administrateur sur WhatsApp
            </a>

            <button
              onClick={() => setShowUpgradeModal(false)}
              className="mt-3 w-full py-2 text-center text-xs font-bold text-ink/40 hover:text-ink transition-all"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
