"use client";

import { useState, useEffect } from "react";
import { trpc } from "@/trpc/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, XCircle, MessageSquare, TrendingUp } from "lucide-react";
import { toast } from "sonner";

type QuestionStatus = "CREATED_BY_COURSE_COORDINATOR" | "UNDER_REVIEW_FROM_MODULE_COORDINATOR" | "UNDER_REVIEW_FROM_PROGRAM_COORDINATOR" | "ACCEPTED" | "REJECTED";

export default function ReviewQuestionsPage() {
    const [selectedCourseId, setSelectedCourseId] = useState<string>("");
    const [selectedStatus, setSelectedStatus] = useState<QuestionStatus | "all">("all");
    const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [showApproveDialog, setShowApproveDialog] = useState(false);
    const [rejectionReason, setRejectionReason] = useState("");
    const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);

    // Fetch courses for the coordinator
    const { data: coursesData } = trpc.coordinator.getCoursesForMaterialUpload.useQuery();
    const courses = coursesData || [];

    // Set default course if available
    useEffect(() => {
        if (!selectedCourseId && courses.length > 0) {
            setSelectedCourseId(courses[0].id);
        }
    }, [courses, selectedCourseId]);

    // Fetch questions for review
    const { data: questionsData, refetch: refetchQuestions } = trpc.questionApproval.getQuestionsForReview.useQuery(
        {
            courseId: selectedCourseId,
            status: selectedStatus === "all" ? undefined : selectedStatus,
        },
        {
            enabled: !!selectedCourseId,
        }
    );

    // Fetch question statistics
    const { data: statsData } = trpc.questionApproval.getQuestionStatistics.useQuery(
        { courseId: selectedCourseId },
        { enabled: !!selectedCourseId }
    );

    // Fetch question feedback
    const { data: feedbackData } = trpc.questionApproval.getQuestionFeedback.useQuery(
        { questionId: selectedQuestionId || "" },
        { enabled: !!selectedQuestionId && showFeedbackDialog }
    );

    const questions = questionsData?.data || [];
    const stats = statsData?.data;

    // Mutations
    const approveCCMutation = trpc.questionApproval.approveAsCourseCoordinator.useMutation({
        onSuccess: () => {
            toast.success("Question approved successfully!");
            refetchQuestions();
            setShowApproveDialog(false);
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const approveMCMutation = trpc.questionApproval.approveAsModuleCoordinator.useMutation({
        onSuccess: () => {
            toast.success("Question approved successfully!");
            refetchQuestions();
            setShowApproveDialog(false);
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const approvePCMutation = trpc.questionApproval.approveAsProgramCoordinator.useMutation({
        onSuccess: () => {
            toast.success("Question approved and finalized!");
            refetchQuestions();
            setShowApproveDialog(false);
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const rejectMutation = trpc.questionApproval.rejectQuestion.useMutation({
        onSuccess: () => {
            toast.success("Question rejected with feedback.");
            refetchQuestions();
            setShowRejectDialog(false);
            setRejectionReason("");
        },
        onError: (error) => {
            toast.error(error.message);
        },
    });

    const handleApprove = (questionId: string) => {
        setSelectedQuestionId(questionId);
        setShowApproveDialog(true);
    };

    const confirmApprove = () => {
        if (!selectedQuestionId) return;

        const question = questions.find((q: any) => q.id === selectedQuestionId);
        if (!question) return;

        // Determine which approval mutation to use based on question status
        if (question.status === "CREATED_BY_COURSE_COORDINATOR") {
            approveCCMutation.mutate({ questionId: selectedQuestionId });
        } else if (question.status === "UNDER_REVIEW_FROM_MODULE_COORDINATOR") {
            approveMCMutation.mutate({ questionId: selectedQuestionId });
        } else if (question.status === "UNDER_REVIEW_FROM_PROGRAM_COORDINATOR") {
            approvePCMutation.mutate({ questionId: selectedQuestionId });
        }
    };

    const handleReject = (questionId: string) => {
        setSelectedQuestionId(questionId);
        setShowRejectDialog(true);
    };

    const confirmReject = () => {
        if (!selectedQuestionId || !rejectionReason.trim()) {
            toast.error("Please provide a rejection reason.");
            return;
        }

        rejectMutation.mutate({
            questionId: selectedQuestionId,
            remarks: rejectionReason,
        });
    };

    const getStatusBadge = (status: QuestionStatus) => {
        const statusConfig: Record<QuestionStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
            CREATED_BY_COURSE_COORDINATOR: { label: "Created", variant: "secondary" },
            UNDER_REVIEW_FROM_MODULE_COORDINATOR: { label: "Module Review", variant: "default" },
            UNDER_REVIEW_FROM_PROGRAM_COORDINATOR: { label: "Program Review", variant: "default" },
            ACCEPTED: { label: "Accepted", variant: "outline" },
            REJECTED: { label: "Rejected", variant: "destructive" },
        };

        const config = statusConfig[status] || { label: status, variant: "outline" as const };
        return <Badge variant={config.variant}>{config.label}</Badge>;
    };

    const getDifficultyBadge = (level: string) => {
        const colors: Record<string, string> = {
            EASY: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
            MEDIUM: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
            HARD: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
        };
        return <Badge className={colors[level] || ""}>{level}</Badge>;
    };

    return (
        <div className="bg-background min-h-screen">
            <div className="container mx-auto px-6 py-8">
                {/* Header */}
                <div className="mb-8 space-y-2">
                    <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                        Review Questions
                    </h1>
                    <p className="text-muted-foreground">
                        Review and approve questions through the multi-level approval workflow
                    </p>
                </div>

                {/* Course Selection */}
                <Card className="mb-6">
                    <CardHeader>
                        <CardTitle>Select Course</CardTitle>
                        <CardDescription>Choose a course to review its questions</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select a course" />
                            </SelectTrigger>
                            <SelectContent>
                                {courses.map((course: any) => (
                                    <SelectItem key={course.id} value={course.id}>
                                        {course.course_code} - {course.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </CardContent>
                </Card>

                {selectedCourseId && stats && (
                    <>
                        {/* Statistics Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{stats.total}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Created</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{stats.created}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">MC Review</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{stats.underReviewMC}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">PC Review</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold">{stats.underReviewPC}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Accepted</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-green-600">{stats.accepted}</div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold text-red-600">{stats.rejected}</div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Filters */}
                        <Card className="mb-6">
                            <CardHeader>
                                <CardTitle>Filters</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex gap-4">
                                    <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as QuestionStatus | "all")}>
                                        <SelectTrigger className="w-[250px]">
                                            <SelectValue placeholder="Filter by status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Questions</SelectItem>
                                            <SelectItem value="CREATED_BY_COURSE_COORDINATOR">Created</SelectItem>
                                            <SelectItem value="UNDER_REVIEW_FROM_MODULE_COORDINATOR">Module Review</SelectItem>
                                            <SelectItem value="UNDER_REVIEW_FROM_PROGRAM_COORDINATOR">Program Review</SelectItem>
                                            <SelectItem value="ACCEPTED">Accepted</SelectItem>
                                            <SelectItem value="REJECTED">Rejected</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Questions List */}
                        <div className="space-y-4">
                            {questions.length === 0 ? (
                                <Card>
                                    <CardContent className="py-12 text-center">
                                        <p className="text-muted-foreground">No questions found for the selected filters.</p>
                                    </CardContent>
                                </Card>
                            ) : (
                                questions.map((question: any) => (
                                    <Card key={question.id}>
                                        <CardHeader>
                                            <div className="flex justify-between items-start">
                                                <div className="space-y-2 flex-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        {getStatusBadge(question.status)}
                                                        {getDifficultyBadge(question.difficultyLevel)}
                                                        <Badge variant="outline">{question.bloomLevel}</Badge>
                                                        <Badge variant="outline">{question.marks} marks</Badge>
                                                        <Badge variant="outline">Unit {question.unit}</Badge>
                                                    </div>
                                                    <CardTitle className="text-lg">{question.question}</CardTitle>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div>
                                                <h4 className="text-sm font-semibold mb-2 text-muted-foreground">Answer:</h4>
                                                <p className="text-sm">{question.answer}</p>
                                            </div>

                                            <Separator />

                                            <div className="flex justify-between items-center">
                                                <div className="flex gap-2">
                                                    {question.status !== "ACCEPTED" && question.status !== "REJECTED" && (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                onClick={() => handleApprove(question.id)}
                                                                disabled={approveCCMutation.isPending || approveMCMutation.isPending || approvePCMutation.isPending}
                                                            >
                                                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                                                Approve
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="destructive"
                                                                onClick={() => handleReject(question.id)}
                                                                disabled={rejectMutation.isPending}
                                                            >
                                                                <XCircle className="w-4 h-4 mr-2" />
                                                                Reject
                                                            </Button>
                                                        </>
                                                    )}
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => {
                                                            setSelectedQuestionId(question.id);
                                                            setShowFeedbackDialog(true);
                                                        }}
                                                    >
                                                        <MessageSquare className="w-4 h-4 mr-2" />
                                                        View Feedback
                                                    </Button>
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    Created: {new Date(question.createdAt).toLocaleDateString()}
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))
                            )}
                        </div>
                    </>
                )}

                {!selectedCourseId && (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <TrendingUp className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                            <p className="text-lg text-muted-foreground">Select a course to start reviewing questions</p>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Approve Dialog */}
            <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Approve Question</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to approve this question? It will move to the next review stage.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmApprove}>Approve</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Reject Dialog */}
            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Question</DialogTitle>
                        <DialogDescription>
                            Please provide a reason for rejecting this question. This feedback will help improve future questions.
                        </DialogDescription>
                    </DialogHeader>
                    <Textarea
                        placeholder="Enter rejection reason (minimum 10 characters)..."
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        className="min-h-[100px]"
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowRejectDialog(false)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={confirmReject}
                            disabled={rejectionReason.length < 10 || rejectMutation.isPending}
                        >
                            {rejectMutation.isPending ? "Rejecting..." : "Reject Question"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Feedback Dialog */}
            <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Question Feedback History</DialogTitle>
                        <DialogDescription>
                            All feedback and comments for this question
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 max-h-[400px] overflow-y-auto">
                        {feedbackData?.data && feedbackData.data.length > 0 ? (
                            feedbackData.data.map((feedback: any) => (
                                <Card key={feedback.id}>
                                    <CardContent className="pt-4">
                                        <p className="text-sm">{feedback.remarks}</p>
                                        <p className="text-xs text-muted-foreground mt-2">
                                            {new Date(feedback.createdAt).toLocaleString()}
                                        </p>
                                    </CardContent>
                                </Card>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-8">
                                No feedback available for this question.
                            </p>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
