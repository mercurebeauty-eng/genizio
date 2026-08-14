import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useSession } from "@/hooks/use-session";
import { verifyPaymentByReference, verifySponsorshipPayment } from "@/lib/payments.functions";
import type { SponsorshipToken } from "@/lib/seasons.functions";
import { GenizioLoader } from "@/components/GenizioLoader";
import { CheckCircle2, XCircle, Loader2, ArrowRight, CreditCard, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/paiement-retour")({
  validateSearch: (search: Record<string, unknown>) => ({
    // Paystack redirige vers callback_url avec `reference` (et `trxref` en doublon).
    reference:
      typeof search.reference === "string"
        ? search.reference
        : typeof search.trxref === "string"
          ? search.trxref
          : "",
  }),
  component: PaymentReturnPage,
});

// Le parrainage se paie SANS compte (page publique /parrainage) : les références
// GENIZIO-SPONSOR-… sont vérifiées sans session, les autres références exigent un compte.
const SPONSORSHIP_PREFIX = "GENIZIO-SPONSOR-";

type VerifyState =
  | { kind: "checking" }
  | { kind: "success"; entitlement: string | null; token?: SponsorshipToken | null }
  | { kind: "abandoned" | "failed" | "error"; message?: string };

const ENTITLEMENT_COPY: Record<string, { title: string; href: string; cta: string }> = {
  order: {
    title: "Votre commande est confirmée !",
    href: "/boutique",
    cta: "Retour à la boutique",
  },
  child_access: {
    title: "Accès débloqué !",
    href: "/profiles",
    cta: "Retour aux profils",
  },
  passport: {
    title: "Passeport débloqué !",
    href: "/profiles",
    cta: "Voir le Passeport",
  },
  extra_slots: {
    title: "Palier ajouté !",
    href: "/profiles",
    cta: "Retour aux profils",
  },
  accompaniment_pack: {
    title: "Pack Accompagnement activé !",
    href: "/profiles",
    cta: "Retour aux profils",
  },
};

function PaymentReturnPage() {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const { reference } = useSearch({ from: "/paiement-retour" });
  const verifyFn = useServerFn(verifyPaymentByReference);
  const verifySponsorshipFn = useServerFn(verifySponsorshipPayment);

  const isSponsorship = reference.startsWith(SPONSORSHIP_PREFIX);
  const [state, setState] = useState<VerifyState>({ kind: "checking" });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Seuls les paiements classiques exigent une session : le parrainage se paie en public.
    if (!loading && !session && !isSponsorship) navigate({ to: "/auth", replace: true });
  }, [session, loading, navigate, isSponsorship]);

  useEffect(() => {
    if (!reference) {
      setState({ kind: "error", message: "Référence de paiement manquante." });
      return;
    }
    if (!isSponsorship && !session) return; // en attente de session — l'effect au-dessus redirige

    let cancelled = false;
    setState({ kind: "checking" });

    const handleSuccess = (resp: {
      paymentStatus: string;
      entitlement?: string | null;
      token?: unknown;
    }) => {
      if (cancelled) return;
      if (resp.paymentStatus === "success") {
        setState({
          kind: "success",
          entitlement: resp.entitlement ?? null,
          token: (resp.token as SponsorshipToken | null) ?? null,
        });
      } else if (resp.paymentStatus === "abandoned") {
        setState({ kind: "abandoned" });
      } else if (resp.paymentStatus === "failed") {
        setState({ kind: "failed" });
      } else {
        setState({
          kind: "error",
          message: `Paiement en attente de confirmation (statut : ${resp.paymentStatus}).`,
        });
      }
    };

    const verify = isSponsorship
      ? verifySponsorshipFn({ data: { reference } })
      : verifyFn({ data: { reference } });

    verify.then(handleSuccess).catch((err) => {
      console.error("Erreur vérification paiement:", err);
      if (!cancelled) {
        setState({ kind: "error", message: err?.message ?? "Erreur lors de la vérification." });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [session, reference, verifyFn, verifySponsorshipFn, isSponsorship]);

  return (
    <div className="grid min-h-dvh place-items-center bg-gradient-to-b from-surface to-brand/5 p-4 text-ink">
      <div className="w-full max-w-md rounded-3xl border border-ink/10 bg-white p-8 text-center shadow-xl">
        {state.kind === "checking" && (
          <>
            <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-brand/10">
              <Loader2 className="size-8 animate-spin text-brand" />
            </div>
            <h1 className="font-display text-balance text-2xl font-black">
              Vérification du paiement…
            </h1>
            <p className="mt-2 text-sm text-ink/60">
              Nous confirmons votre transaction auprès de Paystack.
            </p>
            <div className="mt-6">
              <GenizioLoader className="py-4" />
            </div>
          </>
        )}

        {state.kind === "success" && (
          <>
            <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-emerald-100">
              <CheckCircle2 className="size-9 text-emerald-600" />
            </div>
            <h1 className="font-display text-balance text-2xl font-black text-emerald-700">
              {state.token ? "Parrainage confirmé 🎉" : "Paiement réussi 🎉"}
            </h1>
            {state.token ? (
              <>
                <p className="mt-2 text-sm text-ink/60 leading-relaxed">
                  Merci pour votre générosité ! Voici le code de parrainage de{" "}
                  <strong>{state.token.months_count ?? 3} mois</strong> — transmettez-le à la
                  famille de l'enfant, elle l'activera dans Paramètres → Abonnement famille.
                </p>
                <div className="mt-5 rounded-2xl bg-surface p-6 border border-ink/10">
                  <span className="text-xs font-bold uppercase tracking-wider text-ink/60 block mb-2">
                    Code de Parrainage Unique
                  </span>
                  <div className="font-mono text-xl font-black text-brand tracking-widest selection:bg-brand selection:text-white mb-3">
                    {state.token.code}
                  </div>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(state.token?.code ?? "");
                      setCopied(true);
                      toast.success("Code de parrainage copié !");
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="press-ink w-full rounded-xl bg-ink px-4 py-3 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {copied ? (
                      <Check className="size-4 text-emerald-400" />
                    ) : (
                      <Copy className="size-4" />
                    )}
                    {copied ? "Code copié !" : "Copier le code"}
                  </button>
                </div>
                <p className="mt-4 text-xs text-ink/50">
                  Référence : <span className="font-bold text-ink">{reference}</span>
                </p>
                <Link
                  to="/parrainage"
                  className="press-brand mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-glow focus-visible:ring-offset-2"
                >
                  Parrainer un autre enfant
                  <ArrowRight className="size-4" />
                </Link>
              </>
            ) : (
              <>
                <p className="mt-2 text-sm text-ink/60 leading-relaxed">
                  {ENTITLEMENT_COPY[state.entitlement ?? ""]?.title ??
                    "Votre paiement a bien été reçu."}
                  <br />
                  Référence : <span className="font-bold text-ink">{reference}</span>
                </p>
                <Link
                  to={ENTITLEMENT_COPY[state.entitlement ?? ""]?.href ?? "/profiles"}
                  className="press-brand mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-glow focus-visible:ring-offset-2"
                >
                  {ENTITLEMENT_COPY[state.entitlement ?? ""]?.cta ?? "Retour à l'accueil"}
                  <ArrowRight className="size-4" />
                </Link>
              </>
            )}
          </>
        )}

        {(state.kind === "abandoned" || state.kind === "failed") && (
          <>
            <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-amber-100">
              <XCircle className="size-9 text-amber-600" />
            </div>
            <h1 className="font-display text-balance text-2xl font-black text-ink">
              {state.kind === "abandoned" ? "Paiement annulé" : "Paiement échoué"}
            </h1>
            <p className="mt-2 text-sm text-ink/60 leading-relaxed">
              {state.kind === "abandoned"
                ? "Vous avez quitté la page de paiement sans finaliser. Aucun montant n'a été débité."
                : "La transaction n'a pas abouti. Aucun montant n'a été débité."}
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <Link
                to={isSponsorship ? "/parrainage" : "/profiles"}
                className="press-brand inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-glow focus-visible:ring-offset-2"
              >
                {isSponsorship ? "Retour au parrainage" : "Retour aux profils"}
              </Link>
              {!isSponsorship && (
                <Link
                  to="/boutique"
                  className="mt-1 py-2 text-xs font-bold text-ink/60 hover:text-ink transition-colors"
                >
                  Revenir à la boutique
                </Link>
              )}
            </div>
          </>
        )}

        {state.kind === "error" && (
          <>
            <div className="mx-auto mb-4 grid size-16 place-items-center rounded-full bg-red-100">
              <CreditCard className="size-8 text-red-500" />
            </div>
            <h1 className="font-display text-balance text-2xl font-black">Paiement en attente</h1>
            <p className="mt-2 text-sm text-ink/60 leading-relaxed">{state.message}</p>
            <p className="mt-3 text-xs text-ink/50 leading-relaxed">
              Si le paiement a bien été effectué, il sera confirmé automatiquement dans quelques
              instants (notification de Paystack). Si le problème persiste, contactez le support.
            </p>
            <Link
              to={isSponsorship ? "/parrainage" : "/profiles"}
              className="press-brand mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-bold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-glow focus-visible:ring-offset-2"
            >
              {isSponsorship ? "Retour au parrainage" : "Retour aux profils"}
              <ArrowRight className="size-4" />
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
