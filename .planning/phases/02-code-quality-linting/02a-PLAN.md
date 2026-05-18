---
phase: 2
plan_id: 02a
title: "Tooling Setup — ESLint, Prettier, TypeScript Strict Flags & npm Scripts"
wave: 1
depends_on: []
requirements: [REFACT-02]
files_modified:
  - eslint.config.mjs
  - .prettierrc
  - .prettierignore
  - tsconfig.json
  - package.json
autonomous: true
must_haves:
  truths:
    - "ESLint 9+ flat config with typescript-eslint strictTypeChecked"
    - "Prettier configured with 4-space indentation"
    - "eslint-config-prettier/flat disables conflicting ESLint formatting rules"
    - "tsconfig.json enables noUnusedLocals, noUnusedParameters, noImplicitReturns, noFallthroughCasesInSwitch"
    - "npm run lint, npm run format, npm run build all work correctly"
---

# Plan 02a: Tooling Setup — ESLint, Prettier, TypeScript Strict Flags & npm Scripts

<objective>
Install and configure ESLint 9+ (flat config) with typescript-eslint strictTypeChecked preset, Prettier with 4-space indentation, integrate eslint-config-prettier for conflict resolution, enable additional TypeScript strict compiler flags, and add lint/format/build npm scripts per decisions D-01 through D-06.
</objective>

## Tasks

<task id="02a-1">
<title>Install dev dependencies</title>
<read_first>
- package.json
</read_first>
<action>
Install the following dev dependencies:

```
npm install --save-dev eslint @eslint/js typescript-eslint eslint-config-prettier prettier
```

After install, verify `package.json` devDependencies contains all 5 packages with appropriate version ranges.
</action>
<acceptance_criteria>
- `package.json` devDependencies contains `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-config-prettier`, `prettier`
- `npm ls eslint` exits 0 without peer dependency errors
- `node_modules/.package-lock.json` contains entries for all 5 packages
</acceptance_criteria>
</task>

<task id="02a-2">
<title>Create ESLint flat config (eslint.config.mjs)</title>
<read_first>
- tsconfig.json
- package.json
- 02-RESEARCH.md (Section 1.2: Strict Type-Checked Configuration)
</read_first>
<action>
Create `eslint.config.mjs` in project root with:

1. Import `js` from `@eslint/js`, `tseslint` from `typescript-eslint`, `eslintConfigPrettier` from `eslint-config-prettier/flat`
2. Use `tseslint.config()` wrapper
3. Include `js.configs.recommended`
4. Spread `tseslint.configs.strictTypeChecked`
5. Add `eslintConfigPrettier` as LAST config entry
6. Set `languageOptions.parserOptions.projectService: true` and `tsconfigRootDir: import.meta.dirname`
7. Add ignores for `dest/`, `node_modules/`, `*.js`, `*.mjs`, `*.cjs`
8. Override `@typescript-eslint/no-explicit-any` to `warn` initially (codebase uses `any` extensively with @ts-ignore)
9. Override `@typescript-eslint/no-unsafe-assignment` to `warn`
10. Override `@typescript-eslint/no-unsafe-call` to `warn`
11. Override `@typescript-eslint/no-unsafe-member-access` to `warn`
12. Keep `@typescript-eslint/no-floating-promises` as `error`
</action>
<acceptance_criteria>
- File `eslint.config.mjs` exists in project root
- File uses `export default tseslint.config(...)` syntax
- `eslintConfigPrettier` is the last entry in the config array
- `parserOptions.projectService` is set to `true`
- ignores array includes `dest/`, `node_modules/`
- Running `npx eslint --print-config src/index.ts 2>/dev/null` does not crash (config is parseable)
</acceptance_criteria>
</task>

<task id="02a-3">
<title>Create Prettier configuration</title>
<read_first>
- 02-CONTEXT.md (Specific Ideas section — 4 spaces indentation)
- src/structures/BaseAgent.ts (check current indentation style)
</read_first>
<action>
Create `.prettierrc` in project root with:
- `printWidth`: 100
- `tabWidth`: 4
- `useTabs`: false  (but current codebase uses tabs — check and match existing style; if tabs, set `useTabs: true` and `tabWidth: 4`)
- `semi`: true
- `singleQuote`: true
- `quoteProps`: "as-needed"
- `trailingComma`: "all"
- `bracketSpacing`: true
- `arrowParens`: "always"
- `endOfLine`: "auto"

**Important:** Inspect existing source files first. If they consistently use tabs (as BaseAgent.ts does), set `useTabs: true` to minimize diff noise. The CONTEXT.md says "ưu tiên thụt lề 4 spaces" but the codebase currently uses tabs.

Create `.prettierignore` with:
- `dest/`
- `node_modules/`
- `*.json` (to protect config files like autorun.json from reformatting)
</action>
<acceptance_criteria>
- `.prettierrc` exists in project root with valid JSON
- `.prettierignore` exists in project root
- `npx prettier --check "src/structures/BaseAgent.ts"` runs without crashing (config is valid)
</acceptance_criteria>
</task>

<task id="02a-4">
<title>Enable TypeScript strict flags in tsconfig.json</title>
<read_first>
- tsconfig.json
- 02-CONTEXT.md (Decision D-03)
</read_first>
<action>
Uncomment and enable 4 strict flags in `tsconfig.json` under "Type Checking":

1. `"noUnusedLocals": true` (line ~95)
2. `"noUnusedParameters": true` (line ~96)
3. `"noImplicitReturns": true` (line ~98)
4. `"noFallthroughCasesInSwitch": true` (line ~99)

Keep all existing flags unchanged. Only uncomment and set these 4 to `true`.
</action>
<acceptance_criteria>
- `tsconfig.json` contains `"noUnusedLocals": true` (not commented out)
- `tsconfig.json` contains `"noUnusedParameters": true` (not commented out)
- `tsconfig.json` contains `"noImplicitReturns": true` (not commented out)
- `tsconfig.json` contains `"noFallthroughCasesInSwitch": true` (not commented out)
- All 4 flags appear in the Type Checking section
</acceptance_criteria>
</task>

<task id="02a-5">
<title>Add lint, format, and build npm scripts</title>
<read_first>
- package.json
- 02-CONTEXT.md (Decisions D-05, D-06)
</read_first>
<action>
Update `package.json` scripts to add:

1. `"lint": "eslint src/ index.ts"` — lint all source files
2. `"lint:fix": "eslint src/ index.ts --fix"` — auto-fix lint issues
3. `"format": "prettier --write \"src/**/*.ts\" \"index.ts\""` — format source files
4. `"format:check": "prettier --check \"src/**/*.ts\" \"index.ts\""` — check formatting without modifying
5. Update `"build"` from `"tsc"` to `"npm run lint && npm run format:check && tsc"` (PowerShell: use `;` or npx run-s if needed)
6. Keep existing `"start"`, `"setup"`, `"dev"` scripts unchanged
7. Keep `"test"` script unchanged

Note on Windows PowerShell: `&&` may not work. Use `npm run lint; if ($?) { npm run format:check }; if ($?) { tsc }` or install `npm-run-all` and use `run-s lint format:check build:tsc`. Simplest: change build to use cross-platform syntax.
</action>
<acceptance_criteria>
- `package.json` contains scripts: `lint`, `lint:fix`, `format`, `format:check`
- `npm run lint -- --help` exits 0 (ESLint is found)
- `npm run format -- --help` exits 0 (Prettier is found)
- `build` script includes lint check before tsc compilation
</acceptance_criteria>
</task>

<verification>
After all tasks complete:
1. `npm run lint -- --help` exits 0
2. `npx prettier --version` prints a version number
3. `npx tsc --noEmit 2>&1 | head -5` shows output (may have errors from strict flags — that's expected, fixed in Plan 02b)
4. Config files exist: `eslint.config.mjs`, `.prettierrc`, `.prettierignore`
5. `tsconfig.json` has all 4 strict flags enabled
</verification>
