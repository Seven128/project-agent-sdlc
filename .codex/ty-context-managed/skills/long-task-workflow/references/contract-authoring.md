# Contract Authoring Reference

Read this only while authoring or structurally revising the one `delivery-contract.yaml` Draft.

## Source And Semantic Boundary

- Every declared Source file contains at least one Material Source Item. Mark items in original Markdown without rendering or changing meaning.
- Marker keys and `source_claim` keys are set-equal and globally unique. `statement` preserves marked text after line-ending normalization, surrounding blank-line removal and trailing-space cleanup.
- Typed dispositions keep Result, Requirement, Control, Technical Obligation, Non-completing Claim, Acceptance, Global Constraint/Non-goal, Forbidden Shortcut, Risk, External Confirmation and Decision distinct.
- Every non-decision Source item owns exactly one same-kind, text-identical canonical target; no target may collapse multiple Source items. `out_of_scope` is not a resolution.
- A Source AC maps criterion-identically to one named Assertion and proves at least one independently Source-backed non-Result Claim.
- Missing recommended legacy Source Plan headings or keys never blocks authoring. Raw/mixed inputs enter this Contract Draft immediately; apply `source-authoring.md` alongside mapping until real Source, provenance and markers converge. Missing mandatory Material Source Item markers still blocks Preflight/Compile.
- A revised initial proposal and selected design resources are parallel Source inputs. Preserve their stable resource/surface/control/state/target keys, declared conditions, provider/project/run/entry provenance and immutable digest/snapshot; do not flatten visual meaning into an untraceable prose summary.
- `delegated` in a Source Plan is provenance, not a Contract disposition or new Claim kind. An instruction to synthesize, refine, complete, implement or use judgment delegates plan-level authoring, but it does not invent material tradeoff preferences. Before comparative research or a material product, technical, architecture or provider selection, identify the criteria that could change the research scope, candidate set or recommendation. If such a preference is unknown or ambiguous, ask a concise targeted question before research or selection and keep the item `decision_required` until answered; do not impose a fixed questionnaire or re-ask preferences already supplied by the user, Source, Context or controlling constraints.
- Once the material preference envelope is clear, use current authoritative or primary evidence for external capability, price, quota, license, compatibility, region, security posture or support claims. When one defensible recommendation exists, record the authoring instruction, preference/evidence or conservative-default basis and exact added meaning in real Source, then preserve that keyed item as ordinary Source of its semantic kind. If ordinary prose is the Source, append the delegated item without rewriting the user's original text; never place the choice only in Contract YAML.
- A delegated plan choice is not action authorization. Payment, contracting, production deployment/publication, destructive production mutation, real permission grants, sensitive-data transmission and required legal/security/human approval remain named External Confirmations. Conflicting authority, an explicitly user-reserved choice, a missing material preference or the absence of a defensible recommendation remains `decision_required`; high impact or multiple options with known criteria alone does not.
- A rolling implementation blocker is not an External Confirmation merely because work is difficult, delayed or unavailable through the current implementation path. Reclassify or remove machine-verifiable scope only through an explicit marked Source change and protected exact approval; otherwise keep the requirement and revise the implementation/evidence path.

## Outcome Boundary

Create an Outcome only when its result is independently observable, decidable, target-verifiable, dependency-expressible and localizable to its own Claims, Assertions, Checks and owner boundary. Requirement coupling, dependency-ready work, targeted verification, precise failure localization, semantic resume and stale-result invalidation are valid reasons to decompose. File count, implementation layer, context length, desired parallelism and Agent capacity are not.

For every Outcome declare:

- one complete observable result;
- atomic requirements and actually applicable controls/states;
- non-completing claims;
- owner Context/surfaces and expected/support/forbidden path envelopes;
- stable technical obligations, Bindings, forbidden shortcuts and recovery requirements;
- risk facts;
- executable Checks and named AC Assertions.

Global non-goals, constraints and forbidden shortcuts remain Global authority and use Global Checks/Assertions when machine proof is required.

## Feedback-cost boundary

Declare each Check's `input_paths` and Binding carriers as the smallest sound causal envelope for that Check. Do not use a repository, application or platform root merely because it is convenient: a broad pattern is justified only when any matching change can actually invalidate the declared result. If independent capabilities have different invalidation surfaces or useful feedback boundaries, assign them to the owning Outcomes/Checks rather than making every early Stage gate stale.

Every Counterfactual mutation path must be a current production carrier with a defensible route from the declared target root to the asserted behavior. Review `verify --explain` before an expensive first execution and repair obsolete routes, barrels, fixtures or duplicate Main/Counterfactual invocations. Preflight cannot claim language/runtime reachability from a path name alone; when repository evidence cannot establish that route, the current-execution Counterfactual remains the proof.

Declare cheap machine-checkable prerequisites through existing environment requirements and verification inputs. Product/API readiness probes, incremental build caches, streaming phase output, timeout heartbeats and descendant-process cleanup belong to the project-owned runner when they depend on its runtime; do not encode them as Harness business logic.

## Stage And Target Profile

- Declare one ordered `stages` DAG in the same Contract. Every Outcome belongs to exactly one Stage; every Stage names one gate Outcome; the gate transitively depends on every other Outcome in that Stage; and every later Stage Outcome transitively depends on every prerequisite gate.
- A Stage Gate is not a second Final Gate or Receipt. It is one or more `stage_gate` Checks owned by the gate Outcome, and its status/frontier is derived from ordinary Outcome Progress.
- A multi-Outcome Stage Gate declares `cross_surface_consistency`. Its runtime record names at least two distinct `surface_ref` values, may use the same runtime target for several pages, and proves one matching state version.
- `task.target_profile` declares `required_state` plus a non-empty, duplicate-free `required_target_refs`. Each ref resolves to a `product` execution target with one bounded runtime family and root entrypoint. Every Stage Gate and every `critical_user_path` Outcome provides root `target_runtime` proof for every required ref; optional support/observer targets never substitute.
- Use `implementation_complete` only when code-level implementation is the selected target, `target_profile_usable` when the declared required targets must be usable, and `production_release_ready` only when release gates are part of the selected target. These are terminal target qualifications, not Outcome progress states.

## Architecture Deliberation And Closure

Architecture Deliberation occurs once for every implementation delivery before formal Compile and the first implementation edit; risk changes depth, not occurrence. Surface concise conclusions and repository evidence rather than private chain-of-thought. A preservation result still names the concrete owner/extension point and explains why durable boundaries and debt do not worsen. Material work covers module ownership, unique source of truth, dependency direction, API/schema/data boundary, state lifecycle, persistence/recovery, security boundary, compatibility/migration, selected and rejected alternatives, one plausible future-change challenge, touched technical debt and forbidden bypasses.

Represent every material falsifiable invariant with existing Contract fields:

1. a Source-backed technical obligation, global constraint or forbidden shortcut;
2. owner Context and expected/support/forbidden paths;
3. a Binding to the implementation carrier when Counterfactual sensitivity is required;
4. a project-owned executable architecture check, such as the repository's lint, AST, dependency or contract test;
5. a separate Assertion when functional behavior could pass while the architecture invariant fails.

New or worsened debt is unacceptable unless a project-owned bounded exception identifies owner, rationale, tracking and removal/expiry condition. Unrelated legacy debt does not automatically expand delivery scope, but debt touched, relied on or worsened by the implementation cannot remain hidden. Material changes to scope, owner, Context, dependency direction, selected design or debt disposition refresh the deliberation and, after Authority Lock, use protected revision.

Do not encode subjective “clean architecture” or generic quality prose as machine authority. If no reliable observation can falsify it, keep it as durable Context/review judgment or return `decision_required`. Harness routes the repository's architecture check; it does not become a language-generic dependency analyzer. Final Gate is the only Long-Task Architecture Conformance carrier and reruns these declared Checks on its current snapshot; do not add a default-workflow closure, architecture field, second Gate or state.

## Proxy And Target Runtime Independence

When a declared result can pass on a proxy surface while failing in its target runtime, author independent target-runtime proof for the exact required target ref. Put the project-owned live Check in the earliest Outcome that owns the first runnable target boundary rather than postponing it to a terminal release/quality Outcome.

Use existing Contract semantics:

1. require `runtime_behavior` or the other proof surface that matches the actual Claim;
2. make the accepting runner exercise the target during the current Raw Execution and derive its asserted Observation from that same session;
3. include the runtime-affecting entrypoints, dependency manifests/lockfiles, configuration and integration carriers in `input_paths` or Bindings as appropriate;
4. freeze runner helpers/configuration as `verification_inputs` and declare only genuine environment requirements; and
5. add capability-specific probes only for Claims that actually require them.

A proxy check, static repository shape, tracked status report, prior screenshot, binary or historical run cannot be the sole proof of a Claim that can fail independently in the target. Use only the bounded execution-target runtime families and required refs in the Contract; do not add open-ended `platform_impact` flags or per-platform Progress state.

## Success, Degradation And External Boundaries

- Set `success_path_required` and `degradation_path_required` explicitly. A Result Claim is proved only by a `success` Check; the same Check cannot be both success and degradation, and an honest unavailable/pending/recovery state cannot replace required success.
- External confirmations declare `kind`, exact `impact_claims` and `blocks_target`. A `functional_prerequisite` blocks the selected target; a `production_release_gate` blocks a production-release target but may remain non-blocking for a lower target. Reclassification or impact changes are protected authority.
- `boundary_invocation` and `external_side_effect` are machine evidence only when their Check executes on a declared independent `observer` target. Product self-report never proves the downstream effect.

## Visual Delivery Authoring

When the selected delivery includes a new/redesigned screen, primary layout/navigation/theme/component system, high-fidelity implementation or other material production UI, resolve Design Authority before Compile and author the result through existing Contract semantics:

- when selected external resources are an implementation handoff, place one strict marked `design-resource-handoff-v1` Markdown file in `task.source_paths` and run `ty-context design-resource preflight <handoff.md>` before Contract Preflight. The handoff must close every applicable subject × target × condition cell across all eight UI/UX dimensions, resolve typed locators against immutable resources and bind covered cells to Source Items and verification methods. Web/App profiles require a canonical entry, exact declared dependency closure and complete acquisition; unresolved/stale/unsupported/partial input blocks. Treat candidates and unresolved decisions honestly; only a selected exact target with a valid selection basis, declared condition coverage and immutable identity can be proposed for fidelity authority, and downstream UI Authority Closure still owns adoption;
- perform UI Authority Closure over stable surface/control/target keys: classify each material item as covered by owning Context/`DESIGN.md`, requiring an owner update, task-local Source, explicitly out of scope or genuinely `decision_required`. Product Surface Context owns cross-surface responsibility, Screen/interaction Context owns durable hierarchy/behavior, `DESIGN.md` owns visual-system/reference semantics and selected targets own concrete composition; Contract YAML must not duplicate or invent those owners;
- inspect owning surface/interaction Context, `DESIGN.md`, its authored token source/generation direction and material design references. Classify every reference as `exact-target`, `constraint` or `inspiration`, with its surface/route/component, path/URI and covered viewport/theme/mode/state;
- an unconfigured starter, style-only prose, inspiration-only set or conflicting target is not sufficient production authority. Resolve it by explicitly scoping Source to a prototype/non-fidelity result, recording an explicitly delegated and selected design target in real Source after material preferences are known, or keeping the unresolved/user-reserved direction `decision_required`;
- never let implementation output authorize itself: a generated implementation screenshot/diff is an Artifact, not the target. An acceptance-affecting target or baseline must be selected Source/verifier input before fidelity implementation can be accepted;
- derive a task-local, risk-proportional Visual Coverage Set from declared Source, `project_context/**` and `DESIGN.md`: production surface/route/component, viewport, theme or product mode, interaction/state, content stress and accessibility/motion conditions;
- select representative combinations rather than silently creating a full Cartesian requirement; an omitted combination remains unproven, while Source that explicitly requires full coverage must retain that scope;
- encode each independently falsifiable visual expectation as an atomic Requirement, applicable Control field or named AC Assertion. Name the surface, viewport, theme/state/content condition and observable result when they matter to the claim;
- preserve every applicable material Control field independently: `surface`, `region`, `location`, `control_type`, `label_content`, `user_task`, `visibility`, `availability`, `trigger`, `input`, `validation`, `default_value`, `interaction`, `navigation_result`, `loading_state`, `empty_state`, `success_state`, `failure_state`, `recovery`, `permission`, `feedback` and `accessibility`. Empty/non-applicable fields create no Claim; do not collapse decided fields into broad prose that loses Source-to-Control traceability;
- when an Outcome declares Controls, add the minimum aggregated Product `surface_bindings`: one stable binding per owner surface and required product target, its Control refs, existing Technical route/component Binding refs, one root-entry success Check and its real entry action. Every Control must be bound, every Control Claim must have target-local proof on the runtime-appropriate surface, and the root journey must prove each Control's declared `navigation_result` or its `interaction`/`trigger`/`location` fallback with all-of `interaction_trace` and `target_runtime`;
- bind the declared result to the owning Context/`DESIGN.md`, one authored token source and generation direction, selected target/constraint inputs, production component/route carriers, path envelopes and project-owned target checks. Freeze acceptance-affecting selected target files, token sources and fixed prototype fixtures in `verification_inputs`; bind production carriers through `input_paths`/Bindings and reserve `artifact_globs` for generated implementation renders, diffs and reports. Detached kits, deep links, mocks or marketing specimens may be references or supplemental checks but not substitute implementation carriers or the production root journey;
- for each selected exact/constraint target inside a surface binding, use the exact handoff target key and interpretation; declare `source_paths` as exactly the handoff plus that target's immutable resource paths and `condition_keys` as exactly its handoff condition refs. Put the same files in Check `verification_inputs`; map every covered handoff Source Item through `source_claims` to Claims included by the one root conformance Assertion; and bind every handoff acceptance blocker in the surface binding. The Assertion also names bound Control Claim refs, distinct current actual/comparison artifact paths and all-of `design_conformance`, `interaction_trace` and `target_runtime`, and current proof emits a typed `design_conformance` record; `visual_render`, handoff preflight, file hashes, counts or registry presence remain input/resource integrity and cannot substitute for implementation conformance;
- explicitly inventory every declared design-acceptance blocker inside its surface binding. An empty array states that no blocker is declared; each declared entry references target-local Claims with valid proof or a target-blocking External Confirmation whose impact includes the Outcome. There is no in-band not-applicable waiver: removing a blocker from scope first requires explicit revised Source and, after Authority Lock, protected Contract revision. Empty refs block Compile/Final Gate;
- use `ui_browser` only for declared browser ACs. A browser or Expo-Web proxy cannot prove a native/mobile/desktop target that can fail independently; use a project-owned current-execution target Check when existing proof surfaces can truthfully represent the claim, otherwise retain named human/device confirmation as an external confirmation rather than inventing machine proof;
- keep subjective visual direction, taste or approval outside false machine proof. Resolve an undecided direction as `decision_required`; represent required human design or new-baseline approval as an explicit external confirmation.
- for combined design-and-implementation delivery, ordinary design Outcomes/Stages may author candidates before selection, but candidate/planned artifacts cannot authorize fidelity Claims. Append the selected result to real marked Context-reachable Source and its owning Context/`DESIGN.md` reference; after Authority Lock adopt it through Authority Revision before downstream fidelity implementation. This creates no target-selection state, second Contract or second Gate.

External design resources authorize fidelity only when they become a selected exact target with a validated handoff; they remain ordinary upstream Source rather than a Contract Draft, verification result or alternate authority. The revised initial proposal plus selected immutable canonical resources and the residual `design-resource-handoff-v1` is the recommended implementation input; no standalone Source Plan handoff is required. Map each covered Source Item into the root conformance Assertion and each declared verification method to its own independently failing Assertion; carry blocker Source Items and methods unchanged into a target-local machine Claim or target-blocking External Confirmation. A legacy Source Plan remains valid ordinary Source if supplied. The single Product `surface_bindings` projection is an aggregated cross-reference over existing Source, Controls, Technical Bindings, targets, Checks, Assertions, verification inputs and External Confirmations; it creates no `uiux_delivery` authority block, Claim kind, risk level, lifecycle state, required design directory, per-Control screenshot matrix or Gate.

## Compact Authoring

Compact V2 may omit only deterministic defaults: empty optional arrays/nulls, `context_snapshot_mode: referenced`, `requested_level: auto`, runner `argv: []`, `cwd: .`, `timeout_ms: 30000`, `retry_policy: none`, `idempotent: false`, and empty output/artifact/assertion/environment lists.

Goal, target profile/required targets, ordered Stages, Source/Source Claims, Context, observable results, success/degradation requirements, owners/paths, REQ, applicable CTRL states and their production `surface_bindings`, selected target conditions/conformance artifacts, design-blocker dispositions, OBL, proof surfaces, Given/When scenarios, journey roles, Evidence Capabilities, runner targets/effects, verification inputs, Assertions, risk, forbidden shortcuts and typed external confirmations remain explicit.

Compiler-generated Outcome/Check/Claim identities replace handwritten mechanical cross-entity references. This does not authorize compiler inference of product meaning, owners, architecture, proof or risk.
