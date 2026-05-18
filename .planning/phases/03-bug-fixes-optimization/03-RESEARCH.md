# Phase 3: Bug Fixes & Optimization — Research

**Researched:** 2026-05-18T11:20:00+07:00
**Status:** Complete
**Phase Requirement IDs:** FIX-01, FIX-02

---

## Research Overview

This research addresses four key areas from the Phase 3 CONTEXT.md decisions:

1. **D-01:** Disable/remove Auto-Farm feature
2. **D-02:** Simplify self-update to Git-only
3. **D-03–D-05:** API key rotation with fallback for Gemini
4. **D-06:** Remove file-based logging (PM2-native strategy)
5. **D-07–D-08:** Redis-based conversation caching with RAM fallback

---

## 1. Auto-Farm Removal (D-01)

### Current State
- The `@2captcha/captcha-solver` package is listed in `package.json` dependencies.
- Captcha-related configuration fields exist in `src/typings/typings.ts`: `captchaService`, `captchaKey`, `captchaRetry`.
- No active auto-farm handler was found in the codebase after Phase 1/2 cleanup, but the dependency and type definitions remain as dead code.

### Recommended Approach
1. **Remove `@2captcha/captcha-solver` from `package.json` dependencies.**
2. **Remove captcha-related fields** from the `Configuration` interface in `src/typings/typings.ts` (lines 44-47: `captchaService`, `captchaKey`, `captchaRetry`).
3. **Grep for any remaining imports** of `@2captcha/captcha-solver` across the codebase and remove them.
4. **Run `npm install`** after removal to update `package-lock.json`.

### Risk Assessment
- **Low risk.** The feature is confirmed unused by the user (D-01 decision). Removing dead code improves maintainability.

---

## 2. Self-Update Simplification — Git-Only (D-02)

### Current State (`src/feats/update.ts`)
- **137 lines** with two update paths:
  - `gitUpdate()` (lines 75-88): Uses `execSync('git stash')`, `execSync('git pull --force')`, `execSync('git reset --hard')`.
  - `manualUpdate()` (lines 90-108): Downloads ZIP from GitHub using `axios`, extracts with `adm-zip`, copies files with `copyDirectory()`.
- `performUpdate()` (lines 60-73): Checks for `.git` directory, tries Git first, falls back to manual.
- Also imports: `AdmZip`, `copyDirectory`, `os`, `path`, `fs`, `axios` (for update check + manual download).
- Uses `@inquirer/prompts` `confirm()` for interactive update prompt.
- `restart()` spawns a new `cmd.exe` process — only works on Windows.

### Recommended Approach

**Keep:**
- `checkUpdate()` — version comparison logic via GitHub raw `package.json` (axios GET).
- `gitUpdate()` — the Git-based update flow.
- `installDependencies()` — runs `npm install` after update.
- `restart()` — spawns new process and exits.

**Remove:**
- `manualUpdate()` method entirely.
- `import AdmZip from 'adm-zip'` and `import { copyDirectory }` imports.
- The `import os from 'node:os'` (only used by `manualUpdate`).
- Fallback logic in `performUpdate()` — if `.git` doesn't exist OR `git --version` fails, **log a warning and skip update** instead of falling back to manual.

**Simplified `performUpdate` logic:**
```
if (!fs.existsSync('.git')) {
  logger.warn('No .git directory found — skipping auto-update. Clone the repo with git to enable auto-updates.');
  return;
}
try {
  execSync('git --version');
} catch {
  logger.warn('Git is not installed — skipping auto-update.');
  return;
}
await this.gitUpdate();
```

**Dependencies to remove from `package.json`:**
- `adm-zip` (production dependency)
- `@types/adm-zip` (dev dependency)

**Verify `copyDirectory` usage:** Check if `src/utils/utils.ts` `copyDirectory()` is used elsewhere. If only used by `manualUpdate`, it becomes dead code — flag for removal.

### Risk Assessment
- **Low risk.** Git-only is the standard deployment method. The ZIP fallback was fragile (could corrupt files mid-extract, no rollback). PM2 handles restart natively, making the manual `restart()` via `cmd.exe` spawn a secondary concern.

---

## 3. Gemini API Key Rotation & Fallback (D-03, D-04, D-05)

### Current State (`src/structures/GeminiService.ts`)
- **620 lines**, singleton pattern via `export const geminiService = new GeminiService()`.
- Single hardcoded API key at line 176: `this.apiKey = 'AIzaSyDu...'`.
- Creates a single `GoogleGenAI` instance in constructor.
- Error handling via `parseGeminiError()` — already detects 429 (rate limit), RESOURCE_EXHAUSTED, RATE_LIMIT_EXCEEDED, network errors, etc.
- No retry logic — errors are thrown immediately to the caller.
- Chat history is stored in `this.chatHistories: Map<string, Array<...>>` (in-memory, per-instance).

### Recommended Architecture

#### 3.1 Configuration Extension (D-03)
Add to `Configuration` interface in `src/typings/typings.ts`:
```typescript
geminiApiKeys?: string[];   // Array of API keys for rotation
geminiApiKey?: string;      // Single key (backward compat, deprecated)
```

The service should resolve keys in priority order:
1. `config.geminiApiKeys` array (if non-empty)
2. `config.geminiApiKey` single key (backward compat)
3. Hardcoded default (current behavior, for development only)

#### 3.2 Round-Robin Key Rotation (D-04)

**Design pattern: `ApiKeyManager` helper class.**

```typescript
class ApiKeyManager {
  private keys: string[];
  private currentIndex: number = 0;
  private failedKeys: Set<string> = new Set();

  constructor(keys: string[]) {
    this.keys = keys;
  }

  getCurrentKey(): string {
    return this.keys[this.currentIndex];
  }

  rotateToNext(): string | null {
    const startIndex = this.currentIndex;
    do {
      this.currentIndex = (this.currentIndex + 1) % this.keys.length;
      if (!this.failedKeys.has(this.keys[this.currentIndex])) {
        return this.keys[this.currentIndex];
      }
    } while (this.currentIndex !== startIndex);
    return null; // All keys exhausted
  }

  markFailed(key: string): void { this.failedKeys.add(key); }
  resetFailed(): void { this.failedKeys.clear(); }
  get allExhausted(): boolean { return this.failedKeys.size >= this.keys.length; }
}
```

**Key insight from `@google/genai` SDK:** Each `GoogleGenAI` instance is bound to one API key at construction time. To rotate keys, you must **create a new `GoogleGenAI` instance** with the new key. This is lightweight — the SDK constructor does no network calls.

**Integration with GeminiService:**
- Store `ApiKeyManager` as a property.
- On rate-limit/quota error (429, RESOURCE_EXHAUSTED), call `keyManager.rotateToNext()`, create new `GoogleGenAI({ apiKey: newKey })`, and retry the request.
- Log rotation: `logger.warn('[GeminiService] API Key #N failed. Rotating to API Key #N+1...')`.

#### 3.3 Exponential Backoff (D-05)

When all keys are exhausted (all marked failed):

```typescript
const BACKOFF_DELAYS = [5000, 15000, 45000, 135000, 300000]; // 5s, 15s, 45s, 2m15s, 5m cap

async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  keyManager: ApiKeyManager,
  maxRetries: number = 5
): Promise<T> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (isRateLimitError(error)) {
        const nextKey = keyManager.rotateToNext();
        if (nextKey) {
          // Recreate GoogleGenAI with new key and retry immediately
          continue;
        }
        // All keys exhausted — backoff
        const delay = BACKOFF_DELAYS[Math.min(attempt, BACKOFF_DELAYS.length - 1)];
        logger.warn(`[GeminiService] All API keys rate-limited. Waiting ${delay/1000}s...`);
        await sleep(delay);
        keyManager.resetFailed(); // Reset and try again
      } else {
        throw error; // Non-rate-limit errors propagate immediately
      }
    }
  }
  throw new Error('All Gemini API keys exhausted after maximum retries');
}
```

**Rate-limit detection helper:**
```typescript
function isRateLimitError(error: unknown): boolean {
  const err = error as GeminiApiError;
  const msg = err.message || '';
  const status = err.status || err.response?.status;
  return status === 429
    || msg.includes('RESOURCE_EXHAUSTED')
    || msg.includes('RATE_LIMIT_EXCEEDED')
    || msg.includes('quota');
}
```

### Risk Assessment
- **Medium risk.** The `GoogleGenAI` re-instantiation on rotation is safe (no side effects). The main risk is ensuring the retry wrapper doesn't mask non-rate-limit errors. The `isRateLimitError` check must be tight.
- **API key in source code:** The current hardcoded key should be moved to configuration. This is a security improvement, not just a rotation concern.

---

## 4. Logger Optimization — PM2 Integration (D-06)

### Current State (`src/utils/logger.ts`)
- **119 lines**, Winston-based singleton.
- Two transports:
  1. `Console` transport with custom `chalk`-colored format.
  2. `File` transport writing to `logs/console.log` (10MB max, 5 files rotated, gzipped archive).
- Custom log levels: `alert(0)`, `error(1)`, `runtime(2)`, `warn(3)`, `info(4)`, `data(5)`, `sent(6)`, `debug(7)`.

### Recommended Approach

**Remove the File transport entirely.** PM2 captures `stdout`/`stderr` and manages its own log files (`~/.pm2/logs/`), so writing to `logs/console.log` is redundant and causes unnecessary disk I/O.

**Changes required:**
1. Remove the `transports.File({...})` block (lines 63-70).
2. Remove `fileFormat` definition (lines 36-44) — dead code after File transport removal.
3. Remove `uncolorize` from the import destructuring on line 10 (only used by `fileFormat`).
4. Keep the `Console` transport and its `consoleFormat` unchanged.
5. Optionally add `stderrLevels: ['error', 'alert']` to the Console transport config so PM2 can separate error logs into a separate file automatically.

**Resulting transport config:**
```typescript
transports: [
  new transports.Console({
    format: consoleFormat,
    stderrLevels: ['error', 'alert'],
  }),
],
```

**Cleanup:**
- Delete the `logs/` directory and add it to `.gitignore` (if not already ignored).
- No other files import `winston` directly — all go through `logger.ts`.

### Risk Assessment
- **Very low risk.** Removing a transport is purely subtractive. PM2's built-in log management is the standard approach for Node.js production apps.

---

## 5. Redis-Based Conversation Caching with RAM Fallback (D-07, D-08)

### Current State

**Two separate history stores exist:**
1. `ConversationManager` (`src/structures/ConversationManager.ts`, 266 lines): Tracks per-user/per-channel conversations with `Map<string, Conversation>`. Has cleanup interval (5 min), 30-min timeout, 20-message history cap, silent mode.
2. `GeminiService.chatHistories` (line 150-153): Separate `Map<string, Array<...>>` storing raw Gemini API format histories keyed by `userId` only (no channel). Also caps at 20 messages.

**Problem:** Two overlapping stores — `ConversationManager` stores `{role, content, timestamp}` while `GeminiService` stores `{role, parts: [{text}]}`. They are not synchronized.

### Recommended Architecture

#### 5.1 Configuration Extension (D-07)
Add to `Configuration` interface:
```typescript
redisUri?: string;  // e.g., "redis://localhost:6379" or "redis://:password@host:port"
```

#### 5.2 Redis Cache Layer with ioredis

**New file: `src/structures/RedisCacheManager.ts`**

Using `ioredis` library (confirmed latest docs from Context7):

```typescript
import Redis from 'ioredis';
import { logger } from '../utils/logger.js';

export class RedisCacheManager {
  private redis: Redis | null = null;
  private isConnected = false;

  constructor(redisUri?: string) {
    if (!redisUri) {
      logger.info('[RedisCacheManager] No Redis URI configured — using RAM fallback');
      return;
    }
    try {
      this.redis = new Redis(redisUri, {
        retryStrategy(times) {
          if (times > 10) return null; // Stop after 10 attempts
          return Math.min(times * 200, 5000); // Max 5s between retries
        },
        maxRetriesPerRequest: 3,
        connectTimeout: 10000,
        enableOfflineQueue: false, // Don't queue when disconnected — fallback to RAM
      });

      this.redis.on('connect', () => {
        this.isConnected = true;
        logger.info('[RedisCacheManager] Connected to Redis');
      });
      this.redis.on('error', (err) => {
        logger.warn(`[RedisCacheManager] Redis error: ${err.message}`);
        this.isConnected = false;
      });
      this.redis.on('close', () => {
        this.isConnected = false;
        logger.warn('[RedisCacheManager] Redis connection closed');
      });
    } catch (err) {
      logger.warn(`[RedisCacheManager] Failed to initialize Redis: ${err}`);
      this.redis = null;
    }
  }

  get available(): boolean { return this.isConnected && this.redis !== null; }

  async getHistory(key: string): Promise<Array<{role: string; content: string}> | null> {
    if (!this.available) return null;
    try {
      const data = await this.redis!.get(`chat:${key}`);
      return data ? JSON.parse(data) : null;
    } catch { return null; }
  }

  async setHistory(key: string, history: Array<{role: string; content: string}>, ttlSeconds = 1800): Promise<boolean> {
    if (!this.available) return false;
    try {
      await this.redis!.set(`chat:${key}`, JSON.stringify(history), 'EX', ttlSeconds);
      return true;
    } catch { return false; }
  }

  async deleteHistory(key: string): Promise<void> {
    if (!this.available) { return; }
    try { await this.redis!.del(`chat:${key}`); } catch { /* noop */ }
  }

  async disconnect(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.redis = null;
      this.isConnected = false;
    }
  }
}
```

#### 5.3 RAM Fallback Strategy (D-08)

**The existing `ConversationManager` IS the RAM fallback.** The integration pattern:

1. On bot startup, create `RedisCacheManager` with optional `config.redisUri`.
2. When loading conversation history:
   - Try Redis first (`redisCacheManager.getHistory(key)`).
   - If Redis returns null (unavailable or no data), use `ConversationManager.getHistory()`.
3. When saving conversation history:
   - Always write to `ConversationManager` (RAM, synchronous, guaranteed).
   - Attempt Redis write asynchronously (`redisCacheManager.setHistory(key, history)`) — fire and forget.
4. On bot restart:
   - If Redis is available, existing histories survive the restart.
   - If Redis is down, `ConversationManager` starts fresh (expected behavior — same as current).

**Key design: `enableOfflineQueue: false`** — This is critical. When Redis goes down, commands fail immediately instead of queuing indefinitely. This makes the fallback to RAM instant.

#### 5.4 Unifying the Two History Stores

The current dual-store pattern (ConversationManager + GeminiService.chatHistories) should be unified:
- `ConversationManager` becomes the single source of truth for history management (RAM layer).
- `GeminiService` removes its internal `chatHistories` Map and instead receives history from the caller.
- This is already partially supported: `generateResponseWithHistory()` accepts a `history` parameter.

**Migration steps:**
1. Remove `private chatHistories` from `GeminiService`.
2. Refactor `chatAsDiscordBot()` to accept history as parameter instead of managing its own.
3. The handler that calls `chatAsDiscordBot()` should load history from `ConversationManager` (which may load from Redis).

### Dependency Addition
```json
"ioredis": "^5.4.0"
```

### Risk Assessment
- **Medium risk.** Redis integration adds an optional external dependency. The `enableOfflineQueue: false` + try/catch pattern ensures the bot never crashes due to Redis issues. The main complexity is unifying the two history stores, which is a refactoring concern but not risky.

---

## Validation Architecture

### Test Strategy per Decision

| Decision | Validation Approach |
|----------|-------------------|
| D-01 | `npm ls @2captcha/captcha-solver` returns empty; grep for captcha in src/ returns 0 |
| D-02 | `grep -r "adm-zip\|manualUpdate" src/` returns 0; `npm ls adm-zip` empty; update.ts < 80 lines |
| D-03 | `Configuration` interface includes `geminiApiKeys?: string[]` |
| D-04 | GeminiService handles 429 by rotating key; log output shows rotation message |
| D-05 | With all keys rate-limited, bot waits with backoff instead of crashing |
| D-06 | `logger.ts` has no `transports.File`; `logs/` directory not created at runtime |
| D-07 | With `redisUri` configured, chat history persists across bot restart |
| D-08 | With Redis down/unconfigured, bot continues functioning with RAM-only history |

### Dependency Impact

| Action | Package | Type |
|--------|---------|------|
| Remove | `@2captcha/captcha-solver` | production |
| Remove | `adm-zip` | production |
| Remove | `@types/adm-zip` | dev |
| Add | `ioredis` | production |

Net: -2 production deps, -1 dev dep, +1 production dep = **-2 net dependencies**.

---

## RESEARCH COMPLETE
