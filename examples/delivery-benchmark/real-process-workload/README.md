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

The current exact matrix is accounting-policy, evidence-packet,
precollection-plan, raw-event, scenario-catalog and source-manifest v2;
Provider event v3; real-process v5; and run-set manifest v2. Provider-event
v1-v2, the other listed formal v1 schemas, real-process v1-v4 and manifest v1
are diagnostic legacy inputs that require recollection; they cannot be mixed
with or reinterpreted as current evidence. `next` remains unassigned. The one
scenario catalog owns all eleven scenario-to-collector source
profiles and their zero policy. Collectors declare capabilities only, and every
source is exactly `required` or `forbidden`; there is no `optional` source in
this revision.

One package materializer owns detached-worktree checkout, `npm ci`, package
build, source-parity verification, script-disabled `npm pack`, exact
commit/tree/lockfile/runtime capture and tracked-clean verification. Collection,
candidate reproduction and Promotion comparison all use that owner and accept
no injected build, pack, runtime or comparator callback. The authoritative
acquisition runtime is module-private branded and constructs its own interaction
recorder, Windows Job Object supervisor, fixed one-shot Provider bridge and
State capture. Missing Provider correlation, complete process-tree CPU, exact
State payload/retention, human interaction intervals or any other required
source fails formal collection closed.

The fixed population has 86 executions and a catalog-derived 586 formal files:
516 base event/output/stdout/stderr/human/candidate-observation files, 30 compute
records, 10 State ledgers plus 10 State payloads, and 10 prompts plus 10 Provider
events. The formal fuse is 650 files and 364.625 MiB; the complete run-set fuse
is 4,379 files and 974.3125 MiB, including bounded headroom and the two excluded
self-referential controls. Overflow, truncation and unexpected files reject.

Run `node tools/verify_long_task_real_process_roi.mjs --dry-run --candidate
<commit> --formal-evidence-plan <plan.json>` before formal collection. The
plan directory must contain a sibling `sources/` tree whose sorted manifest
freezes every collector, machine-readable invoice/official-price document and
envelope, the controlled-incident bundle and all original/sanitized material,
one fixed scenario catalog with its exact task/gold inputs, the delivery-scoped
State-retention Source, and every redaction rule required by qualified sanitized
material. Dry-run reports `lifecycle_collection_executable` separately from
`formal_collection_executable`; no plan leaves the former dependent on the clean
candidate but forces the latter false with bounded `external_pending` reasons.
The sole verifier also reports `total_roi_supported = false` and
`total_roi_positive = false` because a dry-run contains no real evidence.
Collection applies the same source preflight before any A/B/C package
materialization and materializes the exact frozen bytes into the run set before
formal execution. Omitting the plan remains allowed only for diagnostic
lifecycle collection and makes any later formal packet unsupported. A full
collection intentionally waits for a clean final C commit and uses temporary
detached worktrees for A, B, and C.

The plan has this fixed shape; `identity_sha256` is SHA-256 of canonical JSON
for `{ frozen_at, entries }`, and entry roles are limited to `collector`,
`incident_source`, `price_document`, `price_source`, `redaction_rule`,
`scenario_catalog`, `scenario_source`, `scenario_gold`, and
`state_retention_source`:

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

Each execution derives `invocation_id` before spawn from its canonical
run/pair/variant/scenario/collector/attempt/precollection projection. After the
Job reports zero active processes and all bounded streams close, the runner
hashes the record with only its two derived identity fields excluded and derives
`execution_id` from the invocation and record hashes. Human durations use
`node-hrtime-v1`, native process durations use
`windows-stopwatch-qpc-v1`, UTC anchors use `unix-epoch-ms-v1`, and Provider
events name their external clock. Monotonic domains are never compared to each
other; the frozen wall/monotonic and Provider-window tolerances are 250 ms and
5,000 ms, while exact invocation/request correlation remains mandatory.

An Evidence Candidate contains every code, schema, Context, test, package
version, collection, audit and promotion-protocol byte. Evidence binds its exact
commit/tree/materialized-package SHA-256, benchmark implementation identity and
acquisition runtime/TCB identity. A Promotion Commit must be its direct child and
may add only the four protocol-named package-/TCB-external governance records;
any other change or any identity drift requires recollection and reaudit.

Real collection is currently `external_pending`. The Starward-derived fixture
does not include authorized original incident design/runtime evidence, a complete
original-to-sanitized mapping or publication/retention authorization. Authoring
also needs retainable invocation-bound Provider usage and an actual invoice or
official price source; State needs an actual operating retention policy or a
documented conservative upper bound. Synthetic fixtures exercise fail-closed
structure only and must never be presented as formal-positive evidence.
