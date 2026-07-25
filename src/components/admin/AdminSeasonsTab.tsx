import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Calendar, Gift, Users, CheckCircle, Sparkles, Link as LinkIcon, Plus, Copy, Check } from "lucide-react";
import { listSeasonsAdmin, listSponsorshipsAdmin, updateSeasonStatusAdmin, DEFAULT_FALLBACK_SEASON, type Season, type SponsorshipToken } from "@/lib/seasons.functions";
import { toast } from "sonner";
import { CreateSeasonModal } from "./CreateSeasonModal";

export function AdminSeasonsTab() {
  const getSeasonsFn = useServerFn(listSeasonsAdmin);
  const getSponsorshipsFn = useServerFn(listSponsorshipsAdmin);

  const updateStatusFn = useServerFn(updateSeasonStatusAdmin);

  const [seasons, setSeasons] = useState<Season[]>([DEFAULT_FALLBACK_SEASON]);
  const [sponsorships, setSponsorships] = useState<SponsorshipToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

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

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success("Code de parrainage copié !");
    setTimeout(() => setCopiedCode(null), 2000);
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
            {seasons[0]?.title || "Saison 1 : Les Penseurs"}
          </h3>
          <p className="text-xs text-ink/60 font-medium mt-1">
            Durée : {seasons[0]?.duration_months || 3} Mois (Trimestre)
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
            5 000 FCFA <span className="text-sm text-ink/60 font-medium">/ 7,50 €</span>
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
                    {season.status === "active" ? "En cours (Actif)" : season.status}
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
                <div className="flex flex-col gap-2 border-l border-ink/10 pl-6">
                  {season.status !== "active" && (
                    <button
                      onClick={() => handleUpdateStatus(season.id, "active")}
                      className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                    >
                      Activer
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
                      ) : (
                        <span className="rounded-full bg-amber-100 text-amber-800 border border-amber-300 px-2.5 py-0.5 text-[10px] font-bold">
                          ⏳ En attente
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => copyCode(token.code)}
                        className="rounded-xl border border-ink/10 bg-white px-3 py-1 text-[11px] font-bold hover:bg-surface transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                      >
                        {copiedCode === token.code ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                        Copier
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {isModalOpen && (
        <CreateSeasonModal
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => {
            setIsModalOpen(false);
            loadData();
          }}
        />
      )}
    </div>
  );
}
