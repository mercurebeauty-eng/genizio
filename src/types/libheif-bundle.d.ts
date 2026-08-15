// Types ambiants pour libheif-js/libheif-wasm/libheif-bundle.mjs (décodeur HEIC/HEIF
// en WASM embarqué, API haut niveau HeifDecoder). Le package ne fournit pas de types
// pour ce sous-chemin.
declare module "libheif-js/libheif-wasm/libheif-bundle.mjs" {
  interface HeifDisplayData {
    data: Uint8ClampedArray;
    width: number;
    height: number;
  }
  interface HeifImage {
    get_width(): number;
    get_height(): number;
    display(
      data: HeifDisplayData,
      callback: (data: HeifDisplayData | null) => void,
    ): void;
  }
  interface HeifDecoder {
    /** Décode toutes les images du conteneur HEIC/HEIF (RGBA accessible via display). */
    decode(buffer: Uint8Array): HeifImage[];
  }
  interface LibheifModule {
    HeifDecoder: new () => HeifDecoder;
  }
  /** Factory emscripten — injecte automatiquement le WASM embarqué (wasmBinary). */
  const createLibheif: () => LibheifModule;
  export default createLibheif;
}
