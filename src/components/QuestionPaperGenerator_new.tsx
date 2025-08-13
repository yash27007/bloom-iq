'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Settings, Eye, Download, Plus, BookOpen } from 'lucide-react';
import { QuestionPaperPatternEditor } from './QuestionPaperPatternEditor';
import { QuestionPaperPreview } from './QuestionPaperPreview';
import { toast } from 'sonner';

type Course = {
  id: string;
  courseCode: string;
  courseName: string;
  courseCoordinatorId: string;
  moduleCoordinatorId: string;
  programCoordinatorId: string;
};

type QuestionPaperPattern = {
  id: string;
  title: string;
  duration: number;
  totalMarks: number;
  instructions: string[];
  slots: Array<{
    id: string;
    questionNo: string;
    part: 'A' | 'B' | 'C';
    marks: number;
    bloomLevel: string;
    unit: number;
    isOrQuestion: boolean;
    orPairId?: string;
    description?: string;
  }>;
};

interface QuestionPaperGeneratorProps {
  courses: Course[];
  onGenerate: (config: any) => Promise<void>;
  isGenerating: boolean;
}

export function QuestionPaperGenerator({
  courses,
  onGenerate,
  isGenerating
}: QuestionPaperGeneratorProps) {
  const [activeTab, setActiveTab] = useState('patterns');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [currentPattern, setCurrentPattern] = useState<QuestionPaperPattern | null>(null);
  const [savedPatterns, setSavedPatterns] = useState<QuestionPaperPattern[]>([]);

  const handleSavePattern = (pattern: QuestionPaperPattern) => {
    const savedPattern = {
      ...pattern,
      id: pattern.id || `pattern_${Date.now()}`,
    };

    setSavedPatterns(prev => {
      const existing = prev.findIndex(p => p.id === savedPattern.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = savedPattern;
        return updated;
      }
      return [...prev, savedPattern];
    });

    setCurrentPattern(savedPattern);
    toast.success('Pattern saved successfully!');
  };

  const handlePreviewPattern = (pattern: QuestionPaperPattern) => {
    setCurrentPattern(pattern);
    setActiveTab('preview');
  };

  const handleGenerateQuestions = async (pattern: QuestionPaperPattern) => {
    if (!selectedCourse) {
      toast.error('Please select a course first');
      return;
    }

    try {
      await onGenerate({
        courseId: selectedCourse.id,
        pattern,
      });
      toast.success('Question generation started!');
    } catch (error) {
      toast.error('Failed to start question generation');
    }
  };

  const handleDownloadPDF = () => {
    if (!currentPattern) return;

    // Create a simple PDF content
    const content = `
      ${currentPattern.title}
      
      Duration: ${Math.floor(currentPattern.duration / 60)}h ${currentPattern.duration % 60}m
      Total Marks: ${currentPattern.totalMarks}
      
      Instructions:
      ${currentPattern.instructions.map((inst, i) => `${i + 1}. ${inst}`).join('\n')}
      
      Questions:
      ${currentPattern.slots.map(slot =>
      `${slot.questionNo}. [${slot.bloomLevel} - ${slot.marks} marks - Unit ${slot.unit}]`
    ).join('\n')}
    `;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentPattern.title.replace(/\s+/g, '_')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-900">
            <BookOpen className="h-5 w-5" />
            Question Paper Generator
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Select Course</label>
                <Select
                  value={selectedCourse?.id || ''}
                  onValueChange={(value) => {
                    const course = courses.find(c => c.id === value);
                    setSelectedCourse(course || null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a course..." />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.courseCode} - {course.courseName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Saved Patterns</label>
                <Select
                  value={currentPattern?.id || ''}
                  onValueChange={(value) => {
                    const pattern = savedPatterns.find(p => p.id === value);
                    setCurrentPattern(pattern || null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Load saved pattern..." />
                  </SelectTrigger>
                  <SelectContent>
                    {savedPatterns.map((pattern) => (
                      <SelectItem key={pattern.id} value={pattern.id}>
                        {pattern.title} ({pattern.totalMarks} marks)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedCourse && (
              <div className="bg-white rounded-lg p-4 border">
                <h4 className="font-medium text-gray-900">{selectedCourse.courseCode}</h4>
                <p className="text-sm text-gray-600">{selectedCourse.courseName}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="patterns" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Pattern Editor
          </TabsTrigger>
          <TabsTrigger value="preview" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Preview & Download
          </TabsTrigger>
        </TabsList>

        <TabsContent value="patterns" className="space-y-6">
          <QuestionPaperPatternEditor
            onSavePattern={handleSavePattern}
            onPreviewPattern={handlePreviewPattern}
            onGenerateQuestions={handleGenerateQuestions}
            existingPattern={currentPattern || undefined}
          />
        </TabsContent>

        <TabsContent value="preview" className="space-y-6">
          {currentPattern ? (
            <QuestionPaperPreview
              pattern={currentPattern}
              onClose={() => setActiveTab('patterns')}
              onDownloadPDF={handleDownloadPDF}
              courseInfo={selectedCourse ? {
                courseCode: selectedCourse.courseCode,
                courseName: selectedCourse.courseName,
                semester: 'VI',
                year: '2024'
              } : undefined}
            />
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No Pattern Selected</h3>
                <p className="text-gray-600 mb-4">
                  Create or load a question paper pattern to preview and download.
                </p>
                <Button onClick={() => setActiveTab('patterns')}>
                  Create Pattern
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
