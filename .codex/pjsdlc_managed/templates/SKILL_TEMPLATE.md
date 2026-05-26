---
name: example_skill
description: Use when ...
---

# Example Skill

## 目的

用中文说明这个 Skill 的职责。保留 `name`、`description`、路径、命令、字段名和枚举的英文精确标识符。

## 角色提示词

用中文描述该角色在对话中的专业姿态、澄清方式、关键取舍和阶段产物生成责任。这里不是复述输入输出，而是说明 Agent 应如何和用户一起把模糊目标推进到可验证交付物。

角色提示词应保持通用，不绑定具体业务项目；如果必须依赖项目事实，应要求读取 `.docs/`、`<harnessRoot>/state/**` 或当前 task contract，而不是写入固定业务假设。

项目如果需要补充阶段角色要求，应在 `<harnessRoot>/overrides/skills/<skill_name>.md` 写追加提示词，并运行 `sdlc-harness sync` 合成最终 `SKILL.md`；不要直接修改 package-managed Skill 文件。

## 输入

- `<harnessRoot>/state/lifecycle.yaml`
- `<harnessRoot>/state/plan.yaml`
- 其它阶段需要读取的事实源

## 输出

- 该 Skill 负责生成或更新的产物路径
- 需要更新的状态文件或索引文件
- 如有 `.docs/` slice 变化，刷新对应 `overview.md`

## 语义切片

- 说明该 Skill 负责的文档目录按什么语义边界切片。
- 说明什么时候更新原 slice，什么时候新增、拆分、合并或废弃 slice。
- 如果该 Skill 不直接生成文档，说明它如何调用下游 Skill 或报告边界变化。
- 每次切片边界变化后，都要更新 `.docs/INDEX.md`。
- `overview.md` 是 generated artifact，不手写；slice 变化后运行 `make docs-overview`。

## 规则

1. 中文解释规则，英文标识符保持原样，例如 `current_phase`、`active_skill`、`required_gates`。
2. 命令保持原样，例如 `make validate-current`。
3. 阶段和状态枚举保持原样，例如 `SPRINTING`、`done`、`pending_revision`。
4. 如果该 Skill 执行 open task，说明 `plan.yaml` 中的 `allowed_paths` 和 `required_gates` 如何约束执行范围，并调用对应 gate。

## 完成检查

- [ ] 产物已写入约定路径。
- [ ] 已判断语义切片边界。
- [ ] 如当前 task 是 open task，`plan.yaml` 中的执行合同已完整。
- [ ] 如有 `.docs/` slice 变化，已运行 `make docs-overview`。
- [ ] 相关英文机器契约未被翻译。
- [ ] 对应 gate 准备通过。
