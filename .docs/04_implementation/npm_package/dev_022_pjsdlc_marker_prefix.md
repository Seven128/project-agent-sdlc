# DEV-022 pjsdlc Marker Prefix

## Summary

将 Harness 托管文本块的 preferred marker 迁移到 `pjsdlc:sdlc-harness:*` namespace，并保留旧 `sdlc-harness:*` marker 作为 legacy migration 输入。这样 `AGENTS.md`、根 `Makefile` 等桥接文件能更清楚地区分 Project SDLC Harness 管理内容和用户项目内容。

## Changed Files

| 文件 | 变更 |
|---|---|
| `packages/sdlc-harness/src/lib/managed-file.ts` | 新增 `pjsdlc:sdlc-harness:*` preferred marker，保留 legacy marker 常量。 |
| `packages/sdlc-harness/src/lib/sync-engine.ts` | `mergeManagedBlock` 支持 preferred/legacy marker 检测，完整旧 block 会原位替换为新 block；不完整、重复或新旧 marker 冲突仍 blocker。 |
| `packages/sdlc-harness/src/lib/package-source.ts` | `extract-managed-block` 支持 preferred marker 和 legacy marker。 |
| `tests/sdlc-harness/*.test.mjs` | 更新 init/upgrade 断言，覆盖旧 marker 自动迁移和 broken marker blocker。 |
| `Makefile` | 根 include block marker 改为 `# pjsdlc:sdlc-harness:make:begin/end`。 |
| `README.md`、PRD、技术方案、RFC | 记录 marker namespace、legacy 兼容和 `config.yaml` schema-governed 边界。 |

## Behavior

```txt
new AGENTS.md block:
<!-- pjsdlc:sdlc-harness:begin -->
...
<!-- pjsdlc:sdlc-harness:end -->

new Makefile block:
# pjsdlc:sdlc-harness:make:begin
...
# pjsdlc:sdlc-harness:make:end
```

旧项目中完整的 `sdlc-harness:*` block 会在下一次 `sync` 时被识别并替换为新 marker。若同一文件同时存在新旧 block，或 marker 缺失一端，`sync` 会报告 blocker，避免覆盖用户内容。

`config.yaml` 不使用文本块 marker；它继续通过 YAML schema、known fields、migration 和 local overrides 管理。

## Verification

| Gate | Result |
|---|---|
| `npm test` | PASS，5 个 `tests/sdlc-harness/*.test.mjs` 全部通过。 |
| `node packages/sdlc-harness/dist/cli.js package check-source` | PASS，`package source OK`。 |
| `python3 tools/validate_allowed_paths.py` | PASS，9 个 changed files 均在 DEV-022 allowed_paths 内。 |
| `make validate-harness` | PASS，Harness scaffold、prompt language 和 overview check 全部通过。 |

## Notes

- CLI binary 仍保持 `sdlc-harness`，本次只改变托管文本块 namespace。
- `.agent/skills/**` 和 `.agent/managed/**` 是包拥有目录，不需要逐文件加文本块 marker；marker 只用于与用户文本混合的桥接文件和 metadata comment。
