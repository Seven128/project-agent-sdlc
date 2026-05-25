# AI SDLC Harness 项目规格说明

本文件保存 AI SDLC Harness 的完整产品说明、设计原则、阶段契约和包化策略。面向用户的安装与日常使用入口见 [README.md](README.md)。

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
现状： 在没有统一到同一个 Agent 客户端或同一套项目工作区的情况下，不同阶段的产物容易分散在不同位置：产品文档可能在 Web AI、Notion、飞书、Confluence 或 Google Docs 中生成；技术方案可能在 IDE Agent 对话里生成；开发过程发生在 coding agent 中；Review 准则可能是临时 skill；测试策略可能靠人工补充。
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
- Skill 阶段化：每个 Skill 只沉淀一个阶段或动作的 SOP，不写成巨型 skill。
- Gate 声明化：lint、typecheck、test、build、review checklist、release smoke test 等硬约束必须作为阶段完成条件。
- 变更补丁化：需求变化先进入 RFC，再做影响分析、局部补丁、任务回退或增量任务。
- 实现文档增量化：技术方案是计划，implementation doc 是开发后的事实。
- 派生视图自动化：`overview.md` 由脚本生成，只用于浏览，不作为事实源。
- Plan 短期化：open task 在 `plan.yaml` 中保存当前执行合同，done task 完成后移出当前计划，避免历史现场长期占用上下文。
- 项目级单例：Harness 串联软件工程全链路，是一个项目的 singleton workflow；多人协作应限制在单一阶段产物内，不应多人并行推进同一项目的全链路状态。
- 包与项目解耦：Harness npm 包只提供默认工作流能力、schema、模板、策略、迁移和同步规则；项目状态、业务内容和本地定制属于用户仓库，`sync` / `upgrade` 必须增量合并，不得全量覆盖。
- 自举配置分层：开发 Harness 自身时可以有只服务于本仓库的 authoring overlay，用于记录工作流演进原则、包化约束和专用 Skill；这些内容默认不进入通用 npm 包，也不默认分发给用户项目。

### 3.3 事实源与派生产物
真正的事实源是：
- `.agent/state/*.yaml`
- `.agent/pjsdlc_managed/policies/*.yaml`
- `<harnessRoot>/skills/*/SKILL.md`
- `.docs/**/*.md`
- `.docs/INDEX.md`
- `Makefile`
- `tools/*.py`

派生产物是：
- `.docs/<stage>/overview.md`

`overview.md` 由 `tools/build_doc_overviews.py` 生成。它把某阶段 Markdown slices 合成 Markdown 总览，方便人类浏览和阶段交接，但需求引用、Review、测试和变更影响分析仍应引用原始 Markdown slice。

这里需要区分状态协议和状态数据：
- `lifecycle.yaml`、`plan.yaml`、`plan.draft.yaml`、memory 的字段结构、状态枚举、迁移规则和校验逻辑属于 Harness 工作流能力，应由包提供 schema、模板、validator 和 migration。
- 某个项目当前处于哪个阶段、当前任务是什么、open task 的执行备注是什么、memory 记录了哪些具体事实，属于项目实例数据，不应被包升级覆盖。

### 3.4 协作边界：项目级 singleton workflow
AI SDLC Harness 集成的是软件工程的所有主要环节：需求、产品方案、架构、技术方案、开发、Review、测试、发布和 RFC 变更。对一个项目来说，这套连续事实链应被视为项目级 singleton workflow，也就是同一时间只有一条主线负责维护当前生命周期状态、当前计划和阶段间事实衔接。

这不是适合多人同时并行推进同一项目全链路状态的协作层。如果多个人从某个时间点分别开分支，每个人可变更的内容都不只是代码，还可能包括需求边界、产品方案、技术方案、任务计划、实现事实、测试策略和发布判断。合并时冲突就不再是局部文本冲突，而是整条软件工程事实链的冲突；这种合并成本来自设计本身，不能依赖普通 git merge 稳定解决。

多人协作仍然应该采用传统的软件工程边界：把协作限制在单个阶段内，例如多人共同完善 PRD、一起评审技术方案、多人并行开发同一已确认方案下的代码任务，或共同补测试矩阵。此时需要合并的是同一阶段内的产物变更，边界清楚、冲突可控。各阶段产物被确认并串联起来后，才进入项目级 singleton workflow，作为下一阶段的事实源继续推进。

## 四、仓库结构
推荐模板结构如下：

```txt
/project-root
├── AGENTS.md
├── Makefile
├── README.md           # 用户视角的安装、接入和日常使用指南
├── PROJECT_SPEC.md     # Harness 产品说明、设计原则和包化策略
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
│   │   ├── plan.yaml
│   │   ├── plan.draft.yaml
│   │   └── memory.md
│   ├── skills/
│   ├── pjsdlc_managed/
│   │   ├── policies/
│   │   │   ├── phase_contracts.yaml
│   │   │   ├── gates.yaml
│   │   │   ├── allowed_paths.yaml
│   │   │   └── risk_matrix.yaml
│   │   ├── templates/
│   │   └── make/
│   │       └── sdlc-harness.mk
│
├── tools/
├── .github/workflows/
└── src/ or services/
```

### 关键目录说明：
- `AGENTS.md`：Agent 全局协议，包含事实源、工作规则、提示词语言契约、plan 和 overview 规则。
- `.docs/`：阶段产物事实源。每个阶段目录可包含多个 Markdown slice 和一个 generated `overview.md`。
- `.agent/state/`：当前项目的状态数据，包括生命周期、执行计划、gate 结果和项目记忆；其 schema、初始模板、迁移和校验规则属于 Harness 工作流能力。
- `<harnessRoot>/skills/`：阶段角色 Skill 的 canonical source。`sdlc-harness init` 默认选择 `Codex -> .codex`；配置兜底值和 `Other` 的空输入默认值是 `.agent`。当前仓库作为 Harness authoring workspace 使用 `.agent/skills/**`。
- `.agent/pjsdlc_managed/policies/`：阶段契约、gate、路径约束和风险矩阵；默认内容来自 Harness 包，项目可通过 local override 调整。
- `.agent/pjsdlc_managed/templates/`：PRD、技术方案、计划、实现文档、Review、测试、RFC、Release 等模板；默认内容来自 Harness 包。
- `.agent/pjsdlc_managed/make/sdlc-harness.mk`：Harness 默认命令目标；根 `Makefile` 只保留 include block，避免与用户项目目标耦合。
- `tools/`：确定性脚本和校验工具。
- `Makefile`：统一命令入口，作为用户仓库入口文件存在，只通过 include block 引入 `.agent/pjsdlc_managed/make/sdlc-harness.mk`。

除 `<harnessRoot>/skills/**` 需要保持稳定的 Harness hard file index 之外，工作流相关默认配置统一放在 `<harnessRoot>/pjsdlc_managed/**`。不要再维护 `<harnessRoot>/policies/**` 或 `<harnessRoot>/templates/**` 这类 legacy mirror，避免同一份配置出现多个事实源。

`AGENTS.md` 和根 `Makefile` 这类桥接文件使用 `pjsdlc:sdlc-harness:*` marker 隔离包管理内容和用户内容：

```txt
<!-- pjsdlc:sdlc-harness:begin -->
...
<!-- pjsdlc:sdlc-harness:end -->
```

```make
# pjsdlc:sdlc-harness:make:begin
-include .agent/pjsdlc_managed/make/sdlc-harness.mk
# pjsdlc:sdlc-harness:make:end
```

旧的 `sdlc-harness:*` marker 只作为 legacy marker 识别；`sync` 会把完整旧 block 原位替换为新的 `pjsdlc:sdlc-harness:*` block。`config.yaml` 不使用文本块隔离，它通过 YAML schema、known fields、migration 和 local override 规则管理。

## 五、生命周期与阶段契约
### 5.1 生命周期状态
`.agent/state/lifecycle.yaml` 只记录当前项目处于哪个阶段，不记录所有任务细节。核心字段：

```yaml
project_name: "ProjectTemplate"
version: "v0.1"
current_phase: "REQUIREMENT_GATHERING"
active_role: "pm"
active_skill: "pjsdlc_pm_prd"
current_milestone: "MVP"
allowed_next_phases:
  - "ARCHITECTING"
```

`lifecycle.yaml` 不保存 phase transition history。过去阶段流转是 git/PR/CI/release 系统里的 cold archive，不是 Agent 默认上下文。

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
阶段契约的 canonical source 写在 `.agent/pjsdlc_managed/policies/phase_contracts.yaml`。核心关系如下：

| 阶段 | Skill | 主要输入 | 主要输出 | 出口 Gate | 下一阶段 |
|---|---|---|---|---|---|
| `REQUIREMENT_GATHERING` | `pjsdlc_pm_prd` | `.docs/00_raw/` | `.docs/01_product/`, `.docs/INDEX.md` | `make validate-pm` | `ARCHITECTING` |
| `ARCHITECTING` | `pjsdlc_architect_design` | PRD、现有架构、代码结构 | 架构文档、技术方案、`plan.draft.yaml` | `make validate-design` | `SPRINTING` |
| `SPRINTING` | `pjsdlc_dev_sprint` | `plan.yaml`、PRD、技术方案 | 代码、测试、implementation docs、gate 记录 | `make validate-dev` | `REVIEWING` |
| `REVIEWING` | `pjsdlc_reviewer` | PRD、技术方案、实现文档、`git diff` | Review report | `make validate-review` | `TESTING` |
| `TESTING` | `pjsdlc_tester` | PRD、技术方案、实现文档、Review | Test plan、测试矩阵、回归记录 | `make validate-test` | `RELEASING` |
| `RELEASING` | `pjsdlc_release_manager` | 测试结果、build artifacts | Release note、smoke result、rollback plan | `make validate-release` | `COMPLETED` |
| `RFC_RECALIBRATION` | `pjsdlc_rfc_recalibrate` | RFC、PRD、技术方案、任务状态 | 局部补丁、任务回退或增量任务 | `make validate-rfc` | 原阶段或 `SPRINTING` |

## 六、文档切片与阶段产物
### 6.1 为什么要语义切片
RAG 能减少一次性塞进上下文的内容，但固定 chunk 和余弦召回存在信息损失。对 README 这类说明文档，RAG 损失通常可以接受；对需求边界、否定约束、接口契约、测试矩阵、RFC 影响范围等执行约束，不能只依赖 RAG。

所以 `.docs/` 采用粗粒度语义切片：
- 小到足以被稳定检索和引用。
- 大到保持一个完整语义单元。
- 不按固定 token 或段落机械切。

### 6.2 各阶段切片责任
文档切片不是统一由 `pjsdlc_pm_prd` 完成，而是谁生成阶段产物，谁负责按该阶段语义边界切片。

| 目录 | 负责 Skill | 切片边界 |
|---|---|---|
| `.docs/00_raw/` | `pjsdlc_pm_prd` | 一次会议、一段用户输入、一份外部需求文档或一次聊天记录 |
| `.docs/01_product/` | `pjsdlc_pm_prd` | 业务能力、用户场景、验收边界、Out of Scope |
| `.docs/02_architecture/` | `pjsdlc_architect_design` | 领域边界、子系统、跨模块架构问题、关键技术风险 |
| `.docs/03_tech_plan/` | `pjsdlc_architect_design` | 可实现范围、接口契约、数据模型、模块方案、任务组 |
| `.docs/04_implementation/` | `pjsdlc_implementation_doc` | 真实实现模块、子系统、核心数据流 |
| `.docs/05_decisions/` | `pjsdlc_architect_design` | 单个架构决策，一份 ADR 对应一个 durable decision |
| `.docs/06_review/` | `pjsdlc_reviewer` | 一次 Review 批次、一个 PR、一个里程碑、一个模块或一个风险主题 |
| `.docs/07_test/` | `pjsdlc_tester` | 测试计划、测试矩阵、回归批次、领域测试范围 |
| `.docs/08_release/` | `pjsdlc_release_manager` | 版本、发布批次、hotfix、rollback plan |
| `.docs/rfc/` | `pjsdlc_rfc_recalibrate` | 一次可独立评估、实现和回归的需求变更 |

如果文档变化没有改变语义边界，更新原 slice；如果新增独立场景、拆分模块、合并流程或 RFC 改变影响范围，应新增、拆分、合并或废弃 slice，并更新 `.docs/INDEX.md`。

implementation doc 是最终实现产物的事实层，默认与技术架构和技术方案中的模块、子系统或核心数据流对应。task 是执行和提交边界，task id、commit 和 RFC 只作为 implementation doc 的 provenance；多个 task 可以更新同一份 implementation doc。

### 6.3 overview.md
每个 `.docs/<stage>/` 目录生成一个 `overview.md`：

```sh
make docs-overview
make validate-doc-overviews
```

规则：
- `overview.md` 不手写。
- Markdown slices 和 `.docs/INDEX.md` 才是事实源。
- 任意 `.docs/<stage>/**/*.md` 变化后，运行 `make docs-overview`。
- `make validate-harness` 会检查 overview 是否最新。

## 七、任务状态与开发循环
### 7.1 plan.yaml
`.agent/state/plan.yaml` 是开发阶段的机器可读短期执行记忆，只保留当前和未来任务。open task 直接保存当前任务需要的执行合同；任务完成后从 `plan.yaml` 移除，避免过往任务变成无效上下文。`next_task_sequence` 负责在历史 task 被移除后继续分配后续 `DEV-*` id。典型 open task 字段：

```yaml
current_phase: "SPRINTING"
current_task_id: "DEV-003"
next_task_sequence: 4
tasks:
  - id: "DEV-003"
    title: "实现登录失败次数限制"
    status: "in_progress"
    summary: "实现登录失败次数限制并补充对应测试。"
    docs:
      product:
        - ".docs/01_product/auth/account_lock.md"
      tech_plan:
        - ".docs/03_tech_plan/auth/account_lock_plan.md"
    allowed_paths:
      - "src/auth/**"
      - "tests/auth/**"
    required_gates:
      - "npm test"
    acceptance_criteria:
      - "连续失败 5 次后锁定账号 10 分钟"
    working_notes:
      - "只记录恢复现场所需的短备注。"
    implementation_doc: ".docs/04_implementation/auth/login_rate_limit_impl.md"
```

task 完成后不再长期保留 done task 字段，当前 plan 回到只含待做任务或空列表：

```yaml
current_phase: "SPRINTING"
current_task_id: ""
next_task_sequence: 4
tasks: []
```

### 任务状态：
- `pending`
- `in_progress`
- `done`
- `blocked`
- `pending_revision`
- `cancelled`

### 7.2 开发阶段循环
开发阶段不是反复重写整个 Sprint 计划，而是：

```txt
检查 git status，确认没有未归属到当前 task 的脏变更
-> 如存在历史 task 残留变更，先完成对应 task commit/push 或报告 blocker
-> 读取 current_task
-> 读取当前 open task 的 allowed_paths / required_gates / acceptance_criteria
-> 执行代码和测试
-> 运行 current_task.required_gates
-> 写入或更新相关 implementation doc
-> 刷新 overview.md
-> 保持当前 task 仍位于 plan.yaml
-> 创建 task implementation commit
-> 从 plan.yaml 中移除当前 task
-> 创建 task completion ledger commit
-> git push 两个 commit 到当前 upstream branch
-> 选择下一个 pending task
```

开发阶段默认一个 task 对应一个主要实现提交和一个轻量完成记录提交。task implementation commit 的 commit message 应包含 task id，例如 `DEV-003: implement login rate limit`。这个 commit 应包含该 task 的代码、测试、被更新的模块级 implementation doc、`.docs/INDEX.md`、`overview.md` 和必要验证证据；不要把多个 task 混进同一个 commit，也不要把未归属变更顺手带入。

task completion ledger commit 发生在 implementation commit 之后，只负责把当前 task 从 `plan.yaml` 移除。不要把这个清理动作 amend 回 implementation commit，否则 task 的实现变更和当前计划短期化会混在一起，后续追溯不清晰。

默认不要追溯 done task 的执行流水。修 bug、补功能和继续开发时，以当前代码、测试、PRD、技术方案和模块级 implementation doc 为准；历史 task 查询主要看“做了什么、为什么做、影响哪个模块、验证了什么”。task id 和 commit 只作为 provenance；`allowed_paths`、`required_gates`、临时 `working_notes` 是执行期约束，不作为历史查询 API。只有用户明确要求 forensic/audit/regression 追溯时，才临时查询 git、PR、CI 或 release 记录。

两个 commit 都 `git push` 成功前，不认为该 task 完成，也不要进入下一个 pending task。如果仓库没有 remote/upstream、没有权限、凭证失效或 push 被拒绝，当前 task 应停在需要人工处理的状态并报告 blocker；不能为了继续执行而静默跳过 push。

只有这些情况才回到 RFC 或架构阶段重新规划：
- 技术方案被实现证明不可行。
- 当前任务暴露新的架构风险或跨模块边界变化。
- 需求发生变化。
- 当前 task 的 `allowed_paths` 无法覆盖必要修改。
- gate 失败不是普通代码问题，而是设计、基建或环境阻塞。

### 7.3 Plan Protocol
`plan.yaml` 是 open task 的执行合同和现场快照，用来约束当前修改范围、记录必要 gate，并降低上下文压缩、中断、新开对话或多人交接时的信息损失。它不是 PRD、不是技术方案，也不是完成后的 implementation doc。

层级关系：

```txt
PRD
-> tech plan
-> plan.yaml 中的 task
-> 代码、测试
-> 模块级 implementation doc
```

每个 open task 都必须在 `plan.yaml` 中包含 `docs`、`allowed_paths`、`required_gates` 和 `acceptance_criteria`。执行中只把必要现场写成短 `working_notes`；任务完成并写入或更新相关 implementation doc 后，把该 task 从当前 `plan.yaml` 移除。历史动作记录以 git/PR/CI/release 系统作为 cold archive，产物结果以模块级 implementation doc 为准。

过去 phase/task/gate 执行流水不是 Agent 默认上下文。`plan.yaml` 不长期保存 commit hash，`lifecycle.yaml` 不保存 `history`，completion ledger commit 只负责把当前 plan 恢复为短期、低噪声状态。只有用户明确要求 forensic/audit/regression 追溯时，才临时查询 git、PR、CI 或 release 记录。

Gate evidence 不再使用独立 state 文件。执行中如需恢复现场，可把关键 gate 结果写入当前 task 的 `working_notes`；任务完成后，最终验证事实写入相关 implementation doc 的 `Verification`，CI logs 或 release 记录也可以作为长期外部记录。

## 八、阶段 Skill
每个 Skill 只负责一个阶段或动作。

通用阶段 Skill 不只是文档切片规则，也必须包含可直接用于对话的专业角色提示词。角色提示词负责说明该角色如何澄清需求、提出取舍、识别 blocker、与用户共同生成阶段产物，并把产物落到 `.docs/`、`plan.yaml`、gate 或实现记录中。因为这些 Skill 会作为 npm 包默认能力分发，角色提示词应保持通用、专业、强约束，不绑定具体业务项目，也不要求用户直接修改 managed Skill。

### 8.1 Skill 索引模型：hard index 与 soft index

Harness workflow skill 同时支持 native skill hard index 和 Harness soft index。这里的 “hard / soft” 有两个层次，必须分清：

- **Native skill hard index**：Agent 客户端或 runtime 在模型回答前扫描自己的固定 skill root 或 registry，枚举候选 `SKILL.md`，再按语义命中并水合。它是否生效由具体 Agent 决定；只在 `AGENTS.md` 里写“skill 路径是 `<harnessRoot>/skills`”不能强行改变客户端预水合机制。
- **Harness hard file index**：Harness 在项目内稳定生成 `<harnessRoot>/skills/<skill_name>/SKILL.md`。这是 workflow 的文件路径契约，保证 `AGENTS.md`、`lifecycle.yaml` 和 `phase_contracts.yaml` 能确定性找到对应角色提示词；它本身不等于 native skill 注册。
- **Harness soft index**：Agent 启动后读取 `AGENTS.md`，按 `lifecycle.yaml.current_phase`、`active_skill` 和 `phase_contracts.yaml` 决定下一步该读取哪个 `<harnessRoot>/skills/<skill>/SKILL.md`。这是跨 Agent 的默认路由方式，依赖模型遵守项目协议，但不要求客户端原生支持 skill registry。

| 通道 | 触发时机 | 机制 | 适用场景 |
|---|---|---|---|
| Native skill hard index | Agent 回答前 | Agent 客户端扫描自己的 native skill root / registry，命中后把 `SKILL.md` 作为首轮上下文水合 | 用户说“产品方案”“技术方案”“开发循环”等片段时，客户端可在首轮直接命中对应 skill |
| Harness soft index | Agent 进入项目后 | `AGENTS.md` 要求先读 `lifecycle.yaml`，再按 `active_skill` / `phase_contracts.yaml` 读取 `<harnessRoot>/skills/<skill>/SKILL.md` | 跨 Agent 默认路径；即使没有 native skill 注册，也能按当前阶段稳定路由 |

`<harnessRoot>/skills/**` 是项目内 source of truth；它不自动等同于任意 Agent 的 native skill root。若要获得 native skill 首轮水合，需要由具体 Agent adapter、安装命令或客户端配置把这些 workflow skills 注册到该 Agent 支持的目录中。Harness 本身仍保留 soft index，保证不同 Agent 都能在读取项目规则后工作。

| Skill | 负责内容 |
|---|---|
| `pjsdlc_manager` | 读取 lifecycle/plan/index，将自然语言意图或 `/status`、`/next`、`/advance`、`/rfc` 路由到 workflow action，执行阶段切换 |
| `pjsdlc_pm_prd` | 原始需求归档、PRD 切片、验收标准、Out of Scope、Open Questions |
| `pjsdlc_architect_design` | 架构设计、技术方案、接口契约、任务草案、ADR |
| `pjsdlc_dev_sprint` | 按 `current_task_id` 执行开发、控制 `allowed_paths`、运行 `required_gates`，并在每个 task 完成后 commit/push |
| `pjsdlc_implementation_doc` | 记录真实实现结构、数据流、测试覆盖和方案偏移 |
| `pjsdlc_reviewer` | 只读 Review，输出 findings、风险、重构建议和测试入口结论 |
| `pjsdlc_tester` | 生成 test matrix、补测试、记录回归和覆盖缺口 |
| `pjsdlc_release_manager` | Release note、build artifacts、smoke test、deployment checklist、rollback plan |
| `pjsdlc_rfc_recalibrate` | RFC 影响分析、局部补丁、任务回退或增量任务 |

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
- `validate-design`：检查架构、技术方案和 `plan.draft.yaml`。
- `validate-dev`：检查任务状态、open task plan 合同、lint、测试和 implementation docs。
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
触发条件：`plan.yaml` 中仍有 `pending` 或 `in_progress` 任务。

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
用 git tag 或 release commit 固化当前版本
-> 新建增量 tasks
-> 局部修改文档
-> 执行增量任务
-> 全局回归测试
-> 新版本 release doc 或外部发布记录
```

### 10.4 影响分析边界
影响分析不能假定绝对精确。推荐组合：
- LLM 语义识别：找业务入口和概念入口。
- 静态分析：从导入关系、调用关系、测试引用生成候选范围。
- 回归测试：验证未变更模块没有被破坏。

## 十一、宏指令协议
用户不需要记忆宏指令。自然语言意图和约定宏指令是两层入口：自然语言是主要控制方式，宏指令由 `manager` 根据生命周期路由，作为更完整、更细节的提示词别名、调试入口或自动化入口保留。两层入口必须映射到同一组 workflow action，避免“自然语言一套、命令一套”。区别在于宏指令携带更稳定的细节约束；简单自然语言入口成本更低，但更依赖 Agent 根据当前上下文补足细节。

常见自然语言映射：

| 用户表达 | 内部 workflow action |
|---|---|
| “现在到哪了 / 状态如何” | 等价 `/status` |
| “继续 / 下一步 / 推进” | 等价 `/next` |
| “能进入下一阶段吗 / 进入下一步” | 等价 `/advance` |
| “需求变了 / 这个设计要改” | 进入 RFC workflow |
| “完善产品方案 / 写 PRD / 我提供信息，你帮我完善产品方案” | 等价 `/prd`，在 `REQUIREMENT_GATHERING` 更新 PRD、验收标准和 open questions |
| “设计技术方案 / 做架构方案 / 根据 PRD 做技术方案” | 等价 `/design`，在 `ARCHITECTING` 更新 architecture、tech plan 和 `plan.draft.yaml` |
| “开始开发 / 做当前任务 / 做下一个任务” | 等价 `/dev`，在 `SPRINTING` 创建或选择下一个最小 DEV task，并完成一个 task 闭环 |
| “开始循环：写任务，执行任务 / 把开发循环跑完” | 等价 `/devloop`，连续运行开发循环直到没有明确任务或遇到 blocker |
| “跑测试 / 验证一下” | 运行当前 task 或阶段对应 gate |
| “准备 review / 帮我 review” | 进入只读 Review |
| “刷新文档总览 / 同步 overview” | 等价 `/overview` |

当自然语言意图会改变阶段、创建或删除 task、提交、push 或发布时，Agent 先说明即将执行的动作和验证方式，再继续。

快捷宏指令：

| 宏指令 | 作用 |
|---|---|
| `/status` | 读取 lifecycle、tasks、gate 结果，报告当前状态 |
| `/next` | 根据当前阶段调用对应 Skill |
| `/advance` | 运行当前阶段出口 gate，通过后流转 |
| `/rfc <file>` | 挂起当前流程，进入 RFC 变更处理 |
| `/prd` | 在需求阶段澄清用户目标，更新 PRD、验收标准、open questions、`.docs/INDEX.md` 和 overview |
| `/design` | 在架构阶段基于 PRD 更新 architecture、tech plan 和 `plan.draft.yaml` |
| `/dev` | 创建或选择下一个最小 DEV task，执行一个 task，完成 gate、implementation doc、两段 commit/push 后停止 |
| `/devloop` | 连续运行 `/dev`，直到没有明确可创建/执行的 task 或遇到需求、架构、allowed_paths、gate、commit/push blocker |
| `/syncdocs` | 归档/切分长文档，更新 `.docs/INDEX.md` |
| `/overview` | 运行 `make docs-overview` |
| `/review` | 进入只读 Review |
| `/test` | 进入测试计划和验证流程 |

## 十二、Codex 适配方式
Codex 不需要真实“模式切换”：
- 阶段由 `lifecycle.yaml` 决定。
- 角色由 `active_skill` 决定。
- 阶段切换由 `transition.py` 完成。
- 切换裁决由 Makefile / Hook / CI 完成。
- `/plan` 和 `/goal` 是 Codex 客户端模式，不由 Harness 自动开启；用户可以手动组合 `/plan /prd`、`/plan 完善产品方案`、`/goal /devloop` 或 `/goal 开始循环：写任务，执行任务`。

新对话或上下文压缩后的恢复入口：
1. 读取 `AGENTS.md`。
2. 运行 `make status`。
3. 读取 `.agent/state/lifecycle.yaml`。
4. 读取 `.agent/state/plan.yaml`。
5. 根据 `active_skill` 进入当前阶段。

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
│   └── plan.yaml
├── .agent/skills/
│   ├── pjsdlc_manager/
│   ├── pjsdlc_dev_sprint/
│   ├── pjsdlc_implementation_doc/
│   └── pjsdlc_rfc_recalibrate/
└── tools/
    ├── build_doc_overviews.py
    ├── transition.py
    ├── validate_plan.py
    └── validate_task_docs.py
```

可选快捷命令：
- `/status`
- `/next`
- `/advance`
- `/rfc`
- `/prd`
- `/design`
- `/overview`

最小任务完成标准：
1. 代码已修改。
2. 相关检查已通过。
3. 相关 implementation doc 已生成或更新。
4. `.docs/INDEX.md` 已更新。
5. `overview.md` 已刷新。
6. open task 的 plan 执行合同已完整。
7. `plan.yaml` 已在 implementation commit 之后移除 done task。
8. 已在当前 task 移除前创建 task implementation commit。
9. 已在 implementation commit 之后短期化 `plan.yaml`，并创建 task completion ledger commit。
10. 已 `git push` 两个 commit 到当前 upstream branch；如果 push 失败，任务不能视为完成。

## 十四、完整工作流示例
场景：新增“登录失败 5 次后锁定账号 10 分钟”功能。

1. 需求进入系统：
   - 保存原始需求到 `.docs/00_raw/`。
   - 生成 `.docs/01_product/auth/account_lock.md`。
   - 记录 Open Questions，例如管理员解锁是否需要审计日志。
   - 更新 `.docs/INDEX.md` 和 `overview.md`。

2. 进入架构阶段：
   - 运行 `make validate-pm`。
   - `transition.py --to ARCHITECTING`。
   - 生成架构文档、技术方案和 `plan.draft.yaml`。

3. 进入开发阶段：
   - 确认任务后进入 `SPRINTING`。
   - `pjsdlc_dev_sprint` 读取当前 task、PRD 和技术方案。
   - 读取当前 task 的 `allowed_paths`，并在范围内修改代码和测试。
   - 运行当前 task 的 `required_gates`。
   - 如果任务过长或 gate 失败，更新当前 task 的短 `working_notes`。

4. 任务完成：
   - gate 通过后调用 `pjsdlc_implementation_doc`。
   - 写 `.docs/04_implementation/auth/account_lock_impl.md`。
   - 更新 `.docs/INDEX.md`、`overview.md`，并在当前 task 仍位于 `plan.yaml` 时创建 task implementation commit。
   - 从当前 `plan.yaml` 移除该 task 并创建 task completion ledger commit。

5. Review、测试、发布：
   - `pjsdlc_reviewer` 输出 Review report。
   - `pjsdlc_tester` 生成 test matrix 并跑回归。
   - `pjsdlc_release_manager` 输出 release note、smoke result 和 rollback plan。

6. 后续变更：
   - 新需求写入 `.docs/rfc/RFC_*.md`。
   - `pjsdlc_rfc_recalibrate` 做影响分析。
   - 受影响任务标记为 `pending_revision` 或生成增量任务。
   - 执行回归测试。

## 十五、新旧方式对比
### 15.1 单纯 vibe coding
- 优点：Agent 能快速生成局部代码、修复局部 bug、补测试、解释代码。
- 瓶颈：阶段产物、任务状态、交付约束和需求变更记录没有统一固定下来。
- 风险：项目越长，越依赖人类手动同步上下文；需求变更时容易漏改或误改。

### 15.2 AI SDLC Harness
- 新增机制：阶段契约、统一事实源、阶段 Skill、执行计划、交付 gate、实现文档、RFC、overview。
- 改变层级：不是提升 Agent 单次生成能力，而是提升 Agent 参与复杂软件工程时的阶段衔接和交付可验证性。
- 收益来源：降低阶段执行成本、阶段衔接成本和阶段交付成本。

## 十六、总结
AI SDLC Harness 是面向 AI Agent 的需求全链路工作流骨架。它把阶段目标、阶段产物、阶段 Skill、执行计划、交付 gate、实现文档、语义切片、派生总览和 RFC 变更协议固定进仓库。

Agent 仍然以 vibe 方式完成单阶段任务；Harness 负责让整个项目保持阶段连续、事实可寻址、交付可验证、变更可回溯。

## 十七、本工作流项目如何使用工作流迭代自己
本仓库是 AI SDLC Harness 的自举开发仓库。它既保存工作流能力本身，也使用这套工作流来迭代工作流能力本身。

### 17.1 工作流配置的定义与范围
这里的“工作流配置”不只是一组 skill 或 Skill，而是定义 Harness 如何运行的一整套协议：

- Agent 入口和角色规则：`AGENTS.md`、`<harnessRoot>/skills/**/SKILL.md`。
- 阶段与 gate 策略：`.agent/pjsdlc_managed/policies/**`。
- 阶段产物模板：`.agent/pjsdlc_managed/templates/**`。
- state protocol：`lifecycle.yaml`、`plan.yaml`、`plan.draft.yaml`、memory 的字段结构、状态枚举、迁移规则和校验逻辑。
- task/plan protocol：`current_task_id`、`next_task_sequence`、`tasks[]`、`summary`、`implementation_doc` 和 open task 的 `allowed_paths` / `required_gates` 如何组成短期执行记忆。
- memory protocol：memory 如何记录、校验、提升、失效，以及如何链接到 `.docs/**` 正式出处。
- validators、lifecycle transition、sync、upgrade、migration 等确定性工具逻辑。

需要特别区分：

```txt
状态结构 / schema / 生命周期规则 = Harness 工作流配置内容
状态实例 / 当前值 = 当前项目运行数据
```

因此，`lifecycle.yaml` 应该有哪些字段、`plan.yaml` 应该如何拆分、phase/status 枚举是什么、plan 和 memory 如何校验，这些都属于 Harness 工作流配置，应进入 npm 包；但当前项目处于哪个 phase、当前 task 是什么、open task 里有哪些执行备注、memory 记录了哪些具体事实，则属于当前项目实例数据，不应被包升级覆盖。

### 17.2 为什么可以自迭代
这个仓库可以使用自己的 Harness 迭代自己，原因是它本身也可以被视为一个使用 AI SDLC Harness 的项目实例。

普通业务项目通过 `sdlc-harness init` 得到工作流入口、Skill、policy、template、state 初始结构和 `.docs/**` 产物目录；本仓库也拥有同样的工作流入口和运行状态。区别在于：普通业务项目在这套工作流之上开发业务系统，而本仓库在这套工作流之上开发 Harness 工作流本身。

也就是说，这个仓库既是 reference implementation，也是 authoring workspace。它不是在工作流之外手工维护工作流，而是在工作流内部把工作流当作当前项目来需求分析、架构设计、开发实现、Review、测试和发布。

### 17.3 本仓库实际开发的项目
当前这个仓库中实际开发的项目有两个紧密相关的目标：

1. 迭代 AI SDLC Harness 工作流配置本身：
   - 调整阶段规则、Skill、policy、template、state protocol、plan protocol、memory protocol 和 validators。
   - 通过 `.docs/**` 记录需求、架构、技术方案和真实实现。
   - 通过 `.agent/state/**` 记录当前自举项目的运行状态。

2. 开发并迭代 npm 包分发能力：
   - 将工作流配置和产物模板打包为 `agent-project-sdlc`。
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
task-plan protocol / memory protocol
skills / policies / templates / sync / upgrade / migrations
```

不导出的是当前项目的具体运行数据，例如当前 `current_phase`、当前 `plan.yaml` 内容、open task 执行备注、memory 条目和 `.docs/**` 产物。

### 17.4 Harness Authoring Overlay
本仓库还有一类特殊配置：开发 Harness 自身时才需要的 authoring overlay。它不是通用工作流的一部分，而是本仓库作为 Harness authoring workspace 时使用的本地增强层。

这类配置用于回答：
- 迭代 Harness npm 包时必须遵守哪些额外原则？
- 哪些规则只约束工作流源码仓库，而不应分发给普通业务项目？
- 当新增 package sync、migration、validator、Skill、模板或策略时，Agent 应额外读取哪些约束？
- 某条自举规则什么时候应该晋升为通用 Harness 能力？

推荐预留目录：

```txt
.agent/skills/authoring/
├── principles/
│   ├── package_workspace_decoupling.md
│   ├── migration_safety.md
│   └── source_sync_boundary.md
├── skills/
│   ├── harness_package_design/SKILL.md
│   └── harness_migration_review/SKILL.md
└── policies/
    └── package_authoring.yaml
```

语义边界如下：

| 层级 | 示例路径 | 是否默认进入 npm 包 | 责任 |
|---|---|---|---|
| 通用 Harness 配置 | `.agent/skills/**`, `.agent/pjsdlc_managed/**` | 是 | 面向所有接入项目的阶段 Skill、模板、策略和默认规则 |
| 项目实例数据 | `.agent/state/**`, `.docs/**` | 否 | 当前项目的状态、需求、方案、实现、测试和发布事实 |
| Harness authoring overlay | `.agent/skills/authoring/**` | 否 | 只约束本仓库迭代 Harness 自身的原则、专用 Skill 和包化安全规则 |

Authoring overlay 的默认规则：
- `AGENTS.md` 可以声明本仓库作为 authoring workspace 时需要额外读取 `.agent/skills/authoring/**`。
- `package sync-source` 默认不复制 `.agent/skills/authoring/**` 到 `packages/sdlc-harness/assets/**`。
- `sdlc-harness sync` 和 `upgrade` 默认不把 authoring overlay materialize 到用户项目。
- 如果某条 authoring rule 对所有用户项目都有价值，必须通过 PRD / tech plan / RFC 明确晋升为通用 Skill、policy、template、PROJECT_SPEC 或 README 规则，再进入包内 canonical assets。
- 如果某条 authoring Skill 只服务于 Harness 包源码维护，例如 package source drift、migration safety、managed block compatibility，就应留在 authoring overlay，不污染通用阶段 Skill。

这个分层解决的是自举开发中的边界问题：本仓库需要比普通用户项目更多的工作流开发约束，但这些约束不能因为本仓库是 package source 就自动成为所有用户项目的默认配置。

### 17.5 Authoring Overlay 的影响面
引入 authoring overlay 会影响以下位置的设计判断，但不要求一次性实现所有机制：

| 影响面 | 需要遵守的原则 |
|---|---|
| README / PROJECT_SPEC / AGENTS | README 说明用户接入和日常使用；PROJECT_SPEC 说明分层模型和设计取舍；AGENTS 可声明本仓库额外读取 `.agent/skills/authoring/**`。 |
| source mappings | `packages/sdlc-harness/source-mappings.yaml` 默认只同步通用 Harness 配置，不同步 authoring overlay。 |
| package assets | `packages/sdlc-harness/assets/**` 只保存应分发给用户项目的 canonical source。 |
| validators | 通用 validators 校验用户项目；authoring-specific validators 应单独声明，避免成为用户项目 gate。 |
| Skill 设计 | 通用阶段 Skill 放 `.agent/skills/**`；维护 Harness 包自身的专用 Skill 放 `.agent/skills/authoring/**`。 |
| RFC / 晋升流程 | authoring rule 晋升为通用能力时，必须记录影响范围、兼容性、sync/upgrade 行为和用户项目迁移方式。 |

判断一条规则放在哪里，可以使用这个准则：

```txt
所有业务项目都应该遵守 -> 通用 Harness 配置
只有当前项目的事实或状态 -> 项目实例数据
只有开发 Harness 包自身时需要 -> Harness authoring overlay
```

## 十八、npm 包化与项目接入
当前仓库可以作为参考实现和模板仓库，但长期产品形态不应依赖每个业务项目直接 fork 整套配置。更稳的方式是把通用 Harness 能力拆成可版本化的 npm 包，并把业务项目中的工作流文件视为由包同步出来的 agent-readable artifact。

### 18.1 包与命令名称
npm 包当前命名为 `agent-project-sdlc`，命令入口统一使用：

```sh
sdlc-harness <command>
```

不要把命令直接命名为 `harness`，避免与其它工具、脚本或项目内部概念冲突。

### 18.2 分层模型
包内维护 canonical source：
- CLI，例如 `sdlc-harness init`、`sdlc-harness sync`、`sdlc-harness upgrade`、`sdlc-harness doctor`。
- 默认 `<harnessRoot>/skills/*/SKILL.md`。
- 默认 `<harnessRoot>/pjsdlc_managed/templates/*`。
- 默认 `<harnessRoot>/pjsdlc_managed/policies/*`。
- 默认 `<harnessRoot>/pjsdlc_managed/make/sdlc-harness.mk`。
- `<harnessRoot>/state/**` 的 schema、初始状态模板、plan protocol、memory protocol 和 migrations。
- 校验脚本、迁移脚本和 overview 生成脚本。

业务项目内保留 agent 实际读取和项目事实源：
- `AGENTS.md`。
- `<harnessRoot>/skills/**`，由 `sdlc-harness sync` 从包内 materialize 到工作区，作为 Skill canonical source。
- `<harnessRoot>/pjsdlc_managed/**`，承载模板、策略和默认 Makefile targets 等可版本化工作流配置。
- `<harnessRoot>/state/**` 的具体数据，例如当前 phase、当前 task、open task 执行备注、memory 条目和 gate 结果；这些值只属于当前项目，不由包覆盖。
- `<harnessRoot>/config.yaml`，记录 core version、schema version、managed files 和 local overrides。
- `.docs/**`，作为当前项目的需求、方案、实现、测试、发布事实源。

### 18.3 Harness 根目录配置
`sdlc-harness init` 先询问目标 Agent，而不是直接询问 folder name。直接回车选择默认 `Codex`，并把 Harness folder 写为 `.codex`。内置选项与目录映射如下：

| Agent 选项 | harnessFolderName |
|---|---|
| `Codex` | `.codex` |
| `Claude Code` | `.claude` |
| `Cursor` | `.cursor` |
| `Cline` | `.cline` |
| `Roo Code` | `.roo` |
| `Gemini CLI` | `.gemini` |
| `Other` | 继续询问自定义 folder；直接回车默认 `.agent` |

只有选择 `Other` 时，CLI 才继续询问 Harness folder name。CLI 会把最终选择写入 `package.json`：

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

显式命令行参数 `--harness-folder` / `--harnessFolderName` 优先级最高，会跳过 Agent 选择问句并直接使用指定目录。已有 `package.json#sdlcHarness.harnessFolderName` 或 `sdlc-harness.config.json#harnessFolderName` 的项目也不会重复询问。

未配置且不经过交互式 init 时，配置层默认 `<harnessRoot>` 仍是 `.agent`。交互式 `init` 的默认体验则是 `Codex -> .codex`，因此会生成 `.codex/config.yaml`、`.codex/state/**`、`.codex/skills/**` 和 `.codex/pjsdlc_managed/**`。当前仓库作为 Harness authoring workspace 继续使用 `.agent/**`，Skill 直接位于 `.agent/skills/**`，不再经过额外中间目录。

`harnessFloderName` 作为历史兼容别名会被读取，但新配置应使用 `harnessFolderName`。

### 18.4 为什么仍要同步到工作区
多数 Agent 在启动或路由 Skill 时，只读取工作区内固定目录，例如 `AGENTS.md`、`.codex/skills/**/SKILL.md`、`.agent/skills/**/SKILL.md` 或类似约定。它们通常不会直接扫描 `node_modules` 中的包内容。

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
npm install -D agent-project-sdlc
npx sdlc-harness init
```

已有项目中途接入：

```sh
npm install -D agent-project-sdlc
npx sdlc-harness init --adopt
```

`init --adopt` 不假设项目为空，应尽量只创建最小 Harness 入口、扫描已有 README/docs/src/tests，并通过 `sdlc-harness doctor` 报告缺失产物或推荐阶段。

### 18.6 同步与升级
同步命令：

```sh
npx sdlc-harness sync
```

`sync` 负责把包内默认 Skill、模板、策略文件和默认 Makefile targets materialize 到工作区固定位置，并为 managed files 写入版本和 checksum metadata。

升级命令：

```sh
npm update agent-project-sdlc
npx sdlc-harness upgrade
```

`sdlc-harness upgrade` 必须自动执行 `sdlc-harness sync`，用户不需要在升级后手动再跑一次同步。推荐执行顺序：
1. 读取 `<harnessRoot>/config.yaml` 中记录的当前版本和 schema version。
2. 运行必要 migrations。
3. 按 state schema migration 升级 `<harnessRoot>/state/**` 的结构，但保留项目自己的状态值。
4. 更新 managed files。
5. 自动执行 sync，把最新 Skill、模板、策略、默认 Makefile targets 和状态模板 materialize 到工作区。
6. 运行 `sdlc-harness doctor` 或对应 `make validate-harness`，输出升级报告。

### 18.7 包与项目解耦原则
Harness npm 包的设计必须像普通 npm 依赖一样，与用户仓库内容保持边界清晰。包可以提供默认规则和升级能力，但不能假设用户仓库仍是初始化时的模板状态；用户可能已经改过 `AGENTS.md`、`Makefile`、local policies、Skill overrides、模板覆盖、状态数据或业务文档。

因此 `sync` 和 `upgrade` 的核心原则是：
- 包内 canonical source 只是默认输入，不是用户仓库的最终事实源。
- `AGENTS.md`、`Makefile` 等高冲突入口只能通过 managed block、include block 或 create-if-missing 方式接入，不能整文件覆盖。
- 托管文本块 marker 使用 `pjsdlc:sdlc-harness:*` namespace；旧 `sdlc-harness:*` marker 仅用于兼容迁移，避免已接入项目升级时重复插入 block。
- 除 `<harnessRoot>/skills/**` 作为 Harness hard file index 保留在固定位置外，模板、策略、默认 Makefile targets 等工作流配置都必须收敛到 `<harnessRoot>/pjsdlc_managed/**`，不再生成 `<harnessRoot>/templates/**`、`<harnessRoot>/policies/**` 等 legacy mirror。
- `<harnessRoot>/state/**`、`.docs/**`、`src/**`、`tests/**` 和用户业务配置属于项目实例，包升级不得覆盖其具体内容。
- 用户自定义配置必须通过 local overrides、`.local.yaml`、受控 merge 或显式 migration 合并；不能要求用户直接修改包内文件，也不能在升级时丢弃本地差异。
- migration 只能做可解释、可回滚、可诊断的结构变更。遇到 marker 缺失、checksum 漂移、override 冲突或无法判定的本地改动时，应停止并报告 blocker，而不是继续覆盖。
- doctor / validate 应能报告 managed files 缺失、漂移、local override 合并结果和升级风险，让用户知道包更新具体改了什么、保留了什么、阻塞在哪里。

一句话：npm 包负责“提供和升级工作流能力”，用户仓库负责“保存项目事实和本地取舍”；两者通过明确的同步契约连接，而不是通过模板全量重写连接。

### 18.8 本地覆盖规则
项目本地定制不应直接改 managed files。推荐使用：

```txt
<harnessRoot>/overrides/skills/<skill-name>.md
<harnessRoot>/overrides/templates/<template-name>.md
<harnessRoot>/pjsdlc_managed/policies/*.local.yaml
```

`sdlc-harness sync` 负责合并 canonical source 和 local overrides，生成最终工作区文件。这样既保证 Agent 能读到完整规则，也能让包升级时保留项目差异。
