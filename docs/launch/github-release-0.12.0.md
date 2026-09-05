# 0.12.0 — durable facts and a short development contract

Update mode: **upgrade-required**. Configuration moves from schema 4 to schema 5. This is a breaking release; ordinary sync does not perform migration.

Tiny Context now retains project facts, optional sparse Areas/workspaces, a short automatically installed development contract, Context discovery and safe maintenance. New plain initialization creates only AGENTS.md, harness config, global.md and context.toml. Architecture and Areas are optional. Default body paths can be queried with `context list --default`; direct offline reading remains supported.

Long-Task, DSA/DRA, role workflows, design proof/compiler/observer machinery, route ranking and source-line gates are retired. Old commands fail explicitly. Structural validation checks registered paths and declared local dependencies; it does not require headings, reject TODOs or certify factual/product correctness.

## Upgrade

Use `ty-context upgrade --check`, then stop relevant old host sessions and use `ty-context upgrade --sessions-stopped`. Start a fresh session afterward. Automatic retirement supports the pinned 0.11.0/schema-4 baseline and preserves its exact normalized default body set, including legacy child traversal.

Settle pending old Context journals with the compatible **0.11.0** recovery tool before upgrading. If an old binding conflicts, use its legitimate end/abandon path; do not delete locks or require the old Final Gate. Unreadable journals block migration.

Modified managed guidance and known live compiler-dependent sources need explicit reconciliation. Extract unique requirements, adopted decisions and locations with provenance; do not regenerate lost decisions. Historical records remain unchanged. Inspection is bounded to documented current references and build entries, not every historical format or indirect command.

Backups and resumable upgrade state live under tmp/ty-context. Cleanup preserves mixed user configuration and unrelated worktree records. Source-pack export preserves unowned files and rejects edited generated output.

Schema guards cannot retroactively fix old binaries: old bare init can reselect a root and reinstall old assets; some old commands partly write configuration before rejecting the version. Avoid old writers after upgrade; new writes reject mixed/unsupported installations.

## Verification and publication

Run `npm test`, source parity and structural checks, then `npm run release:prepare` to test the exact tarball in clean new and old-version consumers. Preparation does not publish. The manual publication workflow runs Windows/Ubuntu verification before publishing its tested archive.

Fewer instructions and files do not establish a measured speedup or model compliance. See the [current README](../../README.md) and [migration details](../../packages/ty-context/migrations/README.md) for supported behavior and limits.
