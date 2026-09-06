import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAdmin } from "@/integrations/supabase/admin-middleware";

export type EventType = "fablab" | "hackathon" | "marathon" | "workshop" | "sprint";
export type EventStatus = "upcoming" | "active" | "completed" | "archived";

export const EVENT_TYPE_LABELS: Record<EventType, { label: string; emoji: string; color: string }> =
  {
    fablab: {
      label: "Fab Lab & Bricolage",
      emoji: "⚙️",
      color: "bg-amber-100 text-amber-900 border-amber-300",
    },
    hackathon: {
      label: "Hackathon & Challenge",
      emoji: "🚀",
      color: "bg-purple-100 text-purple-900 border-purple-300",
    },
    marathon: {
      label: "Marathon d'Inventeurs",
      emoji: "🧠",
      color: "bg-violet-100 text-violet-900 border-violet-300",
    },
    workshop: {
      label: "Atelier Collaboratif",
      emoji: "🤝",
      color: "bg-sky-100 text-sky-900 border-sky-300",
    },
    sprint: {
      label: "Sprint de Guilde",
      emoji: "🏆",
      color: "bg-emerald-100 text-emerald-900 border-emerald-300",
    },
  };

export interface GenizioEvent {
  id: string;
  title: string;
  eventType: EventType;
  city: string;
  venue: string | null;
  partnerName: string | null;
  startsAt: string;
  endsAt: string;
  status: EventStatus;
  description: string | null;
  groupCode: string | null;
  supervisorUserIds: string[];
  childIds: string[];
  createdAt: string;
}

export const CreateEventSchema = z.object({
  title: z.string().min(3, "Le titre doit comporter au moins 3 caractères"),
  eventType: z.enum(["fablab", "hackathon", "marathon", "workshop", "sprint"]),
  city: z.string().min(2, "La ville est requise"),
  venue: z.string().optional().nullable(),
  partnerName: z.string().optional().nullable(),
  startsAt: z.string().min(10, "La date de début est requise"),
  endsAt: z.string().min(10, "La date de fin est requise"),
  description: z.string().optional().nullable(),
  groupCode: z.string().optional().nullable(),
  supervisorUserIds: z.array(z.string().uuid()).default([]),
  childIds: z.array(z.string().uuid()).default([]),
});

export interface EventsAdminResponse {
  events: GenizioEvent[];
  summary: {
    totalEvents: number;
    activeEvents: number;
    totalChildrenMobilized: number;
    totalSupervisorsActive: number;
  };
}

/**
 * Liste administrative des événements Génizio & FabLabs
 */
export const listEventsAdmin = createServerFn({ method: "GET" })
  .middleware([requireAdmin])
  .handler(async (): Promise<EventsAdminResponse> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Lecture depuis la table events ou fallback structuré
    const { data: rawEvents, error } = await (supabaseAdmin as any)
      .from("events")
      .select("*")
      .order("starts_at", { ascending: false });

    // Si la table events n'existe pas encore ou est vide, on renvoie une liste sécurisée
    const events: GenizioEvent[] = (rawEvents || []).map((e: any) => {
      const now = new Date();
      const start = new Date(e.starts_at);
      const end = new Date(e.ends_at);

      let computedStatus: EventStatus = e.status || "upcoming";
      if (now >= start && now <= end) computedStatus = "active";
      else if (now > end) computedStatus = "completed";

      return {
        id: e.id,
        title: e.title,
        eventType: (e.event_type as EventType) || "fablab",
        city: e.city || "Abidjan",
        venue: e.venue || null,
        partnerName: e.partner_name || null,
        startsAt: e.starts_at,
        endsAt: e.ends_at,
        status: computedStatus,
        description: e.description || null,
        groupCode: e.group_code || null,
        supervisorUserIds: e.supervisor_user_ids || [],
        childIds: e.child_ids || [],
        createdAt: e.created_at || new Date().toISOString(),
      };
    });

    const activeEventsCount = events.filter((e) => e.status === "active").length;
    const uniqueChildren = new Set<string>();
    const uniqueSupervisors = new Set<string>();

    events.forEach((e) => {
      e.childIds.forEach((id) => uniqueChildren.add(id));
      e.supervisorUserIds.forEach((id) => uniqueSupervisors.add(id));
    });

    return {
      events,
      summary: {
        totalEvents: events.length,
        activeEvents: activeEventsCount,
        totalChildrenMobilized: uniqueChildren.size,
        totalSupervisorsActive: uniqueSupervisors.size,
      },
    };
  });

/**
 * Création d'un événement avec assignation automatique de supervision éphémère
 */
export const createEventAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdmin])
  .validator((data: unknown) => CreateEventSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // 1. Insertion de l'événement
    const newEventId = crypto.randomUUID();
    const eventPayload = {
      id: newEventId,
      title: data.title,
      event_type: data.eventType,
      city: data.city,
      venue: data.venue || null,
      partner_name: data.partnerName || null,
      starts_at: data.startsAt,
      ends_at: data.endsAt,
      description: data.description || null,
      group_code: data.groupCode || null,
      supervisor_user_ids: data.supervisorUserIds,
      child_ids: data.childIds,
      status: "upcoming",
      created_at: new Date().toISOString(),
    };

    const { error: insertError } = await (supabaseAdmin as any).from("events").insert(eventPayload);

    if (insertError) {
      console.warn("Table events fallback insertion error:", insertError.message);
    }

    // 2. Création automatique des assignations de supervision éphémère (mentors table)
    // Pour chaque superviseur et chaque enfant, insérer la relation avec les bornes temporelles
    if (data.supervisorUserIds.length > 0 && data.childIds.length > 0) {
      const mentorAssignments = [];
      for (const supervisorId of data.supervisorUserIds) {
        for (const childId of data.childIds) {
          mentorAssignments.push({
            id: crypto.randomUUID(),
            mentor_user_id: supervisorId,
            child_profile_id: childId,
            context_name: `${data.title} ${data.groupCode ? `(${data.groupCode})` : ""}`.trim(),
            event_id: newEventId,
            valid_from: data.startsAt,
            valid_until: data.endsAt,
            scope_type: "event_observation",
            created_at: new Date().toISOString(),
          });
        }
      }

      await (supabaseAdmin as any)
        .from("mentors")
        // Audit C4 : un upsert sur une ligne soft-retirée doit la RÉACTIVER
        // (removed_at:null) — sinon la réassignation d'événement était silencieuse.
        .upsert(mentorAssignments.map((a: any) => ({ ...a, removed_at: null })), {
          onConflict: "mentor_user_id,child_profile_id",
        });
    }

    return { success: true, eventId: newEventId };
  });

/**
 * Liste légère des événements actifs/récents pour le sélecteur dans la Découverte
 */
export const listActiveEventsForDiscovery = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: rawEvents } = await (supabaseAdmin as any)
    .from("events")
    .select("id, title, event_type, city, group_code, starts_at, ends_at")
    .order("starts_at", { ascending: false })
    .limit(20);

  return (rawEvents || []).map((e: any) => ({
    id: e.id,
    title: e.title,
    eventType: e.event_type as EventType,
    city: e.city,
    groupCode: e.group_code || null,
    displayLabel: `${EVENT_TYPE_LABELS[e.event_type as EventType]?.emoji || "🏛️"} ${e.title} (${e.city}${e.group_code ? ` - ${e.group_code}` : ""})`,
  }));
});
