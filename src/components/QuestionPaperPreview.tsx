'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Download, Printer, ArrowLeft } from 'lucide-react';

type BloomLevel = 'REMEMBER' | 'UNDERSTAND' | 'APPLY' | 'ANALYZE' | 'EVALUATE' | 'CREATE';

type QuestionSlot = {
  id: string;
  questionNo: string;
  part: 'A' | 'B' | 'C';
  marks: number;
  bloomLevel: BloomLevel;
  unit: number;
  isOrQuestion: boolean;
  orPairId?: string;
  description?: string;
};

type QuestionPaperPattern = {
  id: string;
  title: string;
  duration: number;
  totalMarks: number;
  instructions: string[];
  slots: QuestionSlot[];
};

interface QuestionPaperPreviewProps {
  pattern: QuestionPaperPattern;
  onClose: () => void;
  onDownloadPDF: () => void;
  courseInfo?: {
    courseCode: string;
    courseName: string;
    semester: string;
    year: string;
  };
}

export function QuestionPaperPreview({
  pattern,
  onClose,
  onDownloadPDF,
  courseInfo
}: QuestionPaperPreviewProps) {
  const groupSlotsByPart = () => {
    const grouped = pattern.slots.reduce((acc, slot) => {
      if (!acc[slot.part]) acc[slot.part] = [];
      acc[slot.part].push(slot);
      return acc;
    }, {} as Record<string, QuestionSlot[]>);

    // Sort each part by question number
    Object.keys(grouped).forEach(part => {
      grouped[part].sort((a, b) => a.questionNo.localeCompare(b.questionNo));
    });

    return grouped;
  };

  const groupedSlots = groupSlotsByPart();

  const getPartInstructions = (part: string) => {
    const partSlots = groupedSlots[part] || [];
    const orGroups = partSlots.filter(slot => slot.isOrQuestion).length / 2;
    const regularQuestions = partSlots.filter(slot => !slot.isOrQuestion).length;

    if (part === 'A') {
      return `Answer ALL questions. Each question carries ${partSlots[0]?.marks || 2} marks.`;
    } else if (part === 'B') {
      if (orGroups > 0) {
        return `Answer any ${orGroups} questions. Each question carries ${partSlots[0]?.marks || 16} marks.`;
      } else {
        return `Answer any ${Math.min(5, regularQuestions)} questions. Each question carries ${partSlots[0]?.marks || 16} marks.`;
      }
    }
    return '';
  };

  const formatOrQuestions = (slots: QuestionSlot[]) => {
    const orGroups: Record<string, QuestionSlot[]> = {};
    const regularQuestions: QuestionSlot[] = [];

    slots.forEach(slot => {
      if (slot.isOrQuestion && slot.orPairId) {
        if (!orGroups[slot.orPairId]) orGroups[slot.orPairId] = [];
        orGroups[slot.orPairId].push(slot);
      } else {
        regularQuestions.push(slot);
      }
    });

    return { orGroups, regularQuestions };
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onClose}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Editor
        </Button>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="h-4 w-4 mr-2" />
            Print
          </Button>
          <Button onClick={onDownloadPDF}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      {/* Question Paper Preview */}
      <Card className="bg-white shadow-2xl">
        <CardContent className="p-8 print:p-6">
          {/* Header */}
          <div className="text-center space-y-4 mb-8">
            <div className="border-2 border-gray-800 p-4">
              <h1 className="text-2xl font-bold uppercase tracking-wide">
                {courseInfo?.courseCode || 'COURSE CODE'} - {courseInfo?.courseName || 'COURSE NAME'}
              </h1>
              <h2 className="text-xl font-semibold mt-2">
                {pattern.title}
              </h2>
              <div className="flex justify-between items-center mt-4 text-sm">
                <span>Semester: {courseInfo?.semester || 'VI'}</span>
                <span>Year: {courseInfo?.year || '2024'}</span>
              </div>
            </div>

            <div className="flex justify-between items-center text-sm font-medium border-b-2 border-gray-300 pb-2">
              <span>Time: {Math.floor(pattern.duration / 60)}h {pattern.duration % 60}m</span>
              <span>Maximum Marks: {pattern.totalMarks}</span>
            </div>
          </div>

          {/* Instructions */}
          <div className="mb-8">
            <h3 className="text-lg font-bold mb-3 underline">INSTRUCTIONS:</h3>
            <ol className="space-y-1 text-sm">
              {pattern.instructions.map((instruction, index) => (
                <li key={index} className="flex">
                  <span className="mr-2">{index + 1}.</span>
                  <span>{instruction}</span>
                </li>
              ))}
            </ol>
          </div>

          {/* Question Parts */}
          {Object.entries(groupedSlots).map(([part, slots]) => {
            const { orGroups, regularQuestions } = formatOrQuestions(slots);

            return (
              <div key={part} className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold border-b-2 border-gray-800 pb-1">
                    PART {part}
                  </h3>
                  <div className="text-sm text-gray-600">
                    {slots.reduce((sum, slot) => sum + slot.marks, 0)} Marks
                  </div>
                </div>

                <p className="text-sm font-medium mb-4 italic">
                  {getPartInstructions(part)}
                </p>

                <div className="space-y-4">
                  {/* Regular Questions */}
                  {regularQuestions.map((slot, index) => (
                    <div key={slot.id} className="space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <span className="font-bold">{slot.questionNo}.</span>
                          <span className="ml-2 text-gray-700">
                            [Sample {slot.bloomLevel} question for Unit {slot.unit}]
                          </span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          ({slot.marks} marks)
                        </Badge>
                      </div>
                    </div>
                  ))}

                  {/* OR Questions */}
                  {Object.entries(orGroups).map(([orPairId, orSlots]) => (
                    <div key={orPairId} className="border-l-4 border-gray-300 pl-4 space-y-3">
                      {orSlots.map((slot, index) => (
                        <div key={slot.id}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <span className="font-bold">{slot.questionNo}.</span>
                              <span className="ml-2 text-gray-700">
                                [Sample {slot.bloomLevel} question for Unit {slot.unit}]
                              </span>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              ({slot.marks} marks)
                            </Badge>
                          </div>
                          {index === 0 && orSlots.length > 1 && (
                            <div className="text-center my-2">
                              <span className="bg-gray-100 px-3 py-1 rounded text-sm font-bold">OR</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Footer */}
          <div className="mt-12 pt-4 border-t-2 border-gray-300">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Generated by BloomIQ AI Question Paper System</span>
              <span>Date: {new Date().toLocaleDateString()}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pattern Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Pattern Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="space-y-1">
              <div className="font-medium text-gray-500">Total Questions</div>
              <div className="text-lg font-bold">{pattern.slots.length}</div>
            </div>
            <div className="space-y-1">
              <div className="font-medium text-gray-500">Total Marks</div>
              <div className="text-lg font-bold">{pattern.totalMarks}</div>
            </div>
            <div className="space-y-1">
              <div className="font-medium text-gray-500">Duration</div>
              <div className="text-lg font-bold">{pattern.duration}m</div>
            </div>
            <div className="space-y-1">
              <div className="font-medium text-gray-500">OR Questions</div>
              <div className="text-lg font-bold">
                {pattern.slots.filter(slot => slot.isOrQuestion).length / 2}
              </div>
            </div>
          </div>

          <Separator className="my-4" />

          <div className="space-y-2">
            <div className="font-medium text-gray-500">Bloom Level Distribution</div>
            <div className="flex flex-wrap gap-2">
              {['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE'].map(level => {
                const count = pattern.slots.filter(slot => slot.bloomLevel === level).length;
                return count > 0 ? (
                  <Badge key={level} variant="outline" className="text-xs">
                    {level}: {count}
                  </Badge>
                ) : null;
              })}
            </div>
          </div>

          <div className="space-y-2 mt-4">
            <div className="font-medium text-gray-500">Unit Distribution</div>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map(unit => {
                const count = pattern.slots.filter(slot => slot.unit === unit).length;
                return count > 0 ? (
                  <Badge key={unit} variant="outline" className="text-xs">
                    Unit {unit}: {count} questions
                  </Badge>
                ) : null;
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
