# Architecture

The CLI owns project-memory maintenance, not execution of engineering tasks. Retain the existing Context Catalog as the single manifest/discovery/default-set owner, its exact physical-path resolution and Unicode/case/path diagnostics. Keep sparse optional Areas/workspaces; do not create a second router or mandatory workspace mirror.

Context creation and mutation retain safe path traversal, exclusive publication, current-byte/identity comparisons, journals and explicit recovery. Remove Long-Task coupling without dropping mutual exclusion. File transactions are recoverable, not physically atomic across multiple files.

Config, init and sync install only the short startup contract and minimum Context. Explicit upgrade owns schema-5 retirement; ordinary sync cannot silently migrate schema 4. Check raw configuration and unfinished transactions before writes. Restore old transactions with a compatible old tool before deleting recovery dependencies. Preserve exact default body path sets during automatic compatibility migration, including old default_children behavior.

Managed-source ownership remains .codex/ty-context-managed, source-mappings.yaml and generated package assets. Protect user prose, modified files, mixed configuration and unrelated worktrees. Backups stay outside host-discovered Skill/default Context paths. New default installation does not install roles, Hooks, DESIGN.md, Makefile, tools or CI.

Structural validation checks registered paths and explicitly admitted dependencies, not arbitrary prose links or factual truth. Existing code, design resources and user constraints remain readable; extract live decoder-dependent requirements before retiring their parser. Do not retain the old compiler as a compatibility platform.

Use current-candidate ordinary tests, source parity and actual tarball consumers for verification. No performance claim follows from fewer files or shorter instructions. Future additions must fit an existing owner and solve an actual problem rather than rebuild workflow machinery.
