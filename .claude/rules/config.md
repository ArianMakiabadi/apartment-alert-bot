---
paths:
  - 'src/config.ts'
  - '.env.example'
---

# Configuration

- `src/config.ts` loads `.env` via `process.loadEnvFile()` (no dotenv) and exports a single `config` object. Read settings from `config`, not from `process.env` elsewhere.
- The file is shared by the Express server and the watcher, so it must not throw at import when a variable is missing. Entry points validate what they need.
- Every variable read here must also be listed in `.env.example`.

## Variables

| Variable | `config` key | Default |
| -------- | ------------ | ------- |
| `PORT`   | `port`       | `3000`  |
