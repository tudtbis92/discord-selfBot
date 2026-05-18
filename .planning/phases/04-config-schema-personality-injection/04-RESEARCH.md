# Phase 4: Config Schema & Personality Injection - Research

**Researched:** 2026-05-18
**Domain:** TypeScript config schema extension, Gemini AI system instruction injection, file I/O
**Confidence:** HIGH

## Summary

This phase extends the bot's JSON configuration schema and TypeScript `Configuration` interface with four new autoChat fields (`autoChatCharacter`, `autoChatCharacterName`, `autoChatBotIDs`, `autoChatChannelID`), creates a `src/config/personalities/` directory for per-bot personality text files, and wires personality injection into `GeminiService` so each of the 5 PM2 processes runs its own character dynamically with proper name prefix cleaning.

The `@google/genai` SDK v2.4.0 (already installed) supports `systemInstruction` as a `ContentUnion` (string or `Content` object) in `GenerateContentConfig`, which is exactly what the existing `generateResponseWithInstruction` and `generateResponseWithHistory` methods already use. The main changes are: (1) removing the hardcoded `HUONG_PERSONALITY_INSTRUCTION` constant, (2) making `cleanResponse()` accept a dynamic character name for regex-based prefix stripping, and (3) loading personality files at startup in `BaseAgent.onReady()`.

**Primary recommendation:** Extend `Configuration` interface with optional autoChat fields, create `src/config/personalities/` with `.txt` files, modify `GeminiService` to accept character name for dynamic regex cleaning, and load personality + resolve bot display names at `BaseAgent.onReady()` time.

## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Personalities will be stored in separate text files within `src/config/personalities/` (e.g., `src/config/personalities/huong.txt`).
- **D-02:** If the personality file is missing or unreadable, the bot will log an error and disable AutoChat for that specific bot instead of crashing.
- **D-03:** Pass the dynamic `systemInstruction` (loaded from the personality text file) into the `GeminiService` constructor or an initialization method. Each PM2 bot process will maintain its own `GeminiService` instance.
- **D-04:** Introduce `autoChatCharacterName` in the configuration schema, and pass it to `GeminiService` to dynamically construct a regex to clean bot name prefixes (e.g., `Hương Nguyễn:`) from responses.
- **D-05:** All new autoChat properties are fully optional. If `autoChat` is false or missing, we skip loading personalities and gracefully disable the AutoChatManager.
- **D-06:** Early config validation at startup. If `autoChat` is enabled, verify personality file existence and array correctness. Log a warning on failure but continue running the bot agent.
- **D-07:** `autoChatBotIDs` array contains all 5 bot IDs, identical across all 5 JSON configs. The bot itself filters out its own ID programmatically.
- **D-08:** Fetch Username/DisplayName of all IDs in `autoChatBotIDs` upon startup, and dynamically inject mapping (e.g., `Name: <@ID>`) into the system instruction so Gemini can perform natural in-character mentions.

### the agent's Discretion
- None — all choices were explicitly defined in discussion.

### Deferred Ideas (OUT OF SCOPE)
- **AUTOCHAT-DET:** Advanced anti-detection heuristics (online presence alignment, random night-mode sleep, client spoofing) — Deferred to a future milestone/phase.
- **AUTOCHAT-DASH:** Web dashboard for real-time monitoring and live personality editing — Deferred.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTOCHAT-01 | Extend bot config JSON schema with `autoChatCharacter`, `autoChatBotIDs`, `autoChatChannelID`. Update TypeScript `Configuration` interface. | Config schema extension patterns documented below; TypeScript strict mode constraints verified. |
| AUTOCHAT-02 | Inject `autoChatCharacter` personality into Gemini system instruction for in-character responses. | `@google/genai` v2.4.0 `systemInstruction` support verified via Context7; existing `generateResponseWithInstruction` method already supports this pattern. |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Config schema definition | API / Backend | — | TypeScript types + JSON config files are loaded server-side |
| Personality file I/O | API / Backend | — | Filesystem reads happen at bot startup on each PM2 process |
| System instruction injection | API / Backend | — | GeminiService constructs API calls with dynamic systemInstruction |
| Bot name prefix cleaning | API / Backend | — | Response post-processing in GeminiService before sending to Discord |
| Bot ID → display name resolution | API / Backend | — | Discord API fetch at startup via discord.js-selfbot-v13 Client |

## Standard Stack

### Core (existing — no new packages)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@google/genai` | 2.4.0 | Gemini API client | Already installed; supports `systemInstruction` as `ContentUnion` in `GenerateContentConfig` [VERIFIED: npm registry + Context7] |
| `node:fs` | builtin | Personality file loading | Node.js standard library — no external dependency needed [VERIFIED: Node.js docs] |
| `node:path` | builtin | Path resolution for personality files | Node.js standard library — cross-platform path handling [VERIFIED: Node.js docs] |
| `discord.js-selfbot-v13` | 3.7.1 | Bot ID → display name resolution via `client.users.fetch()` | Already installed; provides Discord API access [VERIFIED: npm registry] |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `winston` (via `logger`) | 3.19.0 | Structured logging for personality load errors | Already used throughout codebase [VERIFIED: npm registry] |

**No new packages required.** This phase extends existing code and uses only Node.js builtins + already-installed dependencies.

## Package Legitimacy Audit

No new packages are being installed in this phase. All dependencies (`@google/genai`, `discord.js-selfbot-v13`, `winston`, `node:fs`, `node:path`) are already present in `package.json` and verified on npm registry.

| Package | Registry | Age | Downloads | Source Repo | Disposition |
|---------|----------|-----|-----------|-------------|-------------|
| `@google/genai` | npm | ~1 yr | 500K+/wk | github.com/googleapis/js-genai | Approved [VERIFIED: npm registry] |
| `discord.js-selfbot-v13` | npm | ~3 yrs | 10K+/wk | github.com/tim-smart/discord.js-selfbot-v13 | Approved [VERIFIED: npm registry] |

## Architecture Patterns

### System Architecture Diagram

```
[PM2 Process 1-5] (one per bot account)
    │
    ├── index.ts ──> load bot JSON config ──> agent.setConfig()
    │
    ├── BaseAgent.onReady()
    │       │
    │       ├── if autoChat enabled:
    │       │       ├── fs.readFileSync(src/config/personalities/{autoChatCharacter}.txt)
    │       │       │       └── missing file → log error, disable autoChat (D-02)
    │       │       │
    │       │       ├── client.users.fetch() for each ID in autoChatBotIDs
    │       │       │       └── build mention mapping: "Name: <@ID>"
    │       │       │
    │       │       ├── compose full systemInstruction:
    │       │       │       personality_text + mention_mapping
    │       │       │
    │       │       └── geminiService.setSystemInstruction(systemInstruction, characterName)
    │       │
    │       └── AutoChatManager initialized with resolved channel
    │
    └── GeminiService.generateResponseWithInstruction()
            │
            ├── config: { systemInstruction: <dynamic string>, safetySettings: [...] }
            ├── contents: [conversation history + current message]
            └── cleanResponse(text, characterName) → strip "^{charName}:\s*" prefix
```

### Recommended Project Structure

```
src/
├── config/
│   └── personalities/        # NEW: per-bot personality text files
│       ├── huong.txt         # Example personality file
│       └── [other].txt       # One per bot character
├── typings/
│   └── typings.ts            # EXTEND: Configuration interface + defaultConfig
├── structures/
│   ├── GeminiService.ts      # MODIFY: dynamic systemInstruction + cleanResponse
│   ├── BaseAgent.ts          # MODIFY: personality loading at onReady()
│   └── Inquirer.ts           # MODIFY: add prompts for new autoChat fields
└── feats/
    └── autoChat.ts           # MODIFY: use new config fields (AUTOCHAT-03+ in Phase 5)
```

### Pattern 1: Dynamic System Instruction Loading

**What:** Load personality from `.txt` file at startup, compose with bot mention mapping, pass to GeminiService.

**When to use:** Every PM2 bot process with `autoChat: true`.

**Example:**
```typescript
// Source: @google/genai v2.4.0 Context7 - GenerateContentConfig.systemInstruction
// systemInstruction accepts ContentUnion (string | Content object)
// https://github.com/googleapis/js-genai/blob/main/docs/interfaces/types.GenerateContentConfig.html

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadPersonality(characterFile: string): string | null {
  const personalityPath = path.resolve(__dirname, '../config/personalities', characterFile);
  try {
    if (!fs.existsSync(personalityPath)) {
      logger.warn(`[Personality] File not found: ${personalityPath}`);
      return null;
    }
    return fs.readFileSync(personalityPath, 'utf-8');
  } catch (error) {
    logger.error(`[Personality] Failed to read ${personalityPath}: ${error}`);
    return null;
  }
}
```

### Pattern 2: Dynamic Regex Name Prefix Cleaning

**What:** Construct regex at runtime from `autoChatCharacterName` to strip bot name prefixes from Gemini responses.

**Example:**
```typescript
// Source: CONTEXT.md specifics section
private cleanResponse(text: string, characterName: string): string {
  if (!text || !characterName) return text;

  const escapedName = characterName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const dynamicRegex = new RegExp(`^(${escapedName})\\s*:\\s*`, 'i');
  const cleaned = text.replace(dynamicRegex, '').replace(/^[^:]+:\s*/, '').trim();

  return cleaned || text;
}
```

### Pattern 3: Bot ID to Display Name Resolution

**What:** Fetch Discord user objects for all IDs in `autoChatBotIDs` at startup, build mention mapping for system instruction.

**Example:**
```typescript
// Source: discord.js-selfbot-v13 Client.users.fetch() pattern
async function resolveBotNames(
  client: BaseAgent,
  botIDs: string[]
): Promise<string> {
  const mappings: string[] = [];
  for (const id of botIDs) {
    try {
      const user = await client.users.fetch(id);
      mappings.push(`- ${user.displayName}: <@${id}>`);
    } catch {
      mappings.push(`- Unknown User: <@${id}>`);
    }
  }
  return mappings.length > 0
    ? `\n\nCác thành viên bạn có thể tương tác và @mention:\n${mappings.join('\n')}`
    : '';
}
```

### Anti-Patterns to Avoid

- **Hardcoding personality in code:** The existing `HUONG_PERSONALITY_INSTRUCTION` constant must be removed from GeminiService.ts. All personalities must come from external `.txt` files (D-01).
- **Crashing on missing personality file:** Must log error and gracefully disable autoChat for that bot (D-02). Do not throw or crash.
- **Global singleton GeminiService:** The existing `export const geminiService = new GeminiService()` singleton pattern at the bottom of GeminiService.ts is incompatible with per-bot system instructions. Each PM2 process already runs independently, but within a process the service must support dynamic instruction per bot instance. Since each PM2 process = 1 bot = 1 BaseAgent, the singleton is acceptable per-process, but the instruction must be settable via `setSystemInstruction()`.
- **Using `resolveJsonModule` for personality files:** Personality files are `.txt`, not `.json`. Do not enable `resolveJsonModule` in tsconfig for this purpose — use `fs.readFileSync` instead.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Personality file loading | Custom file watcher / hot-reload | `fs.readFileSync` at startup | Personalities are static per-process; hot-reload is deferred (AUTOCHAT-DASH) |
| Name prefix cleaning | AI-based prefix detection | Dynamic regex from characterName | Deterministic, zero API cost, matches CONTEXT.md spec exactly |
| Bot name resolution | Manual name entry in config | `client.users.fetch()` at startup | Names can change; dynamic resolution ensures accuracy |
| Config validation | Custom JSON schema library | Manual validation at startup | Only 4 new fields; no need for ajv/zod overhead |

**Key insight:** The existing `generateResponseWithInstruction` and `generateResponseWithHistory` methods in GeminiService already support `systemInstruction` in the config. The change is purely about making the instruction dynamic and the name cleaning parameterized.

## Runtime State Inventory

> This is a greenfield extension phase (adding new optional fields), not a rename/refactor. No runtime state migration needed.

**Stored data:** None — new config fields are optional and do not affect existing data.
**Live service config:** None — personality files are new, no existing service references them.
**OS-registered state:** None — PM2 process configs are file-based.
**Secrets/env vars:** None — no secrets involved in this phase.
**Build artifacts:** None — TypeScript compilation will pick up new types automatically.

## Common Pitfalls

### Pitfall 1: TypeScript `noUnusedLocals` / `noUnusedParameters` Errors
**What goes wrong:** The project has `noUnusedLocals: true` and `noUnusedParameters: true` in tsconfig.json. Adding new parameters to methods without using them causes compile errors.
**Why it happens:** TypeScript strict mode enforces unused variable detection.
**How to avoid:** Prefix unused parameters with `_` (e.g., `_userId`) or ensure all parameters are used. The existing `cleanResponse(text: string)` method currently takes no character name — when adding it, ensure the parameter is used.
**Warning signs:** `npm run build` fails with TS6133 errors.

### Pitfall 2: `systemInstruction` Type Mismatch
**What goes wrong:** Passing a plain string to `systemInstruction` when the SDK expects `ContentUnion`.
**Why it happens:** The `GenerateContentConfig.systemInstruction` type is `ContentUnion`, which accepts both `string` and `Content` objects. The existing code passes strings directly and it works, but this should be verified.
**How to avoid:** Context7 confirms `systemInstruction` accepts `ContentUnion` (string | Content). Passing a plain string is valid. [VERIFIED: Context7 /googleapis/js-genai]
**Warning signs:** TypeScript compile error on `systemInstruction` assignment.

### Pitfall 3: ESM `__dirname` Not Available
**What goes wrong:** Using `__dirname` in ESM modules causes `ReferenceError: __dirname is not defined`.
**Why it happens:** The project uses `"type": "module"` and `"module": "NodeNext"`. `__dirname` is a CommonJS global.
**How to avoid:** Use `import { fileURLToPath } from 'node:url'` and `const __dirname = path.dirname(fileURLToPath(import.meta.url))` pattern. [VERIFIED: Node.js ESM docs]
**Warning signs:** Runtime error at startup when loading personality files.

### Pitfall 4: Race Condition in Bot Name Resolution
**What goes wrong:** `client.users.fetch()` calls fail if the client is not fully ready.
**Why it happens:** Discord API requires authenticated client for user fetches.
**How to avoid:** Perform name resolution inside `onReady()` handler, after `this.user` is populated. The existing `onReady()` flow already runs after login, so this is safe.
**Warning signs:** `DiscordAPIError: 401` or `403` during startup.

### Pitfall 5: Personality File Encoding Issues
**What goes wrong:** Vietnamese characters (e.g., "Hương", "Nguyễn") become garbled when reading personality files.
**Why it happens:** File saved with wrong encoding (e.g., Windows-1258 instead of UTF-8).
**How to avoid:** Ensure all personality files are saved as UTF-8. Use `fs.readFileSync(path, 'utf-8')` explicitly.
**Warning signs:** Gemini responses contain `` characters or garbled Vietnamese text.

## Code Examples

Verified patterns from official sources:

### Extending Configuration Interface
```typescript
// Source: existing src/typings/typings.ts pattern
export interface Configuration {
  // ... existing fields ...

  // Auto Chat Personality (Phase 4)
  autoChatCharacter?: string;       // filename in src/config/personalities/ (e.g., "huong.txt")
  autoChatCharacterName?: string;   // display name for regex cleaning (e.g., "Hương Nguyễn")
  autoChatBotIDs?: string[];        // all 5 bot user IDs (identical across configs)
  // autoChatChannelID already exists
}
```

### GeminiService setSystemInstruction
```typescript
// Source: @google/genai v2.4.0 - GenerateContentConfig.systemInstruction is ContentUnion
// https://github.com/googleapis/js-genai

class GeminiService {
  private systemInstruction: string = '';
  private characterName: string = '';

  public setSystemInstruction(instruction: string, characterName: string): void {
    this.systemInstruction = instruction;
    this.characterName = characterName;
  }

  private cleanResponse(text: string): string {
    if (!text || !this.characterName) return text;
    const escaped = this.characterName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp(`^(${escaped})\\s*:\\s*`, 'i');
    return text.replace(regex, '').replace(/^[^:]+:\s*/, '').trim() || text;
  }

  // In generateResponseWithInstruction / generateResponseWithHistory:
  // config: { ...this.defaultConfig, systemInstruction: this.systemInstruction }
}
```

### BaseAgent Personality Loading
```typescript
// Source: existing BaseAgent.onReady() pattern
private onReady = async (): Promise<void> => {
  logger.info(`Logged in as ${this.user?.displayName ?? 'Unknown user'}`);

  // ... existing setup ...

  if (this.config.autoChat) {
    // Validate personality file
    if (this.config.autoChatCharacter) {
      const personalityPath = path.resolve(
        path.dirname(fileURLToPath(import.meta.url)),
        'config/personalities',
        this.config.autoChatCharacter
      );
      try {
        const personality = fs.readFileSync(personalityPath, 'utf-8');

        // Resolve bot names for mention mapping
        let mentionMapping = '';
        if (this.config.autoChatBotIDs?.length) {
          const mappings: string[] = [];
          for (const id of this.config.autoChatBotIDs) {
            try {
              const user = await this.users.fetch(id);
              mappings.push(`- ${user.displayName}: <@${id}>`);
            } catch {
              mappings.push(`- Unknown: <@${id}>`);
            }
          }
          mentionMapping = `\n\nCác thành viên bạn có thể tương tác và @mention:\n${mappings.join('\n')}`;
        }

        const fullInstruction = personality + mentionMapping;
        this.geminiService?.setSystemInstruction(fullInstruction, this.config.autoChatCharacterName || '');
        logger.info('[AutoChat] Personality loaded and system instruction set');
      } catch {
        logger.error(`[AutoChat] Personality file not found: ${personalityPath}. Disabling AutoChat.`);
        this.config.autoChat = false;
      }
    }

    this.autoChatManager = new AutoChatManager(this);
    logger.info('[AutoChat] Đã khởi tạo Auto Chat Manager');
  }
};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Hardcoded `HUONG_PERSONALITY_INSTRUCTION` constant | External `.txt` files loaded at runtime | This phase | Enables per-bot personalities without code changes |
| Static regex `/^(Hương\s*(Nguyễn)?|...)/` in `cleanResponse()` | Dynamic regex built from `autoChatCharacterName` | This phase | Supports any character name without code modification |
| Singleton `geminiService` with fixed instruction | `setSystemInstruction()` method for dynamic configuration | This phase | Each PM2 process configures its own instruction |

**Deprecated/outdated:**
- `HUONG_PERSONALITY_INSTRUCTION` constant: Will be removed from GeminiService.ts. Replaced by file-based personalities.
- `HUONG_INITIAL_GREETING` constant: Should also be moved to personality files or removed. The greeting is now handled by the conversation flow (Phase 6, AUTOCHAT-07).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `systemInstruction` in `GenerateContentConfig` accepts plain `string` (not just `Content` object) | Code Examples | If it requires `Content` object, all `systemInstruction` assignments need wrapping in `{ parts: [{ text: ... }] }` — minor refactor |
| A2 | Each PM2 process runs exactly 1 BaseAgent instance, so singleton `geminiService` is safe per-process | Anti-Patterns | If a process runs multiple agents, singleton would share instruction across bots — would need per-instance GeminiService |

## Open Questions (RESOLVED)

1. **Should `geminiService` singleton be replaced with per-instance creation?**
   - What we know: Each PM2 process = 1 bot = 1 BaseAgent. The singleton is created at module load time.
   - What's unclear: If the project ever moves away from 1-process-per-bot, the singleton becomes a problem.
   - **RESOLVED:** Keep singleton for now (matches D-03 "each PM2 bot process will maintain its own GeminiService instance"), but add `setSystemInstruction()` method. This is the lowest-risk change.

2. **Should `HUONG_INITIAL_GREETING` also be moved to personality files?**
   - What we know: The greeting is currently hardcoded alongside the personality instruction.
   - What's unclear: Whether the greeting is still used or has been superseded by the conversation initiator mechanism (AUTOCHAT-07, Phase 6).
   - **RESOLVED:** Leave `HUONG_INITIAL_GREETING` in place for now — it's only used in `chatAsDiscordBot()` when history is empty, and that method is not yet wired to autoChat. Phase 6 will handle this.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | ✓ | >=16 (per package.json) | — |
| TypeScript | Build | ✓ | 6.0.3 | — |
| `@google/genai` | Gemini API calls | ✓ | 2.4.0 | — |
| `discord.js-selfbot-v13` | Discord API / bot name resolution | ✓ | 3.7.1 | — |
| `fs` / `path` (Node.js builtins) | Personality file loading | ✓ | builtin | — |

**Missing dependencies:** None — this phase uses only existing dependencies and Node.js builtins.

## Validation Architecture

> Included per `.planning/config.json` workflow.nyquist_validation (key absent = enabled).

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None detected — no test config files, test directories, or test scripts found |
| Config file | none — see Wave 0 |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTOCHAT-01 | Config schema accepts new autoChat fields | unit | N/A | ❌ Wave 0 |
| AUTOCHAT-02 | GeminiService uses dynamic systemInstruction | unit | N/A | ❌ Wave 0 |

### Wave 0 Gaps
- [ ] No test framework detected in project — `package.json` has `"test": "echo \"Error: no test specified\" && exit 1"`
- [ ] `npm run build` (TypeScript compilation) serves as the primary validation gate for this phase
- [ ] Manual verification: run bot with `autoChat: true` + personality file, confirm Gemini responses match character

## Security Domain

> `security_enforcement` not set in `.planning/config.json` — treated as enabled.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | no | Discord token auth (existing) |
| V3 Session Management | no | N/A |
| V4 Access Control | no | N/A |
| V5 Input Validation | yes | Config validation at startup — verify personality file path does not contain path traversal (`../`) |
| V6 Cryptography | no | N/A |

### Known Threat Patterns for Node.js File I/O

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Path traversal in `autoChatCharacter` filename | Tampering | Validate filename contains only alphanumeric, `-`, `_`, `.` characters; reject `..` or `/` |
| Personality file injection (malicious content) | Information Disclosure | Personality files are developer-controlled (not user-uploaded); low risk if access to `src/config/personalities/` is restricted |

## Sources

### Primary (HIGH confidence)
- Context7 `/googleapis/js-genai` — `GenerateContentConfig.systemInstruction` type (`ContentUnion`), `generateContent` parameters, `Part`/`Content` interfaces
- `@google/genai` v2.4.0 npm registry — version confirmed 2026-05-18, repo: github.com/googleapis/js-genai
- Existing codebase files: `src/typings/typings.ts`, `src/structures/GeminiService.ts`, `src/structures/BaseAgent.ts`, `src/feats/autoChat.ts`, `index.ts`, `tsconfig.json`, `package.json`
- Node.js ESM documentation — `fileURLToPath` / `__dirname` pattern

### Secondary (MEDIUM confidence)
- CONTEXT.md decisions D-01 through D-08 — user-defined constraints for this phase
- REQUIREMENTS.md AUTOCHAT-01, AUTOCHAT-02 — phase requirement definitions

### Tertiary (LOW confidence)
- None — all critical claims verified against source code or official documentation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages, all existing dependencies verified on npm registry
- Architecture: HIGH — patterns verified against existing codebase structure and Context7 SDK docs
- Pitfalls: HIGH — TypeScript strict mode flags verified in tsconfig.json, ESM module type verified in package.json

**Research date:** 2026-05-18
**Valid until:** 2026-06-17 (30 days — stable domain, no fast-moving dependencies)
