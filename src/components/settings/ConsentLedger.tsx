import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, Download, Share2, Trash2, KeyRound } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export function ConsentLedger() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const { data } = await supabase
          .from("consent_events")
          .select("*")
          .order("created_at", { ascending: false });

        if (data) setEvents(data);
      } catch (err) {
        console.error("Erreur de chargement du registre de consentement:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  if (loading) {
    return <div className="animate-pulse h-32 bg-ink/5 rounded-2xl border border-ink/10"></div>;
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-6 text-sm text-ink/60 bg-white rounded-2xl border border-ink/10 shadow-md">
        Aucun événement de confidentialité enregistré pour le moment.
      </div>
    );
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case "data_exported":
        return <Download className="size-4 text-sky-600" />;
      case "mentor_invited":
        return <Share2 className="size-4 text-brand" />;
      case "mentor_revoked":
        return <Trash2 className="size-4 text-red-600" />;
      default:
        return <KeyRound className="size-4 text-ink/60" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case "data_exported":
        return "bg-sky-50";
      case "mentor_invited":
        return "bg-brand/10";
      case "mentor_revoked":
        return "bg-red-50";
      default:
        return "bg-ink/5";
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-ink/10 shadow-xl overflow-hidden">
      <div className="p-4 border-b border-ink/10 bg-surface flex items-center gap-2">
        <ShieldCheck className="size-5 text-emerald-600" />
        <h3 className="font-bold text-ink text-sm">Registre de Consentement</h3>
      </div>
      <div className="divide-y-2 divide-ink/10 max-h-[300px] overflow-y-auto">
        {events.map((ev) => (
          <div key={ev.id} className="p-4 flex gap-4">
            <div
              className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-ink ${getEventColor(ev.event_type)}`}
            >
              {getEventIcon(ev.event_type)}
            </div>
            <div className="flex-1 space-y-1">
              <p className="text-sm font-medium text-ink">{ev.description}</p>
              <div className="flex flex-wrap gap-x-3 text-[11px] text-ink/60">
                <span>
                  {formatDistanceToNow(new Date(ev.created_at), { addSuffix: true, locale: fr })}
                </span>
                {ev.metadata?.mentor_id && (
                  <span>Mentor ID: {ev.metadata.mentor_id.slice(0, 8)}...</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
