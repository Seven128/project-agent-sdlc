---
name: context_product_plan
description: Use when the user explicitly asks for a product plan/spec, product-manager analysis, requirements, goals/scope, business rules, user stories/flows, acceptance criteria, 产品方案, 需求方案, 功能方案, 业务规则方案, 用户流程, 用户故事, or 验收标准 in a Minimal Context Harness project. Do not trigger for ordinary coding, debugging, package/release work, visual design/resource generation, or a request whose durable question is only Product Surface responsibility.
---

# Context Product Plan

## Ownership

Own product meaning: goals, users, problem, scope/non-goals, business and user-visible rules, user flows, product feedback, success/acceptance meaning and genuine product decisions. This Skill does not own Product Surface placement, visual Design Authority, generated design resources, technical architecture, implementation, verification authority or a Gate.

Project-specific product behavior belongs in `project_context/**` and may be specialized by `<harnessRoot>/skills/product_plan/SKILL.md`. Durable conclusions never live only in the Skill output.

When Long-Task is active, it alone owns Source/Contract lifecycle and Final Gate. This Skill may clarify product meaning for the existing Source/Context, but creates no second plan, requirement ledger, stage or acceptance path.

## Workflow

1. Read `project_context/global.md`, `project_context/context.toml`, the default area and product owners triggered by the request. Use the default Workflow Contract's bounded high-signal Context search before `Context Delta`.
2. Establish target users/actors, problem and desired outcome, scope/non-goals, relevant objects/capabilities, main flow and material alternatives, business/user rules, failure/degraded/recovery expectations, success signals and real decision gaps.
3. Treat explicit user/product/legal/security/commercial/external constraints as Source. Internally classify each material constraint as Context-covered, requiring Context update, task-local, out of scope or decision-required. Current code reveals implementation; it cannot silently redefine product intent.
4. Keep conditions and acceptance concrete enough to be observed through the actual product entry. A representative sample cannot satisfy a declared full-population/all-provider/all-interface/all-platform outcome; unresolved scope is decision-required.
5. Route durable information/action/feedback placement, main-versus-drilldown responsibility, screen ownership or cross-surface IA to `context_surface_contract`. Provide goals, users, flows, rules and acceptance meaning as inputs; do not compile a Surface Contract here.
6. Route durable visual identity/tokens/rationale/adopted-target interpretation to `context_uiux_design`; new resource generation to `design-resource-authoring`; architecture/engineering design to `context_development_engineer`.
7. Decide exactly one `Context Delta: none|required`. Update the smallest product owner before implementation when goals, scope, business/user rules, flow ownership, acceptance semantics or durable rationale change. Local bugs or implementation drift that preserve meaning are `none`.
8. Under the default Workflow Contract, hand implementation to the current Goal and include product conformance in its one current-candidate Contract Conformance. Under Long-Task, project exact non-UI meaning from this product owner into its existing Source/Contract mechanism only—never build a nested Fact ledger or second closure.

## Product-plan output

Keep the result concise and implementation-usable:

- goal, user/problem and success outcome;
- in-scope and non-goals;
- product objects/capabilities and owner;
- main and material degraded/recovery flows;
- business/user-visible rules and product feedback;
- acceptance boundaries and observation entry;
- assumptions, external constraints and decision-required gaps;
- durable Context changes and downstream owner routes.

Do not invent missing business, legal, security, commercial or external decisions. Do not create a required PRD, `plan.md`, Task Contract, Source-to-Context table, matrix, evidence ledger, phase or lifecycle. Context may name repeatable validation/deployment entries but never say a test or deployment passed unless current evidence establishes it.

Finish with `Context: updated ...` or `Context: no durable fact change`, and clearly separate judged, verified, unverified and decision-required scope.
