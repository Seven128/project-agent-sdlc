# .docs/04_implementation overview

<!-- generated-by: AI SDLC Harness build_doc_overviews.py -->
<!-- source-hash: 5efa1e68adb798e4 -->

Generated artifact. Markdown slices remain the source of truth.

Source hash: `5efa1e68adb798e4`

## Source Slices

1. [harness_package/cli_distribution_and_lifecycle.md](harness_package/cli_distribution_and_lifecycle.md)
2. [harness_package/release_automation.md](harness_package/release_automation.md)
3. [harness_package/source_sync_and_assets.md](harness_package/source_sync_and_assets.md)
4. [harness_workflow/command_intent_model.md](harness_workflow/command_intent_model.md)
5. [harness_workflow/docs_overview_and_validation.md](harness_workflow/docs_overview_and_validation.md)
6. [harness_workflow/implementation_doc_model.md](harness_workflow/implementation_doc_model.md)
7. [harness_workflow/skills_prompt_and_authoring.md](harness_workflow/skills_prompt_and_authoring.md)
8. [harness_workflow/state_and_task_protocol.md](harness_workflow/state_and_task_protocol.md)

---

## harness_package/cli_distribution_and_lifecycle.md

Source: [harness_package/cli_distribution_and_lifecycle.md](harness_package/cli_distribution_and_lifecycle.md)

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

---

## harness_package/release_automation.md

Source: [harness_package/release_automation.md](harness_package/release_automation.md)

# Release Automation Implementation

## 1. 关联信息

- Domain: `harness_package`
- Module / subsystem / core flow: npm release automation and registry smoke
- Updated by task: `DEV-033`, `DEV-035`, `DEV-042`, `DEV-043`
- Linked PRD: `.docs/01_product/npm_package_distribution.md`
- Linked technical design: `.docs/03_tech_plan/harness_package_distribution.md`
- Linked RFC: none
- Linked commits: `DEV-033`, `DEV-035`, `DEV-042` implementation commits; `DEV-043` migration commit

## 2. 当前实现范围

- `tools/release_npm.mjs` automates npm package version bump, gates, publish, registry verification, installed-consumer smoke and release-doc generation.
- `npm run release:npm` is the root script entrypoint.
- The script defaults to prepare/check mode; real publishing requires `--publish --yes`.
- Release evidence is written under `.docs/08_release/vX.Y.Z_npm_release.md`.
- Git commit, tag and push remain outside the release script and are handled by the SPRINTING task protocol.

## 3. 真实代码结构

| 文件（File） | 作用（Purpose） | 关键函数/对象（Key Functions/Objects） |
|---|---|---|
| `tools/release_npm.mjs` | Release automation entrypoint | version resolution, gate runner, publish, smoke, release doc writer |
| `package.json` | Root script adapter | `scripts.release:npm` |
| `packages/sdlc-harness/package.json` | Package version and publish metadata | `version`, `files`, `bin`, `prepack` |
| `package-lock.json` | Workspace lock version record | `packages/sdlc-harness.version` |
| `.docs/08_release/*.md` | Release evidence and rollback plan | versioned release docs |

## 4. 核心数据流

```txt
npm run release:npm -- --version patch --publish --yes
-> resolve next version from local package and npm registry
-> npm version --workspace agent-project-sdlc --no-git-tag-version
-> npm test
-> package check-source
-> npm pack --dry-run --json
-> npm publish
-> npm view latest verification
-> temporary consumer install smoke
-> write release doc
-> make docs-overview
-> make validate-harness
-> git diff --check
```

## 5. 关键实现逻辑

- The script refuses accidental publish unless both `--publish` and `--yes` are present.
- Version selection can be explicit or semantic (`patch`, `minor`, `major`) and is checked against the npm registry.
- Registry smoke validates the published package by installing it into a temporary consumer and running package commands.
- Release docs are generated as durable evidence; they are not the implementation-doc source of truth for package mechanics.
- Commit and tag creation remain manual/task-driven so release automation cannot bypass Harness task ledger rules.

## 6. 与技术方案的偏移

- The original package plan expected publish evidence to be created manually in the release stage. DEV-035 added a script because repeated package publishing became deterministic enough to automate.
- DEV-042 used the script flow to publish `agent-project-sdlc@0.1.5`.

## 7. 测试覆盖（Test Coverage）

| 测试（Test） | 覆盖范围（Coverage） | 最近记录结果（Result） |
|---|---|---|
| `node --check tools/release_npm.mjs` | Script syntax | PASS |
| `npm test` | Package build and tests before publish | PASS during release tasks |
| `node packages/sdlc-harness/dist/cli.js package check-source` | Asset drift before publish | PASS during release tasks |
| `npm pack --dry-run --json --workspace agent-project-sdlc` | Tarball content and metadata | PASS during release tasks |
| `npm publish --workspace agent-project-sdlc` | Registry publish | PASS for `v0.1.3` through `v0.1.5` |
| `npm view agent-project-sdlc version dist-tags.latest dist.integrity --json` | Registry verification | PASS for `v0.1.5` |
| Temporary installed-consumer smoke | Published package install and CLI smoke | PASS during release tasks |

## 8. 变更记录（Change Log）

| 日期（Date） | Task ID | Commit | 摘要（Summary） |
|---|---|---|---|
| 2026-05-25 | `DEV-033` | Historical implementation commit | Published `agent-project-sdlc@0.1.3` with release evidence. |
| 2026-05-25 | `DEV-035` | Historical implementation commit | Added `tools/release_npm.mjs` release automation. |
| 2026-05-26 | `DEV-042` | `873966d` | Released `agent-project-sdlc@0.1.5`. |
| 2026-05-26 | `DEV-043` | DEV-043 implementation commit | Moved release-flow facts out of the old `npm_package` implementation-doc directory. |

## 9. 后续维护注意事项

- Keep the release script conservative; publishing must remain explicit.
- If release evidence format changes, update both `tools/release_npm.mjs` and `.docs/08_release/` expectations.

---

## harness_package/source_sync_and_assets.md

Source: [harness_package/source_sync_and_assets.md](harness_package/source_sync_and_assets.md)

# Source Sync and Package Assets Implementation

## 1. 关联信息

- Domain: `harness_package`
- Module / subsystem / core flow: package canonical assets, source sync, managed file materialization
- Updated by task: `DEV-001`, `DEV-004`, `DEV-006`, `DEV-012`, `DEV-013`, `DEV-021`, `DEV-022`, `DEV-023`, `DEV-027`, `DEV-037`, `DEV-038`, `DEV-039`, `DEV-043`
- Linked PRD: `.docs/01_product/npm_package_distribution.md`
- Linked technical design: `.docs/03_tech_plan/harness_package_distribution.md`
- Linked RFC: `RFC_001`, `RFC_007`, `RFC_008`, `RFC_009`, `RFC_013`
- Linked commits: historical `DEV-*` implementation commits; `DEV-043` migration commit

## 2. 当前实现范围

- The authoring workspace is the source of truth for `AGENTS.md`, workflow Skills, templates, policies, Makefile include assets and GitHub workflow assets.
- `package sync-source` copies or extracts those source files into `packages/sdlc-harness/assets/**`.
- `package check-source` verifies that package assets have not drifted from authoring sources.
- User-project `sync` materializes package assets into the configured `<harnessRoot>` and project root using managed strategies.
- Authoring-only Skills under `<harnessRoot>/skills/authoring/**` are excluded from package assets.

## 3. 真实代码结构

| 文件（File） | 作用（Purpose） | 关键函数/对象（Key Functions/Objects） |
|---|---|---|
| `packages/sdlc-harness/source-mappings.yaml` | Source-to-asset manifest | `source_mappings`, `mode`, `exclude` |
| `packages/sdlc-harness/src/commands/package-source.ts` | Package source command adapter | `package sync-source`, `package check-source` |
| `packages/sdlc-harness/src/lib/package-source.ts` | Source sync/check implementation | copy/extract/check modes, exclude handling |
| `packages/sdlc-harness/src/lib/sync-engine.ts` | User-project materialization engine | managed strategies, marker handling |
| `packages/sdlc-harness/src/lib/managed-file.ts` | Managed metadata blocks | `pjsdlc:sdlc-harness:*` markers |
| `packages/sdlc-harness/assets/**` | Package canonical assets | generated from authoring source by `package sync-source` |
| `.codex/skills/**` | Authoring source for workflow Skills | `pjsdlc_*`, `authoring/**` exclusion boundary |
| `.codex/pjsdlc_managed/**` | Authoring source for templates, policies and Makefile include | `templates`, `policies`, `make` |
| `.github/workflows/harness.yml` | Authoring source for package CI asset | workflow asset mapping |
| `tests/sdlc-harness/package-source.test.mjs` | Regression tests for source sync and drift checks | source mapping, excludes, check-source |

## 4. 核心数据流

```txt
Author edits Harness source files
-> sdlc-harness package sync-source
-> package assets are regenerated
-> sdlc-harness package check-source verifies no drift
-> npm package ships assets
-> user project runs sdlc-harness sync/upgrade
-> managed assets materialize into <harnessRoot> and root files
```

## 5. 关键实现逻辑

- `AGENTS.md` is synced as an extracted managed block, so project-specific text outside the block remains user-owned.
- Skills are distributed under `<harnessRoot>/skills`, while policies/templates live under `<harnessRoot>/pjsdlc_managed`.
- The package keeps a hard source mapping manifest, not a runtime scan of arbitrary repository paths.
- `copy-tree` supports exclude patterns so authoring-only material stays local to this repository.
- Makefile integration is an include block, allowing project-specific targets to win on name conflicts.
- The current package does not guarantee native skill hydration for every Agent. It distributes files in the chosen root and exposes Harness soft routing through `AGENTS.md`.

## 6. 与技术方案的偏移

- Legacy package layouts referenced `.harness/managed`, `.agents/skills` and `.agent/managed`; current generated assets use `<harnessRoot>/skills` and `<harnessRoot>/pjsdlc_managed`.
- DEV-043 removed the legacy implementation-doc directory as an active asset/documentation target; source sync does not treat `.docs/04_implementation/npm_package/**` as a maintained path.

## 7. 测试覆盖（Test Coverage）

| 测试（Test） | 覆盖范围（Coverage） | 最近记录结果（Result） |
|---|---|---|
| `node packages/sdlc-harness/dist/cli.js package sync-source` | Regenerate package canonical assets from authoring source | PASS in source-sync and release tasks |
| `node packages/sdlc-harness/dist/cli.js package check-source` | Asset drift detection | PASS in source-sync, release and DEV-043 gates |
| `tests/sdlc-harness/package-source.test.mjs` | Mapping modes, excludes and drift errors | PASS in `npm test` |
| `make validate-harness` | Prompt language and generated overview consistency | PASS for DEV-043 |

## 8. 变更记录（Change Log）

| 日期（Date） | Task ID | Commit | 摘要（Summary） |
|---|---|---|---|
| 2026-05-25 | `DEV-001`, `DEV-004` | Historical implementation commits | Introduced source mappings and package source sync/check commands. |
| 2026-05-25 | `DEV-006` - `DEV-023` | Historical implementation commits | Migrated roots, markers and managed layout to the current package asset shape. |
| 2026-05-25 | `DEV-037` - `DEV-039` | Historical implementation commits | Added authoring Skill boundary and excluded authoring assets from package sync. |
| 2026-05-26 | `DEV-043` | DEV-043 implementation commit | Consolidated source-sync implementation facts from legacy task docs. |

## 9. 后续维护注意事项

- Any change to `.codex/skills/**`, `.codex/pjsdlc_managed/**`, `AGENTS.md`, Makefile include or CI asset source should be followed by `package sync-source` and `package check-source`.
- If an operation becomes repetitive and deterministic, prefer extracting it into a script and documenting the script here instead of keeping it as manual release/development lore.

---

## harness_workflow/command_intent_model.md

Source: [harness_workflow/command_intent_model.md](harness_workflow/command_intent_model.md)

# Command Intent Model Implementation Doc

## 1. 关联信息

- Domain: `harness_workflow`
- Module / subsystem / core flow: natural language and command alias routing
- Updated by task: `DEV-034`, `DEV-036`, `DEV-043`
- Linked PRD: `.docs/01_product/npm_package_distribution.md` (`PRD-NPM-026`)
- Linked technical design: `.docs/03_tech_plan/harness_package_distribution.md`
- Linked RFC: none
- Linked commit: `DEV-034` implementation commit, `DEV-036` implementation commit

## 2. 当前实现范围

- 新增（Added）:
  - 自然语言意图和 `/xxx` 宏指令别名作为同一组 workflow action 的双入口协议。
  - `/xxx` 宏指令作为更完整、更细节的提示词别名；简单自然语言作为低成本意图入口。
  - `/prd` 产品方案入口和 `/design` 架构/技术方案入口。
  - `/dev` 单任务开发闭环和 `/devloop` 连续开发循环语义。
  - `/plan`、`/goal` 与 Harness workflow 的配合边界说明。
- 修改（Changed）:
  - `AGENTS.md`、`README.md`、`PROJECT_SPEC.md` 的日常控制说明。
  - `pjsdlc_manager` 的路由规则。
  - `pjsdlc_dev_sprint` 的开发入口规则。
  - PRD 和技术方案中的 Natural Language Control 契约。
- 未覆盖（Not covered）:
  - 不实现 CLI 子命令 `/prd`、`/design`、`/dev` 或 `/devloop`；它们是 Agent 对话层宏指令，不是 `sdlc-harness` binary 参数。
  - 不自动开启 Codex 原生 `/plan` 或 `/goal` 模式。

## 3. 真实代码结构

| 文件（File） | 作用（Purpose） | 关键函数/对象（Key Functions/Objects） |
|---|---|---|
| `AGENTS.md` | Agent 入口协议 | 自然语言与宏指令、`/prd`、`/design`、`/dev`、`/devloop` |
| `README.md` | 用户视角日常使用说明 | 常用快捷入口表 |
| `PROJECT_SPEC.md` | 完整工作流规格 | 宏指令协议、Codex 适配方式 |
| `.codex/skills/pjsdlc_manager/SKILL.md` | 意图路由 Skill | 自然语言到 workflow action 的映射规则 |
| `.codex/skills/pjsdlc_dev_sprint/SKILL.md` | 开发阶段执行 Skill | `/dev` 与 `/devloop` 的执行边界 |
| `packages/sdlc-harness/assets/**` | npm 包 canonical assets | 由 `package sync-source` 同步 |
| `.docs/01_product/npm_package_distribution.md` | 产品需求 | `PRD-NPM-026` |
| `.docs/03_tech_plan/harness_package_distribution.md` | 技术方案 | Natural Language Control |

## 4. 核心数据流

```txt
User input
-> Manager reads lifecycle.yaml and plan.yaml
-> Natural language or /xxx detailed skill alias maps to workflow action
-> Stage Skill executes the action
-> Gates and docs update
-> Commit/push protocol records durable history
```

## 5. 关键实现逻辑

- 输入校验（Input validation）: manager 在路由前必须读取 lifecycle 和 plan；如果当前阶段与用户意图冲突，先说明冲突和推荐路径。
- 入口语义（Entry semantics）: `/xxx` 宏指令是更完整、更细节的提示词别名；自然语言入口映射到同一 action，但由 Agent 结合上下文补足细节。
- 核心分支（Core branches）: `/prd` 只在需求阶段推进产品方案；`/design` 只在架构阶段推进 architecture / tech plan；`/dev` 执行一个最小 DEV task 后停止；`/devloop` 每完成一个 task 后重新读取当前状态，再决定是否继续。
- 异常处理（Error handling）: 需求、架构、allowed_paths、gate、commit/push 不清或失败时停止并报告 blocker。
- 边界兜底（Boundary fallback）: `/plan` 和 `/goal` 属于 Codex 客户端模式，Harness 只说明组合方式，不把它们当作可配置 state。
- 性能或并发注意事项（Performance or concurrency notes）: `/devloop` 每轮重新读取状态，避免连续执行时使用过期 plan 或远端状态。

## 6. 与技术方案的偏移

- 无 runtime 代码偏移；该变更只调整 Agent 行为契约和 package assets。

## 7. 测试覆盖（Test Coverage）

| 测试（Test） | 覆盖范围（Coverage） | 结果（Result） |
|---|---|---|
| `node packages/sdlc-harness/dist/cli.js package check-source` | package canonical assets 与 source workspace 一致 | PASS |
| `make validate-harness` | Harness scaffold、skill language、doc overview、implementation doc index | PASS |
| `python3 tools/validate_allowed_paths.py` | DEV-036 修改范围符合 allowed_paths | PASS |
| `git diff --check` | Markdown/YAML trailing whitespace 和 patch 格式 | PASS |

## 8. 变更记录（Change Log）

| 日期（Date） | Task ID | Commit | 摘要（Summary） |
|---|---|---|---|
| 2026-05-25 | `DEV-034` | `DEV-034` implementation commit | 增加自然语言/指令别名双入口和 `/dev`、`/devloop` 开发入口。 |
| 2026-05-26 | `DEV-043` | DEV-043 implementation commit | 将当前 workspace path 更新为 `.codex`，并纳入模块级 implementation doc 迁移。 |
| 2026-05-25 | `DEV-036` | `DEV-036` implementation commit | 澄清宏指令是详细提示词别名，并补齐 `/prd`、`/design` 阶段入口。 |

## 9. 后续维护注意事项

- 后续新增阶段快捷入口时，应同时补自然语言表达和 `/xxx` 详细提示词别名，保持双入口映射到同一 workflow action。
- 如果未来实现真实 CLI command，需明确区分 Agent 对话宏指令和 `sdlc-harness` binary 子命令。

---

## harness_workflow/docs_overview_and_validation.md

Source: [harness_workflow/docs_overview_and_validation.md](harness_workflow/docs_overview_and_validation.md)

# Documentation Overview and Validation Implementation

## 1. 关联信息

- Domain: `harness_workflow`
- Module / subsystem / core flow: docs overview generation, documentation indexing and validation
- Updated by task: `DEV-005`, `DEV-015`, `DEV-025`, `DEV-030`, `DEV-032`, `DEV-043`
- Linked PRD: `.docs/01_product/npm_package_distribution.md`
- Linked technical design: `.docs/03_tech_plan/harness_package_distribution.md`
- Linked RFC: none
- Linked commits: historical `DEV-*` implementation commits; `DEV-043` migration commit

## 2. 当前实现范围

- `.docs/INDEX.md` is the durable documentation routing table.
- `.docs/<stage>/overview.md` files are generated artifacts and are not hand edited.
- `make docs-overview` regenerates all stage overviews from Markdown slices.
- `make validate-doc-overviews` and `make validate-harness` check that generated overviews are current.
- `tools/validate_task_docs.py` requires every implementation doc slice to be linked from `.docs/INDEX.md`.
- Root README is a user guide; `PROJECT_SPEC.md` carries the heavier product/specification narrative.

## 3. 真实代码结构

| 文件（File） | 作用（Purpose） | 关键函数/对象（Key Functions/Objects） |
|---|---|---|
| `.docs/INDEX.md` | Global documentation router | stage map, active artifacts |
| `tools/build_doc_overviews.py` | Generated overview builder/checker | source hash, stage scan, Markdown rendering |
| `tools/validate_task_docs.py` | Implementation-doc index validator | implementation doc link check |
| `tools/validate_harness.py` | Harness scaffold validator | structure checks |
| `Makefile` | Validation command entrypoint | `docs-overview`, `validate-doc-overviews`, `validate-harness` |
| `README.md` | User-facing package guide | install/init/sync/upgrade/commands |
| `PROJECT_SPEC.md` | Maintainer-facing product/specification doc | architecture, workflow and package background |

## 4. 核心数据流

```txt
Markdown slice changes
-> update .docs/INDEX.md if routing changed
-> make docs-overview
-> generated overview.md files include source hash and slice content
-> make validate-doc-overviews / make validate-harness confirms freshness
```

```txt
Implementation doc slice exists
-> tools/validate_task_docs.py scans .docs/04_implementation/**/*.md
-> each slice must be linked from .docs/INDEX.md
-> missing links fail validate-dev / relevant gates
```

## 5. 关键实现逻辑

- Overview files are deterministic and include every non-overview Markdown slice under their stage directory.
- Generated overviews are for browsing and handoff; Markdown slices and `.docs/INDEX.md` remain the source of truth.
- Implementation docs are validated as module/subsystem/core-flow slices, not task ledgers.
- DEV-043 removes the legacy `npm_package/dev_*.md` docs from the active docs graph and replaces them with module-level slices.

## 6. 与技术方案的偏移

- Early documentation used task-grain implementation docs. The current model uses module-level implementation docs and treats git history as the task action record.
- `README.md` was split from the full product specification so npm package users see a lightweight guide first.

## 7. 测试覆盖（Test Coverage）

| 测试（Test） | 覆盖范围（Coverage） | 最近记录结果（Result） |
|---|---|---|
| `make docs-overview` | Regenerate all `.docs/<stage>/overview.md` files | PASS for DEV-043 |
| `make validate-doc-overviews` | Check generated overview freshness | PASS for DEV-043 |
| `make validate-harness` | Harness scaffold, prompt language and overview checks | PASS for DEV-043 |
| `python3 tools/validate_task_docs.py` | Implementation docs are linked from `.docs/INDEX.md` | Covered by validate-dev and manual checks |

## 8. 变更记录（Change Log）

| 日期（Date） | Task ID | Commit | 摘要（Summary） |
|---|---|---|---|
| 2026-05-25 | `DEV-015` | Historical implementation commit | Added deterministic Markdown overview generation. |
| 2026-05-25 | `DEV-025` | Historical implementation commit | Tightened implementation doc indexing in validation. |
| 2026-05-25 | `DEV-030` | Historical implementation commit | Split lightweight README from full product/specification content. |
| 2026-05-25 | `DEV-032` | Historical implementation commit | Defined implementation docs as module/subsystem/core-flow facts. |
| 2026-05-26 | `DEV-043` | DEV-043 implementation commit | Removed task-grain implementation docs from the active implementation-doc graph. |

## 9. 后续维护注意事项

- Never edit `overview.md` directly; regenerate it.
- When a doc slice is moved or renamed, update `.docs/INDEX.md` in the same task.

---

## harness_workflow/implementation_doc_model.md

Source: [harness_workflow/implementation_doc_model.md](harness_workflow/implementation_doc_model.md)

# Implementation Doc Model

## 1. 关联信息

- Domain: `harness_workflow`
- Module / subsystem / core flow: implementation documentation model
- Updated by task: `DEV-032`, `DEV-043`
- Linked PRD: `.docs/01_product/npm_package_distribution.md` (`PRD-NPM-025`)
- Linked technical design: `.docs/03_tech_plan/harness_package_distribution.md`
- Linked RFC: none
- Linked commit: `DEV-032` implementation commit

## 2. 当前实现范围

- 新增（Added）:
  - implementation doc 默认按模块、子系统或核心数据流切片的协议。
  - implementation doc template 中的 provenance 和 Change Log 字段。
  - 技术方案中的 implementation doc model 说明。
- 修改（Changed）:
  - `pjsdlc_implementation_doc` 不再默认按 task 生成 `dev_*.md`。
  - `pjsdlc_dev_sprint` 将 task 定义为执行和提交边界，将 implementation doc 定义为长期事实边界。
  - `pjsdlc_architect_design` 和 plan/tech templates 引导 future task 指向模块级 implementation doc。
  - AGENTS、PROJECT_SPEC、PRD 和 tech plan 使用同一套语义。
  - DEV-043 将历史 `.docs/04_implementation/npm_package/dev_*.md` task log 合并为模块、子系统和核心数据流级 implementation docs，并从活跃实现文档图中移除 legacy 目录。

## 3. 真实代码结构

| 文件（File） | 作用（Purpose） | 关键函数/对象（Key Functions/Objects） |
|---|---|---|
| `AGENTS.md` | 项目级 workflow 入口规则 | Plan Protocol、工作规则 |
| `.codex/skills/pjsdlc_implementation_doc/SKILL.md` | implementation doc 生成/更新规则 | 语义切片、输出路径、完成检查 |
| `.codex/skills/pjsdlc_dev_sprint/SKILL.md` | Sprint 执行规则 | task 执行边界、completion protocol |
| `.codex/skills/pjsdlc_architect_design/SKILL.md` | 架构阶段任务规划规则 | task `implementation_doc` 指向长期实现事实文档 |
| `.codex/skills/pjsdlc_manager/SKILL.md` | 自然语言 workflow 路由规则 | 完成后的产物事实说明 |
| `.codex/pjsdlc_managed/templates/IMPLEMENTATION_DOC_TEMPLATE.md` | 新 implementation doc 模板 | module/subsystem/core flow、provenance、Change Log |
| `.codex/pjsdlc_managed/templates/PLAN_TEMPLATE.yaml` | open task 模板 | `implementation_doc` 示例路径 |
| `.codex/pjsdlc_managed/templates/TECH_DESIGN_TEMPLATE.md` | 技术方案模板 | task breakdown 中 implementation doc 的模块级说明 |
| `.docs/04_implementation/harness_package/*.md` | package-facing module implementation docs | CLI lifecycle、source sync、release automation |
| `.docs/04_implementation/harness_workflow/*.md` | workflow-facing module implementation docs | command routing、implementation model、state/task protocol、skills/prompt、docs validation |
| `packages/sdlc-harness/assets/**` | npm 包 canonical assets | 由 `package sync-source` 从 `.codex/**` 和 `AGENTS.md` 同步 |
| `.docs/01_product/npm_package_distribution.md` | 产品约束 | `PRD-NPM-025` |
| `.docs/03_tech_plan/harness_package_distribution.md` | 技术方案约束 | implementation doc model |

## 4. 核心数据流

```txt
Architecting
-> plan.draft.yaml task includes implementation_doc path
-> SPRINTING executes task as bounded work unit
-> gates pass
-> implementation_doc updates module/subsystem/core-flow fact slice
-> task id + commit recorded as provenance
-> task removed from plan.yaml
```

## 5. 关键实现逻辑

- 输入校验（Input validation）: open task 仍必须包含 `implementation_doc`，但该字段现在指向长期实现事实文档，而不是默认 `dev_*.md` task ledger。
- 核心分支（Core branches）: 修改已有模块时更新已有 implementation doc；新增稳定模块或核心数据流时创建新文档；一个 task 可更新多份相关文档。
- 异常处理（Error handling）: 若真实代码边界与 architecture / tech plan 不一致，implementation doc 必须记录 deviation，并更新 `.docs/INDEX.md`。
- 边界兜底（Boundary fallback）: 只有当 task 本身就是稳定模块/数据流边界时，implementation doc 才可以与单个 task 一一对应。
- 性能或并发注意事项（Performance or concurrency notes）: 不适用；该改动只调整 workflow 文档模型和分发资产。

## 6. 与技术方案的偏移

- 早期技术方案和历史 task breakdown 中的 implementation doc 路径以 `dev_*.md` 为主；DEV-032 将其定义为 legacy task log，不再作为未来默认。
- DEV-043 完成历史合并迁移，删除活跃 `.docs/04_implementation/npm_package/` task-log 目录，并将事实合并到模块级 implementation docs。

## 7. 测试覆盖（Test Coverage）

| 测试（Test） | 覆盖范围（Coverage） | 结果（Result） |
|---|---|---|
| `node packages/sdlc-harness/dist/cli.js package check-source` | package canonical assets 与 source workspace 一致 | PASS |
| `make validate-harness` | Harness scaffold、skill language、doc overview、implementation doc index | PASS |
| `python3 tools/validate_allowed_paths.py` | DEV-032 修改范围符合 allowed_paths | PASS |
| `git diff --check` | Markdown/YAML trailing whitespace 和 patch 格式 | PASS |

## 8. 变更记录（Change Log）

| 日期（Date） | Task ID | Commit | 摘要（Summary） |
|---|---|---|---|
| 2026-05-25 | `DEV-032` | `DEV-032` implementation commit | 将 implementation doc 默认粒度从 task 调整为模块、子系统或核心数据流。 |
| 2026-05-26 | `DEV-043` | DEV-043 implementation commit | 将 legacy `npm_package/dev_*.md` task log 合并进模块级 implementation docs，并更新索引和引用。 |

## 9. 后续维护注意事项

- 后续新 task 应优先更新相关模块级 implementation doc；不要默认新增 `dev_*.md`。
- 不要在 `.docs/04_implementation/` 下重新建立 task-grain ledger；task 历史动作记录以 git commit/tag/release evidence 为准。

---

## harness_workflow/skills_prompt_and_authoring.md

Source: [harness_workflow/skills_prompt_and_authoring.md](harness_workflow/skills_prompt_and_authoring.md)

# Skills, Prompt Routing and Authoring Implementation

## 1. 关联信息

- Domain: `harness_workflow`
- Module / subsystem / core flow: workflow Skills, prompt routing, hard/soft indexing and authoring overlay
- Updated by task: `DEV-014`, `DEV-016`, `DEV-017`, `DEV-021`, `DEV-023`, `DEV-029`, `DEV-036`, `DEV-037`, `DEV-038`, `DEV-039`, `DEV-040`, `DEV-043`, `DEV-044`
- Linked PRD: `.docs/01_product/npm_package_distribution.md`
- Linked technical design: `.docs/03_tech_plan/harness_package_distribution.md`, `PROJECT_SPEC.md`
- Linked RFC: `RFC_007`, `RFC_009`
- Linked commits: historical `DEV-*` implementation commits; `DEV-043` migration commit

## 2. 当前实现范围

- Workflow roles are represented as local Skills under `<harnessRoot>/skills/pjsdlc_*/SKILL.md`.
- `AGENTS.md` provides the deterministic soft index from lifecycle state to `active_skill`.
- Native Agent skill hydration, when supported by the client, is a separate hard-index mechanism based on the client-specific skill root.
- Natural language intent and `/xxx` macro aliases map to the same workflow actions.
- Project-local role prompt additions live under `<harnessRoot>/overrides/skills/<skill_name>.md` and are appended to managed Skill output by `sdlc-harness sync`.
- This authoring repository keeps a private authoring Skill under `.codex/skills/authoring/**`; package source sync excludes it from user projects.

## 3. 真实代码结构

| 文件（File） | 作用（Purpose） | 关键函数/对象（Key Functions/Objects） |
|---|---|---|
| `AGENTS.md` | Deterministic workflow router | lifecycle-first rule, natural-language and macro mapping |
| `.codex/skills/pjsdlc_manager/SKILL.md` | Manager prompt | status/next/advance/dev/test/review routing |
| `.codex/skills/pjsdlc_pm_prd/SKILL.md` | Product prompt | PRD slicing and requirement gathering |
| `.codex/skills/pjsdlc_architect_design/SKILL.md` | Architecture prompt | architecture/tech plan and `plan.draft.yaml` |
| `.codex/skills/pjsdlc_dev_sprint/SKILL.md` | Development prompt | `/dev`, `/devloop`, one-task execution protocol |
| `.codex/skills/pjsdlc_implementation_doc/SKILL.md` | Implementation fact prompt | module-level implementation docs |
| `.codex/skills/pjsdlc_reviewer/SKILL.md` | Review prompt | read-only review workflow |
| `.codex/skills/pjsdlc_tester/SKILL.md` | Testing prompt | regression/test plan workflow |
| `.codex/skills/pjsdlc_release_manager/SKILL.md` | Release prompt | release notes, smoke and rollback plan |
| `.codex/skills/pjsdlc_rfc_recalibrate/SKILL.md` | RFC prompt | change impact analysis |
| `.codex/skills/authoring/harness_package_design/SKILL.md` | Authoring-only prompt | package iteration, scriptability heuristic |
| `.codex/pjsdlc_managed/policies/phase_contracts.yaml` | Phase-to-skill contract | `skill` per phase |
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
+ optional <harnessRoot>/overrides/skills/<skill_name>.md
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
- Local Skill overrides are append-only in v1. They let projects add role preferences without replacing lifecycle, task, gate or allowed-path rules from the package Skill.
- `sync` blocks unknown files under `<harnessRoot>/overrides/skills/*.md`, so a misspelled Skill name cannot silently fail to apply.

## 6. 与技术方案的偏移

- Earlier wording treated all workflow role files as native Skills. The current model distinguishes native hard-index hydration from Harness soft-index routing.
- The default authoring root moved from `.agent` to `.codex` after target-agent selection was added.
- DEV-043 consolidated legacy task records for role prompts, skill layout and natural-language control into this module-level doc.

## 7. 测试覆盖（Test Coverage）

| 测试（Test） | 覆盖范围（Coverage） | 最近记录结果（Result） |
|---|---|---|
| `python3 tools/validate_prompt_language.py` | Prompt language contract and managed prompts | PASS in Harness gates |
| `npm test --workspace agent-project-sdlc` | Package build and CLI behavior regression tests | PASS for DEV-044 |
| `node packages/sdlc-harness/dist/cli.js package check-source` | Skills and managed prompt assets match authoring source | PASS for DEV-044 |
| `tests/sdlc-harness/package-source.test.mjs` | Authoring Skill exclusion from package assets | PASS in package tests |
| `tests/sdlc-harness/sync-init-doctor.test.mjs` | Skill override append, idempotency, configured root and unknown override blocking | PASS for DEV-044 |
| `make validate-harness` | Prompt language and overview consistency | PASS for DEV-044 |

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

## 9. 后续维护注意事项

- When adding a workflow role, update both the Skill file and the soft-index contract in lifecycle/phase policies.
- If a client-specific native skill root is supported, document it as hard-index behavior without assuming every Agent hydrates it identically.
- Do not document direct edits to `<harnessRoot>/skills/**/SKILL.md` as a customization path; use `<harnessRoot>/overrides/skills/*.md` and `sdlc-harness sync`.

---

## harness_workflow/state_and_task_protocol.md

Source: [harness_workflow/state_and_task_protocol.md](harness_workflow/state_and_task_protocol.md)

# State and Task Protocol Implementation

## 1. 关联信息

- Domain: `harness_workflow`
- Module / subsystem / core flow: lifecycle state, plan state, task execution protocol and gate evidence
- Updated by task: `DEV-010`, `DEV-011`, `DEV-018`, `DEV-019`, `DEV-024`, `DEV-025`, `DEV-026`, `DEV-027`, `DEV-028`, `DEV-043`
- Linked PRD: `.docs/01_product/npm_package_distribution.md`
- Linked technical design: `.docs/03_tech_plan/harness_package_distribution.md`
- Linked RFC: `RFC_004`, `RFC_005`, `RFC_010`, `RFC_011`, `RFC_012`, `RFC_013`, `RFC_014`
- Linked commits: historical `DEV-*` implementation commits; `DEV-043` migration commit

## 2. 当前实现范围

- `.codex/state/lifecycle.yaml` stores only the current routing state.
- `.codex/state/plan.yaml` stores the current and future short-lived task contract.
- `next_task_sequence` preserves future `DEV-*` id allocation after done tasks are removed.
- Checkpoint files, archive directories, gate result logs and lifecycle history are no longer active state facts.
- A SPRINTING task completes in two commits: implementation commit while the task is still present, then completion ledger commit after removing the task.
- Past task details are cold archive and only used for explicit forensic/audit/regression requests.

## 3. 真实代码结构

| 文件（File） | 作用（Purpose） | 关键函数/对象（Key Functions/Objects） |
|---|---|---|
| `AGENTS.md` | Project-level protocol | Plan Protocol, work rules, natural-language routing |
| `.codex/state/lifecycle.yaml` | Current phase routing | `current_phase`, `active_skill`, `allowed_next_phases` |
| `.codex/state/plan.yaml` | Active short-term task contract | `current_task_id`, `next_task_sequence`, `tasks[]` |
| `.codex/pjsdlc_managed/templates/PLAN_TEMPLATE.yaml` | New-task template | open task fields and module-level `implementation_doc` |
| `.codex/skills/pjsdlc_dev_sprint/SKILL.md` | Development execution prompt | one-task protocol, two-commit ledger, push requirement |
| `.codex/skills/pjsdlc_manager/SKILL.md` | Workflow routing prompt | `/next`, `/dev`, `/devloop`, status routing |
| `.codex/skills/pjsdlc_rfc_recalibrate/SKILL.md` | Change recalibration prompt | RFC impact checklist |
| `tools/harness_utils.py` | Shared state helpers | `load_plan`, `validate_task_shape`, path expansion |
| `tools/validate_plan.py` | Active plan validator | current/future task checks |
| `tools/validate_allowed_paths.py` | Worktree scope validator | allowed path enforcement |
| `tools/run_current_gate.py` | Phase gate runner | phase-to-gate dispatch |
| `tools/status.py` | Human status report | lifecycle and task summary |
| `tools/transition.py` | Phase transition helper | lifecycle state mutation without history append |
| `packages/sdlc-harness/src/lib/validators.ts` | Package-side state validators | plan/lifecycle compatibility |
| `packages/sdlc-harness/src/lib/migrations.ts` | State migrations | remove checkpoints, history and gate logs |

## 4. 核心数据流

```txt
SPRINTING task starts
-> plan.yaml contains full open task contract
-> agent edits only allowed_paths
-> required_gates pass
-> related module implementation doc records facts and verification
-> implementation commit is created while task remains in plan.yaml
-> task is removed from plan.yaml
-> completion ledger commit is created
-> both commits are pushed before the next task starts
```

## 5. 关键实现逻辑

- `plan.yaml` is intentionally short lived. It is not a historical task database.
- `allowed_paths`, `required_gates` and `working_notes` are execution-time constraints, not a long-term query API.
- Gate evidence belongs in the current task while executing, and in implementation docs, CI logs or release docs after completion.
- `lifecycle.yaml` does not store phase history. Phase history is reconstructed from git, PRs, CI or release evidence only when explicitly needed.
- `/dev` runs one task and stops. `/devloop` repeats `/dev` until no clear task remains or a blocker appears.
- The workflow assumes a singleton project-level Harness collaboration boundary; concurrent agents must coordinate through git and active state rather than independent archive files.

## 6. 与技术方案的偏移

- Early designs used checkpoint files, `.agent/archive/**`, `gate_results.log` and lifecycle `history`; those have been removed from the active state model.
- DEV-043 migrated state/task facts from task-grain implementation docs into this module-level protocol document.

## 7. 测试覆盖（Test Coverage）

| 测试（Test） | 覆盖范围（Coverage） | 最近记录结果（Result） |
|---|---|---|
| `python3 tools/validate_plan.py` | Current plan shape and task statuses | PASS in Harness gates |
| `python3 tools/validate_allowed_paths.py` | Current worktree changes within active task boundary | PASS in task gates |
| `make validate-current` | Phase-specific gate dispatch | PASS in sprint/review/test transitions |
| `npm test` | Package migration and validator parity | PASS through release tasks |
| `make validate-harness` | Prompt language and generated overview consistency | PASS for DEV-043 |

## 8. 变更记录（Change Log）

| 日期（Date） | Task ID | Commit | 摘要（Summary） |
|---|---|---|---|
| 2026-05-25 | `DEV-010`, `DEV-011` | Historical implementation commits | Replaced checkpoint/task archive model with `plan.yaml`. |
| 2026-05-25 | `DEV-018`, `DEV-019` | Historical implementation commits | Added two-commit task completion and pre-compression implementation commit rule. |
| 2026-05-25 | `DEV-024` - `DEV-028` | Historical implementation commits | Shortened plan/gate/lifecycle state and strengthened RFC impact handling. |
| 2026-05-26 | `DEV-043` | DEV-043 implementation commit | Consolidated legacy state/task implementation docs into module facts. |

## 9. 后续维护注意事项

- Do not reintroduce active historical ledgers unless a new RFC explicitly changes the state model.
- If a new workflow action needs durable history, prefer git/tag/release evidence or module implementation docs before adding state files.
