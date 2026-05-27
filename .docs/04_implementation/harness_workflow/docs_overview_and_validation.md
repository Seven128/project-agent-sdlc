# Documentation Overview and Validation Implementation

## 1. 关联信息

- Domain: `harness_workflow`
- Module / subsystem / core flow: docs overview generation, documentation indexing and validation
- Updated by task: `DEV-005`, `DEV-015`, `DEV-025`, `DEV-030`, `DEV-032`, `DEV-043`, `TASK-060`
- Linked PRD: `.docs/01_product/npm_package_distribution.md`
- Linked technical design: `.docs/03_tech_plan/harness_package_distribution.md`
- Linked RFC: none
- Linked commits: historical `DEV-*` implementation commits; `DEV-043` migration commit

## 2. 当前实现范围

- `.docs/INDEX.md` is the durable documentation routing table.
- `.docs/<stage>/overview.md` files are generated artifacts and are not hand edited.
- `make docs-overview` regenerates all stage overviews from Markdown slices.
- `make validate-doc-overviews` and `make validate-harness` check that generated overviews are current.
- `make validate-design` excludes generated `overview.md` and `README.md` from design deliverables, validates `plan.draft.yaml` task shape, requires development draft tasks to link existing tech plan slices through `docs.tech_plan`, rejects one shared primary tech plan for multiple development drafts, and requires dedicated architecture slices for explicit cross-cutting themes.
- `tools/validate_task_docs.py` requires every implementation doc slice to be linked from `.docs/INDEX.md`.
- Root README is a user guide; `PROJECT_SPEC.md` carries the heavier product/specification narrative.

## 3. 真实代码结构

| 文件（File） | 作用（Purpose） | 关键函数/对象（Key Functions/Objects） |
|---|---|---|
| `.docs/INDEX.md` | Global documentation router | stage map, active artifacts |
| `tools/build_doc_overviews.py` | Generated overview builder/checker | source hash, stage scan, Markdown rendering |
| `tools/harness_utils.py` | Shared local validator utilities | `markdown_deliverables` excludes generated/non-deliverable docs |
| `tools/validate_design.py` | Local ARCHITECTING gate | design deliverables, `plan.draft.yaml`, tech plan slice refs, cross-cutting architecture slices |
| `tools/validate_task_docs.py` | Implementation-doc index validator | implementation doc link check |
| `tools/validate_harness.py` | Harness scaffold validator | structure checks |
| `packages/sdlc-harness/src/lib/validators.ts` | Package CLI validators | `validate-design`, Markdown deliverable filtering, design draft slice checks |
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
ARCHITECTING exit or design regression check
-> tools/validate_design.py / package validate-design scan non-generated architecture and tech plan slices
-> plan.draft.yaml development tasks must reference existing docs.tech_plan slices
-> multiple draft tasks must have distinct primary tech plan slices
-> explicit cross-cutting themes require dedicated architecture slices
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
- Design validation now treats generated `overview.md` and `README.md` as non-deliverables, so visual rollups cannot satisfy architecture or tech plan slice requirements.
- `plan.draft.yaml` is part of the design gate because task granularity must line up with tech plan fact granularity before SPRINTING starts.
- Cross-cutting architecture validation uses conservative trigger phrases from PRD, tech plan and draft task text, then requires different architecture docs for different triggered categories.
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
| `make validate-design` | Design deliverable filtering, draft task tech plan refs and architecture slice checks | PASS for TASK-060 |
| `npm test --workspace agent-project-sdlc` | Package validator regression, including design slice hard-gate cases | PASS for TASK-060; 9 tests passed |
| `python3 tools/validate_task_docs.py` | Implementation docs are linked from `.docs/INDEX.md` | Covered by validate-dev and manual checks |

## 8. 变更记录（Change Log）

| 日期（Date） | Task ID | Commit | 摘要（Summary） |
|---|---|---|---|
| 2026-05-25 | `DEV-015` | Historical implementation commit | Added deterministic Markdown overview generation. |
| 2026-05-25 | `DEV-025` | Historical implementation commit | Tightened implementation doc indexing in validation. |
| 2026-05-25 | `DEV-030` | Historical implementation commit | Split lightweight README from full product/specification content. |
| 2026-05-25 | `DEV-032` | Historical implementation commit | Defined implementation docs as module/subsystem/core-flow facts. |
| 2026-05-26 | `DEV-043` | DEV-043 implementation commit | Removed task-grain implementation docs from the active implementation-doc graph. |
| 2026-05-28 | `TASK-060` | Working tree | Strengthened `validate-design` so generated overviews do not count as deliverables, draft development tasks must link tech plan slices, shared monolithic primary tech plans fail for multiple draft tasks, and explicit cross-cutting themes require dedicated architecture slices. |

## 9. 后续维护注意事项

- Never edit `overview.md` directly; regenerate it.
- When a doc slice is moved or renamed, update `.docs/INDEX.md` in the same task.
