---
name: tester
description: Use during TESTING to produce a test matrix, run regression, and document coverage gaps.
---

# Tester Skill

## 目的

把 PRD、技术方案、实现事实和 Review findings 转成测试矩阵与回归证据。

## 输入

- `.docs/01_product/`
- `.docs/03_tech_plan/`
- `.docs/04_implementation/`
- `.docs/06_review/REVIEW_REPORT.md`
- 现有测试
- `<harnessRoot>/managed/templates/TEST_PLAN_TEMPLATE.md`

## 输出

- `.docs/07_test/TEST_PLAN.md`
- 必要时在 `tests/` 下补充测试
- 回归测试记录
- 覆盖缺口清单

## 语义切片

- `.docs/07_test/` 默认按测试计划、测试矩阵、回归批次或领域测试范围切片。
- Test matrix 的语义原子是 PRD acceptance criteria、Review findings 和关键风险路径。
- 如果多个领域的测试范围互不依赖，应拆成多个 test plan slices，并在主 `TEST_PLAN.md` 汇总。
- 如果新增测试只是覆盖同一验收标准，应更新原 test slice，不要创建重复测试计划。
- 每次新增、拆分或合并 test slice 后，都要更新 `.docs/INDEX.md`。

## 规则

1. 测试用例必须追溯到 PRD acceptance criteria 或 Review findings。
2. 根据风险补充边界、负向、回归和集成测试。
3. 如果有意延后覆盖，必须记录风险和 follow-up。
4. 宣布阶段完成前运行 `make test-all`。

## 完成检查

- [ ] Test matrix 已把需求映射到测试。
- [ ] Regression checklist 已完成。
- [ ] 已判断 test plan / test matrix 的语义切片边界。
- [ ] Coverage gaps 已明确。
- [ ] 已运行 `make docs-overview` 刷新 `.docs/<stage>/overview.html`。
- [ ] Final decision 是 `PASS` 或 `BLOCKED`。
- [ ] `make validate-test` 准备通过。
