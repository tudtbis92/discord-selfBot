# Phase 4: Config Schema & Personality Injection - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in 04-CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-18
**Phase:** 4-Config Schema & Personality Injection
**Areas discussed:** Personality Format, Hardcoded Personality Removal, Config Backward Compatibility, autoChatBotIDs Scope

---

## Personality Format

| Option | Description | Selected |
|--------|-------------|----------|
| **Option A** | Full raw prompt string directly in the config JSON | |
| **Option B** | Structured object (name, age, traits) expanded via template | |
| **Option C** | Separate prompt files pointing to a text file (e.g. `./personalities/huong.txt`) | ✓ |

**User's choice:** Option C (with file path mapped to `src/config/personalities/`).
**Notes:** If the personality file is missing or unreadable, the bot logs an error and disables AutoChat for that specific bot instead of crashing.

---

## Hardcoded Personality Removal

| Option | Description | Selected |
|--------|-------------|----------|
| **Option A** | Pass systemInstruction to constructor; add `autoChatCharacterName` to config for dynamic regex cleaning | ✓ |
| **Option B** | Pass systemInstruction to each handler invocation; use general regex without character names | |

**User's choice:** Option A.
**Notes:** Helps `GeminiService` dynamically initialize per PM2 process and accurately clean response prefixes without risk of false positives.

---

## Config Backward Compatibility

| Option | Description | Selected |
|--------|-------------|----------|
| **Option A** | New autoChat properties are fully optional; perform early validation at program boot | ✓ |
| **Option B** | Fields are mandatory; do not validate config at boot time | |

**User's choice:** Option A.
**Notes:** Out-of-the-box backward compatibility for old JSON configurations is maintained. Early boot warning log alerts user to mistakes without crashing the process.

---

## autoChatBotIDs Scope

| Option | Description | Selected |
|--------|-------------|----------|
| **Option A** | Identical 5-ID arrays across configs; fetch Usernames dynamically at boot for prompt mapping | ✓ |
| **Option B** | Unique 4-ID arrays per config; pass raw IDs to Gemini without mappings | |

**User's choice:** Option A.
**Notes:** Allows copy-pasting the same `autoChatBotIDs` array into all configs, and gives Gemini a clear character name-to-mention mapping at execution time.

---

## the agent's Discretion

- All decisions were explicitly resolved in conversation.

## Deferred Ideas

- **AUTOCHAT-DET:** Advanced anti-detection heuristics (online presence alignment, sleep mode).
- **AUTOCHAT-DASH:** Web monitoring dashboard.
