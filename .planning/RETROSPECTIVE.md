# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.0 — Refactoring & Clean Up

**Shipped:** 2026-05-18  
**Phases:** 3 | **Plans:** 10 | **Sessions:** 1

### What Was Built
- Clean TypeScript directory reorganization and purging of unused files and dependencies.
- Integration of ESLint Flat Config 9+ and strict TS compiler flag verification.
- Multi-key round-robin Gemini API key rotation and exponential backoff retry handler (`withRetryAndRotation`).
- Layered Redis database cache and RAM conversation fallback caching (`RedisCacheManager` -> `ConversationManager`).
- Console-only Winston logger for clean native PM2 monitoring.

### What Worked
- **Decoupled features:** Modularizing components (like caching layers) kept the codebase clean and made E2E wiring simple.
- **Strict lint checking:** Enforcing ESLint rules from the beginning prevented typical ESM/TS runtime bugs.
- **Fail-safe Redis fallback:** The Redis cache client's non-blocking fallback avoids locking when the database is offline.

### What Was Inefficient
- **Monolithic structures:** Refactoring the massive `mentionHandler.ts` and `welcomeHandler.ts` files was time-consuming due to the lack of early decomposition.
- **Manual Zip Backups:** Zip backup creation in the updater logic originally introduced AdmZip version mismatch issues which had to be discarded.

### Patterns Established
- **Multi-key resilient managers:** A round-robin API manager paired with backoff is now the standard pattern for conversational features.
- **Layered storage managers:** RAM cache as primary with non-blocking async synchronization to Redis database.

### Key Lessons
1. **Refactor early:** Break down large event listeners into isolated helpers before they grow into unmaintainable monoliths.
2. **Resilience wrapper:** High-throughput chat integration requires resilient rate-limiting fallbacks.

### Cost Observations
- Model mix: 100% Antigravity (Gemini 2.5)
- Sessions: 1
- Cumulative quality: 100% strict type safety and zero ESLint errors or warnings.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | 1 | 3 | Unified GSD planning structure and strict TypeScript compilation |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.0 | N/A | N/A | Removed 5 dependencies; added 1 (ioredis) |

### Top Lessons (Verified Across Milestones)

1. Deconstruction of monoliths keeps codebase maintaining cost low.
2. Safe database fallbacks prevent runtime crashes when external services go offline.
