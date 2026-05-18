# Integrations

**Date:** 2026-05-18

## External APIs & Services
- **Discord API:** Accessed natively via `discord.js-selfbot-v13`. It interacts with Discord as a user account.
- **2Captcha:** Integrated via `@2captcha/captcha-solver` and `2captcha` to automatically solve captcha challenges that might arise during automated usage.
- **Google Generative AI:** Integrated via `@google/genai` to generate chat messages, perform conversation logic, or other automated intelligent responses.
- **OwO Bot (Discord):** The entire application is built to interface directly with the OwO bot on Discord through automated messages and reactions.

## Persistence
- State/Config is maintained in local `.json` files (e.g., `autorun.json` and other individual user/session files like `hongnhung5690.json`).
