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
  lookupEducator,
  type EducatorLookupResult,
} from "@/lib/educators-lookup.functions";
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
  MessageSquare,
  Search,
  AtSign,
  Hash,
  Mail,
  Copy,
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

  // Tab mode: "handle" | "whatsapp" | "email"
  const [activeMode, setActiveMode] = useState<"handle" | "whatsapp" | "email">("handle");

  // Handle & Code Classe search
  const [searchQuery, setSearchQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [foundEducator, setFoundEducator] = useState<EducatorLookupResult | null>(null);
  const [searchedOnce, setSearchedOnce] = useState(false);

  // Form states
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [organization, setOrganization] = useState("");
  const [role, setRole] = useState<"teacher" | "counselor" | "psychologist" | "other">("teacher");
  const [durationDays, setDurationDays] = useState(300);
  const [sharePhone, setSharePhone] = useState(true);

  // WhatsApp target phone
  const [targetWhatsApp, setTargetWhatsApp] = useState("");

  const createFn = useServerFn(createChildDelegation);
  const listFn = useServerFn(listChildDelegations);
  const revokeFn = useServerFn(revokeChildDelegation);
  const lookupFn = useServerFn(lookupEducator);

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

  // Recherche par handle ou code de classe
  const handleSearchEducator = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearching(true);
    setFoundEducator(null);
    setSearchedOnce(true);
    try {
      const opts = session?.access_token
        ? { headers: { Authorization: `Bearer ${session.access_token}` } }
        : {};
      const result = await lookupFn({ data: searchQuery.trim(), ...opts });
      setFoundEducator(result);
      if (result) {
        if (result.email) setEmail(result.email);
        setName(result.fullName);
        if (result.organizationName) setOrganization(result.organizationName);
        setRole(result.professionalRole);
      }
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la recherche du professionnel.");
    } finally {
      setSearching(false);
    }
  };

  const handleConfirmDelegation = async (targetEmail: string, educatorRole = role) => {
    if (!targetEmail.trim()) {
      toast.error("Une adresse email ou un compte est requis pour finaliser l'accès.");
      return;
    }

    setSubmitting(true);
    try {
      const opts = session?.access_token
        ? { headers: { Authorization: `Bearer ${session.access_token}` } }
        : {};
      await createFn({
        data: {
          childId,
          beneficiaryEmail: targetEmail.trim(),
          beneficiaryName: name.trim() || undefined,
          organizationName: organization.trim() || undefined,
          professionalRole: educatorRole,
          scope: "orientation",
          durationDays,
          shareParentPhone: sharePhone,
        },
        ...opts,
      });

      toast.success(`Pass Éducatif accordé avec succès !`);
      setFoundEducator(null);
      setSearchQuery("");
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

  // WhatsApp link preparation
  const cleanPhone = targetWhatsApp.replace(/[^\d]/g, "");
  const whatsappShareText = encodeURIComponent(
    `Bonjour, je vous partage le Passeport Pédagogique Génizio de mon enfant ${childName} (forces, intelligences multiples et profil d'apprentissage) : ${window.location.origin}/educator`,
  );
  const whatsappUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${whatsappShareText}`
    : `https://wa.me/?text=${whatsappShareText}`;

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

        {/* Choix du mode de ralliement */}
        <div className="flex rounded-2xl bg-surface p-1 border border-ink/5 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveMode("handle")}
            className={`flex-1 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeMode === "handle"
                ? "bg-white text-indigo-700 shadow-xs font-black"
                : "text-ink/60 hover:text-ink"
            }`}
          >
            <AtSign className="size-3.5" />
            <span>@Handle ou #Classe</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMode("whatsapp")}
            className={`flex-1 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeMode === "whatsapp"
                ? "bg-white text-emerald-700 shadow-xs font-black"
                : "text-ink/60 hover:text-ink"
            }`}
          >
            <MessageSquare className="size-3.5" />
            <span>WhatsApp Direct</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveMode("email")}
            className={`flex-1 py-2 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeMode === "email"
                ? "bg-white text-ink shadow-xs font-black"
                : "text-ink/60 hover:text-ink"
            }`}
          >
            <Mail className="size-3.5" />
            <span>Email classique</span>
          </button>
        </div>

        {/* MODE 1 : RECHERCHE PAR @HANDLE OU #CODECLASSE */}
        {activeMode === "handle" && (
          <div className="space-y-4 text-xs">
            <form onSubmit={handleSearchEducator} className="space-y-2">
              <label className="block font-bold text-ink">
                Identifiant professionnel (@) ou Code de Classe (#) :
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="size-4 text-ink/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="ex: @kone.maths ou #LCA-6B"
                    className="w-full rounded-xl border border-ink/10 pl-9 pr-3 py-2.5 font-semibold text-ink outline-none focus:ring-2 focus:ring-brand/30"
                  />
                </div>
                <button
                  type="submit"
                  disabled={searching || !searchQuery.trim()}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {searching ? <Loader2 className="size-3.5 animate-spin" /> : "Rechercher"}
                </button>
              </div>
            </form>

            {/* Résultat de la recherche */}
            {foundEducator && (
              <div className="rounded-2xl border border-emerald-300 bg-emerald-50/60 p-4 space-y-3 animate-in fade-in">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-display font-black text-sm text-emerald-950">
                        {foundEducator.fullName}
                      </h4>
                      {foundEducator.isVerified && (
                        <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-[9px] font-black text-emerald-900">
                          Vérifié
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-emerald-900/80 font-medium mt-0.5">
                      {foundEducator.professionalRole === "teacher"
                        ? "Enseignant"
                        : foundEducator.professionalRole === "counselor"
                          ? "Conseiller d'Orientation"
                          : "Professionnel de l'éducation"}
                      {foundEducator.organizationName ? ` · ${foundEducator.organizationName}` : ""}
                      {foundEducator.classCode ? ` (Classe ${foundEducator.classCode})` : ""}
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between gap-3">
                  <div className="text-[11px] text-emerald-900/70 font-medium">
                    Durée : <strong>Année scolaire (jusqu'au 31 juillet)</strong>
                  </div>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() =>
                      handleConfirmDelegation(
                        foundEducator.email || `${foundEducator.handle?.replace("@", "")}@genizio.edu`,
                        foundEducator.professionalRole,
                      )
                    }
                    className="px-4 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="size-3.5" />
                    )}
                    <span>Confirmer et Transmettre le Pass</span>
                  </button>
                </div>
              </div>
            )}

            {searchedOnce && !foundEducator && !searching && (
              <div className="rounded-2xl border border-ink/10 bg-surface p-4 text-center text-ink/60 space-y-1">
                <p className="font-bold text-ink">Aucun professionnel trouvé pour "{searchQuery}".</p>
                <p className="text-[11px]">
                  Vérifiez l'identifiant auprès de votre école ou utilisez le partage WhatsApp ci-dessus.
                </p>
              </div>
            )}
          </div>
        )}

        {/* MODE 2 : PARTAGE PAR WHATSAPP */}
        {activeMode === "whatsapp" && (
          <div className="space-y-4 text-xs">
            <p className="text-ink/75 leading-relaxed">
              Transmettez directement l'invitation à votre enseignant sur WhatsApp. Il pourra se
              connecter avec son compte Google et retrouver immédiatement le dossier de {childName}.
            </p>

            <div>
              <label className="block font-bold text-ink mb-1">
                Numéro WhatsApp du professeur (optionnel) :
              </label>
              <input
                type="tel"
                value={targetWhatsApp}
                onChange={(e) => setTargetWhatsApp(e.target.value)}
                placeholder="+225 07 00 00 00 00"
                className="w-full rounded-xl border border-ink/10 p-2.5 font-medium text-ink outline-none"
              />
            </div>

            <div className="p-3 bg-surface rounded-2xl border border-ink/5 space-y-2">
              <p className="font-bold text-ink/50 uppercase tracking-wider text-[10px]">
                Aperçu du message WhatsApp :
              </p>
              <p className="text-xs text-ink/80 italic font-medium leading-relaxed">
                "Bonjour, je vous partage le Passeport Pédagogique Génizio de mon enfant {childName}{" "}
                (forces, intelligences multiples et profil d'apprentissage) :{" "}
                <span className="text-indigo-600 underline">{window.location.origin}/educator</span>"
              </p>
            </div>

            <div className="flex gap-2">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition-colors flex items-center justify-center gap-2"
              >
                <MessageSquare className="size-4" />
                <span>Ouvrir WhatsApp et envoyer</span>
              </a>
              <button
                type="button"
                onClick={() => {
                  void navigator.clipboard.writeText(
                    `Bonjour, je vous partage le Passeport Pédagogique Génizio de mon enfant ${childName} : ${window.location.origin}/educator`,
                  );
                  toast.success("Lien d'invitation copié !");
                }}
                className="px-4 py-3 rounded-2xl bg-surface hover:bg-ink/5 border border-ink/10 font-bold text-ink transition-colors cursor-pointer"
                title="Copier le texte"
              >
                <Copy className="size-4" />
              </button>
            </div>
          </div>
        )}

        {/* MODE 3 : FORMULAIRE EMAIL MANUEL */}
        {activeMode === "email" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleConfirmDelegation(email);
            }}
            className="space-y-4 text-xs"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-ink mb-1">
                  Email du destinataire <span className="text-rose-500">*</span>
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
        )}

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
