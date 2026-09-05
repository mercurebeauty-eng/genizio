import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { cn } from "@/lib/utils";
import { MarkdownContent } from "@/components/ui/markdown-content";

export function StepAccordion({
  steps,
  className,
  isProject = false,
  isInvestigation = false,
}: {
  steps: string[];
  className?: string;
  isProject?: boolean;
  isInvestigation?: boolean;
}) {
  if (!steps || steps.length === 0) return null;

  const sectionTitle = isProject
    ? "🛠️ Les phases du projet"
    : isInvestigation
      ? "📋 Étapes d'observation & mesure"
      : "Les étapes du défi";

  const stepPrefix = isProject ? "Phase" : "Étape";

  return (
    <div className={className}>
      <p className="mb-3 text-[11px] font-black uppercase tracking-widest text-ink/70 flex items-center gap-1.5">
        <span>{sectionTitle}</span>
      </p>
      <Accordion type="single" collapsible className="w-full space-y-2">
        {steps.map((step, index) => {
          // Si l'étape est longue, on essaie d'extraire une phrase courte pour le titre,
          // sinon on affiche "Phase/Étape X".
          const firstDot = step.indexOf(".");
          const shortTitle =
            firstDot > 10 && firstDot < 60
              ? step.substring(0, firstDot)
              : `${stepPrefix} ${index + 1}`;

          return (
            <AccordionItem
              key={index}
              value={`step-${index}`}
              className="border border-ink/10 bg-white rounded-xl px-4 overflow-hidden data-[state=open]:bg-white data-[state=open]:shadow-md transition-all"
            >
              <AccordionTrigger className="py-3 hover:no-underline text-ink/80 hover:text-ink text-sm data-[state=open]:text-brand group">
                <div className="flex gap-3 text-left items-center">
                  <span className="font-extrabold text-brand/50 group-data-[state=open]:text-brand">
                    {index + 1}.
                  </span>
                  <span className="font-semibold">
                    <MarkdownContent content={shortTitle} inline />
                  </span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="text-ink/70 leading-relaxed pb-4 pt-1 pl-7">
                <MarkdownContent content={step} inline />
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
