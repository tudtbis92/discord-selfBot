# selftBot-owo

## What This Is
Discord self-bot / automation bot optimized with Gemini conversational capability, PM2 logging integration, and dual-layer Redis/RAM memory cache.

## Core Value
Cung cấp các tính năng tự động hóa, trò chuyện thông minh sử dụng Gemini API, tối ưu hiệu năng, và quản lý trạng thái mượt mà, ổn định trên Discord.

## Current State
Shipped **v1.0** on 2026-05-18. The project has been fully reorganized, modularized, and strictly typed under modern ESLint Flat Config and TypeScript compile environments.

## Current Milestone: v1.1 Advanced AutoChat & Multi-bot Roleplay

**Goal:** Rewrite core feature autoChat to support multi-bot character roleplay, realistic conversation flows with human-like delays, typing indicators, and mention/reply-only triggers.

**Target features:**
- Multi-bot Character Roleplay & Personalities
- Human-like Delays & Typing Indicators
- Mention/Reply-only Triggers & Conversation Continuity
- Cohesive Multi-bot Chat Flows

---

## Requirements

### Validated
- ✓ **REFACT-01**: Tái cấu trúc cấu trúc thư mục logic hơn (nhóm theo tính năng hoặc file type) — v1.0
- ✓ **REFACT-02**: Rà soát, áp dụng rules linting/type checking và dọn dẹp các đoạn code rườm rà — v1.0
- ✓ **REFACT-03**: Loại bỏ các dependencies, script và file code rác không còn sử dụng — v1.0
- ✓ **FIX-01**: Khắc phục các lỗi nhỏ (minor bugs) làm giảm trải nghiệm hoặc gây lỗi ngầm — v1.0
- ✓ **FIX-02**: Tối ưu hóa hiệu năng, refactor flow code để chạy mượt mà và an toàn hơn — v1.0

### Active
- [ ] **AUTOCHAT-01**: Support multi-bot character roleplay by defining customizable character personalities (role/prompt) in each bot's configuration file.
- [ ] **AUTOCHAT-02**: Implement a human-like delay and typing indicator (sendTyping) when replying to simulate real user behavior.
- [ ] **AUTOCHAT-03**: Only trigger replies when the bot is explicitly mentioned or replied to in the designated auto-chat channel.
- [ ] **AUTOCHAT-04**: Maintain natural, continuous conversation flows between multiple bots by having them mention or reply to other participants/bots in the channel.
- [ ] **AUTOCHAT-05**: Robustly manage conversation history and state per channel to prevent context bleed and keep responses cohesive.

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

---

## Context
- **Codebase Size:** ~7,700 lines of robust TypeScript code.
- **Tech Stack:** Node.js (ESM), TypeScript, discord.js-selfbot-v13, ioredis, @google/generative-ai, winston, commander, inquirer.
- **Next Steps:** Planning v1.1.

---
*Last updated: 2026-05-18 after v1.0 milestone*
