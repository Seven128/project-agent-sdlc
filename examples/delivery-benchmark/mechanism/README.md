# Tiny Context Mechanism Benchmark

This module prepares controlled Codex Agent experiments for mechanism decisions that cannot be settled by package unit tests alone. It is based on repository `main` at:

```text
89b04869a2b29ae09944839370f1e373aa55085f
```

That baseline already includes bounded Context search, Compact V2 authoring, conservative Preflight repair ordering, Context retrieval/Authority projection separation, the one-time post-Authority-Lock model choice and the current selected-design fact-closure boundary. It was refreshed before the startup/default-Context ownership optimization. Any benchmark-listed resolver, four-step replacement or Authoring candidate still requires the formal paired evidence below before production adoption.

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

### Long-Task authoring

- `authoring-compact-v2`: current Compact V2 baseline.
- `authoring-source-derived`: candidate marker-derived `source_ref` and `statement`.
- `authoring-risk-derived`: candidate marker-derived Risk projection after reverse Source ownership closure.
- `authoring-v3-candidate`: later candidate surface compiling to the same canonical internal authority.

Authoring comparisons are blocked unless both runs pass their fixed Source key/kind, Risk and proof gold and produce the same canonical Authority fingerprint. Cost fields remain unavailable until that fingerprint is equal; YAML reduction without Authority equivalence is not a win.

## Fixed Assets

```text
experiment-set.json       variants, tracks, baseline and thresholds
fixture/**                 one deterministic product/Context repository
tasks/*.json               prompts and fixed task inputs
gold/*.json                operator-held Context/Authority expectations
hidden/*.mjs               product probes, never copied into run repositories
runner/**                  prepare, score, compare and aggregate tools
agent-result.schema.json   diagnostic Agent handoff shape
```

The six Context/Workflow tasks cover:

1. local rounding bug;
2. cross-module receipt idempotency;
3. API/Schema compatibility rename;
4. verification/deployment health behavior;
5. retry lifecycle plus Context evolution.
6. fresh-agent UI/UX Context, canonical-target and selected-handoff recovery.

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

Diagnostic only:

- Agent self-reported Context reads or read rounds;
- Agent self-reported Conformance;
- one calibration run;
- resolver candidates without evidence that the Agent actually read them;
- YAML size before both Contracts compile to equal Authority.

A Context/Workflow pair remains calibration-only without a normalized host trace for both paths. The deterministic resolver result can prove candidate recall, but not actual Agent reading cost. The UI/UX task additionally requires trace-confirmed reads of every gold-selected design source; Agent self-report alone is diagnostic.

## CLI

Run from the Tiny Context source checkout after building the package with the repository-required Node version. Formal `prepare` initializes the fixed run with the checkout CLI and writes `tools/ty-context.mjs` so the measured Agent can invoke that exact implementation without inspecting the source checkout. `--skip-harness-init` is mechanical calibration only and can never produce a decision-eligible pair.


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

Aggregate inputs must share the same fixed model, reasoning, fixture, experiment, baseline and source checkout identities. Repeating the same `pair_id` plus `replicate` cannot satisfy the minimum paired-run count.

Use [RUNBOOK.md](RUNBOOK.md) for the operator and Codex protocol.
