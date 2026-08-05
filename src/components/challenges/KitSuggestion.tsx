import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ShoppingBag, Loader2 } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { createOrder } from "@/lib/products.functions";
import { toast } from "sonner";

type Product = { id: string; name: string; price_xof: number };

export function KitSuggestion({
  childId,
  challengeId,
  materialTags,
  challengeTitle,
  childName,
}: {
  childId: string;
  challengeId?: string | null;
  materialTags: string[] | null | undefined;
  challengeTitle: string;
  childName: string;
}) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const tagsKey = (materialTags ?? []).join(",");

  const createOrderFn = useServerFn(createOrder);

  useEffect(() => {
    if (!tagsKey) {
      setProducts([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from("products")
      .select("id, name, price_xof")
      .overlaps("material_tags", tagsKey.split(","))
      .eq("is_active", true)
      .then(({ data }) => {
        if (!cancelled) {
          setProducts(data ?? []);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [tagsKey]);

  if (loading || products.length === 0) return null;

  const total = products.reduce((sum, p) => sum + p.price_xof, 0);
  const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER as string | undefined;
  const message = `Bonjour ! Je souhaite commander le kit pour le défi "${challengeTitle}" de ${childName} :\n${products
    .map((p) => `- ${p.name} (${p.price_xof.toLocaleString("fr-FR")} FCFA)`)
    .join("\n")}\nTotal : ${total.toLocaleString("fr-FR")} FCFA`;
  const waUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`
    : null;

  const handleOrder = async () => {
    setOrdering(true);
    try {
      const orderItems = products.map((p) => ({
        id: p.id,
        name: p.name,
        price_xof: p.price_xof,
      }));

      await createOrderFn({
        data: {
          child_id: childId,
          challenge_id: challengeId || null,
          total_price_xof: total,
          items: orderItems,
          delivery_notes: `Commande pour le défi: ${challengeTitle}`,
        },
      });

      toast.success("Commande enregistrée ! Ouverture de WhatsApp...");

      if (waUrl) {
        window.open(waUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de la création de la commande.");
    } finally {
      setOrdering(false);
    }
  };

  return (
    <div className="rounded-2xl border border-ink/10 bg-sky p-4 shadow-sm">
      <div className="mb-2 flex items-center gap-2">
        <ShoppingBag className="size-4 text-ink" />
        <p className="text-xs font-black uppercase tracking-widest text-ink">
          Kit suggéré par Naya
        </p>
      </div>
      <ul className="mb-3 space-y-1">
        {products.map((p) => (
          <li key={p.id} className="flex justify-between text-sm font-bold text-ink">
            <span>{p.name}</span>
            <span>{p.price_xof.toLocaleString("fr-FR")} FCFA</span>
          </li>
        ))}
      </ul>
      <div className="mb-3 flex justify-between border-t-2 border-ink/20 pt-2 text-sm font-black text-ink">
        <span>Total</span>
        <span>{total.toLocaleString("fr-FR")} FCFA</span>
      </div>
      <button
        onClick={handleOrder}
        disabled={ordering}
        className="press-leaf w-full flex items-center justify-center gap-2 rounded-xl bg-leaf px-4 py-2.5 text-sm font-bold text-white transition-all cursor-pointer disabled:opacity-50"
      >
        {ordering ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Enregistrement...
          </>
        ) : (
          <>Commander via WhatsApp</>
        )}
      </button>
    </div>
  );
}
