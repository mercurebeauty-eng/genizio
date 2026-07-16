import { Eye } from "lucide-react";
import { cn } from "@/lib/utils";

export function ObservationPrompts({ className }: { className?: string }) {
  const prompts = [
    "Par quoi l'enfant a-t-il commencé ?",
    "Où a-t-il rencontré des difficultés ?",
    "Qu'est-ce qui a semblé le captiver ?",
    "A-t-il trouvé une solution inattendue ?"
  ];

  return (
    <div className={cn("rounded-2xl bg-sky-50/50 border border-sky-100 p-4", className)}>
      <p className="mb-3 text-xs font-extrabold uppercase tracking-widest text-sky-800 flex items-center gap-1.5">
        <Eye className="size-4 text-sky-600" />
        Pendant que vous observez...
      </p>
      <ul className="space-y-2 text-sm text-sky-900/80">
        {prompts.map((prompt, i) => (
          <li key={i} className="flex gap-2">
            <span className="text-sky-400 font-bold">•</span>
            <span>{prompt}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
