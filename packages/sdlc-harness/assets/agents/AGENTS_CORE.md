# AI SDLC Harness Protocol

本仓库使用 AI SDLC Harness 工作流。开始任何工作前，把 `.agent/` 和 `.docs/`
视为项目事实源。

## 事实源

- 生命周期状态：`.agent/state/lifecycle.yaml`
- 执行计划：`.agent/state/plan.yaml`
- 计划草案：`.agent/state/plan.draft.yaml`
- 项目长期记忆：`.agent/state/memory.md`
- 产品文档：`.docs/01_product/`
- 架构文档：`.docs/02_architecture/`
- 技术方案：`.docs/03_tech_plan/`
- 实现文档：`.docs/04_implementation/`
- Review 文档：`.docs/06_review/`
- 测试文档：`.docs/07_test/`
- 发布文档：`.docs/08_release/`
- RFC 文档：`.docs/rfc/`
- 全局文档索引：`.docs/INDEX.md`

## 派生视图

- 每个 `.docs/<stage>/overview.md` 是对应阶段 Markdown slices 的 generated artifact。
- Markdown slices 和 `.docs/INDEX.md` 才是事实源，`overview.md` 只用于人类浏览和阶段交接。
- 不要手写或局部编辑 `overview.md`。
- 任意 `.docs/<stage>/**/*.md` 发生新增、修改、拆分、合并或废弃后，运行 `make docs-overview`。
- 提交或阶段交付前，运行 `make validate-doc-overviews` 或 `make validate-harness` 确认 Markdown 总览未过期。

## Plan Protocol

- `plan.yaml` 是当前和未来任务的短期执行计划事实源。open task 直接包含 `allowed_paths`、`required_gates`、`acceptance_criteria` 和必要的 `working_notes`。
- `next_task_sequence` 记录下一个可分配的 `DEV-*` 序号，避免删除历史 task 后发生 id 冲突。
- task 完成并写入 implementation doc 后，从 `plan.yaml` 的 `tasks` 列表移除该 task；不要长期保留 done/cancelled task 摘要。
- `plan.draft.yaml` 是架构阶段生成的计划草案，不自动覆盖 `plan.yaml`。
- 不维护 checkpoint 文件；任务现场只存在于 open task 的 plan 条目里。
- 历史动作记录以 git commit 为准，产物结果以 implementation doc 为准。
- `SPRINTING` 阶段每完成一个 task，先在 task 仍位于 `plan.yaml` 时创建 task implementation commit；随后再从 `plan.yaml` 移除该 task 并创建 task completion ledger commit。两段提交 push 成功前不进入下一个 task。
- 历史 task 查询默认面向产物结果和变更意图，读取 implementation doc、RFC、PRD、tech plan 和代码；`allowed_paths`、`required_gates`、临时 `working_notes` 是执行期约束，不作为历史查询 API。
- 过去 phase/task/gate 执行流水不是默认上下文；除非用户明确要求 forensic/audit/regression 追溯，否则不要读取或恢复历史执行信息。

## Prompt Language Contract

- 面向人阅读的说明、规则、SOP、检查清单使用中文。
- 机器契约保持英文，包括字段名、路径、命令、阶段枚举、状态枚举、脚本参数。
- 不翻译 `.agent/state/*.yaml`、`.agent/pjsdlc_managed/policies/*.yaml` 中的 key。
- 不翻译 `current_phase`、`active_skill`、`allowed_paths`、`required_gates`、`implementation_doc` 等字段名。
- 不翻译 `REQUIREMENT_GATHERING`、`ARCHITECTING`、`SPRINTING`、`REVIEWING`、`TESTING`、`RELEASING`、`RFC_RECALIBRATION`、`BLOCKED` 等阶段枚举。
- 不翻译 `pending`、`in_progress`、`done`、`blocked`、`pending_revision`、`cancelled` 等任务状态。
- 不翻译 `make validate-*`、`python3 tools/transition.py --to <PHASE>`、`.docs/01_product/`、`.agent/state/plan.yaml` 等命令和路径。
- 后续更新 `.agent/skills/*/SKILL.md` 或 `.agent/pjsdlc_managed/templates/*.md` 时，遵循“中文解释 + 英文精确标识符”。Harness 根目录由 `package.json#sdlcHarness.harnessFolderName` 或 `sdlc-harness.config.json#harnessFolderName` 决定；未配置的项目默认使用 `.agent`。

## 通用执行原则

以下原则完整迁移自 `multica-ai/andrej-karpathy-skills` 的 MIT guideline，并按本仓库的 Prompt Language Contract 转为“中文说明 + 英文关键词”形式，与阶段化 Harness 协议合并执行。

### Karpathy Guidelines（MIT 完整本地化）

这些 behavioral guidelines 用来减少常见的 LLM coding mistakes，并可与项目级 instructions 合并使用。

**Tradeoff:** 这些 guidelines 更偏向 caution over speed。对于 trivial tasks，可以使用 judgment。

## 1. Think Before Coding

**不要 assume，不要 hide confusion，要 surface tradeoffs。**

Before implementing:
- 显式说明你的 assumptions。如果 uncertain，先 ask。
- 如果存在多种 interpretations，要把它们列出来，不要 silently pick。
- 如果存在 simpler approach，要说出来。必要时要 push back。
- 如果某件事 unclear，先 stop，说明 confusing 的点，再 ask。

## 2. Simplicity First

**用 minimum code 解决问题，不做 speculative work。**

- 不添加超出用户请求的 features。
- 不为 single-use code 添加 abstractions。
- 不添加未被请求的 `flexibility` 或 `configurability`。
- 不为 impossible scenarios 添加 error handling。
- 如果你写了 200 行，而它本可以是 50 行，就 rewrite it。

Ask yourself: “Would a senior engineer say this is overcomplicated?” 如果答案是 yes，就 simplify。

## 3. Surgical Changes

**只 touch 必须修改的内容，只 clean up your own mess。**

When editing existing code:
- 不要“顺手 improve”相邻代码、comments 或 formatting。
- 不要 refactor 没有 broken 的东西。
- Match existing style，即使你个人会用不同写法。
- 如果发现 unrelated dead code，只 mention it，不要 delete it。

When your changes create orphans:
- 移除由 YOUR changes 造成 unused 的 imports、variables、functions。
- 除非用户明确要求，不要移除 pre-existing dead code。

The test: 每一行 changed line 都应该能直接 trace 到用户请求。

## 4. Goal-Driven Execution

**定义 success criteria，并 loop until verified。**

把任务转换为 verifiable goals:
- `Add validation` → 为 invalid inputs 写 tests，然后 make them pass。
- `Fix the bug` → 写一个能 reproduce 它的 test，然后 make it pass。
- `Refactor X` → 确保 tests 在 before and after 都 pass。

对于 multi-step tasks，先给出 brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria 可以让你 independent loop。Weak criteria，例如 “make it work”，会导致 constant clarification。

---

**这些 guidelines 生效的信号：** diffs 中 unnecessary changes 更少，因为 overcomplication 导致的 rewrites 更少，并且 clarifying questions 出现在 implementation 之前，而不是 mistakes 之后。

### Harness 补充原则

1. 阶段约束优先：除非用户明确要求其它工作流动作，否则使用 `active_skill` 指定的 Skill，并服从当前阶段的 allowed paths、required gates 和交付物边界。
2. 文档先于实现：产品文档和技术方案未形成前，不写业务代码；需求变更必须进入 RFC 工作流。
3. 验证闭环：多步骤工作先给出简短计划，并为关键步骤绑定验证方式。除非被阻塞，否则持续迭代到对应 `required_gates`、阶段 gate 或明确的人工验收标准满足。
4. 派生物可再生成：`overview.md`、包内 assets 等 generated artifact 必须由对应命令刷新，不手写局部补丁。

## 工作规则

1. 选择任何角色或 Skill 前，先读取 `.agent/state/lifecycle.yaml`。
2. 除非用户明确要求其它工作流动作，否则使用 `active_skill` 指定的 Skill。
3. 产品文档和技术方案未形成前，不写业务代码。
4. 在 `SPRINTING` 阶段，一次只执行一个任务。
5. 在 `SPRINTING` 阶段，只编辑当前 open task 的 `allowed_paths` 允许的文件。
6. 不要在当前 open task 的 `required_gates` 通过前把任务标记为 `done`。
7. 代码 gate 通过后，更新任务实现文档和 `.docs/INDEX.md`。
8. `reviewer` 角色只读，不直接修改源码。
9. 需求变更必须进入 RFC 工作流。
10. task/release 历史动作记录使用 git commit、tag 或外部 release 系统，不维护 `.agent/archive/` 常规归档。
11. 在 `SPRINTING` 阶段，task 完成闭环必须先创建 task implementation commit，再提交移除该 task 后的 task completion ledger commit；如果没有 remote/upstream、权限或凭证导致无法 push，不要开始下一个 task，先报告 blocker。
12. 文档 slice 发生变化后，运行 `make docs-overview` 刷新对应 `overview.md`。
13. open task 必须在 `plan.yaml` 中包含完整执行合同，再继续推进或交接。
14. 默认不读取过去 task 或 phase 执行流水；修 bug、补功能和阶段交付以当前代码、测试、PRD、技术方案和 implementation doc 为准。
15. gate 证据写入当前 task `working_notes` 或 implementation doc 的 `Verification`；不要维护独立 gate results state。
16. 如果信息缺失，或 gate 因基础设施原因失败，停止推进并报告 blocker。

## 宏指令

- `/status`：报告当前阶段、角色、任务、阻塞项和下一步动作。
- `/next`：运行当前阶段映射的 Skill。
- `/advance`：校验当前阶段出口 gate，通过后才尝试流转。
- `/rfc <file>`：挂起当前流程并进入 RFC recalibration。
- `/syncdocs`：同步 `.docs/INDEX.md` 与当前文档事实源。
- `/overview`：运行 `make docs-overview`，刷新 `.docs/<stage>/overview.md` 派生视图。
- `/review`：运行只读 Review 工作流。
- `/test`：运行测试计划和验证工作流。

## 阶段流转

正常阶段流转不要手动编辑 `.agent/state/lifecycle.yaml`。使用：

```sh
python3 tools/transition.py --to <PHASE>
```

流转前先运行阶段 gate，通常使用 `make validate-current`，或使用
`.agent/pjsdlc_managed/policies/phase_contracts.yaml` 中列出的具体 `make validate-*` 目标。
