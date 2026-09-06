// Génération de codes d'accès (parrainage, B2B) — audit backend vague A.
// Les codes valent un accès gratuit à des familles : Math.random() (non
// cryptographique, 6 chars ≈ 2,2 milliards de combinaisons mais prédictible
// depuis l'état du PRNG) est remplacé par crypto.randomBytes.

import { randomBytes } from "node:crypto";

/** Code de 8 caractères hexadécimaux (32 bits d'entropie), sans tirets. */
export function generateAccessCode(prefix: string): string {
  return `${prefix}-${randomBytes(4).toString("hex").toUpperCase()}`;
}
