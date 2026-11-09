# GitHub Pages browser demo

The public browser edition uses the existing React screens, SVG network, TypeScript allocator, validation and CSV parser. It is a separately built static demo, not a claim that GitHub Pages hosts the native backend.

- Verified live address: https://eshaanvgupta.github.io/chaos-control-agent-native/
- Hosting source: the `gh-pages` branch, `/` folder, with `.nojekyll`.
- Navigation: hash routes, so shared links and refresh work under the repository subpath without server rewrites.
- Storage: per-browser IndexedDB. There is no shared account or remote database. Clearing site storage removes the local projects; export reports to retain a copy.
- Operations: the same `lib/engine.ts`, `lib/model.ts`, `lib/seed.ts` and `lib/import.ts` numerical code. A browser persistence adapter supplies the existing interface’s action hooks. Writes are read/modify/write IndexedDB transactions. Plan approval, revision checks, deterministic plan verification, simulated execution, undo, branches and audit records operate locally.
- Agent features: native model conversation, PostgreSQL synchronization, authentication and server authorization remain in the full app. On Pages, agent/setup buttons open an explicit guide to running that app. There are no invented agent replies, paid keys or transmitted CSV imports.

The full server build and original native actions are retained. The browser adapter does not replace or impersonate the framework runtime. Do not present the Pages edition alone as proof of a live Agent-Native model conversation; use the full app and a configured provider for that demo segment.

## Build and preview

```sh
pnpm install --frozen-lockfile
pnpm build:pages
pnpm preview:pages
```

Preview: http://127.0.0.1:4173/chaos-control-agent-native/.

```sh
pnpm exec playwright test --config playwright.pages.config.ts
```

The Pages browser suite passed both the complete recovery/import journey and the persistence/reload check against the production static build. It was then rerun against the actual public GitHub Pages URL: **2 tests passed in 3.2 seconds**. GitHub reported the Pages build as `built` at commit `9df8ec9940ab02b9550a0cbd93029437b8a0a0d7`, and the public page returned HTTP 200. No app backend was running for those tests. Both the full-app and Pages TypeScript compiler checks and Agent-Native doctor passed after adding the browser edition.

## Publish

```sh
pnpm build:pages
node scripts/deploy-pages.mjs
node scripts/deploy-pages.mjs --status
```

The publishing helper uses existing Git Credential Manager authorization in memory. It verifies the authorized owner, stages a complete fresh static tree in a separate temporary checkout, pushes a normal descendant commit to `gh-pages`, verifies the remote commit, and configures the repository’s Pages publishing source. It does not force-push or alter the full-app working tree. Confirm build status and the actual public URL before reporting deployment success.
