"use client";

import { Fragment, useRef, useState } from "react";
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
    Pencil,
    Trash2,
    CheckCircle,
    XCircle,
    Clock,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { openProfessionalPrintWindow } from "@/lib/print-utils";

// Pattern interface matches getPatterns return type
interface Pattern {
    id: string;
    patternName: string;
    academicYear: string;
    semesterType: string;
    examType: string;
    totalMarks: number;
    duration: number;
    status: string;
    mcApproved: boolean;
    pcApproved: boolean;
    createdAt: Date;
    course: {
        id: string;
        course_code: string;
        name: string;
        department?: {
            id: string;
            name: string;
            code: string;
        } | null;
    };
    instructions?: string | null;
    mcRemarks?: string | null;
    pcRemarks?: string | null;
    partAStructure?: unknown;
    partBStructure?: unknown;
}

type PatternStatus = "DRAFT" | "PENDING_MC_APPROVAL" | "PENDING_PC_APPROVAL" | "APPROVED" | "REJECTED";
const ALL_COURSES = "ALL_COURSES";
const ALL_STATUSES = "ALL_STATUSES";
const HEADER_META_PREFIX = "[[BLOOMIQ_HEADER_META]]";
const BLOOM_LABELS: Record<string, string> = {
    REMEMBER: "Remember",
    UNDERSTAND: "Understand",
    APPLY: "Apply",
    ANALYZE: "Analyze",
    EVALUATE: "Evaluate",
    CREATE: "Create",
};

interface PartAQuestionSlot {
    questionNumber: number;
    marks: number;
    bloomLevel: string;
    units: number[];
}

interface PartBQuestionSlot {
    marks: number;
    bloomLevel?: string;
    units?: number[];
}

interface PartBOption {
    optionLabel: string;
    questionSlot: PartBQuestionSlot;
}

interface PartBQuestionGroup {
    groupNumber: number;
    hasOR: boolean;
    options?: PartBOption[];
    questionSlot?: PartBQuestionSlot;
}

function decodeInstructionsWithMeta(raw?: string | null) {
    if (!raw) {
        return {
            degreeYearSem: "",
            dateSession: "",
            instructions: "",
        };
    }

    if (!raw.startsWith(HEADER_META_PREFIX)) {
        return {
            degreeYearSem: "",
            dateSession: "",
            instructions: raw,
        };
    }

    try {
        const parsed = JSON.parse(raw.slice(HEADER_META_PREFIX.length)) as {
            degreeYearSem?: string;
            dateSession?: string;
            instructions?: string;
        };

        return {
            degreeYearSem: parsed.degreeYearSem || "",
            dateSession: parsed.dateSession || "",
            instructions: parsed.instructions || "",
        };
    } catch {
        return {
            degreeYearSem: "",
            dateSession: "",
            instructions: raw,
        };
    }
}

export default function PatternsListPage() {
    const router = useRouter();
    const previewRef = useRef<HTMLDivElement>(null);
    const [selectedCourseId, setSelectedCourseId] = useState(ALL_COURSES);
    const [selectedStatus, setSelectedStatus] = useState<PatternStatus | typeof ALL_STATUSES>(ALL_STATUSES);
    const [selectedPattern, setSelectedPattern] = useState<Pattern | null>(null);
    const [showDetailsDialog, setShowDetailsDialog] = useState(false);

    // Get user's courses
    const { data: coursesData } = trpc.coordinator.getCoursesForMaterialUpload.useQuery();
    const courses = coursesData || [];

    // Get patterns
    const { data: patternsData, isLoading } = trpc.pattern.getPatterns.useQuery({
        courseId: selectedCourseId === ALL_COURSES ? undefined : selectedCourseId,
        status: selectedStatus === ALL_STATUSES ? undefined : (selectedStatus as PatternStatus),
    });
    const { data: pendingApprovalsData } = trpc.pattern.getPendingApprovals.useQuery();
    const patterns = patternsData?.patterns || [];
    const pendingApprovalIds = new Set((pendingApprovalsData?.patterns || []).map((p) => p.id));
    const selectedPatternMeta = decodeInstructionsWithMeta(selectedPattern?.instructions || "");
    const selectedPartA = (selectedPattern?.partAStructure as PartAQuestionSlot[] | undefined) || [];
    const selectedPartB = (selectedPattern?.partBStructure as PartBQuestionGroup[] | undefined) || [];

    const handlePrintPreview = () => {
        if (!previewRef.current) {
            toast.error("Preview is not ready for printing.");
            return;
        }

        const result = openProfessionalPrintWindow({
            title: "Question Paper Pattern Preview",
            html: previewRef.current.innerHTML,
        });

        if (!result.ok) {
            toast.error(result.error);
        }
    };

    const utils = trpc.useUtils();
    const deletePatternMutation = trpc.pattern.deletePattern.useMutation({
        onSuccess: () => {
            toast.success("Pattern deleted successfully");
            utils.pattern.getPatterns.invalidate();
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message || "Failed to delete pattern");
        },
    });

    const approvePatternMutation = trpc.pattern.approvePattern.useMutation({
        onSuccess: () => {
            toast.success("Pattern approved successfully");
            utils.pattern.getPatterns.invalidate();
            utils.pattern.getPendingApprovals.invalidate();
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message || "Failed to approve pattern");
        },
    });

    const handleDeletePattern = async (pattern: Pattern) => {
        const confirmed = window.confirm(
            `Delete pattern "${pattern.patternName}"? This cannot be undone.`
        );
        if (!confirmed) return;

        try {
            await deletePatternMutation.mutateAsync({ id: pattern.id });
        } catch {
            // Error toast handled in onError callback.
        }
    };

    const handleApprovePattern = async (pattern: Pattern) => {
        try {
            await approvePatternMutation.mutateAsync({ patternId: pattern.id });
        } catch {
            // Error handled by onError callback.
        }
    };

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
                            <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as PatternStatus | typeof ALL_STATUSES)}>
                                <SelectTrigger id="statusFilter">
                                    <SelectValue placeholder="All statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL_STATUSES}>All Statuses</SelectItem>
                                    <SelectItem value="PENDING_MC_APPROVAL">Pending MC</SelectItem>
                                    <SelectItem value="PENDING_PC_APPROVAL">Pending PC</SelectItem>
                                    <SelectItem value="APPROVED">Approved</SelectItem>
                                    <SelectItem value="REJECTED">Rejected</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Patterns List */}
            {patterns.length === 0 ? (
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
                                        <p className="font-medium">{pattern.semesterType}</p>
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
                                        {pattern.status === "APPROVED" ? (
                                            <CheckCircle className="h-4 w-4 text-green-600" />
                                        ) : (
                                            <div className="h-4 w-4 rounded-full border-2 border-muted" />
                                        )}
                                        <span className={pattern.status === "APPROVED" ? "text-green-600" : ""}>
                                            Approved
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
                                    {pendingApprovalIds.has(pattern.id) && (
                                        <Button
                                            size="sm"
                                            onClick={() => handleApprovePattern(pattern)}
                                            disabled={approvePatternMutation.isPending}
                                        >
                                            {approvePatternMutation.isPending ? (
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            ) : (
                                                <CheckCircle className="mr-2 h-4 w-4" />
                                            )}
                                            Approve
                                        </Button>
                                    )}
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => router.push(`/coordinator/dashboard/question-paper/create-pattern?patternId=${pattern.id}`)}
                                    >
                                        <Pencil className="mr-2 h-4 w-4" />
                                        Edit
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => handleDeletePattern(pattern)}
                                        disabled={deletePatternMutation.isPending}
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Details Dialog */}
            <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
                <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Pattern Preview</DialogTitle>
                    </DialogHeader>
                    {selectedPattern && (
                        <div className="space-y-4" ref={previewRef}>
                            <div className="text-center space-y-1">
                                <p className="font-bold uppercase">KALASALINGAM ACADEMY OF RESEARCH AND EDUCATION (Deemed to be University)</p>
                                <p className="font-semibold uppercase">{selectedPattern.course.department?.name || "Department of Computer Science and Engineering"}</p>
                                <p className="font-semibold">
                                    {selectedPattern.examType === "SESSIONAL_1"
                                        ? "SESSIONAL EXAMINATION-I"
                                        : selectedPattern.examType === "SESSIONAL_2"
                                            ? "SESSIONAL EXAMINATION-II"
                                            : "END SEMESTER EXAMINATION"}
                                </p>
                            </div>

                            <table className="w-full border border-border border-collapse">
                                <tbody>
                                    <tr>
                                        <td className="border border-border px-2 py-1 font-medium">Course Code</td>
                                        <td className="border border-border px-2 py-1">{selectedPattern.course.course_code}</td>
                                        <td className="border border-border px-2 py-1 font-medium">Duration</td>
                                        <td className="border border-border px-2 py-1">{selectedPattern.duration} Minutes</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-border px-2 py-1 font-medium">Course Name</td>
                                        <td className="border border-border px-2 py-1">{selectedPattern.course.name}</td>
                                        <td className="border border-border px-2 py-1 font-medium">Max. Marks</td>
                                        <td className="border border-border px-2 py-1">{selectedPattern.totalMarks}</td>
                                    </tr>
                                    <tr>
                                        <td className="border border-border px-2 py-1 font-medium">Degree / Year / Sem</td>
                                        <td className="border border-border px-2 py-1">{selectedPatternMeta.degreeYearSem || "B.Tech. / I / ODD"}</td>
                                        <td className="border border-border px-2 py-1 font-medium">Date & Session</td>
                                        <td className="border border-border px-2 py-1">{selectedPatternMeta.dateSession || "To be set during paper generation"}</td>
                                    </tr>
                                </tbody>
                            </table>

                            <div>
                                <h3 className="font-semibold">PART - A ({selectedPartA.length} × 2 = {selectedPartA.length * 2} Marks)</h3>
                                <table className="w-full border border-border border-collapse mt-2">
                                    <colgroup>
                                        <col style={{ width: "8%" }} />
                                        <col style={{ width: "64%" }} />
                                        <col style={{ width: "14%" }} />
                                        <col style={{ width: "8%" }} />
                                        <col style={{ width: "6%" }} />
                                    </colgroup>
                                    <thead>
                                        <tr>
                                            <th className="border border-border px-2 py-1 text-left">Question Number</th>
                                            <th className="border border-border px-2 py-1 text-left">Question Text</th>
                                            <th className="border border-border px-2 py-1 text-left">Pattern</th>
                                            <th className="border border-border px-2 py-1 text-left">Mapping COs</th>
                                            <th className="border border-border px-2 py-1 text-left">Marks</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedPartA.map((q) => (
                                            <tr key={`preview-parta-${q.questionNumber}`}>
                                                <td className="border border-border px-2 py-1">{q.questionNumber}</td>
                                                <td className="border border-border px-2 py-1">Configured from question bank</td>
                                                <td className="border border-border px-2 py-1">{BLOOM_LABELS[q.bloomLevel] || q.bloomLevel}</td>
                                                <td className="border border-border px-2 py-1">CO{q.units?.[0] || 1}</td>
                                                <td className="border border-border px-2 py-1">{q.marks}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div>
                                <h3 className="font-semibold">PART - B</h3>
                                <table className="w-full border border-border border-collapse mt-2">
                                    <colgroup>
                                        <col style={{ width: "8%" }} />
                                        <col style={{ width: "64%" }} />
                                        <col style={{ width: "14%" }} />
                                        <col style={{ width: "8%" }} />
                                        <col style={{ width: "6%" }} />
                                    </colgroup>
                                    <thead>
                                        <tr>
                                            <th className="border border-border px-2 py-1 text-left">Question Number</th>
                                            <th className="border border-border px-2 py-1 text-left">Question Text</th>
                                            <th className="border border-border px-2 py-1 text-left">Pattern</th>
                                            <th className="border border-border px-2 py-1 text-left">Mapping COs</th>
                                            <th className="border border-border px-2 py-1 text-left">Marks</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedPartB.map((group) => {
                                            if (group.hasOR && group.options && group.options.length > 0) {
                                                return group.options.map((option, optionIndex) => {
                                                    const slot = option.questionSlot;
                                                    return (
                                                        <Fragment key={`preview-partb-${group.groupNumber}-${option.optionLabel}-${optionIndex}`}>
                                                            {optionIndex > 0 && (
                                                                <tr>
                                                                    <td colSpan={5} className="border border-border px-2 py-1 text-center font-semibold">
                                                                        OR
                                                                    </td>
                                                                </tr>
                                                            )}
                                                            <tr>
                                                                <td className="border border-border px-2 py-1">{group.groupNumber}{option.optionLabel}</td>
                                                                <td className="border border-border px-2 py-1">Configured from question bank</td>
                                                                <td className="border border-border px-2 py-1">{BLOOM_LABELS[slot.bloomLevel || "APPLY"] || slot.bloomLevel || "Apply"}</td>
                                                                <td className="border border-border px-2 py-1">CO{slot.units?.[0] || 1}</td>
                                                                <td className="border border-border px-2 py-1">{slot.marks}</td>
                                                            </tr>
                                                        </Fragment>
                                                    );
                                                });
                                            }

                                            const slot = group.questionSlot;
                                            if (!slot) return null;

                                            return (
                                                <tr key={`preview-partb-${group.groupNumber}`}>
                                                    <td className="border border-border px-2 py-1">{group.groupNumber}</td>
                                                    <td className="border border-border px-2 py-1">Configured from question bank</td>
                                                    <td className="border border-border px-2 py-1">{BLOOM_LABELS[slot.bloomLevel || "APPLY"] || slot.bloomLevel || "Apply"}</td>
                                                    <td className="border border-border px-2 py-1">CO{slot.units?.[0] || 1}</td>
                                                    <td className="border border-border px-2 py-1">{slot.marks}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div>
                                <Label>Instructions</Label>
                                <p className="text-sm whitespace-pre-wrap">
                                    {selectedPatternMeta.instructions || "-"}
                                </p>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={handlePrintPreview}>
                            Print Preview
                        </Button>
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
