// Prix des extras payants (slot de profil enfant, mentor ou éducateur supplémentaire).
//
// Aucun paiement n'est traité dans l'app : le prix vit uniquement dans ce qui est AFFICHÉ et
// dans le message WhatsApp pré-rempli, puis l'admin accorde manuellement après réception du
// Mobile Money (même mécanique que le Passeport d'Excellence et les commandes boutique). Ce
// fichier est donc la source unique de l'affichage — sans lui, les deux copies de la modale de
// mise à niveau (profiles.index.tsx et profiles.manage.tsx) finiraient par diverger.
//
// Décision utilisateur (2026-08-24) : Positionnement premium
//   • 1er profil enfant : offert pour toujours (0 F)
//   • Profils supplémentaires / comptes sans suivi : 35 000 FCFA/mois (direct, plus d'offre 5 000 F).
//   • Diagnostic première rencontre : 50 000 FCFA (séance initiale pour établir le profil).
//   • Certificats / Passeport d'Excellence : 75 000 FCFA.
//   • Pack Accompagnement : 12 séances × 15 000 FCFA = 180 000 FCFA/mois.
// Équivalents EUR indicatifs à la parité saison (10 000 F ≈ 15 €).
export const PROMO_PRICE_XOF = 35000;
export const PROMO_PRICE_EUR = 53.5;
export const STANDARD_PRICE_XOF = 35000;
export const STANDARD_PRICE_EUR = 53.5;
export const PROMO_DURATION_MONTHS = 0;

// Parrainage (décision utilisateur 2026-08-24) : 35 000 F/mois par enfant soutenu.
export const SPONSORSHIP_FREE_MONTHS = 0;

export function resolveSponsorshipPrice(
  months: number,
  currency: "EUR" | "XOF" = "XOF",
): { paidMonths: number; amountPaid: number; totalMonths: number } {
  const paidMonths = Math.max(0, months);
  const monthly = currency === "EUR" ? STANDARD_PRICE_EUR : STANDARD_PRICE_XOF;
  return { paidMonths, amountPaid: paidMonths * monthly, totalMonths: months };
}

// Passeport d'Excellence & Certificats de compétences (déblocage pdf_unlocked)
// Prix unique : 75 000 FCFA.
export const PASSPORT_PRICE_XOF = 75000;
export const PASSPORT_PRICE_EUR = 115;

// Diagnostic première rencontre (Nouveau) — séance initiale approfondie pour établir le profil
// Prix unique : 50 000 FCFA.
export const DIAGNOSTIC_PRICE_XOF = 50000;
export const DIAGNOSTIC_PRICE_EUR = 75;

// Dossier d'Expertise & Prescription Clinique pour Professionnel Indépendant
// Débloque l'export du Bilan Psycho-Pédagogique officiel (8-12 pages PDF), l'injection
// de défis de remédiation sur-mesure et l'espace de notes cliniques sécurisées.
// Prix : 15 000 FCFA par enfant/demande.
export const PRO_DOSSIER_PRICE_XOF = 15000;
export const PRO_DOSSIER_PRICE_EUR = 23;

// ── Accompagnement (Positionnement Premium 2026-08-24) ───────────────────────────
// Le pack d'accompagnement est PAR ENFANT : 12 séances × 15 000 F = 180 000 F/mois/enfant.
export const SESSION_PRICE_XOF = 15000;
export const BILAN_PRICE_XOF = 50000;
export const PACK_SESSIONS = 12;
export const PACK_PRICE_XOF = SESSION_PRICE_XOF * PACK_SESSIONS; // 180 000 F/mois/enfant

// Payout mentor : 70% de la séance sur preuve (CR en app + déclaration).
export const MENTOR_SHARE = 0.7;
export const MENTOR_SESSION_PAYOUT_XOF = Math.round(SESSION_PRICE_XOF * MENTOR_SHARE); // 10 500 F/séance

export interface ExtraSlotPrice {
  priceXof: number;
  /** Équivalent EUR à la parité saison (10 000 F ≈ 15 €). */
  priceEur: number;
  isPromo: boolean;
  /** Fin du prix de bienvenue. `null` dès que la promo est passée ou la référence inconnue. */
  promoEndsAt: Date | null;
}

// Résolution directe du tarif compte supplémentaire (35 000 FCFA/mois).
export function resolveExtraSlotPrice(
  _referenceCreatedAt?: string | null,
  _now: Date = new Date(),
): ExtraSlotPrice {
  return {
    priceXof: STANDARD_PRICE_XOF,
    priceEur: STANDARD_PRICE_EUR,
    isPromo: false,
    promoEndsAt: null,
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

// ── Tarification Institutionnelle Campus (Écoles, Collèges, Lycées) ──────────
// Licence d'Exploitation Établissement (B2B / État / APE) :
// • Valide impérativement jusqu'au 31 juillet de l'année scolaire en cours.
// • 0 FCFA pour tous les enseignants rattachés à l'établissement.
// • Éligible au paiement au comptant ou en 3 échéances trimestrielles calées sur les scolarités.
export const CAMPUS_TIERS = {
  pilot: {
    name: "Pack Pilote (jusqu'à 50 élèves)",
    quota: 50,
    pricePerStudentXof: 2500,
    priceXof: 125000, // 50 × 2 500 F
    installmentPerTermXof: 125000, // Comptant
  },
  starter_campus: {
    name: "Campus Starter (jusqu'à 250 élèves)",
    quota: 250,
    pricePerStudentXof: 5000,
    priceXof: 1250000, // 250 × 5 000 F
    installmentPerTermXof: 416667, // 3 échéances
  },
  standard_campus: {
    name: "Campus Pro (jusqu'à 500 élèves - Dégressif)",
    quota: 500,
    pricePerStudentXof: 4000,
    priceXof: 2000000, // 500 × 4 000 F
    installmentPerTermXof: 666667, // 3 échéances
  },
  excellence_campus: {
    name: "Campus Excellence (jusqu'à 1 000 élèves - Dégressif)",
    quota: 1000,
    pricePerStudentXof: 3000,
    priceXof: 3000000, // 1 000 × 3 000 F
    installmentPerTermXof: 1000000, // 3 échéances
  },
} as const;

export type CampusTierKey = keyof typeof CAMPUS_TIERS;

export function resolveCampusPrice(tierKey: CampusTierKey): {
  name: string;
  quota: number;
  pricePerStudentXof: number;
  priceXof: number;
  installmentPerTermXof: number;
} {
  return CAMPUS_TIERS[tierKey] ?? CAMPUS_TIERS.standard_campus;
}
