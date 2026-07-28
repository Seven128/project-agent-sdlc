---
name: design-resource-authoring
description: Use when the user explicitly asks to generate, author, plan, commission, or iterate design resources; use Open Design; create a scoped wireframe, prototype, visual candidate, component/control state study, implementation handoff, or the design resources needed for an explicitly named development scope from raw drafts, product/technical plans, visual briefs, screenshots, or existing design resources; or asks to “生成设计资源”, “使用 Open Design”, “生成原型图”, “生成高保真/低保真设计”, “为开发准备设计资源”, or “先看一个控件/页面效果” in a Minimal Context Harness project. Do not trigger for generic design discussion, UX audits, ordinary UI implementation without an explicit resource request, local CSS fixes, durable Design Authority adoption, initial-proposal authoring itself, or Long-Task execution.
---

# Design Resource Authoring

Commission the smallest sufficient set of design resources for the explicitly requested output or development scope from live Open Design capabilities. For a selected implementation handoff, the default indexing unit is every complete observable design fact exposed by the acquired resource and supported inspector/oracle capability; exact targets additionally require condition-specific full-target layout and pixel facts. This Skill is a thin task-local planner, provider adapter, iteration guide, final proposal reconciler and handoff layer; Open Design owns generation logic and Tiny Context owns neither its prompts nor runtime.

## Hard boundaries

- A raw initial proposal is a valid input. Never require, invoke, regenerate or edit a Source Plan.
- During candidate iteration, keep accepted/rejected/unresolved proposal effects in a task-local delta buffer. Only after a direction is final may this Skill reconcile the initial proposal once. Never continuously rewrite it.
- Proposal reconciliation changes only the initial proposal: never mutate `project_context/**`, `DESIGN.md`, a Source Plan, Delivery Contract, production code or tests as a design-resource side effect.
- Never make a prototype, wireframe, high-fidelity candidate, design-system slice, provider-native file, variant count or directory layout universally mandatory.
- Treat the user's explicit output/development scope as the hard ceiling. Include only the surrounding context needed to design that slice.
- Never require one artifact per control. Reuse selected component sources and group repeated controls by family; commission a dedicated study only for unique or complex uncovered meaning.
- Do not confuse Product Control granularity with design-fact granularity. An image, text run, icon, component part, smaller visual primitive, layout relation, geometry/style/token/content/state/behavior fact remains independently material when the selected resource expresses it.
- Never infer that a page frame or prototype covers states, responsiveness, accessibility or interaction it does not explicitly specify or demonstrate.
- Exploration and unselected previews stay schema-free. Only a final selected implementation handoff requires the shared strict Markdown adapter; this is input preparation, not a resource pack or acceptance result.
- Design resources may express user-visible interaction and presentation, but must not invent or become sole owner of business, data, permission or algorithmic rules.
- Candidates are ordinary external Source. They do not select themselves, become `exact-target`, create Design Authority or prove acceptance.
- Do not install or persistently configure MCP, plugins, authentication or disclosure paths without separate authorization.
- Do not create a resource pack, provider registry, workflow state, Contract artifact, acceptance record or parallel authority lifecycle.

## Read the references

1. Always read [resource-selection.md](references/resource-selection.md) before deciding what to generate or whether the request is style-bearing.
2. Read [open-design-provider.md](references/open-design-provider.md) before capability discovery, Design Authority gating, provider execution, implementation-source acquisition or recovery.
3. Read [downstream-handoff.md](references/downstream-handoff.md) before final selection, initial-proposal reconciliation, handoff or downstream use. A simple unselected non-fidelity preview may stop before this reference.

## Core workflow

1. **Fix the scope ceiling.** Name in-scope surfaces, flows, regions, component families, unique controls, conditions, necessary context, exclusions and whether the intent is exploration, handoff or selected-source preparation.
2. **Inventory inputs.** Accept initial proposals, notes, product/technical plans, visual briefs, screenshots, references and existing resources. Preserve each role as exact target, constraint, inspiration, current-implementation evidence or background; report unreadable/unused material.
3. **Classify visual-style dependency.** Mark the commission `style-bearing` when it materially expresses visual fidelity, brand, typography/color/density, component visual treatment or a production-style prototype. Mark it `non-fidelity` for IA/flow topology, low-fidelity structure, semantics-only behavior/state studies or an explicitly non-fidelity prototype. Mixed work is style-bearing unless split into an independent non-fidelity commission.
4. **Apply the conditional Design Authority gate.** For style-bearing work, read `DESIGN.md` and its token source. If authority is unconfigured, stop before project/run creation and tell the user to explicitly invoke `$design-system-authoring`; do not invoke it automatically. A combined explicit request authorizes running that Skill first and then resuming this one. Non-fidelity work remains allowed.
5. **Find design gaps.** For handoff, account for every in-scope observable design fact across structure, control/component anatomy and smaller primitives, content/visual treatment and exact style/layout values, states, interaction/feedback/motion, adaptation/input, accessibility and assets. Subtract only coverage explicitly supplied by selected Source; unsupported or unreadable facts remain blocking rather than silently absent.
6. **Discover live capabilities.** Inspect the current Open Design agent/model, skills, templates, design systems, plugins and export paths. Treat absent/non-enumerable capabilities honestly.
7. **Choose the minimum sufficient commission.** Give each considered resource `selected`, `optional`, `not-needed`, `unavailable` or `decision-required` with one reason. Ask only when a missing preference materially changes the commission.
8. **Bind and commission through Open Design.** For style-bearing work, create or verify the Open Design project with the adopted design-system ID and require `get_project.designSystemId` to match. Send a bounded product commission through structured MCP; use documented fallbacks only when required.
9. **Acquire a complete implementation source when applicable.** For Web/App implementation handoff, require Open Design to emit a canonical machine-readable entry plus the full declared dependency set—not only a screenshot or preview. Enumerate and retrieve every selected file without truncation, preserve exact bytes/digests, record one `implementation_web` or `implementation_app` source profile with `acquisition: complete`, and make all local HTML/CSS/JS dependencies resolve inside that frozen set. Non-Web resources use the bounded `reference` profile and are not forced into HTML.
10. **Observe, inspect and iterate.** Keep provider execution, artifact readiness and design suitability separate. Iterate within scope. Keep proposal effects only in the delta buffer while candidates remain unsettled.
11. **Finalize selection and reconcile once.** After explicit human selection or explicit delegated selection, preserve immutable identity and consolidate accepted, rejected and unresolved effects. Apply only accepted decisions once to a writable initial-proposal file; if it exists only in conversation, return one complete revised proposal. Preserve original intent/provenance and make reruns idempotent. Do not write unresolved or rejected choices as requirements.
12. **Compile the residual implementation handoff when requested.** For final selected resources intended for development, write one project-native Markdown Source at an authorized path. Preserve readable `ty-source-item` facts and exactly one fenced `design-resource-handoff-v1` YAML block. Keep exact code-expressible UI values in the canonical resources; atomically index every observable fact through typed, locally resolvable locators, close every resource as `material_with_facts` or honestly `supporting_only`, and add only scope, applicability, residual product meaning, explicit exclusions/unresolved items, blockers and downstream bindings. Close every applicable subject × target × condition × dimension cell and make its `fact_refs`, evidence, Source Items and verification methods exactly equal the indexed fact unions. Every exact target needs full-target `layout_geometry` and `visual_pixel` facts per condition; otherwise classify it as a partial constraint or unresolved. Run `ty-context design-resource preflight <handoff.md>`. Missing/unresolvable locators, partial dependency or resource-fact closure, `decision_required`/`unavailable`, stale digests and unsupported evidence are blocking. Do not create this file for exploration.
13. **Return an intent-sized result.** Exploration shows the artifact promptly. An implementation handoff returns the validated handoff path, selected immutable resources, stable-key coverage, provenance, binding, limitations and preflight result. Include the reconciled initial proposal or its updated path when final selection occurred.

## Conditional Design Authority gate

Unconfigured means `DESIGN.md` is missing, explicitly says `Design authority status: unconfigured`, remains a starter, contains only style prose/inspiration, or lacks one authored exact-value token source/generation direction. This gate applies only to style-bearing resource authoring; it is not a general project-init gate and configured system-level authority does not by itself prove surface-level implementation readiness.

The stop message must state:

```text
Style-bearing design resources require an adopted project design system. Explicitly invoke $design-system-authoring to generate/select/adopt one, then resume $design-resource-authoring. I will not initialize it automatically.
```

## Initial-proposal reconciliation

The normal design-first loop is:

```text
initial proposal
  -> bounded Open Design candidates
  -> feedback and iteration with a task-local delta buffer
  -> explicit or delegated final selection
  -> one consolidated, idempotent initial-proposal reconciliation
  -> revised proposal + selected immutable resources
     + canonical source-rich resource set
  -> validated residual design-resource-handoff-v1 (implementation intent only)
  -> default Goal execution or long-task-workflow
```

Small requests may complete generation, selection and reconciliation in one turn; the invariant is one final semantic writeback, not an artificial pause. Reconciliation may clarify product information, controls/states, interaction and visual constraints supported by the selected resource. It preserves original requirements and records selected resource keys/locators/digests without turning provider output into product authority. If selection never occurs, return candidates and the buffered delta only; do not rewrite.

## Stop and route elsewhere

- Route explicit design-system initialization/adoption to `design-system-authoring`.
- Route broader durable UI/UX authority repair during development to `context_uiux_design`.
- Route ordinary implementation with sufficient authority to the default Workflow Contract and current native Goal.
- Route a complete explicit Single-Goal delivery, using the revised proposal plus selected resources, to `long-task-workflow`.
- If no new resource is justified, say so instead of generating filler.

## Completion response

Report scope, necessary context/exclusions, style dependency and gate result; selected/omitted/unavailable resources; visible artifacts/typed locators; provider, project/run and design-system binding status; review and selection basis; immutable provenance; implementation source profile, entry/dependency closure and acquisition completeness when applicable; material applicability/coverage and unresolved decisions; proposal reconciliation status/path; and forbidden inferences. For implementation intent, report the residual `design-resource-handoff-v1` path and successful shared preflight; never call a failing or unresolved handoff ready.
