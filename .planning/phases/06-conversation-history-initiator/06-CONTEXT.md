# Phase 6: Conversation History & Initiator - Context

**Gathered:** 2026-05-19
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase implements shared per-channel conversation history via Redis/RAM cache (AUTOCHAT-06) so all 5 bots see full context, and a conversation initiator mechanism (AUTOCHAT-07) where one bot periodically starts a new conversation topic and mentions the others.

</domain>

<decisions>
## Implementation Decisions

### History Scope & Storage
- **D-01:** Create a new `ChannelHistoryManager` class — separate from the existing per-user `ConversationManager`. Clean separation of concerns.
- **D-02:** Redis key format: `autochat:history:{channelId}` (dropping the `owo:` prefix since the bot no longer serves OwO purposes).
- **D-03:** All 5 bots read from and write to the same Redis key. RAM fallback when Redis is unavailable.
- **D-04:** Reuse the existing `RedisCacheManager` infrastructure (already handles connection, get/set/delete, RAM fallback).

### History Size & Format
- **D-05:** Include the last 15-20 messages in the Gemini prompt. ~1-2K tokens per request — well within the TPM limits for both Gemini 3.1 Flash Lite and Gemini 2.5 Flash Lite.
- **D-06:** History format: `Name: content` (e.g., `Hương: hôm nay trời đẹp quá`). Each bot sees all messages from all 5 bots, including its own previous messages.
- **D-07:** Target models: Gemini 3.1 Flash Lite and Gemini 2.5 Flash Lite, using AI Studio API keys. Rate limits: 15 RPM free tier (Flash-Lite), 1M TPM — more than sufficient for 5 bots at 5-15s intervals.

### Initiator Bot & Timing
- **D-08:** Rotating initiator — bots take turns in round-robin fashion. Each bot tracks its position in the rotation via shared Redis state.
- **D-09:** Check interval: every 5-10 minutes. If the channel has been quiet for 15+ minutes, the current initiator starts a new topic.
- **D-10:** Auto-failover: if the designated initiator doesn't respond within 2x the check interval, the next bot in rotation takes over.
- **D-11:** Initiator rotation state stored in Redis key `autochat:initiator:{channelId}` with TTL to handle bot restarts.

### Topic Generation
- **D-12:** Gemini generates the opening topic in-character based on the bot's personality file (from Phase 4). No predefined topic lists.
- **D-13:** Initiator @mentions all 4 other bots in the opening message to ensure full participation from the start.
- **D-14:** Opening message follows the same human-like delay pattern (5-15s random + burst typing) as regular responses.

### the agent's Discretion
- Exact Redis key TTL values for history entries — agent to choose based on expected conversation lifespan.
- Implementation details of the rotation state machine — agent to choose the simplest approach that handles failover correctly.
- How to handle edge cases (e.g., only 2-3 bots online instead of 5) — agent to implement graceful degradation.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Context
- `.planning/PROJECT.md` — Core value, current state, and key architectural decisions
- `.planning/REQUIREMENTS.md` — Active requirements (AUTOCHAT-06, AUTOCHAT-07)
- `.planning/ROADMAP.md` — Current milestone and phase descriptions

### Upstream Phase Context
- `.planning/phases/04-config-schema-personality-injection/04-CONTEXT.md` — Config schema, personality file format, autoChatBotIDs, name-to-ID mapping
- `.planning/phases/05-mention-reply-triggers-human-like-response/05-CONTEXT.md` — AutoChatManager rewrite, queue/dedup, burst typing, mention handling

### Codebase Files
- `src/feats/autoChat.ts` — AutoChatManager class (current implementation with queue, dedup, burst typing)
- `src/structures/RedisCacheManager.ts` — Redis/RAM dual-layer cache infrastructure (get, set, delete, TTL support)
- `src/structures/ConversationManager.ts` — Existing per-user conversation manager (pattern reference, not to be modified)
- `src/structures/GeminiService.ts` — Gemini API integration with system instruction and history support
- `src/structures/BaseAgent.ts` — Bot client structure, config loading, personality injection
- `src/typings/typings.ts` — Configuration interface with autoChat fields
- `src/utils/utils.ts` — Contains `ranInt()` utility for random delays
- `src/utils/logger.js` — Logging utility (logger.info/warn/error/debug)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `RedisCacheManager`: Already provides `get<T>`, `set`, `delete` with TTL support and RAM fallback. Can be directly reused for channel history storage.
- `AutoChatManager`: Already has `simulateBurstTyping()`, `parseAndValidateMentions()`, `sendResponse()` — all reusable for the initiator mechanism.
- `GeminiService`: `generateResponseWithHistory()` accepts history arrays — can be used to inject channel history into the prompt.
- `ranInt()`: Utility for random delays, already imported in autoChat.ts.

### Established Patterns
- Redis/RAM dual-layer cache: Check RAM first, fall back to Redis, populate RAM on cache miss (from ConversationManager).
- Event listeners use `this.agent.on('messageCreate', async (message: Message) => {...})` pattern.
- Async operations use `Promise`-based delays (`new Promise((resolve) => setTimeout(resolve, ms))`).
- Logging uses `logger.info/warn/error/debug` from `src/utils/logger.js`.
- Config validation happens at startup in `BaseAgent.onReady()`.

### Integration Points
- `AutoChatManager` — needs to write each bot's response to the shared channel history after sending.
- `AutoChatManager.processQueue()` — needs to read channel history and inject it into the Gemini prompt.
- New `ChannelHistoryManager` — will be instantiated in `BaseAgent` alongside `AutoChatManager`.
- Initiator mechanism — will run as a periodic check (setInterval) within `AutoChatManager` or as a separate feature module.

</code_context>

<specifics>
## Specific Ideas

- Redis key for channel history: `autochat:history:{channelId}` — stores an array of `{ sender: string, content: string, timestamp: number }` entries.
- Redis key for initiator rotation: `autochat:initiator:{channelId}` — stores `{ currentIndex: number, lastInitiatedAt: number, botId: string }`.
- History trimming: keep last 20 entries in the array, remove oldest on each new message.
- Initiator opening message format: `@Bot1 @Bot2 @Bot3 @Bot4 [in-character opening topic]`
- Quiet channel detection: check if the last message in history is older than 15 minutes.

</specifics>

<deferred>
## Deferred Ideas

- **AUTOCHAT-DET:** Advanced anti-detection heuristics (online presence alignment, random night-mode sleep, client spoofing) — Deferred to a future milestone/phase.
- **AUTOCHAT-DASH:** Web dashboard for real-time monitoring and live personality editing — Deferred.

</deferred>

---

*Phase: 06-Conversation History & Initiator*
*Context gathered: 2026-05-19*
