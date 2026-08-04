# Long-Task Workflow Efficiency Policy

## Objective

The Long-Task Workflow exists to prevent false completion inside declared authority. Its acceptable machine result is binary in substance: either fresh evidence on the complete current final snapshot proves every declared Plan Item and AC, or the delivery remains explicitly unfinished or qualified.

Its mechanism-design objective is the efficient attainment of the complete fine-grained effect: preserve the Source/Contract Authority, Authority Lock/Revision, drift observation/localization, repair/revalidation and one current-snapshot Final Gate chain; preserve every independently decidable non-UI Fact and every full-granularity UI/UX Fact/proof obligation; then minimize the total cost of attaining that unchanged effect. Efficiency is subordinate to those hard constraints and is not a terminal-delivery predicate. The preferred design is the lowest practical total workflow cost that preserves the same false-completion interception and granularity, or stronger interception at the same cost.

Apply two gates in order:

1. prove `Coverage_new ⊇ Coverage_old`, `FalseNegative_new ⊆ FalseNegative_old`, and that Authority, fail-closed behavior and complete-current-final-snapshot proof remain non-bypassable; cost reduction cannot compensate for weaker drift detection, and if non-degradation cannot be proved the current formal acceptance path is preserved while experiments stay outside it;
2. then compare every incremental Authoring, Runtime, State, Recovery, maintenance, test, process, introduction and migration cost with the incremental purpose-fulfillment benefit.

ROI is positive when that incremental benefit exceeds all incremental costs. Positive ROI admits a non-degrading candidate to the consideration set; it does not adopt the candidate automatically.

## Change Principle

Every Long-Task change starts from the controlling design purpose and accounts for total cost by explicitly including the cost of introducing the change in the subsequent ROI judgment. Change the mechanism and its verification when mechanism semantics, an invariant, an authority/proof boundary or runtime behavior changes. Otherwise change only the owning point instead of promoting a local correction into a mechanism.

Prefer measured data, benchmarks or operational evidence for the ROI judgment. When none exists, discuss the decision with the user or project owner; rigorous causal reasoning plus simple, bounded validation is sufficient. The Long-Task Workflow itself was admitted on that basis before mature longitudinal data existed. Unsupported intuition alone is insufficient.

Keep the design purpose fixed and require positive ROI after the non-degradation gate. At comparable total cost, optimize how effectively the mechanism fulfills its purpose; at comparable purpose fulfillment, optimize implementation and operating cost.

## Current Closure Hardening

Six related changes pass the first gate because they add fail-closed coverage while preserving every prior Claim, Check, Authority, freshness and Final Gate requirement:

- **Source ownership closure** rejects every non-empty line outside a Material Item, a keyed/reasoned background block or the one parsed formal handoff block. It adds marker authoring but no runtime/state plane and closes silent prose omission.
- **Control and relation closure** accounts for all 22 Control fields plus cross-Control relations as specified, explicit not-applicable or blocking unresolved meaning. Grouped field rows avoid one record per field; only real applicable semantics add Claims and Checks.
- **Claim applicability closure** binds each Claim to exact target, journey, Given condition/input/state keys and ordered When actions, and each one-Claim Assertion to one such cell. Coverage is complete over declared applicable units and required proof surfaces, not an all-fields Cartesian product and not risk-based, pairwise or sampled substitution.
- **Semantic Counterfactual closure** requires every behavioral Claim-bearing Assertion to fail under a same-Check claim-local `replace_json_value` or `replace_text` wrong-semantic mutation while a claimless target-runtime liveness Assertion remains passing. Whole-file replacement is compatibility-only and can prove carrier loss, not semantic binding. Related Claims may share one mutation execution only when their failures stay distinct.
- **Final Gate protected-input closure** performs one additional static recompile after all Checks and compares semantic compiled identity plus raw Contract bytes. It catches concurrent Contract/fragments, Source, Controlling Context, verifier, runner and verification/workdir input changes without another executing Gate or rerunning project Checks.
- **Minimal counterexamples and full-chain regression** exercise omission, relation/applicability mismatch, weak oracle/liveness, protected-input races and public/tarball lifecycle paths. This adds bounded maintenance/runtime cost to the package suite, not to consumer delivery state.

Their purpose benefit is removal of independently reproducible false-negative paths. Their incremental costs are explicit authoring metadata, semantic Counterfactual executions, one post-Check static Compile and focused regression time; no Source Inventory file, persistent matrix, second Authority, second Gate, scheduler or generic analyzer is added. Positive ROI made the cohesive change eligible for adoption; the non-degradation proof and project review, not ROI alone, authorize it.

## Bounded Context Discovery

Default Context routing combines manifest candidates with one bounded text search over `project_context/**` before `Context Delta`. The Agent uses a small set of high-signal task terms such as explicit area/module names and API/schema/state/security/verification/deployment language, merges matches with graph/trigger candidates and reads only relevant files.

This reduces the direct trigger-miss path at low fixed cost. It is intentionally not a retrieval system: no whole-repository search requirement, vector/persistent index, cache, registry, search state or automatic authority inference is added. Keyword search supplements semantic judgment and final Conformance; it cannot eliminate synonym or indirect-dependency misses by itself.

## One-Time Execution-Model Choice

The first successful formal Compile creates Authority Lock and emits `execution_model_checkpoint.required: true`. Before product implementation, the Agent stops once and asks the user to `continue_current_model` or switch models and resume the active Long-Task. A task-specific model strategy already stated explicitly satisfies the checkpoint.

This pause exists because locked Source/Contract/Context/risk/acceptance plus targeted repair and Final Gate materially reduce the risk of choosing a lower-cost execution model. It is an execution-cost mechanism, not proof. Harness does not switch the model, persist acknowledgement/model-routing state or repeat the checkpoint after later revisions; those Compile results return `required: false`.

After the one-time choice, the current Goal continues through implementation, targeted repair and Final Gate. Small implementation-level plans, reordered steps and repair hypotheses are ordinary internal execution state; they do not become a second plan or authority.

## Protected Implementation Freedom Boundary

`F = Implementation Freedom Boundary` protects the minimum sufficient mechanism from silently growing into a prescribed development process. The no-drift theorem is accepted-terminal-state safety, not path safety or guaranteed termination, so fixed implementation order, phase/method permission Gates, mandatory per-edit verification cadence and Harness-owned agent allocation are not theorem premises or necessary acceptance mechanisms.

Source/Contract scope, architecture, security, forbidden shortcuts, irreversible effects and external-action boundaries still constrain the path. Inside them, the current Goal chooses implementation order, methods, local feedback cadence and whether one or multiple platform-native agents/subagents or user-authorized Git parallelism provide positive implementation ROI. The Harness never owns, persists, allocates, retries or recovers that dispatch and creates no Worker queue, Wave, process tree, branch/worktree fan-out or delegation graph. Agent reports are not Progress or proof. All changes must converge into the selected verification workspace; only Contract-declared Checks on that snapshot can contribute to acceptance.

The same boundary applies to implementation order. Stage/Outcome dependencies and the Rolling Frontier project acceptance and intermediate-proof readiness; they do not authorize or prohibit edits. The Goal may cross those boundaries whenever current code reality makes that cheaper, while an unpassed earlier gate still blocks terminal acceptance.

A proposed mandatory development-stage constraint must identify an independently uncovered safety, irreversible-effect, false-completion or total-cost path, explain why the existing Final Gate or a lighter project-owned check cannot cover it, preserve Goal ownership and the no-delegation-proof/state boundary, pass coverage/False-Negative non-degradation and receive an explicit project-owner design-purpose decision with positive net ROI. Otherwise it remains optional Goal behavior or stays outside the workflow.

## Context Evolution During Implementation

`Context Delta` remains live after Authority Lock. When implementation or repair discovers a durable fact, the current Goal updates the owning Context instead of preserving a known stale fact until the end.

Referenced snapshots distinguish:

- **Controlling Context**: core Context, every explicit `context_ref`, verification and deployment Context, and other selected files whose meaning can change ownership, architecture, contract, risk, recovery or repeatable verification. A change requires Authority Revision and may require exact user approval.
- **Supporting Context**: graph-derived, non-explicit `implementation-index` and `archive` files. Their content may auto-revise through `ty-context long-task compile <workdir> --revise` without user approval and without invalidating otherwise fresh targeted Progress.

Full snapshot mode treats every Context file as controlling. Explicitly referencing an otherwise supporting file also makes it controlling. Final Gate always recompiles and records the complete current Context snapshot.

## Authority Projection Without Retrieval Friction

`context.toml` serves both future Context discovery and active Long-Task authority. Retrieval guidance—`triggers`, `read_when`, `read_policy`, default selection and unselected nodes—does not alter the meaning of Context already selected for one delivery, so it is excluded from that delivery's authority projection. Selected area ownership, role/dependency structure and selected Context contents remain protected and fail closed.

This removes unnecessary Authority Revision and scoped-Progress invalidation without adding a registry, index or state file. It does not reuse final acceptance: any changed Git tree still requires the current-snapshot Live Final Gate.

Preflight follows the same cost rule. Repair metadata is emitted only for duplicate/coverage pairs with a deterministic same-Claim dependency. Independent diagnostics keep their existing compact form, and no finding is hidden or treated as resolved.

## Rolling Target-Runtime Feedback

When a declared result can pass on a proxy surface while failing in its target runtime, delaying the first target execution until Final Gate creates avoidable rework. Replaying a tracked status report in Final Gate is worse: it reruns the reader, not the target, and can falsely accept a stale self-report on an otherwise current snapshot.

Use the existing Contract and Progress model plus one bounded target profile instead of adding open-ended platform flags or another state machine:

- declare the exact non-empty required product target refs, bounded runtime family and root entrypoint;
- put the live target Check in the earliest Outcome that owns the runnable proof boundary, independent of implementation order;
- make its current Raw Execution exercise the target and derive structured Observations from that same session;
- declare runtime-affecting `input_paths`, Binding carriers, verification inputs and environment requirements so relevant changes stale Progress;
- treat the first useful runnable slice and later coalesced relevant changes as recommended targeted-feedback points only when early localization is worth the run cost;
- coalesce edits, choose the cheapest reliable Check and reuse identical Raw Execution where valid; and
- refresh targeted Progress only before an intermediate decision actually relies on it, and let the one Final Gate ignore Progress and rerun the complete live Check set for acceptance.

Historical reports, screenshots, binaries and logs remain review material. Build, install, process start and absence of fatal logs prove only those exact Claims; broader runnable behavior needs a stable product-owned sentinel or declared interaction. Capability-specific probes are required only when their Claims are in scope.

Every vertical Outcome belongs to one Stage. Stage readiness reuses Outcome dependencies and Progress; the gate proves every required target from its root, and only a multi-Outcome Stage pays the additional cross-surface-consistency proof. A separate read-only Product Conformance Check is required only when weak observability combines with multiple Stages or multiple required product runtime families. Single-Stage/single-family work pays no extra conformance run.

This policy adds bounded authoring cost and only Goal-chosen feedback runtime cost; it adds no open-ended `platform_impact` taxonomy, implementation gate, scheduler, persistent trigger queue, per-platform Progress or mandatory rebuild per Outcome/edit. Early runs can reduce rework but close no independent completion path, so cadence stays advisory. Live Check ownership and Final Gate close proxy, stale self-report, degraded-success, fixed-input, self-attested-boundary and cross-surface drift paths. Terminal target and Stage projections are derived only at Final Gate; they are not another state machine.

## Capability-Adequate Evidence

Checks declare keyed Given/When scenarios, a journey role, an execution target and all-of Evidence Capabilities per Assertion. Static `presence` proves only existence. Every behavioral capability requires exactly one typed current-execution record bound to the Assertion; missing, duplicate, unknown and undeclared records fail closed. Success and degradation use separate Checks, Result proof comes only from success, boundary effects use an observer target, and input variation requires distinct inputs, outputs and a failure case.

These fields concentrate verifier review at Authoring/Preflight instead of adding repeated runtime ceremony. V2 structured results remain readable for compatibility but cannot satisfy behavioral capabilities. Capability additions are monotonic evidence strengthening; removal or semantic weakening is protected Authority Revision.

## Test-Cost Layers

Use short feedback loops during development, then widen before release:

```text
npm run test:affected:list
npm run test:affected
npm run test:long-task:focused
npm run test:delivery-contract:focused
npm run test:long-task:trust
```

The affected selector maps known hot spots to focused regression tests, widens unmapped Long-Task runtime changes to the Trust Boundary Gate, and widens shared fixtures, package/dependency or unknown changes to complete suites. Dirty local discovery uses only current working-tree paths; clean local discovery uses `HEAD^`; explicit and CI bases are exact. It builds at most once per invocation when a build is required.

The Trust Boundary Gate is the middle-cost frozen-candidate check for independent high-impact authority, freshness, forged-evidence, Final Gate/Stop/close, Hook/profile and platform-boundary regressions. Pull requests run the complete default suite plus this gate. `main`, publish and release retain the complete package suite.

Affected, focused and Trust results are package feedback only. They do not replace the complete release suite, source parity, smoke, pack, release checks or the Long-Task Final Gate. Do not run the complete suite after each small repair: batch aggregate failures and rerun failed/affected coverage first. A tracked verification-input change, plausible cross-suite contamination or a locally owned final validation claim then requires one clean aggregate rerun. A proven environment-only local failure with unchanged tracked inputs may instead defer that clean complete pass to a guaranteed downstream `main`/release gate, but the failed local aggregate remains failed and partial reruns cannot be reported as a complete pass.
