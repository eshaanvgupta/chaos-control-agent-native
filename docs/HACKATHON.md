# Submission package — Builder.io Agent-Native Hackathon 2026

## Title

CHAOS//CONTROL: The Playable Operations Intelligence Platform

## Short description

A playable digital twin where humans and AI agents investigate business disruptions, compare feasible recovery futures, and execute approved decisions in an accountable internal model.

## Description

A supplier disappears. Customer demand continues. An operations dashboard can show the damage, but the team still needs to decide what to do. CHAOS//CONTROL makes that decision explorable: import inventory, warehouse, supplier, route and order CSVs; inspect a living operational network; inject a crisis; calculate three recovery schedules; fork alternative futures; and approve a versioned plan before execution. Every unit, dollar and deadline comes from deterministic calculations. Reports connect each modeled outcome to the decision and audit trail that produced it.

The native agent and commander use the same typed Agent-Native actions and PostgreSQL state. SENTINEL investigates risks, TACTICIAN computes feasible recovery plans, and ORACLE compares isolated assumptions. A human alone approves execution. Native model access is optional: no paid provider key is required for the numerical product, and the UI labels deterministic behavior honestly.

## Technical innovation

- Real `defineAction()` and Zod contracts shared by React hooks, agent tools, CLI and authenticated framework HTTP/MCP surfaces.
- Feasible deterministic discrete-day allocation, with daily route/warehouse capacity, stock conservation, supplier lead times, storage, purchase permission and budget constraints.
- Immutable branch snapshots, nested futures, exact plan verification, revision-bound approval, idempotent transactional execution, auditable undo and historical replay.
- Agent-visible selection and screen context through native application state; the actual native chat sidebar and provider setup remain integrated.
- A distinctive SVG operations world makes risk, routes and consequences inspectable without pretending it is literal geography.

## Rules and timing checked

Official rules: https://www.builder.io/hackathon/rules. Deadline: **November 9, 2026, 11:59 PM America/Los_Angeles**, equivalent to **November 10, 2026, 1:29 PM Asia/Kolkata**. The rules require a public Builder Clips demonstration viewable without login, then a separate submission through the organizer's linked form and confirmation of receipt. Repository publication does not submit an entry.

Judging: usefulness/execution 40%, creativity/design 20%, innovation 20%, Agent-Native use 20%. No judging score is claimed.

## Creator and links

- Creator/account: `eshaanvgupta`. Confirm the preferred public display name in the actual form.
- Source: https://github.com/eshaanvgupta/chaos-control-agent-native
- Demo: reproducible local app; no verified hosted PostgreSQL deployment is claimed.
- Public Clips link: **not recorded**. No Clips recording tool was available in this session.
- Contact, eligibility and rules acceptance: the creator must supply/confirm these in the organizer's actual form; they have not been invented or submitted.

## Two-minute recording script

| Time | Actual screen/action | Narration |
| --- | --- | --- |
| 0:00–0:10 | Landing → enter guest command center | “Your business is on fire. The future is playable.” |
| 0:10–0:25 | Start Blackout → inject the seven-day supplier outage | “Three warehouses, four suppliers, eighteen products and 240 order lines. This outage changes the actual model.” |
| 0:25–0:40 | Crisis Room evidence → select a warehouse in Operations World | “Every risk links to stock, capacities, lead times and deadlines.” |
| 0:40–0:55 | With a real provider connected, ask SENTINEL to inspect the selected warehouse; show real tool events | “The native agent reads the same state and invokes the same tools as the interface.” |
| 0:55–1:15 | Strategy Lab → calculate → change budget and recompute | “Three feasible schedules expose service and cost trade-offs. The allocator is deterministic; we do not claim global optimality.” |
| 1:15–1:30 | Future Explorer → fork another supplier-delay assumption | “Try tomorrow without changing today's model.” |
| 1:30–1:45 | Review → human approve → execute → report | “The agent cannot approve itself. Execution verifies the exact plan and updates the internal simulation atomically.” |
| 1:45–2:00 | Data Hangar → loaded/mapped CSV preview → audit export | “Real imported records use the same workflow. This is decision support, not a fictional game or an external purchase.” |

If no model is connected, demonstrate the deterministic specialist controls explicitly and explain that live model orchestration is available after native provider setup. Never overlay a fake agent exchange.

## Recording and submission checklist

1. Start the local app and choose a fresh private workspace. Keep keys, credentials, personal records and browser account menus out of the capture.
2. Open Builder Clips from the official hackathon site. Record the actual running workflow above. Use the model segment only with a verified working provider.
3. Publish the Clip publicly and open its URL in a signed-out browser to verify access.
4. Open the official **Submit Your Project** form linked from https://www.builder.io/hackathon. Paste this copy, creator/contact details, the real Clip URL and source URL. Confirm eligibility and accept rules personally.
5. Submit before the deadline and save the real receipt. This repository does not claim submission or receipt.

## Original work and attribution

Original work created for this project: operational domain model, deterministic allocator, crisis engine, snapshot/revision/approval workflows, import mapping, reports, mission data and custom application UI/SVG art. Pre-existing third-party work: official Agent-Native Chat scaffold and runtime (MIT), React/Vite/Drizzle/Zod/Papa Parse/Playwright/Vitest and their dependencies; Bungee, Space Grotesk and IBM Plex Mono fonts (OFL-1.1), and Tabler icons (MIT). See THIRD_PARTY_NOTICES.md. No open-source license has been assigned to the owner's original code.
