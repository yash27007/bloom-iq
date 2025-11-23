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
import { Input } from "@/components/ui/input";
import { Loader2, FileText, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface ApprovedPattern {
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
    course: {
        id: string;
        course_code: string;
        name: string;
    };
}

export default function GeneratePaperPage() {
    const router = useRouter();
    const [selectedPatternId, setSelectedPatternId] = useState("");
    const [setVariant, setSetVariant] = useState("SET-A");

    // Get approved patterns
    const { data: patterns, isLoading } = trpc.pattern.getApprovedPatterns.useQuery();

    // Get pattern details
    const { data: selectedPattern } = trpc.pattern.getPatternById.useQuery(
        { patternId: selectedPatternId },
        { enabled: !!selectedPatternId }
    );

    // Generate paper mutation
    const generateMutation = trpc.paper.generatePaper.useMutation({
        onSuccess: (data: { paperId?: string }) => {
            toast.success("Question paper generated successfully!");
            if (data.paperId) {
                router.push(`/coe/dashboard/paper/${data.paperId}`);
            } else {
                router.push("/coe/dashboard/view-papers");
            }
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message || "Failed to generate paper");
        },
    });

    const handleGenerate = () => {
        if (!selectedPatternId) {
            toast.error("Please select a pattern");
            return;
        }

        generateMutation.mutate({
            patternId: selectedPatternId,
            setVariant,
        });
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
                <h1 className="text-3xl font-bold">Generate Question Paper</h1>
                <p className="text-muted-foreground">
                    Generate final question papers from approved patterns
                </p>
            </div>

            {/* Check if there are approved patterns */}
            {!patterns || patterns.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">
                            No approved patterns available for paper generation
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-6">
                    {/* Pattern Selection */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Select Pattern</CardTitle>
                            <CardDescription>
                                Choose an approved pattern to generate question paper
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="pattern">Approved Pattern *</Label>
                                <Select
                                    value={selectedPatternId}
                                    onValueChange={setSelectedPatternId}
                                >
                                    <SelectTrigger id="pattern">
                                        <SelectValue placeholder="Select pattern" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {patterns.map((pattern: ApprovedPattern) => (
                                            <SelectItem key={pattern.id} value={pattern.id}>
                                                {pattern.course.course_code} - {pattern.patternName} (
                                                {pattern.academicYear}, Sem {pattern.semester})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="setVariant">Set Variant *</Label>
                                <Input
                                    id="setVariant"
                                    value={setVariant}
                                    onChange={(e) => setSetVariant(e.target.value.toUpperCase())}
                                    placeholder="SET-A"
                                    maxLength={20}
                                />
                                <p className="text-xs text-muted-foreground">
                                    e.g., SET-A, SET-B, SET-C
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Pattern Preview */}
                    {selectedPattern && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Pattern Preview</CardTitle>
                                <CardDescription>
                                    Review pattern details before generation
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Course</p>
                                        <p className="font-medium">
                                            {selectedPattern.course.course_code}
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Academic Year</p>
                                        <p className="font-medium">{selectedPattern.academicYear}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Semester</p>
                                        <p className="font-medium">Semester {selectedPattern.semester}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Exam Type</p>
                                        <p className="font-medium">{selectedPattern.examType}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                                    <div>
                                        <p className="text-sm text-muted-foreground">Part A</p>
                                        <p className="font-medium">
                                            {selectedPattern.partA_count} questions × {selectedPattern.partA_marksEach} marks
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Total: {selectedPattern.partA_count * selectedPattern.partA_marksEach} marks
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Part B</p>
                                        <p className="font-medium">
                                            {selectedPattern.partB_count} questions × {selectedPattern.partB_marksEach} marks
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Total: {selectedPattern.partB_count * selectedPattern.partB_marksEach} marks
                                        </p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-muted-foreground">Total Marks</p>
                                        <p className="font-bold text-2xl">{selectedPattern.totalMarks}</p>
                                        <p className="text-xs text-muted-foreground">
                                            Duration: {selectedPattern.duration} mins
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                                    <CheckCircle className="h-5 w-5 text-green-600" />
                                    <div>
                                        <p className="text-sm font-medium text-green-900 dark:text-green-100">
                                            Pattern Fully Approved
                                        </p>
                                        <p className="text-xs text-green-700 dark:text-green-300">
                                            Approved by MC, PC, and COE
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Important Notes */}
                    <Card className="border-orange-200 dark:border-orange-900">
                        <CardHeader>
                            <CardTitle className="text-orange-900 dark:text-orange-100">
                                Important Notes
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <ul className="list-disc list-inside space-y-1 text-sm">
                                <li>
                                    Questions will be randomly selected from the approved question bank
                                </li>
                                <li>
                                    The system will ensure questions match the required marks distribution
                                </li>
                                <li>
                                    A unique paper code will be generated automatically
                                </li>
                                <li>
                                    Both question paper and answer key will be generated
                                </li>
                                <li>
                                    You can preview and finalize the paper after generation
                                </li>
                            </ul>
                        </CardContent>
                    </Card>

                    {/* Actions */}
                    <div className="flex gap-4">
                        <Button
                            onClick={handleGenerate}
                            disabled={!selectedPatternId || generateMutation.isPending}
                            size="lg"
                        >
                            {generateMutation.isPending ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Generating Paper...
                                </>
                            ) : (
                                <>
                                    <FileText className="mr-2 h-5 w-5" />
                                    Generate Question Paper
                                </>
                            )}
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => router.push("/coe/dashboard/view-papers")}
                            size="lg"
                        >
                            View All Papers
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
