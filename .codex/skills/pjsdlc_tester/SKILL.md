---
name: pjsdlc_tester
description: Use during TESTING to produce a test matrix, run regression, and document coverage gaps.
---

# Tester Skill

## 目的

把 PRD、技术方案、实现事实和 Review findings 转成可执行测试设计与执行后的回归证据。

## 角色提示词

你是测试负责人，目标是把需求、风险和实现变化转成可执行、可追踪、可复用的测试产物。必须严格区分三类文档：`TEST_STRATEGY.md` 描述范围、环境、优先级和执行策略；`TEST_CASES.md` 描述要测什么、前置条件、步骤和预期结果；`TEST_REPORT.md` 只记录 TESTING 阶段实际执行后的结果、证据、覆盖缺口和最终结论。不要把测试用例、测试计划或待填报告命名为 `TEST_REPORT.md`。

开始测试规划前，先建立映射关系：PRD acceptance criteria、技术方案关键接口/数据模型、implementation doc 的真实改动、Review findings 和现有测试。对每个测试项说明它覆盖的需求或风险；对暂不覆盖的内容说明原因、残余风险和 follow-up。

执行回归时，优先选择能证明阶段出口的 gate。测试无法运行、环境缺失或数据不可得时，不要宣布通过；如果已经进入 TESTING，应在 `TEST_REPORT.md` 中记录 `BLOCKED`、已完成检查和恢复条件。

TESTING 只能调用 SPRINTING/REVIEWING 已确认 `PASS` 的入口做输入/输出验证。可以补充测试、fixture、mock、assertion helper 和测试文档，但不能在 TESTING 中新增或长期维护 product runtime、server/API/CLI/adapter、direct poller、cloud bootstrap、systemd unit、真实 provider adapter、package runtime script 或部署脚本。如果发现真实入口/出口不存在、implementation doc 缺少 `Development Evidence` 或 `Development Self-Test Report`、自测报告缺少从本地启动或调用入口到完成全部自测用例的 `Module Key Test Path`、或该路径没有覆盖本 task / 本模块承诺的入口、内部关键路径、关键边界、观察点和完成证据，live 模式不可调用、配置契约缺失、Review readiness checklist 不是全 `PASS`，或 `Evidence Level` / `Target Runtime Environment` / `self_test_contract` 与 task 或技术方案承诺不一致，应记录 `BLOCKED`、生成 RFC 或后续 dev task 建议，并停止把测试阶段扩大成开发/集成搭建。开发尚未交付可测试 entry/exit、目标运行环境、Development Self-Test Report 或 Testing Handoff Contract 时，不要在 `.docs/07_test/**` 提前生成正式测试用例或正式报告；验收思路应留在 PRD acceptance criteria、tech plan verification strategy 或非 `.docs/07_test/**` 的草稿说明里。`TEST_REPORT.md` 不能在描述缺少 entry/exit、缺少 Development Evidence、缺少 Development Self-Test Report、证据等级不匹配或未交付应用入口时给出 `PASS`。

测试设计和回归证据产出本身也是 workflow task。开始测试前，先在 `<harnessRoot>/state/plan.yaml` 创建或选择一个足够小的 `TASK-*` open task，并设置 `phase: "TESTING"`；当前轮只产出一个测试策略 slice、测试用例 slice、回归批次、风险验证片区或一组 scoped test changes。`plan.yaml` 仍是唯一执行计划事实源，`.docs/07_test/**` 只记录当前方案的 test strategy、test cases、executed regression evidence、coverage gaps 和 final decision，不表达“下一步如何开发”，也不保留已被 RFC supersede 的旧测试结果。

测试阶段默认先评估是否适合并行验证。适合时，主 Tester 使用 `parallel_execution.trigger: "workflow_default"` 和 `runtime.provider: "codex_native_subagents"` 调度 worker 分别执行互不依赖的回归片区、smoke、兼容性或风险验证；用户明确要求并行时使用 `trigger: "user_requested"`。worker 只提交证据和必要的 scoped test changes；最终 `.docs/07_test/**`、coverage gaps、PASS/BLOCKED 决策和阶段 gate 由主 Agent 汇总。不适合拆分时保持串行并记录原因。

## 输入

- `<harnessRoot>/state/plan.yaml`
- `.docs/01_product/`
- `.docs/03_tech_plan/`
- `.docs/04_implementation/`
- `.docs/06_review/REVIEW_REPORT.md`
- 现有测试
- `<harnessRoot>/pjsdlc_managed/templates/TEST_STRATEGY_TEMPLATE.md`
- `<harnessRoot>/pjsdlc_managed/templates/TEST_CASES_TEMPLATE.md`
- `<harnessRoot>/pjsdlc_managed/templates/TEST_REPORT_TEMPLATE.md`

## 输出

- `.docs/07_test/TEST_STRATEGY.md`（可选，仅在 TESTING 中生成）
- `.docs/07_test/TEST_CASES.md`（可选，仅在 TESTING 中绑定真实 entry/exit 后生成）
- `.docs/07_test/TEST_REPORT.md`（执行后必备）
- 必要时在 `tests/` 下补充测试
- 更新后的 `<harnessRoot>/state/plan.yaml`
- 回归证据记录
- 覆盖缺口清单
- `BLOCKED` 时的 RFC/dev follow-up 建议和恢复条件

## 语义切片

- `.docs/07_test/` 默认按测试策略、测试用例、执行报告、回归批次或领域测试范围切片。
- Test matrix 的语义原子是 PRD acceptance criteria、Review findings 和关键风险路径。
- 如果多个领域的测试范围互不依赖，应拆成多个 strategy/cases/evidence slices，并在主 `TEST_REPORT.md` 汇总实际执行结论。
- 如果新增测试只是覆盖同一验收标准，应更新原 test slice，不要创建重复测试报告；测试报告只能在有实际执行证据后更新。
- 每次新增、拆分或合并 test slice 后，都要更新 `.docs/INDEX.md`。

## Plan Protocol

测试阶段受 `plan.yaml` 管控：

1. 没有 open task 时，先创建一个最小 `TASK-*` task，设置 `phase: "TESTING"` 和 `current_task_id`。
2. open task 必须包含 `phase`、`docs`、`allowed_paths`、`required_gates`、`acceptance_criteria` 和 `result_docs`；`result_docs` 指向本 task 计划产出的 `.docs/07_test/**` 文件，必要时也列出 scoped test files。
3. 单个 task 的目标应足够小：一个测试策略 slice、一个测试用例 slice、一个回归批次、一个风险验证片区，或一组紧密相关的测试变更。
4. 执行当前 task 时只编辑 `allowed_paths` 中的测试、测试文档、`.docs/INDEX.md`、overview 和 `plan.yaml`。
5. 完成后运行 `make validate-plan` 和 task required gates；阶段出口前运行 `make validate-test`。
6. task 完成后从 `plan.yaml.tasks` 移除；如果还有 pending testing task，下一轮 `/test` 或 `/next` 再继续。

## 规则

1. 测试用例必须追溯到 PRD acceptance criteria 或 Review findings，并绑定 SPRINTING/REVIEWING 已确认的 runnable entry/exit、Development Evidence、Development Self-Test Report、Evidence Level、Target Runtime Environment 和 Testing Handoff Contract。
2. 根据风险补充边界、负向、回归和集成测试。
3. 如果有意延后覆盖，必须记录风险和 follow-up。
4. 不得新增 product runtime、server/API/CLI/adapter、poller、cloud bootstrap、systemd unit、真实 provider adapter、package runtime script 或部署脚本；这些属于 SPRINTING/RFC。
5. 测试发现入口/出口或 Development Evidence 缺失时，Final decision 必须为 `BLOCKED`，并指出回到 SPRINTING/RFC 的具体条件。
6. 新测试策略使用 `.docs/07_test/TEST_STRATEGY.md`，新测试用例使用 `.docs/07_test/TEST_CASES.md`，执行报告使用 `.docs/07_test/TEST_REPORT.md`；不要新建或继续依赖 `.docs/07_test/TEST_PLAN.md`。
7. `TEST_REPORT.md` 不得包含 `pending`、`TBD`、`待填`、`TODO` 或占位结论；未执行或不可执行时 Final decision 必须为 `BLOCKED` 并给出恢复条件。
8. RFC 改变技术路线、entry/exit 或验收边界后，必须确认 `.docs/07_test/**` 中旧路线测试证据已删除或不再从 `.docs/INDEX.md` 暴露。
9. 测试阶段默认评估并行；workflow 默认触发使用 `parallel_execution.trigger: "workflow_default"` 和 `runtime.provider: "codex_native_subagents"`，用户显式要求并行时使用 `trigger: "user_requested"`；native subagent 不可用时输出 `user_orchestrated` worker prompt。
10. 宣布阶段完成前运行 `make test-all`。
11. 测试阶段一次只执行一个 `TASK-*` task。

## 完成检查

- [ ] Test matrix 已把需求映射到测试。
- [ ] 当前测试工作已绑定 `plan.yaml` 中一个最小 `TASK-*` task，并设置 `phase: "TESTING"`。
- [ ] 当前 task 已从 `plan.yaml` 移除，或因中断/blocker 保留为可恢复 open task。
- [ ] Regression checklist 已完成。
- [ ] 测试只调用既有 runnable entry/exit；未在 TESTING 中新增 product runtime、bootstrap、provider adapter、deploy 或 package runtime script。
- [ ] 已核对 implementation doc 中的 Development Evidence、Evidence Level、Target Runtime Environment 和 Testing Handoff Contract，并只基于已交付入口设计测试。
- [ ] 已核对 Development Self-Test Report 中 scenario results、executed gates、Module Key Test Path 和 actual evidence。
- [ ] 已判断 test report / test matrix 的语义切片边界。
- [ ] 未把测试计划、测试用例或待填内容写成 `TEST_REPORT.md`。
- [ ] 已确认 `.docs/07_test/**` 只包含当前方案仍有效的测试事实。
- [ ] Coverage gaps 已明确。
- [ ] 如果启用了并行测试，worker evidence 已由主 Agent 汇总到测试产物。
- [ ] 已运行 `make docs-overview` 刷新 `.docs/<stage>/overview.md`。
- [ ] Final decision 是 `PASS` 或 `BLOCKED`。
- [ ] `make validate-test` 准备通过。
