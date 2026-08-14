import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useSession } from "@/hooks/use-session";
import { FamilySubscribeButton } from "@/components/settings/FamilySubscribeButton";
import { Loader2, Sparkles, CreditCard, MessageCircle, Users, CalendarClock } from "lucide-react";
import {
  resolveExtraSlotPrice,
  formatXof,
  formatXofAmount,
  formatPromoDeadline,
  STANDARD_PRICE_XOF,
  SESSION_PRICE_XOF,
  PACK_SESSIONS,
  PACK_PRICE_XOF,
  BILAN_PRICE_XOF,
} from "@/lib/pricing";
import { initializeUpgradePayment } from "@/lib/payments.functions";
import { toast } from "sonner";

// Modale parent « Accès & Accompagnement » (V1, 2026-08-14) — remplace les deux copies
// dupliquées de « Quota gratuit atteint » (profiles.index.tsx et profiles.manage.tsx).
// Contenu :
//   • jauge de couverture (enfants X/5, couvert jusqu'au, badge campagne) — le mot
//     « Quota » disparaît au profit de « Couverture » (le parent voit un état, pas une règle) ;
//   • blocs existants : Forfait famille + Profil supplémentaire permanent (paiement Paystack) ;
//   • NOUVEAU bloc « Pack Accompagnement » : 12 séances × 5 000 F = 60 000 F/mois/ENFANT —
//     pendant le pilote le paiement est MANUEL (WhatsApp/Mobile Money), le bouton ouvre un
//     lien WhatsApp pré-rempli (pas encore branché à Paystack — ce sera l'intent
//     accompaniment_pack en V2).
export function AccessUpgradeModal({
  profileCount,
  familyCovered,
  campaignCovered,
  coveredUntil,
  onClose,
}: {
  profileCount: number;
  familyCovered: boolean;
  campaignCovered: boolean;
  coveredUntil: string | null;
  onClose: () => void;
}) {
  const { session } = useSession();
  const slotPrice = resolveExtraSlotPrice(session?.user?.created_at);
  const [upgradeMonths, setUpgradeMonths] = useState(3);
  const upgradeTotal = slotPrice.priceXof * upgradeMonths;
  const [payingUpgrade, setPayingUpgrade] = useState(false);

  const initializeUpgradePaymentFn = useServerFn(initializeUpgradePayment);

  const handlePayUpgrade = async () => {
    if (!session) return;
    setPayingUpgrade(true);
    try {
      const callbackUrl = `${window.location.origin}/paiement-retour`;
      const { authorizationUrl } = await initializeUpgradePaymentFn({
        data: { months: upgradeMonths, callbackUrl },
      });
      toast.success("Redirection vers le paiement sécurisé Paystack…");
      window.location.href = authorizationUrl;
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du paiement.");
    } finally {
      setPayingUpgrade(false);
    }
  };

  // Paiement manuel du pilote : lien WhatsApp pré-rempli vers l'équipe (même numéro que
  // le FAB WhatsApp — VITE_WHATSAPP_NUMBER, fallback 33606433148).
  const whatsappPhone =
    (typeof import.meta !== "undefined" &&
      (import.meta.env?.VITE_WHATSAPP_NUMBER as string | undefined)?.replace(/\D/g, "")) ||
    "33606433148";
  const packMessage = encodeURIComponent(
    `Bonjour Génizio, je souhaite souscrire le Pack Accompagnement pour mon enfant (${PACK_SESSIONS} séances × ${formatXof(SESSION_PRICE_XOF)} = ${formatXof(PACK_PRICE_XOF)}/mois). Merci de me donner les modalités de paiement.`,
  );

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-[2rem] border border-ink/10 bg-white/95 backdrop-blur-md p-8 shadow-xl"
      >
        {/* Header — jauge de couverture */}
        <div className="mb-6 flex items-start gap-4">
          <div className="grid size-14 shrink-0 place-items-center rounded-[1.2rem] bg-amber-100 text-3xl">
            🔒
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-balance text-2xl font-extrabold text-ink leading-tight">
              Couverture atteinte
            </h2>
            <p className="mt-1 text-sm text-ink/60 font-medium">
              Vous avez déjà {profileCount} profil{profileCount > 1 ? "s" : ""} enregistré
              {profileCount > 1 ? "s" : ""}
              {familyCovered
                ? " — couverts par votre abonnement famille."
                : campaignCovered
                  ? " — soutenus par votre programme partenaire."
                  : "."}
            </p>

            {/* Jauge de couverture : l'état réel, pas une règle de quota. */}
            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1 h-2 rounded-full bg-surface overflow-hidden border border-ink/5">
                <div
                  className="h-full bg-gradient-to-r from-brand to-indigo-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, (profileCount / 5) * 100)}%` }}
                />
              </div>
              <span className="text-[11px] font-black text-ink/60 whitespace-nowrap">
                {profileCount} / 5 enfants
              </span>
            </div>
            {coveredUntil && (
              <p className="mt-1.5 flex items-center gap-1 text-[11px] font-bold text-ink/50">
                <CalendarClock className="size-3" />
                Couvert jusqu'au{" "}
                {new Date(coveredUntil).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            )}
          </div>
        </div>

        {/* Forfait famille — recommandé (couvre TOUS les enfants jusqu'au plafond de 5) */}
        <div className="mb-6 rounded-2xl border-2 border-brand/40 bg-brand/5 p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-black uppercase tracking-widest text-brand">
              <Sparkles className="size-3.5 inline-block -mt-0.5 mr-1" />
              Forfait famille — recommandé
            </p>
            <span className="rounded-full bg-brand px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
              {familyCovered ? "Actif" : "1 tarif = tous vos enfants"}
            </span>
          </div>
          <p className="font-display text-balance text-2xl font-black text-ink">
            {formatXofAmount(slotPrice.priceXof)}{" "}
            <span className="text-base font-bold text-ink/50">FCFA / mois</span>
          </p>
          {slotPrice.isPromo && slotPrice.promoEndsAt && (
            <p className="mt-1 text-[11px] font-semibold text-ink/60">
              Prix de bienvenue jusqu'au {formatPromoDeadline(slotPrice.promoEndsAt)}, puis{" "}
              {formatXof(STANDARD_PRICE_XOF)}/mois.
            </p>
          )}
          <p className="mt-2 text-xs text-ink/70 leading-relaxed">
            Un seul abonnement couvre tous vos profils jusqu'à <strong>5 enfants</strong> (au-delà,
            créez un nouveau compte). Résiliable à tout moment.
          </p>
          {!familyCovered && (
            <div className="mt-4">
              <FamilySubscribeButton />
            </div>
          )}
        </div>

        {/* Pack Accompagnement (V1) — l'accompagnement humain, PAR ENFANT.
            Paiement manuel pilote via WhatsApp ; le paiement en ligne arrive en V2. */}
        <div className="mb-6 rounded-2xl border-2 border-sky-300/60 bg-sky-50 p-5">
          <div className="flex items-center justify-between mb-1">
            <p className="text-xs font-black uppercase tracking-widest text-sky-700">
              <Users className="size-3.5 inline-block -mt-0.5 mr-1" />
              Pack Accompagnement — par enfant
            </p>
            <span className="rounded-full bg-sky-600 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
              Superviseur dédié
            </span>
          </div>
          <p className="font-display text-balance text-2xl font-black text-ink">
            {formatXofAmount(PACK_PRICE_XOF)}{" "}
            <span className="text-base font-bold text-ink/50">FCFA / mois</span>
          </p>
          <p className="mt-1 text-[11px] font-semibold text-ink/60">
            {PACK_SESSIONS} séances × {formatXof(SESSION_PRICE_XOF)} par séance —{" "}
            <strong>pour un seul enfant</strong> (3 séances/semaine × 4 semaines). Un superviseur
            formé rencontre votre enfant, suit sa progression et fait le lien avec les défis Naya.
            Le bilan initial ({formatXof(BILAN_PRICE_XOF)}, une séance) est inclus dans le premier
            mois.
          </p>
          <a
            href={`https://wa.me/${whatsappPhone}?text=${packMessage}`}
            target="_blank"
            rel="noreferrer"
            className="mt-4 flex w-full items-center justify-center gap-2.5 rounded-2xl bg-emerald-600 py-3 font-bold text-sm text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm transition-all"
          >
            <MessageCircle className="size-4" />
            Souscrire sur WhatsApp
          </a>
          <p className="mt-2 text-center text-[11px] font-semibold text-ink/50">
            Paiement Mobile Money (Wave, MTN, Orange) — confirmation sous 24 h.
          </p>
        </div>

        {/* Profil supplémentaire permanent */}
        <div className="mb-6 rounded-2xl border border-ink/10 bg-surface p-5">
          <p className="text-xs font-black uppercase tracking-widest text-ink/60 mb-1">
            Profil supplémentaire permanent
          </p>
          <p className="font-display text-balance text-3xl font-black text-ink">
            {formatXofAmount(upgradeTotal)} <span className="text-lg text-ink/60">FCFA</span>
            <span className="ml-2 align-middle text-sm font-bold text-ink/50">
              soit {formatXof(slotPrice.priceXof)}/mois
            </span>
          </p>
          {slotPrice.isPromo && slotPrice.promoEndsAt && (
            <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-black text-emerald-800">
              Prix de bienvenue — jusqu'au {formatPromoDeadline(slotPrice.promoEndsAt)}, puis{" "}
              {formatXof(STANDARD_PRICE_XOF)}/mois
            </p>
          )}
          {/* Montant du paiement unique (1, 3 ou 6 mois au barème mensuel, même grille que le parrainage) */}
          <div className="mt-4 flex gap-2">
            {[1, 3, 6].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setUpgradeMonths(m)}
                className={`flex-1 rounded-xl border px-3 py-2 text-sm font-extrabold transition-all cursor-pointer ${
                  upgradeMonths === m
                    ? "border-brand bg-brand text-white shadow-sm"
                    : "border-ink/10 bg-white text-ink/70"
                }`}
              >
                {m} mois
              </button>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink/60 leading-relaxed">
            Un profil enfant supplémentaire, débloqué définitivement pour ce compte après le
            paiement en ligne (paiement unique — le nombre de mois choisit le montant, l'accès ne
            s'interrompt jamais).
          </p>
        </div>

        {/* Paiement en ligne Paystack */}
        <button
          onClick={handlePayUpgrade}
          disabled={payingUpgrade}
          className="flex w-full items-center justify-center gap-2.5 rounded-full bg-emerald-600 py-3.5 font-bold text-sm text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 active:shadow-sm transition-all disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {payingUpgrade ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Paiement en cours...
            </>
          ) : (
            <>
              <CreditCard className="size-4" />
              Payer en ligne par Paystack
            </>
          )}
        </button>
        <p className="mt-3 text-center text-[11px] font-semibold text-ink/50 leading-relaxed">
          Paiement sécurisé par carte bancaire ou Mobile Money (Wave, MTN, Orange).
        </p>

        <button
          onClick={onClose}
          className="mt-3 w-full py-2 text-center text-xs font-bold text-ink/60 hover:text-ink transition-all"
        >
          Fermer
        </button>
      </div>
    </div>
  );
}
