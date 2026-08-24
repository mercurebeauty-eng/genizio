import { useState } from "react";
import { Share2, Check, Link2 } from "lucide-react";
import { toast } from "sonner";
import { SITE_URL } from "@/lib/seo";

export function SocialShareBar({
  title,
  url,
  path,
}: {
  title: string;
  url?: string;
  path?: string;
}) {
  const [copied, setCopied] = useState(false);

  // Détermination de l'URL absolue canonique de partage :
  // Toujours pointer vers le domaine de production officiel pour que les robots
  // de WhatsApp, Facebook et X puissent scraper les balises OpenGraph et afficher
  // l'aperçu visuel sans lien cassé.
  const computeShareUrl = (): string => {
    if (url) {
      if (url.startsWith("http://localhost") || url.startsWith("http://127.0.0.1")) {
        try {
          const u = new URL(url);
          return `${SITE_URL}${u.pathname}${u.search}`;
        } catch {
          return `${SITE_URL}/guides`;
        }
      }
      return url;
    }
    if (path) {
      return path.startsWith("/") ? `${SITE_URL}${path}` : `${SITE_URL}/${path}`;
    }
    if (typeof window !== "undefined") {
      const pathname = window.location.pathname;
      return `${SITE_URL}${pathname}`;
    }
    return `${SITE_URL}/guides`;
  };

  const shareUrl = computeShareUrl();

  const handleCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        // Fallback standard
        const textarea = document.createElement("textarea");
        textarea.value = shareUrl;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopied(true);
      toast.success("Lien copié dans le presse-papier !");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error("Impossible de copier le lien automatiquement.");
    }
  };

  const handleNativeShare = async () => {
    // Si l'API native de partage mobile est disponible (iOS Safari, Android Chrome...)
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title,
          url: shareUrl,
        });
        return;
      } catch (err: unknown) {
        // Si l'utilisateur n'a pas simplement annulé, on copie le lien
        if (err instanceof Error && err.name !== "AbortError") {
          await handleCopy();
        }
      }
    } else {
      await handleCopy();
    }
  };

  // Liens d'intention directe optimisés et compatibles toutes applications
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(`*${title}*\n\n${shareUrl}`)}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
  const linkedinUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`;
  const twitterUrl = `https://x.com/intent/post?text=${encodeURIComponent(title)}&url=${encodeURIComponent(shareUrl)}`;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-bold text-ink/50 hidden sm:inline">Partager :</span>

      {/* WhatsApp - Canal prioritaire parents & diaspora */}
      <a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Partager sur WhatsApp"
        aria-label="Partager sur WhatsApp"
        className="flex items-center gap-1.5 rounded-full bg-[#25D366]/10 px-3 py-1.5 text-xs font-bold text-[#128C7E] transition-all hover:bg-[#25D366]/20 press-brand"
      >
        <svg className="size-3.5 fill-current shrink-0" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.572-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
        </svg>
        WhatsApp
      </a>

      {/* Facebook */}
      <a
        href={facebookUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Partager sur Facebook"
        aria-label="Partager sur Facebook"
        className="flex items-center justify-center rounded-full bg-[#1877F2]/10 p-2 text-[#1877F2] transition-all hover:bg-[#1877F2]/20 press-brand"
      >
        <svg className="size-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      </a>

      {/* X / Twitter */}
      <a
        href={twitterUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Partager sur X"
        aria-label="Partager sur X"
        className="flex items-center justify-center rounded-full bg-ink/5 p-2 text-ink transition-all hover:bg-ink/10 press-brand"
      >
        <svg className="size-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </a>

      {/* LinkedIn */}
      <a
        href={linkedinUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Partager sur LinkedIn"
        aria-label="Partager sur LinkedIn"
        className="flex items-center justify-center rounded-full bg-[#0A66C2]/10 p-2 text-[#0A66C2] transition-all hover:bg-[#0A66C2]/20 press-brand"
      >
        <svg className="size-3.5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
        </svg>
      </a>

      {/* Action Partager / Copier le lien avec feedback */}
      <button
        type="button"
        onClick={handleNativeShare}
        title="Partager ou copier le lien"
        aria-label="Partager ou copier le lien"
        className="flex items-center gap-1 rounded-full bg-ink/5 px-3 py-1.5 text-xs font-bold text-ink transition-all hover:bg-ink/10 press-brand cursor-pointer"
      >
        {copied ? (
          <>
            <Check className="size-3.5 text-emerald-600" />
            <span className="text-emerald-700">Lien copié !</span>
          </>
        ) : (
          <>
            <Share2 className="size-3.5" />
            <span>Partager</span>
          </>
        )}
      </button>
    </div>
  );
}
