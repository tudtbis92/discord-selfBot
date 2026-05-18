# Conventions

**Date:** 2026-05-18

## Code Style
- **TypeScript:** Strict typing used across the project (`src/typings/typings.ts`). Interfaces are used for configuration shapes.
- **Module System:** Uses ES modules (`"type": "module"` in `package.json`). Imports specify `.js` extensions even for local files (e.g., `import { logger } from "./src/utils/logger.js"` in `index.ts`).
- **Object-Oriented + Functional:** Core states are managed in classes (`BaseAgent`), while features/handlers might be more functional/event-driven.

## Error Handling
- Global `unhandledRejection` and `uncaughtException` handlers are registered in `index.ts` to log via the custom `winston` logger without crashing abruptly.
- Error logging is done through `logger.error()`, categorizing issues (e.g., "runtime").

## Naming
- **Files/Directories:** camelCase generally, with some PascalCase for classes (`BaseAgent.ts`, `ConversationManager.ts`, `Inquirer.ts`).
- **Variables/Functions:** camelCase. Classes are PascalCase.
