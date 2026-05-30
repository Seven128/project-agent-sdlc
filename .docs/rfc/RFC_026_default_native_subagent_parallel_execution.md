# RFC_026: Default Codex native subagent parallel execution

## 1. 背景

当前 Harness 已有 `parallel_execution` 协作合同，但 `RFC_015` 将其定义为显式 opt-in：只有用户明确提出“并行 / 多 agent / 多 worktree”时才启用。用户现在希望工作流默认采用 Codex 原生 subagent 能力：每个阶段开始时由主 Agent 自动评估当前任务是否适合并行，适合则明确调度 Codex native subagents，不适合则保持串行并记录原因。

Codex native subagent 是底层 runtime 能力；Harness 不重新实现 agent 调度器，而是在其上提供阶段治理、worker 边界、路径锁、事实源所有权和 gate 集成规则。

## 2. 变更内容（Change Content）

- Added:
  - 新增默认并行策略：阶段 task 开始时执行 `parallel eligibility check`，安全可拆时使用 Codex native subagents。
  - 新增 `parallel_execution.trigger: "workflow_default"`，表示由工作流规则默认触发；保留 `user_requested` 表示用户显式要求。
  - 新增 `parallel_execution.runtime.provider: "codex_native_subagents"` 作为默认 runtime provider。
  - 新增 native-plus-path-lock 隔离规则：写入 worker 使用 disjoint `owned_paths`，主 Agent 负责最终事实源、总 gate 和集成。
  - 扩展并行策略到 `REQUIREMENT_GATHERING`、`ARCHITECTING`、`SPRINTING`、`REVIEWING`、`TESTING`、`RELEASING` 和 `RFC_RECALIBRATION`，其中发布阶段只允许 read-only preflight。
- Changed:
  - `parallel_execution` 从“用户显式要求才可能创建”改为“工作流默认评估，适合时创建”；无并行任务时仍不要求 plan 常驻空合同。
  - `runtime_managed` 默认指 Codex native subagents；`user_orchestrated` 和 `codex_exec_worktree` 是 fallback / 强隔离方案。
  - validators、Skills、README、package README、PLAN template、PRD、tech plan、PROJECT_SPEC、implementation docs 和 package assets 需要同步更新。
- Removed:
  - 移除“默认 workflow 不启用并行”和“Harness v1 不承诺 CLI 自动启动 Codex agent”作为当前产品约束。
- Unchanged:
  - 主 Agent 仍是 coordinator 和 integration owner。
  - `parallel_execution` 不保存 `phase` 或 `linked_task_id`；当前阶段仍来自 `lifecycle.yaml`，当前 task 仍来自 `plan.yaml#current_task_id`。
  - SPRINTING 仍保持一个 open task、implementation commit 和 completion ledger commit 的闭环。

## 3. Product Impact（产品影响）

| 受影响 PRD（Affected PRD） | 影响（Impact） |
|---|---|
| `.docs/01_product/npm_package_distribution.md` | `PRD-NPM-028` 从显式 opt-in 并行合同升级为默认自动评估并行调度；新增 workflow_default、native provider、路径锁和全阶段策略验收标准。 |
| `README.md` / `packages/sdlc-harness/README.md` / `PROJECT_SPEC.md` | 对外能力说明需要从“默认串行”改为“默认评估并行，Codex native subagents 优先，fallback 到手动或 worktree”。 |

## 4. Technical Impact Candidates（技术影响候选）

| 模块（Module） | 影响（Impact） | 置信度（Confidence） |
|---|---|---|
| Skills and AGENTS routing | Manager 及各阶段 Skill 需要默认执行 parallel eligibility check，并在安全可拆时明确调度 Codex native subagents。 | high |
| State and plan contract | `parallel_execution.trigger` 接受 `workflow_default`；新增 `runtime.provider`；合同仍只在实际启用并行时写入。 | high |
| Validators | Python / TypeScript validators 需要接受新 trigger/provider、扩展阶段范围、校验 SPRINTING `owned_paths` 属于当前 task `allowed_paths` 且 worker 间不重叠。 | high |
| Templates and package assets | `PLAN_TEMPLATE.yaml`、managed Skills、AGENTS core、README asset 需要通过 source sync 分发。 | high |
| Tests and consumer lab | Validator tests、upgrade/static consumer lab checks 需要覆盖 `workflow_default`、native provider、旧合同兼容和路径锁失败场景。 | high |
| Release automation | 不改变 publish/tag/push runtime；RELEASING 并行只允许 read-only preflight。 | medium |

## 5. Acceptance Criteria

- [x] 阶段 Skill 明确要求主 Agent 默认执行 parallel eligibility check。
- [x] 安全可拆的阶段 task 使用 `parallel_execution.trigger: "workflow_default"` 和 `runtime.provider: "codex_native_subagents"`。
- [x] 用户显式要求并行时仍可使用 `trigger: "user_requested"`。
- [x] Codex native subagent 不可用或需要人工编排时，降级为 `user_orchestrated`。
- [x] 高风险写入或用户要求强隔离时，可使用 `codex_exec_worktree` fallback，但第一版不新增 `sdlc-harness parallel run` CLI。
- [x] SPRINTING 写入 worker 的 `owned_paths` 必须非空、互不重叠、属于当前 task `allowed_paths`，并禁止修改主事实源。
- [x] 全阶段策略已记录：PRD / ARCHITECTING / REVIEWING / RFC workers 产出草稿或分析，SPRINTING / TESTING 可做 scoped changes，RELEASING 只做 read-only preflight。
- [x] 无 `parallel_execution` 的旧 plan 继续合法；旧 `user_requested` 合同继续合法。

## 6. Regression Requirements（回归要求）

- [x] `npm test --workspace agent-project-sdlc`
- [x] `node packages/sdlc-harness/dist/cli.js package sync-source`
- [x] `node packages/sdlc-harness/dist/cli.js package check-source`
- [x] `make docs-overview`
- [x] `make validate-harness`
- [x] `make validate-rfc`
- [x] `make validate-dev`

## 7. Test Fact Source Impact（测试事实源影响）

- Reviewed test docs: `.docs/07_test/TEST_REPORT.md`, `.docs/07_test/harness_consumer_lab.md`
- Superseded test docs: none
- Retained test docs: `.docs/07_test/TEST_REPORT.md`, `.docs/07_test/harness_consumer_lab.md`
- Reason: 本 RFC 改变 workflow 调度协议和 validator 行为，不替换当前 TESTING 阶段事实源；需要在 package regression 和 consumer lab static checks 中新增默认并行合同覆盖。

## 8. Development Self-Test Impact（开发自测影响）

- Entry/exit impact: workflow entry 从各阶段 Skill 的串行默认入口扩展为默认执行 parallel eligibility check；validator 入口 `npx sdlc-harness validate-plan` / `validate-dev` 需要识别新并行合同。
- Runtime / target environment impact: 默认 runtime provider 为 Codex native subagents；Harness 仅治理调度合同，不新增外部服务依赖。
- Required gates impact: 实现 task 需要 package tests、source sync/check、docs overview、Harness validation、RFC validation 和 direct dev validation。
- Tech plan self-test contract impact: 技术方案需描述 `workflow_default`、native provider、fallback provider、路径锁和全阶段策略。
- `plan.yaml` / `plan.draft.yaml` task contract impact: 后续 SPRINTING task 需要声明新 validator、prompt、template 和 docs 更新的自测合同；`plan.draft.yaml` 不受影响。
- Implementation doc self-test report impact: implementation doc 需要记录新 trigger/provider、阶段覆盖、路径锁校验、旧合同兼容和 executed gates。
- Module key test path impact: 从 `npm test --workspace agent-project-sdlc` 启动 package regression，覆盖 validator schema、path-lock cases、source-sync assets 和 consumer lab static checks；随后运行 source sync/check、docs overview、validate-harness、validate-rfc、validate-dev 完成模块关键测试路径。
- Review / Testing handoff impact: Review/Testing 应检查主 Agent 仍拥有最终事实源、RELEASING 只读限制、SPRINTING 两段提交不被并行 worker 绕过。

## 9. Status

- Status: APPLIED
