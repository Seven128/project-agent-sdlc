# AI SDLC Harness

`agent-project-sdlc` provides the `sdlc-harness` CLI and canonical workflow assets for AI-assisted software delivery. It materializes an agent-readable lifecycle, workflow skills, templates, policies, gates and documentation structure into a project workspace.

## Install

```sh
npm install -D agent-project-sdlc
npx sdlc-harness init
```

For existing projects:

```sh
npx sdlc-harness init --adopt
```

## Capabilities

| Capability | Entry Point | Description |
|---|---|---|
| Project initialization | `npx sdlc-harness init` | Creates `AGENTS.md`, `<harnessRoot>/state/**`, workflow skills, managed templates/policies, `.docs/**` and a Makefile include. |
| Existing project adoption | `npx sdlc-harness init --adopt` | Adds Harness non-destructively to an existing repository. |
| Configurable Harness root | `--harness-folder`, `package.json#sdlcHarness.harnessFolderName`, `sdlc-harness.config.json` | Supports Codex `.codex`, Claude `.claude`, Cursor `.cursor`, Cline `.cline`, Roo `.roo`, Gemini `.gemini` or a custom folder. |
| Managed file sync | `npx sdlc-harness sync` | Materializes package canonical assets and safely updates package-managed guidance sections inside user-owned Markdown files while preserving project state, docs and local overrides. |
| Upgrade | `npx sdlc-harness upgrade` | Runs migrations and sync for already-adopted projects, including legacy seed guidance migration. |
| Diagnostics | `npx sdlc-harness doctor` | Reports Harness root, package version, schema version and key managed paths. |
| Validators | `npx sdlc-harness validate-*`, `make validate-current`, `make validate-harness` | Checks product, design slicing, development, review, test, release, RFC, active plan shape, prompt language contract and generated overview freshness. |
| Harness Python tools | `tools/*.py` | Package-managed local workflow tools, including `transition.py`, Python validators and overview generation helpers. |
| Lifecycle workflow | `<harnessRoot>/state/lifecycle.yaml`, `<harnessRoot>/state/plan.yaml`, `.docs/**` | Tracks REQUIREMENT_GATHERING, ARCHITECTING, SPRINTING, REVIEWING, TESTING, RELEASING and RFC_RECALIBRATION facts. |
| Stage task control | `plan.yaml`, `make validate-plan`, `npx sdlc-harness validate-plan` | Keeps each stage's agent work in small `TASK-*` tasks with `phase` metadata and scoped paths/gates. |
| Natural-language control | `AGENTS.md` plus workflow skills | Lets users say things like "continue", "start development", "run tests" or "requirements changed"; agents map these to workflow actions. |
| Default parallel scheduling contract | `plan.yaml#parallel_execution` | Stage tasks default to a safe-parallelism check; suitable work uses Codex native subagents first, with user-orchestrated and worktree fallbacks. |
| Workflow skills | `<harnessRoot>/skills/pjsdlc_*/SKILL.md` | Provides role prompts for product, architecture, development, implementation docs, review, testing, release and RFC recalibration. |
| Project-local skill overrides | `<harnessRoot>/pjsdlc_managed/override_skills/<skill_name>.md` + `npx sdlc-harness sync` | Appends project-specific role instructions to generated Skill output without editing managed Skill files. |
| Local policy overrides | `<harnessRoot>/pjsdlc_managed/policies/*.local.yaml` | Preserves project-specific policy additions separately from package defaults. |
| Agent-readable user guide asset | `assets/docs/README.md` | Ships the source workspace root README inside the npm package so user agents can inspect the full workflow guide from `node_modules`. |
| Documentation overview | `make docs-overview`, `make validate-doc-overviews` | Regenerates human-readable stage overviews from `.docs/**` fact slices. |
| Package source checks | `sdlc-harness package sync-source`, `sdlc-harness package check-source` | Maintainer commands for keeping package canonical assets aligned with this source workspace. |

## Skill Overrides

Do not edit generated files under `<harnessRoot>/skills/**/SKILL.md`; `sync` and `upgrade` regenerate them.

To customize a stage role prompt, create:

```txt
<harnessRoot>/pjsdlc_managed/override_skills/<skill_name>.md
```

Example:

```txt
.codex/pjsdlc_managed/override_skills/pjsdlc_dev_sprint.md
```

Then run:

```sh
npx sdlc-harness sync
```

The sync output is the package base Skill plus one appended `Local Override` block. Override files support either a plain project-local snippet or a complete `SKILL.md` with `name` and `description` frontmatter. Complete Skill overrides are appended, not replaced: `sync` validates the override `name`, merges the override `description` into the generated top-level metadata, strips the override frontmatter, and appends the full body. After sync, users or their agents should review the merged Skill for semantic conflicts in phase boundaries, `allowed_paths`, `required_gates`, commit/release rules and completion checks. Unknown skill names block sync so misspellings do not silently fail.

## Default Parallel Scheduling

The default workflow evaluates each stage task for safe parallelism. When the task can be split safely, the main agent creates `parallel_execution.trigger: "workflow_default"` in `plan.yaml` and uses Codex native subagents first. If the task is not safe to split, the main agent keeps the workflow serial and records the reason. Explicit user requests for multi-agent, parallel or multi-worktree execution use `trigger: "user_requested"`.

- `runtime_managed` with `runtime.provider: "codex_native_subagents"`: the default path. The main agent assigns workers, waits for results, reviews, merges or cherry-picks, and runs the total gate.
- `user_orchestrated`: use when the runtime cannot spawn subagents. The main agent generates copyable worker prompts, and the user manually opens Codex conversations or worktrees and pastes them.
- `codex_exec_worktree`: fallback for high-risk writes or user-requested hard isolation. The first version does not add a `sdlc-harness parallel run` CLI.

`parallel_execution` does not store duplicate current phase or current task fields. Agents read phase from `<harnessRoot>/state/lifecycle.yaml#current_phase` and task selection from `<harnessRoot>/state/plan.yaml#current_task_id`.

SPRINTING write workers must use disjoint `owned_paths`, and each owned path must be within the current task `allowed_paths`. Workers do not own final PRD, plan, implementation docs, review/test/release reports, generated overviews or release actions; the main agent remains the integration owner.

## Stage Task Control

Every stage's agent work is plan-controlled. Conversational PRD or design creation, existing document slicing, fact-source-based synthesis, development, review, testing, release preparation and RFC recalibration should create or resume one small `TASK-*` task in `plan.yaml` with a valid `phase`, write the current task's `result_docs` or `implementation_doc`, update indexes/overviews, run `validate-plan`, and remove the task after completion. Phase exit validators reject remaining open tasks.

Release docs are current-state facts, not a version ledger. New release work should update `.docs/08_release/CURRENT_RELEASE.md`; `validate-release` accepts legacy versioned release docs only for existing projects that have not migrated yet.

The generic rule is that any workflow promoting a draft task into a formal `TASK-*` in `plan.yaml` must remove the source draft from its draft queue in the same state update. The formal task is then recovered only from `plan.yaml`; completed history lives in implementation docs, git, PR and CI records. The built-in Harness draft queue is currently `plan.draft.yaml.tasks[]`, which means unadopted development drafts only. `/devloop` treats the development queue as exhausted only when both `plan.yaml.tasks[]` and `plan.draft.yaml.tasks[]` have no executable task.

Before development starts, `ARCHITECTING` can return to `REQUIREMENT_GATHERING` for PRD edits. The manager uses `python3 tools/transition.py --to REQUIREMENT_GATHERING`, the PM workflow updates the PRD through one `TASK-*`, then `validate-pm` and `python3 tools/transition.py --to ARCHITECTING` return the project to design. Requirement or design changes after `SPRINTING` use RFC recalibration; `SPRINTING`, `REVIEWING`, `TESTING` and `RELEASING` can enter the controlled interrupt with `python3 tools/transition.py --to RFC_RECALIBRATION`, then return to `SPRINTING` after `validate-rfc`.

`validate-design` treats semantic slicing as a hard gate. Generated `overview.md` files do not count as deliverables, development draft tasks in `plan.draft.yaml` must reference existing tech plan slices through `docs.tech_plan`, multiple development draft tasks need distinct primary tech plan slices, and explicit AI provider/copilot, external-system, or compliance/permission/audit themes require dedicated architecture slices. Draft tasks with runnable boundaries must also include `self_test_contract`, backed by a `Development Self-Test Contract` section in the tech plan; the contract must include `module_key_test_path` from local start or invocation to all self-test scenarios completion, covering every runnable entry promised by the current task/module and its internal key paths.

SPRINTING Definition of Done includes module-level runnable delivery boundaries. API, CLI, server route, service, agent, runtime, adapter, worker, provider, config-contract and fixture/live boundaries promised by a technical plan or task must be implemented or marked `BLOCKED` during development. Runtime/app/provider/live tasks must declare `evidence_level.required`, `target_runtime_environment` and `self_test_contract` in `plan.yaml`; every gate in `self_test_contract.required_gates` must also appear in task `required_gates`, and `self_test_contract.module_key_test_path` must describe the path from local start or invocation to all self-test scenarios completion, covering every runnable entry promised by the current task/module and its internal key paths. `deployed_runtime` cannot be closed by `unit`, `local_runtime`, `external_provider_live`, provider smoke, fake adapters or localhost smoke alone, and `business_handoff_ready` requires a Testing Handoff Contract. The current task implementation doc must include `Development Evidence` and a completed `Development Self-Test Report` with contract source, scenario results, executed gates, Module Key Test Path, actual evidence, missing/blockers and Testing Handoff Readiness; Module Key Test Path records actual entries, internal key paths, boundaries, checkpoints and observable completion evidence. Provider smoke, fixture smoke, fake adapters and one-shot smoke prove only local links; they do not by themselves prove application readiness. REVIEWING treats missing entry/exit, initialization, config contract, target runtime, evidence level or development evidence as blocking, and TESTING only exercises entrypoints that Review has confirmed as `PASS`; it must not add product runtime, bootstrap, provider adapter, deploy code or package runtime scripts.

`make validate-dev` and `npx sdlc-harness validate-dev` are in-development SPRINTING gates. They allow the current `current_task_id` open task to remain in `plan.yaml` while checking that it is a valid `phase: "SPRINTING"` task with `docs`, `allowed_paths`, `required_gates`, `acceptance_criteria`, `implementation_doc`, scoped dirty files, an empty `plan.draft.yaml` queue, runtime evidence task contract, `self_test_contract`, linked runnable-entry implementation docs, structured development evidence and a completed Development Self-Test Report. The report must include Module Key Test Path so later agents can reuse the debug path from local entry to all self-test scenarios completion; that path is scoped to entries and internal key paths promised by the current task/module, not the whole system. Page tasks need a dev server or page URL plus browser/Playwright/screenshot/equivalent interaction evidence; API/CLI/worker/service/agent/runtime tasks need a startup or invocation command, endpoint/health/status, and observable response/output/side effect. `make validate-current` and `/advance` are phase-exit gates; before moving to REVIEWING, the implementation commit and completion ledger must be done and no open task may remain.

`validate-test` keeps its command name as the TESTING phase gate. `.docs/07_test/TEST_STRATEGY.md` describes scope, environment, priority and execution strategy; `.docs/07_test/TEST_CASES.md` describes cases bound to real runnable entry/exit; `.docs/07_test/TEST_REPORT.md` only records executed TESTING evidence, test matrix, regression evidence, runnable entry/exit coverage, coverage gaps and final decision. `validate-test` only accepts `TEST_REPORT.md`; it no longer treats `TEST_PLAN.md` as a report fallback.

Do not create formal `.docs/07_test/**` test cases or reports before development has delivered testable entry/exit. When an RFC changes the technical route, entry/exit or acceptance boundary, review `.docs/07_test/**` and remove superseded test results from current facts and `.docs/INDEX.md`.

## ADR And Memory Boundaries

`.docs/05_decisions/` stores ADRs, or Architecture Decision Records. ADRs answer why a key architecture choice was made instead of another option. Architecture and tech plan slices may include local design rationale; create an ADR when a decision has real alternatives, affects multiple modules or stages, is likely to be challenged later, or would be expensive to reverse.

`<harnessRoot>/state/memory.md` is only a short cross-stage reminder and navigation surface. It answers what an agent should remember next time and where to find the source. Memory may link to ADRs, PRDs, tech plans or implementation docs; full context, alternatives, tradeoffs and long-term consequences belong in `.docs/05_decisions/` ADRs or other formal `.docs/**` fact sources.

`sync` and `upgrade` also maintain fixed package-managed sections inside user-owned Markdown files: `## Harness Guidance` in `<harnessRoot>/state/memory.md` and `## Harness Maintenance Rules` in `.docs/INDEX.md`. User memory entries, artifact maps and links stay outside those sections and are preserved. Legacy untitled seed guidance is migrated into the titled section to avoid duplicates. `.github/workflows/harness.yml` is updated only when it has `pjsdlc:sdlc-harness:github-workflow:*` markers or exactly matches the old generated workflow; customized workflows without markers are skipped and reported as `customized`.

## Common Commands

```sh
npx sdlc-harness init
npx sdlc-harness init --adopt
npx sdlc-harness sync
npx sdlc-harness upgrade
npx sdlc-harness doctor
npx sdlc-harness validate-plan
npx sdlc-harness validate-review
npx sdlc-harness validate-test
npx sdlc-harness validate-release
npx sdlc-harness validate-rfc
make validate-current
make validate-harness
make docs-overview
```

## More Information

The source repository keeps the full product and architecture specification in `PROJECT_SPEC.md`, with implementation facts and the current release status under `.docs/**`.
