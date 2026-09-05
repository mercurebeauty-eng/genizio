import { useEffect, useRef, useState } from "react";

/**
 * URL d'objet (blob:) stable pour un File/Blob, révoquée automatiquement quand
 * le blob change ou au démontage.
 *
 * Pourquoi ce hook : `URL.createObjectURL` alloue de la mémoire native qui ne
 * survit PAS au garbage collector JS — sans revokeObjectURL, chaque render
 * créant une URL (ou chaque photo prise) fuit jusqu'à la mort de l'onglet.
 * Audit UI 2026-09-05 : mentor.tsx et quest.tsx fuyaient à chaque re-render.
 */
export function useBlobUrl(blob: Blob | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  const prevUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!blob) {
      if (prevUrlRef.current) {
        URL.revokeObjectURL(prevUrlRef.current);
        prevUrlRef.current = null;
      }
      setUrl(null);
      return;
    }
    const next = URL.createObjectURL(blob);
    setUrl(next);
    prevUrlRef.current = next;
    return () => {
      URL.revokeObjectURL(next);
      if (prevUrlRef.current === next) prevUrlRef.current = null;
    };
  }, [blob]);

  return url;
}
