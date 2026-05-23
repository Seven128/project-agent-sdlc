# DEV-010 Task Checkpoint Model Implementation Doc

## 1. 关联信息

- Task ID: DEV-010
- Linked PRD: `.docs/01_product/npm_package_distribution.md`
- Linked technical design: `.docs/03_tech_plan/harness_package_distribution.md`
- Linked RFC: `.docs/rfc/RFC_004_simplify_task_checkpoint_archive_model.md`
- Linked commit: DEV-010 git commit

## 2. 本次实现范围

- 新增（Added）:
  - `Task Contract` checkpoint 模板区块，用于声明 `allowed_paths`、`required_gates` 和验收标准。
  - RFC_004、PRD-NPM-017 和 DEV-010 技术方案记录。
  - Node validator 覆盖 open task checkpoint contract。
- 修改（Changed）:
  - `tasks.yaml` 和 `tasks.draft.yaml` 改为轻量 task 索引，不再保存完整路径和 gate 合同。
  - Python validators 从活跃 checkpoint 读取路径合同，并要求 open task 有 checkpoint、done task 不保留 checkpoint。
  - 阶段 Skill、模板、policy、README 和 AGENTS 协议改用活跃 checkpoint 语义。
  - `.docs/INDEX.md` 修正 `.agent` state 路由和 implementation doc 相对链接。
- 未覆盖（Not covered）:
  - 未新增自动 git commit/tag 创建逻辑；task 历史动作记录由用户或外部 SCM 流程执行。

## 3. 真实代码结构

| 文件（File） | 作用（Purpose） | 关键函数/对象（Key Functions/Objects） |
|---|---|---|
| `tools/harness_utils.py` | 提供轻量 task schema 和 checkpoint contract 解析工具 | `validate_task_shape`, `extract_task_contract`, `expand_harness_root` |
| `tools/validate_checkpoint.py` | 校验 open task checkpoint 和 done task checkpoint 清理 | `validate_checkpoint_file`, `main` |
| `tools/validate_allowed_paths.py` | 从当前 checkpoint 读取 `allowed_paths` 校验工作树改动 | `main` |
| `packages/sdlc-harness/src/lib/validators.ts` | 对齐 npm 包 Node validators 的 checkpoint 语义 | `validateCheckpoint`, `taskContract`, `validateDev` |
| `.agent/managed/templates/CHECKPOINT_TEMPLATE.md` | 生成 active checkpoint 的合同模板 | `Task Contract` |
| `.agent/state/tasks.yaml` | 当前 sprint 的轻量 task 索引 | `tasks[]`, `current_task_id` |

## 4. 核心数据流

```txt
current_task_id
-> tasks.yaml 找到 open task checkpoint
-> checkpoint Task Contract 解析 allowed_paths / required_gates
-> validate_allowed_paths 检查 git changed files
-> task gates 通过
-> implementation doc 写入
-> task 标记 done 并删除 checkpoint
```

## 5. 关键实现逻辑

- 输入校验（Input validation）:
  - `validate_task_shape` 只要求 `id`、`title`、`status`、`summary`、`implementation_doc`。
  - open task 必须有 `checkpoint`；closed task 不允许保留 `checkpoint`。
- 核心分支（Core branches）:
  - 有 open task 时，`validate_allowed_paths.py` 读取当前 checkpoint `Task Contract`。
  - 无 open task 时，路径合同校验跳过，因为没有活跃执行合同。
  - `validate_checkpoint.py` 校验 open task checkpoint 文件存在、包含必需章节和 contract 字段。
- 异常处理（Error handling）:
  - checkpoint 缺失、contract 缺失、`allowed_paths` 或 `required_gates` 为空都会 gate failure。
  - done task 仍保留 checkpoint 字段会 gate failure。
- 边界兜底（Boundary fallback）:
  - `latest.md` 不再强制存在；如果存在，则必须引用当前 task，防止旧恢复入口误导 Agent。
- 性能或并发注意事项（Performance or concurrency notes）:
  - validator 只解析当前 checkpoint，避免每次读取历史 task 的大段执行信息。

## 6. 与技术方案的偏移

- task state 不保存 `commit` 字段，避免重复 git 历史和在同一提交中记录自身 hash 的循环。
- `.agent/templates/**` 作为旧本地模板副本同步更新，但 package source 仍以 `.agent/managed/**` 为准。

## 7. 测试覆盖（Test Coverage）

| 测试（Test） | 覆盖范围（Coverage） | 结果（Result） |
|---|---|---|
| `npm test` | TypeScript build、init/sync/upgrade/package source/validators tests | PASS |
| `node packages/sdlc-harness/dist/cli.js package check-source` | 本地 Harness source 与 package assets 无漂移 | PASS |
| `node packages/sdlc-harness/dist/cli.js validate-harness` | Node harness validator | PASS |
| `python3 tools/validate_checkpoint.py` | open task checkpoint contract | PASS |
| `python3 tools/validate_allowed_paths.py` | active checkpoint allowed paths | PASS |
| `make validate-harness` | 本地 harness、prompt language、checkpoint、overview gates | PASS |

## 8. 后续维护注意事项

- 新 task 创建时先写轻量 `tasks.yaml` 记录和对应 checkpoint；done 后删除 checkpoint。
- 如后续要自动强制 task commit，可在 SCM 层实现，不应把 commit 历史重复写入 archive。
