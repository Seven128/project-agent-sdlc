# .docs/04_implementation overview

<!-- generated-by: AI SDLC Harness build_doc_overviews.py -->
<!-- source-hash: 5e30d803a05a99b1 -->

Generated artifact. Markdown slices remain the source of truth.

Source hash: `5e30d803a05a99b1`

## Source Slices

1. [npm_package/dev_001_package_scaffold.md](npm_package/dev_001_package_scaffold.md)
2. [npm_package/dev_002_sync_init_doctor.md](npm_package/dev_002_sync_init_doctor.md)
3. [npm_package/dev_003_upgrade_migrations.md](npm_package/dev_003_upgrade_migrations.md)
4. [npm_package/dev_004_source_sync_ci.md](npm_package/dev_004_source_sync_ci.md)
5. [npm_package/dev_005_validate_commands.md](npm_package/dev_005_validate_commands.md)
6. [npm_package/dev_006_unified_harness_root.md](npm_package/dev_006_unified_harness_root.md)
7. [npm_package/dev_007_remove_tracked_agents_skills.md](npm_package/dev_007_remove_tracked_agents_skills.md)
8. [npm_package/dev_008_configurable_harness_root.md](npm_package/dev_008_configurable_harness_root.md)
9. [npm_package/dev_009_init_prompt_default_agent_root.md](npm_package/dev_009_init_prompt_default_agent_root.md)
10. [npm_package/dev_010_task_checkpoint_model.md](npm_package/dev_010_task_checkpoint_model.md)
11. [npm_package/dev_011_plan_yaml_no_checkpoint.md](npm_package/dev_011_plan_yaml_no_checkpoint.md)
12. [npm_package/dev_012_makefile_include_block.md](npm_package/dev_012_makefile_include_block.md)
13. [npm_package/dev_013_package_workspace_decoupling_principle.md](npm_package/dev_013_package_workspace_decoupling_principle.md)
14. [npm_package/dev_014_authoring_overlay_design.md](npm_package/dev_014_authoring_overlay_design.md)
15. [npm_package/dev_015_markdown_doc_overviews.md](npm_package/dev_015_markdown_doc_overviews.md)
16. [npm_package/dev_016_role_prompts_and_karpathy_guidelines.md](npm_package/dev_016_role_prompts_and_karpathy_guidelines.md)
17. [npm_package/dev_017_chinese_karpathy_guidelines.md](npm_package/dev_017_chinese_karpathy_guidelines.md)
18. [npm_package/dev_018_task_commit_push_rule.md](npm_package/dev_018_task_commit_push_rule.md)
19. [npm_package/dev_019_commit_before_task_compression.md](npm_package/dev_019_commit_before_task_compression.md)
20. [npm_package/dev_020_rename_npm_package.md](npm_package/dev_020_rename_npm_package.md)
21. [npm_package/dev_021_consolidate_managed_config.md](npm_package/dev_021_consolidate_managed_config.md)
22. [npm_package/dev_022_pjsdlc_marker_prefix.md](npm_package/dev_022_pjsdlc_marker_prefix.md)

---

## npm_package/dev_001_package_scaffold.md

Source: [npm_package/dev_001_package_scaffold.md](npm_package/dev_001_package_scaffold.md)

# DEV-001 npm 包骨架 Implementation Doc

## 1. 关联信息

- Task ID: `DEV-001`
- Linked PRD: `.docs/01_product/npm_package_distribution.md`
- Linked technical design: `.docs/03_tech_plan/harness_package_distribution.md`
- Linked RFC: none
- Linked commit: `a4b145c`

## 2. 本次实现范围

- 新增（Added）:
  - 根 `package.json`，声明 workspace。
  - `packages/sdlc-harness/` npm 包骨架，包含 `package.json`、`tsconfig.json`、CLI placeholder、command placeholder、lib type definitions、assets 和 migrations 目录。
  - `.harness/config.yaml`，声明 package version、schema version、managed files、local overrides 和 never overwrite。
  - `packages/sdlc-harness/source-mappings.yaml`，声明当前工作流源文件到包内 canonical source 的同步映射。
- 修改（Changed）:
  - `.harness/state/tasks.yaml`，记录 checkpoint 和任务状态。
  - `.docs/INDEX.md`，链接 implementation doc。
- 未覆盖（Not covered）:
  - 未实现真实 `sync`、`init`、`upgrade`、`doctor`、`package sync-source` 逻辑。
  - 未复制当前工作流内容到 `assets/**`；后续由 `package sync-source` 实现自动更新。

## 3. 真实代码结构

| 文件（File） | 作用（Purpose） | 关键函数/对象（Key Functions/Objects） |
|---|---|---|
| `package.json` | 根 workspace 声明 | `workspaces`、`scripts.sdlc-harness` |
| `packages/sdlc-harness/package.json` | npm 包元数据和 binary 声明 | `bin.sdlc-harness`、`files`、`scripts.build` |
| `packages/sdlc-harness/src/cli.ts` | CLI 入口 | `main()` |
| `packages/sdlc-harness/src/commands/index.ts` | 命令路由 | `commands` |
| `packages/sdlc-harness/src/commands/*.ts` | 命令 placeholder | `init`、`sync`、`upgrade`、`doctor`、`validate`、`packageSource` |
| `packages/sdlc-harness/src/lib/types.ts` | 共享数据类型 | `HarnessConfig`、`ManagedFile`、`SourceMapping` |
| `packages/sdlc-harness/src/lib/config.ts` | 默认配置模型 | `defaultConfig()` |
| `packages/sdlc-harness/source-mappings.yaml` | source authoring workspace 到 package assets 的映射 | `source_mappings` |
| `.harness/config.yaml` | 项目接入配置 | `core`、`managed_files`、`local_overrides`、`never_overwrite` |

## 4. 核心数据流

```txt
Workflow source files in this repository
-> packages/sdlc-harness/source-mappings.yaml
-> future package sync-source command
-> package canonical assets
-> future sync command
-> project workspace agent-readable files
```

## 5. 关键实现逻辑

- 输入校验（Input validation）: DEV-001 只建立类型和配置边界，未实现运行时输入校验。
- 核心分支（Core branches）: CLI placeholder 按命令名分发到 `init`、`sync`、`upgrade`、`doctor`、`validate` 和 `package`。
- 异常处理（Error handling）: `cli.ts` 捕获顶层异常并设置 `process.exitCode = 1`。
- 边界兜底（Boundary fallback）: `.harness/config.yaml` 明确 `.docs/**`、`.harness/state/**`、`src/**`、`tests/**` 为 `never_overwrite`。
- 性能或并发注意事项（Performance or concurrency notes）: 当前无并发逻辑。

## 6. 与技术方案的偏移

- 暂无功能性偏移。DEV-001 只完成包骨架和 manifest，完整命令逻辑按任务拆分留给 DEV-002 至 DEV-005。

## 7. 测试覆盖（Test Coverage）

| 测试（Test） | 覆盖范围（Coverage） | 结果（Result） |
|---|---|---|
| `python3` JSON parse check | 根 package、npm package metadata 和 `tsconfig.json` | PASS |
| `node -e` JSON parse check | Node runtime availability | BLOCKED，本机未安装 `node` |
| `make validate-checkpoint` | DEV-001 checkpoint 完整性 | PASS |
| `make lint` | 当前项目 lint gate placeholder | PASS |
| `make test-current-domain` | 当前任务 focused test gate placeholder | PASS |

## 8. 后续维护注意事项

- DEV-002 应实现真实 `sync`、`init`、`init --adopt` 和 `doctor`，不要继续扩展 placeholder。
- DEV-004 必须实现 `package sync-source` / `package check-source`，使本仓库工作流源文件变化时自动更新包内 canonical source，并用 CI 防止漂移。

---

## npm_package/dev_002_sync_init_doctor.md

Source: [npm_package/dev_002_sync_init_doctor.md](npm_package/dev_002_sync_init_doctor.md)

# DEV-002 sync/init/doctor Implementation Doc

## 1. 关联信息

- Task ID: `DEV-002`
- Linked PRD: `.docs/01_product/npm_package_distribution.md`
- Linked technical design: `.docs/03_tech_plan/harness_package_distribution.md`
- Linked RFC: none
- Linked commit: `559d169`

## 2. 本次实现范围

- 新增（Added）:
  - Node-only runtime helpers for filesystem, YAML, config, init, sync, and doctor.
  - `sdlc-harness init` / `init --adopt` minimal non-destructive project setup.
  - `sdlc-harness sync` materialization for `AGENTS.md` managed block, skills, templates, policies, Makefile fragment, and optional workflow.
  - `sdlc-harness doctor` diagnostics for config, required state/docs files, and managed paths.
  - Package assets for `AGENTS_CORE.md` and `.harness/make/sdlc-harness.mk`.
  - Node test coverage for init, sync, and doctor.
- 修改（Changed）:
  - Package metadata now includes `yaml`, `@types/node`, build/test/prepack scripts, and lockfile.
  - README clarifies state protocol vs state data.
  - `tasks.yaml` includes `README.md` and `package-lock.json` in DEV-002 allowed paths.
- 未覆盖（Not covered）:
  - `upgrade` migration behavior remains DEV-003.
  - `package sync-source` / `package check-source` remains DEV-004.
  - Full validator migration remains DEV-005.

## 3. 真实代码结构

| 文件（File） | 作用（Purpose） | 关键函数/对象（Key Functions/Objects） |
|---|---|---|
| `packages/sdlc-harness/src/lib/fs.ts` | Node filesystem helpers | `pathExists`、`writeTextIfChanged`、`copyTree` |
| `packages/sdlc-harness/src/lib/yaml.ts` | YAML parse/stringify wrapper | `parseYaml`、`stringifyYaml` |
| `packages/sdlc-harness/src/lib/config.ts` | Harness config defaults and read/write | `defaultConfig`、`readConfig`、`writeConfigIfMissing` |
| `packages/sdlc-harness/src/lib/init.ts` | Project initialization | `runInit` |
| `packages/sdlc-harness/src/lib/sync-engine.ts` | Managed file materialization | `runSync` |
| `packages/sdlc-harness/src/lib/doctor.ts` | Project diagnostics | `runDoctor` |
| `packages/sdlc-harness/src/commands/*.ts` | CLI command adapters | `init`、`sync`、`doctor` |
| `tests/sdlc-harness/sync-init-doctor.test.mjs` | Focused Node tests | `runInit`、`runSync`、`runDoctor` |

## 4. 核心数据流

```txt
sdlc-harness init
-> create missing .harness/config.yaml, .harness/state/**, .docs/**
-> runSync
-> materialize package assets into workspace
-> sdlc-harness doctor validates required state/docs/config paths
```

## 5. 关键实现逻辑

- 输入校验（Input validation）: `doctor` checks config and required state/docs files; `init` is non-destructive and uses `writeTextIfChanged`.
- 核心分支（Core branches）:
  - `init --adopt` and normal `init` share safe creation logic.
  - `sync` dispatches by managed path and strategy.
  - `AGENTS.md` uses marker replacement with `sdlc-harness:begin/end`.
- 异常处理（Error handling）: CLI top-level catches errors; `doctor` returns warnings/errors and sets exit code through command adapter.
- 边界兜底（Boundary fallback）: `.docs/**` and `.harness/state/**` are created if missing but not overwritten when content already exists.
- 性能或并发注意事项（Performance or concurrency notes）: sync is sequential and deterministic.

## 6. 与技术方案的偏移

- Validator runtime is now expected to be Node/TypeScript only; Python scripts remain reference implementation until DEV-005 migrates validation entrypoints.

## 7. 测试覆盖（Test Coverage）

| 测试（Test） | 覆盖范围（Coverage） | 结果（Result） |
|---|---|---|
| `npm test` | TypeScript build plus init/sync/doctor Node tests | PASS |
| `python3 tools/validate_allowed_paths.py` | DEV-002 changed file boundaries | PASS |
| `make validate-checkpoint` | DEV-002 checkpoint completeness | PASS |
| `make lint` | Current project lint gate placeholder | PASS |
| `make test-current-domain` | Current task focused gate placeholder | PASS |

## 8. 后续维护注意事项

- DEV-003 should make `upgrade` call migration and then `sync`.
- DEV-004 should populate package assets from source mappings and enforce drift checks.
- DEV-005 should replace Python validator dependency with Node/TypeScript validation commands.

---

## npm_package/dev_003_upgrade_migrations.md

Source: [npm_package/dev_003_upgrade_migrations.md](npm_package/dev_003_upgrade_migrations.md)

# DEV-003 upgrade/migrations Implementation Doc

## 1. 关联信息

- Task ID: `DEV-003`
- Linked PRD: `.docs/01_product/npm_package_distribution.md`
- Linked technical design: `.docs/03_tech_plan/harness_package_distribution.md`
- Linked RFC: none
- Linked commit: `2f2fc93`

## 2. 本次实现范围

- 新增（Added）:
  - `runMigrations` for config normalization, state task shape migration, and memory file creation.
  - `runUpgrade`, which runs migrations, then `sync`, then `doctor`.
  - Node test coverage for upgrade preserving and migrating project state structure.
- 修改（Changed）:
  - `sdlc-harness upgrade` command now calls real upgrade logic.
- 未覆盖（Not covered）:
  - No versioned multi-step migration chain yet; current schema version is `1`.
  - No package source drift check yet; DEV-004 covers that.

## 3. 真实代码结构

| 文件（File） | 作用（Purpose） | 关键函数/对象（Key Functions/Objects） |
|---|---|---|
| `packages/sdlc-harness/src/lib/migrations.ts` | State/config migration engine | `runMigrations`、`CURRENT_SCHEMA_VERSION` |
| `packages/sdlc-harness/src/lib/upgrade.ts` | Upgrade orchestration | `runUpgrade` |
| `packages/sdlc-harness/src/commands/upgrade.ts` | CLI adapter | `upgrade` |
| `tests/sdlc-harness/upgrade.test.mjs` | Focused upgrade test | `runUpgrade` |

## 4. 核心数据流

```txt
sdlc-harness upgrade
-> runMigrations
-> runSync
-> runDoctor
-> report blockers or success
```

## 5. 关键实现逻辑

- 输入校验（Input validation）: Upgrade uses existing config/state readers and doctor after migration.
- 核心分支（Core branches）:
  - Missing config is skipped by migration and reported later by doctor.
  - `tasks.yaml` gets missing `current_phase`, `current_task_id`, and `tasks` structure without replacing task values.
  - Missing `memory.md` is created with a short protocol note.
- 异常处理（Error handling）: Upgrade throws if sync reports blockers or doctor reports errors.
- 边界兜底（Boundary fallback）: State migrations add missing structure but preserve concrete project state values.
- 性能或并发注意事项（Performance or concurrency notes）: Migration and sync run sequentially.

## 6. 与技术方案的偏移

- 暂无。实现保持 `upgrade` 自动执行 `sync` 的 P0 约束。

## 7. 测试覆盖（Test Coverage）

| 测试（Test） | 覆盖范围（Coverage） | 结果（Result） |
|---|---|---|
| `npm test` | TypeScript build plus init/sync/doctor/upgrade tests | PASS |
| `python3 tools/validate_allowed_paths.py` | DEV-003 changed file boundaries | PASS |
| `make validate-checkpoint` | DEV-003 checkpoint completeness | PASS |
| `make lint` | Current project lint gate placeholder | PASS |
| `make test-current-domain` | Current task focused gate placeholder | PASS |

## 8. 后续维护注意事项

- DEV-004 should ensure package canonical assets do not drift from this self-hosting source workspace.
- Future schema versions should add explicit migration records to `migrations`.

---

## npm_package/dev_004_source_sync_ci.md

Source: [npm_package/dev_004_source_sync_ci.md](npm_package/dev_004_source_sync_ci.md)

# DEV-004 package source sync Implementation Doc

## 1. 关联信息

- Task ID: `DEV-004`
- Linked PRD: `.docs/01_product/npm_package_distribution.md`
- Linked technical design: `.docs/03_tech_plan/harness_package_distribution.md`
- Linked RFC: none
- Linked commit: `ee54878`

## 2. 本次实现范围

- 新增（Added）:
  - `sdlc-harness package sync-source` to update package canonical assets from this self-hosting workspace.
  - `sdlc-harness package check-source` to detect drift between source workspace files and package assets.
  - Package source mapping implementation for copy-file, copy-tree, managed block extraction, and Makefile target extraction mode.
  - CI steps to install Node dependencies, run package tests, and run package source drift check.
  - Package assets generated from current `AGENTS.md`, `.agents/skills/**`, `.harness/templates/**`, `.harness/policies/**`, `Makefile`, `.github/workflows/harness.yml`, and `tools/**`.
- 修改（Changed）:
  - `package` CLI subcommand now dispatches to real source sync/check behavior.
- 未覆盖（Not covered）:
  - DEV-005 still needs Node/TypeScript validator command implementation instead of Python validator execution.

## 3. 真实代码结构

| 文件（File） | 作用（Purpose） | 关键函数/对象（Key Functions/Objects） |
|---|---|---|
| `packages/sdlc-harness/src/lib/package-source.ts` | Source workspace to package asset sync/check | `syncSource`、`checkSource` |
| `packages/sdlc-harness/src/commands/package-source.ts` | CLI adapter | `packageSource` |
| `packages/sdlc-harness/assets/**` | Package canonical assets | synced skills/templates/policies/validators |
| `.github/workflows/harness.yml` | CI drift check | Node setup, npm test, package check-source |
| `tests/sdlc-harness/package-source.test.mjs` | Focused source sync test | `syncSource`、`checkSource` |

## 4. 核心数据流

```txt
sdlc-harness package sync-source
-> read packages/sdlc-harness/source-mappings.yaml
-> render each source mapping
-> write packages/sdlc-harness/assets/**
-> sdlc-harness package check-source verifies no drift
```

## 5. 关键实现逻辑

- 输入校验（Input validation）: source mappings are read from the committed package mapping file.
- 核心分支（Core branches）:
  - `copy-tree` copies directories while skipping `.gitkeep`.
  - `extract-managed-block` uses marker content when present, otherwise copies the whole source file.
  - `check-source` hashes normalized expected and existing content.
- 异常处理（Error handling）: CLI sets non-zero exit code when drift is detected.
- 边界兜底（Boundary fallback）: source mappings exclude `.docs/**` and `.harness/state/**`, so project instance state does not enter package assets.
- 性能或并发注意事项（Performance or concurrency notes）: source sync removes and rewrites target asset trees deterministically.

## 6. 与技术方案的偏移

- 暂无。实现满足“工作流源变化必须自动更新包 canonical source 并可检查漂移”的约束。

## 7. 测试覆盖（Test Coverage）

| 测试（Test） | 覆盖范围（Coverage） | 结果（Result） |
|---|---|---|
| `npm test` | TypeScript build plus init/sync/doctor/upgrade/source-sync tests | PASS |
| `node packages/sdlc-harness/dist/cli.js package check-source` | 当前仓库 source-to-package drift check | PASS |
| `python3 tools/validate_allowed_paths.py` | DEV-004 changed file boundaries | PASS |
| `make validate-checkpoint` | DEV-004 checkpoint completeness | PASS |
| `make lint` | Current project lint gate placeholder | PASS |
| `make test-current-domain` | Current task focused gate placeholder | PASS |

## 8. 后续维护注意事项

- 每次修改 `AGENTS.md`、Skill、templates、policies、Makefile、workflow 或 validators 后，都要运行 `sdlc-harness package sync-source` 并确认 `check-source` 通过。
- DEV-005 should replace Python validators as runtime dependencies with Node/TypeScript validation commands.

---

## npm_package/dev_005_validate_commands.md

Source: [npm_package/dev_005_validate_commands.md](npm_package/dev_005_validate_commands.md)

# DEV-005 TypeScript validators Implementation Doc

## 1. 关联信息

- Task ID: `DEV-005`
- Linked PRD: `.docs/01_product/npm_package_distribution.md`
- Linked technical design: `.docs/03_tech_plan/harness_package_distribution.md`
- Linked RFC: none
- Linked commit: `140e078`

## 2. 本次实现范围

- 新增（Added）:
  - TypeScript validator runtime for `validate-harness`, `validate-current`, `validate-pm`, `validate-design`, `validate-dev`, and `validate-checkpoint`.
  - CLI aliases such as `sdlc-harness validate-harness` in addition to `sdlc-harness validate validate-harness`.
  - Node test coverage for validator success cases.
- 修改（Changed）:
  - `packages/sdlc-harness/source-mappings.yaml` no longer copies Python `tools/**` into package assets.
  - Removed `packages/sdlc-harness/assets/validators/**` Python assets from the package canonical asset set.
- 未覆盖（Not covered）:
  - TypeScript validators are intentionally structural first-pass validators; future iterations can expand parity with every Python edge case.

## 3. 真实代码结构

| 文件（File） | 作用（Purpose） | 关键函数/对象（Key Functions/Objects） |
|---|---|---|
| `packages/sdlc-harness/src/lib/validators.ts` | Node-only validator runtime | `runValidator` |
| `packages/sdlc-harness/src/commands/validate.ts` | CLI adapter | `validate` |
| `packages/sdlc-harness/src/commands/index.ts` | Direct validate command aliases | `validate-harness`、`validate-current`、`validate-pm` |
| `packages/sdlc-harness/source-mappings.yaml` | Package source mappings | removed `tools -> assets/validators` mapping |
| `tests/sdlc-harness/validators.test.mjs` | Focused validator tests | `runValidator` |

## 4. 核心数据流

```txt
sdlc-harness validate-harness
-> runValidator(projectRoot, gate)
-> read project files with Node fs/yaml
-> return info/errors
-> CLI sets exitCode on errors
```

## 5. 关键实现逻辑

- 输入校验（Input validation）: validators check required files, PRD sections, design sections, task status/gate result, and checkpoint presence.
- 核心分支（Core branches）:
  - `validate-current` dispatches by `current_phase`.
  - `validate-dev` fails while open tasks remain and verifies done task implementation docs.
  - `validate-checkpoint` only requires checkpoint files when task state requires them.
- 异常处理（Error handling）: unknown validators return an error report; CLI exits non-zero when errors exist.
- 边界兜底（Boundary fallback）: missing YAML files are treated as empty objects and surfaced as validation errors.
- 性能或并发注意事项（Performance or concurrency notes）: validators run synchronously from the CLI perspective and avoid Python subprocess dependencies.

## 6. 与技术方案的偏移

- This completes the Node-only runtime direction for published npm package validation. Python validators remain in the reference workspace for now, but are no longer copied into package canonical assets.

## 7. 测试覆盖（Test Coverage）

| 测试（Test） | 覆盖范围（Coverage） | 结果（Result） |
|---|---|---|
| `npm test` | TypeScript build plus package command tests | PASS |
| `sdlc-harness validate-*` | Node validator runtime for harness, PM, design, checkpoint | PASS |
| `sdlc-harness package check-source` | Package canonical source drift | PASS |
| `python3 tools/validate_allowed_paths.py` | DEV-005 changed file boundaries | PASS |
| `make validate-checkpoint` | DEV-005 checkpoint completeness | PASS |
| `make lint` | Current project lint gate placeholder | PASS |
| `make test-current-domain` | Current task focused gate placeholder | PASS |

## 8. 后续维护注意事项

- Future iterations can deepen TypeScript validator parity and eventually remove duplicated Python validators from the reference workspace.
- Any future source mapping change must be followed by `sdlc-harness package sync-source` and `sdlc-harness package check-source`.

---

## npm_package/dev_006_unified_harness_root.md

Source: [npm_package/dev_006_unified_harness_root.md](npm_package/dev_006_unified_harness_root.md)

# DEV-006 Unified Harness Root Implementation Doc

## 1. 关联信息

- Task ID: `DEV-006`
- Linked PRD: `.docs/01_product/npm_package_distribution.md`
- Linked technical design: `.docs/03_tech_plan/harness_package_distribution.md`
- Linked RFC: `.docs/rfc/RFC_001_unify_harness_directory_model.md`
- Linked commit: `eb778fd`

## 2. 本次实现范围

- 新增（Added）:
  - `.harness/agents/skills/**` as the workspace canonical Skill source.
  - `.harness/managed/templates/**`、`.harness/managed/policies/**` and `.harness/managed/make/sdlc-harness.mk` as package-managed workspace assets.
  - Migration coverage for old `.agents/skills`、`.harness/templates`、`.harness/policies` and `.harness/make` config paths.
- 修改（Changed）:
  - Package default config, sync engine, source mappings, and Node validators now target the `.harness` canonical layout.
  - `sdlc-harness sync` materializes both `.harness/agents/skills/**` and `.agents/skills/**`.
  - README explains `.harness` as canonical root and `.agents` as compatibility view.
  - Package tests cover new sync output, source sync mappings, validator requirements, and config migration.
- 未覆盖（Not covered）:
  - Current Python local gate scripts still read legacy `.harness/policies/**` and `.harness/templates/**`; these legacy mirrors remain in this workspace for transition compatibility.

## 3. 真实代码结构

| 文件（File） | 作用（Purpose） | 关键函数/对象（Key Functions/Objects） |
|---|---|---|
| `.harness/config.yaml` | Current workspace package sync config | `managed_files`, `local_overrides` |
| `.harness/agents/skills/**/SKILL.md` | Canonical workspace Skill source | phase Skill files |
| `.harness/managed/templates/**` | Canonical package-managed templates | PRD/RFC/checkpoint/implementation templates |
| `.harness/managed/policies/**` | Canonical package-managed policies | `phase_contracts`, `gates`, `allowed_paths`, `risk_matrix` |
| `packages/sdlc-harness/src/lib/config.ts` | Default package config | `defaultConfig` |
| `packages/sdlc-harness/src/lib/sync-engine.ts` | Materializes package assets into projects | `runSync`, `syncManagedFile` |
| `packages/sdlc-harness/src/lib/migrations.ts` | Upgrades old project config layouts | `migrateConfig`, `migrateManagedFiles` |
| `packages/sdlc-harness/src/lib/validators.ts` | Node validation runtime | `validateHarness` |
| `packages/sdlc-harness/source-mappings.yaml` | Source workspace to package asset mapping | `.harness/agents`, `.harness/managed` sources |
| `tests/sdlc-harness/*.test.mjs` | Regression coverage for package behavior | sync/init/doctor, upgrade, validators, package source |

## 4. 核心数据流

```txt
harness source workspace
-> .harness/agents/skills + .harness/managed/*
-> sdlc-harness package sync-source
-> packages/sdlc-harness/assets/*
-> sdlc-harness sync
-> project .harness canonical files + .agents compatibility view
-> validate-harness / doctor
```

## 5. 关键实现逻辑

- 输入校验（Input validation）:
  - Node `validate-harness` requires `.harness/agents/skills`、`.harness/managed/templates` and `.harness/managed/policies`; DEV-007 removes `.agents/skills` from required tracked workspace state.
  - `package check-source` reads package mappings from `.harness/agents/skills` and `.harness/managed/**`.
- 核心分支（Core branches）:
  - `syncManagedFile` writes canonical Skill assets to `.harness/agents/skills`.
  - The same Skill assets are also written to `.agents/skills` for compatibility with Agent startup conventions.
  - Legacy config paths are still recognized by `syncManagedFile` so older config files do not immediately break.
  - `migrateManagedFiles` rewrites old config paths to the new canonical layout during `upgrade`.
- 异常处理（Error handling）:
  - Missing package asset directories are reported as skipped sync entries, preserving existing behavior.
  - Config migration deduplicates managed paths so old `.agents/skills` does not create duplicate entries.
- 边界兜底（Boundary fallback）:
  - Legacy `.harness/templates/**` and `.harness/policies/**` remain in the source workspace for current Python gates.
  - New npm package behavior does not rely on Python validators.
- 性能或并发注意事项（Performance or concurrency notes）:
  - Sync remains file-copy based and deterministic; no concurrent writes were introduced.

## 6. 与技术方案的偏移

- RFC_001 planned `.harness/managed/**` as canonical package-managed layout. The implementation applies that to npm package source mappings, sync, migrations, and Node validators.
- Full removal of legacy `.harness/templates/**` and `.harness/policies/**` is intentionally deferred because current local Python gates still depend on those paths.

## 7. 测试覆盖（Test Coverage）

| 测试（Test） | 覆盖范围（Coverage） | 结果（Result） |
|---|---|---|
| `npm test` | TypeScript build and all package tests | PASS |
| `node packages/sdlc-harness/dist/cli.js package check-source` | Source workspace to package assets drift check | PASS |
| `node packages/sdlc-harness/dist/cli.js validate-harness` | Node validator for new canonical layout | PASS |
| `make validate-harness` | Local Harness scaffold, prompt language, checkpoint, and doc overview gates | PASS |
| `make validate-checkpoint` | DEV-006 checkpoint completeness after >5 file change trigger | PASS |

## 8. 后续维护注意事项

- Future work can migrate local Python gate scripts to `.harness/managed/**` and then archive legacy `.harness/templates/**` / `.harness/policies/**`.
- When Skill, template, policy, Makefile, workflow, or AGENTS source changes, run `sdlc-harness package sync-source` and `package check-source`.
- Keep `.agents/skills/**` generated from `.harness/agents/skills/**`; do not treat `.agents` as the source of truth.

---

## npm_package/dev_007_remove_tracked_agents_skills.md

Source: [npm_package/dev_007_remove_tracked_agents_skills.md](npm_package/dev_007_remove_tracked_agents_skills.md)

# DEV-007 Remove Tracked Agents Skills Implementation Doc

## 1. 关联信息

- Task ID: `DEV-007`
- Linked PRD: `.docs/01_product/npm_package_distribution.md`
- Linked technical design: `.docs/03_tech_plan/harness_package_distribution.md`
- Linked RFC: `.docs/rfc/RFC_001_unify_harness_directory_model.md`
- Linked commit: `dd209fe`

## 2. 本次实现范围

- 新增（Added）:
  - `.gitignore` rule for `.agents/skills/` as a generated compatibility view.
  - DEV-007 checkpoint for the gate failure and >5 file change trigger.
- 修改（Changed）:
  - Removed tracked `.agents/skills/**/SKILL.md` files from the repository.
  - Python local gates now validate Skill files under `.harness/agents/skills/**`.
  - Node `validate-harness` no longer requires `.agents/skills/**`.
  - README and AGENTS now describe `.agents/skills/**` as generated and not a source authoring path.
  - Package `AGENTS_CORE.md` was regenerated from the updated `AGENTS.md`.
- 未覆盖（Not covered）:
  - `sdlc-harness sync` still supports generating `.agents/skills/**` for Agent clients that require that compatibility path.

## 3. 真实代码结构

| 文件（File） | 作用（Purpose） | 关键函数/对象（Key Functions/Objects） |
|---|---|---|
| `.gitignore` | Ignores generated compatibility Skill view | `.agents/skills/` |
| `.harness/agents/skills/**/SKILL.md` | Canonical tracked Skill source | phase Skill files |
| `tools/validate_harness.py` | Local Python Harness scaffold validator | canonical Skill path checks |
| `tools/validate_prompt_language.py` | Local prompt language validator | canonical Skill and template checks |
| `packages/sdlc-harness/src/lib/validators.ts` | Node package validator runtime | `validateHarness` |
| `tests/sdlc-harness/validators.test.mjs` | Regression for Node validator without `.agents/skills` | `runValidator` |

## 4. 核心数据流

```txt
tracked source
-> .harness/agents/skills/** + .harness/managed/**
-> validators read canonical .harness paths
-> optional sdlc-harness sync
-> local ignored .agents/skills/** compatibility view
```

## 5. 关键实现逻辑

- 输入校验（Input validation）:
  - Local Python validators no longer use `.agents/skills/**` as a required path.
  - Node `validate-harness` passes in a fixture without `.agents/skills/**`.
- 核心分支（Core branches）:
  - Source authoring and validation use `.harness/agents/skills/**`.
  - Compatibility output remains supported by `sdlc-harness sync`.
- 异常处理（Error handling）:
  - If an Agent client needs `.agents/skills/**`, running `sdlc-harness sync` regenerates it from package assets.
- 边界兜底（Boundary fallback）:
  - The deleted `.agents/skills/**` files still exist canonically under `.harness/agents/skills/**`.
- 性能或并发注意事项（Performance or concurrency notes）:
  - No runtime concurrency changes.

## 6. 与技术方案的偏移

- This tightens RFC_001 semantics: `.agents/skills/**` remains a generated compatibility view but is no longer tracked in the source workspace.

## 7. 测试覆盖（Test Coverage）

| 测试（Test） | 覆盖范围（Coverage） | 结果（Result） |
|---|---|---|
| `npm test` | TypeScript build and package tests | PASS |
| `node packages/sdlc-harness/dist/cli.js package check-source` | Package source drift after AGENTS update | PASS |
| `node packages/sdlc-harness/dist/cli.js validate-harness` | Node validator without tracked `.agents/skills` | PASS |
| `make validate-harness` | Local Python Harness checks using canonical Skill path | PASS |
| `make validate-current` | Sprint exit gate with all tasks closed | PASS |

## 8. 后续维护注意事项

- Do not edit or commit `.agents/skills/**`; edit `.harness/agents/skills/**` instead.
- If an Agent environment requires `.agents/skills/**`, regenerate it with `sdlc-harness sync`.

---

## npm_package/dev_008_configurable_harness_root.md

Source: [npm_package/dev_008_configurable_harness_root.md](npm_package/dev_008_configurable_harness_root.md)

# DEV-008 Configurable Harness Root Implementation Doc

## 1. 关联信息

- Task ID: `DEV-008`
- Linked PRD: `.docs/01_product/npm_package_distribution.md`
- Linked technical design: `.docs/03_tech_plan/harness_package_distribution.md`
- Linked RFC: `.docs/rfc/RFC_002_configurable_harness_root.md`
- Linked commit: `0c8423e`

## 2. 本次实现范围

- 新增（Added）:
  - `packages/sdlc-harness/src/lib/harness-root.ts`，统一读取 `harnessFolderName`。
  - `tests/sdlc-harness/harness-root.test.mjs`，覆盖默认 `.agents`、`package.json` 配置、`sdlc-harness.config.json` 和 `harnessFloderName` 兼容别名。
  - DEV-008 checkpoint，用于记录多文件变更现场。
- 修改（Changed）:
  - 当前仓库在 `package.json` 中声明 `sdlcHarness.harnessFolderName: ".harness"`。
  - Skill canonical source 从 `.harness/agents/skills/**` 移动到 `.harness/skills/**`。
  - `init`、`sync`、`doctor`、`migrations`、`validators` 改为使用动态 `<harnessRoot>`。
  - `.harness/config.yaml` 和 `packages/sdlc-harness/source-mappings.yaml` 改为 `.harness/skills`。
  - README、PRD、架构和技术方案补充默认 `.agents` 与显式 `.harness` 的根目录模型。
  - 包内 `AGENTS_CORE.md` 和 Skill assets 已通过 `package sync-source` 更新。
- 未覆盖（Not covered）:
  - 当前仓库本地 Python gate 仍按本仓库配置读取 `.harness/**`；npm 包运行时 validators 已支持动态 `<harnessRoot>`。

## 3. 真实代码结构

| 文件（File） | 作用（Purpose） | 关键函数/对象（Key Functions/Objects） |
|---|---|---|
| `package.json` | 当前仓库选择 `.harness` 作为 Harness root | `sdlcHarness.harnessFolderName` |
| `packages/sdlc-harness/src/lib/harness-root.ts` | 读取并校验 Harness root 配置 | `readHarnessRootConfig`, `harnessRoot`, `harnessConfigPath`, `harnessPath` |
| `packages/sdlc-harness/src/lib/config.ts` | 生成动态默认配置 | `defaultConfig`, `readConfig`, `writeConfigIfMissing` |
| `packages/sdlc-harness/src/lib/init.ts` | 初始化项目状态与 docs | `runInit`, `createProjectState` |
| `packages/sdlc-harness/src/lib/sync-engine.ts` | 按动态 root materialize assets | `runSync`, `syncManagedFile`, `renderAgentsCore` |
| `packages/sdlc-harness/src/lib/migrations.ts` | 迁移旧 managed paths | `runMigrations`, `migrateManagedFiles` |
| `packages/sdlc-harness/src/lib/validators.ts` | Node gate runtime | `validateHarness`, `validateCurrent`, `validateDev`, `validateCheckpoint` |
| `.harness/skills/**/SKILL.md` | 当前仓库 Skill canonical source | phase Skill files |
| `tests/sdlc-harness/*.test.mjs` | 行为回归测试 | default root, configured root, source sync, upgrade, validators |

## 4. 核心数据流

```txt
project root
-> read sdlc-harness.config.json#harnessFolderName
-> fallback read package.json#sdlcHarness.harnessFolderName
-> fallback default .agents
-> build <harnessRoot>/config.yaml + <harnessRoot>/state/** + <harnessRoot>/skills/** + <harnessRoot>/managed/**
-> validate / doctor / upgrade use the same resolved root
```

## 5. 关键实现逻辑

- 输入校验（Input validation）:
  - `harnessFolderName` 必须是非空相对路径。
  - 绝对路径、`.`、`..` 和包含 `..` 的路径会被拒绝。
  - `harnessFloderName` 作为拼写兼容别名读取，但新文档推荐 `harnessFolderName`。
- 核心分支（Core branches）:
  - `sdlc-harness.config.json` 优先于 `package.json#sdlcHarness`。
  - 未配置时默认 root 为 `.agents`，让 Skill 自然落到 `.agents/skills/**`。
  - 当前仓库通过 `package.json` 配置 root 为 `.harness`，因此 Skill 位于 `.harness/skills/**`。
- 异常处理（Error handling）:
  - JSON 配置解析失败会直接抛错，避免静默使用错误 root。
  - `doctor` 报告实际 resolved root，便于排查项目配置。
- 边界兜底（Boundary fallback）:
  - `sync` 和 `migrations` 仍识别旧 `.harness/agents/skills`、`.agents/skills`、`.harness/templates`、`.harness/policies` 和 `.harness/make` 路径，便于旧项目升级。
- 性能或并发注意事项（Performance or concurrency notes）:
  - Root 解析是本地 JSON 读取，没有引入网络或并发写入。

## 6. 与技术方案的偏移

- RFC_002 要求支持 `package.json` 或其它合理 JSON 配置。本实现额外支持 `sdlc-harness.config.json`，并规定其优先级高于 `package.json`。
- 默认项目不再生成 `.agents/skills` 之外的 compatibility view；`.agents` 本身就是默认 `<harnessRoot>`。

## 7. 测试覆盖（Test Coverage）

| 测试（Test） | 覆盖范围（Coverage） | 结果（Result） |
|---|---|---|
| `npm test` | TypeScript build and package behavior tests | PASS |
| `tests/sdlc-harness/harness-root.test.mjs` | root config resolution and alias support | PASS |
| `tests/sdlc-harness/sync-init-doctor.test.mjs` | default `.agents` init/sync/doctor and configured `.harness` init/sync/doctor | PASS |
| `tests/sdlc-harness/upgrade.test.mjs` | old paths migrating to configured `.harness/skills` layout | PASS |
| `tests/sdlc-harness/validators.test.mjs` | Node validators using configured `.harness` root | PASS |
| `node packages/sdlc-harness/dist/cli.js package check-source` | source workspace to package assets drift check | PASS |
| `node packages/sdlc-harness/dist/cli.js validate-harness` | current workspace resolved root `.harness` | PASS |
| `make validate-harness` | local Harness scaffold, prompt language, checkpoint, and doc overview gates | PASS |

## 8. 后续维护注意事项

- 新项目未配置时会默认写入 `.agents/**`，这是 Agent Skill discovery 的低摩擦路径。
- 使用 `.harness` 的项目需要在项目入口规则中明确 `.harness/skills/**` 是 Skill source；当前仓库已通过 `AGENTS.md` 和 `package.json` 声明。
- 当 Harness source workspace 中的 Skill、模板、策略、Makefile、workflow 或 `AGENTS.md` 变化时，继续运行 `sdlc-harness package sync-source` 和 `package check-source`，防止包内 assets 漂移。

---

## npm_package/dev_009_init_prompt_default_agent_root.md

Source: [npm_package/dev_009_init_prompt_default_agent_root.md](npm_package/dev_009_init_prompt_default_agent_root.md)

# DEV-009 Init Prompt And Default Agent Root Implementation Doc

## 1. 关联信息

- Task ID: `DEV-009`
- Linked PRD: `.docs/01_product/npm_package_distribution.md`
- Linked technical design: `.docs/03_tech_plan/harness_package_distribution.md`
- Linked RFC: `.docs/rfc/RFC_003_init_prompt_and_default_agent_root.md`
- Linked commit: `5c0e501`

## 2. 本次实现范围

- 新增（Added）:
  - `sdlc-harness init` 的 Harness folder name 交互式询问。
  - `--harness-folder <path>` / `--harness-folder=<path>` CLI 参数，用于脚本和测试指定 root。
  - `packages/sdlc-harness/src/lib/package-json-config.ts`，负责读写 `package.json#sdlcHarness.harnessFolderName`。
  - `RFC_003` 和 DEV-009 checkpoint。
- 修改（Changed）:
  - 默认 Harness root 从 `.agents` 改为 `.agent`。
  - 当前仓库工作流事实源从 `.harness/**` 迁移到 `.agent/**`。
  - 当前仓库移除 `package.json#sdlcHarness.harnessFolderName`，遵循默认 `.agent`。
  - 本地 Python tools、`AGENTS.md`、README、PRD、架构、技术方案和 source mappings 全部指向 `.agent` 当前 root。
  - `sync` 渲染 `AGENTS.md` managed block 时以 `.agent` 作为模板 root 替换源。
  - 包测试覆盖默认 `.agent`、自定义 `.harness`、CLI 默认写入和已有 package 配置沿用。
- 未覆盖（Not covered）:
  - 没有引入复杂多选 UI；首版使用一行文本输入，直接回车采用默认。

## 3. 真实代码结构

| 文件（File） | 作用（Purpose） | 关键函数/对象（Key Functions/Objects） |
|---|---|---|
| `packages/sdlc-harness/src/commands/init.ts` | CLI init 入口和交互逻辑 | `resolveInitHarnessRoot`, `promptHarnessRoot`, `valueForArg` |
| `packages/sdlc-harness/src/lib/package-json-config.ts` | 写入 package root 配置 | `packageHarnessRoot`, `writePackageHarnessRoot` |
| `packages/sdlc-harness/src/lib/paths.ts` | 包默认 root 常量 | `DEFAULT_HARNESS_ROOT = ".agent"` |
| `packages/sdlc-harness/src/lib/harness-root.ts` | root 配置读取和校验 | `normalizeHarnessFolderName` |
| `packages/sdlc-harness/src/lib/init.ts` | 初始化前的非空判断 | `projectHasExistingFiles` |
| `.agent/**` | 当前仓库 Harness 工作流事实源 | state, skills, managed templates, policies |
| `tools/*.py` | 当前仓库本地 gate 和状态工具 | `.agent` 路径 |
| `tests/sdlc-harness/sync-init-doctor.test.mjs` | init/sync/doctor 和 CLI 回归 | CLI default/custom/existing package config |

## 4. 核心数据流

```txt
sdlc-harness init
-> if package/sdlc config exists, keep it
-> else ask Harness folder name in TTY
-> non-TTY uses .agent
-> write package.json#sdlcHarness.harnessFolderName
-> runInit resolves root
-> create <harnessRoot>/config.yaml + state + managed assets
```

## 5. 关键实现逻辑

- 输入校验（Input validation）:
  - 复用 `normalizeHarnessFolderName`，拒绝空值、`.`、`..`、绝对路径和包含 `..` 的路径。
  - 直接回车时使用 `.agent`。
- 核心分支（Core branches）:
  - `--harness-folder` 显式参数优先。
  - 已存在 `package.json#sdlcHarness.harnessFolderName` 或 `sdlc-harness.config.json` 时，沿用现有配置。
  - 非交互环境不阻塞，直接写入默认 `.agent`。
- 异常处理（Error handling）:
  - 非对象 `package.json` 会报错，避免写入不可预期结构。
  - 写入 package 配置后再运行 `runInit`，保证 config/state/managed files 落在同一个 root。
- 边界兜底（Boundary fallback）:
  - 旧 `.harness` 和 `.agents` 路径仍保留在 migration/sync 的 legacy branches 中，便于老项目升级。
- 性能或并发注意事项（Performance or concurrency notes）:
  - 仅本地 JSON 和文件写入，没有新增网络依赖。

## 6. 与技术方案的偏移

- RFC_003 要求 CLI 询问目录名。本实现额外提供 `--harness-folder`，用于非交互脚本和自动测试。
- 当前仓库遵循默认 `.agent`，所以根 `package.json` 不再保留 `sdlcHarness.harnessFolderName`。

## 7. 测试覆盖（Test Coverage）

| 测试（Test） | 覆盖范围（Coverage） | 结果（Result） |
|---|---|---|
| `npm test` | TypeScript build and package behavior tests | PASS |
| `tests/sdlc-harness/harness-root.test.mjs` | 默认 `.agent` root 和自定义 root 配置读取 | PASS |
| `tests/sdlc-harness/sync-init-doctor.test.mjs` | 默认 `.agent`、自定义 `.harness`、CLI init 默认写入、CLI 自定义写入、已有 package 配置沿用 | PASS |
| `node packages/sdlc-harness/dist/cli.js package check-source` | 当前 `.agent` source workspace 到包 assets 无漂移 | PASS |
| `node packages/sdlc-harness/dist/cli.js validate-harness` | 当前仓库 resolved root `.agent` | PASS |
| `make validate-harness` | 本地 Harness scaffold、prompt language、checkpoint、overview gates | PASS |

## 8. 后续维护注意事项

- 当前仓库的 Harness fact source 是 `.agent/**`；不要再新增 `.harness/**` 作为当前 root。
- 自定义业务项目仍可在 init 时输入 `.harness`，CLI 会写入 `package.json#sdlcHarness.harnessFolderName`。
- 后续改动 `AGENTS.md`、Skill、templates、policies、Makefile 或 workflow 后，继续运行 `sdlc-harness package sync-source` 和 `package check-source`。

---

## npm_package/dev_010_task_checkpoint_model.md

Source: [npm_package/dev_010_task_checkpoint_model.md](npm_package/dev_010_task_checkpoint_model.md)

# DEV-010 Task Checkpoint Model Implementation Doc

## 1. 关联信息

- Task ID: DEV-010
- Linked PRD: `.docs/01_product/npm_package_distribution.md`
- Linked technical design: `.docs/03_tech_plan/harness_package_distribution.md`
- Linked RFC: `.docs/rfc/RFC_004_simplify_task_checkpoint_archive_model.md`
- Linked commit: DEV-010 git commit

## 2. 本次实现范围

- 新增（Added）:
  - `Task Contract` checkpoint 模板区块，用于声明 `allowed_paths`、`required_gates` 和验收标准。
  - RFC_004、PRD-NPM-017 和 DEV-010 技术方案记录。
  - Node validator 覆盖 open task checkpoint contract。
- 修改（Changed）:
  - `tasks.yaml` 和 `tasks.draft.yaml` 改为轻量 task 索引，不再保存完整路径和 gate 合同。
  - Python validators 从活跃 checkpoint 读取路径合同，并要求 open task 有 checkpoint、done task 不保留 checkpoint。
  - 阶段 Skill、模板、policy、README 和 AGENTS 协议改用活跃 checkpoint 语义。
  - `.docs/INDEX.md` 修正 `.agent` state 路由和 implementation doc 相对链接。
- 未覆盖（Not covered）:
  - 未新增自动 git commit/tag 创建逻辑；task 历史动作记录由用户或外部 SCM 流程执行。

## 3. 真实代码结构

| 文件（File） | 作用（Purpose） | 关键函数/对象（Key Functions/Objects） |
|---|---|---|
| `tools/harness_utils.py` | 提供轻量 task schema 和 checkpoint contract 解析工具 | `validate_task_shape`, `extract_task_contract`, `expand_harness_root` |
| `tools/validate_checkpoint.py` | 校验 open task checkpoint 和 done task checkpoint 清理 | `validate_checkpoint_file`, `main` |
| `tools/validate_allowed_paths.py` | 从当前 checkpoint 读取 `allowed_paths` 校验工作树改动 | `main` |
| `packages/sdlc-harness/src/lib/validators.ts` | 对齐 npm 包 Node validators 的 checkpoint 语义 | `validateCheckpoint`, `taskContract`, `validateDev` |
| `.agent/managed/templates/CHECKPOINT_TEMPLATE.md` | 生成 active checkpoint 的合同模板 | `Task Contract` |
| `.agent/state/tasks.yaml` | 当前 sprint 的轻量 task 索引 | `tasks[]`, `current_task_id` |

## 4. 核心数据流

```txt
current_task_id
-> tasks.yaml 找到 open task checkpoint
-> checkpoint Task Contract 解析 allowed_paths / required_gates
-> validate_allowed_paths 检查 git changed files
-> task gates 通过
-> implementation doc 写入
-> task 标记 done 并删除 checkpoint
```

## 5. 关键实现逻辑

- 输入校验（Input validation）:
  - `validate_task_shape` 只要求 `id`、`title`、`status`、`summary`、`implementation_doc`。
  - open task 必须有 `checkpoint`；closed task 不允许保留 `checkpoint`。
- 核心分支（Core branches）:
  - 有 open task 时，`validate_allowed_paths.py` 读取当前 checkpoint `Task Contract`。
  - 无 open task 时，路径合同校验跳过，因为没有活跃执行合同。
  - `validate_checkpoint.py` 校验 open task checkpoint 文件存在、包含必需章节和 contract 字段。
- 异常处理（Error handling）:
  - checkpoint 缺失、contract 缺失、`allowed_paths` 或 `required_gates` 为空都会 gate failure。
  - done task 仍保留 checkpoint 字段会 gate failure。
- 边界兜底（Boundary fallback）:
  - `latest.md` 不再强制存在；如果存在，则必须引用当前 task，防止旧恢复入口误导 Agent。
- 性能或并发注意事项（Performance or concurrency notes）:
  - validator 只解析当前 checkpoint，避免每次读取历史 task 的大段执行信息。

## 6. 与技术方案的偏移

- task state 不保存 `commit` 字段，避免重复 git 历史和在同一提交中记录自身 hash 的循环。
- `.agent/templates/**` 作为旧本地模板副本同步更新，但 package source 仍以 `.agent/managed/**` 为准。

## 7. 测试覆盖（Test Coverage）

| 测试（Test） | 覆盖范围（Coverage） | 结果（Result） |
|---|---|---|
| `npm test` | TypeScript build、init/sync/upgrade/package source/validators tests | PASS |
| `node packages/sdlc-harness/dist/cli.js package check-source` | 本地 Harness source 与 package assets 无漂移 | PASS |
| `node packages/sdlc-harness/dist/cli.js validate-harness` | Node harness validator | PASS |
| `python3 tools/validate_checkpoint.py` | open task checkpoint contract | PASS |
| `python3 tools/validate_allowed_paths.py` | active checkpoint allowed paths | PASS |
| `make validate-harness` | 本地 harness、prompt language、checkpoint、overview gates | PASS |

## 8. 后续维护注意事项

- 新 task 创建时先写轻量 `tasks.yaml` 记录和对应 checkpoint；done 后删除 checkpoint。
- 如后续要自动强制 task commit，可在 SCM 层实现，不应把 commit 历史重复写入 archive。

---

## npm_package/dev_011_plan_yaml_no_checkpoint.md

Source: [npm_package/dev_011_plan_yaml_no_checkpoint.md](npm_package/dev_011_plan_yaml_no_checkpoint.md)

# DEV-011 Implementation: plan.yaml no checkpoint

## Task

- Task ID: `DEV-011`
- Title: 合并 checkpoint 到 `plan.yaml` 并重命名 tasks 状态
- PRD: `.docs/01_product/npm_package_distribution.md`
- Tech Plan: `.docs/03_tech_plan/harness_package_distribution.md`
- RFC: `.docs/rfc/RFC_005_merge_checkpoint_into_plan.md`

## Implementation Summary

`tasks.yaml` / `tasks.draft.yaml` 被替换为 `plan.yaml` / `plan.draft.yaml`。open task 的 `allowed_paths`、`required_gates`、`acceptance_criteria`、`working_notes` 直接保存在 `plan.yaml` 当前 task 条目中；done/cancelled task 不再保留这些活跃执行字段。

checkpoint 机制被移除：不再创建 `<harnessRoot>/state/checkpoints/`，不再分发 `CHECKPOINT_TEMPLATE.md`，Makefile、Python validators、Node CLI validators 和 GitHub workflow 都不再暴露 `validate-checkpoint`。

## Changed Files

| Path | Purpose |
|---|---|
| `.agent/state/plan.yaml` | 当前执行计划事实源，包含 DEV-011 open task 合同，完成后会压缩为摘要。 |
| `.agent/state/plan.draft.yaml` | 架构阶段计划草案事实源，替代旧 `tasks.draft.yaml`。 |
| `tools/validate_plan.py` / `tools/validate_plan_draft.py` | 替代旧 task validator，并校验 open/done task 字段边界。 |
| `tools/validate_allowed_paths.py` | 从当前 open task 读取 `allowed_paths`。 |
| `packages/sdlc-harness/src/lib/{init,doctor,migrations,validators}.ts` | 初始化、诊断、迁移和 Node validator 全部切换到 plan 模型。 |
| `.agent/skills/**` / `.agent/managed/templates/**` / `.agent/policies/**` | 阶段规则和模板改为 plan protocol。 |
| `tests/sdlc-harness/**` | 覆盖 init、upgrade 和 validator 的 plan 行为。 |

## Plan Deviations

RFC_005 原计划删除 checkpoint 并重命名 task state；实现中同时增强了 upgrade migration：旧 `tasks.yaml` / `tasks.draft.yaml` 会迁移为 `plan.yaml` / `plan.draft.yaml`，并在可解析时把旧 checkpoint `Task Contract` 合并回 open task。

## Verification

| Gate | Result |
|---|---|
| `npm test` | PASS |
| `node packages/sdlc-harness/dist/cli.js package check-source` | PASS |
| `node packages/sdlc-harness/dist/cli.js validate-harness` | PASS |
| `make validate-harness` | PASS |
| `make validate-rfc` | PASS |
| `python3 tools/validate_allowed_paths.py` | PASS |
| `make validate-current` | PASS |

---

## npm_package/dev_012_makefile_include_block.md

Source: [npm_package/dev_012_makefile_include_block.md](npm_package/dev_012_makefile_include_block.md)

# DEV-012 Implementation: Makefile include managed block

## Task

- Task ID: `DEV-012`
- Title: 为 `sync` 增加 `Makefile` include 托管块
- PRD: `.docs/01_product/npm_package_distribution.md`
- Tech Plan: `.docs/03_tech_plan/harness_package_distribution.md`

## Implementation Summary

`sdlc-harness sync` 现在会用 managed block 管理根 `Makefile` 的 Harness 接入片段。新项目会得到一个只包含 include block 的 `Makefile`；已有项目会在文件开头插入 include block，并保留项目原有内容。

`AGENTS.md` 和 `Makefile` 的 block 合并逻辑统一为完整 marker 替换：只有同时存在且唯一的 begin/end marker 时才替换 block 内容；marker 缺失一边、顺序错误或重复时，`sync` 返回 `blocked`，避免猜测式覆盖。

## Changed Files

| Path | Purpose |
|---|---|
| `packages/sdlc-harness/src/lib/sync-engine.ts` | 增加 `Makefile` include block 同步，并抽出通用 managed block 合并保护。 |
| `packages/sdlc-harness/src/lib/managed-file.ts` | 增加 `Makefile` marker 常量。 |
| `packages/sdlc-harness/src/lib/config.ts` | 默认 managed files 增加根 `Makefile` 的 `merge-block` 项。 |
| `packages/sdlc-harness/src/lib/migrations.ts` | 旧 config 在 `upgrade` 时补入根 `Makefile` 管理项。 |
| `tests/sdlc-harness/sync-init-doctor.test.mjs` | 覆盖默认/custom root 的 Makefile include、已有 Makefile 内容保留、坏 marker blocker。 |
| `tests/sdlc-harness/upgrade.test.mjs` | 覆盖旧 config 升级后补入 Makefile 管理项并生成 include block。 |

## Behavior Notes

`Makefile` block 形如：

```make
# sdlc-harness:make:begin
# Included before project targets so project recipes win on name conflicts.
-include .agent/managed/make/sdlc-harness.mk
.DEFAULT_GOAL :=
# sdlc-harness:make:end
```

当已有项目存在自己的 targets 时，block 插在文件开头并清空 include 产生的默认 goal，让项目自己的第一个 target 继续作为默认入口。项目后续定义的同名 target 会覆盖 Harness fragment 中的默认占位 target。

## Plan Deviations

技术方案已要求 `Makefile` 不整体覆盖，并生成 `<harnessRoot>/managed/make/sdlc-harness.mk`；实现中额外把根 `Makefile` 作为 `merge-block` managed file 写入 default config 和 migration，确保 `init`、`sync` 和 `upgrade` 都能接上线。

## Verification

| Gate | Result |
|---|---|
| `npm test` | PASS |
| `python3 tools/validate_allowed_paths.py` | PASS |
| `node packages/sdlc-harness/dist/cli.js validate-harness` | PASS |
| `make validate-harness` | PASS |
| `node packages/sdlc-harness/dist/cli.js package check-source` | PASS |

---

## npm_package/dev_013_package_workspace_decoupling_principle.md

Source: [npm_package/dev_013_package_workspace_decoupling_principle.md](npm_package/dev_013_package_workspace_decoupling_principle.md)

# DEV-013 Implementation: package and workspace decoupling principle

## Task

- Task ID: `DEV-013`
- Title: 补充包与项目解耦设计原则
- PRD: `.docs/01_product/npm_package_distribution.md`
- Tech Plan: `.docs/03_tech_plan/harness_package_distribution.md`

## Implementation Summary

README 新增包与项目解耦原则：Harness npm 包只负责提供和升级工作流能力，用户仓库负责保存项目事实、状态数据、业务内容和本地取舍。

`sync` / `upgrade` 的说明补充为增量合并模型，明确 `AGENTS.md`、`Makefile` 等高冲突入口只能通过 managed block、include block 或 create-if-missing 接入；遇到 marker、checksum、override 或本地差异冲突时应报告 blocker，不做全量覆盖。

## Changed Files

| Path | Purpose |
|---|---|
| `README.md` | 在核心设计原则和 npm 包化章节补充包与用户仓库解耦原则。 |

## Verification

| Gate | Result |
|---|---|
| `make validate-harness` | PASS |

---

## npm_package/dev_014_authoring_overlay_design.md

Source: [npm_package/dev_014_authoring_overlay_design.md](npm_package/dev_014_authoring_overlay_design.md)

# DEV-014 Implementation: Harness authoring overlay design

## Task

- Task ID: `DEV-014`
- Title: 补充 Harness Authoring Overlay 设计
- PRD: `.docs/01_product/npm_package_distribution.md`
- Tech Plan: `.docs/03_tech_plan/harness_package_distribution.md`

## Implementation Summary

README 新增 Harness Authoring Overlay 设计，用于区分三类内容：

- 通用 Harness 配置：默认进入 npm package canonical assets，面向所有接入项目。
- 项目实例数据：当前项目的 `.agent/state/**` 和 `.docs/**`，不由包覆盖。
- Harness authoring overlay：只在本仓库开发 Harness 自身时使用的原则、专用 Skill 和包化安全规则，默认不进入 npm 包，也不分发到用户项目。

README 同时记录了 authoring overlay 的推荐目录、默认分发规则、影响面和晋升准则。

## Changed Files

| Path | Purpose |
|---|---|
| `README.md` | 在核心设计原则和第十七章自举开发说明中补充 authoring overlay 分层。 |

## Impact Notes

本次只更新设计文档，不创建 `.agent/authoring/**` 目录，也不改变 `package sync-source`、`sync`、`upgrade` 或 validator 行为。后续真正落地 authoring overlay 时，需要同步评估 `AGENTS.md` 读取规则、`source-mappings.yaml`、package assets、validators 和 Skill 晋升流程。

## Verification

| Gate | Result |
|---|---|
| `make validate-harness` | PASS |

---

## npm_package/dev_015_markdown_doc_overviews.md

Source: [npm_package/dev_015_markdown_doc_overviews.md](npm_package/dev_015_markdown_doc_overviews.md)

# DEV-015 Implementation: Markdown doc overviews

## Task

- Task ID: `DEV-015`
- Title: 将 docs overview 派生视图从 HTML 改为 Markdown
- PRD: `.docs/01_product/npm_package_distribution.md`
- Tech Plan: `.docs/03_tech_plan/harness_package_distribution.md`

## Implementation Summary

`.docs/<stage>/overview.html` 被替换为 `.docs/<stage>/overview.md`。生成器现在直接拼接阶段 Markdown slices，保留 source hash、source slice 列表和每个 slice 的原始 Markdown 内容。

`make docs-overview` 会写入 `overview.md` 并删除同目录旧 `overview.html`；`make validate-doc-overviews` 会检查 `overview.md` 是否最新，并把遗留 `overview.html` 视为过期生成物。

## Changed Files

| Path | Purpose |
|---|---|
| `tools/build_doc_overviews.py` | 输出 deterministic Markdown overview，并删除/拦截旧 HTML 生成物。 |
| `AGENTS.md` / `README.md` | 将派生视图规则从 `overview.html` 更新为 `overview.md`。 |
| `Makefile` / `.agent/managed/make/sdlc-harness.mk` | 命令帮助文案改为 Markdown overview。 |
| `.agent/skills/**` / `.agent/templates/**` / `.agent/managed/templates/**` | 阶段完成检查和 Skill 模板改为 `overview.md`。 |
| `packages/sdlc-harness/assets/**` | 包内 canonical assets 同步为 `overview.md` 语义。 |
| `.docs/**/overview.md` | 新的 Markdown 派生视图。 |

## Impact Notes

HTML 的优势主要在交互和图文排版，但当前 Harness 没有自动生成图文内容的能力。Markdown overview 更贴近现阶段事实源形态，也更适合 Agent 直接读取、diff 和校验。

历史 `overview.html` 不再保留，避免同一阶段目录中同时存在两种派生视图导致人和 Agent 混淆。

## Verification

| Gate | Result |
|---|---|
| `make docs-overview` | PASS |
| `make validate-doc-overviews` | PASS |
| `node packages/sdlc-harness/dist/cli.js package check-source` | PASS |
| `make validate-harness` | PASS |
| `make validate-current` | PASS |
| `npm test` | PASS |

---

## npm_package/dev_016_role_prompts_and_karpathy_guidelines.md

Source: [npm_package/dev_016_role_prompts_and_karpathy_guidelines.md](npm_package/dev_016_role_prompts_and_karpathy_guidelines.md)

# DEV-016 Implementation: role prompts and Karpathy guidelines

## Task

- Task ID: `DEV-016`
- Title: 补全通用角色提示词和 Karpathy 基础原则
- PRD: `.docs/01_product/npm_package_distribution.md`
- Tech Plan: `.docs/03_tech_plan/harness_package_distribution.md`

## Implementation Summary

通用阶段 Skill 新增 `## 角色提示词`，让每个角色不仅能执行文档切片和状态更新，也能以专业角色姿态与用户对话式澄清、权衡并生成阶段产物。

`AGENTS.md` 中的 Karpathy-inspired 通用原则已补全为 `multica-ai/andrej-karpathy-skills` 的 MIT `CLAUDE.md` guideline 内容，并保留 Harness 额外约束：阶段约束优先、文档先于实现、验证闭环和派生物可再生成。

## Changed Files

| Path | Purpose |
|---|---|
| `AGENTS.md` | 补全 Karpathy guideline 原文内容，并保留 Harness 补充原则。 |
| `.agent/skills/**/SKILL.md` | 为 manager、pm、architect、developer、implementation_doc、reviewer、tester、release_manager、rfc_recalibrate 增加通用角色提示词。 |
| `.agent/managed/templates/SKILL_TEMPLATE.md` / `.agent/templates/SKILL_TEMPLATE.md` | 为未来 Skill 模板增加 `## 角色提示词` 槽位。 |
| `tools/validate_prompt_language.py` | 将 `## 角色提示词` 纳入 Skill 必需章节。 |
| `README.md` | 说明通用阶段 Skill 必须包含对话式角色提示词。 |
| `packages/sdlc-harness/assets/**` | 通过 `package sync-source` 同步包内 canonical assets。 |

## Source Notes

- `multica-ai/andrej-karpathy-skills` README 标注 License 为 MIT。
- 本次纳入的是该仓库 `CLAUDE.md` 中的四条通用行为原则：Think Before Coding、Simplicity First、Surgical Changes、Goal-Driven Execution。

## Impact Notes

这些角色提示词属于通用 Harness 能力，应该随 npm 包分发给所有用户项目；它们不属于 authoring overlay。提示词保持通用，不绑定具体业务项目，也不要求用户直接修改 managed Skill。

## Verification

| Gate | Result |
|---|---|
| `node packages/sdlc-harness/dist/cli.js package sync-source` | PASS |
| `node packages/sdlc-harness/dist/cli.js package check-source` | PASS |
| `make docs-overview` | PASS |
| `make validate-doc-overviews` | PASS |
| `make validate-harness` | PASS |
| `make validate-current` | PASS |
| `npm test` | PASS |
| `git diff --check` | PASS |

---

## npm_package/dev_017_chinese_karpathy_guidelines.md

Source: [npm_package/dev_017_chinese_karpathy_guidelines.md](npm_package/dev_017_chinese_karpathy_guidelines.md)

# DEV-017 Implementation: Chinese Karpathy guidelines

## Task

- Task ID: `DEV-017`
- Title: 将 Karpathy guidelines 转为中文契约表达
- PRD: `.docs/01_product/npm_package_distribution.md`
- Tech Plan: `.docs/03_tech_plan/harness_package_distribution.md`

## Implementation Summary

`AGENTS.md` 中的 `multica-ai/andrej-karpathy-skills` guideline 内容从英文原文块调整为“中文说明 + 英文关键词”的本地化契约表达。

本次没有删减上游 `CLAUDE.md` 的语义结构：保留说明、`Tradeoff`、四个 guideline 标题、每条 guideline 的检查点、multi-step plan 模板，以及最终 working signal。英文标题和关键术语保留为 `Think Before Coding`、`Simplicity First`、`Surgical Changes`、`Goal-Driven Execution`、`assumptions`、`tradeoffs`、`success criteria` 等，符合 Prompt Language Contract。

## Changed Files

| Path | Purpose |
|---|---|
| `AGENTS.md` | 将 Karpathy guideline 原文块转为中文契约表达，并保留关键英文术语。 |
| `packages/sdlc-harness/assets/agents/AGENTS_CORE.md` | 同步 npm 包分发用的 canonical agents core 文案。 |

## Source Notes

- 上游来源：`https://github.com/multica-ai/andrej-karpathy-skills`
- 对齐文件：`CLAUDE.md`
- 本次转换覆盖四个 guideline：`Think Before Coding`、`Simplicity First`、`Surgical Changes`、`Goal-Driven Execution`。

## Impact Notes

该调整只影响通用 Harness 协议文案和包内分发资产，不改变 CLI、sync、Skill 校验或阶段流转行为。

中文化后的原则更符合本仓库面向人阅读内容使用中文的约定，同时保留关键英文概念，便于跨项目复用和与上游来源对照。

## Verification

| Gate | Result |
|---|---|
| `node packages/sdlc-harness/dist/cli.js package check-source` | PASS |
| `make validate-harness` | PASS |
| `make validate-current` | PASS |

---

## npm_package/dev_018_task_commit_push_rule.md

Source: [npm_package/dev_018_task_commit_push_rule.md](npm_package/dev_018_task_commit_push_rule.md)

# DEV-018 Implementation: task commit and push rule

## Task

- Task ID: `DEV-018`
- Title: 补充每个开发任务完成后 commit 并 push 的规则
- PRD: `.docs/01_product/npm_package_distribution.md`
- Tech Plan: `.docs/03_tech_plan/harness_package_distribution.md`

## Implementation Summary

开发阶段规则已明确：每个 `SPRINTING` task 完成后必须形成单独的 task-level `git commit`，并 `git push` 到当前 upstream branch。push 成功前，不进入下一个 pending task，也不能把该 task 视为完整闭环。

规则同时增加了 task 开始前的工作区检查：先看 `git status`，确认没有未归属到当前 task 的脏变更。如果存在历史 task 残留变更，应先完成对应 task 的 commit/push，或报告 blocker，避免多个 task 被混入同一个 commit。

## Changed Files

| Path | Purpose |
|---|---|
| `AGENTS.md` | 在全局 Plan Protocol 和工作规则中补充 task-level commit/push 要求。 |
| `README.md` | 更新开发阶段循环、Plan Protocol 说明、Skill 表和最小任务完成标准。 |
| `.agent/skills/dev_sprint/SKILL.md` | 将 `git status`、task-level `git commit` 和 `git push` 纳入开发 Skill 的输出、规则和完成检查。 |
| `packages/sdlc-harness/assets/**` | 通过 `package sync-source` 同步包内 canonical assets。 |

## Impact Notes

该规则是工作流约束，不改变 CLI 行为。它依赖 agent 执行 `git status`、`git commit` 和 `git push`，并在 remote/upstream、权限或凭证失败时停止推进并报告 blocker。

本次没有在 `plan.yaml` 的 done task 中新增 commit hash 字段，保持此前的短期化设计。task 历史边界由 git history、PR 或外部 release 系统追溯。

## Verification

| Gate | Result |
|---|---|
| `node packages/sdlc-harness/dist/cli.js package sync-source` | PASS |
| `node packages/sdlc-harness/dist/cli.js package check-source` | PASS |
| `make docs-overview` | PASS |
| `make validate-harness` | PASS |
| `make validate-current` | PASS |
| `git diff --check` | PASS |

## Follow-up Note

当前仓库已有多个尚未提交的 DEV 任务改动。按本任务新增规则，后续整理 git history 时应按 task 边界拆分 commit，不应把所有历史改动合并为一个大 commit。

---

## npm_package/dev_019_commit_before_task_compression.md

Source: [npm_package/dev_019_commit_before_task_compression.md](npm_package/dev_019_commit_before_task_compression.md)

# DEV-019 Implementation: commit before task compression

## Task

- Task ID: `DEV-019`
- Title: 调整 task commit 与 plan 压缩顺序
- PRD: `.docs/01_product/npm_package_distribution.md`
- Tech Plan: `.docs/03_tech_plan/harness_package_distribution.md`

## Implementation Summary

开发阶段提交顺序已从“先压缩 task 再提交”调整为“两段式提交”：

1. task implementation commit：在 `plan.yaml` 中当前 task 仍保留完整 open task 合同时提交。这个提交包含代码、测试、implementation doc、`.docs/INDEX.md`、`overview.md`、gate 记录，以及 `allowed_paths`、`required_gates`、`acceptance_criteria` 等任务边界。
2. task completion ledger commit：implementation commit 完成后，再将 `plan.yaml` 中当前 task 压缩为 `summary`、`implementation_doc`、`gate_result` 等 done 摘要，并提交这个轻量记账变化。

这样 git history 可以追溯每个 task 的真实执行范围和验收标准，而当前 `plan.yaml` 仍能保持短期化、低噪声状态。

## Changed Files

| Path | Purpose |
|---|---|
| `AGENTS.md` | 将全局工作规则改为先提交完整 open task 合同，再提交压缩后的 completion ledger。 |
| `README.md` | 更新开发阶段循环、Plan Protocol 和最小任务完成标准，明确两段式提交顺序。 |
| `.agent/skills/dev_sprint/SKILL.md` | 更新开发 Skill 的角色提示词、输出、Plan Protocol、规则和完成检查。 |
| `packages/sdlc-harness/assets/**` | 通过 `package sync-source` 同步包内 canonical assets。 |

## Impact Notes

`plan.yaml` 仍不长期保存 commit hash。完整任务合同由 task implementation commit 保留，当前 plan 由后续 completion ledger commit 压缩。

如果 push 失败，两个 commit 都不能被视为完整交付；Agent 不应进入下一个 pending task。

## Verification

| Gate | Result |
|---|---|
| `node packages/sdlc-harness/dist/cli.js package sync-source` | PASS |
| `node packages/sdlc-harness/dist/cli.js package check-source` | PASS |
| `make docs-overview` | PASS |
| `make validate-harness` | PASS |
| `git diff --check` | PASS |
| `make validate-current after compression` | PASS |

---

## npm_package/dev_020_rename_npm_package.md

Source: [npm_package/dev_020_rename_npm_package.md](npm_package/dev_020_rename_npm_package.md)

# DEV-020 Rename NPM Package

## Summary

将 npm package name 从 `@ai-sdlc/sdlc-harness` 改为 `agent-project-sdlc`，保留 CLI binary `sdlc-harness` 不变。该变更用于发布前去掉 npm organization/scope 依赖，降低首次发布的权限门槛。

## Changed Files

| 文件 | 变更 |
|---|---|
| `packages/sdlc-harness/package.json` | `name` 改为 `agent-project-sdlc`，`bin.sdlc-harness` 保持不变。 |
| `package.json` / `package-lock.json` | workspace selector 和 lockfile link 改为 `agent-project-sdlc`。 |
| `packages/sdlc-harness/src/lib/config.ts` | 默认 generated config 的 `core.package` 改为 `agent-project-sdlc`。 |
| `.github/workflows/harness.yml` / package asset workflow | CI workspace 命令改为 `--workspace agent-project-sdlc`。 |
| `tests/sdlc-harness/**` | 更新 package name 断言和 migration fixture。 |
| `README.md` | 安装、升级和包名说明改为 `agent-project-sdlc`。 |
| `.docs/02_architecture/`、`.docs/06_review/`、`.docs/07_test/`、`.docs/08_release/` | 同步当前包名、pack 命令和 release evidence。 |

## Verification

| Gate | Result |
|---|---|
| `npm test` | PASS，5 个 `tests/sdlc-harness/*.test.mjs` 全部通过。 |
| `node packages/sdlc-harness/dist/cli.js package check-source` | PASS，`package source OK`。 |
| `make validate-harness` | PASS。 |
| `npm pack --dry-run --workspace agent-project-sdlc` | PASS，tarball `agent-project-sdlc-0.1.0.tgz`，81 files，shasum `906e745f5dd9a6fdc14890ea64199694e7095a77`。 |
| Local installed-consumer smoke | PASS，tarball 安装后 `npx sdlc-harness help`、`init --harness-folder .agent`、`doctor` 均通过。 |
| `npm view agent-project-sdlc version --json` | 当前返回 `E404`，说明该包名尚未公开存在，或未认证用户无访问权限。 |

## Notes

- `npm publish` 对 unscoped package 不需要 `--access public`；后续发布命令应使用 `npm publish --workspace agent-project-sdlc`。
- 发布仍被 npm auth 阻塞，`npm whoami` 当前返回 `ENEEDAUTH`。

---

## npm_package/dev_021_consolidate_managed_config.md

Source: [npm_package/dev_021_consolidate_managed_config.md](npm_package/dev_021_consolidate_managed_config.md)

# DEV-021 Consolidate Managed Workflow Config

## Summary

将除 `.agent/skills/**` hard index 之外的工作流默认配置收敛到 `.agent/managed/**`。旧的 `.agent/policies/**` 和 `.agent/templates/**` tracked mirror 已删除，工具、包资产和测试改为使用 managed canonical layout。

## Changed Files

| 文件 | 变更 |
|---|---|
| `.agent/managed/**` | 保留 policies、templates 和默认 Makefile targets 作为工作流配置事实源。 |
| `.agent/policies/**` / `.agent/templates/**` | 删除旧镜像目录，避免同一份配置出现多个工作区事实源。 |
| `Makefile` | 缩减为 include block，只引入 `.agent/managed/make/sdlc-harness.mk`。 |
| `tools/harness_utils.py`、`tools/validate_*.py` | 校验和阶段契约读取路径改为 `.agent/managed/policies/**`。 |
| `packages/sdlc-harness/source-mappings.yaml` | package asset 的 Makefile source 改为 `.agent/managed/make/sdlc-harness.mk`。 |
| `packages/sdlc-harness/src/lib/sync-engine.ts` | `sync` 不再直接 materialize legacy `.harness/templates`、`.harness/policies` 或 `.harness/make/**`。 |
| `tests/sdlc-harness/*.test.mjs` | 更新 package source fixture，并增加 init/sync 不生成 legacy mirror 的断言。 |
| `AGENTS.md` / `README.md` | 同步 managed canonical layout、Makefile include 入口和 legacy mirror 禁止规则。 |
| `.agent/config.yaml` | `core.package` 修正为已发布包名 `agent-project-sdlc`。 |

## Behavior

```txt
agent-project-sdlc assets
-> sdlc-harness sync
-> <harnessRoot>/skills/**                  # Agent hard index
-> <harnessRoot>/managed/templates/**       # workflow templates
-> <harnessRoot>/managed/policies/**        # workflow policies
-> <harnessRoot>/managed/make/sdlc-harness.mk
-> Makefile include block
```

`<harnessRoot>/state/**` 和 `.docs/**` 仍然是项目实例事实源，不由包升级全量覆盖。已有旧配置仍通过 migration 映射到 managed path；新同步路径不再生成旧镜像目录。

## Verification

| Gate | Result |
|---|---|
| `npm test` | PASS，5 个 `tests/sdlc-harness/*.test.mjs` 全部通过。 |
| `node packages/sdlc-harness/dist/cli.js package check-source` | PASS，`package source OK`。 |
| `python3 tools/validate_allowed_paths.py` | PASS，32 个 changed files 均在 DEV-021 allowed_paths 内。 |
| `make validate-harness` | PASS，Harness scaffold、prompt language 和 overview check 全部通过。 |
| `git diff --check HEAD` | PASS。 |

## Notes

- `.agent/skills/<skill_name>/SKILL.md` 继续保持一级 hard index，避免 Agent skill discovery 受到过深目录结构影响。
- 根 `Makefile` 仍然是用户项目入口；用户自己的 Makefile target 可留在 include block 之外，包升级只维护 block 内内容。

---

## npm_package/dev_022_pjsdlc_marker_prefix.md

Source: [npm_package/dev_022_pjsdlc_marker_prefix.md](npm_package/dev_022_pjsdlc_marker_prefix.md)

# DEV-022 pjsdlc Marker Prefix

## Summary

将 Harness 托管文本块的 preferred marker 迁移到 `pjsdlc:sdlc-harness:*` namespace，并保留旧 `sdlc-harness:*` marker 作为 legacy migration 输入。这样 `AGENTS.md`、根 `Makefile` 等桥接文件能更清楚地区分 Project SDLC Harness 管理内容和用户项目内容。

## Changed Files

| 文件 | 变更 |
|---|---|
| `packages/sdlc-harness/src/lib/managed-file.ts` | 新增 `pjsdlc:sdlc-harness:*` preferred marker，保留 legacy marker 常量。 |
| `packages/sdlc-harness/src/lib/sync-engine.ts` | `mergeManagedBlock` 支持 preferred/legacy marker 检测，完整旧 block 会原位替换为新 block；不完整、重复或新旧 marker 冲突仍 blocker。 |
| `packages/sdlc-harness/src/lib/package-source.ts` | `extract-managed-block` 支持 preferred marker 和 legacy marker。 |
| `tests/sdlc-harness/*.test.mjs` | 更新 init/upgrade 断言，覆盖旧 marker 自动迁移和 broken marker blocker。 |
| `Makefile` | 根 include block marker 改为 `# pjsdlc:sdlc-harness:make:begin/end`。 |
| `README.md`、PRD、技术方案、RFC | 记录 marker namespace、legacy 兼容和 `config.yaml` schema-governed 边界。 |

## Behavior

```txt
new AGENTS.md block:
<!-- pjsdlc:sdlc-harness:begin -->
...
<!-- pjsdlc:sdlc-harness:end -->

new Makefile block:
# pjsdlc:sdlc-harness:make:begin
...
# pjsdlc:sdlc-harness:make:end
```

旧项目中完整的 `sdlc-harness:*` block 会在下一次 `sync` 时被识别并替换为新 marker。若同一文件同时存在新旧 block，或 marker 缺失一端，`sync` 会报告 blocker，避免覆盖用户内容。

`config.yaml` 不使用文本块 marker；它继续通过 YAML schema、known fields、migration 和 local overrides 管理。

## Verification

| Gate | Result |
|---|---|
| `npm test` | PASS，5 个 `tests/sdlc-harness/*.test.mjs` 全部通过。 |
| `node packages/sdlc-harness/dist/cli.js package check-source` | PASS，`package source OK`。 |
| `python3 tools/validate_allowed_paths.py` | PASS，9 个 changed files 均在 DEV-022 allowed_paths 内。 |
| `make validate-harness` | PASS，Harness scaffold、prompt language 和 overview check 全部通过。 |

## Notes

- CLI binary 仍保持 `sdlc-harness`，本次只改变托管文本块 namespace。
- `.agent/skills/**` 和 `.agent/managed/**` 是包拥有目录，不需要逐文件加文本块 marker；marker 只用于与用户文本混合的桥接文件和 metadata comment。
