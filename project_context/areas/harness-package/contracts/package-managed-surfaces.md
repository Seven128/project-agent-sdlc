# Installation and migration ownership

Canonical startup text and Context rules live under .codex/ty-context-managed. packages/ty-context/source-mappings.yaml derives the two runtime assets and package README. Repository authoring instructions are not shipped. A clean build removes stale dist before TypeScript compilation.

New init installs startup instructions, config, global.md and context.toml only. Ordinary sync manages only the AGENTS block. User prose and files are preserved. Optional custom harness root configuration is explicit; init cannot switch existing installations between roots.

Schema-4 retirement is explicit and limited to the pinned 0.11.0 baseline. The retirement modules own early old-journal checks, exact old-asset hashes, mixed configuration edits, exact default-body equality, original backup, pending CAS publication/resume and current-worktree binding removal. Backups remain outside automatic Skill/default Context discovery. Stop old host sessions explicitly; locks establish only operation exclusion.

Settle old Context transactions with compatible old recovery before removing dependencies. Current mutation format is context-mutation-journal-v3 with v2 parser compatibility; pre-v2 needs matching manual recovery. Never use @latest to recover a pinned old journal.

Software retirement and nonmanaged information review are separate. Current declared symbolic resources and recognized retired build commands must be extracted/replaced with provenance. Ordinary Markdown/direct JSON/YAML remains readable; no general compact/symbolic/structured-ID compiler is retained. Known unresolved dependencies get file/reference diagnostics. See package migrations/README.md for bounded inspection and old-binary limitations.
