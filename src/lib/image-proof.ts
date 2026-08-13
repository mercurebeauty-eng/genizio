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

const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.92;
/** Sous ce poids, on n'y touche jamais (déjà léger — aucune dégradation possible). */
const MAX_PASSTHROUGH_BYTES = 800 * 1024;

export type ProofEncodePlan =
  | { action: "passthrough"; mediaType: string }
  | { action: "resize"; mediaType: "image/webp" | "image/png"; quality?: number };

/** Décision PURE (testable sans navigateur) : quoi faire d'une image preuve. */
export function resolveProofEncodePlan(
  fileSizeBytes: number,
  width: number,
  height: number,
  mediaType: string
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
  quality?: number
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, mime, quality));
}

/**
 * Prépare une image preuve pour l'envoi : laisse passer les fichiers déjà légers,
 * redimensionne les très grandes dimensions et ré-encode en WebP haute qualité
 * (PNG lossless). Replie toujours sur l'original en cas d'échec — jamais bloquant.
 */
export async function fileToCompressedProof(file: File): Promise<CompressedProofFile> {
  const dims = await loadImage(file);
  const plan = resolveProofEncodePlan(
    file.size,
    dims.naturalWidth,
    dims.naturalHeight,
    file.type
  );
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
