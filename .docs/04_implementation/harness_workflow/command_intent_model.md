# Command Intent Model Implementation Doc

## 1. 关联信息

- Domain: `harness_workflow`
- Module / subsystem / core flow: natural language and command alias routing
- Updated by task: `DEV-034`
- Linked PRD: `.docs/01_product/npm_package_distribution.md` (`PRD-NPM-026`)
- Linked technical design: `.docs/03_tech_plan/harness_package_distribution.md`
- Linked RFC: none
- Linked commit: `DEV-034` implementation commit

## 2. 当前实现范围

- 新增（Added）:
  - 自然语言意图和 `/xxx` 宏指令别名作为同一组 workflow action 的双入口协议。
  - `/dev` 单任务开发闭环和 `/devloop` 连续开发循环语义。
  - `/plan`、`/goal` 与 Harness workflow 的配合边界说明。
- 修改（Changed）:
  - `AGENTS.md`、`README.md`、`PROJECT_SPEC.md` 的日常控制说明。
  - `pjsdlc_manager` 的路由规则。
  - `pjsdlc_dev_sprint` 的开发入口规则。
  - PRD 和技术方案中的 Natural Language Control 契约。
- 未覆盖（Not covered）:
  - 不实现 CLI 子命令 `/dev` 或 `/devloop`；它们是 Agent 对话层宏指令，不是 `sdlc-harness` binary 参数。
  - 不自动开启 Codex 原生 `/plan` 或 `/goal` 模式。

## 3. 真实代码结构

| 文件（File） | 作用（Purpose） | 关键函数/对象（Key Functions/Objects） |
|---|---|---|
| `AGENTS.md` | Agent 入口协议 | 自然语言与宏指令、`/dev`、`/devloop` |
| `README.md` | 用户视角日常使用说明 | 常用快捷入口表 |
| `PROJECT_SPEC.md` | 完整工作流规格 | 宏指令协议、Codex 适配方式 |
| `.agent/skills/pjsdlc_manager/SKILL.md` | 意图路由 Skill | 自然语言到 workflow action 的映射规则 |
| `.agent/skills/pjsdlc_dev_sprint/SKILL.md` | 开发阶段执行 Skill | `/dev` 与 `/devloop` 的执行边界 |
| `packages/sdlc-harness/assets/**` | npm 包 canonical assets | 由 `package sync-source` 同步 |
| `.docs/01_product/npm_package_distribution.md` | 产品需求 | `PRD-NPM-026` |
| `.docs/03_tech_plan/harness_package_distribution.md` | 技术方案 | Natural Language Control |

## 4. 核心数据流

```txt
User input
-> Manager reads lifecycle.yaml and plan.yaml
-> Natural language or /xxx alias maps to workflow action
-> Stage Skill executes the action
-> Gates and docs update
-> Commit/push protocol records durable history
```

## 5. 关键实现逻辑

- 输入校验（Input validation）: manager 在路由前必须读取 lifecycle 和 plan；如果当前阶段与用户意图冲突，先说明冲突和推荐路径。
- 核心分支（Core branches）: `/dev` 执行一个最小 DEV task 后停止；`/devloop` 每完成一个 task 后重新读取当前状态，再决定是否继续。
- 异常处理（Error handling）: 需求、架构、allowed_paths、gate、commit/push 不清或失败时停止并报告 blocker。
- 边界兜底（Boundary fallback）: `/plan` 和 `/goal` 属于 Codex 客户端模式，Harness 只说明组合方式，不把它们当作可配置 state。
- 性能或并发注意事项（Performance or concurrency notes）: `/devloop` 每轮重新读取状态，避免连续执行时使用过期 plan 或远端状态。

## 6. 与技术方案的偏移

- 无 runtime 代码偏移；该变更只调整 Agent 行为契约和 package assets。

## 7. 测试覆盖（Test Coverage）

| 测试（Test） | 覆盖范围（Coverage） | 结果（Result） |
|---|---|---|
| `node packages/sdlc-harness/dist/cli.js package check-source` | package canonical assets 与 source workspace 一致 | PASS |
| `make validate-harness` | Harness scaffold、prompt language、doc overview、implementation doc index | PASS |
| `python3 tools/validate_allowed_paths.py` | DEV-034 修改范围符合 allowed_paths | PASS |
| `git diff --check` | Markdown/YAML trailing whitespace 和 patch 格式 | PASS |

## 8. 变更记录（Change Log）

| 日期（Date） | Task ID | Commit | 摘要（Summary） |
|---|---|---|---|
| 2026-05-25 | `DEV-034` | `DEV-034` implementation commit | 增加自然语言/指令别名双入口和 `/dev`、`/devloop` 开发入口。 |

## 9. 后续维护注意事项

- 后续新增阶段快捷入口时，应同时补自然语言表达和 `/xxx` 别名，保持双入口等价。
- 如果未来实现真实 CLI command，需明确区分 Agent 对话宏指令和 `sdlc-harness` binary 子命令。
