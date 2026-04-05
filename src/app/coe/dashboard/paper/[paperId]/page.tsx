"use client";

import { Fragment, use, useEffect, useRef, useState } from "react";
import { trpc } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { openProfessionalPrintWindow } from "@/lib/print-utils";

interface PaperViewProps {
    params: Promise<{
        paperId: string;
    }>;
}

export default function PaperViewPage({ params }: PaperViewProps) {
    const { paperId } = use(params);
    const router = useRouter();
    const utils = trpc.useUtils();
    const paperPrintRef = useRef<HTMLDivElement>(null);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [editSection, setEditSection] = useState<"partA" | "partB">("partA");
    const [editQuestionNumber, setEditQuestionNumber] = useState<number>(0);
    const [editedQuestionText, setEditedQuestionText] = useState("");
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

        if (!paperPrintRef.current) {
            toast.error("Question paper preview is not ready for printing.");
            return;
        }

        const printableHtml = paperPrintRef.current.outerHTML.trim();
        if (!printableHtml) {
            toast.error("No printable content found.");
            return;
        }

        const result = openProfessionalPrintWindow({
            title: `${paper.paperCode} - Question Paper`,
            html: printableHtml,
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

    const openEditDialog = (section: "partA" | "partB", questionNumber: number, questionText: string) => {
        setEditSection(section);
        setEditQuestionNumber(questionNumber);
        setEditedQuestionText(questionText);
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
        });
    };

    const handleRegenerateAnswer = () => {
        regeneratePaperAnswerMutation.mutate({
            paperId,
            section: editSection,
            questionNumber: editQuestionNumber,
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
                        <Download className="mr-2 h-4 w-4" />
                        Print / Download
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
                                                                            onClick={() => openEditDialog("partA", q.number, q.question)}
                                                                        >
                                                                            <Pencil className="mr-1 h-3 w-3" />
                                                                            Edit
                                                                        </Button>
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
                                                                                    onClick={() => openEditDialog("partB", q.number, q.question)}
                                                                                >
                                                                                    <Pencil className="mr-1 h-3 w-3" />
                                                                                    Edit
                                                                                </Button>
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
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Edit Generated Question</DialogTitle>
                        <DialogDescription>
                            Update the question and regenerate the answer key entry for this item.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2">
                        <Textarea
                            value={editedQuestionText}
                            onChange={(e) => setEditedQuestionText(e.target.value)}
                            rows={6}
                        />
                    </div>

                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={handleRegenerateAnswer}
                            disabled={regeneratePaperAnswerMutation.isPending || updatePaperQuestionMutation.isPending}
                        >
                            {regeneratePaperAnswerMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Regenerating...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    Regenerate Answer Key
                                </>
                            )}
                        </Button>
                        <Button
                            onClick={handleSaveEditedQuestion}
                            disabled={updatePaperQuestionMutation.isPending}
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
                </DialogContent>
            </Dialog>
        </div>
    );
}
