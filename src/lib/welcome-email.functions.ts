import { createServerFn } from "@tanstack/react-start";
import nodemailer from "nodemailer";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Email de bienvenue (2026-07-30, demande utilisateur) : envoyé une seule fois, juste
// après la toute première connexion Google — avant même la création d'un profil enfant,
// puisque le contenu (CTA "Créer le profil de mon enfant", étapes 1-2-3) est justement
// pensé pour amener vers cette première création. D'où l'absence volontaire d'un prénom
// d'enfant dans le corps du mail : à ce stade, aucun profil n'existe encore.
//
// Idempotence : pas de nouvelle colonne/table pour ça — réutilise consent_events (déjà
// utilisée ailleurs pour tracer les événements liés à un compte) avec un event_type dédié,
// vérifié avant envoi. Sûr à appeler à chaque connexion, pas seulement à la première.
const WELCOME_EVENT_TYPE = "welcome_email_sent";

function buildWelcomeEmailHtml(firstName: string, appLink: string, whatsappLink: string): string {
  const logoUrl = "https://www.genizio.com/email/logo-genizio.png";
  const nayaUrl = "https://www.genizio.com/email/naya-mascot.png";

  return `<!DOCTYPE html>
<html lang="fr" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>Bienvenue chez Génizio</title>
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
    .section-title { font-size: 19px !important; line-height: 26px !important; }
    .feature-icon-cell { width: 48px !important; }
    .stack { display: block !important; width: 100% !important; }
    .step-num { width: 34px !important; height: 34px !important; line-height: 34px !important; font-size: 14px !important; }
  }
</style>
</head>
<body style="margin:0; padding:0; background-color:#F3F1FA;">

  <!-- Préheader (texte caché, visible seulement dans l'aperçu de la boîte de réception) -->
  <div style="display:none; max-height:0; overflow:hidden; mso-hide:all; font-size:1px; line-height:1px; color:#F3F1FA;">
    5 profils gratuits, des défis illimités et Naya à ses côtés. On démarre l'aventure ?
    &#8203;&#847; &#8203;&#847; &#8203;&#847; &#8203;&#847; &#8203;&#847; &#8203;&#847; &#8203;&#847; &#8203;&#847; &#8203;&#847; &#8203;&#847;
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F3F1FA;">
    <tr>
      <td align="center" style="padding: 32px 16px;">

        <!-- Conteneur principal -->
        <table role="presentation" class="email-container" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; max-width:600px;">

          <!-- ==================== EN-TÊTE / LOGO ==================== -->
          <tr>
            <td align="center" style="background-color:#FFFFFF; border-radius:20px 20px 0 0; padding:32px 24px 20px 24px;">
              <img src="${logoUrl}" width="200" alt="Génizio — Libérez le génie de votre enfant" style="display:block; width:200px; max-width:200px; height:auto;">
            </td>
          </tr>

          <!-- ==================== HERO ==================== -->
          <tr>
            <td align="center" class="mobile-padding" style="background-color:#FFFFFF; padding:8px 40px 36px 40px;">
              <p style="margin:0 0 12px 0; font-family:Arial, Helvetica, sans-serif; font-size:12px; font-weight:700; letter-spacing:1.5px; color:#FE8212; text-transform:uppercase;">
                Bienvenue dans l'aventure
              </p>
              <h1 class="hero-title" style="margin:0 0 16px 0; font-family:Arial, Helvetica, sans-serif; font-size:28px; line-height:36px; font-weight:800; color:#151270;">
                Bienvenue chez Génizio${firstName ? `, ${firstName}` : ""} 👋
              </h1>
              <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:15px; line-height:24px; color:#4A4768;">
                Vous venez de rejoindre des parents qui aident leur enfant à découvrir qui il est vraiment —
                au-delà des notes et des bulletins scolaires.
              </p>

              <!-- CTA principal (bulletproof button) -->
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px auto 0 auto;">
                <tr>
                  <td align="center" style="border-radius:999px; background-color:#FE8212;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${appLink}" style="height:52px;v-text-anchor:middle;width:280px;" arcsize="50%" stroke="f" fillcolor="#FE8212">
                    <w:anchorlock/>
                    <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:16px;font-weight:bold;">Créer le profil de mon enfant</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a href="${appLink}" target="_blank" style="display:inline-block; padding:16px 32px; font-family:Arial, Helvetica, sans-serif; font-size:16px; font-weight:700; color:#FFFFFF; text-decoration:none; border-radius:999px;">
                      Créer le profil de mon enfant
                    </a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>
              <p style="margin:12px 0 0 0; font-family:Arial, Helvetica, sans-serif; font-size:12px; color:#9491AC;">
                Ça prend moins de 2 minutes.
              </p>
            </td>
          </tr>

          <!-- ==================== CITATION + NAYA ==================== -->
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

          <!-- ==================== CE QUI VOUS ATTEND ==================== -->
          <tr>
            <td class="mobile-padding" style="background-color:#FFFFFF; padding:36px 40px 12px 40px;">
              <h2 class="section-title" style="margin:0 0 24px 0; font-family:Arial, Helvetica, sans-serif; font-size:20px; line-height:28px; font-weight:800; color:#151270;">
                Ce qui attend votre enfant
              </h2>
            </td>
          </tr>

          <tr>
            <td class="mobile-padding" style="background-color:#FFFFFF; padding:0 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td class="feature-icon-cell" width="56" valign="top" style="padding-bottom:22px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="44" height="44" style="background-color:#FDEEE0; border-radius:12px;">
                      <tr><td align="center" valign="middle" style="font-size:20px; line-height:44px;">🧭</td></tr>
                    </table>
                  </td>
                  <td valign="top" style="padding:0 0 22px 14px;">
                    <p style="margin:0 0 4px 0; font-family:Arial, Helvetica, sans-serif; font-size:15px; font-weight:700; color:#221F3D;">Des défis personnalisés</p>
                    <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:21px; color:#6B6B85;">Adaptés à son âge, sa personnalité et ses centres d'intérêt — sport, sciences, art, artisanat, entrepreneuriat...</p>
                  </td>
                </tr>
                <tr>
                  <td class="feature-icon-cell" width="56" valign="top" style="padding-bottom:22px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="44" height="44" style="background-color:#E7F7EF; border-radius:12px;">
                      <tr><td align="center" valign="middle" style="font-size:20px; line-height:44px;">🤖</td></tr>
                    </table>
                  </td>
                  <td valign="top" style="padding:0 0 22px 14px;">
                    <p style="margin:0 0 4px 0; font-family:Arial, Helvetica, sans-serif; font-size:15px; font-weight:700; color:#221F3D;">Naya, votre guide IA</p>
                    <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:21px; color:#6B6B85;">Elle observe et comprend les talents de votre enfant, sans jamais le juger ni le noter.</p>
                  </td>
                </tr>
                <tr>
                  <td class="feature-icon-cell" width="56" valign="top" style="padding-bottom:22px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="44" height="44" style="background-color:#EDEAFB; border-radius:12px;">
                      <tr><td align="center" valign="middle" style="font-size:20px; line-height:44px;">🕸️</td></tr>
                    </table>
                  </td>
                  <td valign="top" style="padding:0 0 22px 14px;">
                    <p style="margin:0 0 4px 0; font-family:Arial, Helvetica, sans-serif; font-size:15px; font-weight:700; color:#221F3D;">Une carte de ses talents</p>
                    <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:21px; color:#6B6B85;">Une vision claire de ses points forts, mise à jour à chaque défi réalisé.</p>
                  </td>
                </tr>
                <tr>
                  <td class="feature-icon-cell" width="56" valign="top" style="padding-bottom:6px;">
                    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="44" height="44" style="background-color:#FDEEE0; border-radius:12px;">
                      <tr><td align="center" valign="middle" style="font-size:20px; line-height:44px;">📁</td></tr>
                    </table>
                  </td>
                  <td valign="top" style="padding:0 0 6px 14px;">
                    <p style="margin:0 0 4px 0; font-family:Arial, Helvetica, sans-serif; font-size:15px; font-weight:700; color:#221F3D;">Un portfolio vivant</p>
                    <p style="margin:0; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:21px; color:#6B6B85;">L'historique réel de ses réalisations — bien plus riche qu'un bulletin scolaire.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ==================== 3 ÉTAPES ==================== -->
          <tr>
            <td class="mobile-padding" style="background-color:#FFFFFF; padding:20px 40px 8px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#F7F6FD; border-radius:16px;">
                <tr>
                  <td style="padding:28px 28px 8px 28px;">
                    <h3 style="margin:0 0 20px 0; font-family:Arial, Helvetica, sans-serif; font-size:16px; font-weight:800; color:#151270;">
                      3 étapes pour démarrer aujourd'hui
                    </h3>

                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="40" valign="top" style="padding-bottom:16px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="28" height="28" class="step-num" style="background-color:#151270; border-radius:50%;">
                            <tr><td align="center" valign="middle" style="font-family:Arial, Helvetica, sans-serif; font-size:13px; font-weight:800; color:#FFFFFF; line-height:28px;">1</td></tr>
                          </table>
                        </td>
                        <td valign="top" style="padding:0 0 16px 12px; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:20px; color:#3B3856;">
                          Créez le profil de votre enfant <span style="color:#6B6B85;">(gratuit pour les 5 premiers)</span>
                        </td>
                      </tr>
                      <tr>
                        <td width="40" valign="top" style="padding-bottom:16px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="28" height="28" class="step-num" style="background-color:#151270; border-radius:50%;">
                            <tr><td align="center" valign="middle" style="font-family:Arial, Helvetica, sans-serif; font-size:13px; font-weight:800; color:#FFFFFF; line-height:28px;">2</td></tr>
                          </table>
                        </td>
                        <td valign="top" style="padding:0 0 16px 12px; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:20px; color:#3B3856;">
                          Répondez à quelques questions simples pour guider Naya
                        </td>
                      </tr>
                      <tr>
                        <td width="40" valign="top" style="padding-bottom:20px;">
                          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="28" height="28" class="step-num" style="background-color:#151270; border-radius:50%;">
                            <tr><td align="center" valign="middle" style="font-family:Arial, Helvetica, sans-serif; font-size:13px; font-weight:800; color:#FFFFFF; line-height:28px;">3</td></tr>
                          </table>
                        </td>
                        <td valign="top" style="padding:0 0 20px 12px; font-family:Arial, Helvetica, sans-serif; font-size:14px; line-height:20px; color:#3B3856;">
                          Lancez votre premier défi ensemble, dès aujourd'hui
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ==================== CTA SECONDAIRE ==================== -->
          <tr>
            <td align="center" style="background-color:#FFFFFF; padding:24px 40px 8px 40px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td align="center" style="border-radius:999px; background-color:#FE8212;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${appLink}" style="height:48px;v-text-anchor:middle;width:220px;" arcsize="50%" stroke="f" fillcolor="#FE8212">
                    <w:anchorlock/>
                    <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:15px;font-weight:bold;">Commencer maintenant</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-->
                    <a href="${appLink}" target="_blank" style="display:inline-block; padding:14px 28px; font-family:Arial, Helvetica, sans-serif; font-size:15px; font-weight:700; color:#FFFFFF; text-decoration:none; border-radius:999px;">
                      Commencer maintenant
                    </a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ==================== GRATUIT ==================== -->
          <tr>
            <td class="mobile-padding" style="background-color:#FFFFFF; padding:32px 40px 8px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#E7F7EF; border-radius:16px;">
                <tr>
                  <td style="padding:24px 28px;">
                    <p style="margin:0 0 14px 0; font-family:Arial, Helvetica, sans-serif; font-size:15px; font-weight:800; color:#0B7A47;">
                      🌱 Gratuit, et ça le restera pour l'essentiel
                    </p>
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                      <tr>
                        <td width="50%" valign="top" style="padding:0 8px 8px 0; font-family:Arial, Helvetica, sans-serif; font-size:13px; line-height:20px; color:#2E5B44;">✓ 5 profils enfants gratuits</td>
                        <td width="50%" valign="top" style="padding:0 0 8px 8px; font-family:Arial, Helvetica, sans-serif; font-size:13px; line-height:20px; color:#2E5B44;">✓ Défis illimités</td>
                      </tr>
                      <tr>
                        <td width="50%" valign="top" style="padding:0 8px 0 0; font-family:Arial, Helvetica, sans-serif; font-size:13px; line-height:20px; color:#2E5B44;">✓ Portfolio inclus</td>
                        <td width="50%" valign="top" style="padding:0 0 0 8px; font-family:Arial, Helvetica, sans-serif; font-size:13px; line-height:20px; color:#2E5B44;">✓ Zéro publicité</td>
                      </tr>
                    </table>
                    <p style="margin:16px 0 0 0; font-family:Arial, Helvetica, sans-serif; font-size:12px; line-height:18px; color:#4E8064; font-style:italic;">
                      Parce qu'aucun enfant ne devrait être privé de la chance de découvrir son potentiel.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- ==================== WHATSAPP SUPPORT ==================== -->
          <tr>
            <td class="mobile-padding" style="background-color:#FFFFFF; padding:20px 40px 36px 40px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#151270; border-radius:16px;">
                <tr>
                  <td align="center" style="padding:26px 24px;">
                    <p style="margin:0 0 4px 0; font-family:Arial, Helvetica, sans-serif; font-size:15px; font-weight:700; color:#FFFFFF;">
                      Une question pour démarrer ?
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

          <!-- ==================== PIED DE PAGE ==================== -->
          <tr>
            <td align="center" class="mobile-padding" style="background-color:#F3F1FA; border-radius:0 0 20px 20px; padding:28px 32px 36px 32px;">
              <p style="margin:0 0 6px 0; font-family:Arial, Helvetica, sans-serif; font-size:13px; font-weight:800; color:#151270;">
                Génizio
              </p>
              <p style="margin:0 0 16px 0; font-family:Arial, Helvetica, sans-serif; font-size:11px; color:#8B88A6;">
                Libérez le génie de votre enfant
              </p>

              <p style="margin:0 0 4px 0; font-family:Arial, Helvetica, sans-serif; font-size:11px; line-height:17px; color:#9491AC;">
                Vous recevez cet email car vous avez créé un compte sur Génizio.
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
        <!-- /Conteneur principal -->

      </td>
    </tr>
  </table>

</body>
</html>`;
}

function resolveFirstName(fullName: string | null | undefined): string {
  if (!fullName) return "";
  const first = fullName.trim().split(/\s+/)[0];
  return first || "";
}

export const sendWelcomeEmailIfNeeded = createServerFn({ method: "POST" })
  .validator((data: { userId: string; email: string; firstName: string | null }) => data)
  .handler(async ({ data }) => {
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      console.error("[welcome-email] Supabase service role non configuré");
      return { sent: false, reason: "missing_supabase_config" };
    }

    const supabase = createClient<Database>(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    const { data: existing, error: checkError } = await supabase
      .from("consent_events")
      .select("id")
      .eq("user_id", data.userId)
      .eq("event_type", WELCOME_EVENT_TYPE)
      .limit(1);

    if (checkError) {
      console.error("[welcome-email] Erreur de vérification consent_events:", checkError.message);
      return { sent: false, reason: "check_failed" };
    }
    if (existing && existing.length > 0) {
      return { sent: false, reason: "already_sent" };
    }

    const smtpHost = process.env.BREVO_SMTP_HOST;
    const smtpPort = Number(process.env.BREVO_SMTP_PORT ?? "587");
    const smtpUser = process.env.BREVO_SMTP_USER;
    const smtpPassword = process.env.BREVO_SMTP_PASSWORD;
    if (!smtpHost || !smtpUser || !smtpPassword) {
      console.error("[welcome-email] Configuration SMTP Brevo manquante dans .env");
      return { sent: false, reason: "missing_smtp_config" };
    }

    const siteUrl = (process.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, "") || "https://www.genizio.com";
    // "?new=true" ouvre directement le formulaire de création sur /profiles (cf.
    // profiles.index.tsx) — cohérent avec le texte du bouton "Créer le profil de mon
    // enfant" plutôt que de faire atterrir sur le tableau de bord sans rien ouvrir.
    const appLink = `${siteUrl}/profiles?new=true`;
    const whatsappNumber = (process.env.VITE_WHATSAPP_NUMBER as string | undefined)?.replace(/\D/g, "") || "33606433148";
    const whatsappLink = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent("Bonjour, j'ai une question sur Génizio.")}`;
    const firstName = resolveFirstName(data.firstName) || "";

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPassword },
    });

    try {
      await transporter.sendMail({
        from: '"Génizio" <hello@genizio.com>',
        to: data.email,
        subject: "🎉 Bienvenue chez Génizio — votre aventure commence maintenant",
        html: buildWelcomeEmailHtml(firstName, appLink, whatsappLink),
      });
    } catch (err) {
      console.error("[welcome-email] Échec d'envoi SMTP:", err);
      return { sent: false, reason: "smtp_failed" };
    }

    const { error: insertError } = await supabase.from("consent_events").insert({
      user_id: data.userId,
      event_type: WELCOME_EVENT_TYPE,
      description: `Email de bienvenue envoyé à ${data.email}`,
    });
    if (insertError) {
      console.error("[welcome-email] Envoyé mais échec de journalisation:", insertError.message);
    }

    return { sent: true };
  });
