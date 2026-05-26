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
