# Requirements: Milestone v1.1 Advanced AutoChat & Multi-bot Roleplay

## Architecture Decision

**5 separate PM2 processes (1 per Discord account).** Each process runs 1 `BaseAgent` with 1 token. Bots communicate via Discord `messageCreate` events — no IPC needed. Discord channel = natural message bus.

## Active Requirements

### Config & Personality (AUTOCHAT-CFG)
- [ ] **AUTOCHAT-01**: Extend bot config JSON schema with `autoChatCharacter` (personality prompt string), `autoChatBotIDs` (array of the other 4 participant bot user IDs), and `autoChatChannelID` (the shared auto-chat channel). Update TypeScript `Configuration` interface accordingly.
- [ ] **AUTOCHAT-02**: Inject the configured `autoChatCharacter` personality into the Gemini system instruction so all generated responses align with the bot's assigned character role.

### Trigger & Interaction (AUTOCHAT-TRIG)
- [ ] **AUTOCHAT-03**: Only trigger replies when the bot is explicitly @mentioned or replied-to in `autoChatChannelID`, AND the sender's ID is in `autoChatBotIDs`. Ignore all messages from unknown users.
- [ ] **AUTOCHAT-04**: Simulate human-like behavior: display typing indicator (`sendTyping`) + wait a randomized delay (5–15 seconds) before sending the reply.

### Conversation Flow (AUTOCHAT-FLOW)
- [ ] **AUTOCHAT-05**: Gemini decides in-character who to @mention next (0 or more bots from `autoChatBotIDs`). If no mention is decided → reply to the message that originally triggered the response.
- [ ] **AUTOCHAT-06**: Manage shared per-channel conversation history via Redis/RAM dual-layer cache. All 5 bots read from the same channel history key to maintain full context.
- [ ] **AUTOCHAT-07**: Implement conversation initiator mechanism: one configurable bot periodically sends an opening message + mentions the other bots to start a new topic/conversation.

---

## Future Requirements (Deferred)
- **AUTOCHAT-DET**: Advanced anti-detection heuristics (online presence alignment, random night-mode sleep, client spoofing).
- **AUTOCHAT-DASH**: Web dashboard for real-time monitoring and live personality editing.

---

## Out of Scope
- Captcha Solvers (security risks, dependency bloat).
- Auto-farming behaviors (compliance risk).
- Single-process multi-bot orchestrator (rejected — Discord events handle coordination naturally).

---

## Traceability

| Requirement ID | Phase | Plan | Status |
|----------------|-------|------|--------|
| **AUTOCHAT-01**| Phase 4 | TBD  | Pending|
| **AUTOCHAT-02**| Phase 4 | TBD  | Pending|
| **AUTOCHAT-03**| Phase 5 | TBD  | Pending|
| **AUTOCHAT-04**| Phase 5 | TBD  | Pending|
| **AUTOCHAT-05**| Phase 5 | TBD  | Pending|
| **AUTOCHAT-06**| Phase 6 | TBD  | Pending|
| **AUTOCHAT-07**| Phase 6 | TBD  | Pending|
