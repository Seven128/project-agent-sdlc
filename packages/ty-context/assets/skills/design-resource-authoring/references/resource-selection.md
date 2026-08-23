# Dynamic Resource Selection

Use this reference to derive a bounded design-resource commission from the actual request. It is a decision model, not a fixed production sequence.

## 1. Establish the scope ceiling

Extract the smallest explicit output or development boundary before interpreting the background:

- subject: one control/component, one region, one page, named pages, a flow or a reusable system;
- development coverage when the resource is an implementation handoff: named surfaces/routes, regions, component families, unique controls and conditions that will actually be built;
- platform and viewport when known;
- modes, states and transitions explicitly requested;
- fidelity or editability requested, if any;
- exclusions such as “other pages not included,” “preview only,” “no Figma” or “do not update files.”

Rich background improves a bounded artifact. It never authorizes more artifacts. Necessary surrounding context may show where a partial feature lives, but it does not place the rest of that page or product in scope. If the user supplies a complete app plan but asks to preview one button, generate at most the one-control resource. If the user asks for design resources for one development slice, cover that slice through its material controls and conditions, not the whole background product.

When an in-scope decision exposes an outside-ceiling effect, assess and explain that effect without generating or revising the outside subjects. Return the existing `decision-required` disposition with `reason: scope-expansion-required`. The user may choose an in-scope alternative or explicitly expand scope; only then recompute the ceiling and coverage. The reason is not a new status, approval or workflow state.

For page, flow or complex-control generation, recover the available authoritative constraints before deriving a commission:

- target user/role and usage context reference;
- client/host/platform, input method and relevant size classes;
- owning Surface/Screen duty and main-versus-drilldown boundary;
- primary task outcome, primary work object and shortest task loop;
- material operation–affected-object–feedback relationships; and
- critical context, state, recovery and accessibility constraints.

These product and surface facts remain owned by controlling Product/Surface/Screen Source. The commission references them without becoming their owner. Separately consume `DESIGN.md` and selected exact-target/constraint Source for visual-system and selected-design conditions. Non-authoritative task-level UI/UX analysis may inform candidate comparison but cannot supply missing product or surface meaning. A feature list, screenshot, route tree, component inventory or analysis output cannot fill a missing product or surface fact; if the missing meaning materially changes the resource, return `decision-required` or request the owning Source update before Provider execution.

If the desired candidate changes durable product goals/rules/capability, page duty, primary work object/task loop, information/action/feedback placement, interaction topology, Design Authority, tokens or component-family grammar, stop and route the change to the actual Product/Surface/Screen/Design owner. Reread the updated owner before resuming selection or generation. A candidate execution defect stays within DRA and does not by itself justify a durable owner change.

## 2. Choose the intent

| Intent | User decision being supported | Default stopping point |
| --- | --- | --- |
| `exploration` | “What might this look or feel like?” | Visible scoped candidate plus minimal sanity review |
| `handoff` | “Can another designer/developer reliably consume this without inventing material in-scope UI/UX decisions?” | Minimum sufficient project-native resources plus scope-bound coverage, provenance, limitations and relevant checks |
| `selected-source-preparation` | “Preserve this explicitly selected direction for later use.” | Immutable identity or approved snapshot, explicit selection basis and downstream notes |

Intent and style dependency are task-local and need not be persisted. Selected-source preparation does not itself adopt Design Authority.

Classify each commission before capability selection:

- `style-bearing`: high-fidelity/branded output, visual-direction candidate, typography/color/density treatment, component visual specification or production-style prototype;
- `non-fidelity`: low-fidelity hierarchy, IA/flow topology, semantics-only interaction/state study or explicitly non-fidelity prototype.

Mixed work is style-bearing unless it can be split into a genuinely independent non-fidelity commission. Style-bearing work requires configured project Design Authority and an Open Design project bound to the adopted system. Missing authority stops and points to the explicitly invoked `$design-system-authoring`; it never triggers that Skill automatically.

## 3. Inventory relevant input roles

Preserve each supplied item's actual role:

- `exact-target`: already authoritative only for its declared conditions;
- `constraint`: a rule that controls only its stated scope;
- `inspiration`: directionally useful but not fidelity authority;
- `current-implementation-evidence`: evidence of current behavior, not desired behavior by default;
- `background`: product/technical context that informs but does not expand generation scope.

An optional pre-existing planning document is one possible input. Raw notes or an initial proposal are equally valid. Never require a special intermediary format merely to make another input usable.

### Pre-generation style-application closure

Before every style-bearing Provider generation or material revision—including a simple high-fidelity preview—evaluate every current-slice style-application dimension which can materially change the output. Reuse the Provider reference's existing material-revision definition; do not create another revision classification. This closure does not apply to non-fidelity work, pure IA/flow topology, low-fidelity structure, a semantics-only state study, a read which starts no new generation, or packaging, renaming or byte-only export proved equivalent to the same canonical source.

At minimum evaluate `primary_content_priority`, `density`, `container_treatment`, `visible_vs_hit_geometry`, `preserve` and `prohibited_patterns`, plus any other obvious slice-specific style-application dimension which materially affects Provider output. These are task-local judgments, not a fixed visual-property matrix or a copy of the formal handoff Fact Universe. Every applicable dimension has exactly one of these dispositions:

| Disposition | Legal condition | Commission representation | Provider effect |
| --- | --- | --- | --- |
| `existing-covered` | Current controlling Source or a selected `exact-target`/`constraint` completely governs the exact target, slice and declared conditions and reaches the Provider through an existing input binding | Keep that Source in its existing input binding; do not duplicate it in `style_application` | Contributes to a closed commission |
| `projected` | Current controlling Source and Design Authority already determine the slice-specific application, but selected input does not directly and completely express it | Put only the necessary current-slice field in the existing `style_application` envelope | Contributes to a closed commission |
| `not-applicable` | The dimension has no material effect on this resource and the task-local reason is explicit | Keep the reason task-local; emit no empty or placeholder field | Contributes to a closed commission |
| `decision-required` | Source is missing, stale, conflicting or ambiguous; a user choice is needed; delegation is insufficient; or resolution requires a durable owner change | Give the concrete natural-language reason through the existing disposition; emit no invented application meaning | Blocks the Provider run |

Use `existing-covered` only when all of the following hold:

1. current controlling Source or a selected `exact-target`/`constraint` explicitly specifies the dimension;
2. the specification applies to the exact target, slice and declared conditions;
3. the Source remains current after any owner update;
4. the Provider commission actually carries it through existing `inputs.exact_targets`, `inputs.constraints` or the corresponding current input binding; and
5. the conclusion requires no Agent inference from a generic style, name or visual impression.

Design System identity, generic Tokens, “follow the design system”, inspiration, background, an unselected candidate, Provider output, a default-only static screenshot and current-implementation evidence do not by themselves establish `existing-covered`. Current implementation may support `preserve` only when controlling Source explicitly makes the observed behavior or visual fact a preservation constraint. A Provider must not infer missing application meaning from any of these inputs, a feature list, route tree, component inventory or task-level UI/UX analysis.

For `projected`, derive only meaning already authorized by current Source and Design Authority. Do not invent product, business, interaction or design-system semantics, paste complete Tokens, copy a Provider prompt or create a persistent Projection. The actual commission envelope contains exactly the `projected` fields: omit `existing-covered` fields, keep `not-applicable` reasons task-local and never encode `decision-required` as a placeholder.

The Provider run is allowed if and only if every applicable dimension is `existing-covered`, `projected` or `not-applicable`. Any `decision-required`, undispositioned dimension or Source conflict blocks commission submission and Provider execution. When resolution changes durable Product/Surface/Screen/Design meaning, use the existing owner-first route above, reread current Source and repeat this closure before resuming DRA. Post-generation Design suitability cannot retroactively repair a commission which skipped this closure.

This judgment occurs inside the existing Source read and commission-envelope action. For a simple high-fidelity preview it adds no Provider generation, tool action, file, checkpoint, persistent state, fixed user pause, required extra conversation turn, formal handoff, manifest, bundle, preflight or complete Fact Universe. When all dimensions close, the same turn may still generate, perform minimal sanity/suitability review, show the candidate and receive a user choice. “Closure required” never means “emit a closure record.”

## 4. Derive development-corresponding coverage

For an implementation handoff, use this task-local equation:

```text
resources to commission
  = material UI/UX decisions inside the explicit development scope
  - decisions sufficiently covered by selected existing Source
```

A decision is material when changing it would materially change what the user sees, understands, can do or receives as feedback. Pure code structure and non-user-visible implementation choices are not design gaps.

For each selected existing mapping, also name the applicable target/conditions and the meaning that must be preserved. Preservation includes current product/surface meaning, exact resource-owned visual facts, state/condition coverage and component-family or Design-System lineage which the requested change does not authorize altering. Do not treat an unchanged-looking default frame as proof that its hidden states, responsive variants or inherited dependencies are preserved.

Account for the applicable meaning at each level; do not require filler for non-applicable dimensions:

| Coverage level | Material UI/UX meaning |
| --- | --- |
| Surface/flow | information hierarchy, page/route composition, layout grid/constraints, region relationships, stacking/overlay, scrolling/overflow, navigation, branching and recovery context |
| Visual treatment/content | typography, color, spacing, border, radius, elevation, iconography, imagery, density, exact copy/labels, formatting, localization and content presentation |
| Component/control | anatomy, dimensions, hit area, variants, defaults, visibility/availability and mapping of repeated controls to an existing component family |
| State/interaction | trigger/input, validation, loading/empty/success/failure/disabled/permission states, transitions, gestures, navigation result, focus/selection behavior, feedback and recovery |
| Motion | animated property, start/end state, duration, easing, sequencing, interruption and reduced-motion behavior when motion matters |
| Adaptation/input | viewport/breakpoint, safe area, theme/mode, platform convention, pointer/touch/keyboard behavior, orientation and content stress |
| Accessibility | label/role, focus order/visibility, keyboard path, touch target, contrast and other applicable assistive behavior |
| Assets | exact icons, illustrations, media, sound/haptic cues or other bespoke content whose appearance or feedback affects the result |

For every material in-scope item, record one task-local disposition: `existing-covered`, `new-resource-needed`, `not-applicable`, `excluded-by-scope`, `decision-required` or `unavailable`. This accounting is reasoning/handoff metadata, not a required file, persistent coverage registry, Design Authority or acceptance result.

Existing coverage is sufficient only for the conditions it explicitly specifies or demonstrates. Seeing a control in one default page frame does not cover its variants, dynamic states, feedback, motion, responsive behavior or accessibility. Conversely, a selected component source may cover many control instances, so do not commission duplicate designs merely because several stable control keys map to it.

Impact assurance has two strengths. A material/recoverable loop may use the complete current `audit_expectations`, bidirectional resource bindings, explicitly unchanged universe, blast-radius universe and inactive-Delta leakage catalog owned by [recovery-and-writeback.md](recovery-and-writeback.md). An ordinary loop without those complete bindings performs only conservative impact analysis from readable Source: mark the unverified remainder, conservatively regenerate within the ceiling or return `decision-required`. Never claim that only identified resources are affected, and never expand outside the ceiling for safety.

Design resources express user-visible interaction semantics and the presentation of product rules. Business, data, permission and algorithmic rules remain owned by product/technical Source; reference those rules and show their visible consequences without inventing them or making a visual artifact their sole owner.

For a Web/App implementation handoff, visual coverage alone is insufficient. Read [implementation-feasibility.md](implementation-feasibility.md) and inspect the current platform, framework/runtime, UI system, token/theming adapter, component owners and route owners. Every material component-family × target × condition profile needs a Source-backed candidate realization or blocker before formal publication. This does not make implementation structure a design decision or put exact design values into technical Source.

### Formal selected Web/App handoff

When—and only when—the direction is final-selected for a formal Web/App implementation handoff, load [formal-selected-web-app-handoff.md](formal-selected-web-app-handoff.md). That reference owns the complete atomic Expected Fact Universe, canonical acquisition, Inspector/Census, Fact × method proof and publication rules. Exploration never loads or approximates them.

## 5. Identify independent gaps

For exploration, ask what remains uncertain inside the scope. For a handoff, ask which material coverage items remain `new-resource-needed`:

- **structure:** information hierarchy, layout regions or page relationships;
- **flow:** navigation, branching, recovery or multi-step sequence;
- **behavior:** control states, transitions, gestures, feedback, loading/error/empty/disabled cases;
- **visual direction:** composition, typography, color, density, imagery or brand character;
- **platform/responsiveness:** safe areas, breakpoints, input methods or viewport behavior;
- **system reuse:** tokens, component variants or cross-surface rules needed by more than the requested artifact;
- **team editability/native inspection:** a real need for collaborative editable frames/libraries, inspectable component/token facts or an organizational native-platform handoff.

Do not manufacture a gap already resolved by selected Source.

## 6. Consider resources conditionally

| Resource | Select when it closes this gap | Usually omit when |
| --- | --- | --- |
| Control/component state study | A unique or complex control has uncovered anatomy, variants, feedback, motion or edge states | A selected page/prototype or component source explicitly specifies and demonstrates the applicable conditions |
| Low-fidelity wireframe | Hierarchy, topology or flow must be judged without visual-style distraction | Structure is settled and only visual direction is unknown |
| High-fidelity visual candidate | Visual hierarchy, tone or composition needs selection | Existing selected targets already govern the requested conditions |
| Interactive prototype | Transitions, navigation, state retention or task feel must be experienced | A static decision is sufficient or the provider cannot produce genuine interaction |
| Flow/journey board | Multiple surfaces, branches or recovery paths must be compared together | The request is one isolated surface/control |
| Design-system slice | Several requested artifacts need shared tokens/components or reuse rules | One exploratory candidate does not justify a system |
| Component inventory/specification | Development handoff needs explicit reusable families, variants, state behavior or mappings for several control instances | Exploration is visual only, or selected component sources already cover every mapped instance |
| Collaborative native design input | Existing team authority, editable collaboration, native component/library reuse or organizational handoff is explicitly valuable and the connector/auth/read/export path is operational | Open Design/project-native implementation source is sufficient or the native path would create a second synchronized representation |
| Image/illustration/icon/media study | Bespoke content materially defines the selected direction | Generic placeholders answer the present decision |

A prototype is often valuable for new Web/App flows, but it is never automatically required. Low- and high-fidelity resources may both be selected only when they answer independent questions. One comprehensive, inspectable artifact may cover page composition and several component families; a static frame cannot claim unseen interaction or state coverage merely because all controls appear in it.

Do not translate Product Control closure into one artifact per control. Artifact grouping is an authoring optimization, while the later implementation handoff still inventories every observable design fact inside those artifacts, including component parts and smaller primitives. Map ordinary controls to selected shared component variants, group related states in one component-family board or workbench, and reserve dedicated resources for unique or complex controls whose material meaning is otherwise uncovered.

## 7. Assign a disposition to every considered resource

- `selected`: required to close a current gap;
- `optional`: useful, but not necessary for the current decision;
- `not-needed`: redundant or outside the scope ceiling;
- `unavailable`: justified but not currently supported/configured;
- `decision-required`: a genuine unresolved preference changes the commission materially.

Give one concrete reason. Do not turn `optional` into automatic extra work.

## 8. Build the commission envelope

The task-local envelope should contain only product-specific information:

```yaml
intent: exploration | handoff | selected-source-preparation
scope:
  subjects: [named surface/flow/region/component/control keys]
  ceiling: one-control | one-region | one-page | named-pages | named-flow | system-slice
  necessary_context: []
  excluded: []
  platform: known-or-unknown
  viewports: []
coverage:
  material_needs: []
  observable_fact_families: []
  existing_mappings: []
  preserve: []
  required_content_visual: []
  required_components_states: []
  required_interactions_motion: []
  required_adaptation_accessibility: []
inputs:
  product_surface_constraints: []
  technical_sources: []
  exact_targets: []
  constraints: []
  inspiration: []
  background: []
style_application:
  primary_content_priority: results-table-is-primary-work-object
  density: compact-working-density-for-results-table
  container_treatment: one-flat-table-surface-without-card-wrapper
  preserve: [selected-header-hierarchy]
  prohibited_patterns: [nested-cards-around-the-primary-results-table]
quality_commission:
  artifact_archetype: dashboard-data-workbench
  primary_design_challenges: [task-hierarchy, component-reuse, dense-data-legibility]
  visual_character:
    desired: [calm, precise, product-specific]
    avoid: [generic-ai-gradient, excessive-cards, arbitrary-glow]
  content:
    real_copy_required: true
    realistic_data_required: true
    placeholder_final_content_forbidden: true
  reference_roles:
    - { ref: selected-density-reference, role: information-density }
  component_authoring:
    shared_families_required: true
    repeated_instance_specific_styling_forbidden_by_design: true
  substrate_input_refs: [dashboard-web-feasibility]
selected_capability:
  kind: runtime-discovered-kind
  id: runtime-discovered-id
expected_entry: known-or-provider-native
review_promise: minimal-sanity | handoff-checks | selected-source-snapshot
```

This is an explanatory shape, not a required file or schema; its concrete dashboard values illustrate Source-derived content and are not defaults. Include `style_application` only when material to a style-bearing commission and bind its actual values to current Design Authority, selected Source and the explicit slice. It is not a persisted Application Projection, Authority, state or acceptance record. For style-bearing generation, add an archetype-specific `quality_commission`: name the main design challenges, desired/avoided visual character, real-content obligations, the distinct role of each selected reference, design-side shared-family expectations and applicable feasibility Source. Omit irrelevant keys instead of emitting placeholders.

`repeated_instance_specific_styling_forbidden_by_design` means repeated controls in the selected resource share one component-family grammar rather than being drawn as unrelated instances. It does not assert that later production code already reuses one component. `quality_commission` is Provider input, not a persisted quality score, Authority, Gate, routing record or acceptance result. A simple high-fidelity preview does not gain another tool action or persisted side effect from these fields. Never paste or paraphrase the Open Design capability's own seed/template prompt into it.

## 9. Iterate and stop

- Keep each revision inside the original scope ceiling unless the user explicitly expands it; otherwise use `decision-required` with reason `scope-expansion-required`.
- Reuse the current Open Design project when that preserves context and provenance; preserve the prior artifact hash before overwriting a selected candidate.
- Do not create low-fi, high-fi, component boards or native-platform copies merely because a process diagram lists them.
- For exploration, stop as soon as the requested decision is supported.
- For a final-selected formal Web/App implementation handoff, apply the dedicated formal reference's exact stop conditions. Honest `decision_required`, `unavailable` or capability gaps remain blocking; they cannot be called ready or authorize fidelity work.

During simple iteration, keep accepted, rejected and unresolved implications in a task-local delta buffer. Do not require or emit an interim delta after every iteration and never continuously synchronize the initial proposal. If the loop requires durable semantic replay, a selected-Proposal file writeback or cross-interruption recovery, load [recovery-and-writeback.md](recovery-and-writeback.md) and use its independent origin/decision-authority/evidence/status model plus package helper; prompt prose alone cannot establish CAS or deterministic recovery. Ordinary conversational selection creates no approval record or deterministic cross-session promise; if it is lost before authorized materialization, reconfirm it. For a non-formal small request, explicit human selection or explicitly delegated selection may be consolidated and reconciled once in the same turn. For a selected formal Web/App handoff, defer reconciliation until the formal owner completes canonical closure and no newly visible decision returns to review. Reconcile only accepted decisions. If the Proposal exists only in conversation and safe materialization was not explicitly authorized, return one complete revised proposal and report cross-session deterministic recovery unavailable. Never create another intermediary planning document or mutate Context, `DESIGN.md`, code, tests or Contract.

## Worked scope examples

- **Large draft, one filter control:** select a control-state study if anatomy and states are uncertain; omit page/flow resources.
- **One page, style preview:** first require configured Design Authority and matching Open Design binding, then select one high-fidelity candidate; do not add a design-system pack or validator run.
- **One page scheduled for development:** use a page/flow target for layout and context, map ordinary buttons/inputs to selected component variants, and add grouped component-state or dedicated complex-control studies only where relevant static/dynamic states, feedback, motion, responsiveness or accessibility remain uncovered.
- **Local panel inside a large app:** include enough surrounding page context to place and size the panel, but generate detailed resources only for the panel, its in-scope controls and affected states.
- **One comprehensive interactive artifact:** accept it as the minimum set when its sections and reachable states explicitly cover every material in-scope item; do not add duplicate control boards. If it exposes only a static/default view, commission the missing state/interaction coverage instead of inferring it.
- **Three-screen interaction flow:** select a low-fi flow and an interactive high-fi prototype only if topology and interaction/visual behavior are independently unresolved.
- **Local style fix with exact target:** select no new design resource and route to implementation.
- **Initial proposal before execution:** iterate only requested candidates, keep one task-local delta buffer, then after selection reconcile accepted decisions once. Pass the revised proposal plus selected immutable resources directly to the default Goal or `long-task-workflow`.

### Style-application worked examples

#### Example A — must block

A one-page high-fidelity preview has configured Design Authority but only generic Tokens. No selected `exact-target` or `constraint` specifies the page's primary-content priority, density or container treatment, and the commission has no corresponding projected fields. Generic system binding cannot fill those application decisions. Result: use the existing `decision-required` with concrete missing-Source reasons; the Provider run must not start.

#### Example B — complete existing coverage may omit projection

A local style-bearing revision has a current selected `exact-target` which explicitly specifies every applicable style-application dimension for the exact target and conditions, and that Source is carried through the Provider's existing exact-target input binding. Every dimension is `existing-covered`. Result: omit `style_application` rather than copying the Source, and allow the Provider run.

#### Example C — mixed closure projects only the gaps

The task-local dispositions are:

```text
primary_content_priority: existing-covered
density: projected
container_treatment: projected
visible_vs_hit_geometry: not-applicable
preserve: existing-covered
prohibited_patterns: projected
```

Assume current Screen Source says the results table is the page's primary work object, current Design Authority calls for compact working density, and an adopted constraint forbids nested cards. The illustrative actual envelope contains only those three Source-derived fields:

```yaml
style_application:
  density: compact-working-density-for-results-table
  container_treatment: one-flat-table-surface-without-card-wrapper
  prohibited_patterns:
    - nested-cards-around-the-primary-results-table
```

All applicable dimensions are closed, so the Provider run is allowed. If any one of them instead becomes unresolved, stale or conflicting, its disposition becomes `decision-required` and the run is blocked.
