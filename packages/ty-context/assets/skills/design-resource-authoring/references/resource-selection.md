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

An optional Source Plan is one possible input. Raw notes or an initial proposal are equally valid. Never require one merely to make the other usable.

## 4. Derive development-corresponding coverage

For an implementation handoff, use this task-local equation:

```text
resources to commission
  = material UI/UX decisions inside the explicit development scope
  - decisions sufficiently covered by selected existing Source
```

A decision is material when changing it would materially change what the user sees, understands, can do or receives as feedback. Pure code structure and non-user-visible implementation choices are not design gaps.

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

Design resources express user-visible interaction semantics and the presentation of product rules. Business, data, permission and algorithmic rules remain owned by product/technical Source; reference those rules and show their visible consequences without inventing them or making a visual artifact their sole owner.

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
  required_content_visual: []
  required_components_states: []
  required_interactions_motion: []
  required_adaptation_accessibility: []
inputs:
  exact_targets: []
  constraints: []
  inspiration: []
  background: []
selected_capability:
  kind: runtime-discovered-kind
  id: runtime-discovered-id
expected_entry: known-or-provider-native
review_promise: minimal-sanity | handoff-checks | selected-source-snapshot
```

This is an explanatory shape, not a required file or schema. Never paste or paraphrase the Open Design capability's own seed/template prompt into it.

## 9. Iterate and stop

- Keep each revision inside the original scope ceiling unless the user explicitly expands it.
- Reuse the current Open Design project when that preserves context and provenance; preserve the prior artifact hash before overwriting a selected candidate.
- Do not create low-fi, high-fi, component boards or native-platform copies merely because a process diagram lists them.
- For exploration, stop as soon as the requested decision is supported.
- For a final-selected formal Web/App implementation handoff, apply the dedicated formal reference's exact stop conditions. Honest `decision_required`, `unavailable` or capability gaps remain blocking; they cannot be called ready or authorize fidelity work.

During iteration, keep accepted, rejected and unresolved implications in a task-local delta buffer. Do not require or emit an interim delta after every iteration and never continuously synchronize the initial proposal. After explicit human selection or explicitly delegated selection, consolidate the buffer once and reconcile only accepted decisions into the initial proposal. If it is a writable file, update it in place while preserving original intent/provenance; otherwise return one complete revised proposal. The operation must be idempotent, name selected artifact locators/hashes and affected stable keys, and exclude rejected/unresolved choices. Never write a Source Plan, Context, `DESIGN.md`, code, tests or Contract.

## Worked scope examples

- **Large draft, one filter control:** select a control-state study if anatomy and states are uncertain; omit page/flow resources.
- **One page, style preview:** first require configured Design Authority and matching Open Design binding, then select one high-fidelity candidate; do not add a design-system pack or validator run.
- **One page scheduled for development:** use a page/flow target for layout and context, map ordinary buttons/inputs to selected component variants, and add grouped component-state or dedicated complex-control studies only where relevant static/dynamic states, feedback, motion, responsiveness or accessibility remain uncovered.
- **Local panel inside a large app:** include enough surrounding page context to place and size the panel, but generate detailed resources only for the panel, its in-scope controls and affected states.
- **One comprehensive interactive artifact:** accept it as the minimum set when its sections and reachable states explicitly cover every material in-scope item; do not add duplicate control boards. If it exposes only a static/default view, commission the missing state/interaction coverage instead of inferring it.
- **Three-screen interaction flow:** select a low-fi flow and an interactive high-fi prototype only if topology and interaction/visual behavior are independently unresolved.
- **Local style fix with exact target:** select no new design resource and route to implementation.
- **Initial proposal before execution:** iterate only requested candidates, keep one task-local delta buffer, then after selection reconcile accepted decisions once. Pass the revised proposal plus selected immutable resources directly to the default Goal or `long-task-workflow`.
