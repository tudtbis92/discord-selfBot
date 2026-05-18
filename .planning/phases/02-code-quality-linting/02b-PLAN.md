---
phase: 2
plan_id: 02b
title: "Fix Lint & Type Errors Across All Source Files"
wave: 2
depends_on: [02a]
requirements: [REFACT-02]
files_modified:
  - src/structures/BaseAgent.ts
  - src/structures/ConversationManager.ts
  - src/structures/gemini.ts
  - src/structures/Inquirer.ts
  - src/handler/avatarHandler.ts
  - src/handler/commandHandler.ts
  - src/handler/mentionHandler.ts
  - src/handler/welcomeHandler.ts
  - src/feats/autoChat.ts
  - src/feats/command.ts
  - src/feats/presence.ts
  - src/feats/update.ts
  - src/commands/*.ts
  - src/utils/utils.ts
  - src/utils/logger.ts
  - src/typings/typings.ts
  - src/config/mentionInstruction.ts
  - index.ts
autonomous: true
must_haves:
  truths:
    - "npx tsc --noEmit exits 0 with all strict flags enabled"
    - "npx eslint src/ index.ts runs without crash-level errors"
    - "No @ts-ignore comments remain unless absolutely necessary (document reason)"
    - "All unused locals and parameters are removed or prefixed with _"
    - "All floating promises are properly awaited or void-annotated"
---

# Plan 02b: Fix Lint & Type Errors Across All Source Files

<objective>
Resolve all TypeScript compiler errors introduced by the new strict flags (noUnusedLocals, noUnusedParameters, noImplicitReturns, noFallthroughCasesInSwitch) and fix ESLint errors/warnings from the strictTypeChecked ruleset across the entire codebase. This is a mechanical fix pass — no logic changes, only type/lint compliance.
</objective>

## Tasks

<task id="02b-1">
<title>Run tsc --noEmit and catalog all strict-flag errors</title>
<read_first>
- tsconfig.json
</read_first>
<action>
Run `npx tsc --noEmit` and capture the full error list. Categorize errors by type:
- TS6133 (unused locals/parameters)
- TS7030 (not all code paths return a value)
- TS7029 (fallthrough case in switch)

Create a fix strategy:
- Unused imports → remove
- Unused locals → remove or prefix with `_`
- Unused parameters → prefix with `_` (preserve function signatures for compatibility)
- Missing returns → add explicit `return undefined` or restructure
- Fallthrough switches → add `break`
</action>
<acceptance_criteria>
- Error count is documented
- Each error category has a fix approach defined
</acceptance_criteria>
</task>

<task id="02b-2">
<title>Fix TypeScript strict errors in structures/ directory</title>
<read_first>
- src/structures/BaseAgent.ts
- src/structures/ConversationManager.ts
- src/structures/gemini.ts
- src/structures/Inquirer.ts
- src/typings/typings.ts
</read_first>
<action>
Fix all TypeScript strict-flag errors in `src/structures/`:

**BaseAgent.ts:**
- Remove unused imports (e.g., `CollectorFilter` if unused after Phase 1 cleanup)
- Remove `@ts-ignore` comments where possible; replace with proper type assertions
- For the captcha solver callback (line 67): use proper type annotation instead of `any` — define a CaptchaChallenge interface in typings.ts
- For `error: any` catch blocks (line 88): change to `error: unknown` and use type narrowing

**gemini.ts (21KB — largest file):**
- Fix unused variables/parameters
- Replace `any` types with proper interfaces where feasible
- For external API responses where types are truly unknown, use `unknown` with runtime checks

**ConversationManager.ts:**
- Fix unused params/locals
- Ensure all async methods properly handle their promises

**Inquirer.ts:**
- Fix any strict violations

**typings.ts:**
- Add any new interfaces needed (e.g., CaptchaChallenge, CaptchaResult)
</action>
<acceptance_criteria>
- `npx tsc --noEmit` reports 0 errors from files in `src/structures/`
- No remaining `@ts-ignore` in structures/ unless documented with `// @ts-expect-error — {reason}`
- All `catch (error: any)` replaced with `catch (error: unknown)` + type narrowing
</acceptance_criteria>
</task>

<task id="02b-3">
<title>Fix TypeScript strict errors in handler/ directory</title>
<read_first>
- src/handler/mentionHandler.ts
- src/handler/welcomeHandler.ts
- src/handler/avatarHandler.ts
- src/handler/commandHandler.ts
</read_first>
<action>
Fix all strict-flag and lint errors in `src/handler/`:

**mentionHandler.ts (27KB — second largest file):**
- Fix unused locals/parameters — this file likely has many due to its size
- Fix implicit returns in conditional paths
- Replace `any` with proper types for Discord message/channel objects
- Handle floating promises with proper await/void

**welcomeHandler.ts (16KB):**
- Same pattern: fix unused vars, implicit returns, any types
- Ensure all event callbacks have proper return types

**avatarHandler.ts (4KB):**
- Fix captcha-related any types (reference CaptchaChallenge from typings)
- Fix unused parameters

**commandHandler.ts (1KB):**
- Small file — fix any minor violations
</action>
<acceptance_criteria>
- `npx tsc --noEmit` reports 0 errors from files in `src/handler/`
- `npx eslint src/handler/` runs without error-level violations
- All floating promises in event handlers are properly handled (await or void operator)
</acceptance_criteria>
</task>

<task id="02b-4">
<title>Fix TypeScript strict errors in feats/, commands/, utils/, config/ directories</title>
<read_first>
- src/feats/autoChat.ts
- src/feats/presence.ts
- src/feats/update.ts
- src/feats/command.ts
- src/commands/autochat.ts
- src/commands/joinv.ts
- src/utils/utils.ts
- src/utils/logger.ts
- src/config/mentionInstruction.ts
</read_first>
<action>
Fix all strict-flag and lint errors across remaining directories:

**feats/ (4 files):**
- autoChat.ts (7KB): fix unused vars, any types in timer/interval callbacks
- presence.ts (3KB): fix unused params, proper typing for Discord presence objects
- update.ts (4KB): fix unused vars, proper error handling types
- command.ts (<1KB): minor fixes

**commands/ (14 files):**
- Fix unused parameters in command handler callbacks (common pattern: `(message, args)` where `args` unused → `(message, _args)`)
- Fix implicit returns
- Fix any floating promises

**utils/ (2 files):**
- utils.ts: fix unused exports, proper return types
- logger.ts: fix any strict violations in winston configuration

**config/ (1 file):**
- mentionInstruction.ts (6KB): fix unused vars, proper string types
</action>
<acceptance_criteria>
- `npx tsc --noEmit` exits with 0 errors for the entire project
- `npx eslint src/ index.ts` runs without crash
- All `catch (error: any)` patterns replaced with `catch (error: unknown)` project-wide
</acceptance_criteria>
</task>

<task id="02b-5">
<title>Run Prettier format across all source files</title>
<read_first>
- .prettierrc
- .prettierignore
</read_first>
<action>
Run `npx prettier --write "src/**/*.ts" "index.ts"` to auto-format all source files to the configured standard.

After formatting:
1. Verify `npx prettier --check "src/**/*.ts" "index.ts"` exits 0
2. Verify `npx tsc --noEmit` still exits 0 (formatting should not break types)
3. Review diff to ensure no logic changes — only whitespace/formatting
</action>
<acceptance_criteria>
- `npx prettier --check "src/**/*.ts" "index.ts"` exits 0
- `npx tsc --noEmit` exits 0 after formatting
- Git diff shows only whitespace/formatting changes, no logic modifications
</acceptance_criteria>
</task>

<verification>
After all tasks complete:
1. `npx tsc --noEmit` exits 0
2. `npx eslint src/ index.ts` runs without error-severity violations
3. `npx prettier --check "src/**/*.ts" "index.ts"` exits 0
4. `npm run build` completes successfully (lint + format:check + tsc)
5. No `@ts-ignore` remains without documented justification
</verification>
