"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { CheckCircle, XCircle, Eye, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
    instructions: string;
    status: string;
    mcApproved: boolean;
    pcApproved: boolean;
    coeApproved: boolean;
    createdAt: Date;
    course: {
        course_code: string;
        name: string;
    };
}

export default function ApprovePatterns() {
    const [selectedPattern, setSelectedPattern] = useState<Pattern | null>(null);
    const [showViewDialog, setShowViewDialog] = useState(false);
    const [showApproveDialog, setShowApproveDialog] = useState(false);
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [remarks, setRemarks] = useState("");

    const utils = trpc.useUtils();

    // Get pending approvals
    const { data: patterns, isLoading } = trpc.pattern.getPendingApprovals.useQuery();

    // Approve mutation
    const approveMutation = trpc.pattern.approvePattern.useMutation({
        onSuccess: () => {
            toast.success("Pattern approved successfully");
            setShowApproveDialog(false);
            setSelectedPattern(null);
            utils.pattern.getPendingApprovals.invalidate();
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message || "Failed to approve pattern");
        },
    });

    // Reject mutation
    const rejectMutation = trpc.pattern.rejectPattern.useMutation({
        onSuccess: () => {
            toast.success("Pattern rejected");
            setShowRejectDialog(false);
            setSelectedPattern(null);
            setRemarks("");
            utils.pattern.getPendingApprovals.invalidate();
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message || "Failed to reject pattern");
        },
    });

    const handleApprove = () => {
        if (!selectedPattern) return;
        approveMutation.mutate({ patternId: selectedPattern.id });
    };

    const handleReject = () => {
        if (!selectedPattern || !remarks.trim() || remarks.length < 10) {
            toast.error("Please provide rejection remarks (minimum 10 characters)");
            return;
        }
        rejectMutation.mutate({
            patternId: selectedPattern.id,
            remarks: remarks.trim(),
        });
    };

    const getApprovalStatus = (pattern: Pattern) => {
        if (pattern.status === "PENDING_MC_APPROVAL") return "Pending MC Approval";
        if (pattern.status === "PENDING_PC_APPROVAL") return "Pending PC Approval";
        if (pattern.status === "PENDING_COE_APPROVAL") return "Pending COE Approval";
        if (pattern.status === "APPROVED") return "Approved";
        if (pattern.status === "REJECTED") return "Rejected";
        return pattern.status;
    };

    const getApprovalBadgeVariant = (status: string) => {
        if (status.includes("PENDING")) return "warning" as const;
        if (status === "APPROVED") return "success" as const;
        if (status === "REJECTED") return "destructive" as const;
        return "default" as const;
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
            <div>
                <h1 className="text-3xl font-bold">Approve Question Paper Patterns</h1>
                <p className="text-muted-foreground">
                    Review and approve patterns pending your approval
                </p>
            </div>

            {/* Patterns List */}
            {!patterns || patterns.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <p className="text-muted-foreground">
                            No patterns pending your approval
                        </p>
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
                                    <Badge variant={getApprovalBadgeVariant(pattern.status)}>
                                        {getApprovalStatus(pattern)}
                                    </Badge>
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
                                        <p className="text-sm text-muted-foreground">Duration</p>
                                        <p className="font-medium">{pattern.duration} mins</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Part A</p>
                                        <p className="font-medium">
                                            {pattern.partA_count} × {pattern.partA_marksEach} marks
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Part B</p>
                                        <p className="font-medium">
                                            {pattern.partB_count} × {pattern.partB_marksEach} marks
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Total Marks</p>
                                        <p className="font-medium text-lg">{pattern.totalMarks}</p>
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

                                {/* Actions */}
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            setSelectedPattern(pattern);
                                            setShowViewDialog(true);
                                        }}
                                    >
                                        <Eye className="mr-2 h-4 w-4" />
                                        View Details
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            setSelectedPattern(pattern);
                                            setShowApproveDialog(true);
                                        }}
                                    >
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        Approve
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => {
                                            setSelectedPattern(pattern);
                                            setShowRejectDialog(true);
                                        }}
                                    >
                                        <XCircle className="mr-2 h-4 w-4" />
                                        Reject
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* View Details Dialog */}
            <Dialog open={showViewDialog} onOpenChange={setShowViewDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Pattern Details</DialogTitle>
                        <DialogDescription>
                            {selectedPattern?.patternName}
                        </DialogDescription>
                    </DialogHeader>
                    {selectedPattern && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
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
                                <div>
                                    <Label>Total Marks</Label>
                                    <p className="text-sm font-bold">{selectedPattern.totalMarks}</p>
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
                                <Label>Instructions</Label>
                                <p className="text-sm whitespace-pre-wrap">
                                    {selectedPattern.instructions}
                                </p>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setShowViewDialog(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Approve Dialog */}
            <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Approve Pattern</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to approve this pattern? It will be forwarded
                            to the next level of approval.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setShowApproveDialog(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleApprove}
                            disabled={approveMutation.isPending}
                        >
                            {approveMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Approving...
                                </>
                            ) : (
                                "Approve"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject Dialog */}
            <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Pattern</DialogTitle>
                        <DialogDescription>
                            Please provide a reason for rejecting this pattern
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="remarks">Remarks *</Label>
                            <Textarea
                                id="remarks"
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                placeholder="Enter reason for rejection (minimum 10 characters)"
                                rows={4}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => {
                                setShowRejectDialog(false);
                                setRemarks("");
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleReject}
                            disabled={rejectMutation.isPending || remarks.length < 10}
                        >
                            {rejectMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Rejecting...
                                </>
                            ) : (
                                "Reject"
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
