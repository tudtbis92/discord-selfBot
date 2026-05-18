# Concerns

**Date:** 2026-05-18

## Technical Debt & Issues
- **Selfbot Risk:** The application uses `discord.js-selfbot-v13` to automate a user account. This violates Discord's Terms of Service and carries a high risk of the account being banned.
- **Tight Coupling:** The logic is heavily dependent on specific text patterns and bot responses (OwO bot). If the target bot changes its response formats, this selfbot will break silently or behave unpredictably.
- **No Automated Tests:** The absence of a test suite makes refactoring dangerous, especially given the complex interactions with Discord and external APIs like 2Captcha and Gemini.
- **Dependency on Obsolete Versions:** `discord.js-selfbot-v13` relies on an older structure of `discord.js`. Maintaining and updating this could become increasingly difficult.
- **Credentials/Security:** JSON configs (e.g., `autorun.json`, `darkphoenix1992.json`) store sensitive user tokens in plain text locally. The application needs to ensure these files are ignored in `.gitignore` (which it appears to do, as `autorun.json` is in root but probably ignored).
