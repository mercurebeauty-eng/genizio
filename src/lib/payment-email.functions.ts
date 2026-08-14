// Email de confirmation de paiement (2026-08-09, demande utilisateur) : à la
// validation d'un paiement Paystack (commande, accès enfant, passeport, slot,
// parrainage, abonnement famille), le parent reçoit un reçu par email — le flux
// ne s'arrête plus sur l'écran de succès. Template calqué sur le welcome email
// (même structure header/hero/contenu/footer, même infra SMTP Brevo).
//
// Idempotence : consent_events avec event_type dédié par référence Paystack —
// webhook ET page de retour peuvent déclencher sur le même paiement, un seul
// email part. Fire-and-forget : jamais bloquant pour la réponse de paiement.
//
// Serveur uniquement — importé dynamiquement (pattern verifyAndLog) pour ne
// jamais tirer nodemailer dans le bundle client.

import nodemailer from "nodemailer";

type PaymentMetadataLike = {
  type?: string;
  order_id?: string;
  child_id?: string;
  months?: number;
  sponsor_name?: string;
  target_child_name?: string;
};

export type PaymentEmailInfo = {
  user_id?: string | null;
  reference: string;
  amount_xof: number;
  currency?: string;
  metadata?: PaymentMetadataLike;
};

function formatAmount(amountXof: number): string {
  return `${new Intl.NumberFormat("fr-FR").format(amountXof)} FCFA`;
}

function formatDate(date: string | null | undefined): string {
  if (!date) return "";
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function resolveFirstName(
  user: { user_metadata?: Record<string, unknown> } | null | undefined,
): string {
  const full = user?.user_metadata?.full_name;
  if (typeof full === "string" && full.trim()) return full.trim().split(/\s+/)[0];
  return "";
}

async function getParentEmail(
  supabaseAdmin: any,
  userId: string | null | undefined,
): Promise<{ email: string | null; firstName: string }> {
  if (!userId) return { email: null, firstName: "" };
  try {
    const { data } = await supabaseAdmin.auth.admin.getUserById(userId);
    return { email: data?.user?.email ?? null, firstName: resolveFirstName(data?.user ?? null) };
  } catch (err) {
    console.error("[payment-email] Échec getUserById:", err);
    return { email: null, firstName: "" };
  }
}

async function getChildName(
  supabaseAdmin: any,
  childId: string | null | undefined,
): Promise<string | null> {
  if (!childId) return null;
  const { data } = await supabaseAdmin
    .from("child_profiles")
    .select("name")
    .eq("id", childId)
    .maybeSingle();
  return data?.name ?? null;
}

async function alreadySent(
  supabaseAdmin: any,
  userId: string,
  eventType: string,
): Promise<boolean> {
  const { data, error } = await supabaseAdmin
    .from("consent_events")
    .select("id")
    .eq("user_id", userId)
    .eq("event_type", eventType)
    .limit(1);
  if (error) console.error("[payment-email] Vérification consent_events:", error.message);
  return !!data && data.length > 0;
}

async function markSent(
  supabaseAdmin: any,
  userId: string,
  eventType: string,
  description: string,
): Promise<void> {
  const { error } = await supabaseAdmin.from("consent_events").insert({
    user_id: userId,
    event_type: eventType,
    description,
  });
  if (error) console.error("[payment-email] Envoyé mais échec journalisation:", error.message);
}

async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  const smtpHost = process.env.BREVO_SMTP_HOST;
  const smtpPort = Number(process.env.BREVO_SMTP_PORT ?? "587");
  const smtpUser = process.env.BREVO_SMTP_USER;
  const smtpPassword = process.env.BREVO_SMTP_PASSWORD;
  if (!smtpHost || !smtpUser || !smtpPassword) {
    console.error("[payment-email] Configuration SMTP Brevo manquante dans .env");
    return false;
  }

  const senderEmail = process.env.BREVO_FROM_EMAIL || "serviceclient@genizio.com";
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPassword },
  });

  try {
    await transporter.sendMail({
      from: `"L'équipe Génizio" <${senderEmail}>`,
      replyTo: senderEmail,
      to,
      subject,
      html,
    });
    return true;
  } catch (err) {
    console.error("[payment-email] Échec d'envoi SMTP:", err);
    return false;
  }
}

type EmailContent = {
  firstName: string;
  purchaseTitle: string;
  amountLabel: string;
  items: string[];
  reference: string;
  nextSteps: string[];
};

function buildPaymentEmailHtml(c: EmailContent): string {
  const logoUrl = "https://www.genizio.com/email/logo-genizio.png";
  const nayaUrl = "https://www.genizio.com/email/naya-mascot.png";
  const siteUrl =
    (process.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, "") ||
    "https://www.genizio.com";
  const appLink = `${siteUrl}/profiles`;
  const whatsappNumber =
    (process.env.VITE_WHATSAPP_NUMBER as string | undefined)?.replace(/\D/g, "") || "33606433148";
  const whatsappLink = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(
    "Bonjour, j'ai une question sur ma commande Génizio.",
  )}`;
  const greeting = c.firstName ? `${c.firstName}, ` : "";

  const stepsHtml = c.nextSteps
    .map(
      (step, i) => `
      <tr>
        <td width="40" valign="top" style="padding-bottom:16px;">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="28" height="28" style="background-color:#151270; border-radius:50%;">
            <tr><td align="center" valign="middle" style="font-family:Arial, Helvetica, sans-serif; font-size:13px; font-weight:800; color:#FFFFFF; line-height:28px;">${i + 1}</td></tr>
          </table>
        </td>
        <td valign="top" style="padding:0 0 16px 12px; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:20px; color:#3B3856;">${step}</td>
      </tr>`,
    )
    .join("");

  const itemsHtml = c.items
    .map(
      (item) =>
        `<p style="margin:0 0 6px 0; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:21px; color:#3B3856;">${item}</p>`,
    )
    .join("");

  return `<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Paiement confirmé — Génizio</title>
<!--[if mso]>
<noscript>
<xml>
<o:OfficeDocumentSettings>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
</noscript>
<style>
  table, td { border-collapse: collapse; }
  * { font-family: Arial, Helvetica, sans-serif !important; }
</style>
<![endif]-->
<style>
  body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
  table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  img { -ms-interpolation-mode: bicubic; border: 0; line-height: 100%; outline: none; text-decoration: none; }
  body { margin: 0; padding: 0; width: 100% !important; background-color: #F3F1FA; }
  a { color: #FE8212; }
  @media screen and (max-width: 600px) {
    .email-container { width: 100% !important; max-width: 100% !important; }
    .mobile-padding { padding-left: 24px !important; padding-right: 24px !important; }
    .hero-title { font-size: 24px !important; line-height: 32px !important; }
  }
</style>
</head>
<body style="margin:0; padding:0; background-color:#F3F1FA;">

  <div style="display:none; max-height:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:#F3F1FA;">
    Votre paiement de ${c.amountLabel} est confirmé. Merci pour votre confiance !
    &#8203;&#847; &#8203;&#847; &#8203;&#847; &#8203;&#847; &#8203;&#847; &#8203;&#847; &#8203;&#847; &#8203;&#847; &#8203;&#847;
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F3F1FA;">
    <tr>
      <td align="center" style="padding: 32px 16px;">
        <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px;">

          <!-- EN-TÊTE / LOGO -->
          <tr>
            <td align="center" style="background-color:#FFFFFF; border-radius:20px 20px 0 0; padding:32px 24px 20px 24px;">
              <img src="${logoUrl}" width="200" alt="Génizio — Libérez le génie de votre enfant" style="display:block; width:200px; max-width:200px; height:auto;">
            </td>
          </tr>

          <!-- HERO — paiement confirmé -->
          <tr>
            <td align="center" class="mobile-padding" style="background-color:#FFFFFF; padding:8px 40px 32px 40px;">
              <p style="margin:0 0 12px 0; font-family:Arial, Helvetica, sans-serif; font-size:12px; font-weight:700; letter-spacing:1.5px; color:#0B7A47; text-transform:uppercase;">
                Paiement confirmé
              </p>
              <h1 class="hero-title" style="margin:0 0 10px 0; font-family:Arial, Helvetica, sans-serif; font-size:28px; line-height:36px; font-weight:800; color:#151270;">
                Merci ${greeting}🎉
              </h1>
              <p style="margin:0 0 20px 0; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:24px; color:#4A4768;">
                Votre paiement a bien été reçu et validé.
              </p>
              <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:32px; line-height:40px; font-weight:800; color:#0B7A47;">
                ${c.amountLabel}
              </p>
              <p style="margin:8px 0 0 0; font-family:Arial, Helvetica, sans-serif; font-size:12px; color:#9491AC;">
                Référence : ${c.reference}
              </p>
            </td>
          </tr>

          <!-- CITATION + NAYA -->
          <tr>
            <td style="background-color:#151270; padding:28px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td width="88" valign="middle" style="padding-right:16px;">
                    <img src="${nayaUrl}" width="72" alt="Naya" style="display:block; width:72px; max-width:72px; height:auto;">
                  </td>
                  <td valign="middle">
                    <p style="margin:0; font-family:Georgia, 'Times New Roman', serif; font-style:italic; font-size:15px; line-height:23px; color:#FFFFFF;">
                      « Personne n'est nul. Chaque enfant a un génie en lui — notre rôle est de vous aider à le révéler. »
                    </p>
                    <p style="margin:10px 0 0 0; font-family:Arial, Helvetica, sans-serif; font-size:12px; color:#B9B6E0;">
                      — Naya, l'IA qui accompagne Génizio
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- DÉTAIL DE L'ACHAT -->
          <tr>
            <td class="mobile-padding" style="background-color:#FFFFFF; padding:32px 40px 8px 40px;">
              <h2 style="margin:0 0 16px 0; font-family:Arial, Helvetica, sans-serif; font-size:18px; line-height:26px; font-weight:800; color:#151270;">
                ${c.purchaseTitle}
              </h2>
              <div style="background-color:#F7F6FD; border-radius:16px; padding:20px 24px;">
                ${itemsHtml || `<p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:21px; color:#3B3856;">Merci pour votre confiance — tout est en ordre.</p>`}
              </div>
              <p style="margin:14px 0 0 0; font-family:Arial, Helvetica, sans-serif; font-size:12px; color:#9491AC;">
                Paiement traité le ${formatDate(new Date().toISOString())}.
              </p>
            </td>
          </tr>

          <!-- ET MAINTENANT ? -->
          <tr>
            <td class="mobile-padding" style="background-color:#FFFFFF; padding:24px 40px 8px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#E7F7EF; border-radius:16px;">
                <tr>
                  <td style="padding:24px 28px 8px 28px;">
                    <h3 style="margin:0 0 18px 0; font-family:Arial, Helvetica, sans-serif; font-size:16px; font-weight:800; color:#151270;">
                      Et maintenant ?
                    </h3>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      ${stepsHtml}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA -->
          <tr>
            <td align="center" style="background-color:#FFFFFF; padding:24px 40px 8px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="border-radius:999px; background-color:#FE8212;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${appLink}" style="height:52px;v-text-anchor:middle;width:240px;" arcsize="50%" stroke="f" fillcolor="#FE8212">
                    <w:anchorlock/>
                    <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">Accéder à mon espace</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a href="${appLink}" target="_blank" style="display:inline-block; padding:16px 32px; font-family:Arial, Helvetica, sans-serif; font-size:16px; font-weight:700; color:#FFFFFF; text-decoration:none; border-radius:999px;">
                      Accéder à mon espace
                    </a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- WHATSAPP SUPPORT -->
          <tr>
            <td class="mobile-padding" style="background-color:#FFFFFF; padding:20px 40px 36px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#151270; border-radius:16px;">
                <tr>
                  <td align="center" style="padding:26px 24px;">
                    <p style="margin:0 0 4px 0; font-family:Arial, Helvetica, sans-serif; font-size:15px; font-weight:700; color:#FFFFFF;">
                      Une question sur votre commande ?
                    </p>
                    <p style="margin:0 0 18px 0; font-family:Arial, Helvetica, sans-serif; font-size:13px; line-height:19px; color:#C4C1E8;">
                      Notre équipe vous répond en direct sur WhatsApp.
                    </p>
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td align="center" style="border-radius:999px; background-color:#25D366;">
                          <a href="${whatsappLink}" target="_blank" style="display:inline-block; padding:13px 26px; font-family:Arial, Helvetica, sans-serif; font-size:14px; font-weight:700; color:#FFFFFF; text-decoration:none; border-radius:999px;">
                            💬&nbsp; Discuter sur WhatsApp
                          </a>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- PIED DE PAGE -->
          <tr>
            <td align="center" class="mobile-padding" style="background-color:#F3F1FA; border-radius:0 0 20px 20px; padding:28px 32px 36px 32px;">
              <p style="margin:0 0 6px 0; font-family:Arial, Helvetica, sans-serif; font-size:13px; font-weight:800; color:#151270;">
                Génizio
              </p>
              <p style="margin:0 0 16px 0; font-family:Arial, Helvetica, sans-serif; font-size:11px; color:#8B88A6;">
                Libérez le génie de votre enfant
              </p>
              <p style="margin:0 0 4px 0; font-family:Arial, Helvetica, sans-serif; font-size:11px; line-height:17px; color:#9491AC;">
                Vous recevez cet email car un paiement a été effectué sur votre compte Génizio.
              </p>
              <p style="margin:0 0 16px 0; font-family:Arial, Helvetica, sans-serif; font-size:11px; line-height:17px; color:#9491AC;">
                Abidjan, Côte d'Ivoire
              </p>
              <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:11px; color:#9491AC;">
                © 2026 Génizio. Tous droits réservés.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`;
}

/**
 * Reçu pour un paiement one-shot (commande, accès enfant, passeport, slot, parrainage).
 * Fire-and-forget : appelé après le fulfillment, ne doit jamais bloquer la réponse.
 */
export async function sendPaymentConfirmationEmail(
  supabaseAdmin: any,
  payment: PaymentEmailInfo,
): Promise<{ sent: boolean; reason?: string }> {
  if (!payment.user_id) return { sent: false, reason: "no_user" };
  const { email, firstName } = await getParentEmail(supabaseAdmin, payment.user_id);
  if (!email) return { sent: false, reason: "no_email" };

  const eventType = `payment_email_sent:${payment.reference}`;
  if (await alreadySent(supabaseAdmin, payment.user_id, eventType)) {
    return { sent: false, reason: "already_sent" };
  }

  const metadata = payment.metadata ?? {};
  const childName = await getChildName(supabaseAdmin, metadata.child_id);
  let purchaseTitle = "Votre paiement Génizio";
  let items: string[] = [];
  let nextSteps: string[] = [
    "Tout est déjà activé sur votre compte.",
    "Retrouvez les défis et le portfolio de votre enfant dans l'application.",
  ];

  switch (metadata.type) {
    case "order": {
      const { data: order } = await supabaseAdmin
        .from("orders")
        .select("items, total_price_xof")
        .eq("id", metadata.order_id)
        .maybeSingle();
      const raw = (order?.items ?? []) as unknown;
      if (Array.isArray(raw)) {
        for (const it of raw) {
          if (typeof it === "string") items.push(`✓ ${it}`);
          else if (it && typeof it === "object" && "label" in it) {
            const label = (it as { label?: string; qty?: number }).label;
            const qty = (it as { qty?: number }).qty;
            if (label) items.push(`✓ ${label}${qty && qty > 1 ? ` ×${qty}` : ""}`);
          }
        }
      }
      if (order?.total_price_xof)
        purchaseTitle = `Votre commande Génizio — ${formatAmount(order.total_price_xof)}`;
      nextSteps = [
        "Notre équipe prépare votre commande.",
        "Le suivi de livraison se fait directement sur WhatsApp.",
      ];
      break;
    }
    case "child_access": {
      purchaseTitle = childName ? `Accès mensuel de ${childName}` : "Accès mensuel enfant";
      items = [
        childName ? `✓ Accès de ${childName} prolongé` : "✓ Accès mensuel prolongé",
        metadata.months ? `✓ Durée : ${metadata.months} mois` : "",
      ].filter(Boolean);
      nextSteps = [
        "L'accès est actif immédiatement.",
        "Reprenez vos défis là où vous les aviez laissés.",
      ];
      break;
    }
    case "passport": {
      purchaseTitle = childName
        ? `Passeport d'Excellence de ${childName}`
        : "Passeport d'Excellence";
      items = ["✓ Passeport d'Excellence débloqué"];
      nextSteps = ["Téléchargez le Passeport depuis l'onglet Portfolio de votre enfant."];
      break;
    }
    case "extra_slots": {
      purchaseTitle = "Palier supplémentaire";
      items = ["✓ Un palier de 5 profils supplémentaires a été ajouté à votre compte"];
      nextSteps = [
        "Vous pouvez désormais enregistrer jusqu'à 5 enfants de plus.",
        "Créez le nouveau profil enfant depuis votre tableau de bord.",
      ];
      break;
    }
    case "accompaniment_pack": {
      purchaseTitle = childName ? `Pack Accompagnement de ${childName}` : "Pack Accompagnement";
      items = [
        childName ? `✓ ${metadata.months ?? 1} mois d'accompagnement pour ${childName}` : "",
        `✓ ${(metadata.months ?? 1) * 12} séances créditées (12 séances/mois)`,
      ].filter(Boolean);
      nextSteps = [
        "Un superviseur formé prend contact avec vous pour planifier les séances.",
        "Le bilan initial est inclus dans le premier mois.",
      ];
      break;
    }
    case "sponsorship": {
      purchaseTitle = "Parrainage Génizio";
      items = [
        `✓ Parrainage de ${metadata.target_child_name ?? "l'enfant bénéficiaire"} (${metadata.months ?? 1} mois)`,
        metadata.sponsor_name ? `✓ Parrain : ${metadata.sponsor_name}` : "",
      ].filter(Boolean);
      nextSteps = [
        "Votre code de parrainage a été généré automatiquement.",
        "Il a été transmis à la famille bénéficiaire pour activer l'accès.",
      ];
      break;
    }
    default: {
      items = ["✓ Paiement reçu et validé"];
      break;
    }
  }

  const html = buildPaymentEmailHtml({
    firstName,
    purchaseTitle,
    amountLabel: formatAmount(payment.amount_xof),
    items,
    reference: payment.reference,
    nextSteps,
  });

  const sent = await sendEmail(
    email,
    `✅ Paiement confirmé — ${formatAmount(payment.amount_xof)} · Génizio`,
    html,
  );
  if (sent) {
    await markSent(
      supabaseAdmin,
      payment.user_id,
      eventType,
      `Email de confirmation de paiement envoyé (${payment.reference})`,
    );
  }
  return { sent, reason: sent ? undefined : "smtp_failed" };
}

/**
 * Reçu pour l'abonnement famille (activation ou renouvellement). Même idempotence
 * par référence Paystack, même fire-and-forget.
 */
export async function sendSubscriptionConfirmationEmail(
  supabaseAdmin: any,
  params: {
    userId?: string | null;
    reference: string;
    priceXof?: number | null;
    periodEnd?: string | null;
    planLabel?: string | null;
  },
): Promise<{ sent: boolean; reason?: string }> {
  if (!params.userId) return { sent: false, reason: "no_user" };
  const { email, firstName } = await getParentEmail(supabaseAdmin, params.userId);
  if (!email) return { sent: false, reason: "no_email" };

  const eventType = `subscription_email_sent:${params.reference}`;
  if (await alreadySent(supabaseAdmin, params.userId, eventType)) {
    return { sent: false, reason: "already_sent" };
  }

  const periodEndLabel = params.periodEnd ? formatDate(params.periodEnd) : "";
  const amountLabel = params.priceXof ? formatAmount(params.priceXof) : "";

  const html = buildPaymentEmailHtml({
    firstName,
    purchaseTitle: params.planLabel ?? "Abonnement famille Génizio",
    amountLabel,
    items: [
      periodEndLabel
        ? `✓ Prochaine reconduction : ${periodEndLabel}`
        : "✓ Votre abonnement famille est actif",
    ],
    reference: params.reference,
    nextSteps: [
      "Votre abonnement famille est actif immédiatement.",
      "Créez le profil de chaque enfant pour commencer leurs défis.",
    ],
  });

  const sent = await sendEmail(
    email,
    `✅ Paiement confirmé — votre abonnement Génizio est actif`,
    html,
  );
  if (sent) {
    await markSent(
      supabaseAdmin,
      params.userId,
      eventType,
      `Email de confirmation d'abonnement envoyé (${params.reference})`,
    );
  }
  return { sent, reason: sent ? undefined : "smtp_failed" };
}
