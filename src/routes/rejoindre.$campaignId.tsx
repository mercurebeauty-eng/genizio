import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import {
  getCampaignPublicInfo,
  enrollChildViaCampaignLink,
  type CampaignPublicInfo,
} from "@/lib/campaigns.functions";
import { ProfileDialog } from "@/components/profiles/ProfileDialog";
import { GenizioLoader } from "@/components/GenizioLoader";
import { toast } from "sonner";
import { CheckCircle2, Users, Calendar, ShieldCheck, Plus } from "lucide-react";

export const Route = createFileRoute("/rejoindre/$campaignId")({
  component: JoinCampaignPage,
});

interface ChildOption {
  id: string;
  name: string;
  age: number;
}

// Page d'atterrissage du lien/QR partagé par une ONG (2026-07-27) — remplace la distribution de
// codes alphanumériques par lot : la famille scanne le QR ou clique le lien, se connecte si
// besoin, choisit ou crée le profil de son enfant, et c'est fait. Volontairement une seule page
// linéaire plutôt qu'un tunnel à étapes séparées — le parcours entier (connexion → profil →
// inscription) doit être franchissable en une seule visite depuis un téléphone, sans perdre le
// fil si la famille revient après avoir créé le profil de l'enfant.
function JoinCampaignPage() {
  const { campaignId } = Route.useParams();
  const { session, loading: sessionLoading } = useSession();

  const getCampaignInfoFn = useServerFn(getCampaignPublicInfo);
  const enrollFn = useServerFn(enrollChildViaCampaignLink);

  const [campaign, setCampaign] = useState<CampaignPublicInfo | null>(null);
  const [campaignError, setCampaignError] = useState<string | null>(null);
  const [loadingCampaign, setLoadingCampaign] = useState(true);

  const [children, setChildren] = useState<ChildOption[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [isCreatingProfile, setIsCreatingProfile] = useState(false);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [enrolledChildName, setEnrolledChildName] = useState<string | null>(null);

  useEffect(() => {
    getCampaignInfoFn({ data: { campaignId } })
      .then(setCampaign)
      .catch((err: any) => setCampaignError(err.message || "Programme introuvable."))
      .finally(() => setLoadingCampaign(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  const loadChildren = async () => {
    if (!session) return;
    setLoadingChildren(true);
    const { data } = await supabase
      .from("child_profiles")
      .select("id, name, age")
      .eq("user_id", session.user.id)
      .order("name");
    const list = (data as ChildOption[]) ?? [];
    setChildren(list);
    if (list.length > 0 && !selectedChildId) setSelectedChildId(list[0].id);
    setLoadingChildren(false);
  };

  useEffect(() => {
    loadChildren();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const handleEnroll = async () => {
    if (!selectedChildId) return;
    setIsEnrolling(true);
    try {
      await enrollFn({ data: { campaignId, childId: selectedChildId } });
      const child = children.find((c) => c.id === selectedChildId);
      setEnrolledChildName(child?.name ?? "votre enfant");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'inscription.");
    } finally {
      setIsEnrolling(false);
    }
  };

  if (loadingCampaign) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-surface">
        <GenizioLoader />
      </div>
    );
  }

  if (campaignError || !campaign) {
    return (
      <div className="min-h-dvh flex items-center justify-center bg-surface px-6">
        <div className="max-w-md text-center">
          <h1 className="font-display text-2xl font-black text-ink mb-2">Programme introuvable</h1>
          <p className="text-sm text-ink/60">{campaignError || "Ce lien n'est plus valide."}</p>
          <Link to="/" className="mt-6 inline-block text-sm font-bold text-brand underline">
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-surface px-4 sm:px-6 py-10 sm:py-16">
      <div className="mx-auto max-w-md">
        <Link
          to="/"
          className="mb-8 flex items-center gap-2 font-display text-2xl font-extrabold text-brand"
        >
          <img src="/favicon-96x96.png" alt="" className="h-8 w-8" />
          GÉNIZIO
        </Link>

        <div className="rounded-3xl border border-ink/10 bg-white p-6 sm:p-8 shadow-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand/10 text-brand rounded-full text-xs font-black uppercase tracking-wider mb-4">
            <ShieldCheck className="size-3.5" />
            Programme partenaire
          </div>
          <h1 className="font-display text-2xl sm:text-3xl font-black text-ink text-balance">
            {campaign.name}
          </h1>
          {campaign.description && (
            <p className="mt-2 text-sm text-ink/70">{campaign.description}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface rounded-xl text-xs font-bold text-ink/60 border border-ink/5">
              <Calendar className="size-3.5" />
              {new Date(campaign.startDate).toLocaleDateString("fr-FR")} →{" "}
              {new Date(campaign.endDate).toLocaleDateString("fr-FR")}
            </span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-surface rounded-xl text-xs font-bold text-ink/60 border border-ink/5">
              <Users className="size-3.5" />
              {campaign.isFull ? "Complet" : `${campaign.spotsRemaining} place(s) restante(s)`}
            </span>
          </div>

          <div className="mt-6 pt-6 border-t border-ink/10">
            {enrolledChildName ? (
              <div className="text-center space-y-3">
                <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="size-8" />
                </div>
                <h2 className="font-display text-lg font-black text-ink">
                  Inscription confirmée !
                </h2>
                <p className="text-sm text-ink/60">{enrolledChildName} a rejoint le programme.</p>
                <Link
                  to="/profiles"
                  className="inline-block mt-2 w-full rounded-2xl bg-brand py-3 text-sm font-bold text-white hover:bg-brand/90 transition-colors"
                >
                  Voir son profil
                </Link>
              </div>
            ) : campaign.isFull ? (
              <p className="text-center text-sm font-medium text-ink/60">
                Ce programme a atteint sa capacité maximale. Contactez l'organisation partenaire
                pour plus d'informations.
              </p>
            ) : !campaign.isWithinWindow ? (
              <p className="text-center text-sm font-medium text-ink/60">
                Ce programme n'est pas actif pour le moment (période :{" "}
                {new Date(campaign.startDate).toLocaleDateString("fr-FR")} →{" "}
                {new Date(campaign.endDate).toLocaleDateString("fr-FR")}).
              </p>
            ) : sessionLoading ? (
              <div className="flex justify-center py-4">
                <GenizioLoader />
              </div>
            ) : !session ? (
              <div>
                <p className="text-sm text-ink/70 mb-4">
                  Connectez-vous pour inscrire votre enfant à ce programme.
                </p>
                <Link
                  to="/auth"
                  search={{ redirect: `/rejoindre/${campaignId}` }}
                  className="flex w-full items-center justify-center gap-3 rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm font-bold hover:bg-surface transition-colors"
                >
                  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
                    <path
                      fill="#FFC107"
                      d="M43.6 20.5H42V20H24v8h11.3C33.7 32.9 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z"
                    />
                    <path
                      fill="#FF3D00"
                      d="M6.3 14.7l6.6 4.8C14.6 15.6 18.9 12 24 12c3 0 5.8 1.1 7.9 3l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
                    />
                    <path
                      fill="#4CAF50"
                      d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 34.9 26.7 36 24 36c-5.3 0-9.7-3.1-11.3-7.6l-6.5 5C9.5 39.6 16.2 44 24 44z"
                    />
                    <path
                      fill="#1976D2"
                      d="M43.6 20.5H42V20H24v8h11.3c-.7 2-2 3.7-3.7 5l6.2 5.2C41 34.5 44 29.7 44 24c0-1.2-.1-2.3-.4-3.5z"
                    />
                  </svg>
                  Continuer avec Google
                </Link>
              </div>
            ) : loadingChildren ? (
              <div className="flex justify-center py-4">
                <GenizioLoader />
              </div>
            ) : children.length === 0 ? (
              <div className="text-center">
                <p className="text-sm text-ink/70 mb-4">
                  Créez d'abord le profil de votre enfant pour l'inscrire à ce programme.
                </p>
                <button
                  onClick={() => setIsCreatingProfile(true)}
                  className="inline-flex items-center justify-center gap-2 w-full rounded-2xl bg-ink py-3 text-sm font-bold text-white hover:bg-ink/90 transition-colors cursor-pointer"
                >
                  <Plus className="size-4" /> Créer le profil de mon enfant
                </button>
              </div>
            ) : (
              <div>
                <p className="text-xs font-bold uppercase tracking-wide text-ink/50 mb-2">
                  Quel enfant inscrire ?
                </p>
                <div className="space-y-2 mb-4">
                  {children.map((c) => (
                    <label
                      key={c.id}
                      className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 cursor-pointer transition-all ${
                        selectedChildId === c.id
                          ? "border-brand bg-brand/5"
                          : "border-ink/10 hover:border-ink/20"
                      }`}
                    >
                      <input
                        type="radio"
                        name="child"
                        checked={selectedChildId === c.id}
                        onChange={() => setSelectedChildId(c.id)}
                        className="accent-brand"
                      />
                      <span className="text-sm font-bold text-ink">
                        {c.name} <span className="text-ink/40 font-medium">({c.age} ans)</span>
                      </span>
                    </label>
                  ))}
                </div>
                <button
                  onClick={() => setIsCreatingProfile(true)}
                  className="text-xs font-bold text-brand hover:underline mb-4 cursor-pointer"
                >
                  + Ajouter un autre enfant
                </button>
                <button
                  onClick={handleEnroll}
                  disabled={isEnrolling || !selectedChildId}
                  className="w-full rounded-2xl bg-brand py-3.5 text-sm font-bold text-white shadow-md hover:bg-brand/90 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isEnrolling ? "Inscription…" : "Rejoindre le programme"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {isCreatingProfile && session && (
        <ProfileDialog
          initial={null}
          userId={session.user.id}
          onClose={() => setIsCreatingProfile(false)}
          onSaved={() => {
            setIsCreatingProfile(false);
            loadChildren();
          }}
        />
      )}
    </div>
  );
}
