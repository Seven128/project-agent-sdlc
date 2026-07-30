---
context_role: contract
read_policy: on-demand
---
# Design Resource Handoff Adapter Contract

## Purpose And Boundary

One shared, conditional design purpose of both development workflows is that Agent implementation, acceptance and testing fully conform to every material UI/UX Fact selected design resources explicitly express within their declared scope and conditions. For a formal selected Web/App handoff, authoring first derives a complete material Expected Fact Universe from requirements, product semantics, the adopted design system and target environments. The atomic identity is one `subject × target × condition × variation × property` Fact Cell—not a Product Control, page, screenshot, broad dimension row or provider summary. Any addressable Surface/region/overlay/system UI, component family and instance, Control, Anatomy Part/slot, primitive, text, icon, media, asset or typed relation remains independently queryable. Long-Task is the stronger machine-enforced carrier; it is not a second copy or the sole owner of this purpose.

This does not authorize inference from silence. A static frame does not imply an unshown interaction, and the workflow cannot prove that the user never omitted a requirement. “Observable” is relative to the acquired immutable format plus a named inspector/project oracle whose supported extraction and verification capabilities are an explicit trusted-computing boundary. An unexpressed fact must be added to Source or explicitly classified; an expressed but unreadable, unsupported or unprovable fact remains `decision_required`/`unavailable` and blocks fidelity work.

The causal chain has three owners:

1. **Canonical resources** are the sole exact-value owner for code-expressible layout, visual, content, control, state, interaction, motion, adaptation/input, accessibility and asset values.
2. **Frozen Inspector manifest plus `design-resource-handoff-v1`** expose the exact Fact universe without duplicate ownership. The canonical per-target manifest is the sole complete Fact/Census/proof index. A new handoff uses the same shipped V1 marker with `representation: manifest_backed` and carries only residual Source/scope/resource/target/closure/coverage/proposal binding; preflight hydrates the omitted collections directly from the immutable manifest snapshot. Older embedded V1 input remains readable but is not the authoring default. Neither representation retypes CSS as a second value source.
3. **Context, Contract and Checks** force every Fact and required proof onto the production owner; mutually exclusive **default Contract Conformance** or **Long-Task Final Gate** rejects current-candidate drift with attributable per-Fact results.

Open Design has demonstrated source-rich output (`index.html`, component/design specifications, tokens and asset manifests), but capability is not a per-run invariant. `design-resource-authoring` must derive the authoring obligation universe before provider execution, pass the adopted design-system ID through MCP, explicitly commission canonical implementation source plus the Fact manifest, retrieve/freeze every dependency and iterate until:

```text
Expected Fact Universe
  = Canonical Resource Facts
  = Handoff Indexed Facts
```

The adapter connects upstream authoring to both development workflows. It creates no provider-specific schema, Design Authority, plan, registry, Claim kind, Gate, acceptance lifecycle or second source of truth.

## One Shared Adapter And Manifest-Backed Target Handoffs

- Exploration and unselected previews need no handoff or validator.
- A newly authored selected handoff is one project-native Markdown Source file per target. It has readable target-attributed Source Items and exactly one fenced `design-resource-handoff-v1` block with `representation: manifest_backed`. The YAML contains only residual scope/provenance, resource identities, one target/profile, resource-fact closure, coverage and proposal binding. Inspector/Census, axes/exclusions, conditions, subjects/variations, properties/lineage, Fact Cells/Facts, evidence/proofs, Oracles/environments, assets and blockers occur only in the target's canonical manifest.
- Authoring freezes the explicit canonical manifest path set before draft generation: exact target/scope membership, manifest file SHA-256 and every declared collection count/identity digest. It also declares an actual UTF-8 handoff ceiling. Shared multi-target meaning is atomized into uniquely keyed target-attributed Source facts without weakening its predicate or provenance; a semantic target is never divided.
- `ty-context design-resource bundle <draft-dir> <new-output-dir> --manifest <facts.json> [...] --max-handoff-bytes <bytes>` is the DSA publication path. It requires manifest-backed one-target drafts, validates the complete explicit manifest/target set, checks actual descriptor bytes before YAML decode, preflights one target at a time from one resource snapshot, preserves exact manifest path/SHA and generation count/digest identity, and atomically renames one same-volume command-owned temporary directory to the previously nonexistent final directory only after every target passes.
- Bundle failure removes only its temporary directory; drafts and existing/adopted handoffs are never overwritten, split or rewritten. The byte check is defense against malformed generation or later mutation, not a post-hoc split strategy. If truthful residual data cannot meet the chosen ceiling, the ceiling is incompatible and publication fails closed.
- `ty-context design-resource preflight <handoff.md>` remains the shared one-file adapter and the read-compatibility path for older embedded V1. For manifest-backed input it parses the small YAML once, reads each declared resource once into one verified snapshot, hydrates manifest-owned collections by reference, then runs the same full semantic, locator, dependency, universe and projection validators used by embedded input.
- Within one scope key, repeated residual provenance/proposal and shared resource/catalog rows must retain canonical identity. File-size, parser, model-output or memory pressure never authorizes pruning, sampling, truncation, coarser Facts, implicit defaults or broader N/A/exclusions.
- Immutable repository resources plus the handoff remain ordinary Source/verifier inputs. The editable upstream owner/locator/update route is recorded separately.
- No persisted aggregate registry is required. Bundle results are diagnostic navigation, not Authority. Default work reruns preflight and exact target-set closure. Long-Task consumes normalized handoffs sequentially and retains only compact target, residual shared-row, resource-path/closure and Source-item indexes; the existing Contract target set rejects missing, extra or duplicate targets. This changes no Contract, Authority, Outcome or Final Gate semantics.
- The shared Selected-Design Conformance Obligation conserves exact Fact Cell, Fact, property-required proof, Source-item, acceptance-blocker, target, condition, variation and property sets into one downstream carrier. Shared input semantics do not imply running both carriers.
- No fixed directory, live provider, artifact count, one-file-per-Control/Fact rule or screenshot Cartesian product is required. “Smallest sufficient resource set” may reduce files, never Fact granularity.

## Implementation Source Profile

Every target declares one `source_profile`:

- `implementation_web`: canonical HTML/XHTML entry, all dependencies, one Fact manifest and `acquisition: complete`;
- `implementation_app`: a canonical machine-readable code/spec entry, all dependencies, one Fact manifest and `acquisition: complete`;
- `reference`: bounded non-Web/non-code resource input; it is not forced into HTML.

The canonical entry plus `dependency_resource_refs` must exactly equal the target's resource set, and `fact_manifest_resource_ref` is a supporting JSON dependency distinct from the entry. Every resource has an exact repository path, media type and SHA-256. Preflight discovers local source imports/loads, HTML/CSS/JS/SVG references, workers, tokens, fonts, images and media and rejects anything outside the frozen set. A PNG may be a derived visual baseline, but cannot be the sole implementation source for state, interaction, motion, adaptation or accessibility.

Before authoring may emit `ready`, the frozen Inspector completely enumerates the canonical entry/dependencies and a Census binds every material resource/node/declaration/token/asset/relation/custom property/variant/state/interaction/dynamic population to exact Fact/Fact Cell identities or source/basis-backed `non_material`. It exercises every property-required verification method under the claimed conditions and cross-checks repeated values across source/spec/tokens/assets. A mismatch is refined or remains `decision_required`/`unavailable` with a blocker. The checked hashes make source QA stale when bytes change; preflight is not production conformance and does not pretend to be a universal semantic oracle.

## Canonical V1 Meaning

The frozen `design-resource-observable-fact-manifest-v1` plus the normalized same-V1 residual adapter record:

- scope/provenance/resources/targets/proposal plus exact immutable paths, media types, SHA-256, editable upstream and verified Open Design design-system binding;
- Inspector trust/identity/version/digest, declared capabilities, entry/input paths and digests, `complete_enumeration`, fully enumerated dynamic discovery and an addressable Census with exact Source/basis/rationale;
- design-system snapshot and effective-value lineage across base/alias/semantic/component tokens, platform/mode/state/instance/slot overrides, direct values and resolved conflicts;
- all 33 standard condition axes plus custom axes. Viewport, density, Safe Area and text scale use stable keys with exact width/height/unit, pixel ratio, four insets and multiplier; one key cannot mean two profiles;
- exact applicable target-condition combinations and source/basis-backed exclusions;
- stable subject hierarchy across Surface/flow/region/overlay/system UI/component family and instance/Control/Anatomy Part/slot/primitive/text/icon/media/asset/relation, including parent, instance/family/override/slot, portal, conditional/lazy/virtualized presence and population identity;
- per-subject `variant`, `state`, `interaction_phase`, `presence_phase`, `instance_case` axes, exact combinations and exclusions;
- the standard atomic property catalog plus justified custom properties. Each property carries family, eight-dimension roll-up, typed value kind, Inspector capabilities, Census refs and non-empty required verification methods;
- one explicit Fact Cell for every applicable `subject × target × condition × variation × property` identity. Each cell is `covered`, source/basis-backed `not_applicable`/`excluded_by_scope`, or blocking `decision_required`/`unavailable`;
- one Fact per covered cell with atomic identity, `subject|full_target` scope, `plain|protected` sensitivity, value kind, canonical located digest, evidence, marked Source and value lineage;
- separate proof obligations for every Fact × property-required method. Each freezes method-compatible evidence; comparator; exact/tolerance mode; parameter, tolerance and optional narrow-mask located digests; Oracle trust/identity/version/digest/capabilities; and render-environment identity/definition;
- asset bindings across immutable resource, asset/consumer subjects, targets/conditions and Facts;
- generation closure requiring `complete_explicit`, forbidden sampling/truncation, contiguous chunks and exact count/identity digest for every Inspector/Census/axis/condition/subject/variation/property/lineage/Fact/evidence/proof/Oracle/environment/asset/blocker collection;
- exactly one `resource_fact_closure` per resource and exact roll-up `coverage` set equality across subjects, targets, conditions, variations, properties, Fact Cells, Facts, proofs, evidence, Source and methods.

Supported value/evidence locators are bounded and locally resolved: HTML selector/inner HTML/attribute, Markdown anchor, JSON Pointer, CSS selector/custom property/declaration, JavaScript export, SVG selector/inner XML/attribute and whole resource. Unsupported syntax or prose placeholders fail; critical values cannot live only in a bitmap, preview or natural-language summary. Exact bytes/values remain in canonical resources. Handoff/Contract retain locator/digest and comparison identity, not a copied style/value authority.

The eight dimensions—`surface_flow`, `visual_content`, `component_control`, `state_interaction`, `motion`, `adaptation_input`, `accessibility`, `assets`—are roll-ups only. A label such as `all-21-state-catalog`, one default page, representative viewport, pairwise sample or broad visual fact cannot impersonate atomic axes/cells. Continuous viewport/text-pressure/motion behavior also needs exact breakpoint/range/interpolation/reflow/timeline rules.

An `exact_target` asserts complete visible target fidelity under every declared condition. Each condition therefore has at least one `full_target` `layout_geometry` Fact and one `full_target` `visual_pixel` Fact backed by exact-target evidence. If complete layout/pixel extraction and comparison are unavailable, the resource is a partial `constraint` or remains unresolved. Pixel proof cannot substitute for state/interaction, motion, responsive/input, accessibility, system, haptic/sound or asset methods.

## Fail-Closed Validation

Preflight rejects unknown fields; duplicate/unknown/aggregate keys; unsafe paths; missing/stale bytes; digest or source-profile/dependency drift; incomplete/non-frozen Inspector inputs; missing Census semantic owners; absent standard axes/values/properties/methods; condition-profile ambiguity; incomplete Cartesian condition/variation/Fact Cell universes; sampling/truncation/count/digest drift; invalid N/A/exclusion basis; subject hierarchy/presence/population/relation errors; invalid value kind or unresolved locator; design-system lineage/conflict drift; missing/extra/duplicate Facts or Fact × method proofs; incompatible evidence/comparator/Oracle; environment/mask/tolerance outside canonical resources; asset binding drift; manifest-backed target-count or manifest identity drift; embedded manifest↔handoff mismatch; material resources disguised as supporting-only; exact targets without full-target layout/pixel Facts; cross-target/condition substitution; `decision_required`/`unavailable`; and any acceptance blocker.

Preflight proves declared-universe completeness, addressability and immutable integrity relative to the named Inspector/Oracle TCB only. It cannot prove the user supplied every real requirement, that an arbitrary Inspector is semantically sound or that production conforms. Project mutation/current-snapshot checks must still demonstrate each implementation method and Fact fails when its production carrier is wrong.

## Default Workflow Consumption

The default Workflow:

1. reruns preflight and opens every affected exact/constraint resource;
2. reconciles stable subject/target/condition/variation/property keys through owning Surface/Screen/Control Context and `DESIGN.md`;
3. constructs one ephemeral exact accounting of every Fact Cell, Fact, property-required proof, Source Item, blocker and target condition, then routes each item to the production owner and real root-entry journey;
4. verifies every Fact independently under its declared method, expected located digest, comparator/tolerance/mask, Oracle and environment. Each result retains attributable actual observation/environment and pass/fail verdict; protected observations store only digest/redacted representation and policy, never raw sensitive values;
5. on the final current candidate confirms every applicable row is mapped, implemented, resolved, executed and passing, then performs Contract Conformance plus Context drift checking.

Resource presence, hash success, provider success, aggregate pass, screenshot or detached route cannot substitute for production checks. A selected target, Fact/proof universe, expected comparison authority, implementation or check-input change stales closure. Any unread, unsupported, unmapped, unimplemented, unresolved, unexecuted, stale, failed or indistinguishable applicable Fact blocks the complete claim. The accounting creates no persisted map, Claim set, readiness state or Gate.

## Long-Task Consumption

Long-Task Preflight/Compile requires each Contract `design_target` to match exactly one target across all declared handoff files by key, interpretation, conditions and complete handoff/resource file set. Every handoff is real `task.source_paths` Source; the owning handoff and every target entry/dependency are Check `verification_inputs`. The adapter preflights, binds and releases one normalized target handoff at a time while retaining only compact residual identity/digest/error indexes. It preserves the prior deterministic diagnostic precedence—Source-order preflight, duplicate/index errors, Contract-target order, then unbound targets—and does not change the one Contract/Authority/Final Gate semantics.

Covered Source Items map through `source_claims` into the root conformance Assertion. The exact proof-method set maps through `verification_method_bindings` to distinct positive Assertions in the same target Check. Every method × condition cell carries exact `fact_refs` plus canonical `fact_expectations`: subject/variation/property, sensitivity, expected located digest, comparator/parameters/tolerance/mask, Oracle and environment. These references preserve full value granularity without copying CSS. Cell unions close all Fact × required-method obligations and the complete target Fact set.

Current `design_method` evidence repeats those Fact refs and supplies exactly one `fact_results` row per Fact: subject/variation/property; actual observation and actual environment path/hash/typed locator/value hash; expected and comparison artifacts/authority; explicit verdict; Oracle and environment. Runtime rejects missing/extra/duplicate rows, identity/authority/sensitivity/environment drift, unexpected/missing redaction, reused indistinguishable observations and any failed verdict. Runtime `design_conformance` records accept either the root Assertion or explicit method bindings, so method failures remain independently attributable.

Each handoff acceptance blocker binds the same Source Items and verification methods in `surface_binding.acceptance_blockers`. A machine blocker must reference the corresponding target-local Claims; an external blocker must use a target-blocking External Confirmation whose impact includes those Claims. A matching key with unrelated proof is invalid.

Existing Controls/`surface_bindings`, production owners/root journey, Evidence Kernel, Counterfactual sensitivity, Authority Revision and source-recompiled one-snapshot Final Gate remain the only acceptance/lifecycle owners. Selected-target Fact expectations are protected Authority; any change after lock revises Authority and invalidates affected evidence.

Long-Task is therefore the machine carrier of the same shared obligation and never runs the default task-local selected-design closure before or after Final Gate.

## Provider Selection Background

The default remains Open Design source-rich output plus the provider-neutral residual handoff and existing Final Gate.

- **Figma** is valuable when an existing Figma authority/team needs native Components/Variables/Variants, shared libraries, Dev Mode or Code Connect. It also introduces paid-seat/plan and MCP quota/authentication boundaries plus a second-representation synchronization cost, so it is optional rather than a default conversion target. See [pricing](https://www.figma.com/pricing/) and [MCP access/rate limits](https://developers.figma.com/docs/figma-mcp-server/rate-limits-access/).
- **Penpot** is a credible open/self-hosted collaborative platform with an open ZIP/JSON format and MCP. It is appropriate when self-hosted multi-user design infrastructure is itself required; otherwise service/plugin/open-file/deployment/backup operations and a second representation do not close a distinct workflow-enforcement gap. See [file format](https://help.penpot.app/technical-guide/developer/data-model/penpot-file-format/), [MCP](https://help.penpot.app/mcp/) and [self-hosting](https://penpot.app/pricing/self-host).
- **OpenPencil** is a useful MIT local static-design sidecar with CLI/MCP and HTML/CSS conversion. Its documented prototype flow/trigger/action/overlay/Smart Animate gaps prevent it from being the sole eight-dimension interaction/motion source today. See its [repository](https://github.com/open-pencil/open-pencil) and [compatibility roadmap](https://openpencil.dev/development/roadmap).

Any of the three may become an optional upstream adapter when the project has that real collaboration/authority need. Converting an already complete Open Design source into another format does not create missing information and never replaces handoff/Contract enforcement.

## Evolution And Ownership

`design-resource-handoff-v1` is already shipped. `representation: manifest_backed` is a storage/profile discriminant inside that same semantic contract, not a V2 protocol marker: preflight normalizes it to the existing complete V1 object, while older embedded V1 remains read-compatible. A genuinely new semantic dimension, locator meaning or interpretation still requires a versioned protocol change; eliminating duplicate physical projection does not.

Implementation owners are:

- invariant owner and compatibility rules: `packages/ty-context/src/lib/design-resource-fact-policy.ts`;
- atomic catalogs/types/strict codecs/typed-locator resolution, Inspector universe expansion, manifest validation and exact projection: `design-resource-fact-manifest-{types,catalog,shape,universe,validation}.ts`, `design-resource-fact-{shape-primitives,locator-validation}.ts`;
- residual handoff shape, manifest-backed projection, one-snapshot resource validation, addressability/source-profile/dependency/integrity/coverage/Fact/resource-closure validators, atomic bundle publication and CLI: `design-resource-handoff-*.ts` and `commands/design-resource.ts`;
- bounded Markdown formal-block scanning and single-decode Source projection: `source-line-scanner.ts`, `long-task-source-owned-sections.ts`, `long-task-source-item-parser.ts` and `design-resource-handoff-parser.ts`;
- Contract schema/UI surface and Long-Task activation/runtime binding: `long-task-ui-surface-*`, `long-task-ui-design-policy.ts`, `long-task-design-resource-handoff.ts`, `long-task-design-resource-method-binding.ts`, `long-task-evidence-capability-{types,codec,runtime}.ts`, Playwright adapters and shared activation. `long-task-design-resource-handoff.ts` is only the sequential handoff-consumption seam; it does not own or change Contract, Authority, Outcome or Final Gate semantics;
- authoring/consumer guidance: package-managed `design-resource-authoring`, UIUX/engineering and `long-task-workflow` Skills;
- deterministic input/Contract/runtime mutations: `tests/ty-context/design-resource-handoff*.mjs`, `long-task-delivery-compiler.test.mjs`, `long-task-playwright-ac-evidence.test.mjs`, `long-task-semantic-drift-closure.test.mjs`, the strengthened `selected-design-fact-closure` Trust sentinel, `verify_design_fact_completeness_delivery.mjs` and guidance/parity suites.

This construction is monotone over the earlier handoff/method path: every target, condition, dimension, Source, method, blocker and artifact obligation remains and reaches the same normalized validators and downstream checks. Manifest-backed hydration removes duplicate YAML without removing a predicate or proof row; explicit manifest target/path/SHA plus validated generation count/digests adds rejection paths at bundle publication. Therefore `Coverage_new ⊇ Coverage_old`, `FalseNegative_new ⊆ FalseNegative_old`; Authority, fail-closed behavior and complete-current-snapshot proof remain non-bypassable. Costs are scoped to formal selected Web/App handoffs and compact residual identity/digest rows; exact values and full Fact collections are not duplicated, ordinary UI work is unaffected, and no universal per-Control matrix, provider registry, lifecycle state, second Authority/Gate or implementation scheduler is added. Implementation order/method/cadence remain inside `F = Implementation Freedom Boundary`.
