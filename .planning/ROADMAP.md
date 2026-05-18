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

#### Phase 4: Configuration & Character Personalities
- **Goal:** Support customizable character personalities in the bot's configuration files and inject them into the Gemini service.
- **Requirements:** `AUTOCHAT-01`, `AUTOCHAT-02`
- **Success Criteria:**
  1. Configuration files can define a custom `autoChatCharacter` or `personality` prompt.
  2. GeminiService correctly reads and applies the personality prompt when generating replies.

#### Phase 5: Core Interaction & Human-like Simulation
- **Goal:** Implement mention/reply-only trigger mechanics and human-like typing simulation.
- **Requirements:** `AUTOCHAT-03`, `AUTOCHAT-04`
- **Success Criteria:**
  1. The bot only responds when mentioned or replied to in the designated auto-chat channel.
  2. The bot displays a typing indicator (`sendTyping`) and waits a randomized human-like delay (5–15 seconds) before replying.

#### Phase 6: Conversation Flow, State & Cache Integration
- **Goal:** Enable continuous conversation flows between multiple bots and robustly manage per-channel session cache.
- **Requirements:** `AUTOCHAT-05`, `AUTOCHAT-06`
- **Success Criteria:**
  1. Multiple bots can converse continuously in the channel by replying or mentioning other participant bots.
  2. Conversation history is saved and fetched using Redis/RAM dual-layer cache per channel without bleed.

---

## Progress

| Phase | Milestone | Plans Complete | Status | Completed |
|---|---|---|---|---|
| 1. Reorganization & Cleanup | v1.0 | 3/3 | Complete | 2026-05-18 |
| 2. Code Quality & Linting | v1.0 | 3/3 | Complete | 2026-05-18 |
| 3. Bug Fixes & Optimization | v1.0 | 4/4 | Complete | 2026-05-18 |
| 4. Config & Personalities | v1.1 | 0/2 | Planned | — |
| 5. Core Interaction & Simulation| v1.1 | 0/2 | Planned | — |
| 6. Flow, State & Cache Integration| v1.1 | 0/2 | Planned | — |
