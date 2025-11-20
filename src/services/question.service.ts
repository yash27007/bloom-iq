/**
 * Question Service
 *
 * Handles all question-related business logic including:
 * - Question generation from parsed content
 * - Question CRUD operations
 * - Approval workflow (CC → MC → PC → COE)
 * - Rejection feedback management
 * - Question status transitions
 */

import { prisma } from "@/lib/prisma";
import type {
  QuestionStatus,
  BloomLevel,
  DifficultyLevel,
  GenerationType,
  Marks,
} from "@/generated/prisma";
import type { ServiceResult } from "./types";

/**
 * Question data transfer objects
 */
export type CreateQuestionInput = {
  courseId: string;
  materialId?: string;
  unit: number;
  question: string;
  answer: string;
  questionType:
    | "REMEMBER"
    | "ANALYZE"
    | "UNDERSTAND"
    | "APPLY"
    | "EVALUATE"
    | "CREATE";
  difficultyLevel: DifficultyLevel;
  bloomLevel: BloomLevel;
  generationType: GenerationType;
  marks: Marks;
  materialName?: string;
};

export type UpdateQuestionInput = {
  id: string;
  question?: string;
  answer?: string;
  questionType?:
    | "REMEMBER"
    | "ANALYZE"
    | "UNDERSTAND"
    | "APPLY"
    | "EVALUATE"
    | "CREATE";
  difficultyLevel?: DifficultyLevel;
  bloomLevel?: BloomLevel;
  generationType?: GenerationType;
  marks?: Marks;
  unit?: number;
};

export type QuestionResponse = {
  id: string;
  courseId: string;
  materialId?: string | null;
  unit: number;
  question: string;
  answer: string;
  questionType: string;
  difficultyLevel: DifficultyLevel;
  bloomLevel: BloomLevel;
  generationType: GenerationType;
  marks: Marks;
  status: QuestionStatus;
  reviewedByCc: boolean;
  reviewedByMc: boolean;
  reviewedByPc: boolean;
  ccApprovedAt?: Date | null;
  mcApprovedAt?: Date | null;
  pcApprovedAt?: Date | null;
  materialName?: string | null;
  isFinalized: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type QuestionWithFeedback = QuestionResponse & {
  feedback: Array<{
    id: string;
    remarks: string;
    createdAt: Date;
  }>;
  course: {
    id: string;
    course_code: string;
    name: string;
  };
};

/**
 * Service class for question operations
 */
export class QuestionService {
  /**
   * Create a new question
   */
  static async createQuestion(
    input: CreateQuestionInput
  ): Promise<ServiceResult<QuestionResponse>> {
    const question = await prisma.question.create({
      data: {
        courseId: input.courseId,
        materialId: input.materialId,
        unit: input.unit,
        question: input.question,
        answer: input.answer,
        questionType: input.questionType,
        difficultyLevel: input.difficultyLevel,
        bloomLevel: input.bloomLevel,
        generationType: input.generationType,
        marks: input.marks,
        materialName: input.materialName,
        status: "CREATED_BY_COURSE_COORDINATOR",
      },
      select: {
        id: true,
        courseId: true,
        materialId: true,
        unit: true,
        question: true,
        answer: true,
        questionType: true,
        difficultyLevel: true,
        bloomLevel: true,
        generationType: true,
        marks: true,
        status: true,
        reviewedByCc: true,
        reviewedByMc: true,
        reviewedByPc: true,
        ccApprovedAt: true,
        mcApprovedAt: true,
        pcApprovedAt: true,
        materialName: true,
        isFinalized: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      data: question as QuestionResponse,
      message: "Question created successfully.",
    };
  }

  /**
   * Bulk create questions (for AI generation)
   */
  static async createQuestions(
    questions: CreateQuestionInput[]
  ): Promise<ServiceResult<QuestionResponse[]>> {
    const createdQuestions = await prisma.question.createMany({
      data: questions.map((q) => ({
        courseId: q.courseId,
        materialId: q.materialId,
        unit: q.unit,
        question: q.question,
        answer: q.answer,
        questionType: q.questionType,
        difficultyLevel: q.difficultyLevel,
        bloomLevel: q.bloomLevel,
        generationType: q.generationType,
        marks: q.marks,
        materialName: q.materialName,
        status: "CREATED_BY_COURSE_COORDINATOR" as QuestionStatus,
      })),
    });

    return {
      message: `Successfully created ${createdQuestions.count} question(s).`,
    };
  }

  /**
   * Get question by ID with feedback
   */
  static async getQuestionById(
    id: string
  ): Promise<ServiceResult<QuestionWithFeedback>> {
    const question = await prisma.question.findUnique({
      where: { id },
      select: {
        id: true,
        courseId: true,
        materialId: true,
        unit: true,
        question: true,
        answer: true,
        questionType: true,
        difficultyLevel: true,
        bloomLevel: true,
        generationType: true,
        marks: true,
        status: true,
        reviewedByCc: true,
        reviewedByMc: true,
        reviewedByPc: true,
        ccApprovedAt: true,
        mcApprovedAt: true,
        pcApprovedAt: true,
        materialName: true,
        isFinalized: true,
        createdAt: true,
        updatedAt: true,
        feedback: {
          select: {
            id: true,
            remarks: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
        course: {
          select: {
            id: true,
            course_code: true,
            name: true,
          },
        },
      },
    });

    if (!question) {
      throw new Error("Question not found.");
    }

    return { data: question as QuestionWithFeedback };
  }

  /**
   * Update question
   */
  static async updateQuestion(
    input: UpdateQuestionInput
  ): Promise<ServiceResult<QuestionResponse>> {
    const { id, ...updates } = input;

    const question = await prisma.question.update({
      where: { id },
      data: updates,
      select: {
        id: true,
        courseId: true,
        materialId: true,
        unit: true,
        question: true,
        answer: true,
        questionType: true,
        difficultyLevel: true,
        bloomLevel: true,
        generationType: true,
        marks: true,
        status: true,
        reviewedByCc: true,
        reviewedByMc: true,
        reviewedByPc: true,
        ccApprovedAt: true,
        mcApprovedAt: true,
        pcApprovedAt: true,
        materialName: true,
        isFinalized: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      data: question as QuestionResponse,
      message: "Question updated successfully.",
    };
  }

  /**
   * Delete question
   */
  static async deleteQuestion(id: string): Promise<ServiceResult<null>> {
    await prisma.question.delete({ where: { id } });
    return { message: "Question deleted successfully." };
  }

  /**
   * Course Coordinator approves question
   */
  static async approveQuestionByCourseCoordinator(
    questionId: string
  ): Promise<ServiceResult<QuestionResponse>> {
    const question = await prisma.question.update({
      where: { id: questionId },
      data: {
        reviewedByCc: true,
        ccApprovedAt: new Date(),
        status: "UNDER_REVIEW_FROM_MODULE_COORDINATOR",
      },
      select: {
        id: true,
        courseId: true,
        materialId: true,
        unit: true,
        question: true,
        answer: true,
        questionType: true,
        difficultyLevel: true,
        bloomLevel: true,
        generationType: true,
        marks: true,
        status: true,
        reviewedByCc: true,
        reviewedByMc: true,
        reviewedByPc: true,
        ccApprovedAt: true,
        mcApprovedAt: true,
        pcApprovedAt: true,
        materialName: true,
        isFinalized: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      data: question as QuestionResponse,
      message: "Question approved by Course Coordinator.",
    };
  }

  /**
   * Module Coordinator approves question
   */
  static async approveQuestionByModuleCoordinator(
    questionId: string
  ): Promise<ServiceResult<QuestionResponse>> {
    const question = await prisma.question.update({
      where: { id: questionId },
      data: {
        reviewedByMc: true,
        mcApprovedAt: new Date(),
        status: "UNDER_REVIEW_FROM_PROGRAM_COORDINATOR",
      },
      select: {
        id: true,
        courseId: true,
        materialId: true,
        unit: true,
        question: true,
        answer: true,
        questionType: true,
        difficultyLevel: true,
        bloomLevel: true,
        generationType: true,
        marks: true,
        status: true,
        reviewedByCc: true,
        reviewedByMc: true,
        reviewedByPc: true,
        ccApprovedAt: true,
        mcApprovedAt: true,
        pcApprovedAt: true,
        materialName: true,
        isFinalized: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      data: question as QuestionResponse,
      message: "Question approved by Module Coordinator.",
    };
  }

  /**
   * Program Coordinator approves question (final approval)
   */
  static async approveQuestionByProgramCoordinator(
    questionId: string
  ): Promise<ServiceResult<QuestionResponse>> {
    const question = await prisma.question.update({
      where: { id: questionId },
      data: {
        reviewedByPc: true,
        pcApprovedAt: new Date(),
        status: "ACCEPTED",
        isFinalized: true,
      },
      select: {
        id: true,
        courseId: true,
        materialId: true,
        unit: true,
        question: true,
        answer: true,
        questionType: true,
        difficultyLevel: true,
        bloomLevel: true,
        generationType: true,
        marks: true,
        status: true,
        reviewedByCc: true,
        reviewedByMc: true,
        reviewedByPc: true,
        ccApprovedAt: true,
        mcApprovedAt: true,
        pcApprovedAt: true,
        materialName: true,
        isFinalized: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      data: question as QuestionResponse,
      message:
        "Question approved by Program Coordinator. Question is now finalized.",
    };
  }

  /**
   * Reject question with feedback
   */
  static async rejectQuestion(
    questionId: string,
    remarks: string,
    rejectedByRole: "CC" | "MC" | "PC"
  ): Promise<ServiceResult<QuestionResponse>> {
    // Add feedback
    await prisma.question_Feedback.create({
      data: {
        questionId,
        remarks,
      },
    });

    // Update question status
    const question = await prisma.question.update({
      where: { id: questionId },
      data: {
        status: "REJECTED",
      },
      select: {
        id: true,
        courseId: true,
        materialId: true,
        unit: true,
        question: true,
        answer: true,
        questionType: true,
        difficultyLevel: true,
        bloomLevel: true,
        generationType: true,
        marks: true,
        status: true,
        reviewedByCc: true,
        reviewedByMc: true,
        reviewedByPc: true,
        ccApprovedAt: true,
        mcApprovedAt: true,
        pcApprovedAt: true,
        materialName: true,
        isFinalized: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return {
      data: question as QuestionResponse,
      message: `Question rejected by ${rejectedByRole}. Feedback has been recorded.`,
    };
  }

  /**
   * Get questions by course with filters
   */
  static async getQuestionsByCourse(
    courseId: string,
    filters?: {
      status?: QuestionStatus;
      unit?: number;
      bloomLevel?: BloomLevel;
      difficultyLevel?: DifficultyLevel;
    }
  ): Promise<ServiceResult<QuestionResponse[]>> {
    const questions = await prisma.question.findMany({
      where: {
        courseId,
        ...(filters?.status && { status: filters.status }),
        ...(filters?.unit && { unit: filters.unit }),
        ...(filters?.bloomLevel && { bloomLevel: filters.bloomLevel }),
        ...(filters?.difficultyLevel && {
          difficultyLevel: filters.difficultyLevel,
        }),
      },
      select: {
        id: true,
        courseId: true,
        materialId: true,
        unit: true,
        question: true,
        answer: true,
        questionType: true,
        difficultyLevel: true,
        bloomLevel: true,
        generationType: true,
        marks: true,
        status: true,
        reviewedByCc: true,
        reviewedByMc: true,
        reviewedByPc: true,
        ccApprovedAt: true,
        mcApprovedAt: true,
        pcApprovedAt: true,
        materialName: true,
        isFinalized: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: [{ unit: "asc" }, { createdAt: "desc" }],
    });

    return { data: questions as QuestionResponse[] };
  }

  /**
   * Get questions pending review for a specific coordinator role
   */
  static async getQuestionsPendingReview(
    coordinatorId: string,
    role: "COURSE_COORDINATOR" | "MODULE_COORDINATOR" | "PROGRAM_COORDINATOR"
  ): Promise<ServiceResult<QuestionWithFeedback[]>> {
    let statusFilter: QuestionStatus[] = [];

    if (role === "COURSE_COORDINATOR") {
      statusFilter = ["CREATED_BY_COURSE_COORDINATOR"];
    } else if (role === "MODULE_COORDINATOR") {
      statusFilter = ["UNDER_REVIEW_FROM_MODULE_COORDINATOR"];
    } else if (role === "PROGRAM_COORDINATOR") {
      statusFilter = ["UNDER_REVIEW_FROM_PROGRAM_COORDINATOR"];
    }

    const questions = await prisma.question.findMany({
      where: {
        status: { in: statusFilter },
        course: {
          OR:
            role === "COURSE_COORDINATOR"
              ? [{ courseCoordinatorId: coordinatorId }]
              : role === "MODULE_COORDINATOR"
              ? [{ moduleCoordinatorId: coordinatorId }]
              : [{ programCoordinatorId: coordinatorId }],
        },
      },
      select: {
        id: true,
        courseId: true,
        materialId: true,
        unit: true,
        question: true,
        answer: true,
        questionType: true,
        difficultyLevel: true,
        bloomLevel: true,
        generationType: true,
        marks: true,
        status: true,
        reviewedByCc: true,
        reviewedByMc: true,
        reviewedByPc: true,
        ccApprovedAt: true,
        mcApprovedAt: true,
        pcApprovedAt: true,
        materialName: true,
        isFinalized: true,
        createdAt: true,
        updatedAt: true,
        feedback: {
          select: {
            id: true,
            remarks: true,
            createdAt: true,
          },
          orderBy: { createdAt: "desc" },
        },
        course: {
          select: {
            id: true,
            course_code: true,
            name: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return { data: questions as QuestionWithFeedback[] };
  }
}
