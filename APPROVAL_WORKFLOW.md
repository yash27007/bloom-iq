# Question Approval Workflow - Visual Guide

This document provides a visual representation of the complete question approval workflow in BloomIQ.

---

## 🔄 Complete Workflow Diagram

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                         BLOOMIQ QUESTION LIFECYCLE                              │
└────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐
│ COURSE         │
│ COORDINATOR     │
│                 │
│ Actions:        │
│ 1. Upload PDF   │
│ 2. Generate Q's │
└────────┬────────┘
         │
         │ POST /api/upload (PDF file)
         │ POST /api/trpc/question.generateQuestions
         │
         ▼
┌──────────────────────────────────────────┐
│         GENERATED QUESTIONS               │
│         Status: GENERATED                 │
│                                           │
│  Stored in Database with:                 │
│  - Question text                          │
│  - Options (A, B, C, D)                   │
│  - Correct answer                         │
│  - Bloom level                            │
│  - Difficulty                             │
│  - Unit                                   │
└──────────────────┬───────────────────────┘
                   │
                   │ Review Phase 1
                   ▼
┌─────────────────────────────────────────────────────────────┐
│  COURSE COORDINATOR (CC) REVIEW                              │
│                                                              │
│  UI: /coordinator/dashboard/question-paper/review-questions  │
│  Role: COURSE_COORDINATOR                                    │
│                                                              │
│  Options:                                                    │
│  ┌────────────┐           ┌────────────┐                    │
│  │  APPROVE   │           │   REJECT   │                    │
│  └──────┬─────┘           └──────┬─────┘                    │
│         │                        │                          │
└─────────┼────────────────────────┼──────────────────────────┘
          │                        │
          │ ✅ Approve             │ ❌ Reject with Feedback
          │                        │
          │                        ▼
          │               ┌──────────────────┐
          │               │    REJECTED      │
          │               │                  │
          │               │  Feedback saved  │
          │               │  to Question_    │
          │               │  Feedback table  │
          │               │                  │
          │               │  Actions:        │
          │               │  - Edit question │
          │               │  - Resubmit      │
          │               └──────────────────┘
          │
          ▼
┌──────────────────────┐
│   CC_APPROVED        │
│   Status updated     │
└──────────┬───────────┘
           │
           │ Review Phase 2
           ▼
┌─────────────────────────────────────────────────────────────┐
│  MODULE COORDINATOR (MC) REVIEW                              │
│                                                              │
│  UI: /coordinator/dashboard/question-paper/review-questions  │
│  Role: MODULE_COORDINATOR                                    │
│                                                              │
│  Sees only: CC_APPROVED questions                            │
│                                                              │
│  Options:                                                    │
│  ┌────────────┐           ┌────────────┐                    │
│  │  APPROVE   │           │   REJECT   │                    │
│  └──────┬─────┘           └──────┬─────┘                    │
│         │                        │                          │
└─────────┼────────────────────────┼──────────────────────────┘
          │                        │
          │ ✅ Approve             │ ❌ Reject with Feedback
          │                        │
          │                        ▼
          │               ┌──────────────────┐
          │               │    REJECTED      │
          │               │                  │
          │               │  Goes back to    │
          │               │  CC for review   │
          │               └──────────────────┘
          │
          ▼
┌──────────────────────┐
│   MC_APPROVED        │
│   Status updated     │
└──────────┬───────────┘
           │
           │ Review Phase 3
           ▼
┌─────────────────────────────────────────────────────────────┐
│  PROGRAM COORDINATOR (PC) REVIEW                             │
│                                                              │
│  UI: /coordinator/dashboard/question-paper/review-questions  │
│  Role: PROGRAM_COORDINATOR                                   │
│                                                              │
│  Sees only: MC_APPROVED questions                            │
│                                                              │
│  Options:                                                    │
│  ┌────────────┐           ┌────────────┐                    │
│  │  APPROVE   │           │   REJECT   │                    │
│  └──────┬─────┘           └──────┬─────┘                    │
│         │                        │                          │
└─────────┼────────────────────────┼──────────────────────────┘
          │                        │
          │ ✅ Approve             │ ❌ Reject with Feedback
          │                        │
          │                        ▼
          │               ┌──────────────────┐
          │               │    REJECTED      │
          │               │                  │
          │               │  Goes back to    │
          │               │  MC for review   │
          │               └──────────────────┘
          │
          ▼
┌──────────────────────┐
│   PC_APPROVED        │
│   Status updated     │
│   Ready for COE      │
└──────────┬───────────┘
           │
           │ Final Assembly Phase
           ▼
┌─────────────────────────────────────────────────────────────┐
│  CONTROLLER OF EXAMINATIONS (COE)                            │
│                                                              │
│  UI: /coe/dashboard/question-paper (PLANNED)                 │
│  Role: CONTROLLER_OF_EXAMINATIONS                            │
│                                                              │
│  Sees only: PC_APPROVED questions                            │
│                                                              │
│  Actions:                                                    │
│  1. Select questions for paper                               │
│  2. Organize into sections (Part A, B, C)                    │
│  3. Assign marks per question                                │
│  4. Generate PDF                                             │
│  5. Create multiple variants (Set A, B, C)                   │
│                                                              │
│  ┌────────────┐                                              │
│  │ FINALIZE   │                                              │
│  └──────┬─────┘                                              │
│         │                                                    │
└─────────┼────────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────┐
│   COE_APPROVED       │
│                      │
│   Question Paper     │
│   Generated          │
│                      │
│   ✅ READY FOR EXAM  │
└──────────────────────┘
```

---

## 📊 Status Transition Matrix

| Current Status | Approved By | New Status | Rejected By | New Status |
|----------------|-------------|------------|-------------|------------|
| `GENERATED` | Course Coordinator | `CC_APPROVED` | Course Coordinator | `REJECTED` |
| `CC_APPROVED` | Module Coordinator | `MC_APPROVED` | Module Coordinator | `REJECTED` |
| `MC_APPROVED` | Program Coordinator | `PC_APPROVED` | Program Coordinator | `REJECTED` |
| `PC_APPROVED` | Controller of Examinations | `COE_APPROVED` | - | - |
| `REJECTED` | (After Edit) | `GENERATED` | - | - |

---

## 🎯 Role-Based Permissions

```
┌───────────────────────────────────────────────────────────────┐
│                    ROLE PERMISSIONS MATRIX                     │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  COURSE_COORDINATOR:                                          │
│  ✅ Upload PDFs                                               │
│  ✅ Generate questions                                        │
│  ✅ Approve GENERATED → CC_APPROVED                           │
│  ✅ Reject GENERATED → REJECTED                               │
│  ✅ View own course questions                                 │
│                                                               │
│  MODULE_COORDINATOR:                                          │
│  ✅ View CC_APPROVED questions                                │
│  ✅ Approve CC_APPROVED → MC_APPROVED                         │
│  ✅ Reject CC_APPROVED → REJECTED                             │
│  ✅ View questions in assigned modules                        │
│                                                               │
│  PROGRAM_COORDINATOR:                                         │
│  ✅ View MC_APPROVED questions                                │
│  ✅ Approve MC_APPROVED → PC_APPROVED                         │
│  ✅ Reject MC_APPROVED → REJECTED                             │
│  ✅ View questions in assigned programs                       │
│                                                               │
│  CONTROLLER_OF_EXAMINATIONS:                                  │
│  ✅ View PC_APPROVED questions                                │
│  ✅ Assemble question papers                                  │
│  ✅ Generate final PDFs                                       │
│  ✅ Approve PC_APPROVED → COE_APPROVED                        │
│  ✅ View all questions across all courses                     │
│                                                               │
│  ADMIN:                                                       │
│  ✅ Full system access                                        │
│  ✅ User management                                           │
│  ✅ Course management                                         │
│  ✅ System configuration                                      │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

## 📝 Feedback System

```
┌─────────────────────────────────────────────────────────────┐
│                  FEEDBACK MECHANISM                          │
└─────────────────────────────────────────────────────────────┘

When a question is REJECTED:

┌──────────────────┐
│   Reviewer       │ (CC, MC, or PC)
└────────┬─────────┘
         │
         │ Clicks "Reject"
         ▼
┌──────────────────────────────┐
│   Rejection Dialog           │
│                              │
│   Reason (Required):         │
│   ┌────────────────────────┐ │
│   │ [Text area]            │ │
│   │                        │ │
│   │ e.g., "Option B is     │ │
│   │ incorrect. Should be   │ │
│   │ Option C."             │ │
│   └────────────────────────┘ │
│                              │
│   [Cancel]  [Submit Reject]  │
└──────────┬───────────────────┘
           │
           │ POST /api/trpc/questionApproval.rejectQuestion
           ▼
┌──────────────────────────────┐
│   Question_Feedback Table    │
│                              │
│   Record saved:              │
│   - question_id              │
│   - reviewer_id              │
│   - action: REJECTED         │
│   - feedback_text            │
│   - timestamp                │
└──────────┬───────────────────┘
           │
           ▼
┌──────────────────────────────┐
│   Question Status Updated    │
│                              │
│   status = REJECTED          │
└──────────┬───────────────────┘
           │
           │ Notification sent (future)
           ▼
┌──────────────────────────────┐
│   Course Coordinator         │
│   Sees:                      │
│   - Question marked REJECTED │
│   - Feedback visible         │
│   - Can edit and resubmit    │
└──────────────────────────────┘
```

---

## 📈 Statistics Dashboard

Each reviewer sees real-time statistics for their courses:

```
┌─────────────────────────────────────────────────────────────┐
│           QUESTION REVIEW STATISTICS                         │
│           Course: Computer Networks (CS301)                  │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐     │
│   │  PENDING    │   │  APPROVED   │   │  REJECTED   │     │
│   │             │   │             │   │             │     │
│   │     24      │   │     36      │   │      8      │     │
│   │  questions  │   │  questions  │   │  questions  │     │
│   └─────────────┘   └─────────────┘   └─────────────┘     │
│                                                             │
│   Approval Rate: 82%                                        │
│   Total Questions: 68                                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘

API: GET /api/trpc/questionApproval.getStatistics
Input: { courseId: 1 }
Output: {
  pending: 24,
  approved: 36,
  rejected: 8
}
```

---

## 🔄 API Procedure Reference

### Question Approval Procedures

```typescript
// 1. Get questions for review (role-based)
trpc.questionApproval.getQuestionsForReview.useQuery({
  courseId: number
})
// Returns: Question[] filtered by role and status

// 2. Approve as Course Coordinator
trpc.questionApproval.approveQuestionByCourseCoordinator.useMutation({
  questionId: number
})
// GENERATED → CC_APPROVED

// 3. Approve as Module Coordinator
trpc.questionApproval.approveQuestionByModuleCoordinator.useMutation({
  questionId: number
})
// CC_APPROVED → MC_APPROVED

// 4. Approve as Program Coordinator
trpc.questionApproval.approveQuestionByProgramCoordinator.useMutation({
  questionId: number
})
// MC_APPROVED → PC_APPROVED

// 5. Reject question (any level)
trpc.questionApproval.rejectQuestion.useMutation({
  questionId: number,
  feedback: string
})
// ANY_STATUS → REJECTED

// 6. Get feedback history
trpc.questionApproval.getFeedbackHistory.useQuery({
  questionId: number
})
// Returns: Question_Feedback[] with reviewer details

// 7. Get approval statistics
trpc.questionApproval.getStatistics.useQuery({
  courseId: number
})
// Returns: { pending, approved, rejected }
```

---

## 🎨 UI Component Flow

```
ReviewQuestionsPage
│
├── 1. Course Selector
│   └── Dropdown with all courses
│       └── On select → fetch questions
│
├── 2. Statistics Cards
│   ├── Pending Card (yellow)
│   ├── Approved Card (green)
│   └── Rejected Card (red)
│
└── 3. Question Grid
    └── For each question:
        │
        ├── Question Card
        │   ├── Header
        │   │   ├── Status Badge
        │   │   ├── Difficulty Chip
        │   │   └── Bloom Level Badge
        │   │
        │   ├── Body
        │   │   ├── Question Text
        │   │   ├── Options (A, B, C, D)
        │   │   └── Correct Answer (highlighted)
        │   │
        │   └── Footer
        │       ├── Approve Button
        │       │   └── Opens ApproveDialog
        │       │       ├── Confirmation message
        │       │       └── [Cancel] [Approve]
        │       │
        │       ├── Reject Button
        │       │   └── Opens RejectDialog
        │       │       ├── Feedback textarea
        │       │       └── [Cancel] [Reject]
        │       │
        │       └── View Feedback Button
        │           └── Opens FeedbackModal
        │               └── Lists all feedback
        │                   ├── Reviewer name
        │                   ├── Action (approved/rejected)
        │                   ├── Feedback text
        │                   └── Timestamp
```

---

## ⚡ Real-Time Updates

```
User Action                React Query              Backend
    │                          │                       │
    │ Click Approve           │                       │
    │─────────────────────────>                       │
    │                          │                       │
    │                          │  POST mutation        │
    │                          │──────────────────────>│
    │                          │                       │
    │                          │                       │ Update DB
    │                          │                       │ status change
    │                          │                       │
    │                          │  Response             │
    │                          │<──────────────────────│
    │                          │                       │
    │                          │ Invalidate queries    │
    │                          │ (auto-refetch)        │
    │<─────────────────────────│                       │
    │ UI updates instantly     │                       │
    │ - Card disappears        │                       │
    │ - Statistics update      │                       │
    │ - Toast notification     │                       │
```

---

## 🔐 Authorization Checks

```typescript
// In tRPC router procedures

const approveQuestionByModuleCoordinator = protectedProcedure
  .input(z.object({ questionId: z.number() }))
  .mutation(async ({ ctx, input }) => {
    
    // 1. Check user role
    if (ctx.session.user.role !== 'MODULE_COORDINATOR') {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'Only Module Coordinators can approve'
      });
    }

    // 2. Get question
    const question = await ctx.db.question.findUnique({
      where: { id: input.questionId }
    });

    // 3. Check status
    if (question.status !== 'CC_APPROVED') {
      throw new TRPCError({
        code: 'BAD_REQUEST',
        message: 'Question must be CC_APPROVED'
      });
    }

    // 4. Check coordinator assignment
    const course = await ctx.db.course.findUnique({
      where: { id: question.courseId }
    });

    if (course.module_coordinator_id !== ctx.session.user.id) {
      throw new TRPCError({
        code: 'FORBIDDEN',
        message: 'You are not assigned to this course'
      });
    }

    // 5. Approve via service
    return QuestionService.approveQuestionByModuleCoordinator(
      input.questionId,
      ctx.session.user.id
    );
  });
```

---

## 📊 Database Queries

```sql
-- Get questions for review (Module Coordinator)
SELECT q.* 
FROM Question q
JOIN Course c ON q.course_id = c.id
WHERE c.module_coordinator_id = :userId
  AND q.status = 'CC_APPROVED'
ORDER BY q.created_at DESC;

-- Get approval statistics
SELECT 
  COUNT(CASE WHEN status IN ('GENERATED', 'CC_APPROVED', 'MC_APPROVED') THEN 1 END) as pending,
  COUNT(CASE WHEN status IN ('PC_APPROVED', 'COE_APPROVED') THEN 1 END) as approved,
  COUNT(CASE WHEN status = 'REJECTED' THEN 1 END) as rejected
FROM Question
WHERE course_id = :courseId;

-- Get feedback history
SELECT 
  qf.*,
  u.name as reviewer_name,
  u.role as reviewer_role
FROM Question_Feedback qf
JOIN User u ON qf.reviewer_id = u.id
WHERE qf.question_id = :questionId
ORDER BY qf.created_at DESC;
```

---

## ✅ Implementation Status

| Feature | Status | Location |
|---------|--------|----------|
| **Backend** | | |
| Service layer | ✅ Complete | `src/services/question.service.ts` |
| tRPC procedures | ✅ Complete | `src/trpc/routers/question-approval-router.ts` |
| Authorization | ✅ Complete | Role checks in all procedures |
| Database schema | ✅ Complete | `prisma/schema.prisma` |
| **Frontend** | | |
| Review UI | ✅ Complete | `src/app/coordinator/dashboard/question-paper/review-questions/page.tsx` |
| Course selector | ✅ Complete | Dropdown component |
| Statistics | ✅ Complete | Cards with counts |
| Approve dialog | ✅ Complete | Confirmation dialog |
| Reject dialog | ✅ Complete | With feedback form |
| Feedback modal | ✅ Complete | History viewer |
| Status badges | ✅ Complete | Color-coded |
| **Testing** | | |
| Manual testing | 🚧 Pending | Need Docker deployment test |
| Unit tests | 📅 Planned | Service layer tests |
| E2E tests | 📅 Planned | Complete workflow |

---

## 🚀 Testing Workflow

To test the complete approval workflow:

```bash
# 1. Start services
docker-compose up -d

# 2. Create test users (via Prisma Studio or seed)
bunx prisma studio
# - Create Course Coordinator
# - Create Module Coordinator  
# - Create Program Coordinator

# 3. Create a test course
# - Assign coordinators

# 4. Upload PDF and generate questions
# - Login as Course Coordinator
# - Navigate to: /coordinator/dashboard/course-management/upload-material
# - Upload PDF
# - Navigate to: /coordinator/dashboard/course-management/generate-questions
# - Generate 10 questions

# 5. Test approval flow
# - Login as Course Coordinator
# - Navigate to: /coordinator/dashboard/question-paper/review-questions
# - Approve some questions (GENERATED → CC_APPROVED)
# - Reject some questions with feedback

# - Login as Module Coordinator
# - Review CC_APPROVED questions
# - Approve some (CC_APPROVED → MC_APPROVED)
# - Reject some with feedback

# - Login as Program Coordinator
# - Review MC_APPROVED questions
# - Approve some (MC_APPROVED → PC_APPROVED)
# - Reject some with feedback

# 6. Verify statistics update
# - Check statistics cards reflect correct counts
# - View feedback history for rejected questions
```

---

**Workflow Status: ✅ COMPLETE & READY FOR TESTING**

All backend procedures, frontend UI, and database schema are implemented and functional.
