import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { useFamilyCoverage } from "@/hooks/use-family-coverage";
import { FamilySubscribeButton } from "@/components/settings/FamilySubscribeButton";
import { AppHeader } from "@/components/AppHeader";
import { ProfileCard } from "@/components/profiles/ProfileCard";
import { ProfileDialog } from "@/components/profiles/ProfileDialog";
import { GenizioLoader } from "@/components/GenizioLoader";
import type { ChildProfile } from "@/components/profiles/shared";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { ArrowLeft, Lock, CreditCard, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { computeChildCreationLimit } from "@/lib/child-access";
import { initializeUpgradePayment } from "@/lib/payments.functions";
import {
  resolveExtraSlotPrice,
  formatXof,
  formatXofAmount,
  formatPromoDeadline,
  STANDARD_PRICE_XOF,
} from "@/lib/pricing";

export const Route = createFileRoute("/profiles/manage")({
  component: ManageProfilesPage,
});

function ManageProfilesPage() {
  const { session, loading } = useSession();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<ChildProfile[]>([]);
  const [fetching, setFetching] = useState(true);
  const [editing, setEditing] = useState<ChildProfile | "new" | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // Prix de bienvenue (3 premiers mois du compte) puis tarif standard — cf. src/lib/pricing.ts.
  const slotPrice = resolveExtraSlotPrice(session?.user?.created_at);
  // Compte couvert (abonnement famille actif ou crédit de parrainage) → création possible
  // jusqu'au plafond de 5 — miroir du trigger check_child_profile_quota (20260809120000).
  const { covered: familyCovered } = useFamilyCoverage();

  // Décision 2026-08-05 : l'accès payant est MENSUEL (5 000 F/mois de bienvenue →
  // 15 000 F/mois). Le parent choisit une durée (1/3/6 mois) ; le montant =
  // prix mensuel × mois. L'admin prolonge via extendChildAccessAdmin après le virement.
  const [upgradeMonths, setUpgradeMonths] = useState(3);
  const upgradeTotal = slotPrice.priceXof * upgradeMonths;
  const initializeUpgradePaymentFn = useServerFn(initializeUpgradePayment);
  const [payingUpgrade, setPayingUpgrade] = useState(false);

  // Paiement en ligne Paystack : le serveur calcule le montant (barème du compte × mois),
  // crée la payment et on redirige vers la page hébergée. Le webhook/retour octroie
  // automatiquement le slot (extra_profile_slots) — miroir de updateExtraProfileSlotsAdmin.
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
    } catch (err) {
      console.error(err);
      toast.error("Impossible d'initier le paiement. Réessayez.");
    } finally {
      setPayingUpgrade(false);
    }
  };

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [session, loading, navigate]);

  // Note (2026-08-14) : le refresh unique du token (claims extra_profile_slots)
  // est désormais assuré par le store singleton de useSession() au premier
  // chargement de l'app — plus besoin de refresh par page ici (le refresh par
  // page provoquait des cascades de TOKEN_REFRESHED qui re-déclenchaient tous
  // les effets [session] : la page se rechargeait en boucle).

  const refetch = async () => {
    if (!session) return;
    setFetching(true);
    try {
      const { data } = await supabase
        .from("child_profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });
      setProfiles((data ?? []) as unknown as ChildProfile[]);
    } catch (err) {
      console.error("Erreur de chargement des profils:", err);
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (session) void refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const remove = async (id: string) => {
    if (
      !(await confirmDialog({
        title: "Supprimer ce profil ?",
        description:
          "Cette action est irréversible et supprimera aussi tout l'historique de défis associé.",
        confirmLabel: "Supprimer",
        variant: "danger",
      }))
    )
      return;
    await supabase.from("child_profiles").delete().eq("id", id);
    void refetch();
  };

  if (loading || !session) {
    return (
      <div className="grid min-h-dvh place-items-center bg-surface">
        <GenizioLoader label="Chargement…" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-surface text-ink">
      <AppHeader />

      <main className="mx-auto max-w-6xl px-6 py-12">
        <Link
          to="/profile"
          className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-ink/60 hover:text-brand"
        >
          <ArrowLeft className="size-4" /> Retour aux réglages
        </Link>

        <div className="mb-10 flex flex-col justify-between gap-4  md:items-end">
          <div>
            <h1 className="font-display text-balance text-4xl font-extrabold md:text-5xl">
              Mes profils enfants
            </h1>
            <p className="mt-2 text-ink/60">
              Sauvegardez le questionnaire de chaque enfant pour retrouver ses défis en un clic.
            </p>
          </div>
          {(() => {
            // Décision 2026-08-05 : le plancher couvre le profil gratuit (+ slots grand-pérés),
            // le "+1" autorise la création du premier profil MENSUEL (en cours de première mise
            // en paiement) — miroir du trigger check_child_profile_quota (migration 20260805100000).
            const quota = computeChildCreationLimit(
              session?.user?.created_at,
              (session?.user?.app_metadata?.extra_profile_slots as number) ?? 0,
              familyCovered,
            );
            const atQuota = profiles.length >= quota;
            return (
              <button
                onClick={() => (atQuota ? setShowUpgradeModal(true) : setEditing("new"))}
                className={`rounded-2xl border border-ink/10 px-6 py-3 text-sm font-bold shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all flex items-center gap-2 ${
                  atQuota ? "bg-amber-100 text-amber-800" : "bg-brand text-white"
                }`}
              >
                {atQuota && <Lock className="size-4" />}
                {atQuota ? "Quota atteint" : "+ Nouveau profil"}
              </button>
            );
          })()}
        </div>

        {fetching ? (
          <GenizioLoader className="py-8" />
        ) : profiles.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-ink/20 bg-white/40 p-12 text-center shadow-sm">
            <p className="text-ink/60">Aucun profil pour l'instant. Créez le premier.</p>
          </div>
        ) : (
          <div className="grid gap-6  ">
            {profiles.map((p) => (
              <ProfileCard
                key={p.id}
                profile={p}
                onEdit={() => setEditing(p)}
                onDelete={() => remove(p.id)}
              />
            ))}
          </div>
        )}
      </main>

      {editing && (
        <ProfileDialog
          initial={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            void refetch();
          }}
          userId={session.user.id}
        />
      )}

      {/* ── Upgrade Modal ─────────────────────────────────────────────── */}
      {showUpgradeModal && (
        <div
          className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink/70 p-4 backdrop-blur-sm"
          onClick={() => setShowUpgradeModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl border border-ink/10 bg-white p-8 shadow-xl"
          >
            <div className="mb-6 flex items-start gap-4">
              <div className="grid size-14 shrink-0 place-items-center rounded-2xl border border-ink/10 bg-amber-100 text-3xl shadow-sm">
                🔒
              </div>
              <div>
                <h2 className="font-display text-balance text-2xl font-extrabold text-ink">
                  Quota gratuit atteint
                </h2>
                <p className="mt-1 text-sm text-ink/60">
                  Vous avez {profiles.length} profils enregistrés
                  {familyCovered ? " — couverts par votre abonnement famille." : "."}
                </p>
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
                Un seul abonnement couvre tous vos profils jusqu'à{" "}
                <strong>5 enfants</strong> (au-delà, créez un nouveau compte). Résiliable à tout
                moment.
              </p>
              {!familyCovered && (
                <div className="mt-4">
                  <FamilySubscribeButton />
                </div>
              )}
            </div>

            <div className="mb-6 rounded-2xl border border-ink/10 bg-surface p-5 shadow-sm">
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
                Un profil enfant supplémentaire, débloqué définitivement pour ce compte après
                le paiement en ligne (paiement unique — le nombre de mois choisit le montant,
                l'accès ne s'interrompt jamais).
              </p>
            </div>
            <button
              onClick={handlePayUpgrade}
              disabled={payingUpgrade}
              className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-emerald-600 py-3.5 font-bold text-sm text-white shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all disabled:opacity-60 disabled:cursor-not-allowed"
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
            <button
              onClick={() => setShowUpgradeModal(false)}
              className="mt-3 w-full py-2 text-center text-xs font-bold text-ink/60 hover:text-ink transition-all"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
