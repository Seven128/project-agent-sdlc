# RFC_016: Consume Plan Draft Tasks On Promote

## 1. 背景

用户反馈指出，`plan.draft.yaml` 的语义和开发阶段执行行为存在不一致：架构阶段生成的 `DEV-*`
开发草案被 promote 成 `plan.yaml` 中的正式 `TASK-*` 并完成后，原 draft 仍以 `status: pending`
留在 `plan.draft.yaml.tasks[]`。这会让 `plan.yaml`、代码、implementation docs 和 git commits
显示开发已完成，但 `plan.draft.yaml` 仍像是有大量真实待办。

## 2. 变更内容（Change Content）

- Added: `validate-dev` 增加 stale draft 检查，完成态不得保留 `plan.draft.yaml.tasks[]`。
- Changed: `/dev` 和 `/devloop` 采用“promote 即消费”规则，draft 转正式 `TASK-*` 时同时从 `plan.draft.yaml.tasks[]` 删除。
- Changed: `SPRINTING` allowed paths 允许主 Agent 修改 `<harnessRoot>/state/plan.draft.yaml`，用于消费 draft。
- Changed: Skill、协议文档、README、package validator 和 consumer lab 测试同步描述 draft、active plan 和历史事实源边界。
- Removed: 当前仓库中已被实现事实覆盖的历史 `DEV-001` pending draft。
- Unchanged: 不新增 `adopted_tasks` ledger；完成历史仍由 implementation docs、git/PR/CI 记录承担。

## 3. Product Impact（产品影响）

| 受影响 PRD（Affected PRD） | 影响（Impact） |
|---|---|
| `.docs/01_product/npm_package_distribution.md` | 改善 AI SDLC Harness 用户对开发完成状态的判断，避免 stale draft 被误认为真实待办。 |

## 4. Technical Impact Candidates（技术影响候选）

| 模块（Module） | 影响（Impact） | 置信度（Confidence） |
|---|---|---|
| State and task protocol | 明确 `plan.draft.yaml.tasks[]` 只保存未采用草案，正式 task 恢复点只在 `plan.yaml`。 | high |
| Workflow Skills and policies | `pjsdlc_dev_sprint`、`pjsdlc_manager`、`allowed_paths` 和 phase/gate 文案需要描述 draft 消费规则。 | high |
| Validators | Python `make validate-dev` 和 package `validate-dev` 需要拒绝完成态残留 pending draft。 | high |
| Package assets and docs | 通用源变更需要通过 `package sync-source` 同步到 npm package assets。 | high |
| Tests and consumer lab | package validator tests 和 consumer lab 需要覆盖 stale draft negative case。 | high |
| Migrations | 不自动迁移删除用户项目 draft，避免误删真实未采用草案。 | high |

## 5. Acceptance Criteria

- [ ] `plan.draft.yaml.tasks[]` 明确表示未采用开发草案。
- [ ] `/dev` promote draft 时创建正式 `TASK-*` 并同次删除源 draft。
- [ ] `validate-dev` 在无 open task 时拒绝残留 draft tasks。
- [ ] 当前仓库 stale `DEV-001` draft 被清理。
- [ ] README、PROJECT_SPEC、Skill、package assets、测试和 implementation doc 同步更新。

## 6. Regression Requirements（回归要求）

- [ ] `make validate-dev` 在 `plan.yaml` 空且 `plan.draft.yaml` 有 pending draft 时失败。
- [ ] 清空已消费 draft 后 `make validate-dev` 通过。
- [ ] `npm test --workspace agent-project-sdlc` 覆盖 package validator stale draft 场景。
- [ ] `node packages/sdlc-harness/dist/cli.js package check-source` 证明 assets 未漂移。
- [ ] `make validate-harness` 通过，证明 generated overview 和 prompt language 契约仍一致。

## 7. Status

- Status: APPLIED
