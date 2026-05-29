# .docs/rfc overview

<!-- generated-by: AI SDLC Harness build_doc_overviews.py -->
<!-- source-hash: 62d33853265a01e2 -->

Generated artifact. Markdown slices remain the source of truth.

Source hash: `62d33853265a01e2`

## Source Slices

1. [RFC_001_unify_harness_directory_model.md](RFC_001_unify_harness_directory_model.md)
2. [RFC_002_configurable_harness_root.md](RFC_002_configurable_harness_root.md)
3. [RFC_003_init_prompt_and_default_agent_root.md](RFC_003_init_prompt_and_default_agent_root.md)
4. [RFC_004_simplify_task_checkpoint_archive_model.md](RFC_004_simplify_task_checkpoint_archive_model.md)
5. [RFC_005_merge_checkpoint_into_plan.md](RFC_005_merge_checkpoint_into_plan.md)
6. [RFC_006_rename_npm_package.md](RFC_006_rename_npm_package.md)
7. [RFC_007_consolidate_managed_config.md](RFC_007_consolidate_managed_config.md)
8. [RFC_008_prefix_managed_block_markers.md](RFC_008_prefix_managed_block_markers.md)
9. [RFC_009_namespace_managed_layout_and_skills.md](RFC_009_namespace_managed_layout_and_skills.md)
10. [RFC_010_recover_done_task_contract_from_git.md](RFC_010_recover_done_task_contract_from_git.md)
11. [RFC_011_short_lived_plan_and_gate_log.md](RFC_011_short_lived_plan_and_gate_log.md)
12. [RFC_012_remove_execution_history_from_active_state.md](RFC_012_remove_execution_history_from_active_state.md)
13. [RFC_013_workflow_singleton_collaboration_boundary.md](RFC_013_workflow_singleton_collaboration_boundary.md)
14. [RFC_014_remove_gate_results_state_and_strengthen_rfc_impact.md](RFC_014_remove_gate_results_state_and_strengthen_rfc_impact.md)
15. [RFC_015_optional_parallel_execution_contract.md](RFC_015_optional_parallel_execution_contract.md)
16. [RFC_016_consume_plan_draft_tasks_on_promote.md](RFC_016_consume_plan_draft_tasks_on_promote.md)
17. [RFC_017_test_artifact_semantics.md](RFC_017_test_artifact_semantics.md)
18. [RFC_018_dev_gate_open_task_semantics.md](RFC_018_dev_gate_open_task_semantics.md)
19. [RFC_019_sprinting_runnable_evidence_gate.md](RFC_019_sprinting_runnable_evidence_gate.md)
20. [RFC_020_application_readiness_gates.md](RFC_020_application_readiness_gates.md)

---

## RFC_001_unify_harness_directory_model.md

Source: [RFC_001_unify_harness_directory_model.md](RFC_001_unify_harness_directory_model.md)

# RFC_001: 统一 .harness 工作流根目录与 .agents 兼容出口

## 1. 背景

当前 Harness 配置被拆在两个顶层目录中：

- `.harness/**` 保存生命周期状态、任务状态、模板、策略、配置和运行协议。
- `.agents/skills/**` 保存阶段 Skill，作为 Agent 启动和路由时容易识别的本地目录。

这个拆分解决了 Agent 可读性，但概念上不够一致：Skill 本身也是 Harness 工作流配置的一部分，和 policies、templates、state protocol、validators 一样，都是定义“这套工作流如何运行”的内容。用户提出 `.harness` 与 `.agents` 应该合并为一个工作流根目录，避免把同一类配置拆成两个事实源。

本 RFC 聚焦一个变更：以 `.harness` 作为 Harness 工作流配置的 canonical root，保留 `.agents/skills/**` 作为可选的兼容生成出口，而不是事实源。

## 2. 变更内容（Change Content）

- Added:
  - 新增 `.harness/agents/skills/**` 作为阶段 Skill 的 canonical source。
  - 新增 `.harness/managed/**` 作为包管理内容的统一落点，包括 `templates`、`policies`、`make`、`workflows` 等。
  - 保留 `.agents/skills/**` 作为 `sdlc-harness sync` 生成的 compatibility view，用于兼容当前 Agent 固定目录读取习惯。
- Changed:
  - `.agents/skills/**` 不再作为工作流配置事实源；它由 `.harness/agents/skills/**` 生成或同步。
  - `.harness/templates/**` 和 `.harness/policies/**` 迁移到 `.harness/managed/templates/**` 与 `.harness/managed/policies/**`，避免 state protocol 与 package-managed assets 混在同一层。
  - `sdlc-harness sync`、`upgrade`、`package sync-source`、`package check-source`、`validate-*` 需要识别新的 canonical layout。
  - README、PRD、技术方案和 task plan 需要同步目录语义。
- Removed:
  - 移除 `.agents/skills/**` 作为 canonical source 的语义。
  - 移除“`.harness` 只保存状态/策略，`.agents` 保存 Agent 配置”的旧划分。
- Unchanged:
  - `AGENTS.md` 仍然是 Agent 顶层入口，继续使用 managed block 合并。
  - `.harness/state/**` 的具体值仍属于项目实例运行数据，不由 npm 包覆盖。
  - `.docs/**` 仍属于项目产物，不由 `sync` 或 `upgrade` 覆盖。
  - npm 包仍负责导出 workflow protocol、schemas、initial templates、skills、policies、templates、validators 和 migrations。

## 3. Product Impact（产品影响）

| 受影响 PRD（Affected PRD） | 影响（Impact） |
|---|---|
| `.docs/01_product/npm_package_distribution.md` | 需要把 `sync` 的目标从“同步到 `.agents/skills`、`.harness/templates`、`.harness/policies`”修正为“以 `.harness` 为 canonical root，并生成 `.agents/skills` 兼容出口”。 |

## 4. Technical Impact Candidates（技术影响候选）

| 模块（Module） | 影响（Impact） | 置信度（Confidence） |
|---|---|---|
| `README.md` | 目录结构、npm 包说明、自迭代说明和 Agent 可读性说明需要统一为 `.harness` canonical root。 | high |
| `.docs/03_tech_plan/harness_package_distribution.md` | 工作区生成目录、`.harness/config.yaml`、source sync manifest、风险缓解和任务拆分需要调整。 | high |
| `.harness/config.yaml` | `managed_files` 与 local override 路径需要改为 `.harness/agents` 和 `.harness/managed` 结构。 | high |
| `packages/sdlc-harness/source-mappings.yaml` | 源文件映射需要从 `.harness/agents/skills`、`.harness/managed/templates`、`.harness/managed/policies` 读取。 | high |
| `packages/sdlc-harness/src/lib/config.ts` | 默认配置需要对齐新的 managed files。 | high |
| `packages/sdlc-harness/src/lib/sync-engine.ts` | 需要同时 materialize canonical `.harness/**` 与 compatibility `.agents/skills/**`。 | high |
| `packages/sdlc-harness/src/lib/validators.ts` | `validate-harness` 需要校验 canonical source，并检查兼容出口是否存在或可生成。 | high |
| `packages/sdlc-harness/assets/**` | 包内 assets 布局需要由新的 canonical source 重新生成。 | high |
| `.agents/skills/**` | 需要保留为生成物或兼容出口，不再手写维护。 | high |

Impact analysis 已运行：

```sh
python3 tools/impact_analyzer.py --rfc .docs/rfc/RFC_001_unify_harness_directory_model.md --top 40
```

主要命中 `.docs/01_product/npm_package_distribution.md`、`.docs/02_architecture/harness_package_distribution.md`、`.docs/03_tech_plan/harness_package_distribution.md`、`.docs/INDEX.md`、`tests/sdlc-harness/*` 和 npm 包实现文件。RFC 阶段已更新产品、架构、技术方案和任务状态；代码迁移进入 `DEV-006`。

## 5. Acceptance Criteria

- [ ] README 明确说明 `.harness` 是 Harness 工作流配置 canonical root，`.agents/skills/**` 是 compatibility view。
- [ ] PRD 和技术方案明确 `state protocol` 属于包、`state data` 属于项目实例，并把 Skill、policy、template 归入 `.harness` canonical root。
- [ ] `sdlc-harness sync` 能从包内 assets 生成 `.harness/agents/skills/**`、`.harness/managed/**` 和 `.agents/skills/**` 兼容出口。
- [ ] `sdlc-harness upgrade` 在 migration 后自动执行新布局的 `sync`。
- [ ] `sdlc-harness package sync-source` 与 `package check-source` 使用新的 source mappings，并能防止工作流源内容与包内容漂移。
- [ ] `sdlc-harness validate-harness`、`npm test`、`sdlc-harness package check-source` 通过。

## 6. Regression Requirements（回归要求）

- [ ] 运行 `npm test` 验证 CLI、sync、upgrade、package source 和 validators 行为。
- [ ] 运行 `node packages/sdlc-harness/dist/cli.js package check-source` 验证包内 canonical source 无漂移。
- [ ] 运行 `node packages/sdlc-harness/dist/cli.js validate-harness` 验证新布局的 Harness 骨架。
- [ ] 运行 `make validate-rfc` 验证 RFC 产物和全量回归入口。
- [ ] 确认 `.docs/**`、`.harness/state/**`、`src/**`、`tests/**` 未被 sync/upgrade 覆盖。

## 7. Status

- Status: APPLIED

---

## RFC_002_configurable_harness_root.md

Source: [RFC_002_configurable_harness_root.md](RFC_002_configurable_harness_root.md)

# RFC_002: 可配置 Harness 根目录

## 1. 背景

RFC_001 将 Harness 配置事实源统一到 `.harness/**`，并把 `.agents/skills/**` 降级为兼容生成物。但这仍然让 Codex/Agent 的 Skill discovery 约定和 Harness 配置根目录之间存在适配层。

用户提出新的产品方向：通过项目级 JSON 配置声明 Harness 根目录。如果配置为 `.harness`，则所有 Harness 配置都放在 `.harness` 下，且 Skill 直接放在 `.harness/skills`；如果没有配置，则默认使用 `.agents` 作为 Harness 根目录，所有 Harness 配置都放在 `.agents` 下，Skill 直接位于 `.agents/skills`，从而天然匹配多数 Agent 的 Skill discovery 约定。

## 2. 变更内容（Change Content）

- Added:
  - 支持从 `package.json` 的 `sdlcHarness.harnessFolderName` 读取 Harness 根目录。
  - 支持从 `sdlc-harness.config.json` 读取 `harnessFolderName`。
  - 支持 `harnessFloderName` 作为兼容别名，避免用户拼写错误导致配置失效。
  - 默认 Harness 根目录为 `.agents`。
- Changed:
  - 当前仓库通过 `package.json` 显式声明 `sdlcHarness.harnessFolderName: ".harness"`。
  - 配置为 `.harness` 时，Skill canonical path 从 `.harness/agents/skills/**` 改为 `.harness/skills/**`。
  - `sdlc-harness init`、`sync`、`upgrade`、`doctor`、`validate-*` 按配置根目录读写 `config.yaml`、`state/**`、`skills/**`、`managed/**`。
  - `AGENTS.md` managed block 在同步时按目标根目录渲染路径。
- Removed:
  - 移除 `.harness/agents/skills/**` 这一层中间目录语义。
- Unchanged:
  - `.docs/**` 仍是项目文档事实源，不受根目录配置影响。
  - `AGENTS.md` 仍位于项目根，作为 Agent 全局入口。
  - npm 包仍通过 `sync` materialize 工作区可读文件。

## 3. Product Impact（产品影响）

| 受影响 PRD（Affected PRD） | 影响（Impact） |
|---|---|
| `.docs/01_product/npm_package_distribution.md` | 需要新增 configurable harness root 需求，并说明默认 `.agents`、显式 `.harness` 和 Skill 路径规则。 |

## 4. Technical Impact Candidates（技术影响候选）

| 模块（Module） | 影响（Impact） | 置信度（Confidence） |
|---|---|---|
| `package.json` | 当前仓库需要声明 `sdlcHarness.harnessFolderName: ".harness"`。 | high |
| `.harness/skills/**` | 需要替代 `.harness/agents/skills/**` 作为当前仓库 Skill canonical source。 | high |
| `packages/sdlc-harness/src/lib/config.ts` | 需要读取 JSON root config，并按 root 生成默认 config path 和 managed paths。 | high |
| `packages/sdlc-harness/src/lib/init.ts` | 需要按 root 生成 state/config/managed 文件。 | high |
| `packages/sdlc-harness/src/lib/sync-engine.ts` | 需要按 root 同步 skills、templates、policies、make，并按 root 渲染 AGENTS block。 | high |
| `packages/sdlc-harness/src/lib/migrations.ts` | 需要按 root 迁移 config 和 state。 | high |
| `packages/sdlc-harness/src/lib/doctor.ts` | 需要按 root 检查 config、state 和 managed files。 | high |
| `packages/sdlc-harness/src/lib/validators.ts` | 需要按 root 校验 harness scaffold。 | high |
| `packages/sdlc-harness/source-mappings.yaml` | 当前仓库 source mapping 需要从 `.harness/skills` 读取。 | high |
| `tools/*.py` | 当前仓库本地 Python gate 需要从 `.harness/skills` 读取 Skill。 | medium |
| `README.md`、`AGENTS.md` | 需要说明 configurable root 和当前仓库配置。 | high |

Impact analysis:

```sh
python3 tools/impact_analyzer.py --rfc .docs/rfc/RFC_002_configurable_harness_root.md --top 40
```

## 5. Acceptance Criteria

- [ ] 无配置时，`sdlc-harness init` 生成 `.agents/config.yaml`、`.agents/state/**`、`.agents/skills/**`、`.agents/managed/**`。
- [ ] `package.json` 配置 `sdlcHarness.harnessFolderName: ".harness"` 时，`sdlc-harness init/sync/validate-harness` 使用 `.harness/config.yaml`、`.harness/state/**`、`.harness/skills/**`、`.harness/managed/**`。
- [ ] `sdlc-harness.config.json` 配置 `harnessFolderName` 时也生效。
- [ ] `harnessFloderName` 作为兼容别名可被读取。
- [ ] 当前仓库 Skill source 移到 `.harness/skills/**`，不再使用 `.harness/agents/skills/**`。
- [ ] `npm test`、`package check-source`、`validate-harness`、`make validate-harness` 通过。

## 6. Regression Requirements（回归要求）

- [ ] 覆盖默认 `.agents` root 的 init/sync/validate 测试。
- [ ] 覆盖 `package.json` `.harness` root 的 init/sync/validate 测试。
- [ ] 覆盖 `sdlc-harness.config.json` 和 `harnessFloderName` 别名读取。
- [ ] 覆盖当前仓库 source mappings 无漂移。
- [ ] 运行 `make validate-current` 确认开发阶段闭环。

## 7. Status

- Status: APPLIED

---

## RFC_003_init_prompt_and_default_agent_root.md

Source: [RFC_003_init_prompt_and_default_agent_root.md](RFC_003_init_prompt_and_default_agent_root.md)

# RFC_003: init 询问 Harness 根目录并默认使用 .agent

## 1. 背景

RFC_002 已支持通过 `harnessFolderName` 配置 Harness root，但新项目接入时仍然需要用户预先知道要在 `package.json` 中写什么。这个体验不够自然：用户运行 `sdlc-harness init` 时，CLI 应该主动询问 Harness 配置目录名，并说明默认值。

用户进一步明确：默认 Harness 配置目录应为 `.agent`，直接回车使用默认值；用户也可以输入自定义目录名。CLI 最终仍把选择写入 `package.json` 的 `sdlcHarness.harnessFolderName`。当前 `ProjectTemplate` 仓库也应遵循默认目录，从 `.harness` 迁移为 `.agent`。

## 2. 变更内容（Change Content）

- Added:
  - `sdlc-harness init` 在 CLI 层询问 Harness folder name。
  - 提示文案说明默认值为 `.agent`，直接回车采用默认。
  - CLI 将最终选择写入 `package.json` 的 `sdlcHarness.harnessFolderName`。
  - 新增 DEV-009 实现任务。
- Changed:
  - npm 包默认 Harness root 从 `.agents` 改为 `.agent`。
  - 当前仓库从 `.harness/**` 迁移为 `.agent/**`，不再通过 package.json 显式配置 `.harness`。
  - `AGENTS.md`、README、PRD、架构、技术方案、Python tools、source mappings 和测试改用 `.agent` 当前根目录。
  - `sdlc-harness init` 在非交互环境中不阻塞，采用默认 `.agent`。
- Removed:
  - 当前仓库对 `.harness` 作为自身 Harness root 的显式配置。
  - 当前仓库 `.harness/**` 工作流事实源目录。
- Unchanged:
  - 自定义项目仍可在 `package.json` 中配置其它 `harnessFolderName`，例如 `.harness`。
  - `sdlc-harness.config.json` 和 `harnessFloderName` 兼容别名仍可被读取。
  - `AGENTS.md` 仍位于项目根，作为 Agent 全局入口。
  - `.docs/**` 仍是项目文档事实源，不随 Harness root 移动。

## 3. Product Impact（产品影响）

| 受影响 PRD（Affected PRD） | 影响（Impact） |
|---|---|
| `.docs/01_product/npm_package_distribution.md` | 需要新增 init 交互式选择 root 的需求，并把默认 root 从 `.agents` 改为 `.agent`。 |

## 4. Technical Impact Candidates（技术影响候选）

| 模块（Module） | 影响（Impact） | 置信度（Confidence） |
|---|---|---|
| `packages/sdlc-harness/src/commands/init.ts` | 需要询问 Harness folder name，并在 init 前写入 `package.json#sdlcHarness.harnessFolderName`。 | high |
| `packages/sdlc-harness/src/lib/paths.ts` | 默认 Harness root 改为 `.agent`。 | high |
| `packages/sdlc-harness/src/lib/harness-root.ts` | 需要保持 `.agent` 默认和配置读取语义一致。 | high |
| `packages/sdlc-harness/source-mappings.yaml` | 当前仓库 source mappings 改为 `.agent/skills`、`.agent/managed/**`。 | high |
| `.harness/**` -> `.agent/**` | 当前仓库工作流事实源迁移到默认目录。 | high |
| `tools/*.py` | 本地 Python gate、transition、status 和 validation 需要按当前 root `.agent` 读写。 | high |
| `AGENTS.md` | 需要改为 `.agent/**` 路由，并说明默认 root。 | high |
| `README.md` | 需要更新默认目录、交互式 init、当前仓库自迭代描述和接入说明。 | high |
| `.docs/02_architecture/harness_package_distribution.md` | 需要更新默认 root 和 Agent 可读性说明。 | medium |
| `.docs/03_tech_plan/harness_package_distribution.md` | 需要新增 DEV-009，并更新默认 root、source mappings、风险说明。 | high |
| `tests/sdlc-harness/**` | 需要覆盖 CLI init prompt/default 和 `.agent` 默认 root。 | high |

Impact analysis:

```sh
python3 tools/impact_analyzer.py --rfc .docs/rfc/RFC_003_init_prompt_and_default_agent_root.md --top 40
```

## 5. Acceptance Criteria

- [ ] `sdlc-harness init` 在交互式 CLI 中提示输入 Harness folder name，并说明默认 `.agent`。
- [ ] 用户直接回车时，CLI 写入 `package.json#sdlcHarness.harnessFolderName = ".agent"` 并初始化 `.agent/**`。
- [ ] 用户输入 `.harness` 时，CLI 写入 `package.json#sdlcHarness.harnessFolderName = ".harness"` 并初始化 `.harness/**`。
- [ ] 非交互环境运行 `sdlc-harness init` 不阻塞，使用默认 `.agent`。
- [ ] 当前仓库工作流事实源迁移为 `.agent/**`，`AGENTS.md` 和 README 不再把 `.harness` 描述为当前 root。
- [ ] `npm test`、`package check-source`、`validate-harness`、`make validate-harness` 通过。

## 6. Regression Requirements（回归要求）

- [ ] 覆盖默认 `.agent` root 的 init/sync/doctor/validate 测试。
- [ ] 覆盖 CLI init 写入 package.json 默认 `.agent`。
- [ ] 覆盖 CLI init 输入自定义 `.harness` 时写入 package.json 并生成 `.harness/**`。
- [ ] 覆盖 `package.json` 中已存在 `sdlcHarness.harnessFolderName` 时不重复询问并沿用配置。
- [ ] 覆盖当前仓库 source mappings 无漂移。
- [ ] 运行 `make validate-current` 确认开发阶段闭环。

## 7. Status

- Status: APPLIED

---

## RFC_004_simplify_task_checkpoint_archive_model.md

Source: [RFC_004_simplify_task_checkpoint_archive_model.md](RFC_004_simplify_task_checkpoint_archive_model.md)

# RFC_004: 简化 task、checkpoint 和 archive 状态模型

## 1. 背景

当前 Harness 同时保存 `tasks.yaml`、checkpoint、`.agent/archive/`、implementation doc 和 git commit 信息。对于 task 和 release 这类动作记录，`.agent/archive/` 与 git 历史重复；对于已完成 task，checkpoint 与 implementation doc 和 commit 也重复。长期保留这些热路径状态会让 Agent 每次查进度时读入过多无效上下文，并增加事实源漂移风险。

用户明确要求：删除 archive 机制；每个活跃 task 都有 checkpoint；task 完成后删除对应 checkpoint；复杂执行合同如 `allowed_paths` 和 `required_gates` 放入 checkpoint；`tasks.yaml` 只保留轻量摘要、状态、实现文档和当前活跃 checkpoint 路径。

## 2. 变更内容（Change Content）

- Added:
  - 新增 DEV-010 实现任务，负责简化 task/checkpoint/archive 协议。
  - checkpoint 模板新增 `Task Contract` YAML 区块，承载 `allowed_paths`、`required_gates` 和验收标准。
  - validators 从当前活跃 task 的 checkpoint 读取路径约束。
- Changed:
  - `tasks.yaml` 从详细任务合同改为轻量任务索引。
  - `checkpoint` 从条件恢复快照改为活跃 task 的执行合同和现场记录。
  - task 完成后删除 checkpoint 文件，最终事实由 git commit 和 implementation doc 承载。
  - `.agent` 路由声明修正为当前默认 Harness root。
- Removed:
  - `.agent/archive/**` 常规归档机制。
  - `checkpoint_required` 条件门槛。
  - 已完成 task 的历史 checkpoint 文件。
  - task 级 `archived` 状态。
- Unchanged:
  - `.docs/**` 仍是正式阶段产物事实源。
  - implementation doc 仍在 task 完成后记录真实实现。
  - `make validate-*` 和 `sdlc-harness validate-*` 仍作为 gate 入口。

## 3. Product Impact（产品影响）

| 受影响 PRD（Affected PRD） | 影响（Impact） |
|---|---|
| `.docs/01_product/npm_package_distribution.md` | 需要补充轻量 task state、活跃 checkpoint 和删除 archive 的工作流需求。 |

## 4. Technical Impact Candidates（技术影响候选）

| 模块（Module） | 影响（Impact） | 置信度（Confidence） |
|---|---|---|
| `AGENTS.md` | 更新 checkpoint 和 archive 协议，去除条件 checkpoint 和 archive 路由。 | high |
| `.agent/skills/**` | 更新各阶段 Skill 的输入、输出和完成检查，改用 `.agent`/`<harnessRoot>` 路由和活跃 checkpoint 语义。 | high |
| `.agent/managed/templates/**` | 更新 `TASKS_TEMPLATE.yaml`、`CHECKPOINT_TEMPLATE.md` 和 `SKILL_TEMPLATE.md`。 | high |
| `.agent/policies/**` | 移除 archive 路由，修正 `.agent` 或 `<harnessRoot>` 路由声明。 | high |
| `tools/validate_tasks.py` | 校验轻量 task schema，不再要求 `allowed_paths` 和 `required_gates`。 | high |
| `tools/validate_allowed_paths.py` | 从活跃 checkpoint 的 `Task Contract` 读取 `allowed_paths`。 | high |
| `tools/validate_checkpoint.py` | 校验 open task 必须有 checkpoint，done task 不应保留 checkpoint。 | high |
| `packages/sdlc-harness/src/lib/validators.ts` | Node validators 对齐轻量 task 和活跃 checkpoint 语义。 | high |
| `.agent/state/tasks.yaml` | 瘦身为当前工作队列索引，移除已完成 task 的 checkpoint 和复杂合同字段。 | high |
| `.agent/state/checkpoints/**` | 删除已完成 task checkpoint。 | high |
| `.agent/archive/**` | 删除常规归档目录。 | high |
| `.docs/INDEX.md` | 修正 `.agent` 路由和 implementation doc 链接，不再声明 archive 路由。 | high |

Impact analysis:

```sh
python3 tools/impact_analyzer.py --rfc .docs/rfc/RFC_004_simplify_task_checkpoint_archive_model.md --top 40
```

## 5. Acceptance Criteria

- [ ] `.agent/archive/**` 被删除，协议和 policy 不再把 archive 作为常规路由。
- [ ] `tasks.yaml` 中 task 只保留轻量摘要、状态、implementation doc、gate result 和活跃 task 的 checkpoint 路径。
- [ ] `checkpoint_required` 从协议、模板、validators 和当前 state 中移除。
- [ ] open task 必须有 checkpoint；done/cancelled task 不保留 checkpoint 文件。
- [ ] `allowed_paths` 和 `required_gates` 从活跃 checkpoint 的 `Task Contract` 读取。
- [ ] `make validate-harness`、`make validate-current`、`npm test` 和 package source drift check 通过。

## 6. Regression Requirements（回归要求）

- [ ] 覆盖 done task 无 checkpoint 时 `validate-checkpoint` 通过。
- [ ] 覆盖 open task 缺 checkpoint 时 `validate-checkpoint` 失败。
- [ ] 覆盖 active checkpoint 缺 `allowed_paths` 时 `validate_allowed_paths` 或对应 validator 失败。
- [ ] 覆盖 package assets 与本地 Harness 源文件无漂移。

## 7. Status

- Status: APPLIED

---

## RFC_005_merge_checkpoint_into_plan.md

Source: [RFC_005_merge_checkpoint_into_plan.md](RFC_005_merge_checkpoint_into_plan.md)

# RFC_005: 合并 checkpoint 到 plan.yaml 并移除 checkpoint 机制

## 1. 背景

RFC_004 已把 checkpoint 限定为活跃 task 的执行合同，并在 task 完成后删除。但用户进一步明确：checkpoint 文件本身也不需要。活跃 task 需要的执行现场、`allowed_paths`、`required_gates`、验收标准和备注，可以直接放进计划文件；task 完成后再把该条 task 压缩成简短摘要。

同时，`tasks.yaml` 的文件名仍然暗示它只是一组任务记录。实际它承担的是当前 sprint/阶段的执行计划和进度索引，因此应改名为 `plan.yaml`；草案文件同步从 `tasks.draft.yaml` 改为 `plan.draft.yaml`。

## 2. 变更内容（Change Content）

- Added:
  - `plan.yaml` 作为当前执行计划事实源。
  - open task 在 `plan.yaml` 内直接包含 `allowed_paths`、`required_gates`、`acceptance_criteria` 和 `working_notes`。
  - DEV-011 实现任务。
- Changed:
  - `tasks.yaml` 改名为 `plan.yaml`。
  - `tasks.draft.yaml` 改名为 `plan.draft.yaml`。
  - task 完成时，open task 的详细执行字段压缩为 `summary`、`implementation_doc` 和 `gate_result`。
  - `validate_allowed_paths` 改为从当前 open task 读取 `allowed_paths`。
- Removed:
  - checkpoint protocol、checkpoint 目录、checkpoint 模板。
  - `validate-checkpoint` gate 和 CLI alias。
  - `tools/validate_checkpoint.py`。
- Unchanged:
  - task 仍是开发执行单元。
  - implementation doc 仍记录真实实现结果。
  - git commit 仍作为动作历史事实源。

## 3. Product Impact（产品影响）

| 受影响 PRD（Affected PRD） | 影响（Impact） |
|---|---|
| `.docs/01_product/npm_package_distribution.md` | 需要把轻量 task/checkpoint 模型更新为 `plan.yaml` 单文件计划模型，并移除 checkpoint 要求。 |

## 4. Technical Impact Candidates（技术影响候选）

| 模块（Module） | 影响（Impact） | 置信度（Confidence） |
|---|---|---|
| `AGENTS.md` | 更新事实源、工作规则、宏指令和 prompt language contract。 | high |
| `README.md` | 更新工作流说明、目录结构、gate 和恢复入口。 | high |
| `.agent/state/tasks.yaml` | 改名为 `.agent/state/plan.yaml`，并新增 DEV-011 open plan 字段。 | high |
| `.agent/state/tasks.draft.yaml` | 改名为 `.agent/state/plan.draft.yaml`。 | high |
| `.agent/state/checkpoints/` | 删除目录和相关事实源声明。 | high |
| `.agent/skills/**` | 所有阶段 Skill 改用 `plan.yaml`，不再提 checkpoint。 | high |
| `.agent/managed/templates/**` | 删除 `CHECKPOINT_TEMPLATE.md`，新增/更新 `PLAN_TEMPLATE.yaml`。 | high |
| `.agent/policies/**` | inputs/outputs/write paths 改为 `plan.yaml`/`plan.draft.yaml`，移除 checkpoint 路由。 | high |
| `tools/*.py` | `load_plan`/`validate_plan`/`validate_plan_draft` 改为 plan 语义，删除 checkpoint validator。 | high |
| `packages/sdlc-harness/src/lib/*.ts` | init/doctor/migrations/validators 改为 `plan.yaml`，移除 checkpoint validator。 | high |
| `tests/sdlc-harness/**` | 更新 init/upgrade/validators 测试。 | high |
| `.docs/INDEX.md` | 路由从 task state 改为 plan state，并链接 RFC_005/DEV-011。 | high |

Impact analysis:

```sh
python3 tools/impact_analyzer.py --rfc .docs/rfc/RFC_005_merge_checkpoint_into_plan.md --top 40
```

## 5. Acceptance Criteria

- [x] `.agent/state/tasks.yaml` 和 `.agent/state/tasks.draft.yaml` 不再存在。
- [x] `.agent/state/plan.yaml` 和 `.agent/state/plan.draft.yaml` 成为计划事实源。
- [x] `.agent/state/checkpoints/` 不再存在。
- [x] open task 的 `allowed_paths`、`required_gates`、`acceptance_criteria` 和执行备注直接保存在 `plan.yaml` 当前 task 中。
- [x] done task 只保留简短摘要、implementation doc 和 gate result。
- [x] `validate-checkpoint` 从 Makefile、Python tools、Node CLI 和 package assets 中移除。
- [x] 本地 gates、Node validators、package source drift check 和 npm tests 通过。

## 6. Regression Requirements（回归要求）

- [x] 覆盖 `validate-dev` 对 open task `allowed_paths` 和 `required_gates` 的校验。
- [x] 覆盖 done task 不需要详细执行字段。
- [x] 覆盖 init/upgrade 生成或迁移 `plan.yaml`/`plan.draft.yaml`。
- [x] 覆盖 package assets 与本地 Harness 源文件无漂移。

## 7. Status

- Status: VERIFIED

---

## RFC_006_rename_npm_package.md

Source: [RFC_006_rename_npm_package.md](RFC_006_rename_npm_package.md)

# RFC_006: 发布前重命名 npm package

## 1. 背景

发布前用户希望把 npm 包名从 scoped package `@ai-sdlc/sdlc-harness` 改为 unscoped package `agent-project-sdlc`。CLI binary 仍保持 `sdlc-harness`，因为用户入口、managed markers、Makefile include 和文档已经围绕该命令名建立，改包名不要求同步改命令名。

## 2. 变更内容（Change Content）

- Added:
  - DEV-020 增量任务，用于同步 package metadata、workspace scripts、CI、默认 config、文档和发布记录。
- Changed:
  - npm package name 改为 `agent-project-sdlc`。
  - 安装命令从 `npm install -D @ai-sdlc/sdlc-harness` 改为 `npm install -D agent-project-sdlc`。
  - workspace 命令从 `--workspace @ai-sdlc/sdlc-harness` 改为 `--workspace agent-project-sdlc`。
- Removed:
  - 发布前对 `@ai-sdlc` npm organization/scope 权限的依赖。
- Unchanged:
  - CLI binary 仍为 `sdlc-harness`。
  - workspace package directory 仍为 `packages/sdlc-harness/`。
  - Harness root 默认仍为 `.agent`。

## 3. Product Impact（产品影响）

| 受影响 PRD（Affected PRD） | 影响（Impact） |
|---|---|
| `.docs/01_product/npm_package_distribution.md` | `PRD-NPM-001` 的 npm 包名更新为 `agent-project-sdlc`，CLI binary 保持 `sdlc-harness`。 |

## 4. Technical Impact Candidates（技术影响候选）

| 模块（Module） | 影响（Impact） | 置信度（Confidence） |
|---|---|---|
| `packages/sdlc-harness/package.json` | `name` 改为 `agent-project-sdlc`，保持 `bin.sdlc-harness`。 | high |
| `package.json` / `package-lock.json` | workspace selector 和 lockfile link 改为新包名。 | high |
| `packages/sdlc-harness/src/lib/config.ts` | 默认 `<harnessRoot>/config.yaml` 的 `core.package` 改为新包名。 | high |
| `.github/workflows/harness.yml` | workspace test/check-source 命令改为新包名。 | high |
| `tests/sdlc-harness/**` | 断言和 fixture 中的 package name 更新。 | high |
| `README.md` 和 `.docs/**` current slices | 当前安装、发布、release 说明改为新包名。 | high |

## 5. Acceptance Criteria

- [x] PRD 和技术方案声明 npm package name 为 `agent-project-sdlc`。
- [ ] package metadata、lockfile、workspace scripts 和 CI 命令使用 `agent-project-sdlc`。
- [ ] 默认 generated config 的 `core.package` 为 `agent-project-sdlc`。
- [ ] `npm test`、`package check-source`、`make validate-harness` 和 `npm pack --dry-run --workspace agent-project-sdlc` 通过。
- [ ] release doc 记录新包名和新的 publish command。

## 6. Regression Requirements（回归要求）

- [ ] 覆盖 `runInit` 生成的 `.agent/config.yaml` 包名字段。
- [ ] 覆盖 pack dry run 的 tarball name 和内容。
- [ ] 重新执行 local installed-consumer smoke。
- [ ] 重新验证 npm registry 中 `agent-project-sdlc` 是否可发布。

## 7. Status

- Status: APPLIED

---

## RFC_007_consolidate_managed_config.md

Source: [RFC_007_consolidate_managed_config.md](RFC_007_consolidate_managed_config.md)

# RFC_007: 收敛工作流配置到 managed 目录

## 1. 背景

当前 `.agent/managed/policies/**` 与 `.agent/policies/**` 内容重复，`.agent/managed/templates/**` 与 `.agent/templates/**` 内容重复。实际工具仍读取 `.agent/policies/**`，导致 package-managed 配置区和 runtime 读取路径之间存在事实源歧义。

用户明确希望：除 `skills` 以外，工作流相关的配置都放到 `.agent/managed/**`；`skills` 维持 `.agent/skills/<skill_name>/SKILL.md` 硬索引，避免层级过深导致 Agent 或工具无法发现。

## 2. 变更内容（Change Content）

- Added:
  - DEV-021 增量任务，用于删除 legacy mirrors 并让工具读取 `.agent/managed/**`。
- Changed:
  - policy runtime path 从 `.agent/policies/**` 改为 `.agent/managed/policies/**`。
  - template runtime path 从 `.agent/templates/**` 改为 `.agent/managed/templates/**`。
  - 根 `Makefile` 保留为用户入口，后续应只通过 managed include block 接入 `.agent/managed/make/sdlc-harness.mk`。
- Removed:
  - `.agent/policies/**` legacy mirror。
  - `.agent/templates/**` legacy mirror。
- Unchanged:
  - `.agent/skills/<skill_name>/SKILL.md` 继续作为 skill hard index。
  - `.agent/state/**` 和 `.docs/**` 仍是项目事实源，不被 sync/upgrade 覆盖。

## 3. Product Impact（产品影响）

| 受影响 PRD（Affected PRD） | 影响（Impact） |
|---|---|
| `.docs/01_product/npm_package_distribution.md` | 明确除 skills 外的工作流配置位于 `<harnessRoot>/managed/**`，legacy `.agent/policies` / `.agent/templates` 不再作为事实源。 |

## 4. Technical Impact Candidates（技术影响候选）

| 模块（Module） | 影响（Impact） | 置信度（Confidence） |
|---|---|---|
| `tools/*.py` | validators、transition、allowed path、prompt language 等工具读取 `.agent/managed/policies/**`。 | high |
| `.agent/policies/**` / `.agent/templates/**` | 删除重复 mirror。 | high |
| `AGENTS.md` / `README.md` | 更新路径说明，避免继续引用 legacy mirrors。 | high |
| `packages/sdlc-harness/assets/**` | 同步 AGENTS core、skills、templates、policies、Makefile assets。 | high |
| `tests/sdlc-harness/**` | 更新 init/doctor/validator 测试对路径的期望。 | high |

## 5. Acceptance Criteria

- [x] `skills` 保持 `.agent/skills/<skill_name>/SKILL.md`。
- [ ] 工具和 validators 不再读取 `.agent/policies/**` 或 `.agent/templates/**`。
- [ ] `.agent/policies/**` 和 `.agent/templates/**` 从 tracked workspace 删除。
- [ ] `AGENTS.md`、README、PRD、技术方案说明 managed canonical layout。
- [ ] `npm test`、`package check-source`、`make validate-harness` 和 `make validate-current` 通过。

## 6. Regression Requirements（回归要求）

- [ ] 覆盖 `validate-current` 通过 `.agent/managed/policies/phase_contracts.yaml` 查找阶段 gate。
- [ ] 覆盖 `validate_allowed_paths` 通过 `.agent/managed/policies/allowed_paths.yaml` 校验 open task。
- [ ] 覆盖 package source drift check，确认包内 assets 与 workspace facts 一致。
- [ ] 确认 `.agent/skills/**` 仍可由 `active_skill` 映射。

## 7. Status

- Status: APPLIED

---

## RFC_008_prefix_managed_block_markers.md

Source: [RFC_008_prefix_managed_block_markers.md](RFC_008_prefix_managed_block_markers.md)

# RFC_008: 为托管文本块标识增加 pjsdlc 前缀

## 1. 背景

`AGENTS.md`、`Makefile` 等文件会同时承载用户项目配置和 Harness 管理内容。当前 managed block marker 使用 `sdlc-harness:*`，语义仍偏命令名和通用概念。用户希望这些和用户配置文件耦合的文本块标识带有更明确的 `pjsdlc` 前缀，降低与其它工具或用户自定义 marker 冲突的概率。

`.agent/skills/**` 和 `.agent/managed/**` 本身是包拥有的工作流配置区，不需要在每个文件内再做文本块隔离；但当这些配置通过 `AGENTS.md`、`Makefile` 等桥接文件暴露给用户仓库时，桥接 marker 应进入 `pjsdlc` namespace。

## 2. 变更内容（Change Content）

- Added:
  - 新 preferred marker namespace：`pjsdlc:sdlc-harness:*`。
  - 旧 `sdlc-harness:*` marker 的 legacy detection，允许既有项目自动迁移到新 marker。
- Changed:
  - `AGENTS.md` managed block marker 从 `<!-- sdlc-harness:begin/end -->` 改为 `<!-- pjsdlc:sdlc-harness:begin/end -->`。
  - `Makefile` include block marker 从 `# sdlc-harness:make:begin/end` 改为 `# pjsdlc:sdlc-harness:make:begin/end`。
  - managed metadata marker 前缀从 `sdlc-harness-managed` 改为 `pjsdlc:sdlc-harness-managed`。
  - 测试、README、PRD 和技术方案同步说明新 marker。
- Removed:
  - 新生成内容不再使用裸 `sdlc-harness:*` marker 作为 preferred marker。
- Unchanged:
  - CLI binary 仍是 `sdlc-harness`。
  - npm package 仍是 `agent-project-sdlc`。
  - 旧 marker 不立即报错；只有 marker 不完整、重复或新旧 marker 同时冲突时才 blocker。

## 3. Product Impact（产品影响）

| 受影响 PRD（Affected PRD） | 影响（Impact） |
|---|---|
| `.docs/01_product/npm_package_distribution.md` | `AGENTS.md` managed block 和 acceptance criteria 改为 `pjsdlc:sdlc-harness:*` marker，并要求 sync/upgrade 保留旧 marker 兼容迁移。 |

## 4. Technical Impact Candidates（技术影响候选）

| 模块（Module） | 影响（Impact） | 置信度（Confidence） |
|---|---|---|
| `packages/sdlc-harness/src/lib/managed-file.ts` | 定义新的 preferred marker 和旧 marker 兼容常量。 | high |
| `packages/sdlc-harness/src/lib/sync-engine.ts` | merge block 时识别旧 marker，替换为新 marker；重复或混用冲突时 blocker。 | high |
| `packages/sdlc-harness/src/lib/package-source.ts` | source extraction 支持 preferred marker 和 legacy marker。 | high |
| `tests/sdlc-harness/**` | 更新新 marker 断言，并覆盖旧 marker 自动迁移。 | high |
| `Makefile` / package assets | 根 include block 与包内 assets 同步到新 marker。 | high |

## 5. Acceptance Criteria

- [ ] 新项目 init 后 `AGENTS.md` 使用 `<!-- pjsdlc:sdlc-harness:begin/end -->`。
- [ ] 新项目 init 后 `Makefile` 使用 `# pjsdlc:sdlc-harness:make:begin/end`。
- [ ] 旧 `sdlc-harness:*` marker 的已有项目运行 `sync` 后会被安全替换为新 marker。
- [ ] marker 不完整、重复或新旧 marker 混用冲突时仍 blocker。
- [ ] `npm test`、`package check-source`、`make validate-harness` 通过。

## 6. Regression Requirements（回归要求）

- [ ] 覆盖 AGENTS.md legacy marker 替换为 `pjsdlc:*`。
- [ ] 覆盖 Makefile legacy marker 替换为 `pjsdlc:*`。
- [ ] 覆盖 source mapping 从有 preferred marker 的 AGENTS.md 提取核心内容。
- [ ] 覆盖 broken marker blocker。

## 7. Status

- Status: APPLIED

---

## RFC_009_namespace_managed_layout_and_skills.md

Source: [RFC_009_namespace_managed_layout_and_skills.md](RFC_009_namespace_managed_layout_and_skills.md)

# RFC_009: 为 managed layout 和 workflow skills 增加 pjsdlc 前缀

## 1. 背景

此前只为 `AGENTS.md`、`Makefile` 等桥接文件的 managed block marker 增加了 `pjsdlc` namespace，但用户的原始意图是让工作流目录和 Skill 标识本身也带有 `pjsdlc` 前缀，从文件系统层面降低与用户项目配置、用户自定义 Skill 或其它工具约定冲突的概率。

当前布局仍使用 `<harnessRoot>/pjsdlc_managed/**` 和 `<harnessRoot>/skills/<skill_name>/SKILL.md`。这会让包拥有的工作流配置与用户可能自建的通用目录名混在一起。需要改成更明确的 package namespace：

- `<harnessRoot>/pjsdlc_managed/**` -> `<harnessRoot>/pjsdlc_managed/**`
- `<harnessRoot>/skills/<workflow_skill>/SKILL.md` -> `<harnessRoot>/skills/pjsdlc_<workflow_skill>/SKILL.md`

根 `Makefile` 是用户仓库的命令入口桥接文件，不是包拥有的 canonical target 文件。包拥有的默认 targets 位于 `<harnessRoot>/pjsdlc_managed/make/sdlc-harness.mk`。在当前工作流仍以 `make validate-*` 作为阶段 gate 的情况下，根 `Makefile` 不应直接删除；后续若 CLI 覆盖完整 gate 命令，可再将根 `Makefile` 改为 create-if-missing 或 optional。

## 2. 变更内容（Change Content）

- Added:
  - `<harnessRoot>/pjsdlc_managed/**` 作为 package-managed workflow config canonical directory。
  - `pjsdlc_` Skill folder/name 前缀，覆盖通用阶段 workflow skills。
  - migration 兼容：旧 `<harnessRoot>/pjsdlc_managed/**` config path 和旧 Skill name/path 映射到新命名。
- Changed:
  - phase contracts、lifecycle `active_skill`、init default state 和 validators 使用 `pjsdlc_*` Skill 名称。
  - sync/config/source mapping 改为 `<harnessRoot>/pjsdlc_managed/**`。
  - 根 `Makefile` include path 改为 `<harnessRoot>/pjsdlc_managed/make/sdlc-harness.mk`。
  - README、PRD、技术方案同步新的命名边界。
- Removed:
  - tracked `<harnessRoot>/pjsdlc_managed/**` canonical source。
- Unchanged:
  - CLI binary 仍为 `sdlc-harness`。
  - npm package 仍为 `agent-project-sdlc`。
  - 根 `Makefile` 仍保留为用户仓库桥接入口，只维护 include block，不全量覆盖用户 target。
  - `.agent/state/**`、`.docs/**` 仍为项目事实源，不由包覆盖。

## 3. Product Impact（产品影响）

| 受影响 PRD（Affected PRD） | 影响（Impact） |
|---|---|
| `.docs/01_product/npm_package_distribution.md` | 将 package-managed workflow config 从 `<harnessRoot>/pjsdlc_managed/**` 改为 `<harnessRoot>/pjsdlc_managed/**`；将 workflow Skill 名称改为 `pjsdlc_*`；说明根 `Makefile` 是桥接入口。 |

## 4. Technical Impact Candidates（技术影响候选）

| 模块（Module） | 影响（Impact） | 置信度（Confidence） |
|---|---|---|
| `.agent/pjsdlc_managed/**` | 承接 templates、policies、make targets。 | high |
| `.agent/skills/pjsdlc_*/SKILL.md` | Skill folder 和 frontmatter `name` 需要同步改名。 | high |
| `.agent/state/lifecycle.yaml` | `active_skill` 需要改为 `pjsdlc_dev_sprint`。 | high |
| `.agent/pjsdlc_managed/policies/phase_contracts.yaml` | 所有 phase `skill` 改为 `pjsdlc_*`。 | high |
| `tools/*.py` | 读取 policies/templates 的路径改为 `.agent/pjsdlc_managed/**`。 | high |
| `packages/sdlc-harness/src/lib/*.ts` | default config、sync、migration、validators、init state 改为新路径和新 Skill 名。 | high |
| `tests/sdlc-harness/**` | 更新 init/sync/upgrade/package-source/validator 断言。 | high |
| `Makefile` | include path 改为 `.agent/pjsdlc_managed/make/sdlc-harness.mk`。 | high |

## 5. Acceptance Criteria

- [ ] 当前仓库不再 tracked `.agent/pjsdlc_managed/**`，改为 `.agent/pjsdlc_managed/**`。
- [ ] workflow Skill 目录和 frontmatter `name` 都使用 `pjsdlc_` 前缀。
- [ ] lifecycle、phase contracts、init default state 和 validators 使用 `pjsdlc_*` Skill 名称。
- [ ] `sync/init/upgrade` 生成 `<harnessRoot>/pjsdlc_managed/**`，并能迁移旧 `<harnessRoot>/pjsdlc_managed/**` 配置路径。
- [ ] 根 `Makefile` 只作为桥接入口保留，并 include `<harnessRoot>/pjsdlc_managed/make/sdlc-harness.mk`。
- [ ] `npm test`、`package check-source`、`make validate-harness`、`make validate-current` 通过。

## 6. Regression Requirements（回归要求）

- [ ] 覆盖默认 init 生成 `.agent/pjsdlc_managed/**` 与 `.agent/skills/pjsdlc_manager/SKILL.md`。
- [ ] 覆盖配置 `.harness` root 时生成 `.harness/pjsdlc_managed/**`。
- [ ] 覆盖旧 `.harness/managed/**` config migration 到 `.harness/pjsdlc_managed/**`。
- [ ] 覆盖 `phase_contracts.yaml` skill 映射到 `pjsdlc_*`。
- [ ] 覆盖根 Makefile include 新路径且保留项目自定义 target。

## 7. Status

- Status: APPLIED

---

## RFC_010_recover_done_task_contract_from_git.md

Source: [RFC_010_recover_done_task_contract_from_git.md](RFC_010_recover_done_task_contract_from_git.md)

# RFC_010: 从 git history 恢复已压缩 task 的完整执行合同

## 1. 背景

当前 `plan.yaml` 采用短期执行记忆模型：open task 保存 `allowed_paths`、`required_gates`、`acceptance_criteria` 和必要 `working_notes`；task 完成后压缩为简短摘要、implementation doc 和 gate result。压缩前会先创建 task implementation commit，确保完整 open task 合同进入 git history。

这套机制已经降低了 `plan.yaml` 长期膨胀，但提示词里没有足够明确地告诉后续 Agent：当需要追溯已完成 task 的完整执行合同，不应该在当前 `plan.yaml` 中寻找，也不应该重新猜测，而应去 git history 中查找 task implementation commit。

`pjsdlc:sdlc-harness:*` marker namespace 是另一项已确认变更，本 RFC 不回退或改动该 marker namespace。

## 2. 变更内容（Change Content）

- Added:
  - 在 `AGENTS.md` 的 Plan Protocol 中增加 done task 追溯规则。
  - 在开发和管理 Skill 中增加 git history lookup 操作提示。
  - 在 README 和技术方案中补充命令级恢复路径。
- Changed:
  - PRD 补充：Agent 必须能理解 done task 压缩后的历史恢复入口。
- Removed:
  - 无。
- Unchanged:
  - `pjsdlc:sdlc-harness:*` marker namespace 保持不变。
  - done task 仍不在 `plan.yaml` 长期保留详细执行合同。

## 3. Product Impact（产品影响）

| 受影响 PRD（Affected PRD） | 影响（Impact） |
|---|---|
| `.docs/01_product/npm_package_distribution.md` | 补充 plan 压缩后的 git history 恢复要求，避免 Agent 把已完成 task 的详细合同视为丢失。 |

## 4. Technical Impact Candidates（技术影响候选）

| 模块（Module） | 影响（Impact） | 置信度（Confidence） |
|---|---|---|
| `AGENTS.md` | 增加所有 Agent 必须遵循的 done task history lookup 协议。 | high |
| `.agent/skills/pjsdlc_dev_sprint/SKILL.md` | 开发阶段执行时明确 task implementation commit 是完整合同恢复点。 | high |
| `.agent/skills/pjsdlc_manager/SKILL.md` | `/status`、`/next` 或交接时能说明 done task 详情要查 git history。 | high |
| `README.md` | 补充恢复命令和设计原则。 | high |
| `.docs/03_tech_plan/harness_package_distribution.md` | 补充 plan state 与 git history 的交互契约。 | high |
| `packages/sdlc-harness/assets/**` | 通过 package sync-source 同步 AGENTS core 和 Skill assets。 | high |

## 5. Acceptance Criteria

- [ ] `AGENTS.md` 明确：done task 的完整执行合同在 task implementation commit 中，通过 git history 恢复。
- [ ] `pjsdlc_dev_sprint` 明确 task implementation commit 与 completion ledger commit 的历史查询方式。
- [ ] `pjsdlc_manager` 明确不要把 done task 详情重新写回当前 `plan.yaml`，除非有新的 RFC/revision task。
- [ ] README 和技术方案给出 `git log --grep <TASK_ID>` 与 `git show <commit>:.agent/state/plan.yaml` 示例。
- [ ] `pjsdlc:sdlc-harness:*` marker namespace 保持不变。
- [ ] `make validate-rfc`、`package check-source`、`make validate-harness` 通过。

## 6. Regression Requirements（回归要求）

- [ ] 确认 package source assets 与 workspace prompts 一致。
- [ ] 确认 docs overview 已刷新。
- [ ] 确认 prompt language contract 仍满足中文说明 + English identifiers。

## 7. Status

- Status: APPLIED

---

## RFC_011_short_lived_plan_and_gate_log.md

Source: [RFC_011_short_lived_plan_and_gate_log.md](RFC_011_short_lived_plan_and_gate_log.md)

# RFC_011: plan 和 gate_results 只保留短期执行状态

## 1. 背景

当前 `plan.yaml` 在 task 完成后仍保留 done task 摘要和 `gate_result`。这比完整合同轻量，但随着项目推进，done task 会越来越多，大多数情况下都会变成无效上下文，削弱 Agent 对当前任务和下一步任务的注意力。

同样，`.agent/state/gate_results.log` 当前会无限 append 历史 gate 记录。它对当前 task 中断恢复有帮助，但长期历史已经由 git commit、implementation doc、CI logs 或外部 release 系统承载，不应长期挤占 Agent 上下文。

## 2. 变更内容（Change Content）

- Added:
  - `plan.yaml` 增加轻量 `next_task_sequence`，用于删除历史 task 后仍能分配后续 `DEV-*` id。
  - 明确 `gate_results.log` 是当前 task / 当前阶段短期 scratchpad。
- Changed:
  - `plan.yaml` 只保留当前和未来相关 task：`pending`、`in_progress`、`blocked`、`pending_revision`。
  - task completion ledger commit 不再把 completed task 压缩留在 `plan.yaml`，而是从 `tasks` 中移除该 task。
  - `gate_results.log` 在 task completion ledger 后重置为短 header，不再无限累积历史 gate 记录。
  - validators 不再要求 `plan.yaml` 必须包含 done task，也不再通过 `plan.yaml` 校验所有历史 implementation docs。
- Removed:
  - `plan.yaml` 长期保留 done/cancelled task 摘要和 `gate_result` 的要求。
- Unchanged:
  - task implementation commit 仍必须在 task 移除前创建，并保留完整 open task 合同。
  - implementation doc、git history 和 CI logs 仍是长期历史事实源。
  - `pjsdlc:sdlc-harness:*` marker namespace 保持不变。

## 3. Product Impact（产品影响）

| 受影响 PRD（Affected PRD） | 影响（Impact） |
|---|---|
| `.docs/01_product/npm_package_distribution.md` | 调整 plan/gate 状态模型：当前执行计划只保留活跃和未来任务，历史任务与 gate 历史走 git、implementation doc 和 CI logs。 |

## 4. Technical Impact Candidates（技术影响候选）

| 模块（Module） | 影响（Impact） | 置信度（Confidence） |
|---|---|---|
| `.agent/state/plan.yaml` | 移除历史 done tasks，增加 `next_task_sequence`，保留当前 open task。 | high |
| `.agent/state/gate_results.log` | completion 后重置为短期 scratchpad header。 | high |
| `AGENTS.md` / README / Skills | 更新 Plan Protocol 和 task completion loop。 | high |
| `tools/validate_plan.py` / `tools/validate_task_docs.py` | 允许 `tasks: []`，禁止 done/cancelled 长期留存，implementation docs 校验改由索引/文档存在性承担。 | high |
| `packages/sdlc-harness/src/lib/validators.ts` | Node validator 同步新 plan 语义。 | high |
| `packages/sdlc-harness/src/lib/init.ts` / templates / migrations | 初始化和迁移加入 `next_task_sequence`，不再默认要求 done task。 | high |
| `tests/sdlc-harness/**` | 更新 validator 测试覆盖空 plan、open task 和 forbidden done task。 | high |

## 5. Acceptance Criteria

- [ ] `plan.yaml` 不再长期保留历史 done/cancelled tasks。
- [ ] `plan.yaml` 包含 `next_task_sequence`，并能在没有历史 tasks 时继续分配新 task id。
- [ ] `gate_results.log` 被定义并执行为当前 task / 当前阶段短期 scratchpad，completion 后重置。
- [ ] Python validators 允许无 open/pending task 的空 `tasks: []`，但仍校验 open task 合同。
- [ ] Node validators 与 Python validators 语义一致。
- [ ] README、AGENTS、Skill 和技术方案解释长期历史应从 git、implementation doc、CI logs 查找。
- [ ] `pjsdlc:sdlc-harness:*` marker namespace 保持不变。

## 6. Regression Requirements（回归要求）

- [ ] 覆盖空 `tasks: []` 的 `validate-dev` 通过。
- [ ] 覆盖 open task 缺少 `allowed_paths` 时失败。
- [ ] 覆盖 done/cancelled task 留在 `plan.yaml` 时失败。
- [ ] 覆盖 package source assets 与 workspace prompts 一致。
- [ ] 覆盖当前仓库 `make validate-harness` 和 `make validate-current` 通过。

## 7. Status

- Status: APPLIED

---

## RFC_012_remove_execution_history_from_active_state.md

Source: [RFC_012_remove_execution_history_from_active_state.md](RFC_012_remove_execution_history_from_active_state.md)

# RFC_012 Remove Execution History From Active State

## Summary

Harness active state 不再保存过去阶段和任务的执行流水。`lifecycle.yaml`、`plan.yaml` 和 `gate_results.log` 只保存当前可执行状态；过去执行信息默认不读取，也不迁移到 task。需要追溯时，由用户显式要求，或当前任务本身是 regression forensic / audit，再使用 git、PR、CI、release 系统和阶段产物查询。

## Motivation

当前 `lifecycle.yaml.history` 与 git history 重复，并且会随阶段流转持续增长。完成 task 的历史合同已经从 `plan.yaml` 移除，`gate_results.log` 也已变成短期 scratchpad；`lifecycle.history` 应保持同一原则。

普通修 bug、补功能或生成阶段产物时，Agent 需要读取的是当前事实源：PRD、技术方案、implementation doc、代码、测试、当前 lifecycle 和当前 plan。过去某个阶段怎样流转、某个 task 当时怎样执行，大多数情况下会稀释注意力，而不是提升成功率。

## Decision

1. 从 active state 中移除 `lifecycle.yaml.history`。
2. `tools/transition.py` 不再 append phase history；`--reason` 只作为本次命令输出说明或兼容参数保留。
3. `sdlc-harness init` 不再生成 `history: []`。
4. `sdlc-harness upgrade` migration 会删除既有 lifecycle `history`。
5. README、AGENTS、Skill 和模板声明：过去执行信息是 cold archive，不是默认上下文。
6. 追溯历史 task 合同从主流程规则降级为显式 forensic fallback，不作为常规任务恢复路径。

## Out Of Scope

- 不删除 implementation doc、RFC、ADR、release note 等产物事实。
- 不删除 git history、CI logs 或 release 系统记录。
- 不新增自动 `git bisect`、commit blame 或 forensic workflow。
- 不把 lifecycle history 合并到 `plan.yaml` 或其它 state 文件。

## Impact

- 新项目的 `lifecycle.yaml` 更短，只记录当前阶段路由状态。
- 老项目升级后，旧 `history` 会被 migration 删除。
- Agent 默认不会读取过去执行流水；如果用户明确要求“查历史原因/定位引入 commit/恢复某历史 task 合同”，再临时使用 git 和文档。
- `memory.md` 仍保留，但只记录长期稳定知识，不记录阶段 timeline 或任务流水。

## Acceptance Criteria

- `lifecycle.yaml` 不再包含 `history` 字段。
- `transition.py` 不再写入 lifecycle history。
- package init 和 migration 与新 lifecycle shape 对齐。
- prompt-language validator 不再要求 `history` key。
- README、AGENTS 和 package assets 明确过去执行信息不是默认读取上下文。

---

## RFC_013_workflow_singleton_collaboration_boundary.md

Source: [RFC_013_workflow_singleton_collaboration_boundary.md](RFC_013_workflow_singleton_collaboration_boundary.md)

# RFC_013 Workflow Singleton Collaboration Boundary

## Summary

AI SDLC Harness 集成了软件工程的全链路阶段，因此它在一个项目中应被视为项目级 singleton workflow。它适合让一个 Agent/一个主执行者维护当前项目的连续阶段状态，不适合作为多人同时并行推进同一项目全链路变更的协作层。

## Motivation

Harness 把 PRD、架构、技术方案、开发计划、实现、Review、测试、发布和 RFC 串成同一套事实链。这个设计让单一项目状态更连续，但也意味着并行分支的合并成本会变高。

如果多个人从某个时间点分支，同时修改跨阶段事实源，那么每个人都可能改变需求、方案、任务、实现、测试和状态。合并时不是普通代码冲突，而是整条软件工程事实链的冲突，基本无法通过简单 merge 可靠解决。

## Decision

1. README 明确声明：AI SDLC Harness 是项目级 singleton workflow。
2. 不推荐多人同时并行推进同一个项目的全链路 Harness 状态。
3. 多人协作应回到传统协作边界：限制在单个阶段内，例如产品方案、技术方案、开发、Review、测试或发布。
4. 单阶段内可以多人协作，但产物合并范围应限制在该阶段事实源内。
5. 各阶段产物连接起来后，才形成项目级 singleton workflow 的连续事实链。

## Out Of Scope

- 不新增多人锁、分布式状态合并或 CRDT 机制。
- 不改变当前 git/task commit 协议。
- 不禁止团队使用 Harness，只限定 Harness active state 的协作模型。

## Acceptance Criteria

- README 增加项目级 singleton workflow 与协作边界说明。
- 文案区分“多人协作不可跨全链路并行”和“多人可在单阶段内协作”。
- 文案解释跨阶段并行分支合并成本来自设计本身，而不是工具实现缺陷。

---

## RFC_014_remove_gate_results_state_and_strengthen_rfc_impact.md

Source: [RFC_014_remove_gate_results_state_and_strengthen_rfc_impact.md](RFC_014_remove_gate_results_state_and_strengthen_rfc_impact.md)

# RFC_014 Remove Gate Results State And Strengthen RFC Impact

## Summary

移除独立 `gate_results.log` state。gate 结果不再作为单独 state 文件保存；当前 task 执行时的 gate 证据写入 task `working_notes` 或 implementation doc 的 `Verification`，最终以 implementation doc、CI logs 或 release 记录为准。

同时收敛历史 task 信息的定位：过去 task 查询主要面向“看产物结果和变更意图”，默认读取 implementation doc、RFC/PRD/tech plan 和代码，而不是完整 open task execution contract。`allowed_paths`、`required_gates`、临时 `working_notes` 等字段是当前执行约束，不作为历史查询 API。

本 RFC 还补强 `pjsdlc_rfc_recalibrate`：RFC 阶段必须先做影响面清单，覆盖文档、state、Skill、policy/template、tools、package assets、tests、sync/upgrade/migration 和 generated overview，再进入补丁或 DEV task。

## Motivation

`gate_results.log` 已经从长期历史变成短期 scratchpad。继续保留独立 state 文件会增加额外事实源和清理动作，而 gate 证据本质上属于当前 task 验证过程，可以直接记录在 task notes 和 implementation doc 中。

历史 task 查询也不需要完整执行合同。用户真正关心的是过去做了什么、为什么做、产物在哪里、验证了什么；`allowed_paths`、`required_gates` 和临时 notes 主要服务于当时执行，不应成为默认历史读取内容。

另外，RFC 是改变事实链的入口，必须稳定考虑影响面。漏掉 package assets、tests、migration、generated overview 或 Skill 文案，会让变更在后续阶段才暴露，增加返工。

## Decision

1. 删除 `<harnessRoot>/state/gate_results.log`。
2. `tools/run_current_gate.py` 不再写 gate state，只运行阶段 gate 并输出结果。
3. `sdlc-harness init` 不再生成 `gate_results.log`。
4. `validate_harness`、phase contracts、allowed paths 和 README/AGENTS/Skill 不再要求或描述 `gate_results.log`。
5. gate 证据写入当前 task `working_notes` 或 implementation doc `Verification`；CI/release 系统可作为长期外部记录。
6. 历史 task 查询以 implementation doc、RFC/PRD/tech plan 和代码为主；open task 的 `allowed_paths`、`required_gates`、`working_notes` 是 execution-only fields，不作为历史查询 API。
7. RFC Skill 必须输出影响面清单，并在补丁前确认是否影响 docs/state/skills/policies/templates/tools/package assets/tests/migrations/generated artifacts。

## Out Of Scope

- 不删除 `allowed_paths`、`required_gates` 或 `acceptance_criteria` 作为当前 open task 执行约束。
- 不新增自动 CI 日志抓取或 gate artifact 系统。
- 不回滚 task implementation commit / completion ledger 两段提交协议。

## Acceptance Criteria

- 当前仓库不再保留 `.agent/state/gate_results.log`。
- 新项目 init 不生成 gate results state。
- 当前 gate runner 不再写 gate state。
- README、AGENTS、Dev/Manager Skill 不再要求 gate log。
- RFC Skill 明确要求影响面清单。
- Package assets 同步。

---

## RFC_015_optional_parallel_execution_contract.md

Source: [RFC_015_optional_parallel_execution_contract.md](RFC_015_optional_parallel_execution_contract.md)

# RFC_015: 可选 Parallel Execution Contract

## 1. 背景

用户希望 AI SDLC Harness 支持多 agent / 多 worktree 并行协作，但同时明确：

- Harness 配置不能通用地自动启动 Codex subagent。
- 只有用户明确提出“并行”“多 agent”或“多 worktree”时，才允许启用并行执行。
- 当当前 agent runtime 具备 subagent 能力时，可以由主 agent 自动编排；否则降级为用户手动多开对话并粘贴 worker prompt。

这属于 package public workflow capability 变化，需要进入 RFC 记录影响面后再实施。

## 2. 变更内容（Change Content）

- Added:
  - 新增可选 `parallel_execution` contract，用于描述并行执行的触发、模式、workers、owned paths、required gates 和主 agent 集成责任。
  - 新增两种模式：`runtime_managed` 和 `user_orchestrated`。
  - 新增 workflow 规则：需求、开发、测试阶段可以在用户显式要求时并行，但最终事实源由主 agent 集成。
- Changed:
  - PRD、tech plan、AGENTS managed block、Manager/PM/Dev/Tester Skills、plan template、validators、README/package README 需要描述该能力。
  - Python 和 TypeScript validators 需要接受缺省串行状态，并校验显式并行合同的最小 schema。
- Removed:
  - 无。
- Unchanged:
  - 默认 `/prd`、`/dev`、`/test`、`/devloop` 仍然串行。
  - v1 不新增 CLI 命令自动启动 Codex agent，也不要求 worker 之间通信。
  - `plan.yaml` 仍然是短期执行状态，不作为历史并行执行数据库。

## 3. Product Impact（产品影响）

| 受影响 PRD（Affected PRD） | 影响（Impact） |
|---|---|
| `.docs/01_product/npm_package_distribution.md` | 新增 optional parallel execution requirement、acceptance criteria 和 out-of-scope：不保证 CLI 自动启动 agent |
| `README.md` | 对外能力一览需要说明可选并行合同和 runtime/user orchestrated 降级模式 |
| `packages/sdlc-harness/README.md` | npm package README 需要同步说明 public capability |

## 4. Technical Impact Candidates（技术影响候选）

| 模块（Module） | 影响（Impact） | 置信度（Confidence） |
|---|---|---|
| docs | 更新 PRD、tech plan、PROJECT_SPEC、implementation docs、README/package README、RFC index 和 overview | high |
| state | `plan.yaml` 新增 optional top-level `parallel_execution`，缺省不存在表示串行 | high |
| skills | 更新 Manager/PM/Dev/Tester Skills，让显式并行意图进入并行合同；worker 不直接改主事实源 | high |
| policies | 不新增 policy 文件；现有 allowed paths 继续约束当前主 worktree diff | medium |
| templates | `PLAN_TEMPLATE.yaml` 增加注释型 parallel execution 示例 | high |
| tools | Python plan validator 增加 optional contract schema 校验；transition helper import bug 同步修复 | high |
| package assets | 需要运行 package source sync/check，把通用 assets 更新到 npm 包 canonical source | high |
| tests | TypeScript validator tests 增加合法/非法 parallel_execution 场景 | high |
| migrations | 不需要 migration；缺省无 `parallel_execution` 的旧项目继续有效 | high |
| generated artifacts | 需要运行 `make docs-overview` 刷新 overview | high |
| upgrade/sync | sync 分发更新后的 skills/templates/AGENTS managed block；upgrade 不需要额外迁移 | high |

## 5. Acceptance Criteria

- [x] 无 `parallel_execution` 的 plan 继续按串行模型通过校验。
- [x] 用户显式要求并行时，Agent 能生成 `parallel_execution.trigger: "user_requested"` 合同。
- [x] 合法 `runtime_managed` 和 `user_orchestrated` 合同通过 Python/TypeScript validator。
- [x] 缺少 `trigger: "user_requested"`、非法 mode、重复 worker id、写仓库 worker 缺 branch/worktree/owned_paths、SPRINTING linked task 不匹配时 validator 失败。
- [x] README 和 package README 明确说明 Harness 不承诺 CLI 自动多开 agent。

## 6. Regression Requirements（回归要求）

- [x] `npm test`
- [x] `node packages/sdlc-harness/dist/cli.js package sync-source`
- [x] `node packages/sdlc-harness/dist/cli.js package check-source`
- [x] `make docs-overview`
- [x] `make validate-harness`
- [ ] `make validate-current`
- [x] `git diff --check`

## 7. Status

- Status: APPLIED

---

## RFC_016_consume_plan_draft_tasks_on_promote.md

Source: [RFC_016_consume_plan_draft_tasks_on_promote.md](RFC_016_consume_plan_draft_tasks_on_promote.md)

# RFC_016: Consume Plan Draft Tasks On Promote

## 1. 背景

用户反馈指出，`plan.draft.yaml` 的语义和开发阶段执行行为存在不一致：架构阶段生成的 `DEV-*`
开发草案被 promote 成 `plan.yaml` 中的正式 `TASK-*` 并完成后，原 draft 仍以 `status: pending`
留在 `plan.draft.yaml.tasks[]`。这会让 `plan.yaml`、代码、implementation docs 和 git commits
显示开发已完成，但 `plan.draft.yaml` 仍像是有大量真实待办。

## 2. 变更内容（Change Content）

- Added: `validate-dev` 增加 stale draft 检查，完成态不得保留 `plan.draft.yaml.tasks[]`。
- Changed: 协议层采用通用“promote 即消费”规则，任何 draft queue 的 draft 转正式 `TASK-*` 时都必须同步删除源 draft；当前内置实现点是 `/dev` 和 `/devloop` 消费 `plan.draft.yaml.tasks[]`。
- Changed: `SPRINTING` allowed paths 允许主 Agent 修改 `<harnessRoot>/state/plan.draft.yaml`，用于消费 draft。
- Changed: Skill、协议文档、README、package validator 和 consumer lab 测试同步描述 draft、active plan 和历史事实源边界。
- Removed: 当前仓库中已被实现事实覆盖的历史 `DEV-001` pending draft。
- Unchanged: 不新增 `adopted_tasks` ledger；完成历史仍由 implementation docs、git/PR/CI 记录承担。

## 3. Product Impact（产品影响）

| 受影响 PRD（Affected PRD） | 影响（Impact） |
|---|---|
| `.docs/01_product/npm_package_distribution.md` | 改善 AI SDLC Harness 用户对开发完成状态的判断，避免 stale draft 被误认为真实待办。 |

## 4. Technical Impact Candidates（技术影响候选）

| 模块（Module） | 影响（Impact） | 置信度（Confidence） |
|---|---|---|
| State and task protocol | 明确 draft queue 只保存未采用草案，正式 task 恢复点只在 `plan.yaml`；当前内置 draft queue 是 `plan.draft.yaml.tasks[]`。 | high |
| Workflow Skills and policies | `pjsdlc_dev_sprint`、`pjsdlc_manager`、`allowed_paths` 和 phase/gate 文案需要描述 draft 消费规则。 | high |
| Validators | Python `make validate-dev` 和 package `validate-dev` 需要拒绝完成态残留 pending draft。 | high |
| Package assets and docs | 通用源变更需要通过 `package sync-source` 同步到 npm package assets。 | high |
| Tests and consumer lab | package validator tests 和 consumer lab 需要覆盖 stale draft negative case。 | high |
| Migrations | 不自动迁移删除用户项目 draft，避免误删真实未采用草案。 | high |

## 5. Acceptance Criteria

- [ ] 通用协议明确 draft queue 只表示未采用草案，不承担完成历史。
- [ ] `plan.draft.yaml.tasks[]` 明确表示当前内置的未采用开发草案队列。
- [ ] `/dev` promote draft 时创建正式 `TASK-*` 并同次删除源 draft。
- [ ] `validate-dev` 在无 open task 时拒绝残留 draft tasks。
- [ ] 当前仓库 stale `DEV-001` draft 被清理。
- [ ] README、PROJECT_SPEC、Skill、package assets、测试和 implementation doc 同步更新。

## 6. Regression Requirements（回归要求）

- [ ] `make validate-dev` 在 `plan.yaml` 空且 `plan.draft.yaml` 有 pending draft 时失败。
- [ ] 清空已消费 draft 后 `make validate-dev` 通过。
- [ ] `npm test --workspace agent-project-sdlc` 覆盖 package validator stale draft 场景。
- [ ] `node packages/sdlc-harness/dist/cli.js package check-source` 证明 assets 未漂移。
- [ ] `make validate-harness` 通过，证明 generated overview 和 prompt language 契约仍一致。

## 7. Status

- Status: APPLIED

---

## RFC_017_test_artifact_semantics.md

Source: [RFC_017_test_artifact_semantics.md](RFC_017_test_artifact_semantics.md)

# RFC_017: 测试产物语义与 RFC 清理规则修正

## 1. 背景

微信机器人模块的旧路线曾留下云端、`x weixin`、iLink、OpenClaw 等测试环境和测试进度文档；随后模块通过 RFC 重校准为 Windows PC 微信客户端、本地只读 reader CLI、`pywechat` RPA writer、MiMo agent、人工审核和风控队列的新方案。开发尚未完成真实可测试 entry/exit 时，`.docs/07_test/**` 中已经出现测试报告形态和旧路线测试结果，会误导后续 TESTING 阶段。

Harness 需要把测试策略、测试用例、执行报告和历史测试证据严格分开：`TEST_REPORT.md` 只代表实际执行后的证据；开发未交付可测应用前不生成正式测试产物；RFC 改变模块方案后，旧测试结果必须清出当前测试事实源。

## 2. 变更内容（Change Content）

- Added: `TEST_STRATEGY.md` 和 `TEST_CASES.md` 文档语义与模板。
- Added: RFC `Test Fact Source Impact` 段，要求列出 reviewed、superseded 和 retained test docs。
- Changed: `validate-test` 只读取 `.docs/07_test/TEST_REPORT.md`，不再 fallback 到 `TEST_PLAN.md`。
- Changed: `validate-plan` 拒绝非 `TESTING` / `RFC_RECALIBRATION` task 指向 `.docs/07_test/**`。
- Changed: RFC 替换技术路线、entry/exit 或验收边界时，必须清理被 supersede 的测试事实源和 `.docs/INDEX.md` 链接。
- Removed: 当前仓库 `.docs/07_test/TEST_PLAN.md` legacy alias 作为活跃测试事实源。
- Unchanged: 历史测试证据仍可通过 RFC provenance、git history、CI/release 系统追溯；不新增 `<harnessRoot>/archive/**`。

## 3. Product Impact（产品影响）

| 受影响 PRD（Affected PRD） | 影响（Impact） |
|---|---|
| `.docs/01_product/npm_package_distribution.md` | 更新 TESTING / RFC workflow 对外行为：测试报告必须是执行后证据，旧测试事实由 RFC 清理。 |
| `PROJECT_SPEC.md` / `README.md` | 用户可见说明需要区分 `TEST_STRATEGY.md`、`TEST_CASES.md` 和 `TEST_REPORT.md`。 |

## 4. Technical Impact Candidates（技术影响候选）

| 模块（Module） | 影响（Impact） | 置信度（Confidence） |
|---|---|---|
| Workflow skills | 更新 tester、reviewer、rfc prompts 的测试产物语义和清理规则。 | high |
| Templates / policies | 新增 strategy/cases 模板，更新 RFC/report 模板和阶段 contract。 | high |
| Validators | Python 和 TypeScript validator 同步拒绝 report fallback、占位 report、非法 `.docs/07_test/**` task 和残留 superseded test docs。 | high |
| Package assets | 通过 `package sync-source` 同步 managed skills/templates/policies/README 到 npm assets。 | high |
| Tests | 更新 validator regression 和 consumer lab fixture。 | high |

## 5. Acceptance Criteria

- [x] `validate-test` 只接受真实 `.docs/07_test/TEST_REPORT.md`，拒绝 `TEST_PLAN.md` fallback 和占位内容。
- [x] 非 `TESTING` / `RFC_RECALIBRATION` task 不能把 `.docs/07_test/**` 放入 `allowed_paths` 或 `result_docs`。
- [x] RFC 中列为 superseded 的 `.docs/07_test/**` 文件不存在于当前测试事实源，也不出现在 `.docs/INDEX.md`。
- [x] Package assets 与 authoring source 同步。

## 6. Regression Requirements（回归要求）

- [x] `npm test --workspace agent-project-sdlc`
- [x] `node packages/sdlc-harness/dist/cli.js package check-source`
- [x] `make validate-rfc`
- [x] `make validate-harness`

## 7. Test Fact Source Impact（测试事实源影响）

- Reviewed test docs: `.docs/07_test/TEST_REPORT.md`, `.docs/07_test/harness_consumer_lab.md`, `.docs/07_test/TEST_PLAN.md`
- Superseded test docs: `.docs/07_test/TEST_PLAN.md`
- Retained test docs: `.docs/07_test/TEST_REPORT.md`, `.docs/07_test/harness_consumer_lab.md`
- Reason: `TEST_PLAN.md` 只是 legacy alias，不包含执行证据；继续放在当前测试事实源会弱化 `TEST_REPORT.md` 的执行后证据语义。

## 8. Status

- Status: VERIFIED

---

## RFC_018_dev_gate_open_task_semantics.md

Source: [RFC_018_dev_gate_open_task_semantics.md](RFC_018_dev_gate_open_task_semantics.md)

# RFC_018: 修正 validate-dev open task 语义与 package Makefile wiring

## 1. 背景

`SPRINTING` 阶段开发中需要在 `plan.yaml` 保留当前 open task：`current_task_id` 指向正在执行的开发任务，任务状态通常是 `in_progress`，并且必须保留 `allowed_paths`、`required_gates`、`acceptance_criteria` 和 `implementation_doc` 等执行合同。只有代码、测试、implementation doc 和 gate 完成后，task 才从 `plan.yaml` 移除。

当前 `make validate-dev` 的 wiring 与这个协议冲突：它调用 no-open 语义的 `tools/validate_plan.py`，并调用 package consumer 中不会被 sync 的 `tools/validate_dev_state.py`。结果是开发中 gate 无法在正常 open task 状态下闭环。

## 2. 变更内容（Change Content）

- Added: `validate-dev` 的开发中 gate 语义，允许校验当前 open `SPRINTING` task。
- Changed: package CLI `validate-dev` 校验 lifecycle、当前 task、dirty files、draft queue 和 implementation docs。
- Changed: `validate-current` 在 `SPRINTING` 阶段保留 phase-exit no-open 语义。
- Changed: managed Makefile `validate-dev` 通过 `$(SDLC_HARNESS) validate-dev` 运行 package validator，不再直接依赖未同步的 Python tools。
- Unchanged: 其它 Makefile targets 仍可能依赖 `tools/**`；完整工具分发或替换不在本 RFC 范围。

## 3. Product Impact（产品影响）

| 受影响 PRD（Affected PRD） | 影响（Impact） |
|---|---|
| `.docs/01_product/npm_package_distribution.md` | `validate-dev` public behavior 改为支持开发中 open task，并保持 phase-exit safety。 |
| `README.md` / `PROJECT_SPEC.md` | 需要说明 direct dev gate 与 `/advance` / `validate-current` 的区别。 |

## 4. Technical Impact Candidates（技术影响候选）

| 模块（Module） | 影响（Impact） | 置信度（Confidence） |
|---|---|---|
| Package validators | `validate-dev` allow-open，新增 current task 和 dirty path 校验；`validate-current` 对 SPRINTING 继续 no-open。 | high |
| Managed Makefile | `validate-dev` 改用 `SDLC_HARNESS ?= npx sdlc-harness`，避免缺失 Python tool。 | high |
| Workflow docs/skills | 更新 dev、manager、README 和 implementation docs 的 gate 语义。 | high |
| Consumer lab / tests | 翻转旧的 open task rejection 预期，增加 Makefile dev gate PASS coverage。 | high |

## 5. Acceptance Criteria

- [x] `validate-dev` 接受合法的当前 open `SPRINTING` task。
- [x] `validate-current` 在 `SPRINTING` 有 open task 时失败。
- [x] `make validate-dev` 不直接调用 `tools/validate_dev_state.py` 等未同步 Python validators。
- [x] package source sync/check 通过。

## 6. Regression Requirements（回归要求）

- [x] `npm test --workspace agent-project-sdlc`
- [x] `node packages/sdlc-harness/dist/cli.js package sync-source`
- [x] `node packages/sdlc-harness/dist/cli.js package check-source`
- [x] `make validate-rfc`
- [x] `make validate-harness`

## 7. Test Fact Source Impact（测试事实源影响）

- Reviewed test docs: `.docs/07_test/TEST_REPORT.md`, `.docs/07_test/harness_consumer_lab.md`
- Superseded test docs: none
- Retained test docs: `.docs/07_test/TEST_REPORT.md`, `.docs/07_test/harness_consumer_lab.md`
- Reason: 本 RFC 改变 dev gate wiring，不替换测试事实源。

## 8. Status

- Status: VERIFIED

---

## RFC_019_sprinting_runnable_evidence_gate.md

Source: [RFC_019_sprinting_runnable_evidence_gate.md](RFC_019_sprinting_runnable_evidence_gate.md)

# RFC_019: SPRINTING runnable evidence gate

## 1. 背景

微信 AI 业务员机器人 RFC 后，开发阶段先完成了领域对象、adapter、worker、测试和实现文档，但没有把模块或应用的完整入口与出口作为硬性完成条件。结果是 Agent 容易把“代码有测试、文档有记录”误判为“开发完成”，而 TESTING 阶段可能被迫补 runtime、入口、初始化或发送后校验。

现有 `RFC_017` / `RFC_018` 已经收紧 TESTING 报告语义和 direct `validate-dev` open-task 语义，但 `validate-dev` 对 runnable entry/exit 仍偏关键词检查。Harness 需要把 SPRINTING DoD 提升为结构化证据 gate。

## 2. 变更内容（Change Content）

- Added: implementation doc 模板新增 `Development Evidence` 小节。
- Added: `validate-dev` 对当前 open `SPRINTING` task 的 `implementation_doc` 检查 `Runnable Entry`、`Observable Exit`、`Basic Self-test Evidence`，或带原因的 `Not applicable`。
- Added: 页面类任务要求 dev server/page URL 和 browser/Playwright/screenshot/equivalent interaction evidence。
- Added: API/CLI/worker/RPA 类任务要求 command/endpoint/invocation 和 response/output/side effect/PASS evidence。
- Changed: Dev、Implementation Doc、Review、Tester prompts 把 Development Evidence 作为进入 REVIEWING/TESTING 前的硬边界。
- Unchanged: TESTING 只调用既有 entry/exit 做验证；缺失入口、出口或 Development Evidence 时继续 `BLOCKED`，不在 TESTING 补 runtime。

## 3. Product Impact（产品影响）

| 受影响 PRD（Affected PRD） | 影响（Impact） |
|---|---|
| `.docs/01_product/npm_package_distribution.md` | 增加 `validate-dev` 的 public behavior：当前 dev task 必须有结构化 Development Evidence。 |
| `README.md` / `PROJECT_SPEC.md` / `packages/sdlc-harness/README.md` | 对外说明 SPRINTING DoD 和 direct dev gate 的新证据要求。 |

## 4. Technical Impact Candidates（技术影响候选）

| 模块（Module） | 影响（Impact） | 置信度（Confidence） |
|---|---|---|
| Package validators | `validate-dev` 对当前 task implementation doc 增加结构化证据检查。 | high |
| Workflow skills/templates | Dev、Implementation Doc、Review、Tester prompts 和模板新增 Development Evidence 约束。 | high |
| Package assets | 通过 `package sync-source` 同步 managed skills、templates、policies 和 README docs asset。 | high |
| Tests | 增加 validator regression 覆盖缺失 evidence、placeholder、页面证据和 callable 证据。 | high |

## 5. Acceptance Criteria

- [x] 缺少 `Development Evidence` 的当前 dev task implementation doc 被 `validate-dev` 拒绝。
- [x] 空模板、placeholder、缺少 `Observable Exit` 或缺少 `Basic Self-test Evidence` 被 `validate-dev` 拒绝。
- [x] 合法带原因的 `Not applicable` 被 `validate-dev` 接受。
- [x] 页面类任务缺少 dev server/page URL 或 browser check 被 `validate-dev` 拒绝。
- [x] API/CLI/worker 类任务有 invocation 与 observable result 时被 `validate-dev` 接受。

## 6. Regression Requirements（回归要求）

- [x] `npm test --workspace agent-project-sdlc`
- [x] `node packages/sdlc-harness/dist/cli.js package sync-source`
- [x] `node packages/sdlc-harness/dist/cli.js package check-source`
- [x] `make validate-rfc`
- [x] `make validate-harness`

## 7. Test Fact Source Impact（测试事实源影响）

- Reviewed test docs: `.docs/07_test/TEST_REPORT.md`, `.docs/07_test/harness_consumer_lab.md`
- Superseded test docs: none
- Retained test docs: `.docs/07_test/TEST_REPORT.md`, `.docs/07_test/harness_consumer_lab.md`
- Reason: 本 RFC 强化 SPRINTING gate，不替换当前 TESTING 事实源。

## 8. Status

- Status: APPLIED

---

## RFC_020_application_readiness_gates.md

Source: [RFC_020_application_readiness_gates.md](RFC_020_application_readiness_gates.md)

# RFC_020: Application readiness gates

## 1. 背景

`RFC_019` 已经把 SPRINTING 的 runnable entry/exit 提升为结构化 `Development Evidence`，但实际执行仍可能把 provider smoke、fixture smoke 或 fake adapter 链路误判为“应用已经交付”。这会让开发阶段提前完成，随后 REVIEWING / TESTING 被迫处理本应由开发阶段交付的 product runtime、稳定入口、出口和初始化证据。

本 RFC 将“应用就绪（Application readiness）”定义为开发阶段硬边界：如果技术方案或 task 承诺 service、agent、runtime、HTTP、CLI、worker、provider、adapter、live mode 或 external integration，开发完成前必须交付对应可调用入口、可观察出口、初始化、配置契约和基础自测证据；否则应 `BLOCKED` 或回到 SPRINTING/RFC。

## 2. 变更内容（Change Content）

- Added: smoke evidence taxonomy，包括 `unit test`、`domain smoke`、`provider live smoke`、`runtime HTTP smoke`、`application readiness`、`external integration smoke`。
- Changed: `validate-dev` 要求 `Development Evidence` 包含 `Runnable Entry`、`Observable Exit`、`Client / Server Initialization`、`Config Contract`、`Basic Self-test Evidence`，或带原因的 `Not applicable`。
- Changed: 对 service / agent / runtime / live mode 类 task，仅有 provider smoke、fixture smoke、fake adapter 或 one-shot smoke 不足以通过 application readiness。
- Changed: `validate-review` 要求结构化 readiness checklist，任一 `BLOCKED` 不允许进入 TESTING。
- Changed: `validate-test` 不允许把缺少 entry/exit 或 Development Evidence 的当前状态写成 `PASS` 报告；缺口存在时只能 `BLOCKED`。
- Unchanged: 不新增 gate 名称，继续使用 `validate-dev`、`validate-review`、`validate-test`。

## 3. Product Impact（产品影响）

| 受影响 PRD（Affected PRD） | 影响（Impact） |
|---|---|
| `.docs/01_product/npm_package_distribution.md` | 阶段 gate 的 public behavior 更严格，减少 smoke 被误判为应用交付。 |
| `README.md` / `packages/sdlc-harness/README.md` | 需要说明 SPRINTING、REVIEWING、TESTING 的 application readiness 边界。 |

## 4. Technical Impact Candidates（技术影响候选）

| 模块（Module） | 影响（Impact） | 置信度（Confidence） |
|---|---|---|
| Package validators | 收紧 `validate-dev`、`validate-review`、`validate-test` 的文档语义检查。 | high |
| Source validators | 同步 Python validator，避免源码和 package CLI 漂移。 | high |
| Workflow skills/templates | Dev、Review、Tester、Implementation Doc prompts 和模板更新 evidence/checklist 字段。 | high |
| Package assets | 通过 `package sync-source` 同步 managed skills、templates、README docs asset。 | high |
| Regression tests | 增加 provider/fake smoke、缺少 initialization/config、review blocked、test PASS misuse 覆盖。 | high |

## 5. Acceptance Criteria

- [ ] `validate-dev` 拒绝缺少 `Client / Server Initialization` 或 `Config Contract` 的当前 dev task implementation doc。
- [ ] `validate-dev` 对 runtime/service/agent/live task 拒绝仅 provider smoke、fixture smoke、fake adapter 或 one-shot smoke 的证据，除非明确 `BLOCKED`。
- [ ] `validate-review` 要求 readiness checklist 中的 `Runnable Entry`、`Observable Exit`、`Initialization`、`Config Contract`、`Testing Handoff Readiness`，并拒绝任一 `BLOCKED` 的 Review PASS。
- [ ] `validate-test` 拒绝把 missing entry/exit、missing Development Evidence 或 no runnable boundary 写成 `PASS`。
- [ ] 通用 Skill、模板、package assets、README 和 implementation doc 同步到新语义。

## 6. Regression Requirements（回归要求）

- [ ] `npm test --workspace agent-project-sdlc`
- [ ] `node packages/sdlc-harness/dist/cli.js package sync-source`
- [ ] `node packages/sdlc-harness/dist/cli.js package check-source`
- [ ] `make docs-overview`
- [ ] `make validate-harness`
- [ ] `make validate-dev`

## 7. Test Fact Source Impact（测试事实源影响）

- Reviewed test docs: `.docs/07_test/TEST_REPORT.md`, `.docs/07_test/harness_consumer_lab.md`
- Superseded test docs: none
- Retained test docs: `.docs/07_test/TEST_REPORT.md`, `.docs/07_test/harness_consumer_lab.md`
- Reason: 本 RFC 强化 workflow gate 语义，不替换当前测试事实源；旧路线测试结果仍由 `RFC_017` 的 supersede 清理规则约束。

## 8. Status

- Status: APPLIED
