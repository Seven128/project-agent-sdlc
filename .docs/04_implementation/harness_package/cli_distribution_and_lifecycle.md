# CLI Distribution and Lifecycle Implementation

## 1. 关联信息

- Domain: `harness_package`
- Module / subsystem / core flow: CLI package distribution, init/sync/upgrade/doctor lifecycle
- Updated by task: `DEV-001`, `DEV-002`, `DEV-003`, `DEV-005`, `DEV-006`, `DEV-008`, `DEV-009`, `DEV-020`, `DEV-021`, `DEV-022`, `DEV-023`, `DEV-040`, `DEV-041`, `DEV-043`, `DEV-054`, `TASK-058`, `TASK-074`
- Linked PRD: `.docs/01_product/npm_package_distribution.md`
- Linked technical design: `.docs/03_tech_plan/harness_package_distribution.md`
- Linked RFC: `RFC_001`, `RFC_002`, `RFC_003`, `RFC_006`, `RFC_007`, `RFC_008`, `RFC_009`
- Linked commits: historical `DEV-*` implementation commits; `DEV-043` migration commit

## 2. 当前实现范围

- `agent-project-sdlc` npm package exposes the `sdlc-harness` CLI binary.
- `init` / `init --adopt` create or adopt a project Harness without overwriting user-owned project code.
- Fresh `init` lifecycle routes new projects to `SPRINTING` with `active_role: "developer"` and `active_skill: "pjsdlc_dev_sprint"`; generated plan files do not duplicate `current_phase`.
- `sync` materializes managed Harness assets from package canonical assets into the selected `<harnessRoot>`.
- `upgrade` refreshes `<harnessRoot>/config.yaml` package identity and schema metadata, runs schema migrations and then syncs managed assets.
- `doctor` reports Harness config, managed file drift, override state and suggested gates. The displayed package version is read from the installed npm package metadata, not from project config.
- `validate-*` commands expose package-side validation entry points for Harness state and phase artifacts.
- 当前 authoring workspace 使用 `.codex` as `harnessFolderName`; `Other` agent selection still falls back to `.agent`.

## 3. 真实代码结构

| 文件（File） | 作用（Purpose） | 关键函数/对象（Key Functions/Objects） |
|---|---|---|
| `package.json` | Root workspace and package-level scripts | `workspaces`, `scripts.sdlc-harness`, `scripts.release:npm`, `sdlcHarness.harnessFolderName` |
| `packages/sdlc-harness/package.json` | npm package manifest | `name`, `version`, `bin.sdlc-harness`, `files`, `prepack` |
| `packages/sdlc-harness/src/cli.ts` | CLI process entrypoint | `main()` |
| `packages/sdlc-harness/src/commands/index.ts` | CLI command router | `commands` |
| `packages/sdlc-harness/src/commands/init.ts` | `init` adapter | `init` command parser |
| `packages/sdlc-harness/src/commands/sync.ts` | `sync` adapter | `sync` command parser |
| `packages/sdlc-harness/src/commands/upgrade.ts` | `upgrade` adapter | `upgrade` command parser |
| `packages/sdlc-harness/src/commands/doctor.ts` | `doctor` adapter | `doctor` command parser |
| `packages/sdlc-harness/src/commands/validate.ts` | Validation command adapter | `validate-*` command parser |
| `packages/sdlc-harness/src/lib/init.ts` | Project initialization and adoption | agent selection, `harnessFolderName`, scaffold writer |
| `packages/sdlc-harness/src/lib/harness-root.ts` | Harness root resolution | package/config/env/default precedence |
| `packages/sdlc-harness/src/lib/config.ts` | Default package config | `defaultConfig()` |
| `packages/sdlc-harness/src/lib/upgrade.ts` | Upgrade orchestration | migration runner, sync handoff |
| `packages/sdlc-harness/src/lib/migrations.ts` | Schema and compatibility migrations | `runMigrations`, legacy root/layout migration |
| `packages/sdlc-harness/src/lib/doctor.ts` | Diagnostic model | config and managed-file checks |
| `packages/sdlc-harness/src/lib/validators.ts` | Node-side Harness validators | plan, lifecycle, docs and phase validators |
| `tests/sdlc-harness/*.test.mjs` | Package regression coverage | init/sync/doctor, upgrade, root resolution, validators |

## 4. 核心数据流

```txt
User runs sdlc-harness init/init --adopt
-> choose target Agent unless explicit harness folder/config exists
-> resolve <harnessRoot>
-> write config/state/docs scaffold
-> sync package canonical assets
-> doctor reports readiness
```

```txt
Existing project runs sdlc-harness upgrade
-> read current package/config/schema
-> run migrations for root names, managed layout, markers, plan/lifecycle shape
-> sync canonical assets
-> doctor reports remaining drift or blockers
```

## 5. 关键实现逻辑

- Agent selection happens before folder selection. `Codex` is the default and writes `.codex`; `Other` asks for a custom folder and defaults to `.agent`.
- New project lifecycle scaffolding starts at `SPRINTING` and allows `REVIEWING` next. Generated `plan.yaml` stores `current_task_id`, `next_task_sequence` and `tasks`; generated `plan.draft.yaml` stores only draft sequencing and tasks.
- Explicit CLI flags and existing JSON config have higher priority than interactive defaults.
- Managed files use package metadata blocks and merge strategies instead of blind overwrites.
- Package name and CLI name are intentionally separate: npm installs `agent-project-sdlc`, users run `sdlc-harness`.
- Migrations preserve compatibility with earlier `.harness`, `.agents` and `.agent` layouts while converging new installs on the configured `<harnessRoot>`.
- `migrateConfig` rewrites `core.package`, deletes legacy `core.version`, and preserves `core.schema_version`. Package version is intentionally not persisted in project config because the installed package manifest is the source of truth.
- Plan migrations remove stale `current_phase` from active and draft plans, remove draft `current_task_id`, and strip duplicate `phase` / `linked_task_id` from `parallel_execution`.
- Validation commands mirror the Python Harness gates closely enough for package consumers to run health checks without depending on this authoring workspace.
- `validate-dev` checks `Development Self-Test Report` content against the current `self_test_contract`: it requires legal `Report Status`, only accepts completion when report status and every scenario are `PASS`, rejects template module-key-path text, ambiguous status rows, missing scenario row evidence, missing required gates, embedded debug/operator/runbook/exploration log sections, and browser reports without page URL plus browser/Playwright/screenshot evidence. It remains a content consistency gate, not a command execution audit.

## Runnable Entry/Exit

- Entry points: `sdlc-harness` CLI commands (`init`, `sync`, `upgrade`, `doctor`, `validate-*`) and the root `npm run sdlc-harness` adapter.
- Exit / side effects: writes or checks Harness state/assets, reports validator diagnostics, and never publishes or pushes by default.
- Config contract: `package.json#sdlcHarness.harnessFolderName`, `<harnessRoot>/config.yaml` (`core.package`, `core.schema_version`, managed files and local overrides), and package default config.
- Fixture/live boundary: package tests and consumer lab use local fixtures; npm registry publish/smoke remains release-stage live behavior.

## Development Evidence

- Runnable Entry: `npm test --workspace agent-project-sdlc`, `node packages/sdlc-harness/dist/cli.js package sync-source`, `node packages/sdlc-harness/dist/cli.js package check-source`, `make validate-dev`, and `make validate-harness` are the task verification entrypoints.
- Observable Exit: `tests/sdlc-harness/sync-init-doctor.test.mjs` asserts generated config omits `core.version` and `doctor` reports `core package: agent-project-sdlc@<installed package version>`; `tests/sdlc-harness/upgrade.test.mjs` asserts migrated config omits legacy `core.version`; `package check-source` output was `package source OK`.
- Basic Self-test Evidence: `npm test --workspace agent-project-sdlc` PASS with 10/10 tests; `node packages/sdlc-harness/dist/cli.js package sync-source` PASS; `node packages/sdlc-harness/dist/cli.js package check-source` PASS.

## 6. 与技术方案的偏移

- Earlier plans used `.harness`, `.agents` and then `.agent` as defaults; current behavior is target-agent first, with Codex mapping to `.codex`.
- Historical task docs were written under `.docs/04_implementation/npm_package/dev_*.md`; DEV-043 migrated those facts into this module-level doc and sibling module docs.
- TASK-058 is a bug fix to existing `upgrade` metadata persistence; it does not add a public CLI capability, so `README.md`, `packages/sdlc-harness/README.md`, `PROJECT_SPEC.md` and `tools/consumer_lab_full_test.mjs` did not require updates. Regression coverage lives in `tests/sdlc-harness/upgrade.test.mjs`.

## 7. 测试覆盖（Test Coverage）

| 测试（Test） | 覆盖范围（Coverage） | 最近记录结果（Result） |
|---|---|---|
| `npm test` | TypeScript build and package CLI regression tests | PASS for `TASK-059` on 2026-05-28 |
| `tests/sdlc-harness/sync-init-doctor.test.mjs` | init, adopt, sync and doctor behavior | PASS for `TASK-059`; asserts generated lifecycle starts at `SPRINTING` and plan files do not duplicate phase |
| `tools/consumer_lab_full_test.mjs` | full consumer lab lifecycle smoke coverage | Checks generated `.codex/state/lifecycle.yaml` routes to `pjsdlc_dev_sprint` |
| `tests/sdlc-harness/upgrade.test.mjs` | migrations and automatic sync | PASS in package regression suite |
| `tests/sdlc-harness/harness-root.test.mjs` | root resolution and config precedence | PASS in package regression suite |
| `tests/sdlc-harness/validators.test.mjs` | package validators, including Development Self-Test Report content checks | PASS in package regression suite on 2026-05-30 |
| `make validate-harness` | authoring workspace Harness scaffold and docs | PASS for `DEV-054` on 2026-05-27 |
| `node packages/sdlc-harness/dist/cli.js package check-source` | package source mapping drift check | PASS for `DEV-054` on 2026-05-27 |
| `tests/sdlc-harness/sync-init-doctor.test.mjs` | generated config omits `core.version`; doctor reports installed package version from package metadata | PASS for `TASK-074` |
| `tests/sdlc-harness/upgrade.test.mjs` | upgrade removes legacy `core.version` from existing config | PASS for `TASK-074` |
| `npm test --workspace agent-project-sdlc` | TypeScript build and package regression, including stricter `validate-dev` self-test report fixtures | PASS on 2026-05-30 |
| `node packages/sdlc-harness/dist/cli.js package sync-source` | package assets reflect template and README source changes | PASS on 2026-05-30; changed 48 assets |
| `node packages/sdlc-harness/dist/cli.js package check-source` | package canonical assets match source after self-test report validation changes | PASS on 2026-05-30 |
| `make docs-overview && make validate-harness && make validate-plan` | source docs, generated overviews, scaffold and active plan after self-test report boundary hardening | PASS on 2026-05-30 |

## 8. 变更记录（Change Log）

| 日期（Date） | Task ID | Commit | 摘要（Summary） |
|---|---|---|---|
| 2026-05-25 | `DEV-001` - `DEV-023` | Historical implementation commits | Built the npm package, CLI lifecycle, root migration and managed layout. |
| 2026-05-25 | `DEV-040` | `40552f0` | Added target-agent selection during init. |
| 2026-05-25 | `DEV-041` | `c34ad14` | Migrated the authoring workspace Harness root to `.codex`. |
| 2026-05-26 | `DEV-043` | DEV-043 implementation commit | Migrated legacy task-grain implementation docs into module-level facts. |
| 2026-05-27 | `DEV-054` | Pending implementation commit | Changed fresh init lifecycle defaults from `REQUIREMENT_GATHERING` routing to `SPRINTING` developer routing. |
| 2026-05-28 | `TASK-058` | Pending implementation commit | Updated upgrade config migration to refresh `core.version` from the current package version. |
| 2026-05-28 | `TASK-059` | Pending implementation commit | Removed duplicate current phase state from generated and migrated plan files. |
| 2026-05-29 | `TASK-074` | Working tree | Removed redundant persisted `core.version`; doctor now derives package version from installed package metadata. |
| 2026-05-30 | Direct maintenance | Working tree | Strengthened `validate-dev` Development Self-Test Report content checks and documented that it is not execution-proof auditing. |
| 2026-05-30 | Self-test report boundary hardening | Working tree | Added Report Status, Current Operator Path, disallowed log-section and working_notes validator coverage. |

## 9. 后续维护注意事项

- Future package lifecycle changes should update this document instead of creating task-grain `dev_*.md` implementation docs.
- When CLI behavior changes, keep README user guidance, PRD acceptance criteria and package tests in sync.
- `tools/consumer_lab_full_test.mjs` keeps its fixture implementation doc aligned with the current `Development Self-Test Report` contract, including `Report Status`, while focused validator regressions live in `tests/sdlc-harness/validators.test.mjs`.
