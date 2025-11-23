'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Plus, CheckCircle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/trpc/client';

// Types
interface Course {
    id: string;
    name: string;
    course_code: string;
}

interface Material {
    id: string;
    courseId: string;
    title: string;
    unit: number;
    course: {
        name: string;
        course_code: string;
    };
    materialType: string;
    parsingStatus: string;
    parsingError: string | null;
    hasParsedContent: boolean;
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
    materialName?: string | null;
    course: {
        name: string;
        course_code: string;
    };
    courseMaterial?: {
        title: string;
        unit: number;
    } | null;
    feedback: Array<{
        id: string;
        remarks: string;
        createdAt: Date;
    }>;
}

export default function GenerateQuestionsPage() {
    // State management
    const router = useRouter();
    const [selectedCourse, setSelectedCourse] = useState<string>('');
    const [selectedMaterial, setSelectedMaterial] = useState<string>('');

    // tRPC queries
    const { data: courses = [], isLoading: coursesLoading } = trpc.coordinator.getCoursesForMaterialUpload.useQuery();
    const { data: materials = [], isLoading: materialsLoading } = trpc.coordinator.getUploadedMaterials.useQuery();
    // Removed getGeneratedQuestions query - no need to display already generated questions on this page

    // tRPC mutations
    const generateQuestionsMutation = trpc.coordinator.generateQuestions.useMutation({
        onSuccess: (data) => {
            // Store generated questions in sessionStorage
            const sessionId = Date.now().toString();
            sessionStorage.setItem(`temp_questions_${sessionId}`, JSON.stringify(data.questions));
            sessionStorage.setItem(`temp_metadata_${sessionId}`, JSON.stringify({
                courseId: data.courseId,
                materialId: data.materialId,
                unit: data.unit
            }));

            // Redirect to review page
            router.push(`/coordinator/dashboard/course-management/review-questions?session=${sessionId}`);
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to generate questions');
        },
    });

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

    // Filter materials by selected course
    const filteredMaterials = materials.filter(m => m.courseId === selectedCourse);

    // Generate questions handler
    const handleGenerateQuestions = () => {
        if (!selectedMaterial) {
            toast.error('Please select a material first');
            return;
        }

        generateQuestionsMutation.mutate({
            materialId: selectedMaterial,
            questionCounts,
            bloomLevels,
            questionTypes,
        });
    };

    const loading = coursesLoading || materialsLoading;
    const generating = generateQuestionsMutation.isPending;

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
            </div>
        </div>
    );
}
