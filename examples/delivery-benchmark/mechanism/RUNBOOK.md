# Mechanism Benchmark Operator Runbook

## 1. Formal-run prerequisites

- Use Node `>=24`, matching the package engine.
- Use two clean source checkouts when comparing package implementations: current baseline checkout and candidate checkout.
- Build each checkout before preparation.
- Fix the exact Codex model, reasoning level, host version, operating system, and task prompt.
- Use fresh independent run directories and fresh Agent sessions.
- Never expose `gold/**`, `hidden/**`, another run, or prior chat history to the measured Agent.
- Do not use `--skip-harness-init` for a formal pair; comparisons reject calibration metadata even when hidden quality passes.
- Do not publish numbers until at least three eligible paired runs support the same result.
- For Workflow Assurance, freeze the pair policy before execution: three eligible pairs normally, five when a declared cost metric is near threshold or has the declared high-variance range.
- Before Workflow Assurance preparation, ensure both declared guidance commits are available in the source repository. The runner reads each commit's canonical managed `AGENTS_CORE.md` Git object, verifies its blob/full-file/measured-section identities and fails closed rather than falling back when a shallow checkout lacks the object.
- For Long-Task delegation, ensure baseline commit `b83a9ee3836ff8fc8b7d4db9d29de2546df2a314` is available. Preparation verifies all four baseline Git blobs plus the tracked candidate bundle, exact task/gold/hidden-probe bytes and their aggregate digest, then injects only the isolated run. Do not edit canonical managed/package/public surfaces to simulate promotion.

For the separate DRA and Build / Reuse / Buy admission tracks, run `admission_benchmark.mjs freeze-check` before the first candidate invocation. It must report zero freeze failures plus one global execution-envelope digest and one digest per track. Then run its deterministic command set once on the exact current candidate and retain the resulting report. The admission runner itself launches each baseline/candidate session independently with the exact frozen requested model/reasoning/Provider/environment and alternates order by replicate; do not paste extra guidance or reuse a session. It records effective model, reasoning effort and Provider only when authoritative Codex execution events expose them. Any missing or mismatched effective field is `unverified`/doubt, expands the unchanged run to five pairs and remains an explicit aggregate qualification; the requested configuration is never copied into the effective observation. Cases and policy guidance enter the prompt, but `hidden/*.json`, another result and aggregate state do not.

Model, reasoning, Provider, environment, pairing or shared runner changes alter the global envelope and invalidate both tracks. A DRA case/guidance/hidden/schema/threshold or DRA scoring change alters only the DRA track identity; the equivalent Build / Reuse / Buy change alters only that track. Reuse an older aggregate only when both its global envelope and exact owning track digest match. The attestation labels such reuse and still binds a newly run deterministic report to the current clean `main` commit/tree. A v2 aggregate has no v3 track-local identity and is not reusable by inference.

Admission artifacts remain under `.artifacts/mechanism-admission/**`. The runner creates new collision-free directories and owns only its OS temporary execution directory; it never cleans other artifacts. Keep all pair traces until aggregate review, then remove them only through explicit artifact-retention governance. These traces are benchmark diagnostics, not Source, Contract, Evidence, Receipt, Gate or completion state.

After both identity-compatible aggregates exist and the candidate is a clean `main` commit, run `attest` with the current deterministic report and both aggregate reports. The resulting manifest binds their global/track digests, bounded metrics, provenance qualification, trace-identity set, evidence applicability and exact current `main` commit/tree. It intentionally excludes prompts, model output, raw events/stderr and sensitive Source content; it is an admission artifact, not product or workflow acceptance.

Then run `sanitize-evidence` with the deterministic report, every included pair report, both aggregates and the attestation. It validates the complete local records, then materializes only the deterministic report, digest-bound pair/aggregate summary projections, attestation and manifest JSON plus a size-bounded gzip/base64 workflow input. The projections retain exact candidate/config identities, source-artifact digests, trace identities, score summaries, thresholds, provenance qualification and simple-path aggregates without duplicating finding-level diagnostics. Inspect the local bundle, push the exact attested `main` commit, and dispatch `.github/workflows/admission-evidence.yml` on that exact `main` ref using the payload. The workflow rejects a different commit/tree, broken source-artifact bindings or raw forbidden fields and uploads only JSON with `retention-days: 30`; never upload invocation `result.json`, prompts, findings/model answers, `events.jsonl`, stderr or sensitive Source.

Context/Workflow prompt-only variants may be prepared from one baseline checkout. Long-Task candidate variants must be prepared from the checkout that actually implements the candidate parser/compiler behavior; the runner never emulates unsupported Contract syntax.

The repository currently contains the frozen Workflow Assurance protocol and scoring rules, not a completed fresh paired Agent A/B result. Do not describe guidance provenance or a successful prepare as evidence of lower cost or positive ROI.

## 2. Prepare a randomized pair

Choose the order before opening Codex. Alternating baseline/candidate by replicate is acceptable; copying content between paths is not.

Use identical:

```text
pair_id
replicate
model
reasoning
provider
fixture_sha256
experiment_set_sha256
baseline_commit
```

The comparison command rejects a pair when any fixed identity differs.
Aggregation also rejects mixed fixed identities and duplicate `pair_id` plus `replicate` inputs.

The baseline and candidate intentionally have different `workflow_guidance_source.commit` values. Each prepared run must exactly match its own variant declaration; pair compatibility does not require those two guidance commits to be equal. Inspect `.benchmark/mechanism-run.json` for the prepare-derived kind, commit, path, blob oid, full-file SHA-256 and measured-section SHA-256. Formal preparation preserves marker-external fixture overlay and replaces the complete managed protocol; missing, duplicated or damaged markers fail closed.

When preparation runs inside the source repository, use only `.artifacts/mechanism/runs/<run-name>`. The runner writes an exact ownership marker on first creation. `--force` may rebuild only that same no-link marked directory; it refuses repository/mechanism roots and ancestors, protected system/home/current paths, legacy or unmarked directories and links before recursive removal. Inspect legacy output manually and choose a new empty path rather than treating `--force` as general cleanup.

## 3. Start external observation

The existing delivery benchmark observer can measure a mechanism run without putting measurement instructions in the Agent prompt:

```sh
node examples/delivery-benchmark/runner/delivery_benchmark.mjs observe-start \
  --run-dir <prepared-run-dir>
```

Start it immediately before sending `.benchmark/prompt.md` to Codex. Stop it immediately after the Agent returns and has written `.benchmark/agent-result.json`:

```sh
node examples/delivery-benchmark/runner/delivery_benchmark.mjs observe-stop \
  --run-dir <prepared-run-dir>
```

Do not ask the measured Agent to start/stop the observer, score itself, inspect hidden probes, or record a favorable result.

## 4. Codex execution protocol

For each run:

1. Open only the prepared run directory as the Codex repository root.
2. Start a new conversation with the fixed model and reasoning level.
3. Paste the content of `.benchmark/prompt.md` without extra hints.
4. Do not answer implementation questions differently between variants. Record any unavoidable intervention separately and invalidate the formal pair when it changes task meaning.
5. Let the Agent use repository `AGENTS.md`, Skills, and `project_context/**` normally.
6. Use `node tools/ty-context.mjs` for package CLI commands when present; it pins the run to the preparing checkout.
7. Require one clean product/Context commit for Context/Workflow tasks.
8. For Authoring tasks, stop after ready Preflight and first formal Compile; product implementation and Final Gate are out of scope.
9. For the delegation task, execute the complete active Long-Task lifecycle. End the first Compile turn at the required checkpoint, provide only the exact resume reply in the later host turn, and let the parent own Source/Contract/Context/integration/current checks/Final Gate. A detached spawn, one-turn checkpoint bypass or worker completion claim invalidates the run.

The Agent writes `.benchmark/agent-result.json`. Its Context-read and Conformance fields remain diagnostic unless confirmed by a host trace. `tools/ty-context.mjs` independently records actual Preflight/Compile invocations under `.benchmark/ty-context-events.ndjson`; scoring prefers those records over Agent-copied JSON.

## 5. Normalized host trace

For a conclusion-grade Context/Workflow pair, transform host tool events into this minimal JSON shape:

```json
{
  "schema_version": "tiny-context-host-trace-v1",
  "source": "host_tool_trace",
  "context_files_read": [
    "project_context/global.md",
    "project_context/architecture.md"
  ],
  "context_read_rounds": 2,
  "source_files_read": [
    "DESIGN.md",
    "design/handoffs/invoice-board.md",
    "design/invoice-board.html"
  ],
  "total_tool_calls": 18,
  "pre_implementation_tool_calls": 7,
  "formal_enumeration_tool_calls": 2,
  "total_tokens": 18420
}
```

Count a Context or Source file only when the Agent actually opened/read it. A search result that merely listed a filename is not an actual read. Group consecutive Context reads caused by one routing decision into one read round; document the normalization rule consistently across both paths. Include every gold-required `source_files_read` entry for the UI/UX recovery task; it remains optional elsewhere.

For Workflow Assurance, count every host-recorded tool call once. `pre_implementation_tool_calls` ends immediately before the first edit that can affect the requested product behavior or owning durable Context. `formal_enumeration_tool_calls` counts calls whose principal purpose is building or maintaining the default route's Fact/condition/Obligation/result ledger; ordinary source reading, architecture reasoning and project verification do not count. `total_tokens` is optional and may be populated only from the same host's measured usage record. Use the same normalization rule for both variants and retain the underlying host trace for audit.

Without this trace, the pair may still validate hidden quality, Git Context correctness, and deterministic resolver candidate recall, but it is calibration-only for actual read cost.

### Delegation host trace

The delegation track does not reuse `tiny-context-host-trace-v1` or the self-hosting cost trace. Its `tiny-context-long-task-delegation-host-trace-v1` record binds the prepared run/guidance/profile/Hook digests, pre-spawn and final candidate, exact packet owners/paths, observed host capacity, guard probe, parent and worker actors, effective agent/model/reasoning/tier, actor-scoped mutations, ordered lifecycle and parent/child cost. Starting capacity must be observed before a host-owned `delegation_decision_at_ms`, and that decision must precede every worker start; the same pre-decision anchor is required for a zero-worker capacity fallback. The candidate must use at least two distinct exact workers when the frozen task and observed capacity satisfy the predicate. Parent mutation of worker packet paths, generic or mismatched execution, requested tier override, overlap/unmapped paths, stale Final Gate or missing current-candidate closure makes the pair ineligible.

The JSON file is raw observed material, not proof of its own provenance. A future host integration would need to attest its digest and Hook-guard, effective-execution, capacity, actor-mutation, lifecycle and cost capabilities through a separate trusted channel. It must also own the exact set of every started/failed attempt, bind immutable prepare/run-input/initial-candidate identity before execution and let comparison be recomputed from raw score/trace identities. No such integration, attempt-set owner or immutable prepare receipt is wired today: the file-only CLI cannot manufacture them, ignored `.benchmark` metadata remains operator-editable, and an arbitrary caller-supplied object shaped like `host_owned_delegation_trace_v1` remains untrusted. `score` therefore returns `host_provenance_unverified` for every current repository-supplied trace/envelope pair. Worker path reports, requested profile values and a `source: host_tool_trace` string never fill the gap. Observable parent tier and starting capacity are pair-environment identities; if child inheritance is not observable, retain `service_tier_inheritance_unverified` and expand to five rather than claiming equality. An observed mismatch is an integration failure.

## 6. Score and compare

`score` runs the hidden task probe and project-native checks itself, reads Git changes, reads the Agent result, and derives Authority/YAML metrics when applicable.

Do not edit a score JSON by hand. Re-run scoring from the unchanged run directory.

A Context/Workflow hard gate requires:

- hidden product probe passes;
- operator-run native verification passes;
- Git Context update matches the fixed expected Delta;
- Agent reports the correct Delta;
- changed paths remain within the fixed task owner/supporting allow-list;
- the selected workflow route matches the fixed assurance requirement;
- a `complete` handoff requires non-empty implemented and verified scope, no unverified/blocked scope and a complete machine-observed task outcome; qualified/blocked handoffs must expose their gaps;
- when gold declares `required_source_reads`, every required selected source is recalled; a conclusion-eligible pair must prove that recall through the normalized host trace.

A Workflow Assurance pair also requires host-derived tool-call counts and observer elapsed time on both paths. These cost measurements are considered only after both variants pass all quality, Context, route, scope and completion-honesty gates.

A Long-Task Authoring hard gate requires:

- last recorded Preflight is `ready`;
- formal Compile created a compiled Contract;
- fixed Source keys and kinds, Risk tuples, proof surfaces, and external confirmations are present;
- paired canonical Authority fingerprints are equal.

Only after those gates may cost metrics be compared; unequal fingerprints leave every Authoring cost field unavailable.

A Long-Task delegation pair additionally requires the same hidden quality, Context, scope and honest-handoff gates plus a host-attested complete active lifecycle, exact effective Luna/Max workers, closed disjoint actor attribution, accepted current Final Gate and complete parent/child cost fields. The gold fixture separately owns critical, major and must-allow checks; Final Gate acceptance is not substituted for those results. Three independent eligible pairs are the initial minimum. Coefficient of variation above 20%, inconsistent direction, a primary result within five percentage points of its threshold, or host/provider/provenance instability expands the frozen requirement to five. Any independently observed formal quality, policy or Gate failure must remain in the host-owned attempt set and block admission even when that run is not otherwise eligible, so it cannot be discarded and replaced by a rerun. In the current repository, aggregation revalidates variant/track/policy/source identities but treats every derived comparison JSON as unattested diagnostic input and always returns `DELEGATION_PROMOTION_BLOCKED_TRUSTED_HOST_AND_ATTEMPT_SET_UNAVAILABLE`. It never promotes or edits canonical guidance; B2 cannot begin until the trusted-host, exact-attempt-set and immutable-prepare boundaries above exist.

## 7. Decision thresholds

Ordinary Context/Workflow track thresholds are stored in `experiment-set.json`. The Long-Task delegation pair policy and thresholds are owned only by the frozen guidance `manifest.json`; `experiment-set.json` carries its digest-bound pointer and does not duplicate those values.

Important boundaries:

- Context recall must remain `100%`.
- Hidden quality and Context correctness must not regress.
- Four-step wording must preserve verification and Conformance behavior.
- The assurance split must preserve route correctness, owner/change scope, evidence-bounded handoff and a zero false-complete rate.
- The small high-assurance task must select Long-Task without executing it; no Long-Task internal workflow behavior is changed or benchmarked by that task.
- The UI/UX recovery task must preserve full controlling-Context and required selected-source recall, successful shared handoff preflight and hidden eight-dimension production behavior.
- V3 or other Authoring changes are measured against current Compact V2, not expanded V2.
- Final Gate parallelism is not tested here unless profiling first proves Final Gate runner time is a dominant cost.

For Workflow Assurance, "near threshold" is frozen as an absolute distance of at most `0.05` for `instruction_bytes_reduction` or `total_tool_call_reduction`. "High variance" is frozen as a pair range of at least `0.15` for total/pre-implementation/formal-enumeration tool-call reduction, token reduction or elapsed reduction. Either condition raises the required eligible-pair count to five. Other tracks retain their existing three-pair minimum unless their own frozen policy is revised before execution.

## 8. What the operator returns for analysis

Return:

```text
all mechanism-score.json files
all comparison.json files
aggregate.json
normalized host traces
exact source checkout SHAs
Codex model/reasoning/host version
any intervention record
```

Raw run directories are useful for audit but should remain under `.artifacts/**` and should not be committed as product Context or benchmark conclusions.
