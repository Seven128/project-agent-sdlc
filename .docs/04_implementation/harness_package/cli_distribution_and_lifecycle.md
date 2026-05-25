# CLI Distribution and Lifecycle Implementation

## 1. 关联信息

- Domain: `harness_package`
- Module / subsystem / core flow: CLI package distribution, init/sync/upgrade/doctor lifecycle
- Updated by task: `DEV-001`, `DEV-002`, `DEV-003`, `DEV-005`, `DEV-006`, `DEV-008`, `DEV-009`, `DEV-020`, `DEV-021`, `DEV-022`, `DEV-023`, `DEV-040`, `DEV-041`, `DEV-043`
- Linked PRD: `.docs/01_product/npm_package_distribution.md`
- Linked technical design: `.docs/03_tech_plan/harness_package_distribution.md`
- Linked RFC: `RFC_001`, `RFC_002`, `RFC_003`, `RFC_006`, `RFC_007`, `RFC_008`, `RFC_009`
- Linked commits: historical `DEV-*` implementation commits; `DEV-043` migration commit

## 2. 当前实现范围

- `agent-project-sdlc` npm package exposes the `sdlc-harness` CLI binary.
- `init` / `init --adopt` create or adopt a project Harness without overwriting user-owned project code.
- `sync` materializes managed Harness assets from package canonical assets into the selected `<harnessRoot>`.
- `upgrade` runs schema migrations and then syncs managed assets.
- `doctor` reports Harness config, managed file drift, override state and suggested gates.
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
- Explicit CLI flags and existing JSON config have higher priority than interactive defaults.
- Managed files use package metadata blocks and merge strategies instead of blind overwrites.
- Package name and CLI name are intentionally separate: npm installs `agent-project-sdlc`, users run `sdlc-harness`.
- Migrations preserve compatibility with earlier `.harness`, `.agents` and `.agent` layouts while converging new installs on the configured `<harnessRoot>`.
- Validation commands mirror the Python Harness gates closely enough for package consumers to run health checks without depending on this authoring workspace.

## 6. 与技术方案的偏移

- Earlier plans used `.harness`, `.agents` and then `.agent` as defaults; current behavior is target-agent first, with Codex mapping to `.codex`.
- Historical task docs were written under `.docs/04_implementation/npm_package/dev_*.md`; DEV-043 migrated those facts into this module-level doc and sibling module docs.

## 7. 测试覆盖（Test Coverage）

| 测试（Test） | 覆盖范围（Coverage） | 最近记录结果（Result） |
|---|---|---|
| `npm test` | TypeScript build and package CLI regression tests | PASS in release and development tasks through `DEV-042` |
| `tests/sdlc-harness/sync-init-doctor.test.mjs` | init, adopt, sync and doctor behavior | PASS in package regression suite |
| `tests/sdlc-harness/upgrade.test.mjs` | migrations and automatic sync | PASS in package regression suite |
| `tests/sdlc-harness/harness-root.test.mjs` | root resolution and config precedence | PASS in package regression suite |
| `tests/sdlc-harness/validators.test.mjs` | package validators | PASS in package regression suite |
| `make validate-harness` | authoring workspace Harness scaffold and docs | PASS for DEV-043 |

## 8. 变更记录（Change Log）

| 日期（Date） | Task ID | Commit | 摘要（Summary） |
|---|---|---|---|
| 2026-05-25 | `DEV-001` - `DEV-023` | Historical implementation commits | Built the npm package, CLI lifecycle, root migration and managed layout. |
| 2026-05-25 | `DEV-040` | `40552f0` | Added target-agent selection during init. |
| 2026-05-25 | `DEV-041` | `c34ad14` | Migrated the authoring workspace Harness root to `.codex`. |
| 2026-05-26 | `DEV-043` | DEV-043 implementation commit | Migrated legacy task-grain implementation docs into module-level facts. |

## 9. 后续维护注意事项

- Future package lifecycle changes should update this document instead of creating task-grain `dev_*.md` implementation docs.
- When CLI behavior changes, keep README user guidance, PRD acceptance criteria and package tests in sync.
