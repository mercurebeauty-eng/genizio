import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useSession } from "@/hooks/use-session";
import {
  createChildDelegation,
  listChildDelegations,
  revokeChildDelegation,
  type ChildDelegationDetail,
} from "@/lib/delegations.functions";
import {
  GraduationCap,
  X,
  Share2,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  Trash2,
  Loader2,
  Building2,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import { confirmDialog } from "@/components/ui/confirm-dialog";

type SharePassportModalProps = {
  childId: string;
  childName: string;
  isOpen: boolean;
  onClose: () => void;
};

export function SharePassportModal({
  childId,
  childName,
  isOpen,
  onClose,
}: SharePassportModalProps) {
  const { session } = useSession();
  const [delegations, setDelegations] = useState<ChildDelegationDetail[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [role, setRole] = useState<"teacher" | "counselor" | "psychologist" | "other">("teacher");
  const [durationDays, setDurationDays] = useState(300);
  const [sharePhone, setSharePhone] = useState(true);

  const createFn = useServerFn(createChildDelegation);
  const listFn = useServerFn(listChildDelegations);
  const revokeFn = useServerFn(revokeChildDelegation);

  const loadDelegations = async () => {
    if (!childId) return;
    setLoading(true);
    try {
      const opts = session?.access_token
        ? { headers: { Authorization: `Bearer ${session.access_token}` } }
        : {};
      const list = await listFn({ data: childId, ...opts });
      setDelegations(list ?? []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) void loadDelegations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, childId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setSubmitting(true);
    try {
      const opts = session?.access_token
        ? { headers: { Authorization: `Bearer ${session.access_token}` } }
        : {};
      await createFn({
        data: {
          childId,
          beneficiaryEmail: email.trim(),
          beneficiaryName: name.trim() || undefined,
          organizationName: organization.trim() || undefined,
          professionalRole: role,
          scope: "orientation",
          durationDays,
          shareParentPhone: sharePhone,
        },
        ...opts,
      });

      toast.success(`Accès accordé pour ${email} !`);
      setEmail("");
      setName("");
      setOrganization("");
      void loadDelegations();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la création de l'accès.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (delegationId: string, beneficiaryEmail: string) => {
    const confirmed = await confirmDialog({
      title: "Révoquer cet accès ?",
      description: `L'enseignant/conseiller (${beneficiaryEmail}) ne pourra plus accéder au profil de ${childName}.`,
      confirmLabel: "Révoquer",
      variant: "danger",
    });

    if (!confirmed) return;

    try {
      const opts = session?.access_token
        ? { headers: { Authorization: `Bearer ${session.access_token}` } }
        : {};
      await revokeFn({ data: delegationId, ...opts });
      toast.success("Accès révoqué immédiatement.");
      void loadDelegations();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la révocation.");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-ink/5 pb-4">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-2xl bg-indigo-600 text-white shadow-sm shrink-0">
              <GraduationCap className="size-6" />
            </div>
            <div>
              <h3 className="font-display font-black text-lg text-ink">
                Passerelle Éducative & Orientation
              </h3>
              <p className="text-xs text-ink/60 font-semibold mt-0.5">
                Partager le profil pédagogique de <strong>{childName}</strong> avec son école
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full hover:bg-ink/5 text-ink/60 cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Encadré d'information */}
        <div className="rounded-2xl border border-indigo-100 bg-indigo-50/60 p-4 text-xs text-indigo-950 space-y-1">
          <p className="font-black text-indigo-900 flex items-center gap-1.5">
            <ShieldCheck className="size-4 text-indigo-700" />
            <span>Accès sécurisé, qualifié et révocable</span>
          </p>
          <p className="leading-relaxed text-indigo-900/80">
            L'enseignant ou le conseiller reçoit une vue synthétique (Carte des Talents, canaux
            d'apprentissage, boussole d'orientation). Aucune information de paiement ni adresse
            privée n'est accessible.
          </p>
        </div>

        {/* Formulaire de délégation */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <h4 className="font-display font-bold text-sm text-ink border-b border-ink/5 pb-1">
            Accorder un nouvel accès
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-ink mb-1">
                Email professionnel du destinataire <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="professeur@ecole.com"
                className="w-full rounded-xl border border-ink/10 p-2.5 font-medium text-ink outline-none focus:ring-2 focus:ring-brand/30"
              />
            </div>
            <div>
              <label className="block font-bold text-ink mb-1">Rôle professionnel</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                className="w-full rounded-xl border border-ink/10 p-2.5 font-medium text-ink outline-none cursor-pointer"
              >
                <option value="teacher">Professeur / Enseignant</option>
                <option value="counselor">Conseiller d'orientation</option>
                <option value="psychologist">Psychologue scolaire</option>
                <option value="other">Autre professionnel de l'éducation</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-bold text-ink mb-1">Nom / Prénom de l'enseignant</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex: M. Koné"
                className="w-full rounded-xl border border-ink/10 p-2.5 font-medium text-ink outline-none"
              />
            </div>
            <div>
              <label className="block font-bold text-ink mb-1">Établissement / École</label>
              <input
                type="text"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                placeholder="ex: Collège Sacré-Cœur"
                className="w-full rounded-xl border border-ink/10 p-2.5 font-medium text-ink outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-ink mb-1">Durée de l'autorisation</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { days: 300, label: "Année scolaire", desc: "Recommandé" },
                { days: 30, label: "30 jours", desc: "Orientation" },
                { days: 15, label: "15 jours", desc: "Diagnostic" },
              ].map((d) => (
                <button
                  key={d.days}
                  type="button"
                  onClick={() => setDurationDays(d.days)}
                  className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                    durationDays === d.days
                      ? "border-brand bg-brand/10 text-brand font-black"
                      : "border-ink/10 bg-surface text-ink/70"
                  }`}
                >
                  <p className="font-bold">{d.label}</p>
                  <p className="text-[10px] opacity-75">{d.desc}</p>
                </button>
              ))}
            </div>
          </div>

          <label className="flex items-center gap-2 p-3 rounded-xl bg-surface border border-ink/5 cursor-pointer">
            <input
              type="checkbox"
              checked={sharePhone}
              onChange={(e) => setSharePhone(e.target.checked)}
              className="size-4 rounded accent-brand cursor-pointer"
            />
            <span className="text-xs font-semibold text-ink leading-snug">
              Partager mon numéro WhatsApp / Téléphone avec ce professionnel pour faciliter les échanges
              scolaires.
            </span>
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Share2 className="size-4" />
            )}
            <span>Transmettre le Pass Pédagogique</span>
          </button>
        </form>

        {/* Accès en cours */}
        <div className="space-y-3 border-t border-ink/5 pt-4">
          <h4 className="font-display font-bold text-sm text-ink flex items-center justify-between">
            <span>Accès actuellement accordés ({delegations.length})</span>
            {loading && <Loader2 className="size-3.5 animate-spin text-ink/40" />}
          </h4>

          {delegations.length === 0 ? (
            <p className="text-xs text-ink/50 italic py-2">
              Aucun accès enseignant n'a été accordé pour l'instant.
            </p>
          ) : (
            <div className="space-y-2">
              {delegations.map((del) => {
                const isRevoked = del.status === "revoked";
                const isExpired = new Date(del.valid_until).getTime() < Date.now();

                return (
                  <div
                    key={del.id}
                    className={`rounded-2xl border p-3 flex items-center justify-between gap-3 text-xs ${
                      isRevoked || isExpired
                        ? "border-ink/5 bg-surface/50 opacity-60"
                        : "border-indigo-100 bg-indigo-50/30"
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-ink truncate">
                          {del.beneficiary_name || del.beneficiary_email}
                        </span>
                        <span className="rounded-full bg-white px-2 py-0.5 text-[9px] font-black uppercase text-indigo-700 border border-indigo-100">
                          {del.professional_role === "teacher"
                            ? "Prof"
                            : del.professional_role === "counselor"
                              ? "Conseiller"
                              : "Éducateur"}
                        </span>
                        {del.organization_name && (
                          <span className="text-[10px] text-ink/50 truncate">
                            · {del.organization_name}
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-ink/50 mt-0.5">
                        {isRevoked
                          ? "Accès révoqué"
                          : isExpired
                            ? "Accès expiré"
                            : `Valable jusqu'au ${new Date(del.valid_until).toLocaleDateString("fr-FR")}`}
                      </p>
                    </div>

                    {!isRevoked && !isExpired && (
                      <button
                        type="button"
                        onClick={() => void handleRevoke(del.id, del.beneficiary_email)}
                        className="p-1.5 rounded-xl text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                        title="Révoquer cet accès"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
