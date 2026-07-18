import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { inviteMentor } from "@/lib/mentors.functions";
import { supabase } from "@/integrations/supabase/client";
import { confirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Loader2, Link as LinkIcon, Check, Plus } from "lucide-react";
import { toast } from "sonner";

const DOMAINS = [
  "Sciences", "Architecture", "Artisanat", "Agriculture", "Sport",
  "Communication", "Entrepreneuriat", "Arts", "Langues", "Tech & IA",
];

const EXPIRATION_OPTIONS = [
  { value: "never", label: "Jamais", days: null },
  { value: "7", label: "7 jours", days: 7 },
  { value: "30", label: "30 jours", days: 30 },
  { value: "90", label: "90 jours", days: 90 },
] as const;

export function InviteMentorDialog({ childId, childName, customTrigger }: { childId: string, childName: string, customTrigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mentorName, setMentorName] = useState("");
  const [canViewTalentMap, setCanViewTalentMap] = useState(true);
  const [canViewTimeline, setCanViewTimeline] = useState(true);
  const [canViewRawObservations, setCanViewRawObservations] = useState(false);
  const [scopeDomains, setScopeDomains] = useState<string[]>([]);
  const [expiration, setExpiration] = useState<(typeof EXPIRATION_OPTIONS)[number]["value"]>("never");

  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const inviteFn = useServerFn(inviteMentor);

  const handleInvite = async () => {
    const name = mentorName.trim();
    if (!name) {
      toast.error("Le nom du mentor est requis");
      return;
    }

    const { data: existing } = await supabase
      .from("child_mentors")
      .select("id")
      .eq("child_id", childId)
      .eq("status", "active")
      .ilike("mentor_name", name);
    if (existing && existing.length > 0) {
      if (!(await confirmDialog({
        title: "Mentor déjà invité",
        description: `Un mentor nommé "${name}" a déjà un accès actif à ce profil. Créer un lien supplémentaire pour lui quand même ?`,
        confirmLabel: "Créer quand même",
      }))) {
        return;
      }
    }

    setLoading(true);
    try {
      const days = EXPIRATION_OPTIONS.find((o) => o.value === expiration)?.days ?? null;
      const expiresAt = days ? new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString() : null;
      const res = await inviteFn({
        data: {
          childId,
          mentorName: name,
          scopeDomains,
          canViewTalentMap,
          canViewTimeline,
          canViewRawObservations,
          expiresAt,
        }
      });
      setShareUrl(res.shareUrl);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur lors de l'invitation");
    } finally {
      setLoading(false);
    }
  };

  const copyLink = () => {
    if (shareUrl) {
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast.success("Lien copié dans le presse-papier !");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleDomain = (domain: string) => {
    setScopeDomains(prev => 
      prev.includes(domain) ? prev.filter(d => d !== domain) : [...prev, domain]
    );
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      setOpen(val);
      if (!val) {
        setShareUrl(null);
        setMentorName("");
        setScopeDomains([]);
        setCanViewTalentMap(true);
        setCanViewTimeline(true);
        setCanViewRawObservations(false);
        setExpiration("never");
      }
    }}>
      <DialogTrigger asChild>
        {customTrigger ? customTrigger : (
          <button className="flex items-center justify-center gap-2 rounded-2xl border-[3px] border-ink bg-brand px-5 py-3 text-sm font-bold text-white shadow-brutal hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all">
            <Plus className="size-4" />
            Inviter un mentor
          </button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-3xl p-6 border-[3px] border-ink shadow-brutal">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl font-extrabold text-ink">
            Inviter un mentor
          </DialogTitle>
          <p className="text-sm text-ink/60">
            Créez un accès sécurisé pour partager les progrès de {childName}.
          </p>
        </DialogHeader>

        {!shareUrl ? (
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <label className="text-sm font-bold text-ink">Nom du mentor</label>
              <input
                type="text"
                value={mentorName}
                onChange={(e) => setMentorName(e.target.value)}
                placeholder="Ex: M. Dupont (Prof de maths)"
                className="w-full rounded-2xl border-[3px] border-ink px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-brand shadow-brutal-sm"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-ink">Durée d'accès</label>
              <div className="flex flex-wrap gap-2">
                {EXPIRATION_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setExpiration(opt.value)}
                    className={`rounded-full px-3 py-1.5 text-xs font-bold transition-all border-2 ${
                      expiration === opt.value
                        ? 'bg-brand border-ink text-white'
                        : 'bg-white border-ink text-ink/60 hover:bg-surface'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 rounded-2xl border-[3px] border-ink bg-white p-4 shadow-brutal-sm">
              <h4 className="text-sm font-bold text-ink mb-2">Permissions d'accès</h4>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium text-ink">Carte des talents</label>
                  <p className="text-[11px] text-ink/60">Vue globale des aptitudes</p>
                </div>
                <Switch checked={canViewTalentMap} onCheckedChange={setCanViewTalentMap} />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium text-ink">Journal des défis</label>
                  <p className="text-[11px] text-ink/60">Historique des missions accomplies</p>
                </div>
                <Switch checked={canViewTimeline} onCheckedChange={setCanViewTimeline} />
              </div>

              {canViewTimeline && (
                <div className="pl-4 border-l-[3px] border-ink space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label className="text-sm font-medium text-ink">Notes parentales</label>
                      <p className="text-[11px] text-ink/60">Inclure vos observations privées</p>
                    </div>
                    <Switch checked={canViewRawObservations} onCheckedChange={setCanViewRawObservations} />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] font-bold text-ink/70 uppercase tracking-wider">Restreindre à certains domaines</label>
                    <div className="flex flex-wrap gap-2">
                      {DOMAINS.map(domain => (
                        <button
                          key={domain}
                          onClick={() => toggleDomain(domain)}
                          className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase transition-all border-2 ${
                            scopeDomains.includes(domain)
                              ? 'bg-brand border-ink text-white'
                              : 'bg-white border-ink text-ink/60 hover:bg-surface'
                          }`}
                        >
                          {domain}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleInvite}
              disabled={loading || !mentorName.trim()}
              className="w-full rounded-2xl border-[3px] border-ink bg-brand py-3.5 text-sm font-bold text-white shadow-brutal hover:-translate-y-0.5 active:translate-y-0 active:shadow-none transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="size-5 animate-spin" /> : "Générer le lien d'accès"}
            </button>
          </div>
        ) : (
          <div className="space-y-6 py-6 text-center animate-in zoom-in-95">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-ink bg-leaf text-white shadow-brutal-sm mb-4">
              <Check className="size-8" />
            </div>
            <h3 className="text-xl font-bold text-ink">Accès créé !</h3>
            <p className="text-sm text-ink/60 px-4">
              Transmettez ce lien unique à <strong>{mentorName}</strong>. L'accès peut être révoqué à tout moment.
            </p>

            <div className="flex items-center gap-2 rounded-xl border-[3px] border-ink bg-sky p-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="flex-1 bg-transparent px-2 text-xs font-mono text-ink outline-none"
              />
              <button
                onClick={copyLink}
                className="flex items-center justify-center rounded-lg border-2 border-ink bg-white p-2.5 text-brand shadow-brutal-sm hover:bg-brand hover:text-white transition-colors"
              >
                {copied ? <Check className="size-4" /> : <LinkIcon className="size-4" />}
              </button>
            </div>
            
            <button
              onClick={() => setOpen(false)}
              className="text-sm font-bold text-ink/60 hover:text-ink underline decoration-ink/30 underline-offset-4"
            >
              Fermer
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
