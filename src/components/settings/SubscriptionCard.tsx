import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  getFamilySubscriptionStatus,
  initializeFamilySubscription,
  cancelFamilySubscription,
  redeemSponsorshipCode,
} from "@/lib/subscriptions.functions";
import type { FamilySubscriptionStatus } from "@/lib/subscriptions.functions";
import { formatXofAmount, formatPromoDeadline } from "@/lib/pricing";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Sparkles, Gift, KeyRound, CreditCard } from "lucide-react";
import { toast } from "sonner";

const STATUS_LABEL: Record<string, { label: string; className: string }> = {
  active: { label: "Active", className: "bg-emerald-100 text-emerald-700" },
  past_due: { label: "Paiement en retard", className: "bg-amber-100 text-amber-800" },
  cancelled: { label: "Résiliée", className: "bg-red-100 text-red-700" },
  expired: { label: "Expirée", className: "bg-ink/10 text-ink/60" },
  initiated: { label: "En attente de paiement", className: "bg-sky-100 text-sky-800" },
};

export function SubscriptionCard() {
  const getStatusFn = useServerFn(getFamilySubscriptionStatus);
  const initFn = useServerFn(initializeFamilySubscription);
  const cancelFn = useServerFn(cancelFamilySubscription);
  const redeemFn = useServerFn(redeemSponsorshipCode);

  const [status, setStatus] = useState<FamilySubscriptionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [redeemCode, setRedeemCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await getStatusFn();
      setStatus(res);
    } catch (err) {
      console.error("Erreur statut abonnement:", err);
      toast.error(err instanceof Error ? err.message : "Erreur de chargement de l'abonnement.");
    } finally {
      setLoading(false);
    }
  }, [getStatusFn]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSubscribe = async () => {
    setSubscribing(true);
    try {
      const res = await initFn({
        data: { callbackUrl: `${window.location.origin}/paiement-retour` },
      });
      window.location.href = res.authorizationUrl;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la souscription.");
      setSubscribing(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const res = await cancelFn();
      toast.success(
        res.alreadyCancelled
          ? "Abonnement déjà résilié."
          : "Abonnement résilié. Vos enfants au-delà du 1er profil gratuit repassent en accès libre.",
      );
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la résiliation.");
    } finally {
      setCancelling(false);
    }
  };

  const handleRedeem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!redeemCode.trim()) return;
    setRedeeming(true);
    try {
      const res = await redeemFn({ data: { code: redeemCode.trim() } });
      toast.success(
        `Code activé : votre famille est couverte jusqu'au ${new Date(res.endsAt).toLocaleDateString("fr-FR")}.`,
      );
      setRedeemCode("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de l'activation du code.");
    } finally {
      setRedeeming(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-xl flex items-center justify-center gap-3 text-sm text-ink/60">
        <Loader2 className="size-4 animate-spin text-brand" /> Chargement de l'abonnement…
      </div>
    );
  }

  if (!status) return null;

  const { subscription, isPromo, promoEndsAt, currentPeriodEnd, sponsoredUntil, childrenCount } =
    status;
  const coverageActive =
    (subscription?.status === "active" || subscription?.status === "past_due") &&
    !!currentPeriodEnd &&
    new Date(currentPeriodEnd).getTime() > Date.now();
  const sponsoredActive = !!sponsoredUntil && new Date(sponsoredUntil).getTime() > Date.now();
  const coveredUntil =
    coverageActive && sponsoredActive
      ? new Date(
          Math.max(new Date(currentPeriodEnd!).getTime(), new Date(sponsoredUntil).getTime()),
        )
      : coverageActive
        ? currentPeriodEnd
        : sponsoredActive
          ? sponsoredUntil
          : null;
  const statusBadge = STATUS_LABEL[subscription?.status ?? ""];

  return (
    <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-xl md:p-8">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-display text-balance text-lg font-bold flex items-center gap-2">
          <Sparkles className="size-5 text-brand" />
          Abonnement famille
        </h3>
        {statusBadge && (
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wide ${statusBadge.className}`}
          >
            {statusBadge.label}
          </span>
        )}
      </div>
      <p className="text-xs text-ink/60 leading-relaxed mt-1 mb-5">
        Un abonnement couvre <strong>tous vos enfants jusqu'à 5 profils</strong> (au-delà, créez un
        nouveau compte). Résiliable à tout moment.
      </p>

      {/* Couverture en cours */}
      {coveredUntil && (
        <div className="rounded-2xl border-2 border-brand/30 bg-brand/5 p-4 mb-5">
          <p className="text-sm font-bold text-brand">
            {coverageActive ? "Votre famille est couverte ✓" : "Couverte par un parrainage ✓"}
          </p>
          <p className="text-xs text-ink/70 mt-1">
            {childrenCount} profil{childrenCount > 1 ? "s" : ""} actif{childrenCount > 1 ? "s" : ""}{" "}
            jusqu'au{" "}
            <strong>
              {coveredUntil
                ? new Date(coveredUntil).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })
                : "—"}
            </strong>
            .
          </p>
          {sponsoredActive && subscription?.status === "active" && (
            <p className="text-[11px] text-ink/60 mt-2 bg-white rounded-xl p-3 border border-ink/5">
              <Gift className="size-3.5 inline-block text-emerald-600 -mt-0.5 mr-1" />
              Un parrainage couvre votre famille jusqu'au{" "}
              {new Date(sponsoredUntil!).toLocaleDateString("fr-FR")} — vous pouvez résilier votre
              abonnement d'ici là pour ne plus être prélevé(e).
            </p>
          )}
        </div>
      )}

      {!coverageActive && !sponsoredActive && (
        <div className="rounded-2xl border border-ink/10 bg-surface p-4 mb-5">
          <p className="text-sm font-bold text-ink">Tarif famille</p>
          <p className="text-xs text-ink/70 mt-1">
            <strong className="text-brand text-base">
              {formatXofAmount(status.priceXof ?? (isPromo ? 5000 : 15000))} FCFA
            </strong>{" "}
            / mois
            {isPromo && promoEndsAt ? (
              <>
                {" "}
                — prix de bienvenue valable jusqu'au{" "}
                <strong>{formatPromoDeadline(new Date(promoEndsAt))}</strong>, puis 15 000
                FCFA/mois.
              </>
            ) : (
              " — vos 3 premiers mois de bienvenue (5 000 FCFA/mois) sont terminés."
            )}
          </p>
          <p className="text-[11px] text-ink/50 mt-1">
            Sans abonnement, seul votre 1er profil reste gratuit ; les autres profils sont en accès
            libre.
          </p>
        </div>
      )}

      {/* Actions */}
      {status.subscription === null ||
      status.subscription?.status === "cancelled" ||
      status.subscription?.status === "expired" ? (
        <button
          onClick={handleSubscribe}
          disabled={subscribing}
          className="press-brand flex w-full items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          {subscribing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <CreditCard className="size-4" />
          )}
          {status.subscription ? "Réactiver l'abonnement" : "S'abonner pour la famille"}
        </button>
      ) : status.subscription?.status === "active" || status.subscription?.status === "past_due" ? (
        <div className="flex flex-col sm:flex-row gap-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                disabled={cancelling}
                className="flex-1 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-bold text-red-700 hover:bg-red-100 disabled:opacity-50"
              >
                Résilier l'abonnement
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Résilier l'abonnement famille ?</AlertDialogTitle>
                <AlertDialogDescription>
                  La résiliation est <strong>immédiate</strong> : tous vos enfants au-delà du 1er
                  profil gratuit repassent en accès libre. Vous ne serez plus prélevé(e).
                  {sponsoredActive && (
                    <span className="block mt-2 text-emerald-700">
                      Bonne nouvelle : votre couverture parrainage (jusqu'au{" "}
                      {new Date(sponsoredUntil!).toLocaleDateString("fr-FR")}) reste valable.
                    </span>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.preventDefault();
                    handleCancel();
                  }}
                  className="bg-red-600 text-white hover:bg-red-700"
                >
                  {cancelling ? <Loader2 className="size-4 animate-spin" /> : null}
                  Résilier immédiatement
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          {subscription?.paystack_customer_code && (
            <a
              href={`https://paystack.com/customer/${subscription.paystack_customer_code}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 rounded-xl border border-ink/10 bg-white px-4 py-2.5 text-xs font-bold text-ink hover:bg-surface text-center"
            >
              Gérer sur Paystack
            </a>
          )}
        </div>
      ) : null}

      {/* Activation d'un code de parrainage */}
      <form onSubmit={handleRedeem} className="mt-5 border-t border-ink/5 pt-5">
        <label className="text-[11px] font-bold uppercase tracking-wider text-ink/60 flex items-center gap-1.5">
          <KeyRound className="size-3.5" /> Activer un code de parrainage
        </label>
        <div className="mt-2 flex flex-col sm:flex-row gap-2">
          <input
            value={redeemCode}
            onChange={(e) => setRedeemCode(e.target.value)}
            placeholder="GENIZIO-PARRAIN-XXXXXX"
            className="flex-1 rounded-xl border border-ink/10 bg-surface px-4 py-2.5 text-sm font-mono font-bold uppercase outline-none focus:ring-2 focus:ring-brand"
          />
          <button
            type="submit"
            disabled={redeeming || !redeemCode.trim()}
            className="press-brand rounded-xl bg-ink px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {redeeming ? <Loader2 className="size-4 animate-spin" /> : <Gift className="size-4" />}
            Activer
          </button>
        </div>
      </form>
    </div>
  );
}
