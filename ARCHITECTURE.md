# BloomIQ - Clean Architecture

## Overview

This document describes the clean architecture structure of the BloomIQ application, following separation of concerns and dependency inversion principles.

## Directory Structure

```
src/
├── domain/                    # Domain Layer (Business Logic)
│   ├── entities/             # Domain entities (if needed)
│   └── interfaces/           # Domain interfaces and contracts
│       ├── ai-provider.interface.ts
│       ├── embedding.interface.ts
│       └── repository.interface.ts
│
├── application/              # Application Layer (Use Cases)
│   ├── use-cases/           # Business use cases
│   │   ├── question-generation.use-case.ts
│   │   ├── material-upload.use-case.ts
│   │   └── question-approval.use-case.ts
│   ├── dto/                 # Data Transfer Objects
│   │   ├── question.dto.ts
│   │   ├── material.dto.ts
│   │   └── course.dto.ts
│   └── services/            # Application services (orchestration)
│       ├── question.service.ts
│       ├── material.service.ts
│       └── course.service.ts
│
├── infrastructure/          # Infrastructure Layer (External Dependencies)
│   ├── database/            # Database implementations
│   │   └── prisma/          # Prisma client and migrations
│   ├── external/            # External service integrations
│   │   ├── ai/              # AI provider implementations
│   │   │   ├── ollama-provider.ts
│   │   │   └── prompts/
│   │   ├── embedding/       # Embedding service
│   │   │   └── embedding.service.ts
│   │   └── pdf/             # PDF parsing
│   │       └── pdf-parser.ts
│   └── repositories/        # Data access implementations
│       ├── material.repository.ts
│       ├── question.repository.ts
│       └── course.repository.ts
│
├── presentation/            # Presentation Layer (UI & API)
│   ├── api/                 # API routes and tRPC
│   │   ├── trpc/            # tRPC routers
│   │   └── routes/          # Next.js API routes
│   ├── components/         # React components
│   │   ├── ui/             # UI primitives
│   │   └── features/       # Feature components
│   └── app/                # Next.js app router pages
│
└── shared/                  # Shared utilities
    ├── lib/                # Utility functions
    ├── hooks/              # React hooks
    ├── types/              # Shared TypeScript types
    └── validators/         # Zod validators
```

## Layer Responsibilities

### Domain Layer
- **Purpose**: Core business logic and rules
- **Contains**: Entities, value objects, domain interfaces
- **Dependencies**: None (pure TypeScript)
- **Rules**: 
  - No dependencies on other layers
  - Defines contracts (interfaces) that other layers implement

### Application Layer
- **Purpose**: Orchestrates use cases and business workflows
- **Contains**: Use cases, DTOs, application services
- **Dependencies**: Domain layer only
- **Rules**:
  - Implements domain interfaces
  - Coordinates between infrastructure and domain
  - Contains business logic that spans multiple entities

### Infrastructure Layer
- **Purpose**: Implements external dependencies
- **Contains**: Database, AI providers, PDF parsers, repositories
- **Dependencies**: Domain and Application layers
- **Rules**:
  - Implements domain interfaces
  - Handles all external communication
  - Can be swapped without affecting other layers

### Presentation Layer
- **Purpose**: User interface and API endpoints
- **Contains**: React components, tRPC routers, API routes
- **Dependencies**: Application layer only
- **Rules**:
  - No direct database access
  - Uses application services for business logic
  - Handles user input/output

## Key Principles

1. **Dependency Inversion**: High-level modules don't depend on low-level modules. Both depend on abstractions.

2. **Separation of Concerns**: Each layer has a single, well-defined responsibility.

3. **Testability**: Business logic can be tested without infrastructure dependencies.

4. **Maintainability**: Changes in one layer don't cascade to others.

## Current Migration Status

The codebase is being gradually migrated to this structure. Current organization:

- ✅ Domain interfaces defined
- ✅ Infrastructure services (AI, PDF, Embedding) organized
- ✅ Application services (Question, Material, Course) in place
- ✅ Presentation layer (tRPC routers, components) structured
- 🔄 Repository pattern (in progress)
- 🔄 Use case pattern (in progress)

## File Organization Rules

1. **Services** (`application/services/`): Business logic orchestration
2. **Repositories** (`infrastructure/repositories/`): Data access
3. **Use Cases** (`application/use-cases/`): Single-purpose business operations
4. **DTOs** (`application/dto/`): Data structures for API communication
5. **Interfaces** (`domain/interfaces/`): Contracts between layers

## Environment Variables

See `.env.example` for required configuration:
- Database connection
- Authentication secrets
- Ollama AI configuration
- Embedding model configuration

## Future Improvements

1. Implement repository pattern for all data access
2. Extract use cases from services
3. Add domain events for better decoupling
4. Implement CQRS for complex queries
5. Add comprehensive unit tests for each layer

