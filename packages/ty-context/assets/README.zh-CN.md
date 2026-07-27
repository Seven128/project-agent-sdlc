# Project Tiny Context Harness

Project Tiny Context Harness 是给 AI coding agents 用的轻量项目记忆层，也是一套由 npm 包管理的上下文与交付 Harness。它为仓库提供耐久项目记忆、轻量默认工作流，以及显式启用的 Single-Goal Rolling Delivery（单目标滚动交付）长程工作流；它不是 Agent 调度器，也不接管 Git 编排。

[English](README.md)

产品原则是：**保留项目记忆，丢掉流程仪式感**。公开推广与 README 以英文主入口为准，中文文档作为二级入口。

## 为什么存在

编码 Agent 同时需要两类能力：跨会话仍然可靠的少量项目事实，以及长任务经历多轮修改或上下文压缩后仍可信的完成检查。

Tiny Context 将这些能力保持为窄边界：

1. **Minimal Context**：`project_context/**` 保存产品归属、架构、契约和可重复验证等耐久事实。
2. **Workflow Contract**：普通任务使用 Context-first 的轻量默认循环和平台内部计划，不要求计划文件。
3. **Long-Task Workflow**：显式使用 `long-task-delivery-v2`、编译期 Claim Coverage、一次 Authority Lock 后的模型选择、滚动修复验证与 Live Final Gate。

它不会启动或切换模型，不会创建 Agent、分支或 worktree，不会 merge、push、创建 PR 或部署，也不会取代项目测试和人工产品验收。

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

默认 Profile 是 `core-portable` 与 `workflow-default`，基础 managed set 已包含显式调用的 `/design-system-authoring` 与 `/design-resource-authoring`。显式启用长程能力：

```powershell
ty-context enable long-task
```

启用长程能力会额外安装 `/long-task-workflow`、退役兼容指引 `/source-plan-authoring` 与完成 Hook；`ty-context disable long-task` 只移除这些 Long-Task-owned surfaces，并保留两个基础设计 Skill。Tiny Context 不安装 Open Design、模型 Worker、Agent runtime、调度器、Git 编排资产或其他设计生成 runtime。

## 推荐用法

初始输入可以是一段产品意图，也可以是 Web GPT 等外部服务给出的详细初始方案。涉及独立设计资源时：

- **长程任务：** 初始方案 → 项目尚无设计系统时由用户显式调用 `/design-system-authoring` 生成、选择并采纳 → `/design-resource-authoring` 生成/选择资源、按需完整冻结实现级 Source、一次性回改已接受决策，并生成通过校验的残余 `design-resource-handoff-v1` → 把“修订后的初始方案 + handoff + 选定且身份稳定的设计资源”交给 `/long-task-workflow`；输入立即进入同一个原生 Goal 内的 Source-bound Contract Draft 循环。
- **非长程任务：** 使用同样步骤 → 把“修订后的初始方案 + 已校验 handoff + 选定设计资源”直接交给 Codex 当前原生 Goal，按默认 Workflow Contract 执行。

设计系统通常在项目冷启动时确定，但该 Skill 只由用户调用，`init`、`sync` 与下游 Skill 都不会自动执行。`/design-resource-authoring` 只对高保真、品牌化、视觉处理等 style-bearing 资源设门禁；低保真结构、IA/流程与纯语义状态研究不受此门禁。旧 Source Plan 仍可作为普通输入，但不再是推荐中间服务。

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

普通任务：

1. 读取 core/default Context，收集 manifest 候选；
2. 在 `project_context/**` 做一次 bounded Context search；
3. 对用户可见地给出一次简洁、仓库事实绑定的 Architecture Deliberation；
4. 决定 `Context Delta: none|required`，耐久语义改变时先更新 owner Context；
5. 使用平台内部计划；
6. 实现并运行项目验证；
7. 执行 Contract Conformance，其中包含对当前候选快照的 Architecture Conformance；
8. 单独执行 Context drift check 后交付。

默认工作流不要求 `plan.md`、matrix、verdict、evidence ledger、持久检索索引或第二份执行计划。任务时长、文件数和复杂度不会自动激活长程状态。

每次交接只报告一个 Context 结果：

```text
Context: updated <文件/原因>
# 或
Context: no durable fact change
```

### 架构与模块质量

技术架构能力是两条实现路径共享的 Workflow 义务。每个实现需求都在第一处实现编辑前，对用户可见地完成一次 `Architecture Deliberation`；风险改变深度，不取消这个环节。小修改要指出具体 owner / 当前 extension point、未改变的耐久边界，以及为何没有新增或加重技术债。material 工作还要覆盖唯一 source of truth、dependency 与 interface/state/lifecycle 边界、failure/recovery/compatibility、选中和拒绝的方案、至少一个合理未来变化及其扩展点、触达的技术债、forbidden shortcuts 和项目原生可执行检查。

实现和项目验证之后，`Architecture Conformance` 对当前候选快照检查 scope/path escape、owner 或 dependency direction 违规、service/facade 绕过、重复权威或第二 source of truth、未声明 API/Schema/state/persistence 变化、缺失架构检查和新增/加重技术债。候选再变化就使结果失效。普通任务把它放在 Contract Conformance 内；Long-Task 用已有 obligation/constraint/forbidden shortcut、owner/path/Binding 和 executable Check 表达不变量，只由 Final Gate 收口，同一候选不会执行两次。

Contract Conformance 主要检查当前 Source/Context 是否到达实现和验证；单独命名的 Context drift check 反向检查实现或新决策是否让耐久 Context 过时。新增或加重技术债默认阻塞，除非项目有带 owner、rationale、tracking 和 removal condition 的显式 bounded exception。无关 legacy debt 不自动扩张任务范围，但本次触达、依赖或加重的债不能隐藏。

`Architecture Context Hit`、`Decision Rationale Hit: existing|required|none` 和 `Modularity Check: none|required|exception` 仍是内部路由问题，不创建 Task Contract 或固定 `plan.md`。可见检查点证明“做过架构考量”，不暴露私有思维链，也不保证最佳设计或预知所有未知未来需求。

Harness 只路由仓库原生 lint/AST/dependency/contract check，不实现跨语言通用架构分析器或新增架构 artifact/state。`check-modularity` 的语句数/分支风险会定位到最高风险函数和行号。

### Product Surface 与 Screen Contract

`context_surface_contract` 继续使用现有 `contract`、area/subdomain 和 verification 角色。`product-surface-contract.md` 负责跨页面、主层/下钻与共享职责；可选且按需读取的 `screen-contract.md` 负责单屏 entry/exit/shared state、信息层级、语义区域、导航/变体、material controls 和 target/verification 引用。它们不新增 `design`、`screen` 或 product-surface Context role，局部样式修复也不要求补建 Screen Contract。

material UI 在实现前执行 **UI Authority Closure**：每个稳定 surface/control/target key 必须归类为现有 Context 已覆盖、需要 Context 更新、task-local、显式 out-of-scope 或真正 decision-required。Design Source Projection 把长期 surface/flow/Screen/Control/state 含义放入既有 Surface 或 Screen/interaction Context，把视觉系统/token/motion policy/rationale 放入 `DESIGN.md`，把精确构图/数值/条件/asset 留在 versioned target，把可重复证明路径放入 verification Context，而 delivery-local coverage/provenance/blocker 留在任务或 Contract Source。出现冲突时 fail closed；当前代码、时间戳、YAML 或实现截图不能静默胜出。

### 视觉交付指导

两种开发路径共享一个条件式设计目的：当存在已选 implementation handoff 时，让 Agent 的开发、验收和测试在 UI/UX 方面完整遵循选定设计资源在声明范围与条件内明确表达的全部材料性信息。它不授权从静态图推断未表达的交互，也不能证明用户没有遗漏要求。Open Design 有能力输出实现级 HTML/CSS/JS、spec、token 与 asset，但“有能力”不等于每次都产出：选定 Web/App 实现 handoff 时，`/design-resource-authoring` 必须显式委托并完整取得一个机器可读 canonical entry 及其精确 dependency closure，逐文件冻结 digest，并暴露稳定的 typed locator；进入 `ready` 前，还要在这些不可变字节上逐项执行声明的 verification method，无法消除的 code/spec/token/asset 冲突保持未决/不可用并阻塞。这是源资源 QA，不是生产验收。PNG 只能作为派生视觉基线，不能成为唯一实现源。

provider-neutral handoff 是残余语义与索引层，不是 CSS 的文本副本。它逐一闭合每个适用的 subject × selected target × declared condition × UI/UX dimension 单元格，覆盖 surface/flow、visual/content、component/control、state/interaction、motion、adaptation/input、accessibility、assets 八个维度，并记录明确排除/不适用/未决含义、Source Item、verification method 与 blocker。preflight 会把每个 typed HTML/Markdown/JSON/CSS locator 对着其声明的不可变资源真实解析，校验 source/dependency closure，并拒绝不可解析或 media 不兼容的证据；探索候选仍不需要 schema。

这些输入仍是普通 Source。默认 Workflow 对 covered Source Items、declared verification methods、blockers、targets 和 conditions 保持精确但 task-local 的 accounting；每一项都必须到达生产 owner、冷启动旅程和已经执行的 final-candidate check，并能在失败时明确归因。任何 unresolved、unmapped、unexecuted、stale 或无法区分的项都会阻止“完整遵循”声明并作为 gap 报告。Long-Task 把同一组含义投影进已有 Claims、method Assertions、`surface_bindings`、typed evidence 和 Final Gate。两种证明载体互斥：active Long-Task 不再执行默认 closure。生成成功、截图、hash 与 preflight 只证明输入完整性或资源完整性。

默认 Workflow 会在 material 产品、设计、实现或验收判断前执行 UI Authority Closure 和条件式 Design Authority Check。它沿稳定 key 到 exactly-one canonical adoption record，再主动打开每个受影响的 selected `exact-target`/`constraint`；只看到 registry 或 handoff index 不算已消费。项目/系统/component-family target 由 `DESIGN.md` canonical 记录，单 screen/interaction target 由 owning Screen Contract 记录；该 record 独占 interpretation、selection basis、immutable locator/digest、condition coverage 和 editable upstream/update route，其他层只保留 stable key、owner/anchor 和 local applicability。缺失、不可读、过期或冲突时 fail closed；更新必须产生新 immutable version，不能覆盖旧基线。未配置 starter、候选稿、只有风格文字或灵感图都不能授权 agent 发明生产布局。明确的设计系统采纳请求路由到 `/design-system-authoring`，独立资源生成请求路由到 `/design-resource-authoring`；已有充分权威的普通实现、局部样式修复和 throwaway prototype 仍保持轻量。

只要是已经选定、准备进入实现的设计资源，两种开发路径都会先运行 `ty-context design-resource preflight <handoff.md>`。取得不完整、缺少或多出未声明依赖、不安全路径、过期 digest、虚构 locator、未闭合的适用单元格、不成立的证据类型或未决语义都会 fail closed。preflight 只证明设计输入语义完整且资源身份正确；开发流程仍必须打开真实资源，并从生产入口证明当前实现。

对 material 工作，`context_uiux_design` 应用上面的投影规则并让风险比例化 coverage reasoning 保持 task-local。`context_development_engineer` 用稳定 surface/control key 把每个选定 target/condition 及 handoff 精确集合追踪到生产 route/component owner、冷启动真实用户旅程及可独立归因的渲染/交互检查。第一个有价值的可运行纵向切片只是建议性的真实入口反馈点，不是实现门禁；最终候选仍必须重跑受影响的冷启动旅程。所有已声明/适用组合必须完整覆盖，不能用 risk-only 或 pairwise 抽样替代，除非权威 Source 明确收窄范围或项目自有证明建立等价性。只报告真正检查过的组合；资源哈希、manifest 和数量只证明资源完整性，实现截图既不能成为自己的目标，也不能单独证明实现一致性。

显式 Long-Task 是同一共享义务的强机器载体。它在 Compile 前解决缺失/冲突的 UI 权威，并用 `field_coverage` 闭合每个真实 Control 的全部 22 个 canonical 字段：每个字段只能是具有具体语义的 `specified`、带明确理由的 `not_applicable` 或会阻断的 `unresolved`；省略绝不等于不适用。specified/not-applicable 项会在每个声明的 applicability profile 下生成独立受保护 Control Claim。`control_relation_closure` 与 `control_relations` 同时闭合跨 Control/系统的共享状态、依赖/顺序、导航、权限、校验、反馈和恢复链。聚合的 Product `surface_bindings` 把每个 Control 连接到 owner surface、required product target、既有 Technical route/component Bindings 和 root-entry 成功旅程。选定 exact/constraint target 用 typed `design_conformance` 把冻结输入和声明条件绑定到当前 actual/comparison artifacts；`verification_method_bindings` 让每个 handoff method 都能独立失败，每个已声明 blocker 则保留精确 Source-item/method lineage，并落到目标本地机器证明或会阻断目标的 External Confirmation。它们不能在 Contract 内自行豁免，缩减范围必须修订 Source/Contract 权威。现有 Claim、Assertion、Check、Stage、Binding、revision 与 Final Gate 是唯一 Long-Task 生命周期和 closure。

combined design-and-implementation 可以先用普通 Outcome/Stage 生成候选，但 candidate/planned target 不能解锁 fidelity implementation；选定结果必须先成为真实 marked Context-reachable Source，并由 owning Context/`DESIGN.md` reference 连接，Authority Lock 后再通过 Authority Revision 采用。浏览器视觉 AC 使用 `ui_browser`；浏览器代理、独立 route 或深链接不能证明可独立失败的原生/root 旅程。资源完整性和 `visual_render` 不能替代选定目标的实现一致性。冻结 baseline 是 verifier input，生成的 actual render/diff 是当前 artifact，主观批准保持外部。这不新增 `uiux_delivery`、视觉 Claim type、resource registry、risk level、lifecycle state、Gate、必需设计目录、逐控件截图矩阵或通用像素阈值。

`ty-context doctor` 保留兼容的项目级 `missing | unconfigured | configured` 状态，并增加 Design Authority Index、token source 和已分类 reference 的 advisory 信号。它明确不推断页面实现就绪；material surface 仍需 owning Screen/Control meaning、selected target/constraints 与项目自己的验证路径。

静态 guidance 测试只能证明分发、投影与 canonical ownership 文案存在，不能证明 Agent 实际恢复了全部 UI/UX 信息。可选 delivery-mechanism benchmark 提供固定 fresh-agent UI/UX Context/target recovery task、routing gold 和隐藏 production oracle；只有独立配对运行才可以支持 effectiveness/ROI 结论。

### 显式 Design System Authoring

只有用户明确要求初始化、生成、选择、采纳、替换或修复项目设计系统/设计风格时，才使用 `/design-system-authoring`。安装只让冷启动能力可用，不会自动运行。Skill 会发现 Open Design 当前真实 MCP resource/tool；若当前版本只通过 MCP 读取设计系统而没有创建 tool，则使用同一个已安装 Open Design daemon 的官方 generation/revision/accept API，不复制 provider prompt，也不把 daemon 调用冒充 MCP。

生成结果先是候选。必须有明确人工选择，或用户明确委托且选择标准已知，才会采纳到项目 canonical `DESIGN.md`、唯一 authored exact-value token source/generation direction，以及真正拥有 surface/interaction 耐久事实的 Context。Open Design provider ID、revision、digest 与 project binding 只是同步 provenance，不是第二权威。provider 执行成功、artifact ready、selected、authority adopted 与 `get_project.designSystemId` binding verified 会分开报告。

### 可选 Design Resource Authoring

只有在用户明确要求生成、迭代、准备独立设计资源、为一段明确开发内容准备设计资源或使用 Open Design 时，才使用 `/design-resource-authoring`。输入可以是零散笔记或初始方案、产品/技术方案、专门视觉 brief、截图、已有资源或历史 Source Plan。独立 Source Plan 不是前置项，也不再是推荐中间步骤。

Skill 把明确输出或开发内容当作硬 scope ceiling。局部功能只可带上定位它所需的周边上下文；再丰富的背景也不能把生成范围扩成页面其余部分或整个产品。面向实现 handoff 时，Skill 要覆盖范围内所有材料性的 UI/UX 含义：surface/flow 与 region 结构、视觉和内容呈现、控件结构/尺寸/变体、静态与动态状态、交互/反馈/恢复/动效、响应式/平台/输入方式、可访问性及必要资产；先扣除已有 selected Source 明确覆盖的条件，再发现 Open Design 当前 agent/model、functional skill、rendering template、design system、plugin 与 export route，并把每种候选资源说明为 `selected`、`optional`、`not-needed`、`unavailable` 或 `decision-required`。

Skill 会先分类 visual-style dependency。高保真/品牌化输出、视觉方向、字体/颜色/密度、组件视觉处理和 production-style prototype 属于 style-bearing：若 `DESIGN.md` 未配置或没有唯一 authored token source/direction，Skill 必须在创建 provider project/run 前停下，并提示用户显式调用 `/design-system-authoring`，绝不自动初始化。低保真结构、IA/flow topology 和纯语义 behavior/state study 属于 non-fidelity。style-bearing 工作必须把已采纳 provider ID 传给 MCP `create_project.designSystem`，并用 `get_project.designSystemId` 验证一致。

Skill 只通过结构化 MCP（必要时有限使用 CLI/daemon/UI fallback）委托最小充分资源集。一个可定位、可检查的大页面稿、原型或组件族 workbench 可以覆盖多个事项；重复控件映射到共享变体，只有仍缺少材料性含义的独特/复杂控件才需要专门状态或交互稿。静态/default 页面不能自动代表没展示的动态状态、交互、动效、响应式或可访问性。原型、低/高保真组合、组件板、provider-native 输入、逐控件一份稿、变体数量和目录都不是全局必选项。设计资源可以表达用户可感知的交互语义和产品规则的呈现方式，但业务、数据、权限和算法逻辑仍由产品/技术 Source 所有。Tiny Context 不复制 Open Design 的 prompt/template，也不内置 provider catalogue。

面向 Web/App 实现时，Skill 必须取得上文所述完整 canonical entry/dependency set 与可寻址事实。Figma 适合已经存在的设计团队权威，需要原生 Components/Variables/Variants、共享库、Dev Mode 或 Code Connect 的场景；Penpot 适合明确需要开放、自托管多人设计基础设施的场景；OpenPencil 可作为本地静态布局 sidecar，但当前 prototype/motion 模型仍不完整。把完整 Open Design Source 默认转换为另一种表示会增加同步和运维成本，却不会关闭新的 enforcement gap，因此三者都不是默认依赖。

探索模式只做最小完整性检查并尽快展示指定候选，不需要 handoff schema。明确或受托最终选择且资源将进入实现时，Skill 只做一次合并、幂等的初始方案回改，并在任意获准的项目路径写一个 provider-neutral、带 Source marker、且只含一个严格残余 `design-resource-handoff-v1` block 的 Markdown。它记录 implementation source profile、typed locator、适用 subject/target/condition coverage、残余产品含义、Source-item/verification-method binding 和 acceptance blocker；随后运行共享 preflight，不能把取得不完整、不可寻址、`decision_required`、`unavailable`、证据不成立或过期输入称为 ready。这里没有固定目录、provider pack 或逐控件一份稿；适配器只是普通 Source，不是 Design Authority 或验收结果。Skill 不会修改 Source Plan、`project_context/**`、`DESIGN.md`、生产代码或 Delivery Contract。

实际生成仍由已配置的 Open Design/Product Design、Figma、图片生成、原型工具或人工设计流程负责。这些输出以普通 external Source 进入默认 Workflow 或 Long-Task。candidate 与 inspiration 不授权 fidelity；adopted exact target/constraint 作为 Context-reachable Source，由 owning Context/`DESIGN.md` 把稳定 key 连接到覆盖条件、不可变身份/digest 和 editable upstream owner/locator/update route。`context_uiux_design` 在下游执行 UI Authority Closure，只把耐久事实采纳到 Context/`DESIGN.md`；实现截图与 diff 仍是证据 artifact，不能自我授权为目标。

维护者可以设置 `TY_CONTEXT_OPEN_DESIGN_MCP_COMMAND` 与可选 `TY_CONTEXT_OPEN_DESIGN_MCP_ARGS_JSON`，运行 `npm run smoke:open-design` 做显式启用、只读的 discovery smoke。正常测试使用本地 mock MCP，不依赖 Open Design、登录、付费能力或不确定的设计输出。

### 退役 Source Plan 兼容入口

`/source-plan-authoring` 仅作为 long-task profile 的兼容指引保留。`/long-task-workflow` 从入口立即打开非权威 Contract Draft，并让完整 input inventory、混合输入综合/细化、稳定 Key、控件级语义、偏好/调研/委托溯源、Source marker/provenance、acceptance/risk 与 Contract 映射在同一循环中收敛。已有 Source Plan 仍是有效普通 Source，但不再创建独立或内部 Source-authoring 阶段、handoff、Schema、Gate、State 或第二份计划。

## Single-Goal Rolling Delivery

只有用户显式调用 `/long-task-workflow`，或当前 worktree 已有 active long task 时才使用。它固定为：

- 一个平台原生、持续的 Goal；
- 一个用户选定的仓库与最终验证/收敛 worktree；
- 一次完整选定交付、一个 Contract、一个 Final Gate；
- Outcome 依赖只表示验收与中间证明就绪关系，不限制实现顺序，也不表示 Worker 调度；
- 第一次 Authority Lock 后、正式实现前有一次用户模型选择；
- 当前 Goal 自主选择实现顺序、局部计划、工具和平台原生 opaque delegation；Frontier 只提供验收/验证建议；
- targeted verify 是可选反馈与修复证据，永远不能 accepted，也不构成继续实现或进入 Final Gate 的门禁；
- scope-only revision 可先做无状态候选诊断，机械边界内的修复自动采用；只有稳定且确需用户决策的候选才至多询问一次精确 identity；
- Final Gate 在一个当前快照上重跑全部 Check；
- Stop Hook 在结果 stale 时阻止完成。

原始/修订方案、选定设计资源和混合附件会立即进入一个 Source-bound Contract Draft 循环；完整 input inventory、稳定 Key、控件级含义、acceptance/risk、direct/derived/delegated/evidence-backed 溯源、Source 归属与 Contract 映射一起收敛。声明为 Source 的 Markdown 中，每一行非空文本都必须属于一个 Material `ty-source-item` 块、一个具有唯一 key 和理由的非权威 `ty-source-background` 块，或唯一且通过 schema 校验的 `design-resource-handoff-v1` formal block；未分类文本 fail closed，把材料性语义错误标作 background 则是明确的上游 authoring 信任边界违规。若未知偏好会实质改变调研或选型，Preflight/Compile 成功前必须先询问；标准明确后，有依据的推荐才写入真实 Source，不能只藏在 YAML。方案委托不授权真实高危外部动作；输入冲突、用户保留、偏好缺失或无可靠推荐仍为 `decision_required`。旧 Source Plan 结构本身不构成阻塞。

第一次正式 Compile 成功前，`delivery-contract.yaml` 是同一份非权威 Contract Draft。`/long-task-workflow` 从入口开始，跨 Source 细化、仓库/Context 读取、映射和 Preflight 修复持续修改它，不要求一次响应生成完整 Contract。Source 完备性是 Preflight/Compile 的收敛条件，不是前置阶段。不存在单独 Contract Draft Skill、Draft Receipt 或 Authoring State。

第一次成功 Compile 创建 Authority Lock，并返回：

```json
{
  "execution_model_checkpoint": {
    "required": true,
    "phase": "post_authority_lock_pre_implementation",
    "options": ["continue_current_model", "switch_model_then_resume"],
    "turn_boundary": "end_current_turn",
    "explicit_task_specific_choice_required": true,
    "generic_continue_satisfies": false
  }
}
```

这是严格的终止当前回合边界。除非用户此前已明确给出本任务的“当前模型继续”或“切换后恢复”策略，Agent 在该结果后不得继续产品实现、文件编辑、构建或测试，必须结束当前回合并询问选择。“继续”“恢复”“完成”“继续 Goal”等泛化表达不能满足卡点。后续 `compile --revise` 返回 `required: false`，不会重复暂停。Harness 不会自动切换模型，也不持久化 acknowledgement、model route 或 checkpoint state；模型选择不是验收证据。

锁定后的修订把“Authority 有变化”和“需要用户决策”分开：单调增强、锁定 Claims/targets/proof obligations 不变的 Source/Context snapshot 更新、Runner/input 实装修复、repo-bound scope 扩展、风险增强，以及 carrier、mutation、Check 相同且 Claim/预期失败断言覆盖不减少的等价 Counterfactual 覆盖可自动采用；产品/Source Claim/target/external-confirmation 变化，丢失 scenario/Claim/Evidence Capability/失败拦截，移除 forbidden/owner Context，runner type/effect、verifier kernel 或未知 reason 则只预览并等待精确 identity，风险降级直接拒绝。`diagnose-revision` 无副作用，撤回/替换候选只在同一 `delivery-contract.yaml` 合并，不产生询问。最终 pending brief 先解释 Authority Revision 是什么，再区分 `user_decision_reasons` 与机械边界变化。必须先展示 brief；若当前任务已有明确指令精确覆盖全部决策 reason，可机械转录而不二次询问，泛化“继续”、一揽子批准、建议或 Agent 推断不算。每次采用都保留 exact identity、旧 Authority 连续性、证据失效和完整 Final Gate，并返回滚动实现，绝不表示完成。

Long-Task Skill 采用渐进读取：主 `SKILL.md` 只保留目标、硬边界和路由；Draft 输入/Contract Authoring、Evidence Design 与 Authority Lifecycle 细节按当前活动读取一层 reference，其中 Draft 输入与 Contract mapping 同时进行。这只是指令组织，不产生第二权威。共享 Architecture Deliberation 在 Source-bound Draft authoring 中完成；material 架构不变量使用已有 obligations/constraints/forbidden shortcuts、owner/path/Binding 和项目原生 executable Checks，Final Gate 是唯一的 Long-Task Architecture Conformance 承载点。

Draft Outcome 只是 Authority Lock 前的 Outcome。Outcome 按可独立观察、判断、纵向闭环和定向验证的结果拆分，用于投影 acceptance/verification-ready 工作集、定位失败、恢复 finding 并精确失效旧局部结果。`depends_on` 只表示 acceptance 与中间证明 readiness，不授权或禁止实现编辑。每个 Outcome 属于一个有序 Stage；Stage gate 传递依赖同 Stage 其余 Outcome，后续 Stage 依赖前置 gate。Rolling Frontier 和 Stage 状态都由普通 Outcome Progress 临时派生，只是建议性验证/诊断投影。当前 Goal 可按代码现实跨 Outcome/Stage 实现、检查或返工，也可使用平台原生 opaque delegation；Harness 不创建 delegation scheduler、不把委派当证明，所有结果必须汇入选定验证 worktree。Outcome 不是 Worker、scheduler task、queue 或并行单元，Stage 也没有 Receipt 或第二个 Gate。Outcome 拆分诊断和证明归属，不拆分完成权威，因此最终仍必须在当前最终快照运行一次完整 Final Gate。

Contract 声明一个有界 target profile、非空 required product target refs，以及每个 target 的 runtime family/root entrypoint。Web/process 代理不能代替单独要求的 Native/desktop 目标；browser 目标由 Playwright 证明，Native/desktop 目标由 project binary 证明。每个 `critical_user_path` Outcome 和 Stage gate 都必须从每个 required target 的 root 证明 `target_runtime`；多 Outcome Stage gate 还必须证明至少两个不同 surface 对应同一运行时状态。

如果一个声明结果可能在代理表面通过、却在目标运行时独立失败，最早拥有可运行边界的 Outcome 必须声明项目自有的真实运行 Check，并在当前 Check 执行中启动或触达目标、从同一会话产生结构化 Observation。仓库内状态报告、截图、二进制、日志或历史运行不能单独证明目标运行时。Check 显式声明带 Key 的 Given/When 场景与 journey role；global/Outcome applicability profile 绑定精确 target、journey、Given condition/input/state refs 与有序 When refs。每个 Claim 列出全部适用 profile，每个 Claim-bearing Assertion 只证明一个 Claim 在一个完全匹配 profile 下的语义；每个实际 applicability × proof-surface 单元都必须可归因，不能由 risk-based、pairwise 或抽样替代。Assertion 声明 all-of Evidence Capability，并由类型化的当前执行记录证明。静态 `presence` 不能证明行为，降级路径不能替代要求的成功路径，固定输入不能证明输入变化，产生 side effect 的组件也不能自行证明其边界效果。每个行为型 Claim-bearing Assertion 还必须有同 Check 的语义 `replace_file` Counterfactual：错误语义使它失败，同时列入 `preserved_assertions` 的无 Claim target-runtime liveness Assertion 必须继续通过。每个 Check 的 `input_paths`/Binding 应是最小可信失效范围，每个 Counterfactual carrier 都要能从声明的 target root 解释其路径。第一个有价值的可运行切片和合并后的相关变化只是默认建议反馈点；只有中间判断实际依赖某条 Progress 时才必须刷新。继续实现或进入 Final Gate 不要求先跑 targeted verify，因为 Final Gate 会忽略 Progress 并重跑全部 Check。`verify --explain` 可提前展示 Main/Counterfactual/重试次数，但不执行、不写 Progress，也不能看见 runner 内部构建。它不增加通用可达性断言、实现门禁、第二个执行型 diagnose 模式、调度器、逐平台 Progress 或逐编辑完整重建；运行时专属依赖探测、构建进度和进程清理由项目 runner 负责，Final Gate 仍是接受权所有者。

工作流变更必须依次通过两道门槛。第一阶段先证明 `Coverage_new ⊇ Coverage_old`、`FalseNegative_new ⊆ FalseNegative_old`，并保持 Authority、fail-closed、完整/当前/最终候选快照证明均不可绕过；任何成本下降都不能补偿漂移识别能力下降。第二阶段才比较增量收益与 Authoring、Runtime、State、Recovery、维护、测试、流程、引入和迁移等全部增量成本。正 ROI 的精确定义是“增量收益大于全部增量成本”，因此候选可以进入考虑集；正 ROI 不代表自动采用。

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
- `compile` 重复同一 fail-closed workspace 分类和 activation validator，因此直接 Compile 不能绕过 Preflight，再按精确 applicability 生成 Global 与 Outcome Result/Requirement/Control-field/Control-relation/Non-completing/Technical Claim，拒绝未覆盖单元，并让第一次正式成功 Compile 成为 Authority Lock。首次 enable 仅保护配置的 managed destination 中当前 package asset tree 实际存在的精确文件，以及精确的 config/hook 文件；managed 目录根和宽泛 `.codex/**` 均不豁免。每次结果都包含 lifecycle event、`delivery_completed_by_this_event: false`、`native_goal_effect: none` 和 next action。第一次结果附带 `execution_model_checkpoint.required: true` 及 terminal-turn/explicit-choice 契约，后续 Compile 返回 `false`；这些字段不进入 Authority state。
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

Runner 支持 `package_script`、`project_binary`、`node_oracle`、`playwright_test`。Proof surface 支持 `ui_browser`、`runtime_behavior`、`api_contract`、`data_state`、`security_boundary`、`population_coverage`、`implementation_structure`。Execution target family 是有界的 `browser`、`native`、`desktop`、`service`、`process`、`external`，role 是 `product`、`support`、`observer`；required ref 只能指向 product target。Browser target 只能由 `playwright_test` 证明，Native/desktop target 只能由 `project_binary` 证明。

### 一个 Contract 与 Source Claim

用户选定的一次完整交付始终只有一个 Contract 和一个 Final Gate。Outcome 只按“可独立判断、可定向验证”的结果拆分；模型输出长度、YAML/文件长度、前后端层、模块数量、并行偏好或 Agent 容量都不是拆分依据。

V2 强制至少一个真实 `source_path` 与一个 `source_claim`，且每个声明的 Source 文件至少包含一个 Material Item。Authoring 阶段必须在原始 Markdown 中仅插入不渲染的 `ty-source-item:start/end` 标记，不得改写 Item 原文；其他每一行非空文本必须位于唯一 key/理由的 `ty-source-background:start/end` 块或唯一且 schema-valid 的 `design-resource-handoff-v1` formal block 中。Marker key 与 Source Claim key 必须集合完全相等且全局唯一；未分类、嵌套、重叠、未闭合或空 section 均 fail closed。Parser 能证明语法归属完整，不能证明 author 没有把材料性语义误标为 background，也不能证明用户已表达所有真实需求；两者是显式上游信任边界。

类型化 disposition 分开整体结果、Requirement/Control/Obligation/Non-completing Claim、单一命名 Acceptance Assertion、Global Constraint/Non-goal、Risk Fact/Affected Outcome、External Confirmation 与真实决策。Outcome Source Acceptance 必须原样对应一个 `<outcome>.<check>.<assertion>` criterion，并证明至少一个被独立 Source Item 支撑的非 Result Claim。`out_of_scope` 已退休：排除原本在范围内的要求只能进入 `decision_required`。

`context.toml` 中仅用于未来读取的 `triggers`、`read_when`、`read_policy`、default selection 与未选节点不再进入当前 delivery Authority；当前已选 area ownership、role/dependency 与 Context 内容仍受保护。最终 Git tree 变化后仍必须重新运行 Live Final Gate。

## 确定性风险分级

- **L0**：局部、可逆、可直接测试的任务走默认工作流。
- **L1 standard**：多个可观察 Outcome 或需要跨会话恢复，且有可靠可执行验证。
- **L2 strict**：使用同一套 Long-Task 和 Outcome 结构，但对公共 API/schema、持久数据、迁移、安全/权限边界、不可逆外部影响、全量 population，或可观察性弱的关键主路径增加更严格的 proof；不支持多仓库交付。

用户可以主动升级为 strict。显式 `standard` 低于计算出的最低级别会以 `risk_level_below_required` 失败。Strict 所需 negative、counterfactual、population、security、environment、rollback/recovery proof 由 Compiler 按风险强制。

## Evidence 与完成权威

最终接受来自当前可执行证据，不来自 Agent 文本。Evidence Adapter 由 Runner 派生：只有 `playwright_test → playwright_json_v1` 可以证明 `ui_browser`，其余 Runner 使用 `structured_json_v2` Adapter 证明非浏览器 Surface，并在需要 capability record 时输出增量 `long-task-check-result-v3` payload。V2 payload 只保留解码兼容，不能满足非 `presence` 能力。

每个 Check 声明非空、带 Key 的 `scenario.given`/`scenario.when`，并使用 `success`、`degradation`、`recovery`、`stage_gate`、`conformance` journey role。Global/Outcome applicability profile 绑定精确 target、journey、Given condition/input/state refs 和有序 When refs；每个 Claim-bearing Assertion 只证明一个 Claim 在一个匹配 profile 下的语义，全部实际适用 proof-surface 单元都必须覆盖。每个 Assertion 声明 `presence`、`interaction_trace`、`state_delta`、`cross_surface_consistency`、`durable_readback`、`boundary_invocation`、`external_side_effect`、`failure_injection`、`visual_render`、`target_runtime`、`input_variation` 中所需的 all-of 集合。除了静态 `presence`，每种能力恰好需要一条绑定该 Assertion 的当前执行记录；缺失、重复、未知或未声明记录全部 fail closed。Result 只能由 success Check 证明；success 与 degradation 不能共用一个 Check；外部边界从 observer target 观察；input variation 至少证明两个不同输入、两个输出 hash 和一个失败样例。

每个 Outcome 至少有一个非 Result 原子 Claim，且 `required_proof_surfaces` 必须 all-of 全覆盖。Claim-bearing Assertion 使用显式 Expected 比较；`truthy/falsy` 禁止，`exists` 仅允许证明 `implementation_structure` Obligation。每个行为型 Claim-bearing Assertion 还必须用 same-Check `replace_file` 替换为错误语义，并要求无 Claim 的 target-runtime liveness Assertion 在 `preserved_assertions` 中继续通过；Population 只能证明集合完整，不能豁免这条语义 witness。

Targeted verify、Progress、status、Receipt 与 compiled cache 都不是完成权威。Final Gate 要求 clean candidate commit，从 Source 重新 Compile，在同一 Git-tree snapshot 上运行全部 Global/Outcome Check；执行前后都重新编译并核对 Contract/fragments、Source、Controlling Context、verifier/runner、verification inputs 与 workdir inputs 的完整受保护身份，同时复核 active identity。只有全部不变时它才可以生成 `machine_accepted` 或 `machine_accepted_external_pending`；后者仍必须明确列出外部确认项。

## 兼容与迁移

0.7.2 在同一个 `long-task-delivery-v2` 权威中增加 ordered Stage、required target/root entrypoint、显式 success/degradation journey 与 scenario、类型化 Evidence Capability、类型化 external impact、按风险触发的 Product Conformance，以及 terminal target/Stage projection。缺少这些字段的旧 V2 Contract 会报告可索引的人工迁移 `long-task-v2-semantic-drift-authority`；必须依据 Source 重新表达缺失语义。Upgrade 不会猜测这些含义，也不会把旧 Progress/Receipt 当作通过证据。

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

模块化门禁是 `ty-context check-modularity`；例外必须包含 `owner`、`introduced_at`、`reason`、`tracking_issue` 和 `expiry_condition`。

## 诚实限制

- Harness 不创建或恢复平台物理 Goal/会话。
- 它不能证明用户从未遗漏未声明需求。
- bounded Context keyword search 仍可能漏掉同义词或间接依赖，只能补充语义判断。
- Harness 不能切换 host 选择的模型，只能在第一次 Authority Lock 后要求一次用户选择。
- Tiny Context 不提供并行 mutation/delegation runtime；平台 Goal 可使用自身 opaque implementation delegation，但 Harness 不持久化它，也不把它当证据。
- 它不观测平台 token 或模型调用数。
- Network policy 会约束传给 runner 的代理环境，但不是操作系统 sandbox。
- 同用户/管理员文件篡改、系统级 Hook 绕过不在安全边界内。
- Git/PR/CI、部署与人工产品确认仍由外部系统负责。

## License

MIT
