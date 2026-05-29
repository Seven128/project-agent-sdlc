# RFC_020: Application readiness gates

## 1. 背景

`RFC_019` 已经把 SPRINTING 的 runnable entry/exit 提升为结构化 `Development Evidence`，但实际执行仍可能把 provider smoke、fixture smoke 或 fake adapter 链路误判为“应用已经交付”。这会让开发阶段提前完成，随后 REVIEWING / TESTING 被迫处理本应由开发阶段交付的 product runtime、稳定入口、出口和初始化证据。

本 RFC 将“应用就绪（Application readiness）”定义为开发阶段硬边界：如果技术方案或 task 承诺 service、agent、runtime、HTTP、CLI、worker、provider、adapter、live mode 或 external integration，开发完成前必须交付对应可调用入口、可观察出口、初始化、配置契约和基础自测证据；否则应 `BLOCKED` 或回到 SPRINTING/RFC。

## 2. 变更内容（Change Content）

- Added: smoke evidence taxonomy，包括 `unit test`、`domain smoke`、`provider live smoke`、`runtime HTTP smoke`、`application readiness`、`external integration smoke`。
- Changed: `validate-dev` 要求 `Development Evidence` 包含 `Runnable Entry`、`Observable Exit`、`Client / Server Initialization`、`Config Contract`、`Basic Self-test Evidence`，或带原因的 `Not applicable`。
- Changed: 对 service / agent / runtime / live mode 类 task，仅有 provider smoke、fixture smoke、fake adapter 或 one-shot smoke 不足以通过 application readiness。
- Changed: `validate-review` 要求结构化 readiness checklist，任一 `BLOCKED` 不允许进入 TESTING。
- Changed: `validate-test` 不允许把缺少 entry/exit 或 Development Evidence 的当前状态写成 `PASS` 报告；缺口存在时只能 `BLOCKED`。
- Unchanged: 不新增 gate 名称，继续使用 `validate-dev`、`validate-review`、`validate-test`。

## 3. Product Impact（产品影响）

| 受影响 PRD（Affected PRD） | 影响（Impact） |
|---|---|
| `.docs/01_product/npm_package_distribution.md` | 阶段 gate 的 public behavior 更严格，减少 smoke 被误判为应用交付。 |
| `README.md` / `packages/sdlc-harness/README.md` | 需要说明 SPRINTING、REVIEWING、TESTING 的 application readiness 边界。 |

## 4. Technical Impact Candidates（技术影响候选）

| 模块（Module） | 影响（Impact） | 置信度（Confidence） |
|---|---|---|
| Package validators | 收紧 `validate-dev`、`validate-review`、`validate-test` 的文档语义检查。 | high |
| Source validators | 同步 Python validator，避免源码和 package CLI 漂移。 | high |
| Workflow skills/templates | Dev、Review、Tester、Implementation Doc prompts 和模板更新 evidence/checklist 字段。 | high |
| Package assets | 通过 `package sync-source` 同步 managed skills、templates、README docs asset。 | high |
| Regression tests | 增加 provider/fake smoke、缺少 initialization/config、review blocked、test PASS misuse 覆盖。 | high |

## 5. Acceptance Criteria

- [ ] `validate-dev` 拒绝缺少 `Client / Server Initialization` 或 `Config Contract` 的当前 dev task implementation doc。
- [ ] `validate-dev` 对 runtime/service/agent/live task 拒绝仅 provider smoke、fixture smoke、fake adapter 或 one-shot smoke 的证据，除非明确 `BLOCKED`。
- [ ] `validate-review` 要求 readiness checklist 中的 `Runnable Entry`、`Observable Exit`、`Initialization`、`Config Contract`、`Testing Handoff Readiness`，并拒绝任一 `BLOCKED` 的 Review PASS。
- [ ] `validate-test` 拒绝把 missing entry/exit、missing Development Evidence 或 no runnable boundary 写成 `PASS`。
- [ ] 通用 Skill、模板、package assets、README 和 implementation doc 同步到新语义。

## 6. Regression Requirements（回归要求）

- [ ] `npm test --workspace agent-project-sdlc`
- [ ] `node packages/sdlc-harness/dist/cli.js package sync-source`
- [ ] `node packages/sdlc-harness/dist/cli.js package check-source`
- [ ] `make docs-overview`
- [ ] `make validate-harness`
- [ ] `make validate-dev`

## 7. Test Fact Source Impact（测试事实源影响）

- Reviewed test docs: `.docs/07_test/TEST_REPORT.md`, `.docs/07_test/harness_consumer_lab.md`
- Superseded test docs: none
- Retained test docs: `.docs/07_test/TEST_REPORT.md`, `.docs/07_test/harness_consumer_lab.md`
- Reason: 本 RFC 强化 workflow gate 语义，不替换当前测试事实源；旧路线测试结果仍由 `RFC_017` 的 supersede 清理规则约束。

## 8. Status

- Status: APPLIED
