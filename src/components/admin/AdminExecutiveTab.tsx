import React, { useState } from "react";
import {
  Users,
  Award,
  Brain,
  BarChart3,
  Calendar,
  Phone,
  ExternalLink,
  Lock,
  Unlock,
  TrendingUp,
  UserCheck,
  CheckCircle2,
  PieChart,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import type { ExecutiveKPIs, ParentBIRC } from "@/lib/admin-os.functions";

interface AdminExecutiveTabProps {
  kpis: ExecutiveKPIs;
  parents: ParentBIRC[];
  onGrantSlot?: (userId: string, delta: number) => Promise<void>;
  onTogglePassport?: (childId: string, unlock: boolean) => Promise<void>;
  isRefreshing?: boolean;
}

export function AdminExecutiveTab({
  kpis,
  parents,
  onGrantSlot,
  onTogglePassport,
  isRefreshing = false,
}: AdminExecutiveTabProps) {
  const [pendingSlotUserId, setPendingSlotUserId] = useState<string | null>(null);
  const [pendingPassportChildId, setPendingPassportChildId] = useState<string | null>(null);

  const handleGrantSlotClick = async (userId: string, delta: number) => {
    if (!onGrantSlot || pendingSlotUserId === userId) return;
    setPendingSlotUserId(userId);
    try {
      await onGrantSlot(userId, delta);
    } catch (err: any) {
      toast.error("Erreur lors de la modification des slots: " + (err?.message || "Erreur inconnue"));
    } finally {
      setPendingSlotUserId(null);
    }
  };

  const handleTogglePassportClick = async (childId: string, unlock: boolean) => {
    if (!onTogglePassport || pendingPassportChildId === childId) return;
    setPendingPassportChildId(childId);
    try {
      await onTogglePassport(childId, unlock);
    } catch (err: any) {
      toast.error("Erreur lors du changement d'accès passeport: " + (err?.message || "Erreur inconnue"));
    } finally {
      setPendingPassportChildId(null);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-10">
      {/* 📊 5 Executive KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {/* Card 1: Active Children 7d/30d */}
        <div className="rounded-3xl border border-ink/10 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-ink/60 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">Enfants Actifs</span>
            <UserCheck className="size-4 text-brand" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-black text-brand">{kpis.activeChildren7d}</span>
            <span className="text-xs font-bold text-ink/50">/ 7 jours</span>
          </div>
          <p className="text-xs text-ink/60 mt-2 font-medium flex items-center gap-1">
            <span className="size-2 rounded-full bg-emerald-500 inline-block" />
            <strong className="text-ink">{kpis.activeChildren30d}</strong> actifs sur 30 jours
          </p>
        </div>

        {/* Card 2: Registered Parents & Children */}
        <div className="rounded-3xl border border-ink/10 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-ink/60 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">Parents & Enfants</span>
            <Users className="size-4 text-leaf" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-black text-leaf">{kpis.totalChildren}</span>
            <span className="text-xs font-bold text-ink/50">enfants</span>
          </div>
          <p className="text-xs text-ink/60 mt-2 font-medium">
            Pour <strong className="text-ink">{kpis.totalParents}</strong> parents inscrits
          </p>
        </div>

        {/* Card 3: Completed Challenges */}
        <div className="rounded-3xl border border-ink/10 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-ink/60 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">Défis Validés</span>
            <CheckCircle2 className="size-4 text-sky" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-black text-sky">{kpis.completedChallenges}</span>
            <span className="text-xs font-bold text-ink/50">/ {kpis.totalChallenges}</span>
          </div>
          <p className="text-xs text-ink/60 mt-2 font-medium">
            Taux de succès : <strong className="text-ink">{kpis.totalChallenges > 0 ? Math.round((kpis.completedChallenges / kpis.totalChallenges) * 100) : 0}%</strong>
          </p>
        </div>

        {/* Card 4: Retention Rate % */}
        <div className="rounded-3xl border border-ink/10 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-ink/60 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">Taux de Rétention</span>
            <TrendingUp className="size-4 text-purple-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-black text-purple-600">{kpis.retentionRatePct}%</span>
          </div>
          <p className="text-xs text-ink/60 mt-2 font-medium">
            Actifs (30j) / Total Enfants
          </p>
        </div>

        {/* Card 5: Age Breakdown */}
        <div className="rounded-3xl border border-ink/10 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-ink/60 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">Répartition Âges</span>
            <PieChart className="size-4 text-amber-500" />
          </div>
          <div className="space-y-1 mt-1">
            {kpis.ageDistribution.map((item) => (
              <div key={item.bracket} className="flex items-center justify-between text-xs">
                <span className="font-bold text-ink/70">{item.bracket}</span>
                <span className="font-black text-ink">
                  {item.count} <span className="text-[10px] text-ink/50">({item.percentage}%)</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 👥 Parents BI & CRM Table */}
      <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-xl relative">
        {isRefreshing && (
          <div className="absolute top-4 right-6 text-xs text-brand font-bold animate-pulse">
            Mise à jour des données…
          </div>
        )}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="font-display text-xl font-bold flex items-center gap-2 text-ink">
              <Users className="size-5 text-brand" />
              Annuaire Parents & Contact Direct (BI CRM)
            </h2>
            <p className="text-xs text-ink/60 font-medium mt-0.5">
              Gestion tactile des privilèges, passeports et canaux de contact direct WhatsApp.
            </p>
          </div>
          <span className="rounded-full bg-brand/10 px-3 py-1 text-xs font-bold text-brand">
            {parents.length} Utilisateurs
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-sm">
            <thead>
              <tr className="border-b-[3px] border-ink text-[11px] font-extrabold uppercase tracking-wider text-ink/60">
                <th className="pb-3 pr-4">Inscription</th>
                <th className="pb-3 pr-4">Email</th>
                <th className="pb-3 pr-4">Téléphone</th>
                <th className="pb-3 pr-4">WhatsApp</th>
                <th className="pb-3 pr-4">Enfants associés & Passeports</th>
                <th className="pb-3 pr-4 text-center">Slots Profils</th>
                <th className="pb-3 text-center">Défis (Total / Validés)</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-ink/5">
              {parents.map((parent) => {
                const whatsappUrl = parent.whatsappUrl || (parent.phone ? `https://wa.me/${parent.phone.replace(/[^0-9]/g, "")}` : null);

                return (
                  <tr key={parent.id} className="hover:bg-surface/40 transition-colors">
                    {/* Inscription */}
                    <td className="py-4 pr-4 font-medium text-ink/60">
                      <div className="flex items-center gap-1.5 whitespace-nowrap text-xs">
                        <Calendar className="size-3.5 text-ink/30" />
                        {new Date(parent.createdAt).toLocaleDateString("fr-FR", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    </td>

                    {/* Email */}
                    <td className="py-4 pr-4 font-bold text-ink text-xs">{parent.email}</td>

                    {/* Phone */}
                    <td className="py-4 pr-4 font-mono text-xs text-ink/70">
                      {parent.phone || <span className="text-ink/30 italic text-xs">Non renseigné</span>}
                    </td>

                    {/* WhatsApp */}
                    <td className="py-4 pr-4 whitespace-nowrap">
                      {whatsappUrl ? (
                        <a
                          href={whatsappUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-[#25D366] px-3 py-1.5 text-xs font-bold text-white shadow-sm hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
                        >
                          <Phone className="size-3.5 fill-current text-white" />
                          <span>WhatsApp</span>
                          <ExternalLink className="size-3 text-white/70" />
                        </a>
                      ) : (
                        <button
                          disabled
                          className="inline-flex items-center gap-1.5 rounded-xl border-2 border-ink/10 bg-stone-100 px-3 py-1.5 text-xs font-bold text-ink/30 cursor-not-allowed"
                        >
                          <Phone className="size-3.5" />
                          <span>Indisponible</span>
                        </button>
                      )}
                    </td>

                    {/* Children & Passport Toggle */}
                    <td className="py-4 pr-4">
                      {parent.children && parent.children.length > 0 ? (
                        <div className="flex flex-col gap-1.5">
                          {parent.children.map((child) => (
                            <div key={child.id} className="flex flex-wrap items-center gap-2">
                              <span className="font-bold text-xs text-ink">
                                {child.name} ({child.age} ans)
                              </span>
                              <button
                                onClick={() => handleTogglePassportClick(child.id, !child.pdfUnlocked)}
                                disabled={pendingPassportChildId === child.id}
                                className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                                  child.pdfUnlocked
                                    ? "bg-emerald-100 border-emerald-400 text-emerald-800 hover:bg-emerald-200"
                                    : "bg-amber-100 border-amber-400 text-amber-800 hover:bg-amber-200"
                                } disabled:opacity-50`}
                              >
                                {pendingPassportChildId === child.id ? (
                                  <>
                                    <Loader2 className="size-2.5 animate-spin" /> Traitement…
                                  </>
                                ) : child.pdfUnlocked ? (
                                  <>
                                    <Unlock className="size-2.5" /> Débloqué
                                  </>
                                ) : (
                                  <>
                                    <Lock className="size-2.5" /> Débloquer
                                  </>
                                )}
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <span className="text-ink/30 italic text-xs">Aucun enfant</span>
                      )}
                    </td>

                    {/* Slots Profils */}
                    <td className="py-4 pr-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleGrantSlotClick(parent.id, -1)}
                          disabled={parent.extraSlots <= 0 || pendingSlotUserId === parent.id}
                          title="Révoquer 1 slot"
                          className="flex size-7 items-center justify-center rounded-lg border-2 border-ink bg-red-100 text-red-700 font-black text-sm hover:bg-red-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                        >
                          {pendingSlotUserId === parent.id ? <Loader2 className="size-3 animate-spin" /> : "−"}
                        </button>
                        <div className="text-center min-w-[48px]">
                          <p className="text-xs font-black text-ink">{2 + parent.extraSlots}</p>
                          <p className="text-[9px] text-ink/60 font-bold">
                            {parent.extraSlots > 0 ? `+${parent.extraSlots} bonus` : "gratuits"}
                          </p>
                        </div>
                        <button
                          onClick={() => handleGrantSlotClick(parent.id, +1)}
                          disabled={pendingSlotUserId === parent.id}
                          title="Accorder 1 slot"
                          className="flex size-7 items-center justify-center rounded-lg border-2 border-ink bg-emerald-100 text-emerald-700 font-black text-sm hover:bg-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          {pendingSlotUserId === parent.id ? <Loader2 className="size-3 animate-spin" /> : "+"}
                        </button>
                      </div>
                    </td>

                    {/* Challenges Stats */}
                    <td className="py-4 text-center whitespace-nowrap">
                      <span className="rounded-full bg-brand/10 px-2.5 py-1 text-xs font-bold text-brand">
                        {parent.challengeCount} total
                      </span>
                      <span className="rounded-full bg-leaf/10 px-2.5 py-1 text-xs font-bold text-leaf ml-1.5">
                        {parent.completedCount} validés
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
