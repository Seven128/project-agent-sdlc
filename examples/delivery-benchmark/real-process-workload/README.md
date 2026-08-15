# Long-Task real process workload

This directory owns the frozen, repository-local workload used by the
Long-Task real-process ROI benchmark. It is benchmark input, not Product
Source, Long-Task Authority, Progress, a Receipt, or a completion Gate.

The benchmark compares three exact Harness revisions against one identical
product and semantic gold:

- `A` (`0f35e08a...`) is a legacy self-report cost/error baseline and is
  permanently ineligible for a safety verdict.
- `B` (`808efa9e...`) is the isolated stdout-envelope implementation before
  Source-backed process-runtime closure.
- `C` is supplied at collection time and must resolve to a clean, committed
  final candidate.

Every repeat exercises eight directly emitted product facts, normal and
degraded modes, two causal Counterfactuals, one multi-Fact envelope per raw
execution, an independently computed gold result, the correct control, a
wrong product value, and R9-R11. Raw evidence stays under
`.artifacts/long-task-real-capability/real-process-workload/**` and is bound by
the generated SHA-256 manifest.

V4 always runs all five frozen A/B/C repeat orders because formal accounting
requires five B/C pairs. The initial-three CV, direction, threshold-nearness
and provenance expansion decision remains in the summary as a diagnostic; it
does not shorten collection.
The report includes authoring/Compile/Verify/Counterfactual/Final-Gate timing,
authority and closure-copy bytes, process counts, peak RSS, correct-path and
all-errors-to-recovery cost, false completion/blocking, modification/rework,
and frozen runtime/test file-and-LOC maintenance scale. Authoring tokens
require an invocation-bound host/provider usage event; no surrogate tokenizer
is accepted, so a missing event is recorded as `required-unverified` and
keeps complete total ROI unsupported. Human maintenance minutes likewise
remain unverified when no independent time log exists, while objective
file/LOC scale remains measured. All `observed_lifecycle_*` fields are
diagnostic only. Collection cannot issue a governance verdict or promote
Level 3 even when its observed lifecycle comparison is positive.

Run `node tools/verify_long_task_real_process_roi.mjs --dry-run --candidate
<commit> --formal-evidence-plan <plan.json>` before formal collection. The
plan directory must contain a sibling `sources/` tree whose sorted manifest
freezes every collector, machine-readable invoice/official-price document and
envelope, one fixed scenario catalog with its exact task/gold inputs, and every
redaction rule required by qualified sanitized material. Collection materializes those exact
bytes into the run set before execution; omitting the plan is allowed for
diagnostic collection but makes any later formal packet unsupported. A full
collection intentionally waits for a clean final C commit and uses temporary
detached worktrees for A, B, and C.

The plan has this fixed shape; `identity_sha256` is SHA-256 of canonical JSON
for `{ frozen_at, entries }`, and entry roles are limited to `collector`,
`price_document`, `price_source`, `redaction_rule`, `scenario_catalog`,
`scenario_source`, and `scenario_gold`:

```json
{
  "schema_version": "long-task-formal-total-cost-precollection-plan-v2",
  "frozen_at": "<ISO-8601 UTC>",
  "entries": [
    {
      "path": "<sources-relative path>",
      "role": "<fixed role>",
      "bytes": 0,
      "sha256": "<64 hex>"
    }
  ],
  "identity_sha256": "<64 hex>"
}
```

After collection, pass the independent packet only to `--report <run-set>
--formal-evidence <packet.json>`. The v2 packet maps expected evidence keys to
runner-owned indexed paths; it copies no event/output/prompt/telemetry bytes and
provides no digest, role, identity or comparison authority. Provider usage is
parsed from invocation-bound provider records; price conversion is derived
from the frozen raw price document; controlled-incident loss is derived from
raw human-time or metered-usage components. Submitted normalized rates,
monetary incident totals, event IDs, verification flags, or ROI conclusions
are rejected. Structured run-set and formal-source JSON must be strict UTF-8,
duplicate-key-free and no deeper than the bounded decoder limit. The verifier
remains the sole formal conclusion owner. Every event must also bind one unique
raw `scenario_output`: cost-event B and C outputs must both equal their shared
frozen gold, while controlled-incident B must differ and C must equal its gold.
The fixed catalog covers the ten accounting categories plus the one controlled
incident; it is deliberately not a general scenario registry.
