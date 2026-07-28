---
name: harness_package_design
description: Use only in this repository when changing Project Tiny Context Harness workflow rules, Minimal Context package distribution, source sync, validators, release automation, delivery benchmarks, or authoring overlay.
---

# Harness Package Design Authoring Skill

## 目的

只服务于本仓库作为 Project Tiny Context Harness authoring workspace 时的维护工作。当前 canonical product 是
Minimal Context Harness：默认只维护 `project_context/**` 这组最小长期事实源，帮助新会话 agent
快速恢复项目目标、边界、模块入口、验证入口和下一步安全动作。

这不是用户项目默认分发的额外能力，不会通过 `package sync-source` 进入
`packages/ty-context/assets/**`。如果一条 authoring 规则对所有用户项目都有价值，先确认它是否符合
Minimal Context 目标，再同步到通用 `AGENTS.md` managed block、package README、Context template、
validator 或 CLI。

## 产品边界

- Harness 维护上下文质量，不替项目证明产品质量。
- 产品质量由项目自己的代码、测试、smoke、CI、hidden probe 或人工验收负责。
- 默认事实源是 `project_context/global.md`、`project_context/architecture.md`、`project_context/context.toml`、`project_context/areas/**/*.md`、代码和必要测试。
- ADR、PRD、tech plan、implementation doc、review/test/release/RFC 文档链不再是默认产物。
- 旧阶段式工作流的设计思想和历史发现只保留在 `PROJECT_SPEC.md` 的历史迭代说明中。
- 旧项目迁移命令已经退役；不要重新引入阶段式迁移入口或 legacy stage artifacts 作为默认能力。

## 角色提示词

你是 Project Tiny Context Harness 的自举维护者。你的目标是让 npm package、Context validator、
benchmark 和 release automation 保持一致，避免旧阶段式工作流通过文档、assets、测试或提示词悄悄复活。

修改前先区分三类内容：

- 通用 Minimal Context 配置：可能进入 `AGENTS.md` managed block、`packages/ty-context/assets/**`、
  Context template、validator、Makefile include 或 README。
- 本仓库 Context：只描述当前源码仓库状态，写入 `project_context/**`，不作为用户项目默认内容。
- Historical stage notes：只存在于 `PROJECT_SPEC.md` 的历史说明里。

做设计判断时回到当前目标：用最少事实源提升 agent 恢复上下文、后续迭代和 debug 的效率。随着模型能力增强，
需求拆解、技术推理、实现细节和测试策略不应默认外化成厚文档链；只有代码看不出来、后续恢复容易丢失、
或跨模块长期稳定的约束，才进入 Context。

## 变更规则

1. 修改 package 对外行为时，同步检查 `README.md` 和 `packages/ty-context/README.md`。
2. 修改 CLI 入口、包名、npx 用法、Makefile wrapper、managed assets、validator、sync/upgrade/init/doctor 行为、
   release automation 或 consumer lab 逻辑时，先列出影响面并逐项处理：源码实现、managed source、package assets、
   README / package README、AGENTS managed block、本仓库 Context、测试、release smoke、consumer lab、source sync/check。
   不要只改直接报错点；如果用户反馈来自 consumer 仓库，必须反推“同一入口/同一语义”在文档、脚本和测试中的所有出现位置。
3. Open-source English-complete rule：public package surfaces must be fully usable in English. README/npm/release copy, CLI help/errors, generated AGENTS trigger examples, default Skill front matter descriptions, default artifact names and tests must provide an English path. Non-English trigger examples are additive compatibility only; they must never be the sole activation path, sole explanation or default filename. When adding any non-English trigger or example, add the equivalent narrow English trigger and a drift test in the same change.
4. 修改 `AGENTS.md` 或 managed guidance 前先做 placement check：只有事实源入口、不可违反规则、关键触发器、最短验证入口和必须常驻启动路径的硬边界才放 AGENTS；本仓库工作流设计原因放 `PROJECT_SPEC.md`，当前项目事实放 `project_context/**`，consumer 默认 guidance 不要求新建 `PROJECT_SPEC.md`，角色流程 / checklist 放 Skills，人类使用说明放 README。AGENTS 新增内容优先压缩或替换旧规则，不默认追加；40-70 行是软预算，不做 validator / CI gate。
5. 修改 context-first、页面产品定位或 Context 读写规则时，必须保留 Context Priority Ladder：先读 Context；页面 / 布局 / 模块边界 / 信息放置任务先做页面产品定位检查；再做长期事实分类；命中长期事实才 context-first；否则 code-first 并在形成长期结论时回写；收尾做 Context drift check。不要把该阶梯做成 edit-order validator。
6. 修改默认 Context authoring Skill（`context_product_plan`、`context_uiux_design`、`context_development_engineer`）的触发、工作方式、输出边界或默认判断规则时，必须同步更新 `PROJECT_SPEC.md` 中对应 Skill 的设计原因 / 设计思想 / 反目标，并更新 `project_context/**` 中影响后续恢复的长期事实。
7. 修改任何 package-managed default Skill 或工作流规则的用户可见语义、输入/输出契约、完成判定、Context 读写判断、临时产物边界、Superpowers/long-task 适配逻辑或触发条件时，必须先做 design-sync 判断：若这是稳定产品语义，必须同步 `PROJECT_SPEC.md` 的设计思想 / 反目标、相关 `project_context/**`（通常是 `global.md` 或 owning contract/foundation/verification Context）、`README.md`、`README.zh-CN.md`、`packages/ty-context/README.md`、managed source、package assets 和相关测试；若不需要同步，必须能说明它只是措辞、拼写、测试夹具或一次性 source-workspace-only authoring 规则。
8. 修改通用 managed guidance、Context template、Makefile include、validator 或 package docs 后，运行
   `node packages/ty-context/dist/cli.js package sync-source` 和
   `node packages/ty-context/dist/cli.js package check-source`。
9. 不要把 `.codex/skills/authoring/**` 同步到 package assets。
10. 新增或修改 `sync`、`upgrade`、validator、release automation 时，显式检查默认安全行为、
    dry-run 行为、重复执行结果和失败恢复，并保持升级路径收敛：普通 `sync` fast path 不调用完整 migration registry，
    只做 schema guard、managed block 完整性、deprecated override 这类直接写入风险检查；`upgrade` 才拥有
    versioned / deterministic / mechanical migrations；项目语义、模糊角色、用户意图和手工 follow-up 只能进入
    `manual_required` / diagnostics / doctor / release note，不得变成普通 `sync` 的长期负担。
11. Release update mode 是 release-impact metadata，不得硬编码成最重的 `manual-required`。默认生成 release packet
    只能在确实无 migration 需求时标记 `sync-only`；包含安全迁移时标记 `upgrade-required`；包含必须由用户判断的
    手工事项时才标记 `manual-required`。
12. Legacy compatibility paths 必须隔离在明确 migration 条目或 legacy compatibility helper 中，并随迁移窗口收敛；
    不要让旧兼容路径永久增加普通 `sync` / `upgrade` 主路径复杂度。
13. `sync` 永远只刷新 managed assets、default Skills 和工具；不得生成项目语义内容，也不得把完整 upgrade plan
    当作每次 asset refresh 的前置条件。
14. `upgrade` 只运行安全 migrations 和 `sync`；Schema v4 可自动创建缺失的 `project_context/context.toml` 并把 legacy `project_context/modules/**/*.md` 迁移到 `project_context/areas/**/*.md`，但不得自动改写用户 Context Markdown 或重新引入阶段式语义迁移入口。
15. `validate-context` 只检查 Context 是否可恢复，并阻止伪造“测试已通过”；不要把产品测试质量塞进 Harness gate。
16. 产品方案 / UIUX / 开发 Skill 的项目本地定制入口是独立项目本地 Skill，例如 `<harnessRoot>/skills/product_plan/SKILL.md`、`<harnessRoot>/skills/uiux_design/SKILL.md` 或 `<harnessRoot>/skills/development_engineer/SKILL.md`；不得让用户直接编辑 package-managed 默认 Skill 产物，也不得恢复 `<harnessRoot>/ty-context-managed/override_skills/*.md` 合并机制。项目本地 Skill 的 front matter `description` 触发关键词应与对应默认 Skill 和项目 `AGENTS.md` 角色触发规则保持一致；新增或收窄关键词时，同步更新本地 Skill 与 agent 指引。
17. 不要在新项目 init、sync、README、benchmark prompt 或 package assets 中要求阶段状态、stage skill、phase gate 或厚文档链。
18. Delivery Benchmark 当前只保留骨架和基本场景描述；旧阶段式结果不作为当前 Minimal Context 证据。重新跑前，
    不要发布新效率结论。
19. 任何 benchmark 结论都必须来自 fresh baseline 与 Minimal Context Harness 对照运行，并使用高置信耗时和质量证据。
20. `PROJECT_SPEC.md` 记录稳定设计原则、默认 Skill 设计思想和精简历史迭代；升级操作和 release-specific evidence 放在 README、
    package README 或对应脚本/测试说明中。
21. Context graph 的 monorepo boundary rules 只能做 manifest 元数据校验；不要实现 import/path/runtime dependency 扫描或依赖图分析，除非用户未来明确改变产品边界。
22. 修改 Long-Task Schema、Contract Authoring、Source Authority、Claim/Assertion、Evidence Kernel、Final Gate、Stop/close、status/resume、Authority Revision、scope/risk、Skill、Hook、profile/distribution、recovery、performance 或模型选择边界前，必须先读 `PROJECT_SPEC.md` 的 Long-Task Workflow Controlling Objective、Authority Scope And Trusted Results、Mechanism Admission Rule，`project_context/areas/harness-package/decision-rationale/long-task-workflow.md`，以及 owning contract/verification Context。任何 Long-Task Workflow 改动都必须从既定设计目的出发并按两个硬门槛排序：第一阶段先证明 `Coverage_new ⊇ Coverage_old`、`FalseNegative_new ⊆ FalseNegative_old`、Authority 不可绕过、fail-closed 不可绕过、完整当前最终候选快照证明不可绕过；成本下降不能补偿漂移识别下降，无法证明时正式验收路径保持现状，实验只放在正式路径之外。第二阶段才核算全部增量 Authoring、Runtime、State、Recovery、维护、测试、流程、引入和迁移成本；增量设计目的收益大于全部增量成本就是正 ROI，可进入考虑集但不自动采用。涉及机制语义、invariant、Authority/Proof boundary 或 runtime behavior 的，就直接修改机制及其验证；不涉及机制的，只修改对应 owner 点，不把局部问题升级成新机制。优先使用数据、benchmark 或实际证据，没有数据时先与用户或项目 owner 讨论，严密的因果论证加简单、边界明确的验证成立即可——Long-Task Workflow 本身也不是建立在完整历史数据之上，而是建立在严密逻辑和基础验证之上。保持设计目的不变、非退化且 ROI 为正时：成本相差不大，优先优化达到机制目的的效果；实现机制目的的效果相近，优先优化实现成本。每个新增、删除或强化的验收机制还要在内部判断：关闭哪条具体 false-completion/delivery-drift path；建立什么 invariant；什么测试或当前快照证据证明它；已有机制是否 overlap；删除后重开什么路径；增加多少全部增量成本；独立防漂移收益是否大于全部增量成本；是否 fail closed；是否创建 second Authority、second plan 或 scheduling plane。非 Authority 工作流 affordance 只有在现有 fail-closed 保护下通过同一非退化门槛、收益大于全部增量成本，且不增加验收绕过、第二 Authority/plan/scheduler 或持久控制状态时才允许；必须有可测试的边界。第一次 Authority Lock 后的模型选择卡点属于这一类成本 affordance。这是设计与代码 Review 原则，不生成 Mechanism Matrix、Receipt、Registry 或 runtime state；文档措辞调整不得伪装成 runtime 机制。
    同时必须读取 `PROJECT_SPEC.md` 的 Long-Task Anti-Degradation Assurance。先核对 owning Context 的“当前实现”是否仍准确指向真实代码/runtime 与 proof owners，再分别证明当前因果链真实性和跨版本非退化。设计目的、关键逻辑、两项共同必要实现职责或成立边界若被弱化、重释或替换，必须取得显式 project-owner design-purpose decision，并同步记录 old/new implication、Coverage/False Negative 影响、兼容/迁移和 replacement proof；普通需求、Agent 推断、同步修改文档/代码/测试或成本理由都不能代替。`F = Implementation Freedom Boundary` 是相邻的受保护效率/反流程膨胀边界，不是第三项机制职责或无漂移定理前提：在 Source/Contract、架构、安全、禁止捷径、不可逆影响与外部动作边界内，实现顺序、方法、局部反馈节奏以及可选的单 agent/多 agent 或 subagent 实现由当前 Goal 决定；Harness 不拥有开发阶段/方法 Gate、逐编辑强制验证、agent 分配/调度、委派证明或持久状态。新增开发期限制必须取得同一显式 owner 决策，证明解决 Final Gate 或更轻项目检查无法覆盖的独立风险，通过非退化门槛且净 ROI 为正。防劣化建设只复用现有 Context、index、tests、critical sentinels、routing/parity/CI owners，不得建立第二 Authority、Gate、state、matrix 或 registry；positive net ROI 必须是增量防劣化/目的收益大于全部增量成本。
23. 测试修复和复验遵循 owning verification Context 与 `docs/test-suite-roi-redesign.md` 的 `TS-RERUN`。普通修复先跑失败项和 affected/focused；不得把失败后的局部复验拼接成完整绿色门禁。仅当 tracked verification inputs 未变化、失败已证明为本地 environment-only、失败项及 affected/Trust 已通过，并且确定存在仍要求绿色结果的下游 `main`/release 完整门禁时，才可不重复本地完整套件；否则最终证明必须重新取得一次完整通过。
24. 修改 Architecture Deliberation、Architecture Conformance、Contract Conformance 或 Context drift 语义前，先读 `project_context/areas/harness-package/decision-rationale/architecture-quality.md` 与 owning workflow/verification Context。必须保留：每个实现需求都发生一次可见、仓库绑定的实现前考量；风险只改变深度；普通 Contract Conformance 与 Long-Task Final Gate 对一个候选快照互斥承载一次实现后 closure；候选变化会使 closure 失效；Context drift 保持反向检查；不新增架构 artifact、第二 Authority/Gate/state 或通用分析器。任何弱化、重复执行或新增状态的方案都要重新通过非退化门槛，证明 distinct failure path 与正 ROI；正 ROI 只允许考虑，不自动采用。
25. 修改任何 design purpose、design thinking 或 mechanism-rationale 文档/Context 时，必须保持 information-complete and causally rigorous，而不是只替换结论性措辞。至少同步表达：problem and purpose；inputs and transformation；唯一 authority / ownership 与不拥有的边界；downstream consumption and proof；会阻塞错误完成的 fail-closed limits；成本、alternatives 与取舍原因；以及所有必须一致的 indexed surfaces。因果链要能从输入经过机制到可独立失败的证明逐段恢复；删除、替换或新增一环时，同步更新设计目的、反目标、Context、managed/public guidance、测试索引等 owning surfaces，避免旧链路与新机制并存。

## 工作流迭代与双端兼容规则

维护 Harness 工作流、managed assets、CLI、validator、Makefile 或测试时，默认把 Windows 和 macOS 都当作一等开发环境。

- 配置、Context、README、AGENTS、source mappings 和 managed assets 中的仓库相对路径优先使用 `/`，不要把 Windows 反斜杠写进长期事实或跨平台配置。
- Node 代码中用于文件系统访问时使用 `path.join` / `path.resolve`；用于配置键、managed path 比较、文档输出或 package asset 路径比较时先统一为 POSIX slash。
- PowerShell / Bash / Makefile 逻辑要避免平台专属假设；如果必须依赖平台命令，提供 Node 或 package CLI 等跨平台入口。
- Makefile wrapper 不得默认误拉外部同名 npm 包；source workspace 优先调用本地 `packages/ty-context/dist/cli.js`，consumer workspace 优先使用已安装的 package CLI。
- 测试中不要断言裸绝对路径字符串如 `/tmp/foo`；使用 `path.resolve(...)`、相对路径或 slash-normalized helper 来表达跨平台预期。
- `sync`、`init`、`upgrade`、`doctor`、`validate-context` 等路径相关变更，至少覆盖 configured harness root、Windows slash/反斜杠差异、重复执行幂等和缺失 managed assets 的失败形态。
- 修改 managed source 后，先 build 当前 CLI，再运行 `package sync-source`、`package check-source` 和当前 workspace `sync`；确认 generated `.codex/skills/**` 与 `packages/ty-context/assets/**` 都包含预期结果。
- 对只服务本仓库 authoring 的规则，优先写入 `.codex/skills/authoring/**` 或 `project_context/**`；不要放进会分发给 consumer 的 managed `AGENTS.md`，也不要设计“sync 后删除”的隐藏文本块。

## 常用入口

- `project_context/global.md`
- `project_context/architecture.md`
- `project_context/areas/**/*.md`
- `PROJECT_SPEC.md`
- `README.md`
- `packages/ty-context/README.md`
- `packages/ty-context/src/**`
- `.codex/ty-context-managed/**`
- `.codex/skills/authoring/**`
- `packages/ty-context/assets/**`
- `examples/delivery-benchmark/**`
- `tests/ty-context/**`
- `tools/consumer_lab_full_test.mjs`
- `tools/release_npm.mjs`

## 完成检查

- [ ] 变更仍符合 Minimal Context：默认事实源是 `project_context/**`，不是阶段式文档链。
- [ ] 修改 `AGENTS.md` 或 managed guidance 时已做 placement check：AGENTS 只保留启动路由和硬边界，本仓库工作流设计原因 / 项目事实 / 角色流程 / 人类说明分别放到 `PROJECT_SPEC.md`、`project_context/**`、Skills 或 README，且 consumer 默认 guidance 不要求新建 `PROJECT_SPEC.md`。
- [ ] Public package surfaces remain English-complete: every CLI/help/error, README/npm/release note, generated AGENTS trigger example, default Skill front matter description and default artifact name has an English path; non-English examples are additive only and covered by equivalent English triggers/tests.
- [ ] 修改 context-first、页面产品定位或 Context 读写规则时已保留 Context Priority Ladder，且没有引入 edit-order validator。
- [ ] 已做影响面 sweep：源码实现、managed source、package assets、README / package README、AGENTS managed block、本仓库 Context、测试、release smoke 和 consumer lab 中的同一入口/同一语义没有漏改。
- [ ] 修改默认 Context authoring Skill 的触发、工作方式、输出边界或默认判断规则时，`PROJECT_SPEC.md` 的设计原因 / 设计思想 / 反目标和 `project_context/**` 的长期事实已同步。
- [ ] 修改 package-managed default Skill 或工作流规则的用户可见语义时，已完成 design-sync 判断；需要同步的 `PROJECT_SPEC.md`、相关 `project_context/**`、README / README.zh-CN / package README、managed source、package assets 和测试已同步，不需要同步的原因已明确。
- [ ] 如果修改了通用 package assets 或 source mappings，source sync/check 已通过。
- [ ] README 和 package README 已覆盖 public CLI、sync、upgrade、validator 和 project-local Skill 行为。
- [ ] `PROJECT_SPEC.md` 只记录稳定设计和精简历史，不承载操作 runbook。
- [ ] 路径、脚本、Makefile、npx 和测试断言已按 Windows / macOS 双端兼容检查。
- [ ] Legacy stage artifacts 只作为历史说明存在，不作为迁移输入、测试 fixture 或默认 package 能力。
- [ ] Long-Task 任何改动先证明 Coverage/False Negative 非退化以及 Authority、fail-closed、完整当前最终快照证明不可绕过；再核算全部增量成本并留在正确 owner 点，机制变更才修改机制及验证。增量设计目的收益大于全部增量成本即可作为正 ROI 进入考虑集，但不自动采用；有数据时使用数据，没有时已与用户/项目 owner 讨论并以严密因果论证和简单 bounded validation 支持；成本相近时优化机制效果，效果相近时优化实现成本。
- [ ] Long-Task Anti-Degradation Assurance 已分别检查当前因果链真实性、跨版本非退化与 `F = Implementation Freedom Boundary`：Context 的当前实现描述与 indexed code/runtime/proof owners 一致；设计目的、关键逻辑、两项职责、成立边界和 Goal-owned 实现自由未被隐式弱化；单 agent/多 agent 或 subagent 只是可选非权威实现手段并汇入同一验证工作区；若发生替换已有显式 project-owner 决策、old/new implication、非退化影响、兼容/迁移与 replacement proof；任何开发期约束已证明独立风险、无更轻替代和正净 ROI；防劣化建设未新增 Authority/Gate/state/matrix/registry/scheduler。
- [ ] Long-Task 验收机制变更已完成 false-completion path、invariant、proof、overlap、deletion risk、cost/net benefit、fail-closed 和 second Authority/plan/scheduler 检查；非 Authority 成本 affordance 已证明不增加验收绕过或持久控制状态，并有行为测试；未创建 matrix、Receipt、Registry 或 runtime state。
- [ ] 架构质量机制仍保证 implementation-before Deliberation 普遍发生、风险比例化、default/Long-Task closure 单 owner、候选快照 freshness、Context drift 双向检查和无新增 artifact/Authority/Gate/state；purpose、限制、债务规则、更新原则、索引与 parity tests 已同步。
- [ ] design purpose / design thinking / mechanism-rationale 文档或 Context 变更保持 information-complete and causally rigorous：problem and purpose、inputs and transformation、authority/ownership、downstream consumption and proof、fail-closed limits、costs/alternatives 与 indexed surfaces 均已同步。
- [ ] Delivery Benchmark 没有发布旧阶段式结论或低置信数字。
- [ ] 相关 `tests/ty-context/**` 已更新并通过。
- [ ] `make validate-context` 或 `make validate-harness` 已通过。
