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
  ShoppingBag,
  Building2,
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
import { checkIsActiveMentor, activateMentorCode } from "@/lib/mentors.functions";

export const Route = createFileRoute("/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { session, loading } = useSession();
  const navigate = useNavigate();

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

  return (
    <div className="min-h-dvh bg-gradient-to-b from-surface via-surface to-brand/5 font-sans text-ink pb-24 ">
      <AppHeader />
      <AppTabBar profileId="" />

      <div className="mx-auto max-w-4xl grid gap-8 px-6 pt-6 ">
        {/* Left Column: Summary Card */}
        <div className="md:col-span-1 space-y-6">
          <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-xl text-center">
            <div className="mx-auto grid size-16 place-items-center rounded-2xl border-2 border-ink bg-brand/10 text-brand text-2xl font-bold">
              <User className="size-8" />
            </div>
            <h2 className="mt-4 font-display text-balance text-xl font-bold truncate">
              {session.user.user_metadata?.full_name ||
                session.user.user_metadata?.name ||
                session.user.email}
            </h2>
            <p className="text-xs text-ink/60 font-semibold mt-1">Compte Parent</p>
            <div className="mt-6 border-t border-ink/5 pt-6 text-left space-y-4">
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
              <Link
                to="/profiles/manage"
                className="press-white flex w-full items-center justify-center gap-2 rounded-xl border border-ink/10 bg-white px-4 py-2.5 text-xs font-bold text-ink"
              >
                <Users className="size-3.5 text-brand" />
                Gérer mes profils
              </Link>
              <button
                onClick={handleSignOut}
                className="flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 cursor-pointer"
              >
                <LogOut className="size-3.5" />
                Se déconnecter
              </button>
            </div>
          </div>

          {!isMentor && (
            <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-xl">
              <h3 className="font-display text-balance text-base font-bold flex items-center gap-2 mb-1">
                <Eye className="size-4 text-brand" /> Mentor
              </h3>
              <p className="text-xs text-ink/60 mb-4 leading-relaxed">
                Le mode Mentor permet d'accompagner les enfants qui vous sont assignés.
                Activez-le avec le code fourni par votre administration (spec §7).
              </p>
              <form onSubmit={handleActivateCode} className="flex gap-2">
                <input
                  value={activationCode}
                  onChange={(e) => setActivationCode(e.target.value)}
                  placeholder="MNT-XXXXXXXX"
                  disabled={activating}
                  className="flex-1 bg-surface border border-ink/10 rounded-2xl p-3 text-sm font-bold text-ink focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
                <button
                  type="submit"
                  disabled={activating || !activationCode.trim()}
                  className="rounded-2xl bg-brand hover:bg-brand/90 text-white px-5 py-3 text-sm font-bold flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
                >
                  {activating ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Eye className="size-4" />
                  )}
                  Activer
                </button>
              </form>
              {activationStatus && (
                <p
                  className={
                    "mt-3 text-xs font-bold " +
                    (activationStatus.ok ? "text-emerald-700" : "text-red-600")
                  }
                >
                  {activationStatus.text}
                </p>
              )}
            </div>
          )}

          {(isMentor || isAdmin || isManager) && (
            <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-xl">
              <h3 className="font-display text-balance text-base font-bold flex items-center gap-2 mb-3">
                <Eye className="size-4 text-brand" />
                Accompagnant & Pro
              </h3>
              <div className="space-y-1">
                {isMentor && (
                  <Link
                    to="/mentor"
                    className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold text-brand hover:bg-brand/5"
                  >
                    <Eye className="size-4" /> Mentor
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
                  <>
                    <Link
                      to="/admin"
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold text-purple-600 hover:bg-purple-50"
                    >
                      <LayoutDashboard className="size-4" /> Admin Dashboard
                    </Link>
                    <Link
                      to="/admin/products"
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold text-purple-600 hover:bg-purple-50"
                    >
                      <ShoppingBag className="size-4" /> Admin Kits
                    </Link>
                    <Link
                      to="/admin/mentors"
                      className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold text-purple-600 hover:bg-purple-50"
                    >
                      <Users className="size-4" /> Admin Mentors
                    </Link>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Settings Sections */}
        <div className="md:col-span-2 space-y-6">
          {/* Family subscription (self-service) */}
          <SubscriptionCard />

          {/* Relationship type */}
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
    </div>
  );
}
