import { useState, useEffect } from "react";
import { Plus, Building2, Loader2, Key, X } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { listCampaignsAdmin, createCampaignAdmin, generateCampaignTokensAdmin, type Campaign } from "@/lib/campaigns.functions";
import { toast } from "sonner";

export function AdminCampaignsTab() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  
  const listCampaignsFn = useServerFn(listCampaignsAdmin);

  const fetchCampaigns = async () => {
    try {
      setLoading(true);
      const data = await listCampaignsFn({ data: undefined });
      setCampaigns(data);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du chargement des campagnes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-display font-black text-ink">Campagnes B2B (ONG / Écoles)</h2>
          <p className="text-sm font-medium text-ink/60">Gérez les cohortes financées par des partenaires externes.</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 bg-brand text-white px-5 py-2.5 rounded-2xl font-bold hover:bg-brand/90 transition-colors"
        >
          <Plus className="size-4" />
          <span>Nouvelle Campagne</span>
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-brand" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="bg-surface rounded-3xl p-12 text-center border border-ink/5">
          <Building2 className="size-12 text-ink/20 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-ink">Aucune campagne</h3>
          <p className="text-ink/60 mt-1 max-w-sm mx-auto">
            Créez une campagne pour permettre à une ONG de piloter une cohorte d'enfants.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map(c => (
            <div key={c.id} className="bg-white rounded-3xl p-6 border border-ink/10 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="size-10 rounded-2xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
                  <Building2 className="size-5" />
                </div>
                <div className="text-right">
                   <div className="text-xs font-bold text-ink/40 uppercase tracking-wider mb-1">Cible</div>
                   <div className="text-lg font-black text-ink">{c.target_count} <span className="text-sm font-bold text-ink/50">enfants</span></div>
                </div>
              </div>
              <h3 className="font-display font-bold text-lg text-ink truncate mb-1" title={c.name}>{c.name}</h3>
              <p className="text-sm text-ink/60 line-clamp-2 mb-4 h-10">{c.description || "Aucune description"}</p>
              
              <div className="bg-surface p-3 rounded-2xl mb-4">
                  <div className="text-xs font-bold text-ink/50 mb-1 uppercase tracking-wider">Chargé de projet (Propriétaire)</div>
                  <div className="text-sm font-medium text-ink truncate" title={c.manager_email || ""}>
                      {c.manager_email || <span className="text-ink/40 italic">Non assigné</span>}
                  </div>
              </div>

              <button
                onClick={() => { setSelectedCampaign(c); setIsGenerateModalOpen(true); }}
                className="w-full flex items-center justify-center gap-2 bg-surface text-ink hover:bg-ink hover:text-white px-4 py-2 rounded-xl font-bold transition-colors text-sm"
              >
                <Key className="size-4" />
                <span>Générer des Tokens</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {isCreateModalOpen && (
        <CreateCampaignModal 
            onClose={() => setIsCreateModalOpen(false)} 
            onSuccess={() => { setIsCreateModalOpen(false); fetchCampaigns(); }} 
        />
      )}

      {isGenerateModalOpen && selectedCampaign && (
        <GenerateTokensModal 
            campaign={selectedCampaign} 
            onClose={() => setIsGenerateModalOpen(false)} 
            onSuccess={() => { setIsGenerateModalOpen(false); }} 
        />
      )}
    </div>
  );
}

function CreateCampaignModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [targetCount, setTargetCount] = useState(100);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const createFn = useServerFn(createCampaignAdmin);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createFn({ data: { name, description, managerEmail, targetCount } });
      toast.success("Campagne créée avec succès !");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Erreur de création");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
      <div className="bg-white rounded-[2rem] w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display font-black text-xl text-ink flex items-center gap-2">
            <Building2 className="size-6 text-brand" />
            Nouvelle Campagne B2B
          </h3>
          <button onClick={onClose} className="p-2 bg-surface rounded-full text-ink/60 hover:text-ink transition-colors">
            <X className="size-5" />
          </button>
        </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-bold text-ink mb-1">Nom de la campagne</label>
          <input required type="text" value={name} onChange={e => setName(e.target.value)} className="w-full bg-surface border-none rounded-2xl p-4 font-medium" placeholder="Ex: Cohorte UNICEF 2026" />
        </div>
        <div>
          <label className="block text-sm font-bold text-ink mb-1">Email du chargé de projet (Client)</label>
          <input required type="email" value={managerEmail} onChange={e => setManagerEmail(e.target.value)} className="w-full bg-surface border-none rounded-2xl p-4 font-medium" placeholder="responsable@ong.org" />
          <p className="text-xs text-ink/50 mt-1 font-medium">L'utilisateur doit déjà avoir un compte sur Génizio.</p>
        </div>
        <div>
          <label className="block text-sm font-bold text-ink mb-1">Nombre d'enfants ciblés</label>
          <input required type="number" min={1} value={targetCount} onChange={e => setTargetCount(parseInt(e.target.value))} className="w-full bg-surface border-none rounded-2xl p-4 font-medium" />
        </div>
        <div>
          <label className="block text-sm font-bold text-ink mb-1">Description (Optionnelle)</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full bg-surface border-none rounded-2xl p-4 font-medium min-h-[100px]" placeholder="Détails du programme..." />
        </div>
        <div className="flex gap-3 pt-4">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-3 bg-surface hover:bg-ink/5 text-ink rounded-2xl font-bold transition-colors">Annuler</button>
          <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-3 bg-brand hover:bg-brand/90 text-white rounded-2xl font-bold transition-colors flex items-center justify-center gap-2">
            {isSubmitting ? <Loader2 className="size-5 animate-spin" /> : <span>Créer la campagne</span>}
          </button>
        </div>
      </form>
      </div>
    </div>
  );
}

function GenerateTokensModal({ campaign, onClose, onSuccess }: { campaign: Campaign, onClose: () => void, onSuccess: () => void }) {
  const [count, setCount] = useState(campaign.target_count);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const generateFn = useServerFn(generateCampaignTokensAdmin);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await generateFn({ data: { campaignId: campaign.id, count } });
      toast.success(`${count} tokens générés avec succès pour la campagne !`);
      onSuccess();
    } catch (err: any) {
      toast.error(err.message || "Erreur de génération");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
      <div className="bg-white rounded-[2rem] w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display font-black text-xl text-ink flex items-center gap-2">
            <Key className="size-6 text-brand" />
            Générer des Tokens
          </h3>
          <button onClick={onClose} className="p-2 bg-surface rounded-full text-ink/60 hover:text-ink transition-colors">
            <X className="size-5" />
          </button>
        </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <p className="text-sm font-medium text-ink/70">
          Générer un lot de codes d'inscription pour la campagne <strong>{campaign.name}</strong>. Ces codes seront pré-payés et rattachés à cette campagne.
        </p>
        <div>
          <label className="block text-sm font-bold text-ink mb-1">Nombre de tokens</label>
          <input required type="number" min={1} max={500} value={count} onChange={e => setCount(parseInt(e.target.value))} className="w-full bg-surface border-none rounded-2xl p-4 font-medium" />
          <p className="text-xs text-ink/50 mt-1 font-medium">Chaque code se lie à la saison réellement en cours au moment où le parent l'active, pas à aujourd'hui.</p>
        </div>
        <div className="flex gap-3 pt-4">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-3 bg-surface hover:bg-ink/5 text-ink rounded-2xl font-bold transition-colors">Annuler</button>
          <button type="submit" disabled={isSubmitting} className="flex-1 px-4 py-3 bg-ink hover:bg-ink/90 text-white rounded-2xl font-bold transition-colors flex items-center justify-center gap-2">
            {isSubmitting ? <Loader2 className="size-5 animate-spin" /> : <span>Générer</span>}
          </button>
        </div>
      </form>
      </div>
    </div>
  );
}
