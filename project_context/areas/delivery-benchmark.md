# Area Context: delivery-benchmark

## Responsibility

- Provide repo-local scenarios, runner tools and static reports that evaluate whether Harness improves same-quality lifecycle delivery efficiency.
- Provide a separate mechanism-experiment layer for fixed Context routing, Workflow wording and Long-Task Authoring A/B decisions without turning experiment metadata into product authority.
- Provide an optional UI/UX recovery/conformance task that measures whether a fresh Agent reaches the owning Screen/visual authority, opens the selected immutable target and preserves its declared facts without adding default workflow state.

## User / System Contract

- Benchmark runner prepares fixed baseline and Harness run directories.
- Observer, timer, hidden quality probes, recovery scoring, intervention records and gate findings are measurement tools, not product quality shortcuts.
- Public conclusions should use high-confidence metrics for core claims and keep medium/low-confidence metrics as diagnostics.
- Workflow overhead ratio, artifact inventory / artifact count, gate true-product defect count versus hygiene issue count and AC progress visibility are diagnostic fields only; they explain process cost and evidence visibility but do not create new benchmark conclusions.
- New Harness benchmark prompts should use Minimal Context, not the old stage workflow.
- Mechanism experiments fix task, fixture, model, reasoning, pair identity and gold before Agent execution. Aggregation counts only distinct `pair_id` plus `replicate` runs with the same fixed identity. Context/Workflow read-cost conclusions require a normalized host trace; Authoring hard gates require fixed Source keys/kinds and cost comparisons remain unavailable until canonical compiled Authority is equal.
- Static tests may validate the UI/UX benchmark fixture, hidden oracle and routing gold, but only fresh independent paired Agent runs may support a recovery or ROI conclusion.

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
- Raw mechanism runs, gold, hidden probes and score files remain benchmark evidence under `.artifacts/**`; they are not Context, Contract Authority, Progress or completion proof.

## Code Entry Points

- `examples/delivery-benchmark/runner/delivery_benchmark.mjs`
- `examples/delivery-benchmark/scenarios/*/quality_probe.mjs`
- `examples/delivery-benchmark/results/index.html`
- `examples/delivery-benchmark/mechanism/runner/*.mjs`
- `examples/delivery-benchmark/mechanism/tasks/*.json`
- `examples/delivery-benchmark/mechanism/gold/*.json`
- `examples/delivery-benchmark/mechanism/hidden/*.mjs`

## Test Entry Points

- `node --test tests/ty-context/delivery-benchmark.test.mjs`
- `node --test tests/ty-context/delivery-mechanism-benchmark.test.mjs`
- `node --test tests/ty-context/delivery-mechanism-authoring-benchmark.test.mjs`
- `node --check examples/delivery-benchmark/runner/delivery_benchmark.mjs`
- `node --check examples/delivery-benchmark/mechanism/runner/mechanism_benchmark.mjs`
- `node --check examples/delivery-benchmark/results/benchmark-data.js`

## Open Risks

- Current public benchmark data is intentionally empty after reset.
- Future pilot design must measure whether Minimal Context reduces recovery cost without hiding Harness overhead.
- Real Codex A/B still requires separate repository roots and fixed host/model settings; repository unit tests can validate benchmark machinery but cannot substitute for those Agent runs.
