# DRA Production-Handoff Closure — Recovery Index

This is an ordinary repository recovery locator for the current native Goal. It is not Context, Design/Technical Authority, a Delivery Contract, a Gate, workflow state, readiness state or acceptance evidence. It does not activate `long-task-workflow`.

## Authority order

1. current user instruction;
2. S5 controlling amendment in the exact S3 block between `S5-CONTROLLING-AMENDMENT:BEGIN` and `S5-CONTROLLING-AMENDMENT:END`;
3. S4 controlling amendment in S3 Sections 17.1–17.17 where S5 does not supersede it;
4. earlier S3 execution source and S2 corrections/accepted audit findings;
5. S1 details not superseded by S2/S4/S5;
6. current durable repository Context and Design Authority;
7. code as implementation fact only.

## Immutable input identities

- S1: `attachment-provenance://a1cf06fd-5881-411a-bcca-7067c34efe77/pasted-text.txt`; 1677 lines at Goal creation; SHA-256 `849F33E9D0EC60C28A531F9A683482E4DEB5500687CA9E2FBD92CE03AF8030F9`.
- S2: `attachment-provenance://304e7440-f6fa-416b-933b-a3582acec71b/pasted-text.txt`; 1277 lines at Goal creation; SHA-256 `CA4137FE4B3C0780C17B58826249F1B84E4EDFB936948CE12CDABE3D843A03C3`.
- S3: `.work_products/dra-production-handoff-closure/EXECUTION_SOURCE.md`; 2360 lines after the final S5 append; SHA-256 `6F8D27533FE86CF7503CC81EAFF7DD7F57A1396E3C1F2FE06ADC364527E734B1`.
- S4: S3 Sections 17.1–17.17, the durable execution projection of the current user message titled `DRA Production-Handoff Closure 补开发方案`; fixed implementation baseline `c46e1f59961e8735b2ac76d0534a1d0995f05323`; S4 overrides earlier S3/S2/S1 wherever stricter.
- S5: exact 1320-line source block in S3 beginning at line 1039 and ending at line 2360; original provenance `attachment-provenance://452528f5-e136-4b6a-a205-88532d3b9480/pasted-text.txt`; SHA-256 `1BDAE56602A375EDBCD9845368DD2834B344786AC5F83ACEAE115E623EB64713`; fixed implementation baseline commit `749aef74525368f63f45dbb24890b2547131c0b5`, tree `bcf3b2cbc878b980177a57ed5879d20b83fb453a`, package `project-tiny-context-harness@0.8.17`. S5 is final and overrides S4/S3/S2/S1 wherever stricter.

The S3 digest recorded in the native Goal objective (`2D486A8E3F9602CB0574A866CA701FD6C0D8F34A2F76CBEC87DC635EABD04F4B`) identified the pre-portability revision and is superseded for repository recovery by the S3 identity above. The Goal objective remains the current-session machine-local lookup owner for the original attachments; repository files deliberately retain only non-resolvable provenance locators.

## S5 hard-precondition snapshot

After `git fetch --prune origin` on 2026-08-24 Asia/Shanghai, the task worktree was clean and `HEAD`, local `main`, `origin/main` and their merge base were all `749aef74525368f63f45dbb24890b2547131c0b5`, with ahead/behind `0/0`; the fixed tree was `bcf3b2cbc878b980177a57ed5879d20b83fb453a`. npm returned `E404` for `project-tiny-context-harness@0.8.17`, `git ls-remote` found no `v0.8.17` tag and GitHub reported no `v0.8.17` release. These facts authorized the unpublished V1 in-place semantic repair; they are not final-candidate evidence and must be refreshed where S5 requires current verification.

The pre-delivery refresh on 2026-08-24 repeated `git fetch --prune origin` from the isolated worktree. Before the delivery commit, `HEAD`, local `main`, `origin/main` and both merge bases were still `749aef74525368f63f45dbb24890b2547131c0b5`, with `0/0` ahead/behind and the baseline present in both main refs. npm still returned `E404` for exactly `project-tiny-context-harness@0.8.17`; `git ls-remote --tags` still returned no `v0.8.17`, and `gh release view` returned `release not found`. The original worktree remained on `main` at `749aef` and had 165 unrelated working-tree entries from its separate task. No original-worktree file, index or local `main` ref was changed by this Goal; only shared `origin/*` remote refs were refreshed.

## Recovery route

1. Read this index and verify S3's current line count and digest.
2. Read the exact S5 block first; it contains the complete scope, P0/P1/P2 rules, adjacent boundaries, code/Context/Skill/doc surfaces, test matrix, implementation order, Windows transient policy, final verification theorem and report format.
3. Reopen `project_context/global.md`, `project_context/architecture.md`, `project_context/context.toml`, `project_context/areas/harness-package.md`, the bounded matched owner Context, `.codex/skills/authoring/harness_package_design/SKILL.md` and its five required references, and `.codex/skills/context_development_engineer/SKILL.md` plus `references/engineering-design-reasoning.md` before further implementation changes.
4. Use S4 Sections 17.1–17.17 and earlier S3/S2/S1 only where S5 does not supersede them.
5. Resume in `E:/dev/worktrees/project-tiny-context-harness/scratch-20260824` on branch `codex/scratch-20260824`; never reconstruct completion from conversation memory, historical Receipts or generated results.

## Implemented closure index

The final candidate repairs the existing DRA/Long-Task boundary without introducing a second Design/Technical Authority, production Binding type, Contract field family, Claim type, Gate, Registry, state machine or workflow:

- `substrate_observation_refs` is required, unique and canonical on implementation-feasibility blockers. Its projection to Source decision items is exact, and every unresolved observation covers every affected family-by-condition material cell. Stale, missing-family and zero-cell projections fail closed.
- Candidate cells require non-empty observed owner roots. Every actual `file`, `path_glob`, `verified` or `planned` production Binding path/pattern must be a proven subset of an observed owner root; `not_subset` and `unknown` fail closed, and planned carriers cannot be empty.
- Blocker-only targets may traverse the complete in-memory Activation/Compile path with `component_binding_refs=[]`; the standalone structural validator remains strict. Source-aware closure accepts only all-blocker-only deferral, then the existing `decision_required` or target-blocking External Confirmation boundary produces `blocked_external`. Only affected blocked design assertions and matching counterfactuals are projected out of machine execution; the raw Contract and sole Final Gate authority are unchanged.
- Mixed-target attribution is aggregated per target, freshness reparses the current raw Contract, and legacy/route-root/candidate-plus-blocker paths remain fail closed. Permanent visual values, motion duration semantics and explicit technical time costs are separated; unqualified time-like design values fail closed.
- Direct-command observation now matches Windows processes by PID plus creation identity and closes process trees through explicit table/tree modules, preventing a reused PID from being mistaken for the spawned command. Explicit `TY_CONTEXT_LONG_TASK_ISOLATED_CONCURRENCY=1` runs one Node process per selected Long-Task test file; the default suite policy remains unchanged.

### Runtime and validator files

- `packages/ty-context/src/lib/design-resource-implementation-feasibility-shape-sections.ts`
- `packages/ty-context/src/lib/design-resource-implementation-feasibility-source-decision-projection.ts`
- `packages/ty-context/src/lib/design-resource-implementation-feasibility-types.ts`
- `packages/ty-context/src/lib/design-resource-implementation-feasibility-validation-cells.ts`
- `packages/ty-context/src/lib/design-resource-implementation-feasibility-validation-document.ts`
- `packages/ty-context/src/lib/design-resource-implementation-feasibility-validation-support.ts`
- `packages/ty-context/src/lib/long-task-activation-validation.ts`
- `packages/ty-context/src/lib/long-task-delivery-validation.ts`
- `packages/ty-context/src/lib/long-task-design-feasibility-binding-owners.ts`
- `packages/ty-context/src/lib/long-task-design-feasibility-binding.ts`
- `packages/ty-context/src/lib/long-task-design-feasibility-source-closure.ts`
- `packages/ty-context/src/lib/long-task-design-resource-handoff.ts`
- `packages/ty-context/src/lib/long-task-freshness.ts`
- `packages/ty-context/src/lib/long-task-ui-surface-policy.ts`
- `packages/ty-context/src/lib/long-task-ui-surface-validation.ts`
- `packages/ty-context/src/lib/long-task-check-runner.ts`
- `packages/ty-context/src/lib/long-task-command-process.ts` (new)
- `packages/ty-context/src/lib/long-task-process-table.ts` (new)
- `packages/ty-context/src/lib/long-task-process-tree.ts` (new)

### Routing and regression files

- `tools/affected_test_selection.mjs`
- `tools/test_suite_lane_policy.mjs`
- `tests/ty-context/run-package-suite.mjs`
- `tests/ty-context/affected-test-selection.test.mjs`
- `tests/ty-context/design-resource-authoring-skill.test.mjs`
- `tests/ty-context/design-resource-handoff-fixture.mjs`
- `tests/ty-context/design-resource-implementation-feasibility.test.mjs`
- `tests/ty-context/long-task-delivery-compiler.test.mjs`
- `tests/ty-context/long-task-direct-process-observer.test.mjs`
- `tests/ty-context/long-task-pattern-containment.test.mjs`
- `tests/ty-context/test-suite-runtime.test.mjs`

The regression matrix includes blocker-only external/decision/missing-boundary cases; planned-owner full Compile; mixed target attribution; stale blocker and decision blocker cases; legacy and route-root non-applicability; candidate-plus-blocker closure; every-path pattern containment; visual/motion/technical duration classification; freshness against the current raw Contract; affected-routing promotion; and same-PID/different-creation-identity observation.

### Synchronized public, package and compact-authority surfaces

- DRA guidance is byte-identical at `.codex/skills/design-resource-authoring`, `.codex/ty-context-managed/skills/design-resource-authoring` and `packages/ty-context/assets/skills/design-resource-authoring` for `SKILL.md` and the three changed references. The SHA-256 values are respectively `DB126D1C4A5597AF2DA7C0B2F00C86263BC548BD46205002CA25C092959B2C66`, `29E0D274124C1EDD8E2908438A5D369284606716A516CDEB00DA4583A75E488E`, `B436E4B555E206248D5D93072C85BB2336ADB80A9E75B4AF30D41793C5252005` and `6A9AF7A54C42BD173A483A1C45A6681338CD9AF521F76C8EA4F8B0CFA8B41DCE`.
- Public/package surfaces: `PROJECT_SPEC.md`, `README.md`, `README.zh-CN.md`, `packages/ty-context/README.md`, `packages/ty-context/assets/README.md`, `packages/ty-context/assets/README.zh-CN.md`, `docs/launch/github-release-0.8.17.md`, `docs/test-suite-roi-redesign.md` and `docs/symbolic-denotation-efficiency.md`.
- Compact-source surfaces: `.work_products/symbolic-denotation-efficiency/delivery-contract.yaml` and `examples/delivery-benchmark/mechanism/admission-set.json`. The final compact carrier contains 113 Facts, 113 obligations and 132 inputs; its Contract `semantic_fact_manifest.sha256` is `827e93c13df1818a9470ad1589defa7b008b4b9d37d534d932a89c3c097d6f6a`.
- Recovery surfaces: this index and `.work_products/dra-production-handoff-closure/EXECUTION_SOURCE.md`. The latter remains exactly 2360 lines with SHA-256 `6F8D27533FE86CF7503CC81EAFF7DD7F57A1396E3C1F2FE06ADC364527E734B1`.

## Context Delta

The exact durable Context owners changed by this closure are:

- `project_context/areas/harness-package/contracts/design-resource-authoring.md`
- `project_context/areas/harness-package/contracts/design-resource-handoff.md`
- `project_context/areas/harness-package/contracts/workflow-contract.md`
- `project_context/areas/harness-package/implementation-index.md`
- `project_context/areas/harness-package/verification.md`

No other file is asserted as a Context owner for this amendment.

## Verification record

All results below belong to the same frozen tracked candidate except this recovery-only index update. The candidate build fingerprint is source input SHA-256 `1d7d07bd8ade11d34591c4a928853a1576a5a7e61b1fc1d17298f224f0efbe95` over 421 files and `dist` SHA-256 `188b08a081815fb0db3597a5c2d1a6ba0f87d7886054b5f8e45663fd894dd833` over 830 files.

### Complete package regression

- Final full affected/release-regression run r10 used no cache and no reduced suite. It set only the explicit Long-Task file-isolation switch and ran `npm run test:affected` from the worktree.
- Default lane: status `passed`; 66 files; 411 selected tests; 410 passed; one expected skip; zero failed/cancelled/missing; wall time 207077 ms; critical sentinels 3/3.
- Long-Task lane: status `passed`; 85 files; 585 tests; all 585 passed; zero failed/skipped/cancelled/missing; wall time 3568948 ms; critical sentinels 29/29; maximum one selected file per Node process.
- The log has 86 summary blocks and zero failure lines. Local ignored forensic files are `.artifacts/test-suite/affected-serial-r10.log` (445789 bytes, SHA-256 `083D0A744DCC03341CF97B3857C8D2B8CB8FCC7070EFC1A524CAC9CE2B70C63F`) and `.artifacts/test-suite/affected-serial-r10.exit` (value `0`, SHA-256 `9A271F2A916B0B6EE6CECB2426F0B3206EF074578BE55D9BC94F6F3FE3AB86AA`). The exact invocation is retained locally as `.artifacts/test-suite/run-affected-serial-r10.ps1`.
- The delivery compiler regression file passed 22/22 inside r10, including componentless blocker-only `blocked_external`, planned owner containment, stale blocker, decision blocker and target-drift cases.

### Preserved Windows transient history

- Earlier complete serial attempts r4/r5 observed forged-evidence CLI processes exiting without stdout/stderr; r6 observed a compact-carrier transient; r7 observed a package-promotion worker exit; and r8 observed a Final-Gate mutation worker exit. Their exact isolated cases passed.
- After adding process creation-identity observation, the targeted process soak passed forged evidence 1/1 in 155740 ms, Final-Gate mutation 1/1 in 94404 ms and level-4 package promotion 6/6 in 260224 ms.
- r9 preserved one mechanical failure: `long-task-verification-preview.test.mjs` invoked `git diff --binary --no-ext-diff`, which exited 1 with empty stdout and only LF-to-CRLF warnings on stderr. The rest of that run passed 528/529 Long-Task tests, all 29 critical sentinels passed, and nine later files were not selected because fail-fast stopped the lane. The preserved ignored log is `.artifacts/test-suite/affected-serial-r9.log` (430150 bytes, SHA-256 `B21F4D43E75CE6ED01A3FA793A50DD370090DF2378F890B156D3651B690381E9`).
- The r9 case then passed standalone 2/2 and in five consecutive complete file reruns. The actual-workspace fingerprint probe ran the same Git operation 200 times with zero failures (`core.autocrlf=true`, `safecrlf` unset). The unchanged candidate subsequently passed the complete r10 run, including that file 2/2. Therefore r9 is retained as a non-reproducible Windows mechanical transient, not erased or counted as candidate acceptance.

### Final command and package checks

- Passed: `npm run format:check`, package workspace TypeScript typecheck, package workspace build, `npm run release:check-version`, `make validate-harness`, `ty-context package check-source`, three-copy DRA parity, `npm run verify:active-source-portability`, `npm run test:structural-cost`, and `npm run test:affected:list`.
- `validate-harness` passed Minimal Context and audited 30 touched modules with zero modularity warnings and zero waivers. Active-source portability passed 99 files with zero violations. Structural-cost status was `passed` against baseline SHA-256 `8906dc5e5c3fa02a79002c55dee04e10237c55ba74b4d53ca6f9f016e09af6d5`.
- Affected routing selected `mode=full-suite`, `tier=release-regression`, `requires_build=true`, which is satisfied by r10 rather than by a reduced list.
- Source preview packing produced `project-tiny-context-harness-0.8.17.tgz`, 821512 bytes, SHA-256 `1EAC85F8D1B82B1D4F93D60E5C94F2F2FE79297212A844E3757E63BDC443C67B`. Quickstart smoke passed. Offline launch readiness passed. Tarball smoke passed portable checks plus Long-Task delivery-v2 compile and Live Final Gate acceptance.
- A separate new repository under the system temporary root installed that tarball, initialized Git/npm, ran `ty-context init`, ran an idempotent `sync` (`changed=0`, `skipped=23`, `blocked=0`), validated Minimal Context, and found all nine required generated surfaces. Its `project_context/context.toml` SHA-256 was `279573F205314CC16D1EBAADC5229EA933634294F78192F7BEF188386872CB33`; the temporary repository was then moved to the Windows Recycle Bin and remains recoverable there until the bin is emptied.

## Deliberately not verified

These external/product outcomes remain outside this code-completion theorem and must not be upgraded into claims:

- live Open Design visual-generation quality;
- actual multi-route visual diagnostic results;
- real-product adoption effect.

No npm publish, Git tag, GitHub Release or merge into `main` is part of this Goal. The delivery branch is `codex/scratch-20260824`; its parent baseline is `749aef74525368f63f45dbb24890b2547131c0b5`.

This amendment is executed by the native Goal under the default Workflow Contract. It must not bootstrap `long-task-workflow`; Long-Task is only an affected interoperability and verification surface. The Source file, Recovery Index and native Goal are recovery aids, not Design/Technical Authority, Contract, Gate, state, readiness or acceptance evidence.
