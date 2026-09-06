// Admin OS — Onglet « Activation & Habilitations ».
// Ferme l'angle mort de gouvernance : profils professionnels auto-inscrits à
// valider (l'ancien flux ne les voyait jamais), demandes de rôle chef
// d'établissement, et annuaire des e-mails habilités (chaîne d'activation).

import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useSession } from "@/hooks/use-session";
import {
  addAuthorizedEmailAdmin,
  decideSchoolLeaderRequestAdmin,
  listAuthorizedEmailsAdmin,
  listEducatorProfilesAdmin,
  listSchoolLeaderRequestsAdmin,
  removeAuthorizedEmailAdmin,
  setEducatorVerificationAdmin,
  type AuthorizedEmailRow,
  type EducatorProfileAdminRow,
  type SchoolLeaderRequestRow,
} from "@/lib/educators-activation.functions";
import {
  BadgeCheck,
  Ban,
  Building2,
  Check,
  Crown,
  Loader2,
  Mail,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { confirmDialog } from "@/components/ui/confirm-dialog";

const ROLE_LABELS: Record<string, string> = {
  teacher: "Enseignant",
  counselor: "Conseiller d'orientation",
  psychologist: "Psychologue scolaire",
  other: "Direction / Autre",
};

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending: {
    label: "En attente",
    className: "bg-amber-50 text-amber-800 border-amber-200",
  },
  verified: {
    label: "Vérifié",
    className: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  suspended: {
    label: "Suspendu",
    className: "bg-red-50 text-red-700 border-red-200",
  },
};

export function AdminProfessionalActivationTab() {
  const { session } = useSession();
  const opts = session?.access_token
    ? { headers: { Authorization: `Bearer ${session.access_token}` } }
    : {};

  // ── Profils professionnels ──
  const listProfilesFn = useServerFn(listEducatorProfilesAdmin);
  const verificationFn = useServerFn(setEducatorVerificationAdmin);
  const [profiles, setProfiles] = useState<EducatorProfileAdminRow[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);
  const [profileSearch, setProfileSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "verified" | "suspended">(
    "pending",
  );
  const [busyProfileId, setBusyProfileId] = useState<string | null>(null);

  // ── Demandes de direction ──
  const listRequestsFn = useServerFn(listSchoolLeaderRequestsAdmin);
  const decideRequestFn = useServerFn(decideSchoolLeaderRequestAdmin);
  const [requests, setRequests] = useState<SchoolLeaderRequestRow[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);

  // ── E-mails autorisés ──
  const listAuthorizedFn = useServerFn(listAuthorizedEmailsAdmin);
  const addAuthorizedFn = useServerFn(addAuthorizedEmailAdmin);
  const removeAuthorizedFn = useServerFn(removeAuthorizedEmailAdmin);
  const [authorized, setAuthorized] = useState<AuthorizedEmailRow[]>([]);
  const [loadingAuthorized, setLoadingAuthorized] = useState(true);
  const [newEmail, setNewEmail] = useState("");
  const [newSchoolId, setNewSchoolId] = useState("");
  const [newRole, setNewRole] = useState("");
  const [newIsLeader, setNewIsLeader] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [addingEmail, setAddingEmail] = useState(false);

  const loadAll = async () => {
    setLoadingProfiles(true);
    setLoadingRequests(true);
    setLoadingAuthorized(true);
    try {
      const [p, r, a] = await Promise.all([
        listProfilesFn(opts),
        listRequestsFn(opts),
        listAuthorizedFn(opts),
      ]);
      setProfiles(p ?? []);
      setRequests(r ?? []);
      setAuthorized(a ?? []);
    } catch (err) {
      console.error(err);
      toast.error("Erreur de chargement des activations.");
    } finally {
      setLoadingProfiles(false);
      setLoadingRequests(false);
      setLoadingAuthorized(false);
    }
  };

  useEffect(() => {
    void loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.access_token]);

  const pendingRequests = useMemo(() => requests.filter((r) => r.status === "pending"), [requests]);

  const filteredProfiles = useMemo(() => {
    const q = profileSearch.toLowerCase();
    return profiles.filter((p) => {
      const matchesSearch =
        !q ||
        p.fullName.toLowerCase().includes(q) ||
        (p.email ?? "").toLowerCase().includes(q) ||
        (p.organizationName ?? "").toLowerCase().includes(q) ||
        (p.schoolName ?? "").toLowerCase().includes(q);
      const matchesStatus = statusFilter === "all" || p.verificationStatus === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [profiles, profileSearch, statusFilter]);

  const handleVerification = async (
    profile: EducatorProfileAdminRow,
    action: "verify" | "suspend" | "requeue",
  ) => {
    setBusyProfileId(profile.id);
    try {
      await verificationFn({ data: { profileId: profile.id, action }, ...opts });
      toast.success(
        action === "verify"
          ? `${profile.fullName} est maintenant vérifié.`
          : action === "suspend"
            ? `${profile.fullName} est suspendu — l'accès à l'espace éducateur est bloqué.`
            : `${profile.fullName} est remis en attente de validation.`,
      );
      setProfiles((prev) =>
        prev.map((p) =>
          p.id === profile.id
            ? {
                ...p,
                verificationStatus:
                  action === "verify" ? "verified" : action === "suspend" ? "suspended" : "pending",
              }
            : p,
        ),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action impossible.");
    } finally {
      setBusyProfileId(null);
    }
  };

  const handleDecideRequest = async (request: SchoolLeaderRequestRow, approve: boolean) => {
    try {
      await decideRequestFn({ data: { requestId: request.id, approve }, ...opts });
      toast.success(
        approve
          ? `${request.userEmail ?? "Ce compte"} est maintenant chef d'établissement de « ${request.schoolName} ».`
          : "Demande de direction rejetée.",
      );
      setRequests((prev) =>
        prev.map((r) =>
          r.id === request.id ? { ...r, status: approve ? "approved" : "rejected" } : r,
        ),
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Décision impossible.");
    }
  };

  const handleAddAuthorized = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newEmail.includes("@")) {
      toast.error("Saisissez un e-mail valide.");
      return;
    }
    setAddingEmail(true);
    try {
      await addAuthorizedFn({
        data: {
          email: newEmail.trim(),
          schoolId: newSchoolId || null,
          expectedRole:
            newRole === "teacher" ||
            newRole === "counselor" ||
            newRole === "psychologist" ||
            newRole === "other"
              ? newRole
              : null,
          isLeader: newIsLeader,
          note: newNote.trim() || undefined,
        },
        ...opts,
      });
      toast.success(
        newIsLeader
          ? "Habilitation créée — si le compte existe, le rôle de direction a été attribué."
          : "E-mail habilité : ce compte sera activé automatiquement à l'inscription de son profil.",
      );
      setNewEmail("");
      setNewSchoolId("");
      setNewRole("");
      setNewIsLeader(false);
      setNewNote("");
      const a = await listAuthorizedFn(opts);
      setAuthorized(a ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ajout impossible.");
    } finally {
      setAddingEmail(false);
    }
  };

  const handleRemoveAuthorized = async (row: AuthorizedEmailRow) => {
    const ok = await confirmDialog({
      title: "Retirer cette habilitation ?",
      description: `${row.email} ne sera plus activé automatiquement.`,
      confirmLabel: "Retirer",
    });
    if (!ok) return;
    try {
      await removeAuthorizedFn({ data: row.id, ...opts });
      setAuthorized((prev) => prev.filter((a) => a.id !== row.id));
      toast.success("Habilitation retirée.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Suppression impossible.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Demandes de direction */}
      <section className="rounded-3xl border border-amber-200 bg-amber-50/40 overflow-hidden shadow-sm">
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-amber-200/60">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-amber-500 text-white shadow-2xs">
              <Crown className="size-4.5" />
            </div>
            <div>
              <h3 className="font-display font-black text-sm text-ink">
                Demandes de rôle « Chef d'établissement »
              </h3>
              <p className="text-[11px] font-medium text-ink/50">
                Auto-proclamées à la déclaration d'un établissement — à valider manuellement.
              </p>
            </div>
          </div>
          <span className="rounded-full bg-amber-100 border border-amber-200 px-2.5 py-0.5 text-[10px] font-black uppercase text-amber-800">
            {pendingRequests.length} en attente
          </span>
        </div>
        <div className="divide-y divide-amber-200/50 bg-white/60">
          {loadingRequests ? (
            <div className="p-5 flex items-center gap-2 text-xs font-bold text-ink/50">
              <Loader2 className="size-4 animate-spin" /> Chargement…
            </div>
          ) : pendingRequests.length === 0 ? (
            <div className="p-5 text-xs font-medium text-ink/40">
              Aucune demande de direction en attente.
            </div>
          ) : (
            pendingRequests.map((r) => (
              <div
                key={r.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-3.5"
              >
                <div className="min-w-0">
                  <p className="text-sm font-bold text-ink">
                    {r.userName || r.userEmail || r.userId}
                  </p>
                  <p className="text-[11px] font-medium text-ink/50 truncate">
                    {r.userEmail ? `${r.userEmail} · ` : ""}
                    Direction de {r.schoolName} ({r.schoolCode}) — demandée le{" "}
                    {new Date(r.createdAt).toLocaleDateString("fr-FR")}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => void handleDecideRequest(r, true)}
                    className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3 py-1.5 text-[11px] font-bold text-white cursor-pointer shadow-2xs"
                  >
                    <Check className="size-3.5" /> Approuver
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDecideRequest(r, false)}
                    className="inline-flex items-center gap-1 rounded-xl border border-ink/10 bg-white px-3 py-1.5 text-[11px] font-bold text-ink/60 hover:text-red-600 cursor-pointer shadow-2xs"
                  >
                    <X className="size-3.5" /> Rejeter
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Profils professionnels */}
      <section className="rounded-3xl border border-ink/10 bg-white overflow-hidden shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-ink/5">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-xl bg-indigo-600 text-white shadow-2xs">
              <BadgeCheck className="size-4.5" />
            </div>
            <div>
              <h3 className="font-display font-black text-sm text-ink">Profils professionnels</h3>
              <p className="text-[11px] font-medium text-ink/50">
                Auto-inscriptions (enseignants, conseillers, psychologues) à activer — l'admin n'y
                avait plus accès.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="size-3.5 text-ink/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                value={profileSearch}
                onChange={(e) => setProfileSearch(e.target.value)}
                placeholder="Nom, e-mail, établissement…"
                className="w-56 rounded-xl border border-ink/10 bg-surface pl-8 pr-3 py-2 text-[11px] font-bold text-ink outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as "all" | "pending" | "verified" | "suspended")
              }
              className="rounded-xl border border-ink/10 bg-white px-2.5 py-2 text-[11px] font-bold text-ink cursor-pointer"
            >
              <option value="pending">En attente</option>
              <option value="verified">Vérifiés</option>
              <option value="suspended">Suspendus</option>
              <option value="all">Tous</option>
            </select>
          </div>
        </div>
        <div className="divide-y divide-ink/5">
          {loadingProfiles ? (
            <div className="p-5 flex items-center gap-2 text-xs font-bold text-ink/50">
              <Loader2 className="size-4 animate-spin" /> Chargement…
            </div>
          ) : filteredProfiles.length === 0 ? (
            <div className="p-5 text-xs font-medium text-ink/40">
              {statusFilter === "pending"
                ? "Aucun profil en attente — tous les professionnels sont traités."
                : "Aucun profil ne correspond à ce filtre."}
            </div>
          ) : (
            filteredProfiles.map((p) => {
              const badge = STATUS_BADGE[p.verificationStatus] ?? STATUS_BADGE.pending;
              return (
                <div
                  key={p.id}
                  className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-5 py-3.5 hover:bg-surface/40 transition-colors"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-bold text-ink">{p.fullName}</p>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${badge.className}`}
                      >
                        {badge.label}
                      </span>
                    </div>
                    <p className="text-[11px] font-medium text-ink/50 truncate">
                      {ROLE_LABELS[p.professionalRole] ?? p.professionalRole}
                      {p.email ? ` · ${p.email}` : ""}
                      {p.schoolName
                        ? ` · ${p.schoolName}`
                        : p.organizationName
                          ? ` · ${p.organizationName}`
                          : ""}
                      {p.delegatedStudentsCount > 0
                        ? ` · ${p.delegatedStudentsCount} élève(s) délégué(s)`
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {p.verificationStatus !== "verified" && (
                      <button
                        type="button"
                        disabled={busyProfileId === p.id}
                        onClick={() => void handleVerification(p, "verify")}
                        className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-3 py-1.5 text-[11px] font-bold text-white cursor-pointer shadow-2xs"
                      >
                        {busyProfileId === p.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <ShieldCheck className="size-3.5" />
                        )}
                        Vérifier
                      </button>
                    )}
                    {p.verificationStatus === "suspended" && (
                      <button
                        type="button"
                        disabled={busyProfileId === p.id}
                        onClick={() => void handleVerification(p, "requeue")}
                        className="inline-flex items-center gap-1 rounded-xl border border-ink/10 bg-white px-3 py-1.5 text-[11px] font-bold text-ink/70 hover:text-ink cursor-pointer shadow-2xs"
                      >
                        <RotateCcw className="size-3.5" /> Remettre en attente
                      </button>
                    )}
                    {p.verificationStatus !== "suspended" && (
                      <button
                        type="button"
                        disabled={busyProfileId === p.id}
                        onClick={() => void handleVerification(p, "suspend")}
                        className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-[11px] font-bold text-red-700 hover:bg-red-100 cursor-pointer shadow-2xs"
                      >
                        <Ban className="size-3.5" /> Suspendre
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* E-mails autorisés */}
      <section className="rounded-3xl border border-ink/10 bg-white overflow-hidden shadow-sm">
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-ink/5">
          <div className="grid size-9 place-items-center rounded-xl bg-purple-600 text-white shadow-2xs">
            <Mail className="size-4.5" />
          </div>
          <div>
            <h3 className="font-display font-black text-sm text-ink">E-mails autorisés</h3>
            <p className="text-[11px] font-medium text-ink/50">
              Activation automatique : un compte qui crée son profil avec l'un de ces e-mails est
              vérifié immédiatement (chaîne d'autorisation des établissements et structures).
            </p>
          </div>
        </div>

        <form
          onSubmit={handleAddAuthorized}
          className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5 px-5 py-4 bg-surface/60 border-b border-ink/5 items-end"
        >
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-ink/50">
              E-mail professionnel
            </label>
            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="professeur@lycee-x.ci"
              className="w-full rounded-xl border border-ink/10 bg-white px-3 py-2 text-[11px] font-bold text-ink outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-ink/50">
              Fonction attendue
            </label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="w-full rounded-xl border border-ink/10 bg-white px-2.5 py-2 text-[11px] font-bold text-ink cursor-pointer"
            >
              <option value="">— Libre —</option>
              <option value="teacher">Enseignant</option>
              <option value="counselor">Conseiller d'orientation</option>
              <option value="psychologist">Psychologue scolaire</option>
              <option value="other">Direction / Autre</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-ink/50 flex items-center gap-1.5">
              <input
                type="checkbox"
                checked={newIsLeader}
                onChange={(e) => setNewIsLeader(e.target.checked)}
                className="accent-purple-600"
              />
              Chef d'établissement
            </label>
            <input
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Note (optionnel)"
              className="w-full rounded-xl border border-ink/10 bg-white px-3 py-2 text-[11px] font-bold text-ink outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div className="space-y-1 lg:col-span-1">
            <label className="text-[10px] font-extrabold uppercase tracking-wider text-ink/50">
              Établissement rattaché
            </label>
            <AuthorizedEmailSchoolSelect value={newSchoolId} onChange={setNewSchoolId} />
          </div>
          <button
            type="submit"
            disabled={addingEmail}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-4 py-2 text-[11px] font-black text-white cursor-pointer shadow-2xs"
          >
            {addingEmail ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Plus className="size-3.5" />
            )}
            Habilité
          </button>
        </form>

        <div className="divide-y divide-ink/5">
          {loadingAuthorized ? (
            <div className="p-5 flex items-center gap-2 text-xs font-bold text-ink/50">
              <Loader2 className="size-4 animate-spin" /> Chargement…
            </div>
          ) : authorized.length === 0 ? (
            <div className="p-5 text-xs font-medium text-ink/40">
              Aucun e-mail habilité pour l'instant.
            </div>
          ) : (
            authorized.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-surface/40 transition-colors"
              >
                <div className="min-w-0 flex items-center gap-2.5">
                  <div className="grid size-8 place-items-center rounded-lg bg-purple-50 border border-purple-100 shrink-0">
                    <Building2 className="size-4 text-purple-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-ink font-mono">{a.email}</p>
                    <p className="text-[10px] font-medium text-ink/50 truncate">
                      {a.expectedRole
                        ? (ROLE_LABELS[a.expectedRole] ?? a.expectedRole)
                        : "Fonction libre"}
                      {a.isLeader ? " · Chef d'établissement" : ""}
                      {a.schoolName ? ` · ${a.schoolName}` : " · Sans établissement (indépendant)"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleRemoveAuthorized(a)}
                  className="grid size-7 place-items-center rounded-lg border border-ink/10 text-ink/40 hover:text-red-600 hover:border-red-200 cursor-pointer shrink-0"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}

/**
 * Select d'établissement léger (annuaire via listEducatorProfilesAdmin est
 * lourd) : saisie d'un code de ralliement ou d'un nom — la contrainte FK
 * valide à l'enregistrement. Un select exhaustif est inutile ici : l'admin
 * connaît le #code de l'école qu'il habilite.
 */
function AuthorizedEmailSchoolSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [uuid, setUuid] = useState(value);

  useEffect(() => setUuid(value), [value]);

  const isValidUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
    uuid.trim(),
  );

  return (
    <input
      value={uuid}
      onChange={(e) => {
        setUuid(e.target.value);
        onChange(e.target.value);
      }}
      placeholder="ID établissement (UUID) — vide = indépendant"
      className="w-full rounded-xl border border-ink/10 bg-white px-3 py-2 text-[11px] font-mono font-bold text-ink outline-none focus:ring-2 focus:ring-purple-500"
      style={{ borderColor: uuid && !isValidUuid ? "#fecaca" : undefined }}
    />
  );
}
