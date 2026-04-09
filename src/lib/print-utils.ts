type PageOrientation = "portrait" | "landscape";

interface ProfessionalPrintOptions {
  title: string;
  html: string;
  orientation?: PageOrientation;
  autoClose?: boolean;
  renderRichContent?: boolean;
}

const PROFESSIONAL_PRINT_STYLES = `
  :root {
    color-scheme: light;
  }

  @page {
    size: A4 portrait;
    margin: 14mm;
  }

  * {
    box-sizing: border-box;
    -webkit-user-select: text;
    user-select: text;
  }

  html,
  body {
    margin: 0;
    padding: 0;
    background: #ffffff;
    color: #111827;
    font-family: "Times New Roman", Times, serif;
    font-size: 12px;
    line-height: 1.45;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .print-shell {
    width: 100%;
  }

  h1,
  h2,
  h3,
  h4,
  h5,
  h6,
  p {
    margin: 0;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: auto;
  }

  th,
  td {
    border: 1px solid #111827;
    padding: 4px 6px;
    vertical-align: top;
    word-break: normal;
    overflow-wrap: normal;
  }

  th {
    font-weight: 700;
    text-align: left;
    background: #f3f4f6;
    white-space: nowrap;
  }

  .print-paper-table,
  .print-answer-table,
  .print-qna-table {
    table-layout: fixed;
  }

  .print-paper-table td.col-question,
  .print-answer-table td.col-question,
  .print-answer-table td.col-answer,
  .print-qna-table td.col-question,
  .print-qna-table td.col-answer {
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  .text-center {
    text-align: center;
  }

  .text-left {
    text-align: left;
  }

  .text-sm {
    font-size: 12px;
  }

  .text-base {
    font-size: 14px;
  }

  .text-xl {
    font-size: 20px;
  }

  .font-medium {
    font-weight: 600;
  }

  .font-semibold {
    font-weight: 600;
  }

  .font-bold {
    font-weight: 700;
  }

  .uppercase {
    text-transform: uppercase;
  }

  .tracking-wide {
    letter-spacing: 0.02em;
  }

  .whitespace-pre-wrap {
    white-space: pre-wrap;
  }

  .mx-auto {
    margin-left: auto;
    margin-right: auto;
  }

  .max-w-5xl {
    max-width: 1000px;
  }

  .max-w-4xl {
    max-width: 900px;
  }

  .mt-1 {
    margin-top: 4px;
  }

  .mt-2 {
    margin-top: 8px;
  }

  .space-y-1 > * + * {
    margin-top: 4px;
  }

  .space-y-2 > * + * {
    margin-top: 8px;
  }

  .space-y-4 > * + * {
    margin-top: 16px;
  }

  .space-y-6 > * + * {
    margin-top: 24px;
  }

  .border {
    border: 1px solid #111827;
  }

  .border-collapse {
    border-collapse: collapse;
  }

  .border-border {
    border-color: #111827;
  }

  .border-black {
    border-color: #111827;
  }

  .px-2 {
    padding-left: 6px;
    padding-right: 6px;
  }

  .py-1 {
    padding-top: 4px;
    padding-bottom: 4px;
  }

  .print\\:hidden {
    display: none !important;
  }

  .print-math-display {
    display: block;
    margin: 3px 0;
    overflow-x: auto;
    text-align: center;
  }

  .print-math-inline {
    display: inline;
  }

  .print-mermaid-container {
    margin: 4px 0;
    border: 1px solid #d1d5db;
    padding: 4px;
    background: #f9fafb;
    overflow-x: auto;
  }

  .print-mermaid {
    white-space: pre-wrap;
    font-family: "Courier New", monospace;
    font-size: 11px;
  }

  .print-mermaid-svg svg {
    max-width: 100%;
    height: auto;
  }
`;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function createPrintStyles(orientation: PageOrientation) {
  const dynamicPageRule = `@page { size: A4 ${orientation}; margin: 14mm; }`;
  return `${PROFESSIONAL_PRINT_STYLES}\n${dynamicPageRule}`;
}

export function openProfessionalPrintWindow(options: ProfessionalPrintOptions) {
  const {
    title,
    html,
    orientation = "portrait",
    autoClose = true,
    renderRichContent = false,
  } = options;

  if (!html.trim()) {
    return { ok: false as const, error: "No printable content available." };
  }

  const printWindow = window.open("", "_blank", "width=1100,height=900");

  if (!printWindow) {
    return {
      ok: false as const,
      error: "Unable to open print preview window.",
    };
  }

  const safeTitle = escapeHtml(title);
  const closeScript = autoClose
    ? "setTimeout(function () { window.close(); }, 300);"
    : "";
  const richHead = renderRichContent
    ? '<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" crossorigin="anonymous" />'
    : "";

  printWindow.document.open();
  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${safeTitle}</title>
        ${richHead}
        <style>${createPrintStyles(orientation)}</style>
      </head>
      <body>
        <main class="print-shell">${html}</main>
        <script>
          (function () {
            async function loadScript(src) {
              return new Promise(function (resolve, reject) {
                var script = document.createElement("script");
                script.src = src;
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
              });
            }

            async function renderMath() {
              var mathNodes = document.querySelectorAll(".print-math-inline[data-latex], .print-math-display[data-latex]");
              if (!mathNodes.length) return;

              try {
                await loadScript("https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js");
              } catch (_err) {
                return;
              }

              if (typeof window.katex === "undefined") return;

              mathNodes.forEach(function (node) {
                var latex = node.getAttribute("data-latex") || "";
                if (!latex.trim()) return;

                try {
                  var isDisplay = node.classList.contains("print-math-display");
                  window.katex.render(latex, node, {
                    displayMode: isDisplay,
                    throwOnError: false,
                    strict: false,
                  });
                } catch (_e) {
                  // Keep fallback source text when rendering fails.
                }
              });
            }

            async function renderMermaidDiagrams() {
              var mermaidBlocks = Array.prototype.slice.call(
                document.querySelectorAll("pre.print-mermaid"),
              );
              if (!mermaidBlocks.length) return;

              try {
                await loadScript("https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js");
              } catch (_err) {
                return;
              }

              if (typeof window.mermaid === "undefined") return;

              window.mermaid.initialize({
                startOnLoad: false,
                securityLevel: "loose",
                theme: "default",
              });

              for (var i = 0; i < mermaidBlocks.length; i += 1) {
                var source = (mermaidBlocks[i].textContent || "").trim();
                if (!source) continue;

                try {
                  var renderId = "print-mermaid-" + Date.now() + "-" + i;
                  var rendered = await window.mermaid.render(renderId, source);
                  var container = mermaidBlocks[i].closest(".print-mermaid-container");
                  if (!container) continue;
                  container.innerHTML = '<div class="print-mermaid-svg">' + rendered.svg + "</div>";
                } catch (_e) {
                  // Keep original mermaid source on rendering failure.
                }
              }
            }

            async function renderRichContent() {
              ${renderRichContent ? "await renderMath(); await renderMermaidDiagrams();" : "return;"}
            }

            async function startPrint() {
              try {
                await renderRichContent();
              } catch (_e) {
                // Print even if rich rendering fails.
              }

              window.focus();
              window.print();
              ${closeScript}
            }

            if (document.readyState === "complete") {
              setTimeout(function () {
                startPrint();
              }, 120);
            } else {
              window.addEventListener("load", function () {
                setTimeout(function () {
                  startPrint();
                }, 120);
              });
            }
          })();
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();

  return { ok: true as const };
}
