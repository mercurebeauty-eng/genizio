import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useSession } from "@/hooks/use-session";
import {
  listEducatorsAdmin,
  listEducatorStudentsAdmin,
  revokeAllEducatorAccessAdmin,
  type EducatorAdminRow,
  type EducatorDelegatedStudent,
} from "@/lib/educators-admin.functions";
import {
  listSchoolsAdmin,
  createSchoolAdmin,
  updateSchoolAdmin,
  type SchoolItem,
  type SchoolStatus,
  type SchoolType,
  type SchoolPricingTier,
} from "@/lib/schools.functions";
import { revokeChildDelegation } from "@/lib/delegations.functions";
import {
  GraduationCap,
  Building2,
  Users,
  Search,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  Eye,
  Trash2,
  X,
  Calendar,
  PhoneCall,
  Mail,
  CheckCircle2,
  Ban,
  Plus,
  Edit3,
  Award,
  Sparkles,
  ExternalLink,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { confirmDialog } from "@/components/ui/confirm-dialog";

export function AdminEducatorsTab() {
  const { session } = useSession();
  const [subTab, setSubTab] = useState<"educators" | "schools">("educators");

  // --- 1. Enseignants & Conseillers ---
  const [educators, setEducators] = useState<EducatorAdminRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");

  // Inspection modal
  const [selectedEducator, setSelectedEducator] = useState<EducatorAdminRow | null>(null);
  const [students, setStudents] = useState<EducatorDelegatedStudent[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [revoking, setRevoking] = useState(false);

  const listFn = useServerFn(listEducatorsAdmin);
  const listStudentsFn = useServerFn(listEducatorStudentsAdmin);
  const revokeAllFn = useServerFn(revokeAllEducatorAccessAdmin);
  const revokeSingleFn = useServerFn(revokeChildDelegation);

  // --- 2. Annuaire des Établissements (Campus) ---
  const [schools, setSchools] = useState<SchoolItem[]>([]);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [schoolSearch, setSchoolSearch] = useState("");
  const [schoolStatusFilter, setSchoolStatusFilter] = useState("all");

  const [isSchoolModalOpen, setIsSchoolModalOpen] = useState(false);
  const [editingSchool, setEditingSchool] = useState<SchoolItem | null>(null);
  const [savingSchool, setSavingSchool] = useState(false);

  // School Form State
  const [schoolName, setSchoolName] = useState("");
  const [schoolCity, setSchoolCity] = useState("");
  const [schoolCountryCode, setSchoolCountryCode] = useState("BF");
  const [schoolType, setSchoolType] = useState<SchoolType>("public");
  const [schoolStatus, setSchoolStatus] = useState<SchoolStatus>("verified");
  const [schoolPricingTier, setSchoolPricingTier] = useState<SchoolPricingTier>("free");
  const [schoolQuota, setSchoolQuota] = useState(0);
  const [schoolAddress, setSchoolAddress] = useState("");
  const [schoolEmail, setSchoolEmail] = useState("");
  const [schoolPhone, setSchoolPhone] = useState("");
  const [schoolWebsite, setSchoolWebsite] = useState("");
  const [schoolCode, setSchoolCode] = useState("");
  const [schoolLeaderEmail, setSchoolLeaderEmail] = useState("");

  const listSchoolsFn = useServerFn(listSchoolsAdmin);
  const createSchoolFn = useServerFn(createSchoolAdmin);
  const updateSchoolFn = useServerFn(updateSchoolAdmin);

  const loadEducatorsData = async () => {
    setLoading(true);
    try {
      const opts = session?.access_token
        ? { headers: { Authorization: `Bearer ${session.access_token}` } }
        : {};
      const data = await listFn(opts);
      setEducators(data ?? []);
    } catch (err) {
      console.error(err);
      toast.error("Erreur de chargement des professionnels.");
    } finally {
      setLoading(false);
    }
  };

  const loadSchoolsData = async () => {
    setLoadingSchools(true);
    try {
      const opts = session?.access_token
        ? { headers: { Authorization: `Bearer ${session.access_token}` } }
        : {};
      const data = await listSchoolsFn(opts);
      setSchools(data ?? []);
    } catch (err) {
      console.error(err);
      toast.error("Erreur de chargement des établissements.");
    } finally {
      setLoadingSchools(false);
    }
  };

  useEffect(() => {
    void loadEducatorsData();
    void loadSchoolsData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInspectStudents = async (educator: EducatorAdminRow) => {
    setSelectedEducator(educator);
    setLoadingStudents(true);
    try {
      const opts = session?.access_token
        ? { headers: { Authorization: `Bearer ${session.access_token}` } }
        : {};
      const data = await listStudentsFn({ data: educator.email, ...opts });
      setStudents(data ?? []);
    } catch (err) {
      toast.error("Erreur de chargement des élèves associés.");
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleRevokeAll = async (educator: EducatorAdminRow) => {
    const confirmed = await confirmDialog({
      title: "⛔ Révoquer tous les accès de ce professionnel ?",
      description: `Attention : tous les élèves (${educator.activeChildrenCount}) délégués à ${educator.name || educator.email} perdront leur accès immédiatement.`,
      confirmLabel: "Révoquer tous les accès",
      variant: "danger",
    });

    if (!confirmed) return;

    setRevoking(true);
    try {
      const opts = session?.access_token
        ? { headers: { Authorization: `Bearer ${session.access_token}` } }
        : {};
      const res = await revokeAllFn({ data: educator.email, ...opts });
      toast.success(`${res.revokedCount} délégation(s) révoquée(s) avec succès.`);
      void loadEducatorsData();
      if (selectedEducator?.email === educator.email) {
        setSelectedEducator(null);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la révocation globale.");
    } finally {
      setRevoking(false);
    }
  };

  const handleRevokeSingle = async (student: EducatorDelegatedStudent) => {
    const confirmed = await confirmDialog({
      title: "Révoquer l'accès pour cet élève ?",
      description: `Ce professionnel ne pourra plus consulter le profil de ${student.childName}.`,
      confirmLabel: "Révoquer",
      variant: "danger",
    });

    if (!confirmed || !selectedEducator) return;

    try {
      const opts = session?.access_token
        ? { headers: { Authorization: `Bearer ${session.access_token}` } }
        : {};
      await revokeSingleFn({ data: student.delegationId, ...opts });
      toast.success("Accès élève révoqué.");
      void handleInspectStudents(selectedEducator);
      void loadEducatorsData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la révocation.");
    }
  };

  const openCreateSchoolModal = () => {
    setEditingSchool(null);
    setSchoolName("");
    setSchoolCity("");
    setSchoolCountryCode("BF");
    setSchoolType("public");
    setSchoolStatus("verified");
    setSchoolPricingTier("free");
    setSchoolQuota(0);
    setSchoolAddress("");
    setSchoolEmail("");
    setSchoolPhone("");
    setSchoolWebsite("");
    setSchoolCode("");
    setSchoolLeaderEmail("");
    setIsSchoolModalOpen(true);
  };

  const openEditSchoolModal = (school: SchoolItem) => {
    setEditingSchool(school);
    setSchoolName(school.name);
    setSchoolCity(school.city);
    setSchoolCountryCode(school.countryCode);
    setSchoolType(school.type);
    setSchoolStatus(school.status);
    setSchoolPricingTier(school.pricingTier);
    setSchoolQuota(school.licensedStudentsQuota);
    setSchoolAddress(school.address || "");
    setSchoolEmail(school.contactEmail || "");
    setSchoolPhone(school.contactPhone || "");
    setSchoolWebsite(school.websiteUrl || "");
    setSchoolCode(school.code);
    setSchoolLeaderEmail(""); // By default, we don't display their email as it's not returned by the school payload directly (only leaderUserId is). But they can set a new one.
    setIsSchoolModalOpen(true);
  };

  const handleSaveSchool = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolName.trim() || !schoolCity.trim()) {
      toast.error("Le nom et la ville sont obligatoires.");
      return;
    }

    setSavingSchool(true);
    try {
      const opts = session?.access_token
        ? { headers: { Authorization: `Bearer ${session.access_token}` } }
        : {};

      if (editingSchool) {
        await updateSchoolFn({
          data: {
            id: editingSchool.id,
            name: schoolName.trim(),
            city: schoolCity.trim(),
            type: schoolType,
            status: schoolStatus,
            pricingTier: schoolPricingTier,
            licensedStudentsQuota: Number(schoolQuota) || 0,
            address: schoolAddress.trim() || null,
            contactEmail: schoolEmail.trim() || null,
            contactPhone: schoolPhone.trim() || null,
            websiteUrl: schoolWebsite.trim() || null,
            code: schoolCode.trim() || undefined,
            leaderEmail: schoolLeaderEmail.trim() || undefined,
          },
          ...opts,
        });
        toast.success("Établissement mis à jour avec succès !");
      } else {
        await createSchoolFn({
          data: {
            name: schoolName.trim(),
            city: schoolCity.trim(),
            countryCode: schoolCountryCode.toUpperCase(),
            type: schoolType,
            status: schoolStatus,
            pricingTier: schoolPricingTier,
            licensedStudentsQuota: Number(schoolQuota) || 0,
            address: schoolAddress.trim() || undefined,
            contactEmail: schoolEmail.trim() || undefined,
            contactPhone: schoolPhone.trim() || undefined,
            websiteUrl: schoolWebsite.trim() || undefined,
          },
          ...opts,
        });
        toast.success("Établissement créé et référencé !");
      }

      setIsSchoolModalOpen(false);
      void loadSchoolsData();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Erreur lors de l'enregistrement de l'établissement.",
      );
    } finally {
      setSavingSchool(false);
    }
  };

  const filteredEducators = educators.filter((e) => {
    const matchesSearch =
      e.email.toLowerCase().includes(search.toLowerCase()) ||
      (e.name && e.name.toLowerCase().includes(search.toLowerCase())) ||
      (e.organization && e.organization.toLowerCase().includes(search.toLowerCase()));
    const matchesRole = roleFilter === "all" || e.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const filteredSchools = schools.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(schoolSearch.toLowerCase()) ||
      s.city.toLowerCase().includes(schoolSearch.toLowerCase()) ||
      s.code.toLowerCase().includes(schoolSearch.toLowerCase());
    const matchesStatus = schoolStatusFilter === "all" || s.status === schoolStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalActiveStudents = educators.reduce((acc, curr) => acc + curr.activeChildrenCount, 0);
  const totalVerifiedSchools = schools.filter(
    (s) => s.status === "verified" || s.status === "partner_campus",
  ).length;
  const totalLicensedQuota = schools.reduce((acc, s) => acc + (s.licensedStudentsQuota || 0), 0);
  const totalAttachedTeachers = schools.reduce((acc, s) => acc + (s.educatorsCount || 0), 0);

  return (
    <div className="space-y-6 text-ink">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-indigo-600 text-white shadow-md">
            <GraduationCap className="size-6" />
          </div>
          <div>
            <h2 className="text-xl font-display font-black text-ink">
              Éducation, Établissements & Campus
            </h2>
            <p className="text-sm font-medium text-ink/60">
              Supervision des délégations parentales, annuaire officiel des écoles et quotas
              licences.
            </p>
          </div>
        </div>

        {subTab === "schools" && (
          <button
            type="button"
            onClick={openCreateSchoolModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer self-start sm:self-auto"
          >
            <Plus className="size-4" />
            <span>Ajouter un Établissement</span>
          </button>
        )}
      </div>

      {/* Sub-tabs Selector */}
      <div className="flex border-b border-ink/10 gap-6">
        <button
          type="button"
          onClick={() => setSubTab("educators")}
          className={`pb-3 text-sm font-extrabold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            subTab === "educators"
              ? "border-indigo-600 text-indigo-700"
              : "border-transparent text-ink/50 hover:text-ink"
          }`}
        >
          <Users className="size-4" />
          <span>Enseignants & Conseillers ({educators.length})</span>
        </button>
        <button
          type="button"
          onClick={() => setSubTab("schools")}
          className={`pb-3 text-sm font-extrabold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
            subTab === "schools"
              ? "border-indigo-600 text-indigo-700"
              : "border-transparent text-ink/50 hover:text-ink"
          }`}
        >
          <Building2 className="size-4" />
          <span>Annuaire des Établissements / Campus ({schools.length})</span>
        </button>
      </div>

      {subTab === "educators" ? (
        <>
          {/* KPI Cards Enseignants */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-3xl border border-ink/10 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-ink/50">
                Professionnels Référencés
              </p>
              <p className="text-2xl font-black text-ink mt-1">{educators.length}</p>
            </div>
            <div className="rounded-3xl border border-indigo-200 bg-indigo-50/50 p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-900/60">
                Établissements Référencés
              </p>
              <p className="text-2xl font-black text-indigo-900 mt-1">{schools.length}</p>
            </div>
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-900/60">
                Élèves Délégués Actifs
              </p>
              <p className="text-2xl font-black text-emerald-900 mt-1">{totalActiveStudents}</p>
            </div>
          </div>

          {/* Barre de filtrage Enseignants */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="size-4 text-ink/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher nom, email ou école…"
                className="w-full rounded-2xl border border-ink/10 bg-surface pl-10 pr-4 py-2.5 text-xs font-medium text-ink outline-none focus:ring-2 focus:ring-brand/30"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-2xl border border-ink/10 bg-white px-3 py-2.5 text-xs font-bold text-ink outline-none cursor-pointer"
            >
              <option value="all">Tous les rôles ({educators.length})</option>
              <option value="teacher">Enseignants</option>
              <option value="counselor">Conseillers d'orientation</option>
              <option value="psychologist">Psychologues</option>
              <option value="other">Autres éducateurs</option>
            </select>
          </div>

          {/* Liste des professionnels */}
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-8 animate-spin text-brand" />
            </div>
          ) : filteredEducators.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-ink/20 bg-white p-12 text-center">
              <GraduationCap className="size-10 text-ink/30 mx-auto mb-3" />
              <p className="font-bold text-ink/70">Aucun professionnel trouvé</p>
            </div>
          ) : (
            <div className="rounded-3xl border border-ink/10 bg-white overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface/80 text-ink/50 uppercase font-black tracking-wider border-b border-ink/5">
                    <tr>
                      <th className="py-3 px-4">Professionnel</th>
                      <th className="py-3 px-4">Rôle</th>
                      <th className="py-3 px-4">Établissement</th>
                      <th className="py-3 px-4 text-center">Élèves Actifs</th>
                      <th className="py-3 px-4">Dernier Accès</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/5">
                    {filteredEducators.map((edu) => (
                      <tr key={edu.email} className="hover:bg-surface/50 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-bold text-ink">{edu.name || "Nom non renseigné"}</p>
                          <p className="text-[11px] text-ink/50 font-mono">{edu.email}</p>
                        </td>
                        <td className="py-3 px-4">
                          <span className="rounded-full bg-indigo-50 text-indigo-700 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border border-indigo-100">
                            {edu.role === "teacher"
                              ? "Enseignant"
                              : edu.role === "counselor"
                                ? "Conseiller"
                                : edu.role === "psychologist"
                                  ? "Psychologue"
                                  : "Autre"}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-ink/70 font-medium">
                          {edu.organization || "—"}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1 font-extrabold text-sm text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full">
                            {edu.activeChildrenCount}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-ink/50 text-[11px]">
                          {edu.lastAccessedAt
                            ? new Date(edu.lastAccessedAt).toLocaleDateString("fr-FR")
                            : "Jamais"}
                        </td>
                        <td className="py-3 px-4 text-right space-x-1">
                          <button
                            type="button"
                            onClick={() => void handleInspectStudents(edu)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-ink/10 bg-surface hover:bg-white text-ink text-xs font-bold shadow-2xs transition-all cursor-pointer"
                          >
                            <Eye className="size-3.5 text-indigo-600" />
                            <span>Inspecter ({edu.activeChildrenCount})</span>
                          </button>
                          {edu.activeChildrenCount > 0 && (
                            <button
                              type="button"
                              onClick={() => void handleRevokeAll(edu)}
                              disabled={revoking}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold shadow-2xs transition-all cursor-pointer disabled:opacity-50"
                            >
                              <Ban className="size-3.5" />
                              <span>Révoquer tout</span>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* KPI Cards Établissements (Campus) */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="rounded-3xl border border-ink/10 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-ink/50">
                Établissements Total
              </p>
              <p className="text-2xl font-black text-ink mt-1">{schools.length}</p>
            </div>
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-900/60">
                Vérifiés & Partenaires
              </p>
              <p className="text-2xl font-black text-emerald-900 mt-1">{totalVerifiedSchools}</p>
            </div>
            <div className="rounded-3xl border border-indigo-200 bg-indigo-50/50 p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-indigo-900/60">
                Licences Élèves Quota
              </p>
              <p className="text-2xl font-black text-indigo-900 mt-1">{totalLicensedQuota}</p>
            </div>
            <div className="rounded-3xl border border-purple-200 bg-purple-50/50 p-5 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-purple-900/60">
                Enseignants Rattachés
              </p>
              <p className="text-2xl font-black text-purple-900 mt-1">{totalAttachedTeachers}</p>
            </div>
          </div>

          {/* Barre de filtrage Établissements */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="size-4 text-ink/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={schoolSearch}
                onChange={(e) => setSchoolSearch(e.target.value)}
                placeholder="Rechercher nom, ville ou code (#CSV-OUAGA)…"
                className="w-full rounded-2xl border border-ink/10 bg-surface pl-10 pr-4 py-2.5 text-xs font-medium text-ink outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <select
              value={schoolStatusFilter}
              onChange={(e) => setSchoolStatusFilter(e.target.value)}
              className="rounded-2xl border border-ink/10 bg-white px-3 py-2.5 text-xs font-bold text-ink outline-none cursor-pointer"
            >
              <option value="all">Tous les statuts ({schools.length})</option>
              <option value="partner_campus">Campus Partenaire</option>
              <option value="verified">Vérifié Génizio</option>
              <option value="community">Communauté</option>
              <option value="archived">Archivé</option>
            </select>
          </div>

          {/* Liste des Établissements */}
          {loadingSchools ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-8 animate-spin text-indigo-600" />
            </div>
          ) : filteredSchools.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-ink/20 bg-white p-12 text-center space-y-3">
              <Building2 className="size-10 text-ink/30 mx-auto" />
              <p className="font-bold text-ink/70">
                Aucun établissement ne correspond aux filtres.
              </p>
              <button
                type="button"
                onClick={openCreateSchoolModal}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 cursor-pointer"
              >
                <Plus className="size-4" />
                <span>Créer le premier établissement</span>
              </button>
            </div>
          ) : (
            <div className="rounded-3xl border border-ink/10 bg-white overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface/80 text-ink/50 uppercase font-black tracking-wider border-b border-ink/5">
                    <tr>
                      <th className="py-3 px-4">Établissement & Code</th>
                      <th className="py-3 px-4">Localisation & Type</th>
                      <th className="py-3 px-4">Statut</th>
                      <th className="py-3 px-4">Palier & Quota</th>
                      <th className="py-3 px-4 text-center">Équipe</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/5">
                    {filteredSchools.map((s) => (
                      <tr key={s.id} className="hover:bg-surface/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-ink text-sm">{s.name}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg">
                              {s.code}
                            </span>
                            {s.websiteUrl && (
                              <a
                                href={s.websiteUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-ink/40 hover:text-indigo-600"
                              >
                                <ExternalLink className="size-3" />
                              </a>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-ink">
                            {s.city}, {s.countryCode}
                          </p>
                          <p className="text-[11px] text-ink/50">
                            {s.type === "public"
                              ? "Public"
                              : s.type === "private_secular"
                                ? "Privé Laïc"
                                : s.type === "private_religious"
                                  ? "Privé Confessionnel"
                                  : s.type === "international"
                                    ? "International"
                                    : "Autre"}
                          </p>
                        </td>
                        <td className="py-3 px-4">
                          {s.status === "partner_campus" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-purple-100 text-purple-800 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider border border-purple-200">
                              <Sparkles className="size-3 text-purple-600" />
                              Campus Partenaire
                            </span>
                          ) : s.status === "verified" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider border border-emerald-200">
                              <ShieldCheck className="size-3 text-emerald-600" />
                              Certifié Génizio
                            </span>
                          ) : s.status === "archived" ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 text-stone-600 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider">
                              Archivé
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 text-amber-800 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider border border-amber-200">
                              Communauté
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <p className="font-bold text-ink">
                            {s.pricingTier === "standard_campus"
                              ? "Standard Campus"
                              : s.pricingTier === "pilot"
                                ? "Pack Pilote"
                                : s.pricingTier === "sponsored"
                                  ? "Mécénat B2B"
                                  : "Freemium"}
                          </p>
                          <p className="text-[11px] text-ink/50">
                            {s.licensedStudentsQuota > 0
                              ? `${s.licensedStudentsQuota} élèves licenciés`
                              : "Pas de quota"}
                          </p>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <p className="font-black text-indigo-700 text-sm">
                            {s.educatorsCount ?? 0} prof(s)
                          </p>
                          <p className="text-[10px] text-ink/50">{s.classesCount ?? 0} classe(s)</p>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => openEditSchoolModal(s)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-ink/10 bg-surface hover:bg-white text-ink text-xs font-bold shadow-2xs transition-all cursor-pointer"
                          >
                            <Edit3 className="size-3.5 text-indigo-600" />
                            <span>Gérer / Quotas</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modal Inspection Élèves Délégués */}
      {selectedEducator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-start justify-between border-b border-ink/5 pb-4">
              <div>
                <h3 className="font-display font-black text-lg text-ink">
                  Élèves délégués à {selectedEducator.name || selectedEducator.email}
                </h3>
                <p className="text-xs text-ink/60">
                  {selectedEducator.organization || "Établissement non renseigné"} · Mandats actifs
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedEducator(null)}
                className="grid size-8 place-items-center rounded-full hover:bg-ink/5 text-ink/50 cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            {loadingStudents ? (
              <div className="flex justify-center py-12">
                <Loader2 className="size-8 animate-spin text-brand" />
              </div>
            ) : students.length === 0 ? (
              <div className="p-8 text-center text-ink/50 text-xs">
                Aucun élève actuellement rattaché à ce professionnel.
              </div>
            ) : (
              <div className="divide-y divide-ink/5">
                {students.map((st) => (
                  <div
                    key={st.delegationId}
                    className="py-3 flex items-center justify-between gap-3"
                  >
                    <div>
                      <p className="font-bold text-ink text-sm">
                        {st.childName} {st.childAge ? `(${st.childAge} ans)` : ""}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5 text-[11px] text-ink/50">
                        <span>
                          Mandaté par :{" "}
                          <strong>{st.grantedByRole === "parent" ? "Parent" : "Mentor"}</strong>
                        </span>
                        <span>
                          · Valide jusqu'au {new Date(st.validUntil).toLocaleDateString("fr-FR")}
                        </span>
                        {st.shareParentPhone && st.parentPhone && (
                          <span className="text-emerald-700 font-semibold">
                            · Tél parent partagé
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => void handleRevokeSingle(st)}
                      className="px-2.5 py-1 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs transition-colors cursor-pointer shrink-0"
                    >
                      Révoquer
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Création / Édition Établissement Campus */}
      {isSchoolModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 sm:p-8 shadow-2xl space-y-5">
            <div className="flex items-start justify-between border-b border-ink/5 pb-4">
              <div className="flex items-center gap-2.5">
                <Building2 className="size-6 text-indigo-600" />
                <div>
                  <h3 className="font-display font-black text-lg text-ink">
                    {editingSchool
                      ? "Gérer l'Établissement & Licences"
                      : "Créer un Établissement Officiel"}
                  </h3>
                  <p className="text-xs text-ink/50">
                    {editingSchool
                      ? `Code : ${editingSchool.code}`
                      : "Ajout au registre officiel Génizio Campus"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSchoolModalOpen(false)}
                className="grid size-8 place-items-center rounded-full hover:bg-ink/5 text-ink/50 cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveSchool} className="space-y-4 text-xs">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <label className="font-bold text-ink/70">Nom de l'établissement *</label>
                  <input
                    type="text"
                    required
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    placeholder="Ex: Lycée Saint-Viateur"
                    className="w-full rounded-xl border border-ink/10 px-3.5 py-2.5 text-xs font-bold text-ink outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-ink/70">Ville *</label>
                  <input
                    type="text"
                    required
                    value={schoolCity}
                    onChange={(e) => setSchoolCity(e.target.value)}
                    placeholder="Ex: Ouagadougou, Abidjan..."
                    className="w-full rounded-xl border border-ink/10 px-3.5 py-2.5 text-xs font-bold text-ink outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-ink/70">Pays (Code ISO)</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={schoolCountryCode}
                    onChange={(e) => setSchoolCountryCode(e.target.value.toUpperCase())}
                    placeholder="BF, CI, SN..."
                    className="w-full rounded-xl border border-ink/10 px-3.5 py-2.5 text-xs font-mono font-bold text-ink outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-ink/70">Type d'établissement</label>
                  <select
                    value={schoolType}
                    onChange={(e) => setSchoolType(e.target.value as SchoolType)}
                    className="w-full rounded-xl border border-ink/10 bg-white px-3 py-2.5 text-xs font-bold text-ink outline-none cursor-pointer"
                  >
                    <option value="public">Public</option>
                    <option value="private_secular">Privé Laïc</option>
                    <option value="private_religious">Privé Confessionnel</option>
                    <option value="international">International</option>
                    <option value="other">Autre</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-ink/70">Statut de certification</label>
                  <select
                    value={schoolStatus}
                    onChange={(e) => setSchoolStatus(e.target.value as SchoolStatus)}
                    className="w-full rounded-xl border border-ink/10 bg-white px-3 py-2.5 text-xs font-bold text-ink outline-none cursor-pointer"
                  >
                    <option value="verified">Certifié Génizio (Recommandé)</option>
                    <option value="partner_campus">Campus Partenaire (Abonné)</option>
                    <option value="community">Communauté</option>
                    <option value="archived">Archivé</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-ink/70">Palier Tarifaire Campus</label>
                  <select
                    value={schoolPricingTier}
                    onChange={(e) => setSchoolPricingTier(e.target.value as SchoolPricingTier)}
                    className="w-full rounded-xl border border-ink/10 bg-white px-3 py-2.5 text-xs font-bold text-ink outline-none cursor-pointer"
                  >
                    <option value="free">0 FCFA - Professeur Libre (Freemium)</option>
                    <option value="pilot">100 000 FCFA/an - Pack Pilote</option>
                    <option value="standard_campus">3 500 FCFA/élève/an - Standard Campus</option>
                    <option value="sponsored">0 FCFA - Campus Subventionné (Mécénat B2B)</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-ink/70">Quota Élèves Licenciés</label>
                  <input
                    type="number"
                    min={0}
                    value={schoolQuota}
                    onChange={(e) => setSchoolQuota(Number(e.target.value))}
                    placeholder="Ex: 100, 500..."
                    className="w-full rounded-xl border border-ink/10 px-3.5 py-2.5 text-xs font-bold text-ink outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                {editingSchool && (
                  <div className="space-y-1 sm:col-span-2">
                    <label className="font-bold text-ink/70">
                      Code de ralliement officiel (#Code)
                    </label>
                    <input
                      type="text"
                      value={schoolCode}
                      onChange={(e) => setSchoolCode(e.target.value.toUpperCase())}
                      placeholder="#CSV-OUAGA"
                      className="w-full rounded-xl border border-ink/10 px-3.5 py-2.5 text-xs font-mono font-bold text-indigo-700 bg-indigo-50/50 outline-none"
                    />
                  </div>
                )}

                <div className="space-y-1 sm:col-span-2">
                  <label className="font-bold text-ink/70">Adresse physique</label>
                  <input
                    type="text"
                    value={schoolAddress}
                    onChange={(e) => setSchoolAddress(e.target.value)}
                    placeholder="Quartier, Avenue ou repère"
                    className="w-full rounded-xl border border-ink/10 px-3.5 py-2.5 text-xs font-medium text-ink outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-ink/70">Email de contact / Direction</label>
                  <input
                    type="email"
                    value={schoolEmail}
                    onChange={(e) => setSchoolEmail(e.target.value)}
                    placeholder="direction@lycee.org"
                    className="w-full rounded-xl border border-ink/10 px-3.5 py-2.5 text-xs font-medium text-ink outline-none"
                  />
                </div>

                {editingSchool && (
                  <div className="space-y-1 sm:col-span-2">
                    <label className="font-bold text-ink/70">
                      Email de l'utilisateur Directeur (Optionnel)
                    </label>
                    <input
                      type="email"
                      value={schoolLeaderEmail}
                      onChange={(e) => setSchoolLeaderEmail(e.target.value)}
                      placeholder="Assigner manuellement un directeur par email..."
                      className="w-full rounded-xl border border-indigo-200 bg-indigo-50/30 px-3.5 py-2.5 text-xs font-medium text-indigo-900 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                    />
                    <p className="text-[10px] text-ink/50 leading-tight">
                      En entrant une adresse email ici, le système recherchera l'utilisateur correspondant et l'assignera comme `leader_user_id` de l'établissement.
                    </p>
                  </div>
                )}
                <div className="space-y-1">
                  <label className="font-bold text-ink/70">Téléphone de contact</label>
                  <input
                    type="text"
                    value={schoolPhone}
                    onChange={(e) => setSchoolPhone(e.target.value)}
                    placeholder="+226 25 00 00 00"
                    className="w-full rounded-xl border border-ink/10 px-3.5 py-2.5 text-xs font-medium text-ink outline-none"
                  />
                </div>

                <div className="space-y-1 sm:col-span-2">
                  <label className="font-bold text-ink/70">Site Web officiel</label>
                  <input
                    type="url"
                    value={schoolWebsite}
                    onChange={(e) => setSchoolWebsite(e.target.value)}
                    placeholder="https://lycee.org"
                    className="w-full rounded-xl border border-ink/10 px-3.5 py-2.5 text-xs font-medium text-ink outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-ink/5">
                <button
                  type="button"
                  onClick={() => setIsSchoolModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-ink/10 text-xs font-bold text-ink/60 hover:text-ink cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={savingSchool}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                >
                  {savingSchool && <Loader2 className="size-3.5 animate-spin" />}
                  <span>
                    {editingSchool ? "Enregistrer les modifications" : "Créer l'Établissement"}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
