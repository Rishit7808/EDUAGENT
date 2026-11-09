import React, { useMemo } from 'react';
import { marked } from 'marked';
import katex from 'katex';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  const renderedHtml = useMemo(() => {
    if (!content) return '';

    // Step 1: Extract and pre-render LaTeX math blocks: $$...$$ or \[...\]
    const blockMathRegex = /\$\$([\s\S]*?)\$\$|\\\[([\s\S]*?)\\\]/g;
    let processed = content.replace(blockMathRegex, (_match, eq1, eq2) => {
      const eq = (eq1 || eq2 || '').trim();
      try {
        return `<div class="katex-block my-3 overflow-x-auto py-1 text-center">${katex.renderToString(eq, {
          displayMode: true,
          throwOnError: false,
        })}</div>`;
      } catch (err) {
        return `<div class="katex-error text-amber-400 font-mono text-xs my-2">${eq}</div>`;
      }
    });

    // Step 2: Extract and pre-render inline LaTeX math: $...$ or \(...\)
    // Avoid double matching $$ or currency like $100
    const inlineMathRegex = /(?<!\$)\$(?!\$)(.+?)(?<!\$)\$(?!\$)|\\\(([\s\S]*?)\\\)/g;
    processed = processed.replace(inlineMathRegex, (match, eq1, eq2) => {
      const eq = (eq1 || eq2 || '').trim();
      // If it looks purely like a price or non-math currency ($10 or $100), ignore
      if (/^\d+(\.\d+)?$/.test(eq)) {
        return match;
      }
      try {
        return `<span class="katex-inline inline-block px-0.5">${katex.renderToString(eq, {
          displayMode: false,
          throwOnError: false,
        })}</span>`;
      } catch (err) {
        return `<span class="katex-error text-amber-400 font-mono text-xs">${eq}</span>`;
      }
    });

    // Step 3: Render marked markdown
    marked.setOptions({
      gfm: true,
      breaks: true,
    });

    try {
      return marked.parse(processed) as string;
    } catch (_err) {
      return content;
    }
  }, [content]);

  return (
    <div
      className={`prose-eduagent space-y-3 leading-relaxed ${className}`}
      dangerouslySetInnerHTML={{ __html: renderedHtml }}
    />
  );
};

