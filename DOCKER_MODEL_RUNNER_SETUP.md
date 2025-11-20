# Docker Model Runner Setup Guide

## Overview

bloom-iq uses **Docker Model Runner** for AI-powered question generation. This provides a clean, plug-and-play architecture with support for multiple open-source LLMs from Docker Hub.

**API Reference**: https://docs.docker.com/ai/model-runner/api-reference/  
**Available Models**: https://hub.docker.com/u/ai

## Supported Models (Latest 2024-2025)

All models from https://hub.docker.com/u/ai are supported. **Currently using: ai/llama3.2:3b**

### Recommended Models (by use case):

**Fast & Efficient (Best for most users):**
- **ai/llama3.2:3b** ⭐ (CURRENT) - Meta's Llama 3.2, 3B params, excellent balance
- **ai/phi3:3.8b** - Microsoft Phi-3, efficient and fast
- **ai/llama3.2:1b** - Smallest, fastest, lower quality

**High Quality (Requires more RAM):**
- **ai/gemma2:9b** - Google's Gemma 2, 9B params, superior quality
- **ai/llama3.1:8b** - Meta's Llama 3.1, 8B params, excellent reasoning
- **ai/mistral:7b** - Mistral AI's 7B, great instruction following

**Specialized:**
- **ai/llama3.2-vision:11b** - With vision capabilities (for image analysis)
- **ai/mistral:nemo** - Mistral Nemo 12B (multilingual support)
- **ai/qwen2.5:7b** - Alibaba's Qwen 2.5 (strong coding abilities)

## Quick Start

### 1. Define Models in docker-compose.yaml

Docker Compose v2.38+ has built-in support for AI models:

```yaml
services:
  bloom-iq-app:
    build: .
    models:
      ai_model:
        endpoint_var: AI_MODEL_URL
        model_var: AI_MODEL_NAME

models:
  ai_model:
    model: ai/llama3.2:3b
    context_size: 131072
    runtime_flags:
      - "--temp"
      - "0.7"
      - "--top-p"
      - "0.9"
      - "--threads"
      - "8"
```

### 2. Start Docker Services

```bash
# Start all services (PostgreSQL + AI Model + App)
docker-compose up -d

# Check container status
docker-compose ps
```

Docker will automatically:
- Pull the specified AI model (`ai/gemma2:2b`)
- Start the model runner
- Inject environment variables into your app:
  - `AI_MODEL_URL` - Endpoint to access the model
  - `AI_MODEL_NAME` - Model identifier

### 3. Configure Environment

The model URL and name are automatically injected by Docker Compose. Just set:

```env
# .env.local
DATABASE_URL=postgresql://bloom_user:bloom_password@postgres:5432/bloom_iq
```

### 4. Test Connection

```bash
# Check model availability
echo $AI_MODEL_URL  # Should show model endpoint

# Test via curl (URL provided by Docker)
curl $AI_MODEL_URL/api/tags
```

## Usage in Code

### Basic Question Generation

```typescript
import { dockerModelRunner } from "@/services/docker-model-runner.service";

const questions = await dockerModelRunner.generateQuestions({
  materialContent: parsedPDFContent,
  courseName: "Data Structures",
  materialName: "Unit 1 - Arrays and Linked Lists",
  unit: 1,
  questionCounts: {
    easy: 5,
    medium: 3,
    hard: 2,
  },
  bloomLevels: {
    remember: 2,
    understand: 3,
    apply: 3,
    analyze: 1,
    evaluate: 1,
    create: 0,
  },
  questionTypes: {
    direct: 4,
    indirect: 3,
    scenarioBased: 2,
    problemBased: 1,
  },
});
```

### Switch Models

To use a different model, update your `docker-compose.yaml`:

```yaml
models:
  ai_model:
    model: ai/mistral:7b  # Changed from gemma2:2b
    context_size: 32768   # Mistral supports larger context
    runtime_flags:
      - "--temp"
      - "0.7"
```

Then restart:
```bash
docker-compose down
docker-compose up -d
```

### Test Connection

```typescript
const isConnected = await dockerModelRunner.testConnection();
if (!isConnected) {
  console.error("Model Runner is not accessible");
}

// List available models
const models = await dockerModelRunner.listAvailableModels();
console.log("Available models:", models);
```

## Architecture Benefits

### ✅ Clean Separation of Concerns
- Service layer handles all LLM communication
- Business logic separated from API details
- Easy to mock for testing

### ✅ Plug-and-Play Model Swapping
```typescript
// Switch between models with one line
dockerModelRunner.switchModel(SUPPORTED_MODELS.MISTRAL_7B);
```

### ✅ Content Chunking Built-In
- Automatically chunks large PDFs to fit context windows
- Distributes questions across chunks
- No manual token counting needed

### ✅ Type-Safe
- Full TypeScript support
- Validated response structures
- Compile-time error checking

### ✅ Error Handling
- Graceful fallbacks
- Detailed error logging
- Connection retry logic

## Model Comparison

| Model | Parameters | Context Window | Speed | Quality | Use Case |
|-------|-----------|---------------|-------|---------|----------|
| **ai/gemma2:2b** | 2B | 8K tokens | Very Fast | Good | **Recommended** - Fast, efficient, low resource |
| **ai/gemma2:9b** | 9B | 8K tokens | Medium | Excellent | High-quality questions, better reasoning |
| **ai/llama3.2:3b** | 3B | 128K tokens | Fast | Very Good | Long context, balanced performance |
| **ai/llama3.2:1b** | 1B | 128K tokens | Very Fast | Good | Ultra-fast, resource-constrained environments |
| **ai/mistral:7b** | 7B | 32K tokens | Medium | Excellent | Industry standard, reliable |
| **ai/mistral:nemo** | 12B | 128K tokens | Slow | Outstanding | Best quality, long documents |
| **ai/phi3.5:latest** | 3.8B | 128K tokens | Fast | Very Good | Microsoft model, good for technical content |
| **ai/llama3.2-vision:11b** | 11B | 128K tokens | Slow | Excellent | Vision + text, multimodal capabilities |

## Production Deployment

### Scaling Ollama

```yaml
# docker-compose.prod.yaml
services:
  ollama:
    image: ollama/ollama:latest
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: '4'
          memory: 8G
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

### GPU Acceleration (NVIDIA)

```bash
# Install NVIDIA Container Toolkit
# https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html

# Run with GPU support
docker run -d --gpus=all -p 11434:11434 --name ollama ollama/ollama
```

### Environment Variables

```env
# Production
MODEL_RUNNER_URL=https://ollama.yourdomain.com

# Development
MODEL_RUNNER_URL=http://localhost:11434
```

## Troubleshooting

### Model Runner Not Accessible

```bash
# Check if Ollama is running
docker-compose ps

# Restart the service
docker-compose restart ollama

# Check logs
docker-compose logs ollama
```

### Model Not Found

```bash
# List installed models
docker exec -it bloom-iq-ollama ollama list

# Pull missing model
docker exec -it bloom-iq-ollama ollama pull gemma3:4b
```

### Out of Memory

```bash
# Use a smaller model
docker exec -it bloom-iq-ollama ollama pull phi3:mini

# Or increase Docker memory limit (Docker Desktop → Settings → Resources)
```

### Slow Generation

- Use GPU acceleration (see Production Deployment)
- Switch to a smaller model (phi3:mini)
- Reduce `maxTokens` in service configuration
- Enable parallel processing for multiple materials

## API Reference

### Docker Model Runner Service

```typescript
class DockerModelRunnerService {
  constructor(config?: Partial<ModelRunnerConfig>)
  
  switchModel(model: SupportedModel): void
  
  generateQuestions(params: QuestionGenerationParams): Promise<GeneratedQuestion[]>
  
  testConnection(): Promise<boolean>
  
  listAvailableModels(): Promise<string[]>
}
```

### Configuration Options

```typescript
interface ModelRunnerConfig {
  baseUrl: string;           // Default: http://localhost:11434
  model: SupportedModel;     // Default: gemma3:4b
  temperature?: number;      // Default: 0.7 (0.0 - 1.0)
  maxTokens?: number;        // Default: 4096
  topP?: number;             // Default: 0.9 (0.0 - 1.0)
}
```

## Migration from Gemini

### Before (Old Approach)
```typescript
// Hard-coded, vendor-locked
import { GoogleGenerativeAI } from "@google/generative-ai";
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
```

### After (New Approach)
```typescript
// Clean, swappable, self-hosted
import { dockerModelRunner } from "@/services/docker-model-runner.service";
const questions = await dockerModelRunner.generateQuestions(params);
```

### Benefits of Migration
✅ No API costs  
✅ No rate limits  
✅ Full data privacy  
✅ Offline capability  
✅ Model flexibility  

## Next Steps

1. **Pull your preferred model**: `docker exec -it bloom-iq-ollama ollama pull gemma3:4b`
2. **Test the connection**: Use the test endpoints in your code
3. **Generate questions**: Integrate with your material upload workflow
4. **Monitor performance**: Check logs and adjust model/parameters as needed

## Support

- **Ollama Documentation**: https://github.com/ollama/ollama/blob/main/docs/api.md
- **Model Library**: https://ollama.com/library
- **Docker Model Runner**: https://docs.docker.com/ai/model-runner/
