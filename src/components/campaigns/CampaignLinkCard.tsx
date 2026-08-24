import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Check, Download, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";

// Remplace la distribution de codes alphanumériques par lot pour l'inscription à une campagne
// B2B : un lien + QR uniques par campagne, partageables tels quels dans un groupe WhatsApp ou
// imprimables sur un flyer. La famille scanne/clique et atterrit directement sur /rejoindre/$id
// (page publique, cf. campaigns.functions.ts:getCampaignPublicInfo). Généré côté client
// (librairie "qrcode") — pas d'appel serveur, pas de dépendance à un service externe.
export function CampaignLinkCard({
  campaignId,
  campaignName,
}: {
  campaignId: string;
  campaignName: string;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const url =
    typeof window !== "undefined" ? `${window.location.origin}/rejoindre/${campaignId}` : "";

  useEffect(() => {
    if (!url) return;
    QRCode.toDataURL(url, { width: 320, margin: 1, color: { dark: "#1a1a1a", light: "#ffffff" } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [url]);

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Lien copié !");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    const safeName = campaignName.toLowerCase().replace(/[^a-z0-9]/g, "_");
    a.download = `qr_${safeName}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast.success("QR code téléchargé.");
  };

  return (
    <div className="rounded-3xl border border-ink/10 bg-white p-6 shadow-xs">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="size-9 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0">
          <LinkIcon className="size-5" />
        </div>
        <div>
          <h3 className="font-display font-black text-lg text-ink">Lien d'inscription</h3>
          <p className="text-xs text-ink/60 font-medium">
            Partagez ce lien ou ce QR — aucun code à distribuer.
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-5 items-start">
        {qrDataUrl && (
          <div className="shrink-0 mx-auto sm:mx-0 rounded-2xl border border-ink/10 p-2 bg-white">
            <img
              src={qrDataUrl}
              alt={`QR code d'inscription pour ${campaignName}`}
              width="144"
              height="144"
              loading="lazy"
              decoding="async"
              className="size-32 sm:size-36"
            />
          </div>
        )}
        <div className="flex-1 w-full min-w-0">
          <div className="flex items-center gap-2 rounded-2xl border border-ink/10 bg-surface px-4 py-3 mb-3">
            <code className="text-xs font-mono text-ink/70 truncate flex-1 min-w-0">{url}</code>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider bg-ink text-white hover:bg-ink/90 transition-colors cursor-pointer"
            >
              {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              {copied ? "Copié" : "Copier le lien"}
            </button>
            <button
              onClick={handleDownloadQR}
              disabled={!qrDataUrl}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider bg-brand text-white hover:bg-brand/90 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Download className="size-4" />
              QR (PNG)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
