<!-- ty-source-item:start key=real-capability-closure-result kind=outcome_result -->
Long-Task 的真实能力与防劣化闭环必须完成四个不可拆散的结果：立即关闭 selected-design `exact_value + exact` 的已知假阳性；同步让关键哨兵和能力声明治理能够证明其宣称防御的错误候选确实被拒绝；明确选择并落实把普通模型编写 verifier 的错误纳入威胁模型的 Observer/TCB 路线 B；最后用确定性攻击/控制组、当前候选 Trust/full/package 验证、受控脱敏真实项目回放和只用于遵循率/ROI 的 fresh-agent 证据完成准入。P0 完成只证明关闭一个确定漏洞，在可信观察闭环和真实回放完成前不得恢复“Long-Task 已高水准抵御模型自然漂移并保证最终无漂移交付”的宽泛声明。
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=material-input-provenance kind=requirement -->
本 Source 是本 Goal 唯一的项目原生需求载体，完整归并三类输入：原方案附件 `pasted-text.txt`，其 SHA-256 为 `d9ffda69a25d2145f881114e3fc1969173f1560fb748a6ebb2874f73155888c8`；Codex 对该方案的仓库证据审计与修正；用户粘贴的 GPT Pro 最终裁决。附件中未被最终裁决推翻的要求继续有效；Codex 审计对绝对有效性、observer 文件年龄、challenge、通用 artifact 解析、重复设计 Fact 体系、generated carrier、Counterfactual、benchmark、v4 和能力措辞的修正优先；GPT Pro 明确批准的路线 B 和工作包 0–4 是最终用户 Authority。任何压缩或恢复都必须从本 Source、Contract、Active Authority 和 owning Context 重建，而不是依赖对话记忆。
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=declared-assurance-theorem kind=requirement -->
正式能力定理必须限制在完整、准确的声明范围、预期细粒度、机器索引的 Fact×条件×方法宇宙和已准入观察/TCB 内：任何仍存在于该宇宙且能由准入观察链发现的当前生产漂移，不得进入 `machine_accepted`；无法建立可信机器观察的 Fact 保持未完成或进入 External Confirmation。该定理不得扩张为自动发现未表达意图、证明任意 Oracle 语义正确，或抵御 TCB 外的一切模型与宿主行为。
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=assurance-causal-chain kind=requirement -->
完成链必须保持单向：完整准确 Source Authority → 无遗漏保义的细粒度 Fact 投影 → Fact×适用条件×所需方法闭包 → 从当前生产目标采集 actual → Harness 或其直接调用的冻结 comparator 重算比较 → 每个 Fact 可独立归因且通过因果敏感性验证 → 同一当前快照的唯一 Final Gate → `machine_accepted`。代码、项目 verifier、自报结果、历史 Receipt 或 prose 不得反向成为 expected Authority。
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=known-selected-design-false-acceptance kind=risk_fact fact=critical_user_path outcome=p0-exact-recomputation -->
当前已知 critical false-acceptance 位于 selected-design evidence runtime：正向 fixture 的 expected digest 为 `"a".repeat(64)`、actual digest 为 `"f".repeat(64)`，但 comparison `passed: true` 和 verdict `passed` 仍被接受；ground 与 symbolic 路径只校验 identity、authority、artifact 与提交字段的一致性，没有执行 `actual == expected` 或重算 comparison result identity。非 UI `semantic_fact` 路径已经执行 exact 摘要比较并重算 identity，因此缺陷必须 owner-local 修复，不能笼统重写整个 Evidence Kernel。
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=p0-positive-fixture-correction kind=requirement -->
默认 selected-design 正向 fixture 必须使 `actual_observation.value_sha256 == expected.sha256`；任何 mismatch 必须由测试显式构造并断言失败，禁止正向 fixture 继续内含实际不一致却自报通过的 Fact。
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=p0-v1-negative-control kind=requirement -->
V1 ground 必须具有独立负向控制：`actual != expected` 同时项目提交 `comparison.passed = true`、`verdict = passed` 时，Harness 必须在 selected-design comparison owner 处拒绝，错误 ground truth 不能由被测 verifier 生成，且失败需定位到 exact comparison/result identity 语义而非无关 schema。
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=p0-v2-negative-control kind=requirement -->
V2 symbolic 必须具有与 V1 同构的独立负向控制：规则/区域对应的 actual digest 与 frozen expected digest 不同而项目自报通过时必须被拒绝；V2 的规则、区域、certificate identity 仍按既有 symbolic owner 校验，不得因为修 exact 而弱化 V2 的 extensional closure。
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=shared-exact-comparison-owner kind=requirement -->
提取或复用一个共享 exact comparison primitive，输入至少包含 actual digest、expected digest、comparator、mode、parameters、tolerance 和 mask，输出由 Harness 计算的 comparison result 与 result identity。selected-design runtime 必须复用非 UI exact/result-identity 的既有语义或共享底层 primitive，消除两条路径的重复真相；项目提交的 `passed`/`verdict` 只能作为兼容冗余，与 Harness 结果不一致时 fail closed。
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=p0-owner-local-and-v3-compatible kind=requirement -->
P0 严格 owner-local：主要修改 `packages/ty-context/src/lib/long-task-evidence-capability-runtime.ts`、必要的共享 exact primitive、`tests/ty-context/long-task-delivery-fixtures.mjs`、现有 `tests/ty-context/long-task-semantic-drift-closure.test.mjs` 和现有哨兵 rationale。P0 不改变 schema，不为了局部比较修复发布 v4，不新建测试 registry、生命周期状态或第二套 Fact taxonomy。
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=p0-verification-boundary kind=acceptance -->
P0 当前候选必须依次通过 focused exact mismatch tests、`selected-design-fact-closure`/新强化的 `selected-design-exact-verdict-recomputation` critical sentinel、Long-Task Trust Boundary Gate、affected tests 和完整 package regression；还需证明旧行为接受冻结反例而修复候选拒绝它。P0 通过不得被表述为完整设计目的已恢复。
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=purpose-validity-floor-before-relative-antidegradation kind=requirement -->
机制开发准入顺序必须是：在明确威胁模型与 TCB 内的声明目的有效性下限 → 相对非劣化 → 有效候选不被误阻 → 总成本与 ROI。有效性下限至少要求冻结关键反例全部被拒绝、正确控制组全部通过、没有未关闭的已知 critical false acceptance、能力声明不超过证据支持范围；它不是“绝对正确”机器状态，也不得成为消费者 Long-Task 的新 Gate、状态、Authority 或 registry。
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=invalid-baseline-and-claim-downgrade kind=requirement -->
发现 current `main` 的 critical false-completion path 后，错误行为被标记为 defect，不属于需要保留的有效 Coverage；相关高水准能力声明立即降级，反例先进入固定威胁集，候选必须证明旧版接受且修复版拒绝。在回归、可信观察闭环和要求的真实回放完成前，不得以旧测试绿色、总体逻辑、文档禁止或项目 verifier 写错为由维持原声明。
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=coverage-defined-by-rejected-attack-surface kind=requirement -->
防劣化 Coverage 表示机制能拒绝的已知错误完成路径集合，不以测试文件数、Assertion 数、Fact 数、哨兵名称或 CI 绿色计数代替。相对比较只能使用已证明有效的 baseline：`Coverage_new` 不少于有效 baseline，false-negative resistance、false-positive behavior、Authority、freshness 与 fail-closed 不得变弱；选择一个允许方案不删除其他仍受支持的允许成员。
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=critical-sentinel-positive-negative-controls kind=requirement -->
每个高层 critical sentinel 至少绑定：一个正确候选通过；一个直接违反该能力的错误候选失败；独立于被测 verifier 的 ground truth；修改真实生产语义的 mutation；在声明 owner/Fact/Assertion 边界的预期定位；以及证明合法共享执行、容差、mask 和动态值不会被误阻的控制组。继续复用 `CRITICAL_TEST_SENTINELS`，不新增第二 registry。
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=incident-counterexample-first-rule kind=requirement -->
任何真实的明显需求违背、selected-design 漂移、历史证据冒充当前证据、verifier 自证或 Final Gate 近似错误接受，必须先形成能在旧版复现的最小负向 fixture，再修改实现；修复后证明旧版接受、当前版拒绝，且失败落在声明的语义 owner。开放 critical counterexample 自动降级对应能力声明。
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=sentinel-rationale-evidence-bounded kind=requirement -->
现有 critical sentinel rationale 和测试策略描述不得超过实际正负控制证明的范围。`selected-design-exact-verdict-recomputation` 应强化现有 semantic-drift-closure 测试和现有 registry 项，不必新建测试文件；如果测试只证明 exact digest 重算，就不得声称已证明任意 observer、任意 UI 格式或完整 live-session 真实性。
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=capability-claim-levels kind=requirement -->
正式开发与发布结论只使用四级能力表述：已设计；已实现；已建立已知反例保护；在明确 TCB 内已高水准实现设计目的。最高级必须同时具备明确支持范围/TCB、Source 与投影闭包、独立当前 actual、Harness 重算 verdict、关键攻击全拒绝、正确控制组通过、黑盒 Final Gate、至少一个真实或脱敏真实项目回放、无开放 critical counterexample 和机制 ROI 准入。GPT、Codex、人工 prose 审计、文档声明、测试数量或单次 benchmark 都不能提升等级。
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=route-b-project-owner-decision kind=technical_obligation aspect=architecture -->
项目 owner 本次明确选择 Observer/TCB 路线 B：普通模型编写 verifier 的错误属于威胁模型。路线 A——继续完全信任正确冻结 verifier/runner TCB 并将能力声明收窄为“阻止该 TCB 已正确观察的漂移”——保留为被拒绝的本次选择和兼容理解，不得作为无限期延期路线 B 的理由。路线 B 是恢复宽泛设计目的声明的必要闭环，必须在本 Goal 内设计、实现和验证。
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=observation-channel-authority kind=requirement -->
能关闭 machine Claim 的观察通道必须按能力和完整观察链准入，而非按文件年龄：package-owned/admitted observer；Harness 直接调用且依赖闭包冻结的 executable comparator/adapter；经明确冻结 TCB、当前 snapshot、生产可达性和因果控制证明的项目 observer。项目 verifier 不能仅凭自报 actual digest、comparison、passed 或 verdict 关闭 material/selected-design Claim；无法满足准入能力时必须 fail closed 或使用现有 External Confirmation。
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=expected-actual-comparison-verdict-ownership kind=technical_obligation aspect=architecture -->
expected 的值/定位摘要与比较 Authority 由 Source、canonical design resource 和 Contract 冻结；actual 由当前生产 target/session 的准入 observer 从声明 artifact/locator 提取；comparison 与 result identity 由 Harness-owned primitive 或 Harness 直接调用的冻结 comparator 计算；最终 verdict 由 Evidence Kernel/Final Gate 从重算结果得出。项目 runner 可提交原始观察、环境、artifact、locator 和兼容冗余字段，但不得同时拥有 expected、actual、comparison 和 authoritative verdict。
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=bounded-admitted-artifact-contract kind=requirement -->
首版 artifact contract 冻结为 package-owned `json-pointer-exact-v1`：只接受仓库/Check 准入根内、当前执行收集的 UTF-8 JSON，locator 只允许 RFC 6901 JSON Pointer（对象键和 canonical 非负数组下标；禁止 URI fragment、wildcard、filter 和 custom locator），值按现有 canonical JSON 语义规范化（对象键排序、数组顺序保留、JSON scalar/null 精确保留）后摘要；只支持 `exact_value + exact` 且 tolerance/mask 必须为空。单文件上限 1 MiB、嵌套深度 64、pointer 4096 字节/128 段、单个规范化值 256 KiB、每 Check 最多 256 个 observation artifact 且总计 16 MiB；路径必须 containment/no-follow 并拒绝 symlink/path escape，JSON 重复对象键和非 JSON 数值 fail closed。plain 值可在内存规范化但不新增 raw evidence；protected 值首版不从普通 JSON artifact machine-accept，只允许直接调用的冻结 adapter 或 External Confirmation。extractor/comparator 的 package identity/version/spec digest 必须冻结。首版不扩展成布局树、可访问性树、时间线、像素或任意 custom locator 的通用 UI 观察框架。
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=actual-artifact-reextraction kind=requirement -->
对于 `json-pointer-exact-v1`，Harness 必须从当前 artifact 与 locator 重新提取、规范化 actual 并计算 digest，不能只相信 runner 提交的 `value_sha256`；提交值、Harness 重算值和冻结 expected 任一不一致都 fail closed。该路径只准入 package-owned extractor，或由 Harness 直接调用且 digest/version/capability 冻结的 adapter；v3 没有可安全表达直接调用入口的任意项目 executable，因此普通 `named_external_tcb`/项目 runner 的自报 JSON 不能单独 machine-accept。无法由 package 解析的 custom locator、protected raw 值、live native/session、layout/a11y/motion/pixel/tolerance/mask 首版保持 External Confirmation。P0 的 digest equality 是第一步，不能被误称为任意 artifact authenticity。
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=challenge-is-freshness-only kind=requirement -->
Final Gate challenge/nonce 只用于拒绝直接复用旧截图、旧 session JSON 和旧 evidence payload；若未来准入 live-session，它必须绑定当前 invocation、candidate Git commit/tree、workspace snapshot、runner/build identity、target process/session、启动/采集时间和操作轨迹。首版 `json-pointer-exact-v1` 只接受 Final Gate 当前执行重新收集并绑定当前 snapshot/hash 的静态 JSON，不以新增 challenge 字段伪装 live-session 可信度；native/live 继续 External Confirmation。challenge 不是信任根，因为项目 runner 可以读取并回显新 challenge；主动伪造还必须由准入 observer、expected/actual 隔离、Harness comparator、生产可达性和 Counterfactual 共同防御。
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=generated-carrier-semantic-role kind=requirement -->
carrier 准入按语义角色而非路径年龄或一刀切路径名单判断：纯 evidence/report/status/comparison/Receipt/历史 session 产物不得充当生产 carrier；由构建生成且被真实产品 target 消费的 bundle、配置或编译产物可以作为生产 carrier；只被 verifier 读取的生成物不能证明生产可达性。不得笼统禁止所有 `expected_output_paths`，而要证明其是否进入产品 target 的真实依赖或运行时读取链。
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=expected-to-actual-self-proof-rejection kind=requirement -->
必须阻止 expected→actual 自证：actual artifact/locator 不得指向 Contract、handoff、expected resource 或 comparison artifact；actual 必须来自当前 target/session 或其真实消费的构建产物；同任务 verifier 不能独立关闭关键 Claim；生产语义 mutation 后 actual 必须按声明影响集发生变化。静态扫描 verifier 是否读取 expected 只能作为诊断，不能成为唯一安全边界。
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=production-reachability kind=requirement -->
敏感 Counterfactual 的 Binding 必须能证明至少一种生产可达性：位于 target root 的冻结静态依赖闭包；进入生产 bundle/build manifest；属于 target 运行时直接读取路径；或 mutation 被准入 observer 证明改变了当前目标 actual。只被 verifier 或报告生成器消费的路径不得用于关闭生产语义 Claim。
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=counterfactual-actual-change-and-impact-set kind=requirement -->
Counterfactual 不只检查 Assertion 从 true 变 false，还必须比较 baseline 与 mutated actual，保持 target liveness，并对声明的受影响 Fact 集逐项产生可归因失败。一个中心 token/carrier 可以合法影响多个相关 Fact，但每个 Fact 仍需独立 locator/result；影响集必须精确声明，允许真实 fan-out，禁止把“所有无关 Fact 都不变”写成不可能约束，也禁止一个 aggregate `/status` 关闭无直接因果关系的异质 Claim。
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=selected-design-existing-owner-preservation kind=requirement -->
本 Goal 不重建设计 Fact 类型体系。继续复用现有 Expected/Canonical/Handoff 集合闭包、Fact×method、property→required methods、exact-target layout/pixel、Anatomy、relation、条件空间、V1/V2 identity 和 Final Gate fact_results owners；攻击用例应定位“现有规则未执行”或“证据被错误信任”的位置。资源 preflight 只证明输入完整性，不能代替 production conformance；reference/constraint 的 production 投影和 Fact-method compatibility 继续由既有 owners 承担。
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=no-universal-ui-observer kind=non_goal -->
首版明确不建设任意 HTML/native/UI 的通用理解、布局、像素、无障碍、时间线或 custom locator 框架，不承诺证明任意 Oracle 语义真实性，也不通过多加字段制造伪 TCB。支持范围外的 target/Fact 必须诚实转为 External Confirmation，后续格式只能经独立机制准入与收益证据扩展。
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=v3-v4-and-migration-rule kind=requirement -->
P0 与首版 `json-pointer-exact-v1` 使用 v3 已有 artifact path/hash、JSON Pointer、Oracle/environment 和 comparison 字段，由 compiled/current-evidence 内部元数据补充 package adapter identity 与资源上限，因此不发布 v4；任意外部 executable 直接调用描述、可信 live-session handle/challenge/trace 或新 observation authority 若无法用 v3 保义表达，才发布 v4。若需要 v4，必须同步 schema、types/codec/decoder、managed source、Context、英文/中文 README、package README、examples、tests、source sync、tarball/consumer 验证和迁移说明；旧 Active Authority 不得自动迁移为通过，verifier/Authority identity 变化必须重新 Compile，旧 v3 selected-design 自报结果不能自动升级为通过。
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=attack-suite-ground-truth kind=requirement -->
确定性 attack suite 的 hidden ground truth 由测试 harness/package owner 持有，不由项目 verifier 生成。必须覆盖：A1 actual≠expected 但自报 pass；A2 expected 复制为 actual；A3 Anatomy 错而局部控件正确；A4 整体视觉模式错误；A5 主要行动层级错误；A6 大量异质 Assertion 共读 aggregate status；A7 mutation 指向纯 evidence carrier；A8 历史 native session；A9 H5/browser 代理冒充 native target；A10 旧截图与当前 tree 不一致；A11 task-authored verifier 是唯一 material Oracle；A12 asset_integrity 错误关闭 layout/a11y/motion。每个失败必须定位到对应 owner，而非无关 fixture/schema。
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=valid-control-suite kind=requirement -->
正确控制组必须证明：合法 tolerance 与动态 mask；一次 render/artifact 被多个 Fact 使用但 locator/result 独立；中心 token 合法影响多个细粒度 Fact；正确 scoped reference+constraint；准入的当前 native session；能力完整且冻结的 observer；正确 exact 候选；非 UI Long-Task 现有行为；普通 Workflow Contract 零新增运行成本；以及无可信机器观察时 External Confirmation 不被误当失败或 machine acceptance。
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=black-box-final-gate-lifecycle kind=acceptance -->
黑盒验证必须走真实 Long-Task 生命周期并在同一当前候选上完成 Preflight/Compile、candidate、Final Gate，证明错误候选不能获得 `machine_accepted`、正确候选可以通过、开放外部确认保持 pending、protected inputs/candidate/snapshot 变化会失效，并且失败原因落到具体 Fact/method/observer/production-carrier 边界。历史 Progress、Receipt、targeted pass 或 prose inspection 不是该证据。
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=starward-sanitized-replay kind=requirement -->
恢复“在明确 TCB 内已高水准实现设计目的”前必须完成一个受控脱敏的 Starward 派生真实项目回放，至少包含地图页、点位详情、点位夜空、“我的”页、selected design、错误与正确生产实现、自证 verifier、历史 native session 和 H5 代理路径；hidden ground truth 由 harness 持有。Starward 回放不是 P0 的前置条件，但属于本 Goal 最终能力声明恢复的前置条件。
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=fresh-agent-benchmark-boundary kind=requirement -->
fresh-agent 配对实验复用现有冻结任务、隐藏 probe、独立配对和 2/3→必要时 3/5 的治理，只衡量 Agent 遵循率、首次发现时间、返工、Contract/Compile/Final Gate 成本、target 采集次数、token、总时长、Authority 体积、迁移与维护成本。它不得证明安全定理、关键假阳性为零或替代 deterministic attack suite、黑盒 Final Gate 与真实回放；若增设 track，应沿用现有 benchmark owner 而非第二框架。
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=roi-admission-order kind=requirement -->
机制 ROI 按字典序准入：先满足目的有效性下限和 known attack rejection；再保证 valid control false blocking 不增加；再证明相对 coverage/fail-closed/Authority 不劣化；最后比较总时间、token、存储、维护、迁移和用户等待成本。性能或成本结论必须声明 workload、baseline/budget、环境、comparator/tolerance 和项目自有测量；不得用静态 shape 或一次 anecdotal run 代替。
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=early-real-entry-feedback kind=requirement -->
material UI + selected design 在第一个有用的真实生产入口可运行且早期定位收益高于运行成本时，建议用最终同类 observer 做一次页面 Anatomy、信息/行动层级、整体视觉模式和区域关系的早期并排检查；它不新增 Gate、状态、Receipt 或完成前提，早期 artifact 仅供诊断，最终候选必须重新采集并跑完整 cold-start journey。
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=no-new-lifecycle-authority-registry kind=technical_obligation aspect=architecture -->
所有修复复用现有 Source、Contract、Compile、Evidence Kernel、Counterfactual、Final Gate、External Confirmation、Trust Boundary Gate 和 critical sentinel registry；不得新增 Long-Task 阶段、Gate、Authority、scheduler、Receipt、机制矩阵、运行时 registry 或持久状态。逻辑 Fact 细粒度不等于每个 Fact 启动一次进程：允许共享 Raw Execution/artifact，但不允许共享不可区分的 total Boolean/verdict。
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=owner-dependency-lifecycle-boundary kind=technical_obligation aspect=architecture -->
selected-design comparison owner 是 `long-task-evidence-capability-runtime.ts`，共享 exact/result identity 语义来自 `long-task-semantic-fact-evidence.ts` 或新提取的同层 primitive，设计方法 taxonomy 保持在 `design-resource-fact-policy.ts` 与 `design-resource-fact-property-methods.ts`，Final Gate 保持唯一 acceptance carrier。依赖只能从 Source/Context 经 Contract、observer、comparison 流向 Final Gate；comparison primitive 不依赖项目 verifier 的 verdict，observer adapter 不拥有 expected；失败必须显式、资源与临时 session 必须有界清理，重试不能把旧 artifact 变成当前证据。
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=build-reuse-buy-allowed-set kind=technical_obligation aspect=architecture -->
Build/Reuse/Buy 允许集合包括：复用现有 semantic-fact exact/result-identity owner；复用现有 design policy/property-method owners；用标准库做有界 package-owned extractor/comparator；使用已安装或成熟且 license/platform/size 兼容的依赖；使用 digest/version/capability 冻结的 executable adapter；以及对未准入观察有意不抽象并保留 External Confirmation。选择前必须枚举本次可行成员；禁止重复 owner-held rule、第二 source of truth、扩张式通用 parser、无依据重依赖、nonce-only 信任、自报 Boolean、错误依赖方向和为了相似语义强制抽象。
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=technical-debt-and-future-change kind=technical_obligation aspect=architecture -->
已触及技术债是 non-UI 与 selected-design validation 的 exact/result-identity 路径分叉，处置为在不改变现有外部 schema 的前提下共享 primitive 并用两类回归锁定；不得留下新的第三路径。未来新增 comparator、locator、artifact schema、symbolic version 或 native adapter，必须通过共享 capability 接口、明确 TCB、攻击/控制组和协议准入，不得复制 validator 或把新格式默认为可信。
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=compatibility-security-resource-boundaries kind=technical_obligation aspect=architecture -->
安全与可靠性边界包括 fail-closed parsing、路径 containment、symlink 防逃逸、大小/深度/时间/内存上限、敏感观察的 digest-only/redaction、冻结 executable 与依赖闭包 identity、challenge replay protection、当前 candidate/session 绑定和临时进程/artifact 清理。兼容性必须保持普通 default workflow、非 UI Long-Task、现有 V1 默认与 V2 opt-in、合法 tolerance/mask 和 External Confirmation；任何 public/protocol 变化都必须有显式 migration/rollout/rollback 或不可逆边界说明。
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=context-and-public-authority-update kind=requirement -->
总体 `Context Delta: required`。必须在代码前更新 `PROJECT_SPEC.md` 和 owning Context，记录路线 B 的项目 owner 决策、旧/新定理边界、observer capability/TCB、目的有效性下限、critical counterexample/claim downgrade、owner/dependency/debt/compatibility/验证；实现索引与验证 Context 必须指向真实代码与检查。若改变公共用户行为或协议，还要同步 managed source、Skills、英文/中文公共文档、package/readme/examples 和 distribution parity；P0 单独行为修复不需要虚构新的 durable owner。
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=verification-sequence-and-current-candidate kind=acceptance -->
验证顺序为：确定性攻击/正确控制组；focused 与 changed-path affected checks；Long-Task Trust Boundary Gate；complete tests/package source parity/tarball/consumer/release regression；受控脱敏真实回放；仅用于遵循率和 ROI 的 fresh-agent 配对；Context drift；最后由本 Goal 的唯一 Long-Task Final Gate 在同一干净 current candidate 上重编译并重跑全部声明 Checks。任何 Source、Context、Contract、verifier、实现或控制输入变化后必须重跑受影响检查，历史绿色不得继承。
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=final-hard-acceptance kind=acceptance -->
最终硬验收要求：UI exact mismatch 绝不通过；expected-as-actual、自报 verdict、aggregate status、纯 evidence carrier、历史 session/截图/build、browser/H5 代理 native、task-authored 唯一 material Oracle 均不能虚假 machine-accept；material design Fact 无遗漏、错误方法或静默 N/A；当前 target/snapshot/session 与 production reachability 可证；Counterfactual 改变真实 carrier 和对应 actual；合法 tolerance/mask/共享执行/fan-out 正常；目的有效性先于相对不劣化；无开放 critical counterexample；非适用任务不增加流程；适用任务 ROI 为正；没有新增阶段、Authority、Gate、scheduler、registry 或持久状态。
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=approved-final-capability-wording kind=requirement -->
只有全部硬验收成立后，正式能力表述才可恢复为：Long-Task Workflow 在完整、准确的声明范围、预期细粒度和已准入观察/TCB 内，允许模型在中间理解、实现和修复中自然发生漂移、遗漏或幻觉；但 Source→Contract 的声明内语义遗漏、准入 observer 能发现的当前生产差异、历史或代理证据、自证式 actual、错误 comparison/verdict 及未证明边界，不能进入最终 `machine_accepted`。对于无法建立可信机器观察的事实，工作流保持未完成或 External Confirmation。该表述不声称覆盖未表达意图或 TCB 外任意行为。
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=critical-scope-escape-risk kind=risk_fact fact=critical_user_path outcome=observer-tcb-closure -->
主要范围逃逸风险是把路线 B 演变为任意 UI/任意 native/任意 Oracle 的通用观察框架，或趁机重建设计 Fact taxonomy、生命周期实体和协议版本。准入首版必须以有限格式、明确 capability、现有 owners 和 External Confirmation 为边界；超出边界的扩展需要新的 Source/Context 决策与独立 ROI 证据。
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=critical-self-attestation-risk kind=risk_fact fact=weak_observability outcome=observer-tcb-closure -->
主要 TCB 风险是同一模型同时编写实现、verifier、actual、comparison 和 verdict，或 runner 回显 challenge 后继续自证。任何允许 project self-attestation 单独关闭 material Claim、允许 actual 从 expected/report 读取、或只校验字段内部一致性的实现都属于 forbidden shortcut，并阻止 handoff。
<!-- ty-source-item:end -->

<!-- ty-source-item:start key=critical-claim-inflation-risk kind=risk_fact fact=critical_user_path outcome=assurance-governance -->
主要治理风险是以文档、绿测、哨兵名称、Agent benchmark 或 P0 局部成功重新宣称完整高水准能力。能力等级必须由机器攻击/控制组、明确 TCB、黑盒 Final Gate、真实回放和开放反例状态共同约束；任何超出证据范围的 rationale 或发布结论都视为防劣化失败。
<!-- ty-source-item:end -->

```yaml semantic-fact-manifest-v1
{
  "schema_version": "semantic-fact-manifest-v1",
  "key": "long-task-real-capability-facts",
  "scope": {
    "outcome_refs": [
      "p0-exact-recomputation",
      "assurance-governance",
      "observer-tcb-closure",
      "proof-and-roi"
    ],
    "source_item_refs": [
      "real-capability-closure-result",
      "material-input-provenance",
      "declared-assurance-theorem",
      "assurance-causal-chain",
      "known-selected-design-false-acceptance",
      "p0-positive-fixture-correction",
      "p0-v1-negative-control",
      "p0-v2-negative-control",
      "shared-exact-comparison-owner",
      "p0-owner-local-and-v3-compatible",
      "p0-verification-boundary",
      "purpose-validity-floor-before-relative-antidegradation",
      "invalid-baseline-and-claim-downgrade",
      "coverage-defined-by-rejected-attack-surface",
      "critical-sentinel-positive-negative-controls",
      "incident-counterexample-first-rule",
      "sentinel-rationale-evidence-bounded",
      "capability-claim-levels",
      "route-b-project-owner-decision",
      "observation-channel-authority",
      "expected-actual-comparison-verdict-ownership",
      "bounded-admitted-artifact-contract",
      "actual-artifact-reextraction",
      "challenge-is-freshness-only",
      "generated-carrier-semantic-role",
      "expected-to-actual-self-proof-rejection",
      "production-reachability",
      "counterfactual-actual-change-and-impact-set",
      "selected-design-existing-owner-preservation",
      "no-universal-ui-observer",
      "v3-v4-and-migration-rule",
      "attack-suite-ground-truth",
      "valid-control-suite",
      "black-box-final-gate-lifecycle",
      "starward-sanitized-replay",
      "fresh-agent-benchmark-boundary",
      "roi-admission-order",
      "early-real-entry-feedback",
      "no-new-lifecycle-authority-registry",
      "owner-dependency-lifecycle-boundary",
      "build-reuse-buy-allowed-set",
      "technical-debt-and-future-change",
      "compatibility-security-resource-boundaries",
      "context-and-public-authority-update",
      "verification-sequence-and-current-candidate",
      "final-hard-acceptance",
      "approved-final-capability-wording",
      "critical-scope-escape-risk",
      "critical-self-attestation-risk",
      "critical-claim-inflation-risk"
    ],
    "exclusions": []
  },
  "inspector": {
    "trust": "named_external_tcb",
    "identity": "long-task-real-capability-source-inspector",
    "version": "1.0.0",
    "implementation_sha256": null,
    "capabilities": [
      "source_inventory",
      "context_inventory",
      "input_classification",
      "standard_catalog",
      "custom_domain_discovery",
      "subject_inventory",
      "relation_inventory",
      "population_inventory",
      "condition_axis_inventory",
      "condition_combination_inventory",
      "property_inventory",
      "fact_cell_inventory",
      "proof_obligation_inventory"
    ],
    "traversal": "complete_enumeration",
    "dynamic_discovery": "fully_enumerated",
    "census": [
      {
        "key": "input.source.real-capability-closure-result",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/0"
        },
        "identity_sha256": "9276465a28a64dd2c38e64df0511f49541fbafd654e0ff8f6b70af10a3b657e0",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.real-capability-closure-result"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.source.material-input-provenance",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/1"
        },
        "identity_sha256": "9f7b7d53d2c604e504438cc98f04477967895b2ec47b60e9d5ee76367be03ebd",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.material-input-provenance"
        ],
        "basis_refs": [
          "material-input-provenance"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.source.declared-assurance-theorem",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/2"
        },
        "identity_sha256": "1e6867bf9a66072c1b485b121a03766eeaf6ec3dac8c2198e12a50ae7154dd31",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.declared-assurance-theorem"
        ],
        "basis_refs": [
          "declared-assurance-theorem"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.source.assurance-causal-chain",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/3"
        },
        "identity_sha256": "5f058dac5725680395a74e02800dba492aeb0f15c227f2b93e970a4fcf1310a0",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.assurance-causal-chain"
        ],
        "basis_refs": [
          "assurance-causal-chain"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.source.known-selected-design-false-acceptance",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/4"
        },
        "identity_sha256": "e4085a3cd013d6e5e2a67313c6d52199f9add844324d53e4fe251eebac0349c5",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.known-selected-design-false-acceptance"
        ],
        "basis_refs": [
          "known-selected-design-false-acceptance"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.source.p0-positive-fixture-correction",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/5"
        },
        "identity_sha256": "009232ed9b11ce4e9657e6ee037ff12b2b44a928c64d0c207bd76d17e294342e",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.p0-positive-fixture-correction"
        ],
        "basis_refs": [
          "p0-positive-fixture-correction"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.source.p0-v1-negative-control",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/6"
        },
        "identity_sha256": "49012308114bc84aa973bdce291974ddc0695efb77bbb47b199e96aef95c238c",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.p0-v1-negative-control"
        ],
        "basis_refs": [
          "p0-v1-negative-control"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.source.p0-v2-negative-control",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/7"
        },
        "identity_sha256": "b484c05e0bad2b270eb6dacb589b248a1cd0493cd2586705d5c63471f1681275",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.p0-v2-negative-control"
        ],
        "basis_refs": [
          "p0-v2-negative-control"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.source.shared-exact-comparison-owner",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/8"
        },
        "identity_sha256": "db9d50a99128cb064316166f9feff27ab7aef11931d153fd487d5170428a0e39",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.shared-exact-comparison-owner"
        ],
        "basis_refs": [
          "shared-exact-comparison-owner"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.source.p0-owner-local-and-v3-compatible",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/9"
        },
        "identity_sha256": "9f89cb2425c7395eca3448b8f9b55c64d20cb8f40f4965c4d0fead49af319cb7",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.p0-owner-local-and-v3-compatible"
        ],
        "basis_refs": [
          "p0-owner-local-and-v3-compatible"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.source.p0-verification-boundary",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/10"
        },
        "identity_sha256": "0244a6c175ace5335d22d561471d4fc8df90f872d9aa938f1416b6230debb3b4",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.p0-verification-boundary"
        ],
        "basis_refs": [
          "p0-verification-boundary"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.source.purpose-validity-floor-before-relative-antidegradation",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/11"
        },
        "identity_sha256": "a44cf70c7ca99091a9864d3db616253296e367cdfd6e6bb140ce30c3b3769479",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.purpose-validity-floor-before-relative-antidegradation"
        ],
        "basis_refs": [
          "purpose-validity-floor-before-relative-antidegradation"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.source.invalid-baseline-and-claim-downgrade",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/12"
        },
        "identity_sha256": "2f745c67fb8c8c300383fb4ff2fa4e06bb158ba521f97e08b8bb5fb749b7f3dc",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.invalid-baseline-and-claim-downgrade"
        ],
        "basis_refs": [
          "invalid-baseline-and-claim-downgrade"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.source.coverage-defined-by-rejected-attack-surface",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/13"
        },
        "identity_sha256": "6b9cbe8ba71d9e49a5a3cb1b77dcabf41d18990af24e8115c84979912620978c",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.coverage-defined-by-rejected-attack-surface"
        ],
        "basis_refs": [
          "coverage-defined-by-rejected-attack-surface"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.source.critical-sentinel-positive-negative-controls",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/14"
        },
        "identity_sha256": "675c5a63b286860b3fef9cc4616c45e5e6f4b21d83a5d596508b6278868d905e",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.critical-sentinel-positive-negative-controls"
        ],
        "basis_refs": [
          "critical-sentinel-positive-negative-controls"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.source.incident-counterexample-first-rule",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/15"
        },
        "identity_sha256": "d1bb00ba2d70c31d64818b1cc6a9171e3904f3999b2d483959aaaa2908aba4ff",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.incident-counterexample-first-rule"
        ],
        "basis_refs": [
          "incident-counterexample-first-rule"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.source.sentinel-rationale-evidence-bounded",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/16"
        },
        "identity_sha256": "cf574c0f26403cad9721b4819955b39ecebacf4e63b4acb95ea9d0b4881e16e9",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.sentinel-rationale-evidence-bounded"
        ],
        "basis_refs": [
          "sentinel-rationale-evidence-bounded"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.source.capability-claim-levels",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/17"
        },
        "identity_sha256": "dd286cd441863bdd50a75fe1b1545738622982c4cd8b51f3b75db8268ecd5502",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.capability-claim-levels"
        ],
        "basis_refs": [
          "capability-claim-levels"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.source.route-b-project-owner-decision",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/18"
        },
        "identity_sha256": "2cc6743ca8ae088d40779237620025f40c285d5bbbb0352cbf3bd2273256456a",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.route-b-project-owner-decision"
        ],
        "basis_refs": [
          "route-b-project-owner-decision"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.source.observation-channel-authority",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/19"
        },
        "identity_sha256": "7a29f9e3e4af41a947aa8f9669c4db1bb37a8e567f77af2190f31b537a6748db",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.observation-channel-authority"
        ],
        "basis_refs": [
          "observation-channel-authority"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.source.expected-actual-comparison-verdict-ownership",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/20"
        },
        "identity_sha256": "22dbe616f0630ae9a32d52ff03ee7ebc83545f7c88cac6c1f62b3dabdbafee0b",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.expected-actual-comparison-verdict-ownership"
        ],
        "basis_refs": [
          "expected-actual-comparison-verdict-ownership"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.source.bounded-admitted-artifact-contract",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/21"
        },
        "identity_sha256": "ca07b85d5247fd3f0572afcfc1f837f8aa543fb4b3b5bf06830e6f95ff324374",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.bounded-admitted-artifact-contract"
        ],
        "basis_refs": [
          "bounded-admitted-artifact-contract"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.source.actual-artifact-reextraction",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/22"
        },
        "identity_sha256": "532b64b125b976951c8c73c90a3913eb599dd1421aea6a879f892fc4c453689c",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.actual-artifact-reextraction"
        ],
        "basis_refs": [
          "actual-artifact-reextraction"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.source.challenge-is-freshness-only",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/23"
        },
        "identity_sha256": "995db7445bfaec178e5a0aa62e1a46715a14da6366b4f7c899f70f1c991b8d2b",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.challenge-is-freshness-only"
        ],
        "basis_refs": [
          "challenge-is-freshness-only"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.source.generated-carrier-semantic-role",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/24"
        },
        "identity_sha256": "8a9fac7c3f3ca462aeb09ffb77ed2f2aa221125e0dddbc14930f282a0db3fd52",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.generated-carrier-semantic-role"
        ],
        "basis_refs": [
          "generated-carrier-semantic-role"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.source.expected-to-actual-self-proof-rejection",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/25"
        },
        "identity_sha256": "ff28a28595090249c8da08eedccda395398002fe898032d58931e614eb01c3db",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.expected-to-actual-self-proof-rejection"
        ],
        "basis_refs": [
          "expected-to-actual-self-proof-rejection"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.source.production-reachability",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/26"
        },
        "identity_sha256": "9c64ccfa1948e174a56a4883ada3cc12776d10319983fc49386a4fa6f61da94a",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.production-reachability"
        ],
        "basis_refs": [
          "production-reachability"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.source.counterfactual-actual-change-and-impact-set",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/27"
        },
        "identity_sha256": "0c8d3837fefc43c4e17693d9586289e533ccdcd938b91fccc41a47bc0c2d696f",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.counterfactual-actual-change-and-impact-set"
        ],
        "basis_refs": [
          "counterfactual-actual-change-and-impact-set"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.source.selected-design-existing-owner-preservation",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/28"
        },
        "identity_sha256": "e754ca5daf71e107e269c61e2f0ca173d32731de19b6bcb26e5ca5c04f8714e2",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.selected-design-existing-owner-preservation"
        ],
        "basis_refs": [
          "selected-design-existing-owner-preservation"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.source.no-universal-ui-observer",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/29"
        },
        "identity_sha256": "21689bc101d5e9537b3a7c39083fcb3b5fa0ce37590144ec0cf19094cb0a5860",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.no-universal-ui-observer"
        ],
        "basis_refs": [
          "no-universal-ui-observer"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.source.v3-v4-and-migration-rule",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/30"
        },
        "identity_sha256": "d3cd8e7a80dfe65400ee999e56c7210e897566d3a7ae9a9c89b09036ff3335e4",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.v3-v4-and-migration-rule"
        ],
        "basis_refs": [
          "v3-v4-and-migration-rule"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.source.attack-suite-ground-truth",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/31"
        },
        "identity_sha256": "465479fcfe7d7fafc83ce06e7111a283382b2faf73824484809b86d443c98b8e",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.attack-suite-ground-truth"
        ],
        "basis_refs": [
          "attack-suite-ground-truth"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.source.valid-control-suite",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/32"
        },
        "identity_sha256": "84e17d88432326a71b89cee1ada73017b98b05062943bc5cb26d772bb4625702",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.valid-control-suite"
        ],
        "basis_refs": [
          "valid-control-suite"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.source.black-box-final-gate-lifecycle",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/33"
        },
        "identity_sha256": "b4681db06d52577a3af90097d4ea672cd580bac725d82fdfcab6d5aa55c31bfb",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.black-box-final-gate-lifecycle"
        ],
        "basis_refs": [
          "black-box-final-gate-lifecycle"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.source.starward-sanitized-replay",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/34"
        },
        "identity_sha256": "050ab83b79856ae5becca75d6a0189bbd2897bdc032b34b17defcb46534cefd6",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.starward-sanitized-replay"
        ],
        "basis_refs": [
          "starward-sanitized-replay"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.source.fresh-agent-benchmark-boundary",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/35"
        },
        "identity_sha256": "1241204b2bb88639cf29b36e09d82d1891ea7ed993c2a5518ce7b106b9aaf6c6",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.fresh-agent-benchmark-boundary"
        ],
        "basis_refs": [
          "fresh-agent-benchmark-boundary"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.source.roi-admission-order",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/36"
        },
        "identity_sha256": "c7ab2512af95a38cefe8b6759c09d4db5e69de64a3ed39135ada3aa37e47f106",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.roi-admission-order"
        ],
        "basis_refs": [
          "roi-admission-order"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.source.early-real-entry-feedback",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/37"
        },
        "identity_sha256": "c9e0b6704a59915effe7ba3817c4a182dccdffc774b0ac89b22c1ce7d264a6f4",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.early-real-entry-feedback"
        ],
        "basis_refs": [
          "early-real-entry-feedback"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.source.no-new-lifecycle-authority-registry",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/38"
        },
        "identity_sha256": "b397d02a10fb4b4e7c1a9c1c1d1b27a80d7aef9f216a3a2659d8e009735ee1ee",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.no-new-lifecycle-authority-registry"
        ],
        "basis_refs": [
          "no-new-lifecycle-authority-registry"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.source.owner-dependency-lifecycle-boundary",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/39"
        },
        "identity_sha256": "1a5cdab5b4dc353260706a8472ae1b7954ef47599d03184747a1b544eec553a3",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.owner-dependency-lifecycle-boundary"
        ],
        "basis_refs": [
          "owner-dependency-lifecycle-boundary"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.source.build-reuse-buy-allowed-set",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/40"
        },
        "identity_sha256": "8fac9fa970487a2fc2848463e3ed24e5631d7e1bfabfdb33baaf72a43801f37b",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.build-reuse-buy-allowed-set"
        ],
        "basis_refs": [
          "build-reuse-buy-allowed-set"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.source.technical-debt-and-future-change",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/41"
        },
        "identity_sha256": "43c632303b019d0a3c0c3a4bdf2171b196ed4f85527dba2b16cbe86e9652fb3f",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.technical-debt-and-future-change"
        ],
        "basis_refs": [
          "technical-debt-and-future-change"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.source.compatibility-security-resource-boundaries",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/42"
        },
        "identity_sha256": "78fb29a137a99c2b1a593a187c4d7ed56b0bfcb95041b38fc7be2268159c25a8",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.compatibility-security-resource-boundaries"
        ],
        "basis_refs": [
          "compatibility-security-resource-boundaries"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.source.context-and-public-authority-update",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/43"
        },
        "identity_sha256": "5e1fa1e3ac1de3faa1025bce9824bda3990f68418a7dae91892411a469360987",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.context-and-public-authority-update"
        ],
        "basis_refs": [
          "context-and-public-authority-update"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.source.verification-sequence-and-current-candidate",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/44"
        },
        "identity_sha256": "8d75a2314c8053a01ea138eeee44c0e88edcc28ae0aa67570ada4cf90b6a8f6b",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.verification-sequence-and-current-candidate"
        ],
        "basis_refs": [
          "verification-sequence-and-current-candidate"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.source.final-hard-acceptance",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/45"
        },
        "identity_sha256": "5ecf5aee4b3e201954b9d8c03ab16d67cc6c5e254a1cb4d2c1953a825c8867fe",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.final-hard-acceptance"
        ],
        "basis_refs": [
          "final-hard-acceptance"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.source.approved-final-capability-wording",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/46"
        },
        "identity_sha256": "e63c5da2b737917e96af4bf9fb4146099fa515b44db924c5f55dc9c2968e59db",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.approved-final-capability-wording"
        ],
        "basis_refs": [
          "approved-final-capability-wording"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.source.critical-scope-escape-risk",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/47"
        },
        "identity_sha256": "0969fa3c12fa1121a7c2b031bd18b1c5fd1bc47f63d0bdf7eff4f5af842fae7c",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.critical-scope-escape-risk"
        ],
        "basis_refs": [
          "critical-scope-escape-risk"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.source.critical-self-attestation-risk",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/48"
        },
        "identity_sha256": "0ab5ba0129d2f568540fc6ef0f3a6947bb14a8166801bcbcde5e12c5e13fdf7a",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.critical-self-attestation-risk"
        ],
        "basis_refs": [
          "critical-self-attestation-risk"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.source.critical-claim-inflation-risk",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/49"
        },
        "identity_sha256": "3ea58afc5c1141783e1a68a1eb8af7e9819cde67bbc17fffc2e7036650fd0495",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.critical-claim-inflation-risk"
        ],
        "basis_refs": [
          "critical-claim-inflation-risk"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.context.project-context-architecture-md",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/50"
        },
        "identity_sha256": "872e13bb00f787e43e37d16d5f7aec9c679bfcfb87c33fbe2af29d5b5bd0d439",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.material-input-provenance"
        ],
        "basis_refs": [
          "material-input-provenance"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.context.project-context-areas-delivery-benchmark-md",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/51"
        },
        "identity_sha256": "33362dd77c33b7b93d56543615dcb947c0e29ce731607a79103500fad579b56a",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.fresh-agent-benchmark-boundary"
        ],
        "basis_refs": [
          "fresh-agent-benchmark-boundary"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.context.project-context-areas-harness-package-md",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/52"
        },
        "identity_sha256": "6b4b1bb14d03176cb9b832a4233b55d4bc81ca8715b6ad8f2978a1598fd1790d",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.material-input-provenance"
        ],
        "basis_refs": [
          "material-input-provenance"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.context.project-context-areas-harness-package-contracts-design-resource-authoring-md",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/53"
        },
        "identity_sha256": "c386607f7267cdbc35b7bca8eabe9b82454b6f95fe6a048d2d882be2dacafbd5",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.material-input-provenance"
        ],
        "basis_refs": [
          "material-input-provenance"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.context.project-context-areas-harness-package-contracts-design-resource-handoff-md",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/54"
        },
        "identity_sha256": "d8c2975e57559d698acb2caf6f3fbae37d817830382bddfc5ed53c250e9ffbc1",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.selected-design-existing-owner-preservation"
        ],
        "basis_refs": [
          "selected-design-existing-owner-preservation"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.context.project-context-areas-harness-package-contracts-package-managed-surfaces-md",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/55"
        },
        "identity_sha256": "3474a6f9f37d102510ea66c03f3312cfd067d8aa9fdc61a5bf1e0e263d9f1088",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.context-and-public-authority-update"
        ],
        "basis_refs": [
          "context-and-public-authority-update"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.context.project-context-areas-harness-package-contracts-temporary-content-governance-md",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/56"
        },
        "identity_sha256": "2329ee48564489986ee1d2297ee4669ed7d938d51e1a4d45e93bbdfe91a899a5",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.material-input-provenance"
        ],
        "basis_refs": [
          "material-input-provenance"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.context.project-context-areas-harness-package-contracts-workflow-contract-md",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/57"
        },
        "identity_sha256": "4fdaeade2167ea17a954dc2cecfb42fdee58ddf73e9d7955d365ed56458cd533",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.no-new-lifecycle-authority-registry"
        ],
        "basis_refs": [
          "no-new-lifecycle-authority-registry"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.context.project-context-areas-harness-package-decision-rationale-architecture-quality-md",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/58"
        },
        "identity_sha256": "6e097862618422c06a00843d1979cf528d01ceaf4816cedc1ef29666c4b2f063",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.build-reuse-buy-allowed-set"
        ],
        "basis_refs": [
          "build-reuse-buy-allowed-set"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.context.project-context-areas-harness-package-decision-rationale-long-task-workflow-md",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/59"
        },
        "identity_sha256": "1496821a8cf6a4a48fe6656f475826a92a37143d086ed9f8b74f8397396250e2",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.route-b-project-owner-decision"
        ],
        "basis_refs": [
          "route-b-project-owner-decision"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.context.project-context-areas-harness-package-decision-rationale-minimal-context-md",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/60"
        },
        "identity_sha256": "6aac798fec574905d3bfa03d095f3b80e6f11385fba5b8f828ba0e7bfb764dea",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.material-input-provenance"
        ],
        "basis_refs": [
          "material-input-provenance"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.context.project-context-areas-harness-package-foundation-context-model-md",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/61"
        },
        "identity_sha256": "6debfddb2271c3e5b401559842880f1be687dc130447afc9a6e7acd0fdcf848f",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.material-input-provenance"
        ],
        "basis_refs": [
          "material-input-provenance"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.context.project-context-areas-harness-package-implementation-index-md",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/62"
        },
        "identity_sha256": "5cae5260c61834443801a94755ce54cfb1e1b34c7e3d9b97a17e57b07f62eb04",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.owner-dependency-lifecycle-boundary"
        ],
        "basis_refs": [
          "owner-dependency-lifecycle-boundary"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.context.project-context-areas-harness-package-verification-md",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/63"
        },
        "identity_sha256": "ad62b44a758d09320b745d0f8ef38d7a94fb9ae3d121d7d29533ec723527a790",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.verification-sequence-and-current-candidate"
        ],
        "basis_refs": [
          "verification-sequence-and-current-candidate"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.context.project-context-context-toml",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/64"
        },
        "identity_sha256": "aa8d9ea06bb5d6d11d55faed8484a3776fa456f38a19b6ef2fa4eaa8f4927695",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.material-input-provenance"
        ],
        "basis_refs": [
          "material-input-provenance"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "input.context.project-context-global-md",
        "kind": "input",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/inputs/65"
        },
        "identity_sha256": "8ca4430373ea9d7fd15a963515763420c6aebfd35a721cee7130cb09d0b50a0e",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.material-input-provenance"
        ],
        "basis_refs": [
          "material-input-provenance"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "family.standard-goal-scope-glossary",
        "kind": "family",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/family_dispositions/0"
        },
        "identity_sha256": "08512b644f8adb48deae9e79dc7d3e2889eb7917fd614960b1212d49cff4b5d4",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "material-input-provenance"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "family.standard-actor-role-tenant-entitlement",
        "kind": "family",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/family_dispositions/1"
        },
        "identity_sha256": "11c6282923ed3f7201e08d5db84007dcb61ad5baa4cab823ae31ffc328974e03",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "material-input-provenance"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "family.standard-business-rule-calculation",
        "kind": "family",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/family_dispositions/2"
        },
        "identity_sha256": "2852c2ad82ab7b6a661e79327c63ba4839093d0e31472e4fc12e4b4318b84797",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "material-input-provenance"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "family.standard-data-model",
        "kind": "family",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/family_dispositions/3"
        },
        "identity_sha256": "1dcea97971463ef064d3d4eabaaa14cbd2a7d8e889d26d069d99862fc8d1a80b",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "material-input-provenance"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "family.standard-operation-workflow",
        "kind": "family",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/family_dispositions/4"
        },
        "identity_sha256": "ffeb056749fdfb07cab72c2f3f0cfbebd9d5edb34d2b2c0b56fef2f2ca1473a7",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "material-input-provenance"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "family.standard-state-machine",
        "kind": "family",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/family_dispositions/5"
        },
        "identity_sha256": "945af5aade1df8f05ebc7526bf803f3a05557473af965259dddfeb06fc9a3e74",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "material-input-provenance"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "family.standard-temporal-scheduling",
        "kind": "family",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/family_dispositions/6"
        },
        "identity_sha256": "99d3fa85aba5b27d5c4a3a90771df19632bcc76765f58d93182fba13c98fcfe6",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "material-input-provenance"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "family.standard-input-validation",
        "kind": "family",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/family_dispositions/7"
        },
        "identity_sha256": "d6c7e16d3b14a0904ad3c166504a8fa853e7ce62df42eec9bd8584611399bb4e",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "material-input-provenance"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "family.standard-output-error",
        "kind": "family",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/family_dispositions/8"
        },
        "identity_sha256": "c3282f957c04fe0151f1195dcb855b89a3880185da3489cd91a7f2e67a952448",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "material-input-provenance"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "family.standard-api-protocol",
        "kind": "family",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/family_dispositions/9"
        },
        "identity_sha256": "57ecdd7bc7c9bb48e87e5f84a2735229c0a3beb74597235b891c730ed69fe468",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "material-input-provenance"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "family.standard-event-message-job",
        "kind": "family",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/family_dispositions/10"
        },
        "identity_sha256": "fc2dffe2761acc5fa3134bb3bfdb599a0c5a0aed2662a7d5f547e3cf6f5cdc0f",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "material-input-provenance"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "family.standard-persistence-cache-search",
        "kind": "family",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/family_dispositions/11"
        },
        "identity_sha256": "ad2048dfa988bb3b95697b553449d692febcae2c55427e016b53f8e185523af2",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "material-input-provenance"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "family.standard-transaction-consistency-concurrency-idempotency",
        "kind": "family",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/family_dispositions/12"
        },
        "identity_sha256": "7d5d4577791ae8ec896bc8c87eda94755954b742567d19d4c27ecf1222810abf",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "material-input-provenance"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "family.standard-fault-degradation-recovery",
        "kind": "family",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/family_dispositions/13"
        },
        "identity_sha256": "ad335bb8338e32faee1af2e596bd8658485c194640cc7a268c911b80ffc03ee7",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "material-input-provenance"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "family.standard-backup-restore-disaster-recovery",
        "kind": "family",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/family_dispositions/14"
        },
        "identity_sha256": "47295e1d2dd8cd32bd656ab48be61a7cea5c1647cb73454f0dea458e3814ff25",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "material-input-provenance"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "family.standard-configuration-feature-flag-secret",
        "kind": "family",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/family_dispositions/15"
        },
        "identity_sha256": "1bb366ad8666bc698673df09483aa1826eaf14263356bcc46c29faa9a3e1f7ab",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "material-input-provenance"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "family.standard-compatibility-migration-rollout",
        "kind": "family",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/family_dispositions/16"
        },
        "identity_sha256": "ea764b13bd5487cdb9f6a874f4d6d19a9d2b98d3f74405ebc17afc716580791c",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "material-input-provenance"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "family.standard-performance-capacity-cost",
        "kind": "family",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/family_dispositions/17"
        },
        "identity_sha256": "198518f400c0b8142ba1896b66d3508c3ae86bc26e2eb742b650afe374aff47d",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "material-input-provenance"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "family.standard-reliability-slo",
        "kind": "family",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/family_dispositions/18"
        },
        "identity_sha256": "dab21b17993fe0c6fd303e496c2224e72535e7931ff7afccb8ed15717f11125e",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "material-input-provenance"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "family.standard-security",
        "kind": "family",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/family_dispositions/19"
        },
        "identity_sha256": "94a29ea8707d6d5a699ef12ece6e2be87d76b413f600385ac8f9f056c5dffe3f",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "material-input-provenance"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "family.standard-privacy",
        "kind": "family",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/family_dispositions/20"
        },
        "identity_sha256": "4e84ea64eeaf98e9041d83e3c3a48dcb0edd59cb20c5cd610e800f1dd921a970",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "material-input-provenance"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "family.standard-safety-compliance",
        "kind": "family",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/family_dispositions/21"
        },
        "identity_sha256": "a5c0aad58b43f323d5d68d02d10e99f26f03db5158c7eea6f63480206a1be654",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "material-input-provenance"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "family.standard-observability",
        "kind": "family",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/family_dispositions/22"
        },
        "identity_sha256": "ee73f88dca80f1933fff1dfbf08f8d5f22310d7ae8bbc7c034fcfb0fe29eef30",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "material-input-provenance"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "family.standard-deployment-topology",
        "kind": "family",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/family_dispositions/23"
        },
        "identity_sha256": "15acfe798e5763ec8f91b8c0df0491b1a98723de1c52b60aec891bc1fe31090e",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "material-input-provenance"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "family.standard-external-integration",
        "kind": "family",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/family_dispositions/24"
        },
        "identity_sha256": "9b69641f00e0a285be38db90e3bd6fa462204685ef0e341c3f765a98a5e245ea",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "material-input-provenance"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "family.standard-notification-file-media",
        "kind": "family",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/family_dispositions/25"
        },
        "identity_sha256": "7b59f29c81f172d59e0daf33a92045a68e7e87197d242a7ac010d2ea72d54c6e",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "material-input-provenance"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "family.standard-localization",
        "kind": "family",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/family_dispositions/26"
        },
        "identity_sha256": "46772563deb8c7cead459d887e6a006197a1b266ba010a00e6ccaab1dc162a74",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "material-input-provenance"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "family.standard-commercial-billing",
        "kind": "family",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/family_dispositions/27"
        },
        "identity_sha256": "ce01ea71965038994d7e94b7c7ec8ec6af8ba375991ff7da2d8306b8f94e5018",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "material-input-provenance"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "family.standard-hardware-sensor",
        "kind": "family",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/family_dispositions/28"
        },
        "identity_sha256": "8a8535adbc6a2ebcdeb6c6ee4fe55f66fc6d87d51450cbb09a51b699ff777f33",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "material-input-provenance"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "family.standard-ai-ml",
        "kind": "family",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/family_dispositions/29"
        },
        "identity_sha256": "223adeabd4ceaa58ca8b6473d57b2a928cd568bddc1325b6f3e717c50cd6218e",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "material-input-provenance"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "family.standard-architecture-ownership",
        "kind": "family",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/family_dispositions/30"
        },
        "identity_sha256": "e0e01c2400a1b5660d95b3f9511ec274d411a73bbd32ed58faed3893727b1aae",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "material-input-provenance"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "family.custom-long-task-real-capability",
        "kind": "family",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/family_dispositions/31"
        },
        "identity_sha256": "d9f73f4e7417a650ac1fcc37c7ef372b7d41e53a9f7594c373c3dbb19caa25db",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.actual-artifact-reextraction",
          "fact.requirement.approved-final-capability-wording",
          "fact.requirement.assurance-causal-chain",
          "fact.requirement.attack-suite-ground-truth",
          "fact.requirement.black-box-final-gate-lifecycle",
          "fact.requirement.bounded-admitted-artifact-contract",
          "fact.requirement.build-reuse-buy-allowed-set",
          "fact.requirement.capability-claim-levels",
          "fact.requirement.challenge-is-freshness-only",
          "fact.requirement.compatibility-security-resource-boundaries",
          "fact.requirement.context-and-public-authority-update",
          "fact.requirement.counterfactual-actual-change-and-impact-set",
          "fact.requirement.coverage-defined-by-rejected-attack-surface",
          "fact.requirement.critical-claim-inflation-risk",
          "fact.requirement.critical-scope-escape-risk",
          "fact.requirement.critical-self-attestation-risk",
          "fact.requirement.critical-sentinel-positive-negative-controls",
          "fact.requirement.declared-assurance-theorem",
          "fact.requirement.early-real-entry-feedback",
          "fact.requirement.expected-actual-comparison-verdict-ownership",
          "fact.requirement.expected-to-actual-self-proof-rejection",
          "fact.requirement.final-hard-acceptance",
          "fact.requirement.fresh-agent-benchmark-boundary",
          "fact.requirement.generated-carrier-semantic-role",
          "fact.requirement.incident-counterexample-first-rule",
          "fact.requirement.invalid-baseline-and-claim-downgrade",
          "fact.requirement.known-selected-design-false-acceptance",
          "fact.requirement.material-input-provenance",
          "fact.requirement.no-new-lifecycle-authority-registry",
          "fact.requirement.no-universal-ui-observer",
          "fact.requirement.observation-channel-authority",
          "fact.requirement.owner-dependency-lifecycle-boundary",
          "fact.requirement.p0-owner-local-and-v3-compatible",
          "fact.requirement.p0-positive-fixture-correction",
          "fact.requirement.p0-v1-negative-control",
          "fact.requirement.p0-v2-negative-control",
          "fact.requirement.p0-verification-boundary",
          "fact.requirement.production-reachability",
          "fact.requirement.purpose-validity-floor-before-relative-antidegradation",
          "fact.requirement.real-capability-closure-result",
          "fact.requirement.roi-admission-order",
          "fact.requirement.route-b-project-owner-decision",
          "fact.requirement.selected-design-existing-owner-preservation",
          "fact.requirement.sentinel-rationale-evidence-bounded",
          "fact.requirement.shared-exact-comparison-owner",
          "fact.requirement.starward-sanitized-replay",
          "fact.requirement.technical-debt-and-future-change",
          "fact.requirement.v3-v4-and-migration-rule",
          "fact.requirement.valid-control-suite",
          "fact.requirement.verification-sequence-and-current-candidate"
        ],
        "basis_refs": [
          "real-capability-closure-result",
          "material-input-provenance"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "subject.requirement.real-capability-closure-result",
        "kind": "subject",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/subjects/0"
        },
        "identity_sha256": "6a246a6ea53d10b160104d4175e049ec9094278a3d0973ad1ae2c038bf9da278",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.real-capability-closure-result"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "subject.requirement.material-input-provenance",
        "kind": "subject",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/subjects/1"
        },
        "identity_sha256": "e5865b724a2b1287cc2c02a87fa913c31af84d49161edc26d36d9f1e8a47f9a1",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.material-input-provenance"
        ],
        "basis_refs": [
          "material-input-provenance"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "subject.requirement.declared-assurance-theorem",
        "kind": "subject",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/subjects/2"
        },
        "identity_sha256": "a6ad71ecce21826f9e5bbf370a816a5dedac2fe4d0b4291b2b10895d6835f639",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.declared-assurance-theorem"
        ],
        "basis_refs": [
          "declared-assurance-theorem"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "subject.requirement.assurance-causal-chain",
        "kind": "subject",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/subjects/3"
        },
        "identity_sha256": "2d2f4907a831777e078f6abf9b025b011f017afa9c7864a93fcf7f84ff7db569",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.assurance-causal-chain"
        ],
        "basis_refs": [
          "assurance-causal-chain"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "subject.requirement.known-selected-design-false-acceptance",
        "kind": "subject",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/subjects/4"
        },
        "identity_sha256": "663b514ee59d1e834f832d9373ef66c2a151ad98ba85d7973c58d77e30a186c6",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.known-selected-design-false-acceptance"
        ],
        "basis_refs": [
          "known-selected-design-false-acceptance"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "subject.requirement.p0-positive-fixture-correction",
        "kind": "subject",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/subjects/5"
        },
        "identity_sha256": "02eb3ddbd159b012a9ba94a81b9b1549c110feb8d6906d045d00cd99d25363ab",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.p0-positive-fixture-correction"
        ],
        "basis_refs": [
          "p0-positive-fixture-correction"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "subject.requirement.p0-v1-negative-control",
        "kind": "subject",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/subjects/6"
        },
        "identity_sha256": "f17fd266aad70cdcf37b5eef0f4615c0de229a3e9f80319afa830814c8b9e4fd",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.p0-v1-negative-control"
        ],
        "basis_refs": [
          "p0-v1-negative-control"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "subject.requirement.p0-v2-negative-control",
        "kind": "subject",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/subjects/7"
        },
        "identity_sha256": "78ad77658b0007e3771d3105e1286b444cc6c97f56e5a2084e96ceeaef88168d",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.p0-v2-negative-control"
        ],
        "basis_refs": [
          "p0-v2-negative-control"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "subject.requirement.shared-exact-comparison-owner",
        "kind": "subject",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/subjects/8"
        },
        "identity_sha256": "00cd9701e9f9a065c14976b1c00bc862e6d381c3d03faa6dc61c2f7d5b8ee587",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.shared-exact-comparison-owner"
        ],
        "basis_refs": [
          "shared-exact-comparison-owner"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "subject.requirement.p0-owner-local-and-v3-compatible",
        "kind": "subject",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/subjects/9"
        },
        "identity_sha256": "d26d15b955d3e515cac0c07a0b57e4324812348c2d9a210aa06e33664b5317e1",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.p0-owner-local-and-v3-compatible"
        ],
        "basis_refs": [
          "p0-owner-local-and-v3-compatible"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "subject.requirement.p0-verification-boundary",
        "kind": "subject",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/subjects/10"
        },
        "identity_sha256": "7d0c0c77ba2e88b83a9abd1f8c80cccdd74aea46d328d79fd1449ebccbe55df8",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.p0-verification-boundary"
        ],
        "basis_refs": [
          "p0-verification-boundary"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "subject.requirement.purpose-validity-floor-before-relative-antidegradation",
        "kind": "subject",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/subjects/11"
        },
        "identity_sha256": "d6f7259d1d159ef1bc83777125a292fab8b78d958ab4a3e9966e7e824298c4ab",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.purpose-validity-floor-before-relative-antidegradation"
        ],
        "basis_refs": [
          "purpose-validity-floor-before-relative-antidegradation"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "subject.requirement.invalid-baseline-and-claim-downgrade",
        "kind": "subject",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/subjects/12"
        },
        "identity_sha256": "9a79dbf8880c350b83e37debb8160a9f3c28d7a6cbb7c1bcef190ba32e5497f8",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.invalid-baseline-and-claim-downgrade"
        ],
        "basis_refs": [
          "invalid-baseline-and-claim-downgrade"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "subject.requirement.coverage-defined-by-rejected-attack-surface",
        "kind": "subject",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/subjects/13"
        },
        "identity_sha256": "de382936aebdd33b07d34198e227648287ca41e0ccde6f32708c77eae062e5a4",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.coverage-defined-by-rejected-attack-surface"
        ],
        "basis_refs": [
          "coverage-defined-by-rejected-attack-surface"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "subject.requirement.critical-sentinel-positive-negative-controls",
        "kind": "subject",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/subjects/14"
        },
        "identity_sha256": "aed94b3c091d654e981b6ee517c84d0b5523930e006eb7549030db838bcf7806",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.critical-sentinel-positive-negative-controls"
        ],
        "basis_refs": [
          "critical-sentinel-positive-negative-controls"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "subject.requirement.incident-counterexample-first-rule",
        "kind": "subject",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/subjects/15"
        },
        "identity_sha256": "0c736dc8648a38ea036fb4399aa322fb2a701d2c2a3a2533b3460fcc7994490b",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.incident-counterexample-first-rule"
        ],
        "basis_refs": [
          "incident-counterexample-first-rule"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "subject.requirement.sentinel-rationale-evidence-bounded",
        "kind": "subject",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/subjects/16"
        },
        "identity_sha256": "ed87e7cbe3f8330d0a4f7d14e6bfdcbc2296cb141023b1afcc824963a9b7d3ef",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.sentinel-rationale-evidence-bounded"
        ],
        "basis_refs": [
          "sentinel-rationale-evidence-bounded"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "subject.requirement.capability-claim-levels",
        "kind": "subject",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/subjects/17"
        },
        "identity_sha256": "8c7a3f9063a344905dc5ad0f6d5c95e12ab06f2c8c5833d082598c0993ab4135",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.capability-claim-levels"
        ],
        "basis_refs": [
          "capability-claim-levels"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "subject.requirement.route-b-project-owner-decision",
        "kind": "subject",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/subjects/18"
        },
        "identity_sha256": "75d92d3345ae2efa6f92cdae5297357a2caf078491e32657cedb5440e73676f8",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.route-b-project-owner-decision"
        ],
        "basis_refs": [
          "route-b-project-owner-decision"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "subject.requirement.observation-channel-authority",
        "kind": "subject",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/subjects/19"
        },
        "identity_sha256": "37ff7f34a9f7a1b21ea0976467502f65a339c7b538e456ca27cf4c020b67265b",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.observation-channel-authority"
        ],
        "basis_refs": [
          "observation-channel-authority"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "subject.requirement.expected-actual-comparison-verdict-ownership",
        "kind": "subject",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/subjects/20"
        },
        "identity_sha256": "360006118f6bfdb26d9209f25cd696f07c14a68596a9fd8359314972bfc5af55",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.expected-actual-comparison-verdict-ownership"
        ],
        "basis_refs": [
          "expected-actual-comparison-verdict-ownership"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "subject.requirement.bounded-admitted-artifact-contract",
        "kind": "subject",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/subjects/21"
        },
        "identity_sha256": "5c8cd122f9cdf3e80c74d8087bb1e6c382f6f98e29a0c13914dfdd6685d66bed",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.bounded-admitted-artifact-contract"
        ],
        "basis_refs": [
          "bounded-admitted-artifact-contract"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "subject.requirement.actual-artifact-reextraction",
        "kind": "subject",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/subjects/22"
        },
        "identity_sha256": "a74fd1a3673958f478225f30972a044d89af9f7b7ca6b325626acdd154218d92",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.actual-artifact-reextraction"
        ],
        "basis_refs": [
          "actual-artifact-reextraction"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "subject.requirement.challenge-is-freshness-only",
        "kind": "subject",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/subjects/23"
        },
        "identity_sha256": "b460a90f292364914a2c27939408f406912c53ed1c0a11a1ef0976dc6c77d63e",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.challenge-is-freshness-only"
        ],
        "basis_refs": [
          "challenge-is-freshness-only"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "subject.requirement.generated-carrier-semantic-role",
        "kind": "subject",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/subjects/24"
        },
        "identity_sha256": "a979f6e76bdf7bc0297818c67567bcdb47289bbc69927486c9975349bc625911",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.generated-carrier-semantic-role"
        ],
        "basis_refs": [
          "generated-carrier-semantic-role"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "subject.requirement.expected-to-actual-self-proof-rejection",
        "kind": "subject",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/subjects/25"
        },
        "identity_sha256": "2787a060410ca06783cfbd795d4d6c1c340a7671a6749691c92258efc8a642a7",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.expected-to-actual-self-proof-rejection"
        ],
        "basis_refs": [
          "expected-to-actual-self-proof-rejection"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "subject.requirement.production-reachability",
        "kind": "subject",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/subjects/26"
        },
        "identity_sha256": "3f7fa97d7e142b36b8e4ad638d0a23a18c3789544b138a962983b91be1f38209",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.production-reachability"
        ],
        "basis_refs": [
          "production-reachability"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "subject.requirement.counterfactual-actual-change-and-impact-set",
        "kind": "subject",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/subjects/27"
        },
        "identity_sha256": "01872ba6cb3ca052d7f400c71a896b366598b9521a2fd103747d52bbcc9340f1",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.counterfactual-actual-change-and-impact-set"
        ],
        "basis_refs": [
          "counterfactual-actual-change-and-impact-set"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "subject.requirement.selected-design-existing-owner-preservation",
        "kind": "subject",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/subjects/28"
        },
        "identity_sha256": "13aa578e477e76fb65caaabb9d2b1147bdb30c4f58d6e24ed1eef3a26516210a",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.selected-design-existing-owner-preservation"
        ],
        "basis_refs": [
          "selected-design-existing-owner-preservation"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "subject.requirement.no-universal-ui-observer",
        "kind": "subject",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/subjects/29"
        },
        "identity_sha256": "16882f021dcd8bfdb91d50aa6b7236bcae5529bb9f44d79f72a31186e20eb014",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.no-universal-ui-observer"
        ],
        "basis_refs": [
          "no-universal-ui-observer"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "subject.requirement.v3-v4-and-migration-rule",
        "kind": "subject",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/subjects/30"
        },
        "identity_sha256": "2fc57ee0d11bd70411865bf548388d79cba81769a9e1047e3be77c25e2d3d8e6",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.v3-v4-and-migration-rule"
        ],
        "basis_refs": [
          "v3-v4-and-migration-rule"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "subject.requirement.attack-suite-ground-truth",
        "kind": "subject",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/subjects/31"
        },
        "identity_sha256": "c71e5f32739ebc4ec360b6ba092d8c88fba78870f25d69d0434dc807bce613e2",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.attack-suite-ground-truth"
        ],
        "basis_refs": [
          "attack-suite-ground-truth"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "subject.requirement.valid-control-suite",
        "kind": "subject",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/subjects/32"
        },
        "identity_sha256": "6898103a23440bd91fb100238d9a6072270ddca159cd96a8bc485623d5db2c64",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.valid-control-suite"
        ],
        "basis_refs": [
          "valid-control-suite"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "subject.requirement.black-box-final-gate-lifecycle",
        "kind": "subject",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/subjects/33"
        },
        "identity_sha256": "4bec8c4769d85b965b2540414a79ac2ec97c7739f7e64875c1ebb82c53cc4ec3",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.black-box-final-gate-lifecycle"
        ],
        "basis_refs": [
          "black-box-final-gate-lifecycle"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "subject.requirement.starward-sanitized-replay",
        "kind": "subject",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/subjects/34"
        },
        "identity_sha256": "b4271f04e308ab298ab3f253ea19b3e59234acb92fb0d6a91ccea4262e7f003c",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.starward-sanitized-replay"
        ],
        "basis_refs": [
          "starward-sanitized-replay"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "subject.requirement.fresh-agent-benchmark-boundary",
        "kind": "subject",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/subjects/35"
        },
        "identity_sha256": "8fcf86c78f31ec487f13bf692ef5895dfa301d920325a6dc63ad0f5945e42c01",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.fresh-agent-benchmark-boundary"
        ],
        "basis_refs": [
          "fresh-agent-benchmark-boundary"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "subject.requirement.roi-admission-order",
        "kind": "subject",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/subjects/36"
        },
        "identity_sha256": "555dceff65817500cfc4f11bbdc57a2f61534b709fc6f6fdc093ae4339a0ac69",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.roi-admission-order"
        ],
        "basis_refs": [
          "roi-admission-order"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "subject.requirement.early-real-entry-feedback",
        "kind": "subject",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/subjects/37"
        },
        "identity_sha256": "0b382bdaa8ccf49e5cc946a5741395a4949069a8d40784ef68a6ceb12e94c97a",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.early-real-entry-feedback"
        ],
        "basis_refs": [
          "early-real-entry-feedback"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "subject.requirement.no-new-lifecycle-authority-registry",
        "kind": "subject",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/subjects/38"
        },
        "identity_sha256": "899f468c38456cdfb9a034fc916b835c0f6d367e76afe03ce5be6ee105e72d8b",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.no-new-lifecycle-authority-registry"
        ],
        "basis_refs": [
          "no-new-lifecycle-authority-registry"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "subject.requirement.owner-dependency-lifecycle-boundary",
        "kind": "subject",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/subjects/39"
        },
        "identity_sha256": "a8512755a9d524a74b1b0e17e85db7e4460f63e5031ad41c8adc9ff2a6e00595",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.owner-dependency-lifecycle-boundary"
        ],
        "basis_refs": [
          "owner-dependency-lifecycle-boundary"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "subject.requirement.build-reuse-buy-allowed-set",
        "kind": "subject",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/subjects/40"
        },
        "identity_sha256": "0ef383213d0c615b28ab4e7f7407bf50f18d67d5459eac73e2bfea9ee18833bb",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.build-reuse-buy-allowed-set"
        ],
        "basis_refs": [
          "build-reuse-buy-allowed-set"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "subject.requirement.technical-debt-and-future-change",
        "kind": "subject",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/subjects/41"
        },
        "identity_sha256": "eba48f3e0a24523a507047c51df7d490aad6583a70c4c8b8a9eda80ed14a6604",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.technical-debt-and-future-change"
        ],
        "basis_refs": [
          "technical-debt-and-future-change"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "subject.requirement.compatibility-security-resource-boundaries",
        "kind": "subject",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/subjects/42"
        },
        "identity_sha256": "2cc05df46a40196512eb9d57a31cf99e35bf497503176b5644199f6f1bff0de9",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.compatibility-security-resource-boundaries"
        ],
        "basis_refs": [
          "compatibility-security-resource-boundaries"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "subject.requirement.context-and-public-authority-update",
        "kind": "subject",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/subjects/43"
        },
        "identity_sha256": "9ff84466774d252f35608817961781db581d80e12868bca8573f9fcbfd519e9d",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.context-and-public-authority-update"
        ],
        "basis_refs": [
          "context-and-public-authority-update"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "subject.requirement.verification-sequence-and-current-candidate",
        "kind": "subject",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/subjects/44"
        },
        "identity_sha256": "3e00cb46884780e9bae19e3f27ffc203fbbb6443f9b42eaaf57d200245e9002a",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.verification-sequence-and-current-candidate"
        ],
        "basis_refs": [
          "verification-sequence-and-current-candidate"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "subject.requirement.final-hard-acceptance",
        "kind": "subject",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/subjects/45"
        },
        "identity_sha256": "32b98fdfd0aa523fd6d3be3de6546c559e5b02c5873af9383dba3ac25235bbff",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.final-hard-acceptance"
        ],
        "basis_refs": [
          "final-hard-acceptance"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "subject.requirement.approved-final-capability-wording",
        "kind": "subject",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/subjects/46"
        },
        "identity_sha256": "d7c4fa519c5f0f77dd9eb9be50c62c6a3ef14c4e9fd760614c79a731f2586c6b",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.approved-final-capability-wording"
        ],
        "basis_refs": [
          "approved-final-capability-wording"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "subject.requirement.critical-scope-escape-risk",
        "kind": "subject",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/subjects/47"
        },
        "identity_sha256": "07df765df6ceb3006207e49835c1ff77d5d80a0876a5823add7e92f0b3743b0a",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.critical-scope-escape-risk"
        ],
        "basis_refs": [
          "critical-scope-escape-risk"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "subject.requirement.critical-self-attestation-risk",
        "kind": "subject",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/subjects/48"
        },
        "identity_sha256": "c351085bd8e8b2232ca7c556083461cb6b10ea8ec4bd2d6f8399911794879080",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.critical-self-attestation-risk"
        ],
        "basis_refs": [
          "critical-self-attestation-risk"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "subject.requirement.critical-claim-inflation-risk",
        "kind": "subject",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/subjects/49"
        },
        "identity_sha256": "03c03cbe67d4f7bfb343ef6afafaa751143d0600476e626885b5ba375d40c68e",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.critical-claim-inflation-risk"
        ],
        "basis_refs": [
          "critical-claim-inflation-risk"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "axis.actor",
        "kind": "axis",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/axis_dispositions/0"
        },
        "identity_sha256": "7a11b5ce680d706c4e436440e0cea2bbe094a07b4ea1fcff0451bec74af35c54",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "declared-assurance-theorem"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "axis.role",
        "kind": "axis",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/axis_dispositions/1"
        },
        "identity_sha256": "1bde529abbef34b9d73548083073f91539af37d1bdd12bbf20a94b1dd03d671e",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "declared-assurance-theorem"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "axis.tenant",
        "kind": "axis",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/axis_dispositions/2"
        },
        "identity_sha256": "161c39545a628ec7f963ed3f676bea8feea57391cc1d52a81ce8682d82655e89",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "declared-assurance-theorem"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "axis.organization",
        "kind": "axis",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/axis_dispositions/3"
        },
        "identity_sha256": "9b6a9f15a55f54b60e7ad3ee784b2eb77265a8a796968c29420262eb2712bfcb",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "declared-assurance-theorem"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "axis.jurisdiction",
        "kind": "axis",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/axis_dispositions/4"
        },
        "identity_sha256": "7ce962c1b25b770a6cfb21d1fd16f73e12e0b9527759bb2d6f00d611577ba7a2",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "declared-assurance-theorem"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "axis.residency",
        "kind": "axis",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/axis_dispositions/5"
        },
        "identity_sha256": "61c5cdc49bddd93f3a7a5b0b7f0ea9fc1a5f3dc6095f95865bcaad736d13290d",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "declared-assurance-theorem"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "axis.environment",
        "kind": "axis",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/axis_dispositions/6"
        },
        "identity_sha256": "b61748805aac496838ec9a342433be3ce9efff821b87bd15e8224fbbc9f29c48",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "declared-assurance-theorem"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "axis.region",
        "kind": "axis",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/axis_dispositions/7"
        },
        "identity_sha256": "82601594556f9e1393d22906407a27d1ed0f9f0a555c64e5bcfc202baf75f9d5",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "declared-assurance-theorem"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "axis.zone",
        "kind": "axis",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/axis_dispositions/8"
        },
        "identity_sha256": "b14315935cc419edeb7a7b2d041d9231e7c5a1fb0834ac6dbaba4d7dd6dc5698",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "declared-assurance-theorem"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "axis.platform",
        "kind": "axis",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/axis_dispositions/9"
        },
        "identity_sha256": "5c06bb27e7ab5cb936c23d5452d26c7395b7cf277454cadc5a8e81442a402a99",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "declared-assurance-theorem"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "axis.device",
        "kind": "axis",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/axis_dispositions/10"
        },
        "identity_sha256": "2f4fa257542ac89bf0f3efff03bf3b39a712e0c4c22b062879232904cffdfd70",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "declared-assurance-theorem"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "axis.client-version",
        "kind": "axis",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/axis_dispositions/11"
        },
        "identity_sha256": "4c6048a97f216b4f0df2c742ac8afc80c900fac4a7405a183fbd82db14aa6350",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "declared-assurance-theorem"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "axis.api-version",
        "kind": "axis",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/axis_dispositions/12"
        },
        "identity_sha256": "f2383e8932dcd4c31e4bb2ec2b67147913c0a6c56d2cf690bd9c722de7f6350f",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "declared-assurance-theorem"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "axis.schema-version",
        "kind": "axis",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/axis_dispositions/13"
        },
        "identity_sha256": "ad0f5e08d973c9ed587e0315bb26d35c111e37f844b115d7b0b2245a4b547648",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "declared-assurance-theorem"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "axis.runtime-version",
        "kind": "axis",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/axis_dispositions/14"
        },
        "identity_sha256": "46eca37be549de8f79b8a6acd86dd2ca386656fdda3d2a97f1f9beaa2effce52",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "declared-assurance-theorem"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "axis.feature",
        "kind": "axis",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/axis_dispositions/15"
        },
        "identity_sha256": "3f36f99939cb1b9afa43d4f2b5509e123d781adcc69a30fa11c5dc0843a85ab1",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "declared-assurance-theorem"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "axis.cohort",
        "kind": "axis",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/axis_dispositions/16"
        },
        "identity_sha256": "4bd1ed704a13b2dd61e57ce76c734ada31ff432d306a2b0d02ccf27198f1affb",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "declared-assurance-theorem"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "axis.configuration",
        "kind": "axis",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/axis_dispositions/17"
        },
        "identity_sha256": "f15c9534637bbbef01645cbadc8b66bb2f46d0b2d173e97e88508eb61c39cbe0",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "declared-assurance-theorem"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "axis.entitlement",
        "kind": "axis",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/axis_dispositions/18"
        },
        "identity_sha256": "4c0b4298e9882a18f80381444acfcdf11728d070854fa98df818c850d1fd83f1",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "declared-assurance-theorem"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "axis.permission",
        "kind": "axis",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/axis_dispositions/19"
        },
        "identity_sha256": "7fa1debf10cec6ff7dc6f3d3b28d2f4bcb92d5d7f87ad1d257f22798fe157b6d",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "declared-assurance-theorem"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "axis.consent",
        "kind": "axis",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/axis_dispositions/20"
        },
        "identity_sha256": "3ef536f350adf94b6b7be793eff9b824203cedbb0e6a68da0d00548f9bc7af73",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "declared-assurance-theorem"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "axis.session",
        "kind": "axis",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/axis_dispositions/21"
        },
        "identity_sha256": "f97afd434392583258b48756f6e0fd30552ccacef7dabb1594e7638419db7e76",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "declared-assurance-theorem"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "axis.entity-state",
        "kind": "axis",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/axis_dispositions/22"
        },
        "identity_sha256": "5ffa262fa9aa717f9893e5f217ff49e03b58653d682427423e6d17fe12c54601",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "declared-assurance-theorem"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "axis.prior-state",
        "kind": "axis",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/axis_dispositions/23"
        },
        "identity_sha256": "2d8f7f6fdf726ac4bce1042eb37e9013dcec72aa3811a1264086d108535878e5",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "declared-assurance-theorem"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "axis.input-class",
        "kind": "axis",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/axis_dispositions/24"
        },
        "identity_sha256": "150c7f5dc00ea7c8b50932b542231a63bc31ffe27c2751ec9d7ffb2249c7aecb",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "declared-assurance-theorem"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "axis.boundary-case",
        "kind": "axis",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/axis_dispositions/25"
        },
        "identity_sha256": "234818346fae443c5f9ea6b6d5df19c937c122af1d13db53aaedee19a1ef13f7",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "declared-assurance-theorem"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "axis.data-volume",
        "kind": "axis",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/axis_dispositions/26"
        },
        "identity_sha256": "ec6c2bd4712902976da57eed541d6be56454a64a872078639e33a3547afd2024",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "declared-assurance-theorem"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "axis.locale",
        "kind": "axis",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/axis_dispositions/27"
        },
        "identity_sha256": "508f889fb943107562d18b4706844499b75df604ce39019e2709c3b9628e738b",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "declared-assurance-theorem"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "axis.timezone",
        "kind": "axis",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/axis_dispositions/28"
        },
        "identity_sha256": "005a5611b77c90f8032c38b0533d7eb73cdb790c95b64eac1c9243ec2c2650b2",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "declared-assurance-theorem"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "axis.clock",
        "kind": "axis",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/axis_dispositions/29"
        },
        "identity_sha256": "6f97a64ad5978db724334c849bb77c7a5c70ab61d8a25fc8948f6cd6fb59d241",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "declared-assurance-theorem"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "axis.concurrency",
        "kind": "axis",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/axis_dispositions/30"
        },
        "identity_sha256": "d8521a89b115f0507f7a9ebfc30a494d190e3e03ff8c721aa95c8583a3fed369",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "declared-assurance-theorem"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "axis.repetition",
        "kind": "axis",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/axis_dispositions/31"
        },
        "identity_sha256": "13f47d3bab7f4ef1f1ae85b7148a4e51fc65c43590dbb8b300942d82c459d5f6",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "declared-assurance-theorem"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "axis.dependency-health",
        "kind": "axis",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/axis_dispositions/32"
        },
        "identity_sha256": "94b79b74838d90938ee4bafd7cb16ec34c8ef7674f6a05ebb2005154c8162a81",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "declared-assurance-theorem"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "axis.connectivity",
        "kind": "axis",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/axis_dispositions/33"
        },
        "identity_sha256": "f278560f16da024070d4e631bf08dbeeb98d52ecdc7fc78e2ed722a374e4a1a1",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "declared-assurance-theorem"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "axis.failure-class",
        "kind": "axis",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/axis_dispositions/34"
        },
        "identity_sha256": "df703a63e5569d4aba4aeefb04a4080b4059504f509bae800c820a21ffeecf70",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "declared-assurance-theorem"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "axis.retry-phase",
        "kind": "axis",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/axis_dispositions/35"
        },
        "identity_sha256": "d53e5978bbbd64ac433feeaeb94b18f31e433de2eca490c131dd8ac57727c50d",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "declared-assurance-theorem"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "axis.consistency",
        "kind": "axis",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/axis_dispositions/36"
        },
        "identity_sha256": "07baf5f7d124ba4d10be89304dbf926ccf6810fa263675b795d75f199487e914",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "declared-assurance-theorem"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "axis.freshness",
        "kind": "axis",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/axis_dispositions/37"
        },
        "identity_sha256": "c2060f01689a83b793b30f95141602a6d371c456b02bc1d30d9ddc754fed58e0",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "declared-assurance-theorem"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "axis.migration-phase",
        "kind": "axis",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/axis_dispositions/38"
        },
        "identity_sha256": "83b52efe3b49c7a071f9a07af34a9744ce177c5818651616aa1daef4bda5351f",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "declared-assurance-theorem"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "axis.rollout-phase",
        "kind": "axis",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/axis_dispositions/39"
        },
        "identity_sha256": "25a40cc7982ae255376e43ce6ad2e174c1b9397eaaa4c6a48d71f84338334912",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "declared-assurance-theorem"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "axis.topology",
        "kind": "axis",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/axis_dispositions/40"
        },
        "identity_sha256": "801374f84f4890086fbeb25818e67acd7c86067c2c247021eadb5ec44b79933c",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "declared-assurance-theorem"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "axis.threat",
        "kind": "axis",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/axis_dispositions/41"
        },
        "identity_sha256": "970065a274a93493b5956f6c98f9a9058a503df72cf2469c2133d512e7d3413b",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "declared-assurance-theorem"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "axis.operational-mode",
        "kind": "axis",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/axis_dispositions/42"
        },
        "identity_sha256": "9ddcb336cf2ed2707eb5c85b0ab0824152822bacd126b415d9deeda5e6d0c656",
        "disposition": "supporting_only",
        "fact_refs": [],
        "basis_refs": [
          "declared-assurance-theorem"
        ],
        "rationale": "This identity is explicitly inventoried as supporting or inapplicable."
      },
      {
        "key": "condition.p0-exact-recomputation.current-candidate",
        "kind": "condition",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/conditions/0"
        },
        "identity_sha256": "49f794eb4d58a45677260bef7424f73bcb615b50d0538b9f9e6bbc674d728c24",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.known-selected-design-false-acceptance",
          "fact.requirement.p0-owner-local-and-v3-compatible",
          "fact.requirement.p0-positive-fixture-correction",
          "fact.requirement.p0-v1-negative-control",
          "fact.requirement.p0-v2-negative-control",
          "fact.requirement.p0-verification-boundary",
          "fact.requirement.selected-design-existing-owner-preservation",
          "fact.requirement.shared-exact-comparison-owner",
          "fact.requirement.technical-debt-and-future-change"
        ],
        "basis_refs": [
          "known-selected-design-false-acceptance"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "condition.assurance-governance.current-candidate",
        "kind": "condition",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/conditions/1"
        },
        "identity_sha256": "cd6c20c60f56b1de02446d6e5467ead4282e2c8bdf9e8ea38fbf20c6dfe8687c",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.approved-final-capability-wording",
          "fact.requirement.capability-claim-levels",
          "fact.requirement.coverage-defined-by-rejected-attack-surface",
          "fact.requirement.critical-claim-inflation-risk",
          "fact.requirement.critical-sentinel-positive-negative-controls",
          "fact.requirement.incident-counterexample-first-rule",
          "fact.requirement.invalid-baseline-and-claim-downgrade",
          "fact.requirement.no-new-lifecycle-authority-registry",
          "fact.requirement.purpose-validity-floor-before-relative-antidegradation",
          "fact.requirement.sentinel-rationale-evidence-bounded"
        ],
        "basis_refs": [
          "purpose-validity-floor-before-relative-antidegradation"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "condition.observer-tcb-closure.current-candidate",
        "kind": "condition",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/conditions/2"
        },
        "identity_sha256": "c462291ab3bc4aba838b6495e4b7b3d67a7640b6dc7003de98a2cfff5c5723d8",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.actual-artifact-reextraction",
          "fact.requirement.bounded-admitted-artifact-contract",
          "fact.requirement.build-reuse-buy-allowed-set",
          "fact.requirement.challenge-is-freshness-only",
          "fact.requirement.compatibility-security-resource-boundaries",
          "fact.requirement.counterfactual-actual-change-and-impact-set",
          "fact.requirement.critical-scope-escape-risk",
          "fact.requirement.critical-self-attestation-risk",
          "fact.requirement.expected-actual-comparison-verdict-ownership",
          "fact.requirement.expected-to-actual-self-proof-rejection",
          "fact.requirement.generated-carrier-semantic-role",
          "fact.requirement.no-universal-ui-observer",
          "fact.requirement.observation-channel-authority",
          "fact.requirement.owner-dependency-lifecycle-boundary",
          "fact.requirement.production-reachability",
          "fact.requirement.route-b-project-owner-decision",
          "fact.requirement.v3-v4-and-migration-rule"
        ],
        "basis_refs": [
          "route-b-project-owner-decision"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "condition.proof-and-roi.current-candidate",
        "kind": "condition",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/conditions/3"
        },
        "identity_sha256": "3af959cfb84fe38945a707c003f129757d70b5decd630bdb62fbfa1bbe45b365",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.assurance-causal-chain",
          "fact.requirement.attack-suite-ground-truth",
          "fact.requirement.black-box-final-gate-lifecycle",
          "fact.requirement.context-and-public-authority-update",
          "fact.requirement.declared-assurance-theorem",
          "fact.requirement.early-real-entry-feedback",
          "fact.requirement.final-hard-acceptance",
          "fact.requirement.fresh-agent-benchmark-boundary",
          "fact.requirement.material-input-provenance",
          "fact.requirement.real-capability-closure-result",
          "fact.requirement.roi-admission-order",
          "fact.requirement.starward-sanitized-replay",
          "fact.requirement.valid-control-suite",
          "fact.requirement.verification-sequence-and-current-candidate"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "property.custom-requirement-satisfied",
        "kind": "property",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/property_dispositions/0"
        },
        "identity_sha256": "b5ff2bc8e3b114f505a6ad3a63db0ca342e9070be77c007513c42fc062e55923",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.actual-artifact-reextraction",
          "fact.requirement.approved-final-capability-wording",
          "fact.requirement.assurance-causal-chain",
          "fact.requirement.attack-suite-ground-truth",
          "fact.requirement.black-box-final-gate-lifecycle",
          "fact.requirement.bounded-admitted-artifact-contract",
          "fact.requirement.build-reuse-buy-allowed-set",
          "fact.requirement.capability-claim-levels",
          "fact.requirement.challenge-is-freshness-only",
          "fact.requirement.compatibility-security-resource-boundaries",
          "fact.requirement.context-and-public-authority-update",
          "fact.requirement.counterfactual-actual-change-and-impact-set",
          "fact.requirement.coverage-defined-by-rejected-attack-surface",
          "fact.requirement.critical-claim-inflation-risk",
          "fact.requirement.critical-scope-escape-risk",
          "fact.requirement.critical-self-attestation-risk",
          "fact.requirement.critical-sentinel-positive-negative-controls",
          "fact.requirement.declared-assurance-theorem",
          "fact.requirement.early-real-entry-feedback",
          "fact.requirement.expected-actual-comparison-verdict-ownership",
          "fact.requirement.expected-to-actual-self-proof-rejection",
          "fact.requirement.final-hard-acceptance",
          "fact.requirement.fresh-agent-benchmark-boundary",
          "fact.requirement.generated-carrier-semantic-role",
          "fact.requirement.incident-counterexample-first-rule",
          "fact.requirement.invalid-baseline-and-claim-downgrade",
          "fact.requirement.known-selected-design-false-acceptance",
          "fact.requirement.material-input-provenance",
          "fact.requirement.no-new-lifecycle-authority-registry",
          "fact.requirement.no-universal-ui-observer",
          "fact.requirement.observation-channel-authority",
          "fact.requirement.owner-dependency-lifecycle-boundary",
          "fact.requirement.p0-owner-local-and-v3-compatible",
          "fact.requirement.p0-positive-fixture-correction",
          "fact.requirement.p0-v1-negative-control",
          "fact.requirement.p0-v2-negative-control",
          "fact.requirement.p0-verification-boundary",
          "fact.requirement.production-reachability",
          "fact.requirement.purpose-validity-floor-before-relative-antidegradation",
          "fact.requirement.real-capability-closure-result",
          "fact.requirement.roi-admission-order",
          "fact.requirement.route-b-project-owner-decision",
          "fact.requirement.selected-design-existing-owner-preservation",
          "fact.requirement.sentinel-rationale-evidence-bounded",
          "fact.requirement.shared-exact-comparison-owner",
          "fact.requirement.starward-sanitized-replay",
          "fact.requirement.technical-debt-and-future-change",
          "fact.requirement.v3-v4-and-migration-rule",
          "fact.requirement.valid-control-suite",
          "fact.requirement.verification-sequence-and-current-candidate"
        ],
        "basis_refs": [
          "final-hard-acceptance"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "cell.requirement.real-capability-closure-result",
        "kind": "fact_cell",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/fact_cells/0"
        },
        "identity_sha256": "d58fe4e63d591d9906600db9eb4632487293dfe9f22726588ffb7da60a0f53a5",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.real-capability-closure-result"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "cell.requirement.material-input-provenance",
        "kind": "fact_cell",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/fact_cells/1"
        },
        "identity_sha256": "f6b627e5dcc506f97c3bf2b9fc16660d14261a4e5a9915cfca47d5403da4aa23",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.material-input-provenance"
        ],
        "basis_refs": [
          "material-input-provenance"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "cell.requirement.declared-assurance-theorem",
        "kind": "fact_cell",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/fact_cells/2"
        },
        "identity_sha256": "91c91a7f58079a6dbafd5118eb23e9584c84fa492fc1ab1b78a4447eac657e35",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.declared-assurance-theorem"
        ],
        "basis_refs": [
          "declared-assurance-theorem"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "cell.requirement.assurance-causal-chain",
        "kind": "fact_cell",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/fact_cells/3"
        },
        "identity_sha256": "a05932c0f579918e3cf71136c2b045125ce2559a9f6d4f32912be68c5180cff0",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.assurance-causal-chain"
        ],
        "basis_refs": [
          "assurance-causal-chain"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "cell.requirement.known-selected-design-false-acceptance",
        "kind": "fact_cell",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/fact_cells/4"
        },
        "identity_sha256": "5bc894d30ffa797426a1080447f85dff14442d10e0bcc44c649daa22167de836",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.known-selected-design-false-acceptance"
        ],
        "basis_refs": [
          "known-selected-design-false-acceptance"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "cell.requirement.p0-positive-fixture-correction",
        "kind": "fact_cell",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/fact_cells/5"
        },
        "identity_sha256": "04b97cd752bbfa23a79392e92b5c0aead7f73e3f8d274f78a71e4de5bec4e02c",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.p0-positive-fixture-correction"
        ],
        "basis_refs": [
          "p0-positive-fixture-correction"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "cell.requirement.p0-v1-negative-control",
        "kind": "fact_cell",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/fact_cells/6"
        },
        "identity_sha256": "27cdc9837e1c05bef9a294d98c924a384457437d1d2e784f730a361feaf52047",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.p0-v1-negative-control"
        ],
        "basis_refs": [
          "p0-v1-negative-control"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "cell.requirement.p0-v2-negative-control",
        "kind": "fact_cell",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/fact_cells/7"
        },
        "identity_sha256": "95009feb0e41b4d375c22e5ee494de180af66a2ab679430570a2dae19b0ec532",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.p0-v2-negative-control"
        ],
        "basis_refs": [
          "p0-v2-negative-control"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "cell.requirement.shared-exact-comparison-owner",
        "kind": "fact_cell",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/fact_cells/8"
        },
        "identity_sha256": "9ab570ae4a671a7b18c61157835975e698e0ab79b2a4e927781f09c62085d0e4",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.shared-exact-comparison-owner"
        ],
        "basis_refs": [
          "shared-exact-comparison-owner"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "cell.requirement.p0-owner-local-and-v3-compatible",
        "kind": "fact_cell",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/fact_cells/9"
        },
        "identity_sha256": "be36b08a903b404631c79a66d841c5806daedde84ee1cf9dae004531b6734c09",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.p0-owner-local-and-v3-compatible"
        ],
        "basis_refs": [
          "p0-owner-local-and-v3-compatible"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "cell.requirement.p0-verification-boundary",
        "kind": "fact_cell",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/fact_cells/10"
        },
        "identity_sha256": "3217c6fe446b46ba41a1b5c94a6cb10c41f8c666a888cca0aecde8b53eef7669",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.p0-verification-boundary"
        ],
        "basis_refs": [
          "p0-verification-boundary"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "cell.requirement.purpose-validity-floor-before-relative-antidegradation",
        "kind": "fact_cell",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/fact_cells/11"
        },
        "identity_sha256": "772648d00ef369b214a6123ce5ed6c6d3b7ccf9280936deb7db85c8e965b4c18",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.purpose-validity-floor-before-relative-antidegradation"
        ],
        "basis_refs": [
          "purpose-validity-floor-before-relative-antidegradation"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "cell.requirement.invalid-baseline-and-claim-downgrade",
        "kind": "fact_cell",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/fact_cells/12"
        },
        "identity_sha256": "5c4eba4d364d58ad020e3eb711c9b4d470ccf59fa449e62e70349748b16b8435",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.invalid-baseline-and-claim-downgrade"
        ],
        "basis_refs": [
          "invalid-baseline-and-claim-downgrade"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "cell.requirement.coverage-defined-by-rejected-attack-surface",
        "kind": "fact_cell",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/fact_cells/13"
        },
        "identity_sha256": "5ce1075fac9bc79e9c13652f69b0a819ccb657f646de055f5d53f6d92a5318bc",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.coverage-defined-by-rejected-attack-surface"
        ],
        "basis_refs": [
          "coverage-defined-by-rejected-attack-surface"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "cell.requirement.critical-sentinel-positive-negative-controls",
        "kind": "fact_cell",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/fact_cells/14"
        },
        "identity_sha256": "361540ec8503132282b261a3e945afe1aa2482c8da99eb968514ca84715e5706",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.critical-sentinel-positive-negative-controls"
        ],
        "basis_refs": [
          "critical-sentinel-positive-negative-controls"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "cell.requirement.incident-counterexample-first-rule",
        "kind": "fact_cell",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/fact_cells/15"
        },
        "identity_sha256": "5aba3468497faed4375c7cd55cdeff1dcd4f3acf8942e41028e8f87a4399c50b",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.incident-counterexample-first-rule"
        ],
        "basis_refs": [
          "incident-counterexample-first-rule"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "cell.requirement.sentinel-rationale-evidence-bounded",
        "kind": "fact_cell",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/fact_cells/16"
        },
        "identity_sha256": "b362b748f21acd8055820712ae556aa5827cddeebaded35c1834aab9d59d9532",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.sentinel-rationale-evidence-bounded"
        ],
        "basis_refs": [
          "sentinel-rationale-evidence-bounded"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "cell.requirement.capability-claim-levels",
        "kind": "fact_cell",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/fact_cells/17"
        },
        "identity_sha256": "2c069a9da278ecd8d78d222c534a9b4322071945b7744d1e138e470187d17012",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.capability-claim-levels"
        ],
        "basis_refs": [
          "capability-claim-levels"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "cell.requirement.route-b-project-owner-decision",
        "kind": "fact_cell",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/fact_cells/18"
        },
        "identity_sha256": "554351e8f7fa5faa982ef5f34fc75db1707e24df5cad698a14b2d662890678a2",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.route-b-project-owner-decision"
        ],
        "basis_refs": [
          "route-b-project-owner-decision"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "cell.requirement.observation-channel-authority",
        "kind": "fact_cell",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/fact_cells/19"
        },
        "identity_sha256": "fd9c41fed433eddc1ae15731e97042f34197c93fe1201cbde23efd71e7bbc0f0",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.observation-channel-authority"
        ],
        "basis_refs": [
          "observation-channel-authority"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "cell.requirement.expected-actual-comparison-verdict-ownership",
        "kind": "fact_cell",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/fact_cells/20"
        },
        "identity_sha256": "2909e476c77a88568085ee98d75a06ad50e4a61b4a1ebeac09e936d3c37e7a3a",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.expected-actual-comparison-verdict-ownership"
        ],
        "basis_refs": [
          "expected-actual-comparison-verdict-ownership"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "cell.requirement.bounded-admitted-artifact-contract",
        "kind": "fact_cell",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/fact_cells/21"
        },
        "identity_sha256": "db0f401c2dfd1402177836b4c9f78b3afbc5383ef37a61b0fc0be6b863cc29ad",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.bounded-admitted-artifact-contract"
        ],
        "basis_refs": [
          "bounded-admitted-artifact-contract"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "cell.requirement.actual-artifact-reextraction",
        "kind": "fact_cell",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/fact_cells/22"
        },
        "identity_sha256": "0ac35d77d44fbd502446fff28d8372d8ecd3f4d342c4662e2b82f6ccbd16b4f7",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.actual-artifact-reextraction"
        ],
        "basis_refs": [
          "actual-artifact-reextraction"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "cell.requirement.challenge-is-freshness-only",
        "kind": "fact_cell",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/fact_cells/23"
        },
        "identity_sha256": "d03882ec29d41e694b384feb31dd3a86b46fe3909fb5073b204fea6acaa1acb1",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.challenge-is-freshness-only"
        ],
        "basis_refs": [
          "challenge-is-freshness-only"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "cell.requirement.generated-carrier-semantic-role",
        "kind": "fact_cell",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/fact_cells/24"
        },
        "identity_sha256": "f964d15908378160ce15b6b6cab224ab6bc7e0694fb82fb697dfb71491b46137",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.generated-carrier-semantic-role"
        ],
        "basis_refs": [
          "generated-carrier-semantic-role"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "cell.requirement.expected-to-actual-self-proof-rejection",
        "kind": "fact_cell",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/fact_cells/25"
        },
        "identity_sha256": "0011dac8eb55fe3b1693c0e71073e58ffa332eaeaf7b39006f9876c26758386d",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.expected-to-actual-self-proof-rejection"
        ],
        "basis_refs": [
          "expected-to-actual-self-proof-rejection"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "cell.requirement.production-reachability",
        "kind": "fact_cell",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/fact_cells/26"
        },
        "identity_sha256": "91e15bc457067cb5477273fcfd7f0fcdb26a286c0438320653dd07f7e69d56c0",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.production-reachability"
        ],
        "basis_refs": [
          "production-reachability"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "cell.requirement.counterfactual-actual-change-and-impact-set",
        "kind": "fact_cell",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/fact_cells/27"
        },
        "identity_sha256": "428e82dac9c67e46acb82a782c0ae184ed469c4e65191e3f1020d1648840fb13",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.counterfactual-actual-change-and-impact-set"
        ],
        "basis_refs": [
          "counterfactual-actual-change-and-impact-set"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "cell.requirement.selected-design-existing-owner-preservation",
        "kind": "fact_cell",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/fact_cells/28"
        },
        "identity_sha256": "2eab0ed493b191fd48f753641361dcd92820f79c05fc07555e2bcd82e8a9b597",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.selected-design-existing-owner-preservation"
        ],
        "basis_refs": [
          "selected-design-existing-owner-preservation"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "cell.requirement.no-universal-ui-observer",
        "kind": "fact_cell",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/fact_cells/29"
        },
        "identity_sha256": "ecaa1405fe30e679e59eed145e1d8bc47c1056835582ce29f3d3272591e40791",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.no-universal-ui-observer"
        ],
        "basis_refs": [
          "no-universal-ui-observer"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "cell.requirement.v3-v4-and-migration-rule",
        "kind": "fact_cell",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/fact_cells/30"
        },
        "identity_sha256": "ec86ab59a1ffa76c13805d1a2be1423579f4599493ce034672576bb4a5593da6",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.v3-v4-and-migration-rule"
        ],
        "basis_refs": [
          "v3-v4-and-migration-rule"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "cell.requirement.attack-suite-ground-truth",
        "kind": "fact_cell",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/fact_cells/31"
        },
        "identity_sha256": "59059c1afe797641bcd94e26575dda8f15a59f063fd02bb227464aa798147b95",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.attack-suite-ground-truth"
        ],
        "basis_refs": [
          "attack-suite-ground-truth"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "cell.requirement.valid-control-suite",
        "kind": "fact_cell",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/fact_cells/32"
        },
        "identity_sha256": "605afd312beeefe06fad9935e9736ac899fa0d1c1d167c9b02aac959724962e1",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.valid-control-suite"
        ],
        "basis_refs": [
          "valid-control-suite"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "cell.requirement.black-box-final-gate-lifecycle",
        "kind": "fact_cell",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/fact_cells/33"
        },
        "identity_sha256": "698f1de12cd1edffa27d18587ef0600c0b69bcfbd61a3547c60280bfa5daad90",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.black-box-final-gate-lifecycle"
        ],
        "basis_refs": [
          "black-box-final-gate-lifecycle"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "cell.requirement.starward-sanitized-replay",
        "kind": "fact_cell",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/fact_cells/34"
        },
        "identity_sha256": "25d139a6109be45431f9887f0cd1418554aba630dc9b946a73710e008ba6f3eb",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.starward-sanitized-replay"
        ],
        "basis_refs": [
          "starward-sanitized-replay"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "cell.requirement.fresh-agent-benchmark-boundary",
        "kind": "fact_cell",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/fact_cells/35"
        },
        "identity_sha256": "48c0cdd1f924ae4ff3cad3f1661c38ae32f3f290cfeb80d2d0f2e90315b873fd",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.fresh-agent-benchmark-boundary"
        ],
        "basis_refs": [
          "fresh-agent-benchmark-boundary"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "cell.requirement.roi-admission-order",
        "kind": "fact_cell",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/fact_cells/36"
        },
        "identity_sha256": "836d027d90196bd3d43864d74220286ed58f5fe2ff053f8fb067a886a5ca3301",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.roi-admission-order"
        ],
        "basis_refs": [
          "roi-admission-order"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "cell.requirement.early-real-entry-feedback",
        "kind": "fact_cell",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/fact_cells/37"
        },
        "identity_sha256": "c31e75913e087e4026509755db1e1e515ae6d9444ebc1b8591e3ad17811f139f",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.early-real-entry-feedback"
        ],
        "basis_refs": [
          "early-real-entry-feedback"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "cell.requirement.no-new-lifecycle-authority-registry",
        "kind": "fact_cell",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/fact_cells/38"
        },
        "identity_sha256": "de54bb14b29bfc8693e90ee7f7ec0f1993b27302417469a793773500be6033d1",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.no-new-lifecycle-authority-registry"
        ],
        "basis_refs": [
          "no-new-lifecycle-authority-registry"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "cell.requirement.owner-dependency-lifecycle-boundary",
        "kind": "fact_cell",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/fact_cells/39"
        },
        "identity_sha256": "7bf25ae69513327669ca508843eb02fe014aca3c91ce156fb08244bb9b3d9390",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.owner-dependency-lifecycle-boundary"
        ],
        "basis_refs": [
          "owner-dependency-lifecycle-boundary"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "cell.requirement.build-reuse-buy-allowed-set",
        "kind": "fact_cell",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/fact_cells/40"
        },
        "identity_sha256": "4818457367b310a53a44e108626336c16b9c6df5847b309ecf4047458569a89f",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.build-reuse-buy-allowed-set"
        ],
        "basis_refs": [
          "build-reuse-buy-allowed-set"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "cell.requirement.technical-debt-and-future-change",
        "kind": "fact_cell",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/fact_cells/41"
        },
        "identity_sha256": "8902c61fdeaebb924337b8842a567586d4ff23e4225306341ceefb8d8c0b5255",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.technical-debt-and-future-change"
        ],
        "basis_refs": [
          "technical-debt-and-future-change"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "cell.requirement.compatibility-security-resource-boundaries",
        "kind": "fact_cell",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/fact_cells/42"
        },
        "identity_sha256": "bb5c34859586df8e3097b6ca0688edfe1913b1b975701f0557ba611fcc760a64",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.compatibility-security-resource-boundaries"
        ],
        "basis_refs": [
          "compatibility-security-resource-boundaries"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "cell.requirement.context-and-public-authority-update",
        "kind": "fact_cell",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/fact_cells/43"
        },
        "identity_sha256": "d7b7809b3edd8839d95a2ba00d8e749ac82ed3b05b95ad3f04aa874f2e356c06",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.context-and-public-authority-update"
        ],
        "basis_refs": [
          "context-and-public-authority-update"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "cell.requirement.verification-sequence-and-current-candidate",
        "kind": "fact_cell",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/fact_cells/44"
        },
        "identity_sha256": "a586492b228a0d7ea3092e4f91cabf80f1821fe9b02e232221aae1da1b611543",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.verification-sequence-and-current-candidate"
        ],
        "basis_refs": [
          "verification-sequence-and-current-candidate"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "cell.requirement.final-hard-acceptance",
        "kind": "fact_cell",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/fact_cells/45"
        },
        "identity_sha256": "7a9b122594b22aad2c06a0a0a9b6a756b164291e182cf9c84f9774349cbc64ff",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.final-hard-acceptance"
        ],
        "basis_refs": [
          "final-hard-acceptance"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "cell.requirement.approved-final-capability-wording",
        "kind": "fact_cell",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/fact_cells/46"
        },
        "identity_sha256": "9cd4fbdbdab79a3f1d49ab42b38872297069e7e86588a949a5ebd80a46049f9d",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.approved-final-capability-wording"
        ],
        "basis_refs": [
          "approved-final-capability-wording"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "cell.requirement.critical-scope-escape-risk",
        "kind": "fact_cell",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/fact_cells/47"
        },
        "identity_sha256": "233891b1be1dd3f7137cf2e4402f14cc434061c8f18926263fbba87fe8148b3f",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.critical-scope-escape-risk"
        ],
        "basis_refs": [
          "critical-scope-escape-risk"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "cell.requirement.critical-self-attestation-risk",
        "kind": "fact_cell",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/fact_cells/48"
        },
        "identity_sha256": "d7ce0230e4c44611aee3fd031104be7a36375e5f96537e45901e7209b417757a",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.critical-self-attestation-risk"
        ],
        "basis_refs": [
          "critical-self-attestation-risk"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "cell.requirement.critical-claim-inflation-risk",
        "kind": "fact_cell",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/fact_cells/49"
        },
        "identity_sha256": "36ffd05b902da2aaf830766193fe0b2213597f40b2e798da325432faf9c8facc",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.critical-claim-inflation-risk"
        ],
        "basis_refs": [
          "critical-claim-inflation-risk"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "fact.requirement.real-capability-closure-result",
        "kind": "fact",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/0"
        },
        "identity_sha256": "617907a33be1ae15b5eba2dda8c7e952d21437d000e1d958afe042b1b98bed1a",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.real-capability-closure-result"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "fact.requirement.material-input-provenance",
        "kind": "fact",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/1"
        },
        "identity_sha256": "f26eaf0ea44086939e75085b0212ca1a0393ae4e007c88207c28c90f54feeb3c",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.material-input-provenance"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "fact.requirement.declared-assurance-theorem",
        "kind": "fact",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/2"
        },
        "identity_sha256": "f14568cf5e64f7c37aecf03fe9ac536f909484979fb8bf30e45f980f1102f680",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.declared-assurance-theorem"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "fact.requirement.assurance-causal-chain",
        "kind": "fact",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/3"
        },
        "identity_sha256": "f0ed81f33d64028ad9150c3277192af5d31e31c8b2cdfb2970b51965366bc4ee",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.assurance-causal-chain"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "fact.requirement.known-selected-design-false-acceptance",
        "kind": "fact",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/4"
        },
        "identity_sha256": "979493c5def3468d2c57227555a683460b2deef1e70062f957f89ba72ebd466c",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.known-selected-design-false-acceptance"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "fact.requirement.p0-positive-fixture-correction",
        "kind": "fact",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/5"
        },
        "identity_sha256": "48f8ef1bb2b1142c636081c2fa9d0de82f153027eb21cf51063a3716446f50e5",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.p0-positive-fixture-correction"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "fact.requirement.p0-v1-negative-control",
        "kind": "fact",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/6"
        },
        "identity_sha256": "f2afdeebae051bfe6b895f222fe23bb2d391c61e1abdec72e5cbfdd9b2f89e16",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.p0-v1-negative-control"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "fact.requirement.p0-v2-negative-control",
        "kind": "fact",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/7"
        },
        "identity_sha256": "46ea59d67d9982e1987b48e97a76f03b29f84684727f5de2a8f51e05fbfed4b7",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.p0-v2-negative-control"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "fact.requirement.shared-exact-comparison-owner",
        "kind": "fact",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/8"
        },
        "identity_sha256": "48268f7044d7604c1289be035c870a2c817ea79e6a5ce510f83be9e899631e01",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.shared-exact-comparison-owner"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "fact.requirement.p0-owner-local-and-v3-compatible",
        "kind": "fact",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/9"
        },
        "identity_sha256": "40dfe89687ee4d818896645e68bcc638d451cd60865b589c61caa4afa546d36b",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.p0-owner-local-and-v3-compatible"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "fact.requirement.p0-verification-boundary",
        "kind": "fact",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/10"
        },
        "identity_sha256": "baef921bb8597bff38adb1ef853683dfc94a7435d9b474653762427cce6ff11c",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.p0-verification-boundary"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "fact.requirement.purpose-validity-floor-before-relative-antidegradation",
        "kind": "fact",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/11"
        },
        "identity_sha256": "e5c8588d2bb287ee14ec3fd044581ad62c81d7ec045786dfce4de37fbba60eee",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.purpose-validity-floor-before-relative-antidegradation"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "fact.requirement.invalid-baseline-and-claim-downgrade",
        "kind": "fact",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/12"
        },
        "identity_sha256": "4a5cfcae3c062e3e1da81804ad5537872a84e4b45715320db8fe3e704fcd6491",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.invalid-baseline-and-claim-downgrade"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "fact.requirement.coverage-defined-by-rejected-attack-surface",
        "kind": "fact",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/13"
        },
        "identity_sha256": "a5e205fab579e0880ed3504eba33fc82fd88f3fa8e770442946a9e850ccbb2d2",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.coverage-defined-by-rejected-attack-surface"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "fact.requirement.critical-sentinel-positive-negative-controls",
        "kind": "fact",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/14"
        },
        "identity_sha256": "000bd9349c8b18b01c252caecdfc52e5a2abe9ccd1aa2cc03252fc80f999729e",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.critical-sentinel-positive-negative-controls"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "fact.requirement.incident-counterexample-first-rule",
        "kind": "fact",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/15"
        },
        "identity_sha256": "08b39774f57982678c82fe4205aef52b2903de2aeda7a1b880e69a5a52f1931c",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.incident-counterexample-first-rule"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "fact.requirement.sentinel-rationale-evidence-bounded",
        "kind": "fact",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/16"
        },
        "identity_sha256": "df37efe6cdc532b71cb403849822a10514e392e2b223d95f25c9465e9adcfb6d",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.sentinel-rationale-evidence-bounded"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "fact.requirement.capability-claim-levels",
        "kind": "fact",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/17"
        },
        "identity_sha256": "e1833161016d9e14875fa1cddc62b6a148c341142664cd148f6b4e38eeeb5ed9",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.capability-claim-levels"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "fact.requirement.route-b-project-owner-decision",
        "kind": "fact",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/18"
        },
        "identity_sha256": "eed366ad1a9100915abda6bbc5faa1cf988689b953ffe67f4119833cc37f4ec0",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.route-b-project-owner-decision"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "fact.requirement.observation-channel-authority",
        "kind": "fact",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/19"
        },
        "identity_sha256": "879a9123cb2a665279bb7b3c2eecb1ce2b8884f553814dcb0bce5bfd3ba72238",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.observation-channel-authority"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "fact.requirement.expected-actual-comparison-verdict-ownership",
        "kind": "fact",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/20"
        },
        "identity_sha256": "59617201cf3883cec3d79a92a75de15d45bec6b6e8f8fa16ed498beaa51bcc8f",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.expected-actual-comparison-verdict-ownership"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "fact.requirement.bounded-admitted-artifact-contract",
        "kind": "fact",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/21"
        },
        "identity_sha256": "bc62237ce5f2949d527410de70b1a8a8cdc8cab021efa0ce9f140328eea640c1",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.bounded-admitted-artifact-contract"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "fact.requirement.actual-artifact-reextraction",
        "kind": "fact",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/22"
        },
        "identity_sha256": "227df4f85e59ff77c5366a282d33d45e184a72468639704bd438dd895ba7c340",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.actual-artifact-reextraction"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "fact.requirement.challenge-is-freshness-only",
        "kind": "fact",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/23"
        },
        "identity_sha256": "f8ed1e5a947a8ed1b533d98c9bf356635ea52859b769e39659131bb910091cba",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.challenge-is-freshness-only"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "fact.requirement.generated-carrier-semantic-role",
        "kind": "fact",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/24"
        },
        "identity_sha256": "7f0e454bd6f748e7f79ddf29b06c18a82f7ea0d1ba115ef543050cb17ec4803a",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.generated-carrier-semantic-role"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "fact.requirement.expected-to-actual-self-proof-rejection",
        "kind": "fact",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/25"
        },
        "identity_sha256": "5573238c61d9e8ee0eebcad06b0e2d43878bd58d3f6c7e8d4bd0757b3d0af282",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.expected-to-actual-self-proof-rejection"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "fact.requirement.production-reachability",
        "kind": "fact",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/26"
        },
        "identity_sha256": "1b95491287adb3326b127fa3de25ba135e229a6650600a83848094161cd0e4f7",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.production-reachability"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "fact.requirement.counterfactual-actual-change-and-impact-set",
        "kind": "fact",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/27"
        },
        "identity_sha256": "69e4634ed0f2eb56e5f8c82ea18e0c7f91b092795357d29663a2315c39293a9d",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.counterfactual-actual-change-and-impact-set"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "fact.requirement.selected-design-existing-owner-preservation",
        "kind": "fact",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/28"
        },
        "identity_sha256": "9ef8dc9c5b674e2fb016bfc560ff08eee09a31962e3a1ed5b117b37f573c404c",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.selected-design-existing-owner-preservation"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "fact.requirement.no-universal-ui-observer",
        "kind": "fact",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/29"
        },
        "identity_sha256": "957cbb45b06153b26e2835fe230af9d7a7cb9e2d0f76cbeab183b17fe4afaa5c",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.no-universal-ui-observer"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "fact.requirement.v3-v4-and-migration-rule",
        "kind": "fact",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/30"
        },
        "identity_sha256": "bfce28ec26bd88c1742f971227377a042c1d87be61917d619cfbe221d68e54fa",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.v3-v4-and-migration-rule"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "fact.requirement.attack-suite-ground-truth",
        "kind": "fact",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/31"
        },
        "identity_sha256": "863e0864ca3ecfa384e5651ad86b28a47f16100007d8da896e534a178a6f5a3a",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.attack-suite-ground-truth"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "fact.requirement.valid-control-suite",
        "kind": "fact",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/32"
        },
        "identity_sha256": "8728ccfffb44cf3eb1b75d12e23dd4b69abdb874cfe7ce7f72b52604b00c7ecb",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.valid-control-suite"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "fact.requirement.black-box-final-gate-lifecycle",
        "kind": "fact",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/33"
        },
        "identity_sha256": "3389d70ad03c7e7e089d15c4fa4bbfae74bfc13193e868c39df96b2619af9740",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.black-box-final-gate-lifecycle"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "fact.requirement.starward-sanitized-replay",
        "kind": "fact",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/34"
        },
        "identity_sha256": "65804f891eda4ed583bb2a1f071db154362f6459271e22ab82793a6e5692eb37",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.starward-sanitized-replay"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "fact.requirement.fresh-agent-benchmark-boundary",
        "kind": "fact",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/35"
        },
        "identity_sha256": "cd6631c50d9bfa524db22d35ab5f7aba5187fcb608ae657fbfee8a7d8a015f1a",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.fresh-agent-benchmark-boundary"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "fact.requirement.roi-admission-order",
        "kind": "fact",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/36"
        },
        "identity_sha256": "4acdec4036f72818985d6d4d5dfb94deb37658e9ae5a2d9c67f19e97690c4e72",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.roi-admission-order"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "fact.requirement.early-real-entry-feedback",
        "kind": "fact",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/37"
        },
        "identity_sha256": "968eb2f13b1b3cf6d5b99fc471814c76b92c39f004188c27118434dc5dafeb8c",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.early-real-entry-feedback"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "fact.requirement.no-new-lifecycle-authority-registry",
        "kind": "fact",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/38"
        },
        "identity_sha256": "4a62387ea5ca0098555f73b790815b5abf2c9f9773b65a554b9786c5703449ec",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.no-new-lifecycle-authority-registry"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "fact.requirement.owner-dependency-lifecycle-boundary",
        "kind": "fact",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/39"
        },
        "identity_sha256": "837755f7bf4d1ad1bf6a88d83668928f820aae2244bf4c1c9fabb6239c4f055a",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.owner-dependency-lifecycle-boundary"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "fact.requirement.build-reuse-buy-allowed-set",
        "kind": "fact",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/40"
        },
        "identity_sha256": "73398074f82735573abf49db97781669b45f982f428ebffec5562eb0085f9009",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.build-reuse-buy-allowed-set"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "fact.requirement.technical-debt-and-future-change",
        "kind": "fact",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/41"
        },
        "identity_sha256": "59e8c785265eea9903f7a6a3ef569709b8a66cfcbebe39c4087a950cc61e65be",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.technical-debt-and-future-change"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "fact.requirement.compatibility-security-resource-boundaries",
        "kind": "fact",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/42"
        },
        "identity_sha256": "8dd775d74684ea5e1640511cae9e4612732bc9d2ee7f2fba8a2d04cdb648c09d",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.compatibility-security-resource-boundaries"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "fact.requirement.context-and-public-authority-update",
        "kind": "fact",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/43"
        },
        "identity_sha256": "2f2d1a62222bfd059fda83d61de9a049598af0c377e1ab1710bcb64764ea16dc",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.context-and-public-authority-update"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "fact.requirement.verification-sequence-and-current-candidate",
        "kind": "fact",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/44"
        },
        "identity_sha256": "1012e5fbf85168374440643ec5ace12f44ab3636f208ab1a126d5370886c5984",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.verification-sequence-and-current-candidate"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "fact.requirement.final-hard-acceptance",
        "kind": "fact",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/45"
        },
        "identity_sha256": "f8910fb32b4a6798c0a7ac96e671a3fddb48f2a423467fd714663ebf60e20095",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.final-hard-acceptance"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "fact.requirement.approved-final-capability-wording",
        "kind": "fact",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/46"
        },
        "identity_sha256": "684d9f31b96d40909c7e3df2baed79eae2b69501f3c83baafc11772cbc8aedec",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.approved-final-capability-wording"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "fact.requirement.critical-scope-escape-risk",
        "kind": "fact",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/47"
        },
        "identity_sha256": "43df6acd72742c20fca98f30d4db392077d1d9b6c5b7502a4c35e5281648172e",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.critical-scope-escape-risk"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "fact.requirement.critical-self-attestation-risk",
        "kind": "fact",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/48"
        },
        "identity_sha256": "9e10d518065f6dc5d2b701ab2b994679e9bca2e348b9f28b65f55fd1e6885e1e",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.critical-self-attestation-risk"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "fact.requirement.critical-claim-inflation-risk",
        "kind": "fact",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/49"
        },
        "identity_sha256": "aa9a366ba823217532ffea8da68af38cb9c8f3bd423acf0043e32148c03a2179",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.critical-claim-inflation-risk"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "proof.requirement.real-capability-closure-result.exact",
        "kind": "proof_obligation",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/proof_obligations/0"
        },
        "identity_sha256": "bf0b263751f9daa68ad4b0b2f51e5a876a4a35e55ca9a85c6f0634db9cf1a950",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.real-capability-closure-result"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "proof.requirement.material-input-provenance.exact",
        "kind": "proof_obligation",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/proof_obligations/1"
        },
        "identity_sha256": "d2b97e2184fa00a93abd2ab7930333efbedbeea07ff483925a19ed44f3b7e07d",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.material-input-provenance"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "proof.requirement.declared-assurance-theorem.exact",
        "kind": "proof_obligation",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/proof_obligations/2"
        },
        "identity_sha256": "e8b8fbf78a28d754cf611f528986e86702a1537a03c911c2ee1348f121c8caf2",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.declared-assurance-theorem"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "proof.requirement.assurance-causal-chain.exact",
        "kind": "proof_obligation",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/proof_obligations/3"
        },
        "identity_sha256": "c2e61f9c1cce32912757cee4da6cbe470a78ce33bf2c0f94bbe7b7a1323fee28",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.assurance-causal-chain"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "proof.requirement.known-selected-design-false-acceptance.exact",
        "kind": "proof_obligation",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/proof_obligations/4"
        },
        "identity_sha256": "46d1b65779be156d097ee625b2ed25430f3f564b225a408c903ff6a04e0e0471",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.known-selected-design-false-acceptance"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "proof.requirement.p0-positive-fixture-correction.exact",
        "kind": "proof_obligation",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/proof_obligations/5"
        },
        "identity_sha256": "e34f2eb24370315fe74df8854a39adebf6fb165b977a44f47d0544bba3fb3f4f",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.p0-positive-fixture-correction"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "proof.requirement.p0-v1-negative-control.exact",
        "kind": "proof_obligation",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/proof_obligations/6"
        },
        "identity_sha256": "cc8357f0904323e9c51e5b8a887f51b4a8f41c29a648dff6f94b707d29f7ab40",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.p0-v1-negative-control"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "proof.requirement.p0-v2-negative-control.exact",
        "kind": "proof_obligation",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/proof_obligations/7"
        },
        "identity_sha256": "848accc649007d91824bdb9608d361facfa3ace64a767bbb9cc808df76adcbed",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.p0-v2-negative-control"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "proof.requirement.shared-exact-comparison-owner.exact",
        "kind": "proof_obligation",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/proof_obligations/8"
        },
        "identity_sha256": "adc308e5b624c88e958dac8ee4276be631521a2ca04c4e2be65a2ef7358b8903",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.shared-exact-comparison-owner"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "proof.requirement.p0-owner-local-and-v3-compatible.exact",
        "kind": "proof_obligation",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/proof_obligations/9"
        },
        "identity_sha256": "d2df7c25bbc506a7486aa47cb9e865f6c04d21597cf8393344313f1f5319e3fc",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.p0-owner-local-and-v3-compatible"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "proof.requirement.p0-verification-boundary.exact",
        "kind": "proof_obligation",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/proof_obligations/10"
        },
        "identity_sha256": "ad34fb2036a34cfc9ad1bae67d239f59cd6c2344a1b478500fdca6c3af2bb8fb",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.p0-verification-boundary"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "proof.requirement.purpose-validity-floor-before-relative-antidegradation.exact",
        "kind": "proof_obligation",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/proof_obligations/11"
        },
        "identity_sha256": "042a171157b771bd301bb273f026ba2d65a186fb06e7b585954ea4557c65b80d",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.purpose-validity-floor-before-relative-antidegradation"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "proof.requirement.invalid-baseline-and-claim-downgrade.exact",
        "kind": "proof_obligation",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/proof_obligations/12"
        },
        "identity_sha256": "926f6e9f1e7e13daafb154ba3af838418f71e180d0e67fa456e5ac69db6ec4f1",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.invalid-baseline-and-claim-downgrade"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "proof.requirement.coverage-defined-by-rejected-attack-surface.exact",
        "kind": "proof_obligation",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/proof_obligations/13"
        },
        "identity_sha256": "bcda4110ba86ae2f08b43f11e11b0627528d8fa16160181453e26de014816320",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.coverage-defined-by-rejected-attack-surface"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "proof.requirement.critical-sentinel-positive-negative-controls.exact",
        "kind": "proof_obligation",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/proof_obligations/14"
        },
        "identity_sha256": "9ca5976eb819ace0642f266810c65a698c8740569673969377ec9c5af8e0cddc",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.critical-sentinel-positive-negative-controls"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "proof.requirement.incident-counterexample-first-rule.exact",
        "kind": "proof_obligation",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/proof_obligations/15"
        },
        "identity_sha256": "ab4177cd5b652d3613a0f81c4f32d642c20fb25d32dfba1a581534523cc4e7eb",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.incident-counterexample-first-rule"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "proof.requirement.sentinel-rationale-evidence-bounded.exact",
        "kind": "proof_obligation",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/proof_obligations/16"
        },
        "identity_sha256": "f9559cde282b3c0b4c44fea32dd0c3b7bdbfc22cd38afb99be886965df8ff62e",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.sentinel-rationale-evidence-bounded"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "proof.requirement.capability-claim-levels.exact",
        "kind": "proof_obligation",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/proof_obligations/17"
        },
        "identity_sha256": "0c4feadea8127d25f7eb2420a2027ac78f4e7147e2b1d46bcdccb3494a4fcd66",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.capability-claim-levels"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "proof.requirement.route-b-project-owner-decision.exact",
        "kind": "proof_obligation",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/proof_obligations/18"
        },
        "identity_sha256": "e5b37fbdaf9bd16310fe450fc57c1c266558ea2ffc4dfa86a100d9ca8a85c59e",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.route-b-project-owner-decision"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "proof.requirement.observation-channel-authority.exact",
        "kind": "proof_obligation",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/proof_obligations/19"
        },
        "identity_sha256": "dd6c8fa80de615611fc46ad3e57b49c6838eb62995d670b966a7ae7f22099604",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.observation-channel-authority"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "proof.requirement.expected-actual-comparison-verdict-ownership.exact",
        "kind": "proof_obligation",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/proof_obligations/20"
        },
        "identity_sha256": "b9069c269809306d3e6c85b151392c943697c966374185e2edfd772a55f3db1d",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.expected-actual-comparison-verdict-ownership"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "proof.requirement.bounded-admitted-artifact-contract.exact",
        "kind": "proof_obligation",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/proof_obligations/21"
        },
        "identity_sha256": "86ea937c9a040ba71209cbd85bdf38c7aeff32e4cb76043a3946b9a764e3ed42",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.bounded-admitted-artifact-contract"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "proof.requirement.actual-artifact-reextraction.exact",
        "kind": "proof_obligation",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/proof_obligations/22"
        },
        "identity_sha256": "55f64485270aed3680996aaef8f30fd52a994ebd610f4fdd701dcdaf1327eabe",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.actual-artifact-reextraction"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "proof.requirement.challenge-is-freshness-only.exact",
        "kind": "proof_obligation",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/proof_obligations/23"
        },
        "identity_sha256": "64943eeb42d55e94caaaaaba8b0b7be99c2231ee12964380e33a5d4ec29fd3a8",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.challenge-is-freshness-only"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "proof.requirement.generated-carrier-semantic-role.exact",
        "kind": "proof_obligation",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/proof_obligations/24"
        },
        "identity_sha256": "6cba85de00209b0a9aa15bffd3de9c7f9c4e30f6dd1cf5dc7e9c286b972115a6",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.generated-carrier-semantic-role"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "proof.requirement.expected-to-actual-self-proof-rejection.exact",
        "kind": "proof_obligation",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/proof_obligations/25"
        },
        "identity_sha256": "faeee424fa9dab90c47970dc8546ee4e3798ca3156fb98f5aed170cc01b40c5b",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.expected-to-actual-self-proof-rejection"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "proof.requirement.production-reachability.exact",
        "kind": "proof_obligation",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/proof_obligations/26"
        },
        "identity_sha256": "69c918ebd5d2c5556084e9f2051638cdcbf4eb7993338adcdd961f64a77e3a24",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.production-reachability"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "proof.requirement.counterfactual-actual-change-and-impact-set.exact",
        "kind": "proof_obligation",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/proof_obligations/27"
        },
        "identity_sha256": "007323799b3479714201e26900b68fef3ebd22d6d0391422b7570d2e95566932",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.counterfactual-actual-change-and-impact-set"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "proof.requirement.selected-design-existing-owner-preservation.exact",
        "kind": "proof_obligation",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/proof_obligations/28"
        },
        "identity_sha256": "2ee712b758a3239b5f6fbd9bc731cfed8621ecdf0331ac3a23065af590812ab3",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.selected-design-existing-owner-preservation"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "proof.requirement.no-universal-ui-observer.exact",
        "kind": "proof_obligation",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/proof_obligations/29"
        },
        "identity_sha256": "3007a569c1d7d986fbce9ba611535b3e65306c29f91f07813389e89cd4d58ac4",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.no-universal-ui-observer"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "proof.requirement.v3-v4-and-migration-rule.exact",
        "kind": "proof_obligation",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/proof_obligations/30"
        },
        "identity_sha256": "49e5e6e39cf8de8321ba79093bdf54aadbc0c7278fdba5526dbc0f018871e88a",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.v3-v4-and-migration-rule"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "proof.requirement.attack-suite-ground-truth.exact",
        "kind": "proof_obligation",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/proof_obligations/31"
        },
        "identity_sha256": "5d2208cee15ddda78017cdd2369e60b2965c6e1be361bb48a816e39e47789c05",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.attack-suite-ground-truth"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "proof.requirement.valid-control-suite.exact",
        "kind": "proof_obligation",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/proof_obligations/32"
        },
        "identity_sha256": "d6eb8976e7469afb352d5782a12d7059b46fa5d4e17bccd1d937110995125dc9",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.valid-control-suite"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "proof.requirement.black-box-final-gate-lifecycle.exact",
        "kind": "proof_obligation",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/proof_obligations/33"
        },
        "identity_sha256": "70af7bb250cdd59ec88afa46acbf2407d0edc12ed288323c2ea7e1e282e13287",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.black-box-final-gate-lifecycle"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "proof.requirement.starward-sanitized-replay.exact",
        "kind": "proof_obligation",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/proof_obligations/34"
        },
        "identity_sha256": "0d3571eb76d254b9ad6225eea4928222c0cc8434eb1891a7dbcaa2c24d93efa3",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.starward-sanitized-replay"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "proof.requirement.fresh-agent-benchmark-boundary.exact",
        "kind": "proof_obligation",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/proof_obligations/35"
        },
        "identity_sha256": "c745bca02f6e8d154c4a76387626eb35e1114f618ca63f76bbce9a410a2b24ef",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.fresh-agent-benchmark-boundary"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "proof.requirement.roi-admission-order.exact",
        "kind": "proof_obligation",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/proof_obligations/36"
        },
        "identity_sha256": "8f0d69d4b301e771635f35a8275b123f6ec5d9036d0843e7becb9f67bc9ed60c",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.roi-admission-order"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "proof.requirement.early-real-entry-feedback.exact",
        "kind": "proof_obligation",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/proof_obligations/37"
        },
        "identity_sha256": "03eb684512abb41d8e9f6b3b49c4fd8a2c1ac499dce141474275e8438fcfdcc8",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.early-real-entry-feedback"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "proof.requirement.no-new-lifecycle-authority-registry.exact",
        "kind": "proof_obligation",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/proof_obligations/38"
        },
        "identity_sha256": "4b1b50856d0f39a8f8703949db48c2d7399f2bfc4ff14535a13c1338ce1b6b47",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.no-new-lifecycle-authority-registry"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "proof.requirement.owner-dependency-lifecycle-boundary.exact",
        "kind": "proof_obligation",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/proof_obligations/39"
        },
        "identity_sha256": "df5246dc1e48c72746011e388b35ae053e4242826c84246b05928d582f3f8c3f",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.owner-dependency-lifecycle-boundary"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "proof.requirement.build-reuse-buy-allowed-set.exact",
        "kind": "proof_obligation",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/proof_obligations/40"
        },
        "identity_sha256": "5621484a2a189e493d77fdfb8c6d2bf8719d64520d664a5c7ecf44466fda8126",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.build-reuse-buy-allowed-set"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "proof.requirement.technical-debt-and-future-change.exact",
        "kind": "proof_obligation",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/proof_obligations/41"
        },
        "identity_sha256": "b26eba927673707644a5657e04b12d34b361ff6884b8f92a634a7b33128e6adc",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.technical-debt-and-future-change"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "proof.requirement.compatibility-security-resource-boundaries.exact",
        "kind": "proof_obligation",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/proof_obligations/42"
        },
        "identity_sha256": "5631d8caf1643288286a5676d3ce136e4ea1b31930bd37cf91594a94e7540cb9",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.compatibility-security-resource-boundaries"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "proof.requirement.context-and-public-authority-update.exact",
        "kind": "proof_obligation",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/proof_obligations/43"
        },
        "identity_sha256": "84fc4a8755b7a529dacff9a04b904e06894a817ed935fdb5b914fd679ed31d88",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.context-and-public-authority-update"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "proof.requirement.verification-sequence-and-current-candidate.exact",
        "kind": "proof_obligation",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/proof_obligations/44"
        },
        "identity_sha256": "424164d3a896b6dc1c2985176b7dd0dc9ca1a1affcd4e5a42113f9e45b8098b6",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.verification-sequence-and-current-candidate"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "proof.requirement.final-hard-acceptance.exact",
        "kind": "proof_obligation",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/proof_obligations/45"
        },
        "identity_sha256": "a734a8992a0651d55eedcb6b18dabe27baff1fa25df92806bc9214360bbe3dc2",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.final-hard-acceptance"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "proof.requirement.approved-final-capability-wording.exact",
        "kind": "proof_obligation",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/proof_obligations/46"
        },
        "identity_sha256": "98c5bdc6ce34b5c73a02fe4119e79d6627603cfc50949ad98a87d4b18fa1eb8c",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.approved-final-capability-wording"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "proof.requirement.critical-scope-escape-risk.exact",
        "kind": "proof_obligation",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/proof_obligations/47"
        },
        "identity_sha256": "a547afb6e610b31196e75eb728dd8b3e388da534719cbffe81b341d4cc2bcb5e",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.critical-scope-escape-risk"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "proof.requirement.critical-self-attestation-risk.exact",
        "kind": "proof_obligation",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/proof_obligations/48"
        },
        "identity_sha256": "2684ebed8e95ed34921c3c40b330f03774979dbbd5b2ff1e375962ec2c9e3925",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.critical-self-attestation-risk"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "proof.requirement.critical-claim-inflation-risk.exact",
        "kind": "proof_obligation",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/proof_obligations/49"
        },
        "identity_sha256": "7aaaa857435c545c946ac8ff180cec6dc88d07ef936918adb5579d5918796f5e",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.critical-claim-inflation-risk"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "oracle.long-task-real-capability",
        "kind": "oracle",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/oracles/0"
        },
        "identity_sha256": "aad5ef5d20f63455c1390fccc8dc403c1582311908a0cae73ad6378531fc429a",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.actual-artifact-reextraction",
          "fact.requirement.approved-final-capability-wording",
          "fact.requirement.assurance-causal-chain",
          "fact.requirement.attack-suite-ground-truth",
          "fact.requirement.black-box-final-gate-lifecycle",
          "fact.requirement.bounded-admitted-artifact-contract",
          "fact.requirement.build-reuse-buy-allowed-set",
          "fact.requirement.capability-claim-levels",
          "fact.requirement.challenge-is-freshness-only",
          "fact.requirement.compatibility-security-resource-boundaries",
          "fact.requirement.context-and-public-authority-update",
          "fact.requirement.counterfactual-actual-change-and-impact-set",
          "fact.requirement.coverage-defined-by-rejected-attack-surface",
          "fact.requirement.critical-claim-inflation-risk",
          "fact.requirement.critical-scope-escape-risk",
          "fact.requirement.critical-self-attestation-risk",
          "fact.requirement.critical-sentinel-positive-negative-controls",
          "fact.requirement.declared-assurance-theorem",
          "fact.requirement.early-real-entry-feedback",
          "fact.requirement.expected-actual-comparison-verdict-ownership",
          "fact.requirement.expected-to-actual-self-proof-rejection",
          "fact.requirement.final-hard-acceptance",
          "fact.requirement.fresh-agent-benchmark-boundary",
          "fact.requirement.generated-carrier-semantic-role",
          "fact.requirement.incident-counterexample-first-rule",
          "fact.requirement.invalid-baseline-and-claim-downgrade",
          "fact.requirement.known-selected-design-false-acceptance",
          "fact.requirement.material-input-provenance",
          "fact.requirement.no-new-lifecycle-authority-registry",
          "fact.requirement.no-universal-ui-observer",
          "fact.requirement.observation-channel-authority",
          "fact.requirement.owner-dependency-lifecycle-boundary",
          "fact.requirement.p0-owner-local-and-v3-compatible",
          "fact.requirement.p0-positive-fixture-correction",
          "fact.requirement.p0-v1-negative-control",
          "fact.requirement.p0-v2-negative-control",
          "fact.requirement.p0-verification-boundary",
          "fact.requirement.production-reachability",
          "fact.requirement.purpose-validity-floor-before-relative-antidegradation",
          "fact.requirement.real-capability-closure-result",
          "fact.requirement.roi-admission-order",
          "fact.requirement.route-b-project-owner-decision",
          "fact.requirement.selected-design-existing-owner-preservation",
          "fact.requirement.sentinel-rationale-evidence-bounded",
          "fact.requirement.shared-exact-comparison-owner",
          "fact.requirement.starward-sanitized-replay",
          "fact.requirement.technical-debt-and-future-change",
          "fact.requirement.v3-v4-and-migration-rule",
          "fact.requirement.valid-control-suite",
          "fact.requirement.verification-sequence-and-current-candidate"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      },
      {
        "key": "environment.long-task-real-capability",
        "kind": "environment",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/environments/0"
        },
        "identity_sha256": "063091a0aa9cdada3f10ebddfee3c25cb1a46545ba8875ce6d415a66e3d7dc77",
        "disposition": "material_with_facts",
        "fact_refs": [
          "fact.requirement.actual-artifact-reextraction",
          "fact.requirement.approved-final-capability-wording",
          "fact.requirement.assurance-causal-chain",
          "fact.requirement.attack-suite-ground-truth",
          "fact.requirement.black-box-final-gate-lifecycle",
          "fact.requirement.bounded-admitted-artifact-contract",
          "fact.requirement.build-reuse-buy-allowed-set",
          "fact.requirement.capability-claim-levels",
          "fact.requirement.challenge-is-freshness-only",
          "fact.requirement.compatibility-security-resource-boundaries",
          "fact.requirement.context-and-public-authority-update",
          "fact.requirement.counterfactual-actual-change-and-impact-set",
          "fact.requirement.coverage-defined-by-rejected-attack-surface",
          "fact.requirement.critical-claim-inflation-risk",
          "fact.requirement.critical-scope-escape-risk",
          "fact.requirement.critical-self-attestation-risk",
          "fact.requirement.critical-sentinel-positive-negative-controls",
          "fact.requirement.declared-assurance-theorem",
          "fact.requirement.early-real-entry-feedback",
          "fact.requirement.expected-actual-comparison-verdict-ownership",
          "fact.requirement.expected-to-actual-self-proof-rejection",
          "fact.requirement.final-hard-acceptance",
          "fact.requirement.fresh-agent-benchmark-boundary",
          "fact.requirement.generated-carrier-semantic-role",
          "fact.requirement.incident-counterexample-first-rule",
          "fact.requirement.invalid-baseline-and-claim-downgrade",
          "fact.requirement.known-selected-design-false-acceptance",
          "fact.requirement.material-input-provenance",
          "fact.requirement.no-new-lifecycle-authority-registry",
          "fact.requirement.no-universal-ui-observer",
          "fact.requirement.observation-channel-authority",
          "fact.requirement.owner-dependency-lifecycle-boundary",
          "fact.requirement.p0-owner-local-and-v3-compatible",
          "fact.requirement.p0-positive-fixture-correction",
          "fact.requirement.p0-v1-negative-control",
          "fact.requirement.p0-v2-negative-control",
          "fact.requirement.p0-verification-boundary",
          "fact.requirement.production-reachability",
          "fact.requirement.purpose-validity-floor-before-relative-antidegradation",
          "fact.requirement.real-capability-closure-result",
          "fact.requirement.roi-admission-order",
          "fact.requirement.route-b-project-owner-decision",
          "fact.requirement.selected-design-existing-owner-preservation",
          "fact.requirement.sentinel-rationale-evidence-bounded",
          "fact.requirement.shared-exact-comparison-owner",
          "fact.requirement.starward-sanitized-replay",
          "fact.requirement.technical-debt-and-future-change",
          "fact.requirement.v3-v4-and-migration-rule",
          "fact.requirement.valid-control-suite",
          "fact.requirement.verification-sequence-and-current-candidate"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "This census identity contributes to an exact fixture Fact."
      }
    ]
  },
  "generation": {
    "strategy": "complete_explicit",
    "sampling": "forbidden",
    "truncation": "forbidden",
    "chunk_count": 1,
    "chunk_indexes": [
      0
    ],
    "collections": [
      {
        "name": "inputs",
        "expected_count": 66,
        "identity_sha256": "e85871679da76ce090819d2ace62dfdefceb3a2c811eed102bbb8e9e38ee9460"
      },
      {
        "name": "inspector_census",
        "expected_count": 348,
        "identity_sha256": "a1134cf96c6345d78086017d0d62b52eabf249e68b9143cb481986049225ea1f"
      },
      {
        "name": "family_dispositions",
        "expected_count": 32,
        "identity_sha256": "04d7a319119a08d75092072eeef1c0f6d5730abdc6741f093deb273c9388f67f"
      },
      {
        "name": "subjects",
        "expected_count": 50,
        "identity_sha256": "9875ab463a05287cceeb3b2341d8dacb6f2ad76861e1906831d0b4fdf553589e"
      },
      {
        "name": "relations",
        "expected_count": 0,
        "identity_sha256": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945"
      },
      {
        "name": "populations",
        "expected_count": 0,
        "identity_sha256": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945"
      },
      {
        "name": "axis_dispositions",
        "expected_count": 43,
        "identity_sha256": "85cced017897a068764826059844520b3090347a774e93765281885a9036d73f"
      },
      {
        "name": "condition_rules",
        "expected_count": 0,
        "identity_sha256": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945"
      },
      {
        "name": "conditions",
        "expected_count": 4,
        "identity_sha256": "9945cd2bfc0014a4d4c1fe579024ba35f5c012b8e3bb906032d4e3aac55b76fd"
      },
      {
        "name": "condition_exclusions",
        "expected_count": 0,
        "identity_sha256": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945"
      },
      {
        "name": "property_dispositions",
        "expected_count": 1,
        "identity_sha256": "e3835b2f5802c104e157d46651cd71ea406a2f896128bda8105c84fdf4a8c950"
      },
      {
        "name": "fact_cells",
        "expected_count": 50,
        "identity_sha256": "61557ca32bfafa584e32b2ef0323d2f62ceb1e98ffd21cdee7d0e108fc166376"
      },
      {
        "name": "facts",
        "expected_count": 50,
        "identity_sha256": "d197b68ad8a809c54ef3c606ffaab2ad73cc894ab8373cecfb4f2ce78b0aa43b"
      },
      {
        "name": "proof_obligations",
        "expected_count": 50,
        "identity_sha256": "2a1faf0d265d42916da671656e7c54e63b22f3e18b3c88f6c80dae32cb2365c6"
      },
      {
        "name": "oracles",
        "expected_count": 1,
        "identity_sha256": "217ddbe7dfb437a6e0af3d24855a5e1e43ac133418ed9b9d1e749a24dcf79dc7"
      },
      {
        "name": "environments",
        "expected_count": 1,
        "identity_sha256": "3977fb5879cccde76676df718ed49fcb98f80c2dd57eac7ed7773ecffe687245"
      },
      {
        "name": "blockers",
        "expected_count": 0,
        "identity_sha256": "4f53cda18c2baa0c0354bb5f9a3ecbe5ed12ab4d8e11ba873c2f11161202b945"
      }
    ]
  },
  "inputs": [
    {
      "key": "input.source.real-capability-closure-result",
      "kind": "source_item",
      "source_ref": "real-capability-closure-result",
      "sha256": "1002a5940af39aa8a0d275855b6ed79b5a0aee42fd57341f0736b7f250c2b638",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.real-capability-closure-result"
      ],
      "basis_refs": [
        "real-capability-closure-result"
      ],
      "rationale": "The marked Source item owns one independently traceable requirement Fact."
    },
    {
      "key": "input.source.material-input-provenance",
      "kind": "source_item",
      "source_ref": "material-input-provenance",
      "sha256": "1ee3e8f6c86b2fed8ab4fdd22a3baad46f96f4e730ba96cbb3e387160cebbaa6",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.material-input-provenance"
      ],
      "basis_refs": [
        "material-input-provenance"
      ],
      "rationale": "The marked Source item owns one independently traceable requirement Fact."
    },
    {
      "key": "input.source.declared-assurance-theorem",
      "kind": "source_item",
      "source_ref": "declared-assurance-theorem",
      "sha256": "51bcf26e1d84e6c51158d80fa8f4b99cbc1980686e497979e4dd5ed7d1e4a042",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.declared-assurance-theorem"
      ],
      "basis_refs": [
        "declared-assurance-theorem"
      ],
      "rationale": "The marked Source item owns one independently traceable requirement Fact."
    },
    {
      "key": "input.source.assurance-causal-chain",
      "kind": "source_item",
      "source_ref": "assurance-causal-chain",
      "sha256": "fe6aa551c117a5032c84b31340b7fac50d318d474827c70210a5758d0cd44b48",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.assurance-causal-chain"
      ],
      "basis_refs": [
        "assurance-causal-chain"
      ],
      "rationale": "The marked Source item owns one independently traceable requirement Fact."
    },
    {
      "key": "input.source.known-selected-design-false-acceptance",
      "kind": "source_item",
      "source_ref": "known-selected-design-false-acceptance",
      "sha256": "144d2dee7aedbf28e3822c5b44f04fda764e9b3db534889473b9feb284b04d22",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.known-selected-design-false-acceptance"
      ],
      "basis_refs": [
        "known-selected-design-false-acceptance"
      ],
      "rationale": "The marked Source item owns one independently traceable requirement Fact."
    },
    {
      "key": "input.source.p0-positive-fixture-correction",
      "kind": "source_item",
      "source_ref": "p0-positive-fixture-correction",
      "sha256": "2279bcfa3eec9b70c0652aefec47eb5ddf7dedebe1c7fe96cc64944d5bfcb9dd",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.p0-positive-fixture-correction"
      ],
      "basis_refs": [
        "p0-positive-fixture-correction"
      ],
      "rationale": "The marked Source item owns one independently traceable requirement Fact."
    },
    {
      "key": "input.source.p0-v1-negative-control",
      "kind": "source_item",
      "source_ref": "p0-v1-negative-control",
      "sha256": "2951f076c648308a0feca9eba59ce5fc3fa6f25c48fe86fecbf469d12008d176",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.p0-v1-negative-control"
      ],
      "basis_refs": [
        "p0-v1-negative-control"
      ],
      "rationale": "The marked Source item owns one independently traceable requirement Fact."
    },
    {
      "key": "input.source.p0-v2-negative-control",
      "kind": "source_item",
      "source_ref": "p0-v2-negative-control",
      "sha256": "23a04c231c23f285d4ede3eddf9fca1498fda0fdc0e98e056137541180a48cff",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.p0-v2-negative-control"
      ],
      "basis_refs": [
        "p0-v2-negative-control"
      ],
      "rationale": "The marked Source item owns one independently traceable requirement Fact."
    },
    {
      "key": "input.source.shared-exact-comparison-owner",
      "kind": "source_item",
      "source_ref": "shared-exact-comparison-owner",
      "sha256": "fbdcb1ae3efb78bc2063bde1b4138bfdc7f90b1c086c865587fdf6c6a9bf58d7",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.shared-exact-comparison-owner"
      ],
      "basis_refs": [
        "shared-exact-comparison-owner"
      ],
      "rationale": "The marked Source item owns one independently traceable requirement Fact."
    },
    {
      "key": "input.source.p0-owner-local-and-v3-compatible",
      "kind": "source_item",
      "source_ref": "p0-owner-local-and-v3-compatible",
      "sha256": "008ca45fe7124796e35aa380f5e75b90bd9e5693d285862394a2641385690a80",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.p0-owner-local-and-v3-compatible"
      ],
      "basis_refs": [
        "p0-owner-local-and-v3-compatible"
      ],
      "rationale": "The marked Source item owns one independently traceable requirement Fact."
    },
    {
      "key": "input.source.p0-verification-boundary",
      "kind": "source_item",
      "source_ref": "p0-verification-boundary",
      "sha256": "fcd9ddfd8598ea00c22f0eb6bf1d96e64e646991ac2e55634cb8441acdda7a52",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.p0-verification-boundary"
      ],
      "basis_refs": [
        "p0-verification-boundary"
      ],
      "rationale": "The marked Source item owns one independently traceable requirement Fact."
    },
    {
      "key": "input.source.purpose-validity-floor-before-relative-antidegradation",
      "kind": "source_item",
      "source_ref": "purpose-validity-floor-before-relative-antidegradation",
      "sha256": "d7f2fabb54e2d9aa802efe6b5670cecb7b9f1af3269868fc3e8e160986d715f0",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.purpose-validity-floor-before-relative-antidegradation"
      ],
      "basis_refs": [
        "purpose-validity-floor-before-relative-antidegradation"
      ],
      "rationale": "The marked Source item owns one independently traceable requirement Fact."
    },
    {
      "key": "input.source.invalid-baseline-and-claim-downgrade",
      "kind": "source_item",
      "source_ref": "invalid-baseline-and-claim-downgrade",
      "sha256": "8fb4ab0d0ffe1858fdfb6e8f40e66abfd018129bebc72e860823e46d2a9909d0",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.invalid-baseline-and-claim-downgrade"
      ],
      "basis_refs": [
        "invalid-baseline-and-claim-downgrade"
      ],
      "rationale": "The marked Source item owns one independently traceable requirement Fact."
    },
    {
      "key": "input.source.coverage-defined-by-rejected-attack-surface",
      "kind": "source_item",
      "source_ref": "coverage-defined-by-rejected-attack-surface",
      "sha256": "a35451468fa7b1bc152e1081d9d8c17cbacc7f1908e4818cab9e953afb91227f",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.coverage-defined-by-rejected-attack-surface"
      ],
      "basis_refs": [
        "coverage-defined-by-rejected-attack-surface"
      ],
      "rationale": "The marked Source item owns one independently traceable requirement Fact."
    },
    {
      "key": "input.source.critical-sentinel-positive-negative-controls",
      "kind": "source_item",
      "source_ref": "critical-sentinel-positive-negative-controls",
      "sha256": "93a14f3d2bbffcb66d1b5df4f2c163d4ae48d6b26d5a7fcaf8d1812c2ece8dd8",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.critical-sentinel-positive-negative-controls"
      ],
      "basis_refs": [
        "critical-sentinel-positive-negative-controls"
      ],
      "rationale": "The marked Source item owns one independently traceable requirement Fact."
    },
    {
      "key": "input.source.incident-counterexample-first-rule",
      "kind": "source_item",
      "source_ref": "incident-counterexample-first-rule",
      "sha256": "e96374e2366e1393dbef2ae1e75f116748908675e7cde754deeae4ac810f2695",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.incident-counterexample-first-rule"
      ],
      "basis_refs": [
        "incident-counterexample-first-rule"
      ],
      "rationale": "The marked Source item owns one independently traceable requirement Fact."
    },
    {
      "key": "input.source.sentinel-rationale-evidence-bounded",
      "kind": "source_item",
      "source_ref": "sentinel-rationale-evidence-bounded",
      "sha256": "c44740fdb123854f1013f57414b4a8f18b42e4c662541472628618ecdd571135",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.sentinel-rationale-evidence-bounded"
      ],
      "basis_refs": [
        "sentinel-rationale-evidence-bounded"
      ],
      "rationale": "The marked Source item owns one independently traceable requirement Fact."
    },
    {
      "key": "input.source.capability-claim-levels",
      "kind": "source_item",
      "source_ref": "capability-claim-levels",
      "sha256": "60f120b715fd228f33c0a9ad955d8064e9ccfb15263fe8c39e0cec0d31a3761f",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.capability-claim-levels"
      ],
      "basis_refs": [
        "capability-claim-levels"
      ],
      "rationale": "The marked Source item owns one independently traceable requirement Fact."
    },
    {
      "key": "input.source.route-b-project-owner-decision",
      "kind": "source_item",
      "source_ref": "route-b-project-owner-decision",
      "sha256": "68d69b272727ce873538d4885fbdd66381b439c18efe1d9d48d5994dec8b5c2d",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.route-b-project-owner-decision"
      ],
      "basis_refs": [
        "route-b-project-owner-decision"
      ],
      "rationale": "The marked Source item owns one independently traceable requirement Fact."
    },
    {
      "key": "input.source.observation-channel-authority",
      "kind": "source_item",
      "source_ref": "observation-channel-authority",
      "sha256": "13b42ced570bc32ec4ac05e51f8f4380ffb0d1faa35fcb958a6b74dee8b0c132",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.observation-channel-authority"
      ],
      "basis_refs": [
        "observation-channel-authority"
      ],
      "rationale": "The marked Source item owns one independently traceable requirement Fact."
    },
    {
      "key": "input.source.expected-actual-comparison-verdict-ownership",
      "kind": "source_item",
      "source_ref": "expected-actual-comparison-verdict-ownership",
      "sha256": "6a1f3d133527a8a76b8ebe2cc8a3bd457bab8e575afed95cf42ffa81f7ad5204",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.expected-actual-comparison-verdict-ownership"
      ],
      "basis_refs": [
        "expected-actual-comparison-verdict-ownership"
      ],
      "rationale": "The marked Source item owns one independently traceable requirement Fact."
    },
    {
      "key": "input.source.bounded-admitted-artifact-contract",
      "kind": "source_item",
      "source_ref": "bounded-admitted-artifact-contract",
      "sha256": "d3d0ef1a2c84f29a996644b2cbb68f68e97d094d43a0baca6d55e303bf8e3548",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.bounded-admitted-artifact-contract"
      ],
      "basis_refs": [
        "bounded-admitted-artifact-contract"
      ],
      "rationale": "The marked Source item owns one independently traceable requirement Fact."
    },
    {
      "key": "input.source.actual-artifact-reextraction",
      "kind": "source_item",
      "source_ref": "actual-artifact-reextraction",
      "sha256": "d80f0c0ae9bd46955ae990837724dcfae85f1e51a1ab73f4a029ad6956acb90a",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.actual-artifact-reextraction"
      ],
      "basis_refs": [
        "actual-artifact-reextraction"
      ],
      "rationale": "The marked Source item owns one independently traceable requirement Fact."
    },
    {
      "key": "input.source.challenge-is-freshness-only",
      "kind": "source_item",
      "source_ref": "challenge-is-freshness-only",
      "sha256": "1bc8d4d0b31ff68c5aaf302d124c01d9295782b4637fff17c7f8b36bc005006a",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.challenge-is-freshness-only"
      ],
      "basis_refs": [
        "challenge-is-freshness-only"
      ],
      "rationale": "The marked Source item owns one independently traceable requirement Fact."
    },
    {
      "key": "input.source.generated-carrier-semantic-role",
      "kind": "source_item",
      "source_ref": "generated-carrier-semantic-role",
      "sha256": "6f010ae3b3758e8e5afacd499e37be23fe67e87b2263018919ae9d6fb102bce9",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.generated-carrier-semantic-role"
      ],
      "basis_refs": [
        "generated-carrier-semantic-role"
      ],
      "rationale": "The marked Source item owns one independently traceable requirement Fact."
    },
    {
      "key": "input.source.expected-to-actual-self-proof-rejection",
      "kind": "source_item",
      "source_ref": "expected-to-actual-self-proof-rejection",
      "sha256": "f276c195caae1f98b82d3fa84d37b759342654388547e9fab254b713bbc7184e",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.expected-to-actual-self-proof-rejection"
      ],
      "basis_refs": [
        "expected-to-actual-self-proof-rejection"
      ],
      "rationale": "The marked Source item owns one independently traceable requirement Fact."
    },
    {
      "key": "input.source.production-reachability",
      "kind": "source_item",
      "source_ref": "production-reachability",
      "sha256": "fa50c5ed2e1e255d531febd3b4e89090f818831db185ff5a9cf5ed211fcdba47",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.production-reachability"
      ],
      "basis_refs": [
        "production-reachability"
      ],
      "rationale": "The marked Source item owns one independently traceable requirement Fact."
    },
    {
      "key": "input.source.counterfactual-actual-change-and-impact-set",
      "kind": "source_item",
      "source_ref": "counterfactual-actual-change-and-impact-set",
      "sha256": "2d42986c358e5770e64c511b2d817504e2846e6635ebf313f9e73ee2e6a4c9cf",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.counterfactual-actual-change-and-impact-set"
      ],
      "basis_refs": [
        "counterfactual-actual-change-and-impact-set"
      ],
      "rationale": "The marked Source item owns one independently traceable requirement Fact."
    },
    {
      "key": "input.source.selected-design-existing-owner-preservation",
      "kind": "source_item",
      "source_ref": "selected-design-existing-owner-preservation",
      "sha256": "304db83febfc6deb5c362b5f13b06835097f30981d6952e4510f1b5d1b5501b9",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.selected-design-existing-owner-preservation"
      ],
      "basis_refs": [
        "selected-design-existing-owner-preservation"
      ],
      "rationale": "The marked Source item owns one independently traceable requirement Fact."
    },
    {
      "key": "input.source.no-universal-ui-observer",
      "kind": "source_item",
      "source_ref": "no-universal-ui-observer",
      "sha256": "313430d6191e83a956d54f0ee9dae1c5902aadb4e8ab8b11b4420dc45e85e11e",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.no-universal-ui-observer"
      ],
      "basis_refs": [
        "no-universal-ui-observer"
      ],
      "rationale": "The marked Source item owns one independently traceable requirement Fact."
    },
    {
      "key": "input.source.v3-v4-and-migration-rule",
      "kind": "source_item",
      "source_ref": "v3-v4-and-migration-rule",
      "sha256": "9a974eb3c2ecd5508e4f7ab47231ab6a6498f5273819a808dbbc2c444a2bc08e",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.v3-v4-and-migration-rule"
      ],
      "basis_refs": [
        "v3-v4-and-migration-rule"
      ],
      "rationale": "The marked Source item owns one independently traceable requirement Fact."
    },
    {
      "key": "input.source.attack-suite-ground-truth",
      "kind": "source_item",
      "source_ref": "attack-suite-ground-truth",
      "sha256": "837167ff9f39a7c76720d62fd6f068d79105ff01dc50eb7f0bfd713511583093",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.attack-suite-ground-truth"
      ],
      "basis_refs": [
        "attack-suite-ground-truth"
      ],
      "rationale": "The marked Source item owns one independently traceable requirement Fact."
    },
    {
      "key": "input.source.valid-control-suite",
      "kind": "source_item",
      "source_ref": "valid-control-suite",
      "sha256": "6c5b9076d847ca0bc6f54e4b41afd91f4b28738ca5389589b2333405b74dfd2f",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.valid-control-suite"
      ],
      "basis_refs": [
        "valid-control-suite"
      ],
      "rationale": "The marked Source item owns one independently traceable requirement Fact."
    },
    {
      "key": "input.source.black-box-final-gate-lifecycle",
      "kind": "source_item",
      "source_ref": "black-box-final-gate-lifecycle",
      "sha256": "ed7b93817e80228884c3277839cc6bad808afd26cb3384248436951a9873e213",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.black-box-final-gate-lifecycle"
      ],
      "basis_refs": [
        "black-box-final-gate-lifecycle"
      ],
      "rationale": "The marked Source item owns one independently traceable requirement Fact."
    },
    {
      "key": "input.source.starward-sanitized-replay",
      "kind": "source_item",
      "source_ref": "starward-sanitized-replay",
      "sha256": "f9ec5589c7bb4caed4c45a31e19fd282bcc049f41c3a26f6040baf5253a4087d",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.starward-sanitized-replay"
      ],
      "basis_refs": [
        "starward-sanitized-replay"
      ],
      "rationale": "The marked Source item owns one independently traceable requirement Fact."
    },
    {
      "key": "input.source.fresh-agent-benchmark-boundary",
      "kind": "source_item",
      "source_ref": "fresh-agent-benchmark-boundary",
      "sha256": "e9530673e7472459294277800b444c24f7c041490ced622ed38e526458bbbb3e",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.fresh-agent-benchmark-boundary"
      ],
      "basis_refs": [
        "fresh-agent-benchmark-boundary"
      ],
      "rationale": "The marked Source item owns one independently traceable requirement Fact."
    },
    {
      "key": "input.source.roi-admission-order",
      "kind": "source_item",
      "source_ref": "roi-admission-order",
      "sha256": "bf93904bd63b59252dc13ddb1dde73209acf646a1a6309fd7809dccb578f8a8f",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.roi-admission-order"
      ],
      "basis_refs": [
        "roi-admission-order"
      ],
      "rationale": "The marked Source item owns one independently traceable requirement Fact."
    },
    {
      "key": "input.source.early-real-entry-feedback",
      "kind": "source_item",
      "source_ref": "early-real-entry-feedback",
      "sha256": "a5cadb249446917e0c68b5d7a301f6bb8703a17b855707ed4e168376c7e17aae",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.early-real-entry-feedback"
      ],
      "basis_refs": [
        "early-real-entry-feedback"
      ],
      "rationale": "The marked Source item owns one independently traceable requirement Fact."
    },
    {
      "key": "input.source.no-new-lifecycle-authority-registry",
      "kind": "source_item",
      "source_ref": "no-new-lifecycle-authority-registry",
      "sha256": "19fb4594b0337e99ca50e281d17ded749ffcc33b3aa3c9d4dd8ee0451ae32bdc",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.no-new-lifecycle-authority-registry"
      ],
      "basis_refs": [
        "no-new-lifecycle-authority-registry"
      ],
      "rationale": "The marked Source item owns one independently traceable requirement Fact."
    },
    {
      "key": "input.source.owner-dependency-lifecycle-boundary",
      "kind": "source_item",
      "source_ref": "owner-dependency-lifecycle-boundary",
      "sha256": "c165518ffae3cf3ee9bc80db5076e6137ab2cb78ef1510ac0302759d0a23181f",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.owner-dependency-lifecycle-boundary"
      ],
      "basis_refs": [
        "owner-dependency-lifecycle-boundary"
      ],
      "rationale": "The marked Source item owns one independently traceable requirement Fact."
    },
    {
      "key": "input.source.build-reuse-buy-allowed-set",
      "kind": "source_item",
      "source_ref": "build-reuse-buy-allowed-set",
      "sha256": "6074a9ad06c4a0ee9b1c8ada701db6bdacf436ec03940773b6926ab8b32709e9",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.build-reuse-buy-allowed-set"
      ],
      "basis_refs": [
        "build-reuse-buy-allowed-set"
      ],
      "rationale": "The marked Source item owns one independently traceable requirement Fact."
    },
    {
      "key": "input.source.technical-debt-and-future-change",
      "kind": "source_item",
      "source_ref": "technical-debt-and-future-change",
      "sha256": "6c6d9109a36ac4d2e729c6b7ded6967df855aae3e16630e9f4cf2fc1f6e19f26",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.technical-debt-and-future-change"
      ],
      "basis_refs": [
        "technical-debt-and-future-change"
      ],
      "rationale": "The marked Source item owns one independently traceable requirement Fact."
    },
    {
      "key": "input.source.compatibility-security-resource-boundaries",
      "kind": "source_item",
      "source_ref": "compatibility-security-resource-boundaries",
      "sha256": "3512b6adfe30bdcbcebe1b58e6c2557bc4db0e09c65f11d2f965ee29e9bd200d",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.compatibility-security-resource-boundaries"
      ],
      "basis_refs": [
        "compatibility-security-resource-boundaries"
      ],
      "rationale": "The marked Source item owns one independently traceable requirement Fact."
    },
    {
      "key": "input.source.context-and-public-authority-update",
      "kind": "source_item",
      "source_ref": "context-and-public-authority-update",
      "sha256": "da5c9b91771f6415d127e8caf95f3e7c7a9e0bc0941acd52c2143697957a1790",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.context-and-public-authority-update"
      ],
      "basis_refs": [
        "context-and-public-authority-update"
      ],
      "rationale": "The marked Source item owns one independently traceable requirement Fact."
    },
    {
      "key": "input.source.verification-sequence-and-current-candidate",
      "kind": "source_item",
      "source_ref": "verification-sequence-and-current-candidate",
      "sha256": "ebfc1db198d6c343304a6050e4192bcca895ac5fd97a63a128c9156ceb310617",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.verification-sequence-and-current-candidate"
      ],
      "basis_refs": [
        "verification-sequence-and-current-candidate"
      ],
      "rationale": "The marked Source item owns one independently traceable requirement Fact."
    },
    {
      "key": "input.source.final-hard-acceptance",
      "kind": "source_item",
      "source_ref": "final-hard-acceptance",
      "sha256": "ccd21c838ac3ca85ac4e9758b3dfbedace86aae04330936ea7ee2992b5ef060a",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.final-hard-acceptance"
      ],
      "basis_refs": [
        "final-hard-acceptance"
      ],
      "rationale": "The marked Source item owns one independently traceable requirement Fact."
    },
    {
      "key": "input.source.approved-final-capability-wording",
      "kind": "source_item",
      "source_ref": "approved-final-capability-wording",
      "sha256": "d1999a47683655357049c5712e6cebd646f1935ec3cdb73332380a6c5b7b3444",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.approved-final-capability-wording"
      ],
      "basis_refs": [
        "approved-final-capability-wording"
      ],
      "rationale": "The marked Source item owns one independently traceable requirement Fact."
    },
    {
      "key": "input.source.critical-scope-escape-risk",
      "kind": "source_item",
      "source_ref": "critical-scope-escape-risk",
      "sha256": "c6e3ec8b6d6937c4c6205210f36c721c7269d6f7707e69c93c153a3d3f6530bd",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.critical-scope-escape-risk"
      ],
      "basis_refs": [
        "critical-scope-escape-risk"
      ],
      "rationale": "The marked Source item owns one independently traceable requirement Fact."
    },
    {
      "key": "input.source.critical-self-attestation-risk",
      "kind": "source_item",
      "source_ref": "critical-self-attestation-risk",
      "sha256": "7d977055f491bd6dac46497d59def93454adaf41169ccfc6d6e1b74957f40616",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.critical-self-attestation-risk"
      ],
      "basis_refs": [
        "critical-self-attestation-risk"
      ],
      "rationale": "The marked Source item owns one independently traceable requirement Fact."
    },
    {
      "key": "input.source.critical-claim-inflation-risk",
      "kind": "source_item",
      "source_ref": "critical-claim-inflation-risk",
      "sha256": "34e9bc67b4ec589f77e2e5d66bfd9ef34744d4e5e93b6aa2ef14a92ebff4e685",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.critical-claim-inflation-risk"
      ],
      "basis_refs": [
        "critical-claim-inflation-risk"
      ],
      "rationale": "The marked Source item owns one independently traceable requirement Fact."
    },
    {
      "key": "input.context.project-context-architecture-md",
      "kind": "context",
      "source_ref": "project_context/architecture.md",
      "sha256": "4c3d7e570429727cc1e4fa2622d6d46c3d15e10ec013a1b9e5e2d8b63a6f60a5",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.material-input-provenance"
      ],
      "basis_refs": [
        "material-input-provenance"
      ],
      "rationale": "The complete Context snapshot is classified and bound to its owning requirement Fact."
    },
    {
      "key": "input.context.project-context-areas-delivery-benchmark-md",
      "kind": "context",
      "source_ref": "project_context/areas/delivery-benchmark.md",
      "sha256": "a7a4b9e663e59b98cf0969270df373264806c3a46d8ac0b7c2b4d6a7a85624ee",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.fresh-agent-benchmark-boundary"
      ],
      "basis_refs": [
        "fresh-agent-benchmark-boundary"
      ],
      "rationale": "The complete Context snapshot is classified and bound to its owning requirement Fact."
    },
    {
      "key": "input.context.project-context-areas-harness-package-md",
      "kind": "context",
      "source_ref": "project_context/areas/harness-package.md",
      "sha256": "436c527d073f0e5456d4113c8854f130e198ab8f388a540f3bda2dffcb762343",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.material-input-provenance"
      ],
      "basis_refs": [
        "material-input-provenance"
      ],
      "rationale": "The complete Context snapshot is classified and bound to its owning requirement Fact."
    },
    {
      "key": "input.context.project-context-areas-harness-package-contracts-design-resource-authoring-md",
      "kind": "context",
      "source_ref": "project_context/areas/harness-package/contracts/design-resource-authoring.md",
      "sha256": "e4e18e2f9637b626832812d3e4432e8c9c8e45f253210a0bf045c501dd6ca54d",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.material-input-provenance"
      ],
      "basis_refs": [
        "material-input-provenance"
      ],
      "rationale": "The complete Context snapshot is classified and bound to its owning requirement Fact."
    },
    {
      "key": "input.context.project-context-areas-harness-package-contracts-design-resource-handoff-md",
      "kind": "context",
      "source_ref": "project_context/areas/harness-package/contracts/design-resource-handoff.md",
      "sha256": "059851902064173a0048fb05fd3b1fa38aa19f7d9f3a0cf80b68e1a984dc5035",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.selected-design-existing-owner-preservation"
      ],
      "basis_refs": [
        "selected-design-existing-owner-preservation"
      ],
      "rationale": "The complete Context snapshot is classified and bound to its owning requirement Fact."
    },
    {
      "key": "input.context.project-context-areas-harness-package-contracts-package-managed-surfaces-md",
      "kind": "context",
      "source_ref": "project_context/areas/harness-package/contracts/package-managed-surfaces.md",
      "sha256": "ef5419673d3425b4b9ee9d20e70579a66a31807bcf47e241c951074195c7e166",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.context-and-public-authority-update"
      ],
      "basis_refs": [
        "context-and-public-authority-update"
      ],
      "rationale": "The complete Context snapshot is classified and bound to its owning requirement Fact."
    },
    {
      "key": "input.context.project-context-areas-harness-package-contracts-temporary-content-governance-md",
      "kind": "context",
      "source_ref": "project_context/areas/harness-package/contracts/temporary-content-governance.md",
      "sha256": "79ec4b522db8a22e4301c130658b7818eec1945b32cb83f377e59de7a3cb599b",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.material-input-provenance"
      ],
      "basis_refs": [
        "material-input-provenance"
      ],
      "rationale": "The complete Context snapshot is classified and bound to its owning requirement Fact."
    },
    {
      "key": "input.context.project-context-areas-harness-package-contracts-workflow-contract-md",
      "kind": "context",
      "source_ref": "project_context/areas/harness-package/contracts/workflow-contract.md",
      "sha256": "306f15e8c9ffd4060eeba48b091cb2fa80abd08f9ce420aed9a926ab8c066abb",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.no-new-lifecycle-authority-registry"
      ],
      "basis_refs": [
        "no-new-lifecycle-authority-registry"
      ],
      "rationale": "The complete Context snapshot is classified and bound to its owning requirement Fact."
    },
    {
      "key": "input.context.project-context-areas-harness-package-decision-rationale-architecture-quality-md",
      "kind": "context",
      "source_ref": "project_context/areas/harness-package/decision-rationale/architecture-quality.md",
      "sha256": "5ee05ac6a62197203029109ded0421b340b4ae94908a867ed8d44dd1dfc61d5a",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.build-reuse-buy-allowed-set"
      ],
      "basis_refs": [
        "build-reuse-buy-allowed-set"
      ],
      "rationale": "The complete Context snapshot is classified and bound to its owning requirement Fact."
    },
    {
      "key": "input.context.project-context-areas-harness-package-decision-rationale-long-task-workflow-md",
      "kind": "context",
      "source_ref": "project_context/areas/harness-package/decision-rationale/long-task-workflow.md",
      "sha256": "e56dfee89b0b8630112fcd280ae3b615529182d3d23f58bf80d71da2b63e6c54",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.route-b-project-owner-decision"
      ],
      "basis_refs": [
        "route-b-project-owner-decision"
      ],
      "rationale": "The complete Context snapshot is classified and bound to its owning requirement Fact."
    },
    {
      "key": "input.context.project-context-areas-harness-package-decision-rationale-minimal-context-md",
      "kind": "context",
      "source_ref": "project_context/areas/harness-package/decision-rationale/minimal-context.md",
      "sha256": "4e0b701c4b283e5e7fa8ab5a4c71db7d8731ea401c44fdad6d61e935a5dbe9b0",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.material-input-provenance"
      ],
      "basis_refs": [
        "material-input-provenance"
      ],
      "rationale": "The complete Context snapshot is classified and bound to its owning requirement Fact."
    },
    {
      "key": "input.context.project-context-areas-harness-package-foundation-context-model-md",
      "kind": "context",
      "source_ref": "project_context/areas/harness-package/foundation/context-model.md",
      "sha256": "f94a3856e5d5aaee3c0e86110b5d1cebdbea5d7e1cc8ae5815e480a5cafd0847",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.material-input-provenance"
      ],
      "basis_refs": [
        "material-input-provenance"
      ],
      "rationale": "The complete Context snapshot is classified and bound to its owning requirement Fact."
    },
    {
      "key": "input.context.project-context-areas-harness-package-implementation-index-md",
      "kind": "context",
      "source_ref": "project_context/areas/harness-package/implementation-index.md",
      "sha256": "8d0a2b68a77ad309712341d97b4c88e7a252e12422a401b4e2e0047d7b9ef239",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.owner-dependency-lifecycle-boundary"
      ],
      "basis_refs": [
        "owner-dependency-lifecycle-boundary"
      ],
      "rationale": "The complete Context snapshot is classified and bound to its owning requirement Fact."
    },
    {
      "key": "input.context.project-context-areas-harness-package-verification-md",
      "kind": "context",
      "source_ref": "project_context/areas/harness-package/verification.md",
      "sha256": "2f91ef99314a7095e01d36040896072393e807199b16df91830c43cc0ff297b2",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.verification-sequence-and-current-candidate"
      ],
      "basis_refs": [
        "verification-sequence-and-current-candidate"
      ],
      "rationale": "The complete Context snapshot is classified and bound to its owning requirement Fact."
    },
    {
      "key": "input.context.project-context-context-toml",
      "kind": "context",
      "source_ref": "project_context/context.toml",
      "sha256": "5f2d97366b6a8e349502b9a7abb34c7627e6a5bc684ad0f179cf988790512e32",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.material-input-provenance"
      ],
      "basis_refs": [
        "material-input-provenance"
      ],
      "rationale": "The complete Context snapshot is classified and bound to its owning requirement Fact."
    },
    {
      "key": "input.context.project-context-global-md",
      "kind": "context",
      "source_ref": "project_context/global.md",
      "sha256": "addb3000ad4d67b94724864852ac31d7d26c8a218b0d63d2a4930ef535d57fcb",
      "disposition": "non_ui_material",
      "fact_refs": [
        "fact.requirement.material-input-provenance"
      ],
      "basis_refs": [
        "material-input-provenance"
      ],
      "rationale": "The complete Context snapshot is classified and bound to its owning requirement Fact."
    }
  ],
  "family_dispositions": [
    {
      "key": "family.standard-goal-scope-glossary",
      "family": "goal_scope_glossary",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "source_item_refs": [
        "material-input-provenance"
      ],
      "basis_refs": [
        "material-input-provenance"
      ],
      "rationale": "This bounded mechanism-delivery Source uses the custom real-capability family; this standard family has no additional independently specified Fact."
    },
    {
      "key": "family.standard-actor-role-tenant-entitlement",
      "family": "actor_role_tenant_entitlement",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "source_item_refs": [
        "material-input-provenance"
      ],
      "basis_refs": [
        "material-input-provenance"
      ],
      "rationale": "This bounded mechanism-delivery Source uses the custom real-capability family; this standard family has no additional independently specified Fact."
    },
    {
      "key": "family.standard-business-rule-calculation",
      "family": "business_rule_calculation",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "source_item_refs": [
        "material-input-provenance"
      ],
      "basis_refs": [
        "material-input-provenance"
      ],
      "rationale": "This bounded mechanism-delivery Source uses the custom real-capability family; this standard family has no additional independently specified Fact."
    },
    {
      "key": "family.standard-data-model",
      "family": "data_model",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "source_item_refs": [
        "material-input-provenance"
      ],
      "basis_refs": [
        "material-input-provenance"
      ],
      "rationale": "This bounded mechanism-delivery Source uses the custom real-capability family; this standard family has no additional independently specified Fact."
    },
    {
      "key": "family.standard-operation-workflow",
      "family": "operation_workflow",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "source_item_refs": [
        "material-input-provenance"
      ],
      "basis_refs": [
        "material-input-provenance"
      ],
      "rationale": "This bounded mechanism-delivery Source uses the custom real-capability family; this standard family has no additional independently specified Fact."
    },
    {
      "key": "family.standard-state-machine",
      "family": "state_machine",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "source_item_refs": [
        "material-input-provenance"
      ],
      "basis_refs": [
        "material-input-provenance"
      ],
      "rationale": "This bounded mechanism-delivery Source uses the custom real-capability family; this standard family has no additional independently specified Fact."
    },
    {
      "key": "family.standard-temporal-scheduling",
      "family": "temporal_scheduling",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "source_item_refs": [
        "material-input-provenance"
      ],
      "basis_refs": [
        "material-input-provenance"
      ],
      "rationale": "This bounded mechanism-delivery Source uses the custom real-capability family; this standard family has no additional independently specified Fact."
    },
    {
      "key": "family.standard-input-validation",
      "family": "input_validation",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "source_item_refs": [
        "material-input-provenance"
      ],
      "basis_refs": [
        "material-input-provenance"
      ],
      "rationale": "This bounded mechanism-delivery Source uses the custom real-capability family; this standard family has no additional independently specified Fact."
    },
    {
      "key": "family.standard-output-error",
      "family": "output_error",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "source_item_refs": [
        "material-input-provenance"
      ],
      "basis_refs": [
        "material-input-provenance"
      ],
      "rationale": "This bounded mechanism-delivery Source uses the custom real-capability family; this standard family has no additional independently specified Fact."
    },
    {
      "key": "family.standard-api-protocol",
      "family": "api_protocol",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "source_item_refs": [
        "material-input-provenance"
      ],
      "basis_refs": [
        "material-input-provenance"
      ],
      "rationale": "This bounded mechanism-delivery Source uses the custom real-capability family; this standard family has no additional independently specified Fact."
    },
    {
      "key": "family.standard-event-message-job",
      "family": "event_message_job",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "source_item_refs": [
        "material-input-provenance"
      ],
      "basis_refs": [
        "material-input-provenance"
      ],
      "rationale": "This bounded mechanism-delivery Source uses the custom real-capability family; this standard family has no additional independently specified Fact."
    },
    {
      "key": "family.standard-persistence-cache-search",
      "family": "persistence_cache_search",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "source_item_refs": [
        "material-input-provenance"
      ],
      "basis_refs": [
        "material-input-provenance"
      ],
      "rationale": "This bounded mechanism-delivery Source uses the custom real-capability family; this standard family has no additional independently specified Fact."
    },
    {
      "key": "family.standard-transaction-consistency-concurrency-idempotency",
      "family": "transaction_consistency_concurrency_idempotency",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "source_item_refs": [
        "material-input-provenance"
      ],
      "basis_refs": [
        "material-input-provenance"
      ],
      "rationale": "This bounded mechanism-delivery Source uses the custom real-capability family; this standard family has no additional independently specified Fact."
    },
    {
      "key": "family.standard-fault-degradation-recovery",
      "family": "fault_degradation_recovery",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "source_item_refs": [
        "material-input-provenance"
      ],
      "basis_refs": [
        "material-input-provenance"
      ],
      "rationale": "This bounded mechanism-delivery Source uses the custom real-capability family; this standard family has no additional independently specified Fact."
    },
    {
      "key": "family.standard-backup-restore-disaster-recovery",
      "family": "backup_restore_disaster_recovery",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "source_item_refs": [
        "material-input-provenance"
      ],
      "basis_refs": [
        "material-input-provenance"
      ],
      "rationale": "This bounded mechanism-delivery Source uses the custom real-capability family; this standard family has no additional independently specified Fact."
    },
    {
      "key": "family.standard-configuration-feature-flag-secret",
      "family": "configuration_feature_flag_secret",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "source_item_refs": [
        "material-input-provenance"
      ],
      "basis_refs": [
        "material-input-provenance"
      ],
      "rationale": "This bounded mechanism-delivery Source uses the custom real-capability family; this standard family has no additional independently specified Fact."
    },
    {
      "key": "family.standard-compatibility-migration-rollout",
      "family": "compatibility_migration_rollout",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "source_item_refs": [
        "material-input-provenance"
      ],
      "basis_refs": [
        "material-input-provenance"
      ],
      "rationale": "This bounded mechanism-delivery Source uses the custom real-capability family; this standard family has no additional independently specified Fact."
    },
    {
      "key": "family.standard-performance-capacity-cost",
      "family": "performance_capacity_cost",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "source_item_refs": [
        "material-input-provenance"
      ],
      "basis_refs": [
        "material-input-provenance"
      ],
      "rationale": "This bounded mechanism-delivery Source uses the custom real-capability family; this standard family has no additional independently specified Fact."
    },
    {
      "key": "family.standard-reliability-slo",
      "family": "reliability_slo",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "source_item_refs": [
        "material-input-provenance"
      ],
      "basis_refs": [
        "material-input-provenance"
      ],
      "rationale": "This bounded mechanism-delivery Source uses the custom real-capability family; this standard family has no additional independently specified Fact."
    },
    {
      "key": "family.standard-security",
      "family": "security",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "source_item_refs": [
        "material-input-provenance"
      ],
      "basis_refs": [
        "material-input-provenance"
      ],
      "rationale": "This bounded mechanism-delivery Source uses the custom real-capability family; this standard family has no additional independently specified Fact."
    },
    {
      "key": "family.standard-privacy",
      "family": "privacy",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "source_item_refs": [
        "material-input-provenance"
      ],
      "basis_refs": [
        "material-input-provenance"
      ],
      "rationale": "This bounded mechanism-delivery Source uses the custom real-capability family; this standard family has no additional independently specified Fact."
    },
    {
      "key": "family.standard-safety-compliance",
      "family": "safety_compliance",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "source_item_refs": [
        "material-input-provenance"
      ],
      "basis_refs": [
        "material-input-provenance"
      ],
      "rationale": "This bounded mechanism-delivery Source uses the custom real-capability family; this standard family has no additional independently specified Fact."
    },
    {
      "key": "family.standard-observability",
      "family": "observability",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "source_item_refs": [
        "material-input-provenance"
      ],
      "basis_refs": [
        "material-input-provenance"
      ],
      "rationale": "This bounded mechanism-delivery Source uses the custom real-capability family; this standard family has no additional independently specified Fact."
    },
    {
      "key": "family.standard-deployment-topology",
      "family": "deployment_topology",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "source_item_refs": [
        "material-input-provenance"
      ],
      "basis_refs": [
        "material-input-provenance"
      ],
      "rationale": "This bounded mechanism-delivery Source uses the custom real-capability family; this standard family has no additional independently specified Fact."
    },
    {
      "key": "family.standard-external-integration",
      "family": "external_integration",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "source_item_refs": [
        "material-input-provenance"
      ],
      "basis_refs": [
        "material-input-provenance"
      ],
      "rationale": "This bounded mechanism-delivery Source uses the custom real-capability family; this standard family has no additional independently specified Fact."
    },
    {
      "key": "family.standard-notification-file-media",
      "family": "notification_file_media",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "source_item_refs": [
        "material-input-provenance"
      ],
      "basis_refs": [
        "material-input-provenance"
      ],
      "rationale": "This bounded mechanism-delivery Source uses the custom real-capability family; this standard family has no additional independently specified Fact."
    },
    {
      "key": "family.standard-localization",
      "family": "localization",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "source_item_refs": [
        "material-input-provenance"
      ],
      "basis_refs": [
        "material-input-provenance"
      ],
      "rationale": "This bounded mechanism-delivery Source uses the custom real-capability family; this standard family has no additional independently specified Fact."
    },
    {
      "key": "family.standard-commercial-billing",
      "family": "commercial_billing",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "source_item_refs": [
        "material-input-provenance"
      ],
      "basis_refs": [
        "material-input-provenance"
      ],
      "rationale": "This bounded mechanism-delivery Source uses the custom real-capability family; this standard family has no additional independently specified Fact."
    },
    {
      "key": "family.standard-hardware-sensor",
      "family": "hardware_sensor",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "source_item_refs": [
        "material-input-provenance"
      ],
      "basis_refs": [
        "material-input-provenance"
      ],
      "rationale": "This bounded mechanism-delivery Source uses the custom real-capability family; this standard family has no additional independently specified Fact."
    },
    {
      "key": "family.standard-ai-ml",
      "family": "ai_ml",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "source_item_refs": [
        "material-input-provenance"
      ],
      "basis_refs": [
        "material-input-provenance"
      ],
      "rationale": "This bounded mechanism-delivery Source uses the custom real-capability family; this standard family has no additional independently specified Fact."
    },
    {
      "key": "family.standard-architecture-ownership",
      "family": "architecture_ownership",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "source_item_refs": [
        "material-input-provenance"
      ],
      "basis_refs": [
        "material-input-provenance"
      ],
      "rationale": "This bounded mechanism-delivery Source uses the custom real-capability family; this standard family has no additional independently specified Fact."
    },
    {
      "key": "family.custom-long-task-real-capability",
      "family": "custom.long_task_real_capability",
      "standard": false,
      "disposition": "applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "source_item_refs": [
        "real-capability-closure-result",
        "material-input-provenance",
        "declared-assurance-theorem",
        "assurance-causal-chain",
        "known-selected-design-false-acceptance",
        "p0-positive-fixture-correction",
        "p0-v1-negative-control",
        "p0-v2-negative-control",
        "shared-exact-comparison-owner",
        "p0-owner-local-and-v3-compatible",
        "p0-verification-boundary",
        "purpose-validity-floor-before-relative-antidegradation",
        "invalid-baseline-and-claim-downgrade",
        "coverage-defined-by-rejected-attack-surface",
        "critical-sentinel-positive-negative-controls",
        "incident-counterexample-first-rule",
        "sentinel-rationale-evidence-bounded",
        "capability-claim-levels",
        "route-b-project-owner-decision",
        "observation-channel-authority",
        "expected-actual-comparison-verdict-ownership",
        "bounded-admitted-artifact-contract",
        "actual-artifact-reextraction",
        "challenge-is-freshness-only",
        "generated-carrier-semantic-role",
        "expected-to-actual-self-proof-rejection",
        "production-reachability",
        "counterfactual-actual-change-and-impact-set",
        "selected-design-existing-owner-preservation",
        "no-universal-ui-observer",
        "v3-v4-and-migration-rule",
        "attack-suite-ground-truth",
        "valid-control-suite",
        "black-box-final-gate-lifecycle",
        "starward-sanitized-replay",
        "fresh-agent-benchmark-boundary",
        "roi-admission-order",
        "early-real-entry-feedback",
        "no-new-lifecycle-authority-registry",
        "owner-dependency-lifecycle-boundary",
        "build-reuse-buy-allowed-set",
        "technical-debt-and-future-change",
        "compatibility-security-resource-boundaries",
        "context-and-public-authority-update",
        "verification-sequence-and-current-candidate",
        "final-hard-acceptance",
        "approved-final-capability-wording",
        "critical-scope-escape-risk",
        "critical-self-attestation-risk",
        "critical-claim-inflation-risk"
      ],
      "basis_refs": [
        "real-capability-closure-result",
        "material-input-provenance"
      ],
      "rationale": "The Source explicitly defines atomic P0, assurance-governance, observer/TCB and proof/ROI requirements for this mechanism delivery."
    }
  ],
  "subjects": [
    {
      "key": "subject.requirement.real-capability-closure-result",
      "family_ref": "family.custom-long-task-real-capability",
      "outcome_ref": "proof-and-roi",
      "kind": "requirement",
      "parent_ref": null,
      "owner_ref": "owner.harness-package",
      "source_item_refs": [
        "real-capability-closure-result"
      ],
      "basis_refs": [
        "real-capability-closure-result"
      ]
    },
    {
      "key": "subject.requirement.material-input-provenance",
      "family_ref": "family.custom-long-task-real-capability",
      "outcome_ref": "proof-and-roi",
      "kind": "requirement",
      "parent_ref": null,
      "owner_ref": "owner.harness-package",
      "source_item_refs": [
        "material-input-provenance"
      ],
      "basis_refs": [
        "material-input-provenance"
      ]
    },
    {
      "key": "subject.requirement.declared-assurance-theorem",
      "family_ref": "family.custom-long-task-real-capability",
      "outcome_ref": "proof-and-roi",
      "kind": "requirement",
      "parent_ref": null,
      "owner_ref": "owner.harness-package",
      "source_item_refs": [
        "declared-assurance-theorem"
      ],
      "basis_refs": [
        "declared-assurance-theorem"
      ]
    },
    {
      "key": "subject.requirement.assurance-causal-chain",
      "family_ref": "family.custom-long-task-real-capability",
      "outcome_ref": "proof-and-roi",
      "kind": "requirement",
      "parent_ref": null,
      "owner_ref": "owner.harness-package",
      "source_item_refs": [
        "assurance-causal-chain"
      ],
      "basis_refs": [
        "assurance-causal-chain"
      ]
    },
    {
      "key": "subject.requirement.known-selected-design-false-acceptance",
      "family_ref": "family.custom-long-task-real-capability",
      "outcome_ref": "p0-exact-recomputation",
      "kind": "requirement",
      "parent_ref": null,
      "owner_ref": "owner.harness-package",
      "source_item_refs": [
        "known-selected-design-false-acceptance"
      ],
      "basis_refs": [
        "known-selected-design-false-acceptance"
      ]
    },
    {
      "key": "subject.requirement.p0-positive-fixture-correction",
      "family_ref": "family.custom-long-task-real-capability",
      "outcome_ref": "p0-exact-recomputation",
      "kind": "requirement",
      "parent_ref": null,
      "owner_ref": "owner.harness-package",
      "source_item_refs": [
        "p0-positive-fixture-correction"
      ],
      "basis_refs": [
        "p0-positive-fixture-correction"
      ]
    },
    {
      "key": "subject.requirement.p0-v1-negative-control",
      "family_ref": "family.custom-long-task-real-capability",
      "outcome_ref": "p0-exact-recomputation",
      "kind": "requirement",
      "parent_ref": null,
      "owner_ref": "owner.harness-package",
      "source_item_refs": [
        "p0-v1-negative-control"
      ],
      "basis_refs": [
        "p0-v1-negative-control"
      ]
    },
    {
      "key": "subject.requirement.p0-v2-negative-control",
      "family_ref": "family.custom-long-task-real-capability",
      "outcome_ref": "p0-exact-recomputation",
      "kind": "requirement",
      "parent_ref": null,
      "owner_ref": "owner.harness-package",
      "source_item_refs": [
        "p0-v2-negative-control"
      ],
      "basis_refs": [
        "p0-v2-negative-control"
      ]
    },
    {
      "key": "subject.requirement.shared-exact-comparison-owner",
      "family_ref": "family.custom-long-task-real-capability",
      "outcome_ref": "p0-exact-recomputation",
      "kind": "requirement",
      "parent_ref": null,
      "owner_ref": "owner.harness-package",
      "source_item_refs": [
        "shared-exact-comparison-owner"
      ],
      "basis_refs": [
        "shared-exact-comparison-owner"
      ]
    },
    {
      "key": "subject.requirement.p0-owner-local-and-v3-compatible",
      "family_ref": "family.custom-long-task-real-capability",
      "outcome_ref": "p0-exact-recomputation",
      "kind": "requirement",
      "parent_ref": null,
      "owner_ref": "owner.harness-package",
      "source_item_refs": [
        "p0-owner-local-and-v3-compatible"
      ],
      "basis_refs": [
        "p0-owner-local-and-v3-compatible"
      ]
    },
    {
      "key": "subject.requirement.p0-verification-boundary",
      "family_ref": "family.custom-long-task-real-capability",
      "outcome_ref": "p0-exact-recomputation",
      "kind": "requirement",
      "parent_ref": null,
      "owner_ref": "owner.harness-package",
      "source_item_refs": [
        "p0-verification-boundary"
      ],
      "basis_refs": [
        "p0-verification-boundary"
      ]
    },
    {
      "key": "subject.requirement.purpose-validity-floor-before-relative-antidegradation",
      "family_ref": "family.custom-long-task-real-capability",
      "outcome_ref": "assurance-governance",
      "kind": "requirement",
      "parent_ref": null,
      "owner_ref": "owner.harness-package",
      "source_item_refs": [
        "purpose-validity-floor-before-relative-antidegradation"
      ],
      "basis_refs": [
        "purpose-validity-floor-before-relative-antidegradation"
      ]
    },
    {
      "key": "subject.requirement.invalid-baseline-and-claim-downgrade",
      "family_ref": "family.custom-long-task-real-capability",
      "outcome_ref": "assurance-governance",
      "kind": "requirement",
      "parent_ref": null,
      "owner_ref": "owner.harness-package",
      "source_item_refs": [
        "invalid-baseline-and-claim-downgrade"
      ],
      "basis_refs": [
        "invalid-baseline-and-claim-downgrade"
      ]
    },
    {
      "key": "subject.requirement.coverage-defined-by-rejected-attack-surface",
      "family_ref": "family.custom-long-task-real-capability",
      "outcome_ref": "assurance-governance",
      "kind": "requirement",
      "parent_ref": null,
      "owner_ref": "owner.harness-package",
      "source_item_refs": [
        "coverage-defined-by-rejected-attack-surface"
      ],
      "basis_refs": [
        "coverage-defined-by-rejected-attack-surface"
      ]
    },
    {
      "key": "subject.requirement.critical-sentinel-positive-negative-controls",
      "family_ref": "family.custom-long-task-real-capability",
      "outcome_ref": "assurance-governance",
      "kind": "requirement",
      "parent_ref": null,
      "owner_ref": "owner.harness-package",
      "source_item_refs": [
        "critical-sentinel-positive-negative-controls"
      ],
      "basis_refs": [
        "critical-sentinel-positive-negative-controls"
      ]
    },
    {
      "key": "subject.requirement.incident-counterexample-first-rule",
      "family_ref": "family.custom-long-task-real-capability",
      "outcome_ref": "assurance-governance",
      "kind": "requirement",
      "parent_ref": null,
      "owner_ref": "owner.harness-package",
      "source_item_refs": [
        "incident-counterexample-first-rule"
      ],
      "basis_refs": [
        "incident-counterexample-first-rule"
      ]
    },
    {
      "key": "subject.requirement.sentinel-rationale-evidence-bounded",
      "family_ref": "family.custom-long-task-real-capability",
      "outcome_ref": "assurance-governance",
      "kind": "requirement",
      "parent_ref": null,
      "owner_ref": "owner.harness-package",
      "source_item_refs": [
        "sentinel-rationale-evidence-bounded"
      ],
      "basis_refs": [
        "sentinel-rationale-evidence-bounded"
      ]
    },
    {
      "key": "subject.requirement.capability-claim-levels",
      "family_ref": "family.custom-long-task-real-capability",
      "outcome_ref": "assurance-governance",
      "kind": "requirement",
      "parent_ref": null,
      "owner_ref": "owner.harness-package",
      "source_item_refs": [
        "capability-claim-levels"
      ],
      "basis_refs": [
        "capability-claim-levels"
      ]
    },
    {
      "key": "subject.requirement.route-b-project-owner-decision",
      "family_ref": "family.custom-long-task-real-capability",
      "outcome_ref": "observer-tcb-closure",
      "kind": "requirement",
      "parent_ref": null,
      "owner_ref": "owner.harness-package",
      "source_item_refs": [
        "route-b-project-owner-decision"
      ],
      "basis_refs": [
        "route-b-project-owner-decision"
      ]
    },
    {
      "key": "subject.requirement.observation-channel-authority",
      "family_ref": "family.custom-long-task-real-capability",
      "outcome_ref": "observer-tcb-closure",
      "kind": "requirement",
      "parent_ref": null,
      "owner_ref": "owner.harness-package",
      "source_item_refs": [
        "observation-channel-authority"
      ],
      "basis_refs": [
        "observation-channel-authority"
      ]
    },
    {
      "key": "subject.requirement.expected-actual-comparison-verdict-ownership",
      "family_ref": "family.custom-long-task-real-capability",
      "outcome_ref": "observer-tcb-closure",
      "kind": "requirement",
      "parent_ref": null,
      "owner_ref": "owner.harness-package",
      "source_item_refs": [
        "expected-actual-comparison-verdict-ownership"
      ],
      "basis_refs": [
        "expected-actual-comparison-verdict-ownership"
      ]
    },
    {
      "key": "subject.requirement.bounded-admitted-artifact-contract",
      "family_ref": "family.custom-long-task-real-capability",
      "outcome_ref": "observer-tcb-closure",
      "kind": "requirement",
      "parent_ref": null,
      "owner_ref": "owner.harness-package",
      "source_item_refs": [
        "bounded-admitted-artifact-contract"
      ],
      "basis_refs": [
        "bounded-admitted-artifact-contract"
      ]
    },
    {
      "key": "subject.requirement.actual-artifact-reextraction",
      "family_ref": "family.custom-long-task-real-capability",
      "outcome_ref": "observer-tcb-closure",
      "kind": "requirement",
      "parent_ref": null,
      "owner_ref": "owner.harness-package",
      "source_item_refs": [
        "actual-artifact-reextraction"
      ],
      "basis_refs": [
        "actual-artifact-reextraction"
      ]
    },
    {
      "key": "subject.requirement.challenge-is-freshness-only",
      "family_ref": "family.custom-long-task-real-capability",
      "outcome_ref": "observer-tcb-closure",
      "kind": "requirement",
      "parent_ref": null,
      "owner_ref": "owner.harness-package",
      "source_item_refs": [
        "challenge-is-freshness-only"
      ],
      "basis_refs": [
        "challenge-is-freshness-only"
      ]
    },
    {
      "key": "subject.requirement.generated-carrier-semantic-role",
      "family_ref": "family.custom-long-task-real-capability",
      "outcome_ref": "observer-tcb-closure",
      "kind": "requirement",
      "parent_ref": null,
      "owner_ref": "owner.harness-package",
      "source_item_refs": [
        "generated-carrier-semantic-role"
      ],
      "basis_refs": [
        "generated-carrier-semantic-role"
      ]
    },
    {
      "key": "subject.requirement.expected-to-actual-self-proof-rejection",
      "family_ref": "family.custom-long-task-real-capability",
      "outcome_ref": "observer-tcb-closure",
      "kind": "requirement",
      "parent_ref": null,
      "owner_ref": "owner.harness-package",
      "source_item_refs": [
        "expected-to-actual-self-proof-rejection"
      ],
      "basis_refs": [
        "expected-to-actual-self-proof-rejection"
      ]
    },
    {
      "key": "subject.requirement.production-reachability",
      "family_ref": "family.custom-long-task-real-capability",
      "outcome_ref": "observer-tcb-closure",
      "kind": "requirement",
      "parent_ref": null,
      "owner_ref": "owner.harness-package",
      "source_item_refs": [
        "production-reachability"
      ],
      "basis_refs": [
        "production-reachability"
      ]
    },
    {
      "key": "subject.requirement.counterfactual-actual-change-and-impact-set",
      "family_ref": "family.custom-long-task-real-capability",
      "outcome_ref": "observer-tcb-closure",
      "kind": "requirement",
      "parent_ref": null,
      "owner_ref": "owner.harness-package",
      "source_item_refs": [
        "counterfactual-actual-change-and-impact-set"
      ],
      "basis_refs": [
        "counterfactual-actual-change-and-impact-set"
      ]
    },
    {
      "key": "subject.requirement.selected-design-existing-owner-preservation",
      "family_ref": "family.custom-long-task-real-capability",
      "outcome_ref": "p0-exact-recomputation",
      "kind": "requirement",
      "parent_ref": null,
      "owner_ref": "owner.harness-package",
      "source_item_refs": [
        "selected-design-existing-owner-preservation"
      ],
      "basis_refs": [
        "selected-design-existing-owner-preservation"
      ]
    },
    {
      "key": "subject.requirement.no-universal-ui-observer",
      "family_ref": "family.custom-long-task-real-capability",
      "outcome_ref": "observer-tcb-closure",
      "kind": "requirement",
      "parent_ref": null,
      "owner_ref": "owner.harness-package",
      "source_item_refs": [
        "no-universal-ui-observer"
      ],
      "basis_refs": [
        "no-universal-ui-observer"
      ]
    },
    {
      "key": "subject.requirement.v3-v4-and-migration-rule",
      "family_ref": "family.custom-long-task-real-capability",
      "outcome_ref": "observer-tcb-closure",
      "kind": "requirement",
      "parent_ref": null,
      "owner_ref": "owner.harness-package",
      "source_item_refs": [
        "v3-v4-and-migration-rule"
      ],
      "basis_refs": [
        "v3-v4-and-migration-rule"
      ]
    },
    {
      "key": "subject.requirement.attack-suite-ground-truth",
      "family_ref": "family.custom-long-task-real-capability",
      "outcome_ref": "proof-and-roi",
      "kind": "requirement",
      "parent_ref": null,
      "owner_ref": "owner.harness-package",
      "source_item_refs": [
        "attack-suite-ground-truth"
      ],
      "basis_refs": [
        "attack-suite-ground-truth"
      ]
    },
    {
      "key": "subject.requirement.valid-control-suite",
      "family_ref": "family.custom-long-task-real-capability",
      "outcome_ref": "proof-and-roi",
      "kind": "requirement",
      "parent_ref": null,
      "owner_ref": "owner.harness-package",
      "source_item_refs": [
        "valid-control-suite"
      ],
      "basis_refs": [
        "valid-control-suite"
      ]
    },
    {
      "key": "subject.requirement.black-box-final-gate-lifecycle",
      "family_ref": "family.custom-long-task-real-capability",
      "outcome_ref": "proof-and-roi",
      "kind": "requirement",
      "parent_ref": null,
      "owner_ref": "owner.harness-package",
      "source_item_refs": [
        "black-box-final-gate-lifecycle"
      ],
      "basis_refs": [
        "black-box-final-gate-lifecycle"
      ]
    },
    {
      "key": "subject.requirement.starward-sanitized-replay",
      "family_ref": "family.custom-long-task-real-capability",
      "outcome_ref": "proof-and-roi",
      "kind": "requirement",
      "parent_ref": null,
      "owner_ref": "owner.harness-package",
      "source_item_refs": [
        "starward-sanitized-replay"
      ],
      "basis_refs": [
        "starward-sanitized-replay"
      ]
    },
    {
      "key": "subject.requirement.fresh-agent-benchmark-boundary",
      "family_ref": "family.custom-long-task-real-capability",
      "outcome_ref": "proof-and-roi",
      "kind": "requirement",
      "parent_ref": null,
      "owner_ref": "owner.harness-package",
      "source_item_refs": [
        "fresh-agent-benchmark-boundary"
      ],
      "basis_refs": [
        "fresh-agent-benchmark-boundary"
      ]
    },
    {
      "key": "subject.requirement.roi-admission-order",
      "family_ref": "family.custom-long-task-real-capability",
      "outcome_ref": "proof-and-roi",
      "kind": "requirement",
      "parent_ref": null,
      "owner_ref": "owner.harness-package",
      "source_item_refs": [
        "roi-admission-order"
      ],
      "basis_refs": [
        "roi-admission-order"
      ]
    },
    {
      "key": "subject.requirement.early-real-entry-feedback",
      "family_ref": "family.custom-long-task-real-capability",
      "outcome_ref": "proof-and-roi",
      "kind": "requirement",
      "parent_ref": null,
      "owner_ref": "owner.harness-package",
      "source_item_refs": [
        "early-real-entry-feedback"
      ],
      "basis_refs": [
        "early-real-entry-feedback"
      ]
    },
    {
      "key": "subject.requirement.no-new-lifecycle-authority-registry",
      "family_ref": "family.custom-long-task-real-capability",
      "outcome_ref": "assurance-governance",
      "kind": "requirement",
      "parent_ref": null,
      "owner_ref": "owner.harness-package",
      "source_item_refs": [
        "no-new-lifecycle-authority-registry"
      ],
      "basis_refs": [
        "no-new-lifecycle-authority-registry"
      ]
    },
    {
      "key": "subject.requirement.owner-dependency-lifecycle-boundary",
      "family_ref": "family.custom-long-task-real-capability",
      "outcome_ref": "observer-tcb-closure",
      "kind": "requirement",
      "parent_ref": null,
      "owner_ref": "owner.harness-package",
      "source_item_refs": [
        "owner-dependency-lifecycle-boundary"
      ],
      "basis_refs": [
        "owner-dependency-lifecycle-boundary"
      ]
    },
    {
      "key": "subject.requirement.build-reuse-buy-allowed-set",
      "family_ref": "family.custom-long-task-real-capability",
      "outcome_ref": "observer-tcb-closure",
      "kind": "requirement",
      "parent_ref": null,
      "owner_ref": "owner.harness-package",
      "source_item_refs": [
        "build-reuse-buy-allowed-set"
      ],
      "basis_refs": [
        "build-reuse-buy-allowed-set"
      ]
    },
    {
      "key": "subject.requirement.technical-debt-and-future-change",
      "family_ref": "family.custom-long-task-real-capability",
      "outcome_ref": "p0-exact-recomputation",
      "kind": "requirement",
      "parent_ref": null,
      "owner_ref": "owner.harness-package",
      "source_item_refs": [
        "technical-debt-and-future-change"
      ],
      "basis_refs": [
        "technical-debt-and-future-change"
      ]
    },
    {
      "key": "subject.requirement.compatibility-security-resource-boundaries",
      "family_ref": "family.custom-long-task-real-capability",
      "outcome_ref": "observer-tcb-closure",
      "kind": "requirement",
      "parent_ref": null,
      "owner_ref": "owner.harness-package",
      "source_item_refs": [
        "compatibility-security-resource-boundaries"
      ],
      "basis_refs": [
        "compatibility-security-resource-boundaries"
      ]
    },
    {
      "key": "subject.requirement.context-and-public-authority-update",
      "family_ref": "family.custom-long-task-real-capability",
      "outcome_ref": "proof-and-roi",
      "kind": "requirement",
      "parent_ref": null,
      "owner_ref": "owner.harness-package",
      "source_item_refs": [
        "context-and-public-authority-update"
      ],
      "basis_refs": [
        "context-and-public-authority-update"
      ]
    },
    {
      "key": "subject.requirement.verification-sequence-and-current-candidate",
      "family_ref": "family.custom-long-task-real-capability",
      "outcome_ref": "proof-and-roi",
      "kind": "requirement",
      "parent_ref": null,
      "owner_ref": "owner.harness-package",
      "source_item_refs": [
        "verification-sequence-and-current-candidate"
      ],
      "basis_refs": [
        "verification-sequence-and-current-candidate"
      ]
    },
    {
      "key": "subject.requirement.final-hard-acceptance",
      "family_ref": "family.custom-long-task-real-capability",
      "outcome_ref": "proof-and-roi",
      "kind": "requirement",
      "parent_ref": null,
      "owner_ref": "owner.harness-package",
      "source_item_refs": [
        "final-hard-acceptance"
      ],
      "basis_refs": [
        "final-hard-acceptance"
      ]
    },
    {
      "key": "subject.requirement.approved-final-capability-wording",
      "family_ref": "family.custom-long-task-real-capability",
      "outcome_ref": "assurance-governance",
      "kind": "requirement",
      "parent_ref": null,
      "owner_ref": "owner.harness-package",
      "source_item_refs": [
        "approved-final-capability-wording"
      ],
      "basis_refs": [
        "approved-final-capability-wording"
      ]
    },
    {
      "key": "subject.requirement.critical-scope-escape-risk",
      "family_ref": "family.custom-long-task-real-capability",
      "outcome_ref": "observer-tcb-closure",
      "kind": "requirement",
      "parent_ref": null,
      "owner_ref": "owner.harness-package",
      "source_item_refs": [
        "critical-scope-escape-risk"
      ],
      "basis_refs": [
        "critical-scope-escape-risk"
      ]
    },
    {
      "key": "subject.requirement.critical-self-attestation-risk",
      "family_ref": "family.custom-long-task-real-capability",
      "outcome_ref": "observer-tcb-closure",
      "kind": "requirement",
      "parent_ref": null,
      "owner_ref": "owner.harness-package",
      "source_item_refs": [
        "critical-self-attestation-risk"
      ],
      "basis_refs": [
        "critical-self-attestation-risk"
      ]
    },
    {
      "key": "subject.requirement.critical-claim-inflation-risk",
      "family_ref": "family.custom-long-task-real-capability",
      "outcome_ref": "assurance-governance",
      "kind": "requirement",
      "parent_ref": null,
      "owner_ref": "owner.harness-package",
      "source_item_refs": [
        "critical-claim-inflation-risk"
      ],
      "basis_refs": [
        "critical-claim-inflation-risk"
      ]
    }
  ],
  "relations": [],
  "populations": [],
  "axis_dispositions": [
    {
      "key": "axis.actor",
      "axis": "actor",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "values": [],
      "source_item_refs": [
        "declared-assurance-theorem"
      ],
      "basis_refs": [
        "declared-assurance-theorem"
      ],
      "rationale": "The mechanism requirements apply to one current-candidate condition; no Source-defined variation on this axis exists."
    },
    {
      "key": "axis.role",
      "axis": "role",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "values": [],
      "source_item_refs": [
        "declared-assurance-theorem"
      ],
      "basis_refs": [
        "declared-assurance-theorem"
      ],
      "rationale": "The mechanism requirements apply to one current-candidate condition; no Source-defined variation on this axis exists."
    },
    {
      "key": "axis.tenant",
      "axis": "tenant",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "values": [],
      "source_item_refs": [
        "declared-assurance-theorem"
      ],
      "basis_refs": [
        "declared-assurance-theorem"
      ],
      "rationale": "The mechanism requirements apply to one current-candidate condition; no Source-defined variation on this axis exists."
    },
    {
      "key": "axis.organization",
      "axis": "organization",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "values": [],
      "source_item_refs": [
        "declared-assurance-theorem"
      ],
      "basis_refs": [
        "declared-assurance-theorem"
      ],
      "rationale": "The mechanism requirements apply to one current-candidate condition; no Source-defined variation on this axis exists."
    },
    {
      "key": "axis.jurisdiction",
      "axis": "jurisdiction",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "values": [],
      "source_item_refs": [
        "declared-assurance-theorem"
      ],
      "basis_refs": [
        "declared-assurance-theorem"
      ],
      "rationale": "The mechanism requirements apply to one current-candidate condition; no Source-defined variation on this axis exists."
    },
    {
      "key": "axis.residency",
      "axis": "residency",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "values": [],
      "source_item_refs": [
        "declared-assurance-theorem"
      ],
      "basis_refs": [
        "declared-assurance-theorem"
      ],
      "rationale": "The mechanism requirements apply to one current-candidate condition; no Source-defined variation on this axis exists."
    },
    {
      "key": "axis.environment",
      "axis": "environment",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "values": [],
      "source_item_refs": [
        "declared-assurance-theorem"
      ],
      "basis_refs": [
        "declared-assurance-theorem"
      ],
      "rationale": "The mechanism requirements apply to one current-candidate condition; no Source-defined variation on this axis exists."
    },
    {
      "key": "axis.region",
      "axis": "region",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "values": [],
      "source_item_refs": [
        "declared-assurance-theorem"
      ],
      "basis_refs": [
        "declared-assurance-theorem"
      ],
      "rationale": "The mechanism requirements apply to one current-candidate condition; no Source-defined variation on this axis exists."
    },
    {
      "key": "axis.zone",
      "axis": "zone",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "values": [],
      "source_item_refs": [
        "declared-assurance-theorem"
      ],
      "basis_refs": [
        "declared-assurance-theorem"
      ],
      "rationale": "The mechanism requirements apply to one current-candidate condition; no Source-defined variation on this axis exists."
    },
    {
      "key": "axis.platform",
      "axis": "platform",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "values": [],
      "source_item_refs": [
        "declared-assurance-theorem"
      ],
      "basis_refs": [
        "declared-assurance-theorem"
      ],
      "rationale": "The mechanism requirements apply to one current-candidate condition; no Source-defined variation on this axis exists."
    },
    {
      "key": "axis.device",
      "axis": "device",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "values": [],
      "source_item_refs": [
        "declared-assurance-theorem"
      ],
      "basis_refs": [
        "declared-assurance-theorem"
      ],
      "rationale": "The mechanism requirements apply to one current-candidate condition; no Source-defined variation on this axis exists."
    },
    {
      "key": "axis.client-version",
      "axis": "client_version",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "values": [],
      "source_item_refs": [
        "declared-assurance-theorem"
      ],
      "basis_refs": [
        "declared-assurance-theorem"
      ],
      "rationale": "The mechanism requirements apply to one current-candidate condition; no Source-defined variation on this axis exists."
    },
    {
      "key": "axis.api-version",
      "axis": "api_version",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "values": [],
      "source_item_refs": [
        "declared-assurance-theorem"
      ],
      "basis_refs": [
        "declared-assurance-theorem"
      ],
      "rationale": "The mechanism requirements apply to one current-candidate condition; no Source-defined variation on this axis exists."
    },
    {
      "key": "axis.schema-version",
      "axis": "schema_version",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "values": [],
      "source_item_refs": [
        "declared-assurance-theorem"
      ],
      "basis_refs": [
        "declared-assurance-theorem"
      ],
      "rationale": "The mechanism requirements apply to one current-candidate condition; no Source-defined variation on this axis exists."
    },
    {
      "key": "axis.runtime-version",
      "axis": "runtime_version",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "values": [],
      "source_item_refs": [
        "declared-assurance-theorem"
      ],
      "basis_refs": [
        "declared-assurance-theorem"
      ],
      "rationale": "The mechanism requirements apply to one current-candidate condition; no Source-defined variation on this axis exists."
    },
    {
      "key": "axis.feature",
      "axis": "feature",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "values": [],
      "source_item_refs": [
        "declared-assurance-theorem"
      ],
      "basis_refs": [
        "declared-assurance-theorem"
      ],
      "rationale": "The mechanism requirements apply to one current-candidate condition; no Source-defined variation on this axis exists."
    },
    {
      "key": "axis.cohort",
      "axis": "cohort",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "values": [],
      "source_item_refs": [
        "declared-assurance-theorem"
      ],
      "basis_refs": [
        "declared-assurance-theorem"
      ],
      "rationale": "The mechanism requirements apply to one current-candidate condition; no Source-defined variation on this axis exists."
    },
    {
      "key": "axis.configuration",
      "axis": "configuration",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "values": [],
      "source_item_refs": [
        "declared-assurance-theorem"
      ],
      "basis_refs": [
        "declared-assurance-theorem"
      ],
      "rationale": "The mechanism requirements apply to one current-candidate condition; no Source-defined variation on this axis exists."
    },
    {
      "key": "axis.entitlement",
      "axis": "entitlement",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "values": [],
      "source_item_refs": [
        "declared-assurance-theorem"
      ],
      "basis_refs": [
        "declared-assurance-theorem"
      ],
      "rationale": "The mechanism requirements apply to one current-candidate condition; no Source-defined variation on this axis exists."
    },
    {
      "key": "axis.permission",
      "axis": "permission",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "values": [],
      "source_item_refs": [
        "declared-assurance-theorem"
      ],
      "basis_refs": [
        "declared-assurance-theorem"
      ],
      "rationale": "The mechanism requirements apply to one current-candidate condition; no Source-defined variation on this axis exists."
    },
    {
      "key": "axis.consent",
      "axis": "consent",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "values": [],
      "source_item_refs": [
        "declared-assurance-theorem"
      ],
      "basis_refs": [
        "declared-assurance-theorem"
      ],
      "rationale": "The mechanism requirements apply to one current-candidate condition; no Source-defined variation on this axis exists."
    },
    {
      "key": "axis.session",
      "axis": "session",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "values": [],
      "source_item_refs": [
        "declared-assurance-theorem"
      ],
      "basis_refs": [
        "declared-assurance-theorem"
      ],
      "rationale": "The mechanism requirements apply to one current-candidate condition; no Source-defined variation on this axis exists."
    },
    {
      "key": "axis.entity-state",
      "axis": "entity_state",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "values": [],
      "source_item_refs": [
        "declared-assurance-theorem"
      ],
      "basis_refs": [
        "declared-assurance-theorem"
      ],
      "rationale": "The mechanism requirements apply to one current-candidate condition; no Source-defined variation on this axis exists."
    },
    {
      "key": "axis.prior-state",
      "axis": "prior_state",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "values": [],
      "source_item_refs": [
        "declared-assurance-theorem"
      ],
      "basis_refs": [
        "declared-assurance-theorem"
      ],
      "rationale": "The mechanism requirements apply to one current-candidate condition; no Source-defined variation on this axis exists."
    },
    {
      "key": "axis.input-class",
      "axis": "input_class",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "values": [],
      "source_item_refs": [
        "declared-assurance-theorem"
      ],
      "basis_refs": [
        "declared-assurance-theorem"
      ],
      "rationale": "The mechanism requirements apply to one current-candidate condition; no Source-defined variation on this axis exists."
    },
    {
      "key": "axis.boundary-case",
      "axis": "boundary_case",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "values": [],
      "source_item_refs": [
        "declared-assurance-theorem"
      ],
      "basis_refs": [
        "declared-assurance-theorem"
      ],
      "rationale": "The mechanism requirements apply to one current-candidate condition; no Source-defined variation on this axis exists."
    },
    {
      "key": "axis.data-volume",
      "axis": "data_volume",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "values": [],
      "source_item_refs": [
        "declared-assurance-theorem"
      ],
      "basis_refs": [
        "declared-assurance-theorem"
      ],
      "rationale": "The mechanism requirements apply to one current-candidate condition; no Source-defined variation on this axis exists."
    },
    {
      "key": "axis.locale",
      "axis": "locale",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "values": [],
      "source_item_refs": [
        "declared-assurance-theorem"
      ],
      "basis_refs": [
        "declared-assurance-theorem"
      ],
      "rationale": "The mechanism requirements apply to one current-candidate condition; no Source-defined variation on this axis exists."
    },
    {
      "key": "axis.timezone",
      "axis": "timezone",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "values": [],
      "source_item_refs": [
        "declared-assurance-theorem"
      ],
      "basis_refs": [
        "declared-assurance-theorem"
      ],
      "rationale": "The mechanism requirements apply to one current-candidate condition; no Source-defined variation on this axis exists."
    },
    {
      "key": "axis.clock",
      "axis": "clock",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "values": [],
      "source_item_refs": [
        "declared-assurance-theorem"
      ],
      "basis_refs": [
        "declared-assurance-theorem"
      ],
      "rationale": "The mechanism requirements apply to one current-candidate condition; no Source-defined variation on this axis exists."
    },
    {
      "key": "axis.concurrency",
      "axis": "concurrency",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "values": [],
      "source_item_refs": [
        "declared-assurance-theorem"
      ],
      "basis_refs": [
        "declared-assurance-theorem"
      ],
      "rationale": "The mechanism requirements apply to one current-candidate condition; no Source-defined variation on this axis exists."
    },
    {
      "key": "axis.repetition",
      "axis": "repetition",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "values": [],
      "source_item_refs": [
        "declared-assurance-theorem"
      ],
      "basis_refs": [
        "declared-assurance-theorem"
      ],
      "rationale": "The mechanism requirements apply to one current-candidate condition; no Source-defined variation on this axis exists."
    },
    {
      "key": "axis.dependency-health",
      "axis": "dependency_health",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "values": [],
      "source_item_refs": [
        "declared-assurance-theorem"
      ],
      "basis_refs": [
        "declared-assurance-theorem"
      ],
      "rationale": "The mechanism requirements apply to one current-candidate condition; no Source-defined variation on this axis exists."
    },
    {
      "key": "axis.connectivity",
      "axis": "connectivity",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "values": [],
      "source_item_refs": [
        "declared-assurance-theorem"
      ],
      "basis_refs": [
        "declared-assurance-theorem"
      ],
      "rationale": "The mechanism requirements apply to one current-candidate condition; no Source-defined variation on this axis exists."
    },
    {
      "key": "axis.failure-class",
      "axis": "failure_class",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "values": [],
      "source_item_refs": [
        "declared-assurance-theorem"
      ],
      "basis_refs": [
        "declared-assurance-theorem"
      ],
      "rationale": "The mechanism requirements apply to one current-candidate condition; no Source-defined variation on this axis exists."
    },
    {
      "key": "axis.retry-phase",
      "axis": "retry_phase",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "values": [],
      "source_item_refs": [
        "declared-assurance-theorem"
      ],
      "basis_refs": [
        "declared-assurance-theorem"
      ],
      "rationale": "The mechanism requirements apply to one current-candidate condition; no Source-defined variation on this axis exists."
    },
    {
      "key": "axis.consistency",
      "axis": "consistency",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "values": [],
      "source_item_refs": [
        "declared-assurance-theorem"
      ],
      "basis_refs": [
        "declared-assurance-theorem"
      ],
      "rationale": "The mechanism requirements apply to one current-candidate condition; no Source-defined variation on this axis exists."
    },
    {
      "key": "axis.freshness",
      "axis": "freshness",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "values": [],
      "source_item_refs": [
        "declared-assurance-theorem"
      ],
      "basis_refs": [
        "declared-assurance-theorem"
      ],
      "rationale": "The mechanism requirements apply to one current-candidate condition; no Source-defined variation on this axis exists."
    },
    {
      "key": "axis.migration-phase",
      "axis": "migration_phase",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "values": [],
      "source_item_refs": [
        "declared-assurance-theorem"
      ],
      "basis_refs": [
        "declared-assurance-theorem"
      ],
      "rationale": "The mechanism requirements apply to one current-candidate condition; no Source-defined variation on this axis exists."
    },
    {
      "key": "axis.rollout-phase",
      "axis": "rollout_phase",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "values": [],
      "source_item_refs": [
        "declared-assurance-theorem"
      ],
      "basis_refs": [
        "declared-assurance-theorem"
      ],
      "rationale": "The mechanism requirements apply to one current-candidate condition; no Source-defined variation on this axis exists."
    },
    {
      "key": "axis.topology",
      "axis": "topology",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "values": [],
      "source_item_refs": [
        "declared-assurance-theorem"
      ],
      "basis_refs": [
        "declared-assurance-theorem"
      ],
      "rationale": "The mechanism requirements apply to one current-candidate condition; no Source-defined variation on this axis exists."
    },
    {
      "key": "axis.threat",
      "axis": "threat",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "values": [],
      "source_item_refs": [
        "declared-assurance-theorem"
      ],
      "basis_refs": [
        "declared-assurance-theorem"
      ],
      "rationale": "The mechanism requirements apply to one current-candidate condition; no Source-defined variation on this axis exists."
    },
    {
      "key": "axis.operational-mode",
      "axis": "operational_mode",
      "standard": true,
      "disposition": "not_applicable",
      "outcome_refs": [
        "p0-exact-recomputation",
        "assurance-governance",
        "observer-tcb-closure",
        "proof-and-roi"
      ],
      "values": [],
      "source_item_refs": [
        "declared-assurance-theorem"
      ],
      "basis_refs": [
        "declared-assurance-theorem"
      ],
      "rationale": "The mechanism requirements apply to one current-candidate condition; no Source-defined variation on this axis exists."
    }
  ],
  "condition_rules": [],
  "conditions": [
    {
      "key": "condition.p0-exact-recomputation.current-candidate",
      "outcome_ref": "p0-exact-recomputation",
      "axis_values": [],
      "source_item_refs": [
        "known-selected-design-false-acceptance",
        "p0-positive-fixture-correction",
        "p0-v1-negative-control",
        "p0-v2-negative-control",
        "shared-exact-comparison-owner",
        "p0-owner-local-and-v3-compatible",
        "p0-verification-boundary",
        "selected-design-existing-owner-preservation",
        "technical-debt-and-future-change"
      ],
      "basis_refs": [
        "known-selected-design-false-acceptance"
      ]
    },
    {
      "key": "condition.assurance-governance.current-candidate",
      "outcome_ref": "assurance-governance",
      "axis_values": [],
      "source_item_refs": [
        "purpose-validity-floor-before-relative-antidegradation",
        "invalid-baseline-and-claim-downgrade",
        "coverage-defined-by-rejected-attack-surface",
        "critical-sentinel-positive-negative-controls",
        "incident-counterexample-first-rule",
        "sentinel-rationale-evidence-bounded",
        "capability-claim-levels",
        "no-new-lifecycle-authority-registry",
        "approved-final-capability-wording",
        "critical-claim-inflation-risk"
      ],
      "basis_refs": [
        "purpose-validity-floor-before-relative-antidegradation"
      ]
    },
    {
      "key": "condition.observer-tcb-closure.current-candidate",
      "outcome_ref": "observer-tcb-closure",
      "axis_values": [],
      "source_item_refs": [
        "route-b-project-owner-decision",
        "observation-channel-authority",
        "expected-actual-comparison-verdict-ownership",
        "bounded-admitted-artifact-contract",
        "actual-artifact-reextraction",
        "challenge-is-freshness-only",
        "generated-carrier-semantic-role",
        "expected-to-actual-self-proof-rejection",
        "production-reachability",
        "counterfactual-actual-change-and-impact-set",
        "no-universal-ui-observer",
        "v3-v4-and-migration-rule",
        "owner-dependency-lifecycle-boundary",
        "build-reuse-buy-allowed-set",
        "compatibility-security-resource-boundaries",
        "critical-scope-escape-risk",
        "critical-self-attestation-risk"
      ],
      "basis_refs": [
        "route-b-project-owner-decision"
      ]
    },
    {
      "key": "condition.proof-and-roi.current-candidate",
      "outcome_ref": "proof-and-roi",
      "axis_values": [],
      "source_item_refs": [
        "real-capability-closure-result",
        "material-input-provenance",
        "declared-assurance-theorem",
        "assurance-causal-chain",
        "attack-suite-ground-truth",
        "valid-control-suite",
        "black-box-final-gate-lifecycle",
        "starward-sanitized-replay",
        "fresh-agent-benchmark-boundary",
        "roi-admission-order",
        "early-real-entry-feedback",
        "context-and-public-authority-update",
        "verification-sequence-and-current-candidate",
        "final-hard-acceptance"
      ],
      "basis_refs": [
        "real-capability-closure-result"
      ]
    }
  ],
  "condition_exclusions": [],
  "property_dispositions": [
    {
      "key": "property.custom-requirement-satisfied",
      "family_ref": "family.custom-long-task-real-capability",
      "property": "custom.requirement_satisfied",
      "standard": false,
      "value_kind": "boolean",
      "required_methods": [
        "exact_value"
      ],
      "required_evidence_capabilities": [
        "semantic_fact"
      ],
      "applicable_unit_refs": [
        "subject.requirement.real-capability-closure-result",
        "subject.requirement.material-input-provenance",
        "subject.requirement.declared-assurance-theorem",
        "subject.requirement.assurance-causal-chain",
        "subject.requirement.known-selected-design-false-acceptance",
        "subject.requirement.p0-positive-fixture-correction",
        "subject.requirement.p0-v1-negative-control",
        "subject.requirement.p0-v2-negative-control",
        "subject.requirement.shared-exact-comparison-owner",
        "subject.requirement.p0-owner-local-and-v3-compatible",
        "subject.requirement.p0-verification-boundary",
        "subject.requirement.purpose-validity-floor-before-relative-antidegradation",
        "subject.requirement.invalid-baseline-and-claim-downgrade",
        "subject.requirement.coverage-defined-by-rejected-attack-surface",
        "subject.requirement.critical-sentinel-positive-negative-controls",
        "subject.requirement.incident-counterexample-first-rule",
        "subject.requirement.sentinel-rationale-evidence-bounded",
        "subject.requirement.capability-claim-levels",
        "subject.requirement.route-b-project-owner-decision",
        "subject.requirement.observation-channel-authority",
        "subject.requirement.expected-actual-comparison-verdict-ownership",
        "subject.requirement.bounded-admitted-artifact-contract",
        "subject.requirement.actual-artifact-reextraction",
        "subject.requirement.challenge-is-freshness-only",
        "subject.requirement.generated-carrier-semantic-role",
        "subject.requirement.expected-to-actual-self-proof-rejection",
        "subject.requirement.production-reachability",
        "subject.requirement.counterfactual-actual-change-and-impact-set",
        "subject.requirement.selected-design-existing-owner-preservation",
        "subject.requirement.no-universal-ui-observer",
        "subject.requirement.v3-v4-and-migration-rule",
        "subject.requirement.attack-suite-ground-truth",
        "subject.requirement.valid-control-suite",
        "subject.requirement.black-box-final-gate-lifecycle",
        "subject.requirement.starward-sanitized-replay",
        "subject.requirement.fresh-agent-benchmark-boundary",
        "subject.requirement.roi-admission-order",
        "subject.requirement.early-real-entry-feedback",
        "subject.requirement.no-new-lifecycle-authority-registry",
        "subject.requirement.owner-dependency-lifecycle-boundary",
        "subject.requirement.build-reuse-buy-allowed-set",
        "subject.requirement.technical-debt-and-future-change",
        "subject.requirement.compatibility-security-resource-boundaries",
        "subject.requirement.context-and-public-authority-update",
        "subject.requirement.verification-sequence-and-current-candidate",
        "subject.requirement.final-hard-acceptance",
        "subject.requirement.approved-final-capability-wording",
        "subject.requirement.critical-scope-escape-risk",
        "subject.requirement.critical-self-attestation-risk",
        "subject.requirement.critical-claim-inflation-risk"
      ],
      "not_applicable_unit_refs": [],
      "decision_required_unit_refs": [],
      "unavailable_unit_refs": [],
      "condition_refs": [
        "condition.p0-exact-recomputation.current-candidate",
        "condition.assurance-governance.current-candidate",
        "condition.observer-tcb-closure.current-candidate",
        "condition.proof-and-roi.current-candidate"
      ],
      "source_item_refs": [
        "real-capability-closure-result",
        "material-input-provenance",
        "declared-assurance-theorem",
        "assurance-causal-chain",
        "known-selected-design-false-acceptance",
        "p0-positive-fixture-correction",
        "p0-v1-negative-control",
        "p0-v2-negative-control",
        "shared-exact-comparison-owner",
        "p0-owner-local-and-v3-compatible",
        "p0-verification-boundary",
        "purpose-validity-floor-before-relative-antidegradation",
        "invalid-baseline-and-claim-downgrade",
        "coverage-defined-by-rejected-attack-surface",
        "critical-sentinel-positive-negative-controls",
        "incident-counterexample-first-rule",
        "sentinel-rationale-evidence-bounded",
        "capability-claim-levels",
        "route-b-project-owner-decision",
        "observation-channel-authority",
        "expected-actual-comparison-verdict-ownership",
        "bounded-admitted-artifact-contract",
        "actual-artifact-reextraction",
        "challenge-is-freshness-only",
        "generated-carrier-semantic-role",
        "expected-to-actual-self-proof-rejection",
        "production-reachability",
        "counterfactual-actual-change-and-impact-set",
        "selected-design-existing-owner-preservation",
        "no-universal-ui-observer",
        "v3-v4-and-migration-rule",
        "attack-suite-ground-truth",
        "valid-control-suite",
        "black-box-final-gate-lifecycle",
        "starward-sanitized-replay",
        "fresh-agent-benchmark-boundary",
        "roi-admission-order",
        "early-real-entry-feedback",
        "no-new-lifecycle-authority-registry",
        "owner-dependency-lifecycle-boundary",
        "build-reuse-buy-allowed-set",
        "technical-debt-and-future-change",
        "compatibility-security-resource-boundaries",
        "context-and-public-authority-update",
        "verification-sequence-and-current-candidate",
        "final-hard-acceptance",
        "approved-final-capability-wording",
        "critical-scope-escape-risk",
        "critical-self-attestation-risk",
        "critical-claim-inflation-risk"
      ],
      "basis_refs": [
        "final-hard-acceptance"
      ],
      "rationale": "Each marked requirement must independently evaluate to true on the current candidate."
    }
  ],
  "fact_cells": [
    {
      "key": "cell.requirement.real-capability-closure-result",
      "outcome_ref": "proof-and-roi",
      "unit_ref": "subject.requirement.real-capability-closure-result",
      "condition_ref": "condition.proof-and-roi.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "disposition": "specified",
      "fact_ref": "fact.requirement.real-capability-closure-result",
      "source_item_refs": [
        "real-capability-closure-result"
      ],
      "basis_refs": [
        "real-capability-closure-result"
      ],
      "rationale": "The independently decidable Source requirement is specified for the current candidate."
    },
    {
      "key": "cell.requirement.material-input-provenance",
      "outcome_ref": "proof-and-roi",
      "unit_ref": "subject.requirement.material-input-provenance",
      "condition_ref": "condition.proof-and-roi.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "disposition": "specified",
      "fact_ref": "fact.requirement.material-input-provenance",
      "source_item_refs": [
        "material-input-provenance"
      ],
      "basis_refs": [
        "material-input-provenance"
      ],
      "rationale": "The independently decidable Source requirement is specified for the current candidate."
    },
    {
      "key": "cell.requirement.declared-assurance-theorem",
      "outcome_ref": "proof-and-roi",
      "unit_ref": "subject.requirement.declared-assurance-theorem",
      "condition_ref": "condition.proof-and-roi.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "disposition": "specified",
      "fact_ref": "fact.requirement.declared-assurance-theorem",
      "source_item_refs": [
        "declared-assurance-theorem"
      ],
      "basis_refs": [
        "declared-assurance-theorem"
      ],
      "rationale": "The independently decidable Source requirement is specified for the current candidate."
    },
    {
      "key": "cell.requirement.assurance-causal-chain",
      "outcome_ref": "proof-and-roi",
      "unit_ref": "subject.requirement.assurance-causal-chain",
      "condition_ref": "condition.proof-and-roi.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "disposition": "specified",
      "fact_ref": "fact.requirement.assurance-causal-chain",
      "source_item_refs": [
        "assurance-causal-chain"
      ],
      "basis_refs": [
        "assurance-causal-chain"
      ],
      "rationale": "The independently decidable Source requirement is specified for the current candidate."
    },
    {
      "key": "cell.requirement.known-selected-design-false-acceptance",
      "outcome_ref": "p0-exact-recomputation",
      "unit_ref": "subject.requirement.known-selected-design-false-acceptance",
      "condition_ref": "condition.p0-exact-recomputation.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "disposition": "specified",
      "fact_ref": "fact.requirement.known-selected-design-false-acceptance",
      "source_item_refs": [
        "known-selected-design-false-acceptance"
      ],
      "basis_refs": [
        "known-selected-design-false-acceptance"
      ],
      "rationale": "The independently decidable Source requirement is specified for the current candidate."
    },
    {
      "key": "cell.requirement.p0-positive-fixture-correction",
      "outcome_ref": "p0-exact-recomputation",
      "unit_ref": "subject.requirement.p0-positive-fixture-correction",
      "condition_ref": "condition.p0-exact-recomputation.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "disposition": "specified",
      "fact_ref": "fact.requirement.p0-positive-fixture-correction",
      "source_item_refs": [
        "p0-positive-fixture-correction"
      ],
      "basis_refs": [
        "p0-positive-fixture-correction"
      ],
      "rationale": "The independently decidable Source requirement is specified for the current candidate."
    },
    {
      "key": "cell.requirement.p0-v1-negative-control",
      "outcome_ref": "p0-exact-recomputation",
      "unit_ref": "subject.requirement.p0-v1-negative-control",
      "condition_ref": "condition.p0-exact-recomputation.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "disposition": "specified",
      "fact_ref": "fact.requirement.p0-v1-negative-control",
      "source_item_refs": [
        "p0-v1-negative-control"
      ],
      "basis_refs": [
        "p0-v1-negative-control"
      ],
      "rationale": "The independently decidable Source requirement is specified for the current candidate."
    },
    {
      "key": "cell.requirement.p0-v2-negative-control",
      "outcome_ref": "p0-exact-recomputation",
      "unit_ref": "subject.requirement.p0-v2-negative-control",
      "condition_ref": "condition.p0-exact-recomputation.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "disposition": "specified",
      "fact_ref": "fact.requirement.p0-v2-negative-control",
      "source_item_refs": [
        "p0-v2-negative-control"
      ],
      "basis_refs": [
        "p0-v2-negative-control"
      ],
      "rationale": "The independently decidable Source requirement is specified for the current candidate."
    },
    {
      "key": "cell.requirement.shared-exact-comparison-owner",
      "outcome_ref": "p0-exact-recomputation",
      "unit_ref": "subject.requirement.shared-exact-comparison-owner",
      "condition_ref": "condition.p0-exact-recomputation.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "disposition": "specified",
      "fact_ref": "fact.requirement.shared-exact-comparison-owner",
      "source_item_refs": [
        "shared-exact-comparison-owner"
      ],
      "basis_refs": [
        "shared-exact-comparison-owner"
      ],
      "rationale": "The independently decidable Source requirement is specified for the current candidate."
    },
    {
      "key": "cell.requirement.p0-owner-local-and-v3-compatible",
      "outcome_ref": "p0-exact-recomputation",
      "unit_ref": "subject.requirement.p0-owner-local-and-v3-compatible",
      "condition_ref": "condition.p0-exact-recomputation.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "disposition": "specified",
      "fact_ref": "fact.requirement.p0-owner-local-and-v3-compatible",
      "source_item_refs": [
        "p0-owner-local-and-v3-compatible"
      ],
      "basis_refs": [
        "p0-owner-local-and-v3-compatible"
      ],
      "rationale": "The independently decidable Source requirement is specified for the current candidate."
    },
    {
      "key": "cell.requirement.p0-verification-boundary",
      "outcome_ref": "p0-exact-recomputation",
      "unit_ref": "subject.requirement.p0-verification-boundary",
      "condition_ref": "condition.p0-exact-recomputation.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "disposition": "specified",
      "fact_ref": "fact.requirement.p0-verification-boundary",
      "source_item_refs": [
        "p0-verification-boundary"
      ],
      "basis_refs": [
        "p0-verification-boundary"
      ],
      "rationale": "The independently decidable Source requirement is specified for the current candidate."
    },
    {
      "key": "cell.requirement.purpose-validity-floor-before-relative-antidegradation",
      "outcome_ref": "assurance-governance",
      "unit_ref": "subject.requirement.purpose-validity-floor-before-relative-antidegradation",
      "condition_ref": "condition.assurance-governance.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "disposition": "specified",
      "fact_ref": "fact.requirement.purpose-validity-floor-before-relative-antidegradation",
      "source_item_refs": [
        "purpose-validity-floor-before-relative-antidegradation"
      ],
      "basis_refs": [
        "purpose-validity-floor-before-relative-antidegradation"
      ],
      "rationale": "The independently decidable Source requirement is specified for the current candidate."
    },
    {
      "key": "cell.requirement.invalid-baseline-and-claim-downgrade",
      "outcome_ref": "assurance-governance",
      "unit_ref": "subject.requirement.invalid-baseline-and-claim-downgrade",
      "condition_ref": "condition.assurance-governance.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "disposition": "specified",
      "fact_ref": "fact.requirement.invalid-baseline-and-claim-downgrade",
      "source_item_refs": [
        "invalid-baseline-and-claim-downgrade"
      ],
      "basis_refs": [
        "invalid-baseline-and-claim-downgrade"
      ],
      "rationale": "The independently decidable Source requirement is specified for the current candidate."
    },
    {
      "key": "cell.requirement.coverage-defined-by-rejected-attack-surface",
      "outcome_ref": "assurance-governance",
      "unit_ref": "subject.requirement.coverage-defined-by-rejected-attack-surface",
      "condition_ref": "condition.assurance-governance.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "disposition": "specified",
      "fact_ref": "fact.requirement.coverage-defined-by-rejected-attack-surface",
      "source_item_refs": [
        "coverage-defined-by-rejected-attack-surface"
      ],
      "basis_refs": [
        "coverage-defined-by-rejected-attack-surface"
      ],
      "rationale": "The independently decidable Source requirement is specified for the current candidate."
    },
    {
      "key": "cell.requirement.critical-sentinel-positive-negative-controls",
      "outcome_ref": "assurance-governance",
      "unit_ref": "subject.requirement.critical-sentinel-positive-negative-controls",
      "condition_ref": "condition.assurance-governance.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "disposition": "specified",
      "fact_ref": "fact.requirement.critical-sentinel-positive-negative-controls",
      "source_item_refs": [
        "critical-sentinel-positive-negative-controls"
      ],
      "basis_refs": [
        "critical-sentinel-positive-negative-controls"
      ],
      "rationale": "The independently decidable Source requirement is specified for the current candidate."
    },
    {
      "key": "cell.requirement.incident-counterexample-first-rule",
      "outcome_ref": "assurance-governance",
      "unit_ref": "subject.requirement.incident-counterexample-first-rule",
      "condition_ref": "condition.assurance-governance.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "disposition": "specified",
      "fact_ref": "fact.requirement.incident-counterexample-first-rule",
      "source_item_refs": [
        "incident-counterexample-first-rule"
      ],
      "basis_refs": [
        "incident-counterexample-first-rule"
      ],
      "rationale": "The independently decidable Source requirement is specified for the current candidate."
    },
    {
      "key": "cell.requirement.sentinel-rationale-evidence-bounded",
      "outcome_ref": "assurance-governance",
      "unit_ref": "subject.requirement.sentinel-rationale-evidence-bounded",
      "condition_ref": "condition.assurance-governance.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "disposition": "specified",
      "fact_ref": "fact.requirement.sentinel-rationale-evidence-bounded",
      "source_item_refs": [
        "sentinel-rationale-evidence-bounded"
      ],
      "basis_refs": [
        "sentinel-rationale-evidence-bounded"
      ],
      "rationale": "The independently decidable Source requirement is specified for the current candidate."
    },
    {
      "key": "cell.requirement.capability-claim-levels",
      "outcome_ref": "assurance-governance",
      "unit_ref": "subject.requirement.capability-claim-levels",
      "condition_ref": "condition.assurance-governance.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "disposition": "specified",
      "fact_ref": "fact.requirement.capability-claim-levels",
      "source_item_refs": [
        "capability-claim-levels"
      ],
      "basis_refs": [
        "capability-claim-levels"
      ],
      "rationale": "The independently decidable Source requirement is specified for the current candidate."
    },
    {
      "key": "cell.requirement.route-b-project-owner-decision",
      "outcome_ref": "observer-tcb-closure",
      "unit_ref": "subject.requirement.route-b-project-owner-decision",
      "condition_ref": "condition.observer-tcb-closure.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "disposition": "specified",
      "fact_ref": "fact.requirement.route-b-project-owner-decision",
      "source_item_refs": [
        "route-b-project-owner-decision"
      ],
      "basis_refs": [
        "route-b-project-owner-decision"
      ],
      "rationale": "The independently decidable Source requirement is specified for the current candidate."
    },
    {
      "key": "cell.requirement.observation-channel-authority",
      "outcome_ref": "observer-tcb-closure",
      "unit_ref": "subject.requirement.observation-channel-authority",
      "condition_ref": "condition.observer-tcb-closure.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "disposition": "specified",
      "fact_ref": "fact.requirement.observation-channel-authority",
      "source_item_refs": [
        "observation-channel-authority"
      ],
      "basis_refs": [
        "observation-channel-authority"
      ],
      "rationale": "The independently decidable Source requirement is specified for the current candidate."
    },
    {
      "key": "cell.requirement.expected-actual-comparison-verdict-ownership",
      "outcome_ref": "observer-tcb-closure",
      "unit_ref": "subject.requirement.expected-actual-comparison-verdict-ownership",
      "condition_ref": "condition.observer-tcb-closure.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "disposition": "specified",
      "fact_ref": "fact.requirement.expected-actual-comparison-verdict-ownership",
      "source_item_refs": [
        "expected-actual-comparison-verdict-ownership"
      ],
      "basis_refs": [
        "expected-actual-comparison-verdict-ownership"
      ],
      "rationale": "The independently decidable Source requirement is specified for the current candidate."
    },
    {
      "key": "cell.requirement.bounded-admitted-artifact-contract",
      "outcome_ref": "observer-tcb-closure",
      "unit_ref": "subject.requirement.bounded-admitted-artifact-contract",
      "condition_ref": "condition.observer-tcb-closure.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "disposition": "specified",
      "fact_ref": "fact.requirement.bounded-admitted-artifact-contract",
      "source_item_refs": [
        "bounded-admitted-artifact-contract"
      ],
      "basis_refs": [
        "bounded-admitted-artifact-contract"
      ],
      "rationale": "The independently decidable Source requirement is specified for the current candidate."
    },
    {
      "key": "cell.requirement.actual-artifact-reextraction",
      "outcome_ref": "observer-tcb-closure",
      "unit_ref": "subject.requirement.actual-artifact-reextraction",
      "condition_ref": "condition.observer-tcb-closure.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "disposition": "specified",
      "fact_ref": "fact.requirement.actual-artifact-reextraction",
      "source_item_refs": [
        "actual-artifact-reextraction"
      ],
      "basis_refs": [
        "actual-artifact-reextraction"
      ],
      "rationale": "The independently decidable Source requirement is specified for the current candidate."
    },
    {
      "key": "cell.requirement.challenge-is-freshness-only",
      "outcome_ref": "observer-tcb-closure",
      "unit_ref": "subject.requirement.challenge-is-freshness-only",
      "condition_ref": "condition.observer-tcb-closure.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "disposition": "specified",
      "fact_ref": "fact.requirement.challenge-is-freshness-only",
      "source_item_refs": [
        "challenge-is-freshness-only"
      ],
      "basis_refs": [
        "challenge-is-freshness-only"
      ],
      "rationale": "The independently decidable Source requirement is specified for the current candidate."
    },
    {
      "key": "cell.requirement.generated-carrier-semantic-role",
      "outcome_ref": "observer-tcb-closure",
      "unit_ref": "subject.requirement.generated-carrier-semantic-role",
      "condition_ref": "condition.observer-tcb-closure.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "disposition": "specified",
      "fact_ref": "fact.requirement.generated-carrier-semantic-role",
      "source_item_refs": [
        "generated-carrier-semantic-role"
      ],
      "basis_refs": [
        "generated-carrier-semantic-role"
      ],
      "rationale": "The independently decidable Source requirement is specified for the current candidate."
    },
    {
      "key": "cell.requirement.expected-to-actual-self-proof-rejection",
      "outcome_ref": "observer-tcb-closure",
      "unit_ref": "subject.requirement.expected-to-actual-self-proof-rejection",
      "condition_ref": "condition.observer-tcb-closure.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "disposition": "specified",
      "fact_ref": "fact.requirement.expected-to-actual-self-proof-rejection",
      "source_item_refs": [
        "expected-to-actual-self-proof-rejection"
      ],
      "basis_refs": [
        "expected-to-actual-self-proof-rejection"
      ],
      "rationale": "The independently decidable Source requirement is specified for the current candidate."
    },
    {
      "key": "cell.requirement.production-reachability",
      "outcome_ref": "observer-tcb-closure",
      "unit_ref": "subject.requirement.production-reachability",
      "condition_ref": "condition.observer-tcb-closure.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "disposition": "specified",
      "fact_ref": "fact.requirement.production-reachability",
      "source_item_refs": [
        "production-reachability"
      ],
      "basis_refs": [
        "production-reachability"
      ],
      "rationale": "The independently decidable Source requirement is specified for the current candidate."
    },
    {
      "key": "cell.requirement.counterfactual-actual-change-and-impact-set",
      "outcome_ref": "observer-tcb-closure",
      "unit_ref": "subject.requirement.counterfactual-actual-change-and-impact-set",
      "condition_ref": "condition.observer-tcb-closure.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "disposition": "specified",
      "fact_ref": "fact.requirement.counterfactual-actual-change-and-impact-set",
      "source_item_refs": [
        "counterfactual-actual-change-and-impact-set"
      ],
      "basis_refs": [
        "counterfactual-actual-change-and-impact-set"
      ],
      "rationale": "The independently decidable Source requirement is specified for the current candidate."
    },
    {
      "key": "cell.requirement.selected-design-existing-owner-preservation",
      "outcome_ref": "p0-exact-recomputation",
      "unit_ref": "subject.requirement.selected-design-existing-owner-preservation",
      "condition_ref": "condition.p0-exact-recomputation.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "disposition": "specified",
      "fact_ref": "fact.requirement.selected-design-existing-owner-preservation",
      "source_item_refs": [
        "selected-design-existing-owner-preservation"
      ],
      "basis_refs": [
        "selected-design-existing-owner-preservation"
      ],
      "rationale": "The independently decidable Source requirement is specified for the current candidate."
    },
    {
      "key": "cell.requirement.no-universal-ui-observer",
      "outcome_ref": "observer-tcb-closure",
      "unit_ref": "subject.requirement.no-universal-ui-observer",
      "condition_ref": "condition.observer-tcb-closure.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "disposition": "specified",
      "fact_ref": "fact.requirement.no-universal-ui-observer",
      "source_item_refs": [
        "no-universal-ui-observer"
      ],
      "basis_refs": [
        "no-universal-ui-observer"
      ],
      "rationale": "The independently decidable Source requirement is specified for the current candidate."
    },
    {
      "key": "cell.requirement.v3-v4-and-migration-rule",
      "outcome_ref": "observer-tcb-closure",
      "unit_ref": "subject.requirement.v3-v4-and-migration-rule",
      "condition_ref": "condition.observer-tcb-closure.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "disposition": "specified",
      "fact_ref": "fact.requirement.v3-v4-and-migration-rule",
      "source_item_refs": [
        "v3-v4-and-migration-rule"
      ],
      "basis_refs": [
        "v3-v4-and-migration-rule"
      ],
      "rationale": "The independently decidable Source requirement is specified for the current candidate."
    },
    {
      "key": "cell.requirement.attack-suite-ground-truth",
      "outcome_ref": "proof-and-roi",
      "unit_ref": "subject.requirement.attack-suite-ground-truth",
      "condition_ref": "condition.proof-and-roi.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "disposition": "specified",
      "fact_ref": "fact.requirement.attack-suite-ground-truth",
      "source_item_refs": [
        "attack-suite-ground-truth"
      ],
      "basis_refs": [
        "attack-suite-ground-truth"
      ],
      "rationale": "The independently decidable Source requirement is specified for the current candidate."
    },
    {
      "key": "cell.requirement.valid-control-suite",
      "outcome_ref": "proof-and-roi",
      "unit_ref": "subject.requirement.valid-control-suite",
      "condition_ref": "condition.proof-and-roi.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "disposition": "specified",
      "fact_ref": "fact.requirement.valid-control-suite",
      "source_item_refs": [
        "valid-control-suite"
      ],
      "basis_refs": [
        "valid-control-suite"
      ],
      "rationale": "The independently decidable Source requirement is specified for the current candidate."
    },
    {
      "key": "cell.requirement.black-box-final-gate-lifecycle",
      "outcome_ref": "proof-and-roi",
      "unit_ref": "subject.requirement.black-box-final-gate-lifecycle",
      "condition_ref": "condition.proof-and-roi.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "disposition": "specified",
      "fact_ref": "fact.requirement.black-box-final-gate-lifecycle",
      "source_item_refs": [
        "black-box-final-gate-lifecycle"
      ],
      "basis_refs": [
        "black-box-final-gate-lifecycle"
      ],
      "rationale": "The independently decidable Source requirement is specified for the current candidate."
    },
    {
      "key": "cell.requirement.starward-sanitized-replay",
      "outcome_ref": "proof-and-roi",
      "unit_ref": "subject.requirement.starward-sanitized-replay",
      "condition_ref": "condition.proof-and-roi.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "disposition": "specified",
      "fact_ref": "fact.requirement.starward-sanitized-replay",
      "source_item_refs": [
        "starward-sanitized-replay"
      ],
      "basis_refs": [
        "starward-sanitized-replay"
      ],
      "rationale": "The independently decidable Source requirement is specified for the current candidate."
    },
    {
      "key": "cell.requirement.fresh-agent-benchmark-boundary",
      "outcome_ref": "proof-and-roi",
      "unit_ref": "subject.requirement.fresh-agent-benchmark-boundary",
      "condition_ref": "condition.proof-and-roi.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "disposition": "specified",
      "fact_ref": "fact.requirement.fresh-agent-benchmark-boundary",
      "source_item_refs": [
        "fresh-agent-benchmark-boundary"
      ],
      "basis_refs": [
        "fresh-agent-benchmark-boundary"
      ],
      "rationale": "The independently decidable Source requirement is specified for the current candidate."
    },
    {
      "key": "cell.requirement.roi-admission-order",
      "outcome_ref": "proof-and-roi",
      "unit_ref": "subject.requirement.roi-admission-order",
      "condition_ref": "condition.proof-and-roi.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "disposition": "specified",
      "fact_ref": "fact.requirement.roi-admission-order",
      "source_item_refs": [
        "roi-admission-order"
      ],
      "basis_refs": [
        "roi-admission-order"
      ],
      "rationale": "The independently decidable Source requirement is specified for the current candidate."
    },
    {
      "key": "cell.requirement.early-real-entry-feedback",
      "outcome_ref": "proof-and-roi",
      "unit_ref": "subject.requirement.early-real-entry-feedback",
      "condition_ref": "condition.proof-and-roi.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "disposition": "specified",
      "fact_ref": "fact.requirement.early-real-entry-feedback",
      "source_item_refs": [
        "early-real-entry-feedback"
      ],
      "basis_refs": [
        "early-real-entry-feedback"
      ],
      "rationale": "The independently decidable Source requirement is specified for the current candidate."
    },
    {
      "key": "cell.requirement.no-new-lifecycle-authority-registry",
      "outcome_ref": "assurance-governance",
      "unit_ref": "subject.requirement.no-new-lifecycle-authority-registry",
      "condition_ref": "condition.assurance-governance.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "disposition": "specified",
      "fact_ref": "fact.requirement.no-new-lifecycle-authority-registry",
      "source_item_refs": [
        "no-new-lifecycle-authority-registry"
      ],
      "basis_refs": [
        "no-new-lifecycle-authority-registry"
      ],
      "rationale": "The independently decidable Source requirement is specified for the current candidate."
    },
    {
      "key": "cell.requirement.owner-dependency-lifecycle-boundary",
      "outcome_ref": "observer-tcb-closure",
      "unit_ref": "subject.requirement.owner-dependency-lifecycle-boundary",
      "condition_ref": "condition.observer-tcb-closure.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "disposition": "specified",
      "fact_ref": "fact.requirement.owner-dependency-lifecycle-boundary",
      "source_item_refs": [
        "owner-dependency-lifecycle-boundary"
      ],
      "basis_refs": [
        "owner-dependency-lifecycle-boundary"
      ],
      "rationale": "The independently decidable Source requirement is specified for the current candidate."
    },
    {
      "key": "cell.requirement.build-reuse-buy-allowed-set",
      "outcome_ref": "observer-tcb-closure",
      "unit_ref": "subject.requirement.build-reuse-buy-allowed-set",
      "condition_ref": "condition.observer-tcb-closure.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "disposition": "specified",
      "fact_ref": "fact.requirement.build-reuse-buy-allowed-set",
      "source_item_refs": [
        "build-reuse-buy-allowed-set"
      ],
      "basis_refs": [
        "build-reuse-buy-allowed-set"
      ],
      "rationale": "The independently decidable Source requirement is specified for the current candidate."
    },
    {
      "key": "cell.requirement.technical-debt-and-future-change",
      "outcome_ref": "p0-exact-recomputation",
      "unit_ref": "subject.requirement.technical-debt-and-future-change",
      "condition_ref": "condition.p0-exact-recomputation.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "disposition": "specified",
      "fact_ref": "fact.requirement.technical-debt-and-future-change",
      "source_item_refs": [
        "technical-debt-and-future-change"
      ],
      "basis_refs": [
        "technical-debt-and-future-change"
      ],
      "rationale": "The independently decidable Source requirement is specified for the current candidate."
    },
    {
      "key": "cell.requirement.compatibility-security-resource-boundaries",
      "outcome_ref": "observer-tcb-closure",
      "unit_ref": "subject.requirement.compatibility-security-resource-boundaries",
      "condition_ref": "condition.observer-tcb-closure.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "disposition": "specified",
      "fact_ref": "fact.requirement.compatibility-security-resource-boundaries",
      "source_item_refs": [
        "compatibility-security-resource-boundaries"
      ],
      "basis_refs": [
        "compatibility-security-resource-boundaries"
      ],
      "rationale": "The independently decidable Source requirement is specified for the current candidate."
    },
    {
      "key": "cell.requirement.context-and-public-authority-update",
      "outcome_ref": "proof-and-roi",
      "unit_ref": "subject.requirement.context-and-public-authority-update",
      "condition_ref": "condition.proof-and-roi.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "disposition": "specified",
      "fact_ref": "fact.requirement.context-and-public-authority-update",
      "source_item_refs": [
        "context-and-public-authority-update"
      ],
      "basis_refs": [
        "context-and-public-authority-update"
      ],
      "rationale": "The independently decidable Source requirement is specified for the current candidate."
    },
    {
      "key": "cell.requirement.verification-sequence-and-current-candidate",
      "outcome_ref": "proof-and-roi",
      "unit_ref": "subject.requirement.verification-sequence-and-current-candidate",
      "condition_ref": "condition.proof-and-roi.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "disposition": "specified",
      "fact_ref": "fact.requirement.verification-sequence-and-current-candidate",
      "source_item_refs": [
        "verification-sequence-and-current-candidate"
      ],
      "basis_refs": [
        "verification-sequence-and-current-candidate"
      ],
      "rationale": "The independently decidable Source requirement is specified for the current candidate."
    },
    {
      "key": "cell.requirement.final-hard-acceptance",
      "outcome_ref": "proof-and-roi",
      "unit_ref": "subject.requirement.final-hard-acceptance",
      "condition_ref": "condition.proof-and-roi.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "disposition": "specified",
      "fact_ref": "fact.requirement.final-hard-acceptance",
      "source_item_refs": [
        "final-hard-acceptance"
      ],
      "basis_refs": [
        "final-hard-acceptance"
      ],
      "rationale": "The independently decidable Source requirement is specified for the current candidate."
    },
    {
      "key": "cell.requirement.approved-final-capability-wording",
      "outcome_ref": "assurance-governance",
      "unit_ref": "subject.requirement.approved-final-capability-wording",
      "condition_ref": "condition.assurance-governance.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "disposition": "specified",
      "fact_ref": "fact.requirement.approved-final-capability-wording",
      "source_item_refs": [
        "approved-final-capability-wording"
      ],
      "basis_refs": [
        "approved-final-capability-wording"
      ],
      "rationale": "The independently decidable Source requirement is specified for the current candidate."
    },
    {
      "key": "cell.requirement.critical-scope-escape-risk",
      "outcome_ref": "observer-tcb-closure",
      "unit_ref": "subject.requirement.critical-scope-escape-risk",
      "condition_ref": "condition.observer-tcb-closure.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "disposition": "specified",
      "fact_ref": "fact.requirement.critical-scope-escape-risk",
      "source_item_refs": [
        "critical-scope-escape-risk"
      ],
      "basis_refs": [
        "critical-scope-escape-risk"
      ],
      "rationale": "The independently decidable Source requirement is specified for the current candidate."
    },
    {
      "key": "cell.requirement.critical-self-attestation-risk",
      "outcome_ref": "observer-tcb-closure",
      "unit_ref": "subject.requirement.critical-self-attestation-risk",
      "condition_ref": "condition.observer-tcb-closure.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "disposition": "specified",
      "fact_ref": "fact.requirement.critical-self-attestation-risk",
      "source_item_refs": [
        "critical-self-attestation-risk"
      ],
      "basis_refs": [
        "critical-self-attestation-risk"
      ],
      "rationale": "The independently decidable Source requirement is specified for the current candidate."
    },
    {
      "key": "cell.requirement.critical-claim-inflation-risk",
      "outcome_ref": "assurance-governance",
      "unit_ref": "subject.requirement.critical-claim-inflation-risk",
      "condition_ref": "condition.assurance-governance.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "disposition": "specified",
      "fact_ref": "fact.requirement.critical-claim-inflation-risk",
      "source_item_refs": [
        "critical-claim-inflation-risk"
      ],
      "basis_refs": [
        "critical-claim-inflation-risk"
      ],
      "rationale": "The independently decidable Source requirement is specified for the current candidate."
    }
  ],
  "facts": [
    {
      "key": "fact.requirement.real-capability-closure-result",
      "cell_ref": "cell.requirement.real-capability-closure-result",
      "outcome_ref": "proof-and-roi",
      "unit_ref": "subject.requirement.real-capability-closure-result",
      "family_ref": "family.custom-long-task-real-capability",
      "condition_ref": "condition.proof-and-roi.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "owner_ref": "owner.harness-package",
      "value_kind": "boolean",
      "observation_scope": "product_boundary",
      "observation_sensitivity": "plain",
      "quantifier": {
        "kind": "one",
        "minimum": null,
        "maximum": null,
        "population_ref": null
      },
      "expected": {
        "representation": "inline",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/0/expected/value"
        },
        "sha256": "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b",
        "value": true
      },
      "provenance": {
        "kind": "direct",
        "authority_ref": "real-capability-closure-result",
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "derivation": null
      },
      "source_item_refs": [
        "real-capability-closure-result"
      ]
    },
    {
      "key": "fact.requirement.material-input-provenance",
      "cell_ref": "cell.requirement.material-input-provenance",
      "outcome_ref": "proof-and-roi",
      "unit_ref": "subject.requirement.material-input-provenance",
      "family_ref": "family.custom-long-task-real-capability",
      "condition_ref": "condition.proof-and-roi.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "owner_ref": "owner.harness-package",
      "value_kind": "boolean",
      "observation_scope": "product_boundary",
      "observation_sensitivity": "plain",
      "quantifier": {
        "kind": "one",
        "minimum": null,
        "maximum": null,
        "population_ref": null
      },
      "expected": {
        "representation": "inline",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/1/expected/value"
        },
        "sha256": "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b",
        "value": true
      },
      "provenance": {
        "kind": "direct",
        "authority_ref": "material-input-provenance",
        "basis_refs": [
          "material-input-provenance",
          "input.context.project-context-architecture-md",
          "input.context.project-context-areas-harness-package-md",
          "input.context.project-context-areas-harness-package-contracts-design-resource-authoring-md",
          "input.context.project-context-areas-harness-package-contracts-temporary-content-governance-md",
          "input.context.project-context-areas-harness-package-decision-rationale-minimal-context-md",
          "input.context.project-context-areas-harness-package-foundation-context-model-md",
          "input.context.project-context-context-toml",
          "input.context.project-context-global-md"
        ],
        "derivation": null
      },
      "source_item_refs": [
        "material-input-provenance"
      ]
    },
    {
      "key": "fact.requirement.declared-assurance-theorem",
      "cell_ref": "cell.requirement.declared-assurance-theorem",
      "outcome_ref": "proof-and-roi",
      "unit_ref": "subject.requirement.declared-assurance-theorem",
      "family_ref": "family.custom-long-task-real-capability",
      "condition_ref": "condition.proof-and-roi.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "owner_ref": "owner.harness-package",
      "value_kind": "boolean",
      "observation_scope": "product_boundary",
      "observation_sensitivity": "plain",
      "quantifier": {
        "kind": "one",
        "minimum": null,
        "maximum": null,
        "population_ref": null
      },
      "expected": {
        "representation": "inline",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/2/expected/value"
        },
        "sha256": "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b",
        "value": true
      },
      "provenance": {
        "kind": "direct",
        "authority_ref": "declared-assurance-theorem",
        "basis_refs": [
          "declared-assurance-theorem"
        ],
        "derivation": null
      },
      "source_item_refs": [
        "declared-assurance-theorem"
      ]
    },
    {
      "key": "fact.requirement.assurance-causal-chain",
      "cell_ref": "cell.requirement.assurance-causal-chain",
      "outcome_ref": "proof-and-roi",
      "unit_ref": "subject.requirement.assurance-causal-chain",
      "family_ref": "family.custom-long-task-real-capability",
      "condition_ref": "condition.proof-and-roi.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "owner_ref": "owner.harness-package",
      "value_kind": "boolean",
      "observation_scope": "product_boundary",
      "observation_sensitivity": "plain",
      "quantifier": {
        "kind": "one",
        "minimum": null,
        "maximum": null,
        "population_ref": null
      },
      "expected": {
        "representation": "inline",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/3/expected/value"
        },
        "sha256": "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b",
        "value": true
      },
      "provenance": {
        "kind": "direct",
        "authority_ref": "assurance-causal-chain",
        "basis_refs": [
          "assurance-causal-chain"
        ],
        "derivation": null
      },
      "source_item_refs": [
        "assurance-causal-chain"
      ]
    },
    {
      "key": "fact.requirement.known-selected-design-false-acceptance",
      "cell_ref": "cell.requirement.known-selected-design-false-acceptance",
      "outcome_ref": "p0-exact-recomputation",
      "unit_ref": "subject.requirement.known-selected-design-false-acceptance",
      "family_ref": "family.custom-long-task-real-capability",
      "condition_ref": "condition.p0-exact-recomputation.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "owner_ref": "owner.harness-package",
      "value_kind": "boolean",
      "observation_scope": "product_boundary",
      "observation_sensitivity": "plain",
      "quantifier": {
        "kind": "one",
        "minimum": null,
        "maximum": null,
        "population_ref": null
      },
      "expected": {
        "representation": "inline",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/4/expected/value"
        },
        "sha256": "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b",
        "value": true
      },
      "provenance": {
        "kind": "direct",
        "authority_ref": "known-selected-design-false-acceptance",
        "basis_refs": [
          "known-selected-design-false-acceptance"
        ],
        "derivation": null
      },
      "source_item_refs": [
        "known-selected-design-false-acceptance"
      ]
    },
    {
      "key": "fact.requirement.p0-positive-fixture-correction",
      "cell_ref": "cell.requirement.p0-positive-fixture-correction",
      "outcome_ref": "p0-exact-recomputation",
      "unit_ref": "subject.requirement.p0-positive-fixture-correction",
      "family_ref": "family.custom-long-task-real-capability",
      "condition_ref": "condition.p0-exact-recomputation.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "owner_ref": "owner.harness-package",
      "value_kind": "boolean",
      "observation_scope": "product_boundary",
      "observation_sensitivity": "plain",
      "quantifier": {
        "kind": "one",
        "minimum": null,
        "maximum": null,
        "population_ref": null
      },
      "expected": {
        "representation": "inline",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/5/expected/value"
        },
        "sha256": "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b",
        "value": true
      },
      "provenance": {
        "kind": "direct",
        "authority_ref": "p0-positive-fixture-correction",
        "basis_refs": [
          "p0-positive-fixture-correction"
        ],
        "derivation": null
      },
      "source_item_refs": [
        "p0-positive-fixture-correction"
      ]
    },
    {
      "key": "fact.requirement.p0-v1-negative-control",
      "cell_ref": "cell.requirement.p0-v1-negative-control",
      "outcome_ref": "p0-exact-recomputation",
      "unit_ref": "subject.requirement.p0-v1-negative-control",
      "family_ref": "family.custom-long-task-real-capability",
      "condition_ref": "condition.p0-exact-recomputation.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "owner_ref": "owner.harness-package",
      "value_kind": "boolean",
      "observation_scope": "product_boundary",
      "observation_sensitivity": "plain",
      "quantifier": {
        "kind": "one",
        "minimum": null,
        "maximum": null,
        "population_ref": null
      },
      "expected": {
        "representation": "inline",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/6/expected/value"
        },
        "sha256": "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b",
        "value": true
      },
      "provenance": {
        "kind": "direct",
        "authority_ref": "p0-v1-negative-control",
        "basis_refs": [
          "p0-v1-negative-control"
        ],
        "derivation": null
      },
      "source_item_refs": [
        "p0-v1-negative-control"
      ]
    },
    {
      "key": "fact.requirement.p0-v2-negative-control",
      "cell_ref": "cell.requirement.p0-v2-negative-control",
      "outcome_ref": "p0-exact-recomputation",
      "unit_ref": "subject.requirement.p0-v2-negative-control",
      "family_ref": "family.custom-long-task-real-capability",
      "condition_ref": "condition.p0-exact-recomputation.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "owner_ref": "owner.harness-package",
      "value_kind": "boolean",
      "observation_scope": "product_boundary",
      "observation_sensitivity": "plain",
      "quantifier": {
        "kind": "one",
        "minimum": null,
        "maximum": null,
        "population_ref": null
      },
      "expected": {
        "representation": "inline",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/7/expected/value"
        },
        "sha256": "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b",
        "value": true
      },
      "provenance": {
        "kind": "direct",
        "authority_ref": "p0-v2-negative-control",
        "basis_refs": [
          "p0-v2-negative-control"
        ],
        "derivation": null
      },
      "source_item_refs": [
        "p0-v2-negative-control"
      ]
    },
    {
      "key": "fact.requirement.shared-exact-comparison-owner",
      "cell_ref": "cell.requirement.shared-exact-comparison-owner",
      "outcome_ref": "p0-exact-recomputation",
      "unit_ref": "subject.requirement.shared-exact-comparison-owner",
      "family_ref": "family.custom-long-task-real-capability",
      "condition_ref": "condition.p0-exact-recomputation.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "owner_ref": "owner.harness-package",
      "value_kind": "boolean",
      "observation_scope": "product_boundary",
      "observation_sensitivity": "plain",
      "quantifier": {
        "kind": "one",
        "minimum": null,
        "maximum": null,
        "population_ref": null
      },
      "expected": {
        "representation": "inline",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/8/expected/value"
        },
        "sha256": "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b",
        "value": true
      },
      "provenance": {
        "kind": "direct",
        "authority_ref": "shared-exact-comparison-owner",
        "basis_refs": [
          "shared-exact-comparison-owner"
        ],
        "derivation": null
      },
      "source_item_refs": [
        "shared-exact-comparison-owner"
      ]
    },
    {
      "key": "fact.requirement.p0-owner-local-and-v3-compatible",
      "cell_ref": "cell.requirement.p0-owner-local-and-v3-compatible",
      "outcome_ref": "p0-exact-recomputation",
      "unit_ref": "subject.requirement.p0-owner-local-and-v3-compatible",
      "family_ref": "family.custom-long-task-real-capability",
      "condition_ref": "condition.p0-exact-recomputation.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "owner_ref": "owner.harness-package",
      "value_kind": "boolean",
      "observation_scope": "product_boundary",
      "observation_sensitivity": "plain",
      "quantifier": {
        "kind": "one",
        "minimum": null,
        "maximum": null,
        "population_ref": null
      },
      "expected": {
        "representation": "inline",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/9/expected/value"
        },
        "sha256": "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b",
        "value": true
      },
      "provenance": {
        "kind": "direct",
        "authority_ref": "p0-owner-local-and-v3-compatible",
        "basis_refs": [
          "p0-owner-local-and-v3-compatible"
        ],
        "derivation": null
      },
      "source_item_refs": [
        "p0-owner-local-and-v3-compatible"
      ]
    },
    {
      "key": "fact.requirement.p0-verification-boundary",
      "cell_ref": "cell.requirement.p0-verification-boundary",
      "outcome_ref": "p0-exact-recomputation",
      "unit_ref": "subject.requirement.p0-verification-boundary",
      "family_ref": "family.custom-long-task-real-capability",
      "condition_ref": "condition.p0-exact-recomputation.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "owner_ref": "owner.harness-package",
      "value_kind": "boolean",
      "observation_scope": "product_boundary",
      "observation_sensitivity": "plain",
      "quantifier": {
        "kind": "one",
        "minimum": null,
        "maximum": null,
        "population_ref": null
      },
      "expected": {
        "representation": "inline",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/10/expected/value"
        },
        "sha256": "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b",
        "value": true
      },
      "provenance": {
        "kind": "direct",
        "authority_ref": "p0-verification-boundary",
        "basis_refs": [
          "p0-verification-boundary"
        ],
        "derivation": null
      },
      "source_item_refs": [
        "p0-verification-boundary"
      ]
    },
    {
      "key": "fact.requirement.purpose-validity-floor-before-relative-antidegradation",
      "cell_ref": "cell.requirement.purpose-validity-floor-before-relative-antidegradation",
      "outcome_ref": "assurance-governance",
      "unit_ref": "subject.requirement.purpose-validity-floor-before-relative-antidegradation",
      "family_ref": "family.custom-long-task-real-capability",
      "condition_ref": "condition.assurance-governance.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "owner_ref": "owner.harness-package",
      "value_kind": "boolean",
      "observation_scope": "product_boundary",
      "observation_sensitivity": "plain",
      "quantifier": {
        "kind": "one",
        "minimum": null,
        "maximum": null,
        "population_ref": null
      },
      "expected": {
        "representation": "inline",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/11/expected/value"
        },
        "sha256": "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b",
        "value": true
      },
      "provenance": {
        "kind": "direct",
        "authority_ref": "purpose-validity-floor-before-relative-antidegradation",
        "basis_refs": [
          "purpose-validity-floor-before-relative-antidegradation"
        ],
        "derivation": null
      },
      "source_item_refs": [
        "purpose-validity-floor-before-relative-antidegradation"
      ]
    },
    {
      "key": "fact.requirement.invalid-baseline-and-claim-downgrade",
      "cell_ref": "cell.requirement.invalid-baseline-and-claim-downgrade",
      "outcome_ref": "assurance-governance",
      "unit_ref": "subject.requirement.invalid-baseline-and-claim-downgrade",
      "family_ref": "family.custom-long-task-real-capability",
      "condition_ref": "condition.assurance-governance.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "owner_ref": "owner.harness-package",
      "value_kind": "boolean",
      "observation_scope": "product_boundary",
      "observation_sensitivity": "plain",
      "quantifier": {
        "kind": "one",
        "minimum": null,
        "maximum": null,
        "population_ref": null
      },
      "expected": {
        "representation": "inline",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/12/expected/value"
        },
        "sha256": "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b",
        "value": true
      },
      "provenance": {
        "kind": "direct",
        "authority_ref": "invalid-baseline-and-claim-downgrade",
        "basis_refs": [
          "invalid-baseline-and-claim-downgrade"
        ],
        "derivation": null
      },
      "source_item_refs": [
        "invalid-baseline-and-claim-downgrade"
      ]
    },
    {
      "key": "fact.requirement.coverage-defined-by-rejected-attack-surface",
      "cell_ref": "cell.requirement.coverage-defined-by-rejected-attack-surface",
      "outcome_ref": "assurance-governance",
      "unit_ref": "subject.requirement.coverage-defined-by-rejected-attack-surface",
      "family_ref": "family.custom-long-task-real-capability",
      "condition_ref": "condition.assurance-governance.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "owner_ref": "owner.harness-package",
      "value_kind": "boolean",
      "observation_scope": "product_boundary",
      "observation_sensitivity": "plain",
      "quantifier": {
        "kind": "one",
        "minimum": null,
        "maximum": null,
        "population_ref": null
      },
      "expected": {
        "representation": "inline",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/13/expected/value"
        },
        "sha256": "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b",
        "value": true
      },
      "provenance": {
        "kind": "direct",
        "authority_ref": "coverage-defined-by-rejected-attack-surface",
        "basis_refs": [
          "coverage-defined-by-rejected-attack-surface"
        ],
        "derivation": null
      },
      "source_item_refs": [
        "coverage-defined-by-rejected-attack-surface"
      ]
    },
    {
      "key": "fact.requirement.critical-sentinel-positive-negative-controls",
      "cell_ref": "cell.requirement.critical-sentinel-positive-negative-controls",
      "outcome_ref": "assurance-governance",
      "unit_ref": "subject.requirement.critical-sentinel-positive-negative-controls",
      "family_ref": "family.custom-long-task-real-capability",
      "condition_ref": "condition.assurance-governance.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "owner_ref": "owner.harness-package",
      "value_kind": "boolean",
      "observation_scope": "product_boundary",
      "observation_sensitivity": "plain",
      "quantifier": {
        "kind": "one",
        "minimum": null,
        "maximum": null,
        "population_ref": null
      },
      "expected": {
        "representation": "inline",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/14/expected/value"
        },
        "sha256": "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b",
        "value": true
      },
      "provenance": {
        "kind": "direct",
        "authority_ref": "critical-sentinel-positive-negative-controls",
        "basis_refs": [
          "critical-sentinel-positive-negative-controls"
        ],
        "derivation": null
      },
      "source_item_refs": [
        "critical-sentinel-positive-negative-controls"
      ]
    },
    {
      "key": "fact.requirement.incident-counterexample-first-rule",
      "cell_ref": "cell.requirement.incident-counterexample-first-rule",
      "outcome_ref": "assurance-governance",
      "unit_ref": "subject.requirement.incident-counterexample-first-rule",
      "family_ref": "family.custom-long-task-real-capability",
      "condition_ref": "condition.assurance-governance.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "owner_ref": "owner.harness-package",
      "value_kind": "boolean",
      "observation_scope": "product_boundary",
      "observation_sensitivity": "plain",
      "quantifier": {
        "kind": "one",
        "minimum": null,
        "maximum": null,
        "population_ref": null
      },
      "expected": {
        "representation": "inline",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/15/expected/value"
        },
        "sha256": "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b",
        "value": true
      },
      "provenance": {
        "kind": "direct",
        "authority_ref": "incident-counterexample-first-rule",
        "basis_refs": [
          "incident-counterexample-first-rule"
        ],
        "derivation": null
      },
      "source_item_refs": [
        "incident-counterexample-first-rule"
      ]
    },
    {
      "key": "fact.requirement.sentinel-rationale-evidence-bounded",
      "cell_ref": "cell.requirement.sentinel-rationale-evidence-bounded",
      "outcome_ref": "assurance-governance",
      "unit_ref": "subject.requirement.sentinel-rationale-evidence-bounded",
      "family_ref": "family.custom-long-task-real-capability",
      "condition_ref": "condition.assurance-governance.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "owner_ref": "owner.harness-package",
      "value_kind": "boolean",
      "observation_scope": "product_boundary",
      "observation_sensitivity": "plain",
      "quantifier": {
        "kind": "one",
        "minimum": null,
        "maximum": null,
        "population_ref": null
      },
      "expected": {
        "representation": "inline",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/16/expected/value"
        },
        "sha256": "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b",
        "value": true
      },
      "provenance": {
        "kind": "direct",
        "authority_ref": "sentinel-rationale-evidence-bounded",
        "basis_refs": [
          "sentinel-rationale-evidence-bounded"
        ],
        "derivation": null
      },
      "source_item_refs": [
        "sentinel-rationale-evidence-bounded"
      ]
    },
    {
      "key": "fact.requirement.capability-claim-levels",
      "cell_ref": "cell.requirement.capability-claim-levels",
      "outcome_ref": "assurance-governance",
      "unit_ref": "subject.requirement.capability-claim-levels",
      "family_ref": "family.custom-long-task-real-capability",
      "condition_ref": "condition.assurance-governance.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "owner_ref": "owner.harness-package",
      "value_kind": "boolean",
      "observation_scope": "product_boundary",
      "observation_sensitivity": "plain",
      "quantifier": {
        "kind": "one",
        "minimum": null,
        "maximum": null,
        "population_ref": null
      },
      "expected": {
        "representation": "inline",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/17/expected/value"
        },
        "sha256": "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b",
        "value": true
      },
      "provenance": {
        "kind": "direct",
        "authority_ref": "capability-claim-levels",
        "basis_refs": [
          "capability-claim-levels"
        ],
        "derivation": null
      },
      "source_item_refs": [
        "capability-claim-levels"
      ]
    },
    {
      "key": "fact.requirement.route-b-project-owner-decision",
      "cell_ref": "cell.requirement.route-b-project-owner-decision",
      "outcome_ref": "observer-tcb-closure",
      "unit_ref": "subject.requirement.route-b-project-owner-decision",
      "family_ref": "family.custom-long-task-real-capability",
      "condition_ref": "condition.observer-tcb-closure.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "owner_ref": "owner.harness-package",
      "value_kind": "boolean",
      "observation_scope": "product_boundary",
      "observation_sensitivity": "plain",
      "quantifier": {
        "kind": "one",
        "minimum": null,
        "maximum": null,
        "population_ref": null
      },
      "expected": {
        "representation": "inline",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/18/expected/value"
        },
        "sha256": "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b",
        "value": true
      },
      "provenance": {
        "kind": "direct",
        "authority_ref": "route-b-project-owner-decision",
        "basis_refs": [
          "route-b-project-owner-decision",
          "input.context.project-context-areas-harness-package-decision-rationale-long-task-workflow-md"
        ],
        "derivation": null
      },
      "source_item_refs": [
        "route-b-project-owner-decision"
      ]
    },
    {
      "key": "fact.requirement.observation-channel-authority",
      "cell_ref": "cell.requirement.observation-channel-authority",
      "outcome_ref": "observer-tcb-closure",
      "unit_ref": "subject.requirement.observation-channel-authority",
      "family_ref": "family.custom-long-task-real-capability",
      "condition_ref": "condition.observer-tcb-closure.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "owner_ref": "owner.harness-package",
      "value_kind": "boolean",
      "observation_scope": "product_boundary",
      "observation_sensitivity": "plain",
      "quantifier": {
        "kind": "one",
        "minimum": null,
        "maximum": null,
        "population_ref": null
      },
      "expected": {
        "representation": "inline",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/19/expected/value"
        },
        "sha256": "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b",
        "value": true
      },
      "provenance": {
        "kind": "direct",
        "authority_ref": "observation-channel-authority",
        "basis_refs": [
          "observation-channel-authority"
        ],
        "derivation": null
      },
      "source_item_refs": [
        "observation-channel-authority"
      ]
    },
    {
      "key": "fact.requirement.expected-actual-comparison-verdict-ownership",
      "cell_ref": "cell.requirement.expected-actual-comparison-verdict-ownership",
      "outcome_ref": "observer-tcb-closure",
      "unit_ref": "subject.requirement.expected-actual-comparison-verdict-ownership",
      "family_ref": "family.custom-long-task-real-capability",
      "condition_ref": "condition.observer-tcb-closure.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "owner_ref": "owner.harness-package",
      "value_kind": "boolean",
      "observation_scope": "product_boundary",
      "observation_sensitivity": "plain",
      "quantifier": {
        "kind": "one",
        "minimum": null,
        "maximum": null,
        "population_ref": null
      },
      "expected": {
        "representation": "inline",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/20/expected/value"
        },
        "sha256": "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b",
        "value": true
      },
      "provenance": {
        "kind": "direct",
        "authority_ref": "expected-actual-comparison-verdict-ownership",
        "basis_refs": [
          "expected-actual-comparison-verdict-ownership"
        ],
        "derivation": null
      },
      "source_item_refs": [
        "expected-actual-comparison-verdict-ownership"
      ]
    },
    {
      "key": "fact.requirement.bounded-admitted-artifact-contract",
      "cell_ref": "cell.requirement.bounded-admitted-artifact-contract",
      "outcome_ref": "observer-tcb-closure",
      "unit_ref": "subject.requirement.bounded-admitted-artifact-contract",
      "family_ref": "family.custom-long-task-real-capability",
      "condition_ref": "condition.observer-tcb-closure.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "owner_ref": "owner.harness-package",
      "value_kind": "boolean",
      "observation_scope": "product_boundary",
      "observation_sensitivity": "plain",
      "quantifier": {
        "kind": "one",
        "minimum": null,
        "maximum": null,
        "population_ref": null
      },
      "expected": {
        "representation": "inline",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/21/expected/value"
        },
        "sha256": "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b",
        "value": true
      },
      "provenance": {
        "kind": "direct",
        "authority_ref": "bounded-admitted-artifact-contract",
        "basis_refs": [
          "bounded-admitted-artifact-contract"
        ],
        "derivation": null
      },
      "source_item_refs": [
        "bounded-admitted-artifact-contract"
      ]
    },
    {
      "key": "fact.requirement.actual-artifact-reextraction",
      "cell_ref": "cell.requirement.actual-artifact-reextraction",
      "outcome_ref": "observer-tcb-closure",
      "unit_ref": "subject.requirement.actual-artifact-reextraction",
      "family_ref": "family.custom-long-task-real-capability",
      "condition_ref": "condition.observer-tcb-closure.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "owner_ref": "owner.harness-package",
      "value_kind": "boolean",
      "observation_scope": "product_boundary",
      "observation_sensitivity": "plain",
      "quantifier": {
        "kind": "one",
        "minimum": null,
        "maximum": null,
        "population_ref": null
      },
      "expected": {
        "representation": "inline",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/22/expected/value"
        },
        "sha256": "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b",
        "value": true
      },
      "provenance": {
        "kind": "direct",
        "authority_ref": "actual-artifact-reextraction",
        "basis_refs": [
          "actual-artifact-reextraction"
        ],
        "derivation": null
      },
      "source_item_refs": [
        "actual-artifact-reextraction"
      ]
    },
    {
      "key": "fact.requirement.challenge-is-freshness-only",
      "cell_ref": "cell.requirement.challenge-is-freshness-only",
      "outcome_ref": "observer-tcb-closure",
      "unit_ref": "subject.requirement.challenge-is-freshness-only",
      "family_ref": "family.custom-long-task-real-capability",
      "condition_ref": "condition.observer-tcb-closure.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "owner_ref": "owner.harness-package",
      "value_kind": "boolean",
      "observation_scope": "product_boundary",
      "observation_sensitivity": "plain",
      "quantifier": {
        "kind": "one",
        "minimum": null,
        "maximum": null,
        "population_ref": null
      },
      "expected": {
        "representation": "inline",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/23/expected/value"
        },
        "sha256": "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b",
        "value": true
      },
      "provenance": {
        "kind": "direct",
        "authority_ref": "challenge-is-freshness-only",
        "basis_refs": [
          "challenge-is-freshness-only"
        ],
        "derivation": null
      },
      "source_item_refs": [
        "challenge-is-freshness-only"
      ]
    },
    {
      "key": "fact.requirement.generated-carrier-semantic-role",
      "cell_ref": "cell.requirement.generated-carrier-semantic-role",
      "outcome_ref": "observer-tcb-closure",
      "unit_ref": "subject.requirement.generated-carrier-semantic-role",
      "family_ref": "family.custom-long-task-real-capability",
      "condition_ref": "condition.observer-tcb-closure.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "owner_ref": "owner.harness-package",
      "value_kind": "boolean",
      "observation_scope": "product_boundary",
      "observation_sensitivity": "plain",
      "quantifier": {
        "kind": "one",
        "minimum": null,
        "maximum": null,
        "population_ref": null
      },
      "expected": {
        "representation": "inline",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/24/expected/value"
        },
        "sha256": "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b",
        "value": true
      },
      "provenance": {
        "kind": "direct",
        "authority_ref": "generated-carrier-semantic-role",
        "basis_refs": [
          "generated-carrier-semantic-role"
        ],
        "derivation": null
      },
      "source_item_refs": [
        "generated-carrier-semantic-role"
      ]
    },
    {
      "key": "fact.requirement.expected-to-actual-self-proof-rejection",
      "cell_ref": "cell.requirement.expected-to-actual-self-proof-rejection",
      "outcome_ref": "observer-tcb-closure",
      "unit_ref": "subject.requirement.expected-to-actual-self-proof-rejection",
      "family_ref": "family.custom-long-task-real-capability",
      "condition_ref": "condition.observer-tcb-closure.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "owner_ref": "owner.harness-package",
      "value_kind": "boolean",
      "observation_scope": "product_boundary",
      "observation_sensitivity": "plain",
      "quantifier": {
        "kind": "one",
        "minimum": null,
        "maximum": null,
        "population_ref": null
      },
      "expected": {
        "representation": "inline",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/25/expected/value"
        },
        "sha256": "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b",
        "value": true
      },
      "provenance": {
        "kind": "direct",
        "authority_ref": "expected-to-actual-self-proof-rejection",
        "basis_refs": [
          "expected-to-actual-self-proof-rejection"
        ],
        "derivation": null
      },
      "source_item_refs": [
        "expected-to-actual-self-proof-rejection"
      ]
    },
    {
      "key": "fact.requirement.production-reachability",
      "cell_ref": "cell.requirement.production-reachability",
      "outcome_ref": "observer-tcb-closure",
      "unit_ref": "subject.requirement.production-reachability",
      "family_ref": "family.custom-long-task-real-capability",
      "condition_ref": "condition.observer-tcb-closure.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "owner_ref": "owner.harness-package",
      "value_kind": "boolean",
      "observation_scope": "product_boundary",
      "observation_sensitivity": "plain",
      "quantifier": {
        "kind": "one",
        "minimum": null,
        "maximum": null,
        "population_ref": null
      },
      "expected": {
        "representation": "inline",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/26/expected/value"
        },
        "sha256": "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b",
        "value": true
      },
      "provenance": {
        "kind": "direct",
        "authority_ref": "production-reachability",
        "basis_refs": [
          "production-reachability"
        ],
        "derivation": null
      },
      "source_item_refs": [
        "production-reachability"
      ]
    },
    {
      "key": "fact.requirement.counterfactual-actual-change-and-impact-set",
      "cell_ref": "cell.requirement.counterfactual-actual-change-and-impact-set",
      "outcome_ref": "observer-tcb-closure",
      "unit_ref": "subject.requirement.counterfactual-actual-change-and-impact-set",
      "family_ref": "family.custom-long-task-real-capability",
      "condition_ref": "condition.observer-tcb-closure.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "owner_ref": "owner.harness-package",
      "value_kind": "boolean",
      "observation_scope": "product_boundary",
      "observation_sensitivity": "plain",
      "quantifier": {
        "kind": "one",
        "minimum": null,
        "maximum": null,
        "population_ref": null
      },
      "expected": {
        "representation": "inline",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/27/expected/value"
        },
        "sha256": "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b",
        "value": true
      },
      "provenance": {
        "kind": "direct",
        "authority_ref": "counterfactual-actual-change-and-impact-set",
        "basis_refs": [
          "counterfactual-actual-change-and-impact-set"
        ],
        "derivation": null
      },
      "source_item_refs": [
        "counterfactual-actual-change-and-impact-set"
      ]
    },
    {
      "key": "fact.requirement.selected-design-existing-owner-preservation",
      "cell_ref": "cell.requirement.selected-design-existing-owner-preservation",
      "outcome_ref": "p0-exact-recomputation",
      "unit_ref": "subject.requirement.selected-design-existing-owner-preservation",
      "family_ref": "family.custom-long-task-real-capability",
      "condition_ref": "condition.p0-exact-recomputation.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "owner_ref": "owner.harness-package",
      "value_kind": "boolean",
      "observation_scope": "product_boundary",
      "observation_sensitivity": "plain",
      "quantifier": {
        "kind": "one",
        "minimum": null,
        "maximum": null,
        "population_ref": null
      },
      "expected": {
        "representation": "inline",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/28/expected/value"
        },
        "sha256": "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b",
        "value": true
      },
      "provenance": {
        "kind": "direct",
        "authority_ref": "selected-design-existing-owner-preservation",
        "basis_refs": [
          "selected-design-existing-owner-preservation",
          "input.context.project-context-areas-harness-package-contracts-design-resource-handoff-md"
        ],
        "derivation": null
      },
      "source_item_refs": [
        "selected-design-existing-owner-preservation"
      ]
    },
    {
      "key": "fact.requirement.no-universal-ui-observer",
      "cell_ref": "cell.requirement.no-universal-ui-observer",
      "outcome_ref": "observer-tcb-closure",
      "unit_ref": "subject.requirement.no-universal-ui-observer",
      "family_ref": "family.custom-long-task-real-capability",
      "condition_ref": "condition.observer-tcb-closure.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "owner_ref": "owner.harness-package",
      "value_kind": "boolean",
      "observation_scope": "product_boundary",
      "observation_sensitivity": "plain",
      "quantifier": {
        "kind": "one",
        "minimum": null,
        "maximum": null,
        "population_ref": null
      },
      "expected": {
        "representation": "inline",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/29/expected/value"
        },
        "sha256": "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b",
        "value": true
      },
      "provenance": {
        "kind": "direct",
        "authority_ref": "no-universal-ui-observer",
        "basis_refs": [
          "no-universal-ui-observer"
        ],
        "derivation": null
      },
      "source_item_refs": [
        "no-universal-ui-observer"
      ]
    },
    {
      "key": "fact.requirement.v3-v4-and-migration-rule",
      "cell_ref": "cell.requirement.v3-v4-and-migration-rule",
      "outcome_ref": "observer-tcb-closure",
      "unit_ref": "subject.requirement.v3-v4-and-migration-rule",
      "family_ref": "family.custom-long-task-real-capability",
      "condition_ref": "condition.observer-tcb-closure.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "owner_ref": "owner.harness-package",
      "value_kind": "boolean",
      "observation_scope": "product_boundary",
      "observation_sensitivity": "plain",
      "quantifier": {
        "kind": "one",
        "minimum": null,
        "maximum": null,
        "population_ref": null
      },
      "expected": {
        "representation": "inline",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/30/expected/value"
        },
        "sha256": "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b",
        "value": true
      },
      "provenance": {
        "kind": "direct",
        "authority_ref": "v3-v4-and-migration-rule",
        "basis_refs": [
          "v3-v4-and-migration-rule"
        ],
        "derivation": null
      },
      "source_item_refs": [
        "v3-v4-and-migration-rule"
      ]
    },
    {
      "key": "fact.requirement.attack-suite-ground-truth",
      "cell_ref": "cell.requirement.attack-suite-ground-truth",
      "outcome_ref": "proof-and-roi",
      "unit_ref": "subject.requirement.attack-suite-ground-truth",
      "family_ref": "family.custom-long-task-real-capability",
      "condition_ref": "condition.proof-and-roi.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "owner_ref": "owner.harness-package",
      "value_kind": "boolean",
      "observation_scope": "product_boundary",
      "observation_sensitivity": "plain",
      "quantifier": {
        "kind": "one",
        "minimum": null,
        "maximum": null,
        "population_ref": null
      },
      "expected": {
        "representation": "inline",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/31/expected/value"
        },
        "sha256": "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b",
        "value": true
      },
      "provenance": {
        "kind": "direct",
        "authority_ref": "attack-suite-ground-truth",
        "basis_refs": [
          "attack-suite-ground-truth"
        ],
        "derivation": null
      },
      "source_item_refs": [
        "attack-suite-ground-truth"
      ]
    },
    {
      "key": "fact.requirement.valid-control-suite",
      "cell_ref": "cell.requirement.valid-control-suite",
      "outcome_ref": "proof-and-roi",
      "unit_ref": "subject.requirement.valid-control-suite",
      "family_ref": "family.custom-long-task-real-capability",
      "condition_ref": "condition.proof-and-roi.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "owner_ref": "owner.harness-package",
      "value_kind": "boolean",
      "observation_scope": "product_boundary",
      "observation_sensitivity": "plain",
      "quantifier": {
        "kind": "one",
        "minimum": null,
        "maximum": null,
        "population_ref": null
      },
      "expected": {
        "representation": "inline",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/32/expected/value"
        },
        "sha256": "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b",
        "value": true
      },
      "provenance": {
        "kind": "direct",
        "authority_ref": "valid-control-suite",
        "basis_refs": [
          "valid-control-suite"
        ],
        "derivation": null
      },
      "source_item_refs": [
        "valid-control-suite"
      ]
    },
    {
      "key": "fact.requirement.black-box-final-gate-lifecycle",
      "cell_ref": "cell.requirement.black-box-final-gate-lifecycle",
      "outcome_ref": "proof-and-roi",
      "unit_ref": "subject.requirement.black-box-final-gate-lifecycle",
      "family_ref": "family.custom-long-task-real-capability",
      "condition_ref": "condition.proof-and-roi.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "owner_ref": "owner.harness-package",
      "value_kind": "boolean",
      "observation_scope": "product_boundary",
      "observation_sensitivity": "plain",
      "quantifier": {
        "kind": "one",
        "minimum": null,
        "maximum": null,
        "population_ref": null
      },
      "expected": {
        "representation": "inline",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/33/expected/value"
        },
        "sha256": "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b",
        "value": true
      },
      "provenance": {
        "kind": "direct",
        "authority_ref": "black-box-final-gate-lifecycle",
        "basis_refs": [
          "black-box-final-gate-lifecycle"
        ],
        "derivation": null
      },
      "source_item_refs": [
        "black-box-final-gate-lifecycle"
      ]
    },
    {
      "key": "fact.requirement.starward-sanitized-replay",
      "cell_ref": "cell.requirement.starward-sanitized-replay",
      "outcome_ref": "proof-and-roi",
      "unit_ref": "subject.requirement.starward-sanitized-replay",
      "family_ref": "family.custom-long-task-real-capability",
      "condition_ref": "condition.proof-and-roi.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "owner_ref": "owner.harness-package",
      "value_kind": "boolean",
      "observation_scope": "product_boundary",
      "observation_sensitivity": "plain",
      "quantifier": {
        "kind": "one",
        "minimum": null,
        "maximum": null,
        "population_ref": null
      },
      "expected": {
        "representation": "inline",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/34/expected/value"
        },
        "sha256": "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b",
        "value": true
      },
      "provenance": {
        "kind": "direct",
        "authority_ref": "starward-sanitized-replay",
        "basis_refs": [
          "starward-sanitized-replay"
        ],
        "derivation": null
      },
      "source_item_refs": [
        "starward-sanitized-replay"
      ]
    },
    {
      "key": "fact.requirement.fresh-agent-benchmark-boundary",
      "cell_ref": "cell.requirement.fresh-agent-benchmark-boundary",
      "outcome_ref": "proof-and-roi",
      "unit_ref": "subject.requirement.fresh-agent-benchmark-boundary",
      "family_ref": "family.custom-long-task-real-capability",
      "condition_ref": "condition.proof-and-roi.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "owner_ref": "owner.harness-package",
      "value_kind": "boolean",
      "observation_scope": "product_boundary",
      "observation_sensitivity": "plain",
      "quantifier": {
        "kind": "one",
        "minimum": null,
        "maximum": null,
        "population_ref": null
      },
      "expected": {
        "representation": "inline",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/35/expected/value"
        },
        "sha256": "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b",
        "value": true
      },
      "provenance": {
        "kind": "direct",
        "authority_ref": "fresh-agent-benchmark-boundary",
        "basis_refs": [
          "fresh-agent-benchmark-boundary",
          "input.context.project-context-areas-delivery-benchmark-md"
        ],
        "derivation": null
      },
      "source_item_refs": [
        "fresh-agent-benchmark-boundary"
      ]
    },
    {
      "key": "fact.requirement.roi-admission-order",
      "cell_ref": "cell.requirement.roi-admission-order",
      "outcome_ref": "proof-and-roi",
      "unit_ref": "subject.requirement.roi-admission-order",
      "family_ref": "family.custom-long-task-real-capability",
      "condition_ref": "condition.proof-and-roi.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "owner_ref": "owner.harness-package",
      "value_kind": "boolean",
      "observation_scope": "product_boundary",
      "observation_sensitivity": "plain",
      "quantifier": {
        "kind": "one",
        "minimum": null,
        "maximum": null,
        "population_ref": null
      },
      "expected": {
        "representation": "inline",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/36/expected/value"
        },
        "sha256": "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b",
        "value": true
      },
      "provenance": {
        "kind": "direct",
        "authority_ref": "roi-admission-order",
        "basis_refs": [
          "roi-admission-order"
        ],
        "derivation": null
      },
      "source_item_refs": [
        "roi-admission-order"
      ]
    },
    {
      "key": "fact.requirement.early-real-entry-feedback",
      "cell_ref": "cell.requirement.early-real-entry-feedback",
      "outcome_ref": "proof-and-roi",
      "unit_ref": "subject.requirement.early-real-entry-feedback",
      "family_ref": "family.custom-long-task-real-capability",
      "condition_ref": "condition.proof-and-roi.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "owner_ref": "owner.harness-package",
      "value_kind": "boolean",
      "observation_scope": "product_boundary",
      "observation_sensitivity": "plain",
      "quantifier": {
        "kind": "one",
        "minimum": null,
        "maximum": null,
        "population_ref": null
      },
      "expected": {
        "representation": "inline",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/37/expected/value"
        },
        "sha256": "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b",
        "value": true
      },
      "provenance": {
        "kind": "direct",
        "authority_ref": "early-real-entry-feedback",
        "basis_refs": [
          "early-real-entry-feedback"
        ],
        "derivation": null
      },
      "source_item_refs": [
        "early-real-entry-feedback"
      ]
    },
    {
      "key": "fact.requirement.no-new-lifecycle-authority-registry",
      "cell_ref": "cell.requirement.no-new-lifecycle-authority-registry",
      "outcome_ref": "assurance-governance",
      "unit_ref": "subject.requirement.no-new-lifecycle-authority-registry",
      "family_ref": "family.custom-long-task-real-capability",
      "condition_ref": "condition.assurance-governance.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "owner_ref": "owner.harness-package",
      "value_kind": "boolean",
      "observation_scope": "product_boundary",
      "observation_sensitivity": "plain",
      "quantifier": {
        "kind": "one",
        "minimum": null,
        "maximum": null,
        "population_ref": null
      },
      "expected": {
        "representation": "inline",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/38/expected/value"
        },
        "sha256": "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b",
        "value": true
      },
      "provenance": {
        "kind": "direct",
        "authority_ref": "no-new-lifecycle-authority-registry",
        "basis_refs": [
          "no-new-lifecycle-authority-registry",
          "input.context.project-context-areas-harness-package-contracts-workflow-contract-md"
        ],
        "derivation": null
      },
      "source_item_refs": [
        "no-new-lifecycle-authority-registry"
      ]
    },
    {
      "key": "fact.requirement.owner-dependency-lifecycle-boundary",
      "cell_ref": "cell.requirement.owner-dependency-lifecycle-boundary",
      "outcome_ref": "observer-tcb-closure",
      "unit_ref": "subject.requirement.owner-dependency-lifecycle-boundary",
      "family_ref": "family.custom-long-task-real-capability",
      "condition_ref": "condition.observer-tcb-closure.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "owner_ref": "owner.harness-package",
      "value_kind": "boolean",
      "observation_scope": "product_boundary",
      "observation_sensitivity": "plain",
      "quantifier": {
        "kind": "one",
        "minimum": null,
        "maximum": null,
        "population_ref": null
      },
      "expected": {
        "representation": "inline",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/39/expected/value"
        },
        "sha256": "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b",
        "value": true
      },
      "provenance": {
        "kind": "direct",
        "authority_ref": "owner-dependency-lifecycle-boundary",
        "basis_refs": [
          "owner-dependency-lifecycle-boundary",
          "input.context.project-context-areas-harness-package-implementation-index-md"
        ],
        "derivation": null
      },
      "source_item_refs": [
        "owner-dependency-lifecycle-boundary"
      ]
    },
    {
      "key": "fact.requirement.build-reuse-buy-allowed-set",
      "cell_ref": "cell.requirement.build-reuse-buy-allowed-set",
      "outcome_ref": "observer-tcb-closure",
      "unit_ref": "subject.requirement.build-reuse-buy-allowed-set",
      "family_ref": "family.custom-long-task-real-capability",
      "condition_ref": "condition.observer-tcb-closure.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "owner_ref": "owner.harness-package",
      "value_kind": "boolean",
      "observation_scope": "product_boundary",
      "observation_sensitivity": "plain",
      "quantifier": {
        "kind": "one",
        "minimum": null,
        "maximum": null,
        "population_ref": null
      },
      "expected": {
        "representation": "inline",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/40/expected/value"
        },
        "sha256": "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b",
        "value": true
      },
      "provenance": {
        "kind": "direct",
        "authority_ref": "build-reuse-buy-allowed-set",
        "basis_refs": [
          "build-reuse-buy-allowed-set",
          "input.context.project-context-areas-harness-package-decision-rationale-architecture-quality-md"
        ],
        "derivation": null
      },
      "source_item_refs": [
        "build-reuse-buy-allowed-set"
      ]
    },
    {
      "key": "fact.requirement.technical-debt-and-future-change",
      "cell_ref": "cell.requirement.technical-debt-and-future-change",
      "outcome_ref": "p0-exact-recomputation",
      "unit_ref": "subject.requirement.technical-debt-and-future-change",
      "family_ref": "family.custom-long-task-real-capability",
      "condition_ref": "condition.p0-exact-recomputation.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "owner_ref": "owner.harness-package",
      "value_kind": "boolean",
      "observation_scope": "product_boundary",
      "observation_sensitivity": "plain",
      "quantifier": {
        "kind": "one",
        "minimum": null,
        "maximum": null,
        "population_ref": null
      },
      "expected": {
        "representation": "inline",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/41/expected/value"
        },
        "sha256": "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b",
        "value": true
      },
      "provenance": {
        "kind": "direct",
        "authority_ref": "technical-debt-and-future-change",
        "basis_refs": [
          "technical-debt-and-future-change"
        ],
        "derivation": null
      },
      "source_item_refs": [
        "technical-debt-and-future-change"
      ]
    },
    {
      "key": "fact.requirement.compatibility-security-resource-boundaries",
      "cell_ref": "cell.requirement.compatibility-security-resource-boundaries",
      "outcome_ref": "observer-tcb-closure",
      "unit_ref": "subject.requirement.compatibility-security-resource-boundaries",
      "family_ref": "family.custom-long-task-real-capability",
      "condition_ref": "condition.observer-tcb-closure.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "owner_ref": "owner.harness-package",
      "value_kind": "boolean",
      "observation_scope": "product_boundary",
      "observation_sensitivity": "plain",
      "quantifier": {
        "kind": "one",
        "minimum": null,
        "maximum": null,
        "population_ref": null
      },
      "expected": {
        "representation": "inline",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/42/expected/value"
        },
        "sha256": "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b",
        "value": true
      },
      "provenance": {
        "kind": "direct",
        "authority_ref": "compatibility-security-resource-boundaries",
        "basis_refs": [
          "compatibility-security-resource-boundaries"
        ],
        "derivation": null
      },
      "source_item_refs": [
        "compatibility-security-resource-boundaries"
      ]
    },
    {
      "key": "fact.requirement.context-and-public-authority-update",
      "cell_ref": "cell.requirement.context-and-public-authority-update",
      "outcome_ref": "proof-and-roi",
      "unit_ref": "subject.requirement.context-and-public-authority-update",
      "family_ref": "family.custom-long-task-real-capability",
      "condition_ref": "condition.proof-and-roi.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "owner_ref": "owner.harness-package",
      "value_kind": "boolean",
      "observation_scope": "product_boundary",
      "observation_sensitivity": "plain",
      "quantifier": {
        "kind": "one",
        "minimum": null,
        "maximum": null,
        "population_ref": null
      },
      "expected": {
        "representation": "inline",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/43/expected/value"
        },
        "sha256": "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b",
        "value": true
      },
      "provenance": {
        "kind": "direct",
        "authority_ref": "context-and-public-authority-update",
        "basis_refs": [
          "context-and-public-authority-update",
          "input.context.project-context-areas-harness-package-contracts-package-managed-surfaces-md"
        ],
        "derivation": null
      },
      "source_item_refs": [
        "context-and-public-authority-update"
      ]
    },
    {
      "key": "fact.requirement.verification-sequence-and-current-candidate",
      "cell_ref": "cell.requirement.verification-sequence-and-current-candidate",
      "outcome_ref": "proof-and-roi",
      "unit_ref": "subject.requirement.verification-sequence-and-current-candidate",
      "family_ref": "family.custom-long-task-real-capability",
      "condition_ref": "condition.proof-and-roi.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "owner_ref": "owner.harness-package",
      "value_kind": "boolean",
      "observation_scope": "product_boundary",
      "observation_sensitivity": "plain",
      "quantifier": {
        "kind": "one",
        "minimum": null,
        "maximum": null,
        "population_ref": null
      },
      "expected": {
        "representation": "inline",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/44/expected/value"
        },
        "sha256": "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b",
        "value": true
      },
      "provenance": {
        "kind": "direct",
        "authority_ref": "verification-sequence-and-current-candidate",
        "basis_refs": [
          "verification-sequence-and-current-candidate",
          "input.context.project-context-areas-harness-package-verification-md"
        ],
        "derivation": null
      },
      "source_item_refs": [
        "verification-sequence-and-current-candidate"
      ]
    },
    {
      "key": "fact.requirement.final-hard-acceptance",
      "cell_ref": "cell.requirement.final-hard-acceptance",
      "outcome_ref": "proof-and-roi",
      "unit_ref": "subject.requirement.final-hard-acceptance",
      "family_ref": "family.custom-long-task-real-capability",
      "condition_ref": "condition.proof-and-roi.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "owner_ref": "owner.harness-package",
      "value_kind": "boolean",
      "observation_scope": "product_boundary",
      "observation_sensitivity": "plain",
      "quantifier": {
        "kind": "one",
        "minimum": null,
        "maximum": null,
        "population_ref": null
      },
      "expected": {
        "representation": "inline",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/45/expected/value"
        },
        "sha256": "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b",
        "value": true
      },
      "provenance": {
        "kind": "direct",
        "authority_ref": "final-hard-acceptance",
        "basis_refs": [
          "final-hard-acceptance"
        ],
        "derivation": null
      },
      "source_item_refs": [
        "final-hard-acceptance"
      ]
    },
    {
      "key": "fact.requirement.approved-final-capability-wording",
      "cell_ref": "cell.requirement.approved-final-capability-wording",
      "outcome_ref": "assurance-governance",
      "unit_ref": "subject.requirement.approved-final-capability-wording",
      "family_ref": "family.custom-long-task-real-capability",
      "condition_ref": "condition.assurance-governance.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "owner_ref": "owner.harness-package",
      "value_kind": "boolean",
      "observation_scope": "product_boundary",
      "observation_sensitivity": "plain",
      "quantifier": {
        "kind": "one",
        "minimum": null,
        "maximum": null,
        "population_ref": null
      },
      "expected": {
        "representation": "inline",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/46/expected/value"
        },
        "sha256": "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b",
        "value": true
      },
      "provenance": {
        "kind": "direct",
        "authority_ref": "approved-final-capability-wording",
        "basis_refs": [
          "approved-final-capability-wording"
        ],
        "derivation": null
      },
      "source_item_refs": [
        "approved-final-capability-wording"
      ]
    },
    {
      "key": "fact.requirement.critical-scope-escape-risk",
      "cell_ref": "cell.requirement.critical-scope-escape-risk",
      "outcome_ref": "observer-tcb-closure",
      "unit_ref": "subject.requirement.critical-scope-escape-risk",
      "family_ref": "family.custom-long-task-real-capability",
      "condition_ref": "condition.observer-tcb-closure.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "owner_ref": "owner.harness-package",
      "value_kind": "boolean",
      "observation_scope": "product_boundary",
      "observation_sensitivity": "plain",
      "quantifier": {
        "kind": "one",
        "minimum": null,
        "maximum": null,
        "population_ref": null
      },
      "expected": {
        "representation": "inline",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/47/expected/value"
        },
        "sha256": "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b",
        "value": true
      },
      "provenance": {
        "kind": "direct",
        "authority_ref": "critical-scope-escape-risk",
        "basis_refs": [
          "critical-scope-escape-risk"
        ],
        "derivation": null
      },
      "source_item_refs": [
        "critical-scope-escape-risk"
      ]
    },
    {
      "key": "fact.requirement.critical-self-attestation-risk",
      "cell_ref": "cell.requirement.critical-self-attestation-risk",
      "outcome_ref": "observer-tcb-closure",
      "unit_ref": "subject.requirement.critical-self-attestation-risk",
      "family_ref": "family.custom-long-task-real-capability",
      "condition_ref": "condition.observer-tcb-closure.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "owner_ref": "owner.harness-package",
      "value_kind": "boolean",
      "observation_scope": "product_boundary",
      "observation_sensitivity": "plain",
      "quantifier": {
        "kind": "one",
        "minimum": null,
        "maximum": null,
        "population_ref": null
      },
      "expected": {
        "representation": "inline",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/48/expected/value"
        },
        "sha256": "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b",
        "value": true
      },
      "provenance": {
        "kind": "direct",
        "authority_ref": "critical-self-attestation-risk",
        "basis_refs": [
          "critical-self-attestation-risk"
        ],
        "derivation": null
      },
      "source_item_refs": [
        "critical-self-attestation-risk"
      ]
    },
    {
      "key": "fact.requirement.critical-claim-inflation-risk",
      "cell_ref": "cell.requirement.critical-claim-inflation-risk",
      "outcome_ref": "assurance-governance",
      "unit_ref": "subject.requirement.critical-claim-inflation-risk",
      "family_ref": "family.custom-long-task-real-capability",
      "condition_ref": "condition.assurance-governance.current-candidate",
      "property_ref": "property.custom-requirement-satisfied",
      "owner_ref": "owner.harness-package",
      "value_kind": "boolean",
      "observation_scope": "product_boundary",
      "observation_sensitivity": "plain",
      "quantifier": {
        "kind": "one",
        "minimum": null,
        "maximum": null,
        "population_ref": null
      },
      "expected": {
        "representation": "inline",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/facts/49/expected/value"
        },
        "sha256": "b5bea41b6c623f7c09f1bf24dcae58ebab3c0cdd90ad966bc43a45b44867e12b",
        "value": true
      },
      "provenance": {
        "kind": "direct",
        "authority_ref": "critical-claim-inflation-risk",
        "basis_refs": [
          "critical-claim-inflation-risk"
        ],
        "derivation": null
      },
      "source_item_refs": [
        "critical-claim-inflation-risk"
      ]
    }
  ],
  "proof_obligations": [
    {
      "key": "proof.requirement.real-capability-closure-result.exact",
      "fact_ref": "fact.requirement.real-capability-closure-result",
      "method": "exact_value",
      "authority": "machine",
      "proof_surface": "runtime_behavior",
      "evidence_capabilities": [
        "semantic_fact"
      ],
      "comparison": {
        "comparator": "exact_value",
        "mode": "exact",
        "parameters": {
          "representation": "inline",
          "locator": {
            "material_ref": "long-task-real-capability-facts",
            "kind": "manifest_pointer",
            "value": "/proof_obligations/0/comparison/parameters/value"
          },
          "sha256": "a6b8e09402c2277ac9516f6820940db216072211e7912326b64ff416e54f2820",
          "value": {
            "comparator": "exact_value"
          }
        },
        "tolerance": null,
        "mask": null
      },
      "oracle_ref": "oracle.long-task-real-capability",
      "environment_ref": "environment.long-task-real-capability",
      "observer_refs": [],
      "counterfactual": {
        "disposition": "required",
        "refs": [
          "mutate-proof-and-roi"
        ],
        "basis_refs": [
          "real-capability-closure-result"
        ],
        "rationale": "The Outcome-owned production or governance carrier mutation must make this independently observed requirement fail while preserving target liveness."
      }
    },
    {
      "key": "proof.requirement.material-input-provenance.exact",
      "fact_ref": "fact.requirement.material-input-provenance",
      "method": "exact_value",
      "authority": "machine",
      "proof_surface": "runtime_behavior",
      "evidence_capabilities": [
        "semantic_fact"
      ],
      "comparison": {
        "comparator": "exact_value",
        "mode": "exact",
        "parameters": {
          "representation": "inline",
          "locator": {
            "material_ref": "long-task-real-capability-facts",
            "kind": "manifest_pointer",
            "value": "/proof_obligations/1/comparison/parameters/value"
          },
          "sha256": "a6b8e09402c2277ac9516f6820940db216072211e7912326b64ff416e54f2820",
          "value": {
            "comparator": "exact_value"
          }
        },
        "tolerance": null,
        "mask": null
      },
      "oracle_ref": "oracle.long-task-real-capability",
      "environment_ref": "environment.long-task-real-capability",
      "observer_refs": [],
      "counterfactual": {
        "disposition": "required",
        "refs": [
          "mutate-proof-and-roi"
        ],
        "basis_refs": [
          "material-input-provenance"
        ],
        "rationale": "The Outcome-owned production or governance carrier mutation must make this independently observed requirement fail while preserving target liveness."
      }
    },
    {
      "key": "proof.requirement.declared-assurance-theorem.exact",
      "fact_ref": "fact.requirement.declared-assurance-theorem",
      "method": "exact_value",
      "authority": "machine",
      "proof_surface": "runtime_behavior",
      "evidence_capabilities": [
        "semantic_fact"
      ],
      "comparison": {
        "comparator": "exact_value",
        "mode": "exact",
        "parameters": {
          "representation": "inline",
          "locator": {
            "material_ref": "long-task-real-capability-facts",
            "kind": "manifest_pointer",
            "value": "/proof_obligations/2/comparison/parameters/value"
          },
          "sha256": "a6b8e09402c2277ac9516f6820940db216072211e7912326b64ff416e54f2820",
          "value": {
            "comparator": "exact_value"
          }
        },
        "tolerance": null,
        "mask": null
      },
      "oracle_ref": "oracle.long-task-real-capability",
      "environment_ref": "environment.long-task-real-capability",
      "observer_refs": [],
      "counterfactual": {
        "disposition": "required",
        "refs": [
          "mutate-proof-and-roi"
        ],
        "basis_refs": [
          "declared-assurance-theorem"
        ],
        "rationale": "The Outcome-owned production or governance carrier mutation must make this independently observed requirement fail while preserving target liveness."
      }
    },
    {
      "key": "proof.requirement.assurance-causal-chain.exact",
      "fact_ref": "fact.requirement.assurance-causal-chain",
      "method": "exact_value",
      "authority": "machine",
      "proof_surface": "runtime_behavior",
      "evidence_capabilities": [
        "semantic_fact"
      ],
      "comparison": {
        "comparator": "exact_value",
        "mode": "exact",
        "parameters": {
          "representation": "inline",
          "locator": {
            "material_ref": "long-task-real-capability-facts",
            "kind": "manifest_pointer",
            "value": "/proof_obligations/3/comparison/parameters/value"
          },
          "sha256": "a6b8e09402c2277ac9516f6820940db216072211e7912326b64ff416e54f2820",
          "value": {
            "comparator": "exact_value"
          }
        },
        "tolerance": null,
        "mask": null
      },
      "oracle_ref": "oracle.long-task-real-capability",
      "environment_ref": "environment.long-task-real-capability",
      "observer_refs": [],
      "counterfactual": {
        "disposition": "required",
        "refs": [
          "mutate-proof-and-roi"
        ],
        "basis_refs": [
          "assurance-causal-chain"
        ],
        "rationale": "The Outcome-owned production or governance carrier mutation must make this independently observed requirement fail while preserving target liveness."
      }
    },
    {
      "key": "proof.requirement.known-selected-design-false-acceptance.exact",
      "fact_ref": "fact.requirement.known-selected-design-false-acceptance",
      "method": "exact_value",
      "authority": "machine",
      "proof_surface": "runtime_behavior",
      "evidence_capabilities": [
        "semantic_fact"
      ],
      "comparison": {
        "comparator": "exact_value",
        "mode": "exact",
        "parameters": {
          "representation": "inline",
          "locator": {
            "material_ref": "long-task-real-capability-facts",
            "kind": "manifest_pointer",
            "value": "/proof_obligations/4/comparison/parameters/value"
          },
          "sha256": "a6b8e09402c2277ac9516f6820940db216072211e7912326b64ff416e54f2820",
          "value": {
            "comparator": "exact_value"
          }
        },
        "tolerance": null,
        "mask": null
      },
      "oracle_ref": "oracle.long-task-real-capability",
      "environment_ref": "environment.long-task-real-capability",
      "observer_refs": [],
      "counterfactual": {
        "disposition": "required",
        "refs": [
          "mutate-p0-exact-recomputation"
        ],
        "basis_refs": [
          "known-selected-design-false-acceptance"
        ],
        "rationale": "The Outcome-owned production or governance carrier mutation must make this independently observed requirement fail while preserving target liveness."
      }
    },
    {
      "key": "proof.requirement.p0-positive-fixture-correction.exact",
      "fact_ref": "fact.requirement.p0-positive-fixture-correction",
      "method": "exact_value",
      "authority": "machine",
      "proof_surface": "runtime_behavior",
      "evidence_capabilities": [
        "semantic_fact"
      ],
      "comparison": {
        "comparator": "exact_value",
        "mode": "exact",
        "parameters": {
          "representation": "inline",
          "locator": {
            "material_ref": "long-task-real-capability-facts",
            "kind": "manifest_pointer",
            "value": "/proof_obligations/5/comparison/parameters/value"
          },
          "sha256": "a6b8e09402c2277ac9516f6820940db216072211e7912326b64ff416e54f2820",
          "value": {
            "comparator": "exact_value"
          }
        },
        "tolerance": null,
        "mask": null
      },
      "oracle_ref": "oracle.long-task-real-capability",
      "environment_ref": "environment.long-task-real-capability",
      "observer_refs": [],
      "counterfactual": {
        "disposition": "required",
        "refs": [
          "mutate-p0-exact-recomputation"
        ],
        "basis_refs": [
          "p0-positive-fixture-correction"
        ],
        "rationale": "The Outcome-owned production or governance carrier mutation must make this independently observed requirement fail while preserving target liveness."
      }
    },
    {
      "key": "proof.requirement.p0-v1-negative-control.exact",
      "fact_ref": "fact.requirement.p0-v1-negative-control",
      "method": "exact_value",
      "authority": "machine",
      "proof_surface": "runtime_behavior",
      "evidence_capabilities": [
        "semantic_fact"
      ],
      "comparison": {
        "comparator": "exact_value",
        "mode": "exact",
        "parameters": {
          "representation": "inline",
          "locator": {
            "material_ref": "long-task-real-capability-facts",
            "kind": "manifest_pointer",
            "value": "/proof_obligations/6/comparison/parameters/value"
          },
          "sha256": "a6b8e09402c2277ac9516f6820940db216072211e7912326b64ff416e54f2820",
          "value": {
            "comparator": "exact_value"
          }
        },
        "tolerance": null,
        "mask": null
      },
      "oracle_ref": "oracle.long-task-real-capability",
      "environment_ref": "environment.long-task-real-capability",
      "observer_refs": [],
      "counterfactual": {
        "disposition": "required",
        "refs": [
          "mutate-p0-exact-recomputation"
        ],
        "basis_refs": [
          "p0-v1-negative-control"
        ],
        "rationale": "The Outcome-owned production or governance carrier mutation must make this independently observed requirement fail while preserving target liveness."
      }
    },
    {
      "key": "proof.requirement.p0-v2-negative-control.exact",
      "fact_ref": "fact.requirement.p0-v2-negative-control",
      "method": "exact_value",
      "authority": "machine",
      "proof_surface": "runtime_behavior",
      "evidence_capabilities": [
        "semantic_fact"
      ],
      "comparison": {
        "comparator": "exact_value",
        "mode": "exact",
        "parameters": {
          "representation": "inline",
          "locator": {
            "material_ref": "long-task-real-capability-facts",
            "kind": "manifest_pointer",
            "value": "/proof_obligations/7/comparison/parameters/value"
          },
          "sha256": "a6b8e09402c2277ac9516f6820940db216072211e7912326b64ff416e54f2820",
          "value": {
            "comparator": "exact_value"
          }
        },
        "tolerance": null,
        "mask": null
      },
      "oracle_ref": "oracle.long-task-real-capability",
      "environment_ref": "environment.long-task-real-capability",
      "observer_refs": [],
      "counterfactual": {
        "disposition": "required",
        "refs": [
          "mutate-p0-exact-recomputation"
        ],
        "basis_refs": [
          "p0-v2-negative-control"
        ],
        "rationale": "The Outcome-owned production or governance carrier mutation must make this independently observed requirement fail while preserving target liveness."
      }
    },
    {
      "key": "proof.requirement.shared-exact-comparison-owner.exact",
      "fact_ref": "fact.requirement.shared-exact-comparison-owner",
      "method": "exact_value",
      "authority": "machine",
      "proof_surface": "runtime_behavior",
      "evidence_capabilities": [
        "semantic_fact"
      ],
      "comparison": {
        "comparator": "exact_value",
        "mode": "exact",
        "parameters": {
          "representation": "inline",
          "locator": {
            "material_ref": "long-task-real-capability-facts",
            "kind": "manifest_pointer",
            "value": "/proof_obligations/8/comparison/parameters/value"
          },
          "sha256": "a6b8e09402c2277ac9516f6820940db216072211e7912326b64ff416e54f2820",
          "value": {
            "comparator": "exact_value"
          }
        },
        "tolerance": null,
        "mask": null
      },
      "oracle_ref": "oracle.long-task-real-capability",
      "environment_ref": "environment.long-task-real-capability",
      "observer_refs": [],
      "counterfactual": {
        "disposition": "required",
        "refs": [
          "mutate-p0-exact-recomputation"
        ],
        "basis_refs": [
          "shared-exact-comparison-owner"
        ],
        "rationale": "The Outcome-owned production or governance carrier mutation must make this independently observed requirement fail while preserving target liveness."
      }
    },
    {
      "key": "proof.requirement.p0-owner-local-and-v3-compatible.exact",
      "fact_ref": "fact.requirement.p0-owner-local-and-v3-compatible",
      "method": "exact_value",
      "authority": "machine",
      "proof_surface": "runtime_behavior",
      "evidence_capabilities": [
        "semantic_fact"
      ],
      "comparison": {
        "comparator": "exact_value",
        "mode": "exact",
        "parameters": {
          "representation": "inline",
          "locator": {
            "material_ref": "long-task-real-capability-facts",
            "kind": "manifest_pointer",
            "value": "/proof_obligations/9/comparison/parameters/value"
          },
          "sha256": "a6b8e09402c2277ac9516f6820940db216072211e7912326b64ff416e54f2820",
          "value": {
            "comparator": "exact_value"
          }
        },
        "tolerance": null,
        "mask": null
      },
      "oracle_ref": "oracle.long-task-real-capability",
      "environment_ref": "environment.long-task-real-capability",
      "observer_refs": [],
      "counterfactual": {
        "disposition": "required",
        "refs": [
          "mutate-p0-exact-recomputation"
        ],
        "basis_refs": [
          "p0-owner-local-and-v3-compatible"
        ],
        "rationale": "The Outcome-owned production or governance carrier mutation must make this independently observed requirement fail while preserving target liveness."
      }
    },
    {
      "key": "proof.requirement.p0-verification-boundary.exact",
      "fact_ref": "fact.requirement.p0-verification-boundary",
      "method": "exact_value",
      "authority": "machine",
      "proof_surface": "runtime_behavior",
      "evidence_capabilities": [
        "semantic_fact"
      ],
      "comparison": {
        "comparator": "exact_value",
        "mode": "exact",
        "parameters": {
          "representation": "inline",
          "locator": {
            "material_ref": "long-task-real-capability-facts",
            "kind": "manifest_pointer",
            "value": "/proof_obligations/10/comparison/parameters/value"
          },
          "sha256": "a6b8e09402c2277ac9516f6820940db216072211e7912326b64ff416e54f2820",
          "value": {
            "comparator": "exact_value"
          }
        },
        "tolerance": null,
        "mask": null
      },
      "oracle_ref": "oracle.long-task-real-capability",
      "environment_ref": "environment.long-task-real-capability",
      "observer_refs": [],
      "counterfactual": {
        "disposition": "required",
        "refs": [
          "mutate-p0-exact-recomputation"
        ],
        "basis_refs": [
          "p0-verification-boundary"
        ],
        "rationale": "The Outcome-owned production or governance carrier mutation must make this independently observed requirement fail while preserving target liveness."
      }
    },
    {
      "key": "proof.requirement.purpose-validity-floor-before-relative-antidegradation.exact",
      "fact_ref": "fact.requirement.purpose-validity-floor-before-relative-antidegradation",
      "method": "exact_value",
      "authority": "machine",
      "proof_surface": "runtime_behavior",
      "evidence_capabilities": [
        "semantic_fact"
      ],
      "comparison": {
        "comparator": "exact_value",
        "mode": "exact",
        "parameters": {
          "representation": "inline",
          "locator": {
            "material_ref": "long-task-real-capability-facts",
            "kind": "manifest_pointer",
            "value": "/proof_obligations/11/comparison/parameters/value"
          },
          "sha256": "a6b8e09402c2277ac9516f6820940db216072211e7912326b64ff416e54f2820",
          "value": {
            "comparator": "exact_value"
          }
        },
        "tolerance": null,
        "mask": null
      },
      "oracle_ref": "oracle.long-task-real-capability",
      "environment_ref": "environment.long-task-real-capability",
      "observer_refs": [],
      "counterfactual": {
        "disposition": "required",
        "refs": [
          "mutate-assurance-governance"
        ],
        "basis_refs": [
          "purpose-validity-floor-before-relative-antidegradation"
        ],
        "rationale": "The Outcome-owned production or governance carrier mutation must make this independently observed requirement fail while preserving target liveness."
      }
    },
    {
      "key": "proof.requirement.invalid-baseline-and-claim-downgrade.exact",
      "fact_ref": "fact.requirement.invalid-baseline-and-claim-downgrade",
      "method": "exact_value",
      "authority": "machine",
      "proof_surface": "runtime_behavior",
      "evidence_capabilities": [
        "semantic_fact"
      ],
      "comparison": {
        "comparator": "exact_value",
        "mode": "exact",
        "parameters": {
          "representation": "inline",
          "locator": {
            "material_ref": "long-task-real-capability-facts",
            "kind": "manifest_pointer",
            "value": "/proof_obligations/12/comparison/parameters/value"
          },
          "sha256": "a6b8e09402c2277ac9516f6820940db216072211e7912326b64ff416e54f2820",
          "value": {
            "comparator": "exact_value"
          }
        },
        "tolerance": null,
        "mask": null
      },
      "oracle_ref": "oracle.long-task-real-capability",
      "environment_ref": "environment.long-task-real-capability",
      "observer_refs": [],
      "counterfactual": {
        "disposition": "required",
        "refs": [
          "mutate-assurance-governance"
        ],
        "basis_refs": [
          "invalid-baseline-and-claim-downgrade"
        ],
        "rationale": "The Outcome-owned production or governance carrier mutation must make this independently observed requirement fail while preserving target liveness."
      }
    },
    {
      "key": "proof.requirement.coverage-defined-by-rejected-attack-surface.exact",
      "fact_ref": "fact.requirement.coverage-defined-by-rejected-attack-surface",
      "method": "exact_value",
      "authority": "machine",
      "proof_surface": "runtime_behavior",
      "evidence_capabilities": [
        "semantic_fact"
      ],
      "comparison": {
        "comparator": "exact_value",
        "mode": "exact",
        "parameters": {
          "representation": "inline",
          "locator": {
            "material_ref": "long-task-real-capability-facts",
            "kind": "manifest_pointer",
            "value": "/proof_obligations/13/comparison/parameters/value"
          },
          "sha256": "a6b8e09402c2277ac9516f6820940db216072211e7912326b64ff416e54f2820",
          "value": {
            "comparator": "exact_value"
          }
        },
        "tolerance": null,
        "mask": null
      },
      "oracle_ref": "oracle.long-task-real-capability",
      "environment_ref": "environment.long-task-real-capability",
      "observer_refs": [],
      "counterfactual": {
        "disposition": "required",
        "refs": [
          "mutate-assurance-governance"
        ],
        "basis_refs": [
          "coverage-defined-by-rejected-attack-surface"
        ],
        "rationale": "The Outcome-owned production or governance carrier mutation must make this independently observed requirement fail while preserving target liveness."
      }
    },
    {
      "key": "proof.requirement.critical-sentinel-positive-negative-controls.exact",
      "fact_ref": "fact.requirement.critical-sentinel-positive-negative-controls",
      "method": "exact_value",
      "authority": "machine",
      "proof_surface": "runtime_behavior",
      "evidence_capabilities": [
        "semantic_fact"
      ],
      "comparison": {
        "comparator": "exact_value",
        "mode": "exact",
        "parameters": {
          "representation": "inline",
          "locator": {
            "material_ref": "long-task-real-capability-facts",
            "kind": "manifest_pointer",
            "value": "/proof_obligations/14/comparison/parameters/value"
          },
          "sha256": "a6b8e09402c2277ac9516f6820940db216072211e7912326b64ff416e54f2820",
          "value": {
            "comparator": "exact_value"
          }
        },
        "tolerance": null,
        "mask": null
      },
      "oracle_ref": "oracle.long-task-real-capability",
      "environment_ref": "environment.long-task-real-capability",
      "observer_refs": [],
      "counterfactual": {
        "disposition": "required",
        "refs": [
          "mutate-assurance-governance"
        ],
        "basis_refs": [
          "critical-sentinel-positive-negative-controls"
        ],
        "rationale": "The Outcome-owned production or governance carrier mutation must make this independently observed requirement fail while preserving target liveness."
      }
    },
    {
      "key": "proof.requirement.incident-counterexample-first-rule.exact",
      "fact_ref": "fact.requirement.incident-counterexample-first-rule",
      "method": "exact_value",
      "authority": "machine",
      "proof_surface": "runtime_behavior",
      "evidence_capabilities": [
        "semantic_fact"
      ],
      "comparison": {
        "comparator": "exact_value",
        "mode": "exact",
        "parameters": {
          "representation": "inline",
          "locator": {
            "material_ref": "long-task-real-capability-facts",
            "kind": "manifest_pointer",
            "value": "/proof_obligations/15/comparison/parameters/value"
          },
          "sha256": "a6b8e09402c2277ac9516f6820940db216072211e7912326b64ff416e54f2820",
          "value": {
            "comparator": "exact_value"
          }
        },
        "tolerance": null,
        "mask": null
      },
      "oracle_ref": "oracle.long-task-real-capability",
      "environment_ref": "environment.long-task-real-capability",
      "observer_refs": [],
      "counterfactual": {
        "disposition": "required",
        "refs": [
          "mutate-assurance-governance"
        ],
        "basis_refs": [
          "incident-counterexample-first-rule"
        ],
        "rationale": "The Outcome-owned production or governance carrier mutation must make this independently observed requirement fail while preserving target liveness."
      }
    },
    {
      "key": "proof.requirement.sentinel-rationale-evidence-bounded.exact",
      "fact_ref": "fact.requirement.sentinel-rationale-evidence-bounded",
      "method": "exact_value",
      "authority": "machine",
      "proof_surface": "runtime_behavior",
      "evidence_capabilities": [
        "semantic_fact"
      ],
      "comparison": {
        "comparator": "exact_value",
        "mode": "exact",
        "parameters": {
          "representation": "inline",
          "locator": {
            "material_ref": "long-task-real-capability-facts",
            "kind": "manifest_pointer",
            "value": "/proof_obligations/16/comparison/parameters/value"
          },
          "sha256": "a6b8e09402c2277ac9516f6820940db216072211e7912326b64ff416e54f2820",
          "value": {
            "comparator": "exact_value"
          }
        },
        "tolerance": null,
        "mask": null
      },
      "oracle_ref": "oracle.long-task-real-capability",
      "environment_ref": "environment.long-task-real-capability",
      "observer_refs": [],
      "counterfactual": {
        "disposition": "required",
        "refs": [
          "mutate-assurance-governance"
        ],
        "basis_refs": [
          "sentinel-rationale-evidence-bounded"
        ],
        "rationale": "The Outcome-owned production or governance carrier mutation must make this independently observed requirement fail while preserving target liveness."
      }
    },
    {
      "key": "proof.requirement.capability-claim-levels.exact",
      "fact_ref": "fact.requirement.capability-claim-levels",
      "method": "exact_value",
      "authority": "machine",
      "proof_surface": "runtime_behavior",
      "evidence_capabilities": [
        "semantic_fact"
      ],
      "comparison": {
        "comparator": "exact_value",
        "mode": "exact",
        "parameters": {
          "representation": "inline",
          "locator": {
            "material_ref": "long-task-real-capability-facts",
            "kind": "manifest_pointer",
            "value": "/proof_obligations/17/comparison/parameters/value"
          },
          "sha256": "a6b8e09402c2277ac9516f6820940db216072211e7912326b64ff416e54f2820",
          "value": {
            "comparator": "exact_value"
          }
        },
        "tolerance": null,
        "mask": null
      },
      "oracle_ref": "oracle.long-task-real-capability",
      "environment_ref": "environment.long-task-real-capability",
      "observer_refs": [],
      "counterfactual": {
        "disposition": "required",
        "refs": [
          "mutate-assurance-governance"
        ],
        "basis_refs": [
          "capability-claim-levels"
        ],
        "rationale": "The Outcome-owned production or governance carrier mutation must make this independently observed requirement fail while preserving target liveness."
      }
    },
    {
      "key": "proof.requirement.route-b-project-owner-decision.exact",
      "fact_ref": "fact.requirement.route-b-project-owner-decision",
      "method": "exact_value",
      "authority": "machine",
      "proof_surface": "runtime_behavior",
      "evidence_capabilities": [
        "semantic_fact"
      ],
      "comparison": {
        "comparator": "exact_value",
        "mode": "exact",
        "parameters": {
          "representation": "inline",
          "locator": {
            "material_ref": "long-task-real-capability-facts",
            "kind": "manifest_pointer",
            "value": "/proof_obligations/18/comparison/parameters/value"
          },
          "sha256": "a6b8e09402c2277ac9516f6820940db216072211e7912326b64ff416e54f2820",
          "value": {
            "comparator": "exact_value"
          }
        },
        "tolerance": null,
        "mask": null
      },
      "oracle_ref": "oracle.long-task-real-capability",
      "environment_ref": "environment.long-task-real-capability",
      "observer_refs": [],
      "counterfactual": {
        "disposition": "required",
        "refs": [
          "mutate-observer-tcb-closure"
        ],
        "basis_refs": [
          "route-b-project-owner-decision"
        ],
        "rationale": "The Outcome-owned production or governance carrier mutation must make this independently observed requirement fail while preserving target liveness."
      }
    },
    {
      "key": "proof.requirement.observation-channel-authority.exact",
      "fact_ref": "fact.requirement.observation-channel-authority",
      "method": "exact_value",
      "authority": "machine",
      "proof_surface": "runtime_behavior",
      "evidence_capabilities": [
        "semantic_fact"
      ],
      "comparison": {
        "comparator": "exact_value",
        "mode": "exact",
        "parameters": {
          "representation": "inline",
          "locator": {
            "material_ref": "long-task-real-capability-facts",
            "kind": "manifest_pointer",
            "value": "/proof_obligations/19/comparison/parameters/value"
          },
          "sha256": "a6b8e09402c2277ac9516f6820940db216072211e7912326b64ff416e54f2820",
          "value": {
            "comparator": "exact_value"
          }
        },
        "tolerance": null,
        "mask": null
      },
      "oracle_ref": "oracle.long-task-real-capability",
      "environment_ref": "environment.long-task-real-capability",
      "observer_refs": [],
      "counterfactual": {
        "disposition": "required",
        "refs": [
          "mutate-observer-tcb-closure"
        ],
        "basis_refs": [
          "observation-channel-authority"
        ],
        "rationale": "The Outcome-owned production or governance carrier mutation must make this independently observed requirement fail while preserving target liveness."
      }
    },
    {
      "key": "proof.requirement.expected-actual-comparison-verdict-ownership.exact",
      "fact_ref": "fact.requirement.expected-actual-comparison-verdict-ownership",
      "method": "exact_value",
      "authority": "machine",
      "proof_surface": "runtime_behavior",
      "evidence_capabilities": [
        "semantic_fact"
      ],
      "comparison": {
        "comparator": "exact_value",
        "mode": "exact",
        "parameters": {
          "representation": "inline",
          "locator": {
            "material_ref": "long-task-real-capability-facts",
            "kind": "manifest_pointer",
            "value": "/proof_obligations/20/comparison/parameters/value"
          },
          "sha256": "a6b8e09402c2277ac9516f6820940db216072211e7912326b64ff416e54f2820",
          "value": {
            "comparator": "exact_value"
          }
        },
        "tolerance": null,
        "mask": null
      },
      "oracle_ref": "oracle.long-task-real-capability",
      "environment_ref": "environment.long-task-real-capability",
      "observer_refs": [],
      "counterfactual": {
        "disposition": "required",
        "refs": [
          "mutate-observer-tcb-closure"
        ],
        "basis_refs": [
          "expected-actual-comparison-verdict-ownership"
        ],
        "rationale": "The Outcome-owned production or governance carrier mutation must make this independently observed requirement fail while preserving target liveness."
      }
    },
    {
      "key": "proof.requirement.bounded-admitted-artifact-contract.exact",
      "fact_ref": "fact.requirement.bounded-admitted-artifact-contract",
      "method": "exact_value",
      "authority": "machine",
      "proof_surface": "runtime_behavior",
      "evidence_capabilities": [
        "semantic_fact"
      ],
      "comparison": {
        "comparator": "exact_value",
        "mode": "exact",
        "parameters": {
          "representation": "inline",
          "locator": {
            "material_ref": "long-task-real-capability-facts",
            "kind": "manifest_pointer",
            "value": "/proof_obligations/21/comparison/parameters/value"
          },
          "sha256": "a6b8e09402c2277ac9516f6820940db216072211e7912326b64ff416e54f2820",
          "value": {
            "comparator": "exact_value"
          }
        },
        "tolerance": null,
        "mask": null
      },
      "oracle_ref": "oracle.long-task-real-capability",
      "environment_ref": "environment.long-task-real-capability",
      "observer_refs": [],
      "counterfactual": {
        "disposition": "required",
        "refs": [
          "mutate-observer-tcb-closure"
        ],
        "basis_refs": [
          "bounded-admitted-artifact-contract"
        ],
        "rationale": "The Outcome-owned production or governance carrier mutation must make this independently observed requirement fail while preserving target liveness."
      }
    },
    {
      "key": "proof.requirement.actual-artifact-reextraction.exact",
      "fact_ref": "fact.requirement.actual-artifact-reextraction",
      "method": "exact_value",
      "authority": "machine",
      "proof_surface": "runtime_behavior",
      "evidence_capabilities": [
        "semantic_fact"
      ],
      "comparison": {
        "comparator": "exact_value",
        "mode": "exact",
        "parameters": {
          "representation": "inline",
          "locator": {
            "material_ref": "long-task-real-capability-facts",
            "kind": "manifest_pointer",
            "value": "/proof_obligations/22/comparison/parameters/value"
          },
          "sha256": "a6b8e09402c2277ac9516f6820940db216072211e7912326b64ff416e54f2820",
          "value": {
            "comparator": "exact_value"
          }
        },
        "tolerance": null,
        "mask": null
      },
      "oracle_ref": "oracle.long-task-real-capability",
      "environment_ref": "environment.long-task-real-capability",
      "observer_refs": [],
      "counterfactual": {
        "disposition": "required",
        "refs": [
          "mutate-observer-tcb-closure"
        ],
        "basis_refs": [
          "actual-artifact-reextraction"
        ],
        "rationale": "The Outcome-owned production or governance carrier mutation must make this independently observed requirement fail while preserving target liveness."
      }
    },
    {
      "key": "proof.requirement.challenge-is-freshness-only.exact",
      "fact_ref": "fact.requirement.challenge-is-freshness-only",
      "method": "exact_value",
      "authority": "machine",
      "proof_surface": "runtime_behavior",
      "evidence_capabilities": [
        "semantic_fact"
      ],
      "comparison": {
        "comparator": "exact_value",
        "mode": "exact",
        "parameters": {
          "representation": "inline",
          "locator": {
            "material_ref": "long-task-real-capability-facts",
            "kind": "manifest_pointer",
            "value": "/proof_obligations/23/comparison/parameters/value"
          },
          "sha256": "a6b8e09402c2277ac9516f6820940db216072211e7912326b64ff416e54f2820",
          "value": {
            "comparator": "exact_value"
          }
        },
        "tolerance": null,
        "mask": null
      },
      "oracle_ref": "oracle.long-task-real-capability",
      "environment_ref": "environment.long-task-real-capability",
      "observer_refs": [],
      "counterfactual": {
        "disposition": "required",
        "refs": [
          "mutate-observer-tcb-closure"
        ],
        "basis_refs": [
          "challenge-is-freshness-only"
        ],
        "rationale": "The Outcome-owned production or governance carrier mutation must make this independently observed requirement fail while preserving target liveness."
      }
    },
    {
      "key": "proof.requirement.generated-carrier-semantic-role.exact",
      "fact_ref": "fact.requirement.generated-carrier-semantic-role",
      "method": "exact_value",
      "authority": "machine",
      "proof_surface": "runtime_behavior",
      "evidence_capabilities": [
        "semantic_fact"
      ],
      "comparison": {
        "comparator": "exact_value",
        "mode": "exact",
        "parameters": {
          "representation": "inline",
          "locator": {
            "material_ref": "long-task-real-capability-facts",
            "kind": "manifest_pointer",
            "value": "/proof_obligations/24/comparison/parameters/value"
          },
          "sha256": "a6b8e09402c2277ac9516f6820940db216072211e7912326b64ff416e54f2820",
          "value": {
            "comparator": "exact_value"
          }
        },
        "tolerance": null,
        "mask": null
      },
      "oracle_ref": "oracle.long-task-real-capability",
      "environment_ref": "environment.long-task-real-capability",
      "observer_refs": [],
      "counterfactual": {
        "disposition": "required",
        "refs": [
          "mutate-observer-tcb-closure"
        ],
        "basis_refs": [
          "generated-carrier-semantic-role"
        ],
        "rationale": "The Outcome-owned production or governance carrier mutation must make this independently observed requirement fail while preserving target liveness."
      }
    },
    {
      "key": "proof.requirement.expected-to-actual-self-proof-rejection.exact",
      "fact_ref": "fact.requirement.expected-to-actual-self-proof-rejection",
      "method": "exact_value",
      "authority": "machine",
      "proof_surface": "runtime_behavior",
      "evidence_capabilities": [
        "semantic_fact"
      ],
      "comparison": {
        "comparator": "exact_value",
        "mode": "exact",
        "parameters": {
          "representation": "inline",
          "locator": {
            "material_ref": "long-task-real-capability-facts",
            "kind": "manifest_pointer",
            "value": "/proof_obligations/25/comparison/parameters/value"
          },
          "sha256": "a6b8e09402c2277ac9516f6820940db216072211e7912326b64ff416e54f2820",
          "value": {
            "comparator": "exact_value"
          }
        },
        "tolerance": null,
        "mask": null
      },
      "oracle_ref": "oracle.long-task-real-capability",
      "environment_ref": "environment.long-task-real-capability",
      "observer_refs": [],
      "counterfactual": {
        "disposition": "required",
        "refs": [
          "mutate-observer-tcb-closure"
        ],
        "basis_refs": [
          "expected-to-actual-self-proof-rejection"
        ],
        "rationale": "The Outcome-owned production or governance carrier mutation must make this independently observed requirement fail while preserving target liveness."
      }
    },
    {
      "key": "proof.requirement.production-reachability.exact",
      "fact_ref": "fact.requirement.production-reachability",
      "method": "exact_value",
      "authority": "machine",
      "proof_surface": "runtime_behavior",
      "evidence_capabilities": [
        "semantic_fact"
      ],
      "comparison": {
        "comparator": "exact_value",
        "mode": "exact",
        "parameters": {
          "representation": "inline",
          "locator": {
            "material_ref": "long-task-real-capability-facts",
            "kind": "manifest_pointer",
            "value": "/proof_obligations/26/comparison/parameters/value"
          },
          "sha256": "a6b8e09402c2277ac9516f6820940db216072211e7912326b64ff416e54f2820",
          "value": {
            "comparator": "exact_value"
          }
        },
        "tolerance": null,
        "mask": null
      },
      "oracle_ref": "oracle.long-task-real-capability",
      "environment_ref": "environment.long-task-real-capability",
      "observer_refs": [],
      "counterfactual": {
        "disposition": "required",
        "refs": [
          "mutate-observer-tcb-closure"
        ],
        "basis_refs": [
          "production-reachability"
        ],
        "rationale": "The Outcome-owned production or governance carrier mutation must make this independently observed requirement fail while preserving target liveness."
      }
    },
    {
      "key": "proof.requirement.counterfactual-actual-change-and-impact-set.exact",
      "fact_ref": "fact.requirement.counterfactual-actual-change-and-impact-set",
      "method": "exact_value",
      "authority": "machine",
      "proof_surface": "runtime_behavior",
      "evidence_capabilities": [
        "semantic_fact"
      ],
      "comparison": {
        "comparator": "exact_value",
        "mode": "exact",
        "parameters": {
          "representation": "inline",
          "locator": {
            "material_ref": "long-task-real-capability-facts",
            "kind": "manifest_pointer",
            "value": "/proof_obligations/27/comparison/parameters/value"
          },
          "sha256": "a6b8e09402c2277ac9516f6820940db216072211e7912326b64ff416e54f2820",
          "value": {
            "comparator": "exact_value"
          }
        },
        "tolerance": null,
        "mask": null
      },
      "oracle_ref": "oracle.long-task-real-capability",
      "environment_ref": "environment.long-task-real-capability",
      "observer_refs": [],
      "counterfactual": {
        "disposition": "required",
        "refs": [
          "mutate-observer-tcb-closure"
        ],
        "basis_refs": [
          "counterfactual-actual-change-and-impact-set"
        ],
        "rationale": "The Outcome-owned production or governance carrier mutation must make this independently observed requirement fail while preserving target liveness."
      }
    },
    {
      "key": "proof.requirement.selected-design-existing-owner-preservation.exact",
      "fact_ref": "fact.requirement.selected-design-existing-owner-preservation",
      "method": "exact_value",
      "authority": "machine",
      "proof_surface": "runtime_behavior",
      "evidence_capabilities": [
        "semantic_fact"
      ],
      "comparison": {
        "comparator": "exact_value",
        "mode": "exact",
        "parameters": {
          "representation": "inline",
          "locator": {
            "material_ref": "long-task-real-capability-facts",
            "kind": "manifest_pointer",
            "value": "/proof_obligations/28/comparison/parameters/value"
          },
          "sha256": "a6b8e09402c2277ac9516f6820940db216072211e7912326b64ff416e54f2820",
          "value": {
            "comparator": "exact_value"
          }
        },
        "tolerance": null,
        "mask": null
      },
      "oracle_ref": "oracle.long-task-real-capability",
      "environment_ref": "environment.long-task-real-capability",
      "observer_refs": [],
      "counterfactual": {
        "disposition": "required",
        "refs": [
          "mutate-p0-exact-recomputation"
        ],
        "basis_refs": [
          "selected-design-existing-owner-preservation"
        ],
        "rationale": "The Outcome-owned production or governance carrier mutation must make this independently observed requirement fail while preserving target liveness."
      }
    },
    {
      "key": "proof.requirement.no-universal-ui-observer.exact",
      "fact_ref": "fact.requirement.no-universal-ui-observer",
      "method": "exact_value",
      "authority": "machine",
      "proof_surface": "runtime_behavior",
      "evidence_capabilities": [
        "semantic_fact"
      ],
      "comparison": {
        "comparator": "exact_value",
        "mode": "exact",
        "parameters": {
          "representation": "inline",
          "locator": {
            "material_ref": "long-task-real-capability-facts",
            "kind": "manifest_pointer",
            "value": "/proof_obligations/29/comparison/parameters/value"
          },
          "sha256": "a6b8e09402c2277ac9516f6820940db216072211e7912326b64ff416e54f2820",
          "value": {
            "comparator": "exact_value"
          }
        },
        "tolerance": null,
        "mask": null
      },
      "oracle_ref": "oracle.long-task-real-capability",
      "environment_ref": "environment.long-task-real-capability",
      "observer_refs": [],
      "counterfactual": {
        "disposition": "required",
        "refs": [
          "mutate-observer-tcb-closure"
        ],
        "basis_refs": [
          "no-universal-ui-observer"
        ],
        "rationale": "The Outcome-owned production or governance carrier mutation must make this independently observed requirement fail while preserving target liveness."
      }
    },
    {
      "key": "proof.requirement.v3-v4-and-migration-rule.exact",
      "fact_ref": "fact.requirement.v3-v4-and-migration-rule",
      "method": "exact_value",
      "authority": "machine",
      "proof_surface": "runtime_behavior",
      "evidence_capabilities": [
        "semantic_fact"
      ],
      "comparison": {
        "comparator": "exact_value",
        "mode": "exact",
        "parameters": {
          "representation": "inline",
          "locator": {
            "material_ref": "long-task-real-capability-facts",
            "kind": "manifest_pointer",
            "value": "/proof_obligations/30/comparison/parameters/value"
          },
          "sha256": "a6b8e09402c2277ac9516f6820940db216072211e7912326b64ff416e54f2820",
          "value": {
            "comparator": "exact_value"
          }
        },
        "tolerance": null,
        "mask": null
      },
      "oracle_ref": "oracle.long-task-real-capability",
      "environment_ref": "environment.long-task-real-capability",
      "observer_refs": [],
      "counterfactual": {
        "disposition": "required",
        "refs": [
          "mutate-observer-tcb-closure"
        ],
        "basis_refs": [
          "v3-v4-and-migration-rule"
        ],
        "rationale": "The Outcome-owned production or governance carrier mutation must make this independently observed requirement fail while preserving target liveness."
      }
    },
    {
      "key": "proof.requirement.attack-suite-ground-truth.exact",
      "fact_ref": "fact.requirement.attack-suite-ground-truth",
      "method": "exact_value",
      "authority": "machine",
      "proof_surface": "runtime_behavior",
      "evidence_capabilities": [
        "semantic_fact"
      ],
      "comparison": {
        "comparator": "exact_value",
        "mode": "exact",
        "parameters": {
          "representation": "inline",
          "locator": {
            "material_ref": "long-task-real-capability-facts",
            "kind": "manifest_pointer",
            "value": "/proof_obligations/31/comparison/parameters/value"
          },
          "sha256": "a6b8e09402c2277ac9516f6820940db216072211e7912326b64ff416e54f2820",
          "value": {
            "comparator": "exact_value"
          }
        },
        "tolerance": null,
        "mask": null
      },
      "oracle_ref": "oracle.long-task-real-capability",
      "environment_ref": "environment.long-task-real-capability",
      "observer_refs": [],
      "counterfactual": {
        "disposition": "required",
        "refs": [
          "mutate-proof-and-roi"
        ],
        "basis_refs": [
          "attack-suite-ground-truth"
        ],
        "rationale": "The Outcome-owned production or governance carrier mutation must make this independently observed requirement fail while preserving target liveness."
      }
    },
    {
      "key": "proof.requirement.valid-control-suite.exact",
      "fact_ref": "fact.requirement.valid-control-suite",
      "method": "exact_value",
      "authority": "machine",
      "proof_surface": "runtime_behavior",
      "evidence_capabilities": [
        "semantic_fact"
      ],
      "comparison": {
        "comparator": "exact_value",
        "mode": "exact",
        "parameters": {
          "representation": "inline",
          "locator": {
            "material_ref": "long-task-real-capability-facts",
            "kind": "manifest_pointer",
            "value": "/proof_obligations/32/comparison/parameters/value"
          },
          "sha256": "a6b8e09402c2277ac9516f6820940db216072211e7912326b64ff416e54f2820",
          "value": {
            "comparator": "exact_value"
          }
        },
        "tolerance": null,
        "mask": null
      },
      "oracle_ref": "oracle.long-task-real-capability",
      "environment_ref": "environment.long-task-real-capability",
      "observer_refs": [],
      "counterfactual": {
        "disposition": "required",
        "refs": [
          "mutate-proof-and-roi"
        ],
        "basis_refs": [
          "valid-control-suite"
        ],
        "rationale": "The Outcome-owned production or governance carrier mutation must make this independently observed requirement fail while preserving target liveness."
      }
    },
    {
      "key": "proof.requirement.black-box-final-gate-lifecycle.exact",
      "fact_ref": "fact.requirement.black-box-final-gate-lifecycle",
      "method": "exact_value",
      "authority": "machine",
      "proof_surface": "runtime_behavior",
      "evidence_capabilities": [
        "semantic_fact"
      ],
      "comparison": {
        "comparator": "exact_value",
        "mode": "exact",
        "parameters": {
          "representation": "inline",
          "locator": {
            "material_ref": "long-task-real-capability-facts",
            "kind": "manifest_pointer",
            "value": "/proof_obligations/33/comparison/parameters/value"
          },
          "sha256": "a6b8e09402c2277ac9516f6820940db216072211e7912326b64ff416e54f2820",
          "value": {
            "comparator": "exact_value"
          }
        },
        "tolerance": null,
        "mask": null
      },
      "oracle_ref": "oracle.long-task-real-capability",
      "environment_ref": "environment.long-task-real-capability",
      "observer_refs": [],
      "counterfactual": {
        "disposition": "required",
        "refs": [
          "mutate-proof-and-roi"
        ],
        "basis_refs": [
          "black-box-final-gate-lifecycle"
        ],
        "rationale": "The Outcome-owned production or governance carrier mutation must make this independently observed requirement fail while preserving target liveness."
      }
    },
    {
      "key": "proof.requirement.starward-sanitized-replay.exact",
      "fact_ref": "fact.requirement.starward-sanitized-replay",
      "method": "exact_value",
      "authority": "machine",
      "proof_surface": "runtime_behavior",
      "evidence_capabilities": [
        "semantic_fact"
      ],
      "comparison": {
        "comparator": "exact_value",
        "mode": "exact",
        "parameters": {
          "representation": "inline",
          "locator": {
            "material_ref": "long-task-real-capability-facts",
            "kind": "manifest_pointer",
            "value": "/proof_obligations/34/comparison/parameters/value"
          },
          "sha256": "a6b8e09402c2277ac9516f6820940db216072211e7912326b64ff416e54f2820",
          "value": {
            "comparator": "exact_value"
          }
        },
        "tolerance": null,
        "mask": null
      },
      "oracle_ref": "oracle.long-task-real-capability",
      "environment_ref": "environment.long-task-real-capability",
      "observer_refs": [],
      "counterfactual": {
        "disposition": "required",
        "refs": [
          "mutate-proof-and-roi"
        ],
        "basis_refs": [
          "starward-sanitized-replay"
        ],
        "rationale": "The Outcome-owned production or governance carrier mutation must make this independently observed requirement fail while preserving target liveness."
      }
    },
    {
      "key": "proof.requirement.fresh-agent-benchmark-boundary.exact",
      "fact_ref": "fact.requirement.fresh-agent-benchmark-boundary",
      "method": "exact_value",
      "authority": "machine",
      "proof_surface": "runtime_behavior",
      "evidence_capabilities": [
        "semantic_fact"
      ],
      "comparison": {
        "comparator": "exact_value",
        "mode": "exact",
        "parameters": {
          "representation": "inline",
          "locator": {
            "material_ref": "long-task-real-capability-facts",
            "kind": "manifest_pointer",
            "value": "/proof_obligations/35/comparison/parameters/value"
          },
          "sha256": "a6b8e09402c2277ac9516f6820940db216072211e7912326b64ff416e54f2820",
          "value": {
            "comparator": "exact_value"
          }
        },
        "tolerance": null,
        "mask": null
      },
      "oracle_ref": "oracle.long-task-real-capability",
      "environment_ref": "environment.long-task-real-capability",
      "observer_refs": [],
      "counterfactual": {
        "disposition": "required",
        "refs": [
          "mutate-proof-and-roi"
        ],
        "basis_refs": [
          "fresh-agent-benchmark-boundary"
        ],
        "rationale": "The Outcome-owned production or governance carrier mutation must make this independently observed requirement fail while preserving target liveness."
      }
    },
    {
      "key": "proof.requirement.roi-admission-order.exact",
      "fact_ref": "fact.requirement.roi-admission-order",
      "method": "exact_value",
      "authority": "machine",
      "proof_surface": "runtime_behavior",
      "evidence_capabilities": [
        "semantic_fact"
      ],
      "comparison": {
        "comparator": "exact_value",
        "mode": "exact",
        "parameters": {
          "representation": "inline",
          "locator": {
            "material_ref": "long-task-real-capability-facts",
            "kind": "manifest_pointer",
            "value": "/proof_obligations/36/comparison/parameters/value"
          },
          "sha256": "a6b8e09402c2277ac9516f6820940db216072211e7912326b64ff416e54f2820",
          "value": {
            "comparator": "exact_value"
          }
        },
        "tolerance": null,
        "mask": null
      },
      "oracle_ref": "oracle.long-task-real-capability",
      "environment_ref": "environment.long-task-real-capability",
      "observer_refs": [],
      "counterfactual": {
        "disposition": "required",
        "refs": [
          "mutate-proof-and-roi"
        ],
        "basis_refs": [
          "roi-admission-order"
        ],
        "rationale": "The Outcome-owned production or governance carrier mutation must make this independently observed requirement fail while preserving target liveness."
      }
    },
    {
      "key": "proof.requirement.early-real-entry-feedback.exact",
      "fact_ref": "fact.requirement.early-real-entry-feedback",
      "method": "exact_value",
      "authority": "machine",
      "proof_surface": "runtime_behavior",
      "evidence_capabilities": [
        "semantic_fact"
      ],
      "comparison": {
        "comparator": "exact_value",
        "mode": "exact",
        "parameters": {
          "representation": "inline",
          "locator": {
            "material_ref": "long-task-real-capability-facts",
            "kind": "manifest_pointer",
            "value": "/proof_obligations/37/comparison/parameters/value"
          },
          "sha256": "a6b8e09402c2277ac9516f6820940db216072211e7912326b64ff416e54f2820",
          "value": {
            "comparator": "exact_value"
          }
        },
        "tolerance": null,
        "mask": null
      },
      "oracle_ref": "oracle.long-task-real-capability",
      "environment_ref": "environment.long-task-real-capability",
      "observer_refs": [],
      "counterfactual": {
        "disposition": "required",
        "refs": [
          "mutate-proof-and-roi"
        ],
        "basis_refs": [
          "early-real-entry-feedback"
        ],
        "rationale": "The Outcome-owned production or governance carrier mutation must make this independently observed requirement fail while preserving target liveness."
      }
    },
    {
      "key": "proof.requirement.no-new-lifecycle-authority-registry.exact",
      "fact_ref": "fact.requirement.no-new-lifecycle-authority-registry",
      "method": "exact_value",
      "authority": "machine",
      "proof_surface": "runtime_behavior",
      "evidence_capabilities": [
        "semantic_fact"
      ],
      "comparison": {
        "comparator": "exact_value",
        "mode": "exact",
        "parameters": {
          "representation": "inline",
          "locator": {
            "material_ref": "long-task-real-capability-facts",
            "kind": "manifest_pointer",
            "value": "/proof_obligations/38/comparison/parameters/value"
          },
          "sha256": "a6b8e09402c2277ac9516f6820940db216072211e7912326b64ff416e54f2820",
          "value": {
            "comparator": "exact_value"
          }
        },
        "tolerance": null,
        "mask": null
      },
      "oracle_ref": "oracle.long-task-real-capability",
      "environment_ref": "environment.long-task-real-capability",
      "observer_refs": [],
      "counterfactual": {
        "disposition": "required",
        "refs": [
          "mutate-assurance-governance"
        ],
        "basis_refs": [
          "no-new-lifecycle-authority-registry"
        ],
        "rationale": "The Outcome-owned production or governance carrier mutation must make this independently observed requirement fail while preserving target liveness."
      }
    },
    {
      "key": "proof.requirement.owner-dependency-lifecycle-boundary.exact",
      "fact_ref": "fact.requirement.owner-dependency-lifecycle-boundary",
      "method": "exact_value",
      "authority": "machine",
      "proof_surface": "runtime_behavior",
      "evidence_capabilities": [
        "semantic_fact"
      ],
      "comparison": {
        "comparator": "exact_value",
        "mode": "exact",
        "parameters": {
          "representation": "inline",
          "locator": {
            "material_ref": "long-task-real-capability-facts",
            "kind": "manifest_pointer",
            "value": "/proof_obligations/39/comparison/parameters/value"
          },
          "sha256": "a6b8e09402c2277ac9516f6820940db216072211e7912326b64ff416e54f2820",
          "value": {
            "comparator": "exact_value"
          }
        },
        "tolerance": null,
        "mask": null
      },
      "oracle_ref": "oracle.long-task-real-capability",
      "environment_ref": "environment.long-task-real-capability",
      "observer_refs": [],
      "counterfactual": {
        "disposition": "required",
        "refs": [
          "mutate-observer-tcb-closure"
        ],
        "basis_refs": [
          "owner-dependency-lifecycle-boundary"
        ],
        "rationale": "The Outcome-owned production or governance carrier mutation must make this independently observed requirement fail while preserving target liveness."
      }
    },
    {
      "key": "proof.requirement.build-reuse-buy-allowed-set.exact",
      "fact_ref": "fact.requirement.build-reuse-buy-allowed-set",
      "method": "exact_value",
      "authority": "machine",
      "proof_surface": "runtime_behavior",
      "evidence_capabilities": [
        "semantic_fact"
      ],
      "comparison": {
        "comparator": "exact_value",
        "mode": "exact",
        "parameters": {
          "representation": "inline",
          "locator": {
            "material_ref": "long-task-real-capability-facts",
            "kind": "manifest_pointer",
            "value": "/proof_obligations/40/comparison/parameters/value"
          },
          "sha256": "a6b8e09402c2277ac9516f6820940db216072211e7912326b64ff416e54f2820",
          "value": {
            "comparator": "exact_value"
          }
        },
        "tolerance": null,
        "mask": null
      },
      "oracle_ref": "oracle.long-task-real-capability",
      "environment_ref": "environment.long-task-real-capability",
      "observer_refs": [],
      "counterfactual": {
        "disposition": "required",
        "refs": [
          "mutate-observer-tcb-closure"
        ],
        "basis_refs": [
          "build-reuse-buy-allowed-set"
        ],
        "rationale": "The Outcome-owned production or governance carrier mutation must make this independently observed requirement fail while preserving target liveness."
      }
    },
    {
      "key": "proof.requirement.technical-debt-and-future-change.exact",
      "fact_ref": "fact.requirement.technical-debt-and-future-change",
      "method": "exact_value",
      "authority": "machine",
      "proof_surface": "runtime_behavior",
      "evidence_capabilities": [
        "semantic_fact"
      ],
      "comparison": {
        "comparator": "exact_value",
        "mode": "exact",
        "parameters": {
          "representation": "inline",
          "locator": {
            "material_ref": "long-task-real-capability-facts",
            "kind": "manifest_pointer",
            "value": "/proof_obligations/41/comparison/parameters/value"
          },
          "sha256": "a6b8e09402c2277ac9516f6820940db216072211e7912326b64ff416e54f2820",
          "value": {
            "comparator": "exact_value"
          }
        },
        "tolerance": null,
        "mask": null
      },
      "oracle_ref": "oracle.long-task-real-capability",
      "environment_ref": "environment.long-task-real-capability",
      "observer_refs": [],
      "counterfactual": {
        "disposition": "required",
        "refs": [
          "mutate-p0-exact-recomputation"
        ],
        "basis_refs": [
          "technical-debt-and-future-change"
        ],
        "rationale": "The Outcome-owned production or governance carrier mutation must make this independently observed requirement fail while preserving target liveness."
      }
    },
    {
      "key": "proof.requirement.compatibility-security-resource-boundaries.exact",
      "fact_ref": "fact.requirement.compatibility-security-resource-boundaries",
      "method": "exact_value",
      "authority": "machine",
      "proof_surface": "runtime_behavior",
      "evidence_capabilities": [
        "semantic_fact"
      ],
      "comparison": {
        "comparator": "exact_value",
        "mode": "exact",
        "parameters": {
          "representation": "inline",
          "locator": {
            "material_ref": "long-task-real-capability-facts",
            "kind": "manifest_pointer",
            "value": "/proof_obligations/42/comparison/parameters/value"
          },
          "sha256": "a6b8e09402c2277ac9516f6820940db216072211e7912326b64ff416e54f2820",
          "value": {
            "comparator": "exact_value"
          }
        },
        "tolerance": null,
        "mask": null
      },
      "oracle_ref": "oracle.long-task-real-capability",
      "environment_ref": "environment.long-task-real-capability",
      "observer_refs": [],
      "counterfactual": {
        "disposition": "required",
        "refs": [
          "mutate-observer-tcb-closure"
        ],
        "basis_refs": [
          "compatibility-security-resource-boundaries"
        ],
        "rationale": "The Outcome-owned production or governance carrier mutation must make this independently observed requirement fail while preserving target liveness."
      }
    },
    {
      "key": "proof.requirement.context-and-public-authority-update.exact",
      "fact_ref": "fact.requirement.context-and-public-authority-update",
      "method": "exact_value",
      "authority": "machine",
      "proof_surface": "runtime_behavior",
      "evidence_capabilities": [
        "semantic_fact"
      ],
      "comparison": {
        "comparator": "exact_value",
        "mode": "exact",
        "parameters": {
          "representation": "inline",
          "locator": {
            "material_ref": "long-task-real-capability-facts",
            "kind": "manifest_pointer",
            "value": "/proof_obligations/43/comparison/parameters/value"
          },
          "sha256": "a6b8e09402c2277ac9516f6820940db216072211e7912326b64ff416e54f2820",
          "value": {
            "comparator": "exact_value"
          }
        },
        "tolerance": null,
        "mask": null
      },
      "oracle_ref": "oracle.long-task-real-capability",
      "environment_ref": "environment.long-task-real-capability",
      "observer_refs": [],
      "counterfactual": {
        "disposition": "required",
        "refs": [
          "mutate-proof-and-roi"
        ],
        "basis_refs": [
          "context-and-public-authority-update"
        ],
        "rationale": "The Outcome-owned production or governance carrier mutation must make this independently observed requirement fail while preserving target liveness."
      }
    },
    {
      "key": "proof.requirement.verification-sequence-and-current-candidate.exact",
      "fact_ref": "fact.requirement.verification-sequence-and-current-candidate",
      "method": "exact_value",
      "authority": "machine",
      "proof_surface": "runtime_behavior",
      "evidence_capabilities": [
        "semantic_fact"
      ],
      "comparison": {
        "comparator": "exact_value",
        "mode": "exact",
        "parameters": {
          "representation": "inline",
          "locator": {
            "material_ref": "long-task-real-capability-facts",
            "kind": "manifest_pointer",
            "value": "/proof_obligations/44/comparison/parameters/value"
          },
          "sha256": "a6b8e09402c2277ac9516f6820940db216072211e7912326b64ff416e54f2820",
          "value": {
            "comparator": "exact_value"
          }
        },
        "tolerance": null,
        "mask": null
      },
      "oracle_ref": "oracle.long-task-real-capability",
      "environment_ref": "environment.long-task-real-capability",
      "observer_refs": [],
      "counterfactual": {
        "disposition": "required",
        "refs": [
          "mutate-proof-and-roi"
        ],
        "basis_refs": [
          "verification-sequence-and-current-candidate"
        ],
        "rationale": "The Outcome-owned production or governance carrier mutation must make this independently observed requirement fail while preserving target liveness."
      }
    },
    {
      "key": "proof.requirement.final-hard-acceptance.exact",
      "fact_ref": "fact.requirement.final-hard-acceptance",
      "method": "exact_value",
      "authority": "machine",
      "proof_surface": "runtime_behavior",
      "evidence_capabilities": [
        "semantic_fact"
      ],
      "comparison": {
        "comparator": "exact_value",
        "mode": "exact",
        "parameters": {
          "representation": "inline",
          "locator": {
            "material_ref": "long-task-real-capability-facts",
            "kind": "manifest_pointer",
            "value": "/proof_obligations/45/comparison/parameters/value"
          },
          "sha256": "a6b8e09402c2277ac9516f6820940db216072211e7912326b64ff416e54f2820",
          "value": {
            "comparator": "exact_value"
          }
        },
        "tolerance": null,
        "mask": null
      },
      "oracle_ref": "oracle.long-task-real-capability",
      "environment_ref": "environment.long-task-real-capability",
      "observer_refs": [],
      "counterfactual": {
        "disposition": "required",
        "refs": [
          "mutate-proof-and-roi"
        ],
        "basis_refs": [
          "final-hard-acceptance"
        ],
        "rationale": "The Outcome-owned production or governance carrier mutation must make this independently observed requirement fail while preserving target liveness."
      }
    },
    {
      "key": "proof.requirement.approved-final-capability-wording.exact",
      "fact_ref": "fact.requirement.approved-final-capability-wording",
      "method": "exact_value",
      "authority": "machine",
      "proof_surface": "runtime_behavior",
      "evidence_capabilities": [
        "semantic_fact"
      ],
      "comparison": {
        "comparator": "exact_value",
        "mode": "exact",
        "parameters": {
          "representation": "inline",
          "locator": {
            "material_ref": "long-task-real-capability-facts",
            "kind": "manifest_pointer",
            "value": "/proof_obligations/46/comparison/parameters/value"
          },
          "sha256": "a6b8e09402c2277ac9516f6820940db216072211e7912326b64ff416e54f2820",
          "value": {
            "comparator": "exact_value"
          }
        },
        "tolerance": null,
        "mask": null
      },
      "oracle_ref": "oracle.long-task-real-capability",
      "environment_ref": "environment.long-task-real-capability",
      "observer_refs": [],
      "counterfactual": {
        "disposition": "required",
        "refs": [
          "mutate-assurance-governance"
        ],
        "basis_refs": [
          "approved-final-capability-wording"
        ],
        "rationale": "The Outcome-owned production or governance carrier mutation must make this independently observed requirement fail while preserving target liveness."
      }
    },
    {
      "key": "proof.requirement.critical-scope-escape-risk.exact",
      "fact_ref": "fact.requirement.critical-scope-escape-risk",
      "method": "exact_value",
      "authority": "machine",
      "proof_surface": "runtime_behavior",
      "evidence_capabilities": [
        "semantic_fact"
      ],
      "comparison": {
        "comparator": "exact_value",
        "mode": "exact",
        "parameters": {
          "representation": "inline",
          "locator": {
            "material_ref": "long-task-real-capability-facts",
            "kind": "manifest_pointer",
            "value": "/proof_obligations/47/comparison/parameters/value"
          },
          "sha256": "a6b8e09402c2277ac9516f6820940db216072211e7912326b64ff416e54f2820",
          "value": {
            "comparator": "exact_value"
          }
        },
        "tolerance": null,
        "mask": null
      },
      "oracle_ref": "oracle.long-task-real-capability",
      "environment_ref": "environment.long-task-real-capability",
      "observer_refs": [],
      "counterfactual": {
        "disposition": "required",
        "refs": [
          "mutate-observer-tcb-closure"
        ],
        "basis_refs": [
          "critical-scope-escape-risk"
        ],
        "rationale": "The Outcome-owned production or governance carrier mutation must make this independently observed requirement fail while preserving target liveness."
      }
    },
    {
      "key": "proof.requirement.critical-self-attestation-risk.exact",
      "fact_ref": "fact.requirement.critical-self-attestation-risk",
      "method": "exact_value",
      "authority": "machine",
      "proof_surface": "runtime_behavior",
      "evidence_capabilities": [
        "semantic_fact"
      ],
      "comparison": {
        "comparator": "exact_value",
        "mode": "exact",
        "parameters": {
          "representation": "inline",
          "locator": {
            "material_ref": "long-task-real-capability-facts",
            "kind": "manifest_pointer",
            "value": "/proof_obligations/48/comparison/parameters/value"
          },
          "sha256": "a6b8e09402c2277ac9516f6820940db216072211e7912326b64ff416e54f2820",
          "value": {
            "comparator": "exact_value"
          }
        },
        "tolerance": null,
        "mask": null
      },
      "oracle_ref": "oracle.long-task-real-capability",
      "environment_ref": "environment.long-task-real-capability",
      "observer_refs": [],
      "counterfactual": {
        "disposition": "required",
        "refs": [
          "mutate-observer-tcb-closure"
        ],
        "basis_refs": [
          "critical-self-attestation-risk"
        ],
        "rationale": "The Outcome-owned production or governance carrier mutation must make this independently observed requirement fail while preserving target liveness."
      }
    },
    {
      "key": "proof.requirement.critical-claim-inflation-risk.exact",
      "fact_ref": "fact.requirement.critical-claim-inflation-risk",
      "method": "exact_value",
      "authority": "machine",
      "proof_surface": "runtime_behavior",
      "evidence_capabilities": [
        "semantic_fact"
      ],
      "comparison": {
        "comparator": "exact_value",
        "mode": "exact",
        "parameters": {
          "representation": "inline",
          "locator": {
            "material_ref": "long-task-real-capability-facts",
            "kind": "manifest_pointer",
            "value": "/proof_obligations/49/comparison/parameters/value"
          },
          "sha256": "a6b8e09402c2277ac9516f6820940db216072211e7912326b64ff416e54f2820",
          "value": {
            "comparator": "exact_value"
          }
        },
        "tolerance": null,
        "mask": null
      },
      "oracle_ref": "oracle.long-task-real-capability",
      "environment_ref": "environment.long-task-real-capability",
      "observer_refs": [],
      "counterfactual": {
        "disposition": "required",
        "refs": [
          "mutate-assurance-governance"
        ],
        "basis_refs": [
          "critical-claim-inflation-risk"
        ],
        "rationale": "The Outcome-owned production or governance carrier mutation must make this independently observed requirement fail while preserving target liveness."
      }
    }
  ],
  "oracles": [
    {
      "key": "oracle.long-task-real-capability",
      "trust": "named_external_tcb",
      "identity": "package-owned-long-task-real-capability-verifier",
      "version": "1.0.0",
      "sha256": null,
      "capabilities": [
        "exact_value"
      ]
    }
  ],
  "environments": [
    {
      "key": "environment.long-task-real-capability",
      "identity": "repository-current-candidate-v1",
      "definition": {
        "representation": "inline",
        "locator": {
          "material_ref": "long-task-real-capability-facts",
          "kind": "manifest_pointer",
          "value": "/environments/0/definition/value"
        },
        "sha256": "0e7dcc5190df133aedaf518847d09b7015b1bafa0ea8d943da1e4384303b7306",
        "value": {
          "runtime": "node",
          "workspace": "repository",
          "candidate": "current"
        }
      }
    }
  ],
  "blockers": []
}
```
