# Phase 5: Mention/Reply Triggers & Human-like Response - Context

**Gathered:** 2026-05-18
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase rewrites the `AutoChatManager` in `src/feats/autoChat.ts` to only respond to @mentions and replies from known bot IDs (in `autoChatBotIDs`) within the shared `autoChatChannelID`. It implements human-like delay behavior (5-15s random with burst typing indicator) and integrates Gemini to decide in-character which bots to @mention next. Messages from unknown users and non-roleplay bots are silently ignored.

</domain>

<decisions>
## Implementation Decisions

### Sender Validation
- **D-01:** Strict bot-only validation — check `message.author.id` against `autoChatBotIDs`. If not in the list, ignore completely. No "lurk mode" for human messages.
- **D-02:** Non-bot messages are silently ignored — no logging, no reaction, no history storage. Zero footprint.
- **D-03:** Other Discord bots (OwO, MEE6, etc.) are also checked against `autoChatBotIDs`. Only the 5 roleplay bots trigger responses.
- **D-04:** Trigger condition is strictly mention/reply only. Regular messages from known bots in the channel (without @mention or reply) do NOT trigger a response. Matches AUTOCHAT-03 exactly.

### Typing + Delay Timing
- **D-05:** Burst typing pattern — random burst lengths (e.g., 2s typing → random 1-4s pause → 2s typing → send). More unpredictable and human-like. Discord typing indicator needs refresh every ~10s.
- **D-06:** If another bot messages during the delay, extend the delay by a random amount (+3-8s) to simulate being "distracted". The pending response is not cancelled.
- **D-07:** Delay range is fixed at 5-15s. Not configurable per bot. Matches requirement AUTOCHAT-04 exactly.

### Gemini Mention Extraction
- **D-08:** Gemini outputs mentions naturally using `<@ID>` format in the response text. The system instruction already has the name-to-ID mapping from Phase 4. Discord renders `<@ID>` as clickable mentions.
- **D-09:** No `<@ID>` pattern found in response = no mention intended. Send the text as-is. Matches AUTOCHAT-05 "if no mention → reply to triggering message".
- **D-10:** Validate all `<@ID>` patterns in Gemini output against `autoChatBotIDs`. Strip any IDs not in the list before sending. Prevents hallucinated mentions.
- **D-11:** Response sending method depends on mention count: 0 mentions = reply to trigger message. 1+ mentions = new standalone message in channel (addressing someone specifically, not replying).

### Concurrent Mention Handling
- **D-12:** Use `isProcessingMention` flag with a queue. Max 2-3 mentions queued. If queue is full, drop older ones. Process sequentially — one response at a time.
- **D-13:** Deduplicate same-bot mentions within 10s. If the same bot sends another mention within ~10s of a pending/processing one, treat it as an edit/update and replace the pending trigger.

### the agent's Discretion
- Burst typing interval specifics (exact timing of each burst/pause cycle) — agent to implement a natural-feeling pattern within the described behavior.
- Queue implementation details (array-based, linked list, etc.) — agent to choose the simplest approach that works.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Project Context
- `.planning/PROJECT.md` — Core value, current state, and key architectural decisions
- `.planning/REQUIREMENTS.md` — Active requirements (AUTOCHAT-03, AUTOCHAT-04, AUTOCHAT-05)
- `.planning/ROADMAP.md` — Current milestone and phase descriptions

### Phase 4 Context (upstream decisions)
- `.planning/phases/04-config-schema-personality-injection/04-CONTEXT.md` — Config schema decisions, personality file format, autoChatBotIDs scope, name-to-ID mapping

### Codebase Files
- `src/feats/autoChat.ts` — AutoChatManager class (current implementation with disabled handlers)
- `src/structures/BaseAgent.ts` — Bot client structure, personality loading, geminiService initialization
- `src/structures/GeminiService.ts` — Gemini API integration with system instruction support
- `src/typings/typings.ts` — Configuration interface with autoChat fields
- `src/utils/utils.ts` — Contains `ranInt()` utility for random delays

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AutoChatManager` class in `src/feats/autoChat.ts`: Already has `setupMessageListener()` with mention/reply detection logic, `isProcessingMention` flag (unused), `ranInt()` import for random delays, and `sendTyping()` capability via Discord.js.
- `BaseAgent.ts`: Already loads personality files and resolves bot display names for mention mapping (D-08 from Phase 4). `geminiService.setSystemInstruction()` is wired up.
- `GeminiService.ts`: Has `generateResponseWithInstruction()` and `generateResponseWithHistory()` methods that accept system instructions. `cleanResponse()` handles name prefix removal.

### Established Patterns
- Event listeners use `this.agent.on('messageCreate', async (message: Message) => {...})` pattern in autoChat.ts and mentionHandler.ts.
- Async operations use `Promise`-based delays (`new Promise((resolve) => setTimeout(resolve, ms))`).
- Logging uses `logger.info/warn/error/debug` from `src/utils/logger.js`.
- Config validation happens at startup in `BaseAgent.onReady()`.

### Integration Points
- `AutoChatManager.setupMessageListener()` — needs sender validation against `autoChatBotIDs` and the new delay/typing behavior.
- `AutoChatManager.handleMentionOrReply()` — currently DISABLED (returns `Promise.resolve()`). Needs full implementation with Gemini call, delay, and typing.
- `BaseAgent.onReady()` — already injects name-to-ID mapping into system instruction. The mention decision prompt should leverage this.
- `geminiService.generateResponseWithInstruction()` — will be called with the triggering message content + system instruction that includes character personality + bot mapping.

</code_context>

<specifics>
## Specific Ideas

- Burst typing example flow: receive mention → wait random 2-4s → sendTyping() for 2s → pause random 1-3s → sendTyping() again → send message. Total ~5-15s.
- Mention extraction regex: `/<@!?(\d+)>/g` to find all Discord mention IDs in Gemini output.
- Queue implementation: simple array with `shift()` for FIFO processing, capped at 3 items.
- Deduplication window: 10s per sender ID, tracked via a `Map<string, number>` of last-processed timestamps.

</specifics>

<deferred>
## Deferred Ideas

- **AUTOCHAT-DET:** Advanced anti-detection heuristics (online presence alignment, random night-mode sleep, client spoofing) — Deferred to a future milestone/phase.
- **AUTOCHAT-DASH:** Web dashboard for real-time monitoring and live personality editing — Deferred.
- **AUTOCHAT-06/07:** Shared conversation history via Redis (Phase 6) and conversation initiator mechanism (Phase 6) — separate phases.

</deferred>

---

*Phase: 05-Mention/Reply Triggers & Human-like Response*
*Context gathered: 2026-05-18*
