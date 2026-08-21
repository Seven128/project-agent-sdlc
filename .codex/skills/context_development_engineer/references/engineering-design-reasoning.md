# Engineering Design Reasoning

Use this reference only after `context_development_engineer` has been selected for material engineering-design or architecture judgment. It deepens the existing Architecture Deliberation; it does not create a design phase, plan artifact, evidence ledger, second workflow or acceptance carrier. Apply the smallest useful subset below and state when a method is not material.

## 1. Frame what is actually known

Separate four categories before choosing a design:

- **Facts:** user/Source/Context requirements, repository owners and extension points, observed code/test behavior and externally verified dependency facts.
- **Constraints:** compatibility, platform, policy, budget, rollout, security, data, lifecycle and scope boundaries that a legal solution must preserve.
- **Assumptions:** plausible but unproved premises currently needed to proceed. Name who can validate them and what changes if they are false.
- **Unknowns:** missing information that distinguishes alternatives, changes safety or makes an acceptance claim unsupported.

Current code is implementation evidence, not silent product or architecture authority. A genuine product, legal, security, commercial, safety or external choice remains `decision-required`; implementation-equivalent freedom belongs to the current Goal.

## 2. Identify drivers and path dependence

Name the few forces that materially shape the solution: owner/source-of-truth location, dependency direction, data/state boundaries, lifecycle and failure semantics, compatibility commitments, load/threat conditions and verification reachability. Distinguish an enduring invariant from historical path dependence such as an old API, migration window, installed dependency or deployment constraint. Preserve path dependence only while its reason still applies; do not mistake legacy shape for the desired architecture.

For each material driver, point to repository evidence or authoritative external evidence. If current dependency/library behavior matters and may have changed, use current primary documentation rather than memory.

## 3. Build the smallest material alternative set

Enumerate only alternatives that could plausibly change an owner, boundary, lifecycle, dependency, operational risk or future change cost. Include the current extension point or intentional non-abstraction when viable. When sourcing is material, express Build / Reuse / Buy as the existing allowed solution set, prohibited failure modes and required rationale/evidence.

Steelman every material alternative before rejecting it:

- where it fits the requirements well;
- its cleanest owner and dependency direction;
- the strongest reason a competent maintainer would select it; and
- the evidence or condition under which it would become preferable.

Do not manufacture alternatives for a local choice whose owner and semantics are already explicit. Do not relabel an unselected allowed option as a prohibited failure.

## 4. Use counterfactuals and failure paths

Challenge the leading design with at least one realistic adjacent change and one relevant failure:

- If the next client, provider, state, data volume, permission model or workflow variation arrives, which existing extension point absorbs it?
- If the selected dependency is unavailable, stale, slow, partial or incompatible, which failure is visible and where does recovery live?
- If the main assumption is false, which decision changes and which parts remain valid?
- What would make the rejected alternative win?

Trace only triggered retry, timeout, cancellation, idempotency, transaction, concurrency, consistency, degradation, recovery and resource-release semantics. A family that is not material gets a concise preservation basis rather than invented machinery.

## 5. Select risk-triggered methods

Choose methods for the actual uncertainty; never run all of them by default:

| Trigger | Useful method | Minimum output |
| --- | --- | --- |
| Unclear owner or dependency boundary | Repository owner/extension-point trace | One source of truth, legal dependency direction and prohibited bypass |
| API/schema/data/state change | Contract and state-transition analysis | Inputs/outputs/errors, invariants, ownership, compatibility and recovery |
| Shared mutable state or parallel execution | Interleaving/consistency analysis | Atomicity boundary, ordering, idempotency and failure recovery |
| External integration or mature protocol | Current primary-source and repository-fit research | Supported allowed set, compatibility/security/maintenance evidence |
| Material performance/capacity/cost risk | Complexity model plus project-owned measurement | Workload, metric, baseline/budget, environment and comparator/tolerance |
| Trust, permission or sensitive data boundary | Threat/abuse-path analysis | Assets, actors, trust crossings, prohibited failures and attributable checks |
| Public or versioned compatibility change | Migration/rollout analysis | Compatibility window, upgrade/rollback path and current-version evidence |
| High uncertainty that code can cheaply resolve | Minimum architecture experiment | Hypothesis, smallest observable probe, budget and exit condition |

Research or an experiment informs the decision but is not durable authority or product acceptance. Preserve only stable conclusions in their owning Context.

## 6. Design a minimum architecture experiment

Use an experiment only when a material unknown distinguishes legal alternatives and repository inspection or authoritative documentation cannot answer it cheaply. Define:

- the exact question and competing hypotheses;
- the smallest representative fixture or probe that can falsify the leading assumption;
- environment, inputs, metric/observation and comparator;
- time/resource budget and stop condition; and
- how each possible result changes the design.

Do not turn a spike into production by default. Representative input proves only its declared scope; it cannot establish an all-provider, all-interface, all-platform or full-population claim.

## 7. Project the decision into implementation

Before handoff to the current Goal, make the design concrete enough to implement without inventing a second architecture:

- owning modules, paths and symbols plus the existing extension point;
- public/internal interfaces, inputs, outputs and explicit error semantics;
- data and state owner, persistence boundary and invariants;
- runtime/resource lifecycle, initialization, cleanup, recovery and observability;
- dependency direction and forbidden shortcuts;
- compatibility/migration/rollout handling when applicable;
- the smallest complete implementation surface and any intentional non-goals;
- project-owned type/lint/AST/dependency/contract/behavior/benchmark/probe checks; and
- `Context Delta: none|required`, with the smallest durable owner updated before code when required.

## Architecture audit route

For an audit, compare the current implementation against controlling Source/Context and the concrete owner/boundary model above. Report wrong owner, duplicate truth, reversed dependency, extension-point bypass, silent failure, incomplete lifecycle/recovery, unsupported quality claim and new/worsened debt separately. Distinguish observed defects from assumptions and unverified risks. Do not implement repairs unless the request also authorizes change.

The final current-candidate Engineering/Architecture Conformance remains in the existing default Contract Conformance or, when validly active, the sole Long-Task Final Gate. This reference creates neither.
