"use client";

import { useState } from "react";
import { trpc } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export default function CreatePatternPage() {
    const router = useRouter();
    const [selectedCourseId, setSelectedCourseId] = useState("");

    // Form state
    const [formData, setFormData] = useState({
        patternName: "",
        academicYear: "2024-2025",
        semester: "1",
        examType: "End Semester",
        partA_count: 10,
        partA_marksEach: 2,
        partB_count: 4,
        partB_marksEach: 16,
        duration: 180,
        instructions: "Answer all questions.",
    });

    // Get user's courses
    const { data: coursesData } = trpc.coordinator.getCoursesForMaterialUpload.useQuery();
    const courses = coursesData || [];

    // Create pattern mutation
    const createMutation = trpc.pattern.createPattern.useMutation({
        onSuccess: () => {
            toast.success("Pattern created successfully and sent for MC approval");
            router.push("/coordinator/dashboard/question-paper/patterns");
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message || "Failed to create pattern");
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedCourseId) {
            toast.error("Please select a course");
            return;
        }

        createMutation.mutate({
            courseId: selectedCourseId,
            ...formData,
        });
    };

    const totalMarks =
        formData.partA_count * formData.partA_marksEach +
        formData.partB_count * formData.partB_marksEach;

    return (
        <div className="container mx-auto py-6 space-y-6">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold">Create Question Paper Pattern</h1>
                <p className="text-muted-foreground">
                    Define the structure and format of the examination paper
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <Card>
                    <CardHeader>
                        <CardTitle>Basic Information</CardTitle>
                        <CardDescription>
                            Provide details about the examination
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Course Selection */}
                            <div className="space-y-2">
                                <Label htmlFor="course">Course *</Label>
                                <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                                    <SelectTrigger id="course">
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

                            {/* Pattern Name */}
                            <div className="space-y-2">
                                <Label htmlFor="patternName">Pattern Name *</Label>
                                <Input
                                    id="patternName"
                                    value={formData.patternName}
                                    onChange={(e) =>
                                        setFormData({ ...formData, patternName: e.target.value })
                                    }
                                    placeholder="e.g., End Semester 2024-25"
                                    required
                                />
                            </div>

                            {/* Academic Year */}
                            <div className="space-y-2">
                                <Label htmlFor="academicYear">Academic Year *</Label>
                                <Input
                                    id="academicYear"
                                    value={formData.academicYear}
                                    onChange={(e) =>
                                        setFormData({ ...formData, academicYear: e.target.value })
                                    }
                                    placeholder="2024-2025"
                                    required
                                />
                            </div>

                            {/* Semester */}
                            <div className="space-y-2">
                                <Label htmlFor="semester">Semester *</Label>
                                <Select
                                    value={formData.semester}
                                    onValueChange={(value) =>
                                        setFormData({ ...formData, semester: value })
                                    }
                                >
                                    <SelectTrigger id="semester">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                                            <SelectItem key={sem} value={sem.toString()}>
                                                Semester {sem}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Exam Type */}
                            <div className="space-y-2">
                                <Label htmlFor="examType">Exam Type *</Label>
                                <Select
                                    value={formData.examType}
                                    onValueChange={(value) =>
                                        setFormData({ ...formData, examType: value })
                                    }
                                >
                                    <SelectTrigger id="examType">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="End Semester">End Semester</SelectItem>
                                        <SelectItem value="Mid Semester">Mid Semester</SelectItem>
                                        <SelectItem value="Supplementary">Supplementary</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Duration */}
                            <div className="space-y-2">
                                <Label htmlFor="duration">Duration (minutes) *</Label>
                                <Input
                                    id="duration"
                                    type="number"
                                    min="30"
                                    value={formData.duration}
                                    onChange={(e) =>
                                        setFormData({ ...formData, duration: parseInt(e.target.value) })
                                    }
                                    required
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Part A Configuration */}
                <Card>
                    <CardHeader>
                        <CardTitle>Part A - Short Answer Questions</CardTitle>
                        <CardDescription>
                            Configure short answer questions (typically 2 marks each)
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="partA_count">Number of Questions *</Label>
                                <Input
                                    id="partA_count"
                                    type="number"
                                    min="1"
                                    value={formData.partA_count}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            partA_count: parseInt(e.target.value),
                                        })
                                    }
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="partA_marksEach">Marks per Question *</Label>
                                <Select
                                    value={formData.partA_marksEach.toString()}
                                    onValueChange={(value) =>
                                        setFormData({
                                            ...formData,
                                            partA_marksEach: parseInt(value),
                                        })
                                    }
                                >
                                    <SelectTrigger id="partA_marksEach">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="2">2 Marks</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="bg-muted p-4 rounded-lg">
                            <p className="text-sm">
                                <strong>Part A Total:</strong>{" "}
                                {formData.partA_count * formData.partA_marksEach} marks
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Part B Configuration */}
                <Card>
                    <CardHeader>
                        <CardTitle>Part B - Essay Questions</CardTitle>
                        <CardDescription>
                            Configure essay questions (typically 8 or 16 marks each)
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="partB_count">Number of Questions *</Label>
                                <Input
                                    id="partB_count"
                                    type="number"
                                    min="1"
                                    value={formData.partB_count}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            partB_count: parseInt(e.target.value),
                                        })
                                    }
                                    required
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="partB_marksEach">Marks per Question *</Label>
                                <Select
                                    value={formData.partB_marksEach.toString()}
                                    onValueChange={(value) =>
                                        setFormData({
                                            ...formData,
                                            partB_marksEach: parseInt(value),
                                        })
                                    }
                                >
                                    <SelectTrigger id="partB_marksEach">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="8">8 Marks</SelectItem>
                                        <SelectItem value="16">16 Marks</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="bg-muted p-4 rounded-lg">
                            <p className="text-sm">
                                <strong>Part B Total:</strong>{" "}
                                {formData.partB_count * formData.partB_marksEach} marks
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Instructions */}
                <Card>
                    <CardHeader>
                        <CardTitle>Exam Instructions</CardTitle>
                        <CardDescription>
                            Instructions to be printed on the question paper
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            value={formData.instructions}
                            onChange={(e) =>
                                setFormData({ ...formData, instructions: e.target.value })
                            }
                            placeholder="Enter exam instructions..."
                            rows={4}
                        />
                    </CardContent>
                </Card>

                {/* Summary */}
                <Card>
                    <CardHeader>
                        <CardTitle>Pattern Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center p-4 bg-muted rounded-lg">
                                <div className="text-2xl font-bold">{formData.partA_count}</div>
                                <div className="text-sm text-muted-foreground">Part A Questions</div>
                            </div>
                            <div className="text-center p-4 bg-muted rounded-lg">
                                <div className="text-2xl font-bold">{formData.partB_count}</div>
                                <div className="text-sm text-muted-foreground">Part B Questions</div>
                            </div>
                            <div className="text-center p-4 bg-muted rounded-lg">
                                <div className="text-2xl font-bold">{totalMarks}</div>
                                <div className="text-sm text-muted-foreground">Total Marks</div>
                            </div>
                            <div className="text-center p-4 bg-muted rounded-lg">
                                <div className="text-2xl font-bold">{formData.duration}</div>
                                <div className="text-sm text-muted-foreground">Minutes</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Actions */}
                <div className="flex gap-4">
                    <Button
                        type="submit"
                        disabled={createMutation.isPending || !selectedCourseId}
                    >
                        {createMutation.isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            <>
                                <Plus className="mr-2 h-4 w-4" />
                                Create Pattern
                            </>
                        )}
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.back()}
                    >
                        Cancel
                    </Button>
                </div>
            </form>
        </div>
    );
}
