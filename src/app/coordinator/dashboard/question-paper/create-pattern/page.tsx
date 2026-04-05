"use client";

import { Fragment, useState, useEffect, useRef } from "react";
import { trpc } from "@/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2, Plus, Printer, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { openProfessionalPrintWindow } from "@/lib/print-utils";
import type {
  PartAQuestionSlot,
  PartBQuestionGroup,
  PartBQuestionSlot,
  SubQuestion,
  ExamType,
  SemesterType,
  BloomLevel,
} from "@/types/pattern";

const BLOOM_LEVELS: BloomLevel[] = [
  "REMEMBER",
  "UNDERSTAND",
  "APPLY",
  "ANALYZE",
  "EVALUATE",
  "CREATE",
];

const UNITS = [1, 2, 3, 4, 5];

const BLOOM_LABELS: Record<BloomLevel, string> = {
  REMEMBER: "Remember",
  UNDERSTAND: "Understand",
  APPLY: "Apply",
  ANALYZE: "Analyze",
  EVALUATE: "Evaluate",
  CREATE: "Create",
};

const FALLBACK_DEPARTMENT = "Department of Computer Science and Engineering";
const HEADER_META_PREFIX = "[[BLOOMIQ_HEADER_META]]";

function encodeInstructionsWithMeta(
  instructions: string,
  degreeYearSem: string,
  dateSession: string
) {
  const payload = {
    degreeYearSem: degreeYearSem.trim(),
    dateSession: dateSession.trim(),
    instructions: instructions.trim(),
  };

  return `${HEADER_META_PREFIX}${JSON.stringify(payload)}`;
}

function decodeInstructionsWithMeta(raw?: string | null) {
  if (!raw) {
    return {
      degreeYearSem: "",
      dateSession: "",
      instructions: "",
    };
  }

  if (!raw.startsWith(HEADER_META_PREFIX)) {
    return {
      degreeYearSem: "",
      dateSession: "",
      instructions: raw,
    };
  }

  try {
    const parsed = JSON.parse(raw.slice(HEADER_META_PREFIX.length)) as {
      degreeYearSem?: string;
      dateSession?: string;
      instructions?: string;
    };

    return {
      degreeYearSem: parsed.degreeYearSem || "",
      dateSession: parsed.dateSession || "",
      instructions: parsed.instructions || "",
    };
  } catch {
    return {
      degreeYearSem: "",
      dateSession: "",
      instructions: raw,
    };
  }
}

export default function CreatePatternPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const previewRef = useRef<HTMLDivElement>(null);
  const isHydratingPatternRef = useRef(false);
  const patternId = searchParams.get("patternId");
  const isEditMode = Boolean(patternId);
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [patternName, setPatternName] = useState("");
  const [academicYear, setAcademicYear] = useState("2024-2025");
  const [semesterType, setSemesterType] = useState<SemesterType>("ODD");
  const [examType, setExamType] = useState<ExamType>("END_SEMESTER");
  const [duration, setDuration] = useState(180);
  const [degreeYearSem, setDegreeYearSem] = useState("B.Tech. / I / ODD");
  const [dateSession, setDateSession] = useState("To be set during paper generation");
  const [instructions, setInstructions] = useState("");

  // Part A and Part B structures
  const [partA, setPartA] = useState<PartAQuestionSlot[]>([]);
  const [partB, setPartB] = useState<PartBQuestionGroup[]>([]);

  const handlePrintPreview = () => {
    if (!previewRef.current) {
      toast.error("Preview is not ready for printing.");
      return;
    }

    const result = openProfessionalPrintWindow({
      title: "Question Paper Pattern Preview",
      html: previewRef.current.innerHTML,
    });

    if (!result.ok) {
      toast.error(result.error);
    }
  };

  // Get user's courses
  const { data: coursesData } = trpc.coordinator.getCoursesForMaterialUpload.useQuery();
  const courses = coursesData || [];

  const { data: editingPattern, isLoading: isLoadingPattern } = trpc.pattern.getPatternById.useQuery(
    { id: patternId || "" },
    { enabled: isEditMode && Boolean(patternId) }
  );

  // Set default course if available
  useEffect(() => {
    if (!selectedCourseId && courses.length > 0) {
      setSelectedCourseId(courses[0].id);
    }
  }, [courses, selectedCourseId]);

  // Initialize Part A when exam type changes
  useEffect(() => {
    if (isHydratingPatternRef.current) {
      return;
    }

    const count = examType === "END_SEMESTER" ? 10 : 5;
    const newPartA: PartAQuestionSlot[] = [];
    for (let i = 1; i <= count; i++) {
      newPartA.push({
        questionNumber: i,
        marks: 2,
        bloomLevel: "REMEMBER",
        units: [1],
      });
    }
    setPartA(newPartA);
  }, [examType]);

  // Initialize Part B when exam type changes
  useEffect(() => {
    if (isHydratingPatternRef.current) {
      return;
    }

    const isEndSem = examType === "END_SEMESTER";
    const count = isEndSem ? 5 : 5; // 5 groups for both
    const newPartB: PartBQuestionGroup[] = [];

    for (let i = 0; i < count; i++) {
      const groupNumber = i + 11; // Start from Q11

      if (isEndSem) {
        // End semester with OR options
        newPartB.push({
          groupNumber,
          hasOR: true,
          options: [
            {
              optionLabel: "A",
              questionSlot: {
                questionNumber: groupNumber,
                marks: 16,
                bloomLevel: "APPLY",
                units: [1],
                hasSubQuestions: false,
              },
            },
            {
              optionLabel: "B",
              questionSlot: {
                questionNumber: groupNumber,
                marks: 16,
                bloomLevel: "APPLY",
                units: [1],
                hasSubQuestions: false,
              },
            },
          ],
        });
      } else {
        // Sessional without OR options
        newPartB.push({
          groupNumber,
          hasOR: false,
          questionSlot: {
            questionNumber: groupNumber,
            marks: 8,
            bloomLevel: "APPLY",
            units: [1],
            hasSubQuestions: false,
          },
        });
      }
    }
    setPartB(newPartB);
  }, [examType]);

  useEffect(() => {
    if (!isEditMode || !editingPattern) {
      return;
    }

    isHydratingPatternRef.current = true;
    setSelectedCourseId(editingPattern.courseId);
    setPatternName(editingPattern.patternName);
    setAcademicYear(editingPattern.academicYear);
    setSemesterType(editingPattern.semesterType as SemesterType);
    setExamType(editingPattern.examType as ExamType);
    setDuration(editingPattern.duration);
    const decoded = decodeInstructionsWithMeta(editingPattern.instructions);
    setDegreeYearSem(decoded.degreeYearSem || "B.Tech. / I / ODD");
    setDateSession(decoded.dateSession || "To be set during paper generation");
    setInstructions(decoded.instructions);
    setPartA((editingPattern.partAStructure as PartAQuestionSlot[]) || []);
    setPartB((editingPattern.partBStructure as PartBQuestionGroup[]) || []);

    setTimeout(() => {
      isHydratingPatternRef.current = false;
    }, 0);
  }, [isEditMode, editingPattern]);

  // Calculate total marks
  const calculateMarks = () => {
    const partATotal = partA.reduce((sum, q) => sum + q.marks, 0);
    let partBTotal = 0;

    for (const group of partB) {
      if (group.hasOR && group.options && group.options.length > 0) {
        partBTotal += group.options[0].questionSlot.marks;
      } else if (group.questionSlot) {
        partBTotal += group.questionSlot.marks;
      }
    }

    return { partATotal, partBTotal, total: partATotal + partBTotal };
  };

  const marks = calculateMarks();
  const selectedCourse = courses.find((c: any) => c.id === selectedCourseId);
  const selectedDepartmentName =
    selectedCourse?.department?.name || FALLBACK_DEPARTMENT;

  const assessmentRows = (() => {
    const questions = [
      ...partA.map((q) => ({
        marks: q.marks,
        bloomLevel: q.bloomLevel,
        co: `CO${q.units[0] || 1}`,
      })),
      ...partB.flatMap((group) => {
        if (group.hasOR && group.options) {
          return group.options.map((option) => {
            const slot = option.questionSlot;
            return {
              marks: slot.marks,
              bloomLevel: slot.bloomLevel || "APPLY",
              co: `CO${slot.units?.[0] || 1}`,
            };
          });
        }

        if (group.questionSlot) {
          return [
            {
              marks: group.questionSlot.marks,
              bloomLevel: group.questionSlot.bloomLevel || "APPLY",
              co: `CO${group.questionSlot.units?.[0] || 1}`,
            },
          ];
        }

        return [];
      }),
    ];

    const byCO: Record<string, Record<BloomLevel | "TOTAL", number>> = {};
    for (const q of questions) {
      if (!byCO[q.co]) {
        byCO[q.co] = {
          REMEMBER: 0,
          UNDERSTAND: 0,
          APPLY: 0,
          ANALYZE: 0,
          EVALUATE: 0,
          CREATE: 0,
          TOTAL: 0,
        };
      }

      byCO[q.co][q.bloomLevel] += q.marks;
      byCO[q.co].TOTAL += q.marks;
    }

    return Object.keys(byCO)
      .sort()
      .map((co) => ({
        co,
        ...byCO[co],
      }));
  })();

  // Create pattern mutation
  const createMutation = trpc.pattern.createPattern.useMutation({
    onSuccess: () => {
      toast.success("Pattern created successfully and sent for MC approval");
      router.push("/coordinator/dashboard/question-paper/patterns");
    },
    onError: (error: any) => {
      console.error("Validation errors:", error.data?.zodError?.fieldErrors);
      toast.error(error.message || "Failed to create pattern");
    },
  });

  const updateMutation = trpc.pattern.updatePattern.useMutation({
    onSuccess: () => {
      toast.success("Pattern updated successfully and moved to MC approval");
      router.push("/coordinator/dashboard/question-paper/patterns");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update pattern");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedCourseId) {
      toast.error("Please select a course");
      return;
    }

    const expectedTotal = examType === "END_SEMESTER" ? 100 : 50;
    if (marks.total !== expectedTotal) {
      toast.error(`Total marks must be ${expectedTotal} for ${examType.replace("_", " ")}`);
      return;
    }

    const payload = {
      courseId: selectedCourseId,
      patternName,
      academicYear,
      semesterType,
      examType,
      totalMarks: marks.total,
      duration,
      partAStructure: partA,
      partBStructure: partB,
      instructions: encodeInstructionsWithMeta(instructions, degreeYearSem, dateSession),
    };

    if (isEditMode && patternId) {
      updateMutation.mutate({
        id: patternId,
        ...payload,
      });
      return;
    }

    createMutation.mutate(payload);
  };

  // Update Part A question
  const updatePartAQuestion = (index: number, updates: Partial<PartAQuestionSlot>) => {
    const newPartA = [...partA];
    newPartA[index] = { ...newPartA[index], ...updates };
    setPartA(newPartA);
  };

  // Update Part B question slot
  const updatePartBSlot = (
    groupIndex: number,
    optionIndex: number | null,
    updates: Partial<PartBQuestionSlot>
  ) => {
    const newPartB = [...partB];
    const group = newPartB[groupIndex];

    if (optionIndex !== null && group.options) {
      group.options[optionIndex].questionSlot = {
        ...group.options[optionIndex].questionSlot,
        ...updates,
      };
    } else if (group.questionSlot) {
      group.questionSlot = { ...group.questionSlot, ...updates };
    }

    setPartB(newPartB);
  };

  // Toggle sub-questions
  const toggleSubQuestions = (groupIndex: number, optionIndex: number | null) => {
    const newPartB = [...partB];
    const group = newPartB[groupIndex];

    let slot: PartBQuestionSlot;
    if (optionIndex !== null && group.options) {
      slot = group.options[optionIndex].questionSlot;
    } else if (group.questionSlot) {
      slot = group.questionSlot;
    } else {
      return;
    }

    if (slot.hasSubQuestions) {
      slot.hasSubQuestions = false;
      slot.subQuestions = undefined;
    } else {
      slot.hasSubQuestions = true;
      slot.subQuestions = [
        {
          label: "a",
          marks: Math.floor(slot.marks / 2),
          bloomLevel: "APPLY",
          units: [1],
        },
        {
          label: "b",
          marks: slot.marks - Math.floor(slot.marks / 2),
          bloomLevel: "APPLY",
          units: [1],
        },
      ];
    }

    setPartB(newPartB);
  };

  // Add/Remove sub-questions
  const addSubQuestion = (groupIndex: number, optionIndex: number | null) => {
    const newPartB = [...partB];
    const group = newPartB[groupIndex];

    let slot: PartBQuestionSlot;
    if (optionIndex !== null && group.options) {
      slot = group.options[optionIndex].questionSlot;
    } else if (group.questionSlot) {
      slot = group.questionSlot;
    } else {
      return;
    }

    if (slot.subQuestions) {
      const nextLabel = String.fromCharCode(97 + slot.subQuestions.length); // 'a', 'b', 'c', etc.
      slot.subQuestions.push({
        label: nextLabel,
        marks: 8,
        bloomLevel: "APPLY",
        units: [1],
      });
      setPartB(newPartB);
    }
  };

  const removeSubQuestion = (
    groupIndex: number,
    optionIndex: number | null,
    subIndex: number
  ) => {
    const newPartB = [...partB];
    const group = newPartB[groupIndex];

    let slot: PartBQuestionSlot;
    if (optionIndex !== null && group.options) {
      slot = group.options[optionIndex].questionSlot;
    } else if (group.questionSlot) {
      slot = group.questionSlot;
    } else {
      return;
    }

    if (slot.subQuestions && slot.subQuestions.length > 2) {
      slot.subQuestions.splice(subIndex, 1);
      setPartB(newPartB);
    }
  };

  // Update sub-question
  const updateSubQuestion = (
    groupIndex: number,
    optionIndex: number | null,
    subIndex: number,
    updates: Partial<SubQuestion>
  ) => {
    const newPartB = [...partB];
    const group = newPartB[groupIndex];

    let slot: PartBQuestionSlot;
    if (optionIndex !== null && group.options) {
      slot = group.options[optionIndex].questionSlot;
    } else if (group.questionSlot) {
      slot = group.questionSlot;
    } else {
      return;
    }

    if (slot.subQuestions) {
      slot.subQuestions[subIndex] = {
        ...slot.subQuestions[subIndex],
        ...updates,
      };
      setPartB(newPartB);
    }
  };

  // Add Part B group
  const addPartBGroup = () => {
    const groupNumber = partB.length > 0 ? partB[partB.length - 1].groupNumber + 1 : 11;
    const isEndSem = examType === "END_SEMESTER";

    const newGroup: PartBQuestionGroup = isEndSem
      ? {
        groupNumber,
        hasOR: true,
        options: [
          {
            optionLabel: "A",
            questionSlot: {
              questionNumber: groupNumber,
              marks: 16,
              bloomLevel: "APPLY",
              units: [1],
              hasSubQuestions: false,
            },
          },
          {
            optionLabel: "B",
            questionSlot: {
              questionNumber: groupNumber,
              marks: 16,
              bloomLevel: "APPLY",
              units: [1],
              hasSubQuestions: false,
            },
          },
        ],
      }
      : {
        groupNumber,
        hasOR: false,
        questionSlot: {
          questionNumber: groupNumber,
          marks: 8,
          bloomLevel: "APPLY",
          units: [1],
          hasSubQuestions: false,
        },
      };

    setPartB([...partB, newGroup]);
  };

  // Remove Part B group
  const removePartBGroup = (index: number) => {
    if (partB.length > 1) {
      const newPartB = partB.filter((_, i) => i !== index);
      setPartB(newPartB);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-6xl">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">
          {isEditMode ? "Edit Question Paper Pattern" : "Create Question Paper Pattern"}
        </h1>
        <p className="text-muted-foreground">
          {isEditMode
            ? "Modify the pattern structure and save changes"
            : "Define the structure and format of the examination paper"}
        </p>
      </div>

      {isEditMode && isLoadingPattern && (
        <Card>
          <CardContent className="py-8 flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading pattern...
          </CardContent>
        </Card>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
            <CardDescription>Provide details about the examination</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Course Selection */}
              <div className="space-y-2">
                <Label htmlFor="course">Course *</Label>
                <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                  <SelectTrigger id="course">
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map((course: any) => (
                      <SelectItem key={course.id} value={course.id}>
                        {course.course_code} - {course.name}
                        {course.department?.name ? ` (${course.department.name})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Department: {selectedDepartmentName}
                </p>
              </div>

              {/* Pattern Name */}
              <div className="space-y-2">
                <Label htmlFor="patternName">Pattern Name *</Label>
                <Input
                  id="patternName"
                  value={patternName}
                  onChange={(e) => setPatternName(e.target.value)}
                  placeholder="e.g., End Semester 2024-25 ODD"
                  required
                />
              </div>

              {/* Academic Year */}
              <div className="space-y-2">
                <Label htmlFor="academicYear">Academic Year *</Label>
                <Input
                  id="academicYear"
                  value={academicYear}
                  onChange={(e) => setAcademicYear(e.target.value)}
                  placeholder="2024-2025"
                  pattern="^\d{4}-\d{4}$"
                  required
                />
              </div>

              {/* Semester Type */}
              <div className="space-y-2">
                <Label htmlFor="semesterType">Semester Type *</Label>
                <Select value={semesterType} onValueChange={(v) => setSemesterType(v as SemesterType)}>
                  <SelectTrigger id="semesterType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ODD">ODD</SelectItem>
                    <SelectItem value="EVEN">EVEN</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Exam Type */}
              <div className="space-y-2">
                <Label htmlFor="examType">Exam Type *</Label>
                <Select value={examType} onValueChange={(v) => setExamType(v as ExamType)}>
                  <SelectTrigger id="examType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SESSIONAL_1">SESSIONAL 1</SelectItem>
                    <SelectItem value="SESSIONAL_2">SESSIONAL 2</SelectItem>
                    <SelectItem value="END_SEMESTER">END SEMESTER</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes) *</Label>
                <Input
                  id="duration"
                  type="number"
                  min="30"
                  value={duration}
                  onChange={(e) => setDuration(parseInt(e.target.value))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="degreeYearSem">Degree / Year / Sem *</Label>
                <Input
                  id="degreeYearSem"
                  value={degreeYearSem}
                  onChange={(e) => setDegreeYearSem(e.target.value)}
                  placeholder="e.g., B.Tech. / I / ODD"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateSession">Date & Session *</Label>
                <Input
                  id="dateSession"
                  value={dateSession}
                  onChange={(e) => setDateSession(e.target.value)}
                  placeholder="e.g., 24-04-2026 / FN"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Part A Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Part A - Short Answer Questions (2 marks each)</CardTitle>
            <CardDescription>
              {examType === "END_SEMESTER" ? "10 questions (20 marks)" : "5 questions (10 marks)"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {partA.map((question, index) => (
              <Card key={index} className="bg-muted/30">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Question {question.questionNumber}</Label>
                      <Input value="2 marks" disabled />
                    </div>

                    <div className="space-y-2">
                      <Label>Bloom Level</Label>
                      <Select
                        value={question.bloomLevel}
                        onValueChange={(v) =>
                          updatePartAQuestion(index, { bloomLevel: v as BloomLevel })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {BLOOM_LEVELS.map((level) => (
                            <SelectItem key={level} value={level}>
                              {level}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Units</Label>
                      <div className="flex flex-wrap gap-2 items-center border rounded-md p-2">
                        {UNITS.map((unit) => (
                          <div key={unit} className="flex items-center space-x-1">
                            <Checkbox
                              id={`partA-${index}-unit-${unit}`}
                              checked={question.units.includes(unit)}
                              onCheckedChange={(checked) => {
                                const newUnits = checked
                                  ? [...question.units, unit]
                                  : question.units.filter((u) => u !== unit);
                                updatePartAQuestion(index, { units: newUnits });
                              }}
                            />
                            <label
                              htmlFor={`partA-${index}-unit-${unit}`}
                              className="text-sm cursor-pointer"
                            >
                              U{unit}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
              <p className="text-sm font-medium">Part A Total: {marks.partATotal} marks</p>
            </div>
          </CardContent>
        </Card>

        {/* Part B Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Part B - Essay Questions (8 or 16 marks)</CardTitle>
            <CardDescription>
              {examType === "END_SEMESTER"
                ? "80 marks total with OR options"
                : "40 marks total without OR options"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {partB.map((group, groupIndex) => (
              <Card key={groupIndex} className="border-2">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-lg">Question {group.groupNumber}</CardTitle>
                    {partB.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removePartBGroup(groupIndex)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {group.hasOR && group.options ? (
                    // End Semester with OR options
                    group.options.map((option, optionIndex) => (
                      <Card key={optionIndex} className="bg-muted/50">
                        <CardHeader>
                          <CardTitle className="text-base">
                            Option {option.optionLabel}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <Label>Marks</Label>
                              <Select
                                value={option.questionSlot.marks.toString()}
                                onValueChange={(v) =>
                                  updatePartBSlot(groupIndex, optionIndex, {
                                    marks: parseInt(v),
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="8">8 Marks</SelectItem>
                                  <SelectItem value="16">16 Marks</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {!option.questionSlot.hasSubQuestions && (
                              <>
                                <div className="space-y-2">
                                  <Label>Bloom Level</Label>
                                  <Select
                                    value={option.questionSlot.bloomLevel || "APPLY"}
                                    onValueChange={(v) =>
                                      updatePartBSlot(groupIndex, optionIndex, {
                                        bloomLevel: v as BloomLevel,
                                      })
                                    }
                                  >
                                    <SelectTrigger>
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {BLOOM_LEVELS.map((level) => (
                                        <SelectItem key={level} value={level}>
                                          {level}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>

                                <div className="space-y-2">
                                  <Label>Units</Label>
                                  <div className="flex flex-wrap gap-2 items-center border rounded-md p-2">
                                    {UNITS.map((unit) => (
                                      <div key={unit} className="flex items-center space-x-1">
                                        <Checkbox
                                          id={`partB-${groupIndex}-${optionIndex}-unit-${unit}`}
                                          checked={option.questionSlot.units?.includes(unit)}
                                          onCheckedChange={(checked) => {
                                            const currentUnits = option.questionSlot.units || [];
                                            const newUnits = checked
                                              ? [...currentUnits, unit]
                                              : currentUnits.filter((u) => u !== unit);
                                            updatePartBSlot(groupIndex, optionIndex, {
                                              units: newUnits,
                                            });
                                          }}
                                        />
                                        <label
                                          htmlFor={`partB-${groupIndex}-${optionIndex}-unit-${unit}`}
                                          className="text-sm cursor-pointer"
                                        >
                                          U{unit}
                                        </label>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>

                          {/* Sub-questions toggle */}
                          <div className="flex items-center space-x-2">
                            <Checkbox
                              id={`subq-${groupIndex}-${optionIndex}`}
                              checked={option.questionSlot.hasSubQuestions}
                              onCheckedChange={() =>
                                toggleSubQuestions(groupIndex, optionIndex)
                              }
                            />
                            <label
                              htmlFor={`subq-${groupIndex}-${optionIndex}`}
                              className="text-sm font-medium cursor-pointer"
                            >
                              Has Sub-questions
                            </label>
                          </div>

                          {/* Sub-questions */}
                          {option.questionSlot.hasSubQuestions &&
                            option.questionSlot.subQuestions && (
                              <div className="space-y-3 pl-4 border-l-2">
                                {option.questionSlot.subQuestions.map((sub, subIndex) => (
                                  <div key={subIndex} className="space-y-2">
                                    <div className="flex items-center justify-between">
                                      <Label>Sub-question {sub.label})</Label>
                                      {option.questionSlot.subQuestions &&
                                        option.questionSlot.subQuestions.length > 2 && (
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() =>
                                              removeSubQuestion(
                                                groupIndex,
                                                optionIndex,
                                                subIndex
                                              )
                                            }
                                          >
                                            <X className="h-3 w-3" />
                                          </Button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                      <div className="space-y-1">
                                        <Label className="text-xs">Marks</Label>
                                        <Input
                                          type="number"
                                          min="1"
                                          value={sub.marks}
                                          onChange={(e) =>
                                            updateSubQuestion(
                                              groupIndex,
                                              optionIndex,
                                              subIndex,
                                              { marks: parseInt(e.target.value) }
                                            )
                                          }
                                        />
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="text-xs">Bloom Level</Label>
                                        <Select
                                          value={sub.bloomLevel}
                                          onValueChange={(v) =>
                                            updateSubQuestion(
                                              groupIndex,
                                              optionIndex,
                                              subIndex,
                                              { bloomLevel: v as BloomLevel }
                                            )
                                          }
                                        >
                                          <SelectTrigger>
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {BLOOM_LEVELS.map((level) => (
                                              <SelectItem key={level} value={level}>
                                                {level}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div className="space-y-1">
                                        <Label className="text-xs">Units</Label>
                                        <div className="flex flex-wrap gap-1 items-center border rounded-md p-1">
                                          {UNITS.map((unit) => (
                                            <div
                                              key={unit}
                                              className="flex items-center space-x-1"
                                            >
                                              <Checkbox
                                                id={`sub-${groupIndex}-${optionIndex}-${subIndex}-${unit}`}
                                                checked={sub.units.includes(unit)}
                                                onCheckedChange={(checked) => {
                                                  const newUnits = checked
                                                    ? [...sub.units, unit]
                                                    : sub.units.filter((u) => u !== unit);
                                                  updateSubQuestion(
                                                    groupIndex,
                                                    optionIndex,
                                                    subIndex,
                                                    { units: newUnits }
                                                  );
                                                }}
                                              />
                                              <label
                                                htmlFor={`sub-${groupIndex}-${optionIndex}-${subIndex}-${unit}`}
                                                className="text-xs cursor-pointer"
                                              >
                                                U{unit}
                                              </label>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addSubQuestion(groupIndex, optionIndex)}
                                >
                                  <Plus className="h-3 w-3 mr-1" />
                                  Add Sub-question
                                </Button>
                              </div>
                            )}
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    // Sessional without OR options
                    group.questionSlot && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-2">
                            <Label>Marks</Label>
                            <Select
                              value={group.questionSlot.marks.toString()}
                              onValueChange={(v) =>
                                updatePartBSlot(groupIndex, null, { marks: parseInt(v) })
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="8">8 Marks</SelectItem>
                                <SelectItem value="16">16 Marks</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {!group.questionSlot.hasSubQuestions && (
                            <>
                              <div className="space-y-2">
                                <Label>Bloom Level</Label>
                                <Select
                                  value={group.questionSlot.bloomLevel || "APPLY"}
                                  onValueChange={(v) =>
                                    updatePartBSlot(groupIndex, null, {
                                      bloomLevel: v as BloomLevel,
                                    })
                                  }
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {BLOOM_LEVELS.map((level) => (
                                      <SelectItem key={level} value={level}>
                                        {level}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-2">
                                <Label>Units</Label>
                                <div className="flex flex-wrap gap-2 items-center border rounded-md p-2">
                                  {UNITS.map((unit) => (
                                    <div key={unit} className="flex items-center space-x-1">
                                      <Checkbox
                                        id={`partB-${groupIndex}-unit-${unit}`}
                                        checked={group.questionSlot?.units?.includes(unit)}
                                        onCheckedChange={(checked) => {
                                          const currentUnits = group.questionSlot?.units || [];
                                          const newUnits = checked
                                            ? [...currentUnits, unit]
                                            : currentUnits.filter((u) => u !== unit);
                                          updatePartBSlot(groupIndex, null, { units: newUnits });
                                        }}
                                      />
                                      <label
                                        htmlFor={`partB-${groupIndex}-unit-${unit}`}
                                        className="text-sm cursor-pointer"
                                      >
                                        U{unit}
                                      </label>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}
                        </div>

                        {/* Sub-questions toggle */}
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`subq-${groupIndex}`}
                            checked={group.questionSlot.hasSubQuestions}
                            onCheckedChange={() => toggleSubQuestions(groupIndex, null)}
                          />
                          <label
                            htmlFor={`subq-${groupIndex}`}
                            className="text-sm font-medium cursor-pointer"
                          >
                            Has Sub-questions
                          </label>
                        </div>

                        {/* Sub-questions */}
                        {group.questionSlot.hasSubQuestions &&
                          group.questionSlot.subQuestions && (
                            <div className="space-y-3 pl-4 border-l-2">
                              {group.questionSlot.subQuestions.map((sub, subIndex) => (
                                <div key={subIndex} className="space-y-2">
                                  <div className="flex items-center justify-between">
                                    <Label>Sub-question {sub.label})</Label>
                                    {group.questionSlot?.subQuestions &&
                                      group.questionSlot.subQuestions.length > 2 && (
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() =>
                                            removeSubQuestion(groupIndex, null, subIndex)
                                          }
                                        >
                                          <X className="h-3 w-3" />
                                        </Button>
                                      )}
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="space-y-1">
                                      <Label className="text-xs">Marks</Label>
                                      <Input
                                        type="number"
                                        min="1"
                                        value={sub.marks}
                                        onChange={(e) =>
                                          updateSubQuestion(groupIndex, null, subIndex, {
                                            marks: parseInt(e.target.value),
                                          })
                                        }
                                      />
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs">Bloom Level</Label>
                                      <Select
                                        value={sub.bloomLevel}
                                        onValueChange={(v) =>
                                          updateSubQuestion(groupIndex, null, subIndex, {
                                            bloomLevel: v as BloomLevel,
                                          })
                                        }
                                      >
                                        <SelectTrigger>
                                          <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {BLOOM_LEVELS.map((level) => (
                                            <SelectItem key={level} value={level}>
                                              {level}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                    <div className="space-y-1">
                                      <Label className="text-xs">Units</Label>
                                      <div className="flex flex-wrap gap-1 items-center border rounded-md p-1">
                                        {UNITS.map((unit) => (
                                          <div
                                            key={unit}
                                            className="flex items-center space-x-1"
                                          >
                                            <Checkbox
                                              id={`sub-${groupIndex}-${subIndex}-${unit}`}
                                              checked={sub.units.includes(unit)}
                                              onCheckedChange={(checked) => {
                                                const newUnits = checked
                                                  ? [...sub.units, unit]
                                                  : sub.units.filter((u) => u !== unit);
                                                updateSubQuestion(groupIndex, null, subIndex, {
                                                  units: newUnits,
                                                });
                                              }}
                                            />
                                            <label
                                              htmlFor={`sub-${groupIndex}-${subIndex}-${unit}`}
                                              className="text-xs cursor-pointer"
                                            >
                                              U{unit}
                                            </label>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ))}
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => addSubQuestion(groupIndex, null)}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add Sub-question
                              </Button>
                            </div>
                          )}
                      </div>
                    )
                  )}
                </CardContent>
              </Card>
            ))}

            <Button type="button" variant="outline" onClick={addPartBGroup}>
              <Plus className="h-4 w-4 mr-2" />
              Add Question Group
            </Button>

            <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
              <p className="text-sm font-medium">Part B Total: {marks.partBTotal} marks</p>
            </div>
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Exam Instructions</CardTitle>
            <CardDescription>
              Instructions to be printed on the question paper
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="Enter exam instructions..."
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Summary */}
        <Card className={marks.total !== (examType === "END_SEMESTER" ? 100 : 50) ? "border-red-500" : "border-green-500"}>
          <CardHeader>
            <CardTitle>Pattern Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{marks.partATotal}</div>
                <div className="text-sm text-muted-foreground">Part A Marks</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{marks.partBTotal}</div>
                <div className="text-sm text-muted-foreground">Part B Marks</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{marks.total}</div>
                <div className="text-sm text-muted-foreground">Total Marks</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{duration}</div>
                <div className="text-sm text-muted-foreground">Minutes</div>
              </div>
            </div>
            {marks.total !== (examType === "END_SEMESTER" ? 100 : 50) && (
              <p className="text-red-500 text-sm mt-2 text-center">
                Total marks must be {examType === "END_SEMESTER" ? 100 : 50}!
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div>
                <CardTitle>Institutional Format Preview</CardTitle>
                <CardDescription>
                  This preview matches the print style for question papers and pattern design.
                </CardDescription>
              </div>
              <Button type="button" variant="outline" onClick={handlePrintPreview}>
                <Printer className="mr-2 h-4 w-4" />
                Print Preview
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div ref={previewRef} className="space-y-4">
              <div className="text-center space-y-1">
                <p className="font-bold uppercase">KALASALINGAM ACADEMY OF RESEARCH AND EDUCATION (Deemed to be University)</p>
                <p className="font-semibold uppercase">{selectedDepartmentName}</p>
                <p className="font-semibold">
                  {examType === "SESSIONAL_1"
                    ? "SESSIONAL EXAMINATION-I"
                    : examType === "SESSIONAL_2"
                      ? "SESSIONAL EXAMINATION-II"
                      : "END SEMESTER EXAMINATION"}
                </p>
              </div>

              <table className="w-full border border-border border-collapse">
                <tbody>
                  <tr>
                    <td className="border border-border px-2 py-1 font-medium">Course Code</td>
                    <td className="border border-border px-2 py-1">{selectedCourse?.course_code || "-"}</td>
                    <td className="border border-border px-2 py-1 font-medium">Duration</td>
                    <td className="border border-border px-2 py-1">{duration} Minutes</td>
                  </tr>
                  <tr>
                    <td className="border border-border px-2 py-1 font-medium">Course Name</td>
                    <td className="border border-border px-2 py-1">{selectedCourse?.name || "-"}</td>
                    <td className="border border-border px-2 py-1 font-medium">Max. Marks</td>
                    <td className="border border-border px-2 py-1">{marks.total}</td>
                  </tr>
                  <tr>
                    <td className="border border-border px-2 py-1 font-medium">Degree / Year / Sem</td>
                    <td className="border border-border px-2 py-1">{degreeYearSem}</td>
                    <td className="border border-border px-2 py-1 font-medium">Date & Session</td>
                    <td className="border border-border px-2 py-1">{dateSession}</td>
                  </tr>
                </tbody>
              </table>

              <div>
                <h3 className="font-semibold">PART - A ({partA.length} × 2 = {partA.length * 2} Marks)</h3>
                <table className="w-full border border-border border-collapse mt-2">
                  <colgroup>
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "64%" }} />
                    <col style={{ width: "14%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "6%" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className="border border-border px-2 py-1 text-left">Question Number</th>
                      <th className="border border-border px-2 py-1 text-left">Question Text</th>
                      <th className="border border-border px-2 py-1 text-left">Pattern</th>
                      <th className="border border-border px-2 py-1 text-left">Mapping COs</th>
                      <th className="border border-border px-2 py-1 text-left">Marks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partA.map((q) => (
                      <tr key={`preview-parta-${q.questionNumber}`}>
                        <td className="border border-border px-2 py-1">{q.questionNumber}</td>
                        <td className="border border-border px-2 py-1">Configured from question bank</td>
                        <td className="border border-border px-2 py-1">{BLOOM_LABELS[q.bloomLevel]}</td>
                        <td className="border border-border px-2 py-1">CO{q.units[0] || 1}</td>
                        <td className="border border-border px-2 py-1">{q.marks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div>
                <h3 className="font-semibold">PART - B</h3>
                <table className="w-full border border-border border-collapse mt-2">
                  <colgroup>
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "64%" }} />
                    <col style={{ width: "14%" }} />
                    <col style={{ width: "8%" }} />
                    <col style={{ width: "6%" }} />
                  </colgroup>
                  <thead>
                    <tr>
                      <th className="border border-border px-2 py-1 text-left">Question Number</th>
                      <th className="border border-border px-2 py-1 text-left">Question Text</th>
                      <th className="border border-border px-2 py-1 text-left">Pattern</th>
                      <th className="border border-border px-2 py-1 text-left">Mapping COs</th>
                      <th className="border border-border px-2 py-1 text-left">Marks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {partB.map((group) => {
                      if (group.hasOR && group.options && group.options.length > 0) {
                        return group.options.map((option, optionIndex) => {
                          const slot = option.questionSlot;
                          const showOrRow = optionIndex > 0;

                          return (
                            <Fragment key={`preview-partb-fragment-${group.groupNumber}-${option.optionLabel}-${optionIndex}`}>
                              {showOrRow && (
                                <tr key={`preview-partb-or-${group.groupNumber}-${optionIndex}`}>
                                  <td colSpan={5} className="border border-border px-2 py-1 text-center font-semibold">
                                    OR
                                  </td>
                                </tr>
                              )}
                              <tr key={`preview-partb-${group.groupNumber}-${option.optionLabel}`}>
                                <td className="border border-border px-2 py-1">{group.groupNumber}{option.optionLabel}</td>
                                <td className="border border-border px-2 py-1">Configured from question bank</td>
                                <td className="border border-border px-2 py-1">{slot.bloomLevel ? BLOOM_LABELS[slot.bloomLevel] : "Apply"}</td>
                                <td className="border border-border px-2 py-1">CO{slot.units?.[0] || 1}</td>
                                <td className="border border-border px-2 py-1">{slot.marks}</td>
                              </tr>
                            </Fragment>
                          );
                        });
                      }

                      const slot = group.questionSlot;
                      if (!slot) return null;

                      return (
                        <tr key={`preview-partb-${group.groupNumber}`}>
                          <td className="border border-border px-2 py-1">{group.groupNumber}</td>
                          <td className="border border-border px-2 py-1">Configured from question bank</td>
                          <td className="border border-border px-2 py-1">{slot.bloomLevel ? BLOOM_LABELS[slot.bloomLevel] : "Apply"}</td>
                          <td className="border border-border px-2 py-1">CO{slot.units?.[0] || 1}</td>
                          <td className="border border-border px-2 py-1">{slot.marks}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div>
                <h3 className="font-semibold">Assessment Pattern (Bloom&apos;s Taxonomy)</h3>
                <table className="w-full border border-border border-collapse mt-2">
                  <thead>
                    <tr>
                      <th className="border border-border px-2 py-1">COs</th>
                      <th className="border border-border px-2 py-1">Remember</th>
                      <th className="border border-border px-2 py-1">Understand</th>
                      <th className="border border-border px-2 py-1">Apply</th>
                      <th className="border border-border px-2 py-1">Analyze</th>
                      <th className="border border-border px-2 py-1">Evaluate</th>
                      <th className="border border-border px-2 py-1">Create</th>
                      <th className="border border-border px-2 py-1">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {assessmentRows.map((row) => (
                      <tr key={`matrix-${row.co}`}>
                        <td className="border border-border px-2 py-1 font-medium">{row.co}</td>
                        <td className="border border-border px-2 py-1 text-center">{row.REMEMBER}</td>
                        <td className="border border-border px-2 py-1 text-center">{row.UNDERSTAND}</td>
                        <td className="border border-border px-2 py-1 text-center">{row.APPLY}</td>
                        <td className="border border-border px-2 py-1 text-center">{row.ANALYZE}</td>
                        <td className="border border-border px-2 py-1 text-center">{row.EVALUATE}</td>
                        <td className="border border-border px-2 py-1 text-center">{row.CREATE}</td>
                        <td className="border border-border px-2 py-1 text-center font-semibold">{row.TOTAL}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={
              createMutation.isPending ||
              !selectedCourseId ||
              marks.total !== (examType === "END_SEMESTER" ? 100 : 50)
            }
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                <Plus className="mr-2 h-4 w-4" />
                Create Pattern
              </>
            )}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
