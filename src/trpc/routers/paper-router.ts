import { prisma } from "@/lib/prisma";
import { coordinatorProcedure, createTRPCRouter } from "../init";
import * as z from "zod";
import { TRPCError } from "@trpc/server";

/**
 * Paper Generation Service
 * Selects questions from approved question bank based on pattern
 */
async function selectQuestionsForPaper(
  courseId: string,
  pattern: {
    partA_count: number;
    partA_marksEach: number;
    partB_count: number;
    partB_marksEach: number;
  }
) {
  // Get all fully approved questions for the course
  const approvedQuestions = await prisma.question.findMany({
    where: {
      courseId,
      reviewedByCc: true,
      reviewedByMc: true,
      reviewedByPc: true,
      isFinalized: true,
    },
    orderBy: { createdAt: "desc" },
  });

  if (approvedQuestions.length === 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "No approved questions available for this course",
    });
  }

  // Select Part A questions (TWO marks)
  const partA_marksEnum =
    pattern.partA_marksEach === 2
      ? "TWO"
      : pattern.partA_marksEach === 8
      ? "EIGHT"
      : "SIXTEEN";
  const partAQuestions = approvedQuestions.filter(
    (q) => q.marks === partA_marksEnum
  );

  if (partAQuestions.length < pattern.partA_count) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Not enough ${pattern.partA_marksEach}-mark questions. Need ${pattern.partA_count}, found ${partAQuestions.length}`,
    });
  }

  // Randomly select Part A questions
  const selectedPartA = partAQuestions
    .sort(() => Math.random() - 0.5)
    .slice(0, pattern.partA_count);

  // Select Part B questions (EIGHT or SIXTEEN marks)
  const partB_marksEnum =
    pattern.partB_marksEach === 2
      ? "TWO"
      : pattern.partB_marksEach === 8
      ? "EIGHT"
      : "SIXTEEN";
  const partBQuestions = approvedQuestions.filter(
    (q) =>
      q.marks === partB_marksEnum && !selectedPartA.find((a) => a.id === q.id)
  );

  if (partBQuestions.length < pattern.partB_count) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Not enough ${pattern.partB_marksEach}-mark questions. Need ${pattern.partB_count}, found ${partBQuestions.length}`,
    });
  }

  // Randomly select Part B questions
  const selectedPartB = partBQuestions
    .sort(() => Math.random() - 0.5)
    .slice(0, pattern.partB_count);

  return {
    partA: selectedPartA,
    partB: selectedPartB,
  };
}

/**
 * Generate paper content as JSON
 */
function generatePaperContent(
  pattern: any,
  questions: { partA: any[]; partB: any[] },
  course: { name: string; course_code: string }
) {
  return JSON.stringify({
    header: {
      institution: "MANGALAM ACADEMY OF HIGHER EDUCATION",
      courseName: course.name,
      courseCode: course.course_code,
      academicYear: pattern.academicYear,
      semester: pattern.semester,
      examType: pattern.examType,
      duration: pattern.duration,
      totalMarks: pattern.totalMarks,
    },
    instructions: pattern.instructions || "Answer all questions.",
    partA: {
      title: `Part A (${pattern.partA_marksEach} marks each)`,
      questions: questions.partA.map((q, idx) => ({
        number: idx + 1,
        question: q.question,
        marks: pattern.partA_marksEach,
        bloomLevel: q.bloomLevel,
        unit: q.unit,
      })),
    },
    partB: {
      title: `Part B (${pattern.partB_marksEach} marks each)`,
      questions: questions.partB.map((q, idx) => ({
        number: idx + 1,
        question: q.question,
        marks: pattern.partB_marksEach,
        bloomLevel: q.bloomLevel,
        unit: q.unit,
      })),
    },
  });
}

/**
 * Generate answer key content as JSON
 */
function generateAnswerKeyContent(questions: { partA: any[]; partB: any[] }) {
  return JSON.stringify({
    partA: questions.partA.map((q, idx) => ({
      number: idx + 1,
      question: q.question,
      answer: q.answer,
      marks: q.marks,
    })),
    partB: questions.partB.map((q, idx) => ({
      number: idx + 1,
      question: q.question,
      answer: q.answer,
      marks: q.marks,
    })),
  });
}

/**
 * Paper Router
 * Handles question paper generation (COE only) and viewing
 */
export const paperRouter = createTRPCRouter({
  /**
   * Generate question paper from approved pattern (COE only)
   */
  generatePaper: coordinatorProcedure
    .input(
      z.object({
        patternId: z.string(),
        setVariant: z.string().default("SET-A"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated",
        });
      }

      const userRole = ctx.session.user.role;
      const userId = ctx.session.user.id;

      // Only COE can generate papers
      if (userRole !== "CONTROLLER_OF_EXAMINATION") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Controller of Examination can generate papers",
        });
      }

      // Validate input
      if (!input.patternId || !input.setVariant) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Pattern ID and set variant are required",
        });
      }

      // Get the pattern
      const pattern = await prisma.questionPaperPattern.findUnique({
        where: { id: input.patternId },
      });

      if (!pattern) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pattern not found",
        });
      }

      if (pattern.status !== "APPROVED") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Pattern must be approved before generating paper",
        });
      }

      // Get course details
      const course = await prisma.course.findUnique({
        where: { id: pattern.courseId },
        select: { name: true, course_code: true },
      });

      if (!course) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Course not found",
        });
      }

      // Select questions based on pattern
      const selectedQuestions = await selectQuestionsForPaper(
        pattern.courseId,
        pattern
      );

      // Generate paper code
      const paperCode = `${course.course_code}-${pattern.academicYear}-${pattern.semester}-${input.setVariant}`;

      // Check if paper with this code already exists
      const existingPaper = await prisma.questionPaper.findUnique({
        where: { paperCode },
      });

      if (existingPaper) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Paper with code ${paperCode} already exists`,
        });
      }

      // Generate paper content
      const paperContent = generatePaperContent(
        pattern,
        selectedQuestions,
        course
      );

      // Generate answer key
      const answerKeyContent = generateAnswerKeyContent(selectedQuestions);

      // Create the paper
      const paper = await prisma.questionPaper.create({
        data: {
          patternId: input.patternId,
          courseId: pattern.courseId,
          paperCode,
          setVariant: input.setVariant,
          partA_questionIds: selectedQuestions.partA.map((q) => q.id),
          partB_questionIds: selectedQuestions.partB.map((q) => q.id),
          paperContent,
          answerKeyContent,
          status: "GENERATED",
          generatedAt: new Date(),
          generatedById: userId,
        },
      });

      return {
        success: true,
        paperId: paper.id,
        paper,
      };
    }),

  /**
   * Get all generated papers (COE only)
   */
  getPapers: coordinatorProcedure
    .input(
      z.object({
        courseId: z.string().optional(),
        status: z.enum(["DRAFT", "GENERATED", "FINALIZED"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.session) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated",
        });
      }

      const userRole = ctx.session.user.role;

      // Only COE can view papers
      if (userRole !== "CONTROLLER_OF_EXAMINATION") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Controller of Examination can view papers",
        });
      }

      const where: any = {};

      if (input.courseId) {
        where.courseId = input.courseId;
      }

      if (input.status) {
        where.status = input.status;
      }

      const papers = await prisma.questionPaper.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          pattern: {
            select: {
              patternName: true,
              academicYear: true,
              semester: true,
              examType: true,
            },
          },
        },
      });

      return papers;
    }),

  /**
   * Get paper by ID (COE only)
   */
  getPaperById: coordinatorProcedure
    .input(z.object({ paperId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.session) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated",
        });
      }

      const userRole = ctx.session.user.role;

      // Only COE can view papers
      if (userRole !== "CONTROLLER_OF_EXAMINATION") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Controller of Examination can view papers",
        });
      }

      const paper = await prisma.questionPaper.findUnique({
        where: { id: input.paperId },
        include: {
          pattern: true,
        },
      });

      if (!paper) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Paper not found",
        });
      }

      return paper;
    }),

  /**
   * Finalize paper (COE only)
   */
  finalizePaper: coordinatorProcedure
    .input(z.object({ paperId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated",
        });
      }

      const userRole = ctx.session.user.role;

      // Only COE can finalize papers
      if (userRole !== "CONTROLLER_OF_EXAMINATION") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Controller of Examination can finalize papers",
        });
      }

      const paper = await prisma.questionPaper.update({
        where: { id: input.paperId },
        data: {
          status: "FINALIZED",
          isFinalized: true,
          finalizedAt: new Date(),
        },
      });

      return {
        success: true,
        paper,
      };
    }),

  /**
   * Delete paper (COE only, only if not finalized)
   */
  deletePaper: coordinatorProcedure
    .input(z.object({ paperId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated",
        });
      }

      const userRole = ctx.session.user.role;

      // Only COE can delete papers
      if (userRole !== "CONTROLLER_OF_EXAMINATION") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Controller of Examination can delete papers",
        });
      }

      const paper = await prisma.questionPaper.findUnique({
        where: { id: input.paperId },
      });

      if (!paper) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Paper not found",
        });
      }

      if (paper.isFinalized) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete finalized paper",
        });
      }

      await prisma.questionPaper.delete({
        where: { id: input.paperId },
      });

      return {
        success: true,
        message: "Paper deleted successfully",
      };
    }),
});
