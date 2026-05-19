# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.1 — Advanced AutoChat & Multi-bot Roleplay

**Shipped:** 2026-05-19  
**Phases:** 3 (Phases 4-6) | **Plans:** 6 | **Sessions:** 1  

### What Was Built
- **Dynamic Configuration & Personality Loaders**: Interactive Inquirer configuration CLI extending schema with autoChat variables, paired with a startup loader that uses strict regex to prevent path traversal attempts.
- **Natural Interaction Triggers & Typing Heuristics**: AutoChat trigger loops executing strictly on listed bot user mentions or replies inside target channels, utilizing a FIFO queue (capacity 3) with 10s sender deduplication, and simulating burst typing in parallel with Gemini API prompt generations using `Promise.all` to mask API latency.
- **Redis Shared History Cache & Rotating Initiator**: Dual-layered (RAM + Redis key `autochat:history:{channelId}`) conversation histories format context as `Sender: Content` structures, written *before* Discord sends. Periodic rotating initiator claims slots atomically using a custom Lua script evaluating index turns and quiet thresholds.

### What Worked
- **Event-Driven Process Coordination**: Utilizing natural Discord message event handlers (messageCreate) instead of complex central IPC orchestrators allowed 5 processes to communicate seamlessly with minimal architectural overhead.
- **API and Animation Parallelization**: Spawning typing loops and Gemini generation in parallel with `Promise.all` created a highly premium, lag-free visual typing flow.
- **Atomic Lua Claims**: Evaluating turns and channel quiet thresholds atomically in Redis using a Lua script successfully prevented multiple processes from initiating topics simultaneously.

### What Was Inefficient
- **Conversational Formatting Delays**: Processing long responses (>100 characters) by splitting them into sentences and sending them with individual typing intervals introduced mild latency, which was balanced by scaling the split lengths to sentence boundaries.

### Patterns Established
- **Multi-Process Local Coordination**: Using atomic database tokens (via Redis) to handle state claims across decoupled background workers.
- **Chronological Coherence Guard**: Writing outgoing bot responses to the conversation history *before* calling Discord send to ensure subsequent listener triggers parse historical context in perfect order.

### Key Lessons
1. **Lua Scripts Prevent Multi-Process Collisions**: Local database locks using atomic Redis Lua evaluations are incredibly lightweight and eliminate the need for complicated IPC mechanisms.
2. **Micro-Animations Hide API Latency**: Running typing states and other asynchronous UI indicators in parallel with long-running LLM API queries significantly improves human-like interactions.

---

## Milestone: v1.0 — Refactoring & Clean Up

**Shipped:** 2026-05-18  
**Phases:** 3 (Phases 1-3) | **Plans:** 10 | **Sessions:** 1  

### What Was Built
- **Codebase Clean Up & Reorganization**: Organized project structure into logical directory spaces, uninstalled dead dependencies, and securely ignored root user configuration files in git.
- **Linter & Strict Types Enforcement**: Configured standard ESLint Flat Configuration and Prettier width constraints, fixing exactly 30 strict compiler errors project-wide.
- **Bug Fixes & Dual Caching**: Replaced complex zip self-updaters with a git-only model, designed multi-key round-robin rotation in `ApiKeyManager` with exponential backoffs, and engineered the base layered caching architecture (RedisCacheManager).

### What Worked
- **Winston Console Logging**: Relying purely on console streams let PM2 handle file logs automatically, avoiding duplicate log files and file locking issues.
- **Round-Robin API Rotation**: Resilient API querying with backoff retries prevented free-tier rate exhaustion blockages.

### What Was Inefficient
- **Legacy Code Debt Resolution**: Cataloging and fixing strict TypeScript issues across old files required a substantial amount of manual refactoring, although it ultimately improved general system safety.

### Patterns Established
- **Layered Cache Fallbacks**: Designing cache managers that gracefully slide back to in-memory RAM caches when local databases are unreachable.

### Key Lessons
1. **Console-Only PM2 Log Management**: Letting external process managers deal with disk-level logging output is cleaner and safer than custom code logger write streams.
2. **Git-Only Update Operations**: Offloading archive packaging tasks to native command line tools (like Git) keeps code minimal and avoids node compression issues.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.0 | 1 | 3 | Organized codebase and introduced strict typing & rotation gates |
| v1.1 | 1 | 3 | Developed multi-process roleplay engine with atomic claim scripts |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.0 | 0 | N/A | Removed 5 dead dependencies |
| v1.1 | 0 | N/A | Zero dependency additions (100% clean) |

### Top Lessons (Verified Across Milestones)

1. **Decoupled Architecture Scalability**: Keeping services isolated and utilizing databases (Redis) and events (Discord) for coordination yields highly resilient multi-agent designs.
2. **Prioritizing Minimal Dependencies**: Avoiding unnecessary external npm wrappers (like zip tools or multi-process libraries) keeps the project maintainable and fast.
