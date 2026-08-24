import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { initializeFamilySubscription } from "@/lib/subscriptions.functions";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

// CTA principal des modales de quota : l'abonnement famille couvre TOUS les enfants du
// compte (jusqu'au plafond de 5) pour un tarif unique — bien plus avantageux que l'achat
// d'un slot mensuel enfant par enfant. Le paiement récurrent Paystack (forfait famille)
// est initialisé côté serveur, puis le parent est redirigé vers le checkout hébergé.
export function FamilySubscribeButton() {
  const initFn = useServerFn(initializeFamilySubscription);
  const [subscribing, setSubscribing] = useState(false);

  const handle = async () => {
    setSubscribing(true);
    try {
      const callbackUrl = `${window.location.origin}/paiement-retour`;
      const { authorizationUrl } = await initFn({ data: { callbackUrl } });
      toast.success("Redirection vers le paiement sécurisé Paystack…");
      window.location.href = authorizationUrl;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Impossible d'initier la souscription.");
      setSubscribing(false);
    }
  };

  return (
    <button
      onClick={handle}
      disabled={subscribing}
      className="press-brand flex w-full items-center justify-center gap-2 rounded-full bg-brand py-3.5 font-bold text-sm text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {subscribing ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
      S'abonner pour la famille
    </button>
  );
}
