# AI SDLC Harness 工作流方案
## 一、最终目的
设计一套面向 AI Agent 的需求全链路 Harness 工作流，提高 Agent 在需求各阶段的完成效率。
这里的效率不是单次代码生成速度，而是 Agent 在复杂项目中完成阶段目标、产出阶段交付物、衔接上下游信息、处理需求变更和通过交付约束的整体效率。
这套工作流主要降低三类成本：
- 阶段执行成本：通过阶段角色 Skill、模板和上下文约束，让 Agent 在对应阶段更快产出符合预期的交付物。
- 阶段衔接成本：通过统一事实源、文档索引、任务状态和变更协议，减少阶段切换、产物同步和重新理解的成本。
- 阶段交付成本：通过把质量检查、Review 清单、测试与发布检查固定为阶段完成条件，减少每次交付时重新组织约束的心智成本。
## 二、当前现状与要解决的问题
### 2.1 稍有复杂度的软件项目天然需要多阶段软件工程
现状： 只要项目超过 demo、脚本或一次性页面的复杂度，就不能长期只靠“想到什么就让 Agent 写什么”的方式推进。软件工程本身要求需求被拆成多个阶段，例如需求收集、产品方案、技术方案、开发实现、Review、测试、发布和需求变更。每个阶段都有独立目标，也会形成对应交付产物。
需求收集 -> 原始需求记录、问题澄清、需求边界
产品方案 -> PRD、用户场景、验收标准、Out of Scope
技术方案 -> 架构设计、接口契约、数据结构、任务拆分
开发实现 -> 代码、测试、实现记录、提交记录
Review -> Review 报告、风险清单、重构建议
测试验证 -> 测试计划、测试矩阵、回归记录
发布上线 -> Release Note、部署检查、回滚方案
需求变更 -> RFC、影响范围、任务回退或增量计划
要解决的问题： 需要把每个阶段的目标、输入、输出和完成条件固定下来，让 Agent 在正确阶段完成正确交付物，而不是把需求、方案、开发、Review 和测试混成一段连续聊天。否则项目复杂度上升后，容易出现需求边界不清、方案和实现偏移、Review 缺少依据、测试缺少覆盖目标、变更无法回溯等问题。
### 2.2 阶段产物分散，跨阶段衔接存在切换成本和理解成本
现状： 在没有统一到同一个 Agent 客户端或同一套项目工作区的情况下，不同阶段的产物容易分散在不同位置：产品文档可能在 Web AI、Notion、飞书、Confluence 或 Google Docs 中生成；技术方案可能在 IDE Agent 对话里生成；开发过程发生在 coding agent 中；Review 准则可能是临时 prompt；测试策略可能靠人工补充。
这种分散会带来两类成本：
- 切换成本：人需要在多个工具、文档、会话和代码仓库之间复制、同步、解释和校对。
- 理解成本：Agent 进入新阶段时，无法天然继承上一阶段的产物、边界、取舍和未解决问题，需要重新读取、总结和对齐。
需求变更是这个问题的典型放大场景。需求变化后，受影响的通常不是单个代码点，而是 PRD、技术方案、接口契约、任务计划、实现代码、测试用例、Review 结论和实现文档组成的一整条链。阶段产物越分散，Agent 越容易漏改受影响内容，或误改未受影响的稳定内容。
要解决的问题： 需要把阶段产物统一到一套可寻址、可引用、可版本化的项目事实源中，并建立阶段之间的连续链路。Agent 进入下一阶段时，应能明确读取上一阶段产物；需求变更时，应通过 RFC、影响范围分析、局部补丁、任务回退或增量计划，把变更限制在受影响链路内，而不是重新理解或重写整个项目。
### 2.3 单阶段主要依靠 vibe 推进，但阶段 Skill 与交付硬约束需要固定进工作流
现状： 在单个阶段内部，Agent 的主要工作方式仍然是 vibe：人给出目标，Agent 结合上下文进行生成、修改、总结、补充和修正。阶段角色 Skill 不替代 vibe，而是沉淀该阶段的最佳实践，用来提高 vibe 的效率和稳定性。
不同阶段需要不同 Skill：PM 阶段需要需求澄清、边界定义和验收标准；架构阶段需要模块拆分、接口契约和风险识别；开发阶段需要按任务落地、控制修改范围和补测试；Review 阶段需要只读审查、风险分级和需求一致性检查；测试阶段需要边界条件、回归范围和覆盖矩阵。
但从阶段开始到阶段交付完成，不能只依赖 Agent 自我声明完成。为了保证产物质量，交付环节通常需要硬约束，例如 Lint、typecheck、unit test、integration test、build、coverage、review checklist、release smoke test 等。这些约束可能通过本地插件、脚本、Makefile、npm script、Agent 工具调用执行；团队协作时，也可能放在 CI/CD、GitHub Actions、GitLab CI、分支保护、PR check 或部署流水线中执行。执行形式不同，但本质上都属于阶段交付条件。
要解决的问题： 需要把阶段 Skill 和交付硬约束都固定进工作流。Skill 负责提高单阶段 vibe 的产出效率；硬约束负责保证阶段交付质量。硬约束不一定由 Harness 自己执行，但必须被声明为阶段完成和状态流转的判断依据。Agent 可以触发脚本、修复失败、记录结果，但不能绕过这些约束直接推进状态。
## 三、采用的方案
### 3.1 总体思路
AI SDLC Harness 不替代 Agent，也不把软件工程完全自动化。它在仓库中固定一套工作流骨架：
阶段定义
-> 阶段产物
-> 阶段 Skill
-> 阶段事实源
-> 阶段交付硬约束
-> 阶段流转规则
-> 需求变更回退规则

Agent 在单阶段内部仍然以 vibe 方式执行；Harness 负责规定当前阶段、应读内容、应写产物、应使用 Skill、完成前必须通过的 gate，以及需求变更时如何局部修正链路。

### 3.2 核心设计原则
- 阶段契约化：每个阶段都有输入、输出、Skill、gate 和下一阶段入口。
- 产物仓库化：关键产物进入 `.docs/`、`.agent/` 或同一工作区，成为可寻址、可版本化事实源。
- 语义切片化：阶段文档按业务能力、技术主题、任务、风险或变更事件切片，避免长文档被固定 chunk 检索时丢失边界信息。
- Skill 阶段化：每个 Skill 只沉淀一个阶段或动作的 SOP，不写成巨型 prompt。
- Gate 声明化：lint、typecheck、test、build、review checklist、release smoke test 等硬约束必须作为阶段完成条件。
- 变更补丁化：需求变化先进入 RFC，再做影响分析、局部补丁、任务回退或增量任务。
- 实现文档增量化：技术方案是计划，implementation doc 是开发后的事实。
- 派生视图自动化：`overview.html` 由脚本生成，只用于浏览，不作为事实源。
- Checkpoint 条件触发：长任务、中断、gate failure、BLOCKED 或上下文压缩风险出现时，写任务内执行快照。

### 3.3 事实源与派生产物
真正的事实源是：
- `.agent/state/*.yaml`
- `.agent/managed/policies/*.yaml`
- `<harnessRoot>/skills/*/SKILL.md`
- `.docs/**/*.md`
- `.docs/INDEX.md`
- `Makefile`
- `tools/*.py`

派生产物是：
- `.docs/<stage>/overview.html`

`overview.html` 由 `tools/build_doc_overviews.py` 生成。它把某阶段 Markdown slices 合成 HTML 总览，方便人类浏览和阶段交接，但需求引用、Review、测试和变更影响分析仍应引用原始 Markdown slice。

这里需要区分状态协议和状态数据：
- `lifecycle.yaml`、`tasks.yaml`、checkpoint、memory 的字段结构、状态枚举、迁移规则和校验逻辑属于 Harness 工作流能力，应由包提供 schema、模板、validator 和 migration。
- 某个项目当前处于哪个阶段、当前任务是什么、checkpoint 写了什么、memory 记录了哪些具体事实，属于项目实例数据，不应被包升级覆盖。

## 四、仓库结构
推荐模板结构如下：

```txt
/project-root
├── AGENTS.md
├── Makefile
├── README.md
│
├── .docs/
│   ├── INDEX.md
│   ├── 00_raw/
│   ├── 01_product/
│   ├── 02_architecture/
│   ├── 03_tech_plan/
│   ├── 04_implementation/
│   ├── 05_decisions/
│   ├── 06_review/
│   ├── 07_test/
│   ├── 08_release/
│   └── rfc/
│
├── .agent/
│   ├── state/
│   │   ├── lifecycle.yaml
│   │   ├── tasks.yaml
│   │   ├── tasks.draft.yaml
│   │   ├── gate_results.log
│   │   ├── checkpoints/
│   │   └── memory.md
│   ├── skills/
│   ├── managed/
│   │   ├── policies/
│   │   │   ├── phase_contracts.yaml
│   │   │   ├── gates.yaml
│   │   │   ├── allowed_paths.yaml
│   │   │   └── risk_matrix.yaml
│   │   ├── templates/
│   │   └── make/
│   └── archive/
│
├── tools/
├── .github/workflows/
└── src/ or services/
```

### 关键目录说明：
- `AGENTS.md`：Agent 全局协议，包含事实源、工作规则、提示词语言契约、checkpoint 和 overview 规则。
- `.docs/`：阶段产物事实源。每个阶段目录可包含多个 Markdown slice 和一个 generated `overview.html`。
- `.agent/state/`：当前项目的状态数据，包括生命周期、任务、gate 结果、checkpoint 和项目记忆；其 schema、初始模板、迁移和校验规则属于 Harness 工作流能力。
- `<harnessRoot>/skills/`：阶段角色 Skill 的 canonical source。默认 `<harnessRoot>` 是 `.agent`；当前仓库遵循默认值，因此使用 `.agent/skills/**`。
- `.agent/managed/policies/`：阶段契约、gate、路径约束和风险矩阵；默认内容来自 Harness 包，项目可通过 local override 调整。
- `.agent/managed/templates/`：PRD、技术方案、任务、实现文档、Review、测试、RFC、Release、Checkpoint 等模板；默认内容来自 Harness 包。
- `tools/`：确定性脚本和校验工具。
- `Makefile`：统一命令入口。

## 五、生命周期与阶段契约
### 5.1 生命周期状态
`.agent/state/lifecycle.yaml` 只记录当前项目处于哪个阶段，不记录所有任务细节。核心字段：

```yaml
project_name: "ProjectTemplate"
version: "v0.1"
current_phase: "REQUIREMENT_GATHERING"
active_role: "pm"
active_skill: "pm_prd"
current_milestone: "MVP"
allowed_next_phases:
  - "ARCHITECTING"
history: []
```

### 阶段枚举：
- `IDLE`
- `REQUIREMENT_GATHERING`
- `ARCHITECTING`
- `SPRINTING`
- `REVIEWING`
- `TESTING`
- `RELEASING`
- `COMPLETED`
- `RFC_RECALIBRATION`
- `BLOCKED`

阶段流转不手改 `lifecycle.yaml`，使用：

```sh
python3 tools/transition.py --to <PHASE>
```

### 5.2 阶段契约
阶段契约的 canonical source 写在 `.agent/managed/policies/phase_contracts.yaml`。核心关系如下：

| 阶段 | Skill | 主要输入 | 主要输出 | 出口 Gate | 下一阶段 |
|---|---|---|---|---|---|
| `REQUIREMENT_GATHERING` | `pm_prd` | `.docs/00_raw/` | `.docs/01_product/`, `.docs/INDEX.md` | `make validate-pm` | `ARCHITECTING` |
| `ARCHITECTING` | `architect_design` | PRD、现有架构、代码结构 | 架构文档、技术方案、`tasks.draft.yaml` | `make validate-design` | `SPRINTING` |
| `SPRINTING` | `dev_sprint` | `tasks.yaml`、PRD、技术方案 | 代码、测试、implementation docs、gate 记录 | `make validate-dev` | `REVIEWING` |
| `REVIEWING` | `reviewer` | PRD、技术方案、实现文档、`git diff` | Review report | `make validate-review` | `TESTING` |
| `TESTING` | `tester` | PRD、技术方案、实现文档、Review | Test plan、测试矩阵、回归记录 | `make validate-test` | `RELEASING` |
| `RELEASING` | `release_manager` | 测试结果、build artifacts | Release note、smoke result、rollback plan | `make validate-release` | `COMPLETED` |
| `RFC_RECALIBRATION` | `rfc_recalibrate` | RFC、PRD、技术方案、任务状态 | 局部补丁、任务回退或增量任务 | `make validate-rfc` | 原阶段或 `SPRINTING` |

## 六、文档切片与阶段产物
### 6.1 为什么要语义切片
RAG 能减少一次性塞进上下文的内容，但固定 chunk 和余弦召回存在信息损失。对 README 这类说明文档，RAG 损失通常可以接受；对需求边界、否定约束、接口契约、测试矩阵、RFC 影响范围等执行约束，不能只依赖 RAG。

所以 `.docs/` 采用粗粒度语义切片：
- 小到足以被稳定检索和引用。
- 大到保持一个完整语义单元。
- 不按固定 token 或段落机械切。

### 6.2 各阶段切片责任
文档切片不是统一由 `pm_prd` 完成，而是谁生成阶段产物，谁负责按该阶段语义边界切片。

| 目录 | 负责 Skill | 切片边界 |
|---|---|---|
| `.docs/00_raw/` | `pm_prd` | 一次会议、一段用户输入、一份外部需求文档或一次聊天记录 |
| `.docs/01_product/` | `pm_prd` | 业务能力、用户场景、验收边界、Out of Scope |
| `.docs/02_architecture/` | `architect_design` | 领域边界、子系统、跨模块架构问题、关键技术风险 |
| `.docs/03_tech_plan/` | `architect_design` | 可实现范围、接口契约、数据模型、模块方案、任务组 |
| `.docs/04_implementation/` | `implementation_doc` | 已完成任务、真实实现模块、核心数据流 |
| `.docs/05_decisions/` | `architect_design` | 单个架构决策，一份 ADR 对应一个 durable decision |
| `.docs/06_review/` | `reviewer` | 一次 Review 批次、一个 PR、一个里程碑、一个模块或一个风险主题 |
| `.docs/07_test/` | `tester` | 测试计划、测试矩阵、回归批次、领域测试范围 |
| `.docs/08_release/` | `release_manager` | 版本、发布批次、hotfix、rollback plan |
| `.docs/rfc/` | `rfc_recalibrate` | 一次可独立评估、实现和回归的需求变更 |

如果文档变化没有改变语义边界，更新原 slice；如果新增独立场景、拆分模块、合并流程或 RFC 改变影响范围，应新增、拆分、合并或废弃 slice，并更新 `.docs/INDEX.md`。

### 6.3 overview.html
每个 `.docs/<stage>/` 目录生成一个 `overview.html`：

```sh
make docs-overview
make validate-doc-overviews
```

规则：
- `overview.html` 不手写。
- Markdown slices 和 `.docs/INDEX.md` 才是事实源。
- 任意 `.docs/<stage>/**/*.md` 变化后，运行 `make docs-overview`。
- `make validate-harness` 会检查 overview 是否最新。

## 七、任务状态与开发循环
### 7.1 tasks.yaml
`.agent/state/tasks.yaml` 是开发阶段的机器可读短期执行记忆，描述当前正在执行和即将执行的任务。它也可以被理解为 sprint-level plan：文件名采用 `tasks.yaml` 是因为内部执行单元是带有 `id`、`status`、`allowed_paths`、`required_gates` 和 `implementation_doc` 的可验证任务，而不是松散计划。典型任务字段：

```yaml
current_phase: "SPRINTING"
current_task_id: "DEV-003"
tasks:
  - id: "DEV-003"
    title: "实现登录失败次数限制"
    status: "pending"
    priority: "P1"
    docs:
      product:
        - ".docs/01_product/auth/security.md"
      tech_plan:
        - ".docs/03_tech_plan/auth/rate_limit.md"
      rfc: []
    allowed_paths:
      - "src/auth/**"
      - "tests/auth/**"
    required_gates:
      - "make lint"
      - "make test-current-domain"
    implementation_doc: ".docs/04_implementation/auth/login_rate_limit_impl.md"
    checkpoint_required: false
    checkpoint: ".agent/state/checkpoints/DEV-003.md"
    gate_result: ""
    commit: ""
```

### 任务状态：
- `pending`
- `in_progress`
- `done`
- `blocked`
- `pending_revision`
- `cancelled`
- `archived`

### 7.2 开发阶段循环
开发阶段不是反复重写整个 Sprint 计划，而是：

```txt
读取 current_task
-> 基于技术方案和任务上下文生成当前任务局部 plan
-> 执行代码和测试
-> 运行 required_gates
-> 写 implementation doc
-> 更新 tasks.yaml
-> 刷新 overview.html
-> 选择下一个 pending task
```

只有这些情况才回到 RFC 或架构阶段重新规划：
- 技术方案被实现证明不可行。
- 当前任务暴露新的架构风险或跨模块边界变化。
- 需求发生变化。
- `allowed_paths` 无法覆盖必要修改。
- gate 失败不是普通代码问题，而是设计、基建或环境阻塞。

### 7.3 Checkpoint Protocol
Checkpoint 是 task 内部执行快照，用来降低上下文压缩、中断、新开对话或多人交接时的信息损失。它不是 PRD、不是技术方案、不是正式任务拆分，也不是完成后的 implementation doc。

层级关系：

```txt
PRD
-> tech plan
-> tasks.yaml 中的 task
-> 当前 task 的局部 plan
-> checkpoint
```

触发条件满足任一项时写 checkpoint：
- 当前 task 预计无法在一个连续工作回合内完成。
- 修改文件数超过 5 个。
- 出现 gate failure。
- 出现 `BLOCKED` 候选原因。
- 发现技术方案和真实实现明显偏移。
- 用户要求暂停、切换对话或继续前保存现场。
- Agent 判断上下文可能接近压缩。

触发后：
1. 在当前 task 中设置 `checkpoint_required: true`。
2. 设置 `checkpoint: ".agent/state/checkpoints/<Task ID>.md"`。
3. 按 `.agent/managed/templates/CHECKPOINT_TEMPLATE.md` 写 checkpoint。
4. 同步更新 `.agent/state/checkpoints/latest.md`。
5. 运行 `make validate-checkpoint`。

任务完成并写入 implementation doc 后，可以把 `checkpoint_required` 改回 `false`；历史 checkpoint 可保留用于恢复。

## 八、阶段 Skill
每个 Skill 只负责一个阶段或动作。

| Skill | 负责内容 |
|---|---|
| `manager` | 读取 lifecycle/tasks/index，路由 `/status`、`/next`、`/advance`、`/rfc`、`/checkpoint`，执行阶段切换 |
| `pm_prd` | 原始需求归档、PRD 切片、验收标准、Out of Scope、Open Questions |
| `architect_design` | 架构设计、技术方案、接口契约、任务草案、ADR |
| `dev_sprint` | 按 `current_task_id` 执行开发、控制 `allowed_paths`、运行 `required_gates` |
| `implementation_doc` | 记录真实实现结构、数据流、测试覆盖和方案偏移 |
| `reviewer` | 只读 Review，输出 findings、风险、重构建议和测试入口结论 |
| `tester` | 生成 test matrix、补测试、记录回归和覆盖缺口 |
| `release_manager` | Release note、build artifacts、smoke test、deployment checklist、rollback plan |
| `rfc_recalibrate` | RFC 影响分析、局部补丁、任务回退或增量任务 |

### 提示词语言契约：
- 面向人阅读的说明、规则、SOP、检查清单使用中文。
- 机器契约保持英文，包括字段名、路径、命令、阶段枚举、状态枚举、脚本参数。
- 不翻译 `current_phase`、`active_skill`、`allowed_paths`、`required_gates`、`implementation_doc` 等字段名。
- 不翻译 `REQUIREMENT_GATHERING`、`SPRINTING`、`done`、`pending_revision` 等枚举。
- 后续更新提示词时运行 `make validate-harness`。

## 九、Gate 与命令入口
### 9.1 常用命令
```sh
make status
make docs-overview
make validate-doc-overviews
make validate-checkpoint
make validate-harness
make validate-current
make validate-pm
make validate-design
make validate-dev
make validate-review
make validate-test
make validate-release
make validate-rfc
```

### 9.2 阶段 gate
- `validate-pm`：检查 PRD、验收标准、Out of Scope、Open Questions。
- `validate-design`：检查架构、技术方案和 `tasks.draft.yaml`。
- `validate-dev`：检查任务状态、路径约束、checkpoint、lint、测试和 implementation docs。
- `validate-review`：检查 Review report。
- `validate-test`：检查 test plan、test matrix、回归和覆盖缺口。
- `validate-release`：检查 release note、smoke result 和 rollback plan。
- `validate-rfc`：检查 RFC、影响范围和回归要求。

### 9.3 CI/CD
团队协作时，Makefile gate 可以映射到 GitHub Actions、GitLab CI、PR check 或分支保护。当前模板提供 `.github/workflows/harness.yml`，默认运行 `validate-harness`，也可手动选择其它 gate。

## 十、需求变更机制
### 10.1 RFC 原则
需求变更不能直接改 PRD、技术方案、任务或代码。先写 RFC，再影响分析，再局部补丁。

RFC 必须包含：
- 变更背景
- 变更内容
- Product impact
- Technical impact candidates
- Acceptance Criteria
- Regression Requirements
- Status: `DRAFT` / `APPLIED` / `VERIFIED` / `ARCHIVED`

### 10.2 开发中途变更
触发条件：`tasks.yaml` 中仍有 `pending` 或 `in_progress` 任务。

处理流程：
```txt
进入 RFC_RECALIBRATION
-> 局部修改 PRD / 技术方案
-> 标记受影响 done 任务为 pending_revision
-> 未完成但受影响任务追加 revision notes
-> 恢复 SPRINTING
-> 重新执行受影响任务
-> 运行回归测试
```

### 10.3 封版后变更
触发条件：当前里程碑已完成或准备新版本。

处理流程：
```txt
归档旧 tasks.yaml
-> 新建增量 tasks
-> 局部修改文档
-> 执行增量任务
-> 全局回归测试
-> 新版本归档
```

### 10.4 影响分析边界
影响分析不能假定绝对精确。推荐组合：
- LLM 语义识别：找业务入口和概念入口。
- 静态分析：从导入关系、调用关系、测试引用生成候选范围。
- 回归测试：验证未变更模块没有被破坏。

## 十一、宏指令协议
宏指令由 `manager` 根据生命周期路由：

| 宏指令 | 作用 |
|---|---|
| `/status` | 读取 lifecycle、tasks、gate 结果，报告当前状态 |
| `/next` | 根据当前阶段调用对应 Skill |
| `/advance` | 运行当前阶段出口 gate，通过后流转 |
| `/rfc <file>` | 挂起当前流程，进入 RFC 变更处理 |
| `/syncdocs` | 归档/切分长文档，更新 `.docs/INDEX.md` |
| `/overview` | 运行 `make docs-overview` |
| `/checkpoint` | 写入或更新 `.agent/state/checkpoints/latest.md` |
| `/review` | 进入只读 Review |
| `/test` | 进入测试计划和验证流程 |

## 十二、Codex 适配方式
Codex 不需要真实“模式切换”：
- 阶段由 `lifecycle.yaml` 决定。
- 角色由 `active_skill` 决定。
- 阶段切换由 `transition.py` 完成。
- 切换裁决由 Makefile / Hook / CI 完成。

新对话或上下文压缩后的恢复入口：
1. 读取 `AGENTS.md`。
2. 运行 `make status`。
3. 读取 `.agent/state/lifecycle.yaml`。
4. 读取 `.agent/state/tasks.yaml`。
5. 如果存在 `.agent/state/checkpoints/latest.md`，先读取 checkpoint。
6. 根据 `active_skill` 进入当前阶段。

## 十三、最小可落地版本
最小闭环可以先保留：

```txt
/project-root
├── AGENTS.md
├── Makefile
├── .docs/
│   ├── INDEX.md
│   ├── 01_product/
│   ├── 03_tech_plan/
│   ├── 04_implementation/
│   └── rfc/
├── .agent/state/
│   ├── lifecycle.yaml
│   ├── tasks.yaml
│   └── checkpoints/
├── .agent/skills/
│   ├── manager/
│   ├── dev_sprint/
│   ├── implementation_doc/
│   └── rfc_recalibrate/
└── tools/
    ├── build_doc_overviews.py
    ├── transition.py
    ├── validate_checkpoint.py
    ├── validate_tasks.py
    └── validate_task_docs.py
```

最小命令：
- `/status`
- `/next`
- `/advance`
- `/rfc`
- `/overview`
- `/checkpoint`

最小任务完成标准：
1. 代码已修改。
2. 相关检查已通过。
3. implementation doc 已生成。
4. `.docs/INDEX.md` 已更新。
5. `overview.html` 已刷新。
6. 如触发 checkpoint，checkpoint 已生成并通过校验。
7. `tasks.yaml` 已记录状态。

## 十四、完整工作流示例
场景：新增“登录失败 5 次后锁定账号 10 分钟”功能。

1. 需求进入系统：
   - 保存原始需求到 `.docs/00_raw/`。
   - 生成 `.docs/01_product/auth/account_lock.md`。
   - 记录 Open Questions，例如管理员解锁是否需要审计日志。
   - 更新 `.docs/INDEX.md` 和 `overview.html`。

2. 进入架构阶段：
   - 运行 `make validate-pm`。
   - `transition.py --to ARCHITECTING`。
   - 生成架构文档、技术方案和 `tasks.draft.yaml`。

3. 进入开发阶段：
   - 确认任务后进入 `SPRINTING`。
   - `dev_sprint` 读取当前 task、PRD 和技术方案。
   - 在 `allowed_paths` 内修改代码和测试。
   - 运行 `required_gates`。
   - 如果任务过长或 gate 失败，写 checkpoint。

4. 任务完成：
   - gate 通过后调用 `implementation_doc`。
   - 写 `.docs/04_implementation/auth/account_lock_impl.md`。
   - 更新 `.docs/INDEX.md`、`overview.html` 和 `tasks.yaml`。

5. Review、测试、发布：
   - `reviewer` 输出 Review report。
   - `tester` 生成 test matrix 并跑回归。
   - `release_manager` 输出 release note、smoke result 和 rollback plan。

6. 后续变更：
   - 新需求写入 `.docs/rfc/RFC_*.md`。
   - `rfc_recalibrate` 做影响分析。
   - 受影响任务标记为 `pending_revision` 或生成增量任务。
   - 执行回归测试。

## 十五、新旧方式对比
### 15.1 单纯 vibe coding
- 优点：Agent 能快速生成局部代码、修复局部 bug、补测试、解释代码。
- 瓶颈：阶段产物、任务状态、交付约束和需求变更记录没有统一固定下来。
- 风险：项目越长，越依赖人类手动同步上下文；需求变更时容易漏改或误改。

### 15.2 AI SDLC Harness
- 新增机制：阶段契约、统一事实源、阶段 Skill、任务状态、交付 gate、实现文档、RFC、overview、checkpoint。
- 改变层级：不是提升 Agent 单次生成能力，而是提升 Agent 参与复杂软件工程时的阶段衔接和交付可验证性。
- 收益来源：降低阶段执行成本、阶段衔接成本和阶段交付成本。

## 十六、总结
AI SDLC Harness 是面向 AI Agent 的需求全链路工作流骨架。它把阶段目标、阶段产物、阶段 Skill、任务状态、交付 gate、实现文档、语义切片、派生总览、checkpoint 和 RFC 变更协议固定进仓库。

Agent 仍然以 vibe 方式完成单阶段任务；Harness 负责让整个项目保持阶段连续、事实可寻址、交付可验证、变更可回溯。

## 十七、本工作流项目如何使用工作流迭代自己
本仓库是 AI SDLC Harness 的自举开发仓库。它既保存工作流能力本身，也使用这套工作流来迭代工作流能力本身。

### 17.1 工作流配置的定义与范围
这里的“工作流配置”不只是一组 prompt 或 Skill，而是定义 Harness 如何运行的一整套协议：

- Agent 入口和角色规则：`AGENTS.md`、`<harnessRoot>/skills/**/SKILL.md`。
- 阶段与 gate 策略：`.agent/managed/policies/**`。
- 阶段产物模板：`.agent/managed/templates/**`。
- state protocol：`lifecycle.yaml`、`tasks.yaml`、checkpoint、memory 的字段结构、状态枚举、迁移规则和校验逻辑。
- task/plan protocol：`current_task_id`、`tasks[]`、`allowed_paths`、`required_gates`、`implementation_doc`、`checkpoint_required` 等字段如何组成短期执行记忆。
- checkpoint protocol：checkpoint 应该有哪些章节、何时触发、如何更新 `latest.md`。
- memory protocol：memory 如何记录、校验、提升、失效，以及如何链接到 `.docs/**` 正式出处。
- validators、lifecycle transition、sync、upgrade、migration 等确定性工具逻辑。

需要特别区分：

```txt
状态结构 / schema / 生命周期规则 = Harness 工作流配置内容
状态实例 / 当前值 / 历史进度 = 当前项目运行数据
```

因此，`lifecycle.yaml` 应该有哪些字段、`tasks.yaml` 应该如何拆分、phase/status 枚举是什么、checkpoint 和 memory 如何校验，这些都属于 Harness 工作流配置，应进入 npm 包；但当前项目处于哪个 phase、当前 task 是什么、history 里有哪些时间戳、checkpoint 写了什么、memory 记录了哪些具体事实，则属于当前项目实例数据，不应被包升级覆盖。

### 17.2 为什么可以自迭代
这个仓库可以使用自己的 Harness 迭代自己，原因是它本身也可以被视为一个使用 AI SDLC Harness 的项目实例。

普通业务项目通过 `sdlc-harness init` 得到工作流入口、Skill、policy、template、state 初始结构和 `.docs/**` 产物目录；本仓库也拥有同样的工作流入口和运行状态。区别在于：普通业务项目在这套工作流之上开发业务系统，而本仓库在这套工作流之上开发 Harness 工作流本身。

也就是说，这个仓库既是 reference implementation，也是 authoring workspace。它不是在工作流之外手工维护工作流，而是在工作流内部把工作流当作当前项目来需求分析、架构设计、开发实现、Review、测试和发布。

### 17.3 本仓库实际开发的项目
当前这个仓库中实际开发的项目有两个紧密相关的目标：

1. 迭代 AI SDLC Harness 工作流配置本身：
   - 调整阶段规则、Skill、policy、template、state protocol、checkpoint protocol、memory protocol 和 validators。
   - 通过 `.docs/**` 记录需求、架构、技术方案和真实实现。
   - 通过 `.agent/state/**` 记录当前自举项目的运行状态。

2. 开发并迭代 npm 包分发能力：
   - 将工作流配置和产物模板打包为 `@ai-sdlc/sdlc-harness`。
   - 让其它项目可以通过 `sdlc-harness init`、`sync`、`upgrade` 低成本接入和持续升级。
   - 通过 `sdlc-harness package sync-source` 和 `sdlc-harness package check-source` 保证本仓库工作流源内容变化后，包内 canonical source 同步更新，不发生漂移。

所以，本仓库保存的是：

```txt
Harness 工作流能力源码
+ 当前自举项目的 state data
+ 当前自举项目的 .docs 产物
+ 面向其它项目分发的 npm 包源码
```

而 npm 包导出的是：

```txt
state schemas / initial state templates / validators / lifecycle transition logic
task-plan protocol / checkpoint protocol / memory protocol
skills / policies / templates / sync / upgrade / migrations
```

不导出的是当前项目的具体运行数据，例如当前 `current_phase`、当前 `tasks.yaml` 内容、checkpoint 内容、memory 条目和 `.docs/**` 产物。

## 十八、npm 包化与项目接入
当前仓库可以作为参考实现和模板仓库，但长期产品形态不应依赖每个业务项目直接 fork 整套配置。更稳的方式是把通用 Harness 能力拆成可版本化的 npm 包，并把业务项目中的工作流文件视为由包同步出来的 agent-readable artifact。

### 18.1 包与命令名称
npm 包建议命名为 `@ai-sdlc/sdlc-harness`，命令入口统一使用：

```sh
sdlc-harness <command>
```

不要把命令直接命名为 `harness`，避免与其它工具、脚本或项目内部概念冲突。

### 18.2 分层模型
包内维护 canonical source：
- CLI，例如 `sdlc-harness init`、`sdlc-harness sync`、`sdlc-harness upgrade`、`sdlc-harness doctor`。
- 默认 `<harnessRoot>/skills/*/SKILL.md`。
- 默认 `<harnessRoot>/managed/templates/*`。
- 默认 `<harnessRoot>/managed/policies/*`。
- `<harnessRoot>/state/**` 的 schema、初始状态模板、checkpoint protocol、memory protocol 和 migrations。
- 校验脚本、迁移脚本和 overview 生成脚本。

业务项目内保留 agent 实际读取和项目事实源：
- `AGENTS.md`。
- `<harnessRoot>/skills/**`，由 `sdlc-harness sync` 从包内 materialize 到工作区，作为 Skill canonical source。
- `<harnessRoot>/state/**` 的具体数据，例如当前 phase、当前 task、checkpoint、memory 条目和 gate 结果；这些值只属于当前项目，不由包覆盖。
- `<harnessRoot>/config.yaml`，记录 core version、schema version、managed files 和 local overrides。
- `.docs/**`，作为当前项目的需求、方案、实现、测试、发布事实源。

### 18.3 Harness 根目录配置
`sdlc-harness init` 会询问 Harness folder name。提示中会说明默认值是 `.agent`，直接回车就使用默认；也可以输入自定义目录名，例如 `.harness`。CLI 会把最终选择写入 `package.json`：

```json
{
  "sdlcHarness": {
    "harnessFolderName": ".harness"
  }
}
```

如果不通过 init，也可以手写 `package.json` 或使用独立配置文件 `sdlc-harness.config.json`：

```json
{
  "harnessFolderName": ".harness"
}
```

未配置时，默认 `<harnessRoot>` 是 `.agent`，因此 `init` 会生成 `.agent/config.yaml`、`.agent/state/**`、`.agent/skills/**` 和 `.agent/managed/**`。当前仓库遵循默认值，因此所有 Harness 配置都位于 `.agent/**`，Skill 直接位于 `.agent/skills/**`，不再经过额外中间目录。

`harnessFloderName` 作为历史兼容别名会被读取，但新配置应使用 `harnessFolderName`。

### 18.4 为什么仍要同步到工作区
多数 Agent 在启动或路由 Skill 时，只读取工作区内固定目录，例如 `AGENTS.md`、`.agent/skills/**/SKILL.md` 或类似约定。它们通常不会直接扫描 `node_modules` 中的包内容。

因此 npm 包不能只把 Skill 藏在包里。正确流程是：

```txt
npm package = canonical source / version source / migration source
sdlc-harness sync = materialize 到工作区固定目录
workspace files = Agent 实际读取入口
state protocol = 包提供 schema / template / validator / migration
<harnessRoot>/state concrete data + .docs = 项目事实源，升级不覆盖
```

### 18.5 新项目和已有项目接入
新项目接入：

```sh
npm install -D @ai-sdlc/sdlc-harness
npx sdlc-harness init
```

已有项目中途接入：

```sh
npm install -D @ai-sdlc/sdlc-harness
npx sdlc-harness init --adopt
```

`init --adopt` 不假设项目为空，应尽量只创建最小 Harness 入口、扫描已有 README/docs/src/tests，并通过 `sdlc-harness doctor` 报告缺失产物或推荐阶段。

### 18.6 同步与升级
同步命令：

```sh
npx sdlc-harness sync
```

`sync` 负责把包内默认 Skill、模板、策略文件 materialize 到工作区固定位置，并为 managed files 写入版本和 checksum metadata。

升级命令：

```sh
npm update @ai-sdlc/sdlc-harness
npx sdlc-harness upgrade
```

`sdlc-harness upgrade` 必须自动执行 `sdlc-harness sync`，用户不需要在升级后手动再跑一次同步。推荐执行顺序：
1. 读取 `<harnessRoot>/config.yaml` 中记录的当前版本和 schema version。
2. 运行必要 migrations。
3. 按 state schema migration 升级 `<harnessRoot>/state/**` 的结构，但保留项目自己的状态值。
4. 更新 managed files。
5. 自动执行 sync，把最新 Skill、模板、策略和状态模板 materialize 到工作区。
6. 运行 `sdlc-harness doctor` 或对应 `make validate-harness`，输出升级报告。

### 18.7 本地覆盖规则
项目本地定制不应直接改 managed files。推荐使用：

```txt
<harnessRoot>/overrides/skills/<skill-name>.md
<harnessRoot>/overrides/templates/<template-name>.md
<harnessRoot>/managed/policies/*.local.yaml
```

`sdlc-harness sync` 负责合并 canonical source 和 local overrides，生成最终工作区文件。这样既保证 Agent 能读到完整规则，也能让包升级时保留项目差异。
