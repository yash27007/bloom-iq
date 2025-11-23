"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Loader2, Search, Edit, Trash2, CheckCircle2, Filter, Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { exportQuestionsFromBank } from "@/lib/pdf-export";

interface Question {
    id: string;
    question: string;
    answer: string;
    marks: "TWO" | "EIGHT" | "SIXTEEN";
    difficultyLevel: "EASY" | "MEDIUM" | "HARD";
    bloomLevel: "REMEMBER" | "UNDERSTAND" | "APPLY" | "ANALYZE" | "EVALUATE" | "CREATE";
    questionType: "DIRECT" | "INDIRECT" | "SCENARIO_BASED" | "PROBLEM_BASED";
    unit: number;
    reviewedByCc: boolean;
    reviewedByMc: boolean;
    reviewedByPc: boolean;
    isFinalized: boolean;
    approvalStatusLabel: string;
    createdAt: Date;
}

export default function QuestionBankPage() {
    // State for filters
    const [selectedCourseId, setSelectedCourseId] = useState<string>("");
    const [selectedUnit, setSelectedUnit] = useState<string>("all");
    const [selectedDifficulty, setSelectedDifficulty] = useState<string>("all");
    const [selectedBloomLevel, setSelectedBloomLevel] = useState<string>("all");
    const [selectedApprovalStatus, setSelectedApprovalStatus] = useState<string>("all");
    const [searchQuery, setSearchQuery] = useState("");
    const [page, setPage] = useState(1);
    const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());

    // State for dialogs
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [questionToEdit, setQuestionToEdit] = useState<Question | null>(null);
    const [questionToDelete, setQuestionToDelete] = useState<string | null>(null);

    // Get user's courses
    const { data: coursesData } = trpc.coordinator.getCoursesForMaterialUpload.useQuery();
    const courses = coursesData || [];

    // Set default course if available
    useEffect(() => {
        if (!selectedCourseId && courses.length > 0) {
            setSelectedCourseId(courses[0].id);
        }
    }, [courses, selectedCourseId]);

    // Get available units for the course
    const { data: units = [] } = trpc.questionBank.getCourseUnits.useQuery(
        { courseId: selectedCourseId },
        { enabled: !!selectedCourseId }
    );

    // Get questions
    const {
        data: questionsData,
        isLoading,
        refetch,
    } = trpc.questionBank.getQuestions.useQuery(
        {
            courseId: selectedCourseId,
            unit: selectedUnit === "all" ? undefined : parseInt(selectedUnit),
            difficultyLevel:
                selectedDifficulty === "all"
                    ? undefined
                    : (selectedDifficulty as "EASY" | "MEDIUM" | "HARD"),
            bloomLevel:
                selectedBloomLevel === "all"
                    ? undefined
                    : (selectedBloomLevel as "REMEMBER" | "UNDERSTAND" | "APPLY" | "ANALYZE" | "EVALUATE" | "CREATE"),
            approvalStatus:
                selectedApprovalStatus === "all"
                    ? undefined
                    : (selectedApprovalStatus as "PENDING" | "CC_APPROVED" | "MC_APPROVED" | "PC_APPROVED" | "FULLY_APPROVED"),
            searchQuery: searchQuery || undefined,
            page,
            pageSize: 50,
        },
        { enabled: !!selectedCourseId }
    );

    // Get question stats
    const { data: stats } = trpc.questionBank.getQuestionStats.useQuery(
        { courseId: selectedCourseId },
        { enabled: !!selectedCourseId }
    );

    // Mutations
    const updateMutation = trpc.questionBank.updateQuestion.useMutation({
        onSuccess: () => {
            toast.success("Question updated successfully");
            refetch();
            setEditDialogOpen(false);
            setQuestionToEdit(null);
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message || "Failed to update question");
        },
    });

    const deleteMutation = trpc.questionBank.deleteQuestion.useMutation({
        onSuccess: () => {
            toast.success("Question deleted successfully");
            refetch();
            setDeleteDialogOpen(false);
            setQuestionToDelete(null);
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message || "Failed to delete question");
        },
    });

    const approveMutation = trpc.questionBank.approveQuestion.useMutation({
        onSuccess: () => {
            toast.success("Question approved successfully");
            refetch();
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message || "Failed to approve question");
        },
    });

    const bulkApproveMutation = trpc.questionBank.bulkApprove.useMutation({
        onSuccess: (data: { approvedCount: number; skippedCount: number }) => {
            toast.success(
                `Approved ${data.approvedCount} question(s)${data.skippedCount > 0 ? `, skipped ${data.skippedCount}` : ""
                }`
            );
            refetch();
            setSelectedQuestions(new Set());
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message || "Failed to bulk approve");
        },
    });

    // Handlers
    const handleEditQuestion = (question: Question) => {
        setQuestionToEdit(question);
        setEditDialogOpen(true);
    };

    const handleDeleteQuestion = (questionId: string) => {
        setQuestionToDelete(questionId);
        setDeleteDialogOpen(true);
    };

    const handleApproveQuestion = (questionId: string) => {
        approveMutation.mutate({ questionId });
    };

    const handleBulkApprove = () => {
        if (selectedQuestions.size === 0) {
            toast.error("No questions selected");
            return;
        }
        bulkApproveMutation.mutate({ questionIds: Array.from(selectedQuestions) });
    };

    const handleSaveEdit = () => {
        if (!questionToEdit) return;

        updateMutation.mutate({
            questionId: questionToEdit.id,
            question: questionToEdit.question,
            answer: questionToEdit.answer,
            marks: questionToEdit.marks,
            difficultyLevel: questionToEdit.difficultyLevel,
            bloomLevel: questionToEdit.bloomLevel,
            questionType: questionToEdit.questionType,
            unit: questionToEdit.unit,
        });
    };

    const handleConfirmDelete = () => {
        if (!questionToDelete) return;
        deleteMutation.mutate({ questionId: questionToDelete });
    };

    const toggleQuestionSelection = (questionId: string) => {
        const newSelected = new Set(selectedQuestions);
        if (newSelected.has(questionId)) {
            newSelected.delete(questionId);
        } else {
            newSelected.add(questionId);
        }
        setSelectedQuestions(newSelected);
    };

    const toggleSelectAll = () => {
        if (!questionsData?.questions) return;
        if (selectedQuestions.size === questionsData.questions.length) {
            setSelectedQuestions(new Set());
        } else {
            setSelectedQuestions(
                new Set(questionsData.questions.map((q: Question) => q.id))
            );
        }
    };

    // Export handlers
    const handleExportQuestionsOnly = () => {
        const questionsToExport = selectedQuestions.size > 0
            ? questions.filter(q => selectedQuestions.has(q.id))
            : questions;

        if (questionsToExport.length === 0) {
            toast.error('No questions to export');
            return;
        }

        const courseName = courses.find(c => c.id === selectedCourseId)?.name || 'Unknown Course';

        try {
            exportQuestionsFromBank(
                questionsToExport.map(q => ({
                    question: q.question,
                    answer: q.answer,
                    marks: q.marks,
                    difficultyLevel: q.difficultyLevel,
                    bloomLevel: q.bloomLevel,
                    generationType: q.questionType,
                    unit: q.unit
                })),
                courseName,
                false, // don't include answers
                true   // include metadata
            );
            toast.success(`Exporting ${questionsToExport.length} questions`);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to export');
        }
    };

    const handleExportWithAnswers = () => {
        const questionsToExport = selectedQuestions.size > 0
            ? questions.filter(q => selectedQuestions.has(q.id))
            : questions;

        if (questionsToExport.length === 0) {
            toast.error('No questions to export');
            return;
        }

        const courseName = courses.find(c => c.id === selectedCourseId)?.name || 'Unknown Course';

        try {
            exportQuestionsFromBank(
                questionsToExport.map(q => ({
                    question: q.question,
                    answer: q.answer,
                    marks: q.marks,
                    difficultyLevel: q.difficultyLevel,
                    bloomLevel: q.bloomLevel,
                    generationType: q.questionType,
                    unit: q.unit
                })),
                courseName,
                true,  // include answers
                true   // include metadata
            );
            toast.success(`Exporting ${questionsToExport.length} questions with answers`);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to export');
        }
    };

    const handleBulkDelete = () => {
        if (selectedQuestions.size === 0) {
            toast.error('No questions selected');
            return;
        }
        // Implement bulk delete
        toast.info('Bulk delete functionality coming soon');
    };

    // Get approval status badge
    const getApprovalBadge = (status: string) => {
        const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
            PENDING: "outline",
            CC_APPROVED: "secondary",
            MC_APPROVED: "secondary",
            PC_APPROVED: "secondary",
            FULLY_APPROVED: "default",
        };

        const labels: Record<string, string> = {
            PENDING: "Pending",
            CC_APPROVED: "CC Approved",
            MC_APPROVED: "MC Approved",
            PC_APPROVED: "PC Approved",
            FULLY_APPROVED: "Fully Approved",
        };

        return (
            <Badge variant={variants[status] || "outline"}>
                {labels[status] || status}
            </Badge>
        );
    };

    // Get marks display
    const getMarksDisplay = (marks: string) => {
        const map: Record<string, string> = {
            TWO: "2",
            EIGHT: "8",
            SIXTEEN: "16",
        };
        return map[marks] || marks;
    };

    const questions = questionsData?.questions || [];
    const pagination = questionsData?.pagination;

    return (
        <div className="container mx-auto py-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold">Question Bank</h1>
                <p className="text-muted-foreground">
                    View, filter, edit, and approve questions for your courses
                </p>
            </div>

            {/* Statistics Cards */}
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Total</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Pending</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.pending}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">CC Approved</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.ccApproved}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">MC Approved</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.mcApproved}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">PC Approved</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.pcApproved}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-medium">Fully Approved</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.fullyApproved}</div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Filter className="h-5 w-5" />
                        Filters
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Course Selection */}
                        <div className="space-y-2">
                            <Label>Course</Label>
                            <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select course" />
                                </SelectTrigger>
                                <SelectContent>
                                    {courses.map((course: { id: string; course_code: string; name: string }) => (
                                        <SelectItem key={course.id} value={course.id}>
                                            {course.course_code} - {course.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Unit Filter */}
                        <div className="space-y-2">
                            <Label>Unit</Label>
                            <Select value={selectedUnit} onValueChange={setSelectedUnit}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Units</SelectItem>
                                    {units.map((unit: number) => (
                                        <SelectItem key={unit} value={unit.toString()}>
                                            Unit {unit}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Difficulty Filter */}
                        <div className="space-y-2">
                            <Label>Difficulty</Label>
                            <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Difficulties</SelectItem>
                                    <SelectItem value="EASY">Easy</SelectItem>
                                    <SelectItem value="MEDIUM">Medium</SelectItem>
                                    <SelectItem value="HARD">Hard</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Bloom Level Filter */}
                        <div className="space-y-2">
                            <Label>Bloom Level</Label>
                            <Select value={selectedBloomLevel} onValueChange={setSelectedBloomLevel}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Levels</SelectItem>
                                    <SelectItem value="REMEMBER">Remember</SelectItem>
                                    <SelectItem value="UNDERSTAND">Understand</SelectItem>
                                    <SelectItem value="APPLY">Apply</SelectItem>
                                    <SelectItem value="ANALYZE">Analyze</SelectItem>
                                    <SelectItem value="EVALUATE">Evaluate</SelectItem>
                                    <SelectItem value="CREATE">Create</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Approval Status Filter */}
                        <div className="space-y-2">
                            <Label>Approval Status</Label>
                            <Select value={selectedApprovalStatus} onValueChange={setSelectedApprovalStatus}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="PENDING">Pending</SelectItem>
                                    <SelectItem value="CC_APPROVED">CC Approved</SelectItem>
                                    <SelectItem value="MC_APPROVED">MC Approved</SelectItem>
                                    <SelectItem value="PC_APPROVED">PC Approved</SelectItem>
                                    <SelectItem value="FULLY_APPROVED">Fully Approved</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Search */}
                        <div className="space-y-2 md:col-span-2">
                            <Label>Search</Label>
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search questions or answers..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-8"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            variant="default"
                            onClick={handleBulkApprove}
                            disabled={selectedQuestions.size === 0 || bulkApproveMutation.isPending}
                        >
                            {bulkApproveMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Approving...
                                </>
                            ) : (
                                <>
                                    <CheckCircle2 className="mr-2 h-4 w-4" />
                                    Approve Selected ({selectedQuestions.size})
                                </>
                            )}
                        </Button>

                        <Button
                            variant="outline"
                            onClick={handleExportQuestionsOnly}
                            disabled={questions.length === 0}
                        >
                            <FileText className="mr-2 h-4 w-4" />
                            Export Questions Only
                        </Button>

                        <Button
                            variant="outline"
                            onClick={handleExportWithAnswers}
                            disabled={questions.length === 0}
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Export with Answers
                        </Button>

                        {selectedQuestions.size > 0 && (
                            <>
                                <Button
                                    variant="outline"
                                    onClick={() => setSelectedQuestions(new Set())}
                                >
                                    Clear Selection
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={handleBulkDelete}
                                >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Delete Selected ({selectedQuestions.size})
                                </Button>
                            </>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Questions Table */}
            <Card>
                <CardHeader>
                    <CardTitle>
                        Questions ({pagination?.totalCount || 0})
                    </CardTitle>
                    <CardDescription>
                        {pagination &&
                            `Showing ${(pagination.currentPage - 1) * pagination.pageSize + 1} - ${Math.min(
                                pagination.currentPage * pagination.pageSize,
                                pagination.totalCount
                            )} of ${pagination.totalCount}`}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : questions.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            No questions found. Try adjusting your filters.
                        </div>
                    ) : (
                        <>
                            <div className="rounded-md border">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-12">
                                                <Checkbox
                                                    checked={
                                                        selectedQuestions.size === questions.length &&
                                                        questions.length > 0
                                                    }
                                                    onCheckedChange={toggleSelectAll}
                                                />
                                            </TableHead>
                                            <TableHead className="w-16">Unit</TableHead>
                                            <TableHead>Question</TableHead>
                                            <TableHead className="w-24">Marks</TableHead>
                                            <TableHead className="w-32">Bloom Level</TableHead>
                                            <TableHead className="w-32">Difficulty</TableHead>
                                            <TableHead className="w-40">Status</TableHead>
                                            <TableHead className="w-32 text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {questions.map((question: Question) => (
                                            <TableRow key={question.id}>
                                                <TableCell>
                                                    <Checkbox
                                                        checked={selectedQuestions.has(question.id)}
                                                        onCheckedChange={() =>
                                                            toggleQuestionSelection(question.id)
                                                        }
                                                    />
                                                </TableCell>
                                                <TableCell className="font-medium">
                                                    {question.unit}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="max-w-md">
                                                        <p className="line-clamp-2">{question.question}</p>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">
                                                        {getMarksDisplay(question.marks)}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary">
                                                        {question.bloomLevel}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant={
                                                            question.difficultyLevel === "EASY"
                                                                ? "default"
                                                                : question.difficultyLevel === "MEDIUM"
                                                                    ? "secondary"
                                                                    : "destructive"
                                                        }
                                                    >
                                                        {question.difficultyLevel}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {getApprovalBadge(question.approvalStatusLabel)}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center justify-end gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleEditQuestion(question)}
                                                        >
                                                            <Edit className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleApproveQuestion(question.id)}
                                                            disabled={approveMutation.isPending}
                                                        >
                                                            <CheckCircle2 className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleDeleteQuestion(question.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Pagination */}
                            {pagination && pagination.totalPages > 1 && (
                                <div className="flex items-center justify-between mt-4">
                                    <div className="text-sm text-muted-foreground">
                                        Page {pagination.currentPage} of {pagination.totalPages}
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage(page - 1)}
                                            disabled={page === 1}
                                        >
                                            Previous
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setPage(page + 1)}
                                            disabled={page === pagination.totalPages}
                                        >
                                            Next
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Edit Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Edit Question</DialogTitle>
                        <DialogDescription>
                            Make changes to the question details below.
                        </DialogDescription>
                    </DialogHeader>
                    {questionToEdit && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Unit</Label>
                                <Input
                                    type="number"
                                    value={questionToEdit.unit}
                                    onChange={(e) =>
                                        setQuestionToEdit({
                                            ...questionToEdit,
                                            unit: parseInt(e.target.value),
                                        })
                                    }
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Question</Label>
                                <Textarea
                                    value={questionToEdit.question}
                                    onChange={(e) =>
                                        setQuestionToEdit({
                                            ...questionToEdit,
                                            question: e.target.value,
                                        })
                                    }
                                    rows={4}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Answer</Label>
                                <Textarea
                                    value={questionToEdit.answer}
                                    onChange={(e) =>
                                        setQuestionToEdit({
                                            ...questionToEdit,
                                            answer: e.target.value,
                                        })
                                    }
                                    rows={6}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Marks</Label>
                                    <Select
                                        value={questionToEdit.marks}
                                        onValueChange={(value: "TWO" | "EIGHT" | "SIXTEEN") =>
                                            setQuestionToEdit({ ...questionToEdit, marks: value })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="TWO">2 Marks</SelectItem>
                                            <SelectItem value="EIGHT">8 Marks</SelectItem>
                                            <SelectItem value="SIXTEEN">16 Marks</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Difficulty</Label>
                                    <Select
                                        value={questionToEdit.difficultyLevel}
                                        onValueChange={(value: "EASY" | "MEDIUM" | "HARD") =>
                                            setQuestionToEdit({
                                                ...questionToEdit,
                                                difficultyLevel: value,
                                            })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="EASY">Easy</SelectItem>
                                            <SelectItem value="MEDIUM">Medium</SelectItem>
                                            <SelectItem value="HARD">Hard</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Bloom Level</Label>
                                    <Select
                                        value={questionToEdit.bloomLevel}
                                        onValueChange={(
                                            value:
                                                | "REMEMBER"
                                                | "UNDERSTAND"
                                                | "APPLY"
                                                | "ANALYZE"
                                                | "EVALUATE"
                                                | "CREATE"
                                        ) =>
                                            setQuestionToEdit({ ...questionToEdit, bloomLevel: value })
                                        }
                                    >
                                        <SelectTrigger>
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
                                    <Label>Question Type</Label>
                                    <Select
                                        value={questionToEdit.questionType}
                                        onValueChange={(
                                            value:
                                                | "DIRECT"
                                                | "INDIRECT"
                                                | "SCENARIO_BASED"
                                                | "PROBLEM_BASED"
                                        ) =>
                                            setQuestionToEdit({
                                                ...questionToEdit,
                                                questionType: value,
                                            })
                                        }
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="DIRECT">Direct</SelectItem>
                                            <SelectItem value="INDIRECT">Indirect</SelectItem>
                                            <SelectItem value="SCENARIO_BASED">
                                                Scenario Based
                                            </SelectItem>
                                            <SelectItem value="PROBLEM_BASED">Problem Based</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setEditDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSaveEdit}
                            disabled={updateMutation.isPending}
                        >
                            {updateMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                "Save Changes"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This action cannot be undone. This will permanently delete the
                            question from the database.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmDelete}
                            disabled={deleteMutation.isPending}
                        >
                            {deleteMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Deleting...
                                </>
                            ) : (
                                "Delete"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
