import { useState, useEffect } from "react";
import { X, Calendar, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { enrollChildAdmin, listSeasonsAdmin, type Season } from "@/lib/seasons.functions";
import { toast } from "sonner";

interface AdminSeasonEnrollmentModalProps {
  childId: string;
  childName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function AdminSeasonEnrollmentModal({ childId, childName, onClose, onSuccess }: AdminSeasonEnrollmentModalProps) {
  const enrollFn = useServerFn(enrollChildAdmin);
  const listSeasonsFn = useServerFn(listSeasonsAdmin);
  
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loadingSeasons, setLoadingSeasons] = useState(true);
  const [selectedSeasonId, setSelectedSeasonId] = useState<string>("");
  const [enrolling, setEnrolling] = useState(false);

  useEffect(() => {
    listSeasonsFn({ data: undefined })
      .then(fetchedSeasons => {
        setSeasons(fetchedSeasons);
        if (fetchedSeasons.length > 0) {
          setSelectedSeasonId(fetchedSeasons[0].id);
        }
      })
      .catch(err => {
        console.error(err);
        toast.error("Erreur lors du chargement des saisons");
      })
      .finally(() => setLoadingSeasons(false));
  }, []);

  const handleEnroll = async () => {
    if (!selectedSeasonId) return;
    
    setEnrolling(true);
    try {
      await enrollFn({ data: { childId, seasonId: selectedSeasonId } });
      toast.success(`${childName} a été inscrit avec succès à la saison !`);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'inscription.");
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
            Sélectionnez une saison pour inscrire manuellement <strong className="text-ink">{childName}</strong>.
          </p>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {loadingSeasons ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="size-6 animate-spin text-brand" />
            </div>
          ) : seasons.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm font-bold text-ink/60">Aucune saison active ou à venir trouvée.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <label className="block text-xs font-extrabold uppercase tracking-widest text-ink/50 mb-1">
                Saisons disponibles
              </label>
              {seasons.map(season => (
                <div
                  key={season.id}
                  onClick={() => setSelectedSeasonId(season.id)}
                  className={`rounded-2xl border p-4 cursor-pointer transition-all flex items-start gap-3 ${
                    selectedSeasonId === season.id
                      ? "border-brand bg-brand/5 shadow-sm"
                      : "border-ink/10 bg-white hover:bg-surface"
                  }`}
                >
                  <div className={`mt-0.5 size-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    selectedSeasonId === season.id ? "border-brand" : "border-ink/20"
                  }`}>
                    {selectedSeasonId === season.id && <div className="size-2 rounded-full bg-brand" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-ink">{season.title}</h3>
                    <p className="text-xs text-ink/60 mt-1">{season.theme}</p>
                    <div className="flex gap-2 mt-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        season.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-sky text-brand"
                      }`}>
                        {season.status === "active" ? "En cours" : "À venir"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
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
