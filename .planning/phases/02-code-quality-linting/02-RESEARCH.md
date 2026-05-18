# Phase 2: Code Quality & Linting — Research

**Researched:** 2026-05-18T09:54:00+07:00
**Phase Goal:** Đảm bảo toàn bộ dự án có chung chuẩn code và không có lỗi tiềm ẩn.
**Requirement:** REFACT-02

---

## 1. ESLint Flat Config + TypeScript-ESLint Setup

### 1.1 Architecture Decision: ESLint 9+ Flat Config

ESLint 9+ uses the new **flat config** system (`eslint.config.mjs`). The legacy `.eslintrc.*` format is deprecated. For this project (ES Modules with `"type": "module"`), the config file should be `eslint.config.mjs`.

**Key packages to install:**
```
eslint                          # Core linter (v9+)
@eslint/js                      # ESLint's built-in JS rules preset
typescript-eslint               # Unified package for TS support (replaces @typescript-eslint/parser + @typescript-eslint/eslint-plugin)
eslint-config-prettier          # Disables ESLint rules that conflict with Prettier
```

### 1.2 Strict Type-Checked Configuration

Per decision **D-02** (strict linting), the project should use `tseslint.configs.strictTypeChecked` which includes:
- `recommended` — baseline rules
- `recommended-type-checked` — type-aware rules (e.g., `no-floating-promises`, `no-misused-promises`)
- `strict` — opinionated non-type rules (e.g., `no-explicit-any`, `no-non-null-assertion`)
- `strict-type-checked` — the full strict + type-aware ruleset

**Recommended config structure:**
```javascript
// eslint.config.mjs
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier/flat";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  eslintConfigPrettier,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    ignores: ["dest/", "node_modules/", "*.js", "*.mjs", "*.cjs"],
  }
);
```

### 1.3 Critical Rules for This Project

Based on CONTEXT.md decisions (D-01, D-02) and codebase concerns:

| Rule | Purpose | Severity |
|------|---------|----------|
| `@typescript-eslint/no-explicit-any` | Ban loose `any` types (D-02) | error |
| `@typescript-eslint/no-floating-promises` | Catch unhandled promise rejections | error |
| `@typescript-eslint/no-misused-promises` | Prevent async in non-async contexts | error |
| `@typescript-eslint/no-unsafe-assignment` | Flag unsafe `any` propagation | error |
| `@typescript-eslint/no-unsafe-call` | Flag calling `any`-typed values | error |
| `@typescript-eslint/no-unsafe-member-access` | Flag member access on `any` | error |
| `@typescript-eslint/no-unsafe-return` | Flag returning `any` from typed functions | error |
| `@typescript-eslint/require-await` | Ensure async functions use await | warn |
| `@typescript-eslint/no-unused-vars` | Catch unused variables (extends TS flag) | error |

**Note:** `strictTypeChecked` already enables all of the above. Custom overrides may be needed to downgrade some to `warn` initially if the codebase has too many violations.

### 1.4 ESLint + ES Modules Consideration

The project uses `.js` extensions in imports (e.g., `import { logger } from "./src/utils/logger.js"`). This is correct for NodeNext module resolution and does not conflict with ESLint. The `typescript-eslint` parser handles `.ts` files natively.

**Important:** `rootDir` in tsconfig is set to `./` (project root), which means ESLint type-checking needs `projectService: true` (auto-detects tsconfig) rather than explicit `project` paths.

---

## 2. Prettier Configuration

### 2.1 Prettier Settings

Per decision **D-01** and specific ideas from CONTEXT.md (4 spaces indentation):

```jsonc
// .prettierrc
{
  "printWidth": 100,
  "tabWidth": 4,
  "useTabs": false,
  "semi": true,
  "singleQuote": true,
  "quoteProps": "as-needed",
  "trailingComma": "all",
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "auto"
}
```

### 2.2 Prettier Ignore File

```
# .prettierignore
dest/
node_modules/
*.json
```

### 2.3 ESLint ↔ Prettier Integration

`eslint-config-prettier/flat` must be the **last** entry in the ESLint config array. This disables all ESLint formatting rules that would conflict with Prettier (indent, quotes, semi, etc.).

**Critical caveat:** When using `eslint-config-prettier`, plugin names must use their standard names (e.g., `@typescript-eslint`), not custom aliases. The `typescript-eslint` unified package handles this correctly.

---

## 3. TypeScript Strict Flags

### 3.1 Current State

The current `tsconfig.json` already has:
- `"strict": true` ✓ (enables noImplicitAny, strictNullChecks, etc.)
- `"allowUnusedLabels": false` ✓
- `"allowUnreachableCode": false` ✓
- `"isolatedModules": true` ✓

### 3.2 Missing Flags (Decision D-03)

The following flags need to be **enabled** per D-03:

| Flag | Current | Target | Impact |
|------|---------|--------|--------|
| `noUnusedLocals` | commented out | `true` | Will flag unused local variables as errors |
| `noUnusedParameters` | commented out | `true` | Will flag unused function parameters as errors |
| `noImplicitReturns` | commented out | `true` | Will require explicit return in all code paths |
| `noFallthroughCasesInSwitch` | commented out | `true` | Will require break/return in switch cases |

### 3.3 Impact Assessment

Enabling these flags will likely produce compile errors in existing code. The approach should be:
1. Enable all flags in `tsconfig.json`
2. Run `tsc --noEmit` to identify all errors
3. Fix errors as part of the refactoring tasks (D-04)

**Common fix patterns:**
- `noUnusedLocals` → prefix with `_` or remove
- `noUnusedParameters` → prefix with `_` or remove
- `noImplicitReturns` → add explicit `return undefined` or restructure
- `noFallthroughCasesInSwitch` → add `break` statements

---

## 4. npm Scripts Integration

### 4.1 Script Design (Decisions D-05, D-06)

```jsonc
{
  "scripts": {
    "lint": "eslint src/",
    "lint:fix": "eslint src/ --fix",
    "format": "prettier --write \"src/**/*.ts\" \"index.ts\"",
    "format:check": "prettier --check \"src/**/*.ts\" \"index.ts\"",
    "build": "npm run lint && npm run format:check && tsc",
    "dev": "npm run build && npm start",
    "start": "node dest/index.js",
    "setup": "npm install"
  }
}
```

**Key design decisions:**
- `build` runs `lint → format:check → tsc` in sequence (D-06). Any failure blocks the build.
- `format:check` (not `format:write`) in build — build should not auto-modify files, only validate.
- `lint:fix` and `format` are separate manual commands for developer convenience.

---

## 5. Refactoring Strategy

### 5.1 Core Areas (Decision D-04)

**Area 1: Core flow — `src/structures/BaseAgent.ts` + `src/handler/`**
- BaseAgent manages login, connection lifecycle, and Discord event registration
- Handlers: avatarHandler, commandHandler, mentionHandler, welcomeHandler
- Expected issues: long methods, mixed responsibilities, potential `any` types in Discord API callbacks

**Area 2: Automation flow — `src/feats/`**
- autoChat, command, presence, update modules
- Farm automation and captcha solving logic
- Expected issues: tightly coupled logic, string pattern matching, complex async flows

### 5.2 Refactoring Approach

1. **Fix lint/type errors first** — enable strict flags and ESLint, fix all errors without changing logic
2. **Then refactor for clarity** — simplify long functions, extract utilities, improve naming
3. **Preserve behavior** — no functional changes, only structural improvements

### 5.3 Risk: No Test Suite

Per CONCERNS.md, there are **no automated tests**. This makes refactoring risky. Mitigation:
- Keep refactoring conservative (don't change public APIs)
- Run the bot manually after each significant change
- Focus on readability improvements, not architectural changes

---

## 6. Dependencies to Install

### 6.1 Dev Dependencies

```bash
npm install --save-dev eslint @eslint/js typescript-eslint eslint-config-prettier prettier
```

### 6.2 Version Compatibility Matrix

| Package | Version | Notes |
|---------|---------|-------|
| `eslint` | ^9.x | Required for flat config |
| `@eslint/js` | ^9.x | Bundled JS rules |
| `typescript-eslint` | ^8.x | Unified TS-ESLint package |
| `eslint-config-prettier` | ^10.x | Prettier conflict resolution (flat config support) |
| `prettier` | ^3.x | Code formatter |
| `typescript` | ^6.0.3 | Already installed |

---

## 7. File Inventory for Phase 2

### 7.1 Files to Create
- `eslint.config.mjs` — ESLint flat config
- `.prettierrc` — Prettier configuration
- `.prettierignore` — Prettier ignore rules

### 7.2 Files to Modify
- `tsconfig.json` — Enable strict flags (D-03)
- `package.json` — Add devDependencies + scripts (D-05, D-06)
- `src/structures/BaseAgent.ts` — Refactor core logic (D-04)
- `src/handler/*.ts` — Fix lint errors + refactor (D-04)
- `src/feats/*.ts` — Fix lint errors + refactor (D-04)
- All other `src/**/*.ts` — Fix lint/type errors as needed

### 7.3 Execution Order

1. **Wave 1:** Install deps + create config files (eslint, prettier, tsconfig)
2. **Wave 2:** Fix lint/type errors across all source files
3. **Wave 3:** Refactor core modules (BaseAgent, handlers, feats)

---

## 8. Validation Architecture

### 8.1 Success Criteria Verification

| Criterion | Verification Command |
|-----------|---------------------|
| Static analysis passes | `npx eslint src/ --max-warnings 0` exits 0 |
| TypeScript compiles | `npx tsc --noEmit` exits 0 |
| Format check passes | `npx prettier --check "src/**/*.ts"` exits 0 |
| Build script works | `npm run build` exits 0 |
| Core modules refactored | Manual review of BaseAgent.ts, handler/, feats/ |

### 8.2 Smoke Test

After all changes, verify the bot still builds and starts:
```bash
npm run build
npm start  # Should start without crash
```

---

## RESEARCH COMPLETE

**Summary:** Phase 2 requires installing ESLint 9+ with flat config, typescript-eslint strict-type-checked preset, Prettier with 4-space indentation, enabling 4 additional TypeScript strict flags, adding lint/format npm scripts with build-blocking integration, and refactoring core modules (BaseAgent, handlers, feats) for lint compliance and code clarity. The absence of tests means refactoring must be conservative.
