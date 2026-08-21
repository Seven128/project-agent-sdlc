---
name: context_development_engineer
description: Use when the user asks for an architecture or engineering design, technical design/plan, complex implementation design, high-level engineering assessment, 架构方案/工程设计/技术设计/复杂实现方案/系统拆分/工程取舍/架构审计, or when the actual task content materially requires owner/source-of-truth, API/schema/data/state/lifecycle, dependency, complex alternatives, concurrency/recovery, external-integration/shared-abstraction, performance, security, compatibility/migration, implementation tradeoff, or architecture-audit judgment. Do not trigger merely for routine coding, local bug fixes, small refactors, tests, documentation, styling, package/release work, generic requests to implement/build/change code, a generic implementation plan, role-only mentions, or mentions of multi-agent, subagent, or parallel work.
---

# Context Development Engineer

## Scope

Add engineering-design and architecture judgment to the default Workflow Contract. This Skill is not the default implementation workflow, a coding persona, planner, agent allocator or verification authority. Routine implementation continues under root `AGENTS.md`.

Project-specific engineering rules belong in `<harnessRoot>/skills/development_engineer/SKILL.md`; the repo-local Skill is more specific, while durable conclusions still belong in `project_context/**`.

With a valid Long-Task binding, `long-task-workflow` alone owns its lifecycle and Final Gate. This Skill contributes architecture judgment only and creates no second plan, stage, delegation policy/state or acceptance path.

## Progressive reasoning reference

Read [engineering-design-reasoning.md](references/engineering-design-reasoning.md) completely. Apply only the methods triggered by actual uncertainty and risk; this is not a checklist, artifact schema or required sequence. An explicit-owner task without material design uncertainty stays on the lightweight default path.

## Engineering-design workflow

1. Read required core/default and implicated-owner Context. Before `Context Delta`, run the default bounded high-signal Context search; widen only for discovered dependency or semantic ownership.
2. State the problem, success boundary and non-goals. Separate facts, constraints, assumptions and unknowns, and Source/Context requirements from current-code behavior.
3. Identify the existing source of truth and extension point, affected owners, dependency direction, public/internal interfaces, state and lifecycle, failure/recovery boundaries, compatibility constraints and project-native verification entries.
4. Compare the smallest material alternatives. Prefer the existing owner/facade/adapter when it carries the stable concept; introduce an abstraction only for an evidenced change axis or durable boundary with positive net value. When foundational machinery, a mature protocol/security boundary, a dependency/shared abstraction or a nearby extension point makes sourcing material, add the risk-triggered Build / Reuse / Buy judgment below.
5. Before implementation edits, surface one externally observable, repository-bound `Architecture Deliberation`: selected design, rejected material alternatives, one plausible future-change challenge, touched technical debt and disposition, forbidden shortcuts, checks, and triggered quality attributes or preservation basis.
6. Decide exactly one `Context Delta: none|required`. Durable ownership, architecture, API/schema/data, state/recovery, dependency, compatibility, verification/deployment or rationale changes are `required` and update the smallest owning Context before code. A task-local design that preserves those facts is `none`.
7. Implement under the current Goal and Workflow Contract. After current-candidate checks, include Engineering/Architecture Conformance in default Contract Conformance, then run the separate Context drift check. Add no gate or proof ledger.

## Architecture Deliberation content

Risk changes depth, not whether the checkpoint occurs. Name the controlling Context/code path, concrete owner and unique source of truth, extension point, dependency direction and prohibited bypass; API/schema/data inputs/outputs; interface, state and lifecycle boundaries; material failure/recovery/resource-release behavior; and triggered concurrency, security or compatibility boundaries. State the selected design, material alternatives, a realistic future-change landing without duplicate truth or reverse dependency, technical debt disposition or bounded project-owned exception, forbidden shortcuts, and project-owned type/lint/AST/dependency/contract/behavior/benchmark/probe checks.

Always judge correctness/invariants and maintainability/changeability. Activate reliability/resource lifecycle, concurrency/consistency, performance/capacity/cost, security/privacy/safety, compatibility/migration/rollout and operability/observability/testability only when material. A performance claim requires workload, metric, baseline/budget, environment, comparator/tolerance and project-owned measurement; static shape is not runtime proof.

Refresh the deliberation if scope, ownership, dependency direction, selected design, quality applicability or debt disposition materially changes.

### Risk-triggered Build / Reuse / Buy

Record an `allowed solution set`, `prohibited failure modes` and `required rationale/evidence`, not one required library or abstraction. Choices may include the owning service/facade/adapter, standard library, installed dependency, mature compatible external library, small bounded self-implementation or intentional non-abstraction.

Enumerate every materially supported member before selecting one; selection never removes another supported member from the allowed set. Judge the viable set, retain each unselected but legal member as an alternative, and prohibit only a choice which actually exhibits a prohibited failure mode. `block` needs no supported member or missing safety/compatibility evidence; `decision-required` needs a genuine user/product/external choice.

Reject duplicate owner-held rules, extension-point bypass, an unjustified heavy dependency, plainly incomplete reinvention of mature security-sensitive behavior, incompatible license/platform support, forced abstraction over structurally similar but semantically different code and a second source of truth for one stable rule. Do not add a mandatory open-source preference, DRY rule, generic quality score, artifact, stage or Gate. Conformance asks only whether the selected choice is in the allowed set, avoids prohibited failures and has risk-proportional current evidence.

## Boundary routing

Product goals and acceptance meaning belong to `context_product_plan`. Durable main/drilldown/surface information/action/feedback responsibility belongs to `context_surface_contract`. Durable Design Authority and UI Authority Closure belong to `context_uiux_design`. New design-resource generation/handoff belongs to `design-resource-authoring`. Exact non-UI semantic facts remain owned by Source/Context; exact selected UI values remain owned by selected-design closure.

For monorepos, distinguish expandable read scope from intended/supporting workspaces. Existing Context workspace mappings are semantic routing rather than edit authorization or read ACLs. Do not add workspace registries, topology scans or empty Context mirrors.

For capability scope, distinguish reusable system capability, representative sample validation, full-population operation and explicit non-requirement. A sample cannot prove an all-provider/all-interface/all-platform claim; unresolved scope remains decision-required.

## Output

Return a concise engineering design or assessment: selected owner/extension point, boundaries and invariants, alternatives/trade-offs, future-change/debt judgment, implementation surfaces, verification strategy, decision-required gaps and `Context: updated ...` or `Context: no durable fact change`.

Do not create a required `plan.md`, Task Contract, architecture matrix, verdict, evidence ledger, generic analyzer, phase, lifecycle or second Authority/Gate. Do not claim checks or product acceptance that were not run on the current candidate.
