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

## 日常使用

用户不需要记宏指令。直接用自然语言让 agent 推进即可；熟悉后也可以使用 `/xxx` 快捷入口。

`/xxx` 快捷入口代表一段更完整、更细节的工作流提示词；自然语言是低成本入口，也会映射到同类 workflow action，只是细节约束会更依赖 agent 根据上下文判断。

```text
现在到哪一步了？
继续推进。
我提供这些信息，帮我完善产品方案。
根据 PRD 做技术方案。
根据技术方案拆 task。
开始开发当前 task。
继续开发下一个任务。
开始循环：写任务，执行任务。
跑一下当前验证。
这个需求变了。
检查能不能进入下一阶段。
准备 review。
```

Agent 会读取 `<harnessRoot>/state/lifecycle.yaml` 和 `<harnessRoot>/state/plan.yaml`，再按当前阶段选择对应 workflow skill、产物和 gate。

### Workflow skill 如何生效

`<harnessRoot>/skills/<name>/SKILL.md` 是 Harness 的 workflow skill 事实源，也是稳定的 hard file index。它有两种使用方式：

- Harness soft index：`AGENTS.md` 要求 Agent 先读 lifecycle/plan，再按 `active_skill` 和 `phase_contracts.yaml` 读取对应 skill。
- Native skill adapter：如果某个 Agent 支持 native skill registry，可以把这些 workflow skills 同步或安装到该 Agent 的原生 skill root，让“产品方案”“技术方案”“开发循环”等自然语言在首轮就有机会命中。

只在 `AGENTS.md` 里声明 `<harnessRoot>/skills` 不等于 native skill 注册；它保证的是 Harness soft index。Native skill 是否首轮水合，取决于具体 Agent 客户端是否扫描这个目录，或是否使用了额外 adapter。

常用快捷入口：

| 指令 | 简单自然语言 | 更完整的意图 |
|---|---|---|
| `/status` | 现在到哪一步了 | 读取 lifecycle/plan，报告当前阶段、任务、阻塞项和下一步 |
| `/next` | 继续推进 | 按当前阶段的 `active_skill` 执行下一步 |
| `/prd` | 完善产品方案 | 在需求阶段澄清用户目标、补齐 PRD、验收标准和 open questions |
| `/design` | 设计技术方案 | 在架构阶段基于 PRD 生成或更新架构、技术方案和 `plan.draft.yaml` |
| `/dev` | 做下一个任务 | 创建或选择下一个最小 DEV task，完成一个 task 闭环后停止 |
| `/devloop` | 开始循环：写任务，执行任务 | 连续运行 `/dev`，直到没有明确任务或遇到 blocker |
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
| `.docs/01_product/` | PRD、用户场景、验收标准 |
| `.docs/02_architecture/` | 架构边界和高层设计 |
| `.docs/03_tech_plan/` | 技术方案、接口契约、任务拆分 |
| `.docs/04_implementation/` | 模块、子系统和核心数据流的真实实现事实 |
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
