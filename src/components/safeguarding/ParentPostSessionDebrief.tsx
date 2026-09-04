import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createChildSafetyReport } from "@/lib/safeguarding.functions";
import {
  MessageCircleQuestion,
  Star,
  AlertTriangle,
  Heart,
  X,
  ShieldAlert,
  Loader2,
  PhoneCall,
} from "lucide-react";
import { toast } from "sonner";

type ParentPostSessionDebriefProps = {
  childId: string;
  childName: string;
  mentorUserId?: string;
  mentorName?: string;
};

export function ParentPostSessionDebrief({
  childId,
  childName,
  mentorUserId,
  mentorName = "son mentor",
}: ParentPostSessionDebriefProps) {
  const [dismissed, setDismissed] = useState(false);
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [category, setCategory] = useState<
    | "harassment"
    | "verbal_abuse"
    | "excessive_stress"
    | "unauthorized_contact"
    | "unpunctuality_fraud"
    | "other"
  >("excessive_stress");
  const [severity, setSeverity] = useState<"low" | "medium" | "high" | "critical">("high");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reportFn = useServerFn(createChildSafetyReport);

  if (dismissed || !mentorUserId) return null;

  const handlePositiveFeedback = () => {
    toast.success(`Merci pour votre retour ! Ravi que tout se soit bien passé pour ${childName}.`);
    setDismissed(true);
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setSubmitting(true);
    try {
      await reportFn({
        data: {
          childId,
          accusedMentorUserId: mentorUserId,
          category,
          severity,
          description: description.trim(),
        },
      });
      toast.success(
        "Votre alerte a été transmise en priorité à l'équipe de protection Génizio Care.",
      );
      setIsReportOpen(false);
      setDismissed(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erreur lors de la transmission de l'alerte.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-50/70 to-orange-50/50 p-5 shadow-sm space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="grid size-9 place-items-center rounded-2xl bg-amber-500 text-white shadow-xs shrink-0">
              <MessageCircleQuestion className="size-5" />
            </div>
            <div>
              <p className="font-display font-black text-xs uppercase tracking-wider text-amber-900">
                Moment d'échange avec {childName}
              </p>
              <p className="text-xs text-ink/75 font-medium mt-0.5 leading-snug">
                Séance animée par {mentorName}. Prenez 1 minute pour lui demander : comment s'est
                passée la séance et la bienveillance du mentor ?
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-ink/40 hover:text-ink/70 p-1 rounded-full cursor-pointer"
            title="Ignorer pour l'instant"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handlePositiveFeedback}
            className="flex-1 py-2 px-3 rounded-xl bg-white hover:bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <span>🌟 Tout s'est très bien passé</span>
          </button>
          <button
            type="button"
            onClick={() => setIsReportOpen(true)}
            className="flex-1 py-2 px-3 rounded-xl bg-white hover:bg-rose-50 border border-rose-200 text-rose-800 font-bold text-xs flex items-center justify-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
          >
            <AlertTriangle className="size-3.5 text-rose-600" />
            <span>Quelque chose ne va pas</span>
          </button>
        </div>
      </div>

      {/* Modal de signalement et d'écoute confidentielle */}
      {isReportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between border-b border-ink/5 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="grid size-10 place-items-center rounded-2xl bg-rose-600 text-white shrink-0">
                  <ShieldAlert className="size-5" />
                </div>
                <div>
                  <h3 className="font-display font-black text-lg text-ink">
                    Écoute & Protection Génizio Care
                  </h3>
                  <p className="text-xs text-ink/60 font-semibold">
                    Concernant {childName} et le mentor {mentorName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsReportOpen(false)}
                className="grid size-8 place-items-center rounded-full hover:bg-ink/5 text-ink/60 cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <p className="text-xs text-ink/75 leading-relaxed bg-surface p-3 rounded-2xl border border-ink/5 font-medium">
              Votre enfant a-t-il manifesté de la tristesse, du stress excessif, ou un comportement
              inapproprié du mentor ? Notre équipe traite ce signalement en priorité absolue et avec
              une stricte confidentialité.
            </p>

            <form onSubmit={handleReportSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-ink mb-1">Motif principal :</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full rounded-xl border border-ink/10 p-2.5 font-medium text-ink outline-none cursor-pointer"
                >
                  <option value="excessive_stress">Pression anxiogène / Enfant stressé ou en pleurs</option>
                  <option value="verbal_abuse">Agressivité verbale / Propos rabaissants</option>
                  <option value="harassment">Harcèlement / Gestes ou propos ambigus</option>
                  <option value="unauthorized_contact">Tentative de contact privé hors plateforme</option>
                  <option value="unpunctuality_fraud">Absences répétées / Séances non honorées</option>
                  <option value="other">Autre motif d'inconfort</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-ink mb-1">
                  Ce que votre enfant ou vous avez observé :
                </label>
                <textarea
                  required
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Décrivez ce que l'enfant a partagé ou ce que vous avez ressenti..."
                  className="w-full rounded-xl border border-ink/10 p-3 text-ink outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsReportOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-surface hover:bg-ink/5 font-bold text-ink cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 font-bold text-white flex items-center justify-center gap-1.5 shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {submitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <ShieldAlert className="size-4" />
                  )}
                  <span>Transmettre l'alerte</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
