# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A watcher for parking-space (Stellplatz) listings of Baugenossenschaft dhu eG, Hamburg, that will send a Telegram message when listings appear, disappear or change. Today the repo contains the Express 5 scaffold and a watcher (`src/watch.ts`, `src/watcher/`) that fetches the live listings, compares them with a state file and prints what is new, removed or changed; sending to Telegram and the hourly schedule are not built yet.

Two untracked local files in the repo root drive the work. They are intentionally not committed, so they may be absent in a fresh clone:

- `plan.md` — the step-by-step implementation plan with checkboxes, the target file layout, and the working rules. **Read it before starting any watcher work and continue from the first unticked subtask.**
- `automation.md` — the source of truth for the Immosolve DWR protocol.

## Commands

```bash
npm run dev          # Express server with reload (tsx watch src/index.ts)
npm run build        # tsc -> dist/
npm start            # node dist/index.js (needs a build)
npm run watch        # watcher, one run (tsx src/watch.ts) — makes a live request to Immosolve
                     #   add `-- --dry-run` to print without writing data/state.json
npm run watch:start  # node dist/watch.js (needs a build)
npm run typecheck    # tsc --noEmit
npm test             # node:test through tsx (tsx --test src/watcher/*.test.ts)
npm run lint         # eslint .   (lint:fix to autofix)
npm run format       # prettier --write .   (format:check to verify)
```

A single test file runs with `npx tsx --test src/watcher/parse.test.ts` and a single case with `--test-name-pattern`. The test glob is expanded by the shell and only covers `src/watcher/`, because Node 20's `--test` does not expand globs itself.

The husky pre-commit hook runs `lint-staged`, which only runs Prettier on staged files — ESLint and typecheck are not run by the hook, so run them yourself.

## Path-scoped rules

Area-specific guidance lives in `.claude/rules/`, each file scoped by `paths` frontmatter so it loads only when matching files are touched:

| Rule file           | Applies to                                                        |
| ------------------- | ----------------------------------------------------------------- |
| `typescript.md`     | `src/**/*.ts`                                                     |
| `express-server.md` | `src/app.ts`, `src/index.ts`, `src/errors.ts`, routes, middleware |
| `config.md`         | `src/config.ts`, `.env.example`                                   |
| `watcher.md`        | `src/watch.ts`, `src/telegram.ts`, `src/watcher/**`, `deploy/**`  |

**Keep the rules current: updating them is part of finishing every implementation.** Before reporting a subtask as done:

- Update the rule file covering the paths you changed — new routes, config variables, modules, scripts, and any non-obvious behaviour or constraint a future session would need.
- If the work adds an area no rule covers, create a new rule file with `paths` frontmatter and add it to the table above.
- Remove or correct statements the change made false (e.g. "not implemented yet").
- Update the Commands section here when `package.json` scripts change.
- Include the changed rule files in the suggested stage list.

## Git

Do not run state-changing git commands (`add`, `commit`, `push`). The user commits; after each subtask, give a suggested commit message and the exact files to stage. Never include `plan.md` or `automation.md` in a stage list.
