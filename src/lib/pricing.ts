// Prix des extras payants (slot de profil enfant, superviseur ou éducateur supplémentaire).
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
export const PROMO_PRICE_XOF = 5000;
export const STANDARD_PRICE_XOF = 15000;
export const PROMO_DURATION_MONTHS = 3;

export interface ExtraSlotPrice {
  priceXof: number;
  isPromo: boolean;
  /** Fin du prix de bienvenue. `null` dès que la promo est passée ou la référence inconnue. */
  promoEndsAt: Date | null;
}

// referenceCreatedAt : auth.users.created_at côté famille, campaigns.created_at côté ONG.
// Référence absente/illisible → tarif standard, jamais une promo offerte par erreur.
export function resolveExtraSlotPrice(
  referenceCreatedAt: string | null | undefined,
  now: Date = new Date()
): ExtraSlotPrice {
  if (!referenceCreatedAt) {
    return { priceXof: STANDARD_PRICE_XOF, isPromo: false, promoEndsAt: null };
  }
  const created = new Date(referenceCreatedAt);
  if (Number.isNaN(created.getTime())) {
    return { priceXof: STANDARD_PRICE_XOF, isPromo: false, promoEndsAt: null };
  }

  const endsAt = new Date(created);
  endsAt.setMonth(endsAt.getMonth() + PROMO_DURATION_MONTHS);

  const isPromo = now.getTime() < endsAt.getTime();
  return {
    priceXof: isPromo ? PROMO_PRICE_XOF : STANDARD_PRICE_XOF,
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
