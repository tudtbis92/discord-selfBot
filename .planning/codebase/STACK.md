# Tech Stack

**Date:** 2026-05-18

## Languages & Runtimes
- **Runtime:** Node.js >=16
- **Language:** TypeScript 5.6.2, compiled via `tsc` (module type `module`)

## Core Frameworks
- `discord.js-selfbot-v13` (3.5.1): Base framework for Discord API interaction as a selfbot.

## Key Dependencies
- **CLI & Prompts:** `@inquirer/core`, `@inquirer/prompts`, `commander` (for the CLI entry points).
- **HTTP / Requests:** `axios`, `axios-cookiejar-support`, `tough-cookie` (advanced request handling, likely for avoiding rate limits or bypassing basic protection).
- **AI / Generation:** `@google/genai` (Google's Generative AI client).
- **Captcha Solving:** `@2captcha/captcha-solver`, `2captcha` (handling anti-bot challenges).
- **Utilities:** `adm-zip`, `winston` (logging), `chalk` (CLI coloring), `node-notifier` (OS-level notifications).

## Configuration
- Project uses JSON for configuration (`autorun.json`, `darkphoenix1992.json`, etc.) mapped to TypeScript typings (`src/typings/typings.ts`).
- `tsconfig.json` defines the TypeScript compilation settings targeting `dest/index.js`.
