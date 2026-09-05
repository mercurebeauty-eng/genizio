// Décodage serveur des preuves photo → empreinte dHash.
// Serveur UNIQUEMENT (module .server.ts) : importe les décodeurs wasm @jsquash.
// Le pipeline : octets uploadés → décodage (JPEG/WebP/PNG, HEIC via libheif déjà
// présent) → luminance → dHash 64 bits. Si le décodage échoue (format exotique),
// fallback SHA-256 des octets : détection des doublons exacts seulement, avec
// préfixe distinct pour que la comparaison Hamming ne soit jamais tentée.

import {
  computeByteSha256,
  computeDHash,
  rgbaToLuminance,
} from "@/lib/image-hash";

const FINGERPRINT_FALLBACK_PREFIX = "sha256:";

export interface FingerprintResult {
  /** hex 16 chars (dHash) ou "sha256:<64 hex>" en fallback. */
  fingerprint: string;
  method: "dhash" | "sha256-fallback";
}

function stripDataUrl(base64: string): string {
  const comma = base64.indexOf(",");
  return base64.startsWith("data:") && comma > 0 ? base64.slice(comma + 1) : base64;
}

async function decodeToRgba(
  bytes: Uint8Array,
  mediaType: string,
): Promise<{ width: number; height: number; data: Uint8ClampedArray }> {
  const type = (mediaType || "").toLowerCase();
  // Les décodeurs @jsquash exigent un ArrayBuffer (pas une vue).
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;

  const tryJpeg = async (jpegBuffer: ArrayBuffer = buffer) => {
    const jpeg = await import("@jsquash/jpeg/decode.js");
    return (await jpeg.default(jpegBuffer)) as ImageData;
  };
  const tryWebp = async () => {
    const webp = await import("@jsquash/webp/decode.js");
    return (await webp.default(buffer)) as ImageData;
  };
  const tryPng = async () => {
    const png = await import("@jsquash/png/decode.js");
    return (await png.default(buffer)) as ImageData;
  };
  const tryHeic = async () => {
    // Net HEIC (Live Photos iOS) — réutilise le convertisseur existant vers JPEG.
    const { convertHeicProofBase64ToJpeg, isHeifProof } = await import("@/lib/server-heic");
    const b64 = Buffer.from(bytes).toString("base64");
    if (!isHeifProof(b64, "image/heic")) throw new Error("not-heif");
    const jpegB64 = await convertHeicProofBase64ToJpeg(b64);
    if (!jpegB64) throw new Error("heic-convert-failed");
    const jpegBytes = Uint8Array.from(Buffer.from(jpegB64, "base64"));
    return tryJpeg(jpegBytes.buffer.slice(jpegBytes.byteOffset, jpegBytes.byteOffset + jpegBytes.byteLength) as ArrayBuffer);
  };

  if (type.includes("webp")) return tryWebp();
  if (type.includes("png")) return tryPng();
  if (type.includes("heic") || type.includes("heif")) return tryHeic();
  // JPEG par défaut (inclut les media types vides/exotiques : l'upload copilote/
  // preuves passe en JPEG/WebP compressés ; le sniffing binaire du magic number
  // couvre les content-types mensongers).
  const magic =
    bytes[0] === 0x89 && bytes[1] === 0x50
      ? "png"
      : bytes.length > 11 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
        ? "webp"
        : "jpeg";
  if (magic === "png") return tryPng();
  if (magic === "webp") return tryWebp();
  return tryJpeg();
}

/**
 * Empreinte de la photo sérialisée en base64 (nu ou data URL).
 * Ne lève jamais : en cas d'échec de décodage, empreinte SHA-256 (doublons
 * exacts seulement) — la validation de séance ne doit pas être bloquée par un
 * décodage raté, mais l'empreinte reste traçable.
 */
export async function fingerprintProofImage(
  base64: string,
  mediaType: string,
): Promise<FingerprintResult> {
  try {
    const bytes = Uint8Array.from(Buffer.from(stripDataUrl(base64), "base64"));
    const image = await decodeToRgba(bytes, mediaType);
    const fingerprint = computeDHash({
      width: image.width,
      height: image.height,
      data: rgbaToLuminance(image.data as unknown as Uint8ClampedArray),
    });
    if (fingerprint === "0000000000000000") {
      // Image décodée mais vide (décodeur en difficulté) : fallback traçable.
      return { fingerprint: `${FINGERPRINT_FALLBACK_PREFIX}${await computeByteSha256(bytes)}`, method: "sha256-fallback" };
    }
    return { fingerprint, method: "dhash" };
  } catch (err) {
    console.warn("fingerprintProofImage: décodage impossible, fallback SHA-256 :", (err as Error).message);
    try {
      const bytes = Uint8Array.from(Buffer.from(stripDataUrl(base64), "base64"));
      return { fingerprint: `${FINGERPRINT_FALLBACK_PREFIX}${await computeByteSha256(bytes)}`, method: "sha256-fallback" };
    } catch {
      return { fingerprint: "", method: "sha256-fallback" };
    }
  }
}

/** Une empreinte est-elle comparable par Hamming (dHash 16 hex) ? */
export function isComparableFingerprint(fp: string | null | undefined): boolean {
  return !!fp && /^[0-9a-f]{16}$/.test(fp);
}
