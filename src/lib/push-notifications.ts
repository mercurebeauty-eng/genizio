// Notifications push (Web Push, VAPID) — Confiance Mentor (2026-08-15).
//
// Envoi d'une notification push à un utilisateur (parent OU mentor) via toutes ses
// push_subscriptions. No-op si les clés VAPID ne sont pas configurées (.env), si
// l'utilisateur n'a aucune subscription, ou si le push est indisponible — JAMAIS
// bloquant pour l'appelant (même pattern que notifyUser / logMentorAction).
//
// Serveur uniquement : web-push est importé dynamiquement pour ne jamais entrer
// dans le bundle client. Les endpoints morts (404/410) sont supprimés au fil de
// l'eau — une subscription obsolète ne pollue pas la table.

export async function sendPushToUser(
  db: { from: (table: string) => any },
  userId: string,
  payload: { title: string; body: string; url: string },
): Promise<{ sent: number; disabled: boolean }> {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return { sent: 0, disabled: true };

  let subs: any[] = [];
  try {
    const { data } = await db
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .eq("user_id", userId);
    subs = data ?? [];
  } catch (err) {
    console.error("sendPushToUser: lecture push_subscriptions échouée (non-fatal)", err);
    return { sent: 0, disabled: false };
  }
  if (subs.length === 0) return { sent: 0, disabled: false };

  try {
    const webpush = await import("web-push");
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT ?? "mailto:serviceclient@genizio.com",
      publicKey,
      privateKey,
    );

    let sent = 0;
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify(payload),
        );
        sent += 1;
        await db
          .from("push_subscriptions")
          .update({ last_seen_at: new Date().toISOString() })
          .eq("id", sub.id);
      } catch (err: any) {
        // 404/410 = endpoint expiré/révoqué — on le nettoie, on n'essaye plus dessus.
        if (err?.statusCode === 404 || err?.statusCode === 410) {
          await db.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
        } else {
          console.error("sendPushToUser: échec d'envoi (non-fatal)", err);
        }
      }
    }
    return { sent, disabled: false };
  } catch (err) {
    console.error("sendPushToUser: échec global (non-fatal)", err);
    return { sent: 0, disabled: false };
  }
}
