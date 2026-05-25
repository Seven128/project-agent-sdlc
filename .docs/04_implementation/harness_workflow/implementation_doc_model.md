# Implementation Doc Model

## 1. 关联信息

- Domain: `harness_workflow`
- Module / subsystem / core flow: implementation documentation model
- Updated by task: `DEV-032`
- Linked PRD: `.docs/01_product/npm_package_distribution.md` (`PRD-NPM-025`)
- Linked technical design: `.docs/03_tech_plan/harness_package_distribution.md`
- Linked RFC: none
- Linked commit: `DEV-032` implementation commit

## 2. 当前实现范围

- 新增（Added）:
  - implementation doc 默认按模块、子系统或核心数据流切片的协议。
  - implementation doc template 中的 provenance 和 Change Log 字段。
  - 技术方案中的 implementation doc model 说明。
- 修改（Changed）:
  - `pjsdlc_implementation_doc` 不再默认按 task 生成 `dev_*.md`。
  - `pjsdlc_dev_sprint` 将 task 定义为执行和提交边界，将 implementation doc 定义为长期事实边界。
  - `pjsdlc_architect_design` 和 plan/tech templates 引导 future task 指向模块级 implementation doc。
  - AGENTS、PROJECT_SPEC、PRD 和 tech plan 使用同一套语义。
- 未覆盖（Not covered）:
  - 未批量迁移历史 `.docs/04_implementation/npm_package/dev_*.md` 文件；它们作为 legacy task log 保留，后续可单独合并。

## 3. 真实代码结构

| 文件（File） | 作用（Purpose） | 关键函数/对象（Key Functions/Objects） |
|---|---|---|
| `AGENTS.md` | 项目级 workflow 入口规则 | Plan Protocol、工作规则 |
| `.agent/skills/pjsdlc_implementation_doc/SKILL.md` | implementation doc 生成/更新规则 | 语义切片、输出路径、完成检查 |
| `.agent/skills/pjsdlc_dev_sprint/SKILL.md` | Sprint 执行规则 | task 执行边界、completion protocol |
| `.agent/skills/pjsdlc_architect_design/SKILL.md` | 架构阶段任务规划规则 | task `implementation_doc` 指向长期实现事实文档 |
| `.agent/skills/pjsdlc_manager/SKILL.md` | 自然语言 workflow 路由规则 | 完成后的产物事实说明 |
| `.agent/pjsdlc_managed/templates/IMPLEMENTATION_DOC_TEMPLATE.md` | 新 implementation doc 模板 | module/subsystem/core flow、provenance、Change Log |
| `.agent/pjsdlc_managed/templates/PLAN_TEMPLATE.yaml` | open task 模板 | `implementation_doc` 示例路径 |
| `.agent/pjsdlc_managed/templates/TECH_DESIGN_TEMPLATE.md` | 技术方案模板 | task breakdown 中 implementation doc 的模块级说明 |
| `packages/sdlc-harness/assets/**` | npm 包 canonical assets | 由 `package sync-source` 从 `.agent/**` 和 `AGENTS.md` 同步 |
| `.docs/01_product/npm_package_distribution.md` | 产品约束 | `PRD-NPM-025` |
| `.docs/03_tech_plan/harness_package_distribution.md` | 技术方案约束 | implementation doc model |

## 4. 核心数据流

```txt
Architecting
-> plan.draft.yaml task includes implementation_doc path
-> SPRINTING executes task as bounded work unit
-> gates pass
-> implementation_doc updates module/subsystem/core-flow fact slice
-> task id + commit recorded as provenance
-> task removed from plan.yaml
```

## 5. 关键实现逻辑

- 输入校验（Input validation）: open task 仍必须包含 `implementation_doc`，但该字段现在指向长期实现事实文档，而不是默认 `dev_*.md` task ledger。
- 核心分支（Core branches）: 修改已有模块时更新已有 implementation doc；新增稳定模块或核心数据流时创建新文档；一个 task 可更新多份相关文档。
- 异常处理（Error handling）: 若真实代码边界与 architecture / tech plan 不一致，implementation doc 必须记录 deviation，并更新 `.docs/INDEX.md`。
- 边界兜底（Boundary fallback）: 只有当 task 本身就是稳定模块/数据流边界时，implementation doc 才可以与单个 task 一一对应。
- 性能或并发注意事项（Performance or concurrency notes）: 不适用；该改动只调整 workflow 文档模型和分发资产。

## 6. 与技术方案的偏移

- 早期技术方案和历史 task breakdown 中的 implementation doc 路径以 `dev_*.md` 为主；DEV-032 将其定义为 legacy task log，不再作为未来默认。
- 未进行历史合并迁移，避免把协议修正扩大成大规模文档重组。

## 7. 测试覆盖（Test Coverage）

| 测试（Test） | 覆盖范围（Coverage） | 结果（Result） |
|---|---|---|
| `node packages/sdlc-harness/dist/cli.js package check-source` | package canonical assets 与 source workspace 一致 | PASS |
| `make validate-harness` | Harness scaffold、skill language、doc overview、implementation doc index | PASS |
| `python3 tools/validate_allowed_paths.py` | DEV-032 修改范围符合 allowed_paths | PASS |
| `git diff --check` | Markdown/YAML trailing whitespace 和 patch 格式 | PASS |

## 8. 变更记录（Change Log）

| 日期（Date） | Task ID | Commit | 摘要（Summary） |
|---|---|---|---|
| 2026-05-25 | `DEV-032` | `DEV-032` implementation commit | 将 implementation doc 默认粒度从 task 调整为模块、子系统或核心数据流。 |

## 9. 后续维护注意事项

- 后续新 task 应优先更新相关模块级 implementation doc；不要默认新增 `dev_*.md`。
- 如果历史 `dev_*.md` 影响检索质量，可以单独创建迁移任务，按 npm package 子系统逐步合并。
