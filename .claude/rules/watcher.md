---
paths:
  - 'src/watch.ts'
  - 'src/telegram.ts'
  - 'src/watcher/**'
  - 'deploy/**'
---

# Watcher

Partly implemented: the reply parser, the live fetch and a `src/watch.ts` that prints the current listings exist; diff, state, Telegram and deploy units do not yet. `plan.md` holds the target design and `automation.md` the DWR protocol (exact request body, sample response, field meanings); both are untracked local files.

- The watcher is a one-shot entry point (`src/watch.ts`: fetch → parse → diff against a state file → notify → exit), run hourly by a systemd timer. It does not import the Express server. Today it only fetches and prints.
- Run it with `npm run watch` (tsx) or `npm run build && npm run watch:start` (`node dist/watch.js`). Every run is one live request to Immosolve per listings page.
- Parse the DWR reply as text; never execute it (`vm`/`eval`).
- Never assume fixed `sN` variable numbering in the reply; follow the references.
- A fetch or parse failure is never "no listings" — it must not produce "removed" alerts.
- Keep request volume against Immosolve low: a few manual test calls, never loops or load tests.

## Implemented modules

Add a line per module as it lands (file, what it exports, any non-obvious behaviour).

- `src/watcher/types.ts` — `Listing`. `id` is the diff key; `monatlGesamtkosten` stays the raw German-comma string (`90,44`); `nutzflaeche` is `number | null`.
- `src/watcher/parse.ts` — `parseReply(text): { listings, totalObjects, totalPages, currentPage }`. Pure, no network.
  - Throws a descriptive `Error` on a missing `//#DWR-REPLY` marker, a missing callback line (a `_remoteHandleException` reply is named as such), dangling `sN` references, a listing without an integer `id` or a `labels` object, and `listings.length !== totalObjects` when `totalPages <= 1`. On multi-page replies the count check is the caller's job (`fetchListings`).
  - Values it does not understand (e.g. `new Date(...)`) become `undefined` instead of failing, so unrelated fields cannot break the watcher. Absent or `null` label fields become `''`.
  - String literals are decoded with `JSON.parse` after turning DWR's `\'` escape into `'` (valid JS, invalid JSON).
- `src/watcher/fetch.ts` — `LISTINGS_PAGE_URL` (the human-facing Stellplatz page, for links in messages), `buildRequestBody(page)`, `fetchPage(page)`, `fetchListings(getPage = fetchPage)`.
  - The request body is the one from `automation.md`, byte-for-byte, as an array of lines joined with `\n` plus a trailing newline. Only `c0-e5` (currentPage) varies; do not reformat or reorder the lines (`c0-e9` really comes before `c0-e8`).
  - `fetchPage` uses global `fetch` with `Content-Type: text/plain` and a 30 s `AbortSignal.timeout`, and throws on any status other than 200.
  - `fetchListings` fetches page 1, then pages 2..`totalPages`, and throws unless the total equals page 1's `totalObjects`. It refuses more than 10 pages (`MAX_PAGES`) so a bogus `totalPages` cannot cause a request loop. `getPage` is injectable so the tests never touch the network.
- `src/watch.ts` — entry point. Prints the current listings (title, id, address, category, m², €/month). On failure it prints `Watcher failed: <reason>` to stderr and sets `process.exitCode = 1`.

## Reply format and fixtures

- The real reply is minified: several statements per line, double-quoted strings, no spaces, CRLF line endings. The sample in `automation.md` was reformatted by Prettier (single quotes, one statement per line) and is **not** byte-accurate; `src/watcher/fixtures/single.txt` is the verbatim capture from 2026-10-08.
- `fixtures/multi.txt`, `empty.txt` and `garbage.txt` are synthetic. Fixtures are `.txt` so Prettier leaves them alone; do not reformat them.

## Tests

`npm test` runs `tsx --test src/watcher/*.test.ts`. The glob is expanded by the shell, because Node 20's `--test` does not expand quoted globs (that needs Node 21+). A test file outside `src/watcher/` needs the script extended.

Tests must not call Immosolve: `fetch.test.ts` covers the request body and pagination through the injected `getPage`. The live endpoint is only checked by hand with `npm run watch`.
