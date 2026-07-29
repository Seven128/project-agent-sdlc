# Project / Delivery Context

## Project Goal

- Maintain `project-tiny-context-harness`, the npm package and the `ty-context` CLI behind Project Tiny Context Harness.
- Keep three cooperating capabilities distinct: **Minimal Context** preserves durable project facts, the automatically applicable **default Workflow Contract** guides ordinary engineering work, and the explicitly selected **Single-Goal Long-Task Workflow** adds one complete Contract authority plus current-snapshot machine acceptance for recoverable long delivery.
- Every implementation delivery performs one externally observable `Architecture Deliberation` before implementation and one current-candidate `Architecture Conformance` after project verification. Default work carries closure inside Contract Conformance; Long-Task carries it only inside Final Gate.
- Preventing false completion inside declared authority is the Long-Task controlling objective; its theorem promises accepted-terminal-state safety, not path safety or termination. Exactly fresh `machine_accepted` with no pending External Confirmation may imply zero declared observable drift only under complete/accurate Source, meaning-preserving projection, falsifiable observers and a non-bypassable current-snapshot proof boundary. `machine_accepted_external_pending` proves only its declared machine scope and never completes the host Goal.
- A formal selected Web/App handoff derives its Expected Fact Universe before generation and is accountable for exact frozen-Inspector/manifest/handoff equality across every applicable `subject × target × condition × variation × atomic property` Fact Cell and required proof method. Canonical resources remain the exact-value owner; unsupported, unresolved, unmapped or unproved Facts block until attributable per-Fact current-candidate production checks pass. Default Contract Conformance and Long-Task Final Gate are mutually exclusive carriers.
- **Long-Task Anti-Degradation Assurance** protects the controlling purpose, its two necessary implementation responsibilities, theorem boundary and adjacent `F = Implementation Freedom Boundary`. First preserve or strengthen coverage, false-negative resistance, fail-closed Authority and final-snapshot proof; only then may positive total ROI justify a mechanism change. The current Goal continues to own implementation order, methods, feedback cadence and optional platform-native delegation.

## Background

- Fresh coding-agent sessions need a repository-owned recovery path for product intent, ownership, architecture boundaries and repeatable verification instead of rediscovering them from code.
- The package previously carried a multi-worker Campaign runtime. The active design keeps durable Context and verifier-owned completion while leaving mutable implementation sequencing to the host-selected Goal.

## Durable Context Purpose

- `project_context/**` stores the smallest durable non-implementation facts future agents need to recover intent, ownership, architecture/dependency boundaries, contracts, state/recovery semantics and repeatable verification/deployment.
- The default recovery path reads `global.md`, `architecture.md`, `context.toml` and the default area root, collects manifest candidates, then performs one bounded high-signal search over `project_context/**` before `Context Delta`. Specialized workflow, package, implementation and verification detail remains `on-demand`.
- Search supplements triggers and semantic judgment. It creates no vector/persistent index, cache, registry, state or second authority.
- Context owns intended durable truth; code owns current implementation truth; tests, CI, runtime evidence and human observation prove behavior. Disagreement is drift, missing work or stale Context.
- Every task decides exactly one `Context Delta: none|required`. Durable ownership, architecture, API/schema/data, state/recovery, dependency, security, product-surface responsibility or repeatable verification/deployment changes are `required`; semantics-preserving local fixes are `none`.
- Context is not a plan, implementation summary, log, evidence ledger, Receipt or result claim. Do not store one-off output, secrets, screenshots, temporary JSON, raw evidence or delivery state in it.
- Material UI follows stable surface/control/target keys through owning Context, `DESIGN.md` and selected immutable resources. Each adopted target has one canonical record; exact values remain in canonical resources and generated implementation artifacts remain evidence.

## Design Rationale

- Give each durable fact one primary owner, keep the near-universal read small and route specialized facts on demand rather than deleting them.
- Use manifest routing plus bounded search because triggers are cheap but wording recall is imperfect; semantic judgment still decides relevance.
- Prefer existing Context, Contract and project-verification carriers over new artifacts, state or duplicate authority.
- Make architecture consideration observable and risk-proportional without claiming access to private reasoning or universal future-proofing.
- Keep acceptance fail closed: lower authoring, model, recovery or test cost never substitutes prose, historical evidence or Agent judgment for current-snapshot proof.

## Non-goals / Boundaries

- The default Workflow Contract is an automatically applicable prompt-level execution protocol when no Long-Task binding is active. It uses platform-internal planning, creates no required plan/result artifact and has no validator, Receipt, persistent workflow state or machine-completion result.
- Its route is: resolve minimum relevant Context, complete Architecture Deliberation, decide `Context Delta`, implement precisely, run project-owned verification, perform Contract Conformance including Architecture Conformance, then check reverse Context drift.
- The active long-task design remains **Single-Goal Rolling Delivery V2**: one selected delivery, one complete Contract authority, one currently selected host Goal, one verification workspace, one post-lock model-choice boundary, Goal-owned adaptive implementation and one source-recompiled Final Gate. “One Goal” is not a Harness-persisted Goal ID: compaction may continue inside the current Goal, while a later physical Goal/session reconstructs semantic state with `resume`.
- Long-Task activates only through an explicit selection of the `long-task-workflow` Skill or a valid active binding. The Skill and its references own Source/Contract authoring, proof, protected revision and lifecycle detail; task size alone never activates it.
- Product Surface/Screen contracts use existing Context roles and do not duplicate visual tokens or target pixels. Default selected-design accounting is ephemeral; Long-Task uses only its compiled carrier and Final Gate.
- Raw proposals, selected resources and attachments enter one Source-bound Contract Draft loop. `source-plan-authoring` is only a retired compatibility name; legacy Source Plans remain ordinary Source.
- Harness never creates or restores platform Goals, invokes or switches models, schedules agents, creates branches/worktrees, merges, pushes, opens PRs, deploys, executes external confirmations or manages process trees.
- No Source Inventory authority, Coverage authority, Packet/SFC/Wave/Campaign runtime, second Contract plan, scheduler, Worker registry, native-Goal state or external-confirmation state machine belongs in the active product.

## Architecture Context

- `project_context/architecture.md` owns the minimum component, authority, data-flow and verification-boundary map.
- `project_context/context.toml` routes foundation, workflow-contract, package-managed-surface, implementation-index, verification and decision-rationale Context on demand.
- `PROJECT_SPEC.md` owns the full stable product/workflow explanation; Context keeps only durable recovery and decision facts.

## Current State

- The current package line preserves `long-task-delivery-v2`, the explicit `long-task` profile, package-owned Stop Hook, protected Authority Revision and declared-machine/native-Goal terminal separation while sharing architecture and selected-design obligations across mutually exclusive carriers.
- `long-task-workflow` is the only active long-task execution Skill. In Codex it is explicitly selected with `$long-task-workflow` or through `/skills`; host-neutral documentation refers to the logical Skill name.
- Managed source lives under `.codex/ty-context-managed/**`; packaged assets live under `packages/ty-context/assets/**`; `packages/ty-context/source-mappings.yaml` is the copy authority.
- Root `AGENTS.md` is a startup router and hard-boundary surface. Skills own role procedures, `PROJECT_SPEC.md` owns the full stable design, role Context owns durable facts, README owns human usage and tests own machine proof.
- `ty-context doctor` reports the deterministic default Context footprint and Design Authority status without making an advisory byte budget a validation or release gate.

## Verification Entry Points

- `make validate-context`: Context recoverability.
- `make validate-harness`: Context plus touched-source modularity.
- `npm run test:affected`: fail-safe task-local selection.
- `npm run test:long-task:trust`: bounded high-impact Long-Task regression when it is the highest selected aggregate.
- `npm test --workspace project-tiny-context-harness`: complete package and Long-Task release regression.
- `node packages/ty-context/dist/cli.js package check-source`: managed-source/package parity.
- `git diff --check`: patch hygiene.
- Detailed tier ownership, rerun policy and focused commands live in the on-demand verification Context.

## Next Safe Action

For a fresh agent, re-enter through the default Context read plus bounded search, select exactly one workflow route, and update owning Context before code when `Context Delta: required`. In this source workspace, edit canonical managed sources only, use affected/focused feedback while repairing, synchronize generated/package copies, and run the single highest required aggregate after the candidate diff is frozen. This section is a stable recovery rule, not task-local progress or a one-off next edit.

## Context Index

- [harness-package](areas/harness-package.md)
  - [context model](areas/harness-package/foundation/context-model.md)
  - [workflow contract](areas/harness-package/contracts/workflow-contract.md)
  - [package-managed surfaces](areas/harness-package/contracts/package-managed-surfaces.md)
  - [Minimal Context rationale](areas/harness-package/decision-rationale/minimal-context.md)
  - [Architecture quality rationale](areas/harness-package/decision-rationale/architecture-quality.md)
  - [Long-Task Workflow rationale](areas/harness-package/decision-rationale/long-task-workflow.md)
  - [implementation index](areas/harness-package/implementation-index.md)
  - [verification](areas/harness-package/verification.md)
- [delivery-benchmark](areas/delivery-benchmark.md)

## Context Graph

See `project_context/context.toml` for registered areas, role Context, triggers and read policy.
