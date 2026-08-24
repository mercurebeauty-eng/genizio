import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export interface FaqItem {
  question: string;
  answer: string;
}

interface FaqSectionProps {
  items?: FaqItem[];
}

export function FaqSection({ items }: FaqSectionProps) {
  if (!items || items.length === 0) return null;

  return (
    <section className="mt-16 border-t border-ink/10 pt-12" aria-labelledby="faq-heading">
      <h2 id="faq-heading" className="font-display text-2xl font-extrabold text-ink mb-6">
        Questions fréquentes
      </h2>
      <Accordion type="single" collapsible className="w-full space-y-4">
        {items.map((item, index) => (
          <AccordionItem
            key={index}
            value={`item-${index}`}
            className="rounded-2xl border border-ink/10 bg-white px-6 shadow-sm"
          >
            <AccordionTrigger className="text-left font-bold text-ink hover:text-brand hover:no-underline">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="text-ink/75 leading-relaxed text-sm">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
