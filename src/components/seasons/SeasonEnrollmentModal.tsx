import { useState } from "react";
import { X, Gift, Phone, Sparkles } from "lucide-react";
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
  const [mode, setMode] = useState<"choice" | "code">("choice");

  const handleWhatsAppRedirect = () => {
    const message = `Bonjour Génizio ! 👋\nJe souhaite inscrire mon enfant *${childName}* à la saison *${season.title}*.\nMontant: 10 000 FCFA.\nMerci !`;
    const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER || "33606433148";
    window.open(`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`, "_blank");
    onClose();
  };

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
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md overflow-hidden rounded-[2rem] bg-surface shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-ink/10 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-brand/10 text-brand">
              <Sparkles className="size-5" />
            </div>
            <h2 className="font-display text-xl font-bold text-ink">Rejoindre la Saison</h2>
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
              Inscrivez <span className="font-bold text-ink">{childName}</span> pour ce trimestre thématique et débloquez son Portfolio d'Impact !
            </p>
          </div>

          {mode === "choice" ? (
            <div className="space-y-3">
              <button
                onClick={handleWhatsAppRedirect}
                className="w-full flex items-center gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-left transition-all hover:bg-emerald-100 hover:border-emerald-300 cursor-pointer"
              >
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-500 text-white shadow-sm">
                  <Phone className="size-5" />
                </div>
                <div>
                  <h4 className="font-bold text-emerald-900">Payer via WhatsApp</h4>
                  <p className="text-xs text-emerald-700 mt-0.5">Mobile Money (10 000 FCFA)</p>
                </div>
              </button>

              <button
                onClick={() => setMode("code")}
                className="w-full flex items-center gap-4 rounded-2xl border border-ink/10 bg-white px-5 py-4 text-left transition-all hover:border-brand hover:shadow-md cursor-pointer"
              >
                <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand/10 text-brand">
                  <Gift className="size-5" />
                </div>
                <div>
                  <h4 className="font-bold text-ink">J'ai un Code de Parrainage</h4>
                  <p className="text-xs text-ink/60 mt-0.5">Diaspora ou Bourse RSE</p>
                </div>
              </button>
            </div>
          ) : (
            <form onSubmit={handleRedeemCode} className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink/60">
                  Code de Parrainage
                </label>
                <input
                  type="text"
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Ex: G-2X9T"
                  className="w-full rounded-2xl border border-ink/20 bg-white px-4 py-3 font-mono text-lg font-bold text-ink text-center tracking-widest focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10"
                />
              </div>

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={loading || !code.trim()}
                  className="w-full rounded-2xl bg-brand px-6 py-3.5 text-sm font-bold text-white shadow-md hover:bg-brand/90 transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? "Vérification..." : "Valider le Code"}
                </button>
                <button
                  type="button"
                  onClick={() => setMode("choice")}
                  className="w-full rounded-2xl px-6 py-3 text-sm font-bold text-ink/60 hover:bg-ink/5 hover:text-ink transition-colors cursor-pointer"
                >
                  Retour
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
