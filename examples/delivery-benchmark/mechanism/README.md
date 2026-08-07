# Tiny Context Mechanism Benchmark

This module prepares controlled Codex Agent experiments for mechanism decisions that cannot be settled by package unit tests alone. It is based on repository `main` at:

```text
c030d02eee315d2860c6a2ff01c22887690f3684
```

That baseline is the Long-Task Compact Carrier baseline. It includes bounded Context search, the default route's exact ephemeral non-UI and selected-design accounting, Compact V2 authoring, conservative Preflight repair ordering, Context retrieval/Authority projection separation, the unconditional post-Authority-Lock host-change continuation checkpoint and the selected-design fact-closure boundary. Any benchmark-listed resolver, workflow replacement or Authoring candidate still requires the formal paired evidence below before a measured mechanism claim.

No benchmark result is committed here. A prepared run, calibration run, or single pair is not evidence that a mechanism has positive ROI.

## Tracks

### Context routing

- `context-current-main`: current manifest candidates plus manual bounded Context search.
- `context-resolve-r0`: benchmark-only stateless `resolve --explain` prototype.

The prototype uses existing `context.toml`, explicit task terms/paths/facets, bounded Markdown text matching, and dependency closure. It creates no index, cache, registry, state, Context authority, or Long-Task reference.

### Workflow expression

- `workflow-current`: current detailed default Workflow Contract wording.
- `workflow-four-step`: `Resolve -> Change -> Prove -> Reconcile`, with the same Context Delta, verification, Conformance, and drift obligations.

The four labels are prompt wording only. They must never become lifecycle state or phase artifacts.

### Workflow assurance boundary

- `workflow-exact-ephemeral-baseline`: frozen `main@c030d02` default guidance with exact ephemeral Fact/Obligation accounting.
- `workflow-assurance-split`: default model-led guidance for any complexity, with risk-proportional material understanding, current-candidate repair and evidence-bounded handoff.

Both variants load the complete canonical `.codex/ty-context-managed/agents/AGENTS_CORE.md` bytes from their declared frozen Git commit. `prepare` verifies the Git blob oid, full-file SHA-256, strict UTF-8 and the SHA-256 of the exact `## Default Workflow Contract` through pre-`## Long-Task Routing` byte range, then replaces the whole managed-marker interior while preserving the fixture overlay. It never uses a handwritten summary, current `HEAD`, the working tree, a package asset or the other variant as fallback. A missing Git object, invalid marker pair, heading drift or digest mismatch fails preparation; `.benchmark/mechanism-run.json` records the actually resolved guidance provenance. No fresh paired Agent A/B has yet been run for this Workflow Assurance candidate.

This track holds Long-Task internals fixed. It tests only whether removing the default route's exact ephemeral production ledger lowers repeated execution cost without reducing hidden quality, Context and selected-source recall, project verification, owner/change-scope correctness, route correctness or completion honesty. A seventh small-but-high-assurance task checks that task size does not prevent selecting Long-Task; it selects a route only and never activates or executes Long-Task.

### Long-Task authoring

- `authoring-compact-v2`: current Compact V2 baseline.
- `authoring-source-derived`: candidate marker-derived `source_ref` and `statement`.
- `authoring-risk-derived`: candidate marker-derived Risk projection after reverse Source ownership closure.
- `authoring-v3-candidate`: later candidate surface compiling to the same canonical internal authority.

Authoring comparisons are blocked unless both runs pass their fixed Source key/kind, Risk and proof gold and produce the same canonical Authority fingerprint. Cost fields remain unavailable until that fingerprint is equal; YAML reduction without Authority equivalence is not a win.

### DRA and Build / Reuse / Buy admission

`admission-set.json` is a separate frozen protocol for two independent Fresh-Agent tracks. `dra-semantic-recovery` tests replayable Base/Delta meaning, Source-owned scoped authority, non-circular delegated choice, active-owner/inactive-leakage closure, Delta-to-patch conservation, complete audit catalogs, deterministic-recovery boundaries, CAS/idempotence and the zero-write simple preview. `build-reuse-buy` scores an allowed solution set and prohibited failures; it deliberately treats repository reuse, standard/installed/mature external capabilities, bounded self-implementation and intentional non-abstraction as potentially valid instead of requiring one library.

The freeze uses one global execution-envelope digest plus one track-local frozen-config digest. Model/reasoning, Provider, Codex/Node/OS environment, pairing and shared execution mechanics invalidate both tracks; DRA or Build / Reuse / Buy cases, hidden probes, result schemas, guidance, thresholds and track-specific scoring invalidate only their owning track. Hidden probes never enter the Agent prompt. Each invocation uses an independent `codex exec --ephemeral` read-only session in a helper-owned OS temporary directory; raw traces and scores stay ignored under `.artifacts/mechanism-admission/**` and are not Context, Authority or acceptance state.

Both tracks start at three eligible pairs and require `2/3` wins. A primary-metric coefficient of variation above 20%, mixed pair direction, a result within five percentage points of threshold or environment/Provider trace doubt expands the frozen requirement to five pairs and `3/5` wins. No critical category may regress; targeted critical-plus-major defects must fall by at least 25%; must-allow false blocking is zero and other false blocking cannot exceed baseline. DRA additionally requires zero simple-path side effects/tool calls and no more than 10% median token or wall overhead. A zero-defect baseline produces no invented improvement claim.

## Fixed Assets

```text
experiment-set.json       variants, tracks, baseline and thresholds
fixture/**                 one deterministic product/Context repository
tasks/*.json               prompts and fixed task inputs
gold/*.json                operator-held Context/Authority expectations
hidden/*.mjs               product probes, never copied into run repositories
runner/**                  prepare, score, compare and aggregate tools
admission-set.json         independently frozen DRA/Build-Reuse-Buy protocol
admission/**               public cases and strict result schemas
agent-result.schema.json   diagnostic Agent handoff shape
```

The six implementation Context/Workflow tasks cover:

1. local rounding bug;
2. cross-module receipt idempotency;
3. API/Schema compatibility rename;
4. verification/deployment health behavior;
5. retry lifecycle plus Context evolution;
6. fresh-agent UI/UX Context, canonical-target and selected-handoff recovery.

The Workflow Assurance track adds one route-only task for a small billing rule that explicitly requires machine-traceable, recoverable and auditable acceptance.

The five Authoring tasks cover structured JSON, UI/Playwright, Population, security/migration, and external pending.

## Evidence Boundary

Conclusion-grade:

- fixed run identity and fixture hash;
- operator-executed hidden product probe;
- operator-executed project verification;
- Git-derived Context changes;
- compiled Authority projection and fingerprint;
- benchmark CLI-wrapper records for actual Preflight/Compile invocations;
- external observer elapsed time;
- normalized host tool trace when available;
- normalized selected design-source reads for the UI/UX recovery task.
- Git-derived intended-owner/change-scope conformance;
- trace-derived total, pre-implementation and formal-enumeration tool calls for Workflow Assurance;
- prepare-derived frozen Git guidance provenance for each Workflow Assurance variant;
- structured completion handoff checked against the machine-observed outcome.

Diagnostic only:

- Agent self-reported Context reads or read rounds;
- Agent self-reported Conformance;
- one calibration run;
- resolver candidates without evidence that the Agent actually read them;
- YAML size before both Contracts compile to equal Authority.

A Context/Workflow pair remains calibration-only without a normalized host trace for both paths. The deterministic resolver result can prove candidate recall, but not actual Agent reading cost. The UI/UX task additionally requires trace-confirmed reads of every gold-selected design source; Agent self-report alone is diagnostic. A Workflow Assurance pair additionally requires trace-derived tool-call counts and observer elapsed time for both variants. Token counts are compared when the host exposes them, but are not silently inferred.

## CLI

Run from the Tiny Context source checkout after building the package with the repository-required Node version. Formal `prepare` initializes the fixed run with the checkout CLI and writes `tools/ty-context.mjs` so the measured Agent can invoke that exact implementation without inspecting the source checkout. Workflow Assurance preparation also requires both frozen guidance commits to exist locally; shallow checkouts must fetch/deepen those Git objects before retrying. `--skip-harness-init` may place the complete canonical protocol into an otherwise unmarked calibration fixture, but it remains mechanical calibration only and can never produce a decision-eligible pair.


```sh
node examples/delivery-benchmark/mechanism/runner/mechanism_benchmark.mjs list
```

Prepare one run:

```sh
node examples/delivery-benchmark/mechanism/runner/mechanism_benchmark.mjs prepare \
  --task local-rounding-bug \
  --variant context-current-main \
  --pair-id rounding-01 \
  --replicate 1 \
  --model <exact-model-id> \
  --reasoning <exact-reasoning-level> \
  --out-dir .artifacts/mechanism/rounding-01/baseline \
  --force
```

Prepare the paired candidate with the same pair/model/reasoning/replicate:

```sh
node examples/delivery-benchmark/mechanism/runner/mechanism_benchmark.mjs prepare \
  --task local-rounding-bug \
  --variant context-resolve-r0 \
  --pair-id rounding-01 \
  --replicate 1 \
  --model <exact-model-id> \
  --reasoning <exact-reasoning-level> \
  --out-dir .artifacts/mechanism/rounding-01/candidate \
  --force
```

Open each prepared directory as an independent Codex root and give it only `.benchmark/prompt.md`.

After each measured run, score it from the source checkout:

```sh
node examples/delivery-benchmark/mechanism/runner/mechanism_benchmark.mjs score \
  --run-dir .artifacts/mechanism/rounding-01/baseline \
  --trace .artifacts/mechanism/rounding-01/baseline-trace.json \
  --out .artifacts/mechanism/rounding-01/baseline-score.json
```

Compare the pair:

```sh
node examples/delivery-benchmark/mechanism/runner/mechanism_benchmark.mjs compare \
  --baseline-score .artifacts/mechanism/rounding-01/baseline-score.json \
  --candidate-score .artifacts/mechanism/rounding-01/candidate-score.json \
  --out .artifacts/mechanism/rounding-01/comparison.json
```

Aggregate at least three eligible paired runs for the same task and variants:

```sh
node examples/delivery-benchmark/mechanism/runner/mechanism_benchmark.mjs aggregate \
  --score <comparison-1.json> \
  --score <comparison-2.json> \
  --score <comparison-3.json> \
  --out <aggregate.json>
```

Aggregate inputs must share the same fixed model, reasoning, fixture, experiment, baseline and source checkout identities. Repeating the same `pair_id` plus `replicate` cannot satisfy the minimum paired-run count. Workflow Assurance expands the frozen requirement from three to five pairs when a declared cost metric is within `0.05` of its threshold or the pair range of a declared variable cost metric reaches `0.15`.

Use [RUNBOOK.md](RUNBOOK.md) for the operator and Codex protocol.

The independent admission runner is fully source-checkout driven:

```sh
node examples/delivery-benchmark/mechanism/runner/admission_benchmark.mjs freeze-check
node examples/delivery-benchmark/mechanism/runner/admission_benchmark.mjs deterministic --artifact frozen-v1/deterministic
node examples/delivery-benchmark/mechanism/runner/admission_benchmark.mjs run-pair --track dra-semantic-recovery --pair-id dra-01 --replicate 1 --artifact frozen-v1/dra/pair-01
node examples/delivery-benchmark/mechanism/runner/admission_benchmark.mjs run-pair --track build-reuse-buy --pair-id brb-01 --replicate 1 --artifact frozen-v1/brb/pair-01
```

After three pairs, run `aggregate` with the exact deterministic report and pair-report paths. If it returns `MORE_PAIRS_REQUIRED`, run replicates four and five under the unchanged identities and aggregate all five. DRA simple-path reports retain every raw pair ratio, while the admission median compares baseline and candidate medians separately at invocation position one and two before taking the median of those two overheads; this preserves the frozen AB/BA pairing without letting a 3/2 order imbalance masquerade as mechanism cost. Both variants must appear in both positions. Never edit a generated score or frozen input after candidate execution. A changed global identity invalidates both tracks; a changed track identity invalidates only that track. Do not infer a missing v3 track identity from v2 evidence.

The trace distinguishes requested from effective model/reasoning/Provider. Unobservable or mismatched effective provenance is recorded as `unverified`/doubt and forces five pairs; it is never filled from the request. Once both aggregates exist on a clean committed `main`, create the sanitized exact-tree manifest:

```sh
node examples/delivery-benchmark/mechanism/runner/admission_benchmark.mjs attest \
  --deterministic frozen-v3/deterministic/deterministic-report.json \
  --aggregate frozen-v3/dra/aggregate/aggregate-report.json \
  --aggregate frozen-v3/brb/aggregate/aggregate-report.json \
  --artifact frozen-v3/attestation
```

The manifest contains only frozen/result digests, bounded aggregate metrics, provenance qualification, trace-identity-set digests and the exact candidate Git commit/tree. It contains no prompt, model output, raw event/stderr or sensitive Source content and is not Source, Contract, Evidence, Receipt, Gate or acceptance.

Materialize the CI-safe bundle and workflow payload only after attestation:

```sh
node examples/delivery-benchmark/mechanism/runner/admission_benchmark.mjs sanitize-evidence \
  --deterministic frozen-v3/deterministic/deterministic-report.json \
  --pair <every-included-pair-report.json> \
  --aggregate frozen-v3/dra/aggregate/aggregate-report.json \
  --aggregate frozen-v3/brb/aggregate/aggregate-report.json \
  --attestation frozen-v3/attestation/admission-attestation.json \
  --artifact frozen-v3/sanitized
```

Dispatch `.github/workflows/admission-evidence.yml` on the exact attested `main` ref with the generated `workflow-payload-base64.txt`. It revalidates commit/tree, identities, file digests and forbidden raw fields, then uploads only sanitized JSON for 30 days. Invocation results, prompts, raw model answers, events, stderr and sensitive Source remain local and excluded.
