# BloomIQ Quick Reference Guide

Essential commands and workflows for developers.

---

## 🚀 Quick Start Commands

### Local Development

```bash
# Install dependencies
bun install

# Start database
docker-compose up postgres -d

# Run migrations
bunx prisma migrate dev

# Generate Prisma client
bunx prisma generate

# Start dev server
bun run dev
```

### Docker Deployment

```bash
# Start all services
docker-compose up -d

# Run migrations in container
docker-compose exec bloom-iq-app bunx prisma migrate deploy

# View logs
docker-compose logs -f bloom-iq-app

# Stop services
docker-compose down
```

---

## 📦 Common Operations

### Database

```bash
# Open Prisma Studio
bunx prisma studio

# Create migration
bunx prisma migrate dev --name <migration-name>

# Reset database (development only)
bunx prisma migrate reset

# Seed database
bunx prisma db seed

# View migration status
bunx prisma migrate status
```

### Docker

```bash
# Rebuild app service
docker-compose up -d --build bloom-iq-app

# Check service status
docker-compose ps

# View specific service logs
docker-compose logs -f postgres
docker-compose logs -f bloom-iq-app

# Execute command in container
docker-compose exec bloom-iq-app <command>

# Restart service
docker-compose restart bloom-iq-app

# Remove all containers and volumes
docker-compose down -v
```

### AI Model Management

```bash
# Switch model (edit docker-compose.yaml)
# Change: model: ai/gemma2:2b
# To:     model: ai/mistral:7b

# Apply changes
docker-compose down
docker-compose up -d

# Check model is loaded
docker-compose logs bloom-iq-app | grep -i model
```

---

## 🧪 Testing & Validation

### Type Checking

```bash
# Full build (validates TypeScript)
bun run build

# Type check only
bunx tsc --noEmit
```

### Database Validation

```bash
# Validate schema
bunx prisma validate

# Check migration status
bunx prisma migrate status
```

### Docker Validation

```bash
# Validate docker-compose.yaml
docker-compose config

# Test database connection
docker-compose exec postgres psql -U bloom_user -d bloom_iq -c "SELECT 1"
```

---

## 🔐 User & Role Management

### Creating Users (via Prisma Studio)

1. Run `bunx prisma studio`
2. Navigate to `User` model
3. Add record with:
   - `email`: user@example.com
   - `password`: use `hashPassword()` from `lib/hash-password.ts`
   - `name`: Full Name
   - `role`: ADMIN | COURSE_COORDINATOR | MODULE_COORDINATOR | PROGRAM_COORDINATOR | CONTROLLER_OF_EXAMINATIONS
   - `is_active`: true

### Roles Hierarchy

```
ADMIN (Full system access)
  └── COURSE_COORDINATOR (Upload materials, generate questions)
       └── MODULE_COORDINATOR (Review questions at module level)
            └── PROGRAM_COORDINATOR (Review questions at program level)
                 └── CONTROLLER_OF_EXAMINATIONS (Final paper assembly)
```

---

## 🎯 Workflow Examples

### Complete Question Lifecycle

```
1. Course Coordinator:
   - Upload PDF: POST /api/trpc/course.uploadMaterial
   - Generate Questions: POST /api/trpc/question.generateQuestions

2. Module Coordinator:
   - Review Questions: GET /api/trpc/questionApproval.getQuestionsForReview
   - Approve: POST /api/trpc/questionApproval.approveQuestionByModuleCoordinator
   - OR Reject: POST /api/trpc/questionApproval.rejectQuestion

3. Program Coordinator:
   - Review MC_APPROVED questions
   - Approve: POST /api/trpc/questionApproval.approveQuestionByProgramCoordinator
   - OR Reject with feedback

4. Controller of Examinations:
   - Review PC_APPROVED questions
   - Assemble question paper
   - Generate final PDF
```

### Material Upload Flow

```bash
# 1. Upload PDF file
curl -X POST http://localhost:3000/api/upload \
  -F "file=@course-material.pdf" \
  -F "courseId=1" \
  -F "unit=Unit 1"

# 2. Verify upload in database
bunx prisma studio
# Check Course_Material table

# 3. Generate questions
# Use tRPC client or curl:
curl -X POST http://localhost:3000/api/trpc/question.generateQuestions \
  -H "Content-Type: application/json" \
  -d '{
    "courseId": 1,
    "unit": "Unit 1",
    "count": 10,
    "difficulty": "MEDIUM",
    "bloomLevel": "APPLY"
  }'
```

---

## 🛠️ Troubleshooting

### App won't start

```bash
# Check if port 3000 is in use
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Kill process and restart
kill -9 <PID>
bun run dev
```

### Database connection errors

```bash
# Verify PostgreSQL is running
docker-compose ps postgres

# Check DATABASE_URL in .env.local
# Should be: postgresql://bloom_user:bloom_password@localhost:5432/bloom_iq

# Test connection
docker-compose exec postgres psql -U bloom_user -d bloom_iq
```

### AI Model not responding

```bash
# Check model service logs
docker-compose logs bloom-iq-app | grep -i "AI_MODEL"

# Verify environment variables are injected
docker-compose exec bloom-iq-app env | grep AI_MODEL

# Should see:
# AI_MODEL_URL=<endpoint>
# AI_MODEL_NAME=ai/gemma2:2b
```

### Prisma client outdated

```bash
# Regenerate Prisma client
bunx prisma generate

# If schema changed, create migration
bunx prisma migrate dev

# Restart dev server
bun run dev
```

### Docker Compose errors

```bash
# Check Docker Compose version (need v2.38+)
docker-compose --version

# Validate compose file
docker-compose config

# Pull latest images
docker-compose pull

# Rebuild from scratch
docker-compose down -v
docker-compose up -d --build
```

---

## 📁 Important Files Reference

| File | Purpose |
|------|---------|
| `docker-compose.yaml` | Service orchestration + AI models |
| `Dockerfile` | App container build |
| `prisma/schema.prisma` | Database schema |
| `src/auth.ts` | NextAuth configuration |
| `src/trpc/context.ts` | tRPC context (auth, session) |
| `src/services/*.service.ts` | Business logic layer |
| `src/validators/*.validators.ts` | Input validation schemas |
| `src/lib/ai-question-generator.ts` | AI generation logic |
| `.env.local` | Environment variables (not in git) |
| `.env.example` | Environment template |

---

## 🔗 API Endpoints

### Authentication

- `POST /api/auth/signin` - Sign in
- `POST /api/auth/signout` - Sign out
- `GET /api/auth/session` - Get session

### tRPC Procedures

Base: `/api/trpc/`

**User Management:**
- `user.create`
- `user.list`
- `user.update`
- `user.delete`
- `user.bulkDelete`

**Course Management:**
- `course.create`
- `course.list`
- `course.update`
- `course.delete`

**Material Management:**
- `material.upload`
- `material.list`
- `material.delete`

**Question Management:**
- `question.generate`
- `question.list`
- `question.update`

**Question Approval:**
- `questionApproval.getQuestionsForReview`
- `questionApproval.approveQuestionByCourseCoordinator`
- `questionApproval.approveQuestionByModuleCoordinator`
- `questionApproval.approveQuestionByProgramCoordinator`
- `questionApproval.rejectQuestion`
- `questionApproval.getFeedbackHistory`
- `questionApproval.getStatistics`

---

## 🎨 UI Component Locations

```
src/components/
├── auth/                      # Login, register forms
│   ├── login-form.tsx
│   ├── register-form.tsx
│   └── logout-button.tsx
├── data-table/                # Reusable data tables
│   └── advanced-data-table.tsx
├── ui/                        # shadcn/ui components
│   ├── button.tsx
│   ├── card.tsx
│   ├── dialog.tsx
│   ├── form.tsx
│   └── ... (50+ components)
├── Navbar.tsx
├── Footer.tsx
└── theme-toggle.tsx

src/app/
├── (auth)/                    # Auth pages
│   ├── sign-in/
│   └── sign-up/
├── admin/                     # Admin dashboard
│   └── dashboard/
├── coordinator/               # Coordinator dashboards
│   └── dashboard/
│       └── question-paper/
│           └── review-questions/  # Question review UI
└── api/                       # API routes
    ├── auth/
    ├── trpc/
    └── upload/
```

---

## 🔥 Hot Tips

1. **Faster Development**: Use Turbopack dev server (`bun run dev`)
2. **Database GUI**: Prisma Studio is your friend (`bunx prisma studio`)
3. **Type Safety**: Let tRPC generate types automatically
4. **Docker Logs**: Use `docker-compose logs -f` to debug
5. **Model Testing**: Start with `ai/gemma2:2b` (fastest)
6. **Clean Builds**: Run `bun run build` before deploying
7. **Hot Reload**: Changes to services auto-reload in dev mode
8. **Environment**: Keep `.env.local` and `.env.example` in sync

---

## 📚 Documentation Links

- **Project Status**: [PROJECT_STATUS.md](./PROJECT_STATUS.md)
- **Docker Setup**: [DOCKER_DEPLOYMENT.md](./DOCKER_DEPLOYMENT.md)
- **AI Models**: [DOCKER_MODEL_RUNNER_SETUP.md](./DOCKER_MODEL_RUNNER_SETUP.md)
- **Upload Guide**: [UPLOAD_FUNCTIONALITY.md](./UPLOAD_FUNCTIONALITY.md)
- **Main README**: [README.md](./README.md)

---

**💡 Need Help?**
- Check logs: `docker-compose logs -f`
- Validate setup: `docker-compose config`
- View database: `bunx prisma studio`
- Test API: Use Postman or curl
- Ask team: Create GitHub issue
