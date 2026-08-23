# Open Design Provider Orchestration

Use Open Design as the generation engine. This Skill supplies a bounded product commission and retrieves results; it does not recreate the provider's prompts, template logic or catalogue.

## Execution priority

1. **Structured Open Design MCP** for discovery, project/run control and artifact retrieval.
2. **Open Design CLI or daemon API** when MCP is unavailable or cannot expose a required current capability but equivalent structured behavior is locally available.
3. **Browser/desktop interaction** only for bootstrap, unavoidable UI-only selection, signed-in provider interaction, visual preview inspection or recovery. Prefer browser-specific control over general Computer Use when both can operate the page.

Do not silently install an MCP server/plugin, alter the user's global Open Design/Codex configuration, sign in, create a paid-provider dependency or expand data disclosure. Explain the exact setup need and obtain separate authorization when persistence or a new disclosure path is required.

## Live capability discovery

Discover rather than remember:

- configured agents and models, including whether Open Design's inner agent is Codex CLI;
- functional skills and plugins;
- rendering templates or project types;
- design systems and their selected project binding;
- specialist paths such as collaborative design platforms, image, video or 3D/WebGL;
- supported project creation, run, cancellation, file and artifact operations.

When live behavior or CLI/MCP semantics materially control the commission, retain the exact provider version and, when available, the released tag/commit plus authoritative documentation locator used for capability interpretation. A mutable default branch, remembered UI behavior or unpinned local checkout is not durable protocol evidence.

Current structured tool names may include `list_agents`, `list_skills`, `list_plugins`, `create_project`, `get_project`, `get_active_context`, `start_run`, `get_run`, `cancel_run`, `list_files`, `get_file` and `get_artifact`. Feature-detect them; tool names and provider versions may evolve.

Functional skills and rendering templates are different registries. Finding `frontend-design` does not prove that a `mobile-app` or `wireframe-mobile-flow` template is installed, and a remembered template ID is not live capability evidence.

## Highest-performance generation selection

Open Design quality takes precedence over model-call price for every formal first generation, every major revision and every final-candidate defect repair that requires material regeneration. A major revision changes the adopted visual direction or design system, cross-surface information architecture, primary interaction model, or enough of the selected canonical source/Fact manifest to invalidate the former candidate. Pure discovery, reads, resource enumeration, metadata queries and review of an already sufficient selected resource do not trigger this policy.

The durable policy is `highest_available_capability + highest_supported_reasoning_effort`, not a permanent model name. Apply it immediately before each applicable run:

1. Discover the live provider/tool schemas and returned agent/model metadata. Determine whether the actual run surface exposes model, reasoning-effort or service-tier inputs and which run/project/result fields can confirm their effective values. Never invent an input or result field that the provider does not expose.
2. Filter to eligible models before ranking. Eligibility requires every tool, visual/multimodal capability, context capacity, authentication path and data-residency/disclosure boundary required by the commission. An ineligible model cannot win on nominal capability.
3. Rank eligible models only by the provider's explicit capability order or documented recommended-replacement relation. If that is absent, the sole permitted fallback is one versioned, evidence-linked provider-local mapping owned in this reference; do not duplicate it in the main Skill, Context, README, tests or adapters. Price, model-name shape, publication date, apparent generation number and provider list order are not ranking evidence. This reference currently defines no fallback entries: when live provider evidence cannot order two or more eligible candidates, stop formal generation or major revision with `highest_performance_unverified` instead of guessing.
4. For the selected model, use its actually declared ordered legal reasoning-effort values and select the highest supported value. Examples such as `max` or `xhigh` illustrate possible highest values; they are not a cross-provider ordering or permanent product vocabulary. If several advertised values cannot be authoritatively ordered, the highest effort is unverified and the applicable generation must fail closed.
5. Keep service tier distinct from model capability and reasoning effort. Discover and report it when the provider exposes control or provenance, but never use price, latency tier or a service-tier label to rank model capability.
6. When model selection is controllable, requesting anything below the proved highest eligible model is an invocation error. When reasoning is controllable, requesting anything below the proved highest supported effort is likewise an error. A missing remembered example model is not an error when live evidence selects a different actual highest model.
7. Compare requested values with the effective model, reasoning effort and service tier reported by the completed run. A mismatch fails the run. If the provider accepts a request but does not expose effective provenance, keep the result `highest_performance_unverified`; do not claim the requested values were used.
8. If the provider exposes reasoning control but no model control, request the proved highest effort and report that model selection could not be independently enforced. If it exposes neither control nor enough candidates to create an unresolved ranking choice, its current default generation path may be used, but the result remains `highest_performance_unverified`. If it explicitly exposes multiple eligible models and no authoritative order, rule 3 blocks the run.

Capability discovery happens at call time so a provider's new highest model or effort can replace an older example without a Skill edit. This is a provider adapter policy, not a scheduler: create no persistent model registry, routing state, retry loop or cross-provider optimizer. Reduce cost by avoiding unnecessary generations, irrelevant resources and separable revisions, or by reusing a sufficient selected resource—never by lowering the generation model or effort.

Repository tests can prove only that these branches remain distributed in the managed guidance. Only a normalized live provider trace that freezes provider/version, candidate and eligibility metadata, ranking authority, request fields and effective result provenance can prove the model and effort actually used. Without that trace, report the boundary as unverified.

### Rendering-template discovery compatibility

Prefer, in order:

1. a live `list_design_templates`-style method/resource when the provider exposes one;
2. an explicit template ID supplied by the current project/user and validated by the provider;
3. a version-guarded structured daemon query that reads the provider's current registry;
4. provider UI inspection when no structured registry is exposed;
5. an honest `unavailable` or degraded-discovery result.

Never vendor a fallback template catalogue or guess a template ID from prior runs. Do not implement a transport helper unless the live host truly lacks a safe structured path; any helper may normalize metadata and transport only.

### Resource-type capability matching

Match the requested artifact archetype to demonstrated live capability rather than a Skill name. Distinguish at least landing/brand pages, dashboards/data workbenches, dense tables/filters/forms, mobile multi-screen flows, component workbenches, complex interaction, formal Web/App handoff and icon/illustration/media work. For every considered capability, establish the target resource type, platform, surface count, state/interaction support, real-render support, bounded revision support, canonical-source retrieval and formal-handoff coverage.

A single-frame HTML phone mockup cannot claim a native mobile-App or multi-screen formal handoff. A visually strong capability without retrievable canonical Source may support exploration but not a formal implementation handoff. Give unsupported candidates `unavailable` or `not-needed`; do not wrap a partial output in a stronger profile. This matching is task-local provider adaptation, not a registry or durable ranking.

## Conditional Design Authority gate and binding

Before any style-bearing commission, read project `DESIGN.md` and its declared authored exact-value token source/generation direction. Style-bearing means the resource materially expresses visual fidelity, brand, typography/color/density, component visual treatment or a production-style prototype. Low-fidelity structure, IA/flow topology and semantics-only behavior/state studies are non-fidelity and do not require the gate.

If authority is absent, explicitly `unconfigured`, still a starter, style-only/inspiration-only, or lacks one authored token source/generation direction, stop before creating a project or run. Direct the user to explicitly invoke `$design-system-authoring`; never auto-run it. A combined explicit request authorizes the sequence.

For configured style-bearing work:

1. read the adopted Open Design design-system ID and digest/provenance from project Design Authority;
2. confirm `od://design-systems/<id>/DESIGN.md` is readable through MCP;
3. pass that ID as `designSystem` to `create_project`;
4. immediately call `get_project` and require `designSystemId` to match;
5. when reusing a project, check its binding before every new style-bearing run;
6. on missing/mismatch, prefer a new bounded project with the correct binding when MCP has no safe update method; otherwise feature-detect and verify the provider's structured update.

Never silently use the provider's default or a different system. A provider-side mismatch is a synchronization/rebinding issue; it does not erase the canonical project `DESIGN.md`.

## Pre-run style-application closure

Before submitting a commission or calling `start_run` for any style-bearing generation or material revision, require the task-local closure defined by [resource-selection.md](resource-selection.md). Every applicable current-slice dimension must be `existing-covered`, `projected` or `not-applicable`. A `decision-required`, undispositioned dimension or Source conflict blocks the run before Provider execution; preserve the concrete diagnostic instead of launching a speculative candidate.

Validate each disposition at the adapter boundary:

- `existing-covered` meaning must arrive through the current commission's existing `inputs.exact_targets`, `inputs.constraints` or corresponding input binding and must match the exact target, slice and declared conditions;
- only `projected` meaning enters the existing `style_application` object;
- `not-applicable` stays a reasoned task-local judgment and creates no empty field; and
- `decision-required` stays unresolved and never becomes Provider-authored application meaning.

A verified `designSystemId`, exact-value Token lineage or generic instruction to follow the system proves system binding only. It cannot prove that the current slice's hierarchy, density, container, visible-versus-hit geometry, preservation or prohibited-pattern meaning reached the Provider. The Provider must not complete missing application meaning from a feature list, route tree, generic system, component inventory, screenshot, inspiration, background or task-level UI/UX analysis.

Repeat the closure immediately before each material-revision run, using the existing material-revision definition. After the resulting candidate is acquired, rerun the applicable Design suitability subchecks as the independent post-generation review. A packaging, rename or byte-only export proved equivalent to the same canonical source creates neither a new Provider run nor a new design decision. This is a fail-closed adapter precondition inside the existing commission action, not a schema, state, Authority, Gate, readiness result or Provider lifecycle.

## Structured commission sequence

1. Record provider version, selected agent/model, reasoning effort and service tier when exposed, functional capability, rendering template, adopted design system and relevant plugin/export readiness as reported live. For an applicable generation, retain the eligibility/ranking basis and the request-versus-effective comparison required by the highest-performance policy.
2. Reuse an existing task-local project only when its scope, prior inputs and required design-system binding match; otherwise create a bounded project. For style-bearing work, pass `designSystem` and verify `get_project.designSystemId` before the run.
3. Only after the pre-run style-application closure allows execution, start a run with the product-specific commission envelope, including exactly its Source-bound `projected` `style_application` fields, archetype-specific `quality_commission`, provider-native capability identifier and—when the intent is a formal Web/App implementation handoff—the complete prederived authoring obligation universe plus current implementation-substrate observations and allowed realization boundaries from [implementation-feasibility.md](implementation-feasibility.md). Fully current input-bound `existing-covered` meaning permits the style object to be omitted; `not-applicable` and `decision-required` never become empty or invented fields. The quality commission states real-copy/data needs, primary challenges, desired/avoided character, reference roles and design-side shared-family reuse without claiming production reuse. That universe is based on requested scope, product semantics, adopted design system, real technical Source and target environments; it must not be inferred only from provider output. Both application and quality fields are commission content, not a separate persistent Projection, Authority, state, routing record or Provider score.
4. Poll with a bounded cadence. During a long run, report meaningful progress at least once per minute without flooding the user.
5. Preserve run IDs and the latest provider diagnostic. Support cancellation when the user requests it and the provider exposes it.
6. Resolve the actual entry explicitly, retrieve the artifact/source, inspect it according to intent and preserve its immutable identity before later iterations or handoff.

Open Design may launch Codex CLI as its configured inner agent. That is provider execution, not recursive invocation of this outer Skill. Do not hardcode a remembered model when live discovery and authoritative ranking can select the current highest eligible model.

## Separate three kinds of state

### Provider execution state

Examples: queued, running, succeeded, failed, cancelled, timed out or unknown.

### Artifact readiness

Examples: missing, partial, corrupt, retrievable, rendered or snapshot-preserved.

### Design suitability

Design suitability is one freshly derived umbrella review, not another state machine and never human selection. Review the applicable subchecks at intent-proportional depth:

- **scope and Source suitability:** the candidate stays within the hard ceiling and follows current controlling Product/Surface/Screen/Design Source; an outside effect is reported, not generated;
- **mechanical checks:** promised files/entries are readable, structurally usable and free of obvious corruption, broken references or intent-material runtime defects;
- **Design-System application checks:** the verified adopted identity, exact-value/token lineage and applicable component-family rules are used rather than merely named;
- **visual-language checks:** composition, hierarchy, typography, visual rhythm, density, container treatment, color, spacing, content realism, component treatment and other material relationships cohere with the selected Source-bound direction;
- **distinctiveness and component-authoring checks:** the result answers the product-specific challenges without unsupported template mannerisms, and repeated controls use a coherent design-side component family rather than unrelated per-instance styling;
- **state/condition coverage checks:** credit only demonstrated states, variations, interactions, viewports, input/accessibility conditions and assets; and
- **preservation checks:** explicitly preserved Source meaning, exact visual facts and unaffected bindings remain unchanged.
- **implementation-feasibility checks for formal Web/App handoff:** each material component-family × target × condition profile has at least one real-substrate realization or a Source-backed blocker, without copying exact design values into the technical feasibility document.

Report applicable checked and unchecked conditions. A grounded conflict blocks; an ungrounded aesthetic preference is a candidate-comparison observation, not a fabricated Source rule. Examples of derived suitability outcomes may include `unreviewed`, `scope-source-conflict`, `revision-required` or `suitable-for-user-review`; none means selected, formally complete or handoff-ready.

Never collapse these into one “success.” A provider success does not prove a good design; a complete artifact can exist even when a provider run later fails.

After every material revision, rerun every applicable suitability subcheck against current Source and bytes. A material revision changes the selected visual direction or design system, cross-surface information architecture, primary interaction model, declared state/condition coverage, preservation obligation or enough canonical source/Fact meaning to invalidate the reviewed candidate. A byte-only packaging/export change proven equivalent to the same canonical source does not create a new design decision; a visible or semantic difference does. Always inspect the actual rendered candidate when the resource is renderable. If the first candidate has no material Source, feasibility, mechanical or suitability defect, it may proceed directly to user selection; never manufacture a revision quota. When repair is needed, request the smallest defect-localizing revision that preserves unaffected meaning, then reacquire and review the complete current candidate.

Use these qualifiers when needed:

- `artifact-ready/run-unreconciled`: a complete retrievable artifact exists, but the provider run remains nonterminal or inconsistent;
- `artifact-ready/provider-failed`: the artifact remains complete and retrievable, but the provider later reports failure/timeout.

In both cases preserve the exact run locator, last update, failure diagnostic and artifact hash. Do not claim provider success or downstream acceptance. Retry only when the promised resource is incomplete/corrupt or the user requests another attempt; do not discard a useful independently inspected artifact merely because the terminal state differs.

## Implementation-level output profile

Open Design has demonstrated that a complex Web page can emit a machine-readable implementation set such as `index.html`, component/design specifications, tokens and an asset manifest. Capability is not a per-run guarantee. When the selected resource will drive Web/App implementation, make this an explicit commission and retrieval invariant:

1. send the complete Expected Fact Universe with the commission. It enumerates every scoped subject and hierarchy, each applicable target-condition axis/value combination, every subject-local `variant × state × interaction_phase × presence_phase × instance_case`, and every standard or justified custom atomic property. The provider must encode every applicable Fact Cell or return an exact non-applicable/excluded/unresolved disposition; `all-states`, one default render, representative samples and broad summaries are not atomic coverage;
2. request a canonical machine-readable entry whose HTML/CSS/JS/JSON/SVG/tokens/assets or equivalent implementation sources contain the exact geometry, style, content, behavior, motion, accessibility, asset and system-condition values. One comprehensive source may carry many facts; no one-file-per-component rule is implied;
3. require one machine-readable `design-resource-observable-fact-manifest-v1` inside the canonical dependency closure. It freezes the design-system snapshot; Inspector identity/version/digest or named external TCB and declared capabilities; exact input-resource paths/digests; complete resource/node/declaration/token/asset/relation/variant/state/interaction/dynamic-population Census; condition/variation universes and exclusions; subjects; property catalog; Fact Cells/Facts; typed value locators/digests and effective-value lineage; Fact × required-method proof obligations; evidence, comparator/tolerance/mask, Oracle and render-environment authority; assets, blockers and generation collection counts/digests;
4. require `traversal: complete_enumeration`, fully enumerated dynamic/lazy/virtualized/portal population, `sampling: forbidden`, `truncation: forbidden` and exact deterministic chunk/count/digest closure. An Inspector `complete` Boolean or a provider claim is insufficient without its Census and identities;
5. enumerate the complete output set and retrieve every selected entry/dependency without truncation. Preserve exact bytes, media types and SHA-256 digests in repository-local immutable files; include local source modules, styles, tokens, SVG, fonts, images, audio/video, workers and other referenced assets;
6. record `implementation_web` or `implementation_app`, the canonical entry, every dependency, the Fact manifest and `acquisition: complete`. For Web/App output, require every locally referenced dependency discovered from the frozen source to be present in the declared target set;
7. use stable IDs/data attributes, Markdown anchors, JSON Pointers, HTML/CSS/JS/SVG selectors, declarations, attributes or bounded whole-file binary locators that shared preflight can resolve. Critical values cannot live only in a bitmap, preview or prose summary;
8. run the frozen Inspector and require `Expected Fact Universe = Canonical Resource Facts`. Every Census item must map to exact Fact/Fact Cell identities or a source/basis-backed `non_material` disposition. Preserve design-system token, alias, platform/mode/state/instance override and conflict-resolution lineage; exact condition profiles must include viewport geometry, pixel ratio, Safe Area insets and text-scale multiplier;
9. exercise every property-required verification method against the canonical entry under each claimed condition. A Fact may require multiple independent methods—for example token plus pixel—and each obligation binds method-compatible evidence, comparator parameters, exact/tolerance mode, any narrow authoritative mask, Oracle identity/version/digest and frozen render environment. Compare repeated facts across code, specifications, tokens and asset manifests. Refine any mismatch; if it cannot be resolved, keep the exact Fact Cell `decision_required`/`unavailable` with a blocker;
10. mark protected observations before downstream use. Sensitive raw UI values must not be persisted in Contract/runtime evidence: the canonical source remains the value owner while later evidence carries an attributable digest-only or redacted representation and policy reference.

Alongside, author one separate `design-resource-implementation-feasibility-v1` input per target from real repository technical Source. It must use current no-follow repository directories for component/route owner roots, cover the complete transitive subject closure of every material component-family × condition profile with feasible multi-step/multi-primitive realizations or explicit blockers, and retain candidate costs/risks and customization surfaces without carrying any exact visual values in observation reasons, costs, risks or blocker prose. A decision-required/unavailable substrate observation reaches an affected cell through an exact Source-backed blocker. Leave the required realization unselected unless an exact current marked technical Source Item decision requires one; planned owners and blockers use their corresponding strict decision projections too. Provider output cannot invent any of those decisions. Never put this document or its technical Source records into the canonical resource closure.

The authoring Skill then projects the exact manifest identities into the residual handoff and shared preflight enforces `Expected Fact Universe = Canonical Resource Facts = Handoff Indexed Facts`. This is authoring source QA, never production acceptance. If the live Open Design capability cannot generate, expose or retrieve this profile, report the missing capability and keep the formal handoff blocked; provider success does not authorize a coarser replacement.

A PNG may be a useful derived visual baseline, but it cannot be the sole source for implementation-level state, interaction, adaptation, accessibility or motion facts. Non-Web resources use the `reference` profile; do not manufacture HTML merely to satisfy this profile.

## Explicit entry and immutable identity

Provider project metadata may omit or stale its entry file. Resolve in this order:

1. validate an explicit project entry path when present;
2. enumerate project files;
3. identify the intended provider-native entry from the current run/output rather than guessing;
4. retrieve that exact file/artifact;
5. preserve an SHA-256 digest or immutable snapshot before selection/handoff.

A preview URL is mutable navigation, not immutable identity. It may be reported for convenience only beside project/run/entry provenance and a digest. If the user explicitly selects the resource for durable use, export or snapshot it to a user-approved location; never silently choose a repository path.

## Review proportional to intent

- **Exploration:** open/render the requested entry, confirm artifact count/scope and obvious corruption, perform only the decision-material suitability subchecks, then show it. Do not launch a packaging or validator sequence.
- **Handoff:** additionally perform the method-proportional source QA above, including relevant structure, states/transitions, viewport behavior, accessibility semantics, assets, obvious console/runtime errors, requested interaction hooks, Design-System application, visual language, preservation and real-substrate implementation feasibility. State exactly what was and was not checked.
- **Selected-source preparation:** require an independent explicit human selection basis, preserve identity/snapshot and prepare downstream metadata. Suitability informs that decision but never makes it, and still does not verify production behavior.

Provider self-checks, outer artifact sanity review, user selection, formal source closure and downstream project verification are separate evidence layers. A visual-language or mechanical pass cannot independently establish Artifact readiness, selection, formal completeness, handoff readiness, native rendering, accessibility, responsive coverage, product correctness or acceptance.

## Specialist paths

Figma, Penpot, OpenPencil, image, video, 3D/WebGL and other providers are optional upstream producers. A Direct Agent authoring the resource is also a legal other Provider when current evidence shows that it satisfies the same bounded archetype, render, revision, canonical-source and formal-handoff capabilities; it receives no exemption from Source, Design suitability or handoff closure. Use any provider only when its collaboration/editability or native inspection value is material and its connector/auth/read/export path is operational. A listed plugin, URL, thumbnail or metadata response is not proof of usable native input. If a requested provider is unavailable, report the missing capability precisely, offer another artifact only when it preserves the requested design decision, and never relabel an export as native editable design. Every selected provider still emits repository-readable immutable resources through the same provider-neutral handoff.

## Failure and recovery

- Preserve provider diagnostics; do not replace failures with generated placeholders.
- Avoid unbounded polling or repeated blind reruns.
- Re-discover capability after provider upgrades or registry mismatches.
- If structured paths fail but a UI artifact exists, UI inspection may recover it while retaining the degraded-provider qualifier.
- If the provider is unavailable and no justified fallback exists, return `unavailable` with the minimum setup needed rather than generating with an unrelated image tool and calling it equivalent.
- Provider recovery and DRA semantic recovery are separate: this reference may re-read the current run/resource identity, while [recovery-and-writeback.md](recovery-and-writeback.md) alone owns Base/Delta replay, the conditional checkpoint and Proposal CAS. Never restore a live Provider state or suitability conclusion from that checkpoint.
