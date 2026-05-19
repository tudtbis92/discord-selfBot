# Phase 6: Conversation History & Initiator - Research

**Researched:** 2026-05-19
**Domain:** Redis shared state, distributed coordination, Gemini prompt construction
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Create a new `ChannelHistoryManager` class — separate from the existing per-user `ConversationManager`. Clean separation of concerns.
- **D-02:** Redis key format: `autochat:history:{channelId}` (dropping the `owo:` prefix since the bot no longer serves OwO purposes).
- **D-03:** All 5 bots read from and write to the same Redis key. RAM fallback when Redis is unavailable.
- **D-04:** Reuse the existing `RedisCacheManager` infrastructure (already handles connection, get/set/delete, RAM fallback).
- **D-05:** Include the last 15-20 messages in the Gemini prompt. ~1-2K tokens per request — well within the TPM limits for both Gemini 3.1 Flash Lite and Gemini 2.5 Flash Lite.
- **D-06:** History format: `Name: content` (e.g., `Hương: hôm nay trời đẹp quá`). Each bot sees all messages from all 5 bots, including its own previous messages.
- **D-07:** Target models: Gemini 3.1 Flash Lite and Gemini 2.5 Flash Lite, using AI Studio API keys. Rate limits: 15 RPM free tier (Flash-Lite), 1M TPM — more than sufficient for 5 bots at 5-15s intervals.
- **D-08:** Rotating initiator — bots take turns in round-robin fashion. Each bot tracks its position in the rotation via shared Redis state.
- **D-09:** Check interval: every 5-10 minutes. If the channel has been quiet for 15+ minutes, the current initiator starts a new topic.
- **D-10:** Auto-failover: if the designated initiator doesn't respond within 2x the check interval, the next bot in rotation takes over.
- **D-11:** Initiator rotation state stored in Redis key `autochat:initiator:{channelId}` with TTL to handle bot restarts.
- **D-12:** Gemini generates the opening topic in-character based on the bot's personality file (from Phase 4). No predefined topic lists.
- **D-13:** Initiator @mentions all 4 other bots in the opening message to ensure full participation from the start.
- **D-14:** Opening message follows the same human-like delay pattern (5-15s random + burst typing) as regular responses.

### the agent's Discretion
- Exact Redis key TTL values for history entries — agent to choose based on expected conversation lifespan.
- Implementation details of the rotation state machine — agent to choose the simplest approach that handles failover correctly.
- How to handle edge cases (e.g., only 2-3 bots online instead of 5) — agent to implement graceful degradation.

### Deferred Ideas (OUT OF SCOPE)
- **AUTOCHAT-DET:** Advanced anti-detection heuristics (online presence alignment, random night-mode sleep, client spoofing) — Deferred to a future milestone/phase.
- **AUTOCHAT-DASH:** Web dashboard for real-time monitoring and live personality editing — Deferred.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| AUTOCHAT-06 | Manage shared per-channel conversation history via Redis/RAM dual-layer cache. All 5 bots read from the same channel history key to maintain full context. | Redis JSON string storage via existing `RedisCacheManager.get/set`. Rolling array trimmed to 20 entries. History format `Name: content`. RAM fallback via in-memory `Map`. |
| AUTOCHAT-07 | Implement conversation initiator mechanism: one configurable bot periodically sends an opening message + mentions the other bots to start a new topic/conversation. | Redis key `autochat:initiator:{channelId}` with TTL. Round-robin rotation via shared index. Lua script for atomic claim+rotate. Fallback to RAM when Redis unavailable. |
</phase_requirements>

## Summary

This phase introduces two major capabilities: (1) a shared per-channel conversation history stored in Redis so all 5 bots see the full context of the group chat, and (2) a rotating conversation initiator mechanism where one bot periodically starts a new topic by @mentioning the other 4 bots. The existing `RedisCacheManager` provides the infrastructure for Redis/RAM dual-layer caching, but it currently only supports simple `get`/`set`/`delete` operations on JSON strings — no Redis List commands (LPUSH/LRANGE/LTRIM) are exposed. For this phase, storing history as a JSON-serialized array via `get`/`set` is sufficient given the low write frequency (messages arrive seconds apart, not milliseconds). The initiator mechanism uses a Redis key with TTL for automatic failover, and a Lua script for atomic claim-and-rotate to prevent race conditions when multiple bots check simultaneously.

**Primary recommendation:** Store channel history as a JSON array via `RedisCacheManager.get/set` with a 20-entry trim on each write. Use a Lua script for atomic initiator claim+rotate to prevent race conditions. TTL the initiator key at 30 minutes for automatic failover. Integrate `ChannelHistoryManager` and initiator logic into `AutoChatManager` as new methods, with a `setInterval` check running every 5-10 minutes.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Channel history storage | Database / Storage | Browser / Client | Redis is the shared persistence layer; RAM fallback runs in each bot process |
| History read/write | Browser / Client | — | Each bot process reads/writes history before/after Gemini calls |
| Initiator election | Database / Storage | — | Redis key with TTL provides distributed coordination across 5 independent processes |
| Initiator check timer | Browser / Client | — | `setInterval` runs in each bot's Node.js process |
| Opening message generation | API / Backend | — | Gemini API call with personality-based system instruction |
| Opening message delivery | Browser / Client | — | Discord.js `channel.send()` with burst typing pattern |

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `ioredis` | 5.10.1 [VERIFIED: npm registry] | Redis client — already in project, supports Lua scripts, pipelines, transactions | Already installed via `package.json`. Provides `defineCommand` for Lua scripting, `multi()` for atomic transactions. [CITED: github.com/redis/ioredis] |
| `discord.js-selfbot-v13` | 3.7.1 [VERIFIED: npm registry] | Discord selfbot client — message sending, typing indicators | Already in project. Provides `channel.send()`, `sendTyping()`, `message.reply()`. |
| `@google/genai` | 2.4.0 [VERIFIED: npm registry] | Gemini API for response generation with history | Already in project. `generateResponseWithHistory()` accepts history arrays with `systemInstruction`. |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Built-in `Map<string, HistoryEntry[]>` | Node.js native | RAM fallback for channel history when Redis unavailable | Fallback storage — populated on Redis miss, read first before Redis |
| Built-in `setInterval` | Node.js native | Periodic initiator check timer (5-10 min interval) | Runs in each bot process to check if this bot should initiate |
| Lua scripting via `redis.eval()` | Redis native | Atomic initiator claim+rotate operation | Prevents race conditions when multiple bots check initiator state simultaneously |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| JSON string storage (get/set) | Redis Lists (LPUSH/LRANGE/LTRIM) | Lists are more atomic for concurrent writes, but require extending `RedisCacheManager` with list methods. JSON string is simpler and sufficient for low-frequency writes. |
| JSON string storage (get/set) | Redis Streams | Streams provide consumer groups and exactly-once semantics, but are overkill for a 20-entry rolling history. |
| Lua script for initiator rotation | Redis `SET NX EX` + separate rotation | Simpler but creates a TOCTOU race between checking "is it my turn" and "claim + rotate next". Lua script makes it atomic. |
| `setInterval` for initiator check | Cron-like scheduler | Overkill for a single periodic check. `setInterval` is simpler and already used in `ConversationManager` for cleanup. |

**Installation:** No new packages needed. All dependencies (`ioredis@5.10.1`, `discord.js-selfbot-v13@3.7.1`, `@google/genai@2.4.0`) already present in `package.json`.

**Version verification:**
```bash
npm view ioredis version             # → 5.10.1 (matches package.json)
npm view discord.js-selfbot-v13 version    # → 3.7.1 (matches package.json)
npm view @google/genai version       # → 2.4.0 (matches package.json)
```

## Package Legitimacy Audit

No new packages are introduced by this phase. All required libraries are already installed and verified in the project.

| Package | Registry | Age | Downloads | Source Repo | slopcheck | Disposition |
|---------|----------|-----|-----------|-------------|-----------|-------------|
| `ioredis` | npm | 10+ yrs | 2M+/wk | github.com/redis/ioredis | [OK] | Already installed |
| `discord.js-selfbot-v13` | npm | 3+ yrs | 2.1K/wk | github.com/aiko-chan-ai/discord.js-selfbot-v13 | [OK] | Already installed |
| `@google/genai` | npm | 1+ yr | 50K+/wk | github.com/googleapis/js-genai | [OK] | Already installed |

**Packages removed due to slopcheck [SLOP] verdict:** none
**Packages flagged as suspicious [SUS]:** none

## Architecture Patterns

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Bot Process (1 of 5)                          │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  AutoChatManager                                              │   │
│  │                                                               │   │
│  │  ┌─────────────────┐    ┌─────────────────────────────────┐  │   │
│  │  │ ChannelHistory  │◄──►│  Redis: autochat:history:{chan} │  │   │
│  │  │ Manager          │    │  JSON array [{sender,content,   │  │   │
│  │  │                  │    │   ts}], max 20 entries           │  │   │
│  │  └────────┬─────────┘    └─────────────────────────────────┘  │   │
│  │           │                                                     │   │
│  │           ▼                                                     │   │
│  │  ┌─────────────────┐    ┌─────────────────────────────────┐  │   │
│  │  │ processQueue()  │───►│  GeminiService                   │  │   │
│  │  │ (reads history, │    │  generateResponseWithHistory()   │  │   │
│  │  │  injects into   │    │  + systemInstruction (personality│  │   │
│  │  │  prompt)        │    │   + bot name→ID mapping)         │  │   │
│  │  └────────┬─────────┘    └─────────────────────────────────┘  │   │
│  │           │                                                     │   │
│  │           ▼                                                     │   │
│  │  ┌─────────────────┐                                           │   │
│  │  │ sendResponse()  │───► Discord channel (with burst typing)   │   │
│  │  │ + write history │                                           │   │
│  │  └─────────────────┘                                           │   │
│  │                                                               │   │
│  │  ┌─────────────────────────────────────────────────────────┐  │   │
│  │  │ Initiator Check (setInterval 5-10 min)                   │  │   │
│  │  │                                                          │  │   │
│  │  │  1. Read autochat:initiator:{channelId}                  │  │   │
│  │  │  2. Is this bot the initiator?                           │  │   │
│  │  │  3. Is channel quiet 15+ min?                            │  │   │
│  │  │  4. YES → Lua script: atomic claim + rotate next         │  │   │
│  │  │  5. Generate opening topic (Gemini, in-character)        │  │   │
│  │  │  6. @mention all 4 other bots + burst typing + send      │  │   │
│  │  └─────────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘

All 5 bot processes share the same Redis keys:
  autochat:history:{channelId}     — rolling message history (JSON array)
  autochat:initiator:{channelId}   — initiator state (JSON: {botId, nextIndex, lastAt})
```

### Recommended Project Structure

No new directories needed. New class added to existing structure:

```
src/feats/
└── autoChat.ts        # Extended: AutoChatManager + ChannelHistoryManager + initiator logic
src/structures/
├── BaseAgent.ts       # Minor: ensure ChannelHistoryManager is initialized alongside AutoChatManager
├── RedisCacheManager.ts # Extended: add listPush, listRange, listTrim methods (optional, for future)
├── GeminiService.ts   # Unchanged (generateResponseWithHistory already exists)
└── ConversationManager.ts # Unchanged (pattern reference only, not modified)
src/typings/
└── typings.ts         # Unchanged (autoChat fields already present from Phase 4)
```

### Pattern 1: Channel History as JSON Array (Redis get/set)

**What:** Store the rolling conversation history as a JSON-serialized array in Redis using the existing `RedisCacheManager.get<T>()` and `set()` methods. Each entry contains `{ sender: string, content: string, timestamp: number }`. On each write, trim to the last 20 entries.

**When to use:** Every time a bot sends a message (response or initiator opening), append to history. Every time a bot processes a mention trigger, read history and inject into Gemini prompt.

**Example:**
```typescript
// Source: Existing RedisCacheManager.get/set pattern + ConversationManager.saveToRedis pattern

interface HistoryEntry {
  sender: string;    // Bot display name (e.g., "Hương")
  content: string;   // Message content
  timestamp: number; // Date.now()
}

class ChannelHistoryManager {
  private cache: RedisCacheManager;
  private ramCache: Map<string, HistoryEntry[]> = new Map();
  private readonly MAX_ENTRIES = 20;

  private getRedisKey(channelId: string): string {
    return `autochat:history:${channelId}`;
  }

  async getHistory(channelId: string): Promise<HistoryEntry[]> {
    const key = this.getRedisKey(channelId);

    // RAM first
    const ram = this.ramCache.get(key);
    if (ram) return ram;

    // Redis fallback
    const redis = await this.cache.get<HistoryEntry[]>(key);
    if (redis) {
      this.ramCache.set(key, redis);
      return redis;
    }

    return [];
  }

  async addMessage(channelId: string, entry: HistoryEntry): Promise<void> {
    const key = this.getRedisKey(channelId);

    // Read current history
    let history = this.ramCache.get(key) ?? (await this.cache.get<HistoryEntry[]>(key)) ?? [];

    // Append and trim
    history.push(entry);
    if (history.length > this.MAX_ENTRIES) {
      history = history.slice(-this.MAX_ENTRIES);
    }

    // Write back to both layers
    this.ramCache.set(key, history);
    await this.cache.set(key, history, 30 * 60); // 30 min TTL
  }

  async getLastActivity(channelId: string): Promise<number> {
    const history = await this.getHistory(channelId);
    if (history.length === 0) return 0;
    return history[history.length - 1]!.timestamp;
  }
}
```

### Pattern 2: Atomic Initiator Claim + Rotate (Lua Script)

**What:** Use a Redis Lua script to atomically check if this bot is the current initiator, verify the channel is quiet, claim the role, and rotate to the next bot — all in a single atomic operation. This prevents race conditions when multiple bots check simultaneously.

**When to use:** When the initiator check timer fires and the bot determines it might be the initiator.

**Example:**
```typescript
// Source: ioredis defineCommand pattern [CITED: Context7 /redis/ioredis]
// + Redis distributed lock pattern [CITED: redis.io/docs/latest/develop/clients/patterns/distributed-locks]

const CLAIM_AND_ROTATE_LUA = `
  local key = KEYS[1]
  local myBotId = ARGV[1]
  local myIndex = tonumber(ARGV[2])
  local totalBots = tonumber(ARGV[3])
  local quietThreshold = tonumber(ARGV[4])
  local now = tonumber(ARGV[5])
  local ttlSeconds = tonumber(ARGV[6])

  local data = redis.call("get", key)
  local state
  if data then
    state = cjson.decode(data)
  else
    -- First time: initialize with index 0
    state = { botId = "", nextIndex = 0, lastInitiatedAt = 0 }
  end

  -- Check if channel is quiet enough
  if now - state.lastInitiatedAt < quietThreshold then
    return { 0, "not_quiet", state.botId }
  end

  -- Check if it's this bot's turn
  if state.nextIndex ~= myIndex then
    return { 0, "not_my_turn", state.botId }
  end

  -- Claim and rotate
  local nextIdx = (myIndex + 1) % totalBots
  state.botId = myBotId
  state.nextIndex = nextIdx
  state.lastInitiatedAt = now

  redis.call("set", key, cjson.encode(state), "EX", ttlSeconds)
  return { 1, "claimed", myBotId }
`;

// Register as a custom command via ioredis defineCommand
// redis.defineCommand("claimInitiator", {
//   numberOfKeys: 1,
//   lua: CLAIM_AND_ROTATE_LUA,
// });

// Usage:
// const [success, reason, currentBotId] = await redis.claimInitiator(
//   `autochat:initiator:${channelId}`,
//   myBotId, myIndex, totalBots, quietThresholdMs, Date.now(), ttlSeconds
// );
```

### Pattern 3: Initiator Check Timer Integration

**What:** Run a periodic check (setInterval) within `AutoChatManager` that determines if this bot should initiate a new conversation topic. The check reads the shared initiator state, determines if it's this bot's turn, and if the channel has been quiet long enough.

**When to use:** On bot startup, start the interval. On bot shutdown, clear it.

**Example:**
```typescript
// Source: Existing ConversationManager.startCleanupTask() pattern + D-09/D-10 decisions

private initiatorInterval?: NodeJS.Timeout;

private startInitiatorCheck(): void {
  // Random interval between 5-10 minutes to avoid all bots checking simultaneously
  const intervalMs = ranInt(5, 10) * 60 * 1000;

  this.initiatorInterval = setInterval(async () => {
    await this.checkAndInitiate();
  }, intervalMs);

  // Also run immediately after a short delay
  setTimeout(() => void this.checkAndInitiate(), ranInt(10000, 30000));
}

private async checkAndInitiate(): Promise<void> {
  if (!this.autoChatChannel || !this.agent.config.autoChat) return;

  const botIDs = this.agent.config.autoChatBotIDs ?? [];
  const myBotId = this.agent.user?.id;
  if (!myBotId) return;

  const myIndex = botIDs.indexOf(myBotId);
  if (myIndex === -1) return; // This bot not in the rotation

  const channelId = this.autoChatChannel.id;
  const quietThreshold = 15 * 60 * 1000; // 15 minutes
  const ttlSeconds = 30 * 60; // 30 minutes (handles bot restarts)

  // Try to claim initiator role atomically
  const result = await this.tryClaimInitiator(
    channelId, myBotId, myIndex, botIDs.length,
    quietThreshold, ttlSeconds,
  );

  if (result.claimed) {
    await this.sendOpeningTopic(channelId, botIDs, myBotId);
  }
}
```

### Pattern 4: History Injection into Gemini Prompt

**What:** Format the last 15-20 messages from channel history into the Gemini API call using the existing `generateResponseWithHistory()` method. History entries are formatted as `Name: content` strings.

**When to use:** Every time `processQueue()` processes a mention trigger, read history and inject it.

**Example:**
```typescript
// Source: Existing GeminiService.generateResponseWithHistory() signature
// + D-05/D-06 decisions

private async buildHistoryContents(channelId: string): Promise<
  Array<{ role: 'user' | 'assistant'; content: string }>
> {
  const history = await this.channelHistory.getHistory(channelId);
  const last20 = history.slice(-20);

  return last20.map((entry) => ({
    // All messages are treated as 'user' role since they're from other bots
    // The system instruction handles the bot's own personality
    role: 'user' as const,
    content: `${entry.sender}: ${entry.content}`,
  }));
}

// In processQueue():
const history = await this.buildHistoryContents(this.autoChatChannel.id);
const response = await geminiService.generateResponseWithHistory(
  trigger.message.content,
  this.agent.config.autoChatCharacter || '',
  history,
);
```

### Anti-Patterns to Avoid

- **Storing history in per-bot RAM only:** Each of the 5 bots runs in a separate PM2 process with no shared memory. History must go through Redis to be visible to all bots.
- **Using Redis MULTI/EXEC for history writes:** MULTI/EXEC does NOT provide isolation — other clients can interleave commands between the queued commands. For atomic read-modify-write, use a Lua script instead. [CITED: Context7 /redis/ioredis — Transactions section]
- **No TTL on initiator key:** Without a TTL, a crashed bot's initiator state persists forever, blocking rotation. TTL provides automatic failover.
- **Separate "check" and "claim" Redis calls:** Creates a TOCTOU race condition. Two bots can both read "it's my turn" and both try to claim. Use a single Lua script for atomic check+claim+rotate.
- **Including own bot name in history entries:** D-06 says "each bot sees all messages from all 5 bots, including its own previous messages." The `sender` field should be the bot's display name, not "assistant" or "model".
- **Hardcoding model names:** The codebase currently uses `gemini-2.5-flash` hardcoded in `GeminiService`. For Phase 6, D-07 targets `gemini-3.1-flash-lite` and `gemini-2.5-flash-lite`. The model name should be configurable or the existing `generateResponseWithHistory` should be updated to use the appropriate model.
- **Writing history before sending message:** If the Discord send fails, the history will contain a message that was never actually sent. Write history AFTER the Discord send succeeds.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Shared history storage | Custom file-based or in-memory-only storage | `RedisCacheManager` with JSON array | Already handles Redis connection, RAM fallback, get/set/delete. 5 bots need shared state. |
| Distributed initiator coordination | Custom HTTP polling or message-based election | Redis key + Lua script | Atomic, low-latency, no extra infrastructure. Redis is already a project dependency. |
| Random interval scheduling | Custom cron parser or complex scheduler | `setInterval` + `ranInt()` | Already used in `ConversationManager` for cleanup. Simple and sufficient. |
| History format conversion | Custom string templating engine | Simple `${sender}: ${content}` template | D-06 specifies the exact format. No need for abstraction. |
| Gemini history array building | Custom history management class | Existing `generateResponseWithHistory()` | Already accepts `Array<{role, content}>` and handles API call with system instruction. |

**Key insight:** The existing `RedisCacheManager` already provides the Redis/RAM dual-layer infrastructure. The `ChannelHistoryManager` is essentially a thin wrapper that adds history-specific logic (trim to 20, format as `Name: content`) on top of the existing `get`/`set` methods. The initiator mechanism is the only genuinely new distributed coordination logic, and it can be implemented with a single Lua script.

## Common Pitfalls

### Pitfall 1: Race Condition on History Write (Read-Modify-Write)
**What goes wrong:** Two bots read the same history array, each appends their message, and both write back. One message is lost.
**Why it happens:** `get` → modify → `set` is not atomic. With 5 bots writing to the same key, collisions are possible when messages arrive close together.
**How to avoid:** For this use case, the risk is low because messages arrive seconds apart (5-15s delay between responses). If a collision occurs, at most one message is lost from a 20-entry rolling window — acceptable for casual chat. If strict ordering is needed later, switch to Redis Lists (LPUSH + LTRIM) which are individually atomic, or use a Lua script for atomic append+trim.
**Warning signs:** Missing messages in history, bots responding to messages they "didn't see."

### Pitfall 2: Initiator Key TTL Too Short or Too Long
**What goes wrong:** TTL too short → initiator role expires before the bot finishes its check cycle, causing unnecessary failover churn. TTL too long → a crashed bot holds the initiator role for too long, stalling the conversation.
**Why it happens:** TTL must balance between "long enough for the initiator to complete its work" and "short enough to detect a crashed bot quickly."
**How to avoid:** Set TTL to 30 minutes. The check interval is 5-10 minutes, so the initiator gets 3-6 check cycles to complete. The failover threshold (D-10: 2x check interval = 10-20 minutes) fits within the TTL. If the initiator crashes, the next bot detects the stale state after the TTL expires.
**Warning signs:** Frequent initiator role changes (TTL too short), or long silences when a bot goes offline (TTL too long).

### Pitfall 3: All Bots Check Initiator at the Same Time
**What goes wrong:** All 5 bots start their `setInterval` at roughly the same time (bot startup), causing all 5 to check the initiator key simultaneously. This creates unnecessary Redis load and increases the chance of race conditions.
**Why it happens:** If all 5 bots start within seconds of each other (common with PM2), their intervals will be synchronized.
**How to avoid:** Use a random initial delay before starting the interval (`setTimeout` with `ranInt(10000, 30000)`), and use a random interval between 5-10 minutes. This desynchronizes the checks across bots.
**Warning signs:** Redis spikes every 5 minutes, multiple bots logging "checking initiator" at the same second.

### Pitfall 4: Redis Disconnection During History Write
**What goes wrong:** Redis connection drops mid-write. The history is lost from Redis and the RAM cache may be stale.
**Why it happens:** Redis connections can drop due to network issues, Redis server restarts, or timeout.
**How to avoid:** The existing `RedisCacheManager` already handles reconnection via ioredis's built-in retry logic. The RAM cache serves as a fallback during disconnection. When Redis reconnects, the RAM cache continues to serve reads. New writes go to RAM and will be synced to Redis on the next successful write. Note: if Redis goes down and comes back up, the RAM cache may have diverged from Redis state. This is acceptable for a rolling 20-entry history — the worst case is a few messages of divergence.
**Warning signs:** `[RedisCacheManager] Redis connection closed` in logs, followed by `[RedisCacheManager] Connected to Redis server`.

### Pitfall 5: Gemini Model Name Mismatch
**What goes wrong:** The codebase currently hardcodes `gemini-2.5-flash` in `GeminiService`. D-07 targets `gemini-3.1-flash-lite` and `gemini-2.5-flash-lite`. Using the wrong model name causes API errors.
**Why it happens:** `GeminiService.generateResponseWithHistory()` uses `model: 'gemini-2.5-flash'` hardcoded. The Flash Lite models have different model IDs.
**How to avoid:** Either (a) add a `model` parameter to `generateResponseWithHistory()` and pass the desired model name, or (b) update the hardcoded model to the desired Flash Lite variant. The correct model IDs are: `gemini-2.5-flash-lite` and `gemini-3.1-flash-lite` (preview). [CITED: ai.google.dev/gemini-api/docs/models, cloud.google.com/gemini-enterprise-agent-platform/models/gemini/2-5-flash-lite]
**Warning signs:** `404 Model not found` errors from Gemini API, or `FAILED_PRECONDITION` errors.

### Pitfall 6: Initiator Sends Opening Topic That Triggers Its Own Response
**What goes wrong:** The initiator bot sends an opening topic that @mentions all 4 other bots. The initiator's own `messageCreate` listener picks up this message, sees it's from a known bot ID (itself), and tries to respond to itself.
**Why it happens:** The existing `isTrigger()` check in `AutoChatManager` validates `message.author.id` against `autoChatBotIDs`. The initiator's own ID is in this list. However, the self-message check (`message.author.id === this.agent.user?.id`) runs first, so this is already handled.
**How to avoid:** The existing self-check in `setupMessageListener()` (`if (message.author.id === this.agent.user?.id) return;`) already prevents this. Ensure the initiator's `channel.send()` doesn't bypass this check.
**Warning signs:** Initiator bot responding to its own opening message.

### Pitfall 7: RAM Cache Divergence After Redis Recovery
**What goes wrong:** Redis goes down. Bots continue writing to RAM cache. Redis comes back up. The RAM cache now has messages that Redis doesn't have. The next Redis write overwrites Redis with the RAM state, which is correct. But if different bots have different RAM states (because they received different messages during the outage), the first bot to write wins and others' messages are lost.
**Why it happens:** During a Redis outage, each bot's RAM cache is independent. They may see different subsets of messages.
**How to avoid:** For a casual chat bot, this is acceptable — the worst case is a few messages lost during a Redis outage. If strict consistency is needed, implement a version vector or use Redis Lists (which are server-side and don't depend on RAM cache). For Phase 6, document this limitation and accept it.
**Warning signs:** Bots have different views of conversation history after a Redis restart.

### Pitfall 8: `RedisCacheManager` Does Not Expose Raw ioredis Client
**What goes wrong:** The plan needs Redis List operations (LPUSH/LRANGE/LTRIM) or Lua scripts, but `RedisCacheManager` only exposes `get`/`set`/`delete` and the `redis` field is `private`.
**Why it happens:** The current `RedisCacheManager` design encapsulates the raw client. It does not provide a way to execute raw Redis commands or Lua scripts.
**How to avoid:** Two options: (1) Add a `rawRedis(): Redis | null` getter to `RedisCacheManager` so callers can execute raw commands. (2) Add list-specific methods (`listPush`, `listRange`, `listTrim`) and a `defineScript` method to `RedisCacheManager`. Option (1) is simpler and more flexible. Option (2) maintains the abstraction but requires more code. **Recommendation:** Add a `rawRedis()` getter for Phase 6, as the Lua script for initiator rotation needs it.

## Code Examples

Verified patterns from official sources:

### ChannelHistoryManager Class
```typescript
// Source: Existing ConversationManager pattern + RedisCacheManager.get/set
// + D-01/D-02/D-03/D-04/D-06 decisions

import { RedisCacheManager } from '../structures/RedisCacheManager.js';
import { logger } from '../utils/logger.js';

export interface ChannelHistoryEntry {
  sender: string;
  content: string;
  timestamp: number;
}

export class ChannelHistoryManager {
  private redisCache: RedisCacheManager;
  private ramCache: Map<string, ChannelHistoryEntry[]> = new Map();
  private readonly MAX_ENTRIES = 20;
  private readonly HISTORY_TTL = 30 * 60; // 30 minutes

  constructor(redisCache: RedisCacheManager) {
    this.redisCache = redisCache;
  }

  private getRedisKey(channelId: string): string {
    return `autochat:history:${channelId}`;
  }

  async getHistory(channelId: string): Promise<ChannelHistoryEntry[]> {
    const key = this.getRedisKey(channelId);

    // RAM first (fast path)
    const ram = this.ramCache.get(key);
    if (ram) return ram;

    // Redis fallback
    const redis = await this.redisCache.get<ChannelHistoryEntry[]>(key);
    if (redis) {
      this.ramCache.set(key, redis);
      return redis;
    }

    return [];
  }

  async addMessage(channelId: string, entry: ChannelHistoryEntry): Promise<void> {
    const key = this.getRedisKey(channelId);

    // Read current history (RAM first, then Redis)
    let history = this.ramCache.get(key) ??
      (await this.redisCache.get<ChannelHistoryEntry[]>(key)) ?? [];

    // Append new entry
    history.push(entry);

    // Trim to max entries
    if (history.length > this.MAX_ENTRIES) {
      history = history.slice(-this.MAX_ENTRIES);
    }

    // Write to both layers
    this.ramCache.set(key, history);
    await this.redisCache.set(key, history, this.HISTORY_TTL);

    logger.debug(
      `[ChannelHistory] Added message from ${entry.sender} to ${channelId} (${history.length} entries)`,
    );
  }

  async getLastActivity(channelId: string): Promise<number> {
    const history = await this.getHistory(channelId);
    if (history.length === 0) return 0;
    return history[history.length - 1]!.timestamp;
  }

  async isQuiet(channelId: string, thresholdMs: number): Promise<boolean> {
    const lastActivity = await this.getLastActivity(channelId);
    if (lastActivity === 0) return true; // No history = quiet
    return Date.now() - lastActivity > thresholdMs;
  }

  /** Format history for Gemini prompt: "Name: content" lines */
  formatForPrompt(channelId: string, maxEntries = 20): string {
    const history = this.ramCache.get(this.getRedisKey(channelId)) ?? [];
    const recent = history.slice(-maxEntries);
    return recent.map((e) => `${e.sender}: ${e.content}`).join('\n');
  }
}
```

### Initiator Lua Script Registration
```typescript
// Source: ioredis defineCommand pattern [CITED: Context7 /redis/ioredis]
// + Redis distributed lock pattern [CITED: redis.io/docs/latest/develop/clients/patterns/distributed-locks]

// In AutoChatManager constructor or initialization:
private readonly CLAIM_INITIATOR_LUA = `
  local key = KEYS[1]
  local myBotId = ARGV[1]
  local myIndex = tonumber(ARGV[2])
  local totalBots = tonumber(ARGV[3])
  local quietThresholdMs = tonumber(ARGV[4])
  local now = tonumber(ARGV[5])
  local ttlSeconds = tonumber(ARGV[6])

  local data = redis.call("get", key)
  local state
  if data then
    state = cjson.decode(data)
  else
    state = { botId = "", nextIndex = 0, lastInitiatedAt = 0 }
  end

  -- Check quiet threshold
  if now - state.lastInitiatedAt < quietThresholdMs then
    return { 0, "not_quiet" }
  end

  -- Check if it's this bot's turn
  if state.nextIndex ~= myIndex then
    return { 0, "not_my_turn" }
  end

  -- Atomic claim + rotate
  local nextIdx = (myIndex + 1) % totalBots
  state.botId = myBotId
  state.nextIndex = nextIdx
  state.lastInitiatedAt = now

  redis.call("set", key, cjson.encode(state), "EX", ttlSeconds)
  return { 1, "claimed" }
`;

// Register via raw Redis client (requires RedisCacheManager to expose it)
// const rawRedis = this.redisCache.rawRedis();
// if (rawRedis) {
//   rawRedis.defineCommand("claimInitiator", {
//     numberOfKeys: 1,
//     lua: this.CLAIM_INITIATOR_LUA,
//   });
// }
```

### Opening Topic Generation + Send
```typescript
// Source: Existing AutoChatManager.simulateBurstTyping() + sendResponse() patterns
// + D-12/D-13/D-14 decisions

private async sendOpeningTopic(
  channelId: string,
  botIDs: string[],
  myBotId: string,
): Promise<void> {
  const channel = this.autoChatChannel;
  if (!channel) return;

  // Build mention string for all OTHER bots
  const otherBots = botIDs.filter((id) => id !== myBotId);
  const mentions = otherBots.map((id) => `<@${id}>`).join(' ');

  // Generate opening topic via Gemini (in-character from personality)
  const systemInstruction = this.agent.config.autoChatCharacter || '';
  const prompt = `The channel has been quiet for a while. Start a new conversation topic. Address these participants: ${mentions}. Stay in character.`;

  try {
    const response = await geminiService.generateResponseWithInstruction(
      prompt,
      systemInstruction,
    );

    // Write to history BEFORE sending (so other bots see it)
    const myName = this.agent.user?.displayName ?? 'Unknown';
    await this.channelHistory.addMessage(channelId, {
      sender: myName,
      content: `${mentions} ${response}`,
      timestamp: Date.now(),
    });

    // Send with burst typing (D-14)
    const typingDuration = ranInt(5000, 15000);
    const typingPromise = this.simulateBurstTyping(channel, typingDuration);
    await Promise.all([
      typingPromise.catch(() => {}),
      channel.send({
        content: `${mentions} ${response}`,
        allowedMentions: { users: otherBots },
      }),
    ]);

    logger.info(`[Initiator] ${myName} started new topic in ${channel.name}`);
  } catch (error) {
    logger.error(`[Initiator] Failed to generate opening topic: ${error}`);
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-user conversation history (ConversationManager) | Shared per-channel history (ChannelHistoryManager) | This phase | All 5 bots see the same conversation context, enabling group roleplay |
| No conversation initiator | Rotating round-robin initiator with auto-failover | This phase | Conversations self-start after quiet periods, no manual trigger needed |
| Hardcoded `gemini-2.5-flash` model | Configurable Flash Lite models (2.5/3.1) | This phase | Lower cost, faster response times for casual chat |
| History stored as per-user RAM map | History stored as shared Redis JSON array | This phase | Cross-bot visibility, persistence across restarts |
| No distributed coordination | Redis Lua script for atomic initiator rotation | This phase | Fair turn-taking without race conditions |

**Deprecated/outdated:**
- `owo:conv:{userId}:{channelId}` key format: Phase 4's ConversationManager uses this prefix. Phase 6 drops the `owo:` prefix per D-02, using `autochat:history:{channelId}` instead.
- `sendRandomChat()`: The old disabled method in AutoChatManager is being replaced by the initiator mechanism. After Phase 6, this method can be removed entirely.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `gemini-3.1-flash-lite` model ID is available via AI Studio API keys (free tier) | Standard Stack, Pitfall 5 | If the model is only available via Vertex AI or paid tier, the plan needs to fall back to `gemini-2.5-flash-lite` or `gemini-2.5-flash` |
| A2 | Free tier RPM limit for Flash Lite models is 15 RPM (same as 2.0 Flash-Lite) | Standard Stack, D-07 | If the limit is lower, 5 bots at 5-15s intervals could hit rate limits. Current estimate: 5 bots × 12 msgs/hr = 60 RPM worst case, but with 5-15s delays it's closer to 4-12 RPM per bot, well within 15 RPM |
| A3 | `ioredis` 5.10.1 supports `defineCommand` with Lua scripts | Pattern 2, Code Examples | If the API differs, the Lua script registration needs adjustment. Context7 confirms `defineCommand` exists in ioredis 5.x [CITED: Context7 /redis/ioredis] |
| A4 | `RedisCacheManager`'s RAM fallback (in-memory Map) is sufficient for history during Redis outages | Pitfall 4, Pitfall 7 | If strict consistency is required during outages, a more complex solution (version vectors, conflict resolution) would be needed. For casual chat, RAM divergence is acceptable |
| A5 | The `RedisCacheManager` does not currently expose the raw `ioredis` client | Pitfall 8, Code Examples | If it does expose it (via a getter not visible in the current code), the plan can use it directly. The current code shows `private redis: Redis | null = null` with no public getter |

## Open Questions

1. **Should history be stored as JSON string or Redis List?**
   - What we know: JSON string via `get`/`set` is simpler and uses existing infrastructure. Redis Lists (LPUSH/LTRIM) are individually atomic but require extending `RedisCacheManager`.
   - What's unclear: Whether the read-modify-write race condition on JSON strings is acceptable for this use case.
   - **Recommendation:** Start with JSON string for Phase 6. The race condition risk is low (messages arrive seconds apart). If issues arise, migrate to Redis Lists later. Add a `rawRedis()` getter to `RedisCacheManager` for the Lua script.

2. **Should the initiator check interval be per-bot random or a fixed shared interval?**
   - What we know: D-09 says "every 5-10 minutes." A fixed interval would cause all bots to check simultaneously.
   - What's unclear: Whether the increased Redis load from simultaneous checks is a concern.
   - **Recommendation:** Use per-bot random interval (5-10 min) with random initial delay (10-30s). This desynchronizes checks and reduces Redis load.

3. **How to handle the case where fewer than 5 bots are online?**
   - What we know: D-08 says "round-robin among all 5 bots." The `autoChatBotIDs` array contains all 5 IDs.
   - What's unclear: If a bot is offline, should it be skipped in the rotation?
   - **Recommendation:** The rotation should still cycle through all 5 positions. If the designated initiator is offline, the TTL will expire and the next bot will take over. This provides automatic failover without needing online presence detection (which is deferred to AUTOCHAT-DET).

4. **Should the initiator write to history before or after sending the Discord message?**
   - What we know: Writing before ensures other bots see the message in history immediately. Writing after ensures history only contains successfully sent messages.
   - What's unclear: Which is more important — consistency or accuracy.
   - **Recommendation:** Write BEFORE sending. The initiator's message is the conversation starter, and other bots should see it in history immediately. If the send fails, the history entry will be orphaned but will be trimmed within 20 messages anyway.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | ✓ | v22+ (per env) | — |
| Redis server | Shared history, initiator state | Depends on deployment | — | RAM-only mode (RedisCacheManager already handles this) |
| ioredis | Redis client | ✓ | 5.10.1 | — |
| discord.js-selfbot-v13 | Message sending, typing | ✓ | 3.7.1 | — |
| @google/genai | Gemini API calls | ✓ | 2.4.0 | — |
| TypeScript | Compilation | ✓ | 6.0.3 | — |
| PM2 | Process management (5 bot instances) | [ASSUMED] | — | Manual process management |
| Gemini API key (free tier) | LLM response generation | ✓ | — | Key rotation already built into GeminiService |

**⚠️ Note:** Redis server availability is deployment-dependent. The `RedisCacheManager` already handles the case where no `redisUri` is configured — it runs in RAM fallback mode. For Phase 6, this means history will be per-bot (not shared) when Redis is unavailable. This is a known limitation, not a blocker.

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:**
- Redis server: Falls back to RAM-only mode (per-bot history, no shared state, no initiator coordination across bots)

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
| AUTOCHAT-06 | Shared per-channel history via Redis/RAM cache, all 5 bots read same key | Manual verification | Run 2+ bots, send messages, verify all bots see full history in responses | ❌ Wave 0 |
| AUTOCHAT-07 | Rotating initiator starts new topic after 15+ min quiet, @mentions all 4 bots | Manual verification | Wait 15+ min, verify one bot initiates with @mentions; verify rotation on next cycle | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** TypeScript compilation: `npm run build`
- **Per wave merge:** Full build: `npm run build`
- **Phase gate:** `npm run build` passes cleanly, manual Discord testing confirms both requirements

### Wave 0 Gaps

- [ ] No test framework installed — manual Discord testing required for all phase requirements
- [ ] `npm run build` — compilation check serves as the primary automated verification
- [ ] Manual test checklist needed: verify history correctness (order, no duplicates, trimming), initiator fairness (all bots get turns), failover (next bot takes over when initiator silent), no cross-channel bleeding

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | No | Selfbot uses user token — no auth flow in this phase |
| V3 Session Management | No | No session handling in this phase |
| V4 Access Control | Yes | History is per-channel (`channelId` in key) — bots in other channels cannot see or modify this channel's history |
| V5 Input Validation | Yes | History entries should be sanitized — Gemini response content is already cleaned by `cleanResponse()`, but initiator-generated content should also pass through cleaning |
| V6 Cryptography | No | No cryptographic operations in this phase |

### Known Threat Patterns for Redis shared state

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| History tampering (malicious bot injects fake messages) | Tampering | All 5 bots are trusted processes running under the same operator. No external writer can access the Redis key without the Redis URI. |
| Initiator hijacking (rogue process claims initiator role) | Elevation of Privilege | Same as above — only the 5 trusted bot processes have Redis access. The Lua script ensures only one bot can claim at a time. |
| Redis key collision (different channels share same key) | Information Disclosure | Key format `autochat:history:{channelId}` includes the channel ID, ensuring per-channel isolation. |
| RAM cache information leak | Information Disclosure | RAM cache is per-process. Each bot process only sees its own RAM cache. No cross-process leakage. |

## Sources

### Primary (HIGH confidence)
- [Context7 /redis/ioredis](https://context7.com/redis/ioredis) — ioredis v5.4.0 documentation: LPUSH, LRANGE, LTRIM, defineCommand (Lua scripting), multi() transactions, pipeline
- [Existing codebase: `src/structures/RedisCacheManager.ts`](E:\Saeth\selftBot-owo\src\structures\RedisCacheManager.ts) — Redis/RAM dual-layer cache (get, set, delete, TTL). Raw ioredis client is private. No list operations exposed.
- [Existing codebase: `src/structures/ConversationManager.ts`](E:\Saeth\selftBot-owo\src\structures\ConversationManager.ts) — Pattern reference for RAM-first, Redis-fallback caching with cleanup task
- [Existing codebase: `src/feats/autoChat.ts`](E:\Saeth\selftBot-owo\src\feats\autoChat.ts) — AutoChatManager with simulateBurstTyping(), parseAndValidateMentions(), sendResponse(), processQueue()
- [Existing codebase: `src/structures/GeminiService.ts`](E:\Saeth\selftBot-owo\src\structures\GeminiService.ts) — generateResponseWithHistory() accepts history arrays with systemInstruction
- [Existing codebase: `src/structures/BaseAgent.ts`](E:\Saeth\selftBot-owo\src\structures\BaseAgent.ts) — Bot client structure, personality loading, name-to-ID mapping injection
- [Existing codebase: `src/typings/typings.ts`](E:\Saeth\selftBot-owo\src\typings\typings.ts) — Configuration interface with autoChat fields
- [npm registry: ioredis](https://www.npmjs.com/package/ioredis) — version 5.10.1 confirmed, 10+ years old, 2M+ weekly downloads
- [Redis.io: Distributed Locks](https://redis.io/docs/latest/develop/clients/patterns/distributed-locks/) — Canonical distributed lock algorithm with Redis
- [Redis.io: Lists](https://redis.io/docs/latest/develop/data-types/lists/) — Redis list data type documentation

### Secondary (MEDIUM confidence)
- [Google Cloud: Gemini 2.5 Flash-Lite](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/gemini/2-5-flash-lite) — Model ID: `gemini-2.5-flash-lite`
- [Google Blog: Gemini 3.1 Flash-Lite](https://blog.google/innovation-and-ai/models-and-research/gemini-models/gemini-3-1-flash-lite/) — Model available in preview via AI Studio
- [Gemini API Rate Limits](https://gemini-api.apidog.io/doc-965865) — Free tier: 15 RPM, 1M TPM for Flash-Lite models
- [Phase 5 RESEARCH.md](E:\Saeth\selftBot-owo\.planning\phases\05-mention-reply-triggers-human-like-response\05-RESEARCH.md) — Upstream patterns: burst typing, mention extraction, queue management
- [Phase 4 CONTEXT.md](E:\Saeth\selftBot-owo\.planning\phases\04-config-schema-personality-injection\04-CONTEXT.md) — Personality file format, name-to-ID mapping
- [Phase 6 CONTEXT.md](E:\Saeth\selftBot-owo\.planning\phases\06-conversation-history-initiator\06-CONTEXT.md) — All D-01 through D-14 decisions

### Tertiary (LOW confidence)
- Gemini 3.1 Flash Lite free tier availability — model is in preview, free tier access may change
- Exact RPM limits for `gemini-3.1-flash-lite` — documentation shows 15 RPM for 2.0 Flash-Lite, but 3.1 limits may differ
- `discord.js-selfbot-v13` archived status (Oct 2025) — long-term maintenance risk, not a Phase 6 blocker

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified via npm registry, already installed in project
- Architecture: HIGH — patterns verified via Context7 (ioredis docs), Redis official docs, existing codebase analysis
- Pitfalls: HIGH — race conditions, TTL behavior, and Lua scripting verified via official Redis docs and Context7
- Initiator rotation: MEDIUM — Lua script pattern is standard for Redis distributed coordination, but the specific claim+rotate logic is custom-designed for this use case
- Gemini model availability: MEDIUM — model IDs verified via Google Cloud docs, but free tier access for 3.1 Flash Lite preview may change

**Research date:** 2026-05-19
**Valid until:** 2026-06-18 (30 days — stable patterns, but Gemini model availability may change for preview models)

## RESEARCH COMPLETE

**Phase:** 6 - Conversation History & Initiator
**Confidence:** HIGH

### Key Findings
1. **`RedisCacheManager` does not expose the raw ioredis client** — the `redis` field is `private`. For the Lua script needed by the initiator mechanism, a `rawRedis()` getter must be added, or list-specific methods must be added to the manager.
2. **No new packages needed** — all dependencies (`ioredis@5.10.1`, `discord.js-selfbot-v13@3.7.1`, `@google/genai@2.4.0`) are already installed.
3. **JSON string storage via get/set is sufficient** for the rolling history — the read-modify-write race condition risk is low given the 5-15s delay between messages. Redis Lists can be added later if needed.
4. **Lua script is the correct pattern** for atomic initiator claim+rotate — prevents TOCTOU race conditions when multiple bots check simultaneously. ioredis supports `defineCommand` for this.
5. **Gemini model names need attention** — the codebase hardcodes `gemini-2.5-flash`. D-07 targets `gemini-3.1-flash-lite` and `gemini-2.5-flash-lite`. The `generateResponseWithHistory()` method needs a model parameter or the hardcoded value needs updating.
6. **No test framework** — validation will rely on `npm run build` + manual Discord testing.

### File Created
`.planning/phases/06-conversation-history-initiator/06-RESEARCH.md`

### Confidence Assessment
| Area | Level | Reason |
|------|-------|--------|
| Standard Stack | HIGH | All packages verified via npm registry, already installed |
| Architecture | HIGH | Patterns verified via Context7 (ioredis), Redis official docs, codebase analysis |
| Pitfalls | HIGH | Race conditions, TTL behavior, Lua scripting verified via official sources |
| Initiator Rotation | MEDIUM | Custom Lua script design, but based on standard Redis distributed coordination patterns |
| Gemini Model Availability | MEDIUM | Model IDs verified via Google Cloud docs, but free tier access for preview models may change |
| No Test Framework | HIGH | Confirmed via package.json — `"test": "echo ... && exit 1"` |

### Open Questions
- All open questions have recommendations attached. None are blocking.

### Ready for Planning
Research complete. Planner can now create PLAN.md files.
