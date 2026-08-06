---
context_role: decision-rationale
read_policy: on-demand
---
# Shared Engineering Quality Assurance Rationale

## Decision

Every implementation delivery has one thin `Shared Engineering Quality Obligation`. It extends, rather than replaces, the existing architecture obligation:

1. before the first implementation edit, one externally observable, repository-bound `Architecture Deliberation` also records the applicable quality-attribute risks or a concrete preservation basis;
2. implementation remains Goal-owned but follows a small set of boundary-preserving implementation-quality rules; and
3. after project-owned verification, one current-candidate `Engineering Quality Conformance` includes the existing `Architecture Conformance` and the triggered, falsifiable engineering-quality invariants.

Depth is risk-proportional, but the preservation judgment is universal. `Applicable Quality Attributes` and `Implementation Quality Discipline` are subcriteria, not stages, Gates, states or artifacts. The default path carries the final closure inside Contract Conformance. The Long-Task path carries it only inside its existing Final Gate through declared Technical/Global authority and project-owned executable Checks. They are two mutually exclusive execution carriers for one obligation, not nested quality workflows.

The stable design is owned by `PROJECT_SPEC.md` and this Context. Package-managed `AGENTS_CORE.md` is the sole automatic runtime projection; Skills add only role-specific execution and evidence mapping.

## Reason

The architecture checkpoint already catches boundary mistakes, but its former wording did not consistently route non-architectural engineering risks or require their final-current-candidate closure. Reusing that checkpoint and each workflow's existing final carrier raises detection value without adding another workflow mechanism. Capability-aware modularity is the matching implementation: it retains portable line risk and supported language heuristics while eliminating false assurance and false regressions from metrics the Harness cannot honestly observe.

## Responsibility Boundary

The existing semantic and design obligations remain the value authorities:

- Non-UI Semantic Fact closure owns exactly **what** product, business and technical semantics must be true, including explicit performance budgets, reliability/SLO, security, compatibility and operational requirements.
- Selected-design closure owns exact selected UI/UX Facts and their proof obligations.
- Shared Engineering Quality owns **how** implementation preserves owners, boundaries and changeability, how applicable engineering risks are handled, and which project-native evidence can falsify the declared invariants.

Exact values stay in Source or owning Context. This obligation creates no quality-Fact manifest, matrix, duplicate value source, Contract, Authority, Gate, Result, Receipt or persistent quality state. A subjective preference without a sound Oracle remains review judgment, durable rationale or `decision_required`; it is never converted into machine proof.

## Architecture Deliberation And Applicable Quality

Before implementation, surface concise conclusions and repository evidence rather than private reasoning. Always name the concrete owner/current extension point, unique source of truth, shortest reliable verification entry and why no new or worsened debt is introduced. Material work covers, when applicable:

- affected capabilities, owning modules/surfaces and controlling Context;
- dependency direction; public/internal input, output and error boundaries; state/persistence ownership and runtime/resource lifecycle;
- the selected design, material alternatives and why they were rejected;
- at least one plausible adjacent change and the extension point that would absorb it without a second source of truth or reversed dependency;
- touched technical debt, whether it is removed, contained without worsening, or blocked on an explicit bounded exception;
- forbidden shortcuts and the project-native type, compiler, lint, architecture, contract, behavior, benchmark or probe checks that protect the boundary; and
- triggered failure, load or threat scenarios.

Quality attributes are risk-triggered constraints and tradeoffs, not a checklist to maximize:

- correctness and invariants always apply, while exact predicates remain owned by Semantic Facts or selected design;
- maintainability/modularity/changeability always receive at least a preservation judgment;
- reliability/resource lifecycle activates for external I/O, asynchronous work, long-lived resources, partial failure or recovery;
- concurrency/consistency activates for shared mutable state, parallel execution, transactions, messages, retries or multiple writers;
- performance/capacity/cost activates for an explicit requirement or claim, or material hot-path, complexity, unbounded-population, I/O, batching, cache, serialization, memory or public-abstraction risk;
- security/privacy/safety activates at trust, identity, permission, sensitive-data, external-input, audit or irreversible-effect boundaries;
- compatibility/migration/rollout activates for public API, schema, protocol, storage, configuration, versioned state or released behavior; and
- operability/observability/testability activates for production runtime, background work, external integration or independently failing boundaries.

An untriggered family gets a concrete preservation basis, not a large empty matrix. A triggered performance claim names workload, metric, baseline or budget, environment, comparator/tolerance and a project-owned measurement. When preservation is the only risk, use the cheapest existing project evidence; without attributable measurement, make no performance-improvement or budget-satisfaction claim. Static shape checks do not prove runtime performance.

Small changes use a concise preservation finding instead of skipping. Material changes in scope, ownership, controlling Context, dependency direction, selected design, quality-attribute applicability or debt disposition stale the deliberation and require refinement before implementation continues.

The result is task-local unless it changes durable facts. Stable ownership, boundary, interface/state/recovery, dependency, verification or long-lived tradeoff decisions update their owning Context before code. No architecture plan, matrix, ADR or second delta is required.

## Implementation Quality Discipline

Implementation order, method and feedback cadence remain Goal-owned. Within declared Source/Context, architecture, safety and external-action boundaries:

- reuse the owning service, facade, adapter and extension point and keep one source of truth;
- make the smallest complete, semantically clear change and validate at the real boundary;
- do not swallow failure, invent an unauthorized default, hide mutable global state or duplicate owner-held rules;
- complete timeout, cancellation, retry/idempotency, transaction, concurrency and resource-release semantics only when the real path requires them;
- introduce an abstraction only for a stable concept or evidenced change axis with positive net value; smaller functions, shorter files or more interfaces are not quality by themselves; and
- prefer project-native types, compilers, linters, architecture tests, behavior tests and measurements over Harness heuristics or implementation-generated expectations.

These are implementation guardrails, not a prescribed development sequence, per-edit mandate or machine claim that the code is globally “clean.”

### Risk-Triggered Build / Reuse / Buy Judgment

When work adds non-trivial foundational behavior, implements a mature protocol/format/security boundary, introduces a shared capability or dependency, or encounters an existing near owner/extension point, the deliberation evaluates an **allowed solution set**, **prohibited failure modes** and **required rationale/evidence**. It does not prescribe one answer.

The allowed set may include the existing repository owner, language/platform standard library, an installed dependency, a mature external library or a small self-contained implementation. Intentional duplication or non-abstraction remains allowed when semantics, owner, lifecycle or expected change axis differ. A shared abstraction is favored only for one stable concept, common owner/invariants and synchronized change direction with positive total value.

Disposition applies to the task's viable set, not to the fate of one proposed option. A nonempty, evidence-supported allowed set permits selection of any member; `block` means no supported member exists or material evidence is unavailable, while `decision-required` is reserved for a genuine external choice rather than equivalent implementation freedom.

Prohibited failures are duplicating an owner-held rule or stable source of truth, bypassing the owning facade/adapter/extension point, adding a heavy or transitive dependency without evidence, writing a plainly incomplete custom implementation for mature security-sensitive behavior, accepting an incompatible license/platform/runtime boundary, or forcing one abstraction over merely shape-similar code. Required rationale is risk-proportional and uses repository evidence plus current primary sources when a current external choice is material; it compares semantic fit, dependency direction, maintenance/security/supply-chain/license/platform/resource/test/lock-in cost and the actual future change axis.

This judgment adds no mandatory open-source preference, anti-“wheel” rule, DRY mandate, generic quality score, artifact, stage or Gate. Conformance asks only whether the selected member was allowed, avoided the prohibited failures and retained sufficient current evidence for its risk.

## Engineering Quality Conformance

After implementation and project verification, check the final current candidate against the deliberated conclusions, controlling Context and every triggered falsifiable invariant. `Architecture Conformance` remains the architecture-specific subset. The closure looks for:

- changes outside the intended path or capability envelope;
- unrelated dirty changes without task provenance;
- wrong ownership or dependency direction;
- bypass of an owning service, facade, adapter or extension point;
- duplicate authority or a second source of truth;
- undeclared API, schema, data, persistence, state, lifecycle, recovery, compatibility or rollout changes;
- silent fallback, swallowed failure, resource leaks, concurrency/consistency defects or unrecoverable partial state when applicable;
- triggered quality attributes without their declared handling or attributable current-candidate evidence;
- unsupported performance claims without workload, baseline/budget, environment and measurement;
- forbidden shortcuts or missing project-owned checks;
- new or worsened technical debt, including unnecessary duplication, responsibility growth and unsupported abstraction; and
- misalignment among implementation, tests, documentation, Skills/assets and Context.

A finding returns to implementation and affected verification. A later code, configuration, Contract, declared check input or controlling-Context change invalidates prior closure; rerunning for the new snapshot is freshness, not another Gate.

New or worsened debt is a conformance failure unless a project-owned exception is explicit and bounded. The exception must identify owner, reason, tracking and a removal/expiry condition and must not silently receive new responsibilities. Unrelated pre-existing debt is not automatically pulled into task scope, but debt touched, relied on or worsened by the change must be resolved or explicitly blocked rather than hidden.

## Contract Conformance And Context Drift

`Contract Conformance` is the default workflow's broad internal implementation-alignment review and the carrier for `Engineering Quality Conformance`. It checks whether user/Source constraints and controlling Context reached the correct owners, interfaces, state machines and verification paths.

The separately named Context drift check asks the reverse question. Contract Conformance primarily checks `Source/Context -> implementation`; Context drift checks `implementation/new decision -> durable Context`. Keeping both directions explicit prevents an Agent from complying with an old Context file while failing to record a new durable fact.

## Long-Task Binding

Long-Task Source and Contract authoring perform the same deliberation once. At least one real `technical_obligation` Source Item remains classified with the sole aspect `architecture`, maps to an ordinary covered obligation Claim and is rerun by Final Gate, preventing total architecture omission without a new field.

Every material, falsifiable engineering-quality invariant that can fail independently enters existing Source-backed technical obligations, global constraints or forbidden shortcuts, owner/path envelopes, Bindings, project-owned Checks and an independent Assertion when functional behavior could pass while that invariant fails. A broad `quality == true`, `architecture_result == true`, functional pass or prose review cannot substitute for independently failing invariants. Performance obligations bind a real benchmark/probe and its workload, environment, baseline/budget and comparator/tolerance; static shape checks cannot prove target runtime behavior.

Final Gate is the only Long-Task `Engineering Quality Conformance` and `Architecture Conformance` carrier. It recompiles Source authority and reruns the declared checks on the same final snapshot as functional acceptance. It proves exactly that declared, falsifiable, project-check-bound set—not overall code quality. Running an additional default closure is forbidden. No new Source Item aspect, Claim kind, risk level, schema field, Gate, state or Receipt is added.

## Capability-Aware Modularity Heuristic

`check-modularity` is a portable risk signal, not a cross-language static analyzer or architecture proof:

- JS/TS-family files use the existing lexical function/branch/export/state-transition/responsibility heuristic;
- Python uses a dedicated lexical per-function statement/branch heuristic; and
- every other currently included handwritten source/config format, including Vue without an SFC parser, is line-only.

The report names its capability. Unsupported metrics are represented as unavailable (`null` internally and `n/a` in CLI output), never as zero, and cannot participate in risk or regression calculations. Physical-line risk, current thresholds, generated exclusions, touched/base comparison, warning/fail policy, lifecycle-complete waivers and the Long-Task Contract-YAML exclusion remain unchanged.

A package upgrade safely removes a scoped waiver only when it was necessary solely because the retired cross-language JS heuristic reported an unsupported non-line metric and the target has no current supported risk. Other stale or invalid waivers remain fail-closed. Ordinary `sync` never performs this semantic migration.

## Evidence And Update Principles

Mechanism effectiveness is argued at four levels:

- the visible checkpoint and handoff status make occurrence reviewable;
- repository-bound owners, paths, symbols, Context and check references make generic filler detectable by human review;
- project-native executable checks and current-snapshot Long-Task evidence prove only their declared observable invariants; and
- capability-aware output prevents an unavailable observation from appearing as a passing zero.

Guidance and parity tests protect that the obligation appears in managed source, generated/package copies, the default engineering Skill, Long-Task authoring/finalization guidance, public docs and owning Context. They prove workflow distribution, not the quality of an individual design decision.

Future changes must preserve these invariants:

1. every implementation delivery deliberates before implementation and uses the implementation guardrails without adding a stage;
2. depth varies with risk, but small work records concrete architecture and quality-attribute preservation instead of skipping;
3. Semantic Fact and selected-design owners remain unique, and only independently falsifiable engineering invariants become machine obligations;
4. exactly one route owns post-implementation conformance for one candidate snapshot, and candidate/input/authority changes invalidate it;
5. Long-Task retains its existing Authority, fail-closed behavior, complete final-snapshot proof and `F = Implementation Freedom Boundary`;
6. durable conclusions update one owning Context and objective invariants use project-native checks;
7. unavailable analyzer metrics remain unavailable rather than silently becoming zero; and
8. no new artifact chain, second Authority, Contract, plan, scheduler, lifecycle state, Gate or generic analyzer is introduced.

For Long-Task mechanism changes, first preserve or strengthen coverage, false-negative resistance, non-bypassable Authority, fail-closed behavior and complete final-snapshot proof. Only then may positive total ROI justify adoption. A new development-time constraint must close a distinct failure path that the Final Gate or a cheaper project-owned check cannot close. This obligation is admitted because its lightweight pre-implementation risk routing and final-carrier reuse close boundary/quality omissions without constraining implementation order, while capability-aware modularity removes false assurance and keeps runtime cost bounded.
