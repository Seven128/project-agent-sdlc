# Test And Benchmark Governance

Use this reference for tests, verification cost, source parity, consumer/release smoke or delivery benchmarks.

## Test ownership and reruns

Follow owning verification Context and `docs/test-suite-roi-redesign.md` (`TS-RERUN`). Start with the failing test and affected/focused set; local green fragments cannot be concatenated into a full-gate claim.

After a failure, skipping another local full suite is allowed only when all of these hold: tracked verification inputs did not change, the failure is proven environment-only, the failed item plus affected/Trust checks now pass, and a still-required downstream `main`/release full gate will produce the authoritative green result. Otherwise obtain one fresh complete pass after the final relevant change.

Tests must prove real behavior through the owner rather than assert prose alone. Every high-level critical sentinel needs an independently grounded correct candidate and a directly violating candidate, real semantic mutation, expected owner/Claim/Fact/Assertion localization and must-allow controls; its rationale must not claim more. Freeze a critical incident before repair and prove old acceptance/current rejection. Update exact routing/negative triggers, managed/install/package parity, safe collision/symlink/failure/resource behavior, idempotence, Windows/macOS path semantics and public/tarball lifecycle when those surfaces change. Never weaken a selector or assertion merely to accept the new implementation.

Observer-TCB regressions use fixed end-to-end test identities for custom-Oracle expected-as-actual, runner-created static carrier, historical runtime replay, Browser-to-Native proxy, synthetic status carrier, indirect verifier wrapper, runner-modified frozen carrier and claim-bearing Counterfactual with no admitted observation. Each R1–R8 wrong candidate and its static, direct-process or External-Confirmation control must traverse Contract Parse/Compile, current Git snapshot, a real runner, v3 decode, package admission/extraction, Counterfactual and the sole Final Gate. The security assertion is the black-box terminal pair—wrong candidate is not `machine_accepted`, correct machine control is `machine_accepted`, and unsupported control is `machine_accepted_external_pending`—rather than an internal policy return string.

Reuse `CRITICAL_TEST_SENTINELS`; never add an Observer-specific registry. Its reviewed entries `observer-admission-no-bypass`, `static-carrier-pre-run-freeze`, `host-derived-target-runtime` and `counterfactual-production-observation-impact` each bind the fixed positive/negative controls, real runtime owner/path, exact supported scope and explicit non-proven scope. Existing deletion, equal-count substitution, duplicate, relocation, unexpected-ID and non-passing aggregate defenses remain mandatory. Node machine reports consumed by a capability-delivery verifier must preserve fixed test ID, pass/fail/skip counts and every candidate's actual Final-Gate workflow status. A command exit code or source-token/string probe may prove test execution or documentation consistency only; neither may be converted into a runtime-capability actual.

`validate-context` proves Context recoverability and rejects false test-pass claims; it does not prove product behavior. `validate-harness`, source check, type/build checks and focused/runtime suites retain their distinct scopes.

## Benchmark governance

Delivery Benchmark currently supplies only its maintained skeleton and scenarios. Historical stage-era output is not evidence for Minimal Context. Publish a new efficiency/quality conclusion only from a fresh baseline-versus-current comparison with high-confidence timing, quality and environment evidence. State workload, comparator, tolerance and uncertainty; do not turn one anecdotal run or static structure into a performance claim.

Keep proof roles separate. Deterministic attack/control suites establish known-path rejection and false-blocking behavior; black-box Final Gate establishes current lifecycle behavior; a controlled real or sanitized-real replay establishes realistic project shape; fresh-Agent pairs establish guidance adoption, localization, rework and total ROI only. Agent experiments, including a 2/3 or 3/5 win, never prove zero critical false acceptance or an arbitrary observer theorem. Restoring the highest capability wording requires the declared critical controls, explicit TCB, black-box Gate, required real replay, no open critical counterexample and positive ROI.

For the admitted-observation/runtime-TCB revision, keep capability wording at Level 3—protected against the declared known counterexamples—until an independent capability audit closes with no open critical counterexample and at least one real Long-Task process workload supplies a qualified positive baseline/candidate ROI comparison. The prior fresh-Agent summary lacks independently reconstructable raw traces/provider identity and the sanitized Starward fixture lacks original-incident design/runtime evidence, so neither may establish safety, real-incident representativeness or the required real-workload ROI. ROI remains an independent report and never contributes to a safety Fact verdict.

Keep DRA semantic replay/recovery/writeback and Build/Reuse/Buy judgment in independent frozen tracks. Before candidate execution freeze cases/hidden probes, allowed solution sets, prohibited failure modes, metrics/thresholds, model/reasoning, Provider or fixture identity, environment, trace identity and pair method. Start with three independent eligible pairs and require `2/3` wins; expand to five and require `3/5` for coefficient of variation over 20%, inconsistent direction, a primary metric within five percentage points of threshold, or environment/Provider nondeterminism. Per track reject any critical-category regression, require at least 25% fewer targeted critical-plus-major defects, zero must-allow false blocking and no other false-blocking regression. DRA simple preview additionally has zero persisted/action side effects and at most 10% median token/wall overhead. If a mechanism closes no independent path or fails quality/cost admission, narrow, reuse a lighter owner or remove it rather than deferring a false completion claim.

## Current-candidate completion checklist

- Minimal Context remains the default durable source; no stage document chain reappeared.
- AGENTS placement, public English completeness, Context Priority Ladder and role/Skill ownership remain correct.
- Source implementation, managed source, package assets, installed copies, docs, Context, tests, consumer/release paths and migrations agree for every changed public semantic.
- Source sync/check and workspace sync are current and idempotent where applicable.
- Long-Task changes passed mechanism non-degradation, Anti-Degradation and `F` checks without new authority/state/scheduler.
- Architecture/quality changes preserve one pre-edit Deliberation, mutually exclusive default/Long-Task conformance carrier, current-snapshot freshness and separate Context drift.
- Paths/scripts/tests cover Windows and macOS assumptions.
- Focused/affected checks and the required fresh complete gate pass on the final candidate.
- Final diff contains only task-attributable changes; Context reports exactly updated or no durable fact change.
