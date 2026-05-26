# Documentation Index

本文件是 AI SDLC Harness 的文档路由表。任何阶段创建、修改、归档或替换文档后，
都要同步更新这里的链接和状态。

## 当前里程碑

- Milestone: `MVP`
- Lifecycle: `.codex/state/lifecycle.yaml`
- Plan: `.codex/state/plan.yaml`

## 产物地图

| 阶段 | 目录 | 用途 | 当前活跃产物 |
|---|---|---|---|
| 原始需求 | `.docs/00_raw/` | 原始输入、会议记录、聊天记录 | [npm 包化分发与同步](00_raw/npm_package_distribution.md) |
| 产品方案 | `.docs/01_product/` | PRD slices、用户故事、acceptance criteria、Out of Scope | [npm 包化分发与同步 PRD](01_product/npm_package_distribution.md) |
| 架构设计 | `.docs/02_architecture/` | 架构边界、领域模型、高层设计 | [Harness npm 包化分发架构](02_architecture/harness_package_distribution.md) |
| 技术方案 | `.docs/03_tech_plan/` | API contracts、数据结构、实现计划 | [Harness npm 包化分发技术方案](03_tech_plan/harness_package_distribution.md) |
| 实现文档 | `.docs/04_implementation/` | 记录模块、子系统和核心数据流的真实实现事实 | [CLI distribution and lifecycle](04_implementation/harness_package/cli_distribution_and_lifecycle.md), [Source sync and package assets](04_implementation/harness_package/source_sync_and_assets.md), [Release automation](04_implementation/harness_package/release_automation.md), [Command intent model](04_implementation/harness_workflow/command_intent_model.md), [Implementation doc model](04_implementation/harness_workflow/implementation_doc_model.md), [State and task protocol](04_implementation/harness_workflow/state_and_task_protocol.md), [Skills prompt and authoring](04_implementation/harness_workflow/skills_prompt_and_authoring.md), [Docs overview and validation](04_implementation/harness_workflow/docs_overview_and_validation.md) |
| 架构决策 | `.docs/05_decisions/` | ADR 和长期技术决策 | 暂无 |
| Review | `.docs/06_review/` | Review reports、风险、重构建议 | [MVP release candidate review](06_review/REVIEW_REPORT.md) |
| 测试 | `.docs/07_test/` | Test plan、test matrix、回归记录 | [MVP package release test plan](07_test/TEST_PLAN.md) |
| 发布 | `.docs/08_release/` | Release note、smoke results、rollback plan | [v0.1.0 npm release](08_release/v0.1.0_npm_release.md), [v0.1.1 npm release](08_release/v0.1.1_npm_release.md), [v0.1.2 npm release](08_release/v0.1.2_npm_release.md), [v0.1.3 npm release](08_release/v0.1.3_npm_release.md), [v0.1.4 npm release](08_release/v0.1.4_npm_release.md), [v0.1.5 npm release](08_release/v0.1.5_npm_release.md) |
| RFC | `.docs/rfc/` | 需求变更和影响补丁 | [RFC_001 统一 .harness 工作流根目录](rfc/RFC_001_unify_harness_directory_model.md), [RFC_002 可配置 Harness 根目录](rfc/RFC_002_configurable_harness_root.md), [RFC_003 init 询问 Harness 根目录并默认使用 .agent](rfc/RFC_003_init_prompt_and_default_agent_root.md), [RFC_004 简化 task/checkpoint/archive 模型](rfc/RFC_004_simplify_task_checkpoint_archive_model.md), [RFC_005 合并 checkpoint 到 plan.yaml](rfc/RFC_005_merge_checkpoint_into_plan.md), [RFC_006 发布前重命名 npm package](rfc/RFC_006_rename_npm_package.md), [RFC_007 收敛工作流配置到 managed 目录](rfc/RFC_007_consolidate_managed_config.md), [RFC_008 pjsdlc marker 前缀](rfc/RFC_008_prefix_managed_block_markers.md), [RFC_009 pjsdlc layout 和 Skill 前缀](rfc/RFC_009_namespace_managed_layout_and_skills.md), [RFC_010 从 git history 恢复 done task 合同](rfc/RFC_010_recover_done_task_contract_from_git.md), [RFC_011 plan 和 gate log 短期化](rfc/RFC_011_short_lived_plan_and_gate_log.md), [RFC_012 移除 active state 执行历史](rfc/RFC_012_remove_execution_history_from_active_state.md), [RFC_013 项目级 singleton workflow 协作边界](rfc/RFC_013_workflow_singleton_collaboration_boundary.md), [RFC_014 移除 gate results state 并补强 RFC 影响面](rfc/RFC_014_remove_gate_results_state_and_strengthen_rfc_impact.md), [RFC_015 可选 Parallel Execution Contract](rfc/RFC_015_optional_parallel_execution_contract.md) |
## 维护规则

- 每个新增产物都要从本索引链接。
- 过时产物标记为 superseded，不直接删除。
- task/release 的历史动作记录以 git commit、tag 或外部 release 系统为准，不再维护 `<harnessRoot>/archive/` 常规归档。
- implementation docs 必须对齐真实代码，而不只是原始技术方案。
