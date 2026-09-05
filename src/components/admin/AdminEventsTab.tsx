import React, { useState, useEffect, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listEventsAdmin,
  createEventAdmin,
  EVENT_TYPE_LABELS,
  type GenizioEvent,
  type EventType,
  type EventStatus,
} from "@/lib/events.functions";
import {
  Calendar,
  Hammer,
  Users,
  MapPin,
  Building2,
  Plus,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
  Award,
  ShieldCheck,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

export function AdminEventsTab() {
  const [events, setEvents] = useState<GenizioEvent[]>([]);
  const [summary, setSummary] = useState({
    totalEvents: 0,
    activeEvents: 0,
    totalChildrenMobilized: 0,
    totalSupervisorsActive: 0,
  });
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Filtres
  const [selectedType, setSelectedType] = useState<string>("tous");
  const [selectedStatus, setSelectedStatus] = useState<string>("tous");
  const [searchQuery, setSearchQuery] = useState("");

  // Formulaire de création
  const [title, setTitle] = useState("");
  const [eventType, setEventType] = useState<EventType>("fablab");
  const [city, setCity] = useState("Abidjan");
  const [venue, setVenue] = useState("");
  const [partnerName, setPartnerName] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [groupCode, setGroupCode] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const listFn = useServerFn(listEventsAdmin);
  const createFn = useServerFn(createEventAdmin);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await listFn();
      setEvents(res.events || []);
      setSummary(
        res.summary || {
          totalEvents: 0,
          activeEvents: 0,
          totalChildrenMobilized: 0,
          totalSupervisorsActive: 0,
        },
      );
    } catch (err: any) {
      toast.error(err.message || "Erreur lors du chargement des événements.");
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !startsAt || !endsAt || !city) {
      toast.error("Veuillez remplir tous les champs obligatoires.");
      return;
    }

    try {
      setIsSubmitting(true);
      await createFn({
        data: {
          title,
          eventType,
          city,
          venue: venue || null,
          partnerName: partnerName || null,
          startsAt,
          endsAt,
          groupCode: groupCode || null,
          description: description || null,
          supervisorUserIds: [],
          childIds: [],
        },
      });

      toast.success(
        "Événement créé avec succès ! Les relations de supervision sont synchronisées.",
      );
      setIsModalOpen(false);
      // Réinitialisation formulaire
      setTitle("");
      setVenue("");
      setPartnerName("");
      setStartsAt("");
      setEndsAt("");
      setGroupCode("");
      setDescription("");
      loadData();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la création de l'événement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      if (selectedType !== "tous" && ev.eventType !== selectedType) return false;
      if (selectedStatus !== "tous" && ev.status !== selectedStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = ev.title.toLowerCase().includes(q);
        const matchCity = ev.city.toLowerCase().includes(q);
        const matchPartner = (ev.partnerName || "").toLowerCase().includes(q);
        if (!matchTitle && !matchCity && !matchPartner) return false;
      }
      return true;
    });
  }, [events, selectedType, selectedStatus, searchQuery]);

  return (
    <div className="space-y-8">
      {/* 🏛️ Header Bar & Quick Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-ink/10 bg-white p-6 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-extrabold text-amber-700 uppercase tracking-wider">
              Admin OS • Hub Événements & FabLabs
            </span>
          </div>
          <h2 className="font-display text-2xl font-black text-ink mt-1">
            Gestion des FabLabs, Hackathons & Marathons
          </h2>
          <p className="text-sm font-medium text-ink/60 mt-0.5">
            Planification des événements officiels, supervision éphémère d'ateliers et traçabilité
            des découvertes d'escouades.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="press-white inline-flex items-center gap-2 rounded-2xl border border-ink/10 bg-surface px-4 py-2.5 text-xs font-extrabold text-ink transition-all hover:bg-white disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`size-4 text-brand ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Actualiser</span>
          </button>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-2xl bg-brand text-white px-5 py-2.5 text-xs font-extrabold shadow-sm transition-all hover:bg-brand/90 cursor-pointer"
          >
            <Plus className="size-4" />
            <span>Planifier un Événement</span>
          </button>
        </div>
      </div>

      {/* 📊 Summary KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink/60">
              Total Événements
            </span>
            <div className="size-10 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Hammer className="size-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="font-display text-3xl font-black text-ink">{summary.totalEvents}</div>
            <p className="text-xs font-medium text-ink/50 mt-1">Ateliers et stages organisés</p>
          </div>
        </div>

        <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink/60">
              Événements Actifs
            </span>
            <div className="size-10 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <Clock className="size-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="font-display text-3xl font-black text-ink">{summary.activeEvents}</div>
            <p className="text-xs font-medium text-ink/50 mt-1">En cours aujourd'hui</p>
          </div>
        </div>

        <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink/60">
              Enfants Mobilisés
            </span>
            <div className="size-10 rounded-2xl bg-brand/10 text-brand flex items-center justify-center">
              <Users className="size-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="font-display text-3xl font-black text-ink">
              {summary.totalChildrenMobilized}
            </div>
            <p className="text-xs font-medium text-ink/50 mt-1">Participants aux ateliers</p>
          </div>
        </div>

        <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-ink/60">
              Superviseurs Engagés
            </span>
            <div className="size-10 rounded-2xl bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <ShieldCheck className="size-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="font-display text-3xl font-black text-ink">
              {summary.totalSupervisorsActive}
            </div>
            <p className="text-xs font-medium text-ink/50 mt-1">Accès éphémères attribués</p>
          </div>
        </div>
      </div>

      {/* 🔍 Barre de Recherche & Filtres */}
      <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-sm space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-surface/50 p-4 rounded-2xl border border-ink/10">
          <div className="relative">
            <Search className="size-4 absolute left-3 top-3 text-ink/40" />
            <input
              type="text"
              placeholder="Rechercher titre, ville, partenaire..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs font-bold rounded-xl border border-ink/10 bg-white focus:outline-none focus:ring-2 focus:ring-brand/30"
            />
          </div>

          <div>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-ink/10 bg-white focus:outline-none focus:ring-2 focus:ring-brand/30 cursor-pointer"
            >
              <option value="tous">Tous les types d'événements</option>
              <option value="fablab">⚙️ Fab Lab & Bricolage</option>
              <option value="hackathon">🚀 Hackathon & Challenge</option>
              <option value="marathon">🧠 Marathon d'Inventeurs</option>
              <option value="workshop">🤝 Atelier Collaboratif</option>
              <option value="sprint">🏆 Sprint de Guilde</option>
            </select>
          </div>

          <div>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 text-xs font-bold rounded-xl border border-ink/10 bg-white focus:outline-none focus:ring-2 focus:ring-brand/30 cursor-pointer"
            >
              <option value="tous">Tous les statuts</option>
              <option value="active">🟢 En cours</option>
              <option value="upcoming">📅 À venir</option>
              <option value="completed">🏁 Terminé</option>
            </select>
          </div>
        </div>

        {/* 📋 Liste des Événements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredEvents.map((ev) => {
            const typeInfo = EVENT_TYPE_LABELS[ev.eventType] || EVENT_TYPE_LABELS.fablab;
            const isEventActive = ev.status === "active";
            const isCompleted = ev.status === "completed";

            return (
              <div
                key={ev.id}
                className="rounded-2xl border border-ink/10 bg-surface/30 p-5 space-y-3 transition-all hover:bg-white hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="size-11 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center text-xl">
                      {typeInfo.emoji}
                    </div>
                    <div>
                      <h4 className="font-display font-extrabold text-base text-ink flex items-center gap-2">
                        <span>{ev.title}</span>
                        {ev.groupCode && (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-ink/10 text-ink/70">
                            {ev.groupCode}
                          </span>
                        )}
                      </h4>
                      <div className="flex items-center gap-2 text-xs font-semibold text-ink/60 mt-0.5">
                        <span className="flex items-center gap-1">
                          <MapPin className="size-3 text-ink/40" />
                          {ev.city} {ev.venue ? `(${ev.venue})` : ""}
                        </span>
                        {ev.partnerName && <span>• Partenaire : {ev.partnerName}</span>}
                      </div>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-extrabold px-3 py-1 rounded-full border ${
                      isEventActive
                        ? "bg-emerald-100 text-emerald-800 border-emerald-300 animate-pulse"
                        : isCompleted
                          ? "bg-stone-100 text-stone-700 border-stone-300"
                          : "bg-sky-100 text-sky-800 border-sky-300"
                    }`}
                  >
                    {isEventActive ? "🟢 En cours" : isCompleted ? "🏁 Terminé" : "📅 À venir"}
                  </span>
                </div>

                <div className="rounded-xl bg-white border border-ink/10 p-3 flex items-center justify-between text-xs font-medium text-ink/70">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="size-3.5 text-brand" />
                    <span>
                      Du {new Date(ev.startsAt).toLocaleDateString("fr-FR")} au{" "}
                      {new Date(ev.endsAt).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-ink/50">
                    {ev.childIds.length} enfant(s) • {ev.supervisorUserIds.length} superviseur(s)
                  </span>
                </div>

                {ev.description && (
                  <p className="text-xs text-ink/60 line-clamp-2 leading-relaxed">
                    {ev.description}
                  </p>
                )}
              </div>
            );
          })}

          {filteredEvents.length === 0 && (
            <div className="col-span-2 rounded-2xl border border-dashed border-ink/20 p-10 text-center space-y-2">
              <Hammer className="size-8 text-ink/30 mx-auto" />
              <p className="font-display font-extrabold text-base text-ink">
                Aucun événement trouvé
              </p>
              <p className="text-xs text-ink/60 max-w-sm mx-auto">
                Cliquez sur "Planifier un Événement" pour programmer un Fab Lab, un hackathon ou un
                atelier avec supervision éphémère.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 📝 Modale de Création d'Événement */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl border border-ink/10 shadow-2xl max-w-lg w-full p-6 sm:p-8 space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-extrabold text-amber-700 bg-amber-100 px-3 py-1 rounded-full border border-amber-300">
                  Nouveau Fab Lab / Atelier
                </span>
                <h3 className="font-display text-xl font-black text-ink mt-2">
                  Planifier un Événement Officiel
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="size-8 rounded-full bg-surface text-ink/60 hover:text-ink flex items-center justify-center cursor-pointer"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4 text-xs font-bold text-ink">
              <div>
                <label className="block mb-1 text-ink/70">Intitulé de l'événement *</label>
                <input
                  type="text"
                  required
                  placeholder="ex: Fab Lab Bâtisseurs Abidjan 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-ink/15 focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-ink/70">Type d'Événement *</label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value as EventType)}
                    className="w-full px-3 py-2.5 rounded-xl border border-ink/15 focus:outline-none focus:ring-2 focus:ring-brand/30 cursor-pointer"
                  >
                    <option value="fablab">⚙️ Fab Lab</option>
                    <option value="hackathon">🚀 Hackathon</option>
                    <option value="marathon">🧠 Marathon</option>
                    <option value="workshop">🤝 Atelier</option>
                    <option value="sprint">🏆 Sprint</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 text-ink/70">Code Groupe / Escouade</label>
                  <input
                    type="text"
                    placeholder="ex: G-183"
                    value={groupCode}
                    onChange={(e) => setGroupCode(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-ink/15 focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-ink/70">Ville *</label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Abidjan"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-ink/15 focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-ink/70">Lieu / FabLab</label>
                  <input
                    type="text"
                    placeholder="ex: MakerSpace Cocody"
                    value={venue}
                    onChange={(e) => setVenue(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-ink/15 focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 text-ink/70">
                  Partenaire Organisateur (optionnel)
                </label>
                <input
                  type="text"
                  placeholder="ex: Fondation Orange / ONG Éducation Plus"
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-ink/15 focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 text-ink/70">Date de début *</label>
                  <input
                    type="datetime-local"
                    required
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-ink/15 focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                </div>

                <div>
                  <label className="block mb-1 text-ink/70">
                    Date de fin (Coupure automatique) *
                  </label>
                  <input
                    type="datetime-local"
                    required
                    value={endsAt}
                    onChange={(e) => setEndsAt(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-ink/15 focus:outline-none focus:ring-2 focus:ring-brand/30"
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 text-ink/70">Description / Objectifs</label>
                <textarea
                  rows={3}
                  placeholder="Objectif du stage, consignes d'atelier et matériels manipulés..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-ink/15 focus:outline-none focus:ring-2 focus:ring-brand/30"
                />
              </div>

              <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3 text-[11px] text-amber-900 font-medium leading-relaxed">
                🛡️ <strong>Règle de Supervision Éphémère :</strong> Les accès d'écriture du
                superviseur seront actifs pendant cette période et se verrouilleront automatiquement
                à la date de fin. L'historique des observations sera conservé à vie dans le
                portfolio des enfants.
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-extrabold text-ink/70 rounded-xl hover:bg-surface"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-extrabold text-white bg-brand rounded-xl hover:bg-brand/90 disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>Création en cours…</span>
                    </>
                  ) : (
                    <span>Valider & Planifier</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
