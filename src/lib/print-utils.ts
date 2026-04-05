type PageOrientation = "portrait" | "landscape";

interface ProfessionalPrintOptions {
  title: string;
  html: string;
  orientation?: PageOrientation;
  autoClose?: boolean;
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
    table-layout: fixed;
  }

  th,
  td {
    border: 1px solid #111827;
    padding: 6px;
    vertical-align: top;
    word-break: break-word;
  }

  th {
    font-weight: 700;
    text-align: left;
    background: #f3f4f6;
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
  const { title, html, orientation = "portrait", autoClose = true } = options;

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

  printWindow.document.open();
  printWindow.document.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${safeTitle}</title>
        <style>${createPrintStyles(orientation)}</style>
      </head>
      <body>
        <main class="print-shell">${html}</main>
        <script>
          (function () {
            function startPrint() {
              window.focus();
              window.print();
              ${closeScript}
            }

            if (document.readyState === "complete") {
              setTimeout(startPrint, 120);
            } else {
              window.addEventListener("load", function () {
                setTimeout(startPrint, 120);
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
