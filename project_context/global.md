# Project / Delivery Context

## Project Goal

- Maintain `project-tiny-context-harness`, the npm package and `ty-context` CLI.
- Keep three cooperating capabilities distinct: **Minimal Context** preserves durable project facts; the automatically applicable prompt-level **default Workflow Contract** guides model-led implementation work of any complexity; explicitly selected **Single-Goal Long-Task Workflow** adds recoverable, auditable current-snapshot machine completion authority when that assurance is required.
- Harness maintains Context and workflow mechanisms. Project code, tests, CI, runtime evidence and human acceptance prove product quality.

## Background

- Context stores the smallest durable non-implementation facts needed to recover goals/non-goals, ownership, architecture/interface/state boundaries and repeatable verification/deployment paths at low repeated reading, search and maintenance cost.
- Recovery starts with `global.md`, `architecture.md`, `context.toml` and the default Area, merges manifest candidates with one bounded high-signal search over `project_context/**`, then widens whenever semantic or code dependencies reveal another owner.
- The selected files are an expandable starting set, not a read ACL or complete graph. Search supplements triggers and semantic judgment; it creates no index, cache, registry, state or Authority.
- Read scope and intended edit scope are separate. Reading a sibling workspace, shared backend or another Area provides understanding and never silently authorizes modification. Unresolved ambiguity between materially different product targets blocks product edits until explicit user/product/path facts resolve it.
- Every task chooses exactly one `Context Delta: none|required`. Durable ownership, architecture, API/schema/data, state/recovery, dependency, security, surface responsibility or repeatable verification/deployment change is `required`; a semantics-preserving local implementation repair is `none`.
- Context owns durable intended truth; code owns current implementation truth; tests and runtime evidence prove behavior. Context never stores task progress, logs, raw evidence, test-pass or completion claims.
- Effect and the high-quality design-purpose floor precede cost. Required recovery facts are not removed to meet an advisory byte target. Full rationale and change admission live in [Minimal Context rationale](areas/harness-package/decision-rationale/minimal-context.md).

## Default Workflow Contract

- Unless Long-Task is explicitly selected or validly bound, the default Workflow Contract applies automatically regardless of duration, complexity or file count.
- Its purpose is lightweight, risk-proportional engineering without machine Authority or persistent workflow state: discover relevant Context; understand expressed material requirements, applicable conditions, owners, failure/recovery boundaries and real acceptance entries; perform Architecture Deliberation; decide Context Delta; implement through the correct extension point; run attributable current-candidate project checks; localize and repair failures; perform Contract Conformance carrying Engineering/Architecture Conformance; then run the separate Context drift check.
- The default route creates no required plan/result artifact, complete semantic Census, stable Fact/Obligation identity, exact-set proof, frozen Oracle graph, per-Fact result ledger, Receipt, Final Gate or machine-accepted result. Long-Task alone owns those exact machine-assurance responsibilities.
- Handoff keeps `Implemented`, `Verified`, `Unverified`, `Blocked / decision required` and external-pending scope distinct. Historical CI, pre-fix results, delegated reports and prose inspection cannot establish a later candidate.
- Effect preservation precedes efficiency. New fixed default rules must close a broad real failure path, collapse to near-zero cost for small tasks, reuse project checks, avoid Long-Task duplication and have clearly positive total ROI. Full logic lives in [Workflow Contract](areas/harness-package/contracts/workflow-contract.md).

## Design Rationale

- Keep durable project-memory, prompt-level default engineering guidance and optional machine completion authority as three distinct capabilities. Their complete reasons and admission rules stay in the linked on-demand owners rather than being copied into this startup file.

## Architecture Context

- The minimum component/data-flow map lives in [architecture.md](architecture.md); this file retains only its near-universal execution boundary.
- Before the first implementation edit, every delivery surfaces one repository-bound, risk-proportional `Architecture Deliberation`: affected owners and current extension point/source of truth, dependency/interface/state/resource boundaries, selected and rejected alternatives, one plausible future change, debt disposition, forbidden shortcuts, project checks and triggered quality attributes or concrete preservation.
- Correctness/invariants and maintainability/changeability always receive a preservation judgment. Reliability/resource lifecycle, concurrency/consistency, performance/capacity/cost, security/privacy/safety, compatibility/migration/rollout and operability/observability/testability activate only when material.
- Implementation order, method and feedback cadence remain Goal-owned. Reuse the real owner, keep one source of truth, preserve explicit failure/lifecycle semantics and add abstraction only for a stable evidenced change axis.
- After project verification, default Contract Conformance or Long-Task Final Gate—never both—owns the one current-candidate `Engineering Quality Conformance`, including `Architecture Conformance`. It proves only its declared project-check-bound scope, not overall code quality.

## Non-goals / Boundaries

- Complexity controls execution and verification depth. Required machine completion authority, cross-compaction/session recovery or auditability controls route selection. Long-Task-internal risk controls its unchanged proof floor.
- Explicit Long-Task uses one selected delivery, one complete Contract, one selected verification workspace, Goal-owned adaptive implementation and one source-recompiled current-snapshot Final Gate. Only fresh `machine_accepted` with no pending External Confirmation is its complete declared-machine terminal.
- Long-Task does not discover omitted intent or prove an arbitrary Oracle semantically sound. It never creates or restores a platform Goal, invokes models, schedules agents, creates branches/worktrees, pushes, deploys or executes external confirmation.
- Product and technical Source remain authoritative in both routes. Current code cannot silently redefine user requirements, Context, specifications or selected constraints.
- Product Surface/Screen contracts remain in existing Context roles and own durable information/action/feedback responsibility; do not invent a surface-specific role. Material UI work reconciles affected stable surface/control/target keys with their owning Context and selected exact targets or constraints before implementation, then reports any condition not established by production checks.
- Material selected design remains ordinary Source reachable through its owning Context/`DESIGN.md`. Default work opens affected exact targets/constraints and reports only conditions established by production checks; Long-Task alone projects exact selected-design Fact/method closure into Final Gate.

## Current State

- Managed source lives under `.codex/ty-context-managed/**`; package assets under `packages/ty-context/assets/**`; `packages/ty-context/source-mappings.yaml` is the copy authority. Generated/installed copies are not independent design owners.
- Root `AGENTS.md` is startup routing and hard boundaries. `PROJECT_SPEC.md` owns the stable complete product explanation; role Context owns durable current facts; Skills own role procedures; READMEs own human usage; tests own executable proof.
- `long-task-workflow` is the only active Long-Task Skill. Retired compatibility names are isolated to versioned migrations, explicit non-executing command tombstones, corresponding tests and clearly historical/release material; they do not participate in active triggers or recommendation paths.
- Open Design is an optional upstream generator. Its resources and audit output remain ordinary Source or non-authoritative diagnostics, not Context, Design Authority or acceptance. `design-resource-authoring` has one explicit narrow exception to the former absolute no-state boundary: when real cross-interruption recovery is needed it may persist a versioned, task-local, ignored checkpoint containing replay inputs only; the simple path creates none and the checkpoint never enters Long-Task or completion authority.
- `ty-context doctor` reports deterministic default Context footprint and Design Authority diagnostics as advisory maintenance information, never acceptance state or an absolute byte Gate.
- The admitted static/process exact observer remains a scoped Level 3 capability. Level 4 still requires the unchanged complete total-cost ROI theorem plus an independent capability audit; an `observed_lifecycle_*` measurement is a non-admission diagnostic and cannot substitute for unverified authoring, maintenance, adoption or migration cost.
- Long-Task anti-degradation construction targets evidenced high ROI and high efficiency with a significant, stable margin rather than a global or local optimum. Once purpose validity, relative non-degradation, must-allow behavior, structural-cost limits and the applicable measured total-cost threshold are satisfied, further mechanism expansion stops unless a new real counterexample, repeated material cost hot spot or evidence of significant additional net benefit appears.

## Verification Entry Points

- `make validate-context`: Context recoverability.
- `make validate-harness`: Context plus touched-source modularity.
- `npm run test:affected:list` / `npm run test:affected`: task-local feedback selection and execution.
- `npm run test:long-task:trust`: bounded high-impact Long-Task regression when selected by the final candidate.
- `npm test --workspace project-tiny-context-harness`: complete package release regression.
- `node packages/ty-context/dist/cli.js package check-source`: managed/package parity.
- `git diff --check`: patch hygiene.

These checks prove only their declared properties. Prompt/Context/Skill distribution tests do not prove Agent adherence or high ROI; those claims require fixed independent fresh-Agent paired runs with normalized traces and the complete cost evidence required by the owning admission theorem. No global-optimum claim is required or authorized.

## Next Safe Action

Re-enter through the default Context set plus bounded search, select exactly one workflow route, and update the owning Context before code when `Context Delta: required`. In this source workspace, edit canonical owners, synchronize generated/package copies through existing mappings, use affected/focused feedback during repair and rely only on current-candidate checks after the final relevant change.

## Context Index

- [harness-package](areas/harness-package.md)
  - [Context model](areas/harness-package/foundation/context-model.md)
  - [Workflow Contract](areas/harness-package/contracts/workflow-contract.md)
  - [Design Resource Authoring](areas/harness-package/contracts/design-resource-authoring.md)
  - [Package-managed surfaces](areas/harness-package/contracts/package-managed-surfaces.md)
  - [Temporary content governance](areas/harness-package/contracts/temporary-content-governance.md)
  - [Minimal Context rationale](areas/harness-package/decision-rationale/minimal-context.md)
  - [Engineering quality rationale](areas/harness-package/decision-rationale/architecture-quality.md)
  - [Long-Task rationale](areas/harness-package/decision-rationale/long-task-workflow.md)
  - [implementation index](areas/harness-package/implementation-index.md)
  - [verification](areas/harness-package/verification.md)
- [delivery benchmark](areas/delivery-benchmark.md)

See `project_context/context.toml` for registered roles, triggers and read policies.

## Context Graph

- See `project_context/context.toml` for area/context_unit roles, read policy and boundary metadata.
