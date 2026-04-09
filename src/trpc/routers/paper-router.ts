import { prisma } from "@/lib/prisma";
import { createTRPCRouter, paperCommitteeProcedure } from "../init";
import * as z from "zod";
import { TRPCError } from "@trpc/server";
import { generateAIText } from "@/services/ai";

const HEADER_META_PREFIX = "[[BLOOMIQ_HEADER_META]]";

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

/**
 * Paper Generation Service
 * Selects questions from approved question bank based on pattern
 */
type SelectedQuestion = {
  id: string;
  question: string;
  answer: string;
  marks: "TWO" | "EIGHT" | "SIXTEEN";
  bloomLevel: string;
  unit: number | null;
  isFallback?: boolean;
};

const ENABLE_DEMO_FALLBACK_QUESTIONS =
  process.env.NODE_ENV !== "production" ||
  process.env.ENABLE_DEMO_FALLBACK_QUESTIONS === "true";

function marksNumberToEnum(marks: number): "TWO" | "EIGHT" | "SIXTEEN" {
  if (marks === 2) return "TWO";
  if (marks === 8) return "EIGHT";
  return "SIXTEEN";
}

function readPrimaryUnit(units: unknown): number | null {
  if (!Array.isArray(units) || units.length === 0) return null;
  const first = Number(units[0]);
  return Number.isFinite(first) ? first : null;
}

function fallbackId(section: "A" | "B", slotLabel: string) {
  return `fallback-${section}-${slotLabel}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createDemoFallbackQuestion(params: {
  section: "A" | "B";
  slotLabel: string;
  marks: number;
  bloomLevel?: string;
  unit?: number | null;
}): SelectedQuestion {
  const marksEnum = marksNumberToEnum(params.marks);
  const unitText = params.unit ? `Unit ${params.unit}` : "the mapped unit";
  const bloom = (params.bloomLevel || "APPLY").toUpperCase();

  return {
    id: fallbackId(params.section, params.slotLabel),
    question: `[DEMO FALLBACK] ${params.section}${params.slotLabel}: Create a ${bloom} level question from ${unitText}.`,
    answer:
      "[DEMO FALLBACK ANSWER] This placeholder answer is auto-generated for demo when approved question bank coverage is insufficient.",
    marks: marksEnum,
    bloomLevel: bloom,
    unit: params.unit ?? null,
    isFallback: true,
  };
}

function fallbackOrThrow(params: {
  section: "A" | "B";
  slotLabel: string;
  marks: number;
  bloomLevel?: string;
  unit?: number | null;
}) {
  if (ENABLE_DEMO_FALLBACK_QUESTIONS) {
    return createDemoFallbackQuestion(params);
  }

  throw new TRPCError({
    code: "BAD_REQUEST",
    message:
      "Not enough approved questions to fill this paper pattern. Enable demo fallback questions for non-production demos.",
  });
}

function pickFromPool(pool: SelectedQuestion[], selectedIds: Set<string>) {
  if (!pool || pool.length === 0) return undefined;
  const candidates = pool.filter((item) => !selectedIds.has(item.id));
  if (candidates.length === 0) return undefined;
  const idx = Math.floor(Math.random() * candidates.length);
  return candidates[idx];
}

async function selectQuestionsForPaper(
  courseId: string,
  pattern: {
    partAStructure?: unknown;
    partBStructure?: unknown;
    totalMarks: number;
  },
) {
  // Get all approved questions for the course (supports current + legacy markers).
  const approvedQuestions = await prisma.question.findMany({
    where: {
      courseId,
      OR: [
        { status: "ACCEPTED" },
        {
          reviewedByCc: true,
          reviewedByMc: true,
          reviewedByPc: true,
        },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  // Mark questions as selected by tracking usage across generated sets,
  // then prevent duplicates in subsequent set generation.
  const existingPapers = await prisma.questionPaper.findMany({
    where: { courseId },
    select: {
      partA_questionIds: true,
      partB_questionIds: true,
    },
  });

  const alreadySelectedIds = new Set(
    existingPapers.flatMap((paper) => [
      ...(paper.partA_questionIds || []),
      ...(paper.partB_questionIds || []),
    ]),
  );

  const allApprovedQuestions: SelectedQuestion[] = approvedQuestions.map(
    (q) => ({
      id: q.id,
      question: q.question,
      answer: q.answer,
      marks: q.marks,
      bloomLevel: q.bloomLevel,
      unit: q.unit,
    }),
  );

  const availableQuestions: SelectedQuestion[] = allApprovedQuestions.filter(
    (q) => !alreadySelectedIds.has(q.id),
  );

  // Prefer never-used questions first, then reuse approved ones if needed.
  const preferredPoolByMarks: Record<
    "TWO" | "EIGHT" | "SIXTEEN",
    SelectedQuestion[]
  > = {
    TWO: availableQuestions.filter((q) => q.marks === "TWO"),
    EIGHT: availableQuestions.filter((q) => q.marks === "EIGHT"),
    SIXTEEN: availableQuestions.filter((q) => q.marks === "SIXTEEN"),
  };

  const fallbackPoolByMarks: Record<
    "TWO" | "EIGHT" | "SIXTEEN",
    SelectedQuestion[]
  > = {
    TWO: allApprovedQuestions.filter((q) => q.marks === "TWO"),
    EIGHT: allApprovedQuestions.filter((q) => q.marks === "EIGHT"),
    SIXTEEN: allApprovedQuestions.filter((q) => q.marks === "SIXTEEN"),
  };

  const selectedIdsInThisPaper = new Set<string>();

  const pickQuestion = (marksEnum: "TWO" | "EIGHT" | "SIXTEEN") => {
    const preferred = pickFromPool(
      preferredPoolByMarks[marksEnum],
      selectedIdsInThisPaper,
    );
    if (preferred) {
      selectedIdsInThisPaper.add(preferred.id);
      return preferred;
    }

    const fallback = pickFromPool(
      fallbackPoolByMarks[marksEnum],
      selectedIdsInThisPaper,
    );
    if (fallback) {
      selectedIdsInThisPaper.add(fallback.id);
      return fallback;
    }

    return undefined;
  };

  // Parse pattern structures
  const partASlots = Array.isArray(pattern.partAStructure)
    ? (pattern.partAStructure as any[])
    : [];
  const partBGroups = Array.isArray(pattern.partBStructure)
    ? (pattern.partBStructure as any[])
    : [];

  const selectedPartA: SelectedQuestion[] = [];
  const selectedPartB: SelectedQuestion[] = [];

  for (let i = 0; i < partASlots.length; i += 1) {
    const slot = partASlots[i];
    const marks = Number(slot?.marks || 2);
    const marksEnum = marksNumberToEnum(marks);
    const picked = pickQuestion(marksEnum);

    if (picked) {
      selectedPartA.push(picked);
      continue;
    }

    selectedPartA.push(
      fallbackOrThrow({
        section: "A",
        slotLabel: String(slot?.questionNumber || i + 1),
        marks,
        bloomLevel: slot?.bloomLevel,
        unit: readPrimaryUnit(slot?.units),
      }),
    );
  }

  for (let groupIdx = 0; groupIdx < partBGroups.length; groupIdx += 1) {
    const group = partBGroups[groupIdx];
    const groupNumber = Number(group?.groupNumber || groupIdx + 1);

    if (
      group?.hasOR &&
      Array.isArray(group?.options) &&
      group.options.length > 0
    ) {
      for (let optIdx = 0; optIdx < group.options.length; optIdx += 1) {
        const option = group.options[optIdx];
        const slot = option?.questionSlot || {};
        const marks = Number(slot?.marks || 16);
        const marksEnum = marksNumberToEnum(marks);
        const picked = pickQuestion(marksEnum);

        if (picked) {
          selectedPartB.push(picked);
          continue;
        }

        selectedPartB.push(
          fallbackOrThrow({
            section: "B",
            slotLabel: `${groupNumber}${String(option?.optionLabel || "")}`,
            marks,
            bloomLevel: slot?.bloomLevel,
            unit: readPrimaryUnit(slot?.units),
          }),
        );
      }
      continue;
    }

    const slot = group?.questionSlot || {};
    const marks = Number(slot?.marks || 16);
    const marksEnum = marksNumberToEnum(marks);
    const picked = pickQuestion(marksEnum);

    if (picked) {
      selectedPartB.push(picked);
      continue;
    }

    selectedPartB.push(
      fallbackOrThrow({
        section: "B",
        slotLabel: String(groupNumber),
        marks,
        bloomLevel: slot?.bloomLevel,
        unit: readPrimaryUnit(slot?.units),
      }),
    );
  }

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
  course: { name: string; course_code: string; departmentName?: string | null },
) {
  const partAQuestions = questions.partA.map((q, idx) => ({
    number: idx + 1,
    question: q.question,
    marks: Number(q.marks === "TWO" ? 2 : q.marks === "EIGHT" ? 8 : 16),
    bloomLevel: q.bloomLevel,
    unit: q.unit,
    mappingCO: q.unit ? `CO${q.unit}` : "-",
  }));

  const partBStructure = Array.isArray(pattern.partBStructure)
    ? pattern.partBStructure
    : [];
  const partBQuestions: Array<{
    number: number;
    displayNumber: string;
    groupNumber: number;
    optionLabel?: string;
    hasOR: boolean;
    question: string;
    marks: number;
    bloomLevel?: string;
    unit?: number;
    mappingCO: string;
  }> = [];

  let partBIndex = 0;
  let fallbackGroupNumber = 11;

  for (const group of partBStructure as any[]) {
    const groupNumber = Number(group?.groupNumber || fallbackGroupNumber);
    if (
      group?.hasOR &&
      Array.isArray(group?.options) &&
      group.options.length > 0
    ) {
      for (const option of group.options as any[]) {
        const selected = questions.partB[partBIndex++];
        if (!selected) continue;

        const optionLabel =
          String(option?.optionLabel || "")
            .trim()
            .toUpperCase() || undefined;
        partBQuestions.push({
          number: partBQuestions.length + 6,
          displayNumber: optionLabel
            ? `${groupNumber}${optionLabel}`
            : String(groupNumber),
          groupNumber,
          optionLabel,
          hasOR: true,
          question: selected.question,
          marks: Number(
            selected.marks === "TWO" ? 2 : selected.marks === "EIGHT" ? 8 : 16,
          ),
          bloomLevel: selected.bloomLevel,
          unit: selected.unit,
          mappingCO: selected.unit ? `CO${selected.unit}` : "-",
        });
      }
    } else {
      const selected = questions.partB[partBIndex++];
      if (!selected) continue;

      partBQuestions.push({
        number: partBQuestions.length + 6,
        displayNumber: String(groupNumber),
        groupNumber,
        hasOR: false,
        question: selected.question,
        marks: Number(
          selected.marks === "TWO" ? 2 : selected.marks === "EIGHT" ? 8 : 16,
        ),
        bloomLevel: selected.bloomLevel,
        unit: selected.unit,
        mappingCO: selected.unit ? `CO${selected.unit}` : "-",
      });
    }

    fallbackGroupNumber += 1;
  }

  // Fallback if older patterns do not have expected Part B structure metadata
  while (partBIndex < questions.partB.length) {
    const selected = questions.partB[partBIndex++];
    partBQuestions.push({
      number: partBQuestions.length + 6,
      displayNumber: String(partBQuestions.length + 6),
      groupNumber: partBQuestions.length + 6,
      hasOR: false,
      question: selected.question,
      marks: Number(
        selected.marks === "TWO" ? 2 : selected.marks === "EIGHT" ? 8 : 16,
      ),
      bloomLevel: selected.bloomLevel,
      unit: selected.unit,
      mappingCO: selected.unit ? `CO${selected.unit}` : "-",
    });
  }

  const now = new Date();
  const examDate = now.toISOString().slice(0, 10);
  const examTime = now.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const allQuestions = [...partAQuestions, ...partBQuestions];
  const bloomLevels = [
    "REMEMBER",
    "UNDERSTAND",
    "APPLY",
    "ANALYZE",
    "EVALUATE",
    "CREATE",
  ] as const;

  const courseOutcomes = Array.from(
    new Set(allQuestions.map((q) => q.mappingCO).filter((v) => v && v !== "-")),
  );

  const bloomSummaryByCO = courseOutcomes.map((co) => {
    const row: Record<string, number | string> = { co };
    let total = 0;

    for (const level of bloomLevels) {
      const levelTotal = allQuestions
        .filter((q) => q.mappingCO === co && q.bloomLevel === level)
        .reduce((sum, q) => sum + q.marks, 0);
      row[level] = levelTotal;
      total += levelTotal;
    }

    row.total = total;
    return row;
  });

  const bloomTotals = bloomLevels.reduce<Record<string, number>>(
    (acc, level) => {
      acc[level] = allQuestions
        .filter((q) => q.bloomLevel === level)
        .reduce((sum, q) => sum + q.marks, 0);
      return acc;
    },
    {},
  );

  const decodedMeta = decodeInstructionsWithMeta(pattern.instructions);

  return JSON.stringify({
    header: {
      institution:
        "KALASALINGAM ACADEMY OF RESEARCH AND EDUCATION (Deemed to be University)",
      department:
        course.departmentName || "OFFICE OF DEAN - FRESHMAN ENGINEERING",
      courseName: course.name,
      courseCode: course.course_code,
      academicYear: pattern.academicYear,
      semester: pattern.semesterType,
      degreeYearSem: decodedMeta.degreeYearSem || "B.Tech. / I / ODD",
      examType: pattern.examType,
      examDate,
      examTime,
      dateSession: decodedMeta.dateSession || `${examDate} / ${examTime}`,
      duration: pattern.duration,
      totalMarks: pattern.totalMarks,
    },
    instructions: decodedMeta.instructions || "Answer all questions.",
    partA: {
      title: "PART - A",
      subtitle: "Answer All Questions",
      questions: partAQuestions,
    },
    partB: {
      title: "PART - B",
      subtitle: "Answer All Questions",
      questions: partBQuestions,
    },
    assessmentPattern: {
      bloomLevels,
      rows: bloomSummaryByCO,
      totals: {
        ...bloomTotals,
        total: allQuestions.reduce((sum, q) => sum + q.marks, 0),
      },
    },
    approvals: {
      deanApproved: false,
      deanApprovedAt: null,
      deanApprovedById: null,
      coeApproved: false,
      coeApprovedAt: null,
      coeApprovedById: null,
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

async function regenerateAnswerForQuestion(question: string, marks: number) {
  const prompt = `You are an expert university examiner. Generate a model answer for the following question.

Question: ${question}
Marks: ${marks}

Requirements:
- Keep it concise and scoring-oriented.
- Use clear key points suitable for answer-key evaluation.
- Include important formulas/steps when relevant.
- Do not include markdown headings.`;

  return generateAIText(prompt, {
    temperature: 0.4,
  });
}

function parseMappingCOToUnit(mappingCO?: string | null) {
  if (!mappingCO) return null;
  const match = String(mappingCO)
    .trim()
    .match(/^CO\s*([0-9]+)$/i);
  if (!match) return null;
  const unit = Number(match[1]);
  return Number.isFinite(unit) && unit > 0 ? unit : null;
}

async function regenerateQuestionForPaperSlot(params: {
  courseName: string;
  section: "partA" | "partB";
  questionNumber: number;
  marks: number;
  bloomLevel: string;
  mappingCO: string;
  previousQuestion?: string;
}) {
  const prompt = `You are an expert university examiner. Regenerate an improved question-paper item.

Constraints:
- Course: ${params.courseName}
- Section: ${params.section === "partA" ? "PART - A" : "PART - B"}
- Question number: ${params.questionNumber}
- Marks: ${params.marks}
- Bloom level: ${params.bloomLevel}
- CO mapping: ${params.mappingCO}
- Preserve academic rigor and keep wording exam-ready.
- Return ONLY the regenerated question text. No numbering, no markdown, no explanation.

Current question:
${params.previousQuestion || "N/A"}`;

  const regenerated = await generateAIText(prompt, {
    temperature: 0.7,
  });

  return regenerated
    .trim()
    .replace(/^['"`]+|['"`]+$/g, "")
    .replace(/\s+/g, " ");
}

/**
 * Paper Router
 * Handles question paper generation and confidential paper operations
 */
export const paperRouter = createTRPCRouter({
  getCommitteeContext: paperCommitteeProcedure.query(({ ctx }) => {
    return {
      role: ctx.session?.user?.role,
      userId: ctx.session?.user?.id,
    };
  }),

  /**
   * Generate question paper from approved pattern (paper committee)
   */
  generatePaper: paperCommitteeProcedure
    .input(
      z.object({
        patternId: z.string(),
        setVariant: z.string().default("SET-A"),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated",
        });
      }

      const userId = ctx.session.user.id;
      const userRole = ctx.session.user.role;

      if (userRole !== "HOD") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "Only HoD can generate question papers after coordinator approvals",
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
        select: {
          id: true,
          courseId: true,
          status: true,
          mcApproved: true,
          pcApproved: true,
          createdByRole: true,
          academicYear: true,
          semesterType: true,
          examType: true,
          totalMarks: true,
          duration: true,
          partAStructure: true,
          partBStructure: true,
          instructions: true,
          course: {
            select: {
              departmentId: true,
              department: {
                select: {
                  hodId: true,
                  name: true,
                },
              },
            },
          },
        },
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

      if (
        !pattern.mcApproved ||
        !pattern.pcApproved ||
        pattern.createdByRole !== "COURSE_COORDINATOR"
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Pattern must complete CC -> MC -> PC approvals before paper generation",
        });
      }

      if (
        !pattern.course.departmentId ||
        pattern.course.department?.hodId !== userId
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message:
            "You can only generate papers for courses in your department as assigned HoD",
        });
      }

      // Get course details
      const course = await prisma.course.findUnique({
        where: { id: pattern.courseId },
        select: {
          departmentId: true,
          name: true,
          course_code: true,
          department: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!course) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Course not found",
        });
      }

      if (!course.departmentId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Course must be mapped to a department before paper generation",
        });
      }

      // Select questions based on pattern
      const selectedQuestions = await selectQuestionsForPaper(
        pattern.courseId,
        pattern,
      );

      // Generate paper code
      const paperCode = `${course.course_code}-${pattern.academicYear}-${pattern.semesterType}-${input.setVariant}`;

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
      const paperContent = generatePaperContent(pattern, selectedQuestions, {
        name: course.name,
        course_code: course.course_code,
        departmentName: course.department?.name,
      });

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
   * Get all generated papers (paper committee)
   */
  getPapers: paperCommitteeProcedure
    .input(
      z.object({
        courseId: z.string().optional(),
        status: z.enum(["DRAFT", "GENERATED", "FINALIZED"]).optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.session) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated",
        });
      }

      const userId = ctx.session.user.id;
      const userRole = ctx.session.user.role;
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
              semesterType: true,
              examType: true,
              totalMarks: true,
              course: {
                select: {
                  departmentId: true,
                  course_code: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      return papers;
    }),

  /**
   * Get paper by ID (paper committee)
   */
  getPaperById: paperCommitteeProcedure
    .input(z.object({ paperId: z.string() }))
    .query(async ({ ctx, input }) => {
      if (!ctx.session) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated",
        });
      }

      const userId = ctx.session.user.id;
      const userRole = ctx.session.user.role;

      const paper = await prisma.questionPaper.findUnique({
        where: { id: input.paperId },
        include: {
          pattern: {
            include: {
              course: {
                select: {
                  department: {
                    select: {
                      hodId: true,
                      deanId: true,
                    },
                  },
                  course_code: true,
                  name: true,
                },
              },
            },
          },
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
   * Finalize paper (paper committee)
   */
  finalizePaper: paperCommitteeProcedure
    .input(z.object({ paperId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated",
        });
      }

      if (ctx.session.user.role !== "CONTROLLER_OF_EXAMINATION") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Controller of Examination can finalize papers",
        });
      }

      const existingPaper = await prisma.questionPaper.findUnique({
        where: { id: input.paperId },
        select: {
          id: true,
          isFinalized: true,
          paperContent: true,
        },
      });

      if (!existingPaper) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Paper not found",
        });
      }

      if (existingPaper.isFinalized) {
        return {
          success: true,
          alreadyFinalized: true,
        };
      }

      let paperContent: any;
      try {
        paperContent = existingPaper.paperContent
          ? JSON.parse(existingPaper.paperContent)
          : {};
      } catch {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Paper content is corrupted",
        });
      }

      const deanApproved = Boolean(paperContent?.approvals?.deanApproved);
      if (!deanApproved) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Dean approval is required before COE final approval",
        });
      }

      if (
        !paperContent.approvals ||
        typeof paperContent.approvals !== "object"
      ) {
        paperContent.approvals = {};
      }
      paperContent.approvals.coeApproved = true;
      paperContent.approvals.coeApprovedAt = new Date().toISOString();
      paperContent.approvals.coeApprovedById = ctx.session.user.id;

      const paper = await prisma.questionPaper.update({
        where: { id: input.paperId },
        data: {
          status: "FINALIZED",
          isFinalized: true,
          finalizedAt: new Date(),
          paperContent: JSON.stringify(paperContent),
        },
      });

      return {
        success: true,
        paper,
      };
    }),

  approvePaperByDean: paperCommitteeProcedure
    .input(z.object({ paperId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated",
        });
      }

      if (ctx.session.user.role !== "DEAN") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only Dean can approve generated papers at this stage",
        });
      }

      const paper = await prisma.questionPaper.findUnique({
        where: { id: input.paperId },
        select: {
          id: true,
          isFinalized: true,
          paperContent: true,
          course: {
            select: {
              department: {
                select: {
                  deanId: true,
                },
              },
            },
          },
        },
      });

      if (!paper) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Paper not found" });
      }

      if (paper.isFinalized) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Finalized papers cannot be re-approved",
        });
      }

      if (paper.course.department?.deanId !== ctx.session.user.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You can only approve papers for your department",
        });
      }

      let paperContent: any;
      try {
        paperContent = paper.paperContent ? JSON.parse(paper.paperContent) : {};
      } catch {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Paper content is corrupted",
        });
      }

      if (
        !paperContent.approvals ||
        typeof paperContent.approvals !== "object"
      ) {
        paperContent.approvals = {};
      }

      if (paperContent.approvals.deanApproved) {
        return { success: true, alreadyApproved: true };
      }

      paperContent.approvals.deanApproved = true;
      paperContent.approvals.deanApprovedAt = new Date().toISOString();
      paperContent.approvals.deanApprovedById = ctx.session.user.id;

      await prisma.questionPaper.update({
        where: { id: input.paperId },
        data: {
          paperContent: JSON.stringify(paperContent),
        },
      });

      return { success: true };
    }),

  /**
   * Delete paper (paper committee, only if not finalized)
   */
  deletePaper: paperCommitteeProcedure
    .input(z.object({ paperId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.session) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Not authenticated",
        });
      }

      const userRole = ctx.session.user.role;

      if (
        userRole !== "HOD" &&
        userRole !== "DEAN" &&
        userRole !== "CONTROLLER_OF_EXAMINATION"
      ) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only paper committee members can delete papers",
        });
      }

      const paper = await prisma.questionPaper.findUnique({
        where: { id: input.paperId },
        select: {
          id: true,
          isFinalized: true,
        },
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

  updatePaperQuestion: paperCommitteeProcedure
    .input(
      z.object({
        paperId: z.string(),
        section: z.enum(["partA", "partB"]),
        questionNumber: z.number().int().positive(),
        question: z.string().min(10, "Question must be at least 10 characters"),
        marks: z.number().int().positive().optional(),
        bloomLevel: z
          .enum([
            "REMEMBER",
            "UNDERSTAND",
            "APPLY",
            "ANALYZE",
            "EVALUATE",
            "CREATE",
          ])
          .optional(),
        mappingCO: z.string().trim().min(1).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const paper = await prisma.questionPaper.findUnique({
        where: { id: input.paperId },
        select: {
          id: true,
          paperContent: true,
          answerKeyContent: true,
        },
      });

      if (!paper) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Paper not found" });
      }

      let paperContent: any;
      let answerKeyContent: any;

      try {
        paperContent = paper.paperContent ? JSON.parse(paper.paperContent) : {};
        answerKeyContent = paper.answerKeyContent
          ? JSON.parse(paper.answerKeyContent)
          : { partA: [], partB: [] };
      } catch {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Paper content is corrupted and cannot be edited",
        });
      }

      const paperSection = paperContent?.[input.section]?.questions;
      const answerSection = answerKeyContent?.[input.section];

      if (!Array.isArray(paperSection) || !Array.isArray(answerSection)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Paper sections are not in expected format",
        });
      }

      const questionIndex = paperSection.findIndex(
        (item: { number?: number }) => item.number === input.questionNumber,
      );

      if (questionIndex === -1) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Question not found in this paper section",
        });
      }

      paperSection[questionIndex].question = input.question;
      if (typeof input.marks === "number") {
        paperSection[questionIndex].marks = input.marks;
      }
      if (input.bloomLevel) {
        paperSection[questionIndex].bloomLevel = input.bloomLevel;
      }
      if (input.mappingCO) {
        const mappingCO = input.mappingCO.trim();
        paperSection[questionIndex].mappingCO = mappingCO;
        const derivedUnit = parseMappingCOToUnit(mappingCO);
        if (derivedUnit !== null) {
          paperSection[questionIndex].unit = derivedUnit;
        }
      }

      if (answerSection[questionIndex]) {
        answerSection[questionIndex].question = input.question;
        if (typeof input.marks === "number") {
          answerSection[questionIndex].marks = input.marks;
        }
      }

      await prisma.questionPaper.update({
        where: { id: input.paperId },
        data: {
          paperContent: JSON.stringify(paperContent),
          answerKeyContent: JSON.stringify(answerKeyContent),
        },
      });

      return { success: true };
    }),

  deletePaperQuestion: paperCommitteeProcedure
    .input(
      z.object({
        paperId: z.string(),
        section: z.enum(["partA", "partB"]),
        questionNumber: z.number().int().positive(),
      }),
    )
    .mutation(async ({ input }) => {
      const paper = await prisma.questionPaper.findUnique({
        where: { id: input.paperId },
        select: {
          id: true,
          isFinalized: true,
          partA_questionIds: true,
          partB_questionIds: true,
          paperContent: true,
          answerKeyContent: true,
        },
      });

      if (!paper) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Paper not found" });
      }

      if (paper.isFinalized) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete questions from a finalized paper",
        });
      }

      let paperContent: any;
      let answerKeyContent: any;

      try {
        paperContent = paper.paperContent ? JSON.parse(paper.paperContent) : {};
        answerKeyContent = paper.answerKeyContent
          ? JSON.parse(paper.answerKeyContent)
          : { partA: [], partB: [] };
      } catch {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Paper content is corrupted and cannot be edited",
        });
      }

      const paperSection = paperContent?.[input.section]?.questions;
      const answerSection = answerKeyContent?.[input.section];

      if (!Array.isArray(paperSection) || !Array.isArray(answerSection)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Paper sections are not in expected format",
        });
      }

      const questionIndex = paperSection.findIndex(
        (item: { number?: number }) => item.number === input.questionNumber,
      );

      if (questionIndex === -1) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Question not found in this paper section",
        });
      }

      paperSection.splice(questionIndex, 1);
      if (questionIndex < answerSection.length) {
        answerSection.splice(questionIndex, 1);
      }

      const partAIds = [...paper.partA_questionIds];
      const partBIds = [...paper.partB_questionIds];

      if (input.section === "partA") {
        if (questionIndex < partAIds.length) {
          partAIds.splice(questionIndex, 1);
        }

        for (let i = 0; i < paperSection.length; i += 1) {
          paperSection[i].number = i + 1;
        }
      } else {
        if (questionIndex < partBIds.length) {
          partBIds.splice(questionIndex, 1);
        }

        for (let i = 0; i < paperSection.length; i += 1) {
          paperSection[i].number = i + 6;
        }
      }

      for (let i = 0; i < answerSection.length; i += 1) {
        answerSection[i].number = i + 1;
      }

      await prisma.questionPaper.update({
        where: { id: input.paperId },
        data: {
          partA_questionIds: partAIds,
          partB_questionIds: partBIds,
          paperContent: JSON.stringify(paperContent),
          answerKeyContent: JSON.stringify(answerKeyContent),
        },
      });

      return { success: true };
    }),

  regeneratePaperAnswerForQuestion: paperCommitteeProcedure
    .input(
      z.object({
        paperId: z.string(),
        section: z.enum(["partA", "partB"]),
        questionNumber: z.number().int().positive(),
        questionText: z
          .string()
          .min(10, "Question must be at least 10 characters")
          .optional(),
        marks: z.number().int().positive().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const paper = await prisma.questionPaper.findUnique({
        where: { id: input.paperId },
        select: {
          id: true,
          paperContent: true,
          answerKeyContent: true,
        },
      });

      if (!paper) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Paper not found" });
      }

      let paperContent: any;
      let answerKeyContent: any;

      try {
        paperContent = paper.paperContent ? JSON.parse(paper.paperContent) : {};
        answerKeyContent = paper.answerKeyContent
          ? JSON.parse(paper.answerKeyContent)
          : { partA: [], partB: [] };
      } catch {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Paper content is corrupted and cannot regenerate answers",
        });
      }

      const paperSection = paperContent?.[input.section]?.questions;
      const answerSection = answerKeyContent?.[input.section];

      if (!Array.isArray(paperSection) || !Array.isArray(answerSection)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Paper sections are not in expected format",
        });
      }

      const questionIndex = paperSection.findIndex(
        (item: { number?: number }) => item.number === input.questionNumber,
      );

      if (questionIndex === -1) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Question not found in this paper section",
        });
      }

      const currentQuestion = paperSection[questionIndex];
      const effectiveQuestion = input.questionText || currentQuestion.question;
      const effectiveMarks =
        typeof input.marks === "number"
          ? input.marks
          : Number(currentQuestion.marks || 0);

      currentQuestion.question = effectiveQuestion;
      if (typeof input.marks === "number") {
        currentQuestion.marks = input.marks;
      }

      const regeneratedAnswer = await regenerateAnswerForQuestion(
        effectiveQuestion,
        effectiveMarks,
      );

      if (answerSection[questionIndex]) {
        answerSection[questionIndex].question = effectiveQuestion;
        answerSection[questionIndex].answer = regeneratedAnswer;
        answerSection[questionIndex].marks = effectiveMarks;
      }

      await prisma.questionPaper.update({
        where: { id: input.paperId },
        data: {
          paperContent: JSON.stringify(paperContent),
          answerKeyContent: JSON.stringify(answerKeyContent),
        },
      });

      return {
        success: true,
        answer: regeneratedAnswer,
      };
    }),

  regeneratePaperQuestionForQuestion: paperCommitteeProcedure
    .input(
      z.object({
        paperId: z.string(),
        section: z.enum(["partA", "partB"]),
        questionNumber: z.number().int().positive(),
        marks: z.number().int().positive().optional(),
        bloomLevel: z
          .enum([
            "REMEMBER",
            "UNDERSTAND",
            "APPLY",
            "ANALYZE",
            "EVALUATE",
            "CREATE",
          ])
          .optional(),
        mappingCO: z.string().trim().min(1).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      const paper = await prisma.questionPaper.findUnique({
        where: { id: input.paperId },
        select: {
          id: true,
          paperContent: true,
          answerKeyContent: true,
          course: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!paper) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Paper not found" });
      }

      let paperContent: any;
      let answerKeyContent: any;

      try {
        paperContent = paper.paperContent ? JSON.parse(paper.paperContent) : {};
        answerKeyContent = paper.answerKeyContent
          ? JSON.parse(paper.answerKeyContent)
          : { partA: [], partB: [] };
      } catch {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Paper content is corrupted and cannot regenerate questions",
        });
      }

      const paperSection = paperContent?.[input.section]?.questions;
      const answerSection = answerKeyContent?.[input.section];

      if (!Array.isArray(paperSection) || !Array.isArray(answerSection)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Paper sections are not in expected format",
        });
      }

      const questionIndex = paperSection.findIndex(
        (item: { number?: number }) => item.number === input.questionNumber,
      );

      if (questionIndex === -1) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Question not found in this paper section",
        });
      }

      const currentQuestion = paperSection[questionIndex];
      const effectiveMarks =
        typeof input.marks === "number"
          ? input.marks
          : Number(
              currentQuestion.marks || (input.section === "partA" ? 2 : 16),
            );
      const effectiveBloom = String(
        input.bloomLevel || currentQuestion.bloomLevel || "APPLY",
      ).toUpperCase();
      const effectiveMappingCO = String(
        input.mappingCO || currentQuestion.mappingCO || "-",
      ).trim();

      const regeneratedQuestion = await regenerateQuestionForPaperSlot({
        courseName: paper.course.name,
        section: input.section,
        questionNumber: input.questionNumber,
        marks: effectiveMarks,
        bloomLevel: effectiveBloom,
        mappingCO: effectiveMappingCO,
        previousQuestion: currentQuestion.question,
      });

      const regeneratedAnswer = await regenerateAnswerForQuestion(
        regeneratedQuestion,
        effectiveMarks,
      );

      currentQuestion.question = regeneratedQuestion;
      currentQuestion.marks = effectiveMarks;
      currentQuestion.bloomLevel = effectiveBloom;
      currentQuestion.mappingCO = effectiveMappingCO;
      const derivedUnit = parseMappingCOToUnit(effectiveMappingCO);
      if (derivedUnit !== null) {
        currentQuestion.unit = derivedUnit;
      }

      if (answerSection[questionIndex]) {
        answerSection[questionIndex].question = regeneratedQuestion;
        answerSection[questionIndex].answer = regeneratedAnswer;
        answerSection[questionIndex].marks = effectiveMarks;
      }

      await prisma.questionPaper.update({
        where: { id: input.paperId },
        data: {
          paperContent: JSON.stringify(paperContent),
          answerKeyContent: JSON.stringify(answerKeyContent),
        },
      });

      return {
        success: true,
        question: regeneratedQuestion,
        answer: regeneratedAnswer,
      };
    }),

  updatePaperDateTime: paperCommitteeProcedure
    .input(
      z.object({
        paperId: z.string(),
        examDate: z.string().min(1, "Exam date is required"),
        examTime: z.string().min(1, "Exam time is required"),
      }),
    )
    .mutation(async ({ input }) => {
      const paper = await prisma.questionPaper.findUnique({
        where: { id: input.paperId },
        select: {
          id: true,
          paperContent: true,
        },
      });

      if (!paper) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Paper not found" });
      }

      let paperContent: any;
      try {
        paperContent = paper.paperContent ? JSON.parse(paper.paperContent) : {};
      } catch {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Paper content is corrupted and cannot be edited",
        });
      }

      if (!paperContent.header || typeof paperContent.header !== "object") {
        paperContent.header = {};
      }

      paperContent.header.examDate = input.examDate;
      paperContent.header.examTime = input.examTime;
      paperContent.header.dateSession = `${input.examDate} / ${input.examTime}`;

      await prisma.questionPaper.update({
        where: { id: input.paperId },
        data: {
          paperContent: JSON.stringify(paperContent),
        },
      });

      return { success: true };
    }),
});
