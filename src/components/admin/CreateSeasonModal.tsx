import { useState } from "react";
import { X, Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { useSession } from "@/hooks/use-session";
import { createSeasonAdmin, updateSeasonAdmin, type Season } from "@/lib/seasons.functions";
import { toast } from "sonner";

interface CreateSeasonModalProps {
  initial?: Season | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function CreateSeasonModal({ initial, onClose, onSuccess }: CreateSeasonModalProps) {
  const { session } = useSession();
  const createFn = useServerFn(createSeasonAdmin);
  const updateFn = useServerFn(updateSeasonAdmin);
  const isEditing = !!initial;
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: initial?.title ?? "",
    theme: initial?.theme ?? "",
    duration_months: initial?.duration_months ?? 3,
    start_date: initial?.start_date ? initial.start_date.slice(0, 10) : "",
    end_date: initial?.end_date ? initial.end_date.slice(0, 10) : "",
    price_xof: initial?.price_xof ?? 10000,
    price_eur: initial?.price_eur ?? 15,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: ["duration_months", "price_xof", "price_eur"].includes(name) ? Number(value) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const opts = session?.access_token
      ? { headers: { Authorization: `Bearer ${session.access_token}` } }
      : {};
    setLoading(true);
    try {
      const res = isEditing
        ? await updateFn({ data: { seasonId: initial!.id, ...formData }, ...opts })
        : await createFn({ data: formData, ...opts });
      if (res.success) {
        toast.success(isEditing ? "Saison modifiée avec succès !" : "Saison créée avec succès !");
        onSuccess();
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'enregistrement de la saison");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-lg overflow-hidden rounded-[2rem] bg-surface shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-ink/10 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-2xl bg-brand/10 text-brand">
              <Sparkles className="size-5" />
            </div>
            <h2 className="font-display text-xl font-bold text-ink">{isEditing ? "Modifier la Saison" : "Nouvelle Saison"}</h2>
          </div>
          <button
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full hover:bg-ink/5 transition-colors cursor-pointer"
          >
            <X className="size-5 text-ink/60" />
          </button>
        </div>

        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink/60">
                Titre de la Saison
              </label>
              <input
                type="text"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                placeholder="Ex: Saison 1 : Les Penseurs"
                className="w-full rounded-2xl border border-ink/20 bg-white px-4 py-3 text-sm font-medium text-ink focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10"
              />
            </div>
            
            <div>
              <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink/60">
                Thème Pédagogique
              </label>
              <input
                type="text"
                name="theme"
                required
                value={formData.theme}
                onChange={handleChange}
                placeholder="Ex: Pensée Logique et Scientifique"
                className="w-full rounded-2xl border border-ink/20 bg-white px-4 py-3 text-sm font-medium text-ink focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink/60">
                  Date de Début
                </label>
                <input
                  type="date"
                  name="start_date"
                  required
                  value={formData.start_date}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-ink/20 bg-white px-4 py-3 text-sm font-medium text-ink focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink/60">
                  Date de Fin
                </label>
                <input
                  type="date"
                  name="end_date"
                  required
                  value={formData.end_date}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-ink/20 bg-white px-4 py-3 text-sm font-medium text-ink focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink/60">
                  Prix (FCFA)
                </label>
                <input
                  type="number"
                  name="price_xof"
                  required
                  value={formData.price_xof}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-ink/20 bg-white px-4 py-3 text-sm font-medium text-ink focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-ink/60">
                  Prix (EUR)
                </label>
                <input
                  type="number"
                  name="price_eur"
                  required
                  value={formData.price_eur}
                  onChange={handleChange}
                  className="w-full rounded-2xl border border-ink/20 bg-white px-4 py-3 text-sm font-medium text-ink focus:border-brand focus:outline-none focus:ring-4 focus:ring-brand/10"
                />
              </div>
            </div>

            <div className="pt-4 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="rounded-2xl px-5 py-3 text-sm font-bold text-ink/60 hover:bg-ink/5 hover:text-ink transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={loading}
                className="rounded-2xl bg-brand px-6 py-3 text-sm font-bold text-white shadow-md hover:bg-brand/90 transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? "Enregistrement..." : isEditing ? "Enregistrer" : "Créer la Saison"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
