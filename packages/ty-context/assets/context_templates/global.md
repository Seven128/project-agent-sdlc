# Project / Delivery Context

## Project Goal

- Describe the user-visible goal this project is trying to achieve.

## Non-goals / Boundaries

- List what this project intentionally does not do.

## Background

- Capture only near-universal background a fresh agent needs before changing code. Route specialized facts through on-demand role Context instead of copying them here.

## Design Rationale

- Record only project-wide durable choices, rejected alternatives and tradeoffs that are hard to infer from code or tests and likely to affect future work. Leave this sparse when no stable reason exists.
- Do not invent rationale or store implementation summaries, PR notes, command output, test result claims, screenshot review notes, debug history, agent reasoning or reasons inferred only from current code shape.
- Classify changes before implementation; if a change alters product ownership/plans, module responsibilities, information architecture, API/Schema, state/scheduler semantics, cross-area boundaries, verification role paths or deployment role paths, update Context before code with enough durable context to guide implementation.

## Architecture Context

- Link to `project_context/architecture.md`; keep architecture notes minimal and focused on boundaries, components and constraints that are not obvious from code.

## Context Graph

- Link to `project_context/context.toml` and keep its default area, role, trigger, read policy and boundary metadata aligned with this Context.
- When adding or reorganizing files under `project_context/areas/**`, run a soft role placement scan before registering every Markdown file as an area: product ownership stays in `area` / `domain` / `subdomain`; contracts, foundations, verification, deployment, implementation indexes, decision rationale and archives should use role Context when that better fits the reading purpose.

## Product / Delivery Brief

- Capture durable product goals, users, core flows, acceptance signals and non-goals.

## UX / Screen Brief

- Capture durable screen, flow, interaction, responsive and accessibility facts. Use `DESIGN.md` for visual identity and design tokens when needed.
- For web/front-end surfaces, record durable page responsibilities, core user judgments, persistent information boundaries and cross-page or cross-layer ownership when they guide future changes.
- Reference durable versioned design targets at their project-native path or URI and classify them as `exact-target`, `constraint` or `inspiration`; do not paste generated implementation screenshots, diffs or review logs into Context.
- When selected resources arrive through a validated `design-resource-handoff-v1`, keep only durable surface/control/target ownership and a route to its immutable Source here. Do not copy the handoff's condition/evidence/coverage index into Context; future work must open the handoff and affected exact/constraint resources and rerun shared preflight before fidelity implementation.

## Verification Entry Points

- Point to the default verification context for repeatable test, smoke, CI or validation paths.
- Project-level cross-domain verification may live here only as a short index; execution details belong in `verification` role Context.

## Current State

- Summarize what is implemented, blocked or risky right now.

## Next Safe Action

- State a stable safe re-entry rule for a fresh agent, including when Context must be updated before code. Do not store task-local progress or a one-off next edit here.

## Context Index

- [main](areas/main.md)
- [main verification](areas/main/verification.md)
