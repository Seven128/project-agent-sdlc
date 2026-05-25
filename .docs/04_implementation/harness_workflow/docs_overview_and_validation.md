# Documentation Overview and Validation Implementation

## 1. 关联信息

- Domain: `harness_workflow`
- Module / subsystem / core flow: docs overview generation, documentation indexing and validation
- Updated by task: `DEV-005`, `DEV-015`, `DEV-025`, `DEV-030`, `DEV-032`, `DEV-043`
- Linked PRD: `.docs/01_product/npm_package_distribution.md`
- Linked technical design: `.docs/03_tech_plan/harness_package_distribution.md`
- Linked RFC: none
- Linked commits: historical `DEV-*` implementation commits; `DEV-043` migration commit

## 2. 当前实现范围

- `.docs/INDEX.md` is the durable documentation routing table.
- `.docs/<stage>/overview.md` files are generated artifacts and are not hand edited.
- `make docs-overview` regenerates all stage overviews from Markdown slices.
- `make validate-doc-overviews` and `make validate-harness` check that generated overviews are current.
- `tools/validate_task_docs.py` requires every implementation doc slice to be linked from `.docs/INDEX.md`.
- Root README is a user guide; `PROJECT_SPEC.md` carries the heavier product/specification narrative.

## 3. 真实代码结构

| 文件（File） | 作用（Purpose） | 关键函数/对象（Key Functions/Objects） |
|---|---|---|
| `.docs/INDEX.md` | Global documentation router | stage map, active artifacts |
| `tools/build_doc_overviews.py` | Generated overview builder/checker | source hash, stage scan, Markdown rendering |
| `tools/validate_task_docs.py` | Implementation-doc index validator | implementation doc link check |
| `tools/validate_harness.py` | Harness scaffold validator | structure checks |
| `Makefile` | Validation command entrypoint | `docs-overview`, `validate-doc-overviews`, `validate-harness` |
| `README.md` | User-facing package guide | install/init/sync/upgrade/commands |
| `PROJECT_SPEC.md` | Maintainer-facing product/specification doc | architecture, workflow and package background |

## 4. 核心数据流

```txt
Markdown slice changes
-> update .docs/INDEX.md if routing changed
-> make docs-overview
-> generated overview.md files include source hash and slice content
-> make validate-doc-overviews / make validate-harness confirms freshness
```

```txt
Implementation doc slice exists
-> tools/validate_task_docs.py scans .docs/04_implementation/**/*.md
-> each slice must be linked from .docs/INDEX.md
-> missing links fail validate-dev / relevant gates
```

## 5. 关键实现逻辑

- Overview files are deterministic and include every non-overview Markdown slice under their stage directory.
- Generated overviews are for browsing and handoff; Markdown slices and `.docs/INDEX.md` remain the source of truth.
- Implementation docs are validated as module/subsystem/core-flow slices, not task ledgers.
- DEV-043 removes the legacy `npm_package/dev_*.md` docs from the active docs graph and replaces them with module-level slices.

## 6. 与技术方案的偏移

- Early documentation used task-grain implementation docs. The current model uses module-level implementation docs and treats git history as the task action record.
- `README.md` was split from the full product specification so npm package users see a lightweight guide first.

## 7. 测试覆盖（Test Coverage）

| 测试（Test） | 覆盖范围（Coverage） | 最近记录结果（Result） |
|---|---|---|
| `make docs-overview` | Regenerate all `.docs/<stage>/overview.md` files | PASS for DEV-043 |
| `make validate-doc-overviews` | Check generated overview freshness | PASS for DEV-043 |
| `make validate-harness` | Harness scaffold, prompt language and overview checks | PASS for DEV-043 |
| `python3 tools/validate_task_docs.py` | Implementation docs are linked from `.docs/INDEX.md` | Covered by validate-dev and manual checks |

## 8. 变更记录（Change Log）

| 日期（Date） | Task ID | Commit | 摘要（Summary） |
|---|---|---|---|
| 2026-05-25 | `DEV-015` | Historical implementation commit | Added deterministic Markdown overview generation. |
| 2026-05-25 | `DEV-025` | Historical implementation commit | Tightened implementation doc indexing in validation. |
| 2026-05-25 | `DEV-030` | Historical implementation commit | Split lightweight README from full product/specification content. |
| 2026-05-25 | `DEV-032` | Historical implementation commit | Defined implementation docs as module/subsystem/core-flow facts. |
| 2026-05-26 | `DEV-043` | DEV-043 implementation commit | Removed task-grain implementation docs from the active implementation-doc graph. |

## 9. 后续维护注意事项

- Never edit `overview.md` directly; regenerate it.
- When a doc slice is moved or renamed, update `.docs/INDEX.md` in the same task.
