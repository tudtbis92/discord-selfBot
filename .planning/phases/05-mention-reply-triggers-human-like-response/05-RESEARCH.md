# Phase 5: Mention/Reply Triggers & Human-like Response - Research

**Researched:** 2026-05-18
**Domain:** Discord.js selfbot event handling, typing indicators, LLM mention extraction, queue management
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Strict bot-only validation — check `message.author.id` against `autoChatBotIDs`. If not in the list, ignore completely. No "lurk mode" for human messages.
- **D-02:** Non-bot messages are silently ignored — no logging, no reaction, no history storage. Zero footprint.
- **D-03:** Other Discord bots (OwO, MEE6, etc.) are also checked against `autoChatBotIDs`. Only the 5 roleplay bots trigger responses.
- **D-04:** Trigger condition is strictly mention/reply only. Regular messages from known bots in the channel (without @mention or reply) do NOT trigger a response. Matches AUTOCHAT-03 exactly.
- **D-05:** Burst typing pattern — random burst lengths (e.g., 2s typing → random 1-4s pause → 2s typing → send). More unpredictable and human-like. Discord typing indicator needs refresh every ~10s.
- **D-06:** If another bot messages during the delay, extend the delay by a random amount (+3-8s) to simulate being "distracted". The pending response is not cancelled.
- **D-07:** Delay range is fixed at 5-15s. Not configurable per bot. Matches requirement AUTOCHAT-04 exactly.
- **D-08:** Gemini outputs mentions naturally using `<@ID>` format in the response text. The system instruction already has the name-to-ID mapping from Phase 4. Discord renders `<@ID>` as clickable mentions.
- **D-09:** No `<@ID>` pattern found in response = no mention intended. Send the text as-is. Matches AUTOCHAT-05 "if no mention → reply to triggering message".
- **D-10:** Validate all `<@ID>` patterns in Gemini output against `autoChatBotIDs`. Strip any IDs not in the list before sending. Prevents hallucinated mentions.
- **D-11:** Response sending method depends on mention count: 0 mentions = reply to trigger message. 1+ mentions = new standalone message in channel (addressing someone specifically, not replying).
- **D-12:** Use `isProcessingMention` flag with a queue. Max 2-3 mentions queued. If queue is full, drop older ones. Process sequentially — one response at a time.
- **D-13:** Deduplicate same-bot mentions within 10s. If the same bot sends another mention within ~10s of a pending/processing one, treat it as an edit/update and replace the pending trigger.

### the agent's Discretion
- Burst typing interval specifics (exact timing of each burst/pause cycle) — agent to implement a natural-feeling pattern within the described behavior.
- Queue implementation details (array-based, linked list, etc.) — agent to choose the simplest approach that works.

### Deferred Ideas (OUT OF SCOPE)
- **AUTOCHAT-DET:** Advanced anti-detection heuristics (online presence alignment, random night-mode sleep, client spoofing) — Deferred to a future milestone/phase.
- **AUTOCHAT-DASH:** Web dashboard for real-time monitoring and live personality editing — Deferred.
- **AUTOCHAT-06/07:** Shared conversation history via Redis (Phase 6) and conversation initiator mechanism (Phase 6) — separate phases.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTOCHAT-03 | Only trigger replies when explicitly @mentioned or replied-to in `autoChatChannelID`, and only from senders whose ID is in `autoChatBotIDs`. | Mention/reply detection via `message.mentions.users.has()` and `message.reference.messageId`. Sender validation against `autoChatBotIDs` Set. |
| AUTOCHAT-04 | Simulate human-like behavior: display typing indicator (`sendTyping`) + random delay (5-15s) before sending reply. | `channel.sendTyping()` available on TextChannel. Burst typing with ~10s refresh interval. `ranInt()` utility exists. |
| AUTOCHAT-05 | Gemini decides in-character who to @mention next (0 or more bots from `autoChatBotIDs`). If no mention → reply to the message that triggered the response. | Regex `/<@!?(\d+)>/g` for mention extraction. Validation against `autoChatBotIDs`. `message.reply()` for 0-mention case, `channel.send()` for 1+-mention case. |
</phase_requirements>

## Summary

This phase rewrites the `AutoChatManager` in `src/feats/autoChat.ts` to implement strict mention/reply-triggered responses with human-like delay behavior. The existing codebase already has the scaffolding: `isProcessingMention` flag, `setupMessageListener()` with mention/reply detection, `ranInt()` utility, and `geminiService.generateResponseWithInstruction()`. The key work is implementing the burst typing pattern, mention queue with deduplication, and Gemini mention extraction/validation.

**Primary recommendation:** Rewrite `handleMentionOrReply()` with a FIFO queue (array-based, capped at 3), burst typing intervals refreshing every ~8s, and regex-based `<@ID>` extraction validated against the `autoChatBotIDs` Set. Use the existing `geminiService.generateResponseWithInstruction()` for LLM calls.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Mention/Reply detection | Browser / Client | — | `messageCreate` event fires on the Discord client (selfbot), detection happens locally |
| Typing indicator | Browser / Client | — | `sendTyping()` is a client-side API call to Discord |
| Delay/Queue management | Browser / Client | — | In-memory queue and timers run in the Node.js process |
| Gemini LLM response | API / Backend | — | Calls Google's Gemini API for response generation |
| Mention extraction/validation | Browser / Client | — | Regex parsing of LLM output text, validation against local config |
| Message sending | Browser / Client | — | `message.reply()` / `channel.send()` via Discord API |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `discord.js-selfbot-v13` | 3.7.1 [VERIFIED: npm registry] | Discord selfbot client — message events, typing, sending | Already in project, provides `messageCreate`, `sendTyping()`, `message.reply()` |
| `@google/genai` | 2.4.0 [VERIFIED: npm registry] | Gemini API for response generation | Already in project, supports `systemInstruction` and `generateContent` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Built-in `Set<string>` | Node.js native | Fast O(1) lookup for `autoChatBotIDs` validation | Sender validation — replaces array `.includes()` |
| Built-in `Map<string, number>` | Node.js native | Deduplication tracking (sender ID → last processed timestamp) | 10s dedup window per sender |
| Built-in `Array` | Node.js native | FIFO queue for pending mentions | Simple `push()`/`shift()` with length cap |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Array-based queue | `async-mutex` or `p-queue` | Overkill for max 3 items, adds dependency |
| `Set` for bot ID validation | Array `.includes()` | O(n) vs O(1) — Set is cleaner for membership checks |
| Regex mention extraction | Gemini structured output (JSON mode) | More complex prompt engineering; regex is simpler and reliable for `<@ID>` format |

**Installation:** No new packages needed. All dependencies already present in `package.json`.

**Version verification:**
```bash
npm view discord.js-selfbot-v13 version    # → 3.7.1 (matches package.json)
npm view @google/genai version             # → 2.4.0 (matches package.json)
```

## Package Legitimacy Audit

No new packages are introduced by this phase. All required libraries (`discord.js-selfbot-v13`, `@google/genai`) are already installed and verified in the project.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `discord.js-selfbot-v13` | npm | 3+ yrs | 2.1K/wk | github.com/aiko-chan-ai/discord.js-selfbot-v13 | [OK] | Already installed |
| `@google/genai` | npm | 1+ yr | 50K+/wk | github.com/googleapis/js-genai | [OK] | Already installed |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
Discord Channel (autoChatChannelID)
        │
        ▼
┌─────────────────────────────────────────┐
│  messageCreate Event Listener            │
│  ┌───────────────────────────────────┐  │
│  │ 1. Channel check                  │  │
│  │ 2. Self-message check             │  │
│  │ 3. Sender ID ∈ autoChatBotIDs?    │  │
│  │ 4. Is @mention or reply-to-self?  │  │
│  └───────────────────────────────────┘  │
└────────────┬────────────────────────────┘
             │ (trigger passes)
             ▼
┌─────────────────────────────────────────┐
│  Mention Queue (max 3, FIFO)            │
│  ┌───────────────────────────────────┐  │
│  │ Dedup: same sender within 10s?    │  │
│  │   → YES: replace pending trigger  │  │
│  │   → NO: push to queue             │  │
│  │ Queue full? → drop oldest         │  │
│  └───────────────────────────────────┘  │
└────────────┬────────────────────────────┘
             │ (next item dequeued)
             ▼
┌─────────────────────────────────────────┐
│  Burst Typing + Delay (5-15s total)     │
│  ┌───────────────────────────────────┐  │
│  │ Loop:                             │  │
│  │   wait(random 1-3s)               │  │
│  │   sendTyping()                    │  │
│  │   wait(random 2-4s)               │  │
│  │   (refresh ~every 8s)             │  │
│  │   If new mention → extend +3-8s   │  │
│  └───────────────────────────────────┘  │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  Gemini API Call                         │
│  generateResponseWithInstruction(        │
│    trigger.content,                      │
│    systemInstruction (personality +      │
│      bot name→ID mapping)                │
│  )                                       │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  Mention Extraction & Validation         │
│  ┌───────────────────────────────────┐  │
│  │ Regex: /<@!?(\d+)>/g              │  │
│  │ Validate each ID ∈ autoChatBotIDs │  │
│  │ Strip invalid IDs from text       │  │
│  └───────────────────────────────────┘  │
└────────────┬────────────────────────────┘
             │
      ┌──────┴──────┐
      │             │
  0 mentions    1+ mentions
      │             │
      ▼             ▼
  message.reply() channel.send()
  (reply to      (standalone msg
   trigger)       with mentions)
```

### Recommended Project Structure

No new directories needed. All changes are within existing files:

```
src/feats/
└── autoChat.ts        # Rewritten: AutoChatManager with queue, typing, mention extraction
src/structures/
├── BaseAgent.ts       # Unchanged (Phase 4 already wired personality + name mapping)
└── GeminiService.ts   # Unchanged (generateResponseWithInstruction already exists)
src/utils/
└── utils.ts           # Unchanged (ranInt already available)
```

### Pattern 1: Burst Typing with Refresh

**What:** Discord's `sendTyping()` indicator lasts ~10 seconds server-side. To maintain a realistic typing appearance during a 5-15s delay, call `sendTyping()` in a loop with random pauses.

**When to use:** Every time a mention trigger is being processed before sending the response.

**Example:**
```typescript
// Source: discord.js-selfbot-v13 TextBasedChannel.sendTyping() + Discord API docs
// Typing indicator expires after ~10s; refresh every ~8s for safety

private async burstTyping(channel: TextChannel, totalMs: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < totalMs) {
    await channel.sendTyping();
    // Random pause between typing bursts (1-3s)
    const pause = ranInt(1000, 3000);
    await new Promise((resolve) => setTimeout(resolve, pause));
  }
}
```

### Pattern 2: Mention Extraction and Validation

**What:** Extract Discord mention patterns `<@ID>` or `<@!ID>` from Gemini response text, validate each ID against the known bot list, and strip any hallucinated mentions.

**When to use:** After receiving Gemini response, before sending to Discord.

**Example:**
```typescript
// Source: Discord mention format documentation + regex pattern

private extractAndValidateMentions(
  text: string,
  knownBotIDs: Set<string>,
): { cleanedText: string; mentionIDs: string[] } {
  const mentionRegex = /<@!?(\d+)>/g;
  const matches = [...text.matchAll(mentionRegex)];
  const validIDs: string[] = [];

  for (const match of matches) {
    const id = match[1];
    if (knownBotIDs.has(id)) {
      validIDs.push(id);
    }
  }

  // Strip invalid mentions from text
  let cleanedText = text;
  for (const match of matches) {
    const id = match[1];
    if (!knownBotIDs.has(id)) {
      cleanedText = cleanedText.replace(match[0], '');
    }
  }

  return { cleanedText: cleanedText.trim(), mentionIDs: validIDs };
}
```

### Pattern 3: FIFO Queue with Deduplication

**What:** Simple array-based queue capped at 3 items, with a `Map` tracking last-processed timestamps per sender for 10s deduplication.

**When to use:** When a mention/reply trigger passes validation.

**Example:**
```typescript
// Source: Existing isProcessingMention pattern in autoChat.ts + D-12/D-13

interface MentionTrigger {
  message: Message;
  receivedAt: number;
}

private queue: MentionTrigger[] = [];
private lastProcessed: Map<string, number> = new Map();
private readonly MAX_QUEUE = 3;
private readonly DEDUP_WINDOW_MS = 10_000;

private enqueueTrigger(message: Message): boolean {
  const senderId = message.author.id;
  const now = Date.now();

  // Dedup: same sender within window → replace pending
  const lastTime = this.lastProcessed.get(senderId);
  if (lastTime && now - lastTime < this.DEDUP_WINDOW_MS) {
    const existing = this.queue.find((t) => t.message.author.id === senderId);
    if (existing) {
      existing.message = message;
      existing.receivedAt = now;
      return false; // replaced, not new
    }
  }

  if (this.queue.length >= this.MAX_QUEUE) {
    this.queue.shift(); // drop oldest
  }

  this.queue.push({ message, receivedAt: now });
  this.lastProcessed.set(senderId, now);
  return true;
}
```

### Anti-Patterns to Avoid

- **Single `sendTyping()` call:** The typing indicator expires after ~10s. A single call at the start of a 15s delay will show typing for only the first 10s, then appear to "stop typing" before responding — looks robotic.
- **Fixed-interval typing:** Calling `sendTyping()` every exactly 8s is detectable as non-human. Use randomized burst patterns.
- **Cancelling pending responses on new mentions:** D-06 explicitly says "the pending response is not cancelled." Extending delay simulates being "distracted" without losing the original response.
- **Using `message.mentions.has()` without checking channel:** The existing code already checks `message.channel.id !== this.autoChatChannel.id`, but ensure this check runs BEFORE any mention processing.
- **Sending Gemini response with unvalidated mentions:** Gemini may hallucinate user IDs. Always validate `<@ID>` patterns against `autoChatBotIDs` before sending.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Mention detection | Custom string parsing of `@username` | `message.mentions.users.has()` + `message.reference.messageId` | Discord.js already resolves mentions to User objects; handles edited mentions, nickname changes, and `<@!ID>` vs `<@ID>` variants |
| Random delay | Custom RNG wrapper | Existing `ranInt(min, max)` in `src/utils/utils.ts` | Already tested, already imported in autoChat.ts |
| Queue management | Custom linked list or external queue library | Native `Array.push()`/`Array.shift()` | Max 3 items — array is O(1) for these operations at this scale |
| Bot ID validation | Array `.includes()` in hot path | `Set<string>.has()` | O(1) lookup vs O(n); cleaner semantics for membership checks |
| Gemini response generation | Custom HTTP calls to Gemini REST API | `geminiService.generateResponseWithInstruction()` | Already handles API key rotation, retry logic, rate limit backoff, and error parsing |

**Key insight:** The existing codebase already provides 80% of the building blocks. The phase is about wiring them together correctly, not building new infrastructure.

## Common Pitfalls

### Pitfall 1: Typing Indicator Expires After ~10s
**What goes wrong:** A single `sendTyping()` call at the start of a 15s delay shows typing for only the first ~10 seconds, then the indicator disappears. The bot appears to "stop typing" before sending.
**Why it happens:** Discord's API automatically clears the typing indicator after ~10 seconds. This is a server-side limit, not a library bug. [CITED: discord.com/developers/docs/resources/channel]
**How to avoid:** Call `sendTyping()` in a loop with randomized intervals (~6-8s between calls) throughout the entire delay period.
**Warning signs:** Typing indicator visible for exactly 10s then disappears before message appears.

### Pitfall 2: Queue Race Conditions with Concurrent Mentions
**What goes wrong:** Two mentions arrive within milliseconds, both pass the `isProcessingMention` check, and both start processing simultaneously.
**Why it happens:** The `isProcessingMention` flag is checked and set in separate async steps, creating a TOCTOU (time-of-check-time-of-use) race.
**How to avoid:** Check and set the flag atomically within the same synchronous block. Use the queue to buffer incoming triggers while one is processing.
**Warning signs:** Two responses sent back-to-back, or the same trigger processed twice.

### Pitfall 3: Gemini Hallucinates Non-Existent User IDs
**What goes wrong:** Gemini generates `<@999999999999999999>` for a user that doesn't exist in the channel. Discord renders this as a broken mention or raw text.
**Why it happens:** LLMs don't have real-time knowledge of Discord user IDs. Even with the name-to-ID mapping in system instructions, Gemini may invent IDs.
**How to avoid:** Extract all `<@ID>` patterns with regex, validate each ID against `autoChatBotIDs` Set, and strip invalid ones from the response text before sending.
**Warning signs:** Raw `<@123456789>` text in sent messages, or mentions that don't resolve to actual users.

### Pitfall 4: `message.reference.messageId` Points to Deleted Message
**What goes wrong:** A bot replies to a message that was subsequently deleted. `this.autoChatChannel.messages.cache.get(message.reference.messageId)` returns `undefined`, causing a crash when accessing `.author.id`.
**Why it happens:** Discord message cache doesn't contain deleted messages, and the reference still points to the deleted message ID.
**How to avoid:** Use optional chaining: `this.autoChatChannel.messages.cache.get(message.reference.messageId)?.author.id === this.agent.user?.id`. If the referenced message isn't cached, fetch it via API or treat as non-reply trigger.
**Warning signs:** `TypeError: Cannot read properties of undefined (reading 'author')` in logs.

### Pitfall 5: Gemini API Latency Adds to Perceived Delay
**What goes wrong:** The 5-15s delay completes, then Gemini takes another 3-8s to respond. Total delay becomes 8-23s, breaking the human-like illusion.
**Why it happens:** Gemini API response time is variable and depends on prompt complexity, API load, and key rotation.
**How to avoid:** Start the Gemini API call early (during the typing phase, not after the delay completes). Or reduce the random delay range to account for average API latency (e.g., 3-10s delay + 2-5s API = 5-15s total).
**Warning signs:** Consistently longer delays than configured, especially during peak API usage.

### Pitfall 6: `messageCreate` Fires for Own Messages
**What goes wrong:** The bot's own sent messages trigger the `messageCreate` event, potentially causing infinite reply loops.
**Why it happens:** Discord sends `messageCreate` events for all messages in the channel, including those sent by the selfbot itself.
**How to avoid:** The existing code already checks `message.author.id === this.agent.user?.id`. Ensure this check runs before any other processing. Also verify the sender is in `autoChatBotIDs` (D-01), which implicitly excludes self since the bot's own ID is in the list but handled by the self-check.
**Warning signs:** Bot responding to its own messages, exponential message growth.

## Code Examples

Verified patterns from official sources:

### Mention/Reply Detection (discord.js-selfbot-v13)
```typescript
// Source: Context7 /aiko-chan-ai/discord.js-selfbot-v13 — messageCreate event handling
// Combined with existing autoChat.ts pattern

this.agent.on('messageCreate', async (message: Message) => {
  if (!this.autoChatChannel || !this.agent.config.autoChat) return;
  if (message.channel.id !== this.autoChatChannel.id) return;
  if (message.author.id === this.agent.user?.id) return;

  // D-01: Strict bot-only validation
  const botIDs = new Set(this.agent.config.autoChatBotIDs ?? []);
  if (!botIDs.has(message.author.id)) return; // D-02: silently ignored, zero footprint

  // D-04: mention or reply only
  const isMentioned = this.agent.user?.id
    ? message.mentions.users.has(this.agent.user.id)
    : false;
  const isReply = message.reference?.messageId
    ? this.autoChatChannel.messages.cache.get(message.reference.messageId)?.author.id ===
      this.agent.user?.id
    : false;

  if (isMentioned || isReply) {
    this.enqueueTrigger(message);
    void this.processQueue();
  }
});
```

### Burst Typing Pattern
```typescript
// Source: Discord API docs — typing indicator expires after ~10s
// Stack Overflow verified pattern for refresh intervals

private async simulateTyping(channel: TextChannel, durationMs: number): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < durationMs) {
    await channel.sendTyping();
    // Random burst pause: 1-3s between typing calls
    // Total cycle: ~2s typing + 1-3s pause = 3-5s per cycle
    // Refreshes well before the 10s expiry
    const pause = ranInt(1000, 3000);
    await new Promise((resolve) => setTimeout(resolve, pause));
  }
}
```

### Gemini Mention Extraction
```typescript
// Source: Discord mention format: <@ID> or <@!ID>
// Regex verified against Discord documentation

private parseMentions(
  response: string,
  knownBotIDs: Set<string>,
): { text: string; mentions: string[] } {
  const mentionRegex = /<@!?(\d+)>/g;
  const found = [...response.matchAll(mentionRegex)];
  const validMentions: string[] = [];

  for (const match of found) {
    if (knownBotIDs.has(match[1])) {
      validMentions.push(match[1]);
    }
  }

  // Remove invalid/hallucinated mentions
  let cleaned = response;
  for (const match of found) {
    if (!knownBotIDs.has(match[1])) {
      cleaned = cleaned.replace(match[0], '').replace(/\s{2,}/g, ' ');
    }
  }

  return { text: cleaned.trim(), mentions: validMentions };
}
```

### Response Sending Strategy (D-11)
```typescript
// Source: D-11 decision — 0 mentions = reply, 1+ = standalone

private async sendResponse(
  trigger: Message,
  text: string,
  validMentions: string[],
): Promise<void> {
  if (validMentions.length === 0) {
    // D-11: No mentions → reply to the triggering message
    await trigger.reply({ content: text, allowedMentions: { repliedUser: false } });
  } else {
    // D-11: 1+ mentions → standalone message in channel
    await this.autoChatChannel!.send({
      content: text,
      allowedMentions: { users: validMentions },
    });
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Fixed 5s delay before reply | Random 5-15s with burst typing | This phase | More human-like, less detectable |
| Respond to all messages in channel | Only respond to @mention/reply from known bots | This phase | Reduces noise, matches AUTOCHAT-03 |
| Hardcoded personality in GeminiService | Dynamic personality from file + system instruction | Phase 4 | Each bot has unique character |
| No mention validation | Regex extraction + ID validation | This phase | Prevents hallucinated mentions |
| Single sendTyping() call | Burst typing with random refresh intervals | This phase | Typing indicator persists through full delay |

**Deprecated/outdated:**
- `sendRandomChat()`: The old periodic random-chat behavior is being replaced by mention-triggered responses. The method still exists but is DISABLED.
- `autoChatInterval` config: Still used by `checkAndSendRandomChat()` in the main loop, but Phase 5 shifts the primary interaction model to mention-triggered. This config may become irrelevant after Phase 6 adds the conversation initiator.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `sendTyping()` on `discord.js-selfbot-v13` TextChannel behaves identically to discord.js v13 (expires after ~10s) | Pitfall 1, Code Examples | If the selfbot library handles typing differently, burst pattern may need adjustment |
| A2 | `message.mentions.users` is reliably populated for selfbot `messageCreate` events | Pattern 1, Code Examples | If selfbot doesn't populate mentions correctly, detection logic needs API-level parsing |
| A3 | Gemini 2.5-flash responds within 2-5s on average for short prompts | Pitfall 5 | If response times are consistently longer, total delay exceeds human-like range |

## Open Questions

1. **Should the Gemini API call start during the typing delay or after?**
   - What we know: Starting it early reduces total latency but means typing continues after the response is ready. Starting it after means total delay = typing delay + API latency.
   - What's unclear: Whether the burst typing should continue after the API response is received (to mask the exact moment the response was ready).
   - Recommendation: Start Gemini call immediately when processing begins. Continue burst typing until the response is received. This way the total visible delay is `max(typing_duration, api_latency)`, which stays within the 5-15s range for most cases.

2. **How to handle `message.reference.messageId` when the referenced message is not in cache?**
   - What we know: `this.autoChatChannel.messages.cache.get()` may return `undefined` for deleted or uncached messages.
   - What's unclear: Whether fetching the message via API (`channel.messages.fetch()`) is worth the extra latency and API call.
   - Recommendation: Use optional chaining to safely handle `undefined`. If the referenced message isn't cached, treat it as a non-reply trigger (only the @mention path fires). This avoids extra API calls and is safe for the selfbot use case.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | ✓ | v22+ (per package.json engines) | — |
| discord.js-selfbot-v13 | Message events, typing, sending | ✓ | 3.7.1 | — |
| @google/genai | Gemini API calls | ✓ | 2.4.0 | — |
| TypeScript | Compilation | ✓ | 6.0.3 | — |
| npm | Package management | ✓ | 10+ | — |
| Discord API (user token) | All Discord operations | ✓ | — | — |
| Gemini API key | LLM response generation | ✓ | — | Key rotation already built into GeminiService |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** None.

## Validation Architecture

### Test Framework

No test framework is currently configured in the project. `package.json` has `"test": "echo \"Error: no test specified\" && exit 1"`.

| Property | Value |
|----------|-------|
| Framework | None detected |
| Config file | none — see Wave 0 |
| Quick run command | N/A |
| Full suite command | N/A |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| AUTOCHAT-03 | Only responds to @mention/reply from known bot IDs | Manual verification | Run bot, send message from non-bot user, verify no response | ❌ Wave 0 |
| AUTOCHAT-04 | Displays typing + 5-15s random delay before reply | Manual verification | @mention bot, observe typing indicator duration and delay | ❌ Wave 0 |
| AUTOCHAT-05 | Gemini decides mentions; 0 mentions = reply, 1+ = standalone | Manual verification | Trigger multiple responses, verify mention behavior matches Gemini output | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** TypeScript compilation: `npm run build`
- **Per wave merge:** Full build: `npm run build`
- **Phase gate:** `npm run build` passes cleanly, manual Discord testing confirms all 3 requirements

### Wave 0 Gaps

- [ ] No test framework installed — manual Discord testing required for all phase requirements
- [ ] `npm run build` — compilation check serves as the primary automated verification
- [ ] Manual test checklist needed: verify mention detection, typing indicator, delay range, mention extraction, queue behavior

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Selfbot uses user token — no auth flow in this phase |
| V3 Session Management | No | No session handling in this phase |
| V4 Access Control | Yes | Sender validation against `autoChatBotIDs` Set (D-01) — only known bots can trigger responses |
| V5 Input Validation | Yes | Mention ID validation against `autoChatBotIDs` (D-10) — prevents hallucinated/invalid mentions |
| V6 Cryptography | No | No cryptographic operations in this phase |

### Known Threat Patterns for discord.js-selfbot-v13

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Token exposure in logs | Information Disclosure | `logger` does not log message content or user IDs in error paths; D-02 ensures zero footprint for non-bot messages |
| Gemini response injection | Tampering | Mention validation (D-10) strips any `<@ID>` not in `autoChatBotIDs`; system instruction constrains Gemini behavior |
| Queue overflow / DoS | Denial of Service | Queue capped at 3 items (D-12); oldest dropped when full; dedup window prevents same-bot spam |
| Self-message infinite loop | Spoofing | `message.author.id === this.agent.user?.id` check runs first in listener |

## Sources

### Primary (HIGH confidence)
- [Context7 /aiko-chan-ai/discord.js-selfbot-v13](https://context7.com/aiko-chan-ai/discord.js-selfbot-v13) — messageCreate event handling, sendSlash examples, library capabilities
- [discord.js-selfbot-v13 GitHub](https://github.com/aiko-chan-ai/discord.js-selfbot-v13) — SlashCommand examples showing sendTyping context
- [Discord API Documentation — Typing Indicator](https://discord.com/developers/docs/resources/channel#trigger-typing-indicator) — 10s expiry behavior
- [Existing codebase: `src/feats/autoChat.ts`](E:\Saeth\selftBot-owo\src\feats\autoChat.ts) — current AutoChatManager implementation
- [Existing codebase: `src/structures/GeminiService.ts`](E:\Saeth\selftBot-owo\src\structures\GeminiService.ts) — generateResponseWithInstruction, cleanResponse, splitResponse methods
- [Existing codebase: `src/structures/BaseAgent.ts`](E:\Saeth\selftBot-owo\src\structures\BaseAgent.ts) — personality loading, name-to-ID mapping injection
- [Existing codebase: `src/utils/utils.ts`](E:\Saeth\selftBot-owo\src\utils\utils.ts) — ranInt() utility
- [Existing codebase: `src/typings/typings.ts`](E:\Saeth\selftBot-owo\src\typings\typings.ts) — Configuration interface with autoChat fields
- [npm registry: discord.js-selfbot-v13](https://www.npmjs.com/package/discord.js-selfbot-v13) — version 3.7.1 confirmed
- [npm registry: @google/genai](https://www.npmjs.com/package/@google/genai) — version 2.4.0 confirmed

### Secondary (MEDIUM confidence)
- [Stack Overflow: extend typing indicator](https://stackoverflow.com/questions/77884689/trying-to-extend-the-typing-indicator-for-discord-bot) — confirmed 10s limit and refresh pattern
- [discord.js issue #10061](https://github.com/discordjs/discord.js/issues/10061) — confirmed 10s typing limit is Discord API-side, not library-side
- [Javacord Rate Limits](https://javacord.org/wiki/advanced-topics/ratelimits.html) — Discord rate limit reference (5 messages/5s per channel)
- [Phase 4 CONTEXT.md](E:\Saeth\selftBot-owo\.planning\phases\04-config-schema-personality-injection\04-CONTEXT.md) — name-to-ID mapping format, personality loading

### Tertiary (LOW confidence)
- Gemini 2.5-flash average response latency for short prompts — estimated at 2-5s based on general knowledge, not measured

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified via npm registry, already installed in project
- Architecture: HIGH — patterns verified via Context7, Discord API docs, and existing codebase analysis
- Pitfalls: HIGH — typing indicator behavior confirmed via multiple sources (Discord API docs, Stack Overflow, discord.js GitHub issues)
- Mention extraction: HIGH — Discord `<@ID>` format is well-documented; regex pattern is standard
- Queue management: HIGH — simple array-based queue is a well-understood pattern

**Research date:** 2026-05-18
**Valid until:** 2026-06-17 (30 days — Discord.js-selfbot-v13 and Gemini API are stable, no breaking changes expected)
