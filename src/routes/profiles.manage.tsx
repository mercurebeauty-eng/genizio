import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { isMentorMode } from "@/lib/mentor-mode";
import { useFamilyCoverage } from "@/hooks/use-family-coverage";
import { AccessUpgradeModal } from "@/components/settings/AccessUpgradeModal";
import { AppHeader } from "@/components/AppHeader";
import { ProfileCard } from "@/components/profiles/ProfileCard";
import { ProfileDialog } from "@/components/profiles/ProfileDialog";
import { GenizioLoader } from "@/components/GenizioLoader";
import type { ChildProfile } from "@/components/profiles/shared";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { ArrowLeft, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";

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

  // Limite de CRÉATION (V4, Vague A) : calculée côté serveur depuis family_coverages
  // (creationLimit, miroir du trigger V10 — migration 20260814200000). familyCovered/
  // campaignCovered/coveredUntil restent pour la modale AccessUpgradeModal.
  const {
    creationLimit: quota,
    covered: familyCovered,
    campaignCovered,
    coveredUntil,
  } = useFamilyCoverage();

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [session, loading, navigate]);

  // Univers Mentor (décision #81) : le mentor ne crée ni ne gère les profils —
  // il est le remplaçant du parent, pas le propriétaire. Redirection vers l'accueil.
  const mentorMode = isMentorMode(session);
  useEffect(() => {
    if (mentorMode) navigate({ to: "/profiles", replace: true });
  }, [mentorMode, navigate]);

  // Note (2026-08-14) : le refresh unique du token (claims quota_override)
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

        <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="font-display text-balance text-4xl font-extrabold md:text-5xl">
              Mes profils enfants
            </h1>
            <p className="mt-2 text-ink/60">
              Sauvegardez le questionnaire de chaque enfant pour retrouver ses défis en un clic.
            </p>
          </div>
          {(() => {
            // La limite de création vient du serveur (creationLimit, miroir du trigger V10)
            // — le bouton bascule entre « + Nouveau profil » et « Couverture atteinte ».
            const atQuota = profiles.length >= quota;
            return (
              <button
                onClick={() => (atQuota ? setShowUpgradeModal(true) : setEditing("new"))}
                className={`rounded-2xl border border-ink/10 px-6 py-3 text-sm font-bold shadow-xl hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all flex items-center gap-2 ${
                  atQuota ? "bg-amber-100 text-amber-800" : "bg-brand text-white"
                }`}
              >
                {atQuota && <Lock className="size-4" />}
                {atQuota ? "Couverture atteinte" : "+ Nouveau profil"}
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
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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

      {/* ── Modale « Accès & Accompagnement » (V1) — composant partagé avec profiles.index
            (avant : 2 copies dupliquées de « Quota gratuit atteint »). */}
      {showUpgradeModal && (
        <AccessUpgradeModal
          profileCount={profiles.length}
          familyCovered={familyCovered}
          campaignCovered={campaignCovered}
          coveredUntil={coveredUntil}
          creationLimit={quota}
          children={profiles}
          onClose={() => setShowUpgradeModal(false)}
        />
      )}
    </div>
  );
}
