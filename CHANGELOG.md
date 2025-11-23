# Changelog

All notable changes to the BloomIQ project will be documented in this file.

## [0.6.0] - 2025-01-XX

### Added

- Comprehensive system prompt following 8 academic requirements for question generation
- Strict Bloom's taxonomy alignment with cognitive level justification
- Three question types: Direct, Problem-based, Scenario-based
- Non-blocking validation system (warnings only, no throws)
- Enhanced JSON parsing with robust sanitization for Ollama responses
- Bloom's justification field for every generated question
- JSDoc documentation for core AI service functions

### Changed

- Updated marks distribution to TWO/EIGHT/SIXTEEN only (removed FOUR)
- Improved Ollama provider with comprehensive field sanitization
- Enhanced error handling and logging throughout AI pipeline
- Question status enum: CREATED_BY_COURSE_COORDINATOR (was APPROVED_BY)
- Removed all emojis from system prompts and codebase
- Updated to production-ready code standards

### Fixed

- JSON parsing errors from Ollama with "Cannot read properties of undefined"
- Marks validation errors with invalid enum values
- QuestionStatus enum validation errors during database save
- Unicode handling in emoji replacement operations

### Removed

- Unnecessary documentation files (UPLOAD_FUNCTIONALITY.md, REFACTORING_SUMMARY.md, etc.)
- Debug console.log statements in production code
- Emoji symbols from system prompts and codebase

## [0.1.0] - Initial Release

### Added

- Basic Next.js application structure
- Prisma ORM with PostgreSQL
- User authentication system
- Course and material management
- Basic question generation with Ollama


