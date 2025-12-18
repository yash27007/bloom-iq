#!/bin/bash

# BloomIQ Deployment Script
# This script helps deploy the application using Docker

set -e

echo "🚀 BloomIQ Deployment Script"
echo "=============================="

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if .env file exists
if [ ! -f .env.production ]; then
    echo -e "${YELLOW}⚠️  .env.production not found${NC}"
    echo "Creating .env.production from template..."
    cat > .env.production << EOF
# Database
POSTGRES_PASSWORD=change_this_secure_password
DATABASE_URL=postgresql://bloom_user:change_this_secure_password@postgres:5432/bloom_iq
DIRECT_URL=postgresql://bloom_user:change_this_secure_password@postgres:5432/bloom_iq

# Authentication
NEXTAUTH_SECRET=change-this-to-a-random-32-character-string
NEXTAUTH_URL=http://localhost:3000

# AI Configuration
OLLAMA_BASE_URL=http://ollama:11434
OLLAMA_URL=http://ollama:11434
OLLAMA_MODEL=mistral:7b
AI_PROVIDER=OLLAMA
DEFAULT_AI_MODEL=mistral:7b

# Vector Database
CHROMA_URL=http://chromadb:8000
CHROMA_COLLECTION=material_chunks
EOF
    echo -e "${YELLOW}⚠️  Please edit .env.production with your actual values before continuing!${NC}"
    echo "Press Enter to continue after editing..."
    read
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker is running${NC}"

# Check if Docker Compose is available
if ! command -v docker compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed. Please install it and try again.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker Compose is available${NC}"

# Build the application
echo ""
echo "📦 Building application..."
docker compose build --no-cache

# Start services
echo ""
echo "🚀 Starting services..."
docker compose up -d

# Wait for services to be healthy
echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check service status
echo ""
echo "📊 Service Status:"
docker compose ps

# Run database migrations
echo ""
echo "🗄️  Running database migrations..."
docker compose exec -T app bunx prisma generate || echo "⚠️  Prisma generate failed, continuing..."
docker compose exec -T app bunx prisma db push || echo "⚠️  Database push failed, check logs"

# Pull Ollama model
echo ""
echo "🤖 Pulling Ollama model (this may take a while)..."
docker compose exec -d ollama ollama pull mistral:7b || echo "⚠️  Model pull failed, you can pull it manually later"

# Display URLs
echo ""
echo -e "${GREEN}✅ Deployment complete!${NC}"
echo ""
echo "📍 Service URLs:"
echo "   - Application: http://localhost:3000"
echo "   - Ollama: http://localhost:11434"
echo "   - ChromaDB: http://localhost:8000"
echo "   - PostgreSQL: localhost:5432"
echo ""
echo "📝 Next steps:"
echo "   1. Check logs: docker compose logs -f"
echo "   2. Access the app: http://localhost:3000"
echo "   3. Run seed (optional): docker compose exec app bunx prisma db seed"
echo ""
echo "🔍 To check if Ollama model is ready:"
echo "   docker compose exec ollama ollama list"
echo ""

