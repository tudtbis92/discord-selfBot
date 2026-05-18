# Phase 5: Mention/Reply Triggers & Human-like Response - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-18
**Phase:** 05-Mention/Reply Triggers & Human-like Response
**Areas discussed:** Sender validation scope, Typing + delay timing, Gemini mention extraction, Concurrent mention handling

---

## Sender Validation Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Strict bot-only | Check message.author.id against autoChatBotIDs. If not in the list, ignore completely. | ✓ |
| Lurk mode for humans | Log human messages into conversation history for context, but never respond. | |
| Skip validation, trust channel | Only validate that sender is not the bot itself. | |

**User's choice:** Strict bot-only validation

---

| Option | Description | Selected |
|--------|-------------|----------|
| Silent ignore | If a message is from a non-bot user, skip it entirely — no logging, no reaction, no history storage. | ✓ |
| Log at debug level | Log a debug-level entry for monitoring purposes. | |
| React emoji acknowledgment | React with a subtle emoji to acknowledge the message without responding. | |

**User's choice:** Silent ignore — zero footprint for non-bot messages

---

| Option | Description | Selected |
|--------|-------------|----------|
| Check against autoChatBotIDs | Other Discord bots (OwO, MEE6, etc.) are also checked against autoChatBotIDs. Only our 5 roleplay bots count. | ✓ |
| Any bot triggers | Any bot message triggers — including OwO, MEE6, etc. | |
| Separate allowlist | Add a separate autoChatAllowedBots list for non-roleplay bots. | |

**User's choice:** Check against autoChatBotIDs — only the 5 roleplay bots trigger responses

---

| Option | Description | Selected |
|--------|-------------|----------|
| Mention/reply only | Only respond when @mentioned or replied-to by a known bot. Regular messages from other bots are ignored. | ✓ |
| Any bot message triggers | Any message from a known bot in autoChatChannelID triggers a response. | |

**User's choice:** Mention/reply only — matches AUTOCHAT-03 exactly

---

## Typing + Delay Timing

| Option | Description | Selected |
|--------|-------------|----------|
| Typing first, then wait | Send typing immediately, then wait remaining time after typing stops. | |
| Wait first, typing last 2-3s | Wait most of the delay silently, then show typing for 2-3s before sending. | |
| Burst typing intervals | Show typing in short bursts (e.g., 3s typing → pause → 3s typing → send). | ✓ |

**User's choice:** Burst typing intervals — more natural and unpredictable

---

| Option | Description | Selected |
|--------|-------------|----------|
| 3s typing / 2s pause cycles | Fixed pattern cycles. | |
| Random burst lengths | e.g., 2s typing → random 1-4s pause → 2s typing → send. More unpredictable. | ✓ |
| Start + end typing only | Show typing for 2-3s at the start, then long silent pause, then 2-3s typing again. | |

**User's choice:** Random burst lengths — most human-like

---

| Option | Description | Selected |
|--------|-------------|----------|
| Cancel on new message | If another bot messages during the delay, cancel the current response. | |
| Continue regardless | Let the current delay finish and send regardless. | |
| Extend delay slightly | If a new message arrives, extend the delay by another random amount (+3-8s). | ✓ |

**User's choice:** Extend delay slightly — simulates being "distracted"

---

| Option | Description | Selected |
|--------|-------------|----------|
| Fixed 5-15s | Hardcoded 5-15s range. Simple, consistent. | ✓ |
| Configurable per bot | Add autoChatDelayMin and autoChatDelayMax to config JSON. | |
| Dynamic based on response length | Base range 5-15s, but Gemini can subtly vary it based on response length. | |

**User's choice:** Fixed 5-15s — matches requirement exactly

---

## Gemini Mention Extraction

| Option | Description | Selected |
|--------|-------------|----------|
| Natural text with <@ID> | Instruct Gemini to output mentions naturally using <@ID> format. Discord renders them. | ✓ |
| Structured JSON output | Instruct Gemini to output JSON like {"mentions": ["id1"], "text": "..."}. | |
| Post-process name scanning | Let Gemini write naturally with bot names, scan for names, convert to <@ID>. | |

**User's choice:** Natural text with <@ID> — leverages existing name-to-ID mapping from Phase 4

---

| Option | Description | Selected |
|--------|-------------|----------|
| No <@ID> = no mention | No <@ID> found in response = no mention intended. Send text as-is. | ✓ |
| Explicit no-mention marker | Add a special marker like [NO_MENTION] at the start. | |
| Always mention someone | Instruct Gemini to always mention at least one bot. | |

**User's choice:** No <@ID> = no mention — simple and clean

---

| Option | Description | Selected |
|--------|-------------|----------|
| Filter invalid IDs | Scan all <@ID> patterns. Remove any not in autoChatBotIDs before sending. | ✓ |
| Trust Gemini output | Trust Gemini completely. Discord shows raw text for invalid IDs. | |
| System prompt constraint only | Instruct Gemini in system prompt to only use IDs from mapping. | |

**User's choice:** Filter invalid IDs — prevents hallucinated mentions

---

| Option | Description | Selected |
|--------|-------------|----------|
| Reply to trigger message | Use message.reply() so response is threaded under triggering message. | |
| New message in channel | Use channel.send() for standalone message. | |
| Depends on mention count | Reply if 0 mentions; new message if 1+ mentions. | ✓ |

**User's choice:** Depends on mention count — 0 mentions = reply, 1+ mentions = new message

---

## Concurrent Mention Handling

| Option | Description | Selected |
|--------|-------------|----------|
| Queue and process sequentially | Use isProcessingMention flag with a queue. Process one at a time. | ✓ |
| Cancel and restart | If already processing, cancel current and start fresh with new mention. | |
| Allow concurrent processing | Process each mention independently without locking. | |

**User's choice:** Queue and process sequentially — ensures no responses are lost

---

| Option | Description | Selected |
|--------|-------------|----------|
| Max 2-3 queued | Keep max 2-3 mentions in queue. Drop older ones if full. | ✓ |
| Unlimited queue | No limit — process every mention eventually. | |
| Keep only latest | Only keep the latest mention in queue. Replace if new one arrives. | |

**User's choice:** Max 2-3 queued — prevents stale backlog responses

---

| Option | Description | Selected |
|--------|-------------|----------|
| Deduplicate same-bot within 10s | If same bot sends another mention within ~10s, replace the pending trigger. | ✓ |
| No deduplication | Every mention is a separate trigger. | |
| Content-based dedup | Only deduplicate if message content is identical or nearly identical. | |

**User's choice:** Deduplicate same-bot within 10s — avoids redundant responses

---

## the agent's Discretion

- Burst typing interval specifics (exact timing of each burst/pause cycle) — agent to implement a natural-feeling pattern within the described behavior.
- Queue implementation details (array-based, linked list, etc.) — agent to choose the simplest approach that works.

## Deferred Ideas

- **AUTOCHAT-DET:** Advanced anti-detection heuristics (online presence alignment, random night-mode sleep, client spoofing) — Deferred to a future milestone/phase.
- **AUTOCHAT-DASH:** Web dashboard for real-time monitoring and live personality editing — Deferred.
- **AUTOCHAT-06/07:** Shared conversation history via Redis (Phase 6) and conversation initiator mechanism (Phase 6) — separate phases.
