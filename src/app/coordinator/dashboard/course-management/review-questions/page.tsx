'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import {
    Loader2,
    CheckCircle,
    Trash2,
    Edit,
    Save,
    X,
    Download,
    ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';
import { trpc } from '@/trpc/client';
import { exportQuestionsToPDF } from '@/lib/pdf-export';
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

interface TempQuestion {
    id: string;
    question: string;
    answer: string;
    difficultyLevel: 'EASY' | 'MEDIUM' | 'HARD';
    bloomLevel: 'REMEMBER' | 'UNDERSTAND' | 'APPLY' | 'ANALYZE' | 'EVALUATE' | 'CREATE';
    generationType: 'DIRECT' | 'INDIRECT' | 'SCENARIO_BASED' | 'PROBLEM_BASED';
    marks: 'TWO' | 'EIGHT' | 'SIXTEEN';
}

export default function ReviewQuestionsPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const sessionId = searchParams.get('session');

    const [questions, setQuestions] = useState<TempQuestion[]>([]);
    const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<Partial<TempQuestion>>({});
    const [loading, setLoading] = useState(true);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [questionToDelete, setQuestionToDelete] = useState<string | null>(null);

    // Load temp questions from session
    useEffect(() => {
        if (!sessionId) {
            toast.error('No session ID provided');
            router.push('/coordinator/dashboard/course-management/generate-questions');
            return;
        }

        // Get from sessionStorage
        const storedQuestions = sessionStorage.getItem(`temp_questions_${sessionId}`);
        if (storedQuestions) {
            try {
                const parsed = JSON.parse(storedQuestions);
                setQuestions(parsed);
            } catch (error) {
                console.error('Failed to parse questions:', error);
                toast.error('Failed to load questions');
            }
        } else {
            toast.error('No questions found for this session');
            router.push('/coordinator/dashboard/course-management/generate-questions');
        }
        setLoading(false);
    }, [sessionId, router]);

    // Mutation to save approved questions to DB
    const saveQuestionsMutation = trpc.coordinator.saveReviewedQuestions.useMutation({
        onSuccess: () => {
            toast.success('Questions saved to question bank successfully!');
            sessionStorage.removeItem(`temp_questions_${sessionId}`);
            sessionStorage.removeItem(`temp_metadata_${sessionId}`);
            router.push('/coordinator/dashboard/question-paper/question-bank');
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message || 'Failed to save questions');
        },
    });

    // Toggle question selection
    const toggleQuestion = (id: string) => {
        const newSelected = new Set(selectedQuestions);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedQuestions(newSelected);
    };

    // Select/Deselect all
    const toggleSelectAll = () => {
        if (selectedQuestions.size === questions.length) {
            setSelectedQuestions(new Set());
        } else {
            setSelectedQuestions(new Set(questions.map(q => q.id)));
        }
    };

    // Start editing
    const startEdit = (question: TempQuestion) => {
        setEditingId(question.id);
        setEditForm(question);
    };

    // Save edit
    const saveEdit = () => {
        if (!editingId) return;

        setQuestions(questions.map(q =>
            q.id === editingId ? { ...q, ...editForm } as TempQuestion : q
        ));
        setEditingId(null);
        setEditForm({});
        toast.success('Question updated');
    };

    // Cancel edit
    const cancelEdit = () => {
        setEditingId(null);
        setEditForm({});
    };

    // Delete question
    const deleteQuestion = (id: string) => {
        setQuestions(questions.filter(q => q.id !== id));
        selectedQuestions.delete(id);
        setSelectedQuestions(new Set(selectedQuestions));
        toast.success('Question deleted');
        setDeleteDialogOpen(false);
        setQuestionToDelete(null);
    };

    // Delete selected questions
    const deleteSelected = () => {
        setQuestions(questions.filter(q => !selectedQuestions.has(q.id)));
        setSelectedQuestions(new Set());
        toast.success(`${selectedQuestions.size} questions deleted`);
    };

    // Export as PDF (questions only)
    const exportQuestionsOnly = () => {
        if (questions.length === 0) {
            toast.error('No questions to export');
            return;
        }

        try {
            exportQuestionsToPDF(
                questions.map(q => ({
                    question: q.question,
                    answer: q.answer,
                    marks: q.marks,
                    difficultyLevel: q.difficultyLevel,
                    bloomLevel: q.bloomLevel,
                    generationType: q.generationType
                })),
                {
                    includeAnswers: false,
                    includeMetadata: true,
                    courseName: 'Question Review',
                    title: 'Generated Questions - Review'
                }
            );
            toast.success('Opening PDF export dialog...');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to export');
        }
    };

    // Export as PDF (questions with answers)
    const exportWithAnswers = () => {
        if (questions.length === 0) {
            toast.error('No questions to export');
            return;
        }

        try {
            exportQuestionsToPDF(
                questions.map(q => ({
                    question: q.question,
                    answer: q.answer,
                    marks: q.marks,
                    difficultyLevel: q.difficultyLevel,
                    bloomLevel: q.bloomLevel,
                    generationType: q.generationType
                })),
                {
                    includeAnswers: true,
                    includeMetadata: true,
                    courseName: 'Question Review',
                    title: 'Generated Questions with Answers - Review'
                }
            );
            toast.success('Opening PDF export dialog...');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Failed to export');
        }
    };

    // Approve and save to DB
    const approveAndSave = () => {
        if (questions.length === 0) {
            toast.error('No questions to save');
            return;
        }

        const metadata = sessionStorage.getItem(`temp_metadata_${sessionId}`);
        if (!metadata) {
            toast.error('Session metadata not found');
            return;
        }

        const { courseId, materialId, unit } = JSON.parse(metadata);

        const questionsToSave = questions.map(q => ({
            question: q.question,
            answer: q.answer,
            difficultyLevel: q.difficultyLevel,
            bloomLevel: q.bloomLevel,
            generationType: q.generationType,
            marks: q.marks,
        }));

        console.log('[DEBUG] Saving questions:', questionsToSave);
        console.log('[DEBUG] First question marks:', questionsToSave[0]?.marks, typeof questionsToSave[0]?.marks);

        saveQuestionsMutation.mutate({
            courseId,
            materialId,
            unit,
            questions: questionsToSave,
        });
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
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => router.back()}
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back
                            </Button>
                        </div>
                        <h1 className="text-3xl font-semibold tracking-tight text-foreground">
                            Review Generated Questions
                        </h1>
                        <p className="text-muted-foreground">
                            Review, edit, and approve questions before adding to question bank
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={exportQuestionsOnly}
                            disabled={questions.length === 0}
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Export Questions
                        </Button>
                        <Button
                            variant="outline"
                            onClick={exportWithAnswers}
                            disabled={questions.length === 0}
                        >
                            <Download className="mr-2 h-4 w-4" />
                            Export with Answers
                        </Button>
                    </div>
                </div>

                {/* Actions Bar */}
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        checked={selectedQuestions.size === questions.length && questions.length > 0}
                                        onCheckedChange={toggleSelectAll}
                                    />
                                    <span className="text-sm font-medium">
                                        Select All ({questions.length} questions)
                                    </span>
                                </div>
                                {selectedQuestions.size > 0 && (
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={deleteSelected}
                                    >
                                        <Trash2 className="mr-2 h-4 w-4" />
                                        Delete Selected ({selectedQuestions.size})
                                    </Button>
                                )}
                            </div>

                            <Button
                                onClick={approveAndSave}
                                disabled={questions.length === 0 || saveQuestionsMutation.isPending}
                                size="lg"
                            >
                                {saveQuestionsMutation.isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <CheckCircle className="mr-2 h-4 w-4" />
                                        Approve & Save to Question Bank
                                    </>
                                )}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Questions List */}
                <div className="space-y-4">
                    {questions.map((question, index) => (
                        <Card key={question.id} className="border-l-4 border-l-blue-500">
                            <CardContent className="pt-6">
                                <div className="space-y-4">
                                    {/* Question Header */}
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-3">
                                            <Checkbox
                                                checked={selectedQuestions.has(question.id)}
                                                onCheckedChange={() => toggleQuestion(question.id)}
                                            />
                                            <div className="space-y-2">
                                                <div className="text-sm font-medium text-muted-foreground">
                                                    Question {index + 1}
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    <Badge variant={question.difficultyLevel === 'EASY' ? 'secondary' : question.difficultyLevel === 'MEDIUM' ? 'default' : 'destructive'}>
                                                        {question.difficultyLevel}
                                                    </Badge>
                                                    <Badge variant="outline">{question.bloomLevel}</Badge>
                                                    <Badge variant="outline">{question.generationType}</Badge>
                                                    <Badge variant="outline">{question.marks} marks</Badge>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            {editingId === question.id ? (
                                                <>
                                                    <Button size="sm" onClick={saveEdit}>
                                                        <Save className="h-3 w-3 mr-1" />
                                                        Save
                                                    </Button>
                                                    <Button size="sm" variant="outline" onClick={cancelEdit}>
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                </>
                                            ) : (
                                                <>
                                                    <Button
                                                        size="sm"
                                                        variant="outline"
                                                        onClick={() => startEdit(question)}
                                                    >
                                                        <Edit className="h-3 w-3 mr-1" />
                                                        Edit
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        onClick={() => {
                                                            setQuestionToDelete(question.id);
                                                            setDeleteDialogOpen(true);
                                                        }}
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    <Separator />

                                    {/* Question Content */}
                                    {editingId === question.id ? (
                                        <div className="space-y-4 pl-8">
                                            <div className="space-y-2">
                                                <Label>Question</Label>
                                                <Textarea
                                                    value={editForm.question || ''}
                                                    onChange={(e) => setEditForm({ ...editForm, question: e.target.value })}
                                                    rows={3}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>Answer</Label>
                                                <Textarea
                                                    value={editForm.answer || ''}
                                                    onChange={(e) => setEditForm({ ...editForm, answer: e.target.value })}
                                                    rows={4}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4 pl-8">
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Question:</Label>
                                                <p className="text-sm bg-gray-50 dark:bg-gray-900 p-3 rounded whitespace-pre-wrap">
                                                    {question.question}
                                                </p>
                                            </div>
                                            <div className="space-y-2">
                                                <Label className="text-sm font-medium">Answer:</Label>
                                                <p className="text-sm bg-green-50 dark:bg-green-950 p-3 rounded whitespace-pre-wrap">
                                                    {question.answer}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {questions.length === 0 && (
                    <Card>
                        <CardContent className="pt-6 text-center py-12">
                            <p className="text-muted-foreground">No questions to review</p>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Question</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this question? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => questionToDelete && deleteQuestion(questionToDelete)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
