# BloomIQ - AI-Powered Question Paper Generator

## Table of Contents
1. [Overview](#overview)
2. [Features](#features)
3. [Architecture](#architecture)
4. [Technology Stack](#technology-stack)
5. [Project Structure](#project-structure)
6. [Database Schema](#database-schema)
7. [Authentication & Authorization](#authentication--authorization)
8. [API Routes](#api-routes)
9. [tRPC Routers](#trpc-routers)
10. [Components](#components)
11. [Installation & Setup](#installation--setup)
12. [Environment Variables](#environment-variables)
13. [Development Workflow](#development-workflow)
14. [Deployment](#deployment)
15. [Usage Guide](#usage-guide)
16. [Contributing](#contributing)

## Overview

BloomIQ is an intelligent question paper generation platform designed for universities and educational institutions. It leverages AI technologies, Bloom's taxonomy, and retrieval-augmented generation (RAG) to create contextual academic assessments that align with university examination patterns.

### Key Objectives
- **Automated Question Generation**: Generate questions based on uploaded course materials
- **Bloom's Taxonomy Integration**: Ensure questions cover all cognitive levels
- **University Pattern Compliance**: Follow standardized university examination formats
- **Role-Based Access Control**: Multi-level approval workflow for question papers
- **AI-Powered Content**: Use Google Gemini and Vertex AI for intelligent question generation

## Features

### Core Features
- **Multi-Role Dashboard**: Separate interfaces for different user roles
- **File Upload & Processing**: Support for PDF, DOCX, and other document formats
- **AI Question Generation**: Generate questions using Google Gemini AI
- **Bloom's Taxonomy Mapping**: Questions categorized by cognitive levels
- **University Pattern Templates**: Pre-defined question paper patterns
- **Background Job Processing**: Asynchronous question generation with status tracking
- **Question Review & Approval**: Multi-stage review workflow
- **Vector Database Integration**: RAG pipeline with Supabase pgvector

### Advanced Features
- **Document Chunking**: Intelligent text splitting for better context
- **Semantic Search**: Vector-based content retrieval
- **Question Categorization**: Multiple question types (Straightforward, Problem-based, Scenario-based)
- **Marks Distribution**: Automated marks allocation (2, 8, 16 marks patterns)
- **Real-time Status Updates**: Live progress tracking for generation jobs
- **Rich Text Editing**: Advanced question editing capabilities

## Architecture

### High-Level Architecture
```
Frontend (Next.js 15) 
    ↓
tRPC API Layer
    ↓
Business Logic Layer
    ↓
Database (PostgreSQL + Prisma)
    ↓
External Services (Supabase, Google AI)
```

### Component Architecture
- **Presentation Layer**: React components with shadcn/ui
- **State Management**: tRPC with TanStack Query
- **Authentication**: NextAuth.js with credential-based auth
- **File Storage**: Supabase storage with RLS policies
- **Background Jobs**: Inngest for job orchestration
- **Vector Search**: Supabase pgvector for semantic search

## Technology Stack

### Frontend
- **Framework**: Next.js 15 with App Router
- **UI Library**: React 19 with shadcn/ui components
- **Styling**: Tailwind CSS 4
- **State Management**: tRPC with TanStack Query
- **Form Handling**: React Hook Form with Zod validation
- **Rich Text**: Tiptap editor

### Backend
- **Runtime**: Node.js with TypeScript
- **API**: tRPC for type-safe APIs
- **Authentication**: NextAuth.js
- **Database**: PostgreSQL with Prisma ORM
- **File Storage**: Supabase
- **Background Jobs**: Inngest

### AI & ML
- **LLM**: Google Gemini Pro
- **Embeddings**: Google Vertex AI text-embedding-004
- **Vector Database**: Supabase pgvector
- **Document Processing**: LangChain.js
- **Text Splitting**: RecursiveCharacterTextSplitter

### Development Tools
- **Package Manager**: Bun
- **Type Checking**: TypeScript 5
- **Linting**: ESLint 9
- **Code Formatting**: Prettier
- **Database Migrations**: Prisma Migrate

## Project Structure

```
bloom-iq/
├── prisma/                     # Database schema and migrations
│   ├── schema.prisma          # Main database schema
│   └── migrations/            # Database migration files
├── scripts/                   # Utility scripts
│   ├── seed.ts               # Database seeding script
│   └── test-*.ts             # Test scripts
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── admin/           # Admin dashboard
│   │   ├── api/             # API routes
│   │   ├── auth/            # Authentication pages
│   │   ├── course-coordinator/  # Course coordinator dashboard
│   │   └── landing/         # Marketing landing page
│   ├── components/          # React components
│   │   ├── ui/             # shadcn/ui components
│   │   ├── FileUpload.tsx  # File upload component
│   │   ├── QuestionBank.tsx # Question review interface
│   │   └── QuestionPaperGenerator.tsx
│   ├── lib/                # Utility libraries
│   │   ├── auth-config.ts  # NextAuth configuration
│   │   ├── prisma.ts       # Prisma client
│   │   ├── question-processor.ts # Question generation logic
│   │   └── utils.ts        # General utilities
│   ├── trpc/               # tRPC configuration
│   │   ├── routers/        # API route handlers
│   │   └── client.tsx      # Client-side tRPC setup
│   ├── types/              # TypeScript type definitions
│   └── utils/              # Utility functions
├── public/                 # Static assets
├── package.json           # Dependencies and scripts
├── next.config.ts         # Next.js configuration
├── tailwind.config.js     # Tailwind CSS configuration
└── tsconfig.json          # TypeScript configuration
```

## Database Schema

### Core Models

#### User
```prisma
model User {
  id        String   @id @default(uuid())
  firstName String
  lastName  String
  email     String   @unique
  password  String
  role      Role
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
```

#### Course
```prisma
model Course {
  id                    String @id @default(uuid())
  courseCode           String @unique
  courseName           String
  courseCoordinatorId  String
  moduleCoordinatorId  String
  programCoordinatorId String
  createdAt           DateTime @default(now())
  updatedAt           DateTime @updatedAt
}
```

#### Question
```prisma
model Question {
  id              String         @id @default(uuid())
  question        String
  questionType    QuestionType
  bloomLevel      BLOOM_LEVEL
  difficultyLevel DIFFICULTY_LEVEL
  marks           Marks
  unit            Int
  courseId        String
  topic           String
  status          STATUS         @default(CREATED_BY_COURSE_COORDINATOR)
  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
}
```

### Enums
- **Role**: COURSE_COORDINATOR, MODULE_COORDINATOR, PROGRAM_COORDINATOR, CONTROLLER_OF_EXAMINATION, ADMIN
- **BLOOM_LEVEL**: REMEMBER, UNDERSTAND, APPLY, ANALYZE, EVALUATE, CREATE
- **QuestionType**: STRAIGHTFORWARD, PROBLEM_BASED, SCENARIO_BASED
- **Marks**: TWO_MARKS, EIGHT_MARKS, SIXTEEN_MARKS
- **DIFFICULTY_LEVEL**: EASY, MEDIUM, HARD

## Authentication & Authorization

### Authentication Flow
1. **Credential-based Login**: Email/password with Argon2 hashing
2. **Session Management**: NextAuth.js with JWT tokens
3. **Role-based Access**: Different interfaces based on user roles
4. **Protected Routes**: Middleware-based route protection

### Authorization Levels
- **Course Coordinator**: Manage courses, upload materials, generate questions
- **Module Coordinator**: Review and approve questions
- **Program Coordinator**: Final approval for question papers
- **Controller of Examination**: Overall system oversight
- **Admin**: Full system access and user management

### Security Features
- Password hashing with Argon2
- CSRF protection
- SQL injection prevention via Prisma
- File upload validation
- Role-based access control

## API Routes

### REST API Endpoints

#### Authentication
- `POST /api/auth/signin` - User login
- `POST /api/auth/signout` - User logout
- `GET /api/auth/session` - Get current session

#### Questions
- `POST /api/questions/generate` - Start question generation job
- `POST /api/questions/process-job` - Process background job

#### Inngest
- `GET|POST /api/inngest` - Inngest webhook handler

### File Upload
- File uploads handled through Supabase storage
- RLS policies for secure access
- Automatic file type validation

## tRPC Routers

### User Router (`userRouter`)
- `getProfile` - Get user profile
- `updateProfile` - Update user information
- `getUsers` - List all users (admin only)

### Course Router (`courseRouter`)
- `getMyCourses` - Get courses for current user
- `getCourseDetails` - Get detailed course information
- `createCourse` - Create new course
- `updateCourse` - Update course details

### Material Router (`materialRouter`)
- `uploadMaterialWithFile` - Upload course materials
- `getMaterialsByCourse` - Get materials for a course
- `deleteMaterial` - Remove course material

### Question Job Router (`questionJobRouter`)
- `startQuestionGeneration` - Initiate question generation
- `getJobStatus` - Check job progress
- `getCourseJobs` - List jobs for a course
- `getJobQuestions` - Get generated questions
- `cancelJob` - Cancel pending job

### Question Router (`questionRouter`)
- `getQuestions` - List questions with filters
- `updateQuestion` - Edit question content
- `approveQuestion` - Approve question
- `rejectQuestion` - Reject question
- `deleteQuestion` - Remove question

## Components

### Core Components

#### `QuestionPaperGenerator`
- Main interface for question paper creation
- Pattern editor for university formats
- Question type and difficulty selection
- Bloom's taxonomy mapping

#### `QuestionBank`
- Question review and management interface
- Bulk operations for question approval
- Advanced filtering and search
- Rich text editing capabilities

#### `FileUpload`
- Drag-and-drop file upload
- Progress tracking
- File type validation
- Supabase storage integration

#### `JobStatusCard`
- Real-time job progress display
- Status indicators
- Error handling and retry options

### UI Components
- Complete shadcn/ui component library
- Custom themed components
- Responsive design patterns
- Accessibility features

## Installation & Setup

### Prerequisites
- Node.js 18+ or Bun
- PostgreSQL 14+
- Supabase account
- Google Cloud Platform account (for AI services)

### Installation Steps

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd bloom-iq
   ```

2. **Install Dependencies**
   ```bash
   bun install
   ```

3. **Environment Setup**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Database Setup**
   ```bash
   # Generate Prisma client
   bun run db:generate
   
   # Run migrations
   bun run db:migrate
   
   # Seed database
   bun run seed
   ```

5. **Start Development Server**
   ```bash
   bun run dev
   ```

## Environment Variables

### Required Variables

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/bloomiq"
DIRECT_URL="postgresql://username:password@localhost:5432/bloomiq"

# NextAuth
NEXTAUTH_SECRET="your-secret-key"
NEXTAUTH_URL="http://localhost:3000"

# Supabase
NEXT_PUBLIC_SUPABASE_URL="your-supabase-url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-supabase-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# Google AI
GOOGLE_API_KEY="your-google-api-key"
VERTEX_AI_PROJECT_ID="your-project-id"
VERTEX_AI_LOCATION="us-central1"

# Inngest
INNGEST_EVENT_KEY="your-inngest-event-key"
INNGEST_SIGNING_KEY="your-inngest-signing-key"
```

### Optional Variables
```bash
# Development
NODE_ENV="development"
DEBUG="true"

# Analytics
ANALYTICS_ID="your-analytics-id"
```

## Development Workflow

### Database Changes
1. Modify `prisma/schema.prisma`
2. Generate migration: `bun run db:migrate`
3. Update client: `bun run db:generate`

### Adding New Features
1. Create tRPC router if needed
2. Add to `_app.ts` router
3. Create UI components
4. Add to appropriate dashboard

### Testing
```bash
# Type checking
bun run type-check

# Linting
bun run lint

# Database tests
bun tsx scripts/test-basic.ts
```

### Code Quality
- TypeScript strict mode enabled
- ESLint configuration for Next.js
- Prettier for code formatting
- Husky for pre-commit hooks

## Deployment

### Production Checklist
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Supabase storage buckets created
- [ ] Google AI services enabled
- [ ] Domain and SSL configured

### Deployment Platforms
- **Vercel**: Recommended for Next.js
- **Railway**: Good for full-stack apps
- **AWS/Azure**: Enterprise deployments

### Build Commands
```bash
# Production build
bun run build

# Start production server
bun run start
```

## Usage Guide

### For Course Coordinators

1. **Login to Dashboard**
   - Navigate to `/course-coordinator/dashboard`
   - Use your institutional credentials

2. **Upload Course Materials**
   - Go to "Materials" tab
   - Upload PDF/DOCX files
   - Specify unit and material type

3. **Generate Questions**
   - Select uploaded material
   - Choose question types and difficulty
   - Configure Bloom's taxonomy distribution
   - Start generation job

4. **Review Generated Questions**
   - Monitor job progress
   - Review generated questions
   - Edit questions if needed
   - Submit for approval

### For Module Coordinators

1. **Review Submitted Questions**
   - Access pending questions
   - Review content quality
   - Approve or reject with feedback

2. **Manage Course Content**
   - Oversee course materials
   - Coordinate with course coordinators

### For Program Coordinators

1. **Final Approval**
   - Review approved questions
   - Final quality check
   - Approve for examination

2. **Program Oversight**
   - Monitor program-wide question quality
   - Coordinate with multiple courses

### For Administrators

1. **User Management**
   - Create and manage user accounts
   - Assign roles and permissions
   - Monitor system usage

2. **System Configuration**
   - Configure question patterns
   - Manage AI settings
   - System maintenance

## Contributing

### Development Guidelines
1. Follow TypeScript best practices
2. Use proper component composition
3. Implement error boundaries
4. Add comprehensive tests
5. Document new features

### Code Style
- Use Prettier for formatting
- Follow ESLint rules
- Use semantic commit messages
- Add JSDoc comments for complex functions

### Pull Request Process
1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request
5. Address review feedback

### Reporting Issues
- Use GitHub issues
- Provide detailed reproduction steps
- Include environment information
- Add relevant logs/screenshots

---

**BloomIQ Team**  
*Intelligent Question Paper Generation for Modern Education*

For support or questions, please contact the development team or refer to the project's GitHub repository.
