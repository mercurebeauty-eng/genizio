// Notifications (2026-08-15, Confiance Mentor) â€” orchestration des trois canaux :
//   1. in-app (app_notifications) â€” canal pull historique, badge + liste ;
//   2. push (Web Push VAPID, push-notifications.ts) â€” canal actif, PWA ;
//   3. email (Brevo, notification-email.functions.ts) â€” supplÃ©ment, idempotent.
//
// Le canal in-app est TOUJOURS Ã©crit ; push/email sont optionnels (channels) et
// fire-and-forget non-bloquant : une erreur de notification ne fait JAMAIS Ã©chouer
// l'action qui l'a dÃ©clenchÃ©e (mÃªme pattern que logMentorAction).

export async function notifyUser(params: {
  userId: string;
  type: string;
  childId?: string | null;
  payload?: Record<string, unknown>;
  channels?: { push?: boolean; email?: boolean };
}): Promise<void> {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // (supabaseAdmin as any) : table service-role (mÃªme convention que le reste des
    // tables internes â€” cast systÃ©matique).
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

// â”€â”€ Payload push par type â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
        title: "SÃ©ance Ã  valider",
        body: "Un mentor a dÃ©clarÃ© une sÃ©ance â€” confirmez-la pour la rendre officielle.",
        url: parentUrl,
      };
    case "mentor_bilan_submitted":
      return {
        title: "Bilan Ã  valider",
        body: "Le mentor a soumis le bilan de fin de pÃ©riode.",
        url: parentUrl,
      };
    case "mentor_session_confirmed":
      return {
        title: "SÃ©ance confirmÃ©e",
        body: "Le parent a confirmÃ© votre sÃ©ance. Merci !",
        url: "/mentor",
      };
    case "mentor_bilan_validated":
      return {
        title: "Bilan validÃ©",
        body: "Le parent a validÃ© votre bilan de fin de pÃ©riode.",
        url: "/mentor",
      };
    case "mentor_bilan_rejected":
      return {
        title: "Modifications demandÃ©es",
        body: "Le parent demande des corrections sur votre bilan.",
        url: "/mentor",
      };
    case "mentor_session_planned":
      return {
        title: "SÃ©ance planifiÃ©e",
        body: "Votre mentor a planifiÃ© une sÃ©ance â€” le crÃ©neau est visible dans le hub Mentor.",
        url: parentUrl,
      };
    case "mentor_session_contested":
      return {
        title: "SÃ©ance contestÃ©e",
        body: "Le parent conteste une sÃ©ance dÃ©clarÃ©e â€” elle ne compte ni pour le score ni pour le paiement.",
        url: "/mentor",
      };
    case "mentor_status_changed": {
      const to = (p.to as string) ?? "actif";
      return {
        title: "Votre statut a changÃ©",
        body:
          to === "suspended"
            ? "Votre compte est suspendu â€” le score de fiabilitÃ© doit remonter."
            : to === "warning"
              ? "Votre compte est en alerte â€” retrouvez le niveau."
              : "Votre compte est de nouveau actif.",
        url: "/mentor",
      };
    }
    default:
      return { title: "GÃ©nizio", body: params.type, url: parentUrl };
  }
}

// â”€â”€ Email par Ã©vÃ©nement (idempotent via consent_events) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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

