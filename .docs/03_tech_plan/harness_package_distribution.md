# Harness npm 包化分发技术方案

## 1. 关联产品需求

- PRD: `.docs/01_product/npm_package_distribution.md`
- Requirement IDs: `PRD-NPM-001` 至 `PRD-NPM-016`

## 2. 现有上下文

- 当前模块（Current modules）:
  - `AGENTS.md`：Agent 全局协议。
  - `Makefile`：当前验证命令入口。
  - `<harnessRoot>/skills/**/SKILL.md`：阶段 Skill 的 canonical source。
  - `<harnessRoot>/managed/templates/**`：阶段产物模板。
  - `<harnessRoot>/managed/policies/**`：阶段契约、路径策略、gate 和风险矩阵。
  - `tools/*.py`：当前 validators、transition、overview 生成和状态工具。
  - `.github/workflows/harness.yml`：当前 CI gate 入口。
- 相关 APIs（Related APIs）:
  - CLI binary: `sdlc-harness`
  - Commands: `init`、`init --adopt`、`sync`、`upgrade`、`doctor`、`validate-*`、`package sync-source`、`package check-source`
- 相关数据（Related data）:
  - `<harnessRoot>/config.yaml`
  - managed file metadata block
  - sync manifest
  - local overrides

## 3. 方案架构

### 3.1 包目录

```txt
packages/sdlc-harness/
├── package.json
├── tsconfig.json
├── src/
│   ├── cli.ts
│   ├── commands/
│   │   ├── init.ts
│   │   ├── sync.ts
│   │   ├── upgrade.ts
│   │   ├── doctor.ts
│   │   ├── validate.ts
│   │   └── package-source.ts
│   ├── lib/
│   │   ├── config.ts
│   │   ├── managed-file.ts
│   │   ├── sync-engine.ts
│   │   ├── migrations.ts
│   │   └── paths.ts
│   └── index.ts
├── assets/
│   ├── agents/
│   ├── skills/
│   ├── templates/
│   ├── policies/
│   ├── make/
│   └── github/
└── migrations/
```

### 3.2 工作区生成目录

```txt
AGENTS.md
package.json or sdlc-harness.config.json
<harnessRoot>/config.yaml
<harnessRoot>/skills/**/SKILL.md
<harnessRoot>/state/**
<harnessRoot>/managed/templates/**
<harnessRoot>/managed/policies/**
<harnessRoot>/managed/make/sdlc-harness.mk
<harnessRoot>/overrides/**
.docs/**
```

`<harnessRoot>/skills/**` 是 Agent 与 `active_skill` 的硬索引入口，保持一层 `skills/<skill_name>/SKILL.md`。除 skills 外的 package-managed workflow config 统一放在 `<harnessRoot>/managed/**`，不再维护 `<harnessRoot>/policies/**` 或 `<harnessRoot>/templates/**` mirror。

## 4. 接口契约（Interface Contract）

| 接口（Interface） | 方法/事件（Method/Event） | 请求（Request） | 响应（Response） | 错误（Errors） |
|---|---|---|---|---|
| `sdlc-harness init` | CLI command | `--force?`、cwd | 创建新项目 Harness 骨架并执行 `sync` | 非空冲突、权限不足 |
| `sdlc-harness init --adopt` | CLI command | cwd | 最小接入已有项目，执行安全诊断 | 发现高风险覆盖时停止 |
| `sdlc-harness sync` | CLI command | `<harnessRoot>/config.yaml`、包内 assets | materialized files、sync report | managed marker 缺失、local override 冲突、never overwrite 命中 |
| `sdlc-harness upgrade` | CLI command | 当前 package version、schema version | migration report、自动 `sync`、doctor report | migration 失败、checksum 冲突 |
| `sdlc-harness doctor` | CLI command | cwd | 配置完整性、漂移、override、gate 建议 | 配置不可读 |
| `sdlc-harness validate-*` | CLI command | cwd | 对应 gate 结果 | gate failure |
| `sdlc-harness package sync-source` | CLI command | 当前仓库 Harness 源文件 | 更新包内 canonical assets | 源文件缺失、映射未声明 |
| `sdlc-harness package check-source` | CLI command | 当前仓库 Harness 源文件与包内 assets | 一致性报告 | 检测到漂移 |

## 5. 数据模型（Data Model）

### 5.1 `<harnessRoot>/config.yaml`

```yaml
core:
  package: "agent-project-sdlc"
  version: "0.1.0"
  schema_version: "1"

managed_files:
  - path: "AGENTS.md"
    strategy: "merge-block"
  - path: "<harnessRoot>/skills"
    strategy: "managed"
  - path: "<harnessRoot>/managed/templates"
    strategy: "managed"
  - path: "<harnessRoot>/managed/policies"
    strategy: "merge-with-local"
  - path: "<harnessRoot>/managed/make/sdlc-harness.mk"
    strategy: "managed"
  - path: ".github/workflows/harness.yml"
    strategy: "create-if-missing"

local_overrides:
  - "<harnessRoot>/overrides/**"
  - "<harnessRoot>/managed/policies/*.local.yaml"

never_overwrite:
  - ".docs/**"
  - "<harnessRoot>/state/**"
  - "src/**"
  - "tests/**"
```

### 5.2 managed metadata

```txt
<!-- sdlc-harness-managed
source: agent-project-sdlc
version: 0.1.0
kind: skill
name: pm_prd
checksum: sha256:...
-->
```

### 5.3 Source sync manifest

```yaml
source_mappings:
  - source: "AGENTS.md"
    target: "packages/sdlc-harness/assets/agents/AGENTS_CORE.md"
    mode: "extract-managed-block"
  - source: ".agent/skills"
    target: "packages/sdlc-harness/assets/skills"
    mode: "copy-tree"
  - source: ".agent/managed/templates"
    target: "packages/sdlc-harness/assets/templates"
    mode: "copy-tree"
  - source: ".agent/managed/policies"
    target: "packages/sdlc-harness/assets/policies"
    mode: "copy-tree"
  - source: "Makefile"
    target: "packages/sdlc-harness/assets/make/sdlc-harness.mk"
    mode: "extract-harness-targets"
  - source: ".github/workflows/harness.yml"
    target: "packages/sdlc-harness/assets/github/harness.yml"
    mode: "copy-file"
```

### 5.4 Plan state 与 open task contract

`<harnessRoot>/state/plan.yaml` 是当前 sprint/阶段的执行计划事实源。open task 直接保存执行合同；done/cancelled task 在完成后压缩为简短摘要，避免历史现场长期挤占 Agent 上下文。典型 open task 结构：

```yaml
current_phase: "SPRINTING"
current_task_id: "DEV-011"
tasks:
  - id: "DEV-011"
    title: "合并 checkpoint 到 plan.yaml 并重命名 tasks 状态"
    status: "in_progress"
    summary: "一句话描述当前任务目标。"
    docs:
      product:
        - ".docs/01_product/npm_package_distribution.md"
    allowed_paths:
      - "packages/sdlc-harness/**"
    required_gates:
      - "npm test"
    acceptance_criteria:
      - "open task contract lives in plan.yaml"
    working_notes:
      - "只记录恢复现场所需的短备注。"
    implementation_doc: ".docs/04_implementation/npm_package/dev_011_plan_yaml_no_checkpoint.md"
    gate_result: ""
```

task 完成后，移除 `docs`、`allowed_paths`、`required_gates`、`acceptance_criteria` 和 `working_notes`，只保留 `id`、`title`、`status`、`summary`、`implementation_doc` 和 `gate_result`。历史动作记录由 git commit 承载，产物结果由 implementation doc 承载；Harness 不再维护 checkpoint 文件或 `.agent/archive/**` 作为常规归档事实源。

## 6. 任务拆分（Task Breakdown）

| Task ID | 标题（Title） | Allowed Paths | Required Gates | Implementation Doc |
|---|---|---|---|---|
| DEV-001 | 创建 npm 包骨架与 source sync manifest | `package.json`, `packages/sdlc-harness/**`, `.harness/config.yaml`, `.docs/04_implementation/npm_package/**` | `make lint`, `make test-current-domain` | `.docs/04_implementation/npm_package/dev_001_package_scaffold.md` |
| DEV-002 | 实现 `sync`、`init`、`init --adopt` 和 `doctor` 最小闭环 | `packages/sdlc-harness/**`, `tests/sdlc-harness/**`, `.docs/04_implementation/npm_package/**` | `make lint`, `make test-current-domain` | `.docs/04_implementation/npm_package/dev_002_sync_init_doctor.md` |
| DEV-003 | 实现 `upgrade`、migration 和自动 sync | `packages/sdlc-harness/**`, `tests/sdlc-harness/**`, `.docs/04_implementation/npm_package/**` | `make lint`, `make test-current-domain` | `.docs/04_implementation/npm_package/dev_003_upgrade_migrations.md` |
| DEV-004 | 实现 `package sync-source` / `package check-source` 与 CI 漂移检查 | `packages/sdlc-harness/**`, `.github/workflows/**`, `tests/sdlc-harness/**`, `.docs/04_implementation/npm_package/**` | `make lint`, `make test-current-domain` | `.docs/04_implementation/npm_package/dev_004_source_sync_ci.md` |
| DEV-005 | 将 validators 入口接入 `sdlc-harness validate-*` | `packages/sdlc-harness/**`, `tests/sdlc-harness/**`, `.docs/04_implementation/npm_package/**` | `make lint`, `make test-current-domain` | `.docs/04_implementation/npm_package/dev_005_validate_commands.md` |
| DEV-006 | 统一 `.harness` 工作流根目录并生成 `.agents` 兼容出口 | `README.md`, `.harness/config.yaml`, `.harness/agents/**`, `.harness/managed/**`, `.agents/skills/**`, `packages/sdlc-harness/**`, `tests/sdlc-harness/**`, `.docs/02_architecture/harness_package_distribution.md`, `.docs/04_implementation/npm_package/**` | `npm test`, `node packages/sdlc-harness/dist/cli.js package check-source`, `node packages/sdlc-harness/dist/cli.js validate-harness`, `make validate-harness` | `.docs/04_implementation/npm_package/dev_006_unified_harness_root.md` |
| DEV-008 | 支持 `harnessFolderName` 配置 Harness 根目录 | `package.json`, `AGENTS.md`, `README.md`, `.harness/config.yaml`, `.harness/skills/**`, `.harness/managed/**`, `tools/**`, `packages/sdlc-harness/**`, `tests/sdlc-harness/**`, `.docs/04_implementation/npm_package/**` | `npm test`, `node packages/sdlc-harness/dist/cli.js package check-source`, `node packages/sdlc-harness/dist/cli.js validate-harness`, `make validate-harness` | `.docs/04_implementation/npm_package/dev_008_configurable_harness_root.md` |
| DEV-009 | init 询问 Harness root 并迁移当前仓库到 `.agent` 默认根 | `package.json`, `AGENTS.md`, `README.md`, `.gitignore`, `.agent/**`, `.harness/**`, `tools/**`, `packages/sdlc-harness/**`, `tests/sdlc-harness/**`, `.docs/04_implementation/npm_package/**` | `npm test`, `node packages/sdlc-harness/dist/cli.js package check-source`, `node packages/sdlc-harness/dist/cli.js validate-harness`, `make validate-harness` | `.docs/04_implementation/npm_package/dev_009_init_prompt_default_agent_root.md` |
| DEV-010 | 简化 task、checkpoint 和 archive 状态模型 | 历史任务；详见 implementation doc | `npm test`, `node packages/sdlc-harness/dist/cli.js package check-source`, `node packages/sdlc-harness/dist/cli.js validate-harness`, `make validate-harness`, `make validate-current` | `.docs/04_implementation/npm_package/dev_010_task_checkpoint_model.md` |
| DEV-011 | 合并 checkpoint 到 `plan.yaml` 并重命名 tasks 状态 | `AGENTS.md`, `README.md`, `Makefile`, `.agent/**`, `.docs/**`, `.github/workflows/**`, `tools/**`, `packages/sdlc-harness/**`, `tests/sdlc-harness/**` | `npm test`, `node packages/sdlc-harness/dist/cli.js package check-source`, `node packages/sdlc-harness/dist/cli.js validate-harness`, `make validate-harness`, `make validate-current` | `.docs/04_implementation/npm_package/dev_011_plan_yaml_no_checkpoint.md` |

## 7. 风险与缓解

| 风险（Risk） | 等级（Level） | 缓解措施（Mitigation） |
|---|---|---|
| 包源码与当前工作流内容漂移 | P0 | `package sync-source` 更新，`package check-source` 和 CI 强制检查 |
| 根 `Makefile` 与业务项目冲突 | P0 | 只插入 include，不整体覆盖 |
| `AGENTS.md` 与项目自定义规则冲突 | P0 | 使用 managed block，marker 外内容不改 |
| 生成的 Skill 不被 Agent 识别 | P0 | 默认 `<harnessRoot>` 为 `.agent`；Skill 保持 `<harnessRoot>/skills/<skill_name>/SKILL.md` 硬索引；显式 `.harness` 项目需在入口规则中声明 `.harness/skills/**` |
| policy/template 事实源重复 | P1 | 工具只读取 `<harnessRoot>/managed/policies/**` 和 `<harnessRoot>/managed/templates/**`，删除 legacy mirror |
| npm 包 validators 运行环境不稳定 | P1 | validators 运行时使用 TypeScript/Node，不依赖 Python 运行时 |
| `plan.yaml` 过大导致 Agent 上下文膨胀 | P0 | open task 只保存当前执行合同和必要短备注，done task 立即压缩为简短摘要 |
| task/release 归档与 git 历史重复 | P1 | 删除 `.agent/archive/**` 常规机制，动作记录以 git commit/tag 为准 |

## 8. 需要关注的方案偏移

- 如果当前仓库继续作为包源码仓库，`packages/sdlc-harness/assets/**` 不应手写，应由 `package sync-source` 从工作流源文件生成。
- RFC_003 调整后，`sdlc-harness init` 会询问 Harness root；默认 `.agent`，当前仓库也使用默认 `.agent`。
- RFC_004 调整后，删除 `.agent/archive/**` 常规归档，并把历史动作记录交给 git。
- RFC_005 调整后，checkpoint 文件被删除；`allowed_paths`、`required_gates` 和验收标准直接保存在 open task 的 `plan.yaml` 条目中，done task 压缩为简短摘要。
