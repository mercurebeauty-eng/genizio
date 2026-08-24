// Narration qualitative des aspirations — « La boussole de Naya » (analyse
// « Évolution de Génizio » §16, chantier Naya V4, 2026-08-12).
//
// La séquence vécue par l'enfant : « Tu dis aimer X. Explorons cela ! » → « Voici ce
// que Naya observe » → « d'autres directions pourraient correspondre ». DÉTERMINISTE,
// 0 IA : les règles de sanitisation de narrateForParent s'appliquent en code — jamais
// de chiffres, jamais de verdict, jamais d'étiquette technique. Les statuts internes
// (untested/exploring/confirmed/refuted) ne servent qu'à choisir le ton.

import type { AspirationHypothesis } from "@/lib/aspiration-confidence";

/** Ligne pour l'ENFANT (mode Quête) — §16 : « Explorons cela ». */
export function formatAspirationChildLine(h: AspirationHypothesis): string {
  switch (h.status) {
    case "untested":
      return `Tu dis aimer ${h.label}. Explorons cela ! Naya te prépare une première mission dans cet univers.`;
    case "exploring":
      return `Naya explore ${h.label} avec toi. Regarde ce que tu réussis déjà bien !`;
    case "confirmed":
      return `${h.label} semble vraiment te motiver — Naya continue de t'y faire grandir.`;
    case "refuted":
      return `Naya a exploré ${h.label} avec toi. Elle cherche maintenant ce qui te motive vraiment — regarde ce que tu réussis déjà bien.`;
  }
}

/** Ligne pour le PARENT (Portfolio) — jamais alarmiste, jamais un verdict. */
export function formatAspirationParentLine(h: AspirationHypothesis, childName: string): string {
  const sourceNote =
    h.source === "enfant" ? "déclarée par l'enfant lui-même" : "déclarée par le parent";
  switch (h.status) {
    case "untested":
      return `« ${h.label} » (${sourceNote}) — Naya explore cet univers avec ${childName} ; rien n'est conclu, l'expérience décidera.`;
    case "exploring":
      return `« ${h.label} » (${sourceNote}) — l'exploration est en cours : Naya observe ce qui engage réellement.`;
    case "confirmed":
      return `« ${h.label} » (${sourceNote}) — cet univers semble être un moteur réel d'engagement : Naya continue de le nourrir.`;
    case "refuted":
      return `« ${h.label} » (${sourceNote}) — après exploration, cet univers semble moins correspondre : Naya cherche ce qui motive réellement, sans jamais conclure sur la seule déclaration.`;
  }
}
