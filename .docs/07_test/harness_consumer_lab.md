# Harness Consumer Lab Full Test

## Scope

- Package: `agent-project-sdlc@0.1.7`
- Source root: `/Users/momoooo/Documents/ProjectTemplate`
- Lab repository: `/Users/momoooo/Documents/sdlc-harness-consumer-lab`
- Lab commit: `9e004d1`
- Lab tag: `consumer-lab-full-0.1.7-20260526T204200Z`
- Started: 2026-05-26T20:42:33.502Z
- Finished: 2026-05-26T20:42:48.465Z

This script installs the package tarball into the lab and does not copy source-repo `tools/**` into the consumer repository.

## Summary

- PASS: 25
- BLOCKED: 11
- FAIL: 0
- Decision: BLOCKED

## Script Usage

~~~sh
node tools/consumer_lab_full_test.mjs --report-only --lab-dir /Users/momoooo/Documents/sdlc-harness-consumer-lab
node tools/consumer_lab_full_test.mjs --report-only --commit-lab --lab-dir /Users/momoooo/Documents/sdlc-harness-consumer-lab
~~~

Default reports are written to `/Users/momoooo/Documents/sdlc-harness-consumer-lab/.artifacts/consumer_lab_full_report.{json,md}`. Use `--reset-lab` only when the existing lab should be deleted and recreated; use `--commit-lab` only when a local evidence commit and tag should be created.

## Matrix

| Area | Evidence | Result | Details |
|---|---|---|---|
| Package smoke | npm pack current source package | PASS | agent-project-sdlc-0.1.7.tgz |
| Package smoke | install current source tarball | PASS | up to date, audited 3 packages in 1s  1 package is looking for funding   run `npm fund` for details  found 0 vulnerabilities |
| CLI lifecycle | init explicit .codex root | PASS | configured package.json sdlcHarness.harnessFolderName=".codex" Project is not empty; continuing with non-destructive init. Use --adopt to mark this as an existing project adoption. kept existing .codex/config.yaml created .codex/state/plan.yaml created .codex/state/plan.draft.yaml created .docs/INDEX.md sync changed=0 skipped=13 blocked=0 init complete |
| CLI lifecycle | doctor installed workspace | PASS | harness root: .codex core package: agent-project-sdlc@0.1.7 schema version: 1 doctor complete |
| CLI lifecycle | sync idempotency | PASS | sync changed=0 skipped=13 blocked=0 |
| CLI lifecycle | upgrade idempotency | PASS | migrations changed=0 skipped=15 sync changed=0 skipped=13 blocked=0 doctor warnings=0 errors=0 |
| Managed assets | expected generated files exist | PASS | 10 managed files checked |
| Adoption | init --adopt existing project | PASS | created .codex/config.yaml created .codex/state/lifecycle.yaml created .codex/state/plan.yaml created .codex/state/plan.draft.yaml created .codex/state/memory.md created .docs/INDEX.md sync changed=27 skipped=0 blocked=0 adopt mode complete |
| Configurable root | package.json#sdlcHarness.harnessFolderName | PASS | created .workflow/config.yaml created .workflow/state/lifecycle.yaml created .workflow/state/plan.yaml created .workflow/state/plan.draft.yaml created .workflow/state/memory.md created .docs/INDEX.md sync changed=27 skipped=0 blocked=0 adopt mode complete |
| Local overrides | known Skill override appends Local Override | PASS | override appended |
| Local overrides | unknown Skill override blocks sync | PASS | sync changed=0 skipped=4 blocked=1  blocked: unknown skill override: .codex/pjsdlc_managed/override_skills/pjsdlc_unknown.md |
| Local policy overrides | *.local.yaml preserved across sync | PASS | local policy preserved |
| Toy project | node:test fixture | PASS | ℹ tests 2 ℹ suites 0 ℹ pass 2 ℹ fail 0 ℹ cancelled 0 ℹ skipped 0 ℹ todo 0 ℹ duration_ms 69.957 |
| CLI validators | validate-harness | PASS | validate-harness checked /Users/momoooo/Documents/sdlc-harness-consumer-lab (.codex) |
| CLI validators | validate-current | PASS | validate-pm checked 1 file(s) |
| CLI validators | validate-pm | PASS | validate-pm checked 1 file(s) |
| CLI validators | validate-design | PASS | validate-design checked 2 file(s) |
| CLI validators | validate-dev final empty plan | PASS | validate-dev checked 0 task(s) |
| Task protocol | done task retained in plan is rejected | PASS | validate-dev checked 1 task(s)  error: Completed task DEV-001 must not remain in plan.yaml |
| Task protocol | open task retained is rejected by completion gate | PASS | validate-dev checked 1 task(s)  error: Open tasks remain: DEV-001 |
| Parallel execution | valid explicit user_requested contract | PASS | validate-dev checked 0 task(s) |
| Parallel execution | automatic trigger is rejected | PASS | validate-dev checked 0 task(s)  error: parallel_execution.trigger must be "user_requested" |
| Natural-language control | static AGENTS/manager routing text | PASS | natural-language routing text present |
| Makefile gates | make validate-harness | BLOCKED | consumer repo is missing generated Makefile tools/** dependency |
| Makefile gates | make validate-current | BLOCKED | consumer repo is missing generated Makefile tools/** dependency |
| Makefile gates | make validate-review | BLOCKED | consumer repo is missing generated Makefile tools/** dependency |
| Makefile gates | make validate-test | BLOCKED | consumer repo is missing generated Makefile tools/** dependency |
| Makefile gates | make validate-release | BLOCKED | consumer repo is missing generated Makefile tools/** dependency |
| Docs overview | make docs-overview | BLOCKED | consumer repo is missing generated Makefile tools/** dependency |
| Lifecycle transition | python3 tools/transition.py --to ARCHITECTING | BLOCKED | consumer repo is missing generated Makefile tools/** dependency |
| Later-stage CLI validators | npx sdlc-harness validate validate-review | BLOCKED | package CLI does not expose this later-stage validator yet |
| Later-stage CLI validators | npx sdlc-harness validate validate-test | BLOCKED | package CLI does not expose this later-stage validator yet |
| Later-stage CLI validators | npx sdlc-harness validate validate-release | BLOCKED | package CLI does not expose this later-stage validator yet |
| Later-stage CLI validators | npx sdlc-harness validate validate-rfc | BLOCKED | package CLI does not expose this later-stage validator yet |
| GitHub Actions | workflow asset static coverage | PASS | static workflow asset checked; remote GitHub Actions execution is out of scope |
| Release automation | release automation static coverage | PASS | npm publish is out of scope for consumer lab |

## Blocked Items

- Makefile gates: make validate-harness (consumer repo is missing generated Makefile tools/** dependency)
- Makefile gates: make validate-current (consumer repo is missing generated Makefile tools/** dependency)
- Makefile gates: make validate-review (consumer repo is missing generated Makefile tools/** dependency)
- Makefile gates: make validate-test (consumer repo is missing generated Makefile tools/** dependency)
- Makefile gates: make validate-release (consumer repo is missing generated Makefile tools/** dependency)
- Docs overview: make docs-overview (consumer repo is missing generated Makefile tools/** dependency)
- Lifecycle transition: python3 tools/transition.py --to ARCHITECTING (consumer repo is missing generated Makefile tools/** dependency)
- Later-stage CLI validators: npx sdlc-harness validate validate-review (package CLI does not expose this later-stage validator yet)
- Later-stage CLI validators: npx sdlc-harness validate validate-test (package CLI does not expose this later-stage validator yet)
- Later-stage CLI validators: npx sdlc-harness validate validate-release (package CLI does not expose this later-stage validator yet)
- Later-stage CLI validators: npx sdlc-harness validate validate-rfc (package CLI does not expose this later-stage validator yet)

## Defect Candidates

| ID | Area | Evidence | Impact |
|---|---|---|---|
| LAB-001 | Makefile gates | make validate-harness | consumer repo is missing generated Makefile tools/** dependency |
| LAB-002 | Makefile gates | make validate-current | consumer repo is missing generated Makefile tools/** dependency |
| LAB-003 | Makefile gates | make validate-review | consumer repo is missing generated Makefile tools/** dependency |
| LAB-004 | Makefile gates | make validate-test | consumer repo is missing generated Makefile tools/** dependency |
| LAB-005 | Makefile gates | make validate-release | consumer repo is missing generated Makefile tools/** dependency |
| LAB-006 | Docs overview | make docs-overview | consumer repo is missing generated Makefile tools/** dependency |
| LAB-007 | Lifecycle transition | python3 tools/transition.py --to ARCHITECTING | consumer repo is missing generated Makefile tools/** dependency |
| LAB-008 | Later-stage CLI validators | npx sdlc-harness validate validate-review | package CLI does not expose this later-stage validator yet |
| LAB-009 | Later-stage CLI validators | npx sdlc-harness validate validate-test | package CLI does not expose this later-stage validator yet |
| LAB-010 | Later-stage CLI validators | npx sdlc-harness validate validate-release | package CLI does not expose this later-stage validator yet |
| LAB-011 | Later-stage CLI validators | npx sdlc-harness validate validate-rfc | package CLI does not expose this later-stage validator yet |

## Failures

- None

## Recommended RFC

- Title: RFC: Close installed-consumer workflow coverage gaps
- Impact areas: README, PROJECT_SPEC, package CLI, Makefile assets, validators, tools, tests, Makefile gates, Docs overview, Lifecycle transition, Later-stage CLI validators
