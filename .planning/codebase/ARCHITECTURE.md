# Architecture

**Date:** 2026-05-18

## Core Patterns
- **CLI Entry Point:** `index.ts` uses `commander` to parse CLI arguments, handle generate/import of configs, and initialize the application.
- **Agent Pattern:** The main bot logic is encapsulated in a base agent class (`BaseAgent` in `src/structures/BaseAgent.ts`), which handles the login and registration of events.
- **Handler/Event Pattern:** Interactions and events are dispatched to specific handlers (`src/handler/` e.g., `avatarHandler.ts`, `commandHandler.ts`, `mentionHandler.ts`, `welcomeHandler.ts`).
- **Feature Modules:** Specific tasks or background jobs run as features in `src/feats/` (e.g., `autoChat.ts`, `presence.ts`, `update.ts`).

## Data Flow
1. **Startup:** `index.ts` loads config from JSON or CLI prompts (`Inquirer.ts`).
2. **Initialization:** `BaseAgent.ts` configures the `discord.js-selfbot-v13` client.
3. **Event Registration:** `BaseAgent` registers core Discord events (e.g., `messageCreate`, `ready`).
4. **Execution:** Event handlers process messages (often looking for OwO bot replies), parse them, and invoke commands or external APIs (like 2Captcha or Gemini) based on the current state and configuration.

## Key Abstractions
- `BaseAgent`: Central manager for the Discord client, configuration, and event routing.
- `InquirerConfig`: Handles interactive CLI configuration.
- `ConversationManager` / `gemini.ts` (in `src/structures/`): Abstracts the AI conversation logic for auto-chat functionality.
