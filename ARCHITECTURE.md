# BloomIQ — System Architecture

> **Version**: 0.6.0  
> **Last Updated**: February 2026  
> **Purpose**: Comprehensive technical reference for the BloomIQ platform, intended to guide future multi-tenant evolution.

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Tech Stack](#2-tech-stack)
3. [High-Level Architecture](#3-high-level-architecture)
4. [Directory Structure](#4-directory-structure)
5. [Database Architecture](#5-database-architecture)
6. [Authentication & Authorization](#6-authentication--authorization)
7. [API Layer (tRPC)](#7-api-layer-trpc)
8. [Service Layer](#8-service-layer)
9. [AI Pipeline](#9-ai-pipeline)
10. [RAG (Retrieval-Augmented Generation) System](#10-rag-retrieval-augmented-generation-system)
11. [Question Generation Workflow](#11-question-generation-workflow)
12. [Question Paper Pattern & Generation](#12-question-paper-pattern--generation)
13. [Approval Workflow](#13-approval-workflow)
14. [Frontend Architecture](#14-frontend-architecture)
15. [Middleware & Routing (Proxy)](#15-middleware--routing-proxy)
16. [PDF Processing Pipeline](#16-pdf-processing-pipeline)
17. [Infrastructure & Deployment](#17-infrastructure--deployment)
18. [Multi-Tenant Considerations](#18-multi-tenant-considerations)

---

## 1. System Overview

**BloomIQ** is an AI-driven question paper generation platform for academic institutions. It leverages **Bloom's Taxonomy** to create educationally rigorous examination questions from uploaded course materials (PDFs).

### Core Capabilities

| Capability | Description |
|------------|-------------|
| **AI Question Generation** | Uses Gemini or Ollama to generate questions aligned to Bloom's Taxonomy cognitive levels |
| **Multi-Level Approval** | Questions flow through Course Coordinator → Module Coordinator → Program Coordinator |
| **Question Paper Patterns** | Define exam structure (Part A / Part B, marks distribution, units) with approval workflow |
| **Paper Assembly** | Controller of Examinations selects approved questions to assemble final papers |
| **RAG Chat (Kai)** | Faculty can chat with uploaded course materials for context-aware Q&A |
| **PDF Export** | Export question banks and papers with LaTeX math and Mermaid diagram support |
| **Validation** | AI-powered question paper validation against course outcomes and Bloom's distribution |

### User Roles

| Role | Code | Responsibility |
|------|------|----------------|
| Admin | `ADMIN` | User management, course management, system administration |
| Course Coordinator (CC) | `COURSE_COORDINATOR` | Upload materials, generate questions, create patterns, first-level review |
| Module Coordinator (MC) | `MODULE_COORDINATOR` | Second-level question review, pattern approval |
| Program Coordinator (PC) | `PROGRAM_COORDINATOR` | Third-level question review, pattern approval |
| Controller of Examination (COE) | `CONTROLLER_OF_EXAMINATION` | Final pattern approval, paper assembly, paper finalization |

---

## 2. Tech Stack

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| **Runtime** | Bun | Latest | Used as package manager and script runner |
| **Framework** | Next.js | 16.x | App Router, Turbopack dev server |
| **Language** | TypeScript | 5.x | Strict mode |
| **API** | tRPC | v11 | Type-safe RPC with superjson transformer |
| **Database** | PostgreSQL | 16 | Via Docker (dev) or Neon DB (prod) |
| **ORM** | Prisma | v7 | With `@prisma/adapter-pg` for native pg wire protocol |
| **Auth** | Better Auth | v1.4+ | Email/password with session cookies |
| **AI (Cloud)** | Google Gemini | gemini-2.5-flash | Via Vercel AI SDK + `@ai-sdk/google` |
| **AI (Local)** | Ollama | mistral:7b | Via `ollama-ai-provider-v2` |
| **AI SDK** | Vercel AI SDK | v6 | `generateText`, provider abstraction |
| **Embeddings (Cloud)** | Google text-embedding-004 | - | 768-dimension embeddings |
| **Embeddings (Local)** | nomic-embed-text | v1.5 | Via Ollama |
| **Vector Storage** | PostgreSQL Float[] | - | Cosine similarity in application code |
| **State Management** | TanStack React Query | v5 | Server state via tRPC integration |
| **UI Components** | shadcn/ui + Radix UI | - | Tailwind CSS v4 |
| **Data Tables** | TanStack Table | v8 | Advanced filtering, sorting, pagination |
| **Forms** | React Hook Form + Zod | v7 / v4 | Schema-based validation |
| **Math Rendering** | KaTeX | v0.16 | LaTeX mathematical notation |
| **Diagrams** | Mermaid | v11 | Flowcharts, sequence diagrams |
| **PDF Parsing** | pdf-parse | v1.1 | In-memory parsing (no disk writes) |
| **Charts** | Recharts | v2.15 | Dashboard analytics |

---

## 3. High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     BROWSER (Client)                     │
│  ┌─────────┐  ┌──────────┐  ┌────────┐  ┌───────────┐  │
│  │ React   │  │ tRPC     │  │ React  │  │ shadcn/ui │  │
│  │ Pages   │  │ Client   │  │ Query  │  │ + Radix   │  │
│  └────┬────┘  └────┬─────┘  └───┬────┘  └───────────┘  │
│       │            │            │                        │
└───────┼────────────┼────────────┼────────────────────────┘
        │            │            │
   ┌────▼────────────▼────────────▼────────────────────────┐
   │              NEXT.JS 16 SERVER                         │
   │                                                        │
   │  ┌─────────┐  ┌────────────────────┐  ┌────────────┐  │
   │  │ Proxy   │  │   App Router       │  │ API Routes │  │
   │  │(Auth MW)│  │  (SSR + RSC)       │  │            │  │
   │  └────┬────┘  └────────┬───────────┘  │ /api/trpc  │  │
   │       │                │              │ /api/auth   │  │
   │       │    ┌───────────▼───────────┐  │ /api/upload │  │
   │       │    │    tRPC Routers       │  └──────┬─────┘  │
   │       │    │  (7 sub-routers)      │         │        │
   │       │    └───────────┬───────────┘         │        │
   │       │                │                     │        │
   │  ┌────▼────────────────▼─────────────────────▼─────┐  │
   │  │              SERVICE LAYER                       │  │
   │  │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │  │
   │  │  │ User     │ │ Course   │ │ Question         │ │  │
   │  │  │ Service  │ │ Service  │ │ Service          │ │  │
   │  │  ├──────────┤ ├──────────┤ ├──────────────────┤ │  │
   │  │  │ Material │ │ AI       │ │ Embedding        │ │  │
   │  │  │ Service  │ │ Service  │ │ Service          │ │  │
   │  │  ├──────────┤ ├──────────┤ ├──────────────────┤ │  │
   │  │  │ VectorDB │ │ WebSearch│ │ Paper Validation │ │  │
   │  │  │ Service  │ │ Service  │ │ Service          │ │  │
   │  │  └──────────┘ └──────────┘ └──────────────────┘ │  │
   │  └────────────────────┬────────────────────────────┘  │
   │                       │                                │
   │  ┌────────────────────▼────────────────────────────┐  │
   │  │         PRISMA v7 (ORM + Adapter-PG)            │  │
   │  └────────────────────┬────────────────────────────┘  │
   └───────────────────────┼────────────────────────────────┘
                           │
              ┌────────────▼────────────┐
              │    PostgreSQL 16        │
              │  ┌────────────────────┐ │
              │  │ Users / Sessions   │ │
              │  │ Courses / Materials│ │
              │  │ Questions / Papers │ │
              │  │ Material_Chunks    │ │
              │  │  (embeddings)      │ │
              │  └────────────────────┘ │
              └─────────────────────────┘

   ┌──────────────────┐       ┌──────────────────┐
   │  Google Gemini   │       │  Ollama (Local)  │
   │  (Cloud AI)      │       │  (Self-hosted)   │
   │  - Generation    │       │  - Generation    │
   │  - Embeddings    │       │  - Embeddings    │
   └──────────────────┘       └──────────────────┘
```

---

## 4. Directory Structure

```
bloom-iq/
├── prisma/
│   ├── schema.prisma          # Database schema (13 models, 16 enums)
│   ├── seed.ts                # Database seeding script
│   ├── migrations/            # SQL migration files
│   └── ...
├── src/
│   ├── proxy.ts               # Next.js middleware (auth + role routing)
│   ├── actions/
│   │   └── auth.ts            # Server actions for auth
│   ├── app/                   # Next.js App Router pages
│   │   ├── layout.tsx         # Root layout (ThemeProvider + TRPCProvider)
│   │   ├── globals.css        # Global styles (Tailwind)
│   │   ├── (auth)/            # Auth pages (sign-in, sign-up)
│   │   ├── (home)/            # Landing page
│   │   ├── admin/dashboard/   # Admin dashboard pages
│   │   ├── coordinator/dashboard/  # Coordinator dashboard pages
│   │   ├── coe/dashboard/     # COE dashboard pages
│   │   ├── unauthorized/      # 403 page
│   │   └── api/               # API routes
│   │       ├── auth/          # Better Auth handler + custom auth routes
│   │       ├── trpc/          # tRPC HTTP handler
│   │       ├── upload/        # PDF upload endpoint
│   │       └── coordinator/   # Coordinator action proxies
│   ├── components/            # Shared React components
│   │   ├── ui/                # shadcn/ui primitives (40+ components)
│   │   ├── auth/              # Auth forms (login, register, wrappers)
│   │   └── data-table/        # Advanced reusable data table
│   ├── generated/
│   │   └── prisma/            # Prisma generated client
│   ├── hooks/                 # React hooks
│   ├── lib/                   # Utility libraries
│   │   ├── auth.ts            # Better Auth server config
│   │   ├── auth-client.ts     # Better Auth client
│   │   ├── auth-utils.ts      # Role helpers, route guards
│   │   ├── prisma.ts          # Prisma client singleton
│   │   ├── ai-question-generator.ts  # AI generation facade
│   │   ├── content-chunker.ts # Intelligent content chunking
│   │   ├── gemini-key-manager.ts  # Round-robin API key rotation
│   │   ├── pdf-parser.ts      # PDF → Markdown conversion
│   │   ├── pdf-export.ts      # HTML/PDF export with KaTeX + Mermaid
│   │   ├── logger.ts          # Console-based structured logging
│   │   └── utils.ts           # General utilities (cn, etc.)
│   ├── services/              # Business logic layer
│   │   ├── index.ts           # Barrel exports
│   │   ├── types.ts           # Shared service types
│   │   ├── user.service.ts    # User CRUD
│   │   ├── course.service.ts  # Course CRUD
│   │   ├── material.service.ts    # Material embedding pipeline
│   │   ├── question.service.ts    # Question CRUD + approval
│   │   ├── embedding.service.ts   # Text → vector embeddings
│   │   ├── vector-db.service.ts   # PostgreSQL vector storage + search
│   │   ├── web-search.service.ts  # Real-world context grounding
│   │   ├── question-paper-validation.service.ts  # Paper validation
│   │   └── ai/                # AI provider abstraction
│   │       ├── index.ts       # AI SDK integration (Gemini/Ollama)
│   │       ├── types.ts       # AI type definitions
│   │       ├── prompts/       # LLM prompt templates
│   │       └── parsers/       # AI response parsers
│   ├── trpc/                  # tRPC configuration
│   │   ├── init.ts            # Router, middleware, procedure definitions
│   │   ├── context.ts         # Request context (session injection)
│   │   ├── client.tsx         # Client-side tRPC provider
│   │   ├── server.tsx         # Server-side caller + hydration
│   │   ├── query-client.ts    # React Query client config
│   │   └── routers/           # tRPC sub-routers
│   │       ├── _app.ts        # Root router (merges all sub-routers)
│   │       ├── admin-router.ts
│   │       ├── coordinator-router.ts
│   │       ├── question-approval-router.ts
│   │       ├── question-bank-router.ts
│   │       ├── pattern-router.ts
│   │       ├── paper-router.ts
│   │       └── user-router.ts
│   ├── types/                 # Shared TypeScript types
│   └── validators/            # Zod validation schemas
├── docker-compose.dev.yml     # Local PostgreSQL
├── prisma.config.ts           # Prisma v7 config
├── next.config.ts             # Next.js config
├── package.json               # Dependencies & scripts
└── tsconfig.json              # TypeScript config
```

---

## 5. Database Architecture

### Schema Overview

The database uses **PostgreSQL 16** via **Prisma v7** with the native `@prisma/adapter-pg` wire protocol adapter.

### Entity-Relationship Diagram

```
┌─────────────┐       ┌──────────────────┐       ┌──────────────────┐
│    User      │──────▶│     Session      │       │   Verification   │
│              │       └──────────────────┘       └──────────────────┘
│ id (PK)      │──────▶┌──────────────────┐
│ email (UQ)   │       │     Account      │
│ facultyId(UQ)│       │  (OAuth support) │
│ role         │       └──────────────────┘
│ designation  │
│ isActive     │
└──────┬───────┘
       │ 1:N (3 coordinator roles)
       ▼
┌──────────────┐       ┌──────────────────┐       ┌──────────────────┐
│   Course     │──────▶│ Course_Material  │──────▶│ Material_Chunk   │
│              │       │                  │       │  (Vector Store)  │
│ course_code  │       │ parsedContent    │       │                  │
│ CC, MC, PC   │       │ parsingStatus    │       │ content          │
│ (user refs)  │       │ embeddingStatus  │       │ embedding[]      │
└──────┬───────┘       └────────┬─────────┘       │ tokenCount       │
       │                        │                  │ metadata (JSON)  │
       │                        │                  └──────────────────┘
       ▼                        ▼
┌──────────────┐       ┌──────────────────┐
│  Question    │       │ Question_Gen_Job │
│              │       │                  │
│ bloomLevel   │       │ status           │
│ marks        │       │ totalQuestions   │
│ status       │       │ errorMessage     │
│ academicLevel│       └──────────────────┘
│ renderingType│
│ latexContent │               ┌──────────────────┐
│ mermaidContent│              │  Chat_History    │
└──────┬───────┘               │                  │
       │                       │ userId           │
       ▼                       │ materialId       │
┌──────────────┐               │ role + content   │
│  Question    │               │ (24h TTL)        │
│  Feedback    │               └──────────────────┘
└──────────────┘

┌────────────────────┐         ┌──────────────────┐
│ QuestionPaper      │         │ QuestionPaper    │
│ Pattern            │────────▶│                  │
│                    │         │ paperCode (UQ)   │
│ partAStructure (J) │         │ setVariant       │
│ partBStructure (J) │         │ partA/B_questionIds│
│ MC/PC/COE approval │         │ isFinalized      │
│ examType           │         └──────────────────┘
│ semesterType       │
└────────────────────┘
```

### Key Models (13 total)

| Model | Purpose | Key Fields |
|-------|---------|------------|
| `User` | Faculty members | `role`, `designation`, `facultyId`, `isActive` |
| `Session` | Auth sessions | `token`, `expiresAt`, `ipAddress` |
| `Account` | OAuth providers | `providerId`, `accessToken` |
| `Verification` | Email/password reset | `identifier`, `value`, `expiresAt` |
| `Course` | Academic courses | `course_code`, 3 coordinator FKs |
| `Course_Material` | Uploaded PDFs | `parsedContent`, `parsingStatus`, `embeddingStatus` |
| `Material_Chunk` | RAG vector chunks | `content`, `embedding` (Float[]), `tokenCount` |
| `Question` | Generated questions | `bloomLevel`, `marks`, `status`, `academicLevel`, `renderingType` |
| `Question_Feedback` | Rejection remarks | `questionId`, `remarks` |
| `Question_Generation_Job` | Async generation tracking | `status`, `totalQuestions`, `errorMessage` |
| `Chat_History` | RAG chat messages | `userId`, `materialId`, `role`, `content` |
| `QuestionPaperPattern` | Exam paper blueprint | `partA/BStructure` (JSON), multi-level approval |
| `QuestionPaper` | Assembled exam paper | `paperCode`, `partA/B_questionIds`, `isFinalized` |

### Enums (16 total)

| Enum | Values |
|------|--------|
| `Role` | COURSE_COORDINATOR, MODULE_COORDINATOR, PROGRAM_COORDINATOR, CONTROLLER_OF_EXAMINATION, ADMIN |
| `Designation` | ASSISTANT_PROFESSOR, ASSOCIATE_PROFESSOR, PROFESSOR |
| `Material_Type` | SYLLABUS, UNIT_PDF |
| `Parsing_Status` | PENDING, PROCESSING, COMPLETED, FAILED |
| `Question_Type` | REMEMBER, ANALYZE, UNDERSTAND, APPLY, EVALUATE, CREATE |
| `JobStatus` | PENDING, PROCESSING, COMPLETED, FAILED |
| `Marks` | TWO, EIGHT, SIXTEEN |
| `QuestionStatus` | DRAFT, CREATED_BY_COURSE_COORDINATOR, UNDER_REVIEW_FROM_MODULE_COORDINATOR, UNDER_REVIEW_FROM_PROGRAM_COORDINATOR, ACCEPTED, REJECTED |
| `DifficultyLevel` | EASY, MEDIUM, HARD |
| `AcademicLevel` | UG, PG, PHD |
| `RenderingType` | TEXT, LATEX, MERMAID, MIXED |
| `BloomLevel` | REMEMBER, UNDERSTAND, APPLY, ANALYZE, EVALUATE, CREATE |
| `GenerationType` | DIRECT, INDIRECT, SCENARIO_BASED, PROBLEM_BASED |
| `PatternStatus` | DRAFT, PENDING_MC_APPROVAL, PENDING_PC_APPROVAL, PENDING_COE_APPROVAL, APPROVED, REJECTED |
| `PaperStatus` | DRAFT, GENERATED, FINALIZED |
| `ExamType` | SESSIONAL_1, SESSIONAL_2, END_SEMESTER |
| `SemesterType` | ODD, EVEN |

### Prisma Client Configuration

```typescript
// src/lib/prisma.ts — Uses native PG adapter (no Prisma engine binary)
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });
```

The generated client is output to `src/generated/prisma/` and the Prisma v7 config uses `DIRECT_URL` for migrations (important for connection pooling with Neon DB).

---

## 6. Authentication & Authorization

### Auth Stack

- **Library**: [Better Auth](https://www.better-auth.com/) v1.4+
- **Adapter**: Prisma (PostgreSQL)
- **Strategy**: Email/password with bcryptjs hashing
- **Session**: Cookie-based with 7-day expiry, 5-minute cache, 24-hour refresh

### Server Configuration (`src/lib/auth.ts`)

```
betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: { enabled: true, password: { hash, verify } },
  session: { cookieCache: 5min, expiresIn: 7days, updateAge: 24hrs },
  user: { additionalFields: { firstName, lastName, facultyId, role, designation, isActive } },
  plugins: [nextCookies()],
  basePath: "/api/auth",
})
```

### Client Configuration (`src/lib/auth-client.ts`)

```
createAuthClient({ baseURL: window.location.origin })
→ exports: signIn, signOut, signUp, useSession, getSession
```

### Auth API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/[...all]` | GET, POST | Better Auth catch-all (handles standard flows) |
| `/api/auth/signin` | POST | Custom: validates credentials via bcryptjs, creates session |
| `/api/auth/signout` | POST | Custom: clears DB session + cookie |
| `/api/auth/validate` | POST | Custom: validates email/password without session creation |

### Role-Based Access Control

Access is enforced at **three levels**:

1. **Proxy Layer** (`src/proxy.ts`): Intercepts all requests. Checks session cookie existence and validates role against route:
   - `/admin/*` → requires `ADMIN` role
   - `/coordinator/*` → requires `COURSE_COORDINATOR`, `MODULE_COORDINATOR`, `PROGRAM_COORDINATOR`, or `CONTROLLER_OF_EXAMINATION`
   - `/coe/*` → redirects to `/coordinator/*` for COE users
   - No session → redirects to `/sign-in`
   - Inactive user → redirects to `/unauthorized`

2. **tRPC Middleware** (`src/trpc/init.ts`): Enforces role at procedure level:
   - `baseProcedure` — public
   - `protectedProcedure` — any authenticated user
   - `adminProcedure` — ADMIN only
   - `coordinatorProcedure` — any coordinator (CC, MC, PC)
   - `courseCoordinatorProcedure` — CC only
   - `moduleCoordinatorProcedure` — MC only
   - `programCoordinatorProcedure` — PC only
   - `controllerOfExamination` — COE only

3. **Service Layer**: Business logic validates role-specific operations (e.g., only CC can upload materials to their assigned course).

---

## 7. API Layer (tRPC)

### Setup

- **Transport**: HTTP Batch Link via `/api/trpc/[trpc]` using `fetchRequestHandler`
- **Serialization**: `superjson` for Date, Map, Set, BigInt support
- **Context**: Session injected via `getSession(headers)` in `createTRPCContext`
- **Client**: `@trpc/tanstack-react-query` integration for React Query v5
- **Server**: `createTRPCOptionsProxy` for RSC prefetch + `createCaller` for direct server calls

### Router Architecture

```
appRouter
├── user          # Public sign-up
├── admin         # User CRUD, Course CRUD (ADMIN only)
├── coordinator   # Material upload, AI generation, RAG chat, reviews
├── questionApproval  # Multi-level approval workflow
├── questionBank      # Question browsing + bulk operations
├── pattern           # Paper pattern CRUD + approval workflow
└── paper             # Paper assembly + finalization
```

### Router Details

#### `user` Router (Public)
| Procedure | Type | Description |
|-----------|------|-------------|
| `signUp` | mutation | Create new user account |

#### `admin` Router (Admin Only)
| Procedure | Type | Description |
|-----------|------|-------------|
| `addUser` | mutation | Create user with hashed password |
| `getUsers` | query | Paginated user list with search/sort |
| `getUserById` | query | Single user by ID |
| `updateUser` | mutation | Update user details |
| `deleteUser` | mutation | Delete user |
| `bulkDeleteUsers` | mutation | Batch delete |
| `addCourse` | mutation | Create course with coordinator assignments |
| `getCourses` | query | Paginated course list |
| `getCourseById` | query | Single course |
| `updateCourse` | mutation | Update course |
| `deleteCourse` | mutation | Delete course |
| `bulkDeleteCourses` | mutation | Batch delete |
| `getEligibleCoordinators` | query | Users eligible for coordinator roles |
| `getEligibleCoordinatorsForEdit` | query | Coordinators for edit form (excludes assigned) |

#### `coordinator` Router (Any Coordinator + COE)
| Procedure | Type | Description |
|-----------|------|-------------|
| `getOllamaModels` | query | List available AI models |
| `getCoordinatorProfile` | query | Current user profile |
| `getCoordinatorCourse` | query | Assigned course |
| `getCoursesForMaterialUpload` | query | Courses for upload |
| `uploadCourseMaterial` | mutation | Save parsed PDF content to DB |
| `getUploadedMaterials` | query | List materials |
| `deleteCourseMaterial` | mutation | Delete material |
| `generateQuestions` | mutation | AI question generation |
| `getGeneratedQuestions` | query | Retrieve questions |
| `updateQuestion` | mutation | Edit question |
| `approveQuestions` | mutation | CC-level approval |
| `deleteQuestion` | mutation | Delete question |
| `saveReviewedQuestions` | mutation | Batch review save |
| `retriggerEmbedding` | mutation | Re-embed material chunks |
| `chatWithPDF` | mutation | RAG-based chat with material |
| `getChatHistory` | query | Chat history |
| `clearChatHistory` | mutation | Clear chat |
| `checkSyllabusExists` | query | Check if course has syllabus |
| `validateQuestionPaper` | mutation | AI paper validation |

#### `questionApproval` Router (Multi-Level)
| Procedure | Type | Description |
|-----------|------|-------------|
| `approveAsCourseCoordinator` | mutation | CC approves → MC review |
| `approveAsModuleCoordinator` | mutation | MC approves → PC review |
| `approveAsProgramCoordinator` | mutation | PC approves → ACCEPTED |
| `rejectQuestion` | mutation | Reject with feedback (any stage) |
| `getQuestionsForReview` | query | Filtered questions for review |
| `updateQuestion` | mutation | Edit during review |
| `getQuestionFeedback` | query | Rejection feedback history |
| `getQuestionStatistics` | query | Approval status dashboard |

#### `questionBank` Router (Coordinators)
| Procedure | Type | Description |
|-----------|------|-------------|
| `getQuestions` | query | Advanced filtered + paginated query |
| `getCourseUnits` | query | Available units for a course |
| `updateQuestion` | mutation | Edit question |
| `deleteQuestion` | mutation | Delete question |
| `approveQuestion` | mutation | Single approval |
| `bulkApprove` | mutation | Batch approval |
| `getQuestionStats` | query | Question bank statistics |

#### `pattern` Router (Pattern Workflow)
| Procedure | Type | Access | Description |
|-----------|------|--------|-------------|
| `createPattern` | mutation | CC | Create paper pattern (Part A/B structure) |
| `updatePattern` | mutation | CC | Update pattern |
| `getPatterns` | query | Any Coord | List patterns |
| `getPatternById` | query | Any Coord | Single pattern |
| `getPendingApprovals` | query | Any Coord | Pending pattern approvals |
| `approvePattern` | mutation | MC/PC/COE | Approve pattern |
| `rejectPattern` | mutation | MC/PC/COE | Reject with remarks |
| `deletePattern` | mutation | CC | Delete pattern |
| `getApprovedPatterns` | query | COE | Approved patterns for paper generation |

#### `paper` Router (COE)
| Procedure | Type | Description |
|-----------|------|-------------|
| `generatePaper` | mutation | Select questions into paper sets |
| `getPapers` | query | List generated papers |
| `getPaperById` | query | Single paper with questions |
| `finalizePaper` | mutation | Mark paper as final |
| `deletePaper` | mutation | Delete draft paper |

---

## 8. Service Layer

The service layer (`src/services/`) implements business logic, completely decoupled from the transport layer (tRPC). Services are stateless classes or static methods.

### Service Registry

| Service | File | Responsibility |
|---------|------|----------------|
| `UserService` | `user.service.ts` | User CRUD, password hashing, pagination, constraint validation |
| `CourseService` | `course.service.ts` | Course CRUD, coordinator eligibility checking, dependency validation |
| `MaterialService` | `material.service.ts` | Background embedding pipeline for uploaded PDFs |
| `QuestionService` | `question.service.ts` | Question CRUD, approval workflow state machine, bulk operations |
| `EmbeddingService` | `embedding.service.ts` | Text → vector embedding (Google or Ollama) |
| `VectorDBService` | `vector-db.service.ts` | Chunk storage + cosine similarity search in PostgreSQL |
| `WebSearchService` | `web-search.service.ts` | Real-world context grounding (Tavily/Serper/DuckDuckGo) |
| `QuestionPaperValidationService` | `question-paper-validation.service.ts` | Paper validation against course outcomes + Bloom's distribution |
| `AI Service` | `ai/index.ts` | AI provider abstraction, question generation orchestration |

### Common Patterns

- **Service Result**: All services return `ServiceResult<T>` with optional `data`, `message`, and pagination fields
- **Validation**: Input validated via Zod schemas in validators before reaching services
- **Error Handling**: PrismaClientKnownRequestError caught for constraint violations
- **Pagination**: Centralized `paginate()` and `safeOrderBy()` helpers in common validators

---

## 9. AI Pipeline

### Provider Architecture

The AI system supports dual providers, switchable via the `AI_PROVIDER` environment variable:

```
┌──────────────────────────────────────────────────┐
│               AI Service (src/services/ai/)       │
│                                                    │
│  ┌────────────┐    ┌───────────────────────────┐  │
│  │ getModel() │    │ generateAIText(prompt)     │  │
│  │            │    │ generateQuestions(params)   │  │
│  │ Provider   │    │                             │  │
│  │ Detection  │    │ Uses Vercel AI SDK v6       │  │
│  └──────┬─────┘    │ generateText() function    │  │
│         │          └──────────────┬──────────────┘  │
│         ▼                        │                  │
│  ┌──────────────┐ ┌──────────────▼──────────────┐  │
│  │ GEMINI       │ │ OLLAMA                       │  │
│  │              │ │                               │  │
│  │ @ai-sdk/    │ │ ollama-ai-provider-v2         │  │
│  │   google    │ │                               │  │
│  │              │ │ Base: http://localhost:11434  │  │
│  │ Round-Robin │ │ Default: mistral:7b           │  │
│  │ Key Rotation│ │                               │  │
│  └──────────────┘ └──────────────────────────────┘  │
└──────────────────────────────────────────────────────┘
```

### Gemini API Key Manager

A singleton `GeminiKeyManager` (`src/lib/gemini-key-manager.ts`) manages multiple API keys:

- Loads keys from `GEMINI_API_KEY`, `GEMINI_API_KEY_1` through `GEMINI_API_KEY_10`
- **Round-robin rotation**: Cycles through keys to distribute load
- **Cooldown tracking**: 1-second cooldown between reuse of same key
- **Error handling**: Rate-limited keys get 60-second penalty cooldown
- **Deduplication**: Automatically removes duplicate keys

### Academic Level Configuration

Questions scale in complexity based on academic level:

| Level | Primary Bloom's | Focus |
|-------|----------------|-------|
| **UG** (Undergraduate) | APPLY, ANALYZE | Fundamental principles, standard applications |
| **PG** (Postgraduate) | EVALUATE, CREATE | Multi-concept synthesis, case studies |
| **PHD** (Doctoral) | CREATE, EVALUATE | Original synthesis, research gaps |

### Question Generation Flow

```
Material Content
      │
      ▼
┌─────────────────┐
│ Content Chunking │  (if content > token limit)
│ (content-chunker)│
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────┐
│ Web Search      │────▶│ Real-World       │
│ (optional)      │     │ Context          │
│ UG: disabled    │     │ - Case studies   │
│ PG/PHD: enabled │     │ - Research papers│
└────────┬────────┘     │ - Industry news  │
         │              └────────┬─────────┘
         │                       │
         ▼                       ▼
┌──────────────────────────────────────────┐
│          Prompt Construction              │
│                                           │
│  • Academic level guidance                │
│  • Bloom's taxonomy distribution          │
│  • Difficulty level distribution          │
│  • Marks allocation (2/8/16)              │
│  • Rich media instructions (LaTeX/Mermaid)│
│  • Real-world grounding context           │
│  • Subject-specific rendering guidance    │
└────────────────┬──────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────┐
│         LLM Generation                    │
│  (Gemini/Ollama via AI SDK)               │
│                                           │
│  Temperature: 0.7, TopP: 0.9             │
└────────────────┬──────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────┐
│         Response Parsing                  │
│  (parsers/question-parser.ts)             │
│                                           │
│  • JSON extraction from LLM output       │
│  • Field validation                       │
│  • Bloom's level verification             │
│  • Difficulty classification              │
└────────────────┬──────────────────────────┘
                 │
                 ▼
        GeneratedQuestion[]
```

### Prompt Architecture

- `prompts/academic-level-prompts.ts`: Level-specific instructions, rendering guidance
- `prompts/ollama-prompt.ts`: System prompt optimized for local Ollama models
- `parsers/question-parser.ts`: Robust JSON extraction from LLM free-text responses

---

## 10. RAG (Retrieval-Augmented Generation) System

The RAG system enables faculty to "chat with their PDFs" and grounds question generation in actual course content.

### Architecture

```
┌──────────────────────────────────────────────────┐
│                 INGESTION PIPELINE                │
│                                                    │
│  PDF Upload                                        │
│      │                                             │
│      ▼                                             │
│  pdf-parse (in-memory)                             │
│      │                                             │
│      ▼                                             │
│  Text → Markdown (pdf-parser.ts)                   │
│      │                                             │
│      ▼                                             │
│  Store parsedContent in Course_Material             │
│      │                                             │
│      ▼                                             │
│  Content Chunking (content-chunker.ts)             │
│  • By-heading: Split on markdown headings          │
│  • By-tokens: Split on token count (3000 max)     │
│  • Hybrid: Headings first, then token-split large  │
│  • Overlap: 200 tokens between chunks              │
│      │                                             │
│      ▼                                             │
│  Embedding Generation (embedding.service.ts)        │
│  • Google: text-embedding-004 (768 dims)           │
│  • Ollama: nomic-embed-text (768 dims)             │
│      │                                             │
│      ▼                                             │
│  Store in Material_Chunk table                      │
│  • content (text)                                   │
│  • embedding (Float[])                              │
│  • metadata (JSON)                                  │
│  • tokenCount, unit, chunkIndex                    │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│                 RETRIEVAL PIPELINE                     │
│                                                        │
│  User Query ("chatWithPDF" / question generation)      │
│      │                                                 │
│      ▼                                                 │
│  Query Embedding (same model as ingestion)             │
│      │                                                 │
│      ▼                                                 │
│  Cosine Similarity Search (vector-db.service.ts)       │
│  • Load all chunks for material (filtered by unit)     │
│  • Compute cosine distance in application code         │
│  • Sort by distance ascending                          │
│  • Return top-K relevant chunks (default: 5)           │
│      │                                                 │
│      ▼                                                 │
│  Context Assembly                                      │
│  • Concatenate top-K chunk contents                    │
│  • Inject into LLM prompt as context                   │
│      │                                                 │
│      ▼                                                 │
│  LLM Generation (with RAG context)                     │
└──────────────────────────────────────────────────────────┘
```

### Vector Storage Design

Unlike traditional vector DB setups (pgvector extension), BloomIQ stores embeddings as PostgreSQL `Float[]` arrays and computes cosine similarity in application code:

```typescript
// Cosine similarity calculation (vector-db.service.ts)
cosineSimilarity(a: number[], b: number[]): number {
  dotProduct / (magnitudeA * magnitudeB)
}
```

**Trade-offs:**
- **Pro**: No pgvector extension needed, works with any PostgreSQL host
- **Pro**: Simpler deployment (Neon DB supports it, but not required)
- **Con**: All chunks loaded into memory for similarity computation
- **Con**: O(n) search complexity per query (vs O(log n) with pgvector indexes)
- **Suitable for**: Current scale (per-material chunk sets, typically < 1000 chunks)

### Chat History

- Stored in `Chat_History` table with `userId`, `materialId`, `role` (user/assistant), `content`
- Indexed by `(userId, materialId, createdAt)` for efficient retrieval
- Separate index on `createdAt` for 24-hour TTL cleanup

---

## 11. Question Generation Workflow

### End-to-End Flow

```
1. CC uploads PDF → /api/upload (in-memory parse)
2. Parsed content stored in Course_Material.parsedContent
3. Background: Content chunked + embedded → Material_Chunk table
4. CC triggers "Generate Questions" from dashboard
5. System retrieves parsedContent + relevant chunks
6. AI generates questions with Bloom's/difficulty distribution
7. Questions stored with status: CREATED_BY_COURSE_COORDINATOR
8. CC reviews and approves → status: UNDER_REVIEW_FROM_MODULE_COORDINATOR
9. MC reviews and approves → status: UNDER_REVIEW_FROM_PROGRAM_COORDINATOR
10. PC reviews and approves → status: ACCEPTED
11. At any stage, reviewer can REJECT with feedback → Question_Feedback
12. Rejected questions return to CC for revision
```

### Generation Parameters

| Parameter | Description |
|-----------|-------------|
| `materialContent` | Parsed markdown from PDF |
| `courseName` | Course name for context |
| `academicLevel` | UG / PG / PHD |
| `questionCounts.easy/medium/hard` | Difficulty distribution |
| `bloomLevels.*` | Count per Bloom's level |
| `enableWebSearch` | Real-world grounding (auto for PG/PHD) |
| `enableRichMedia` | LaTeX + Mermaid in output |

### Job Tracking

The `Question_Generation_Job` model tracks async generation:
- Status: PENDING → PROCESSING → COMPLETED / FAILED
- Links to course, material, and initiating user
- Stores error messages for failed generations

---

## 12. Question Paper Pattern & Generation

### Pattern Structure

Patterns define the exam blueprint and go through their own approval workflow:

```
QuestionPaperPattern {
  examType: SESSIONAL_1 | SESSIONAL_2 | END_SEMESTER
  totalMarks: 50 (sessional) | 100 (end sem)
  duration: minutes
  partAStructure: JSON [
    { questionNumber: 1, unit: 1, marks: 2, bloomLevel: "REMEMBER" },
    { questionNumber: 2, unit: 2, marks: 2, bloomLevel: "UNDERSTAND" },
    ...
  ]
  partBStructure: JSON [
    { questionNumber: 1, unit: 1, marks: 16, bloomLevel: "APPLY",
      orOption: { unit: 2, marks: 16, bloomLevel: "ANALYZE" } },
    ...
  ]
}
```

### Pattern Approval Flow

```
CC creates pattern → DRAFT
  → CC submits → PENDING_MC_APPROVAL
    → MC approves → PENDING_PC_APPROVAL
      → PC approves → PENDING_COE_APPROVAL
        → COE approves → APPROVED
At any stage → REJECTED (with remarks)
```

### Paper Assembly (COE)

1. COE selects an approved pattern
2. System queries question bank for ACCEPTED questions matching pattern criteria
3. Questions allocated to Part A / Part B slots based on unit, marks, Bloom's level
4. Multiple set variants (SET-A, SET-B) can be generated
5. Paper code generated (e.g., `CS301-2025-SEM1-SET-A`)
6. COE reviews and finalizes the paper

### Paper Validation

The `QuestionPaperValidationService` validates papers using AI:
- Extracts Course Outcomes (COs) from syllabus (regex + AI fallback)
- Maps questions to COs
- Validates marks distribution (Part A + Part B = expected total)
- Checks Bloom's taxonomy distribution
- Identifies missing CO coverage
- Returns detailed validation report with errors, warnings, and suggestions

---

## 13. Approval Workflow

### Question Approval State Machine

```
                    ┌──────────┐
                    │  DRAFT   │
                    └────┬─────┘
                         │ CC creates
                         ▼
          ┌──────────────────────────────┐
          │ CREATED_BY_COURSE_COORDINATOR │
          └──────────┬───────────────────┘
                     │ CC approves
                     ▼
     ┌───────────────────────────────────────┐
     │ UNDER_REVIEW_FROM_MODULE_COORDINATOR  │
     └──────────────┬────────────────────────┘
                    │ MC approves
                    ▼
    ┌────────────────────────────────────────────┐
    │ UNDER_REVIEW_FROM_PROGRAM_COORDINATOR      │
    └──────────────┬─────────────────────────────┘
                   │ PC approves
                   ▼
              ┌──────────┐
              │ ACCEPTED │
              └──────────┘

  At any review stage:
    Reviewer rejects → REJECTED (with Question_Feedback)
    → Returns to CC for revision
```

### Review Flags

Each question tracks which levels have reviewed it:
- `reviewedByCc` + `ccApprovedAt`
- `reviewedByMc` + `mcApprovedAt`
- `reviewedByPc` + `pcApprovedAt`
- `isFinalized` — final lock after paper assembly

---

## 14. Frontend Architecture

### Application Shell

```
layout.tsx
├── ThemeProvider (next-themes: light/dark mode)
│   └── TRPCReactProvider (tRPC + React Query)
│       ├── <main>{children}</main>
│       └── <Toaster /> (sonner notifications)
```

### Route Groups

| Route Group | Path | Layout | Users |
|-------------|------|--------|-------|
| `(auth)` | `/sign-in`, `/sign-up` | Minimal | Unauthenticated |
| `(home)` | `/` | Public | All |
| `admin` | `/admin/dashboard/*` | Admin sidebar | ADMIN |
| `coordinator` | `/coordinator/dashboard/*` | Coordinator sidebar | CC, MC, PC, COE |
| `coe` | `/coe/dashboard/*` | Redirects to coordinator | COE |

### Admin Dashboard Pages

| Page | Path | Description |
|------|------|-------------|
| Dashboard | `/admin/dashboard` | Overview stats |
| User Management | `/admin/dashboard/users-management` | CRUD users with data table |
| Course Management | `/admin/dashboard/courses-management` | CRUD courses |
| Question Paper | `/admin/dashboard/question-paper` | Paper overview |

### Coordinator Dashboard Pages

| Page | Path | Description |
|------|------|-------------|
| Dashboard | `/coordinator/dashboard` | Course overview, stats |
| Upload Material | `…/course-management/upload-material` | PDF upload via drag-drop |
| Generate Questions | `…/course-management/generate-questions` | AI generation controls |
| Review Questions | `…/course-management/review-questions` | CC-level review |
| Chat with PDF | `…/course-management/chat-pdf` | RAG chatbot (Kai) |
| Question Bank | `…/question-paper/question-bank` | Full question browser |
| Create Pattern | `…/question-paper/create-pattern` | Pattern designer |
| View Patterns | `…/question-paper/patterns` | Pattern list |
| Approve Patterns | `…/question-paper/approve-patterns` | MC/PC/COE approval |
| Review Questions | `…/question-paper/review-questions` | Multi-level reviewing |
| Set Paper Layout | `…/question-paper/set-paper-layout` | Paper layout config |
| Validate Paper | `…/question-paper/validate` | AI validation |
| Generate Paper | `…/generate-paper` | Paper assembly |

### COE Dashboard Pages

| Page | Path | Description |
|------|------|-------------|
| Dashboard | `/coe/dashboard` | COE overview |
| Generate Paper | `/coe/dashboard/generate-paper` | Final paper generation |
| View Papers | `/coe/dashboard/view-papers` | All papers |
| Paper Detail | `/coe/dashboard/paper/[paperId]` | Individual paper view |

### Data Flow (Client ↔ Server)

```
React Component
    │
    ├── useQuery / useMutation (via trpc.routerName.procedureName)
    │       │
    │       ▼
    │   tRPC Client (httpBatchLink → /api/trpc)
    │       │
    │       ▼
    │   tRPC Router (middleware → procedure → service → prisma → DB)
    │       │
    │       ▼
    │   Response (superjson deserialized)
    │
    └── React Query cache → UI update
```

### Component Library

- **40+ shadcn/ui components** in `src/components/ui/`
- **Advanced Data Table** (`src/components/data-table/`) — reusable TanStack Table with server-side pagination, sorting, filtering
- **Auth Components** (`src/components/auth/`) — login form, register form, card wrapper, error/success alerts
- **Theme** — light/dark mode via `next-themes`

---

## 15. Middleware & Routing (Proxy)

The `src/proxy.ts` acts as Next.js middleware, running on every request:

### Request Flow

```
Incoming Request
      │
      ▼
  Is public route? (/sign-in, /sign-up, /, /api, etc.)
      │ YES → Pass through
      │ NO
      ▼
  Is self-auth route? (/api/upload, /api/auth)
      │ YES → Pass through (handles own auth to avoid body consumption)
      │ NO
      ▼
  Has session cookie?
      │ NO → Redirect to /sign-in?callbackUrl=...
      │ YES
      ▼
  Validate session via Better Auth
      │ Invalid → Redirect to /sign-in
      │ Valid
      ▼
  Is user active?
      │ NO → Redirect to /unauthorized
      │ YES
      ▼
  Role-based routing:
  ├── /admin/* → requires ADMIN
  ├── /coordinator/* → requires CC/MC/PC/COE
  ├── /coe/* → redirects COE users to /coordinator/*
  └── /dashboard → auto-redirect based on role
      │
      ▼
  NextResponse.next()
```

---

## 16. PDF Processing Pipeline

### Upload Flow

1. **Client** sends PDF file via FormData to `/api/upload`
2. **Upload API** receives file in memory (no disk write — Vercel compatible)
3. **pdf-parse** extracts raw text from PDF buffer
4. **pdf-parser.ts** converts text to structured Markdown:
   - Detects headings (ALL CAPS, numbered sections, chapter/unit prefixes)
   - Identifies lists (numbered, bullet points)
   - Cleans whitespace and formatting
5. Returns `{ text, markdown, metadata: { pages, info } }`

### Storage

- **Parsed content stored in DB**: `Course_Material.parsedContent` (Markdown string)
- **No file storage on disk**: Compatible with Vercel's read-only filesystem
- **Original PDF is NOT retained**: Only parsed text is kept

### Background Embedding

After upload, `MaterialService.embedMaterialInBackground()` runs:

1. Updates `embeddingStatus` → PROCESSING
2. Deletes existing chunks (for re-embedding)
3. Chunks content via `content-chunker.ts`:
   - Max 3000 tokens per chunk, min 500 tokens
   - 200-token overlap between chunks
   - Heading-aware splitting
4. Generates embeddings for each chunk (Google or Ollama)
5. Stores chunks + embeddings in `Material_Chunk` table
6. Updates `embeddingStatus` → COMPLETED (or FAILED with error)

---

## 17. Infrastructure & Deployment

### Development

```bash
# Start PostgreSQL
docker compose -f docker-compose.dev.yml up -d

# Install dependencies
bun install

# Generate Prisma client
bunx prisma generate

# Run migrations
bunx prisma migrate dev

# Seed database
bun run prisma/seed.ts

# Start dev server (Turbopack)
bun dev
```

### Production (Vercel)

| Component | Service |
|-----------|---------|
| **Hosting** | Vercel (Next.js) |
| **Database** | Neon DB (PostgreSQL with connection pooling) |
| **AI** | Google Gemini (cloud) |
| **Embeddings** | Google text-embedding-004 |

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `DIRECT_URL` | Yes | Direct DB connection for migrations (Neon) |
| `BETTER_AUTH_SECRET` | Yes | Auth encryption secret |
| `BETTER_AUTH_URL` | Yes | App base URL |
| `AI_PROVIDER` | Yes | `GEMINI` or `OLLAMA` |
| `GEMINI_API_KEY` | If Gemini | Primary API key |
| `GEMINI_API_KEY_1..10` | Optional | Additional keys for round-robin |
| `GEMINI_MODEL` | Optional | Default: `gemini-2.5-flash` |
| `OLLAMA_URL` | If Ollama | Default: `http://localhost:11434` |
| `OLLAMA_MODEL` | If Ollama | Default: `mistral:7b` |
| `OLLAMA_EMBEDDING_MODEL` | If Ollama | Default: `nomic-embed-text:v1.5` |
| `TAVILY_API_KEY` | Optional | Tavily AI Search for real-world grounding |
| `SERPER_API_KEY` | Optional | Serper (Google Search) for grounding |

### Docker (Development Only)

```yaml
# docker-compose.dev.yml
services:
  postgres:
    image: postgres:16-alpine
    ports: ["5432:5432"]
    environment:
      POSTGRES_USER: bloom_user
      POSTGRES_PASSWORD: bloom_password
      POSTGRES_DB: bloom_iq
    volumes:
      - bloom_postgres_data:/var/lib/postgresql/data
```

---

## 18. Multi-Tenant Considerations

This section outlines the current single-tenant architecture and key decisions needed for multi-tenant evolution.

### Current State (Single Tenant)

- **Single database**: All data in one PostgreSQL database
- **No tenant isolation**: All users, courses, questions share the same tables
- **Global roles**: Roles are system-wide, not scoped to an organization
- **Single AI config**: One set of Gemini/Ollama keys for all operations
- **No tenant context**: No `organizationId` or `tenantId` in the data model

### Multi-Tenant Architecture Options

#### Option A: Schema-Per-Tenant (Recommended for Strong Isolation)

```
PostgreSQL Instance
├── tenant_university_a (schema)
│   ├── user
│   ├── course
│   ├── questions
│   └── ...
├── tenant_university_b (schema)
│   └── ... (identical tables)
└── shared (schema)
    ├── tenant_config
    ├── billing
    └── system_admin
```

**Pros**: Strong data isolation, easy per-tenant backup/restore, simple compliance  
**Cons**: Schema migration complexity, connection management overhead  
**Impact on current code**: Prisma would need schema-per-request routing; proxy layer would resolve tenant from subdomain/header

#### Option B: Shared Schema with Tenant Column (Recommended for Scale)

```sql
ALTER TABLE user ADD COLUMN tenant_id UUID NOT NULL REFERENCES tenants(id);
ALTER TABLE courses ADD COLUMN tenant_id UUID NOT NULL;
-- ... all tables get tenant_id
-- Row-Level Security (RLS) policies enforce isolation
```

**Pros**: Simpler deployment, efficient resource usage, easier cross-tenant analytics  
**Cons**: Risk of data leakage without RLS, complex query patterns  
**Impact on current code**: Every Prisma query needs `where: { tenantId }` filter; middleware injects tenant context

#### Option C: Database-Per-Tenant

**Pros**: Strongest isolation, independent scaling  
**Cons**: Highest operational overhead, connection pooling complexity  

### Key Changes Required for Multi-Tenancy

#### 1. Tenant Resolution Layer
```
Request → Middleware → Resolve Tenant (subdomain / header / path)
  → Inject tenantId into tRPC context
  → All queries scoped to tenant
```

#### 2. Database Schema Changes
- Add `Tenant` model: `id`, `name`, `slug`, `domain`, `config`, `plan`, `isActive`
- Add `tenantId` foreign key to: `User`, `Course`, `Course_Material`, `Question`, `QuestionPaperPattern`, `QuestionPaper`, `Chat_History`, `Question_Generation_Job`
- Add composite indexes: `(tenantId, ...)` on all tenant-scoped tables

#### 3. Auth Changes
- Users belong to a tenant (one user can optionally belong to multiple)
- Session includes `tenantId`
- Role scoped to tenant (a user could be ADMIN in one org, CC in another)

#### 4. AI Configuration Per Tenant
- Tenant-specific API keys (or shared pool with usage tracking)
- Per-tenant rate limiting
- Per-tenant model preferences

#### 5. tRPC Context Enhancement
```typescript
export type Context = {
  session: AppSession | null;
  tenantId: string;        // NEW
  tenantConfig: TenantConfig; // NEW
};
```

#### 6. Service Layer Changes
- Every service method receives `tenantId` parameter
- Prisma queries include `tenantId` in `where` clauses
- VectorDB searches scoped to tenant's material chunks

#### 7. Frontend Changes
- Tenant-aware routing (subdomain or path prefix)
- Tenant branding (logo, colors, name)
- Tenant-scoped data fetching

### Migration Path (Incremental)

1. **Phase 1**: Add `Tenant` model + `tenantId` to all tables (nullable initially, default to "default" tenant)
2. **Phase 2**: Add tenant resolution middleware (subdomain-based)
3. **Phase 3**: Update tRPC context to include tenant
4. **Phase 4**: Update all service queries to filter by tenant
5. **Phase 5**: Add RLS policies in PostgreSQL as safety net
6. **Phase 6**: Tenant admin panel (create/manage tenants)
7. **Phase 7**: Per-tenant configuration (AI keys, branding, limits)
8. **Phase 8**: Remove default tenant, make `tenantId` non-nullable

---

*This document reflects the architecture as of version 0.6.0. Update it as the system evolves.*
