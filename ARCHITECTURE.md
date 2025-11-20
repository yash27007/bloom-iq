# BloomIQ Architecture Overview

## ���️ Project Structure

```
bloom-iq/
│
├── ��� Documentation (COMPLETE)
│   ├── README.md                          # Main project overview
│   ├── DOCKER_DEPLOYMENT.md               # Docker setup guide
│   ├── DOCKER_MODEL_RUNNER_SETUP.md       # AI model configuration
│   ├── PROJECT_STATUS.md                  # Feature checklist
│   ├── QUICK_REFERENCE.md                 # Command cheat sheet
│   ├── IMPLEMENTATION_SUMMARY.md          # What we built
│   ├── ARCHITECTURE.md                    # This file
│   └── UPLOAD_FUNCTIONALITY.md            # Upload guide
│
├── ��� Docker Configuration (COMPLETE)
│   ├── docker-compose.yaml                # Multi-service orchestration
│   ├── Dockerfile                         # Next.js app container
│   ├── .dockerignore                      # Build optimization
│   └── .env.example                       # Environment template
│
├── ���️ Database (Prisma)
│   └── prisma/
│       ├── schema.prisma                  # Database schema
│       ├── seed.ts                        # Test data
│       └── migrations/                    # Version-controlled migrations
│
├── ��� Frontend (Next.js 16 App Router)
│   └── src/app/
│       ├── (auth)/                        # Login, register pages
│       │   ├── sign-in/
│       │   └── sign-up/
│       ├── (home)/                        # Landing page
│       ├── admin/                         # Admin dashboard
│       │   └── dashboard/
│       │       ├── users-management/      # User CRUD UI
│       │       └── courses-management/    # Course CRUD UI
│       ├── coordinator/                   # Coordinator dashboards
│       │   └── dashboard/
│       │       ├── course-management/
│       │       │   ├── upload-material/   # PDF upload UI
│       │       │   └── generate-questions/ # Question generation UI
│       │       └── question-paper/
│       │           └── review-questions/   # ✅ COMPLETE Review UI
│       └── api/                           # API routes
│           ├── auth/                      # NextAuth endpoints
│           ├── trpc/                      # tRPC handler
│           └── upload/                    # File upload endpoint
│
├── ��� Backend Services (CLEAN ARCHITECTURE)
│   └── src/
│       ├── services/                      # ✅ Business Logic Layer
│       │   ├── user.service.ts            # User CRUD + validation
│       │   ├── course.service.ts          # Course management
│       │   ├── question.service.ts        # Question + approval workflow
│       │   ├── material.service.ts        # Material upload
│       │   └── index.ts                   # Barrel export
│       │
│       ├── validators/                    # ✅ Input Validation (Zod)
│       │   ├── common.validators.ts       # Shared schemas
│       │   ├── user.validators.ts         # User validation
│       │   ├── course.validators.ts       # Course validation
│       │   └── material.validators.ts     # Material validation
│       │
│       ├── trpc/                          # ✅ Type-Safe API Layer
│       │   ├── init.ts                    # tRPC initialization
│       │   ├── context.ts                 # Request context (auth)
│       │   └── routers/
│       │       ├── user-router.ts         # User endpoints
│       │       ├── course-router.ts       # Course endpoints
│       │       ├── question-router.ts     # Question generation
│       │       └── question-approval-router.ts  # ✅ Approval workflow
│       │
│       ├── lib/                           # Utilities
│       │   ├── prisma.ts                  # Prisma client singleton
│       │   ├── hash-password.ts           # Password hashing
│       │   ├── pdf-parser.ts              # PDF text extraction
│       │   ├── content-chunker.ts         # Intelligent chunking
│       │   └── ai-question-generator.ts   # AI integration
│       │
│       └── components/                    # React components
│           ├── auth/                      # Auth components
│           ├── data-table/                # Reusable tables
│           └── ui/                        # shadcn/ui (50+ components)
│
└── ⚙️ Configuration Files
    ├── next.config.ts                     # Next.js config (standalone output)
    ├── tsconfig.json                      # TypeScript config
    ├── eslint.config.mjs                  # ESLint config
    ├── postcss.config.mjs                 # PostCSS config
    ├── tailwind.config.ts                 # Tailwind CSS config
    └── package.json                       # Dependencies
```

---

## ��� Data Flow Architecture

### 1. Question Generation Flow

```
┌─────────────┐
│ Coordinator │ Upload PDF
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  Upload API     │ Save file to disk
│  /api/upload    │ Create Course_Material record
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ PDF Parser      │ Extract text
│ lib/pdf-parser  │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ Content Chunker │ Split into chunks
│ lib/content-    │ Respect section boundaries
│ chunker.ts      │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ AI Model        │ Docker Model Runner
│ (Gemma/Llama)   │ Generate questions
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│ QuestionService │ Save to database
│ services/       │ Status: GENERATED
│ question.       │
│ service.ts      │
└─────────────────┘
```

### 2. Question Approval Flow

```
┌───────────────────────────────────────────────────────────────┐
│                     Question Lifecycle                        │
└───────────────────────────────────────────────────────────────┘

┌─────────────┐
│  GENERATED  │ ← Initial state after AI generation
└──────┬──────┘
       │
       ▼ Course Coordinator approves
┌─────────────┐
│ CC_APPROVED │
└──────┬──────┘
       │
       ▼ Module Coordinator approves
┌─────────────┐
│ MC_APPROVED │
└──────┬──────┘
       │
       ▼ Program Coordinator approves
┌─────────────┐
│ PC_APPROVED │
└──────┬──────┘
       │
       ▼ Controller of Examinations approves
┌─────────────┐
│COE_APPROVED │ ← Final state, ready for paper
└─────────────┘

At any stage:
┌──────────┐
│ REJECTED │ ← Question rejected with feedback
└──────────┘
    │
    └──> Can be edited and resubmitted
```

### 3. tRPC Request Flow

```
┌─────────────┐
│   Browser   │ React Component
└──────┬──────┘
       │ trpc.questionApproval.approve.useMutation()
       ▼
┌─────────────────┐
│  tRPC Client    │ Type-safe, auto-generated
│  (React Query)  │
└──────┬──────────┘
       │ HTTP POST /api/trpc/questionApproval.approve
       ▼
┌─────────────────┐
│  tRPC Router    │ Route handler
│  question-      │ Parse input
│  approval-      │ Check auth
│  router.ts      │
└──────┬──────────┘
       │ Validates with Zod schema
       ▼
┌─────────────────┐
│  Service Layer  │ Business logic
│  QuestionService│ Role validation
│  .approve()     │ Status updates
└──────┬──────────┘
       │ Prisma ORM calls
       ▼
┌─────────────────┐
│  PostgreSQL     │ Data persistence
│  Database       │
└─────────────────┘
       │
       └──> Response flows back up
            (Type-safe all the way)
```

---

## ��� Service Layer Design

### Service Responsibilities

```typescript
// ✅ Services handle business logic
// ✅ tRPC routers handle request/response
// ✅ Validators handle input validation

┌──────────────────────────────────────────────┐
│              Service Layer                    │
├──────────────────────────────────────────────┤
│                                              │
│  UserService                                 │
│  ├── createUser(data)                        │
│  ├── listUsers(filters, pagination)          │
│  ├── getUserById(id)                         │
│  ├── updateUser(id, data)                    │
│  ├── deleteUser(id)                          │
│  └── bulkDelete(ids)                         │
│                                              │
│  CourseService                               │
│  ├── createCourse(data)                      │
│  ├── listCourse(filters)                     │
│  ├── getCourseById(id)                       │
│  ├── updateCourse(id, data)                  │
│  ├── deleteCourse(id)                        │
│  └── getEligibleCoordinators()               │
│                                              │
│  QuestionService                             │
│  ├── createQuestion(data)                    │
│  ├── getQuestionsByCourse(courseId)          │
│  ├── approveQuestionByCourseCoordinator()    │
│  ├── approveQuestionByModuleCoordinator()    │
│  ├── approveQuestionByProgramCoordinator()   │
│  ├── rejectQuestion(id, feedback)            │
│  └── getApprovalStatistics(courseId)         │
│                                              │
│  MaterialService                             │
│  ├── uploadMaterial(file, metadata)          │
│  ├── getMaterialsByCourse(courseId)          │
│  └── deleteMaterial(id)                      │
│                                              │
└──────────────────────────────────────────────┘
```

---

## ��� Authentication Flow

```
┌─────────────┐
│    User     │ Enters credentials
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  NextAuth v5    │ /api/auth/signin
│  Auth Provider  │
└──────┬──────────┘
       │ Verify credentials
       ▼
┌─────────────────┐
│  Prisma         │ Query User table
│  Database       │ Match email + hashed password
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  Session        │ Create encrypted JWT
│  Generation     │ Store in secure cookie
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  tRPC Context   │ Attach session to all requests
│  Middleware     │ Available as ctx.session
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  Role Check     │ Verify user.role matches required
│  Protected      │ Throw if unauthorized
│  Procedures     │
└─────────────────┘
```

---

## ��� Docker Architecture

```
┌────────────────────────────────────────────────────────┐
│               Docker Compose Stack                      │
└────────────────────────────────────────────────────────┘

┌─────────────────────┐     ┌─────────────────────┐
│   PostgreSQL        │     │   bloom-iq-app      │
│   (postgres:16)     │     │   (Next.js + Bun)   │
│                     │     │                     │
│   Port: 5432        │◄────┤   Port: 3000        │
│   Volume: postgres_ │     │                     │
│           data      │     │   Volumes:          │
│                     │     │   - ./prisma        │
│   Health Check:     │     │   - ./src/uploads   │
│   pg_isready        │     │                     │
└─────────────────────┘     └──────────┬──────────┘
                                       │
                                       │ Models binding
                                       ▼
                            ┌─────────────────────┐
                            │   AI Model          │
                            │   (ai/gemma2:2b)    │
                            │                     │
                            │   Context: 8192     │
                            │   Temp: 0.7         │
                            │   Top-P: 0.9        │
                            │                     │
                            │   Auto-injects:     │
                            │   - AI_MODEL_URL    │
                            │   - AI_MODEL_NAME   │
                            └─────────────────────┘

Environment Variable Injection Flow:
─────────────────────────────────────
models:
  ai_model:                         ┐
    model: ai/gemma2:2b             │ Docker Compose
    context_size: 8192              │ processes this
    ...                             ┘

services:
  bloom-iq-app:
    models:
      ai_model:                     ┐
        endpoint_var: AI_MODEL_URL  │ Sets these env vars
        model_var: AI_MODEL_NAME    ┘ automatically

Result:
  ↓
bloom-iq-app container gets:
  AI_MODEL_URL=http://...:8080
  AI_MODEL_NAME=ai/gemma2:2b
```

---

## ��� Database Schema (Key Models)

```sql
-- Core Tables

User
├── id (Primary Key)
├── email (Unique)
├── password (Hashed)
├── name
├── role (ENUM: ADMIN, COURSE_COORDINATOR, etc.)
├── is_active (Boolean)
└── timestamps

Course
├── id (Primary Key)
├── course_code (Unique)
├── course_name
├── course_coordinator_id (FK → User)
├── module_coordinator_id (FK → User)
├── program_coordinator_id (FK → User)
└── timestamps

Course_Material
├── id (Primary Key)
├── course_id (FK → Course)
├── unit
├── file_name
├── file_path
├── file_size
└── timestamps

Question
├── id (Primary Key)
├── course_id (FK → Course)
├── unit
├── question_text
├── option_a, option_b, option_c, option_d
├── correct_option
├── bloom_level (ENUM: REMEMBER, UNDERSTAND, APPLY, etc.)
├── difficulty (ENUM: EASY, MEDIUM, HARD)
├── status (ENUM: GENERATED, CC_APPROVED, MC_APPROVED, etc.)
├── created_by_id (FK → User)
└── timestamps

Question_Feedback
├── id (Primary Key)
├── question_id (FK → Question)
├── reviewer_id (FK → User)
├── action (ENUM: APPROVED, REJECTED)
├── feedback_text
└── timestamp

-- Relationships
User ──< Course (one-to-many: coordinator)
Course ──< Course_Material (one-to-many)
Course ──< Question (one-to-many)
Question ──< Question_Feedback (one-to-many)
User ──< Question_Feedback (one-to-many: reviewer)
```

---

## ���️ Technology Stack Details

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Runtime** | Bun | 1.x | Fast JS/TS runtime |
| **Framework** | Next.js | 16.0.1 | React SSR framework |
| **UI Library** | React | 19.x | Component library |
| **Styling** | Tailwind CSS | 3.x | Utility-first CSS |
| **UI Components** | shadcn/ui | Latest | Pre-built components |
| **API Layer** | tRPC | 11.x | Type-safe RPC |
| **State Management** | React Query | 5.x | Server state |
| **Form Handling** | react-hook-form | 7.x | Form validation |
| **Validation** | Zod | 3.x | Schema validation |
| **Authentication** | NextAuth | 5.x | Auth solution |
| **ORM** | Prisma | 6.x | Database ORM |
| **Database** | PostgreSQL | 16 | Relational DB |
| **AI Models** | Docker Hub AI | Latest | Open-source LLMs |
| **PDF Parsing** | pdf-parse | Latest | PDF text extraction |
| **Containerization** | Docker | Latest | Container platform |
| **Orchestration** | Docker Compose | 2.40.3 | Multi-container |

---

## ��� UI Component Hierarchy

```
src/app/coordinator/dashboard/question-paper/review-questions/
└── ReviewQuestionsPage (Main Component)
    ├── CourseSelector (Dropdown)
    │   └── tRPC: course.list
    │
    ├── StatisticsCards (Dashboard)
    │   ├── Card: Pending
    │   ├── Card: Approved
    │   └── Card: Rejected
    │   └── tRPC: questionApproval.getStatistics
    │
    ├── QuestionGrid (List View)
    │   └── QuestionCard (Repeating)
    │       ├── StatusBadge
    │       ├── DifficultyIndicator
    │       ├── BloomLevelBadge
    │       ├── QuestionText
    │       ├── Options (A, B, C, D)
    │       ├── CorrectAnswer
    │       ├── ApproveButton
    │       │   └── ApproveDialog
    │       ├── RejectButton
    │       │   └── RejectDialog
    │       │       └── FeedbackForm
    │       └── FeedbackHistoryButton
    │           └── FeedbackModal
    │               └── FeedbackList
    │
    └── tRPC Hooks:
        ├── questionApproval.getQuestionsForReview (query)
        ├── questionApproval.approve (mutation)
        ├── questionApproval.reject (mutation)
        └── questionApproval.getFeedbackHistory (query)
```

---

## ��� Deployment Flow

```
┌─────────────┐
│  Developer  │ git push
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│  Git Repository │ GitHub/GitLab
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  CI/CD Pipeline │ (Future: GitHub Actions)
│  - Run tests    │
│  - Build Docker │
│  - Push image   │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  Server         │ Pull image
│  docker-compose │ docker-compose up -d
│  up -d          │
└──────┬──────────┘
       │
       ▼
┌─────────────────┐
│  Running App    │ Accessible at domain
│  + Database     │
│  + AI Model     │
└─────────────────┘
```

---

## ��� Performance Considerations

### Build Optimization
- **Next.js Standalone Output**: 80% smaller image size
- **Multi-stage Docker Build**: Separate build and runtime layers
- **Bun Runtime**: Faster than Node.js
- **Turbopack Dev**: 10x faster hot reload

### Database Optimization
- **Indexed Foreign Keys**: Fast joins
- **Prisma Connection Pooling**: Efficient connections
- **Pagination**: Large datasets handled efficiently

### AI Model Optimization
- **Context Size**: Configurable (8K-128K)
- **Model Size**: Choose based on speed/quality tradeoff
- **Temperature**: Lower = faster, deterministic
- **CPU Threads**: Configurable for performance

---

## ��� Security Layers

```
┌──────────────────────────────────────────┐
│        Security Architecture             │
└──────────────────────────────────────────┘

1. Authentication Layer
   └── NextAuth v5 (JWT tokens, secure cookies)

2. Authorization Layer
   └── Role-based middleware (5 roles)

3. Input Validation
   └── Zod schemas (type-safe validation)

4. Database Layer
   └── Prisma (SQL injection prevention)

5. Password Security
   └── bcrypt (salted hashing)

6. Session Management
   └── Encrypted sessions (httpOnly cookies)

7. API Security
   └── CORS, rate limiting (planned)

8. Container Security
   └── Non-root user, minimal image
```

---

## ��� Next Phase Planning

### Phase 1: Testing & Validation (NEXT)
- [ ] Docker deployment testing
- [ ] End-to-end workflow verification
- [ ] Performance benchmarking

### Phase 2: Question Editing
- [ ] Edit UI implementation
- [ ] Version tracking
- [ ] Resubmission workflow

### Phase 3: COE Dashboard
- [ ] Paper assembly interface
- [ ] PDF generation
- [ ] Multiple variants

### Phase 4: Advanced Features
- [ ] ChromaDB integration
- [ ] Background jobs (Inngest)
- [ ] Email notifications

---

**Architecture Status: ✅ SOLID FOUNDATION**

Clean, maintainable, scalable, and well-documented.
