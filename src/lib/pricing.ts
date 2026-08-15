// Prix des extras payants (slot de profil enfant, mentor ou éducateur supplémentaire).
//
// Aucun paiement n'est traité dans l'app : le prix vit uniquement dans ce qui est AFFICHÉ et
// dans le message WhatsApp pré-rempli, puis l'admin accorde manuellement après réception du
// Mobile Money (même mécanique que le Passeport d'Excellence et les commandes boutique). Ce
// fichier est donc la source unique de l'affichage — sans lui, les deux copies de la modale de
// mise à niveau (profiles.index.tsx et profiles.manage.tsx) finiraient par diverger.
//
// Décision utilisateur (2026-08-03) : prix de bienvenue à 5 000 FCFA valable les 3 PREMIERS
// MOIS DU COMPTE (compte à rebours personnel, pas une fenêtre de lancement globale), puis
// 15 000 FCFA. Même barème côté organisations, où la référence est la date de création de la
// campagne plutôt que celle d'un compte.
//
// Décision utilisateur (2026-08-05) : ce barème mensuel devient LE modèle d'accès — chaque
// enfant au-delà du 1er profil gratuit coûte 5 000 F/mois (3 premiers mois du compte) puis
// 15 000 F/mois. Le parrainage suit le même barème. Équivalents EUR à la parité de la saison
// (10 000 F = 15 €) : 5 000 F ≈ 7,50 €, 15 000 F ≈ 22,50 €.
export const PROMO_PRICE_XOF = 5000;
export const PROMO_PRICE_EUR = 7.5;
export const STANDARD_PRICE_XOF = 15000;
export const STANDARD_PRICE_EUR = 22.5;
export const PROMO_DURATION_MONTHS = 3;

// Parrainage (décision utilisateur 2026-08-08) : les 3 PREMIERS MOIS sont OFFERTS pour
// l'enfant parrainé, puis 15 000 F/mois au-delà — « 3 mois gratuit puis le passage à
// 15 000 ». Les mois offerts sont un cadeau, découplés de la fenêtre de bienvenue du compte
// (5 000 F) : le parrain paie max(0, months − 3) × tarif standard.
export const SPONSORSHIP_FREE_MONTHS = 3;

export function resolveSponsorshipPrice(
  months: number,
  currency: "EUR" | "XOF" = "XOF",
): { paidMonths: number; amountPaid: number; totalMonths: number } {
  const paidMonths = Math.max(0, months - SPONSORSHIP_FREE_MONTHS);
  const monthly = currency === "EUR" ? STANDARD_PRICE_EUR : STANDARD_PRICE_XOF;
  return { paidMonths, amountPaid: paidMonths * monthly, totalMonths: months };
}

// Passeport d'Excellence (déblocage pdf_unlocked) — prix unique affiché côté admin et
// utilisé par le paiement en ligne Paystack (initializePassportPayment). 50 000 FCFA.
export const PASSPORT_PRICE_XOF = 50000;
export const PASSPORT_PRICE_EUR = 75;

// ── Accompagnement (V1, décisions porteur 2026-08-14) ───────────────────────────
// Le pack d'accompagnement est PAR ENFANT : 12 séances × 5 000 F = 60 000 F/mois/enfant.
// Pendant le pilote le paiement est manuel (WhatsApp/Mobile Money) — le bouton de la
// modale ouvre un lien WhatsApp pré-rempli, pas Paystack. Ces constantes sont la source
// unique de l'affichage (modale parent, future facturation mentor_payout en V2).
export const SESSION_PRICE_XOF = 5000;
export const BILAN_PRICE_XOF = 25000;
export const PACK_SESSIONS = 12;
export const PACK_PRICE_XOF = SESSION_PRICE_XOF * PACK_SESSIONS; // 60 000 F/mois/enfant

// Payout mentor (Vague C, 2026-08-14) : 70% de la séance sur preuve (CR en app +
// déclaration). La part est calculée au fil des séances approuvées par l'admin (ledger).
export const MENTOR_SHARE = 0.7;
export const MENTOR_SESSION_PAYOUT_XOF = Math.round(SESSION_PRICE_XOF * MENTOR_SHARE); // 3 500 F/séance

export interface ExtraSlotPrice {
  priceXof: number;
  /** Équivalent EUR à la parité saison (10 000 F = 15 €). */
  priceEur: number;
  isPromo: boolean;
  /** Fin du prix de bienvenue. `null` dès que la promo est passée ou la référence inconnue. */
  promoEndsAt: Date | null;
}

// referenceCreatedAt : auth.users.created_at côté famille, campaigns.created_at côté ONG.
// Référence absente/illisible → tarif standard, jamais une promo offerte par erreur.
export function resolveExtraSlotPrice(
  referenceCreatedAt: string | null | undefined,
  now: Date = new Date(),
): ExtraSlotPrice {
  if (!referenceCreatedAt) {
    return {
      priceXof: STANDARD_PRICE_XOF,
      priceEur: STANDARD_PRICE_EUR,
      isPromo: false,
      promoEndsAt: null,
    };
  }
  const created = new Date(referenceCreatedAt);
  if (Number.isNaN(created.getTime())) {
    return {
      priceXof: STANDARD_PRICE_XOF,
      priceEur: STANDARD_PRICE_EUR,
      isPromo: false,
      promoEndsAt: null,
    };
  }

  const endsAt = new Date(created);
  endsAt.setMonth(endsAt.getMonth() + PROMO_DURATION_MONTHS);

  const isPromo = now.getTime() < endsAt.getTime();
  return {
    priceXof: isPromo ? PROMO_PRICE_XOF : STANDARD_PRICE_XOF,
    priceEur: isPromo ? PROMO_PRICE_EUR : STANDARD_PRICE_EUR,
    isPromo,
    promoEndsAt: isPromo ? endsAt : null,
  };
}

// Juste le nombre formaté (ex. "5 000"), pour les écrans qui stylent "FCFA" séparément
// (gros chiffre + suffixe plus petit dans la modale de mise à niveau).
export function formatXofAmount(amount: number): string {
  return new Intl.NumberFormat("fr-FR").format(amount);
}

export function formatXof(amount: number): string {
  return formatXofAmount(amount) + " FCFA";
}

export function formatPromoDeadline(date: Date): string {
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
}
