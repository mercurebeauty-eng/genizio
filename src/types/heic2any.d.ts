// Types ambiants pour heic2any — le package embarque un heic2any.d.ts qui importe
// "./gifshot" et "./libheif" (absents du dist), ce qui casse la résolution de types.
// On le surcharge donc localement (la déclaration ambiante prime sur celle du package).
declare module "heic2any" {
  interface Heic2AnyOptions {
    blob: Blob;
    /** true → renvoie un tableau de Blobs (conversion de toutes les images). */
    multiple?: boolean;
    /** "image/jpeg" | "image/png" | "image/gif" */
    toType?: string;
    quality?: number;
    gifInterval?: number;
  }
  declare function heic2any(options: Heic2AnyOptions): Promise<Blob | Blob[]>;
  export default heic2any;
}
