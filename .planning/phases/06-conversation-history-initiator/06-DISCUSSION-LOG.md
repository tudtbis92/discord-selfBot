# Phase 6: Conversation History & Initiator - Discussion Log

**Date:** 2026-05-19
**Mode:** Interactive (default)

## Areas Discussed

### 1. History scope & storage

**Question:** How should shared channel history be structured?

**Options presented:**
- New ChannelHistoryManager (Recommended) — Create a new class with Redis key `autochat:history:{channelId}`
- Extend ConversationManager — Add per-channel methods to existing class
- Inline in AutoChatManager — Store history directly using RedisCacheManager

**User selected:** New ChannelHistoryManager, with Redis key `autochat:history:{channelId}` (dropping the `owo:` prefix since the bot no longer serves OwO purposes).

**Follow-up:** User clarified the `owo:` prefix should be removed entirely.

---

### 2. History size & format

**Question:** How much history should be included in the Gemini prompt?

**Research performed:** Searched for Gemini 2.5 Flash Lite and 3.1 Flash Lite rate limits.
- Gemini 2.5 Flash-Lite: Free tier = 15 RPM, 1M TPM
- Gemini 3.1 Flash-Lite: 1M input token context window

**Options presented:**
- Last 10-15 messages (Recommended)
- Last 20-30 messages
- Time-based window

**User selected:** 15-20 messages, based on the rate limit research for Gemini 3.1 Flash Lite and Gemini 2.5 Flash Lite models.

**Follow-up question:** Should history include the current bot's own messages?
- All messages (Recommended) — Include all messages from all 5 bots
- Others only — Only messages from other bots

**User selected:** All messages from all 5 bots.

---

### 3. Initiator bot & timing

**Question:** Which bot should initiate conversations?

**Options presented:**
- Rotating initiator (Recommended) — Round-robin among all 5 bots
- Fixed initiator — One specific bot always starts
- First-to-respond — Any bot can start if channel is quiet

**User selected:** Rotating initiator.

**Follow-up:** How often should the initiator check?
- Every 5-10 min (Recommended)
- Every 1-2 minutes
- Based on autoChatInterval

**User selected:** Every 5-10 minutes, checking if channel has been quiet for 15+ minutes.

**Follow-up:** What if the initiator bot is offline?
- Auto-failover (Recommended) — Next bot takes over after 2x check interval
- Skip until online — Only designated initiator can start

**User selected:** Auto-failover to next bot in rotation.

---

### 4. Topic generation

**Question:** How should the initiator bot generate opening topics?

**Options presented:**
- Gemini-generated (Recommended) — Use Gemini to generate in-character opening
- Predefined topic list — Random selection from curated list
- Hybrid: seed + Gemini — Gemini generates from curated seeds

**User selected:** Gemini-generated, in-character based on personality file.

**Follow-up:** Should the initiator @mention other bots?
- Mention all bots (Recommended) — @mention all 4 other bots
- Mention 1-2 random bots — More natural but may exclude some
- No mentions, general message — Just send to channel

**User selected:** Mention all 4 other bots in the opening message.

---

## Deferred Ideas

- **AUTOCHAT-DET:** Advanced anti-detection heuristics (online presence alignment, random night-mode sleep, client spoofing) — Deferred to a future milestone/phase.
- **AUTOCHAT-DASH:** Web dashboard for real-time monitoring and live personality editing — Deferred.

---

*Discussion completed: 2026-05-19*
