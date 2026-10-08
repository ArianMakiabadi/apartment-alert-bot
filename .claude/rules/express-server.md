---
paths:
  - 'src/app.ts'
  - 'src/index.ts'
  - 'src/errors.ts'
  - 'src/routes/**/*.ts'
  - 'src/middleware/**/*.ts'
---

# Express server

- `src/index.ts` is the server entry point: it starts the app from `createApp()` and handles SIGINT/SIGTERM. `createApp()` (`src/app.ts`) is a factory with no side effects, so the app can be built without listening.
- Each route file exports a `Router` (e.g. `healthRouter`) and is mounted in `src/app.ts`.
- `notFound` and `errorHandler` (`src/middleware/error-handler.ts`) must stay the last two `app.use` calls.
- To return an HTTP error from a handler, throw or `next()` an `HttpError(status, message)` from `src/errors.ts`. It is serialised as `{ "error": message }`; any other error is logged and becomes a 500.
- The server is kept deliberately — do not remove or restructure it. The watcher must not import it.

## Mounted routes

| Mount     | File                   | Purpose                              |
| --------- | ---------------------- | ------------------------------------ |
| `/health` | `src/routes/health.ts` | `GET /` → `{ status: 'ok', uptime }` |
