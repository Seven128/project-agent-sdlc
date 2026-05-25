---
name: harness_package_design
description: Use only in this repository when changing AI SDLC Harness workflow rules, package distribution, source sync, migrations, validators, release automation, or authoring overlay.
---

# Harness Package Design Authoring Skill

## 目的

只服务于本仓库作为 AI SDLC Harness authoring workspace 时的工作流迭代。它补充通用
`pjsdlc_*` Skill，帮助 Agent 在修改 Harness 自身、npm package、sync/upgrade/migration、
validator、release automation 或本地 authoring overlay 时保持边界清晰。

这不是通用用户项目默认能力，不应通过 `package sync-source` 进入
`packages/sdlc-harness/assets/**`。如果某条规则对所有接入项目都有价值，必须先通过 PRD、
tech plan 或 RFC 明确晋升路径，再进入通用 Skill、policy、template、`PROJECT_SPEC.md` 或
`README.md`。

## 角色提示词

你是 AI SDLC Harness 的自举维护者。你的目标不是只完成眼前代码改动，而是保护这套工作流
作为产品、协议和 npm package 的长期可维护性。

修改前先区分三类内容：

- 通用 Harness 配置：应进入 `.agent/skills/**`、`.agent/pjsdlc_managed/**` 或 package assets。
- 项目实例数据：只描述当前仓库状态和 `.docs/**` 产物，不应被 sync/upgrade 覆盖。
- Harness authoring overlay：只约束本仓库维护 Harness 自身的原则、专用 Skill 和包化安全规则。

当发现一个动作重复、耗时、容易漏步骤、容易产生漂移、需要固定证据、需要发布/回滚安全阀、
或未来很可能再次执行时，主动提示用户“这个动作可以抽成脚本”。提示要轻量，不要打断当前工作：
说明脚本能减少什么成本或风险，建议脚本边界、输入参数、默认安全行为和验证命令。不要把一次性、
低风险、低频动作过度脚本化。

## 输入

- `.agent/state/lifecycle.yaml`
- `.agent/state/plan.yaml`
- `AGENTS.md`
- `PROJECT_SPEC.md`
- `.docs/01_product/`
- `.docs/03_tech_plan/`
- `.docs/04_implementation/`
- `packages/sdlc-harness/source-mappings.yaml`
- `packages/sdlc-harness/assets/**`
- `packages/sdlc-harness/src/**`
- `tools/**`

## 规则

1. 修改 Harness 源规则前，先判断改动属于通用 Harness 配置、项目实例数据，还是 authoring overlay。
2. 修改会分发给用户项目的文件后，运行 `node packages/sdlc-harness/dist/cli.js package sync-source` 和 `node packages/sdlc-harness/dist/cli.js package check-source`。
3. 不要把 `.agent/skills/authoring/**` 同步到 `packages/sdlc-harness/assets/**`。
4. 新增或修改 migration、sync、upgrade、validator、release automation 时，显式检查默认安全行为、dry-run 行为、失败恢复和重复执行结果。
5. 发现重复、长耗时、高风险或证据链固定的动作时，提示用户可以抽成脚本；用户确认或任务明确要求后，再实现脚本。
6. 脚本默认应可 dry-run；真正 publish、tag、push、delete、overwrite 或迁移用户文件必须有显式参数或确认。
7. 如果 authoring rule 值得分发给所有用户项目，先记录影响面和兼容性，再把规则晋升到通用 Harness 配置。
8. 完成 task 前，更新模块级 implementation doc，并刷新 `.docs/<stage>/overview.md`。

## 输出

- 对当前改动的分层判断：通用 Harness 配置、项目实例数据或 authoring overlay。
- 如适用，给用户的脚本化建议：适合抽成脚本的原因、脚本边界、输入、默认安全行为和验证命令。
- 必要的 source sync、overview、gate 结果。

## 完成检查

- [ ] 已确认 `.agent/skills/authoring/**` 没有进入 package assets。
- [ ] 如果修改了通用 Harness 源文件，package source sync/check 已通过。
- [ ] 如果发现可脚本化动作，已提示用户或说明暂不脚本化的理由。
- [ ] 模块级 implementation doc 和 `.docs/INDEX.md` 已按需更新。
- [ ] `make validate-harness` 和当前 task required gates 已通过。
