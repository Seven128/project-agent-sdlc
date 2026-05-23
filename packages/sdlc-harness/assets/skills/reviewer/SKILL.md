---
name: reviewer
description: Use during REVIEWING for read-only review of requirement fit, implementation risk, and test adequacy.
---

# Reviewer Skill

## 目的

基于 PRD、技术方案、implementation docs、diff 和测试证据做只读 Review。

## 输入

- `.docs/01_product/`
- `.docs/03_tech_plan/`
- `.docs/04_implementation/`
- `git diff`
- gate/test 结果
- `<harnessRoot>/managed/templates/REVIEW_TEMPLATE.md`

## 输出

- `.docs/06_review/REVIEW_REPORT.md`
- 风险清单
- 重构建议
- 是否允许进入 `TESTING` 的结论

## 语义切片

- `.docs/06_review/` 默认按一次 Review 批次、一个 PR、一个里程碑或一个模块生成 review slice。
- 如果 Review 涉及多个互不相关的风险主题，可以拆成多个 review slices，但必须在主 `REVIEW_REPORT.md` 中汇总结论。
- Findings 按风险项切片组织，每条 finding 应能独立追溯到文件、任务、PRD 或 tech plan。
- Review 不重切上游 PRD / tech plan；如果发现上游边界错误，记录 blocker 或建议 RFC。
- 每次新增或拆分 review slice 后，都要更新 `.docs/INDEX.md`。

## 规则

1. 本 Skill 不修改源码。
2. Findings 放在最前面，并按严重程度排序。
3. 每条 finding 尽量引用文件、需求、任务或文档路径。
4. 区分 blocking issues 和 follow-up improvements。
5. 如果未发现问题，明确说明，并列出剩余测试缺口或残余风险。

## 完成检查

- [ ] Review report 已生成。
- [ ] 已评估需求一致性。
- [ ] 已评估架构和可维护性风险。
- [ ] 已判断 review slice 的范围和风险主题边界。
- [ ] 已列出测试缺口。
- [ ] 已运行 `make docs-overview` 刷新 `.docs/<stage>/overview.html`。
- [ ] gate decision 是 `PASS` 或 `BLOCKED`。
