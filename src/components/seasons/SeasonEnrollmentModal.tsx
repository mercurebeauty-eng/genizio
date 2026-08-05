import { useState } from "react";
import { X, Gift } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { redeemSponsorshipToken, type Season } from "@/lib/seasons.functions";
import { toast } from "sonner";

interface SeasonEnrollmentModalProps {
  season: Season;
  childId: string;
  childName: string;
  onClose: () => void;
  onSuccess: () => void;
}

// La Saison est incluse automatiquement avec chaque profil depuis 2026-08-03 (cf.
// auto_enroll_new_child_in_active_season) — cette modale ne sert plus qu'à la rédemption d'un
// code de parrainage (dons diaspora/RSE, /parrainage) : le code vaut 1 à 6 mois d'accès payant
// (child_access_periods, modèle mensuel 2026-08-05).
export function SeasonEnrollmentModal({
  season,
  childId,
  childName,
  onClose,
  onSuccess,
}: SeasonEnrollmentModalProps) {
  const redeemFn = useServerFn(redeemSponsorshipToken);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState("");

  const handleRedeemCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    setLoading(true);
    try {
      const res = await redeemFn({ data: { code: code.trim(), childId } });
      if (res.success) {
        toast.success("Inscription validée avec succès !");
        onSuccess();
      }
    } catch (err: any) {
      toast.error(err.message || "Code invalide ou déjà utilisé.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] bg-surface shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-ink/10 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-brand/10 text-brand">
              <Gift className="size-5" />
            </div>
            <h2 className="font-display text-xl font-bold text-ink">Code de parrainage</h2>
          </div>
          <button
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full hover:bg-ink/5 transition-colors cursor-pointer"
          >
            <X className="size-5 text-ink/60" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="text-center space-y-2">
            <h3 className="font-display text-lg font-bold text-ink">{season.title}</h3>
            <p className="text-sm text-ink/70">
              Un parrain (diaspora ou bourse RSE) vous a donné un code pour{" "}
              <span className="font-bold text-ink">{childName}</span> ? Saisissez-le ici — il ajoute
              1 à 6 mois d'accès à son profil.
            </p>
          </div>

          <form onSubmit={handleRedeemCode} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink/60">
                Code de Parrainage
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="Ex: GENIZIO-PARRAIN-X9K2"
                className="w-full rounded-2xl border border-ink/20 bg-white px-4 py-3 font-mono text-lg font-bold text-ink text-center tracking-widest focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !code.trim()}
              className="w-full rounded-2xl bg-brand px-6 py-3.5 text-sm font-bold text-white shadow-md hover:bg-brand/90 transition-all cursor-pointer disabled:opacity-50"
            >
              {loading ? "Vérification..." : "Valider le Code"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
