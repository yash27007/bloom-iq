"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { AlertCircle, Download, Maximize2, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Mermaid Diagram Renderer Component
 * 
 * Renders Mermaid diagrams (flowcharts, state diagrams, etc.)
 */

interface MermaidRendererProps {
  content: string;
  className?: string;
  theme?: "default" | "dark" | "forest" | "neutral";
  showControls?: boolean;
  onError?: (error: string) => void;
}

// Lazy load Mermaid to avoid SSR issues
let mermaidInstance: typeof import("mermaid").default | null = null;

async function loadMermaid() {
  if (typeof window === "undefined") return null;

  if (!mermaidInstance) {
    const mermaidModule = await import("mermaid");
    mermaidInstance = mermaidModule.default;
  }

  return mermaidInstance;
}

/**
 * Client-side Mermaid syntax validation and fixing
 * Based on official Mermaid.js documentation
 */
function sanitizeMermaidContent(content: string): string {
  if (!content) return "";

  let fixed = content.trim();

  // Remove code block markers
  if (fixed.startsWith("```mermaid")) {
    fixed = fixed.replace(/^```mermaid\s*\n?/, "");
  }
  if (fixed.endsWith("```")) {
    fixed = fixed.replace(/\n?```$/, "");
  }

  // Fix 1: Ensure stateDiagram-v2 is used (not just stateDiagram)
  fixed = fixed.replace(/^stateDiagram\s*$/m, "stateDiagram-v2");
  fixed = fixed.replace(/^stateDiagram\s+(\[\*\])/m, "stateDiagram-v2\n    $1");

  // Fix 2: If diagram type declaration is followed immediately by content on same line, split
  fixed = fixed.replace(
    /^(stateDiagram(?:-v2)?|flowchart\s+(?:TD|TB|BT|LR|RL)|graph\s+(?:TD|TB|BT|LR|RL)|sequenceDiagram|classDiagram)\s+(\[\*\]|[a-zA-Z_])/im,
    "$1\n    $2"
  );

  // Fix 3: Remove parentheses from state IDs in state diagrams
  if (/stateDiagram/i.test(fixed)) {
    // Fix state IDs that incorrectly use parentheses
    fixed = fixed.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\(([^)]+)\)(?=\s*(-->|:|\s|$))/g, (match, id, inner) => {
      if (/^[a-zA-Z0-9_]+$/.test(inner)) {
        return id + inner;
      }
      return match;
    });
  }

  // Fix 4: Ensure arrows in state diagrams are correct (-->)
  if (/stateDiagram/i.test(fixed)) {
    fixed = fixed.replace(/([a-zA-Z0-9_\]])\s*->(?!>)/g, "$1 -->");
  }

  // Fix 5: Fix flowchart missing direction
  fixed = fixed.replace(/^flowchart\s*$/m, "flowchart TD");

  // Fix 6: Fix node text containing special characters like [ ] ( ) that break syntax
  // Wrap text in quotes if it contains special chars
  fixed = fixed.replace(
    /\b([a-zA-Z_][a-zA-Z0-9_]*)\[([^\]"]*[\[\]()][^\]]*)\]/g,
    (match, nodeId, nodeText) => {
      if (!nodeText.startsWith('"') && /[\[\]()]/.test(nodeText)) {
        const escapedText = nodeText.replace(/"/g, '\\"');
        return `${nodeId}["${escapedText}"]`;
      }
      return match;
    }
  );

  // Fix 7: Normalize excessive whitespace
  const lines = fixed.split("\n");
  const normalizedLines = lines.map((line) => {
    const match = line.match(/^(\s*)(.*)/);
    if (match) {
      const indent = match[1];
      const lineContent = match[2].replace(/\s{2,}/g, " ").trim();
      return indent + lineContent;
    }
    return line;
  });
  fixed = normalizedLines.join("\n");

  // Fix 8: Remove accidental quotes around the entire diagram
  fixed = fixed.replace(/^["']([\s\S]*)["']$/, "$1");

  // Fix 9: Ensure proper indentation for diagram body
  const lineArray = fixed.split("\n");
  if (lineArray.length > 1) {
    const firstLine = lineArray[0].trim();
    const bodyLines = lineArray.slice(1);

    const needsIndent = bodyLines.some(
      (line) => line.trim().length > 0 && !line.startsWith("    ") && !line.startsWith("\t")
    );

    if (needsIndent) {
      const indentedBody = bodyLines.map((line) => {
        const trimmed = line.trim();
        if (trimmed.length === 0) return "";
        if (line.startsWith("    ") || line.startsWith("\t")) return line;
        return "    " + trimmed;
      });
      fixed = firstLine + "\n" + indentedBody.join("\n");
    }
  }

  return fixed;
}

export function MermaidRenderer({
  content,
  className,
  theme = "default",
  showControls = true,
  onError,
}: MermaidRendererProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [svg, setSvg] = React.useState<string>("");
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [zoom, setZoom] = React.useState(1);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  React.useEffect(() => {
    let isMounted = true;

    async function renderDiagram() {
      if (!content) return;

      try {
        const mermaid = await loadMermaid();
        if (!mermaid || !isMounted) return;

        // Initialize Mermaid with theme
        mermaid.initialize({
          startOnLoad: false,
          theme: theme === "dark" ? "dark" : "default",
          securityLevel: "strict",
          fontFamily: "inherit",
          flowchart: {
            htmlLabels: true,
            curve: "basis",
          },
          sequence: {
            diagramMarginX: 50,
            diagramMarginY: 10,
            actorMargin: 50,
            width: 150,
            height: 65,
          },
        });

        // Clean and fix content using sanitizer
        const cleanContent = sanitizeMermaidContent(content);

        // Generate unique ID for this diagram
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Render the diagram
        const { svg: renderedSvg } = await mermaid.render(id, cleanContent);

        if (isMounted) {
          setSvg(renderedSvg);
          setError(null);
          setIsLoading(false);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to render diagram";
        if (isMounted) {
          setError(errorMessage);
          setIsLoading(false);
          onError?.(errorMessage);
        }
      }
    }

    renderDiagram();

    return () => {
      isMounted = false;
    };
  }, [content, theme, onError]);

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.25));
  const handleResetZoom = () => setZoom(1);

  const handleDownload = () => {
    if (!svg) return;

    // Create a Blob with the SVG content
    const blob = new Blob([svg], { type: "image/svg+xml" });
    const url = URL.createObjectURL(blob);

    // Create download link
    const a = document.createElement("a");
    a.href = url;
    a.download = `diagram-${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleFullscreen = () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      containerRef.current.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  // Listen for fullscreen changes
  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  if (error) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center p-6 rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20",
          className
        )}
      >
        <AlertCircle className="h-8 w-8 text-red-500 mb-2" />
        <p className="text-sm font-medium text-red-600 dark:text-red-400">
          Failed to render diagram
        </p>
        <p className="text-xs text-red-500 dark:text-red-400 mt-1 max-w-md text-center">
          {error}
        </p>
        <details className="mt-4 w-full max-w-md">
          <summary className="text-xs text-muted-foreground cursor-pointer">
            View source
          </summary>
          <pre className="mt-2 p-2 text-xs bg-muted rounded overflow-x-auto">
            {content}
          </pre>
        </details>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div
        className={cn(
          "flex items-center justify-center p-8 rounded-lg border bg-muted/20",
          className
        )}
      >
        <div className="animate-pulse flex flex-col items-center gap-2">
          <div className="h-32 w-64 bg-muted rounded" />
          <span className="text-xs text-muted-foreground">
            Rendering diagram...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative group rounded-lg border bg-card overflow-hidden",
        isFullscreen && "fixed inset-0 z-50 rounded-none",
        className
      )}
    >
      {/* Controls */}
      {showControls && (
        <div
          className={cn(
            "absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10",
            "bg-background/80 backdrop-blur-sm rounded-lg p-1 shadow-sm border"
          )}
        >
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleZoomOut}
            title="Zoom out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <button
            className="px-2 text-xs font-medium hover:bg-muted rounded"
            onClick={handleResetZoom}
            title="Reset zoom"
          >
            {Math.round(zoom * 100)}%
          </button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleZoomIn}
            title="Zoom in"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <div className="w-px h-4 bg-border mx-1" />
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleDownload}
            title="Download SVG"
          >
            <Download className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={handleFullscreen}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Diagram */}
      <div
        className={cn(
          "flex items-center justify-center p-4 overflow-auto",
          isFullscreen && "h-full"
        )}
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: "center center",
          transition: "transform 0.2s ease",
        }}
      >
        <div
          dangerouslySetInnerHTML={{ __html: svg }}
          className="mermaid-diagram"
        />
      </div>
    </div>
  );
}

/**
 * Parse content that may contain Mermaid code blocks
 */
export function extractMermaidFromContent(content: string): string | null {
  if (!content) return null;

  // Check for Mermaid code block
  const codeBlockMatch = content.match(/```mermaid\s*([\s\S]*?)```/i);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // Check if the entire content is a Mermaid diagram
  const mermaidKeywords = [
    /^stateDiagram/i,
    /^flowchart/i,
    /^graph\s+(TD|TB|BT|RL|LR)/i,
    /^sequenceDiagram/i,
    /^classDiagram/i,
    /^erDiagram/i,
    /^gantt/i,
  ];

  if (mermaidKeywords.some((regex) => regex.test(content.trim()))) {
    return content.trim();
  }

  return null;
}

/**
 * Hook to check if Mermaid is available
 */
export function useMermaidAvailable(): boolean {
  const [available, setAvailable] = React.useState(false);

  React.useEffect(() => {
    loadMermaid().then((m) => setAvailable(!!m));
  }, []);

  return available;
}
