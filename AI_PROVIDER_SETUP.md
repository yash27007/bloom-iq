# AI Provider Setup Guide

BloomIQ supports **both Gemini and Ollama** AI providers. You can easily switch between them using environment variables.

## Quick Switch

### Use Gemini
```env
AI_PROVIDER=GEMINI
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```

### Use Ollama
```env
AI_PROVIDER=OLLAMA
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=mistral:7b
```

## Gemini Setup

### 1. Get API Key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the API key

### 2. Configure Environment

Add to your `.env.local` or `.env.production`:

```env
AI_PROVIDER=GEMINI
GEMINI_API_KEY=your_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```

### 3. Available Gemini Models

| Model | Description | Best For |
|-------|-------------|----------|
| `gemini-2.5-flash` | Fast, efficient | **Recommended** - Fast generation, good quality |
| `gemini-2.5-pro` | High quality | Best quality, slower |
| `gemini-2.0-flash` | Fast, latest | Fastest option |
| `gemini-1.5-pro` | High quality | Long context, detailed answers |
| `gemini-1.5-flash` | Balanced | Good balance of speed and quality |

**Recommended**: `gemini-2.5-flash` for the best balance of speed and quality.

### 4. Test Connection

```bash
# Check if Gemini is working
curl -X POST http://localhost:3000/api/test-ai
```

## Ollama Setup

### 1. Install Ollama

**Windows/macOS**: Download from https://ollama.com/download  
**Linux**: 
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### 2. Pull Model

```bash
# Recommended model
ollama pull mistral:7b

# Or other models
ollama pull gemma3:4b
ollama pull qwen2.5:7b
ollama pull llama3.1:8b
```

### 3. Configure Environment

```env
AI_PROVIDER=OLLAMA
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=mistral:7b
```

### 4. Start Ollama Service

**With Docker** (recommended):
```bash
docker compose up -d ollama
```

**Without Docker**:
```bash
# Ollama should start automatically after installation
# Check if running:
curl http://localhost:11434
```

### 5. Available Ollama Models

| Model | Size | Speed | Quality | RAM Needed |
|-------|------|-------|---------|------------|
| `mistral:7b` | 7B | ⚡ Fast | ⭐⭐⭐⭐ | 8GB | **Recommended** |
| `qwen2.5:7b` | 7B | ⚡ Fast | ⭐⭐⭐⭐ | 8GB |
| `gemma3:4b` | 4B | ⚡⚡ Very Fast | ⭐⭐⭐ | 6GB |
| `llama3.1:8b` | 8B | 🐢 Slower | ⭐⭐⭐⭐⭐ | 12GB |
| `deepseek-r1:8b` | 8B | 🐢 Slower | ⭐⭐⭐⭐⭐ | 12GB |

**Recommended**: `mistral:7b` for best balance.

## Switching Between Providers

### Method 1: Environment Variable (Recommended)

**For Development** (`.env.local`):
```env
# Switch to Gemini
AI_PROVIDER=GEMINI
GEMINI_API_KEY=your_key

# Or switch to Ollama
AI_PROVIDER=OLLAMA
OLLAMA_URL=http://localhost:11434
```

**For Production** (Docker):
```bash
# Edit docker-compose.yml or use .env file
AI_PROVIDER=GEMINI
GEMINI_API_KEY=your_key
```

Then restart:
```bash
docker compose restart app
```

### Method 2: Runtime Configuration

The system automatically detects the provider based on `AI_PROVIDER` environment variable. No code changes needed!

## Comparison

| Feature | Gemini | Ollama |
|---------|--------|--------|
| **Setup** | API key only | Install + model download |
| **Cost** | Pay per use | Free (local) |
| **Speed** | Very Fast | Fast (depends on hardware) |
| **Quality** | Excellent | Good to Excellent |
| **Privacy** | Data sent to Google | 100% Local |
| **Internet** | Required | Not required |
| **Best For** | Production, fast results | Privacy, offline use |

## Recommendation

- **Use Gemini** if:
  - You want the fastest results
  - You don't mind data being sent to Google
  - You have internet connectivity
  - You want the best quality

- **Use Ollama** if:
  - You need 100% privacy (data stays local)
  - You want to work offline
  - You have powerful hardware
  - You want zero API costs

## Using Both

You can configure both providers and switch as needed:

```env
# Both configured
AI_PROVIDER=GEMINI  # Active provider
GEMINI_API_KEY=your_key
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=mistral:7b
```

Then just change `AI_PROVIDER` to switch!

## Troubleshooting

### Gemini Issues

**Error: "GEMINI_API_KEY is required"**
- Check your `.env` file has `GEMINI_API_KEY` set
- Restart the application after adding the key

**Error: "API quota exceeded"**
- Check your Google AI Studio quota
- Wait for quota reset or upgrade plan

**Slow responses**
- Try `gemini-2.5-flash` for faster responses
- Check your internet connection

### Ollama Issues

**Error: "Connection refused"**
- Ensure Ollama is running: `curl http://localhost:11434`
- Start Ollama: `ollama serve` or `docker compose up -d ollama`

**Error: "Model not found"**
- Pull the model: `ollama pull mistral:7b`
- Check model name matches: `ollama list`

**Slow generation**
- Use a smaller model (gemma3:4b)
- Check system resources (RAM, CPU)
- Close other applications

## Validation Feature

The question paper validation feature works with **both providers**:

- **Course Outcome Extraction**: Uses configured provider
- **Question Analysis**: Uses configured provider
- **AI Fallback**: Automatically uses the active provider

No additional configuration needed!

## Production Deployment

### Docker with Gemini

```yaml
environment:
  - AI_PROVIDER=GEMINI
  - GEMINI_API_KEY=${GEMINI_API_KEY}
  - GEMINI_MODEL=gemini-2.5-flash
```

### Docker with Ollama

```yaml
environment:
  - AI_PROVIDER=OLLAMA
  - OLLAMA_URL=http://ollama:11434
  - OLLAMA_MODEL=mistral:7b
```

Make sure Ollama service is included in `docker-compose.yml`.

## Testing

Test your provider:

```bash
# Test Gemini
AI_PROVIDER=GEMINI GEMINI_API_KEY=your_key bun run dev

# Test Ollama
AI_PROVIDER=OLLAMA bun run dev
```

Then try generating questions or validating a question paper!

