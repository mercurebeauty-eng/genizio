// Filet serveur D-07 : conversion HEIC/HEIF → JPEG quand une preuve HEIC arrive
// quand même côté serveur (client sans heic2any, navigateur trop ancien, ancien
// build, ou type non reconnu).
//
// Pourquoi du WASM au lieu de sharp : le runtime de production est Cloudflare
// Workers (src/server.ts + .output/server/wrangler.json, nodejs_compat) — sharp
// embarque des binaires natifs libvips et n'y tourne pas ; il reste cantonné aux
// scripts d'assets build-time (scripts/convert-images.js). Ici :
//   • libheif-js/libheif-wasm/libheif-bundle.mjs — décodeur HEIC/HEIF en WASM
//     EMBARQUÉ en base64 dans le bundle (aucun fetch, aucun fs) → RGBA ;
//   • @jsquash/jpeg — encodeur JPEG mozjpeg en WASM, octets embarqués dans
//     mozjpeg-enc.wasm.base64.ts (régénéré via scripts/embed-mozjpeg-wasm.mjs).
// Tout s'exécute en mémoire. Imports dynamiques : ce module (~1,7 Mo) ne doit
// jamais entrer dans le bundle client des server functions.

import { MOZJPEG_ENC_WASM_BASE64 } from "@/lib/mozjpeg-enc.wasm.base64";

const HEIC_MEDIA_TYPES = new Set([
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
]);

/** true si le type MIME déclaré est HEIC/HEIF (avec ou sans paramètres). */
export function isHeicMediaType(mediaType: string): boolean {
  return HEIC_MEDIA_TYPES.has(mediaType.split(";")[0]?.trim().toLowerCase() ?? "");
}

// Signature ftyp des conteneurs HEIF/HEIC. Décodage des seuls premiers octets — le
// filet attrape aussi un HEIC qui arriverait avec un type MIME erroné/vide (anciens
// clients qui n'envoyaient pas proofImageMediaType, par exemple).
function looksLikeHeifBase64(base64: string): boolean {
  try {
    const head = Buffer.from(base64.slice(0, 32), "base64");
    if (
      head.length < 12 ||
      head[4] !== 0x66 || // 'f'
      head[5] !== 0x74 || // 't'
      head[6] !== 0x79 || // 'y'
      head[7] !== 0x70 // 'p'
    ) {
      return false;
    }
    const brand = String.fromCharCode(head[8], head[9], head[10], head[11]);
    return ["mif1", "heic", "heix", "hevc", "heim", "heis", "hevm", "hevs", "msf1"].includes(brand);
  } catch {
    return false;
  }
}

/** true si la preuve (type MIME et/ou octets) est un HEIC/HEIF. */
export function isHeifProof(base64: string, mediaType: string): boolean {
  return isHeicMediaType(mediaType) || looksLikeHeifBase64(base64);
}

type JpegEncode = (
  data: { data: Uint8ClampedArray; width: number; height: number },
  options?: { quality?: number },
) => Promise<ArrayBuffer>;

let jpegEncoderPromise: Promise<JpegEncode | null> | undefined;

/** Encodeur mozjpeg (WASM) — init paresseuse, résultat mis en cache. */
function getJpegEncoder(): Promise<JpegEncode | null> {
  if (!jpegEncoderPromise) {
    jpegEncoderPromise = (async () => {
      try {
        const { init, default: encode } = await import("@jsquash/jpeg/encode.js");
        const bytes = Uint8Array.from(atob(MOZJPEG_ENC_WASM_BASE64), (c) => c.charCodeAt(0));
        // wasmBinary n'est pas déclaré dans les types ModuleOpts de jsquash (incomplets),
        // mais il est bien lu par la glue emscripten — cast explicite.
        await init({ wasmBinary: bytes.buffer } as unknown as Parameters<typeof init>[0]);
        return encode as JpegEncode;
      } catch (err) {
        console.error("JPEG (mozjpeg) WASM init failed (non-fatal):", err);
        return null;
      }
    })();
  }
  return jpegEncoderPromise;
}

/**
 * Convertit une preuve HEIC/HEIF (base64 brut) en JPEG base64, prêt pour l'analyse
 * vision (Claude n'accepte que jpeg/png/gif/webp). Retourne null en cas d'échec —
 * l'appelant retombe alors sur l'analyse texte seul (même comportement que l'ancien
 * repli vision, sans l'appel Claude gaspillé). L'image n'est PAS redimensionnée ici :
 * la réduction à 1920 px est faite côté client par la compression D-04 ; ce filet ne
 * couvre que les HEIC qui ont échappé à cette compression.
 */
export async function convertHeicProofBase64ToJpeg(base64: string): Promise<string | null> {
  try {
    const { default: createLibheif } = await import("libheif-js/libheif-wasm/libheif-bundle.mjs");
    const libheif = createLibheif();
    const decoder = new libheif.HeifDecoder();
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const images = decoder.decode(bytes);
    const image = images?.[0];
    if (!image) return null;
    const width = image.get_width();
    const height = image.get_height();
    if (!width || !height) return null;

    const rgba = await new Promise<Uint8ClampedArray>((resolve, reject) => {
      image.display(
        { data: new Uint8ClampedArray(width * height * 4), width, height },
        (displayed) =>
          displayed ? resolve(displayed.data) : reject(new Error("HEIF processing error")),
      );
    });

    const encode = await getJpegEncoder();
    if (!encode) return null;
    const jpegBytes = await encode(
      { data: rgba, width, height },
      // Échelle 0-100 côté mozjpeg (le 0.92 du client = 92).
      { quality: 92 },
    );
    return Buffer.from(jpegBytes).toString("base64");
  } catch (err) {
    console.error("HEIC→JPEG server conversion failed (non-fatal):", err);
    return null;
  }
}
