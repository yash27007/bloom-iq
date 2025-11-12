'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Plus, CheckCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';



// Types
interface Course {
    id: string;
    name: string;
    course_code: string;
}

interface Material {
    id: string;
    title: string;
    unit: number;
    courseId: string;
    course: {
        name: string;
        course_code: string;
    };
}

interface GeneratedQuestion {
    id: string;
    question: string;
    answer: string;
    difficultyLevel: 'EASY' | 'MEDIUM' | 'HARD';
    bloomLevel: 'REMEMBER' | 'UNDERSTAND' | 'APPLY' | 'ANALYZE' | 'EVALUATE' | 'CREATE';
    generationType: 'DIRECT' | 'INDIRECT' | 'SCENARIO_BASED' | 'PROBLEM_BASED';
    marks: 'TWO' | 'EIGHT' | 'SIXTEEN';
    status: string;
    reviewedByCc: boolean;
    materialName: string;
    course: {
        name: string;
        course_code: string;
    };
    feedback: Array<{
        id: string;
        remarks: string;
        createdAt: string;
    }>;
}

export default function GenerateQuestionsPage() {
    // State management
    const [courses, setCourses] = useState<Course[]>([]);
    const [materials, setMaterials] = useState<Material[]>([]);
    const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<string>('');
    const [selectedMaterial, setSelectedMaterial] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [generating, setGenerating] = useState(false);

    // Question generation parameters
    const [questionCounts, setQuestionCounts] = useState({
        easy: 2,
        medium: 3,
        hard: 2,
    });

    const [bloomLevels, setBloomLevels] = useState({
        remember: 2,
        understand: 2,
        apply: 1,
        analyze: 1,
        evaluate: 1,
        create: 0,
    });

    const [questionTypes, setQuestionTypes] = useState({
        direct: 3,
        indirect: 2,
        scenarioBased: 1,
        problemBased: 1,
    });

    // Remove tRPC mutations and use fetch-based approach

    // Load data functions
    const loadCourses = useCallback(async () => {
        try {
            const response = await fetch('/api/coordinator/courses');
            if (response.ok) {
                const data = await response.json();
                setCourses(data.courses || []);
            }
        } catch (error) {
            console.error('Failed to load courses:', error);
            toast.error('Failed to load courses');
        }
    }, []);

    const loadMaterials = useCallback(async () => {
        try {
            const response = await fetch('/api/upload/list');
            if (response.ok) {
                const data = await response.json();
                setMaterials(data.materials || []);
            }
        } catch (_error) {
            console.error('Failed to load materials:', _error);
        }
    }, []);

    const loadQuestions = useCallback(async () => {
        if (!selectedCourse) return;

        try {
            const response = await fetch(`/api/coordinator/questions?courseId=${selectedCourse}`);
            if (response.ok) {
                const data = await response.json();
                setQuestions(data.questions || []);
            }
        } catch (_error) {
            console.error('Failed to load questions:', _error);
        }
    }, [selectedCourse]);

    // Load data on mount
    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            await Promise.all([loadCourses(), loadMaterials()]);
            setLoading(false);
        };
        loadData();
    }, [loadCourses, loadMaterials]);

    // Load questions when course changes
    useEffect(() => {
        if (selectedCourse) {
            loadQuestions();
        }
    }, [selectedCourse, loadQuestions]);

    // Filter materials by selected course
    const filteredMaterials = materials.filter(m => m.courseId === selectedCourse);

    // Generate questions handler
    const handleGenerateQuestions = async () => {
        if (!selectedMaterial) {
            toast.error('Please select a material first');
            return;
        }

        try {
            setGenerating(true);
            const response = await fetch('/api/coordinator/generate-questions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    materialId: selectedMaterial,
                    questionCounts,
                    bloomLevels,
                    questionTypes,
                }),
            });

            if (response.ok) {
                const result = await response.json();
                toast.success(result.message || 'Questions generated successfully');
                await loadQuestions(); // Reload questions
            } else {
                const error = await response.json();
                toast.error(error.error || 'Failed to generate questions');
            }
        } catch (_error) {
            toast.error('Failed to generate questions');
            console.error('Generation error:', _error);
        } finally {
            setGenerating(false);
        }
    };

    // Delete question handler
    const handleDeleteQuestion = async (questionId: string) => {
        try {
            const response = await fetch('/api/coordinator/questions/actions', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ questionId }),
            });

            if (response.ok) {
                toast.success('Question deleted successfully');
                await loadQuestions();
            } else {
                const error = await response.json();
                toast.error(error.error || 'Failed to delete question');
            }
        } catch (_error) {
            toast.error('Failed to delete question');
        }
    };

    // Approve questions handler
    const handleApproveQuestions = async (questionIds: string[]) => {
        try {
            const response = await fetch('/api/coordinator/questions/actions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ questionIds }),
            });

            if (response.ok) {
                const result = await response.json();
                toast.success(result.message || 'Questions approved successfully');
                await loadQuestions();
            } else {
                const error = await response.json();
                toast.error(error.error || 'Failed to approve questions');
            }
        } catch (_error) {
            toast.error('Failed to approve questions');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="bg-background">
            <div className="container mx-auto px-6 py-8 space-y-6">
                <div className="mb-8 space-y-1">
                    <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                        Generate Questions
                    </h1>
                    <p className="text-muted-foreground">
                        Create AI-powered questions from your course materials using advanced pedagogical parameters
                    </p>
                </div>

                {/* Course and Material Selection */}
                <Card>
                    <CardHeader>
                        <CardTitle>Select Course and Material</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="course">Course</Label>
                                <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                                    <SelectTrigger>
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

                            <div className="space-y-2">
                                <Label htmlFor="material">Course Material</Label>
                                <Select
                                    value={selectedMaterial}
                                    onValueChange={setSelectedMaterial}
                                    disabled={!selectedCourse}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select material" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {filteredMaterials.map((material) => (
                                            <SelectItem key={material.id} value={material.id}>
                                                Unit {material.unit} - {material.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Question Generation Parameters */}
                {selectedMaterial && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Question Generation Parameters</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Difficulty Levels */}
                            <div>
                                <h3 className="text-lg font-semibold mb-3">Difficulty Levels</h3>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label>Easy Questions</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            max="50"
                                            value={questionCounts.easy}
                                            onChange={(e) => setQuestionCounts(prev => ({ ...prev, easy: parseInt(e.target.value) || 0 }))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Medium Questions</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            max="50"
                                            value={questionCounts.medium}
                                            onChange={(e) => setQuestionCounts(prev => ({ ...prev, medium: parseInt(e.target.value) || 0 }))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Hard Questions</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            max="50"
                                            value={questionCounts.hard}
                                            onChange={(e) => setQuestionCounts(prev => ({ ...prev, hard: parseInt(e.target.value) || 0 }))}
                                        />
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Bloom's Taxonomy */}
                            <div>
                                <h3 className="text-lg font-semibold mb-3">Bloom&apos;s Taxonomy Levels</h3>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                    {Object.entries(bloomLevels).map(([level, count]) => (
                                        <div key={level} className="space-y-2">
                                            <Label className="capitalize">{level}</Label>
                                            <Input
                                                type="number"
                                                min="0"
                                                max="50"
                                                value={count}
                                                onChange={(e) => setBloomLevels(prev => ({ ...prev, [level]: parseInt(e.target.value) || 0 }))}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <Separator />

                            {/* Question Types */}
                            <div>
                                <h3 className="text-lg font-semibold mb-3">Question Types</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="space-y-2">
                                        <Label>Direct</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            max="50"
                                            value={questionTypes.direct}
                                            onChange={(e) => setQuestionTypes(prev => ({ ...prev, direct: parseInt(e.target.value) || 0 }))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Indirect</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            max="50"
                                            value={questionTypes.indirect}
                                            onChange={(e) => setQuestionTypes(prev => ({ ...prev, indirect: parseInt(e.target.value) || 0 }))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Scenario-based</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            max="50"
                                            value={questionTypes.scenarioBased}
                                            onChange={(e) => setQuestionTypes(prev => ({ ...prev, scenarioBased: parseInt(e.target.value) || 0 }))}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Problem-based</Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            max="50"
                                            value={questionTypes.problemBased}
                                            onChange={(e) => setQuestionTypes(prev => ({ ...prev, problemBased: parseInt(e.target.value) || 0 }))}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <Button
                                    onClick={handleGenerateQuestions}
                                    disabled={generating}
                                    size="lg"
                                >
                                    {generating ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Generating Questions...
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="mr-2 h-4 w-4" />
                                            Generate Questions
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Generated Questions */}
                {questions.length > 0 && (
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>Generated Questions ({questions.length})</CardTitle>
                                <div className="flex gap-2">
                                    <Button
                                        onClick={() => handleApproveQuestions(questions.filter(q => !q.reviewedByCc).map(q => q.id))}
                                        disabled={questions.filter(q => !q.reviewedByCc).length === 0}
                                        variant="outline"
                                    >
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        Approve All
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {questions.map((question) => (
                                    <Card key={question.id} className="border-l-4 border-l-blue-500">
                                        <CardContent className="pt-6">
                                            <div className="space-y-4">
                                                {/* Question Header */}
                                                <div className="flex items-center justify-between">
                                                    <div className="flex gap-2">
                                                        <Badge variant={question.difficultyLevel === 'EASY' ? 'secondary' : question.difficultyLevel === 'MEDIUM' ? 'default' : 'destructive'}>
                                                            {question.difficultyLevel}
                                                        </Badge>
                                                        <Badge variant="outline">{question.bloomLevel}</Badge>
                                                        <Badge variant="outline">{question.generationType}</Badge>
                                                        <Badge variant="outline">{question.marks} marks</Badge>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        {question.reviewedByCc ? (
                                                            <Badge variant="secondary">
                                                                <CheckCircle className="mr-1 h-3 w-3" />
                                                                Reviewed
                                                            </Badge>
                                                        ) : (
                                                            <Button
                                                                size="sm"
                                                                onClick={() => handleApproveQuestions([question.id])}
                                                            >
                                                                <CheckCircle className="mr-1 h-3 w-3" />
                                                                Approve
                                                            </Button>
                                                        )}
                                                        <Button
                                                            size="sm"
                                                            variant="destructive"
                                                            onClick={() => handleDeleteQuestion(question.id)}
                                                            disabled={question.reviewedByCc}
                                                        >
                                                            <Trash2 className="h-3 w-3" />
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Question Text */}
                                                <div className="space-y-2">
                                                    <Label className="text-sm font-medium">Question:</Label>
                                                    <p className="text-sm bg-gray-50 p-3 rounded">{question.question}</p>
                                                </div>

                                                {/* Answer */}
                                                <div className="space-y-2">
                                                    <Label className="text-sm font-medium">Answer:</Label>
                                                    <p className="text-sm bg-green-50 p-3 rounded">{question.answer}</p>
                                                </div>

                                                {/* Feedback */}
                                                {question.feedback && question.feedback.length > 0 && (
                                                    <div className="space-y-2">
                                                        <Label className="text-sm font-medium">Feedback:</Label>
                                                        {question.feedback.map((fb) => (
                                                            <div key={fb.id} className="text-sm bg-yellow-50 p-3 rounded border-l-2 border-yellow-300">
                                                                <p>{fb.remarks}</p>
                                                                <p className="text-xs text-gray-500 mt-1">
                                                                    {new Date(fb.createdAt).toLocaleDateString()}
                                                                </p>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
