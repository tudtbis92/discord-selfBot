# Testing

**Date:** 2026-05-18

## Framework
- **No Test Framework Identified:** The `package.json` contains `"test": "echo \"Error: no test specified\" && exit 1"`. There are no visible test directories (`tests`, `spec`, `__tests__`).

## Structure & Coverage
- Testing is entirely manual. Users run `npm run dev` or `npm start` and verify bot behavior within Discord.
- Features are tightly coupled to the Discord API (`discord.js-selfbot-v13`), meaning automated testing would likely require significant mocking or a dedicated test server environment.
