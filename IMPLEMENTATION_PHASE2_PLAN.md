# BloomIQ Complete Implementation - Phase 2

## 🎯 Completed Tasks

### ✅ 1. Docker Model Runner Configuration
- **Updated docker-compose.yaml**:
  - Model: `ai/gemma3:4B` (Google's latest Gemma model)
  - Context size: 131,072 tokens (131K)
  - Runtime flags: optimized for question generation
  - Environment variables auto-injected: `AI_MODEL_URL`, `AI_MODEL_NAME`

### ✅ 2. AI Question Generator Implementation
- **Complete rewrite of `src/lib/ai-question-generator.ts`**:
  - Uses Docker Model Runner OpenAI-compatible REST API
  - Endpoint: `http://model-runner.docker.internal/engines/llama.cpp/v1/chat/completions`
  - Comprehensive system prompt based on MANGALAM ACADEMY format
  - Handles:
    - Difficulty levels (EASY=2 marks, MEDIUM=8 marks, HARD=16 marks)
    - Bloom's Taxonomy (6 levels)
    - Question types (DIRECT, INDIRECT, SCENARIO_BASED, PROBLEM_BASED)
    - Course Outcome (CO) mapping
  - Robust error handling with fallback to mock questions
  - JSON parsing with markdown fence removal
  - Content truncation for long materials

---

## 📋 Remaining Implementation Tasks

### 3. Question Bank Interface (HIGH PRIORITY)

#### Frontend Pages Needed:
1. **Question Bank Page** (`/coordinator/dashboard/question-paper/question-bank`)
   - View all questions for a course
   - Filter by:
     - Unit (dropdown)
     - Difficulty level
     - Bloom level
     - Approval status (Pending, Approved by CC, Approved by MC, Approved by PC, Fully Approved)
     - Question type
   - Display:
     - Question text
     - Answer text (expandable)
     - Marks
     - Bloom level badge
     - Approval status badge
     - CO mapping
   - Actions:
     - Edit question (inline or modal)
     - Delete question
     - Approve question (role-based)
     - Bulk approve selected
     - Export to CSV/PDF

#### Backend tRPC Procedures:
```typescript
// src/trpc/routers/question-bank-router.ts
export const questionBankRouter = router({
  // Get questions with filters
  getQuestions: protectedProcedure
    .input(z.object({
      courseId: z.string(),
      unit: z.number().optional(),
      difficultyLevel: z.enum(['EASY', 'MEDIUM', 'HARD']).optional(),
      bloomLevel: z.enum(['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE']).optional(),
      status: z.string().optional(),
      page: z.number().default(1),
      pageSize: z.number().default(50),
    }))
    .query(async ({ ctx, input }) => {
      // Build where clause with filters
      // Return paginated results with total count
    }),
  
  // Edit question
  updateQuestion: protectedProcedure
    .input(z.object({
      questionId: z.string(),
      question: z.string(),
      answer: z.string(),
      marks: z.enum(['TWO', 'EIGHT', 'SIXTEEN']),
      difficultyLevel: z.enum(['EASY', 'MEDIUM', 'HARD']),
      bloomLevel: z.enum(['REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE']),
    }))
    .mutation(async ({ ctx, input }) => {
      // Validate user permission
      // Update question
      // Track change history
    }),
  
  // Delete question
  deleteQuestion: protectedProcedure
    .input(z.object({ questionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Soft delete or hard delete
    }),
  
  // Bulk approve
  bulkApprove: protectedProcedure
    .input(z.object({ questionIds: z.array(z.string()) }))
    .mutation(async ({ ctx, input }) => {
      // Approve multiple questions based on user role
    }),
});
```

### 4. Pattern Setting Workflow (HIGH PRIORITY)

#### Database Schema Addition:
```prisma
model QuestionPaperPattern {
  id                    String   @id @default(uuid())
  courseId              String
  patternName           String
  academicYear          String
  semester              String
  
  // Part A - Short Answer Questions
  partA_count           Int      // e.g., 10
  partA_marksEach       Int      // e.g., 2
  partA_totalMarks      Int      // e.g., 20
  partA_bloomLevels     String[] // e.g., ["REMEMBER", "UNDERSTAND"]
  
  // Part B - Essay Questions
  partB_count           Int      // e.g., 4
  partB_marksEach       Int      // e.g., 16
  partB_totalMarks      Int      // e.g., 64
  partB_bloomLevels     String[] // e.g., ["APPLY", "ANALYZE", "EVALUATE"]
  
  totalMarks            Int      // e.g., 84
  duration              Int      // minutes, e.g., 180
  instructions          String?  // Exam instructions
  
  // Approval workflow
  status                PatternStatus @default(DRAFT)
  createdByRole         String
  createdById           String
  
  mcApproved            Boolean  @default(false)
  mcApprovedAt          DateTime?
  mcApprovedById        String?
  
  pcApproved            Boolean  @default(false)
  pcApprovedAt          DateTime?
  pcApprovedById        String?
  
  coeApproved           Boolean  @default(false)
  coeApprovedAt         DateTime?
  coeApprovedById       String?
  
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  course                Course   @relation(fields: [courseId], references: [id])
  generatedPapers       QuestionPaper[]
  
  @@map("question_paper_patterns")
}

enum PatternStatus {
  DRAFT
  PENDING_MC_APPROVAL
  PENDING_PC_APPROVAL
  PENDING_COE_APPROVAL
  APPROVED
  REJECTED
}

model QuestionPaper {
  id                String   @id @default(uuid())
  patternId         String
  courseId          String
  paperCode         String   @unique // e.g., CS301-2025-SEM1-SET-A
  setVariant        String   // e.g., "SET-A", "SET-B", "SET-C"
  
  // Selected questions (JSON array of IDs)
  partA_questionIds String[] // Question IDs for Part A
  partB_questionIds String[] // Question IDs for Part B
  
  // Generated content
  paperContent      String?  // Final paper as HTML/PDF
  answerKeyContent  String?  // Answer key as HTML/PDF
  
  status            PaperStatus @default(DRAFT)
  generatedAt       DateTime?
  generatedBy       String
  
  // Security
  isFinalized       Boolean  @default(false)
  finalizedAt       DateTime?
  
  // Access control - only COE can view
  viewableBy        String[]  // User IDs who can access
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  pattern           QuestionPaperPattern @relation(fields: [patternId], references: [id])
  course            Course   @relation(fields: [courseId], references: [id])
  
  @@map("question_papers")
}

enum PaperStatus {
  DRAFT
  GENERATED
  FINALIZED
}
```

#### Frontend Pages:
1. **Pattern Creator** (`/coordinator/dashboard/question-paper/create-pattern`)
   - Form to define:
     - Part A: count, marks per question, Bloom levels
     - Part B: count, marks per question, Bloom levels
     - Total marks, duration, instructions
   - Submit for MC approval

2. **Pattern Approval** (`/coordinator/dashboard/question-paper/approve-pattern`)
   - MC sees patterns pending MC approval
   - PC sees patterns pending PC approval
   - COE sees patterns pending COE approval
   - Approve/Reject with comments

### 5. Final Question Paper Generation (HIGH PRIORITY)

#### COE Dashboard Pages:
1. **Generate Paper** (`/coe/dashboard/generate-paper`)
   - Select approved pattern
   - System automatically:
     - Fetches fully approved questions
     - Matches questions to pattern requirements
     - Generates multiple variants (SET-A, SET-B, SET-C)
     - Creates answer key
   - Preview paper before finalizing
   - Finalize button (locks paper, prevents changes)

2. **View Papers** (`/coe/dashboard/view-papers`)
   - List all generated papers
   - Filter by course, semester, year
   - Download PDF (question paper + answer key)
   - **Security**: Only COE can access

#### Backend Logic:
```typescript
// src/services/question-paper.service.ts
export class QuestionPaperService {
  
  static async generatePaper(patternId: string, userId: string) {
    // 1. Fetch pattern
    // 2. Fetch fully approved questions (reviewedByCc && reviewedByMc && reviewedByPc)
    // 3. Filter questions by pattern requirements (Part A: Bloom levels, marks, etc.)
    // 4. Randomly select questions matching pattern
    // 5. Generate multiple variants (shuffle question order)
    // 6. Create answer key mapping
    // 7. Save to database
    // 8. Return paper IDs
  }
  
  static async generatePDF(paperId: string) {
    // 1. Fetch paper and questions
    // 2. Use PDF library (e.g., puppeteer, jsPDF, or React-PDF)
    // 3. Format as university question paper
    // 4. Include header, instructions, questions
    // 5. Return PDF buffer
  }
  
  static async generateAnswerKey(paperId: string) {
    // 1. Fetch paper and answer texts
    // 2. Format as answer key document
    // 3. Include question-answer mapping
    // 4. Return PDF buffer
  }
}
```

---

## 🔧 Implementation Steps (Priority Order)

### Step 1: Database Migration (30 minutes)
1. Add `QuestionPaperPattern` and `QuestionPaper` models to schema
2. Run `prisma migrate dev`
3. Update seed scripts

### Step 2: Question Bank Interface (2-3 hours)
1. Create `question-bank-router.ts`
2. Build question bank UI page
3. Implement filters, search, pagination
4. Add edit/delete actions
5. Implement bulk approve

### Step 3: Pattern Workflow (2-3 hours)
1. Create `pattern-router.ts`
2. Build pattern creator UI
3. Build pattern approval UI for MC/PC/COE
4. Implement approval workflow

### Step 4: Paper Generation (3-4 hours)
1. Create `question-paper.service.ts`
2. Implement question selection algorithm
3. Build COE dashboard
4. Implement PDF generation
5. Implement answer key generation
6. Add security restrictions

### Step 5: Comprehensive Testing (2-3 hours)
1. Test PDF upload → chunking → storage
2. Test question generation with AI
3. Test approval workflow
4. Test pattern creation and approval
5. Test paper generation
6. Test PDF export

---

## 📊 Expected Behavior Summary

### Workflow Flow:
```
1. Course Coordinator uploads PDF
   ↓
2. PDF is parsed and chunked
   ↓
3. Content stored in Course_Material.parsedContent
   ↓
4. CC goes to Generate Questions page
   ↓
5. Selects parameters (difficulty, Bloom levels, counts)
   ↓
6. AI generates questions based on parsed content
   ↓
7. Questions saved with status: CREATED_BY_COURSE_COORDINATOR
   ↓
8. CC/MC/PC review and approve questions
   ↓
9. Fully approved questions available in question bank
   ↓
10. CC creates pattern (Part A, Part B specifications)
   ↓
11. Pattern approved by MC → PC → COE
   ↓
12. COE generates paper based on approved pattern
   ↓
13. System fetches fully approved questions matching pattern
   ↓
14. Generates multiple variants (SET-A, B, C)
   ↓
15. COE views, finalizes, downloads PDF
   ↓
16. Final paper accessible only to COE
```

---

## 🔒 Security Requirements

1. **Question Bank**:
   - CC/MC/PC can view questions for their assigned courses
   - Only CC can edit questions they created
   - MC/PC can only approve, not edit

2. **Pattern**:
   - CC creates pattern
   - MC/PC/COE must approve in sequence
   - Cannot skip approval levels

3. **Final Paper**:
   - **ONLY COE can view/download final question papers**
   - Papers are locked after finalization
   - Access logs maintained

---

## 🚀 Quick Start for Next Steps

To continue implementation, we need to:

1. **Update Prisma schema** with new models
2. **Generate migration** and apply it
3. **Create tRPC routers** for each feature
4. **Build UI pages** systematically
5. **Test end-to-end** workflow

Would you like me to proceed with implementing each component step by step?

---

## 📝 Testing Checklist (To be completed after implementation)

- [ ] Upload 5MB PDF successfully
- [ ] PDF parsed and chunked correctly
- [ ] Generate 10 questions with mixed parameters
- [ ] AI model responds within 30 seconds
- [ ] Questions saved to database with correct fields
- [ ] CC approves 5 questions
- [ ] MC approves CC-approved questions
- [ ] PC approves MC-approved questions
- [ ] Question bank filters work correctly
- [ ] Edit question updates successfully
- [ ] Delete question removes from database
- [ ] Create pattern with Part A (10×2) and Part B (4×16)
- [ ] MC approves pattern
- [ ] PC approves pattern
- [ ] COE approves pattern
- [ ] Generate paper with 3 variants
- [ ] Paper contains correct number of questions
- [ ] Answer key matches questions
- [ ] PDF download works
- [ ] Only COE can access final paper
- [ ] Non-COE users get 403 error

---

**Status**: Ready for systematic implementation of remaining features.
**Estimated Time**: 10-15 hours for complete implementation
**Priority**: Question Bank → Pattern → Paper Generation → Testing
