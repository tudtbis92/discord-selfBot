# selftBot-owo

## What This Is
Discord self-bot / automation bot optimized with Gemini conversational capability, PM2 logging integration, and dual-layer Redis/RAM memory cache.

## Core Value
Cung cấp các tính năng tự động hóa, trò chuyện thông minh sử dụng Gemini API, tối ưu hiệu năng, và quản lý trạng thái mượt mà, ổn định trên Discord.

## Current State
Shipped **v1.0** on 2026-05-18. The project has been fully reorganized, modularized, and strictly typed under modern ESLint Flat Config and TypeScript compile environments.

## Current Milestone: v1.1 Advanced AutoChat & Multi-bot Roleplay

**Goal:** Rewrite core feature autoChat so 5 selfbot processes (1 per Discord account) roleplay as distinct characters and converse naturally in a shared channel — triggered only by mentions/replies, with human-like delays.

**Architecture:** 5 separate PM2 processes. Each process = 1 BaseAgent + 1 Discord token. Bots communicate via Discord events (messageCreate) — no IPC needed.

**Target features:**
- Config schema: `autoChatCharacter`, `autoChatBotIDs`, `autoChatChannelID` per bot JSON
- Character personality injection into Gemini prompts
- Mention/Reply-only trigger (only from known bot IDs)
- Human-like delay (5-15s random) + typing indicator
- Gemini decides in-character who to @mention next
- Shared conversation history via Redis per channel
- Conversation initiator mechanism (one bot starts a topic periodically)

---

## Requirements

### Validated
- ✓ **REFACT-01**: Tái cấu trúc cấu trúc thư mục logic hơn (nhóm theo tính năng hoặc file type) — v1.0
- ✓ **REFACT-02**: Rà soát, áp dụng rules linting/type checking và dọn dẹp các đoạn code rườm rà — v1.0
- ✓ **REFACT-03**: Loại bỏ các dependencies, script và file code rác không còn sử dụng — v1.0
- ✓ **FIX-01**: Khắc phục các lỗi nhỏ (minor bugs) làm giảm trải nghiệm hoặc gây lỗi ngầm — v1.0
- ✓ **FIX-02**: Tối ưu hóa hiệu năng, refactor flow code để chạy mượt mà và an toàn hơn — v1.0

### Active
- [ ] **AUTOCHAT-01**: Extend bot config JSON schema with `autoChatCharacter` (personality prompt), `autoChatBotIDs` (array of participant bot user IDs), and `autoChatChannelID`.
- [ ] **AUTOCHAT-02**: Inject configured character personality into the Gemini system instruction so all generated responses align with the bot's role.
- [ ] **AUTOCHAT-03**: Only trigger replies when explicitly @mentioned or replied-to in `autoChatChannelID`, and only from senders whose ID is in `autoChatBotIDs`.
- [ ] **AUTOCHAT-04**: Simulate human-like behavior: display typing indicator (`sendTyping`) + random delay (5-15s) before sending reply.
- [ ] **AUTOCHAT-05**: Gemini decides in-character who to @mention next (0 or more bots from `autoChatBotIDs`). If no mention → reply to the message that triggered the response.
- [ ] **AUTOCHAT-06**: Manage shared per-channel conversation history via Redis/RAM dual-layer cache so all bots see full context.
- [ ] **AUTOCHAT-07**: Implement conversation initiator: one bot periodically sends an opening message + mentions others to start a new topic.

### Out of Scope
- Captcha Solvers (purged due to security risks and dependency bloat).
- Auto-farming behaviors (out of scope to keep bot focused and compliant).
- Complex UI dashboards (maintained via terminal command inquirer launcher).

---

## Key Decisions

| Decision | Rationale | Status |
|----------|-----------|--------|
| Purge Captcha Solver | Remove dangerous, slow dependencies and minimize codebase size | ✓ Verified |
| Modern ESLint 9+ Config | Enforce clean code and modern standards across the ESM workspace | ✓ Verified |
| Git-only Self Updater | Remove AdmZip dependency, avoid manual zip download errors, and rely on git commands | ✓ Verified |
| Gemini API Multi-key Rotation | Bypass free-tier rate limits and provide resilient conversational responses | ✓ Verified |
| Layered RAM + Redis Cache | Guarantee non-blocking execution and maintain state across PM2 process restarts | ✓ Verified |
| Console-only Winston Transport | Avoid writing to disk log files, letting PM2 manage stderr/stdout logs | ✓ Verified |
| 5 Separate Processes (1 per bot) | Discord events = natural IPC, no orchestrator needed, PM2 crash isolation, fits existing BaseAgent architecture | v1.1 |

---

## Context
- **Codebase Size:** ~7,700 lines of robust TypeScript code.
- **Tech Stack:** Node.js (ESM), TypeScript, discord.js-selfbot-v13, ioredis, @google/generative-ai, winston, commander, inquirer.
- **Next Steps:** Executing v1.1 — AutoChat rewrite with multi-bot roleplay.

---
*Last updated: 2026-05-18 after v1.0 milestone*
