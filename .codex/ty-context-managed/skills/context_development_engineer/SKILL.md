---
name: context_development_engineer
description: Use when the user explicitly asks for an architecture or engineering design, technical design/plan, complex implementation design, system decomposition, API/data/state/lifecycle design, engineering trade-off, or high-level engineering assessment; or asks for 架构方案, 工程设计, 技术设计, 复杂实现方案, 系统拆分, 接口/数据/状态/生命周期设计, 工程取舍, or 高层工程评估 in a Minimal Context Harness project. Do not trigger for routine coding, bug fixes, small refactors, package/release work, generic requests to implement/build/change code, a generic implementation plan, role-only mentions such as developer/software engineer, or requests merely mentioning multi-agent, subagent, or parallel work.
---

# Context Development Engineer

## Scope

Add explicit engineering-design and architecture judgment to the repository's default Workflow Contract. This Skill is not the default implementation workflow, a coding persona, a planning artifact, an agent allocator or a verification authority. Routine implementation continues under root `AGENTS.md` without this Skill.

Project-specific engineering rules belong in `<harnessRoot>/skills/development_engineer/SKILL.md`; the repo-local Skill is more specific, while durable conclusions still belong in `project_context/**`.

When a valid Long-Task binding is active, `long-task-workflow` alone owns Source/Contract lifecycle, selected workspace, Progress, formal verification and Final Gate. This Skill contributes architecture judgment only and creates no second plan, stage, delegation policy/state or acceptance path.

## Engineering-design workflow

1. Read the core/default Context required by `AGENTS.md`, then the owners implicated by the proposed architecture. Before `Context Delta`, run the bounded high-signal Context search already required by the default Workflow; widen only when dependency or semantic ownership demands it.
2. State the problem, success boundary and non-goals. Separate intended Source/Context requirements from current-code behavior; code cannot silently redefine missing authority.
3. Identify the existing source of truth and extension point, affected owners, dependency direction, public/internal interfaces, state and lifecycle, failure/recovery boundaries, compatibility constraints and project-native verification entries.
4. Compare the smallest material alternatives. Prefer the existing owner/facade/adapter when it carries the stable concept; introduce an abstraction only for an evidenced change axis or durable boundary with positive net value.
5. Surface one externally observable, repository-bound `Architecture Deliberation` before implementation edits. Include the selected design, rejected material alternatives, one plausible future-change challenge, touched technical debt and disposition, forbidden shortcuts, checks and triggered quality attributes or concrete preservation basis.
6. Decide exactly one `Context Delta: none|required`. Durable ownership, architecture, API/schema/data, state/recovery, dependency, compatibility, verification/deployment or rationale changes are `required` and update the smallest owning Context before code. A task-local design that preserves those facts is `none`.
7. Hand the design to the current Goal for implementation under the existing Workflow Contract. After current-candidate project checks, include Engineering/Architecture Conformance in the default Contract Conformance and run the separate Context drift check. Do not add another gate or proof ledger.

## Architecture Deliberation content

Risk changes depth, never whether the checkpoint occurs. A small design may say that it preserves the existing boundary, but it must still name the concrete owner/extension point and verification entry.

Cover what is material:

- controlling Context and current code symbol/path;
- owner and unique source of truth;
- allowed dependency direction and prohibited bypass;
- inputs/outputs, interface and state/persistence/lifecycle boundaries;
- failure, retry, timeout, cancellation, degradation, recovery and resource release;
- concurrency/consistency and security/privacy/safety boundaries when triggered;
- compatibility, migration and rollout when a public/schema/config/versioned boundary changes;
- selected design, material alternatives and why they lose;
- a realistic adjacent future change and where it lands without duplicate truth or reverse dependency;
- technical debt eliminated, isolated without worsening, or blocked pending a bounded project-owned exception with owner/reason/tracking/removal condition;
- project-owned type/lint/AST/dependency/contract/behavior/benchmark/probe checks.

Correctness/invariants and maintainability/changeability always receive at least a preservation judgment. Reliability/resource lifecycle, concurrency/consistency, performance/capacity/cost, security/privacy/safety, compatibility/migration/rollout and operability/observability/testability activate only when the design makes them material. A performance claim additionally requires workload, metric, baseline/budget, environment, comparator/tolerance and a project-owned measurement; static shape is not runtime proof.

Refresh the deliberation if scope, ownership, dependency direction, selected design, quality applicability or debt disposition materially changes.

## Boundary routing

- Product goals, business/user rules, flows and acceptance meaning belong to `context_product_plan`.
- Durable main/drilldown/surface information/action/feedback responsibility belongs to `context_surface_contract`.
- Durable Design Authority, tokens, rationale, adopted target interpretation and UI Authority Closure belong to `context_uiux_design`.
- New design-resource generation/handoff belongs to `design-resource-authoring`.
- Exact non-UI semantic facts remain owned by Source/Context; exact selected UI values remain owned by selected-design closure. This Skill does not invent either.

For monorepos, distinguish expandable read scope from intended/supporting workspaces. Existing Context workspace mappings are semantic routing rather than edit authorization or read ACLs. Do not add workspace registries, topology scans or empty Context mirrors.

For capability scope, distinguish reusable system capability, representative sample validation, full-population operation and explicit non-requirement. A sample cannot prove an all-provider/all-interface/all-platform claim; unresolved scope remains decision-required.

## Output

Return a concise engineering design or assessment: selected owner/extension point, boundaries and invariants, alternatives/trade-offs, future-change/debt judgment, implementation surfaces, verification strategy, decision-required gaps and `Context: updated ...` or `Context: no durable fact change`.

Do not create a required `plan.md`, Task Contract, architecture matrix, verdict, evidence ledger, generic analyzer, phase, lifecycle or second Authority/Gate. Do not claim checks or product acceptance that were not run on the current candidate.
