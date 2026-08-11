# Area Context: delivery-benchmark

## Responsibility

- Provide repo-local scenarios, runner tools and static reports that evaluate whether Harness improves same-quality lifecycle delivery efficiency.
- Provide a separate mechanism-experiment layer for fixed Context routing, Workflow wording and Long-Task Authoring A/B decisions without turning experiment metadata into product authority.
- Provide a frozen workflow-assurance experiment that compares the previous exact-ephemeral default guidance with the new assurance-split default guidance while leaving Long-Task internals untouched.
- Provide an optional UI/UX recovery/conformance task that measures whether a fresh Agent reaches the owning Screen/visual authority, opens the selected immutable target and preserves its declared facts without adding default workflow state.
- Provide two independent admission tracks for DRA semantic replay/recovery/writeback and Build / Reuse / Buy judgment. Their category results and ROI are never merged into one score.
- Provide the independent eight-Fact Long-Task real-process workload which measures current-candidate lifecycle cost and safety behavior without becoming a safety Fact, mechanism Authority or Level-4 promotion result.

## User / System Contract

- Benchmark runner prepares fixed baseline and Harness run directories.
- Observer, timer, hidden quality probes, recovery scoring, intervention records and gate findings are measurement tools, not product quality shortcuts.
- Public conclusions should use high-confidence metrics for core claims and keep medium/low-confidence metrics as diagnostics.
- Workflow overhead ratio, artifact inventory / artifact count, gate true-product defect count versus hygiene issue count and AC progress visibility are diagnostic fields only; they explain process cost and evidence visibility but do not create new benchmark conclusions.
- New Harness benchmark prompts should use Minimal Context, not the old stage workflow.
- Mechanism experiments fix task, fixture, model, reasoning, pair identity and gold before Agent execution. Aggregation counts only distinct `pair_id` plus `replicate` runs with the same fixed identity. Context/Workflow read-cost conclusions require a normalized host trace; Authoring hard gates require fixed Source keys/kinds and cost comparisons remain unavailable until canonical compiled Authority is equal.
- The workflow-assurance experiment additionally freezes before execution: hidden product quality, Context Delta correctness, native verification, selected-source recall when applicable, target/workspace correctness, whether unresolved or unverified scope is reported honestly, false-complete detection and instruction/tool/token/wall-time diagnostics. A passing static fixture never substitutes for fresh Agent evidence.
- Each workflow-assurance variant binds the complete canonical managed `AGENTS_CORE.md` from its own frozen Git commit by blob oid, full-file SHA-256 and exact measured-section SHA-256. Prepare loads the Git object without shell or working-tree fallback, injects the whole managed protocol, records resolved provenance in run metadata and fails closed on a missing object, invalid UTF-8, marker/heading drift or digest mismatch. These benchmark snapshots are experiment inputs, not product Workflow Authority.
- Static tests may validate the UI/UX benchmark fixture, hidden oracle and routing gold, but only fresh independent paired Agent runs may support a recovery or ROI conclusion; no Workflow Assurance paired Agent A/B has yet been executed for the assurance-split candidate.
- Before either new track runs a candidate, freeze cases/hidden probes, allowed solution sets, prohibited failure modes, metrics/thresholds, requested model/reasoning, Provider or fixture identity, environment, trace identity and pairing method. Identity is the conjunction of one global execution-envelope digest and one track-local frozen-config digest: model/Provider/environment/envelope drift invalidates both tracks, while DRA or Build/Reuse/Buy cases/guidance/hidden/scoring drift invalidates only its owning track. Pair, aggregate, deterministic and attestation records carry both identities and never reuse a result whose owning identity differs. The runner separately records effective model/reasoning/Provider only when authoritative execution output exposes them; an unobservable or mismatched value is `unverified`, sets environment/trace doubt and cannot be silently copied from requested configuration. Count at least three independent pairs and require `2/3` pairwise wins; environment/trace doubt is an expansion trigger rather than a fabricated deterministic observation, so five pairs and `3/5` wins are required alongside an explicit provenance qualification.
- Each track rejects any critical-category regression, requires at least 25% fewer targeted critical-plus-major defects, zero must-allow false blocking and no other false-blocking regression. The DRA simple path additionally budgets zero checkpoint/write/pause/provider/handoff side effects and at most 10% fresh-Agent median token/wall overhead. Because five alternating AB/BA pairs necessarily leave a 3/2 order imbalance, the controlling median is position-stratified: compare baseline and candidate medians within each invocation position, then take the median of the two overheads; retain raw pair ratios for diagnosis and fail if either variant is absent from either position.
- The real-process workload keeps safety, observed lifecycle measurement and governance admission separate. Each materialized fixture records exact raw HEAD/tree/status commands before and after its lifecycle; verification binds the claimed clean commit/tree to those records and requires it to remain unchanged. Its machine report may expose recomputable `observed_lifecycle_*` validity, paired-win, margin, variance, correct-path, phase, resource and false-completion/false-blocking facts. Those fields have no admission semantics and may not use `qualified_positive_*`. Complete total-cost support additionally requires independently attributable and verified authoring, Runtime, State, Recovery, maintenance, test, process, introduction, adoption and migration costs. The current v2 implementation has no independent formal-cost evidence ingestion and does not admit self-attested `verified` rows; any missing, unverified or unadmitted required cost makes `total_roi_supported=false` and forbids `total_roi_positive=true`. Its audit-only closure-copy probe still performs the complete physical copy and records exact bytes/copy time, but retains no copied payload in the run artifact: the probe owner exclusively creates and removes that directory, cleanup failure blocks collection, and copy plus cleanup are excluded as measurement overhead. The retained-evidence manifest's per-file capacity fuse remains fail closed and is never relaxed for a runtime executable.
- A real-process report-format change increments its schema version, or retains an explicit tested v1 compatibility reader whose projection cannot manufacture newly required cost evidence. The machine layer reports measurements and missing-cost categories; an independent audit owns the bounded governance judgment. Neither layer may replace the other.

## Core Data / API / State

- Runner: `examples/delivery-benchmark/runner/delivery_benchmark.mjs`.
- Scenarios: `examples/delivery-benchmark/scenarios/**`.
- Prompts: `examples/delivery-benchmark/prompts/baseline.md` and `examples/delivery-benchmark/prompts/harness.md`.
- Report data and UI: `examples/delivery-benchmark/results/benchmark-data.js` and `index.html`.
- Operator docs: `examples/delivery-benchmark/README.md` and `RUNBOOK.md`.
- Mechanism experiments: `examples/delivery-benchmark/mechanism/**`.
- Mechanism runner: `examples/delivery-benchmark/mechanism/runner/mechanism_benchmark.mjs`.

## Key Constraints

- Do not publish calibration pilots as formal efficiency results.
- Do not leak recovery/RFC/debug probe answers into initial prompts.
- Historical stage-based numbers are removed from public report data after Minimal Context becomes the default.
- Benchmark projects should be high-signal but not hacked: they may target Harness design goals, but must keep the same quality bar and independent fresh runs.
- Do not publish workflow diagnostic fields as formal efficiency results unless the paired run also satisfies the same-quality, fresh-run and observer-evidence rules.
- Do not treat resolver candidates, Agent self-report, YAML reduction or one paired run as mechanism ROI proof.
- Do not interpret the assurance-split candidate as admitted merely because its instruction bytes are smaller. Quality, target ownership, fresh verification and false-complete performance must not regress; near-threshold, conflicting or high-variance evidence requires five eligible pairs.
- Every deterministic DRA/Build-Reuse-Buy hard fixture must pass. No-loss/no-distortion/no-unsupported-gain, Source-owned authority-scope projection with exact explicit targets and independent delegated non-visual meaning, active-target uniqueness, rejected/unresolved/superseded isolation, checkpoint-frozen final owners, Proposal-only one-Delta/one-target/one-scalar conservation, replace scaffold equality and scalar-control safety, package-canonical target carrier add/remove, original-preimage span equality/disjointness and prior-output non-consumption, globally unique per-key resource bindings, catalog-exact condition/unchanged/basis/blast closure, structured durable selected-Source ownership, resource-only read-only reconciliation, stale Base/checkpoint/writeback CAS, corrupt-version/path-link-collision failure, idempotence and balanced/blocked/external-pending reconciliation are DRA gates; legal zero-write resource ownership, same-scaffold replacement, canonical add/remove, disjoint operations, mixed owners, shared Tokens, reasonable self-implementation and reasonable non-abstraction are must-allow gates. A zero-defect baseline permits only independently demonstrated hardening with near-zero fixed cost, never invented improvement.
- A mechanism which closes no independent path, misses quality, increases false blocking, breaks the simple path or has non-positive total ROI is narrowed, made conditional, moved to a lighter owner or removed before delivery.
- High-ROI/high-efficiency admission requires a significant, stable margin rather than a barely positive result, but does not require exhaustive comparison or a global/local optimum. After purpose validity, relative non-degradation, must-allow, structural-cost and applicable total-cost thresholds close, further construction stops unless a new real counterexample, repeated material cost hot spot or evidence of significant additional net benefit appears.
- Raw mechanism runs, gold, hidden probes and score files remain benchmark evidence under `.artifacts/**`; they are not Context, Contract Authority, Progress or completion proof. A separately generated admission-attestation manifest contains only frozen global/track identities and artifact digests, requested-versus-observed provenance status, bounded per-pair/aggregate metrics and the exact candidate Git tree. It excludes prompts, model output, raw events/stderr and sensitive payloads and proves only the named admission run. Before CI transport, the complete local records and attested source-artifact digests are validated, then pair/aggregate records are projected to compact summaries retaining exact candidate/config identities, trace identities, score/threshold outcomes, provenance qualification and simple-path aggregates without finding-level diagnostics. Before upload, the CI checkout selects pinned Node 24, fails closed against the package engine before `npm ci`, independently builds and runs the current-tree deterministic DRA suite, checks package-source parity and recomputes the deterministic report; the uploaded deterministic digest must match that current run rather than trusting the local report. The report and attestation bind two different facts: the frozen Fresh-Agent track environment/provenance and the currently observed deterministic process platform, architecture, full Node version, runner class and engine conformance. The latter cannot be populated from the former, and an unsupported runtime or candidate tree mismatch makes `deterministic_runtime_passed = false` even if all invoked checks exit zero. The transport reports its input payload digest, canonical materialized JSON-set digest and uploaded artifact digest as distinct identities, and separates deterministic runtime passed, Fresh-Agent evidence internally valid and Fresh-Agent provenance qualified. A durable CI artifact publishes only those deterministic and sanitized summary/attestation records with explicit retention; it never promotes benchmark evidence into Source, Authority, Receipt, Gate or delivery acceptance.

## Code Entry Points

- `examples/delivery-benchmark/runner/delivery_benchmark.mjs`
- `examples/delivery-benchmark/scenarios/*/quality_probe.mjs`
- `examples/delivery-benchmark/results/index.html`
- `examples/delivery-benchmark/mechanism/runner/*.mjs`
- `.github/workflows/admission-evidence.yml`
- `examples/delivery-benchmark/mechanism/tasks/*.json`
- `examples/delivery-benchmark/mechanism/gold/*.json`
- `examples/delivery-benchmark/mechanism/hidden/*.mjs`
- `examples/delivery-benchmark/real-process-workload/**`
- `tools/long_task_real_process_roi_{policy,runner,scoring}.mjs`
- `tools/verify_long_task_real_process_roi.mjs`

## Test Entry Points

- `node --test tests/ty-context/delivery-benchmark.test.mjs`
- `node --test tests/ty-context/delivery-mechanism-benchmark.test.mjs`
- `node --test tests/ty-context/delivery-mechanism-authoring-benchmark.test.mjs`
- `node --test tests/ty-context/fresh-agent-admission-benchmark.test.mjs`
- `node --check examples/delivery-benchmark/runner/delivery_benchmark.mjs`
- `node --check examples/delivery-benchmark/mechanism/runner/mechanism_benchmark.mjs`
- `node --check examples/delivery-benchmark/results/benchmark-data.js`
- `node --test tests/ty-context/long-task-real-process-roi.test.mjs`

## Open Risks

- Current public benchmark data is intentionally empty after reset.
- Future pilot design must measure whether Minimal Context reduces recovery cost without hiding Harness overhead.
- Real Codex A/B still requires separate repository roots and fixed host/model settings; repository unit tests can validate benchmark machinery but cannot substitute for those Agent runs.
