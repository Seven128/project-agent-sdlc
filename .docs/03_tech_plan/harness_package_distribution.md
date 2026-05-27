# Harness npm 包化分发技术方案

## 1. 关联产品需求

- PRD: `.docs/01_product/npm_package_distribution.md`
- Requirement IDs: `PRD-NPM-001` 至 `PRD-NPM-027`

## 2. 现有上下文

- 当前模块（Current modules）:
  - `AGENTS.md`：Agent 全局协议。
  - `Makefile`：当前验证命令入口。
  - `<harnessRoot>/skills/pjsdlc_*/SKILL.md`：阶段 Skill 的 canonical source。
  - `<harnessRoot>/pjsdlc_managed/templates/**`：阶段产物模板。
  - `<harnessRoot>/pjsdlc_managed/policies/**`：阶段契约、路径策略、gate 和风险矩阵。
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
<harnessRoot>/skills/pjsdlc_*/SKILL.md
<harnessRoot>/state/**
<harnessRoot>/pjsdlc_managed/templates/**
<harnessRoot>/pjsdlc_managed/policies/**
<harnessRoot>/pjsdlc_managed/make/sdlc-harness.mk
<harnessRoot>/pjsdlc_managed/override_skills/*.md
.docs/**
```

`<harnessRoot>/skills/pjsdlc_*/SKILL.md` 是 Harness hard file index，保持一层 `skills/<skill_name>/SKILL.md`，并通过 `pjsdlc_` 前缀标识包内 workflow Skill。这个固定路径用于 `active_skill` / `phase_contracts.yaml` 的软路由；它不保证具体 Agent 客户端会把该目录当作 native skill hard index 首轮水合。除 skills 外的 package-managed workflow config 统一放在 `<harnessRoot>/pjsdlc_managed/**`，不再维护 `<harnessRoot>/managed/**`、`<harnessRoot>/policies/**` 或 `<harnessRoot>/templates/**` mirror。

项目本地阶段角色提示词通过 `<harnessRoot>/pjsdlc_managed/override_skills/<skill_name>.md` 追加到最终 `SKILL.md`。`sdlc-harness sync` 先读取包内 base Skill，再校验 override 文件名必须匹配已有 `pjsdlc_*` workflow Skill，最后在 `<harnessRoot>/skills/<skill_name>/SKILL.md` 末尾写入一个 `Local Override` 区块。直接修改 `<harnessRoot>/skills/**/SKILL.md` 不受支持，因为该目录是 managed output，会在后续 sync/upgrade 中被重新物化。

`sdlc-harness init` 的交互顺序是先选择目标 Agent，再确定 `<harnessRoot>`：

| 选择 | 写入的 `harnessFolderName` |
|---|---|
| 直接回车 / `Codex` | `.codex` |
| `Claude Code` | `.claude` |
| `Cursor` | `.cursor` |
| `Cline` | `.cline` |
| `Roo Code` | `.roo` |
| `Gemini CLI` | `.gemini` |
| `Other` | 继续询问自定义 folder；直接回车默认 `.agent` |

显式 `--harness-folder` / `--harnessFolderName` 或已有 JSON 配置优先级更高，会跳过 Agent 选择。非交互环境使用 Codex 默认 `.codex`，避免阻塞初始化。

### 3.3 Natural Language Control

用户交互默认采用自然语言。`/status`、`/next`、`/advance`、`/rfc`、`/prd`、`/design`、`/dev`、`/devloop`、`/syncdocs`、`/overview`、`/review` 和 `/test` 是更完整、更细节的提示词别名，也可作为调试入口或自动化入口，不是用户必须记忆的主控制面。自然语言意图和 `/xxx` 别名必须映射到同一组 workflow action；自然语言入口成本更低，但细节约束更依赖 Agent 根据上下文判断。

`pjsdlc_manager` 负责将自然语言意图映射到 workflow action：

| 用户意图 | Workflow action |
|---|---|
| 状态查询 | 读取 lifecycle/plan，等价 `/status` |
| 继续、下一步、推进 | 按 `active_skill` 执行当前阶段，等价 `/next` |
| 检查或进入下一阶段 | 运行当前阶段出口 gate，通过后用 `transition.py` 流转，等价 `/advance` |
| 需求或设计变化 | 进入 `RFC_RECALIBRATION` workflow |
| 完善产品方案、写 PRD | `/prd`：在 `REQUIREMENT_GATHERING` 澄清需求并更新 PRD、验收标准和 open questions |
| 设计技术方案、做架构方案、根据 PRD 做技术方案 | `/design`：在 `ARCHITECTING` 更新 architecture、tech plan 和 `plan.draft.yaml` |
| 开始开发、做当前任务、做下一个任务 | `/dev`：在 `SPRINTING` 创建或选择下一个最小 DEV task，并完成一个 task 闭环 |
| 开始循环：写任务，执行任务；把开发循环跑完 | `/devloop`：连续运行 `/dev`，直到没有明确任务或遇到 blocker |
| 测试或验证 | 运行当前 task 或阶段对应 gate |
| Review | 进入只读 Review workflow |
| 刷新 overview | 运行 `make docs-overview` |

如果自然语言意图会改变阶段、创建或删除 task、提交、push 或发布，Agent 先说明即将执行的动作和验证方式，再继续。这个契约只约束 Agent 行为，不增加新的 state 字段，也不要求 Codex、Claude Code 或其它客户端提供专有模式切换能力。

Codex `/plan` 和 `/goal` 是客户端模式入口，不由 Harness 自动开启或配置。用户可以手动组合 `/plan` 或 `/goal` 与自然语言/宏指令，例如 `/plan /prd`、`/plan 完善产品方案`、`/goal /devloop` 或 `/goal 开始循环：写任务，执行任务`。Harness 只负责在收到对应用户意图后执行 workflow action。

### 3.4 根文档分层

根文档分成两层：

- `README.md`：面向用户和 npm 包消费者，介绍 Harness 是什么、如何安装、如何 `init` / `init --adopt` / `sync` / `upgrade` / `doctor`，以及自然语言日常使用方式。
- `PROJECT_SPEC.md`：面向维护者，保存完整产品说明、阶段设计、包化策略、迁移原则和历史取舍。

这个拆分不改变 sync、upgrade 或 state schema。`README.md` 会作为 `assets/docs/README.md` 打入 npm 包，供用户 Agent 从 `node_modules` 读取完整用户指南，但不会由 `sync` 自动覆盖用户项目根 README。`init --adopt` 仍可把 `README.md` 作为已有项目识别 marker；本仓库的重型设计内容不再占用用户阅读 README 的首屏。

## 4. 接口契约（Interface Contract）

| 接口（Interface） | 方法/事件（Method/Event） | 请求（Request） | 响应（Response） | 错误（Errors） |
|---|---|---|---|---|
| `sdlc-harness init` | CLI command | `--force?`、`--harness-folder?`、cwd；无显式目录时交互选择 Agent | 创建新项目 Harness 骨架并执行 `sync` | 非空冲突、权限不足、未知 Agent 选择 |
| `sdlc-harness init --adopt` | CLI command | `--harness-folder?`、cwd；无显式目录时交互选择 Agent | 最小接入已有项目，执行安全诊断 | 发现高风险覆盖时停止 |
| `sdlc-harness sync` | CLI command | `<harnessRoot>/config.yaml`、包内 assets、`<harnessRoot>/pjsdlc_managed/override_skills/*.md` | materialized files、sync report；Skill 输出包含本地追加 override | managed marker 缺失、未知 Skill override、local override 冲突、never overwrite 命中 |
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
  - path: "<harnessRoot>/pjsdlc_managed/templates"
    strategy: "managed"
  - path: "<harnessRoot>/pjsdlc_managed/policies"
    strategy: "merge-with-local"
  - path: "<harnessRoot>/pjsdlc_managed/make/sdlc-harness.mk"
    strategy: "managed"
  - path: ".github/workflows/harness.yml"
    strategy: "create-if-missing"

local_overrides:
  - "<harnessRoot>/pjsdlc_managed/override_skills/*.md"
  - "<harnessRoot>/pjsdlc_managed/policies/*.local.yaml"

never_overwrite:
  - ".docs/**"
  - "<harnessRoot>/state/**"
  - "src/**"
  - "tests/**"
```

### 5.2 Skill local overrides

`<harnessRoot>/pjsdlc_managed/override_skills/<skill_name>.md` 是项目本地补充提示词事实源。v1 只支持追加覆盖，不支持整段替换 managed Skill，也不支持结构化 patch。override 文件可以是普通追加片段，也可以是带 `name` 和 `description` frontmatter 的完整 `SKILL.md` extension。

```txt
<harnessRoot>/pjsdlc_managed/override_skills/pjsdlc_dev_sprint.md
-> sdlc-harness sync
-> <harnessRoot>/skills/pjsdlc_dev_sprint/SKILL.md
   = package base Skill + merged override description + Local Override block
```

约束：

- `<skill_name>` 必须匹配包内已有 workflow Skill 目录，例如 `pjsdlc_pm_prd` 或 `pjsdlc_dev_sprint`。
- 如果 override 是完整 `SKILL.md`，frontmatter `name` 必须等于 `<skill_name>`；`description` 会合并进最终 Skill metadata，override frontmatter 不会作为正文重复出现。
- 空 override 文件不生成追加区块。
- 未知或嵌套 override 路径会阻塞 sync，避免用户以为本地提示词已经生效。
- 合并后的 `Local Override` 区块提示用户或用户的 Agent 检查 package base 与 local override 是否存在语义冲突；该检查不阻塞 sync。
- override 生效时机是运行 `sync` 之后；`upgrade` 自动执行 `sync`，因此升级后会重新合成本地 override。
- legacy `<harnessRoot>/overrides/skills` 如果存在，upgrade migration 会在目标缺失时移动到 `<harnessRoot>/pjsdlc_managed/override_skills`。

### 5.3 managed metadata

```txt
<!-- pjsdlc:sdlc-harness-managed
source: agent-project-sdlc
version: 0.1.0
kind: skill
name: pjsdlc_pm_prd
checksum: sha256:...
-->
```

### 5.4 Source sync manifest

```yaml
source_mappings:
  - source: "AGENTS.md"
    target: "packages/sdlc-harness/assets/agents/AGENTS_CORE.md"
    mode: "extract-managed-block"
  - source: ".codex/skills"
    target: "packages/sdlc-harness/assets/skills"
    mode: "copy-tree"
    exclude:
      - "authoring/**"
  - source: ".codex/pjsdlc_managed/templates"
    target: "packages/sdlc-harness/assets/templates"
    mode: "copy-tree"
  - source: ".codex/pjsdlc_managed/policies"
    target: "packages/sdlc-harness/assets/policies"
    mode: "copy-tree"
  - source: ".codex/pjsdlc_managed/make/sdlc-harness.mk"
    target: "packages/sdlc-harness/assets/make/sdlc-harness.mk"
    mode: "copy-file"
  - source: ".github/workflows/harness.yml"
    target: "packages/sdlc-harness/assets/github/harness.yml"
    mode: "copy-file"
```

### 5.5 Plan state 与 open task contract

`<harnessRoot>/state/plan.yaml` 是当前 sprint/阶段的短期执行计划事实源。它只保留当前和未来相关任务：`pending`、`in_progress`、`blocked`、`pending_revision`。done/cancelled task 不长期留在 `plan.yaml`，避免历史现场挤占 Agent 对当前任务的注意力。

`next_task_sequence` 负责在删除历史 task 后继续分配后续 `DEV-*` id。典型 open task 结构：

```yaml
current_phase: "SPRINTING"
current_task_id: "DEV-011"
next_task_sequence: 12
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
    implementation_doc: ".docs/04_implementation/harness_workflow/state_and_task_protocol.md"
```

task 完成后，先在当前 task 仍位于 `plan.yaml` 时创建 task implementation commit；再将该 task 从 `plan.yaml` 的 `tasks` 列表移除，并创建 task completion ledger commit。历史动作记录由 git commit 承载，产物结果由模块级 implementation doc 承载；Harness 不再维护 checkpoint 文件或 `<harnessRoot>/archive/**` 作为常规归档事实源。

默认不追溯 done task 的执行流水。历史 task 查询主要面向“做了什么、为什么做、影响哪个模块、验证了什么”，默认读取模块级 implementation doc、RFC、PRD、tech plan 和代码。task id 和 commit 只作为 provenance；`allowed_paths`、`required_gates`、临时 `working_notes` 是执行期约束，不作为历史查询 API；只有用户明确要求 forensic/audit/regression 追溯时，Agent 才临时查询 git、PR、CI 或 release 记录。

#### Optional parallel_execution contract

`parallel_execution` 是 `plan.yaml` 的可选顶层合同。缺省不存在表示串行 workflow；只有用户明确提出并行、多 agent 或多 worktree 时，Agent 才能创建该合同。

```yaml
parallel_execution:
  enabled: true
  trigger: "user_requested"
  mode: "user_orchestrated" # or "runtime_managed"
  phase: "SPRINTING"
  coordinator: "main_agent"
  linked_task_id: "DEV-011"
  workers:
    - id: "worker-feature"
      writes_repo: true
      branch: "agent/feature"
      worktree: "../project-feature"
      owned_paths:
        - "src/feature/**"
      forbidden_paths:
        - "<harnessRoot>/state/**"
        - ".docs/INDEX.md"
      expected_output:
        - "implementation branch and focused gate evidence"
      required_gates:
        - "npm test -- tests/feature"
  integration:
    owner: "main_agent"
    merge_strategy: "main agent reviews worker output, merges or cherry-picks, then runs total gates"
    required_gates:
      - "make validate-current"
    fact_source_updates:
      - ".docs/04_implementation/"
```

模式语义：

- `runtime_managed`：当前 Agent runtime 真实具备 subagent 能力时使用。主 Agent 生成合同、分配 worker、等待结果并集成。
- `user_orchestrated`：runtime 不能自动创建 subagent 时使用。主 Agent 生成每个 worker 的可复制 prompt，用户手动打开对话或 worktree 后粘贴执行。

阶段规则：

- `REQUIREMENT_GATHERING`：worker 只能做调研、草稿、场景拆解、风险和 open questions；最终 PRD 由主 Agent 合成。
- `SPRINTING`：worker 可写各自 `owned_paths`，但不得直接改 `plan.yaml`、`lifecycle.yaml`、`.docs/INDEX.md`、overview 或最终 implementation doc；并行合同必须通过 `linked_task_id` 绑定当前 `current_task_id`。
- `TESTING`：worker 可并行执行验证片区和提交证据；最终 test plan、coverage gaps 和 PASS/BLOCKED 由主 Agent 汇总。

Validator 行为：

- 无 `parallel_execution` 时保持兼容。
- 启用时校验 `enabled`、`trigger`、`mode`、`phase`、`coordinator`、`workers` 和 `integration`。
- `writes_repo: true` 的 worker 必须声明 `branch`、`worktree` 和非空 `owned_paths`。
- `SPRINTING` 的 `linked_task_id` 必须等于 `current_task_id`。

### 5.6 Implementation doc model

`.docs/04_implementation/` 是最终实现产物的事实层，默认与 architecture / tech plan 中的模块、子系统或核心数据流边界对应。`plan.yaml.tasks[].implementation_doc` 指向本 task 会更新或新增的长期实现事实文档；多个 task 可以指向同一份 implementation doc。

task id、commit、RFC 和 gate 结果记录在 implementation doc 的 provenance / Change Log / Verification 中。task 不再默认生成独立 `dev_*.md` 文档；历史 `dev_*.md` task log 已在 DEV-043 合并进模块级 implementation docs，并从活跃实现文档图中移除。

### 5.7 Gate evidence

RFC_014 后，Harness 不再维护 `<harnessRoot>/state/gate_results.log`。gate evidence 属于当前 task 验证过程：执行中可写入 open task 的 `working_notes`，完成后写入 implementation doc 的 `Verification`。CI 系统、release 系统或外部审计系统可以作为长期 gate 记录。

`tools/run_current_gate.py` 只负责运行当前 phase gate 并输出结果，不写 state。completion ledger commit 只移除当前 task，不再清理 gate log。

历史 task 查询同样不依赖 open task execution contract。`allowed_paths`、`required_gates`、临时 `working_notes` 是执行期约束，不作为历史查询 API；需要理解过去产物时，读取模块级 implementation doc、RFC、PRD、tech plan 和代码。

### 5.8 Active state 不保存执行历史

`<harnessRoot>/state/lifecycle.yaml` 只保存当前路由状态，不保存 `history`。阶段流转历史、task 执行历史和 gate 历史都不属于 active state；它们是 cold archive，只在显式追溯、audit 或 regression forensic 场景下通过 git、PR、CI、release 系统和阶段产物读取。

`transition.py` 只更新 `current_phase`、`active_role`、`active_skill`、`suspended_phase` 和 `allowed_next_phases`。`--reason` 保留为命令兼容参数，但不写入 state。package migration 会删除既有 lifecycle `history`，避免老项目升级后继续携带阶段流水。

### 5.9 npm release automation

`tools/release_npm.mjs` 负责本仓库的 npm 发布自动化。默认模式只准备发布并生成 release doc；真正发布必须显式传入 `--publish --yes`。

典型命令：

```sh
npm run release:npm -- --version patch --publish --yes
```

脚本职责：

```txt
resolve next version from local package and npm registry
-> npm version --workspace agent-project-sdlc --no-git-tag-version
-> npm test
-> package check-source
-> npm pack --dry-run --json
-> npm publish
-> npm view latest verification
-> temporary consumer install smoke
-> write .docs/08_release/vX.Y.Z_npm_release.md
-> make docs-overview
-> make validate-harness
-> validate allowed paths when an open task exists
-> git diff --check
```

git commit、tag 和 push 仍由 SPRINTING task protocol 负责，避免 release script 绕过 task implementation commit 和 completion ledger commit。

## 6. 任务拆分（Task Breakdown）

历史 task 拆分仍可通过 git commit、RFC 和 release docs 追溯；本节只保留模块级 implementation doc 路由，作为后续 task 的写入目标。

| 实现边界（Module / Flow） | 覆盖任务（Task provenance） | Implementation Doc |
|---|---|---|
| CLI distribution and lifecycle | `DEV-001`, `DEV-002`, `DEV-003`, `DEV-005`, `DEV-006`, `DEV-008`, `DEV-009`, `DEV-020`, `DEV-021`, `DEV-022`, `DEV-023`, `DEV-040`, `DEV-041` | `.docs/04_implementation/harness_package/cli_distribution_and_lifecycle.md` |
| Source sync and package assets | `DEV-001`, `DEV-004`, `DEV-006`, `DEV-012`, `DEV-013`, `DEV-021`, `DEV-022`, `DEV-023`, `DEV-027`, `DEV-037`, `DEV-038`, `DEV-039` | `.docs/04_implementation/harness_package/source_sync_and_assets.md` |
| Release automation | `DEV-033`, `DEV-035`, `DEV-042` | `.docs/04_implementation/harness_package/release_automation.md` |
| State and task protocol | `DEV-010`, `DEV-011`, `DEV-018`, `DEV-019`, `DEV-024`, `DEV-025`, `DEV-026`, `DEV-027`, `DEV-028` | `.docs/04_implementation/harness_workflow/state_and_task_protocol.md` |
| Skills, prompt routing and authoring | `DEV-014`, `DEV-016`, `DEV-017`, `DEV-021`, `DEV-023`, `DEV-029`, `DEV-036`, `DEV-037`, `DEV-038`, `DEV-039`, `DEV-040` | `.docs/04_implementation/harness_workflow/skills_prompt_and_authoring.md` |
| Docs overview and validation | `DEV-005`, `DEV-015`, `DEV-025`, `DEV-030`, `DEV-032` | `.docs/04_implementation/harness_workflow/docs_overview_and_validation.md` |
| Command intent model | `DEV-029` and follow-up workflow routing tasks | `.docs/04_implementation/harness_workflow/command_intent_model.md` |
| Implementation doc model | `DEV-032`, `DEV-043` | `.docs/04_implementation/harness_workflow/implementation_doc_model.md` |

## 7. 风险与缓解

| 风险（Risk） | 等级（Level） | 缓解措施（Mitigation） |
|---|---|---|
| 包源码与当前工作流内容漂移 | P0 | `package sync-source` 更新，`package check-source` 和 CI 强制检查 |
| 根 `Makefile` 与业务项目冲突 | P0 | 只插入 include，不整体覆盖 |
| `AGENTS.md` 与项目自定义规则冲突 | P0 | 使用 `pjsdlc:sdlc-harness:*` managed block，marker 外内容不改；旧 `sdlc-harness:*` marker 仅作为 migration 输入 |
| 生成的 Skill 不被 Agent 识别 | P0 | init 默认按目标 Agent 写入 `<harnessRoot>`，Skill 保持 `<harnessRoot>/skills/pjsdlc_<skill_name>/SKILL.md` hard file index；`AGENTS.md` 提供 Harness soft index，native skill 首轮水合由具体 Agent adapter 负责 |
| 用户直接修改 managed Skill 导致升级丢失 | P1 | 项目定制写入 `<harnessRoot>/pjsdlc_managed/override_skills/<skill_name>.md`，由 `sync` 追加合成到最终 `SKILL.md` |
| policy/template 事实源重复 | P1 | 工具只读取 `<harnessRoot>/pjsdlc_managed/policies/**` 和 `<harnessRoot>/pjsdlc_managed/templates/**`，删除 legacy mirror |
| npm 包 validators 运行环境不稳定 | P1 | validators 运行时使用 TypeScript/Node，不依赖 Python 运行时 |
| `plan.yaml` 过大导致 Agent 上下文膨胀 | P0 | plan 只保留当前和未来任务，done/cancelled task 完成后移出 plan |
| task/release 归档与 git 历史重复 | P1 | 删除 `<harnessRoot>/archive/**` 常规机制，动作记录以 git commit/tag 为准 |
| Agent 默认追溯 done task 导致上下文噪声 | P1 | 在 AGENTS、Skill 和 README 中声明过去 task 合同只是 cold archive，默认不读取 |
| 独立 gate state 与 task/module implementation doc 重复 | P1 | 删除 `gate_results.log`，gate evidence 进入 task notes、相关 implementation doc 或 CI/release 记录 |
| Agent 默认读取过去执行流水导致上下文噪声 | P0 | active state 不保存 `history`，历史执行信息仅在显式 forensic/audit 场景临时查询 |
| RFC 漏掉影响面 | P0 | RFC Skill 强制先列影响面清单，覆盖 docs/state/skills/policies/templates/tools/package assets/tests/migrations/generated artifacts |

## 8. 需要关注的方案偏移

- 如果当前仓库继续作为包源码仓库，`packages/sdlc-harness/assets/**` 不应手写，应由 `package sync-source` 从工作流源文件生成。
- RFC_003 调整后，`sdlc-harness init` 已从直接询问 Harness root 演进为先选择目标 Agent；默认 `Codex -> .codex`，`Other` 的空输入和配置兜底仍为 `.agent`。当前仓库作为 authoring workspace 使用 `.codex`。
- RFC_004 调整后，删除 `<harnessRoot>/archive/**` 常规归档，并把历史动作记录交给 git。
- RFC_005 调整后，checkpoint 文件被删除；`allowed_paths`、`required_gates` 和验收标准直接保存在 open task 的 `plan.yaml` 条目中。
- RFC_011 调整后，done/cancelled task 不再长期留在 `plan.yaml`。
- RFC_012 调整后，`lifecycle.yaml.history` 被移除，阶段流转历史不再写入 active state。
- RFC_014 调整后，`gate_results.log` 被删除，gate evidence 写入 task notes、implementation doc 或外部 CI/release 记录。
