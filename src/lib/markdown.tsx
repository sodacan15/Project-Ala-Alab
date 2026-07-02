import React from "react";

/**
 * Lightweight markdown renderer used across Ala-Alab for previewing
 * context.md files and agent prompt injections without pulling in a
 * full markdown library (matches the parser already used in the
 * Context tab's "Living Canon" viewer, generalized for reuse).
 *
 * Supports:
 *  - # / ## / ### headings
 *  - **bold** and *italic*
 *  - - / * bullet lists
 *  - blank-line paragraph breaks
 */
export function renderMarkdown(markdown: string): React.ReactNode[] {
  if (!markdown || !markdown.trim()) {
    return [
      <p key="empty" className="italic text-[#7c6356]">
        Nothing to preview yet — switch back to Edit and write some Markdown.
      </p>,
    ];
  }

  let headingCounter = 0;

  return markdown.split("\n").map((line, lineIdx) => {
    const trimmed = line.trim();

    if (trimmed.startsWith("#")) {
      const level = trimmed.match(/^#+/)?.[0].length || 1;
      const text = trimmed.replace(/^#+\s*/, "").trim();
      const headingId = `md-heading-${headingCounter++}`;

      if (level === 1) {
        return (
          <h1
            key={lineIdx}
            id={headingId}
            className="font-serif text-base font-extrabold text-[#1d100c] border-b border-terracotta pb-1 mt-3 first:mt-0"
          >
            {text}
          </h1>
        );
      }
      if (level === 2) {
        return (
          <h2 key={lineIdx} id={headingId} className="font-serif text-sm font-bold text-terracotta mt-2.5">
            {text}
          </h2>
        );
      }
      return (
        <h3
          key={lineIdx}
          id={headingId}
          className="font-mono text-[10px] font-bold text-[#251611] uppercase tracking-wide mt-2"
        >
          {text}
        </h3>
      );
    }

    if (trimmed === "") {
      return <div key={lineIdx} className="h-2" />;
    }

    const isBullet = trimmed.startsWith("- ") || trimmed.startsWith("* ");
    const contentText = isBullet ? trimmed.substring(2) : line;

    // Simple **bold** / *italic* inline parser
    const boldItalicRegex = /(\*\*.*?\*\*|\*.*?\*)/g;
    const parts = contentText.split(boldItalicRegex);
    const parsedSpans = parts.map((part, pIdx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={pIdx} className="font-bold text-[#251611]">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("*") && part.endsWith("*")) {
        return (
          <em key={pIdx} className="italic text-[#3c2921]">
            {part.slice(1, -1)}
          </em>
        );
      }
      return part;
    });

    if (isBullet) {
      return (
        <div key={lineIdx} className="flex items-start gap-2 pl-3 font-sans text-[11px] text-[#3c2921]/90 leading-relaxed">
          <span className="text-terracotta select-none mt-1 shrink-0">•</span>
          <span className="font-medium">{parsedSpans}</span>
        </div>
      );
    }

    return (
      <p key={lineIdx} className="font-sans text-[11px] font-medium text-[#3c2921]/90 leading-relaxed">
        {parsedSpans}
      </p>
    );
  });
}
