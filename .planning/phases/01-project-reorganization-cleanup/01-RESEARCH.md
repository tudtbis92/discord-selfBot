# Phase 1: Project Reorganization & Cleanup - Research

**Date:** 2026-05-18
**Phase:** 01 — Project Reorganization & Cleanup
**Requirements:** REFACT-01, REFACT-03

## 1. Current Codebase Structure

```
selftBot-owo/
├── index.ts                    # Entry point (CLI + boot)
├── package.json                # 13 deps, 4 devDeps
├── tsconfig.json
├── run.bat
├── autorun.json                # User config (sensitive)
├── *.json                      # 4 user-specific config files at root
├── src/
│   ├── commands/               # 14 command files
│   ├── config/                 # 1 file: mentionInstruction.ts
│   ├── feats/                  # 4 files: autoChat, command, presence, update
│   ├── handler/                # 4 files: avatar, command, mention, welcome
│   ├── structures/             # 4 files: BaseAgent, ConversationManager, Inquirer, gemini
│   ├── typings/                # 2 files: typings.ts, quotes.ts (148KB!)
│   └── utils/                  # 3 files: logger, messageUtils, utils
├── dest/                       # Compiled JS output (gitignored)
└── doc/                        # Documentation (4 files + 1 subdir)
```

## 2. Unused Dependencies (package.json)

| Package | Status | Evidence |
|---------|--------|----------|
| `2captcha` | **UNUSED** | Zero imports found. Only `@2captcha/captcha-solver` is used (via dynamic import in BaseAgent.ts) |
| `axios-cookiejar-support` | **UNUSED** | Zero imports across entire `src/` |
| `tough-cookie` | **UNUSED** | Zero imports across entire `src/` |
| `@inquirer/core` | **UNUSED** | Only `@inquirer/prompts` is imported (Inquirer.ts, update.ts) |

### Dependencies IN USE (keep):
- `@2captcha/captcha-solver` — dynamic import in BaseAgent.ts
- `@google/genai` — gemini.ts
- `@inquirer/prompts` — Inquirer.ts, update.ts
- `adm-zip` — update.ts (self-updater)
- `axios` — update.ts
- `chalk` — logger.ts
- `commander` — index.ts (CLI)
- `discord.js-selfbot-v13` — core throughout
- `node-notifier` — typings.ts (types only, see note below)
- `winston` — logger.ts

### Note on `node-notifier`:
- Imported ONLY in `typings.ts` for the `popupOptions` type
- `popupOptions` is exported but **never used anywhere** in the codebase
- The entire `node-notifier` dependency exists solely for an unused type alias
- **Recommendation:** Remove `popupOptions` type + `node-notifier` dependency + `@types/node-notifier` devDep

## 3. Dead/Unused Code

### Files never imported:
| File | Evidence | Action |
|------|----------|--------|
| `src/utils/messageUtils.ts` | Never imported by any file (only self-reference in header comment) | DELETE |
| `src/typings/quotes.ts` | 148KB file (1850 lines of Vietnamese quotes). Exported but **zero imports** anywhere | DELETE |

### Unused exported types:
| Type | File | Evidence |
|------|------|----------|
| `popupOptions` | typings.ts | Exported, never imported elsewhere |
| `SendOptions` | typings.ts | Exported, never imported elsewhere |

### Commented-out code blocks:
| File | Lines | Content |
|------|-------|---------|
| `typings.ts` | L69-98 | Old `Configuration` interface (fully commented out) |
| `feats/autoChat.ts` | L61-124 | `handleMentionOrReply` — entire method body commented, function returns immediately |
| `feats/autoChat.ts` | L128-221 | `sendRandomChat` — entire method body commented, function returns immediately |
| `feats/command.ts` | L6 | Commented import of logger |

### Empty method:
| File | Method | Issue |
|------|--------|-------|
| `BaseAgent.ts` | `run()` L183-186 | Empty method kept "for compatibility" — does nothing |

## 4. Root-Level Config Files (Clutter)

These JSON files at project root are user-specific configuration files:
- `autorun.json` — default config template
- `darkphoenix1992.json`, `hongnhung5690.json`, `leemeimei4944.json`, `trantran1629.json` — user profiles
- `freeze.voz5276.json` — another user config

**Issue:** These files contain tokens and are NOT gitignored (only `autorun.json` pattern may be covered). User-specific configs should not clutter the project root.

**Recommendation:** Move templates to `config/` or add to `.gitignore`. User-specific files should be in a dedicated `configs/` directory or gitignored.

## 5. `.gitignore` Gaps

Current `.gitignore` does NOT ignore:
- User-specific JSON configs at root (`*.json` patterns for `darkphoenix1992.json`, etc.)
- `package-lock.json` is gitignored (unusual — typically tracked)
- `src/security` and `src/feats/B2KI.ts` are gitignored (private code)

## 6. Folder Structure Assessment

Per decision **D-01**: Keep technical-based structure (commands, handler, utils). The current layout is already organized this way. Improvements needed:

1. **`src/config/`** — Only has 1 file (`mentionInstruction.ts`). Could stay but is very sparse.
2. **`src/typings/`** — Contains types + massive data file (quotes.ts). Data should not live alongside types.
3. **`src/feats/`** — Mix of features: `autoChat.ts` (mostly disabled), `command.ts` (command loader), `presence.ts` (RPC), `update.ts` (self-updater). These are all distinct features, layout is fine.
4. **`index.ts`** at root — Typical for this project structure.

## 7. Build Process

- `npm run build` → `tsc` → outputs to `dest/`
- `npm run dev` → build + start
- No test infrastructure exists
- Removing dependencies requires verifying `tsc` still compiles without errors

## 8. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| Removing dependencies breaks build | Medium | Run `tsc` after each removal to verify |
| Deleting files breaks imports | Low | grep-verified: no file imports dead code |
| Removing `node-notifier` types breaks typings.ts | Low | Remove type alias first, then dependency |
| User config files contain tokens | High | Verify `.gitignore` covers them before any commit |

## RESEARCH COMPLETE

Research identified 4 unused dependencies, 2 completely dead files (including a 148KB quotes file), multiple dead type exports, and extensive commented-out code — all clearly scoped for Phase 1 cleanup.
