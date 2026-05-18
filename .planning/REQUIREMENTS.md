# Requirements: Milestone v1.1 Advanced AutoChat & Multi-bot Roleplay

## Active Requirements

### Character Roleplay & Personality (AUTOCHAT-CHAR)
- [ ] **AUTOCHAT-01**: The bot MUST support multi-bot character roleplay by defining a customizable character personality (role/prompt) in its JSON configuration file.
- [ ] **AUTOCHAT-02**: The bot MUST inject its configured personality into the Gemini prompt so that the generated responses align perfectly with its role.

### Interaction & Trigger Mechanics (AUTOCHAT-TRIG)
- [ ] **AUTOCHAT-03**: The bot MUST only trigger replies in the designated auto-chat channel when explicitly mentioned (`@bot`) or when another user/bot replies to its previous message.
- [ ] **AUTOCHAT-04**: The bot MUST simulate realistic human typing behavior by displaying a typing indicator (`sendTyping`) and waiting a configurable/random delay (e.g., 5–15 seconds) before sending its reply.

### Conversation Flow & Continuity (AUTOCHAT-FLOW)
- [ ] **AUTOCHAT-05**: The bot MUST support continuous multi-bot conversation flows by occasionally mentioning or replying to other configured selfbots in the channel to keep the dialogue loop alive naturally.
- [ ] **AUTOCHAT-06**: The bot MUST robustly manage conversation history and state per channel utilizing the dual-layer Redis/RAM Cache to prevent context bleed and maintain cohesive chat sessions.

---

## Future Requirements (Deferred)
- **AUTOCHAT-DET**: Advanced anti-detection heuristics (e.g. online presence alignment, random sleep intervals during night hours, custom client spoofing).
- **AUTOCHAT-DASH**: Web dashboard for real-time monitoring and live configuration of bot personality prompts.

---

## Out of Scope
- Captcha Solvers (explicitly out of scope due to security risks and dependency bloat).
- Auto-farming behaviors (out of scope to ensure compliance and avoid bot bans).

---

## Traceability

| Requirement ID | Phase | Plan | Status |
|----------------|-------|------|--------|
| **AUTOCHAT-01**| Phase 4| TBD  | Pending|
| **AUTOCHAT-02**| Phase 4| TBD  | Pending|
| **AUTOCHAT-03**| Phase 5| TBD  | Pending|
| **AUTOCHAT-04**| Phase 5| TBD  | Pending|
| **AUTOCHAT-05**| Phase 6| TBD  | Pending|
| **AUTOCHAT-06**| Phase 6| TBD  | Pending|
