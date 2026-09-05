# Contributing

Tiny Context maintains durable project facts and a short development contract. Read the relevant Context and keep changes within the intended owner. Do not restore retired task workflows, proof engines, design prerequisites or source-line gates.

Use Node.js 24+, npm ci, npm run build and npm test. During development, run affected node --test files after building; uncertain scope uses the full package suite. Distribution changes require package sync-source twice, check-source and actual tarball consumer tests. tests/ty-context/run-package-suite.mjs lists the ordinary package regression; old baseline dependencies are prepared in isolated test fixtures.

Source owners are documented in project_context/areas/harness-package/implementation-index.md. Edit canonical managed assets before synchronizing derived package copies. Preserve user files, path safety, recoverable mutations and migration boundaries. README and migrations/README.md describe the public guarantees and their limits.

Publishing is separate from code changes. npm run release:prepare builds and consumes a local tarball without publishing; the manual npm-publish workflow supports a dry run and preserves its environment/identity permissions. Historical launch automation and reports under docs/launch are not current package acceptance requirements.
