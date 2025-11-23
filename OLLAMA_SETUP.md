# Ollama Setup Guide for BloomIQ

BloomIQ uses Ollama for local AI model execution. This guide will help you set up Ollama with the gemma3:4b model.

## Prerequisites

- Windows/macOS/Linux
- At least 8GB RAM (16GB recommended for larger models)
- ~5GB disk space for gemma3:4b model

## Installation

### Windows
1. Download Ollama from https://ollama.com/download
2. Run the installer
3. Ollama will automatically start and run on `http://localhost:11434`

### macOS
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

### Linux
```bash
curl -fsSL https://ollama.com/install.sh | sh
```

## Download gemma3:4b Model

After installation, pull the gemma3:4b model:

```bash
ollama pull gemma3:4b
```

This will download the model (~2.5GB). Wait for it to complete.

## Verify Installation

1. Check if Ollama is running:
```bash
curl http://localhost:11434
```
You should see: `Ollama is running`

2. List installed models:
```bash
ollama list
```
You should see `gemma3:4b` in the list.

3. Test the model:
```bash
ollama run gemma3:4b "Hello, how are you?"
```

## Configure BloomIQ

1. Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

2. Update the `.env.local` file with your settings:
```env
# Database (local development)
DATABASE_URL="postgresql://bloom_user:bloom_password@localhost:5432/bloom_iq"
DIRECT_URL="postgresql://bloom_user:bloom_password@localhost:5432/bloom_iq"

# Ollama Configuration
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_MODEL="gemma3:4b"

# NextAuth
NEXTAUTH_SECRET="your-super-secret-key-min-32-chars-change-this"
NEXTAUTH_URL="http://localhost:3000"

NODE_ENV="development"
```

3. Generate a secure NextAuth secret:
```bash
openssl rand -base64 32
```
Copy the output and replace `NEXTAUTH_SECRET` value in `.env.local`

## Start the Application

1. **Start PostgreSQL** (Docker):
```bash
docker compose up -d
```

2. **Push database schema**:
```bash
bunx prisma db push
```

3. **Start the development server**:
```bash
bun dev
```

4. Open http://localhost:3000

## Alternative Models

If you want to try different models, you can pull and use them:

```bash
# Faster, smaller models
ollama pull llama3.2:1b
ollama pull gemma2:2b

# More powerful models (require more RAM)
ollama pull llama3.1:8b
ollama pull mistral:7b
ollama pull qwen2.5:7b
```

Update `.env.local`:
```env
OLLAMA_MODEL="llama3.1:8b"
```

## Troubleshooting

### Ollama not running
- **Windows**: Check if Ollama is running in system tray
- **macOS/Linux**: Run `ollama serve` manually

### Model not found
```bash
ollama pull gemma3:4b
```

### Connection refused
- Ensure Ollama is running on port 11434
- Check firewall settings
- Verify with: `curl http://localhost:11434`

### Out of memory errors
- Use a smaller model (gemma2:2b or llama3.2:1b)
- Close other applications
- Increase system swap/page file

## Performance Tips

1. **First run is slower**: Model loads into memory on first request
2. **Keep Ollama running**: Prevents model reload delays
3. **GPU acceleration**: Ollama automatically uses GPU if available (CUDA/Metal)
4. **Adjust context size**: Larger context = more memory usage

## Model Comparison

| Model | Size | RAM Required | Speed | Quality |
|-------|------|--------------|-------|---------|
| gemma3:4b | 2.5GB | 8GB | Fast | Good |
| llama3.2:3b | 2GB | 6GB | Faster | Good |
| llama3.1:8b | 4.7GB | 12GB | Medium | Excellent |
| mistral:7b | 4.1GB | 10GB | Medium | Excellent |
| gemma2:2b | 1.6GB | 4GB | Very Fast | Fair |

## API Reference

Ollama API documentation: https://github.com/ollama/ollama/blob/main/docs/api.md

BloomIQ uses the `/api/generate` endpoint for question generation.

## Support

- Ollama Issues: https://github.com/ollama/ollama/issues
- BloomIQ Issues: [Your repository issues page]
