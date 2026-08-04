---
name: design-resource-authoring
description: Use when the user explicitly asks to generate, author, commission or iterate design resources; use Open Design; create a scoped wireframe, prototype, visual candidate, component/control state study or implementation handoff; or asks to 生成设计资源, 使用 Open Design, 生成原型图, 生成高保真/低保真设计, 为开发准备设计资源, or 先看一个控件/页面效果 in a Minimal Context Harness project. Do not trigger for generic design discussion, UX audits, ordinary UI implementation, local CSS fixes, durable Design Authority adoption, initial product-proposal authoring or Long-Task execution.
---

# Design Resource Authoring

Commission the smallest sufficient resource set for the user's explicit output/development scope. “Smallest” limits artifact count and surrounding scope, never material information granularity. Open Design or another selected provider owns generation; this Skill owns task-local scoping, provider adaptation, iteration, selection reconciliation and handoff preparation—not provider prompts/runtime, Design Authority, product meaning or acceptance.

## Hard boundaries

- A raw proposal, plan, brief, screenshot or existing resource is valid input. Never require, create, invoke, regenerate or edit a Source Plan.
- The explicit output/development scope is a hard ceiling. Necessary surrounding context may orient the slice but cannot expand it.
- Candidates are ordinary external Source. They do not select themselves, become `exact-target`, update `DESIGN.md`/Context or prove implementation acceptance.
- Keep candidate effects in a task-local buffer. Only after explicit selection or explicitly delegated selection may accepted decisions be reconciled once and idempotently into the initial proposal; never write rejected/unresolved meaning as accepted.
- Never mutate `project_context/**`, `DESIGN.md`, a Delivery Contract, production code or tests as a resource-authoring side effect.
- Do not require a prototype, fidelity pair, provider-native file, fixed directory, variant count, resource pack or one artifact per control. Reuse selected component families and group repeated controls.
- Visual resources may express user-visible interaction/presentation but cannot invent or become sole owner of business, data, permission or algorithmic rules.
- Do not install/configure MCP, plugins, authentication or disclosure paths without separate authorization. Create no provider registry, workflow state, authority lifecycle, scheduler or acceptance record.

## Progressive references

1. Always read [resource-selection.md](references/resource-selection.md) to fix the scope ceiling, intent, input roles, style dependency and minimum commission.
2. Read [open-design-provider.md](references/open-design-provider.md) only before live capability discovery, provider execution, Design Authority binding, source acquisition or recovery.
3. Read [downstream-handoff.md](references/downstream-handoff.md) only when selection, proposal reconciliation or downstream handoff is material. A simple unselected preview may stop without it.
4. Read [formal-selected-web-app-handoff.md](references/formal-selected-web-app-handoff.md) completely only for an explicitly final selected Web/App implementation handoff. Exploration, unselected previews, reference-only resources and non-Web/App commissions never load this reference.

## Workflow

1. Name in-scope surfaces/flows/regions/component families/unique controls, conditions, necessary context, exclusions and intent: `exploration`, `handoff` or `selected-source-preparation`.
2. Inventory every input as `exact-target`, `constraint`, `inspiration`, current-implementation evidence or background. Report unreadable/unused material.
3. Classify the commission `style-bearing` or `non-fidelity`. Style-bearing means high fidelity/brand/visual direction/typography/color/density/component treatment/production-style prototype. IA/flow topology, low-fidelity structure and semantics-only state studies are non-fidelity.
4. For style-bearing work, read configured Design Authority and its exact-value token source. If unconfigured, stop before provider project/run creation and route the user to explicit `$design-system-authoring`; never invoke it automatically. Non-fidelity work remains allowed.
   A combined explicit request authorizes running `$design-system-authoring` first and then resuming this Skill.
5. Discover only the live provider capabilities needed by the bounded commission. Give every considered resource one disposition—`selected`, `optional`, `not-needed`, `unavailable` or `decision-required`—with a reason. Ask only when a missing preference materially changes the result.
6. Bind style-bearing provider work to the adopted design-system identity, send only the scoped product/resource commission and keep provider execution, artifact readiness, design suitability, final selection and authority adoption distinct.
7. Iterate within scope. Exploration returns a visible candidate after minimal sanity review. Do not burden it with handoff schema, hashes, complete Fact closure or downstream validation.
8. After final selection, preserve immutable identity and editable-upstream provenance; reconcile accepted proposal effects once. If an implementation handoff was requested, use the applicable downstream reference—and the formal reference only for selected Web/App targets.

## Conditional Design Authority stop

Unconfigured includes a missing `DESIGN.md`, the starter/status `unconfigured`, style-only prose/inspiration or no authored exact-value token source/generation direction. Say:

```text
Style-bearing design resources require an adopted project design system. Explicitly invoke $design-system-authoring to generate/select/adopt one, then resume $design-resource-authoring. I will not initialize it automatically.
```

## Routing and output

Route durable system adoption/repair to `context_uiux_design`, surface responsibility to `context_surface_contract`, ordinary implementation to the default Workflow Contract/current Goal, and machine-assurance delivery to an explicitly selected/resumed `long-task-workflow`.

Report intent-sized results: scope/context/exclusions, style gate, input roles, resource dispositions, provider/binding status, visible artifacts/locators, selection basis, immutable/editable provenance, limitations/decision gaps and proposal-reconciliation status. A formal handoff additionally reports exactly what its dedicated reference requires. Never call a failing, unresolved, incomplete or unselected result ready.
