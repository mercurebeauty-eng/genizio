import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useSession } from "@/hooks/use-session";
import { AppHeader } from "@/components/AppHeader";
import { AppTabBar } from "@/components/AppTabBar";
import {
  listMyEducatorDelegations,
  getEducationalPassport,
} from "@/lib/delegations.functions";
import {
  getMyEstablishmentOverview,
  type EstablishmentOverview,
} from "@/lib/educators-lookup.functions";
import { TalentRadarChart } from "@/components/TalentRadarChart";
import {
  GraduationCap,
  Users,
  Search,
  MessageSquare,
  PhoneCall,
  Calendar,
  Sparkles,
  Compass,
  Award,
  BookOpen,
  Brain,
  CheckCircle2,
  X,
  Loader2,
  ShieldCheck,
  Building2,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { GenizioLoader } from "@/components/GenizioLoader";

export const Route = createFileRoute("/educator")({
  component: EducatorDashboardPage,
});

function EducatorDashboardPage() {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const [delegations, setDelegations] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [search, setSearch] = useState("");

  const [activeSubTab, setActiveSubTab] = useState<"students" | "establishment">("students");
  const [establishment, setEstablishment] = useState<EstablishmentOverview | null>(null);
  const [loadingEstablishment, setLoadingEstablishment] = useState(false);

  // Detailed modal for a child
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [passportData, setPassportData] = useState<any | null>(null);
  const [loadingPassport, setLoadingPassport] = useState(false);

  const listDelegationsFn = useServerFn(listMyEducatorDelegations);
  const getPassportFn = useServerFn(getEducationalPassport);
  const getEstablishmentFn = useServerFn(getMyEstablishmentOverview);

  useEffect(() => {
    if (!loading && !session) {
      navigate({ to: "/auth", replace: true });
    }
  }, [session, loading, navigate]);

  const loadDelegations = async () => {
    if (!session) return;
    setFetching(true);
    try {
      const opts = session.access_token
        ? { headers: { Authorization: `Bearer ${session.access_token}` } }
        : {};
      const data = await listDelegationsFn(opts);
      setDelegations(data ?? []);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors du chargement de vos élèves.");
    } finally {
      setFetching(false);
    }
  };

  const loadEstablishment = async () => {
    if (!session) return;
    setLoadingEstablishment(true);
    try {
      const opts = session.access_token
        ? { headers: { Authorization: `Bearer ${session.access_token}` } }
        : {};
      const data = await getEstablishmentFn(opts);
      setEstablishment(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingEstablishment(false);
    }
  };

  useEffect(() => {
    if (session) {
      void loadDelegations();
      void loadEstablishment();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const handleOpenPassport = async (childId: string) => {
    setSelectedChildId(childId);
    setLoadingPassport(true);
    setPassportData(null);
    try {
      const opts = session?.access_token
        ? { headers: { Authorization: `Bearer ${session.access_token}` } }
        : {};
      const data = await getPassportFn({ data: childId, ...opts });
      setPassportData(data);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur de chargement du dossier élève.");
      setSelectedChildId(null);
    } finally {
      setLoadingPassport(false);
    }
  };

  const filtered = delegations.filter((d) =>
    d.childName.toLowerCase().includes(search.toLowerCase()),
  );

  if (loading || !session) {
    return (
      <div className="grid min-h-dvh place-items-center bg-surface">
        <GenizioLoader label="Chargement de l'espace éducation…" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-surface pb-24 text-ink">
      <AppHeader />
      <AppTabBar profileId="" />

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink/5 pb-6">
          <div className="flex items-center gap-3">
            <div className="grid size-12 place-items-center rounded-2xl bg-indigo-600 text-white shadow-md shrink-0">
              <GraduationCap className="size-7" />
            </div>
            <div>
              <h1 className="text-2xl font-display font-black text-ink">
                Espace Éducation & Orientation
              </h1>
              <p className="text-xs sm:text-sm text-ink/60 font-semibold">
                Portail réservé aux enseignants, conseillers d'orientation et psychologues scolaires.
              </p>
            </div>
          </div>
        </div>

        {/* Sélecteur de vue : Mes Élèves vs Mon Établissement */}
        <div className="flex flex-wrap items-center gap-2 border-b border-ink/10 pb-4">
          <button
            type="button"
            onClick={() => setActiveSubTab("students")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer ${
              activeSubTab === "students"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-white text-ink/70 hover:text-ink hover:bg-stone-50 border border-ink/10"
            }`}
          >
            <Users className="size-4" />
            <span>Mes Élèves Suivis ({delegations.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab("establishment")}
            className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-black transition-all cursor-pointer ${
              activeSubTab === "establishment"
                ? "bg-indigo-600 text-white shadow-xs"
                : "bg-white text-ink/70 hover:text-ink hover:bg-stone-50 border border-ink/10"
            }`}
          >
            <Building2 className="size-4" />
            <span>
              {establishment?.hasEstablishment && establishment.organizationName
                ? establishment.organizationName
                : "Mon Établissement & Équipe"}
            </span>
            {establishment?.hasEstablishment && establishment.totalColleagues > 0 && (
              <span
                className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                  activeSubTab === "establishment"
                    ? "bg-white/20 text-white"
                    : "bg-indigo-100 text-indigo-700"
                }`}
              >
                {establishment.totalColleagues}
              </span>
            )}
          </button>
        </div>

        {activeSubTab === "establishment" ? (
          loadingEstablishment ? (
            <div className="flex justify-center py-16">
              <Loader2 className="size-8 animate-spin text-indigo-600" />
            </div>
          ) : !establishment?.hasEstablishment ? (
            <div className="rounded-3xl border border-dashed border-ink/20 bg-white p-10 sm:p-12 text-center shadow-xs space-y-4">
              <div className="grid size-14 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 mx-auto">
                <Building2 className="size-7" />
              </div>
              <h3 className="font-display font-black text-xl text-ink">
                Aucun établissement associé à votre compte
              </h3>
              <p className="text-xs sm:text-sm text-ink/60 max-w-lg mx-auto leading-relaxed">
                Renseignez le nom de votre école, collège, lycée ou centre d'orientation dans vos
                paramètres de profil pour vous regrouper avec vos collègues enseignants et
                superviseurs.
              </p>
              <div className="pt-2">
                <Link
                  to="/profile"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                >
                  <ExternalLink className="size-4" />
                  <span>Renseigner mon établissement</span>
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Carte Récapitulative de l'Établissement */}
              <div className="rounded-3xl border border-indigo-200 bg-gradient-to-r from-indigo-50/80 via-white to-sky-50/60 p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1.5">
                  <span className="rounded-full bg-indigo-600 text-white px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider">
                    Établissement Scolaire Référencé
                  </span>
                  <h2 className="text-2xl font-display font-black text-ink">
                    {establishment.organizationName}
                  </h2>
                  <p className="text-xs text-ink/65 font-medium max-w-xl">
                    Vue partagée de l'équipe pédagogique. Les enseignants et conseillers de cet
                    établissement peuvent collaborer et assurer la continuité du suivi des élèves.
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <div className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-center shadow-2xs">
                    <p className="text-[10px] font-black uppercase tracking-wider text-ink/50">
                      Collègues inscrits
                    </p>
                    <p className="text-xl font-display font-black text-indigo-700">
                      {establishment.totalColleagues}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-ink/10 bg-white px-4 py-3 text-center shadow-2xs">
                    <p className="text-[10px] font-black uppercase tracking-wider text-ink/50">
                      Codes Classe
                    </p>
                    <p className="text-xl font-display font-black text-emerald-700">
                      {establishment.totalClasses}
                    </p>
                  </div>
                </div>
              </div>

              {/* Liste des collègues de l'établissement */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {establishment.colleagues.map((colleague) => (
                  <div
                    key={colleague.id}
                    className="rounded-3xl border border-ink/10 bg-white p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-indigo-300 transition-all"
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-display font-black text-base text-ink">
                            {colleague.fullName}
                          </h4>
                          <span className="rounded-full bg-indigo-50 text-indigo-700 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider border border-indigo-100">
                            {colleague.professionalRole === "teacher"
                              ? "Enseignant"
                              : colleague.professionalRole === "counselor"
                                ? "Conseiller d'orientation"
                                : colleague.professionalRole === "psychologist"
                                  ? "Psychologue scolaire"
                                  : "Direction / CPE"}
                          </span>
                        </div>
                        {colleague.isVerified && (
                          <span
                            title="Professionnel vérifié"
                            className="grid size-6 place-items-center rounded-full bg-emerald-100 text-emerald-700 shrink-0"
                          >
                            <ShieldCheck className="size-4" />
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        {colleague.handle && (
                          <span className="rounded-xl bg-stone-100 px-2 py-0.5 text-[11px] font-mono font-bold text-stone-700">
                            {colleague.handle}
                          </span>
                        )}
                        {colleague.classCode && (
                          <span className="rounded-xl bg-amber-50 border border-amber-200 px-2 py-0.5 text-[11px] font-mono font-bold text-amber-800">
                            {colleague.classCode}
                          </span>
                        )}
                      </div>
                    </div>

                    {colleague.whatsappPhone ? (
                      <a
                        href={`https://wa.me/${colleague.whatsappPhone.replace(/[^\d]/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2 px-3 rounded-2xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-800 font-bold text-xs shadow-2xs transition-colors flex items-center justify-center gap-1.5"
                      >
                        <MessageSquare className="size-3.5 text-emerald-700" />
                        <span>Contacter sur WhatsApp</span>
                      </a>
                    ) : (
                      <div className="text-[11px] text-ink/40 italic text-center py-1">
                        Contact direct non renseigné
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        ) : (
          <>
            {/* Barre de recherche */}
            <div className="relative max-w-md">
              <Search className="size-4 text-ink/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher un élève par prénom…"
                className="w-full rounded-2xl border border-ink/10 bg-white pl-10 pr-4 py-3 text-sm font-medium text-ink outline-none focus:ring-2 focus:ring-brand/30 shadow-xs"
              />
            </div>

            {/* Grille des élèves délégués */}
            {fetching ? (
              <div className="flex justify-center py-16">
                <Loader2 className="size-8 animate-spin text-brand" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="rounded-3xl border border-dashed border-ink/20 bg-white p-12 text-center shadow-xs space-y-3">
                <div className="grid size-12 place-items-center rounded-2xl bg-indigo-50 text-indigo-600 mx-auto">
                  <BookOpen className="size-6" />
                </div>
                <h3 className="font-display font-bold text-lg text-ink">Aucun élève rattaché</h3>
                <p className="text-xs text-ink/60 max-w-md mx-auto leading-relaxed">
                  Pour accéder au profil d'un élève, demandez à ses parents ou à son mentor de vous
                  partager son <strong>Pass Éducatif</strong> depuis son application Génizio en
                  indiquant votre identifiant (<strong>@{session.user.user_metadata?.educator_handle || "handle"}</strong>) ou email.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((item) => (
                  <div
                    key={item.delegationId}
                    className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm flex flex-col justify-between space-y-4 hover:border-indigo-300 transition-all"
                  >
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-display font-black text-lg text-ink">
                            {item.childName}
                            {item.childAge && (
                              <span className="text-xs text-ink/40 font-bold ml-1.5">
                                ({item.childAge} ans)
                              </span>
                            )}
                          </h3>
                          <span className="rounded-full bg-indigo-50 text-indigo-700 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider border border-indigo-100">
                            {item.professionalRole === "teacher"
                              ? "Enseignant"
                              : item.professionalRole === "counselor"
                                ? "Conseiller"
                                : "Partenaire"}
                          </span>
                        </div>

                        <span className="text-[10px] text-ink/40 font-semibold shrink-0">
                          Jusqu'au {new Date(item.validUntil).toLocaleDateString("fr-FR")}
                        </span>
                      </div>

                      <p className="text-xs text-ink/60 font-medium">
                        Passeport pédagogique actif · Intelligences multiples & profil d'apprentissage
                        disponibles.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleOpenPassport(item.childId)}
                      className="w-full py-2.5 px-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="size-4" />
                      <span>Consulter le Dossier Pédagogique</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>

      {/* Modal Dossier Pédagogique Complet */}
      {selectedChildId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl space-y-6">
            <div className="flex items-start justify-between border-b border-ink/5 pb-4">
              <div>
                <span className="rounded-full bg-indigo-100 text-indigo-900 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider">
                  Dossier Éducatif & Orientation
                </span>
                <h3 className="font-display font-black text-2xl text-ink mt-1">
                  {passportData?.child?.name ?? "Dossier Élève"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedChildId(null)}
                className="grid size-9 place-items-center rounded-full hover:bg-ink/5 text-ink/60 cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            {loadingPassport ? (
              <div className="flex justify-center py-16">
                <Loader2 className="size-8 animate-spin text-indigo-600" />
              </div>
            ) : passportData ? (
              <div className="space-y-6 text-xs">
                {/* Contact Famille si partagé */}
                {passportData.parentContact && (
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="font-black text-emerald-950 text-xs flex items-center gap-1.5">
                        <ShieldCheck className="size-4 text-emerald-700" />
                        <span>Liaison Famille · Coordonnées Directes</span>
                      </p>
                      <p className="text-[11px] text-emerald-900/80 mt-0.5 font-medium">
                        Le parent a expressément autorisé le contact pour les échanges scolaires.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {passportData.parentContact.phone && (
                        <>
                          <a
                            href={`tel:${passportData.parentContact.phone}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white border border-emerald-300 font-bold text-emerald-900 shadow-2xs hover:bg-emerald-100"
                          >
                            <PhoneCall className="size-3.5" />
                            <span>Appeler</span>
                          </a>
                          <a
                            href={`https://wa.me/${passportData.parentContact.phone.replace(/[^\d]/g, "")}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-bold shadow-2xs hover:bg-emerald-700"
                          >
                            <MessageSquare className="size-3.5" />
                            <span>WhatsApp</span>
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Carte des Talents */}
                <div className="rounded-3xl border border-ink/10 bg-white p-5 shadow-sm space-y-4">
                  <h4 className="font-display font-bold text-sm text-ink flex items-center gap-2">
                    <Award className="size-4 text-brand" />
                    <span>Cartographie des Intelligences Multiples (Gardner)</span>
                  </h4>
                  <TalentRadarChart
                    talents={passportData.child.talents}
                    name={passportData.child.name}
                    className="h-60 w-full"
                    age={passportData.child.age}
                  />
                </div>

                {/* Profil d'apprentissage & Clés pédagogiques */}
                <div className="rounded-3xl border border-ink/10 bg-sky-50/50 p-5 space-y-3">
                  <h4 className="font-display font-bold text-sm text-ink flex items-center gap-2">
                    <Brain className="size-4 text-indigo-600" />
                    <span>Leviers de Réussite & Pédagogie Personnalisée</span>
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-white p-3.5 border border-ink/5">
                      <p className="font-bold text-[11px] uppercase tracking-wider text-ink/50 mb-1">
                        Canal d'apprentissage privilégié
                      </p>
                      <p className="font-semibold text-ink leading-snug">
                        {passportData.child.learningProfile?.learning_mode === "manipulatif"
                          ? "Manipulatif (Besoins d'expérimenter pour assimiler)"
                          : passportData.child.learningProfile?.learning_mode === "visuel"
                            ? "Visuel & Schématique"
                            : passportData.child.learningProfile?.learning_mode === "recit"
                              ? "Récit & Mise en situation narrative"
                              : "Pratique avant la théorie"}
                      </p>
                    </div>
                    <div className="rounded-2xl bg-white p-3.5 border border-ink/5">
                      <p className="font-bold text-[11px] uppercase tracking-wider text-ink/50 mb-1">
                        Rapport au défi & motivation
                      </p>
                      <p className="font-semibold text-ink leading-snug">
                        {passportData.child.learningProfile?.challenge_rapport === "autonome"
                          ? "Recherche d'autonomie et de responsabilités"
                          : "A besoin de validation et d'encouragement progressif"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Réussites & Projets récents */}
                {passportData.recentAchievements?.length > 0 && (
                  <div className="rounded-3xl border border-ink/10 bg-white p-5 space-y-3">
                    <h4 className="font-display font-bold text-sm text-ink flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-emerald-600" />
                      <span>Réalisations & Projets d'Équipe récents</span>
                    </h4>
                    <div className="divide-y divide-ink/5">
                      {passportData.recentAchievements.map((ach: any) => (
                        <div key={ach.id} className="py-2.5 first:pt-0 last:pb-0">
                          <p className="font-bold text-xs text-ink">{ach.title}</p>
                          <p className="text-[11px] text-ink/60 mt-0.5">
                            Domaine : <span className="font-semibold text-ink">{ach.domain}</span> ·
                            Validé le {new Date(ach.completedAt).toLocaleDateString("fr-FR")}
                          </p>
                          {ach.aiObservations && (
                            <p className="text-[11px] text-ink/75 italic mt-1 bg-surface p-2 rounded-xl">
                              "{ach.aiObservations}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
