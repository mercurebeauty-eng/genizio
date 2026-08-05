import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";

export function ObservationPrompts({ className }: { className?: string }) {
  const prompts = [
    "Par quoi l'enfant a-t-il commencé ?",
    "Où a-t-il rencontré des difficultés ?",
    "Qu'est-ce qui a semblé le captiver ?",
    "A-t-il trouvé une solution inattendue ?",
  ];

  return (
    <div className={cn("rounded-2xl bg-sky border border-ink/10 p-4 shadow-sm", className)}>
      <p className="mb-3 text-xs font-extrabold uppercase tracking-widest text-ink flex items-center gap-1.5">
        <Eye className="size-4 text-ink" />
        Pendant que vous observez...
      </p>
      <ul className="space-y-2 text-sm text-ink/80">
        {prompts.map((prompt, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-ink font-bold">•</span>
            <span>{prompt}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
