import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { deleteAccountAndData } from "@/lib/account.functions";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
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
import { toast } from "sonner";

export function DeleteAccountDialog() {
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  
  const deleteFn = useServerFn(deleteAccountAndData);
  const navigate = useNavigate();

  const handleDelete = async () => {
    if (confirmText !== "SUPPRIMER") return;
    setDeleting(true);
    
    try {
      await deleteFn();
      await supabase.auth.signOut();
      toast.success("Votre compte a été supprimé.");
      navigate({ to: "/", replace: true });
    } catch (e) {
      toast.error("Une erreur est survenue.");
      setDeleting(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(val) => {
      setOpen(val);
      if (!val) setConfirmText("");
    }}>
      <AlertDialogTrigger asChild>
        <button className="flex w-full items-center justify-between rounded-2xl border border-red-100 bg-red-50/50 p-4 hover:bg-red-50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-red-100 text-red-600">
              <Trash2 className="size-5" />
            </div>
            <div className="text-left">
              <p className="text-sm font-bold text-red-700">Supprimer mon compte</p>
              <p className="text-[11px] text-red-600/70">Efface de façon permanente toutes vos données.</p>
            </div>
          </div>
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent className="rounded-3xl max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="size-5" />
            Supprimer le compte
          </AlertDialogTitle>
          <AlertDialogDescription className="text-ink/70">
            Cette action est <strong>irréversible</strong>. Toutes les données liées à ce compte, y compris les profils d'enfants, l'historique des défis et les accès mentors, seront supprimées.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="my-4 space-y-2">
          <label className="text-sm font-bold text-ink">
            Veuillez taper <strong>SUPPRIMER</strong> pour confirmer :
          </label>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="SUPPRIMER"
            className="w-full rounded-xl border border-red-200 px-4 py-2 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
          />
        </div>

        <AlertDialogFooter className="flex-row gap-2 sm:space-x-0">
          <AlertDialogCancel className="flex-1 mt-0 rounded-xl">Annuler</AlertDialogCancel>
          <AlertDialogAction
            onClick={(e) => {
              e.preventDefault();
              handleDelete();
            }}
            disabled={confirmText !== "SUPPRIMER" || deleting}
            className="flex-1 rounded-xl bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? <Loader2 className="size-4 animate-spin" /> : "Supprimer"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
