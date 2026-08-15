import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/use-session";
import { toast } from "sonner";
import {
  getChildMentorInfo,
  listChildSessionsForFeedback,
  submitMentorFeedback,
} from "@/lib/mentors.functions";
import { getChildBilan, validateMentorReport } from "@/lib/mentor-reports.functions";
import { listMyNotifications, markNotificationsRead } from "@/lib/notifications.functions";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { AppTabBar } from "@/components/AppTabBar";
import { AppHeader } from "@/components/AppHeader";
import { GenizioLoader } from "@/components/GenizioLoader";
import {
  Users,
  FileText,
  Check,
  X,
  Download,
  Share2,
  Activity,
  Clock,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/profiles/$profileId/mentors")({
  component: MentorHubPage,
});

// Partage WhatsApp du bilan validé (décision #74) — message pré-rempli avec le résumé,
// même pattern que le WhatsAppFAB (WhatsApp-first du projet).
function buildBilanWhatsAppUrl(bilan: any, childName?: string | null): string {
  const phone = import.meta.env.VITE_WHATSAPP_NUMBER?.replace(/\D/g, "") ?? "33606433148";
  const text = [
    `📄 Bilan de fin — ${childName ?? "mon enfant"} (Génizio)`,
    bilan.realisations ? `\n✅ Réalisations : ${bilan.realisations}` : "",
    bilan.competences_observees
      ? `\n🌟 Compétences observées : ${bilan.competences_observees}`
      : "",
    bilan.recommandations ? `\n🔭 Recommandations : ${bilan.recommandations}` : "",
  ]
    .join("")
    .trim();
  return `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
}

type MentorInfo = {
  email: string;
  assignedAt: string;
  accompaniment: {
    funding: "pack" | "campaign" | "none";
    budget: number;
    campaignId: string | null;
  };
};

function MentorHubPage() {
  const { profileId } = Route.useParams();
  const { session, loading } = useSession();
  const navigate = useNavigate();

  const [childName, setChildName] = useState("");
  const [fetching, setFetching] = useState(true);

  // Mentor assigné + accompagnement (pack/campagne).
  const [mentorInfo, setMentorInfo] = useState<MentorInfo | null>(null);
  const mentorInfoFn = useServerFn(getChildMentorInfo);

  // Bilan de fin (décision #74) — le « bilan inclus » du pack, seule pièce à
  // validation explicite du parent.
  const [bilan, setBilan] = useState<any | null>(null);
  const [validatingBilan, setValidatingBilan] = useState(false);
  const [rejectingBilan, setRejectingBilan] = useState(false);
  const [bilanFeedback, setBilanFeedback] = useState("");
  const bilanFn = useServerFn(getChildBilan);
  const validateBilanFn = useServerFn(validateMentorReport);

  // Feedback famille (Vague C) : séances récentes de l'enfant + note 1-5 à poser.
  const [feedbackSessions, setFeedbackSessions] = useState<
    Array<{ id: string; occurred_at: string; rated: boolean; rating: number | null }>
  >([]);
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const feedbackFn = useServerFn(submitMentorFeedback);
  const listSessionsFn = useServerFn(listChildSessionsForFeedback);

  // Activité récente (canal pull + badge, décision #74).
  const [notifications, setNotifications] = useState<any[]>([]);
  const notificationsFn = useServerFn(listMyNotifications);
  const markReadFn = useServerFn(markNotificationsRead);

  const handleValidateBilan = async () => {
    if (!bilan) return;
    const ok = await confirmDialog({
      title: "Valider le bilan du mentor ?",
      description:
        "Ce bilan devient le livrable officiel de la période. Cette action débloque aussi la dernière séance du mois.",
      confirmLabel: "Valider le bilan",
      variant: "default",
    });
    if (!ok) return;
    setValidatingBilan(true);
    try {
      const res = await validateBilanFn({
        data: { reportId: bilan.id, decision: "validate" },
      });
      setBilan((res as any)?.report ?? null);
      toast.success("Bilan validé — merci !");
    } catch (err: any) {
      toast.error(err.message || "Impossible de valider le bilan.");
    } finally {
      setValidatingBilan(false);
    }
  };

  const handleRejectBilan = async () => {
    if (!bilan) return;
    setValidatingBilan(true);
    try {
      const res = await validateBilanFn({
        data: {
          reportId: bilan.id,
          decision: "reject",
          feedback: bilanFeedback.trim() || "Veuillez compléter le bilan.",
        },
      });
      setBilan((res as any)?.report ?? null);
      setRejectingBilan(false);
      setBilanFeedback("");
      toast.success("Le mentor est notifié des modifications à apporter.");
    } catch (err: any) {
      toast.error(err.message || "Impossible d'envoyer les corrections.");
    } finally {
      setValidatingBilan(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markReadFn({ data: { ids: [] } });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success("Toutes les notifications sont marquées comme lues.");
    } catch (err: any) {
      toast.error(err.message || "Erreur.");
    }
  };

  const userId = session?.user?.id;

  useEffect(() => {
    if (!loading && !session) navigate({ to: "/auth", replace: true });
  }, [session, loading, navigate]);

  useEffect(() => {
    if (!userId) return;
    setFetching(true);
    (async () => {
      try {
        const { data } = await supabase
          .from("child_profiles")
          .select("name")
          .eq("id", profileId)
          .eq("user_id", userId)
          .maybeSingle();
        setChildName(data?.name ?? "");

        const info = await mentorInfoFn({ data: { childId: profileId } });
        setMentorInfo(info);

        const b = await bilanFn({ data: { childId: profileId } });
        setBilan((b as any)?.report ?? null);

        const sessions = await listSessionsFn({ data: { childId: profileId } });
        setFeedbackSessions((sessions as any[]) ?? []);

        const notifs = await notificationsFn();
        const all = (notifs as any)?.notifications ?? [];
        setNotifications(all.filter((n: any) => n.child_profile_id === profileId));
      } catch (err) {
        console.error("Erreur de chargement du hub Mentor:", err);
      } finally {
        setFetching(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, profileId]);

  if (loading || !session || fetching) {
    return (
      <div className="grid min-h-dvh place-items-center bg-surface">
        <GenizioLoader label="Chargement…" />
      </div>
    );
  }

  const pendingNotifications = notifications.filter((n) => !n.read);
  const pendingFeedbackSession = feedbackSessions.find((s) => !s.rated);

  return (
    <div className="min-h-dvh bg-surface pb-24 text-ink">
      <AppHeader />
      <main className="mx-auto max-w-6xl px-6 py-10 md:flex">
        <AppTabBar profileId={profileId} />
        <div className="min-w-0 flex-1 space-y-8 animate-in fade-in duration-500">
          <div className="flex items-center gap-4">
            <div className="grid size-12 place-items-center rounded-2xl bg-brand text-white shadow-md shadow-brand/20">
              <Users className="size-6" />
            </div>
            <div>
              <h1 className="font-display text-balance text-3xl font-extrabold text-ink">
                Mentor
              </h1>
              <p className="mt-1 text-sm font-medium text-ink/60">
                {mentorInfo
                  ? `L'accompagnement de ${childName} — suivi, bilan et activités.`
                  : `L'accompagnement de ${childName} par un mentor.`}
              </p>
            </div>
          </div>

          {!mentorInfo ? (
            <div className="rounded-3xl border-2 border-dashed border-ink/10 bg-white p-8 text-center">
              <p className="font-display text-lg font-bold text-ink mb-2">
                Aucun mentor assigné pour l'instant
              </p>
              <p className="text-sm text-ink/60 max-w-md mx-auto leading-relaxed">
                Quand un mentor sera assigné pour accompagner {childName}, vous le verrez
                apparaître ici avec son bilan de fin de période et son activité.
              </p>
              <Link
                to="/profiles/$profileId/portfolio"
                params={{ profileId }}
                className="mt-5 inline-block rounded-xl border border-ink/10 bg-surface px-5 py-2 text-xs font-bold text-ink/70 hover:text-ink cursor-pointer"
              >
                Retour au Portfolio
              </Link>
            </div>
          ) : (
            <>
              {/* Mentor assigné + accompagnement */}
              <div className="rounded-3xl border border-sky-200 bg-sky-50/60 p-5 shadow-sm flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="grid size-11 place-items-center rounded-2xl bg-sky-600 text-white shrink-0">
                    <Users className="size-5" />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest text-sky-700">
                      Mentor assigné
                    </p>
                    <p className="text-sm font-bold text-ink mt-0.5">{mentorInfo.email}</p>
                    <p className="text-xs text-ink/50 mt-0.5">
                      Depuis le{" "}
                      {new Date(mentorInfo.assignedAt).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                </div>
                {mentorInfo.accompaniment.funding !== "none" && (
                  <div className="rounded-2xl border border-sky-200 bg-white px-4 py-2.5 text-xs font-bold text-ink/80">
                    {mentorInfo.accompaniment.funding === "pack"
                      ? `🎒 Pack Accompagnement — ${mentorInfo.accompaniment.budget} séances incluses`
                      : `🏕️ Campagne — ${mentorInfo.accompaniment.budget} séances incluses`}
                  </div>
                )}
              </div>

              {/* Bilan de fin du mentor (décision #74) — le « bilan inclus » du pack :
                  seule pièce à validation EXPLICITE du parent. Le parent valide, demande des
                  modifications, télécharge le PDF et partage. */}
              {bilan && (
                <div className="rounded-3xl border border-emerald-200 bg-emerald-50/50 p-5 shadow-sm space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="grid size-11 place-items-center rounded-2xl bg-emerald-600 text-white shrink-0">
                        <FileText className="size-5" />
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-emerald-700">
                          Bilan du mentor
                        </p>
                        <p className="text-xs text-ink/50 mt-0.5">
                          Période du {new Date(bilan.period_start).toLocaleDateString("fr-FR")}{" "}
                          au {new Date(bilan.period_end).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest border border-ink/10 ${
                        bilan.status === "validated"
                          ? "bg-emerald-100 text-emerald-800"
                          : bilan.status === "submitted"
                            ? "bg-amber-100 text-amber-800"
                            : bilan.status === "rejected"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-surface text-ink/60"
                      }`}
                    >
                      {bilan.status === "validated"
                        ? "✅ Validé"
                        : bilan.status === "submitted"
                          ? "⏳ À valider"
                          : bilan.status === "rejected"
                            ? "↩️ Modifications demandées"
                            : "📝 Brouillon"}
                    </span>
                  </div>

                  {bilan.status === "rejected" && bilan.parent_feedback && (
                    <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
                      <p className="text-xs font-black uppercase tracking-wider mb-1 text-rose-800">
                        Vos demandes de modifications
                      </p>
                      {bilan.parent_feedback}
                    </div>
                  )}

                  {bilan.status === "submitted" ? (
                    <div className="space-y-3">
                      <p className="text-sm text-ink/70">
                        Le mentor a soumis le bilan de fin de période. Validez-le pour en faire
                        le livrable officiel (il débloque aussi la dernière séance du mois).
                      </p>
                      {rejectingBilan ? (
                        <div className="rounded-2xl border border-ink/10 bg-white p-4 space-y-3">
                          <p className="text-xs font-black uppercase tracking-widest text-ink/60">
                            Que doit corriger le mentor ?
                          </p>
                          <textarea
                            value={bilanFeedback}
                            onChange={(e) => setBilanFeedback(e.target.value)}
                            rows={3}
                            maxLength={2000}
                            placeholder="Ex. : précisez les compétences observées en séance…"
                            className="w-full rounded-xl border border-ink/10 bg-surface px-4 py-3 text-sm font-medium text-ink outline-none focus:ring-2 focus:ring-brand"
                          />
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() => setRejectingBilan(false)}
                              className="rounded-xl border border-ink/10 px-4 py-2 text-xs font-bold text-ink/60 hover:bg-stone-100 cursor-pointer"
                            >
                              Annuler
                            </button>
                            <button
                              onClick={() => handleRejectBilan()}
                              disabled={validatingBilan}
                              className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-black text-white hover:bg-rose-700 disabled:opacity-50 cursor-pointer"
                            >
                              {validatingBilan ? "Envoi…" : "Envoyer les corrections"}
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => handleValidateBilan()}
                            disabled={validatingBilan}
                            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white shadow-sm hover:-translate-y-0.5 transition-all disabled:opacity-50 cursor-pointer"
                          >
                            <Check className="size-4" />
                            Valider le bilan
                          </button>
                          <button
                            onClick={() => setRejectingBilan(true)}
                            disabled={validatingBilan}
                            className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-black text-rose-700 hover:bg-rose-100 disabled:opacity-50 cursor-pointer"
                          >
                            <X className="size-4" />
                            Demander des modifications
                          </button>
                        </div>
                      )}
                    </div>
                  ) : bilan.status === "draft" ? (
                    <p className="text-sm text-ink/60 italic">
                      Le mentor rédige actuellement le bilan de la période.
                    </p>
                  ) : (
                    bilan.status === "validated" && (
                      <div className="space-y-3">
                        {[
                          ["Réalisations", bilan.realisations],
                          ["Compétences observées", bilan.competences_observees],
                          ["Recommandations", bilan.recommandations],
                        ].map(([label, content]) =>
                          content ? (
                            <div key={label as string}>
                              <p className="text-xs font-black uppercase tracking-widest text-ink/60 mb-1">
                                {label}
                              </p>
                              <p className="text-sm text-ink/80 leading-relaxed whitespace-pre-wrap">
                                {content}
                              </p>
                            </div>
                          ) : null,
                        )}
                        <div className="flex flex-wrap gap-2 pt-2">
                          <Link
                            to="/profiles/$profileId/bilan-print"
                            params={{ profileId }}
                            target="_blank"
                            className="inline-flex items-center gap-2 rounded-xl bg-ink px-4 py-2.5 text-xs font-black text-white shadow-sm hover:-translate-y-0.5 transition-all"
                          >
                            <Download className="size-4" />
                            Télécharger le PDF
                          </Link>
                          <a
                            href={buildBilanWhatsAppUrl(bilan, childName)}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-xl border border-ink/10 bg-white px-4 py-2.5 text-xs font-black text-ink hover:bg-stone-100 transition-all"
                          >
                            <Share2 className="size-4" />
                            Partager sur WhatsApp
                          </a>
                        </div>
                      </div>
                    )
                  )}
                </div>
              )}

              {/* Feedback famille (Vague C) : noter la dernière séance de suivi — composante
                  25% du score mentor (V2). Widget discret, seulement si une séance
                  non notée existe. */}
              {pendingFeedbackSession && (
                <div className="rounded-3xl border border-ink/10 bg-white p-5 shadow-sm">
                  <p className="text-xs font-black uppercase tracking-widest text-ink/70">
                    Comment s'est passée la séance du{" "}
                    {new Date(pendingFeedbackSession.occurred_at).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                    })}{" "}
                    ?
                  </p>
                  <p className="mt-1 text-xs text-ink/60">
                    Votre note aide à valoriser les bons mentors et à repérer ceux qui manquent
                    de sérieux.
                  </p>
                  <div className="mt-3 flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setFeedbackRating(n)}
                        className={`text-2xl transition-all cursor-pointer ${
                          n <= feedbackRating
                            ? "text-amber-400"
                            : "text-ink/15 hover:text-amber-200"
                        }`}
                        aria-label={`${n} étoiles`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <input
                    value={feedbackComment}
                    onChange={(e) => setFeedbackComment(e.target.value)}
                    placeholder="Un commentaire (optionnel)…"
                    maxLength={500}
                    className="mt-3 w-full rounded-xl border border-ink/10 bg-surface px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand"
                  />
                  <button
                    onClick={async () => {
                      setSubmittingFeedback(true);
                      try {
                        await feedbackFn({
                          data: {
                            sessionId: pendingFeedbackSession.id,
                            rating: feedbackRating,
                            comment: feedbackComment.trim() || undefined,
                          },
                        });
                        toast.success("Merci ! Votre note est enregistrée.");
                        setFeedbackComment("");
                        const refreshed = await listSessionsFn({
                          data: { childId: profileId },
                        });
                        setFeedbackSessions((refreshed as any[]) ?? []);
                      } catch (err: any) {
                        toast.error(err.message || "Erreur lors de l'envoi.");
                      } finally {
                        setSubmittingFeedback(false);
                      }
                    }}
                    disabled={submittingFeedback}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-black text-white shadow-sm hover:-translate-y-0.5 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    <Sparkles className="size-4" />
                    {submittingFeedback ? "Envoi…" : "Envoyer ma note"}
                  </button>
                </div>
              )}

              {/* Activité récente du mentor (canal pull + badge, décision #74) */}
              <div className="rounded-3xl border border-ink/10 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3 mb-3">
                  <p className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-ink/70">
                    <Activity className="size-4 text-brand" />
                    Activité récente du mentor
                  </p>
                  {pendingNotifications.length > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="text-[10px] font-black text-brand hover:underline cursor-pointer"
                    >
                      Tout marquer lu
                    </button>
                  )}
                </div>
                {notifications.length === 0 ? (
                  <p className="text-sm text-ink/50 italic py-4 text-center">
                    Aucune activité récente.
                  </p>
                ) : (
                  <ul className="space-y-2 max-h-72 overflow-y-auto">
                    {notifications.map((n) => (
                      <li
                        key={n.id}
                        className={`rounded-xl border px-3 py-2 text-xs ${
                          n.read
                            ? "border-ink/10 bg-surface text-ink/60"
                            : "border-sky-200 bg-sky-50 text-ink"
                        }`}
                      >
                        {n.type === "mentor_challenge_completed"
                          ? `🎉 ${n.payload?.title ?? "Un défi"} complété par le mentor`
                          : n.type === "mentor_abandon"
                            ? `❌ ${n.payload?.title ?? "Un défi"} marqué non réussi par le mentor`
                            : n.type === "mentor_bilan_submitted"
                              ? `📄 Bilan soumis par le mentor`
                              : n.type === "mentor_bilan_validated"
                                ? `✅ Bilan validé par le parent`
                                : n.type === "mentor_bilan_rejected"
                                  ? `↩️ Bilan renvoyé au mentor`
                                  : `🔔 ${n.type}`}
                        <span className="block text-[10px] font-bold text-ink/40 mt-0.5">
                          {new Date(n.created_at).toLocaleString("fr-FR")}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}

          <div className="flex items-center gap-2 text-xs text-ink/50">
            <Clock className="size-4" />
            <span>
              Ce hub centralise le suivi de l'accompagnement : mentor, bilan de fin de période
              et activité.
            </span>
          </div>
        </div>
      </main>
    </div>
  );
}
