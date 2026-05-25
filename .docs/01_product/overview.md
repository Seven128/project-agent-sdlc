# .docs/01_product overview

<!-- generated-by: AI SDLC Harness build_doc_overviews.py -->
<!-- source-hash: d187beb6139f67ad -->

Generated artifact. Markdown slices remain the source of truth.

Source hash: `d187beb6139f67ad`

## Source Slices

1. [npm_package_distribution.md](npm_package_distribution.md)

---

## npm_package_distribution.md

Source: [npm_package_distribution.md](npm_package_distribution.md)

# npm 包化分发与同步 PRD

## 1. 背景

- 来源（Source）：2026-05-23 用户关于 ProjectTemplate 可复用和升级方式的讨论。
- 问题（Problem）：当前 AI SDLC Harness 以仓库模板形式存在。业务项目如果复制或 fork 这套配置，会同时拥有项目状态、项目文档和 Harness 通用规则，导致新项目中途接入困难，已接入项目难以无痛升级。
- 用户（Users）：维护 AI SDLC Harness 的作者、希望在多个项目中接入该工作流的项目负责人、使用 Agent 执行阶段化工作的开发者。

## 2. 目标

- 提供一个 npm 包 `agent-project-sdlc`，作为 Harness 通用能力的 canonical source。
- 提供 CLI 命令 `sdlc-harness`，支持新项目初始化、已有项目接入、同步、升级和诊断。
- 通过 `sdlc-harness sync` 将 Agent 必须读取的规则、Skill、模板和策略 materialize 到项目配置的 `<harnessRoot>`。`init` 默认选择 `Codex -> .codex`，其它 Agent 使用对应内置目录；配置兜底和 `Other` 空输入默认 `.agent`。
- 通过 `sdlc-harness upgrade` 自动执行 schema migration 和 `sync`，降低已接入项目升级成本。
- 明确 managed files、local overrides 和 never overwrite 边界，保护项目自己的 `.docs/**`、`<harnessRoot>/state/**` 和业务代码。

## 3. 用户场景（User Scenarios）

| 场景（Scenario） | 用户（User） | 触发条件（Trigger） | 预期结果（Expected Result） |
|---|---|---|---|
| 新项目接入 Harness | 项目负责人 | 在空项目或新业务项目中运行 `npx sdlc-harness init` | 生成最小 `AGENTS.md`、`<harnessRoot>/config.yaml`、`<harnessRoot>/state/**`、`.docs/**` 和可被 Agent 读取的 Skill |
| 已有项目中途接入 | 项目负责人 | 在已有 README、src、tests 的仓库中运行 `npx sdlc-harness init --adopt` | 不覆盖业务代码，生成最小 Harness 入口，并通过 `doctor` 报告推荐阶段和缺失产物 |
| 同步 Agent 可读文件 | Harness 用户 | 运行 `npx sdlc-harness sync` | 将包内 canonical Skill、模板、策略、Makefile 接入片段 materialize 到 `<harnessRoot>/**`，同时保留 local overrides |
| 升级已接入项目 | Harness 用户 | 更新 npm 包后运行 `npx sdlc-harness upgrade` | 自动执行 migration 和 sync，不要求用户额外运行 `sync`，并输出升级报告 |
| 检查接入状态 | Harness 用户 | 运行 `npx sdlc-harness doctor` | 报告配置缺失、managed files 漂移、state/docs 风险和下一步修复建议 |

## 4. 功能需求（Functional Requirements）

| ID | 需求（Requirement） | 优先级（Priority） | 备注（Notes） |
|---|---|---|---|
| PRD-NPM-001 | npm 包名使用 `agent-project-sdlc`，CLI binary 使用 `sdlc-harness` | P0 | 避免使用过泛的 `harness` 命令名；包名发布前改为 unscoped package |
| PRD-NPM-002 | 提供 `init` 命令生成新项目最小 Harness 骨架 | P0 | 包括 agent-readable files 和项目状态初始文件 |
| PRD-NPM-003 | 提供 `init --adopt` 命令支持已有项目中途接入 | P0 | 不覆盖业务代码，优先诊断和最小接入 |
| PRD-NPM-004 | 提供 `sync` 命令，将包内 canonical source 同步到工作区固定路径 | P0 | 重点覆盖 `AGENTS.md` 管理区块、`<harnessRoot>/skills/pjsdlc_*/SKILL.md`、`<harnessRoot>/pjsdlc_managed/templates/**`、`<harnessRoot>/pjsdlc_managed/policies/**`、`<harnessRoot>/pjsdlc_managed/make/sdlc-harness.mk`；除 skills hard file index 外，工作流配置不再维护 legacy mirror |
| PRD-NPM-005 | 提供 `upgrade` 命令，且 `upgrade` 必须自动执行 `sync` | P0 | 用户不需要在升级后再手动运行一次 `sync` |
| PRD-NPM-006 | 提供 `<harnessRoot>/config.yaml` 记录 package version、schema version、managed files、local overrides 和 never overwrite | P0 | 作为 sync/upgrade 的机器契约 |
| PRD-NPM-007 | `AGENTS.md` 使用 managed block 合并，不整体覆盖项目自有 Agent 规则 | P0 | preferred marker 使用 `pjsdlc:sdlc-harness:begin/end`；旧 `sdlc-harness:begin/end` 仅作为 legacy marker 兼容迁移 |
| PRD-NPM-008 | `Makefile` 不整体覆盖，优先插入 include 并生成 `<harnessRoot>/pjsdlc_managed/make/sdlc-harness.mk` | P0 | 保护项目自己的 `lint`、`test`、`build` 命令 |
| PRD-NPM-009 | `.docs/**`、`<harnessRoot>/state/**`、`src/**`、`tests/**` 永远不被 sync/upgrade 覆盖 | P0 | 这些是项目事实源或业务代码 |
| PRD-NPM-010 | 支持 local overrides 合成最终 Skill、模板或策略 | P1 | 推荐 `<harnessRoot>/overrides/**` 和 `<harnessRoot>/pjsdlc_managed/policies/*.local.yaml`；不要直接修改 package-managed 文件 |
| PRD-NPM-011 | 提供 `doctor` 命令检查配置完整性、文件漂移和升级风险 | P1 | 可以作为 `upgrade` 后的自动检查 |
| PRD-NPM-012 | 提供 migration 机制处理 schema version 变化 | P1 | 迁移 `<harnessRoot>/config.yaml` 和受管理文件布局 |
| PRD-NPM-013 | 当本仓库中的 Harness 工作流内容变化时，自动更新 npm 包 canonical source 并校验包内产物一致性 | P0 | 包括 `AGENTS.md` managed block、Skill、templates、policies、Makefile 接入片段、workflow 和 validator 入口 |
| PRD-NPM-014 | 以可配置 `<harnessRoot>` 作为 Harness 工作流配置 canonical root | P0 | Skill、policy、template、state protocol、validator 和 migration 都属于 Harness 配置；具体 state data 和 `.docs/**` 属于项目实例 |
| PRD-NPM-015 | 支持通过 JSON 配置 `harnessFolderName` 指定 Harness 根目录，配置层默认值为 `.agent` | P0 | 优先读取 `package.json` 的 `sdlcHarness.harnessFolderName`，也支持 `sdlc-harness.config.json`；兼容别名 `harnessFloderName` |
| PRD-NPM-016 | `sdlc-harness init` 先询问目标 Agent，并写入对应 `harnessFolderName` | P0 | 直接回车默认 `Codex -> .codex`；选择 `Other` 时才询问自定义 folder，直接回车默认 `.agent`；非交互环境不阻塞并使用 Codex 默认 |
| PRD-NPM-017 | 删除 archive 并采用 `plan.yaml` 单文件短期执行计划模型 | P0 | `plan.yaml` 取代 `tasks.yaml`；open task 直接包含 `allowed_paths`、`required_gates`、`acceptance_criteria` 和必要执行备注；task 完成并写入长期历史后从 `plan.yaml` 移除；不再维护 checkpoint 文件或 `<harnessRoot>/archive/**` 常规归档 |
| PRD-NPM-018 | 已完成 task 的历史查询面向产物结果和变更意图 | P2 | Agent 默认不读取过去 task 执行流水；历史 task 查询以模块级 implementation doc、RFC、PRD、tech plan 和代码为主，`allowed_paths`、`required_gates` 和临时 `working_notes` 不作为历史查询 API |
| PRD-NPM-019 | Gate evidence 写入 task notes 或 implementation doc | P1 | 不维护独立 gate scratchpad；当前 task 的临时 gate 证据可写入 `working_notes`，完成后的最终 gate 事实写入 implementation doc `Verification`、CI logs 或 release 记录 |
| PRD-NPM-020 | Harness active state 不读取、不保存过去执行流水 | P0 | `lifecycle.yaml` 和 `plan.yaml` 只保存当前可执行状态；过去阶段/task/gate 执行信息默认不进入 Agent 上下文，仅在显式 forensic / audit / regression 场景中通过 git、PR、CI、release 系统和阶段产物查询 |
| PRD-NPM-021 | 移除独立 gate results state | P0 | 不再维护 `<harnessRoot>/state/gate_results.log`；当前 task gate 证据写入 task notes 或 implementation doc `Verification`，长期记录由 implementation doc、CI logs 或 release 系统承担 |
| PRD-NPM-022 | RFC 阶段必须显式考虑影响面 | P0 | RFC 进入补丁或 DEV task 前必须列出 docs、state、skills、policies、templates、tools、package assets、tests、sync/upgrade/migration 和 generated artifacts 影响 |
| PRD-NPM-023 | 用户可通过自然语言控制 workflow | P0 | `/status`、`/next`、`/advance`、`/rfc` 等宏指令保留为快捷入口；Agent 应将“继续”“完善产品方案”“设计技术方案”“开始开发”“跑测试”“进入下一阶段”等自然语言映射到 lifecycle/plan 对应动作 |
| PRD-NPM-024 | 根 README 面向用户接入和日常使用 | P1 | 长篇产品说明和设计取舍迁移到 `PROJECT_SPEC.md`；根 `README.md` 只保留用户视角的包介绍、安装、初始化、同步、升级、诊断和验证命令 |
| PRD-NPM-025 | implementation doc 默认按模块级事实切片 | P0 | `.docs/04_implementation/` 描述最终实现产物，默认按模块、子系统或核心数据流维护，并与 architecture / tech plan 边界对应；task id 和 commit 仅作为 provenance，不作为默认文档粒度 |
| PRD-NPM-026 | 支持自然语言意图和约定指令别名双入口 | P0 | 每个阶段都应支持自然语言和 `/xxx` 快捷入口；`/xxx` 是更完整、更细节的提示词别名，自然语言是低成本入口；产品、架构、开发阶段分别提供 `/prd`、`/design`、`/dev`、`/devloop` |
| PRD-NPM-027 | npm 发布流程可脚本化执行 | P1 | 提供仓库内 release script，自动执行 version bump、test、source drift check、pack dry-run、publish、registry latest verification、installed-consumer smoke 和 release doc evidence；默认不发布，显式确认后才 publish |

## 5. Acceptance Criteria

- [ ] 新仓库执行 `npm install -D agent-project-sdlc && npx sdlc-harness init` 后，可以得到可运行的最小 Harness 骨架。
- [ ] 已有仓库执行 `npx sdlc-harness init --adopt` 后，不修改 `src/**`、`tests/**`、已有业务文档和已有项目配置，除非用户显式确认。
- [ ] 执行 `npx sdlc-harness sync` 后，`<harnessRoot>/skills/**/SKILL.md` 作为 canonical source 存在于工作区，Agent 可按本地固定目录读取。
- [ ] 执行 `npx sdlc-harness upgrade` 后，自动完成 `sync`，不要求用户再手动运行 `npx sdlc-harness sync`。
- [ ] `AGENTS.md` 中项目自定义内容在 sync/upgrade 后保持不变，仅 `pjsdlc:sdlc-harness` managed block 被更新；旧 `sdlc-harness` block 可被迁移为新 marker。
- [ ] 项目根 `Makefile` 中业务自定义 `lint`、`test-all`、`build` 等目标在 sync/upgrade 后保持不变。
- [ ] `.docs/**` 和 `<harnessRoot>/state/**` 在 sync/upgrade 中不会被覆盖；如检测到风险，命令失败并输出 blocker。
- [ ] `sdlc-harness doctor` 能报告 managed files 缺失、checksum 漂移、schema version 不匹配和 local override 合并结果。
- [ ] 本仓库的 Harness 源文件发生变化时，可以通过 `sdlc-harness package sync-source` 或等价自动化流程更新 npm 包 canonical source。
- [ ] CI 能验证工作区 Harness 源文件与 npm 包 canonical source 一致，避免修改了工作流但漏更新包内容。
- [ ] 执行 `npx sdlc-harness init` 时，CLI 先提示选择目标 Agent；直接回车或非交互环境写入默认 `Codex -> .codex`。
- [ ] 选择 `Other` 时，CLI 才继续提示输入 Harness folder name；直接回车写入 `.agent`，输入自定义值则写入自定义值。
- [ ] 显式传入 `--harness-folder` / `--harnessFolderName` 时，CLI 跳过 Agent 选择并优先写入命令行指定目录。
- [ ] 未经过交互式 init 且未配置 `harnessFolderName` 的配置解析默认使用 `.agent` 作为 Harness 根目录。
- [ ] workflow Skill 使用 `<harnessRoot>/skills/pjsdlc_<skill_name>/SKILL.md` hard file index；policy、template、Makefile fragment 等工作流配置统一位于 `<harnessRoot>/pjsdlc_managed/**`，不再维护 `<harnessRoot>/policies/**` 或 `<harnessRoot>/templates/**` mirror。
- [ ] 配置 `harnessFolderName: ".harness"` 的项目使用 `.harness` 作为 Harness 根目录，Skill 位于 `.harness/skills/**`，不再额外套 `.harness/agents/skills/**`。
- [ ] 当前 `ProjectTemplate` source authoring workspace 显式配置 `harnessFolderName: ".codex"`，本地状态、skills、templates、policies 和 Makefile fragment 位于 `.codex/**`。
- [ ] `plan.yaml` 和 `plan.draft.yaml` 取代 `tasks.yaml` 和 `tasks.draft.yaml`。
- [ ] open task 直接在 `plan.yaml` 中声明 `allowed_paths`、`required_gates`、`acceptance_criteria` 和必要执行备注。
- [ ] task 完成后从 `plan.yaml` 移除，历史动作记录由 git commit 承载，产物结果由 implementation doc 承载。
- [ ] Agent 默认不读取 done task 的历史执行流水；显式 forensic/audit/regression 场景可临时通过 git、PR、CI 或 release 记录追溯。
- [ ] Harness 不维护独立 gate results state；完成后的长期 gate 事实以 implementation doc、CI logs 或 release 记录为准。
- [ ] `lifecycle.yaml` 不保存 phase transition history；Agent 默认不读取过去执行流水。
- [ ] 新项目不生成 `gate_results.log`，gate 证据进入 task notes 或 implementation doc。
- [ ] RFC 产物包含明确影响面清单，并据此创建后续 task。
- [ ] 用户不需要记忆宏指令，也可以通过自然语言让 Agent 报告状态、继续当前阶段、完善产品方案、设计技术方案、检查阶段推进、进入 RFC、执行开发任务、运行开发循环、运行测试、进入 Review 或刷新 overview。
- [ ] 根 `README.md` 是轻量用户指南，`PROJECT_SPEC.md` 保存完整项目规格说明。
- [ ] implementation doc 默认按模块、子系统或核心数据流维护；open task 的 `implementation_doc` 指向相关长期实现事实文档，多个 task 可以更新同一份文档。
- [ ] README 和协议按阶段顺序说明 `/prd`、`/design`、`/dev`、`/devloop`；`/dev` 一次只完成一个 DEV task 闭环，`/devloop` 连续创建/执行 DEV task，直到没有明确任务或遇到 blocker。
- [ ] npm package patch release 可以通过 `npm run release:npm -- --version patch --publish --yes` 执行，并生成 release evidence。
- [ ] Harness 不再生成或要求 checkpoint 目录、checkpoint 模板或 `validate-checkpoint` gate。
- [ ] Harness 不再生成或要求 `<harnessRoot>/archive/**` 作为 task/release 常规归档。

## 6. Out Of Scope

- 不在首个版本实现在线服务、Web UI 或远程控制台。
- 不要求所有 Agent 原生读取 npm 包；首个版本以 materialize 到工作区为准。
- 不在首个版本实现跨仓库自动开 PR 的机器人流程。
- 不在首个版本解决所有语言生态的项目脚本自动识别；`lint`、`test`、`build` 可先由项目保留或人工配置。
- 不覆盖或重写业务项目已有代码、产品文档、实现文档和历史状态。
- 不把 task/release 历史动作重复归档到 `<harnessRoot>/archive/**`；这类历史以 git commit、tag 或外部 release 系统为准。
- 不保留独立 checkpoint 文件；活跃任务现场只存在于 `plan.yaml` 的 open task 条目中。
- 不维护独立 gate results state。
- 不把过去 phase/task 执行流水写入 active state，也不要求 Agent 默认读取这些流水。
- 历史 `dev_*.md` task log 已在 DEV-043 合并为模块级 implementation docs；后续不再把 task 粒度文档作为 `.docs/04_implementation/` 的活跃事实源。

## 7. Open Questions

| 问题（Question） | 负责人（Owner） | 状态（Status） |
|---|---|---|
| 首个 npm 包是否直接发布到 npm registry，还是先以 workspace/local package 验证？ | 用户 | open |
| CLI 使用 TypeScript/Node 实现，还是保留 Python validators 并由 Node CLI 调用？ | 技术方案阶段 | resolved：使用 TypeScript/Node runtime |
| managed Skill 与 local override 的合并格式是简单追加，还是支持结构化 patch？ | 技术方案阶段 | open |
| `AGENTS.md` managed block 是否引用 `.agent/instructions/AGENTS_CORE.md`，还是直接内联核心规则？ | 技术方案阶段 | open |
| 是否需要兼容 Cursor、Cline、Claude Code 等工具的专有规则目录同步？ | 用户 | open |

## 8. 依赖与风险

- 依赖 Agent 对工作区固定文件的读取约定，例如 `AGENTS.md` 和本地 `skills/**/SKILL.md` 目录；因此 `init` 先让用户选择目标 Agent 并写入对应 `<harnessRoot>`。如果该目录不是 Agent 原生 skill root，仍需要通过 `AGENTS.md` soft index 或 Agent 适配层读取 `<harnessRoot>/skills/**`。
- npm 包升级与工作区文件同步需要 checksum、managed marker 和冲突策略，否则容易覆盖项目本地修改。
- `Makefile` 和 `AGENTS.md` 是高冲突文件，必须使用 managed block 或 include 方式，不应整体覆盖。
- validators 运行时已经收敛到 TypeScript/Node；仓库内 Python 工具仅作为当前 Harness 本地 gate 和辅助脚本存在。
- 如果后续要支持多 Agent 生态，需要为不同规则目录设计 adapters，但首个版本应保持最小闭环。
- 本仓库在 npm 包化后同时承担 reference implementation 和 source authoring workspace 的角色，必须用自动化防止两边漂移。
