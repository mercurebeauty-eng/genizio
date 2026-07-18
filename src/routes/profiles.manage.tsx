import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { AppHeader } from "@/components/AppHeader";
import { ProfileCard } from "@/components/profiles/ProfileCard";
import { ProfileDialog } from "@/components/profiles/ProfileDialog";
import type { ChildProfile } from "@/components/profiles/shared";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { Lock, Phone } from "lucide-react";

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

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [session, loading, navigate]);

  useEffect(() => {
    // See profiles.index.tsx: extra_profile_slots lives in the session
    // JWT's app_metadata, cached client-side. Refresh once on mount so a
    // recently-granted slot is reflected before the quota gate below runs.
    // Gated on an existing session so logged-out visitors don't pay this
    // network call.
    if (session) void supabase.auth.refreshSession();
  }, [session]);

  const refetch = async () => {
    if (!session) return;
    setFetching(true);
    const { data } = await supabase
      .from("child_profiles")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });
    setProfiles((data ?? []) as ChildProfile[]);
    setFetching(false);
  };

  useEffect(() => {
    if (session) void refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const remove = async (id: string) => {
    if (!(await confirmDialog({
      title: "Supprimer ce profil ?",
      description: "Cette action est irréversible et supprimera aussi tout l'historique de défis associé.",
      confirmLabel: "Supprimer",
      variant: "danger",
    }))) return;
    await supabase.from("child_profiles").delete().eq("id", id);
    void refetch();
  };

  if (loading || !session) {
    return (
      <div className="grid min-h-screen place-items-center bg-surface text-ink/60">
        Chargement…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface text-ink">
      <AppHeader />

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h1 className="font-display text-4xl font-extrabold md:text-5xl">Mes profils enfants</h1>
            <p className="mt-2 text-ink/60">
              Sauvegardez le questionnaire de chaque enfant pour retrouver ses défis en un clic.
            </p>
          </div>
          {(() => {
            const FREE_SLOTS = 2;
            const extraSlots = (session?.user?.app_metadata?.extra_profile_slots as number) ?? 0;
            const quota = FREE_SLOTS + extraSlots;
            const atQuota = profiles.length >= quota;
            return (
              <button
                onClick={() => atQuota ? setShowUpgradeModal(true) : setEditing("new")}
                className={`rounded-2xl border-[3px] border-ink px-6 py-3 text-sm font-bold shadow-brutal hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all flex items-center gap-2 ${
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
          <p className="text-ink/60">Chargement…</p>
        ) : profiles.length === 0 ? (
          <div className="rounded-3xl border-[3px] border-dashed border-ink bg-white/40 p-12 text-center shadow-brutal-sm">
            <p className="text-ink/60">Aucun profil pour l'instant. Créez le premier.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {profiles.map((p) => (
              <ProfileCard key={p.id} profile={p} onEdit={() => setEditing(p)} onDelete={() => remove(p.id)} />
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
        <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-ink/70 p-4 backdrop-blur-sm" onClick={() => setShowUpgradeModal(false)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-3xl border-[3px] border-ink bg-white p-8 shadow-brutal">
            <div className="mb-6 flex items-start gap-4">
              <div className="grid size-14 shrink-0 place-items-center rounded-2xl border-[3px] border-ink bg-amber-100 text-3xl shadow-brutal-sm">🔒</div>
              <div>
                <h2 className="font-display text-2xl font-extrabold text-ink">Quota gratuit atteint</h2>
                <p className="mt-1 text-sm text-ink/60">Vous avez {profiles.length} profils enregistrés.</p>
              </div>
            </div>
            <div className="mb-6 rounded-2xl border-[3px] border-ink bg-surface p-5 shadow-brutal-sm">
              <p className="text-xs font-black uppercase tracking-widest text-ink/60 mb-1">Profil supplémentaire</p>
              <p className="font-display text-3xl font-black text-ink">5 000 <span className="text-lg text-ink/60">FCFA</span></p>
              <p className="mt-2 text-xs text-ink/60 leading-relaxed">Débloqué manuellement après confirmation du paiement. Accès permanent.</p>
            </div>
            <a
              href={`https://wa.me/${import.meta.env.VITE_WHATSAPP_NUMBER || "33606433148"}?text=${encodeURIComponent(
                `Bonjour, je souhaite débloquer un profil supplémentaire sur Génizio.\nCompte : ${session?.user?.email}\nMontant : 5 000 FCFA`
              )}`}
              target="_blank" rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2.5 rounded-2xl border-[3px] border-ink bg-[#25D366] py-3.5 font-bold text-sm text-white shadow-brutal hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all"
            >
              <Phone className="size-4 fill-white" />
              Contacter l'administrateur sur WhatsApp
            </a>
            <button onClick={() => setShowUpgradeModal(false)} className="mt-3 w-full py-2 text-center text-xs font-bold text-ink/60 hover:text-ink transition-all">Fermer</button>
          </div>
        </div>
      )}
    </div>
  );
}
