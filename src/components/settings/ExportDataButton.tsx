import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { exportUserData } from "@/lib/account.functions";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function ExportDataButton() {
  const [exporting, setExporting] = useState(false);
  const exportFn = useServerFn(exportUserData);

  const handleExport = async () => {
    setExporting(true);
    try {
      const data = await exportFn();
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      a.href = url;
      a.download = `genizio_export_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      URL.revokeObjectURL(url);
      
      toast.success("Vos données ont été exportées avec succès !");
      
      // We might need to refresh the page to show the new ledger event,
      // but typical users won't notice immediately or we could trigger a callback.
      // For simplicity, a toast is enough.
    } catch (e) {
      toast.error("Erreur lors de l'export des données.");
      console.error(e);
    } finally {
      setExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={exporting}
      className="flex w-full items-center justify-between rounded-2xl border border-ink/10 bg-white p-4 shadow-sm hover:bg-ink/5 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="flex size-10 items-center justify-center rounded-xl bg-brand/10 text-brand">
          {exporting ? <Loader2 className="size-5 animate-spin" /> : <Download className="size-5" />}
        </div>
        <div className="text-left">
          <p className="text-sm font-bold text-ink">Exporter mes données</p>
          <p className="text-[11px] text-ink/60">Téléchargez une copie JSON de tout votre compte.</p>
        </div>
      </div>
    </button>
  );
}
