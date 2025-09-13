'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { QuestionReviewCard } from './QuestionReviewCard';
import {
  Search,
  CheckCircle,
  XCircle,
  Send,
  FileText,
  BarChart3,
  RefreshCw,
  Package,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner';

type Question = {
  id: string;
  questionText: string;
  questionType: 'STRAIGHTFORWARD' | 'PROBLEM_BASED' | 'SCENARIO_BASED';
  bloomLevel: 'REMEMBER' | 'UNDERSTAND' | 'APPLY' | 'ANALYZE' | 'EVALUATE' | 'CREATE';
  difficultyLevel: 'EASY' | 'MEDIUM' | 'HARD';
  marks: 'TWO_MARKS' | 'EIGHT_MARKS' | 'SIXTEEN_MARKS';
  unit: number;
  topic: string;
  status: 'CREATED_BY_COURSE_COORDINATOR' | 'UNDER_REVIEW_FROM_PROGRAM_COORDINATOR' | 'UNDER_REVIEW_FROM_MODULE_COORDINATOR' | 'ACCEPTED' | 'REJECTED';
  options?: {
    a: string;
    b: string;
    c: string;
    d: string;
  };
  correctAnswer?: string;
  sampleAnswer: string;
  createdAt: Date;
};

interface QuestionBankProps {
  questions: Question[];
  isLoading: boolean;
  onRefresh: () => void;
  onApproveQuestion: (questionId: string) => Promise<void>;
  onRejectQuestion: (questionId: string, reason: string) => Promise<void>;
  onEditQuestion: (questionId: string, updates: Partial<Question>) => Promise<void>;
  onSubmitQuestions: (questionIds: string[]) => Promise<void>;
  onDeleteQuestion?: (questionId: string) => Promise<void>;
  onDeleteMultipleQuestions?: (questionIds: string[]) => Promise<void>;
  totalQuestions?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  questionsPerPage?: number;
}

export function QuestionBank({
  questions,
  isLoading,
  onRefresh,
  onApproveQuestion,
  onRejectQuestion,
  onEditQuestion,
  onSubmitQuestions,
  onDeleteQuestion,
  onDeleteMultipleQuestions,
  totalQuestions = 0,
  currentPage = 1,
  onPageChange,
  questionsPerPage = 20
}: QuestionBankProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterUnit, setFilterUnit] = useState<string>('all');
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter questions based on search and filters
  const filteredQuestions = questions.filter(question => {
    const matchesSearch = question.questionText.toLowerCase().includes(searchTerm.toLowerCase()) ||
      question.topic.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'all' || question.questionType === filterType;
    const matchesStatus = filterStatus === 'all' || question.status === filterStatus;
    const matchesUnit = filterUnit === 'all' || question.unit.toString() === filterUnit;

    return matchesSearch && matchesType && matchesStatus && matchesUnit;
  });

  // Get statistics
  const stats = {
    total: questions.length,
    draft: questions.filter(q => q.status === 'CREATED_BY_COURSE_COORDINATOR').length,
    approved: questions.filter(q => q.status === 'ACCEPTED').length,
    rejected: questions.filter(q => q.status === 'REJECTED').length,
    underReview: questions.filter(q =>
      q.status === 'UNDER_REVIEW_FROM_PROGRAM_COORDINATOR' ||
      q.status === 'UNDER_REVIEW_FROM_MODULE_COORDINATOR'
    ).length
  };

  const handleSelectQuestion = (questionId: string, selected: boolean) => {
    const newSelected = new Set(selectedQuestions);
    if (selected) {
      newSelected.add(questionId);
    } else {
      newSelected.delete(questionId);
    }
    setSelectedQuestions(newSelected);
  };

  const handleSelectAll = () => {
    const draftQuestions = filteredQuestions
      .filter(q => q.status === 'CREATED_BY_COURSE_COORDINATOR')
      .map(q => q.id);

    if (selectedQuestions.size === draftQuestions.length) {
      setSelectedQuestions(new Set());
    } else {
      setSelectedQuestions(new Set(draftQuestions));
    }
  };

  const handleSubmitSelected = async () => {
    if (selectedQuestions.size === 0) {
      toast.error('Please select questions to submit');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmitQuestions(Array.from(selectedQuestions));
      setSelectedQuestions(new Set());
      toast.success(`${selectedQuestions.size} questions submitted for review!`);
    } catch (error) {
      toast.error('Failed to submit questions');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedQuestions.size === 0) {
      toast.error('Please select questions to delete');
      return;
    }

    if (!onDeleteMultipleQuestions) return;

    if (window.confirm(`Are you sure you want to delete ${selectedQuestions.size} selected questions? This action cannot be undone.`)) {
      setIsSubmitting(true);
      try {
        await onDeleteMultipleQuestions(Array.from(selectedQuestions));
        setSelectedQuestions(new Set());
        toast.success(`${selectedQuestions.size} questions deleted successfully!`);
      } catch (error) {
        toast.error('Failed to delete questions');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const draftQuestions = filteredQuestions.filter(q => q.status === 'CREATED_BY_COURSE_COORDINATOR');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Question Bank</CardTitle>
            <CardDescription>Loading questions...</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <RefreshCw className="h-8 w-8 mx-auto text-muted-foreground animate-spin mb-4" />
              <p className="text-muted-foreground">Loading questions...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Question Bank</CardTitle>
            <CardDescription>
              AI-generated questions from your uploaded materials. Review and approve questions for exam papers.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No questions generated yet</p>
              <p className="text-sm text-muted-foreground mt-2">
                Upload materials and use AI Question Generation to create questions.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Question Bank</CardTitle>
              <CardDescription>
                Review, edit, and submit AI-generated questions for exam papers.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={onRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <FileText className="h-8 w-8 mx-auto text-blue-600 mb-2" />
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Total Questions</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="h-8 w-8 mx-auto text-orange-600 mb-2" />
              <div className="text-2xl font-bold">{stats.draft}</div>
              <p className="text-xs text-muted-foreground">Draft</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <BarChart3 className="h-8 w-8 mx-auto text-yellow-600 mb-2" />
              <div className="text-2xl font-bold">{stats.underReview}</div>
              <p className="text-xs text-muted-foreground">Under Review</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle className="h-8 w-8 mx-auto text-green-600 mb-2" />
              <div className="text-2xl font-bold">{stats.approved}</div>
              <p className="text-xs text-muted-foreground">Approved</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <XCircle className="h-8 w-8 mx-auto text-red-600 mb-2" />
              <div className="text-2xl font-bold">{stats.rejected}</div>
              <p className="text-xs text-muted-foreground">Rejected</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div>
              <Label htmlFor="search">Search Questions</Label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search questions or topics..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="filter-type">Question Type</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger id="filter-type">
                  <SelectValue placeholder="All Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="STRAIGHTFORWARD">Straightforward</SelectItem>
                  <SelectItem value="PROBLEM_BASED">Problem Based</SelectItem>
                  <SelectItem value="SCENARIO_BASED">Scenario Based</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="filter-status">Status</Label>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger id="filter-status">
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="CREATED_BY_COURSE_COORDINATOR">Draft</SelectItem>
                  <SelectItem value="UNDER_REVIEW_FROM_PROGRAM_COORDINATOR">Program Review</SelectItem>
                  <SelectItem value="UNDER_REVIEW_FROM_MODULE_COORDINATOR">Module Review</SelectItem>
                  <SelectItem value="ACCEPTED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="filter-unit">Unit</Label>
              <Select value={filterUnit} onValueChange={setFilterUnit}>
                <SelectTrigger id="filter-unit">
                  <SelectValue placeholder="All Units" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Units</SelectItem>
                  {[...new Set(questions.map(q => q.unit))].sort().map(unit => (
                    <SelectItem key={unit} value={unit.toString()}>
                      Unit {unit}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Bulk Actions */}
          {draftQuestions.length > 0 && (
            <div className="flex items-center justify-between pt-4 border-t">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  {selectedQuestions.size === draftQuestions.length ? 'Deselect All' : 'Select All Draft'}
                </Button>
                <span className="text-sm text-muted-foreground">
                  {selectedQuestions.size} of {draftQuestions.length} draft questions selected
                </span>
              </div>

              {selectedQuestions.size > 0 && (
                <div className="flex gap-2">
                  <Button
                    onClick={handleSubmitSelected}
                    disabled={isSubmitting}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {isSubmitting ? 'Submitting...' : `Submit ${selectedQuestions.size} Questions`}
                  </Button>
                  {onDeleteMultipleQuestions && (
                    <Button
                      onClick={handleDeleteSelected}
                      disabled={isSubmitting}
                      variant="destructive"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Delete Selected
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Questions List */}
      <div className="space-y-4">
        {filteredQuestions.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-8">
                <Search className="h-8 w-8 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No questions match your filters</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Try adjusting your search terms or filters.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          filteredQuestions.map(question => (
            <div key={question.id} className="relative">
              {question.status === 'CREATED_BY_COURSE_COORDINATOR' && (
                <div className="absolute left-2 top-4 z-10">
                  <input
                    type="checkbox"
                    checked={selectedQuestions.has(question.id)}
                    onChange={(e) => handleSelectQuestion(question.id, e.target.checked)}
                    className="rounded border-gray-300"
                  />
                </div>
              )}
              <div className={question.status === 'CREATED_BY_COURSE_COORDINATOR' ? 'ml-8' : ''}>
                <QuestionReviewCard
                  question={question}
                  onApprove={onApproveQuestion}
                  onReject={onRejectQuestion}
                  onEdit={onEditQuestion}
                  onDelete={onDeleteQuestion}
                  isSubmitting={isSubmitting}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {totalQuestions > questionsPerPage && onPageChange && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {((currentPage - 1) * questionsPerPage) + 1} to {Math.min(currentPage * questionsPerPage, totalQuestions)} of {totalQuestions} questions
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>

                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.ceil(totalQuestions / questionsPerPage) }, (_, i) => {
                    const page = i + 1;
                    const isVisible =
                      page === 1 ||
                      page === Math.ceil(totalQuestions / questionsPerPage) ||
                      (page >= currentPage - 2 && page <= currentPage + 2);

                    if (!isVisible && page === currentPage - 3) {
                      return <span key={page} className="px-1">...</span>;
                    }
                    if (!isVisible && page === currentPage + 3) {
                      return <span key={page} className="px-1">...</span>;
                    }
                    if (!isVisible) return null;

                    return (
                      <Button
                        key={page}
                        variant={page === currentPage ? "default" : "outline"}
                        size="sm"
                        onClick={() => onPageChange(page)}
                        className="w-8 h-8 p-0"
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange(currentPage + 1)}
                  disabled={currentPage >= Math.ceil(totalQuestions / questionsPerPage)}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
