"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
    Loader2,
    FileText,
    Eye,
    CheckCircle,
    Trash2,
    Plus,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Paper {
    id: string;
    paperCode: string;
    setVariant: string;
    status: string;
    isFinalized: boolean;
    paperContent?: string | null;
    generatedAt: Date | null;
    finalizedAt: Date | null;
    pattern: {
        patternName: string;
        academicYear: string;
        semesterType: string;
        examType: string;
        totalMarks: number;
        course: {
            course_code: string;
            name: string;
        };
    };
}

type PaperStatus = "DRAFT" | "GENERATED" | "FINALIZED";
const ALL_COURSES = "ALL_COURSES";
const ALL_STATUSES = "ALL_STATUSES";

export default function ViewPapersPage() {
    const router = useRouter();
    const [courseFilter, setCourseFilter] = useState<string>(ALL_COURSES);
    const [statusFilter, setStatusFilter] = useState<PaperStatus | typeof ALL_STATUSES>(ALL_STATUSES);
    const [paperToDelete, setPaperToDelete] = useState<string | null>(null);

    const utils = trpc.useUtils();

    // Get papers
    const { data: papers, isLoading } = trpc.paper.getPapers.useQuery({
        courseId: courseFilter === ALL_COURSES ? undefined : courseFilter,
        status: statusFilter === ALL_STATUSES ? undefined : statusFilter as PaperStatus,
    });

    // Get courses (for filter)
    const { data: coursesData } = trpc.coordinator.getCoursesForMaterialUpload.useQuery();
    const courses = coursesData || [];
    const { data: committeeContext } = trpc.paper.getCommitteeContext.useQuery();
    const currentRole = committeeContext?.role;

    const getApprovals = (paper: Paper) => {
        try {
            const parsed = paper.paperContent ? JSON.parse(paper.paperContent) : {};
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
            utils.paper.getPapers.invalidate();
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message || "Failed to finalize paper");
        },
    });

    const approveByDeanMutation = trpc.paper.approvePaperByDean.useMutation({
        onSuccess: () => {
            toast.success("Paper approved by Dean");
            utils.paper.getPapers.invalidate();
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message || "Failed to approve paper");
        },
    });

    // Delete mutation
    const deleteMutation = trpc.paper.deletePaper.useMutation({
        onSuccess: () => {
            toast.success("Paper deleted successfully");
            setPaperToDelete(null);
            utils.paper.getPapers.invalidate();
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message || "Failed to delete paper");
        },
    });

    const handleFinalize = (paperId: string) => {
        finalizeMutation.mutate({ paperId });
    };

    const handleApproveByDean = (paperId: string) => {
        approveByDeanMutation.mutate({ paperId });
    };

    const handleDelete = () => {
        if (paperToDelete) {
            deleteMutation.mutate({ paperId: paperToDelete });
        }
    };

    const getStatusBadge = (paper: Paper) => {
        const approvals = getApprovals(paper);
        if (paper.isFinalized) {
            return <Badge variant="success">Finalized</Badge>;
        }
        if (approvals.deanApproved) {
            return <Badge variant="warning">Dean Approved</Badge>;
        }
        if (paper.status === "GENERATED") {
            return <Badge variant="default">Generated</Badge>;
        }
        return <Badge variant="default">{paper.status}</Badge>;
    };

    if (isLoading) {
        return (
            <div className="container mx-auto py-6 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="container mx-auto py-6 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold">Question Papers</h1>
                    <p className="text-muted-foreground">
                        View, manage, and finalize generated question papers
                    </p>
                </div>
                <Button onClick={() => router.push("/coe/dashboard/generate-paper")}>
                    <Plus className="mr-2 h-4 w-4" />
                    Generate New Paper
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <CardHeader>
                    <CardTitle>Filters</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="courseFilter">Course</Label>
                            <Select value={courseFilter} onValueChange={setCourseFilter}>
                                <SelectTrigger id="courseFilter">
                                    <SelectValue placeholder="All courses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL_COURSES}>All Courses</SelectItem>
                                    {courses.map((course: { id: string; course_code: string; name: string }) => (
                                        <SelectItem key={course.id} value={course.id}>
                                            {course.course_code} - {course.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="statusFilter">Status</Label>
                            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as PaperStatus | typeof ALL_STATUSES)}>
                                <SelectTrigger id="statusFilter">
                                    <SelectValue placeholder="All statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL_STATUSES}>All Statuses</SelectItem>
                                    <SelectItem value="DRAFT">Draft</SelectItem>
                                    <SelectItem value="GENERATED">Generated</SelectItem>
                                    <SelectItem value="FINALIZED">Finalized</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Papers List */}
            {!papers || papers.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground mb-4">
                            No question papers found
                        </p>
                        <Button onClick={() => router.push("/coe/dashboard/generate-paper")}>
                            <Plus className="mr-2 h-4 w-4" />
                            Generate Your First Paper
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {papers.map((paper: Paper) => (
                        <Card key={paper.id}>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle>{paper.paperCode}</CardTitle>
                                        <CardDescription>
                                            {paper.pattern.course.course_code} -{" "}
                                            {paper.pattern.course.name}
                                        </CardDescription>
                                    </div>
                                    {getStatusBadge(paper)}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Paper Details */}
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

                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Exam Type</p>
                                        <p className="font-medium">{paper.pattern.examType}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Total Marks</p>
                                        <p className="font-medium">{paper.pattern.totalMarks}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Generated</p>
                                        <p className="font-medium">
                                            {paper.generatedAt ? new Date(paper.generatedAt).toLocaleDateString() : "N/A"}
                                        </p>
                                    </div>
                                </div>

                                {paper.finalizedAt && (
                                    <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                                        <CheckCircle className="h-5 w-5 text-green-600" />
                                        <div>
                                            <p className="text-sm font-medium text-green-900 dark:text-green-100">
                                                Paper Finalized
                                            </p>
                                            <p className="text-xs text-green-700 dark:text-green-300">
                                                {new Date(paper.finalizedAt).toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {!paper.isFinalized && getApprovals(paper).deanApproved && (
                                    <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                                        <CheckCircle className="h-5 w-5 text-blue-600" />
                                        <div>
                                            <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                                                Dean Approved
                                            </p>
                                            <p className="text-xs text-blue-700 dark:text-blue-300">
                                                Awaiting COE final approval
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        onClick={() => router.push(`/coe/dashboard/paper/${paper.id}`)}
                                    >
                                        <Eye className="mr-2 h-4 w-4" />
                                        View Paper
                                    </Button>

                                    {!paper.isFinalized && (
                                        <>
                                            {currentRole === "DEAN" && !getApprovals(paper).deanApproved && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleApproveByDean(paper.id)}
                                                    disabled={approveByDeanMutation.isPending}
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

                                            {currentRole === "CONTROLLER_OF_EXAMINATION" && getApprovals(paper).deanApproved && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleFinalize(paper.id)}
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

                                            {currentRole === "CONTROLLER_OF_EXAMINATION" && (
                                                <Button
                                                    size="sm"
                                                    variant="destructive"
                                                    onClick={() => setPaperToDelete(paper.id)}
                                                >
                                                    <Trash2 className="mr-2 h-4 w-4" />
                                                    Delete
                                                </Button>
                                            )}
                                        </>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!paperToDelete} onOpenChange={() => setPaperToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Question Paper</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this paper? This action cannot be
                            undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive text-destructive-foreground"
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
