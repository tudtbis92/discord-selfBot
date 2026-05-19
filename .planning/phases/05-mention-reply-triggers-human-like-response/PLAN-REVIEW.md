# Phase 5 Plan Review: 05-01-PLAN.md

**Reviewed:** 2026-05-19
**Plan file:** `.planning/phases/05-mention-reply-triggers-human-like-response/05-01-PLAN.md`
**Reviewer:** Plan Checker (pre-execution)

---

## 1. Requirements Coverage

| Requirement | Covered By | Status |
|-------------|-----------|--------|
| **AUTOCHAT-03** — Only trigger on @mention/reply from known bot IDs | Task 1: `isTrigger()` (channel check, self-check, Set-based bot validation, mention check, reply check), `setupMessageListener()` (calls `isTrigger` before enqueue) | ✅ COVERED |
| **AUTOCHAT-04** — Typing indicator + 5-15s random delay | Task 1: `simulateBurstTyping()` with `ranInt(5000, 15000)` duration, `channel.sendTyping()` in loop with `ranInt(1000, 3000)` pauses; `processQueue()` runs typing parallel to Gemini call | ✅ COVERED |
| **AUTOCHAT-05** — Gemini decides mentions; 0=reply, 1+=standalone | Task 2: `parseAndValidateMentions()` with `/<@!?(\d+)>/g` regex, validation against `knownBotIDs`; `sendResponse()` with `trigger.reply()` for 0 mentions, `channel.send()` for 1+ | ✅ COVERED |

**Verdict:** All 3 phase requirements have dedicated, specific tasks. Frontmatter correctly declares all three requirement IDs.

---

## 2. Decision Adherence (D-01 through D-13)

| Decision | Implementation | Status |
|----------|---------------|--------|
| **D-01** — Strict bot-only validation via `autoChatBotIDs` | Task 1 `isTrigger()`: builds Set, checks `botIDs.has(message.author.id)` | ✅ |
| **D-02** — Non-bot messages silently ignored, zero footprint | Task 1 `isTrigger()`: returns `false` without any logging or side effects | ✅ |
| **D-03** — Other Discord bots also checked against list | Set-based check covers any ID not in `autoChatBotIDs` | ✅ |
| **D-04** — Trigger is mention/reply only | Task 1 `isTrigger()`: only checks `message.mentions.users.has()` and `message.reference?.messageId` | ✅ |
| **D-05** — Burst typing with random pauses | Task 1 `simulateBurstTyping()`: loop with `sendTyping()` + `ranInt(1000, 3000)` pause | ✅ |
| **D-06** — Extend delay on new mention, don't cancel | Task 1 `processQueue()` mentions extension; Task 2 "Distraction extension" section. **See Issue #1 below.** | ⚠️ VAGUE |
| **D-07** — Fixed 5-15s delay range | Task 1: `ranInt(5000, 15000)` | ✅ |
| **D-08** — Gemini uses `<@ID>` format | Task 2: regex `/<@!?(\d+)>/g` | ✅ |
| **D-09** — No `<@ID>` = reply to trigger | Task 2 `sendResponse()`: `validMentions.length === 0` → `trigger.reply()` | ✅ |
| **D-10** — Validate `<@ID>` against list, strip invalid | Task 2 `parseAndValidateMentions()`: validates each ID, strips invalid, collapses spaces | ✅ |
| **D-11** — 0 mentions = reply, 1+ = standalone | Task 2 `sendResponse()`: conditional on `validMentions.length` | ✅ |
| **D-12** — Queue max 3, sequential, drop oldest | Task 1: `MAX_QUEUE = 3`, `isProcessing` guard, `shift()` to drop oldest | ✅ |
| **D-13** — Deduplicate same-bot within 10s | Task 1 `enqueueTrigger()`: `lastProcessed` Map with `DEDUP_WINDOW_MS = 10_000`, replaces pending entry | ✅ |

**Verdict:** 12/13 decisions fully covered. D-06 has a wiring gap (see Issue #1).

---

## 3. Task Quality

| Task | Specificity | Concrete Identifiers | Actionable |
|------|------------|---------------------|------------|
| Task 1 | High | Exact property names, types, method signatures, regex patterns, function calls | ✅ |
| Task 2 | High | Exact regex, method signatures, `allowedMentions` structure, conditional logic | ✅ |
| Task 3 | High | Exact method names to verify, import paths, specific return values to check | ✅ |

All tasks name exact properties (`private queue: Array<{ message: Message; receivedAt: number }>`), exact method signatures (`enqueueTrigger(message: Message): boolean`), exact API calls (`channel.sendTyping()`, `trigger.reply()`), and exact values (`MAX_QUEUE = 3`, `DEDUP_WINDOW_MS = 10_000`). No vague "align with" or "implement auth"-style language found.

**Verdict:** Tasks are specific and actionable.

---

## 4. Read-First Compliance

| Task | `<read_first>` Present | Files Listed |
|------|----------------------|--------------|
| Task 1 | ✅ | 5 files (autoChat.ts, BaseAgent.ts, typings.ts, utils.ts, GeminiService.ts) |
| Task 2 | ✅ | 4 files (autoChat.ts, GeminiService.ts, typings.ts, 05-RESEARCH.md) |
| Task 3 | ✅ | 3 files (autoChat.ts, BaseAgent.ts, 05-RESEARCH.md) |

**Verdict:** All tasks include `<read_first>` with appropriate files.

---

## 5. Acceptance Criteria

| Task | Count | Verifiable? | Subjective? |
|------|-------|-------------|-------------|
| Task 1 | 14 criteria | All are grep-able string/pattern matches or build exit code | ❌ None |
| Task 2 | 13 criteria | All are grep-able string/pattern matches or build exit code | ❌ None |
| Task 3 | 8 criteria | All are grep-able or build exit code | ❌ None |

Examples of good criteria:
- `"src/feats/autoChat.ts contains \`private queue:\` with type \`Array<{ message: Message; receivedAt: number }>\`"` — grep-able
- `"npm run build exits with code 0"` — executable
- `"setupMessageListener() does NOT reference \`handleMentionOrReply\`"` — grep-able negative check

**Verdict:** All acceptance criteria are objective and verifiable.

---

## 6. Action Concreteness

Task 1 action block specifies:
- Exact property declarations with types
- Exact method logic flow (e.g., "Build `Set<string>` from `this.agent.config.autoChatBotIDs ?? []`")
- Exact conditional chains (e.g., "if `lastProcessed.get(senderId)` exists and `now - lastTime < 10_000`")
- Exact API calls (e.g., `await channel.sendTyping()`, `await Promise.all([geminiPromise, typingPromise.catch(() => {})])`)

Task 2 action block specifies:
- Exact regex: `/<@!?(\d+)>/g`
- Exact match extraction: `[...text.matchAll(mentionRegex)]`
- Exact conditional routing: `validMentions.length === 0` → `trigger.reply()`, `>= 1` → `channel.send()`
- Exact `allowedMentions` objects: `{ repliedUser: false }` and `{ users: validMentions }`

Task 3 action block specifies:
- Exact flow to verify: "channel check → self-message check → `isTrigger(message)` → `enqueueTrigger(message)` → `void this.processQueue()`"
- Exact methods to remove: `handleMentionOrReply`
- Exact `getStats()` fields to add/remove

**Verdict:** Action blocks contain concrete identifiers throughout.

---

## 7. Dependencies

**Plan-level:**
- `wave: 1`, `depends_on: ["04-01", "04-02"]` — references Phase 4 plans which are marked complete in ROADMAP.md ✅

**Task-level (within single plan):**
- Task 2 depends on Task 1 output (reads "after Task 1 changes")
- Task 3 depends on Task 1 + Task 2 output (reads "after Task 1 + Task 2 changes")
- Sequential execution within single plan handles this correctly ✅

**Verdict:** Dependencies are valid and acyclic.

---

## 8. Goal Alignment

**Phase goal:** "Rewrite AutoChatManager to only respond to mentions/replies from known bot IDs, with human-like delay and typing indicators. Gemini decides who to @mention next."

| Goal Component | Delivering Task | Status |
|---------------|----------------|--------|
| "only respond to mentions/replies from known bot IDs" | Task 1: `isTrigger()` + `enqueueTrigger()` | ✅ |
| "human-like delay and typing indicators" | Task 1: `simulateBurstTyping()` + `processQueue()` parallel execution | ✅ |
| "Gemini decides who to @mention next" | Task 2: `parseAndValidateMentions()` + `sendResponse()` | ✅ |

**Verdict:** Plan fully delivers the phase goal.

---

## 9. Success Criteria Mapping (from ROADMAP.md)

| # | Success Criterion | Covering Task | Status |
|---|------------------|---------------|--------|
| 1 | Bot only responds when @mentioned or replied-to by sender in `autoChatBotIDs` | Task 1: `isTrigger()` Set validation | ✅ |
| 2 | Bot displays `sendTyping` + waits 5-15s random delay | Task 1: `simulateBurstTyping()` with `ranInt(5000, 15000)` | ✅ |
| 3 | Gemini response includes @mentions; if no mention → reply to trigger | Task 2: `parseAndValidateMentions()` + `sendResponse()` routing | ✅ |
| 4 | Messages from unknown users completely ignored | Task 1: `isTrigger()` silent `return false` (D-02) | ✅ |

**Verdict:** All 4 success criteria addressed.

---

## 10. Research Integration

| RESEARCH.md Pattern | Plan Integration | Status |
|---------------------|-----------------|--------|
| Pattern 1: Burst Typing with Refresh | Task 1 `simulateBurstTyping()` — loop with `sendTyping()` + random pause | ✅ |
| Pattern 2: Mention Extraction & Validation | Task 2 `parseAndValidateMentions()` — same regex, same validation logic | ✅ |
| Pattern 3: FIFO Queue with Deduplication | Task 1 `enqueueTrigger()` — array push/shift, Map for timestamps | ✅ |
| Anti-pattern: Single `sendTyping()` | Avoided — burst loop with random intervals | ✅ |
| Anti-pattern: Fixed-interval typing | Avoided — `ranInt(1000, 3000)` randomization | ✅ |
| Anti-pattern: Cancelling pending responses | Respected — D-06 explicitly says "not cancelled" | ✅ |
| Pitfall 4: Deleted message reference | Addressed — optional chaining on `.cache.get(refId)?.author.id` | ✅ |
| Pitfall 5: Gemini latency adds to delay | Addressed — `Promise.all` parallel execution | ✅ |
| Pitfall 6: Self-message infinite loop | Addressed — self-check in `isTrigger()` | ✅ |
| Don't Hand-Roll: `message.mentions.users.has()` | Used in `isTrigger()` | ✅ |
| Don't Hand-Rool: `ranInt()` | Used throughout for all random values | ✅ |
| Don't Hand-Rool: `Set.has()` | Used in `isTrigger()` and `parseAndValidateMentions()` | ✅ |
| Don't Hand-Rool: `geminiService.generateResponseWithInstruction()` | Called in `processQueue()` | ✅ |
| Don't Hand-Rool: `message.reply()` | Used in `sendResponse()` | ✅ |

**Verdict:** All research patterns, anti-patterns, pitfalls, and "don't hand-roll" recommendations are incorporated.

---

## Issues Found

### Issue #1: D-06 Distraction Extension — Cross-Task Wiring Gap

**Severity:** WARNING
**Dimension:** Task Quality / Key Links Planned
**Affected:** Task 1 + Task 2

D-06 requires extending the delay when another bot messages during processing. The plan splits this across two tasks incompletely:

- **Task 1** (`processQueue()` action) states: "If another message arrives during delay (D-06): extend by `ranInt(3000, 8000)` — the pending response is NOT cancelled" — but `simulateBurstTyping()` has no mechanism to receive or check an extension signal.
- **Task 2** ("Distraction extension" section) states: "check if `isProcessing` is true. If processing, extend the current delay by setting a flag or adding to a running total that `simulateBurstTyping` checks" — but uses ambiguous language ("setting a flag **or** adding to a running total") without committing to one approach.

The `simulateBurstTyping()` method in Task 1 only checks `this.abortTyping` (another underspecified property, see Issue #2). It does not check any extension duration or flag.

**Impact:** The executor must retroactively design the extension mechanism and modify Task 1's `simulateBurstTyping()` to support it. This introduces risk of inconsistent implementation.

**Fix hint:** Commit to one approach (recommended: a `this.typingExtensionMs: number` property that `simulateBurstTyping` checks each loop iteration, and the message handler adds to it when `isProcessing` is true). Specify this in Task 1's `simulateBurstTyping` action and Task 2's distraction extension with exact property names and logic.

---

### Issue #2: `abortTyping` Property Declared Without Clear Usage

**Severity:** WARNING
**Dimension:** Task Completeness
**Affected:** Task 1

Task 1 declares `private abortTyping: (() => void) | null` as a new property and states in `simulateBurstTyping`: "Support abort: check `this.abortTyping` signal each iteration; if set, break loop and reset signal."

However, nothing in any task specifies:
- **Who** sets `this.abortTyping`
- **When** it gets set
- **What** triggers an abort

This appears to be dead code or an incomplete design. If no task sets this signal, the property and the abort check are unused.

**Impact:** Minor — adds dead code to the class. Could confuse the executor or lead to incomplete implementation.

**Fix hint:** Either remove the `abortTyping` property entirely (it's not required by any decision), or specify in Task 2's distraction extension what triggers an abort and how the signal is set.

---

### Issue #3: `splitResponse` Approach Hedged

**Severity:** WARNING (minor)
**Dimension:** Task Quality
**Affected:** Task 2

Task 2 `sendResponse()` action says: "use `geminiService.splitResponse(text)` **or** similar logic to split into multiple messages (GeminiService already has `splitResponse` as private — **alternatively**, split by newlines...)"

This hedges between two approaches without committing. The executor must decide at implementation time, which could lead to inconsistency with the rest of the codebase.

**Impact:** Low — both approaches would work, but the plan should be directive.

**Fix hint:** Commit to one approach. If `splitResponse` is private in GeminiService, recommend the newline-split approach with `ranInt(2000, 5000)` delay between chunks. Remove the hedge.

---

### Issue #4: `autoChatBotIDs` Set Constructed on Every Message (Performance)

**Severity:** INFO
**Dimension:** Task Quality
**Affected:** Task 1

Both `isTrigger()` and `enqueueTrigger()` construct a new `Set<string>` from `this.agent.config.autoChatBotIDs ?? []` on every message. Since this config doesn't change at runtime, the Set could be cached as a class property and rebuilt only when config changes.

**Impact:** Negligible for the expected message volume (5 bots in one channel). Not a correctness issue.

**Fix hint:** Consider adding `private botIDSet: Set<string>` and building it once in `setupAutoChat()` or lazily on first access.

---

## Summary

| Criterion | Status |
|-----------|--------|
| 1. Requirements coverage (AUTOCHAT-03/04/05) | ✅ PASS |
| 2. Decision adherence (D-01 through D-13) | ✅ PASS (D-06 has wiring gap) |
| 3. Task quality (specific, actionable) | ✅ PASS |
| 4. Read-first compliance | ✅ PASS |
| 5. Acceptance criteria (verifiable) | ✅ PASS |
| 6. Action concreteness | ✅ PASS |
| 7. Dependencies (valid, acyclic) | ✅ PASS |
| 8. Goal alignment | ✅ PASS |
| 9. Success criteria mapping (all 4) | ✅ PASS |
| 10. Research integration | ✅ PASS |

**Issues:** 3 warnings, 1 info, 0 blockers.

The plan is well-structured with excellent coverage of all requirements, decisions, and research patterns. The three warnings are implementation ambiguities that the executor can resolve during execution — none of them prevent the phase goal from being achieved.

## PLAN CHECK: PASS
