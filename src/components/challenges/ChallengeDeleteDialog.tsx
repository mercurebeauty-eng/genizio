// ChallengeDeleteDialog — suppression différenciée (Décision #58).
// Deux modes selon le statut du défi :
// - TERMINÉ : modal danger + saisie du titre complet pour confirmer (le risque
//   réel est de supprimer la mauvaise chose — la confirmation porte sur QUOI on
//   supprime, pas seulement sur le fait de confirmer). L'XP déjà crédité n'est
//   pas révoqué, la ligne est masquée (soft-delete), la preuve reste archivée.
// - NON TERMINÉ : suppression légère — chips de raison en 1 tap (le signal
//   alimente le Loup, Décision #58) + note libre optionnelle + « Sans raison ».
import { useEffect, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export type ChallengeDeletePayload = { reason?: string; note?: string };

/** Chips de raison (1 tap = suppression immédiate) — vocabulaire Décision #58. */
const REASON_CHIPS: { code: string; label: string }[] = [
  { code: "pas_le_bon_moment", label: "Pas le bon moment" },
  { code: "deja_fait_autrement", label: "Déjà fait autrement" },
  { code: "pas_interesse", label: "Pas intéressé·e" },
  { code: "doublon", label: "Doublon" },
];

export function ChallengeDeleteDialog({
  challenge,
  open,
  deleting,
  onClose,
  onDelete,
}: {
  challenge: { id: string; title: string; status: string } | null;
  open: boolean;
  deleting: boolean;
  onClose: () => void;
  onDelete: (payload: ChallengeDeletePayload) => void;
}) {
  const [confirmText, setConfirmText] = useState("");
  const [note, setNote] = useState("");

  const completed = challenge?.status === "completed";
  const titleMatch =
    !!challenge && confirmText.trim().toLowerCase() === challenge.title.trim().toLowerCase();
  const canConfirm = !completed || titleMatch;

  useEffect(() => {
    if (!open) {
      setConfirmText("");
      setNote("");
    }
  }, [open]);

  return (
    <AlertDialog
      open={open}
      onOpenChange={(v) => {
        if (!v && !deleting) onClose();
      }}
    >
      <AlertDialogContent className="rounded-3xl max-w-sm border border-ink/10 shadow-xl">
        <AlertDialogHeader>
          <AlertDialogTitle
            className={`flex items-center gap-2 ${completed ? "text-red-600" : "text-ink"}`}
          >
            <AlertTriangle className="size-5" />
            {completed ? "Supprimer ce défi terminé ?" : "Retirer ce défi ?"}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-ink/70">
            {completed ? (
              <span className="block space-y-2">
                <span className="block rounded-xl border border-ink/10 bg-surface/40 px-3 py-2 font-mono text-xs font-bold text-ink">
                  {challenge?.title}
                </span>
                <span className="block">
                  Cette action retire le défi de l'historique. La preuve et l'observation IA restent
                  archivées ; l'XP déjà obtenu n'est pas révoqué.
                </span>
              </span>
            ) : (
              <span>
                Pourquoi retirer «&nbsp;{challenge?.title}&nbsp;» ? Ce signal aide Naya à mieux
                choisir les prochains défis.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {completed ? (
          <div className="my-2 space-y-2">
            <label className="text-sm font-bold text-ink">
              Tape le titre du défi pour confirmer :
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={challenge?.title ?? ""}
              disabled={deleting}
              className="w-full rounded-xl border border-ink/10 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-red-500 shadow-sm"
            />
          </div>
        ) : (
          <div className="my-2 space-y-2">
            <div className="flex flex-wrap gap-2">
              {REASON_CHIPS.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  disabled={deleting}
                  onClick={() => onDelete({ reason: c.code, note: note.trim() || undefined })}
                  className="rounded-full border border-ink/10 bg-white px-3 py-1.5 text-xs font-bold text-ink hover:bg-surface transition-colors cursor-pointer disabled:opacity-50"
                >
                  {c.label}
                </button>
              ))}
              <button
                type="button"
                disabled={deleting}
                onClick={() => onDelete({ note: note.trim() || undefined })}
                className="rounded-full border border-ink/10 bg-surface px-3 py-1.5 text-xs font-bold text-ink/60 hover:bg-white transition-colors cursor-pointer disabled:opacity-50"
              >
                Sans raison
              </button>
            </div>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note optionnelle (ex. trop difficile pour l'âge, déjà fait ailleurs…)"
              disabled={deleting}
              rows={2}
              className="w-full rounded-xl border border-ink/10 px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-brand shadow-sm resize-none"
            />
          </div>
        )}

        <AlertDialogFooter className="flex-row gap-2 sm:space-x-0">
          <AlertDialogCancel
            disabled={deleting}
            className="flex-1 mt-0 rounded-xl border border-ink/10 shadow-sm"
          >
            Annuler
          </AlertDialogCancel>
          {completed ? (
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (canConfirm && !deleting) onDelete({});
              }}
              disabled={!canConfirm || deleting}
              className="press-destructive flex-1 rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              {deleting ? <Loader2 className="size-4 animate-spin" /> : "Supprimer"}
            </AlertDialogAction>
          ) : null}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
