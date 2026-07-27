import { useState, useEffect } from "react";
import { Plus, Building2, Loader2, Key, X, FileText, Download, Copy, Link as LinkIcon, Search } from "lucide-react";
import { AdminPagination } from "./AdminPagination";
import { useServerFn } from "@tanstack/react-start";
import { useSession } from "@/hooks/use-session";
import {
  listCampaignsAdmin,
  createCampaignAdmin,
  generateCampaignTokensAdmin,
  updateCampaignExtraQuotaAdmin,
  listCampaignTokensAdmin,
  type Campaign,
  type CampaignTokenDetail,
} from "@/lib/campaigns.functions";
import { CampaignLinkCard } from "@/components/campaigns/CampaignLinkCard";
import { toast } from "sonner";

export function AdminCampaignsTab() {
  const { session } = useSession();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [meta, setMeta] = useState({ total: 0, page: 1, pageSize: 50, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isGenerateModalOpen, setIsGenerateModalOpen] = useState(false);
  const [isTokensModalOpen, setIsTokensModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "upcoming" | "ended">("all");
  const [page, setPage] = useState(1);

  const listCampaignsFn = useServerFn(listCampaignsAdmin);

  // Sans ce délai, chaque frappe déclencherait une requête serveur complète.
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Revenir en page 1 dès qu'un filtre change : rester en page 3 d'un résultat qui n'en compte
  // plus qu'une afficherait une grille vide sans expliquer pourquoi.
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const fetchCampaigns = async () => {
    const opts = session?.access_token
      ? { headers: { Authorization: `Bearer ${session.access_token}` } }
      : {};

    try {
      setLoading(true);
      const res = await listCampaignsFn({
        data: { search: debouncedSearch || undefined, page, pageSize: 50, statusFilter },
        ...opts,
      });
      setCampaigns(res.data || []);
      setMeta({ total: res.total, page: res.page, pageSize: res.pageSize, totalPages: res.totalPages });
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du chargement des campagnes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, debouncedSearch, statusFilter, page]);

  const handleCampaignUpdated = (updated: Campaign) => {
    setCampaigns((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  };

  const hasActiveFilter = debouncedSearch !== "" || statusFilter !== "all";

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

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[14rem]">
          <Search className="size-4 text-ink/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher une campagne, une description, un gestionnaire…"
            aria-label="Rechercher une campagne"
            className="w-full rounded-2xl border border-ink/10 bg-surface pl-9 pr-4 py-2.5 text-sm font-medium text-ink outline-none focus:ring-2 focus:ring-brand/30"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          aria-label="Filtrer par période de la campagne"
          className="rounded-2xl border border-ink/10 bg-white px-3 py-2.5 text-xs font-bold text-ink outline-none focus:ring-2 focus:ring-brand/30 cursor-pointer"
        >
          <option value="all">Période : toutes</option>
          <option value="active">En cours</option>
          <option value="upcoming">À venir</option>
          <option value="ended">Terminées</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="size-8 animate-spin text-brand" />
        </div>
      ) : campaigns.length === 0 ? (
        <div className="bg-surface rounded-3xl p-12 text-center border border-ink/5">
          <Building2 className="size-12 text-ink/20 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-ink">
            {hasActiveFilter ? "Aucun résultat" : "Aucune campagne"}
          </h3>
          <p className="text-ink/60 mt-1 max-w-sm mx-auto">
            {hasActiveFilter
              ? "Aucune campagne ne correspond à cette recherche."
              : "Créez une campagne pour permettre à une ONG de piloter une cohorte d'enfants."}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {campaigns.map(c => (
            <div key={c.id} className="bg-white rounded-3xl p-6 border border-ink/10 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
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
                
                <div className="bg-surface p-3 rounded-2xl mb-3">
                    <div className="text-xs font-bold text-ink/50 mb-1 uppercase tracking-wider">Chargé de projet (Propriétaire)</div>
                    <div className="text-sm font-medium text-ink truncate" title={c.manager_email || ""}>
                        {c.manager_email || <span className="text-ink/40 italic">Non assigné</span>}
                    </div>
                </div>
                <div className="text-xs font-bold text-ink/50 mb-3">
                    Programme : {new Date(c.start_date).toLocaleDateString("fr-FR")} → {new Date(c.end_date).toLocaleDateString("fr-FR")}
                </div>

                <CampaignQuotaEditor campaign={c} onUpdated={handleCampaignUpdated} />
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-ink/5">
                <button
                  onClick={() => { setSelectedCampaign(c); setIsLinkModalOpen(true); }}
                  className="w-full flex items-center justify-center gap-1.5 bg-ink text-white hover:bg-ink/90 px-3 py-2 rounded-xl font-bold transition-colors text-xs"
                >
                  <LinkIcon className="size-3.5" />
                  <span>Lien / QR</span>
                </button>

                <button
                  onClick={() => { setSelectedCampaign(c); setIsGenerateModalOpen(true); }}
                  className="w-full flex items-center justify-center gap-1.5 bg-surface text-ink hover:bg-ink hover:text-white px-3 py-2 rounded-xl font-bold transition-colors text-xs"
                >
                  <Key className="size-3.5" />
                  <span>Codes</span>
                </button>

                <button
                  onClick={() => { setSelectedCampaign(c); setIsTokensModalOpen(true); }}
                  className="w-full flex items-center justify-center gap-1.5 bg-brand/10 text-brand hover:bg-brand hover:text-white px-3 py-2 rounded-xl font-bold transition-colors text-xs"
                >
                  <FileText className="size-3.5" />
                  <span>Voir</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <AdminPagination
        page={meta.page}
        totalPages={meta.totalPages}
        total={meta.total}
        pageSize={meta.pageSize}
        onPageChange={setPage}
        label="campagne"
      />

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

      {isTokensModalOpen && selectedCampaign && (
        <ViewCampaignTokensModal
            campaign={selectedCampaign}
            onClose={() => setIsTokensModalOpen(false)}
        />
      )}

      {isLinkModalOpen && selectedCampaign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
          <div className="w-full max-w-lg relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setIsLinkModalOpen(false)}
              className="absolute -top-3 -right-3 p-2 bg-white rounded-full text-ink/60 hover:text-ink transition-colors shadow-md cursor-pointer z-10"
            >
              <X className="size-5" />
            </button>
            <CampaignLinkCard campaignId={selectedCampaign.id} campaignName={selectedCampaign.name} />
          </div>
        </div>
      )}
    </div>
  );
}

function CampaignQuotaEditor({ campaign, onUpdated }: { campaign: Campaign; onUpdated: (c: Campaign) => void }) {
  const [value, setValue] = useState(campaign.extra_supervisors_quota);
  const [saving, setSaving] = useState(false);
  const updateFn = useServerFn(updateCampaignExtraQuotaAdmin);

  useEffect(() => {
    setValue(campaign.extra_supervisors_quota);
  }, [campaign.extra_supervisors_quota]);

  const dirty = value !== campaign.extra_supervisors_quota;

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateFn({ data: { campaignId: campaign.id, extraSupervisorsQuota: value } });
      onUpdated(updated);
      toast.success("Quota mis à jour.");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la mise à jour du quota.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-surface p-3 rounded-2xl mb-3">
      <div className="text-xs font-bold text-ink/50 mb-1.5 uppercase tracking-wider">Quota superviseurs</div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-sm font-medium text-ink/60 shrink-0">5 de base +</span>
        <input
          type="number"
          min={0}
          max={50}
          value={value}
          onChange={(e) => setValue(Math.max(0, parseInt(e.target.value) || 0))}
          className="w-16 bg-white border border-ink/10 rounded-xl px-2 py-1.5 text-sm font-bold text-ink text-center"
        />
        <span className="text-sm font-medium text-ink/60 shrink-0">= {5 + value} enfants max/superviseur</span>
        {dirty && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="ml-auto flex items-center gap-1.5 bg-ink text-white px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-ink/90 transition-colors shrink-0 disabled:opacity-50"
          >
            {saving ? <Loader2 className="size-3.5 animate-spin" /> : "Enregistrer"}
          </button>
        )}
      </div>
    </div>
  );
}

const todayISO = () => new Date().toISOString().slice(0, 10);
const threeMonthsFromNowISO = () => {
  const d = new Date();
  d.setMonth(d.getMonth() + 3);
  return d.toISOString().slice(0, 10);
};

function CreateCampaignModal({ onClose, onSuccess }: { onClose: () => void, onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [managerEmail, setManagerEmail] = useState("");
  const [targetCount, setTargetCount] = useState(100);
  const [startDate, setStartDate] = useState(todayISO());
  const [endDate, setEndDate] = useState(threeMonthsFromNowISO());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createFn = useServerFn(createCampaignAdmin);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await createFn({ data: { name, description, managerEmail, targetCount, startDate, endDate } });
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
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-bold text-ink mb-1">Début du programme</label>
            <input required type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-surface border-none rounded-2xl p-4 font-medium" />
          </div>
          <div>
            <label className="block text-sm font-bold text-ink mb-1">Fin du programme</label>
            <input required type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-surface border-none rounded-2xl p-4 font-medium" />
          </div>
        </div>
        <p className="text-xs text-ink/50 -mt-2 font-medium">Fenêtre fixe et partagée par toute la cohorte — contrairement à un enfant isolé, ses enfants ne démarrent pas chacun leur propre chrono individuel.</p>
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
  const [existingCount, setExistingCount] = useState<number | null>(null);
  const [count, setCount] = useState(campaign.target_count);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const generateFn = useServerFn(generateCampaignTokensAdmin);
  const listTokensFn = useServerFn(listCampaignTokensAdmin);

  // Affiche ce qui existe déjà avant de générer — sans ça, rien ne distingue "premier lot" de
  // "deuxième lot par erreur" (double-clic, page rouverte) : c'est exactement ce qui a produit
  // 82 codes pour un objectif de 41 sur la campagne LIBA.
  useEffect(() => {
    listTokensFn({ data: { campaignId: campaign.id } })
      .then((tokens) => {
        const existing = tokens?.length ?? 0;
        setExistingCount(existing);
        setCount(Math.max(0, campaign.target_count - existing));
      })
      .catch(() => setExistingCount(0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaign.id]);

  const remaining = existingCount === null ? null : campaign.target_count - existingCount;

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
        {existingCount !== null && existingCount > 0 && (
          <p className={`text-xs font-bold rounded-xl px-3 py-2 ${remaining !== null && remaining <= 0 ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-700"}`}>
            {existingCount} code(s) déjà généré(s) pour un objectif de {campaign.target_count}
            {remaining !== null && remaining > 0 ? ` — ${remaining} restant(s).` : " — objectif déjà atteint."}
          </p>
        )}
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

function ViewCampaignTokensModal({ campaign, onClose }: { campaign: Campaign; onClose: () => void }) {
  const { session } = useSession();
  const [tokens, setTokens] = useState<CampaignTokenDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "active" | "unactive">("all");

  const listTokensFn = useServerFn(listCampaignTokensAdmin);

  const fetchTokens = async () => {
    const opts = session?.access_token
      ? { headers: { Authorization: `Bearer ${session.access_token}` } }
      : {};

    try {
      setLoading(true);
      const data = await listTokensFn({ data: { campaignId: campaign.id }, ...opts });
      setTokens(data || []);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du chargement des codes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTokens();
  }, [campaign.id, session]);

  const handleExportCSV = () => {
    if (tokens.length === 0) {
      toast.error("Aucun code à exporter.");
      return;
    }
    const headers = ["Code", "Statut", "Date d'activation", "Nom Enfant", "Email Parent", "Date de création"];
    const rows = tokens.map((t) => [
      t.code,
      t.is_redeemed ? "Activé" : "Non activé",
      t.redeemed_at ? new Date(t.redeemed_at).toLocaleString("fr-FR") : "-",
      t.child_name || "-",
      t.parent_email || "-",
      t.created_at ? new Date(t.created_at).toLocaleString("fr-FR") : "-",
    ]);

    const csvContent =
      "\uFEFF" +
      [
        headers.join(";"),
        ...rows.map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(";")),
      ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const safeName = campaign.name.toLowerCase().replace(/[^a-z0-9]/g, "_");
    a.download = `tokens_${safeName}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Fichier CSV téléchargé avec succès !");
  };

  const handleCopyUnactivated = () => {
    const unactivated = tokens.filter((t) => !t.is_redeemed).map((t) => t.code);
    if (unactivated.length === 0) {
      toast.info("Aucun code non-activé à copier.");
      return;
    }
    navigator.clipboard.writeText(unactivated.join("\n"));
    toast.success(`${unactivated.length} code(s) non-activé(s) copié(s) !`);
  };

  const filteredTokens = tokens.filter((t) => {
    if (filter === "active") return t.is_redeemed;
    if (filter === "unactive") return !t.is_redeemed;
    return true;
  });

  const redeemedCount = tokens.filter((t) => t.is_redeemed).length;
  const unredeemedCount = tokens.length - redeemedCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40 backdrop-blur-sm">
      <div className="bg-white rounded-[2rem] w-full max-w-3xl max-h-[85vh] flex flex-col p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-ink/10">
          <div>
            <h3 className="font-display font-black text-xl text-ink flex items-center gap-2">
              <FileText className="size-6 text-brand" />
              Codes de la campagne : {campaign.name}
            </h3>
            <p className="text-xs font-medium text-ink/60 mt-0.5">
              Total: {tokens.length} code(s) · Activés: {redeemedCount} · Non-activés: {unredeemedCount}
            </p>
          </div>
          <button onClick={onClose} className="p-2 bg-surface rounded-full text-ink/60 hover:text-ink transition-colors">
            <X className="size-5" />
          </button>
        </div>

        {/* Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 py-4 border-b border-ink/10">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                filter === "all" ? "bg-ink text-white" : "bg-surface text-ink/70 hover:bg-ink/10"
              }`}
            >
              Tous ({tokens.length})
            </button>
            <button
              onClick={() => setFilter("unactive")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                filter === "unactive" ? "bg-amber-600 text-white" : "bg-surface text-ink/70 hover:bg-ink/10"
              }`}
            >
              Non-activés ({unredeemedCount})
            </button>
            <button
              onClick={() => setFilter("active")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors ${
                filter === "active" ? "bg-emerald-600 text-white" : "bg-surface text-ink/70 hover:bg-ink/10"
              }`}
            >
              Activés ({redeemedCount})
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleCopyUnactivated}
              disabled={unredeemedCount === 0}
              className="flex items-center gap-1.5 bg-surface text-ink hover:bg-ink hover:text-white px-3 py-2 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
            >
              <Copy className="size-3.5" />
              <span>📋 Copier tous les codes non-activés</span>
            </button>

            <button
              onClick={handleExportCSV}
              disabled={tokens.length === 0}
              className="flex items-center gap-1.5 bg-brand text-white hover:bg-brand/90 px-3 py-2 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
            >
              <Download className="size-3.5" />
              <span>📥 Exporter CSV</span>
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto py-4 space-y-2">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="size-8 animate-spin text-brand" />
            </div>
          ) : filteredTokens.length === 0 ? (
            <div className="text-center py-8 text-ink/50 text-sm font-medium">
              Aucun code ne correspond aux critères.
            </div>
          ) : (
            <div className="space-y-2">
              {filteredTokens.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-2xl border border-ink/10 bg-surface gap-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-bold text-sm text-ink bg-white px-3 py-1.5 rounded-xl border border-ink/10 shadow-xs">
                      {t.code}
                    </span>
                    {t.is_redeemed ? (
                      <span className="bg-emerald-100 text-emerald-800 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        Activé
                      </span>
                    ) : (
                      <span className="bg-amber-100 text-amber-800 text-[11px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                        Non activé
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-ink/70 flex flex-col sm:items-end gap-0.5">
                    {t.is_redeemed ? (
                      <>
                        <span className="font-bold text-ink">
                          Enfant: {t.child_name || "Anonyme"} {t.parent_email ? `(${t.parent_email})` : ""}
                        </span>
                        <span className="text-ink/50">
                          Activé le: {t.redeemed_at ? new Date(t.redeemed_at).toLocaleString("fr-FR") : "-"}
                        </span>
                      </>
                    ) : (
                      <span className="text-ink/50">
                        Créé le: {t.created_at ? new Date(t.created_at).toLocaleDateString("fr-FR") : "-"}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

