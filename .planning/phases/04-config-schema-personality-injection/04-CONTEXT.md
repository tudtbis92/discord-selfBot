# Phase 4: Config Schema & Personality Injection - Context

**Gathered:** 2026-05-18
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase extends each bot's JSON configuration and TypeScript types with new autoChat options (`autoChatCharacter` file path, `autoChatCharacterName`, `autoChatBotIDs` array, `autoChatChannelID`), and wires personality injection into `GeminiService` so that each of the 5 separate PM2 processes can run its own character dynamically with proper name prefix cleaning.
</domain>

<decisions>
## Implementation Decisions

### Personality Format
- **D-01:** Personalities will be stored in separate text files within `src/config/personalities/` (e.g., `src/config/personalities/huong.txt`).
- **D-02:** If the personality file is missing or unreadable, the bot will log an error and disable AutoChat for that specific bot instead of crashing.

### Hardcoded Personality Removal
- **D-03:** Pass the dynamic `systemInstruction` (loaded from the personality text file) into the `GeminiService` constructor or an initialization method. Each PM2 bot process will maintain its own `GeminiService` instance.
- **D-04:** Introduce `autoChatCharacterName` in the configuration schema, and pass it to `GeminiService` to dynamically construct a regex to clean bot name prefixes (e.g., `Hương Nguyễn:`) from responses.

### Config Backward Compatibility
- **D-05:** All new autoChat properties are fully optional. If `autoChat` is false or missing, we skip loading personalities and gracefully disable the AutoChatManager.
- **D-06:** Early config validation at startup. If `autoChat` is enabled, verify personality file existence and array correctness. Log a warning on failure but continue running the bot agent.

### autoChatBotIDs Scope
- **D-07:** `autoChatBotIDs` array contains all 5 bot IDs, identical across all 5 JSON configs. The bot itself filters out its own ID programmatically.
- **D-08:** Fetch Username/DisplayName of all IDs in `autoChatBotIDs` upon startup, and dynamically inject mapping (e.g., `Name: <@ID>`) into the system instruction so Gemini can perform natural in-character mentions.

### the agent's Discretion
- None — all choices were explicitly defined in discussion.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Context
- `.planning/PROJECT.md` — Core value, current state, and key architectural decisions
- `.planning/REQUIREMENTS.md` — Active requirements and traceability
- `.planning/ROADMAP.md` — Current milestone and phase descriptions

### Codebase Configurations
- `src/typings/typings.ts` — TypeScript definitions for `Configuration`
- `src/structures/GeminiService.ts` — Gemini API integration service
- `src/structures/BaseAgent.ts` — Main bot client structures and entrypoint config loads

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `GeminiService.ts`: `ApiKeyManager`, `withRetryAndRotation`, and safety settings are already fully optimized; we only need to genericize system instruction parsing and the constructor.
- `src/feats/autoChat.ts`: Already contains basic channel check structures, which will receive these expanded config properties.

### Established Patterns
- Bot configurations are stored as local `.json` files loaded dynamically at boot time in `BaseAgent.ts` and `Inquirer.ts`.
- ESM modules and TypeScript compile strict checks are enforced.

### Integration Points
- `src/typings/typings.ts` -> Add new properties to `Configuration`.
- `src/structures/BaseAgent.ts` -> Initialize `GeminiService` with loaded systemInstruction.
- `src/structures/GeminiService.ts` -> Support parameter-based instruction and dynamic regex prefix cleaning.
- `src/feats/autoChat.ts` -> Connect the new configuration fields to bot lifecycle.

</code_context>

<specifics>
## Specific Ideas
- Sơ đồ ánh xạ trong system instruction truyền vào Gemini có dạng:
  ```text
  Các thành viên bạn có thể tương tác và @mention:
  - Huy: <@862539934778916895>
  - Vy: <@112233445566778899>
  ```
- Dynamic regex cleaning dùng trong `cleanResponse()`:
  ```typescript
  const escapedName = characterName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const dynamicRegex = new RegExp(`^(${escapedName})\\s*:\\s*`, 'i');
  ```

</specifics>

<deferred>
## Deferred Ideas
- **AUTOCHAT-DET:** Advanced anti-detection heuristics (online presence alignment, random night-mode sleep, client spoofing) — Deferred to a future milestone/phase.
- **AUTOCHAT-DASH:** Web dashboard for real-time monitoring and live personality editing — Deferred.

</deferred>

---

*Phase: 4-Config Schema & Personality Injection*
*Context gathered: 2026-05-18*
