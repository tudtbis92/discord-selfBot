---
phase: 04-config-schema-personality-injection
plan: 02
subsystem: ai-service
tags: [gemini, system-instruction, personality-injection, dynamic-regex, discord-js]

# Dependency graph
requires:
  - phase: 04-01
    provides: Configuration interface with autoChatCharacter, autoChatCharacterName, autoChatBotIDs fields + personalities directory
provides:
  - GeminiService.setSystemInstruction() method for dynamic personality injection
  - Dynamic cleanResponse() using characterName-based regex instead of hardcoded pattern
  - BaseAgent.onReady() personality file loading with path traversal validation
  - Bot display name resolution via Discord API for mention mapping in system instruction
affects: [04-03, 05-autochat-trigger, 06-conversation-history]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Dynamic regex construction from config parameter for prefix stripping"
    - "ESM __dirname via fileURLToPath for path resolution"
    - "Graceful feature disable on missing resource (no crash)"
    - "Singleton service with settable instance state via initialization method"

key-files:
  created: []
  modified:
    - src/structures/GeminiService.ts
    - src/structures/BaseAgent.ts

key-decisions:
  - "Kept HUONG_PERSONALITY_INSTRUCTION and HUONG_INITIAL_GREETING constants for backward compatibility in chatAsDiscordBot()"
  - "Used geminiService singleton import (not instance method) since each PM2 process = 1 bot = 1 BaseAgent"
  - "Path traversal validation uses /^[a-zA-Z0-9._-]+$/ regex before fs.readFileSync"

patterns-established:
  - "Pattern 1: setSystemInstruction() initializes singleton state at startup, used by all subsequent API calls"
  - "Pattern 2: Dynamic regex built from escaped characterName replaces hardcoded personality-specific patterns"
  - "Pattern 3: Graceful disable — missing personality file sets autoChat=false, logs error, bot continues running"

requirements-completed:
  - AUTOCHAT-02

# Metrics
duration: 15min
completed: 2026-05-18
---

# Phase 04 Plan 02: Dynamic System Instruction and Personality Injection Summary

**GeminiService accepts dynamic systemInstruction via setSystemInstruction(), cleanResponse() uses characterName-based dynamic regex, BaseAgent.onReady() loads personality files and resolves bot display names at startup**

## Performance

- **Duration:** 15 min
- **Started:** 2026-05-18T06:32:00Z
- **Completed:** 2026-05-18T06:47:00Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- GeminiService now supports per-process dynamic personality injection via `setSystemInstruction(instruction, characterName)`
- `cleanResponse()` builds regex at runtime from `this.characterName` — no hardcoded "Hương" pattern
- `chatAsDiscordBot()` uses `this.systemInstruction` when set, falls back to hardcoded constants for backward compatibility
- BaseAgent.onReady() validates personality filename, loads file, resolves bot names via Discord API, and injects full system instruction
- Missing personality file results in logged error + autoChat disabled (no crash)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add setSystemInstruction() and dynamic cleanResponse()** - `c18c1db` (feat)
2. **Task 2: Wire personality loading and bot name resolution** - `1907c07` (feat)

## Files Created/Modified

- `src/structures/GeminiService.ts` — Added `systemInstruction` and `characterName` private fields, `setSystemInstruction()` method, dynamic regex in `cleanResponse()`, updated `chatAsDiscordBot()` with backward-compatible fallback
- `src/structures/BaseAgent.ts` — Added `node:fs`, `node:path`, `node:url` imports, ESM `__dirname` helper, personality file loading with path traversal validation, bot name resolution via `users.fetch()`, system instruction injection

## Decisions Made

- Kept `HUONG_PERSONALITY_INSTRUCTION` and `HUONG_INITIAL_GREETING` constants in place (per plan spec E) — they remain as backward-compatible fallback in `chatAsDiscordBot()` when `systemInstruction` is empty
- Used `geminiService` singleton import (not a new instance) since each PM2 process runs exactly 1 BaseAgent = 1 bot
- Path traversal validation uses strict alphanumeric + `.-_` regex before any filesystem access

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- ESLint `no-useless-escape` error on `\/` in regex character class — fixed by removing unnecessary forward slash escape (changed `[-\/\\^$*+?.()|[\]{}]` to `[-/\\^$*+?.()|[\]{}]`)

## Self-Check

- [x] `src/structures/GeminiService.ts` contains `private systemInstruction: string = ''`
- [x] `src/structures/GeminiService.ts` contains `private characterName: string = ''`
- [x] `src/structures/GeminiService.ts` contains `public setSystemInstruction(instruction: string, characterName: string): void`
- [x] `cleanResponse()` uses `this.characterName.replace(` for regex escaping
- [x] `cleanResponse()` does NOT contain hardcoded "Hương" in regex
- [x] `chatAsDiscordBot()` uses `this.systemInstruction` when non-empty
- [x] `src/structures/BaseAgent.ts` contains `import fs from 'node:fs'`
- [x] `src/structures/BaseAgent.ts` contains `import path from 'node:path'`
- [x] `src/structures/BaseAgent.ts` contains `import { fileURLToPath } from 'node:url'`
- [x] `src/structures/BaseAgent.ts` contains `import { geminiService } from './GeminiService.js'`
- [x] `onReady()` contains `fs.readFileSync(` with `'utf-8'` encoding
- [x] `onReady()` contains path traversal validation regex
- [x] `onReady()` contains `this.users.fetch(` for bot name resolution
- [x] `onReady()` contains `geminiService.setSystemInstruction(` call
- [x] `onReady()` contains error handler that sets `this.config.autoChat = false`
- [x] `npm run build` (tsc --noEmit) exits with code 0

## Self-Check: PASSED

## Next Phase Readiness

- Personality injection foundation complete — ready for AUTOCHAT-03 (mention/reply-only trigger) in Plan 03
- `src/config/personalities/huong.txt` must exist for any bot with `autoChat: true` and `autoChatCharacter` set
- All 5 bot configs need `autoChatBotIDs` populated for proper mention mapping

---
*Phase: 04-config-schema-personality-injection*
*Completed: 2026-05-18*
