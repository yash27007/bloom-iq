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
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Loader2,
    Plus,
    Eye,
    CheckCircle,
    XCircle,
    Clock,
} from "lucide-react";
import { useRouter } from "next/navigation";

interface Pattern {
    id: string;
    patternName: string;
    academicYear: string;
    semester: string;
    examType: string;
    partA_count: number;
    partA_marksEach: number;
    partB_count: number;
    partB_marksEach: number;
    totalMarks: number;
    duration: number;
    status: string;
    mcApproved: boolean;
    pcApproved: boolean;
    coeApproved: boolean;
    createdAt: Date;
    course: {
        course_code: string;
        name: string;
    };
    mcRemarks?: string | null;
    pcRemarks?: string | null;
    coeRemarks?: string | null;
}

export default function PatternsListPage() {
    const router = useRouter();
    const [selectedCourseId, setSelectedCourseId] = useState("");
    const [selectedStatus, setSelectedStatus] = useState("");
    const [selectedPattern, setSelectedPattern] = useState<Pattern | null>(null);
    const [showDetailsDialog, setShowDetailsDialog] = useState(false);

    // Get user's courses
    const { data: coursesData } = trpc.coordinator.getCoursesForMaterialUpload.useQuery();
    const courses = coursesData || [];

    // Get patterns
    const { data: patterns, isLoading } = trpc.pattern.getPatterns.useQuery({
        courseId: selectedCourseId || undefined,
        status: selectedStatus || undefined,
    });

    const getStatusBadge = (status: string) => {
        if (status === "APPROVED") {
            return (
                <Badge variant="success">
                    <CheckCircle className="mr-1 h-3 w-3" />
                    Approved
                </Badge>
            );
        }
        if (status === "REJECTED") {
            return (
                <Badge variant="destructive">
                    <XCircle className="mr-1 h-3 w-3" />
                    Rejected
                </Badge>
            );
        }
        if (status.includes("PENDING")) {
            return (
                <Badge variant="warning">
                    <Clock className="mr-1 h-3 w-3" />
                    {status.replace("PENDING_", "").replace("_", " ")}
                </Badge>
            );
        }
        return <Badge>{status}</Badge>;
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
                    <h1 className="text-3xl font-bold">Question Paper Patterns</h1>
                    <p className="text-muted-foreground">
                        View and manage question paper patterns
                    </p>
                </div>
                <Button onClick={() => router.push("/coordinator/dashboard/question-paper/create-pattern")}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Pattern
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
                            <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
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
                            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                                <SelectTrigger id="statusFilter">
                                    <SelectValue placeholder="All statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">All Statuses</SelectItem>
                                    <SelectItem value="PENDING_MC_APPROVAL">Pending MC</SelectItem>
                                    <SelectItem value="PENDING_PC_APPROVAL">Pending PC</SelectItem>
                                    <SelectItem value="PENDING_COE_APPROVAL">Pending COE</SelectItem>
                                    <SelectItem value="APPROVED">Approved</SelectItem>
                                    <SelectItem value="REJECTED">Rejected</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Patterns List */}
            {!patterns || patterns.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <p className="text-muted-foreground mb-4">No patterns found</p>
                        <Button onClick={() => router.push("/coordinator/dashboard/question-paper/create-pattern")}>
                            <Plus className="mr-2 h-4 w-4" />
                            Create Your First Pattern
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4">
                    {patterns.map((pattern: Pattern) => (
                        <Card key={pattern.id}>
                            <CardHeader>
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle>{pattern.patternName}</CardTitle>
                                        <CardDescription>
                                            {pattern.course.course_code} - {pattern.course.name}
                                        </CardDescription>
                                    </div>
                                    {getStatusBadge(pattern.status)}
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Pattern Details */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Academic Year</p>
                                        <p className="font-medium">{pattern.academicYear}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Semester</p>
                                        <p className="font-medium">Semester {pattern.semester}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Exam Type</p>
                                        <p className="font-medium">{pattern.examType}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Total Marks</p>
                                        <p className="font-medium">{pattern.totalMarks}</p>
                                    </div>
                                </div>

                                {/* Approval Timeline */}
                                <div className="flex items-center gap-4 text-sm">
                                    <div className="flex items-center gap-2">
                                        {pattern.mcApproved ? (
                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                        ) : (
                                            <div className="h-4 w-4 rounded-full border-2 border-muted" />
                                        )}
                                        <span className={pattern.mcApproved ? "text-green-600" : ""}>
                                            MC
                                        </span>
                                    </div>
                                    <div className="flex-1 border-t" />
                                    <div className="flex items-center gap-2">
                                        {pattern.pcApproved ? (
                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                        ) : (
                                            <div className="h-4 w-4 rounded-full border-2 border-muted" />
                                        )}
                                        <span className={pattern.pcApproved ? "text-green-600" : ""}>
                                            PC
                                        </span>
                                    </div>
                                    <div className="flex-1 border-t" />
                                    <div className="flex items-center gap-2">
                                        {pattern.coeApproved ? (
                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                        ) : (
                                            <div className="h-4 w-4 rounded-full border-2 border-muted" />
                                        )}
                                        <span className={pattern.coeApproved ? "text-green-600" : ""}>
                                            COE
                                        </span>
                                    </div>
                                </div>

                                {/* Rejection Remarks */}
                                {pattern.status === "REJECTED" && (
                                    <div className="p-3 bg-destructive/10 rounded-lg">
                                        <p className="text-sm font-medium text-destructive">
                                            Rejected
                                        </p>
                                        {pattern.mcRemarks && (
                                            <p className="text-sm mt-1">
                                                <strong>MC:</strong> {pattern.mcRemarks}
                                            </p>
                                        )}
                                        {pattern.pcRemarks && (
                                            <p className="text-sm mt-1">
                                                <strong>PC:</strong> {pattern.pcRemarks}
                                            </p>
                                        )}
                                        {pattern.coeRemarks && (
                                            <p className="text-sm mt-1">
                                                <strong>COE:</strong> {pattern.coeRemarks}
                                            </p>
                                        )}
                                    </div>
                                )}

                                {/* Actions */}
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            setSelectedPattern(pattern);
                                            setShowDetailsDialog(true);
                                        }}
                                    >
                                        <Eye className="mr-2 h-4 w-4" />
                                        View Details
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Details Dialog */}
            <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Pattern Details</DialogTitle>
                    </DialogHeader>
                    {selectedPattern && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Pattern Name</Label>
                                    <p className="text-sm">{selectedPattern.patternName}</p>
                                </div>
                                <div>
                                    <Label>Course</Label>
                                    <p className="text-sm">
                                        {selectedPattern.course.course_code} -{" "}
                                        {selectedPattern.course.name}
                                    </p>
                                </div>
                                <div>
                                    <Label>Academic Year</Label>
                                    <p className="text-sm">{selectedPattern.academicYear}</p>
                                </div>
                                <div>
                                    <Label>Semester</Label>
                                    <p className="text-sm">Semester {selectedPattern.semester}</p>
                                </div>
                                <div>
                                    <Label>Exam Type</Label>
                                    <p className="text-sm">{selectedPattern.examType}</p>
                                </div>
                                <div>
                                    <Label>Duration</Label>
                                    <p className="text-sm">{selectedPattern.duration} minutes</p>
                                </div>
                            </div>

                            <div>
                                <Label>Part A Configuration</Label>
                                <p className="text-sm">
                                    {selectedPattern.partA_count} questions ×{" "}
                                    {selectedPattern.partA_marksEach} marks ={" "}
                                    {selectedPattern.partA_count * selectedPattern.partA_marksEach}{" "}
                                    marks
                                </p>
                            </div>

                            <div>
                                <Label>Part B Configuration</Label>
                                <p className="text-sm">
                                    {selectedPattern.partB_count} questions ×{" "}
                                    {selectedPattern.partB_marksEach} marks ={" "}
                                    {selectedPattern.partB_count * selectedPattern.partB_marksEach}{" "}
                                    marks
                                </p>
                            </div>

                            <div>
                                <Label>Total Marks</Label>
                                <p className="text-sm font-bold">{selectedPattern.totalMarks}</p>
                            </div>

                            <div>
                                <Label>Instructions</Label>
                                <p className="text-sm whitespace-pre-wrap">
                                    {selectedPattern.instructions}
                                </p>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowDetailsDialog(false)}
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
