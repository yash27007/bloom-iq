'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  CheckCircle,
  XCircle,
  Edit3,
  Save,
  X,
  Clock,
  BookOpen,
  Target,
  AlertCircle
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

interface QuestionReviewCardProps {
  question: Question;
  onApprove: (questionId: string) => Promise<void>;
  onReject: (questionId: string, reason: string) => Promise<void>;
  onEdit: (questionId: string, updates: Partial<Question>) => Promise<void>;
  isSubmitting?: boolean;
}

export function QuestionReviewCard({
  question,
  onApprove,
  onReject,
  onEdit,
  isSubmitting = false
}: QuestionReviewCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedQuestion, setEditedQuestion] = useState(question.questionText);
  const [editedAnswer, setEditedAnswer] = useState(question.sampleAnswer);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);

  const handleSaveEdit = async () => {
    try {
      await onEdit(question.id, {
        questionText: editedQuestion,
        sampleAnswer: editedAnswer
      });
      setIsEditing(false);
      toast.success('Question updated successfully!');
    } catch (error) {
      toast.error('Failed to update question');
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      await onReject(question.id, rejectionReason);
      setShowRejectForm(false);
      setRejectionReason('');
      toast.success('Question rejected');
    } catch (error) {
      toast.error('Failed to reject question');
    }
  };

  const getMarksDisplay = (marks: string) => {
    switch (marks) {
      case 'TWO_MARKS': return '2';
      case 'EIGHT_MARKS': return '8';
      case 'SIXTEEN_MARKS': return '16';
      default: return marks;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACCEPTED': return 'bg-green-100 text-green-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      case 'UNDER_REVIEW_FROM_PROGRAM_COORDINATOR': return 'bg-yellow-100 text-yellow-800';
      case 'UNDER_REVIEW_FROM_MODULE_COORDINATOR': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'CREATED_BY_COURSE_COORDINATOR': return 'Draft';
      case 'UNDER_REVIEW_FROM_PROGRAM_COORDINATOR': return 'Under Program Review';
      case 'UNDER_REVIEW_FROM_MODULE_COORDINATOR': return 'Under Module Review';
      case 'ACCEPTED': return 'Approved';
      case 'REJECTED': return 'Rejected';
      default: return status;
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {question.questionType.replace('_', ' ')}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {question.bloomLevel}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {getMarksDisplay(question.marks)} marks
              </Badge>
              <Badge
                className={`text-xs ${getStatusColor(question.status)}`}
                variant="secondary"
              >
                {getStatusText(question.status)}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <BookOpen className="h-4 w-4" />
                Unit {question.unit}
              </div>
              <div className="flex items-center gap-1">
                <Target className="h-4 w-4" />
                {question.topic}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {new Date(question.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>

          {question.status === 'CREATED_BY_COURSE_COORDINATOR' && !isSubmitting && (
            <div className="flex items-center gap-2">
              {!isEditing && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <Edit3 className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowRejectForm(true)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => onApprove(question.id)}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                </>
              )}

              {isEditing && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsEditing(false);
                      setEditedQuestion(question.questionText);
                      setEditedAnswer(question.sampleAnswer);
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSaveEdit}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                </>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <Label className="text-sm font-medium">Question:</Label>
          {isEditing ? (
            <Textarea
              value={editedQuestion}
              onChange={(e) => setEditedQuestion(e.target.value)}
              className="mt-2"
              rows={3}
            />
          ) : (
            <p className="mt-2 text-sm leading-relaxed">{question.questionText}</p>
          )}
        </div>

        {question.options && (
          <div>
            <Label className="text-sm font-medium">Options:</Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div className="text-sm">A) {question.options.a}</div>
              <div className="text-sm">B) {question.options.b}</div>
              <div className="text-sm">C) {question.options.c}</div>
              <div className="text-sm">D) {question.options.d}</div>
            </div>
            {question.correctAnswer && (
              <p className="mt-2 text-sm text-green-600 font-medium">
                Correct Answer: {question.correctAnswer}
              </p>
            )}
          </div>
        )}

        <Separator />

        <div>
          <Label className="text-sm font-medium">Sample Answer:</Label>
          {isEditing ? (
            <Textarea
              value={editedAnswer}
              onChange={(e) => setEditedAnswer(e.target.value)}
              className="mt-2"
              rows={4}
            />
          ) : (
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {question.sampleAnswer}
            </p>
          )}
        </div>

        {showRejectForm && (
          <div className="border rounded-lg p-4 bg-red-50">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <Label className="text-sm font-medium text-red-800">
                Reason for Rejection:
              </Label>
            </div>
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Please provide a reason for rejecting this question..."
              className="mb-3"
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowRejectForm(false);
                  setRejectionReason('');
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleReject}
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
