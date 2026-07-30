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

Canonical implementation resources own exact code-expressible layout, visual, content, state, interaction, adaptation, motion, semantic and asset values. The canonical per-target observable-Fact manifest is the sole complete index of every Fact Cell, Fact and proof. The Markdown handoff is only the residual semantic and binding layer for scope, resources, target profile, resource closure, coverage, Source and proposal identity; preflight hydrates a normalized full handoff from the immutable manifest snapshot. Product Controls remain semantic interaction units and do not cap Fact granularity; addressable images, text, icons, component instances and Anatomy Parts, smaller primitives, relations, geometry/style/token/content/state/behavior facts remain independently queryable. For a formal selected Web/App target, completeness is:

```text
Expected Fact Universe
  = Canonical Resource Facts enumerated by the frozen Inspector
  = Handoff Indexed Facts
```

The Expected Universe is derived before generation from scoped requirements, product semantics, the adopted design system, target environments, stable subjects, condition axes, subject-local variation axes and the atomic property catalog. It is not whatever an initially generated default page happens to expose.

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

After final selection for implementation, add one or more project-native Markdown Source files at authorized repository paths. They are ordinary Source, not a pack or Authority. Frozen canonical resources carry addressable implementation facts, while the residual handoff files close scope, applicability, uncovered meaning, product/technical semantics, blockers and downstream bindings. Each physical file contains readable `ty-source-item:start/end` facts plus exactly one:

````markdown
```yaml design-resource-handoff-v1
schema_version: design-resource-handoff-v1
representation: manifest_backed
# residual scope/resource/target/closure/coverage/proposal fields only
```
````

Freeze the explicit canonical manifest path set and its target/scope identities, file SHA-256 values, and exact per-collection counts/identity digests before generating Markdown. Choose a truthful UTF-8 ceiling, then author one small draft per target. Each block keeps the shipped `design-resource-handoff-v1` marker and adds `representation: manifest_backed`; it does not repeat the manifest-owned arrays. Keep shared meaning as uniquely keyed, target-attributed Source facts without weakening the original predicate or provenance. Ensure the authorized output parent already exists, then run one bundle command over the complete draft and manifest sets. It rejects any embedded/full-array or multi-target draft, over-budget descriptor, missing/extra/duplicate target, stale manifest identity, invalid generation digest or normalized preflight failure; processes targets sequentially in a same-volume command-owned temporary directory; and atomically renames the complete set to a previously nonexistent final directory. Failure removes only that temporary directory. Drafts and existing/adopted handoffs are never overwritten, split or rewritten. The byte check is a guard on the already compact representation, not a post-hoc split. If truthful residual Source/scope/resource/closure/coverage/proposal data cannot meet the selected ceiling, the ceiling is incompatible and publication fails closed; a semantic target is never divided. File size, parser capacity, model output or memory pressure never permits sampling, truncation, Fact coarsening, implicit defaults or broader N/A/exclusions.

Each strict YAML block includes only:

- output/development scope, necessary context and exclusions;
- stable resource and exactly one target identity;
- selected exact-target/constraint/supporting classification; candidates and inspiration do not enter covered implementation rows;
- provider version, project/run, capability/template, agent/model and live design-system binding;
- each repository-local immutable resource path, media type and exact SHA-256;
- for implementation Web/App targets, a canonical entry, complete locally resolvable dependency set, one canonical `design-resource-observable-fact-manifest-v1` inside that set and `acquisition: complete`; non-Web resources use `reference` and are not forced into HTML;
- editable upstream owner, locator and update/export method, or an explicit manual/external-update boundary when unavailable;
- exactly one `resource_fact_closure` entry per resource, roll-up coverage with exact manifest-owned references, proposal reconciliation identity and readable target-attributed Source Items.

The referenced canonical manifest plus this residual block normalize to the complete handoff and therefore additionally include:

- a frozen Inspector identity/version/digest or named external TCB; exact capabilities, canonical entry, all input resource paths/digests, `complete_enumeration`, fully enumerated dynamic discovery and an addressable Census of every material resource/node/declaration/token/asset/relation/custom property/variant/state/interaction phase/dynamic population item;
- each Census row bound to exact Fact/Fact Cell sets or a source/basis-backed `non_material` rationale. An Inspector `complete` Boolean, resource count or provider statement does not replace the Census;
- all 33 standard target-condition axes—platform, OS, device profile, form factor, exact viewport width/height, orientation, density/pixel ratio, Safe Area insets, window/fold/display/color modes, locale/language/script/direction/pseudo-localization, content/data stress, text scale/multiplier, input/assistive technology, motion/transparency/contrast/bold text/button shapes, system UI/IME, permission/capability/connectivity/lifecycle—plus scoped custom axes. Each has an explicit applicable/not-applicable disposition and stable values; reuse of one viewport/density/Safe-Area/text-scale key with conflicting geometry is invalid;
- the complete target-condition Cartesian universe, with every applicable combination present and every omitted combination carrying an exact source/basis-backed exclusion. Continuous viewport/text-pressure behavior additionally exposes exact breakpoints, ranges, interpolation and reflow rules;
- stable subjects for every in-scope Surface, flow, region, overlay/system UI, component family and instance, Control, Anatomy Part/slot, primitive, text, icon, media, asset and typed multi-subject relation; exact parent/instance/family/override/slot/portal/presence/population/Census lineage prevents a family or one rendered instance from hiding internal or repeated subjects;
- for every subject, explicit `variant`, `state`, `interaction_phase`, `presence_phase` and `instance_case` axis dispositions plus the complete compound variation universe and exact exclusions. Labels such as `all-21-state-catalog` cannot impersonate 21 atomic states;
- the complete standard atomic property catalog plus justified inspector-declared custom properties. Properties carry stable key, family, UI/UX dimension, typed value kind, required verification methods, Inspector capabilities and Census lineage. The eight dimensions—`surface_flow`, `visual_content`, `component_control`, `state_interaction`, `motion`, `adaptation_input`, `accessibility`, `assets`—remain reporting roll-ups, not the Fact ceiling;
- one explicit Fact Cell for every applicable `subject × target × condition × variation × property` identity. Every cell is `covered`, source/basis-backed `not_applicable`/`excluded_by_scope`, or blocking `decision_required`/`unavailable`; sampling, pairwise coverage, summaries and implicit defaults are forbidden;
- one atomic Fact for every covered cell, carrying exactly one subject/target/condition/variation/property, dimension, `subject|full_target` observation scope, `plain|protected` sensitivity, typed value kind, canonical value located digest, same-target/condition evidence, Source-item lineage and effective design-system lineage. Exact token/alias/platform/mode/state/instance overrides and resolved conflicts remain traceable;
- typed, locally resolvable value/evidence locators for HTML/CSS/JS/JSON/Markdown/SVG or bounded binary whole-resource identity. Critical values cannot live only in a bitmap, preview or prose. Exact values stay in canonical resources; the handoff preserves locator/digest identity rather than copying CSS;
- separate `proof_obligations` for every Fact × property-required verification method. Each names method-compatible evidence, comparator, exact/tolerance mode, canonical parameter/tolerance and optional narrow mask located digests, one frozen executable or named external Oracle with method capability, and one frozen render environment. A Fact needing token and pixel proof keeps both;
- exact asset bindings to asset subjects, immutable resources, target/condition Facts and consumer subjects, including density/platform/theme/mode/locale variants, crop/focal/mask/placeholder/error/decode/fallback behavior;
- generation metadata proving `complete_explicit`, `sampling: forbidden`, `truncation: forbidden`, contiguous chunk indexes, and exact count plus identity digest for every Inspector input/Census, axis, condition, subject, variation, property, lineage, Fact Cell/Fact, evidence/proof, Oracle/environment, asset and blocker collection;
- hydration from the declared manifest bytes for every manifest-owned collection, so the residual handoff cannot restate or certify a narrower universe;
- roll-up coverage whose subject/target/condition/variation/property/Fact Cell/Fact/proof/evidence/Source/method sets exactly equal their indexed unions; every Fact Cell, Fact and proof appears exactly once in coverage;
- for every `exact_target` condition, one `full_target` `layout_geometry` fact and one `full_target` `visual_pixel` fact backed by exact-target evidence; if complete visible fidelity cannot be extracted/compared, keep the resource a `constraint` or unresolved;
- source/Inspector-backed rationales for every non-applicable/excluded cell; unresolved rows remain visible and make preflight fail;
- target-local acceptance blockers with exact target/subject/dimension/Source-item/verification-method lineage and a non-empty `required_capabilities` set; use the narrowest truthful capability such as physical device, sensor, camera, orientation, haptic, screen reader, pixel-density, safe-area, input or production runtime rather than weakening it to an available proxy;
- selection basis, proposal reconciliation path/status and known limitations;
- outer review and separate provider/artifact/design qualifiers.

Unknown fields fail closed. Every resource must be inspected; a material resource cannot be hidden as `supporting_only`, and unsupported/unreadable extraction remains blocking inside the named Inspector/Oracle TCB. All `decision_required`, `unavailable` and acceptance blockers prevent a `ready` result. A static frame may support only visible layout/visual/component Facts for its shown condition; pixel evidence cannot cover unseen interaction, motion, adaptation/input or accessibility. Protected Facts retain canonical-source ownership while downstream observations use attributable digest-only or redacted representations and never persist raw sensitive values. Publish the complete set:

```text
ty-context design-resource bundle <draft-dir> <new-output-dir> \
  --manifest <facts.json> [--manifest <facts.json> ...] \
  --max-handoff-bytes <bytes>
```

`ty-context design-resource preflight <handoff.md>` remains available for one-file inspection and for older embedded V1 read compatibility, but new DSA authoring uses `bundle`. Do not call the handoff set ready until bundle publication succeeds. Passing proves acquisition, integrity and exact declared-universe closure relative to the frozen Inspector/Oracle TCB; it does not prove production implementation conformance. Exploration, candidates and unselected previews still require no file, schema, hash sequence or validator. There is no fixed directory, one-file-per-Control or one-file-per-Fact requirement.

## Recommended downstream routing

```text
initial proposal
  -> design-resource-authoring
  -> selected immutable resources
     + complete canonical implementation resources
     + reconciled initial proposal
  -> validated manifest-backed design-resource-handoff-v1 target file(s)
  -> long-task-workflow (explicit long delivery)
     OR current native Goal + default Workflow Contract (non-long delivery)
```

`source-plan-authoring` is not an intermediate stage. A legacy Source Plan remains valid ordinary Source if supplied, but design-resource authoring never creates or edits one.

### Default Workflow consumption

The consuming Goal brings the revised proposal, selected resources and every residual handoff file as ordinary Source. It reruns shared preflight per file, proves the exact target set before UI Authority Closure, opens affected exact/constraint resources before deciding, classifies coverage, decides `Context Delta`, and makes every adopted decision-relevant target Context-reachable through existing owners. It keeps one ephemeral exact accounting of every Fact Cell, Fact and Fact × method obligation; routes each through the production owner and real-entry check; compares the current candidate with the frozen expected locator/digest using the declared comparator/tolerance/mask, Oracle and environment; and retains an attributable per-Fact actual observation and pass/fail verdict. Any unread, unsupported, unmapped, unimplemented, unverified, stale, failed or indistinguishable applicable Fact blocks the complete claim. A later update creates a new immutable version rather than overwriting the adopted baseline.

### Long-Task consumption

The same revised proposal, selected resources and all validated residual handoff files enter `long-task-workflow`'s Source-bound Contract Draft loop immediately. Every marked handoff is in `task.source_paths`; each Contract design target's frozen `source_paths` and Check `verification_inputs` equal its owning handoff plus every declared resource path and condition. Preflight hydrates one target at a time from its canonical manifest; Compile rejects missing, extra or duplicate targets and conflicting repeated residual shared rows while retaining only compact cross-file indexes. This adapter seam preserves the existing Contract, Authority, Outcome, deterministic fail-closed diagnostic precedence and Final Gate. Covered Source Items map through `source_claims` to the root conformance Assertion. Every verification method maps to an independently failing Assertion carrying its relevant Source Claims; each method × condition evidence cell carries exact handoff `fact_refs` plus canonical `fact_expectations` for subject/variation/property, sensitivity, expected located digest, comparator/parameters/tolerance/mask, Oracle and environment. Their exact union equals the target Fact set and all property-required Fact × method obligations. Current typed `design_method` evidence repeats the exact Fact set and supplies one `fact_results` row per Fact: attributable actual observation and actual environment, comparison record, exact authority identities and pass/fail verdict. Protected observations are digest-only/redacted according to the frozen sensitivity policy. Missing, extra, duplicate, stale, failed, authority-drifted or reused/indistinguishable rows fail the Assertion. Every blocker preserves its Source-item/method/required-capability lineage into a machine Claim proved on the exact capability-qualified target or a target-blocking External Confirmation. Authority Lock, Authority Revision and Final Gate remain the sole lifecycle and Final Gate source-recompiles/reruns the whole current snapshot. This Skill creates no Contract Draft, Outcome, Receipt, Check result or Gate.

## Forbidden inferences

Unless independently proven downstream, never infer that a generated resource:

- is selected, authoritative or accepted;
- covers unlisted states, viewports, modes, platforms or accessibility;
- is native implementation because an HTML/image preview renders;
- is complete because a preview, URL, metadata response, file hash or provider run exists; implementation handoff requires the declared entry/dependency closure and resolvable evidence;
- changed Context, `DESIGN.md`, a Source Plan, code or Contract;
- proves production fidelity, correctness, test completion or release readiness.
