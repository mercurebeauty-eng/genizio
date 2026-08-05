import { useState, useEffect } from "react";
import { X, Calendar, Loader2, Building2, UserX } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useSession } from "@/hooks/use-session";
import {
  enrollChildAdmin,
  unenrollCampaignAdmin,
  listSeasonsAdmin,
  type Season,
} from "@/lib/seasons.functions";
import { listCampaignsAdmin, type Campaign } from "@/lib/campaigns.functions";
import { toast } from "sonner";

interface AdminSeasonEnrollmentModalProps {
  childId: string;
  childName: string;
  currentCampaignName?: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function AdminSeasonEnrollmentModal({
  childId,
  childName,
  currentCampaignName,
  onClose,
  onSuccess,
}: AdminSeasonEnrollmentModalProps) {
  const { session } = useSession();
  const enrollFn = useServerFn(enrollChildAdmin);
  const unenrollCampaignFn = useServerFn(unenrollCampaignAdmin);
  const listSeasonsFn = useServerFn(listSeasonsAdmin);
  const listCampaignsFn = useServerFn(listCampaignsAdmin);

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingSeasons, setLoadingSeasons] = useState(true);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("");
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    const opts = session?.access_token
      ? { headers: { Authorization: `Bearer ${session.access_token}` } }
      : {};

    Promise.all([
      listSeasonsFn({ data: undefined, ...opts }).catch(() => [] as Season[]),
      // Ce sélecteur a besoin de TOUTES les campagnes, pas d'une page : on demande explicitement
      // la taille de page maximale plutôt que de subir la pagination par défaut (50) ajoutée pour
      // l'écran de liste.
      listCampaignsFn({ data: { pageSize: 200 }, ...opts })
        .then((r) => r.data)
        .catch(() => [] as Campaign[]),
    ])
      .then(([fetchedSeasons, fetchedCampaigns]) => {
        setSeasons(fetchedSeasons);
        setCampaigns(fetchedCampaigns || []);
        if (fetchedSeasons.length > 0) {
          setSelectedSeasonId(fetchedSeasons[0].id);
        }
      })
      .catch((err) => {
        console.error(err);
      })
      .finally(() => setLoadingSeasons(false));
  }, [session]);

  const handleEnroll = async () => {
    if (!selectedSeasonId) return;

    setEnrolling(true);
    const opts = session?.access_token
      ? { headers: { Authorization: `Bearer ${session.access_token}` } }
      : {};

    try {
      await enrollFn({
        data: {
          childId,
          seasonId: selectedSeasonId,
          campaignId: selectedCampaignId || undefined,
        },
        ...opts,
      });
      toast.success(`${childName} a été mis à jour avec succès !`);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la mise à jour.");
    } finally {
      setEnrolling(false);
    }
  };

  const handleUnenroll = async () => {
    setEnrolling(true);
    const opts = session?.access_token
      ? { headers: { Authorization: `Bearer ${session.access_token}` } }
      : {};

    try {
      await unenrollCampaignFn({
        data: { childId },
        ...opts,
      });
      toast.success(`${childName} a été retiré de la campagne.`);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors du retrait de la campagne.");
    } finally {
      setEnrolling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 p-2 rounded-full bg-surface hover:bg-ink/5 transition-colors z-10"
        >
          <X className="size-5 text-ink/70" />
        </button>

        <div className="p-6 pb-0">
          <div className="size-12 rounded-2xl bg-brand/10 text-brand flex items-center justify-center mb-4">
            <Calendar className="size-6" />
          </div>
          <h2 className="font-display text-2xl font-black text-ink">Inscrire un enfant</h2>
          <p className="text-sm font-medium text-ink/70 mt-1">
            Sélectionnez une saison pour inscrire manuellement{" "}
            <strong className="text-ink">{childName}</strong>.
          </p>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {currentCampaignName && (
            <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-3.5 mb-5 flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="size-8 rounded-xl bg-amber-500/10 text-amber-700 flex items-center justify-center shrink-0">
                  <Building2 className="size-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700/80">
                    Campagne active
                  </p>
                  <p className="text-xs font-black text-amber-900 truncate">
                    {currentCampaignName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleUnenroll}
                disabled={enrolling}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-black text-rose-700 bg-rose-100 hover:bg-rose-200 rounded-xl transition-colors shrink-0 disabled:opacity-50"
              >
                <UserX className="size-3.5" />
                Retirer
              </button>
            </div>
          )}

          {loadingSeasons ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="size-6 animate-spin text-brand" />
            </div>
          ) : seasons.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm font-bold text-ink/60">
                Aucune saison active ou à venir trouvée.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <label className="block text-xs font-extrabold uppercase tracking-widest text-ink/50 mb-1">
                Saisons disponibles
              </label>
              {seasons.map((season) => (
                <div
                  key={season.id}
                  onClick={() => setSelectedSeasonId(season.id)}
                  className={`rounded-2xl border p-4 cursor-pointer transition-all flex items-start gap-3 ${
                    selectedSeasonId === season.id
                      ? "border-brand bg-brand/5 shadow-sm"
                      : "border-ink/10 bg-white hover:bg-surface"
                  }`}
                >
                  <div
                    className={`mt-0.5 size-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                      selectedSeasonId === season.id ? "border-brand" : "border-ink/20"
                    }`}
                  >
                    {selectedSeasonId === season.id && (
                      <div className="size-2 rounded-full bg-brand" />
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-ink">{season.title}</h3>
                    <p className="text-xs text-ink/60 mt-1">{season.theme}</p>
                    <div className="flex gap-2 mt-2">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                          season.status === "active"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-sky text-brand"
                        }`}
                      >
                        {season.status === "active" ? "En cours" : "À venir"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Campagne ONG optionnelle */}
              {campaigns.length > 0 && (
                <div className="pt-3 border-t border-ink/10">
                  <label className="block text-xs font-extrabold uppercase tracking-widest text-ink/50 mb-1.5 flex items-center gap-1.5">
                    <Building2 className="size-3.5 text-brand" />
                    Rattacher à une Campagne ONG (Optionnel)
                  </label>
                  <select
                    value={selectedCampaignId}
                    onChange={(e) => setSelectedCampaignId(e.target.value)}
                    className="w-full bg-surface border border-ink/10 rounded-2xl p-3 text-xs font-bold text-ink focus:outline-none focus:ring-2 focus:ring-brand/30"
                  >
                    <option value="">Aucune campagne (Inscription standard)</option>
                    {campaigns.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.target_count} enfants ciblés)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 pt-4 border-t border-ink/5 bg-surface/50 mt-auto flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl font-bold text-sm text-ink bg-white border border-ink/10 hover:bg-surface transition-colors"
          >
            Annuler
          </button>
          <button
            onClick={handleEnroll}
            disabled={!selectedSeasonId || enrolling}
            className="flex-1 py-3 px-4 rounded-xl font-black text-sm text-white bg-brand hover:bg-brand/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {enrolling ? <Loader2 className="size-4 animate-spin" /> : null}
            Confirmer
          </button>
        </div>
      </div>
    </div>
  );
}
