# AI SDLC Harness Protocol

本仓库使用 AI SDLC Harness 工作流。开始任何工作前，把 `.codex/` 和 `.docs/`
视为项目事实源。

## 事实源

- 生命周期状态：`.codex/state/lifecycle.yaml`
- 执行计划：`.codex/state/plan.yaml`
- 计划草案：`.codex/state/plan.draft.yaml`
- 项目长期记忆：`.codex/state/memory.md`
- 产品文档：`.docs/01_product/`
- 架构文档：`.docs/02_architecture/`
- 技术方案：`.docs/03_tech_plan/`
- 实现文档：`.docs/04_implementation/`
- Review 文档：`.docs/06_review/`
- 测试文档：`.docs/07_test/`
- 发布文档：`.docs/08_release/`
- RFC 文档：`.docs/rfc/`
- 全局文档索引：`.docs/INDEX.md`
- Harness authoring skills（如果存在）：`.codex/skills/authoring/`，只在维护 Harness/workflow/npm package 源码或本仓库自举规则时读取，不作为用户项目默认分发内容

## 派生视图

- 每个 `.docs/<stage>/overview.md` 是对应阶段 Markdown slices 的 generated artifact。
- Markdown slices 和 `.docs/INDEX.md` 才是事实源，`overview.md` 只用于人类浏览和阶段交接。
- 不要手写或局部编辑 `overview.md`。
- 任意 `.docs/<stage>/**/*.md` 发生新增、修改、拆分、合并或废弃后，运行 `make docs-overview`。
- 提交或阶段交付前，运行 `make validate-doc-overviews` 或 `make validate-harness` 确认 Markdown 总览未过期。

## Plan Protocol

- `plan.yaml` 是当前和未来任务的短期执行计划事实源。每个阶段的每个 Agent 主任务都应先检查是否过长，必要时拆成大小合适的 open task；open task 直接包含 `phase`、`allowed_paths`、`required_gates`、`acceptance_criteria` 和必要的 `working_notes`。
- `current_phase` 只保存在 `lifecycle.yaml`；不要在 `plan.yaml`、`plan.draft.yaml` 或 `parallel_execution` 中重复保存当前阶段。
- 新建任务统一使用 `TASK-*` id，并通过 `phase` 标明属于 `REQUIREMENT_GATHERING`、`ARCHITECTING`、`SPRINTING`、`REVIEWING`、`TESTING`、`RELEASING` 或 `RFC_RECALIBRATION`；历史 `PRD-*`、`DES-*`、`DEV-*` 只作为兼容旧记录和旧提交的 provenance。
- `next_task_sequence` 记录下一个可分配的 `TASK-*` 序号，避免删除历史 task 后发生 id 冲突。
- 文档、Review、测试、发布和 RFC 类 task 使用 `result_docs` 指向本 task 产出的 PRD、architecture、tech plan、ADR、review report、test plan、release note、RFC 或 `plan.draft.yaml`；开发 task 使用 `implementation_doc` 指向模块级实现事实。
- task 完成并写入或更新相关事实源后，从 `plan.yaml` 的 `tasks` 列表移除该 task；不要长期保留 done/cancelled task 摘要。
- `plan.draft.yaml` 是架构阶段生成的计划草案，不自动覆盖 `plan.yaml`。
- `plan.draft.yaml` 不保存 `current_phase` 或 `current_task_id`，只保存待采用的 task 草案和必要的 `next_task_sequence`。
- `SPRINTING` 阶段从 `plan.draft.yaml.tasks[]` promote 某个开发草案为正式 `TASK-*` 时，必须同次从 `plan.draft.yaml.tasks[]` 删除该 draft；`plan.draft.yaml.tasks[]` 永远表示尚未采用的开发草案。
- 不维护 checkpoint 文件；任务现场只存在于 open task 的 plan 条目里。
- 历史动作记录以 git commit 为准，产物结果以模块、子系统或核心数据流级 implementation doc 为准。
- `SPRINTING` 阶段每完成一个 task，先在 task 仍位于 `plan.yaml` 时创建 task implementation commit；随后再从 `plan.yaml` 移除该 task 并创建 task completion ledger commit。两段提交 push 成功前不进入下一个 task。
- 历史 task 查询默认面向产物结果和变更意图，读取模块级 implementation doc、RFC、PRD、tech plan 和代码；task id 和 commit 只作为 provenance，`allowed_paths`、`required_gates`、临时 `working_notes` 是执行期约束，不作为历史查询 API。
- 过去 phase/task/gate 执行流水不是默认上下文；除非用户明确要求 forensic/audit/regression 追溯，否则不要读取或恢复历史执行信息。

## Skill Language Contract

- 面向人阅读的说明、规则、SOP、检查清单使用中文。
- 机器契约保持英文，包括字段名、路径、命令、阶段枚举、状态枚举、脚本参数。
- 不翻译 `.codex/state/*.yaml`、`.codex/pjsdlc_managed/policies/*.yaml` 中的 key。
- 不翻译 `current_phase`、`active_skill`、`allowed_paths`、`required_gates`、`implementation_doc` 等字段名。
- 不翻译 `REQUIREMENT_GATHERING`、`ARCHITECTING`、`SPRINTING`、`REVIEWING`、`TESTING`、`RELEASING`、`RFC_RECALIBRATION`、`BLOCKED` 等阶段枚举。
- 不翻译 `pending`、`in_progress`、`done`、`blocked`、`pending_revision`、`cancelled` 等任务状态。
- 不翻译 `make validate-*`、`python3 tools/transition.py --to <PHASE>`、`.docs/01_product/`、`.codex/state/plan.yaml` 等命令和路径。
- 后续更新 `.codex/skills/*/SKILL.md`、`.codex/skills/authoring/*/SKILL.md` 或 `.codex/pjsdlc_managed/templates/*.md` 时，遵循“中文解释 + 英文精确标识符”。Harness 根目录由 `package.json#sdlcHarness.harnessFolderName` 或 `sdlc-harness.config.json#harnessFolderName` 决定；本仓库显式配置为 `.codex`。

## 通用执行原则

以下原则完整迁移自 `multica-ai/andrej-karpathy-skills` 的 MIT guideline，并按本仓库的 Skill Language Contract 转为“中文说明 + 英文关键词”形式，与阶段化 Harness 协议合并执行。

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

1. 阶段约束优先：除非用户明确要求其它工作流动作，否则使用 `active_skill` 指定的 workflow skill，并服从当前阶段的 allowed paths、required gates 和交付物边界。
2. 文档先于实现：产品文档和技术方案未形成前，不写业务代码；尚未进入 `SPRINTING` 且仍在 `ARCHITECTING` 时，可以通过 `transition.py --to REQUIREMENT_GATHERING` 回到 PM/PRD 工作流修改产品事实；进入 `SPRINTING` 后的需求变更必须进入 RFC 工作流。
3. 验证闭环：多步骤工作先给出简短计划，并为关键步骤绑定验证方式。除非被阻塞，否则持续迭代到对应 `required_gates`、阶段 gate 或明确的人工验收标准满足。
4. 派生物可再生成：`overview.md`、包内 assets 等 generated artifact 必须由对应命令刷新，不手写局部补丁。

## 工作规则

1. 选择任何角色或 skill 前，先读取 `.codex/state/lifecycle.yaml`。
2. 除非用户明确要求其它工作流动作，否则使用 `active_skill` 指定的 workflow skill。
3. 产品文档和技术方案未形成前，不写业务代码。
4. 每个阶段一次只执行一个 open task；如果任务过长，先拆成多个 `TASK-*`，当前轮只推进 `current_task_id`。
5. 每个阶段只编辑当前 open task 的 `allowed_paths` 允许的文件；只读角色仍不得修改源码。
6. 不要在当前 open task 的 `required_gates` 通过前把任务标记为 `done`。
7. 代码 gate 通过后，更新相关 implementation doc 和 `.docs/INDEX.md`。
8. `reviewer` 角色只读，不直接修改源码。
9. 进入 `SPRINTING` 后的需求变更必须进入 RFC 工作流；`ARCHITECTING` 阶段发现 PRD 需要修改时，可以先回到 `REQUIREMENT_GATHERING`。
10. task/release 历史动作记录使用 git commit、tag 或外部 release 系统，不维护 `<harnessRoot>/archive/` 常规归档。
11. 在 `SPRINTING` 阶段，task 完成闭环必须先创建 task implementation commit，再提交移除该 task 后的 task completion ledger commit；如果没有 remote/upstream、权限或凭证导致无法 push，不要开始下一个 task，先报告 blocker。
12. 文档 slice 发生变化后，运行 `make docs-overview` 刷新对应 `overview.md`。
13. open task 必须在 `plan.yaml` 中包含完整执行合同，再继续推进或交接；方案生成、现有文档切片、基于上一阶段事实源生成、Review、测试、发布和 RFC 处理都必须先落到 `plan.yaml` task。
14. 默认不读取过去 task 或 phase 执行流水；修 bug、补功能和阶段交付以当前代码、测试、PRD、技术方案和模块级 implementation doc 为准。
15. gate 证据写入当前 task `working_notes` 或相关 implementation doc 的 `Verification`；不要维护独立 gate results state。
16. 如果信息缺失，或 gate 因基础设施原因失败，停止推进并报告 blocker。

## 自然语言与宏指令

用户不需要记忆或使用宏指令。自然语言意图和约定宏指令是两层入口：自然语言是默认控制方式，`/xxx` 是更完整、更细节的提示词别名，也可作为调试入口或自动化入口。两者应映射到同一组 workflow action；自然语言入口成本更低，但细节约束更依赖 Agent 根据上下文判断。

当用户用自然语言表达意图时，Agent 应先读取 `.codex/state/lifecycle.yaml` 和必要的 `.codex/state/plan.yaml`，再映射到对应 workflow action：

- “现在到哪了 / 状态如何” → 等价 `/status`。
- “继续 / 下一步 / 推进” → 等价 `/next`。
- “能进入下一阶段吗 / 进入下一步” → 等价 `/advance`。
- “需求变了 / 这个设计要改” → 如果当前仍在 `ARCHITECTING` 且尚未进入开发，可回到 `REQUIREMENT_GATHERING` 修改 PRD；如果已经进入 `SPRINTING` 或之后，进入 RFC workflow。
- “完善产品方案 / 写 PRD / 文档切片 / 我提供信息，你帮我完善产品方案” → 在 `REQUIREMENT_GATHERING` 等价 `/prd`；在 `ARCHITECTING` 且尚未进入开发时，先流转回 `REQUIREMENT_GATHERING`，再一次只执行一个 `phase: "REQUIREMENT_GATHERING"` 的 `TASK-*`。
- “设计技术方案 / 做架构方案 / 根据 PRD 做技术方案 / 切技术方案” → 等价 `/design`，一次只执行一个 `phase: "ARCHITECTING"` 的 `TASK-*`。
- “开始开发 / 做当前任务 / 做下一个任务” → 等价 `/dev`。
- “开始循环：写任务，执行任务 / 把开发循环跑完” → 等价 `/devloop`。
- “跑测试 / 验证一下” → 运行当前 task 或阶段对应 gate。
- “并行 / 多 agent / 多 worktree / parallel” → 只有用户显式提出时，才创建或使用 `parallel_execution` 合同；默认 workflow 不启用并行。
- “准备 review / 帮我 review” → 进入只读 Review workflow。
- “刷新文档总览 / 同步 overview” → 等价 `/overview`。
- `/plan` 和 `/goal` 是客户端模式入口，不由 Harness 自动开启；用户可以手动组合，例如 `/plan /prd`、`/plan 完善产品方案`、`/goal /devloop` 或 `/goal 开始循环：写任务，执行任务`。

Parallel Execution 是可选协作协议，不是默认模式，也不是 CLI 自动启动 Agent 的承诺。只有用户明确要求多 agent、并行或多 worktree，且当前阶段适合拆分时，Agent 才能在 `plan.yaml` 增加 `parallel_execution`。`parallel_execution` 不保存 `phase` 或 `linked_task_id`；当前阶段读取 `lifecycle.yaml#current_phase`，当前任务读取 `plan.yaml#current_task_id`。如果当前 runtime 支持 subagent，由主 Agent 使用 `runtime_managed` 模式编排；否则使用 `user_orchestrated` 模式，主 Agent 生成每个 worker 的可复制 prompt，用户手动打开对话或 worktree 后粘贴执行。worker 之间不要求通信，最终事实源更新、review、merge/cherry-pick 和总 gate 由主 Agent 负责。

如果自然语言意图会改变阶段、创建或删除 task、提交、push 或发布，Agent 先用一句话说明将执行的动作和验证方式，再继续。

- `/status`：报告当前阶段、角色、任务、阻塞项和下一步动作。
- `/next`：运行当前阶段映射的 workflow skill。
- `/advance`：校验当前阶段出口 gate，通过后才尝试流转；`ARCHITECTING` 的可选返回目标是 `REQUIREMENT_GATHERING`，用于开发前修改 PRD。
- `/rfc <file>`：挂起当前流程并进入 RFC recalibration。
- `/prd`：在 `REQUIREMENT_GATHERING` 创建或选择一个最小 `TASK-*` task，澄清需求或切片文档，并只更新当前 task 对应的 PRD、验收标准、open questions、`.docs/INDEX.md` 和 overview；如果当前是 `ARCHITECTING` 且尚未进入开发，可先回到 `REQUIREMENT_GATHERING`。
- `/design`：在 `ARCHITECTING` 创建或选择一个最小 `TASK-*` task，基于 PRD 生成或切分当前 task 对应的 architecture、tech plan 和 `plan.draft.yaml`。
- `/dev`：在 `SPRINTING` 创建或选择下一个最小 `TASK-*` development task；如果从 `plan.draft.yaml.tasks[]` promote draft，必须同次消费并删除该 draft；随后执行一个 task，跑 gate，更新模块级 implementation doc，按两段 commit/push 闭环后停止。
- `/devloop`：在 `SPRINTING` 连续运行 `/dev` 循环，直到 `plan.yaml.tasks[]` 和 `plan.draft.yaml.tasks[]` 都没有明确可执行任务，或遇到需求、架构、allowed_paths、gate、commit/push blocker。
- `/syncdocs`：同步 `.docs/INDEX.md` 与当前文档事实源。
- `/overview`：运行 `make docs-overview`，刷新 `.docs/<stage>/overview.md` 派生视图。
- `/review`：运行只读 Review 工作流。
- `/test`：运行测试计划和验证工作流。

## 阶段流转

正常阶段流转不要手动编辑 `.codex/state/lifecycle.yaml`。使用：

```sh
python3 tools/transition.py --to <PHASE>
```

流转前先运行阶段 gate，通常使用 `make validate-current`，或使用
`.codex/pjsdlc_managed/policies/phase_contracts.yaml` 中列出的具体 `make validate-*` 目标。
