---
context_role: decision-rationale
read_policy: on-demand
---
# Architecture Quality Assurance Rationale

## Decision

Every implementation delivery has one shared architecture-quality obligation with two moments:

1. an externally observable, repository-bound `Architecture Deliberation` before the first implementation edit; and
2. one `Architecture Conformance` closure on the current candidate snapshot after implementation and project-owned verification.

Depth is risk-proportional, but occurrence is universal. The default path carries the closure inside Contract Conformance. The Long-Task path carries it only inside its existing Final Gate through declared Technical/Global authority and project-owned executable Checks. They are two execution carriers for one obligation, not two independently nested quality workflows.

## Reason And Honest Guarantee

The mechanism exists because an Agent can otherwise move directly from a functional request to locally passing code without deliberately checking ownership, sources of truth, dependency direction, lifecycle, extension points or debt. A prompt that merely says “write clean code” is not observable and gives later review no evidence that architecture was considered.

The checkpoint guarantees only a visible architecture-design action and repository-bound conclusions. It cannot inspect private chain-of-thought, prove subjective design excellence, discover every undeclared requirement or produce an architecture for every unknowable future need. Architecture outcome quality still depends on engineering judgment, review and the quality of project-owned checks.

## Architecture Deliberation

Before implementation, surface concise conclusions and evidence rather than private reasoning. Cover, when applicable:

- affected capabilities, owning modules/surfaces and controlling Context;
- the current extension point and unique source of truth;
- dependency direction, public/internal interfaces, state/persistence and runtime lifecycle;
- failure, retry, timeout, degraded-mode, recovery, compatibility and migration behavior;
- the selected design, material alternatives and why they were rejected;
- at least one plausible adjacent change and the extension point that would absorb it without a second source of truth or reversed dependency;
- touched technical debt, whether it is removed, contained without worsening, or blocked on an explicit bounded exception;
- forbidden shortcuts and the project-native lint, AST, dependency, contract, modularity or behavior checks that protect the boundary.

Small changes use a concise preservation finding rather than skipping the checkpoint: name the concrete owner/extension point, state that durable boundaries remain unchanged and show why no new or worsened debt is introduced. Material changes in scope, ownership, controlling Context, dependency direction or selected design stale the checkpoint and require refinement before implementation continues.

The result is task-local unless it changes durable facts. Stable ownership, boundary, interface/state/recovery, dependency, verification or long-lived tradeoff decisions update their owning Context before code. No architecture-plan file, matrix, ADR or second delta is required.

## Architecture Conformance

After implementation and project verification, check the current candidate snapshot against the deliberated conclusions and controlling Context. The closure looks for:

- changes outside the intended path or capability envelope;
- wrong ownership or dependency direction;
- bypass of an owning service, facade, adapter or extension point;
- duplicate authority or a second source of truth;
- undeclared API, schema, data, persistence, state or recovery changes;
- forbidden shortcuts or missing architecture checks;
- new or worsened technical debt, including unnecessary duplication, responsibility growth and unsupported abstraction;
- misalignment among implementation, tests, documentation, Skills/assets and Context.

A finding returns to implementation and affected verification. A later code, configuration, Contract or controlling-Context change invalidates prior closure; rerunning for the new snapshot is freshness, not a duplicate mandatory Gate.

New or worsened debt is a conformance failure unless a project-owned exception is explicit and bounded. The exception must identify owner, reason, tracking and a removal/expiry condition and must not silently receive new responsibilities. Unrelated pre-existing debt is not automatically pulled into task scope, but debt touched, relied on or worsened by the change must be resolved or explicitly blocked rather than hidden.

## Contract Conformance And Context Drift

`Contract Conformance` is the default workflow's broad internal implementation-alignment review. It checks whether user/Source constraints and controlling Context reached the correct owners, interfaces, state machines and verification paths. `Architecture Conformance` is a required architecture-specific part of that review.

The separately named Context drift check asks the reverse question. Contract Conformance primarily checks `Source/Context -> implementation`; Context drift checks `implementation/new decision -> durable Context`. Keeping both directions explicit prevents an Agent from complying with an old Context file while failing to record a new durable fact.

## Long-Task Binding

Long-Task Source and Contract authoring perform the same pre-implementation deliberation once. Material, falsifiable architecture conclusions enter existing Source-backed technical obligations, global constraints or forbidden shortcuts, owner/path envelopes, Bindings and project-owned Checks before Authority Lock. At least one real `technical_obligation` Source Item is classified with `aspect=architecture`, maps to an ordinary covered obligation Claim and is rerun by Final Gate; this prevents total omission without adding an architecture Contract field or separate closure. Subjective preferences remain task-local, durable Context or `decision_required`; they do not become false machine proof.

Final Gate is the only Long-Task post-implementation architecture-conformance owner. It recompiles Source authority and reruns every declared architecture Check on the same current snapshot as functional acceptance. Running an additional default closure would add cost and ambiguous ownership without closing another drift path, so it is forbidden.

## Evidence And Update Principles

Mechanism effectiveness is argued at three levels:

- the visible checkpoint and handoff status make occurrence reviewable;
- repository-bound owners, paths, symbols, Context and check references make generic filler detectable by human review;
- project-native executable checks and current-snapshot Long-Task evidence prove only their declared observable invariants.

Guidance and parity tests protect that the obligation appears in managed source, generated/package copies, the default engineering Skill, Long-Task authoring/finalization guidance, public docs and owning Context. They prove workflow distribution, not the quality of an individual design decision.

Future changes must preserve these invariants:

1. every implementation delivery deliberates before implementation;
2. depth varies with risk, but small work records a concrete preservation result instead of skipping;
3. exactly one route owns post-implementation conformance for one candidate snapshot;
4. candidate changes invalidate prior closure;
5. durable conclusions update one owning Context and objective invariants use project-native checks;
6. no new artifact chain, second Authority, second plan, scheduler, lifecycle state or generic architecture analyzer is introduced; and
7. any added ceremony must close a distinct failure path with materially positive total-cost ROI.
