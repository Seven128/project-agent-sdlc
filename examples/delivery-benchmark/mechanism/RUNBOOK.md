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

Context/Workflow prompt-only variants may be prepared from one baseline checkout. Long-Task candidate variants must be prepared from the checkout that actually implements the candidate parser/compiler behavior; the runner never emulates unsupported Contract syntax.

## 2. Prepare a randomized pair

Choose the order before opening Codex. Alternating baseline/candidate by replicate is acceptable; copying content between paths is not.

Use identical:

```text
pair_id
replicate
model
reasoning
fixture_sha256
experiment_set_sha256
baseline_commit
```

The comparison command rejects a pair when any fixed identity differs.
Aggregation also rejects mixed fixed identities and duplicate `pair_id` plus `replicate` inputs.

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

## 7. Decision thresholds

Thresholds are stored in `experiment-set.json`.

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
