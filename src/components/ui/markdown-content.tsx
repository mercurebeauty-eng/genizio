// Renders AI-generated text safely, whether or not the model actually emits
// Markdown syntax. Prompts instruct the AI to avoid Markdown in structured
// fields, but this is a defensive backstop: a stray #, **, or - list marker
// renders correctly instead of showing up as literal characters.
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";

const blockComponents: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-bold text-ink">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  ul: ({ children }) => <ul className="list-disc pl-5 space-y-1 mb-2 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 space-y-1 mb-2 last:mb-0">{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  // These are short UI snippets, not documents — real <h1>-<h3> tags would be
  // semantically wrong (multiple per page) and visually oversized, so any
  // heading syntax the model emits anyway just renders as bold inline text.
  h1: ({ children }) => <p className="font-display font-bold mb-1">{children}</p>,
  h2: ({ children }) => <p className="font-display font-bold mb-1">{children}</p>,
  h3: ({ children }) => <p className="font-display font-bold mb-1">{children}</p>,
  a: ({ children, href }) => (
    <a href={href} className="underline text-brand" target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-brand/40 pl-3 italic text-ink/70">{children}</blockquote>
  ),
  code: ({ children }) => <code className="rounded bg-ink/5 px-1 py-0.5 text-[0.9em]">{children}</code>,
};

const inlineComponents: Components = {
  ...blockComponents,
  // Swap block-level wrappers for fragments so this can drop into a <li>,
  // <span>, or badge without an unwanted extra block box / margin.
  p: ({ children }) => <>{children}</>,
};

export function MarkdownContent({
  content,
  className,
  inline = false,
}: {
  content: string | null | undefined;
  className?: string;
  /** Render without block-level wrapping — for use inside <li>/<span>/chips. */
  inline?: boolean;
}) {
  if (!content) return null;
  return (
    <div className={className}>
      <ReactMarkdown components={inline ? inlineComponents : blockComponents}>{content}</ReactMarkdown>
    </div>
  );
}
