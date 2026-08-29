# DRA Incremental Authoring And Review Development Source

## Status And Purpose

This document is the ordinary development Source requested for the current native Goal. It preserves the complete implementation decision after the original proposal, Codex audit and Web GPT Pro response were reconciled, so conversation compaction does not remove required details.

It is not Context, Design Authority, a DRA checkpoint, an approval record, a Delivery Contract, a Gate, acceptance evidence or a second workflow. Durable behavior remains owned by `project_context/**`; exact visual values remain owned by selected canonical design resources under their declared conditions; current implementation truth remains in the package-managed Skill and tests.

The delivery uses the Default Workflow Contract. The user explicitly excluded Long-Task Workflow bootstrap. No Long-Task runtime behavior, Final Gate execution, rationale or managed Skill change is in scope. `PROJECT_SPEC.md` is, however, one already-declared input of the repository's current compact semantic Source/Contract pair; preserving that existing pair after the required positioning edit permits only the package-owned mechanical input/revision rebind described below and does not activate Long-Task.

## Indexed Inputs And Owners

### Conversation inputs

- `S1` — original development proposal: historical non-resolvable locator `attachment-provenance://555a8095-effe-404c-a2c9-4e9363c545c8/pasted-text.txt`
- `S2` — Web GPT Pro response accepting and refining the Codex audit: historical non-resolvable locator `attachment-provenance://9ed6ff3f-2736-4b58-9235-01e8076f228e/pasted-text.txt`
- `G1` — the active native Goal objective indexes `S1`, `S2`, this file and the controlling repository owners.

### Controlling repository owners

- `C1` — `project_context/areas/harness-package/contracts/design-resource-authoring.md`
- `C2` — `project_context/areas/harness-package/contracts/package-managed-surfaces.md`
- `C3` — `project_context/areas/harness-package/verification.md`
- `C4` — `project_context/context.toml`
- `K1` — `.codex/ty-context-managed/skills/design-resource-authoring/SKILL.md`
- `K2` — `.codex/ty-context-managed/skills/design-resource-authoring/references/resource-selection.md`
- `K3` — `.codex/ty-context-managed/skills/design-resource-authoring/references/open-design-provider.md`
- `K4` — `.codex/ty-context-managed/skills/design-resource-authoring/references/downstream-handoff.md`
- `K5` — `.codex/ty-context-managed/skills/design-resource-authoring/references/recovery-and-writeback.md`
- `K6` — `.codex/ty-context-managed/skills/design-resource-authoring/references/formal-selected-web-app-handoff.md`
- `P1` — `PROJECT_SPEC.md`
- `P2` — `README.md` and `README.zh-CN.md`
- `V1` — `tests/ty-context/design-resource-authoring-skill.test.mjs`
- `V2` — `tests/ty-context/design-resource-authoring-provider.test.mjs`

## Accepted Audit Disposition

All seven P1 findings are accepted. Findings 1, 2, 4, 5, 6 and 7 apply without qualification. Finding 3 also applies, with the refinement that each DRA task chooses between two already legal paths according to its recovery need; the project does not introduce a new approval protocol.

The delivery preserves the original proposal's useful intent:

1. narrowly strengthen the explanation of the engineering problem the project addresses;
2. make DRA incrementally reuse selected existing resources and explicitly preserve unaffected meaning;
3. project the adopted Design Authority into a bounded style-bearing commission;
4. review design-system application and visual language, not only mechanical artifact validity;
5. create a clear user-facing direction-review and candidate-selection loop before formal delivery preparation; and
6. route feedback through the existing Base, Delta, authority, selected-source, audit, recovery and formal-handoff owners.

The following parts of the original proposal are removed or reduced:

- automatic scope expansion;
- delayed repair of Product/Surface/Screen/Design owners;
- `review_set_id`, approval registries, approval checkpoints or new approval statuses;
- parallel `mechanical_validity`, `visual_conformance`, `user_review_status` or `handoff_readiness` state models;
- a persistent Application Projection or a new `design-application-and-review.md` reference;
- unconditional claims that only identified resources are affected;
- claims that pre-review candidates already have formal Web/App completeness;
- a new independent visual benchmark track in this delivery;
- duplicate causal-chain expansions across Context and READMEs; and
- any new Long-Task file, workflow behavior, runtime mechanism, proof obligation or acceptance change. The sole supporting exception is package-tool regeneration of the existing compact Source/Contract pair after its declared `PROJECT_SPEC.md` input changes; its Fact, obligation, input, claim, target and assertion populations must remain unchanged.

## Selected Architecture And Owner Allocation

### Scope and incremental impact — `resource-selection.md`

The explicit output/development scope remains a hard ceiling. Necessary surrounding context can improve interpretation but never adds generated artifacts or detailed targets outside that ceiling.

Inside the ceiling, derive:

```text
resources to commission
  = material in-scope UI/UX decisions
  - sufficient selected existing-source coverage
```

The analysis also records preservation: which current selected resource facts, product/surface meaning, states, conditions, component-family mappings and exact values must remain unchanged.

If analysis discovers an effect outside the ceiling:

```text
assess the effect without generating outside the ceiling
-> decision-required
-> reason: scope-expansion-required
-> wait for explicit user scope expansion
-> recompute the scope ceiling
```

`scope-expansion-required` is only a reason for the existing `decision-required` disposition, not a new formal state. The user may instead choose an in-scope alternative such as a local override.

If a durable Product, business, capability, Surface, Screen, information/action/feedback responsibility, primary work object/task loop, interaction topology, Design Authority, token or component-family grammar must change, DRA stops and routes the change to the actual owner first. It re-reads that owner and resumes only after the Source is current. Candidate execution defects stay within DRA and do not cause a durable-owner update.

The existing task-local commission envelope gains a minimal `style_application` section for style-bearing work. It may contain only current-slice instructions such as:

```yaml
style_application:
  primary_content_priority: map
  density: compact
  container_treatment: flat
  visible_vs_hit_geometry: separate
  preserve: []
  prohibited_patterns: []
```

The concrete values are illustrative and task-specific. The section references current Design Authority and selected-resource meaning; it is not a file, schema, persistent Projection, Authority, state or acceptance record. A simple high-fidelity preview may use it without another tool action or persisted side effect.

### Provider, artifact and suitability — `open-design-provider.md`

Keep these existing concepts distinct:

1. Provider execution;
2. Artifact readiness; and
3. Design suitability.

Do not introduce a fourth user-review state or another readiness owner. Handoff readiness remains the existing derived composition of current resource revalidation, Design suitability, bidirectional and blast-radius audit results, durable final ownership, Proposal reconciliation, applicable formal handoff/preflight and absence of unresolved blockers.

`Design suitability` is an umbrella review with these subchecks:

- scope and source suitability — the candidate stays within the ceiling and follows current controlling Product/Surface/Screen/Design Source;
- mechanical checks — the promised resource is readable, structurally usable and not obviously corrupt or broken for the intent;
- design-system application checks — the adopted system identity and applicable exact-value/token lineage are used correctly;
- visual-language checks — hierarchy, emphasis, density, container treatment, typography, color, spacing, component treatment and other task-material visual relationships are coherent with the selected direction;
- state/condition coverage checks — only demonstrated states, variations, viewports, input/accessibility conditions and interactions are credited; and
- preservation checks — explicitly preserved meaning and unaffected bindings remain unchanged.

These checks are Source-bound and proportional to intent. A reviewer must report checked and unchecked conditions. Subjective or ungrounded preference cannot be mislabeled as a Source conflict. Provider success, a render, a screenshot or a visual-language pass never independently proves artifact readiness, selection, formal completeness, production conformance or acceptance.

Every material revision is re-reviewed against the same currently applicable subchecks. A material revision includes a changed selected visual direction/design system, cross-surface information architecture, primary interaction model, declared condition/state coverage, preservation obligation or canonical source/Fact closure. Purely equivalent packaging does not force a new design choice.

### Review and selection — `downstream-handoff.md`

Name the interactive pause exactly **Design Resource Review & Selection Stop**. It is an explicit conversational stop for direction review and candidate selection. It is not an approval record, persistent status, Gate, acceptance, formal readiness, completeness proof or fixed mandatory pause for a one-turn small request.

At the stop, show the current candidate or addressable preview together with:

- scope ceiling, necessary context and exclusions;
- selected existing coverage, newly generated coverage and preservation obligations;
- Provider execution and Artifact readiness qualifiers;
- Design suitability findings and every materially unchecked condition;
- known out-of-ceiling effects and `decision-required` items;
- immutable canonical identity and editable upstream route when already available; and
- rejected alternatives and unresolved choices without promoting them to accepted meaning.

The user may:

- request correction of design execution;
- change a requirement, which routes to its actual Source owner when durable;
- select or reject a candidate;
- leave a choice unresolved;
- explicitly expand the scope; or
- change a durable Product/Surface/Screen/Design owner before DRA resumes.

Selection remains an independent user/team choice or explicitly delegated choice. Design suitability cannot select a candidate.

Ordinary conversational selection creates no approval record or persistent workflow state and makes no deterministic cross-session recovery promise. If an unmaterialized selection is lost, it must be reconfirmed.

When deterministic cross-interruption recovery is actually required, use only the existing repository-readable raw-digest-bound marked Source, `ty-dra-authority-v1`, selected-source record and conditional DRA recovery checkpoint rules. This is a task-local route decision, not a project-level protocol choice and not a new state machine.

### Replay, impact assurance and writeback — `recovery-and-writeback.md`

For a material/recoverable loop, the existing set-exact `audit_expectations`, Requirements-to-Resource rows, Resource-to-Requirements bindings, resource-decision catalog, explicitly unchanged universe, blast-radius universe and inactive-Delta leakage catalog may prove change/preservation/final-owner claims only within their declared frozen universe.

For a simple preview or ordinary loop without complete bindings, report only a conservative impact analysis from currently readable bindings. It must mark unverified scope, conservatively regenerate within the current ceiling or return `decision-required`. It cannot claim a complete dependency closure, claim that only identified resources are affected or expand outside the ceiling for safety.

The recovery/writeback reference remains the sole owner of Base/Delta replay, decision authority, audit catalog, selected-resource identity, CAS, interruption recovery and Proposal writeback mechanics. No new checkpoint field, schema, persisted selection status or writeback result is added by this delivery.

### Formal selected Web/App closure — `formal-selected-web-app-handoff.md`

The Review & Selection Stop supports direction choice; it does not claim that the complete Expected Fact Universe, canonical dependency closure, frozen Inspector Census, manifest, bundle or preflight already exists.

After the user selects a Web/App direction and requests a formal implementation handoff, the existing formal owner performs its complete closure. If that closure exposes a new state, component part, dependency, condition, visible or semantic design difference, unavailable observation or `decision-required` choice, return to the Review & Selection Stop. Do not silently absorb the difference and do not call the earlier choice final-complete.

Continue only when formal closure introduces no new visible design or selection decision. In a formal handoff path, perform the one consolidated idempotent Proposal reconciliation after selected direction plus complete formal closure plus no new visible decision. Then hand off the reconciled Proposal, selected canonical resources and formal handoff together.

### Selection identity and derived artifacts

A user selection binds:

```text
canonical selected source digest
+ target identity
+ declared conditions
+ controlling Source / Design Authority identity
```

A preview URL, file name, PNG, export archive or wrapper is a derived artifact, not selection identity. A derived artifact proven equivalent to the selected canonical source under the bound target and conditions does not invalidate selection. A visible or semantic difference requires another suitability review and Review & Selection Stop. Do not invalidate selection merely because every derived file's bytes changed.

### Ownership-preserving consistency

The final consistency rules are:

```text
valid product, business, permission, data, algorithm and technical meaning
  = its independent authoritative Source
```

```text
resource-owned exact visual / observable design facts
  = selected canonical design-resource facts under declared conditions
```

```text
Proposal and handoff bindings
  = correct links between those owners with no loss, tampering,
    unsupported gain, scope overreach or wrong ownership
```

A design resource may own exact visual values for its declared conditions. It cannot become the owner of product, business, permission, data, algorithm, commercial, safety or technical meaning.

## End-To-End Main Chain

```text
explicit current scope ceiling
+ controlling Product / Surface / Screen Source
+ Design Authority
+ selected existing resources
        ->
ceiling-local existing coverage, gaps and preservation
        ->
outside-ceiling effect
        -> decision-required(reason: scope-expansion-required)
        ->
durable Product/Surface/Screen/Design owner change
        -> update the actual owner, reread it, then resume DRA
        ->
minimal style_application in the existing commission envelope
        ->
Provider generation or revision
        ->
Artifact readiness
        ->
Design suitability subchecks
        ->
Design Resource Review & Selection Stop
        ->
user correction / requirement change / select / reject / expand scope / owner change
        ->
existing conversational or deterministic Base/Delta/authority route
        ->
selected direction
        ->
if formal Web/App: canonical source + dependency + Census + manifest + preflight closure
        ->
if new visible change or decision: return to Review & Selection Stop
        ->
one Proposal reconciliation
+ selected canonical resources
+ formal handoff
```

## Project Positioning Change

Add one short `Underlying Engineering Problem` section to `PROJECT_SPEC.md`: large plans, durable project truth, design intent, implementation and proof commonly drift into disconnected representations; the Harness is designed to reduce that drift by keeping durable ownership recoverable, routing ordinary work through a lightweight contract, and reserving explicit machine-closure machinery for deliveries that require it.

Add only a one- or two-sentence human-readable summary to each root README. Use wording such as “designed to reduce”; do not claim measured defect reduction, adherence improvement, visual quality or ROI without conclusion-grade benchmark evidence. Do not replicate the entire causal chain across `global.md`, multiple Context files or package documentation.

## Verification And Evidence Boundary

This delivery does not add an independent visual benchmark track. It may add static behavior tests for:

- the hard ceiling and `scope-expansion-required` reason;
- actual-owner-first routing;
- the existing-envelope `style_application` and preservation language;
- conservative versus catalog-backed impact claims;
- the six Design suitability subchecks and selection independence;
- the non-authoritative Review & Selection Stop;
- conversational versus deterministic recovery routes;
- post-selection formal closure returning to review when it creates a visible decision;
- reconciliation only after stable formal closure;
- canonical selection identity and equivalent-derived-artifact handling; and
- absence of a new reference, registry, state, readiness owner or benchmark.

Those tests prove owner/boundary guidance and distribution only. Managed/generated/package byte parity proves distribution only. They do not prove Agent adherence, reduced visual distortion, fewer human corrections, Provider iteration quality, performance, total ROI or production conformance.

An opt-in real Open Design smoke may be attempted as a non-gating diagnostic when the Provider, authentication and local environment are actually available. Its absence or failure is reported honestly and cannot invalidate deterministic repository tests or establish an effect claim.

A later separately authorized benchmark delivery would need a frozen case/gold/hidden-oracle set, schema, scorer, runner, aggregate, attestation, independent pair protocol, Provider/model/reasoning/environment provenance and false-blocking policy. It would retain the existing minimum three eligible pairs, five when required, critical non-degradation, targeted defect and must-allow criteria, zero simple-path persistence/actions and the existing median token/wall overhead boundary. None of that benchmark construction is part of this Goal.

## Implementation And Sync Plan

1. Update the owning DRA Context before managed Skill implementation. Read and preserve the existing package-surface, verification and trigger Context: this delivery changes no source/generated/package topology, verification entry point or Context graph/routing need, so those files receive no duplicated DRA behavior paragraph.
2. Narrowly update `PROJECT_SPEC.md`, root English/Chinese README and only other public surfaces whose current DRA wording would otherwise conflict.
3. Modify only the existing DRA main Skill and existing owner references. Do not create a sixth reference or edit Long-Task behavior. If the required `PROJECT_SPEC.md` change only invalidates a declared repository-input digest without changing any compact Source item or semantic projection, use `tools/migrate_long_task_compact_carrier.mjs --sync-repository-inputs --write` on the existing named Source/Contract pair. If it changes declared Source-item meaning or projection, use `--sync-source-authority --write` instead and review every regenerated `decision_required` fragment. The modes are mutually exclusive; neither permits an unreviewed population or semantic-owner change.
4. Add owner/boundary and must-block/must-allow assertions to existing DRA tests without weakening prior assertions.
5. Build the package.
6. Run package `sync-source` from canonical managed source.
7. Run current-workspace `ty-context sync` to refresh generated `.codex/skills/**`.
8. Repeat sync and run `package check-source` to prove idempotence and managed/generated/package parity.
9. Run focused DRA/provider tests, affected selection and affected tests, Context/Harness validation and one final complete suite on the frozen current candidate.
10. Review the final diff, run whitespace checks, perform Engineering Quality Conformance/Architecture Conformance and report checked versus unverified boundaries.

### Discovered supporting compact-source consistency

The complete suite proved that `PROJECT_SPEC.md` is an exact `canonical_spec`/repository input of `docs/symbolic-denotation-efficiency.md` and its paired `.work_products/symbolic-denotation-efficiency/delivery-contract.yaml`. The package-owned read-only migration preview reported exactly one `manifest_inputs_updated`, zero `source_claims_updated`, zero `canonical_targets_updated` and zero `acceptance_assertions_updated`; counts stayed at 113 Facts, 113 obligations and 132 inputs, and both files retained identical byte and line counts. The write used that same tool and pair. Changed manifest and Fact/obligation revision digests are derived freshness identities caused by the one current input change, not new Long-Task meaning, execution or acceptance.

## Architecture Deliberation Snapshot

The selected extension points are the existing DRA owners above. No runtime process, schema, CLI command, dependency, persistent state or resource lifecycle is added. The material alternative—another Projection/reference/state/benchmark—would duplicate authority, increase simple-path cost and create recovery/compatibility obligations without closing a distinct current gap. Intent-local non-abstraction and reuse of the existing owners are selected; a shared abstraction remains allowed only if a later evidenced stable change axis requires it.

The principal future-change challenge is Provider or export-format replacement. Canonical selection identity and owner-separated exact visual facts keep that change local: equivalent derived artifacts preserve selection, while visible/semantic changes re-enter suitability and user review. Existing recovery CAS and formal preflight retain their own boundaries.

The touched debt is the current mixing of suitability subchecks and human selection. This delivery resolves it in place. Forbidden shortcuts are automatic scope growth, generating from stale durable Source, treating review as approval, treating Provider/render/visual success as readiness, asserting complete affected-resource closure from incomplete bindings, editing generated copies directly, and claiming Agent-level effect from static tests.

Correctness and maintainability are always applicable. Compatibility is preserved by adding no schema/status/CLI/state. Recovery and resource lifecycle reuse existing checkpoint/CAS rules. Performance is preserved structurally on the simple path—no added persisted bytes or tool action—but no runtime improvement or overhead result is claimed. Operability/testability is established only for the declared static distribution and project-check boundary.

`Context Delta: required` because the selected behavior changes durable DRA responsibility and review semantics. The owning Context must change before the package-managed Skill implementation.

## 2026-08-22 Pre-Provider Style-Application Closure Amendment

### Indexed input and baseline

- `S3` — Web GPT Pro remaining-P1 audit and complete supplemental development plan: historical non-resolvable locator `attachment-provenance://232a6fa2-9499-48b7-afdd-39361d17ebd0/pasted-text.txt`.
- `B2` — required development baseline: `1451e156320481017592bce08fc95939e9ec78ed`.
- The native Goal indexes `S3`, `B2`, this Source, the DRA Contract, canonical managed Skill, `resource-selection.md`, `open-design-provider.md`, the DRA test and the existing admission binding. Compaction recovery must reread `S3`; this amendment deliberately does not duplicate its full normative text.
- The delivery remains on the Default Workflow Contract. Long-Task bootstrap, activation, recovery and mechanism changes are explicitly excluded.

### Remaining P1 and root cause

The prior delivery gave `style_application` the right task-local content and authority boundary but described the envelope as something style-bearing work *may* carry. That left a pre-generation distortion path: an Agent could bind only the adopted Design System ID and generic Tokens, decide that no slice projection was needed and start the Provider before page-specific hierarchy, density, container, geometry, preservation or prohibited-pattern meaning reached the commission. Post-generation Design suitability could detect a bad result but could not prove that the Provider received the required input.

### Selected correction

For every style-bearing Provider generation or material revision, including a simple high-fidelity preview, evaluate at least `primary_content_priority`, `density`, `container_treatment`, `visible_vs_hit_geometry`, `preserve` and `prohibited_patterns`, plus any other slice-specific dimension which materially changes output. Each applicable dimension receives exactly one task-local disposition:

- `existing-covered` only when current controlling Source or a selected `exact-target`/`constraint` explicitly covers the exact target, slice and conditions and is actually carried through existing Provider input bindings;
- `projected` when current Source and Design Authority determine the slice application but the selected input does not directly express it, in which case only that field enters the existing `style_application` envelope;
- `not-applicable` only when the dimension has no material effect, with a task-local reason and no persisted empty field; or
- the existing `decision-required` when Source is missing, conflicting, outside delegation or requires a durable owner decision.

Provider execution is allowed only when all applicable dimensions are `existing-covered`, `projected` or `not-applicable`. `decision-required`, Source conflict or silent/undispositioned remainder blocks before commission submission. Design System identity, generic Tokens, inspiration, background, Provider output, an unselected candidate, a default-only screenshot or current implementation without a controlling preservation rule cannot establish `existing-covered`.

The actual envelope contains only `projected` fields. Fully input-bound exact coverage may omit `style_application`; material revisions rerun the same closure before generation; canonical-equivalent packaging/export does not create a new design decision. The existing post-generation Design suitability subchecks remain independent and rerun after a material revision produces a candidate.

### Non-mechanism and light-path decision

The correction reuses the always-read Source/inventory step, the existing commission envelope and the current owner-first route. It adds no closure schema, status file, dimension registry, persistent Projection, approval, `review_set_id`, Gate, Authority, lifecycle, readiness, recovery field, audit type, formal condition, Long-Task logic, DRA reference, benchmark track/case/threshold/result, second Design suitability or second Proposal reconciliation.

Non-fidelity work, pure IA/low-fidelity/semantic-state studies, non-generating reads and proven canonical-equivalent packaging are outside the closure trigger. A simple high-fidelity preview performs the judgment in the same read/build action and adds no Provider generation, tool call, file, checkpoint, fixed pause, forced conversation turn, manifest, bundle, preflight or Fact Universe.

### Implementation and evidence routing

- Durable semantics: `project_context/areas/harness-package/contracts/design-resource-authoring.md`.
- Compact workflow route: canonical `design-resource-authoring/SKILL.md`.
- Four-disposition rules and must-block/must-allow/mixed examples: `references/resource-selection.md`.
- Provider adapter enforcement and pre/post separation: `references/open-design-provider.md`.
- Causal guidance and parity proof: `tests/ty-context/design-resource-authoring-skill.test.mjs`.
- Package and installed copies: existing source mappings and workspace sync only.
- Admission: only existing candidate source/bundle digests may change mechanically; no benchmark meaning or result is updated.

Static guidance/parity tests prove the declared owner, ordering, opposite paths and distribution only. They do not prove Agent adherence, visual-quality improvement, actual Provider effect, ROI or token/time benefit. A real Provider smoke remains an opt-in diagnostic and is reported as unexecuted when the required environment is absent.

The intended delivery commit message is `fix: close DRA style application before provider run`. Its exact commit and tree SHA are reported in the final handoff and Git history; a commit cannot embed its own future SHA without changing that SHA.
