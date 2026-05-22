# Documentation Index

本文件是 AI SDLC Harness 的文档路由表。任何阶段创建、修改、归档或替换文档后，
都要同步更新这里的链接和状态。

## 当前里程碑

- Milestone: `MVP`
- Lifecycle: `.harness/state/lifecycle.yaml`
- Tasks: `.harness/state/tasks.yaml`

## 产物地图

| 阶段 | 目录 | 用途 | 当前活跃产物 |
|---|---|---|---|
| 原始需求 | `.docs/00_raw/` | 原始输入、会议记录、聊天记录 | 暂无 |
| 产品方案 | `.docs/01_product/` | PRD slices、用户故事、acceptance criteria、Out of Scope | 暂无 |
| 架构设计 | `.docs/02_architecture/` | 架构边界、领域模型、高层设计 | 暂无 |
| 技术方案 | `.docs/03_tech_plan/` | API contracts、数据结构、实现计划 | 暂无 |
| 实现文档 | `.docs/04_implementation/` | 任务完成后记录真实实现事实 | 暂无 |
| 架构决策 | `.docs/05_decisions/` | ADR 和长期技术决策 | 暂无 |
| Review | `.docs/06_review/` | Review reports、风险、重构建议 | 暂无 |
| 测试 | `.docs/07_test/` | Test plan、test matrix、回归记录 | 暂无 |
| 发布 | `.docs/08_release/` | Release note、smoke results、rollback plan | 暂无 |
| RFC | `.docs/rfc/` | 需求变更和影响补丁 | 暂无 |

## 维护规则

- 每个新增产物都要从本索引链接。
- 过时产物标记为 superseded，不直接删除。
- 历史里程碑产物移动到 `.harness/archive/`。
- implementation docs 必须对齐真实代码，而不只是原始技术方案。
