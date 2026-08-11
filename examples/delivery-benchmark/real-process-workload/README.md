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

Three balanced repeats are mandatory. The runner expands to five when wall
time CV exceeds 20%, paired direction is inconsistent, a primary ratio is
within five percentage points of its threshold, or provenance is doubtful.
The report includes authoring/Compile/Verify/Counterfactual/Final-Gate timing,
authority and closure-copy bytes, process counts, peak RSS, correct-path and
all-errors-to-recovery cost, false completion/blocking, modification/rework,
and frozen runtime/test file-and-LOC maintenance scale. Authoring tokens
require an invocation-bound host/provider usage event; no surrogate tokenizer
is accepted, so a missing event is recorded as `required-unverified` and
keeps complete total ROI unsupported. Human maintenance minutes likewise
remain unverified when no independent time log exists, while objective
file/LOC scale remains measured. All `observed_lifecycle_*` fields are
diagnostic only: this v2 collector has no independent formal-cost ingestion and
therefore cannot issue a governance verdict or promote Level 3, even when its
observed lifecycle comparison is positive.

Run `node tools/verify_long_task_real_process_roi.mjs --dry-run --candidate
<commit>` before collection. A full collection intentionally waits for a clean
final C commit and uses temporary detached worktrees for A, B, and C.
