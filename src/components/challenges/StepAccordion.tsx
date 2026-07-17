import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

export function StepAccordion({ steps, className }: { steps: string[], className?: string }) {
  if (!steps || steps.length === 0) return null;

  return (
    <div className={className}>
      <p className="mb-3 text-[10px] font-extrabold uppercase tracking-widest text-ink/40">
        Les étapes du défi
      </p>
      <Accordion type="single" collapsible className="w-full space-y-2">
        {steps.map((step, index) => {
          // Si l'étape est longue, on essaie d'extraire une phrase courte pour le titre,
          // sinon on affiche "Étape X".
          const firstDot = step.indexOf(".");
          const shortTitle = firstDot > 10 && firstDot < 60 ? step.substring(0, firstDot) : `Étape ${index + 1}`;
          
          return (
            <AccordionItem 
              key={index} 
              value={`step-${index}`} 
              className="border-2 border-ink bg-white rounded-xl px-4 overflow-hidden data-[state=open]:bg-white data-[state=open]:shadow-brutal-sm transition-all"
            >
              <AccordionTrigger className="py-3 hover:no-underline text-ink/80 hover:text-ink text-sm data-[state=open]:text-brand group">
                <div className="flex gap-3 text-left items-center">
                  <span className="font-extrabold text-brand/50 group-data-[state=open]:text-brand">
                    {index + 1}.
                  </span>
                  <span className="font-semibold">
                    {shortTitle}
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-ink/70 leading-relaxed pb-4 pt-1 pl-7">
                {step}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
