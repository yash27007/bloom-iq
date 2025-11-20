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
    generatedAt: Date;
    finalizedAt: Date | null;
    pattern: {
        patternName: string;
        academicYear: string;
        semester: string;
        examType: string;
        totalMarks: number;
        course: {
            course_code: string;
            name: string;
        };
    };
}

export default function ViewPapersPage() {
    const router = useRouter();
    const [courseFilter, setCourseFilter] = useState<string>("");
    const [statusFilter, setStatusFilter] = useState<string>("");
    const [paperToDelete, setPaperToDelete] = useState<string | null>(null);

    const utils = trpc.useUtils();

    // Get papers
    const { data: papers, isLoading } = trpc.paper.getPapers.useQuery({
        courseId: courseFilter || undefined,
        status: statusFilter || undefined,
    });

    // Get courses (for filter)
    const { data: coursesData } = trpc.coordinator.getCoursesForMaterialUpload.useQuery();
    const courses = coursesData || [];

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

    const handleDelete = () => {
        if (paperToDelete) {
            deleteMutation.mutate({ paperId: paperToDelete });
        }
    };

    const getStatusBadge = (paper: Paper) => {
        if (paper.isFinalized) {
            return <Badge variant="success">Finalized</Badge>;
        }
        if (paper.status === "GENERATED") {
            return <Badge variant="warning">Draft</Badge>;
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
                                    <SelectItem value="">All Courses</SelectItem>
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
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger id="statusFilter">
                                    <SelectValue placeholder="All statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">All Statuses</SelectItem>
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
                                        <p className="font-medium">Semester {paper.pattern.semester}</p>
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
                                            {new Date(paper.generatedAt).toLocaleDateString()}
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
                                                        Finalize
                                                    </>
                                                )}
                                            </Button>

                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => setPaperToDelete(paper.id)}
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" />
                                                Delete
                                            </Button>
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
