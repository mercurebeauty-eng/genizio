import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Preuves privées (chantier multicouche) : les photos sont stockées dans le bucket
// `proofs` PRIVÉ ; `challenges.proof_image_url` contient un PATH (`proofs/{childId}/{file}`)
// ou, pour les lignes antérieures à la migration, une ancienne URL publique.
// L'affichage passe par une URL signée temporaire (1 h) — la photo n'est plus lisible
// par n'importe qui, seulement par le parent owner et le mentor assigné (policy RLS).

/** Résout une URL d'affichage à partir d'un path stocké (ou d'une ancienne URL publique). */
export async function getProofImageSrc(stored: string | null): Promise<string | null> {
  if (!stored) return null;
  // Ancienne URL publique (données pré-migration) — inchangée.
  if (stored.startsWith("http")) return stored;
  // Path stocké `proofs/{childId}/{file}` → chemin relatif au bucket pour createSignedUrl.
  const path = stored.startsWith("proofs/") ? stored.slice("proofs/".length) : stored;
  const { data, error } = await supabase.storage.from("proofs").createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}

/** Hook d'affichage : résout le path en URL signée (rafraîchie si le path change). */
export function useProofImageUrl(stored: string | null): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    if (!stored) {
      setUrl(null);
      return;
    }
    if (stored.startsWith("http")) {
      setUrl(stored);
      return;
    }
    setUrl(null);
    getProofImageSrc(stored).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [stored]);
  return url;
}

/** Image de preuve : rend l'<img> seulement quand l'URL signée est prête. */
export function ProofImage({
  stored,
  alt,
  className,
}: {
  stored: string | null;
  alt: string;
  className?: string;
}) {
  const src = useProofImageUrl(stored);
  if (!src) return null;
  return <img src={src} alt={alt} className={className} />;
}
