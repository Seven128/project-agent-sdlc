# Level 4 Evidence Candidate Readiness And Structural Cost

Date: 2026-08-17

Status: implementation readiness record; non-formal diagnostic; `external_pending`

Current capability claim: Level 3; `level_4_claimed = false`

Current-candidate verification boundary: the frozen 0.8.15 development plan
forbids tests, builds, Provider calls, evidence collection and Promotion. This
revision therefore uses source/static conformance only. The test timings,
synthetic-run measurements and package reproductions retained later in this
document belong to the earlier diagnostic snapshot that names its own baseline;
they were not rerun and are not current-candidate evidence.

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
- The parent Provider bridge captures the exact prompt and launches only the
  candidate-owned isolated Node worker with a sanitized environment, empty
  `execArgv`, bounded pipes and exact worker/root argv. The worker alone owns
  `node:https`, bounded response streaming and the fixed parser. Protocol-owned
  request/response/stdout/stderr/deadline/abort/output-token limits, forced
  termination and complete temporary-root cleanup fail closed and enter runtime
  TCB v2. The retained event binds response digest plus parser/worker identities;
  no raw Provider response is retained for independent verifier reparsing.
- The benchmark implementation identity includes the npm command owner,
  Provider protocol/worker and an owner-local finite dependency checker.
  Working-tree, Git-object, collection and Promotion paths rerun closure and
  require execution from the exact repository checkout.
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
- Accounting-policy, evidence-packet, precollection-plan, raw-event,
  scenario-catalog and source-manifest are current v2; Provider event is current
  v3 because its exact shape binds parser and worker identities; real-process is
  current v5 and manifest is current v2. Provider-event v1-v2, the other listed
  formal v1 schemas, real-process v1-v4 and manifest v1 are legacy and
  recollection-required. `next` remains unassigned.
- The independent audit record binds auditor independence, a complete input
  census, exact commands and output digests, current-candidate results and all
  findings, while explicitly declining formal conclusion ownership.
- R12 remains outside real-process ROI `CASE_IDS`; no Delivery Contract, Active
  Authority, Final Receipt or Long-Task Workflow self-bootstrap was added.
- Package `0.8.15` completes only the scoped Level-4 mechanism logic. Capability
  remains Level 3, `level_4_claimed=false`, real evidence remains
  `external_pending`, and no formal-positive result or Promotion was created.

## Current Source-Only Conformance

- The production dependency-closure check resolves 68 explicitly admitted
  implementation paths and 61 unique repository-local dependencies, with no
  unlisted dependency.
- Release-version source surfaces agree on package `0.8.15`; the root English
  and Chinese READMEs are byte-identical to their managed asset copies.
- The authoritative Provider path contains no global Fetch transport or
  unbounded `arrayBuffer()` path. The isolated worker uses `node:https`, and
  every retained Provider event binds the current parser and worker identities.
- All new/split Provider and dependency-closure modules remain below 300 lines.
- These are source/static observations only. No test, build, Provider request,
  formal collection, audit, owner approval or Promotion was run or created for
  this candidate.

## Existing Dynamic-Test Mapping (Not Executed For 0.8.15)

The plan's twenty enumerated attack/control assertions are preserved in the
following fourteen behavior cases. These are executable tests, not static
source-string substitutes.

| Original behavior case                   | Current test file / test name                                                                                                                                              | Preserved attack or control meaning                                                                                                                                        |
| ---------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. duplicate-key / invalid UTF-8         | `long-task-level4-measurement-integrity.test.mjs` — `formal source bundles preserve ... strict JSON ...`                                                                   | The strict parser rejects duplicate keys, invalid UTF-8 and excessive JSON depth.                                                                                          |
| 2. no-follow Source                      | same test                                                                                                                                                                  | A symlink or hardlink cannot replace a frozen precollection Source.                                                                                                        |
| 3. Source file/byte fuses                | same test                                                                                                                                                                  | File-count, per-file and aggregate Source overflows fail closed.                                                                                                           |
| 4. precollection materialization         | `long-task-level4-formal-accounting.test.mjs` — `the runner precollection plan freezes and materializes every fixed external input`                                        | Every frozen entry is materialized with exact bytes and digest before collection.                                                                                          |
| 5. invocation-bound Provider usage       | `long-task-level4-measurement-integrity.test.mjs` — `Provider identities, prompts, usage, correlation IDs, reuse, and cached zero remain verifier-bound`                   | Provider/model/adapter/invocation/bridge/prompt/usage correlation is recomputed; cached zero remains an explicit Provider value.                                           |
| 6. one invocation, one category          | `long-task-level4-measurement-integrity.test.mjs` — `[critical:level4-measurement-integrity-boundary] ... cross-category invocation reuse fail closed`                     | One invocation cannot own two formal categories.                                                                                                                           |
| 7. missing authoritative Authoring usage | same file — `missing authoritative authoring usage produces an unsupported reportable result`                                                                              | Removing the required Provider event cannot be replaced by another meter or packet assertion.                                                                              |
| 8. post-collection price Source          | same file — `formal source bundles preserve ... pre-collection prices`                                                                                                     | A price frozen after collection start is rejected.                                                                                                                         |
| 9. packet normalized-value self-report   | same file — `formal purpose benefit rejects packet-authored normalized loss values`                                                                                        | Packet-authored comparison/normalized authority is rejected.                                                                                                               |
| 10. actual invoice                       | `long-task-level4-formal-accounting.test.mjs` — `formal evidence accepts a pre-collection actual-invoice price source`                                                     | Invoice quantity and amount yield verifier-owned per-unit rates.                                                                                                           |
| 11. ten-delivery / once-only strata      | same file — `formal evidence accounting applies the frozen ten-delivery and once-only strata`                                                                              | Repeatable and once-only lifecycle costs retain their distinct multipliers.                                                                                                |
| 12. incomplete packet unsupported        | `long-task-level4-measurement-integrity.test.mjs` — the critical incomplete-packet case                                                                                    | A missing raw binding fails admission rather than being defaulted.                                                                                                         |
| 13. positivity theorem                   | `long-task-level4-formal-accounting.test.mjs` — the cost-reduction and four-positive-pairs/CV tests                                                                        | Cost reductions do not offset the 1.25 denominator; at least 4/5 pairs and sample CV at most 20% remain mandatory.                                                         |
| 14. raw scenario/output reconstruction   | `long-task-level4-measurement-integrity.test.mjs` — `formal scenarios derive same-quality cost and incident outcomes from raw outputs` plus the complete synthetic control | Cost B/C must both equal gold, incident B must be wrong and C correct, output stays execution-bound, and purpose benefit is reconstructed from the complete raw event set. |

Additional dynamic boundaries cover fake acquisition injection, real Windows
Job timestamp propagation, runtime-TCB drift, nested membership, denied
breakaway, actual assignment failure, ignore-terminate cleanup after helper
death, helper-close and unsupported-platform failure, exact-one runner Provider
bridge, Provider child self-report, State swaps and ledger recomputation,
root/nested-junction escape, every zero policy, mixed legacy/current schema,
eight real package materializations, an unbuilt tarball and the complete
five-way/direct-child Promotion authority path. The transient Promotion-positive
shape is deleted with its temporary worktrees and is only a structural test; it
is not retained or represented as formal evidence.

## Derived Capacity

The source of truth is the frozen scenario catalog plus
`tools/long_task_formal_artifact_budget.mjs`; the policy must match its derived
result before collection.

| Quantity                                                          |                Derived value |
| ----------------------------------------------------------------- | ---------------------------: |
| Formal executions                                                 |                           86 |
| Base event/output/stdout/stderr/human/candidate-observation files |                          516 |
| Compute records                                                   |                           30 |
| State ledgers + exact payloads                                    |                      10 + 10 |
| Prompts + Provider events                                         |                      10 + 10 |
| Expected formal files                                             |                          586 |
| Formal worst case + headroom                                      |             332.625 + 32 MiB |
| Maximum formal files / bytes                                      |            650 / 364.625 MiB |
| Precollection / frozen-input maxima                               | 256 / 256 files; 64 / 64 MiB |
| Setup maximum                                                     |       87 files; 157.6875 MiB |
| Lifecycle maximum                                                 |         3,060 files; 240 MiB |
| Complete run-set maximum                                          |    4,379 files; 974.3125 MiB |
| Excluded self-referential controls                                |         2 files; 4 MiB total |

The run-set maximum is exactly `586 + 256 + 256 + 87 + 3,060 + 4 +
128 + 2 = 4,379` files. The byte maximum is exactly `364.625 + 64 + 64 +
157.6875 + 240 + 16 + 64 + 4 = 974.3125 MiB`. These are capacity fuses,
not expected ordinary consumption and not evidence of ROI.

## Historical Structural Delta (Not Refreshed For 0.8.15)

The following Git-index diagnostics compare the implementation-ready working
tree with baseline commit `2fb64588c3f1fdde1134ae4bb466ca406a220208`.
They exclude this document and generated README asset copies, and are structural
cost observations rather than formal evidence.

| Scope                                         | Files | Added lines | Deleted lines | Net lines | Git blob byte delta |
| --------------------------------------------- | ----: | ----------: | ------------: | --------: | ------------------: |
| Production tools + frozen real-process inputs |    40 |       2,901 |         1,031 |    +1,870 |             +65,503 |
| Tests and shared test helpers                 |    26 |       4,786 |         1,672 |    +3,114 |            +101,948 |
| Level-4 modularity configuration              |     1 |           0 |             7 |        -7 |                -725 |

Seven bounded production owners were added. The former 1,634-line monolithic
Level-4 fixture test was removed and replaced by six boundary tests plus shared
catalog-driven helpers. Every new source/test carrier is below the touched-source
300-line threshold, and the prior `fixture_snapshot` modularity waiver was
removed. The extra production bytes map to distinct new trust boundaries rather
than copied scenario mappings or repeated trusted identities.

## Historical Non-Formal Diagnostic Measurements

These results exercise implementation shape only. They are not bound real
evidence and do not satisfy Level 4:

- A complete synthetic 86-execution structure produced 586 formal files,
  625 indexed files, 501,108 run-set bytes and 452,193 formal bytes. Index
  construction took 833.466 ms; formal evaluation took 376.673 ms; combined
  time was 1,210.139 ms. Node reported peak RSS 62,423,040 bytes. The result was
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
- The complete focused working-tree aggregate passed 76 of 76 tests in
  461.347 seconds. It covered all six Level-4 boundaries, the real-process ROI
  verifier and the test-suite policy. A commit-bound canonical aggregate is
  still required after the final Evidence Candidate exists. The package cases
  performed eight real package materializations plus one deliberately unbuilt
  `npm pack`; this is a local diagnostic without a cross-host performance claim.
- The full Job/acquisition batch, including nested membership, denied breakaway,
  actual assignment-limit failure, helper-crash Job-close cleanup,
  fast-parent/grandchild closure, timeout and independent stdout/stderr overflow
  cleanup plus the real external-pending E2E, completed in 16,206.557 ms. The
  loopback Provider exact-one/attack batch completed in 118.858 ms without an
  external API call. The State capture/link/proxy/empty control batch completed
  in 28.769 ms. These are failure-path and local mechanism costs, not production
  workload or Provider-price measurements.
- The State control reconstructed the exact sorted `betaalpha` payload at nine
  bytes and rejected empty, symlink, junction/reparse/hardlink, root escape and
  package-proxy inputs.
  Its 24-hour retention basis is explicitly test-only. No production retention
  duration or storage price has been inferred.
- The real Provider route was intentionally not used as evidence. Actual API
  usage, pricing and retention cost remain unmeasured until an authorized
  invocation-bound source is available.

## Cost-To-Protection Mapping

| Incremental cost                                                    | Independent protection it supplies                                                                                                                                                                            |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Detached install/build/parity/pack and nine bounded command records | Rejects callback-injected or locally repacked package identity and makes candidate/promotion comparison mechanical.                                                                                           |
| Job Object helper, runtime probes and bounded streaming             | Rejects uncontained descendants, child-only cleanup claims, wall-as-CPU substitution, timeout leakage and silent stream truncation.                                                                           |
| Fixed Provider bridge and two Authoring artifacts per execution     | Rejects child-authored usage, account-level estimates, missing request correlation and credential leakage into the child.                                                                                     |
| State ledger plus payload and a 4-MiB payload fuse                  | Rejects package-as-State, mtime/sampling proxies, unrecomputable byte-hours and link-based substitution.                                                                                                      |
| Immutable 586-artifact formal closure and unique consumption        | Rejects packet comparison authority, cross-execution reuse and post-index mutation.                                                                                                                           |
| Six boundary tests and shared helpers                               | Separately localize accounting, measurement integrity, process acquisition, source/State/Provider readiness, package/promotion and audit/governance regressions while removing the monolithic-fixture waiver. |

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
