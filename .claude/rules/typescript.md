---
paths:
  - 'src/**/*.ts'
---

# TypeScript conventions

- ESM with `NodeNext` resolution: relative imports need the `.js` suffix (`./app.js`), even from `.ts` files.
- `strict` plus `noUncheckedIndexedAccess`: indexed access yields `T | undefined`, so narrow before use.
- Unused parameters and variables must be prefixed with `_` to pass lint.
- Prettier: single quotes, 100-column width.
- Node >= 20.19. No new npm dependencies without the user's agreement — global `fetch` and `node:test` are expected to be enough.
