# Docker Compose Deployment Guide

## Prerequisites

- **Docker Desktop** or **Docker Engine** with **Docker Compose v2.38+**
- Minimum 8GB RAM (16GB recommended for AI models)
- 10GB free disk space

## Architecture

```
┌─────────────────────────────────────────┐
│         Docker Compose Stack            │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────────┐   ┌──────────────┐   │
│  │  PostgreSQL  │   │   Next.js    │   │
│  │   Database   │◄──┤     App      │   │
│  │   (Port 5432)│   │  (Port 3000) │   │
│  └──────────────┘   └──────┬───────┘   │
│                             │           │
│                             ▼           │
│                    ┌──────────────┐     │
│                    │  AI Model    │     │
│                    │  (Gemma 2B)  │     │
│                    │  Docker Hub  │     │
│                    └──────────────┘     │
│                                         │
└─────────────────────────────────────────┘
```

## Quick Start

### 1. Clone and Configure

```bash
git clone https://github.com/your-org/bloom-iq.git
cd bloom-iq

# Copy environment template
cp .env.example .env.local
```

### 2. Configure Environment Variables

Edit `.env.local`:

```env
# Database (automatically configured by docker-compose)
DATABASE_URL=postgresql://bloom_user:bloom_password@postgres:5432/bloom_iq
DIRECT_URL=postgresql://bloom_user:bloom_password@postgres:5432/bloom_iq

# NextAuth
NEXTAUTH_SECRET=your-super-secret-key-change-this
NEXTAUTH_URL=http://localhost:3000

# AI Model (injected by Docker Compose)
# DOCKER_MODEL_RUNNER_URL and DEFAULT_AI_MODEL are set automatically
```

### 3. Start Services

```bash
# Start all services (PostgreSQL + AI Model + App)
docker-compose up -d

# View logs
docker-compose logs -f

# Check status
docker-compose ps
```

Expected output:
```
NAME                IMAGE                      STATUS
bloom-iq-postgres   postgres:16                Up (healthy)
bloom-iq-app        bloom-iq-bloom-iq-app      Up
```

### 4. Initialize Database

```bash
# Run migrations
docker-compose exec bloom-iq-app bunx prisma migrate deploy

# Seed database (optional)
docker-compose exec bloom-iq-app bunx prisma db seed
```

### 5. Access Application

- **App**: http://localhost:3000
- **PostgreSQL**: localhost:5432

## AI Model Configuration

### Default Model

The default configuration uses `ai/gemma2:2b` (2B parameters, fast and efficient):

```yaml
models:
  ai_model:
    model: ai/gemma2:2b
    context_size: 8192
    runtime_flags:
      - "--temp"
      - "0.7"
      - "--top-p"
      - "0.9"
```

### Switch Models

Edit `docker-compose.yaml` to use a different model:

```yaml
models:
  ai_model:
    model: ai/mistral:7b     # Change model
    context_size: 32768      # Adjust context size
    runtime_flags:
      - "--temp"
      - "0.7"              # Temperature (0-1, lower = more deterministic)
      - "--top-p"
      - "0.9"              # Top-p sampling
      - "--threads"
      - "8"                # CPU threads
```

**Available Models:**

| Model | Size | Context | Best For |
|-------|------|---------|----------|
| `ai/gemma2:2b` | 2B | 8K | Fast, low resource |
| `ai/gemma2:9b` | 9B | 8K | High quality |
| `ai/llama3.2:3b` | 3B | 128K | Long documents |
| `ai/llama3.2:1b` | 1B | 128K | Ultra fast |
| `ai/mistral:7b` | 7B | 32K | Industry standard |
| `ai/phi3.5:latest` | 3.8B | 128K | Technical content |

After changing the model:
```bash
docker-compose down
docker-compose up -d
```

### Runtime Tuning

**For Development (verbose logging):**
```yaml
runtime_flags:
  - "--verbose"
  - "--verbose-prompt"
  - "--log-timestamps"
  - "--log-colors"
```

**For Production (deterministic):**
```yaml
runtime_flags:
  - "--temp"
  - "0.1"              # Lower temperature
  - "--top-k"
  - "1"                # Top-k=1 for determinism
```

**For Creative Generation:**
```yaml
runtime_flags:
  - "--temp"
  - "1.0"              # Higher temperature
  - "--top-p"
  - "0.95"
```

## Maintenance

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f bloom-iq-app
docker-compose logs -f postgres
```

### Restart Services

```bash
# Restart all
docker-compose restart

# Restart app only
docker-compose restart bloom-iq-app
```

### Update Application

```bash
# Pull latest code
git pull origin main

# Rebuild and restart
docker-compose up -d --build
```

### Database Backup

```bash
# Export database
docker-compose exec postgres pg_dump -U bloom_user bloom_iq > backup.sql

# Restore database
docker-compose exec -T postgres psql -U bloom_user bloom_iq < backup.sql
```

### Clean Up

```bash
# Stop services
docker-compose down

# Remove volumes (WARNING: deletes data)
docker-compose down -v

# Remove images
docker-compose down --rmi all
```

## Troubleshooting

### AI Model Not Starting

Check if Docker Compose version supports AI models:
```bash
docker-compose version
# Must be v2.38.0 or later
```

Update Docker Desktop to latest version if needed.

### Out of Memory

Reduce model size or increase Docker memory:
1. Docker Desktop → Settings → Resources
2. Increase Memory to 8GB+

Or use a smaller model:
```yaml
models:
  ai_model:
    model: ai/gemma2:2b  # Smaller model
```

### Database Connection Issues

Check PostgreSQL is healthy:
```bash
docker-compose ps postgres
# Should show "Up (healthy)"

# Test connection
docker-compose exec postgres psql -U bloom_user -d bloom_iq -c "SELECT 1"
```

### Port Conflicts

If port 3000 or 5432 is in use:

```yaml
services:
  bloom-iq-app:
    ports:
      - "3001:3000"  # Change external port
  
  postgres:
    ports:
      - "5433:5432"  # Change external port
```

Update `DATABASE_URL` in `.env.local` accordingly.

## Production Deployment

### Security Checklist

- [ ] Change default PostgreSQL password
- [ ] Set strong `NEXTAUTH_SECRET`
- [ ] Use environment-specific `.env` files
- [ ] Enable HTTPS/TLS
- [ ] Restrict database access
- [ ] Set up regular backups
- [ ] Monitor resource usage

### Environment Variables

```env
# Production settings
NODE_ENV=production
DATABASE_URL=postgresql://secure_user:strong_password@postgres:5432/bloom_iq
NEXTAUTH_SECRET=production-secret-min-32-chars
NEXTAUTH_URL=https://your-domain.com
```

### Resource Limits

Add resource limits in `docker-compose.yaml`:

```yaml
services:
  bloom-iq-app:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 4G
        reservations:
          cpus: '1'
          memory: 2G
```

## Monitoring

### Health Checks

```bash
# Check all services
docker-compose ps

# Check app health
curl http://localhost:3000/api/health

# Check database
docker-compose exec postgres pg_isready -U bloom_user
```

### Resource Usage

```bash
# Monitor resource usage
docker stats
```

## Support

For issues and questions:
- **Documentation**: [DOCKER_MODEL_RUNNER_SETUP.md](./DOCKER_MODEL_RUNNER_SETUP.md)
- **Docker AI Docs**: https://docs.docker.com/ai/compose/models-and-compose/
- **GitHub Issues**: Create an issue in the repository
