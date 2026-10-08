---
paths:
  - 'src/watch.ts'
  - 'src/telegram.ts'
  - 'src/watcher/**'
  - 'deploy/**'
---

# Watcher

Not implemented yet. `plan.md` holds the target design and `automation.md` the DWR protocol (exact request body, sample response, field meanings); both are untracked local files.

- The watcher is a one-shot entry point (`src/watch.ts`: fetch → parse → diff against a state file → notify → exit), run hourly by a systemd timer. It does not import the Express server.
- Parse the DWR reply as text; never execute it (`vm`/`eval`).
- Never assume fixed `sN` variable numbering in the reply; follow the references.
- A fetch or parse failure is never "no listings" — it must not produce "removed" alerts.
- Keep request volume against Immosolve low: a few manual test calls, never loops or load tests.

## Implemented modules

None yet. Add a line per module as it lands (file, what it exports, any non-obvious behaviour).
