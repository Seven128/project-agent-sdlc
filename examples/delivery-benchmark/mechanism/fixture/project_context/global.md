# Project / Delivery Context

## Project Goal

- Maintain a deterministic invoice-operations service used to benchmark how coding agents recover durable product and engineering facts.
- Keep billing, notifications, UI, worker, admin, verification, and deployment responsibilities explicit without turning Context into task state or test evidence.

## Background

- The fixture intentionally contains several local and cross-boundary defects. Task prompts reveal one defect at a time.
- `project_context/**` states intended ownership and repeatable verification; source files show current implementation and may be stale.

## Design Rationale

- Billing owns invoice state and totals. Notifications owns receipt delivery. The worker owns retry/dead-letter lifecycle. Admin owns protected export behavior.
- Shared behavior is verified through project-owned Node tests and small CLI smoke commands.

## Non-goals / Boundaries

- No real payment processing, live receipt provider, production database, browser server, or deployment is executed.
- Mock notification evidence must never be reported as live-provider confirmation.
- Benchmark prompts, hidden probes, run metadata, and Agent result files are not durable Context.

## Architecture Context

- Read `project_context/architecture.md` for owner and dependency direction.
- Use `project_context/context.toml` to locate task-specific contract, foundation, verification, deployment, rationale, navigation, and archive Context.

## Current State

- The product is a small in-memory Node.js fixture with deterministic tests.
- Current code can disagree with these intended boundaries; that disagreement is the defect under test, not permission to rewrite Context to match the bug.

## Verification Entry Points

- `npm test`
- `npm run test:ui`
- `npm run smoke:health`
- A selected invoice-board implementation handoff additionally runs `node tools/ty-context.mjs design-resource preflight design/handoffs/invoice-board.md` in formal benchmark runs.

## Next Safe Action

- Read the minimum Context controlling the requested task, modify the owning code and tests, then reconcile durable Context only when the task changes a long-lived fact.

## Context Index

- [Invoice operations](areas/invoice-ops.md)
- [Invoice board Screen Contract](areas/invoice-ops/screens/invoice-board.md)
- [Notifications](areas/notifications.md)
- [Admin](areas/admin.md)
