import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { AppHeader } from "@/components/AppHeader";
import { AppTabBar } from "@/components/AppTabBar";
import { toast } from "sonner";
import {
  User,
  Phone,
  ArrowLeft,
  Check,
  Loader2,
  Users,
  Calendar,
  Shield,
  LogOut,
  Eye,
  LayoutDashboard,
  Building2,
  GraduationCap,
  School,
  Edit3,
  AtSign,
  Hash,
  Sparkles,
  Search,
  X,
} from "lucide-react";
import { ConsentLedger } from "@/components/settings/ConsentLedger";
import { ExportDataButton } from "@/components/settings/ExportDataButton";
import { DeleteAccountDialog } from "@/components/settings/DeleteAccountDialog";
import { SubscriptionCard } from "@/components/settings/SubscriptionCard";
import { COUNTRIES } from "@/lib/countries";
import { RELATIONSHIP_TYPES } from "@/lib/relationship-types";
import { GenizioLoader } from "@/components/GenizioLoader";
import { checkAdminStatus } from "@/lib/admin.functions";
import { checkIsCampaignManager } from "@/lib/campaigns.functions";
import { isMentorMode, isEducatorMode } from "@/lib/mentor-mode";
import { saveMyEducatorProfile } from "@/lib/educators-lookup.functions";
import {
  checkIsActiveMentor,
  activateMentorCode,
  getMentorActivationStatus,
  setMentorMode,
} from "@/lib/mentors.functions";
import {
  searchSchools,
  suggestSchool,
  type SchoolItem,
  type SchoolType,
} from "@/lib/schools.functions";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { session, loading } = useSession();
  const navigate = useNavigate();

  // Univers Mentor (décision #81) : la carte résumé bascule « Compte Mentor »
  // avec le nombre d'enfants assignés ; les actions parent (gérer les profils,
  // lien avec l'enfant) sont masquées.
  const mentorMode = isMentorMode(session);
  const educatorMode = isEducatorMode(session);

  const [phoneNumber, setPhoneNumber] = useState("");
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [savingPhone, setSavingPhone] = useState(false);

  const [relationshipType, setRelationshipType] = useState("");
  const [savingRelationship, setSavingRelationship] = useState(false);

  // Parent Stats
  const [childCount, setChildCount] = useState(0);
  const [challengeStats, setChallengeStats] = useState({ total: 0, completed: 0 });
  const [artifactsCount, setArtifactsCount] = useState(0);
  const [consentEventsCount, setConsentEventsCount] = useState(0);
  const [isMentor, setIsMentor] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isManager, setIsManager] = useState(false);
  const checkAdmin = useServerFn(checkAdminStatus);
  const checkManager = useServerFn(checkIsCampaignManager);
  const checkMentor = useServerFn(checkIsActiveMentor);

  // Activation du mode Mentor par code (Vague 5, spec §7) — carte « Paramètres → Mentor ».
  const activateFn = useServerFn(activateMentorCode);
  const [activationCode, setActivationCode] = useState("");
  const [activating, setActivating] = useState(false);
  const [activationStatus, setActivationStatus] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  // Mode Parent/Mentor/Éducateur (décisions #79, #81, Sprint C) : état d'activation
  // (certifié ? statut, casquette éducateur, mode courant) + bascule dynamique
  const getMentorStatus = useServerFn(getMentorActivationStatus);
  const switchModeFn = useServerFn(setMentorMode);
  const [mentorStatus, setMentorStatus] = useState<{
    certified: boolean;
    status: string;
    mode: "parent" | "mentor" | "educator";
    assignedCount?: number;
    hasEducator?: boolean;
    educatorProfile?: {
      id?: string;
      handle: string | null;
      fullName: string;
      organizationName: string | null;
      professionalRole: string;
      classCode: string | null;
      isVerified?: boolean;
      verificationStatus?: "pending" | "verified" | "suspended";
    } | null;
    delegatedStudentsCount?: number;
  } | null>(null);
  const [switchingMode, setSwitchingMode] = useState(false);

  // Profil Éducateur / Conseiller d'orientation (Sprint C)
  const saveEducatorProfileFn = useServerFn(saveMyEducatorProfile);
  const [savingEducator, setSavingEducator] = useState(false);
  const [educatorRole, setEducatorRole] = useState<
    "teacher" | "counselor" | "psychologist" | "other"
  >("teacher");
  const [educatorOrg, setEducatorOrg] = useState("");
  const [educatorHandle, setEducatorHandle] = useState("");
  const [educatorClassCode, setEducatorClassCode] = useState("");
  const [showEducatorForm, setShowEducatorForm] = useState(false);
  const [educatorSchoolId, setEducatorSchoolId] = useState<string | null>(null);
  const [educatorSchoolCode, setEducatorSchoolCode] = useState<string | null>(null);
  const [educatorSchoolCity, setEducatorSchoolCity] = useState<string | null>(null);
  const [educatorSchoolStatus, setEducatorSchoolStatus] = useState<string | null>(null);

  // Autocomplete écoles
  const searchSchoolsFn = useServerFn(searchSchools);
  const suggestSchoolFn = useServerFn(suggestSchool);
  const [schoolQuery, setSchoolQuery] = useState("");
  const [schoolSuggestions, setSchoolSuggestions] = useState<SchoolItem[]>([]);
  const [searchingSchools, setSearchingSchools] = useState(false);
  const [showSchoolDropdown, setShowSchoolDropdown] = useState(false);

  // Modal de déclaration d'un nouvel établissement
  const [showSuggestModal, setShowSuggestModal] = useState(false);
  const [suggestName, setSuggestName] = useState("");
  const [suggestCity, setSuggestCity] = useState("");
  const [suggestType, setSuggestType] = useState<SchoolType>("public");
  const [suggestIsLeader, setSuggestIsLeader] = useState(false);
  const [suggesting, setSuggesting] = useState(false);

  const handleActivateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activationCode.trim()) return;
    setActivating(true);
    setActivationStatus(null);
    try {
      const res = await activateFn({ data: { code: activationCode.trim() } });
      if (res.status === "ok") {
        setActivationStatus({
          ok: true,
          text: "Mode Mentor activé ! Vous pouvez maintenant ouvrir l'espace Mentor.",
        });
        setActivationCode("");
        setIsMentor(true);
        void refreshMentorStatus();
      } else {
        const msg =
          {
            invalid: "Code invalide. Vérifiez le code fourni par l'administration.",
            used: "Ce code a déjà été utilisé.",
            expired: "Ce code a expiré. Demandez-en un nouveau.",
            forbidden: "Action non autorisée.",
          }[res.status] ?? "Échec de l'activation du mode Mentor.";
        setActivationStatus({ ok: false, text: msg });
      }
    } catch (err: any) {
      setActivationStatus({
        ok: false,
        text: err?.message ?? "Erreur lors de l'activation du mode Mentor.",
      });
    } finally {
      setActivating(false);
    }
  };

  // Navigation et données séparées (2026-08-14) : la navigation dépend de la
  // présence de la session, mais les 8 requêtes ci-dessous sont keyées sur
  // userId (string stable) — le store de useSession ne propage une nouvelle
  // identité que sur changement réel du token/claims, et on ne rejoue pas
  // toutes ces requêtes pour un simple refresh.
  const userId = session?.user.id;
  const relationshipMeta = session?.user.user_metadata?.relationship_type as string | undefined;
  const savedPhone = session?.user.user_metadata?.phone as string | undefined;

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [session, loading, navigate]);

  useEffect(() => {
    if (!userId) return;
    checkAdmin().then(({ isAdmin }) => setIsAdmin(isAdmin));
    checkManager().then(({ isManager }) => setIsManager(isManager));
    // Mentor ACTIF (V1) : l'ancienne détection comptait toute ligne `mentors`,
    // y compris un mentor retiré ou banni — l'espace /mentor restait visible.
    // checkIsActiveMentor vérifie removed_at IS NULL + statut != banned.
    checkMentor().then(({ isMentor }) => setIsMentor(isMentor));
    setRelationshipType(relationshipMeta ?? "");

    // Load saved phone
    if (savedPhone) {
      const foundCountry = COUNTRIES.find((c) => savedPhone.startsWith(c.code));
      if (foundCountry) {
        setSelectedCountry(foundCountry);
        setPhoneNumber(savedPhone.replace(foundCountry.code, ""));
      }
    }

    // Fetch stats
    supabase
      .from("child_profiles")
      .select("id", { count: "exact" })
      .eq("user_id", userId)
      .then(({ count }) => {
        setChildCount(count || 0);
      });
    supabase
      .from("consent_events")
      .select("id", { count: "exact" })
      .then(({ count }) => {
        setConsentEventsCount(count || 0);
      });
    supabase
      .from("challenges")
      .select("status, proof_image_url")
      .eq("user_id", userId)
      .then(({ data }) => {
        if (data) {
          setChallengeStats({
            total: data.length,
            completed: data.filter((c) => c.status === "completed").length,
          });
          setArtifactsCount(
            data.filter((c) => c.status === "completed" && c.proof_image_url).length,
          );
        }
      });
  }, [userId, relationshipMeta, savedPhone, checkAdmin, checkManager]);

  // Statut d'activation mentor — lecture légère, keyée sur userId comme les 8
  // requêtes ci-dessus (ne rejoue pas pour un simple refresh de token).
  useEffect(() => {
    if (!userId) return;
    getMentorStatus()
      .then((res) => setMentorStatus(res as any))
      .catch((err) => console.error("Erreur statut mentor:", err));
  }, [userId, getMentorStatus]);

  const refreshMentorStatus = async () => {
    try {
      const res = await getMentorStatus();
      setMentorStatus(res as any);
    } catch (err) {
      console.error("Erreur statut mentor:", err);
    }
  };

  // Synchronisation du formulaire éducateur au chargement du statut
  useEffect(() => {
    if (mentorStatus?.educatorProfile) {
      setEducatorRole((mentorStatus.educatorProfile.professionalRole as any) || "teacher");
      setEducatorOrg(mentorStatus.educatorProfile.organizationName || "");
      setEducatorSchoolId((mentorStatus.educatorProfile as any).schoolId || null);
      setEducatorHandle(
        mentorStatus.educatorProfile.handle
          ? mentorStatus.educatorProfile.handle.replace(/^@/, "")
          : "",
      );
      setEducatorClassCode(
        mentorStatus.educatorProfile.classCode
          ? mentorStatus.educatorProfile.classCode.replace(/^#/, "")
          : "",
      );
    }
  }, [mentorStatus]);

  // Autocomplete temps réel pour la recherche d'établissement
  useEffect(() => {
    if (!showEducatorForm) return;
    if (schoolQuery.trim().length >= 2) {
      setSearchingSchools(true);
      const timer = setTimeout(() => {
        searchSchoolsFn({ data: { query: schoolQuery.trim(), limit: 8 } })
          .then((results) => {
            setSchoolSuggestions(results ?? []);
            setShowSchoolDropdown(true);
          })
          .catch((err) => console.error(err))
          .finally(() => setSearchingSchools(false));
      }, 250);
      return () => clearTimeout(timer);
    } else {
      setSchoolSuggestions([]);
      setShowSchoolDropdown(false);
    }
  }, [schoolQuery, showEducatorForm, searchSchoolsFn]);

  const handleSelectSchool = (school: SchoolItem) => {
    setEducatorSchoolId(school.id);
    setEducatorOrg(school.name);
    setEducatorSchoolCode(school.code);
    setEducatorSchoolCity(school.city);
    setEducatorSchoolStatus(school.status);
    setSchoolQuery("");
    setShowSchoolDropdown(false);
  };

  const handleClearSchool = () => {
    setEducatorSchoolId(null);
    setEducatorOrg("");
    setEducatorSchoolCode(null);
    setEducatorSchoolCity(null);
    setEducatorSchoolStatus(null);
    setSchoolQuery("");
  };

  const handleSuggestSchoolSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!suggestName.trim() || !suggestCity.trim()) {
      toast.error("Le nom et la ville sont obligatoires.");
      return;
    }
    setSuggesting(true);
    try {
      const res = await suggestSchoolFn({
        data: {
          name: suggestName.trim(),
          city: suggestCity.trim(),
          countryCode: "BF",
          type: suggestType,
          isLeader: suggestIsLeader,
        },
      });
      handleSelectSchool(res);
      setShowSuggestModal(false);
      setSuggestName("");
      setSuggestCity("");
      setSuggestIsLeader(false);
      toast.success(
        suggestIsLeader
          ? "Établissement enregistré ! Votre demande de direction sera validée par l'administration."
          : "Établissement enregistré et sélectionné !",
      );
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de l'enregistrement de l'établissement.");
    } finally {
      setSuggesting(false);
    }
  };

  const handleSwitchMode = async (mode: "parent" | "mentor" | "educator") => {
    if (!mentorStatus || mentorStatus.mode === mode || switchingMode) return;
    setSwitchingMode(true);
    try {
      await switchModeFn({ data: { mode } });
      // Le mode vit dans user_metadata : refreshSession tourne le token →
      // nouvelle identité → le store émet → l'AppTabBar (onglet « Mentor » / « Éducateur »)
      // réagit immédiatement.
      await supabase.auth.refreshSession();
      await refreshMentorStatus();
      toast.success(
        mode === "mentor"
          ? "Mode Mentor activé."
          : mode === "educator"
            ? "Mode Éducateur / Orientation activé."
            : "Mode Parent activé.",
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors du changement de mode.");
    } finally {
      setSwitchingMode(false);
    }
  };

  const handleSaveEducatorProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEducator(true);
    try {
      const saved = await saveEducatorProfileFn({
        data: {
          fullName:
            session?.user.user_metadata?.full_name ||
            session?.user.user_metadata?.name ||
            session?.user.email?.split("@")[0] ||
            "Professionnel",
          professionalRole: educatorRole,
          organizationName: educatorOrg.trim() || undefined,
          schoolId: educatorSchoolId || undefined,
          handle: educatorHandle.trim() || undefined,
          classCode: educatorClassCode.trim() || undefined,
        },
      });
      const status = (saved as any)?.verification_status as string | undefined;
      if (status === "pending") {
        toast.success(
          "Demande envoyée ! Votre espace professionnel sera activé après validation par l'administration Génizio.",
        );
      } else {
        toast.success("Profil professionnel enregistré et activé !");
      }
      setShowEducatorForm(false);
      await refreshMentorStatus();
      if (mentorStatus?.mode !== "educator") {
        await handleSwitchMode("educator");
      }
    } catch (err: any) {
      toast.error(err?.message || "Erreur lors de l'enregistrement du profil professionnel.");
    } finally {
      setSavingEducator(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  const handleSavePhone = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneNumber.length < selectedCountry.limit - 2) {
      toast.error(
        `Le numéro de téléphone doit contenir au moins ${selectedCountry.limit - 2} chiffres.`,
      );
      return;
    }
    setSavingPhone(true);
    try {
      const fullPhone = `${selectedCountry.code}${phoneNumber}`;
      const { error } = await supabase.auth.updateUser({
        data: { phone: fullPhone },
      });
      if (error) throw error;
      toast.success("Numéro de téléphone mis à jour avec succès !");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur d'enregistrement.");
    } finally {
      setSavingPhone(false);
    }
  };

  const handleSaveRelationshipType = async () => {
    if (!relationshipType) return;
    setSavingRelationship(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { relationship_type: relationshipType },
      });
      if (error) throw error;
      toast.success("Lien avec l'enfant mis à jour.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur d'enregistrement.");
    } finally {
      setSavingRelationship(false);
    }
  };

  if (loading || !session) {
    return (
      <div className="grid min-h-dvh place-items-center bg-surface">
        <GenizioLoader label="Chargement…" />
      </div>
    );
  }

  const availableModes: Array<{
    key: "parent" | "mentor" | "educator";
    label: string;
    icon: any;
    activeClass: string;
  }> = [
    {
      key: "parent",
      label: "Parent (Famille)",
      icon: Users,
      activeClass: "bg-emerald-600 text-white shadow-sm",
    },
  ];

  if (mentorStatus?.certified) {
    availableModes.push({
      key: "mentor",
      label: "Mentor (Pro)",
      icon: Eye,
      activeClass: "bg-brand text-white shadow-sm",
    });
  }

  if (mentorStatus?.hasEducator) {
    availableModes.push({
      key: "educator",
      label: "Éducateur (Orientation)",
      icon: GraduationCap,
      activeClass: "bg-indigo-600 text-white shadow-sm",
    });
  }

  return (
    <div className="min-h-dvh bg-gradient-to-b from-surface via-surface to-brand/5 font-sans text-ink pb-24 ">
      <AppHeader />
      <AppTabBar profileId="" />

      <div className="mx-auto max-w-6xl grid gap-8 px-6 pt-6 lg:grid-cols-3">
        {/* Left Column: Summary Card */}
        <div className="min-w-0 lg:col-span-1 space-y-6">
          <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-xl text-center">
            <div
              className={`mx-auto grid size-16 place-items-center rounded-2xl border-2 border-ink text-2xl font-bold ${
                mentorMode
                  ? "bg-brand/10 text-brand"
                  : educatorMode
                    ? "bg-indigo-50 text-indigo-600"
                    : "bg-emerald-50 text-emerald-700"
              }`}
            >
              {mentorMode ? (
                <Eye className="size-8" />
              ) : educatorMode ? (
                <GraduationCap className="size-8" />
              ) : (
                <User className="size-8" />
              )}
            </div>
            <h2 className="mt-4 font-display text-balance text-xl font-bold truncate">
              {session.user.user_metadata?.full_name ||
                session.user.user_metadata?.name ||
                session.user.email}
            </h2>
            <p className="text-xs text-ink/60 font-semibold mt-1">
              {mentorMode
                ? "Compte Mentor"
                : educatorMode
                  ? "Compte Éducateur / Orientation"
                  : "Compte Parent"}
            </p>
            <div className="mt-6 border-t border-ink/5 pt-6 text-left space-y-4">
              {mentorMode ? (
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-ink/60 flex items-center gap-2">
                    <Users className="size-4 text-brand" /> Enfants assignés
                  </span>
                  <span className="font-bold">{mentorStatus?.assignedCount ?? 0}</span>
                </div>
              ) : educatorMode ? (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-ink/60 flex items-center gap-2">
                      <GraduationCap className="size-4 text-indigo-600" /> Élèves délégués
                    </span>
                    <span className="font-bold text-indigo-600">
                      {mentorStatus?.delegatedStudentsCount ?? 0}
                    </span>
                  </div>
                  {mentorStatus?.educatorProfile?.organizationName && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-ink/60 flex items-center gap-2">
                        <Building2 className="size-4 text-ink/60" /> Établissement
                      </span>
                      <span className="font-bold text-xs truncate max-w-[140px]">
                        {mentorStatus.educatorProfile.organizationName}
                      </span>
                    </div>
                  )}
                  {mentorStatus?.educatorProfile?.handle && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-ink/60 flex items-center gap-2">
                        <AtSign className="size-4 text-ink/60" /> Identifiant
                      </span>
                      <span className="font-mono font-bold text-xs text-indigo-600">
                        {mentorStatus.educatorProfile.handle.startsWith("@")
                          ? mentorStatus.educatorProfile.handle
                          : `@${mentorStatus.educatorProfile.handle}`}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-ink/60 flex items-center gap-2">
                      <Users className="size-4 text-brand" /> Enfants
                    </span>
                    <span className="font-bold">{childCount}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-ink/60 flex items-center gap-2">
                      <Check className="size-4 text-emerald-600" /> Défis complétés
                    </span>
                    <span className="font-bold text-emerald-600">
                      {challengeStats.completed} / {challengeStats.total}
                    </span>
                  </div>
                </>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-ink/60 flex items-center gap-2">
                  <Calendar className="size-4 text-amber-600" /> Créé le
                </span>
                <span className="font-bold text-xs">
                  {new Date(session.user.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
            <div className="mt-6 border-t border-ink/5 pt-4 space-y-2">
              {!mentorMode && !educatorMode && (
                <Link
                  to="/profiles/manage"
                  className="press-white flex w-full items-center justify-center gap-2 rounded-xl border border-ink/10 bg-white px-4 py-2.5 text-xs font-bold text-ink"
                >
                  <Users className="size-3.5 text-brand" />
                  Gérer mes profils
                </Link>
              )}
              {educatorMode && (
                <Link
                  to="/educator"
                  className="press-brand flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-indigo-700 transition-all cursor-pointer"
                >
                  <GraduationCap className="size-3.5" />
                  Espace Éducation & Orientation
                </Link>
              )}
              {mentorMode && (
                <Link
                  to="/mentor"
                  className="press-brand flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-brand/90 transition-all cursor-pointer"
                >
                  <Eye className="size-3.5" />
                  Dashboard Mentor
                </Link>
              )}
              <button
                onClick={handleSignOut}
                className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 cursor-pointer"
              >
                <LogOut className="size-3.5" />
                Se déconnecter
              </button>
            </div>
          </div>

          {/* Mode Actif : bascule Parent / Mentor / Éducateur — commutateur dynamique s'adaptant aux rôles */}
          <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between gap-3 mb-2">
              <h3 className="font-display text-balance text-base font-bold flex items-center gap-2">
                {mentorStatus?.mode === "mentor" ? (
                  <>
                    <Eye className="size-4 text-brand" /> Espace Actif : Mode Mentor
                  </>
                ) : mentorStatus?.mode === "educator" ? (
                  <>
                    <GraduationCap className="size-4 text-indigo-600" /> Espace Actif : Mode
                    Éducateur
                  </>
                ) : (
                  <>
                    <Users className="size-4 text-emerald-600" /> Espace Actif : Mode Parent
                  </>
                )}
              </h3>
              <span
                className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                  mentorStatus?.mode === "mentor"
                    ? "bg-brand/10 text-brand border border-brand/20"
                    : mentorStatus?.mode === "educator"
                      ? "bg-indigo-100 text-indigo-800 border border-indigo-200"
                      : "bg-emerald-100 text-emerald-800 border border-emerald-200"
                }`}
              >
                {mentorStatus?.mode === "mentor"
                  ? "Mentor Actif"
                  : mentorStatus?.mode === "educator"
                    ? "Éducateur Actif"
                    : "Parent Actif"}
              </span>
            </div>

            {!mentorStatus ? (
              <div className="flex items-center gap-2 text-sm text-ink/50 py-3">
                <Loader2 className="size-4 animate-spin" /> Vérification de votre statut…
              </div>
            ) : (
              <div className="space-y-4 mt-2">
                {/* Statut Mentor ou Éducateur */}
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-bold text-ink/70">
                  {mentorStatus.certified && (
                    <span className="flex items-center gap-1.5 text-brand">
                      <Check className="size-3.5 text-brand" />
                      Compte Mentor certifié
                    </span>
                  )}
                  {mentorStatus.hasEducator && (
                    <span className="flex items-center gap-1.5 text-indigo-700">
                      <Check className="size-3.5 text-indigo-600" />
                      Profil Éducateur actif
                    </span>
                  )}
                  {mentorStatus.status !== "active" && (
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider ${
                        mentorStatus.status === "banned"
                          ? "bg-red-50 text-red-700"
                          : mentorStatus.status === "suspended"
                            ? "bg-orange-50 text-orange-700"
                            : "bg-amber-50 text-amber-700"
                      }`}
                    >
                      {mentorStatus.status}
                    </span>
                  )}
                </div>

                {/* Commutateur dynamique si plusieurs casquettes sont débloquées */}
                {availableModes.length > 1 ? (
                  <div>
                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-ink/60 mb-2">
                      Basculer d'espace
                    </p>
                    <div className="flex flex-wrap rounded-2xl bg-surface p-1 border border-ink/10 gap-1">
                      {availableModes.map((m) => {
                        const isActive = mentorStatus.mode === m.key;
                        const Icon = m.icon;
                        return (
                          <button
                            key={m.key}
                            type="button"
                            onClick={() => handleSwitchMode(m.key)}
                            disabled={switchingMode || isActive}
                            className={`flex-1 min-w-[100px] rounded-xl px-3 py-2.5 text-xs font-extrabold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                              isActive
                                ? m.activeClass
                                : "text-ink/60 hover:text-ink hover:bg-white/70"
                            }`}
                          >
                            {switchingMode && mentorStatus.mode === m.key ? (
                              <Loader2 className="size-3.5 animate-spin" />
                            ) : isActive ? (
                              <Check className="size-3.5 stroke-[3]" />
                            ) : (
                              <Icon className="size-3.5" />
                            )}
                            <span className="truncate">{m.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-ink/60 leading-relaxed">
                    Vous êtes actuellement en <strong>Mode Famille / Parent</strong>. Enregistrez
                    ci-dessous votre fonction professionnelle ou activez votre code mentor pour
                    débloquer la bascule d'espace.
                  </p>
                )}

                {/* Boîte explicative selon le mode sélectionné */}
                <div
                  className={`rounded-2xl p-3.5 text-xs leading-relaxed transition-all ${
                    mentorStatus.mode === "mentor"
                      ? "bg-brand/5 border border-brand/20 text-ink"
                      : mentorStatus.mode === "educator"
                        ? "bg-indigo-50 border border-indigo-200 text-indigo-950"
                        : "bg-emerald-50/80 border border-emerald-200 text-emerald-950"
                  }`}
                >
                  <p className="font-semibold">
                    {mentorStatus.mode === "mentor" ? (
                      <>
                        <strong className="text-brand font-black">Mode Mentor actif :</strong> Vous
                        êtes dans votre espace professionnel pour encadrer les élèves qui vous sont
                        confiés.
                      </>
                    ) : mentorStatus.mode === "educator" ? (
                      <>
                        <strong className="text-indigo-700 font-black">
                          Mode Éducateur actif :
                        </strong>{" "}
                        Vous consultez les dossiers scolaires, intelligences multiples et bilans
                        d'orientation partagés par les familles.
                      </>
                    ) : (
                      <>
                        <strong className="text-emerald-700 font-black">Mode Parent actif :</strong>{" "}
                        Vous gérez vos propres enfants, leurs parcours et pouvez leur réserver un
                        mentor ou partager leur profil à l'école.
                      </>
                    )}
                  </p>
                  {mentorStatus.mode === "mentor" && (
                    <Link
                      to="/mentor"
                      className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl bg-brand text-white px-3.5 py-1.5 text-xs font-bold hover:bg-brand/90 transition-all shadow-sm"
                    >
                      <Eye className="size-3.5" />
                      Accéder au tableau de bord Mentor
                    </Link>
                  )}
                  {mentorStatus.mode === "educator" && (
                    <Link
                      to="/educator"
                      className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 text-white px-3.5 py-1.5 text-xs font-bold hover:bg-indigo-700 transition-all shadow-sm"
                    >
                      <GraduationCap className="size-3.5" />
                      Accéder à l'espace Éducation & Orientation
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>

          {(isMentor ||
            mentorStatus?.certified ||
            mentorStatus?.hasEducator ||
            isAdmin ||
            isManager) && (
            <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-xl">
              <h3 className="font-display text-balance text-base font-bold flex items-center gap-2 mb-3">
                <Sparkles className="size-4 text-brand" />
                Accompagnant & Espaces Pro
              </h3>
              <div className="space-y-1">
                {(isMentor || mentorStatus?.certified) && (
                  <Link
                    to="/mentor"
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold text-brand hover:bg-brand/5"
                  >
                    <Eye className="size-4" /> Espace Mentor
                  </Link>
                )}
                {mentorStatus?.hasEducator && (
                  <Link
                    to="/educator"
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold text-indigo-700 hover:bg-indigo-50"
                  >
                    <GraduationCap className="size-4" /> Espace Éducation & Orientation
                  </Link>
                )}
                {isManager && (
                  <Link
                    to="/organisation"
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold text-emerald-700 hover:bg-emerald-50"
                  >
                    <Building2 className="size-4" /> Espace Partenaire ONG & B2B
                  </Link>
                )}
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold text-purple-600 hover:bg-purple-50"
                  >
                    <LayoutDashboard className="size-4" /> Admin Dashboard (Super Admin)
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Settings Sections */}
        <div className="min-w-0 lg:col-span-2 space-y-6">
          {/* Espace Professionnel : Enseignant, Conseiller & École (Sprint B/C).
              Refonte 2026-09-06 : les utilisateurs sans aucun rôle pro ne
              voient plus la carte complète — une porte d'entrée compacte les
              conduit vers une demande d'activation (auto-approuvée si leur
              e-mail figure dans les habilitations Admin OS). */}
          <div className="rounded-3xl border border-indigo-100 bg-white p-6 shadow-xl md:p-8 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="grid size-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 shrink-0">
                  <GraduationCap className="size-6" />
                </div>
                <div>
                  <h3 className="font-display text-balance text-lg font-bold flex items-center gap-2 text-ink">
                    Espace Professionnel & Orientation
                  </h3>
                  <p className="text-xs text-ink/60 font-semibold">
                    {mentorStatus?.educatorProfile
                      ? "Enseignants, conseillers d'orientation, psychologues scolaires et écoles."
                      : "Réservé aux professionnels de l'éducation activés par Génizio."}
                  </p>
                </div>
              </div>
              {mentorStatus?.educatorProfile && !showEducatorForm && (
                <button
                  type="button"
                  onClick={() => setShowEducatorForm(true)}
                  className="rounded-xl border border-ink/10 px-3 py-1.5 text-xs font-bold text-ink/70 hover:text-ink hover:bg-surface transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Edit3 className="size-3.5" />
                  Modifier
                </button>
              )}
            </div>

            {mentorStatus?.educatorProfile && !showEducatorForm ? (
              <div className="rounded-2xl border border-indigo-50 bg-indigo-50/40 p-5 space-y-4">
                {/* Statut d'activation (chaîne d'autorisation Admin OS) */}
                {mentorStatus.educatorProfile.verificationStatus === "pending" && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-bold text-amber-800 flex items-start gap-2">
                    <Shield className="size-4 shrink-0 text-amber-600" />
                    Votre espace professionnel est <strong>en attente de validation</strong> par
                    l'administration Génizio. Il sera activé automatiquement si votre e-mail figure
                    dans les habilitations, sinon après vérification manuelle.
                  </div>
                )}
                {mentorStatus.educatorProfile.verificationStatus === "suspended" && (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700 flex items-start gap-2">
                    <Shield className="size-4 shrink-0 text-red-600" />
                    Votre espace professionnel a été <strong>suspendu</strong> — contactez
                    l'équipe Génizio.
                  </div>
                )}
                <div className="grid gap-3 sm:grid-cols-2 text-sm">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink/40 block mb-0.5">
                      Rôle Professionnel
                    </span>
                    <span className="font-bold text-indigo-900">
                      {mentorStatus.educatorProfile.professionalRole === "teacher"
                        ? "Enseignant / Professeur"
                        : mentorStatus.educatorProfile.professionalRole === "counselor"
                          ? "Conseiller d'orientation"
                          : mentorStatus.educatorProfile.professionalRole === "psychologist"
                            ? "Psychologue scolaire"
                            : "Direction / Partenaire"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink/40 block mb-0.5">
                      Établissement / École
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-ink">
                        {mentorStatus.educatorProfile.organizationName || "Non renseigné"}
                      </span>
                      {mentorStatus.educatorProfile.verificationStatus === "verified" && (
                        <span className="inline-flex items-center gap-0.5 text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full text-[10px] font-bold border border-emerald-200">
                          <Check className="size-3 text-emerald-600 stroke-[3]" />
                          Vérifié
                        </span>
                      )}
                      {mentorStatus.educatorProfile.verificationStatus === "pending" && (
                        <span className="inline-flex items-center gap-0.5 text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full text-[10px] font-bold border border-amber-200">
                          <Shield className="size-3 text-amber-600" />
                          En attente
                        </span>
                      )}
                      {mentorStatus.educatorProfile.verificationStatus === "suspended" && (
                        <span className="inline-flex items-center gap-0.5 text-red-700 bg-red-50 px-1.5 py-0.5 rounded-full text-[10px] font-bold border border-red-200">
                          <Shield className="size-3 text-red-600" />
                          Suspendu
                        </span>
                      )}
                    </div>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink/40 block mb-0.5">
                      Identifiant Parent (@Handle)
                    </span>
                    <span className="font-mono font-bold text-indigo-700 bg-white px-2.5 py-1 rounded-lg border border-indigo-100 inline-block text-xs">
                      {mentorStatus.educatorProfile.handle
                        ? mentorStatus.educatorProfile.handle.startsWith("@")
                          ? mentorStatus.educatorProfile.handle
                          : `@${mentorStatus.educatorProfile.handle}`
                        : "Aucun @handle configuré"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-ink/40 block mb-0.5">
                      Code de Classe (#Classe)
                    </span>
                    <span className="font-mono font-bold text-ink bg-white px-2.5 py-1 rounded-lg border border-ink/10 inline-block text-xs">
                      {mentorStatus.educatorProfile.classCode
                        ? mentorStatus.educatorProfile.classCode.startsWith("#")
                          ? mentorStatus.educatorProfile.classCode
                          : `#${mentorStatus.educatorProfile.classCode}`
                        : "Aucun code classe"}
                    </span>
                  </div>
                </div>

                <div className="border-t border-indigo-100 pt-3 flex flex-col sm:flex-row items-center justify-between gap-3">
                  <p className="text-xs text-ink/60 leading-relaxed">
                    Les parents peuvent vous retrouver directement en tapant votre @handle ou votre
                    code classe lors de l'attribution d'un Pass Éducatif.
                  </p>
                  <Link
                    to="/educator"
                    className="press-brand w-full sm:w-auto rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-xs font-bold flex items-center justify-center gap-2 shrink-0 transition-all shadow-xs"
                  >
                    <GraduationCap className="size-4" />
                    Ouvrir mon Espace Éducation
                  </Link>
                </div>
              </div>
            ) : showEducatorForm ? (
              <form onSubmit={handleSaveEducatorProfile} className="space-y-4">
                {!mentorStatus?.educatorProfile && (
                  <p className="text-xs text-ink/60 leading-relaxed">
                    Configurez vos coordonnées professionnelles. Cela active votre{" "}
                    <strong>Mode Éducateur</strong> et permet aux parents de vous déléguer le suivi
                    pédagogique de leurs enfants en toute confidentialité.
                  </p>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-bold text-ink/70">
                      Votre fonction dans l'éducation
                    </label>
                    <select
                      value={educatorRole}
                      onChange={(e) => setEducatorRole(e.target.value as any)}
                      className="w-full rounded-xl border border-ink/10 bg-white px-4 py-2.5 text-sm font-bold text-ink outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs cursor-pointer"
                    >
                      <option value="teacher">Enseignant / Professeur</option>
                      <option value="counselor">Conseiller d'orientation</option>
                      <option value="psychologist">Psychologue scolaire</option>
                      <option value="other">Direction d'école / Autre professionnel</option>
                    </select>
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-ink/70">
                        Établissement scolaire / École
                      </label>
                      {educatorSchoolId && (
                        <button
                          type="button"
                          onClick={handleClearSchool}
                          className="text-[11px] text-indigo-600 hover:text-indigo-800 font-bold cursor-pointer"
                        >
                          Changer d'école
                        </button>
                      )}
                    </div>

                    {educatorSchoolId ? (
                      <div className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-3.5 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="grid size-10 place-items-center rounded-xl bg-indigo-600 text-white shrink-0 shadow-2xs">
                            <Building2 className="size-5" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-display font-bold text-sm text-ink truncate">
                                {educatorOrg}
                              </p>
                              {educatorSchoolStatus === "verified" ||
                              educatorSchoolStatus === "partner_campus" ? (
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-100 text-emerald-800 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider shrink-0 border border-emerald-200">
                                  <Check className="size-2.5 stroke-[3]" /> Certifié
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 text-amber-800 px-2 py-0.5 text-[9px] font-black uppercase tracking-wider border border-amber-200 shrink-0">
                                  Communauté
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-ink/60 mt-0.5">
                              {educatorSchoolCode && (
                                <span className="font-mono font-bold text-indigo-700 bg-white px-2 py-0.5 rounded border border-indigo-100 text-[11px]">
                                  {educatorSchoolCode}
                                </span>
                              )}
                              {educatorSchoolCity && <span>· {educatorSchoolCity}</span>}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={handleClearSchool}
                          className="rounded-xl border border-ink/10 bg-white px-3 py-1.5 text-xs font-bold text-ink/70 hover:text-ink cursor-pointer shrink-0 shadow-2xs"
                        >
                          Modifier
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <div className="relative">
                          <Search className="size-4 text-ink/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            value={schoolQuery || educatorOrg}
                            onChange={(e) => {
                              setSchoolQuery(e.target.value);
                              setEducatorOrg(e.target.value);
                            }}
                            onFocus={() => {
                              if (schoolSuggestions.length > 0) setShowSchoolDropdown(true);
                            }}
                            placeholder="Rechercher une école par nom, ville ou code (#CSV-OUAGA)…"
                            className="w-full rounded-xl border border-ink/10 pl-10 pr-10 py-2.5 text-sm font-medium text-ink outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                          />
                          {searchingSchools && (
                            <Loader2 className="size-4 animate-spin text-indigo-600 absolute right-3.5 top-1/2 -translate-y-1/2" />
                          )}
                        </div>

                        {/* Dropdown Suggestions */}
                        {showSchoolDropdown && schoolSuggestions.length > 0 && (
                          <div className="absolute z-20 left-0 right-0 top-full mt-1.5 rounded-2xl border border-ink/10 bg-white shadow-xl max-h-56 overflow-y-auto divide-y divide-ink/5">
                            {schoolSuggestions.map((school) => (
                              <button
                                key={school.id}
                                type="button"
                                onClick={() => handleSelectSchool(school)}
                                className="w-full text-left p-3 hover:bg-indigo-50/50 transition-colors flex items-center justify-between gap-3 cursor-pointer"
                              >
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-xs text-ink">
                                      {school.name}
                                    </span>
                                    {school.status === "verified" ||
                                    school.status === "partner_campus" ? (
                                      <span className="rounded-full bg-emerald-100 text-emerald-800 px-1.5 py-0.2 text-[9px] font-black uppercase tracking-wider">
                                        Certifié
                                      </span>
                                    ) : null}
                                  </div>
                                  <p className="text-[11px] text-ink/50 mt-0.5">
                                    {school.city} · {school.type === "public" ? "Public" : "Privé"}
                                  </p>
                                </div>
                                <span className="font-mono font-bold text-xs text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100 shrink-0">
                                  {school.code}
                                </span>
                              </button>
                            ))}
                          </div>
                        )}

                        <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                          <p className="text-[11px] text-ink/50">
                            Recherche instantanée dans l'annuaire officiel Génizio Campus.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setSuggestName(schoolQuery.trim() || educatorOrg.trim());
                              setShowSuggestModal(true);
                            }}
                            className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer text-left sm:text-right"
                          >
                            + Enregistrer une nouvelle école
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-ink/70 flex items-center gap-1">
                      <AtSign className="size-3.5 text-indigo-600" />
                      Identifiant @handle (recherche parent)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40 font-bold text-sm">
                        @
                      </span>
                      <input
                        type="text"
                        value={educatorHandle}
                        onChange={(e) =>
                          setEducatorHandle(
                            e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""),
                          )
                        }
                        placeholder="kone.maths"
                        className="w-full rounded-xl border border-ink/10 pl-8 pr-4 py-2.5 text-sm font-mono font-bold text-ink outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                      />
                    </div>
                    <span className="text-[10px] text-ink/50 font-medium">
                      Permet aux parents de vous identifier sans donner votre numéro privé.
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-ink/70 flex items-center gap-1">
                      <Hash className="size-3.5 text-indigo-600" />
                      Code Classe de ralliement (optionnel)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink/40 font-bold text-sm">
                        #
                      </span>
                      <input
                        type="text"
                        value={educatorClassCode}
                        onChange={(e) =>
                          setEducatorClassCode(
                            e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""),
                          )
                        }
                        placeholder="LCA-6B"
                        className="w-full rounded-xl border border-ink/10 pl-8 pr-4 py-2.5 text-sm font-mono font-bold text-ink outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                      />
                    </div>
                    <span className="text-[10px] text-ink/50 font-medium">
                      Code partagé aux parents de votre classe pour un rattachement groupé.
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button
                    type="submit"
                    disabled={savingEducator}
                    className="press-brand rounded-xl bg-indigo-600 hover:bg-indigo-700 px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50 flex items-center gap-2 transition-all cursor-pointer shadow-xs"
                  >
                    {savingEducator ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Check className="size-4" />
                    )}
                    <span>
                      {mentorStatus?.educatorProfile
                        ? "Mettre à jour"
                        : "Enregistrer et activer le Mode Éducateur"}
                    </span>
                  </button>
                  {mentorStatus?.educatorProfile && showEducatorForm && (
                    <button
                      type="button"
                      onClick={() => setShowEducatorForm(false)}
                      className="rounded-xl border border-ink/10 px-4 py-2.5 text-sm font-bold text-ink/60 hover:text-ink cursor-pointer"
                    >
                      Annuler
                    </button>
                  )}
                </div>
              </form>
            ) : (
              /* Porte d'entrée compacte : un utilisateur standard découvre
                 l'existence des espaces pro sans être noyé sous le formulaire
                 d'activation — le formulaire s'ouvre explicitement. */
              <div className="rounded-2xl border border-indigo-50 bg-indigo-50/40 p-5 space-y-3">
                <p className="text-xs text-ink/60 leading-relaxed">
                  Vous êtes enseignant, conseiller d'orientation, psychologue scolaire ou chef
                  d'établissement ? Demandez l'activation de votre espace professionnel :
                  création de votre profil, @handle professionnel, rattachement à votre
                  établissement et accès au portail éducation.
                </p>
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setShowEducatorForm(true)}
                    className="press-brand rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 text-xs font-bold flex items-center gap-2 transition-all shadow-xs cursor-pointer"
                  >
                    <GraduationCap className="size-4" />
                    Demander mon espace professionnel
                  </button>
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => setShowEducatorForm(true)}
                      className="rounded-xl border border-ink/10 bg-white px-4 py-2 text-xs font-bold text-ink/70 hover:text-ink cursor-pointer shadow-2xs"
                    >
                      Créer mon profil (admin)
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-ink/50 font-medium">
                  L'activation est validée par l'administration Génizio, ou immédiate si votre
                  e-mail professionnel figure dans les habilitations de votre établissement.
                </p>
              </div>
            )}
          </div>

          {/* Activation Mentor par code (si non certifié) */}
          {!mentorStatus?.certified && (
            <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-xl md:p-8 space-y-4">
              <div className="flex items-center gap-3">
                <div className="grid size-12 place-items-center rounded-2xl bg-brand/10 text-brand shrink-0">
                  <Eye className="size-6" />
                </div>
                <div>
                  <h3 className="font-display text-balance text-lg font-bold text-ink">
                    Activer un accès Mentor
                  </h3>
                  <p className="text-xs text-ink/60 font-semibold">
                    Vous avez été agréé comme mentor par l'administration Génizio ?
                  </p>
                </div>
              </div>
              <p className="text-xs text-ink/60 leading-relaxed">
                Entrez le code d'activation fourni par l'équipe administrative (ex:{" "}
                <code>MNT-XXXXXXXX</code>) pour débloquer votre statut et votre tableau de bord.
              </p>
              <form onSubmit={handleActivateCode} className="flex flex-col sm:flex-row gap-2">
                <input
                  value={activationCode}
                  onChange={(e) => setActivationCode(e.target.value)}
                  placeholder="MNT-XXXXXXXX"
                  disabled={activating}
                  className="flex-1 bg-surface border border-ink/10 rounded-2xl px-4 py-3 text-sm font-bold text-ink focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
                <button
                  type="submit"
                  disabled={activating || !activationCode.trim()}
                  className="rounded-2xl bg-brand hover:bg-brand/90 text-white px-6 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 shrink-0"
                >
                  {activating ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                  Activer le statut Mentor
                </button>
              </form>
              {activationStatus && (
                <p
                  className={
                    "text-xs font-bold " +
                    (activationStatus.ok ? "text-emerald-700" : "text-red-600")
                  }
                >
                  {activationStatus.text}
                </p>
              )}
            </div>
          )}

          {/* Family subscription (self-service) */}
          <SubscriptionCard />

          {/* Relationship type — masqué en mode mentor (sémantique parent) */}
          {!mentorMode && (
            <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-xl md:p-8">
              <h3 className="font-display text-balance text-lg font-bold flex items-center gap-2 mb-2">
                <Users className="size-5 text-brand" />
                Votre lien avec l'enfant
              </h3>
              <p className="text-xs text-ink/60 leading-relaxed mb-6">
                Parent, tuteur, éducateur d'une structure d'accueil... Modifiable à tout moment.
              </p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <select
                  value={relationshipType}
                  onChange={(e) => setRelationshipType(e.target.value)}
                  className="flex-1 rounded-xl border border-ink/10 bg-white px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-brand cursor-pointer shadow-sm"
                >
                  <option value="" disabled>
                    Sélectionnez votre lien
                  </option>
                  {RELATIONSHIP_TYPES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleSaveRelationshipType}
                  disabled={savingRelationship || !relationshipType}
                  className="press-brand rounded-xl bg-brand px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {savingRelationship ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Check className="size-4" />
                  )}
                  <span>Enregistrer</span>
                </button>
              </div>
            </div>
          )}

          {/* Phone Settings */}
          <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-xl md:p-8">
            <h3 className="font-display text-balance text-lg font-bold flex items-center gap-2 mb-2">
              <Phone className="size-5 text-brand" />
              Numéro de téléphone
            </h3>
            <p className="text-xs text-ink/60 leading-relaxed mb-6">
              Renseignez votre numéro pour recevoir des synthèses personnalisées et des
              notifications sur le potentiel de vos enfants.
            </p>
            <form onSubmit={handleSavePhone} className="space-y-4">
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
                  className="rounded-xl border border-ink/10 bg-white px-3 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-brand cursor-pointer shadow-sm"
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
                    placeholder="Numéro sans l'indicatif"
                    className="w-full rounded-xl border border-ink/10 px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-brand shadow-sm"
                    required
                  />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-ink/60 font-medium">
                <span>Pays actuel : {selectedCountry.name}</span>
                <span>
                  {phoneNumber.length} / {selectedCountry.limit} chiffres
                </span>
              </div>
              <button
                type="submit"
                disabled={savingPhone || !phoneNumber}
                className="press-brand rounded-xl bg-brand px-6 py-2.5 text-sm font-bold text-white disabled:opacity-50 flex items-center gap-2"
              >
                {savingPhone ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                <span>Enregistrer le numéro</span>
              </button>
            </form>
          </div>

          {/* Privacy & Consent Settings */}
          <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-xl md:p-8 space-y-6 animate-in slide-in-from-bottom-4 duration-700">
            <div>
              <h3 className="font-display text-balance text-lg font-bold flex items-center gap-2 mb-2">
                <Shield className="size-5 text-brand" />
                Confidentialité & Consentement
              </h3>
              <p className="text-xs text-ink/60 leading-relaxed">
                Consultez l'historique d'accès à vos données, exportez vos informations ou supprimez
                définitivement votre compte.
              </p>
            </div>

            {/* Privacy Dashboard from Wireframe 1n */}
            <div className="space-y-3">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-ink/60">
                Vos données en un coup d'œil
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-2xl border-2 border-ink bg-surface p-4 text-center">
                  <p className="text-2xl font-black text-brand">{artifactsCount}</p>
                  <p className="mt-1 text-[9px] font-bold text-ink/60 uppercase leading-snug">
                    Réalisations privées
                  </p>
                </div>
                <div className="rounded-2xl border-2 border-ink bg-surface p-4 text-center">
                  <p className="text-2xl font-black text-emerald-600">{consentEventsCount}</p>
                  <p className="mt-1 text-[9px] font-bold text-ink/60 uppercase leading-snug">
                    Événements enregistrés
                  </p>
                </div>
              </div>
            </div>

            <ConsentLedger />

            <div className="pt-4 border-t-[3px] border-ink space-y-4">
              <ExportDataButton />
              <DeleteAccountDialog />
            </div>
          </div>
        </div>
      </div>

      {/* Modale de déclaration d'un nouvel établissement scolaire */}
      {showSuggestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-ink/5 pb-3">
              <div className="flex items-center gap-2">
                <Building2 className="size-5 text-indigo-600" />
                <h3 className="font-display font-bold text-base text-ink">
                  Déclarer un établissement
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowSuggestModal(false)}
                className="grid size-7 place-items-center rounded-full hover:bg-ink/5 text-ink/40 cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSuggestSchoolSubmit} className="space-y-3.5 text-xs">
              <p className="text-ink/60 text-[11px] leading-relaxed">
                Votre école n'est pas encore enregistrée ? Ajoutez-la en 2 secondes. Un code de
                ralliement officiel lui sera automatiquement attribué.
              </p>

              <div className="space-y-1">
                <label className="font-bold text-ink/70">Nom complet de l'école *</label>
                <input
                  type="text"
                  required
                  value={suggestName}
                  onChange={(e) => setSuggestName(e.target.value)}
                  placeholder="Ex: Lycée Saint-Viateur"
                  className="w-full rounded-xl border border-ink/10 px-3.5 py-2.5 font-bold text-ink outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-ink/70">Ville *</label>
                <input
                  type="text"
                  required
                  value={suggestCity}
                  onChange={(e) => setSuggestCity(e.target.value)}
                  placeholder="Ex: Ouagadougou"
                  className="w-full rounded-xl border border-ink/10 px-3.5 py-2.5 font-bold text-ink outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-ink/70">Type</label>
                <select
                  value={suggestType}
                  onChange={(e) => setSuggestType(e.target.value as SchoolType)}
                  className="w-full rounded-xl border border-ink/10 bg-white px-3 py-2.5 font-bold text-ink outline-none cursor-pointer"
                >
                  <option value="public">Public</option>
                  <option value="private_secular">Privé Laïc</option>
                  <option value="private_religious">Privé Confessionnel</option>
                  <option value="international">International</option>
                  <option value="other">Autre</option>
                </select>
              </div>

              <label className="flex items-start gap-2 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={suggestIsLeader}
                  onChange={(e) => setSuggestIsLeader(e.target.checked)}
                  className="mt-0.5 rounded border-ink/20 text-indigo-600 focus:ring-indigo-500"
                />
                <span className="text-[11px] text-ink/70 font-semibold">
                  Je dirige cet établissement — envoyer une demande de rôle « Chef
                  d'établissement » (soumise à validation par l'administration Génizio)
                </span>
              </label>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-ink/5">
                <button
                  type="button"
                  onClick={() => setShowSuggestModal(false)}
                  className="px-3.5 py-2 rounded-xl border border-ink/10 text-ink/60 font-bold hover:text-ink cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={suggesting}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {suggesting && <Loader2 className="size-3.5 animate-spin" />}
                  <span>Enregistrer & Sélectionner</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
