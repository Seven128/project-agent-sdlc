# Skills, Prompt Routing and Authoring Implementation

## 1. 关联信息

- Domain: `harness_workflow`
- Module / subsystem / core flow: workflow Skills, prompt routing, hard/soft indexing and authoring overlay
- Updated by task: `DEV-014`, `DEV-016`, `DEV-017`, `DEV-021`, `DEV-023`, `DEV-029`, `DEV-036`, `DEV-037`, `DEV-038`, `DEV-039`, `DEV-040`, `DEV-043`, `DEV-044`, `DEV-046`, `DEV-049`, `DEV-050`, `DEV-055`, `DEV-056`, `TASK-057`, `TASK-060`, `TASK-061`, `TASK-066`, `TASK-067`, `TASK-069`, `TASK-070`, `TASK-071`, `TASK-072`, `TASK-076`, `TASK-079`
- Linked PRD: `.docs/01_product/npm_package_distribution.md`
- Linked technical design: `.docs/03_tech_plan/harness_package_distribution.md`, `PROJECT_SPEC.md`
- Linked RFC: `RFC_007`, `RFC_009`, `RFC_015`, `RFC_017`, `RFC_018`, `RFC_019`, `RFC_020`, `RFC_021`, `RFC_024`
- Linked commits: historical `DEV-*` implementation commits; `DEV-043` migration commit; `DEV-049` implementation commit; `DEV-050` implementation commit

## 2. 当前实现范围

- Workflow roles are represented as local Skills under `<harnessRoot>/skills/pjsdlc_*/SKILL.md`.
- `AGENTS.md` provides the deterministic soft index from lifecycle state to `active_skill`.
- Native Agent skill hydration, when supported by the client, is a separate hard-index mechanism based on the client-specific skill root.
- Natural language intent and `/xxx` macro aliases map to the same workflow actions.
- Project-local role prompt additions live under `<harnessRoot>/pjsdlc_managed/override_skills/<skill_name>.md` and are appended to managed Skill output by `sdlc-harness sync`.
- Override files support plain snippets and complete `SKILL.md` extensions with `name`/`description` frontmatter; complete extensions merge their `description` into final Skill metadata and append their body after stripping override frontmatter.
- The generated `Local Override` block tells maintainers and downstream agents to check the merged Skill for semantic conflicts between package base rules and project-local override rules.
- This authoring repository keeps a private authoring Skill under `.codex/skills/authoring/**`; package source sync excludes it from user projects.
- The authoring Skill requires README/package README coverage to stay aligned with all public package capabilities.
- PM, Architect, Manager, Dev, Reviewer, Tester, Release and RFC prompts now describe default parallel eligibility checks, Codex native subagent scheduling, fallback modes and final fact-source integration with the main agent.
- PM and Architect prompts require deleting the superseded monolithic PRD/product or tech plan file after user-requested slicing creates replacement slices and updates the related fact-source references.
- Architect prompt now treats semantic design slicing as a `make validate-design` hard gate: `plan.draft.yaml` development tasks must reference `docs.tech_plan`, multiple draft tasks need distinct primary tech plan slices, generated `overview.md` cannot satisfy design deliverables, and explicit cross-cutting themes require dedicated architecture slices.
- Manager, PM and Architect prompts now describe the development-before rollback path from `ARCHITECTING` to `REQUIREMENT_GATHERING` for PRD edits, while preserving RFC workflow for changes after `SPRINTING`.
- PM, Architect, Reviewer, Tester, Release and RFC prompts now require each main workflow action to run as one small `TASK-*` `plan.yaml` task with `phase` metadata. This covers conversational generation, existing-document slicing, synthesis from prior fact sources, review batches, test evidence, release preparation and RFC recalibration.
- Dev, Review, Tester and Implementation Doc prompts now treat runnable entry/exit as a hard phase boundary: SPRINTING must implement or block promised API/CLI/adapter/provider/config/fixture-live boundaries, REVIEWING must block missing entry/exit, and TESTING may only exercise existing entrypoints.
- Review, test and implementation templates include runnable entry/exit sections. `validate-review` and `validate-test` require entry/exit evidence text, and TESTING validators reject runtime, bootstrap, provider, deploy or package runtime script changes.
- TESTING distinguishes `.docs/07_test/TEST_STRATEGY.md`, `.docs/07_test/TEST_CASES.md` and `.docs/07_test/TEST_REPORT.md`; `TEST_REPORT.md` is execution-only evidence and `validate-test` no longer falls back to `TEST_PLAN.md`.
- RFC recalibration now records `Test Fact Source Impact` and removes superseded `.docs/07_test/**` files from current test facts and `.docs/INDEX.md` when a route, entry/exit or acceptance boundary changes.
- `validate-dev` now requires implementation docs to include `Runnable Entry/Exit` facts or explicit `Not applicable`, so missing runtime boundaries cannot be deferred into TESTING by omission.
- `validate-dev` now requires the current open SPRINTING task implementation doc to include structured `Development Evidence`: `Runnable Entry`, `Observable Exit`, `Basic Self-test Evidence`, or a justified `Not applicable`.
- `validate-dev` now treats service / agent / runtime readiness as stronger than provider or fixture smoke: current task evidence must include `Client / Server Initialization` and `Config Contract`, and provider smoke, fixture smoke, fake adapter or one-shot smoke cannot alone satisfy application readiness.
- `validate-dev` now promotes runtime readiness into the task contract: runtime/app/provider/live SPRINTING tasks declare `evidence_level.required` and `target_runtime_environment`, `deployed_runtime` cannot be closed by lower-level smoke, and `business_handoff_ready` requires a Testing Handoff Contract.
- `validate-design` and `validate-dev` now enforce `self_test_contract`: design binds runnable-boundary tasks to a tech plan `Development Self-Test Contract`, and development requires a completed implementation doc `Development Self-Test Report` before handoff.
- Development Self-Test Contract / Report now require `module_key_test_path` / `Module Key Test Path`, recording the module key test path from local start or invocation to all self-test scenarios completion. The path is scoped to the current task/module and covers promised runnable entries, internal key paths, boundaries, checkpoints and observable completion evidence for later debug reuse.
- Dev and Implementation Doc prompts now treat `Development Self-Test Report` as a development deliverable, separate from code/config/test implementation artifacts. When `self_test_contract.status: "required"`, agents must execute the current scenarios and required gates before writing the report; historical reports, template fields, code reading or unrelated green gates cannot stand in for current-run evidence.
- Development Self-Test Report now has an explicit boundary: it must include `Report Status: PASS | BLOCKED | IN_PROGRESS | STALE`, prove only module entry/core path/exit/minimal evidence, and must not become a debug log, operator log, runbook or exploration history.
- The authoring-only Harness design prompt now states the lightweight-constraint principle: workflow changes should first align Agent attention with the `PROJECT_SPEC.md` purpose, and heavier validation or execution mechanisms are reserved for heavy logic when issues repeat, risk is high, or machine proof is required.
- `validate-rfc` now requires `Development Self-Test Impact` for new RFCs that change entry/exit, runtime, gates, handoff or blocker semantics.
- `validate-review` now requires explicit PASS/BLOCKED readiness fields for `Runnable Entry`, `Observable Exit`, `Initialization`, `Config Contract` and `Testing Handoff Readiness`; any `BLOCKED` field blocks TESTING handoff.
- `validate-review` and `validate-test` now reject `PASS` reports that acknowledge runtime/handoff mismatch, missing deployment, missing initialization, local-only evidence or fake adapters.
- `validate-test` now rejects `PASS` reports that acknowledge missing runnable entry/exit or missing `Development Evidence`; TESTING must report `BLOCKED` with recovery conditions instead.
- Dev and Manager prompts now distinguish direct SPRINTING `validate-dev` from phase-exit `validate-current`: direct dev gate allows a valid current open task, while phase advancement still requires no open tasks.
- RELEASING uses `.docs/08_release/CURRENT_RELEASE.md` as the canonical current release status. `validate-release` keeps accepting legacy versioned release docs when the current file is absent, but new release work updates the current status file instead of creating a version ledger.

## Runnable Entry/Exit

- Entry points: workflow Skills under `<harnessRoot>/skills/**`, managed templates/policies, Python validators, package `validate-*` commands and package source sync.
- Exit / side effects: updated prompts and validators govern phase behavior; `package sync-source` materializes distributable assets.
- Config contract: `AGENTS.md`, `.codex/pjsdlc_managed/**`, `packages/sdlc-harness/source-mappings.yaml`, `.docs/07_test/TEST_REPORT.md`.
- Fixture/live boundary: workflow contract only; TESTING may add fixtures/mocks/assertions/smoke runners under `tests/**` but cannot introduce product runtime/provider/bootstrap/deploy code.

## Development Evidence

- Runnable Entry: CLI command `npx sdlc-harness validate-dev` / `make validate-dev` validates the current SPRINTING task evidence contract through `packages/sdlc-harness/src/lib/validators.ts`.
- Observable Exit: Validator output reports PASS or concrete errors for missing `Development Evidence`, missing `Observable Exit`, missing `Client / Server Initialization`, missing `Config Contract`, missing `Basic Self-test Evidence`, missing `Module Key Test Path`, insufficient lower-level smoke, UI evidence gaps, or callable invocation/result gaps.
- Evidence Level: current task contract requires `local_runtime`; validator source and package CLI execute as local runtime checks.
- Target Runtime Environment: current task contract uses `local` with `npx sdlc-harness validate-dev` as the handoff entrypoint.
- Client / Server Initialization: service / agent / runtime tasks must record startup, live entrypoint, health/status, endpoint, CLI command or worker command evidence.
- Config Contract: service / agent / runtime tasks must record required env/config/API key inputs or an explicit no-config contract.
- Testing Handoff Readiness: package validator errors identify whether a task is ready for Review/Testing handoff or must remain in SPRINTING/RFC.
- Known Missing Runtime Boundaries: none for the Harness validator module; product runtimes in consumer projects are represented by task contracts rather than owned by this repository runtime.
- Basic Self-test Evidence: `npm test --workspace agent-project-sdlc` covers validator regression for TASK-079 after completion; final source sync and Harness gates are recorded in Test Coverage.
- Not applicable: not applicable only when a module has no product runtime boundary; this workflow validator module has CLI validator entrypoints, so structured evidence is required.

## Testing Handoff Contract

- Entry: `npx sdlc-harness validate-dev` or `make validate-dev`.
- Config: no secrets; harness root comes from `package.json#sdlcHarness.harnessFolderName` or `sdlc-harness.config.json#harnessFolderName`.
- Initialization / health: package CLI starts through Node and reads lifecycle/plan/implementation docs.
- Input sample: a SPRINTING task with `evidence_level.required`, `target_runtime_environment`, implementation doc and Development Evidence.
- Expected exit / observable side effect: PASS output or concrete validator errors for evidence level, target runtime, handoff entrypoint or Testing Handoff Contract mismatch.
- Cleanup / reset / idempotency: validator is read-only; repeated runs are idempotent.
- Evidence Level: `local_runtime`.

## 3. 真实代码结构

| 文件（File） | 作用（Purpose） | 关键函数/对象（Key Functions/Objects） |
|---|---|---|
| `AGENTS.md` | Deterministic workflow router | lifecycle-first rule, natural-language and macro mapping |
| `.codex/skills/pjsdlc_manager/SKILL.md` | Manager prompt | status/next/advance/dev/test/review routing and phase-exit gate semantics |
| `.codex/skills/pjsdlc_pm_prd/SKILL.md` | Product prompt | PRD slicing and requirement gathering |
| `.codex/skills/pjsdlc_architect_design/SKILL.md` | Architecture prompt | architecture/tech plan and `plan.draft.yaml` |
| `.codex/skills/pjsdlc_dev_sprint/SKILL.md` | Development prompt | `/dev`, `/devloop`, one-task execution protocol and direct dev gate semantics |
| `.codex/skills/pjsdlc_implementation_doc/SKILL.md` | Implementation fact prompt | module-level implementation docs |
| `.codex/skills/pjsdlc_reviewer/SKILL.md` | Review prompt | read-only review workflow |
| `.codex/skills/pjsdlc_tester/SKILL.md` | Testing prompt | test strategy/cases/report workflow |
| `.codex/skills/pjsdlc_release_manager/SKILL.md` | Release prompt | current release status, smoke and rollback plan |
| `.codex/skills/pjsdlc_rfc_recalibrate/SKILL.md` | RFC prompt | change impact analysis |
| `.codex/skills/authoring/harness_package_design/SKILL.md` | Authoring-only prompt | package iteration, scriptability heuristic, README capability coverage |
| `.codex/pjsdlc_managed/make/sdlc-harness.mk` | Managed Makefile fragment | direct `validate-dev` package CLI wiring |
| `.codex/pjsdlc_managed/policies/phase_contracts.yaml` | Phase-to-skill contract | `skill` per phase |
| `.codex/pjsdlc_managed/templates/*` | Stage document templates | review/test strategy/cases/report/implementation entry/exit evidence sections |
| `tools/validate_review.py`, `tools/validate_test_plan.py` | Source workspace validators | review/test document and TESTING boundary checks |
| `packages/sdlc-harness/src/lib/validators.ts` | Package CLI validators | `npx sdlc-harness validate-*` checks including TESTING boundary rules |
| `packages/sdlc-harness/src/lib/sync-engine.ts` | Skill materialization | base Skill copy plus local override append |
| `tools/validate_prompt_language.py` | Prompt contract validator | Chinese explanation + English identifiers |

## 4. 核心数据流

```txt
Agent starts work
-> read .codex/state/lifecycle.yaml
-> read active_skill unless user requested another workflow action
-> use corresponding local Skill prompt through AGENTS.md soft index
-> map natural language or /xxx alias to workflow action
-> execute phase/task protocol
```

Native Agent skill hydration, when available:

```txt
Client scans its configured skill root
-> semantic matcher selects a SKILL.md before the turn
-> selected Skill instructions hydrate the prompt
```

Harness supports this second path by placing workflow Skills under the configured `<harnessRoot>/skills` tree, but the deterministic lifecycle route does not depend on first-turn native hydration.

Skill sync with project-local role prompt additions:

```txt
Package asset packages/sdlc-harness/assets/skills/<skill_name>/SKILL.md
+ optional <harnessRoot>/pjsdlc_managed/override_skills/<skill_name>.md
-> sdlc-harness sync
-> <harnessRoot>/skills/<skill_name>/SKILL.md
```

## 5. 关键实现逻辑

- Hard index means the Agent client itself knows a fixed skill root and can enumerate `SKILL.md` files before the model turn.
- Soft index means project instructions tell the model where to look after reading state, such as `active_skill` in `lifecycle.yaml`.
- Workflow reliability comes from the soft index because it is deterministic and tied to lifecycle state.
- User convenience comes from natural-language routing and macro aliases; users do not need to memorize every `/xxx`.
- `/plan` and `/goal` are client modes and are not automatically controlled by Harness.
- Authoring-only prompts help this repository improve the Harness itself and should not be shipped into user projects by default.
- Package-facing behavior changes must keep both `README.md` and `packages/sdlc-harness/README.md` aligned with the full public capability list, not only `PROJECT_SPEC.md` or release status notes.
- Local Skill overrides are append-only in v1. They let projects add role preferences or complete local Skill extensions without replacing lifecycle, task, gate or allowed-path rules from the package Skill.
- `sync` auto-detects a complete Skill override when the override file starts with `name` and `description` frontmatter, validates that `name` matches the target skill, merges the override `description` into the final top-level metadata and appends the stripped body.
- `sync` writes a semantic maintenance note into each generated `Local Override` block so future agents can review phase boundaries, `allowed_paths`, `required_gates`, commit/release rules and completion checks for conflicts.
- `sync` blocks unknown files under `<harnessRoot>/pjsdlc_managed/override_skills/*.md`, so a misspelled Skill name cannot silently fail to apply.
- `pjsdlc_managed/override_skills` keeps override configuration with other managed workflow configuration while preserving `<harnessRoot>/skills/**` as the shallow hard file index.
- When a user explicitly asks to slice an existing complete PRD/product document or complete tech plan into multiple slices, `pjsdlc_pm_prd` and `pjsdlc_architect_design` now require validating replacement slice coverage, updating `.docs/INDEX.md` and generated `overview.md`, synchronizing `plan.draft.yaml` references for tech plan slicing, and then deleting the superseded complete file so the facts are not duplicated.
- `pjsdlc_architect_design` now states that `make validate-design` hard-checks draft task `docs.tech_plan`, distinct primary tech plan slices, generated overview exclusion and dedicated architecture slices for explicit cross-cutting themes.
- `pjsdlc_manager`, `pjsdlc_pm_prd` and `pjsdlc_architect_design` share the same routing rule: PRD changes discovered in `ARCHITECTING` can return to `REQUIREMENT_GATHERING`; PRD changes discovered in `SPRINTING` or later use RFC recalibration.
- `pjsdlc_pm_prd`, `pjsdlc_architect_design`, `pjsdlc_reviewer`, `pjsdlc_tester`, `pjsdlc_release_manager` and `pjsdlc_rfc_recalibrate` create or resume one small `TASK-*` task before writing phase outputs. `pjsdlc_manager` routes `/prd`, `/design`, `/review`, `/test`, `/release` and `/rfc` through those task protocols and treats remaining open tasks as phase-exit blockers.
- SPRINTING Definition of Done now includes runnable entry/exit for promised API, CLI, server route, adapter, worker, provider, config contract and fixture/live boundaries. Missing entry/exit remains a dev/RFC blocker instead of becoming testing work.
- REVIEWING validates entry/exit readiness before TESTING. TESTING validates through existing entrypoints only and blocks product runtime, package runtime script, long-running runtime, systemd, cloud bootstrap, provider adapter and deploy/script changes.
- `validate-test` requires `.docs/07_test/TEST_REPORT.md`, rejects placeholder report text, and requires test matrix, regression evidence, coverage gaps, runnable entry/exit coverage and PASS/BLOCKED decision text.
- `validate-plan` rejects non-`TESTING`/`RFC_RECALIBRATION` tasks that target `.docs/07_test/**`, so SPRINTING cannot create formal test facts before entry/exit delivery.
- `validate-rfc` checks `Test Fact Source Impact` and rejects RFCs that list superseded `.docs/07_test/**` paths still present in current facts or `.docs/INDEX.md`.
- TESTING boundary checks still reject `tests/runtime/**` and runtime-like test files, but allow clearly test-only fixture, mock, assertion and smoke files under `tests/**`.
- `validate-dev` checks implementation docs for runnable entry/exit facts, accepting explicit `Not applicable` only when the module truly has no product runtime boundary.
- `validate-dev` checks the current open SPRINTING task implementation doc for a `Development Evidence` section with concrete `Runnable Entry`, `Observable Exit`, `Client / Server Initialization`, `Config Contract` and `Basic Self-test Evidence`, or a justified `Not applicable`.
- `validate-design` checks runnable-boundary draft tasks for `self_test_contract` and verifies the referenced tech plan slice contains a `Development Self-Test Contract`.
- `validate-dev` checks `self_test_contract.required_gates` against task `required_gates`, requires `Report Status: PASS` and every contract scenario to have a `PASS` result in `Development Self-Test Report`, and rejects `BLOCKED`, `IN_PROGRESS` or `STALE` reports as unfinished development handoff.
- `validate-design` and `validate-dev` require `module_key_test_path` / `Module Key Test Path` so the implementation doc records the local-start-to-self-test-completion module key test path, including current task/module runnable entries, internal key paths, boundaries, checkpoints and completion evidence for future debug.
- High-risk runtime/live/remote-operator tasks now use resume-first recovery: Architect reserves `.docs/09_runbooks/**`, Dev maintains `plan.yaml#resume_capsule`, Implementation Doc keeps operation logs out of the main implementation facts, and Review/Testing consume the capsule/runbook before reading exploration appendices.
- `validate-dev` requires high-risk current SPRINTING tasks to have concrete `resume_capsule` fields, current implementation doc recovery ref, `.docs/09_runbooks/**` recovery ref, a short `Current Operator Path` and a `Gate Breakdown` in `Development Self-Test Report`.
- Open task `working_notes` now stays resume-first with a validator limit of 8 entries.
- `pjsdlc_dev_sprint` explicitly frames SPRINTING outputs as implementation artifacts plus development self-test artifacts. It requires scenario/gate execution before report writing, and blocks task completion when current-run runnable entry, internal key path and observable exit/evidence cannot be named.
- `pjsdlc_implementation_doc` records the same evidence provenance rule for module docs: `Development Self-Test Report` facts must come from the current task run, not from historical PASS text, template placeholders, code inspection or unrelated generic gates.
- `harness_package_design` distinguishes Agent execution violations from Harness contract gaps and prefers lightweight prompt/checklist/template/content constraints before adding heavier validators, scripts or executors.
- `validate-rfc` requires `Development Self-Test Impact` in RFC files from `RFC_023` onward when they mention entry/exit, runtime, target environment, gates, handoff or blockers.
- `validate-dev` rejects service / agent / runtime tasks whose evidence only proves provider smoke, fixture smoke, fake adapter or one-shot smoke without application readiness or `BLOCKED`.
- `validate-review` checks structured readiness fields and treats any `BLOCKED` field as a gate blocker.
- `validate-test` rejects `PASS` reports that still describe missing entry/exit or missing Development Evidence.
- Page evidence must include a dev server/page URL plus browser, Playwright, screenshot or equivalent interaction evidence; API/CLI/worker/RPA evidence must include an invocation command/endpoint and observable output, response, side effect, log, artifact or PASS/BLOCKED result.
- direct `validate-dev` is explicitly an in-development SPRINTING gate. It validates the current open task contract, dirty-file scope, draft consumption and implementation docs without forcing task removal. `validate-current` / `/advance` keeps no-open phase-exit behavior before REVIEWING.
- Managed Makefile `validate-dev` runs `$(SDLC_HARNESS) validate-dev`, then project `lint` and `test-current-domain`, so installed package consumers no longer need source-repo-only Python validators for this gate.
- Package Skill overrides remain append-only local extensions. The generated override block now states that package-managed phase boundaries remain authoritative and overrides may narrow local behavior but must not expand TESTING or REVIEWING into implementation/runtime ownership.

## 6. 与技术方案的偏移

- Earlier wording treated all workflow role files as native Skills. The current model distinguishes native hard-index hydration from Harness soft-index routing.
- The default authoring root moved from `.agent` to `.codex` after target-agent selection was added.
- DEV-043 consolidated legacy task records for role prompts, skill layout and natural-language control into this module-level doc.

## 7. 测试覆盖（Test Coverage）

| 测试（Test） | 覆盖范围（Coverage） | 最近记录结果（Result） |
|---|---|---|
| `python3 tools/validate_prompt_language.py` | Prompt language contract and managed prompts | PASS in Harness gates |
| `npm test --workspace agent-project-sdlc` | Package build and CLI behavior regression tests | PASS for DEV-056; 9 tests passed |
| `node packages/sdlc-harness/dist/cli.js package sync-source` | Package assets reflect authoring Skill source changes | PASS for DEV-056 |
| `node packages/sdlc-harness/dist/cli.js package check-source` | Skills and managed prompt assets match authoring source | PASS for DEV-056 |
| `make validate-design` | Architect Skill slicing contract is reflected in the design gate | PASS for TASK-060 |
| `tests/sdlc-harness/transition.test.mjs` | PM/Architect/Manager rollback semantics align with phase transition support | PASS for TASK-061 |
| `tests/sdlc-harness/package-source.test.mjs` | Authoring Skill exclusion from package assets | PASS in package tests |
| `tests/sdlc-harness/sync-init-doctor.test.mjs` | Skill override append, idempotency, configured root and unknown override blocking | PASS for DEV-046 |
| `tests/sdlc-harness/upgrade.test.mjs` | Migration from legacy `overrides/skills` to `pjsdlc_managed/override_skills` | PASS for DEV-046 |
| `make validate-harness` | Prompt language and overview consistency | PASS for DEV-056 |
| `npm test --workspace agent-project-sdlc` | Package validator regression including TESTING boundary checks | PASS for TASK-066 |
| `node packages/sdlc-harness/dist/cli.js package sync-source` | Package assets reflect boundary prompt/template README changes | PASS for TASK-066 |
| `node packages/sdlc-harness/dist/cli.js package check-source` | Package assets match authoring source | PASS for TASK-066 |
| `make validate-harness` | Prompt language and overview consistency after boundary hardening | PASS for TASK-066 |
| `make validate-doc-overviews` | Generated overview freshness | PASS for TASK-066 |
| `npm test --workspace agent-project-sdlc` | Package validator regression for `TEST_REPORT.md`, legacy `TEST_PLAN.md`, TESTING fixture allowance and dev entry/exit docs | PASS for TASK-067; 10 tests passed |
| `node packages/sdlc-harness/dist/cli.js package sync-source` | Package assets reflect TESTING report contract changes | PASS for TASK-067 |
| `node packages/sdlc-harness/dist/cli.js package check-source` | Package assets match authoring source after TESTING report changes | PASS for TASK-067 |
| `node tools/consumer_lab_full_test.mjs` | Installed-consumer validation of `TEST_REPORT.md` and package validators | PASS for TASK-067 command exit; report decision `BLOCKED` with 38 PASS, 7 known Makefile/tools blockers and 0 FAIL |
| `make docs-overview` | Generated overview refresh after test report rename | PASS for TASK-067 |
| `make validate-harness` | Prompt language and overview consistency after TESTING report contract changes | PASS for TASK-067 |
| `npm test --workspace agent-project-sdlc` | Package validator regression for current release status and legacy release docs compatibility | PASS for TASK-069; 10 tests passed |
| `node packages/sdlc-harness/dist/cli.js package sync-source` | Package assets reflect release status Skill/template/README changes | PASS for TASK-069 |
| `node packages/sdlc-harness/dist/cli.js package check-source` | Package assets match authoring source after release status contract changes | PASS for TASK-069 |
| `node tools/consumer_lab_full_test.mjs` | Installed-consumer validation of `CURRENT_RELEASE.md` and package validators | PASS for command exit; report decision `BLOCKED` with 38 PASS, 7 known Makefile/tools blockers and 0 FAIL |
| `make validate-harness` | Prompt language and overview consistency after release status contract changes | PASS for TASK-069 |
| `npm test --workspace agent-project-sdlc` | Package validator regression for TEST_REPORT-only validation, placeholder rejection, test doc task boundaries and RFC superseded cleanup | PASS for TASK-070; 10 tests passed |
| `node packages/sdlc-harness/dist/cli.js package sync-source` | Package assets reflect test artifact semantics changes | PASS for TASK-070 |
| `node packages/sdlc-harness/dist/cli.js package check-source` | Package assets match authoring source after test artifact semantics changes | PASS for TASK-070 |
| `make validate-plan` | Active RFC task contract and changed paths | PASS for TASK-070 |
| `make docs-overview` | Generated overview refresh for RFC, implementation and test docs | PASS for TASK-070 |
| `make validate-rfc` | RFC format, Test Fact Source Impact and no-open-task phase gate | PASS for TASK-070 |
| `make validate-harness` | Prompt language and overview consistency after test artifact semantics changes | PASS for TASK-070 |
| `npm test --workspace agent-project-sdlc` | Package validator and consumer lab regression for direct dev gate open-task semantics | PASS for TASK-071; 10 tests passed |
| `node packages/sdlc-harness/dist/cli.js package sync-source` | Package assets reflect Dev/Manager Skill and managed Makefile changes | PASS for TASK-071 |
| `node packages/sdlc-harness/dist/cli.js package check-source` | Package assets match source after dev gate wording and wiring changes | PASS for TASK-071 |
| `make validate-dev` | Managed Makefile direct dev gate uses package CLI without unsynced Python dev-state tools | PASS for TASK-071 |
| `make validate-current` | Manager phase-exit path keeps no-open safety after direct dev gate | PASS for TASK-071 |
| `make validate-harness` | Prompt language and generated overview consistency after Dev/Manager prompt changes | PASS for TASK-071 |
| `npm test --workspace agent-project-sdlc` | Package validator regression for structured Development Evidence, placeholder rejection, page evidence and callable evidence | PASS for TASK-072; 10 tests passed |
| `node packages/sdlc-harness/dist/cli.js package sync-source` | Package assets reflect Development Evidence Skill/template/policy/README changes | PASS for TASK-072; changed=26 |
| `node packages/sdlc-harness/dist/cli.js package check-source` | Package assets match authoring source after Development Evidence changes | PASS for TASK-072 |
| `make validate-dev` | Direct SPRINTING gate validates current task structured Development Evidence | PASS for TASK-072 |
| `make validate-harness` | Prompt language and generated overview consistency after Development Evidence changes | PASS for TASK-072 |
| `npm test --workspace agent-project-sdlc` | Package validator regression for application readiness evidence, Review readiness checklist and TEST_REPORT PASS misuse | PASS for TASK-075; 10 tests passed |
| `node packages/sdlc-harness/dist/cli.js package sync-source` | Package assets reflect application readiness Skill/template/README changes | PASS for TASK-075; changed=26 |
| `node packages/sdlc-harness/dist/cli.js package check-source` | Package assets match authoring source after application readiness changes | PASS for TASK-075 |
| `node tools/consumer_lab_full_test.mjs` | Installed-consumer validation of application readiness evidence contract | PASS command exit for TASK-075; report decision `BLOCKED` with 40 PASS, 7 known Makefile/tools blockers and 0 FAIL |
| `make docs-overview` | Generated overview refresh for RFC_020 and implementation docs | PASS for TASK-075 |
| `make validate-dev` | Direct SPRINTING gate validates current task application readiness evidence contract | PASS for TASK-075 |
| `make validate-harness` | Prompt language and generated overview consistency after application readiness changes | PASS for TASK-075 |
| `npm test --workspace agent-project-sdlc` | Package validator regression for Evidence Level, Target Runtime Environment and Testing Handoff Contract | PASS for TASK-076; 10 tests passed |
| `node packages/sdlc-harness/dist/cli.js package sync-source` | Package assets reflect runtime evidence contract prompt/template/README changes | PASS for TASK-076; changed=25 |
| `node packages/sdlc-harness/dist/cli.js package check-source` | Package assets match authoring source after runtime evidence contract changes | PASS for TASK-076 |
| `make docs-overview` | Generated overview refresh after RFC_021 and implementation doc updates | PASS for TASK-076 |
| `make validate-harness` | Prompt language and overview consistency after runtime evidence contract changes | PASS for TASK-076 |
| `make validate-dev` | Direct SPRINTING gate validates current task runtime evidence contract | PASS for TASK-076 |
| `npm test --workspace agent-project-sdlc` | Package validator regression for Development Self-Test Contract / Report and RFC self-test impact | PASS for TASK-078; 10 tests passed |
| `node packages/sdlc-harness/dist/cli.js package sync-source` | Package assets reflect self-test contract Skill/template/README changes | PASS for TASK-078; changed=26 |
| `node packages/sdlc-harness/dist/cli.js package check-source` | Package assets match authoring source after self-test contract changes | PASS for TASK-078 |
| `make docs-overview` | Generated overview refresh after RFC_023 and implementation doc updates | PASS for TASK-078 |
| `make validate-harness` | Prompt language and overview consistency after self-test contract changes | PASS for TASK-078 |
| `make validate-rfc` | RFC format, Development Self-Test Impact and no-open-task phase gate | PASS for TASK-078 |
| `npm test --workspace agent-project-sdlc` | Package validator regression for Module Key Test Path in Development Self-Test Contract / Report | PASS for TASK-079 |
| `node packages/sdlc-harness/dist/cli.js package sync-source` | Package assets reflect Module Key Test Path prompt/template/README changes | PASS for TASK-079 |
| `node packages/sdlc-harness/dist/cli.js package check-source` | Package assets match source after Module Key Test Path changes | PASS for TASK-079 |
| `make validate-harness` | Prompt language and generated overview consistency after Module Key Test Path changes | PASS for TASK-079 |
| `make validate-rfc` | RFC format, Development Self-Test Impact and no-open-task phase gate | PASS for TASK-079 |
| `npm test --workspace agent-project-sdlc` | Package validator regression after clarifying Module Key Test Path fixture wording | PASS for TASK-080 |
| `node packages/sdlc-harness/dist/cli.js package sync-source` | Package assets reflect clarified Module Key Test Path wording | PASS for TASK-080 |
| `node packages/sdlc-harness/dist/cli.js package check-source` | Package assets match source after clarified Module Key Test Path wording | PASS for TASK-080 |
| `make validate-harness` | Prompt language and generated overview consistency after clarified Module Key Test Path wording | PASS for TASK-080 |
| `npm test --workspace agent-project-sdlc` | Package validator regression for resume capsule, runbook refs and Gate Breakdown | PASS in current working tree; 10 tests passed |
| `node packages/sdlc-harness/dist/cli.js package sync-source && package check-source` | Package assets reflect resume-first Skill/template/validator changes | PASS in current working tree; sync changed=48 |
| `make validate-rfc` | RFC format, Development Self-Test Impact and no-open-task phase gate | PASS for TASK-080 |
| `node packages/sdlc-harness/dist/cli.js package sync-source` | Package assets reflect self-test report redline prompt changes while excluding authoring-only Skill | PASS on 2026-05-30; changed 44 assets |
| `node packages/sdlc-harness/dist/cli.js package check-source` | Package assets match source after prompt redline changes | PASS on 2026-05-30 |
| `npm test --workspace agent-project-sdlc` | Package regression after prompt-only workflow changes | PASS on 2026-05-30; 10 tests passed |
| `make docs-overview` | Generated overview refresh after prompt redline implementation doc update | PASS on 2026-05-30 |
| `make validate-harness` | Prompt language and generated overview consistency after prompt redline changes | PASS on 2026-05-30 |
| `npm test --workspace agent-project-sdlc` | Package validator regression for Report Status, Current Operator Path, disallowed self-test log sections and working_notes limit | PASS on 2026-05-30; 10 tests passed |
| `node packages/sdlc-harness/dist/cli.js package sync-source && package check-source` | Package assets reflect self-test report boundary Skill/template/README changes | PASS on 2026-05-30; sync changed=48 |
| `make docs-overview && make validate-harness && make validate-plan` | Generated overview, prompt language and active plan consistency after self-test boundary changes | PASS on 2026-05-30 |

## 8. 变更记录（Change Log）

| 日期（Date） | Task ID | Commit | 摘要（Summary） |
|---|---|---|---|
| 2026-05-25 | `DEV-014`, `DEV-016`, `DEV-017` | Historical implementation commits | Added authoring overlay concept and prompt language guidelines. |
| 2026-05-25 | `DEV-021`, `DEV-023` | Historical implementation commits | Consolidated managed config and added `pjsdlc_*` Skill names. |
| 2026-05-25 | `DEV-029` | Historical implementation commit | Added natural-language workflow control and macro aliases. |
| 2026-05-25 | `DEV-036` - `DEV-039` | Historical implementation commits | Clarified hard/soft indexes and authoring Skill packaging boundary. |
| 2026-05-25 | `DEV-040` | `40552f0` | Added target-agent selection and `.codex` default for Codex. |
| 2026-05-26 | `DEV-043` | DEV-043 implementation commit | Migrated legacy prompt/skill implementation docs into module-level facts. |
| 2026-05-26 | `DEV-044` | DEV-044 implementation commit | Added sync-time append overrides for project-local workflow Skill prompt additions. |
| 2026-05-26 | `DEV-046` | DEV-046 implementation commit | Moved project-local Skill overrides under `pjsdlc_managed/override_skills` and updated authoring impact rules. |
| 2026-05-26 | `DEV-049` | DEV-049 implementation commit | Added authoring rule that README/package README must cover all public package capabilities. |
| 2026-05-27 | `DEV-050` | DEV-050 implementation commit | Added opt-in parallel execution prompt rules for PM, Manager, Dev and Tester workflows. |
| 2026-05-30 | `TASK-084` | TASK-084 implementation commit | Updated all workflow Skills to default parallel eligibility checks with Codex native subagent scheduling and fallback modes. |
| 2026-05-27 | `DEV-055` | Working tree | Required PRD and tech plan slicing workflows to delete superseded complete files after replacement slices and references are complete. |
| 2026-05-27 | `DEV-056` | Working tree | Routed PRD and design generation/slicing through recoverable `plan.yaml` tasks. |
| 2026-05-27 | `TASK-057` | Working tree | Generalized prompt rules so every phase main action is a `TASK-*` task governed by `plan.yaml`, with review/test/release/RFC outputs using `result_docs`. |
| 2026-05-27 | Direct user request | Working tree | Added complete Skill override merge support with description merging and semantic conflict review guidance. |
| 2026-05-28 | `TASK-060` | Working tree | Promoted architect semantic slicing guidance into explicit hard-gate wording for `plan.draft.yaml` tech plan references and dedicated architecture slices. |
| 2026-05-28 | `TASK-061` | Working tree | Added Skill routing guidance for returning from `ARCHITECTING` to `REQUIREMENT_GATHERING` before development when PRD facts need revision. |
| 2026-05-28 | `TASK-066` | Working tree | Hardened SPRINTING/REVIEWING/TESTING runnable entry/exit boundaries and validator checks so TESTING cannot absorb product runtime implementation. |
| 2026-05-28 | `TASK-067` | Working tree | Replaced the canonical TESTING document contract with `TEST_REPORT.md`, kept legacy `TEST_PLAN.md` validation compatibility and tightened dev/test entry/exit evidence gates. |
| 2026-05-29 | `TASK-069` | Working tree | Replaced versioned release document generation with canonical `.docs/08_release/CURRENT_RELEASE.md` release status guidance and validator compatibility wording. |
| 2026-05-29 | `TASK-070` | Working tree | Split test strategy, test cases and execution report semantics; removed `TEST_PLAN.md` report fallback; added RFC cleanup checks for superseded test facts. |
| 2026-05-29 | `TASK-071` | Working tree | Clarified direct dev gate open-task semantics in Dev/Manager prompts and moved managed Makefile `validate-dev` to package CLI wiring. |
| 2026-05-29 | `TASK-072` | Working tree | Added structured SPRINTING Development Evidence requirements and `validate-dev` checks for runnable entry, observable exit and basic self-test evidence. |
| 2026-05-29 | `TASK-075` | Working tree | Hardened application readiness gates so provider/fixture smoke cannot be mistaken for delivered runtime readiness. |
| 2026-05-29 | `TASK-076` | Working tree | Added task-level Evidence Level, Target Runtime Environment and Testing Handoff Contract validation for runtime/app handoff readiness. |
| 2026-05-29 | `TASK-078` | Working tree | Added Development Self-Test Contract / Report prompts, templates and validator checks for development handoff readiness. |
| 2026-05-30 | Direct maintenance | Working tree | Added development self-test report redline prompts and authoring lightweight-constraint guidance. |
| 2026-05-29 | `TASK-079` | Working tree | Added Module Key Test Path requirements to Development Self-Test Contract / Report and validator checks. |
| 2026-05-29 | `TASK-080` | Working tree | Clarified Module Key Test Path wording to cover current task/module promised entries and internal key paths without implying whole-system coverage. |
| 2026-05-30 | Resume-first runtime task protocol | Working tree | Added resume-first prompt rules for high-risk runtime/live tasks and separated runbook/evidence/exploration responsibilities. |
| 2026-05-30 | Self-test report boundary hardening | Working tree | Added Report Status semantics, Current Operator Path prompt rules, log-section boundary and working_notes limit guidance. |

## 9. 后续维护注意事项

- When adding a workflow role, update both the Skill file and the soft-index contract in lifecycle/phase policies.
- If a client-specific native skill root is supported, document it as hard-index behavior without assuming every Agent hydrates it identically.
- Do not document direct edits to `<harnessRoot>/skills/**/SKILL.md` as a customization path; use `<harnessRoot>/pjsdlc_managed/override_skills/*.md` and `sdlc-harness sync`.
