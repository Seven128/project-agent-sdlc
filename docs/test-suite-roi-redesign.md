# Test Suite ROI Redesign

Status: **Implemented — rollout plus anti-degradation closure**
Implementation status: **Routing, Trust Gate, CI split, build freshness, fixture reuse, reviewed isolation lanes, semantic sentinels, named CI budgets, same-run slow-file diagnostics, tests, and Context are active**
Owning area: `harness-package`
Context entry: `project_context/areas/harness-package/verification.md`

The initial rollout was implemented on 2026-07-20. It changes package-development and CI test routing, but it does not weaken release coverage or change Long-Task acceptance: `main`, publish, and release still run the complete package suite, and only the source-recompiled Long-Task Final Gate can create machine acceptance.

## Current Implementation

- `tools/test_suite_policy.mjs` is the canonical executable owner for focused/Trust coverage, 37 stable critical-semantic sentinel IDs, the named controlled-CI budget profile and fail-closed Long-Task isolation classes. The Trust file list is derived from the same sentinel records rather than duplicated; the current 37 records derive 28 unique Trust files.
- `tools/affected_change_discovery.mjs` separates explicit paths, dirty local work, clean local commits, explicit bases, and CI bases; dirty local work is never unioned with an inferred historical branch diff.
- `npm run test:long-task:trust` builds once and runs the canonical Long-Task Trust Boundary Gate; package-level `test:trust:built` runs the complete default suite plus that gate for PR CI.
- `npm test` remains the complete default plus complete Long-Task release regression used by `main` and publish; a complete affected plan explicitly supersedes a separate Trust run.
- `--no-build` reuse first verifies a deterministic input/output fingerprint written only by the current package build, so stale `dist` fails before test execution.
- Every package-suite run emits per-file `test-suite-timing-v2`, exact critical-sentinel coverage and a deterministic current-run top-10 slow-file summary from the same event stream. Package and publish CI upload the JSON files as 14-day diagnostic artifacts without rerunning tests. They are never acceptance state or historical-result cache.
- Long-Task suites prepare immutable default/external Git seeds once, then copy each fixture into a unique repository with independent Git state and cleanup. Each disposable copy locally sets `core.fsync=none`, `maintenance.auto=false` and `gc.auto=0`; production repository Git configuration is never changed.
- The reviewed 19-pure/59-isolated lane defaults to concurrency two; the 11 exclusive files and every unknown file remain serial. `TY_CONTEXT_LONG_TASK_ISOLATED_CONCURRENCY=1` is the mechanical rollback and additionally gives every selected file its own Node test process, preserving the full population and fail-fast behavior while containing Windows helper/child-process lifecycle churn without a retry. The default path keeps the reviewed 16-file process bound. Four files were temporarily moved to exclusive after load-amplified `index.lock` failures, but a later single-file-concurrency-one reproduction and Git Trace2 identified an internal `resume` race between workspace `write-tree` and current `git status`; repairing that owner boundary plus a six-file shared-seed probe restored the four temporary demotions instead of masking the product defect with a growing serial tail. The External Confirmation lifecycle suite is isolated because every record, candidate, runner and Git mutation stays inside its unique OS-temporary repository and it has no shared process or package mutation. The Context-mutation guard is isolated because register/move and the active Long-Task fixture remain inside one unique temporary repository with no shared package or process state. Later reviewed additions include the admitted-observer, black-box capability-delivery, generic external-closure, formal external-fulfillment, six split Level-4 boundary suites, verifier-helper identity and isolated Windows Job containment; each entered an explicit class rather than silently widening the safe lane.
- Inferred local discovery omits and reports only untracked `.work_products/**` scratch; tracked files and explicit `--path` values remain fail-safe inputs.
- Canonical Trust/focused/hotspot review budgets block silent feedback-tier growth, while complete-suite auto-discovery remains exhaustive. Package Ubuntu CI selects repository-reviewed `github-ubuntu-v3` (180/630/1200 seconds for default/Trust/Long-Task), while v2 retains its historical 180/540/1200 values and remains the Trusted Publishing selection until separately recalibrated. Profiles refuse unknown names, missing/non-positive suite budgets or a non-GitHub/Linux environment; local timing remains diagnostic and v1/v2 stay immutable earlier calibrations.
- The opt-in 10k-file performance probe uses the canonical Global semantic fixture, runs small schema-sensitive fixtures before large-repository preparation, deduplicates runner duration by execution identity and selects `default-v1` or `windows-v1` phase/seed/total catastrophic budgets. It is not part of the complete release suite and creates no acceptance state.
- Thirty-four critical Long-Task/Trust invariants and three default-suite policy/CI invariants carry stable `[critical:<id>]` tags. The formal external-fulfillment sentinel independently freezes exact fresh per-obligation acceptance, bounded invalidation and runner-time record immutability; `direct-process-descendant-containment` independently binds the real cross-platform direct-root/descendant lifecycle into PR Trust; `atomic-terminal-finalization` binds one locked Finalization Identity/CAS transaction and blocks terminal publication until the Windows Job process tree settles; `complete-delivery-black-box-closure` replays the mechanism-only sanitized Starward packet plus backend and CLI controls through real Compile/Final Gate terminals without claiming original-incident or ROI evidence; and the `win32`-applicable `windows-job-pre-resume-containment` independently proves suspended-create/pre-resume Job assignment and descendant cleanup. Two design IDs share `long-task-design-context.test.mjs`, four Observer/TCB IDs share `long-task-observer-trust-counterexamples.test.mjs`, and the target-runtime plus selected-design IDs share `long-task-semantic-drift-closure.test.mjs`, producing 28 unique Trust files. The one registry derives both suite registration and current-platform applicability: absent `required_platforms` means all supported `linux`, `darwin` and `win32` platforms; a non-applicable skipped tag is recorded separately and is neither required/observed nor passed, while each applicable ID must appear exactly once, in its reviewed file, and pass. Deletion, equal-count replacement, duplication, misplacement, an unreviewed applicable ID, non-canonical platform metadata or a non-passing applicable sentinel fails the existing suite; ordinary test renames/additions remain free, and an intentional stronger replacement updates the one mapping, tag and rationale in review rather than freezing all test names.
- Two fresh Windows Trust Gate runs passed 32 tests across 9 files in 205.681 and 207.986 seconds after a current build. The complete default tier passed 173 tests across 41 files in 113.199 seconds, so the measured PR-equivalent default-plus-Trust path is approximately 321.185 seconds (5 minutes 21 seconds) without another build. These are rollout observations, not yet a multi-sample median or p95 claim.
- One bounded Windows A/B on 2026-07-23 exercised 33 identities across six representative Authority/Final-Gate files: serial took 206.276 seconds and two concurrency-two runs took 147.228 and 128.054 seconds. Identities, terminal outcomes, seed state and workspace state were equal and no fixture root leaked; this is rollout evidence, not a formal cross-environment benchmark.
- Coverage deletion and the 20-change/30-day overlap review remain deliberately deferred until timing and mutation evidence justify them.

## Retrieval Index

| Key                           | Topic                                                                   |
| ----------------------------- | ----------------------------------------------------------------------- |
| `TS-PURPOSE`                  | Unique purpose of each test tier and the core decision                  |
| `TS-BASELINE`                 | Current inventory, observed cost, and why the cost is occurring         |
| `TS-VERIFY-COST-2026-07-28`   | Windows Verify diagnosis, repair evidence, and non-degradation boundary |
| `TS-REVISION-COST-2026-07-28` | Bulk Authority-revision and verifier-migration cost repair              |
| `TS-TIER-DEV`                 | Task-local affected and focused feedback                                |
| `TS-TIER-TRUST`               | Middle-cost Trust Boundary Gate                                         |
| `TS-TIER-RELEASE`             | Complete package release regression                                     |
| `TS-ROUTING`                  | Local/CI change discovery and fail-safe selection                       |
| `TS-RERUN`                    | Repair-loop and full-suite rerun policy                                 |
| `TS-RELEASE-HANDOFF`          | One-test/one-pack release artifact handoff and retry boundary           |
| `TS-OPTIMIZE`                 | Safe runtime optimization rules                                         |
| `TS-ANTIDEGRADATION`          | Critical semantic continuity and controlled cost governance             |
| `TS-MIGRATION`                | Phased implementation and affected files                                |
| `TS-METRICS`                  | ROI measurements and review thresholds                                  |
| `TS-AC`                       | Acceptance criteria and rollback                                        |
| `TS-NONGOALS`                 | Explicit safety boundaries                                              |

## `TS-PURPOSE` — Decision

The complete package suite has one unique job: certify the package's aggregate false-completion, workflow-boundary, compatibility, and distribution regressions on a final source snapshot. It is a release regression gate, not an edit/fix feedback loop, and it never becomes Long-Task acceptance evidence.

The implementation keeps that complete coverage while separating three different jobs:

| Tier                        | Unique question it answers                                                                   | Result authority                            |
| --------------------------- | -------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Developer feedback          | Did this task-local change break the code paths most likely to be affected?                  | Non-authoritative selection aid             |
| Trust Boundary Gate         | Did the final candidate break a high-impact false-completion or cross-module trust boundary? | Package handoff/PR regression evidence only |
| Complete release regression | Does the complete supported package suite pass on the final release candidate?               | Package CI/release evidence only            |

The core change is therefore not “delete slow tests.” It is:

1. keep all current cases in the release tier initially;
2. add the missing middle Trust Boundary Gate;
3. stop using the complete suite after every small repair;
4. fix affected-test discovery so local work is not widened by unrelated historical branch changes;
5. optimize or deduplicate only after fresh timing and invariant-overlap evidence exists.

## `TS-BASELINE` — Motivating Observation

At the motivating baseline, the Long-Task runner discovered every `long-task-*.test.mjs` file, sorted them, and ran them with `--test-concurrency=1`.

Current inventory observed on 2026-07-20:

- 58 Long-Task test files and 264 executed test cases;
- approximately 369 CLI success/failure invocations and 161 delivery-fixture creations by static call-site scan;
- 47 files exercise integration-like process, fixture, Git, Hook, or workflow behavior; only a minority are purely static checks;
- two recent complete runs took 629.4 seconds and 770.5 seconds; four complete invocations therefore consumed roughly 47 minutes in the motivating task.

Those timings are task observations, not a formal benchmark. A fresh controlled baseline is required before making a performance claim.

The 2026-07-22 anti-regression review found approximately 44 default files, 60 Long-Task files and 11 Trust files versus the rollout inventory of 41/58/9. Two comparable Ubuntu workflow snapshots showed complete default-plus-Long-Task wall time rising from 181.096 seconds to 203.728 seconds (about 12.5%), and PR default-plus-Trust rising from 69.178 seconds to 80.097 seconds (about 15.8%). The earlier Windows complete observations remain 629.4–770.5 seconds. These sparse observations justify review guards and generous catastrophic ceilings, not a median, p95 or cross-environment benchmark claim.

The four-run sequence also shows the ROI problem:

1. the first complete run found generated-copy parity and performance/flaky issues;
2. the second found an unintended `.codex/hooks.json` side effect;
3. the third passed after the implementation and modularity repair;
4. the fourth passed after a late conservative documentation/summary correction.

The first two classes should usually be intercepted by cheaper parity, idempotence, side-effect, and targeted checks. Only the frozen final candidate normally needs the expensive complete release proof.

A second cost source was affected-test discovery. The old implementation merged working-tree changes with an inferred base revision diff, so a long-lived workspace could widen a small current task to `full-suite` because older package, dependency, workflow, or documentation changes remained in the branch comparison. `affected-test-plan-v2` fixes that defect and reports the exact discovery source in every plan.

## `TS-VERIFY-COST-2026-07-28` — Windows Verify Cost Repair

A focused review separated Harness overhead from the project-owned runner instead of weakening Final Gate. The accepted anti-degradation receipt at Git head `3075780f` took 1,015,267 ms: one deduplicated complete-suite execution consumed 1,010,269 ms (99.51%), snapshot preparation consumed 1,653.887 ms and other Harness work consumed about 3,344 ms. Four Checks shared the same `execution_identity`, proving the aggregate already ran once rather than four times. A later current-main Package CI run (`30336533857`, head `e02d079d`) passed 46 default files/218 tests in 23,516 ms and 64 Long-Task files/321 tests in 172,809 ms on Ubuntu. These observations establish that the long Windows Verify is primarily project test-runtime cost and platform variance, not a duplicate Final Gate or acceptance-mechanism defect.

The current opt-in performance probe exposed a separate repair defect: its hand-authored Global Claim fixture no longer supplied required applicability semantics and failed only after the 10k-file repository had been prepared. The repair removes that duplicate shape, calls `long-task-global-evidence-sensitivity-fixture.mjs` as the single owner and executes both small semantic fixtures before large seeding. The shared helper supplies the claim-local `replace_json_value` Counterfactual plus a claimless target-runtime liveness Assertion, so schema validity and false-positive resistance are stronger than the stale duplicate. `workflow-test-entrypoints.test.mjs` keeps the owner link and ordering indexed in the ordinary suite.

Git Trace2 on Windows attributed 34.484 seconds and 10,002 hardware flushes to the disposable 10k seed's `git add`, followed by about 6.9 seconds of automatic maintenance. Repeated small fixture repositories pay the same class of durability/maintenance work without testing crash recovery. Their immutable seed now records `core.fsync=none`, `maintenance.auto=false` and `gc.auto=0`; every copy still has a distinct Git common directory, worktree, config and refs and no remote. Production repositories, real Final Gate semantics, fixture contents and failure behavior are unchanged. `test-suite-runtime.test.mjs` proves the independent-repository and local-config boundaries.

Bounded Windows evidence supports the low-risk fixture change without making a formal p95 claim. Thirty alternating fixture-copy-plus-commit pairs measured baseline mean 335.3 ms versus disposable-config mean 301.1 ms (about 10.2% lower). One representative concurrency-two cohort covering Authority retry, Global Counterfactual, resume and qualified completion passed the same 27 tests in both modes: 141.926 seconds with ordinary durability/maintenance settings and 135.003 seconds with the disposable settings (about 4.9% lower). A small Trace2 confirmation observed three total hardware flushes across add/commit with the disposable profile versus four with the baseline profile. These are causal rollout observations, not a cross-environment median or permission to raise concurrency.

The repaired canonical performance command passed on Windows in 98,554.5 ms with one unique main runner invocation: large seed 50,743.4 ms, status 1,200.2 ms, resume 1,341.2 ms, Snapshot 9,838.6 ms, Final Gate 13,839.1 ms, Final-Gate snapshot 8,598.5 ms and non-runner/non-snapshot Harness work 5,155.6 ms. `default-v1` retains every original phase ceiling. `windows-v1` adds explicit Windows catastrophic ceilings—2.5s status/resume, 3s Preflight/Compile, 15s Snapshot/small semantic fixtures/Stop Harness, 30s Final Gate, 60s large seed and 180s total—so the probe remains actionable instead of permanently red from a Linux-shaped threshold. Runner time is summed once per unique execution identity; inconsistent durations for one identity fail closed.

The non-degradation result is monotone: the complete suite population, 18 critical sentinels, 12/41/11 isolation classes, concurrency two, Authority Lock, Counterfactuals, fail-closed behavior and one complete current-final-snapshot Final Gate are unchanged. The probe still covers every prior large-repository and semantic phase, adds valid Global applicability/liveness coverage, earlier schema-drift interception, seed/total budgets and accurate shared-runner accounting. No test result cache, retry, lock deletion, partial acceptance, second Gate, scheduler or persistent benchmark state is introduced.

## `TS-REVISION-COST-2026-07-28` — Revision Projection Cost Repair

The next slow-file review retained every independent failure path while separating field permutations from process and persistence boundaries. The preceding complete Windows report attributed 85,626 ms to `long-task-authority-progress-retry.test.mjs`, 64,205 ms to `long-task-semantic-authority-revision.test.mjs` and 44,995 ms to `long-task-verifier-migration.test.mjs`. The first two files repeatedly started the CLI to classify twelve authority-reduction scenarios and twelve Product-semantic addresses even though every invocation reached the same canonical compiler and revision projector. The verifier migration case copied the complete source package six times and restored the accepted package through a new CLI process after every bundle/schema/Hook mutation.

The selected repair keeps the canonical owners rather than introducing a faster classifier. `long-task-authority-revision-fixture.mjs` exposes one test-only `inspectAuthorityRevisionCandidate` helper which calls `compileDeliveryContract` with the real repository/workdir, the previous compiled Authority, `revise: true` and `authority_revision_mode: "diagnose"`, then projects the resulting canonical proposal with `projectAuthorityRevisionDecision`. It throws when no proposal exists, writes no pending revision, Progress or Receipt, and returns the same raw `revision_diff`, reason set and decision projection that enforcement would consume. Every former reduction scenario and every Product semantic address remains independently asserted. Real CLI parsing, protected failure, pending identity/brief persistence, stateless diagnosis and automatic adoption remain exercised by the existing classification/diagnosis tests plus representative cases in the same progress and semantic suites; the permutation helper cannot create or accept Authority.

`long-task-verifier-migration.test.mjs` now creates one independent package copy, changes its real runtime locator through directory renames, updates the version in place, and reuses one changed locator for the bundle/schema/Hook mutations. Each mutation starts from and finally restores the exact original bytes. All three components still run a real protected `compile --revise` and inspect the pending verifier diff; the bundle case also retains a content-specific Verify rejection, while the earlier relocation section still proves Verify, Final Gate, Stop, close and unflagged Compile rejection. This reduction is valid because Verify's `assertVerifierAuthorityCurrent` and Compile's revision comparison both consume the same component-complete `verifierAuthorityDiff`, which folds bundle/schema/Hook identity into common content/locator decisions without a component-specific enforcement branch. If that owner relationship or branch shape changes, per-component runtime coverage must be restored before adopting the change. The final rename and ordinary Compile restore the accepted package locator. No production package, verifier identity algorithm or fixture repository is shared.

Two same-machine serial baseline runs of the unchanged twelve selected tests took 180,447 ms and 163,093 ms. Two candidate runs took 147,960 ms and 122,300 ms. For the three directly changed tests, the two-run mean fell from 104,103.8 ms to 61,691.4 ms, about 40.7%; the whole selected group mean fell from 171,770 ms to 135,130 ms, about 21.3%. All twelve test identities passed in every run. These bounded sequential Windows observations establish direction and owner attribution, not a formal median, p95, alternating benchmark or cross-environment claim.

The first non-degradation gate is satisfied by construction: no former scenario, semantic address, raw diff field, reason, user-decision assertion, verifier component or distinct CLI/persistence command boundary is deleted; the canonical compiler and projector are executed directly instead of reimplemented; representative real CLI/pending and all final-snapshot mechanisms remain; complete discovery, critical sentinels, Trust derivation and isolation classes are untouched. `test-suite-runtime.test.mjs` adds a low-cost source guard for the canonical helper link, bounded package-copy count and retained verifier command/component boundaries. The second ROI gate is positive for this source-workspace-only change: recurring process/package-copy runtime falls materially, while product Authoring, Runtime, State, Recovery, workflow, introduction and migration cost remain zero; the incremental maintenance cost is one helper in the existing revision fixture and one static owner-link guard. Deleting cases, caching results, adding a persistent worker, raising concurrency and changing the product CLI were rejected because they either weaken independent interception or add a wrong-owner state/process plane.

The frozen-candidate release run then passed the default suite at 46 files/219 tests (218 passed and one expected opt-in skip) and the Long-Task suite at 64 files/321 tests, with all 15 Long-Task critical sentinels present, no missing files, no unknown-file parallelization and no result-cache use. Against the preceding complete Windows report, the three directly optimized test identities fell from 115,953 ms to 71,254 ms, about 38.5%, and their whole-file total fell from 194,826 ms to 161,005 ms, about 17.4%. Long-Task aggregate wall time was 756,799 ms versus the preceding 750,103 ms, a 0.9% increase inside uncontrolled run-to-run and lane-scheduling variance; that pair therefore does not support an aggregate-wall-time improvement claim. The positive ROI conclusion rests on the two-run bounded serial A/B plus the independently lower optimized identities in the complete run, while the exhaustive aggregate establishes non-degradation. The first complete attempt failed only the new source guard because it expected a basename instead of the real package-relative component path; after tightening those three literals, the failed guard passed 11/11 and one fresh complete aggregate passed. No behavioral failure was retried away.

## `TS-TIER-DEV` — Developer Feedback

Purpose: fast defect localization during implementation and repair.

Implemented behavior:

- use explicit task-local paths when the caller knows them;
- otherwise, in a dirty local workspace, select only from the current working-tree diff plus untracked files;
- build at most once per invocation and allow `--no-build` only for the same source snapshot;
- run mapped focused tests for known hot spots;
- fail safe to the Trust Boundary Gate for unmapped Long-Task runtime changes while retaining affected tests not contained by that gate;
- remain explicitly non-authoritative.

Provisional budget after a current build:

- median at or below 90 seconds;
- p95 at or below 3 minutes.

These are target budgets to validate during migration, not current measured claims.

## `TS-TIER-TRUST` — Trust Boundary Gate

Purpose: provide one bounded, high-signal gate between task-local repair and the complete release suite.

The gate should contain one canonical end-to-end proof for each independent high-impact invariant family, while leaving detailed permutations and platform/distribution breadth in affected or release coverage:

- active authority continuity, lock identity, and compare-and-swap races;
- exact authority-revision classification, approval binding, and stateless diagnosis;
- forged, stale, or mismatched Receipt/cache/evidence rejection;
- Source, Context, verifier, and current-snapshot freshness;
- Final Gate, Stop, and close live-gate behavior, including post-gate drift;
- Hook/profile/package parity and one consumer workflow smoke where they cross a trust boundary;
- the platform boundary: no Harness-owned model routing, orchestration, branch, worktree, or agent authority.

The canonical list lives once in `tools/test_suite_policy.mjs` and is exercised by both the runner and selection tests. Its reviewed file-count budget is an explicit change-review trigger: a new independent invariant may raise the budget with rationale, but a maintainer must not remove a sentinel merely to fit it. The complete Long-Task suite remains independently auto-discovered and uncapped.

The Level-4 acquisition and package-promotion sentinels have one additional platform-targeted execution boundary. Ubuntu Trust must execute them to prove Source-first readiness and explicit unsupported-platform failure without claiming a Windows positive path. Package CI's non-advisory `windows-level4-runtime` job on Node 24 builds once and serially runs the package-owned Windows Job supervisor test plus those two Level-4 files, so pre-resume containment is proved by direct real execution on the capable platform. This is platform coverage inside existing package verification, not a new acceptance Authority or reusable result state.

Trigger:

- once after implementation, Context, generated surfaces, and review are complete and the candidate diff is frozen;
- before handoff or PR for Long-Task runtime, authority, evidence, Hook, profile, or package-boundary changes;
- after a Trust Gate failure, only after all known failures have been repaired and focused checks pass.

Provisional budget:

- median at or below 6 minutes;
- p95 at or below 8 minutes.

This gate is package regression evidence. It cannot accept a Delivery Contract and cannot replace its source-recompiled Final Gate.

## `TS-TIER-RELEASE` — Complete Release Regression

Purpose: exercise the full supported package regression surface on one final candidate.

Initial policy:

- retain all current 58 files and 264 cases;
- keep the complete suite in `main` Package CI, publish, and release flows while pull requests run complete default plus Trust Boundary coverage;
- select it locally for shared package/dependency changes, unknown broad changes, or an explicit release rehearsal;
- retain the current under-15-minute ceiling until fresh baselines justify a tighter budget;
- pursue an under-10-minute target only through proven isolation, fixture reuse, or safe parallelism—not by silently dropping invariant coverage.

The complete suite is still not product acceptance, deployment proof, or reusable Long-Task completion evidence.

## `TS-ROUTING` — Change Discovery and Selection

The selection source must be explicit and environment-specific:

| Invocation             | Default change source                                                                                |
| ---------------------- | ---------------------------------------------------------------------------------------------------- |
| Local, dirty workspace | `HEAD` working-tree diff plus untracked files, except reported untracked `.work_products/**` scratch |
| Local, clean workspace | explicit `--base`, otherwise a documented single-commit fallback such as `HEAD^`                     |
| Pull-request CI        | merge-base against the supplied CI base revision                                                     |
| Explicit task scope    | `--path` values; do not add inferred historical paths                                                |
| Explicit comparison    | `--base`; use exactly that comparison plus documented working-tree behavior                          |

The local default must not union an historical branch-base diff into a non-empty working set. CI must not infer its base from whichever local ref happens to exist.

The `.work_products/**` exception applies only to untracked paths discovered implicitly in a local workspace. A tracked file under that directory remains in the working-tree/comparison diff, an explicit `--path` bypasses inference, and CI does not receive this local-scratch exemption. The plan reports omitted paths as `ignored_untracked_local_artifacts`; no `.gitignore` mutation or broad untracked-file exclusion is implied.

Fail-safe widening remains required:

| Change class                                                                     | Minimum target tier                                 |
| -------------------------------------------------------------------------------- | --------------------------------------------------- |
| Known isolated implementation hot spot                                           | Mapped developer tests                              |
| Contract/Context/guidance-only change                                            | Relevant static, parity, and Context gates          |
| Deleted direct `tests/ty-context/*.test.mjs`, including a delete-plus-add rename | Complete release regression                         |
| Unmapped Long-Task runtime or authority change                                   | Trust Boundary Gate or complete Long-Task suite     |
| Shared package entry point, dependency, build, or unknown package change         | Complete release regression                         |
| Release/publish workflow change                                                  | Complete release regression plus pack/release gates |

The canonical executable mapping is `tools/test_suite_policy.mjs`, shared by the planner and runner. It is static source configuration, not a mutable registry, persisted task-test state, or cached acceptance result.

The policy also owns reviewed maximums for canonical Trust files, Long-Task-focused files, Delivery-Contract-focused files and one hotspot path's mapped fan-out. Module load fails closed when a list exceeds its reviewed maximum or contains duplicates. Raising a maximum requires an explicit rationale update; complete-suite discovery has no such limit, so the guard cannot lower release coverage.

## `TS-RERUN` — Rerun Policy

Run cheap, diagnostic gates before expensive aggregate gates:

1. format/type checks and one current build;
2. affected/focused tests;
3. generated-source parity, sync idempotence, unexpected-side-effect checks, Context validation, and `git diff --check`;
4. review the complete diff and freeze the candidate;
5. run the Trust Boundary Gate once when selected;
6. run the complete release suite once when routing or release policy requires it.

When an aggregate gate fails:

1. collect and classify every failure from that invocation;
2. distinguish a verification-snapshot failure from a proven local environment-only failure;
3. repair the known causes as one batch;
4. rerun only the failed tests plus affected/Trust coverage until they pass;
5. rerun the failed aggregate gate once on the newly frozen snapshot when tracked source, tests, configuration, shared fixtures or runners changed, cross-suite contamination is plausible, or that invocation owns the required final validation claim.

Skipping a repeated _local_ complete suite is safe only when all of these conditions hold:

- the failure is attributable to ignored/untracked local state or external infrastructure rather than product or test semantics;
- tracked source, tests, configuration, shared fixtures and runners are unchanged from the failed aggregate snapshot;
- the failed test and selected affected/Trust repair coverage pass after the environment is restored; and
- a guaranteed downstream `main` or release route will run the complete suite and its green result remains required.

In that case, report the local aggregate as failed and defer the single clean complete pass to the downstream gate. Never splice partial reruns into a claim that the local complete suite passed. If no such downstream gate exists, or the local invocation itself owns the final validation claim, the complete aggregate must pass after repair.

Local complete-suite budget per task:

- zero invocations in the ordinary edit/fix loop;
- at most one planned final invocation after diff freeze when routing requires it;
- one additional invocation after an actionable aggregate failure and batched repair only when the local run still owns the required clean aggregate or the safe deferral conditions above are not all met;
- a third or later invocation requires a recorded reason such as a confirmed flaky/infrastructure investigation or a release-blocking late mutation.

A source change after a green aggregate gate invalidates that result, but the rerun tier should match the change. A documentation-only correction should rerun its static/Context gates; it should not automatically trigger the complete suite unless package or release policy maps it there.

Static source tests must assert repository membership rather than the absence of legitimate ignored runtime state. In particular, `.codex/hooks.json` may exist after Long-Task is enabled; the invariant is that it remains ignored and untracked, while Hook installation and shape are covered by isolated fixture tests.

Workspace snapshot and fingerprint capture must finish the single index-writing `git write-tree` before starting its parallel read-only Git discovery. `resume` must additionally finish that complete status snapshot before starting `currentGitState`, whose `git status` may refresh the same index. Git Trace2 coverage owns both ordering boundaries so bounded file-level concurrency cannot expose a same-repository `index.lock` race.

## `TS-RELEASE-HANDOFF` — One Verified Artifact

Trusted Publishing uses a three-job graph inside one workflow run:

1. `windows-level4-runtime` builds once on Node 24 and serially runs exactly the acquisition and package-promotion boundary files without advisory skips;
2. Ubuntu `prepare` requires that Windows job, runs the complete package suite once, then packs once and runs exact-tarball smoke once;
3. it uploads the tarball plus a runtime attestation bound to the dispatch commit, stable lockfile identity and tarball SHA-256;
4. after the protected environment gate, `publish` downloads and verifies those exact bytes;
5. `publish` does not install dependencies, build, test, repack or repeat smoke;
6. a retry may skip npm publication only when the registry version and integrity already match the prepared artifact exactly.

`dry_run: true` executes only step 1 and artifact upload as an optional diagnostic. It is not required before `dry_run: false`, because a real run already performs the same prepare gate before publication. Node/npm versions are recorded as provenance but are not equality gates for the non-building publisher job. Lockfile hashing normalizes CRLF/LF only, so cross-worktree line endings do not cause false drift while semantic changes still block.

## `TS-OPTIMIZE` — Safe Runtime Reduction

Optimization must preserve independent false-completion interception.

1. Establish a fresh baseline with separate cold-build and test-only timing, at least five clean samples per supported benchmark environment, and per-file durations stored only as ephemeral CI artifacts. Until then, only controlled Ubuntu CI may use generous environment-specific catastrophic ceilings; do not impose narrow local or cross-environment wall-clock gates.
2. Classify test files by isolation: pure/static, isolated temporary repository, shared process/environment, Hook/profile mutation, or distribution/consumer smoke.
3. Parallelize only proven-isolated groups. Keep real Git races, shared Hook/profile state, process-environment mutation, and distribution flows serial until isolation tests prove otherwise.
4. Move combinatorial parser/classifier cases in-process where they do not need a CLI boundary. Retain at least one real CLI lifecycle per cross-boundary invariant.
5. Reuse setup only inside a sequential scenario whose state transitions are themselves under test. Do not share mutable fixtures merely to save time.
6. Remove or merge a case only when an invariant-coverage comparison and mutation sentinel prove that another case intercepts the same failure path.
7. When many value/field permutations cross one scenario-independent process wrapper, execute the permutations through the canonical stateless implementation owner and retain real CLI/process/persistence cases for every independently failing boundary. A test-only projection must not reimplement policy, persist authority or replace final integration coverage.

## `TS-ANTIDEGRADATION` — Semantic Continuity And Cost Governance

The self-contained delivery Source and provenance inventory are in `docs/test-suite-roi-antidegradation.md`; that Source includes the prior Goal/Receipt history, user requirements, screenshot dispositions, architecture choice, failure evidence, acceptance design and authorized Git delivery. This stable design section records only the implemented mechanism.

- Eighteen repository-owned records bind a stable semantic ID to one existing test file, required suite(s) and a review rationale. Fifteen records derive fourteen unique Trust files and three cover default-suite policy/CI continuity; there is no second Trust list or all-test-name manifest. `mechanism-causal-chain-continuity` protects the independent design/Context/current-implementation/owner-change chain. The additional `implementation-freedom-boundary` record protects `F`, optional Goal-owned multiple-agent execution and the no-development-Gate/no-scheduler/no-delegation-proof boundary. Both reuse the existing static design-consistency file, so the new invariant adds no Trust file, suite or runtime mechanism.
- A test title carries `[critical:<id>]`. The existing file reporter observes real terminal events and requires each suite's IDs exactly once, in the reviewed file, with passing status. It reports missing, unexpected, duplicate, misplaced and non-passing IDs, and folds any violation into the existing aggregate result.
- Count preservation is not semantic preservation: replacing a tagged test with an ordinary test fails even when file/test counts stay equal. A legitimate stronger equivalent changes the existing test and keeps its ID, or deliberately updates the one policy record/tag/rationale in review. Ordinary untagged test rename/addition has no registry cost.
- The same current-run report sorts every selected file by descending duration (filename tie-break) and retains the first ten `{file,duration_ms,status,test_count}` records. CI uploads those already-produced reports; it does not run a timing suite, retain historical green state or establish a performance authority.
- `github-ubuntu-v2` retains its historical 180/540/1200-second catastrophic ceilings and remains selected by Trusted Publishing. It was calibrated on 2026-08-13 from controlled Ubuntu artifacts: two 61-file default runs took 110.613 and 112.182 seconds, the Trust safe lane took 274.922 seconds before a semantic failure and its three unrun serial files took another 122.978 seconds in the complete run, and the complete 79-file Long-Task population took 925.041 seconds. Package CI now selects `github-ubuntu-v3`: only Trust changes to 630 seconds, derived from the PR #44 566039-ms observation plus a 10% margin rounded upward to 30 seconds; default remains 180 and complete Long-Task remains 1200 seconds. `github-ubuntu-v1` retains the former 120/240/600-second values. Unknown profiles, missing/non-positive suite budgets and environment mismatch fail closed; no profile means local diagnostic timing with no cross-machine budget claim. The former inline JSON configuration is retired.
- A failed aggregate exposed `long-task-authority-progress-retry.test.mjs` contending on Git `index.lock`; its immediate serial 7/7 rerun showed behavioral correctness and initially produced 11/38/11. Later clean-snapshot Final Gates exposed the same failure class in `long-task-state-resume.test.mjs` and safe-lane failures in `long-task-authority-revision-diagnosis.test.mjs` plus `long-task-finding-context.test.mjs`; their targeted serial reruns passed, a shared-seed concurrent probe reproduced the latter's `index.lock`, and the temporary classes became 11/35/14. A subsequent Gate then failed `long-task-global-evidence-sensitivity.test.mjs` and `long-task-qualified-completion.test.mjs`; the latter reproduced with file concurrency one. Git Trace2 proved `resumeDeliveryTask` started `currentGitState`'s `git status` before the workspace snapshot's `write-tree` exited in the same repository. The owner repair and six-file probe therefore restored the original reviewed 11/39/10 cohort. Four later explicitly reviewed files first expanded the classes to 12/42/10; a complete run then showed that `long-task-authoring-preflight.test.mjs`'s explicit wall-time assertion was contaminated by competing safe-lane load, so that measurement file moved to exclusive and the current classes are 12/41/11. Retrying or deleting Git locks remains forbidden.

The mechanism protects the existing complete-suite purpose and adds no result cache, historical timing baseline, persistent scheduler, second Authority or separate final invocation. Its runtime overhead is bounded to parsing existing test names and sorting the current file report; the expensive aggregate count remains unchanged.

The independent delivery verifier is an Authority-locked, self-contained oracle rather than a runtime implementation owner. Its scoped `fixture_snapshot` modularity waiver records owner, introduction date, reason, tracking identity and a hard lifecycle condition: retire the waiver with the verifier, and do not add behavior without an approved verifier split below project limits. This explicit exception avoids silently weakening the modularity gate or rewriting frozen proof after Authority Lock.

## `TS-PHASE4-SOURCE` — Runtime ROI Delivery Source

This section is the single real Source for the current Phase 4 delivery. It was synthesized under the user's explicit instruction to open one Goal, index every relevant detail, preserve the suite's design purpose, and optimize execution cost without materially reducing test effectiveness.

Input inventory and disposition:

- `USER-TEST-ROI-1`: the original three-part report. Its first two issues concern the missing Authority Revision approval summary and the first-lock model-choice stop. They are already represented by inherited workspace changes and are background only for this Goal. The third issue asks whether the Long-Task suite regressed and recalls the earlier affected/failed-only and finer-tier ROI redesign.
- `SCREENSHOT-APPROVAL`: `codex-clipboard-26fb5cc6-4e6d-431d-9477-2a7176e6df25.png`, SHA-256 `f54b7029b34426cb524183ca9f8cd80e012f88fd0bf2741ccfca22e91b833a2c`, visually shows an approval request that exposes only a revision identity without a human problem/change summary. Incorporated as background for the already-present approval-brief work; it supplies no test-ROI acceptance evidence.
- `SCREENSHOT-MODEL-STOP`: `codex-clipboard-83c28c67-f4be-4ac6-a7de-56b1b3df796c.png`, SHA-256 `c9748013d2b02bb898c1cdae16cf8ee346284ceb2dc04daf231e3b561fbc3218`, visually shows implementation continuing past the model-selection boundary before later stopping. Incorporated as background for the already-present strict checkpoint work; it supplies no test-ROI acceptance evidence.
- `USER-TEST-ROI-2`: preserve the test suite's design purpose/effect while adding anti-regression protection and reducing execution cost.
- `USER-TEST-ROI-3`: the previous Goal ran for about two hours and appeared to spend most of that time repeatedly running the suite; every run must have a defensible purpose.
- `USER-TEST-ROI-4`: perform one test-suite optimization based on design purpose, raise ROI without a large change in test effectiveness, explain the design, then open a dedicated Goal and index every required detail.
- `USER-TEST-ROI-5`: explicit scope confirmation that this Goal is dedicated only to test-suite ROI optimization.
- `OBS-WINDOWS-2026-07-22`: one uncontrolled but directly relevant Windows observation from the immediately preceding delivery: Trust 42/42 in about 671.5 seconds, default 44 files in about 128.3 seconds, Long-Task 60 files/281 tests in about 2,282.9 seconds, and the complete command in about 2,416.4 seconds. At least one separate Trust run was redundant before complete coverage; a stale `dist` run and lost timeout output also created avoidable cost. This is an operational baseline for this delivery, not a formal median or p95 benchmark.
- `REPO-STATIC-2026-07-23`: the current tree contains 44 default files, 60 Long-Task files and 11 Trust files. The original sorted 60-file Long-Task name set has SHA-256 `2588af5d3ebd640de78a295aa39482aaac6d5ece34958b3260d8f295b40daa37`. A bounded static scan found 380 obvious CLI/process call sites, 164 `createDeliveryFixture()` call sites and 370 explicit filesystem-mutation call sites. The shared fixture currently pays five Git subprocesses per creation (`init`, two `config`, `add`, `commit`), approximately 820 Git subprocesses before test-specific CLI work.
- `REPO-ROUTING-2026-07-23`: `run_affected_tests.mjs` already chooses one highest tier per plan. The regression is therefore not missing selection power; it is ambiguous guidance/manual invocation, unsafe `--no-build`, aggregate-only timing, and repeated fixture setup. The correct owner-level change is to expose aggregate dominance and make the canonical route unambiguous, not to add a second final-test workflow.
- `REPO-ISOLATION-2026-07-23`: a conservative static review initially identified 11 pure/static candidates, 41 isolated-temp-repository candidates and 8 exclusive-review candidates. Complete safe-lane executions exposed genuine cross-file interference in `long-task-delivery-compiler.test.mjs` and a Windows `EBUSY` cleanup failure in `long-task-playwright-trust-boundary.test.mjs`; both remain exclusive. Later `index.lock` failures across six `resume`-using files were load-amplified evidence of one same-repository coordinator defect: Trace2 showed `currentGitState`'s `git status` starting before the status snapshot's `write-tree` exited, and one failure reproduced with file concurrency one. After serializing that owner boundary and passing the six-file shared-seed concurrency-two probe, the original fail-closed classification returned to 11 pure/static, 39 isolated-temp-repository and 10 exclusive-review files. Subsequent explicitly reviewed additions plus the load-sensitive Authoring Preflight measurement classification make the current population 12/41/11. Performance measurements, Hook/profile, environment, distribution, verifier migration, genuine Git-race, Playwright/child-process lifecycle and every unknown/new file remain serial; the runner never retries or deletes Git locks.
- `WORKSPACE-2026-07-23`: execution stays in the currently selected `C:/Dev/worktrees/project-tiny-context-harness/development` workspace on its existing `codex/development` branch with inherited uncommitted changes. This delivery creates no branch, worktree, worker, subagent scheduler or parallel mutation plane.

Authoring mode is synthesis. The user fixed the material preference envelope: preserve false-completion interception and test effectiveness first, then minimize recurring execution cost; a measured or causally proven material saving is preferred over a marginal optimization. No external research, payment, deployment, publication, destructive mutation or human approval is required.

<!-- ty-source-item:start key=phase4-runtime-roi-result kind=outcome_result -->

On the same supported machine and a comparable test snapshot, the Long-Task package suite executes at materially lower cost, targets at least a 30% test-only wall-time reduction from the recorded 2,282.9-second Windows observation, and preserves the existing false-completion interception and complete current-snapshot release purpose.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=highest-aggregate-only kind=requirement -->

One canonical final invocation selects exactly one highest required aggregate tier; when complete release regression is selected it supersedes a separate Trust Boundary run.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=fresh-build-fingerprint kind=technical_obligation -->

`--no-build` must fail fast unless a deterministic fingerprint proves that `dist` was built from the current package source, configuration, package metadata, and lockfile inputs.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=ephemeral-file-timing kind=technical_obligation -->

Each package-suite invocation must report every selected test file's identity, duration, and terminal status in ephemeral diagnostics without caching a passing result or creating acceptance state.
<!-- ty-source-item:end -->

Implementation note for that obligation: if suite setup, fixture-seed preparation, or lane startup fails, the same report fails closed with the bounded execution error and missing-file accounting instead of disappearing. The Final Gate oracle retains a bounded failed-command diagnostic in structured observations and still produces its declared diagnostic artifact when a required carrier is absent, so current-snapshot and Counterfactual failures remain attributable rather than becoming artifact-missing noise.
The Receipt-facing diagnostic summary also retains suite counts and the bounded identities/messages of every non-passing file, so repair reruns can stay limited to failed and affected coverage even after the disposable Gate snapshot is removed.

The canonical complete aggregate reads repository Context as test input. A Long-Task execution snapshot therefore materializes the current `project_context/**` bytes for the Check runtime while continuing to exclude them from the ordinary candidate fingerprint, because the source-recompiled Gate binds them independently through `context_hashes`.
Static consistency checks use Git's tracked/deleted view in a live source workspace; in the immutable no-`.git` execution snapshot they prove the ignored runtime Hook was not materialized by checkout instead of requiring unavailable repository metadata.

Population acceptance still comes only from the complete current-run timing report. The Claim-bearing coverage Assertion and the 100% Population evaluator are separate Checks over the exact same raw execution identity: Final Gate executes the canonical complete command once, while Counterfactual sensitivity targets only the Claim-bearing Check and baseline Population completeness remains independently mandatory.

<!-- ty-source-item:start key=isolated-fixture-seed kind=technical_obligation -->

Fixture setup may be amortized through an immutable suite-scoped initialized seed, but every delivery fixture must copy into a unique temporary repository with an independent `.git` common directory, worktree, local configuration, no remote, mutation isolation, and deterministic cleanup; standalone test execution must retain a semantically equivalent fallback.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=conservative-isolation-lanes kind=requirement -->

Only explicitly reviewed pure/static or isolated temporary-repository files may use bounded concurrency beginning at two; Hook/profile, environment, distribution, verifier-migration, Git-race, and every unknown file remain serial until behavioral isolation proof exists.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=coverage-preservation kind=requirement -->

The optimized complete Long-Task runner must still discover the original 60-file set whose sorted-name SHA-256 is `2588af5d3ebd640de78a295aa39482aaac6d5ece34958b3260d8f295b40daa37` and execute at least the previously observed 281 Long-Task test identities with no missing, skipped, cancelled, or silently excluded case; new tests may add coverage but may not replace an original identity.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=rerun-discipline kind=technical_obligation -->

During implementation run only focused or affected repair checks; after a failure rerun failed and affected coverage; after the candidate is frozen run exactly one required highest aggregate with durable output and sufficient timeout, and do not run Trust before complete.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=cross-platform-runtime kind=technical_obligation -->

Implementation must preserve Windows and macOS path, process-launch, Git-copy, cleanup, and npm-script behavior.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=serial-rollback kind=technical_obligation -->

If isolation or concurrency equivalence is not proven, execution must fail closed or retain serial behavior, and the serial complete runner remains the mechanical rollback during rollout.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=prior-workflow-fixes-background-only kind=non_completing -->

Inherited approval-summary and first-lock stopping changes are context only and contribute no completion credit to this test-suite ROI delivery.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=no-coverage-trade kind=forbidden_shortcut -->

Do not obtain speed by deleting or weakening tests, sharing mutable fixtures, reusing historical green results, substituting proxy, fixed, or self-reported evidence, enabling unproven broad concurrency, or adding a persistent test scheduler, selection registry, result cache, Receipt, or second Authority.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=full-suite-population-risk kind=risk_fact fact=full_population_operation outcome=test-suite-roi -->

The preservation claim covers the full original Long-Task test population, so incomplete discovery or identity reporting must fail closed.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=routing-and-build-ac kind=acceptance -->

Given a complete-routed change and stale and current build inputs, when the canonical final route is inspected and `--no-build` is validated, then complete supersedes Trust, stale output is rejected before tests start, and output from the matching source snapshot is accepted.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=fixture-isolation-ac kind=acceptance -->

Given multiple fixtures created from the amortized seed, when one fixture's files, Git configuration, refs, and worktree are mutated, then every other fixture remains unchanged, uses a different common directory, has no remote, and preserves the legacy initial repository semantics.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=timing-and-lanes-ac kind=acceptance -->

Given the complete selected file set and the reviewed isolation policy, when the suite runs, then one ephemeral report contains one terminal record per selected file, the safe and exclusive lanes are disjoint and exhaustive, unknown files execute serially, and any opt-in concurrency result has the same test identities and terminal outcomes as serial execution.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=coverage-and-roi-ac kind=acceptance -->

Given the frozen final candidate, when the one highest complete aggregate executes with retained output, then the original 60-file Long-Task set and at least 281 prior test identities pass with zero skipped, cancelled, missing, or trust-mutation escape, and the measured test-only cost is compared honestly with the recorded Windows observation without being promoted to a cross-environment benchmark.
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=no-shortcut-ac kind=acceptance -->

Given the final implementation and diagnostics, when the optimization boundary is inspected, then inherited approval-summary and model-stop work contributes no completion credit and no forbidden coverage, authority, cache, shared-state, proxy-evidence, or unproven-concurrency shortcut is present.
<!-- ty-source-item:end -->

## `TS-MIGRATION` — Phased Implementation

### Phase 0 — Measure and Freeze Semantics (started)

- capture fresh Windows and macOS cold-build/test-only baselines;
- emit per-file timing as an ephemeral report;
- map every existing case to an invariant family and tier candidate;
- add mutation sentinels for high-risk trust boundaries before changing selection.

The fresh Windows default and two Trust Gate measurements are recorded above. Multi-sample Windows and macOS baselines remain a post-rollout measurement task; no median or p95 claim is made from these rollout samples.

### Phase 1 — Correct Routing (implemented)

- separate local dirty, local clean, CI merge-base, explicit `--base`, and explicit `--path` discovery;
- add selector tests for each source and every fail-safe widening path;
- keep existing full-suite behavior available as the rollback path.

### Phase 2 — Add the Trust Boundary Gate (implemented)

- add one canonical static selection source shared by the test runner and affected planner;
- add `test:long-task:trust` entry points at root and package level;
- update workflow entry-point tests and CI routing without removing the full release gate;
- prove the gate against the trust-boundary mutation sentinels.

### Phase 3 — Enforce Rerun Order (implemented as fail-safe routing, entry-point checks and guidance)

- add cheap parity/idempotence/side-effect checks before aggregate suites;
- document the diff-freeze and batched-repair policy in contributor verification guidance;
- report the selected tier and selection reason in command output.
- keep pull-request guidance on affected/focused plus frozen-candidate Trust, with complete regression conditional on the same routing rules as executable policy.

### Phase 3b — Prevent Routing/Cost Regression (implemented)

- omit and report only inferred local untracked `.work_products/**` scratch while preserving tracked and explicit-path fail-safe routing;
- fail policy load when reviewed Trust/focused/hotspot structural budgets are exceeded or duplicated;
- keep complete-suite discovery exhaustive and retain serial execution as the mechanical rollback;
- apply generous per-suite wall-time ceilings only when a controlled Ubuntu workflow opts in, preserving local diagnostics and all coverage.

### Phase 3c — Prevent Semantic And Diagnostic Regression (implemented)

- bind the small critical-invariant set to stable reviewed IDs and real passing test events without freezing ordinary test names;
- fail the existing aggregate on missing, replaced, duplicated, misplaced, unexpected or non-passing critical IDs;
- derive Trust membership from the same records, centralize controlled Ubuntu ceilings in one named profile and reject runner mismatch;
- emit deterministic current-run top-10 slow-file attribution and upload the same reports from PR, main and publish jobs without another test command;
- move disproven concurrent files to exclusive immediately; retain targeted serial success as repair evidence rather than evidence of isolation.

### Phase 4 — Optimize Runtime (implemented; current-snapshot acceptance remains owned by the delivery Final Gate)

- verify current package build identity before any `--no-build` reuse;
- emit exhaustive per-file timing without caching historical results;
- amortize Git initialization through immutable suite-scoped seeds while copying every fixture into an independent repository;
- run only the explicitly reviewed safe lane at bounded concurrency two, retain exclusive/unknown serial execution and keep concurrency one as rollback;
- compare representative A/B identities, outcomes and side effects before enabling concurrency, then use the one frozen-candidate Final Gate for full-population coverage and wall-time proof.

### Phase 5 — Review Coverage Overlap (post-rollout)

- consider deduplication only after at least 20 representative package changes or 30 days of CI data;
- retain a case when it is the only sentinel for an independent failure path, even if its recent failure yield is zero;
- tighten the full-suite budget only after the supported environments meet it consistently.

Expected implementation touch points:

- `tests/ty-context/run-package-suite.mjs`;
- `tools/run_affected_tests.mjs` and `tools/affected_test_selection.mjs`;
- root and package `package.json` scripts;
- `tests/ty-context/affected-test-selection.test.mjs` and workflow entry-point tests;
- package/publish workflows where the new gate is routed;
- Harness verification Context after behavior is implemented.

## `TS-METRICS` — ROI Review

Measure the workflow, not just one command:

- median and p95 wall time by tier, with build time reported separately;
- developer minutes from last source change to the final green candidate;
- number of complete-suite invocations per task;
- actionable-failure yield by tier;
- failures first found by the release tier that should have been caught by the Trust Gate;
- mutation-sentinel escape count, which must remain zero;
- flaky rerun rate and infrastructure-failure rate.

Initial success thresholds after 20 representative changes or 30 days:

- median local complete-suite invocations at or below one per task;
- at least 60% reduction in local complete-suite minutes versus comparable pre-change tasks;
- Trust Gate p95 at or below 8 minutes;
- zero trust-boundary mutation escapes;
- `main` Package CI and publish continue to run the complete release suite.

Timing reports are diagnostics, not Context, workflow state, Receipts, or acceptance authority.

## `TS-AC` — Acceptance and Rollback

The initial deployable rollout is complete. Long-term ROI closure still requires the multi-sample budget and review-window evidence described in `TS-METRICS`. The safety acceptance criteria are:

1. every test command has one documented purpose and authority boundary;
2. all current 264 cases remain reachable from the complete release suite during initial migration;
3. local dirty discovery is not widened by unrelated historical branch changes;
4. selector tests cover dirty-local, clean-local, CI, explicit-path, explicit-base, and unknown fail-safe cases;
5. Trust Gate mutation sentinels cover forged evidence, stale Source/Context, wrong revision approval, diagnosis mutation, compare-and-swap races, and post-gate drift;
6. `main` Package CI and publish retain the complete suite, while pull requests retain complete default plus Trust Boundary coverage;
7. the provisional tier budgets are confirmed by fresh supported-environment measurements or revised explicitly from evidence;
8. one invocation builds at most once and `--no-build` cannot be presented as safe across different source snapshots;
9. no result cache, persisted selection state, second authority, or test runner outcome is accepted as Delivery Contract proof;
10. the current full runner remains callable as a rollback until the new routing has completed its review period.
11. untracked local work products cannot silently widen an unrelated task, while tracked or explicit work-product paths still route fail safe;
12. Trust/focused/hotspot expansion requires an explicit reviewed budget update, complete discovery remains exhaustive, and controlled timing ceilings cannot be mistaken for acceptance evidence.

Rollback is mechanical: route package and CI scripts back to the current complete runner. No Contract, runtime state, Receipt, or migration data is required to reverse the test-tier selection.

## `TS-NONGOALS` — Safety Boundaries

This redesign does not:

- weaken or replace the Long-Task Final Gate;
- treat the Trust Gate or complete package suite as product acceptance;
- cache a test result for later authority;
- remove release coverage solely because it is slow;
- parallelize stateful tests without isolation proof;
- claim a formal benchmark from the motivating task's two timings;
- add a runtime workflow registry, scheduler, Receipt, or persistent task-test state;
- ignore tracked or explicitly supplied work-product paths, cap complete-suite discovery, or use a timing budget as permission to delete coverage;
- change current verification requirements before implementation and conformance are complete.
