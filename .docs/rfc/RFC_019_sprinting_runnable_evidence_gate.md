# RFC_019: SPRINTING runnable evidence gate

## 1. 背景

微信 AI 业务员机器人 RFC 后，开发阶段先完成了领域对象、adapter、worker、测试和实现文档，但没有把模块或应用的完整入口与出口作为硬性完成条件。结果是 Agent 容易把“代码有测试、文档有记录”误判为“开发完成”，而 TESTING 阶段可能被迫补 runtime、入口、初始化或发送后校验。

现有 `RFC_017` / `RFC_018` 已经收紧 TESTING 报告语义和 direct `validate-dev` open-task 语义，但 `validate-dev` 对 runnable entry/exit 仍偏关键词检查。Harness 需要把 SPRINTING DoD 提升为结构化证据 gate。

## 2. 变更内容（Change Content）

- Added: implementation doc 模板新增 `Development Evidence` 小节。
- Added: `validate-dev` 对当前 open `SPRINTING` task 的 `implementation_doc` 检查 `Runnable Entry`、`Observable Exit`、`Basic Self-test Evidence`，或带原因的 `Not applicable`。
- Added: 页面类任务要求 dev server/page URL 和 browser/Playwright/screenshot/equivalent interaction evidence。
- Added: API/CLI/worker/RPA 类任务要求 command/endpoint/invocation 和 response/output/side effect/PASS evidence。
- Changed: Dev、Implementation Doc、Review、Tester prompts 把 Development Evidence 作为进入 REVIEWING/TESTING 前的硬边界。
- Unchanged: TESTING 只调用既有 entry/exit 做验证；缺失入口、出口或 Development Evidence 时继续 `BLOCKED`，不在 TESTING 补 runtime。

## 3. Product Impact（产品影响）

| 受影响 PRD（Affected PRD） | 影响（Impact） |
|---|---|
| `.docs/01_product/npm_package_distribution.md` | 增加 `validate-dev` 的 public behavior：当前 dev task 必须有结构化 Development Evidence。 |
| `README.md` / `PROJECT_SPEC.md` / `packages/sdlc-harness/README.md` | 对外说明 SPRINTING DoD 和 direct dev gate 的新证据要求。 |

## 4. Technical Impact Candidates（技术影响候选）

| 模块（Module） | 影响（Impact） | 置信度（Confidence） |
|---|---|---|
| Package validators | `validate-dev` 对当前 task implementation doc 增加结构化证据检查。 | high |
| Workflow skills/templates | Dev、Implementation Doc、Review、Tester prompts 和模板新增 Development Evidence 约束。 | high |
| Package assets | 通过 `package sync-source` 同步 managed skills、templates、policies 和 README docs asset。 | high |
| Tests | 增加 validator regression 覆盖缺失 evidence、placeholder、页面证据和 callable 证据。 | high |

## 5. Acceptance Criteria

- [x] 缺少 `Development Evidence` 的当前 dev task implementation doc 被 `validate-dev` 拒绝。
- [x] 空模板、placeholder、缺少 `Observable Exit` 或缺少 `Basic Self-test Evidence` 被 `validate-dev` 拒绝。
- [x] 合法带原因的 `Not applicable` 被 `validate-dev` 接受。
- [x] 页面类任务缺少 dev server/page URL 或 browser check 被 `validate-dev` 拒绝。
- [x] API/CLI/worker 类任务有 invocation 与 observable result 时被 `validate-dev` 接受。

## 6. Regression Requirements（回归要求）

- [x] `npm test --workspace agent-project-sdlc`
- [x] `node packages/sdlc-harness/dist/cli.js package sync-source`
- [x] `node packages/sdlc-harness/dist/cli.js package check-source`
- [ ] `make validate-rfc`
- [x] `make validate-harness`

## 7. Test Fact Source Impact（测试事实源影响）

- Reviewed test docs: `.docs/07_test/TEST_REPORT.md`, `.docs/07_test/harness_consumer_lab.md`
- Superseded test docs: none
- Retained test docs: `.docs/07_test/TEST_REPORT.md`, `.docs/07_test/harness_consumer_lab.md`
- Reason: 本 RFC 强化 SPRINTING gate，不替换当前 TESTING 事实源。

## 8. Status

- Status: APPLIED
