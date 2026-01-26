# BloomIQ - AI-Powered Question Paper Generator

> **Version 0.7.0** - Production-ready exam question generation platform

BloomIQ is an AI-driven question paper generation platform that leverages Bloom's Taxonomy to create academically rigorous examination questions. The system features multi-level approval workflows, role-based access control, and supports both cloud (Gemini) and local (Ollama) AI processing.

## Features

### Question Generation
- **AI-Powered Analysis**: Deep material analysis using Gemini or Ollama
- **Bloom's Taxonomy Alignment**: Strict adherence to cognitive levels (Remember to Create)
- **Multiple Question Types**: Direct, Problem-based, and Scenario-based questions
- **Marks Distribution**: 2, 8, and 16 mark questions with appropriate depth
- **Quality Assurance**: Non-blocking validation with detailed feedback

### Role-Based Workflows
- **Admin**: User and course management
- **Course Coordinator**: Upload materials, generate questions, review question bank
- **Module Coordinator**: Review and approve questions
- **Program Coordinator**: Final quality check
- **Controller of Examinations**: Assemble and export question papers

### Technical Highlights
- **Dual AI Support**: Gemini (cloud) or Ollama (local)
- **Round-Robin API Keys**: Automatically rotates through multiple Gemini keys to avoid rate limits
- **Intelligent Chunking**: Automatic handling of large PDF documents
- **Semantic Search**: Vector embeddings stored in PostgreSQL
- **Vercel Ready**: Deployable to Vercel with Neon DB

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), Tailwind CSS, shadcn/ui |
| Backend | tRPC v11, React Query |
| Database | PostgreSQL with pgvector (Neon DB for production) |
| Authentication | NextAuth v5 |
| AI Engine | Gemini (Google) or Ollama (Local) |
| PDF Processing | pdf-parse, custom chunking algorithm |
| Runtime | Bun |

## Quick Start

### Prerequisites

- **Bun** runtime installed
- **Docker** (for local development) or **Neon DB** (for production)
- Minimum 8GB RAM (16GB recommended for Ollama)

### 1. Clone and Install

```bash
git clone https://github.com/your-org/bloom-iq.git
cd bloom-iq
bun install
```

### 2. Configure Environment

Create `.env.local`:

```env
# Database (Neon for production, local Postgres for dev)
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/bloom_iq?sslmode=require
DIRECT_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/bloom_iq?sslmode=require

# Authentication
NEXTAUTH_SECRET=your-super-secret-key-change-this-minimum-32-characters
NEXTAUTH_URL=http://localhost:3000

# AI Provider Configuration
AI_PROVIDER=GEMINI

# Gemini Configuration (Recommended for deployment)
# Supports round-robin rotation for multiple keys
GEMINI_API_KEY=your_api_key_here
GEMINI_API_KEY_1=second_api_key    # Optional - for rate limit avoidance
GEMINI_API_KEY_2=third_api_key     # Optional - for rate limit avoidance
GEMINI_MODEL=gemini-2.5-flash

# Ollama Configuration (for local development)
# OLLAMA_URL=http://localhost:11434
# OLLAMA_MODEL=mistral:7b
```

### 3. Start Database

**For Local Development:**
```bash
docker compose -f docker-compose.dev.yml up -d
```

**For Production:** Use Neon DB (https://neon.tech)

### 4. Setup Database

```bash
bunx prisma generate
bunx prisma db push
bunx prisma db seed  # Optional: adds test data
```

### 5. Run Development Server

```bash
bun run dev
```

Access the application at http://localhost:3000

## AI Provider Setup

### Gemini (Recommended for Deployment)

1. Get API key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Set `AI_PROVIDER=GEMINI`
3. Add your API key(s)

**Rate Limit Avoidance:** Add multiple API keys for automatic round-robin rotation:
```env
GEMINI_API_KEY=key1
GEMINI_API_KEY_1=key2
GEMINI_API_KEY_2=key3
```

### Ollama (Local Development)

1. Install Ollama: https://ollama.com/download
2. Pull a model: `ollama pull mistral:7b`
3. Set `AI_PROVIDER=OLLAMA`

See [AI_PROVIDER_SETUP.md](./AI_PROVIDER_SETUP.md) for detailed instructions.

## Deployment to Vercel

### 1. Create Neon DB
1. Sign up at https://neon.tech
2. Create a new project
3. Copy the connection string

### 2. Set Environment Variables in Vercel
- `DATABASE_URL` - Neon connection string (pooled)
- `DIRECT_URL` - Neon connection string (direct)
- `NEXTAUTH_SECRET` - Secure random string (32+ chars)
- `NEXTAUTH_URL` - Your Vercel app URL
- `AI_PROVIDER` - `GEMINI`
- `GEMINI_API_KEY` - Your primary API key
- `GEMINI_API_KEY_1`, `GEMINI_API_KEY_2`, etc. - Additional keys for rotation

### 3. Deploy
```bash
vercel --prod
```

## Project Structure

```
bloom-iq/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (auth)/            # Authentication pages
│   │   ├── admin/             # Admin dashboard
│   │   ├── coordinator/       # Coordinator dashboards
│   │   └── api/               # API routes
│   ├── components/            # React components
│   ├── services/              # Business logic layer
│   │   └── ai/               # AI service (Gemini/Ollama)
│   ├── trpc/                  # tRPC routers
│   ├── lib/                   # Utility functions
│   └── validators/            # Zod schemas
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── seed.ts                # Database seeding
├── docker-compose.dev.yml     # Local PostgreSQL
└── ENV_SETUP_GUIDE.md         # Environment setup guide
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

1. **DIRECT**: Definition-based, explanatory, list/identify
2. **PROBLEM_BASED**: Apply theory, solve problems, step-by-step
3. **SCENARIO_BASED**: Real-world situations, multi-step reasoning

## Scripts

```bash
# Development
bun run dev              # Start dev server
bun run build            # Build for production
bun run start            # Start production server

# Database
bunx prisma generate     # Generate Prisma client
bunx prisma studio       # Open database GUI
bunx prisma db push      # Sync schema to database
bunx prisma db seed      # Seed test data

# Code Quality
bun run lint             # Run ESLint
```

## Documentation

- [ENV_SETUP_GUIDE.md](./ENV_SETUP_GUIDE.md) - Environment setup guide
- [AI_PROVIDER_SETUP.md](./AI_PROVIDER_SETUP.md) - AI setup and troubleshooting
- [OLLAMA_SETUP.md](./OLLAMA_SETUP.md) - Local Ollama setup

## Troubleshooting

### Rate Limit Errors (Gemini)
Add multiple API keys for round-robin rotation:
```env
GEMINI_API_KEY=key1
GEMINI_API_KEY_1=key2
GEMINI_API_KEY_2=key3
```

### Database Connection Issues
```bash
# Local PostgreSQL
docker compose -f docker-compose.dev.yml ps
docker compose -f docker-compose.dev.yml logs postgres

# Neon DB - check connection string format
# Should include ?sslmode=require
```

### Question Generation Issues
- Ensure AI provider is configured correctly
- Check API key validity
- Verify PDF content is readable (not scanned images)
- Check application logs for detailed error messages

## License

This project is licensed under the MIT License.

---

**Built with academic rigor and production quality.**
