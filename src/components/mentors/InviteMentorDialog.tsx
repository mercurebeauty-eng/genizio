import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { inviteMentor } from "@/lib/mentors.functions";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Loader2, Link as LinkIcon, Check, Plus } from "lucide-react";
import { toast } from "sonner";

const DOMAINS = [
  "Sciences", "Architecture", "Artisanat", "Agriculture", "Sport",
  "Communication", "Entrepreneuriat", "Arts", "Langues", "Tech & IA",
];

export function InviteMentorDialog({ childId, childName }: { childId: string, childName: string }) {
  const [open, setOpen] = useState(false);
  const [mentorName, setMentorName] = useState("");
  const [canViewTalentMap, setCanViewTalentMap] = useState(true);
  const [canViewTimeline, setCanViewTimeline] = useState(true);
  const [canViewRawObservations, setCanViewRawObservations] = useState(false);
  const [scopeDomains, setScopeDomains] = useState<string[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const inviteFn = useServerFn(inviteMentor);

  const handleInvite = async () => {
    if (!mentorName.trim()) {
      toast.error("Le nom du mentor est requis");
      return;
    }
    setLoading(true);
    try {
      const res = await inviteFn({
        data: {
          childId,
          mentorName: mentorName.trim(),
          scopeDomains,
          canViewTalentMap,
          canViewTimeline,
          canViewRawObservations,
          expiresAt: null,
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
      }
    }}>
      <DialogTrigger asChild>
        <button className="flex items-center justify-center gap-2 rounded-2xl bg-brand px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-brand-dark transition-all">
          <Plus className="size-4" />
          Inviter un mentor
        </button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md rounded-3xl p-6">
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
                className="w-full rounded-2xl border border-ink/10 px-4 py-3 text-sm outline-none focus:border-brand focus:ring-1 focus:ring-brand shadow-sm"
              />
            </div>

            <div className="space-y-4 rounded-2xl border border-ink/5 bg-surface/30 p-4">
              <h4 className="text-sm font-bold text-ink mb-2">Permissions d'accès</h4>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium text-ink">Carte des talents</label>
                  <p className="text-[11px] text-ink/50">Vue globale des aptitudes</p>
                </div>
                <Switch checked={canViewTalentMap} onCheckedChange={setCanViewTalentMap} />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <label className="text-sm font-medium text-ink">Journal des défis</label>
                  <p className="text-[11px] text-ink/50">Historique des missions accomplies</p>
                </div>
                <Switch checked={canViewTimeline} onCheckedChange={setCanViewTimeline} />
              </div>

              {canViewTimeline && (
                <div className="pl-4 border-l-2 border-brand/10 space-y-4 animate-in fade-in slide-in-from-top-2">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <label className="text-sm font-medium text-ink">Notes parentales</label>
                      <p className="text-[11px] text-ink/50">Inclure vos observations privées</p>
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
                          className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase transition-all border ${
                            scopeDomains.includes(domain) 
                              ? 'bg-brand/10 border-brand/30 text-brand' 
                              : 'bg-white border-ink/10 text-ink/60 hover:bg-ink/5'
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
              className="w-full rounded-2xl bg-brand py-3.5 text-sm font-bold text-white shadow-md shadow-brand/20 hover:bg-brand-dark transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="size-5 animate-spin" /> : "Générer le lien d'accès"}
            </button>
          </div>
        ) : (
          <div className="space-y-6 py-6 text-center animate-in zoom-in-95">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-4">
              <Check className="size-8" />
            </div>
            <h3 className="text-xl font-bold text-ink">Accès créé !</h3>
            <p className="text-sm text-ink/60 px-4">
              Transmettez ce lien unique à <strong>{mentorName}</strong>. L'accès peut être révoqué à tout moment.
            </p>
            
            <div className="flex items-center gap-2 rounded-xl border border-brand/20 bg-brand/5 p-2">
              <input 
                type="text" 
                readOnly 
                value={shareUrl} 
                className="flex-1 bg-transparent px-2 text-xs font-mono text-ink/80 outline-none"
              />
              <button
                onClick={copyLink}
                className="flex items-center justify-center rounded-lg bg-white p-2.5 text-brand shadow-sm border border-brand/10 hover:bg-brand hover:text-white transition-colors"
              >
                {copied ? <Check className="size-4" /> : <LinkIcon className="size-4" />}
              </button>
            </div>
            
            <button
              onClick={() => setOpen(false)}
              className="text-sm font-bold text-ink/50 hover:text-ink underline decoration-ink/30 underline-offset-4"
            >
              Fermer
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
