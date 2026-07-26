import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Calendar, Gift, Users, CheckCircle, Sparkles, Link as LinkIcon, Plus, Copy, Check, ShieldCheck, Loader2, Pencil, Trash2 } from "lucide-react";
import { listSeasonsAdmin, listSponsorshipsAdmin, updateSeasonStatusAdmin, deleteSeasonAdmin, confirmSponsorshipPaymentAdmin, DEFAULT_FALLBACK_SEASON, type Season, type SponsorshipToken } from "@/lib/seasons.functions";
import { toast } from "sonner";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { CreateSeasonModal } from "./CreateSeasonModal";

const SEASON_STATUS_LABELS: Record<string, string> = {
  upcoming: "À venir",
  active: "En cours (Actif)",
  completed: "Terminée",
  archived: "Archivée",
};

export function AdminSeasonsTab() {
  const getSeasonsFn = useServerFn(listSeasonsAdmin);
  const getSponsorshipsFn = useServerFn(listSponsorshipsAdmin);

  const updateStatusFn = useServerFn(updateSeasonStatusAdmin);
  const deleteSeasonFn = useServerFn(deleteSeasonAdmin);
  const confirmPaymentFn = useServerFn(confirmSponsorshipPaymentAdmin);

  const [seasons, setSeasons] = useState<Season[]>([DEFAULT_FALLBACK_SEASON]);
  const [sponsorships, setSponsorships] = useState<SponsorshipToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSeason, setEditingSeason] = useState<Season | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [sList, tList] = await Promise.all([getSeasonsFn(), getSponsorshipsFn()]);
      if (sList && sList.length > 0) setSeasons(sList);
      if (tList) setSponsorships(tList);
    } catch (err) {
      console.error("Error loading seasons admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // seasons est trié par created_at desc (listSeasonsAdmin) — seasons[0] est donc la plus
  // récemment créée, pas forcément la saison active. Sans ce find, créer une "Saison 2" à
  // l'avance (upcoming) pendant que la Saison 1 tourne encore ferait afficher la 2 ici comme
  // si elle était déjà en cours.
  const activeSeason = seasons.find((s) => s.status === "active") ?? seasons[0];

  const handleUpdateStatus = async (seasonId: string, status: any) => {
    try {
      const res = await updateStatusFn({ data: { seasonId, status } });
      if (res.success) {
        toast.success("Statut mis à jour !");
        loadData();
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur de mise à jour");
    }
  };

  const handleDelete = async (season: Season) => {
    if (!(await confirmDialog({
      title: "Supprimer cette saison ?",
      description: `"${season.title}" sera définitivement supprimée. Impossible si des inscriptions ou parrainages y sont déjà liés — archivez-la dans ce cas.`,
      confirmLabel: "Supprimer",
      variant: "danger",
    }))) return;

    setDeletingId(season.id);
    try {
      const res = await deleteSeasonFn({ data: { seasonId: season.id } });
      if (res.success) {
        toast.success("Saison supprimée.");
        loadData();
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la suppression");
    } finally {
      setDeletingId(null);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success("Code de parrainage copié !");
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleConfirmPayment = async (tokenId: string) => {
    if (confirmingId === tokenId) return;
    setConfirmingId(tokenId);
    try {
      const res = await confirmPaymentFn({ data: { tokenId } });
      if (res.success) {
        toast.success("Paiement confirmé — le code est maintenant activable.");
        loadData();
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la confirmation du paiement");
    } finally {
      setConfirmingId(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <span className="grid place-items-center rounded-2xl bg-amber-100 p-2.5 text-amber-800">
              <Calendar className="size-5" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-ink/60">
              Saison Active
            </span>
          </div>
          <h3 className="font-display text-xl font-bold text-ink">
            {activeSeason?.title || "Saison 1 : Les Penseurs"}
          </h3>
          <p className="text-xs text-ink/60 font-medium mt-1">
            Durée : {activeSeason?.duration_months || 3} Mois (Trimestre)
          </p>
        </div>

        <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <span className="grid place-items-center rounded-2xl bg-emerald-100 p-2.5 text-emerald-800">
              <Gift className="size-5" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-ink/60">
              Parrainages Diaspora / RSE
            </span>
          </div>
          <h3 className="font-display text-2xl font-black text-ink">
            {sponsorships.length} <span className="text-sm font-normal text-ink/60">Parrainages</span>
          </h3>
          <p className="text-xs text-emerald-600 font-bold mt-1">
            {sponsorships.filter((s) => s.is_redeemed).length} Utilisés · {sponsorships.filter((s) => !s.is_redeemed).length} En attente
          </p>
        </div>

        <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <span className="grid place-items-center rounded-2xl bg-sky-100 p-2.5 text-sky-800">
              <Users className="size-5" />
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-ink/60">
              Tarif Trimestriel
            </span>
          </div>
          <h3 className="font-display text-2xl font-black text-ink">
            {(activeSeason?.price_xof ?? 10000).toLocaleString()} FCFA <span className="text-sm text-ink/60 font-medium">/ {activeSeason?.price_eur ?? 15} €</span>
          </h3>
          <p className="text-xs text-ink/60 font-medium mt-1">
            100% Zero Pay-To-Win
          </p>
        </div>
      </div>

      {/* Seasons Management Section */}
      <div className="rounded-3xl border border-ink/10 bg-white p-8 shadow-sm">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <h3 className="font-display text-xl font-bold text-ink flex items-center gap-2">
              <Sparkles className="size-5 text-brand" />
              Saisons Génizio (Cohortes de 3 Mois)
            </h3>
            <p className="text-xs font-medium text-ink/60">
              Chaque saison est un trimestre thématique débouchant sur la livraison du Portfolio d'Impact certifié.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsModalOpen(true)}
              className="rounded-2xl bg-white border border-ink/10 px-4 py-2.5 text-xs font-bold text-ink shadow-sm hover:bg-ink/5 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Plus className="size-4 text-brand" />
              Nouvelle Saison
            </button>
            <a
              href="/parrainage"
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl bg-brand px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-brand/90 transition-all flex items-center gap-2"
            >
              <LinkIcon className="size-4" />
              Page de Parrainage →
            </a>
          </div>
        </div>

        <div className="space-y-4">
          {seasons.map((season) => (
            <div key={season.id} className="rounded-2xl border border-ink/10 bg-surface p-5 flex items-center justify-between flex-wrap gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="rounded-full bg-brand/15 px-3 py-0.5 text-[10px] font-black uppercase text-brand border border-brand/20">
                    {SEASON_STATUS_LABELS[season.status] ?? season.status}
                  </span>
                  <span className="text-xs text-ink/60 font-bold">
                    {season.duration_months} Mois
                  </span>
                </div>
                <h4 className="font-display text-lg font-extrabold text-ink">{season.title}</h4>
                <p className="text-xs text-ink/70 font-medium mt-0.5">{season.theme}</p>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <span className="font-display text-lg font-black text-ink">
                    {season.price_xof.toLocaleString()} FCFA
                  </span>
                  <span className="block text-xs text-ink/60 font-bold">({season.price_eur} €)</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 border-l border-ink/10 pl-6">
                  {season.id === DEFAULT_FALLBACK_SEASON.id ? (
                    // Repli purement client (aucune saison créée en base) : aucune action n'a
                    // de ligne réelle à cibler, donc aucun bouton plutôt qu'un bouton muet qui
                    // afficherait "Statut mis à jour !" sans rien changer.
                    <span className="text-[10px] font-bold uppercase tracking-wider text-ink/40">
                      Créez votre première saison
                    </span>
                  ) : (
                    <>
                      {season.status !== "active" && (
                        <button
                          onClick={() => handleUpdateStatus(season.id, "active")}
                          className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                        >
                          Activer
                        </button>
                      )}
                      {season.status === "active" && (
                        <button
                          onClick={() => handleUpdateStatus(season.id, "completed")}
                          className="text-[10px] font-bold uppercase tracking-wider text-sky-700 hover:text-sky-800 bg-sky-50 px-3 py-1.5 rounded-lg border border-sky-200 transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <CheckCircle className="size-3" />
                          Marquer terminée
                        </button>
                      )}
                      {season.status !== "archived" && season.status !== "upcoming" && (
                        <button
                          onClick={() => handleUpdateStatus(season.id, "archived")}
                          className="text-[10px] font-bold uppercase tracking-wider text-ink/50 hover:text-ink/80 bg-ink/5 px-3 py-1.5 rounded-lg border border-transparent hover:border-ink/10 transition-colors cursor-pointer"
                        >
                          Archiver
                        </button>
                      )}
                      <button
                        onClick={() => setEditingSeason(season)}
                        title="Modifier"
                        className="grid size-7 place-items-center rounded-lg border border-ink/10 bg-white text-ink/60 hover:text-ink hover:bg-ink/5 transition-colors cursor-pointer"
                      >
                        <Pencil className="size-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(season)}
                        disabled={deletingId === season.id}
                        title="Supprimer"
                        className="grid size-7 place-items-center rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {deletingId === season.id ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sponsorship Tokens Table */}
      <div className="rounded-3xl border border-ink/10 bg-white p-8 shadow-sm">
        <h3 className="font-display text-xl font-bold text-ink mb-4 flex items-center gap-2">
          <Gift className="size-5 text-amber-600" />
          Historique des Parrainages Diaspora & RSE
        </h3>

        {sponsorships.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-ink/20 bg-surface p-8 text-center text-ink/60 text-sm font-medium">
            Aucun parrainage enregistré pour le moment. Les parrainages effectués depuis la page `/parrainage` s'afficheront ici en temps réel.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-ink/10 text-ink/60 uppercase tracking-wider font-bold">
                  <th className="py-3 px-4">Code</th>
                  <th className="py-3 px-4">Parrain / Entreprise</th>
                  <th className="py-3 px-4">Filleul</th>
                  <th className="py-3 px-4">Montant</th>
                  <th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10">
                {sponsorships.map((token) => (
                  <tr key={token.id} className="hover:bg-surface/50 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-brand">{token.code}</td>
                    <td className="py-3 px-4 font-medium">
                      <span className="font-bold text-ink">{token.sponsor_name}</span>
                      <span className="block text-[10px] text-ink/50">{token.sponsor_email}</span>
                    </td>
                    <td className="py-3 px-4 font-bold text-ink">{token.target_child_name || "Non spécifié"}</td>
                    <td className="py-3 px-4 font-bold">
                      {token.amount_paid} {token.currency}
                    </td>
                    <td className="py-3 px-4">
                      {token.is_redeemed ? (
                        <span className="rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 text-[10px] font-bold">
                          ✓ Utilisé
                        </span>
                      ) : token.payment_confirmed ? (
                        <span className="rounded-full bg-sky-100 text-sky-800 border border-sky-300 px-2.5 py-0.5 text-[10px] font-bold">
                          ✓ Payé — prêt
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-0.5 text-[10px] font-bold">
                          ⏳ Paiement non confirmé
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        {!token.payment_confirmed && !token.is_redeemed && (
                          <button
                            onClick={() => handleConfirmPayment(token.id)}
                            disabled={confirmingId === token.id}
                            title="Confirmer que le paiement WhatsApp/Mobile Money a bien été reçu"
                            className="rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-800 hover:bg-emerald-100 transition-all flex items-center gap-1 cursor-pointer shadow-xs disabled:opacity-50"
                          >
                            {confirmingId === token.id ? <Loader2 className="size-3 animate-spin" /> : <ShieldCheck className="size-3" />}
                            Confirmer paiement
                          </button>
                        )}
                        <button
                          onClick={() => copyCode(token.code)}
                          className="rounded-xl border border-ink/10 bg-white px-3 py-1 text-[11px] font-bold hover:bg-surface transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                        >
                          {copiedCode === token.code ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                          Copier
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(isModalOpen || editingSeason) && (
        <CreateSeasonModal
          initial={editingSeason}
          onClose={() => {
            setIsModalOpen(false);
            setEditingSeason(null);
          }}
          onSuccess={() => {
            setIsModalOpen(false);
            setEditingSeason(null);
            loadData();
          }}
        />
      )}
    </div>
  );
}
