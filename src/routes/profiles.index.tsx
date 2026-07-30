import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { Phone, Check, Loader2, Trophy, Lock, ChevronDown, Plus, ShoppingBag } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AppTabBar } from "@/components/AppTabBar";
import { AppHeader } from "@/components/AppHeader";
import { ProfileDialog } from "@/components/profiles/ProfileDialog";
import { AVATAR_COLORS, type ChildProfile } from "@/components/profiles/shared";
import { getActiveChallenge, type ChallengeLike } from "@/lib/active-challenge";
import { getPortfolioPulse, TALENT_KEY_LABELS, getTalentBucket, TALENT_BUCKET_LABEL } from "@/lib/talent-buckets";
import { calculateXPGain } from "@/lib/challenges.functions";
import { getChildGuild } from "@/lib/guilds";
import { InviteMentorDialog } from "@/components/mentors/InviteMentorDialog";
import { TalentRadarChart } from "@/components/TalentRadarChart";
import { NayaAvatar } from "@/components/NayaAvatar";
import { KitSuggestion } from "@/components/challenges/KitSuggestion";
import { DifficultyBadge } from "@/components/challenges/DifficultyBadge";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { COUNTRIES } from "@/lib/countries";
import { GenizioLoader } from "@/components/GenizioLoader";
import { toast } from "sonner";

export const Route = createFileRoute("/profiles/")({
  // "new=true" vient du CTA du mail de bienvenue ("Créer le profil de mon enfant") : ouvre
  // directement le formulaire de création plutôt que de laisser le parent recliquer un
  // deuxième bouton une fois arrivé sur le tableau de bord.
  validateSearch: (search: Record<string, unknown>): { new?: boolean } => ({
    new: search.new === "true" || search.new === true ? true : undefined,
  }),
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
  const { new: openCreateOnLoad } = Route.useSearch();
  const [profiles, setProfiles] = useState<ChildProfile[]>([]);
  const [fetching, setFetching] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [fetchingChallenges, setFetchingChallenges] = useState(false);
  const [creating, setCreating] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [activeProducts, setActiveProducts] = useState<any[]>([]);

  const hasRefreshedSessionRef = useRef(false);
  useEffect(() => {
    // extra_profile_slots lives in the session JWT's app_metadata, cached
    // client-side since login/last token refresh. When an admin grants a
    // slot, this session doesn't see it until the token refreshes, which
    // can silently block "+ Nouveau profil" below even though the DB-side
    // quota (enforced by the enforce_child_profile_quota trigger, which
    // reads auth.users live) was actually raised. Refresh once on mount so
    // the quota gate reflects the real current slot count.
    //
    // Guarded with a ref, not just `if (session)`: refreshSession() itself
    // triggers onAuthStateChange, which gives useSession() a new session
    // object — with `[session]` as the only dependency, that re-fired this
    // effect, which called refreshSession() again, which produced another
    // new session object, forever. That infinite refresh loop is what
    // showed up as the profiles page endlessly flickering on load.
    if (!loading && session && !hasRefreshedSessionRef.current) {
      hasRefreshedSessionRef.current = true;
      void supabase.auth.refreshSession();
    }
  }, [loading, session]);

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
    if (!loading && !session) {
      // Préserve "?new=true" (venu du mail de bienvenue) à travers l'aller-retour de
      // connexion, sinon un parent pas encore connecté perd l'ouverture automatique du
      // formulaire de création une fois revenu sur /profiles après s'être authentifié.
      navigate({
        to: "/auth",
        search: openCreateOnLoad ? { redirect: "/profiles?new=true" } : undefined,
        replace: true,
      });
    }
  }, [session, loading, navigate, openCreateOnLoad]);

  useEffect(() => {
    if (!fetching && openCreateOnLoad) setCreating(true);
  }, [fetching, openCreateOnLoad]);

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
    // Keep the current selection only if it's still in the refetched list —
    // it may have been deleted elsewhere (another tab, /profiles/manage)
    // since the last fetch, which would otherwise leave selectedId pointing
    // at a profile that no longer exists. On a fresh mount (prev is null,
    // e.g. after a page reload) fall back to the last profile the user
    // picked, persisted in localStorage, rather than always the newest one.
    const storedId = localStorage.getItem(`genizio:selectedChildId:${session.user.id}`);
    setSelectedId((prev) => {
      if (prev && list.some((p) => p.id === prev)) return prev;
      if (storedId && list.some((p) => p.id === storedId)) return storedId;
      return list[0]?.id ?? null;
    });
    setFetching(false);
  };

  useEffect(() => {
    if (session) void refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  useEffect(() => {
    if (session && selectedId) {
      localStorage.setItem(`genizio:selectedChildId:${session.user.id}`, selectedId);
    }
  }, [session, selectedId]);

  useEffect(() => {
    if (!selectedId) {
      setChallenges([]);
      return;
    }
    let isMounted = true;
    const fetchChallenges = async () => {
      setFetchingChallenges(true);
      try {
        const { data, error } = await supabase
          .from("challenges")
          .select("id, status, created_at, updated_at, domain, title, description, duration, materials, material_tags, steps, proof_image_url, difficulty")
          .eq("child_id", selectedId);

        if (!isMounted) return;
        if (error) {
          console.error("Error fetching challenges:", error);
          toast.error("Erreur lors du chargement des défis.");
          setChallenges([]);
        } else {
          setChallenges((data ?? []) as Challenge[]);
        }
      } catch (err) {
        if (!isMounted) return;
        console.error("Error fetching challenges:", err);
        toast.error("Erreur lors du chargement des défis.");
        setChallenges([]);
      } finally {
        if (isMounted) {
          setFetchingChallenges(false);
        }
      }
    };

    void fetchChallenges();

    return () => {
      isMounted = false;
    };
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
      <div className="grid min-h-dvh place-items-center bg-surface">
        <GenizioLoader label="Chargement…" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-surface pb-24 text-ink ">
      <AppHeader />

      <main className="mx-auto max-w-6xl px-6 py-10 md:flex ">
        {selected && <AppTabBar profileId={selected.id} />}

        <div className="min-w-0 flex-1">
          {!selected && (
            <div className="mb-6">
              <h1 className="font-display text-balance text-3xl font-extrabold md:text-4xl">
                Mes profils enfants
              </h1>
            </div>
          )}

          {fetching ? (
            <GenizioLoader className="py-8" />
          ) : profiles.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-ink/20 bg-white/60 p-12 text-center shadow-md backdrop-blur-md">
              <p className="mb-4 text-ink/60">Aucun profil pour l'instant. Créez le premier.</p>
              <button
                onClick={() => setCreating(true)}
                className="press-brand rounded-2xl bg-brand px-6 py-3 text-sm font-bold text-white cursor-pointer"
              >
                + Nouveau profil
              </button>
            </div>
          ) : (
            <>
              {selected && (() => {
                const guild = getChildGuild(selected.talents);
                const dateStr = new Date().toLocaleDateString('fr-FR', { weekday: 'long' });
                const capitalizedDate = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
                const avatarColor = AVATAR_COLORS[profiles.findIndex(p=>p.id===selected.id)%AVATAR_COLORS.length] || AVATAR_COLORS[0];
                // Calculé sur les 9 domaines réels (selected.talents), pas sur `pulse` qui
                // est plafonné à 5 entrées — pulse.filter(...) sous-comptait dès qu'un
                // enfant avait plus de 5 domaines actifs.
                const activeDomains = Object.entries(selected.talents || {})
                  .filter(([, score]) => (score || 0) > 0)
                  .sort(([, a], [, b]) => (b || 0) - (a || 0))
                  .map(([key, score]) => ({ key, label: TALENT_KEY_LABELS[key] ?? key, score: score || 0, bucket: getTalentBucket(score || 0) }));
                const activeTalents = activeDomains.length;
                const totalXP = selected.xp || 0;
                const currentLevel = Math.floor(totalXP / 500) + 1;
                const xpPct = Math.min(100, (totalXP % 500) / 500 * 100);

                // Pivot confirmé (2026-07-22) : paywall par slot retiré au profit d'une limite
                // gratuite de 5 pour tous, monétisation via les Saisons. Slots bonus achetés
                // avant ce pivot honorés via Math.max — cf. ProfileDialog.tsx pour le détail.
                const BASE_FREE_LIMIT = 5;
                const LEGACY_FREE_SLOTS = 2;
                const extraSlots = (session?.user?.app_metadata?.extra_profile_slots as number) ?? 0;
                const quota = Math.max(BASE_FREE_LIMIT, LEGACY_FREE_SLOTS + extraSlots);
                const atQuota = profiles.length >= quota;

                return (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-300 ease-out md:mx-auto max-w-[414px] w-full">
                    
                    {/* Top Header Prototype */}
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-3">
                        <div className={`size-11 rounded-full object-cover shadow-sm flex items-center justify-center text-white font-bold text-lg ${avatarColor.bg} ${avatarColor.text}`}>
                          {selected.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-xs text-ink/60 font-semibold">{capitalizedDate} · bonjour</div>
                          <DropdownMenu>
                            <DropdownMenuTrigger className="focus:outline-none flex items-center gap-1 group cursor-pointer">
                              <div className="font-display text-balance font-bold text-[20px] leading-none group-hover:text-brand transition-colors">{selected.name}, {selected.age ?? 9} ans</div>
                              <ChevronDown className="size-4 text-ink/60 group-hover:text-brand transition-colors" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start" className="w-[220px] rounded-3xl shadow-xl border border-ink/10 p-2 bg-white/95 backdrop-blur-md">
                              {profiles.map(p => (
                                <DropdownMenuItem 
                                  key={p.id} 
                                  className={`rounded-xl py-2.5 px-3 mb-1 cursor-pointer font-bold outline-none ${p.id === selected.id ? 'bg-brand/10 text-brand' : 'text-ink focus:bg-ink/5'}`}
                                  onClick={() => setSelectedId(p.id)}
                                >
                                  {p.name}
                                  {p.id === selected.id && <Check className="size-4 ml-auto" />}
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuSeparator className="my-1 border-border/60" />
                              <DropdownMenuItem 
                                className="rounded-xl py-2.5 px-3 cursor-pointer font-bold text-brand outline-none focus:bg-brand/5"
                                onClick={() => atQuota ? setShowUpgradeModal(true) : setCreating(true)}
                              >
                                <Plus className="size-4 mr-2" /> Nouveau profil
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Popover>
                          <PopoverTrigger className="inline-flex items-center gap-[5px] px-3 py-2 bg-glow-100 rounded-full font-display text-balance font-bold text-[14px] text-brand-700 shadow-sm cursor-pointer outline-none">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
                            {selected.streak || 0}
                          </PopoverTrigger>
                          <PopoverContent align="end" className="w-64 rounded-2xl border border-ink/10 bg-white p-4 shadow-xl">
                            <p className="font-display text-balance text-sm font-bold text-ink">
                              {selected.streak ? `🔥 ${selected.streak} semaine${selected.streak > 1 ? "s" : ""} d'affilée` : "Pas encore de série"}
                            </p>
                            <p className="mt-1 text-xs leading-relaxed text-ink/60">
                              {selected.streak
                                ? "Termine un défi cette semaine pour continuer ta série."
                                : "Termine un défi cette semaine pour démarrer ta série !"}
                            </p>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    {/* Naya daily bubble */}
                    <div className="flex gap-3 items-start bg-card rounded-3xl p-[15px] shadow-md mb-[18px] border border-border">
                      <img src="/naya-mascot.png" alt="Naya" className="size-11 rounded-full object-cover shrink-0 animate-[gzDots_4s_ease-in-out_infinite]" style={{ animation: "gz-float 4s ease-in-out infinite" }} />
                      <div>
                        <div className="font-display text-balance font-semibold text-[13px] text-brand">Naya</div>
                        <div className="text-[15px] leading-[1.4] text-ink mt-[2px]">Prête pour ton défi de la semaine, {selected.name}&nbsp;? On construit&nbsp;— pour de vrai&nbsp;!</div>
                      </div>
                    </div>

                    {/* "Ton défi de la semaine" */}
                    <div className="font-display text-balance font-bold text-[13px] tracking-[.06em] uppercase text-ink/40 mx-1 mb-[10px]">Ton défi de la semaine</div>
                    
                    {fetchingChallenges ? (
                      <div className="rounded-[1.5rem] border border-dashed border-ink/20 bg-white/60 p-12 text-center flex justify-center shadow-lg backdrop-blur-md mb-5">
                        <Loader2 className="size-6 animate-spin text-brand" />
                      </div>
                    ) : activeChallenge ? (
                      <div className="relative rounded-[1.5rem] overflow-hidden shadow-lg mb-5">
                        <div className="absolute inset-0" style={{ background: `linear-gradient(150deg, var(--guild-${guild.key === 'aucune' ? 'batisseurs' : guild.key}), oklch(0.6 0.15 45))` }}></div>
                        <div className="absolute -top-10 -right-7 w-[180px] h-[180px]" style={{ background: "radial-gradient(circle,rgba(255,255,255,.28),transparent 70%)" }}></div>
                        <div className="relative p-5">
                          <div className="flex gap-[7px] mb-3">
                            <span className="inline-flex items-center gap-[5px] px-[11px] py-[5px] bg-white/20 rounded-full text-white text-[12px] font-bold">{activeChallenge.domain}</span>
                            <DifficultyBadge difficulty={activeChallenge.difficulty} />
                          </div>
                          <div className="font-display text-balance font-bold text-[26px] text-white leading-[1.05]">{activeChallenge.title}</div>
                          <div className="text-white/90 text-[14px] mt-[6px] leading-[1.4] line-clamp-2">
                            {activeChallenge.description}
                          </div>
                          <div className="mt-4">
                            <div className="flex justify-between text-white text-[12px] font-bold mb-[6px]">
                              <span>+{calculateXPGain(selected.age ?? 9)} XP à gagner</span>
                              <span>{activeChallenge.steps?.length ?? 0} étapes</span>
                            </div>
                            <Link to="/profiles/$profileId/challenges" params={{ profileId: selected.id }} className="w-full flex items-center justify-center bg-white text-ink font-bold h-[44px] rounded-full cursor-pointer shadow-sm">
                              Voir le défi →
                            </Link>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-[1.5rem] border border-dashed border-ink/20 bg-white/60 p-8 text-center shadow-lg backdrop-blur-md mb-5">
                        <span className="inline-block text-4xl mb-2">🌟</span>
                        <p className="text-[14px] text-ink/80 font-bold mb-4">
                          Aucun défi en cours pour {selected.name}.
                        </p>
                        <Link
                          to="/profiles/$profileId/challenges"
                          params={{ profileId: selected.id }}
                          className="w-full inline-flex items-center justify-center bg-brand text-white font-bold h-[44px] rounded-full cursor-pointer shadow-sm"
                        >
                          Générer un défi
                        </Link>
                      </div>
                    )}

                    {/* Compact Cards: Niveau / Talents */}
                    <div className="flex gap-3 mb-5">
                      {/* Niveau/XP → Ma Guilde (la carte affiche déjà le nom de la guilde ;
                          "Mon parcours" ci-dessous couvre déjà la vue XP/progression détaillée,
                          donc cette carte pointe ailleurs plutôt que de dupliquer ce lien). */}
                      <Link
                        to="/profiles/$profileId/guild"
                        params={{ profileId: selected.id }}
                        className="flex-1 bg-card rounded-[1rem] p-[14px] shadow-sm border border-border cursor-pointer"
                      >
                        <div className="text-[12px] text-ink/60 font-semibold mb-2">Niveau {currentLevel} · {guild.name.replace('Les ', '')}</div>
                        <div className="h-[9px] bg-ink/5 rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700 ease-out origin-left animate-[gzGrowBar_.7s_ease-out]" style={{ width: `${xpPct}%`, background: "linear-gradient(90deg, var(--brand), oklch(0.6 0.15 45))" }}></div>
                        </div>
                        <div className="text-[12px] text-ink/40 font-bold text-right mt-[5px]">{totalXP} XP</div>
                      </Link>

                      {/* Talents actifs → pas de page dédiée aujourd'hui (Parcours et Portfolio
                          sont déjà pris par les liens "Continuer à explorer" ci-dessous) : un
                          Popover inline liste les domaines actifs sans quitter le dashboard,
                          même pattern que le Popover de série déjà utilisé plus haut sur cette page. */}
                      <Popover>
                        <PopoverTrigger className="flex-1 bg-card rounded-[1rem] p-[14px] shadow-sm border border-border cursor-pointer text-left outline-none">
                          <div className="text-[12px] text-ink/60 font-semibold mb-2">Talents actifs</div>
                          <div className="flex items-baseline gap-[5px]">
                            <span className="font-display text-balance font-bold text-[26px]" style={{ color: `var(--guild-${guild.key === 'aucune' ? 'batisseurs' : guild.key})` }}>{activeTalents}</span>
                            <span className="text-[12px] text-ink/60">domaines</span>
                          </div>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-72 rounded-2xl border border-ink/10 bg-white p-4 shadow-xl">
                          <p className="mb-3 font-display text-balance text-sm font-bold text-ink">Domaines actifs de {selected.name}</p>
                          {activeDomains.length === 0 ? (
                            <p className="text-xs leading-relaxed text-ink/60">Aucun domaine encore actif — le premier défi complété lancera la carte des talents.</p>
                          ) : (
                            <ul className="space-y-2">
                              {activeDomains.map((d) => (
                                <li key={d.key} className="flex items-center justify-between gap-2 text-xs">
                                  <span className="font-bold text-ink">{d.label}</span>
                                  <span className="text-ink/50">{TALENT_BUCKET_LABEL[d.bucket]}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                        </PopoverContent>
                      </Popover>
                    </div>

                    {/* Continuer à explorer */}
                    <div className="font-display text-balance font-bold text-[13px] tracking-[.06em] uppercase text-ink/40 mx-1 mb-[10px]">Continuer à explorer</div>
                    <div className="grid grid-cols-2 gap-3 mb-6">
                      <Link to="/profiles/$profileId/portfolio" params={{ profileId: selected.id }} className="text-left border border-border bg-leaf-50 rounded-[1rem] p-[15px] cursor-pointer shadow-sm">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--leaf-dark)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z"/></svg>
                        <div className="font-display text-balance font-bold text-[15px] mt-[8px] text-ink">Mon parcours</div>
                        <div className="text-[12px] text-ink/60 mt-[2px]">Ton chemin de talents</div>
                      </Link>
                      <Link to="/boutique" className="text-left border border-border bg-amber-50 rounded-[1rem] p-[15px] cursor-pointer shadow-sm">
                        <ShoppingBag width="22" height="22" strokeWidth={2} className="text-amber-700" />
                        <div className="font-display text-balance font-bold text-[15px] mt-[8px] text-ink">Boutique</div>
                        <div className="text-[12px] text-ink/60 mt-[2px]">Kits pour ses défis</div>
                      </Link>
                    </div>
                  </div>
                );
              })()}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-[2rem] border border-ink/10 bg-white/95 backdrop-blur-md p-6 shadow-xl animate-in zoom-in-95 duration-200 md:p-8">
            <div className="text-center">
              <div className="mx-auto flex size-14 items-center justify-center rounded-[1.2rem] bg-brand/10 text-brand">
                <Phone className="size-6" />
              </div>
              <h2 className="mt-4 font-display text-balance text-2xl font-extrabold leading-tight">
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
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-ink/60">
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
                    className="rounded-2xl border border-ink/10 bg-surface px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-brand cursor-pointer transition-all hover:bg-ink/5"
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
                      className="w-full rounded-2xl border border-ink/10 bg-surface px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-brand placeholder:font-normal placeholder:text-ink/30 transition-all"
                      required
                    />
                  </div>
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] font-medium text-ink/60">
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
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-brand py-3.5 text-sm font-bold text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm transition-all disabled:opacity-50 cursor-pointer"
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
                  className="w-full py-2.5 text-center text-xs font-bold text-ink/60 hover:text-ink transition-all cursor-pointer"
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
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink/70 p-4 backdrop-blur-sm" onClick={() => setShowUpgradeModal(false)}>
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-[2rem] border border-ink/10 bg-white/95 backdrop-blur-md p-8 shadow-xl"
          >
            {/* Header */}
            <div className="mb-6 flex items-start gap-4">
              <div className="grid size-14 shrink-0 place-items-center rounded-[1.2rem] bg-amber-100 text-3xl">
                🔒
              </div>
              <div>
                <h2 className="font-display text-balance text-2xl font-extrabold text-ink leading-tight">
                  Quota gratuit atteint
                </h2>
                <p className="mt-1 text-sm text-ink/60 font-medium">
                  Vous avez déjà {profiles.length} profils enregistrés.
                </p>
              </div>
            </div>

            {/* Pricing */}
            <div className="mb-6 rounded-2xl border border-ink/10 bg-surface p-5">
              <p className="text-xs font-black uppercase tracking-widest text-ink/60 mb-1">Profil supplémentaire</p>
              <p className="font-display text-balance text-3xl font-black text-ink">
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
                  <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-brand text-[10px] font-black text-white shadow-sm">
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
              className="flex w-full items-center justify-center gap-2.5 rounded-full bg-[#25D366] py-3.5 font-bold text-sm text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm transition-all"
            >
              <Phone className="size-4 fill-white" />
              Contacter l'administrateur sur WhatsApp
            </a>

            <button
              onClick={() => setShowUpgradeModal(false)}
              className="mt-3 w-full py-2 text-center text-xs font-bold text-ink/60 hover:text-ink transition-all"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
