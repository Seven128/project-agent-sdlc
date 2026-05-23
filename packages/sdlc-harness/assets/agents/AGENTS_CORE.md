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

- `plan.yaml` 是当前执行计划事实源。open task 直接包含 `allowed_paths`、`required_gates`、`acceptance_criteria` 和必要的 `working_notes`。
- task 完成并写入 implementation doc 后，删除 open task 的详细执行字段，只保留简短 `summary`、`implementation_doc` 和 `gate_result`。
- `plan.draft.yaml` 是架构阶段生成的计划草案，不自动覆盖 `plan.yaml`。
- 不维护 checkpoint 文件；任务现场只存在于 open task 的 plan 条目里。
- 历史动作记录以 git commit 为准，产物结果以 implementation doc 为准。

## Prompt Language Contract

- 面向人阅读的说明、规则、SOP、检查清单使用中文。
- 机器契约保持英文，包括字段名、路径、命令、阶段枚举、状态枚举、脚本参数。
- 不翻译 `.agent/state/*.yaml`、`.agent/managed/policies/*.yaml` 中的 key。
- 不翻译 `current_phase`、`active_skill`、`allowed_paths`、`required_gates`、`implementation_doc` 等字段名。
- 不翻译 `REQUIREMENT_GATHERING`、`ARCHITECTING`、`SPRINTING`、`REVIEWING`、`TESTING`、`RELEASING`、`RFC_RECALIBRATION`、`BLOCKED` 等阶段枚举。
- 不翻译 `pending`、`in_progress`、`done`、`blocked`、`pending_revision`、`cancelled` 等任务状态。
- 不翻译 `make validate-*`、`python3 tools/transition.py --to <PHASE>`、`.docs/01_product/`、`.agent/state/plan.yaml` 等命令和路径。
- 后续更新 `.agent/skills/*/SKILL.md` 或 `.agent/managed/templates/*.md` 时，遵循“中文解释 + 英文精确标识符”。Harness 根目录由 `package.json#sdlcHarness.harnessFolderName` 或 `sdlc-harness.config.json#harnessFolderName` 决定；未配置的项目默认使用 `.agent`。

## 通用执行原则

以下原则参考 `multica-ai/andrej-karpathy-skills` 的通用编码约束，并与本仓库的阶段化 Harness 协议合并执行。

1. 编码前思考：不要静默假设。遇到歧义时先说明假设、列出可能解释和关键取舍；如果信息不足会影响结果，先停下来询问或报告 blocker。
2. 简洁优先：只实现用户当前请求和阶段目标需要的最小方案。不要添加未要求的功能、抽象、配置项或“未来可能需要”的灵活性；如果实现明显可以更短更直接，先简化。
3. 精准修改：只改与请求、当前 task 或当前阶段产物直接相关的内容。匹配既有风格，不顺手重构、重排格式或删除无关旧代码；如果发现无关问题，只报告，不擅自处理。
4. 目标驱动执行：把任务转换成可验证的完成标准。修 bug 时优先定义可复现检查；加能力时明确 acceptance criteria；重构前后都要有 gate 或测试证明行为保持。
5. 验证闭环：多步骤工作先给出简短计划，并为关键步骤绑定验证方式。除非被阻塞，否则持续迭代到对应 `required_gates`、阶段 gate 或明确的人工验收标准满足。

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
11. 文档 slice 发生变化后，运行 `make docs-overview` 刷新对应 `overview.html`。
12. open task 必须在 `plan.yaml` 中包含完整执行合同，再继续推进或交接。
13. 如果信息缺失，或 gate 因基础设施原因失败，停止推进并报告 blocker。

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
`.agent/policies/phase_contracts.yaml` 中列出的具体 `make validate-*` 目标。
