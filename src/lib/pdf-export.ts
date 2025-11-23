/**
 * PDF Export Utilities for Question Bank
 * Generates professional PDFs for questions with/without answers
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

/**
 * Export questions as PDF using browser print dialog
 * This avoids external dependencies and uses native browser capabilities
 */
export function exportQuestionsToPDF(
  questions: QuestionForExport[],
  options: ExportOptions
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
                display: none;
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
            white-space: pre-wrap;
        }

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
        }

        .print-button:hover {
            background: #1976d2;
        }

        @media screen {
            body {
                background: #f5f5f5;
                padding: 40px 20px;
            }
        }
    </style>
</head>
<body>
    <button class="print-button no-print" onclick="window.print()">
        🖨️ Print / Save as PDF
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
        ${
          includeMetadata
            ? "<p><strong>Note:</strong> This document contains generated questions for educational purposes.</p>"
            : ""
        }
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
                    <span class="badge badge-difficulty">${
                      q.difficultyLevel
                    }</span>
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
                ${q.question}
            </div>

            ${
              includeAnswers
                ? `
                <div class="answer-section">
                    <div class="answer-label">Answer:</div>
                    <div class="answer-text">${q.answer}</div>
                </div>
            `
                : ""
            }
        </div>
    `
      )
      .join("\n")}

    <div class="footer">
        <p>Generated by BloomIQ Question Generation System</p>
        <p>${courseName} | ${new Date().getFullYear()}</p>
    </div>

    <script>
        // Auto-print dialog after a brief delay
        setTimeout(() => {
            // Optionally auto-trigger print
            // window.print();
        }, 500);
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
  includeMetadata: boolean = true
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
