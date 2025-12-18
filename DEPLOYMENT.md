# Deployment Guide - BloomIQ

## Deployment Strategy Decision

### **Recommendation: Use Docker Deployment**

Given your application requirements:
- ✅ PostgreSQL database
- ✅ ChromaDB (vector database)
- ✅ Ollama AI service (needs to run continuously)
- ✅ File uploads (needs persistent storage)
- ✅ Background PDF processing jobs

**Docker is the better choice** because:
1. **Ollama Integration**: Ollama needs to run as a service, which is easier with Docker
2. **File Storage**: Persistent storage for uploads is simpler with Docker volumes
3. **Database Networking**: Better container networking for PostgreSQL and ChromaDB
4. **Background Jobs**: Long-running processes work better in containers
5. **Cost**: More cost-effective for resource-intensive AI workloads

**Vercel Limitations**:
- ❌ No long-running processes (Ollama won't work)
- ❌ Limited file system (uploads will be lost)
- ❌ Serverless functions timeout (PDF processing may fail)
- ❌ No persistent storage
- ❌ Higher costs for AI workloads

---

## Docker Deployment (Recommended)

### Prerequisites

- Docker and Docker Compose installed
- At least 8GB RAM (16GB recommended for AI)
- Ollama installed on the host or in a container

### Step 1: Update docker-compose.yml

Add the Next.js app and Ollama services:

```yaml
services:
  postgres:
    image: postgres:16
    container_name: bloom-iq-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: bloom_iq
      POSTGRES_USER: bloom_user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-bloom_password}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U bloom_user -d bloom_iq"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - bloom-iq-network

  chromadb:
    image: chromadb/chroma:latest
    container_name: bloom-iq-chromadb
    ports:
      - "8000:8000"
    volumes:
      - chroma_data:/chroma/chroma
    environment:
      - IS_PERSISTENT=TRUE
      - ANONYMIZED_TELEMETRY=FALSE
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/api/v1/heartbeat"]
      interval: 30s
      timeout: 10s
      retries: 3
    networks:
      - bloom-iq-network

  ollama:
    image: ollama/ollama:latest
    container_name: bloom-iq-ollama
    restart: unless-stopped
    volumes:
      - ollama_data:/root/.ollama
    ports:
      - "11434:11434"
    networks:
      - bloom-iq-network
    # Pull the model on first start
    command: >
      sh -c "ollama serve & 
             sleep 5 && 
             ollama pull mistral:7b"

  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: bloom-iq-app
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://bloom_user:${POSTGRES_PASSWORD:-bloom_password}@postgres:5432/bloom_iq
      - DIRECT_URL=postgresql://bloom_user:${POSTGRES_PASSWORD:-bloom_password}@postgres:5432/bloom_iq
      - NEXTAUTH_SECRET=${NEXTAUTH_SECRET}
      - NEXTAUTH_URL=${NEXTAUTH_URL:-http://localhost:3000}
      - OLLAMA_BASE_URL=http://ollama:11434
      - OLLAMA_URL=http://ollama:11434
      - DEFAULT_AI_MODEL=${OLLAMA_MODEL:-mistral:7b}
      - AI_PROVIDER=${AI_PROVIDER:-OLLAMA}
      - CHROMA_URL=http://chromadb:8000
      - CHROMA_COLLECTION=material_chunks
    volumes:
      - ./src/uploads:/app/src/uploads
      - ./prisma:/app/prisma
    depends_on:
      postgres:
        condition: service_healthy
      chromadb:
        condition: service_healthy
      ollama:
        condition: service_started
    networks:
      - bloom-iq-network

networks:
  bloom-iq-network:
    driver: bridge

volumes:
  postgres_data:
  chroma_data:
  ollama_data:
```

### Step 2: Create .env.production

```env
# Database
POSTGRES_PASSWORD=your_secure_password_here
DATABASE_URL=postgresql://bloom_user:your_secure_password_here@postgres:5432/bloom_iq
DIRECT_URL=postgresql://bloom_user:your_secure_password_here@postgres:5432/bloom_iq

# Authentication
NEXTAUTH_SECRET=your-super-secret-key-minimum-32-characters-long-change-this
NEXTAUTH_URL=https://your-domain.com

# AI Configuration
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_URL=http://ollama:11434
OLLAMA_MODEL=mistral:7b
AI_PROVIDER=OLLAMA
DEFAULT_AI_MODEL=mistral:7b

# Vector Database
CHROMA_URL=http://chromadb:8000
CHROMA_COLLECTION=material_chunks

# Optional: Gemini (if using)
GEMINI_API_KEY=your_gemini_api_key_if_using
```

### Step 3: Build and Deploy

```bash
# Build the Docker image
docker compose build

# Start all services
docker compose up -d

# Check logs
docker compose logs -f app

# Run database migrations
docker compose exec app bunx prisma migrate deploy
# Or push schema
docker compose exec app bunx prisma db push

# Seed database (optional)
docker compose exec app bunx prisma db seed
```

### Step 4: Verify Deployment

```bash
# Check all services are running
docker compose ps

# Check app health
curl http://localhost:3000

# Check Ollama
curl http://localhost:11434

# Check database
docker compose exec postgres psql -U bloom_user -d bloom_iq -c "SELECT 1;"
```

### Step 5: Production Considerations

1. **Reverse Proxy (Nginx/Traefik)**: Set up for HTTPS
2. **SSL Certificate**: Use Let's Encrypt
3. **Backups**: Set up automated PostgreSQL backups
4. **Monitoring**: Add health checks and logging
5. **Resource Limits**: Set memory/CPU limits in docker-compose

---

## Vercel Deployment (Alternative - Limited)

If you still want to try Vercel, note these limitations:

### Setup Steps

1. **Install Vercel CLI**:
```bash
npm i -g vercel
```

2. **Create vercel.json**:
```json
{
  "buildCommand": "bun run build",
  "devCommand": "bun run dev",
  "installCommand": "bun install",
  "framework": "nextjs",
  "regions": ["iad1"],
  "env": {
    "DATABASE_URL": "@database_url",
    "NEXTAUTH_SECRET": "@nextauth_secret",
    "NEXTAUTH_URL": "@nextauth_url"
  }
}
```

3. **Deploy**:
```bash
vercel --prod
```

### Vercel Limitations

⚠️ **Critical Issues**:
- Ollama cannot run on Vercel (serverless functions)
- File uploads will be lost (no persistent storage)
- PDF processing may timeout (10s limit for hobby, 60s for pro)
- Database connections may be slow (cold starts)
- Background jobs won't work

**Workarounds** (if you must use Vercel):
- Use external Ollama service (separate server)
- Use external file storage (S3, Cloudinary)
- Use external database (Supabase, Neon)
- Use external job queue (Inngest, Trigger.dev)

---

## Testing Deployment

### 1. Test Database Connection

```bash
docker compose exec app bunx prisma studio
# Or
docker compose exec postgres psql -U bloom_user -d bloom_iq
```

### 2. Test Ollama Connection

```bash
curl http://localhost:11434/api/tags
# Should return list of models
```

### 3. Test Application

1. **Login**: Access `/sign-in` and login
2. **Upload Material**: Test PDF upload
3. **Generate Questions**: Test question generation
4. **Validate Question Paper**: Test the new validation feature

### 4. Test Validation Feature

1. Upload a syllabus PDF for a course
2. Wait for parsing to complete
3. Go to "Validate Question Paper"
4. Select the course
5. Upload a question paper PDF
6. Verify validation results

---

## Troubleshooting

### Issue: Ollama not responding

```bash
# Check Ollama container
docker compose logs ollama

# Restart Ollama
docker compose restart ollama

# Pull model manually
docker compose exec ollama ollama pull mistral:7b
```

### Issue: Database connection failed

```bash
# Check PostgreSQL
docker compose logs postgres

# Restart PostgreSQL
docker compose restart postgres

# Verify connection string
docker compose exec app env | grep DATABASE_URL
```

### Issue: File uploads not persisting

```bash
# Check volume mount
docker compose exec app ls -la /app/src/uploads

# Verify volume exists
docker volume ls
```

### Issue: Build fails

```bash
# Clean build
docker compose build --no-cache

# Check logs
docker compose build 2>&1 | tee build.log
```

---

## Production Checklist

- [ ] Set strong passwords in `.env.production`
- [ ] Configure `NEXTAUTH_URL` with your domain
- [ ] Set up reverse proxy (Nginx/Traefik)
- [ ] Configure SSL certificate
- [ ] Set up database backups
- [ ] Configure monitoring and alerts
- [ ] Set resource limits in docker-compose
- [ ] Test all features end-to-end
- [ ] Review security settings
- [ ] Set up log aggregation
- [ ] Configure auto-restart policies

---

## Next Steps

1. **Choose Docker** (recommended) or Vercel
2. **Set up environment variables**
3. **Build and deploy**
4. **Run migrations**
5. **Test thoroughly**
6. **Set up monitoring**

For questions or issues, check the logs:
```bash
docker compose logs -f
```

