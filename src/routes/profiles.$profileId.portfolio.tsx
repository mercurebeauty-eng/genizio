import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { toast } from "sonner";
import { getChildAISynthesis, TALENT_SUBFORM_LABELS } from "@/lib/challenges.functions";
import { ensureHypothesesForChild } from "@/lib/hypotheses.functions";
import { getChildGuild, getTalentAffinities } from "@/lib/guilds";
import { getChildEnrolledSeason, getActiveSeason, type Season } from "@/lib/seasons.functions";
import { getChildSupervisorInfo } from "@/lib/supervisors.functions";
import { getChildAccessStatusFn, type ChildAccessStatus } from "@/lib/child-access";
import { formatXof } from "@/lib/pricing";
import {
  OPPORTUNITY_COMPASS_VERSION,
  OPPORTUNITY_COMPASS_DISCLAIMER,
  OPPORTUNITY_COMPASS_MIN_AGE,
  TALENT_SUBFORM_OPPORTUNITIES,
} from "@/lib/opportunity-compass";
import { SeasonEnrollmentModal } from "@/components/seasons/SeasonEnrollmentModal";
import { AppTabBar } from "@/components/AppTabBar";
import { TalentRadarChart } from "@/components/TalentRadarChart";
import { NayaAvatar } from "@/components/NayaAvatar";
import { GenizioLoader } from "@/components/GenizioLoader";
import {
  Award,
  Calendar,
  ImageIcon,
  Loader2,
  Star,
  Compass,
  Activity,
  Users,
  Lightbulb,
  Palette,
  Wrench,
  Heart,
  Binary,
  BookOpen,
  Search,
  Sparkles,
  Rocket,
  ChevronRight,
  BellRing,
  Phone,
  Zap,
  MapPin,
  Clock,
  ChevronDown,
  CheckCircle2,
  Target,
  Gift,
} from "lucide-react";
import { InviteMentorDialog } from "@/components/mentors/InviteMentorDialog";
import { AppHeader } from "@/components/AppHeader";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { INTERESTS_BY_TALENT } from "@/components/profiles/shared";
import { TALENT_KEY_LABELS, getTalentBucket } from "@/lib/talent-buckets";
import { normalizeChildInterests } from "@/lib/interest-migration";

function getLevelInfo(totalXP: number) {
  const level = Math.floor(totalXP / 500) + 1;
  const pct = Math.min(100, ((totalXP % 500) / 500) * 100);
  const nextXP = 500 - (totalXP % 500);
  return { level, pct, nextXP };
}

const DOMAIN_COLORS: Record<string, string> = {
  Mathématiques: "bg-blue-100 text-blue-700 border-blue-200",
  Sciences: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Arts: "bg-purple-100 text-purple-700 border-purple-200",
  Langues: "bg-amber-100 text-amber-700 border-amber-200",
  Sport: "bg-red-100 text-red-700 border-red-200",
  "Émotions et relations sociales": "bg-pink-100 text-pink-700 border-pink-200",
  Artisanat: "bg-orange-100 text-orange-700 border-orange-200",
  Agriculture: "bg-green-100 text-green-700 border-green-200",
  Entrepreneuriat: "bg-cyan-100 text-cyan-700 border-cyan-200",
};

function getDomainStyle(domain: string) {
  return DOMAIN_COLORS[domain] ?? "bg-ink/5 text-ink/60 border-ink/10";
}

const DEFAULT_EXPANDED_MONTHS = 2;

function groupByMonth(challenges: Challenge[]) {
  const groups = new Map<string, Challenge[]>();
  for (const c of challenges) {
    const date = new Date(c.completed_at ?? c.created_at ?? Date.now());
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(c);
  }
  return Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]));
}

function formatMonthLabel(key: string) {
  const [year, month] = key.split("-");
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

// title vient de TALENT_KEY_LABELS (source unique des 9 libellés) — seuls
// l'icône et la description restent propres à cette page.
const TALENT_DETAILS: Record<string, { title: string; icon: any; description: string }> = {
  spatial: {
    title: TALENT_KEY_LABELS.spatial,
    icon: Compass,
    description: "Perception de l'espace, dessin, construction en 3D et orientation.",
  },
  corporelle: {
    title: TALENT_KEY_LABELS.corporelle,
    icon: Activity,
    description: "Coordination physique, habileté manuelle, sport et mouvement.",
  },
  sociale: {
    title: TALENT_KEY_LABELS.sociale,
    icon: Users,
    description: "Relations avec autrui, leadership, empathie et travail en groupe.",
  },
  entrepreneuriale: {
    title: TALENT_KEY_LABELS.entrepreneuriale,
    icon: Lightbulb,
    description: "Esprit d'initiative, créativité de projets, organisation et commerce.",
  },
  creative: {
    title: TALENT_KEY_LABELS.creative,
    icon: Palette,
    description: "Expression artistique, imaginaire, musique et récits.",
  },
  artisanale: {
    title: TALENT_KEY_LABELS.artisanale,
    icon: Wrench,
    description: "Cuisine, couture, modélisme, travaux manuels et outils.",
  },
  emotionnelle: {
    title: TALENT_KEY_LABELS.emotionnelle,
    icon: Heart,
    description: "Compréhension de soi, empathie, gestion des émotions et calme.",
  },
  logico_mathematique: {
    title: TALENT_KEY_LABELS.logico_mathematique,
    icon: Binary,
    description: "Raisonnement logique, calcul, sciences et jeux de stratégie.",
  },
  linguistique: {
    title: TALENT_KEY_LABELS.linguistique,
    icon: BookOpen,
    description: "Aisance avec les mots, lecture, écriture et prise de parole.",
  },
};

function getTalentCardInfo(age: number, score: number) {
  let typeLabel = "Carte Éveil";
  let bgClass = "bg-emerald-50/60 hover:bg-emerald-50";
  let tagClass = "bg-emerald-100 text-emerald-800 border-emerald-400";
  let barColor = "bg-emerald-400";
  
  if (age >= 12) {
    typeLabel = "Carte Maîtrise";
    bgClass = "bg-amber-50/60 hover:bg-amber-50";
    tagClass = "bg-amber-100 text-amber-800 border-amber-400";
    barColor = "bg-amber-400";
  } else if (age >= 7) {
    typeLabel = "Carte Exploration";
    bgClass = "bg-sky-50/60 hover:bg-sky-50";
    tagClass = "bg-sky-100 text-sky-800 border-sky-400";
    barColor = "bg-sky-400";
  }

  let level = 1;
  let levelLabel = "Niveau I (Émergence)";
  if (score >= 70) {
    level = 3;
    levelLabel = "Niveau III (Maîtrise)";
  } else if (score >= 40) {
    level = 2;
    levelLabel = "Niveau II (Développement)";
  }

  return {
    typeLabel,
    bgClass,
    tagClass,
    barColor,
    level,
    levelLabel,
  };
}

export const Route = createFileRoute("/profiles/$profileId/portfolio")({
  component: PortfolioPage,
});

type Child = {
  id: string;
  name: string;
  age: number;
  talents: Record<string, number>;
  interests: string[];
  pdf_unlocked: boolean;
  xp: number | null;
};

type Challenge = {
  id: string;
  title: string;
  domain: string;
  trait_subform?: string | null;
  status: "todo" | "in_progress" | "completed";
  completed_at: string | null;
  proof_image_url: string | null;
  ai_observations?: string | null;
  created_at?: string;
};

// NAYA 2.0 Phase 4 — cf. genizio-decisions #33. Seule parent_narrative est lue ici : le
// JSON hypotheses (causes, probabilités, evidence_log) reste strictly interne, jamais
// exposé à ce niveau de l'app, conforme à la règle "jamais de probabilité brute" (§1 du
// plan NAYA).
type OpenHypothesisCycle = {
  id: string;
  parent_narrative: string | null;
};

function PortfolioPage() {
  const { profileId } = Route.useParams();
  const { session, loading } = useSession();
  const navigate = useNavigate();

  const [child, setChild] = useState<Child | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [openCycle, setOpenCycle] = useState<OpenHypothesisCycle | null>(null);
  const [fetching, setFetching] = useState(true);
  const [synthesis, setSynthesis] = useState<string>("");
  const [fetchingSynthesis, setFetchingSynthesis] = useState(false);
  const [enrolledSeason, setEnrolledSeason] = useState<Season | null>(null);
  const [activeSeason, setActiveSeason] = useState<Season | null>(null);
  const [supervisorInfo, setSupervisorInfo] = useState<{ email: string; assignedAt: string } | null>(null);
  // Accès mensuel payant (modèle 2026-08-05) : status free/permanent/monthly/expired +
  // montant de renouvellement applicable au compte.
  const [accessState, setAccessState] = useState<{ status: ChildAccessStatus; renewalAmountXof: number } | null>(null);
  const [showSponsorModal, setShowSponsorModal] = useState(false);
  const [mentorCount, setMentorCount] = useState(0);
  const [dismissedDiscoveries, setDismissedDiscoveries] = useState<string[]>([]);
  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(new Set());

  const fetchSynthesis = useServerFn(getChildAISynthesis);
  const ensureHypotheses = useServerFn(ensureHypothesesForChild);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [session, loading, navigate]);

  useEffect(() => {
    if (!session) return;
    setFetching(true);
    Promise.all([
      supabase.from("child_profiles").select("id, name, age, talents, interests, pdf_unlocked, xp").eq("id", profileId).eq("user_id", session!.user.id).maybeSingle(),
      supabase
        .from("challenges")
        .select("id, title, domain, trait_subform, status, completed_at, proof_image_url, ai_observations, created_at")
        .eq("child_id", profileId)
        .order("completed_at", { ascending: false, nullsFirst: false }),
      supabase
        .from("child_mentors")
        .select("id", { count: "exact", head: true })
        .eq("child_id", profileId),
      supabase
        .from("hypothesis_cycles")
        .select("id, parent_narrative")
        .eq("child_id", profileId)
        .eq("status", "open")
        .not("parent_narrative", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ])
      .then(([c, ch, cm, hc]) => {
        setChild((c.data as Child) ?? null);
        setChallenges((ch.data ?? []) as Challenge[]);
        setMentorCount(cm.count ?? 0);
        setOpenCycle((hc.data as OpenHypothesisCycle) ?? null);
      })
      .catch((err) => {
        console.error("Erreur lors du chargement du portfolio:", err);
        setChild(null);
        setChallenges([]);
        setMentorCount(0);
        setOpenCycle(null);
      })
      .finally(() => {
        setFetching(false);
      });
  }, [session, profileId]);

  // Découverte de centre d'intérêt (cf. discussion produit) : un talent fort
  // jamais déclaré par le parent est une vraie surprise, pas une routine —
  // le rejet est donc mémorisé en local plutôt que dans une nouvelle colonne
  // DB, pour ne pas alourdir le schéma pour un simple "ne re-propose pas ça".
  useEffect(() => {
    if (!profileId) return;
    try {
      const raw = localStorage.getItem(`genizio_dismissed_discoveries_${profileId}`);
      setDismissedDiscoveries(raw ? JSON.parse(raw) : []);
    } catch (err) {
      console.error("Erreur lecture découvertes masquées:", err);
      setDismissedDiscoveries([]);
    }
  }, [profileId]);

  const dismissDiscovery = (domainKey: string) => {
    const next = [...dismissedDiscoveries, domainKey];
    setDismissedDiscoveries(next);
    try {
      localStorage.setItem(`genizio_dismissed_discoveries_${profileId}`, JSON.stringify(next));
    } catch (err) {
      console.error("Erreur sauvegarde découverte masquée:", err);
      // Stockage local indisponible (navigation privée, quota...) — la
      // suggestion réapparaîtra au prochain chargement, sans gravité.
    }
  };

  const acceptDiscovery = async (label: string) => {
    if (!child) return;
    const previousInterests = child.interests ?? [];
    const nextInterests = [...previousInterests, label];
    setChild({ ...child, interests: nextInterests });
    try {
      const { error } = await supabase.from("child_profiles").update({ interests: nextInterests }).eq("id", child.id);
      if (error) throw error;
    } catch (err) {
      console.error("Erreur lors de l'ajout du centre d'intérêt:", err);
      setChild({ ...child, interests: previousInterests });
      toast.error("Impossible de sauvegarder la découverte.");
    }
  };

  const refetchOpenCycle = () => {
    supabase
      .from("hypothesis_cycles")
      .select("id, parent_narrative")
      .eq("child_id", profileId)
      .eq("status", "open")
      .not("parent_narrative", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setOpenCycle((data as OpenHypothesisCycle) ?? null));
  };

  useEffect(() => {
    if (!session) return;
    setFetchingSynthesis(true);
    fetchSynthesis({ data: { childId: profileId } })
      .then((resp) => setSynthesis(resp || ""))
      .catch((err) => {
        console.error("Erreur lors de la récupération de la synthèse:", err);
        setSynthesis("");
      })
      .finally(() => setFetchingSynthesis(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, profileId]);

  // NAYA 2.0 Phase 3a/4, déclencheur reconstruit (cf. genizio-decisions #38) : plus
  // d'anomalie de note, mais un écart répété entre le référentiel académique et l'âge
  // réel de l'enfant sur ses défis complétés. Fire-and-forget, idempotent côté serveur
  // (ne coûte un appel IA que si un écart est confirmé ou qu'un cycle attend sa narration),
  // même pattern qu'avant le retrait des notes.
  useEffect(() => {
    if (!session) return;
    ensureHypothesesForChild({ data: { childId: profileId } })
      .then((res) => { if (res.generated) refetchOpenCycle(); })
      .catch((err) => {
        console.error("Erreur lors de la vérification des hypothèses:", err);
      });
      
    getChildEnrolledSeason({ data: { childId: profileId } })
      .then(season => setEnrolledSeason(season))
      .catch(console.error);

    getActiveSeason({ data: undefined })
      .then(season => setActiveSeason(season))
      .catch(console.error);

    getChildSupervisorInfo({ data: { childId: profileId } })
      .then(info => setSupervisorInfo(info))
      .catch(console.error);

    getChildAccessStatusFn({ data: { childId: profileId } })
      .then((res) => setAccessState(res))
      .catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, profileId]);

  if (loading || !session || fetching) {
    return (
      <div className="grid min-h-dvh place-items-center bg-surface">
        <GenizioLoader label="Chargement…" />
      </div>
    );
  }

  if (!child) {
    return (
      <div className="grid min-h-dvh place-items-center bg-surface text-ink">
        <div className="text-center">
          <p className="mb-4 font-bold">Profil introuvable.</p>
          <Link to="/profiles" className="underline text-sm opacity-80 hover:opacity-100">Retour</Link>
        </div>
      </div>
    );
  }

  const completed = challenges.filter((c) => c.status === "completed");
  const artifacts = completed.filter((c) => c.proof_image_url);

  return (
    <div className="min-h-dvh bg-surface pb-24 text-ink ">
      <AppHeader />

      <main className="mx-auto max-w-6xl px-6 py-10 md:flex ">
        <AppTabBar profileId={profileId} />

        <div className="min-w-0 flex-1 space-y-6">
          {/* Bannière Guilde — cliquable vers Ma Guilde */}
          {(() => {
            const guild = getChildGuild(child.talents);
            const totalXP = child.xp || 0;
            const { level, pct, nextXP } = getLevelInfo(totalXP);

            return (
              <Link
                to="/profiles/$profileId/guild"
                params={{ profileId }}
                className={`rounded-3xl border border-ink/10 p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center gap-5 cursor-pointer transition-transform hover:-translate-y-0.5 ${guild.bgColor} relative overflow-hidden`}
              >
                <div className="text-5xl shrink-0">{guild.emoji}</div>
                <div className="min-w-0 flex-1 w-full">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className={`text-[11px] font-extrabold uppercase tracking-widest ${guild.color} opacity-70`}>
                      Guilde de {child.name}
                    </p>
                    <span
                      className="text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border bg-white/80"
                      style={{ color: `var(--guild-${guild.key === "aucune" ? "batisseurs" : guild.key}, #7C3AED)` }}
                    >
                      Niveau {level}
                    </span>
                  </div>
                  <h2 className={`font-display text-balance text-2xl font-black leading-tight ${guild.color}`}>{guild.name}</h2>
                  <p className={`text-xs font-medium italic mt-0.5 ${guild.color} opacity-80`}>« {guild.tagline || guild.description} »</p>

                  {/* XP Bar */}
                  <div className="mt-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[11px] font-extrabold text-ink/75 flex items-center gap-1">
                        <Zap className="size-3 text-amber-500 fill-amber-500" /> {totalXP} XP
                      </span>
                      <span className="text-[10px] text-ink/60 font-bold">
                        {nextXP > 0 ? `encore ${nextXP} XP pour le niveau ${level + 1}` : "Niveau Max !"}
                      </span>
                    </div>
                    <div className="h-2.5 bg-ink/10 rounded-full overflow-hidden border border-ink/5">
                      <div
                        className="h-full rounded-full transition-all duration-700 bg-brand"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </div>
                <ChevronRight className={`size-5 shrink-0 opacity-60 ${guild.color} hidden sm:block`} />
              </Link>
            );
          })()}

          {/* NAYA 2.0 Phase 4 — "Ce que Naya a remarqué" (cf. genizio-decisions #33).
              Visuellement distincte du Portrait (ambre = provisoire, pas la synthèse
              stable en sky ci-dessous) : jamais présentée comme un verdict, jamais de
              chiffre — seul parent_narrative (texte déjà nettoyé côté serveur) est
              rendu ici. Absente du DOM si aucun cycle ouvert n'existe encore : ne
              jamais afficher un état "rien détecté" qui sonnerait comme un jugement. */}
          {openCycle?.parent_narrative && (
            <div className="rounded-3xl border border-amber-200 bg-amber-50/90 p-6 shadow-md backdrop-blur-md">
              <div className="mb-3 flex items-center gap-3">
                <NayaAvatar size="sm" thoughts={[`Je réfléchis à quelque chose sur ${child.name}...`]} />
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-200 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-900 shadow-xs">
                    <Search className="size-3" />
                    Naya enquête encore
                  </span>
                  <h3 className="mt-1 font-display text-balance text-lg font-bold text-ink">Ce que Naya a remarqué</h3>
                </div>
              </div>
              <p className="text-sm font-medium leading-relaxed text-ink">
                {openCycle.parent_narrative}
              </p>
              <div className="mt-4 flex flex-col  sm:items-center justify-between gap-3 pt-3 border-t border-dashed border-amber-200">
                <p className="text-xs italic text-ink/60">
                  Naya continue d'observer les prochains défis de {child.name} pour affiner sa compréhension.
                </p>
                <Link
                  to="/profiles/$profileId/challenges"
                  params={{ profileId: child.id }}
                  className="press-white inline-flex items-center justify-center gap-2 rounded-2xl border border-amber-300 bg-amber-300 px-4 py-2 text-xs font-bold text-ink shrink-0 cursor-pointer"
                >
                  <Sparkles className="size-3.5 fill-amber-700 text-amber-700" />
                  <span>Proposer un défi adapté</span>
                </Link>
              </div>
            </div>
          )}

          {/* Success card dashboard: Profil Actuel de l'Enfant */}
          {(() => {
            const guild = getChildGuild(child.talents);
            // Même formule que le tableau de bord (profiles.index.tsx) et le Parcours —
            // lue depuis child_profiles.xp, jamais recalculée à partir du nombre de défis
            // complétés (ça part vite en désaccord avec le reste de l'app, cf. le même bug
            // déjà corrigé sur la page Parcours).
            const level = Math.floor((child.xp || 0) / 500) + 1;
            
            let singularGuild = "Curieux";
            if (guild.name.includes("Bâtisseurs")) singularGuild = "Bâtisseur";
            else if (guild.name.includes("Inventeurs")) singularGuild = "Inventeur";
            else if (guild.name.includes("Explorateurs")) singularGuild = "Explorateur";
            else if (guild.name.includes("Créateurs")) singularGuild = "Créateur";
            else if (guild.name.includes("Stratèges")) singularGuild = "Stratège";
            else if (guild.name.includes("Protecteurs")) singularGuild = "Protecteur";

            const suffixes = ["Novice", "Apprenti", "Émergent", "Compagnon", "Initié", "Confirmé", "Aventurier", "Maître", "Champion", "Légende"];
            const rank = `${singularGuild} ${suffixes[level - 1] || "Expert"}`;

            const normalizedInterests = normalizeChildInterests(child.interests);
            const childInterests = normalizedInterests.length > 0
              ? normalizedInterests.slice(0, 4)
              : ["Pose sans arrêt la question 'Pourquoi ?'", "Cherche la logique cachée des choses", "Démonte pour comprendre", "Aime assembler et construire"];

            const getInterestBucket = (interestName: string) => {
              let foundKey = "spatial";
              Object.entries(INTERESTS_BY_TALENT).forEach(([key, value]) => {
                if (value.tags.includes(interestName)) {
                  foundKey = key;
                }
              });
              
              const score = child.talents?.[foundKey] || 0;
              if (score >= 70) return { label: "CONFIRMÉ", cls: "bg-emerald-100 border-emerald-500 text-emerald-800" };
              if (score >= 40) return { label: "EN DÉVELOPPEMENT", cls: "bg-orange-100 border-orange-500 text-orange-800" };
              if (score >= 1) return { label: "SIGNAL PRÉCOCE", cls: "bg-sky-100 border-sky-500 text-sky-800" };
              return { label: "PAS ENCORE EXPLORÉ", cls: "bg-stone-105 border-stone-400 text-stone-600" };
            };

            return (
              <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-md flex flex-col justify-between">
                <div>
                  {/* Card Header */}
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-brand">
                        Profil actuel de l'enfant
                      </p>
                      <h2 className="font-display text-balance text-2xl font-black text-ink mt-0.5">{rank}</h2>
                    </div>
                    
                    {/* Circular Dashed Level Badge */}
                    <div className="size-14 rounded-full border border-dashed border-ink/20 bg-surface flex flex-col items-center justify-center shrink-0">
                      <span className="text-[9px] font-black uppercase tracking-wider text-ink/60 leading-none">Level</span>
                      <span className="font-display text-balance text-base font-black text-ink leading-none mt-0.5">{level}</span>
                    </div>
                  </div>

                  <hr className="border-t border-dashed border-ink/20 my-4" />

                  {/* Skills Status List */}
                  <ul className="space-y-3 my-4">
                    {childInterests.map((interest: string) => {
                      const bucket = getInterestBucket(interest);
                      return (
                        <li key={interest} className="flex items-center justify-between py-1 border-b border-stone-100 last:border-b-0">
                          <span className="text-xs font-bold text-ink/75">{interest}</span>
                          <span className={`rounded-full border px-3 py-0.5 text-[9px] font-black uppercase tracking-wider ${bucket.cls}`}>
                            {bucket.label}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                  
                  <hr className="border-t-2 border-ink my-4" />
                </div>

                {/* Footer stats */}
                <div className="grid grid-cols-3 gap-4 text-center mt-2">
                  <div>
                    <div className="font-display text-balance text-2xl font-black text-orange-600">{completed.length}</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-ink/60 mt-0.5">Défis complétés</div>
                  </div>
                  <div>
                    <div className="font-display text-balance text-2xl font-black text-emerald-600">
                      {Object.values(child.talents || {}).filter((val) => val > 0).length}
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-ink/60 mt-0.5">Talents cartographiés</div>
                  </div>
                  <div>
                    <div className="font-display text-balance text-2xl font-black text-sky-600">{mentorCount}</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-ink/60 mt-0.5">Mentors actifs</div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Découverte de centre d'intérêt non déclaré (discussion produit du
              2026-07-21) : contrairement à "Ce que Naya a remarqué" ci-dessus
              (ambre = provisoire, jamais un verdict), celle-ci ne montre qu'un
              signal déjà CONFIRMÉ (score >= 70, même seuil que le badge
              "CONFIRMÉ" de la liste au-dessus) sur un domaine ABSENT des
              centres d'intérêt déclarés — vert comme le reste de l'app pour ce
              niveau de certitude. Le parent tranche toujours : aucun ajout
              automatique et silencieux à child.interests. Le rejet est mémorisé
              en local (pas de nouvelle colonne DB pour un simple "ne re-propose
              pas ça") ; un seul domaine affiché à la fois pour rester un vrai
              signal plutôt qu'une liste qui s'accumule. */}
          {(() => {
            const coveredDomains = new Set(
              (child.interests ?? [])
                .map((tag) => Object.entries(INTERESTS_BY_TALENT).find(([, v]) => v.tags.includes(tag))?.[0])
                .filter((k): k is string => Boolean(k))
            );

            const discovery = Object.keys(TALENT_KEY_LABELS)
              .filter((key) => !coveredDomains.has(key) && !dismissedDiscoveries.includes(key))
              .map((key) => ({ key, score: child.talents?.[key] ?? 0 }))
              .filter(({ score }) => getTalentBucket(score) === "confirme")
              .sort((a, b) => b.score - a.score)[0];

            if (!discovery) return null;
            const label = TALENT_KEY_LABELS[discovery.key];

            return (
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50/90 p-6 shadow-md">
                <div className="mb-3 flex items-center gap-3">
                  <NayaAvatar size="sm" thoughts={[`${child.name} m'a surprise sur celui-là...`]} />
                  <div>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300 bg-emerald-200 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-900 shadow-xs">
                      <Lightbulb className="size-3" />
                      Une découverte de Naya
                    </span>
                    <h3 className="mt-1 font-display text-balance text-lg font-bold text-ink">
                      {label}, pas encore dans ses centres d'intérêt
                    </h3>
                  </div>
                </div>
                <p className="text-sm font-medium leading-relaxed text-ink">
                  {child.name} a beaucoup approfondi son côté <strong>{label}</strong> à travers ses défis — nettement plus que ce que ses centres d'intérêt déclarés laissaient penser.
                </p>
                <div className="mt-4 flex items-center justify-end gap-2 pt-3 border-t border-dashed border-emerald-200">
                  <button
                    onClick={() => dismissDiscovery(discovery.key)}
                    className="rounded-2xl border border-ink/10 px-4 py-2 text-xs font-bold text-ink/60 hover:bg-ink/5 transition-colors cursor-pointer"
                  >
                    Pas maintenant
                  </button>
                  <button
                    onClick={() => acceptDiscovery(label)}
                    className="press-white inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-300 bg-emerald-300 px-4 py-2 text-xs font-bold text-ink shrink-0 cursor-pointer"
                  >
                    <Lightbulb className="size-3.5 fill-emerald-700 text-emerald-700" />
                    <span>Ajouter à ses centres d'intérêt</span>
                  </button>
                </div>
              </div>
            );
          })()}

          {/* Card: Superviseur assigné — jusqu'ici invisible pour le parent, découvert
              seulement en ouvrant le portfolio (pas de notification, cf. absence d'infra
              email/SMS dans ce projet) */}
          {supervisorInfo && (
            <div className="rounded-3xl border border-sky-200 bg-sky-50/60 p-5 shadow-sm flex items-center gap-4">
              <div className="grid size-11 place-items-center rounded-2xl bg-sky-600 text-white shrink-0">
                <Users className="size-5" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-sky-700">Suivi par un superviseur</p>
                <p className="text-sm font-bold text-ink mt-0.5">{supervisorInfo.email}</p>
                <p className="text-xs text-ink/50 mt-0.5">
                  Depuis le {new Date(supervisorInfo.assignedAt).toLocaleDateString("fr-FR")}
                </p>
              </div>
            </div>
          )}

          {/* Accès mensuel payant (modèle 2026-08-05) : bannière "accès expiré" */}
          {accessState && accessState.status.kind === "expired" && (
            <div className="rounded-3xl border border-red-300 bg-red-50/70 p-5 shadow-sm flex flex-wrap items-center gap-3">
              <div className="grid size-10 place-items-center rounded-2xl bg-red-600 text-white shrink-0">
                <BellRing className="size-5" />
              </div>
              <div className="flex-1 min-w-48">
                <p className="text-sm font-black text-red-800">Accès expiré — renouvelez pour continuer les défis</p>
                <p className="text-xs text-ink/60 mt-0.5">
                  Les défis passés et le portfolio restent visibles. Renouvellement :{" "}
                  <strong>{formatXof(accessState.renewalAmountXof)}/mois</strong>.
                </p>
              </div>
              <a
                href={`https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER || "33606433148"}?text=${encodeURIComponent(
                  `Bonjour, l'accès Génizio de ${child.name} est expiré. Je souhaite renouveler (${formatXof(accessState.renewalAmountXof)}/mois).`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-[#25D366] px-3 py-2 text-[11px] font-bold text-white shadow-sm hover:brightness-95 transition-all"
              >
                <Phone className="size-3.5" />
                Renouveler via WhatsApp
              </a>
            </div>
          )}

          {/* Accès mensuel payant : bannière d'expiration ≤ 14 jours (cohérente avec le panneau admin) */}
          {accessState && accessState.status.kind === "monthly" && accessState.status.daysLeft <= 14 && (
            <div className="rounded-3xl border border-amber-300 bg-amber-50/70 p-5 shadow-sm flex flex-wrap items-center gap-3">
              <div className="grid size-10 place-items-center rounded-2xl bg-amber-500 text-white shrink-0">
                <BellRing className="size-5" />
              </div>
              <div className="flex-1 min-w-48">
                <p className="text-sm font-black text-amber-900">
                  {accessState.status.daysLeft === 0
                    ? "Votre accès se termine aujourd'hui !"
                    : `Votre accès se termine dans ${accessState.status.daysLeft} jour${accessState.status.daysLeft > 1 ? "s" : ""}.`}
                </p>
                <p className="text-xs text-ink/60 mt-0.5">
                  Fin le {new Date(accessState.status.endsAt).toLocaleDateString("fr-FR")} — renouvellement :{" "}
                  <strong>{formatXof(accessState.renewalAmountXof)}/mois</strong>.
                </p>
              </div>
              <a
                href={`https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER || "33606433148"}?text=${encodeURIComponent(
                  `Bonjour, l'accès Génizio de ${child.name} se termine bientôt (${new Date(accessState.status.endsAt).toLocaleDateString("fr-FR")}). Je souhaite renouveler (${formatXof(accessState.renewalAmountXof)}/mois).`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-[#25D366] px-3 py-2 text-[11px] font-bold text-white shadow-sm hover:brightness-95 transition-all"
              >
                <Phone className="size-3.5" />
                Renouveler via WhatsApp
              </a>
            </div>
          )}

          {/* Rédemption d'un code de parrainage (dons diaspora/RSE, /parrainage) */}
          <button
            onClick={() => setShowSponsorModal(true)}
            className="rounded-3xl border border-brand/20 bg-brand/5 p-4 shadow-sm flex items-center gap-3 text-left hover:bg-brand/10 transition-colors cursor-pointer w-full"
          >
            <div className="grid size-10 place-items-center rounded-2xl bg-brand text-white shrink-0">
              <Gift className="size-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-black text-brand">Activer un code de parrainage</p>
              <p className="text-xs text-ink/60">Un parrain (diaspora ou RSE) vous a donné un code ? Il ajoute 1 à 6 mois d'accès.</p>
            </div>
            <ChevronRight className="size-5 text-brand" />
          </button>

          {/* Card: Saison Trimestrielle Actuelle */}
          {enrolledSeason ? (
            <div className="rounded-3xl border border-emerald-200 bg-gradient-to-br from-emerald-50/90 via-emerald-50/50 to-white p-6 shadow-xl flex flex-col items-center justify-between gap-6 backdrop-blur-md">
              <div className="flex items-start gap-4">
                <div className="grid size-12 place-items-center rounded-2xl bg-emerald-600 border border-emerald-200 text-white shadow-sm shrink-0">
                  <Rocket className="size-6 text-white" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-display text-balance text-lg font-black text-ink">{enrolledSeason.title}</h3>
                    <span className="rounded-full border bg-emerald-100 border-emerald-500 text-emerald-800 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider">
                      En cours
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-ink/70 mt-1 leading-relaxed max-w-xl">
                    {enrolledSeason.description || "Un parcours immersif pour développer de nouvelles compétences."}
                  </p>
                  {(enrolledSeason as any).individual_start_date && (enrolledSeason as any).individual_end_date && (
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-bold text-ink/60 bg-white/50 p-2 px-3 rounded-xl border border-emerald-100">
                      <div className="flex items-center gap-1.5 text-emerald-800">
                        <Calendar className="size-3.5" />
                        Démarrée le {new Date((enrolledSeason as any).individual_start_date).toLocaleDateString("fr-FR")}
                      </div>
                      <div className="w-1 h-1 rounded-full bg-ink/20"></div>
                      <div className="flex items-center gap-1.5 text-emerald-800">
                        <Award className="size-3.5" />
                        Fin prévue : {new Date((enrolledSeason as any).individual_end_date).toLocaleDateString("fr-FR")}
                      </div>
                    </div>
                  )}
                  {(() => {
                    const rawEnd = (enrolledSeason as any).individual_end_date;
                    if (!rawEnd) return null;
                    const daysLeft = Math.ceil((new Date(rawEnd).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
                    // Aucun rappel n'existait jusqu'ici — l'accès expirait en silence. Fenêtre de
                    // 14 jours, cohérente avec le panneau admin équivalent (AdminSeasonsTab).
                    if (daysLeft < 0 || daysLeft > 14) return null;
                    return (
                      <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3">
                        <BellRing className="size-4 text-amber-600 shrink-0" />
                        <p className="flex-1 text-xs font-bold text-amber-900">
                          {daysLeft === 0
                            ? "Votre accès à la Saison se termine aujourd'hui !"
                            : `Votre accès à la Saison se termine dans ${daysLeft} jour${daysLeft > 1 ? "s" : ""}.`}
                        </p>
                        <a
                          href={`https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER || "33606433148"}?text=${encodeURIComponent(
                            `Bonjour, mon accès Génizio se termine bientôt (${new Date(rawEnd).toLocaleDateString("fr-FR")}). Je souhaite renouveler.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="shrink-0 inline-flex items-center gap-1.5 rounded-xl bg-[#25D366] px-3 py-2 text-[11px] font-bold text-white shadow-sm hover:brightness-95 transition-all"
                        >
                          <Phone className="size-3.5" />
                          Renouveler
                        </a>
                      </div>
                    );
                  })()}
                </div>
              </div>
              <div className="w-full shrink-0 flex flex-col gap-2">
                <div className="w-full text-center inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-200 bg-white px-5 py-3 text-xs font-black text-emerald-800 shadow-sm transition-all">
                  <Star className="size-4 fill-emerald-500 text-emerald-500" />
                  <span>Certificat de Saison (Disponible à la fin)</span>
                </div>

              </div>
            </div>
          ) : null}

          {/* Card: Le Passeport d'Excellence (uniquement pour 14 ans et plus) */}
          {child.age >= 14 && (() => {
            const isUnlocked = child.pdf_unlocked === true;
            
            // Build the WhatsApp redirection message
            const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER || "33606433148";
            const whatsappText = encodeURIComponent(
              `Bonjour Génizio, je souhaite commander le Passeport d'Excellence pour mon enfant ${child.name} (ID: ${child.id}). J'ai procédé au règlement de 50.000 FCFA.`
            );
            const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${whatsappText}`;

            return (
              <div className="rounded-3xl border border-ink/10 bg-amber-50 p-6 shadow-xl flex flex-col  items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="grid size-12 place-items-center rounded-2xl bg-brand border border-ink/10 text-white shadow-sm shrink-0">
                    <Award className="size-6 text-white" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-balance text-lg font-black text-ink">Le Passeport d'Excellence Génizio</h3>
                      <span className={`rounded-full border px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                        isUnlocked ? "bg-emerald-100 border-emerald-500 text-emerald-800" : "bg-red-100 border-red-500 text-red-800"
                      }`}>
                        {isUnlocked ? "Prêt au téléchargement" : "Non débloqué"}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-ink/70 mt-1 leading-relaxed max-w-xl">
                      Un document d'orientation certifié conçu pour appuyer les dossiers de candidature aux lycées d'élite et universités. Il compile sa Carte des Talents, ses 10 meilleurs défis réalisés (avec photos de preuves) et les observations de Naya.
                    </p>
                  </div>
                </div>

                <div className="w-full md:w-auto shrink-0 flex flex-col gap-2">
                  {isUnlocked ? (
                    <Link
                      to="/profiles/$profileId/passport-print"
                      params={{ profileId: child.id }}
                      target="_blank"
                      className="w-full md:w-auto text-center inline-flex items-center justify-center gap-2 rounded-2xl border border-ink/10 bg-[#25D366] px-5 py-3 text-xs font-black text-white shadow-sm hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                      <span>Télécharger le Passeport</span>
                    </Link>
                  ) : (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full md:w-auto text-center inline-flex items-center justify-center gap-2 rounded-2xl border border-ink/10 bg-brand px-5 py-3 text-xs font-black text-white shadow-sm hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
                    >
                      <span>Activer le Passeport (50 000 FCFA)</span>
                    </a>
                  )}
                  <p className="text-[9px] text-center text-ink/60 font-bold">
                    * Activation par l'administration après règlement WhatsApp.
                  </p>
                </div>
              </div>
            );
          })()}

          <div className="grid grid-cols-1 gap-6 ">
            <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-xl">
              <h3 className="mb-4 flex items-center gap-2 font-display text-balance text-lg font-bold">
                <Award className="size-5 text-brand" />
                Carte des Talents
              </h3>
              <TalentRadarChart talents={child.talents} name={child.name} className="h-64 w-full" age={child.age} />
              <p className="text-center text-[11px] font-medium text-ink/60">
                Cette carte s'affine et se développe à mesure que {child.name} réalise ses défis.
              </p>
            </div>

            <div className="rounded-3xl border border-ink/10 bg-sky p-6 shadow-xl">
              <div className="mb-4 flex items-center gap-3">
                <NayaAvatar size="sm" thoughts={[`J'observe les progrès de ${child.name} !`]} />
                <h3 className="font-display text-balance text-lg font-bold text-ink">Portrait de {child.name}</h3>
              </div>
              {fetchingSynthesis ? (
                <div className="flex items-center gap-2 py-8 text-sm text-ink/60 font-bold">
                  <Loader2 className="size-4 animate-spin" />
                  Naya prépare le portrait...
                </div>
              ) : (
                <div className="text-sm leading-relaxed text-ink font-medium">
                  <MarkdownContent content={synthesis} />
                </div>
              )}
            </div>
          </div>

          {/* "Là où ses talents pourraient l'emmener" — affinités de parcours dérivées
              des mêmes scores de talents que la bannière Guilde ci-dessus (cf.
              getTalentAffinities dans lib/guilds.ts), pas une donnée inventée. */}
          {child.talents && Object.values(child.talents).some((v) => v > 0) && (
            <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-xl">
              <h3 className="mb-1 flex items-center gap-2 font-display text-balance text-lg font-bold">
                <Compass className="size-5 text-brand" />
                Là où ses talents pourraient l'emmener
              </h3>
              <p className="mb-5 text-xs font-medium leading-relaxed text-ink/60">
                Les possibilités restent infinies — {child.name} pourrait aussi bien concevoir, enseigner, chercher ou entreprendre. On garde toutes les portes ouvertes.
              </p>
              <div className="space-y-4">
                {getTalentAffinities(child.talents).map((a) => (
                  <div key={a.key}>
                    <div className="mb-1.5 flex items-baseline justify-between">
                      <span className="text-sm font-bold text-ink">{a.label}</span>
                      <span className="text-sm font-black" style={{ color: `var(--guild-${a.key})` }}>{a.pct}%</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-ink/8">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${a.pct}%`, background: `var(--guild-${a.key})` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Boussole d'Opportunités & Métiers d'Avenir (12 ans et +) */}
          {child.age >= OPPORTUNITY_COMPASS_MIN_AGE && (() => {
            const completedSubforms = Array.from(
              new Set(
                completed
                  .map((c) => c.trait_subform)
                  .filter((sub): sub is string => typeof sub === "string" && Boolean(TALENT_SUBFORM_OPPORTUNITIES[sub]))
              )
            );

            if (completedSubforms.length === 0) return null;

            return (
              <div className="rounded-3xl border border-brand/20 bg-gradient-to-br from-brand/5 via-white to-sky/5 p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2 font-display text-balance text-lg font-bold text-ink">
                    <Compass className="size-5 text-brand" />
                    Boussole d'Opportunités & Pistes d'Avenir
                  </h3>
                  <span className="rounded-full border border-brand/20 bg-brand/10 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider text-brand">
                    {OPPORTUNITY_COMPASS_VERSION}
                  </span>
                </div>
                <p className="text-xs font-medium leading-relaxed text-ink/70">
                  Pistes d'exploration d'avenir basées sur les sous-domaines de compétences spécifiques analysés lors des défis de {child.name}.
                </p>
                <div className="grid gap-3 sm:grid-cols-2 pt-2">
                  {completedSubforms.map((key) => {
                    const pistes = TALENT_SUBFORM_OPPORTUNITIES[key];
                    if (!pistes) return null;
                    return (
                      <div key={key} className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm">
                        <h4 className="text-xs font-black text-brand uppercase tracking-wider mb-1">
                          {TALENT_SUBFORM_LABELS[key] ?? key}
                        </h4>
                        <p className="text-xs font-medium text-ink/75 leading-relaxed">
                          {pistes.join(" · ")}
                        </p>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-ink/50 italic pt-2 border-t border-dashed border-ink/10">
                  {OPPORTUNITY_COMPASS_DISCLAIMER}
                </p>
              </div>
            );
          })()}

          {/* 🃏 Collectible Talent Cards Grid */}
          <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-xl space-y-6">
            <div>
              <h3 className="font-display text-balance text-lg font-black text-ink flex items-center gap-2">
                <Star className="size-5 text-brand fill-brand" />
                Cartes de Potentiels de {child.name}
              </h3>
              <p className="text-xs font-semibold text-ink/60 mt-1">
                Les talents de {child.name} se développent sous forme de cartes d'aptitudes évolutives adaptées à sa tranche d'âge.
              </p>
            </div>

            <div className="grid gap-4  ">
              {Object.entries(TALENT_DETAILS).map(([key, details]) => {
                const score = child.talents?.[key] || 0;
                const card = getTalentCardInfo(child.age, score);
                const Icon = details.icon;

                return (
                  <div
                    key={key}
                    className={`rounded-2xl border border-ink/10 p-4 flex flex-col justify-between transition-all hover:-translate-y-1 ${card.bgClass} shadow-sm`}
                  >
                    <div>
                      {/* Top bar: Card Type & Stars */}
                      <div className="flex justify-between items-center mb-3">
                        <span className={`rounded-md border border-ink/10 px-2 py-0.5 text-[8px] font-black uppercase tracking-wider ${card.tagClass}`}>
                          {card.typeLabel}
                        </span>
                        <div className="flex items-center gap-0.5 text-amber-500">
                          {Array.from({ length: card.level }).map((_, i) => (
                            <Star key={i} className="size-3 fill-current stroke-ink stroke-[1.5]" />
                          ))}
                        </div>
                      </div>

                      {/* Card Title & Icon */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 rounded-lg border border-ink/10 bg-white shrink-0">
                          <Icon className="size-4 text-ink" />
                        </div>
                        <h4 className="font-display text-balance text-sm font-black text-ink leading-none">{details.title}</h4>
                      </div>

                      <p className="text-[10px] font-semibold text-ink/65 leading-tight mb-4 min-h-[32px]">
                        {details.description}
                      </p>
                    </div>

                    {/* Progress Bar & Score inside the card */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px] font-black">
                        <span className="text-ink/60">{card.levelLabel}</span>
                        <span className="text-ink">{score} / 100</span>
                      </div>
                      <div className="h-2 rounded-full border border-ink/10 bg-white overflow-hidden">
                        <div
                          className={`h-full border-r border-ink ${card.barColor}`}
                          style={{ width: `${score}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top domaines — Terrains de jeu favoris */}
          {(() => {
            const domainCounts: Record<string, number> = {};
            for (const c of completed) {
              domainCounts[c.domain] = (domainCounts[c.domain] ?? 0) + 1;
            }
            const topDomains = Object.entries(domainCounts)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 3);

            if (topDomains.length === 0) return null;

            return (
              <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-xl space-y-4">
                <h3 className="font-display font-bold text-lg text-ink flex items-center gap-2">
                  <MapPin className="size-5 text-brand" /> Terrains de jeu favoris
                </h3>
                <div className="space-y-3">
                  {topDomains.map(([domain, count], i) => (
                    <div key={domain} className="flex items-center gap-3">
                      <span className="font-display font-black text-xl text-ink/20 w-6 text-center">
                        {i + 1}
                      </span>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${getDomainStyle(domain)}`}>
                            {domain}
                          </span>
                          <span className="text-xs font-bold text-ink/60">{count} défi{count > 1 ? "s" : ""}</span>
                        </div>
                        <div className="h-2 bg-ink/6 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-brand transition-all duration-500"
                            style={{ width: `${Math.round((count / (topDomains[0][1] || 1)) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Achievement Timeline — Historique mensuel avec photos */}
          <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-display text-balance text-lg font-bold">
                <Clock className="size-5 text-brand" />
                Timeline & Historique de progression ({completed.length})
              </h3>
              {child && <InviteMentorDialog childId={child.id} childName={child.name} />}
            </div>

            {completed.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-ink/10 bg-surface p-8 text-center">
                <CheckCircle2 className="size-8 mx-auto mb-3 text-ink/20" />
                <p className="font-bold text-ink/40 text-sm">Aucun défi complété pour l'instant.</p>
                <Link
                  to="/profiles/$profileId/challenges"
                  params={{ profileId: child.id }}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white shadow-sm"
                >
                  <Sparkles className="size-3.5" /> Lancer un défi
                </Link>
              </div>
            ) : (
              <div className="space-y-6">
                {groupByMonth(completed).map(([monthKey, items], index) => {
                  const isDefaultExpanded = index < DEFAULT_EXPANDED_MONTHS;
                  const isExpanded = isDefaultExpanded || expandedMonths.has(monthKey);

                  return (
                    <div key={monthKey}>
                      <button
                        type="button"
                        onClick={() => {
                          if (isDefaultExpanded) return;
                          setExpandedMonths((prev) => {
                            const next = new Set(prev);
                            if (next.has(monthKey)) next.delete(monthKey);
                            else next.add(monthKey);
                            return next;
                          });
                        }}
                        className={`mb-3 flex w-full items-center gap-2 ${isDefaultExpanded ? "cursor-default" : "cursor-pointer"}`}
                      >
                        <span className="text-[11px] font-black uppercase tracking-widest text-ink/40">
                          {formatMonthLabel(monthKey)}
                        </span>
                        <div className="flex-1 h-px bg-ink/10" />
                        <span className="text-[10px] font-bold text-ink/40">
                          {items.length} défi{items.length > 1 ? "s" : ""}
                        </span>
                        {!isDefaultExpanded && (
                          <ChevronDown className={`size-3.5 text-ink/40 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="space-y-3 pl-3 border-l-2 border-brand/20">
                          {items.map((c) => (
                            <div
                              key={c.id}
                              className="relative ml-2 rounded-2xl border border-ink/10 bg-surface p-4 shadow-sm space-y-2"
                            >
                              <div className="absolute -left-[1.25rem] top-5 size-3 rounded-full bg-emerald-500 border-2 border-white shadow-sm" />

                              <div className="flex items-start gap-3">
                                <CheckCircle2 className="size-4 shrink-0 text-emerald-600 mt-0.5" />
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-sm text-ink leading-snug">{c.title}</p>
                                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${getDomainStyle(c.domain)}`}>
                                      {c.domain}
                                    </span>
                                    {c.completed_at && (
                                      <span className="text-[10px] text-ink/50 font-semibold">
                                        {new Date(c.completed_at).toLocaleDateString("fr-FR", {
                                          day: "numeric",
                                          month: "short",
                                        })}
                                      </span>
                                    )}
                                    {c.proof_image_url && (
                                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
                                        📸 Photo
                                      </span>
                                    )}
                                  </div>
                                  {c.ai_observations && (
                                    <p className="mt-2 text-xs text-ink/65 leading-relaxed italic line-clamp-2">
                                      "{c.ai_observations}"
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-xl">
            <h3 className="mb-4 flex items-center gap-2 font-display text-balance text-lg font-bold">
              <ImageIcon className="size-5 text-brand" />
              Galerie d'artefacts
            </h3>
            {artifacts.length === 0 ? (
              <p className="text-sm text-ink/60">Aucune photo pour l'instant.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3  ">
                {artifacts.map((c) => (
                  <div key={c.id} className="aspect-square overflow-hidden rounded-2xl border border-ink/10 bg-surface">
                    <img src={c.proof_image_url!} alt={c.title} className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Modale de rédemption d'un code de parrainage (dons diaspora/RSE, /parrainage) */}
      {showSponsorModal && activeSeason && (
        <SeasonEnrollmentModal
          season={activeSeason}
          childId={profileId}
          childName={child.name}
          onClose={() => setShowSponsorModal(false)}
          onSuccess={() => {
            setShowSponsorModal(false);
            getChildAccessStatusFn({ data: { childId: profileId } })
              .then((res) => setAccessState(res))
              .catch(console.error);
          }}
        />
      )}

      <AppTabBar profileId={profileId} />
    </div>
  );
}
