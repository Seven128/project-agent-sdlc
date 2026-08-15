# Level 4 Evidence Candidate Readiness And Structural Cost

Date: 2026-08-16

Status: implementation readiness record; non-formal diagnostic; `external_pending`

Current capability claim: Level 3; `level_4_claimed = false`

## Authority Boundary

This document is candidate-owned implementation and audit input. It is not a
formal evidence packet, verifier report, independent audit, owner decision,
Promotion record, Delivery Contract, Active Authority, Final Receipt or second
conclusion owner. Only `tools/verify_long_task_real_process_roi.mjs` may emit the
formal ROI conclusion. The synthetic controls below must not be represented as
formal-positive evidence.

The Evidence Candidate freezes all implementation, schema, Context, tests,
package version and collection/audit/promotion protocol bytes. Real evidence
must later bind its exact commit, tree, materialized package SHA-256, benchmark
implementation identity and acquisition runtime/TCB identity. A Promotion
Commit must be the candidate's direct child and may add only the four fixed
package-/TCB-external governance records. Any other byte or identity change
invalidates the evidence and requires recollection and independent reaudit.

## Implemented Closure

- One non-injectable package materializer owns detached checkout, `npm ci`,
  package build, source-parity verification, script-disabled pack, command
  records, runtime/lockfile identity and tracked-clean closure.
- One module-private-branded acquisition runtime constructs the runner-owned
  interaction recorder, Windows Job supervisor, fixed Provider adapter and
  State capture. Authoritative callers cannot replace those owners or clocks.
- The frozen eleven-scenario catalog is the sole scenario/source/zero-policy
  owner. Collectors declare capabilities only; every source is exactly
  `required` or `forbidden`.
- The Windows Job path creates the child suspended, assigns it before resume,
  contains descendants, performs cumulative process-tree CPU accounting,
  bounds concurrent stdout/stderr, terminates the Job on timeout/overflow and
  returns only after active-process-zero and complete stream closure.
- Human interaction, process monotonic, wall and Provider clocks have distinct
  identities. Invocation identity is derived before spawn; execution-record and
  execution identities are derived only after close.
- Runner output uses a fresh root, child-only locator and post-close no-follow
  read. State uses a fresh root, sorted no-follow traversal, exact concatenated
  payload and recomputable ledger. Provider credentials and prompt/event paths
  are never child-owned.
- The top verifier validates actual manifest/file bytes and constructs the
  immutable run artifact index. The packet maps paths only and supplies no byte,
  digest, role, event, normalized-value or comparison authority.
- Formal v2, real-process v4 and manifest v2 are current. Formal v1,
  real-process v1-v3 and manifest v1 are legacy and recollection-required.
- The independent audit record binds auditor independence, a complete input
  census, exact commands and output digests, current-candidate results and all
  findings, while explicitly declining formal conclusion ownership.
- R12 remains outside real-process ROI `CASE_IDS`; no Delivery Contract, Active
  Authority, Final Receipt or Long-Task Workflow self-bootstrap was added.

## Derived Capacity

The source of truth is the frozen scenario catalog plus
`tools/long_task_formal_artifact_budget.mjs`; the policy must match its derived
result before collection.

| Quantity | Derived value |
| --- | ---: |
| Formal executions | 86 |
| Base event/output/stdout/stderr/human/candidate-observation files | 516 |
| Compute records | 30 |
| State ledgers + exact payloads | 10 + 10 |
| Prompts + Provider events | 10 + 10 |
| Expected formal files | 586 |
| Formal worst case + headroom | 332.625 + 32 MiB |
| Maximum formal files / bytes | 650 / 364.625 MiB |
| Precollection / frozen-input maxima | 256 / 256 files; 64 / 64 MiB |
| Setup maximum | 87 files; 157.6875 MiB |
| Lifecycle maximum | 3,060 files; 240 MiB |
| Complete run-set maximum | 4,379 files; 974.3125 MiB |
| Excluded self-referential controls | 2 files; 4 MiB total |

The run-set maximum is exactly `586 + 256 + 256 + 87 + 3,060 + 4 +
128 + 2 = 4,379` files. The byte maximum is exactly `364.625 + 64 + 64 +
157.6875 + 240 + 16 + 64 + 4 = 974.3125 MiB`. These are capacity fuses,
not expected ordinary consumption and not evidence of ROI.

## Current Structural Delta

The following Git-index diagnostics compare the implementation-ready working
tree with baseline commit `2fb64588c3f1fdde1134ae4bb466ca406a220208`.
They exclude this document and generated README asset copies, and are structural
cost observations rather than formal evidence.

| Scope | Files | Added lines | Deleted lines | Net lines | Git blob byte delta |
| --- | ---: | ---: | ---: | ---: | ---: |
| Production tools + frozen real-process inputs | 40 | 2,891 | 1,031 | +1,860 | +64,922 |
| Tests and shared test helpers | 16 | 2,348 | 1,674 | +674 | +30,974 |
| Level-4 modularity configuration | 1 | 0 | 7 | -7 | -725 |

Seven bounded production owners were added. The former 1,634-line monolithic
Level-4 fixture test was removed and replaced by five boundary tests plus shared
catalog-driven helpers. Every new source/test carrier is below the touched-source
300-line threshold, and the prior `fixture_snapshot` modularity waiver was
removed. The extra production bytes map to distinct new trust boundaries rather
than copied scenario mappings or repeated trusted identities.

## Non-Formal Diagnostic Measurements

These results exercise implementation shape only. They are not bound real
evidence and do not satisfy Level 4:

- A complete synthetic 86-execution structure produced 586 formal files,
  625 indexed files, 500,378 run-set bytes and 452,193 formal bytes. Index
  construction took 1,591.825 ms; formal evaluation took 415.713 ms; combined
  time was 2,007.539 ms. Node reported peak RSS 61,526,016 bytes. The result was
  deliberately `support_complete=false`, `accounting=null` and
  `controlled_incident_external_pending`.
- The package materializer reproduced baseline commit
  `2fb64588c3f1fdde1134ae4bb466ca406a220208` twice in 39.986 seconds total.
  Both runs produced package SHA-256
  `f2e47521c49a3746060b5cd4851be6bf8b7c09507f8945425b6759907e9c0845`
  and file-set SHA-256
  `8a2e082afd5d40bb314bc2a7e6693c8682608f93437eb8a53609a5ef48cdf105`.
  This proves the materializer test path for that baseline only; exact Evidence
  Candidate materialization must be captured after its commit exists.
- The five split boundary suites and the real-process/suite-policy regressions
  passed together as 69 tests in approximately 236 seconds with reviewed
  concurrency two on the current Windows host. This includes two real package
  materializations and real process-tree exercises. It is a local diagnostic
  without a cross-host performance claim.
- The State control reconstructed the exact sorted `betaalpha` payload at nine
  bytes and rejected empty, symlink, reparse/hardlink and package-proxy inputs.
  Its 24-hour retention basis is explicitly test-only. No production retention
  duration or storage price has been inferred.
- The real Provider route was intentionally not used as evidence. Actual API
  usage, pricing and retention cost remain unmeasured until an authorized
  invocation-bound source is available.

## Cost-To-Protection Mapping

| Incremental cost | Independent protection it supplies |
| --- | --- |
| Detached install/build/parity/pack and nine bounded command records | Rejects callback-injected or locally repacked package identity and makes candidate/promotion comparison mechanical. |
| Job Object helper, runtime probes and bounded streaming | Rejects uncontained descendants, child-only cleanup claims, wall-as-CPU substitution, timeout leakage and silent stream truncation. |
| Fixed Provider bridge and two Authoring artifacts per execution | Rejects child-authored usage, account-level estimates, missing request correlation and credential leakage into the child. |
| State ledger plus payload and a 4-MiB payload fuse | Rejects package-as-State, mtime/sampling proxies, unrecomputable byte-hours and link-based substitution. |
| Immutable 586-artifact formal closure and unique consumption | Rejects packet comparison authority, cross-execution reuse and post-index mutation. |
| Five boundary tests and shared helpers | Separately localizes accounting, process acquisition, source/State/Provider readiness, package/promotion and audit/governance regressions while removing the monolithic-fixture waiver. |

## External Inputs Required Before Collection

Real formal collection remains fail-closed until all of the following are
supplied and authorized:

1. Controlled incident Source bundle:
   - original and sanitized manifests with every byte count and digest;
   - a complete original-to-sanitized mapping, including every redaction,
     exclusion and disposition;
   - provenance, incident task/gold derivation and the underlying design/runtime
     evidence needed to establish purpose benefit;
   - authorization owner, scope and date; and
   - retention and publication terms for original, sanitized and derived data.
2. Authoring Provider/price Source:
   - a retainable invocation-bound event with Provider/model/request/session
     correlation and actual input/output/cached-input usage;
   - the exact prompt under an approved retention or prefrozen redaction rule;
   - a frozen machine-readable actual invoice or official price document plus
     its source envelope and digests; and
   - authorization to collect, retain, audit and publish the required fields.
3. State-retention Source:
   - the actual operating retention policy or documented conservative retention
     upper bound, with owner, basis, effective date and digest; and
   - the applicable machine-readable storage invoice or official price Source.

No default zero, estimated account usage, wall time, package tarball size,
execution-duration retention or unbounded-error sampling may substitute for a
missing source.

The current dry-run reports diagnostic lifecycle collection separately from
formal collection. Without the complete precollection lock, incident, required
price meters and delivery-scoped State-retention Source, formal collection is
false and the sole verifier emits only `total_roi_supported = false` and
`total_roi_positive = false`. The same source preflight runs before any A/B/C
materialization. State retention uses scope
`this-delivery-precollection-proxy-only`; a real positive duration, basis and
Source digest must replace the pending nulls in a newly committed candidate
before real collection.

## Independent Audit And Promotion Readiness

The independent auditor must be different from the implementation owner and
must not have participated in implementation or collection. Its record must bind
the complete fifteen-role input census:

1. `accounting-policy`
2. `benchmark-implementation`
3. `candidate-commit-tree`
4. `candidate-package-tarball`
5. `collector-catalog-and-implementations`
6. `context-delta`
7. `controlled-incident-source-bundle`
8. `formal-evidence-packet`
9. `formal-verifier-report`
10. `precollection-plan-and-sources`
11. `run-set-manifest-and-attestation`
12. `runtime-tcb`
13. `scenario-catalog-task-gold`
14. `structural-cost-report`
15. `validation-results`

It must also bind each exact command argv/cwd/start/end/exit and stdout/stderr
digest, current-candidate result digests and every finding/disposition. It must
set `formal_roi_conclusion_owned = false` and cannot replace the sole verifier.

Only after complete real evidence, a positive sole-verifier report, no blocker,
P1 or open critical finding, and explicit owner approval may a direct-child
Promotion Commit add exactly:

- `evidence-reference.json`
- `independent-audit.json`
- `owner-decision.json`
- `promotion-record.json`

No such governance record or Promotion Commit is created by this implementation
readiness step.
