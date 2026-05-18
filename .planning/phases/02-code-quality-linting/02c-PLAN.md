---
phase: 2
plan_id: 02c
title: "Refactor Core Modules for Clarity & Maintainability"
wave: 2
depends_on: [02a]
requirements: [REFACT-02]
files_modified:
  - src/structures/BaseAgent.ts
  - src/structures/gemini.ts
  - src/handler/mentionHandler.ts
  - src/handler/welcomeHandler.ts
  - src/feats/autoChat.ts
  - src/feats/presence.ts
autonomous: true
must_haves:
  truths:
    - "BaseAgent.ts methods are under 50 lines each"
    - "mentionHandler.ts is broken into focused helper functions"
    - "welcomeHandler.ts is broken into focused helper functions"
    - "No function exceeds 80 lines without a documented justification"
    - "All refactored code passes npm run build"
---

# Plan 02c: Refactor Core Modules for Clarity & Maintainability

<objective>
Refactor verbose and complex logic in core modules (BaseAgent, handlers, feats) to improve readability and maintainability — per decision D-04. Focus on the largest/most complex files: mentionHandler (27KB), gemini (21KB), welcomeHandler (16KB), and autoChat (7KB). No functional changes — only structural improvements.
</objective>

## Tasks

<task id="02c-1">
<title>Refactor BaseAgent.ts — extract setup and lifecycle methods</title>
<read_first>
- src/structures/BaseAgent.ts
- src/feats/autoChat.ts
- src/feats/presence.ts
</read_first>
<action>
Refactor `BaseAgent.ts` for clarity:

1. **Extract `setupCaptchaSolver`** — the method is already separate but contains a nested callback. Move the inner captcha solver callback to a standalone private method `private handleCaptchaChallenge`.

2. **Simplify `registerEvents`** — the `ready` callback does 6+ things. Extract into `private onReady()` method that handles:
   - Presence loading
   - Command loading
   - Active channel setup
   - AutoChat manager init
   - Logging
   - Calling `this.main()`

3. **Type the `main` loop** — add `Promise<never>` return type to `main()` since it runs forever with `while (true)`.

4. **Remove dead `run` method** — it does nothing (comment says "giữ lại để tương thích với code cũ"). If no callers exist, remove it. If callers exist, add `@deprecated` JSDoc.

5. **Add JSDoc** to all public methods with Vietnamese + English descriptions.
</action>
<acceptance_criteria>
- `registerEvents` method body is under 10 lines (delegates to `onReady`)
- `handleCaptchaChallenge` is a separate private method
- `main` has explicit `Promise<never>` return type
- `run` method is either removed or marked `@deprecated`
- `npx tsc --noEmit` exits 0
- `npx eslint src/structures/BaseAgent.ts` exits 0
</acceptance_criteria>
</task>

<task id="02c-2">
<title>Refactor mentionHandler.ts — extract into focused functions</title>
<read_first>
- src/handler/mentionHandler.ts
- src/structures/gemini.ts
- src/structures/ConversationManager.ts
</read_first>
<action>
`mentionHandler.ts` is 27KB — the largest file in the project. Refactor by:

1. **Identify logical blocks** — read the file to understand its internal structure (likely: parsing mentions, routing to handlers, building responses, sending replies)

2. **Extract helper functions** — each distinct responsibility becomes a named function:
   - `parseMentionContext(message)` — extract mention type, author, content
   - `buildGeminiPrompt(context)` — construct AI prompt from mention data
   - `handleDirectMention(message)` — handle @mention responses
   - `handleReplyMention(message)` — handle reply-based triggers
   - Any other distinct blocks

3. **Keep exports minimal** — only the main `mentionHandler(client)` function should be exported. Helpers are module-private.

4. **Preserve all behavior** — no functional changes. Same inputs produce same outputs.

5. **Add JSDoc** to the exported function and major helpers.
</action>
<acceptance_criteria>
- No single function in mentionHandler.ts exceeds 60 lines
- The exported `mentionHandler` function is under 30 lines (delegates to helpers)
- File still exports exactly one function: `mentionHandler`
- `npx tsc --noEmit` exits 0
- `npx eslint src/handler/mentionHandler.ts` exits 0
</acceptance_criteria>
</task>

<task id="02c-3">
<title>Refactor welcomeHandler.ts — extract into focused functions</title>
<read_first>
- src/handler/welcomeHandler.ts
</read_first>
<action>
`welcomeHandler.ts` is 16KB. Apply same refactoring pattern as mentionHandler:

1. **Read and understand** the file structure
2. **Extract helpers** for distinct responsibilities:
   - Welcome message construction
   - Channel/guild validation
   - Response formatting
   - Any conditional branching logic

3. **Keep exports minimal** — only `welcomeHandler(client)`
4. **Preserve behavior** — no functional changes
5. **Add JSDoc** to exported function
</action>
<acceptance_criteria>
- No single function exceeds 60 lines
- The exported `welcomeHandler` function is under 30 lines
- `npx tsc --noEmit` exits 0
- `npx eslint src/handler/welcomeHandler.ts` exits 0
</acceptance_criteria>
</task>

<task id="02c-4">
<title>Refactor gemini.ts — simplify API interaction layer</title>
<read_first>
- src/structures/gemini.ts
- src/typings/typings.ts
</read_first>
<action>
`gemini.ts` is 21KB. Refactor:

1. **Identify** class methods and their responsibilities
2. **Extract utility functions** — string processing, prompt building, response parsing
3. **Type API responses** — create interfaces for Gemini API request/response shapes in typings.ts instead of using `any`
4. **Simplify long methods** — break methods over 50 lines into smaller focused methods
5. **Add JSDoc** to public methods
</action>
<acceptance_criteria>
- No method in gemini.ts exceeds 50 lines
- At least 2 new interfaces added to typings.ts for Gemini API shapes
- `npx tsc --noEmit` exits 0
- `npx eslint src/structures/gemini.ts` exits 0
</acceptance_criteria>
</task>

<task id="02c-5">
<title>Refactor feats/ modules — simplify autoChat and presence</title>
<read_first>
- src/feats/autoChat.ts
- src/feats/presence.ts
- src/feats/update.ts
</read_first>
<action>
Refactor `src/feats/` modules:

**autoChat.ts (7KB):**
- Extract timer/scheduling logic into named helpers
- Simplify the `AutoChatManager` class — ensure each method does one thing
- Type all callback parameters properly

**presence.ts (3KB):**
- Extract presence activity builders into focused functions
- Ensure `loadPresence` and `startAutoPresenceUpdate` have clear single responsibilities

**update.ts (4KB):**
- Extract version checking and download logic into separate functions
- Proper error handling with typed catches
</action>
<acceptance_criteria>
- No function in feats/ exceeds 50 lines
- `AutoChatManager` methods each have a single responsibility
- `npx tsc --noEmit` exits 0
- `npx eslint src/feats/` exits 0
</acceptance_criteria>
</task>

<verification>
After all tasks complete:
1. `npm run build` exits 0 (lint + format:check + tsc)
2. `npx eslint src/ index.ts --max-warnings 0` — aim for 0 warnings (may have some `any`-related warnings)
3. No file has a function exceeding 80 lines
4. BaseAgent.ts `registerEvents` delegates to `onReady`
5. mentionHandler.ts and welcomeHandler.ts use helper functions (not monolithic)
6. Bot still starts: `npm run build && node dest/index.js` does not crash on startup
</verification>
