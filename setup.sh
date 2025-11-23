#!/bin/bash

# BloomIQ Quick Setup Script
# This script helps you set up BloomIQ with Ollama

set -e

echo "🚀 BloomIQ Quick Setup"
echo "======================"
echo ""

# Check if Ollama is installed
echo "Checking Ollama installation..."
if ! command -v ollama &> /dev/null; then
    echo "❌ Ollama is not installed"
    echo ""
    echo "Please install Ollama first:"
    echo "  - Windows/macOS: https://ollama.com/download"
    echo "  - Linux: curl -fsSL https://ollama.com/install.sh | sh"
    echo ""
    exit 1
fi
echo "✅ Ollama is installed"
echo ""

# Check if Ollama is running
echo "Checking if Ollama is running..."
if ! curl -s http://localhost:11434 > /dev/null; then
    echo "❌ Ollama is not running"
    echo ""
    echo "Please start Ollama:"
    echo "  - Windows: Ollama should auto-start (check system tray)"
    echo "  - macOS/Linux: Run 'ollama serve' in a new terminal"
    echo ""
    exit 1
fi
echo "✅ Ollama is running"
echo ""

# Check if gemma3:4b model is available
echo "Checking for gemma3:4b model..."
if ! ollama list | grep -q "gemma3:4b"; then
    echo "📥 Downloading gemma3:4b model (this may take a few minutes)..."
    ollama pull gemma3:4b
    echo "✅ Model downloaded"
else
    echo "✅ gemma3:4b model is available"
fi
echo ""

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local from .env.example..."
    cp .env.example .env.local
    
    # Generate a random NextAuth secret
    if command -v openssl &> /dev/null; then
        SECRET=$(openssl rand -base64 32)
        sed -i "s/your-super-secret-key-change-this-min-32-chars/$SECRET/" .env.local
        echo "✅ Generated random NEXTAUTH_SECRET"
    else
        echo "⚠️  Please update NEXTAUTH_SECRET in .env.local manually"
    fi
    echo "✅ .env.local created"
else
    echo "✅ .env.local already exists"
fi
echo ""

# Check if Docker is running
echo "Checking Docker..."
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running"
    echo "Please start Docker Desktop and try again"
    exit 1
fi
echo "✅ Docker is running"
echo ""

# Start PostgreSQL
echo "🐘 Starting PostgreSQL..."
docker compose up -d
echo "✅ PostgreSQL started"
echo ""

# Wait for PostgreSQL to be ready
echo "⏳ Waiting for PostgreSQL to be ready..."
sleep 5
echo "✅ PostgreSQL is ready"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
bun install
echo "✅ Dependencies installed"
echo ""

# Setup database
echo "🗄️  Setting up database..."
bunx prisma generate
bunx prisma db push
echo "✅ Database setup complete"
echo ""

echo "✨ Setup complete!"
echo ""
echo "🚀 To start the development server:"
echo "   bun dev"
echo ""
echo "📱 The app will be available at:"
echo "   http://localhost:3000"
echo ""
echo "📚 For more information, see:"
echo "   - OLLAMA_SETUP.md - Detailed Ollama configuration"
echo "   - README.md - Complete project documentation"
echo ""
