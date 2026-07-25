---
context_role: verification
read_policy: on-demand
---
# Invoice Operations Verification

## Current Repeatable Checks

- `npm test`: current billing and UI regression entrypoint.
- `npm run test:ui`: focused UI projection states.
- `npm run smoke:health`: ready-only JSON health result.
- `node tools/ty-context.mjs design-resource preflight design/handoffs/invoice-board.md`: selected invoice-board handoff input integrity in a prepared formal run.

## Evidence Boundary

- A degraded-health CLI contract is not currently defined.
- Tests prove only the behavior they execute.
- Design-resource preflight proves only semantic-input completeness/addressability/integrity, not production implementation conformance.
- Mock receipt evidence does not satisfy a live-provider external confirmation.
