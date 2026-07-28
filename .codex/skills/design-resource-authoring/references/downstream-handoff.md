# Design Resource Handoff And Proposal Reconciliation

Generated resources remain ordinary external Source. Preserve enough identity and meaning for downstream work without creating a Tiny Context pack, registry or authority lifecycle.

## Candidate, selection and authority are separate

- **Candidate:** provider output proposed for review; it authorizes no fidelity.
- **Selection:** an explicit user/team choice, or explicit delegation with known criteria; it permits proposal reconciliation and selected-source preparation.
- **Authority adoption:** a downstream development workflow reconciles selected Source with product/surface Context and `DESIGN.md` and binds implementation/verification to declared conditions.

This Skill may preserve an input already classified as `exact-target`; it may not promote its own candidate to one. Unknown coverage remains unknown.

## Development-scope coverage

For every material in-scope surface/flow/region/component/control condition, record selected existing Source, newly generated Source, `not-applicable`, `excluded-by-scope`, `decision-required` or `unavailable`. Include only necessary surrounding context and explicit exclusions. One larger addressable artifact may cover several items; a static frame covers only conditions it actually shows.

Design resources may show user-visible triggers, transitions, states, feedback and product-rule presentation. Business, data, permission and algorithmic rules remain owned by product/technical Source and must not be invented by visuals.

Canonical implementation resources own exact code-expressible layout, visual, content, state, interaction, adaptation, motion, semantic and asset facts. The structured handoff is the residual semantic and index layer for scope, applicability and downstream binding: it atomically indexes every observable fact through typed locators, records a complete inspection closure for every resource instead of manually duplicating values, and is not a second numeric/style source. Product Controls remain semantic interaction units and do not cap fact granularity; addressable images, text, icons, component parts, smaller primitives, geometry/style/token/state/behavior facts are indexed when expressed.

## Final proposal reconciliation

Keep a task-local buffer during candidate iteration:

```yaml
selection_basis: explicit user/team choice | explicit delegated selection
selected_resources:
  - stable key, provider/project/run/entry, declared conditions, immutable digest/snapshot, editable upstream owner/locator/update method
accepted:
  - decision, rationale and affected proposal section/stable keys
rejected:
  - alternative and reason
unresolved:
  - genuine remaining choice
impacts:
  product_rules: []
  information_hierarchy: []
  surface_keys: []
  control_keys: []
  state_keys: []
  interaction_rules: []
  visual_constraints: []
```

This is an explanatory shape, not a schema or required file. Do not write during iteration. Once the direction is final:

1. confirm the selection basis and immutable resource identity;
2. consolidate duplicate/intermediate notes;
3. apply accepted decisions once while preserving all unaffected original requirements and source provenance;
4. exclude rejected and unresolved choices from requirements, keeping unresolved items visibly unresolved;
5. record selected resource keys, conditions, immutable locators/digests and editable upstream owner/locator/update method in the proposal where downstream consumers can recover and later change them;
6. make reruns idempotent—update the existing decision/reference instead of appending it again;
7. if the initial proposal has an authorized writable path, edit that file; otherwise return the full revised proposal in the response.

Never mutate a Source Plan, `project_context/**`, `DESIGN.md`, Delivery Contract, production code or tests. A small request may generate, select and reconcile in one turn; “once” describes final semantic writeback, not a required waiting phase.

If no selection occurs, return candidates plus a consolidated pending delta and leave the proposal unchanged.

## Intent-sized handoff

### Exploration

Return scope/intent, visible candidates, resource dispositions, obvious limitations, provider/artifact qualifiers and the sanity review performed. Do not require a pack, hash or validator for a throwaway unselected preview unless retrieval needs it.

### Implementation handoff

After final selection for implementation, add one project-native Markdown Source at an authorized repository path. It is ordinary Source, not a pack or Authority. Frozen canonical resources carry addressable implementation facts, while this residual handoff closes scope, applicability, uncovered meaning, product/technical semantics, blockers and downstream bindings. The file contains readable `ty-source-item:start/end` facts plus exactly one:

````markdown
```yaml design-resource-handoff-v1
...
```
````

The strict block includes:

- output/development scope, necessary context and exclusions;
- stable resource, subject, surface/control/state and target keys;
- selected exact-target/constraint/supporting classification; candidates and inspiration do not enter covered implementation rows;
- provider version, project/run, capability/template, agent/model and live design-system binding;
- each repository-local immutable resource path, media type and exact SHA-256;
- for implementation Web/App targets, a canonical entry, complete declared dependency set and `acquisition: complete`; non-Web resources use `reference` and are not forced into HTML;
- editable upstream owner, locator and update/export method, or an explicit manual/external-update boundary when unavailable;
- declared platform, viewport, mode, state, content, input and full/reduced/not-applicable motion conditions;
- typed, locally resolvable evidence locators (`html_selector`, `markdown_anchor`, `json_pointer`, `css_selector`, `css_custom_property` or bounded `whole_resource`) whose kinds distinguish frame/component variant/prototype state or transition/motion/responsive/input/accessibility/semantic/token/asset/annotation meaning;
- atomic `facts`, each naming exactly one subject, target, condition, dimension, `subject|full_target` observation scope, same-target/same-condition evidence set, Source-item set and verification method;
- exactly one `resource_fact_closure` entry per resource with a named complete inspector, rationale and either `material_with_facts` plus the exact fact set or `supporting_only` plus no facts;
- stable subjects grouped only when they truly share meaning;
- every declared scope surface represented by one unambiguous surface subject, with no stable key owned by two subjects;
- explicit target applicability for each subject and complete subject × target × condition × dimension coverage for `surface_flow`, `visual_content`, `component_control`, `state_interaction`, `motion`, `adaptation_input`, `accessibility` and `assets`;
- exactly one disposition per applicable cell: `covered`, `not_applicable`, `excluded_by_scope`, `decision_required` or `unavailable`;
- covered-cell `fact_refs`, same-target/same-condition evidence, Source-item refs and dimension-appropriate project verification methods, each set exactly equal to the union of its facts; every fact appears in exactly one coverage row, and referenced design Source Items use `requirement`, `control` or `acceptance` markers;
- for every `exact_target` condition, one `full_target` `layout_geometry` fact and one `full_target` `visual_pixel` fact backed by exact-target evidence; if complete visible fidelity cannot be extracted/compared, keep the resource a `constraint` or unresolved;
- source-backed rationales for non-applicable/excluded rows; unresolved rows remain visible and make preflight fail;
- target-local acceptance blockers with exact target/subject/dimension/Source-item/verification-method lineage and a non-empty `required_capabilities` set; use the narrowest truthful capability such as physical device, sensor, camera, orientation, haptic, screen reader, pixel-density, safe-area, input or production runtime rather than weakening it to an available proxy;
- selection basis, proposal reconciliation path/status and known limitations;
- outer review and separate provider/artifact/design qualifiers.

Unknown fields fail closed. Every resource must be inspected; a material resource cannot be hidden as `supporting_only`, and unsupported/unreadable extraction remains blocking inside the named inspector/oracle TCB. A static frame may support only visible layout/visual/component facts for its shown condition; pixel evidence cannot cover unseen interaction, motion, adaptation/input or accessibility. Run:

```text
ty-context design-resource preflight <handoff.md>
```

Do not call the handoff ready until it passes. Exploration, candidates and unselected previews still require no file, schema, hash sequence or validator. There is no fixed directory or one-file-per-control requirement.

## Recommended downstream routing

```text
initial proposal
  -> design-resource-authoring
  -> selected immutable resources
     + complete canonical implementation resources
     + reconciled initial proposal
  -> validated residual design-resource-handoff-v1
  -> long-task-workflow (explicit long delivery)
     OR current native Goal + default Workflow Contract (non-long delivery)
```

`source-plan-authoring` is not an intermediate stage. A legacy Source Plan remains valid ordinary Source if supplied, but design-resource authoring never creates or edits one.

### Default Workflow consumption

The consuming Goal brings the revised proposal, selected resources and residual handoff as ordinary Source. It reruns shared preflight before UI Authority Closure, opens affected exact/constraint resources before deciding, classifies coverage, decides `Context Delta`, and makes every adopted decision-relevant target Context-reachable through existing owners. It routes every fact, covered Source Item and verification method through the production owner and real-entry checks. Any unread, unsupported, unmapped, unimplemented, unverified or indistinguishable applicable fact blocks the complete claim. A later update creates a new immutable version rather than overwriting the adopted baseline.

### Long-Task consumption

The same revised proposal, selected resources and validated residual handoff enter `long-task-workflow`'s Source-bound Contract Draft loop immediately. The marked handoff is `task.source_paths`; each Contract design target's frozen `source_paths` and Check `verification_inputs` equal that handoff plus every declared resource path and condition. Covered Source Items map through `source_claims` to the root conformance Assertion. Every verification method maps to an independently failing Assertion carrying its relevant Source Claims; each method × condition evidence cell carries the exact handoff `fact_refs`, the union equals the target fact set, and current typed `design_method` evidence repeats the exact set. Every blocker preserves its Source-item/method/required-capability lineage into a machine Claim proved on the exact capability-qualified target or a target-blocking External Confirmation. Authority Lock, Authority Revision and Final Gate remain the sole lifecycle. This Skill creates no Contract Draft, Outcome, Receipt, Check result or Gate.

## Forbidden inferences

Unless independently proven downstream, never infer that a generated resource:

- is selected, authoritative or accepted;
- covers unlisted states, viewports, modes, platforms or accessibility;
- is native implementation because an HTML/image preview renders;
- is complete because a preview, URL, metadata response, file hash or provider run exists; implementation handoff requires the declared entry/dependency closure and resolvable evidence;
- changed Context, `DESIGN.md`, a Source Plan, code or Contract;
- proves production fidelity, correctness, test completion or release readiness.
