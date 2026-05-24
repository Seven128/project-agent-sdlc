# DEV-027 Workflow Singleton Collaboration Boundary

## Summary

在 README 中补充 AI SDLC Harness 的协作边界：它集成软件工程全链路，因此在一个项目中应被视为 project-level singleton workflow。多人协作不应并行推进同一项目的全链路 Harness 状态，而应限制在单一阶段产物内，待阶段产物确认后再串联进项目主线。

## Changed Files

| 文件 | 变更 |
|---|---|
| `README.md` | 在核心设计原则中增加“项目级单例”，并新增 `3.4 协作边界：项目级 singleton workflow` 小节。 |
| `.docs/rfc/RFC_013_workflow_singleton_collaboration_boundary.md` | 记录协作边界原则和设计取舍。 |
| `.docs/INDEX.md`、`overview.md` | 链接 RFC 与 implementation doc，并刷新派生视图。 |

## Behavior

- README 明确 Harness 是一个项目的软件工程 singleton workflow。
- README 说明多人跨全链路并行分支会导致需求、方案、任务、实现、测试和发布事实链冲突，合并成本来自设计本身。
- README 推荐多人协作收敛在单一阶段产物内，例如 PRD、技术方案、开发任务或测试矩阵。

## Verification

| Gate | Result |
|---|---|
| `make docs-overview` | PASS，刷新全部 `.docs/<stage>/overview.md`。 |
| `python3 tools/validate_allowed_paths.py` | PASS，6 个 changed files 均在 DEV-027 allowed_paths 内。 |
| `make validate-harness` | PASS，Harness scaffold、prompt language 和 overview check 全部通过。 |
| `git diff --check` | PASS。 |

## Notes

- 本任务只补充设计说明，不新增多人锁、分布式状态合并或协作协议。
