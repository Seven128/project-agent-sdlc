# .docs/01_product overview

<!-- generated-by: AI SDLC Harness build_doc_overviews.py -->
<!-- source-hash: efb838793626a55f -->

Generated artifact. Markdown slices remain the source of truth.

Source hash: `efb838793626a55f`

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

- 提供一个 npm 包 `@ai-sdlc/sdlc-harness`，作为 Harness 通用能力的 canonical source。
- 提供 CLI 命令 `sdlc-harness`，支持新项目初始化、已有项目接入、同步、升级和诊断。
- 通过 `sdlc-harness sync` 将 Agent 必须读取的规则、Skill、模板和策略 materialize 到项目配置的 `<harnessRoot>`。未配置时默认 `<harnessRoot>` 为 `.agent`；用户也可通过 init 交互输入或 `package.json` 显式配置其它目录。
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
| PRD-NPM-001 | npm 包名使用 `@ai-sdlc/sdlc-harness`，CLI binary 使用 `sdlc-harness` | P0 | 避免使用过泛的 `harness` 命令名 |
| PRD-NPM-002 | 提供 `init` 命令生成新项目最小 Harness 骨架 | P0 | 包括 agent-readable files 和项目状态初始文件 |
| PRD-NPM-003 | 提供 `init --adopt` 命令支持已有项目中途接入 | P0 | 不覆盖业务代码，优先诊断和最小接入 |
| PRD-NPM-004 | 提供 `sync` 命令，将包内 canonical source 同步到工作区固定路径 | P0 | 重点覆盖 `AGENTS.md` 管理区块、`<harnessRoot>/skills/**`、`<harnessRoot>/managed/templates/**`、`<harnessRoot>/managed/policies/**`、`<harnessRoot>/managed/make/sdlc-harness.mk` |
| PRD-NPM-005 | 提供 `upgrade` 命令，且 `upgrade` 必须自动执行 `sync` | P0 | 用户不需要在升级后再手动运行一次 `sync` |
| PRD-NPM-006 | 提供 `<harnessRoot>/config.yaml` 记录 package version、schema version、managed files、local overrides 和 never overwrite | P0 | 作为 sync/upgrade 的机器契约 |
| PRD-NPM-007 | `AGENTS.md` 使用 managed block 合并，不整体覆盖项目自有 Agent 规则 | P0 | 使用 `sdlc-harness:begin/end` marker |
| PRD-NPM-008 | `Makefile` 不整体覆盖，优先插入 include 并生成 `<harnessRoot>/managed/make/sdlc-harness.mk` | P0 | 保护项目自己的 `lint`、`test`、`build` 命令 |
| PRD-NPM-009 | `.docs/**`、`<harnessRoot>/state/**`、`src/**`、`tests/**` 永远不被 sync/upgrade 覆盖 | P0 | 这些是项目事实源或业务代码 |
| PRD-NPM-010 | 支持 local overrides 合成最终 Skill、模板或策略 | P1 | 推荐 `<harnessRoot>/overrides/**` 和 `<harnessRoot>/managed/policies/*.local.yaml` |
| PRD-NPM-011 | 提供 `doctor` 命令检查配置完整性、文件漂移和升级风险 | P1 | 可以作为 `upgrade` 后的自动检查 |
| PRD-NPM-012 | 提供 migration 机制处理 schema version 变化 | P1 | 迁移 `<harnessRoot>/config.yaml` 和受管理文件布局 |
| PRD-NPM-013 | 当本仓库中的 Harness 工作流内容变化时，自动更新 npm 包 canonical source 并校验包内产物一致性 | P0 | 包括 `AGENTS.md` managed block、Skill、templates、policies、Makefile 接入片段、workflow 和 validator 入口 |
| PRD-NPM-014 | 以可配置 `<harnessRoot>` 作为 Harness 工作流配置 canonical root | P0 | Skill、policy、template、state protocol、validator 和 migration 都属于 Harness 配置；具体 state data 和 `.docs/**` 属于项目实例 |
| PRD-NPM-015 | 支持通过 JSON 配置 `harnessFolderName` 指定 Harness 根目录，默认值为 `.agent` | P0 | 优先读取 `package.json` 的 `sdlcHarness.harnessFolderName`，也支持 `sdlc-harness.config.json`；兼容别名 `harnessFloderName` |
| PRD-NPM-016 | `sdlc-harness init` 交互式询问 Harness folder name，并写入 `package.json` | P0 | 提示默认值 `.agent`；直接回车采用默认；非交互环境不阻塞并使用默认 |
| PRD-NPM-017 | 删除 archive 并采用 `plan.yaml` 单文件执行计划模型 | P0 | `plan.yaml` 取代 `tasks.yaml`；open task 直接包含 `allowed_paths`、`required_gates`、`acceptance_criteria` 和必要执行备注；done task 压缩为简短摘要；不再维护 checkpoint 文件或 `.agent/archive/**` 常规归档 |

## 5. Acceptance Criteria

- [ ] 新仓库执行 `npm install -D @ai-sdlc/sdlc-harness && npx sdlc-harness init` 后，可以得到可运行的最小 Harness 骨架。
- [ ] 已有仓库执行 `npx sdlc-harness init --adopt` 后，不修改 `src/**`、`tests/**`、已有业务文档和已有项目配置，除非用户显式确认。
- [ ] 执行 `npx sdlc-harness sync` 后，`<harnessRoot>/skills/**/SKILL.md` 作为 canonical source 存在于工作区，Agent 可按本地固定目录读取。
- [ ] 执行 `npx sdlc-harness upgrade` 后，自动完成 `sync`，不要求用户再手动运行 `npx sdlc-harness sync`。
- [ ] `AGENTS.md` 中项目自定义内容在 sync/upgrade 后保持不变，仅 `sdlc-harness` managed block 被更新。
- [ ] 项目根 `Makefile` 中业务自定义 `lint`、`test-all`、`build` 等目标在 sync/upgrade 后保持不变。
- [ ] `.docs/**` 和 `<harnessRoot>/state/**` 在 sync/upgrade 中不会被覆盖；如检测到风险，命令失败并输出 blocker。
- [ ] `sdlc-harness doctor` 能报告 managed files 缺失、checksum 漂移、schema version 不匹配和 local override 合并结果。
- [ ] 本仓库的 Harness 源文件发生变化时，可以通过 `sdlc-harness package sync-source` 或等价自动化流程更新 npm 包 canonical source。
- [ ] CI 能验证工作区 Harness 源文件与 npm 包 canonical source 一致，避免修改了工作流但漏更新包内容。
- [ ] 未配置 `harnessFolderName` 的项目默认使用 `.agent` 作为 Harness 根目录，Skill 位于 `.agent/skills/**`，其它配置位于 `.agent/state/**`、`.agent/managed/**` 和 `.agent/config.yaml`。
- [ ] 配置 `harnessFolderName: ".harness"` 的项目使用 `.harness` 作为 Harness 根目录，Skill 位于 `.harness/skills/**`，不再额外套 `.harness/agents/skills/**`。
- [ ] 执行 `npx sdlc-harness init` 时，CLI 提示输入 Harness folder name；直接回车写入默认 `.agent`，输入自定义值则写入自定义值。
- [ ] `plan.yaml` 和 `plan.draft.yaml` 取代 `tasks.yaml` 和 `tasks.draft.yaml`。
- [ ] open task 直接在 `plan.yaml` 中声明 `allowed_paths`、`required_gates`、`acceptance_criteria` 和必要执行备注。
- [ ] task 完成后压缩为简短摘要、implementation doc 和 gate result，历史动作记录由 git commit 承载，产物结果由 implementation doc 承载。
- [ ] Harness 不再生成或要求 checkpoint 目录、checkpoint 模板或 `validate-checkpoint` gate。
- [ ] Harness 不再生成或要求 `.agent/archive/**` 作为 task/release 常规归档。

## 6. Out Of Scope

- 不在首个版本实现在线服务、Web UI 或远程控制台。
- 不要求所有 Agent 原生读取 npm 包；首个版本以 materialize 到工作区为准。
- 不在首个版本实现跨仓库自动开 PR 的机器人流程。
- 不在首个版本解决所有语言生态的项目脚本自动识别；`lint`、`test`、`build` 可先由项目保留或人工配置。
- 不覆盖或重写业务项目已有代码、产品文档、实现文档和历史状态。
- 不把 task/release 历史动作重复归档到 `.agent/archive/**`；这类历史以 git commit、tag 或外部 release 系统为准。
- 不保留独立 checkpoint 文件；活跃任务现场只存在于 `plan.yaml` 的 open task 条目中。

## 7. Open Questions

| 问题（Question） | 负责人（Owner） | 状态（Status） |
|---|---|---|
| 首个 npm 包是否直接发布到 npm registry，还是先以 workspace/local package 验证？ | 用户 | open |
| CLI 使用 TypeScript/Node 实现，还是保留 Python validators 并由 Node CLI 调用？ | 技术方案阶段 | resolved：使用 TypeScript/Node runtime |
| managed Skill 与 local override 的合并格式是简单追加，还是支持结构化 patch？ | 技术方案阶段 | open |
| `AGENTS.md` managed block 是否引用 `.agent/instructions/AGENTS_CORE.md`，还是直接内联核心规则？ | 技术方案阶段 | open |
| 是否需要兼容 Cursor、Cline、Claude Code 等工具的专有规则目录同步？ | 用户 | open |

## 8. 依赖与风险

- 依赖 Agent 对工作区固定文件的读取约定，例如 `AGENTS.md` 和本地 `skills/**/SKILL.md` 目录；因此默认 `<harnessRoot>` 采用 `.agent`，显式 `.harness` 项目需要通过入口规则或 Agent 适配层声明 `.harness/skills/**`。
- npm 包升级与工作区文件同步需要 checksum、managed marker 和冲突策略，否则容易覆盖项目本地修改。
- `Makefile` 和 `AGENTS.md` 是高冲突文件，必须使用 managed block 或 include 方式，不应整体覆盖。
- validators 运行时已经收敛到 TypeScript/Node；仓库内 Python 工具仅作为当前 Harness 本地 gate 和辅助脚本存在。
- 如果后续要支持多 Agent 生态，需要为不同规则目录设计 adapters，但首个版本应保持最小闭环。
- 本仓库在 npm 包化后同时承担 reference implementation 和 source authoring workspace 的角色，必须用自动化防止两边漂移。
