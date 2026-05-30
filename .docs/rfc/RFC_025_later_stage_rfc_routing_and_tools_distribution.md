# RFC_025: REVIEWING 之后的 RFC 路由与 tools 分发修复

## 1. 背景

用户反馈指出：较老项目进入 `REVIEWING` 后，如果发现需要通过 RFC 回补 `Development Self-Test Contract`、`Development Self-Test Report`、entry/exit、handoff 或可观测完成证据，当前用户侧 `tools/transition.py` 可能只允许切到 `lifecycle.yaml#allowed_next_phases`，导致 `python3 tools/transition.py --to RFC_RECALIBRATION` 被阻断。

规则层已经要求 `SPRINTING` 之后的需求或设计变化进入 RFC workflow，且 `REVIEWING` / `TESTING` / `RELEASING` 发现开发自测产物缺失时应回到 `SPRINTING/RFC`，不能让后续阶段补 runtime 或补开发交付物。状态机和 package 分发必须让旧项目能通过标准升级拿到修复版 `tools/transition.py`。

## 2. 变更内容（Change Content）

- Changed: `RFC_RECALIBRATION` 明确作为受控中断阶段，只允许从 `SPRINTING`、`REVIEWING`、`TESTING` 和 `RELEASING` 进入；`--force` 继续作为显式逃生口。
- Changed: 从后续阶段进入 RFC 时记录 `suspended_phase`，切换到 `active_role: "rfc_owner"` / `active_skill: "pjsdlc_rfc_recalibrate"`，并将 `allowed_next_phases` 设为 `SPRINTING`。
- Changed: RFC 完成后通过 `RFC_RECALIBRATION -> SPRINTING` 恢复开发阶段，并清理 stale `suspended_phase`，由 SPRINTING 重新完成开发自测、implementation doc 和 Review/Testing handoff。
- Added: npm package 将用户侧 Harness Python tools 作为 managed assets 分发，`sdlc-harness init/sync/upgrade` 能写入或更新项目根目录 `tools/*.py`，使旧项目获得新版 `tools/transition.py`。
- Changed: package source sync、upgrade config migration、consumer lab 和 package tests 覆盖 tools 分发链路。

## 3. Product Impact（产品影响）

| 受影响 PRD（Affected PRD） | 影响（Impact） |
|---|---|
| `.docs/01_product/npm_package_distribution.md` | package 能力从分发 workflow skills/policies/templates/Makefile 扩展为同时分发用户侧 Python workflow tools，保证旧项目能拿到 transition 修复。 |
| `README.md` / `packages/sdlc-harness/README.md` / `PROJECT_SPEC.md` | 对外说明 `tools/**` 是 package-managed Harness 资产，以及 `RFC_RECALIBRATION` 可从 `SPRINTING` 及后续阶段进入。 |

## 4. Technical Impact Candidates（技术影响候选）

| 模块（Module） | 影响（Impact） | 置信度（Confidence） |
|---|---|---|
| Lifecycle transition helper | 限制 RFC 中断来源，补充 `suspended_phase` 清理和后续阶段 RFC 回归测试。 | high |
| Package source sync and assets | 增加 `tools/*.py` source mapping，排除 authoring-only `.mjs` tools。 | high |
| Init / sync / upgrade | 默认 config 和旧 config migration 增加 `tools` managed file，sync materializes package tools。 | high |
| Consumer lab | missing `tools/**` 不再作为 lifecycle transition known blocker，改为验证 transition tools 可用。 | high |
| Documentation / implementation facts | 更新 README、package README、PROJECT_SPEC 和 implementation docs，并刷新 generated overviews。 | high |

## 5. Acceptance Criteria

- [x] 从 `REVIEWING` 执行 `python3 tools/transition.py --to RFC_RECALIBRATION` 不被阻断。
- [x] 从 `TESTING` 和 `RELEASING` 进入 `RFC_RECALIBRATION` 同样合法。
- [x] `REQUIREMENT_GATHERING` / `ARCHITECTING` 不可直接进入 `RFC_RECALIBRATION`，除非显式 `--force`。
- [x] 进入 RFC 时 `suspended_phase` 记录原阶段，RFC 的 `allowed_next_phases` 为 `SPRINTING`。
- [x] `RFC_RECALIBRATION -> SPRINTING` 后清理 stale `suspended_phase`。
- [x] `REVIEWING -> TESTING` 等正常阶段流转仍然可用。
- [x] `sdlc-harness init/sync/upgrade` 能把新版 `tools/transition.py` 分发或更新到用户项目。
- [x] package source check 能发现 `tools/*.py` asset drift。

## 6. Regression Requirements（回归要求）

- [x] `npm test --workspace agent-project-sdlc`
- [x] `node packages/sdlc-harness/dist/cli.js package sync-source`
- [x] `node packages/sdlc-harness/dist/cli.js package check-source`
- [x] `make docs-overview`
- [x] `make validate-harness`
- [x] `make validate-rfc`

## 7. Test Fact Source Impact（测试事实源影响）

- Reviewed test docs: `.docs/07_test/TEST_REPORT.md`, `.docs/07_test/harness_consumer_lab.md`
- Superseded test docs: none
- Retained test docs: `.docs/07_test/TEST_REPORT.md`, `.docs/07_test/harness_consumer_lab.md`
- Reason: 本 RFC 修复 workflow routing 和 package tools 分发，不替换现有 TESTING 事实源；consumer lab 当前 missing-tools blocker 将在实现后更新为通过或新的失败证据。

## 8. Development Self-Test Impact（开发自测影响）

- Entry/exit impact: 用户侧 lifecycle transition 入口 `python3 tools/transition.py --to RFC_RECALIBRATION` 必须在 `SPRINTING`、`REVIEWING`、`TESTING`、`RELEASING` 可运行；package `init/sync/upgrade` 必须能 materialize `tools/transition.py`。
- Runtime / target environment impact: 本变更面向本地 CLI / Python toolchain 和 npm package consumer runtime，不新增外部服务依赖。
- Required gates impact: 保留 `make validate-rfc` 作为 RFC 阶段出口 gate；实现 task 需要 package tests、source sync/check、docs overview 和 Harness validation。
- Tech plan self-test contract impact: 不重切现有 tech plan；实现 task 的 `self_test_contract` 直接覆盖 package init/sync/upgrade 和 transition helper 的本地 CLI 路径。
- `plan.yaml` / `plan.draft.yaml` task contract impact: 后续 SPRINTING task 需要声明 tools distribution 与 RFC routing 的自测合同、required gates 和 implementation doc。
- Implementation doc self-test report impact: implementation doc 需要记录 transition matrix、package tools materialization、consumer lab blocker 更新和 executed gates。
- Module Key Test Path: 从 `npm test --workspace agent-project-sdlc` 启动 package regression，覆盖 source mapping、init/sync/upgrade materialization、transition helper fixture 和 consumer lab static checks；直接调用 `python3 tools/transition.py` fixture 验证后续阶段进入 RFC、RFC 回 SPRINTING、正常 REVIEWING -> TESTING 不回归。
- Review / Testing handoff impact: Review/Testing 可直接检查 `tools/transition.py`、package assets、consumer lab 报告和 implementation doc evidence；不要求 TESTING 阶段补开发自测产物。

## 9. Status

- Status: APPLIED
