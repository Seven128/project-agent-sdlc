---
name: context_development_engineer
description: Use when the user explicitly asks for 开发工程师, 软件工程师, 研发工程师, 开发专家, 工程专家, 技术专家, 开发方案, 研发方案, 工程方案, 技术方案, 实现, 实现方案, 实施计划, 多开agent, subagent, software engineer, senior engineer, engineering expert, development plan, engineering plan, or technical implementation plan in a Minimal Context Harness project. Do not trigger for routine coding, bug fixes, small refactors, package/release work, or generic mentions of code, development, or engineering.
---

# Context Development Engineer

## Package-Managed Boundary

This generated Skill provides portable engineering judgment. Project-specific rules belong in `<harnessRoot>/skills/development_engineer/SKILL.md`; the repo-local Skill is more specific while durable conclusions still belong in `project_context/**`.

When an active `/long-task-workflow` binding exists, that Skill owns lifecycle, the selected verification workspace, Goal-owned implementation/delegation boundary and Final Gate. This Skill contributes architecture and implementation judgment only; it must not create a second plan, delegation scheduler/state or acceptance path.

## 目标

以开发工程师 / 技术专家视角完成实现判断，保护可维护架构，并把真正长期的工程事实压缩进可恢复的 Minimal Context，而不是增加流程文档。

## 默认工作方式

1. 读取 `project_context/global.md`、`project_context/architecture.md`、`project_context/context.toml`、default area root，并按 triggers/read policy 收集相关 on-demand Context 候选。
2. 在判断 `Context Delta` 前，用任务中明确的 area/module/API/Schema/state/security/verification/deployment 等少量高信号词，对 `project_context/**` 做一次 bounded text search；把命中的 Context 与 manifest 候选合并，只读取真正相关文件。搜索只补充语义判断，不创建索引、缓存或第二权威。
3. 确认目标、约束、成功标准、影响域、验证/部署路径和风险。能从代码或 Context 得到的事实不要重复询问。
4. Context 决定“应该是什么”；代码说明“现在是什么”；测试和运行证据证明行为。冲突是实现漂移、缺失工作或 stale Context，不能由代码静默重定义归属。
5. 第一处实现编辑前，完成并对用户可见地给出一次简洁、仓库事实绑定的 `Architecture Deliberation`。不输出私有思维链；输出结论及其 Context、模块/路径、symbol/extension point 和验证依据。风险只改变深度，不取消这个环节。
6. 根据架构考量决定唯一 `Context Delta: none|required`。影响 durable architecture boundary、module ownership、API / Schema / data contract、state / runtime semantics、dependency direction、verification / deployment semantics 或 durable rationale / tradeoff 时为 `required`，先更新 owning Context。不要创建 `plan.md`、Task Contract 文件或 Markdown 映射表。
7. 用 Agent 内部计划保持 goal、non-goals、owner、boundaries、implementation surfaces、risk 和 verification 清晰。默认流程不要求或验证固定 `plan.md`、matrix、verdict 或 evidence ledger。
8. 实现后先运行 project-owned verification，再在 `Contract Conformance` 中对当前候选快照执行 `Architecture Conformance`，随后单独做 Context drift check；报告实现、验证、架构符合性、Context 状态和 blockers。

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

## Capability-First Delivery Boundary

对外部来源中的产品/架构/实现/验收约束做内部分类：Context 已覆盖、需要更新、task-local、显式 out-of-scope 或需要真实用户决策。对 delivery / acceptance scope 使用 capability-first delivery boundary，区分：

- `system_capability_build`：形成可复用系统能力；
- `representative_sample_validation`：仅验证代表性样本；
- `full_population_operation`：权威范围内全量对象完成；
- `full_population_not_required`：AC 明确不要求全量。

sample provider / interface / page 证据不能替代 all-provider / all-interface / all-platform 或全量完成。来源要求全量而当前只能交付框架/样本时标记 `scope_conflict_requires_decision`；权威范围未收窄前不得声称完成。

## Product Surface

涉及 Web/移动/桌面/游戏 UI、CLI/TUI、表单、配置、输入、选择、搜索、筛选、调度、预算/配额/限流或状态反馈时：

- 对照已有 Product Surface / Surface Contract、页面职责和控件任务，而不是只确认字段已暴露；
- 对 material screen 同时读取 owning Screen/interaction Context（若存在），并用稳定 surface/control/target key 绑定真实 route/component、设计 target 和测试；产品方案只有粗粒度时，把缺失字段路由到 Context update、task-local Source 或 genuine decision，不能在代码里形成唯一隐藏事实源；
- 内部保持 Surface Contract Hit、main allows/forbids、drilldown ownership、long-task state requirement、implementation drift 和 verification；
- 缺失 durable surface responsibility 时设置 `Context Delta: required`，先用 `context_surface_contract` 或 owning Context 建立职责；
- 收尾用简短 `Contract Conformance` 说明命中的 Context、实现满足方式、未满足项和验证入口。

## Visual Delivery Implementation / 视觉交付实现

For material production UI, first confirm Design Authority readiness; then carry declared Context, `DESIGN.md` and Source intent into the real implementation without creating another workflow:

- when a selected implementation handoff exists, run `ty-context design-resource preflight <handoff.md>` before fidelity implementation. Open the strict residual block and every indexed exact/constraint resource. Its default unit is every complete observable design fact exposed by the acquired resources and supported inspector/oracle capability, not merely one Product Control: preserve addressable images, text, icons, component parts, smaller primitives, exact layout/style/content/state/behavior facts and their declared conditions. Keep one exact task-local accounting of fact/Source/method/blocker/target/condition sets; route every applicable item to the production owner, cold-start journey and a project-owned check whose failure remains attributable. Exact targets require full-target layout and pixel proof per condition; partial input remains a constraint. Missing facts/resource closure/applicability cells, unsupported evidence, unresolvable typed locators, incomplete/truncated implementation source, unresolved rows or stale digests fail closed. Provider retrieval and preflight prove input completeness/integrity only, not the implementation;
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

Without an active Long-Task, final-current-candidate Contract Conformance confirms every accounted fact/item is read, mapped, implemented, resolved, executed and passing. One project check may cover several methods only when each method and covered fact remains independently attributable on failure. A selected-target, fact inventory, implementation or declared check-input change stales closure. Any unread, unsupported, unresolved, unmapped, unimplemented, unexecuted, stale or indistinguishable applicable fact blocks a complete selected-design-conformance claim; report the checked scope and exact gaps. Do not persist the accounting as a matrix, Claim set, readiness state or Gate.

If an active Long-Task applies, do not run the preceding default closure. Express material visual expectations through its existing Requirement, full Control projection, Product `surface_bindings`, Assertion, Check, Stage, Technical Binding and external-confirmation mechanisms. Include the validated residual handoff in real `task.source_paths` and every declared immutable resource in target verification inputs; make target keys/conditions/files equal the handoff. Map covered Source Items into the root conformance Assertion and one independent Assertion per declared verification method; every method × condition evidence cell and current typed record must carry the exact handoff `fact_refs`, whose union equals the complete target fact set. Bind each handoff blocker with the same Source Items and methods. Bind every Control to a required production target and root-entry journey; bind selected exact/constraint targets to typed `design_conformance` actual/comparison evidence. Final Gate is the sole Long-Task carrier. A blocker cannot be dismissed in-band, and scope removal requires revised Source/Contract authority. A design candidate or planned target cannot unlock fidelity implementation: selection must become real Context-reachable Source with one canonical adoption record and an adopted Authority Revision first. Do not introduce a second visual plan, value copy, acceptance document or lifecycle.

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
