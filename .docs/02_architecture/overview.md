# .docs/02_architecture overview

<!-- generated-by: AI SDLC Harness build_doc_overviews.py -->
<!-- source-hash: bbe94f89421ac9fc -->

Generated artifact. Markdown slices remain the source of truth.

Source hash: `bbe94f89421ac9fc`

## Source Slices

1. [harness_package_distribution.md](harness_package_distribution.md)

---

## harness_package_distribution.md

Source: [harness_package_distribution.md](harness_package_distribution.md)

# Harness npm 包化分发架构

## 1. 关联产品需求

- PRD: `.docs/01_product/npm_package_distribution.md`
- Requirement IDs: `PRD-NPM-001` 至 `PRD-NPM-016`

## 2. 领域边界

AI SDLC Harness npm 包化后有三个明确边界：

| 边界 | 责任 | 不负责 |
|---|---|---|
| Source Authoring Workspace | 当前 `ProjectTemplate` 仓库中维护工作流事实源、参考实现和包源同步输入；`.agent/**` 是工作流配置 canonical root | 不保存业务项目状态 |
| npm Package Canonical Source | 发布 `agent-project-sdlc`，提供 CLI、默认 Skill、模板、策略、validators、migrations | 不直接作为 Agent 启动时唯一读取源 |
| Project Instance Workspace | 保存某个业务项目的 `.docs/**`、`<harnessRoot>/state/**`、local overrides 和业务代码 | 不直接 fork 通用 Harness 逻辑 |

核心原则：包是分发源，项目通过 CLI init 或 JSON 配置选择 Harness 根目录。CLI init 默认选择 `Codex -> .codex`，其它 Agent 使用内置映射目录；配置兜底值和 `Other` 的空输入默认值是 `.agent`。`<harnessRoot>/skills/**` 是 Skill fact source，`<harnessRoot>/state/**` 是项目状态事实源，`.docs/**` 是项目文档事实源。

## 3. 主要组件

| 组件 | 位置 | 职责 |
|---|---|---|
| CLI | `packages/sdlc-harness/src/cli.ts` | 暴露 `sdlc-harness` 命令入口 |
| Commands | `packages/sdlc-harness/src/commands/*` | 实现 `init`、`init --adopt`、`sync`、`upgrade`、`doctor`、`validate-*`、`package sync-source` |
| Canonical Assets | `packages/sdlc-harness/assets/**` | 保存包内默认 `AGENTS` block、Skill、templates、policies、Makefile include、workflow |
| Project Config | `<harnessRoot>/config.yaml` | 记录 `package`、`version`、`schema_version`、`managed_files`、`local_overrides`、`never_overwrite` |
| Sync Engine | 包内实现 | 根据 manifest 同步或合成工作区文件，处理 marker、checksum 和 local overrides |
| Migration Engine | 包内实现 | 在 `upgrade` 时迁移 schema 和受管理文件布局 |
| Source Sync | 包内实现 + CI | 当当前仓库的 Harness 源文件变化时，更新包内 canonical assets 并验证无漂移 |

## 4. 数据流

### 4.1 项目接入

```txt
npm install -D agent-project-sdlc
-> npx sdlc-harness init 或 init --adopt
-> 写入 <harnessRoot>/config.yaml
-> sync materialize agent-readable files
-> doctor 输出接入状态
```

### 4.2 已接入项目升级

```txt
npm update agent-project-sdlc
-> npx sdlc-harness upgrade
-> 读取 <harnessRoot>/config.yaml
-> 执行 migrations
-> 自动执行 sync
-> doctor / validate-harness
-> 输出升级报告
```

### 4.3 当前仓库工作流变更同步到包

```txt
修改 AGENTS.md / <harnessRoot>/skills / <harnessRoot>/pjsdlc_managed/templates / <harnessRoot>/pjsdlc_managed/policies / Makefile / workflow / validators
-> npx sdlc-harness package sync-source
-> 更新 packages/sdlc-harness/assets 或包内 validator 入口
-> npx sdlc-harness package check-source
-> CI 阻止 source workspace 与 package canonical source 漂移
```

## 5. Agent 可读性约束

多数 Agent 的 Skill 和规则路由依赖工作区固定路径。因此 init 先选择目标 Agent，将 Skill materialize 到该 Agent 对应的 `<harnessRoot>/skills/**/SKILL.md`，例如默认 `Codex -> .codex/skills/**/SKILL.md`。如果某个 Agent 并不会原生扫描该目录，`AGENTS.md` 仍通过 Harness soft index 要求读取 `<harnessRoot>/skills/**`；需要首轮 native skill 水合时，再由 Agent 适配层把这些 Skill 注册到对应 native skill root。npm 包中的 assets 只是分发源，不能替代工作区 materialized files。

## 6. 覆盖与冲突策略

| 路径 | 策略 | 原因 |
|---|---|---|
| `AGENTS.md` | `merge-block` | 保留项目自定义规则，只更新 `sdlc-harness` marker 内文本 |
| `Makefile` | `include` | 根 `Makefile` 常包含业务命令，不整体覆盖 |
| `<harnessRoot>/skills/**/SKILL.md` | `managed` | Skill 属于 Harness 配置 canonical root |
| `<harnessRoot>/pjsdlc_managed/templates/**` | `managed` | 模板来自包内 canonical source |
| `<harnessRoot>/pjsdlc_managed/policies/*.yaml` | `merge-with-local` | 默认策略可升级，项目差异放 `.local.yaml` |
| `<harnessRoot>/config.yaml` | `project-owned-with-managed-version` | 项目拥有，但 CLI 更新版本和 schema 字段 |
| `.docs/**` | `never-overwrite` | 项目事实源 |
| `<harnessRoot>/state/**` | `never-overwrite` | 项目状态事实源 |
| `src/**`、`tests/**` | `never-overwrite` | 业务代码 |

## 7. 风险与缓解

| 风险 | 等级 | 缓解措施 |
|---|---|---|
| `AGENTS.md` 或 `Makefile` 被整体覆盖 | P0 | 只使用 managed block / include，并在 sync 前做 checksum 和 diff 检查 |
| 包内 canonical assets 与当前仓库参考实现漂移 | P0 | 提供 `package sync-source` 和 `package check-source`，CI 强制检查 |
| Agent 无法读取包内 Skill | P0 | init 将 Skill materialize 到选定 `<harnessRoot>/skills/**/SKILL.md`；`AGENTS.md` 提供 soft index，native skill 首轮水合由具体 Agent adapter 负责 |
| validators 运行环境不一致 | P1 | validators 运行时使用 TypeScript/Node，避免 npm 包依赖 Python 运行时 |
| 已有项目接入误改业务文件 | P0 | `init --adopt` 默认只创建 Harness 入口，业务文件需用户显式确认才修改 |
