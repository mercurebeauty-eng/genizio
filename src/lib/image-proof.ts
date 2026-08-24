// Compression des preuves photo côté client (review 2026-08-13, D-04) : les photos
// de téléphone (4000×3000, plusieurs Mo) partaient BRUTES en base64 — latence et
// timeouts sur réseaux lents, pour une résolution que ni l'analyse IA ni aucun écran
// du flux n'exploite réellement.
//
// Stratégie SANS PERTE DE QUALITÉ VISIBLE :
//   • fichier déjà léger et raisonnable en dimensions → envoyé tel quel (0 dégradation) ;
//   • dimensions > 1920 px (côté long) → redimensionnement à 1920 px (4× la résolution
//     d'affichage, bien au-delà de ce que l'IA d'analyse regarde) ;
//   • JPEG → ré-encodage WebP qualité 0.92 (indistinguable à l'œil) ;
//   • PNG (captures, schémas) → ré-encodage PNG après redimensionnement (LOSSLESS).
// Typiquement : une photo de 5 Mo devient 300-600 Ko.
//
// D-07 (review 2026-08-15, photos iOS) : les Live Photos iPhone arrivent en HEIC,
// que <img>/canvas ne décodent pas — l'ancien code échouait avec « Image illisible. »
// AVANT tout envoi, obligeant à passer par une capture d'écran. Deux correctifs :
//   • HEIC → conversion WASM côté client (heic2any, chargé à la demande, ~1,3 Mo),
//     puis pipeline normal ; repli : envoi brut HEIC, le serveur convertit (filet,
//     voir src/lib/server-heic.ts) ;
//   • encodage canvas durci : Safari ne sait PAS encoder le WebP via canvas.toBlob
//     et retombe silencieusement sur un PNG (spec HTMLCanvasElement) — non-null, donc
//     le repli « !blob » ne partait jamais et la « compression » produisait un PNG de
//     plusieurs Mo. On vérifie le type réel du blob et on ré-encode en JPEG explicite.

const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.92;
/** Sous ce poids, on n'y touche jamais (déjà léger — aucune dégradation possible). */
const MAX_PASSTHROUGH_BYTES = 800 * 1024;

/** Types HEIC/HEIF livrés par les Live Photos iOS (indécodables par <img>/canvas). */
const HEIC_MEDIA_TYPES = new Set([
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
]);

/** Type MIME normalisé d'un fichier (sans paramètres, minuscules). iOS livre parfois
 *  des photos avec un type vide — repli sur l'extension. */
export function normalizeProofMediaType(type: string, name: string): string {
  const base = type.split(";")[0]?.trim().toLowerCase() ?? "";
  if (base) return base;
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return ext === "heic" || ext === "heif" ? "image/heic" : "";
}

/** true si le fichier est un HEIC/HEIF (Live Photo iOS). */
export function isHeicProofFile(type: string, name: string): boolean {
  return HEIC_MEDIA_TYPES.has(normalizeProofMediaType(type, name));
}

/** Conversion HEIC→JPEG côté client (heic2any embarque libheif en WASM, ~1,3 Mo,
 *  import dynamique — jamais dans le bundle initial). null si la conversion échoue
 *  (navigateur trop ancien) : le serveur a son propre filet (server-heic.ts). */
async function convertHeicToJpeg(file: File): Promise<File | null> {
  try {
    const { default: heic2any } = await import("heic2any");
    const blob = await heic2any({ blob: file, toType: "image/jpeg", quality: JPEG_QUALITY });
    const single = Array.isArray(blob) ? blob[0] : blob;
    if (!single || single.type !== "image/jpeg") return null;
    return new File([single], "proof.jpg", { type: "image/jpeg" });
  } catch {
    return null;
  }
}

export type ProofEncodePlan =
  | { action: "passthrough"; mediaType: string }
  | { action: "resize"; mediaType: "image/webp" | "image/png"; quality?: number };

/** Décision PURE (testable sans navigateur) : quoi faire d'une image preuve. */
export function resolveProofEncodePlan(
  fileSizeBytes: number,
  width: number,
  height: number,
  mediaType: string,
): ProofEncodePlan {
  const maxDim = Math.max(width, height);
  if (fileSizeBytes <= MAX_PASSTHROUGH_BYTES && maxDim <= MAX_DIMENSION) {
    return { action: "passthrough", mediaType };
  }
  if (mediaType === "image/png") {
    if (maxDim <= MAX_DIMENSION) {
      // PNG raisonnable en dimensions : le ré-encodage canvas PNG est rarement plus
      // léger sans optimiseur — on envoie l'original (lossless de toute façon).
      return { action: "passthrough", mediaType };
    }
    return { action: "resize", mediaType: "image/png" };
  }
  return { action: "resize", mediaType: "image/webp", quality: JPEG_QUALITY };
}

export interface CompressedProofFile {
  base64: string;
  mediaType: string;
  /** true si l'image a été retraitée (redimensionnée/ré-encodée). */
  compressed: boolean;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Image illisible."));
    };
    img.src = url;
  });
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    // Base64 NU (sans préfixe data URL) — contrat existant de validateChallengeProof.
    reader.onload = () => resolve(String(reader.result ?? "").split(",")[1] ?? "");
    reader.onerror = () => reject(new Error("Lecture du fichier impossible."));
    reader.readAsDataURL(file);
  });
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mime: string,
  quality?: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, mime, quality));
}

/**
 * Prépare une image preuve pour l'envoi : laisse passer les fichiers déjà légers,
 * redimensionne les très grandes dimensions et ré-encode en WebP haute qualité
 * (PNG lossless). Replie toujours sur l'original en cas d'échec — jamais bloquant.
 */
export async function fileToCompressedProof(file: File): Promise<CompressedProofFile> {
  // D-07 : HEIC (Live Photos iOS) indécodable par <img>/canvas → conversion WASM
  // client ; si elle échoue, la preuve part en brut et le serveur convertit (filet).
  // Jamais bloquant.
  if (isHeicProofFile(file.type, file.name)) {
    const jpegFile = await convertHeicToJpeg(file);
    if (jpegFile) return fileToCompressedProof(jpegFile);
    return { base64: await fileToBase64(file), mediaType: "image/heic", compressed: false };
  }

  const dims = await loadImage(file);
  const plan = resolveProofEncodePlan(file.size, dims.naturalWidth, dims.naturalHeight, file.type);
  if (plan.action === "passthrough") {
    return { base64: await fileToBase64(file), mediaType: plan.mediaType, compressed: false };
  }

  const canvas = document.createElement("canvas");
  const scale = Math.min(1, MAX_DIMENSION / Math.max(dims.naturalWidth, dims.naturalHeight));
  canvas.width = Math.max(1, Math.round(dims.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(dims.naturalHeight * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return { base64: await fileToBase64(file), mediaType: file.type, compressed: false };
  }
  ctx.drawImage(dims, 0, 0, canvas.width, canvas.height);

  let blob = await canvasToBlob(canvas, plan.mediaType, plan.quality);
  if (blob && plan.mediaType === "image/webp" && blob.type !== "image/webp") {
    // D-07 : Safari n'encode pas le WebP via canvas et retombe SILENCIEUSEMENT sur un
    // PNG (spec : format non supporté → export image/png) — non-null, donc le repli
    // « !blob » ci-dessous ne partait jamais et la « compression » produisait un PNG
    // de plusieurs Mo. Ré-encodage JPEG explicite pour garder le bénéfice réel.
    blob = await canvasToBlob(canvas, "image/jpeg", JPEG_QUALITY);
  }
  if (!blob && plan.mediaType === "image/webp") {
    // Repli vieux navigateurs (pas de WebP) : JPEG haute qualité.
    blob = await canvasToBlob(canvas, "image/jpeg", JPEG_QUALITY);
  }
  if (!blob) {
    // Dernier repli : l'original part tel quel — jamais de blocage de la preuve.
    return { base64: await fileToBase64(file), mediaType: file.type, compressed: false };
  }
  const base64 = await fileToBase64(new File([blob], "proof", { type: blob.type }));
  // Garde extrême (la compression divise typiquement par 5-15 — ne survient pas).
  if (base64.length > 8 * 1024 * 1024) {
    throw new Error("Image trop volumineuse même après compression — essaie une autre photo.");
  }
  return { base64, mediaType: blob.type || plan.mediaType, compressed: true };
}
