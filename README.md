# AI SDLC Harness

AI SDLC Harness 是一套面向 AI coding agent 的软件交付工作流。它把需求、产品方案、架构、技术方案、开发、Review、测试、发布和 RFC 变更串成一条可验证的项目事实链。

这个仓库同时是 npm 包 `agent-project-sdlc` 的源码仓库和参考工作区。更完整的产品/设计说明见 [PROJECT_SPEC.md](PROJECT_SPEC.md)。

## 适合谁

- 你希望 AI agent 不只是“直接写代码”，而是按需求、方案、实现、验证、发布的链路推进。
- 你希望项目状态、执行计划、阶段产物和验证证据都落在仓库里。
- 你希望用户用自然语言说“继续”“开始开发”“跑测试”“需求变了”，而不是记一堆 workflow 命令。

## 安装

在业务项目中安装：

```sh
npm install -D agent-project-sdlc
```

然后初始化：

```sh
npx sdlc-harness init
```

`init` 会先询问目标 Agent。直接回车选择默认 `Codex`，并把 Harness 配置写到 `.codex`。其它内置选项会写入对应目录，例如 `Claude Code -> .claude`、`Cursor -> .cursor`、`Cline -> .cline`、`Roo Code -> .roo`、`Gemini CLI -> .gemini`。选择 `Other` 时才会继续询问自定义文件夹名，此时直接回车默认 `.agent`。

如果已经确定目录，可以跳过交互：

```sh
npx sdlc-harness init --harness-folder .agent
```

已有项目中途接入：

```sh
npx sdlc-harness init --adopt
```

默认会生成或同步：

- `AGENTS.md`
- `<harnessRoot>/state/lifecycle.yaml`
- `<harnessRoot>/state/plan.yaml`
- `<harnessRoot>/skills/**`
- `<harnessRoot>/pjsdlc_managed/**`
- `.docs/**`
- `Makefile` harness include block

## 对外能力一览

`agent-project-sdlc` 对外提供这些能力：

| 能力 | 入口 | 说明 |
|---|---|---|
| 新项目初始化 | `npx sdlc-harness init` | 选择目标 Agent，生成 Harness 根目录、状态文件、workflow skills、模板、策略、`.docs/**` 和 Makefile include |
| 已有项目接入 | `npx sdlc-harness init --adopt` | 非破坏性接入已有仓库，不覆盖业务代码和已有项目事实源 |
| 可配置 Harness 根目录 | `--harness-folder`、`package.json#sdlcHarness.harnessFolderName`、`sdlc-harness.config.json` | 支持 `.codex`、`.claude`、`.cursor`、`.cline`、`.roo`、`.gemini` 或自定义目录 |
| 同步 managed workflow 文件 | `npx sdlc-harness sync` | 从包内 canonical assets 物化 `AGENTS.md` managed block、workflow skills、templates、policies、Makefile 片段和 GitHub workflow |
| 升级已接入项目 | `npx sdlc-harness upgrade` | 执行迁移并自动 `sync`，保留 state、docs、业务代码和本地 override |
| 接入诊断 | `npx sdlc-harness doctor` | 检查 harness root、版本、schema、关键文件和 managed paths |
| 阶段 gate | `npx sdlc-harness validate-*`、`make validate-current`、`make validate-harness` | 校验需求、设计切片、开发、Review、测试、发布、RFC、Harness 骨架、提示词语言契约和 overview freshness |
| 生命周期工作流 | `lifecycle.yaml`、`plan.yaml`、`.docs/**` | 固定 REQUIREMENT_GATHERING、ARCHITECTING、SPRINTING、REVIEWING、TESTING、RELEASING、RFC_RECALIBRATION 等阶段事实链 |
| 阶段小任务管控 | `plan.yaml`、`make validate-plan` | 每个阶段的 Agent 主任务都应拆成足够小的 `TASK-*` open task，并用 `phase` 标明所属阶段 |
| 自然语言控制 | `AGENTS.md` + workflow skills | 用户可说“继续”“开始开发”“跑测试”“需求变了”等，由 Agent 映射到 `/next`、`/dev`、`/test`、RFC 等动作 |
| 可选并行执行合同 | `plan.yaml#parallel_execution` | 用户明确要求多 agent/并行/多 worktree 时启用；支持 runtime-managed subagents 或 user-orchestrated worker prompts |
| Workflow skills | `<harnessRoot>/skills/pjsdlc_*/SKILL.md` | 提供 PM、架构、开发、实现文档、Review、测试、发布、RFC 等阶段角色提示词 |
| 阶段角色提示词本地追加 | `<harnessRoot>/pjsdlc_managed/override_skills/<skill_name>.md` + `sync` | 用户不改 managed Skill，通过本地 override 追加项目规则，下一次 sync/upgrade 会重新合成 |
| 本地策略覆盖 | `<harnessRoot>/pjsdlc_managed/policies/*.local.yaml` | 保留项目自己的策略补充，不和包内默认策略混写 |
| Agent 可读用户指南 | `node_modules/agent-project-sdlc/assets/docs/README.md` | npm 包内附带本仓库根 README，方便用户 Agent 在安装包中读取完整工作流说明 |
| 文档 overview | `make docs-overview`、`make validate-doc-overviews` | 从 `.docs/**` facts 生成各阶段 overview，避免手写派生视图 |
| 包源码一致性检查 | `sdlc-harness package sync-source`、`sdlc-harness package check-source` | 供本仓库维护者同步和检查 package canonical assets，避免源码与发布内容漂移 |

## 日常使用

用户不需要记宏指令。直接用自然语言让 agent 推进即可；熟悉后也可以使用 `/xxx` 快捷入口。

`/xxx` 快捷入口代表一段更完整、更细节的工作流提示词；自然语言是低成本入口，也会映射到同类 workflow action，只是细节约束会更依赖 agent 根据上下文判断。

```text
现在到哪一步了？
继续推进。
我提供这些信息，帮我完善产品方案。
把这个长产品方案切成 slices。
根据 PRD 做技术方案。
把现有技术方案切片。
根据技术方案拆 task。
开始开发当前 task。
继续开发下一个任务。
开始循环：写任务，执行任务。
跑一下当前验证。
这个需求变了。
检查能不能进入下一阶段。
准备 review。
```

Agent 会读取 `<harnessRoot>/state/lifecycle.yaml` 和 `<harnessRoot>/state/plan.yaml`，再按当前阶段选择对应 workflow skill、产物和 gate。任何阶段的 Agent 主任务都不是一次性长生成：产品方案、技术方案、文档切片、基于上一阶段事实源生成、Review、测试、发布和 RFC 处理，都应先落成一个最小 `TASK-*` open task，并设置对应 `phase`；当前轮只执行一个 task，写入 `result_docs` 或 `implementation_doc`、更新索引和 overview，运行 `make validate-plan`，任务完成后再从 `plan.yaml` 移除。

通用规则是：任何阶段或工作流如果把 draft task promote 成 `plan.yaml` 中的正式 `TASK-*`，必须在同一次状态更新里从源 draft queue 删除该 draft；正式 task 的恢复现场只保存在 `plan.yaml`，完成历史由 implementation docs、git/PR/CI 记录承担。当前 Harness 内置的 draft queue 只有 `plan.draft.yaml.tasks[]`，它表示尚未采用的开发草案；`/devloop` 只有在 `plan.yaml.tasks[]` 和 `plan.draft.yaml.tasks[]` 都没有明确可执行任务时，才把开发队列视为耗尽。

技术方案阶段需要产出 `plan.draft.yaml`，是为了解决跨阶段交接和当前执行队列纯净性的冲突。`ARCHITECTING` 必须在进入开发前证明方案可以拆成具体、可验证的开发单元，包括修改范围、gate、implementation doc 和执行顺序；但这些未来开发 task 如果直接进入 `plan.yaml`，会和当前架构阶段 task 混在一起，让阶段 gate 无法区分“架构任务未完成”和“下一阶段任务已预拆”。因此开发任务先作为 draft 暂存，进入 `SPRINTING` 后再逐个 promote 成正式 `TASK-*`。其它阶段默认根据上一阶段已经稳定的事实源即时创建当前阶段 task，只有当某个阶段也需要提前为后续阶段生成具体执行任务时，才应引入同类 draft queue。

在尚未进入开发前，`ARCHITECTING` 可以回到 `REQUIREMENT_GATHERING` 修改 PRD：Manager 使用 `python3 tools/transition.py --to REQUIREMENT_GATHERING` 切回 PM/PRD 工作流，完成 PRD task 和 `validate-pm` 后，再用 `python3 tools/transition.py --to ARCHITECTING` 回到设计阶段。进入 `SPRINTING` 后的需求变化仍走 RFC workflow。

`validate-design` 会把架构阶段的语义切片作为硬 gate：`overview.md` 不计入 deliverables，`plan.draft.yaml` 中每个开发 draft task 必须通过 `docs.tech_plan` 指向存在的 tech plan slice；多个开发 draft task 默认需要不同 primary tech plan slice。PRD、tech plan 或 draft task 明确出现 AI provider / copilot、外部系统边界、合规 / 权限 / 审计等横切主题时，也需要对应的专门 architecture slice。

### ADR 与 Memory 的边界

`.docs/05_decisions/` 保存 ADR（Architecture Decision Record）。ADR 是软件工程中常见的架构决策记录实践，用来回答“为什么当时选择这个方案，而不是别的方案”。architecture / tech plan 可以写当前方案里的局部设计理由；如果一个决定有备选方案、影响多个模块或阶段、未来容易被质疑，或修改成本高，就应写成 ADR，记录背景、备选方案、理由、后果和替代关系。

`<harnessRoot>/state/memory.md` 只做跨阶段快捷提示和导航，回答“下次进来要先记住什么、去哪里找”。memory 可以链接到 ADR、PRD、tech plan 或 implementation doc；完整背景、备选方案、取舍和长期后果放在 `.docs/05_decisions/` ADR 或其它正式 `.docs/**` 事实源里。

### Workflow skill 如何生效

`<harnessRoot>/skills/<name>/SKILL.md` 是 Harness 的 workflow skill 事实源，也是稳定的 hard file index。它有两种使用方式：

- Harness soft index：`AGENTS.md` 要求 Agent 先读 lifecycle/plan，再按 `active_skill` 和 `phase_contracts.yaml` 读取对应 skill。
- Native skill adapter：如果某个 Agent 支持 native skill registry，可以把这些 workflow skills 同步或安装到该 Agent 的原生 skill root，让“产品方案”“技术方案”“开发循环”等自然语言在首轮就有机会命中。

只在 `AGENTS.md` 里声明 `<harnessRoot>/skills` 不等于 native skill 注册；它保证的是 Harness soft index。Native skill 是否首轮水合，取决于具体 Agent 客户端是否扫描这个目录，或是否使用了额外 adapter。

### 自定义阶段角色提示词

不要直接修改 `<harnessRoot>/skills/**/SKILL.md`，这些文件由 package 管理，`sync` 或 `upgrade` 会重新生成。

如果某个项目需要补充阶段角色要求，把本地 override 写到：

```txt
<harnessRoot>/pjsdlc_managed/override_skills/<skill_name>.md
```

例如：

```txt
.codex/pjsdlc_managed/override_skills/pjsdlc_dev_sprint.md
```

然后运行：

```sh
npx sdlc-harness sync
```

override 文件支持两种写法：普通项目追加片段，或带 `name`/`description` frontmatter 的完整 `SKILL.md`。如果写完整 Skill，`sync` 会校验 `name` 必须匹配 `<skill_name>`，把用户写的 `description` 合并进最终 `SKILL.md` 顶部 metadata，并把剥离 frontmatter 后的正文完整追加到 `Local Override` 区块。

`sync` 会把通用 Skill 和本地 override 合成到最终 `SKILL.md`。v1 只支持追加覆盖，不替换 package base Skill；`<skill_name>` 必须匹配已有 workflow Skill，例如 `pjsdlc_pm_prd`、`pjsdlc_architect_design` 或 `pjsdlc_dev_sprint`。合并后应由用户或用户的 Agent 检查 base Skill 与 local override 是否存在语义冲突，尤其是阶段边界、`allowed_paths`、`required_gates`、提交/发布规则和完成检查。

### 可选并行执行

默认 workflow 是串行的。只有用户明确说“并行”“多 agent”或“多 worktree”时，Agent 才能在 `plan.yaml` 创建 `parallel_execution` 合同。

- `runtime_managed`：当前 Agent runtime 支持创建 subagent 时，由主 Agent 分配 worker、等待结果、review、merge/cherry-pick 并跑总 gate。
- `user_orchestrated`：runtime 不能自动创建 subagent 时，主 Agent 生成每个 worker 的可复制 prompt；用户手动打开多个对话或 worktree 后粘贴执行。

`parallel_execution` 不保存当前阶段或当前任务副本；阶段只从 `lifecycle.yaml#current_phase` 读取，当前任务只从 `plan.yaml#current_task_id` 读取。

Harness CLI v1 不承诺自动启动 Codex agent，也不要求 worker 之间通信。worker 只处理自己的 `owned_paths` 和 gate，最终 PRD、plan、implementation doc、test result、overview 等事实源由主 Agent 集成。

常用快捷入口：

| 指令 | 简单自然语言 | 更完整的意图 |
|---|---|---|
| `/status` | 现在到哪一步了 | 读取 lifecycle/plan，报告当前阶段、任务、阻塞项和下一步 |
| `/next` | 继续推进 | 按当前阶段的 `active_skill` 执行下一步 |
| `/prd` | 完善产品方案 | 在需求阶段创建或选择一个最小 `TASK-*` task；如果当前仍在架构阶段且未进入开发，可先回到 `REQUIREMENT_GATHERING` 修改 PRD |
| `/design` | 设计技术方案 | 在架构阶段创建或选择一个最小 `TASK-*` task，生成或切分当前 architecture / tech plan / `plan.draft.yaml` 产物 |
| `/dev` | 做下一个任务 | 创建或选择下一个最小 `TASK-*` development task，完成一个 task 闭环后停止 |
| `/devloop` | 开始循环：写任务，执行任务 | 连续运行 `/dev`，直到 `plan.yaml` 和 `plan.draft.yaml` 都没有明确任务或遇到 blocker |
| `/test` | 跑一下当前验证 | 运行当前 task 或阶段对应 gate |
| `/review` | 准备 review | 进入只读 Review workflow |

`/plan` 和 `/goal` 是 Codex 客户端模式。可以手动组合使用，例如 `/plan /prd`、`/plan 我想完善产品方案`、`/goal /devloop` 或 `/goal 开始循环：写任务，执行任务`。

## 常用命令

检查接入状态：

```sh
npx sdlc-harness doctor
```

同步包内默认规则、workflow skills、模板和策略：

```sh
npx sdlc-harness sync
```

升级已接入项目：

```sh
npx sdlc-harness upgrade
```

运行当前阶段 gate：

```sh
make validate-current
```

校验当前 open task 合同：

```sh
make validate-plan
```

校验整个 Harness：

```sh
make validate-harness
```

刷新 Markdown overview 派生视图：

```sh
make docs-overview
```

## 工作流产物

| 路径 | 用途 |
|---|---|
| `<harnessRoot>/state/lifecycle.yaml` | 当前生命周期阶段和 active skill |
| `<harnessRoot>/state/plan.yaml` | 当前和未来 task 的短期执行计划 |
| `<harnessRoot>/state/memory.md` | 跨阶段稳定知识的摘要和正式事实源链接 |
| `.docs/01_product/` | PRD、用户场景、验收标准 |
| `.docs/02_architecture/` | 架构边界和高层设计 |
| `.docs/03_tech_plan/` | 技术方案、接口契约、任务拆分 |
| `.docs/04_implementation/` | 模块、子系统和核心数据流的真实实现事实 |
| `.docs/05_decisions/` | ADR，长期关键决策及其背景、备选方案、理由和后果 |
| `.docs/06_review/` | Review 报告 |
| `.docs/07_test/` | 测试计划和回归记录 |
| `.docs/08_release/` | 发布记录和回滚方案 |
| `.docs/rfc/` | 需求变更和影响分析 |

`overview.md` 是生成物，用于浏览和阶段交接；Markdown slices 和 `.docs/INDEX.md` 才是事实源。

## 开发本包

这个源码仓库自身使用 `package.json#sdlcHarness.harnessFolderName = ".codex"`，因此本地 Harness 状态、skills、templates 和 policies 位于 `.codex/**`。

安装依赖后运行：

```sh
npm test
```

当工作流源文件发生变化，同步 package canonical assets：

```sh
node packages/sdlc-harness/dist/cli.js package sync-source
node packages/sdlc-harness/dist/cli.js package check-source
```

更多设计背景、阶段契约、包化策略和历史取舍见 [PROJECT_SPEC.md](PROJECT_SPEC.md)。
