import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { toast } from "sonner";
import {
  Brain,
  Award,
  Trash2,
  Calendar,
  CheckCircle2,
  ArrowLeft,
  BookMarked,
  Star,
  WandSparkles,
  KeyRound,
  Upload,
  Loader2,
  Play,
  Check,
  X,
  MessageCircle,
  Beaker,
  Trophy,
  BookOpen,
  Lock,
  Phone,
  Globe,
} from "lucide-react";
import { getChildAccessStatusFn, type ChildAccessStatus } from "@/lib/child-access";
import { formatXof } from "@/lib/pricing";
import {
  generateChallenges,
  updateChallenge,
  deleteChallenge,
  validateChallengeProof,
  submitChallengeNotCompleted,
  getChildAISynthesis,
  generateSingleChallenge,
  generateAcademicHomeworkChallenge,
  getAcademicGapsForChild,
  assignTemplateChallenge,
  TALENT_SUBFORM_LABELS,
  TALENT_SUBFORM_TO_DOMAIN,
  ACADEMIC_DOMAIN_LABELS,
} from "@/lib/challenges.functions";
import {
  internationalLevelLabel,
  lastAcademicLevelByDomain,
} from "@/lib/academic-levels";
import {
  GRADE_LEVEL_METADATA,
  ACADEMIC_SUBJECT_LABELS,
  type GradeLevel,
  type AcademicSubject,
  type BehavioralDriver,
} from "@/lib/academic-homework.functions";
import { HomeworkModeToggle, type ChallengeMode } from "@/components/challenges/HomeworkModeToggle";
import { AcademicHomeworkInput } from "@/components/challenges/AcademicHomeworkInput";
import { TALENT_KEY_LABELS } from "@/lib/talent-buckets";
import {
  recommendChallengesForChild,
  type RecommendedChallengeResult,
} from "@/lib/recommendations.functions";
import { createOrder } from "@/lib/products.functions";
import { NayaAvatar } from "@/components/NayaAvatar";
import { TalentRadarChart } from "@/components/TalentRadarChart";
import { StepAccordion } from "@/components/challenges/StepAccordion";
import { ObservationPrompts } from "@/components/challenges/ObservationPrompts";
import { OutcomeChat } from "@/components/challenges/OutcomeChat";
import { KitSuggestion } from "@/components/challenges/KitSuggestion";
import { DifficultyBadge } from "@/components/challenges/DifficultyBadge";
import { MarkdownContent } from "@/components/ui/markdown-content";
import {
  ChallengeDeleteDialog,
  type ChallengeDeletePayload,
} from "@/components/challenges/ChallengeDeleteDialog";
import { AppHeader } from "@/components/AppHeader";
import { AppTabBar } from "@/components/AppTabBar";
import { GenizioLoader } from "@/components/GenizioLoader";
import { getActiveChallenge } from "@/lib/active-challenge";
import { formatPedagogicalIntention } from "@/lib/pedagogical-intention";
import { getChildEnrolledSeason, type Season } from "@/lib/seasons.functions";
import { ShoppingBag } from "lucide-react";

// "Mathématiques" et "Émotions et relations sociales" ajoutées (décision #39, item 3) : le
// parent peut ainsi orienter volontairement Naya vers un domaine du référentiel académique
// précis pour accélérer le signal de détection d'écart, plutôt que d'attendre que ces domaines
// sortent naturellement de la rotation. L'id est injecté tel quel comme instruction de domaine
// dans le prompt (cf. generateSingleChallenge) — garder des libellés explicites, pas des codes.
const CATEGORIES = [
  { id: "all", label: "Suggéré par Naya (Diagnostic)" },
  { id: "Mathématiques", label: "Mathématiques & Logique" },
  { id: "Sciences", label: "Sciences & Ingénierie" },
  { id: "Arts", label: "Arts & Créativité" },
  { id: "Langues", label: "Langues & Littérature" },
  { id: "Sport", label: "Sport & motricité" },
  { id: "Émotions et relations sociales", label: "Émotions & Vie sociale" },
  { id: "Artisanat", label: "Artisanat & Métiers" },
  { id: "Agriculture", label: "Agriculture & Nature" },
  { id: "Entrepreneuriat", label: "Échanges & Commerce" },
];

type ChallengesSearchParams = {
  mode?: "parent" | "child";
};

export const Route = createFileRoute("/profiles/$profileId/challenges")({
  validateSearch: (search: Record<string, unknown>): ChallengesSearchParams => {
    return {
      mode: search.mode === "child" || search.mode === "parent" ? search.mode : undefined,
    };
  },
  component: ChallengesPage,
});

type Challenge = {
  id: string;
  child_id: string;
  domain: string;
  title: string;
  description: string;
  duration: string;
  steps: string[];
  materials: string[];
  material_tags?: string[] | null;
  status: "todo" | "in_progress" | "completed" | "not_completed";
  progress: number;
  notes: string | null;
  completed_at: string | null;
  not_completed_reason?: string | null;
  pedagogical_context?: string | null;
  target_intelligences?: string[] | null;
  trait_subform?: string | null;
  proof_image_url?: string | null;
  ai_observations?: string | null;
  difficulty?: string | null;
  academic_domain?: string | null;
  academic_level_age?: number | null;
  academic_subject?: string | null;
  academic_grade_level?: string | null;
  homework_instruction?: string | null;
  behavioral_driver?: string | null;
  zpa_level?: number | null;
  academic_secret?: string | null;
};

type Child = {
  id: string;
  name: string;
  age: number;
  interests: string[];
  avatar_color: string;
  city: string | null;
  country: string | null;
  talents: Record<string, number>;
  access_locked_at?: string | null;
};

const COLORS: Record<string, string> = {
  brand: "bg-brand text-white",
  leaf: "bg-leaf text-white",
  sky: "bg-sky text-white",
  ink: "bg-ink text-white",
};

const STATUS_LABEL: Record<Challenge["status"], string> = {
  todo: "À faire",
  in_progress: "En cours",
  completed: "Terminé",
  not_completed: "Non réussi",
};

const CHALLENGE_STATUSES: Challenge["status"][] = [
  "todo",
  "in_progress",
  "completed",
  "not_completed",
];

const STATUS_STYLE: Record<Challenge["status"], string> = {
  todo: "bg-stone-100 text-stone-700 border-stone-200",
  in_progress: "bg-sky-50 text-sky-700 border-sky-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  not_completed: "bg-rose-50 text-rose-700 border-rose-200",
};

function ChallengesPage() {
  const { profileId } = Route.useParams();
  const search = Route.useSearch();
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const routeNavigate = Route.useNavigate();

  const [viewMode, setViewMode] = useState<"parent" | "child">(search.mode || "parent");
  // setViewMode seul ne changeait que l'état React local — un rechargement de page (courant sur
  // le device cible réel : Android d'entrée de gamme, PWA en arrière-plan) repassait donc
  // silencieusement en mode Parent, exposant le dashboard complet à l'enfant à qui on venait de
  // tendre l'appareil. La lecture URL→state existait déjà (l'effet ci-dessous) ; il manquait
  // l'écriture state→URL pour fermer la boucle.
  const setMode = (mode: "parent" | "child") => {
    setViewMode(mode);
    routeNavigate({ search: (prev) => ({ ...prev, mode }), replace: true });
  };
  useEffect(() => {
    if (search.mode) {
      setViewMode(search.mode);
    }
  }, [search.mode]);

  const [child, setChild] = useState<Child | null>(null);
  const [enrolledSeason, setEnrolledSeason] = useState<Season | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [fetching, setFetching] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | Challenge["status"]>("all");
  const [activeProducts, setActiveProducts] = useState<any[]>([]);
  const [assignedChallengeForKit, setAssignedChallengeForKit] = useState<{
    id: string;
    title: string;
    products: any[];
  } | null>(null);
  const [orderingKit, setOrderingKit] = useState(false);
  const [accessState, setAccessState] = useState<{
    status: ChildAccessStatus;
    renewalAmountXof: number;
  } | null>(null);

  useEffect(() => {
    supabase
      .from("products")
      .select("id, name, price_xof, material_tags")
      .eq("is_active", true)
      .then(({ data }) => {
        if (data) setActiveProducts(data);
      });
  }, []);

  // Alimente le badge "Lacune détectée" de AcademicHomeworkInput — auparavant jamais fourni,
  // la prop restait sur son défaut {} et le badge n'apparaissait donc jamais (cf. audit
  // feat/naya-academic-homework-fusion, 2026-07-22).
  useEffect(() => {
    if (!profileId) return;
    getAcademicGaps({ data: { childId: profileId } })
      .then((gaps) => setAcademicGaps(gaps ?? {}))
      .catch((err) => console.error("Error fetching academic gaps:", err));
  }, [profileId]);

  const hasKit = (materialTags?: string[] | null) => {
    if (!materialTags || materialTags.length === 0) return false;
    return activeProducts.some((product) =>
      product.material_tags?.some((t: string) => materialTags.includes(t)),
    );
  };

  // IA Synthesis State
  const [aiSynthesis, setAiSynthesis] = useState<string>("");
  const [fetchingSynthesis, setFetchingSynthesis] = useState(false);

  // Integrated Lab States
  const [labMode, setLabMode] = useState<ChallengeMode>("free");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [materialScope, setMaterialScope] = useState<"home" | "outdoor" | "buy" | "mixed">("mixed");
  const [isGeneratingSingle, setIsGeneratingSingle] = useState(false);
  const [isGeneratingAcademic, setIsGeneratingAcademic] = useState(false);
  const [isAssigningSingle, setIsAssigningSingle] = useState(false);
  const [currentGeneratedChallenge, setCurrentGeneratedChallenge] = useState<any | null>(null);
  const [loadingTextIndex, setLoadingTextIndex] = useState(0);
  const [recommendation, setRecommendation] = useState<RecommendedChallengeResult | null>(null);
  const [isRerolling, setIsRerolling] = useState(false);
  const [academicGaps, setAcademicGaps] = useState<Record<string, number>>({});
  // Suppression différenciée (Décision #58) : le défi en cours de suppression +
  // l'état de l'appel — terminé → modal danger (saisie du titre) ; non terminé
  // → chips de raison en 1 tap (le signal alimente le Loup).
  const [deleteDialog, setDeleteDialog] = useState<Challenge | null>(null);
  const [deletingChallenge, setDeletingChallenge] = useState(false);

  const generate = useServerFn(generateChallenges);
  const update = useServerFn(updateChallenge);
  const markNotCompleted = useServerFn(submitChallengeNotCompleted);
  const del = useServerFn(deleteChallenge);
  const fetchSynthesis = useServerFn(getChildAISynthesis);
  const generateSingle = useServerFn(generateSingleChallenge);
  const generateAcademicHomework = useServerFn(generateAcademicHomeworkChallenge);
  const getAcademicGaps = useServerFn(getAcademicGapsForChild);
  const assignSingle = useServerFn(assignTemplateChallenge);
  const createOrderFn = useServerFn(createOrder);

  // Gate UI "accès mensuel expiré" (décision 2026-08-05) : la génération de NOUVEAUX défis
  // est bloquée côté client ET côté serveur (assertChildAccessActive) ; le portfolio,
  // l'historique et les défis déjà émis restent accessibles.
  const accessExpired = accessState?.status.kind === "expired";
  const recommendFn = useServerFn(recommendChallengesForChild);

  const LOADING_STEPS = [
    "Naya étudie la carte des talents...",
    "Naya analyse les réalisations passées...",
    "Naya formule un défi croisé auto-correctif...",
    "Naya rédige l'analyse stratégique...",
    "Finalisation du plan d'expérience...",
  ];

  const ACADEMIC_LOADING_STEPS = [
    "Naya consulte le programme scolaire...",
    "Naya applique la mécanique de fusion...",
    "Naya calibre les étapes pour le niveau sélectionné...",
    "Naya rédige l'analyse stratégique...",
    "Finalisation de la quête académique...",
  ];

  useEffect(() => {
    let interval: any;
    if (isGeneratingSingle || isGeneratingAcademic) {
      interval = setInterval(() => {
        setLoadingTextIndex((prev) => (prev + 1) % 5);
      }, 1500);
    } else {
      setLoadingTextIndex(0);
    }
    return () => clearInterval(interval);
  }, [isGeneratingSingle, isGeneratingAcademic]);

  const handleGenerateSingle = async () => {
    if (isGeneratingSingle) return;
    if (accessExpired) {
      toast.error("Accès expiré — renouvelez pour générer de nouveaux défis.");
      return;
    }
    setIsGeneratingSingle(true);
    setCurrentGeneratedChallenge(null);
    try {
      const resp = await generateSingle({
        data: {
          childId: profileId,
          domain: selectedCategory,
          materialScope,
        },
      });
      setCurrentGeneratedChallenge(resp);
      toast.success("Nouveau défi composé avec succès !");
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la génération. Réessayez.");
    } finally {
      setIsGeneratingSingle(false);
    }
  };

  const handleGenerateAcademicHomework = async (params: {
    gradeLevel: GradeLevel;
    subject: AcademicSubject;
    homeworkInstruction: string;
    behavioralDriver?: BehavioralDriver;
    suggestedTopicId?: string;
  }) => {
    if (isGeneratingAcademic) return;
    if (accessExpired) {
      toast.error("Accès expiré — renouvelez pour générer de nouveaux défis.");
      return;
    }
    setIsGeneratingAcademic(true);
    setCurrentGeneratedChallenge(null);
    try {
      const resp = await generateAcademicHomework({
        data: {
          childId: profileId,
          gradeLevel: params.gradeLevel,
          subject: params.subject,
          homeworkInstruction: params.homeworkInstruction,
          behavioralDriver: params.behavioralDriver,
          suggestedTopicId: params.suggestedTopicId,
        },
      });
      setCurrentGeneratedChallenge(resp);
      toast.success("Devoir transformé avec succès en défi ludique !");
    } catch (e) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Erreur lors de la fusion du devoir. Réessayez.";
      toast.error(msg);
    } finally {
      setIsGeneratingAcademic(false);
    }
  };

  const handleAssignSingle = async () => {
    if (!currentGeneratedChallenge) return;
    setIsAssigningSingle(true);
    try {
      const resp = await assignSingle({
        data: {
          childId: profileId,
          template: {
            // Reprend l'intégralité de l'aperçu généré par generateSingleChallenge/
            // generateAcademicHomeworkChallenge plutôt qu'une liste de champs choisis à la
            // main — cette liste manquait academic_secret (jamais assigné à aucun défi
            // "single" ou "devoir" en conséquence, cf. genizio-decisions) ainsi que
            // academic_domain/academic_level_age/academic_reference_note/proof_mode/
            // proof_target/declarative_award/trait_subform, silencieusement perdus au
            // passage client alors même que le serveur les avait générés. Les 3 champs
            // ci-dessous gardent leur repli explicite, le reste suit tel quel.
            ...currentGeneratedChallenge,
            material_tags: currentGeneratedChallenge.material_tags ?? [],
            intelligences: currentGeneratedChallenge.intelligences || [
              currentGeneratedChallenge.domain,
            ],
            requires_supervision: currentGeneratedChallenge.requires_supervision ?? false,
          },
        },
      });
      toast.success("Défi assigné avec succès !");
      setCurrentGeneratedChallenge(null);
      await refetch();

      const matching = activeProducts.filter((p) =>
        p.material_tags?.some((t: string) => currentGeneratedChallenge.material_tags?.includes(t)),
      );
      if (matching.length > 0) {
        setAssignedChallengeForKit({
          id: resp.id,
          title: resp.title,
          products: matching,
        });
      }
    } catch (e) {
      console.error(e);
      toast.error("Impossible d'assigner ce défi.");
    } finally {
      setIsAssigningSingle(false);
    }
  };

  const handleOrderKit = async () => {
    if (!assignedChallengeForKit || !child) return;
    setOrderingKit(true);
    const total = assignedChallengeForKit.products.reduce((sum, p) => sum + p.price_xof, 0);
    const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined;
    const message = `Bonjour ! Je souhaite commander le kit pour le défi "${assignedChallengeForKit.title}" de ${child.name} :\n${assignedChallengeForKit.products
      .map((p) => `- ${p.name} (${p.price_xof.toLocaleString("fr-FR")} FCFA)`)
      .join("\n")}\nTotal : ${total.toLocaleString("fr-FR")} FCFA`;
    const waUrl = whatsappNumber
      ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`
      : null;

    try {
      const orderItems = assignedChallengeForKit.products.map((p) => ({
        id: p.id,
        name: p.name,
        price_xof: p.price_xof,
      }));

      await createOrderFn({
        data: {
          child_id: profileId,
          challenge_id: assignedChallengeForKit.id,
          total_price_xof: total,
          items: orderItems,
          delivery_notes: `Commande post-Labo (Challenges Page) pour le défi: ${assignedChallengeForKit.title}`,
        },
      });

      toast.success("Commande enregistrée ! Ouverture de WhatsApp...");
      if (waUrl) {
        window.open(waUrl, "_blank", "noopener,noreferrer");
      }
      setAssignedChallengeForKit(null);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la création de la commande.");
    } finally {
      setOrderingKit(false);
    }
  };

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [session, loading, navigate]);

  const refetch = async () => {
    setFetching(true);
    const [c, ch, accessRes] = await Promise.all([
      supabase
        .from("child_profiles")
        .select("*")
        .eq("id", profileId)
        .eq("user_id", session!.user.id)
        .maybeSingle(),
      supabase
        .from("challenges")
        .select("*")
        .eq("child_id", profileId)
        .order("created_at", { ascending: false }),
      getChildAccessStatusFn({ data: { childId: profileId } }).catch(() => null),
    ]);
    setChild((c.data as Child) ?? null);
    setAccessState(accessRes);
    const list = (ch.data ?? []) as Challenge[];
    setChallenges(list);

    // A just-completed challenge is never picked by getActiveChallenge below
    // (it only surfaces in_progress/todo) — arriving here from the Quest
    // page's "Ajouter une preuve" toast used to drop the parent on this list
    // with no indication of which (collapsed) card was theirs, so the
    // proof/validation step was effectively undiscoverable. Honor a
    // one-shot deep link set by that toast instead.
    const highlightId = sessionStorage.getItem("genizio:highlightChallenge");
    if (highlightId && list.some((item) => item.id === highlightId)) {
      sessionStorage.removeItem("genizio:highlightChallenge");
      setOpenId(highlightId);
      setTimeout(() => {
        document
          .getElementById(`challenge-${highlightId}`)
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
    } else {
      const active = getActiveChallenge(list);
      if (active && !openId) {
        setOpenId(active.id);
      }
    }

    setFetching(false);
    setInitialLoad(false);
  };

  const loadAISynthesis = async () => {
    setFetchingSynthesis(true);
    try {
      const resp = await fetchSynthesis({ data: { childId: profileId } });
      setAiSynthesis(resp || "");
    } catch (e) {
      console.error(e);
    } finally {
      setFetchingSynthesis(false);
    }
  };

  const loadRecommendation = async () => {
    try {
      const res = await recommendFn({ data: { childId: profileId } });
      setRecommendation(res || null);
    } catch (e) {
      console.error("Failed to load recommendation:", e);
    }
  };

  // "Pas celui-ci" — uniquement pour EXPLORATION (le pick par défaut de Naya quand
  // l'enfant n'a aucun défi en attente). Les 3 autres types (INVESTIGATION/ESSAIMAGE/
  // STABILISATION) sont des interventions pédagogiques ciblées par le diagnostic NAYA 2.0,
  // pas des suggestions à écarter d'un clic — on n'y touche pas ici.
  const handleRerollRecommendation = async () => {
    if (!recommendation?.challenge?.id) return;
    setIsRerolling(true);
    try {
      await del({ data: { id: recommendation.challenge.id, reason: "pas_interesse" } });
      setRecommendation(null);
      await loadRecommendation();
    } catch (e) {
      toast.error("Impossible de proposer une autre mission.");
    } finally {
      setIsRerolling(false);
    }
  };

  const loadEnrolledSeason = async () => {
    try {
      const season = await getChildEnrolledSeason({ data: { childId: profileId } });
      setEnrolledSeason(season);
    } catch (e) {
      console.error("Failed to load enrolled season:", e);
    }
  };

  useEffect(() => {
    if (session) {
      void refetch();
      void loadAISynthesis();
      void loadRecommendation();
      void loadEnrolledSeason();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, profileId]);

  const handleGenerate = async () => {
    setError(null);
    if (accessExpired) {
      toast.error("Accès expiré — renouvelez pour générer de nouveaux défis.");
      return;
    }
    setGenerating(true);
    try {
      await generate({ data: { childId: profileId, count: 4 } });
      await refetch();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Erreur lors de la génération des défis";
      setError(msg);
      toast.error(msg);
    } finally {
      setGenerating(false);
    }
  };

  const setStatus = async (id: string, status: Challenge["status"]) => {
    const previous = challenges;
    const targetChallenge = previous.find((c) => c.id === id);
    if (status === "in_progress" && targetChallenge?.status === "todo") {
      if (statusFilter === "todo") {
        // Correctif (2026-08-05) : la mise à jour optimiste ci-dessous retire la carte de la
        // liste filtrée "À faire" avant la réponse serveur — le clic semblait donc "sans
        // effet" (seul un toast passait). On suit le filtre sur "En cours" au moment du clic,
        // comme l'annonce déjà le toast, pour que la carte reste visible dans son nouvel état.
        setStatusFilter("in_progress");
        toast.success(
          "Défi débuté ! Retrouvez-le dans l'onglet 'En cours' pour le valider avec l'enfant.",
        );
      } else {
        toast.success("Défi débuté ! Validez-le avec l'enfant lorsque vous êtes prêts.");
      }
    }
    setChallenges((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              status,
              progress: status === "completed" ? 100 : status === "todo" ? 0 : c.progress,
            }
          : c,
      ),
    );
    try {
      await update({ data: { id, status } });
    } catch (e) {
      setChallenges(previous);
      toast.error(e instanceof Error ? e.message : "Erreur lors de la mise à jour du statut.");
    }
  };

  // Étape 2 — "un vrai statut non réussi" (brainstorm produit, 2026-08-02) : chemin
  // séparé de setStatus, qui ne donne jamais de points/XP/badge — juste un constat honnête,
  // avec la raison du parent, pour nourrir la compréhension de l'enfant plutôt que le noter.
  const markChallengeNotCompleted = async (id: string, reason: string) => {
    const previous = challenges;
    // Correctif (2026-08-05) : même motif que setStatus — la mise à jour optimiste retire la
    // carte de la vue filtrée "À faire"/"En cours" avant la réponse serveur. On suit le filtre
    // sur "Non réussi" pour garder la carte visible dans son nouvel état.
    if (statusFilter === "todo" || statusFilter === "in_progress") {
      setStatusFilter("not_completed");
    }
    setChallenges((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, status: "not_completed", not_completed_reason: reason } : c,
      ),
    );
    try {
      await markNotCompleted({ data: { id, reason } });
    } catch (e) {
      setChallenges(previous);
      toast.error(e instanceof Error ? e.message : "Erreur lors de l'enregistrement.");
    }
  };

  const setProgress = async (id: string, progress: number) => {
    const previous = challenges;
    setChallenges((prev) => prev.map((c) => (c.id === id ? { ...c, progress } : c)));
    try {
      await update({ data: { id, progress } });
    } catch (e) {
      setChallenges(previous);
      toast.error(
        e instanceof Error ? e.message : "Erreur lors de la mise à jour de la progression.",
      );
    }
  };

  const saveNotes = async (id: string, notes: string) => {
    try {
      await update({ data: { id, notes } });
      setChallenges((prev) => prev.map((c) => (c.id === id ? { ...c, notes } : c)));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de l'enregistrement des notes.");
    }
  };

  const openDeleteDialog = (id: string) => {
    const challenge = challenges.find((c) => c.id === id);
    if (challenge) setDeleteDialog(challenge);
  };

  const handleDeleteChallenge = async (payload: ChallengeDeletePayload = {}) => {
    if (!deleteDialog) return;
    setDeletingChallenge(true);
    try {
      await del({ data: { id: deleteDialog.id, reason: payload.reason, note: payload.note } });
      setChallenges((prev) => prev.filter((c) => c.id !== deleteDialog.id));
      toast.success("Défi supprimé.");
      setDeleteDialog(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de la suppression du défi.");
    } finally {
      setDeletingChallenge(false);
    }
  };

  if (loading || !session || (fetching && initialLoad)) {
    return (
      <div className="grid min-h-dvh place-items-center bg-surface">
        <GenizioLoader label="Chargement…" />
      </div>
    );
  }

  if (!child) {
    return (
      <div className="grid min-h-dvh place-items-center bg-surface">
        <div className="text-center">
          <p className="mb-4 text-ink/60">Profil introuvable.</p>
          <Link
            to="/profiles"
            className="rounded-full bg-brand px-5 py-2 text-sm font-bold text-white"
          >
            Retour
          </Link>
        </div>
      </div>
    );
  }

  if (child.access_locked_at) {
    const whatsappNumber =
      (import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined) || "33606433148";
    const whatsappText = encodeURIComponent(
      `Bonjour, je voudrais devenir superviseur de ${child.name} suite à la fin de mon rôle d'éducateur.`,
    );
    return (
      <div className="grid min-h-dvh place-items-center bg-surface px-6">
        <div className="max-w-sm rounded-3xl border border-ink/10 bg-white p-8 text-center shadow-md">
          <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-ink/5 text-ink/60">
            <Lock className="size-6" />
          </div>
          <h2 className="font-display text-balance text-xl font-extrabold">Profil verrouillé</h2>
          <p className="mt-2 text-sm text-ink/60 leading-relaxed">
            L'accès à {child.name} a été suspendu suite à la fin de votre rôle d'éducateur pour
            cette organisation. Sa progression (défis, talents, XP) reste intacte.
          </p>
          <a
            href={`https://wa.me/${whatsappNumber}?text=${whatsappText}`}
            target="_blank"
            rel="noreferrer"
            className="press-brand mt-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-6 py-3 text-sm font-bold text-white"
          >
            Demander à devenir superviseur
          </a>
          <Link to="/profiles" className="mt-4 block text-xs font-bold text-ink/60 underline">
            Retour
          </Link>
        </div>
      </div>
    );
  }

  const done = challenges.filter((c) => c.status === "completed").length;
  const inProgress = challenges.filter((c) => c.status === "in_progress").length;
  const totalProgress =
    challenges.length > 0
      ? Math.round(challenges.reduce((a, c) => a + c.progress, 0) / challenges.length)
      : 0;

  return (
    <div className="min-h-dvh bg-gradient-to-b from-surface via-surface to-brand/5 pb-24 text-ink ">
      <AppHeader />

      <main className="mx-auto max-w-6xl px-6 py-10 md:flex ">
        <AppTabBar profileId={profileId} />
        <div className="min-w-0 flex-1">
          {/* Mode Switcher Header Toggle */}
          <div className="mb-6 flex justify-center">
            <div className="inline-flex rounded-2xl bg-stone-100 p-1.5 border border-ink/10 shadow-inner">
              <button
                type="button"
                onClick={() => setMode("parent")}
                className={`px-5 py-2.5 rounded-xl text-sm font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
                  viewMode === "parent"
                    ? "bg-white text-ink shadow-md border border-ink/10"
                    : "text-ink/60 hover:text-ink"
                }`}
              >
                <span>Espace Parent 🧑‍🏫</span>
              </button>
              <button
                type="button"
                onClick={() => setMode("child")}
                className={`px-5 py-2.5 rounded-xl text-sm font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
                  viewMode === "child"
                    ? "bg-brand text-white shadow-md"
                    : "text-ink/60 hover:text-ink"
                }`}
              >
                <span>Mode Enfant 🎮</span>
              </button>
            </div>
          </div>

          {/* Gate accès mensuel (décision 2026-08-05) : à expiration, la génération de
              nouveaux défis est bloquée ; les défis déjà émis restent jouables et visibles. */}
          {accessState && accessState.status.kind === "expired" && (
            <div className="mb-6 rounded-3xl border border-red-300 bg-red-50/70 p-5 shadow-sm flex flex-wrap items-center gap-3">
              <div className="grid size-10 place-items-center rounded-2xl bg-red-600 text-white shrink-0">
                <Lock className="size-5" />
              </div>
              <div className="flex-1 min-w-48">
                <p className="text-sm font-black text-red-800">
                  Accès expiré — renouvelez pour générer de nouveaux défis
                </p>
                <p className="text-xs text-ink/60 mt-0.5">
                  Les défis déjà émis restent jouables. Renouvellement :{" "}
                  <strong>{formatXof(accessState.renewalAmountXof)}/mois</strong>.
                </p>
              </div>
              <a
                href={`https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER || "33606433148"}?text=${encodeURIComponent(
                  `Bonjour, l'accès Génizio de ${child.name} est expiré. Je souhaite renouveler (${formatXof(accessState.renewalAmountXof)}/mois).`,
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

          {accessState &&
            accessState.status.kind === "monthly" &&
            accessState.status.daysLeft <= 14 && (
              <div className="mb-6 rounded-3xl border border-amber-300 bg-amber-50/70 p-5 shadow-sm flex flex-wrap items-center gap-3">
                <div className="grid size-10 place-items-center rounded-2xl bg-amber-500 text-white shrink-0">
                  <Calendar className="size-5" />
                </div>
                <div className="flex-1 min-w-48">
                  <p className="text-sm font-black text-amber-900">
                    {accessState.status.daysLeft === 0
                      ? "Votre accès se termine aujourd'hui !"
                      : `Votre accès se termine dans ${accessState.status.daysLeft} jour${accessState.status.daysLeft > 1 ? "s" : ""}.`}
                  </p>
                  <p className="text-xs text-ink/60 mt-0.5">
                    Fin le {new Date(accessState.status.endsAt).toLocaleDateString("fr-FR")} —
                    renouvellement : <strong>{formatXof(accessState.renewalAmountXof)}/mois</strong>
                    .
                  </p>
                </div>
                <a
                  href={`https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER || "33606433148"}?text=${encodeURIComponent(
                    `Bonjour, l'accès Génizio de ${child.name} se termine bientôt (${new Date(accessState.status.endsAt).toLocaleDateString("fr-FR")}). Je souhaite renouveler (${formatXof(accessState.renewalAmountXof)}/mois).`,
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

          {viewMode === "parent" ? (
            <>
              {/* Child Header Profile */}
              <div className="mb-10 rounded-3xl border border-ink/10 bg-white p-6 shadow-xl md:p-8 flex flex-col gap-6  md:items-center md:justify-between">
                <div className="flex items-center gap-5">
                  <div
                    className={`grid size-16 place-items-center rounded-2xl font-display text-balance text-2xl font-bold shadow-md shadow-brand/10 ${COLORS[child.avatar_color] ?? "bg-brand"}`}
                  >
                    {child.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-brand">
                      Tableau de bord de
                    </p>
                    <div className="flex items-center gap-3">
                      <h1 className="font-display text-balance text-3xl font-extrabold md:text-4xl">
                        {child.name}
                      </h1>
                      {enrolledSeason && (
                        <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-emerald-400 bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-emerald-800 shadow-sm">
                          <BookMarked className="size-3 text-emerald-600" />
                          {enrolledSeason.title}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm font-medium text-ink/60">
                      {child.age} ans
                      {child.interests.length > 0 && ` · ${child.interests.slice(0, 3).join(", ")}`}
                    </p>
                    {enrolledSeason && (
                      <div className="mt-2 sm:hidden inline-flex items-center gap-1.5 rounded-full border border-emerald-400 bg-emerald-50 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-emerald-800 shadow-sm">
                        <BookMarked className="size-3 text-emerald-600" />
                        {enrolledSeason.title}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => {
                      document
                        .getElementById("genizio-lab")
                        ?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="rounded-2xl border border-ink/10 bg-white px-5 py-3 text-sm font-bold text-ink shadow-sm hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Beaker className="size-4 text-brand" />
                    Générateur d'Expériences
                  </button>
                  <button
                    onClick={handleGenerate}
                    disabled={generating || accessExpired}
                    className="rounded-2xl border border-ink/10 bg-white px-5 py-3 text-sm font-bold text-ink shadow-sm hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-60 disabled:cursor-wait flex items-center gap-2"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>Naya compose...</span>
                      </>
                    ) : (
                      <>
                        <Brain className="size-4 text-brand" />
                        <span>Voir d'autres pistes (4)</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setMode("child")}
                    className="rounded-2xl border border-ink/10 bg-sky px-5 py-3 text-sm font-bold text-ink shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    Mode Enfant 🎮
                  </button>
                </div>
              </div>

              {/* Dashboard Grid Layout */}
              <div className="grid grid-cols-1 gap-8 ">
                {/* LEFT COLUMN: Radar chart & AI Synthesis */}
                <div className="lg:col-span-1 space-y-6">
                  {/* Radar Chart Card */}
                  <div className="rounded-3xl border border-ink/10 bg-ink text-white p-6 shadow-xl flex flex-col">
                    <h3 className="font-display text-balance text-lg font-bold flex items-center gap-2 mb-4">
                      <Award className="size-5 text-brand" />
                      Carte des Talents
                    </h3>
                    <TalentRadarChart
                      talents={child.talents}
                      name={child.name}
                      className="h-64 w-full"
                      age={child.age}
                      dark
                    />
                    <p className="text-[11px] text-center text-ink/60 font-medium">
                      Cette carte s'affine et se développe à mesure que l'enfant réalise ses défis.
                    </p>
                  </div>

                  {/* Niveau international atteint par domaine */}
                  {(() => {
                    const domainLevels = lastAcademicLevelByDomain(challenges);
                    if (domainLevels.length === 0) return null;
                    return (
                      <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-xl">
                        <h3 className="font-display text-balance text-lg font-bold flex items-center gap-2 text-ink mb-1">
                          <Globe className="size-5 text-brand" />
                          Niveau international par domaine
                        </h3>
                        <p className="text-[12px] text-ink/60 font-medium mb-4 leading-relaxed">
                          Dernier niveau atteint, calibré sur les standards des meilleurs
                          systèmes éducatifs du monde (Common Core USA · Singapore Math · NGSS).
                        </p>
                        <div className="space-y-2">
                          {domainLevels.map((d) => (
                            <div
                              key={d.domain}
                              className="flex items-center justify-between gap-2 rounded-2xl bg-surface border border-border px-4 py-3"
                            >
                              <span className="text-[13px] font-bold text-ink">
                                {ACADEMIC_DOMAIN_LABELS[d.domain] ?? d.domain}
                              </span>
                              <span className="text-[13px] font-extrabold text-cyan-900 bg-cyan-100 rounded-full px-3 py-1 shrink-0">
                                {d.grade}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Sous-formes de talent */}
                  {(() => {
                    const subformCountsByDomain: Record<string, Record<string, number>> = {};
                    for (const c of challenges) {
                      if (c.status !== "completed" || !c.trait_subform) continue;
                      const domain = TALENT_SUBFORM_TO_DOMAIN[c.trait_subform];
                      if (!domain) continue;
                      subformCountsByDomain[domain] ??= {};
                      subformCountsByDomain[domain][c.trait_subform] =
                        (subformCountsByDomain[domain][c.trait_subform] ?? 0) + 1;
                    }
                    const domainsPresent = Object.keys(subformCountsByDomain);
                    if (domainsPresent.length === 0) return null;

                    return (
                      <div className="space-y-4">
                        {domainsPresent.map((domain) => {
                          const entries = Object.entries(subformCountsByDomain[domain]).sort(
                            (a, b) => b[1] - a[1],
                          );

                          return (
                            <div
                              key={domain}
                              className="rounded-3xl border border-ink/10 bg-white p-5 shadow-sm"
                            >
                              <h4 className="text-[11px] font-bold uppercase tracking-widest text-ink/60 mb-3">
                                Au sein de {TALENT_KEY_LABELS[domain] ?? domain}
                              </h4>
                              <div className="space-y-2">
                                {entries.map(([key, count]) => (
                                  <div
                                    key={key}
                                    className="flex items-center justify-between text-sm"
                                  >
                                    <span className="font-bold text-ink">
                                      {TALENT_SUBFORM_LABELS[key] ?? key}
                                    </span>
                                    <span className="text-ink/60 font-medium">
                                      {count} défi{count > 1 ? "s" : ""}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  {/* AI Synthesis Card */}
                  <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-xl relative overflow-hidden">
                    <h3 className="font-display text-balance text-lg font-bold flex items-center gap-2 text-ink mb-4">
                      <Brain className="size-5 text-brand" />
                      Rapport de Naya
                    </h3>

                    {fetchingSynthesis ? (
                      <div className="flex flex-col items-center justify-center py-4 text-ink/60 text-sm font-bold">
                        <NayaAvatar size="sm" className="mb-2" />
                        <span>Naya réunit ses observations...</span>
                      </div>
                    ) : (
                      <div className="text-sm font-medium leading-relaxed text-ink space-y-3">
                        <MarkdownContent content={aiSynthesis} />
                      </div>
                    )}
                  </div>

                  {/* Micro stats */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white rounded-2xl border border-ink/10 shadow-sm p-4 text-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-ink/60">
                        Défis Terminés
                      </span>
                      <p className="mt-1 font-display text-balance text-2xl font-extrabold text-brand">
                        {done}
                      </p>
                    </div>
                    <div className="bg-white rounded-2xl border border-ink/10 shadow-sm p-4 text-center">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-ink/60">
                        Progression
                      </span>
                      <p className="mt-1 font-display text-balance text-2xl font-extrabold text-brand">
                        {totalProgress}%
                      </p>
                    </div>
                  </div>
                </div>

                {/* RIGHT COLUMN: Challenges List */}
                <div className="lg:col-span-2 space-y-6">
                  {/* NAYA 2.0 Phase 5 — Recommandation Prioritaire */}
                  {recommendation && (
                    <div className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-100/90 via-amber-50 to-white p-6 shadow-md mb-6 backdrop-blur-md">
                      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400 bg-amber-300 px-3 py-1 text-xs font-black uppercase tracking-wider text-ink shadow-xs">
                          <Star className="size-4 text-amber-800 fill-amber-800" />
                          {recommendation.badgeLabel}
                        </span>
                        <span className="text-xs font-bold text-ink/50">
                          Recommandation prioritaire Naya 2.0
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-ink/80 mb-4">
                        {recommendation.pedagogicalReason}
                      </p>
                      {recommendation.challenge && (
                        <div className="rounded-2xl border border-amber-200 bg-white p-4 flex flex-col  sm:items-center justify-between gap-4 shadow-sm">
                          <div>
                            <span className="text-[10px] font-black uppercase text-brand tracking-widest">
                              {recommendation.challenge.domain}
                            </span>
                            <h4 className="font-display text-balance text-lg font-black text-ink">
                              {recommendation.challenge.title}
                            </h4>
                            <p className="text-xs text-ink/70 line-clamp-2 mt-0.5">
                              {recommendation.challenge.description}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            {recommendation.recommendationType === "EXPLORATION" && (
                              <button
                                onClick={handleRerollRecommendation}
                                disabled={isRerolling}
                                className="inline-flex items-center justify-center gap-2 rounded-xl border border-ink/10 bg-white px-4 py-2.5 text-xs font-bold text-ink/60 shrink-0 cursor-pointer disabled:opacity-50 hover:bg-surface transition-colors"
                              >
                                {isRerolling ? (
                                  <Loader2 className="size-4 animate-spin" />
                                ) : (
                                  "Pas celui-ci"
                                )}
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setStatus(recommendation.challenge.id, "in_progress");
                                setOpenId(recommendation.challenge.id);
                              }}
                              disabled={isRerolling}
                              className="press-brand inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-xs font-bold text-white shrink-0 cursor-pointer disabled:opacity-50"
                            >
                              <Play className="size-4 fill-white" />
                              <span>Commencer cette mission</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 🧪 Unified Lab Panel */}
                  <div
                    id="genizio-lab"
                    className="rounded-3xl border border-ink/10 bg-sky-50/80 p-6 shadow-md md:p-8 backdrop-blur-md"
                  >
                    <div className="mb-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="grid place-items-center rounded-2xl bg-brand p-2.5 text-white border border-ink/10 shadow-sm">
                          <Beaker className="size-6" />
                        </span>
                        <div>
                          <h3 className="font-display text-balance text-xl font-bold">
                            Composer un défi ciblé
                          </h3>
                          <p className="text-xs font-bold text-ink/60">
                            Générez un défi d'apprentissage ou fusionnez un devoir pour {child.name}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Homework Mode Switcher */}
                    <HomeworkModeToggle
                      mode={labMode}
                      onModeChange={(m) => {
                        setLabMode(m);
                        setCurrentGeneratedChallenge(null);
                      }}
                      className="mb-6"
                    />

                    {labMode === "free" ? (
                      <div className="mt-6 grid gap-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-2">
                              Sélectionner l'Intelligence
                            </label>
                            <select
                              value={selectedCategory}
                              onChange={(e) => setSelectedCategory(e.target.value)}
                              className="block w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 transition-all cursor-pointer shadow-sm"
                            >
                              {CATEGORIES.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                  {cat.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-2">
                              Origine du matériel
                            </label>
                            <select
                              value={materialScope}
                              onChange={(e: any) => setMaterialScope(e.target.value)}
                              className="block w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 transition-all cursor-pointer shadow-sm"
                            >
                              <option value="mixed">Mixte (Peu importe)</option>
                              <option value="home">Maison (Intérieur)</option>
                              <option value="outdoor">Nature & Extérieur</option>
                              <option value="buy">À acheter (Supermarché/Papeterie)</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <button
                            onClick={handleGenerateSingle}
                            disabled={isGeneratingSingle || accessExpired}
                            className="w-full rounded-2xl border border-ink/10 bg-brand px-5 py-3 text-sm font-bold text-white shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:cursor-wait flex items-center justify-center gap-2 cursor-pointer"
                          >
                            {isGeneratingSingle ? (
                              <>
                                <Loader2 className="size-4 animate-spin text-white" />
                                <span className="text-white">Composition...</span>
                              </>
                            ) : (
                              <>
                                <Play className="size-4 fill-current text-white" />
                                <span className="text-white">Lancer</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-6">
                        <AcademicHomeworkInput
                          childAge={child.age}
                          childName={child.name}
                          detectedGaps={academicGaps}
                          onGenerate={handleGenerateAcademicHomework}
                          isGenerating={isGeneratingAcademic}
                        />
                      </div>
                    )}

                    {/* Loader display */}
                    {(isGeneratingSingle || isGeneratingAcademic) && (
                      <div className="mt-8 flex flex-col items-center justify-center py-6 text-center border-t-[3px] border-dashed border-ink">
                        <NayaAvatar
                          size="md"
                          thoughts={isGeneratingAcademic ? ACADEMIC_LOADING_STEPS : LOADING_STEPS}
                          className="mb-4"
                        />
                        <p className="text-sm font-bold text-indigo-600 animate-pulse">
                          {isGeneratingAcademic
                            ? ACADEMIC_LOADING_STEPS[
                                loadingTextIndex % ACADEMIC_LOADING_STEPS.length
                              ]
                            : LOADING_STEPS[loadingTextIndex]}
                        </p>
                      </div>
                    )}

                    {/* Generated challenge display */}
                    {currentGeneratedChallenge && !isGeneratingSingle && !isGeneratingAcademic && (
                      <div className="mt-6 rounded-2xl border border-ink/10 bg-white p-6 shadow-sm animate-in fade-in slide-in-from-top-3 duration-300">
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="rounded-full bg-brand px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white border border-ink/10">
                              {currentGeneratedChallenge.domain}
                            </span>
                            {currentGeneratedChallenge.academic_grade_level && (
                              <span className="rounded-full bg-amber-100 text-amber-900 border border-amber-300 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider inline-flex items-center gap-1">
                                <BookOpen className="size-3" />
                                Devoir •{" "}
                                {GRADE_LEVEL_METADATA[
                                  currentGeneratedChallenge.academic_grade_level as GradeLevel
                                ]?.label ?? currentGeneratedChallenge.academic_grade_level}{" "}
                                •{" "}
                                {ACADEMIC_SUBJECT_LABELS[
                                  currentGeneratedChallenge.academic_subject as AcademicSubject
                                ] ??
                                  currentGeneratedChallenge.academic_subject ??
                                  ""}
                              </span>
                            )}
                            <DifficultyBadge difficulty={currentGeneratedChallenge.difficulty} />
                          </div>
                          <span className="text-xs text-ink/60 font-semibold">
                            🕒 {currentGeneratedChallenge.duration}
                          </span>
                        </div>
                        <h4 className="font-display text-balance text-xl font-extrabold leading-tight text-ink mb-2">
                          {currentGeneratedChallenge.title}
                        </h4>
                        <div className="text-sm text-ink/70 leading-relaxed mb-4">
                          <MarkdownContent content={currentGeneratedChallenge.description} />
                        </div>

                        {formatPedagogicalIntention(
                          currentGeneratedChallenge.pedagogical_context,
                        ) && (
                          <div className="mb-4 rounded-xl bg-amber-50 border border-ink/10 p-4 text-xs leading-relaxed text-amber-800">
                            <h5 className="text-[13px] font-bold text-ink mb-1.5 flex items-center gap-1.5">
                              💡 Analyse stratégique (Naya)
                            </h5>
                            <MarkdownContent
                              content={formatPedagogicalIntention(
                                currentGeneratedChallenge.pedagogical_context,
                              )!}
                              inline
                            />
                          </div>
                        )}

                        <div className="grid gap-4  mb-6">
                          <div>
                            <h5 className="text-[10px] font-bold uppercase tracking-wider text-ink/60 mb-2">
                              Étapes du défi
                            </h5>
                            <ol className="text-xs space-y-2 text-ink/80 list-decimal pl-4 break-words">
                              {currentGeneratedChallenge.steps.map((step: string, idx: number) => (
                                <li key={idx} className="break-words leading-relaxed">
                                  <MarkdownContent content={step} inline />
                                </li>
                              ))}
                            </ol>
                          </div>
                          <div>
                            <h5 className="text-[10px] font-bold uppercase tracking-wider text-ink/60 mb-2">
                              Matériel requis
                            </h5>
                            <ul className="text-xs space-y-1.5 text-ink/80 list-disc pl-4 break-words">
                              {currentGeneratedChallenge.materials.map(
                                (mat: string, idx: number) => (
                                  <li key={idx} className="break-words leading-relaxed">
                                    {mat}
                                  </li>
                                ),
                              )}
                            </ul>
                          </div>
                        </div>

                        <div className="mb-6">
                          <KitSuggestion
                            childId={profileId}
                            materialTags={currentGeneratedChallenge.material_tags}
                            challengeTitle={currentGeneratedChallenge.title}
                            childName={child.name}
                          />
                        </div>

                        <div className="flex gap-2 border-t-[3px] border-ink pt-4">
                          <button
                            onClick={handleAssignSingle}
                            disabled={isAssigningSingle}
                            className="flex-1 rounded-xl border border-ink/10 bg-brand py-2.5 text-center text-xs font-bold text-white shadow-sm hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            {isAssigningSingle ? (
                              <>
                                <Loader2 className="size-3.5 animate-spin" />
                                <span>Assignation...</span>
                              </>
                            ) : (
                              <>
                                <Check className="size-3.5" />
                                <span>Assigner ce défi à {child.name}</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={handleGenerateSingle}
                            disabled={isGeneratingSingle || accessExpired}
                            className="rounded-xl border border-ink/10 bg-white px-4 py-2.5 text-xs font-bold text-ink/60 shadow-sm hover:-translate-y-0.5 transition-all disabled:opacity-50 cursor-pointer"
                          >
                            Relancer
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <h3 className="font-display text-balance text-xl font-bold flex items-center gap-2">
                    <Calendar className="size-5 text-indigo-500" />
                    Feuille de Route des Défis ({challenges.length})
                  </h3>

                  {error && (
                    <p className="rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-700 font-bold">
                      {error}
                    </p>
                  )}

                  {challenges.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-ink/20 bg-white/40 p-16 text-center shadow-sm">
                      <p className="mb-2 text-lg font-bold">Aucune expérience entamée</p>
                      <p className="mb-6 text-sm text-ink/70 font-medium max-w-sm mx-auto">
                        Démarrez des expériences sur-mesure pour {child.name} via le générateur IA
                        ou laissez Naya composer une première liste de base.
                      </p>
                      <div className="flex justify-center gap-3">
                        <button
                          onClick={handleGenerate}
                          disabled={generating || accessExpired}
                          className="rounded-2xl border border-ink/10 bg-brand px-6 py-3.5 text-sm font-bold text-white shadow-xl hover:-translate-y-0.5 disabled:opacity-60 transition-all flex items-center gap-2 cursor-pointer"
                        >
                          <WandSparkles className="size-4 animate-pulse" />✨ Déposer 4 nouveaux
                          défis Naya
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => setStatusFilter("all")}
                          className={`rounded-xl border border-ink/10 px-3 py-1.5 text-xs font-bold transition-all ${
                            statusFilter === "all"
                              ? "bg-ink text-white shadow-sm"
                              : "bg-white text-ink/65 hover:bg-surface"
                          }`}
                        >
                          Tous ({challenges.length})
                        </button>
                        {CHALLENGE_STATUSES.map((s) => {
                          const count = challenges.filter((c) => c.status === s).length;
                          return (
                            <button
                              key={s}
                              onClick={() => setStatusFilter(s)}
                              className={`rounded-xl border border-ink/10 px-3 py-1.5 text-xs font-bold transition-all ${
                                statusFilter === s
                                  ? "bg-ink text-white shadow-sm"
                                  : "bg-white text-ink/65 hover:bg-surface"
                              }`}
                            >
                              {STATUS_LABEL[s]} ({count})
                            </button>
                          );
                        })}
                      </div>

                      {(() => {
                        const filteredChallenges =
                          statusFilter === "all"
                            ? challenges
                            : challenges.filter((c) => c.status === statusFilter);
                        if (filteredChallenges.length === 0) {
                          return (
                            <div className="rounded-3xl border border-dashed border-ink/20 bg-white/40 p-10 text-center shadow-sm">
                              <p className="text-ink/65 font-bold">Aucun défi avec ce statut.</p>
                            </div>
                          );
                        }
                        return (
                          <div className="space-y-5">
                            {filteredChallenges.map((c) => (
                              <ChallengeCard
                                key={c.id}
                                c={c}
                                childId={profileId}
                                childName={child.name}
                                open={openId === c.id}
                                hasKit={hasKit(c.material_tags)}
                                onToggle={() => setOpenId((v) => (v === c.id ? null : c.id))}
                                onStatus={(s) => setStatus(c.id, s)}
                                onNotCompleted={(reason) => markChallengeNotCompleted(c.id, reason)}
                                onProgress={(p) => setProgress(c.id, p)}
                                onNotes={(n) => saveNotes(c.id, n)}
                                onDelete={() => openDeleteDialog(c.id)}
                                onValidated={async () => {
                                  await refetch();
                                  await loadAISynthesis();
                                }}
                              />
                            ))}
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div>
              </div>
            </>
          ) : (
            /* Vue Enfant / Mode Quête */
            <div className="space-y-6">
              <div className="rounded-3xl border border-brand/20 bg-gradient-to-br from-amber-50 via-sky-50 to-emerald-50 p-6 md:p-10 shadow-xl text-center relative overflow-hidden">
                <div className="flex flex-col items-center justify-center max-w-lg mx-auto">
                  <NayaAvatar
                    size="md"
                    className="mb-3"
                    thoughts={[`Prêt pour l'aventure, ${child.name} ?`]}
                  />
                  <h2 className="font-display text-balance text-2xl md:text-3xl font-black text-ink mb-2">
                    Mode Quête 🎮
                  </h2>
                  <p className="text-sm text-ink/70 font-semibold mb-6">
                    Rejoins ton espace d'exploration et accomplis tes missions pas à pas !
                  </p>

                  {(() => {
                    const active = getActiveChallenge(challenges);
                    const stepsList = Array.isArray(active?.steps)
                      ? active.steps
                      : typeof active?.steps === "string"
                        ? (() => {
                            try {
                              return JSON.parse(active.steps);
                            } catch {
                              return [];
                            }
                          })()
                        : [];

                    if (active) {
                      return (
                        <div className="w-full bg-white rounded-3xl p-6 border border-ink/10 shadow-md text-left space-y-5">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <span className="rounded-full bg-brand px-3.5 py-1 text-[11px] font-black uppercase tracking-wider text-white">
                              Mission active : {active.domain}
                            </span>
                            <span className="text-xs font-bold text-ink/60">
                              ⏱ {active.duration}
                            </span>
                          </div>
                          <div>
                            <h3 className="font-display text-balance text-xl font-black text-ink leading-tight">
                              {active.title}
                            </h3>
                            <div className="text-sm text-ink/70 mt-1 line-clamp-3">
                              <MarkdownContent content={active.description} />
                            </div>
                          </div>

                          {/* Progress bar / step info */}
                          <div className="bg-surface rounded-2xl p-4 border border-ink/5 space-y-2">
                            <div className="flex items-center justify-between text-xs font-bold">
                              <span className="text-ink/70">
                                Étapes à réaliser : {stepsList.length}
                              </span>
                              <span className="text-brand font-black">
                                {active.progress || 0}% complété
                              </span>
                            </div>
                            <div className="w-full bg-stone-200 h-3 rounded-full overflow-hidden border border-ink/5">
                              <div
                                className="bg-brand h-full transition-all duration-500"
                                style={{ width: `${active.progress || 0}%` }}
                              />
                            </div>
                          </div>

                          <Link
                            to="/profiles/$profileId/quest"
                            params={{ profileId }}
                            className="w-full inline-flex items-center justify-center gap-2 rounded-2xl border border-ink/10 bg-brand px-6 py-4 text-base font-black text-white shadow-xl hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
                          >
                            <Play className="size-5 fill-current" />
                            <span>Lancer la Quête 🚀</span>
                          </Link>
                        </div>
                      );
                    }

                    return (
                      <div className="w-full bg-white rounded-3xl p-8 border border-ink/10 shadow-md text-center space-y-4">
                        <p className="text-base font-bold text-ink/75">
                          Tu n'as pas de mission active pour l'instant ! 🌟
                        </p>
                        <p className="text-xs text-ink/60 font-medium">
                          Demande à tes parents de t'en attribuer une nouvelle depuis l'Espace
                          Parent, ou accède à la Carte des Quêtes.
                        </p>
                        <div className="pt-2">
                          <Link
                            to="/profiles/$profileId/quest"
                            params={{ profileId }}
                            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-ink/10 bg-sky px-6 py-3.5 text-sm font-black text-ink shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
                          >
                            <span>Voir la Carte des Quêtes 🗺️</span>
                          </Link>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal Recommandation de Kit Post-Assignation */}
      {assignedChallengeForKit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-ink/55 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-md rounded-3xl border border-ink/10 bg-white p-6 shadow-xl md:p-8">
            <button
              onClick={() => setAssignedChallengeForKit(null)}
              className="absolute right-4 top-4 rounded-xl border border-ink/10 bg-stone-100 p-1.5 hover:bg-stone-200 transition-colors"
            >
              <X className="size-4" />
            </button>

            <div className="mb-4 flex items-center gap-2">
              <ShoppingBag className="size-6 text-brand" />
              <h2 className="font-display text-balance text-2xl font-black">
                Défi assigné avec succès ! 🎉
              </h2>
            </div>

            <p className="text-sm text-ink/75 leading-relaxed mb-6">
              Naya a préparé le défi{" "}
              <strong className="text-ink">"{assignedChallengeForKit.title}"</strong>.
              Souhaitez-vous commander le kit matériel associé maintenant ?
            </p>

            <div className="rounded-2xl border border-ink/10 bg-sky/15 p-4 mb-6">
              <ul className="space-y-1.5 mb-3">
                {assignedChallengeForKit.products.map((p) => (
                  <li key={p.id} className="flex justify-between text-sm font-bold text-ink">
                    <span>{p.name}</span>
                    <span>{p.price_xof.toLocaleString("fr-FR")} FCFA</span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-between border-t border-ink/20 pt-2 text-sm font-black text-ink">
                <span>Total</span>
                <span>
                  {assignedChallengeForKit.products
                    .reduce((sum, p) => sum + p.price_xof, 0)
                    .toLocaleString("fr-FR")}{" "}
                  FCFA
                </span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setAssignedChallengeForKit(null)}
                className="flex-1 rounded-xl border border-ink/10 bg-stone-100 py-3 text-sm font-bold hover:bg-stone-200 transition-all cursor-pointer text-center"
              >
                Faire sans kit
              </button>
              <button
                onClick={handleOrderKit}
                disabled={orderingKit}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-ink/10 bg-leaf py-3 text-sm font-bold text-white shadow-sm hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer disabled:opacity-50"
              >
                {orderingKit ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Envoi...
                  </>
                ) : (
                  <>Commander le kit</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suppression différenciée (Décision #58) : défi terminé → modal danger
          + saisie du titre ; non terminé → chips de raison en 1 tap (le signal
          alimente le Loup via challenge_outcomes). */}
      <ChallengeDeleteDialog
        challenge={deleteDialog}
        open={!!deleteDialog}
        deleting={deletingChallenge}
        onClose={() => setDeleteDialog(null)}
        onDelete={handleDeleteChallenge}
      />
    </div>
  );
}

function MaterialsChecklist({ materials }: { materials: string[] }) {
  const [checked, setChecked] = useState<boolean[]>(new Array(materials.length).fill(false));

  return (
    <div>
      <p className="mb-2.5 text-[10px] font-extrabold uppercase tracking-widest text-ink/60">
        Matériel requis & rassemblé
      </p>
      <div className="flex flex-wrap gap-2">
        {materials.map((m, i) => (
          <button
            key={i}
            onClick={() => {
              const copy = [...checked];
              copy[i] = !copy[i];
              setChecked(copy);
            }}
            className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${
              checked[i]
                ? "bg-leaf border-ink text-white"
                : "bg-white border-ink text-ink/70 hover:bg-surface"
            }`}
          >
            <div
              className={`size-3.5 rounded flex items-center justify-center border ${
                checked[i] ? "border-white bg-white text-leaf" : "border-ink/30"
              }`}
            >
              {checked[i] && <Check className="size-2 stroke-[3px]" />}
            </div>
            <span>{m}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ChallengeCard({
  c,
  childId,
  childName,
  open,
  onToggle,
  onStatus,
  onNotCompleted,
  onProgress,
  onNotes,
  onDelete,
  onValidated,
  hasKit,
}: {
  c: Challenge;
  childId: string;
  childName: string;
  open: boolean;
  onToggle: () => void;
  onStatus: (s: Challenge["status"]) => void;
  onNotCompleted: (reason: string) => void;
  onProgress: (p: number) => void;
  onNotes: (n: string) => void;
  onDelete: () => void;
  onValidated: () => void;
  hasKit?: boolean;
}) {
  const [notesDraft, setNotesDraft] = useState(c.notes ?? "");
  const [savedFlash, setSavedFlash] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  if (!open) {
    // Unexpanded state: A clean compact card that feels like the prototype
    return (
      <div
        id={`challenge-${c.id}`}
        className="rounded-[1.5rem] bg-white p-5 shadow-sm border border-border transition-all flex flex-col gap-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="rounded-full bg-surface px-[11px] py-[5px] text-[12px] font-bold text-ink border border-border">
              {c.domain}
            </span>
            {c.academic_grade_level && (
              <span className="rounded-full bg-amber-100 text-amber-900 border border-amber-300 px-[11px] py-[5px] text-[12px] font-bold inline-flex items-center gap-1">
                <BookOpen className="size-3 shrink-0" />
                Devoir •{" "}
                {GRADE_LEVEL_METADATA[c.academic_grade_level as GradeLevel]?.label ??
                  c.academic_grade_level}{" "}
                •{" "}
                {ACADEMIC_SUBJECT_LABELS[c.academic_subject as AcademicSubject] ??
                  c.academic_subject ??
                  ""}
              </span>
            )}
            {c.academic_level_age != null && c.academic_domain && (
              <span className="rounded-full bg-cyan-100 text-cyan-900 border border-cyan-300 px-[11px] py-[5px] text-[12px] font-bold inline-flex items-center gap-1">
                <Globe className="size-3 shrink-0" />
                {internationalLevelLabel(c.academic_level_age)}
              </span>
            )}
            <DifficultyBadge difficulty={c.difficulty} />
          </div>
          <span
            className={`rounded-full px-[11px] py-[5px] text-[12px] font-bold ${STATUS_STYLE[c.status]}`}
          >
            {STATUS_LABEL[c.status]}
          </span>
        </div>
        <div>
          <h3 className="font-display text-balance text-[20px] font-bold text-ink leading-tight mb-1">
            {c.title}
          </h3>
          <div className="text-[14px] text-ink/60 line-clamp-2">
            <MarkdownContent content={c.description} />
          </div>
        </div>
        <button
          onClick={onToggle}
          className="w-full h-[44px] rounded-full border border-border bg-surface text-[14px] font-bold text-ink shadow-sm hover:bg-surface/80 transition-all flex items-center justify-center cursor-pointer"
        >
          Voir le défi →
        </button>
      </div>
    );
  }

  // Expanded state: The exact prototype "DÉFI — DÉTAIL" layout
  return (
    <div
      id={`challenge-${c.id}`}
      className="rounded-[26px] overflow-hidden bg-surface shadow-md transition-all border border-border"
    >
      {/* 2. DÉFI — DÉTAIL (Prototype equivalent) */}
      <div className="relative px-5 pt-3 pb-7 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-[#df8f3e] to-[#a35e16]"></div>
        <div
          className="absolute -top-[30px] -right-[20px] w-[170px] h-[170px]"
          style={{ background: "radial-gradient(circle,rgba(255,255,255,.3),transparent 70%)" }}
        ></div>
        <div className="relative">
          <button
            onClick={onToggle}
            className="w-[38px] h-[38px] border-none rounded-full bg-white/25 text-white flex items-center justify-center cursor-pointer mb-[14px]"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <div className="flex flex-wrap gap-[7px] mb-3 items-center">
            <span className="px-[11px] py-[5px] bg-white/20 rounded-full text-white text-[12px] font-bold">
              {c.domain}
            </span>
            {c.academic_grade_level && (
              <span className="inline-flex items-center gap-1 px-[11px] py-[5px] bg-amber-400/90 text-amber-950 rounded-full text-[12px] font-extrabold">
                <BookOpen className="size-3 shrink-0" />
                Devoir •{" "}
                {GRADE_LEVEL_METADATA[c.academic_grade_level as GradeLevel]?.label ??
                  c.academic_grade_level}{" "}
                •{" "}
                {ACADEMIC_SUBJECT_LABELS[c.academic_subject as AcademicSubject] ??
                  c.academic_subject ??
                  ""}
              </span>
            )}
            {c.academic_level_age != null && c.academic_domain && (
              <span className="inline-flex items-center gap-1 px-[11px] py-[5px] bg-cyan-400/90 text-cyan-950 rounded-full text-[12px] font-extrabold">
                <Globe className="size-3 shrink-0" />
                {internationalLevelLabel(c.academic_level_age)}
              </span>
            )}
            <DifficultyBadge difficulty={c.difficulty} />
            <span className="inline-flex items-center gap-1 px-[11px] py-[5px] bg-white/20 rounded-full text-white text-[12px] font-bold">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.5 2.3a.5.5 0 0 1 1 0l2.3 4.6 5.1.75a.5.5 0 0 1 .3.86l-3.7 3.6.87 5.1a.5.5 0 0 1-.77.53L12 15.9l-4.6 2.4a.5.5 0 0 1-.77-.53l.88-5.1-3.7-3.6a.5.5 0 0 1 .29-.86l5.1-.75z" />
              </svg>
              180 XP
            </span>
          </div>
          <div className="font-display text-balance font-bold text-[30px] text-white leading-[1.02]">
            {c.title}
          </div>
        </div>
      </div>

      <div className="px-5 pt-5 pb-0 -mt-[14px] bg-surface rounded-t-[26px] relative">
        <div className="flex gap-3 items-start bg-brand-50 rounded-[1rem] p-[14px] mb-5">
          <img
            src="/naya-mascot.png"
            alt="Naya"
            className="w-[40px] h-[40px] rounded-full object-cover shrink-0"
          />
          <div className="text-[14px] leading-[1.45] text-ink">
            <b className="text-brand">Naya&nbsp;:</b> J'ai préparé ce défi spécialement pour toi.
            Montre-moi de quoi tu es capable !
          </div>
        </div>

        <div className="font-display text-balance font-bold text-[16px] mb-2">Ton objectif</div>
        <div className="bg-card border border-border rounded-[1rem] p-4 text-[15px] leading-[1.5] text-ink shadow-sm mb-[22px]">
          <MarkdownContent content={c.description} />
        </div>

        {c.status === "completed" ? (
          <AcademicSecretCard
            secret={c.academic_secret}
            academicGradeLevel={c.academic_grade_level}
          />
        ) : c.steps && c.steps.length > 0 ? (
          <div className="mb-[22px]">
            <StepAccordion steps={c.steps} />
          </div>
        ) : null}

        <div className="font-display text-balance font-bold text-[16px] mb-[10px]">
          Ce que tu développes
        </div>
        <div className="flex flex-wrap gap-[9px] mb-[22px]">
          <span className="px-[14px] py-[9px] bg-brand-50 text-brand-700 rounded-full font-bold text-[13px]">
            {c.domain}
          </span>
          <span className="px-[14px] py-[9px] bg-leaf-50 text-leaf-dark rounded-full font-bold text-[13px]">
            Créativité
          </span>
          <span className="px-[14px] py-[9px] bg-sky-50 text-sky-dark rounded-full font-bold text-[13px]">
            Persévérance
          </span>
        </div>

        {c.materials && c.materials.length > 0 && (
          <>
            <div className="font-display text-balance font-bold text-[16px] mb-[10px]">
              Le matériel
            </div>
            <div className="grid grid-cols-2 gap-[10px] mb-[24px]">
              {c.materials.map((m, i) => (
                <div
                  key={i}
                  className="flex items-center gap-[9px] bg-card border border-border rounded-[12px] px-[13px] py-[11px] text-[14px] font-semibold"
                >
                  <span
                    className={`w-[8px] h-[8px] rounded-full ${["bg-brand", "bg-leaf", "bg-sky-dark", "bg-pink-500"][i % 4]}`}
                  ></span>
                  <span className="truncate">{m}</span>
                </div>
              ))}
            </div>
          </>
        )}

        <div className="pb-5">
          {(() => {
            // Correctif (2026-08-02) : ce bouton n'apparaissait qu'une fois le défi "en
            // cours" — un défi tout juste assigné/généré (statut "todo", jamais démarré)
            // n'avait aucun moyen de le signaler non réussi (matériel manquant, pas
            // adapté...) avant même d'avoir cliqué "Commencer". Extrait ici pour être
            // proposé dans les deux statuts sans dupliquer la logique.
            const notCompletedButton = (
              <button
                onClick={() => {
                  if (!notesDraft.trim()) {
                    toast.error(
                      "Écris d'abord ce qui s'est passé dans le journal d'apprentissage ci-dessous, pour que Naya comprenne pourquoi.",
                    );
                    return;
                  }
                  onNotCompleted(notesDraft.trim());
                }}
                className="w-full flex items-center justify-center bg-transparent text-ink/50 font-bold h-[40px] text-[13px] rounded-full cursor-pointer hover:text-rose-600 transition-all"
              >
                Le défi n'a pas pu être fait
              </button>
            );

            if (c.status === "todo") {
              return (
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => onStatus("in_progress")}
                    className="w-full flex items-center justify-center bg-brand text-white font-bold h-[56px] text-[16px] rounded-full cursor-pointer shadow-sm hover:bg-brand/90 transition-all"
                  >
                    Commencer le défi
                  </button>
                  {notCompletedButton}
                </div>
              );
            }

            if (c.status === "in_progress") {
              return (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 font-bold py-3 text-[14px] rounded-2xl px-4 text-center">
                    <CheckCircle2 className="size-5 flex-shrink-0" /> Défi débuté. Nous attendons
                    vos validations à la fin de ce défi.
                  </div>
                  <Link
                    to="/profiles/$profileId/quest"
                    params={{ profileId: childId }}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-brand text-white font-bold h-[56px] text-[16px] shadow-sm hover:bg-brand/90 transition-all cursor-pointer"
                  >
                    Valider le défi (Mode Enfant) 📸
                  </Link>
                </div>
              );
            }
            return null;
          })()}
          {c.status === "not_completed" ? (
            <div className="flex flex-col items-center justify-center gap-1 bg-rose-50 text-rose-700 font-bold py-3 text-[16px] rounded-2xl px-4">
              <span className="flex items-center gap-2">
                <X className="size-5" /> Défi non réussi
              </span>
              {c.not_completed_reason && (
                <span className="text-[12px] font-medium text-rose-700/80 text-center">
                  {c.not_completed_reason}
                </span>
              )}
            </div>
          ) : c.status === "completed" ? (
            <div className="flex items-center justify-center gap-2 bg-emerald-50 text-emerald-700 font-bold h-[56px] text-[16px] rounded-full">
              <CheckCircle2 className="size-5" /> Défi accompli !
            </div>
          ) : null}
        </div>
      </div>

      {/* 3. DÉFI EN COURS (Parent pane + details) */}
      <div className="px-5 pb-5 mt-2 pt-5 border-t border-border bg-surface">
        <h4 className="font-display text-balance text-[16px] font-bold text-ink/60 uppercase tracking-widest mb-4">
          Espace Parent
        </h4>

        {/* pedagogical context */}
        {formatPedagogicalIntention(c.pedagogical_context) && (
          <div className="rounded-[1rem] bg-brand-50 p-4 flex gap-3 mb-6">
            <Brain className="size-5 text-brand flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-brand mb-1">
                Analyse stratégique de Naya
              </p>
              <p className="text-[13px] text-brand-700 leading-relaxed italic">
                "
                <MarkdownContent
                  content={formatPedagogicalIntention(c.pedagogical_context)!}
                  inline
                />
                "
              </p>
            </div>
          </div>
        )}

        <KitSuggestion
          childId={childId}
          challengeId={c.id}
          materialTags={c.material_tags}
          challengeTitle={c.title}
          childName={childName}
        />

        {/* Parent Notes */}
        <div className="space-y-3 mb-6">
          <p className="text-[11px] font-bold uppercase tracking-widest text-ink/60">
            Journal d'apprentissage du parent
          </p>
          <textarea
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value.slice(0, 2000))}
            rows={3}
            placeholder="Écrivez ce que l'enfant a fait, ses réussites et difficultés..."
            className="w-full rounded-[1rem] border border-border bg-white px-4 py-3 text-[14px] outline-none focus:ring-2 focus:ring-brand transition-all resize-none shadow-sm"
          />
          <div className="flex items-center justify-between">
            <button
              onClick={async () => {
                setIsSavingNotes(true);
                try {
                  await onNotes(notesDraft);
                  setSavedFlash(true);
                  setTimeout(() => setSavedFlash(false), 1500);
                } finally {
                  setIsSavingNotes(false);
                }
              }}
              disabled={isSavingNotes}
              className="inline-flex items-center gap-2 rounded-full bg-ink px-5 py-2.5 text-[13px] font-bold text-white shadow-sm hover:bg-ink/80 transition-all cursor-pointer disabled:opacity-60"
            >
              {isSavingNotes ? <Loader2 className="size-4 animate-spin" /> : null}
              Enregistrer les notes
            </button>
            {savedFlash && (
              <span className="text-[13px] text-emerald-600 font-bold">✓ Enregistré</span>
            )}
          </div>

          {c.status === "in_progress" && (
            <div className="flex justify-start mt-4">
              <button
                onClick={() => {
                  if (!notesDraft.trim()) {
                    toast.error(
                      "Écris d'abord ce qui s'est passé dans le journal d'apprentissage, pour que Naya comprenne pourquoi.",
                    );
                    return;
                  }
                  onNotCompleted(notesDraft.trim());
                }}
                className="inline-flex items-center gap-1.5 bg-transparent text-ink/50 font-bold text-[13px] hover:text-rose-600 transition-all cursor-pointer"
              >
                Le défi n'a pas pu être fait
              </button>
            </div>
          )}
        </div>

        {/* Validation section is no longer rendered here, AI analysis is triggered in child mode */}

        {/* AI Observations feedback */}
        {c.ai_observations && (
          <div className="rounded-[1rem] bg-leaf-50 p-5 mb-6">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-widest text-leaf-dark flex items-center gap-1">
              <Brain className="size-4 text-leaf-dark" />
              Analyse de Naya (IA)
            </p>
            <p className="text-[14px] italic text-ink/80 leading-relaxed mb-3">
              "<MarkdownContent content={c.ai_observations} inline />"
            </p>
            <p className="text-[10px] font-extrabold text-leaf-dark uppercase tracking-wider">
              ✓ La Carte des Talents de l'enfant a été enrichie !
            </p>
          </div>
        )}

        <div className="flex justify-end pt-5 border-t border-border mt-6">
          <button
            onClick={onDelete}
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white px-4 py-2 text-[13px] font-bold text-red-600 hover:bg-red-50 transition-all cursor-pointer"
          >
            <Trash2 className="size-4" />
            Supprimer ce défi
          </button>
        </div>
      </div>
    </div>
  );
}

function AcademicSecretCard({
  secret,
  academicGradeLevel,
}: {
  secret?: string | null;
  academicGradeLevel?: string | null;
}) {
  return (
    <div className="mb-[22px] rounded-3xl bg-gradient-to-br from-amber-500/15 via-amber-400/10 to-cyan-500/15 p-5 border-2 border-amber-400/50 shadow-md relative overflow-hidden">
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <span className="grid place-items-center rounded-2xl bg-amber-500 p-2 text-white shadow-md">
          <KeyRound className="size-5" />
        </span>
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-800">
            L'Avantage Secret de Naya
          </span>
          <h4 className="font-display text-lg font-extrabold text-amber-950">
            Le Savoir Scientifique Caché
          </h4>
        </div>
        {academicGradeLevel && (
          <span className="ml-auto rounded-full bg-amber-200 text-amber-950 px-3 py-1 text-xs font-black border border-amber-300 shadow-xs">
            Niveau {academicGradeLevel}
          </span>
        )}
      </div>

      <div className="rounded-2xl bg-white/90 p-4 backdrop-blur-md border border-amber-200 text-sm leading-relaxed text-ink/90 font-medium shadow-xs">
        {secret ? (
          <MarkdownContent content={secret} />
        ) : (
          <p>
            Bravo pour la réalisation de ce défi ! En accomplissant ces gestes concrets sur le
            terrain, tu as développé une intuition physique et logique qui te donnera une longueur
            d'avance en classe !
          </p>
        )}
      </div>
    </div>
  );
}
