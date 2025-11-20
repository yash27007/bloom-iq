# 📄 BloomIQ – AI-Powered Question Paper Generator

BloomIQ is an AI-driven question paper generation platform designed to streamline and secure the examination process using Bloom's Taxonomy. From uploading course material to confidential question paper delivery, BloomIQ empowers educators with automation and flexibility.

---

## 🚀 Features

- ✅ **Admin Panel**
  - Add, edit, delete users.
  - Assign or modify roles:
    - `Admin`
    - `Course Coordinator`
    - `Module Coordinator`
    - `Program Coordinator`
    - `Controller of Examinations`
  - Manage courses and syllabus.

- ✅ **Course Coordinator**
  - Upload syllabus and unit-wise PDFs.
  - Generate question banks based on Bloom’s Taxonomy.
  - Set difficulty levels, control question variation, and avoid repetition.

- ✅ **Module & Program Coordinators**
  - Review generated questions.
  - Accept or reject with reason.

- ✅ **Controller of Examinations**
  - Review and approve final question papers.
  - Generate confidential, printable question papers based on predefined patterns.

- ✅ **AI-Powered Generation**
  - Uses Docker Model Runner with open-source LLMs (Gemma, Llama, Mistral, Phi).
  - Plug-and-play model swapping for flexibility.
  - Intelligent content chunking for large PDFs.

- ✅ **Notifications & Scheduling**
  - Scheduled email notifications via Inngest or cron jobs.

- ✅ **Secure Role-Based Access Control (RBAC)**
  - Question papers accessible only to authorized roles.

---

## 🛠️ Tech Stack

| Layer                | Technologies                              |
|----------------------|-------------------------------------------|
| Frontend             | Next.js 16 (App Router) + Tailwind CSS    |
| Backend API          | tRPC v11 + React Query                    |
| Authentication       | NextAuth v5                               |
| Database             | PostgreSQL + Prisma ORM                   |
| AI Models            | Docker Compose Models (native AI support) |
| Model Library        | Docker Hub AI models (Gemma, Llama, Mistral, Phi) |
| Embeddings           | ChromaDB (planned)                        |
| Background Jobs      | Background PDF parsing                    |
| PDF Parsing          | pdf-parse + custom chunking algorithm     |
| UI Components        | shadcn/ui + Radix UI                      |

---

## ⚙️ System Workflow Diagram

```plaintext
                  ┌────────────┐
                  │   Admin    │
                  └────┬───────┘
                       │
     Manage Users, Courses, Assign Roles
                       │
           ┌───────────▼────────────┐
           │  Faculty Users (Role-based)│
           └────────────────────────┘
   ┌────────────┬────────────┬─────────────┐
   │ Course     │ Module     │ Program     │
   │ Coordinator│ Coordinator│ Coordinator │
   └─────┬──────┴──────┬─────┴────────────┘
         │             │
  Upload Syllabus/Unit │
  PDFs                 │
         │             │
  Generate Questions   │
 (Docker Model Runner) │
         │             │
Review Questions <─────┘
 (Module + Program Coordinators)
         │
 Questions Approved
         ▼
Controller of Examinations
         │
Generate Question Paper
(Confidential - Only Controller Access)
         │
PDF Paper Generation + Print
         ▼
 Examination Ready
````

---

## 📦 Project Setup

> Using **Bun** for the project runtime.

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/your-org/bloomiq.git
cd bloomiq
```

### 2️⃣ Install Dependencies

```bash
bun install
```

### 3️⃣ Environment Variables

Create a `.env.local` file in the project root:

```dotenv
DATABASE_URL=postgresql://bloom_user:bloom_password@localhost:5432/bloom_iq
DIRECT_URL=postgresql://bloom_user:bloom_password@localhost:5432/bloom_iq
NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000
```

### 4️⃣ Start Docker Services

**Requires Docker Compose v2.38+** for native AI model support.

```bash
# Start PostgreSQL + AI Model
docker-compose up -d

# Verify services are running
docker-compose ps
```

Docker Compose will automatically:
- Pull and run the AI model (`ai/gemma2:2b`)
- Set up PostgreSQL database
- Inject AI model endpoints into the app

### 5️⃣ Database Setup

```bash
bunx prisma generate
bunx prisma migrate deploy
bunx prisma db seed  # Optional: seed with test data
```

### 6️⃣ Running the Development Server

```bash
bun run dev
```

App will be available at [http://localhost:3000](http://localhost:3000)

---

## 🤖 AI Model Configuration

BloomIQ uses Docker Compose's native AI model support. Models are defined in `docker-compose.yaml`:

```yaml
models:
  ai_model:
    model: ai/gemma2:2b      # Model from hub.docker.com/u/ai
    context_size: 8192       # Token context window
    runtime_flags:           # Model inference parameters
      - "--temp"
      - "0.7"
      - "--top-p"
      - "0.9"
```

**Available Models:**
- `ai/gemma2:2b` - Fast, efficient (Recommended)
- `ai/gemma2:9b` - Higher quality
- `ai/llama3.2:3b` - Long context (128K tokens)
- `ai/mistral:7b` - Industry standard
- `ai/phi3.5:latest` - Microsoft's model

**Switch Models:** Update `docker-compose.yaml` and run `docker-compose up -d`

See [DOCKER_MODEL_RUNNER_SETUP.md](./DOCKER_MODEL_RUNNER_SETUP.md) for details.

---

## 📅 Tentative Development Plan

| Phase                 | Tasks                                                    |
| --------------------- | -------------------------------------------------------- |
| Phase 1️⃣ : Setup     | Project scaffolding, Supabase Auth, Prisma setup         |
| Phase 2️⃣ : Admin     | CRUD for Users, Roles, Courses (Admin Panel)             |
| Phase 3️⃣ : Uploads   | PDF Upload (Course Coordinator), LangChain parsing       |
|| Phase 4️⃣ : AI Gen    | Question generation via Gemini                            |
| Phase 5️⃣ : Review    | Workflow for question approvals                          |
| Phase 6️⃣ : Exam Ctrl | Controller-exclusive paper generation + PDF export       |
| Phase 7️⃣ : Jobs      | Inngest-based background processing, scheduled emails    |
| Phase 8️⃣ : Security  | RBAC middleware, role-guarded UI                         |
| Phase 9️⃣ : Polish    | UI, error handling, performance optimization             |

---

## 📧 Scheduled Email Notifications

* Use Inngest for background task orchestration.
* Schedule notifications for:

  * Reminders to coordinators.
  * Notification of question approval/rejection.
  * Exam schedule updates.

---

## 🔒 Security Notes

* RBAC enforced across all APIs and UI routes.
* Question papers visible only to Controller of Examinations.
* NextAuth v5 for session management with secure cookies.
* Background jobs do not expose sensitive data.
* Passwords hashed with bcrypt.

---

## 🐳 Docker Deployment

### Quick Start

```bash
# Start all services
docker-compose up -d

# Run migrations
docker-compose exec bloom-iq-app bunx prisma migrate deploy

# View logs
docker-compose logs -f
```

### Architecture

The Docker setup includes:
- **PostgreSQL**: Database server
- **Next.js App**: Standalone deployment with Bun runtime
- **AI Model**: Native Docker Compose AI models (auto-configured)

Environment variables `AI_MODEL_URL` and `AI_MODEL_NAME` are automatically injected by Docker Compose's `models` feature.

### Deployment Guides

- **Detailed Setup**: [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md)
- **AI Model Configuration**: [DOCKER_MODEL_RUNNER_SETUP.md](./DOCKER_MODEL_RUNNER_SETUP.md)

---

## 🧪 Testing

### Run Tests

```bash
# Unit tests
bun test

# Type checking
bun run build
```

### Manual Testing Workflow

1. **Admin**: Create users with different roles
2. **Course Coordinator**: Upload PDF, generate questions
3. **Module Coordinator**: Review and approve/reject questions
4. **Program Coordinator**: Final review
5. **Controller of Examinations**: Assemble question paper

---

## 📋 Feature Checklist

### Completed ✅

- [x] Authentication & Authorization (NextAuth v5)
- [x] Admin dashboard (user/course CRUD)
- [x] Service layer architecture (clean separation)
- [x] Question approval workflow (CC → MC → PC → COE)
- [x] Question review UI with feedback system
- [x] Docker Model Runner integration (native Compose models)
- [x] PDF parsing and content chunking
- [x] AI question generation
- [x] Role-based access control

### In Progress 🚧

- [ ] Question editing interface
- [ ] COE dashboard (paper assembly)
- [ ] ChromaDB integration (semantic search)

### Planned 📅

- [ ] Background job queue (Inngest)
- [ ] Email notifications
- [ ] Question paper PDF export
- [ ] Analytics dashboard
- [ ] Bulk operations

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License.

