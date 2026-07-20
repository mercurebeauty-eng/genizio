import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { getChildAISynthesis } from "@/lib/challenges.functions";
import { getChildGuild } from "@/lib/guilds";
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
  GraduationCap,
  Trash2,
  Search,
} from "lucide-react";
import { InviteMentorDialog } from "@/components/mentors/InviteMentorDialog";
import { AddGradeDialog } from "@/components/grades/AddGradeDialog";
import { deleteSchoolGrade } from "@/lib/school-grades.functions";
import { ensureHypothesesForChild } from "@/lib/hypotheses.functions";
import { AppHeader } from "@/components/AppHeader";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { INTERESTS_BY_TALENT } from "@/components/profiles/shared";
import { TALENT_KEY_LABELS } from "@/lib/talent-buckets";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { toast } from "sonner";

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
};

type Challenge = {
  id: string;
  title: string;
  domain: string;
  status: "todo" | "in_progress" | "completed";
  completed_at: string | null;
  proof_image_url: string | null;
};

type SchoolGrade = {
  id: string;
  subject: string;
  grade: number;
  max_grade: number;
  evaluation_type: string | null;
  graded_at: string;
};

// NAYA 2.0 Phase 4 — cf. genizio-decisions #33. Seule parent_narrative est lue ici : le
// JSON hypotheses (causes, probabilités, evidence_log) reste strictement interne, jamais
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
  const [grades, setGrades] = useState<SchoolGrade[]>([]);
  const [openCycle, setOpenCycle] = useState<OpenHypothesisCycle | null>(null);
  const [fetching, setFetching] = useState(true);
  const [synthesis, setSynthesis] = useState("");
  const [fetchingSynthesis, setFetchingSynthesis] = useState(false);
  const [mentorCount, setMentorCount] = useState(0);

  const fetchSynthesis = useServerFn(getChildAISynthesis);
  const deleteGradeFn = useServerFn(deleteSchoolGrade);
  const ensureHypotheses = useServerFn(ensureHypothesesForChild);

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [session, loading, navigate]);

  const refetchGrades = () => {
    supabase
      .from("school_grades")
      .select("id, subject, grade, max_grade, evaluation_type, graded_at")
      .eq("child_id", profileId)
      .order("graded_at", { ascending: false })
      .then(({ data }) => setGrades((data ?? []) as SchoolGrade[]));
  };

  const handleDeleteGrade = async (id: string) => {
    if (!(await confirmDialog({
      title: "Supprimer cette note ?",
      description: "Cette action est irréversible.",
      confirmLabel: "Supprimer",
      variant: "danger",
    }))) return;
    try {
      await deleteGradeFn({ data: { id } });
      setGrades((prev) => prev.filter((g) => g.id !== id));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de la suppression");
    }
  };

  useEffect(() => {
    if (!session) return;
    setFetching(true);
    Promise.all([
      supabase.from("child_profiles").select("id, name, age, talents, interests, pdf_unlocked").eq("id", profileId).eq("user_id", session!.user.id).maybeSingle(),
      supabase
        .from("challenges")
        .select("id, title, domain, status, completed_at, proof_image_url")
        .eq("child_id", profileId)
        .order("completed_at", { ascending: false }),
      supabase
        .from("child_mentors")
        .select("id", { count: "exact", head: true })
        .eq("child_id", profileId),
      supabase
        .from("school_grades")
        .select("id, subject, grade, max_grade, evaluation_type, graded_at")
        .eq("child_id", profileId)
        .order("graded_at", { ascending: false }),
      supabase
        .from("hypothesis_cycles")
        .select("id, parent_narrative")
        .eq("child_id", profileId)
        .eq("status", "open")
        .not("parent_narrative", "is", null)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]).then(([c, ch, cm, sg, hc]) => {
      setChild((c.data as Child) ?? null);
      setChallenges((ch.data ?? []) as Challenge[]);
      setMentorCount(cm.count ?? 0);
      setGrades((sg.data ?? []) as SchoolGrade[]);
      setOpenCycle((hc.data as OpenHypothesisCycle) ?? null);
      setFetching(false);
    });
  }, [session, profileId]);

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
      .catch(() => setSynthesis(""))
      .finally(() => setFetchingSynthesis(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, profileId]);

  // NAYA 2.0 Phase 3a/4 : déclenche la génération d'hypothèses (+ narration Phase 4)
  // pour toute anomalie scolaire non encore diagnostiquée. Fire-and-forget,
  // best-effort. Idempotent côté serveur : ne coûte un appel IA que s'il existe une
  // anomalie sans cycle (ou un cycle sans narration), sinon simple vérification en
  // base. Un échec (quota, réseau) est silencieux : le prochain chargement du
  // Portfolio réessaiera. Re-fetch le cycle après coup pour que la carte "Ce que Naya
  // a remarqué" apparaisse sans recharger la page si ce montage vient d'en générer un.
  useEffect(() => {
    if (!session) return;
    ensureHypotheses({ data: { childId: profileId } })
      .then((res) => { if (res.generated) refetchOpenCycle(); })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, profileId]);

  if (loading || !session || fetching) {
    return (
      <div className="grid min-h-screen place-items-center bg-surface">
        <GenizioLoader label="Chargement…" />
      </div>
    );
  }

  if (!child) {
    return (
      <div className="grid min-h-screen place-items-center bg-surface text-ink">
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
    <div className="min-h-screen bg-surface pb-24 text-ink md:pb-6">
      <AppHeader hideTabBarLinks />

      <main className="mx-auto max-w-6xl px-6 py-10 md:flex md:gap-8">
        <AppTabBar profileId={profileId} />

        <div className="min-w-0 flex-1 space-y-6">
          {/* Bannière Guilde */}
          {(() => {
            const guild = getChildGuild(child.talents);
            return (
              <div className={`rounded-3xl border-[3px] border-ink p-5 shadow-brutal flex items-center gap-4 ${guild.bgColor}`}>
                <div className="text-5xl">{guild.emoji}</div>
                <div>
                  <p className={`text-[11px] font-extrabold uppercase tracking-widest mb-0.5 ${guild.color} opacity-70`}>
                    Guilde de {child.name}
                  </p>
                  <h2 className={`font-display text-2xl font-black leading-tight ${guild.color}`}>{guild.name}</h2>
                  <p className={`text-sm font-medium italic mt-1 ${guild.color} opacity-80`}>« {guild.description} »</p>
                </div>
              </div>
            );
          })()}

          {/* NAYA 2.0 Phase 4 — "Ce que Naya a remarqué" (cf. genizio-decisions #33).
              Visuellement distincte du Portrait (ambre = provisoire, pas la synthèse
              stable en sky ci-dessous) : jamais présentée comme un verdict, jamais de
              chiffre — seul parent_narrative (texte déjà nettoyé côté serveur) est
              rendu ici. Absente du DOM si aucun cycle ouvert n'existe encore : ne
              jamais afficher un état "rien détecté" qui sonnerait comme un jugement. */}
          {openCycle?.parent_narrative && (
            <div className="rounded-3xl border-[3px] border-ink bg-amber-50 p-6 shadow-brutal">
              <div className="mb-3 flex items-center gap-3">
                <NayaAvatar size="sm" thoughts={[`Je réfléchis à quelque chose sur ${child.name}...`]} />
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-amber-200 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-900">
                    <Search className="size-3" />
                    Naya enquête encore
                  </span>
                  <h3 className="mt-1 font-display text-lg font-bold text-ink">Ce que Naya a remarqué</h3>
                </div>
              </div>
              <p className="text-sm font-medium leading-relaxed text-ink">
                {openCycle.parent_narrative}
              </p>
              <p className="mt-4 text-xs italic text-ink/60">
                Naya continue d'observer les prochains défis de {child.name} pour affiner sa compréhension.
              </p>
            </div>
          )}

          {/* Success card dashboard: Profil Actuel de l'Enfant */}
          {(() => {
            const guild = getChildGuild(child.talents);
            const level = Math.max(1, Math.min(10, Math.floor(completed.length / 4) + 1));
            
            // Singularize guild name for the title. "Curieux" covers
            // NO_GUILD_YET explicitly — distinct from any real guild's
            // singular form AND from every entry in `suffixes` below, so it
            // can't collide into an odd repeat like "Aventurier Aventurier".
            let singularGuild = "Curieux";
            if (guild.name.includes("Bâtisseurs")) singularGuild = "Bâtisseur";
            else if (guild.name.includes("Inventeurs")) singularGuild = "Inventeur";
            else if (guild.name.includes("Explorateurs")) singularGuild = "Explorateur";
            else if (guild.name.includes("Créateurs")) singularGuild = "Créateur";
            else if (guild.name.includes("Stratèges")) singularGuild = "Stratège";
            else if (guild.name.includes("Protecteurs")) singularGuild = "Protecteur";

            const suffixes = ["Novice", "Apprenti", "Émergent", "Compagnon", "Initié", "Confirmé", "Aventurier", "Maître", "Champion", "Légende"];
            const rank = `${singularGuild} ${suffixes[level - 1] || "Expert"}`;

            // List of interests tags to map status
            const childInterests = child.interests && child.interests.length > 0
              ? child.interests.slice(0, 4)
              : ["Sciences & Expériences", "Dessin & Peinture", "Sens de la négociation", "Construction & Lego"];

            // Helper to get bucket for an interest
            const getInterestBucket = (interestName: string) => {
              // Find which talent key contains this interest tag
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
              <div className="rounded-3xl border-[3px] border-ink bg-white p-6 shadow-brutal flex flex-col justify-between">
                <div>
                  {/* Card Header */}
                  <div className="flex justify-between items-start gap-4 mb-4">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-brand">
                        Profil actuel de l'enfant
                      </p>
                      <h2 className="font-display text-2xl font-black text-ink mt-0.5">{rank}</h2>
                    </div>
                    
                    {/* Circular Dashed Level Badge */}
                    <div className="size-14 rounded-full border-[3px] border-dashed border-ink bg-surface flex flex-col items-center justify-center shrink-0">
                      <span className="text-[9px] font-black uppercase tracking-wider text-ink/60 leading-none">Level</span>
                      <span className="font-display text-base font-black text-ink leading-none mt-0.5">{level}</span>
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
                          <span className={`rounded-full border-2 px-3 py-0.5 text-[9px] font-black uppercase tracking-wider ${bucket.cls}`}>
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
                    <div className="font-display text-2xl font-black text-orange-600">{completed.length}</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-ink/60 mt-0.5">Défis complétés</div>
                  </div>
                  <div>
                    <div className="font-display text-2xl font-black text-emerald-600">
                      {Object.values(child.talents || {}).filter((val) => val > 0).length}
                    </div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-ink/60 mt-0.5">Talents cartographiés</div>
                  </div>
                  <div>
                    <div className="font-display text-2xl font-black text-sky-600">{mentorCount}</div>
                    <div className="text-[10px] font-bold uppercase tracking-widest text-ink/60 mt-0.5">Mentors actifs</div>
                  </div>
                </div>
              </div>
            );
          })()}

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
              <div className="rounded-3xl border-[3px] border-ink bg-amber-50 p-6 shadow-brutal flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-start gap-4">
                  <div className="grid size-12 place-items-center rounded-2xl bg-brand border-2 border-ink text-white shadow-brutal-sm shrink-0">
                    <Award className="size-6 text-white" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-display text-lg font-black text-ink">Le Passeport d'Excellence Génizio</h3>
                      <span className={`rounded-full border-2 px-2.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${
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
                      className="w-full md:w-auto text-center inline-flex items-center justify-center gap-2 rounded-2xl border-[3px] border-ink bg-[#25D366] px-5 py-3 text-xs font-black text-white shadow-brutal-sm hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                      <span>Télécharger le Passeport</span>
                    </Link>
                  ) : (
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full md:w-auto text-center inline-flex items-center justify-center gap-2 rounded-2xl border-[3px] border-ink bg-brand px-5 py-3 text-xs font-black text-white shadow-brutal-sm hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
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

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <div className="rounded-3xl border-[3px] border-ink bg-white p-6 shadow-brutal">
              <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold">
                <Award className="size-5 text-brand" />
                Carte des Talents
              </h3>
              <TalentRadarChart talents={child.talents} name={child.name} className="h-64 w-full" age={child.age} />
              <p className="text-center text-[11px] font-medium text-ink/60">
                Cette carte s'affine et se développe à mesure que {child.name} réalise ses défis.
              </p>
            </div>

            <div className="rounded-3xl border-[3px] border-ink bg-sky p-6 shadow-brutal">
              <div className="mb-4 flex items-center gap-3">
                <NayaAvatar size="sm" thoughts={[`J'observe les progrès de ${child.name} !`]} />
                <h3 className="font-display text-lg font-bold text-ink">Portrait de {child.name}</h3>
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

          {/* 🃏 Collectible Talent Cards Grid */}
          <div className="rounded-3xl border-[3px] border-ink bg-white p-6 shadow-brutal space-y-6">
            <div>
              <h3 className="font-display text-lg font-black text-ink flex items-center gap-2">
                <Star className="size-5 text-brand fill-brand" />
                Cartes de Potentiels de {child.name}
              </h3>
              <p className="text-xs font-semibold text-ink/60 mt-1">
                Les talents de {child.name} se développent sous forme de cartes d'aptitudes évolutives adaptées à sa tranche d'âge.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Object.entries(TALENT_DETAILS).map(([key, details]) => {
                const score = child.talents?.[key] || 0;
                const card = getTalentCardInfo(child.age, score);
                const Icon = details.icon;

                return (
                  <div
                    key={key}
                    className={`rounded-2xl border-[3px] border-ink p-4 flex flex-col justify-between transition-all hover:-translate-y-1 ${card.bgClass} shadow-brutal-sm`}
                  >
                    <div>
                      {/* Top bar: Card Type & Stars */}
                      <div className="flex justify-between items-center mb-3">
                        <span className={`rounded-md border-2 border-ink px-2 py-0.5 text-[8px] font-black uppercase tracking-wider ${card.tagClass}`}>
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
                        <div className="p-1.5 rounded-lg border-2 border-ink bg-white shrink-0">
                          <Icon className="size-4 text-ink" />
                        </div>
                        <h4 className="font-display text-sm font-black text-ink leading-none">{details.title}</h4>
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
                      <div className="h-2 rounded-full border-2 border-ink bg-white overflow-hidden">
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

          {/* Notes scolaires — NAYA 2.0 Phase 2 (cf. genizio-decisions #31). Liste
              purement factuelle : aucune détection d'anomalie ni interprétation
              n'est affichée ici, seulement en Phase 4 ("Compréhension de Naya"). */}
          <div className="rounded-3xl border-[3px] border-ink bg-white p-6 shadow-brutal">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 font-display text-lg font-bold">
                <GraduationCap className="size-5 text-brand" />
                Notes scolaires
              </h3>
              <AddGradeDialog childId={profileId} childName={child.name} onCreated={refetchGrades} />
            </div>
            {grades.length === 0 ? (
              <p className="text-sm text-ink/60">Aucune note enregistrée pour l'instant.</p>
            ) : (
              <ul className="space-y-2">
                {grades.map((g) => (
                  <li key={g.id} className="flex items-center justify-between rounded-2xl border-2 border-ink bg-surface px-4 py-3">
                    <div>
                      <p className="text-sm font-bold text-ink">
                        {g.subject} — {g.grade}/{g.max_grade}
                        {g.evaluation_type && <span className="ml-2 text-xs font-semibold text-ink/50">{g.evaluation_type}</span>}
                      </p>
                      <p className="text-xs text-ink/60">{new Date(g.graded_at).toLocaleDateString("fr-FR")}</p>
                    </div>
                    <button
                      onClick={() => handleDeleteGrade(g.id)}
                      className="rounded-xl border-2 border-transparent p-1.5 text-ink/40 hover:border-ink hover:text-red-600 transition-all"
                      aria-label="Supprimer cette note"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-3xl border-[3px] border-ink bg-white p-6 shadow-brutal">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-display text-lg font-bold">
                <Calendar className="size-5 text-brand" />
                Timeline de progression
              </h3>
              {child && <InviteMentorDialog childId={child.id} childName={child.name} />}
            </div>
            {completed.length === 0 ? (
              <p className="text-sm text-ink/60">Aucun défi complété pour l'instant.</p>
            ) : (
              <ul className="space-y-3">
                {completed.map((c) => (
                  <li key={c.id} className="flex items-center justify-between rounded-2xl border-2 border-ink bg-surface px-4 py-3">
                    <div>
                      <p className="text-sm font-bold text-ink">{c.title}</p>
                      <p className="text-xs text-ink/60">{c.domain}</p>
                    </div>
                    <span className="text-xs font-semibold text-ink/60">
                      {c.completed_at ? new Date(c.completed_at).toLocaleDateString("fr-FR") : ""}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-3xl border-[3px] border-ink bg-white p-6 shadow-brutal">
            <h3 className="mb-4 flex items-center gap-2 font-display text-lg font-bold">
              <ImageIcon className="size-5 text-brand" />
              Galerie d'artefacts
            </h3>
            {artifacts.length === 0 ? (
              <p className="text-sm text-ink/60">Aucune photo pour l'instant.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {artifacts.map((c) => (
                  <div key={c.id} className="aspect-square overflow-hidden rounded-2xl border-[3px] border-ink bg-surface">
                    <img src={c.proof_image_url!} alt={c.title} className="h-full w-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
