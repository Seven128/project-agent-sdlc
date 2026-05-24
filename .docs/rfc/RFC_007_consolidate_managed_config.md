# RFC_007: 收敛工作流配置到 managed 目录

## 1. 背景

当前 `.agent/managed/policies/**` 与 `.agent/policies/**` 内容重复，`.agent/managed/templates/**` 与 `.agent/templates/**` 内容重复。实际工具仍读取 `.agent/policies/**`，导致 package-managed 配置区和 runtime 读取路径之间存在事实源歧义。

用户明确希望：除 `skills` 以外，工作流相关的配置都放到 `.agent/managed/**`；`skills` 维持 `.agent/skills/<skill_name>/SKILL.md` 硬索引，避免层级过深导致 Agent 或工具无法发现。

## 2. 变更内容（Change Content）

- Added:
  - DEV-021 增量任务，用于删除 legacy mirrors 并让工具读取 `.agent/managed/**`。
- Changed:
  - policy runtime path 从 `.agent/policies/**` 改为 `.agent/managed/policies/**`。
  - template runtime path 从 `.agent/templates/**` 改为 `.agent/managed/templates/**`。
  - 根 `Makefile` 保留为用户入口，后续应只通过 managed include block 接入 `.agent/managed/make/sdlc-harness.mk`。
- Removed:
  - `.agent/policies/**` legacy mirror。
  - `.agent/templates/**` legacy mirror。
- Unchanged:
  - `.agent/skills/<skill_name>/SKILL.md` 继续作为 skill hard index。
  - `.agent/state/**` 和 `.docs/**` 仍是项目事实源，不被 sync/upgrade 覆盖。

## 3. Product Impact（产品影响）

| 受影响 PRD（Affected PRD） | 影响（Impact） |
|---|---|
| `.docs/01_product/npm_package_distribution.md` | 明确除 skills 外的工作流配置位于 `<harnessRoot>/managed/**`，legacy `.agent/policies` / `.agent/templates` 不再作为事实源。 |

## 4. Technical Impact Candidates（技术影响候选）

| 模块（Module） | 影响（Impact） | 置信度（Confidence） |
|---|---|---|
| `tools/*.py` | validators、transition、allowed path、prompt language 等工具读取 `.agent/managed/policies/**`。 | high |
| `.agent/policies/**` / `.agent/templates/**` | 删除重复 mirror。 | high |
| `AGENTS.md` / `README.md` | 更新路径说明，避免继续引用 legacy mirrors。 | high |
| `packages/sdlc-harness/assets/**` | 同步 AGENTS core、skills、templates、policies、Makefile assets。 | high |
| `tests/sdlc-harness/**` | 更新 init/doctor/validator 测试对路径的期望。 | high |

## 5. Acceptance Criteria

- [x] `skills` 保持 `.agent/skills/<skill_name>/SKILL.md`。
- [ ] 工具和 validators 不再读取 `.agent/policies/**` 或 `.agent/templates/**`。
- [ ] `.agent/policies/**` 和 `.agent/templates/**` 从 tracked workspace 删除。
- [ ] `AGENTS.md`、README、PRD、技术方案说明 managed canonical layout。
- [ ] `npm test`、`package check-source`、`make validate-harness` 和 `make validate-current` 通过。

## 6. Regression Requirements（回归要求）

- [ ] 覆盖 `validate-current` 通过 `.agent/managed/policies/phase_contracts.yaml` 查找阶段 gate。
- [ ] 覆盖 `validate_allowed_paths` 通过 `.agent/managed/policies/allowed_paths.yaml` 校验 open task。
- [ ] 覆盖 package source drift check，确认包内 assets 与 workspace facts 一致。
- [ ] 确认 `.agent/skills/**` 仍可由 `active_skill` 映射。

## 7. Status

- Status: APPLIED
