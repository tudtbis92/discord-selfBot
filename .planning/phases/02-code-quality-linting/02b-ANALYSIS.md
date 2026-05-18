# Plan 02b - TypeScript Strict Flags Error Catalog

**Run Date:** 2026-05-18
**Compiler Command:** `npx tsc --noEmit`
**Total Compiler Errors:** 30

---

## 1. Error Classification & Strategy

| Error Code | Description | Count | Strategy |
|------------|-------------|-------|----------|
| **TS6133** | Variable/parameter declared but never read | 21 | Remove unused variables/imports, or prefix unused parameters with `_` to preserve required signatures. |
| **TS7030** | Not all code paths return a value | 8 | Add explicit `return;` or `return undefined;` to guarantee all paths return. |
| **TS6192** | All imports in import declaration are unused | 1 | Clean up and remove the unused import line. |

---

## 2. Detailed Error Catalog by File

### src/commands/chat.ts (2 errors)
- `line 4, col 39`: `'safeGeminiCall'` is declared but never read. (TS6133)
  - *Fix:* Remove `'safeGeminiCall'` import.
- `line 9, col 11`: Not all code paths return a value. (TS7030)
  - *Fix:* Add explicit `return;` or handle the missing code paths.

### src/commands/config.ts (3 errors)
- `line 7, col 15/22/34`: `'agent'`, `'message'`, `'args'` are declared but never read. (TS6133)
  - *Fix:* Prefix unused command callback arguments with `_`.

### src/commands/joinv.ts & joinv2.ts (4 errors)
- `TS7030` at command export level: Not all code paths return a value.
  - *Fix:* Ensure all conditional execution branches return a value or add explicit `return;`.
- `TS6133` at `'connection'`: connection is declared but never read.
  - *Fix:* Prefix with `_connection` or remove.

### src/commands/leavev.ts, listv.ts, ping.ts, testvoice.ts, voiceinfo.ts (7 errors)
- Unused parameters (`args`, `agent`, `index`) → prefix with `_`.
- Not all code paths return a value → add explicit `return;`.

### src/feats/autoChat.ts (6 errors)
- `line 2`: Unused imports. (TS6192)
  - *Fix:* Remove.
- `line 11`: `'lastBotMessageCheckTime'` is declared but never read. (TS6133)
  - *Fix:* Remove local variable if dead code.
- Unused functions/locals: `'getLastMessage'`, `'getRecentMessages'`, `'buildConversationContext'` are declared but never read.
  - *Fix:* Remove these methods as they were replaced or are dead code since autoChat refactoring in Phase 1.

### src/handler/mentionHandler.ts (1 error)
- `'specificInstruction'` is declared but never read. (TS6133)
  - *Fix:* Remove if not needed, or prefix with `_`.

### src/structures/BaseAgent.ts (3 errors)
- Unused imports `'CollectorFilter'`, `'Message'`. (TS6133)
  - *Fix:* Remove.
- Parameter `'config'` in `run` method is declared but never read. (TS6133)
  - *Fix:* Prefix with `_`.

### src/typings/typings.ts (2 errors)
- Unused imports `'DMChannel'`, `'TextChannel'`. (TS6133)
  - *Fix:* Remove.

---

## 3. Execution Plan
We will fix these systematically directory-by-directory in the upcoming tasks:
- **Task 2:** Fix `src/structures/` and `src/typings/`
- **Task 3:** Fix `src/handler/`
- **Task 4:** Fix `src/feats/`, `src/commands/`, `src/utils/`, and `src/config/`
