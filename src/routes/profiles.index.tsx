import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { Phone, Check, Loader2, Sparkles } from "lucide-react";
import { AppTabBar } from "@/components/AppTabBar";
import { ProfileDialog } from "@/components/profiles/ProfileDialog";
import { AVATAR_COLORS, type ChildProfile } from "@/components/profiles/shared";
import { getActiveChallenge, type ChallengeLike } from "@/lib/active-challenge";
import { getPortfolioPulse } from "@/lib/talent-buckets";
import { InviteMentorDialog } from "@/components/mentors/InviteMentorDialog";
import { TalentRadarChart } from "@/components/TalentRadarChart";

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

type Challenge = ChallengeLike & {
  domain: string;
  title: string;
  description: string;
  duration: string;
  materials?: string[] | null;
  steps?: string[] | null;
  proof_image_url?: string | null;
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
      .select("id, status, created_at, updated_at, domain, title, description, duration, materials, steps, proof_image_url")
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
      <nav className="border-b border-ink/5 bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/profiles" className="flex items-center gap-2 font-display text-2xl font-extrabold text-brand">
            <img src="/favicon-96x96.png" alt="" className="h-8 w-8" />
            GÉNIZIO
          </Link>
          <div className="hidden items-center gap-4 text-sm font-medium md:flex">
            <Link to="/profiles/manage" className="text-ink/60 hover:text-brand">Gérer mes profils</Link>
            <Link to="/laboratory" className="text-ink/60 hover:text-brand">Laboratoire</Link>
            <Link to="/feed" className="text-ink/60 hover:text-brand">Mur Public</Link>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link
              to="/profile"
              className="hidden items-center gap-1.5 rounded-full border border-brand/20 bg-brand/5 px-4 py-2 font-bold text-brand hover:bg-brand/10 md:flex transition-all"
            >
              ⚙️ {session.user.email}
            </Link>
            <Link
              to="/profile"
              className="flex items-center justify-center rounded-full border border-brand/20 bg-brand/5 p-2 font-bold text-brand hover:bg-brand/10 md:hidden transition-all"
              aria-label="Mon Compte"
            >
              ⚙️
            </Link>
            <button onClick={signOut} className="rounded-full border border-ink/10 px-4 py-2 font-semibold hover:bg-white cursor-pointer">
              Se déconnecter
            </button>
          </div>
        </div>
      </nav>

      <main className="mx-auto max-w-6xl px-6 py-10 md:flex md:gap-8">
        {selected && <AppTabBar profileId={selected.id} />}

        <div className="min-w-0 flex-1">
          <div className="mb-8">
            <p className="text-sm text-ink/50">Bonjour !</p>
            <h1 className="font-display text-3xl font-extrabold md:text-4xl">
              {selected ? `Voici où en est ${selected.name} cette semaine.` : "Mes profils enfants"}
            </h1>
          </div>

          {fetching ? (
            <p className="text-ink/40">Chargement…</p>
          ) : profiles.length === 0 ? (
            <div className="rounded-3xl border-2 border-dashed border-ink/10 bg-white/40 p-12 text-center">
              <p className="mb-4 text-ink/60">Aucun profil pour l'instant. Créez le premier.</p>
              <button
                onClick={() => setCreating(true)}
                className="rounded-2xl bg-brand px-6 py-3 text-sm font-bold text-white shadow-brand hover:bg-brand-dark"
              >
                + Nouveau profil
              </button>
            </div>
          ) : (
            <>
              <div className="mb-8 flex flex-wrap items-center gap-2">
                {profiles.map((p) => {
                  const color = AVATAR_COLORS.find((c) => c.key === p.avatar_color)?.cls ?? "bg-brand";
                  const isActive = p.id === selectedId;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedId(p.id)}
                      className={`flex items-center gap-2 rounded-full px-3 py-2 text-sm font-bold transition-all ${
                        isActive ? "bg-ink text-white shadow-md" : "bg-white text-ink/70 ring-1 ring-ink/10 hover:bg-stone-50"
                      }`}
                    >
                      <span className={`grid size-6 place-items-center rounded-full text-[11px] font-bold text-white ${color}`}>
                        {p.name.charAt(0).toUpperCase()}
                      </span>
                      {p.name}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCreating(true)}
                  className="rounded-full border-2 border-dashed border-ink/15 px-3 py-2 text-sm font-bold text-ink/50 hover:border-brand hover:text-brand"
                >
                  + Ajouter
                </button>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-ink/5">
                  {fetchingChallenges ? (
                    <p className="text-sm text-ink/40">Chargement du défi…</p>
                  ) : activeChallenge ? (
                    <>
                      <div className="mb-3 flex items-center justify-between">
                        <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-brand">
                          {activeChallenge.domain}
                        </span>
                        <span className="text-xs font-semibold text-ink/40">⏱ {activeChallenge.duration}</span>
                      </div>
                      <h2 className="font-display text-xl font-extrabold">{activeChallenge.title}</h2>
                      <p className="mt-2 text-sm text-ink/70">{activeChallenge.description}</p>
                      
                      {activeChallenge.materials && activeChallenge.materials.length > 0 && (
                        <div className="mt-4 space-y-2">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-ink/40">Matériel nécessaire :</p>
                          <div className="flex flex-wrap gap-2">
                            {activeChallenge.materials.map((m, i) => (
                              <span key={i} className="inline-flex items-center gap-1 rounded-xl bg-surface px-2.5 py-1 text-xs font-medium text-ink/80 border border-ink/5">
                                📦 {m}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      <Link
                        to="/profiles/$profileId/challenges"
                        params={{ profileId: selected!.id }}
                        className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-brand hover:bg-brand-dark"
                      >
                        Commencer avec {selected!.name} →
                      </Link>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-ink/60">
                        Aucun défi en cours pour {selected?.name}. Générez-en un dans le laboratoire.
                      </p>
                      <Link
                        to="/profiles/$profileId/challenges"
                        params={{ profileId: selected!.id }}
                        className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-brand px-5 py-2.5 text-sm font-bold text-white shadow-brand hover:bg-brand-dark"
                      >
                        <Sparkles className="size-4" /> Générer un défi
                      </Link>
                    </>
                  )}
                </div>

                <div className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-ink/5 flex flex-col justify-between">
                  <div>
                    <p className="mb-3 text-xs font-bold uppercase tracking-wider text-ink/40">Pouls du portfolio</p>
                    <div className="h-44 w-full flex items-center justify-center my-2">
                      <TalentRadarChart talents={selected!.talents || {}} name={selected!.name} className="h-full w-full" />
                    </div>
                    <ul className="space-y-2 mt-4">
                      {pulse.slice(0, 3).map((entry) => (
                        <li key={entry.key} className="rounded-xl bg-surface px-3 py-1.5 text-xs font-medium text-ink/80">
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

              {/* Recent Artifacts Row from Wireframe 1b */}
              {challenges.filter(c => c.status === "completed" && c.proof_image_url).length > 0 && (
                <div className="mt-6 rounded-3xl bg-white p-6 shadow-soft ring-1 ring-ink/5">
                  <p className="mb-4 text-xs font-bold uppercase tracking-wider text-ink/40">Réalisations récentes</p>
                  <div className="flex gap-4 overflow-x-auto pb-2">
                    {challenges
                      .filter(c => c.status === "completed" && c.proof_image_url)
                      .slice(0, 5)
                      .map(c => (
                        <div key={c.id} className="relative size-16 shrink-0 overflow-hidden rounded-2xl border border-ink/10 bg-surface group cursor-pointer" title={c.title}>
                          <img src={c.proof_image_url!} alt={c.title} className="h-full w-full object-cover" />
                        </div>
                      ))}
                  </div>
                </div>
              )}

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  to="/profiles/$profileId/challenges"
                  params={{ profileId: selected!.id }}
                  className="rounded-2xl border border-ink/10 bg-white px-4 py-2.5 text-sm font-bold text-ink/70 hover:bg-stone-50"
                >
                  Logger une observation
                </Link>
                <InviteMentorDialog childId={selected!.id} childName={selected!.name} />
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
          <div className="w-full max-w-md rounded-3xl border border-ink/5 bg-white p-6 shadow-xl animate-in zoom-in-95 duration-200 md:p-8">
            <div className="text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-brand/10 text-brand">
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
                    className="rounded-xl border border-ink/10 bg-stone-50 px-3 py-3 text-sm font-bold outline-none focus:border-brand cursor-pointer"
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
                      className="w-full rounded-xl border border-ink/10 px-4 py-3 text-sm font-bold outline-none focus:border-brand placeholder:font-normal placeholder:text-ink/30"
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
                  className="flex w-full items-center justify-center gap-2 rounded-2xl bg-brand py-3.5 text-sm font-bold text-white shadow-md shadow-brand/20 hover:bg-brand-dark transition-all disabled:opacity-50 cursor-pointer"
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
    </div>
  );
}
