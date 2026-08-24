// Email de notification (2026-08-15, Confiance Mentor) : en plus de la ligne
// in-app (app_notifications) et du push, certains événements mentor envoient un
// email au parent ou au mentor (séance à valider, bilan soumis, bilan validé/
// refusé, changement de statut). Même infra que les emails de paiement :
// nodemailer / SMTP Brevo, import dynamique (jamais dans le bundle client).
//
// Idempotence : consent_events avec event_type `notification_email_sent:<type>:<id>`
// — un événement ne produit qu'un seul email, même si le déclencheur tourne deux
// fois (pattern verifyAndLog). Fire-and-forget : jamais bloquant. No-op si la
// config SMTP Brevo est absente ou si l'utilisateur n'a pas d'email.

import nodemailer from "nodemailer";

export type NotificationEmailParams = {
  supabaseAdmin: any;
  userId: string;
  /** Identifiant unique de l'événement (ex. sessionId, reportId) — l'idempotence
   *  repose sur lui : un même événement ne mail qu'une fois. */
  eventKey: string;
  subject: string;
  html: string;
};

export async function sendNotificationEmail(params: NotificationEmailParams): Promise<boolean> {
  const { supabaseAdmin, userId, eventKey, subject, html } = params;
  try {
    const eventType = `notification_email_sent:${eventKey}`;

    const { data: existing } = await supabaseAdmin
      .from("consent_events")
      .select("id")
      .eq("user_id", userId)
      .eq("event_type", eventType)
      .limit(1);
    if (existing && existing.length > 0) return false; // déjà envoyé

    const { data: user } = await supabaseAdmin.auth.admin.getUserById(userId);
    const to = user?.user?.email;
    if (!to) return false;

    const smtpHost = process.env.BREVO_SMTP_HOST;
    const smtpPort = Number(process.env.BREVO_SMTP_PORT ?? "587");
    const smtpUser = process.env.BREVO_SMTP_USER;
    const smtpPassword = process.env.BREVO_SMTP_PASSWORD;
    if (!smtpHost || !smtpUser || !smtpPassword) return false;

    const senderEmail = process.env.BREVO_FROM_EMAIL || "serviceclient@genizio.com";
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPassword },
    });
    await transporter.sendMail({
      from: `"L'équipe Génizio" <${senderEmail}>`,
      replyTo: senderEmail,
      to,
      subject,
      html,
    });

    await supabaseAdmin.from("consent_events").insert({
      user_id: userId,
      event_type: eventType,
      description: subject,
    });
    return true;
  } catch (err) {
    console.error("sendNotificationEmail failed (non-fatal):", err);
    return false;
  }
}

// ── Gabarits des événements mentor ────────────────────────────────────────────
// HTML minimaliste, même ton que les emails de paiement (Génizio, fr).

function shell(title: string, lines: string[], cta?: { label: string; url: string }): string {
  return `
  <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1c1917">
    <h2 style="margin:0 0 16px;font-size:20px;color:#4f46e5">${title}</h2>
    ${lines.map((l) => `<p style="margin:6px 0;font-size:14px;line-height:1.6">${l}</p>`).join("")}
    ${cta ? `<p style="margin:20px 0 0"><a href="${cta.url}" style="display:inline-block;background:#4f46e5;color:#fff;padding:10px 18px;border-radius:10px;text-decoration:none;font-size:14px;font-weight:bold">${cta.label}</a></p>` : ""}
    <p style="margin:24px 0 0;font-size:12px;color:#78716c">L'équipe Génizio</p>
  </div>`;
}

export function sessionToValidateEmailHtml(childName: string | null, date: string): string {
  return shell(
    "Une séance attend votre confirmation",
    [
      childName
        ? `Le mentor de ${childName} a déclaré une séance le ${date}.`
        : `Votre mentor a déclaré une séance le ${date}.`,
      "Confirmez-la pour qu'elle compte dans le suivi : c'est votre validation qui rend la séance officielle (score, points et paiement du mentor).",
    ],
    { label: "Confirmer la séance", url: "/profiles" },
  );
}

export function bilanSubmittedEmailHtml(childName: string | null): string {
  return shell(
    "Le bilan de fin est prêt à valider",
    [
      childName
        ? `Le mentor de ${childName} a soumis le bilan de fin de période.`
        : "Votre mentor a soumis le bilan de fin de période.",
      "Validez-le pour en faire le livrable officiel de la période.",
    ],
    { label: "Voir le bilan", url: "/profiles" },
  );
}

export function bilanDecidedEmailHtml(
  childName: string | null,
  validated: boolean,
  feedback: string | null,
): string {
  return shell(
    validated ? "Votre bilan a été validé" : "Des modifications sont demandées sur votre bilan",
    validated
      ? [
          childName
            ? `Le parent de ${childName} a validé votre bilan de fin de période. Merci !`
            : "Le parent a validé votre bilan de fin de période. Merci !",
        ]
      : [
          childName
            ? `Le parent de ${childName} demande des modifications sur votre bilan.`
            : "Le parent demande des modifications sur votre bilan.",
          feedback ? `Motif : ${feedback}` : "Ouvrez l'application pour voir le détail.",
        ],
  );
}

export function statusChangedEmailHtml(
  mentorEmail: string | null,
  from: string,
  to: string,
  score: number,
): string {
  const label = to === "suspended" ? "suspendu" : to === "warning" ? "averti" : "de nouveau actif";
  return shell(`Votre statut mentor est passé à « ${label} »`, [
    `Votre score de fiabilité (${score}/100 sur les 30 derniers jours) a franchi un seuil : votre compte est maintenant ${label}.`,
    to === "suspended"
      ? "Vous ne pouvez plus déclarer de séances ni opérer les défis tant que le score ne remonte pas."
      : to === "warning"
        ? "Votre accès est conservé, mais retrouvez le niveau pour éviter la suspension."
        : "Vous retrouvez l'accès complet.",
    "Contactez l'équipe Génizio pour toute question.",
  ]);
}

// ── Mappeur événement → email (appelé par notifyUser, app-notifications.ts) ────

export function emailForEvent(params: {
  type: string;
  childName: string | null;
  from?: string;
  to?: string;
  score?: number;
  feedback?: string | null;
  date?: string;
}): { subject: string; html: string } | null {
  const dateLabel = params.date
    ? new Date(params.date).toLocaleDateString("fr-FR", { day: "numeric", month: "long" })
    : "";
  switch (params.type) {
    case "mentor_session_to_validate":
      return {
        subject: "Une séance attend votre confirmation",
        html: sessionToValidateEmailHtml(params.childName, dateLabel || "récemment"),
      };
    case "mentor_bilan_submitted":
      return {
        subject: "Le bilan de fin est prêt à valider",
        html: bilanSubmittedEmailHtml(params.childName),
      };
    case "mentor_bilan_validated":
      return {
        subject: "Votre bilan a été validé",
        html: bilanDecidedEmailHtml(params.childName, true, null),
      };
    case "mentor_bilan_rejected":
      return {
        subject: "Des modifications sont demandées sur votre bilan",
        html: bilanDecidedEmailHtml(params.childName, false, params.feedback ?? null),
      };
    case "mentor_session_confirmed":
      return {
        subject: "Votre séance a été confirmée",
        html: shell(
          "Séance confirmée par le parent",
          [
            params.childName
              ? `La séance de ${params.childName} a été confirmée par le parent — elle compte dans votre score et votre payout.`
              : "Une de vos séances a été confirmée par le parent — elle compte dans votre score et votre payout.",
          ],
          { label: "Voir mon tableau de bord", url: "/mentor" },
        ),
      };
    case "mentor_session_planned":
      return {
        subject: "Une séance est planifiée",
        html: shell(
          "Séance planifiée par le mentor",
          [
            params.childName
              ? `Votre mentor a planifié une séance pour ${params.childName}${params.date ? ` le ${params.date}` : ""}.`
              : `Votre mentor a planifié une séance${params.date ? ` le ${params.date}` : ""}.`,
            "Vous verrez le créneau dans le hub Mentor.",
          ],
          { label: "Voir le hub Mentor", url: "/profiles" },
        ),
      };
    case "mentor_session_contested":
      return {
        subject: "Une séance a été contestée",
        html: shell(
          "Séance contestée par le parent",
          [
            "Le parent conteste une séance que vous avez déclarée — elle ne compte ni pour votre score ni pour votre paiement. Contactez la famille si besoin.",
          ],
          { label: "Voir mon tableau de bord", url: "/mentor" },
        ),
      };
    case "mentor_status_changed": {
      if (typeof params.score !== "number") return null;
      return {
        subject: `Votre statut mentor est passé à « ${params.to === "suspended" ? "suspendu" : params.to === "warning" ? "averti" : "actif"} »`,
        html: statusChangedEmailHtml(
          null,
          params.from ?? "active",
          params.to ?? "active",
          params.score,
        ),
      };
    }
    default:
      return null;
  }
}
