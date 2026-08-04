# Test And Benchmark Governance

Use this reference for tests, verification cost, source parity, consumer/release smoke or delivery benchmarks.

## Test ownership and reruns

Follow owning verification Context and `docs/test-suite-roi-redesign.md` (`TS-RERUN`). Start with the failing test and affected/focused set; local green fragments cannot be concatenated into a full-gate claim.

After a failure, skipping another local full suite is allowed only when all of these hold: tracked verification inputs did not change, the failure is proven environment-only, the failed item plus affected/Trust checks now pass, and a still-required downstream `main`/release full gate will produce the authoritative green result. Otherwise obtain one fresh complete pass after the final relevant change.

Tests must prove real behavior through the owner rather than assert prose alone. Update exact routing/negative triggers, managed/install/package parity, safe collision/symlink/failure behavior, idempotence, Windows/macOS path semantics and public/tarball lifecycle when those surfaces change. Never weaken a selector or assertion merely to accept the new implementation.

`validate-context` proves Context recoverability and rejects false test-pass claims; it does not prove product behavior. `validate-harness`, source check, type/build checks and focused/runtime suites retain their distinct scopes.

## Benchmark governance

Delivery Benchmark currently supplies only its maintained skeleton and scenarios. Historical stage-era output is not evidence for Minimal Context. Publish a new efficiency/quality conclusion only from a fresh baseline-versus-current comparison with high-confidence timing, quality and environment evidence. State workload, comparator, tolerance and uncertainty; do not turn one anecdotal run or static structure into a performance claim.

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
