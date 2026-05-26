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

- 通用 Harness 配置：应进入 `<harnessRoot>/skills/**`、`<harnessRoot>/pjsdlc_managed/**` 或 package assets。
- 项目实例数据：只描述当前仓库状态和 `.docs/**` 产物，不应被 sync/upgrade 覆盖。
- Harness authoring overlay：只约束本仓库维护 Harness 自身的原则、专用 Skill 和包化安全规则。

除 `<harnessRoot>/skills/**` 作为 workflow Skill hard file index 外，workflow Harness 配置都应放在
`<harnessRoot>/pjsdlc_managed/**`。不要在 `<harnessRoot>` 顶层新增泛用 `overrides/`、`templates/`、
`policies/` 等目录；例如项目本地阶段角色提示词使用
`<harnessRoot>/pjsdlc_managed/override_skills/<skill_name>.md`。

当发现一个动作重复、耗时、容易漏步骤、容易产生漂移、需要固定证据、需要发布/回滚安全阀、
或未来很可能再次执行时，主动提示用户“这个动作可以抽成脚本”。提示要轻量，不要打断当前工作：
说明脚本能减少什么成本或风险，建议脚本边界、输入参数、默认安全行为和验证命令。不要把一次性、
低风险、低频动作过度脚本化。

全量 installed-consumer 验证属于 Harness authoring overlay。它验证 npm 包在新开 consumer
仓库中的真实行为，而不是普通用户项目默认工作流能力。全量测试流程提示词、脚本使用提示词、
已知包化缺口归因规则、以及“测试完成后总结问题并进入 RFC 修复”的 SOP 必须写在
`<harnessRoot>/skills/authoring/**` 或 authoring-only 文档里，不要写入通用
`<harnessRoot>/skills/pjsdlc_*` 阶段 Skill。通用阶段 Skill 面向用户项目；自举维护 Harness
自身时的阶段化测试流程属于 authoring overlay。

当用户要求“全量测试 npm 包所有能力”“新开仓库验收工作流”“验证 README/package README
所有特性”或等价意图时，使用 `tools/consumer_lab_full_test.mjs` 作为默认脚本入口。脚本应从
当前源码打包安装到本地 consumer lab，覆盖 init/adopt、configurable root、sync、upgrade、
doctor、managed assets、override、validators、task protocol、parallel contract、docs overview、
transition、GitHub workflow static check 和 release automation static check。脚本报告必须区分
`PASS`、`BLOCKED` 和 `FAIL`：已知产品能力缺口使用 `BLOCKED`，脚本错误或非预期行为使用
`FAIL`。每次全量测试后，都要把问题总结为 defect candidates，并建议或创建 RFC，再拆 DEV task
修复；不要在同一个测试 task 中顺手修复所有缺陷。

`README.md` 和 package README 是 npm package 的对外能力索引。新增、删除或改变对外 CLI command、
configuration、workflow behavior、managed path、override mechanism、validator、migration、release
behavior 或用户可见约束时，必须同步检查这两个 README 是否完整描述所有 public package
capabilities；不能只在 `PROJECT_SPEC.md`、implementation doc 或 release note 中记录。

## 输入

- `<harnessRoot>/state/lifecycle.yaml`
- `<harnessRoot>/state/plan.yaml`
- `AGENTS.md`
- `README.md`
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
3. 不要把 `<harnessRoot>/skills/authoring/**` 同步到 `packages/sdlc-harness/assets/**`。
4. 新增或修改 migration、sync、upgrade、validator、release automation 时，显式检查默认安全行为、dry-run 行为、失败恢复和重复执行结果。
5. 发现重复、长耗时、高风险或证据链固定的动作时，提示用户可以抽成脚本；用户确认或任务明确要求后，再实现脚本。
6. 脚本默认应可 dry-run；真正 publish、tag、push、delete、overwrite 或迁移用户文件必须有显式参数或确认。
7. 如果 authoring rule 值得分发给所有用户项目，先记录影响面和兼容性，再把规则晋升到通用 Harness 配置。
8. 每次改动或 RFC impact analysis 都要显式考虑 `PROJECT_SPEC.md` 和 `README.md` 是否需要同步更新；如果不需要，也说明原因。
9. package 对外能力变化时，`README.md` 和 `packages/sdlc-harness/README.md` 必须覆盖完整 public capability list，包括入口命令、配置方式、sync/upgrade 行为、本地 override、validator 和发布/诊断能力。
10. 每次新增或修改 CLI、sync、upgrade、migration、validator、managed assets、Makefile、workflow Skill、README、release automation 或 workflow behavior 时，都要显式检查 `tools/consumer_lab_full_test.mjs`、`tests/sdlc-harness/**` 和相关测试文档是否需要同步更新；如果不需要，在 implementation doc 或 task notes 说明理由。
11. 完成 task 前，更新模块级 implementation doc，并刷新 `.docs/<stage>/overview.md`。

## 输出

- 对当前改动的分层判断：通用 Harness 配置、项目实例数据或 authoring overlay。
- 如适用，给用户的脚本化建议：适合抽成脚本的原因、脚本边界、输入、默认安全行为和验证命令。
- 必要的 source sync、overview、gate 结果。

## 完成检查

- [ ] 已确认 `<harnessRoot>/skills/authoring/**` 没有进入 package assets。
- [ ] 如果修改了通用 Harness 源文件，package source sync/check 已通过。
- [ ] 已判断 `PROJECT_SPEC.md`、`README.md` 和 `packages/sdlc-harness/README.md` 是否需要同步更新。
- [ ] 如果 package public capability 有变化，README/package README 已完整覆盖对外能力。
- [ ] 如果发现可脚本化动作，已提示用户或说明暂不脚本化的理由。
- [ ] 如果改动影响 package public behavior 或 README capability，已运行或更新 `tools/consumer_lab_full_test.mjs`，并把测试脚本影响面纳入 RFC / task evidence。
- [ ] 全量 consumer lab 发现的问题已总结为 defect candidates，并进入 RFC 或后续 DEV task，而不是停留在零散日志中。
- [ ] 模块级 implementation doc 和 `.docs/INDEX.md` 已按需更新。
- [ ] `make validate-harness` 和当前 task required gates 已通过。
