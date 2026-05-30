# Command Intent Model Implementation Doc

## 1. 关联信息

- Domain: `harness_workflow`
- Module / subsystem / core flow: natural language and command alias routing
- Updated by task: `DEV-034`, `DEV-036`, `DEV-043`, `DEV-050`, `TASK-057`, `TASK-061`
- Linked PRD: `.docs/01_product/npm_package_distribution.md` (`PRD-NPM-026`, `PRD-NPM-028`)
- Linked technical design: `.docs/03_tech_plan/harness_package_distribution.md`
- Linked RFC: `RFC_015`
- Linked commit: `DEV-034` implementation commit, `DEV-036` implementation commit, `DEV-050` implementation commit

## 2. 当前实现范围

- 新增（Added）:
  - 自然语言意图和 `/xxx` 宏指令别名作为同一组 workflow action 的双入口协议。
  - `/xxx` 宏指令作为更完整、更细节的提示词别名；简单自然语言作为低成本意图入口。
  - `/prd` 产品方案入口和 `/design` 架构/技术方案入口。
  - `/dev` 单任务开发闭环和 `/devloop` 连续开发循环语义。
  - `/review`、`/test`、`/release` 和 `/rfc` 也通过 `TASK-*` open task 做小步恢复和阶段 gate 管控。
  - `ARCHITECTING` 中的 `/prd` 或“需求要改”可以在开发前回到 `REQUIREMENT_GATHERING`，由 PM workflow 修改 PRD。
  - `/plan`、`/goal` 与 Harness workflow 的配合边界说明。
  - 每个阶段 task 默认映射到 parallel eligibility check；安全可拆时创建 `parallel_execution.trigger: "workflow_default"` 合同，用户显式要求并行、多 agent 或多 worktree 时使用 `trigger: "user_requested"`。
- 修改（Changed）:
  - `AGENTS.md`、`README.md`、`PROJECT_SPEC.md` 的日常控制说明。
  - `pjsdlc_manager` 的路由规则。
  - `pjsdlc_dev_sprint` 的开发入口规则。
  - PRD 和技术方案中的 Natural Language Control 契约。
- 未覆盖（Not covered）:
  - 不实现 CLI 子命令 `/prd`、`/design`、`/dev` 或 `/devloop`；它们是 Agent 对话层宏指令，不是 `sdlc-harness` binary 参数。
  - 不自动开启 Codex 原生 `/plan` 或 `/goal` 模式。

## Runnable Entry/Exit

- Entry points: Agent natural-language requests and `/status`, `/next`, `/advance`, `/prd`, `/design`, `/dev`, `/devloop`, `/review`, `/test`, `/release`, `/rfc` macro aliases.
- Exit / side effects: selected workflow Skill updates bounded facts, gates and commits according to the active lifecycle phase.
- Config contract: `.codex/state/lifecycle.yaml`, `.codex/state/plan.yaml`, `AGENTS.md` routing rules and `phase_contracts.yaml`.
- Fixture/live boundary: conversation-level routing protocol; no standalone product runtime or CLI endpoint is introduced.

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
- 核心分支（Core branches）: `/prd` 只在需求阶段推进产品方案；`/design` 只在架构阶段推进 architecture / tech plan；`/dev` 执行一个最小 `TASK-*` development task 后停止；`/review`、`/test`、`/release` 和 `/rfc` 也各执行一个最小 `TASK-*`；`/devloop` 每完成一个 task 后重新读取当前状态，再决定是否继续。
- 开发前 PRD 回退（Pre-development PRD rollback）: 如果当前阶段是 `ARCHITECTING`，用户要求改 PRD 或完善产品方案，Manager 可以先确认没有未收尾的 design task，然后用 `python3 tools/transition.py --to REQUIREMENT_GATHERING` 切回 PM workflow；进入 `SPRINTING` 后同类需求变化必须走 RFC。
- 异常处理（Error handling）: 需求、架构、allowed_paths、gate、commit/push 不清或失败时停止并报告 blocker。
- 边界兜底（Boundary fallback）: `/plan` 和 `/goal` 属于 Codex 客户端模式，Harness 只说明组合方式，不把它们当作可配置 state。
- 性能或并发注意事项（Performance or concurrency notes）: `/devloop` 每轮重新读取状态，避免连续执行时使用过期 plan 或远端状态。
- 并行语义（Parallel semantics）: 每个阶段 task 默认先做 parallel eligibility check；适合拆分时，Manager 创建 `parallel_execution.trigger: "workflow_default"` 并优先使用 `runtime.provider: "codex_native_subagents"`；用户显式提出并行时使用 `trigger: "user_requested"`；native subagent 不可用时降级为 `user_orchestrated`，高风险写入可选择 `codex_exec_worktree` fallback。

## 6. 与技术方案的偏移

- 无 runtime 代码偏移；该变更只调整 Agent 行为契约和 package assets。

## 7. 测试覆盖（Test Coverage）

| 测试（Test） | 覆盖范围（Coverage） | 结果（Result） |
|---|---|---|
| `node packages/sdlc-harness/dist/cli.js package check-source` | package canonical assets 与 source workspace 一致 | PASS |
| `make validate-harness` | Harness scaffold、skill language、doc overview、implementation doc index | PASS |
| `tests/sdlc-harness/transition.test.mjs` | ARCHITECTING 中 `/prd` 类需求可以回退到 PM 阶段，SPRINTING 不可直接回退 | PASS for TASK-061 |
| `python3 tools/validate_allowed_paths.py` | DEV-036 修改范围符合 allowed_paths | PASS |
| `git diff --check` | Markdown/YAML trailing whitespace 和 patch 格式 | PASS |

## 8. 变更记录（Change Log）

| 日期（Date） | Task ID | Commit | 摘要（Summary） |
|---|---|---|---|
| 2026-05-25 | `DEV-034` | `DEV-034` implementation commit | 增加自然语言/指令别名双入口和 `/dev`、`/devloop` 开发入口。 |
| 2026-05-26 | `DEV-043` | DEV-043 implementation commit | 将当前 workspace path 更新为 `.codex`，并纳入模块级 implementation doc 迁移。 |
| 2026-05-25 | `DEV-036` | `DEV-036` implementation commit | 澄清宏指令是详细提示词别名，并补齐 `/prd`、`/design` 阶段入口。 |
| 2026-05-27 | `DEV-050` | DEV-050 implementation commit | 增加显式 opt-in 的 parallel execution 意图路由和降级语义。 |
| 2026-05-30 | `TASK-084` | TASK-084 implementation commit | 将并行入口升级为默认 eligibility check，并记录 Codex native subagent 优先策略。 |
| 2026-05-27 | `TASK-057` | Working tree | 将 Review、测试、发布和 RFC 入口纳入统一 `TASK-*` 小任务路由语义。 |
| 2026-05-28 | `TASK-061` | Working tree | 增加开发前从 `ARCHITECTING` 回到 `REQUIREMENT_GATHERING` 的 `/prd` 和需求变化路由规则。 |

## 9. 后续维护注意事项

- 后续新增阶段快捷入口时，应同时补自然语言表达和 `/xxx` 详细提示词别名，保持双入口映射到同一 workflow action。
- 如果未来实现真实 CLI command，需明确区分 Agent 对话宏指令和 `sdlc-harness` binary 子命令。
