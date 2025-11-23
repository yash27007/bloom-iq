"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Plus, Trash2, FileText, Save, Eye, BookOpen } from "lucide-react";
import { toast } from "sonner";

type BloomLevel = "Remember" | "Understand" | "Apply" | "Analyze" | "Evaluate" | "Create";

type PartAQuestion = {
    id: string;
    questionNumber: number;
    bloomLevel: BloomLevel;
    marks: number;
    co: string; // Course Outcome
};

type PartBSubQuestion = {
    id: string;
    label: string; // a, b, c, etc.
    bloomLevel: BloomLevel;
    marks: number;
    co: string;
};

type PartBQuestion = {
    id: string;
    questionNumber: number;
    marks: number;
    hasOrOption: boolean;
    optionA: {
        subQuestions: PartBSubQuestion[];
    };
    optionB?: {
        subQuestions: PartBSubQuestion[];
    };
};

export default function SetPaperLayoutPage() {
    // Basic exam details
    const [examType, setExamType] = useState<"SESSIONAL_1" | "SESSIONAL_2" | "END_SEMESTER">("END_SEMESTER");
    const [semester, setSemester] = useState<"ODD" | "EVEN">("ODD");
    const [courseCode, setCourseCode] = useState("");
    const [courseName, setCourseName] = useState("");

    // Part A questions
    const [partAQuestions, setPartAQuestions] = useState<PartAQuestion[]>([
        { id: "pa-1", questionNumber: 1, bloomLevel: "Remember", marks: 2, co: "CO1" },
        { id: "pa-2", questionNumber: 2, bloomLevel: "Remember", marks: 2, co: "CO1" },
        { id: "pa-3", questionNumber: 3, bloomLevel: "Understand", marks: 2, co: "CO2" },
        { id: "pa-4", questionNumber: 4, bloomLevel: "Understand", marks: 2, co: "CO2" },
        { id: "pa-5", questionNumber: 5, bloomLevel: "Apply", marks: 2, co: "CO3" },
    ]);

    // Part B questions
    const [partBQuestions, setPartBQuestions] = useState<PartBQuestion[]>([
        {
            id: "pb-1",
            questionNumber: 11,
            marks: 16,
            hasOrOption: examType === "END_SEMESTER",
            optionA: {
                subQuestions: [
                    { id: "pb-1-a1", label: "a", bloomLevel: "Apply", marks: 8, co: "CO1" },
                    { id: "pb-1-a2", label: "b", bloomLevel: "Analyze", marks: 8, co: "CO1" },
                ],
            },
            optionB: examType === "END_SEMESTER" ? {
                subQuestions: [
                    { id: "pb-1-b1", label: "a", bloomLevel: "Apply", marks: 8, co: "CO1" },
                    { id: "pb-1-b2", label: "b", bloomLevel: "Analyze", marks: 8, co: "CO1" },
                ],
            } : undefined,
        },
    ]);

    const examDetails = {
        SESSIONAL_1: { totalMarks: 50, partAMarks: 10, partBMarks: 40, partAQuestions: 5, partAMarksEach: 2 },
        SESSIONAL_2: { totalMarks: 50, partAMarks: 10, partBMarks: 40, partAQuestions: 5, partAMarksEach: 2 },
        END_SEMESTER: { totalMarks: 100, partAMarks: 20, partBMarks: 80, partAQuestions: 10, partAMarksEach: 2 },
    };

    const currentExamDetails = examDetails[examType];

    const addPartAQuestion = () => {
        if (partAQuestions.length >= currentExamDetails.partAQuestions) {
            toast.error(`Maximum ${currentExamDetails.partAQuestions} questions allowed in Part A for ${examType.replace('_', ' ')}`);
            return;
        }
        const newQuestion: PartAQuestion = {
            id: `pa-${Date.now()}`,
            questionNumber: partAQuestions.length + 1,
            bloomLevel: "Remember",
            marks: currentExamDetails.partAMarksEach,
            co: "CO1",
        };
        setPartAQuestions([...partAQuestions, newQuestion]);
    };

    const removePartAQuestion = (id: string) => {
        setPartAQuestions(partAQuestions.filter(q => q.id !== id));
    };

    const updatePartAQuestion = (id: string, field: keyof PartAQuestion, value: string | number | BloomLevel) => {
        setPartAQuestions(partAQuestions.map(q =>
            q.id === id ? { ...q, [field]: value } : q
        ));
    };

    const addPartBQuestion = () => {
        const newQuestionNumber = partBQuestions.length > 0
            ? Math.max(...partBQuestions.map(q => q.questionNumber)) + 1
            : 11;

        const newQuestion: PartBQuestion = {
            id: `pb-${Date.now()}`,
            questionNumber: newQuestionNumber,
            marks: 16,
            hasOrOption: examType === "END_SEMESTER",
            optionA: {
                subQuestions: [
                    { id: `pb-${Date.now()}-a1`, label: "a", bloomLevel: "Apply", marks: 8, co: "CO1" },
                ],
            },
            optionB: examType === "END_SEMESTER" ? {
                subQuestions: [
                    { id: `pb-${Date.now()}-b1`, label: "a", bloomLevel: "Apply", marks: 8, co: "CO1" },
                ],
            } : undefined,
        };
        setPartBQuestions([...partBQuestions, newQuestion]);
    };

    const removePartBQuestion = (id: string) => {
        setPartBQuestions(partBQuestions.filter(q => q.id !== id));
    };

    const addSubQuestion = (questionId: string, option: 'A' | 'B') => {
        setPartBQuestions(partBQuestions.map(q => {
            if (q.id === questionId) {
                const targetOption = option === 'A' ? q.optionA : q.optionB;
                if (!targetOption) return q;

                const existingLabels = targetOption.subQuestions.map(sq => sq.label);
                const nextLabel = String.fromCharCode(97 + existingLabels.length); // a, b, c, d...

                const newSubQuestion: PartBSubQuestion = {
                    id: `${questionId}-${option.toLowerCase()}${Date.now()}`,
                    label: nextLabel,
                    bloomLevel: "Apply",
                    marks: 8,
                    co: "CO1",
                };

                if (option === 'A') {
                    return {
                        ...q,
                        optionA: {
                            subQuestions: [...q.optionA.subQuestions, newSubQuestion],
                        },
                    };
                } else if (q.optionB) {
                    return {
                        ...q,
                        optionB: {
                            subQuestions: [...q.optionB.subQuestions, newSubQuestion],
                        },
                    };
                }
            }
            return q;
        }));
    };

    const removeSubQuestion = (questionId: string, subQuestionId: string, option: 'A' | 'B') => {
        setPartBQuestions(partBQuestions.map(q => {
            if (q.id === questionId) {
                if (option === 'A') {
                    return {
                        ...q,
                        optionA: {
                            subQuestions: q.optionA.subQuestions.filter(sq => sq.id !== subQuestionId),
                        },
                    };
                } else if (q.optionB) {
                    return {
                        ...q,
                        optionB: {
                            subQuestions: q.optionB.subQuestions.filter(sq => sq.id !== subQuestionId),
                        },
                    };
                }
            }
            return q;
        }));
    };

    const updateSubQuestion = (questionId: string, subQuestionId: string, option: 'A' | 'B', field: keyof PartBSubQuestion, value: string | number | BloomLevel) => {
        setPartBQuestions(partBQuestions.map(q => {
            if (q.id === questionId) {
                if (option === 'A') {
                    return {
                        ...q,
                        optionA: {
                            subQuestions: q.optionA.subQuestions.map(sq =>
                                sq.id === subQuestionId ? { ...sq, [field]: value } : sq
                            ),
                        },
                    };
                } else if (q.optionB) {
                    return {
                        ...q,
                        optionB: {
                            subQuestions: q.optionB.subQuestions.map(sq =>
                                sq.id === subQuestionId ? { ...sq, [field]: value } : sq
                            ),
                        },
                    };
                }
            }
            return q;
        }));
    };

    const handleSavePattern = () => {
        if (!courseCode || !courseName) {
            toast.error("Please fill in course code and course name");
            return;
        }

        const pattern = {
            examType,
            semester,
            courseCode,
            courseName,
            totalMarks: currentExamDetails.totalMarks,
            partA: {
                totalMarks: currentExamDetails.partAMarks,
                questions: partAQuestions,
            },
            partB: {
                totalMarks: currentExamDetails.partBMarks,
                questions: partBQuestions,
            },
        };

        console.log("Question Paper Pattern:", JSON.stringify(pattern, null, 2));
        toast.success("Question paper pattern saved successfully!");
    };

    const handlePreview = () => {
        toast.info("Preview functionality coming soon!");
    };

    const getBloomBadgeColor = (level: BloomLevel) => {
        const colors: Record<BloomLevel, string> = {
            Remember: "bg-blue-100 text-blue-700 border-blue-300",
            Understand: "bg-green-100 text-green-700 border-green-300",
            Apply: "bg-yellow-100 text-yellow-700 border-yellow-300",
            Analyze: "bg-orange-100 text-orange-700 border-orange-300",
            Evaluate: "bg-purple-100 text-purple-700 border-purple-300",
            Create: "bg-red-100 text-red-700 border-red-300",
        };
        return colors[level];
    };

    return (
        <div className="container mx-auto py-8 px-4 max-w-7xl">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold tracking-tight">Set Question Paper Pattern</h1>
                        <p className="text-muted-foreground">
                            Configure the structure and pattern for exam question papers
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handlePreview} className="gap-2">
                            <Eye className="h-4 w-4" />
                            Preview
                        </Button>
                        <Button onClick={handleSavePattern} className="gap-2">
                            <Save className="h-4 w-4" />
                            Save Pattern
                        </Button>
                    </div>
                </div>

                {/* Exam Basic Details */}
                <Card className="border-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5" />
                            Exam Details
                        </CardTitle>
                        <CardDescription>
                            Configure basic exam information
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {/* Exam Type */}
                            <div className="space-y-2">
                                <Label htmlFor="examType" className="text-base font-semibold">Exam Type *</Label>
                                <Select value={examType} onValueChange={(value) => setExamType(value as typeof examType)}>
                                    <SelectTrigger id="examType">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="SESSIONAL_1">Sessional 1</SelectItem>
                                        <SelectItem value="SESSIONAL_2">Sessional 2</SelectItem>
                                        <SelectItem value="END_SEMESTER">End Semester</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Semester */}
                            <div className="space-y-2">
                                <Label className="text-base font-semibold">Semester *</Label>
                                <RadioGroup value={semester} onValueChange={(value) => setSemester(value as typeof semester)} className="flex gap-4">
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="ODD" id="odd" />
                                        <Label htmlFor="odd" className="cursor-pointer font-normal">Odd Semester</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="EVEN" id="even" />
                                        <Label htmlFor="even" className="cursor-pointer font-normal">Even Semester</Label>
                                    </div>
                                </RadioGroup>
                            </div>

                            {/* Course Code */}
                            <div className="space-y-2">
                                <Label htmlFor="courseCode" className="text-base font-semibold">Course Code *</Label>
                                <Input
                                    id="courseCode"
                                    value={courseCode}
                                    onChange={(e) => setCourseCode(e.target.value)}
                                    placeholder="e.g., CS301"
                                />
                            </div>

                            {/* Course Name */}
                            <div className="space-y-2">
                                <Label htmlFor="courseName" className="text-base font-semibold">Course Name *</Label>
                                <Input
                                    id="courseName"
                                    value={courseName}
                                    onChange={(e) => setCourseName(e.target.value)}
                                    placeholder="e.g., Data Structures"
                                />
                            </div>
                        </div>

                        {/* Exam Summary */}
                        <div className="bg-muted/50 p-4 rounded-lg">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <p className="text-sm font-medium">Exam Configuration</p>
                                    <p className="text-xs text-muted-foreground">
                                        {examType.replace(/_/g, ' ')} • {semester} Semester
                                    </p>
                                </div>
                                <div className="flex gap-4">
                                    <div className="text-center">
                                        <p className="text-2xl font-bold">{currentExamDetails.totalMarks}</p>
                                        <p className="text-xs text-muted-foreground">Total Marks</p>
                                    </div>
                                    <Separator orientation="vertical" className="h-12" />
                                    <div className="text-center">
                                        <p className="text-2xl font-bold">{currentExamDetails.partAMarks}</p>
                                        <p className="text-xs text-muted-foreground">Part A</p>
                                    </div>
                                    <Separator orientation="vertical" className="h-12" />
                                    <div className="text-center">
                                        <p className="text-2xl font-bold">{currentExamDetails.partBMarks}</p>
                                        <p className="text-xs text-muted-foreground">Part B</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Part A Questions */}
                <Card className="border-2">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <BookOpen className="h-5 w-5" />
                                    Part A - Short Answer Questions
                                    <Badge variant="secondary">{currentExamDetails.partAMarks} Marks</Badge>
                                </CardTitle>
                                <CardDescription className="mt-1">
                                    {currentExamDetails.partAQuestions} questions × {currentExamDetails.partAMarksEach} marks each
                                </CardDescription>
                            </div>
                            <Button onClick={addPartAQuestion} size="sm" className="gap-2">
                                <Plus className="h-4 w-4" />
                                Add Question
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {partAQuestions.map((question) => (
                                <div key={question.id} className="border-2 rounded-lg p-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-semibold">Question {question.questionNumber}</h4>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removePartAQuestion(question.id)}
                                            className="text-destructive hover:text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-2">
                                            <Label className="text-sm">Bloom&apos;s Level</Label>
                                            <Select
                                                value={question.bloomLevel}
                                                onValueChange={(value) => updatePartAQuestion(question.id, 'bloomLevel', value as BloomLevel)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="Remember">Remember</SelectItem>
                                                    <SelectItem value="Understand">Understand</SelectItem>
                                                    <SelectItem value="Apply">Apply</SelectItem>
                                                    <SelectItem value="Analyze">Analyze</SelectItem>
                                                    <SelectItem value="Evaluate">Evaluate</SelectItem>
                                                    <SelectItem value="Create">Create</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-sm">Course Outcome (CO)</Label>
                                            <Select
                                                value={question.co}
                                                onValueChange={(value) => updatePartAQuestion(question.id, 'co', value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="CO1">CO1</SelectItem>
                                                    <SelectItem value="CO2">CO2</SelectItem>
                                                    <SelectItem value="CO3">CO3</SelectItem>
                                                    <SelectItem value="CO4">CO4</SelectItem>
                                                    <SelectItem value="CO5">CO5</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="text-sm">Marks</Label>
                                            <Input
                                                type="number"
                                                value={question.marks}
                                                onChange={(e) => updatePartAQuestion(question.id, 'marks', Number(e.target.value))}
                                                disabled
                                            />
                                        </div>
                                    </div>
                                    <Badge className={getBloomBadgeColor(question.bloomLevel)}>
                                        {question.bloomLevel}
                                    </Badge>
                                </div>
                            ))}
                            {partAQuestions.length === 0 && (
                                <div className="text-center py-8 text-muted-foreground">
                                    No questions added yet. Click &quot;Add Question&quot; to get started.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Part B Questions */}
                <Card className="border-2">
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="flex items-center gap-2">
                                    <BookOpen className="h-5 w-5" />
                                    Part B - Long Answer Questions
                                    <Badge variant="secondary">{currentExamDetails.partBMarks} Marks</Badge>
                                </CardTitle>
                                <CardDescription className="mt-1">
                                    {examType === "END_SEMESTER" ? "Questions with OR options (16 marks each)" : "Questions without OR options (8 marks each)"}
                                </CardDescription>
                            </div>
                            <Button onClick={addPartBQuestion} size="sm" className="gap-2">
                                <Plus className="h-4 w-4" />
                                Add Question
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {partBQuestions.map((question) => (
                                <div key={question.id} className="border-2 rounded-lg p-4 space-y-4 bg-muted/20">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <h4 className="font-semibold text-lg">Question {question.questionNumber}</h4>
                                            <Badge variant="outline">{question.marks} Marks Total</Badge>
                                            {question.hasOrOption && <Badge className="bg-amber-100 text-amber-700">OR Option</Badge>}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removePartBQuestion(question.id)}
                                            className="text-destructive hover:text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    {/* Option A */}
                                    <div className="border rounded-lg p-4 bg-background space-y-3">
                                        <div className="flex items-center justify-between">
                                            <h5 className="font-medium">
                                                {question.hasOrOption ? `Q${question.questionNumber}A` : `Q${question.questionNumber}`}
                                            </h5>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => addSubQuestion(question.id, 'A')}
                                                className="gap-2"
                                            >
                                                <Plus className="h-3 w-3" />
                                                Add Sub-question
                                            </Button>
                                        </div>
                                        <div className="space-y-2">
                                            {question.optionA.subQuestions.map((subQ) => (
                                                <div key={subQ.id} className="flex items-center gap-3 p-3 border rounded-lg">
                                                    <span className="font-medium min-w-[20px]">{subQ.label})</span>
                                                    <Select
                                                        value={subQ.bloomLevel}
                                                        onValueChange={(value) => updateSubQuestion(question.id, subQ.id, 'A', 'bloomLevel', value as BloomLevel)}
                                                    >
                                                        <SelectTrigger className="w-[150px]">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Remember">Remember</SelectItem>
                                                            <SelectItem value="Understand">Understand</SelectItem>
                                                            <SelectItem value="Apply">Apply</SelectItem>
                                                            <SelectItem value="Analyze">Analyze</SelectItem>
                                                            <SelectItem value="Evaluate">Evaluate</SelectItem>
                                                            <SelectItem value="Create">Create</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <Select
                                                        value={subQ.co}
                                                        onValueChange={(value) => updateSubQuestion(question.id, subQ.id, 'A', 'co', value)}
                                                    >
                                                        <SelectTrigger className="w-[100px]">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="CO1">CO1</SelectItem>
                                                            <SelectItem value="CO2">CO2</SelectItem>
                                                            <SelectItem value="CO3">CO3</SelectItem>
                                                            <SelectItem value="CO4">CO4</SelectItem>
                                                            <SelectItem value="CO5">CO5</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                    <Input
                                                        type="number"
                                                        value={subQ.marks}
                                                        onChange={(e) => updateSubQuestion(question.id, subQ.id, 'A', 'marks', Number(e.target.value))}
                                                        className="w-[80px]"
                                                        placeholder="Marks"
                                                    />
                                                    <span className="text-sm text-muted-foreground">marks</span>
                                                    <Badge className={getBloomBadgeColor(subQ.bloomLevel)}>
                                                        {subQ.bloomLevel}
                                                    </Badge>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => removeSubQuestion(question.id, subQ.id, 'A')}
                                                        className="ml-auto text-destructive hover:text-destructive"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Option B (only for END_SEMESTER) */}
                                    {question.hasOrOption && question.optionB && (
                                        <>
                                            <div className="text-center">
                                                <Badge variant="secondary" className="text-lg px-4 py-1">OR</Badge>
                                            </div>
                                            <div className="border rounded-lg p-4 bg-background space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <h5 className="font-medium">Q{question.questionNumber}B</h5>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => addSubQuestion(question.id, 'B')}
                                                        className="gap-2"
                                                    >
                                                        <Plus className="h-3 w-3" />
                                                        Add Sub-question
                                                    </Button>
                                                </div>
                                                <div className="space-y-2">
                                                    {question.optionB.subQuestions.map((subQ) => (
                                                        <div key={subQ.id} className="flex items-center gap-3 p-3 border rounded-lg">
                                                            <span className="font-medium min-w-[20px]">{subQ.label})</span>
                                                            <Select
                                                                value={subQ.bloomLevel}
                                                                onValueChange={(value) => updateSubQuestion(question.id, subQ.id, 'B', 'bloomLevel', value as BloomLevel)}
                                                            >
                                                                <SelectTrigger className="w-[150px]">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="Remember">Remember</SelectItem>
                                                                    <SelectItem value="Understand">Understand</SelectItem>
                                                                    <SelectItem value="Apply">Apply</SelectItem>
                                                                    <SelectItem value="Analyze">Analyze</SelectItem>
                                                                    <SelectItem value="Evaluate">Evaluate</SelectItem>
                                                                    <SelectItem value="Create">Create</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                            <Select
                                                                value={subQ.co}
                                                                onValueChange={(value) => updateSubQuestion(question.id, subQ.id, 'B', 'co', value)}
                                                            >
                                                                <SelectTrigger className="w-[100px]">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    <SelectItem value="CO1">CO1</SelectItem>
                                                                    <SelectItem value="CO2">CO2</SelectItem>
                                                                    <SelectItem value="CO3">CO3</SelectItem>
                                                                    <SelectItem value="CO4">CO4</SelectItem>
                                                                    <SelectItem value="CO5">CO5</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                            <Input
                                                                type="number"
                                                                value={subQ.marks}
                                                                onChange={(e) => updateSubQuestion(question.id, subQ.id, 'B', 'marks', Number(e.target.value))}
                                                                className="w-[80px]"
                                                                placeholder="Marks"
                                                            />
                                                            <span className="text-sm text-muted-foreground">marks</span>
                                                            <Badge className={getBloomBadgeColor(subQ.bloomLevel)}>
                                                                {subQ.bloomLevel}
                                                            </Badge>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => removeSubQuestion(question.id, subQ.id, 'B')}
                                                                className="ml-auto text-destructive hover:text-destructive"
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </div>
                            ))}
                            {partBQuestions.length === 0 && (
                                <div className="text-center py-8 text-muted-foreground">
                                    No questions added yet. Click &quot;Add Question&quot; to get started.
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
