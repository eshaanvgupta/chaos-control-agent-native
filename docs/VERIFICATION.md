# Verification evidence

Executed locally on Windows with Node 24.16.0 and the official Agent-Native framework 0.226.0.

- `pnpm test`: **21 tests passed** across deterministic engine/import tests and PostgreSQL/PGlite integration tests. Covers stock/supplier conservation, daily lane/warehouse capacity, storage, budget, arrival feasibility, outage impact, branch isolation, reproducibility, CSV validation, formula injection, identity, authorization, approval, idempotency, audit, undo and concurrent mutations.
- `pnpm typecheck`: passed following implementation fixes.
- `pnpm agent-native:doctor`: **clean, no findings**, including the final browser configuration.
- `pnpm build`: completed, producing client/server artifacts in `build/` and `.output/`. The framework reported missing production PostgreSQL and `BETTER_AUTH_SECRET`; these are actual deployment requirements, not successful deployment evidence. The native PTY binary is platform-specific, so rebuild from source on the target OS.
- `pnpm test:e2e`: **2 passed (18.0 seconds)** in installed Chrome. The first covers guest entry, supplier outage, strategy calculation, review and approval, execution, report persistence after reload, isolated branching, six-table CSV validation/import, downloadable report, node inspection and mobile overflow. The second calls actual authenticated HTTP action routes and verifies unapproved execution returns 403 and a foreign workspace read is denied. Initial failures exposed a CommonJS CSV prebundle issue; explicit Vite prebundling and a clean server restart resolved it.
- Screenshots captured from the tested app: `docs/screenshots/command-center.png`, `operations-world.png`, `mobile.png`.

No live model connection, hosted deployment, public Clips recording or form submission is asserted by this file. See AI.md, DEPLOYMENT.md and HACKATHON.md for exact remaining external steps.
