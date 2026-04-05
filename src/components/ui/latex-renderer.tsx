"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * LaTeX Renderer Component
 * 
 * Renders LaTeX mathematical notation using KaTeX.
 * Supports both inline ($...$) and display ($$...$$) math.
 * 
 * Note: This component requires katex to be installed:
 * npm install katex @types/katex
 */

interface LaTeXRendererProps {
  content: string;
  className?: string;
  displayMode?: boolean;
  errorColor?: string;
  throwOnError?: boolean;
}

// Lazy load KaTeX to avoid SSR issues
let katex: typeof import("katex") | null = null;

async function loadKaTeX() {
  if (typeof window !== "undefined" && !katex) {
    katex = await import("katex");
  }
  return katex;
}

export function LaTeXRenderer({
  content,
  className,
  displayMode = false,
  errorColor = "#cc0000",
  throwOnError = false,
}: LaTeXRendererProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let isMounted = true;

    async function renderLatex() {
      if (!containerRef.current || !content) return;

      try {
        const katexModule = await loadKaTeX();
        if (!katexModule || !isMounted) return;

        setIsLoading(false);
        setError(null);

        // Render the LaTeX
        katexModule.default.render(content, containerRef.current, {
          displayMode,
          errorColor,
          throwOnError,
          output: "html",
          trust: false, // Don't allow potentially dangerous commands
          strict: false, // Allow some non-strict input
        });
      } catch (err) {
        if (isMounted) {
          setError(err instanceof Error ? err.message : "Failed to render LaTeX");
          setIsLoading(false);
        }
      }
    }

    renderLatex();

    return () => {
      isMounted = false;
    };
  }, [content, displayMode, errorColor, throwOnError]);

  if (error) {
    return (
      <span
        className={cn(
          "text-red-500 font-mono text-sm bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded",
          className
        )}
        title={error}
      >
        {content}
      </span>
    );
  }

  if (isLoading) {
    return (
      <span
        className={cn(
          "inline-block animate-pulse bg-muted rounded",
          displayMode ? "w-32 h-8 my-2" : "w-16 h-4",
          className
        )}
      />
    );
  }

  return (
    <span
      ref={containerRef}
      className={cn(
        displayMode && "block my-4 text-center overflow-x-auto",
        className
      )}
    />
  );
}

/**
 * Parse and render text that may contain inline or display LaTeX
 */
interface MixedContentRendererProps {
  content: string;
  className?: string;
}

export function MixedContentRenderer({
  content,
  className,
}: MixedContentRendererProps) {
  const [renderedParts, setRenderedParts] = React.useState<React.ReactNode[]>([]);

  React.useEffect(() => {
    if (!content) {
      setRenderedParts([]);
      return;
    }

    const parts: React.ReactNode[] = [];
    let partIndex = 0;

    // Convert content to handle both display and inline math
    const processedContent = content;

    // Split by display math first
    const displayParts = processedContent.split(/(\$\$[^$]+\$\$)/g);

    for (const part of displayParts) {
      if (part.startsWith("$$") && part.endsWith("$$")) {
        // Display math
        const mathContent = part.slice(2, -2);
        parts.push(
          <LaTeXRenderer
            key={`display-${partIndex++}`}
            content={mathContent}
            displayMode={true}
          />
        );
      } else if (part) {
        // Process inline math in this part
        const inlineParts = part.split(/(\$[^$]+\$)/g);

        for (const inlinePart of inlineParts) {
          if (inlinePart.startsWith("$") && inlinePart.endsWith("$") && !inlinePart.startsWith("$$")) {
            // Inline math
            const mathContent = inlinePart.slice(1, -1);
            parts.push(
              <LaTeXRenderer
                key={`inline-${partIndex++}`}
                content={mathContent}
                displayMode={false}
              />
            );
          } else if (inlinePart) {
            // Regular text
            parts.push(
              <span key={`text-${partIndex++}`}>{inlinePart}</span>
            );
          }
        }
      }
    }

    setRenderedParts(parts);
  }, [content]);

  return (
    <div className={cn("latex-content", className)}>
      {renderedParts}
    </div>
  );
}

/**
 * Check if KaTeX is available
 */
export function useKaTeXAvailable(): boolean {
  const [available, setAvailable] = React.useState(false);

  React.useEffect(() => {
    loadKaTeX().then((k) => setAvailable(!!k));
  }, []);

  return available;
}
