# Page-Level UI/UX Authority Upgrade — Historical Design Source

Status: dated ordinary Source/history. Current product and workflow authority lives in `PROJECT_SPEC.md` and owning `project_context/**`. Legacy mechanism terminology below is retained only as provenance for the completed design change; it is not an active Skill, workflow stage, plan type, Context owner or completion Authority.

<a id="plan-meta"></a>
## Plan Metadata

- Plan key: `PLAN-UIAUTH-001`
- Status: approved for implementation by the user on 2026-07-21; evidence-driven production-binding amendment approved on 2026-07-23
- Goal: close the gap between coarse product/UI intent and control-level implementation, acceptance and testing without adding a second product/design authority or a second Long-Task lifecycle.
- Applies to: Project Tiny Context Harness package, managed Context/Skills/templates, Long-Task Contract semantics, diagnostics, public documentation and affected test suites.
- Does not apply to: implementing or redesigning Starward itself. Starward is evidence for the problem and a future consumer/pilot, not a target workspace of this delivery.
- Boundary: this document is ordinary upstream Source/history. It is not Context, a Delivery Contract, runtime state, current workflow routing or completion proof and must not be registered in `project_context/context.toml`.

<a id="plan-summary"></a>
## Executive Decision

The upgrade will establish one recoverable UI/UX authority chain:

```text
current user/delivery Source
  -> durable Surface + Screen/Control Context
  -> DESIGN.md visual-system and target registry
  -> versioned authored design targets
  -> existing Delivery Contract projections
  -> production implementation
  -> project-owned visual, interaction, accessibility and target-runtime evidence
```

The implementation will not add a generic `design` Context role, a `uiux_delivery` authority block, per-surface workflow state, a design scheduler, a second Contract or a second Final Gate. It will instead:

1. define a depth-layered Design Context model using existing Context roles;
2. add an on-demand Screen Contract template with control-level semantics;
3. add a mandatory UI Authority Closure reconciliation step for material UI work;
4. preserve the Source Plan control vocabulary through the existing Long-Task `controls` projection;
5. bind Long-Task Controls by production surface/target to route/component owners, a root-entry real-user journey and target-local proof;
6. distinguish design-resource integrity, rendered output and selected-target implementation conformance, and project declared design blockers into existing machine/external acceptance;
7. make doctor distinguish project-level visual-system configuration from page-level implementation readiness;
8. bind the change into managed Skills, public documentation, source sync and focused/full regression coverage.

<a id="plan-inputs"></a>
## Input Inventory And Treatment

### `IN-USER-001` — Current conversation and approval

- Role: controlling direct Source.
- Direct meaning:
  - Design Context must be general enough for different product categories and different depths of design information.
  - A coarse product plan cannot be treated as if it already contains every control-level implementation and acceptance fact.
  - UI/UX facts must not silently conflict with product-plan facts and must reliably enter information integration and agent execution.
  - Produce a complete detailed plan, create a native Goal, execute it, index important information and account for test-suite impact.
- Treatment: all requirements in this plan trace back to this input unless explicitly marked derived or delegated.

### `IN-EXT-001` — Attached external proposal

- Path at authoring time: `C:\Users\777\.codex\attachments\adc1c9bf-c698-46ae-b6bc-819752ba43fb\pasted-text.txt`
- Role: external proposal and problem evidence, not automatically authoritative project fact.
- Adopted meaning:
  - material production UI needs page responsibility, information hierarchy, layout regions, controls, state variants, navigation, selected targets and verification bindings;
  - inspiration cannot authorize fidelity implementation;
  - Context/targets define intended UI, code defines current implementation and evidence proves conformance;
  - browser/proxy evidence cannot prove an independently failing native target;
  - subjective design selection remains human/delegated Source or external confirmation.
- Corrected or narrowed meaning:
  - no mandatory Figma, directory layout, three visual variants, pixel-perfect universal threshold or full Cartesian coverage;
  - no package-owned per-surface readiness state machine;
  - no required `uiux_delivery` block or second UI/UX Contract lifecycle;
  - no planned-target mechanism that would authorize fidelity implementation before a selected target is real Source and protected authority;
  - Starward-specific visual direction, viewport suggestions and page rollout order remain non-authoritative examples.
- Excluded artifact text: its final `Context: no durable fact change` line is an earlier handoff statement, not a requirement for this repository change.

### `IN-HARNESS-001` — Existing Harness Context and product specification

- Role: controlling durable project authority.
- Preserved invariants:
  - Minimal Context stays on-demand and has one owner per durable fact;
  - one `Context Delta: none|required` remains the only durable-fact result;
  - Long-Task keeps one Goal, one selected workspace, one Contract, one Active Authority and one Final Gate;
  - Source Plan remains optional upstream Source;
  - only current-snapshot declared evidence can create machine acceptance;
  - managed source/package/generated copies remain byte-aligned.

### `IN-IMPL-001` — Current package implementation

- Role: current implementation evidence.
- Relevant observations:
  - Product Surface Contract and Design Authority guidance already exist;
  - Source Plan guidance already requires a rich control inventory;
  - Long-Task `controls` currently preserves only location, trigger, input, loading, empty, success, failure and feedback;
  - doctor currently reports only `missing`, `unconfigured` or `configured` for `DESIGN.md`;
  - no Screen Contract template exists;
  - affected-test routing already recognizes managed UI guidance and design diagnostics but needs coverage for the new runtime hotspots.

### `IN-PILOT-001` — Starward repository observations from the external proposal

- Role: non-controlling problem/pilot evidence.
- Useful evidence: a large Source Plan can contain control detail that is not fully projected into a current Delivery Contract, while a custom `DESIGN.md` can be reported as `configured` without page targets.
- Boundary: no Starward file, design direction, target, viewport or Contract is modified or promoted by this delivery.

### `IN-PILOT-002` — Starward production-entry false-acceptance audit

- Role: current direct problem evidence supplied by the user and confirmed read-only against the pilot repository.
- Observed independent failure paths:
  - the production `MobileShellScreen` remained the real five-tab entry while separately implemented pages were reached by deep links;
  - native acceptance cold-started the shell but page Outcomes then opened internal routes, so root integration was not what the page tests proved;
  - the design verifier proved hashes, registries and counts while its accepted inventory still contained declared native-acceptance blockers;
  - Control Claims were concentrated on a browser support target because the generic Control proof surface was hard-coded to `ui_browser`;
  - no typed chain connected selected target/condition, production route/component owner, real-user journey, current render/comparison evidence and Final Gate.
- Treatment: this evidence invalidates the earlier assumption that lossless Control fields plus authoring guidance alone close production UI delivery. It authorizes the narrow production `surface_bindings` and `design_conformance` amendment below, while the Starward product remains out of implementation scope.

<a id="plan-problem"></a>
## Problem And False-Completion Paths

### `FAIL-UI-001` — Coarse product intent is mistaken for control-complete authority

A product plan can state the user flow and page responsibilities without specifying a control's visibility, availability, validation, default, recovery, permission or accessible alternative. If Contract authoring drops those fields, implementation agents must invent them and broad UI checks may still pass.

### `FAIL-UI-002` — Visual system configuration is mistaken for page readiness

A custom palette and component language can make `DESIGN.md` look configured while an affected screen has no Screen Contract, selected target/constraint or verification path. A global `configured` label can therefore overstate what is ready.

### `FAIL-UI-003` — Product, UI/UX and Contract facts duplicate or conflict

If product plans, Screen Context, `DESIGN.md` and Contract YAML all restate the same semantics independently, an agent can select the convenient version and silently bypass the actual owner.

### `FAIL-UI-004` — UI detail is available but not executed

Even when Source contains detailed controls, unstable naming or lossy projection can prevent Context selection, Contract claims, implementation bindings and checks from referring to the same thing.

### `FAIL-UI-005` — UI checks prove a proxy or only one dimension

A screenshot cannot prove interaction recovery or accessibility; browser output cannot prove a separately failing native target; Context validation cannot prove the UI works. Broad evidence can therefore produce a false-completion path when claims are not separated.

### `FAIL-UI-006` — Detached routes bypass the production entry and owner

A root shell may stay unchanged while page Checks open independently implemented routes. Target-runtime presence and deep-link page behavior can both pass without proving that the user can reach the selected page from the production navigation owner.

### `FAIL-UI-007` — Resource integrity is mislabeled as implementation conformance

Target file hashes, registry membership, counts, cold start and test IDs prove useful integrity/presence facts, but none compares the production render and interaction state with the selected target under declared conditions.

### `FAIL-UI-008` — Declared design blockers do not reach acceptance

A resource may explicitly identify unresolved native interactions as acceptance-blocking while the Contract neither maps them to machine Claims nor to target-blocking External Confirmations. Final Gate can then accept the scope without resolving or narrowing those blockers.

<a id="plan-authority-model"></a>
## Design Context Depth Model

The model is category-neutral: “surface” may mean a web page, mobile screen, desktop window, game HUD/menu, CLI/TUI view, extension panel, kiosk or embedded device interface.

### `DEPTH-0` — Global experience principles

- Owner: `global`, `foundation` or stable `decision-rationale` Context.
- Contains: enduring product experience priorities, safety/accessibility principles and cross-product rationale.
- Excludes: per-screen layout and exact visual values.

### `DEPTH-1` — Cross-surface responsibility

- Owner: existing `contract` role, normally a Product Surface Contract.
- Contains: main/drilldown ownership, shared state, navigation responsibility, diagnostic/operations placement and cross-surface invariants.
- Excludes: duplicated per-control details and exact target composition.

### `DEPTH-2` — Screen Contract

- Owner: existing `area` or `subdomain` role; a `contract` role is allowed only when the screen itself is a cross-area interface.
- Contains: stable surface/route key, user question, entry/exit, inherited/committed state, information hierarchy, region order, fixed/scroll/overlay ownership, navigation, responsive/mode/state variants and relevant target IDs.
- Excludes: binary targets, logs and duplicated exact token values.

### `DEPTH-3` — Control interaction contract

- Owner: the owning Screen/interaction Context when durable; task Source/Contract when delivery-local.
- Contains: stable control key, region/location, type, label/content, user task, visibility, availability, trigger, input, validation, default, interaction, navigation/result, loading, empty, success, failure, recovery, permission, feedback and accessibility.
- Excludes: code-level component plumbing unless it is a durable ownership boundary.

### `DEPTH-4` — Visual system and rationale

- Owner: `DESIGN.md` plus one authored exact-value token source/generation direction.
- Contains: visual language, tokens, components, modes, rationale and the durable design-reference registry.
- Excludes: product responsibility already owned by Context.

### `DEPTH-5` — Authored design target

- Owner: a versioned project-native asset or immutable external reference, indexed by stable ID.
- Contains: exact/constraint/inspiration interpretation and declared surface/component, viewport, theme/mode, state and content coverage.
- Excludes: implementation-generated self-baselines and completion evidence.

### `DEPTH-6` — Repeatable verification

- Owner: `verification` Context for stable paths; Delivery Contract Checks/Assertions for one delivery.
- Contains: production surface/target, fixtures, viewport/mode/state/content conditions, evidence capabilities, machine/human boundary and repeatable entrypoints.
- Excludes: one-off output or claims that untested combinations passed.

<a id="plan-ownership"></a>
## Single-Owner And Conflict Rules

For every material UI item, authoring must classify the item as exactly one of:

- `context-covered`: existing durable owner is sufficient; reference it;
- `context-update`: durable meaning changed or is missing; update the owning Context before code/Compile;
- `task-local`: it matters only to this delivery and remains Source/Contract meaning;
- `out-of-scope`: preserve the exclusion explicitly;
- `decision-required`: controlling sources conflict or a material preference cannot be defensibly resolved.

Ownership is by meaning, not by file type:

| Meaning | Primary owner | Downstream treatment |
|---|---|---|
| Current requested change and approval intent | current user/delivery Source | reconcile with durable Context |
| Cross-surface responsibility/shared state | Product Surface Context | reference, do not restate independently |
| Stable screen hierarchy/interaction | Screen/interaction Context | bind by stable screen/control key |
| Visual system/tokens/reference interpretations | `DESIGN.md` + authored token source | reference from Screen/Contract |
| Concrete visual composition | selected design target | freeze as versioned Source/verifier input |
| This delivery's acceptance scope | existing Delivery Contract | project, bind and prove; never invent owning semantics |
| Current behavior | production code | implementation evidence only |
| Conformance result | current-execution evidence/human confirmation | never promoted into target/Context automatically |

If two controlling owners disagree, authoring fails closed: update the stale owner through the normal Context/Source path or keep a genuine decision. File order, newer timestamps, current code and Contract convenience never silently decide the conflict.

<a id="plan-requirements"></a>
## Requirements

### Context and templates

- `REQ-CTX-001` — Define the depth model and UI Authority Closure vocabulary in durable Harness Context.
- `REQ-CTX-002` — Add one optional/on-demand `screen-contract.md` managed template using existing roles.
- `REQ-CTX-003` — The Screen template must cover screen identity, entry/exit/shared state, information hierarchy, layout regions, full controls, variants, navigation/interaction, target refs, verification, non-goals and maintenance.
- `REQ-CTX-004` — Keep `product-surface-contract.md` as the cross-surface responsibility template and link it to deeper Screen Contracts without duplicating them.
- `REQ-CTX-005` — Register only retrieval triggers for the durable Context rules; never register this Source Plan.

### Default workflow and Skills

- `REQ-WF-001` — Material UI work must run UI Authority Closure before implementation; local style/UI fixes and explicit non-fidelity prototypes stay lightweight.
- `REQ-WF-002` — Explicitly separate Screen/Control Context, `DESIGN.md`, authored targets and verification ownership.
- `REQ-WF-003` — Stable surface/control/target keys must flow through product planning, surface authoring, UI/UX design and engineering guidance.
- `REQ-WF-004` — Missing target authority routes to explicit design authoring/delegation or a genuine decision; inspiration never authorizes fidelity implementation.
- `REQ-WF-005` — Public guidance remains English-complete with aligned Chinese documentation.

### Long-Task Contract projection

- `REQ-LT-001` — Extend the existing optional Control shape with `surface`, `region`, `control_type`, `label_content`, `user_task`, `visibility`, `availability`, `validation`, `default_value`, `interaction`, `navigation_result`, `recovery`, `permission` and `accessibility`.
- `REQ-LT-002` — Existing Control field syntax remains compatible; omitted optional fields normalize to empty strings and do not create claims. A V2 Contract that already declares Controls but lacks production `surface_bindings` receives an actionable semantic-migration diagnostic instead of silent acceptance.
- `REQ-LT-003` — Every non-empty new field becomes a stable Control claim and participates in Source-target indexing, semantic authority projection, revision diffing and field-policy completeness.
- `REQ-LT-004` — Existing Requirement, Control, Assertion, Check, Stage, Binding and external-confirmation lifecycle remains the only authority/proof lifecycle; one narrow typed `design_conformance` capability distinguishes selected-target comparison from render/resource integrity.
- `REQ-LT-005` — A combined design-and-implementation delivery may express design Outcomes/Stages before a selected target exists, but fidelity implementation is not authorized until the selected target is real marked Source/Context/registry input and a protected revision has adopted it.
- `REQ-LT-006` — No new `uiux_delivery` block, Claim kind, visual risk level, target-selection state, design Receipt or second Gate is added.
- `REQ-LT-007` — An Outcome with Controls must aggregate them into Product `surface_bindings` keyed by one declared owner surface and required product target and reference existing Technical route/component Bindings.
- `REQ-LT-008` — Every bound Control Claim must have proof on that product target with the runtime-appropriate proof surface. The named root-entry success Check must include the declared real entry action and, for every bound Control, prove its navigation result when declared or its interaction/trigger/location fallback with all-of `interaction_trace` and `target_runtime`.
- `REQ-LT-009` — A selected exact/constraint target must name frozen target inputs, declared condition keys, bound Control Claims, a root-entry conformance Check/Assertion and current actual/comparison artifacts; its Assertion requires `design_conformance`, `interaction_trace` and `target_runtime`.
- `REQ-LT-010` — Each surface binding explicitly inventories declared design-acceptance blockers and resolves every entry through a target-local machine Claim or a target-blocking External Confirmation whose impacts include the scope. An empty array means none were declared; a known blocker cannot be waived in-band and leaves scope only through explicit revised Source/Contract authority.
- `REQ-LT-011` — Surface bindings and conformance metadata are protected Product/Acceptance semantics and participate in Authority Revision/fresh Raw Execution without creating per-surface state.

### Diagnostics

- `REQ-DOC-001` — Preserve the compatible `missing | unconfigured | configured` top-level inspection status.
- `REQ-DOC-002` — Inspect whether a configured `DESIGN.md` has a Design Authority Index, a selected token-source declaration and classified durable references.
- `REQ-DOC-003` — doctor must explicitly say that global/system configuration does not establish surface-level implementation readiness.
- `REQ-DOC-004` — Missing index/selection signals are advisory warnings, not a validator, workflow state or false per-surface calculation.

### Verification and synchronization

- `REQ-VER-001` — Add behavior tests for template/Skill/public-doc parity, full Control field projection and doctor advisory semantics.
- `REQ-VER-002` — Update affected-test routing so new Control runtime hotspots select field/claim/authority regression coverage.
- `REQ-VER-003` — Build before runtime tests; run source sync twice, package source parity, enabled-profile workspace sync, focused tests, affected tests, Context/Harness validation, Trust coverage and the complete package suite.
- `REQ-VER-004` — Tests must prove absence of a new Context role/lifecycle and compatibility of old Controls.
- `REQ-VER-005` — Reuse the existing target-runtime non-substitution Trust sentinel to prove a Starward-shaped support-target/deep-link/resource-integrity Contract fails and a production-bound root journey with valid design-conformance/blocker closure passes.

<a id="plan-control-contract"></a>
## Canonical Control Field Semantics

Each field is optional except `key` and `location`. Non-applicable fields remain empty; they must not be filled with generic prose merely to satisfy shape.

| Field | Meaning |
|---|---|
| `key` | stable semantic control identity |
| `surface` | owning surface/screen key when location alone is ambiguous |
| `region` | semantic page/scene/CLI region |
| `location` | observable placement within the product experience |
| `control_type` | user-facing control or interaction pattern |
| `label_content` | visible/announced label or content contract |
| `user_task` | judgment or action this control enables |
| `visibility` | when it is present or hidden |
| `availability` | enabled/disabled/prerequisite rules |
| `trigger` | activation event or gesture |
| `input` | accepted user/system input |
| `validation` | invalid-input rule and observable response |
| `default_value` | initial or restored value/state |
| `interaction` | commit/cancel/gesture/focus behavior |
| `navigation_result` | destination or state transition |
| `loading_state` | observable pending state |
| `empty_state` | observable no-data/no-result state |
| `success_state` | observable successful result |
| `failure_state` | observable error/degraded result |
| `recovery` | retry, cancel, restore or interruption behavior |
| `permission` | permission-gated behavior and denial path |
| `feedback` | visual/auditory/haptic/text response |
| `accessibility` | semantics, keyboard/focus, target, motion or alternative path |

<a id="plan-outcomes"></a>
## Delivery Outcomes And Dependencies

### `OUT-UIAUTH-01` — Source and durable authority model

- Result: this Source Plan is indexed, and Context defines the depth/ownership/closure model.
- Depends on: none.
- Primary paths: this file, `PROJECT_SPEC.md`, `project_context/**`.

### `OUT-UIAUTH-02` — Screen/Control Context authoring surface

- Result: consumers receive an on-demand Screen Contract template and aligned Surface/Product/UIUX/Engineering guidance.
- Depends on: `OUT-UIAUTH-01`.
- Primary paths: managed templates and Skills, generated workspace Skills, package assets.

### `OUT-UIAUTH-03` — Lossless Long-Task Control projection

- Result: control-level Source fields survive parser, schema, claims, semantic authority and revisions without a new lifecycle.
- Depends on: `OUT-UIAUTH-01`.
- Primary paths: Long-Task schema/types/parser/claim/authority/index modules and focused tests.

### `OUT-UIAUTH-04` — Honest Design Authority diagnostic

- Result: doctor reports system configuration signals while disclaiming surface readiness.
- Depends on: `OUT-UIAUTH-01`.
- Primary paths: `design-md.ts`, `doctor.ts`, doctor tests.

### `OUT-UIAUTH-05` — Public contract, sync and regression closure

- Result: managed/package/generated/public surfaces match and all required verification is green.
- Depends on: `OUT-UIAUTH-02`, `OUT-UIAUTH-03`, `OUT-UIAUTH-04`.

<a id="plan-acceptance"></a>
## Acceptance Scenarios

### `AC-UIAUTH-001` — Different design depths remain independently recoverable

Given a consumer with global principles, a cross-surface contract, one Screen Contract, `DESIGN.md` and targets, when an agent changes one control, then guidance identifies the smallest owning layer and does not require loading every screen. Accepts `REQ-CTX-001`, `REQ-CTX-002`, `REQ-WF-002`.

### `AC-UIAUTH-002` — Coarse product Source does not become fake control authority

Given a product requirement that names a screen but omits validation/recovery/accessibility, when authoring material implementation, then UI Authority Closure classifies the missing semantics instead of silently inventing them. Accepts `REQ-WF-001`, `REQ-WF-003`, `REQ-WF-004`.

### `AC-UIAUTH-003` — Rich control details survive Compile semantics

Given a Control with every canonical field, when parsed and projected, then each non-empty field has a distinct stable claim/source target and semantic authority field. Accepts `REQ-LT-001`, `REQ-LT-003`.

### `AC-UIAUTH-004` — Legacy Control fields stay compatible and unsafe Contracts migrate

Given an existing Control containing only the original fields plus a valid production surface binding, when parsed/compiled, then new fields normalize empty and no empty-field claims appear. Given a Control-bearing V2 Contract without that binding, parsing returns a specific migration-required diagnostic rather than accepting proxy proof. Accepts `REQ-LT-002`.

### `AC-UIAUTH-005` — Protected UI semantics cannot silently drift

Given an active authority and a change to `validation`, `recovery` or `accessibility`, when revision analysis runs, then the exact semantic field/claim change is visible and user-reviewed under existing policy. Accepts `REQ-LT-003`, `REQ-LT-004`.

### `AC-UIAUTH-006` — Combined design work does not bypass target selection

Given a delivery that authors designs and later implements them, when the initial Contract has no selected target, then design Outcomes may run but fidelity claims cannot rely on a planned/candidate artifact; selected authority must enter real Source/registry and protected revision first. Accepts `REQ-LT-005`, `REQ-LT-006`.

### `AC-UIAUTH-007` — Custom visual system is not reported as page-ready

Given a custom `DESIGN.md` with no Design Authority Index or selected target refs, when doctor runs, then it reports configured system-level authority plus an advisory gap and explicitly refuses to infer surface implementation readiness. Accepts `REQ-DOC-001` through `REQ-DOC-004`.

### `AC-UIAUTH-008` — Inspiration cannot become an exact target

Given only inspiration references, when material fidelity implementation is requested, then managed workflow guidance routes to design authoring/selection or decision rather than authorizing reproduction. Accepts `REQ-WF-004`.

### `AC-UIAUTH-009` — Product/UI conflicts fail closed

Given conflicting product Source, Screen Context and target semantics, when information is integrated, then the conflict becomes a Context/Source update or `decision-required`; Contract YAML/current code cannot choose silently. Accepts `REQ-WF-001`, `REQ-WF-002`.

### `AC-UIAUTH-010` — Evidence stays claim-specific

Given visual, interaction, accessibility and native-target claims, when authoring checks, then a screenshot/browser proxy proves only its declared dimension and independent claims receive independent evidence or external confirmation. Accepts `REQ-LT-004`, `REQ-VER-001`.

### `AC-UIAUTH-011` — Lightweight UI work stays lightweight

Given a semantics-preserving local style fix with sufficient existing authority, when default Workflow routes it, then no Screen Contract, target or Long-Task lifecycle is required. Accepts `REQ-WF-001`.

### `AC-UIAUTH-012` — Distribution and tests close together

Given the final candidate, when synchronization and verification run, then managed source, generated Skills, package assets, Context, docs and runtime behavior are aligned and all declared suites pass. Accepts `REQ-VER-001` through `REQ-VER-004`.

### `AC-UIAUTH-013` — Support and deep-link pages cannot substitute for production UI

Given Controls proved by a browser support target and native pages opened only through internal/deep links, when Preflight/Compile runs for a required native product target, then it rejects missing target-local Control proof or the missing root-entry bound journey. Accepts `REQ-LT-007`, `REQ-LT-008`, `REQ-VER-005`.

### `AC-UIAUTH-014` — Resource integrity cannot masquerade as conformance

Given correct target hashes/counts and a current screenshot but no selected-target comparison record, when the Check is evaluated, then `visual_render`/presence remains insufficient and `design_conformance` is missing. Given matching compiled target/conditions plus current actual/comparison artifacts, the capability can pass. Accepts `REQ-LT-009`, `REQ-VER-005`.

### `AC-UIAUTH-015` — Declared blockers reach Final Gate

Given a design acceptance blocker preserved in the binding, when its refs are absent, reference a Claim proved only on another target, or name a non-blocking/unrelated confirmation, then activation fails. A valid target-local machine Claim or target-blocking impacted confirmation preserves existing Final Gate behavior. Empty inventory means none declared rather than waiver; removing a previously declared blocker is protected Source/Contract scope revision. Accepts `REQ-LT-010`, `REQ-VER-005`.

### `AC-UIAUTH-016` — UI protection has bounded cost

Given a Contract without Controls, no surface binding or design-conformance work is required. Given many Control fields on one production page, one surface/target binding covers them and only selected exact/constraint targets add conformance evidence. No UI state, Receipt, registry, scheduler or second Gate is created. Accepts `REQ-LT-006`, `REQ-LT-007`, `REQ-LT-011`.

<a id="plan-non-goals"></a>
## Non-Goals

- `NCOMP-UIAUTH-001` — Do not create or modify Starward designs, targets, Context or Contract.
- `NCOMP-UIAUTH-002` — Do not mandate Figma, image generation, a design directory or a number of design variants.
- `NCOMP-UIAUTH-003` — Do not introduce a generic `design` Context role or register Source Plans as Context.
- `NCOMP-UIAUTH-004` — Do not create a UI/UX state machine, readiness cache, target registry database, new Claim kind, second Contract or second Final Gate.
- `NCOMP-UIAUTH-005` — Do not claim subjective visual quality, untested combinations or native targets from proxy evidence.
- `NCOMP-UIAUTH-006` — Do not require full Screen Contracts for local style bugs, ordinary implementation under sufficient authority or explicit throwaway prototypes.
- `NCOMP-UIAUTH-007` — Do not bump/release the package solely for this implementation unless separately requested.

<a id="plan-risks"></a>
## Risks And Mitigations

- `RISK-UIAUTH-001` — Fact: richer Controls increase schema, hash and regression surface. Affects `OUT-UIAUTH-03`. Mitigation: additive optional strings, centralized field definitions where practical, parser/schema parity and authority completeness tests.
- `RISK-UIAUTH-002` — Fact: extra guidance can make every UI task heavy. Affects `OUT-UIAUTH-02`. Mitigation: retain explicit material/lightweight routing and on-demand Screen Context.
- `RISK-UIAUTH-003` — Fact: repeating field definitions across Skills/templates/docs can drift. Affects `OUT-UIAUTH-02`, `OUT-UIAUTH-05`. Mitigation: parity assertions, source sync and stable canonical vocabulary in this indexed Source Plan/Context.
- `RISK-UIAUTH-004` — Fact: doctor cannot calculate truthful per-surface readiness without project semantics and target coverage. Affects `OUT-UIAUTH-04`. Mitigation: report observable file signals only and state the inference boundary.
- `RISK-UIAUTH-005` — Fact: adding planned targets to runtime schema could create an implementation bypass. Affects `OUT-UIAUTH-03`. Mitigation: do not add planned-target state; use existing design Outcomes plus protected Source/authority revision.
- `RISK-UIAUTH-006` — Fact: managed source, package assets and generated workspace copies are separate physical surfaces. Affects `OUT-UIAUTH-05`. Mitigation: build, two sync passes, check-source and profile sync before final tests.
- `RISK-UIAUTH-007` — Fact: production bindings add authoring/schema surface. Affects `OUT-UIAUTH-03`. Mitigation: aggregate by surface/target, reuse existing Technical Bindings/Checks/Final Gate, require conformance only for selected targets and add no persistent state.
- `RISK-UIAUTH-008` — Fact: arbitrary external formats cannot be generically inspected for hostile or omitted blockers. Affects `OUT-UIAUTH-03`. Mitigation: Source authoring must preserve explicit blocker facts; the Contract makes their declared disposition fail-closed and documents the undeclared-Source limit.

<a id="plan-decisions"></a>
## Delegated Decisions And Unresolved Items

The user explicitly delegated the complete plan and implementation details. The following choices are therefore `delegated` plan meaning, based on existing Harness invariants and repository evidence:

- `DLG-UIAUTH-001` — Use existing Context roles plus a Screen Contract template instead of a new role.
- `DLG-UIAUTH-002` — Extend existing Control fields instead of adding `uiux_delivery` or another Claim kind.
- `DLG-UIAUTH-003` — Keep doctor advisory and system-level; do not persist/calculate per-surface workflow states.
- `DLG-UIAUTH-004` — Index this plan from `PROJECT_SPEC.md` and Context navigation while keeping it outside `context.toml` authority registration.
- `DLG-UIAUTH-005` — Treat package release/version bump as out of scope.
- `DLG-UIAUTH-006` — Add one grouped Product `surface_bindings` projection and one typed `design_conformance` capability rather than a UI registry/Gate or universal per-Control screenshot matrix.
- `DLG-UIAUTH-007` — Migrate existing Control-bearing V2 Contracts explicitly because compatibility that preserves the proven false-acceptance path would violate the controlling objective.

There are no unresolved product/technical preferences required to implement this repository-scoped change. No payment, production deployment, public release, destructive mutation, permission grant or sensitive-data transmission is authorized or required.

<a id="plan-verification"></a>
## Verification Plan

Run in this order after implementation stabilizes:

1. TypeScript/package build.
2. Focused static/behavior tests for Surface/Screen guidance, Source Plan alignment, Control/surface-binding claims and authority fields, target/root non-substitution, typed design-conformance evidence, blocker projection, doctor output and affected-test selection.
3. `package sync-source` twice and prove the second pass is idempotent.
4. `package check-source` and enabled-profile workspace sync.
5. `make validate-context` and `make validate-harness`.
6. `npm run test:affected` against the actual candidate diff.
7. Long-Task Trust Boundary suite because schema/semantic-authority paths changed.
8. Complete package regression suite because a public Contract schema and package-managed assets changed.
9. `git diff --check` and a final Context/source/package drift review.

No prose result, Context validation or focused test alone counts as delivery completion.

<a id="plan-traceability"></a>
## Traceability Summary

- `IN-USER-001` -> all `REQ-*`, especially depth, missing-control closure, conflict prevention, indexing and tests.
- `IN-EXT-001` -> `FAIL-UI-*`, `DEPTH-*`, target/evidence boundaries and `AC-UIAUTH-006` through `AC-UIAUTH-010`, with the corrections recorded above.
- `IN-HARNESS-001` -> all `NCOMP-*`, single-owner rules and existing-lifecycle constraints.
- `IN-IMPL-001` -> `REQ-LT-*`, `REQ-DOC-*`, `REQ-VER-*` and concrete implementation paths.
- `IN-PILOT-001` -> original problem validation only; no project-specific output requirement.
- `IN-PILOT-002` -> `FAIL-UI-006` through `FAIL-UI-008`, `REQ-LT-007` through `REQ-LT-011`, `REQ-VER-005` and `AC-UIAUTH-013` through `AC-UIAUTH-016`; no Starward product mutation.

Every adopted material input is represented by a requirement, non-goal, risk or explicit boundary above. No supplied attachment is silently treated as exact visual authority.
