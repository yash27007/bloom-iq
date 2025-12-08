# BloomIQ - AI-Powered Question Paper Generator

> **Version 0.6.0** - Production-ready exam question generation platform

BloomIQ is an AI-driven question paper generation platform that leverages Bloom's Taxonomy to create academically rigorous examination questions. The system features multi-level approval workflows, role-based access control, and local AI processing for complete data privacy.

## Features

### Question Generation
- **AI-Powered Analysis**: Deep material analysis using local Ollama models
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
- **Local AI Processing**: Ollama integration (no external API calls)
- **Intelligent Chunking**: Automatic handling of large PDF documents
- **Robust Parsing**: Enhanced JSON sanitization and error handling
- **Production Ready**: Comprehensive logging, validation, and error recovery

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), Tailwind CSS, shadcn/ui |
| Backend | tRPC v11, React Query |
| Database | PostgreSQL, Prisma ORM |
| Authentication | NextAuth v5 |
| AI Engine | Ollama (Local LLM) |
| AI Models | Gemma3:4b, Llama3, Mistral, Phi |
| PDF Processing | pdf-parse, custom chunking algorithm |
| Runtime | Bun |

## Quick Start

### Prerequisites

- **Bun** runtime installed
- **Docker** and Docker Compose
- **Ollama** installed locally
- Minimum 8GB RAM (16GB recommended)

### 1. Clone and Install

```bash
git clone https://github.com/your-org/bloom-iq.git
cd bloom-iq
bun install
```

### 2. Setup Ollama

**Install Ollama:**
- Windows/macOS: Download from https://ollama.com/download
- Linux: `curl -fsSL https://ollama.com/install.sh | sh`

**Pull the default model:**
```bash
ollama pull gemma3:4b
```

**Verify Ollama is running:**
```bash
curl http://localhost:11434
# Should return: "Ollama is running"
```

See [OLLAMA_SETUP.md](./OLLAMA_SETUP.md) for detailed instructions.

### 3. Configure Environment

Create `.env.local`:

```env
# Database
DATABASE_URL=postgresql://bloom_user:bloom_password@localhost:5432/bloom_iq
DIRECT_URL=postgresql://bloom_user:bloom_password@localhost:5432/bloom_iq

# Authentication
NEXTAUTH_SECRET=your-super-secret-key-change-this-minimum-32-characters
NEXTAUTH_URL=http://localhost:3000

# Ollama AI
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=mistral:7b
```

### 4. Start Database

```bash
docker compose up -d
```

### 5. Setup Database

```bash
bunx prisma generate
bunx prisma db push
bunx prisma db seed  # Optional: adds test data
```

### 6. Run Development Server

```bash
bun run dev
```

Access the application at http://localhost:3000

## AI Model Configuration

BloomIQ uses **Ollama** for local AI model execution. No external API calls are made.

### Available Models

| Model | Size | Context | Best For |
|-------|------|---------|----------|
| `gemma3:4b` | 4B | 8K | Fast, lightweight (may have quality issues, use RAG for better results) |
| `mistral:7b` | 7B | 32K | **Recommended** - Fast, efficient, excellent instruction following, less heat |
| `qwen2.5:7b` | 7B | 32K | Fast, excellent quality, balanced |
| `llama3.1:8b` | 8B | 128K | High quality, longer answers (needs 12GB RAM, slower) |
| `deepseek-r1:8b` | 8B | 64K | Excellent reasoning, good quality |
| `deepseek-r1:14b` | 14B | 64K | Best quality but slow, needs 16GB+ RAM |
| `llama3.2:3b` | 3B | 128K | Very fast but lower quality |

### Switch Models

```bash
# Pull Mistral 7B (Recommended - Fast, efficient, less heat)
ollama pull mistral:7b

# Or pull other models
ollama pull llama3.1:8b
ollama pull qwen2.5:7b
ollama pull deepseek-r1:8b

# Update .env.local
OLLAMA_MODEL=mistral:7b

# Restart the application
```

**Recommended Model**: `mistral:7b` provides excellent instruction following, fast generation, and efficient resource usage, making it ideal for academic question generation without overheating your system. Best balance of speed, quality, and efficiency.

**For Longer Answers (if you have more RAM)**: `llama3.1:8b` - generates longer, more detailed answers but requires ~12GB RAM and runs slower.

See [OLLAMA_SETUP.md](./OLLAMA_SETUP.md) for troubleshooting and advanced configuration.

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
│   │   └── ai/               # AI service (Ollama integration)
│   ├── trpc/                  # tRPC routers
│   ├── lib/                   # Utility functions
│   └── validators/            # Zod schemas
├── prisma/
│   ├── schema.prisma          # Database schema
│   └── migrations/            # Database migrations
├── docker-compose.yaml        # PostgreSQL service
└── OLLAMA_SETUP.md           # AI setup guide
```

## Development Workflow

### 1. Admin Setup
- Create users with appropriate roles
- Add courses and configure syllabi

### 2. Course Coordinator
- Upload unit-wise PDF materials
- Generate questions using AI
- Review generated questions
- Submit for approval

### 3. Module/Program Coordinator
- Review submitted questions
- Approve or reject with feedback
- Questions return to coordinator if rejected

### 4. Controller of Examinations
- Access approved question bank
- Assemble question papers
- Export final papers for printing

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

### Answer Standards

- **2 Marks**: 50-100 words, concise definition/explanation
- **8 Marks**: 400-600 words, comprehensive explanation
- **16 Marks**: 1000-1500 words, exhaustive coverage with examples

## Database Schema

Key models:
- **User**: Authentication and role management
- **Course**: Course information and configuration
- **CourseMaterial**: Uploaded PDF content
- **Question**: Generated questions with metadata
- **QuestionPaper**: Assembled exam papers

See `prisma/schema.prisma` for complete schema.

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
bun run type-check       # TypeScript validation
```

## Security Features

- **NextAuth v5**: Secure session management
- **Role-Based Access Control**: Enforced at API and UI levels
- **Password Hashing**: bcrypt with salt rounds
- **SQL Injection Protection**: Prisma parameterized queries
- **Local AI Processing**: No data sent to external services

## Deployment

### Production Checklist

- [ ] Set strong `NEXTAUTH_SECRET` (min 32 characters)
- [ ] Change default PostgreSQL password
- [ ] Enable HTTPS/TLS
- [ ] Set up database backups
- [ ] Configure monitoring and logging
- [ ] Review environment variables
- [ ] Test all user workflows

### Environment Variables (Production)

```env
NODE_ENV=production
DATABASE_URL=postgresql://secure_user:strong_pass@postgres:5432/bloom_iq
NEXTAUTH_SECRET=production-secret-minimum-32-characters-long
NEXTAUTH_URL=https://your-domain.com
OLLAMA_BASE_URL=http://ollama-service:11434
OLLAMA_MODEL=mistral:7b
```

## Documentation

- [CHANGELOG.md](./CHANGELOG.md) - Version history
- [OLLAMA_SETUP.md](./OLLAMA_SETUP.md) - AI setup and troubleshooting
- [RELEASE_NOTES_0.6.0.md](./RELEASE_NOTES_0.6.0.md) - Latest release details

## Troubleshooting

### Ollama Connection Issues

```bash
# Check if Ollama is running
curl http://localhost:11434

# Restart Ollama service
# Windows: Restart from system tray
# macOS: brew services restart ollama
# Linux: systemctl restart ollama
```

### Database Connection Issues

```bash
# Check if PostgreSQL is running
docker compose ps

# Restart PostgreSQL
docker compose restart postgres

# Check logs
docker compose logs postgres
```

### Question Generation Issues

- Ensure Ollama model is downloaded: `ollama list`
- Check model has enough context: Default 8K tokens
- Verify PDF content is readable (not scanned images)
- Check application logs for detailed error messages

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For issues and questions:
- **GitHub Issues**: Create an issue in the repository
- **Documentation**: Check [OLLAMA_SETUP.md](./OLLAMA_SETUP.md) for AI-related issues
- **Ollama Docs**: https://ollama.com/docs

---

**Built with academic rigor and production quality.**

