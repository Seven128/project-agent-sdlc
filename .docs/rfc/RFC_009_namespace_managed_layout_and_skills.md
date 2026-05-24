# RFC_009: 为 managed layout 和 workflow skills 增加 pjsdlc 前缀

## 1. 背景

此前只为 `AGENTS.md`、`Makefile` 等桥接文件的 managed block marker 增加了 `pjsdlc` namespace，但用户的原始意图是让工作流目录和 Skill 标识本身也带有 `pjsdlc` 前缀，从文件系统层面降低与用户项目配置、用户自定义 Skill 或其它工具约定冲突的概率。

当前布局仍使用 `<harnessRoot>/managed/**` 和 `<harnessRoot>/skills/<skill_name>/SKILL.md`。这会让包拥有的工作流配置与用户可能自建的通用目录名混在一起。需要改成更明确的 package namespace：

- `<harnessRoot>/managed/**` -> `<harnessRoot>/pjsdlc_managed/**`
- `<harnessRoot>/skills/<workflow_skill>/SKILL.md` -> `<harnessRoot>/skills/pjsdlc_<workflow_skill>/SKILL.md`

根 `Makefile` 是用户仓库的命令入口桥接文件，不是包拥有的 canonical target 文件。包拥有的默认 targets 位于 `<harnessRoot>/pjsdlc_managed/make/sdlc-harness.mk`。在当前工作流仍以 `make validate-*` 作为阶段 gate 的情况下，根 `Makefile` 不应直接删除；后续若 CLI 覆盖完整 gate 命令，可再将根 `Makefile` 改为 create-if-missing 或 optional。

## 2. 变更内容（Change Content）

- Added:
  - `<harnessRoot>/pjsdlc_managed/**` 作为 package-managed workflow config canonical directory。
  - `pjsdlc_` Skill folder/name 前缀，覆盖通用阶段 workflow skills。
  - migration 兼容：旧 `<harnessRoot>/managed/**` config path 和旧 Skill name/path 映射到新命名。
- Changed:
  - phase contracts、lifecycle `active_skill`、init default state 和 validators 使用 `pjsdlc_*` Skill 名称。
  - sync/config/source mapping 改为 `<harnessRoot>/pjsdlc_managed/**`。
  - 根 `Makefile` include path 改为 `<harnessRoot>/pjsdlc_managed/make/sdlc-harness.mk`。
  - README、PRD、技术方案同步新的命名边界。
- Removed:
  - tracked `<harnessRoot>/managed/**` canonical source。
- Unchanged:
  - CLI binary 仍为 `sdlc-harness`。
  - npm package 仍为 `agent-project-sdlc`。
  - 根 `Makefile` 仍保留为用户仓库桥接入口，只维护 include block，不全量覆盖用户 target。
  - `.agent/state/**`、`.docs/**` 仍为项目事实源，不由包覆盖。

## 3. Product Impact（产品影响）

| 受影响 PRD（Affected PRD） | 影响（Impact） |
|---|---|
| `.docs/01_product/npm_package_distribution.md` | 将 package-managed workflow config 从 `<harnessRoot>/managed/**` 改为 `<harnessRoot>/pjsdlc_managed/**`；将 workflow Skill 名称改为 `pjsdlc_*`；说明根 `Makefile` 是桥接入口。 |

## 4. Technical Impact Candidates（技术影响候选）

| 模块（Module） | 影响（Impact） | 置信度（Confidence） |
|---|---|---|
| `.agent/pjsdlc_managed/**` | 承接 templates、policies、make targets。 | high |
| `.agent/skills/pjsdlc_*/SKILL.md` | Skill folder 和 frontmatter `name` 需要同步改名。 | high |
| `.agent/state/lifecycle.yaml` | `active_skill` 需要改为 `pjsdlc_dev_sprint`。 | high |
| `.agent/pjsdlc_managed/policies/phase_contracts.yaml` | 所有 phase `skill` 改为 `pjsdlc_*`。 | high |
| `tools/*.py` | 读取 policies/templates 的路径改为 `.agent/pjsdlc_managed/**`。 | high |
| `packages/sdlc-harness/src/lib/*.ts` | default config、sync、migration、validators、init state 改为新路径和新 Skill 名。 | high |
| `tests/sdlc-harness/**` | 更新 init/sync/upgrade/package-source/validator 断言。 | high |
| `Makefile` | include path 改为 `.agent/pjsdlc_managed/make/sdlc-harness.mk`。 | high |

## 5. Acceptance Criteria

- [ ] 当前仓库不再 tracked `.agent/managed/**`，改为 `.agent/pjsdlc_managed/**`。
- [ ] workflow Skill 目录和 frontmatter `name` 都使用 `pjsdlc_` 前缀。
- [ ] lifecycle、phase contracts、init default state 和 validators 使用 `pjsdlc_*` Skill 名称。
- [ ] `sync/init/upgrade` 生成 `<harnessRoot>/pjsdlc_managed/**`，并能迁移旧 `<harnessRoot>/managed/**` 配置路径。
- [ ] 根 `Makefile` 只作为桥接入口保留，并 include `<harnessRoot>/pjsdlc_managed/make/sdlc-harness.mk`。
- [ ] `npm test`、`package check-source`、`make validate-harness`、`make validate-current` 通过。

## 6. Regression Requirements（回归要求）

- [ ] 覆盖默认 init 生成 `.agent/pjsdlc_managed/**` 与 `.agent/skills/pjsdlc_manager/SKILL.md`。
- [ ] 覆盖配置 `.harness` root 时生成 `.harness/pjsdlc_managed/**`。
- [ ] 覆盖旧 `.harness/managed/**` config migration 到 `.harness/pjsdlc_managed/**`。
- [ ] 覆盖 `phase_contracts.yaml` skill 映射到 `pjsdlc_*`。
- [ ] 覆盖根 Makefile include 新路径且保留项目自定义 target。

## 7. Status

- Status: APPLIED
