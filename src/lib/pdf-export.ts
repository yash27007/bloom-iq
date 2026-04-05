/**
 * PDF Export Utilities for Question Bank
 * Generates professional PDFs for questions with/without answers
 * Supports LaTeX mathematical notation and Mermaid diagrams
 */

interface QuestionForExport {
  question: string;
  answer: string;
  marks: string;
  difficultyLevel: string;
  bloomLevel: string;
  generationType: string;
  unit?: number;
}

interface ExportOptions {
  includeAnswers: boolean;
  includeMetadata: boolean;
  courseName?: string;
  materialName?: string;
  title?: string;
}

interface ComplianceReportPDFData {
  title: string;
  courseName: string;
  generatedAt?: string;
  overallComplianceScore: number;
  totalIssueCount: number;
  summary: {
    totalQuestions: number;
    totalMarks: number;
    missingCOs: string[];
    unmappedQuestions: number;
  };
  items: Array<{
    questionNumber: string;
    questionText: string;
    current: {
      marks: number;
      part?: "A" | "B";
      bloomLevel?: string;
      courseOutcome?: string;
    };
    issues: string[];
    suggestions: string[];
    suggestedMarks?: number;
    suggestedBloomLevel?: string;
    suggestedCourseOutcome?: string;
    isCompliant: boolean;
  }>;
  generalRecommendations: string[];
}

/**
 * Escape HTML special characters for safe embedding
 */
function escapeHtmlAttr(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Process content to render LaTeX and Mermaid in HTML
 * Creates placeholders that will be rendered by KaTeX and Mermaid JS
 */
function processRichContent(content: string): string {
  if (!content) return content;

  let processed = content;

  // Store Mermaid diagrams with placeholders to preserve their newlines
  const mermaidBlocks: string[] = [];
  processed = processed.replace(
    /```mermaid\s*([\s\S]*?)```/gi,
    (_, diagramCode) => {
      const cleanCode = diagramCode.trim();
      const id = `mermaid-${Math.random().toString(36).substring(2, 11)}`;
      const placeholder = `<<<MERMAID_BLOCK_${mermaidBlocks.length}>>>`;
      // Store the full HTML with preserved newlines
      mermaidBlocks.push(
        `<div class="mermaid-container"><pre class="mermaid" id="${id}">${cleanCode}</pre></div>`,
      );
      return placeholder;
    },
  );

  // Process display math ($$...$$) - be greedy but careful with multi-line
  processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (_, latex) => {
    const cleanLatex = latex.trim();
    return `<span class="math-display" data-latex="${escapeHtmlAttr(cleanLatex)}">$$${cleanLatex}$$</span>`;
  });

  // Process inline math ($...$) - avoid matching $$ or empty $
  processed = processed.replace(/(?<!\$)\$([^\$\n]+?)\$(?!\$)/g, (_, latex) => {
    const cleanLatex = latex.trim();
    return `<span class="math-inline" data-latex="${escapeHtmlAttr(cleanLatex)}">$${cleanLatex}$</span>`;
  });

  // Convert newlines to <br> for proper display in regular text
  processed = processed.replace(/\n/g, "<br>");

  // Restore Mermaid blocks (they keep their original newlines in <pre> tags)
  mermaidBlocks.forEach((block, index) => {
    processed = processed.replace(`<<<MERMAID_BLOCK_${index}>>>`, block);
  });

  return processed;
}

/**
 * Export questions as PDF using browser print dialog
 * This avoids external dependencies and uses native browser capabilities
 */
export function exportQuestionsToPDF(
  questions: QuestionForExport[],
  options: ExportOptions,
): void {
  const {
    includeAnswers = false,
    includeMetadata = true,
    courseName = "Question Bank",
    title = "Generated Questions",
  } = options;

  // Create a new window for printing
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    throw new Error("Failed to open print window. Please allow popups.");
  }

  // Generate HTML content
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>${title}</title>
    <!-- KaTeX CSS -->
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css" crossorigin="anonymous">
    <style>
        @media print {
            @page {
                margin: 2cm;
                size: A4;
            }
            body {
                margin: 0;
                padding: 0;
            }
            .page-break {
                page-break-after: always;
            }
            .no-print {
                display: none !important;
            }
            .mermaid-container {
                page-break-inside: avoid;
            }
        }

        body {
            font-family: 'Times New Roman', serif;
            line-height: 1.6;
            color: #000;
            max-width: 21cm;
            margin: 0 auto;
            padding: 20px;
            background: #fff;
        }

        .loading-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(255,255,255,0.95);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            z-index: 9999;
            font-family: Arial, sans-serif;
        }

        .loading-overlay.hidden {
            display: none;
        }

        .loading-spinner {
            width: 50px;
            height: 50px;
            border: 4px solid #e0e0e0;
            border-top-color: #2196f3;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }

        @keyframes spin {
            to { transform: rotate(360deg); }
        }

        .loading-text {
            margin-top: 16px;
            font-size: 16px;
            color: #666;
        }

        .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #000;
            padding-bottom: 20px;
        }

        .header h1 {
            margin: 0;
            font-size: 24px;
            font-weight: bold;
            text-transform: uppercase;
        }

        .header p {
            margin: 5px 0;
            font-size: 14px;
        }

        .metadata {
            margin-bottom: 20px;
            padding: 10px;
            background: #f5f5f5;
            border-left: 4px solid #333;
        }

        .metadata p {
            margin: 5px 0;
            font-size: 12px;
        }

        .question-block {
            margin-bottom: 30px;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 4px;
            page-break-inside: avoid;
        }

        .question-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
            padding-bottom: 10px;
            border-bottom: 1px solid #eee;
        }

        .question-number {
            font-weight: bold;
            font-size: 16px;
        }

        .question-badges {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }

        .badge {
            display: inline-block;
            padding: 4px 8px;
            font-size: 10px;
            font-weight: bold;
            text-transform: uppercase;
            border-radius: 3px;
            border: 1px solid #333;
        }

        .badge-marks { background: #e3f2fd; }
        .badge-difficulty { background: #fff3e0; }
        .badge-bloom { background: #f3e5f5; }
        .badge-type { background: #e8f5e9; }

        .question-text {
            font-size: 14px;
            font-weight: 500;
            margin: 15px 0;
            line-height: 1.8;
        }

        .answer-section {
            margin-top: 15px;
            padding: 15px;
            background: #f9f9f9;
            border-left: 4px solid #4caf50;
        }

        .answer-label {
            font-weight: bold;
            color: #2e7d32;
            margin-bottom: 8px;
        }

        .answer-text {
            font-size: 13px;
            line-height: 1.8;
        }

        /* Mermaid diagram styles */
        .mermaid-container {
            margin: 15px 0;
            padding: 15px;
            background: #fafafa;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            text-align: center;
            overflow-x: auto;
        }

        .mermaid {
            text-align: center;
        }

        .mermaid svg {
            max-width: 100%;
            height: auto;
        }

        /* Math display styles */
        .math-display {
            display: block;
            margin: 1em 0;
            text-align: center;
            overflow-x: auto;
        }

        .math-inline {
            display: inline;
        }

        /* KaTeX overrides for better printing */
        .katex { font-size: 1.1em; }
        .katex-display { margin: 0.5em 0; }

        .footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #ddd;
            text-align: center;
            font-size: 11px;
            color: #666;
        }

        .print-button {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 24px;
            background: #2196f3;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
            z-index: 1000;
        }

        .print-button:hover {
            background: #1976d2;
        }

        .print-button:disabled {
            background: #ccc;
            cursor: not-allowed;
        }

        @media screen {
            body {
                background: #f5f5f5;
                padding: 40px 20px;
            }
        }

        /* Error state for diagrams */
        .mermaid-error {
            color: #d32f2f;
            padding: 10px;
            background: #ffebee;
            border-radius: 4px;
            font-family: monospace;
            font-size: 12px;
            white-space: pre-wrap;
        }
    </style>
</head>
<body>
    <!-- Loading overlay -->
    <div id="loading-overlay" class="loading-overlay">
        <div class="loading-spinner"></div>
        <div class="loading-text">Rendering mathematical content and diagrams...</div>
    </div>

    <button id="print-btn" class="print-button no-print" disabled onclick="window.print()">
        ⏳ Loading...
    </button>

    <div class="header">
        <h1>${title}</h1>
        <p>${courseName}</p>
        <p>Generated on: ${new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}</p>
    </div>

    ${
      includeMetadata
        ? `
    <div class="metadata">
        <p><strong>Total Questions:</strong> ${questions.length}</p>
        <p><strong>Document Type:</strong> ${
          includeAnswers ? "Questions with Answer Key" : "Questions Only"
        }</p>
        <p><strong>Note:</strong> This document contains generated questions for educational purposes.</p>
    </div>
    `
        : ""
    }

    ${questions
      .map(
        (q, index) => `
        <div class="question-block">
            <div class="question-header">
                <span class="question-number">Question ${index + 1}</span>
                <div class="question-badges">
                    <span class="badge badge-marks">${q.marks} Marks</span>
                    <span class="badge badge-difficulty">${q.difficultyLevel}</span>
                    ${
                      includeMetadata
                        ? `
                        <span class="badge badge-bloom">${q.bloomLevel}</span>
                        <span class="badge badge-type">${q.generationType}</span>
                    `
                        : ""
                    }
                    ${q.unit ? `<span class="badge">Unit ${q.unit}</span>` : ""}
                </div>
            </div>
            
            <div class="question-text">
                ${processRichContent(q.question)}
            </div>

            ${
              includeAnswers
                ? `
                <div class="answer-section">
                    <div class="answer-label">Answer:</div>
                    <div class="answer-text">${processRichContent(q.answer)}</div>
                </div>
            `
                : ""
            }
        </div>
    `,
      )
      .join("\n")}

    <div class="footer">
        <p>Generated by BloomIQ Question Generation System</p>
        <p>${courseName} | ${new Date().getFullYear()}</p>
    </div>

    <!-- Load scripts synchronously for proper rendering order -->
    <script src="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js" crossorigin="anonymous"></script>
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js"></script>
    <script>
        (async function() {
            const overlay = document.getElementById('loading-overlay');
            const printBtn = document.getElementById('print-btn');
            
            try {
                // Initialize Mermaid with proper config
                mermaid.initialize({ 
                    startOnLoad: false,
                    theme: 'default',
                    securityLevel: 'loose',
                    fontFamily: 'Arial, sans-serif',
                    flowchart: {
                        useMaxWidth: true,
                        htmlLabels: true
                    },
                    stateDiagram: {
                        useMaxWidth: true
                    }
                });

                // Render all Mermaid diagrams
                const mermaidElements = document.querySelectorAll('.mermaid');
                for (let i = 0; i < mermaidElements.length; i++) {
                    const el = mermaidElements[i];
                    try {
                        const graphDefinition = el.textContent.trim();
                        const { svg } = await mermaid.render('mermaid-svg-' + i, graphDefinition);
                        el.innerHTML = svg;
                    } catch (err) {
                        console.error('Mermaid render error:', err);
                        el.innerHTML = '<div class="mermaid-error">Diagram rendering failed: ' + (err.message || 'Unknown error') + '</div>';
                    }
                }

                // Render KaTeX math
                if (typeof katex !== 'undefined') {
                    // Render display math
                    document.querySelectorAll('.math-display').forEach(function(el) {
                        const latex = el.getAttribute('data-latex');
                        if (latex) {
                            try {
                                katex.render(latex, el, { 
                                    displayMode: true, 
                                    throwOnError: false,
                                    output: 'html'
                                });
                            } catch (e) {
                                console.error('KaTeX display error:', e);
                                el.textContent = '$$' + latex + '$$';
                            }
                        }
                    });

                    // Render inline math
                    document.querySelectorAll('.math-inline').forEach(function(el) {
                        const latex = el.getAttribute('data-latex');
                        if (latex) {
                            try {
                                katex.render(latex, el, { 
                                    displayMode: false, 
                                    throwOnError: false,
                                    output: 'html'
                                });
                            } catch (e) {
                                console.error('KaTeX inline error:', e);
                                el.textContent = '$' + latex + '$';
                            }
                        }
                    });
                }

                // Hide loading overlay and enable print button
                overlay.classList.add('hidden');
                printBtn.disabled = false;
                printBtn.textContent = '🖨️ Print / Save as PDF';

            } catch (error) {
                console.error('Rendering error:', error);
                overlay.innerHTML = '<div style="color: #d32f2f; padding: 20px;">Error loading content. Please refresh.</div>';
            }
        })();
    </script>
</body>
</html>
    `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

/**
 * Export specific questions from question bank
 */
export function exportQuestionsFromBank(
  questions: QuestionForExport[],
  courseName: string,
  includeAnswers: boolean,
  includeMetadata: boolean = true,
): void {
  if (questions.length === 0) {
    throw new Error("No questions to export");
  }

  exportQuestionsToPDF(questions, {
    includeAnswers,
    includeMetadata,
    courseName,
    title: includeAnswers
      ? "Question Bank with Answers"
      : "Question Bank - Questions Only",
  });
}

/**
 * Export question paper compliance report as PDF (via print/save flow)
 */
export function exportComplianceReportToPDF(
  data: ComplianceReportPDFData,
): void {
  const printWindow = window.open("", "_blank");
  if (!printWindow) {
    throw new Error("Failed to open print window. Please allow popups.");
  }

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8" />
    <title>${escapeHtmlAttr(data.title)}</title>
    <style>
        @media print {
            @page { margin: 1.5cm; size: A4; }
            .no-print { display: none !important; }
            .question-card { page-break-inside: avoid; }
        }

        body {
            font-family: Arial, sans-serif;
            line-height: 1.5;
            color: #111;
            margin: 0;
            padding: 24px;
            background: #fff;
        }

        .header {
            border-bottom: 2px solid #111;
            padding-bottom: 12px;
            margin-bottom: 18px;
        }

        .header h1 {
            margin: 0;
            font-size: 22px;
        }

        .meta {
            margin-top: 6px;
            font-size: 13px;
            color: #333;
        }

        .summary-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 8px;
            margin: 14px 0 18px;
        }

        .summary-item {
            border: 1px solid #ddd;
            border-radius: 6px;
            padding: 10px;
            background: #fafafa;
            font-size: 13px;
        }

        .label {
            color: #555;
            display: block;
            margin-bottom: 4px;
        }

        .value {
            font-weight: 700;
            font-size: 16px;
        }

        .section-title {
            font-size: 15px;
            font-weight: 700;
            margin: 16px 0 8px;
        }

        ul {
            margin: 0;
            padding-left: 20px;
        }

        li {
            margin-bottom: 4px;
            font-size: 13px;
        }

        .question-card {
            border: 1px solid #ddd;
            border-radius: 8px;
            padding: 10px;
            margin-bottom: 10px;
        }

        .question-head {
            display: flex;
            justify-content: space-between;
            gap: 8px;
            margin-bottom: 6px;
            font-size: 13px;
            font-weight: 700;
        }

        .tag {
            display: inline-block;
            border: 1px solid #bbb;
            border-radius: 999px;
            padding: 2px 8px;
            font-size: 11px;
            margin-right: 4px;
            margin-bottom: 4px;
        }

        .compliant { color: #166534; }
        .non-compliant { color: #991b1b; }

        .print-button {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 16px;
            border: none;
            border-radius: 4px;
            background: #1d4ed8;
            color: white;
            font-weight: 600;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <button class="print-button no-print" onclick="window.print()">Print / Save as PDF</button>

    <div class="header">
        <h1>${escapeHtmlAttr(data.title)}</h1>
        <div class="meta">${escapeHtmlAttr(data.courseName)}</div>
        <div class="meta">Generated: ${escapeHtmlAttr(new Date(data.generatedAt || Date.now()).toLocaleString())}</div>
    </div>

    <div class="summary-grid">
        <div class="summary-item"><span class="label">Compliance Score</span><span class="value">${data.overallComplianceScore}%</span></div>
        <div class="summary-item"><span class="label">Total Issues</span><span class="value">${data.totalIssueCount}</span></div>
        <div class="summary-item"><span class="label">Total Questions</span><span class="value">${data.summary.totalQuestions}</span></div>
        <div class="summary-item"><span class="label">Total Marks</span><span class="value">${data.summary.totalMarks}</span></div>
    </div>

    <div class="section-title">General Recommendations</div>
    <ul>
        ${
          data.generalRecommendations.length > 0
            ? data.generalRecommendations
                .map((item) => `<li>${escapeHtmlAttr(item)}</li>`)
                .join("")
            : "<li>No general recommendations.</li>"
        }
    </ul>

    <div class="section-title">Question-wise Compliance</div>
    ${data.items
      .map(
        (item) => `
        <div class="question-card">
            <div class="question-head">
                <span>Q${escapeHtmlAttr(item.questionNumber)}</span>
                <span class="${item.isCompliant ? "compliant" : "non-compliant"}">${item.isCompliant ? "Compliant" : "Needs Improvement"}</span>
            </div>
            <div style="font-size:13px; margin-bottom:6px;">${escapeHtmlAttr(item.questionText)}</div>
            <div>
                <span class="tag">Marks: ${item.current.marks}</span>
                <span class="tag">Part: ${item.current.part || "N/A"}</span>
                <span class="tag">Bloom: ${escapeHtmlAttr(item.current.bloomLevel || "N/A")}</span>
                <span class="tag">CO: ${escapeHtmlAttr(item.current.courseOutcome || "N/A")}</span>
            </div>
            ${
              item.issues.length > 0
                ? `
                <div class="section-title" style="font-size:13px; margin-top:8px;">Issues</div>
                <ul>${item.issues.map((issue) => `<li>${escapeHtmlAttr(issue)}</li>`).join("")}</ul>
            `
                : ""
            }
            ${
              item.suggestions.length > 0
                ? `
                <div class="section-title" style="font-size:13px; margin-top:8px;">Suggested Improvements</div>
                <ul>${item.suggestions.map((suggestion) => `<li>${escapeHtmlAttr(suggestion)}</li>`).join("")}</ul>
            `
                : ""
            }
        </div>
    `,
      )
      .join("")}
</body>
</html>
    `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}
