# Environment Variables Setup Guide

## 🚀 Quick Start for Vercel Deployment

### 1. Database Setup (Neon - Recommended)

1. Go to [neon.tech](https://neon.tech) and create a free account
2. Create a new project
3. Copy your connection string and update:

```env
DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/bloom_iq?sslmode=require
DIRECT_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/bloom_iq?sslmode=require
```

### 2. AI Provider (Gemini - Recommended for Vercel)

```env
AI_PROVIDER=GEMINI
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```

### 3. Authentication

```env
NEXTAUTH_SECRET=generate-a-random-32-char-string
NEXTAUTH_URL=https://your-app.vercel.app
```

---

## 🔄 Round-Robin API Keys (Avoid Rate Limits)

When using free Gemini API keys, you may hit rate limits during testing.
The app supports **round-robin rotation** through multiple API keys automatically!

### How to Set Up Multiple Keys

Add multiple Gemini API keys to your environment:

```env
# Primary key
GEMINI_API_KEY=AIzaSy...your_first_key

# Additional keys (1-10 supported)
GEMINI_API_KEY_1=AIzaSy...your_second_key
GEMINI_API_KEY_2=AIzaSy...your_third_key
GEMINI_API_KEY_3=AIzaSy...your_fourth_key
```

### How It Works

1. The app automatically rotates through all configured keys
2. When a key hits a rate limit, it's temporarily cooled down (60 seconds)
3. The next available key is used
4. This allows uninterrupted testing with free tier keys

### Tips for Free Tier Keys

- Create multiple Google accounts (or use different Google Workspace accounts)
- Get an API key from each: https://aistudio.google.com/app/apikey
- Add all keys to your `.env` file
- The more keys, the better the rate limit handling

---

## 🖥️ Local Development Setup

### Option A: Using Neon DB (Easiest)
Just use your Neon DB connection string locally too.

### Option B: Using Docker (Local PostgreSQL)

```bash
# Start PostgreSQL only (no ChromaDB needed!)
docker compose -f docker-compose.dev.yml up -d

# Then use these in .env:
DATABASE_URL=postgresql://bloom_user:bloom_password@localhost:5432/bloom_iq
DIRECT_URL=postgresql://bloom_user:bloom_password@localhost:5432/bloom_iq
```

> **Note**: Vector embeddings are stored directly in PostgreSQL using the `Float[]` type.
> No separate vector database (like ChromaDB) is needed!

---

## Complete .env Template

Here's a complete `.env` file template with all options:

```env
# ============================================
# DATABASE CONFIGURATION
# ============================================
# For local development with Docker:
DATABASE_URL=postgresql://bloom_user:bloom_password@localhost:5432/bloom_iq
DIRECT_URL=postgresql://bloom_user:bloom_password@localhost:5432/bloom_iq

# For Vercel with Neon DB:
# DATABASE_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/bloom_iq?sslmode=require
# DIRECT_URL=postgresql://user:pass@ep-xxx.us-east-2.aws.neon.tech/bloom_iq?sslmode=require

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
# GEMINI CONFIGURATION (Recommended for Vercel)
# ============================================
# Get API key from: https://aistudio.google.com/app/apikey
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# Optional: Additional keys for round-robin rotation (avoids rate limits)
# GEMINI_API_KEY_1=another_key_here
# GEMINI_API_KEY_2=another_key_here
# GEMINI_API_KEY_3=another_key_here

# Available Gemini models:
# - gemini-2.5-flash (fast, recommended)
# - gemini-2.5-pro (high quality)
# - gemini-2.0-flash (fastest)
# - gemini-1.5-pro (long context)
# - gemini-1.5-flash (balanced)

# ============================================
# OLLAMA CONFIGURATION (Local Development Only)
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
DEFAULT_AI_MODEL=gemini-2.5-flash
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

## Switching Between Providers

### Method 1: Edit .env File

1. Open your `.env` file
2. Change `AI_PROVIDER`:
   - For Gemini: `AI_PROVIDER=GEMINI`
   - For Ollama: `AI_PROVIDER=OLLAMA`
3. Add/update the corresponding API key or URL
4. Restart your development server

### Method 2: UI Toggle (Recommended)

The app includes a UI toggle on the:
- Generate Questions page
- Chat with PDF page
- Validate Question Paper page

You can switch providers directly from the interface!

## Verification

After configuring, verify your setup:

```bash
# Check if Gemini is configured
grep AI_PROVIDER .env
grep GEMINI_API_KEY .env

# Check if Ollama is configured (local dev)
grep OLLAMA_URL .env
```

## Common Issues

### Issue: "GEMINI_API_KEY is required"
**Solution**: Add your Gemini API key to `.env`:
```env
GEMINI_API_KEY=your_key_here
```

### Issue: Rate limit errors with Gemini
**Solution**: Add multiple API keys for round-robin rotation:
```env
GEMINI_API_KEY=key1
GEMINI_API_KEY_1=key2
GEMINI_API_KEY_2=key3
```

### Issue: "Connection refused" (Ollama)
**Solution**: Make sure Ollama is running:
```bash
# Check if Ollama is running
curl http://localhost:11434

# Start Ollama manually
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

## Vercel Environment Variables

When deploying to Vercel:

1. Go to your project settings
2. Navigate to "Environment Variables"
3. Add these variables:
   - `DATABASE_URL` (from Neon)
   - `DIRECT_URL` (from Neon)
   - `NEXTAUTH_SECRET` (generate a secure random string)
   - `NEXTAUTH_URL` (your Vercel URL, e.g., https://yourapp.vercel.app)
   - `AI_PROVIDER` (set to `GEMINI`)
   - `GEMINI_API_KEY` (your primary key)
   - `GEMINI_API_KEY_1`, `GEMINI_API_KEY_2`, etc. (additional keys for rotation)
   - `GEMINI_MODEL` (optional, defaults to `gemini-2.5-flash`)

## Testing Your Configuration

After setting up, test with:

```bash
# Start the app
bun run dev

# Try generating questions or validating a question paper
# The app will use the configured provider automatically
```
