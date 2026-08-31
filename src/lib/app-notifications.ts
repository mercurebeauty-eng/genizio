// Notifications (2026-08-15, Confiance Mentor) — orchestration des trois canaux :
//   1. in-app (app_notifications) — canal pull historique, badge + liste ;
//   2. push (Web Push VAPID, push-notifications.ts) — canal actif, PWA ;
//   3. email (Brevo, notification-email.functions.ts) — supplément, idempotent.
//
// Le canal in-app est TOUJOURS écrit ; push/email sont optionnels (channels) et
// fire-and-forget non-bloquant : une erreur de notification ne fait JAMAIS échouer
// l'action qui l'a déclenchée (même pattern que logMentorAction).

export async function notifyUser(params: {
  userId: string;
  type: string;
  childId?: string | null;
  payload?: Record<string, unknown>;
  channels?: { push?: boolean; email?: boolean };
}): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // (supabaseAdmin as any) : table service-role (même convention que le reste des
    // tables internes — cast systématique).
    await (supabaseAdmin as any).from("app_notifications").insert({
      user_id: params.userId,
      type: params.type,
      child_profile_id: params.childId ?? null,
      payload: params.payload ?? {},
    });

    const channels = params.channels ?? {};
    if (channels.push) {
      const { sendPushToUser } = await import("./push-notifications");
      void sendPushToUser(supabaseAdmin as any, params.userId, buildPushPayload(params));
    }
    if (channels.email) {
      const { sendNotificationEmail, emailForEvent } =
        await import("./notification-email.functions");
      void sendEmailForEvent(supabaseAdmin as any, params);
    }
  } catch (err) {
    console.error("app_notifications insert failed (non-fatal):", err);
  }
}

// ── Payload push par type ────────────────────────────────────────────────────

function buildPushPayload(params: {
  userId: string;
  type: string;
  childId?: string | null;
  payload?: Record<string, unknown>;
}): { title: string; body: string; url: string } {
  const childId = params.childId;
  const parentUrl = childId ? `/profiles/${childId}/mentors` : "/profiles";
  const p = params.payload ?? {};
  switch (params.type) {
        case "collective_discovery_tagged":
      return {
        title: "👥 Nouveau projet d'équipe partagé !",
        body: `${p.authorName} a mentionné l'enfant dans un projet collectif : '${p.title}'.`,
        url: childId ? `/profiles/${childId}/decouverte` : "/profiles",
      };
    case "mentor_session_to_validate":
      return {
        title: "Séance à valider",
        body: "Un mentor a déclaré une séance — confirmez-la pour la rendre officielle.",
        url: parentUrl,
      };
    case "mentor_bilan_submitted":
      return {
        title: "Bilan à valider",
        body: "Le mentor a soumis le bilan de fin de période.",
        url: parentUrl,
      };
    case "mentor_session_confirmed":
      return {
        title: "Séance confirmée",
        body: "Le parent a confirmé votre séance. Merci !",
        url: "/mentor",
      };
    case "mentor_bilan_validated":
      return {
        title: "Bilan validé",
        body: "Le parent a validé votre bilan de fin de période.",
        url: "/mentor",
      };
    case "mentor_bilan_rejected":
      return {
        title: "Modifications demandées",
        body: "Le parent demande des corrections sur votre bilan.",
        url: "/mentor",
      };
    case "mentor_session_planned":
      return {
        title: "Séance planifiée",
        body: "Votre mentor a planifié une séance — le créneau est visible dans le hub Mentor.",
        url: parentUrl,
      };
    case "mentor_session_contested":
      return {
        title: "Séance contestée",
        body: "Le parent conteste une séance déclarée — elle ne compte ni pour le score ni pour le paiement.",
        url: "/mentor",
      };
    case "mentor_status_changed": {
      const to = (p.to as string) ?? "actif";
      return {
        title: "Votre statut a changé",
        body:
          to === "suspended"
            ? "Votre compte est suspendu — le score de fiabilité doit remonter."
            : to === "warning"
              ? "Votre compte est en alerte — retrouvez le niveau."
              : "Votre compte est de nouveau actif.",
        url: "/mentor",
      };
    }
    default:
      return { title: "Génizio", body: params.type, url: parentUrl };
  }
}

// ── Email par événement (idempotent via consent_events) ──────────────────────

async function sendEmailForEvent(
  supabaseAdmin: any,
  params: {
    userId: string;
    type: string;
    childId?: string | null;
    payload?: Record<string, unknown>;
  },
): Promise<void> {
  try {
    const { sendNotificationEmail, emailForEvent } = await import("./notification-email.functions");
    const childId = params.childId;
    let childName: string | null = null;
    if (childId) {
      const { data } = await supabaseAdmin
        .from("child_profiles")
        .select("name")
        .eq("id", childId)
        .maybeSingle();
      childName = data?.name ?? null;
    }
    const p = params.payload ?? {};
    const email = emailForEvent({
      type: params.type,
      childName,
      from: p.from as string | undefined,
      to: p.to as string | undefined,
      score: typeof p.score === "number" ? p.score : undefined,
      feedback: p.feedback as string | null | undefined,
      date: (p.occurred_at ?? p.planned_at) as string | undefined,
    });
    if (!email) return;
    await sendNotificationEmail({
      supabaseAdmin,
      userId: params.userId,
      eventKey: `${params.type}:${childId ?? "all"}:${(p.session_id as string) ?? (p.report_id as string) ?? (p.occurred_at as string) ?? "x"}`,
      subject: email.subject,
      html: email.html,
    });
  } catch (err) {
    console.error("sendEmailForEvent failed (non-fatal):", err);
  }
}

