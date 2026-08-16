import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useSession } from "@/hooks/use-session";
import { AppHeader } from "@/components/AppHeader";
import { getMentorDashboard, declareSessionMentor, checkIsActiveMentor, CONTEST_REASONS } from "@/lib/mentors.functions";
import {
  getMentorActivityOverview,
  type MentorActivityOverview,
} from "@/lib/mentor-activity.functions";
import { computeMentorPayoutXof } from "@/lib/mentor-score";
import { MENTOR_SESSION_PAYOUT_XOF, formatXofAmount } from "@/lib/pricing";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { listMyNotifications, markNotificationsRead } from "@/lib/notifications.functions";
import {
  planMentorSessionSlot,
  cancelMentorSessionSlot,
  listMyPlannedSlots,
} from "@/lib/mentor-scheduling.functions";
import {
  mentorUpdateChallenge,
  mentorSubmitNotCompleted,
  mentorSubmitProof,
  mentorSubmitDeclarativeProof,
  mentorGenerateChallenges,
} from "@/lib/mentor-operator.functions";
import {
  getMentorReports,
  saveMentorReportDraft,
  submitMentorReport,
} from "@/lib/mentor-reports.functions";
import { NOT_COMPLETED_CHIPS } from "@/lib/challenges.functions";
import { fileToCompressedProof } from "@/lib/image-proof";
import { getChildGuild } from "@/lib/guilds";
import {
  Loader2,
  Users,
  Trophy,
  CheckSquare,
  Eye,
  ClipboardList,
  Zap,
  CheckCircle2,
  X,
  Clock,
  AlertTriangle,
  Brain,
  Phone,
  CalendarCheck,
  Play,
  Camera,
  Send,
  FileText,
  RotateCcw,
  Sparkles,
  Bell,
  Activity,
  ShieldAlert,
  Wallet,
  CircleDollarSign,
  Hourglass,
  TrendingUp,
  Star,
  CalendarDays,
  type LucideIcon,
} from "lucide-react";
import { NayaAvatar } from "@/components/NayaAvatar";
import { MarkdownContent } from "@/components/ui/markdown-content";
import { GenizioLoader } from "@/components/GenizioLoader";
import { formatPedagogicalIntention } from "@/lib/pedagogical-intention";
import { ProofImage } from "@/lib/proof-image";
import { toast } from "sonner";

export const Route = createFileRoute("/mentor")({
  component: MentorDashboardPage,
});

type ChildWithChallenges = {
  id: string;
  name: string;
  age: number;
  city: string | null;
  interests: string[];
  talents: Record<string, number>;
  parentPhone: string | null;
  assignedAt: string;
  /** Mentor Copilote (décision #74) : pack | campaign = opérateur, none = lecture. */
  accompaniment: "pack" | "campaign" | "none";
  /** Dernières actions du mentor sur cet enfant (le journal sert de journal de séance). */
  mentorActions: {
    id: string;
    challenge_id: string | null;
    action: string;
    payload: any;
    created_at: string;
  }[];
  challenges: {
    id: string;
    title: string;
    domain: string;
    status: "todo" | "in_progress" | "completed" | "not_completed";
    created_at: string;
    description: string;
    duration: string;
    proof_image_url: string | null;
    ai_observations: string | null;
    notes: string | null;
    difficulty: string;
    requires_supervision: boolean;
    supervision_warning: string | null;
    proof_mode: string;
    proof_target: { metric?: string; value?: number } | null;
    completed_at: string | null;
  }[];
};

type MentorReport = {
  id: string;
  status: "draft" | "submitted" | "validated" | "rejected";
  period_start: string;
  period_end: string;
  realisations: string;
  competences_observees: string;
  recommandations: string;
  parent_feedback: string | null;
  updated_at: string;
};

function MentorDashboardPage() {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const [children, setChildren] = useState<ChildWithChallenges[]>([]);
  const [fetching, setFetching] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedChallenge, setSelectedChallenge] = useState<any | null>(null);
  // Score de fiabilité (V2) : renvoyé par getMentorDashboard, affiché dans l'en-tête.
  const [score, setScore] = useState<number | null>(null);
  const [sessionsThisMonth, setSessionsThisMonth] = useState(0);
  const [expectedSessions, setExpectedSessions] = useState(0);
  const [pendingPayoutXof, setPendingPayoutXof] = useState(0);
  // Confiance Mentor (V3) : statut, palier de confiance, solde de points.
  const [mentorStatus, setMentorStatus] = useState<string>("active");
  const [tier, setTier] = useState<"standard" | "trusted">("standard");
  const [points, setPoints] = useState(0);
  const [badge, setBadge] = useState<"none" | "bronze" | "gold">("none");
  const [pointsBonusPct, setPointsBonusPct] = useState(0);
  // Vue globale d'activité (décision #83) — données BI du mentor + bascule de vue.
  const [overview, setOverview] = useState<MentorActivityOverview | null>(null);
  const [activityLoading, setActivityLoading] = useState(true);
  const [activityError, setActivityError] = useState(false);
  const [view, setView] = useState<"overview" | "children">("overview");
  // Notifications in-app (canal pull — bilan validé/refusé, séance confirmée, statut).
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const notificationsFn = useServerFn(listMyNotifications);
  const markReadFn = useServerFn(markNotificationsRead);
  const [declaringFor, setDeclaringFor] = useState<string | null>(null);
  const [sessionDate, setSessionDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [sessionTime, setSessionTime] = useState("");
  const [sessionNotes, setSessionNotes] = useState("");
  const [declaring, setDeclaring] = useState(false);
  // Planification des séances (2026-08-15) : créneau planifié (date + heure) lié
  // facultativement à la déclaration — alimente la ponctualité du score.
  const [plannedSlots, setPlannedSlots] = useState<
    {
      id: string;
      child_profile_id: string;
      child_name: string;
      planned_at: string;
      notes: string | null;
    }[]
  >([]);
  const [planningFor, setPlanningFor] = useState<string | null>(null);
  const [planDate, setPlanDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [planTime, setPlanTime] = useState("10:00");
  const [planNotes, setPlanNotes] = useState("");
  const [planning, setPlanning] = useState(false);
  const [declaredSlotId, setDeclaredSlotId] = useState<string>("");

  const getDashboardFn = useServerFn(getMentorDashboard);
  const activityFn = useServerFn(getMentorActivityOverview);
  const declareFn = useServerFn(declareSessionMentor);
  const planSlotFn = useServerFn(planMentorSessionSlot);
  const cancelSlotFn = useServerFn(cancelMentorSessionSlot);
  const listSlotsFn = useServerFn(listMyPlannedSlots);
  const supUpdateFn = useServerFn(mentorUpdateChallenge);
  const supNotCompletedFn = useServerFn(mentorSubmitNotCompleted);
  const supProofFn = useServerFn(mentorSubmitProof);
  const supDeclarativeFn = useServerFn(mentorSubmitDeclarativeProof);
  const supGenerateFn = useServerFn(mentorGenerateChallenges);
  const getReportsFn = useServerFn(getMentorReports);
  const saveReportFn = useServerFn(saveMentorReportDraft);
  const submitReportFn = useServerFn(submitMentorReport);

  // Mentor Copilote — onglet de l'enfant sélectionné (Défis | Bilan).
  const [panelTab, setPanelTab] = useState<"defis" | "bilan">("defis");
  // Bilan de fin (décision #74) — le « bilan inclus » du pack, validé par le parent.
  const [reportDraft, setReportDraft] = useState<MentorReport | null>(null);
  const [reportForm, setReportForm] = useState({
    periodStart: "",
    periodEnd: "",
    realisations: "",
    competencesObservees: "",
    recommandations: "",
  });
  const [savingReport, setSavingReport] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);
  // Abandon (motif obligatoire).
  const [notCompletedFor, setNotCompletedFor] = useState<any | null>(null);
  const [notCompletedReason, setNotCompletedReason] = useState("");
  const [notCompletedChip, setNotCompletedChip] = useState<string | undefined>(undefined);
  const [submittingNotCompleted, setSubmittingNotCompleted] = useState(false);
  // Soumission de preuve (photo en séance ou déclarative).
  const [proofFor, setProofFor] = useState<any | null>(null);
  const [proofPhoto, setProofPhoto] = useState<File | null>(null);
  const [declarativeValue, setDeclarativeValue] = useState<string>("");
  const [submittingProof, setSubmittingProof] = useState(false);
  // Génération de défis.
  const [generatingFor, setGeneratingFor] = useState(false);
  // Note de séance dans la modale (journal mentor).
  const [noteDraft, setNoteDraft] = useState("");

  const defaultPeriod = () => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return {
      periodStart: start.toISOString().slice(0, 10),
      periodEnd: now.toISOString().slice(0, 10),
    };
  };

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [session, loading, navigate]);

  // Garde de route (Vague 5, spec §8) : l'espace /mentor n'est visible que pour les
  // mentors ACTIFS (assignation non retirée, statut non banni) — miroir d'admin.tsx.
  // Les données restent protégées côté serveur (assertMentorOperator) ; cette garde
  // évite d'offrir l'interface à un compte qui n'a rien à y faire.
  const checkMentorFn = useServerFn(checkIsActiveMentor);
  const [isMentor, setIsMentor] = useState<boolean | null>(null);
  useEffect(() => {
    if (loading || !session) return;
    checkMentorFn({ headers: { Authorization: `Bearer ${session.access_token}` } })
      .then((res) => setIsMentor(res.isMentor))
      .catch(() => setIsMentor(false));
  }, [session, loading, checkMentorFn]);

  const loadDashboard = async () => {
    setFetching(true);
    setLoadError(false);
    try {
      const res = await getDashboardFn();
      const kids = (res.children ?? []) as ChildWithChallenges[];
      setChildren(kids);
      setSelectedId((prev) => prev ?? kids[0]?.id ?? null);
      setScore((res as any).score ?? null);
      setSessionsThisMonth((res as any).sessionsThisMonth ?? 0);
      setExpectedSessions((res as any).expectedSessions ?? 0);
      setPendingPayoutXof((res as any).pendingPayoutXof ?? 0);
      setMentorStatus((res as any).status ?? "active");
      setTier((res as any).tier ?? "standard");
      setPoints((res as any).points ?? 0);
      setBadge((res as any).badge ?? "none");
      setPointsBonusPct((res as any).pointsBonusPct ?? 0);
    } catch {
      setChildren([]);
      setLoadError(true);
    } finally {
      setFetching(false);
    }
  };

  const loadActivity = async () => {
    setActivityLoading(true);
    setActivityError(false);
    try {
      const res = await activityFn();
      setOverview(res as MentorActivityOverview);
    } catch {
      setActivityError(true);
    } finally {
      setActivityLoading(false);
    }
  };

  const refreshNotifications = async () => {
    try {
      const res = await notificationsFn();
      setNotifications((res as any)?.notifications ?? []);
    } catch {
      // Non bloquant — le panneau reste simplement vide.
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markReadFn({ data: { ids: [] } });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {
      // Non bloquant.
    }
  };

  useEffect(() => {
    if (!session) return;
    void loadDashboard();
    void loadActivity();
    void refreshNotifications();
    void refreshPlannedSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  // Chargement du bilan de l'enfant sélectionné quand on ouvre l'onglet Bilan.
  useEffect(() => {
    if (panelTab !== "bilan" || !selectedId) return;
    let cancelled = false;
    setReportDraft(null);
    getReportsFn({ data: { childId: selectedId } })
      .then((res: any) => {
        if (cancelled) return;
        const reports = (res.reports ?? []) as MentorReport[];
        const current = reports[0] ?? null;
        setReportDraft(current);
        if (current) {
          setReportForm({
            periodStart: current.period_start.slice(0, 10),
            periodEnd: current.period_end.slice(0, 10),
            realisations: current.realisations,
            competencesObservees: current.competences_observees,
            recommandations: current.recommandations,
          });
        } else {
          setReportForm({
            ...defaultPeriod(),
            realisations: "",
            competencesObservees: "",
            recommandations: "",
          });
        }
      })
      .catch((err: any) => toast.error(err.message || "Impossible de charger le bilan."))
      .finally(() => {
        if (!cancelled) setFetching(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelTab, selectedId]);

  const handleDeclareSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!declaringFor) return;
    if (!sessionTime.trim()) {
      toast.error("Indiquez l'heure de début de la séance.");
      return;
    }
    setDeclaring(true);
    try {
      const res = await declareFn({
        data: {
          childProfileId: declaringFor,
          // Heure réelle de début : sans elle (minuit), toute séance liée à un
          // créneau à 10:00 aurait un écart de 10 h → « en retard » systématique.
          // La comparaison ±30 min n'est mesurable que si l'heure est déclarée.
          occurredAt: new Date(`${sessionDate}T${sessionTime}`).toISOString(),
          notes: sessionNotes.trim() || undefined,
          slotId: declaredSlotId || undefined,
        },
      });
      const funding = (res as any)?.funding as "pack" | "campaign" | "none" | undefined;
      toast.success(
        funding === "pack"
          ? "Séance déclarée — le parent doit la confirmer pour qu'elle compte."
          : funding === "campaign"
            ? "Séance déclarée — financée par le programme partenaire, en attente de confirmation du parent."
            : "Séance déclarée — le parent doit la confirmer pour alimenter votre score.",
      );
      setDeclaringFor(null);
      setSessionNotes("");
      setDeclaredSlotId("");
      await loadDashboard();
      await refreshPlannedSlots();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la déclaration.");
    } finally {
      setDeclaring(false);
    }
  };

  // ── Planification des séances (2026-08-15, backlog « Ponctualité ») ──────────
  // Le mentor planifie un créneau (date + heure) ; le parent est notifié. À la
  // déclaration, la séance peut être liée au créneau → la ponctualité = écart
  // planifié vs réalisé (±30 min) alimente le score.

  const refreshPlannedSlots = async () => {
    try {
      const res = await listSlotsFn();
      setPlannedSlots((res as any) ?? []);
    } catch {
      // Non bloquant — la liste reste simplement vide.
    }
  };

  const handlePlanSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planningFor) return;
    setPlanning(true);
    try {
      const plannedAt = new Date(`${planDate}T${planTime}`).toISOString();
      await planSlotFn({
        data: {
          childProfileId: planningFor,
          plannedAt,
          notes: planNotes.trim() || undefined,
        },
      });
      toast.success("Séance planifiée — le parent est notifié du créneau.");
      setPlanningFor(null);
      setPlanNotes("");
      await refreshPlannedSlots();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la planification.");
    } finally {
      setPlanning(false);
    }
  };

  const handleCancelSlot = async (slotId: string) => {
    try {
      await cancelSlotFn({ data: { slotId } });
      toast.success("Créneau annulé.");
      await refreshPlannedSlots();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'annulation.");
    }
  };

  // ── Mentor Copilote — actions opérateur (décision #74) ──────────────────

  const runOperator = async (fn: () => Promise<unknown>, successMsg: string, failMsg: string) => {
    try {
      await fn();
      toast.success(successMsg);
      await loadDashboard();
    } catch (err: any) {
      toast.error(err.message || failMsg);
    }
  };

  const handleStart = (c: any) =>
    runOperator(
      () => supUpdateFn({ data: { id: c.id, status: "in_progress" } }),
      `Défi « ${c.title} » démarré.`,
      "Impossible de démarrer le défi.",
    );

  const handleProgress = (c: any, progress: number) =>
    runOperator(
      () => supUpdateFn({ data: { id: c.id, progress } }),
      `Progression mise à jour (${progress}%).`,
      "Impossible de mettre à jour la progression.",
    );

  const handleNote = (c: any, note: string) =>
    runOperator(
      () => supUpdateFn({ data: { id: c.id, notes: note } }),
      "Note de séance enregistrée.",
      "Impossible d'enregistrer la note.",
    );

  const handleNotCompleted = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notCompletedFor) return;
    setSubmittingNotCompleted(true);
    try {
      await supNotCompletedFn({
        data: {
          id: notCompletedFor.id,
          reason: notCompletedReason.trim(),
          reasonChip: notCompletedChip,
        },
      });
      toast.success("Défi marqué comme non réussi — le parent est informé.");
      setNotCompletedFor(null);
      setNotCompletedReason("");
      setNotCompletedChip(undefined);
      await loadDashboard();
    } catch (err: any) {
      toast.error(err.message || "Impossible de marquer le défi comme non réussi.");
    } finally {
      setSubmittingNotCompleted(false);
    }
  };

  const handleProofSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofFor) return;
    setSubmittingProof(true);
    try {
      const isDeclarative = proofFor.proof_mode === "declarative";
      if (isDeclarative) {
        const reported = Number(declarativeValue);
        if (Number.isNaN(reported)) throw new Error("Saisissez une valeur numérique.");
        const res = await supDeclarativeFn({
          data: { challengeId: proofFor.id, reportedValue: reported },
        });
        toast.success(
          (res as any)?.relevant
            ? "Défi validé — points attribués !"
            : "Sous la cible — l'enfant peut retenter.",
        );
      } else {
        if (!proofPhoto) throw new Error("Ajoutez la photo prise pendant la séance.");
        const compressed = await fileToCompressedProof(proofPhoto);
        const res = await supProofFn({
          data: {
            challengeId: proofFor.id,
            proofImageBase64: compressed.base64,
            proofImageMediaType: compressed.mediaType,
          },
        });
        toast.success(
          (res as any)?.relevant
            ? "Preuve acceptée par Naya — défi complété !"
            : "Preuve non reconnue pour ce défi — réessayez.",
        );
      }
      setProofFor(null);
      setProofPhoto(null);
      setDeclarativeValue("");
      await loadDashboard();
    } catch (err: any) {
      toast.error(err.message || "Impossible de soumettre la preuve.");
    } finally {
      setSubmittingProof(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedId) return;
    setGeneratingFor(true);
    try {
      const childName = children.find((c) => c.id === selectedId)?.name ?? "l'enfant";
      await supGenerateFn({ data: { childId: selectedId, count: 4 } });
      toast.success(`4 nouveaux défis générés pour ${childName}.`);
      await loadDashboard();
    } catch (err: any) {
      toast.error(err.message || "Impossible de générer des défis.");
    } finally {
      setGeneratingFor(false);
    }
  };

  const handleSaveReport = async () => {
    if (!selectedId) return;
    setSavingReport(true);
    try {
      const res = await saveReportFn({
        data: {
          childId: selectedId,
          periodStart: new Date(reportForm.periodStart).toISOString(),
          periodEnd: new Date(reportForm.periodEnd).toISOString(),
          realisations: reportForm.realisations,
          competencesObservees: reportForm.competencesObservees,
          recommandations: reportForm.recommandations,
        },
      });
      setReportDraft((res as any).report ?? null);
      toast.success("Bilan enregistré (brouillon).");
    } catch (err: any) {
      toast.error(err.message || "Impossible d'enregistrer le bilan.");
    } finally {
      setSavingReport(false);
    }
  };

  const handleSubmitReport = async () => {
    if (!reportDraft) return;
    setSubmittingReport(true);
    try {
      const res = await submitReportFn({ data: { reportId: reportDraft.id } });
      setReportDraft((res as any).report ?? null);
      toast.success("Bilan soumis au parent pour validation.");
    } catch (err: any) {
      toast.error(err.message || "Impossible de soumettre le bilan.");
    } finally {
      setSubmittingReport(false);
    }
  };

  const selected = children.find((c) => c.id === selectedId) ?? null;

  if (loading || !session || isMentor === null) {
    return (
      <div className="grid min-h-dvh place-items-center bg-surface">
        <GenizioLoader label="Chargement…" />
      </div>
    );
  }

  if (!isMentor) {
    return (
      <div className="grid min-h-dvh place-items-center bg-surface p-6 text-center">
        <div>
          <ShieldAlert className="size-16 text-amber-500 mx-auto mb-4" />
          <h1 className="font-display text-balance text-2xl font-black text-ink mb-2">
            Espace Mentor réservé
          </h1>
          <p className="text-sm text-ink/60 max-w-sm mx-auto mb-6 leading-relaxed">
            Cet espace est réservé aux mentors actifs : un compte assigné par
            l'administration, ou un mode Mentor activé par code dans les paramètres.
          </p>
          <button
            onClick={() => navigate({ to: "/profiles" })}
            className="rounded-2xl border border-ink/10 bg-white px-6 py-3 font-bold cursor-pointer hover:bg-surface transition-colors"
          >
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-surface pb-24 text-ink ">
      <AppHeader />

      <main className="mx-auto max-w-5xl px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <div
            className="mb-3 flex items-end gap-3"
            style={{ paddingTop: "3.5rem", marginTop: "-3.5rem" }}
          >
            <NayaAvatar
              size="sm"
              thoughts={["Bonjour Mentor ! Voici vos enfants à accompagner."]}
            />
            <p className="text-sm text-ink/60 mb-0.5">Espace Mentor</p>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-brand">
              <Eye className="size-3" /> Mode Mentor
            </span>
          </div>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h1 className="font-display text-balance text-3xl font-extrabold">
              Tableau de Bord Mentor
            </h1>
            {/* Score de fiabilité (V1) : déclarez vos séances en app, le score se calcule
                tout seul (séances tenues + progression des enfants). Depuis la V3, seules
                les séances CONFIRMÉES par le parent comptent. */}
            {score !== null && (
              <div className="flex max-w-full flex-wrap items-center gap-3 rounded-2xl border border-ink/10 bg-white px-4 py-2.5 shadow-sm sm:flex-nowrap">
                <div className="min-w-0 text-right">
                  <p className="text-[10px] font-black uppercase tracking-widest text-ink/50">
                    Score de fiabilité
                  </p>
                  <p className="text-xs font-bold text-ink/60">
                    {sessionsThisMonth} séance{sessionsThisMonth > 1 ? "s" : ""} confirmée
                    {sessionsThisMonth > 1 ? "s" : ""} ce mois
                    {expectedSessions > 0 ? ` / ${expectedSessions} attendues` : ""}
                  </p>
                  {pendingPayoutXof > 0 && (
                    <p className="text-[10px] font-bold text-emerald-700">
                      ≈ {pendingPayoutXof.toLocaleString("fr-FR")} F à venir ce mois
                    </p>
                  )}
                  {pointsBonusPct > 0 && (
                    <p className="text-[10px] font-bold text-amber-700">
                      +{pointsBonusPct} % de payout (palier points)
                    </p>
                  )}
                </div>
                <span
                  className={`grid size-11 place-items-center rounded-xl font-black text-sm ${
                    score >= 75
                      ? "bg-emerald-100 text-emerald-700"
                      : score >= 50
                        ? "bg-amber-100 text-amber-700"
                        : "bg-rose-100 text-rose-700"
                  }`}
                >
                  {score}/100
                </span>
                {/* Palier de confiance + badge points (V3) */}
                <div className="flex flex-col items-end gap-1">
                  {tier === "trusted" && (
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-indigo-700">
                      ⭐ Mentor de confiance
                    </span>
                  )}
                  {points > 0 && (
                    <span className="rounded-full bg-surface border border-ink/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-ink/70">
                      🏅 {badge === "gold" ? "Or" : badge === "bronze" ? "Bronze" : ""} {points} pts
                    </span>
                  )}
                  {mentorStatus !== "active" && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
                        mentorStatus === "suspended"
                          ? "bg-rose-600 text-white"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {mentorStatus === "suspended"
                        ? "Suspendu"
                        : mentorStatus === "banned"
                          ? "Banni"
                          : "Averti"}
                    </span>
                  )}
                </div>
                {/* Cloche de notifications (V3) — bilan validé/refusé, séance confirmée… */}
                <div className="relative">
                  <button
                    onClick={() => {
                      setNotifOpen((o) => !o);
                      void refreshNotifications();
                    }}
                    aria-label="Notifications"
                    className="relative grid size-10 place-items-center rounded-xl border border-ink/10 bg-surface text-ink/70 hover:bg-stone-100 transition-all cursor-pointer"
                  >
                    <Bell className="size-4" />
                    {notifications.filter((n) => !n.read).length > 0 && (
                      <span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-rose-500 text-[9px] font-black text-white">
                        {notifications.filter((n) => !n.read).length}
                      </span>
                    )}
                  </button>
                  {notifOpen && (
                    <div className="absolute right-0 top-12 z-50 w-80 max-w-[85vw] rounded-2xl border border-ink/10 bg-white p-3 shadow-xl animate-in fade-in zoom-in-95 duration-150">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-ink/60">
                          <Activity className="size-3.5 text-brand" />
                          Notifications
                        </p>
                        {notifications.some((n) => !n.read) && (
                          <button
                            onClick={() => void handleMarkAllRead()}
                            className="text-[10px] font-black text-brand hover:underline cursor-pointer"
                          >
                            Tout marquer lu
                          </button>
                        )}
                      </div>
                      {notifications.length === 0 ? (
                        <p className="py-6 text-center text-xs text-ink/50 italic">
                          Aucune notification.
                        </p>
                      ) : (
                        <ul className="max-h-64 space-y-1.5 overflow-y-auto">
                          {notifications.map((n) => (
                            <li
                              key={n.id}
                              className={`rounded-xl border px-3 py-2 text-xs ${
                                n.read
                                  ? "border-ink/10 bg-surface text-ink/60"
                                  : "border-sky-200 bg-sky-50 text-ink"
                              }`}
                            >
                              {n.type === "mentor_bilan_validated"
                                ? "✅ Bilan validé par le parent"
                                : n.type === "mentor_bilan_rejected"
                                  ? `↩️ Bilan renvoyé — ${n.payload?.feedback ?? "modifications demandées"}`
                                  : n.type === "mentor_session_confirmed"
                                    ? "✅ Séance confirmée par le parent"
                                    : n.type === "mentor_session_contested"
                                      ? `⚠️ Séance contestée — ${n.payload?.reason ? CONTEST_REASONS[n.payload.reason as keyof typeof CONTEST_REASONS] ?? n.payload.reason : "motif à préciser"}`
                                      : n.type === "mentor_status_changed"
                                        ? `🏷️ Statut passé à ${n.payload?.to === "suspended" ? "« suspendu »" : n.payload?.to === "warning" ? "« averti »" : "« actif »"}`
                                        : `🔔 ${n.type}`}
                              <span className="block text-[10px] font-bold text-ink/40 mt-0.5">
                                {new Date(n.created_at).toLocaleString("fr-FR")}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bascule Vue d'ensemble / Mes enfants (décision #83) — le mentor consulte
            sa vue globale d'activité ou revient au travail quotidien sur les enfants. */}
        <div className="mb-6 flex w-fit items-center gap-1 rounded-2xl border border-ink/10 bg-white p-1 shadow-sm">
          {(["overview", "children"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={`rounded-xl px-4 py-2 text-[11px] font-black uppercase tracking-widest transition-all cursor-pointer ${
                view === v ? "bg-brand text-white shadow-sm" : "text-ink/60 hover:text-ink"
              }`}
            >
              {v === "overview" ? "Vue d'ensemble" : "Mes enfants"}
            </button>
          ))}
        </div>

        {view === "overview" ? (
          <MentorOverview
            overview={overview}
            loading={activityLoading}
            error={activityError}
            score={score}
            expectedSessions={expectedSessions}
            tier={tier}
            pointsBonusPct={pointsBonusPct}
            points={points}
            badge={badge}
            mentorStatus={mentorStatus}
            childrenCount={children.length}
          />
        ) : (
          <>
            {fetching ? (
          <div className="flex justify-center py-20">
            <Loader2 className="size-6 animate-spin text-brand" />
          </div>
        ) : loadError ? (
          <div className="rounded-3xl border border-dashed border-red-400 bg-red-50 p-16 text-center shadow-sm">
            <AlertTriangle className="size-16 text-red-400 mx-auto mb-4" />
            <p className="font-display text-balance text-xl font-bold mb-2 text-red-700">
              Impossible de charger votre tableau de bord
            </p>
            <p className="text-sm text-ink/60">
              Une erreur est survenue. Vérifiez votre connexion et réessayez, ou rechargez la page.
            </p>
          </div>
        ) : children.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-ink/20 bg-white/40 p-16 text-center shadow-sm">
            <Users className="size-16 text-ink/30 mx-auto mb-4" />
            <p className="font-display text-balance text-xl font-bold mb-2">Aucun enfant assigné</p>
            <p className="text-sm text-ink/60">
              Un administrateur Génizio doit vous assigner des profils d'enfants pour que vous
              puissiez les accompagner.
            </p>
          </div>
        ) : (
          <div className="grid gap-6">
            {/* Child Selector — Horizontal scroll bar on Mobile, grid on Desktop */}
            <div className="min-w-0 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-xs font-black uppercase tracking-widest text-ink/60">
                  Enfants assignés ({children.length})
                </h2>
                <span className="text-[10px] font-bold text-ink/40 sm:hidden">
                  Glissez pour voir tous
                </span>
              </div>
              <div className="flex overflow-x-auto sm:grid sm:grid-cols-2 md:grid-cols-3 gap-3 pb-2 no-scrollbar scroll-smooth">
                {children.map((child) => {
                  const guild = getChildGuild(child.talents);
                  const completed = child.challenges.filter((c) => c.status === "completed").length;
                  const isActive = child.id === selectedId;
                  // Seul signal de "nouveau" disponible : pas de notification à l'assignation
                  // (aucune infra email/SMS dans ce projet) — l'accueil.assignedAt sert de proxy.
                  const daysSinceAssigned =
                    (Date.now() - new Date(child.assignedAt).getTime()) / 86400000;
                  const isNew = daysSinceAssigned <= 7;
                  return (
                    <button
                      key={child.id}
                      onClick={() => setSelectedId(child.id)}
                      className={`relative min-w-[200px] sm:min-w-0 text-left rounded-2xl border border-ink/10 p-3.5 shadow-2xs transition-all cursor-pointer ${
                        isActive
                          ? "bg-brand text-white border-brand scale-[1.01]"
                          : "bg-white text-ink hover:bg-surface hover:border-ink/20"
                      }`}
                    >
                      {isNew && (
                        <span
                          className={`absolute -top-2 -right-2 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider shadow-sm ${
                            isActive ? "bg-white text-brand" : "bg-brand text-white"
                          }`}
                        >
                          Nouveau
                        </span>
                      )}
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{guild.emoji}</span>
                        <div className="font-display font-black text-sm truncate">{child.name}</div>
                      </div>
                      <div
                        className={`text-[11px] font-bold ${isActive ? "text-white/80" : "text-ink/60"}`}
                      >
                        {child.age} ans · {guild.name}
                      </div>
                      <div
                        className={`text-[11px] mt-1 font-semibold flex items-center justify-between ${isActive ? "text-white/90" : "text-brand"}`}
                      >
                        <span>
                          {completed} / {child.challenges.length} défis
                        </span>
                        {completed > 0 && (
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${isActive ? "bg-white/20 text-white" : "bg-brand/10 text-brand"}`}
                          >
                            Active
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Main — profil de l'enfant sélectionné */}
            {selected &&
              (() => {
                const guild = getChildGuild(selected.talents);
                const completed = selected.challenges.filter((c) => c.status === "completed");
                const inProgress = selected.challenges.filter((c) => c.status === "in_progress");
                const todo = selected.challenges.filter((c) => c.status === "todo");

                return (
                  <div className="min-w-0 md:col-span-2 space-y-6">
                    {/* Guild Banner */}
                    <div
                      className={`rounded-3xl border border-ink/10 p-5 shadow-xl flex items-center gap-4 ${guild.bgColor}`}
                    >
                      <div className="text-5xl">{guild.emoji}</div>
                      <div>
                        <p
                          className={`text-[11px] font-extrabold uppercase tracking-widest mb-0.5 ${guild.color} opacity-70`}
                        >
                          Guilde
                        </p>
                        <h2
                          className={`font-display text-balance text-2xl font-black ${guild.color}`}
                        >
                          {selected.name} — {guild.name}
                        </h2>
                        <p className={`text-sm font-medium italic mt-1 ${guild.color} opacity-80`}>
                          « {guild.tagline} »
                        </p>
                      </div>
                    </div>

                    {/* Contact parent */}
                    <div className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm flex items-center gap-3">
                      <div className="grid size-9 shrink-0 place-items-center rounded-full bg-brand/10 text-brand">
                        <Phone className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-extrabold uppercase tracking-widest text-ink/40">
                          Contacter le parent
                        </p>
                        {selected.parentPhone ? (
                          <a
                            href={`tel:${selected.parentPhone}`}
                            className="text-sm font-bold text-ink hover:text-brand"
                          >
                            {selected.parentPhone}
                          </a>
                        ) : (
                          <p className="text-sm font-semibold text-ink/50 italic">Non renseigné</p>
                        )}
                      </div>
                    </div>

                    {/* Séances (2026-08-15) : déclarer une séance réalisée + planifier un
                        créneau à venir (le créneau lié alimente la ponctualité du score). */}
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => {
                          setDeclaringFor(selected.id);
                          setSessionDate(new Date().toISOString().slice(0, 10));
                          setSessionTime("");
                          setSessionNotes("");
                          setDeclaredSlotId("");
                        }}
                        className="flex items-center justify-center gap-2 rounded-2xl bg-ink py-3 text-xs font-bold text-white hover:bg-ink/90 transition-colors cursor-pointer"
                      >
                        <CalendarCheck className="size-4" />
                        Déclarer une séance
                      </button>
                      <button
                        onClick={() => {
                          setPlanningFor(selected.id);
                          setPlanDate(new Date().toISOString().slice(0, 10));
                          setPlanTime("10:00");
                          setPlanNotes("");
                        }}
                        className="flex items-center justify-center gap-2 rounded-2xl border-2 border-ink/15 bg-white py-3 text-xs font-bold text-ink hover:border-brand/40 hover:text-brand transition-colors cursor-pointer"
                      >
                        <Clock className="size-4" />
                        Planifier une séance
                      </button>
                    </div>

                    {/* Créneaux planifiés à venir de cet enfant (avec annulation) */}
                    {(() => {
                      const childSlots = plannedSlots
                        .filter((s) => s.child_profile_id === selected.id)
                        .sort(
                          (a, b) =>
                            new Date(a.planned_at).getTime() - new Date(b.planned_at).getTime(),
                        )
                        .slice(0, 5);
                      if (childSlots.length === 0) return null;
                      return (
                        <div className="rounded-2xl border border-ink/10 bg-surface/60 p-4 space-y-2">
                          <p className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-ink/50">
                            <Clock className="size-3.5 text-brand" />
                            Créneaux planifiés
                          </p>
                          <ul className="space-y-1.5">
                            {childSlots.map((slot) => (
                              <li
                                key={slot.id}
                                className="flex items-center justify-between gap-2 rounded-xl border border-ink/10 bg-white px-3 py-2"
                              >
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-ink">
                                    {new Date(slot.planned_at).toLocaleDateString("fr-FR", {
                                      weekday: "short",
                                      day: "numeric",
                                      month: "long",
                                    })}{" "}
                                    ·{" "}
                                    {new Date(slot.planned_at).toLocaleTimeString("fr-FR", {
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })}
                                  </p>
                                  {slot.notes && (
                                    <p className="text-[11px] text-ink/50 truncate">
                                      {slot.notes}
                                    </p>
                                  )}
                                </div>
                                <button
                                  onClick={() => void handleCancelSlot(slot.id)}
                                  title="Annuler ce créneau"
                                  className="shrink-0 rounded-lg border border-ink/10 px-2 py-1 text-[10px] font-bold text-ink/50 hover:bg-rose-50 hover:text-rose-600 transition-all cursor-pointer"
                                >
                                  Annuler
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })()}

                    {/* Mentor Copilote (décision #74) : onglet Défis (opérateur) | Bilan */}
                    <div className="flex rounded-2xl border border-ink/10 bg-white p-1 shadow-sm">
                      {(["defis", "bilan"] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setPanelTab(tab)}
                          className={`flex-1 rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
                            panelTab === tab
                              ? "bg-ink text-white shadow-sm"
                              : "text-ink/50 hover:text-ink"
                          }`}
                        >
                          {tab === "defis" ? "⚙️ Défis" : "📄 Bilan de fin"}
                        </button>
                      ))}
                    </div>

                    {panelTab === "defis" && (
                      <>
                        {/* Stats rapides */}
                        <div className="grid grid-cols-3 gap-4">
                          {[
                            {
                              label: "À faire",
                              count: todo.length,
                              icon: ClipboardList,
                              color: "bg-surface",
                              iconColor: "text-ink/60",
                            },
                            {
                              label: "En cours",
                              count: inProgress.length,
                              icon: Zap,
                              color: "bg-brand/10",
                              iconColor: "text-brand",
                            },
                            {
                              label: "Complétés",
                              count: completed.length,
                              icon: CheckCircle2,
                              color: "bg-emerald-50",
                              iconColor: "text-emerald-600",
                            },
                          ].map((stat) => {
                            const Icon = stat.icon;
                            return (
                              <div
                                key={stat.label}
                                className={`rounded-2xl border border-ink/10 p-4 text-center shadow-sm ${stat.color} flex flex-col items-center justify-center`}
                              >
                                <Icon className={`size-6 mb-1.5 ${stat.iconColor}`} />
                                <div className="font-display text-balance text-2xl font-black">
                                  {stat.count}
                                </div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-ink/60 mt-1">
                                  {stat.label}
                                </p>
                              </div>
                            );
                          })}
                        </div>

                        {/* Timeline des défis */}
                        <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-xl">
                          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                            <h3 className="font-display text-balance text-lg font-black flex items-center gap-2">
                              <Trophy className="size-5 text-brand" />
                              Défis de {selected.name}
                            </h3>
                            {/* Opérateur (enfant accompagné) : le mentor génère les défis
                            comme le parent — user_id reste le parent, attribution tracée. */}
                            {selected.accompaniment !== "none" && (
                              <button
                                onClick={handleGenerate}
                                disabled={generatingFor}
                                className="inline-flex items-center gap-2 rounded-xl bg-brand px-3.5 py-2 text-xs font-black text-white shadow-sm hover:-translate-y-0.5 transition-all disabled:opacity-50 cursor-pointer"
                              >
                                {generatingFor ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <Sparkles className="size-4" />
                                )}
                                Générer 4 défis
                              </button>
                            )}
                          </div>
                          {selected.challenges.length === 0 ? (
                            <p className="text-sm text-ink/60 italic">
                              Aucun défi assigné pour le moment.
                            </p>
                          ) : (
                            <ul className="space-y-3">
                              {selected.challenges.map((c) => (
                                <li key={c.id}>
                                  <button
                                    onClick={() => {
                                      setSelectedChallenge(c);
                                      setNoteDraft("");
                                    }}
                                    className="w-full flex items-center justify-between rounded-2xl border border-ink/10 bg-surface px-4 py-3 hover:bg-stone-50 transition-all text-left cursor-pointer"
                                  >
                                    <div>
                                      <p className="text-sm font-bold text-ink hover:text-brand transition-colors">
                                        {c.title}
                                      </p>
                                      <p className="text-xs text-ink/60">{c.domain}</p>
                                    </div>
                                    <span
                                      className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest border border-ink/10 ${
                                        c.status === "completed"
                                          ? "bg-emerald-100 text-emerald-800"
                                          : c.status === "in_progress"
                                            ? "bg-brand/10 text-brand"
                                            : c.status === "not_completed"
                                              ? "bg-rose-100 text-rose-800"
                                              : "bg-surface text-ink/60"
                                      }`}
                                    >
                                      {c.status === "completed"
                                        ? "✅ Complété"
                                        : c.status === "in_progress"
                                          ? "⚡ En cours"
                                          : c.status === "not_completed"
                                            ? "❌ Non réussi"
                                            : "📋 À faire"}
                                    </span>
                                  </button>
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      </>
                    )}

                    {/* ── Bilan de fin (décision #74) — le « bilan inclus » du pack ── */}
                    {panelTab === "bilan" && (
                      <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-xl space-y-5">
                        <div className="flex items-center justify-between gap-3 border-b-2 border-ink pb-4">
                          <div>
                            <h3 className="font-display text-balance text-lg font-black flex items-center gap-2">
                              <FileText className="size-5 text-brand" />
                              Bilan de fin — {selected.name}
                            </h3>
                            <p className="text-xs text-ink/60 mt-0.5">
                              Le « bilan inclus » du pack : le parent le valide, il devient le
                              livrable officiel de la période.
                            </p>
                          </div>
                          {reportDraft && (
                            <span
                              className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest border border-ink/10 ${
                                reportDraft.status === "validated"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : reportDraft.status === "submitted"
                                    ? "bg-amber-100 text-amber-800"
                                    : reportDraft.status === "rejected"
                                      ? "bg-rose-100 text-rose-800"
                                      : "bg-surface text-ink/60"
                              }`}
                            >
                              {reportDraft.status === "validated"
                                ? "✅ Validé par le parent"
                                : reportDraft.status === "submitted"
                                  ? "⏳ En attente du parent"
                                  : reportDraft.status === "rejected"
                                    ? "❌ Modifications demandées"
                                    : "📝 Brouillon"}
                            </span>
                          )}
                        </div>

                        {reportDraft?.status === "rejected" && reportDraft.parent_feedback && (
                          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
                            <p className="text-xs font-black uppercase tracking-wider mb-1 text-rose-800">
                              Message du parent
                            </p>
                            {reportDraft.parent_feedback}
                          </div>
                        )}

                        {reportDraft?.status === "submitted" ? (
                          <div className="rounded-2xl border border-ink/10 bg-amber-50 p-5 text-center">
                            <p className="font-display text-base font-black text-amber-900">
                              Bilan envoyé au parent
                            </p>
                            <p className="text-sm text-amber-800/80 mt-1">
                              En attente de validation. Le parent peut demander des modifications —
                              vous serez notifié.
                            </p>
                          </div>
                        ) : (
                          <>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-xs font-black uppercase tracking-widest text-ink/60 mb-2 block">
                                  Période — début
                                </label>
                                <input
                                  type="date"
                                  value={reportForm.periodStart}
                                  onChange={(e) =>
                                    setReportForm((f) => ({ ...f, periodStart: e.target.value }))
                                  }
                                  className="w-full rounded-xl border border-ink/10 bg-surface px-4 py-2.5 text-sm font-bold text-ink outline-none focus:ring-2 focus:ring-brand"
                                />
                              </div>
                              <div>
                                <label className="text-xs font-black uppercase tracking-widest text-ink/60 mb-2 block">
                                  Période — fin
                                </label>
                                <input
                                  type="date"
                                  value={reportForm.periodEnd}
                                  onChange={(e) =>
                                    setReportForm((f) => ({ ...f, periodEnd: e.target.value }))
                                  }
                                  className="w-full rounded-xl border border-ink/10 bg-surface px-4 py-2.5 text-sm font-bold text-ink outline-none focus:ring-2 focus:ring-brand"
                                />
                              </div>
                            </div>

                            {(
                              [
                                [
                                  "realisations",
                                  "Réalisations de la période",
                                  "Les défis complétés, les projets menés, ce que l'enfant a accompli…",
                                ],
                                [
                                  "competencesObservees",
                                  "Compétences observées",
                                  "Ce que vous avez vu se développer chez l'enfant (persévérance, curiosité, méthode…)",
                                ],
                                [
                                  "recommandations",
                                  "Recommandations",
                                  "Les pistes pour la suite — domaines à explorer, rythme, points d'attention…",
                                ],
                              ] as const
                            ).map(([key, label, placeholder]) => (
                              <div key={key}>
                                <label className="text-xs font-black uppercase tracking-widest text-ink/60 mb-2 block">
                                  {label}
                                </label>
                                <textarea
                                  value={reportForm[key]}
                                  onChange={(e) =>
                                    setReportForm((f) => ({ ...f, [key]: e.target.value }))
                                  }
                                  rows={4}
                                  maxLength={5000}
                                  placeholder={placeholder}
                                  className="w-full rounded-xl border border-ink/10 bg-surface px-4 py-3 text-sm font-medium text-ink outline-none focus:ring-2 focus:ring-brand"
                                />
                              </div>
                            ))}

                            <div className="border-t-2 border-ink pt-4 flex flex-wrap justify-end gap-2">
                              <button
                                onClick={handleSaveReport}
                                disabled={savingReport}
                                className="inline-flex items-center gap-2 rounded-2xl border border-ink/10 px-5 py-2.5 text-xs font-bold text-ink hover:bg-stone-100 transition-all disabled:opacity-50 cursor-pointer"
                              >
                                {savingReport && <Loader2 className="size-4 animate-spin" />}
                                Enregistrer le brouillon
                              </button>
                              <button
                                onClick={handleSubmitReport}
                                disabled={savingReport || submittingReport}
                                className="inline-flex items-center gap-2 rounded-2xl bg-ink px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:-translate-y-0.5 transition-all disabled:opacity-50 cursor-pointer"
                              >
                                {submittingReport ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  <Send className="size-4" />
                                )}
                                Soumettre au parent
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })()}
          </div>
        )}
          </>
        )}
      </main>
      {/* Challenge Detail Modal */}
      {selectedChallenge && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl max-h-[85vh] overflow-y-auto bg-white rounded-3xl border border-ink/10 p-6 md:p-8 shadow-xl animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b-2 border-ink pb-4 mb-6">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="rounded-full border border-ink/10 bg-brand px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-white">
                    {selectedChallenge.domain}
                  </span>
                  <span
                    className={`rounded-full border border-ink/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest ${
                      selectedChallenge.status === "completed"
                        ? "bg-emerald-100 text-emerald-800"
                        : selectedChallenge.status === "in_progress"
                          ? "bg-brand/10 text-brand"
                          : selectedChallenge.status === "not_completed"
                            ? "bg-rose-100 text-rose-800"
                            : "bg-stone-100 text-stone-700"
                    }`}
                  >
                    {selectedChallenge.status === "completed"
                      ? "✅ Complété"
                      : selectedChallenge.status === "in_progress"
                        ? "⚡ En cours"
                        : selectedChallenge.status === "not_completed"
                          ? "❌ Non réussi"
                          : "📋 À faire"}
                  </span>
                  {selectedChallenge.difficulty && (
                    <span className="rounded-full border border-ink/10 bg-orange-100 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-orange-800">
                      🔥 {selectedChallenge.difficulty}
                    </span>
                  )}
                  {selectedChallenge.duration && (
                    <span className="rounded-full border border-ink/10 bg-sky px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-ink flex items-center gap-1">
                      <Clock className="size-3" />
                      {selectedChallenge.duration}
                    </span>
                  )}
                </div>
                <h3 className="font-display text-balance text-xl font-black text-ink">
                  {selectedChallenge.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedChallenge(null)}
                className="rounded-xl border border-ink/10 p-1.5 hover:bg-stone-100 transition-all cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-6">
              {/* Supervision warning */}
              {selectedChallenge.requires_supervision && (
                <div className="rounded-2xl border border-ink/10 bg-amber-50 p-4 flex gap-3 text-amber-900">
                  <AlertTriangle className="size-6 text-amber-600 shrink-0" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider mb-0.5 text-amber-800">
                      Attention - Supervision requise
                    </p>
                    <p className="text-sm font-medium leading-relaxed">
                      {selectedChallenge.supervision_warning ||
                        "La présence d'un adulte est nécessaire pour cette activité."}
                    </p>
                  </div>
                </div>
              )}

              {/* Description */}
              <div>
                <h4 className="text-xs font-black uppercase tracking-widest text-ink/60 mb-2">
                  Description du défi
                </h4>
                <div className="text-sm text-ink/80 leading-relaxed font-medium">
                  <MarkdownContent content={selectedChallenge.description} />
                </div>
              </div>

              {/* Pedagogical context */}
              {formatPedagogicalIntention(selectedChallenge.pedagogical_context) && (
                <div className="rounded-2xl border border-ink/10 bg-stone-50 p-4">
                  <p className="text-xs font-black uppercase tracking-wider text-ink/60 mb-1">
                    Objectif Pédagogique (Naya)
                  </p>
                  <p className="text-xs text-ink/70 leading-relaxed font-medium">
                    {formatPedagogicalIntention(selectedChallenge.pedagogical_context)}
                  </p>
                </div>
              )}

              {/* Materials */}
              {selectedChallenge.materials &&
                Array.isArray(selectedChallenge.materials) &&
                selectedChallenge.materials.length > 0 && (
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-ink/60 mb-2">
                      Matériel nécessaire
                    </h4>
                    <ul className="grid gap-2 ">
                      {selectedChallenge.materials.map((m: string, i: number) => (
                        <li key={i} className="flex items-center gap-2 text-sm font-bold text-ink">
                          <span className="size-2 rounded-full bg-brand shrink-0"></span>
                          <span>{m}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {/* Steps */}
              {selectedChallenge.steps &&
                Array.isArray(selectedChallenge.steps) &&
                selectedChallenge.steps.length > 0 && (
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-widest text-ink/60 mb-3">
                      Étapes de réalisation
                    </h4>
                    <ol className="space-y-3">
                      {selectedChallenge.steps.map((s: string, i: number) => (
                        <li key={i} className="flex gap-3 text-sm">
                          <span className="grid size-6 place-items-center rounded-lg border border-ink/10 bg-white font-mono text-xs font-bold text-ink shrink-0">
                            {i + 1}
                          </span>
                          <span className="leading-relaxed font-semibold text-ink/80">{s}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

              {/* Proof / Observations if completed */}
              {selectedChallenge.status === "completed" && (
                <div className="border-t-2 border-ink pt-6 space-y-6">
                  <h4 className="font-display text-balance text-base font-extrabold text-ink">
                    Retour sur la réalisation
                  </h4>

                  {/* Proof Image */}
                  {selectedChallenge.proof_image_url && (
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-ink/60 mb-2">
                        Preuve de réalisation
                      </p>
                      <div className="rounded-2xl overflow-hidden border border-ink/10 bg-surface max-w-md">
                        <ProofImage
                          stored={selectedChallenge.proof_image_url}
                          alt="Preuve"
                          className="w-full max-h-64 object-contain"
                        />
                      </div>
                    </div>
                  )}

                  {/* AI Analysis */}
                  {selectedChallenge.ai_observations && (
                    <div className="rounded-2xl border border-ink/10 bg-leaf/10 p-4">
                      <p className="mb-2 text-xs font-extrabold uppercase tracking-widest text-emerald-800 flex items-center gap-1.5">
                        <Brain className="size-4 text-emerald-700" />
                        Observations pédagogiques de Naya
                      </p>
                      <p className="text-sm text-ink/80 leading-relaxed italic font-medium">
                        "{selectedChallenge.ai_observations}"
                      </p>
                    </div>
                  )}

                  {/* Parent notes */}
                  {selectedChallenge.notes && (
                    <div className="rounded-2xl border border-ink/10 bg-sky/10 p-4">
                      <p className="mb-2 text-xs font-extrabold uppercase tracking-widest text-sky-800">
                        Notes du parent
                      </p>
                      <p className="text-sm text-ink/80 leading-relaxed font-medium">
                        {selectedChallenge.notes}
                      </p>
                    </div>
                  )}
                </div>
              )}
              {/* Notes de séance du mentor (journal) */}
              {selected?.accompaniment !== "none" &&
                selectedChallenge &&
                (() => {
                  const notes = (selected?.mentorActions ?? []).filter(
                    (a) => a.action === "notes" && a.challenge_id === selectedChallenge.id,
                  );
                  if (notes.length === 0) return null;
                  return (
                    <div className="rounded-2xl border border-ink/10 bg-brand/5 p-4">
                      <p className="mb-2 text-xs font-extrabold uppercase tracking-widest text-brand">
                        Notes de séance (mentor)
                      </p>
                      <ul className="space-y-2">
                        {notes.slice(0, 3).map((n) => (
                          <li key={n.id} className="text-sm text-ink/80 font-medium">
                            <span className="text-[10px] font-bold text-ink/40 mr-2">
                              {new Date(n.created_at).toLocaleDateString("fr-FR")}
                            </span>
                            {(n.payload as any)?.note}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })()}
            </div>

            {/* ── Actions opérateur (décision #74) — enfant accompagné ── */}
            {selected?.accompaniment !== "none" && selectedChallenge.status !== "completed" && (
              <div className="mt-6 rounded-2xl border-2 border-brand/20 bg-brand/5 p-4 space-y-3">
                <p className="text-xs font-black uppercase tracking-widest text-brand flex items-center gap-1.5">
                  <Zap className="size-4" />
                  Actions opérateur — {selected?.name ?? "enfant"}
                </p>

                <div className="flex flex-wrap gap-2">
                  {(selectedChallenge.status === "todo" ||
                    selectedChallenge.status === "not_completed") && (
                    <button
                      onClick={() => handleStart(selectedChallenge)}
                      className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-xs font-black text-white shadow-sm hover:-translate-y-0.5 transition-all cursor-pointer"
                    >
                      <Play className="size-4" />
                      {selectedChallenge.status === "not_completed"
                        ? "Reprendre le défi"
                        : "Commencer"}
                    </button>
                  )}

                  {selectedChallenge.status === "in_progress" && (
                    <>
                      <div className="flex items-center gap-2 rounded-xl border border-ink/10 bg-white px-3 py-1.5">
                        <button
                          onClick={() =>
                            handleProgress(
                              selectedChallenge,
                              Math.max(
                                0,
                                Math.min(100, ((selectedChallenge as any).progress ?? 50) - 10),
                              ),
                            )
                          }
                          className="grid size-7 place-items-center rounded-lg bg-surface font-black text-ink hover:bg-stone-200 cursor-pointer"
                        >
                          −
                        </button>
                        <span className="text-xs font-black text-ink w-10 text-center">
                          {(selectedChallenge as any).progress ?? 0}%
                        </span>
                        <button
                          onClick={() =>
                            handleProgress(
                              selectedChallenge,
                              Math.max(
                                0,
                                Math.min(100, ((selectedChallenge as any).progress ?? 50) + 10),
                              ),
                            )
                          }
                          className="grid size-7 place-items-center rounded-lg bg-surface font-black text-ink hover:bg-stone-200 cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                      <button
                        onClick={() => setProofFor(selectedChallenge)}
                        className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white shadow-sm hover:-translate-y-0.5 transition-all cursor-pointer"
                      >
                        <Camera className="size-4" />
                        {selectedChallenge.proof_mode === "declarative"
                          ? "Valider par déclaration"
                          : "Soumettre la preuve (photo)"}
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => {
                      setNotCompletedFor(selectedChallenge);
                      setNotCompletedReason("");
                      setNotCompletedChip(undefined);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-xs font-black text-rose-700 hover:bg-rose-100 transition-all cursor-pointer"
                  >
                    <X className="size-4" />
                    Marquer non réussi
                  </button>
                </div>

                {/* Note de séance (→ journal, jamais challenges.notes) */}
                <div className="flex gap-2">
                  <input
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && noteDraft.trim()) {
                        handleNote(selectedChallenge, noteDraft.trim());
                        setNoteDraft("");
                      }
                    }}
                    placeholder="Note de séance (appuyez sur Entrée pour enregistrer)…"
                    maxLength={2000}
                    className="flex-1 rounded-xl border border-ink/10 bg-white px-4 py-2 text-sm font-medium text-ink outline-none focus:ring-2 focus:ring-brand"
                  />
                  <button
                    onClick={() => {
                      if (noteDraft.trim()) {
                        handleNote(selectedChallenge, noteDraft.trim());
                        setNoteDraft("");
                      }
                    }}
                    className="rounded-xl bg-ink px-3.5 py-2 text-xs font-black text-white hover:bg-ink/90 transition-all cursor-pointer"
                  >
                    Enregistrer
                  </button>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="border-t-2 border-ink pt-4 mt-6 flex justify-end">
              <button
                onClick={() => setSelectedChallenge(null)}
                className="rounded-2xl border border-ink/10 bg-ink px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:-translate-y-0.5 transition-all cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal — Planifier une séance (2026-08-15) : créneau date + heure, le parent
          est notifié ; la ponctualité se mesure à la déclaration si la séance est liée. */}
      {planningFor &&
        (() => {
          const child = children.find((c) => c.id === planningFor);
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm">
              <div className="w-full max-w-md max-h-[85vh] overflow-y-auto bg-white rounded-3xl border border-ink/10 p-6 md:p-8 shadow-xl animate-in zoom-in-95 duration-200">
                <div className="flex items-start justify-between gap-4 border-b-2 border-ink pb-4 mb-6">
                  <div>
                    <h3 className="font-display text-balance text-xl font-black text-ink">
                      Planifier une séance
                    </h3>
                    <p className="text-sm text-ink/60 mt-0.5">
                      {child?.name ?? "Cet enfant"} — le parent sera notifié du créneau prévu.
                    </p>
                  </div>
                  <button
                    onClick={() => setPlanningFor(null)}
                    className="rounded-xl border border-ink/10 p-1.5 hover:bg-stone-100 transition-all cursor-pointer"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                <form onSubmit={handlePlanSession} className="space-y-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-black uppercase tracking-widest text-ink/60 mb-2 block">
                        Date
                      </label>
                      <input
                        type="date"
                        required
                        value={planDate}
                        onChange={(e) => setPlanDate(e.target.value)}
                        className="w-full rounded-xl border border-ink/10 bg-surface px-4 py-3 text-sm font-bold text-ink outline-none focus:ring-2 focus:ring-brand"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-black uppercase tracking-widest text-ink/60 mb-2 block">
                        Heure
                      </label>
                      <input
                        type="time"
                        required
                        value={planTime}
                        onChange={(e) => setPlanTime(e.target.value)}
                        className="w-full rounded-xl border border-ink/10 bg-surface px-4 py-3 text-sm font-bold text-ink outline-none focus:ring-2 focus:ring-brand"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase tracking-widest text-ink/60 mb-2 block">
                      Note pour le parent{" "}
                      <span className="normal-case font-bold text-ink/40">(optionnel)</span>
                    </label>
                    <textarea
                      value={planNotes}
                      onChange={(e) => setPlanNotes(e.target.value)}
                      rows={3}
                      maxLength={2000}
                      placeholder="Ex. : séance d'exploration au parc, matériel à prévoir…"
                      className="w-full rounded-xl border border-ink/10 bg-surface px-4 py-3 text-sm font-medium text-ink outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>

                  <div className="border-t-2 border-ink pt-4 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setPlanningFor(null)}
                      className="rounded-2xl border border-ink/10 px-6 py-2.5 text-xs font-bold text-ink/60 hover:bg-stone-100 transition-all cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={planning}
                      className="inline-flex items-center gap-2 rounded-2xl bg-ink px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:-translate-y-0.5 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {planning ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Clock className="size-4" />
                      )}
                      Planifier le créneau
                    </button>
                  </div>
                </form>
              </div>
            </div>
          );
        })()}

      {/* Modal — Déclarer une séance (V1) */}
      {declaringFor &&
        (() => {
          const child = children.find((c) => c.id === declaringFor);
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm">
              <div className="w-full max-w-md max-h-[85vh] overflow-y-auto bg-white rounded-3xl border border-ink/10 p-6 md:p-8 shadow-xl animate-in zoom-in-95 duration-200">
                <div className="flex items-start justify-between gap-4 border-b-2 border-ink pb-4 mb-6">
                  <div>
                    <h3 className="font-display text-balance text-xl font-black text-ink">
                      Déclarer une séance
                    </h3>
                    <p className="text-sm text-ink/60 mt-0.5">
                      {child?.name ?? "Cet enfant"} — la séance alimente votre score de fiabilité.
                    </p>
                  </div>
                  <button
                    onClick={() => setDeclaringFor(null)}
                    className="rounded-xl border border-ink/10 p-1.5 hover:bg-stone-100 transition-all cursor-pointer"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                <form onSubmit={handleDeclareSession} className="space-y-5">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-black uppercase tracking-widest text-ink/60 mb-2 block">
                        Date de la séance
                      </label>
                      <input
                        type="date"
                        required
                        max={new Date().toISOString().slice(0, 10)}
                        value={sessionDate}
                        onChange={(e) => setSessionDate(e.target.value)}
                        className="w-full rounded-xl border border-ink/10 bg-surface px-4 py-3 text-sm font-bold text-ink outline-none focus:ring-2 focus:ring-brand"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-black uppercase tracking-widest text-ink/60 mb-2 block">
                        Heure de début
                      </label>
                      <input
                        type="time"
                        required
                        value={sessionTime}
                        onChange={(e) => setSessionTime(e.target.value)}
                        className="w-full rounded-xl border border-ink/10 bg-surface px-4 py-3 text-sm font-bold text-ink outline-none focus:ring-2 focus:ring-brand"
                      />
                    </div>
                  </div>
                  <p className="-mt-3 text-[11px] text-ink/50">
                    L'heure réelle de début est comparée à l'heure planifiée du créneau (±30
                    min) pour votre ponctualité — c'est elle qui alimente votre score.
                  </p>

                  {(() => {
                    // Créneaux LIABLES : même enfant, date déjà passée ou aujourd'hui (on ne
                    // peut lier que des séances réalisées, pas des créneaux à venir).
                    const todayIso = new Date().toISOString().slice(0, 10);
                    const childSlots = plannedSlots.filter(
                      (s) =>
                        s.child_profile_id === declaringFor &&
                        s.planned_at.slice(0, 10) <= todayIso,
                    );
                    if (childSlots.length === 0) return null;
                    return (
                      <div>
                        <label className="text-xs font-black uppercase tracking-widest text-ink/60 mb-2 block">
                          Créneau planifié{" "}
                          <span className="normal-case font-bold text-ink/40">(optionnel)</span>
                        </label>
                        <select
                          value={declaredSlotId}
                          onChange={(e) => {
                            const slotId = e.target.value;
                            setDeclaredSlotId(slotId);
                            const slot = childSlots.find((s) => s.id === slotId);
                            if (slot) {
                              // Pré-remplit date + heure réelles avec le créneau prévu :
                              // le mentor à l'heure n'a qu'à valider ; en retard, il ajuste.
                              const d = new Date(slot.planned_at);
                              setSessionDate(d.toLocaleDateString("fr-CA"));
                              setSessionTime(
                                d.toLocaleTimeString("fr-FR", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                }),
                              );
                            }
                          }}
                          className="w-full rounded-xl border border-ink/10 bg-surface px-4 py-3 text-sm font-bold text-ink outline-none focus:ring-2 focus:ring-brand cursor-pointer"
                        >
                          <option value="">Aucun — séance non planifiée</option>
                          {childSlots.map((slot) => (
                            <option key={slot.id} value={slot.id}>
                              {new Date(slot.planned_at).toLocaleString("fr-FR", {
                                day: "numeric",
                                month: "long",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </option>
                          ))}
                        </select>
                        <p className="mt-1.5 text-[11px] text-ink/50">
                          Liez la séance à son créneau planifié : la date et l'heure réelles
                          sont pré-remplies — ajustez l'heure si vous avez commencé plus tard.
                        </p>
                      </div>
                    );
                  })()}

                  <div>
                    <label className="text-xs font-black uppercase tracking-widest text-ink/60 mb-2 block">
                      Compte-rendu de la séance{" "}
                      <span className="normal-case font-bold text-ink/40">(optionnel)</span>
                    </label>
                    <textarea
                      value={sessionNotes}
                      onChange={(e) => setSessionNotes(e.target.value)}
                      rows={4}
                      maxLength={2000}
                      placeholder="Ce qui a été fait, ce que vous avez observé chez l'enfant…"
                      className="w-full rounded-xl border border-ink/10 bg-surface px-4 py-3 text-sm font-medium text-ink outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>

                  <div className="border-t-2 border-ink pt-4 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setDeclaringFor(null)}
                      className="rounded-2xl border border-ink/10 px-6 py-2.5 text-xs font-bold text-ink/60 hover:bg-stone-100 transition-all cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={declaring}
                      className="inline-flex items-center gap-2 rounded-2xl bg-ink px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:-translate-y-0.5 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {declaring ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <CalendarCheck className="size-4" />
                      )}
                      Valider la séance
                    </button>
                  </div>
                </form>
              </div>
            </div>
          );
        })()}

      {/* Modal — Marquer non réussi (opérateur, motif obligatoire) */}
      {notCompletedFor &&
        (() => {
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm">
              <div className="w-full max-w-md max-h-[85vh] overflow-y-auto bg-white rounded-3xl border border-ink/10 p-6 md:p-8 shadow-xl animate-in zoom-in-95 duration-200">
                <div className="flex items-start justify-between gap-4 border-b-2 border-ink pb-4 mb-6">
                  <div>
                    <h3 className="font-display text-balance text-xl font-black text-ink">
                      Marquer comme non réussi
                    </h3>
                    <p className="text-sm text-ink/60 mt-0.5">
                      « {notCompletedFor.title} » — le parent sera informé, aucun point n'est
                      attribué.
                    </p>
                  </div>
                  <button
                    onClick={() => setNotCompletedFor(null)}
                    className="rounded-xl border border-ink/10 p-1.5 hover:bg-stone-100 transition-all cursor-pointer"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                <form onSubmit={handleNotCompleted} className="space-y-5">
                  <div>
                    <label className="text-xs font-black uppercase tracking-widest text-ink/60 mb-2 block">
                      Motif <span className="normal-case text-ink/40">(obligatoire)</span>
                    </label>
                    <textarea
                      value={notCompletedReason}
                      onChange={(e) => setNotCompletedReason(e.target.value)}
                      rows={3}
                      required
                      maxLength={2000}
                      placeholder="Pourquoi ce défi n'a pas pu être réalisé ?"
                      className="w-full rounded-xl border border-ink/10 bg-surface px-4 py-3 text-sm font-medium text-ink outline-none focus:ring-2 focus:ring-brand"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black uppercase tracking-widest text-ink/60 mb-2 block">
                      Raison rapide <span className="normal-case text-ink/40">(optionnel)</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {NOT_COMPLETED_CHIPS.map((chip) => (
                        <button
                          key={chip}
                          type="button"
                          onClick={() => setNotCompletedChip(chip)}
                          className={`rounded-full px-3 py-1.5 text-xs font-bold border transition-all cursor-pointer ${
                            notCompletedChip === chip
                              ? "border-brand bg-brand text-white"
                              : "border-ink/10 bg-surface text-ink/70 hover:border-ink/30"
                          }`}
                        >
                          {chip.replace(/_/g, " ")}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="border-t-2 border-ink pt-4 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setNotCompletedFor(null)}
                      className="rounded-2xl border border-ink/10 px-6 py-2.5 text-xs font-bold text-ink/60 hover:bg-stone-100 transition-all cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={submittingNotCompleted}
                      className="inline-flex items-center gap-2 rounded-2xl bg-rose-600 px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:-translate-y-0.5 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {submittingNotCompleted ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <X className="size-4" />
                      )}
                      Confirmer
                    </button>
                  </div>
                </form>
              </div>
            </div>
          );
        })()}

      {/* Modal — Soumettre une preuve (photo prise en séance ou déclarative) */}
      {proofFor &&
        (() => {
          const isDeclarative = proofFor.proof_mode === "declarative";
          const target = proofFor.proof_target as { metric?: string; value?: number } | null;
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-4 backdrop-blur-sm">
              <div className="w-full max-w-md max-h-[85vh] overflow-y-auto bg-white rounded-3xl border border-ink/10 p-6 md:p-8 shadow-xl animate-in zoom-in-95 duration-200">
                <div className="flex items-start justify-between gap-4 border-b-2 border-ink pb-4 mb-6">
                  <div>
                    <h3 className="font-display text-balance text-xl font-black text-ink">
                      {isDeclarative ? "Valider par déclaration" : "Soumettre la preuve"}
                    </h3>
                    <p className="text-sm text-ink/60 mt-0.5">
                      « {proofFor.title} » — vous êtes l'adulte présent en séance.
                    </p>
                  </div>
                  <button
                    onClick={() => setProofFor(null)}
                    className="rounded-xl border border-ink/10 p-1.5 hover:bg-stone-100 transition-all cursor-pointer"
                  >
                    <X className="size-5" />
                  </button>
                </div>

                <form onSubmit={handleProofSubmit} className="space-y-5">
                  {isDeclarative ? (
                    <div>
                      <label className="text-xs font-black uppercase tracking-widest text-ink/60 mb-2 block">
                        Résultat de l'enfant{" "}
                        {target?.metric ? (
                          <span className="normal-case text-ink/40">
                            (objectif : {target.value} {target.metric})
                          </span>
                        ) : null}
                      </label>
                      <input
                        type="number"
                        required
                        min={0}
                        value={declarativeValue}
                        onChange={(e) => setDeclarativeValue(e.target.value)}
                        placeholder={target?.value != null ? String(target.value) : "0"}
                        className="w-full rounded-xl border border-ink/10 bg-surface px-4 py-3 text-sm font-bold text-ink outline-none focus:ring-2 focus:ring-brand"
                      />
                      <p className="text-[11px] text-ink/50 mt-2">
                        Confiance en l'adulte présent (décision #36) — la cible est comparée
                        strictement, aucun appel IA.
                      </p>
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs font-black uppercase tracking-widest text-ink/60 mb-2 block">
                        Photo prise pendant la séance
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        required
                        capture="environment"
                        onChange={(e) => setProofPhoto(e.target.files?.[0] ?? null)}
                        className="w-full rounded-xl border border-ink/10 bg-surface px-4 py-3 text-sm font-medium text-ink outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-brand file:px-3 file:py-1.5 file:text-xs file:font-black file:text-white cursor-pointer"
                      />
                      {proofPhoto && (
                        <div className="mt-3 flex items-center gap-3">
                          <img
                            src={URL.createObjectURL(proofPhoto)}
                            alt="Preuve"
                            className="size-14 rounded-xl object-cover border border-ink/10"
                          />
                          <p className="text-[11px] text-ink/50">
                            {proofPhoto.name} — Naya vérifiera la pertinence de la photo, puis les
                            points et le Jumeau seront mis à jour comme pour une validation parent.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="border-t-2 border-ink pt-4 flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setProofFor(null)}
                      className="rounded-2xl border border-ink/10 px-6 py-2.5 text-xs font-bold text-ink/60 hover:bg-stone-100 transition-all cursor-pointer"
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      disabled={submittingProof}
                      className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-sm hover:-translate-y-0.5 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {submittingProof ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Send className="size-4" />
                      )}
                      Soumettre
                    </button>
                  </div>
                </form>
              </div>
            </div>
          );
        })()}
    </div>
  );
}

// ── Vue globale d'activité (décision #83, 2026-08-16) ─────────────────────────
// Répond au constat « le mentor n'a aucune vue sur son activité » : ce qu'il gagne,
// ce qu'il reçoit, ce qui est payé ou en attente, son taux par séance, ses séances
// effectuées et l'évolution des enfants suivis. Les agrégats viennent de
// getMentorActivityOverview (mentor-activity.functions.ts) ; le taux actuel est
// recalculé comme à la déclaration (computeMentorPayoutXof) à partir du palier et
// du bonus points déjà chargés par le dashboard.

type MentorOverviewProps = {
  overview: MentorActivityOverview | null;
  loading: boolean;
  error: boolean;
  score: number | null;
  expectedSessions: number;
  tier: "standard" | "trusted";
  pointsBonusPct: number;
  points: number;
  badge: "none" | "bronze" | "gold";
  mentorStatus: string;
  childrenCount: number;
};

function MentorOverview({
  overview,
  loading,
  error,
  score,
  expectedSessions,
  tier,
  pointsBonusPct,
  points,
  badge,
  mentorStatus,
  childrenCount,
}: MentorOverviewProps) {
  const currentRate = computeMentorPayoutXof({
    basePayoutXof: MENTOR_SESSION_PAYOUT_XOF,
    tier,
    pointsBonusPct,
  });

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-6 animate-spin text-brand" />
      </div>
    );
  }

  if (error || !overview) {
    return (
      <div className="rounded-3xl border border-dashed border-red-400 bg-red-50 p-16 text-center shadow-sm">
        <AlertTriangle className="size-16 text-red-400 mx-auto mb-4" />
        <p className="font-display text-balance text-xl font-bold mb-2 text-red-700">
          Impossible de charger votre vue d'ensemble
        </p>
        <p className="text-sm text-ink/60">
          Une erreur est survenue. Rechargez la page pour réessayer.
        </p>
      </div>
    );
  }

  const e = overview.earnings;
  const me = overview.monthEarnings;
  const confirmedTotal = e.counts.confirmed + e.counts.approved + e.counts.paid;
  const confirmedMonth = me.counts.confirmed + me.counts.approved + me.counts.paid;
  const pendingXof = e.approvedPending + e.confirmedPending;

  return (
    <div className="space-y-6">
      {childrenCount === 0 && (
        <div className="rounded-3xl border border-dashed border-ink/20 bg-white/40 p-8 text-center shadow-sm">
          <Users className="size-12 text-ink/30 mx-auto mb-3" />
          <p className="font-display text-balance text-lg font-bold mb-1">
            Aucun enfant assigné pour l'instant
          </p>
          <p className="text-sm text-ink/60">
            Vos revenus, séances et évolutions apparaîtront ici dès qu'un administrateur
            vous assigne des profils d'enfants.
          </p>
        </div>
      )}

      {/* Cartes KPI — ce que le mentor gagne, reçoit, attend, facture. */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <KpiCard
          icon={Wallet}
          iconClass="text-emerald-600"
          label="Total gagné"
          value={`${formatXofAmount(e.earned)} F`}
          sub={`${confirmedTotal} séance${confirmedTotal > 1 ? "s" : ""} confirmée${confirmedTotal > 1 ? "s" : ""}`}
        />
        <KpiCard
          icon={CircleDollarSign}
          iconClass="text-sky-600"
          label="Reçu"
          value={`${formatXofAmount(e.received)} F`}
          sub={`${e.counts.paid} séance${e.counts.paid > 1 ? "s" : ""} payée${e.counts.paid > 1 ? "s" : ""}`}
        />
        <KpiCard
          icon={Hourglass}
          iconClass="text-amber-600"
          label="En attente"
          value={`${formatXofAmount(pendingXof)} F`}
          sub={`${e.counts.approved} à payer · ${e.counts.confirmed} à approuver`}
        />
        <KpiCard
          icon={Clock}
          iconClass="text-indigo-600"
          label="Taux par séance"
          value={`${formatXofAmount(currentRate)} F`}
          sub={
            tier === "trusted"
              ? `palier confiance (75 %)${pointsBonusPct > 0 ? ` · +${pointsBonusPct} %` : ""}`
              : `part 70 % de la séance${pointsBonusPct > 0 ? ` · +${pointsBonusPct} %` : ""}`
          }
        />
        <KpiCard
          icon={TrendingUp}
          iconClass="text-brand"
          label="Séances ce mois"
          value={String(confirmedMonth)}
          sub={expectedSessions > 0 ? `sur ${expectedSessions} attendues` : "aucune attendue"}
        />
        <KpiCard
          icon={Users}
          iconClass="text-rose-500"
          label="Enfants suivis"
          value={String(overview.children.length)}
          sub={childrenCount > 0 ? "assignés actifs" : "aucun"}
        />
      </div>

      {/* Paiements — ventilation payé / en attente (toutes périodes + ce mois). */}
      <section className="rounded-3xl border border-ink/10 bg-white p-5 shadow-sm">
        <h3 className="flex items-center gap-1.5 font-display text-base font-black">
          <CircleDollarSign className="size-4 text-ink/40" /> Paiements
        </h3>
        <p className="text-[11px] text-ink/50 mb-3">
          Ce qui vous est dû — la confirmation du parent fait foi, l'admin valide puis paie.
        </p>
        <div>
          <PaymentRow
            label="Payé"
            dotClass="bg-emerald-500"
            totalXof={e.received}
            monthXof={me.received}
            count={e.counts.paid}
          />
          <PaymentRow
            label="Approuvé, à payer"
            dotClass="bg-amber-500"
            totalXof={e.approvedPending}
            monthXof={me.approvedPending}
            count={e.counts.approved}
          />
          <PaymentRow
            label="Confirmé, à approuver"
            dotClass="bg-sky-500"
            totalXof={e.confirmedPending}
            monthXof={me.confirmedPending}
            count={e.counts.confirmed}
          />
          <PaymentRow
            label="Déclaré, en attente du parent"
            dotClass="bg-stone-400"
            totalXof={e.declaredPending}
            monthXof={me.declaredPending}
            count={e.counts.declared}
          />
          <PaymentRow
            label="Contesté (exclu des gains)"
            dotClass="bg-rose-500"
            totalXof={e.contested}
            monthXof={me.contested}
            count={e.counts.contested}
          />
        </div>
      </section>

      {/* Évolution mensuelle — séances confirmées (barres) et gains acquis (ligne). */}
      <section className="rounded-3xl border border-ink/10 bg-white p-5 shadow-sm">
        <h3 className="flex items-center gap-1.5 font-display text-base font-black">
          <TrendingUp className="size-4 text-ink/40" /> Évolution mensuelle
        </h3>
        <p className="text-[11px] text-ink/50 mb-3">
          Séances confirmées par les parents et gains acquis — 6 derniers mois.
        </p>
        <ResponsiveContainer width="100%" height={200}>
          <ComposedChart
            data={overview.monthlySeries}
            margin={{ top: 8, right: 0, bottom: 0, left: -18 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "#78716c" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="sessions"
              allowDecimals={false}
              tick={{ fontSize: 10, fill: "#78716c" }}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              yAxisId="xof"
              orientation="right"
              tickFormatter={(v: number) => `${Math.round(Number(v) / 1000)}k`}
              tick={{ fontSize: 10, fill: "#78716c" }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              formatter={(value: any, name: any) =>
                name === "Gains (F)"
                  ? [`${formatXofAmount(Number(value))} F`, name]
                  : [value, name]
              }
              contentStyle={{
                borderRadius: 12,
                border: "1px solid #e7e5e4",
                fontSize: 12,
              }}
            />
            <Bar
              yAxisId="sessions"
              dataKey="confirmed"
              name="Séances confirmées"
              fill="#6366f1"
              radius={[6, 6, 0, 0]}
              maxBarSize={28}
            />
            <Line
              yAxisId="xof"
              dataKey="earnedXof"
              name="Gains (F)"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 3, fill: "#10b981" }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </section>

      {/* Évolution des jeunes suivis — une carte par enfant. */}
      <section>
        <h3 className="mb-3 flex items-center gap-1.5 font-display text-base font-black">
          <Star className="size-4 text-ink/40" /> Évolution des jeunes suivis
        </h3>
        {overview.children.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-ink/20 bg-white/40 p-8 text-center shadow-sm">
            <p className="text-sm text-ink/60 italic">Aucun enfant assigné pour l'instant.</p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {overview.children.map((child) => {
              const guild = getChildGuild(child.talents);
              const pct =
                child.challengesTotal > 0
                  ? Math.round((child.challengesCompleted / child.challengesTotal) * 100)
                  : 0;
              const reportChip =
                child.reportStatus === "validated"
                  ? { label: "Bilan validé", cls: "bg-emerald-100 text-emerald-700" }
                  : child.reportStatus === "submitted"
                    ? { label: "Bilan en attente", cls: "bg-amber-100 text-amber-700" }
                    : child.reportStatus === "rejected"
                      ? { label: "Bilan à corriger", cls: "bg-rose-100 text-rose-700" }
                      : child.reportStatus === "draft"
                        ? { label: "Bilan brouillon", cls: "bg-stone-100 text-stone-600" }
                        : null;
              return (
                <div
                  key={child.child_id}
                  className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{guild.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="font-display font-black text-sm truncate">{child.name}</p>
                      <p className="text-[10px] text-ink/50">
                        <CalendarDays className="-mt-0.5 mr-0.5 inline size-3" />
                        Suivi depuis{" "}
                        {new Date(child.assigned_at).toLocaleDateString("fr-FR", {
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    {reportChip && (
                      <span
                        className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${reportChip.cls}`}
                      >
                        {reportChip.label}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-base font-black">{child.confirmedSessions}</p>
                      <p className="text-[9px] font-black uppercase tracking-widest text-ink/40">
                        séances
                      </p>
                    </div>
                    <div>
                      <p className="text-base font-black">
                        {child.challengesCompleted}
                        <span className="text-ink/30">/{child.challengesTotal}</span>
                      </p>
                      <p className="text-[9px] font-black uppercase tracking-widest text-ink/40">
                        défis
                      </p>
                    </div>
                    <div>
                      <p className="text-base font-black">
                        {child.avgFeedback != null ? `${child.avgFeedback.toFixed(1)}/5` : "—"}
                      </p>
                      <p className="text-[9px] font-black uppercase tracking-widest text-ink/40">
                        note fam.
                      </p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <div className="h-1.5 rounded-full bg-ink/10">
                      <div
                        className="h-full rounded-full bg-brand"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[10px] font-semibold text-ink/50">
                      {child.feedbackCount > 0
                        ? `${child.feedbackCount} note${child.feedbackCount > 1 ? "s" : ""} famille · `
                        : ""}
                      {child.confirmedThisMonth > 0
                        ? `${child.confirmedThisMonth} séance${child.confirmedThisMonth > 1 ? "s" : ""} ce mois`
                        : "aucune séance ce mois"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Confiance & qualité — les indicateurs qui décident du statut et du taux. */}
      <section className="rounded-3xl border border-ink/10 bg-white p-5 shadow-sm">
        <h3 className="flex items-center gap-1.5 font-display text-base font-black">
          <ShieldAlert className="size-4 text-ink/40" /> Confiance & qualité
        </h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="rounded-full border border-ink/10 bg-surface px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-ink/70">
            Score {score ?? "—"}/100
          </span>
          <span className="rounded-full border border-ink/10 bg-surface px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-ink/70">
            Ponctualité{" "}
            {overview.quality.punctuality != null
              ? `${overview.quality.punctuality} %`
              : "non mesurée"}
          </span>
          <span className="rounded-full border border-ink/10 bg-surface px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-ink/70">
            Note famille{" "}
            {overview.quality.avgFeedback != null
              ? `${overview.quality.avgFeedback.toFixed(1)}/5`
              : "—"}
          </span>
          {overview.quality.contestedTotal > 0 && (
            <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-rose-700">
              {overview.quality.contestedTotal} contestation
              {overview.quality.contestedTotal > 1 ? "s" : ""}
            </span>
          )}
          {overview.quality.reportsSubmitted + overview.quality.reportsDraft +
            overview.quality.reportsRejected >
            0 && (
            <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-amber-700">
              {overview.quality.reportsSubmitted} bilan
              {overview.quality.reportsSubmitted > 1 ? "s" : ""} en attente
            </span>
          )}
          {overview.quality.reportsValidated > 0 && (
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-700">
              {overview.quality.reportsValidated} bilan
              {overview.quality.reportsValidated > 1 ? "s" : ""} validé
              {overview.quality.reportsValidated > 1 ? "s" : ""}
            </span>
          )}
          {tier === "trusted" && (
            <span className="rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-indigo-700">
              ⭐ Mentor de confiance
            </span>
          )}
          {points > 0 && (
            <span className="rounded-full border border-ink/10 bg-surface px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-ink/70">
              🏅 {badge === "gold" ? "Or" : badge === "bronze" ? "Bronze" : ""} {points} pts
              {pointsBonusPct > 0 ? ` · +${pointsBonusPct} % payout` : ""}
            </span>
          )}
          {mentorStatus !== "active" && (
            <span
              className={`rounded-full px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${
                mentorStatus === "suspended"
                  ? "bg-rose-600 text-white"
                  : "bg-amber-100 text-amber-700"
              }`}
            >
              {mentorStatus === "suspended"
                ? "Suspendu"
                : mentorStatus === "banned"
                  ? "Banni"
                  : "Averti"}
            </span>
          )}
        </div>
      </section>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  iconClass,
  label,
  value,
  sub,
}: {
  icon: LucideIcon;
  iconClass: string;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="rounded-2xl border border-ink/10 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-ink/50">
        <Icon className={`size-3.5 ${iconClass}`} />
        {label}
      </div>
      <p className="mt-1.5 font-display text-xl font-black text-ink leading-tight">{value}</p>
      {sub && <p className="mt-1 text-[10px] font-semibold text-ink/50">{sub}</p>}
    </div>
  );
}

function PaymentRow({
  label,
  dotClass,
  totalXof,
  monthXof,
  count,
}: {
  label: string;
  dotClass: string;
  totalXof: number;
  monthXof: number;
  count: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-ink/5 py-2.5 last:border-0">
      <div className="flex min-w-0 items-center gap-2">
        <span className={`size-2 shrink-0 rounded-full ${dotClass}`} />
        <div className="min-w-0">
          <p className="truncate text-xs font-bold text-ink">{label}</p>
          <p className="text-[10px] font-semibold text-ink/50">
            {count} séance{count > 1 ? "s" : ""}
          </p>
        </div>
      </div>
      <div className="shrink-0 text-right">
        <p className="text-sm font-black text-ink leading-tight">
          {formatXofAmount(totalXof)} F
        </p>
        <p className="text-[10px] font-semibold text-ink/50">
          ce mois : {formatXofAmount(monthXof)} F
        </p>
      </div>
    </div>
  );
}
