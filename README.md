# BloomIQ — AI-Powered Question Paper Generator

> **Version 0.6.0**

BloomIQ is an AI-driven question paper generation platform for academic institutions. It uses **Bloom's Taxonomy** to produce educationally rigorous examination questions from uploaded course materials (PDFs), with a multi-level approval workflow, role-based access control, and support for both cloud (Google Gemini) and local (Ollama) AI processing.

For a deep technical reference, see [ARCHITECTURE.md](./ARCHITECTURE.md).

## Features

### Question Generation
- **AI-Powered Analysis**: Deep material analysis using Gemini or Ollama via the Vercel AI SDK
- **Bloom's Taxonomy Alignment**: Questions mapped to cognitive levels (Remember → Create)
- **Multiple Question Types**: Direct, problem-based, and scenario-based questions
- **Marks Distribution**: 2, 8, and 16 mark questions with appropriate depth
- **Real-World Grounding**: Optional web search (Tavily / Serper) for scenario context
- **Validation**: AI-powered checks of a paper against course outcomes and Bloom's distribution

### Question Papers
- **Paper Patterns**: Define exam structure (Part A / Part B, marks, units) with its own approval workflow
- **Paper Assembly**: Controller of Examinations selects approved questions to assemble final papers
- **PDF Export**: Export question banks and papers with LaTeX math (KaTeX) and Mermaid diagram support

### RAG Chat (Kai)
- Faculty can chat with uploaded course materials for context-aware Q&A
- Embeddings via Google `text-embedding-004` (cloud) or `nomic-embed-text` (local)

### Role-Based Workflows

| Role | Code | Responsibility |
|------|------|----------------|
| Admin | `ADMIN` | User and course management, system administration |
| Course Coordinator | `COURSE_COORDINATOR` | Upload materials, generate questions, create patterns, first-level review |
| Module Coordinator | `MODULE_COORDINATOR` | Second-level question review, pattern approval |
| Program Coordinator | `PROGRAM_COORDINATOR` | Third-level question review, pattern approval |
| Controller of Examination | `CONTROLLER_OF_EXAMINATION` | Final pattern approval, paper assembly and finalization |

### Technical Highlights
- **Dual AI Support**: Gemini (cloud) or Ollama (local)
- **Round-Robin API Keys**: Rotates through multiple Gemini keys (`GEMINI_API_KEY`, `GEMINI_API_KEY_1`, …) to avoid rate limits
- **Intelligent Chunking**: Automatic handling of large PDF documents (parsed in memory)
- **Semantic Search**: Vector embeddings stored as PostgreSQL `Float[]` columns, cosine similarity computed in application code
- **Vercel Ready**: Deployable to Vercel with Neon DB

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime / Package Manager | Bun |
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 (strict) |
| API | tRPC v11 + TanStack React Query v5 (superjson transformer) |
| Database | PostgreSQL 16 (Docker for dev, Neon DB for production) |
| ORM | Prisma v7 with `@prisma/adapter-pg` |
| Authentication | Better Auth v1.4 (email/password, session cookies) |
| AI SDK | Vercel AI SDK v6 |
| AI (Cloud) | Google Gemini (`gemini-2.5-flash`) via `@ai-sdk/google` |
| AI (Local) | Ollama (`mistral:7b`) via `ollama-ai-provider-v2` |
| Vector Storage | PostgreSQL `Float[]` — cosine similarity in app code |
| UI | shadcn/ui + Radix UI, Tailwind CSS v4 |
| Data Tables | TanStack Table v8 |
| Forms | React Hook Form v7 + Zod v4 |
| PDF Processing | `pdf-parse` + custom chunking |

## Quick Start

### Prerequisites

- **Bun** runtime installed
- **Docker** (for local development) or a **Neon DB** account (for production)
- Minimum 8 GB RAM (16 GB recommended when running Ollama locally)

### 1. Clone and Install

```bash
git clone https://github.com/your-org/bloom-iq.git
cd bloom-iq
bun install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Then edit `.env`. For a **local Docker database the `DATABASE_URL` / `DIRECT_URL` defaults work as-is** — you only need to set:

- `BETTER_AUTH_SECRET` — any random 32+ char string (`openssl rand -base64 32`)
- `GEMINI_API_KEY` — a free key from [Google AI Studio](https://aistudio.google.com/app/apikey)

`.env.example` documents every other variable, including the Ollama block if you prefer running the model locally (`AI_PROVIDER=OLLAMA`).

### 3. Start the Database

**Local development:**
```bash
docker compose -f docker-compose.dev.yml up -d
```
(The container has no restart policy — run this again after a reboot.)

**Production:** use [Neon DB](https://neon.tech).

### 4. Set Up the Database

One command generates the Prisma client, applies migrations, and seeds test data:

```bash
bun run setup
```

<details>
<summary>...or run the steps individually</summary>

```bash
bunx prisma generate       # generate the Prisma client into src/generated/prisma
bunx prisma migrate deploy # apply migrations
bun run prisma/seed.ts     # seed test data (100 users, 25 courses, materials)
```
</details>

The seed creates a ready-to-use admin account:

| Email | Password |
|-------|----------|
| `admin@bloomiq.com` | `Password@123` |

All other seeded accounts (course/module/program coordinators, COE) use the same password. Their emails are printed at the end of the seed output in the form `first.lastN@bloomiq.com`.

### 5. Run the Development Server

```bash
bun run dev
```

The app runs at http://localhost:3000. Sign in with `admin@bloomiq.com` / `Password@123`.

## AI Provider Setup

### Gemini (recommended for deployment)

1. Get an API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Set `AI_PROVIDER=GEMINI`.
3. Add one or more API keys.

**Rate-limit avoidance** — add multiple keys for automatic round-robin rotation:
```env
GEMINI_API_KEY=key1
GEMINI_API_KEY_1=key2
GEMINI_API_KEY_2=key3
```

### Ollama (local development)

1. Install Ollama: https://ollama.com/download
2. Pull the models:
   ```bash
   ollama pull mistral:7b
   ollama pull nomic-embed-text:v1.5
   ```
3. Set `AI_PROVIDER=OLLAMA` and the `OLLAMA_*` variables.

## Deployment to Vercel

### 1. Create a Neon DB
1. Sign up at https://neon.tech and create a project.
2. Copy the pooled and direct connection strings.

### 2. Set Environment Variables in Vercel

| Variable | Required | Notes |
|----------|----------|-------|
| `DATABASE_URL` | Yes | Neon pooled connection string |
| `DIRECT_URL` | Yes | Neon direct connection string (migrations) |
| `BETTER_AUTH_SECRET` | Yes | Secure random string (32+ chars) |
| `BETTER_AUTH_URL` | Yes | Your Vercel app URL |
| `AI_PROVIDER` | Yes | `GEMINI` or `OLLAMA` |
| `GEMINI_API_KEY` | If Gemini | Primary API key |
| `GEMINI_API_KEY_1..N` | Optional | Additional keys for round-robin |
| `GEMINI_MODEL` | Optional | Default: `gemini-2.5-flash` |
| `TAVILY_API_KEY` / `SERPER_API_KEY` | Optional | Web-search grounding |

### 3. Deploy
```bash
vercel --prod
```

The `build` script runs `prisma generate` before `next build`, so the Prisma client is generated on every deploy.

## Project Structure

```
bloom-iq/
├── src/
│   ├── actions/               # Server actions (auth, etc.)
│   ├── app/                   # Next.js App Router
│   │   ├── (auth)/            # sign-in, sign-up
│   │   ├── (home)/            # marketing / landing
│   │   ├── admin/             # Admin dashboard
│   │   ├── coordinator/       # Coordinator dashboard
│   │   ├── coe/               # Controller of Examinations dashboard
│   │   └── api/               # auth, trpc, upload, coordinator routes
│   ├── components/            # React components (ui/, auth/, data-table/)
│   ├── services/
│   │   └── ai/               # AI engine (index.ts, parsers/, prompts/)
│   ├── trpc/routers/          # tRPC routers (_app, admin, coordinator,
│   │                          #   paper, pattern, question-approval,
│   │                          #   question-bank, user)
│   ├── lib/                   # auth, prisma, utilities
│   ├── hooks/                 # React hooks
│   ├── validators/            # Zod schemas
│   ├── types/                 # Shared types
│   └── generated/prisma/      # Generated Prisma client (git-ignored)
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Database seeding
├── prisma.config.ts           # Prisma v7 CLI config
├── docker-compose.dev.yml     # Local PostgreSQL
└── ARCHITECTURE.md            # Full technical reference
```

## Question Generation System

### Bloom's Taxonomy Levels

| Level | Cognitive Process | Difficulty | Marks |
|-------|------------------|------------|-------|
| REMEMBER | Recall facts, definitions | EASY | 2 |
| UNDERSTAND | Explain concepts | EASY | 2 |
| APPLY | Apply theory to examples | MEDIUM | 8 |
| ANALYZE | Compare, contrast, examine | MEDIUM | 8 |
| EVALUATE | Justify, critique, assess | HARD | 16 |
| CREATE | Design, formulate, produce | HARD | 16 |

### Question Types

1. **DIRECT** — definition-based, explanatory, list/identify
2. **PROBLEM_BASED** — apply theory, solve problems, step-by-step
3. **SCENARIO_BASED** — real-world situations, multi-step reasoning

### Approval Workflow

Questions flow through **Course Coordinator → Module Coordinator → Program Coordinator**. Paper patterns are approved by **Module Coordinator → Program Coordinator → Controller of Examination** before a paper can be assembled.

## Scripts

```bash
# Development
bun run dev              # Start dev server (Turbopack)
bun run build            # prisma generate && next build
bun run start            # Start production server

# Database
bun run setup            # generate + migrate deploy + seed (first-time setup)
bun run generate         # prisma generate
bun run migrate          # prisma migrate dev (create a new migration)
bun run db:migrate       # prisma migrate deploy (apply existing migrations)
bun run db:reset         # prisma migrate reset --force (drop, re-migrate, re-seed)
bun run seed             # bun run prisma/seed.ts
bunx prisma studio       # Open the database GUI

# Code Quality
bun run lint             # Run ESLint
bun run lint:fix         # Run ESLint with --fix
```

## Troubleshooting

### Rate-limit errors (Gemini)
Add multiple API keys for round-robin rotation (`GEMINI_API_KEY`, `GEMINI_API_KEY_1`, `GEMINI_API_KEY_2`, …).

### Database connection issues
```bash
# Local PostgreSQL
docker compose -f docker-compose.dev.yml ps
docker compose -f docker-compose.dev.yml logs postgres
```
For Neon, make sure the connection string includes `?sslmode=require` and that `DIRECT_URL` points at the non-pooled endpoint.

### Question generation issues
- Confirm `AI_PROVIDER` and the matching provider variables are set
- Check API key validity
- Verify the PDF has extractable text (not scanned images)
- Check the application logs for detailed error messages

## License
This project is licensed under [GNU Affero General Public License (GNU AGPL)](LICENSE)

> Leave a start if you felt the repo was useful ⭐
