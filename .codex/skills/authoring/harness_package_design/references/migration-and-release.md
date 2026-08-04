# Migration And Release

Use this reference for sync/upgrade/init/doctor migrations, retired compatibility assets, release metadata/automation, package publishing or release-branch convergence.

## Sync and upgrade

- Normal `sync` is the fast managed-refresh path. It may perform only direct write-safety guards such as schema compatibility, managed-block integrity and deprecated override detection; it must not run the full migration registry.
- `upgrade` owns versioned, deterministic, mechanical, safely recoverable migrations and then sync. Schema v4 may create a missing `project_context/context.toml` and mechanically move legacy `project_context/modules/**/*.md` to `areas/**/*.md`; it must not reinterpret or rewrite user Context prose.
- Semantic ambiguity, user intent and modified same-name content become `manual_required` diagnostics, never ordinary-sync heuristics.
- Legacy compatibility code stays isolated in a named migration/helper and shrinks with its window. Ordinary sync carries no tombstone registry or blind deleted-name cleanup.
- For deletion, validate exact package ownership/content and destination type without following symlinks. Preserve modified/user-owned collisions and expose the recovery path.
- Exercise default behavior, dry run where supported, idempotence, partial failure and retry/recovery. A failed publication must not leave a misleading managed result.

## Release impact

Release update mode is metadata about required consumer action:

- `sync-only` only when no migration is needed;
- `upgrade-required` when safe migrations are included;
- `manual-required` only for genuine user judgment/manual action.

Keep stable design in `PROJECT_SPEC.md`; release-specific instructions/evidence belong in release notes, READMEs and the owning scripts/tests. Public release copy is English-complete. Before publish, prove source parity, packed contents, clean-room consumer behavior, CLI entrypoints and relevant init/sync/upgrade/doctor behavior from the actual tarball.

Do not revive legacy stages as release fixtures or claim old benchmark results for the current product.

## Git convergence

Repository policy normally develops directly on `main`; temporary branches/worktrees are user/Goal choices, not Harness capability. Do not create them automatically. If explicitly used, preserve meaningful commits, keep the final candidate in synchronized `main` ancestry and validate that candidate.

After `git fetch --prune`, use `git merge-base --is-ancestor` and exact upstream/tip checks before any cleanup. Delete only task-owned branches/worktrees proven merged/equal and clean. Stop on ahead/diverged/upstream mismatch or dirty state; never use force deletion to hide unconverged work. A pushed-history rewrite, when explicitly authorized, uses `--force-with-lease`, never unprotected force.
