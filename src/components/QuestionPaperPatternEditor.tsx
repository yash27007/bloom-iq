'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, GripVertical, FileText, Download, Eye, Save } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

type BloomLevel = 'REMEMBER' | 'UNDERSTAND' | 'APPLY' | 'ANALYZE' | 'EVALUATE' | 'CREATE';
type QuestionPart = 'A' | 'B' | 'C';

type QuestionSlot = {
  id: string;
  questionNo: string;
  part: QuestionPart;
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

const BLOOM_LEVELS: BloomLevel[] = ['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE'];
const QUESTION_PARTS: QuestionPart[] = ['A', 'B', 'C'];

const DEFAULT_PATTERNS = {
  semester: {
    title: 'Standard Semester Pattern (100 Marks)',
    duration: 180,
    totalMarks: 100,
    instructions: [
      'Answer ALL questions from Part A and any FIVE from Part B',
      'Each question in Part A carries 2 marks',
      'Each question in Part B carries 16 marks',
      'Use only blue/black ink'
    ],
    slots: [
      // Part A - 10 questions x 2 marks = 20 marks
      ...Array.from({ length: 10 }, (_, i) => ({
        id: `a${i + 1}`,
        questionNo: `${i + 1}`,
        part: 'A' as QuestionPart,
        marks: 2,
        bloomLevel: i < 4 ? 'REMEMBER' as BloomLevel : i < 7 ? 'UNDERSTAND' as BloomLevel : 'APPLY' as BloomLevel,
        unit: (i % 5) + 1,
        isOrQuestion: false,
      })),
      // Part B - 5 OR pairs x 16 marks = 80 marks
      ...Array.from({ length: 10 }, (_, i) => {
        const pairIndex = Math.floor(i / 2);
        const isFirstInPair = i % 2 === 0;
        const orPairId = `b_pair_${pairIndex + 1}`;
        return {
          id: `b${i + 1}`,
          questionNo: `${11 + pairIndex}${isFirstInPair ? 'A' : 'B'}`,
          part: 'B' as QuestionPart,
          marks: 16,
          bloomLevel: (['APPLY', 'ANALYZE', 'EVALUATE', 'CREATE'] as BloomLevel[])[pairIndex % 4],
          unit: (pairIndex % 5) + 1,
          isOrQuestion: true,
          orPairId,
        };
      }),
    ],
  },
  midterm: {
    title: 'Mid-Term Pattern (50 Marks)',
    duration: 90,
    totalMarks: 50,
    instructions: [
      'Answer ALL questions from Part A and any THREE from Part B',
      'Each question in Part A carries 2 marks',
      'Each question in Part B carries 12 marks',
    ],
    slots: [
      // Part A - 7 questions x 2 marks = 14 marks
      ...Array.from({ length: 7 }, (_, i) => ({
        id: `ma${i + 1}`,
        questionNo: `${i + 1}`,
        part: 'A' as QuestionPart,
        marks: 2,
        bloomLevel: i < 3 ? 'REMEMBER' as BloomLevel : i < 5 ? 'UNDERSTAND' as BloomLevel : 'APPLY' as BloomLevel,
        unit: (i % 3) + 1,
        isOrQuestion: false,
      })),
      // Part B - 3 OR pairs x 12 marks = 36 marks
      ...Array.from({ length: 6 }, (_, i) => {
        const pairIndex = Math.floor(i / 2);
        const isFirstInPair = i % 2 === 0;
        const orPairId = `mb_pair_${pairIndex + 1}`;
        return {
          id: `mb${i + 1}`,
          questionNo: `${8 + pairIndex}${isFirstInPair ? 'A' : 'B'}`,
          part: 'B' as QuestionPart,
          marks: 12,
          bloomLevel: (['APPLY', 'ANALYZE', 'EVALUATE'] as BloomLevel[])[pairIndex % 3],
          unit: (pairIndex % 3) + 1,
          isOrQuestion: true,
          orPairId,
        };
      }),
    ],
  },
};

interface QuestionPaperPatternEditorProps {
  onSavePattern: (pattern: QuestionPaperPattern) => void;
  onPreviewPattern: (pattern: QuestionPaperPattern) => void;
  onGenerateQuestions: (pattern: QuestionPaperPattern) => void;
  existingPattern?: QuestionPaperPattern;
}

export function QuestionPaperPatternEditor({
  onSavePattern,
  onPreviewPattern,
  onGenerateQuestions,
  existingPattern
}: QuestionPaperPatternEditorProps) {
  const [pattern, setPattern] = useState<QuestionPaperPattern>(
    existingPattern || {
      id: '',
      title: '',
      duration: 180,
      totalMarks: 100,
      instructions: [],
      slots: [],
    }
  );

  const [newInstruction, setNewInstruction] = useState('');

  const getBloomLevelColor = (level: BloomLevel) => {
    const colors = {
      REMEMBER: 'bg-gray-100 text-gray-800 border-gray-300',
      UNDERSTAND: 'bg-blue-100 text-blue-800 border-blue-300',
      APPLY: 'bg-green-100 text-green-800 border-green-300',
      ANALYZE: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      EVALUATE: 'bg-orange-100 text-orange-800 border-orange-300',
      CREATE: 'bg-red-100 text-red-800 border-red-300',
    };
    return colors[level];
  };

  const addNewSlot = () => {
    const newSlot: QuestionSlot = {
      id: `slot_${Date.now()}`,
      questionNo: `${pattern.slots.length + 1}`,
      part: 'A',
      marks: 2,
      bloomLevel: 'REMEMBER',
      unit: 1,
      isOrQuestion: false,
    };
    setPattern(prev => ({
      ...prev,
      slots: [...prev.slots, newSlot],
    }));
  };

  const removeSlot = (slotId: string) => {
    setPattern(prev => ({
      ...prev,
      slots: prev.slots.filter(slot => slot.id !== slotId),
    }));
  };

  const updateSlot = (slotId: string, updates: Partial<QuestionSlot>) => {
    setPattern(prev => ({
      ...prev,
      slots: prev.slots.map(slot =>
        slot.id === slotId ? { ...slot, ...updates } : slot
      ),
    }));
  };

  const loadDefaultPattern = (patternType: 'semester' | 'midterm') => {
    const defaultPattern = DEFAULT_PATTERNS[patternType];
    setPattern({
      id: `pattern_${Date.now()}`,
      ...defaultPattern,
    });
  };

  const addInstruction = () => {
    if (newInstruction.trim()) {
      setPattern(prev => ({
        ...prev,
        instructions: [...prev.instructions, newInstruction.trim()],
      }));
      setNewInstruction('');
    }
  };

  const removeInstruction = (index: number) => {
    setPattern(prev => ({
      ...prev,
      instructions: prev.instructions.filter((_, i) => i !== index),
    }));
  };

  const calculateTotalMarks = () => {
    return pattern.slots.reduce((total, slot) => total + slot.marks, 0);
  };

  const groupSlotsByPart = () => {
    const grouped = pattern.slots.reduce((acc, slot) => {
      if (!acc[slot.part]) acc[slot.part] = [];
      acc[slot.part].push(slot);
      return acc;
    }, {} as Record<QuestionPart, QuestionSlot[]>);

    // Sort each part by question number
    Object.keys(grouped).forEach(part => {
      grouped[part as QuestionPart].sort((a, b) => a.questionNo.localeCompare(b.questionNo));
    });

    return grouped;
  };

  const onDragEnd = (result: any) => {
    if (!result.destination) return;

    const items = Array.from(pattern.slots);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setPattern(prev => ({ ...prev, slots: items }));
  };

  const groupedSlots = groupSlotsByPart();

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-indigo-900">
            <FileText className="h-5 w-5" />
            Question Paper Pattern Editor
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Paper Title</Label>
              <Input
                id="title"
                value={pattern.title}
                onChange={(e) => setPattern(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Final Examination - 2024"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                value={pattern.duration}
                onChange={(e) => setPattern(prev => ({ ...prev, duration: parseInt(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Total Marks (Calculated)</Label>
              <div className="p-2 bg-white rounded border">
                <span className="text-lg font-bold text-indigo-600">{calculateTotalMarks()}</span>
              </div>
            </div>
          </div>

          {/* Quick Load Patterns */}
          <div className="flex space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadDefaultPattern('semester')}
            >
              Load Semester Pattern (100M)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadDefaultPattern('midterm')}
            >
              Load Midterm Pattern (50M)
            </Button>
          </div>

          {/* Instructions */}
          <div className="space-y-2">
            <Label>Instructions</Label>
            <div className="space-y-2">
              {pattern.instructions.map((instruction, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <span className="text-sm bg-white rounded px-2 py-1 flex-1">
                    {index + 1}. {instruction}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeInstruction(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="flex space-x-2">
                <Input
                  value={newInstruction}
                  onChange={(e) => setNewInstruction(e.target.value)}
                  placeholder="Add new instruction..."
                  onKeyPress={(e) => e.key === 'Enter' && addInstruction()}
                />
                <Button onClick={addInstruction} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Question Slots */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Question Pattern Configuration</CardTitle>
          <Button onClick={addNewSlot} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Question Slot
          </Button>
        </CardHeader>
        <CardContent>
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="space-y-6">
              {QUESTION_PARTS.map((part) => {
                const slotsInPart = groupedSlots[part] || [];
                if (slotsInPart.length === 0) return null;

                return (
                  <div key={part} className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <h3 className="text-lg font-semibold text-gray-900">Part {part}</h3>
                      <Badge variant="outline">
                        {slotsInPart.length} questions • {slotsInPart.reduce((sum, slot) => sum + slot.marks, 0)} marks
                      </Badge>
                    </div>

                    <Droppable droppableId={`part-${part}`}>
                      {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-2">
                          {slotsInPart.map((slot, index) => (
                            <Draggable key={slot.id} draggableId={slot.id} index={index}>
                              {(provided) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                                >
                                  <div className="grid grid-cols-12 gap-4 items-center">
                                    {/* Drag Handle */}
                                    <div {...provided.dragHandleProps} className="col-span-1">
                                      <GripVertical className="h-5 w-5 text-gray-400" />
                                    </div>

                                    {/* Question No */}
                                    <div className="col-span-2">
                                      <Label className="text-xs text-gray-500">Question No</Label>
                                      <Input
                                        value={slot.questionNo}
                                        onChange={(e) => updateSlot(slot.id, { questionNo: e.target.value })}
                                        className="text-sm font-mono"
                                      />
                                    </div>

                                    {/* Part */}
                                    <div className="col-span-1">
                                      <Label className="text-xs text-gray-500">Part</Label>
                                      <Select
                                        value={slot.part}
                                        onValueChange={(value: QuestionPart) => updateSlot(slot.id, { part: value })}
                                      >
                                        <SelectTrigger className="text-sm">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {QUESTION_PARTS.map((p) => (
                                            <SelectItem key={p} value={p}>Part {p}</SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    {/* Marks */}
                                    <div className="col-span-1">
                                      <Label className="text-xs text-gray-500">Marks</Label>
                                      <Input
                                        type="number"
                                        value={slot.marks}
                                        onChange={(e) => updateSlot(slot.id, { marks: parseInt(e.target.value) || 0 })}
                                        className="text-sm"
                                      />
                                    </div>

                                    {/* Bloom Level */}
                                    <div className="col-span-2">
                                      <Label className="text-xs text-gray-500">Bloom Level</Label>
                                      <Select
                                        value={slot.bloomLevel}
                                        onValueChange={(value: BloomLevel) => updateSlot(slot.id, { bloomLevel: value })}
                                      >
                                        <SelectTrigger className="text-sm">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {BLOOM_LEVELS.map((level) => (
                                            <SelectItem key={level} value={level}>
                                              <Badge variant="outline" className={`text-xs ${getBloomLevelColor(level)}`}>
                                                {level}
                                              </Badge>
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    {/* Unit */}
                                    <div className="col-span-1">
                                      <Label className="text-xs text-gray-500">Unit (CO)</Label>
                                      <Select
                                        value={slot.unit.toString()}
                                        onValueChange={(value) => updateSlot(slot.id, { unit: parseInt(value) })}
                                      >
                                        <SelectTrigger className="text-sm">
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {[1, 2, 3, 4, 5].map((unit) => (
                                            <SelectItem key={unit} value={unit.toString()}>
                                              CO{unit}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>

                                    {/* OR Question */}
                                    <div className="col-span-2">
                                      <Label className="text-xs text-gray-500">OR Question</Label>
                                      <div className="flex items-center space-x-2">
                                        <Checkbox
                                          checked={slot.isOrQuestion}
                                          onCheckedChange={(checked) => updateSlot(slot.id, { isOrQuestion: !!checked })}
                                        />
                                        <span className="text-sm">{slot.isOrQuestion ? 'Yes' : 'No'}</span>
                                      </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="col-span-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => removeSlot(slot.id)}
                                        className="text-red-600 hover:text-red-700"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>

                                  {/* OR Pair Indicator */}
                                  {slot.isOrQuestion && slot.orPairId && (
                                    <div className="mt-2 text-xs text-gray-500">
                                      OR Pair: {slot.orPairId}
                                    </div>
                                  )}

                                  {/* Bloom Level Badge */}
                                  <div className="mt-2">
                                    <Badge variant="outline" className={`text-xs ${getBloomLevelColor(slot.bloomLevel)}`}>
                                      {slot.bloomLevel} • {slot.marks} marks • Unit {slot.unit}
                                    </Badge>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  </div>
                );
              })}
            </div>
          </DragDropContext>

          {pattern.slots.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No question slots configured</p>
              <p className="text-sm">Add slots or load a default pattern to get started</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex space-x-4">
            <Button
              onClick={() => onSavePattern(pattern)}
              disabled={!pattern.title || pattern.slots.length === 0}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Pattern
            </Button>
            <Button
              variant="outline"
              onClick={() => onPreviewPattern(pattern)}
              disabled={pattern.slots.length === 0}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview Paper
            </Button>
            <Button
              variant="secondary"
              onClick={() => onGenerateQuestions(pattern)}
              disabled={pattern.slots.length === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Generate Questions
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
