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
  - Uses Google Gemini for question generation.
  - LangChain.js for document parsing and chunking.
  - Inngest for background job orchestration.

- ✅ **Notifications & Scheduling**
  - Scheduled email notifications via Inngest or cron jobs.

- ✅ **Secure Role-Based Access Control (RBAC)**
  - Question papers accessible only to authorized roles.

---

## 🛠️ Tech Stack

| Layer                | Technologies                        |
|----------------------|-------------------------------------|
| Frontend             | Next.js (App Router) + Tailwind CSS |
| Backend API          | tRPC or Next.js API Routes          |
| Authentication       | Supabase Auth                       |
| Database             | Supabase (PostgreSQL) + Prisma ORM  |
| AI Models            | Google Gemini (text generation)     |
| Embeddings           | Vertex AI                           |
| Background Jobs      | Inngest                              |
| PDF Parsing          | LangChain.js + PDFLoader            |
| Email Scheduling     | Inngest + SMTP/SendGrid             |

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
 (LangChain + Gemini)  │
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

Create a `.env` file in the project root:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=
DATABASE_URL=
DIRECT_URL=
GOOGLE_APPLICATION_CREDENTIALS=
GEMINI_API_KEY=
```

### 4️⃣ Database Setup (Supabase + Prisma)

```bash
bunx prisma generate
bunx prisma migrate deploy
```


### 5️⃣ Running the Development Server

```bash
bun run dev
```

App will be available at [http://localhost:3000](http://localhost:3000)

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
* Supabase Auth tokens used for session management.
* Background jobs do not expose sensitive data.

