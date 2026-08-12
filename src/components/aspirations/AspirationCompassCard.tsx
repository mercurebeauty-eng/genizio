import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getAspirationCompass, type AspirationCompassItem } from "@/lib/aspiration.functions";

// « La boussole de Naya » (mode enfant / Quête) et « Univers explorés » (mode parent /
// Portfolio) — analyse §16 : la séquence vécue « Explorons cela → voici ce que Naya
// observe → d'autres directions pourraient correspondre ». Narration 100 % qualitative
// et déterministe : jamais de chiffres, jamais de verdict. Rien si aucune aspiration.
export function AspirationCompassCard({
  childId,
  mode,
}: {
  childId: string;
  mode: "child" | "parent";
}) {
  const compassFn = useServerFn(getAspirationCompass);
  const [items, setItems] = useState<AspirationCompassItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    compassFn({ data: { childId } })
      .then((res) => {
        if (!cancelled) setItems(res.aspirations);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [childId, compassFn]);

  if (items === null || items.length === 0) return null;

  return (
    <div className="w-full rounded-2xl border border-ink/10 bg-white p-4 shadow-sm">
      <p className="mb-2 text-[11px] font-black uppercase tracking-widest text-ink/60">
        {mode === "child" ? "🧭 La boussole de Naya" : "🧭 Univers explorés"}
      </p>
      <ul className="space-y-2.5">
        {items.map((item) => (
          <li key={item.label} className="flex items-start gap-2.5">
            <span className="mt-0.5 inline-flex shrink-0 items-center rounded-full border border-sky-200 bg-sky-50 px-2.5 py-0.5 text-[11px] font-black text-sky-800">
              {item.label}
            </span>
            <p className="text-xs leading-5 text-ink/70">
              {mode === "child" ? item.childLine : item.parentLine}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
