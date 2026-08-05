import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { revokeMentorAccess } from "@/lib/mentors.functions";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { ShieldAlert, Trash2, Loader2, Copy, Check } from "lucide-react";
import { toast } from "sonner";

export function MentorGrantsTable({ childId }: { childId: string }) {
  const [mentors, setMentors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const revokeFn = useServerFn(revokeMentorAccess);

  const loadMentors = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("child_mentors")
      .select("*")
      .eq("child_id", childId)
      .order("created_at", { ascending: false });

    setMentors(data || []);
    setLoading(false);
  };

  useEffect(() => {
    loadMentors();
  }, [childId]);

  const handleRevoke = async (mentorId: string) => {
    setRevoking(mentorId);
    try {
      await revokeFn({ data: { mentorId, childId } });
      toast.success("Accès révoqué avec succès");
      loadMentors();
    } catch (e) {
      toast.error("Impossible de révoquer l'accès");
    } finally {
      setRevoking(null);
    }
  };

  const copyLink = (token: string, id: string) => {
    const appUrl = typeof window !== "undefined" ? window.location.origin : "http://localhost:5173";
    navigator.clipboard.writeText(`${appUrl}/s/${token}`);
    setCopiedId(id);
    toast.success("Lien copié !");
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <div className="py-8 flex justify-center">
        <Loader2 className="size-6 animate-spin text-brand/50" />
      </div>
    );
  }

  if (mentors.length === 0) {
    return (
      <div className="rounded-3xl border border-ink/10 bg-white p-8 text-center shadow-xl">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border-2 border-ink bg-brand/10 text-brand mb-3">
          <ShieldAlert className="size-6" />
        </div>
        <p className="text-ink/60 text-sm">Aucun mentor n'a accès au profil pour le moment.</p>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-ink/10 bg-white shadow-xl overflow-hidden">
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto">
        <Table>
          <TableHeader className="bg-surface">
            <TableRow>
              <TableHead className="font-bold text-ink">Mentor</TableHead>
              <TableHead className="font-bold text-ink">Permissions</TableHead>
              <TableHead className="font-bold text-ink">Statut</TableHead>
              <TableHead className="font-bold text-ink text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mentors.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium">
                  {m.mentor_name}
                  <div className="text-[10px] text-ink/60 mt-1">
                    Créé le {new Date(m.created_at).toLocaleDateString()}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {m.can_view_talent_map && (
                      <span className="rounded bg-brand/10 px-2 py-0.5 text-[10px] font-bold text-brand uppercase">
                        Talents
                      </span>
                    )}
                    {m.can_view_timeline && (
                      <span className="rounded bg-sky/10 px-2 py-0.5 text-[10px] font-bold text-sky-700 uppercase">
                        Journal
                      </span>
                    )}
                    {m.can_view_raw_observations && (
                      <span className="rounded bg-leaf/10 px-2 py-0.5 text-[10px] font-bold text-leaf-700 uppercase">
                        Notes privées
                      </span>
                    )}
                    {m.scope_domains?.length > 0 && (
                      <span className="rounded bg-ink/5 px-2 py-0.5 text-[10px] font-bold text-ink/60 uppercase">
                        {m.scope_domains.length} domaines
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {m.status === "active" ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-leaf px-2.5 py-1 text-xs font-bold text-white">
                      <div className="size-1.5 rounded-full bg-white"></div>
                      Actif
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-[#FF5A5F] px-2.5 py-1 text-xs font-bold text-white">
                      <div className="size-1.5 rounded-full bg-white"></div>
                      Révoqué
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {m.status === "active" && (
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => copyLink(m.access_token, m.id)}
                        className="p-2 border-2 border-ink rounded-lg text-ink/60 hover:-translate-y-0.5 transition-all"
                        title="Copier le lien"
                      >
                        {copiedId === m.id ? (
                          <Check className="size-4 text-emerald-600" />
                        ) : (
                          <Copy className="size-4" />
                        )}
                      </button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <button
                            className="p-2 border-2 border-ink rounded-lg text-red-500 hover:-translate-y-0.5 transition-all"
                            title="Révoquer"
                          >
                            {revoking === m.id ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Trash2 className="size-4" />
                            )}
                          </button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="rounded-3xl border border-ink/10 shadow-xl">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Révoquer l'accès ?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Le lien de {m.mentor_name} cessera de fonctionner immédiatement. Cette
                              action est irréversible.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-xl border border-ink/10 shadow-sm">
                              Annuler
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRevoke(m.id)}
                              className="press-destructive bg-red-600 hover:bg-red-700 text-white rounded-xl"
                            >
                              Oui, révoquer
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Mobile stacked cards */}
      <div className="md:hidden flex flex-col divide-y divide-ink/5">
        {mentors.map((m) => (
          <div key={m.id} className="p-4 space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-bold text-ink">{m.mentor_name}</h4>
                <p className="text-xs text-ink/60">
                  Le {new Date(m.created_at).toLocaleDateString()}
                </p>
              </div>
              {m.status === "active" ? (
                <span className="rounded-full border-2 border-ink bg-leaf px-2 py-0.5 text-[10px] font-bold text-white">
                  Actif
                </span>
              ) : (
                <span className="rounded-full border-2 border-ink bg-[#FF5A5F] px-2 py-0.5 text-[10px] font-bold text-white">
                  Révoqué
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-1">
              {m.can_view_talent_map && (
                <span className="rounded bg-brand/10 px-2 py-0.5 text-[10px] font-bold text-brand uppercase">
                  Talents
                </span>
              )}
              {m.can_view_timeline && (
                <span className="rounded bg-sky/10 px-2 py-0.5 text-[10px] font-bold text-sky-700 uppercase">
                  Journal
                </span>
              )}
            </div>

            {m.status === "active" && (
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => copyLink(m.access_token, m.id)}
                  className="press-white flex-1 flex items-center justify-center gap-2 rounded-xl border border-ink/10 py-2 text-xs font-bold text-ink"
                >
                  {copiedId === m.id ? (
                    <Check className="size-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                  Lien
                </button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="press-destructive flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#FF5A5F] py-2 text-xs font-bold text-white">
                      {revoking === m.id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="size-3.5" />
                      )}
                      Révoquer
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-3xl w-[90%] max-w-sm border border-ink/10 shadow-xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Révoquer l'accès ?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Le lien cessera de fonctionner immédiatement.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex-row gap-2 sm:space-x-0">
                      <AlertDialogCancel className="flex-1 rounded-xl mt-0 border border-ink/10 shadow-sm">
                        Annuler
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleRevoke(m.id)}
                        className="press-destructive flex-1 bg-red-600 hover:bg-red-700 rounded-xl"
                      >
                        Révoquer
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
