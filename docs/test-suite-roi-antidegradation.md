# Test Suite ROI Anti-Degradation Delivery Source

Status: **Current Goal Source — not implementation or acceptance evidence**

Owning area: `harness-package`

This document is the single project-native Source synthesized from the complete
conversation, repository evidence, the preceding ROI delivery, and the failed
close attempt observed immediately before this Goal. It defines only the test-suite
ROI anti-degradation follow-up. The Delivery Contract, implementation, tests, CI,
and one current-snapshot Final Gate remain the proof path.

## Retrieval Index

| Key | Topic |
| --- | --- |
| `TSAD-SCOPE` | User intent, scope, authority, and exclusions |
| `TSAD-INPUTS` | Conversation, attachment, repository, and Receipt inventory |
| `TSAD-BASELINE` | Previous ROI result and break-even interpretation |
| `TSAD-FAILURE` | New close failure and targeted diagnosis |
| `TSAD-ARCH` | Architecture Deliberation and mechanism choice |
| `TSAD-SEMANTICS` | Critical semantic-sentinel continuity |
| `TSAD-CONCURRENCY` | Fail-closed isolation-lane correction |
| `TSAD-CI` | Controlled CI budget and current-run slow-file diagnostics |
| `TSAD-RERUN` | Execution and rerun discipline |
| `TSAD-ROI` | Independent benefit and recurring cost |
| `TSAD-AC` | Executable acceptance and counterexamples |
| `TSAD-GIT` | Authorized post-gate Git delivery |
| `TSAD-NONGOALS` | Forbidden shortcuts and honest limits |

## `TSAD-SCOPE` — User Intent And Delivery Boundary

The user first reported three Long-Task workflow concerns: approval prompts lacked a
human problem/change summary; rolling implementation failed to stop at the model
choice boundary; and the package test suite appeared to have regressed into repeated
ten-to-twenty-minute runs. The first two concerns were handled by preceding work and
are background only here. The current Goal is exclusively the third concern's durable
follow-up: preserve the test suite's false-completion interception and release purpose
while making later changes unable to silently erode either semantic coverage or
execution-cost governance.

The user explicitly requires a material rather than marginal return on roughly five
hours already invested, asks that future feature/test changes remain protected, and
authorizes implementation without preference clarification when repository evidence
supports a safe choice. The current Goal still obeys the mandatory first-Authority-Lock
model checkpoint; `continue_current_model` and blanket approvals given for the prior
Goal do not approve this Goal's checkpoint or any future exact protected revision.

After machine acceptance, the user explicitly authorizes an intentional commit,
push of the current development branch, merge into `main`, and push of remote `main`.
No pull request, npm publication, deployment, destructive production change, or
unrelated-worktree mutation is authorized.

## `TSAD-INPUTS` — Indexed Source And Evidence Inventory

- Conversation requirements: analyze suite degradation; optimize by design purpose;
  keep test effect materially unchanged; add durable anti-degradation; use one native
  Goal and the Long-Task Workflow; retain all relevant details; explain value; and
  complete the authorized Git delivery.
- `docs/test-suite-roi-redesign.md`: preceding design, Source, rollout facts, rerun
  policy, migration status, and safety boundaries. It is supporting Source here; its
  prior marked items do not automatically create completion credit for this Goal.
- Preceding Final Receipt:
  `.work_products/test-suite-roi-runtime-optimization/.ty-context/final-receipt.json`.
  It previously recorded a passing current-snapshot delivery before the later close
  attempt replaced the latest Receipt with `needs_work`; the earlier accepted figures
  are preserved below as operational evidence, not reused acceptance.
- Current repository owners: `tools/test_suite_policy.mjs`,
  `tools/affected_test_selection.mjs`, `tools/run_affected_tests.mjs`,
  `tests/ty-context/run-package-suite.mjs`,
  `tests/ty-context/test-suite-file-reporter.mjs`, the Long-Task Trust tests,
  `.github/workflows/package.yml`, `.github/workflows/npm-publish.yml`, package
  scripts, `PROJECT_SPEC.md`, and owning `project_context/**`.
- Screenshot `codex-clipboard-26fb5cc6-4e6d-431d-9477-2a7176e6df25.png`, SHA-256
  `f54b7029b34426cb524183ca9f8cd80e012f88fd0bf2741ccfca22e91b833a2c`, shows the
  earlier approval-summary UX gap.
- Screenshot `codex-clipboard-83c28c67-f4be-4ac6-a7de-56b1b3df796c.png`, SHA-256
  `c9748013d2b02bb898c1cdae16cf8ee346284ceb2dc04daf231e3b561fbc3218`, shows the
  earlier model-choice stopping gap.
- Both screenshots are indexed to prevent context loss but are out of scope and
  supply no completion evidence for this test-suite delivery.

## `TSAD-BASELINE` — Previous ROI Result

The preceding delivery recorded one comparable Windows Long-Task observation of
`2,282.9 s` and a complete aggregate of about `2,416.4 s`. Its accepted candidate
later recorded Long-Task `619,417 ms` and a complete Check of about `714,869 ms`, a
Long-Task reduction of approximately 72.9%, while reporting the original 60
Long-Task files, at least 281 tests, and zero failure, skip, cancellation, or missing
file. At the user's approximately five-hour investment, the roughly 28.4-minute
complete-run saving amortizes after about eleven comparable complete invocations.
This is an operational break-even estimate, not a formal cross-machine benchmark.

The retained mechanisms are one-highest-aggregate dominance, current build-input
fingerprinting, exhaustive `test-suite-timing-v2`, immutable fixture seeds copied
into independent repositories, reviewed isolation lanes, concurrency at most two,
unknown-file serial fallback, serialized lock-bearing Git fingerprint work, and no
result cache, second Authority, or persistent scheduler.

## `TSAD-FAILURE` — New Evidence That Changes The Design

The mandatory close of the preceding Authority ran on 2026-07-23 and failed after
about 1,264 seconds. Its single raw complete Check took `1,173,418 ms`: the default
suite completed in `172,247 ms`; the Long-Task lane stopped after `961,785 ms` when
`long-task-authority-progress-retry.test.mjs` hit a Git `index.lock` error during
`resume`; the runner then correctly reported one failed file and ten unexecuted
exclusive files as missing. The failure was not spliced into a passing claim.

A targeted serial run of only that file then passed 7/7 in `170,301 ms`, including
the previously failing test in about `9,401 ms`. This falsifies the prior claim that
the file is safe in the concurrent isolated lane. The safe response is explicit
reclassification from isolated to exclusive, changing the reviewed population from
11 pure / 39 isolated / 10 exclusive to 11 / 38 / 11. Retrying `git write-tree`,
deleting lock files, or ignoring the aggregate failure would hide a real race and is
not authorized.

The current Goal then exercised three failed clean-snapshot candidates before this
Source revision. The first exposed that its independent verifier passed
`--ignore-scripts` to `npm test`, suppressing the package's required `pretest` build;
a clean checkout reproduced missing `dist/**`, and the same two representative files
passed after the normal build. The next candidate's default suite exposed a new
publish timing-artifact name containing `github.run_attempt`, which violated the
existing one-prepare stable-run release identity; the repair uses `github.run_id`
with overwrite semantics, and the failed plus affected release checks passed 6/6.
Neither failed aggregate was treated as acceptance.

Revision 3's subsequent Final Gate bound Git commit `f3f701ed` and passed the default
suite with 45 files, 200 test records, zero failures, and all three default critical
sentinels in `91,942 ms`. Its Long-Task safe lane then stopped fail closed after
`432,538 ms` because `long-task-state-resume.test.mjs` hit `index.lock` while running
`resume`; the 11 exclusive files remained explicitly missing rather than being
reported as complete. A direct serial rerun of only that file passed 4/4 in
`47,366 ms`. This preserves its behavior but disproves isolated-lane safety, so the
current reviewed population is 11 pure / 37 isolated / 12 exclusive. This late
release-blocking mutation is the recorded reason for the next complete candidate run.

Revision 4's next Final Gate bound Git commit `c0b7e0c9`. Its default suite again
passed with 45 files, 200 test records, zero failures, and all three default critical
sentinels, this time in `152,938 ms`. The Long-Task safe lane stopped after
`428,991 ms` with `long-task-authority-revision-diagnosis.test.mjs` and
`long-task-finding-context.test.mjs` failed and all 12 exclusive files explicitly
missing. A targeted serial run passed both files 2/2 in `35,770 ms`; a subsequent
two-file concurrency-two probe using the real shared fixture seed reproduced
`finding-context` failing `resume` on Git `index.lock`. The complete-lane evidence
and serial repair evidence therefore disprove safe-lane eligibility for both files.
They become exclusive, producing 11 pure / 35 isolated / 14 exclusive. Receipt-facing
diagnostics now retain up to three failed test identities/messages per non-passing
file so another disposable-snapshot failure remains directly actionable. This
release-blocking isolation correction is the recorded reason for the next complete
candidate run.

Revision 5's Final Gate bound Git commit `d80738b9`. Its default suite passed 45
files and 200 test records with zero failures and all three default sentinels in
`101,167 ms`. The Long-Task safe lane stopped after `441,742 ms` with
`long-task-global-evidence-sensitivity.test.mjs` and
`long-task-qualified-completion.test.mjs` failing `resume` on Git `index.lock`;
all 14 exclusive files remained explicitly missing. A focused serial run then
passed all nine global-evidence-sensitivity tests, but the qualified-completion
failure reproduced even with file concurrency one. Further lane demotion therefore
cannot repair the fault.

A bounded Git Trace2 probe of the current `resume` path made the owner defect
deterministic: `git status` started at `05:10:10.497509Z`, before the same
repository's `git write-tree` exited at `05:10:10.545284Z`.
`resumeDeliveryTask` currently starts `readDeliveryStatusForAuthority` and
`currentGitState` in one `Promise.all`; the first path captures the workspace with
the index-writing `write-tree`, while the second starts `git status`, which may
refresh and lock that same index. The earlier failures were load-amplified evidence
of this internal repository race, not proof that independent fixture repositories
must be serialized. The next candidate must repair this owner boundary, prove the
ordering with Trace2, and restore the four temporary Goal-local demotions only after
the six affected files pass a concurrency-two shared-seed probe.

## `TSAD-ARCH` — Architecture Deliberation

### Owners And Dependency Direction

- `tools/test_suite_policy.mjs` remains the unique executable owner of reviewed
  feedback tiers, critical sentinels, isolation classification, and controlled CI
  cost profiles.
- `tests/ty-context/run-package-suite.mjs` discovers every selected file and applies
  policy. It must not own a second list or cached result.
- `tests/ty-context/test-suite-file-reporter.mjs` derives disposable current-run
  observations from Node test events. It owns no acceptance or historical state.
- Package and publish workflows select one named controlled profile and upload the
  same current-run timing output; they do not duplicate numeric budgets.
- Critical test files carry stable semantic tags in real executed test names. The
  policy maps tag ID to file and rationale; English test wording, line number, test
  count, and assertion layout remain free to evolve.
- `packages/ty-context/src/lib/long-task-status-v2.ts` owns `resume` coordination.
  `packages/ty-context/src/lib/long-task-workspace.ts` owns workspace fingerprint
  and Git-state primitives. The coordinator must not start another observation of
  the same repository until the fingerprint's index-writing phase has completed.

The dependency direction is static policy -> runner -> current-run report -> CI
artifact. Test source supplies observable tagged events to that chain. No report,
workflow artifact, historical pass, or CI timing flows back into test selection or
acceptance authority. Within `resume`, the additional direction is coordinator ->
workspace status/fingerprint -> current Git projection; the latter two may not run
in parallel across the same repository index.

### Selected Design

Use a small reviewed critical-sentinel contract in the existing policy. Require one
passed, correctly placed runtime tag for each high-impact invariant family in the
default, Long-Task Trust, and complete Long-Task suites. Derive the Trust file list
from the same mapping. Add a bounded slowest-file projection to the existing timing
report. Replace three duplicated workflow JSON budget literals with one named,
versioned GitHub-hosted Ubuntu profile in policy, guarded against use outside its
declared environment. Serialize `resume`'s current Git projection after the status
snapshot, verify the ordering through Git Trace2, and restore the four temporary
Goal-local lane demotions only after the six affected files pass under the real
shared-seed concurrency-two harness.

### Rejected Alternatives

- Freezing all 281 test names, line numbers, or a full editable manifest is brittle,
  duplicates test source, and becomes a second high-maintenance truth surface.
- Preserving only 60 file names and a minimum count permits count-preserving semantic
  replacement and is therefore insufficient by itself.
- A historical pass cache or timing database creates reusable state and cannot prove
  the current snapshot.
- One narrow wall-time threshold shared by Windows, macOS, local machines, and
  GitHub Ubuntu is a false benchmark.
- A full mutation-testing job on every pull request adds disproportionate recurring
  cost; bounded synthetic counterexamples plus live sentinel execution close the
  identified path at materially lower cost.
- Retrying or deleting Git locks would mask an unsafe concurrency classification.
- Moving every file that happens to expose the same internal `resume` race into the
  exclusive lane would preserve the product defect, steadily erase the measured ROI,
  and still cannot make the single-file qualified-completion case reliable.

### Future-Change Challenge And Debt Disposition

A future independent false-completion invariant can add a stable ID and rationale;
it may reuse an already selected Trust file when that file contains the strongest
real lifecycle sentinel. A wording-only refactor keeps the tag and needs no registry
edit. Replacing or merging a critical test requires an explicitly reviewed mapping
change and an equal or stronger real CLI lifecycle counterexample. New unclassified
Long-Task files remain exclusive automatically. A future same-repository Git
observation added to `resume` must extend the owner-level Trace2 ordering test before
it may be parallelized; distinct fixture repositories remain eligible for bounded
file concurrency.

This removes the existing debt of numeric CI budgets copied across workflows and
closes the count-preserving semantic gap. It introduces no second result store,
authority, plan, scheduler, or editable coverage inventory. Project checks below
protect the boundary.

## `TSAD-SEMANTICS` — Critical Semantic Continuity

<!-- ty-source-item:start key=critical-continuity-result kind=outcome_result -->
The current complete package test route preserves its historical population floor and proves every reviewed high-impact invariant through a passed, correctly placed, stable critical-sentinel ID, so an equal-count semantic replacement cannot silently pass.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=stable-critical-sentinel-ids kind=requirement -->
One executable policy must map each reviewed critical-sentinel ID to its owning test file, required suite or suites, and invariant rationale; the default, Long-Task Trust, and complete Long-Task runners must fail when a required ID is missing, duplicated, unexpected, misplaced, skipped, cancelled, or failed.
<!-- ty-source-item:end -->

The initial critical set covers these existing real sentinels:

| Stable ID | Owning file | High-impact invariant |
| --- | --- | --- |
| `authority-lock-continuity` | `long-task-active-authority-continuity.test.mjs` | compiled-cache deletion or forgery cannot reset Authority |
| `forged-evidence-rejection` | `long-task-authority-adversarial.test.mjs` | forged Receipt/cache evidence cannot create acceptance |
| `protected-revision-classification` | `long-task-authority-revision-classification.test.mjs` | semantic/proof weakening remains protected and unexecuted |
| `revision-diagnosis-isolation` | `long-task-authority-revision-diagnosis.test.mjs` | scope-only diagnosis creates no authority or durable state |
| `context-freshness` | `long-task-context-evolution.test.mjs` | controlling verification Context remains freshness-bound |
| `final-gate-mutation-rejection` | `long-task-final-closure-mutation-smoke.test.mjs` | post-proof mutation and false authority are rejected |
| `verifier-integrity` | `long-task-profile-hook.test.mjs` | active records cannot redirect or weaken the package verifier |
| `qualified-close-safety` | `long-task-qualified-completion.test.mjs` | failed Live Gates cannot report success or clear Authority |
| `target-runtime-non-substitution` | `long-task-semantic-drift-closure.test.mjs` | Web/process proxy cannot substitute for required Native runtime |
| `terminal-state-current-evidence` | `long-task-semantic-drift-lifecycle.test.mjs` | Stage/target terminal state derives from current Final Gate evidence |
| `live-final-gate-only` | `long-task-workflow-black-box.test.mjs` | only the current Live Final Gate can finish declared machine authority |
| `critical-policy-continuity` | `test-suite-runtime.test.mjs` | equal-count replacement and tag placement are checked fail closed |
| `controlled-budget-profile` | `affected-test-selection.test.mjs` | only a reviewed environment-bound CI cost profile supplies hard budgets |
| `ci-diagnostic-routing` | `workflow-test-entrypoints.test.mjs` | package/main/publish routes use the profile and retain current timing artifacts |

<!-- ty-source-item:start key=count-preserving-replacement-rejected kind=technical_obligation -->
Critical continuity must be evaluated from the current run's tagged test records rather than aggregate counts: a synthetic replacement with the same file and test count but without the required stable ID must fail, while an ordinary non-critical test rename or addition must remain valid.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=reviewed-sentinel-evolution kind=requirement -->
Adding, replacing, merging, or relocating a critical sentinel requires one explicit policy edit with invariant rationale and a real lifecycle test that exercises the same or stronger failure path; ordinary wording, layout, helper, and non-critical test evolution must not require freezing all test identities.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=historical-population-floor kind=requirement -->
The complete Long-Task route must continue to discover the original 60-file set identified by SHA-256 `2588af5d3ebd640de78a295aa39482aaac6d5ece34958b3260d8f295b40daa37`, execute at least 281 tests, and report no failed, skipped, cancelled, or missing item; this supporting floor cannot substitute for critical semantic-sentinel continuity.
<!-- ty-source-item:end -->

## `TSAD-CONCURRENCY` — Git Index Ordering And Evidence-Based Lanes

<!-- ty-source-item:start key=resume-git-index-ordering kind=technical_obligation -->
`resumeDeliveryTask` must finish `readDeliveryStatusForAuthority`, including its index-writing `git write-tree`, before `currentGitState` may start `git status` against the same repository; a deterministic Git Trace2 regression must prove that order. After that repair, `long-task-authority-progress-retry.test.mjs`, `long-task-state-resume.test.mjs`, `long-task-authority-revision-diagnosis.test.mjs`, `long-task-finding-context.test.mjs`, `long-task-global-evidence-sensitivity.test.mjs`, and `long-task-qualified-completion.test.mjs` must pass a real shared-seed concurrency-two probe, the four temporary Goal-local demotions return to isolated, and the original reviewed cohort returns to 11 pure / 39 isolated / 10 exclusive. Later files may extend or reclassify that population only through explicit review; the current additive total is 12/41/11 after moving the load-sensitive Authoring Preflight wall-time measurement to exclusive. Concurrency remains at most two, every unknown file remains serial, and concurrency one remains the mechanical rollback.
<!-- ty-source-item:end -->

No lock retry, lock deletion, shared mutable fixture, or broader concurrency expansion
is permitted. The repair preserves independent fixture repositories and removes the
same-repository race at its owner instead of paying an ever-growing serial tail.

## `TSAD-CI` — Stable Cost Guard And Current-Run Diagnosis

<!-- ty-source-item:start key=ci-cost-governance-result kind=outcome_result -->
Package, main, and publish CI use one reviewed GitHub-hosted Ubuntu budget profile and retain an immediately reviewable current-run slowest-file summary, without adding another test invocation, historical timing state, or a cross-machine acceptance threshold.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=named-controlled-ci-profile kind=technical_obligation -->
The executable policy must own one versioned GitHub Actions Linux profile with the existing generous catastrophic ceilings of 120000 ms for `default`, 240000 ms for `long-task-trust`, and 600000 ms for `long-task`; workflows select only the profile name, unknown profiles or environment mismatches fail closed, and local runs with no profile remain timing-only diagnostics.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=current-run-slowest-summary kind=technical_obligation -->
Every timing report must include a deterministic bounded list of the ten slowest selected files with file, duration, terminal status, and test count, derived only from that invocation and uploaded through the existing package timing artifact path; publish preparation must retain the same diagnostic without retesting.
<!-- ty-source-item:end -->

The numeric CI profile is a hard catastrophic-cost boundary for its declared runner,
not product acceptance and not permission to delete tests. Reviewed tier-size and
hotspot fan-out budgets remain the structural hard guard. The slowest-file projection
is the low-cost review path for legitimate growth: maintainers inspect the current
run, optimize the owner, or deliberately revise a profile with evidence. No median,
p95, trend, or cross-machine claim is inferred from one artifact.

## `TSAD-RERUN` — Execution Discipline

<!-- ty-source-item:start key=single-highest-aggregate kind=technical_obligation -->
Implementation and repair must use only the failed file plus affected or focused checks; after the candidate is frozen, the Goal runs exactly one highest required complete aggregate through its Final Gate, never a separate Trust run first, and never splices partial green results into a complete-pass claim.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=preserve-runtime-boundaries kind=requirement -->
The delivery must preserve exhaustive discovery, deterministic build freshness, independent fixture repositories, Windows and macOS path/process/Git/npm behavior, source/package parity, current-snapshot Final Gate semantics, and the absence of reusable result caches or test-owned acceptance authority.
<!-- ty-source-item:end -->

## `TSAD-ROI` — Independent Benefit Versus Cost

The semantic check adds only a bounded scan of current test records and fourteen
stable IDs; it starts no additional test process. The slowest-file summary sorts the
already collected file records. A named profile deletes duplicated workflow numbers.
Owner-level Git ordering adds only the duration of one small current-state
observation to `resume`, restores four files to the bounded safe lane, and prevents
the repeated late `index.lock` failures and mandatory complete reruns. These changes
therefore protect the preceding approximately eleven-run break-even with negligible
normal developer-loop overhead and materially positive independent ROI.

## `TSAD-AC` — Executable Acceptance

<!-- ty-source-item:start key=critical-sentinel-ac kind=acceptance -->
Given the frozen candidate and the complete current-run timing records, when default and Long-Task suites execute, then every required critical-sentinel ID appears exactly once in its reviewed file with passed status and the Trust file list is derived from the same policy.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=count-substitution-ac kind=acceptance -->
Given baseline and equal-count synthetic test events, when one required critical tag is replaced by an ordinary test while file and test counts remain unchanged, then the replacement report fails with the missing ID, while a non-critical rename or addition preserves a passing report.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=lane-safety-ac kind=acceptance -->
Given the deterministic pre-repair Trace2 overlap, the repaired `resume` coordinator, and a real shared-seed concurrency-two probe of all six affected files, when Git ordering and isolation policy are evaluated, then `git status` starts only after `git write-tree` exits for the same repository, the four temporary Goal-local demotions are restored to the original 11/39/10 cohort, later explicitly reviewed additions and the load-sensitive performance-test reclassification produce the current 12/41/11 total, unknown files remain exclusive, and no lock retry or deletion masks a failure.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=population-floor-ac kind=acceptance -->
Given the frozen final candidate, when the one complete aggregate executes, then the original 60 Long-Task files and at least 281 tests are observed with zero failed, skipped, cancelled, or missing result and all critical sentinels pass in that same current execution.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=ci-profile-ac kind=acceptance -->
Given controlled GitHub Actions Linux, local, unknown-profile, and wrong-runner environments, when suite budgets resolve, then only the named reviewed profile on its declared environment yields 120000/240000/600000 ms ceilings, every invalid selection fails closed, and an ordinary local run has no wall-time gate.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=slow-diagnostic-ac kind=acceptance -->
Given more than ten current-run file records with ties and mixed terminal states, when timing output is built, then `slowest_files` contains at most ten records ordered deterministically by descending duration and file name, matches the current report's file facts, and creates no history or result cache.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=single-aggregate-ac kind=acceptance -->
Given the frozen delivery and shared Final Gate oracle, when all semantic, population, cost, and no-shortcut assertions execute, then they reuse one raw complete-package invocation and the existing complete route supersedes a separate Trust invocation.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=no-shortcut-ac kind=acceptance -->
Given the final implementation, policy, workflows, reports, Context, and Git diff, when the architecture boundary is inspected, then no all-name freeze, coverage deletion, historical green reuse, mutable shared fixture, proxy evidence, cross-machine fake benchmark, lock masking, unreviewed concurrency expansion, second Authority, second plan, registry, scheduler, or persistent test state is present.
<!-- ty-source-item:end -->

## `TSAD-GIT` — Authorized External Delivery

<!-- ty-source-item:start key=remote-git-delivery kind=external_confirmation -->
After the machine Final Gate passes, create an intentional commit, push the current development branch, merge this delivery into `main` in the existing main worktree without overwriting unrelated changes, and push remote `main`; verify the resulting remote refs, but do not create a pull request, publish npm, or deploy.
<!-- ty-source-item:end -->

Git hosting and remote CI remain external to Harness machine acceptance. The native
Goal must not be completed until the scoped Git actions succeed or an honest blocker
is reported.

## `TSAD-NONGOALS` — Safety Boundaries

<!-- ty-source-item:start key=prior-workflow-background kind=non_completing -->
The earlier approval-summary and model-choice stopping fixes, both screenshots, prior accepted Receipt, prior commits, and prior elapsed time are background and baseline only; they contribute no completion credit to this Goal.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=no-antidegradation-shortcuts kind=forbidden_shortcut -->
Do not satisfy this delivery by deleting or weakening coverage, freezing every test name or line, treating counts as semantic proof, caching green results, persisting timing history or selection state, sharing mutable fixtures, retrying or deleting Git locks, applying one narrow wall-time threshold across machines, broadening concurrency without behavioral proof, adding a second coverage Authority/registry/plan/scheduler, or running repeated complete aggregates during repair.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=full-population-risk kind=risk_fact fact=full_population_operation outcome=critical-continuity -->
The historical coverage-floor claim evaluates the complete original Long-Task file population, so incomplete discovery, early lane termination, missing reporting, or partial-result splicing must fail closed.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=trust-boundary-risk kind=risk_fact fact=critical_user_path outcome=critical-continuity -->
The reviewed sentinel set protects high-impact false-completion, authority, revision, freshness, target-substitution, Final-Gate, Hook, qualification, and platform-boundary paths, so silent loss or relocation of a sentinel must fail closed.
<!-- ty-source-item:end -->
