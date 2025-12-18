"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import { Upload, FileText, CheckCircle, AlertCircle, X, Loader2, FileSearch, BookOpen, AlertTriangle } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { trpc } from "@/trpc/client";
import { toast } from "sonner";

interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    courseOutcomes: Array<{ code: string; description: string }>;
    questions: Array<{
        questionNumber: string;
        questionText: string;
        marks: number;
        bloomLevel?: string;
        courseOutcome?: string;
        part?: "A" | "B";
    }>;
    markDistribution: {
        total: number;
        partA: number;
        partB: number;
        expectedTotal: number;
    };
    bloomDistribution: { [key: string]: number };
    coMapping: {
        [coCode: string]: {
            questions: string[];
            totalMarks: number;
        };
    };
    summary: {
        totalQuestions: number;
        totalMarks: number;
        missingCOs: string[];
        unmappedQuestions: number;
    };
}

export default function ValidateQuestionPaperPage() {
    const [selectedCourse, setSelectedCourse] = useState<string>("");
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
    const [validating, setValidating] = useState(false);
    const [syllabusCheck, setSyllabusCheck] = useState<{ exists: boolean; checked: boolean }>({ exists: false, checked: false });

    // tRPC queries
    const { data: courses = [], isLoading: coursesLoading } = trpc.coordinator.getCoursesForMaterialUpload.useQuery();
    
    // Check syllabus existence
    const checkSyllabusMutation = trpc.coordinator.checkSyllabusExists.useMutation({
        onSuccess: (data) => {
            setSyllabusCheck({ exists: data.exists, checked: true });
            if (!data.exists) {
                toast.warning("Syllabus not found. Please upload the syllabus first.");
            }
        },
        onError: (error) => {
            toast.error(error.message || "Failed to check syllabus");
        },
    });

    // Validate question paper
    const validateMutation = trpc.coordinator.validateQuestionPaper.useMutation({
        onSuccess: (result) => {
            setValidationResult(result);
            setValidating(false);
            if (result.isValid) {
                toast.success("Question paper validation completed successfully!");
            } else {
                toast.warning("Question paper validation completed with errors. Please review.");
            }
        },
        onError: (error) => {
            toast.error(error.message || "Failed to validate question paper");
            setValidating(false);
        },
    });

    const uploadFile = useCallback(async (file: File) => {
        if (!selectedCourse) {
            toast.error("Please select a course first");
            return;
        }

        setUploading(true);
        setUploadProgress(0);
        setValidationResult(null);

        try {
            // Check syllabus first - wait for result
            const syllabusCheckResult = await new Promise<{ exists: boolean }>((resolve) => {
                checkSyllabusMutation.mutate(
                    { courseId: selectedCourse },
                    {
                        onSuccess: (data) => {
                            resolve({ exists: data.exists });
                        },
                        onError: () => {
                            resolve({ exists: false });
                        },
                    }
                );
            });
            
            if (!syllabusCheckResult.exists) {
                toast.error("Please upload the syllabus first before validating question papers.");
                setUploading(false);
                return;
            }

            // Upload file
            const formData = new FormData();
            formData.append("file", file);

            const response = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Upload failed");
            }

            const data = await response.json();
            setUploadProgress(100);

            // Validate the uploaded question paper
            setValidating(true);
            validateMutation.mutate({
                courseId: selectedCourse,
                filename: data.filename,
            });
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Upload failed");
            setUploading(false);
            setValidating(false);
        }
    }, [selectedCourse, checkSyllabusMutation, validateMutation]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: (acceptedFiles) => {
            if (acceptedFiles.length > 0) {
                const file = acceptedFiles[0];
                if (file.type !== "application/pdf") {
                    toast.error("Only PDF files are allowed");
                    return;
                }
                uploadFile(file);
            }
        },
        accept: {
            "application/pdf": [".pdf"],
        },
        maxFiles: 1,
        disabled: uploading || validating || !selectedCourse,
    });

    const handleCourseChange = (courseId: string) => {
        setSelectedCourse(courseId);
        setValidationResult(null);
        setSyllabusCheck({ exists: false, checked: false });
        
        // Check syllabus when course is selected
        if (courseId) {
            checkSyllabusMutation.mutate({ courseId });
        }
    };

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold">Validate Question Paper</h1>
                    <p className="text-muted-foreground mt-2">
                        Upload a question paper PDF to validate it against course outcomes, Bloom levels, and mark distribution
                    </p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Upload Section */}
                <Card>
                    <CardHeader>
                        <CardTitle>Upload Question Paper</CardTitle>
                        <CardDescription>
                            Select a course and upload the question paper PDF for validation
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Course Selection */}
                        <div className="space-y-2">
                            <Label htmlFor="course">Select Course</Label>
                            <Select
                                value={selectedCourse}
                                onValueChange={handleCourseChange}
                                disabled={coursesLoading || uploading || validating}
                            >
                                <SelectTrigger id="course">
                                    <SelectValue placeholder="Select a course" />
                                </SelectTrigger>
                                <SelectContent>
                                    {courses.map((course) => (
                                        <SelectItem key={course.id} value={course.id}>
                                            {course.course_code} - {course.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Syllabus Check */}
                        {selectedCourse && syllabusCheck.checked && (
                            <Alert variant={syllabusCheck.exists ? "default" : "destructive"}>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    {syllabusCheck.exists
                                        ? "Syllabus found. You can proceed with validation."
                                        : "Syllabus not found. Please upload the syllabus first from the Upload Material page."}
                                </AlertDescription>
                            </Alert>
                        )}

                        {/* Upload Area */}
                        <div
                            {...getRootProps()}
                            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                                isDragActive
                                    ? "border-primary bg-primary/5"
                                    : "border-muted-foreground/25 hover:border-primary/50"
                            } ${uploading || validating || !selectedCourse ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                            <input {...getInputProps()} />
                            <div className="flex flex-col items-center gap-4">
                                {uploading || validating ? (
                                    <>
                                        <Loader2 className="h-12 w-12 animate-spin text-primary" />
                                        <div className="space-y-2">
                                            <p className="text-sm font-medium">
                                                {uploading ? "Uploading..." : "Validating..."}
                                            </p>
                                            {uploading && (
                                                <Progress value={uploadProgress} className="w-full max-w-xs" />
                                            )}
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <Upload className="h-12 w-12 text-muted-foreground" />
                                        <div className="space-y-2">
                                            <p className="text-sm font-medium">
                                                {isDragActive
                                                    ? "Drop the PDF here"
                                                    : "Drag & drop a PDF file here, or click to select"}
                                            </p>
                                            <p className="text-xs text-muted-foreground">
                                                Only PDF files are accepted
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Validation Results */}
                {validationResult && (
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Validation Results</CardTitle>
                                <Badge variant={validationResult.isValid ? "default" : "destructive"}>
                                    {validationResult.isValid ? "Valid" : "Invalid"}
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Summary */}
                            <div className="space-y-2">
                                <h3 className="font-semibold">Summary</h3>
                                <div className="grid grid-cols-2 gap-2 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">Total Questions:</span>
                                        <span className="ml-2 font-medium">{validationResult.summary.totalQuestions}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Total Marks:</span>
                                        <span className="ml-2 font-medium">{validationResult.summary.totalMarks}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Part A Marks:</span>
                                        <span className="ml-2 font-medium">{validationResult.markDistribution.partA}</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Part B Marks:</span>
                                        <span className="ml-2 font-medium">{validationResult.markDistribution.partB}</span>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Errors */}
                            {validationResult.errors.length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="font-semibold text-destructive flex items-center gap-2">
                                        <AlertCircle className="h-4 w-4" />
                                        Errors ({validationResult.errors.length})
                                    </h3>
                                    <ul className="list-disc list-inside space-y-1 text-sm text-destructive">
                                        {validationResult.errors.map((error, idx) => (
                                            <li key={idx}>{error}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Warnings */}
                            {validationResult.warnings.length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="font-semibold text-yellow-600 flex items-center gap-2">
                                        <AlertTriangle className="h-4 w-4" />
                                        Warnings ({validationResult.warnings.length})
                                    </h3>
                                    <ul className="list-disc list-inside space-y-1 text-sm text-yellow-600">
                                        {validationResult.warnings.map((warning, idx) => (
                                            <li key={idx}>{warning}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}

                            {/* Course Outcomes */}
                            {validationResult.courseOutcomes.length > 0 && (
                                <div className="space-y-2">
                                    <h3 className="font-semibold">Course Outcomes</h3>
                                    <div className="space-y-1 text-sm">
                                        {validationResult.courseOutcomes.map((co) => (
                                            <div key={co.code} className="flex items-start gap-2">
                                                <Badge variant="outline">{co.code}</Badge>
                                                <span className="text-muted-foreground">{co.description}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Detailed Results */}
            {validationResult && (
                <Card>
                    <CardHeader>
                        <CardTitle>Detailed Analysis</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Bloom's Distribution */}
                        {Object.keys(validationResult.bloomDistribution).length > 0 && (
                            <div className="space-y-2">
                                <h3 className="font-semibold">Bloom's Taxonomy Distribution</h3>
                                <div className="grid grid-cols-3 gap-2">
                                    {Object.entries(validationResult.bloomDistribution).map(([level, count]) => (
                                        <div key={level} className="flex items-center justify-between p-2 border rounded">
                                            <span className="text-sm font-medium">{level}</span>
                                            <Badge>{count}</Badge>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <Separator />

                        {/* CO Mapping */}
                        {Object.keys(validationResult.coMapping).length > 0 && (
                            <div className="space-y-2">
                                <h3 className="font-semibold">Course Outcome Mapping</h3>
                                <div className="space-y-2">
                                    {Object.entries(validationResult.coMapping).map(([co, data]) => (
                                        <div key={co} className="p-3 border rounded">
                                            <div className="flex items-center justify-between mb-2">
                                                <Badge>{co}</Badge>
                                                <span className="text-sm text-muted-foreground">
                                                    {data.totalMarks} marks
                                                </span>
                                            </div>
                                            <div className="text-sm text-muted-foreground">
                                                Questions: {data.questions.join(", ")}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <Separator />

                        {/* Questions List */}
                        {validationResult.questions.length > 0 && (
                            <div className="space-y-2">
                                <h3 className="font-semibold">Questions Analysis</h3>
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                    {validationResult.questions.map((q, idx) => (
                                        <div key={idx} className="p-3 border rounded">
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline">Q{q.questionNumber}</Badge>
                                                    {q.part && <Badge variant="secondary">Part {q.part}</Badge>}
                                                    <Badge>{q.marks}M</Badge>
                                                    {q.bloomLevel && (
                                                        <Badge variant="outline">{q.bloomLevel}</Badge>
                                                    )}
                                                    {q.courseOutcome && (
                                                        <Badge variant="default">{q.courseOutcome}</Badge>
                                                    )}
                                                </div>
                                            </div>
                                            <p className="text-sm text-muted-foreground line-clamp-2">
                                                {q.questionText}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}

