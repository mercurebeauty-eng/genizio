import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  updateProfileQuotaAdmin,
  togglePassportUnlock,
} from "@/lib/products.functions";
import React, { useState, useEffect } from "react";
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
import { AdminPagination } from "./AdminPagination";

export interface AdminExecutiveTabProps {
  kpis: ExecutiveKPIs;
  parents: ParentBIRC[];
  total: number;
  totalPages: number;
  page: number;
  onPageChange: (page: number) => void;
  onDataChanged?: () => void | Promise<void>;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

export function AdminExecutiveTab({
  kpis,
  parents,
  total,
  totalPages,
  page,
  onPageChange,
  onDataChanged,
  onRefresh,
  isRefreshing = false,
}: AdminExecutiveTabProps) {
  const [localParents, setLocalParents] = useState<ParentBIRC[]>(parents);
  useEffect(() => {
    setLocalParents(parents);
  }, [parents]);

  const [pendingPassportChildId, setPendingPassportChildId] = useState<string | null>(null);
  const [pendingQuotaUserId, setPendingQuotaUserId] = useState<string | null>(null);
  const [quotaDraft, setQuotaDraft] = useState<Record<string, number>>({});

  const updateProfileQuotaFn = useServerFn(updateProfileQuotaAdmin);
  const toggleUnlockFn = useServerFn(togglePassportUnlock);

  const handleSaveQuota = async (userId: string) => {
    if (pendingQuotaUserId === userId) return;
    const quota = quotaDraft[userId];
    if (quota === undefined) return;
    
    setPendingQuotaUserId(userId);
    const previousParents = localParents;
    
    // Optimistic UI
    setLocalParents((prev) =>
      prev.map((p) => (p.id === userId ? { ...p, quotaOverride: quota > 0 ? quota : 0 } : p)),
    );

    try {
      const res = await updateProfileQuotaFn({ data: { userId, quota } });
      if (res.success) {
        toast.success(
          quota > 0
            ? `Couverture de profils définie sur ${quota} (0 = auto).`
            : "Couverture de profils remise sur auto.",
        );
        const ch = supabase.channel("admin-os-global-sync");
        await ch.send({
          type: "broadcast",
          event: "quota_updated",
          payload: { userId, quota, timestamp: Date.now() },
        });
        await onDataChanged?.();
      }
      setQuotaDraft((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    } catch (err: any) {
      setLocalParents(previousParents);
      toast.error(
        "Erreur lors de la mise à jour du quota de profils: " + (err?.message || "Erreur inconnue"),
      );
    } finally {
      setPendingQuotaUserId(null);
    }
  };

  const handleTogglePassportClick = async (childId: string, unlock: boolean) => {
    if (pendingPassportChildId === childId) return;
    setPendingPassportChildId(childId);
    
    const previousParents = localParents;
    // Optimistic UI
    setLocalParents((prev) =>
      prev.map((p) => ({
        ...p,
        children: p.children?.map((c) =>
          c.id === childId ? { ...c, pdfUnlocked: unlock } : c,
        ),
      })),
    );

    try {
      const res = await toggleUnlockFn({ data: { childId, unlock } });
      if (res.ok) {
        toast.success(
          unlock ? "Passeport d'Excellence débloqué !" : "Passeport d'Excellence reverrouillé.",
        );
        const ch = supabase.channel("admin-os-global-sync");
        await ch.send({
          type: "broadcast",
          event: "passport_updated",
          payload: { childId, unlock, timestamp: Date.now() },
        });
        await onDataChanged?.();
      } else {
        toast.error("Échec de la modification du statut passeport.");
        setLocalParents(previousParents);
      }
    } catch (err: any) {
      setLocalParents(previousParents);
      toast.error(
        "Erreur lors du changement d'accès passeport: " + (err?.message || "Erreur inconnue"),
      );
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
            <span className="text-[11px] font-extrabold uppercase tracking-wider">
              Enfants Actifs
            </span>
            <UserCheck className="size-4 text-brand" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-black text-brand">
              {kpis.activeChildren7d}
            </span>
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
            <span className="text-[11px] font-extrabold uppercase tracking-wider">
              Parents & Enfants
            </span>
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
            <span className="text-[11px] font-extrabold uppercase tracking-wider">
              Défis Validés
            </span>
            <CheckCircle2 className="size-4 text-sky-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-black text-sky-600">
              {kpis.completedChallenges}
            </span>
            <span className="text-xs font-bold text-ink/50">/ {kpis.totalChallenges}</span>
          </div>
          <p className="text-xs text-ink/60 mt-2 font-medium">
            Taux de succès :{" "}
            <strong className="text-ink">
              {kpis.totalChallenges > 0
                ? Math.round((kpis.completedChallenges / kpis.totalChallenges) * 100)
                : 0}
              %
            </strong>
          </p>
        </div>

        {/* Card 4: Retention Rate % */}
        <div className="rounded-3xl border border-ink/10 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-ink/60 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">
              Taux de Rétention
            </span>
            <TrendingUp className="size-4 text-purple-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-display text-3xl font-black text-purple-600">
              {kpis.retentionRatePct}%
            </span>
          </div>
          <p className="text-xs text-ink/60 mt-2 font-medium">Actifs (30j) / Total Enfants</p>
        </div>

        {/* Card 5: Age Breakdown */}
        <div className="rounded-3xl border border-ink/10 bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between text-ink/60 mb-2">
            <span className="text-[11px] font-extrabold uppercase tracking-wider">
              Répartition Âges
            </span>
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
            {total} Utilisateurs
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left border-collapse text-sm">
            <thead>
              <tr className="border-b-[3px] border-ink text-[11px] font-extrabold uppercase tracking-wider text-ink/60">
                <th className="pb-3 pr-4">Inscription</th>
                <th className="pb-3 pr-4">Email</th>
                <th className="pb-3 pr-4">Téléphone</th>
                <th className="pb-3 pr-4">WhatsApp</th>
                <th className="pb-3 pr-4">Enfants associés & Passeports</th>
                <th className="pb-3 pr-4 text-center">Défis (Total / Validés)</th>
                <th
                  className="pb-3 text-center"
                  title="0 = règle standard automatique (plancher + couverture famille/campagne → 5) ; N = couverture totale accordée"
                >
                  Couverture profils (0 = auto)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-ink/5">
              {localParents.map((parent) => {
                const whatsappUrl =
                  parent.whatsappUrl ||
                  (parent.phone ? `https://wa.me/${parent.phone.replace(/[^0-9]/g, "")}` : null);

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
                      {parent.phone || (
                        <span className="text-ink/30 italic text-xs">Non renseigné</span>
                      )}
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
                    <td className="py-3 px-3">
                      {parent.children && parent.children.length > 0 ? (
                        <div className="space-y-1.5 min-w-[210px]">
                          {parent.children.map((child) => (
                            <div
                              key={child.id}
                              className="flex items-center justify-between gap-2 p-2 rounded-2xl bg-surface/70 border border-ink/5 hover:border-ink/10 transition-colors"
                            >
                              <div className="flex flex-col text-left min-w-0">
                                <span className="text-xs font-black text-ink truncate">
                                  {child.name}
                                </span>
                                <span className="text-[10px] font-extrabold text-ink/50 mt-0.5">
                                  {child.age} ans
                                </span>
                              </div>

                              <button
                                onClick={() =>
                                  handleTogglePassportClick(child.id, !child.pdfUnlocked)
                                }
                                disabled={pendingPassportChildId === child.id}
                                className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer shrink-0 shadow-2xs ${
                                  child.pdfUnlocked
                                    ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700 hover:bg-emerald-500/20"
                                    : "bg-amber-500/10 border-amber-500/20 text-amber-700 hover:bg-amber-500/20"
                                } disabled:opacity-50`}
                                title={
                                  child.pdfUnlocked
                                    ? "Passeport PDF Débloqué — Clic pour verrouiller"
                                    : "Passeport PDF Verrouillé — Clic pour débloquer"
                                }
                              >
                                {pendingPassportChildId === child.id ? (
                                  <>
                                    <Loader2 className="size-3 animate-spin" /> Traitement…
                                  </>
                                ) : child.pdfUnlocked ? (
                                  <>
                                    <Unlock className="size-3 text-emerald-600" /> Débloqué
                                  </>
                                ) : (
                                  <>
                                    <Lock className="size-3 text-amber-600" /> Débloquer
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

                    {/* Saisons & Campagnes — retiré (2026-08-12, décision #60 : la saison
                        n'est plus qu'une étiquette ; l'inscription manuelle à une saison
                        n'accorde plus aucun accès — l'ajustement d'accès réel vit dans
                        l'onglet Profils, « Prolonger l'accès » via child_access_periods). */}

                    {/* Challenges Stats */}
                    <td className="py-4 pr-4 text-center whitespace-nowrap">
                      <span className="rounded-full bg-brand/10 px-2.5 py-1 text-xs font-bold text-brand">
                        {parent.challengeCount} total
                      </span>
                      <span className="rounded-full bg-leaf/10 px-2.5 py-1 text-xs font-bold text-leaf ml-1.5">
                        {parent.completedCount} validés
                      </span>
                    </td>

                    {/* Couverture profils — 0 = règle standard auto ; N = couverture totale accordée (quota +), cf. child-profile-quota.ts */}
                    <td className="py-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <input
                          type="number"
                          min={0}
                          max={50}
                          placeholder="0 = auto"
                          value={quotaDraft[parent.id] ?? parent.quotaOverride}
                          onChange={(e) =>
                            setQuotaDraft((prev) => ({
                              ...prev,
                              [parent.id]: Math.max(0, parseInt(e.target.value) || 0),
                            }))
                          }
                          className="w-14 bg-surface border border-ink/10 rounded-xl px-2 py-1 text-xs font-bold text-ink text-center"
                        />
                        {quotaDraft[parent.id] !== undefined &&
                          quotaDraft[parent.id] !== parent.quotaOverride && (
                            <button
                              onClick={() => handleSaveQuota(parent.id)}
                              disabled={pendingQuotaUserId === parent.id}
                              className="inline-flex items-center rounded-xl bg-ink text-white px-2 py-1 text-[10px] font-bold hover:bg-ink/90 transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              {pendingQuotaUserId === parent.id ? (
                                <Loader2 className="size-3 animate-spin" />
                              ) : (
                                "OK"
                              )}
                            </button>
                          )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <AdminPagination
          page={page}
          totalPages={totalPages}
          total={total}
          pageSize={20}
          onPageChange={onPageChange}
          label="compte"
        />
      </div>
    </div>
  );
}
