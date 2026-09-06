import { useState, useEffect } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useSession } from "@/hooks/use-session";
import {
  listQuarterlySafetyAudits,
  recordQuarterlySafetyAudit,
  auditSupportMentorSquadSafeguardsAdmin,
  type ChildSafetyAuditDetail,
} from "@/lib/safeguarding.functions";
import {
  listDecisionProposalsAdmin,
  resolveDecisionProposalAdmin,
  generateTripartiteReportAdmin,
} from "@/lib/tripartite.functions";
import {
  PhoneCall,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Search,
  Star,
  Loader2,
  X,
  HeartHandshake,
  ClipboardCheck,
} from "lucide-react";
import { toast } from "sonner";

export interface AdminSafeguardingAuditsProps {
  onDataChanged?: () => void | Promise<void>;
  isRefreshing?: boolean;
}

export function AdminSafeguardingAudits({
  onDataChanged,
  isRefreshing = false,
}: AdminSafeguardingAuditsProps = {}) {
  const { session } = useSession();
  const currentQuarter = `${new Date().getFullYear()}-Q${Math.floor(new Date().getMonth() / 3) + 1}`;
  const [quarterPeriod, setQuarterPeriod] = useState(currentQuarter);
  const [audits, setAudits] = useState<ChildSafetyAuditDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Audit recording modal
  const [selectedAudit, setSelectedAudit] = useState<ChildSafetyAuditDetail | null>(null);
  const [auditStatus, setAuditStatus] = useState<
    "pending" | "contacted_ok" | "warning" | "escalated" | "unreachable"
  >("contacted_ok");
  const [contactChannel, setContactChannel] = useState<
    "phone_call" | "whatsapp_voice" | "in_person" | "in_app"
  >("phone_call");
  const [contactedPerson, setContactedPerson] = useState("Mère");
  const [rating, setRating] = useState(5);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const listAuditsFn = useServerFn(listQuarterlySafetyAudits);
  const recordAuditFn = useServerFn(recordQuarterlySafetyAudit);

  const loadAudits = async () => {
    setLoading(true);
    try {
      const opts = session?.access_token
        ? { headers: { Authorization: `Bearer ${session.access_token}` } }
        : {};
      const data = await listAuditsFn({ data: quarterPeriod, ...opts });
      setAudits(data ?? []);
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors du chargement des audits trimestriels.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadAudits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quarterPeriod]);

  const handleSaveAudit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAudit) return;
    setSaving(true);

    // Optimistic UI update
    const previousAudits = audits;
    const now = new Date().toISOString();
    setAudits((prev) =>
      prev.map((a) =>
        a.child_id === selectedAudit.child_id
          ? {
              ...a,
              status: auditStatus,
              contact_channel: contactChannel,
              contacted_person: contactedPerson,
              child_wellbeing_rating: rating,
              notes,
              conducted_at: now,
            }
          : a,
      ),
    );

    try {
      const opts = session?.access_token
        ? { headers: { Authorization: `Bearer ${session.access_token}` } }
        : {};
      await recordAuditFn({
        data: {
          childId: selectedAudit.child_id,
          mentorId: selectedAudit.mentor_id,
          quarterPeriod: selectedAudit.quarter_period,
          status: auditStatus,
          contactChannel,
          contactedPerson,
          childWellbeingRating: rating,
          notes,
        },
        ...opts,
      });
      toast.success("Audit de bienveillance enregistré avec succès.");
      setSelectedAudit(null);

      // Optional broadcast explicitly
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        const channel = supabase.channel("admin-tripartite-sync");
        void channel.send({
          type: "broadcast",
          event: "safeguarding_updated",
          payload: { timestamp: Date.now() },
        });
      } catch (e) {}

      void onDataChanged?.();
    } catch (err) {
      setAudits(previousAudits); // rollback
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const filteredAudits = audits.filter((a) => {
    const matchesSearch =
      a.child_name.toLowerCase().includes(search.toLowerCase()) ||
      a.mentor_name.toLowerCase().includes(search.toLowerCase()) ||
      (a.family_phone && a.family_phone.includes(search));
    const matchesStatus = statusFilter === "all" || a.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const pendingCount = audits.filter((a) => a.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Boucle Tripartite (Phase 4) — file de propositions + rapports trimestriels */}
      <TripartiteDecisionQueue quarterPeriod={quarterPeriod.replace("-Q", "-T")} onDataChanged={onDataChanged} />

      {/* Anti-régression escouade (deux-modèles) : audit des garde-fous d'un mentor
          de Soutien — la décision (warning/suspension) est appliquée au profil. */}
      <SquadSafeguardAuditBox onDataChanged={onDataChanged} />

      {/* Explication Génizio Care */}
      <div className="rounded-3xl border border-emerald-200/80 bg-emerald-50/70 p-5 shadow-sm">
        <div className="flex gap-3">
          <HeartHandshake className="size-6 text-emerald-700 shrink-0 mt-0.5" />
          <div className="text-xs sm:text-sm text-emerald-950 leading-relaxed space-y-1">
            <p className="font-black text-emerald-900 flex items-center gap-2">
              <span>Génizio Care — Suivi & Protection des Familles</span>
              <span className="rounded-full bg-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-900">
                Trimestre {quarterPeriod}
              </span>
            </p>
            <p>
              Pour garantir la sécurité des enfants (particulièrement quand les parents sont
              analphabètes ou indisponibles), l'équipe Génizio réalise un{" "}
              <strong>contrôle qualité régulier</strong> tous les 3 mois par appel direct ou message
              WhatsApp avec la famille.
            </p>
          </div>
        </div>
      </div>

      {/* Barre de filtrage & Trimestres */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1">
            <Search className="size-4 text-ink/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher enfant, mentor ou téléphone…"
              className="w-full rounded-2xl border border-ink/10 bg-surface pl-9 pr-4 py-2.5 text-xs font-medium text-ink outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-2xl border border-ink/10 bg-white px-3 py-2.5 text-xs font-bold text-ink outline-none cursor-pointer"
          >
            <option value="all">Tous les statuts ({audits.length})</option>
            <option value="pending">À auditer ({pendingCount})</option>
            <option value="contacted_ok">Conformes</option>
            <option value="warning">Signaux d'attention</option>
            <option value="escalated">Escaladés</option>
            <option value="unreachable">Injoignables</option>
          </select>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs font-bold text-ink/60">Trimestre :</span>
          <select
            value={quarterPeriod}
            onChange={(e) => setQuarterPeriod(e.target.value)}
            className="rounded-2xl border border-ink/10 bg-white px-3 py-2 text-xs font-black text-brand outline-none cursor-pointer"
          >
            <option value="2026-Q3">2026 — T3</option>
            <option value="2026-Q4">2026 — T4</option>
            <option value="2027-Q1">2027 — T1</option>
            <option value="2027-Q2">2027 — T2</option>
          </select>
        </div>
      </div>

      {/* Grille des enfants à auditer */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-brand" />
        </div>
      ) : filteredAudits.length === 0 ? (
        <div className="rounded-3xl border border-ink/10 bg-white p-12 text-center shadow-sm">
          <p className="font-bold text-ink">Aucun enfant trouvé pour ce trimestre.</p>
          <p className="text-xs text-ink/60 mt-1">
            Les enfants apparaissent ici dès qu'un mentor leur est assigné.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredAudits.map((audit) => {
            const cleanPhone = audit.family_phone?.replace(/[^\d+]/g, "");
            const whatsappUrl = cleanPhone
              ? `https://wa.me/${cleanPhone.replace("+", "")}?text=${encodeURIComponent(
                  `Bonjour, c'est l'équipe Génizio Care concernant le suivi pédagogique de ${audit.child_name}.`,
                )}`
              : null;

            return (
              <div
                key={audit.id}
                className="rounded-3xl border border-ink/10 bg-white p-5 shadow-sm flex flex-col justify-between space-y-4 hover:border-brand/30 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="font-display font-black text-base text-ink">
                        {audit.child_name}
                      </h4>
                      <p className="text-xs text-ink/60 font-semibold mt-0.5">
                        Mentor : <span className="text-ink font-bold">{audit.mentor_name}</span>
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider shrink-0 ${
                        audit.status === "contacted_ok"
                          ? "bg-emerald-100 text-emerald-800"
                          : audit.status === "warning"
                            ? "bg-amber-100 text-amber-900"
                            : audit.status === "escalated"
                              ? "bg-rose-100 text-rose-900"
                              : audit.status === "unreachable"
                                ? "bg-stone-100 text-stone-700"
                                : "bg-sky-100 text-sky-800 animate-pulse"
                      }`}
                    >
                      {audit.status === "contacted_ok"
                        ? "Conforme"
                        : audit.status === "warning"
                          ? "Attention"
                          : audit.status === "escalated"
                            ? "Alerte"
                            : audit.status === "unreachable"
                              ? "Injoignable"
                              : "À auditer"}
                    </span>
                  </div>

                  {/* Coordonnées famille */}
                  <div className="rounded-2xl bg-surface p-3 border border-ink/5 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-ink/60 font-semibold">Téléphone Famille :</span>
                      <span className="font-bold text-ink">
                        {audit.family_phone || "Non renseigné"}
                      </span>
                    </div>

                    {audit.family_phone && (
                      <div className="flex items-center gap-2 pt-1 border-t border-ink/5">
                        <a
                          href={`tel:${cleanPhone}`}
                          className="flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-xl bg-ink/5 hover:bg-ink/10 text-ink font-bold text-[11px] transition-colors"
                        >
                          <PhoneCall className="size-3" />
                          <span>Appeler</span>
                        </a>
                        {whatsappUrl && (
                          <a
                            href={whatsappUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-1 py-1 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition-colors"
                          >
                            <MessageSquare className="size-3" />
                            <span>WhatsApp</span>
                          </a>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Notes d'audit précédentes si existantes */}
                  {audit.conducted_at && (
                    <div className="mt-3 space-y-1 text-xs border-t border-dashed border-ink/10 pt-2">
                      <div className="flex items-center justify-between text-[11px] text-ink/50">
                        <span>
                          Audité le {new Date(audit.conducted_at).toLocaleDateString("fr-FR")}
                        </span>
                        {audit.child_wellbeing_rating && (
                          <span className="flex items-center text-amber-500 font-bold gap-0.5">
                            <Star className="size-3 fill-current" />
                            {audit.child_wellbeing_rating}/5
                          </span>
                        )}
                      </div>
                      {audit.notes && (
                        <p className="text-[11px] text-ink/75 italic line-clamp-2">
                          "{audit.notes}"
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedAudit(audit);
                    setAuditStatus(
                      audit.status === "pending" ? "contacted_ok" : (audit.status as any),
                    );
                    setRating(audit.child_wellbeing_rating || 5);
                    setNotes(audit.notes || "");
                    setContactedPerson(audit.contacted_person || "Mère");
                  }}
                  className="w-full py-2.5 px-4 rounded-2xl bg-brand hover:bg-brand/90 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer text-center"
                >
                  {audit.status === "pending" ? "Enregistrer l'appel" : "Modifier l'audit"}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal d'enregistrement d'audit */}
      {selectedAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between border-b border-ink/5 pb-3">
              <div>
                <h3 className="font-display font-black text-lg text-ink">
                  Audit de Bienveillance — {selectedAudit.child_name}
                </h3>
                <p className="text-xs text-ink/60 font-semibold">
                  Mentor : {selectedAudit.mentor_name} ({selectedAudit.quarter_period})
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAudit(null)}
                className="grid size-8 place-items-center rounded-full hover:bg-ink/5 text-ink/60 cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAudit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-ink mb-1">Résultat du contact :</label>
                <select
                  value={auditStatus}
                  onChange={(e) => setAuditStatus(e.target.value as any)}
                  className="w-full rounded-xl border border-ink/10 p-2.5 font-semibold text-ink outline-none"
                >
                  <option value="contacted_ok">
                    ✅ Conforme (Famille rassurée, enfant épanoui)
                  </option>
                  <option value="warning">⚠️ Signaux d'attention (Réserves légères)</option>
                  <option value="escalated">🚨 Alerte critique (Malaise, plainte grave)</option>
                  <option value="unreachable">
                    ❌ Famille injoignable après plusieurs tentatives
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-ink mb-1">Interlocuteur :</label>
                  <input
                    type="text"
                    value={contactedPerson}
                    onChange={(e) => setContactedPerson(e.target.value)}
                    placeholder="ex: Mère, Père, Tante..."
                    className="w-full rounded-xl border border-ink/10 p-2.5 font-semibold text-ink outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-ink mb-1">Canal utilisé :</label>
                  <select
                    value={contactChannel}
                    onChange={(e) => setContactChannel(e.target.value as any)}
                    className="w-full rounded-xl border border-ink/10 p-2.5 font-semibold text-ink outline-none"
                  >
                    <option value="phone_call">Appel vocal direct</option>
                    <option value="whatsapp_voice">Note vocale WhatsApp</option>
                    <option value="in_person">Rencontre physique</option>
                    <option value="in_app">Formulaire App</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-ink mb-1">
                  Note de bienveillance ressentie par l'enfant (1 à 5) :
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(star)}
                      className={`p-2 rounded-xl border transition-all cursor-pointer ${
                        rating >= star
                          ? "bg-amber-50 border-amber-300 text-amber-500 font-black"
                          : "bg-surface border-ink/10 text-ink/40"
                      }`}
                    >
                      <Star className={`size-4 ${rating >= star ? "fill-current" : ""}`} />
                    </button>
                  ))}
                  <span className="text-xs font-bold text-ink/60 ml-2">{rating} / 5</span>
                </div>
              </div>

              <div>
                <label className="block font-bold text-ink mb-1">
                  Notes détaillées & Verbatim de la famille :
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes sur la relation, points d'attention ou compliments formulés par la famille..."
                  className="w-full rounded-xl border border-ink/10 p-2.5 text-ink outline-none"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-ink/5">
                <button
                  type="button"
                  onClick={() => setSelectedAudit(null)}
                  className="flex-1 py-2.5 rounded-xl bg-surface hover:bg-ink/5 font-bold text-ink cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-brand hover:bg-brand/90 font-bold text-white flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="size-4" />
                  )}
                  <span>Enregistrer l'audit</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Boucle Fermée Tripartite (Phase 4) ──────────────────────────────────────

interface DecisionProposalRow {
  id: string;
  mentor_user_id: string;
  report_id: string | null;
  kind: "confidence_bonus" | "suspension_review" | "coach_alert";
  evidence: string[];
  status: "proposed" | "confirmed" | "dismissed";
  decision_note: string | null;
  created_at: string;
}

const PROPOSAL_META: Record<DecisionProposalRow["kind"], { label: string; cls: string }> = {
  suspension_review: { label: "🚨 Revue de suspension", cls: "bg-red-100 text-red-700" },
  coach_alert: { label: "⚠️ Alerte pédagogique", cls: "bg-amber-100 text-amber-700" },
  confidence_bonus: { label: "⭐ Prime de confiance", cls: "bg-emerald-100 text-emerald-700" },
};

function TripartiteDecisionQueue({
  quarterPeriod,
  onDataChanged,
}: {
  quarterPeriod: string;
  onDataChanged?: () => void | Promise<void>;
}) {
  const listFn = useServerFn(listDecisionProposalsAdmin);
  const resolveFn = useServerFn(resolveDecisionProposalAdmin);
  const generateFn = useServerFn(generateTripartiteReportAdmin);

  const [proposals, setProposals] = useState<DecisionProposalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [squadId, setSquadId] = useState("");
  const [generating, setGenerating] = useState(false);
  const [lastReport, setLastReport] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const rows = await listFn({ data: { status: "proposed" } });
      setProposals(rows ?? []);
    } catch {
      toast.error("Lecture de la file tripartite impossible.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleResolve = async (proposalId: string, decision: "confirm" | "dismiss") => {
    try {
      const res = await resolveFn({ data: { proposalId, decision } });
      setProposals((prev) => prev.filter((p) => p.id !== proposalId));
      if (res.escalation) toast.warning(res.escalation, { duration: 8000 });
      else toast.success(decision === "confirm" ? "Proposition confirmée." : "Proposition écartée (tracée).");
      await onDataChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Décision impossible.");
    }
  };

  const handleGenerate = async () => {
    if (!squadId) {
      toast.error("Renseignez l'identifiant d'escouade à auditer.");
      return;
    }
    setGenerating(true);
    try {
      const report = await generateFn({ data: { quarterPeriod, scope: "squad", squadId } });
      setLastReport(
        report.sufficientData
          ? `Impact ${report.impactIndex}/100 · notes ${report.medianAcademicDelta >= 0 ? "+" : ""}${report.medianAcademicDelta} pt · autonomie ${report.medianAutonomyDelta >= 0 ? "+" : ""}${report.medianAutonomyDelta} pts · artefacts ${report.artifactValidationRate} %`
          : `Cohorte insuffisante (${report.cohortSize} enfants) — métriques indicatives.`,
      );
      toast.success("Rapport trimestriel généré et archivé.");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Génération impossible.");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="rounded-3xl border border-indigo-200/80 bg-indigo-50/60 p-5 shadow-sm space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="font-black text-indigo-900 text-sm flex items-center gap-2">
            <ClipboardCheck className="size-4" />
            Boucle Fermée Tripartite — {quarterPeriod}
          </p>
          <p className="text-[11px] font-semibold text-indigo-950/70 mt-0.5">
            Croisement trimestriel : notes de classe ↔ artefacts validés ↔ autonomie. Le moteur PROPOSE,
            vous tranchez — jamais de suspension automatique.
          </p>
        </div>
      </div>

      {/* Génération d'un rapport */}
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          value={squadId}
          onChange={(e) => setSquadId(e.target.value)}
          placeholder="ID d'escouade (uuid)…"
          className="flex-1 rounded-2xl border border-ink/10 bg-white px-3 py-2.5 text-xs font-semibold outline-none focus:ring-2 focus:ring-brand/30"
        />
        <button
          type="button"
          onClick={() => void handleGenerate()}
          disabled={generating}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand px-4 py-2.5 text-xs font-black text-white shadow-sm disabled:opacity-60 min-h-[42px]"
        >
          {generating ? <Loader2 className="size-4 animate-spin" /> : <ClipboardCheck className="size-4" />}
          Générer le rapport trimestriel
        </button>
      </div>
      {lastReport && (
        <p className="rounded-xl bg-white/70 px-3 py-2 text-[11px] font-bold text-indigo-900">{lastReport}</p>
      )}

      {/* File de propositions */}
      <div className="space-y-2">
        <p className="text-[10px] font-black uppercase tracking-wider text-indigo-900/60">
          File de décisions ({proposals.length} en attente)
        </p>
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="size-6 animate-spin text-brand" />
          </div>
        ) : proposals.length === 0 ? (
          <p className="rounded-xl bg-white/60 px-3 py-2.5 text-[11px] font-semibold text-indigo-950/60">
            Aucune proposition en attente — les escouades auditées sont conformes ou déjà tranchées.
          </p>
        ) : (
          proposals.map((p) => {
            const meta = PROPOSAL_META[p.kind];
            return (
              <div key={p.id} className="rounded-2xl border border-ink/10 bg-white p-3.5 shadow-xs space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-black ${meta.cls}`}>{meta.label}</span>
                  <span className="text-[10px] font-bold text-ink/40">
                    {new Date(p.created_at).toLocaleDateString("fr-FR")}
                  </span>
                </div>
                <ul className="space-y-1">
                  {p.evidence.map((e, i) => (
                    <li key={i} className="text-[11px] font-semibold text-ink/80">• {e}</li>
                  ))}
                </ul>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => void handleResolve(p.id, "confirm")}
                    className="flex-1 rounded-xl bg-red-600 px-3 py-2 text-[11px] font-black text-white hover:bg-red-700 min-h-[38px]"
                  >
                    Confirmer
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleResolve(p.id, "dismiss")}
                    className="flex-1 rounded-xl border border-ink/10 px-3 py-2 text-[11px] font-black text-ink/70 hover:bg-stone-50 min-h-[38px]"
                  >
                    Écarter
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// Audit anti-régression d'un mentor de Soutien (deux-modèles) : l'admin saisit
// l'ID utilisateur du mentor, le serveur arbitre (fraude + régression) et applique
// le statut résultant au profil. Résultat affiché en direct.
function SquadSafeguardAuditBox({
  onDataChanged,
}: {
  onDataChanged?: () => void | Promise<void>;
}) {
  const { session } = useSession();
  const [mentorUserId, setMentorUserId] = useState("");
  const [auditing, setAuditing] = useState(false);
  const [result, setResult] = useState<{
    standing: string;
    actionRequired: string;
    appliedStatus: string;
    impactScore: number;
  } | null>(null);

  const auditFn = useServerFn(auditSupportMentorSquadSafeguardsAdmin);

  const handleAudit = async () => {
    if (!mentorUserId.trim()) return;
    setAuditing(true);
    setResult(null);
    try {
      const opts = session?.access_token
        ? { headers: { Authorization: `Bearer ${session.access_token}` } }
        : {};
      const res = await auditFn({ data: { mentorUserId: mentorUserId.trim() }, ...opts });
      setResult(res as any);
      toast.success("Audit des garde-fous exécuté — décision appliquée au profil.");
      void onDataChanged?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'audit.");
    } finally {
      setAuditing(false);
    }
  };

  return (
    <div className="rounded-3xl border border-amber-200/80 bg-amber-50/60 p-5 shadow-sm">
      <div className="flex gap-3">
        <AlertTriangle className="size-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="font-black text-amber-900 text-sm">
            Anti-régression escouade — audit des garde-fous d'un mentor de Soutien
          </p>
          <p className="text-xs text-amber-800/90 leading-relaxed">
            Arbitrage déterministe (fraude photos + régression des enfants). Décision appliquée
            au profil : warning (1 cycle) ou suspension (2 cycles / fraude). Le bannissement
            reste une décision humaine.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={mentorUserId}
              onChange={(e) => setMentorUserId(e.target.value)}
              placeholder="UUID du mentor (mentor_user_id)…"
              className="flex-1 min-w-0 rounded-2xl border border-amber-300 bg-white px-3 py-2 text-xs font-bold text-ink focus:outline-none focus:ring-2 focus:ring-amber-400/50"
            />
            <button
              type="button"
              onClick={() => void handleAudit()}
              disabled={auditing || !mentorUserId.trim()}
              className="inline-flex items-center gap-1.5 rounded-2xl bg-amber-600 hover:bg-amber-700 px-4 py-2 text-xs font-bold text-white transition-all cursor-pointer disabled:opacity-50"
            >
              {auditing ? <Loader2 className="size-3.5 animate-spin" /> : <AlertTriangle className="size-3.5" />}
              Lancer l'audit
            </button>
          </div>
          {result && (
            <div className="rounded-2xl border border-amber-300 bg-white px-3 py-2.5 text-xs space-y-1">
              <p className="font-black text-amber-900">
                Décision : {result.standing} · Impact {result.impactScore}/100 · Statut appliqué :{" "}
                <span className="font-black">{result.appliedStatus}</span>
              </p>
              <p className="font-semibold text-amber-800/90">{result.actionRequired}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
