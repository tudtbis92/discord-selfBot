# Phase 4: Config Schema & Personality Injection - Validation Strategy

**Phase:** 04
**Date:** 2026-05-18
**Status:** Ready for planning

## Test Framework

| Property | Value |
|----------|-------|
| Framework | None — project has no test infrastructure |
| Primary Validation | `npm run build` (TypeScript compilation) |
| Manual Verification | Run bot with `autoChat: true` + personality file, confirm Gemini responses match character |

## Validation Requirements

### AUTOCHAT-01: Config Schema Extension

| Test | Type | Command/Assertion | Status |
|------|------|-------------------|--------|
| Configuration interface includes `autoChatCharacter?: string` | Source assertion | `src/typings/typings.ts` contains `autoChatCharacter?: string` | Pending |
| Configuration interface includes `autoChatCharacterName?: string` | Source assertion | `src/typings/typings.ts` contains `autoChatCharacterName?: string` | Pending |
| Configuration interface includes `autoChatBotIDs?: string[]` | Source assertion | `src/typings/typings.ts` contains `autoChatBotIDs?: string[]` | Pending |
| TypeScript compiles without errors | CLI | `npm run build` exits 0 | Pending |
| Personality directory exists | File assertion | `src/config/personalities/` directory exists | Pending |
| Example personality file exists | File assertion | `src/config/personalities/huong.txt` exists and is non-empty | Pending |

### AUTOCHAT-02: Personality Injection

| Test | Type | Command/Assertion | Status |
|------|------|-------------------|--------|
| GeminiService has `setSystemInstruction()` method | Source assertion | `src/structures/GeminiService.ts` contains `setSystemInstruction(` | Pending |
| `cleanResponse()` uses dynamic regex from character name | Source assertion | `src/structures/GeminiService.ts` contains regex construction with character name | Pending |
| BaseAgent loads personality file at startup | Source assertion | `src/structures/BaseAgent.ts` contains `fs.readFileSync` or equivalent in `onReady` | Pending |
| Missing personality file disables autoChat gracefully | Behavior | Bot logs error and sets `autoChat = false` when personality file missing | Pending |
| Hardcoded `HUONG_PERSONALITY_INSTRUCTION` is removed or unused | Source assertion | `HUONG_PERSONALITY_INSTRUCTION` constant is either removed or not referenced in autoChat flow | Pending |

## Validation Commands

```bash
# Primary validation gate
npm run build

# Manual verification steps:
# 1. Add autoChat config to one bot JSON:
#    {
#      "autoChat": true,
#      "autoChatCharacter": "huong.txt",
#      "autoChatCharacterName": "Hương Nguyễn",
#      "autoChatBotIDs": ["<bot1>", "<bot2>", "<bot3>", "<bot4>", "<bot5>"],
#      "autoChatChannelID": "<channel>"
#    }
# 2. Create src/config/personalities/huong.txt with character prompt
# 3. Start bot: pm2 start ecosystem.config.js
# 4. Send message in autoChatChannelID
# 5. Verify bot responds in character (matches personality prompt)
# 6. Verify bot name prefix is stripped from responses
# 7. Test with missing personality file — bot should log error and continue
```

## Nyquist Dimension Coverage

| Dimension | Coverage | Notes |
|-----------|----------|-------|
| 1. Functional Correctness | Partial | Manual verification required — no automated test framework |
| 2. Interface Contracts | Full | TypeScript compilation validates type contracts |
| 3. Data Integrity | Full | Config validation at startup ensures personality file existence |
| 4. Error Handling | Full | Graceful disable on missing personality file (D-02) |
| 5. Performance | N/A | No performance impact expected |
| 6. Security | Partial | Path traversal validation for personality filenames |
| 7. Observability | Full | Logger calls for personality load success/failure |
| 8. Testability | Partial | No automated tests — relies on build gate + manual verification |

## Notes

- This phase is a greenfield extension — all new fields are optional (D-05)
- Primary validation is TypeScript compilation (`npm run build`)
- Manual verification is required for personality injection behavior
- No test framework exists in project — Wave 0 gap noted
- Security: validate `autoChatCharacter` filename does not contain path traversal sequences (`../`)
