"use client";

import { Fragment, use, useEffect, useRef, useState } from "react";
import { trpc } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Loader2,
    Download,
    CheckCircle,
    ArrowLeft,
    FileText,
    Key,
    Pencil,
    Sparkles,
    Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { openProfessionalPrintWindow } from "@/lib/print-utils";

interface PaperViewProps {
    params: Promise<{
        paperId: string;
    }>;
}

type EditableBloomLevel =
    | "REMEMBER"
    | "UNDERSTAND"
    | "APPLY"
    | "ANALYZE"
    | "EVALUATE"
    | "CREATE";

export default function PaperViewPage({ params }: PaperViewProps) {
    const { paperId } = use(params);
    const router = useRouter();
    const utils = trpc.useUtils();
    const paperPrintRef = useRef<HTMLDivElement>(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editSection, setEditSection] = useState<"partA" | "partB">("partA");
    const [editQuestionNumber, setEditQuestionNumber] = useState<number>(0);
    const [editedQuestionText, setEditedQuestionText] = useState("");
    const [editedMarks, setEditedMarks] = useState<number>(2);
    const [editedBloomLevel, setEditedBloomLevel] = useState<EditableBloomLevel>("APPLY");
    const [editedMappingCO, setEditedMappingCO] = useState("-");
    const [isRegeneratingQuestion, setIsRegeneratingQuestion] = useState(false);
    const [examDate, setExamDate] = useState("");
    const [examTime, setExamTime] = useState("");

    // Get paper details
    const { data: paper, isLoading } = trpc.paper.getPaperById.useQuery({
        paperId,
    });
    const { data: committeeContext } = trpc.paper.getCommitteeContext.useQuery();
    const currentRole = committeeContext?.role;

    const getApprovals = () => {
        try {
            const parsed = paper?.paperContent ? JSON.parse(paper.paperContent) : {};
            return {
                deanApproved: Boolean(parsed?.approvals?.deanApproved),
                coeApproved: Boolean(parsed?.approvals?.coeApproved),
            };
        } catch {
            return { deanApproved: false, coeApproved: false };
        }
    };

    // Finalize mutation
    const finalizeMutation = trpc.paper.finalizePaper.useMutation({
        onSuccess: () => {
            toast.success("Paper finalized successfully");
            utils.paper.getPaperById.invalidate({ paperId });
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message || "Failed to finalize paper");
        },
    });

    const approveByDeanMutation = trpc.paper.approvePaperByDean.useMutation({
        onSuccess: () => {
            toast.success("Paper approved by Dean");
            utils.paper.getPaperById.invalidate({ paperId });
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message || "Failed to approve paper");
        },
    });

    const handleFinalize = () => {
        finalizeMutation.mutate({ paperId });
    };

    const handleDeanApprove = () => {
        approveByDeanMutation.mutate({ paperId });
    };

    const handlePrint = () => {
        if (!paperContent) {
            toast.error("Question paper content is not available for printing.");
            return;
        }

        const printableHtml = buildQuestionsOnlyHtml();

        const result = openProfessionalPrintWindow({
            title: `${paper.paperCode} - Question Paper`,
            html: printableHtml,
            renderRichContent: true,
        });

        if (!result.ok) {
            toast.error(result.error);
        }
    };

    const escapeHtml = (value: string) =>
        value
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#39;");

    const escapeHtmlAttr = (value: string) =>
        value
            .replace(/&/g, "&amp;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#39;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

    const renderRichPrintHtml = (value: unknown) => {
        const raw = String(value ?? "-");
        if (!raw.trim()) return "-";

        const mermaidBlocks: string[] = [];
        const latexTokens: Array<{ type: "inline" | "display"; value: string }> = [];

        let processed = raw.replace(/```mermaid\s*([\s\S]*?)```/gi, (_match, code: string) => {
            const idx = mermaidBlocks.length;
            mermaidBlocks.push(code.trim());
            return `@@MERMAID_${idx}@@`;
        });

        processed = processed.replace(/\$\$([\s\S]*?)\$\$/g, (_match, latex: string) => {
            const idx = latexTokens.length;
            latexTokens.push({ type: "display", value: latex.trim() });
            return `@@LATEX_${idx}@@`;
        });

        processed = processed.replace(/(?<!\$)\$([^\$\n]+?)\$(?!\$)/g, (_match, latex: string) => {
            const idx = latexTokens.length;
            latexTokens.push({ type: "inline", value: latex.trim() });
            return `@@LATEX_${idx}@@`;
        });

        processed = escapeHtml(processed).replace(/\n/g, "<br />");

        latexTokens.forEach((token, idx) => {
            const fallback = token.type === "display"
                ? `$$${token.value}$$`
                : `$${token.value}$`;

            const html = token.type === "display"
                ? `<div class="print-math-display" data-latex="${escapeHtmlAttr(token.value)}">${escapeHtml(fallback)}</div>`
                : `<span class="print-math-inline" data-latex="${escapeHtmlAttr(token.value)}">${escapeHtml(fallback)}</span>`;

            processed = processed.replace(`@@LATEX_${idx}@@`, html);
        });

        mermaidBlocks.forEach((code, idx) => {
            const html = `<div class="print-mermaid-container"><pre class="print-mermaid">${escapeHtml(code)}</pre></div>`;
            processed = processed.replace(`@@MERMAID_${idx}@@`, html);
        });

        return processed;
    };

    const buildQuestionsOnlyHtml = () => {
        if (!paperContent) return "";

        const partAQuestions = paperContent?.partA?.questions || [];
        const partBQuestions = paperContent?.partB?.questions || [];

        const partARows = partAQuestions
            .map(
                (q: { number?: number; question?: string; marks?: string | number; bloomLevel?: string; mappingCO?: string }) => `
                <tr>
                    <td class="border border-black px-2 py-1 col-qno">${escapeHtml(String(q.number || "-"))}</td>
                    <td class="border border-black px-2 py-1 col-question">${renderRichPrintHtml(q.question)}</td>
                    <td class="border border-black px-2 py-1 col-bloom">${escapeHtml(String(q.bloomLevel || "-"))}</td>
                    <td class="border border-black px-2 py-1 col-co">${escapeHtml(String(q.mappingCO || "-"))}</td>
                    <td class="border border-black px-2 py-1 col-marks">${escapeHtml(String(q.marks || "-"))}</td>
                </tr>`,
            )
            .join("");

        const partBRows = partBQuestions
            .map(
                (q: { displayNumber?: string; number?: number; question?: string; marks?: string | number; bloomLevel?: string; mappingCO?: string }) => `
                <tr>
                    <td class="border border-black px-2 py-1 col-qno">${escapeHtml(String(q.displayNumber || q.number || "-"))}</td>
                    <td class="border border-black px-2 py-1 col-question">${renderRichPrintHtml(q.question)}</td>
                    <td class="border border-black px-2 py-1 col-bloom">${escapeHtml(String(q.bloomLevel || "-"))}</td>
                    <td class="border border-black px-2 py-1 col-co">${escapeHtml(String(q.mappingCO || "-"))}</td>
                    <td class="border border-black px-2 py-1 col-marks">${escapeHtml(String(q.marks || "-"))}</td>
                </tr>`,
            )
            .join("");

        return `
            <div class="space-y-6 max-w-5xl mx-auto text-sm">
                <div class="text-center space-y-1">
                    <h2 class="text-xl font-bold uppercase tracking-wide">${escapeHtml(String(paperContent?.header?.institution || "Question Paper"))}</h2>
                    <p class="font-semibold">${escapeHtml(paper.paperCode)} - Questions Only</p>
                    <p class="font-medium">${escapeHtml(`${paper.pattern.course.course_code} - ${paper.pattern.course.name}`)}</p>
                </div>

                <div class="space-y-2">
                    <h3 class="font-bold text-base">PART - A</h3>
                    <table class="w-full border border-black border-collapse print-paper-table">
                        <colgroup>
                            <col style="width: 11%" />
                            <col style="width: 59%" />
                            <col style="width: 14%" />
                            <col style="width: 8%" />
                            <col style="width: 8%" />
                        </colgroup>
                        <thead>
                            <tr>
                                <th class="border border-black px-2 py-1 text-left">Question No</th>
                                <th class="border border-black px-2 py-1 text-left">Question</th>
                                <th class="border border-black px-2 py-1 text-left">Bloom</th>
                                <th class="border border-black px-2 py-1 text-left">CO</th>
                                <th class="border border-black px-2 py-1 text-left">Marks</th>
                            </tr>
                        </thead>
                        <tbody>${partARows}</tbody>
                    </table>
                </div>

                <div class="space-y-2">
                    <h3 class="font-bold text-base">PART - B</h3>
                    <table class="w-full border border-black border-collapse print-paper-table">
                        <colgroup>
                            <col style="width: 11%" />
                            <col style="width: 59%" />
                            <col style="width: 14%" />
                            <col style="width: 8%" />
                            <col style="width: 8%" />
                        </colgroup>
                        <thead>
                            <tr>
                                <th class="border border-black px-2 py-1 text-left">Question No</th>
                                <th class="border border-black px-2 py-1 text-left">Question</th>
                                <th class="border border-black px-2 py-1 text-left">Bloom</th>
                                <th class="border border-black px-2 py-1 text-left">CO</th>
                                <th class="border border-black px-2 py-1 text-left">Marks</th>
                            </tr>
                        </thead>
                        <tbody>${partBRows}</tbody>
                    </table>
                </div>
            </div>
        `;
    };

    const buildAnswersOnlyHtml = () => {
        if (!answerKeyContent) return "";

        const partARows = (answerKeyContent.partA || [])
            .map(
                (item: { number?: number; question?: string; answer?: string; marks?: string | number }) => `
                <tr>
                    <td class="border border-black px-2 py-1 col-qno">${escapeHtml(String(item.number || "-"))}</td>
                    <td class="border border-black px-2 py-1 col-question">${renderRichPrintHtml(item.question)}</td>
                    <td class="border border-black px-2 py-1 col-answer">${renderRichPrintHtml(item.answer)}</td>
                    <td class="border border-black px-2 py-1 col-marks">${escapeHtml(String(item.marks || "-"))}</td>
                </tr>`,
            )
            .join("");

        const partBRows = (answerKeyContent.partB || [])
            .map(
                (item: { number?: number; question?: string; answer?: string; marks?: string | number }) => `
                <tr>
                    <td class="border border-black px-2 py-1 col-qno">${escapeHtml(String(item.number || "-"))}</td>
                    <td class="border border-black px-2 py-1 col-question">${renderRichPrintHtml(item.question)}</td>
                    <td class="border border-black px-2 py-1 col-answer">${renderRichPrintHtml(item.answer)}</td>
                    <td class="border border-black px-2 py-1 col-marks">${escapeHtml(String(item.marks || "-"))}</td>
                </tr>`,
            )
            .join("");

        return `
            <div class="space-y-6 max-w-5xl mx-auto text-sm">
                <div class="text-center space-y-1">
                    <h2 class="text-xl font-bold uppercase tracking-wide">ANSWER KEY</h2>
                    <p class="font-semibold">${escapeHtml(paper.paperCode)}</p>
                    <p class="font-medium">${escapeHtml(`${paper.pattern.course.course_code} - ${paper.pattern.course.name}`)}</p>
                </div>

                <div class="space-y-2">
                    <h3 class="font-bold text-base">PART - A</h3>
                    <table class="w-full border border-black border-collapse print-answer-table">
                        <colgroup>
                            <col style="width: 9%" />
                            <col style="width: 36%" />
                            <col style="width: 45%" />
                            <col style="width: 10%" />
                        </colgroup>
                        <thead>
                            <tr>
                                <th class="border border-black px-2 py-1 text-left">Question No</th>
                                <th class="border border-black px-2 py-1 text-left">Question</th>
                                <th class="border border-black px-2 py-1 text-left">Answer</th>
                                <th class="border border-black px-2 py-1 text-left">Marks</th>
                            </tr>
                        </thead>
                        <tbody>${partARows}</tbody>
                    </table>
                </div>

                <div class="space-y-2">
                    <h3 class="font-bold text-base">PART - B</h3>
                    <table class="w-full border border-black border-collapse print-answer-table">
                        <colgroup>
                            <col style="width: 9%" />
                            <col style="width: 36%" />
                            <col style="width: 45%" />
                            <col style="width: 10%" />
                        </colgroup>
                        <thead>
                            <tr>
                                <th class="border border-black px-2 py-1 text-left">Question No</th>
                                <th class="border border-black px-2 py-1 text-left">Question</th>
                                <th class="border border-black px-2 py-1 text-left">Answer</th>
                                <th class="border border-black px-2 py-1 text-left">Marks</th>
                            </tr>
                        </thead>
                        <tbody>${partBRows}</tbody>
                    </table>
                </div>
            </div>
        `;
    };

    const buildQuestionsWithAnswersHtml = () => {
        if (!paperContent || !answerKeyContent) return "";

        const partAQuestions = paperContent?.partA?.questions || [];
        const partAAnswers = answerKeyContent?.partA || [];
        const partARows = partAQuestions
            .map(
                (
                    q: { number?: number; question?: string; marks?: string | number; bloomLevel?: string; mappingCO?: string },
                    idx: number,
                ) => `
                <tr>
                    <td class="border border-black px-2 py-1 col-qno">${escapeHtml(String(q.number || "-"))}</td>
                    <td class="border border-black px-2 py-1 col-question">${renderRichPrintHtml(q.question)}</td>
                    <td class="border border-black px-2 py-1 col-answer">${renderRichPrintHtml(partAAnswers[idx]?.answer)}</td>
                    <td class="border border-black px-2 py-1 col-bloom">${escapeHtml(String(q.bloomLevel || "-"))}</td>
                    <td class="border border-black px-2 py-1 col-co">${escapeHtml(String(q.mappingCO || "-"))}</td>
                    <td class="border border-black px-2 py-1 col-marks">${escapeHtml(String(q.marks || "-"))}</td>
                </tr>`,
            )
            .join("");

        const partBQuestions = paperContent?.partB?.questions || [];
        const partBAnswers = answerKeyContent?.partB || [];
        const partBRows = partBQuestions
            .map(
                (
                    q: {
                        number?: number;
                        displayNumber?: string;
                        question?: string;
                        marks?: string | number;
                        bloomLevel?: string;
                        mappingCO?: string;
                    },
                    idx: number,
                ) => `
                <tr>
                    <td class="border border-black px-2 py-1 col-qno">${escapeHtml(String(q.displayNumber || q.number || "-"))}</td>
                    <td class="border border-black px-2 py-1 col-question">${renderRichPrintHtml(q.question)}</td>
                    <td class="border border-black px-2 py-1 col-answer">${renderRichPrintHtml(partBAnswers[idx]?.answer)}</td>
                    <td class="border border-black px-2 py-1 col-bloom">${escapeHtml(String(q.bloomLevel || "-"))}</td>
                    <td class="border border-black px-2 py-1 col-co">${escapeHtml(String(q.mappingCO || "-"))}</td>
                    <td class="border border-black px-2 py-1 col-marks">${escapeHtml(String(q.marks || "-"))}</td>
                </tr>`,
            )
            .join("");

        return `
            <div class="space-y-6 max-w-5xl mx-auto text-sm">
                <div class="text-center space-y-1">
                    <h2 class="text-xl font-bold uppercase tracking-wide">${escapeHtml(String(paperContent?.header?.institution || "Question Paper"))}</h2>
                    <p class="font-semibold">${escapeHtml(paper.paperCode)} - Questions with Answers</p>
                    <p class="font-medium">${escapeHtml(`${paper.pattern.course.course_code} - ${paper.pattern.course.name}`)}</p>
                </div>

                <div class="space-y-2">
                    <h3 class="font-bold text-base">PART - A</h3>
                    <table class="w-full border border-black border-collapse print-qna-table">
                        <colgroup>
                            <col style="width: 8%" />
                            <col style="width: 36%" />
                            <col style="width: 34%" />
                            <col style="width: 10%" />
                            <col style="width: 6%" />
                            <col style="width: 6%" />
                        </colgroup>
                        <thead>
                            <tr>
                                <th class="border border-black px-2 py-1 text-left">Question No</th>
                                <th class="border border-black px-2 py-1 text-left">Question</th>
                                <th class="border border-black px-2 py-1 text-left">Answer Key</th>
                                <th class="border border-black px-2 py-1 text-left">Bloom</th>
                                <th class="border border-black px-2 py-1 text-left">CO</th>
                                <th class="border border-black px-2 py-1 text-left">Marks</th>
                            </tr>
                        </thead>
                        <tbody>${partARows}</tbody>
                    </table>
                </div>

                <div class="space-y-2">
                    <h3 class="font-bold text-base">PART - B</h3>
                    <table class="w-full border border-black border-collapse print-qna-table">
                        <colgroup>
                            <col style="width: 8%" />
                            <col style="width: 36%" />
                            <col style="width: 34%" />
                            <col style="width: 10%" />
                            <col style="width: 6%" />
                            <col style="width: 6%" />
                        </colgroup>
                        <thead>
                            <tr>
                                <th class="border border-black px-2 py-1 text-left">Question No</th>
                                <th class="border border-black px-2 py-1 text-left">Question</th>
                                <th class="border border-black px-2 py-1 text-left">Answer Key</th>
                                <th class="border border-black px-2 py-1 text-left">Bloom</th>
                                <th class="border border-black px-2 py-1 text-left">CO</th>
                                <th class="border border-black px-2 py-1 text-left">Marks</th>
                            </tr>
                        </thead>
                        <tbody>${partBRows}</tbody>
                    </table>
                </div>
            </div>
        `;
    };

    const handleDownloadAnswersOnly = () => {
        if (!answerKeyContent) {
            toast.error("Answer key content is not available for download.");
            return;
        }

        const html = buildAnswersOnlyHtml();
        const result = openProfessionalPrintWindow({
            title: `${paper.paperCode} - Answer Key`,
            html,
            renderRichContent: true,
        });

        if (!result.ok) {
            toast.error(result.error);
        }
    };

    const handleDownloadQuestionsWithAnswers = () => {
        if (!paperContent || !answerKeyContent) {
            toast.error("Question paper or answer key content is not available for download.");
            return;
        }

        const html = buildQuestionsWithAnswersHtml();
        const result = openProfessionalPrintWindow({
            title: `${paper.paperCode} - Questions and Answers`,
            html,
            renderRichContent: true,
        });

        if (!result.ok) {
            toast.error(result.error);
        }
    };

    const updatePaperQuestionMutation = trpc.paper.updatePaperQuestion.useMutation({
        onSuccess: () => {
            toast.success("Paper question updated");
            setEditDialogOpen(false);
            utils.paper.getPaperById.invalidate({ paperId });
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message || "Failed to update paper question");
        },
    });

    const regeneratePaperQuestionMutation = trpc.paper.regeneratePaperQuestionForQuestion.useMutation({
        onSuccess: (data: { question: string }) => {
            setEditedQuestionText(data.question);
            toast.success("Question regenerated and answer key refreshed");
            utils.paper.getPaperById.invalidate({ paperId });
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message || "Failed to regenerate question");
        },
        onSettled: () => {
            setIsRegeneratingQuestion(false);
        },
    });

    const regeneratePaperAnswerMutation = trpc.paper.regeneratePaperAnswerForQuestion.useMutation({
        onSuccess: () => {
            toast.success("Answer regenerated successfully");
            utils.paper.getPaperById.invalidate({ paperId });
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message || "Failed to regenerate answer");
        },
    });

    const updatePaperDateTimeMutation = trpc.paper.updatePaperDateTime.useMutation({
        onSuccess: () => {
            toast.success("Paper date and time updated");
            utils.paper.getPaperById.invalidate({ paperId });
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message || "Failed to update date/time");
        },
    });

    const deletePaperQuestionMutation = trpc.paper.deletePaperQuestion.useMutation({
        onSuccess: () => {
            toast.success("Question removed from generated paper");
            utils.paper.getPaperById.invalidate({ paperId });
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message || "Failed to delete question");
        },
    });

    const openEditDialog = (
        section: "partA" | "partB",
        questionNumber: number,
        questionText: string,
        marks: number,
        bloomLevel: EditableBloomLevel,
        mappingCO: string,
    ) => {
        setEditSection(section);
        setEditQuestionNumber(questionNumber);
        setEditedQuestionText(questionText);
        setEditedMarks(marks);
        setEditedBloomLevel(bloomLevel);
        setEditedMappingCO(mappingCO || "-");
        setEditDialogOpen(true);
    };

    const handleSaveEditedQuestion = () => {
        if (!editedQuestionText.trim()) {
            toast.error("Question text is required");
            return;
        }

        updatePaperQuestionMutation.mutate({
            paperId,
            section: editSection,
            questionNumber: editQuestionNumber,
            question: editedQuestionText.trim(),
            marks: editedMarks,
            bloomLevel: editedBloomLevel,
            mappingCO: editedMappingCO.trim(),
        });
    };

    const handleRegenerateQuestion = () => {
        setIsRegeneratingQuestion(true);
        regeneratePaperQuestionMutation.mutate({
            paperId,
            section: editSection,
            questionNumber: editQuestionNumber,
            marks: editedMarks,
            bloomLevel: editedBloomLevel,
            mappingCO: editedMappingCO.trim(),
        });
    };

    const handleRegenerateAnswer = () => {
        regeneratePaperAnswerMutation.mutate({
            paperId,
            section: editSection,
            questionNumber: editQuestionNumber,
            questionText: editedQuestionText.trim(),
            marks: editedMarks,
        });
    };

    const handleDeleteQuestion = (
        section: "partA" | "partB",
        questionNumber: number,
        label: string,
    ) => {
        const confirmed = window.confirm(
            `Delete question ${label} from this generated paper? This cannot be undone.`,
        );
        if (!confirmed) return;

        deletePaperQuestionMutation.mutate({
            paperId,
            section,
            questionNumber,
        });
    };

    useEffect(() => {
        if (!paper?.paperContent) return;

        try {
            const parsed = JSON.parse(paper.paperContent);
            const header = parsed?.header;
            if (header?.examDate) {
                setExamDate(String(header.examDate));
            }
            if (header?.examTime) {
                const normalized = String(header.examTime).slice(0, 5);
                setExamTime(normalized);
            }
        } catch {
            // Keep defaults if paper content parsing fails.
        }
    }, [paper?.paperContent]);

    const handleSaveDateTime = () => {
        if (!examDate.trim() || !examTime.trim()) {
            toast.error("Both exam date and exam time are required");
            return;
        }

        updatePaperDateTimeMutation.mutate({
            paperId,
            examDate: examDate.trim(),
            examTime: examTime.trim(),
        });
    };

    if (isLoading) {
        return (
            <div className="container mx-auto py-6 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!paper) {
        return (
            <div className="container mx-auto py-6">
                <Card>
                    <CardContent className="py-12 text-center">
                        <p className="text-muted-foreground">Paper not found</p>
                        <Button
                            className="mt-4"
                            onClick={() => router.push("/coe/dashboard/view-papers")}
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Papers
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Parse paper content and answer key
    let paperContent;
    let answerKeyContent;
    try {
        if (paper.paperContent) {
            paperContent = JSON.parse(paper.paperContent);
        }
        if (paper.answerKeyContent) {
            answerKeyContent = JSON.parse(paper.answerKeyContent);
        }
    } catch (e) {
        console.error("Failed to parse paper content", e);
    }

    const renderBloomLabel = (value?: string) => {
        if (!value) return "-";
        return value.charAt(0) + value.slice(1).toLowerCase();
    };

    const examTypeLabel = (() => {
        const val = paperContent?.header?.examType || paper?.pattern?.examType || "";
        if (val === "SESSIONAL_1") return "SESSIONAL EXAMINATION-I";
        if (val === "SESSIONAL_2") return "SESSIONAL EXAMINATION-II";
        if (val === "END_SEMESTER") return "END SEMESTER EXAMINATION";
        return String(val).replace(/_/g, " ");
    })();
    const approvals = getApprovals();

    return (
        <div className="container mx-auto py-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start print:hidden">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.push("/coe/dashboard/view-papers")}
                        >
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back
                        </Button>
                        {paper.isFinalized && (
                            <Badge variant="success">
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Finalized
                            </Badge>
                        )}
                        {!paper.isFinalized && approvals.deanApproved && (
                            <Badge variant="warning">Dean Approved</Badge>
                        )}
                    </div>
                    <h1 className="text-3xl font-bold">{paper.paperCode}</h1>
                    <p className="text-muted-foreground">
                        {paper.pattern.course.course_code} - {paper.pattern.course.name}
                    </p>
                </div>
                <div className="flex gap-2">
                    {!paper.isFinalized && currentRole === "DEAN" && !approvals.deanApproved && (
                        <Button
                            onClick={handleDeanApprove}
                            disabled={approveByDeanMutation.isPending}
                            variant="outline"
                        >
                            {approveByDeanMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Approving...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Dean Approve
                                </>
                            )}
                        </Button>
                    )}
                    {!paper.isFinalized && currentRole === "CONTROLLER_OF_EXAMINATION" && approvals.deanApproved && (
                        <Button
                            onClick={handleFinalize}
                            disabled={finalizeMutation.isPending}
                        >
                            {finalizeMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Finalizing...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    COE Final Approve
                                </>
                            )}
                        </Button>
                    )}
                    <Button variant="outline" onClick={handlePrint}>
                        <FileText className="mr-2 h-4 w-4" />
                        Questions Only
                    </Button>
                    <Button variant="outline" onClick={handleDownloadQuestionsWithAnswers}>
                        <Download className="mr-2 h-4 w-4" />
                        Questions + Answers
                    </Button>
                    <Button variant="outline" onClick={handleDownloadAnswersOnly}>
                        <Key className="mr-2 h-4 w-4" />
                        Answers Only
                    </Button>
                </div>
            </div>

            {/* Paper Info */}
            <Card className="print:hidden">
                <CardHeader>
                    <CardTitle>Paper Information</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                            <p className="text-sm text-muted-foreground">Pattern</p>
                            <p className="font-medium">{paper.pattern.patternName}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Academic Year</p>
                            <p className="font-medium">{paper.pattern.academicYear}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Semester</p>
                            <p className="font-medium">{paper.pattern.semesterType}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Set Variant</p>
                            <p className="font-medium">{paper.setVariant}</p>
                        </div>
                    </div>

                    <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div className="space-y-2">
                            <Label htmlFor="exam-date">Exam Date</Label>
                            <Input
                                id="exam-date"
                                type="date"
                                value={examDate}
                                onChange={(e) => setExamDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="exam-time">Exam Time</Label>
                            <Input
                                id="exam-time"
                                type="time"
                                value={examTime}
                                onChange={(e) => setExamTime(e.target.value)}
                            />
                        </div>
                        <div>
                            <Button
                                onClick={handleSaveDateTime}
                                disabled={updatePaperDateTimeMutation.isPending}
                            >
                                {updatePaperDateTimeMutation.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    "Save Date & Time"
                                )}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tabs for Question Paper and Answer Key */}
            <Tabs defaultValue="paper" className="w-full">
                <TabsList className="print:hidden">
                    <TabsTrigger value="paper">
                        <FileText className="mr-2 h-4 w-4" />
                        Question Paper
                    </TabsTrigger>
                    <TabsTrigger value="answerkey">
                        <Key className="mr-2 h-4 w-4" />
                        Answer Key
                    </TabsTrigger>
                </TabsList>

                {/* Question Paper Tab */}
                <TabsContent value="paper">
                    <Card>
                        <CardContent className="p-8 print:p-0">
                            {paperContent && (
                                <div ref={paperPrintRef} className="space-y-6 max-w-5xl mx-auto text-sm">
                                    <div className="text-center space-y-1">
                                        <h2 className="text-xl font-bold uppercase tracking-wide">
                                            {paperContent.header?.institution}
                                        </h2>
                                        <p className="font-semibold uppercase">
                                            {paperContent.header?.department || "Department of Computer Science and Engineering"}
                                        </p>
                                        <p className="font-semibold">{examTypeLabel}</p>
                                    </div>

                                    <table className="w-full border border-black border-collapse">
                                        <tbody>
                                            <tr>
                                                <td className="border border-black px-2 py-1 font-medium">Course Code</td>
                                                <td className="border border-black px-2 py-1">{paperContent.header?.courseCode || paper.pattern.course.course_code}</td>
                                                <td className="border border-black px-2 py-1 font-medium">Duration</td>
                                                <td className="border border-black px-2 py-1">{paperContent.header?.duration || paper.pattern.duration} Minutes</td>
                                            </tr>
                                            <tr>
                                                <td className="border border-black px-2 py-1 font-medium">Course Name</td>
                                                <td className="border border-black px-2 py-1">{paperContent.header?.courseName || paper.pattern.course.name}</td>
                                                <td className="border border-black px-2 py-1 font-medium">Max. Marks</td>
                                                <td className="border border-black px-2 py-1">{paperContent.header?.totalMarks || paper.pattern.totalMarks}</td>
                                            </tr>
                                            <tr>
                                                <td className="border border-black px-2 py-1 font-medium">Degree / Year / Sem</td>
                                                <td className="border border-black px-2 py-1">
                                                    {paperContent.header?.degreeYearSem || `B.Tech. / I / ${paperContent.header?.semester || paper.pattern.semesterType}`}
                                                </td>
                                                <td className="border border-black px-2 py-1 font-medium">Date & Session</td>
                                                <td className="border border-black px-2 py-1">
                                                    {paperContent.header?.dateSession || `${paperContent.header?.examDate || new Date().toISOString().slice(0, 10)} / ${paperContent.header?.examTime || "09:00"}`}
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>

                                    {paperContent.partA && (
                                        <div className="space-y-2">
                                            <h3 className="font-bold text-base">PART - A ({paperContent.partA.questions.length} × 2 = {paperContent.partA.questions.length * 2} Marks)</h3>
                                            <table className="w-full border border-black border-collapse">
                                                <colgroup>
                                                    <col style={{ width: "8%" }} />
                                                    <col style={{ width: "64%" }} />
                                                    <col style={{ width: "14%" }} />
                                                    <col style={{ width: "8%" }} />
                                                    <col style={{ width: "6%" }} />
                                                </colgroup>
                                                <thead>
                                                    <tr className="bg-muted/40">
                                                        <th className="border border-black px-2 py-1 text-left">Question No</th>
                                                        <th className="border border-black px-2 py-1 text-left">Question Text</th>
                                                        <th className="border border-black px-2 py-1 text-left">Pattern</th>
                                                        <th className="border border-black px-2 py-1 text-left">Mapping COs</th>
                                                        <th className="border border-black px-2 py-1 text-left">Marks</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {paperContent.partA.questions.map((q: { number: number; question: string; bloomLevel?: string; mappingCO?: string; marks: number; }, idx: number) => (
                                                        <tr key={`parta-${q.number}-${idx}`}>
                                                            <td className="border border-black px-2 py-1">{q.number}</td>
                                                            <td className="border border-black px-2 py-1 whitespace-pre-wrap">
                                                                <div className="space-y-2">
                                                                    <div>{q.question}</div>
                                                                    <div className="print:hidden flex gap-2">
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            onClick={() =>
                                                                                openEditDialog(
                                                                                    "partA",
                                                                                    q.number,
                                                                                    q.question,
                                                                                    Number(q.marks || 2),
                                                                                    ((q.bloomLevel || "APPLY").toUpperCase() as EditableBloomLevel),
                                                                                    q.mappingCO || "-",
                                                                                )
                                                                            }
                                                                        >
                                                                            <Pencil className="mr-1 h-3 w-3" />
                                                                            Edit
                                                                        </Button>
                                                                        {!paper.isFinalized && (
                                                                            <Button
                                                                                size="sm"
                                                                                variant="destructive"
                                                                                onClick={() => handleDeleteQuestion("partA", q.number, String(q.number))}
                                                                                disabled={deletePaperQuestionMutation.isPending}
                                                                            >
                                                                                <Trash2 className="mr-1 h-3 w-3" />
                                                                                Delete
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="border border-black px-2 py-1">{renderBloomLabel(q.bloomLevel)}</td>
                                                            <td className="border border-black px-2 py-1">{q.mappingCO || "-"}</td>
                                                            <td className="border border-black px-2 py-1">{q.marks}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {paperContent.partB && (
                                        <div className="space-y-2">
                                            <h3 className="font-bold text-base">PART - B</h3>
                                            <table className="w-full border border-black border-collapse">
                                                <colgroup>
                                                    <col style={{ width: "8%" }} />
                                                    <col style={{ width: "64%" }} />
                                                    <col style={{ width: "14%" }} />
                                                    <col style={{ width: "8%" }} />
                                                    <col style={{ width: "6%" }} />
                                                </colgroup>
                                                <thead>
                                                    <tr className="bg-muted/40">
                                                        <th className="border border-black px-2 py-1 text-left">Question No</th>
                                                        <th className="border border-black px-2 py-1 text-left">Question Text</th>
                                                        <th className="border border-black px-2 py-1 text-left">Pattern</th>
                                                        <th className="border border-black px-2 py-1 text-left">Mapping COs</th>
                                                        <th className="border border-black px-2 py-1 text-left">Marks</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {paperContent.partB.questions.map((q: {
                                                        number: number;
                                                        displayNumber?: string;
                                                        groupNumber?: number;
                                                        optionLabel?: string;
                                                        hasOR?: boolean;
                                                        question: string;
                                                        bloomLevel?: string;
                                                        mappingCO?: string;
                                                        marks: number;
                                                    }, idx: number) => {
                                                        const previous = idx > 0
                                                            ? paperContent.partB.questions[idx - 1] as { groupNumber?: number; hasOR?: boolean }
                                                            : null;
                                                        const showOrBefore = Boolean(
                                                            q.hasOR &&
                                                            q.optionLabel === "B" &&
                                                            previous &&
                                                            previous.hasOR &&
                                                            previous.groupNumber === q.groupNumber
                                                        );

                                                        return (
                                                            <Fragment key={`partb-row-${q.number}-${idx}`}>
                                                                {showOrBefore && (
                                                                    <tr key={`partb-or-${q.number}-${idx}`}>
                                                                        <td colSpan={5} className="border border-black px-2 py-1 text-center font-semibold">
                                                                            OR
                                                                        </td>
                                                                    </tr>
                                                                )}
                                                                <tr key={`partb-${q.number}-${idx}`}>
                                                                    <td className="border border-black px-2 py-1">{q.displayNumber || q.number}</td>
                                                                    <td className="border border-black px-2 py-1 whitespace-pre-wrap">
                                                                        <div className="space-y-2">
                                                                            <div>{q.question}</div>
                                                                            <div className="print:hidden flex gap-2">
                                                                                <Button
                                                                                    size="sm"
                                                                                    variant="outline"
                                                                                    onClick={() =>
                                                                                        openEditDialog(
                                                                                            "partB",
                                                                                            q.number,
                                                                                            q.question,
                                                                                            Number(q.marks || 16),
                                                                                            ((q.bloomLevel || "APPLY").toUpperCase() as EditableBloomLevel),
                                                                                            q.mappingCO || "-",
                                                                                        )
                                                                                    }
                                                                                >
                                                                                    <Pencil className="mr-1 h-3 w-3" />
                                                                                    Edit
                                                                                </Button>
                                                                                {!paper.isFinalized && (
                                                                                    <Button
                                                                                        size="sm"
                                                                                        variant="destructive"
                                                                                        onClick={() => handleDeleteQuestion("partB", q.number, String(q.displayNumber || q.number))}
                                                                                        disabled={deletePaperQuestionMutation.isPending}
                                                                                    >
                                                                                        <Trash2 className="mr-1 h-3 w-3" />
                                                                                        Delete
                                                                                    </Button>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </td>
                                                                    <td className="border border-black px-2 py-1">{renderBloomLabel(q.bloomLevel)}</td>
                                                                    <td className="border border-black px-2 py-1">{q.mappingCO || "-"}</td>
                                                                    <td className="border border-black px-2 py-1">{q.marks}</td>
                                                                </tr>
                                                            </Fragment>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {paperContent.assessmentPattern && (
                                        <div className="space-y-2">
                                            <h3 className="font-bold text-base">Assessment Pattern (Bloom&apos;s Taxonomy)</h3>
                                            <table className="w-full border border-black border-collapse">
                                                <thead>
                                                    <tr className="bg-muted/40">
                                                        <th className="border border-black px-2 py-1">COs</th>
                                                        {paperContent.assessmentPattern.bloomLevels.map((level: string) => (
                                                            <th key={level} className="border border-black px-2 py-1">{renderBloomLabel(level)}</th>
                                                        ))}
                                                        <th className="border border-black px-2 py-1">Total</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {paperContent.assessmentPattern.rows.map((row: Record<string, string | number>, idx: number) => (
                                                        <tr key={`co-row-${idx}`}>
                                                            <td className="border border-black px-2 py-1 font-medium">{String(row.co || "-")}</td>
                                                            {paperContent.assessmentPattern.bloomLevels.map((level: string) => (
                                                                <td key={`${idx}-${level}`} className="border border-black px-2 py-1 text-center">{Number(row[level] || 0)}</td>
                                                            ))}
                                                            <td className="border border-black px-2 py-1 text-center font-semibold">{Number(row.total || 0)}</td>
                                                        </tr>
                                                    ))}
                                                    <tr className="font-semibold">
                                                        <td className="border border-black px-2 py-1">Total</td>
                                                        {paperContent.assessmentPattern.bloomLevels.map((level: string) => (
                                                            <td key={`total-${level}`} className="border border-black px-2 py-1 text-center">{Number(paperContent.assessmentPattern.totals[level] || 0)}</td>
                                                        ))}
                                                        <td className="border border-black px-2 py-1 text-center">{Number(paperContent.assessmentPattern.totals.total || 0)}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Answer Key Tab */}
                <TabsContent value="answerkey">
                    <Card>
                        <CardContent className="p-8 print:p-0">
                            {answerKeyContent && (
                                <div className="space-y-6 max-w-4xl mx-auto">
                                    {/* Header */}
                                    <div className="text-center space-y-2">
                                        <h2 className="text-2xl font-bold uppercase">ANSWER KEY</h2>
                                        <p className="font-medium">
                                            Paper Code: {paper.paperCode} | Set: {paper.setVariant}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {paper.pattern.course.course_code} - {paper.pattern.course.name}
                                        </p>
                                    </div>

                                    <Separator />

                                    {/* Part A Answers */}
                                    {answerKeyContent.partA && (
                                        <div className="space-y-4">
                                            <h3 className="text-xl font-bold">PART A</h3>
                                            <div className="space-y-4">
                                                {answerKeyContent.partA.map((item: {
                                                    number: number;
                                                    question: string;
                                                    answer: string;
                                                    marks: number;
                                                }) => (
                                                    <div key={item.number} className="space-y-2">
                                                        <div className="flex gap-3">
                                                            <span className="font-medium">{item.number}.</span>
                                                            <div className="flex-1">
                                                                <p className="font-medium">{item.question}</p>
                                                            </div>
                                                        </div>
                                                        <div className="ml-8 pl-4 border-l-2 border-green-500">
                                                            <p className="whitespace-pre-wrap text-green-900 dark:text-green-100">
                                                                {item.answer}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground mt-1">
                                                                [{item.marks} marks]
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Part B Answers */}
                                    {answerKeyContent.partB && (
                                        <div className="space-y-4">
                                            <h3 className="text-xl font-bold">PART B</h3>
                                            <div className="space-y-4">
                                                {answerKeyContent.partB.map((item: {
                                                    number: number;
                                                    question: string;
                                                    answer: string;
                                                    marks: number;
                                                }) => (
                                                    <div key={item.number} className="space-y-2">
                                                        <div className="flex gap-3">
                                                            <span className="font-medium">{item.number}.</span>
                                                            <div className="flex-1">
                                                                <p className="font-medium">{item.question}</p>
                                                            </div>
                                                        </div>
                                                        <div className="ml-8 pl-4 border-l-2 border-green-500">
                                                            <p className="whitespace-pre-wrap text-green-900 dark:text-green-100">
                                                                {item.answer}
                                                            </p>
                                                            <p className="text-xs text-muted-foreground mt-1">
                                                                [{item.marks} marks]
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="w-[96vw] max-w-4xl">
                    <DialogHeader>
                        <DialogTitle>Edit Generated Question</DialogTitle>
                        <DialogDescription>
                            Editing {editSection === "partA" ? "Part A" : "Part B"} question {editQuestionNumber}. Update the text and optionally regenerate question/answer.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2">
                        <Textarea
                            value={editedQuestionText}
                            onChange={(e) => setEditedQuestionText(e.target.value)}
                            rows={5}
                            className="min-h-[120px]"
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-2">
                            <Label htmlFor="edit-marks">Marks</Label>
                            <Select
                                value={String(editedMarks)}
                                onValueChange={(value) => setEditedMarks(Number(value))}
                            >
                                <SelectTrigger id="edit-marks">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="2">2</SelectItem>
                                    <SelectItem value="8">8</SelectItem>
                                    <SelectItem value="16">16</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-bloom">Bloom Level</Label>
                            <Select
                                value={editedBloomLevel}
                                onValueChange={(value: EditableBloomLevel) => setEditedBloomLevel(value)}
                            >
                                <SelectTrigger id="edit-bloom">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="REMEMBER">Remember</SelectItem>
                                    <SelectItem value="UNDERSTAND">Understand</SelectItem>
                                    <SelectItem value="APPLY">Apply</SelectItem>
                                    <SelectItem value="ANALYZE">Analyze</SelectItem>
                                    <SelectItem value="EVALUATE">Evaluate</SelectItem>
                                    <SelectItem value="CREATE">Create</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-co">CO Mapping</Label>
                            <Input
                                id="edit-co"
                                value={editedMappingCO}
                                onChange={(e) => setEditedMappingCO(e.target.value.toUpperCase())}
                                placeholder="CO1"
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                            <Button
                                variant="outline"
                                className="w-full h-auto py-2 text-sm leading-tight whitespace-normal text-center"
                                onClick={handleRegenerateQuestion}
                                disabled={
                                    editedQuestionText.trim().length < 10 ||
                                    isRegeneratingQuestion ||
                                    regeneratePaperAnswerMutation.isPending ||
                                    updatePaperQuestionMutation.isPending
                                }
                            >
                                {isRegeneratingQuestion ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Regenerating Question...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="mr-2 h-4 w-4" />
                                        Regenerate Question and Answer Key
                                    </>
                                )}
                            </Button>
                            <Button
                                variant="outline"
                                className="w-full h-auto py-2 text-sm leading-tight whitespace-normal text-center"
                                onClick={handleRegenerateAnswer}
                                disabled={
                                    editedQuestionText.trim().length < 10 ||
                                    isRegeneratingQuestion ||
                                    regeneratePaperAnswerMutation.isPending ||
                                    updatePaperQuestionMutation.isPending
                                }
                            >
                                {regeneratePaperAnswerMutation.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Regenerating...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="mr-2 h-4 w-4" />
                                        Regenerate Answer Only
                                    </>
                                )}
                            </Button>
                        </div>

                        <DialogFooter className="flex-col-reverse sm:flex-row sm:justify-end gap-2">
                            <Button
                                variant="ghost"
                                className="sm:min-w-[120px]"
                                onClick={() => setEditDialogOpen(false)}
                                disabled={
                                    isRegeneratingQuestion ||
                                    regeneratePaperAnswerMutation.isPending ||
                                    updatePaperQuestionMutation.isPending
                                }
                            >
                                Cancel
                            </Button>
                            <Button
                                className="sm:min-w-[160px]"
                                onClick={handleSaveEditedQuestion}
                                disabled={
                                    editedQuestionText.trim().length < 10 ||
                                    updatePaperQuestionMutation.isPending
                                }
                            >
                                {updatePaperQuestionMutation.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    "Save Question"
                                )}
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
