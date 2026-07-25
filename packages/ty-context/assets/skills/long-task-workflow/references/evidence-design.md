# Evidence Design Reference

Read this only while designing or repairing Contract Checks and proof.

## General Proof Rules

- Every Outcome has at least one executable Check and one non-Result atomic Claim.
- Required proof surfaces are non-empty, unique and all-of. Claim-bearing Assertions use explicit comparable Observations and expected values.
- `truthy`/`falsy` are diagnostic-only. `exists` proves only implementation-structure obligations. Missing or type-incomparable Observation never proves a Claim; negative proof uses an explicit value such as `equals: false`.
- Claim and Population proof is emitted only after the entire Check passes. Exit failure, missing artifact, failed population, failed Assertion or invalid Counterfactual yields no Claim proof.
- Verification inputs include entrypoints, helpers, fixtures/config, package scripts and lockfiles and cannot overlap implementation carriers.
- Runners receive the minimum environment whitelist plus only declared environment requirements. Never expose actual secret values in findings.

## Runner And Observation Identity

Evidence adapter is derived from runner kind. Only Playwright may prove `ui_browser`; structured runners prove non-browser surfaces. Raw Execution identity binds frozen runner identity and canonical declared Environment Requirements, not actual values.

Across all Checks sharing a Raw Execution, one Claim-bearing Observation belongs to one Assertion. Shared setup may execute once only when independent per-Check observations and artifacts remain unambiguous.

## Scenario And Evidence Capabilities

- Every Check declares non-empty keyed `scenario.given` and `scenario.when` steps. One Check covers one materially coherent journey; a different success path belongs in another Check or vertical Outcome.
- Every Assertion declares a non-empty all-of `evidence_capabilities` set. `presence` proves static existence only and cannot alone prove a behavioral Claim. Each other capability requires exactly one typed current-execution record bound to the declared Assertion key; missing, duplicate, unknown or undeclared records fail closed.
- `interaction_trace` names the exact target plus the declared Given keys and ordered action keys. Playwright derives it only from an executed declared AC carrying matching `[given:<key>]` and `[action:<key>]` steps; `[ac:<assertion-key>]` remains the AC binding.
- `state_delta` requires different before/after hashes and named changed fields. `durable_readback` requires independent write/read sessions with equal state hashes. `cross_surface_consistency` requires at least two distinct surface refs, known target refs and one state hash.
- `boundary_invocation` and `external_side_effect` require the Check itself to execute on the named observer target. `failure_injection` requires an observed fault and recovery state; `visual_render` binds a declared artifact hash; `design_conformance` binds one compiled selected target, exact required product target, declared condition set and distinct current actual/comparison artifact paths; `target_runtime` binds exact target/root/current session and requires a cold start for a root journey; `input_variation` requires at least two distinct inputs, differing propagated outputs and an observed failure case.
- Structured runners emit `long-task-check-result-v3` for capability records. V2 payloads remain decodable only for presence-only compatibility; they cannot satisfy a declared non-presence capability. Evidence records contain bounded hashes/ids/refs, not unrestricted raw payloads.

## Live Target Runtime Evidence

- For a target-runtime Claim, the accepting Check must exercise the exact declared required target during the current runner invocation and derive structured Observations from the same runtime session. Browser target runtime is proved only by Playwright; Native/Desktop target runtime is proved only by the project binary. Rerunning a parser for a tracked or generated status report reruns the parser, not the target.
- A proxy surface may prove its own Claim but cannot substitute when proxy and target can fail independently. Static source/config shape proves structure only. The existence of a build, installation, started process or clean fatal-error scan proves only those exact assertions.
- If the declared result includes a runnable product surface or interaction, observe a stable product-owned sentinel or the declared interaction in the target session. A generic process/activity/window, development shell or absence of errors is insufficient for that broader Claim.
- Historical reports, screenshots, binaries and logs are review material. Current-run screenshots/logs may accompany a Check as Artifacts, but the accepting Observation must come from the live runner execution and cannot be imported from historical state.
- Bind every runtime-affecting implementation surface through `input_paths` and relevant Binding carriers; keep runner/helper/config files in `verification_inputs`. This lets existing Progress freshness identify when rolling feedback is stale without a new trigger registry.

## Causal Boundary Review After Revision

- When a rolling blocker causes a semantic or proof revision, review only the affected weak-observability or high-risk Outcomes before adoption. Ask whether a cheaper proxy, fixed response or self-reported success could pass while the declared result still fails at a farther independent boundary.
- Evidence must reach the furthest independently failing boundary named by the Claim. A proxy may prove its own result, but it cannot prove a downstream state or effect merely by reporting success.
- For a behavioral Claim, prefer a Counterfactual that disrupts the claimed causal capability when removing a carrier would prove only file dependence. `replace_file` may supply a declared inert/failing implementation fixture; `remove_paths` remains valid when carrier existence is itself the claimed boundary.
- Keep this risk-proportional and internal. Do not create an evidence matrix, product-effect taxonomy, universal restart/end-to-end suite, new mutation type or persistent review state.

For semantic Product Conformance, require one separate read-only Global `conformance` Check only when `weak_observability` combines with multiple Stages or multiple required product runtime families. It starts from a required root product target, includes `target_runtime`, uses a Raw Execution identity independent of Outcome Checks and runs inside the existing Final Gate. Single-Stage/single-family weak work keeps the existing same-Check sensitivity path and does not pay this extra runtime cost.

## Playwright

Claim-bearing Playwright proof is only `playwright.case.<ac-key>.passed equals true`. `[ac:<assertion-key>]` binds one declared AC per Test Instance; ordinary tags are ignored and legacy `[<key>]` binds only a declared key.

Missing, skipped, flaky, unexpected, timed-out, interrupted, failed, multi-AC and duplicate-within-project cases fail closed. The same AC across distinct projects aggregates all-of. Aggregate status/count fields are diagnostic-only.

Standard frozen Playwright verifier content is trusted. Weak-observability Outcomes require same-Check AC/Claim sensitivity. A weak Playwright Counterfactual may accept exit one only when every unexpected instance is uniquely a designated executed AC failure and there are no root, unbound, extra, missing, skipped, flaky, timeout, interruption, artifact, population, environment or other evidence failures. Ordinary Baseline Checks require exit zero.

## Visual UI Evidence

- A selected implementation handoff must already pass `ty-context design-resource preflight`. For each covered row, turn its declared verification methods into project-owned, independently failing observations in the target conformance Check: geometry/pixel/token/content, component state/interaction trace, motion timeline, responsive reflow/input method, accessibility semantics and asset integrity are different obligations. The strict index proves that none was silently omitted; it does not prove that the project verifier implemented or passed them.
- Keep `design_resource_integrity` and `design_implementation_conformance` distinct. Stable paths/hashes, provider/export success, manifest/registry membership and expected counts prove resource integrity; `visual_render` proves a current artifact exists. Neither proves the production implementation matches a selected target.
- When external design resources are Source, prove only selected exact-target/constraint conditions that the Contract explicitly adopts. Candidate comparison, a mutable provider link, extraction success, metadata-only output, resource digest or an isolated prototype run is authoring/integrity material and cannot become product acceptance. Resolve each acceptance-affecting fact through a typed locator plus immutable path/hash and declared target/condition applicability before Compile. Include the handoff and every source-profile entry/dependency in `verification_inputs`; project-owned method-specific design-conformance, interaction and target-runtime observations must still fail independently on the current production target.
- A `design_conformance` record is accepted only for the compiled target/Assertion/current Check target, an equal declared condition-key set and both declared actual/comparison artifacts collected by the current Check. Missing or swapped targets, conditions or artifacts fail closed; the implementation render cannot also be the comparison authority.
- Use Playwright for every declared `ui_browser` visual AC and bind each independently falsifiable AC to its own `[ac:<assertion-key>]` Test Instance. A broad screenshot or one passing page case does not silently prove separate viewport, theme, state, content-stress, layout or accessibility claims.
- Make the test environment deterministic enough for its claim: freeze the relevant browser/project, viewport, theme/mode, locale/timezone, font loading, fixtures/data and animation/motion policy in declared verifier inputs or configuration.
- Any reviewed screenshot baseline that affects pass/fail must exist for the accepting Compile and be included in `verification_inputs`. Generated screenshots, diffs and reports are Artifacts and review material; they are not editable acceptance authority. Creating or replacing a baseline after Authority Lock is verifier-material revision and must never be silently auto-updated to make a failure pass.
- Confirm that each baseline is a selected `exact-target` for the named surface/viewport/theme/state or implements a named `constraint`; an inspiration reference cannot become a fidelity oracle merely because it is available. The implementation's current screenshot is never its own target.
- Screenshot comparison proves only the named visual similarity claim. Pair it with explicit DOM/layout/accessibility/motion/responsive/input assertions whenever the handoff or Contract separately declares no overflow, action visibility, focus behavior, target size, semantic state, reduced motion or other observable behavior. One generic `design_conformance` record cannot erase distinct Source Claims or verification methods; every handoff method binds a separate Assertion and the trusted Check must fail if any asserted method fails.
- Keep evidence aligned with stable surface/control/target keys. Visual similarity, interaction/navigation, validation/recovery, permission behavior, accessibility and target-runtime conformance are independently failing claims and need their own Assertions/capabilities when declared; one broad screenshot or UI pass cannot prove all Control fields.
- Run checks against production components or real product routes. For each bound Control, the named root-entry journey must begin at the required product target root, execute the declared entry action and prove its navigation result—or interaction, trigger or location fallback—with `interaction_trace` plus `target_runtime`. A detached kit/mock/deep-link harness is acceptable only when the Contract explicitly makes that artifact the product surface; otherwise it cannot substitute for the production carrier or root journey.
- Keep subjective visual quality and approval external. A new visual direction or baseline that needs human judgment remains an explicit external confirmation even when all machine checks pass.
- `ui_browser` proves browser UI only. When a native/mobile/desktop UI can fail independently, browser output is proxy evidence; require a project-owned live target-runtime Check that truthfully fits an existing proof surface or keep the device/simulator review external.

## Structured Evidence And Sensitivity

Every claim-bearing `structured_json_v2` Check needs same-Check Claim-related Counterfactual sensitivity unless the Claim is covered by that same Check's Population proof; weak observability removes that Population exemption. Artifacts and another Check never substitute for sensitivity.

Outcome Counterfactual V2 names an Outcome `binding_key`; Global Counterfactual V2 resolves an Outcome-owned `binding_ref`. A Counterfactual mutates only a proven subset of implementation carriers, never Source, Context, runners or verification inputs, and accepts only designated `assertion_value_mismatch` findings.

An `existing` mutation target must exist at Preflight/Compile. A `planned` target may be absent until implementation but must exist at Final Gate; once created, its changes stale targeted Progress. Population V2 proves exact eligible = observed + valid exclusions by entity id.

Artifacts remain review material. They do not prove Claim sensitivity by themselves.
