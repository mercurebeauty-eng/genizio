// Embarque le WASM de l'encodeur JPEG mozjpeg (@jsquash/jpeg) en base64 dans
// src/lib/mozjpeg-enc.wasm.base64.ts — utilisé par le filet serveur HEIC→JPEG
// (src/lib/server-heic.ts), qui doit fonctionner sur Cloudflare Workers sans fs.
//
// Régénérer après une mise à jour de @jsquash/jpeg :
//   node scripts/embed-mozjpeg-wasm.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const wasmPath = root + "node_modules/@jsquash/jpeg/codec/enc/mozjpeg_enc.wasm";
const base64 = readFileSync(wasmPath).toString("base64");

const out = `// FICHIER GÉNÉRÉ — ne pas éditer à la main.
// WASM de l'encodeur JPEG mozjpeg (libvips @jsquash/jpeg) encodé en base64, pour
// le filet serveur HEIC→JPEG (src/lib/server-heic.ts). Embarqué pour fonctionner
// sur Cloudflare Workers (pas de fs ni d'assets côté serveur).
// Régénérer : node scripts/embed-mozjpeg-wasm.mjs
export const MOZJPEG_ENC_WASM_BASE64 =
  "${base64}";
`;

writeFileSync(root + "src/lib/mozjpeg-enc.wasm.base64.ts", out);
console.log(`Écrit ${root}src/lib/mozjpeg-enc.wasm.base64.ts (${(base64.length / 1024).toFixed(0)} Ko base64)`);
