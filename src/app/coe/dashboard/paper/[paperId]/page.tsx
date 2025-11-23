"use client";

import { trpc } from "@/trpc/client";
import { Button } from "@/components/ui/button";
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
    Loader2,
    Download,
    CheckCircle,
    ArrowLeft,
    FileText,
    Key,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface PaperViewProps {
    params: {
        paperId: string;
    };
}

export default function PaperViewPage({ params }: PaperViewProps) {
    const router = useRouter();
    const utils = trpc.useUtils();

    // Get paper details
    const { data: paper, isLoading } = trpc.paper.getPaperById.useQuery({
        paperId: params.paperId,
    });

    // Finalize mutation
    const finalizeMutation = trpc.paper.finalizePaper.useMutation({
        onSuccess: () => {
            toast.success("Paper finalized successfully");
            utils.paper.getPaperById.invalidate({ paperId: params.paperId });
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message || "Failed to finalize paper");
        },
    });

    const handleFinalize = () => {
        finalizeMutation.mutate({ paperId: params.paperId });
    };

    const handlePrint = () => {
        window.print();
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
        paperContent = JSON.parse(paper.paperContent);
        answerKeyContent = JSON.parse(paper.answerKeyContent);
    } catch (e) {
        console.error("Failed to parse paper content", e);
    }

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
                    </div>
                    <h1 className="text-3xl font-bold">{paper.paperCode}</h1>
                    <p className="text-muted-foreground">
                        {paper.pattern.course.course_code} - {paper.pattern.course.name}
                    </p>
                </div>
                <div className="flex gap-2">
                    {!paper.isFinalized && (
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
                                    Finalize Paper
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
                            <p className="font-medium">Semester {paper.pattern.semester}</p>
                        </div>
                        <div>
                            <p className="text-sm text-muted-foreground">Set Variant</p>
                            <p className="font-medium">{paper.setVariant}</p>
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
                                <div className="space-y-6 max-w-4xl mx-auto">
                                    {/* Header */}
                                    <div className="text-center space-y-2">
                                        <h2 className="text-2xl font-bold uppercase">
                                            {paperContent.header?.institution || "MANGALAM ACADEMY"}
                                        </h2>
                                        <div className="text-sm space-y-1">
                                            <p className="font-medium">
                                                {paperContent.header?.courseName || paper.pattern.course.name}
                                            </p>
                                            <p>
                                                {paperContent.header?.examType || paper.pattern.examType} Examination
                                            </p>
                                            <p>
                                                {paperContent.header?.academicYear || paper.pattern.academicYear},{" "}
                                                Semester {paperContent.header?.semester || paper.pattern.semester}
                                            </p>
                                            <p className="font-medium">
                                                Paper Code: {paper.paperCode} | Set: {paper.setVariant}
                                            </p>
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* Instructions */}
                                    {paperContent.instructions && (
                                        <div className="bg-muted p-4 rounded-lg">
                                            <p className="font-medium mb-2">Instructions:</p>
                                            <p className="text-sm whitespace-pre-wrap">
                                                {paperContent.instructions}
                                            </p>
                                        </div>
                                    )}

                                    {/* Part A */}
                                    {paperContent.partA && (
                                        <div className="space-y-4">
                                            <h3 className="text-xl font-bold">
                                                {paperContent.partA.title || "PART A - Short Answer Questions"}
                                            </h3>
                                            <div className="space-y-4">
                                                {paperContent.partA.questions.map((q: {
                                                    number: number;
                                                    question: string;
                                                    marks: number;
                                                    bloomLevel?: string;
                                                    unit?: number;
                                                }) => (
                                                    <div key={q.number} className="flex gap-3">
                                                        <span className="font-medium">{q.number}.</span>
                                                        <div className="flex-1">
                                                            <p className="whitespace-pre-wrap">{q.question}</p>
                                                            <p className="text-xs text-muted-foreground mt-1">
                                                                [{q.marks} marks]
                                                                {q.bloomLevel && ` [${q.bloomLevel}]`}
                                                                {q.unit && ` [Unit ${q.unit}]`}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Part B */}
                                    {paperContent.partB && (
                                        <div className="space-y-4">
                                            <h3 className="text-xl font-bold">
                                                {paperContent.partB.title || "PART B - Essay Questions"}
                                            </h3>
                                            <div className="space-y-4">
                                                {paperContent.partB.questions.map((q: {
                                                    number: number;
                                                    question: string;
                                                    marks: number;
                                                    bloomLevel?: string;
                                                    unit?: number;
                                                }) => (
                                                    <div key={q.number} className="flex gap-3">
                                                        <span className="font-medium">{q.number}.</span>
                                                        <div className="flex-1">
                                                            <p className="whitespace-pre-wrap">{q.question}</p>
                                                            <p className="text-xs text-muted-foreground mt-1">
                                                                [{q.marks} marks]
                                                                {q.bloomLevel && ` [${q.bloomLevel}]`}
                                                                {q.unit && ` [Unit ${q.unit}]`}
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
        </div>
    );
}
