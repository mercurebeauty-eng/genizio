import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { initializeChildAccessPayment } from "@/lib/payments.functions";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatXof } from "@/lib/pricing";

// Renouvellement en ligne de l'accès mensuel d'un enfant (bannières d'expiration des
// pages Portfolio/Défis). Remplaçait le CTA WhatsApp : le paiement Paystack (intent
// 'child_access') étend child_access_periods de `months` mois — le serveur calcule le
// montant (barème du compte × mois), on redirige vers le checkout hébergé.
export function RenewChildAccessButton({
  childId,
  monthlyPriceXof,
}: {
  childId: string;
  monthlyPriceXof: number;
}) {
  const [months, setMonths] = useState(1);
  const [paying, setPaying] = useState(false);
  const initFn = useServerFn(initializeChildAccessPayment);

  const handlePay = async () => {
    setPaying(true);
    try {
      const callbackUrl = `${window.location.origin}/paiement-retour`;
      const { authorizationUrl } = await initFn({
        data: { childId, months, callbackUrl },
      });
      toast.success("Redirection vers le paiement sécurisé Paystack…");
      window.location.href = authorizationUrl;
    } catch (err) {
      console.error(err);
      toast.error("Impossible d'initier le paiement. Réessayez.");
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="shrink-0 flex flex-col items-stretch gap-1.5">
      <div className="flex gap-1">
        {[1, 3, 6].map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMonths(m)}
            className={`flex-1 rounded-lg border px-2.5 py-1 text-[10px] font-extrabold transition-all cursor-pointer ${
              months === m
                ? "border-emerald-600 bg-emerald-600 text-white"
                : "border-ink/10 bg-white text-ink/70 hover:border-ink/30"
            }`}
          >
            {m} mois
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={handlePay}
        disabled={paying}
        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-[11px] font-bold text-white shadow-sm hover:brightness-95 transition-all disabled:opacity-60"
      >
        {paying ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <CreditCard className="size-3.5" />
        )}
        Renouveler en ligne ({formatXof(monthlyPriceXof * months)})
      </button>
    </div>
  );
}
