# Project Tiny Context Harness

Project Tiny Context Harness 是给 AI coding agents 用的轻量项目记忆层，也是一套由 npm 包管理的上下文与交付 Harness。它为仓库提供耐久项目记忆、自动适用的通用轻量工作流，以及显式启用的机器可信 Single-Goal Rolling Delivery；它不是 Agent 调度器，也不接管 Git 编排。

[English](README.md)

产品原则是：**保留项目记忆，丢掉流程仪式感**。公开推广与 README 以英文主入口为准，中文文档作为二级入口。

## 为什么存在

编码 Agent 同时需要两类能力：跨会话仍然可靠的少量项目事实，以及在交付确实需要时可恢复、可审计、可机器复验的完成检查。

Tiny Context 将这些能力保持为窄边界。两条实现路径共用一次实现前、风险比例化的 Architecture Deliberation 与适用质量路由，实施过程保留 Goal 自主但遵守边界型实现质量 guardrails，项目验证后只由一个 carrier 对当前候选执行包含 Architecture Conformance 的 Engineering Quality Conformance。

它不会启动或切换模型，不会创建 Agent 会话、分支或 worktree，不会 merge、push、创建 PR 或部署，也不会取代项目测试和人工产品验收。

## 三个机制如何配合

| 机制 | 何时、如何使用 | 负责什么 |
|---|---|---|
| **Minimal Context** | 默认安装；每种交付路径都会读取并按需更新 `project_context/**`。 | 保存目标、归属、架构/接口/状态边界和可重复验证/部署等耐久事实；不声称实现或测试已经通过。 |
| **Workflow Contract** | `init` 后自动生效，适用于任何复杂度；只有显式选择或已有有效绑定时才不走此路线。没有 Skill 命令，也不创建 `delivery-contract.yaml`。 | 执行 model-led 轻量循环：Context 发现、风险比例化需求/架构判断、唯一 `Context Delta`、Goal-owned 实现、当前候选项目检查、失败返工、证据边界内 Contract Conformance 与 Context drift；不产生精确 Fact 账本、validator 结果、Receipt、持久状态或机器完成权威。 |
| **Long-Task Workflow** | 先启用一次 `long-task` profile；需要机器完成权威、跨压缩/会话恢复或审计时显式选择 `long-task-workflow`，已有有效绑定时恢复。任务大小不会自动启用。 | 持有一份 Source-bound Delivery Contract、Authority Lock、可恢复局部进度、受保护修订、精确声明义务证据和当前快照 Live Final Gate。 |

三者的关系是：每个任务都使用 Minimal Context；未显式选择且没有有效绑定时，默认 Workflow Contract 自动适用；只有显式选择或恢复有效绑定时，才由 `long-task-workflow` 承担执行与完成权威。复杂度决定执行与验证深度；所需完成权威与恢复能力决定工作流路线；Long-Task 内部风险决定证明强度。Long-Task 的 Final Gate 承载 Engineering Quality/Architecture Conformance 与选定设计闭环，不再重复默认 Contract Conformance。

| 任务形态 | model-led、证据边界内交付足够 | 要求机器可信完整闭包 |
|---|---|---|
| 局部或简单 | 默认 Workflow Contract | 可显式使用 Long-Task |
| 跨模块或复杂 | 默认 Workflow Contract 仍然有效 | 显式使用 Long-Task |

`design-system-authoring` 与 `design-resource-authoring` 是基础 Profile 中独立、可选的上游设计 Skill，不是第四个机制，也不是 Long-Task 的阶段。其选定产物可以进入默认或 Long-Task 任一路径；当前唯一活跃的长程执行 Skill 是 `long-task-workflow`。

本文使用宿主无关的逻辑 Skill 名。Codex 中用 `$skill-name`（例如 `$long-task-workflow`）显式选择，或通过 `/skills` 选择；其他宿主使用各自的 Skill 入口。

## 快速开始

```powershell
npx --yes project-tiny-context-harness ty-context init
# 已有项目文件的仓库：
npx --yes project-tiny-context-harness ty-context init --adopt

npx --yes project-tiny-context-harness ty-context validate-context
npx --yes project-tiny-context-harness ty-context doctor
```

更新 package-managed 表面：

```powershell
npx --yes project-tiny-context-harness ty-context upgrade
npx --yes project-tiny-context-harness ty-context sync
```

`upgrade` 先执行安全迁移再同步；资产刷新不会推断或覆盖用户编写的 Context、Source、Delivery Contract 或历史文件。

默认 Profile 是 `core-portable` 与 `workflow-default`，基础 managed set 已包含显式选择的 `design-system-authoring` 与 `design-resource-authoring`。显式启用长程能力：

```powershell
ty-context enable long-task
```

启用长程能力会额外安装 `long-task-workflow`、package-owned lifecycle Hooks，以及仅当解析后的 harness root 恰好为 `.codex` 时安装一个可选的项目级 Codex custom agent `long_task_implementation`。该固定、无状态、package-owned profile 禁用 child-agent 工具，只能在第一次 Authority Lock 的终止当前回合检查点之后承担有界滚动实现/修复。受支持的 Codex 宿主必须显式选择这个精确 custom agent；generic/built-in worker、task name、prompt 模拟或仅指定模型都不等于该 profile。宿主不能精确选择，或宿主拒绝 profile 必需的 leaf-agent 配置时，不得为了兼容删除该边界，也不得启动 generic 替代项；父 Goal 直接实现。静态安装本身不证明宿主已发现或实际使用 profile。它不是 Skill、runtime、模型路由器、调度器、Authority 或证明载体；缺失、无效或保留同路径用户文件都不改变 Long-Task 接受路径。Tiny Context 不安装 Open Design、Agent runtime、调度器、Git 编排资产或其他设计生成 runtime。

当 sync 首次安装或更新 `.codex/hooks.json` 中的 Tiny Context Hook 时，会报告：`Codex Hook review required: open /hooks and trust the current Tiny Context project Hook before relying on PreToolUse, SubagentStart, SessionStart or Stop behavior. Tiny Context cannot observe or persist Codex Hook trust.` 请在 `/hooks` 审核当前项目 Hook；信任由 Codex 宿主和用户控制，Hook 改变后可能需要重新审核。安装不等于已信任或 runtime guard 已生效，普通路径不使用 trust bypass 参数。

## 推荐用法

初始输入可以是简要产品意图，也可以是 Web GPT 等外部服务给出的详细初始方案。该输入本身不要求设计 authoring 或 Long-Task；应按交付需要选择执行路径，不要把“是否需要设计资源”和“是否需要 Long-Task”绑定在一起：

### 设计优先的机器保障工作流

这条路径适合既确实需要新 style-bearing 设计资源，又要求 Long-Task 机器保障/恢复/审计边界的实现交付。它组合已有能力，但不是所有 Long-Task 的前置流程：

1. **只启用一次 Long-Task。** 选择工作流 Skill 前先运行 `ty-context enable long-task`。
2. **仅在需要时建立 Design Authority。** 如果项目尚未采用 Design Authority，且本次工作属于 style-bearing 范围，显式选择 `$design-system-authoring`，生成、选择并采用规范 `DESIGN.md`、token source 和 provider binding。项目已经配置 Design Authority 时跳过这一步。
3. **准备一份可写的初始方案。** 将项目原生的产品/技术方案放在明确路径，例如 `docs/initial-proposal.md`。它可以由用户、外部服务或显式请求的适用方案能力编写。`design-resource-authoring` 不负责初始方案 authoring，也不要求经过独立的中间 authoring 阶段。
4. **生成并选择设计资源。** 选择 `$design-resource-authoring`，传入初始方案路径、精确开发范围和目标。它会输出一份完成一次性回改的修订方案、选定的不可变规范资源及其 manifest 和 dependencies，以及通过校验的残余 `design-resource-handoff-v1`。
5. **启动 Single-Goal 交付。** 选择 `$long-task-workflow`，传入修订方案、已校验 handoff 和选定规范资源集合的精确路径。该 Skill 会建立 Source-bound Contract Draft；第一次 Compile/Authority Lock 必须在实现前无条件结束当前回合，并输出 `处理好模型更换后，请仅回复：模型切换卡点解除，继续`。普通“继续”不满足 managed prompt protocol；此前任何模型策略文字都不能跳过该边界，Harness 也不能观察下一条宿主消息或模型是否真的改变。用户恢复后，父 Goal 先识别合格的有界工作包，再判断 profile/capacity；没有用户或宿主显式禁止时，合格集合必须实际调用多个精确 `long_task_implementation`，由宿主结果进入六理由 zero-start 或 partial delegation。数量保持动态，禁止 generic 替代项；Source、Contract、Authority、架构、Context、工作包选择、集成、当前候选检查、正式验证、Final Gate、close 与 completion 始终只由父 Goal 持有。

一组可以直接改写使用的调用顺序如下：

```text
$design-system-authoring 为这个 style-bearing 范围生成、选择并采用项目设计系统；如果 DESIGN.md 已经配置，则跳过本请求。

为 <交付范围> 在 docs/initial-proposal.md 准备一份可写、项目原生的初始方案。

$design-resource-authoring 使用 docs/initial-proposal.md，覆盖 <精确开发范围和目标>。返回完成回改的方案路径、通过校验的 design-resource-handoff-v1 路径，以及选定的不可变规范资源、manifest 和 dependency 路径。

$long-task-workflow 将 docs/initial-proposal.md、<handoff.md> 以及选定的规范资源、manifest 和 dependencies 作为 Source，完成一次完整实现交付。
```

上面的路径只是示例，不是固定目录。候选图片或可编辑探索本身不构成保真实现权威；下游实现使用选定的不可变规范资源及其已校验 handoff。

其他有效路径仍然保留：

- **默认 model-led 交付、不需要新设计资源：** 直接把需求交给当前 coding Goal；默认 Workflow Contract 在任何复杂度下自动生效，不需要 Workflow Skill 或 Contract 文件。
- **机器保障/可恢复交付、不需要新设计资源：** 启用一次 Profile 后，显式用需求或初始方案选择 `long-task-workflow`；该 Skill 会建立 Source-bound Contract Draft，设计资源不是前置条件。
- **交付前确实需要设计资源：** 按上面的设计优先顺序执行，再根据恢复与完成权威需求，把修订方案、已校验 handoff 和选定的不可变规范资源集合交给默认 Workflow Contract 或 `long-task-workflow`。
- **只需要设计资源：** 在 `design-resource-authoring` 完成后结束；除非还明确选择了实现交付，否则不创建 Long-Task Contract。

设计系统通常在项目冷启动时确定，但该 Skill 只由用户选择，`init`、`sync` 与下游 Skill 都不会自动执行。`design-resource-authoring` 只对高保真、品牌化、视觉处理等 style-bearing 资源设门禁；低保真结构、IA/流程与纯语义状态研究不受此门禁。已有计划或提案文档仍是普通 Source，但不再是推荐中间服务。

## Minimal Context 与默认工作流

默认读取顺序是：

```text
project_context/global.md
project_context/architecture.md
project_context/context.toml
default area root
manifest/trigger 命中的少量 area/role Context
```

只有近乎所有任务都需要的恢复事实才使用 `read_policy = "default"`；专业架构、契约、部署和历史细节应由任务触发按需读取。

### 双路由 Context 发现

在判断 `Context Delta` 前，Agent 不再只依赖 `triggers`、`read_when` 与 `read_policy`：

1. 先根据 `context.toml` 的 area、role、trigger 和 graph 收集候选；
2. 再从任务中提取少量高信号词，例如明确的 area/module 名、API、Schema、state、security、verification、deployment 词，对 `project_context/**` 做一次 bounded text search；
3. 合并两路候选，只读取真正相关的 Context；
4. 再判断 `Context Delta: none|required`。

这次搜索只补充语义判断，不会把所有关键词命中都当成 Authority，也不会创建向量/持久索引、缓存、Registry、search state 或第二权威。它仍可能漏掉完全不同的同义词或间接依赖，因此每个实现需求仍要执行 Architecture Deliberation 与收尾 Conformance。

`ty-context doctor` 会报告确定性的默认 Context 文件/字节规模、单文件与总量软预算超限、字节完全相同的默认文件，以及 `DESIGN.md` 权威状态。这些只是维护提示，不是新验证 Gate 或运行时状态。如果真实的近乎通用恢复事实超过字节启发式预算，应保留事实并接受 warning；绝不能为了满足预算而遗漏、过度压缩或错误分类必需 Context。

Context 负责耐久的意图和边界，代码负责当前实现，测试/CI/浏览器或运行时证据/人工负责行为与产品验收。

### 稀疏 Context Workspace 与 Monorepo

Monorepo 可以让 Context 继续集中维护，同时只镜像确实拥有耐久非代码事实的实现 workspace：

```text
project_context/
  areas/                              # 跨 workspace、仓库级、共享 owner
  workspaces/
    mobile/areas/...
    wechat-miniapp/areas/...
    api/areas/...
```

每个已表示的 `project_context/workspaces/<workspace-id>/**` 通过现有 `[[areas]].root` 与 `context` 精确对应一个仓库相对代码根，内部可以有多个 workspace-local Area/role owner。反向映射是稀疏的：没有耐久 Context 的 package-manager workspace 不创建空目录。真正跨 workspace、仓库级、共享或治理 Area 仍放在顶层 `project_context/areas/**`；完整代码 workspace 清单继续由 package-manager/build 配置拥有。单 workspace/非 monorepo 项目保持原有顶层 Area 布局、初始化和验证。

Monorepo 应优先用一个小型顶层 Area 保存仓库公共的 default Context；workspace-local Context 默认 `on-demand`，除非它确实近乎所有任务都需要。core/default 集合、manifest 候选和 bounded search 仍只是可扩展的起始 working set，不是读取 ACL、最大集合，也不要求读完整个目标 workspace。任务需要时可以继续读取兄弟 Area、共享后端、跨客户端 contract、根 `DESIGN.md`、选定资源或代码。根 `DESIGN.md` 仍是当前共享项目 Design Authority；Context workspace 目录不会自动拆出多套设计系统。

产品编辑前，用用户、产品、路径和仓库事实解析本任务 intended workspace(s)。只有仍无法区分多个实质不同的同级目标时，才问一个精确问题；不能默认选择 default Area、最近改过的客户端或通用关键词命中。跨 workspace 任务列全目标和 supporting/shared scope。实现后，如果仓库已有 changed-path / target-scope verifier，就用本任务准确变更路径调用；否则在 Conformance 中按 durable owner 检查最终 diff。Tiny Context 不新增 `[[workspaces]]` schema、自动 package-manager 拓扑扫描、强制迁移、持久 target 状态、通用 import/path/runtime scanner 或第二套 Long-Task scope classifier。

默认 model-led 路线在任何复杂度下都保持轻量：

1. 读取 core/default Context，收集 manifest 候选；
2. 在 `project_context/**` 做一次 bounded Context search，并在依赖需要时继续扩读；
3. 多目标仓库先解析本任务 intended workspace(s)，但不把 Context workspace 或 Area 变成读取/修改权限；
4. 按风险比例识别材料性要求、条件、owner、失败边界和验收入口，不建立精确 Fact/Obligation 账本；
5. 对用户可见地给出一次简洁、仓库事实绑定的 Architecture Deliberation，并说明触发的质量属性或具体 preservation basis；
6. 决定 `Context Delta: none|required`，耐久语义改变时先更新 owner Context；
7. 使用平台内部计划，在 Goal-owned 边界型质量 guardrails 下实现；
8. 对当前候选运行项目原生验证和已有 changed-path / target-scope check；定位、修复失败，并重跑被后续修改影响的检查；
9. 执行证据边界内 Contract Conformance，其中包含 Engineering Quality Conformance 和 Architecture Conformance，再单独执行 Context drift check；
10. 分别交付 `Implemented`、`Verified`、`Unverified`、`Blocked / decision required` 和 Context 状态。

默认工作流不要求 `plan.md`、target declaration、matrix、verdict、evidence ledger、持久检索索引或第二份执行计划。controlling Source 缺失、过期、不可读或冲突，观察边界不可信，或证据失败/过期时，受影响范围不能得到无保留完成结论。任务时长、文件数和复杂度不会自动激活 Long-Task。

每次交接只报告一个 Context 结果：

```text
Context: updated <文件/原因>
# 或
Context: no durable fact change
```

### 工程质量与模块化

Shared Engineering Quality 在不增加工作流的前提下扩展原有架构义务。每个实现需求都在第一处实现编辑前，对用户可见地完成一次 `Architecture Deliberation`；风险改变深度，不取消这个环节。小修改要指出具体 owner / 当前 extension point、未改变的耐久边界、适用质量属性的 preservation，以及为何没有新增或加重技术债。material 工作还要覆盖唯一 source of truth、dependency 与 interface/state/resource lifecycle 边界、选中和拒绝的方案、至少一个合理未来变化及其扩展点、触达的技术债、forbidden shortcuts、项目原生可执行检查和触发的 failure/load/threat 场景。correctness/invariant 与 maintainability/changeability 至少给出 preservation；reliability/resource lifecycle、concurrency/consistency、performance/capacity/cost、security/privacy/safety、compatibility/migration/rollout、operability/observability/testability 只在 material 时激活。

当工作新增基础设施、实现成熟协议/安全边界、引入依赖或共享抽象，或遇到邻近 extension point 时，Architecture Deliberation 会按风险增加 Build / Reuse / Buy 判断。它记录 allowed solution set、prohibited failure modes 与 required rationale/evidence，而不指定唯一库或抽象。复用现有 owner、标准能力、已安装依赖、成熟且兼容的外部库、小型有界自研和有意不抽象都可能合法；重复 owner 规则、绕过 extension point、无依据重依赖、不完整安全能力自研、许可证/平台不兼容、强行抽象与第二 source of truth 均不允许。这里不增加强制开源/DRY 规则、通用评分、阶段或 Gate。

实现顺序、方法和反馈节奏仍由 Goal 决定。轻量纪律只要求复用 owning service/facade/adapter 与唯一 source of truth，做最小而完整的变化，保留明确 failure/resource 语义，并仅为稳定概念或有证据的变化轴增加抽象。精确产品/技术谓词继续由 Semantic Facts 拥有，精确选定 UI/UX 值由 selected-design closure 拥有。

实现和项目验证之后，`Engineering Quality Conformance` 包含 `Architecture Conformance`，对当前候选快照检查 scope/path escape、owner/dependency 违规或 bypass、重复 truth、未声明 boundary/lifecycle 变化、silent failure、适用 resource/concurrency/security/compatibility/operability 缺陷、无证据性能声称、缺失声明检查和新增/加重技术债。性能声称必须绑定 workload、metric、baseline 或 budget、environment、comparator/tolerance 和项目原生 benchmark/probe；静态形状不证明运行时性能。候选或 controlling input 再变化就使结果失效。默认路线把它放在 Contract Conformance 内；Long-Task 用已有 Source-backed obligation/constraint/forbidden shortcut、owner/path/Binding、executable Check，以及功能 pass 时仍可能独立失败的 Assertion 表达不变量。Final Gate 是唯一 Long-Task carrier，只证明该声明、可证伪、项目检查绑定的集合，不证明整体代码质量；同一候选不会执行两套 carrier。

Contract Conformance 主要检查当前 Source/Context 是否到达实现和验证；单独命名的 Context drift check 反向检查实现或新决策是否让耐久 Context 过时。新增或加重技术债默认阻塞，除非项目有带 owner、rationale、tracking 和 removal condition 的显式 bounded exception。无关 legacy debt 不自动扩张任务范围，但本次触达、依赖或加重的债不能隐藏。

`Architecture Context Hit`、`Decision Rationale Hit: existing|required|none` 和 `Modularity Check: none|required|exception` 仍是内部路由问题，不创建 Task Contract 或固定 `plan.md`。可见检查点只证明“存在可审查的考量”，不暴露私有思维链，也不保证最佳设计或预知所有未知未来需求。该义务不增加质量 plan/stage/matrix、第二 Authority、Contract field/aspect/Claim/risk kind、Gate、state 或 Receipt。

Harness 只路由仓库原生 type/compiler/lint/AST/dependency/contract/behavior/benchmark/probe，不实现跨语言通用架构、质量或性能分析器。`ty-context check-modularity` 是 capability-aware portable risk signal：所有纳入格式检查物理行；JS/TS family 另做 lexical 单函数语句/分支、export、state-transition 与 responsibility 启发式；Python 只做专用 lexical 单函数语句/分支；其他格式（包括没有 SFC parser 的 Vue）只做 line-only。输出明确 `analysis=js-ts-heuristic|python-heuristic|line-only`；不支持指标内部为 `null`、CLI 为 `n/a`，绝不伪装成零，也不参与 risk/regression。它不是完整 static analysis、架构证明或运行时性能证据。

新配置默认 `strict_except_generated`；需要 bounded legacy exception 的项目可使用 lifecycle-complete `scoped_waivers`。显式 `ty-context upgrade` 只清理那些纯粹因退役跨语言 JS 启发式的现已不支持指标而存在、且目标没有当前受支持风险的 waiver；普通 `sync` 不执行该迁移，其他 stale/invalid waiver 继续 fail closed。

### Product Surface 与 Screen Contract

`context_surface_contract` 继续使用现有 `contract`、area/subdomain 和 verification 角色。`product-surface-contract.md` 负责跨页面、主层/下钻与共享职责；可选且按需读取的 `screen-contract.md` 负责单屏 entry/exit/shared state、信息层级、语义区域、导航/变体、material controls 和 target/verification 引用。它们不新增 `design`、`screen` 或 product-surface Context role，局部样式修复也不要求补建 Screen Contract。

material UI 在实现前执行 **UI Authority Closure**：每个稳定 surface/control/target key 必须归类为现有 Context 已覆盖、需要 Context 更新、task-local、显式 out-of-scope 或真正 decision-required。Design Source Projection 把长期 surface/flow/Screen/Control/state 含义放入既有 Surface 或 Screen/interaction Context，把视觉系统/token/motion policy/rationale 放入 `DESIGN.md`，把精确构图/数值/条件/asset 留在 versioned target，把可重复证明路径放入 verification Context，而 delivery-local coverage/provenance/blocker 留在任务或 Contract Source。出现冲突时 fail closed；当前代码、时间戳、YAML 或实现截图不能静默胜出。

### 非 UI 语义完整性

两条开发路径都保留直接表达、逻辑必然、明确委托或权威仓库证据支持的全部非 UI 要求；这既包括产品/业务语义，也包括技术、后端和架构语义，当前代码不能静默重定义 Source。两者的证明等级不同：默认路线按风险比例理解材料性要求和条件并诚实报告证据边界；Long-Task 才把完整声明范围转化为精确机器义务。

Long-Task Source authoring 必须完整索引 material 请求片段、附件、controlling Context unit、canonical specification、外部约束、需要保留的仓库事实和 delegated instruction。标准目录是强制下限：目标/scope/glossary；actor/role/tenant/entitlement；业务规则/计算；entity/field/relation；command/query/workflow/state/time；validation/output/error/API/protocol/event/job；persistence/cache/search/transaction/consistency/concurrency/idempotency；fault/retry/degradation/recovery/backup；configuration/flag/secret；compatibility/migration/rollout；performance/capacity/cost/reliability/SLO；security/privacy/safety/compliance；observability/deployment/operations；integration/notification/file/media/localization/commercial；hardware；AI/ML；architecture owner/boundary/debt。领域特有 family、property、condition axis 和 proof method 必须扩展这个下限。

在 Long-Task 中，每个适用 subject、typed relation 和 static/dynamic population 都有稳定身份。actor/role/tenant/version/environment/state/input/boundary/locale/time/concurrency/dependency/failure/migration/rollout/threat/custom condition 的每个适用值与精确组合都是一等原子项。每个 atomic property 要么明确 specified，要么有准确对象、basis 和 rationale 的 N/A/exclusion；unresolved、unavailable、conflict 或 unreadable 会阻断。`all-states` 等聚合字符串、默认路径、representative/pairwise sample 和无依据 N/A 都不能冒充原子 cell。

一个 Long-Task semantic Fact 绑定 `Outcome × subject/relation/population × exact condition × atomic property × typed expected predicate`，并保留 owner、Source locator/digest、provenance、quantifier、observation boundary 和 sensitivity。Fact identity 与 proof obligation 分离：每个 Fact 展开所有 required methods，并一直观察到最远可独立失败边界，同时冻结 comparator/parameters/tolerance/mask、Oracle capability/identity、environment 和 protected-value policy。精确值留在 Source 或 owning Context，下游只保存身份与比较权威，不复制成第二份语义数值源。

默认路线不创建 Expected Fact Universe、稳定 Fact/Obligation Key、精确集合等式、全条件 Cartesian 展开、冻结 Oracle graph 或逐 Fact 结果账本。它识别材料性要求、条件、owner、失败边界和验收入口，在最后一次相关修改后运行可归因的项目原生检查，失败后返工，并分别报告 `Implemented`、`Verified`、`Unverified`、`Blocked / decision required`。显式 Long-Task 则在 Source 中持久化一个 `semantic-fact-manifest-v1`，要求 `Expected = Source Indexed = Contract Indexed Facts`，把每个机器义务映射到单 Fact Assertion 和 typed `semantic_fact` result（或命名 External Confirmation），并在现有唯一 Final Gate 中验证 expectation/result 精确相等。任何 missing、extra、duplicate、unresolved、unmapped、unimplemented、unexecuted、stale、failed、proxy-only、reused 或 indistinguishable Long-Task row 都阻止机器接受。

该机制不能发现用户从未表达的意图，也不能证明任意 Inspector/Oracle 的语义绝对正确。它只能补全必要推导与用户明确委托且可辩护的选择；真正的产品、法律、安全、商业、安全性或外部 owner 决策继续阻断。耐久含义仍进入既有 Context owner，代码仍是当前实现事实；不会新增第二 plan、registry、Authority、Gate 或固定实现顺序。

### 视觉交付指导

两种开发路径共享选定设计 Source 权威，但不共享形式化证明等级。正式 handoff 仍必须提供机器可读的完整输入并通过精确 preflight；默认路线随后打开受影响 target/condition，路由到生产 owner 和最终候选项目检查，并报告未被检查建立的条件；Long-Task 额外提供逐 Fact/Rule 的精确机器闭包。两者都不授权从静态图推断未表达交互，也不能证明用户没有遗漏要求。Open Design 有能力输出实现级 HTML/CSS/JS、spec、token 与 asset，但“有能力”不等于每次都产出：选定 Web/App 实现 handoff 时，`design-resource-authoring` 必须显式委托并完整取得一个机器可读 canonical entry 及其精确 dependency closure，逐文件冻结 digest，并暴露稳定的 typed locator；进入 `ready` 前，还要在这些不可变字节上逐项执行声明的 verification method，无法消除的 code/spec/token/asset 冲突保持未决/不可用并阻塞。这是源资源 QA，不是生产验收。PNG 只能作为派生视觉基线，不能成为唯一实现源。

provider-neutral handoff 是残余语义与绑定层，不是 CSS 文本副本、第二份数值权威或第二份完整 Fact 索引。正式 Web/App 生成前，`design-resource-authoring` 必须从明确 scope、已采纳 Design Authority 与冻结的 Inspector/Census 义务中先推导 Expected Fact Universe。原子单元是每个适用的 `subject × selected target × condition combination × variation combination × property` Fact Cell。subject 一等覆盖 surface、region、overlay、component family/instance、control、每个 anatomy part/slot/primitive、text、icon、media、asset 与 relation；condition 一等覆盖 33 个标准 condition axes，包括 platform/runtime/device/viewport/density/safe area/window/fold/display/color/localization/content/data/text scale/input/assistive 与无障碍偏好/system UI/IME/permission/capability/connectivity/lifecycle；variation 一等覆盖 5 个 variation axes：`variant`、`state`、`interaction_phase`、`presence_phase` 与 `instance_case`。property 使用 geometry、layout、scroll、typography、color、decoration、content、icon、media、interaction/navigation、motion/feedback、responsive、accessibility、asset、system、relation 共 217 个标准原子属性键，并允许显式声明 custom property。

生成的 canonical implementation source 仍是精确值的唯一 owner。其 dependency closure 内含 `design-resource-observable-fact-manifest-v1`：稳定 subject/property/Fact ID、typed locator、定位值 digest、单位/舍入/pixel snapping、token/effective-value lineage、dynamic population/relation/asset、required proof method、comparator parameter/tolerance/mask、Oracle identity/capability 与 render environment。冻结 Inspector 必须完整枚举 resource/node/declaration/token/asset/relation/custom-property/variant/state/interaction/dynamic-population Census；complete-generation count 与 digest 证明没有抽样或截断。每个适用 Fact Cell 要么由一个原子 Fact 覆盖，要么有带 Source/basis/rationale 的显式 blocking/non-applicable disposition。“all states”等聚合字符串不能冒充原子值，也不能用 default 页面或 shared style 推断其他适用组合。

`ready` 必须满足精确集合等式：`Expected Fact Universe = Canonical Resource Facts = Handoff Indexed Facts`，并闭合每个资源为 material-with-facts 或真实 supporting-only。canonical per-target manifest 是完整 Fact/Census/proof 索引的唯一 owner；同一个已发布的 `design-resource-handoff-v1` 标识下，新文件用 `representation: manifest_backed` 只保存 Source/scope/resource/target/closure/coverage/proposal 绑定，preflight 从冻结 manifest 直接还原原有完整 V1 对象。旧的嵌入式 V1 只保留读取兼容。UI symbolic V2 仍是显式 opt-in，V1 仍是默认；V2 可以保留旧式精确 remainder rows，也可以用 package-owned property profiles、冻结 Inspector custom-property closure 和唯一 instance exceptions 消除物理 N/A 矩阵，但每个逻辑 subject-property 点仍必须得到唯一 disposition。Rule 省略轴时，Source-side 与 production-side 都必须由冻结闭世界静态依赖闭包、受限 IR 精确等价或有限完整域真实穷举等价之一证明；动态加载、反射、未冻结隐式输入、外部设备、代表点与抽样均阻断。`exact_target` 的每个适用 condition 还必须分别闭合 full-target layout 与 pixel Facts。preflight 会在不可变本地资源上解析 manifest 与全部 typed locator，校验 dependency/Census/Fact/proof closure，并拒绝 missing、duplicate、unresolved、unsupported、stale、media 不兼容或数值冲突；探索候选仍不需要 schema。

每一种 non-interference 方法都必须使用带 digest 的 frozen executable Oracle，并声明精确的 `symbolic_noninterference.<side>.<method>` capability。Source 侧的完整 Inspector 输入集合必须为每个 admitted scope 包含唯一、canonical、无执行能力的 `design-resource-symbolic-source-ir-v1` 资源；package 将它绑定到当前 target、certificate 与 Rule scope，重新解析当前 bytes，并自行派生 dependency DAG、canonical predicate 或有限完整域逐点结果。提交的 graph/root、side/axis-erased predicate、evaluation claim 与 passed verdict 只是 Oracle 输出缓存；preflight 强制 `当前复算 = artifact bytes = proof binding/cache`，且 artifact 不进入语义输入闭包。因而静态证明不能由轴列表自证，也不能从 Rule refs 反造 Source graph。JavaScript、CSS cascade/隐式 DOM、可执行 template、dynamic load/fetch/import、reflection、computed access、未冻结扩展和外部 runtime/device dependency 在存在 package-owned 完整 extractor 前全部阻断；production 侧继续只接纳 package 可完整解释的静态 HTML 与 inert JSON 子集。两侧都绑定 Oracle implementation closure/version/capability、environment、每个输入的 path/declared/current digest、当前 Source-manifest 或 production-target snapshot、精确 Rule/certificate scope、omitted axes、派生 method result、artifact path/digest 和可归因 failure witness。两侧 proof digest 进入 certificate identity，并在存在省略轴时进入既有 Contract expectation/current Final-Gate result；admitted 表示之外的抽取正确性保持为明确 TCB 边界。

容量优化发生在生成表示上，不是生成后拆分。写 Markdown 前，DSA 冻结明确的 canonical manifest 路径集合、target/scope identity、文件 SHA-256 与每个 collection 的精确 count/identity digest，并声明实际 UTF-8 上限；随后直接生成一 target 一份的小型 manifest-backed draft，其中不再复制 axes/conditions/subjects/variations/properties/lineage/Fact Cells/Facts/evidence/proofs/Oracles/environments/assets/blockers。共享含义用唯一 key 的 target-attributed Source Fact 保留原 predicate 与 provenance。`ty-context design-resource bundle` 对完整 draft/manifest 集合逐 target 做单快照 preflight，拒绝嵌入式全量数组、多 target draft、超限 descriptor、target 缺失/多出/重复及任何 manifest/digest/语义漂移，再用同卷临时目录把整组原子发布到此前不存在的最终目录。失败只删除命令自己的临时目录，不覆盖、拆分或改写 draft/已采纳 handoff。字节检查只是防止生成器违约或后续突变，不是 post-hoc split；真实 residual 数据若无法满足所选上限，就判定该上限不兼容并 fail closed，绝不拆 target、抽样、截断、粗化 Fact 或扩大 exclusion。Long-Task 只在既有读取接缝逐 target 消费规范化对象，不改变 Contract、Authority、Outcome、Final Gate、状态恢复或完成判定。

这些输入仍是 Source。默认 Workflow 打开受影响的 exact target/constraint 及其声明条件，把它们路由到生产 owner 和冷启动旅程，在最终候选运行适用的视觉、交互、无障碍或 runtime 检查，并报告检查未建立的条件；它不重建完整 UI Fact Cell universe 或逐 Fact×method 生产结果账本。Long-Task 把精确 expected universe 投影进已有 Claims/Assertions/Checks/Bindings：每个 method/condition cell 保存精确 `fact_refs`，每个 Fact/proof obligation 有一个 `fact_expectations` row。只有 package-admitted observer 提供 Actual 且由 Harness 完成 comparison 时，当前 `fact_results` row 才能关闭该 cell；否则保留阻断性 External Confirmation，Final Gate 不会伪造 result。当前 slice 不准入 UI layout/pixel/accessibility/motion、browser/native/device、protected 或 tolerance/mask observation。两种 carrier 互斥。生成成功、截图、hash、Census 与 preflight 只证明输入完整性/完整性，不证明生产一致性。

默认 Workflow 会在 material 产品、设计、实现或验收判断前执行 UI Authority Closure 和条件式 Design Authority Check。它沿稳定 key 到 exactly-one canonical adoption record，再主动打开每个受影响的 selected `exact-target`/`constraint`；只看到 registry 或 handoff index 不算已消费。项目/系统/component-family target 由 `DESIGN.md` canonical 记录，单 screen/interaction target 由 owning Screen Contract 记录；该 record 独占 interpretation、selection basis、immutable locator/digest、condition coverage 和 editable upstream/update route，其他层只保留 stable key、owner/anchor 和 local applicability。缺失、不可读、过期或冲突时 fail closed；更新必须产生新 immutable version，不能覆盖旧基线。未配置 starter、候选稿、只有风格文字或灵感图都不能授权 agent 发明生产布局。明确的设计系统采纳请求路由到 `design-system-authoring`，独立资源生成请求路由到 `design-resource-authoring`；已有充分权威的实现、局部样式修复和 throwaway prototype 仍保持轻量。

只要是已经选定、准备进入实现的设计资源，DSA 先用 `ty-context design-resource bundle` 发布精确 target 集；两种开发路径再对每个已发布 handoff 运行 `ty-context design-resource preflight <handoff.md>`。取得不完整、缺少或多出未声明依赖/target、target 重复、不安全路径、manifest/文件 digest 过期、虚构 locator、Census 未冻结/不完整、生成被抽样/截断、轴值被聚合、Expected/Canonical/Handoff Fact 集不相等、required method 缺失、comparator/Oracle/environment 绑定无效、design-system lineage 未解析、适用 cell 未覆盖、exact target 缺 full-target layout/pixel Fact、证据不受支持或含义未决都 fail closed。preflight 只证明设计输入语义完整且资源身份正确；开发流程仍必须打开真实资源，并从生产入口证明当前实现。

Long-Task 投影继续要求每个 Claim-bearing Assertion 只绑定一个 Claim。对每个 selected-design verification method，target 的 root conformance Assertion 与该方法的独立 Assertion 以并集覆盖其 Fact/Rule 引用的 Source Claims；该并集只补齐覆盖，不合并方法 capability、证据、结果或失败归因。

repository pattern 只把圆括号作为经过转义的 route-group 字面字符，不把它们解释成正则分组或 extglob；现有 `*`、`**`、`?` 语义保持不变，`[]`/`{}` 仍不受支持。

对 material 工作，`context_uiux_design` 应用上面的投影规则并让风险比例化 coverage reasoning 保持 task-local。`context_development_engineer` 用稳定 surface/control key 把每个受影响的 selected target 和声明 condition 追踪到生产 route/component owner、冷启动真实用户旅程及适用的渲染/交互检查。第一个有价值的可运行纵向切片只是建议性的真实入口反馈点，不是实现门禁；最终候选仍必须重跑受影响的冷启动旅程。Source 已明确要求的组合不能静默删减，但默认路线应报告未被证据建立的条件，而不是声称精确机器闭包。资源哈希、manifest 和数量只证明资源完整性，实现截图既不能成为自己的目标，也不能单独证明实现一致性。

显式 Long-Task 是同一共享义务的强权威载体。它在 Compile 前解决缺失/冲突的 UI 权威，并用 `field_coverage` 闭合每个真实 Product Control 的全部 22 个 canonical 字段；这条产品语义投影与更细的 design Fact universe 相互独立，绝不构成粒度上限。选定 target 冻结 canonical manifest identity/digest，并把每个原子 Fact/required-method 对投影为一个 `fact_expectations` row，其中包含 subject/target/condition/variation/property identity、expected located-value digest、comparator/parameter/tolerance/mask、Oracle identity/capability、environment 和 sensitivity。只有 package-admitted observer 能提供匹配的 `fact_results` Actual/comparison row。当前 slice 中，项目 `design_conformance`、`design_method` 与 `fact_results` record 只作诊断；受影响的 UI/design obligation 必须保留阻断性 External Confirmation，不能成为 machine proof。Product `surface_bindings`、Control Claims/relations 与 root-entry journey 继续承载产品语义，已有 Claim、Assertion、Check、Stage、Binding、revision 与 Final Gate 仍是唯一 Long-Task 生命周期和 closure。每个 blocker 保留精确 Source-item/method/capability lineage，不能在 Contract 内自行豁免；缩减范围必须修订 Source/Contract 权威。

combined design-and-implementation 可以先用普通 Outcome/Stage 生成候选，但 candidate/planned target 不能解锁 fidelity implementation；选定结果必须先成为真实 marked Context-reachable Source，并由 owning Context/`DESIGN.md` reference 连接，Authority Lock 后再通过 Authority Revision 采用。浏览器视觉 AC 可使用 `ui_browser` 做诊断定位，但当前 machine closure 仍是 External Confirmation；浏览器代理、独立 route 或深链接不能证明可独立失败的原生/root 旅程。资源完整性和 `visual_render` 不能替代选定目标的实现一致性。冻结 baseline 是 verifier input，生成的 actual render/diff 是当前 artifact，主观批准保持外部。这不新增 `uiux_delivery`、视觉 Claim type、resource registry、risk level、lifecycle state、Gate、必需设计目录、逐控件截图矩阵或通用像素阈值。

`ty-context doctor` 保留兼容的项目级 `missing | unconfigured | configured` 状态，并增加 Design Authority Index、token source 和已分类 reference 的 advisory 信号。它明确不推断页面实现就绪；material surface 仍需 owning Screen/Control meaning、selected target/constraints 与项目自己的验证路径。

静态 guidance 测试只能证明分发、投影与 canonical ownership 文案存在，不能证明 Agent 实际恢复了全部 UI/UX 信息。可选 delivery-mechanism benchmark 提供固定 fresh-agent UI/UX Context/target recovery task、routing gold 和隐藏 production oracle；只有独立配对运行才可以支持 effectiveness/ROI 结论。

### 显式 Design System Authoring

只有用户明确要求初始化、生成、选择、采纳、替换或修复项目设计系统/设计风格时，才使用 `design-system-authoring`。安装只让冷启动能力可用，不会自动运行。Skill 会发现 Open Design 当前真实 MCP resource/tool；若当前版本只通过 MCP 读取设计系统而没有创建 tool，则使用同一个已安装 Open Design daemon 的官方 generation/revision/accept API，不复制 provider prompt，也不把 daemon 调用冒充 MCP。

生成结果先是候选。必须有明确人工选择，或用户明确委托且选择标准已知，才会采纳到项目 canonical `DESIGN.md`、唯一 authored exact-value token source/generation direction，以及真正拥有 surface/interaction 耐久事实的 Context。Open Design provider ID、revision、digest 与 project binding 只是同步 provenance，不是第二权威。provider 执行成功、artifact ready、selected、authority adopted 与 `get_project.designSystemId` binding verified 会分开报告。

### 可选 Design Resource Authoring

只有在用户明确要求生成、迭代、准备独立设计资源、为一段明确开发内容准备设计资源或使用 Open Design 时，才使用 `design-resource-authoring`。输入可以是零散笔记或初始方案、产品/技术方案、专门视觉 brief、截图、已有资源或其他已有计划文档。独立的中间 authoring 文档不是前置项，也不再是推荐步骤。

Skill 把明确输出或开发内容当作硬 scope ceiling。局部功能只可带上定位它所需的周边上下文；再丰富的背景也不能把生成范围扩成页面其余部分或整个产品。面向实现 handoff 时，Skill 要覆盖范围内所有材料性的 UI/UX 含义：surface/flow 与 region 结构、视觉和内容呈现、控件结构/尺寸/变体、静态与动态状态、交互/反馈/恢复/动效、响应式/平台/输入方式、可访问性及必要资产；先扣除已有 selected Source 明确覆盖的条件，再发现 Open Design 当前 agent/model、functional skill、rendering template、design system、plugin 与 export route，并把每种候选资源说明为 `selected`、`optional`、`not-needed`、`unavailable` 或 `decision-required`。

正式首次生成、重大设计修订和关键重新生成使用实时发现后满足工具、视觉/上下文能力、认证与数据边界的最高能力模型，以及该模型实际支持的最高 reasoning effort。排序只能依据 provider 明确的能力等级、推荐替换关系或唯一且有版本依据的 provider-local fallback；不得从价格、模型名、发布时间或列表顺序猜测。多个 eligible model 无法排序时以 `highest_performance_unverified` fail closed；provider 不可控制或不能回报实际 model/effort 时也必须保留同一限定，不能声称已执行最高档。该策略不创建 model registry、scheduler 或持久 routing state。

正式 Web/App implementation output 中，“完整”默认就是上文的范围内最细可观察 Fact 粒度。Skill 在委托生成前先构造 Expected Fact Universe 与冻结 Inspector/Census 义务，把它们连同已采纳 design-system identity 一起传给 Open Design，并要求返回的 canonical source/manifest 表达每个适用 cell；不能等下游实现时才发现或自行补设计 anatomy-part、状态、响应式/平台/text-scale、动效、无障碍或资产事实。

Skill 会先分类 visual-style dependency。高保真/品牌化输出、视觉方向、字体/颜色/密度、组件视觉处理和 production-style prototype 属于 style-bearing：若 `DESIGN.md` 未配置或没有唯一 authored token source/direction，Skill 必须在创建 provider project/run 前停下，并提示用户显式选择 `design-system-authoring`，绝不自动初始化。低保真结构、IA/flow topology 和纯语义 behavior/state study 属于 non-fidelity。style-bearing 工作必须把已采纳 provider ID 传给 MCP `create_project.designSystem`，并用 `get_project.designSystemId` 验证一致。

Skill 只通过结构化 MCP（必要时有限使用 CLI/daemon/UI fallback）委托最小充分的 artifact/file 集；最小化的是包装数量，绝不是信息粒度。一个 canonical HTML/CSS/JS 原型加 manifest、tokens/assets 与可检查的 state/component workbench 就可以承载数千个原子 Fact。重复控件可以映射到共享变体，只有仍缺少材料性含义的独特/复杂控件才需要专门状态或交互稿。静态/default 页面不能自动代表没展示的动态状态、交互、动效、响应式或可访问性。原型、低/高保真组合、组件板、provider-native 输入、逐控件一份稿、变体数量和目录都不是全局必选项。设计资源可以表达用户可感知的交互语义和产品规则的呈现方式，但业务、数据、权限和算法逻辑仍由产品/技术 Source 所有。Tiny Context 不复制 Open Design 的 prompt/template，也不内置 provider catalogue。

面向 Web/App 实现时，Skill 必须取得上文所述完整 canonical entry/dependency set 与可寻址事实。Figma 适合已经存在的设计团队权威，需要原生 Components/Variables/Variants、共享库、Dev Mode 或 Code Connect 的场景；Penpot 适合明确需要开放、自托管多人设计基础设施的场景；OpenPencil 可作为本地静态布局 sidecar，但当前 prototype/motion 模型仍不完整。把完整 Open Design Source 默认转换为另一种表示会增加同步和运维成本，却不会关闭新的 enforcement gap，因此三者都不是默认依赖。

探索模式只做最小完整性检查并尽快展示指定候选，不需要 handoff schema。明确或受托最终选择且资源将进入实现时，Skill 只做一次合并、幂等的初始方案回改，并在任意获准的项目路径按 target 写 provider-neutral、带 Source marker、且只含一个严格 manifest-backed `design-resource-handoff-v1` block 的 Markdown。canonical manifest 保留完整 Inspector/Census/Fact/proof universe；小 YAML 只记录其不可变 resource/target 绑定及 residual 产品/coverage/Source/proposal 含义。共享 preflight 还原同一个完整校验对象，不能把取得不完整、不可寻址、`decision_required`、`unavailable`、证据不成立或过期的输入称为 ready。这里没有固定目录、provider pack 或逐控件一份稿；适配器只是普通 Source，不是 Design Authority 或验收结果。除唯一被明确授权的 Proposal 写回目标外，Skill 不会修改调用方已有计划/提案 Source、`project_context/**`、`DESIGN.md`、生产代码或 Delivery Contract。

材料性的 DRA 修订循环只从绑定 raw-byte digest 的 Base 与完整有序 Delta 语义重放。确定性 accepted authority 还必须在同一个、受文本 digest 覆盖的 marked Source Item 内提供严格 `ty-dra-authority-v1` 投影：explicit choice 精确绑定 target/kind/origin/meaning digest，delegation 只绑定其选择范围，绝不会自动成为非视觉 meaning Source。每个 semantic target 最多只有一个 active accepted Delta owner；rejected、unresolved 与 superseded Delta 组成精确 leakage 全集。单一 v3 audit-expectations catalog 冻结 changed/unchanged/resource-decision/blast-radius/leakage rows 与 selected-resource conditions，当前审计必须 set-equal 且不得有重复 identity。exact-patch-v2 把每个 active non-preserve `Delta × target` 恰好一次绑定到 Proposal 文本区间与语义 digest；每个 binding 恰有一个 `proposal-written` owner，或一个结构化且仓库可读取的 `resource-owned-exact-visual` owner。只有真实跨中断需求才可显式 `create` 一个 ignored、任务局部、非权威 checkpoint；`update` 只能通过调用方给出的 checkpoint digest CAS 替换，`inspect`/`preview` 重新派生当前状态。`apply` 使用写前/写后 raw-byte CAS 与写后重读对账，只报告 applied、idempotent、blocked 或 external-resource revalidation pending，而不报告 handoff readiness。`remove` 仅在目录清单证明其中只有 digest 匹配的 helper checkpoint 时完整删除；否则返回 `partial` 并保留非 helper 内容。简单 preview 不创建 checkpoint、持久字节、暂停、Provider run、正式 handoff、Proposal 写回或 helper transaction。checkpoint 与 reconciliation 只是上游恢复/诊断数据，绝不是 Design Authority、Long-Task Source/Evidence 或完成证明。

实际生成仍由已配置的 Open Design/Product Design、Figma、图片生成、原型工具或人工设计流程负责。这些输出以普通 external Source 进入默认 Workflow 或 Long-Task。candidate 与 inspiration 不授权 fidelity；adopted exact target/constraint 作为 Context-reachable Source，由 owning Context/`DESIGN.md` 把稳定 key 连接到覆盖条件、不可变身份/digest 和 editable upstream owner/locator/update route。`context_uiux_design` 在下游执行 UI Authority Closure，只把耐久事实采纳到 Context/`DESIGN.md`；实现截图与 diff 仍是证据 artifact，不能自我授权为目标。

维护者可以设置 `TY_CONTEXT_OPEN_DESIGN_MCP_COMMAND` 与可选 `TY_CONTEXT_OPEN_DESIGN_MCP_ARGS_JSON`，运行 `npm run smoke:open-design` 做显式启用、只读的 discovery smoke。正常测试使用本地 mock MCP，不依赖 Open Design、登录、付费能力或不确定的设计输出。

### 退役独立 Authoring 兼容

退役的独立 authoring 指针不再安装或由 package 管理。升级迁移只删除字节完全等于原 package 内容的副本；同名但已修改的内容保留并要求人工处理，普通 sync 不维护 tombstone 或盲删规则。`long-task-workflow` 从入口立即打开非权威 Contract Draft，并让完整 input inventory、混合输入综合/细化、稳定 Key、Product Control 级语义、偏好/调研/委托溯源、Source marker/provenance、acceptance/risk 与 Contract 映射在同一循环中收敛。这里的 Control 语义投影不限制另一条选定资源“完整可观察设计事实”清单的粒度。已有计划或提案文档仍是有效普通 Source，但不再创建独立或内部 Source-authoring 阶段、handoff、Schema、Gate、State 或第二份计划。

## Single-Goal Rolling Delivery

只有用户显式选择 `long-task-workflow`，或当前 worktree 已有 active long task 时才使用。它固定为：

- 一个当前宿主选定的原生执行 Goal；压缩可在该 Goal 内继续，后续物理 Goal/session 只恢复语义状态，不重连旧 Turn；
- 一个用户选定的仓库与最终验证/收敛 worktree；
- 一次完整选定交付、一个 Contract、一个 Final Gate；
- Outcome 依赖只表示验收与中间证明就绪关系，不限制实现顺序，也不表示 Worker 调度；
- 第一次 Authority Lock 后、正式实现前有一次无条件的宿主模型更换检查点；Agent 结束当前回合，用户处理后只回复 `模型切换卡点解除，继续`，普通“继续”不满足 package-managed prompt protocol，Harness 不观察或验证模型是否改变；
- 当前 Goal 自主选择实现顺序、局部计划、工具、具体工作包分解与动态 Worker 数量；满足正向默认谓词时必须实际调用多个精确 `long_task_implementation`，否则声明一个许可的 solo 理由并由父 Goal 执行。Harness 不负责分配、调度、重试或恢复，agent 报告不是 Progress 或证明，所有结果必须汇入同一验证 worktree；Frontier 只提供验收/验证建议；
- targeted verify 是可选反馈与修复证据，永远不能 accepted，也不构成继续实现或进入 Final Gate 的门禁；
- scope-only revision 可先做无状态候选诊断，机械边界内的修复自动采用；只有稳定且确需用户决策的候选才至多询问一次精确 identity；
- Final Gate 在一个当前快照上重跑全部 Check；
- Stop Hook 在结果 stale 时阻止完成。

它的证明命题有明确前提：Source 在声明观察粒度下完整且准确、Source→Contract 投影保持语义、所有实际适用单元被展开；在这些前提下，只有每个机器义务同时具有冻结 Expected 权威、package-admitted 当前 Actual、Harness 计算的 comparison/verdict、可归因静态生产载体或直接 process observation、因果 Counterfactual 与当前 Final Gate 快照证明时，fresh `machine_accepted` 且无待定 External Confirmation 的 `AcceptedDeliveryTerminal` 才推出声明内机器可观察漂移为空。`machine_accepted_external_pending` 只证明已准入机器范围，完整交付仍未完成。Harness 无法发现未声明要求，也不声称任意物理/外部观察绝对可靠。

Compile 为每个机器 Claim 或 Fact × required-method obligation 派生内部 `CompiledObservationAuthority`，它不是新的 Contract Authority、状态或 registry。首版只有两条机器路径：`package_static_json_exact` 读取 runner 前快照中已存在、runner 后 no-follow 文件 identity/digest 不变、匹配生产 Binding 且不属于 Source/Context/Contract/expected/evidence/report/status/verifier output 的 UTF-8 JSON 静态结构；prepare-all mutation observation 与逐文件 pre/post identity/hash 共同拒绝 transient/persistent swap，它只证明静态内容，不证明运行时消费。`package_process_json_exact` 只支持 Source-backed 的 `runtime_family: process`、`role: product` 目标，以及 target 和完整 argv 与该权威一致的直接 root `project_binary`。每个 required target 都由一项 canonical Source technical obligation 精确覆盖 key、role、family、root、完整 argv 和 capabilities。Compile 生成声明稳定的 process runtime closure：精确 Source-backed root、当前 Claim/Counterfactual production carriers，以及由有限 argv→production Binding 匹配得到的路径。每个 `root_argv` 数组成员始终是 child-visible exact token；分类器不拆空格、不去引号、不重写反斜杠。封闭语法只检查独立 token 或一个显式 `--name=value`，支持的 standalone switch 是 label，其他 compound form 不获得机器闭包；raw token 与派生 locator 分离。quote、POSIX/UNC absolute、drive-prefixed、slash/backslash 平台歧义、除精确小写十进制 `node:<number>` 外的所有 scheme-shaped colon prefix 和 unsupported compound 在执行前 fail closed，除非显式转到既有 external TCB/External Confirmation。parent segment 先结合声明 `cwd` 解析，再判断是否真实越出仓库，因此仓库内 `..` 合法，真实 escape 才失败。exact/pattern Binding 支持 glob、无扩展名和含空格单 token 文件；安全 unmatched 以及精确小写十进制 `node:<number>` 和纯数字 `<hours>:<minutes>` 两种 colon scalar 允许但不复制。Compile 不广域扫描或复制全部 `input_paths`，角色分离只检查实际 closure 成员。Global Check 将 Outcome Binding 投影成内部 `{ outcome_key, local_key, binding_ref, binding }`，并复用 `<outcome>.<binding>`：逻辑 ref 保持独立，相同物理路径可只复制一次，不改变 authored Contract 或建立 registry。Exact planned closure member 可以到 Final Gate 才 materialize。Harness 仅复制这份 closure，把其 identity 绑定到 host attestation，并把未修改的 raw argv 传给 child。兼容的 Cross-Check 与 implicit-preserved Facts 共享一个受限 stdout `ty-context-product-observation-v1` envelope，同时保留独立 result identity。无法显式 production-bind 的嵌入式依赖或无法直接绑定 root 输出面的 Claim 必须 External Confirmation。项目 payload 继续使用 v3，不发布 v4，也不建设 shell/URI/dependency parser 或通用 UI/native observer。

项目自报的 v3 actual/value digest、comparison、`passed`、verdict 与 capability record 只作兼容诊断，不能提供 Actual 或完成权威。当前 package 可派生范围只有 exact/presence 与 host-derived `target_runtime`；`interaction_trace`、`state_delta`、`design_conformance` 以及其他尚无 package derivation 的 capability 即使有项目 record 也必须保留阻断性 External Confirmation。custom/`named_external_tcb` Oracle、间接 wrapper、browser/native/device session、layout/pixel/accessibility/motion、protected observation、tolerance/mask 与 custom locator 同样不能关闭 machine obligation。每个机器 Counterfactual 都要有 package-admitted baseline/mutated observation、相同 compiled closure identity、属于 production carrier 集合的 mutation target、affected/preserved/allowed-fan-out 精确集合与相同 obligation universe，并在适用时保持 host-derived process liveness；没有 admitted observation 时不得跳过。旧 Contract 不会被静默改写，target/closure TCB 变化会使旧 Active Authority、Progress、Evidence 与 Receipt 失去验收效力。

诚实声明为不支持的 Contract 不需要伪造 verifier。现有 External Confirmation 可通过 `impact_claims` 覆盖精确的普通 Outcome/Global Claim 与 Semantic Fact Claim，而每个 Semantic Fact proof 仍保留显式 `confirmation_ref`。完全 external 的 Outcome 设置 `success_path_required: false`；Stage Gate 只有在 `blocks_target: true` 的 confirmation 明确影响该 gate 的 result Claim 时才可不声明 machine Check。缺少 result lineage、非阻断 confirmation 或声明了机器 success path 却没有真实 success Check 都会使 Preflight/Compile 失败。合法的 external-only 路径最终只能得到 `blocked_external`，不会得到任何 machine-accepted 状态。

Direct-process observer 提供的是受限 containment，不是针对恶意代码的绝对 sandbox。它的 TCB 包括 host OS/文件系统/进程 API、Node runtime、快照复制与 no-follow/digest 校验、stdout 捕获/解码、timeout、进程树检查和清理。冻结的 subtraction controls 表明移除 watcher/pre-post 或 containment/cleanup 会重新打开 transient/persistent swap 或 descendant/timeout leak，因此保留这些既有责任，不新增 edge mechanism。它不声称能阻止蓄意恶意 executable 逃出复制闭包、访问环境中的机器/网络资源或规避所有 OS 进程树机制。需要这类对手边界的 workload 必须使用外部 sandbox 或 External Confirmation。

原始/修订方案、选定设计资源和混合附件会立即进入一个 Source-bound Contract Draft 循环；完整 input inventory、稳定 Key、Product Control 级含义、选定资源设计事实、acceptance/risk、direct/derived/delegated/evidence-backed 溯源、Source 归属与 Contract 映射一起收敛。声明为 Source 的 Markdown 中，每一行非空文本都必须属于一个 Material `ty-source-item` 块、唯一且通过 schema 校验的 `design-resource-handoff-v1` formal block，或满足封闭语法的 background：`markdown-structure` 只能包含不承载自然语言的锚点/分隔线，`provenance` 只能包含固定 `input`、`mode`、条件式 `source` 与可选 `sha256` 字段的 `ty-source-provenance` 注释；有文字的标题或自由说明字段可能表达权威含义，因此不能放进 background。任意背景说明文字和其他未分类文本都 fail closed。每次交付至少有一个标注 `aspect=architecture` 的 technical obligation Source Item，并映射到可独立证明的架构 obligation。若未知偏好会实质改变调研或选型，Preflight/Compile 成功前必须先询问；标准明确后，有依据的推荐才写入真实 Source，不能只藏在 YAML。方案委托不授权真实高危外部动作；输入冲突、用户保留、偏好缺失或无可靠推荐仍为 `decision_required`。已有计划文档的旧结构本身不构成阻塞。

第一次正式 Compile 成功前，`delivery-contract.yaml` 是同一份非权威 Contract Draft。`long-task-workflow` 从入口开始，跨 Source 细化、仓库/Context 读取、映射和 Preflight 修复持续修改它，不要求一次响应生成完整 Contract。Source 完备性是 Preflight/Compile 的收敛条件，不是前置阶段。不存在单独 Contract Draft Skill、Draft Receipt 或 Authoring State。

第一次成功 Compile 创建 Authority Lock，并返回：

```json
{
  "execution_model_checkpoint": {
    "required": true,
    "phase": "post_authority_lock_pre_implementation",
    "action": "change_model_in_host_then_continue",
    "resume_token": "model checkpoint cleared, continue",
    "turn_boundary": "end_current_turn",
    "blocked_until_resume": ["product_implementation", "file_edits", "build", "test_execution"],
    "model_change_owner": "host_or_user",
    "model_change_observable_by_harness": false,
    "generic_continue_satisfies": false,
    "message": "处理好模型更换后，请仅回复：模型切换卡点解除，继续"
  }
}
```

这是无条件的终止当前回合边界。Agent 在该结果后不得继续产品实现、文件编辑、构建或测试，必须输出 `处理好模型更换后，请仅回复：模型切换卡点解除，继续` 并结束当前回合；用户此前写过任何模型策略都不能跳过，普通“继续”不满足 managed prompt protocol。它仍是人工宿主提示，不是 Harness 强制执行的解锁：Harness 不观察下一条宿主消息，也不验证模型是否改变。后续 `compile --revise` 返回 `required: false`，不会重复暂停。Harness 不会自动切换模型，也不持久化 acknowledgement、model route 或 checkpoint state；该检查点不是验收证据。

锁定后的修订把“Authority 有变化”和“需要用户决策”分开：单调增强、锁定 Claims/targets/proof obligations 不变的 Source/Context snapshot 更新、Runner/input 实装修复、repo-bound scope 扩展、风险增强，以及 carrier、mutation、Check 相同且 Claim/预期失败断言覆盖不减少的等价 Counterfactual 覆盖可自动采用；产品/Source Claim/target/external-confirmation 变化，丢失 scenario/Claim/Evidence Capability/失败拦截，移除 forbidden/owner Context，runner type/effect、verifier kernel 或未知 reason 则只预览并等待精确 identity，风险降级直接拒绝。verifier 内容 identity 变化会使旧证据失效；没有旧 Authority 或可信发布来源提供的独立保持证明时仍保持 fail-closed，但 digest 变化本身不再被误报为已经证实的 acceptance/proof reduction，brief 会列出变化文件并明确“语义保持尚未独立建立”。`diagnose-revision` 无副作用，撤回/替换候选只在同一 `delivery-contract.yaml` 合并，不产生询问。最终 pending brief 先解释 Authority Revision 是什么，再区分 `user_decision_reasons` 与机械边界变化。必须先展示 brief；若当前任务已有明确指令精确覆盖全部决策 reason，可机械转录而不二次询问，泛化“继续”、一揽子批准、建议或 Agent 推断不算。每次采用都保留 exact identity、旧 Authority 连续性、证据失效和完整 Final Gate，并返回滚动实现，绝不表示完成。

Long-Task Skill 采用渐进读取：主 `SKILL.md` 只保留目标、硬边界和路由；Draft 输入/Contract Authoring、Evidence Design 与 Authority Lifecycle 细节按当前活动读取一层 reference，其中 Draft 输入与 Contract mapping 同时进行。这只是指令组织，不产生第二权威。共享 Architecture Deliberation 与适用质量路由在 Source-bound Draft authoring 中完成；material 且可独立证伪的架构/工程质量不变量使用已有 Source-backed obligations/constraints/forbidden shortcuts、owner/path/Binding、项目原生 executable Checks，以及功能行为可独立通过时的单独 Assertion。Final Gate 是唯一的 Long-Task Engineering Quality/Architecture Conformance 承载点，只证明该声明、项目检查绑定的集合。

Draft Outcome 只是 Authority Lock 前的 Outcome。Outcome 按可独立观察、判断、纵向闭环和定向验证的结果拆分，用于投影 acceptance/verification-ready 工作集、定位失败、恢复 finding 并精确失效旧局部结果。`depends_on` 只表示 acceptance 与中间证明 readiness，不授权或禁止实现编辑。每个 Outcome 属于一个有序 Stage；Stage gate 传递依赖同 Stage 其余 Outcome，后续 Stage 依赖前置 gate。Rolling Frontier 和 Stage 状态都由普通 Outcome Progress 临时派生，只是建议性验证/诊断投影。当前 Goal 可按代码现实跨 Outcome/Stage 实现、检查或返工，并应用上述正向默认精确 Worker 规则；Harness 不创建 delegation scheduler、不把委派当证明，所有结果必须汇入选定验证 worktree。Outcome 不是 Worker、scheduler task、queue 或并行单元，Stage 也没有 Receipt 或第二个 Gate。Outcome 拆分诊断和证明归属，不拆分完成权威，因此最终仍必须在当前最终快照运行一次完整 Final Gate。

Contract 声明一个有界 target profile、非空 required product target refs，以及每个 target 的 runtime family、root entrypoint、完整 root argv 和显式 capabilities。每个 required target 还必须通过 Source Claim disposition 映射到一项相同 identity 的 canonical Source technical obligation；process root 与有限 exact/pattern 匹配实际准入的每个 argv 路径同时属于 production owner 与 production Binding。Compile 只从 root、已匹配 argv 路径与必需 carriers 生成声明稳定的 runtime closure，不复制或广域扫描全部 `input_paths` 或 manifest sibling。安全但未匹配的相对参数不是依赖；绝对、逃逸、file-URL 或网络引用 fail closed，除非显式进入外部边界。已匹配路径可以是 `planned` 并在 Preflight/Compile 时尚不存在，但 Final Gate 必须在当前 candidate 中看到它们；仅 materialize 不改变 Authority identity。Web/process 代理不能代替单独要求的 Native/desktop 目标。当前机器 `target_runtime` 只有 Harness 直接启动该 Source-backed process product root 才能成立；browser/native/desktop/device 要求保留阻断性 External Confirmation。每个 `critical_user_path` Outcome 和 Stage gate 都必须通过 admitted root proof 或对应 External Confirmation 处理每个 required target。

如果声明结果可能在代理表面通过、却在目标运行时独立失败，最早 owning Outcome 必须使用 admitted direct-process root Check 或阻断性 External Confirmation。项目 payload、仓库内状态报告、截图、二进制、日志、历史运行、新 session id 和代理表面都不是 runtime Authority。Check 仍声明精确 Given/When、journey 与 applicability，所有 Claim/证明单元仍独立可归因；项目 capability record 只作兼容诊断，只有当前准入的 exact/presence 与 host `target_runtime` 结果能满足对应 all-of cell，其余 capability 继续 external。每个行为型 machine Assertion 的同 Check Counterfactual 必须观察 affected Facts 变化、preserved Facts/liveness 不变、其他变化属于显式 fan-out，并保持相同 obligation universe 与 compiled process-closure identity。Binding 或路径不是 production reachability：静态 mutation 只证明该结构，runtime 必须经过 `Harness mutation of compiled production carrier → direct Source-backed product-root execution → package-observed Actual change`；Authority/verification/evidence/status/report/Receipt/verifier input 都不能进入 closure。既有最小失效范围、targeted feedback 与当前 Final Gate 规则不变，不新增通用 reachability scanner、实现 Gate、调度器或状态。

长程任务工作流的“防劣化保障”同时保护当前因果链的真实性、跨版本的漂移拦截强度，以及相邻的 `F = 实现自由边界（Implementation Freedom Boundary）`。Context 对“当前实现”的描述必须与索引到的真实代码/运行逻辑一致；当前实现必须继续承担“需求/架构意义表达”和“fail-closed 识别、返工、最终快照复验”两项共同必要职责，并在明确的 Source 完整性、语义绑定、可观察性和可信边界下推出“不错误完成”的设计目的。`F` 是效率与反流程膨胀边界，不是第三项机制职责或无漂移定理前提：在 Source/Contract、架构、安全、禁止捷径、不可逆影响与外部动作边界内，实现顺序、方法、局部反馈节奏、具体工作包分解与动态 Worker 数量由当前 Goal 决定；当前正向默认规则只在上述有界谓词成立时要求多个精确 Worker，否则要求一个许可的 solo 理由。Harness 不建立开发阶段/方法 Gate、逐编辑强制验证、固定分配、agent 调度/状态或委派证明。设计目的、关键逻辑、两项职责、成立边界和 `F` 都属于受保护设计不变量；弱化或替换它们必须由项目 owner 显式作出设计目的变更决策并给出替代证明，不能由 Agent 推断、文档/代码/测试同步改写或成本理由暗中授权。新增开发期限制还必须解决 Final Gate 或更轻项目检查无法覆盖的独立风险，并在全部安全/证明硬约束之后证明正的净 ROI——具体表现为有证据的高 total-cost ROI 与高效率；“高”表示显著、稳定余量，不是全局或局部最优。目的有效性、相对非劣化、must-allow、结构成本和适用的实测总成本阈值闭合后即停止扩建，除非出现新的真实反例、反复出现的重大成本热点或显著额外净收益证据。该保障复用现有 Context、索引、测试、关键哨兵、路由和一致性门禁，不新增第二 Authority、Gate 或状态；它也不能补出未表达/不可观察的需求，或对拥有全部修改权限者的蓄意联合弱化提供绝对不可变保证。

因此机制开发和发布结论只使用四级证据措辞：已设计、已实现、已建立声明中的已知反例保护、在明确 TCB 内高水准实现。当前 observer 修订保持 Level 3。R9/R10 各自保留三层不可互换证明：未消费的非闭包 evidence/verification 输入 must-allow；产品尝试读取非闭包文件时由运行隔离阻止接受；显式 production-bound 的 argv closure 成员若兼任 evidence/verification 角色则 Compile-reject。后续 raw argv 分类反例由 owner regression、完整 current-candidate lifecycle matrix 与独立审计证明；历史 real-process ROI workload 不证明该反例，也不新增 `CASE_ID`。Compile owner diagnostic 绑定完整已提交攻击候选；stale-Authority 防复用另由 legal-neighbor Authority 后在同一攻击候选上触发 Final-Gate freshness 拒绝证明，`active_task_missing`、dirty candidate 或 fresh Compile rejection 均不能替代。当前 machine report 持有准确 attack/control 集合与 terminal，不新增 registry。Level 4 仍要求未改变的完整 total-cost ROI 定理、无开放 critical false acceptance 的独立能力审计和项目所有者单独明确批准。prose 审计、测试数量、fresh-Agent 实验、observed lifecycle 胜出和脱敏 fixture 都不能单独提升等级或证明真实事故代表性。

真实 process ROI 的实现 owner 是 `examples/delivery-benchmark/real-process-workload/**`、real-process runner/policy/scoring、唯一 package materializer、formal acquisition modules 与 `tools/verify_long_task_real_process_roi.mjs`。它冻结 8 个 Fact、normal/degraded modes、两个 Counterfactual、独立 semantic gold、A/B/C 角色及每个 fixture 的已提交候选 identity。Real-process v5 总是采集五组 A/B/C repeat；前三组结果只作诊断。唯一 materializer 负责 detached checkout、`npm ci`、build、source parity 与禁用 scripts 的 pack，并绑定 exact commit/tree/lockfile/runtime/clean status。Workload、collection、summary、aggregate 与 attestation 只拥有 immutable raw 或可重算 `observed_lifecycle_*`，formal status 只能是 `not_evaluated`；formal-v2 packet 只声明一对一路径。顶层 verifier 在验证实际 manifest-v2 run set 后构造 immutable artifact index，并继续是 evidence admission、normalized exclusive ownership、`total_roi_supported`、`total_roi_positive` 与 formal status 的唯一 owner；packet 自报 bytes、digest、role、verified、normalized value、事故货币总额、event ID 或结论都会被拒绝。Verifier 绑定 A/B/C commit/tree/materialized-package、benchmark implementation、acquisition runtime/TCB、scenario、collector、precollection、retention 与 redaction identities。本轮口径仍为 1 NCU=CNY 1、active/wait 每小时 CNY 200/50、十次交付周期、repeatable cost 的五组中位数投影、maintenance/recovery 每周期一次、introduction/adoption/migration 一次性、以及一个事故 benefit 中位数。Provider/compute/storage 只从 prelocked 实际账单或官方价格材料换算，事故 benefit 从 raw time/usage 重算；benefit 至少为正增量成本 1.25 倍、至少 4/5 paired net 为正且 sample CV 不超过 20%，成本下降另报。缺失证据即 unsupported。Provider-event v1-v2、其他已列 formal v1 schema、real-process v1-v4 与 manifest v1 均须重新采集；机器测量、独立审计与 owner promotion 保持分离。

当前精确 schema 矩阵为：accounting-policy、evidence-packet、precollection-plan、raw-event、scenario-catalog 和 source-manifest 为 v2；Provider event 为 v3；real-process 为 v5；run-set manifest 为 v2。Provider-event v1-v2、其他已列 formal v1 schema、real-process v1-v4 和 manifest v1 均须重新采集；`next` 未分配。

Formal collection 的 11-scenario catalog 是 scenario/source/zero policy 的唯一 owner；collector 只声明 capabilities，所有 source 只能是 `required|forbidden`。Human time 来自 runner contemporaneous interaction recorder，compute 来自 Job-contained 完整 process tree，State 来自 runner exact payload/ledger 与预冻结 retention，Provider usage 来自 invocation-bound Provider correlation。Module-private branded acquisition runtime 自行构造 recorder、Windows Job supervisor、固定 Provider bridge 与 State capture；缺失 source、sampling/default-zero proxy、普通 spawn fallback 或 stream overflow 均 fail closed。`invocation_id` 在 spawn 前派生，record SHA 与 `execution_id` 在 tree close 后派生；human/process/wall/Provider clock 各有独立 ID，250ms 与 5000ms 容差不能替代因果 correlation。 Parent 捕获 exact prompt，并只用 `process.execPath`、空 `execArgv`、`shell:false`、bounded pipes 和 allowlist 环境启动 candidate-owned isolated Provider worker；proxy、自定义 CA 与 Node preload/loader 不受支持并 fail closed。单一 protocol owner 冻结 request/result shape、endpoint、prompt/response/stdout/stderr/deadline/abort/output-token limits 与 error code。Worker 单独拥有 `node:https`、bounded streaming 和固定 parser，四个 create-new/no-follow 临时文件在 worker/bridge 完全关闭后必须整体删除且不进入 run-set。Provider event 绑定未保留 response 的 digest、parser 与 worker identity；verifier 校验 acquisition TCB，但不声称独立重解析未保留的 response bytes。

Catalog 派生 86 次 execution 与 586 个 formal artifact：516 个 base file、30 个 compute record、10 个 State ledger 加 10 个 payload、10 个 prompt 加 10 个 Provider event。Formal fuse 为 650 files/364.625 MiB，完整 run-set fuse 为 4,379 files/974.3125 MiB。Evidence Candidate 冻结全部 code/schema/Context/test/package-version/protocol bytes；Promotion Commit 必须是其直接子提交，只新增四个 package-/TCB-external governance record，并保持 materialized-package、benchmark 与 runtime/TCB identities 不变，否则重新采集与审计。 Runtime TCB v2 绑定 clean Node launch、executable path/hash、worker/protocol、parser/transport 与 limits。Benchmark implementation identity 纳入 `npm_command_spec.mjs`、Provider protocol/worker 与有限 local-dependency closure checker；working-tree、Git object、collection 与 Promotion 路径都重算闭包并绑定实际执行源码根。

真实采集当前为 `external_pending`：Starward-derived fixture 缺少获授权的原始事故 design/runtime evidence、完整 original-to-sanitized mapping 及 retention/publication authorization；本轮也没有可保留的 invocation-bound Provider usage/price material 或 State-retention Source。Synthetic control 只能证明结构，不能作为 formal-positive evidence。完成这些真实外部输入、唯一 verifier 的完整正向报告、独立审计与 owner promotion 前，能力保持 Level 3。Package 0.8.15 是历史冻结的 Evidence Candidate identity；Package 0.8.16 是当前 Level-3 package candidate，不继承其 package、benchmark 或 runtime/TCB evidence。`capability_level=level_3`、`level_4_claimed=false`，没有 formal-positive 或实际 Promotion。Provider readiness 只表示本地配置、credential presence 与 clean worker launch envelope 足以发起一次有界尝试；public `independent_evidence_admitted` 只表示 packet structure/source binding，完整证据与正 ROI 仍分别由 `total_roi_supported`、`total_roi_positive` 表示。

Formal collection 还会在执行前锁定一个固定 scenario catalog，覆盖十类成本和一个 controlled incident 的 exact task/gold bytes。每个 event 绑定唯一 raw output：成本 B/C 都必须命中共同 gold；事故 B 必须错误而 C 必须命中它。这样只提交时间/usage 不能制造 purpose benefit，也不会新增通用 scenario registry。

本机制自己的 Final-Gate Oracle 读取固定 test-id 的 machine report，并对完整 wrong-candidate 与 correct-control workflow status 做对照。runtime capability 必须通过真实生命周期得到 `wrong candidate != machine_accepted` 且 `correct candidate == machine_accepted`；“命令 exit 0 + token/string 存在”只能证明文档一致。ROI 由独立 verifier 计算，绝不进入 safety Fact verdict。

工作流机制变更按字典序准入：Safety/Coverage → Semantic Granularity → Proof Strength/TCB 与不可绕过 Authority/fail-closed/当前最终快照证明 → Structural Closure Cost Non-Degradation → Total-cost ROI。其效率目标是 **Fine-Grained Semantic Purpose-Fulfillment Efficiency**：以有证据的高效率和高 total-cost ROI 完整达到细粒度语义与证明效果，同时在声明机制边界内消除与独立语义单元、必要证明、可信边界或适配器无关的成本。逻辑 Fact/obligation 粒度可以细于持久化粒度；无关笛卡尔轴、可推导重复与共享元数据复制不是合法的长期成本来源。等价效果下，Source/Contract/evidence bytes、DAG、Compile/Preflight/Final Gate、峰值 RSS、默认 Context 读取量和单 Fact revision blast radius 不得因这类结构原因增长。任何成本下降都不能补偿粒度、证明或漂移识别能力下降。“高”要求完整已验证成本集上的显著稳定余量，不要求穷举比较或证明最优；它只使候选进入考虑集，并受上述充分性停止规则约束，不代表自动采用，也不新增 Authority、Gate、状态或固定执行流程。

package-owned 的非 UI Compact Carrier 在不新增 Authority、状态或 Gate 的前提下实现“逻辑粒度细于持久化粒度”。共享 catalogs、selectors、Fact sets、proof templates、projections 和显式 exceptions 物化后继续进入既有 validator 与唯一 Final Gate。Fact 与 obligation 分别保持独立 exact-set 闭包；typed result 先绑定稳定 `obligation_key + obligation_revision_digest`，再投影到稳定 `fact_key + fact_revision_digest`。Fact revision 覆盖规范化 Fact 语义及其全部显式关联的当前输入 revision，obligation revision 覆盖规范化证明语义及当前 Fact revision，因而 Source 语义不能藏在不变的 identity pair 后。实现只可用有界数组和 `Map` 索引物化已测量集合，不能构造理论 ground universe。expanded 输入仍可兼容读取，但每份已采用的 Source/Contract 只能持久化一种表示，迁移会删除等价机械展开而不保留影子 Authority。

只有 `weak_observability` 同时遇到多 Stage 或多个 required product runtime family 时，才额外要求一个只读 Global Product Conformance Check。它从 required root product target 启动，使用独立 Raw Execution，并在既有 Final Gate 内运行。单 Stage、单 family 继续使用原有 same-Check sensitivity，不支付额外 conformance 执行成本。

平台负责物理 Goal/会话生命周期。新会话通过 `resume` 恢复语义状态；Tiny Context 不会重建此前的物理 Turn。机器接受只覆盖 `declared_machine_authority`，并报告 `native_goal_effect: none`。完成平台原生 Goal 前，Agent 只做一次否决型核对：当前 Goal/用户语义是否全部进入 accepted marked Source，且没有 pending revision、未解 blocker 或遗漏；它只能阻止并触发修复，不能增加验收证据。

### CLI

```text
ty-context long-task init <workdir>
ty-context long-task preflight <workdir>
ty-context long-task compile <workdir>
ty-context long-task compile <workdir> --revise
ty-context long-task diagnose-revision <workdir> [--outcome <key>] [--check <key>]
ty-context long-task approve-authority-revision <workdir> --revision <sha>
ty-context long-task explain <workdir>
ty-context long-task verify <workdir> [--outcome <key>] [--check <key>] [--explain]
ty-context long-task status <workdir>
ty-context long-task resume <workdir>
ty-context long-task doctor <workdir>
ty-context long-task final-gate <workdir>
ty-context long-task stop-check <workdir> [--message <text>]
ty-context long-task close <workdir>
ty-context long-task abandon <workdir> [--force-corrupt-state]
```

- `init` 创建单文件 inline Outcome 的 Compact Contract 模板。
- `preflight` 应用 Compact 默认值并一次输出 Source 非空文本归属、REQ、CTRL 字段/关系闭包、OBL/AC、applicability、Stage closure、required-target/root/runner、scenario/journey、capability、external impact、Product Conformance、Context、风险、路径/Binding、Runner/Input、语义 witness/liveness、Proof 与 workspace-scope 诊断。首次 Authority Lock 前，它把每个 HEAD-relative 当前变化路径分类为 protected、expected change、allowed support、forbidden 或 unclassified；后两类中的 forbidden/unclassified 都阻塞。它完全只读，不创建 Authority Lock、marker、cache、progress、Receipt、pending revision、状态锁，也不运行项目 Check。
- `compile` 重复同一 fail-closed workspace 分类和 activation validator，因此直接 Compile 不能绕过 Preflight，再按精确 applicability 生成 Global 与 Outcome Result/Requirement/Control-field/Control-relation/Non-completing/Technical Claim，拒绝未覆盖单元，并让第一次正式成功 Compile 成为 Authority Lock。首次 enable 仅保护配置的 managed destination 中当前 package asset tree 实际存在的精确文件，以及精确的 config/hook 文件；managed 目录根和宽泛 `.codex/**` 均不豁免。每次结果都包含 lifecycle event、`delivery_completed_by_this_event: false`、`native_goal_effect: none` 和 next action。第一次结果附带无条件的 `execution_model_checkpoint.required: true` 终止当前回合契约，后续 Compile 返回 `false`；Harness 不把 acknowledgement 或 model route 写入 Authority state。
- `diagnose-revision` 只做无副作用候选 Compile；仅 scope-only 候选能运行 Active Authority 已有且未更换的 Check，输出固定为非验收、非 Progress、非 pending。
- `compile --revise` 自动采用单调或机械边界内的修订；需要用户决策时返回 `authority_revision_pending`、精确 id、确定性 material 摘要、`user_decision_reasons` 和自包含 `decision_brief`。先展示 brief；只有已明确且精确覆盖全部 reason 的当前任务指令可直接承载该 id。候选再变会生成新 id 并使旧批准失效。采用后证据失效、输出 `authority_revision_adopted` 并回到滚动执行，不表示交付完成。
- `verify` 在重查 active task/revision/compiled/worktree identity 并依据 immutable baseline 应用同一 workspace 分类后写 scoped Progress；targeted verify 始终只是可选反馈/修复证据。`verify --explain` 只读地合并 Main Raw Execution、列出适用 Counterfactual 调用与声明的重试次数上界，不执行命令、不写 Progress，也不预测耗时或 runner 内部子进程。
- `status` 输出 `unverified`、`progress_passing`、`progress_failing`、`progress_stale` 或 `blocked_external`，由当前 Progress 派生 `stages`、`ready_stages` 和建议性的验收/验证 Outcome frontier，不持久化 Stage 完成。兼容字段 `ready_for_implementation` 只是该投影的别名，不是实现门禁。它同时报告 fresh `final_workflow_status`、target profile/state、完整 `external_confirmations` 与唯一的 `pending_authority_revision`。`progress_passing` 只能表述为定向修复证据，不能简称“Outcome 完成”；`progress_stale` 是证据新鲜度事实，不是当前通过或每次编辑后立即重跑的指令；`final_workflow_status: null` 表示 Goal 尚未完成。
- `resume` 完全只读，恢复 task/contract identity、风险、相关 Context、Git 状态、相同的 Final/target/Stage/external/pending surface、ready Outcome、findings 和建议性的验证/修复 next action；该建议不限制实现顺序。
- `final-gate` 在执行前重新编译 Source Authority，并捕获 Contract/fragments、Source、Controlling Context、verifier/runner、verification inputs 和 workdir inputs 的语义与原始受保护身份；完成全部 Check 后，再次编译并哈希同一完整集合。任一输入竞争变化都会 fail closed，并发 revision 也不能产生 accepted。Receipt 把每个 Stage 派生为 `passed`、`failed`、`blocked_external` 或 `blocked_dependency`，把 `target_state` 派生为 `not_accepted`、`blocked_external` 或 Contract 精确声明的 `implementation_complete`、`target_profile_usable`、`production_release_ready`。
- `stop-check` 与 `close` 自己运行 Live Final Gate，并只用 accepted identity 做 CAS clear。每次机器接受的 Stop 都给一个非阻塞 terminal-scope `systemMessage`；外部待确认时同时列出全部确认项。Final/Stop/close 输出 `acceptance_scope: declared_machine_authority` 与 `native_goal_effect: none`，close 另输出 `closed_scope: machine_authority`。`status: closed` 只表示机器 Authority 已清理，不表示原生 Goal 或完整外部交付完成。
- `abandon --force-corrupt-state` 仅用于损坏/mismatch/legacy-unrecoverable 状态或遗留锁，只删除确定性 active state 与 `<workdir>/.ty-context/**`。

### Delivery Contract

`long-task-delivery-v2` 在同一个文件中保持 Product Authority、Technical Boundary Authority 与 Acceptance Authority。Compact YAML 只省略确定性默认值，规范化后的 Contract、Authority Hash 与 Compiled Identity 和完整展开形式一致。

Contract 顶层包含：

- `task`：完整目标、target profile、required target refs、execution target/runtime family/root entrypoint、Source 路径、相关 Context 与 snapshot 模式；
- `stages`：有序 Stage DAG 与每个 Stage 的 gate Outcome；
- `risk`：`auto | standard | strict` 与明确 risk facts；
- `global`：非目标、owner boundary、技术约束、禁止路径/捷径和全局 Check；
- `outcomes`：可独立判断并可定向验证的纵向结果、所属 Stage、依赖、明确 success/degradation 要求、REQ、产品/控件状态与位置、稳定技术义务和命名 AC。

Runner 声明仍支持 `package_script`、`project_binary`、`node_oracle`、`playwright_test`，proof surface 与 execution-target family 名称也保持兼容；但 runner type 只决定执行与 payload decode，不决定观察权威。当前 machine admission 仅允许 runner 前冻结的静态 JSON exact structure，以及 Harness 直接启动的 `project_binary` process product root；browser/native/desktop/device 与 project Oracle observation 必须进入阻断性 External Confirmation。

### 一个 Contract 与 Source Claim

用户选定的一次完整交付始终只有一个 Contract 和一个 Final Gate。Outcome 只按“可独立判断、可定向验证”的结果拆分；模型输出长度、YAML/文件长度、前后端层、模块数量、并行偏好或 Agent 容量都不是拆分依据。

V2 强制至少一个真实 `source_path` 与一个 `source_claim`，且每个声明的 Source 文件至少包含一个 Material Item；每次交付还必须有一个 `aspect=architecture` 的 technical obligation Source Item。Authoring 阶段必须在原始 Markdown 中仅插入不渲染的 `ty-source-item:start/end` 标记，不得改写 Item 原文；其他每一行非空文本只能位于唯一且 schema-valid 的 handoff formal block，或内容符合 `markdown-structure`/`provenance` 封闭语法的 background 中。任意背景说明、未分类、嵌套、重叠、未闭合或空 section 均 fail closed。Marker key 与 Source Claim key 必须集合完全相等且全局唯一。Parser 能证明语法归属并阻断把任意材料性文字塞进 background，但不能证明用户已表达所有真实需求或 Source 对现实事实准确；后两者是显式上游前提。

类型化 disposition 分开整体结果、Requirement/Control/Obligation/Non-completing Claim、单一命名 Acceptance Assertion、Global Constraint/Non-goal、Risk Fact/Affected Outcome、External Confirmation 与真实决策。Outcome Source Acceptance 必须原样对应一个 `<outcome>.<check>.<assertion>` criterion，并证明至少一个被独立 Source Item 支撑的非 Result Claim。`out_of_scope` 已退休：排除原本在范围内的要求只能进入 `decision_required`。

`context.toml` 中仅用于未来读取的 `triggers`、`read_when`、`read_policy`、default selection 与未选节点不再进入当前 delivery Authority；当前已选 area ownership、role/dependency 与 Context 内容仍受保护。最终 Git tree 变化后仍必须重新运行 Live Final Gate。

## 工作流路线与 Long-Task 内部证明强度

工作流选择不是风险等级。默认 model-led 路线适用于任何复杂度；只有需要稳定机器义务、当前快照机器完成权威、跨会话恢复或审计时才显式选择 Long-Task，任务时长、文件数和复杂度都不会自动启用。Long-Task 可以减少例行过程监督，但不能消除用户保留决策或 External Confirmation，也不保证比默认路线更快或更省 token。

active Long-Task 内部原有 `risk.requested_level: auto | standard | strict` proof floor 保持不变。`auto` 计算最低强度，`standard` 请求标准 proof，`strict` 对受影响的公共 API/schema、持久数据、迁移、安全/权限边界、不可逆影响、全量 population 或弱可观察关键路径提高 proof；多仓库交付仍不支持。用户可以主动升级为 strict。显式 `standard` 低于计算出的最低级别会以 `risk_level_below_required` 失败；Strict 所需 negative、counterfactual、population、security、environment、rollback/recovery proof 继续由 Compiler 按风险强制。

## Evidence 与完成权威

最终接受来自当前可执行证据，不来自 Agent 文本。Runner kind 仍选择 `playwright_json_v1` 或 `structured_json_v2` decode，项目 capability payload 仍是 `long-task-check-result-v3`，但 decode 不是 Actual Authority。Compile 必须把每个 machine obligation 分配到 `package_static_json_exact` 或 `package_process_json_exact`；不支持的义务保留阻断性 External Confirmation。admitted adapter 及 expected/actual/comparison identities 进入 acceptance、Raw Execution、compiled、Progress 与 Receipt identity。

每个 Check 仍声明精确 scenario、journey、applicability 与 all-of Evidence Capabilities，但项目提交的 capability record 只作兼容数据。Harness 当前从 admitted static/process observation 派生 exact/presence，并仅对直接 process root 派生 host `target_runtime`；项目副本缺失不削弱这些 package proof，存在但不一致时 fail closed。`interaction_trace`、`state_delta`、`design_conformance` 与其他没有 package derivation 的 capability 必须保留阻断性 External Confirmation，不能制造 machine row。

每个 Outcome 至少有一个非 Result 原子 Claim，且 `required_proof_surfaces` 必须 all-of 全覆盖。Claim-bearing Assertion 使用显式 Expected 比较；`truthy/falsy` 禁止，`exists` 仅允许 admitted 静态 `implementation_structure`。V1 ground、V2 symbolic、non-UI、static 与 process exact 全部调用同一个 Harness evaluator：actual≠expected 直接失败，tolerance/mask 不准入，result identity 由 Harness 重算，submitted pass/verdict 不参与计算。Playwright/aggregate decoder 字段只作诊断，不能证明 browser/UI Claim。

Outcome/Global Counterfactual 的 Binding/path 本身不是生产可达性证明。静态 Counterfactual 只证明冻结结构对象；runtime Counterfactual 必须由 Harness 修改声明的生产 carrier、直接运行相同 process product root 并通过 package 观察 Actual 变化。每个 machine witness 声明 affected、preserved 与 allowed-fan-out Facts，保持 obligation universe 和 host-derived liveness；缺少 admitted baseline/mutated observation 时直接失败。Source/Context/expected、status/report/evidence/Receipt/verifier output 都不是 mutation carrier。

Targeted verify、Progress、status、Receipt 与 compiled cache 都不是完成权威。Final Gate 要求 clean candidate commit，从 Source 重编译 observer plan，在同一 Git-tree snapshot 上重跑全部 Check，并核对全部受保护身份。Direct-process 的内部 host attestation 还绑定 executable/root/argv equality、PID/times/exit、candidate snapshot digest、内部 execution nonce 与捕获的 stdout-envelope digest；这些 host 字段都不来自 child。nonce 不向 child 暴露，也不能单独认证产品语义。只有当前 Authority 与 observation chain 全部不变时才可生成 `machine_accepted` 或 `machine_accepted_external_pending`；后者仍列出阻断性外部确认，不属于完整无漂移定理的前件。

## 兼容与迁移

当前 V2 的语义保证闭包还要求 full Context、architecture-classified Source obligation、原子 applicability dimensions、显式 target/blocker capabilities、Control-relation closure、Population universe、Claim-local mutation 与 admitted observation chain。含 custom machine Oracle、不支持 method/family、wrapper root、缺失或未绑定 process argv，或缺少 admitted Counterfactual observation 的旧 V2 Contract 会收到精确人工迁移诊断；必须依据 Source 明确改成 static exact、direct-process exact 或阻断性 External Confirmation。Exact planned process root/argv/carrier 可以到 Final Gate 才存在，但 pattern 或未声明 runtime dependency 不能冒充它们。相关诊断包括 `machine_observer_not_admitted`、`unsupported_observer_requires_external_confirmation`、`custom_oracle_machine_completion_forbidden`、`static_observation_not_in_pre_run_snapshot`、`static_observation_changed_by_runner`、`process_observer_direct_root_required`、`process_observer_root_invocation_required`、`process_observer_root_argv_mismatch`、`process_root_production_binding_required`、`process_runtime_carrier_exact_path_required`、`process_runtime_input_missing`、`process_observation_input_changed_by_runner`、`legacy_target_runtime_non_authoritative`、`counterfactual_admitted_observation_required`、`counterfactual_runtime_reachability_unproven` 与 `project_submitted_verdict_disagrees_with_harness`。Upgrade 不会代选，也不会把旧 Active Authority、Progress/Receipt 当作通过证据；public result payload v3 保持兼容，但其自报证明字段不具权威。

## 开发与验证

```powershell
npm install
npm run format:check
npm run typecheck --workspace project-tiny-context-harness
npm run build --workspace project-tiny-context-harness
npm run test:affected:list
npm run test:affected
npm run test:long-task:trust
npm run test:long-task-performance --workspace project-tiny-context-harness
npm test
npm run smoke:quickstart
npm run preview:pack
npm run launch:check
node packages/ty-context/dist/cli.js package check-source
make validate-harness
```

`test:affected` 用于日常修改和修复循环；本地推断只会报告并略过未跟踪的 `.work_products/**`，tracked 与显式路径仍按 fail-safe 路由。`test:long-task:trust` 是冻结候选版本后的高风险边界门，也是 PR CI 使用的层级；经审阅的 Trust/focused/hotspot 预算防止反馈层静默膨胀，但完整套件发现不设裁剪上限。`npm test` 是 `main` 和发布保留的完整发布回归，不应在每次小修复后重跑。受控 Ubuntu CI 使用有充分余量的分层灾难性耗时上限，本地耗时仍只做诊断。Delivery Contract 和完整 Long-Task 门仍可通过 package workspace scripts 显式执行。

模块化门禁是 capability-aware 的 `ty-context check-modularity`；例外必须包含 `owner`、`introduced_at`、`reason`、`tracking_issue` 和 `expiry_condition`，不支持指标不会以零值制造通过假象。

## 诚实限制

- Harness 不创建或恢复平台物理 Goal/会话。
- 它不能证明用户从未遗漏未声明需求。
- 默认 Workflow 提供 model-led、证据边界内的符合性，不提供声明范围零漂移证明或机器完成权威；未验证和外部待确认范围必须显式保留。
- bounded Context keyword search 仍可能漏掉同义词或间接依赖，只能补充语义判断。
- Harness 不能切换 host 选择的模型，只能在第一次 Authority Lock 后要求一次用户选择。
- Tiny Context 不提供并行 mutation/delegation runtime；package-managed Skill 的有界谓词成立时，平台 Goal 必须实际调用多个精确 `long_task_implementation`，但 Harness 不负责分配或持久化这些行为，也不把它们当证据。
- 它不观测平台 token 或模型调用数。
- Network policy 会约束传给 runner 的代理环境。准入的 direct-process 路径还会运行冻结 runtime-closure 副本并监视/清理进程树，但两者都不是 OS 安全 sandbox，也不能证明恶意代码无法访问环境中的文件系统、网络或进程资源。
- 同用户/管理员文件篡改、系统级 Hook 绕过不在安全边界内。
- Git/PR/CI、部署与人工产品确认仍由外部系统负责。

## License

MIT
