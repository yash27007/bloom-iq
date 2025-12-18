# Environment Variables Setup Guide

## Quick Configuration for Gemini

To use Gemini, update your `.env` file with these settings:

```env
# Switch to Gemini
AI_PROVIDER=GEMINI

# Add your Gemini API key (get it from https://aistudio.google.com/app/apikey)
GEMINI_API_KEY=your_api_key_here

# Optional: Choose Gemini model (default: gemini-2.5-flash)
GEMINI_MODEL=gemini-2.5-flash
```

## Quick Configuration for Ollama

To use Ollama, update your `.env` file with these settings:

```env
# Switch to Ollama
AI_PROVIDER=OLLAMA

# Ollama URL (default: http://localhost:11434)
OLLAMA_URL=http://localhost:11434
OLLAMA_BASE_URL=http://localhost:11434

# Choose Ollama model (default: mistral:7b)
OLLAMA_MODEL=mistral:7b
```

## Complete .env Template

Here's a complete `.env` file template with all options:

```env
# ============================================
# DATABASE CONFIGURATION
# ============================================
DATABASE_URL=postgresql://bloom_user:bloom_password@localhost:5432/bloom_iq
DIRECT_URL=postgresql://bloom_user:bloom_password@localhost:5432/bloom_iq

# ============================================
# AUTHENTICATION
# ============================================
NEXTAUTH_SECRET=your-super-secret-key-change-this-minimum-32-characters
NEXTAUTH_URL=http://localhost:3000

# ============================================
# AI PROVIDER CONFIGURATION
# ============================================
# Choose: "GEMINI" or "OLLAMA"
AI_PROVIDER=GEMINI

# ============================================
# GEMINI CONFIGURATION
# ============================================
# Get API key from: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# Available Gemini models:
# - gemini-2.5-flash (fast, recommended)
# - gemini-2.5-pro (high quality)
# - gemini-2.0-flash (fastest)
# - gemini-1.5-pro (long context)
# - gemini-1.5-flash (balanced)

# ============================================
# OLLAMA CONFIGURATION
# ============================================
# Only needed if AI_PROVIDER=OLLAMA
OLLAMA_URL=http://localhost:11434
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=mistral:7b
OLLAMA_EMBEDDING_MODEL=nomic-embed-text:v1.5

# Available Ollama models:
# - mistral:7b (recommended - fast, good quality)
# - qwen2.5:7b (fast, excellent quality)
# - gemma3:4b (very fast, lower quality)
# - llama3.1:8b (high quality, slower)
# - deepseek-r1:8b (excellent reasoning)

# ============================================
# DEFAULT AI MODEL (FALLBACK)
# ============================================
DEFAULT_AI_MODEL=mistral:7b

# ============================================
# VECTOR DATABASE (CHROMADB)
# ============================================
CHROMA_URL=http://localhost:8000
CHROMA_COLLECTION=material_chunks
```

## Switching Between Providers

### Method 1: Edit .env File

1. Open your `.env` file
2. Change `AI_PROVIDER`:
   - For Gemini: `AI_PROVIDER=GEMINI`
   - For Ollama: `AI_PROVIDER=OLLAMA`
3. Add/update the corresponding API key or URL
4. Restart your development server

### Method 2: Use Different Files

**For Development (Gemini)**:
```bash
# Create .env.local
cp .env .env.local
# Edit .env.local and set AI_PROVIDER=GEMINI
```

**For Production (Ollama)**:
```bash
# Use .env.production
cp .env .env.production
# Edit .env.production and set AI_PROVIDER=OLLAMA
```

## Getting Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the key
5. Add it to your `.env` file:
   ```env
   GEMINI_API_KEY=your_copied_key_here
   ```

## Verification

After configuring, verify your setup:

```bash
# Check if Gemini is configured
grep AI_PROVIDER .env
grep GEMINI_API_KEY .env

# Check if Ollama is configured
grep OLLAMA_URL .env
```

## Common Issues

### Issue: "GEMINI_API_KEY is required"
**Solution**: Add your Gemini API key to `.env`:
```env
GEMINI_API_KEY=your_key_here
```

### Issue: "Connection refused" (Ollama)
**Solution**: Make sure Ollama is running:
```bash
# Check if Ollama is running
curl http://localhost:11434

# Start Ollama (if using Docker)
docker compose up -d ollama

# Or start Ollama manually
ollama serve
```

### Issue: Provider not switching
**Solution**: 
1. Make sure `.env` file is in the root directory
2. Restart your development server after changing `.env`
3. Check for typos in `AI_PROVIDER` (should be "GEMINI" or "OLLAMA")

## Environment Variable Priority

The system checks environment variables in this order:
1. `.env.local` (highest priority, gitignored)
2. `.env.production` (for production builds)
3. `.env` (default, should be gitignored)
4. System environment variables

## Security Notes

⚠️ **Never commit `.env` files to git!**

- `.env` should be in `.gitignore`
- Use `.env.example` for templates
- Use `.env.local` for local development
- Use `.env.production` for production (keep secure)

## Testing Your Configuration

After setting up, test with:

```bash
# Start the app
bun run dev

# Try generating questions or validating a question paper
# The app will use the configured provider automatically
```

