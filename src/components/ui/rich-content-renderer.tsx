"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { MixedContentRenderer } from "./latex-renderer";
import { MermaidRenderer, extractMermaidFromContent } from "./mermaid-renderer";
import { Badge } from "./badge";
import { Code, FileText, Sigma, GitBranch } from "lucide-react";

export type RenderingType = "TEXT" | "LATEX" | "MERMAID" | "MIXED";

interface RichContentRendererProps {
  content: string;
  renderingType?: RenderingType;
  latexContent?: string;
  mermaidContent?: string;
  className?: string;
  showTypeIndicator?: boolean;
}

/**
 * Rich Content Renderer
 * 
 * Automatically detects and renders:
 * - Plain text
 * - LaTeX mathematical notation
 * - Mermaid diagrams
 * - Mixed content (text + LaTeX + Mermaid)
 */
export function RichContentRenderer({
  content,
  renderingType,
  latexContent,
  mermaidContent,
  className,
  showTypeIndicator = false,
}: RichContentRendererProps) {
  const detectedType = React.useMemo(() => {
    if (renderingType) return renderingType;
    return detectContentType(content);
  }, [content, renderingType]);

  const renderContent = () => {
    switch (detectedType) {
      case "LATEX":
        return (
          <MixedContentRenderer
            content={latexContent || content}
            className={className}
          />
        );

      case "MERMAID":
        const mermaidSource = mermaidContent || extractMermaidFromContent(content);
        return mermaidSource ? (
          <MermaidRenderer
            content={mermaidSource}
            className={cn("my-4", className)}
          />
        ) : (
          <div className={cn("whitespace-pre-wrap", className)}>{content}</div>
        );

      case "MIXED":
        return (
          <MixedContentWithDiagrams
            content={content}
            latexContent={latexContent}
            mermaidContent={mermaidContent}
            className={className}
          />
        );

      case "TEXT":
      default:
        return (
          <div className={cn("whitespace-pre-wrap", className)}>
            {content}
          </div>
        );
    }
  };

  return (
    <div className="rich-content">
      {showTypeIndicator && (
        <RenderingTypeBadge type={detectedType} className="mb-2" />
      )}
      {renderContent()}
    </div>
  );
}

/**
 * Detect content type based on content
 */
function detectContentType(content: string): RenderingType {
  if (!content) return "TEXT";

  const hasLatex = /\$[^$]+\$|\$\$[^$]+\$\$/.test(content);
  const hasMermaid = /```mermaid|^(stateDiagram|flowchart|graph\s+(TD|TB|BT|RL|LR)|sequenceDiagram|classDiagram)/im.test(content);

  if (hasLatex && hasMermaid) return "MIXED";
  if (hasLatex) return "LATEX";
  if (hasMermaid) return "MERMAID";
  return "TEXT";
}

/**
 * Mixed content renderer that handles text, LaTeX, and Mermaid
 */
function MixedContentWithDiagrams({
  content,
  mermaidContent: _mermaidContent,
  className,
}: {
  content: string;
  latexContent?: string;
  mermaidContent?: string;
  className?: string;
}) {
  // Split content by Mermaid code blocks
  const parts = React.useMemo(() => {
    const result: Array<{ type: "text" | "mermaid"; content: string }> = [];
    const mermaidRegex = /(```mermaid[\s\S]*?```)/gi;

    let lastIndex = 0;
    let match;

    while ((match = mermaidRegex.exec(content)) !== null) {
      // Add text before the Mermaid block
      if (match.index > lastIndex) {
        const textPart = content.slice(lastIndex, match.index);
        if (textPart.trim()) {
          result.push({ type: "text", content: textPart });
        }
      }

      // Add the Mermaid block
      const mermaidSource = extractMermaidFromContent(match[1]);
      if (mermaidSource) {
        result.push({ type: "mermaid", content: mermaidSource });
      }

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      const remainingText = content.slice(lastIndex);
      if (remainingText.trim()) {
        result.push({ type: "text", content: remainingText });
      }
    }

    return result;
  }, [content]);

  return (
    <div className={cn("space-y-4", className)}>
      {parts.map((part, index) => (
        <React.Fragment key={index}>
          {part.type === "mermaid" ? (
            <MermaidRenderer content={part.content} />
          ) : (
            <MixedContentRenderer content={part.content} />
          )}
        </React.Fragment>
      ))}

      {/* Render explicit Mermaid content if provided and not in main content */}
      {_mermaidContent && !content.includes("```mermaid") && (
        <MermaidRenderer content={_mermaidContent} />
      )}
    </div>
  );
}

/**
 * Badge indicating the rendering type
 */
interface RenderingTypeBadgeProps {
  type: RenderingType;
  className?: string;
}

export function RenderingTypeBadge({ type, className }: RenderingTypeBadgeProps) {
  const config: Record<RenderingType, { icon: React.ElementType; label: string; color: string }> = {
    TEXT: {
      icon: FileText,
      label: "Text",
      color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
    },
    LATEX: {
      icon: Sigma,
      label: "LaTeX",
      color: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
    },
    MERMAID: {
      icon: GitBranch,
      label: "Diagram",
      color: "bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300",
    },
    MIXED: {
      icon: Code,
      label: "Rich",
      color: "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
    },
  };

  const { icon: Icon, label, color } = config[type];

  return (
    <Badge variant="outline" className={cn("gap-1", color, className)}>
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
}

/**
 * Question Display Component with Rich Content Support
 */
interface QuestionDisplayProps {
  question: string;
  answer: string;
  renderingType?: RenderingType;
  latexContent?: string;
  mermaidContent?: string;
  showAnswer?: boolean;
  className?: string;
}

export function QuestionDisplay({
  question,
  answer,
  renderingType,
  latexContent,
  mermaidContent,
  showAnswer = true,
  className,
}: QuestionDisplayProps) {
  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <h4 className="font-medium text-sm text-muted-foreground mb-1">
          Question
        </h4>
        <RichContentRenderer
          content={question}
          renderingType={renderingType}
          latexContent={latexContent}
          mermaidContent={mermaidContent}
          className="text-foreground"
        />
      </div>

      {showAnswer && (
        <div className="pt-4 border-t">
          <h4 className="font-medium text-sm text-muted-foreground mb-1">
            Answer
          </h4>
          <RichContentRenderer
            content={answer}
            renderingType={renderingType}
            className="text-foreground"
          />
        </div>
      )}
    </div>
  );
}
