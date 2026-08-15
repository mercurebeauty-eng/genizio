// Planification des séances (2026-08-15, backlog « Ponctualité ») — server functions.
//
// Le mentor PLANIFIE un créneau (date + heure) pour un enfant assigné ; le parent
// est notifié. À la déclaration de la séance, le mentor peut lier le créneau
// (declareSessionMentor, paramètre slotId) — scheduled_at est dénormalisé sur la
// séance, la ponctualité = écart planifié vs réalisé (mentor-scheduling.ts).
//
// Règles : le créneau appartient à un enfant assigné ACTIF ; le mentor ne doit pas
// être suspendu/banni (même garde que declareSessionMentor). Aucune écriture sur
// les compteurs de séances (le créneau ne consomme rien — seule la déclaration
// débite le pack/campagne). Un créneau annulé ne notifie pas le parent (simple
// retrait de la liste à venir).

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { notifyUser } from "./app-notifications";

const PlanSlotInput = z.object({
  childProfileId: z.string().uuid(),
  plannedAt: z.string().datetime(),
  notes: z.string().max(2000).optional(),
});

/** Le mentor planifie un créneau pour un enfant assigné actif. */
export const planMentorSessionSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => PlanSlotInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = (context as any).claims?.sub;

    // Statut du mentor : un suspendu/banni ne peut pas planifier.
    const { data: profile } = await (supabaseAdmin as any)
      .from("mentor_profiles")
      .select("status")
      .eq("mentor_user_id", userId)
      .maybeSingle();
    const status = (profile?.status as string | undefined) ?? "active";
    if (status === "suspended" || status === "banned") {
      throw new Error(
        status === "banned"
          ? "Votre compte mentor est banni — contactez l'équipe Génizio."
          : "Votre compte mentor est suspendu — contactez l'équipe Génizio.",
      );
    }

    // L'enfant doit être assigné à CE mentor, encore actif.
    const { data: assignment } = await (supabaseAdmin as any)
      .from("mentors")
      .select("id")
      .eq("mentor_user_id", userId)
      .eq("child_profile_id", data.childProfileId)
      .is("removed_at", null)
      .maybeSingle();
    if (!assignment) {
      throw new Error("Cet enfant n'est pas (plus) assigné à votre suivi.");
    }

    const { data: slot, error } = await (supabaseAdmin as any)
      .from("mentor_session_slots")
      .insert({
        mentor_user_id: userId,
        child_profile_id: data.childProfileId,
        planned_at: data.plannedAt,
        notes: data.notes ?? null,
      })
      .select("id, planned_at")
      .single();
    if (error) throw new Error(`Erreur lors de la planification: ${error.message}`);

    // Le parent est notifié du créneau prévu (canal in-app + push + email).
    const { data: childOwner } = await (supabaseAdmin as any)
      .from("child_profiles")
      .select("user_id")
      .eq("id", data.childProfileId)
      .maybeSingle();
    if (childOwner?.user_id) {
      void notifyUser({
        userId: childOwner.user_id,
        type: "mentor_session_planned",
        childId: data.childProfileId,
        payload: { slot_id: slot?.id, planned_at: data.plannedAt },
        channels: { push: true, email: true },
      });
    }

    return { success: true, slotId: slot?.id };
  });

const CancelSlotInput = z.object({ slotId: z.string().uuid() });

/** Le mentor annule un créneau planifié (le parent n'est pas notifié — retrait silencieux). */
export const cancelMentorSessionSlot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => CancelSlotInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = (context as any).claims?.sub;

    // Le créneau doit appartenir à CE mentor et être encore planifié.
    const { data: claimed } = await (supabaseAdmin as any)
      .from("mentor_session_slots")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancelled_by: userId,
      })
      .eq("id", data.slotId)
      .eq("mentor_user_id", userId)
      .eq("status", "planned")
      .select("id")
      .maybeSingle();
    if (!claimed) throw new Error("Ce créneau n'existe plus ou a déjà été annulé.");

    return { success: true };
  });

/** Créneaux planifiés (non annulés) du mentor — pour l'affichage et le sélecteur
 *  de la modale de déclaration. Les plus récents d'abord, borné 50. */
export const listMyPlannedSlots = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = (context as any).claims?.sub;

    const { data, error } = await (supabaseAdmin as any)
      .from("mentor_session_slots")
      .select("id, child_profile_id, planned_at, notes, created_at, child_profiles(name)")
      .eq("mentor_user_id", userId)
      .eq("status", "planned")
      .order("planned_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);

    return (data ?? []).map((s: any) => ({
      id: s.id,
      child_profile_id: s.child_profile_id,
      child_name: (s.child_profiles as any)?.name ?? "Enfant",
      planned_at: s.planned_at as string,
      notes: s.notes as string | null,
    }));
  });

const ChildPlannedSlotsInput = z.object({ childId: z.string().uuid() });

/** Créneaux planifiés à venir d'un enfant (hub parent) — ownership vérifiée. */
export const listChildPlannedSlots = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => ChildPlannedSlotsInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = (context as any).claims?.sub;

    const { data: child } = await (supabaseAdmin as any)
      .from("child_profiles")
      .select("id, user_id")
      .eq("id", data.childId)
      .maybeSingle();
    if (!child || child.user_id !== userId) throw new Error("Profil enfant introuvable.");

    const { data: slots, error } = await (supabaseAdmin as any)
      .from("mentor_session_slots")
      .select("id, planned_at, notes, created_at")
      .eq("child_profile_id", data.childId)
      .eq("status", "planned")
      .gte("planned_at", new Date().toISOString())
      .order("planned_at", { ascending: true })
      .limit(20);
    if (error) throw new Error(error.message);

    return (slots ?? []) as {
      id: string;
      planned_at: string;
      notes: string | null;
      created_at: string;
    }[];
  });
