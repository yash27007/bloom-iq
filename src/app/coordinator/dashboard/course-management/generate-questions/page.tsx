'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Info } from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/trpc/client';
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

export default function GenerateQuestionsPage() {
    // State management
    const router = useRouter();
    const [selectedCourse, setSelectedCourse] = useState<string>('');
    const [selectedMaterial, setSelectedMaterial] = useState<string>('');
    const [selectedModel, setSelectedModel] = useState<string>('gemma3:4b');
    const [showAdvanced, setShowAdvanced] = useState(false);

    // tRPC queries
    const { data: courses = [], isLoading: coursesLoading } = trpc.coordinator.getCoursesForMaterialUpload.useQuery();
    const { data: materials = [], isLoading: materialsLoading } = trpc.coordinator.getUploadedMaterials.useQuery();
    const { data: ollamaModels = [], isLoading: modelsLoading } = trpc.coordinator.getOllamaModels.useQuery();

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

    // Simplified question generation parameters - total questions per difficulty
    const [totalQuestions, setTotalQuestions] = useState({
        easy: 6,
        medium: 6,
        hard: 6,
    });

    // Advanced parameters (auto-calculated by default)
    const [bloomLevels, setBloomLevels] = useState({
        remember: 3,
        understand: 3,
        apply: 2,
        analyze: 2,
        evaluate: 1,
        create: 1,
    });

    const [questionTypes, setQuestionTypes] = useState({
        direct: 6,
        indirect: 6,
        scenarioBased: 3,
        problemBased: 3,
    });

    // Filter materials by selected course
    const filteredMaterials = materials.filter(m => m.courseId === selectedCourse);

    // Calculate total questions
    const totalCount = totalQuestions.easy + totalQuestions.medium + totalQuestions.hard;

    // Generate questions handler
    const handleGenerateQuestions = () => {
        if (!selectedMaterial) {
            toast.error('Please select a material first');
            return;
        }

        if (totalCount === 0) {
            toast.error('Please specify at least one question to generate');
            return;
        }

        // Auto-calculate bloom levels and question types if not in advanced mode
        let finalBloomLevels = bloomLevels;
        let finalQuestionTypes = questionTypes;

        if (!showAdvanced) {
            // Auto-distribute bloom levels based on difficulty
            finalBloomLevels = {
                remember: Math.ceil(totalQuestions.easy * 0.5),
                understand: Math.ceil(totalQuestions.easy * 0.5),
                apply: Math.ceil(totalQuestions.medium * 0.5),
                analyze: Math.ceil(totalQuestions.medium * 0.5),
                evaluate: Math.ceil(totalQuestions.hard * 0.5),
                create: Math.ceil(totalQuestions.hard * 0.5),
            };

            // Auto-distribute question types (40% direct, 40% indirect, 10% scenario, 10% problem)
            finalQuestionTypes = {
                direct: Math.ceil(totalCount * 0.4),
                indirect: Math.ceil(totalCount * 0.4),
                scenarioBased: Math.ceil(totalCount * 0.1),
                problemBased: Math.ceil(totalCount * 0.1),
            };
        }

        generateQuestionsMutation.mutate({
            materialId: selectedMaterial,
            model: selectedModel,
            questionCounts: totalQuestions,
            bloomLevels: finalBloomLevels,
            questionTypes: finalQuestionTypes,
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

                {/* Model Selection */}
                {selectedMaterial && (
                    <Card>
                        <CardHeader>
                            <CardTitle>AI Model Selection</CardTitle>
                            <CardDescription>
                                Choose the Ollama model to use for question generation
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                <Label htmlFor="model">Model</Label>
                                <Select 
                                    value={selectedModel} 
                                    onValueChange={setSelectedModel}
                                    disabled={modelsLoading}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select model" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ollamaModels.map((model) => (
                                            <SelectItem key={model.model} value={model.model}>
                                                {model.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {modelsLoading && (
                                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        Loading available models...
                                    </p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Question Generation Parameters */}
                {selectedMaterial && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Question Generation Parameters</CardTitle>
                            <CardDescription>
                                Specify how many questions you want for each difficulty level
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Difficulty Levels - Simplified */}
                            <div>
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-lg font-semibold">Difficulty Distribution</h3>
                                    <Badge variant="secondary">Total: {totalCount} questions</Badge>
                                </div>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2">
                                            Easy Questions
                                            <Badge variant="outline" className="text-xs">2 marks</Badge>
                                        </Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            max="50"
                                            value={totalQuestions.easy}
                                            onChange={(e) => setTotalQuestions(prev => ({ ...prev, easy: parseInt(e.target.value) || 0 }))}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            REMEMBER & UNDERSTAND
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2">
                                            Medium Questions
                                            <Badge variant="outline" className="text-xs">8 marks</Badge>
                                        </Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            max="50"
                                            value={totalQuestions.medium}
                                            onChange={(e) => setTotalQuestions(prev => ({ ...prev, medium: parseInt(e.target.value) || 0 }))}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            APPLY & ANALYZE
                                        </p>
                                    </div>
                                    <div className="space-y-2">
                                        <Label className="flex items-center gap-2">
                                            Hard Questions
                                            <Badge variant="outline" className="text-xs">16 marks</Badge>
                                        </Label>
                                        <Input
                                            type="number"
                                            min="0"
                                            max="50"
                                            value={totalQuestions.hard}
                                            onChange={(e) => setTotalQuestions(prev => ({ ...prev, hard: parseInt(e.target.value) || 0 }))}
                                        />
                                        <p className="text-xs text-muted-foreground">
                                            EVALUATE & CREATE
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Advanced Options Toggle */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold">Advanced Parameters</h3>
                                    <p className="text-sm text-muted-foreground">
                                        Manually configure Bloom's levels and question types
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowAdvanced(!showAdvanced)}
                                >
                                    {showAdvanced ? 'Hide' : 'Show'} Advanced
                                </Button>
                            </div>

                            {/* Advanced Parameters */}
                            {showAdvanced && (
                                <>
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
                                </>
                            )}

                            <div className="flex justify-end gap-2">
                                <Button
                                    onClick={handleGenerateQuestions}
                                    disabled={generating || totalCount === 0}
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
                                            Generate {totalCount} Question{totalCount !== 1 ? 's' : ''}
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
