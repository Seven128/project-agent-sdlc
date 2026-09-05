# Code entrypoints

- packages/ty-context/src/commands: CLI parsing and explicit retired-command diagnostics.
- src/lib/context-catalog: manifest/discovery/default-path owner; context-markdown: supported links and declarations.
- src/lib/context-create, context-register, context-move, context-mutation: safe maintenance and recoverable journals.
- src/lib/schema-guard.ts, config.ts, init.ts, sync-engine.ts: installation boundaries.
- src/lib/maintenance-lock.ts and maintenance-write.ts: reused operation exclusion and CAS file publication.
- src/lib/retirement-*.ts: bounded schema-4 to schema-5 migration, separate from daily operation.
- src/lib/context-export.ts and source-pack-*.ts: temporary exports and redaction.
- src/lib/package-source.ts: canonical/package parity; tools/build_package.mjs: clean build.

Paths beginning src/ are relative to packages/ty-context. Follow actual exports and tests rather than preserving a copied function inventory.
