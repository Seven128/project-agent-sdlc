---
name: pjsdlc_implementation_doc
description: Use after development gates pass to update module-level implementation facts and plan deviations.
---

# Implementation Doc Skill

## 目的

按模块、子系统或核心数据流记录真实实现事实，包括代码结构、数据流、防御逻辑、测试覆盖，以及相对原技术方案的偏移。

## 角色提示词

你是实现事实记录者，目标是把已经发生的代码变化沉淀成后续 Review、测试、发布和需求变更都能引用的事实。你写的是 implementation doc，不是新的技术方案，也不是对未来工作的承诺。

开始记录前，先读取 task、PRD、技术方案、git diff、测试结果和相关源码。若代码事实与技术方案不一致，要明确记录 deviation、原因和风险；若信息不足，不要脑补实现细节，应标注缺口或回到开发者确认。

文档应帮助后来者快速理解：某个模块或核心数据流的当前实现是什么、关键对象/函数职责是什么、行为如何从输入流到输出、测试覆盖了什么、还有什么未覆盖。task id 只作为 provenance，不作为默认切片粒度。

implementation doc 只写长期实现事实，不写完整操作日记。对于 high-risk runtime/live/remote-operator task，主线只保留当前 canonical path、当前实现边界、短的 `Current Operator Path` 和指向 `plan.yaml#resume_capsule`、`.docs/09_runbooks/**` runbook、evidence index、exploration appendix 的链接；失败路径和探索细节进入 exploration appendix，证据正文进入 evidence index 或外部系统。恢复入口必须比探索历史更显眼。

如果模块包含或承诺可运行系统边界，implementation doc 必须记录 runnable entry/exit：API/CLI/server route/service/agent/runtime/adapter/worker/provider 的调用方式、初始化方式、配置契约、输入来源、输出或副作用、fixture/live 模式边界，以及哪些真实外部执行器尚未实现。还必须在 `Development Evidence` 中记录开发阶段实际验证过的 `Evidence Level`、`Target Runtime Environment`、`Runnable Entry`、`Observable Exit`、`Client / Server Initialization`、`Config Contract`、`Testing Handoff Readiness`、`Known Missing Runtime Boundaries` 和 `Basic Self-test Evidence`；`Basic Self-test Evidence` 应指向已执行的 `Development Self-Test Report`。确实没有应用入口时，`Not applicable` 必须写清原因。不能把未来才会实现的入口写成当前事实，不能把 provider smoke、fixture smoke、fake adapter 或 one-shot smoke 单独写成 application readiness。如果 task 要求 `business_handoff_ready`，还必须写 Testing Handoff Contract，包含入口、配置、初始化/health、输入样例、预期出口、清理/reset/幂等说明和证据等级。

如果当前 task 有 `self_test_contract.status: "required"`，implementation doc 必须填写 `Development Self-Test Report`，把设计/RFC 阶段定义的自测合同执行完成：记录 `Report Status: PASS | BLOCKED | IN_PROGRESS | STALE`、contract source、每个 scenario 的结果、实际执行入口、实际出口、证据位置或命令输出、executed gates、Module Key Test Path、missing/blockers 和 Testing Handoff Readiness。`Development Self-Test Report` 不是 debug log、operator log、runbook 或历史流水；fallback / diagnostic 在主报告最多一句总结，详细命令、截图过程、UI 操作细节和失败路径进入 exploration appendix 或 git history。High-risk runtime/live task 还必须写 `Current Operator Path` 和 `Gate Breakdown`，把 canonical operator path、runbook link、credential reference name、command/UI channel、do-not-retry summary 以及 local gate、cloud/service gate、executor/operator readiness、live smoke / handoff 分层记录，不能只写一个大 `validate-dev PASS`。`Development Self-Test Report` 只能记录当前 task 本轮实际执行后的结果；不得用历史报告、模板字段、代码阅读或无关通用 gate 替代本轮 self-test scenario 执行。`Module Key Test Path` 必须说明从本地启动或调用入口开始，执行并完成 `self_test_contract` 中全部自测用例的模块关键测试路径。该路径应覆盖本 task / 本模块承诺的所有可运行入口，以及自测用例实际经过的内部关键路径、关键边界、观察点和可观测完成证据，供后续 Agent 复用和 debug。任何 scenario 非 `PASS`，或 `Report Status` 为 `BLOCKED`、`IN_PROGRESS`、`STALE` 时，不得把开发 task 写成完成。

## 输入

- `<harnessRoot>/state/plan.yaml` 中当前 task 的 `implementation_doc` 路径和 task ID
- 当前 `git diff`
- 关联 PRD
- 关联技术方案
- 变更后的源码和测试文件
- `<harnessRoot>/pjsdlc_managed/templates/IMPLEMENTATION_DOC_TEMPLATE.md`

## 输出

- `.docs/04_implementation/<domain>/<module_or_flow>.md`
- 更新后的 `.docs/INDEX.md`

## 语义切片

- `.docs/04_implementation/` 默认按稳定的模块、子系统或核心数据流切片，并尽量与 architecture / tech plan 的边界对应。
- task 是执行单元和提交边界，不是 implementation doc 的默认文档边界。task ID、commit 和 RFC 只记录在文档的 provenance 或变更记录中。
- 如果一个 task 修改已有模块或数据流，应更新对应的原 implementation doc，而不是创建 `dev_*.md` task ledger。
- 如果一个 task 真实产出多个独立模块或核心数据流，可以更新或新增多份 implementation docs；每份都记录相关 Task ID 和 commit。
- 只有当某个 task 本身就是一个稳定模块/数据流边界时，implementation doc 才可以与单个 task 一一对应。
- 如果真实代码边界与技术方案边界不同，必须在文档中记录偏移，并更新 `.docs/INDEX.md`。

## 规则

1. implementation doc 描述当前代码事实，而不是期望中的未来设计。
2. 每个被记录的文件都应说明它在该模块或数据流中的作用和关键函数/对象。
3. 与技术方案的偏移必须明确记录，即便该偏移是合理的。
4. runnable entry/exit、配置契约和 fixture/live 边界必须记录当前事实；缺失项写入 `未覆盖（Not covered）` 或方案偏移。
5. `Development Evidence` 必须包含 task 合同要求的证据等级、目标运行环境、实际可调用入口、可观察出口、初始化方式、配置契约、测试交接状态、缺失 runtime 边界和开发自测证据；页面类任务记录 dev server/page URL 与 browser check，API/CLI/worker/RPA/service/agent/runtime 类任务记录 startup/invocation command、endpoint/health/status 与 response/output/side effect。
6. `Development Self-Test Report` 必须记录 `Report Status`、当前 task 本轮执行 `self_test_contract` 中全部 scenario 和 required gates 后的结果，并记录从本地启动或调用入口开始，到完成所有自测用例的 `Module Key Test Path`；路径必须覆盖本 task / 本模块承诺的所有可运行入口、内部关键路径、关键边界、观察点和完成证据，不能只补一句 smoke 结果，也不能复用历史 PASS、模板字段、代码阅读或无关通用 gate 作为本轮证据。
7. 测试覆盖必须列出具体测试，或明确记录覆盖缺口。
8. 文档粒度保持在模块、子系统或核心数据流级别；不要默认按 task 建文档，也不要写成跨全项目的巨型百科。

## 完成检查

- [ ] 模块/子系统/核心数据流边界明确，并与相关 architecture / tech plan 对齐或记录偏移。
- [ ] Task ID、commit 和关联产物路径已作为 provenance 记录。
- [ ] 真实代码结构表已填写。
- [ ] 核心数据流已说明。
- [ ] runnable entry/exit、配置契约和 fixture/live 边界已记录，或缺失项已明确标注。
- [ ] `Development Evidence` 已记录 `Evidence Level`、`Target Runtime Environment`、`Runnable Entry`、`Observable Exit`、`Client / Server Initialization`、`Config Contract`、`Testing Handoff Readiness`、`Known Missing Runtime Boundaries`、`Basic Self-test Evidence`，或带原因的 `Not applicable`。
- [ ] 如果当前 task 有 `self_test_contract.status: "required"`，`Development Self-Test Report` 已记录 `Report Status`、contract source、scenario results、executed gates、Module Key Test Path、actual evidence、missing/blockers 和 Testing Handoff Readiness。
- [ ] 如果当前 task 是 high-risk runtime/live/remote-operator 工作，implementation doc 主线只保留实现事实、`Current Operator Path` 和恢复链接，`Gate Breakdown` 已分层记录，本轮失败探索已隔离到 exploration appendix。
- [ ] `business_handoff_ready` task 已记录 Testing Handoff Contract。
- [ ] 已判断 implementation doc 的语义切片边界。
- [ ] 方案偏移和测试覆盖已记录。
- [ ] `.docs/INDEX.md` 已链接 implementation doc。
- [ ] 已运行 `make docs-overview` 刷新 `.docs/<stage>/overview.md`。
