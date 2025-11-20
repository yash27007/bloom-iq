/**
 * TypeScript types for Question Paper Pattern Structure
 */

export type ExamType = "SESSIONAL_1" | "SESSIONAL_2" | "END_SEMESTER";
export type SemesterType = "ODD" | "EVEN";
export type BloomLevel =
  | "REMEMBER"
  | "UNDERSTAND"
  | "APPLY"
  | "ANALYZE"
  | "EVALUATE"
  | "CREATE";

/**
 * Part A Question Slot
 * Example: Q1 - "What is DAE?" - 2 marks - REMEMBER - CO1
 */
export interface PartAQuestionSlot {
  questionNumber: number; // 1, 2, 3, 4, 5
  marks: number; // Always 2 for Part A
  bloomLevel: BloomLevel;
  units: number[]; // e.g., [1, 2] - questions can be from unit 1 or 2
  description?: string; // Optional description for the slot
}

/**
 * Sub-question within Part B
 * Example: a) 8 marks, b) 8 marks (totaling 16)
 */
export interface SubQuestion {
  label: string; // 'a', 'b', 'c', etc.
  marks: number; // 8 or 16
  bloomLevel: BloomLevel;
  units: number[]; // Units to select question from
  description?: string;
}

/**
 * Part B Question Slot (can be standalone or have sub-questions)
 * Example: Q11 - 16 marks OR Q11a - 8 marks, Q11b - 8 marks
 */
export interface PartBQuestionSlot {
  questionNumber: number; // 11, 12, 13, etc.
  marks: number; // 8 or 16
  bloomLevel?: BloomLevel; // For standalone questions
  units?: number[]; // For standalone questions
  hasSubQuestions: boolean;
  subQuestions?: SubQuestion[]; // If hasSubQuestions is true
  description?: string;
}

/**
 * OR Option for End Semester Part B
 * Example: Q11A OR Q11B
 */
export interface OROption {
  optionLabel: string; // 'A' or 'B'
  questionSlot: PartBQuestionSlot;
}

/**
 * Part B Question Group (for OR options in End Semester)
 */
export interface PartBQuestionGroup {
  groupNumber: number; // 11, 12, 13, etc.
  hasOR: boolean; // true for END_SEMESTER, false for SESSIONAL
  options: OROption[]; // If hasOR is true, contains option A and B
  questionSlot?: PartBQuestionSlot; // If hasOR is false (Sessional)
}

/**
 * Complete Pattern Structure
 */
export interface PatternStructure {
  partA: PartAQuestionSlot[];
  partB: PartBQuestionGroup[];
}

/**
 * Pattern Creation/Update Input
 */
export interface CreatePatternInput {
  courseId: string;
  patternName: string;
  academicYear: string;
  semesterType: SemesterType;
  examType: ExamType;
  totalMarks: number; // 50 or 100
  duration: number; // minutes
  partAStructure: PartAQuestionSlot[];
  partBStructure: PartBQuestionGroup[];
  instructions?: string;
}

/**
 * Helper to calculate marks
 */
export function calculatePatternMarks(structure: PatternStructure): {
  partATotal: number;
  partBTotal: number;
  grandTotal: number;
} {
  const partATotal = structure.partA.reduce((sum, q) => sum + q.marks, 0);

  let partBTotal = 0;
  for (const group of structure.partB) {
    if (group.hasOR && group.options && group.options.length > 0) {
      // For OR options, count one option's marks
      const optionMarks = group.options[0].questionSlot.marks;
      partBTotal += optionMarks;
    } else if (group.questionSlot) {
      partBTotal += group.questionSlot.marks;
    }
  }

  return {
    partATotal,
    partBTotal,
    grandTotal: partATotal + partBTotal,
  };
}

/**
 * Validate pattern structure based on exam type
 */
export function validatePatternStructure(
  examType: ExamType,
  structure: PatternStructure
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const { partATotal, partBTotal, grandTotal } =
    calculatePatternMarks(structure);

  // Validate based on exam type
  if (examType === "END_SEMESTER") {
    if (grandTotal !== 100) {
      errors.push(
        `End Semester exam must total 100 marks (current: ${grandTotal})`
      );
    }
    if (partATotal !== 20) {
      errors.push(
        `End Semester Part A must be 20 marks (current: ${partATotal})`
      );
    }
    if (partBTotal !== 80) {
      errors.push(
        `End Semester Part B must be 80 marks (current: ${partBTotal})`
      );
    }

    // Validate that Part B has OR options
    for (const group of structure.partB) {
      if (!group.hasOR) {
        errors.push(
          `End Semester Part B must have OR options for question ${group.groupNumber}`
        );
      }
    }
  } else {
    // SESSIONAL_1 or SESSIONAL_2
    if (grandTotal !== 50) {
      errors.push(
        `Sessional exam must total 50 marks (current: ${grandTotal})`
      );
    }
    if (partATotal !== 10) {
      errors.push(`Sessional Part A must be 10 marks (current: ${partATotal})`);
    }
    if (partBTotal !== 40) {
      errors.push(`Sessional Part B must be 40 marks (current: ${partBTotal})`);
    }

    // Validate that Part B does NOT have OR options
    for (const group of structure.partB) {
      if (group.hasOR) {
        errors.push(
          `Sessional exams should not have OR options for question ${group.groupNumber}`
        );
      }
    }
  }

  // Validate Part A questions are 2 marks each
  for (const q of structure.partA) {
    if (q.marks !== 2) {
      errors.push(
        `Part A Question ${q.questionNumber} must be 2 marks (current: ${q.marks})`
      );
    }
    if (!q.units || q.units.length === 0) {
      errors.push(
        `Part A Question ${q.questionNumber} must have at least one unit selected`
      );
    }
  }

  // Validate Part B questions
  for (const group of structure.partB) {
    if (group.hasOR && group.options) {
      for (const option of group.options) {
        const slot = option.questionSlot;
        if (slot.marks !== 8 && slot.marks !== 16) {
          errors.push(
            `Part B Question ${group.groupNumber}${option.optionLabel} must be 8 or 16 marks`
          );
        }

        // Validate sub-questions marks total
        if (slot.hasSubQuestions && slot.subQuestions) {
          const subTotal = slot.subQuestions.reduce(
            (sum, sub) => sum + sub.marks,
            0
          );
          if (subTotal !== slot.marks) {
            errors.push(
              `Part B Question ${group.groupNumber}${option.optionLabel} sub-questions must total ${slot.marks} marks (current: ${subTotal})`
            );
          }
        }
      }
    } else if (group.questionSlot) {
      const slot = group.questionSlot;
      if (slot.marks !== 8 && slot.marks !== 16) {
        errors.push(
          `Part B Question ${group.groupNumber} must be 8 or 16 marks`
        );
      }

      // Validate sub-questions marks total
      if (slot.hasSubQuestions && slot.subQuestions) {
        const subTotal = slot.subQuestions.reduce(
          (sum, sub) => sum + sub.marks,
          0
        );
        if (subTotal !== slot.marks) {
          errors.push(
            `Part B Question ${group.groupNumber} sub-questions must total ${slot.marks} marks (current: ${subTotal})`
          );
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
