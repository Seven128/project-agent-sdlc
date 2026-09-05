# Schema-5 retirement (0.12.0)

Update mode: **upgrade-required**. Automatic migration is limited to schema 4 at the package 0.11.0 baseline, commit `8cf2391295cbec271f148dc44f074bedeea767b5`. It retires workflow software; it does not certify that every project rule or historical resource has been converted.

1. Inspect with `ty-context upgrade --check`. Stop relevant old host sessions before `ty-context upgrade --sessions-stopped`. A file lock cannot prove a host session has stopped.
2. Settle any old Context transaction before changing schema/manifest semantics or removing the old engine. Use the installed compatible 0.11.0 tool, never `@latest`. Complete or roll back; if an old binding conflicts, legitimately end/abandon it first. No Final Gate or lock deletion is required. Unreadable journals block with a diagnostic.
3. Reconcile modified old Skills, worker profiles or Hooks, custom managed entries and active build dependencies. Exact old file hashes identify removable package assets. Mixed Hook entries and exact Makefile includes are edited locally, keeping user portions. Other worktree records and configuration keys are outside the migration scope.
4. Migration saves original bytes and planned replacements under `tmp/ty-context/upgrade-backups/<id>.json`, then writes `tmp/ty-context/upgrade-schema-5.json`. It publishes assets/manifest/configuration before the startup entry, checks current files and defaults, and retires only the target worktree binding. Normal writes refuse pending publication. These files are outside automatic Skill/default Context loading.
5. An interrupted migration resumes through the same explicit command. Do not remove a pending journal, overwrite a conflict, or edit its planned file contents. Original and pending plans must agree. Preserve the backup while resolving reported file conflicts. Filesystem replacement is not atomic across the whole installation.
6. Start a new host session after successful migration. Already-loaded instructions do not disappear when their file is removed.

## Default-body compatibility

The exact normalized body path set is compared under old and new selection semantics. The migration adds the formerly implicit architecture file to nonrecursive `default_files`; it does not promote that node into a `default_children` traversal root. Explicit default-node traversal, legacy policies and referenced `never-default` children keep their prior behavior. Manifest routing metadata is separate from default body text. Any addition/removal is a blocking concrete path diff. Later user-authorized Context pruning is a separate change.

## Retained resources and review scope

Historical Contracts, Receipts and ordinary project files remain unchanged and are not executed or universally converted. Ordinary Markdown and direct JSON/YAML fields remain readable with their explicit local paths. No arbitrary structured-ID/cross-file adapter is provided. The migration does not expand compact forms, evaluate symbolic resources or restore old compiler/observer semantics.

The bounded review reads current Context/DESIGN and root AGENTS overrides, follows explicitly declared `ty-context-controlling-source` local dependencies, and reports ordinary local Markdown links for review. It inspects root and manifest-Area `package.json` scripts and retained Makefile recipes for literal retired CLI calls. Named symbolic handoff/IR inputs required by controlling declarations block until necessary unique requirements, adopted decisions and locators are extracted or replaced with provenance. Ordinary historical links are advisory, not existence blockers. Inspection of an individual resource over 2 MB is explicitly unresolved rather than silently partial.

Current task references, selected resources, compact IDs, arbitrary CI/shell indirection and other build systems require specific review by the upgrading agent/user. For a known dependency, report the file, reference and unavailable content; do not claim information migration complete until it is addressed. Do not regenerate design or infer requirements to replace original decisions. No network checks, resource generation, historical-proof repair or second compiler is introduced.

## Journal and old-binary compatibility

Current Context mutations use `context-mutation-journal-v3`; the retained recovery parser also understands `context-mutation-journal-v2`. Unrecognized pre-v2 journals require manual recovery using a matching version. This format compatibility does not authorize a schema-5 writer to recover an unfinished schema-4 installation: settle that transaction with its compatible old tool first.

New sync/init/mutation/export writes reject old, malformed or unfinished schema configuration. Old command tombstones return failure. New binaries cannot retroactively fix old binaries: baseline old `enable` may write a profile before reaching its schema guard. Schema-5 configurations containing retired profiles/modularity are rejected rather than interpreted as runnable old capabilities. Baseline bare init can reselect .codex before checking the formerly selected .agent schema, successfully reinstalling old startup assets. Fixed-root init and sync reject schema 5, but that does not protect root reselection. New writes reject the resulting schema-4 installation and do not treat it as current. This limitation is tested with the actual old binary; no daemon or retrospective guarantee is claimed. Do not mix package versions after retirement.

## Verification boundary

Tests exercise real baseline init, interrupted move plus compatible complete/rollback, exact default sets, interrupted upgrade resume, tampered plans, mixed user configuration, modified/additional Skill files, current resource/build dependencies and worktree-key isolation. Product behavior and nonmanaged project-rule correctness remain outside structural validation. Platform and tarball results must be reported from actual runs, not inferred from these notes.
