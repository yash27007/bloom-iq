# NEW QUESTION PAPER PATTERN SYSTEM - IMPLEMENTATION GUIDE

## Overview
Complete redesign of the pattern system to match university exam requirements with flexible Part A/B configuration, OR options, sub-questions, and unit-based question selection.

## Database Schema Changes

### New Enums
```prisma
enum ExamType {
  SESSIONAL_1
  SESSIONAL_2
  END_SEMESTER
}

enum SemesterType {
  ODD
  EVEN
}
```

### QuestionPaperPattern Model
- **examType**: SESSIONAL_1, SESSIONAL_2, or END_SEMESTER
- **semesterType**: ODD or EVEN
- **totalMarks**: 50 (Sessional) or 100 (End Semester)
- **partAStructure**: JSON array of Part A question slots
- **partBStructure**: JSON array of Part B question groups

## Pattern Structure

### Part A Questions
- Always 2 marks each
- Sessional: 5 questions (10 marks total)
- End Semester: 10 questions (20 marks total)

**Structure:**
```typescript
{
  questionNumber: 1,
  marks: 2,
  bloomLevel: 'REMEMBER',
  units: [1, 2], // Question can come from unit 1 or 2
  description: 'Optional description'
}
```

### Part B Questions

#### Sessional Exams (40 marks, NO OR options)
- Direct questions only
- Can be 8 or 16 marks
- Can have sub-questions

**Example:**
```typescript
{
  groupNumber: 11,
  hasOR: false,
  questionSlot: {
    questionNumber: 11,
    marks: 16,
    hasSubQuestions: true,
    subQuestions: [
      { label: 'a', marks: 8, bloomLevel: 'APPLY', units: [1] },
      { label: 'b', marks: 8, bloomLevel: 'ANALYZE', units: [2] }
    ]
  }
}
```

#### End Semester Exams (80 marks, WITH OR options)
- Each question group has 2 options (A and B)
- Student chooses one option
- Can be 8 or 16 marks
- Can have sub-questions

**Example:**
```typescript
{
  groupNumber: 11,
  hasOR: true,
  options: [
    {
      optionLabel: 'A',
      questionSlot: {
        questionNumber: 11,
        marks: 16,
        bloomLevel: 'APPLY',
        units: [1, 2]
      }
    },
    {
      optionLabel: 'B',
      questionSlot: {
        questionNumber: 11,
        marks: 16,
        hasSubQuestions: true,
        subQuestions: [
          { label: 'a', marks: 8, bloomLevel: 'UNDERSTAND', units: [3] },
          { label: 'b', marks: 8, bloomLevel: 'ANALYZE', units: [4] }
        ]
      }
    }
  ]
}
```

## Validation Rules

### Marks Validation
- **Sessional**: Total 50 marks (Part A: 10, Part B: 40)
- **End Semester**: Total 100 marks (Part A: 20, Part B: 80)
- Part A questions must be exactly 2 marks
- Part B questions must be 8 or 16 marks
- Sub-questions must sum to parent question marks

### OR Options Validation
- **End Semester**: MUST have OR options in Part B
- **Sessional**: MUST NOT have OR options in Part B

### Unit Selection
- Each question slot must have at least one unit selected
- Multiple units can be selected (question will come from any of those units)

## API Endpoints (tRPC)

### Pattern Router Procedures

1. **createPattern**: Create new pattern (Course Coordinator only)
2. **updatePattern**: Update DRAFT or REJECTED patterns
3. **getPatterns**: List patterns with filters (courseId, examType, semesterType, status)
4. **getPatternById**: Get single pattern with full details
5. **getPendingApprovals**: Get patterns pending approval based on user role
6. **approvePattern**: Approve pattern (MC → PC → COE)
7. **rejectPattern**: Reject pattern with remarks
8. **deletePattern**: Delete DRAFT patterns only
9. **getApprovedPatterns**: Get approved patterns for COE paper generation

## Approval Workflow

```
CC Creates Pattern
    ↓
PENDING_MC_APPROVAL
    ↓ (MC Approves)
PENDING_PC_APPROVAL
    ↓ (PC Approves)
PENDING_COE_APPROVAL
    ↓ (COE Approves)
APPROVED
```

**Rejection at any stage**: Status becomes REJECTED, CC can edit and resubmit

## UI Components Needed

### Pattern Creation Page
1. **Basic Info Section**
   - Pattern Name
   - Course Selection
   - Academic Year (YYYY-YYYY format)
   - Exam Type (SESSIONAL_1, SESSIONAL_2, END_SEMESTER)
   - Semester Type (ODD, EVEN)
   - Duration (minutes)
   - Instructions (optional)

2. **Part A Configuration**
   - Dynamic question slots (5 or 10 based on exam type)
   - For each question:
     - Question Number (auto-assigned)
     - Bloom Level selector
     - Unit selection (multi-select checkboxes)
     - Description (optional)

3. **Part B Configuration**
   - Dynamic question groups
   - For Sessional: Direct question slots
   - For End Semester: OR options (A/B)
   - For each question/option:
     - Marks (8 or 16)
     - Bloom Level
     - Units
     - Sub-questions toggle
     - If sub-questions enabled:
       - Add/remove sub-questions
       - Label (a, b, c)
       - Marks per sub-question
       - Bloom level per sub-question
       - Units per sub-question

4. **Real-time Validation**
   - Show total marks calculation
   - Highlight errors (marks mismatch, missing units, etc.)
   - Disable submit if validation fails

### Pattern List Page
- Filter by course, exam type, semester, status
- Display pattern details
- Show approval status
- Edit/Delete actions (for DRAFT only)

### Pattern Approval Page
- Show pending patterns based on role
- View pattern structure
- Approve/Reject with remarks
- Show approval timeline

## Example Pattern Creation Flow

### Sessional Exam (50 marks)
1. Select SESSIONAL_1 or SESSIONAL_2
2. Part A: Add 5 questions × 2 marks = 10 marks
3. Part B: Add questions totaling 40 marks
   - Example: 5 questions × 8 marks OR
   - Example: 2 questions × 16 marks + 1 question × 8 marks
4. No OR options
5. Submit for MC approval

### End Semester Exam (100 marks)
1. Select END_SEMESTER
2. Part A: Add 10 questions × 2 marks = 20 marks
3. Part B: Add question groups totaling 80 marks
   - Each group has Option A OR Option B
   - Example: 5 groups × 16 marks OR
   - Example: 10 groups × 8 marks
4. Must have OR options for all Part B groups
5. Submit for MC approval

## TypeScript Types

All types are defined in `src/types/pattern.ts`:
- `PartAQuestionSlot`
- `SubQuestion`
- `PartBQuestionSlot`
- `OROption`
- `PartBQuestionGroup`
- `PatternStructure`
- `CreatePatternInput`

Helper functions:
- `calculatePatternMarks()`: Calculate Part A, Part B, and total marks
- `validatePatternStructure()`: Validate based on exam type

## Next Steps

1. ✅ Database schema updated
2. ✅ TypeScript types created
3. ✅ Validators implemented
4. ✅ Pattern tRPC router updated
5. ⏳ Create pattern creation UI
6. ⏳ Update pattern list UI
7. ⏳ Update pattern approval UI
8. ⏳ Update paper generation to use new structure
9. ⏳ Testing complete workflow

## Files Modified/Created

### Backend
- `prisma/schema.prisma`: Added ExamType, SemesterType enums, updated QuestionPaperPattern model
- `src/types/pattern.ts`: TypeScript interfaces and helper functions
- `src/validators/pattern.validators.ts`: Zod schemas with validation
- `src/trpc/routers/pattern-router.ts`: Updated router with new structure

### Frontend (To Do)
- `src/app/coordinator/dashboard/question-paper/create-pattern/page.tsx`
- `src/app/coordinator/dashboard/question-paper/patterns/page.tsx`
- `src/app/coordinator/dashboard/question-paper/approve-patterns/page.tsx`
- COE paper generation pages

## Testing Checklist

- [ ] Create Sessional 1 pattern (50 marks, no OR)
- [ ] Create Sessional 2 pattern (50 marks, no OR)
- [ ] Create End Semester pattern (100 marks, with OR)
- [ ] Validate marks calculations
- [ ] Test approval workflow (MC → PC → COE)
- [ ] Test rejection and resubmission
- [ ] Test pattern editing (DRAFT/REJECTED only)
- [ ] Test pattern deletion (DRAFT only)
- [ ] Test paper generation with new patterns
- [ ] Test answer key generation
