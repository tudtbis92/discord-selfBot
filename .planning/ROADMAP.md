# Roadmap: selftBot-owo

## Milestones

- ✅ **v1.0 Refactoring & Clean Up** — Phases 1-3 (shipped 2026-05-18)
- 📋 **v1.1 Advanced AutoChat & Multi-bot Roleplay** — Phases 4-6 (active)

## Phases

<details>
<summary>✅ v1.0 Refactoring & Clean Up (Phases 1-3) — SHIPPED 2026-05-18</summary>

- [x] Phase 1: Project Reorganization & Cleanup (3/3 plans) — completed 2026-05-18
- [x] Phase 2: Code Quality & Linting (3/3 plans) — completed 2026-05-18
- [x] Phase 3: Bug Fixes & Optimization (4/4 plans) — completed 2026-05-18

</details>

### 📋 Milestone v1.1: Advanced AutoChat & Multi-bot Roleplay

> **Architecture:** 5 separate PM2 processes (1 per bot). Discord events = natural IPC. No orchestrator needed.

#### Phase 4: Config Schema & Personality Injection
- **Goal:** Extend bot config JSON and TypeScript types with autoChat fields (`autoChatCharacter`, `autoChatBotIDs`, `autoChatChannelID`), and wire personality injection into GeminiService.
- **Requirements:** `AUTOCHAT-01`, `AUTOCHAT-02`
- **Plans:** 3 plans
- **Plan list:**
  - [x] 04-01-PLAN.md — Extend Configuration interface + create personalities directory
  - [x] 04-02-PLAN.md — Dynamic systemInstruction in GeminiService + personality loading in BaseAgent
  - [x] 04-03-PLAN.md — Inquirer prompts for new autoChat config fields
- **Success Criteria:**
  1. Each bot's JSON config file can define `autoChatCharacter` (personality prompt), `autoChatBotIDs` (array of 4 other bot IDs), and `autoChatChannelID`.
  2. TypeScript `Configuration` interface is updated and compiles cleanly.
  3. GeminiService reads and applies the personality prompt as system instruction when generating autoChat responses.
- **Status:** ✅ COMPLETE — 2026-05-18

#### Phase 5: Mention/Reply Triggers & Human-like Response
- **Goal:** Rewrite AutoChatManager to only respond to mentions/replies from known bot IDs, with human-like delay and typing indicators. Gemini decides who to @mention next.
- **Requirements:** `AUTOCHAT-03`, `AUTOCHAT-04`, `AUTOCHAT-05`
- **Plans:** 1 plan
- **Plan list:**
  - [x] 05-01-PLAN.md — Rewrite AutoChatManager with queue, burst typing, mention extraction, and response routing
- **Success Criteria:**
  1. Bot only responds when @mentioned or replied-to in `autoChatChannelID` by a sender in `autoChatBotIDs`.
  2. Bot displays `sendTyping` + waits 5-15s random delay before replying.
  3. Gemini response includes @mentions of other bots (decided in-character). If no mention → bot replies to the triggering message.
  4. Messages from unknown users are completely ignored.
- **Status:** ✅ COMPLETE — 2026-05-19

#### Phase 6: Conversation History & Initiator
- **Goal:** Implement shared per-channel conversation history via Redis/RAM cache, and a conversation initiator mechanism.
- **Requirements:** `AUTOCHAT-06`, `AUTOCHAT-07`
- **Success Criteria:**
  1. Conversation history is stored per channel in Redis (with RAM fallback). All 5 bots read from the same key.
  2. Recent channel history is included in the Gemini prompt so responses are contextually coherent.
  3. One configurable bot periodically starts a new conversation topic + mentions the other bots.
  4. Conversation doesn't bleed between channels or stale sessions.

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|---|---|---|---|---|
| 1. Reorganization & Cleanup | v1.0 | 3/3 | Complete | 2026-05-18 |
| 2. Code Quality & Linting | v1.0 | 3/3 | Complete | 2026-05-18 |
| 3. Bug Fixes & Optimization | v1.0 | 4/4 | Complete | 2026-05-18 |
| 4. Config & Personality Injection | v1.1 | 3/3 | Complete | 2026-05-18 |
| 5. Triggers & Human-like Response | v1.1 | 1/1 | Planned | — |
| 6. History & Initiator | v1.1 | 0/? | Planned | — |
