# RFC_013 Workflow Singleton Collaboration Boundary

## Summary

AI SDLC Harness 集成了软件工程的全链路阶段，因此它在一个项目中应被视为项目级 singleton workflow。它适合让一个 Agent/一个主执行者维护当前项目的连续阶段状态，不适合作为多人同时并行推进同一项目全链路变更的协作层。

## Motivation

Harness 把 PRD、架构、技术方案、开发计划、实现、Review、测试、发布和 RFC 串成同一套事实链。这个设计让单一项目状态更连续，但也意味着并行分支的合并成本会变高。

如果多个人从某个时间点分支，同时修改跨阶段事实源，那么每个人都可能改变需求、方案、任务、实现、测试和状态。合并时不是普通代码冲突，而是整条软件工程事实链的冲突，基本无法通过简单 merge 可靠解决。

## Decision

1. README 明确声明：AI SDLC Harness 是项目级 singleton workflow。
2. 不推荐多人同时并行推进同一个项目的全链路 Harness 状态。
3. 多人协作应回到传统协作边界：限制在单个阶段内，例如产品方案、技术方案、开发、Review、测试或发布。
4. 单阶段内可以多人协作，但产物合并范围应限制在该阶段事实源内。
5. 各阶段产物连接起来后，才形成项目级 singleton workflow 的连续事实链。

## Out Of Scope

- 不新增多人锁、分布式状态合并或 CRDT 机制。
- 不改变当前 git/task commit 协议。
- 不禁止团队使用 Harness，只限定 Harness active state 的协作模型。

## Acceptance Criteria

- README 增加项目级 singleton workflow 与协作边界说明。
- 文案区分“多人协作不可跨全链路并行”和“多人可在单阶段内协作”。
- 文案解释跨阶段并行分支合并成本来自设计本身，而不是工具实现缺陷。
