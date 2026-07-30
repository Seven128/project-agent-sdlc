# Area Context: main

## Responsibility

- Describe this product/domain area or context unit's responsibility.

## User / System Contract

- Describe the external behavior, API, CLI, UI, screen state, interaction or data contract. Contract changes should be captured here before implementation alignment.
- For UI/page areas, name the page responsibility, core user judgment, persistent information/actions/feedback, non-persistent information, and what belongs in downstream consumption, ops, detail or other surfaces when those facts are durable.

## Core Data / API / State

- Summarize important data structures, APIs, state transitions or rules.

## Module Design Capsule

- Principles: stable execution constraints that should affect future module work.
- Design Logic: the minimum logic for choosing, rejecting, degrading or composing module behavior.
- Design Rationale: only durable reasons, rejected alternatives and tradeoffs that change later implementation or verification decisions; leave it empty when no stable reason exists.
- Do not invent rationale or store implementation summaries, PR notes, command output, test result claims, screenshot review notes, debug history, agent reasoning or reasons inferred only from current code shape.
- Current standards, thresholds and commands belong in the relevant contract or verification Context, not as permanent principles.

## Key Constraints

- List constraints that are not obvious from code alone, including product rules, responsive/a11y needs or visual boundaries.

## Code Entry Points

- `src/` or the concrete file/function entry points.
- In a monorepo, a workspace-local Area belongs under `project_context/workspaces/<workspace-id>/areas/**`; its manifest entry maps that Context workspace to one code root. Name this Area's semantic responsibility within that root and any shared/supporting owners commonly needed. Cross-workspace Areas stay under top-level `project_context/areas/**`. This documents ownership and discovery, not read isolation or edit permission.

## Related Role Context

- Verification paths live in this area's `verification` role Context, such as `project_context/areas/main/verification.md` or `project_context/workspaces/mobile/areas/verification.md`.
- Deployment/runtime/bootstrap paths live in this area's optional `deployment` role Context when those facts exist.

## Open Risks

- List unresolved risks or blockers.
