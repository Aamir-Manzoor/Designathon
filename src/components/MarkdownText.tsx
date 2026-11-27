"use client";

import React from "react";

function renderInline(text: string): React.ReactNode[] {
  // Matches `code`, **bold**, or *italic*
  const tokenRegex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*\n]+\*)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, idx) => {
    if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
      return (
        <code
          key={idx}
          className="rounded bg-[var(--surface-1)] px-1.5 py-0.5 font-mono text-[0.9em] text-[var(--accent)] ring-1 ring-[var(--border-subtle)]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-[var(--text-primary)]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return (
        <em key={idx} className="italic text-[var(--text-secondary)]">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

export function MarkdownText({
  content,
  className = "",
}: {
  content: string;
  className?: string;
}) {
  if (!content) return null;

  // Split out fenced code blocks first
  const blocks = content.split(/(```[\s\S]*?```)/g);

  return (
    <div className={`space-y-2 leading-relaxed ${className}`}>
      {blocks.map((block, bIdx) => {
        if (block.startsWith("```") && block.endsWith("```")) {
          const inner = block.replace(/^```[^\n]*\n?/, "").replace(/```$/, "");
          return (
            <pre
              key={bIdx}
              className="overflow-x-auto rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-1)] p-2.5 font-mono text-[11px] text-[var(--text-primary)]"
            >
              <code>{inner.trim()}</code>
            </pre>
          );
        }

        const lines = block.split("\n");
        const elements: React.ReactNode[] = [];
        let listItems: React.ReactNode[] = [];

        const flushList = (keyPrefix: string) => {
          if (listItems.length > 0) {
            elements.push(
              <ul
                key={`${keyPrefix}-ul`}
                className="ml-4 list-disc space-y-1 text-[var(--text-secondary)]"
              >
                {listItems}
              </ul>
            );
            listItems = [];
          }
        };

        lines.forEach((rawLine, lIdx) => {
          const line = rawLine.trim();
          if (!line) {
            flushList(`${bIdx}-${lIdx}`);
            return;
          }

          const bulletMatch = line.match(/^[-*]\s+(.+)$/);
          if (bulletMatch) {
            listItems.push(
              <li key={`${bIdx}-${lIdx}`}>{renderInline(bulletMatch[1])}</li>
            );
            return;
          }

          flushList(`${bIdx}-${lIdx}`);

          const headingMatch = line.match(/^#{1,3}\s+(.+)$/);
          if (headingMatch) {
            elements.push(
              <div
                key={`${bIdx}-${lIdx}`}
                className="font-semibold text-[var(--text-primary)]"
              >
                {renderInline(headingMatch[1])}
              </div>
            );
            return;
          }

          elements.push(
            <p key={`${bIdx}-${lIdx}`} className="text-[var(--text-secondary)]">
              {renderInline(line)}
            </p>
          );
        });

        flushList(`${bIdx}-end`);
        return <React.Fragment key={bIdx}>{elements}</React.Fragment>;
      })}
    </div>
  );
}
