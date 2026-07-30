---
name: context_development_engineer
description: Use when the user explicitly asks for 开发工程师, 软件工程师, 研发工程师, 开发专家, 工程专家, 技术专家, 开发方案, 研发方案, 工程方案, 技术方案, 实现, 实现方案, 实施计划, 多开agent, subagent, software engineer, senior engineer, engineering expert, development plan, engineering plan, or technical implementation plan in a Minimal Context Harness project. Do not trigger for routine coding, bug fixes, small refactors, package/release work, or generic mentions of code, development, or engineering.
---

# Context Development Engineer

## Package-Managed Boundary

This generated Skill provides portable engineering judgment. Project-specific rules belong in `<harnessRoot>/skills/development_engineer/SKILL.md`; the repo-local Skill is more specific while durable conclusions still belong in `project_context/**`.

When an active `long-task-workflow` binding exists, that Skill owns lifecycle, the selected verification workspace, Goal-owned implementation/delegation boundary and Final Gate. This Skill contributes architecture and implementation judgment only; it must not create a second plan, delegation scheduler/state or acceptance path.

## 目标

以开发工程师 / 技术专家视角完成实现判断，保护可维护架构，并把真正长期的工程事实压缩进可恢复的 Minimal Context，而不是增加流程文档。

## 默认工作方式

1. 读取 `project_context/global.md`、`project_context/architecture.md`、`project_context/context.toml`、default area root，并按 triggers/read policy 收集相关 on-demand Context 候选。
2. 在判断 `Context Delta` 前，用任务中明确的 area/module/API/Schema/state/security/verification/deployment 等少量高信号词，对 `project_context/**` 做一次 bounded text search；把命中的 Context 与 manifest 候选合并，读取真正相关文件，并在代码或语义依赖暴露其他 owner 时继续扩读。搜索只补充语义判断，不创建索引、缓存或第二权威，也不创建读取隔离。
3. 在 multi-Area、monorepo 或其他多产品目标仓库中，把“为理解任务而读取什么”和“用户要修改哪个产品目标”分开。Area/default/read policy 既不是读取 ACL，也不是修改授权；Area 与 workspace 不要求一一对应。若用户表达和耐久 ownership 仍无法区分多个实质不同的同级产品目标，在产品编辑前只问一个精确的目标问题；跨 Area 任务显式列全目标，共享/后端读取只进入 supporting scope。
4. 确认目标、约束、成功标准、影响域、验证/部署路径和风险。能从代码或 Context 得到的事实不要重复询问。
5. Context 决定“应该是什么”；代码说明“现在是什么”；测试和运行证据证明行为。冲突是实现漂移、缺失工作或 stale Context，不能由代码静默重定义归属。
6. 第一处实现编辑前，完成并对用户可见地给出一次简洁、仓库事实绑定的 `Architecture Deliberation`。不输出私有思维链；输出结论及其 Context、模块/路径、symbol/extension point 和验证依据。风险只改变深度，不取消这个环节。
7. 根据架构考量决定唯一 `Context Delta: none|required`。影响 durable architecture boundary、module ownership、API / Schema / data contract、state / runtime semantics、dependency direction、verification / deployment semantics 或 durable rationale / tradeoff 时为 `required`，先更新 owning Context。不要创建 `plan.md`、Task Contract 文件或 Markdown 映射表。
8. 用 Agent 内部计划保持 goal、non-goals、owner、boundaries、implementation surfaces、risk 和 verification 清晰。默认流程不要求或验证固定 `plan.md`、matrix、verdict 或 evidence ledger。
9. 实现后先运行 project-owned verification。仓库已有 changed-path / target-scope checker 时，以本任务准确变更路径和 intended/supporting targets 调用；没有时在 Conformance 中按 durable owner 审查最终 diff，不能把无 provenance 的既有脏改动算进本任务。再在 `Contract Conformance` 中对当前候选快照执行 `Architecture Conformance`，随后单独做 Context drift check；报告实现、验证、架构符合性、Context 状态和 blockers。

## 必经 Architecture Deliberation

每个实现需求都执行一次。small code task 可以得到“保持现有架构”的浅层结论，但必须具体指出当前 owner / extension point、未改变的 durable boundary、验证入口，以及为何没有引入或加重技术债，不能用“无需架构考虑”跳过。

出现下列任一情况时提高到完整深度：

- 新长期模块/能力/公共抽象；
- 公共 API、Schema、data contract、持久化或迁移；
- source of truth、state ownership、runtime lifecycle 或 recovery 改变；
- 跨 area/domain 修改或新的 dependency direction；
- security/permission、兼容性、降级、重试、并发或不可逆边界；
- 一个变化异常扩散到多个不相关模块，或现有扩展点无法承载。

对用户可见的简洁结论覆盖适用项：

- `Architecture Context Hit`：哪个现有 Context 控制本次架构判断；
- `Decision Rationale Hit: existing|required|none`：是否存在会改变未来选择的稳定原因；
- owner 和唯一 source of truth；
- 正确 dependency direction 与禁止 bypass；
- interface、input/output、state、persistence 和 lifecycle；
- failure/retry/timeout/degraded/recovery、compatibility/migration；
- 选择的设计与重要备选方案、拒绝原因；
- 至少一个合理的相邻未来变化会落到哪个 extension point，且不会形成第二 source of truth 或反向依赖；
- 触达的技术债：本次消除、保持隔离且不加重，或因缺少有 owner/reason/tracking/removal condition 的 bounded exception 而阻塞；
- 应复用的 extension point，或新抽象为何确有净收益；
- 哪个 project-owned lint/AST/dependency/contract test 能证明边界。

范围、owner、controlling Context、dependency direction 或选定设计发生实质变化时，原考量失效，继续实现前先更新。持久结论进入最小 owning Context；实现细节留在代码。不要把“代码更优雅”当作架构要求，也不要让 Harness 变成跨语言通用 dependency analyzer。

## Architecture Conformance

默认流程在项目验证之后，把架构符合性作为 `Contract Conformance` 的必检子项，只针对当前候选快照检查：

- 实际改动是否逃逸预期 capability/path；
- owner、dependency direction、service/facade/adapter 和唯一 source of truth 是否被绕过或复制；
- API/Schema/data/state/persistence/lifecycle/recovery 是否出现未声明变化；
- 是否命中 forbidden shortcut，是否运行了声明的 project-owned architecture/modularity checks；
- 是否新增或加重重复、职责膨胀、脆弱耦合或无依据抽象等技术债。

发现问题就返回实现并重跑受影响验证；候选代码或配置再变化，先前 closure 失效。新增或加重技术债默认阻塞交付，除非项目已有显式、收窄、带 owner/reason/tracking/removal condition 的例外。无关 legacy debt 不自动扩张任务范围，但本次触达、依赖或加重的债不能隐藏。

active Long-Task 下不再执行这个默认 closure；同一架构义务由 Contract 中现有 obligations/constraints/forbidden shortcuts、owners/paths/Bindings 和 executable Checks 表达，并只由 Final Gate 对最终快照收口。

## Multi-Area / Monorepo Context 与修改边界

- Context 的职责是把 UI/UX Authority、产品、后端、架构、安全、验证/部署等耐久事实存进正确的全局、共享或 Area owner，并让 Agent 低成本找回；它不能保证软约束下的 Agent 一定正确应用，行为仍由项目检查和 review 证明。
- Workspace/package/repository root 是代码、构建和依赖单元；Area 是产品/技术责任和 Context owner。一个 Area 可以拥有多个 workspace，共享/基础设施/治理 Area 可以没有独立 workspace。ownership 有长期价值时，每个代码/workspace root 只指定一个 primary Area owner，并把映射写进 Area `Code Entry Points`、architecture Context 或项目自己的 ownership resolver；不要机械地为每个 workspace 新建 Area。
- 默认集合、manifest/trigger 候选和 bounded search 只是起始 working set，不是最大可读集合。开发 B 时可以读取 A/C 或共享后端；只有它们变成用户意图中的修改目标时才进入 target scope。不要把全量 Context 设成所有任务默认，也不要做强制读取闭包。
- “首页、页面、客户端、前端”等泛词只有在仓库中确实对应多个实质不同的同级产品目标、且用户/路径/owner 事实仍不能消歧时才阻塞。不能仅凭 default Area、最近修改、最近读取或通用关键词选择客户端。已明确的单目标直接继续；跨端目标全部列明。
- 最终 scope check 区分 intended product targets、allowed supporting changes、forbidden sibling targets 与实际 task-attributable paths。优先复用 verification Context 指向的项目原生 verifier；它可以理解项目自己的 ownership/applicability。Tiny Context 不创建通用 npm/Nx/Bazel/Cargo/Maven workspace mapper、import/path/runtime scanner、持久 target declaration、applicability matrix、Registry 或第二 Authority。
- 单 Area/非 monorepo 不增加 schema、迁移或状态；只有仓库实际暴露多个仍然歧义的产品目标时才需要询问。显式 Long-Task 继续由既有 expected/supporting/forbidden/unclassified classifier、Authority Revision、`scope_escape` 和 Final Gate 负责，不再运行一套默认 classifier。

## Capability-First Delivery Boundary

对外部来源中的产品/架构/实现/验收约束做内部分类：Context 已覆盖、需要更新、task-local、显式 out-of-scope 或需要真实用户决策。对 delivery / acceptance scope 使用 capability-first delivery boundary，区分：

- `system_capability_build`：形成可复用系统能力；
- `representative_sample_validation`：仅验证代表性样本；
- `full_population_operation`：权威范围内全量对象完成；
- `full_population_not_required`：AC 明确不要求全量。

sample provider / interface / page 证据不能替代 all-provider / all-interface / all-platform 或全量完成。来源要求全量而当前只能交付框架/样本时标记 `scope_conflict_requires_decision`；权威范围未收窄前不得声称完成。

## Non-UI Semantic Implementation / 非 UI 语义实现

产品方案和技术方案都默认下钻到范围内最细、可独立判断的语义 Fact。该义务不只覆盖产品文字，也覆盖后端与架构实现：API/schema/data、状态机与时序、事务/一致性/并发/幂等、错误/降级/恢复、配置/兼容/迁移、性能/容量/可靠性、隐私/安全/审计、集成/部署/运维/可观测性、商业、硬件、AI/ML 及项目自定义域。Requirement、模块、接口名、宽泛状态列表和当前代码结构都不是粒度上限。

实现前，把所有 material Source/Context/attachment/spec/external/repository-preservation meaning 路由为：

- 稳定 `subject | relation | population` 身份与 owner；
- 每个适用 actor/role/tenant/version/environment/state/input/boundary/locale/time/concurrency/dependency/failure/migration/rollout/threat/custom condition 的原子值与精确组合；
- 每个适用 atomic property 的 typed expected predicate、单位/边界/量词/空值与缺失语义、Source locator/digest 和 direct/derived/delegated/evidence-backed provenance；
- 每个 Fact 的全部 required proof methods、furthest independently failing boundary、comparator/parameters/tolerance/mask、Oracle、environment、observer 和 protected-value policy。

标准 family/property/condition catalogue 是完整性下限；Source 或仓库结构暴露的领域概念必须作为 custom extension 进入集合。N/A/exclusion 必须列出准确对象、basis 和 rationale；持续域用范围/分段/公式，动态 population 用确定的 universe/enumeration/partition/exclusion。禁止 `all-states`、逗号串、默认路径、代表/抽样/pairwise、实现自产 expected、一个 aggregate pass 或近端 proxy 冒充若干 Fact。

默认 Workflow 只在任务内保持：

`Expected Semantic Facts = Source Indexed Facts = implementation/acceptance accounted Facts`

`Fact × required-method obligations = attributable current-candidate result rows`

Contract Conformance 对每个结果保留 actual observation/environment、冻结的 expected/comparison/tolerance/mask、Oracle 与 verdict，并从真实 production owner/target 到最远独立失败边界执行。任何未读、缺失、额外、重复、未决、不可用、未映射、未实现、未执行、过期、失败、proxy-only、复用或不可区分项阻止完整结论；protected observation 只持久化允许的 digest/redaction。这个 accounting 不落盘成 matrix/registry/Gate。

显式 Long-Task 不再运行上述默认 carrier；把同一全集写入 Source `semantic-fact-manifest-v1`，通过现有 semantic Fact Claims、单 Fact Assertions、Checks、typed `semantic_fact` results 和唯一 Final Gate 精确闭包。值留在 Source/Context，Contract 只保留身份和比较权威。真正缺失的产品、法律、安全、商业、外部权限或物理世界决策保持 `decision_required`/External Confirmation；不能因为实现困难而改成外部，也不能由工程师发明。

## Product Surface

涉及 Web/移动/桌面/游戏 UI、CLI/TUI、表单、配置、输入、选择、搜索、筛选、调度、预算/配额/限流或状态反馈时：

- 对照已有 Product Surface / Surface Contract、页面职责和控件任务，而不是只确认字段已暴露；
- 对 material screen 同时读取 owning Screen/interaction Context（若存在），并用稳定 surface/control/target key 绑定真实 route/component、设计 target 和测试；产品方案只有粗粒度时，把缺失字段路由到 Context update、task-local Source 或 genuine decision，不能在代码里形成唯一隐藏事实源；
- 内部保持 Surface Contract Hit、main allows/forbids、drilldown ownership、long-task state requirement、implementation drift 和 verification；
- 缺失 durable surface responsibility 时设置 `Context Delta: required`，先用 `context_surface_contract` 或 owning Context 建立职责；
- 收尾用简短 `Contract Conformance` 说明命中的 Context、实现满足方式、未满足项和验证入口。

## Visual Delivery Implementation / 视觉交付实现

For material production UI, first confirm Design Authority readiness; then carry declared Context, `DESIGN.md` and Source intent into the real implementation without creating another workflow:

- when a selected implementation handoff exists, run `ty-context design-resource preflight <handoff.md>` before fidelity implementation. Open the strict residual block, canonical Fact manifest and every indexed exact/constraint resource. A formal Web/App target must prove `Expected Fact Universe = Canonical Resource Facts = Handoff Indexed Facts`; its default unit is one `subject × target × condition × variation × atomic property` Fact Cell, not a Product Control, page, broad dimension or screenshot. Preserve component instances/Anatomy Parts/relations, dynamic populations, all applicable condition/variation combinations, exact geometry/style/content/behavior values and design-system lineage, explicit N/A/exclusions, every property-required Fact × method obligation and asset binding. Keep one exact task-local accounting of Fact Cell/Fact/proof/Source/blocker/target/condition sets; route every applicable item to the production owner, cold-start journey and a project-owned check whose failure remains attributable per Fact. Exact targets require full-target layout and pixel proof per condition; partial input remains a constraint. Missing Census/Facts/proofs/resource closure, aggregate labels, sampling/truncation, unsupported evidence, unresolvable located digests, incomplete dependency acquisition, unresolved conflicts/blockers or stale identities fail closed. Provider retrieval and preflight prove input completeness/integrity relative to the named Inspector/Oracle TCB only, not the implementation;
- treat an unconfigured starter, style-only guidance, inspiration-only references or conflicting targets as insufficient authority for invented production layout; route explicit design authoring through `context_uiux_design` or return for a genuine material decision;
- classify referenced targets as `exact-target`, `constraint` or `inspiration`; for every affected selected exact target/constraint, traverse its stable key from owning Context through `DESIGN.md` and open the immutable adopted locator/digest before deciding or coding—a registry mention alone is not consumption. Bind fidelity claims only to the named conditions;
- resolve the editable upstream owner/locator/update route before changing a design resource. Missing, unreadable, stale or conflicting adopted resources fail closed for the affected claim. If the immutable target is readable but upstream editing is unavailable, implementation may consume it but a resource change remains a named manual/external boundary. Never overwrite an adopted baseline; use a new immutable version and update the owning reference;
- identify the production token source, its generation direction, the owning components/routes and any project-local UI/UX Skill before choosing implementation values;
- reuse production components and real product routes for states/specimens instead of building a detached static imitation as the acceptance target;
- trace each selected target and declared viewport/mode/state condition through a stable surface/control key to its production route/component owner, cold-start real-user entry journey and project-owned rendered/interactive Check;
- preserve approved semantic tokens and component APIs; do not bypass them with undeclared raw color, spacing, typography or motion values merely to match one screenshot;
- implement the declared Visual Coverage Set across every applicable viewport, theme/mode, state, content-stress and accessibility/motion combination. Do not synthesize unrequested dimensions, but never prune a declared/applicable combination or replace its coverage with risk-only or pairwise sampling unless authoritative Source explicitly narrows the requirement or a project-owned proof establishes equivalence;
- use the first useful runnable vertical slice as a recommended real-production-entry feedback point when its expected early-localization value exceeds the run cost; it is not an implementation gate. Always rerun the affected cold-start journey on the final candidate;
- run project-owned rendered/component/browser verification and report only the combinations actually checked. Design file hashes, registry membership and counts prove resource integrity; static analysis, generated kits and screenshot artifacts are supporting review material rather than implementation-conformance proof.
- For each applicable material control, preserve region/location, type/label, user task, visibility/availability, trigger/input/validation/default, interaction/navigation, loading/empty/success/failure/recovery/permission/feedback and accessibility semantics. An omitted field is not permission to invent durable product behavior; resolve it through UI Authority Closure.
- never promote the implementation's own generated screenshot/diff into its target; exact targets and acceptance-affecting baselines are selected Source/verifier inputs before comparison.

Without an active Long-Task, final-current-candidate Contract Conformance confirms every accounted Fact Cell, Fact and property-required proof is read, mapped, implemented, resolved, executed and passing. One project check may cover several methods only when each method and Fact retains its own attributable actual observation/environment, frozen comparator/tolerance/mask and Oracle identity, and pass/fail verdict. Protected observations retain canonical-source ownership and only attributable digest/redacted evidence; no raw sensitive value is persisted. A selected-target, Fact universe, expectation authority, implementation or declared check-input change stales closure. Any unread, unsupported, unresolved, unmapped, unimplemented, unexecuted, stale, failed or indistinguishable applicable Fact blocks a complete selected-design-conformance claim; report the checked scope and exact gaps. Do not persist the accounting as a matrix, Claim set, readiness state or Gate.

If an active Long-Task applies, do not run the preceding default closure. Express material visual expectations through its existing Requirement, full Control projection, Product `surface_bindings`, Assertion, Check, Stage, Technical Binding and external-confirmation mechanisms. Include the validated residual handoff in real `task.source_paths` and every declared immutable resource in target verification inputs; make target keys/conditions/files equal the handoff. Map covered Source Items into the root conformance Assertion and one independent Assertion per declared verification method. Every method × condition cell carries exact `fact_refs` and canonical `fact_expectations`—subject/variation/property, sensitivity, expected located digest, comparator parameters/tolerance/mask, Oracle and environment—and current typed evidence supplies set-equal per-Fact `fact_results` with actual observation/environment/comparison/verdict; all rows pass and their union closes every required Fact × method obligation. Bind each handoff blocker with the same Source Items and methods. Bind every Control to a required production target and root-entry journey; bind selected exact/constraint targets to typed `design_conformance` actual/comparison evidence. Final Gate is the sole Long-Task carrier. A blocker cannot be dismissed in-band, and scope removal requires revised Source/Contract authority. A design candidate or planned target cannot unlock fidelity implementation: selection must become real Context-reachable Source with one canonical adoption record and an adopted Authority Revision first. Do not introduce a second visual plan, value copy, acceptance document or lifecycle.

## Modularity Check

新实现、重构、重复逻辑、模块边界或影响面控制需要内部记录 `Modularity Check: none|required|exception`。

- 可用 `ty-context check-modularity --file <path> --limit 300` 做计划编辑审计，用 `make validate-code-modularity` 或 `ty-context check-modularity --touched --limit 300 --fail-on-warning` 做交付前硬审计；项目本地 Skill 的 limit 优先。
- 同时检查物理行数、单函数语句数、分支复杂度、导出数、状态转换和职责；压成一行不能规避。
- 风险点按 product surface、hook、model、adapter、component、service / facade 或 verification helper 等稳定边界判断，优先复用现有 extension point。
- 只实施高收益、低风险、语义稳定的抽象；不为一次性代码、不稳定语义或视觉整洁做抽象。
- `exception` 必须由 `<harnessRoot>/config.yaml` 中 lifecycle-complete waiver 授权，至少包含收窄的 `path`/`category`、`owner`、`introduced_at`、`reason`、`tracking_issue`、`expiry_condition`。交付说明不是机器豁免，已有债务不得继续接收新职责。

## 自动化机会

人工流程重复、确定、易漏步骤或顺序影响正确性时，评估 repo-local tool/script。脚本放在 owning module 的工具目录并有测试；可恢复入口、参数约束和适用边界写入 verification/deployment Context。不要把模块命令、provider id、artifact 路径或一次性结果写进本 Skill。

## Context 写入边界

- area/domain/subdomain：产品或包责任；contract：API/schema/event/workflow/interface；foundation：稳定概念；verification/deployment：可重复路径；implementation-index：导航；decision-rationale：会影响未来选择的稳定原因。
- 模块 Context 只保留 principles、design logic、rejected alternative/tradeoff 和长期约束；不编造 rationale，不复制实现摘要、命令输出、debug 过程、截图、日志、临时 JSON、raw payload、测试报告或 secrets。
- `Context Delta: none|required` 是唯一长期事实结果；`Architecture Deliberation` 是可见但 task-local 的流程检查点，`Architecture Context Hit`、`Decision Rationale Hit` 与 `Modularity Check` 仍只是内部路由问题。

## 输出边界

不默认创建 `.work_products/**`、tech plan、ADR、implementation doc、review/test/release 文档或 lifecycle phases。`Architecture Deliberation` 与 `Architecture Conformance` 通过工作更新和交付状态可见，不生成新的持久产物。用户明确要求独立开发/技术方案时可以临时生成；稳定结论仍提炼回 `project_context/**`。
